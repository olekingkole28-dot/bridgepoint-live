const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const METERS_LAT = 110540;
const metersLon = lat => 111320 * Math.max(0.12, Math.cos(lat * Math.PI / 180));
const validPoint = p => Array.isArray(p) && Number.isFinite(+p[0]) && Number.isFinite(+p[1]) && Math.abs(+p[1]) <= 90;
function cleanLine(line) {
  const out = [];
  for (const p of Array.isArray(line) ? line : []) {
    if (!validPoint(p)) continue;
    const q = [+p[0], +p[1]], last = out[out.length - 1];
    if (!last || Math.abs(q[0] - last[0]) + Math.abs(q[1] - last[1]) > 1e-10) out.push(q);
  }
  return out;
}
function distance(a, b) {
  const lat = (a[1] + b[1]) * 0.5;
  return Math.hypot((b[0] - a[0]) * metersLon(lat), (b[1] - a[1]) * METERS_LAT);
}
function lineLength(line) {
  let total = 0;
  for (let i = 1; i < line.length; i++) total += distance(line[i - 1], line[i]);
  return total;
}
function pointAt(line, d) {
  if (!line.length) return null;
  let walked = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], length = distance(a, b);
    if (walked + length >= d && length > 0) {
      const t = clamp((d - walked) / length, 0, 1);
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    walked += length;
  }
  return line[line.length - 1].slice();
}
function sliceLine(line, start, end) {
  const out = [pointAt(line, start)];
  let walked = 0;
  for (let i = 1; i < line.length; i++) {
    walked += distance(line[i - 1], line[i]);
    if (walked > start + 0.004 && walked < end - 0.004) out.push(line[i].slice());
  }
  const last = pointAt(line, end);
  if (last && distance(out[out.length - 1], last) > 0.004) out.push(last);
  return out.filter(Boolean);
}
function offsetPoint(p, east, north) {
  return [p[0] + east / metersLon(p[1]), p[1] + north / METERS_LAT];
}
function ribbon(line, halfWidth, offset = 0) {
  const pts = cleanLine(line);
  if (pts.length < 2) return null;
  const normals = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const lat = (a[1] + b[1]) * 0.5, dx = (b[0] - a[0]) * metersLon(lat), dy = (b[1] - a[1]) * METERS_LAT;
    const length = Math.hypot(dx, dy) || 1;
    normals.push({x: -dy / length, y: dx / length});
  }
  const side = sign => pts.map((p, i) => {
    const n0 = normals[Math.max(0, i - 1)], n1 = normals[Math.min(normals.length - 1, i + 1)];
    let nx = n0.x + n1.x, ny = n0.y + n1.y, len = Math.hypot(nx, ny) || 1;
    nx /= len; ny /= len;
    const miter = Math.min(1.7, 1 / Math.max(0.58, Math.abs(nx * n1.x + ny * n1.y)));
    const d = offset + sign * halfWidth * miter;
    return [p[0] + nx * d / metersLon(p[1]), p[1] + ny * d / METERS_LAT];
  });
  const ring = [...side(1), ...side(-1).reverse()];
  ring.push(ring[0].slice());
  return [ring];
}
function linesOf(geometry) {
  if (geometry?.type === 'LineString') return [geometry.coordinates || []];
  if (geometry?.type === 'MultiLineString') return geometry.coordinates || [];
  return [];
}
function tagsOf(p) { return p?.properties?.tags || p?.tags || p?.source_tags || {}; }
function parsedWidth(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim().toLowerCase(), m = s.match(/[0-9]+(?:[.,][0-9]+)?/);
  if (!m) return null;
  let n = Number(m[0].replace(',', '.'));
  if (/\b(ft|feet|foot)\b|"$/.test(s)) n *= 0.3048;
  return Number.isFinite(n) && n >= 0.5 && n <= 8 ? n : null;
}
function isSidewalk(feature) {
  const p = feature?.properties || {}, tags = tagsOf(p);
  const c = String(p.class || '').toLowerCase();
  const sub = String(p.subclass || p.subtype || '').toLowerCase();
  const key = String(p.layer_key || '').toUpperCase();
  const footway = String(tags.footway || p.footway || '').toLowerCase();
  if ([
    'SIDEWALKS', 'SIDEWALKS_PARKING', 'SURFACE_MATERIAL_FINE', 'GLOBAL_SIDEWALKS'
  ].includes(key)) return true;
  // Match the same public vector-tile classes already drawn by the globe's
  // close-zoom sidewalk/footway line layers. This keeps 3D coverage aligned
  // with the 2D source coverage instead of requiring optional OSM tag fields.
  if (c === 'sidewalk' || sub === 'sidewalk' || sub === 'footway' || footway === 'sidewalk') return true;
  return ['footway', 'pedestrian', 'path', 'cycleway', 'steps', 'living_street'].includes(c);
}
function sidewalkWidth(p) {
  const tags = tagsOf(p);
  const width = parsedWidth(tags['width:sidewalk'] || tags.width || p.width_m || p.width);
  return {width: clamp(width || 1.8, 0.9, 4.5), truth: width ? 'SOURCE_TAGGED_WIDTH' : 'DISPLAY_ESTIMATE_1_8M'};
}
function roadWidth(p) {
  const tags = tagsOf(p), explicit = parsedWidth(tags.width || p.width_m || p.width);
  if (explicit && explicit > 2) return clamp(explicit, 2.5, 36);
  const lanes = Number(p.lanes || tags.lanes);
  if (Number.isFinite(lanes) && lanes > 0) return clamp(lanes * 3.25, 3, 26);
  return ({motorway:11,trunk:9,primary:8,secondary:7,tertiary:5.8,minor:4.8,residential:5.2,service:3.5,living_street:4.5}[String(p.class || '').toLowerCase()] || 4.2);
}
function nearestRoad(line, roads) {
  const midDistance = lineLength(line) * 0.5, mid = pointAt(line, midDistance);
  const before = pointAt(line, Math.max(0, midDistance - 0.5)), after = pointAt(line, Math.min(lineLength(line), midDistance + 0.5));
  if (!mid || !before || !after) return null;
  const sx = metersLon(mid[1]), tx0 = (after[0] - before[0]) * sx, ty0 = (after[1] - before[1]) * METERS_LAT;
  const tl = Math.hypot(tx0, ty0) || 1, tx = tx0 / tl, ty = ty0 / tl, nx = -ty, ny = tx;
  let best = null;
  for (const road of roads) for (const pts of road.lines) for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], ax = (a[0] - mid[0]) * sx, ay = (a[1] - mid[1]) * METERS_LAT;
    const bx = (b[0] - mid[0]) * sx, by = (b[1] - mid[1]) * METERS_LAT;
    const vx = bx - ax, vy = by - ay, ll = vx * vx + vy * vy;
    if (ll < 0.1) continue;
    const t = clamp(-(ax * vx + ay * vy) / ll, 0, 1), rx = ax + t * vx, ry = ay + t * vy;
    const d = Math.hypot(rx, ry), segmentLength = Math.sqrt(ll);
    const parallel = Math.abs((vx / segmentLength) * tx + (vy / segmentLength) * ty);
    if (d < 0.15 || d > 20 || parallel < 0.62 || (best && d >= best.distance)) continue;
    const side = rx * nx + ry * ny >= 0 ? 1 : -1;
    best = {distance: d, side, width: road.width};
  }
  return best;
}
function hash(text) {
  let h = 2166136261 >>> 0;
  for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function rand(seed, n) {
  let x = (hash(seed) + Math.imul(n + 1, 0x9e3779b1)) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0; x ^= x >>> 15;
  return (x >>> 0) / 4294967295;
}
function add(output, geometry, properties) {
  if (!geometry) return;
  output.push({type:'Feature', geometry, properties});
}
function addPoly(output, ring, properties) {
  if (ring) add(output, {type:'Polygon', coordinates:ring}, properties);
}
function addBlade(output, center, tangent, width, length, angle, base, seed) {
  const theta = Math.atan2(tangent[1], tangent[0]) + angle;
  const ux = Math.cos(theta), uy = Math.sin(theta), nx = -uy, ny = ux;
  const p1 = offsetPoint(center, ux * length * 0.5, uy * length * 0.5);
  const p2 = offsetPoint(center, -ux * length * 0.32 + nx * width * 0.5, -uy * length * 0.32 + ny * width * 0.5);
  const p3 = offsetPoint(center, -ux * length * 0.32 - nx * width * 0.5, -uy * length * 0.32 - ny * width * 0.5);
  const ring = [[p1,p2,p3,p1]];
  add(output, {type:'Polygon',coordinates:ring}, {part:'grass_blade',base_m:base,top_m:base+0.10+rand(seed,3)*0.05,color:rand(seed,4)>.5?'#64934b':'#467b3b',truth:'PROCEDURAL_GRASS_DISPLAY_MESH'});
}
function addLinePath(output, feature, rawLine, roads, elevationAt, limits, counts, mobile) {
  const line = cleanLine(rawLine), total = lineLength(line);
  if (line.length < 2 || total < 0.7 || counts.paths >= limits.paths) return;
  const p = feature.properties || {}, dimensions = sidewalkWidth(p), width = dimensions.width;
  const id = String(p.source_record_id || p.osm_id || p.id || feature.id || (line[0].join(',') + ':' + line[line.length-1].join(',')));
  const road = nearestRoad(line, roads), curbWidth = 0.16, half = width * 0.5;
  let vergeWidth = 0, curbOffset = 0;
  if (road) {
    const gap = road.distance - road.width * 0.5 - half;
    if (gap >= -0.10 && gap <= 6.0) {
      vergeWidth = clamp(gap - curbWidth - 0.035, 0, 5.7);
      curbOffset = road.side * (half + vergeWidth + 0.035 + curbWidth * 0.5);
    }
  }
  const panelLength = mobile ? 1.75 : 1.55;
  const panels = Math.max(1, Math.ceil(total / panelLength));
  const actualLength = total / panels;
  for (let index = 0; index < panels && counts.panels < limits.panels; index++) {
    const start = index * actualLength, end = (index + 1) * actualLength;
    const trim = Math.min(0.012, (end - start) * 0.025);
    const segment = sliceLine(line, start + trim, end - trim);
    const center = pointAt(line, (start + end) * 0.5);
    let elevation = null;
    try { elevation = elevationAt ? elevationAt(center) : null; } catch (_) {}
    const sampled = Number.isFinite(elevation), ground = sampled ? elevation : 0;
    const common = {source_record_id:id,base_m:ground,terrain_sampled:sampled,width_m:width,width_truth:dimensions.truth,surface_material:String(p.surface || tagsOf(p).surface || 'concrete').toLowerCase(),terrain_anchor:'MAP_QUERY_TERRAIN_ELEVATION_METERS'};
    addPoly(output, ribbon(segment, half - 0.008), {...common,part:'sidewalk_slab',top_m:ground+0.145,geometry_truth:'SOURCE_SIDEWALK_CENTERLINE_WITH_TAGGED_OR_ESTIMATED_WIDTH'});
    counts.panels++;
    if (start > 0.05) {
      const before = pointAt(line, Math.max(0, start - 0.08)), after = pointAt(line, Math.min(total, start + 0.08));
      const dx = (after[0] - before[0]) * metersLon(center[1]), dy = (after[1] - before[1]) * 110540, length = Math.hypot(dx,dy) || 1;
      const nx = -dy / length, ny = dx / length;
      const joint = [offsetPoint(center,nx*half,ny*half),offsetPoint(center,-nx*half,-ny*half)];
      add(output,{type:'LineString',coordinates:joint},{...common,part:'panel_joint',color:'#625f58',top_m:ground+0.151,truth:'DISPLAY_EXPANSION_JOINT'});
    }
    if (index % 5 === 3 && counts.cracks < limits.cracks) {
      const crackCenter = pointAt(line,start+actualLength*0.55), before=pointAt(line,Math.max(0,start+actualLength*0.55-0.12)),after=pointAt(line,Math.min(total,start+actualLength*0.55+0.12));
      const tx=(after[0]-before[0])*metersLon(crackCenter[1]),ty=(after[1]-before[1])*110540,tl=Math.hypot(tx,ty)||1;
      const nx=-ty/tl,ny=tx/tl,side=(rand(id,index)-0.5)*0.55;
      const coords=[offsetPoint(crackCenter,nx*(side-0.30),ny*(side-0.30)),offsetPoint(crackCenter,nx*side+tx/tl*0.035,ny*side+ty/tl*0.035),offsetPoint(crackCenter,nx*(side+0.26),ny*(side+0.26))];
      add(output,{type:'LineString',coordinates:coords},{...common,part:'hairline_crack',color:'#514e48',top_m:ground+0.153,truth:'PROCEDURAL_SURFACE_WEAR_NOT_OBSERVED_DAMAGE'});
      counts.cracks++;
    }
    if (road && vergeWidth > 0 && counts.verges < limits.verges) {
      const grassCenterOffset = road.side * (half + 0.018 + vergeWidth * 0.5);
      addPoly(output,ribbon(segment,vergeWidth*0.5,grassCenterOffset),{...common,part:'grass_verge',top_m:ground+0.045,color:'#4e7b3e',surface_pattern:'bp-sidewalk-grass-v1',truth:'ROAD_ADJACENT_VERGE_FROM_MAPPED_SIDEWALK_AND_ROAD'});
      const curb = ribbon(segment,curbWidth*0.5,curbOffset);
      addPoly(output,curb,{...common,part:'curb',top_m:ground+0.20,color:'#aaa9a2',curb_height_m:0.18,truth:'ROAD_EDGE_DERIVED_CURB'});
      counts.verges++;
      const bladeStep = mobile ? 0.85 : 0.62;
      for(let d=start+bladeStep*0.5;d<end && counts.blades<limits.blades;d+=bladeStep){
        const point=pointAt(line,d),before=pointAt(line,Math.max(0,d-0.08)),after=pointAt(line,Math.min(total,d+0.08));
        const tx=(after[0]-before[0])*metersLon(point[1]),ty=(after[1]-before[1])*110540,tl=Math.hypot(tx,ty)||1;
        const normal=[-ty/tl,tx/tl],offset=road.side*(half+0.018+vergeWidth*(0.15+0.7*rand(id,Math.floor(d*20))));
        const bladeCenter=offsetPoint(point,normal[0]*offset,normal[1]*offset);
        addBlade(output,bladeCenter,[tx/tl,ty/tl],0.014+rand(id,Math.floor(d*30))*0.012,0.08+rand(id,Math.floor(d*40))*0.07,(rand(id,Math.floor(d*50))-.5)*1.2,ground,id+':'+d);
        counts.blades++;
      }
    } else if (road && road.distance - road.width*0.5 - half >= -0.10 && counts.verges < limits.verges) {
      addPoly(output,ribbon(segment,curbWidth*0.5,curbOffset),{...common,part:'curb',top_m:ground+0.20,color:'#aaa9a2',curb_height_m:0.18,truth:'ROAD_EDGE_DERIVED_CURB'});
      counts.verges++;
    }
  }
  counts.paths++;
  counts.sourceWidths += dimensions.truth === 'SOURCE_TAGGED_WIDTH' ? 1 : 0;
  counts.estimatedWidths += dimensions.truth === 'SOURCE_TAGGED_WIDTH' ? 0 : 1;
}
export function buildSidewalk3DFeatures({features=[],roadFeatures=[],zoom=0,mobile=false,elevationAt=null}={}) {
  const empty={type:'FeatureCollection',features:[]};
  if(+zoom<14.2||!Array.isArray(features)||!features.length)return empty;
  const limits=mobile?{paths:45,panels:180,verges:110,blades:320,cracks:45}:{paths:300,panels:1800,verges:900,blades:2600,cracks:450};
  const roads=[],seenRoads=new Set();
  for(const feature of Array.isArray(roadFeatures)?roadFeatures:[]){
    const p=feature?.properties||{};
    if(String(p.brunnel||'').toLowerCase()==='bridge'||String(p.bridge||'').toLowerCase()==='yes')continue;
    const key=String(feature.id||p.osm_id||p.id||JSON.stringify(feature.geometry?.coordinates||[]));
    if(seenRoads.has(key))continue;seenRoads.add(key);
    const lines=linesOf(feature.geometry).map(cleanLine).filter(line=>line.length>1);
    if(lines.length)roads.push({lines,width:roadWidth(p)});
    if(roads.length>=(mobile?100:500))break;
  }
  const output=[],counts={paths:0,panels:0,verges:0,blades:0,cracks:0,sourceWidths:0,estimatedWidths:0};
  for(const feature of features){
    if(counts.paths>=limits.paths||counts.panels>=limits.panels)break;
    if(!isSidewalk(feature))continue;
    for(const line of linesOf(feature.geometry)){
      addLinePath(output,feature,line,roads,elevationAt,limits,counts,mobile);
      if(counts.paths>=limits.paths||counts.panels>=limits.panels)break;
    }
  }
  output.stats={paths:counts.paths,individualSlabs:counts.panels,curbAndGrassSegments:counts.verges,grassBlades:counts.blades,joints:counts.panels>0?Math.max(0,counts.panels-counts.paths):0,crackSegments:counts.cracks,sourceTaggedWidths:counts.sourceWidths,estimatedWidths:counts.estimatedWidths,globalSourceCoverage:'OPEN_MAP_SIDEWALK_GEOMETRY_WHERE_MAPPED',visualEstimates:'UNMEASURED_WIDTHS_CURBS_GRASS_AND_HAIRLINE_WEAR_ARE_DISPLAY_DERIVATIONS'};
  return {type:'FeatureCollection',features:output,stats:output.stats};
}
export function installSidewalk3DTextures(map) {
  if(!map?.addImage)return false;
  const names=['bp-sidewalk-grass-v1','bp-sidewalk-concrete-v1','bp-sidewalk-pavers-v1','bp-sidewalk-brick-v1'];
  let installed=0;
  for(let k=0;k<names.length;k++){
    const name=names[k];if(map.hasImage?.(name))continue;
    const size=64,data=new Uint8Array(size*size*4),grass=k===0,paver=k===2,brick=k===3;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const noise=((Math.sin(x*12.9898+y*78.233+k*37.719)*43758.5453)%1)*12;
      let rgb=grass?[65+noise,104+noise,48+noise*.7]:brick?[151+noise,103+noise*.7,80+noise*.6]:paver?[169+noise,160+noise*.8,142+noise*.7]:[188+noise,185+noise*.7,177+noise*.8];
      if(grass&&((x*17+y*29)%23<3))rgb=[42,82,34];
      if((paver||brick)&&((x%16===0)||(y%16===0)))rgb=[103,99,90];
      const i=(y*size+x)*4;data[i]=clamp(Math.round(rgb[0]),0,255);data[i+1]=clamp(Math.round(rgb[1]),0,255);data[i+2]=clamp(Math.round(rgb[2]),0,255);data[i+3]=255;
    }
    try{map.addImage(name,{width:size,height:size,data},{pixelRatio:1});installed++}catch(error){console.warn('BridgePoint sidewalk texture',name,String(error?.message||error))}
  }
  return installed>0;
}
