#!/usr/bin/env python3
"""Build BridgePoint Connecticut acquisition pages and release-time conversion overlays.

The guarded V683 publisher is the only Pages owner. This script generates the 40
Connecticut municipality entry pages and applies small, deterministic acquisition
fixes to already-copied public surfaces before V683 validates and publishes them.
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
    body = f'''<!doctype html><html lang="en"><head>{HEADER}<title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc)}"><link rel="canonical" href="{canonical}">{STYLE}<script type="application/ld+json">{schema}</script></head><body><main class="wrap"><section class="hero"><div class="eyebrow">CONNECTICUT PROPERTY INTELLIGENCE</div><h1>{html.escape(town)} property intelligence before the visit.</h1><p class="sub">BridgePoint turns fragmented property and event evidence into one field-ready workflow: property context, changing signals, timelines, maps and explainable opportunity prioritization.</p><div class="actions"><a class="btn" href="/sample/?utm_source=organic_local&utm_medium=ct_market&utm_campaign={town_slug}">See 5 opportunities free</a><a class="btn secondary" href="/app/?mode=create&utm_source=organic_local&utm_medium=ct_market&utm_campaign={town_slug}">Start the 7-day trial</a></div></section><section class="grid"><div class="card"><div class="metric">{count:,}</div><div class="muted">canonical BridgePoint property records currently normalized for {html.escape(town)}.</div></div><div class="card"><strong>What BridgePoint connects</strong><p class="muted">Property records, weather and event context, permits/public-record evidence, timelines and verified opportunity signals when supporting data is available.</p></div><div class="card"><strong>Built for action</strong><p class="muted">Use the app to answer “why this property?” and “why now?” without treating a score as proof of physical damage, claim coverage or a guaranteed outcome.</p></div></section><section class="card links"><h2>Choose the workflow closest to your work</h2><p><a href="/for-roofers/?utm_source=organic_local&utm_medium=ct_market&utm_campaign={town_slug}">Roofing & exterior contractors</a> · <a href="/for-restoration/?utm_source=organic_local&utm_medium=ct_market&utm_campaign={town_slug}">Restoration & mitigation</a> · <a href="/for-public-adjusters/?utm_source=organic_local&utm_medium=ct_market&utm_campaign={town_slug}">Public adjusters</a> · <a href="/for-property-managers/?utm_source=organic_local&utm_medium=ct_market&utm_campaign={town_slug}">Property managers</a></p><p><a href="/free-tools/?utm_source=organic_local&utm_medium=ct_market&utm_campaign={town_slug}">Free property & claim tools</a> · <a href="/enterprise/trust/">Trust & security</a> · <a href="/about/">About BridgePoint</a></p></section><p class="fine">Record count is a current BridgePoint canonical-property count for {html.escape(town)} and can change as source reconciliation continues. BridgePoint is decision-support intelligence, not legal, insurance, engineering or coverage advice.</p></main></body></html>'''
    path.write_text(body, encoding="utf-8")


def write_hub(site: Path) -> None:
    hub = site / "connecticut" / "index.html"
    hub.parent.mkdir(parents=True, exist_ok=True)
    cards = "".join(
        f'<div class="card"><a href="/connecticut/{slug(town)}/" style="color:#73e7fa;font-weight:850;text-decoration:none">{html.escape(town)}</a><div class="muted">{count:,} canonical property records</div></div>'
        for town, count in MARKETS.items()
    )
    hub.write_text(
        f'''<!doctype html><html lang="en"><head>{HEADER}<title>Connecticut Property Intelligence | BridgePoint</title><meta name="description" content="BridgePoint property intelligence entry points for 40 Connecticut municipalities, with current canonical property counts and role-specific workflows."><link rel="canonical" href="{ORIGIN}/connecticut/">{STYLE}</head><body><main class="wrap"><section class="hero"><div class="eyebrow">BRIDGEPOINT CONNECTICUT</div><h1>Property intelligence across Connecticut.</h1><p class="sub">Choose a municipality to see the current BridgePoint property foundation and enter the workflow built for roofing, restoration, public adjusting, property management and other property professionals.</p><div class="actions"><a class="btn" href="/sample/?utm_source=organic_local&utm_medium=ct_hub&utm_campaign=free_territory_preview">See my territory free</a><a class="btn secondary" href="/free-tools/?utm_source=organic_local&utm_medium=ct_hub&utm_campaign=property_snapshot">Try one property first</a></div></section><section class="grid">{cards}</section></main></body></html>''',
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


def patch_territory_preview(site: Path) -> None:
    path = site / "sample" / "index.html"
    if not path.is_file():
        raise SystemExit("territory preview missing")
    text = path.read_text(encoding="utf-8")
    text = text.replace('<option value="OTHER">Another U.S. state — building</option>', '')
    text = text.replace("state_code:$('state').value==='OTHER'?'':$('state').value", "state_code:$('state').value")
    text = text.replace("let st=$('state').value==='OTHER'?'US':$('state').value;", "let st=$('state').value;")
    text = text.replace("const st=$('state').value==='OTHER'?'CT':$('state').value;", "const st=$('state').value;")
    if 'value="OTHER">Another U.S. state' in text or "==='OTHER'" in text:
        raise SystemExit("ambiguous OTHER-state fallback remains in territory preview")
    path.write_text(text, encoding="utf-8")


def patch_free_tools_funnel(site: Path) -> None:
    path = site / "free-tools" / "index.html"
    if not path.is_file():
        raise SystemExit("free-tools surface missing")
    text = path.read_text(encoding="utf-8")

    old_nav = '<div><a href="/growth/">Live evidence</a> · <a href="/app/?mode=signup&utm_source=free_tools&utm_medium=nav&utm_campaign=sept1_revenue_sprint">Start trial</a></div>'
    new_nav = '<div><a href="/growth/">Live evidence</a> · <a href="/sample/?utm_source=free_tools&utm_medium=nav&utm_campaign=territory_preview_v684">Territory preview</a></div>'
    text = text.replace(old_nav, new_nav)

    old_unlock = '<div class="actions"><a class="btn primary" id="unlockTrial" href="/app/?mode=signup&utm_source=free_tools&utm_medium=property_snapshot&utm_campaign=sept1_revenue_sprint&utm_content=unlock_snapshot">Continue this property in BridgePoint</a><a class="btn secondary" href="/start-now/?utm_source=free_tools&utm_medium=property_snapshot&utm_campaign=sept1_revenue_sprint&utm_content=plans">See plans</a></div>'
    new_unlock = '<div class="actions"><a class="btn primary" href="/sample/?utm_source=free_tools&utm_medium=property_snapshot&utm_campaign=territory_preview_v684&utm_content=after_snapshot">See 5 opportunities in this territory — free</a><a class="btn secondary" id="unlockTrial" href="/app/?mode=signup&utm_source=free_tools&utm_medium=property_snapshot&utm_campaign=sept1_revenue_sprint&utm_content=unlock_snapshot">Continue this property in BridgePoint</a></div>'
    text = text.replace(old_unlock, new_unlock)

    text = text.replace('<h2>Continue the property inside BridgePoint.</h2><p class="muted">The free layer proves whether BridgePoint has context. An account unlocks the matched record, evidence timeline, source provenance, patterns, scoring and workflow.</p>', '<h2>Turn one property into a territory.</h2><p class="muted">You checked one property. Now see five ranked opportunities for a Connecticut territory before signup, then decide whether the full BridgePoint workflow is worth opening.</p>')

    old_actions = '<div class="actions"><a class="btn primary" id="bottomTrial" href="/app/?mode=signup&utm_source=free_tools&utm_medium=owned_utility&utm_campaign=sept1_revenue_sprint&utm_content=start_trial">Start the 7-day trial</a><a class="btn secondary" href="/start-now/?utm_source=free_tools&utm_medium=owned_utility&utm_campaign=sept1_revenue_sprint&utm_content=plans">See plans</a><a class="btn secondary" href="/sample/?utm_source=free_tools&utm_medium=owned_utility&utm_campaign=sept1_revenue_sprint&utm_content=territory_sample">Request a territory sample</a></div>'
    new_actions = '<div class="actions"><a class="btn primary" href="/sample/?utm_source=free_tools&utm_medium=owned_utility&utm_campaign=territory_preview_v684&utm_content=territory_sample">See 5 territory opportunities — free</a><a class="btn secondary" id="bottomTrial" href="/app/?mode=signup&utm_source=free_tools&utm_medium=owned_utility&utm_campaign=sept1_revenue_sprint&utm_content=start_trial">Start the 7-day trial</a><a class="btn secondary" href="/start-now/?utm_source=free_tools&utm_medium=owned_utility&utm_campaign=sept1_revenue_sprint&utm_content=plans">See plans</a></div>'
    text = text.replace(old_actions, new_actions)

    required = [
        'Territory preview',
        'See 5 opportunities in this territory — free',
        'Turn one property into a territory.',
        'See 5 territory opportunities — free',
    ]
    missing = [item for item in required if item not in text]
    if missing:
        raise SystemExit(f"free-tools territory handoff missing: {missing}")
    path.write_text(text, encoding="utf-8")


def main() -> int:
    site = Path(sys.argv[1] if len(sys.argv) > 1 else "site")
    site.mkdir(parents=True, exist_ok=True)
    for town, count in MARKETS.items():
        write_market_page(site, town, count)
    write_hub(site)
    update_sitemap(site)
    patch_territory_preview(site)
    patch_free_tools_funnel(site)
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
    assert 'See 5 opportunities free' in (site / "connecticut" / "middletown" / "index.html").read_text(encoding="utf-8")
    assert 'See 5 territory opportunities — free' in (site / "free-tools" / "index.html").read_text(encoding="utf-8")
    assert 'value="OTHER"' not in (site / "sample" / "index.html").read_text(encoding="utf-8")
    print(f"generated {len(MARKETS)} Connecticut municipality pages plus hub; applied territory-first acquisition overlays")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
