#!/usr/bin/env python3
"""Build search-friendly BridgePoint discovery hubs from the existing safe public feed.

This publisher never reaches private tables directly. It consumes only
bridgepoint_public_owned_media_feed_v435, whose database gate already excludes
private data, proprietary logic, unsupported damage/ROI claims, and thin duplicates.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import shutil
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

SUPABASE_URL = "https://xdfsjztwgsbmabshzsjw.supabase.co"
PUBLISHABLE_KEY = "sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25"
RPC_URL = f"{SUPABASE_URL}/rest/v1/rpc/bridgepoint_public_owned_media_feed_v435"
PUBLIC_ORIGIN = "https://bridgepointintelligence.online"
OUT = Path("discover")

STATE_NAMES = {
    "AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware","FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming","DC":"District of Columbia"
}


def fetch_feed(limit: int = 25) -> dict:
    req = urllib.request.Request(
        RPC_URL,
        data=json.dumps({"p_limit": limit}).encode(),
        method="POST",
        headers={"apikey": PUBLISHABLE_KEY, "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "BridgePoint-Discovery-Hubs/1111"},
    )
    with urllib.request.urlopen(req, timeout=25) as response:
        payload = json.loads(response.read().decode())
    if isinstance(payload, list) and len(payload) == 1 and isinstance(payload[0], dict):
        payload = payload[0]
    if not isinstance(payload, dict) or not isinstance(payload.get("stories", []), list):
        raise RuntimeError("Safe public feed returned an unexpected payload")
    return payload


def clean(value: object, limit: int) -> str:
    text = str(value or "").replace("\\r\\n", "\n").replace("\\n", "\n")
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    return re.sub(r"\s+", " ", text).strip()[:limit]


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:72] or "research"


def article_slug(story: dict) -> str:
    headline = clean(story.get("headline"), 180)
    story_key = clean(story.get("story_key"), 220)
    suffix = hashlib.sha1(story_key.encode()).hexdigest()[:8]
    base = slug(headline)
    return f"{base}-{suffix}"


def article_url(story: dict) -> str:
    return f"{PUBLIC_ORIGIN}/articles/auto/{article_slug(story)}.html"


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def shell(title: str, description: str, canonical: str, body: str, structured: dict) -> str:
    schema = json.dumps(structured, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)} | BridgePoint Intelligence</title><meta name="description" content="{esc(description)}"><link rel="canonical" href="{esc(canonical)}">
<meta property="og:type" content="website"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{esc(canonical)}">
<script type="application/ld+json">{schema}</script>
<style>:root{{--bg:#07111f;--panel:#0d1b2b;--line:#284158;--text:#f4f8fc;--muted:#a8b9c9;--accent:#65c7ff}}*{{box-sizing:border-box}}body{{margin:0;background:linear-gradient(150deg,#06101d,#0b1929);color:var(--text);font:16px/1.6 Arial,sans-serif}}main{{max-width:980px;margin:auto;padding:40px 20px 72px}}a{{color:var(--accent)}}.brand a{{color:#fff;text-decoration:none;font-weight:900}}h1{{font-size:clamp(2rem,6vw,4rem);line-height:1.04;margin:28px 0 12px}}.lead{{max-width:760px;color:var(--muted);font-size:1.08rem}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:28px}}.card{{background:rgba(13,27,43,.96);border:1px solid var(--line);border-radius:16px;padding:20px}}.card h2{{font-size:1.15rem;line-height:1.25}}.eyebrow{{font-size:.75rem;font-weight:800;letter-spacing:.05em;color:#a8d9ff}}.note{{margin-top:30px;padding:16px;border-left:4px solid var(--accent);background:#0a2033;color:#cad8e5}}.cta{{display:inline-block;margin-top:14px;padding:11px 15px;border-radius:9px;background:#168df0;color:#fff;text-decoration:none;font-weight:800}}footer{{margin-top:38px;color:#8197aa;font-size:.85rem}}</style></head><body><main><div class="brand"><a href="/">BridgePoint Intelligence</a></div>{body}<footer>Public discovery surfaces use only BridgePoint content that passed the platform's customer-safety quality gate. They do not expose private customer data, exact visitor locations, raw evidence, property addresses from this feed, or proprietary scoring weights.</footer></main><script src="/acquisition_tracker.js" defer></script></body></html>'''


def card(story: dict) -> str:
    state = clean(story.get("state_code"), 2).upper()
    topic = clean(story.get("story_type"), 60).replace("_", " ").title() or "Research"
    headline = clean(story.get("headline"), 180)
    dek = clean(story.get("dek"), 360)
    scope = " · ".join(x for x in [STATE_NAMES.get(state, state), topic] if x)
    return f'''<article class="card"><div class="eyebrow">{esc(scope)}</div><h2><a href="{esc(article_url(story))}">{esc(headline)}</a></h2><p>{esc(dek)}</p></article>'''


def write_index(stories: list[dict], generated: str) -> list[str]:
    states = sorted({clean(s.get("state_code"),2).upper() for s in stories if clean(s.get("state_code"),2)})
    topics = sorted({slug(clean(s.get("story_type"),60)) for s in stories if clean(s.get("story_type"),60)})
    state_links = " ".join(f'<a href="states/{s.lower()}/">{esc(STATE_NAMES.get(s,s))}</a>' for s in states)
    topic_links = " ".join(f'<a href="topics/{t}/">{esc(t.replace("-"," ").title())}</a>' for t in topics)
    body = f'''<h1>BridgePoint public intelligence discovery</h1><p class="lead">A continuously refreshed directory of quality-gated BridgePoint property and claims-intelligence research. Use it to explore current public findings by market and topic, then open the underlying research brief for source limitations and context.</p><p><strong>Markets:</strong> {state_links or "Current evergreen research"}</p><p><strong>Topics:</strong> {topic_links or "General property intelligence"}</p><div class="grid">{''.join(card(s) for s in stories)}</div><div class="note"><strong>Why this exists:</strong> BridgePoint turns verified public-source infrastructure into searchable research surfaces while preserving privacy and uncertainty. Updated {esc(generated)}.</div><a class="cta" href="/sample/?utm_source=discover&utm_medium=owned&utm_campaign=discovery_hub">Explore a BridgePoint sample</a>'''
    structured = {"@context":"https://schema.org","@type":"CollectionPage","name":"BridgePoint Public Intelligence Discovery","url":f"{PUBLIC_ORIGIN}/discover/","isPartOf":{"@type":"WebSite","name":"BridgePoint Intelligence","url":PUBLIC_ORIGIN},"numberOfItems":len(stories)}
    (OUT / "index.html").write_text(shell("Public Intelligence Discovery", "Quality-gated BridgePoint property and claims-intelligence research organized for public discovery.", f"{PUBLIC_ORIGIN}/discover/", body, structured), encoding="utf-8")
    return [f"{PUBLIC_ORIGIN}/discover/"]


def write_state_pages(stories: list[dict]) -> list[str]:
    grouped: dict[str,list[dict]] = defaultdict(list)
    for s in stories:
        code = clean(s.get("state_code"),2).upper()
        if code:
            grouped[code].append(s)
    urls=[]
    for code, items in grouped.items():
        name=STATE_NAMES.get(code,code)
        d=OUT/"states"/code.lower(); d.mkdir(parents=True,exist_ok=True)
        canonical=f"{PUBLIC_ORIGIN}/discover/states/{code.lower()}/"
        body=f'''<h1>{esc(name)} property intelligence research</h1><p class="lead">Current BridgePoint public research associated with {esc(name)}. These are research and market-readiness signals—not proof of property damage, insurance coverage, customer intent, or a guaranteed outcome.</p><div class="grid">{''.join(card(s) for s in items)}</div><div class="note">BridgePoint publishes a market here only when the safe public feed makes it eligible through observed demand or prior publication. New evidence can change the picture over time.</div><a class="cta" href="/sample/?state={code}&utm_source=discover&utm_medium=owned&utm_campaign={code.lower()}_research">Explore {esc(name)} intelligence</a>'''
        structured={"@context":"https://schema.org","@type":"CollectionPage","name":f"{name} Property Intelligence Research","url":canonical,"about":{"@type":"AdministrativeArea","name":name},"numberOfItems":len(items)}
        (d/"index.html").write_text(shell(f"{name} Property Intelligence Research", f"Quality-gated BridgePoint public property and claims-intelligence research for {name}.", canonical, body, structured),encoding="utf-8")
        urls.append(canonical)
    return urls


def write_topic_pages(stories: list[dict]) -> list[str]:
    grouped: dict[str,list[dict]] = defaultdict(list)
    labels={}
    for s in stories:
        raw=clean(s.get("story_type"),60)
        if not raw: continue
        key=slug(raw); grouped[key].append(s); labels[key]=raw.replace("_"," ").title()
    urls=[]
    for key,items in grouped.items():
        label=labels[key]; d=OUT/"topics"/key; d.mkdir(parents=True,exist_ok=True)
        canonical=f"{PUBLIC_ORIGIN}/discover/topics/{key}/"
        body=f'''<h1>{esc(label)} research</h1><p class="lead">BridgePoint research briefs grouped around {esc(label.lower())}. Each linked brief preserves its source and use limitations and is selected only after passing the public customer-safety gate.</p><div class="grid">{''.join(card(s) for s in items)}</div><a class="cta" href="/free-tools/?utm_source=discover&utm_medium=owned&utm_campaign={key}">Try BridgePoint free tools</a>'''
        structured={"@context":"https://schema.org","@type":"CollectionPage","name":f"BridgePoint {label} Research","url":canonical,"numberOfItems":len(items)}
        (d/"index.html").write_text(shell(f"{label} Research", f"Quality-gated BridgePoint public research on {label.lower()}.", canonical, body, structured),encoding="utf-8")
        urls.append(canonical)
    return urls


def write_sitemap(urls: list[str]) -> None:
    lines=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        lines.append(f'  <url><loc>{xml_escape(u)}</loc><changefreq>hourly</changefreq><priority>0.8</priority></url>')
    lines += ['</urlset>','']
    (OUT/"sitemap.xml").write_text("\n".join(lines),encoding="utf-8")


def main() -> None:
    feed=fetch_feed(25)
    stories=[]
    for raw in feed.get("stories",[]):
        if not isinstance(raw,dict): continue
        if len(clean(raw.get("headline"),180))<12 or len(clean(raw.get("story_key"),220))<4 or len(clean(raw.get("body_text"),12000))<180: continue
        stories.append(raw)
    if OUT.exists(): shutil.rmtree(OUT)
    OUT.mkdir(parents=True,exist_ok=True)
    generated=datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")
    urls=write_index(stories,generated)+write_state_pages(stories)+write_topic_pages(stories)
    write_sitemap(urls)
    manifest={"version":1111,"generated_at":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"source_rpc":"bridgepoint_public_owned_media_feed_v435","safe_story_count":len(stories),"page_count":len(urls),"privacy":feed.get("privacy"),"publication_rule":feed.get("publication_rule"),"urls":urls}
    (OUT/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps({"complete":True,"safe_story_count":len(stories),"page_count":len(urls)}))

if __name__ == "__main__":
    main()
