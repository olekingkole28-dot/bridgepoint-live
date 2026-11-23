/* BridgePoint Conflict Zones v1: global illustrative regional conflict overlays.
 * The red boundaries are editorial approximations of publicly reported affected regions.
 * Not measured front lines, not geofenced hazards, and not live troop/strike tracking.
 * Curated context: ACLED Conflict Index & 2026 Watchlist and CFR Global Conflict Tracker.
 * Snapshot reviewed 2026-11-22; this is not a live incident feed.
 * Additive only. Does not modify other map sources or 3D renderers.
 */
(()=>{
  'use strict';
  const KEY='__BP_CONFLICT_ZONES_V1__';
  if(window[KEY])return;
  const VERSION='1.1.0';
  const REVIEWED='2026-11-22';
  const SOURCE='bp-conflict-zones-regions-v1';
  const PINS='bp-conflict-zones-pin-source-v1';
  const FILL='bp-conflict-zones-fill-v1';
  const BORDER='bp-conflict-zones-border-v1';
  const GLOW='bp-conflict-zones-glow-v1';
  const RING='bp-conflict-zones-pin-halo-v1';
  const DOT='bp-conflict-zones-pin-v1';
  const ICON='bp-conflict-zones-triangle-icon-v1';
  const ICON_LAYER='bp-conflict-zones-icons-v1';
  const LABEL_LAYER='bp-conflict-zones-labels-v1';
  const BUTTON='bp-conflict-zones-button-v1';
  const CONTROL='bp-conflict-zones-controls-v1';
  const STYLE='bp-conflict-zones-style-v1';
  const LEGEND='bp-conflict-zones-legend-v1';
  const FX_LAYER='bp-hostile-fx-v1';
  const SCORCH_SOURCE='bp-hostile-scorch-source-v1';
  const SCORCH_LAYER='bp-hostile-scorch-fill-v1';
  const SCORCH_EDGE='bp-hostile-scorch-edge-v1';
  const ACLED='https://acleddata.com/conflict-index-2026-watchlist';
  const CFR='https://www.cfr.org/global-conflict-tracker';
  const IRC='https://www.rescue.org/uk/article/emergency-watchlist-2026';
  const STATES=new WeakMap();
  const stateSet=new Set();
  // id, label, country/region, lng, lat, longitude radius, latitude radius,
  // context, severity (visual priority only), public context provider.
  // Polygons are intentionally general geographic indicators; exact boundaries
  // or ownership/control cannot be inferred from the shaded areas.
  const AREAS=[
    ['ukraine-east','Eastern Ukraine','Ukraine',36.3,48.5,4.0,2.3,'Ongoing interstate war; publicly reported hostilities across eastern and southern parts of the country.','major','ACLED'],
    ['ukraine-south','Southern Ukraine','Ukraine',33.4,46.9,3.4,1.25,'Southern war-affected region. This envelope does not denote an occupied area or a verified frontline.','major','CFR'],
    ['sudan-darfur','Darfur','Sudan',24.7,13.1,2.45,2.6,'Conflict and displacement associated with Sudan’s civil war; broad Darfur regional reference.','major','IRC'],
    ['sudan-kordofan','Kordofan','Sudan',29.6,12.0,2.4,2.0,'Continuing Sudan conflict and major humanitarian impact in Kordofan.','major','ACLED'],
    ['gaza','Gaza Strip','Palestinian territories',34.42,31.4,.19,.34,'Affected territory in the Israel–Palestine conflict; outline is an approximate regional envelope.','major','ACLED'],
    ['lebanon-south','Southern Lebanon','Lebanon',35.53,33.25,.52,.53,'Regional conflict and cross-border hostilities; not a live strike or risk boundary.','active','ACLED'],
    ['myanmar-central','Central Myanmar','Myanmar',95.8,21.9,2.7,3.6,'Civil war and widespread fighting across multiple central regions.','major','ACLED'],
    ['myanmar-west','Western Myanmar / Rakhine','Myanmar',93.6,20.2,1.15,2.8,'Armed conflict and displacement in western Myanmar.','major','IRC'],
    ['drc-kivu','Eastern DRC / Kivu','Democratic Republic of the Congo',28.5,-1.8,1.8,3.7,'Armed conflict and displacement in eastern DRC, particularly the Kivu regions.','major','CFR'],
    ['mali-center','Central and Northern Mali','Mali',-3.4,15.8,4.1,3.45,'Sahel armed-group violence and instability; not a defined control zone.','major','ACLED'],
    ['burkina-east','Northern and Eastern Burkina Faso','Burkina Faso',-.7,13.1,2.7,1.4,'Reported militant violence and humanitarian access challenges in the Sahel.','major','IRC'],
    ['niger-west','Western Niger / Sahel','Niger',2.7,13.9,2.15,1.75,'Insurgency and armed violence in western Niger and border regions.','active','ACLED'],
    ['somalia-south','Southern and Central Somalia','Somalia',44.6,2.7,3.2,2.75,'Armed-group insurgency and counterinsurgency in parts of southern and central Somalia.','major','CFR'],
    ['yemen','Northern and Western Yemen','Yemen',44.2,15.9,2.7,1.8,'Long-running Yemen conflict and associated regional escalation; affected area is approximate.','major','CFR'],
    ['syria-north','Northern Syria','Syria',38.2,36.1,2.8,.98,'Fragmented security environment and reported armed clashes in parts of Syria.','active','CFR'],
    ['south-sudan','Upper Nile and Jonglei','South Sudan',32.5,8.0,1.85,2.0,'Armed violence and instability with severe humanitarian consequences.','active','IRC'],
    ['ethiopia-amhara','Amhara region','Ethiopia',37.5,11.4,1.9,2.15,'Conflict and instability in Amhara; map is not an indication of exact operational activity.','active','IRC'],
    ['nigeria-northeast','Northeastern Nigeria','Nigeria',13.3,12.1,1.8,2.1,'Long-running insurgency and civilian harm in the northeast.','active','ACLED'],
    ['pakistan-kp','Khyber Pakhtunkhwa','Pakistan',71.4,34.2,1.85,2.1,'Insurgent violence and security incidents in northwestern Pakistan.','active','ACLED'],
    ['pakistan-balochistan','Balochistan','Pakistan',66.1,28.3,3.4,2.45,'Insurgent violence reported across parts of Balochistan.','active','ACLED'],
    ['mozambique-cabo','Cabo Delgado','Mozambique',39.3,-12.3,1.0,1.5,'Armed insurgency and humanitarian crisis in northeastern Mozambique.','active','IRC'],
    ['car','Northern and Eastern CAR','Central African Republic',21.3,7.3,2.9,2.0,'Armed-group violence and insecurity in parts of the country.','active','IRC'],
    ['haiti','Port-au-Prince region','Haiti',-72.32,18.55,.50,.29,'Severe gang-related armed violence and humanitarian insecurity; not an interstate war.','active','IRC'],
    ['colombia-pacific','Colombia southwest / Pacific','Colombia',-77.0,3.0,1.8,2.3,'Armed-group conflict and displacement in western and southwestern Colombia.','active','CFR'],
    ['afghanistan-east','Eastern Afghanistan','Afghanistan',70.2,34.5,1.75,2.05,'Cross-border and armed-group violence affecting parts of eastern Afghanistan.','active','CFR'],
    ['iraq-north','Northern Iraq','Iraq',43.6,36.4,1.7,.85,'Periodic armed clashes and strikes in parts of northern Iraq; not continuous active fighting throughout the area.','monitor','CFR'],
    ['iran-regional','Iran / Regional Conflict','Iran',52,32.4,6.6,4.3,'CFR tracks a worsening interstate conflict involving Iran. This broad country-level indicator is NOT a map of attacks or hostilities at exact locations.','major','CFR']
  ];
  const BY_ID=new Map();
  const urls={ACLED,CFR,IRC};
  const htmlEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function regionalPolygon(item,index){
    const [,, ,lng,lat,rx,ry]=item;
    const coordinates=[];
    // An intentionally broad, soft-edged envelope—not a digitized frontline.
    for(let j=0;j<32;j++){
      const t=j/32*Math.PI*2;
      const wave=1+.065*Math.sin(t*3+index*1.19)+.045*Math.cos(t*5-index*.67);
      coordinates.push([
        +Math.max(-179.99,Math.min(179.99,lng+Math.cos(t)*rx*wave)).toFixed(5),
        +Math.max(-84.9,Math.min(84.9,lat+Math.sin(t)*ry*wave)).toFixed(5)
      ]);
    }
    coordinates.push(coordinates[0]);
    return {type:'Polygon',coordinates:[coordinates]};
  }
  const regions={type:'FeatureCollection',features:AREAS.map((item,i)=>{
    const [id,title,place,lon,lat,,,description,severity,provider]=item;
    BY_ID.set(id,{id,title,place,coordinates:[lon,lat],description,severity,provider});
    return {type:'Feature',id:i+1,geometry:regionalPolygon(item,i),
      properties:{id,name:title,place,severity}};
  })};
  const pins={type:'FeatureCollection',features:AREAS.map((item,i)=>{
    const [id,title,,lon,lat,,,,severity]=item;
    return {type:'Feature',id:i+1,geometry:{type:'Point',coordinates:[lon,lat]},
      properties:{id,name:title,severity}};
  })};
  function ensureCss(){
    if(document.getElementById(STYLE))return;
    const style=document.createElement('style');style.id=STYLE;
    style.textContent=
      '#'+BUTTON+'[aria-pressed="true"]{border-color:rgba(255,84,92,.8)!important;box-shadow:0 0 14px rgba(255,70,85,.27)!important}'+
      '.bp-conflict-v1-popup .maplibregl-popup-content{background:#1c0d15;border:1px solid rgba(255,112,119,.65);color:#fdf0f1;border-radius:14px;padding:0;box-shadow:0 18px 35px rgba(0,0,0,.43)}'+
      '.bp-conflict-v1-card{padding:14px 16px;max-height:min(65vh,450px);overflow-y:auto;font:500 12px/1.5 system-ui,sans-serif}'+
      '.bp-conflict-v1-card h3{margin:0 20px 6px 0;color:#fff;font-size:17px}.bp-conflict-v1-card p{margin:6px 0;color:#f0cdd1}'+
      '.bp-conflict-v1-card a{color:#ffc5c8}.bp-conflict-v1-card .bp-conflict-warning{padding:8px 10px;background:#3b1720;border-radius:8px;color:#ffe7d2;font-size:11px}'+
      '.bp-conflict-v1-card dl{display:grid;grid-template-columns:96px 1fr;gap:4px 8px;margin:9px 0}'+
      '.bp-conflict-v1-card dt{color:#ffa4a9;font-weight:800}.bp-conflict-v1-card dd{margin:0}'+
      '#'+LEGEND+'{position:fixed;left:12px;bottom:64px;z-index:40;max-width:min(360px,calc(100vw - 25px));padding:8px 10px;background:rgba(32,7,18,.88);border:1px solid rgba(255,92,106,.55);border-radius:10px;color:#ffd4d7;font:700 11px/1.4 system-ui,sans-serif;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.25)}'+
      '#'+LEGEND+'[hidden]{display:none!important}@media(max-width:600px){#'+LEGEND+'{font-size:10px;bottom:58px}}';
    document.head.appendChild(style);
  }
  function iconCanvas(){
    const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
    const ctx=canvas.getContext('2d');if(!ctx)return null;
    ctx.shadowColor='rgba(255,31,55,.8)';ctx.shadowBlur=13;
    ctx.beginPath();ctx.moveTo(48,6);ctx.lineTo(90,82);ctx.quadraticCurveTo(92,87,84,87);
    ctx.lineTo(12,87);ctx.quadraticCurveTo(4,86,8,79);ctx.closePath();
    ctx.fillStyle='#ed2939';ctx.fill();
    ctx.shadowBlur=0;ctx.strokeStyle='#ffe5e6';ctx.lineWidth=5;ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.roundRect?.(44,32,8,28,3);ctx.fill();
    ctx.beginPath();ctx.arc(48,70,5,0,Math.PI*2);ctx.fill();
    return ctx.getImageData(0,0,96,96);
  }
  function ensureButton(state){
    const dock=document.getElementById('bpv-dock-actions');
    if(!dock)return false;
    let button=document.getElementById(BUTTON);
    if(button)return true;
    ensureCss();
    const section=document.createElement('section');section.id=CONTROL;
    section.className='bpv-command-group';section.dataset.bpvCommandSection='explore';
    section.setAttribute('aria-label','Hostile Zones');
    button=document.createElement('button');button.type='button';button.id=BUTTON;
    button.className='bpv-command-btn bpv-v2-tool-button';
    button.setAttribute('aria-pressed',String(state.enabled));
    button.title='Hostile Zones: approximate reported armed conflicts with illustrative 3D fire and smoke';
    button.innerHTML='<span class="bpv-command-icon" aria-hidden="true">⚠</span><span class="bpv-command-label">Hostile Zones</span>';
    section.appendChild(button);dock.appendChild(section);
    button.addEventListener('click',()=>setEnabled(state,!state.enabled));
    // Existing categories wrapper scans buttons on DOM mutations.
    return true;
  }
  function ensureLegend(){
    let el=document.getElementById(LEGEND);
    if(el)return el;
    el=document.createElement('div');el.id=LEGEND;el.hidden=true;
    el.textContent='⚠ Reported conflict regions · red shading is approximate, NOT front lines · 3D smoke, explosions, fire and scorches are illustrative, NOT real events';
    document.body.appendChild(el);return el;
  }
  function setVisibility(state){
    const names=[GLOW,FILL,BORDER,RING,DOT,ICON_LAYER,LABEL_LAYER,SCORCH_LAYER,SCORCH_EDGE,FX_LAYER];
    for(const id of names){
      if(state.map.getLayer?.(id))state.map.setLayoutProperty(id,'visibility',state.enabled?'visible':'none');
    }
    // Hide legend if another map instance is still active.
    const legend=ensureLegend();legend.hidden=![...stateSet].some(s=>s.enabled);
  }
  function ensureLayers(state){
    const map=state.map;
    if(!map.getStyle?.())return false;
    try{
      if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:regions,maxzoom:17,tolerance:.3});
      if(!map.getSource(PINS))map.addSource(PINS,{type:'geojson',data:pins,maxzoom:18});
      if(!map.hasImage?.(ICON)){
        const image=iconCanvas();
        if(image)map.addImage(ICON,image,{pixelRatio:2});
      }
      const layers=[
        {id:FILL,type:'fill',source:SOURCE,minzoom:0,paint:{
          'fill-color':'#ed273e','fill-opacity':['interpolate',['linear'],['zoom'],0,.24,3,.32,9,.28,16,.17]}},
        {id:GLOW,type:'line',source:SOURCE,minzoom:0,paint:{
          'line-color':'#ff4051','line-width':['interpolate',['linear'],['zoom'],0,4,4,6,10,9],
          'line-blur':3,'line-opacity':.5}},
        {id:BORDER,type:'line',source:SOURCE,minzoom:0,paint:{
          'line-color':'#ff8d96','line-width':['interpolate',['linear'],['zoom'],0,1.4,5,2.6,12,3],
          'line-opacity':.94,'line-dasharray':[2,1.5]}},
        {id:RING,type:'circle',source:PINS,minzoom:0,paint:{
          'circle-radius':['interpolate',['linear'],['zoom'],0,13,6,17,12,20],
          'circle-color':'#ff304d','circle-opacity':.23,'circle-blur':.68}},
        {id:DOT,type:'circle',source:PINS,minzoom:0,paint:{
          'circle-radius':['interpolate',['linear'],['zoom'],0,7,5,9,12,10],
          'circle-color':'#cf192e','circle-stroke-color':'#ffe5e7','circle-stroke-width':1.2,
          'circle-opacity':.97}},
        {id:ICON_LAYER,type:'symbol',source:PINS,minzoom:0,layout:{
          'icon-image':ICON,'icon-size':['interpolate',['linear'],['zoom'],0,.46,5,.57,12,.72],
          'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-anchor':'center'}},
        {id:LABEL_LAYER,type:'symbol',source:PINS,minzoom:3,layout:{
          'text-field':['get','name'],'text-font':['Open Sans Semibold','Arial Unicode MS Regular'],
          'text-size':['interpolate',['linear'],['zoom'],3,10,8,12,14,13],
          'text-anchor':'top','text-offset':[0,1.5],'text-max-width':14,
          'text-optional':true,'text-allow-overlap':false},paint:{
          'text-color':'#ffe1e3','text-halo-color':'rgba(47,4,11,.98)','text-halo-width':1.7}}
      ];
      for(const layer of layers)if(!map.getLayer(layer.id))map.addLayer(layer);
      ensureScorch(state);
      setVisibility(state);
      if(state.enabled){ensureFx(state);startFxTicker(state);}
      return true;
    }catch(e){state.error=String(e?.message||e);console.warn('[BridgePoint Conflict Zones]',e);return false;}
  }

  // Regional centers are representative *icons*, NEVER recorded strike locations.
  // Burn marks are reversible overlay paint, not modifications to real basemap data.
  function scorchFeature(item,i){
    const lon=item[3],lat=item[4],radius=260+(i%4)*80;
    const ring=[];
    for(let j=0;j<28;j++){
      const a=j*Math.PI*2/28,wave=1+.17*Math.sin(a*5+i)+.12*Math.cos(a*9+i);
      ring.push([lon+Math.cos(a)*radius*wave/(111320*Math.max(.18,Math.cos(lat*Math.PI/180))),lat+Math.sin(a)*radius*wave/110540]);
    }
    ring.push(ring[0]);
    return {type:'Feature',properties:{id:item[0],simulated:true},geometry:{type:'Polygon',coordinates:[ring]}};
  }
  const scorchCollection={type:'FeatureCollection',features:AREAS.map(scorchFeature)};
  function ensureScorch(state){
    const map=state.map;
    if(!map.getSource(SCORCH_SOURCE))map.addSource(SCORCH_SOURCE,{type:'geojson',data:scorchCollection,maxzoom:18});
    if(!map.getLayer(SCORCH_LAYER))map.addLayer({id:SCORCH_LAYER,type:'fill',source:SCORCH_SOURCE,minzoom:8.7,
      paint:{'fill-color':'#1e1010','fill-opacity':['interpolate',['linear'],['zoom'],8.7,.14,11,.34,16,.44]}});
    if(!map.getLayer(SCORCH_EDGE))map.addLayer({id:SCORCH_EDGE,type:'line',source:SCORCH_SOURCE,minzoom:8.7,
      paint:{'line-color':'#bc4930','line-opacity':.24,'line-width':1.6,'line-blur':2}});
  }
  function fxMatrix(map,T,point,altitude){
    try{
      const raw=map.transform?.getMatrixForModel?.(point,altitude);
      if(raw?.length>=16)return new T.Matrix4().fromArray(raw);
      const mc=window.maplibregl?.MercatorCoordinate?.fromLngLat?.(point,altitude);
      if(!mc)return null;
      const k=mc.meterInMercatorCoordinateUnits();
      if(!Number.isFinite(k)||k<=0)return null;
      return new T.Matrix4().set(k,0,0,mc.x,0,0,k,mc.y,0,k,0,mc.z,0,0,0,1);
    }catch(_){return null;}
  }
  function fxRig(T){
    const scene=new T.Scene(),rig=new T.Group();scene.add(rig);
    const material=(color,opacity,add=false)=>new T.MeshBasicMaterial({
      color,opacity,transparent:true,depthWrite:false,side:T.DoubleSide,blending:add?T.AdditiveBlending:T.NormalBlending
    });
    const ground=new T.Mesh(new T.CircleGeometry(210,36),material(0x190d0c,.58));
    ground.rotation.x=-Math.PI/2;ground.position.y=3;rig.add(ground);
    const rim=new T.Mesh(new T.RingGeometry(115,230,36),material(0xa4412a,.29));
    rim.rotation.x=-Math.PI/2;rim.position.y=5;rig.add(rim);
    const blast=new T.Mesh(new T.IcosahedronGeometry(55,1),material(0xffc05b,.8,true));
    blast.position.y=65;rig.add(blast);
    const flames=[];
    for(let j=0;j<4;j++){
      const o=new T.Mesh(new T.ConeGeometry(30-j*4,135+j*23,9),material(j%2?0xffb329:0xff4b1e,.62,true));
      o.position.set(Math.sin(j*2.8)*35,66+j*13,Math.cos(j*2.8)*32);
      o.rotation.z=(j-1.5)*.13;rig.add(o);flames.push(o);
    }
    const shock=new T.Mesh(new T.TorusGeometry(85,7,6,40),material(0xffb86a,.56,true));
    shock.rotation.x=-Math.PI/2;shock.position.y=9;rig.add(shock);
    const smoke=[];
    for(let j=0;j<9;j++){
      const o=new T.Mesh(new T.SphereGeometry(1,10,8),material(j%3===0?0x605551:0x2f2a2a,.28));
      rig.add(o);smoke.push(o);
    }
    const embers=[];
    for(let j=0;j<7;j++){
      const o=new T.Mesh(new T.IcosahedronGeometry(5,0),material(0xffa638,.7,true));
      rig.add(o);embers.push(o);
    }
    return {scene,rig,ground,rim,blast,flames,shock,smoke,embers};
  }
  function animateFx(obj,clock,index,reduced){
    const t=reduced?0:clock+index*1.33,phase=((t/5.1)%1+1)%1;
    obj.blast.visible=!reduced&&phase<.23;
    obj.blast.scale.setScalar(.5+phase*9);
    obj.blast.material.opacity=Math.max(0,1-phase/.21)*.88;
    obj.shock.visible=!reduced&&phase<.36;
    obj.shock.scale.setScalar(.4+phase*7.5);
    obj.shock.material.opacity=Math.max(0,.60-phase*1.8);
    obj.flames.forEach((o,j)=>{
      o.scale.set(.85+.14*Math.sin(t*7+j),.65+.25*Math.sin(t*5+j*1.7),.9);
      o.material.opacity=(.43+.15*Math.sin(t*8+j))*(reduced?.6:1);
    });
    obj.smoke.forEach((o,j)=>{
      const age=((t*.15+j/9)%1+1)%1;
      o.position.set(Math.sin(j*2.8+age*4+index)*59,55+age*500,Math.cos(j*2.1+age*3)*55);
      o.scale.setScalar((42+age*94)*(j%3===0?1.24:1));
      o.material.opacity=.32*(1-age);
    });
    obj.embers.forEach((o,j)=>{
      const age=((t*.26+j/7)%1+1)%1;
      o.position.set(Math.sin(j*3+age*7)*age*112,18+age*350,Math.cos(j*2+age*7)*age*100);
      o.material.opacity=(1-age)*.8;
    });
  }
  function startFxTicker(state){
    if(state.fxTicker)return;
    state.fxTicker=setInterval(()=>{
      if(!state.enabled||document.hidden||(Number(state.map.getZoom?.())||0)<3)return;
      try{state.map.triggerRepaint?.();}catch(_){}
    },150);
  }
  function stopFxTicker(state){
    if(state.fxTicker){clearInterval(state.fxTicker);state.fxTicker=null;}
  }
  function ensureFx(state){
    if(!state.enabled||state.fxInstalling||state.map.getLayer(FX_LAYER))return;
    state.fxInstalling=true;
    import('/vendor/three.module.js?v=169-local').then(mod=>{
      if(!state.enabled)return;
      const T=mod.default||mod,map=state.map;
      if(map.getLayer(FX_LAYER)||!map.getStyle?.())return;
      const layer={
        id:FX_LAYER,type:'custom',renderingMode:'3d',
        onAdd(m,gl){
          const renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
          renderer.autoClear=false;
          state.fx3d={renderer,camera:new T.Camera(),objects:fxRig(T),T};
        },
        render(_gl,args){
          const fx=state.fx3d;
          if(!fx||!state.enabled)return;
          const zoom=Number(map.getZoom?.())||0;
          if(zoom<3)return;
          const raw=args?.defaultProjectionData?.mainMatrix||args?.modelViewProjectionMatrix;
          if(!raw||raw.length<16)return;
          const reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
          const clock=performance.now()/1000,center=map.getCenter?.(),bounds=map.getBounds?.();
          const visible=AREAS.map((a,i)=>({a,i}))
            .filter(x=>!bounds||bounds.contains([x.a[3],x.a[4]]))
            .sort((a,b)=>{
              const da=(a.a[3]-(center?.lng||0))**2+(a.a[4]-(center?.lat||0))**2;
              const db=(b.a[3]-(center?.lng||0))**2+(b.a[4]-(center?.lat||0))**2;
              return da-db;
            }).slice(0,window.innerWidth<700?2:4);
          if(!visible.length)return;
          const projection=new T.Matrix4().fromArray(raw);
          for(const {a,i} of visible){
            const point=[a[3],a[4]];
            let height=0;
            try{const h=map.queryTerrainElevation?.(point,{exaggerated:false});if(Number.isFinite(h))height=h;}catch(_){}
            const model=fxMatrix(map,T,point,height+2);
            if(!model)continue;
            // Exaggerate effects at regional zoom; these are NOT measured damage dimensions.
            const scale=Math.max(1,Math.min(90,Math.pow(2,10-zoom)*.8));
            fx.objects.rig.scale.setScalar(scale);
            animateFx(fx.objects,clock,i,reduced);
            fx.camera.projectionMatrix.copy(projection).multiply(model);
            try{fx.renderer.resetState();fx.renderer.render(fx.objects.scene,fx.camera);}
            catch(e){if(!state.fxError)state.fxError=String(e?.message||e);break;}
          }
        },
        onRemove(){
          const fx=state.fx3d;
          if(fx){
            fx.objects.scene.traverse(o=>{try{o.geometry?.dispose?.();}catch(_){}try{o.material?.dispose?.();}catch(_){}});
            try{fx.renderer.dispose();}catch(_){}
          }
          state.fx3d=null;
        }
      };
      map.addLayer(layer);
      state.fxError=null;
      map.triggerRepaint?.();
    }).catch(err=>{state.fxError=String(err?.message||err);console.warn('[BridgePoint Hostile Zones 3D]',err);})
      .finally(()=>{state.fxInstalling=false;});
  }

  function card(item){
    const provider=item.provider;
    const sourceUrl=urls[provider]||ACLED;
    return '<article class="bp-conflict-v1-card"><h3>⚠ '+htmlEscape(item.title)+'</h3>'+
      '<p><strong>'+htmlEscape(item.place)+'</strong></p>'+
      '<p>'+htmlEscape(item.description)+'</p>'+
      '<dl><dt>Category</dt><dd>Reported armed conflict / insecurity</dd>'+
      '<dt>Map date</dt><dd>'+REVIEWED+' (curated reference)</dd>'+
      '<dt>Region</dt><dd>Approximate broad affected area</dd>'+
      '<dt>Reporting</dt><dd><a href="'+htmlEscape(sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+htmlEscape(provider)+' conflict information</a></dd></dl>'+
      '<p class="bp-conflict-warning">This red boundary is a simplified overview, NOT a verified front line, territorial-control map, live strike feed, or travel safety assessment. Conditions change rapidly. The animated 3D fire, smoke, explosions and scorch marks are illustrative simulations, NOT observed destruction or real strike coordinates.</p>'+
      '<p>Also see <a href="'+CFR+'" target="_blank" rel="noopener noreferrer">CFR Global Conflict Tracker</a> and <a href="'+ACLED+'" target="_blank" rel="noopener noreferrer">ACLED 2026 Watchlist</a>.</p></article>';
  }
  function openCard(state,item){
    const Popup=window.maplibregl?.Popup;
    if(!Popup)return;
    state.popup?.remove();
    state.popup=new Popup({closeButton:true,closeOnClick:true,className:'bp-conflict-v1-popup',maxWidth:'430px'})
      .setLngLat(item.coordinates).setHTML(card(item)).addTo(state.map);
  }
  function setEnabled(state,enabled){
    state.enabled=!!enabled;
    const button=document.getElementById(BUTTON);
    if(button){button.setAttribute('aria-pressed',String(state.enabled));button.classList.toggle('is-active',state.enabled);}
    if(state.enabled)ensureLayers(state);
    else{state.popup?.remove();state.popup=null;stopFxTicker(state);}
    setVisibility(state);
  }
  function attach(map){
    if(!map||typeof map.addSource!=='function'||typeof map.on!=='function')return null;
    if(STATES.has(map))return STATES.get(map).api;
    ensureCss();
    const state={map,enabled:false,popup:null,error:null,retry:0,fxInstalling:false,fxTicker:null,fxError:null,fx3d:null};
    state.style=()=>{if(state.enabled)ensureLayers(state);};
    state.click=e=>{
      if(!state.enabled||!map.queryRenderedFeatures)return;
      const layerNames=[ICON_LAYER,DOT,FILL,BORDER].filter(id=>map.getLayer(id));
      if(!layerNames.length)return;
      const hits=map.queryRenderedFeatures(e.point,{layers:layerNames})||[];
      const item=hits.map(f=>BY_ID.get(String(f.properties?.id||''))).find(Boolean);
      if(item)openCard(state,item);
    };
    state.hover=e=>{
      if(!state.enabled||!map.getLayer(DOT))return;
      const hits=map.queryRenderedFeatures(e.point,{layers:[DOT]})||[];
      if(map.getCanvas())map.getCanvas().style.cursor=hits.length?'pointer':'';
    };
    map.on('click',state.click);map.on('mousemove',state.hover);
    map.on('load',state.style);map.on('style.load',state.style);
    STATES.set(map,state);stateSet.add(state);
    state.api={version:VERSION,regions:AREAS.length,
      get enabled(){return state.enabled},get status(){return {enabled:state.enabled,count:AREAS.length,error:state.error,fxReady:!!state.fx3d,fxError:state.fxError,reviewed:REVIEWED}},
      setEnabled:v=>setEnabled(state,v),toggle:()=>setEnabled(state,!state.enabled)};
    const retryButton=()=>{
      if(ensureButton(state))return;
      if(state.retry++<240)setTimeout(retryButton,500);
    };
    retryButton();
    return state.api;
  }
  function findMap(){
    const candidates=[
      window.__BP_V5000_WORLD__,window.__BP_V5000_WORLD,
      window.__bpWorldV2300,window.__BP_LANDING_WORLD__,window.__BP_LANDING_WORLD,
      window.__bpLandingWorldV5420
    ];
    for(const candidate of candidates){
      const map=candidate?.map||candidate;
      if(map&&typeof map.addSource==='function'&&typeof map.on==='function')return map;
    }
    return null;
  }
  const api={version:VERSION,reviewed:REVIEWED,regionCount:AREAS.length,attach,
    get stats(){return {count:AREAS.length,enabled:[...stateSet].some(s=>s.enabled),reviewed:REVIEWED}}};
  window[KEY]=api;
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const map=findMap();
    if(map){const state=attach(map);if(state&&document.getElementById(BUTTON)){clearInterval(timer);return;}}
    if(tries>=240)clearInterval(timer);
  },500);
  window.addEventListener('bp:world-map-ready-v5940',event=>{if(event.detail?.map)attach(event.detail.map);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{const map=findMap();if(map)attach(map);},{once:true});
  else{const map=findMap();if(map)attach(map);}
})();