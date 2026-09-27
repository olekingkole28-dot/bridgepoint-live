#!/usr/bin/env python3
"""BridgePoint free claim/property evidence preflight.

Reads plain text from a file or stdin and reports which common evidence
categories appear to be represented. This is organizational assistance only;
it does not determine damage, claim validity, coverage, or code compliance.
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass


@dataclass(frozen=True)
class Check:
    name: str
    patterns: tuple[str, ...]
    why: str


CHECKS = (
    Check("property_identity", (r"\baddress\b", r"\bparcel\b", r"\bapn\b", r"\blat(?:itude)?\b", r"\blon(?:gitude)?\b"), "Tie evidence to the correct property."),
    Check("event_timing", (r"\bdate\b", r"\btime\b", r"\bloss date\b", r"\boccurred\b", r"\bstorm\b"), "Establish when the relevant event occurred."),
    Check("weather_context", (r"\bwind\b", r"\bhail\b", r"\brain\b", r"\bweather\b", r"\bnoaa\b", r"\bnws\b"), "Capture environmental context without treating it as proof of damage."),
    Check("photos_media", (r"\bphoto\b", r"\bimage\b", r"\bvideo\b", r"\bdrone\b", r"\baerial\b"), "Document visual evidence and its source/date."),
    Check("permit_code_context", (r"\bpermit\b", r"\bcode\b", r"\binspection\b", r"\bordinance\b", r"\bbuilding department\b"), "Preserve relevant permit/code context and provenance."),
    Check("scope_estimate", (r"\bestimate\b", r"\bscope\b", r"\bline item\b", r"\bmeasurement\b", r"\brepair\b"), "Identify the scope/estimate material being reviewed."),
    Check("provenance", (r"\bsource\b", r"\brecord\b", r"\breport\b", r"\bdocument\b", r"\bretrieved\b", r"\btimestamp\b"), "Keep track of where evidence came from and when."),
)


def evaluate(text: str) -> list[tuple[Check, bool]]:
    lower = text.lower()
    return [(check, any(re.search(p, lower, re.I) for p in check.patterns)) for check in CHECKS]


def main() -> int:
    parser = argparse.ArgumentParser(description="Check plain text for common property/claim evidence categories.")
    parser.add_argument("file", nargs="?", help="Text file to inspect. Reads stdin if omitted.")
    args = parser.parse_args()
    text = open(args.file, encoding="utf-8", errors="replace").read() if args.file else sys.stdin.read()
    if not text.strip():
        print("No text supplied.", file=sys.stderr)
        return 2

    results = evaluate(text)
    present = sum(1 for _, ok in results if ok)
    print(f"Evidence categories represented: {present}/{len(results)}\n")
    for check, ok in results:
        print(f"[{'x' if ok else ' '}] {check.name}: {check.why}")

    print("\nReminder: this preflight organizes inputs only. Verify facts against authoritative sources.")
    print("Full BridgePoint workflow: https://bridgepointintelligence.online/app/?utm_source=github&utm_medium=free_utility&utm_campaign=claim_preflight")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
