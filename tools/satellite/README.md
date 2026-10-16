# BridgePoint false-colour Landsat exporter

This tool creates actual georeferenced false-colour imagery from USGS/NASA Landsat Collection 2 Level-2 cloud-optimized GeoTIFF assets indexed by Microsoft Planetary Computer. It does not synthesize pixels.

## Install

Use Python 3.10+ and install the pinned-minimum dependencies:

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

python -m pip install -r tools/satellite/requirements.txt
```

## Lena River Delta showcase

```bash
python tools/satellite/landsat_false_color.py \
  --bbox 125.0,71.5,129.0,73.0 \
  --composite earth \
  --max-cloud 25 \
  --output-dir output/lena-delta
```

The bbox order is **west,south,east,north** in longitude/latitude degrees. Change it to target a different area. The STAC search selects a Landsat 8/9 scene intersecting the bbox and satisfying the requested date and maximum scene-wide cloud-cover constraints. If no scene qualifies, widen the date range or raise `--max-cloud`.

## False-colour recipes

| Preset | RGB mapping | What it emphasizes |
| --- | --- | --- |
| `earth` | R=SWIR-2, G=NIR, B=Red | Vegetation and land/water form contrast, useful for Earth-as-Art-like imagery |
| `water-soil` | R=SWIR-1, G=NIR, B=Red | Moisture, sediments, exposed soil, and vegetation edges |
| `vegetation` | R=NIR, G=Red, B=Green | Classic infrared false-colour vegetation response |

Example alternate presets:

```bash
python tools/satellite/landsat_false_color.py --bbox -73.8,41.3,-72.3,42.1 --composite water-soil
python tools/satellite/landsat_false_color.py --bbox -73.8,41.3,-72.3,42.1 --composite vegetation --date-start 2022-01-01T00:00:00Z --max-cloud 15
```

## Contrast stretch and export

The script:
1. Searches the public STAC catalog for real Landsat 8/9 Level-2 scenes.
2. Applies each band's STAC scale and offset metadata.
3. Masks fill, dilated cloud, cirrus, cloud, cloud shadow, and snow using the Landsat `qa_pixel` band.
4. Estimates each RGB channel's lower/upper thresholds from a sampled, cloud-masked pixel grid using configurable percentiles (defaults: 2nd–98th) to avoid loading multiple full-resolution bands into memory just to estimate contrast.
5. Processes source COG windows in chunks and writes a tiled, compressed **3-band RGB GeoTIFF** with native spatial CRS/transform and an internal validity mask, plus an optimized **RGBA PNG** with transparent masked pixels.

Defaults are `--low-percentile 2`, `--high-percentile 98`, `--gamma 0.9`, and `--block-size 512`. You can adjust them for different scenes.

The GeoTIFF and PNG are written into `--output-dir`; a JSON run report printed to stdout records the item ID, acquisition time, scene cloud-cover estimate, band mapping, percentile thresholds, and output paths.

## Resolution, limits, and provenance

Landsat 8/9 visible/NIR/SWIR optical bands are approximately **30 metres per pixel**. This is excellent for landscapes, river systems, vegetation, sediment, and broad property context—not current, roof-level imagery. The selected scene may be older than the current date; acquisition time is recorded in both the GeoTIFF tags and JSON report. Cloud cover is a scene-wide estimate; QA masking removes flagged cloud/shadow pixels but cannot guarantee all remaining pixels are cloud-free.

Attribution in the generated metadata: **USGS/NASA Landsat Collection 2 Level-2 via Microsoft Planetary Computer**. Review applicable data-use and redistribution terms before publishing exported imagery. A source observation time is not the time BridgePoint generated the export.
