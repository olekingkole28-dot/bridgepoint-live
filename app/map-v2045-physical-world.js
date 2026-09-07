(()=>{
'use strict';
if(window.__bridgepointPhysicalWorldV2045)return;window.__bridgepointPhysicalWorldV2045=true;
const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const RPC=`${SUPA}/rest/v1/rpc/bridgepoint_live_map_weather_scene_v1997`;
const AUTH_KEYS=['sb-xdfsjztwgsbmabshzsjw-auth-token','bp-homepage-auth-v1990','bp-homepage-auth-v1992'];
const EMPTY={type:'FeatureCollection',features:[]};
const P={installed:false,timer:0,raf:0,seq:0,busy:false,lightning:true,outages:true,flood:true,events:[],layers:[],canvas:null,ctx:null,map:null};
const $=(s,r=document)=>r.querySelector(s);
function deepSession(v,seen=new Set()){if(!v||seen.has(v))return null;if(typeof v==='object'){seen.add(v);if(typeof v.access_token==='string')return v;for(const x of Object.values(v)){const f=deepSession(x,seen);if(f)return f}}return null}
function session(){for(const k of AUTH_KEYS){try{const s=deepSession(JSON.parse(localStorage.getItem(k)||'null'));if(s?.access_token)return s}catch(_){}}return null}
function geo(v){if(!v)return null;if(typeof v==='string'){try{return JSON.parse(v)}catch(_){return null}}return v?.type?v:null}
function pointGeometry(e){let g=geo(e.geometry_geojson);if(g)return g;const lon=Number(e.longitude),lat=Number(e.latitude);return Number.isFinite(lon)&&Number.isFinite(lat)?{type:'Point',coordinates:[lon,lat]}:null}
function upper(v){return String(v||'').toUpperCase()}
function props(e){return e&&typeof e.properties==='object'&&e.properties?e.properties:{}}
function renderMeta(e){return e&&typeof e.render_metadata==='object'&&e.render_metadata?e.render_metadata:{} }
function depthInfo(e){const a=props(e),b=renderMeta(e);const candidates=[a.water_depth_m,a.depth_m,a.inundation_depth_m,a.stage_above_flood_m,b.water_depth_m,b.depth_m,b.inundation_depth_m,b.stage_above_flood_m];for(const v of candidates){const n=Number(v);if(Number.isFinite(n)&&n>0)return{supported:1,meters:Math.min(n,20)}}return{supported:0,meters:0}}
function feature(e,kind){const g=pointGeometry(e);if(!g)return null;const d=depthInfo(e);return{type:'Feature',geometry:g,properties:{id:e.hazard_event_id||'',kind,hazard_type:e.hazard_type||kind,severity:e.severity||'',headline:e.headline||e.event_name||'',effect_mode:e.effect_mode||'',render_primitive:e.render_primitive||'',observed:String(e.effect_mode||'').startsWith('OBSERVED_')||upper(e.observation_kind)==='SATELLITE_DETECTION'?1:0,depth_supported:d.supported,depth_m:d.meters,truth_rule:e.truth_rule||'',last_seen_at:e.last_seen_at||''}}}
function fcFor(kind){const out=[];for(const e of P.events){const h=upper(e.hazard_type||e.event_name||e.headline);let ok=false;if(kind==='lightning')ok=/LIGHTNING|GLM/.test(h);else if(kind==='outage')ok=/POWER_OUTAGE|GRID_OUTAGE|OUTAGE/.test(h);else if(kind==='flood')ok=/FLOOD|INUNDATION|RIVER_STAGE/.test(h);if(ok){const f=feature(e,kind);if(f)out.push(f)}}return{type:'FeatureCollection',features:out}}
function addSource(id){if(!P.map.getSource(id))P.map.addSource(id,{type:'geojson',data:EMPTY})}
function safeAdd(layer){if(!P.map.getLayer(layer.id))P.map.addLayer(layer)}
function setVis(id,on){try{if(P.map?.getLayer(id))P.map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}}
function setupLayers(){
  addSource('bp2045-lightning');addSource('bp2045-outage');addSource('bp2045-flood');
  safeAdd({id:'bp2045-lightning-halo',type:'circle',source:'bp2045-lightning',filter:['==',['geometry-type'],'Point'],paint:{'circle-color':'#fff6a8','circle-radius':['interpolate',['linear'],['zoom'],3,4,12,8,18,13],'circle-blur':.55,'circle-opacity':['case',['==',['get','observed'],1],.85,.3]}});
  safeAdd({id:'bp2045-lightning-core',type:'circle',source:'bp2045-lightning',filter:['==',['geometry-type'],'Point'],paint:{'circle-color':'#ffffff','circle-radius':['interpolate',['linear'],['zoom'],3,1.5,12,3.2,18,5],'circle-stroke-color':'#ffd85d','circle-stroke-width':1.2,'circle-opacity':['case',['==',['get','observed'],1],1,.45]}});
  safeAdd({id:'bp2045-outage-fill',type:'fill',source:'bp2045-outage',filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],paint:{'fill-color':'#ff4e68','fill-opacity':.16}});
  safeAdd({id:'bp2045-outage-line',type:'line',source:'bp2045-outage',paint:{'line-color':'#ff7a8e','line-width':2.4,'line-opacity':.9}});
  safeAdd({id:'bp2045-outage-point',type:'circle',source:'bp2045-outage',filter:['==',['geometry-type'],'Point'],paint:{'circle-color':'#ff536d','circle-radius':['interpolate',['linear'],['zoom'],3,4,13,7.5,18,11],'circle-stroke-color':'#ffd6dc','circle-stroke-width':1.4,'circle-opacity':.9}});
  safeAdd({id:'bp2045-flood-extent',type:'fill',source:'bp2045-flood',filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],paint:{'fill-color':'#2f9cff','fill-opacity':['case',['==',['get','depth_supported'],1],.28,.18]}});
  safeAdd({id:'bp2045-flood-depth',type:'fill-extrusion',source:'bp2045-flood',filter:['all',['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],['==',['get','depth_supported'],1]],paint:{'fill-extrusion-color':'#4ab4ff','fill-extrusion-height':['get','depth_m'],'fill-extrusion-base':0,'fill-extrusion-opacity':.48}});
  safeAdd({id:'bp2045-flood-line',type:'line',source:'bp2045-flood',paint:{'line-color':'#77c9ff','line-width':2,'line-opacity':.9}});
  try{if(P.map.getLayer('labels'))P.map.moveLayer('labels')}catch(_){ }
  applyVisibility();
}
function injectUi(){
  const scroller=$('.layer-scroll');if(scroller&&!$('#bp2045Lightning')){
    const make=(id,label,on)=>{const b=document.createElement('button');b.id=id;b.className='chip'+(on?' active':'');b.textContent=label;return b};
    const l=make('bp2045Lightning','Lightning',P.lightning),o=make('bp2045Outages','Grid outages',P.outages),f=make('bp2045Flood','Flood extent',P.flood);
    scroller.append(l,o,f);
    l.onclick=()=>{P.lightning=!P.lightning;l.classList.toggle('active',P.lightning);applyVisibility()};
    o.onclick=()=>{P.outages=!P.outages;o.classList.toggle('active',P.outages);applyVisibility()};
    f.onclick=()=>{P.flood=!P.flood;f.classList.toggle('active',P.flood);applyVisibility()};
  }
  const shell=$('.map-shell');if(shell&&!$('#bp2045FxCanvas')){const c=document.createElement('canvas');c.id='bp2045FxCanvas';Object.assign(c.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'4'});shell.appendChild(c);P.canvas=c;P.ctx=c.getContext('2d');resizeCanvas()}
}
function applyVisibility(){for(const id of ['bp2045-lightning-halo','bp2045-lightning-core'])setVis(id,P.lightning);for(const id of ['bp2045-outage-fill','bp2045-outage-line','bp2045-outage-point'])setVis(id,P.outages);for(const id of ['bp2045-flood-extent','bp2045-flood-depth','bp2045-flood-line'])setVis(id,P.flood)}
function resizeCanvas(){if(!P.canvas||!P.ctx)return;const shell=$('.map-shell');if(!shell)return;const r=shell.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);P.canvas.width=Math.max(1,Math.round(r.width*d));P.canvas.height=Math.max(1,Math.round(r.height*d));P.canvas.style.width=r.width+'px';P.canvas.style.height=r.height+'px';P.ctx.setTransform(d,0,0,d,0,0)}
async function load(){if(!P.map||P.busy)return;const s=session();if(!s)return;P.busy=true;const my=++P.seq;try{const b=P.map.getBounds();const body={p_min_lat:b.getSouth(),p_max_lat:b.getNorth(),p_min_lng:b.getWest(),p_max_lng:b.getEast(),p_limit:P.map.getZoom()<7?2600:1800};const r=await fetch(RPC,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body),cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d?.message||`HTTP ${r.status}`);if(my!==P.seq)return;P.events=Array.isArray(d.events)?d.events:[];P.layers=Array.isArray(d.continuous_layers)?d.continuous_layers:[];P.map.getSource('bp2045-lightning')?.setData(fcFor('lightning'));P.map.getSource('bp2045-outage')?.setData(fcFor('outage'));P.map.getSource('bp2045-flood')?.setData(fcFor('flood'));window.__bp2045PhysicalWorld={version:Number(d.version||2045),events:P.events.length,continuous_layers:P.layers,lightning:fcFor('lightning').features.length,outages:fcFor('outage').features.length,flood:fcFor('flood').features.length,truth_notice:d.truth_notice||''};}catch(e){console.warn('BridgePoint V2045 physical-world overlay',e)}finally{P.busy=false}}
function schedule(ms=180){clearTimeout(P.timer);P.timer=setTimeout(load,ms)}
function centerOf(g){if(!g)return null;if(g.type==='Point')return g.coordinates;let a=[];const walk=v=>{if(Array.isArray(v)&&typeof v[0]==='number'&&typeof v[1]==='number')a.push(v);else if(Array.isArray(v))v.forEach(walk)};walk(g.coordinates);if(!a.length)return null;return[a.reduce((s,p)=>s+p[0],0)/a.length,a.reduce((s,p)=>s+p[1],0)/a.length]}
function draw(){const ctx=P.ctx,c=P.canvas;if(!ctx||!c||!P.map){P.raf=requestAnimationFrame(draw);return}const w=c.clientWidth,h=c.clientHeight,t=performance.now()/1000;ctx.clearRect(0,0,w,h);
  const lightning=P.lightning?fcFor('lightning').features.filter(f=>f.properties.observed===1).slice(0,70):[];
  lightning.forEach((f,i)=>{const q=centerOf(f.geometry);if(!q)return;const sp=P.map.project(q),phase=(t*1.8+i*.37)%2;if(phase>.22)return;ctx.globalAlpha=1-phase/.22;ctx.strokeStyle='#fffbe0';ctx.lineWidth=2;ctx.shadowBlur=12;ctx.shadowColor='#fff46b';ctx.beginPath();let x=sp.x,y=sp.y-28;ctx.moveTo(x,y);for(let k=0;k<5;k++){x+=((k%2)?-1:1)*(5+(i+k)%6);y+=11;ctx.lineTo(x,y)}ctx.stroke();ctx.shadowBlur=0});
  if(P.outages){fcFor('outage').features.slice(0,80).forEach((f,i)=>{const q=centerOf(f.geometry);if(!q)return;const sp=P.map.project(q),r=7+((t*18+i*3)%24);ctx.globalAlpha=Math.max(.08,1-r/34);ctx.strokeStyle='#ff647c';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(sp.x,sp.y,r,0,Math.PI*2);ctx.stroke()})}
  ctx.globalAlpha=1;P.raf=requestAnimationFrame(draw)}
function install(){const s=window.__bp97MapState;if(!s?.ready||!s.map){setTimeout(install,180);return}if(P.installed)return;P.installed=true;P.map=s.map;injectUi();setupLayers();P.map.on('moveend',()=>schedule(90));P.map.on('zoomend',()=>schedule(90));P.map.on('resize',resizeCanvas);window.addEventListener('resize',resizeCanvas,{passive:true});setInterval(()=>schedule(0),20000);schedule(0);draw();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();