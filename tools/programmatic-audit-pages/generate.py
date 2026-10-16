#!/usr/bin/env python3
"""Generate sourced BridgePoint ZIP/material audit-context pages.

This generator is deliberately publication-gated. It can generate thousands of
routes, but a page is indexable only when its input record says `indexable: true`
and includes enough unique, sourced facts. Missing labor/cost data is shown as
unavailable rather than invented.
"""
from __future__ import annotations

import argparse
import html
import json
from pathlib import Path
from urllib.parse import quote

MIN_FACTS_FOR_INDEX = 3


def clean(value: object) -> str:
    return html.escape(str(value if value is not None else "Unavailable"))


def validate_market(row: dict) -> list[str]:
    errors = []
    if not str(row.get("zip_code", "")).isdigit() or len(str(row.get("zip_code"))) != 5:
        errors.append("zip_code must be five digits")
    if not row.get("material_slug"):
        errors.append("material_slug is required")
    sources = row.get("sources") or []
    facts = row.get("facts") or []
    if row.get("indexable") and len(facts) < MIN_FACTS_FOR_INDEX:
        errors.append(f"indexable pages require at least {MIN_FACTS_FOR_INDEX} sourced facts")
    if row.get("indexable") and not sources:
        errors.append("indexable pages require source citations")
    labor = row.get("labor_benchmark") or {}
    if labor.get("premium_percent") is not None and labor.get("verified") is not True:
        errors.append("labor premium cannot be published unless labor_benchmark.verified=true")
    return errors


def render(row: dict) -> str:
    zip_code = str(row["zip_code"])
    material = row["material_slug"]
    city = row.get("city") or "Local market"
    state = row.get("state") or ""
    title_material = material.replace("-", " ").title()
    robots = "index,follow" if row.get("indexable") else "noindex,follow"
    facts = row.get("facts") or []
    sources = row.get("sources") or []
    labor = row.get("labor_benchmark") or {}
    labor_text = (
        f"{float(labor['premium_percent']):+.1f}% versus {clean(labor.get('comparison_basis','documented benchmark'))}"
        if labor.get("verified") is True and labor.get("premium_percent") is not None
        else "Not published until a current, rights-cleared local benchmark is verified."
    )
    fact_rows = "".join(
        f"<tr><td>{clean(f.get('label'))}</td><td>{clean(f.get('value'))}</td><td>{clean(f.get('source_label'))}</td></tr>"
        for f in facts
    ) or '<tr><td colspan="3">No sourced local facts are published for this page yet.</td></tr>'
    source_items = "".join(
        f'<li><a href="{html.escape(str(s.get("url") or "#"), quote=True)}" rel="nofollow noopener">{clean(s.get("label") or "Source")}</a></li>'
        for s in sources
    ) or "<li>Source set incomplete — page remains noindex.</li>"
    encoded_zip = quote(zip_code)
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{zip_code} {title_material} Property Audit Context | BridgePoint</title>
<meta name="robots" content="{robots}"><meta name="description" content="Sourced property, weather and repair-context data for {city}, {state} {zip_code} and {title_material.lower()} workflows.">
<script src="/acquisition_tracker.js" defer></script>
<style>body{{margin:0;background:#071017;color:#eef8ff;font:15px/1.6 system-ui,sans-serif}}main{{max-width:900px;margin:auto;padding:38px 18px}}a{{color:#4bdfff}}.tag{{color:#4bdfff;font-weight:900;letter-spacing:.1em;font-size:12px}}h1{{font-size:clamp(34px,6vw,58px);line-height:1.05}}.card{{background:#0e1b25;border:1px solid #294354;border-radius:16px;padding:20px;margin:18px 0}}table{{width:100%;border-collapse:collapse}}td,th{{padding:10px;border-bottom:1px solid #294354;text-align:left;vertical-align:top}}.muted{{color:#9fb4c1}}.btn{{display:inline-block;background:#4bdfff;color:#041117;text-decoration:none;font-weight:900;border-radius:10px;padding:13px 16px}}</style></head><body><main>
<div class="tag">BRIDGEPOINT · SOURCED LOCAL AUDIT CONTEXT</div>
<h1>{clean(city)}, {clean(state)} {zip_code}<br>{title_material}</h1>
<p class="muted">This page assembles sourced context useful in property/claim review. It does not determine that a property is damaged, that an estimate is underpaid, or that insurance coverage/payment is owed.</p>
<div class="card"><h2>Published local facts</h2><table><thead><tr><th>Signal</th><th>Value</th><th>Source</th></tr></thead><tbody>{fact_rows}</tbody></table></div>
<div class="card"><h2>Local labor/cost benchmark</h2><p>{labor_text}</p><p class="muted">BridgePoint will not manufacture a local labor premium simply to fill a landing page.</p></div>
<div class="card"><h2>Source registry</h2><ul>{source_items}</ul></div>
<div class="card" data-bp-value="audit_page_to_preflight"><h2>Have an estimate for this market?</h2><p>Run the local-only file preflight without creating an account, then continue into the authenticated workflow only if you want BridgePoint to process the claim file.</p><a class="btn" href="/estimate-preflight/?zip={encoded_zip}&utm_source=programmatic_audit&utm_medium=local_page&utm_campaign={encoded_zip}-{quote(material)}">Open private estimate preflight</a></div>
<p class="muted">Methodology and limitations: <a href="/research/national-estimate-variance/">National Property Estimate Variance Index</a>.</p>
</main></body></html>'''


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path, default=Path("audit"))
    args = parser.parse_args()
    rows = json.loads(args.input.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise SystemExit("input must be a JSON array")
    generated = 0
    for row in rows:
        errors = validate_market(row)
        if errors:
            raise SystemExit(f"{row.get('zip_code','?')}/{row.get('material_slug','?')}: " + "; ".join(errors))
        route = args.output / f"{row['zip_code']}-{row['material_slug']}"
        route.mkdir(parents=True, exist_ok=True)
        (route / "index.html").write_text(render(row), encoding="utf-8")
        generated += 1
    print(json.dumps({"generated": generated, "output": str(args.output)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
