# bridgepoint-property-intelligence

Open, lightweight property-peril screening utilities from BridgePoint Intelligence.

This package is intentionally **not** the proprietary BridgePoint production model. It provides transparent baseline functions that developers, contractors, adjusters, researchers, and proptech builders can inspect and reuse.

## Included

- `wind_screen(...)` — relative 0–100 wind-vulnerability screening index.
- `hail_screen(...)` — relative 0–100 hail-exposure screening index.

Both functions expose their inputs and return an interpretation/limitation statement.

## Example

```python
from bridgepoint_property_intelligence import wind_screen, hail_screen

print(wind_screen(gust_mph=58, roof_age_years=14).to_dict())
print(hail_screen(hail_inches=1.5, roof_age_years=14).to_dict())
```

## What these scores mean

They are **relative screening indices**. They do not determine that a specific roof failed, confirm insurance damage, calculate actuarial claim probability, determine coverage, or calculate payment owed.

A production assessment should consider actual construction, code era, attachment, geometry, material, age/condition, exposure, source resolution, verified observations, and professional review where appropriate.

## Why open this layer?

BridgePoint's broader platform is designed to connect property identity, evidence, public data, weather/peril context, longitudinal property health, digital twins, and governed claims workflows. Publishing small transparent baseline utilities makes the interface inspectable while BridgePoint keeps its proprietary decision-intelligence control plane and customer data private.

For the full platform and authenticated estimate/supplement workflow:

**https://bridgepointintelligence.online/app/?utm_source=python_package&utm_medium=developer_tool&utm_campaign=bridgepoint_property_intelligence**

Public technical material:

- https://bridgepointintelligence.online/enterprise/
- https://bridgepointintelligence.online/enterprise/capabilities.json
- https://bridgepointintelligence.online/research/national-estimate-variance/

## PyPI status

The package source and build metadata are prepared for PyPI. Actual publication should use PyPI Trusted Publishing from GitHub Actions rather than storing a long-lived PyPI API token. Until the trusted publisher is configured, install from source or use the code directly.

## License

MIT for this open utility layer only. BridgePoint production services, private models, customer data, restricted upstream data, and private source code are not licensed by this repository.
