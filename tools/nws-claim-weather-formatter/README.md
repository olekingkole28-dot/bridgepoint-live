# BridgePoint NWS Claim Weather Formatter

A free, open utility for roofers, public adjusters, restoration teams, claim professionals, and developers who need to turn National Weather Service alert records into clean, copy-ready claim notes.

## What it does

Give the utility a latitude and longitude. It requests NWS alert data from `api.weather.gov`, then formats the returned records into a compact timeline containing event type, issue/effective/onset/expiration times, severity, certainty, urgency, area, headline, and NWS identifier.

The NWS `/alerts` endpoint contains alerts issued over roughly the prior seven days. Use `--active-only` to request only currently active alerts.

## Run it

No third-party Python packages are required.

```bash
python weather_formatter.py 41.5623 -72.6506
```

Active alerts only:

```bash
python weather_formatter.py 41.5623 -72.6506 --active-only
```

Raw normalized alert properties:

```bash
python weather_formatter.py 41.5623 -72.6506 --json
```

## Why BridgePoint gives this away

Weather formatting is useful, but it is only one piece of a property or claim workflow.

BridgePoint Intelligence is being built to connect property identity, weather/peril context, public evidence, timelines, repair scope, estimate comparison, and human-reviewed supplement support in one governed workspace.

**Tired of assembling this manually?** Open BridgePoint and run the full property/claim workflow:

**https://bridgepointintelligence.online/app/?utm_source=github&utm_medium=free_utility&utm_campaign=nws_claim_formatter**

## Important limitations

- An NWS alert is not proof that a specific property sustained damage.
- This utility does not determine causation, engineering conclusions, insurance coverage, legal underpayment, or payment owed.
- Weather alerts can cover areas much larger than an individual property.
- Official source records and professional review should be preserved when weather evidence is used in a claim.
- This repository does not contain customer claim documents, proprietary carrier data, restricted pricing lists, or BridgePoint's private scoring logic.

## Source

National Weather Service API: `https://api.weather.gov`

BridgePoint identifies itself to the NWS API with a dedicated User-Agent and contact address, as required by the service.
