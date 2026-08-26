#!/usr/bin/env python3
from pathlib import Path
import json
import sys

if len(sys.argv) != 3:
    raise SystemExit('usage: patch-property-twin-v933.py <twin-index> <release-json>')

path = Path(sys.argv[1])
release_path = Path(sys.argv[2])
s = path.read_text(encoding='utf-8')

def replace_once(old: str, new: str, label: str) -> None:
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'V933 guarded replacement {label}: expected 1 match, got {count}')
    s = s.replace(old, new, 1)

replace_once(
    "    let twin=null,currentRow=null,sceneState=null,view='three',historyIndex=0;",
    "    let twin=null,currentRow=null,sceneState=null,view='three',historyIndex=0,terrainPollToken=0;",
    'state',
)

replace_once(
    "      historyIndex=0;workspace.hidden=false;renderTwin();\n      history.replaceState(null,'',`/app/twin/?property=${encodeURIComponent(id)}`);",
    "      historyIndex=0;workspace.hidden=false;renderTwin();scheduleTerrainRefresh(id);\n      history.replaceState(null,'',`/app/twin/?property=${encodeURIComponent(id)}`);",
    'open-property-refresh',
)

replace_once(
    "    function renderTwin(){\n      const caps=asMap(twin.capabilities),queued=asMap(twin.enrichment_queued),site=asMap(twin.site_3d),media=asMap(twin.media),intel=asMap(twin.intelligence);\n      const live=Object.values(caps).filter(bool).length,up=Object.values(queued).filter(bool).length;\n      $('status').innerHTML=pill(`${live} live`,'green')+(up?pill(`${up} upgrading`,'amber'):'')+pill(`${site.building_count||0} nearby structures`)+pill(clean(site.structure_mode,'physical context'));\n      renderPlain(caps,queued,site,media,intel);renderImageViews(media);renderThree(site);selectView(view);\n    }\n\n    function renderPlain(caps,queued,site,media,intel){\n      const front=asMap(media.front),aerial=asMap(media.aerial_current),hist=asRows(media.aerial_history);const lines=[];",
    "    function renderTwin(){\n      const caps=asMap(twin.capabilities),queued=asMap(twin.enrichment_queued),site=asMap(twin.site_3d),terrain=asMap(twin.terrain),media=asMap(twin.media),intel=asMap(twin.intelligence);\n      const live=Object.values(caps).filter(bool).length,up=Object.values(queued).filter(bool).length;\n      const terrainPill=terrain.available&&Number.isFinite(Number(terrain.elevation_m))?pill(`terrain ${Number(terrain.elevation_m).toFixed(1)} m`,'green'):(terrain.queued?pill('terrain upgrading','amber'):'');\n      $('status').innerHTML=pill(`${live} live`,'green')+(up?pill(`${up} upgrading`,'amber'):'')+terrainPill+pill(`${site.building_count||0} nearby structures`)+pill(clean(site.structure_mode,'physical context'));\n      renderPlain(caps,queued,site,terrain,media,intel);renderImageViews(media);renderThree(site);selectView(view);\n    }\n\n    function renderPlain(caps,queued,site,terrain,media,intel){\n      const front=asMap(media.front),aerial=asMap(media.aerial_current),hist=asRows(media.aerial_history);const lines=[];",
    'render-contract',
)

replace_once(
    "      lines.push(caps.geocoded?'This property is pinned to a real map location.':'BridgePoint is still resolving the exact location and will not invent one.');\n      if(site.structure_mode==='SOURCE_FOOTPRINT_HEIGHT')",
    "      lines.push(caps.geocoded?'This property is pinned to a real map location.':'BridgePoint is still resolving the exact location and will not invent one.');\n      if(terrain.available&&Number.isFinite(Number(terrain.elevation_m))){const res=Number(terrain.resolution_m);lines.push(`USGS 3DEP terrain elevation is ${Number(terrain.elevation_m).toFixed(1)} m NAVD88${Number.isFinite(res)?` at ${res.toFixed(res<10?1:0)} m DEM resolution`:''}.`);}\n      else if(terrain.queued||queued.terrain)lines.push('Official USGS 3DEP terrain is queued now; this property is prioritized ahead of background national backfill.');\n      if(site.structure_mode==='SOURCE_FOOTPRINT_HEIGHT')",
    'plain-terrain',
)

replace_once(
    "      $('metrics').innerHTML=`<div class=\"metric\"><b>${signals.length}</b><span>visible signals</span></div><div class=\"metric\"><b>${patterns.length}</b><span>visible patterns</span></div><div class=\"metric\"><b>${esc(score.priority_tier||'—')}</b><span>priority tier</span></div><div class=\"metric\"><b>${esc(site.building_count||0)}</b><span>nearby structures</span></div>`;",
    "      const terrainMetric=terrain.available&&Number.isFinite(Number(terrain.elevation_m))?`${Number(terrain.elevation_m).toFixed(1)} m`:(terrain.queued?'upgrading':'—');\n      $('metrics').innerHTML=`<div class=\"metric\"><b>${signals.length}</b><span>visible signals</span></div><div class=\"metric\"><b>${patterns.length}</b><span>visible patterns</span></div><div class=\"metric\"><b>${esc(score.priority_tier||'—')}</b><span>priority tier</span></div><div class=\"metric\"><b>${esc(site.building_count||0)}</b><span>nearby structures</span></div><div class=\"metric\"><b>${esc(terrainMetric)}</b><span>ground elevation</span></div>`;",
    'terrain-metric',
)

replace_once(
    "      const sourceLines=[];if(front.source_name||front.provider)sourceLines.push(`Front: ${clean(front.source_name||front.provider)}${front.captured_at?' • '+String(front.captured_at).split('T')[0]:''}`);if(aerial.source_name||aerial.provider)sourceLines.push(`Aerial: ${clean(aerial.source_name||aerial.provider)}${aerial.reference_only?' • context only':''}`);sourceLines.push(`3D: ${clean(site.structure_mode,'site context')} • ${site.source_count||0} physical source${Number(site.source_count||0)===1?'':'s'}`);$('sourcePlain').innerHTML=sourceLines.map(x=>`<div>${esc(x)}</div>`).join('');",
    "      const sourceLines=[];if(front.source_name||front.provider)sourceLines.push(`Front: ${clean(front.source_name||front.provider)}${front.captured_at?' • '+String(front.captured_at).split('T')[0]:''}`);if(aerial.source_name||aerial.provider)sourceLines.push(`Aerial: ${clean(aerial.source_name||aerial.provider)}${aerial.reference_only?' • context only':''}`);if(terrain.available){const res=Number(terrain.resolution_m);sourceLines.push(`Terrain: USGS 3DEP${Number.isFinite(res)?` • ${res.toFixed(res<10?1:0)} m DEM`:''}${terrain.vertical_datum?' • '+clean(terrain.vertical_datum):''}`);}else if(terrain.queued)sourceLines.push('Terrain: USGS 3DEP • priority enrichment queued');sourceLines.push(`3D: ${clean(site.structure_mode,'site context')} • ${site.source_count||0} physical source${Number(site.source_count||0)===1?'':'s'}`);$('sourcePlain').innerHTML=sourceLines.map(x=>`<div>${esc(x)}</div>`).join('');",
    'source-terrain',
)

marker = "    function emptyHtml(icon,title,body){"
if marker not in s:
    raise SystemExit('V933 guarded replacement terrain-refresh-marker missing')
terrain_refresh = (
    "    async function scheduleTerrainRefresh(propertyId){\n"
    "      const terrain=asMap(twin?.terrain);if(!terrain.queued||terrain.available)return;\n"
    "      const token=++terrainPollToken;\n"
    "      for(let attempt=0;attempt<10;attempt++){\n"
    "        await new Promise(r=>setTimeout(r,7000));\n"
    "        if(token!==terrainPollToken||!twin)return;\n"
    "        const {data,error}=await sb.rpc('bridgepoint_property_terrain_v931',{p_property_id:propertyId});\n"
    "        if(error)continue;\n"
    "        const next=asMap(data);twin.terrain=next;\n"
    "        if(twin.capabilities&&typeof twin.capabilities==='object')twin.capabilities.terrain=next.available===true;\n"
    "        if(twin.enrichment_queued&&typeof twin.enrichment_queued==='object')twin.enrichment_queued.terrain=next.queued===true;\n"
    "        renderTwin();\n"
    "        if(next.available===true||next.sample_status==='NO_DATA'||next.sample_status==='INVALID')return;\n"
    "      }\n"
    "    }\n\n"
)
s = s.replace(marker, terrain_refresh + marker, 1)

replace_once(
    "async function maybeLoadDeepLink(){if(!await requireSession())return;const id=new URL(location.href).searchParams.get('property');if(!id)return;showLoading(true);const {data,error}=await sb.rpc('bridgepoint_property_twin_v918',{p_property_id:id});showLoading(false);if(error)return;twin=asMap(data);currentRow={property_id:id,state_code:twin.state_code};$('title').textContent=`Property Twin • ${id.slice(0,8)}`;$('subtitle').textContent=`${clean(twin.state_code,'')} • direct authenticated property workspace`;workspace.hidden=false;renderTwin()}",
    "async function maybeLoadDeepLink(){if(!await requireSession())return;const id=new URL(location.href).searchParams.get('property');if(!id)return;showLoading(true);const {data,error}=await sb.rpc('bridgepoint_property_twin_v918',{p_property_id:id});showLoading(false);if(error)return;twin=asMap(data);currentRow={property_id:id,state_code:twin.state_code};$('title').textContent=`Property Twin • ${id.slice(0,8)}`;$('subtitle').textContent=`${clean(twin.state_code,'')} • direct authenticated property workspace`;workspace.hidden=false;renderTwin();scheduleTerrainRefresh(id)}",
    'deep-link-refresh',
)

for required in ('bridgepoint_property_terrain_v931','terrainMetric','priority enrichment queued','USGS 3DEP terrain elevation'):
    if required not in s:
        raise SystemExit(f'V933 terrain UI contract missing: {required}')

path.write_text(s, encoding='utf-8')
release = {
    'version': 933,
    'surface': 'property-twin',
    'compatibility_release': 922,
    'backend_contract': 'bridgepoint_property_twin_v918',
    'terrain_contract': 'bridgepoint_property_terrain_v931',
    'terrain_source': 'USGS_3DEP_V918',
    'terrain_priority_lane': 'bridgepoint-usgs-3dep-priority-v931',
    'terrain_truth': '3DEP terrain DEM; not represented as surveyed spot elevation or raw point-cloud measurement',
    'search_contract': 'bridgepoint_property_suggestions_v192',
    'auth': 'supabase-user-session-rls',
    'source_repo_private': True,
    'private_source_exposed': False,
    'automatic_fidelity_upgrade': True,
}
release_path.write_text(json.dumps(release, indent=2) + '\n', encoding='utf-8')
print('V933 Property Twin terrain patch applied successfully')
