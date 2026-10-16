# BridgePoint for Google Sheets

This source package turns BridgePoint's public-safe property resolution into spreadsheet functions.

## Install now (manual Apps Script)
1. Open a Google Sheet.
2. Extensions → Apps Script.
3. Replace the default script with \`Code.gs\` from this folder.
4. In Project Settings, enable the manifest file and replace it with \`appsscript.json\`.
5. Save and reload the sheet.
6. Approve the requested external-request permission when Google asks.

## Functions
- \`=BRIDGEPOINT_SEARCH(A2,"property_id")\`
- \`=BRIDGEPOINT_SEARCH(A2,"parcel_number")\`
- \`=BRIDGEPOINT_PROPERTY(A2)\`
- \`=BRIDGEPOINT_STATUS("canonical_properties")\`

This package uses only BridgePoint's public-safe endpoints. Paid/account-gated intelligence remains in the BridgePoint app.

## Marketplace publication
The code is ready for a Google Workspace Marketplace project, but public Marketplace publication still requires the Google Cloud OAuth/verification and Marketplace review steps in the owner's Google account.
