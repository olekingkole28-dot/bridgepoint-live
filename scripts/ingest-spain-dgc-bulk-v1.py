#!/usr/bin/env python3
"""Parallel Spain DGC cadastral ZIP ingestion through the OIDC-gated BridgePoint worker.

No service-role or static worker secret is stored in GitHub. Each runner mints a
short-lived GitHub OIDC token for the locked repository/workflow, then asks the
existing Supabase worker to claim and ingest one official cadastral ZIP at a time.
"""
from __future__ import annotations

import argparse
import json
import os
import time
from urllib.parse import urlencode

import requests

SUPABASE_URL = os.environ.get(
    "SUPABASE_URL", "https://xdfsjztwgsbmabshzsjw.supabase.co"
).rstrip("/")
WORKER_URL = f"{SUPABASE_URL}/functions/v1/bridgepoint-es-dgc-bulk-v5880"
OIDC_AUDIENCE = "bridgepoint-es-dgc-bulk-v5880"
MAX_CALLS = 500
MAX_IDLE_CYCLES = 25
REQUEST_TIMEOUT_SECONDS = 175
IDLE_SLEEP_SECONDS = 6


def oidc_token(session: requests.Session) -> str:
    request_url = os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]
    request_secret = os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]
    separator = "&" if "?" in request_url else "?"
    url = request_url + separator + urlencode({"audience": OIDC_AUDIENCE})
    response = session.get(
        url,
        headers={"Authorization": f"bearer {request_secret}"},
        timeout=20,
    )
    response.raise_for_status()
    token = response.json().get("value")
    if not token:
        raise RuntimeError("GitHub OIDC endpoint returned no token")
    return str(token)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--worker", type=int, required=True)
    args = parser.parse_args()
    if not 0 <= args.worker <= 15:
        raise SystemExit("worker must be between 0 and 15")
    if not os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL") or not os.environ.get(
        "ACTIONS_ID_TOKEN_REQUEST_TOKEN"
    ):
        raise SystemExit("GitHub Actions OIDC is unavailable; id-token: write is required")

    session = requests.Session()
    completed = 0
    records = 0
    applied = 0
    invalid = 0
    failures = 0
    idle_cycles = 0
    consecutive_errors = 0
    started = time.monotonic()
    print(
        json.dumps(
            {"stage": "spain_dgc_worker_started", "worker": args.worker},
            separators=(",", ":"),
        ),
        flush=True,
    )

    for call_no in range(1, MAX_CALLS + 1):
        token = oidc_token(session)
        try:
            response = session.post(
                WORKER_URL,
                json={},
                headers={
                    "content-type": "application/json",
                    "x-bp-oidc-token": token,
                },
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
        except requests.RequestException as exc:
            failures += 1
            consecutive_errors += 1
            print(
                json.dumps(
                    {
                        "stage": "spain_dgc_transport_error",
                        "worker": args.worker,
                        "call": call_no,
                        "error": str(exc)[:240],
                    },
                    separators=(",", ":"),
                ),
                flush=True,
            )
            if consecutive_errors >= 12:
                raise RuntimeError("12 consecutive transport failures; stopping this runner")
            time.sleep(4)
            continue

        try:
            data = response.json()
        except ValueError:
            data = {}

        if response.status_code in (401, 403):
            raise RuntimeError(
                f"OIDC authorization rejected (HTTP {response.status_code}): "
                f"{str(data)[:400]}"
            )

        item_url = data.get("item_url")
        if response.ok and data.get("complete") is True and item_url:
            completed += 1
            current_records = int(data.get("records") or 0)
            current_applied = int(data.get("applied") or 0)
            current_invalid = int(data.get("invalid") or 0)
            records += current_records
            applied += current_applied
            invalid += current_invalid
            idle_cycles = 0
            consecutive_errors = 0
            print(
                json.dumps(
                    {
                        "stage": "spain_dgc_item_ingested",
                        "worker": args.worker,
                        "items_completed": completed,
                        "records_parsed": current_records,
                        "records_applied": current_applied,
                        "invalid_records": current_invalid,
                        "cumulative_records_parsed": records,
                        "cumulative_records_applied": applied,
                        "elapsed_seconds": int(time.monotonic() - started),
                    },
                    separators=(",", ":"),
                ),
                flush=True,
            )
            continue

        claim = data.get("claim") or {}
        if response.ok and claim.get("claimed") is False:
            idle_cycles += 1
            consecutive_errors = 0
            if idle_cycles >= MAX_IDLE_CYCLES:
                break
            time.sleep(IDLE_SLEEP_SECONDS)
            continue

        failures += 1
        consecutive_errors += 1
        print(
            json.dumps(
                {
                    "stage": "spain_dgc_item_retry",
                    "worker": args.worker,
                    "call": call_no,
                    "http_status": response.status_code,
                    "error": str(data.get("error") or response.text[:400])[:400],
                    "failures": failures,
                },
                separators=(",", ":"),
            ),
            flush=True,
        )
        idle_cycles = 0
        if consecutive_errors >= 12:
            raise RuntimeError("12 consecutive ingestion failures; stopping this runner")
        time.sleep(3)

    print(
        json.dumps(
            {
                "stage": "spain_dgc_worker_finished",
                "worker": args.worker,
                "items_completed": completed,
                "records_parsed": records,
                "records_applied": applied,
                "invalid_records": invalid,
                "failures": failures,
                "elapsed_seconds": int(time.monotonic() - started),
            },
            separators=(",", ":"),
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
