# BridgePoint Data Governance & Evidence Reuse

BridgePoint Intelligence is designed to distinguish **data access**, **workflow use**, **public publication**, and **model-training/validation reuse**. Permission for one does not automatically imply permission for the others.

## Evidence states

BridgePoint may treat an input as one of several evidence states, including candidate, submitted, document-checked, verified, rejected, revoked, restricted, or derived. Downstream use depends on the applicable evidence state and rights metadata.

## Public benchmark rules

For the National Property Estimate Variance Index, a claim record can enter a public aggregate only when it is:

- permitted for the stated research use;
- de-identified;
- verified under the study methodology;
- included only after sample-size and methodology gates are met.

BridgePoint does not publish raw policyholder identities, raw claim documents, customer claim numbers, or proprietary vendor price lists as part of the open registry.

## Model validation and training

Ordinary BridgePoint usage can create valuable labeled evidence, but reuse is gated. A workflow record is not automatically model-training data simply because it exists in the platform.

Potential validation/training candidates must satisfy the applicable combination of:

- contractual or user permission;
- source licensing/permitted use;
- privacy and de-identification requirements;
- verification/quality thresholds;
- purpose limitation;
- retention rules;
- model-governance approval.

## Location and sensor data

Precise location, building telemetry, IoT/BAS observations, drone data, and similar high-granularity inputs should be collected only for an authorized operational purpose and under the applicable customer/partner agreement. BridgePoint should minimize retention and exposure of raw precise data when a less granular derivative is sufficient for the product purpose.

## Explainability

Where practical, BridgePoint preserves the evidence chain behind a property signal or model output: source, observation/effective date, confidence, verification status, and model/version context. The goal is to allow a reviewer to distinguish source evidence from derived inference.

## High-impact output limitations

BridgePoint readiness and screening outputs do not automatically constitute:

- an engineering certification;
- an actuarial determination;
- a coverage opinion;
- legal advice;
- a claim-specific amount legally owed;
- an autonomous flight or building-control authorization.

Human or professional review remains required where the workflow, evidence quality, regulation, contract, or customer use case demands it.

## Enterprise diligence posture

BridgePoint maintains a public readiness and methodology layer so enterprise evaluators can see what is operational, what is screening-grade, what remains in validation, and what requires an external integration. Security and privacy claims should be limited to controls that have actually been verified.
