#!/usr/bin/env python3
"""Build high-intent BridgePoint search hubs from the existing safe public feed.

This is an owned-web discovery layer only. It does not post to social networks,
send email, access private/customer tables, or publish property addresses. Every
story comes from bridgepoint_public_owned_media_feed_v435, which applies the
public privacy, quality, unsupported-claim, proprietary-logic and duplicate gates.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import urllib.request
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

SUPABASE_URL = "https://xdfsjztwgsbmabshzsjw.supabase.co"
PUBLISHABLE_KEY = "sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25"
RPC_URL = f"{SUPABASE_URL}/rest/v1/rpc/bridgepoint_public_owned_media_feed_v435"
ORIGIN = "https://bridgepointintelligence.online"
OUT = Path("discover")

INTENTS = {
    "roofing-property-intelligence": {
        "title": "Roofing Property Intelligence",
        "description": "BridgePoint public research for roofing teams evaluating property, weather, permit and evidence context before field work.",
        "keywords": [r"\broof(?:ing)?\b", r"\bshingle(?:s)?\b"],
    },
    "restoration-mitigation-intelligence": {
        "title": "Restoration & Mitigation Intelligence",
        "description": "BridgePoint public research for restoration and mitigation workflows connecting property context, evidence and claims intelligence.",
        "keywords": [r"\brestoration\b", r"\bmitigation\b", r"\bwater damage\b", r"\bfire damage\b"],
    },
    "claims-evidence-intelligence": {
        "title": "Claims Evidence Intelligence",
        "description": "BridgePoint public research on claim timelines, evidence provenance, estimating context and public-adjuster workflows.",
        "keywords": [r"\bclaim(?:s)?\b", r"\badjuster(?:s)?\b", r"\bevidence\b", r"\bxactimate\b", r"\bestimat(?:e|ing|es)\b"],
    },
    "storm-weather-property-intelligence": {
        "title": "Storm & Weather Property Intelligence",
        "description": "BridgePoint public research connecting storm and weather exposure to property context without treating exposure as proof of damage.",
        "keywords": [r"\bweather\b", r"\bstorm(?:s)?\b", r"\bhail\b", r"\bwind\b", r"\bflood(?:ing)?\b", r"\bhurricane(?:s)?\b", r"\btornado(?:es)?\b"],
    },
    "property-matching-intelligence": {
        "title": "Property Matching Intelligence",
        "description": "BridgePoint public research on parcel identity, address normalization, geospatial matching and property-record reconciliation.",
        "keywords": [r"\bmatching\b", r"\bparcel(?:s)?\b", r"\bproperty identity\b", r"\baddress(?:es)?\b"],
    },
    "real-estate-operator-intelligence": {
        "title": "Real Estate Operator Intelligence",
        "description": "BridgePoint public research for investors, portfolio operators and acquisition teams prioritizing property diligence.",
        "keywords": [r"\breal estate\b", r"\binvestor(?:s)?\b", r"\bportfolio(?:s)?\b", r"\bacquisition(?:s)?\b", r"\boperator(?:s)?\b"],
    },
    "property-data-infrastructure": {
        "title": "Property Data Infrastructure",
        "description": "BridgePoint public research on nationwide property-data infrastructure, public sources, provenance and scalable intelligence systems.",
        "keywords": [r"\bnationwide\b", r"\bpublic data\b", r"\binfrastructure\b", r"\bsource(?:s)?\b", r"\bdataset(?:s)?\b"],
    },
}


def fetch_feed() -> dict:
    req = urllib.request.Request(
        RPC_URL,
        data=json.dumps({"p_limit": 75}).encode("utf-8"),
        method="POST",
        headers={
            "apikey": PUBLISHABLE_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "BridgePoint-Intent-Hubs/1113",
        },
    )
    with urllib.request.urlopen(req, timeout=25) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if isinstance(payload, list) and len(payload) == 1 and isinstance(payload[0], dict):
        payload = payload[0]
    if not isinstance(payload, dict) or not isinstance(payload.get("stories", []), list):
        raise RuntimeError("Safe public feed returned an unexpected payload")
    return payload


def clean(value: object, limit: int) -> str:
    text = str(value or "").replace("\\r\\n", " ").replace("\\n", " ")
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    return re.sub(r"\s+", " ", text).strip()[:limit]


def article_slug(story: dict) -> str:
    headline = clean(story.get("headline"), 180)
    story_key = clean(story.get("story_key"), 220)
    base = re.sub(r"[^a-z0-9]+", "-", headline.lower()).strip("-")[:72] or "research"
    suffix = hashlib.sha1(story_key.encode("utf-8")).hexdigest()[:8]
    return f"{base}-{suffix}"


def article_url(story: dict) -> str:
    return f"{ORIGIN}/articles/auto/{article_slug(story)}.html"


def matches(story: dict, patterns: list[str]) -> bool:
    hay = " ".join(
        [
            clean(story.get("headline"), 180),
            clean(story.get("dek"), 600),
            clean(story.get("body_text"), 12000),
        ]
    ).lower()
    return any(re.search(p, hay, flags=re.I) for p in patterns)


def card(story: dict) -> str:
    headline = html.escape(clean(story.get("headline"), 180))
    dek = html.escape(clean(story.get("dek"), 380))
    state = html.escape(clean(story.get("state_code"), 2).upper())
    eyebrow = f"{state} · PUBLIC RESEARCH" if state else "PUBLIC RESEARCH"
    return f'''<article class="card"><div class="eyebrow">{eyebrow}</div><h2><a href="{html.escape(article_url(story), quote=True)}">{headline}</a></h2><p>{dek}</p></article>'''


def page(slug: str, spec: dict, stories: list[dict]) -> str:
    canonical = f"{ORIGIN}/discover/use-cases/{slug}/"
    title = spec["title"]
    description = spec["description"]
    schema = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": title,
            "description": description,
            "url": canonical,
            "isPartOf": {"@type": "WebSite", "name": "BridgePoint Intelligence", "url": ORIGIN},
            "numberOfItems": len(stories),
        },
        separators=(",", ":"),
    ).replace("</", "<\\/")
    cards = "".join(card(s) for s in stories[:18])
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)} | BridgePoint Intelligence</title><meta name="description" content="{html.escape(description, quote=True)}"><link rel="canonical" href="{canonical}">
<script type="application/ld+json">{schema}</script>
<style>:root{{--bg:#07111f;--panel:#0d1b2b;--line:#284158;--text:#f4f8fc;--muted:#a8b9c9;--accent:#65c7ff}}*{{box-sizing:border-box}}body{{margin:0;background:linear-gradient(150deg,#06101d,#0b1929);color:var(--text);font:16px/1.6 Arial,sans-serif}}main{{max-width:980px;margin:auto;padding:40px 20px 72px}}a{{color:var(--accent)}}.brand a{{color:#fff;text-decoration:none;font-weight:900}}h1{{font-size:clamp(2rem,6vw,4rem);line-height:1.04;margin:28px 0 12px}}.lead{{max-width:800px;color:var(--muted);font-size:1.08rem}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:16px;margin-top:28px}}.card{{background:rgba(13,27,43,.96);border:1px solid var(--line);border-radius:16px;padding:20px}}.card h2{{font-size:1.15rem;line-height:1.25}}.eyebrow{{font-size:.75rem;font-weight:800;letter-spacing:.05em;color:#a8d9ff}}.note{{margin-top:30px;padding:16px;border-left:4px solid var(--accent);background:#0a2033;color:#cad8e5}}.cta{{display:inline-block;margin-top:16px;padding:11px 15px;border-radius:9px;background:#168df0;color:#fff;text-decoration:none;font-weight:800}}footer{{margin-top:38px;color:#8197aa;font-size:.85rem}}</style></head><body><main><div class="brand"><a href="/">BridgePoint Intelligence</a></div>
<h1>{html.escape(title)}</h1><p class="lead">{html.escape(description)} This page is assembled only from BridgePoint research that passed the public customer-safety quality gate.</p>
<div class="grid">{cards}</div>
<div class="note"><strong>Evidence rule:</strong> Public research and opportunity signals prioritize investigation. Weather exposure or a BridgePoint signal does not by itself prove property damage, insurance coverage, customer intent, a claim outcome or a guaranteed sale.</div>
<a class="cta" href="/free-tools/?utm_source=discover&utm_medium=owned&utm_campaign={slug}">Try BridgePoint free tools</a>
<footer><a href="/discover/">Nationwide discovery</a> · <a href="/articles/auto/">Automatic research</a> · <a href="/capabilities/">Capabilities</a><br>No social or email distribution is performed by this publisher.</footer></main><script src="/acquisition_tracker.js" defer></script></body></html>'''


def update_index(hubs: list[tuple[str, dict, int]]) -> None:
    p = OUT / "index.html"
    text = p.read_text(encoding="utf-8")
    links = " ".join(
        f'<a href="use-cases/{slug}/">{html.escape(spec["title"])}</a>' for slug, spec, _ in hubs
    )
    insert = f'<p><strong>Use cases:</strong> {links}</p>'
    if "<strong>Use cases:</strong>" not in text:
        text = text.replace('<div class="grid">', insert + '<div class="grid">', 1)
    p.write_text(text, encoding="utf-8")


def update_sitemap(urls: list[str]) -> None:
    p = OUT / "sitemap.xml"
    text = p.read_text(encoding="utf-8")
    additions = "\n".join(
        f'  <url><loc>{xml_escape(u)}</loc><changefreq>daily</changefreq><priority>0.85</priority></url>'
        for u in urls
        if xml_escape(u) not in text
    )
    if additions:
        text = text.replace("</urlset>", additions + "\n</urlset>")
    p.write_text(text, encoding="utf-8")


def update_manifest(urls: list[str], hubs: list[tuple[str, dict, int]]) -> None:
    p = OUT / "manifest.json"
    m = json.loads(p.read_text(encoding="utf-8"))
    existing = list(m.get("urls", []))
    for u in urls:
        if u not in existing:
            existing.append(u)
    m["urls"] = existing
    m["page_count"] = len(existing)
    m["intent_hub_count"] = len(hubs)
    m["intent_hubs"] = [
        {"slug": slug, "title": spec["title"], "story_count": count, "url": f"{ORIGIN}/discover/use-cases/{slug}/"}
        for slug, spec, count in hubs
    ]
    p.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    if not (OUT / "manifest.json").exists():
        raise SystemExit("Run publish_discovery_hubs.py first")
    feed = fetch_feed()
    stories = [s for s in feed.get("stories", []) if isinstance(s, dict)]
    hubs: list[tuple[str, dict, int]] = []
    urls: list[str] = []
    for slug, spec in INTENTS.items():
        selected = [s for s in stories if matches(s, spec["keywords"])]
        # Avoid scaled thin pages: a use-case hub must have at least two safe briefs.
        if len(selected) < 2:
            continue
        d = OUT / "use-cases" / slug
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(page(slug, spec, selected), encoding="utf-8")
        urls.append(f"{ORIGIN}/discover/use-cases/{slug}/")
        hubs.append((slug, spec, len(selected)))
    update_index(hubs)
    update_sitemap(urls)
    update_manifest(urls, hubs)
    print(json.dumps({"complete": True, "intent_hub_count": len(hubs), "urls": urls}))


if __name__ == "__main__":
    main()
