#!/usr/bin/env python3
"""Generate BridgePoint Connecticut municipality acquisition pages into a site root.

This used to live inside a standalone GitHub Pages publisher. Keeping it as a normal
versioned generator lets the guarded V683 publisher remain the only Pages owner.
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

MARKETS = {
    "Waterbury": 29305, "Hartford": 28515, "Bridgeport": 28061,
    "New Haven": 27251, "Stamford": 25722, "West Hartford": 22609,
    "Norwalk": 22132, "Bristol": 21975, "Fairfield": 19620,
    "Milford": 19408, "Greenwich": 19364, "Danbury": 19088,
    "Manchester": 18820, "Southington": 18482, "Berlin": 18036,
    "Stratford": 17876, "West Haven": 16942, "Wallingford": 16758,
    "Hamden": 16749, "Meriden": 16506, "Middletown": 15801,
    "New Britain": 15737, "Glastonbury": 15315, "Torrington": 14723,
    "Enfield": 14324, "East Hartford": 14284, "Norwich": 14132,
    "New Milford": 13713, "Branford": 13541, "Shelton": 13297,
    "Groton": 13062, "Newington": 12532, "Windsor": 12192,
    "Trumbull": 12151, "Naugatuck": 11540, "South Windsor": 11331,
    "East Haven": 11313, "Newtown": 11228, "Farmington": 11218,
    "Cheshire": 10950,
}

STYLE = """<style>body{margin:0;background:#071018;color:#eef8ff;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}.wrap{max-width:980px;margin:auto;padding:34px 20px 64px}.eyebrow{color:#5de4ff;font-weight:800;letter-spacing:.14em;font-size:12px}.hero{padding:44px 0 28px}.hero h1{font-size:clamp(36px,7vw,68px);line-height:.98;margin:10px 0 18px;max-width:900px}.sub{color:#a9becb;font-size:18px;line-height:1.6;max-width:780px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:26px 0}.card{background:#0c1822;border:1px solid #193242;border-radius:16px;padding:20px}.metric{font-size:32px;font-weight:900}.muted{color:#9fb3c0;line-height:1.55}.actions{display:flex;flex-wrap:wrap;gap:10px;margin:24px 0}.btn{display:inline-block;padding:13px 18px;border-radius:10px;background:#41d9f5;color:#031015;text-decoration:none;font-weight:850}.btn.secondary{background:#122634;color:#eafaff;border:1px solid #285068}.links a{color:#73e7fa;text-decoration:none}.fine{font-size:12px;color:#78909c;margin-top:26px}</style>"""
HEADER = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="icon" href="/favicon.ico">'
ORIGIN = "https://bridgepointintelligence.online"


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def write_market_page(site: Path, town: str, count: int) -> None:
    town_slug = slug(town)
    path = site / "connecticut" / town_slug / "index.html"
    path.parent.mkdir(parents=True, exist_ok=True)
    title = f"{town} CT Property Intelligence | BridgePoint Intelligence"
    desc = (
        f"Explore BridgePoint property intelligence for {town}, Connecticut. "
        f"BridgePoint currently normalizes {count:,} canonical property records for this municipality, "
        "with evidence-driven workflows for property professionals."
    )
    canonical = f"{ORIGIN}/connecticut/{town_slug}/"
    schema = json.dumps({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": title,
        "url": canonical,
        "description": desc,
        "isPartOf": {"@type": "WebSite", "name": "BridgePoint Intelligence", "url": f"{ORIGIN}/"},
        "about": {"@type": "Place", "name": f"{town}, Connecticut"},
    })
    body = f'''<!doctype html><html lang="en"><head>{HEADER}<title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc)}"><link rel="canonical" href="{canonical}">{STYLE}<script type="application/ld+json">{schema}</script></head><body><main class="wrap"><section class="hero"><div class="eyebrow">CONNECTICUT PROPERTY INTELLIGENCE</div><h1>{html.escape(town)} property intelligence before the visit.</h1><p class="sub">BridgePoint turns fragmented property and event evidence into one field-ready workflow: property context, changing signals, timelines, maps and explainable opportunity prioritization.</p><div class="actions"><a class="btn" href="/app/?mode=create&utm_source=organic_local&utm_medium=ct_market&utm_campaign={town_slug}">Start the 7-day trial</a><a class="btn secondary" href="/sample/?utm_source=organic_local&utm_medium=ct_market&utm_campaign={town_slug}">See a territory sample</a></div></section><section class="grid"><div class="card"><div class="metric">{count:,}</div><div class="muted">canonical BridgePoint property records currently normalized for {html.escape(town)}.</div></div><div class="card"><strong>What BridgePoint connects</strong><p class="muted">Property records, weather and event context, permits/public-record evidence, timelines and verified opportunity signals when supporting data is available.</p></div><div class="card"><strong>Built for action</strong><p class="muted">Use the app to answer “why this property?” and “why now?” without treating a score as proof of physical damage, claim coverage or a guaranteed outcome.</p></div></section><section class="card links"><h2>Choose the workflow closest to your work</h2><p><a href="/for-roofers/?utm_source=organic_local&utm_medium=ct_market&utm_campaign={town_slug}">Roofing & exterior contractors</a> · <a href="/for-restoration/?utm_source=organic_local&utm_medium=ct_market&utm_campaign={town_slug}">Restoration & mitigation</a> · <a href="/for-public-adjusters/?utm_source=organic_local&utm_medium=ct_market&utm_campaign={town_slug}">Public adjusters</a> · <a href="/for-property-managers/?utm_source=organic_local&utm_medium=ct_market&utm_campaign={town_slug}">Property managers</a></p><p><a href="/free-tools/?utm_source=organic_local&utm_medium=ct_market&utm_campaign={town_slug}">Free property & claim tools</a> · <a href="/enterprise/trust/">Trust & security</a> · <a href="/about/">About BridgePoint</a></p></section><p class="fine">Record count is a current BridgePoint canonical-property count for {html.escape(town)} and can change as source reconciliation continues. BridgePoint is decision-support intelligence, not legal, insurance, engineering or coverage advice.</p></main></body></html>'''
    path.write_text(body, encoding="utf-8")


def write_hub(site: Path) -> None:
    hub = site / "connecticut" / "index.html"
    hub.parent.mkdir(parents=True, exist_ok=True)
    cards = "".join(
        f'<div class="card"><a href="/connecticut/{slug(town)}/" style="color:#73e7fa;font-weight:850;text-decoration:none">{html.escape(town)}</a><div class="muted">{count:,} canonical property records</div></div>'
        for town, count in MARKETS.items()
    )
    hub.write_text(
        f'''<!doctype html><html lang="en"><head>{HEADER}<title>Connecticut Property Intelligence | BridgePoint</title><meta name="description" content="BridgePoint property intelligence entry points for 40 Connecticut municipalities, with current canonical property counts and role-specific workflows."><link rel="canonical" href="{ORIGIN}/connecticut/">{STYLE}</head><body><main class="wrap"><section class="hero"><div class="eyebrow">BRIDGEPOINT CONNECTICUT</div><h1>Property intelligence across Connecticut.</h1><p class="sub">Choose a municipality to see the current BridgePoint property foundation and enter the workflow built for roofing, restoration, public adjusting, property management and other property professionals.</p><div class="actions"><a class="btn" href="/app/?mode=create&utm_source=organic_local&utm_medium=ct_hub">Start the 7-day trial</a><a class="btn secondary" href="/free-tools/">Use free tools first</a></div></section><section class="grid">{cards}</section></main></body></html>''',
        encoding="utf-8",
    )


def update_sitemap(site: Path) -> None:
    sitemap = site / "sitemap.xml"
    text = sitemap.read_text(encoding="utf-8") if sitemap.exists() else '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
    urls = [f"{ORIGIN}/connecticut/"] + [f"{ORIGIN}/connecticut/{slug(town)}/" for town in MARKETS]
    additions = "".join(
        f'<url><loc>{url}</loc><changefreq>weekly</changefreq><priority>{"0.8" if url.endswith("/connecticut/") else "0.7"}</priority></url>'
        for url in urls
        if f"<loc>{url}</loc>" not in text
    )
    if "</urlset>" not in text:
        raise SystemExit("sitemap.xml is missing </urlset>")
    sitemap.write_text(text.replace("</urlset>", additions + "</urlset>"), encoding="utf-8")


def main() -> int:
    site = Path(sys.argv[1] if len(sys.argv) > 1 else "site")
    site.mkdir(parents=True, exist_ok=True)
    for town, count in MARKETS.items():
        write_market_page(site, town, count)
    write_hub(site)
    update_sitemap(site)
    (site / "connecticut" / "market-counts.json").write_text(
        json.dumps({
            "generated_from": "BridgePoint canonical production counts",
            "as_of": "2026-08-23",
            "markets": MARKETS,
        }, indent=2) + "\n",
        encoding="utf-8",
    )
    assert (site / "connecticut" / "middletown" / "index.html").is_file()
    assert (site / "connecticut" / "hartford" / "index.html").is_file()
    print(f"generated {len(MARKETS)} Connecticut municipality pages plus hub")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
