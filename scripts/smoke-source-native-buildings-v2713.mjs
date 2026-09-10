import { PMTiles } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';

const FALLBACK_RELEASE = '2026-08-19.0';
const STAC_URL = 'https://stac.overturemaps.org/catalog.json';
const releasePattern = /^\d{4}-\d{2}-\d{2}\.\d+$/;
const lon = -72.6506;
const lat = 41.5623;
const z = 14;

function lonX(value, zoom) {
  const n = 2 ** zoom;
  return Math.max(0, Math.min(n - 1, Math.floor((value + 180) / 360 * n)));
}
function latY(value, zoom) {
  const n = 2 ** zoom;
  const p = Math.max(-85.05112878, Math.min(85.05112878, value)) * Math.PI / 180;
  return Math.max(0, Math.min(n - 1, Math.floor((1 - Math.asinh(Math.tan(p)) / Math.PI) / 2 * n)));
}
async function latestRelease() {
  try {
    const r = await fetch(STAC_URL, { headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(`STAC ${r.status}`);
    const j = await r.json();
    if (releasePattern.test(String(j.latest || ''))) return String(j.latest);
  } catch (e) {
    console.warn(`STAC lookup unavailable (${e.message}); testing pinned fallback ${FALLBACK_RELEASE}`);
  }
  return FALLBACK_RELEASE;
}

const release = await latestRelease();
const url = `https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/${release}/buildings.pmtiles`;
const pm = new PMTiles(url);
const header = await pm.getHeader();
if (!Number.isInteger(header.maxZoom) || header.maxZoom < 12) throw new Error(`Unexpected PMTiles header: maxZoom=${header.maxZoom}`);

const cx = lonX(lon, z), cy = latY(lat, z);
let decoded = null;
let found = null;
for (let dy = -1; dy <= 1 && !found; dy++) {
  for (let dx = -1; dx <= 1 && !found; dx++) {
    const x = cx + dx, y = cy + dy;
    const rr = await pm.getZxy(z, x, y);
    if (!rr?.data) continue;
    const vt = new VectorTile(new Pbf(rr.data));
    const building = vt.layers?.building;
    const part = vt.layers?.building_part;
    const total = Number(building?.length || 0) + Number(part?.length || 0);
    if (total > 0) {
      found = { x, y, building: Number(building?.length || 0), building_part: Number(part?.length || 0), total };
      const layer = building?.length ? building : part;
      const f = layer.feature(0);
      const gj = f.toGeoJSON(x, y, z);
      if (!gj?.geometry || !['Polygon', 'MultiPolygon'].includes(gj.geometry.type)) throw new Error(`Unexpected decoded geometry ${gj?.geometry?.type}`);
      decoded = { geometryType: gj.geometry.type, propertyKeys: Object.keys(f.properties || {}).slice(0, 12) };
    }
  }
}
if (!found) throw new Error('No building/building_part features decoded in 3x3 Middletown CT smoke area');

console.log(JSON.stringify({
  ok: true,
  release,
  pmtiles: { minZoom: header.minZoom, maxZoom: header.maxZoom, tileType: header.tileType },
  tile: { z, ...found },
  decoded
}, null, 2));
