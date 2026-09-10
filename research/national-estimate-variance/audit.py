#!/usr/bin/env python3
"""BridgePoint National Property Estimate Variance Index.

Reads a de-identified CSV and emits aggregate statistics only.
This script does not ingest or publish raw claim documents, proprietary vendor price lists,
policyholder identifiers, or claim-specific legal/coverage conclusions.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import statistics
from collections import Counter, defaultdict
from pathlib import Path

REQUIRED = {
    "claim_key",
    "state_code",
    "submitted_estimate_total",
    "independently_supported_total",
    "rights_status",
    "deidentified",
    "verification_status",
}


def truthy(v: str) -> bool:
    return str(v).strip().lower() in {"1", "true", "yes", "y"}


def money(v: str) -> float:
    x = float(v)
    if not math.isfinite(x) or x < 0:
        raise ValueError("amount must be finite and non-negative")
    return x


def percentile(values: list[float], p: float) -> float | None:
    if not values:
        return None
    xs = sorted(values)
    if len(xs) == 1:
        return xs[0]
    pos = (len(xs) - 1) * p
    lo, hi = math.floor(pos), math.ceil(pos)
    if lo == hi:
        return xs[lo]
    return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo)


def summarize(rows: list[dict]) -> dict:
    variances = [r["variance_amount"] for r in rows]
    percents = [r["variance_percent"] for r in rows if r["variance_percent"] is not None]
    by_state: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_state[r["state_code"]].append(r)

    state_summary = {}
    for state, group in sorted(by_state.items()):
        vals = [r["variance_amount"] for r in group]
        pcts = [r["variance_percent"] for r in group if r["variance_percent"] is not None]
        state_summary[state] = {
            "n": len(group),
            "median_variance_amount": round(statistics.median(vals), 2),
            "median_variance_percent": round(statistics.median(pcts), 4) if pcts else None,
        }

    return {
        "study": "National Property Estimate Variance Index",
        "eligible_claims": len(rows),
        "states_covered": len(by_state),
        "median_variance_amount": round(statistics.median(variances), 2) if variances else None,
        "mean_variance_amount": round(statistics.fmean(variances), 2) if variances else None,
        "p25_variance_amount": round(percentile(variances, 0.25), 2) if variances else None,
        "p75_variance_amount": round(percentile(variances, 0.75), 2) if variances else None,
        "median_variance_percent": round(statistics.median(percents), 4) if percents else None,
        "positive_variance_share": round(sum(v > 0 for v in variances) / len(variances), 4) if variances else None,
        "state_summary": state_summary,
        "interpretation_note": "Variance is not proof of coverage owed, bad faith, wrongful denial, or legal underpayment.",
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("input_csv", type=Path)
    ap.add_argument("--output", type=Path, default=Path("aggregate-results.json"))
    ap.add_argument("--minimum-n", type=int, default=100)
    args = ap.parse_args()

    eligible: list[dict] = []
    exclusions = Counter()
    with args.input_csv.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        missing = REQUIRED - set(reader.fieldnames or [])
        if missing:
            raise SystemExit(f"Missing required columns: {', '.join(sorted(missing))}")
        for raw in reader:
            try:
                if raw["rights_status"].strip().upper() != "PERMITTED":
                    exclusions["rights_not_permitted"] += 1
                    continue
                if not truthy(raw["deidentified"]):
                    exclusions["not_deidentified"] += 1
                    continue
                if raw["verification_status"].strip().upper() != "VERIFIED":
                    exclusions["not_verified"] += 1
                    continue
                submitted = money(raw["submitted_estimate_total"])
                supported = money(raw["independently_supported_total"])
                variance = supported - submitted
                pct = (variance / submitted) if submitted > 0 else None
                eligible.append({
                    "claim_key": raw["claim_key"],
                    "state_code": raw["state_code"].strip().upper(),
                    "variance_amount": variance,
                    "variance_percent": pct,
                })
            except Exception:
                exclusions["invalid_row"] += 1

    result = summarize(eligible)
    result["exclusions"] = dict(exclusions)
    result["publication_gate"] = {
        "minimum_n": args.minimum_n,
        "passes": len(eligible) >= args.minimum_n,
    }
    args.output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(result["publication_gate"]))


if __name__ == "__main__":
    main()
