# BridgePoint Property Context Assistant

A small Chrome/Chromium extension prototype for claims and property workflows.

## Privacy model

This is deliberately **not** a silent "shadow" extension.

- It requests `activeTab` and `scripting` only.
- It reads the active page only after the user clicks **Inspect this page locally**.
- Page text is analyzed locally in the extension.
- Page text is not sent to BridgePoint.
- The BridgePoint link receives only ordinary campaign parameters and, when detected, the five-digit ZIP code.

This privacy posture is intentional. A property-intelligence company that wants enterprise/carrier trust should not build an undisclosed browser scraper into customer workflows.

## Current local checks

The prototype detects:

- first five-digit ZIP pattern;
- count of visible dollar-formatted values;
- presence of common estimate/claim terms;
- page title.

It **does not** claim to detect underpayment or coverage owed from arbitrary page HTML.

## Install for development

1. Download this folder.
2. Open Chrome/Chromium extensions.
3. Enable Developer mode.
4. Choose **Load unpacked** and select this folder.
5. On a property/estimate page, click the BridgePoint extension, then click **Inspect this page locally**.

## Next production gate

Before any store publication, add:

- signed/reviewed release packaging;
- explicit privacy policy;
- supported-portal adapters instead of generic page assumptions;
- opt-in mapping from normalized user-selected estimate data into the authenticated BridgePoint workflow;
- portal terms-of-service review for each supported integration.
