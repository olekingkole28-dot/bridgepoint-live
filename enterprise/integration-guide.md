# BridgePoint Enterprise Integration Guide

BridgePoint Intelligence is built around a canonical, evidence-linked property record rather than a single vendor-specific file format. This guide describes the public integration posture without exposing customer data, credentials, proprietary scoring weights, or privileged endpoints.

## Integration principles

1. **Canonical first.** External data is normalized into BridgePoint property, evidence, claim, sensor, material, hazard, and outcome concepts before it is used by downstream workflows.
2. **Provenance survives transformation.** Source, effective date, confidence, verification status, and rights metadata remain attached where applicable.
3. **No assumed privileged vendor access.** A BridgePoint integration only uses data a customer or provider is authorized to supply.
4. **Human gates remain where required.** Claims, supplement, engineering-adjacent, and experimental sensing outputs can require review before external use.
5. **Live-state is connection dependent.** Weather monitoring can run independently; building IoT/BAS telemetry requires an authorized building or device integration.

## Supported integration patterns

### Property intelligence input

Typical fields:

- stable customer/property reference;
- address or parcel identity inputs;
- geography;
- source/effective date;
- evidence category;
- confidence/verification metadata;
- rights or permitted-use metadata where required.

### Claims interchange

BridgePoint maintains a canonical claim-interchange model for:

- claim timeline metadata;
- loss and inspection events;
- estimate-created and carrier-estimate events;
- supplement events;
- payment/outcome events;
- evidence fingerprints and redacted notes.

Exports can be represented as JSON, CSV bundles, or partner-specific mappings when a partner schema and authorization are available.

### Smart Supplement workflow

The supplement workflow is designed to accept authorized estimate inputs, normalize line items, compare them with evidence-backed repair scope, and identify:

- omitted supported scope;
- quantity differences;
- unit-price differences when an authorized pricing basis is available;
- documentation needed for human review.

BridgePoint does not treat a variance as automatic proof of coverage owed or wrongful underpayment, and does not promise that a supplement will compel payment.

### Live building telemetry

BridgePoint's IoT architecture supports normalized device and observation records for partner-connected systems. Candidate connection patterns include webhook, MQTT/BAS bridge, or managed partner integration. Customer telemetry is not represented as live until an authorized connection exists and observations are actually being received.

### Digital twins

A BridgePoint twin may be upgraded incrementally with:

- parcel/building geometry;
- imagery;
- LiDAR;
- BIM or CAD;
- drone reconstruction;
- blueprints;
- field observations;
- authorized sensor streams.

Twin fidelity is versioned. A partial data model is not described as an exact replica without adequate validated source precision.

## Public readiness source

The public readiness contract is exposed through the BridgePoint public deep-tech readiness RPC and the machine-readable manifest at `enterprise/capabilities.json`.

The readiness labels intentionally distinguish operational, screening, validation, integration-required, and building-stage capabilities.

## Data contribution and model validation

Customer workflows can create future validation candidates only when the applicable rights, privacy, de-identification, quality, and verification rules permit reuse. Restricted or unverified data is not automatically converted into training data.

## Enterprise diligence

A production enterprise integration should separately review:

- authentication and authorization;
- data-processing terms;
- retention and deletion requirements;
- source licensing and permitted use;
- state-specific privacy obligations;
- audit logging;
- incident response;
- model/output limitations;
- partner-specific schema and service-level expectations.
