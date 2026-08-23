# Free NWS Claim Timeline Formatter

A small, dependency-free BridgePoint Intelligence utility for turning National Weather Service alert records into a compact Markdown or JSON timeline for claim review.

## What it does

- accepts a latitude and longitude;
- queries `api.weather.gov`;
- normalizes returned alert records;
- outputs a clean timeline for review or downstream automation;
- can return active alerts only;
- can emit Markdown or JSON.

## What it does not do

This tool does **not** determine whether a property was damaged, whether a loss is covered, whether an insurer underpaid a claim, or what a carrier legally owes. Weather context must be combined with property-specific evidence and professional review.

## Usage

```bash
python nws_claim_timeline.py 41.5623 -72.6506
```

Active alerts only:

```bash
python nws_claim_timeline.py 41.5623 -72.6506 --active
```

JSON output:

```bash
python nws_claim_timeline.py 41.5623 -72.6506 --json
```

## Why BridgePoint publishes this

Claim and property teams waste time copying basic public weather records into consistent formats. This utility solves that narrow problem for free.

BridgePoint's larger platform connects weather context to property identity, provenance, evidence, property timelines, estimate-line comparison, and human-reviewed Smart Supplement workflows.

**Need the full workflow?** Open BridgePoint here:

https://bridgepointintelligence.online/app/?utm_source=github&utm_medium=utility&utm_campaign=nws_claim_timeline

BridgePoint keeps the distinction between public weather context and verified property findings explicit. Weather exposure alone is never treated as proof of damage.
