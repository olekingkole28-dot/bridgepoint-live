# National Property Estimate Variance Index

BridgePoint Intelligence open technical registry for measuring differences between submitted property repair estimates and independently supported repair scope/cost evidence.

## Current status

**DATA COLLECTION.** No vendor-specific conclusion is currently published.

Target cohort: **1,000** eligible de-identified claims across the United States. The first aggregate publication gate is **100 eligible records**, but state- or vendor-specific results require larger, defensible cohorts and separate review.

## Why “variance,” not “underpayment”

A difference between two estimates can come from scope, timing, geography, contractor economics, material assumptions, labor assumptions, depreciation, policy terms, documentation quality, or other factors. A positive variance does **not** by itself prove coverage owed, bad faith, wrongful denial, or legal underpayment.

The registry therefore separates:

- scope variance;
- price variance;
- total estimate variance;
- sample size and geography;
- verification status;
- rights and de-identification eligibility.

## Public Smart Supplement simulation

`smart_supplement_demo.py` is a deliberately simplified, simulated demonstration of the BridgePoint comparison contract:

```text
authorized/simulated estimate input
→ regional benchmark context
→ peril screening context
→ estimate variance
→ human-review recommendation
```

The demo intentionally does **not**:

- fetch or pretend to fetch live NOAA observations;
- label a benchmark as the single “true market cost”;
- decide coverage owed;
- call a positive variance legal underpayment;
- promise payment;
- expose BridgePoint production scoring logic, proprietary weights, customer claims, or restricted pricing sources.

The production BridgePoint Smart Supplement workflow is separate and more detailed. It can distinguish missing supported scope, quantity differences, and price variance, carry evidence references/confidence, and assemble a human-review packet when authorized claim and estimate inputs exist.

Run the public simulation with:

```bash
python smart_supplement_demo.py
```

## Publication gates

A record may enter a public aggregate only when all of these are true:

1. `rights_status = PERMITTED`
2. `deidentified = true`
3. `verification_status = VERIFIED`
4. the applicable minimum sample threshold is satisfied
5. the methodology version and exclusions are disclosed
6. vendor-specific publication, when applicable, passes an additional rights/legal review

## Required input schema

The open audit script expects a CSV containing at least:

```text
claim_key
state_code
submitted_estimate_total
independently_supported_total
rights_status
deidentified
verification_status
```

`claim_key` must be a non-identifying token or hash. Do not commit claim numbers, policyholder names, street addresses, phone numbers, email addresses, raw claim files, proprietary price lists, or restricted vendor data to this repository.

Optional downstream fields may include peril, line-item counts, scope variance, price variance, estimate-source family, and methodology metadata.

## Reproduce an aggregate

```bash
python audit.py deidentified-claims.csv --output aggregate-results.json --minimum-n 100
```

The script excludes records that fail rights, de-identification, or verification gates, then emits aggregate statistics only.

## Interpretation rules

- Report sample size with every percentage.
- Prefer medians and distributions to a single sensational average.
- Separate scope and price effects where the evidence allows it.
- Do not infer intent from a pricing difference.
- Do not treat an estimate comparison as a legal coverage determination.
- Do not identify a vendor in published findings unless the underlying use rights and publication review permit it.
- Publish limitations and exclusion criteria with results.

## BridgePoint objective

The goal is not to manufacture outrage. It is to create a reproducible property-estimating benchmark that contractors, adjusters, carriers, researchers, and enterprise diligence teams can inspect and challenge.
