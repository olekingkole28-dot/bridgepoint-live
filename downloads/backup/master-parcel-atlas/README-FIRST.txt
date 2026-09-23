BRIDGEPOINT MASTER PARCEL BOUNDARY ATLAS v5631

PURPOSE
This is the Supabase-independent owner copy of the parcel-boundary map.
It reads BridgePoint's rescued state Parquet directly from C:\BridgePointData\snapshots.
It does not need Supabase to index, query, display, or print rescued parcel geometry.

START
Double-click: Start Master Parcel Boundary Atlas.bat
Local URL: http://127.0.0.1:8766/

WHAT "LINES NEVER GO AWAY" MEANS
At national scale there are far more parcel boundaries than display pixels, so individual parcels cannot physically be distinguished.
The atlas keeps the national/jurisdiction context present, then streams exact rescued parcel polygons as the map reaches useful regional/property zoom.
Already loaded exact lines are not cleared when the viewport moves; new local lines are added after they load.

PRINT / GIANT MAP
Use "Open printable SVG sheet" at the viewport you want.
The SVG is vector linework and can be opened/printed at extremely large dimensions without rasterizing the parcel strokes.
For a whole-country wall map, print/export regional sheets at a scale where parcels are actually distinguishable.

RESCUE-AWARE INDEXING
The atlas scans C:\BridgePointData\snapshots\state_code=*\parcel_geometry\*.parquet.
It ignores Parquet parts modified in the last two minutes so it does not read files still settling during the rescue.
It records every indexed part in C:\BridgePointData\atlas\parcel_atlas.sqlite and resumes after restart.
As new state Parquet arrives, it becomes available automatically.

GAP VIEW
The panel shows every U.S. state/jurisdiction as not-started, partial, emergency-core-safe, or fully complete.
This lets the owner see where the rescue and boundary coverage still have holes.

SOURCE OF TRUTH
Exact geometry comes from the rescued parcel_geom_ewkb_base64 column.
The master dataset remains the Parquet/state rescue plus boundary provenance and property-to-boundary linkage.
Do not delete C:\BridgePointData or the OneDrive BridgePointRescue copy.
