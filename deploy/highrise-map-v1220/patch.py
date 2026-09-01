from pathlib import Path

ROOT = Path('site/app')
MAP = ROOT / 'map-radar-v974.js'
LAZY = ROOT / 'lazy-runtime-v1000.js'
INDEX = ROOT / 'index.html'


def replace_between(text: str, start: str, end: str, replacement: str) -> str:
    a = text.find(start)
    if a < 0:
        raise SystemExit(f'missing start anchor: {start}')
    b = text.find(end, a)
    if b < 0:
        raise SystemExit(f'missing end anchor: {end}')
    return text[:a] + replacement + text[b:]


s = MAP.read_text(encoding='utf-8')

if 'window.__bridgepointHighriseMapV1220=true;' not in s:
    anchor = '  window.__bridgepointMapLabelsV1040=true;'
    if anchor not in s:
        raise SystemExit('map release marker missing')
    s = s.replace(anchor, anchor + '\n  window.__bridgepointHighriseMapV1220=true;', 1)

s = replace_between(
    s,
    '  const filterDefs=',
    '\n  let leafletPromise',
    "  const filterDefs=[['all','All'],['hail','Hail'],['tornado','Tornado'],['wildfire','Wildfire'],['hurricane','Hurricane'],['rain','Rain'],['flood','Flood'],['water','Water / leaks'],['mold','Mold'],['structural','Structural'],['heat','Heat'],['wind','Wind'],['lightning','Lightning'],['snow','Snow / ice'],['fire','Fire'],['roof','Roofing'],['permit','Permits'],['transfer','Transfers'],['solar','Solar']];"
)

old_decl = "framesVerified=false;"
if 'intelSeq=0,intelTimer=null' not in s:
    if old_decl not in s:
        raise SystemExit('map state declaration missing')
    s = s.replace(old_decl, "framesVerified=false,intelSeq=0,intelTimer=null;", 1)

if 'bp1220-group-marker-style' not in s:
    anchor = '`;document.head.appendChild(css);'
    if anchor not in s:
        raise SystemExit('map CSS append anchor missing')
    addon = "`;document.head.appendChild(css);const bp1220Style=document.createElement('style');bp1220Style.id='bp1220-group-marker-style';bp1220Style.textContent='#bp974-map-dialog .intel-marker[data-count]{position:relative;overflow:visible}#bp974-map-dialog .intel-marker[data-count]:after{content:attr(data-count);position:absolute;right:-9px;top:-9px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;display:grid;place-items:center;background:#071322;border:1px solid rgba(255,255,255,.5);color:#fff;font:900 9px/1 system-ui;box-shadow:0 3px 9px rgba(0,0,0,.45)}';document.head.appendChild(bp1220Style);"
    s = s.replace(anchor, addon, 1)

s = replace_between(
    s,
    '  function kind(row){',
    '  const glyph=',
    """  function kind(row){const s=textOf(row);if(/mold|fungal|microbial/.test(s))return'mold';if(/leak|water damage|water intrusion|plumb|burst pipe|pipe burst|sewer backup|sprinkler discharge/.test(s))return'water';if(/structural|foundation|collapse|settlement|crack/.test(s))return'structural';if(/heat index|excessive heat|extreme heat|heat wave|thermal stress/.test(s))return'heat';if(/hail/.test(s))return'hail';if(/tornado|twister/.test(s))return'tornado';if(/wildfire|brush fire|forest fire/.test(s))return'wildfire';if(/hurricane|tropical cyclone|tropical storm/.test(s))return'hurricane';if(/lightning/.test(s))return'lightning';if(/snow|ice storm|winter weather|blizzard|freez/.test(s))return'snow';if(/flood|fema|storm surge|inundat/.test(s))return'flood';if(/rain|precip/.test(s))return'rain';if(/wind|gust/.test(s))return'wind';if(/fire|smoke/.test(s))return'fire';if(/roof/.test(s))return'roof';if(/permit|construct|develop|building change/.test(s))return'permit';if(/transfer|sale|ownership|probate|foreclos|invest/.test(s))return'transfer';if(/solar/.test(s))return'solar';return'other';}\n"""
)

s = replace_between(
    s,
    '  const glyph=',
    '  function match(row)',
    "  const glyph=k=>({hail:'🧊',tornado:'🌪️',wildfire:'🔥',hurricane:'🌀',rain:'🌧️',flood:'🌊',water:'💧',mold:'◉',structural:'⌂',heat:'♨',wind:'💨',lightning:'⚡',snow:'❄️',fire:'🔥',roof:'🏠',permit:'🏗️',transfer:'🔑',solar:'☀️',other:'●'}[k]||'●');\n"
)

s = replace_between(
    s,
    '  function renderIntel(){',
    '  function oppPopup(row){',
    """  function markerCount(row,isSignal=false){const vals=isSignal?[row.signal_count,row.affected_units,row.affected_properties]:[row.opportunity_count,row.affected_unit_count,row.property_count];return Math.max(1,...vals.map(v=>Number(v||0)));}\n  function renderIntel(){if(!window.L)return;opportunityLayer?.clearLayers();signalLayer?.clearLayers();if(oppsOn)for(const row of latestOpps){if(!match(row))continue;const lat=Number(row.latitude),lng=Number(row.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;const k=kind(row),count=markerCount(row,false),badge=count>1?` data-count="${count>999?'999+':count}"`:'',html=`<div class="intel-marker ${priority(row)}"${badge} title="${esc(k)}">${glyph(k)}</div>`;const m=L.marker([lat,lng],{icon:L.divIcon({className:'',html,iconSize:[34,34],iconAnchor:[17,17]})});m.bindPopup(oppPopup(row),{maxWidth:390});m.on('click',()=>loadOppDetail(row,m));m.addTo(opportunityLayer);}if(signalsOn)for(const row of latestSignals){if(!match(row))continue;const lat=Number(row.latitude),lng=Number(row.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;const k=kind(row),count=markerCount(row,true),badge=count>1?` data-count="${count>999?'999+':count}"`:'',html=`<div class="intel-marker signal"${badge} title="${esc(k)}">${glyph(k)}</div>`;const m=L.marker([lat,lng],{icon:L.divIcon({className:'',html,iconSize:[27,27],iconAnchor:[13,13]})});m.bindPopup(signalPopup(row),{maxWidth:390});m.on('click',()=>loadSignalDetail(row,m));m.addTo(signalLayer);}}\n"""
)

s = replace_between(
    s,
    '  function oppPopup(row){',
    '  function stateClass(row){',
    """  function scopeLabel(row){if(String(row.entity_scope||'').toUpperCase()==='UNIT')return `Unit ${esc(row.unit_designator||'—')}`;if(String(row.entity_scope||'').toUpperCase()==='STRUCTURE')return'Building / structure scope';return'Property scope';}\n  function oppPopup(row){const units=Number(row.affected_unit_count||0),props=Number(row.property_count||1),opps=Number(row.opportunity_count||1);return `<div class="popup"><div class="tag">Opportunity group • ${esc(row.priority||'ranked')} • ${esc(row.score??'—')}/100</div><h3>${esc(row.title||'BridgePoint opportunity')}</h3><p><b>${esc(row.full_address||'Property / building')}</b><br>${esc(row.municipality||'')} ${esc(row.state_code||'')}</p><p>${esc(row.explanation||'BridgePoint grouped qualifying intelligence at the building/address level to prevent overlapping high-rise pins.')}</p><p><b>Matched properties:</b> ${props} · <b>Affected units identified:</b> ${units} · <b>Grouped opportunities:</b> ${opps}</p><p><b>Direct sources on top match:</b> ${esc(row.direct_source_count||0)} · <b>Direct signals:</b> ${esc(row.direct_signal_count||0)}</p><p class="limit">Opening this marker loads exact property/unit rows. A unit-scoped event applies only to that unit. Building/structure scope does not by itself prove every unit is affected.</p></div>`;}\n  function signalPopup(row){const units=Number(row.affected_units||0),props=Number(row.affected_properties||1),signals=Number(row.signal_count||1);return `<div class="popup"><div class="tag">Signal group • ${esc(kind(row))}</div><h3>${esc(row.title||row.signal_name||'BridgePoint signal')}</h3><p><b>${esc(row.full_address||'Property / building')}</b><br>${esc(row.municipality||'')} ${esc(row.state_code||'')}</p><p><b>Signals:</b> ${signals} · <b>Matched properties:</b> ${props} · <b>Affected units identified:</b> ${units}</p><p><b>Unit-scoped:</b> ${esc(row.unit_scoped_signals||0)} · <b>Building/property-scoped:</b> ${esc(row.building_or_property_signals||0)}</p><p><b>Severity:</b> ${esc(row.severity||'—')} · <b>Confidence:</b> ${esc(row.confidence||'—')}</p><p class="limit">Opening this marker loads the exact rendered signals and their entity scope. Shared coordinates are grouped for display; scope is not inferred from pin overlap.</p></div>`;}\n  function detailRows(rows,type,total){const list=(Array.isArray(rows)?rows:[]).slice(0,12);const body=list.map(r=>{const scope=scopeLabel(r);if(type==='opportunity')return `<p><b>${scope}</b> — ${esc(r.title||'Opportunity')} · ${esc(r.score??'—')}/100<br><span>${esc(r.full_address||'')}</span><br><span>${esc(r.direct_source_count||0)} direct source(s) · ${esc(r.direct_signal_count||0)} direct signal(s)</span></p>`;return `<p><b>${scope}</b> — ${esc(r.title||r.signal_name||'Signal')}<br><span>${esc(r.full_address||'')}</span><br><span>Severity ${esc(r.severity||'—')} · Confidence ${esc(r.confidence||'—')}</span></p>`;}).join('');const more=Number(total||list.length)>list.length?`<p><b>+${Number(total)-list.length} more exact row(s)</b></p>`:'';return body+more;}\n  async function loadOppDetail(row,marker){if(!row?.building_group_key)return;const token=findToken();if(!token)return;try{marker.setPopupContent(oppPopup(row).replace('</div>',`<p><b>Loading exact unit/property detail…</b></p></div>`));const d=await rpc('bridgepoint_flutter_opportunity_building_detail_v1220',token,{p_state_code:currentState,p_building_group_key:row.building_group_key,p_model_key:'all',p_limit:100,p_offset:0});marker.setPopupContent(`<div class="popup"><div class="tag">Exact building / unit detail</div><h3>${esc(row.full_address||row.title||'Building')}</h3>${detailRows(d?.opportunities,'opportunity',d?.total_results)}<p class="limit">Unit rows stay unit-specific. Structure/property rows are shown separately; BridgePoint does not promote one unit event to the entire building without building-scoped evidence.</p></div>`);}catch(_){marker.setPopupContent(oppPopup(row));}}\n  async function loadSignalDetail(row,marker){if(!row?.building_group_key||!map)return;const token=findToken();if(!token)return;const b=map.getBounds();try{marker.setPopupContent(signalPopup(row).replace('</div>',`<p><b>Loading exact signal scope…</b></p></div>`));const d=await rpc('bridgepoint_flutter_signal_building_detail_v1220',token,{p_state_code:currentState,p_building_group_key:row.building_group_key,p_min_lat:b.getSouth(),p_max_lat:b.getNorth(),p_min_lng:b.getWest(),p_max_lng:b.getEast(),p_limit:300});marker.setPopupContent(`<div class="popup"><div class="tag">Exact signal scope</div><h3>${esc(row.full_address||row.title||'Building')}</h3>${detailRows(d?.signals,'signal',d?.returned_results)}<p class="limit">Scope identifies the matched unit, structure, or property. It is not a claim that every unit is affected.</p></div>`);}catch(_){marker.setPopupContent(signalPopup(row));}}\n"""
)

s = replace_between(
    s,
    '  async function loadIntel(){',
    '  function scheduleProperties(){',
    """  async function loadIntel(){const token=findToken();const seq=++intelSeq;if(!token||!map||map.getZoom()<6||currentState==='US'){latestOpps=[];latestSignals=[];renderIntel();return;}const row=catalog.find(x=>String(x.state_code||'').toUpperCase()===currentState);if(row&&row.has_access===false){latestOpps=[];latestSignals=[];renderIntel();return;}try{loading(true,`Loading ${currentState} building intelligence…`);const b=map.getBounds();const [opps,sigs]=await Promise.allSettled([feature('opportunities')?rpc('bridgepoint_flutter_opportunity_building_map_v1220',token,{p_state_code:currentState,p_model_key:'all',p_min_lat:b.getSouth(),p_max_lat:b.getNorth(),p_min_lng:b.getWest(),p_max_lng:b.getEast(),p_limit:300,p_priority:null,p_stage:null}):Promise.resolve({opportunities:[]}),feature('signals')?rpc('bridgepoint_flutter_signal_map_buildings_v1220',token,{p_state_code:currentState,p_min_lat:b.getSouth(),p_max_lat:b.getNorth(),p_min_lng:b.getWest(),p_max_lng:b.getEast(),p_limit:220}):Promise.resolve({markers:[]})]);if(seq!==intelSeq)return;latestOpps=opps.status==='fulfilled'&&Array.isArray(opps.value?.opportunities)?opps.value.opportunities:[];latestSignals=sigs.status==='fulfilled'&&Array.isArray(sigs.value?.markers)?sigs.value.markers:[];renderIntel();}finally{if(seq===intelSeq)loading(false);}}\n  function scheduleIntel(){clearTimeout(intelTimer);intelTimer=setTimeout(loadIntel,170);}\n"""
)

s = replace_between(
    s,
    '  async function loadProperties(){',
    '  function goState(code){',
    """  async function loadProperties(){if(!propsOn||!map||map.getZoom()<4||!feature('property_profiles')){propertyLayer?.clearLayers();return;}const token=findToken();if(!token)return;const b=map.getBounds();try{const data=await rpc('bridgepoint_flutter_property_map_buildings_v1220',token,{p_min_lat:b.getSouth(),p_max_lat:b.getNorth(),p_min_lng:b.getWest(),p_max_lng:b.getEast(),p_limit:map.getZoom()<=4?180:map.getZoom()<=6?300:500});propertyLayer.clearLayers();for(const row of (Array.isArray(data?.markers)?data.markers:[])){const lat=Number(row.latitude),lng=Number(row.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;const pc=Number(row.property_count||1),uc=Number(row.unit_count||0);L.circleMarker([lat,lng],{radius:map.getZoom()<=4?2.2:map.getZoom()<=6?3:4,color:'#fff',weight:1,fillColor:'#48e1ff',fillOpacity:.68}).bindPopup(`<div class="popup"><div class="tag">Property / building</div><h3>${esc(row.full_address||'Property')}</h3><p>${esc(row.municipality||'')} ${esc(row.state_code||'')} · ${esc(row.property_type||'')}</p><p><b>Canonical properties grouped:</b> ${pc}${uc?` · <b>Units identified:</b> ${uc}`:''}</p><p class="limit">This neutral layer is grouped to avoid condo/high-rise pin stacks. A property dot alone does not mean damage or an opportunity.</p></div>`).addTo(propertyLayer);}}catch(_){} }\n"""
)

s = replace_between(
    s,
    '  function goState(code){',
    '  function stateFromCenter(lat,lng){',
    """  function goState(code){currentState=code;dialog.querySelector('[data-state]').value=code;if(code==='US'){intelSeq++;latestOpps=[];latestSignals=[];renderIntel();map.setView([39.4,-98.3],4);scheduleProperties();return;}const c=centers[code]||[39.4,-98.3];map.setView(c,8);scheduleIntel();scheduleProperties();}\n"""
)

old_event = "map.on('moveend zoomend',()=>{const c=map.getCenter(),s=stateFromCenter(c.lat,c.lng);if(map.getZoom()>=6&&s!==currentState){currentState=s;dialog.querySelector('[data-state]').value=s;loadIntel();}scheduleProperties();});"
new_event = "map.on('moveend zoomend',()=>{const c=map.getCenter(),s=stateFromCenter(c.lat,c.lng);if(map.getZoom()>=6&&s!==currentState){currentState=s;dialog.querySelector('[data-state]').value=s;}scheduleIntel();scheduleProperties();});"
if old_event in s:
    s = s.replace(old_event, new_event, 1)
elif new_event not in s:
    raise SystemExit('map move/zoom listener anchor missing')

MAP.write_text(s, encoding='utf-8')

lazy = LAZY.read_text(encoding='utf-8')
if "const V='1220';" not in lazy:
    if "const V='1001';" not in lazy:
        raise SystemExit('lazy runtime version anchor missing')
    lazy = lazy.replace("const V='1001';", "const V='1220';\nwindow.__bridgepointHighriseLazyV1220=true;", 1)
LAZY.write_text(lazy, encoding='utf-8')

idx = INDEX.read_text(encoding='utf-8')
idx = idx.replace('lazy-runtime-v1000.js?v=1066', 'lazy-runtime-v1000.js?v=1220')
if 'lazy-runtime-v1000.js?v=1220' not in idx:
    raise SystemExit('app index lazy runtime cache bust missing')
INDEX.write_text(idx, encoding='utf-8')
