(()=>{
'use strict';
if(window.__bridgepointRadarRestV1001)return;
window.__bridgepointRadarRestV1001=true;

const LEAFLET_JS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const IMAGE_SERVER='https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity_time/ImageServer';
const EXPORT=`${IMAGE_SERVER}/exportImage`;
const QUERY=`${IMAGE_SERVER}/query`;
let leafletPromise=null;
let catalogPromise=null;
let catalogLoadedAt=0;

function ensureLeaflet(){
  if(window.L)return Promise.resolve(window.L);
  if(leafletPromise)return leafletPromise;
  leafletPromise=new Promise((resolve,reject)=>{
    if(!document.querySelector(`link[href="${LEAFLET_CSS}"]`)){
      const l=document.createElement('link');l.rel='stylesheet';l.href=LEAFLET_CSS;document.head.appendChild(l);
    }
    const existing=[...document.scripts].find(s=>s.src===LEAFLET_JS);
    if(existing){existing.addEventListener('load',()=>resolve(window.L),{once:true});existing.addEventListener('error',reject,{once:true});return;}
    const s=document.createElement('script');s.src=LEAFLET_JS;s.async=true;s.onload=()=>resolve(window.L);s.onerror=reject;document.head.appendChild(s);
  });
  return leafletPromise;
}
function status(text,bad=false){
  const el=document.querySelector('#bp974-map-dialog [data-status]');
  if(!el)return;
  el.textContent=text;
  el.style.color=bad?'#ff9a9a':'#48e1ff';
}
function subsetForMap(map){
  try{
    const c=map.getCenter(),lat=Number(c.lat),lng=Number(c.lng);
    if(lat>=50&&lng<=-125)return'ALASKA';
    if(lat>=17&&lat<=24&&lng>=-162&&lng<=-153)return'HAWAII';
    if(lat>=12&&lat<=23&&lng>=-70&&lng<=-59)return'CARIB';
    if(lat>=10&&lat<=18&&lng>=140&&lng<=150)return'GUAM';
  }catch(_){}
  return'CONUS';
}
async function loadRadarCatalog(force=false){
  const fresh=Date.now()-catalogLoadedAt<180000;
  if(catalogPromise&&fresh&&!force)return catalogPromise;
  catalogPromise=(async()=>{
    const u=new URL(QUERY);
    u.searchParams.set('where','category = 1');
    u.searchParams.set('outFields','objectid,idp_validtime,idp_subset,name,category');
    u.searchParams.set('returnGeometry','false');
    u.searchParams.set('orderByFields','idp_validtime DESC');
    u.searchParams.set('resultRecordCount','1000');
    u.searchParams.set('f','json');
    const r=await fetch(u.toString(),{cache:'no-store'});
    if(!r.ok)throw new Error(`NOAA catalog ${r.status}`);
    const j=await r.json();
    const frames=(j.features||[]).map(x=>x?.attributes||{}).map(a=>({
      id:Number(a.objectid),
      time:Number(a.idp_validtime),
      subset:String(a.idp_subset||'').toUpperCase(),
      name:String(a.name||'')
    })).filter(x=>Number.isFinite(x.id)&&Number.isFinite(x.time)&&x.subset).sort((a,b)=>a.time-b.time);
    if(!frames.length)throw new Error('NOAA frame catalog empty');
    catalogLoadedAt=Date.now();
    return frames;
  })().catch(e=>{catalogPromise=null;throw e;});
  return catalogPromise;
}
function nearestFrame(frames,target,subset){
  if(!frames?.length||!Number.isFinite(target))return null;
  const scoped=frames.filter(f=>f.subset===subset);
  const source=scoped.length?scoped:frames;
  let best=source[source.length-1],dist=Math.abs(best.time-target);
  for(const f of source){const d=Math.abs(f.time-target);if(d<dist){best=f;dist=d;}}
  return best;
}
function installReliableRadar(){
  const L=window.L;
  if(!L||L.tileLayer.__bp1001RadarPatched)return;
  const originalWms=L.tileLayer.wms;
  const ReliableRadar=L.Layer.extend({
    options:{opacity:.84,attribution:'NOAA/NWS MRMS'},
    initialize(options){L.setOptions(this,options||{});this._time=null;this._frame=null;this._overlay=null;this._map=null;this._timer=null;this._seq=0;},
    onAdd(map){
      this._map=map;
      if(!map.getPane('bp1000RadarPane')){const p=map.createPane('bp1000RadarPane');p.style.zIndex='450';p.style.pointerEvents='none';}
      map.on('moveend zoomend resize',this.redraw,this);
      this.redraw();
    },
    onRemove(map){
      map.off('moveend zoomend resize',this.redraw,this);
      clearTimeout(this._timer);
      if(this._overlay&&map.hasLayer(this._overlay))map.removeLayer(this._overlay);
      this._overlay=null;this._map=null;
    },
    getAttribution(){return this.options.attribution||'NOAA/NWS MRMS';},
    setParams(params,noRedraw){
      if(params&&Object.prototype.hasOwnProperty.call(params,'TIME')){
        const raw=params.TIME;
        const parsed=typeof raw==='number'?raw:Date.parse(raw);
        this._time=Number.isFinite(parsed)?parsed:null;
      }
      if(!noRedraw)this.redraw();
      return this;
    },
    redraw(){
      clearTimeout(this._timer);
      this._timer=setTimeout(()=>void this._request(false),70);
      return this;
    },
    _buildUrl(frame,useLatest){
      const map=this._map,b=map.getBounds(),size=map.getSize(),dpr=Math.min(1.75,Math.max(1,window.devicePixelRatio||1));
      const west=Math.max(-180,b.getWest()),east=Math.min(180,b.getEast()),south=Math.max(-85,b.getSouth()),north=Math.min(85,b.getNorth());
      const w=Math.min(1800,Math.max(512,Math.round(size.x*dpr))),h=Math.min(1200,Math.max(384,Math.round(size.y*dpr)));
      const u=new URL(EXPORT);
      u.searchParams.set('bbox',`${west},${south},${east},${north}`);
      u.searchParams.set('bboxSR','4326');
      u.searchParams.set('imageSR','4326');
      u.searchParams.set('size',`${w},${h}`);
      u.searchParams.set('format','png32');
      u.searchParams.set('transparent','true');
      u.searchParams.set('interpolation','RSP_BilinearInterpolation');
      u.searchParams.set('f','image');
      if(!useLatest&&frame?.id){u.searchParams.set('mosaicRule',JSON.stringify({mosaicMethod:'esriMosaicLockRaster',lockRasterIds:[frame.id],ascending:true,mosaicOperation:'MT_FIRST'}));}
      u.searchParams.set('_bp',String(Date.now()));
      return {url:u.toString(),bounds:[[south,west],[north,east]],locked:!useLatest&&!!frame?.id};
    },
    async _request(useLatest){
      if(!this._map)return;
      const seq=++this._seq,subset=subsetForMap(this._map);
      let frame=null;
      if(!useLatest&&this._time){
        try{frame=nearestFrame(await loadRadarCatalog(),this._time,subset);}catch(e){console.warn('BridgePoint NOAA catalog fallback',e);}
      }
      const req=this._buildUrl(frame,useLatest||!frame);this._frame=frame;
      status(req.locked?`NOAA MRMS ${subset} • loading historical raster…`:`NOAA MRMS ${subset} • loading latest live image…`);
      const probe=new Image();probe.decoding='async';
      probe.onload=()=>{
        if(seq!==this._seq||!this._map)return;
        if(!this._overlay){this._overlay=L.imageOverlay(req.url,req.bounds,{opacity:Number(this.options.opacity)||.84,interactive:false,pane:'bp1000RadarPane',className:'bp1000-radar-image'}).addTo(this._map);}else{this._overlay.setBounds(req.bounds);this._overlay.setUrl(req.url);if(!this._map.hasLayer(this._overlay))this._overlay.addTo(this._map);}
        const d=frame?new Date(frame.time):new Date();status(`NOAA MRMS ${subset} LIVE • ${frame?d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'latest'}`);
      };
      probe.onerror=()=>{if(seq!==this._seq||!this._map)return;if(req.locked){status(`NOAA ${subset} historical raster missed • falling back to latest…`);void this._request(true);}else status('NOAA radar image failed to load',true);};
      probe.src=req.url;
    }
  });
  L.tileLayer.wms=function(url,options){if(/radar_base_reflectivity_time\/ImageServer\/WMSServer/i.test(String(url||'')))return new ReliableRadar(options||{});return originalWms.call(this,url,options);};
  L.tileLayer.__bp1001RadarPatched=true;
}

const originalOpen=window.BridgePointOpenIntelligenceMapV974;
if(typeof originalOpen==='function')window.BridgePointOpenIntelligenceMapV974=async function(){await ensureLeaflet();installReliableRadar();return originalOpen.apply(this,arguments);};
window.BridgePointRadarV1000={ensureLeaflet,installReliableRadar,loadRadarCatalog,subsetForMap};
})();