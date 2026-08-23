#!/usr/bin/env python3
"""BridgePoint NWS Claim Weather Formatter.

Free lead-magnet utility that converts official National Weather Service alert
records for a latitude/longitude into clean, copy-ready claim notes.

This utility does not determine property damage, claim coverage, causation,
engineering conclusions, or insurance payment owed.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Any

API_ROOT = "https://api.weather.gov"
USER_AGENT = "BridgePointWeatherFormatter/1.0 (https://bridgepointintelligence.online; bridgepointintelligence@gmail.com)"


def _fetch_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/geo+json",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def _clean(value: Any) -> str:
    if value is None:
        return "Not stated"
    text = " ".join(str(value).split())
    return text or "Not stated"


def fetch_alerts(latitude: float, longitude: float, active_only: bool = False) -> list[dict[str, Any]]:
    endpoint = "/alerts/active" if active_only else "/alerts"
    query = urllib.parse.urlencode({"point": f"{latitude:.5f},{longitude:.5f}"})
    payload = _fetch_json(f"{API_ROOT}{endpoint}?{query}")
    return list(payload.get("features") or [])


def format_alerts(latitude: float, longitude: float, features: list[dict[str, Any]]) -> str:
    lines = [
        "BRIDGEPOINT — NWS CLAIM WEATHER TIMELINE",
        f"Coordinates: {latitude:.5f}, {longitude:.5f}",
        f"Generated: {datetime.now().astimezone().isoformat(timespec='seconds')}",
        "Source: National Weather Service (api.weather.gov)",
        "",
    ]

    if not features:
        lines += [
            "No matching NWS alert records were returned for this point in the selected API window.",
            "",
        ]
    else:
        for index, feature in enumerate(features, 1):
            p = feature.get("properties") or {}
            lines += [
                f"[{index}] {_clean(p.get('event'))}",
                f"Issued: {_clean(p.get('sent'))}",
                f"Effective: {_clean(p.get('effective'))}",
                f"Onset: {_clean(p.get('onset'))}",
                f"Expires: {_clean(p.get('expires'))}",
                f"Severity: {_clean(p.get('severity'))}",
                f"Certainty: {_clean(p.get('certainty'))}",
                f"Urgency: {_clean(p.get('urgency'))}",
                f"Area: {_clean(p.get('areaDesc'))}",
                f"Headline: {_clean(p.get('headline'))}",
                f"NWS ID: {_clean(p.get('id'))}",
                "",
            ]

    lines += [
        "IMPORTANT LIMITATION",
        "An NWS alert documents a weather warning/advisory context; it is not proof that a specific property sustained damage or that coverage/payment is owed.",
        "",
        "Need the full workflow? BridgePoint can organize property evidence and compare authorized estimate line items for missing scope, quantity differences, and price variance with human review.",
        "https://bridgepointintelligence.online/app/?utm_source=github&utm_medium=free_utility&utm_campaign=nws_claim_formatter",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Format NWS alert data into copy-ready claim notes.")
    parser.add_argument("latitude", type=float)
    parser.add_argument("longitude", type=float)
    parser.add_argument("--active-only", action="store_true", help="Use only currently active NWS alerts.")
    parser.add_argument("--json", action="store_true", help="Print raw normalized JSON instead of formatted notes.")
    args = parser.parse_args()

    if not (-90 <= args.latitude <= 90 and -180 <= args.longitude <= 180):
        parser.error("latitude must be -90..90 and longitude must be -180..180")

    try:
        alerts = fetch_alerts(args.latitude, args.longitude, args.active_only)
    except Exception as exc:
        print(f"NWS request failed: {exc}", file=sys.stderr)
        return 2

    if args.json:
        normalized = [feature.get("properties") or {} for feature in alerts]
        print(json.dumps(normalized, indent=2))
    else:
        print(format_alerts(args.latitude, args.longitude, alerts))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
