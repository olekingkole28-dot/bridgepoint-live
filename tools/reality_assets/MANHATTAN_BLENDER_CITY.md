# BridgePoint Manhattan Blender City — isolated preview

This project produces a standalone Blender scene and a GLB export for visual review. It does not modify the BridgePoint web viewer, active building layers, live map, or production asset catalog. It has no deploy or release step.

## Source layers

The source-preparation step downloads current NYC OTI building footprints and attributes, NYC street centerlines, planimetric curbs, sidewalks, hydrography polygons, Forestry tree points, DEP hydrants, and the Manhattan borough boundary. Geometries are transformed to a local EPSG:2263 metre frame. Surface layers are clipped to the Manhattan boundary; water extends 450 metres beyond it to include adjacent Hudson and East River water.

The repository's existing nine-tile LiDAR/orthophoto package is reused without changing it. That measured 2 m roof/ground surface and NYS orthophoto coverage is limited to the Midtown 3x3 tile area, not the whole island.

## What is measured versus generated

- Building outlines, construction-year attributes, available roof heights and ground elevations originate in NYC OTI records.
- A missing/zero building height receives an area-based procedural fallback, counted separately in the build report.
- Facade styles, repeated windows, parapets and roof HVAC/vent props are procedural. They are visual detailing, not surveyed window locations or confirmed rooftop equipment.
- Tree locations and available species labels come from NYC Parks ForMS 2.0; tree geometry is a lightweight procedural canopy proxy.
- Road centerlines, curb geometry, sidewalk polygons and water polygons use NYC public datasets. Road ribbon widths are approximated from street class.
- Citywide terrain is interpolated from building-base elevation samples; it is not a continuous bare-earth LiDAR model.
- Citywide redistributable oblique facade photography is not included in these source inputs. This pass is a source-backed city model with generated facade styling, not a fully photo-captured city.

The full Python implementations are stored as gzip-compressed source files beside small Python launchers. For inspection, run gzip -dc on the corresponding .py.gz file. The uncompressed source files are also included in the build artifact.

## Build outputs

The branch-only GitHub Actions workflow installs Blender and the geospatial Python dependencies on a hosted runner, validates the coordinate/clipping functions, downloads sources, builds the editable Blender scene and GLB, and stores them in a 30-day Actions artifact. It does not deploy, merge, or edit any production asset catalog.

To run locally, install Blender 4.x and the dependencies in requirements-manhattan-city.txt, then run the source downloader followed by the Blender launcher as shown in the workflow.

## Integration boundary

Do not add this preview to rebuild-v5000/assets/reality-assets/manifest.json or make it active in BridgePoint until visual review is approved. An eventual viewer integration should use a single active Manhattan mesh in place of—not on top of—the existing building renderer for the same coverage and zoom range. Keep a clear fallback outside the Manhattan coverage boundary.
