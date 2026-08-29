(()=>{
'use strict';
if(window.__bridgepointRadarRestV1000)return;
window.__bridgepointRadarRestV1000=true;

const LEAFLET_JS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const EXPORT='https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity_time/ImageServer/exportImage';
let leafletPromise=null;

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
function installReliableRadar(){
  const L=window.L;
  if(!L||L.tileLayer.__bp1000RadarPatched)return;
  const originalWms=L.tileLayer.wms;
  const ReliableRadar=L.Layer.extend({
    options:{opacity:.82,attribution:'NOAA/NWS MRMS'},
    initialize(options){L.setOptions(this,options||{});this._time=null;this._overlay=null;this._map=null;this._timer=null;this._seq=0;},
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
      this._timer=setTimeout(()=>this._request(false),70);
      return this;
    },
    _buildUrl(useLatest){
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
      if(!useLatest&&this._time)u.searchParams.set('time',String(Math.round(this._time)));
      u.searchParams.set('_bp',String(Date.now()));
      return {url:u.toString(),bounds:[[south,west],[north,east]],hasTime:!useLatest&&!!this._time};
    },
    _request(useLatest){
      if(!this._map)return;
      const seq=++this._seq,req=this._buildUrl(useLatest);
      status(req.hasTime?'NOAA MRMS radar • loading selected frame…':'NOAA MRMS radar • loading latest frame…');
      const probe=new Image();
      probe.decoding='async';
      probe.onload=()=>{
        if(seq!==this._seq||!this._map)return;
        if(!this._overlay){
          this._overlay=L.imageOverlay(req.url,req.bounds,{opacity:Number(this.options.opacity)||.82,interactive:false,pane:'bp1000RadarPane',className:'bp1000-radar-image'}).addTo(this._map);
        }else{
          this._overlay.setBounds(req.bounds);
          this._overlay.setUrl(req.url);
          if(!this._map.hasLayer(this._overlay))this._overlay.addTo(this._map);
        }
        const d=this._time?new Date(this._time):new Date();
        status(`NOAA MRMS radar LIVE • ${useLatest?'latest':d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`);
      };
      probe.onerror=()=>{
        if(seq!==this._seq||!this._map)return;
        if(req.hasTime){
          status('NOAA frame missed • falling back to latest live radar…');
          this._request(true);
        }else{
          status('NOAA radar image failed to load',true);
        }
      };
      probe.src=req.url;
    }
  });
  L.tileLayer.wms=function(url,options){
    if(/radar_base_reflectivity_time\/ImageServer\/WMSServer/i.test(String(url||'')))return new ReliableRadar(options||{});
    return originalWms.call(this,url,options);
  };
  L.tileLayer.__bp1000RadarPatched=true;
}

const originalOpen=window.BridgePointOpenIntelligenceMapV974;
if(typeof originalOpen==='function'){
  window.BridgePointOpenIntelligenceMapV974=async function(){
    await ensureLeaflet();
    installReliableRadar();
    return originalOpen.apply(this,arguments);
  };
}
window.BridgePointRadarV1000={ensureLeaflet,installReliableRadar};
})();