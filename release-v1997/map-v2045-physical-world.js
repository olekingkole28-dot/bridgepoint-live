(()=>{
'use strict';
if(window.__bridgepointPhysicalWorldV2055)return;
window.__bridgepointPhysicalWorldV2055=true;
window.__bridgepointPhysicalWorldV2045=true;
const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const RPC=`${SUPA}/rest/v1/rpc/bridgepoint_live_map_weather_scene_v1997`;
const AUTH_KEYS=['sb-xdfsjztwgsbmabshzsjw-auth-token','bp-homepage-auth-v1990','bp-homepage-auth-v1992'];
const EMPTY={type:'FeatureCollection',features:[]};
const P={installed:false,timer:0,raf:0,seq:0,busy:false,events:[],layers:[],canvas:null,ctx:null,map:null,flags:{lightning:true,outage:true,flood:true,snow:true,ice:true,fireweather:true,severe:true}};
const $=(s,r=document)=>r.querySelector(s);
function deepSession(v,seen=new Set()){if(!v||seen.has(v))return null;if(typeof v==='object'){seen.add(v);if(typeof v.access_token==='string')return v;for(const x of Object.values(v)){const f=deepSession(x,seen);if(f)return f}}return null}
function session(){for(const k of AUTH_KEYS){try{const s=deepSession(JSON.parse(localStorage.getItem(k)||'null'));if(s?.access_token)return s}catch(_){}}return null}
function geo(v){if(!v)return null;if(typeof v==='string'){try{return JSON.parse(v)}catch(_){return null}}return v?.type?v:null}
function geom(e){const g=geo(e.geometry_geojson);if(g)return g;const lon=Number(e.longitude),lat=Number(e.latitude);return Number.isFinite(lon)&&Number.isFinite(lat)?{type:'Point',coordinates:[lon,lat]}:null}
function upper(v){return String(v||'').toUpperCase()}
function props(e){return e&&typeof e.properties==='object'&&e.properties?e.properties:{}}
function meta(e){return e&&typeof e.render_metadata==='object'&&e.render_metadata?e.render_metadata:{}}
function ageMinutes(e){const raw=e.observed_at||e.source_updated_at||e.last_seen_at||e.starts_at;const t=raw?new Date(raw).getTime():NaN;return Number.isFinite(t)?Math.max(0,(Date.now()-t)/60000):999999}
function observed(e){const k=upper(e.observation_kind),m=upper(e.effect_mode);return m.startsWith('OBSERVED_')||['OBSERVED','OBSERVED_INCIDENT','OBSERVED_RADAR','OBSERVED_REPORT','CURRENT_STORM','SATELLITE_DETECTION'].includes(k)}
function depthInfo(e){const a=props(e),b=meta(e);for(const v of [a.water_depth_m,a.depth_m,a.inundation_depth_m,a.stage_above_flood_m,b.water_depth_m,b.depth_m,b.inundation_depth_m,b.stage_above_flood_m]){const n=Number(v);if(Number.isFinite(n)&&n>0)return{supported:1,meters:Math.min(n,20)}}return{supported:0,meters:0}}
function feature(e,kind){const g=geom(e);if(!g)return null;const d=depthInfo(e);return{type:'Feature',geometry:g,properties:{id:e.hazard_event_id||'',kind,hazard_type:e.hazard_type||kind,severity:e.severity||'',headline:e.headline||e.event_name||'',effect_mode:e.effect_mode||'',observation_kind:e.observation_kind||'',render_primitive:e.render_primitive||'',observed:observed(e)?1:0,recent:ageMinutes(e)<=45?1:0,depth_supported:d.supported,depth_m:d.meters,truth_rule:e.truth_rule||'',last_seen_at:e.last_seen_at||''}}}
const tests={
 lightning:h=>/LIGHTNING|GLM/.test(h),
 outage:h=>/POWER_OUTAGE|GRID_OUTAGE|OUTAGE/.test(h),
 flood:h=>/FLASH_FLOOD|COASTAL_FLOOD|FLOOD|INUNDATION|RIVER_STAGE/.test(h),
 snow:h=>/SNOW|BLIZZARD|LAKE_EFFECT|WINTER_STORM|WINTER_WEATHER/.test(h),
 ice:h=>/ICE|FREEZING_RAIN|SLEET|FREEZING_DRIZZLE/.test(h),
 fireweather:h=>/FIRE_WEATHER|RED_FLAG/.test(h),
 severe:h=>/SEVERE_WEATHER/.test(h)
};
function fcFor(kind){const out=[];for(const e of P.events){const h=upper(`${e.hazard_type||''} ${e.event_name||''} ${e.headline||''}`);if(tests[kind]?.(h)){const f=feature(e,kind);if(f)out.push(f)}}return{type:'FeatureCollection',features:out}}
function addSource(id){if(!P.map.getSource(id))P.map.addSource(id,{type:'geojson',data:EMPTY})}
function safeAdd(layer){if(!P.map.getLayer(layer.id))P.map.addLayer(layer)}
function setVis(id,on){try{if(P.map?.getLayer(id))P.map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}}
function setupLayers(){
 ['lightning','outage','flood','snow','ice','fireweather','severe'].forEach(k=>addSource(`bp2055-${k}`));
 safeAdd({id:'bp2055-lightning-halo',type:'circle',source:'bp2055-lightning',filter:['==',['geometry-type'],'Point'],paint:{'circle-color':'#fff6a8','circle-radius':['interpolate',['linear'],['zoom'],3,4,12,8,18,13],'circle-blur':.55,'circle-opacity':['case',['==',['get','observed'],1],.85,.3]}});
 safeAdd({id:'bp2055-lightning-core',type:'circle',source:'bp2055-lightning',filter:['==',['geometry-type'],'Point'],paint:{'circle-color':'#ffffff','circle-radius':['interpolate',['linear'],['zoom'],3,1.5,12,3.2,18,5],'circle-stroke-color':'#ffd85d','circle-stroke-width':1.2,'circle-opacity':['case',['==',['get','observed'],1],1,.45]}});
 safeAdd({id:'bp2055-outage-fill',type:'fill',source:'bp2055-outage',filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],paint:{'fill-color':'#ff4e68','fill-opacity':.16}});
 safeAdd({id:'bp2055-outage-line',type:'line',source:'bp2055-outage',paint:{'line-color':'#ff7a8e','line-width':2.4,'line-opacity':.9}});
 safeAdd({id:'bp2055-outage-point',type:'circle',source:'bp2055-outage',filter:['==',['geometry-type'],'Point'],paint:{'circle-color':'#ff536d','circle-radius':['interpolate',['linear'],['zoom'],3,4,13,7.5,18,11],'circle-stroke-color':'#ffd6dc','circle-stroke-width':1.4,'circle-opacity':.9}});
 safeAdd({id:'bp2055-flood-extent',type:'fill',source:'bp2055-flood',filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],paint:{'fill-color':'#2f9cff','fill-opacity':['case',['==',['get','depth_supported'],1],.28,.18]}});
 safeAdd({id:'bp2055-flood-depth',type:'fill-extrusion',source:'bp2055-flood',filter:['all',['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],['==',['get','depth_supported'],1]],paint:{'fill-extrusion-color':'#4ab4ff','fill-extrusion-height':['get','depth_m'],'fill-extrusion-base':0,'fill-extrusion-opacity':.48}});
 safeAdd({id:'bp2055-flood-line',type:'line',source:'bp2055-flood',paint:{'line-color':'#77c9ff','line-width':2,'line-opacity':.9}});
 safeAdd({id:'bp2055-snow-fill',type:'fill',source:'bp2055-snow',filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],paint:{'fill-color':'#dff8ff','fill-opacity':['case',['==',['get','observed'],1],.22,.10]}});
 safeAdd({id:'bp2055-snow-line',type:'line',source:'bp2055-snow',paint:{'line-color':'#e9fdff','line-width':['case',['==',['get','observed'],1],3,1.8],'line-opacity':.9,'line-dasharray':[2,1]}});
 safeAdd({id:'bp2055-snow-point',type:'circle',source:'bp2055-snow',filter:['==',['geometry-type'],'Point'],paint:{'circle-color':'#f6ffff','circle-radius':['interpolate',['linear'],['zoom'],4,4,14,8],'circle-stroke-color':'#aeeeff','circle-stroke-width':1.5,'circle-opacity':.9}});
 safeAdd({id:'bp2055-ice-fill',type:'fill',source:'bp2055-ice',filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],paint:{'fill-color':'#82cfff','fill-opacity':['case',['==',['get','observed'],1],.25,.11]}});
 safeAdd({id:'bp2055-ice-line',type:'line',source:'bp2055-ice',paint:{'line-color':'#b8f1ff','line-width':['case',['==',['get','observed'],1],3.2,1.9],'line-opacity':.92}});
 safeAdd({id:'bp2055-ice-point',type:'circle',source:'bp2055-ice',filter:['==',['geometry-type'],'Point'],paint:{'circle-color':'#b9eeff','circle-radius':['interpolate',['linear'],['zoom'],4,4,14,8],'circle-stroke-color':'#ffffff','circle-stroke-width':1.4,'circle-opacity':.95}});
 safeAdd({id:'bp2055-fireweather-fill',type:'fill',source:'bp2055-fireweather',filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],paint:{'fill-color':'#ff9a52','fill-opacity':.09}});
 safeAdd({id:'bp2055-fireweather-line',type:'line',source:'bp2055-fireweather',paint:{'line-color':'#ffad6b','line-width':2,'line-opacity':.85,'line-dasharray':[3,2]}});
 safeAdd({id:'bp2055-severe-fill',type:'fill',source:'bp2055-severe',filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],paint:{'fill-color':'#bd76ff','fill-opacity':.08}});
 safeAdd({id:'bp2055-severe-line',type:'line',source:'bp2055-severe',paint:{'line-color':'#d8a9ff','line-width':2,'line-opacity':.86}});
 try{if(P.map.getLayer('labels'))P.map.moveLayer('labels')}catch(_){ }
 applyVisibility();
}
function makeChip(id,label,key,parent){if($('#'+id))return;const b=document.createElement('button');b.id=id;b.className='chip'+(P.flags[key]?' active':'');b.textContent=label;b.onclick=()=>{P.flags[key]=!P.flags[key];b.classList.toggle('active',P.flags[key]);applyVisibility()};parent.appendChild(b)}
function injectUi(){
 const layers=$('.layer-scroll');if(layers){makeChip('bp2055Lightning','Lightning','lightning',layers);makeChip('bp2055Outages','Grid outages','outage',layers);makeChip('bp2055Flood','Flood extent','flood',layers);makeChip('bp2055Snow','Snow','snow',layers);makeChip('bp2055Ice','Ice','ice',layers);makeChip('bp2055FireWeather','Fire weather','fireweather',layers);makeChip('bp2055Severe','Severe reports','severe',layers)}
 const peril=$('.peril-scroll');if(peril){for(const [id,label,key] of [['bp2055SnowFilter','Snow','snow'],['bp2055IceFilter','Ice','ice'],['bp2055LightningFilter','Lightning','lightning']]){if($('#'+id))continue;const b=document.createElement('button');b.id=id;b.className='peril'+(P.flags[key]?' active':'');b.textContent=label;b.onclick=()=>{P.flags[key]=!P.flags[key];b.classList.toggle('active',P.flags[key]);const twin=$(`#bp2055${key==='outage'?'Outages':key[0].toUpperCase()+key.slice(1)}`);if(twin)twin.classList.toggle('active',P.flags[key]);applyVisibility()};peril.appendChild(b)}}
 const shell=$('.map-shell');if(shell&&!$('#bp2055FxCanvas')){const c=document.createElement('canvas');c.id='bp2055FxCanvas';Object.assign(c.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'4'});shell.appendChild(c);P.canvas=c;P.ctx=c.getContext('2d');resizeCanvas()}
}
function applyVisibility(){const groups={lightning:['bp2055-lightning-halo','bp2055-lightning-core'],outage:['bp2055-outage-fill','bp2055-outage-line','bp2055-outage-point'],flood:['bp2055-flood-extent','bp2055-flood-depth','bp2055-flood-line'],snow:['bp2055-snow-fill','bp2055-snow-line','bp2055-snow-point'],ice:['bp2055-ice-fill','bp2055-ice-line','bp2055-ice-point'],fireweather:['bp2055-fireweather-fill','bp2055-fireweather-line'],severe:['bp2055-severe-fill','bp2055-severe-line']};for(const [k,ids] of Object.entries(groups))for(const id of ids)setVis(id,!!P.flags[k])}
function resizeCanvas(){if(!P.canvas||!P.ctx)return;const shell=$('.map-shell');if(!shell)return;const r=shell.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);P.canvas.width=Math.max(1,Math.round(r.width*d));P.canvas.height=Math.max(1,Math.round(r.height*d));P.canvas.style.width=r.width+'px';P.canvas.style.height=r.height+'px';P.ctx.setTransform(d,0,0,d,0,0)}
async function load(){if(!P.map||P.busy)return;const s=session();if(!s)return;P.busy=true;const my=++P.seq;try{const b=P.map.getBounds();const body={p_min_lat:b.getSouth(),p_max_lat:b.getNorth(),p_min_lng:b.getWest(),p_max_lng:b.getEast(),p_limit:P.map.getZoom()<7?2800:2000};const r=await fetch(RPC,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body),cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d?.message||`HTTP ${r.status}`);if(my!==P.seq)return;P.events=Array.isArray(d.events)?d.events:[];P.layers=Array.isArray(d.continuous_layers)?d.continuous_layers:[];for(const k of Object.keys(P.flags)){const src=P.map.getSource(`bp2055-${k}`);if(src&&tests[k])src.setData(fcFor(k))}window.__bp2055PhysicalWorld={version:2055,scene_version:Number(d.version||0),events:P.events.length,continuous_layers:P.layers,counts:Object.fromEntries(Object.keys(tests).map(k=>[k,fcFor(k).features.length])),truth_notice:d.truth_notice||'',winter_truth:'Snow/ice alert polygons are contextual. Falling snow and ice sheen animate only for recent observed evidence.'};}catch(e){console.warn('BridgePoint V2055 physical-world overlay',e)}finally{P.busy=false}}
function schedule(ms=180){clearTimeout(P.timer);P.timer=setTimeout(load,ms)}
function centerOf(g){if(!g)return null;if(g.type==='Point')return g.coordinates;const a=[];const walk=v=>{if(Array.isArray(v)&&typeof v[0]==='number'&&typeof v[1]==='number')a.push(v);else if(Array.isArray(v))v.forEach(walk)};walk(g.coordinates);if(!a.length)return null;return[a.reduce((s,p)=>s+p[0],0)/a.length,a.reduce((s,p)=>s+p[1],0)/a.length]}
function drawSnow(ctx,f,i,t){const q=centerOf(f.geometry);if(!q)return;const sp=P.map.project(q);for(let k=0;k<9;k++){const phase=(t*(18+(k%4)*3)+i*23+k*31)%90;const x=sp.x-42+((i*17+k*29)%84)+Math.sin(t*1.6+k)*7;const y=sp.y-50+phase;const r=1.4+(k%3)*.55;ctx.globalAlpha=.82;ctx.fillStyle='#f5feff';ctx.shadowBlur=5;ctx.shadowColor='#bdeeff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}ctx.shadowBlur=0}
function drawIce(ctx,f,i,t){const q=centerOf(f.geometry);if(!q)return;const sp=P.map.project(q),pulse=.25+.35*(.5+.5*Math.sin(t*4+i));ctx.globalAlpha=pulse;ctx.strokeStyle='#dffcff';ctx.lineWidth=1.4;ctx.shadowBlur=10;ctx.shadowColor='#8edbff';for(let k=0;k<4;k++){const a=t*.35+k*Math.PI/2+i*.2,r=10+k*5,x=sp.x+Math.cos(a)*r,y=sp.y+Math.sin(a)*r;ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke()}ctx.shadowBlur=0}
function draw(){const ctx=P.ctx,c=P.canvas;if(!ctx||!c||!P.map){P.raf=requestAnimationFrame(draw);return}const w=c.clientWidth,h=c.clientHeight,t=performance.now()/1000;ctx.clearRect(0,0,w,h);
 if(P.flags.lightning){fcFor('lightning').features.filter(f=>f.properties.observed===1&&f.properties.recent===1).slice(0,70).forEach((f,i)=>{const q=centerOf(f.geometry);if(!q)return;const sp=P.map.project(q),phase=(t*1.8+i*.37)%2;if(phase>.22)return;ctx.globalAlpha=1-phase/.22;ctx.strokeStyle='#fffbe0';ctx.lineWidth=2;ctx.shadowBlur=12;ctx.shadowColor='#fff46b';ctx.beginPath();let x=sp.x,y=sp.y-28;ctx.moveTo(x,y);for(let k=0;k<5;k++){x+=((k%2)?-1:1)*(5+(i+k)%6);y+=11;ctx.lineTo(x,y)}ctx.stroke();ctx.shadowBlur=0})}
 if(P.flags.outage){fcFor('outage').features.slice(0,80).forEach((f,i)=>{const q=centerOf(f.geometry);if(!q)return;const sp=P.map.project(q),r=7+((t*18+i*3)%24);ctx.globalAlpha=Math.max(.08,1-r/34);ctx.strokeStyle='#ff647c';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(sp.x,sp.y,r,0,Math.PI*2);ctx.stroke()})}
 if(P.flags.snow){fcFor('snow').features.filter(f=>f.properties.observed===1&&f.properties.recent===1).slice(0,45).forEach((f,i)=>drawSnow(ctx,f,i,t))}
 if(P.flags.ice){fcFor('ice').features.filter(f=>f.properties.observed===1&&f.properties.recent===1).slice(0,45).forEach((f,i)=>drawIce(ctx,f,i,t))}
 ctx.globalAlpha=1;ctx.shadowBlur=0;P.raf=requestAnimationFrame(draw)}
function install(){const s=window.__bp97MapState;if(!s?.ready||!s.map){setTimeout(install,180);return}if(P.installed)return;P.installed=true;P.map=s.map;injectUi();setupLayers();P.map.on('moveend',()=>schedule(80));P.map.on('zoomend',()=>schedule(80));P.map.on('resize',resizeCanvas);window.addEventListener('resize',resizeCanvas,{passive:true});setInterval(()=>schedule(0),20000);schedule(0);draw()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();