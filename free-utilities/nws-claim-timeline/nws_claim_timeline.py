#!/usr/bin/env python3
"""BridgePoint Intelligence — Free NWS Claim Timeline Formatter.

Fetches National Weather Service alert records for a latitude/longitude and
formats them into a compact Markdown or JSON timeline useful for claim review.

This utility does not determine property damage, coverage, causation, claim
value, or underpayment. It only organizes NWS alert records for review.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any

API_ROOT = "https://api.weather.gov"
USER_AGENT = "BridgePoint-NWS-Claim-Timeline/1.0 (bridgepointintelligence@gmail.com)"


def _get_json(path: str) -> dict[str, Any]:
    req = urllib.request.Request(
        f"{API_ROOT}{path}",
        headers={"User-Agent": USER_AGENT, "Accept": "application/geo+json"},
    )
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.load(response)


def fetch_alerts(lat: float, lon: float, active_only: bool = False) -> list[dict[str, Any]]:
    endpoint = "/alerts/active" if active_only else "/alerts"
    point = urllib.parse.quote(f"{lat:.4f},{lon:.4f}")
    payload = _get_json(f"{endpoint}?point={point}")
    return payload.get("features", [])


def normalize_alert(feature: dict[str, Any]) -> dict[str, Any]:
    p = feature.get("properties") or {}
    return {
        "event": p.get("event"),
        "severity": p.get("severity"),
        "certainty": p.get("certainty"),
        "urgency": p.get("urgency"),
        "sent": p.get("sent"),
        "effective": p.get("effective"),
        "onset": p.get("onset"),
        "expires": p.get("expires"),
        "ends": p.get("ends"),
        "headline": p.get("headline"),
        "area_desc": p.get("areaDesc"),
        "sender_name": p.get("senderName"),
        "id": feature.get("id") or p.get("id"),
    }


def as_markdown(alerts: list[dict[str, Any]], lat: float, lon: float) -> str:
    lines = [
        "# NWS Alert Timeline",
        "",
        f"Coordinates: `{lat:.4f}, {lon:.4f}`",
        f"Generated: `{datetime.now(timezone.utc).isoformat()}`",
        "",
        "| Event | Severity | Effective | Expires | Area |",
        "|---|---|---|---|---|",
    ]
    for a in alerts:
        lines.append(
            "| {event} | {severity} | {effective} | {expires} | {area} |".format(
                event=(a.get("event") or "").replace("|", "/"),
                severity=a.get("severity") or "",
                effective=a.get("effective") or "",
                expires=a.get("expires") or a.get("ends") or "",
                area=(a.get("area_desc") or "").replace("|", "/"),
            )
        )
    if not alerts:
        lines.append("| No matching alert records returned |  |  |  |  |")

    lines += [
        "",
        "> Weather alerts are context, not proof of property damage, causation, coverage, or claim value.",
        "",
        "Need the larger property/claim workflow? BridgePoint can connect weather context to property evidence, estimate review, provenance, and human-reviewed supplement analysis:",
        "https://bridgepointintelligence.online/app/?utm_source=github&utm_medium=utility&utm_campaign=nws_claim_timeline",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Format NWS alerts into a claim-review-friendly timeline.")
    parser.add_argument("lat", type=float, help="Latitude")
    parser.add_argument("lon", type=float, help="Longitude")
    parser.add_argument("--active", action="store_true", help="Return active alerts only")
    parser.add_argument("--json", action="store_true", help="Print JSON instead of Markdown")
    args = parser.parse_args()

    try:
        alerts = [normalize_alert(x) for x in fetch_alerts(args.lat, args.lon, args.active)]
    except Exception as exc:
        print(f"NWS request failed: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps({
            "source": "National Weather Service api.weather.gov",
            "coordinates": {"lat": args.lat, "lon": args.lon},
            "active_only": args.active,
            "alerts": alerts,
            "limitations": [
                "Weather alert presence is not proof of property damage.",
                "This utility does not determine coverage, causation, claim value, or underpayment.",
            ],
        }, indent=2))
    else:
        print(as_markdown(alerts, args.lat, args.lon))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
