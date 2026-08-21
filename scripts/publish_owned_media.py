#!/usr/bin/env python3
"""Publish BridgePoint's already-approved owned-media stories as static public pages.

The source RPC exposes only customer-safe, quality-gate-passed content. This script
adds no private data and never invents performance, damage, claim, or customer facts.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import shutil
import urllib.request
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

SUPABASE_URL = "https://xdfsjztwgsbmabshzsjw.supabase.co"
PUBLISHABLE_KEY = "sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25"
RPC_URL = f"{SUPABASE_URL}/rest/v1/rpc/bridgepoint_public_owned_media_feed_v435"
PUBLIC_ORIGIN = "https://bridgepointintelligence.online"
OUT = Path("articles/auto")


def fetch_feed(limit: int = 12) -> dict:
    request = urllib.request.Request(
        RPC_URL,
        data=json.dumps({"p_limit": limit}).encode("utf-8"),
        method="POST",
        headers={
            "apikey": PUBLISHABLE_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "BridgePoint-Owned-Media-Publisher/435",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if isinstance(payload, list) and len(payload) == 1 and isinstance(payload[0], dict):
        payload = payload[0]
    if not isinstance(payload, dict):
        raise RuntimeError("Owned-media RPC returned an unexpected payload")
    return payload


def clean_text(value: object, max_len: int) -> str:
    text = str(value or "").replace("\\r\\n", "\n").replace("\\n", "\n")
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text).strip()
    return text[:max_len]


def slugify(headline: str, story_key: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", headline.lower()).strip("-")[:72]
    suffix = hashlib.sha1(story_key.encode("utf-8")).hexdigest()[:8]
    return f"{base}-{suffix}" if base else f"bridgepoint-brief-{suffix}"


def parse_time(value: object) -> datetime:
    raw = str(value or "").strip()
    if raw:
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc)
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def paragraphs(body: str) -> list[str]:
    chunks = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"\n\s*\n", body)]
    return [p for p in chunks if p]


def story_page(story: dict, slug: str) -> str:
    headline = clean_text(story.get("headline"), 180)
    dek = clean_text(story.get("dek"), 360)
    body = clean_text(story.get("body_text"), 12000)
    cta = clean_text(story.get("cta_text"), 300) or "Request a territory-specific BridgePoint sample."
    state = clean_text(story.get("state_code"), 2).upper()
    truth = clean_text(story.get("coverage_truth"), 80).upper()
    published = parse_time(story.get("published_at") or story.get("generated_at"))
    canonical = f"{PUBLIC_ORIGIN}/articles/auto/{slug}.html"
    campaign = re.sub(r"[^a-z0-9_]+", "_", slug.lower())[:80]
    sample_url = f"/sample/?utm_source=research&utm_medium=auto_owned&utm_campaign={campaign}"
    scope = f"{state} · {truth}" if state else truth or "BRIDGEPOINT RESEARCH"
    limitation = (
        "BUILDING describes BridgePoint platform coverage/readiness only. It is not evidence that a property was damaged, a claim exists, or an opportunity is verified."
        if truth == "BUILDING"
        else "BridgePoint public research is decision-support. It does not prove property damage, claim coverage, customer intent, a permit, or a guaranteed outcome."
    )
    article_body = "\n".join(f"<p>{html.escape(p)}</p>" for p in paragraphs(body))
    structured = json.dumps({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": headline,
        "description": dek,
        "datePublished": published.isoformat().replace("+00:00", "Z"),
        "dateModified": published.isoformat().replace("+00:00", "Z"),
        "mainEntityOfPage": canonical,
        "publisher": {"@type": "Organization", "name": "BridgePoint Intelligence", "url": PUBLIC_ORIGIN},
    }, separators=(",", ":"))
    return f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(headline)} | BridgePoint Intelligence</title>
<meta name="description" content="{html.escape(dek)}">
<link rel="canonical" href="{canonical}">
<link rel="alternate" type="application/rss+xml" title="BridgePoint Automatic Research Briefs" href="{PUBLIC_ORIGIN}/articles/auto/feed.xml">
<meta property="og:type" content="article"><meta property="og:title" content="{html.escape(headline)}"><meta property="og:description" content="{html.escape(dek)}"><meta property="og:url" content="{canonical}">
<script type="application/ld+json">{structured}</script>
<style>:root{{--bg:#07111f;--panel:#0e1b2c;--line:#27415c;--text:#f4f8fc;--muted:#a7b8c9;--cyan:#65c7ff;--green:#69dfa2}}*{{box-sizing:border-box}}body{{margin:0;background:linear-gradient(150deg,#06101d,#0b1929);color:var(--text);font-family:Arial,sans-serif;line-height:1.65}}main{{max-width:820px;margin:auto;padding:42px 20px 72px}}a{{color:var(--cyan)}}.brand{{font-weight:900;letter-spacing:.03em}}.eyebrow{{display:inline-block;margin-top:36px;padding:5px 9px;border:1px solid #315776;border-radius:999px;color:#a8d9ff;font-size:.75rem;font-weight:800}}h1{{font-size:clamp(2.1rem,6vw,4rem);line-height:1.03;letter-spacing:-.035em;margin:16px 0 12px}}.dek{{color:var(--muted);font-size:1.08rem}}.meta{{color:#8298ae;font-size:.82rem;margin:14px 0 30px}}article{{background:rgba(14,27,44,.96);border:1px solid var(--line);border-radius:18px;padding:26px}}article p{{color:#d8e4ef}}.limit{{margin-top:25px;border-left:4px solid var(--cyan);background:#0a2033;padding:14px 16px;color:#c9d8e6}}.cta{{margin-top:22px;padding:22px;border:1px solid #2a5a7e;background:#0c2339;border-radius:15px}}.btn{{display:inline-block;margin-top:8px;background:#168df0;color:white;padding:12px 16px;border-radius:9px;text-decoration:none;font-weight:800}}footer{{margin-top:30px;color:#8298ae;font-size:.85rem}}</style>
</head><body><main>
<div class="brand"><a href="/" style="text-decoration:none;color:white">BridgePoint Intelligence</a></div>
<span class="eyebrow">{html.escape(scope)}</span>
<h1>{html.escape(headline)}</h1><div class="dek">{html.escape(dek)}</div>
<div class="meta">Published {published.strftime('%B %d, %Y')} · Automatic public research distribution · Source content passed BridgePoint's customer-safety quality gate.</div>
<article>{article_body}<div class="limit"><strong>Use limitation:</strong> {html.escape(limitation)}</div></article>
<div class="cta"><strong>See the territory, not just the headline.</strong><p>{html.escape(cta)}</p><a class="btn" href="{sample_url}">Request a territory</a></div>
<footer><a href="/articles/auto/">Automatic briefs</a> · <a href="/articles/">Research</a> · <a href="/articles/auto/feed.xml">RSS</a><br>BridgePoint preserves source limits and does not publish private customer data, exact visitor locations, property addresses from this feed, or proprietary scoring weights.</footer>
</main><script src="/acquisition_tracker.js" defer></script></body></html>'''


def build_index(items: list[dict], generated_at: str) -> str:
    cards = []
    for item in items:
        story = item["story"]
        scope = " · ".join(x for x in [clean_text(story.get("state_code"), 2).upper(), clean_text(story.get("coverage_truth"), 80).upper()] if x)
        cards.append(f'''<article class="card"><span>{html.escape(scope or "RESEARCH")}</span><h2><a href="{item['slug']}.html">{html.escape(clean_text(story.get('headline'),180))}</a></h2><p>{html.escape(clean_text(story.get('dek'),360))}</p></article>''')
    body = "\n".join(cards) or '<div class="empty">No automatic brief currently clears the public quality gate.</div>'
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Automatic BridgePoint Research Briefs</title><meta name="description" content="Automatically published, quality-gated BridgePoint Intelligence research and market-readiness briefs."><link rel="canonical" href="{PUBLIC_ORIGIN}/articles/auto/"><link rel="alternate" type="application/rss+xml" title="BridgePoint Automatic Research Briefs" href="feed.xml"><style>body{{max-width:900px;margin:40px auto;padding:0 20px;font:16px/1.55 Arial,sans-serif;color:#17202a}}a{{color:#0b57d0}}.sub{{color:#5f6368}}.card{{border:1px solid #d9dee5;border-radius:13px;padding:20px;margin:16px 0}}.card span{{font-size:.75rem;font-weight:800;color:#315b78}}.card h2{{margin:7px 0}}.empty{{padding:30px;background:#f5f7fa;border-radius:12px}}</style></head><body><p><strong><a href="/">BridgePoint Intelligence</a></strong></p><h1>Automatic research briefs</h1><p class="sub">BridgePoint publishes only stories that have already cleared its customer-safety quality gate. State-readiness briefs are included only after observed territory/visitor demand or prior publication. Updated {html.escape(generated_at)}.</p>{body}<p><a href="/articles/">All research</a> · <a href="feed.xml">RSS</a> · <a href="/sample/">Request a territory</a></p><script src="/acquisition_tracker.js" defer></script></body></html>'''


def build_rss(items: list[dict], generated: datetime) -> str:
    parts = ['<?xml version="1.0" encoding="UTF-8"?>', '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>', '<title>BridgePoint Automatic Research Briefs</title>', f'<link>{PUBLIC_ORIGIN}/articles/auto/</link>', f'<atom:link rel="self" type="application/rss+xml" href="{PUBLIC_ORIGIN}/articles/auto/feed.xml" />', '<atom:link rel="hub" href="https://pubsubhubbub.appspot.com/" />', '<description>Quality-gated BridgePoint Intelligence research and market-readiness briefs.</description>', '<language>en-us</language>', f'<lastBuildDate>{format_datetime(generated)}</lastBuildDate>']
    for item in items:
        s = item["story"]
        url = f"{PUBLIC_ORIGIN}/articles/auto/{item['slug']}.html"
        pub = parse_time(s.get("published_at") or s.get("generated_at"))
        parts.extend(['<item>', f'<title>{xml_escape(clean_text(s.get("headline"),180))}</title>', f'<link>{xml_escape(url)}</link>', f'<guid isPermaLink="true">{xml_escape(url)}</guid>', f'<pubDate>{format_datetime(pub)}</pubDate>', f'<description>{xml_escape(clean_text(s.get("dek"),360))}</description>', '</item>'])
    parts.extend(['</channel></rss>', ''])
    return "\n".join(parts)


def build_sitemap(items: list[dict]) -> str:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', f'  <url><loc>{PUBLIC_ORIGIN}/articles/auto/</loc><changefreq>hourly</changefreq><priority>0.8</priority></url>']
    for item in items:
        lines.append(f'  <url><loc>{PUBLIC_ORIGIN}/articles/auto/{item["slug"]}.html</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>')
    lines.extend(['</urlset>', ''])
    return "\n".join(lines)


def main() -> None:
    feed = fetch_feed(12)
    stories = feed.get("stories") or []
    if not isinstance(stories, list):
        raise RuntimeError("stories is not a list")

    # Rebuild the automatic-publication directory from the current safe selection.
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True, exist_ok=True)

    generated_dt = parse_time(feed.get("generated_at"))
    rendered: list[dict] = []
    for raw in stories:
        if not isinstance(raw, dict):
            continue
        headline = clean_text(raw.get("headline"), 180)
        story_key = clean_text(raw.get("story_key"), 220)
        body = clean_text(raw.get("body_text"), 12000)
        if len(headline) < 12 or len(story_key) < 4 or len(body) < 180:
            continue
        slug = slugify(headline, story_key)
        (OUT / f"{slug}.html").write_text(story_page(raw, slug), encoding="utf-8")
        rendered.append({"slug": slug, "story": raw})

    generated_label = generated_dt.strftime("%B %d, %Y at %H:%M UTC")
    (OUT / "index.html").write_text(build_index(rendered, generated_label), encoding="utf-8")
    (OUT / "feed.xml").write_text(build_rss(rendered, generated_dt), encoding="utf-8")
    (OUT / "sitemap.xml").write_text(build_sitemap(rendered), encoding="utf-8")
    manifest = {
        "version": 435,
        "generated_at": generated_dt.isoformat().replace("+00:00", "Z"),
        "source_rpc": "bridgepoint_public_owned_media_feed_v435",
        "story_count": len(rendered),
        "privacy": feed.get("privacy"),
        "publication_rule": feed.get("publication_rule"),
        "urls": [f"{PUBLIC_ORIGIN}/articles/auto/{item['slug']}.html" for item in rendered],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"complete": True, "story_count": len(rendered), "generated_at": manifest["generated_at"]}))


if __name__ == "__main__":
    main()
