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
FACTS_RPC_URL = f"{SUPABASE_URL}/rest/v1/rpc/bridgepoint_public_discovery_facts_v5200"
PUBLIC_ORIGIN = "https://bridgepointintelligence.online"
OUT = Path("discover")

STATE_NAMES = {
    "AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware","FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming","DC":"District of Columbia",
    "AS":"American Samoa","GU":"Guam","MP":"Northern Mariana Islands","PR":"Puerto Rico","VI":"U.S. Virgin Islands"
}


def fetch_feed(limit: int = 75) -> dict:
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


def fetch_facts() -> dict:
    req = urllib.request.Request(
        FACTS_RPC_URL,
        data=b"{}",
        method="POST",
        headers={"apikey": PUBLISHABLE_KEY, "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "BridgePoint-Discovery-Hubs/5200"},
    )
    with urllib.request.urlopen(req, timeout=25) as response:
        payload = json.loads(response.read().decode())
    if isinstance(payload, list) and len(payload) == 1 and isinstance(payload[0], dict):
        payload = payload[0]
    if not isinstance(payload, dict) or not isinstance(payload.get("metrics"), dict):
        raise RuntimeError("Public discovery facts returned an unexpected payload")
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
<title>{esc(title)} | BridgePoint Intelligence</title><meta name="description" content="{esc(description)}"><meta name="keywords" content="BridgePoint Intelligence, property intelligence, parcel data, parcel boundaries, address normalization, PropTech, InsurTech, geospatial intelligence, claims intelligence, storm intelligence, roof intelligence, 3D property maps, digital twin, property data API, insurance technology, real estate technology"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="canonical" href="{esc(canonical)}"><link rel="stylesheet" href="/founder-access.css"><link rel="stylesheet" href="/language-selector-v5200.css">
<meta property="og:type" content="website"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{esc(canonical)}">
<script type="application/ld+json">{schema}</script>
<style>:root{{--bg:#07111f;--panel:#0d1b2b;--line:#284158;--text:#f4f8fc;--muted:#a8b9c9;--accent:#65c7ff}}*{{box-sizing:border-box}}body{{margin:0;background:linear-gradient(150deg,#06101d,#0b1929);color:var(--text);font:16px/1.6 Arial,sans-serif}}main{{max-width:980px;margin:auto;padding:40px 20px 72px}}a{{color:var(--accent)}}.brand a{{color:#fff;text-decoration:none;font-weight:900}}h1{{font-size:clamp(2rem,6vw,4rem);line-height:1.04;margin:28px 0 12px}}.lead{{max-width:760px;color:var(--muted);font-size:1.08rem}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:28px}}.card{{background:rgba(13,27,43,.96);border:1px solid var(--line);border-radius:16px;padding:20px}}.card h2{{font-size:1.15rem;line-height:1.25}}.eyebrow{{font-size:.75rem;font-weight:800;letter-spacing:.05em;color:#a8d9ff}}.note{{margin-top:30px;padding:16px;border-left:4px solid var(--accent);background:#0a2033;color:#cad8e5}}.cta{{display:inline-block;margin-top:14px;padding:11px 15px;border-radius:9px;background:#168df0;color:#fff;text-decoration:none;font-weight:800}}footer{{margin-top:38px;color:#8197aa;font-size:.85rem}}</style></head><body><main><div class="brand"><a href="/">BridgePoint Intelligence</a></div>{body}<footer>Public discovery surfaces use only BridgePoint content that passed the platform's customer-safety quality gate. They do not expose private customer data, exact visitor locations, raw evidence, property addresses from this feed, or proprietary scoring weights.</footer></main><script src="/acquisition_tracker.js" defer></script><script src="/founder-access.js?v=5101" defer></script><script src="/language-selector-v5200.js" defer></script><script src="/current-map-entry.js?v=5100" defer></script></body></html>'''


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
    body = f'''<h1>BridgePoint public intelligence discovery</h1><p class="lead">A continuously refreshed directory of quality-gated BridgePoint property and claims-intelligence research. Use it to explore current public findings by market and topic, then open the underlying research brief for source limitations and context.</p><p><strong>Markets:</strong> {state_links or "Current evergreen research"}</p><p><strong>Topics:</strong> {topic_links or "General property intelligence"}</p><div class="grid">{''.join(card(s) for s in stories)}</div><div class="note"><strong>Why this exists:</strong> BridgePoint turns verified public-source infrastructure into searchable research surfaces while preserving privacy and uncertainty. Updated {esc(generated)}.</div><a class="cta" href="/?utm_source=discover&utm_medium=owned&utm_campaign=discovery_hub">Open the live BridgePoint map</a> <a class="cta" href="/founder-access/?utm_source=discover&utm_medium=owned&utm_campaign=founder_access">Request founder access</a>'''
    structured = {"@context":"https://schema.org","@type":"CollectionPage","name":"BridgePoint Public Intelligence Discovery","url":f"{PUBLIC_ORIGIN}/discover/","isPartOf":{"@type":"WebSite","name":"BridgePoint Intelligence","url":PUBLIC_ORIGIN},"numberOfItems":len(stories)}
    (OUT / "index.html").write_text(shell("Public Intelligence Discovery", "Quality-gated BridgePoint property and claims-intelligence research organized for public discovery.", f"{PUBLIC_ORIGIN}/discover/", body, structured), encoding="utf-8")
    return [f"{PUBLIC_ORIGIN}/discover/"]


def write_state_pages(stories: list[dict], facts: dict) -> list[str]:
    grouped: dict[str,list[dict]] = defaultdict(list)
    for s in stories:
        code = clean(s.get("state_code"),2).upper()
        if code:
            grouped[code].append(s)
    metrics=facts.get("metrics",{})
    jurisdictions={str(x.get("code","")).upper():x for x in facts.get("jurisdictions",[]) if isinstance(x,dict)}
    codes=sorted(set(STATE_NAMES)|set(grouped)|set(jurisdictions))
    urls=[]
    global_count=int(metrics.get("canonical_property_records") or 0)
    boundaries=int(metrics.get("materialized_boundary_estimate") or 0)
    addresses=int(metrics.get("normalized_address_records") or 0)
    buildings=int(metrics.get("map_ready_buildings") or 0)
    for code in codes:
        items=grouped.get(code,[])
        name=STATE_NAMES.get(code,code)
        row=jurisdictions.get(code,{})
        local_count=row.get("canonical_property_parcel_records")
        d=OUT/"states"/code.lower(); d.mkdir(parents=True,exist_ok=True)
        canonical=f"{PUBLIC_ORIGIN}/discover/states/{code.lower()}/"
        local_text=f"{int(local_count):,} canonical property/parcel identity records in the public jurisdiction counter" if local_count is not None else "public jurisdiction count still reconciling"
        cards=''.join(card(s) for s in items) or '<article class="card"><div class="eyebrow">CURRENT STATUS</div><h2>Public research feed is waiting for a jurisdiction-specific brief.</h2><p>The page remains indexed because BridgePoint tracks this U.S. jurisdiction separately and updates it as public-safe research is published.</p></article>'
        body=f'''<h1>{esc(name)} property, parcel and geospatial intelligence</h1><p class="lead">BridgePoint Intelligence tracks {esc(name)} inside a national property-intelligence system spanning {global_count:,} canonical property/parcel identity records. Current {esc(name)} public counter: <strong>{esc(local_text)}</strong>.</p>
<div class="grid"><article class="card"><div class="eyebrow">NATIONAL BACKEND</div><h2>{global_count:,} canonical property identities</h2><p>{boundaries:,} current materialized parcel-boundary estimate · {addresses:,} normalized/public address records · {buildings:,} map-ready buildings.</p></article>
<article class="card"><div class="eyebrow">SEARCH / USE CASES</div><h2>PropTech · InsurTech · storms · claims · roofs · 3D maps</h2><p>BridgePoint connects parcel/property identity, buildings, roof context, hazards, provenance and workflows for contractors, insurers, adjusters, property operators, investors and data teams.</p></article></div>
<div class="grid">{cards}</div>
<div class="note"><strong>Accuracy:</strong> canonical property/parcel identity records are not the same as finished boundary polygons. Boundary, address, roof and building counts are measured separately. Weather exposure is context, not proof of physical damage or an insurance outcome.</div>
<a class="cta" href="/app/?utm_source=discover&utm_medium=owned&utm_campaign={code.lower()}_research">Open {esc(name)} in BridgePoint Intelligence</a>
<div data-founder-access data-product="INTELLIGENCE" data-state="{esc(code)}"></div>'''
        structured={"@context":"https://schema.org","@type":"CollectionPage","name":f"{name} Property, Parcel and Geospatial Intelligence","url":canonical,
          "about":[{"@type":"AdministrativeArea","name":name},{"@type":"Dataset","name":"BridgePoint canonical property/parcel identity index","variableMeasured":[
            {"@type":"PropertyValue","name":"National canonical property/parcel identity records","value":global_count},
            {"@type":"PropertyValue","name":f"{name} canonical property/parcel identity records","value":local_count if local_count is not None else "reconciling"},
            {"@type":"PropertyValue","name":"Materialized parcel-boundary estimate","value":boundaries},
            {"@type":"PropertyValue","name":"Normalized/public address records","value":addresses},
            {"@type":"PropertyValue","name":"Map-ready buildings","value":buildings}
          ]}],"numberOfItems":len(items)}
        (d/"index.html").write_text(shell(f"{name} Property & Parcel Intelligence", f"BridgePoint Intelligence coverage, parcel/property counts, geospatial research, storms, claims, roofs and 3D property intelligence for {name}.", canonical, body, structured),encoding="utf-8")
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
        body=f'''<h1>{esc(label)} research</h1><p class="lead">BridgePoint research briefs grouped around {esc(label.lower())}. Each linked brief preserves its source and use limitations and is selected only after passing the public customer-safety gate.</p><div class="grid">{''.join(card(s) for s in items)}</div><a class="cta" href="/?utm_source=discover&utm_medium=owned&utm_campaign={key}">Open the live BridgePoint map</a> <a class="cta" href="/founder-access/?utm_source=discover&utm_medium=owned&utm_campaign=founder_access">Request founder access</a>'''
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
    feed=fetch_feed(75)
    facts=fetch_facts()
    stories=[]
    for raw in feed.get("stories",[]):
        if not isinstance(raw,dict): continue
        if len(clean(raw.get("headline"),180))<12 or len(clean(raw.get("story_key"),220))<4 or len(clean(raw.get("body_text"),12000))<180: continue
        stories.append(raw)
    if OUT.exists(): shutil.rmtree(OUT)
    OUT.mkdir(parents=True,exist_ok=True)
    generated=datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")
    conversion_urls=[
        f"{PUBLIC_ORIGIN}/founder-access/",
        f"{PUBLIC_ORIGIN}/for-roofers/",
        f"{PUBLIC_ORIGIN}/for-solar/",
        f"{PUBLIC_ORIGIN}/for-restoration/",
        f"{PUBLIC_ORIGIN}/for-public-adjusters/",
        f"{PUBLIC_ORIGIN}/for-property-managers/",
        f"{PUBLIC_ORIGIN}/sample/",
    ]
    urls=write_index(stories,generated)+write_state_pages(stories,facts)+write_topic_pages(stories)+conversion_urls
    write_sitemap(urls)
    manifest={"version":1111,"generated_at":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"source_rpc":"bridgepoint_public_owned_media_feed_v435","facts_rpc":"bridgepoint_public_discovery_facts_v5200","facts_metrics":facts.get("metrics",{}),"safe_story_count":len(stories),"page_count":len(urls),"privacy":feed.get("privacy"),"publication_rule":feed.get("publication_rule"),"urls":urls}
    (OUT/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps({"complete":True,"safe_story_count":len(stories),"page_count":len(urls)}))

if __name__ == "__main__":
    main()
