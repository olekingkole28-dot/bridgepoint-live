# BridgePoint Intelligence QGIS plugin

A permission-minimal QGIS plugin for analyst-driven property lookup.

## What it does
- prompts for an exact U.S. street address;
- resolves it through \`bridgepoint_public_search_v5200\`;
- adds the resolved point to the active QGIS project;
- carries address/property/parcel identifiers as attributes;
- optionally opens the full BridgePoint 3D property view.

## Install
Download \`qgis-plugin.zip\` from the BridgePoint Distribution Network. QGIS → Plugins → Manage and Install Plugins → Install from ZIP.

## QGIS repository publication
The source is structured as a standard QGIS plugin, but publication to the official QGIS plugin repository still requires the owner to sign in, upload the ZIP and accept the repository review/licensing process.
