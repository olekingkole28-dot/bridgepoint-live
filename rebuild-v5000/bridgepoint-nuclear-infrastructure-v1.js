/* BridgePoint Nuclear Infrastructure v1 — public civilian reactor sites and historical facilities.
 * Source: public ArcGIS IAEA World Nuclear Reactors snapshot (2025), with openly labeled fallback site anchors.
 * No classified/defense-site locations, no inferred facility security details or live warhead inventory.
 * 3D viewer is explicitly a generic educational schematic, not georeferenced photogrammetry.
 */
(()=>{
 'use strict';
 const KEY='__BP_NUCLEAR_INFRASTRUCTURE_V1__';
 if(window[KEY])return;
 const VERSION='1.0.0';
 const CONTROL='bp-nuclear-sites-group-v1', BUTTON='bp-nuclear-sites-button-v1';
 const SOURCE='bp-nuclear-sites-geo-v1', PIN='bp-nuclear-sites-pins-v1', HALO='bp-nuclear-sites-glow-v1', LABEL='bp-nuclear-sites-label-v1';
 const SOURCE_URL='https://services.arcgis.com/XG15cJAlne2vxtgt/ArcGIS/rest/services/IAEA_World_Nuclear_Reactors/FeatureServer/0';
 const PRIS_URL='https://pris.iaea.org/';
 const GEM_URL='https://globalenergymonitor.org/projects/global-nuclear-power-tracker';
 const STATES=new WeakMap();
 const CACHE=new Map();
 const FALLBACK=[
  ['Chernobyl Nuclear Power Plant','Ukraine',30.099,51.390,'historical / shutdown'],
  ['Fukushima Daiichi Nuclear Power Station','Japan',141.032,37.421,'historical / shutdown'],
  ['Three Mile Island Nuclear Generating Station','United States',-76.724,40.153,'historical'],
  ['Koeberg Nuclear Power Station','South Africa',18.432,-33.676,'operating site'],
  ['Olkiluoto Nuclear Power Plant','Finland',21.441,61.236,'operating site'],
  ['Barakah Nuclear Energy Plant','United Arab Emirates',52.321,23.955,'operating site'],
  ['Palo Verde Nuclear Generating Station','United States',-112.865,33.389,'operating site'],
  ['Kudankulam Nuclear Power Plant','India',77.710,8.169,'operating site'],
  ['Flamanville Nuclear Power Plant','France',-1.881,49.536,'operating site'],
  ['Satsop Nuclear Power Plant Project','United States',-123.386,46.966,'never completed']
 ];
 const FALLBACK_DATA=FALLBACK.map((x,i)=>({
   id:'fallback-'+i,name:x[0],country:x[1],coordinates:[x[2],x[3]],
   status:x[4],kind:x[4].includes('historical')||x[4].includes('shutdown')||x[4].includes('completed')?'historical':'reactor',
   units:[],approximate:true,source:'publicly named facility anchor (illustrative fallback)',capacity:null
 }));
 let allRecords=FALLBACK_DATA, dataLoading=null, fetched=false;
 const safe=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const coordsOk=c=>Array.isArray(c)&&c.length>=2&&Number.isFinite(+c[0])&&Number.isFinite(+c[1])&&Math.abs(+c[0])<=180&&Math.abs(+c[1])<=90;
 const shorten=v=>String(v??'').trim().slice(0,160);
 const empty=()=>({type:'FeatureCollection',features:[]});
 const statusKind=s=>/shut|permanent|decommiss|cancel|retir|not completed|never completed|historical/i.test(s)?'historical':/construct|planned|propos/i.test(s)?'construction':'reactor';
 function normalize(results){
   if(!Array.isArray(results))throw Error('Reactors layer contains no features');
   const locations=new Map();
   for(let i=0;i<results.length;i++){
     const feature=results[i],p=feature.properties||feature.attributes||{},xy=feature.geometry?.coordinates||[p.Lon,p.Lat];
     if(!coordsOk(xy))continue;
     const name=shorten(p.Name||p.name||'Unnamed nuclear reactor');
     const country=shorten(p.Country||p.country||'Country not supplied');
     const place=shorten(p.Location||p.location||name);
     const coord=[Number(xy[0]),Number(xy[1])];
     const key=country.toLowerCase()+'|'+(place||name).toLowerCase().replace(/\s*(unit|reactor)\s*[\dA-Za-z-]+$/i,'').trim();
     let site=locations.get(key);
     if(!site){
       site={id:'reactor-'+locations.size,name:place&&place!==name?place:name,country,
          coordinates:coord,kind:'reactor',status:'',units:[],approximate:true,
          source:'IAEA PRIS-derived ArcGIS public layer, updated June 2025',capacity:0};
       locations.set(key,site);
     }
     const status=shorten(p.Status);
     const capacity=Number(p.Reference_Unit_Power??p.Gross_Electrical_Capacity);
     const unit={name,status,type:shorten(p.Type),
       capacity:Number.isFinite(capacity)&&capacity>0?capacity:null,
       firstGrid:shorten(p.First_Grid_Connection),
       shutdown:shorten(p.Shutdown_Date)};
     site.units.push(unit);
     if(unit.capacity!==null)site.capacity+=unit.capacity;
   }
   const out=[...locations.values()];
   for(const site of out){
     const statuses=site.units.map(x=>x.status).filter(Boolean);
     site.status=statuses.length?[...new Set(statuses)].join(' · '):'Status not specified in source';
     site.kind=statuses.length&&statuses.every(x=>statusKind(x)==='historical')?'historical':
       statuses.length&&statuses.every(x=>statusKind(x)==='construction')?'construction':'reactor';
     if(!site.capacity)site.capacity=null;
   }
   return out;
 }
 function collection(){
   return {type:'FeatureCollection',features:allRecords.map(x=>({
     type:'Feature',id:x.id,geometry:{type:'Point',coordinates:x.coordinates},
     properties:{id:x.id,name:x.name,country:x.country,kind:x.kind,color:
       x.kind==='historical'?'#ffb45f':x.kind==='construction'?'#c7a8ff':'#71e5de'}
   }))};
 }
 function ensureStyle(){
   if(document.getElementById('bp-nuclear-sites-css-v1'))return;
   const el=document.createElement('style');el.id='bp-nuclear-sites-css-v1';
   el.textContent=
     '#'+BUTTON+'[aria-pressed="true"]{border-color:#71e5de!important;box-shadow:0 0 12px rgba(82,230,223,.3)}'+
     '.bp-nuclear-v1-popup .maplibregl-popup-content{border:1px solid rgba(97,219,211,.55);border-radius:14px;padding:0;background:#071822;color:#e6f8fa;box-shadow:0 15px 35px rgba(0,0,0,.4)}'+
     '.bp-nuclear-v1-card{padding:14px 15px;max-height:min(68vh,540px);overflow:auto;font:500 12px/1.43 system-ui,sans-serif}'+
     '.bp-nuclear-v1-card h3{margin:0 25px 5px 0;font-size:16px;line-height:1.3;color:white}'+
     '.bp-nuclear-v1-card p{margin:6px 0;color:#c3dde1}'+
     '.bp-nuclear-v1-card dl{display:grid;grid-template-columns:104px 1fr;gap:5px 8px;margin:10px 0}'+
     '.bp-nuclear-v1-card dt{font-weight:750;color:#7fd8dc}.bp-nuclear-v1-card dd{margin:0;overflow-wrap:anywhere}'+
     '.bp-nuclear-v1-card a{color:#83e5ee}.bp-nuclear-v1-card button{padding:8px 12px;border:1px solid #65c6cf;border-radius:8px;background:#103947;color:white;font-weight:750;cursor:pointer}'+
     '.bp-nuclear-v1-view{position:relative;width:100%;height:230px;margin-top:9px;border-radius:10px;background:linear-gradient(#071625,#153640);overflow:hidden}'+
     '.bp-nuclear-v1-view canvas{width:100%;height:100%;display:block}'+
     '.bp-nuclear-v1-legal{font-size:11px;color:#9dbec3!important}'+
     '.bp-nuclear-v1-card .bp-nuclear-v1-units{max-height:84px;overflow:auto;color:#aad7d9;font-size:11px}';
   document.head.appendChild(el);
 }
 function installButton(state){
   const host=document.querySelector('#bpv-dock-actions');
   if(!host)return false;
   if(document.getElementById(BUTTON))return true;
   ensureStyle();
   const section=document.createElement('section');
   section.id=CONTROL;section.className='bpv-command-group';
   section.dataset.bpvCommandSection='explore';section.setAttribute('aria-label','Nuclear Infrastructure');
   const btn=document.createElement('button');
   btn.id=BUTTON;btn.type='button';btn.className='bpv-command-btn bpv-v2-tool-button';
   btn.title='Show public nuclear reactor and historical civilian infrastructure sites';
   btn.setAttribute('aria-pressed','false');
   btn.innerHTML='<span class="bpv-command-icon" aria-hidden="true">⚛</span><span class="bpv-command-label">Nuclear Sites</span>';
   section.appendChild(btn);host.appendChild(section);
   btn.addEventListener('click',()=>toggle(state,!state.enabled));
   return true;
 }
 function ensureLayers(state){
   const map=state.map;
   if(!map.getStyle?.())return false;
   try{
     if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:collection(),maxzoom:18});
     else map.getSource(SOURCE).setData(collection());
     const layers=[
      {id:HALO,type:'circle',source:SOURCE,minzoom:0,
        paint:{'circle-color':['get','color'],'circle-radius':['interpolate',['linear'],['zoom'],0,8,6,11,13,16],
          'circle-opacity':.18,'circle-blur':.65}},
      {id:PIN,type:'circle',source:SOURCE,minzoom:0,
        paint:{'circle-color':['get','color'],'circle-radius':['interpolate',['linear'],['zoom'],0,5,5,8,10,10,17,13],
          'circle-stroke-color':'#f1ffff','circle-stroke-width':1.6,'circle-opacity':.98}},
      {id:LABEL,type:'symbol',source:SOURCE,minzoom:4.5,
        layout:{'text-field':['get','name'],'text-font':['Open Sans Semibold','Arial Unicode MS Regular'],
          'text-size':['interpolate',['linear'],['zoom'],4.5,10,10,12],'text-anchor':'top',
          'text-offset':[0,1.05],'text-max-width':15,'text-optional':true},
        paint:{'text-color':'#c8fcf0','text-halo-color':'#03131a','text-halo-width':1.6}}
     ];
     for(const l of layers)if(!map.getLayer(l.id))map.addLayer(l);
     setVisibility(state);
     return true;
   }catch(e){state.error=String(e?.message||e);console.warn('[BridgePoint Nuclear Sites]',e);return false;}
 }
 function setVisibility(state){
   for(const id of [HALO,PIN,LABEL]){
     if(state.map.getLayer?.(id))state.map.setLayoutProperty(id,'visibility',state.enabled?'visible':'none');
   }
 }
 function stopViewer(state){
   const v=state.viewer;if(!v)return;
   state.viewer=null;
   cancelAnimationFrame(v.raf);
   for(const m of v.meshes){m.geometry?.dispose?.();m.material?.dispose?.();}
   v.renderer?.dispose();v.renderer?.domElement?.remove();
 }
 async function view3d(state,host){
   if(!host||state.viewer)return;
   host.textContent='Loading local 3D schematic…';
   try{
     const THREE=await import('/vendor/three.module.js?v=169-local');
     if(!state.enabled||!host.isConnected)return;
     const w=host.clientWidth||325,h=230;
     const renderer=new THREE.WebGLRenderer({alpha:false,antialias:false,powerPreference:'low-power'});
     renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.3));
     renderer.setSize(w,h,false);
     renderer.setClearColor(0x071b29);
     host.replaceChildren(renderer.domElement);
     const scene=new THREE.Scene();
     const camera=new THREE.PerspectiveCamera(44,w/h,.1,500);
     camera.position.set(65,40,75);
     camera.lookAt(0,10,0);
     scene.add(new THREE.AmbientLight(0xb9dce6,1.6));
     const sun=new THREE.DirectionalLight(0xffffff,2.3);sun.position.set(-22,58,38);scene.add(sun);
     const group=new THREE.Group();scene.add(group);
     const meshes=[];
     const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.08,side:THREE.DoubleSide});
     function mesh(geom,material,x,y,z){
       const obj=new THREE.Mesh(geom,material);
       obj.position.set(x,y,z);group.add(obj);meshes.push(obj);return obj;
     }
     mesh(new THREE.BoxGeometry(68,2,46),mat(0x426970),0,-1,0);
     mesh(new THREE.BoxGeometry(20,11,23),mat(0x66818c),-14,5.5,0);
     mesh(new THREE.BoxGeometry(27,6,10),mat(0x486574),5,3,14);
     mesh(new THREE.CylinderGeometry(9,9,13,36),mat(0xb5c9d0),-14,6.5,0);
     const dome=new THREE.SphereGeometry(9,40,20,0,Math.PI*2,0,Math.PI/2);
     mesh(dome,mat(0xd8ecf0),-14,13,0);
     const shape=[];
     for(let i=0;i<=30;i++){
       const t=i/30,r=6.7-2.15*Math.sin(Math.PI*t);
       shape.push(new THREE.Vector2(r,t*30));
     }
     const concrete=mat(0xadc2c6);
     mesh(new THREE.LatheGeometry(shape,40),concrete,16,0,-9);
     mesh(new THREE.LatheGeometry(shape,40),concrete,28,0,-9);
     for(const [x,z] of [[16,-9],[28,-9]]){
       mesh(new THREE.TorusGeometry(6.7,.22,7,38),mat(0xdef0ed),x,29.8,z).rotation.x=Math.PI/2;
     }
     let raf=0;
     const tick=()=>{
       if(!state.viewer||!host.isConnected){stopViewer(state);return;}
       group.rotation.y+=.004;
       renderer.render(scene,camera);
       raf=requestAnimationFrame(tick);
       state.viewer.raf=raf;
     };
     state.viewer={renderer,meshes,raf};
     tick();
   }catch(e){host.textContent='3D viewer unavailable on this device.';console.warn('[BridgePoint Nuclear 3D]',e)}
 }
 function card(site){
   const coord=site.coordinates.map(v=>Number(v).toFixed(4)).join(', ');
   const list=(site.units||[]).slice(0,12).map(u=>safe(u.name)+': '+safe(u.status||'status not supplied')).join('; ');
   return '<article class="bp-nuclear-v1-card">'+
     '<h3>⚛ '+safe(site.name)+'</h3><p>'+safe(site.country)+'</p>'+
     '<dl><dt>Classification</dt><dd>'+safe(site.kind)+'</dd>'+
     '<dt>Recorded status</dt><dd>'+safe(site.status||'unknown')+'</dd>'+
     '<dt>Coordinates</dt><dd>'+safe(coord)+' · '+(site.approximate?'approximate site anchor':'reported site anchor')+'</dd>'+
     '<dt>Reactor records</dt><dd>'+site.units.length+'</dd>'+
     '<dt>Listed capacity</dt><dd>'+safe(site.capacity?site.capacity+' MW (sum of records)':'not verified')+'</dd>'+
     '<dt>Data source</dt><dd>'+safe(site.source)+'</dd></dl>'+
     (site.units.length?'<p class="bp-nuclear-v1-units">'+list+'</p>':'')+
     '<button type="button" data-bpn-show3d>Open 3D structural schematic</button>'+
     '<div class="bp-nuclear-v1-view" data-bpn-view3d hidden></div>'+
     '<p class="bp-nuclear-v1-legal">Schematic only: cooling towers and containment buildings are illustrative, not a site survey, exact measured height, or photogrammetry. Facility coordinates may be approximate. Source snapshot is not a real-time operational feed.</p>'+
     '<p><a target="_blank" rel="noopener noreferrer" href="'+PRIS_URL+'">IAEA PRIS</a> · <a target="_blank" rel="noopener noreferrer" href="'+GEM_URL+'">Global Energy Monitor</a></p>'+
     '</article>';
 }
 function showCard(state,site){
   stopViewer(state);
   state.popup?.remove();
   const ctor=window.maplibregl?.Popup;if(!ctor)return;
   const popup=new ctor({closeButton:true,closeOnClick:false,maxWidth:'410px',className:'bp-nuclear-v1-popup'})
     .setLngLat(site.coordinates).setHTML(card(site)).addTo(state.map);
   state.popup=popup;
   popup.on('close',()=>{stopViewer(state);if(state.popup===popup)state.popup=null});
   const element=popup.getElement();
   const button=element?.querySelector('[data-bpn-show3d]');
   button?.addEventListener('click',()=>{
     const panel=element.querySelector('[data-bpn-view3d]');
     if(!panel)return;
     panel.hidden=false;button.disabled=true;button.textContent='Illustrative 3D model';
     void view3d(state,panel);
   });
 }
 async function loadPublicReactorCatalog(){
   if(dataLoading)return dataLoading;
   dataLoading=(async()=>{
     const url=SOURCE_URL+'/query?where=1%3D1&outFields=*&outSR=4326&returnGeometry=true&f=geojson&resultRecordCount=2000';
     const controller=new AbortController();
     const timeout=setTimeout(()=>controller.abort(),18000);
     try{
       const response=await fetch(url,{mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal});
       if(!response.ok)throw Error('IAEA public reactor-layer HTTP '+response.status);
       const data=await response.json();
       if(!Array.isArray(data.features))throw Error('Invalid reactor features');
       const normalized=normalize(data.features);
       if(normalized.length<50)throw Error('Public reactor layer returned too few sites');
       // Preserve one historical unbuilt site that is not part of a reactor
       // status feed; do not replace any IAEA-derived records.
       allRecords=[...normalized,FALLBACK_DATA[FALLBACK_DATA.length-1]];
       fetched=true;
       for(const state of CACHE.values()){
         if(state.map?.getSource(SOURCE))state.map.getSource(SOURCE).setData(collection());
       }
       return allRecords;
     }finally{clearTimeout(timeout);}
   })().catch(error=>{
     console.warn('[BridgePoint Nuclear Sites] Public source unavailable; showing labeled reference anchors only.',error);
     dataLoading=null;
     return allRecords;
   });
   return dataLoading;
 }
 function toggle(state,enabled){
   state.enabled=!!enabled;
   const button=document.getElementById(BUTTON);
   if(button){button.setAttribute('aria-pressed',String(state.enabled));button.classList.toggle('is-active',state.enabled);}
   if(state.enabled){
     ensureLayers(state);
     if(!fetched)void loadPublicReactorCatalog();
   }else{stopViewer(state);state.popup?.remove();state.popup=null;}
   setVisibility(state);
 }
 function init(map){
   if(!map||typeof map.addSource!=='function'||typeof map.on!=='function')return null;
   if(STATES.has(map))return STATES.get(map).api;
   const state={map,enabled:false,popup:null,viewer:null,error:null};
   state.style=()=>{if(state.enabled)ensureLayers(state);};
   state.click=e=>{
     if(!state.enabled||!map.getLayer(PIN))return;
     const features=map.queryRenderedFeatures(e.point,{layers:[PIN]});
     if(!features?.length)return;
     const id=String(features[0].properties?.id);
     const site=allRecords.find(r=>r.id===id);
     if(site)showCard(state,site);
   };
   state.hover=e=>{
     if(!state.enabled||!map.getLayer(PIN))return;
     const hits=map.queryRenderedFeatures(e.point,{layers:[PIN]});
     map.getCanvas().style.cursor=hits?.length?'pointer':'';
   };
   map.on('style.load',state.style);map.on('load',state.style);
   map.on('click',state.click);map.on('mousemove',state.hover);
   const api={version:VERSION,get enabled(){return state.enabled},get sites(){return allRecords.length},
     get status(){return {enabled:state.enabled,loaded:fetched,sites:allRecords.length,error:state.error}},
     setEnabled:value=>toggle(state,value),toggle:()=>toggle(state,!state.enabled)};
   state.api=api;STATES.set(map,state);CACHE.set(map,state);
   installButton(state);
   return api;
 }
 function findMap(){
   const candidates=[window.__BP_V5000_WORLD__,window.__BP_V5000_WORLD,window.__BP_LANDING_WORLD__,window.__BP_LANDING_WORLD,window.__bpWorldV2300];
   for(const candidate of candidates){
     const map=candidate?.map||candidate;
     if(map&&typeof map.addSource==='function'&&typeof map.on==='function')return map;
   }
   return null;
 }
 function attach(){
   const map=findMap();
   if(!map)return false;
   const api=init(map);
   if(!api)return false;
   const state=CACHE.get(map);
   installButton(state);
   return true;
 }
 window[KEY]={version:VERSION,get records(){return allRecords.length},init,toggle:()=>{const m=findMap(),s=m&&CACHE.get(m);if(s)toggle(s,!s.enabled)}};
 let count=0;const timer=setInterval(()=>{
   count++;
   const ready=attach();
   if(ready&&document.getElementById(BUTTON)){clearInterval(timer);return;}
   if(count>240)clearInterval(timer);
 },500);
 window.addEventListener('bp:world-map-ready-v5940',e=>{const map=e.detail?.map;if(map)init(map);});
 attach();
})();