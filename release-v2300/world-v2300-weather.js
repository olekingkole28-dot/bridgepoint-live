import{VERSION,EMPTY,MOBILE,LOW,TIER,edge,bbox,fc,clamp}from'./world-v2300-config.js';

const RADAR='https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity_time/ImageServer/WMSServer?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=1&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256';
const BUDGET={LOW:{precip:420,cloud:48,fire:72,smoke:88,storm:110,ash:32},MID:{precip:820,cloud:84,fire:150,smoke:180,storm:250,ash:64},HIGH:{precip:1450,cloud:140,fire:290,smoke:340,storm:520,ash:120}}[TIER]||{precip:820,cloud:84,fire:150,smoke:180,storm:250,ash:64};
const STRIDE=7,MAX_POINTS=LOW?1050:MOBILE?2300:3900,POINTS=new Float32Array(MAX_POINTS*STRIDE);
const RAD=Math.PI/180,EMPTY_SCENE={alerts:[],fires:[],earthquakes:[],storms:[],thermal:[],observations:[],lightning:[],burn_scars:[]};
const nowIso=()=>new Date().toISOString();
const hash=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x)};
const mod=(v,m)=>((v%m)+m)%m;
const text=x=>String(x??'').toLowerCase();

function add(map,l,before){try{if(!map.getLayer(l.id))map.addLayer(l,before&&map.getLayer(before)?before:undefined)}catch(e){console.warn('weather layer',l.id,e)}}
function source(map,id){return map.getSource(id)}
function geomFeature(g,p={}){return g?{type:'Feature',geometry:g,properties:p}:null}
function point(lng,lat,p={}){return Number.isFinite(+lng)&&Number.isFinite(+lat)?{type:'Feature',geometry:{type:'Point',coordinates:[+lng,+lat]},properties:p}:null}
function center(g){const pts=[];const walk=x=>{if(!Array.isArray(x))return;if(x.length>=2&&typeof x[0]==='number'&&typeof x[1]==='number'){pts.push(x);return}for(const y of x)walk(y)};walk(g?.coordinates);if(!pts.length)return null;let lng=0,lat=0;for(const p of pts){lng+=p[0];lat+=p[1]}return{lng:lng/pts.length,lat:lat/pts.length}}
function ring(lng,lat,rM,n=20,phase=0){const latM=111320,lngM=Math.max(20000,latM*Math.cos(lat*RAD)),a=[];for(let i=0;i<=n;i++){const t=i/n*Math.PI*2+phase;a.push([lng+Math.cos(t)*rM/lngM,lat+Math.sin(t)*rM/latM])}return a}
function polar(c,r,a){const latM=111320,lngM=Math.max(20000,latM*Math.cos(c.lat*RAD));return[c.lng+Math.cos(a)*r/lngM,c.lat+Math.sin(a)*r/latM]}
function segmentPoly(a,b,widthM){const lat=(a[1]+b[1])/2,latM=111320,lngM=Math.max(20000,latM*Math.cos(lat*RAD)),dx=(b[0]-a[0])*lngM,dy=(b[1]-a[1])*latM,L=Math.max(.001,Math.hypot(dx,dy)),nx=-dy/L*widthM/2,ny=dx/L*widthM/2,ox=nx/lngM,oy=ny/latM;return[[a[0]+ox,a[1]+oy],[b[0]+ox,b[1]+oy],[b[0]-ox,b[1]-oy],[a[0]-ox,a[1]-oy],[a[0]+ox,a[1]+oy]]}
function alertText(a){const p=a?.properties||{};return text([p.phenom,p.event,p.prod_type,p.headline,p.description].filter(Boolean).join(' '))}
function isFlood(a){const p=a?.properties||{},ph=String(p.phenom||'').toUpperCase();return['FF','FA','FL'].includes(ph)||/flood|flash flood/.test(alertText(a))}
function isIce(a){return/ice storm|freezing rain|freezing drizzle|winter storm|blizzard|heavy snow|snow squall/.test(alertText(a))}
function isTornado(a){const p=a?.properties||{};return String(p.phenom||'').toUpperCase()==='TO'||/tornado/.test(alertText(a))}
function inferPrecip(o){const s=text([o?.weather,o?.weather_text,o?.present_weather,o?.wx,o?.condition,o?.conditions].filter(Boolean).join(' '));if(/hail|ice pellet|graupel/.test(s))return'hail';if(/snow|flurr|blizzard|snow shower/.test(s))return'snow';if(/rain|drizzle|shower|thunderstorm/.test(s))return'rain';return'none'}
function ensure(map){
  for(const id of ['wx-alerts','wx-fires','wx-quakes','wx-storms','wx-thermal','wx-obs'])if(!map.getSource(id))map.addSource(id,{type:'geojson',data:EMPTY});
  if(!map.getSource('wx-radar'))try{map.addSource('wx-radar',{type:'raster',tiles:[RADAR],tileSize:256,minzoom:3,maxzoom:12,attribution:'NOAA/NWS radar'})}catch(_){}
  add(map,{id:'wx-radar',type:'raster',source:'wx-radar',layout:{visibility:'none'},paint:{'raster-opacity':LOW?.43:.56,'raster-fade-duration':0}},'gta-road-major-glow');
  add(map,{id:'wx-alert-fill',type:'fill',source:'wx-alerts',paint:{'fill-color':['match',['upcase',['coalesce',['get','phenom'],'']],'TO','#ff3c6e','SV','#ffb84a','FF','#34d7ff','FA','#34d7ff','HU','#d764ff','TR','#d764ff','#ff9a56'],'fill-opacity':.16}},'gta-road-major-glow');
  add(map,{id:'wx-alert-line',type:'line',source:'wx-alerts',paint:{'line-color':['match',['upcase',['coalesce',['get','phenom'],'']],'TO','#ff3c6e','SV','#ffb84a','FF','#34d7ff','FA','#34d7ff','HU','#d764ff','TR','#d764ff','#ff9a56'],'line-width':['interpolate',['linear'],['zoom'],3,1.1,10,2.2,17,3.8],'line-opacity':.9}},'gta-road-major-glow');
  add(map,{id:'wx-fire-fill',type:'fill',source:'wx-fires',paint:{'fill-color':'#ff4f29','fill-opacity':.15}},'gta-exact-building');
  add(map,{id:'wx-fire-line',type:'line',source:'wx-fires',paint:{'line-color':'#ff7c3d','line-width':['interpolate',['linear'],['zoom'],4,1,14,3,19,5],'line-opacity':.95,'line-blur':.4}},'gta-exact-building');
  add(map,{id:'wx-thermal',type:'heatmap',source:'wx-thermal',maxzoom:15,paint:{'heatmap-weight':['interpolate',['linear'],['coalesce',['get','frp'],0],0,.2,80,1],'heatmap-intensity':['interpolate',['linear'],['zoom'],4,.4,12,1.2],'heatmap-radius':['interpolate',['linear'],['zoom'],4,5,12,18],'heatmap-opacity':.68}},'gta-exact-building');
  add(map,{id:'wx-quake-glow',type:'circle',source:'wx-quakes',paint:{'circle-radius':['interpolate',['linear'],['coalesce',['get','magnitude'],0],0,4,3,9,6,18],'circle-color':'#ff4fd6','circle-opacity':.22,'circle-blur':.7}},'gta-exact-building');
  add(map,{id:'wx-quake',type:'circle',source:'wx-quakes',paint:{'circle-radius':['interpolate',['linear'],['coalesce',['get','magnitude'],0],0,2,3,5,6,11],'circle-color':'#fff0fa','circle-stroke-color':'#ff4fd6','circle-stroke-width':2,'circle-opacity':.95}},'gta-exact-building');
  add(map,{id:'wx-storm-glow',type:'circle',source:'wx-storms',paint:{'circle-radius':['interpolate',['linear'],['coalesce',['get','wind_mph'],0],0,7,75,18,150,30],'circle-color':'#b555ff','circle-opacity':.2,'circle-blur':.75}},'gta-exact-building');
  add(map,{id:'wx-storm',type:'circle',source:'wx-storms',paint:{'circle-radius':7,'circle-color':'#e8c9ff','circle-stroke-color':'#b555ff','circle-stroke-width':2}},'gta-exact-building');
  add(map,{id:'wx-obs',type:'circle',source:'wx-obs',minzoom:6,paint:{'circle-radius':['interpolate',['linear'],['zoom'],6,1.5,12,3.2],'circle-color':['interpolate',['linear'],['coalesce',['get','temperature_f'],60],0,'#70b8ff',55,'#d4f7ff',80,'#ffcf7e',105,'#ff5c48'],'circle-opacity':.72}},'gta-exact-building');
}

function createWeatherFX(map){
  if(window.__bpWeatherFXV2300)return window.__bpWeatherFXV2300;
  let scene={...EMPTY_SCENE},enabled=true,moving=false,quality=1,fps=60,shaderReady=false,activeParticles=0,lastWater=0,waterHazard=false,perfBad=0,perfGood=0,lastRaf=0,repaintTimer=0,glRef=null,program=null,buffer=null,attrs=null,dpr=1,generatedAt=null;
  const nativeIds=['bp2300-fx-flood-fill','bp2300-fx-flood-line','bp2300-fx-ice-fill','bp2300-fx-ice-line','bp2300-fx-burn','bp2300-fx-containment','bp2300-fx-tornado','bp2300-fx-hurricane'];
  const sourceIds=['bp2300-fx-flood','bp2300-fx-ice','bp2300-fx-burn','bp2300-fx-containment','bp2300-fx-tornado-src','bp2300-fx-hurricane-src'];

  function ensureNative(){
    for(const id of sourceIds)if(!map.getSource(id))try{map.addSource(id,{type:'geojson',data:EMPTY})}catch(_){}
    const before=map.getLayer('gta-selected-body')?'gta-selected-body':undefined;
    add(map,{id:'bp2300-fx-flood-fill',type:'fill',source:'bp2300-fx-flood',paint:{'fill-color':'#1fb8ff','fill-opacity':.14}},before);
    add(map,{id:'bp2300-fx-flood-line',type:'line',source:'bp2300-fx-flood',paint:{'line-color':'#75e5ff','line-width':['interpolate',['linear'],['zoom'],4,1.2,16,4],'line-opacity':.82,'line-blur':.5}},before);
    add(map,{id:'bp2300-fx-ice-fill',type:'fill',source:'bp2300-fx-ice',paint:{'fill-color':'#dff9ff','fill-opacity':.11}},before);
    add(map,{id:'bp2300-fx-ice-line',type:'line',source:'bp2300-fx-ice',paint:{'line-color':'#c7f8ff','line-width':['interpolate',['linear'],['zoom'],4,.8,16,2.6],'line-opacity':.8,'line-dasharray':[2,1.5]}},before);
    add(map,{id:'bp2300-fx-burn',type:'fill',source:'bp2300-fx-burn',paint:{'fill-color':'#1b1110','fill-opacity':.42}},before);
    add(map,{id:'bp2300-fx-containment',type:'line',source:'bp2300-fx-containment',paint:{'line-color':['interpolate',['linear'],['coalesce',['to-number',['get','contained_pct']],0],0,'#ff3b1f',50,'#ffb02d',100,'#75ff8a'],'line-width':['interpolate',['linear'],['zoom'],5,1.4,15,4.5,19,6],'line-opacity':.96}},before);
    add(map,{id:'bp2300-fx-tornado',type:'fill-extrusion',source:'bp2300-fx-tornado-src',paint:{'fill-extrusion-base':['get','base'],'fill-extrusion-height':['get','top'],'fill-extrusion-color':['interpolate',['linear'],['get','u'],0,'#282e32',1,'#aeb8bc'],'fill-extrusion-opacity':['interpolate',['linear'],['get','u'],0,.58,1,.18],'fill-extrusion-vertical-gradient':true}},before);
    add(map,{id:'bp2300-fx-hurricane',type:'fill-extrusion',source:'bp2300-fx-hurricane-src',paint:{'fill-extrusion-base':['get','base'],'fill-extrusion-height':['get','top'],'fill-extrusion-color':['interpolate',['linear'],['get','u'],0,'#8ca2ad',.5,'#c8dbe2',1,'#eef9fc'],'fill-extrusion-opacity':['interpolate',['linear'],['get','u'],0,.16,1,.055],'fill-extrusion-vertical-gradient':true}},before);
  }

  function setSource(id,data){try{map.getSource(id)?.setData(data)}catch(_){}}
  function stormFeatures(){
    const fs=[],storms=(scene.storms||[]).filter(s=>Number.isFinite(+s.lng)&&Number.isFinite(+s.lat)).slice(0,LOW?2:MOBILE?4:7),arms=LOW?3:5,segs=LOW?6:TIER==='HIGH'?11:8;
    for(const s of storms){const c={lng:+s.lng,lat:+s.lat},wind=clamp(+s.wind_mph||+s.windMph||70,30,190),eye=clamp((+s.eye_radius_mi||+s.eyeRadiusMiles||12)*1609.344,4500,70000),outer=clamp(85000+wind*930,105000,270000);for(let a=0;a<arms;a++)for(let i=0;i<segs;i++){const u0=i/segs,u1=(i+1)/segs,r0=eye+u0*(outer-eye),r1=eye+u1*(outer-eye),ang0=a*Math.PI*2/arms+u0*6.2,ang1=a*Math.PI*2/arms+u1*6.2,p0=polar(c,r0,ang0),p1=polar(c,r1,ang1),width=clamp(8000+u1*16000,8000,26000),base=700+u0*450,top=base+clamp(850+wind*8+u1*1200,1000,3600);fs.push({type:'Feature',geometry:{type:'Polygon',coordinates:[segmentPoly(p0,p1,width)]},properties:{base,top,u:u1,wind,name:s.name||'Tropical cyclone'}})}}
    return fc(fs)
  }
  function tornadoFeatures(){
    const fs=[],alerts=(scene.alerts||[]).filter(isTornado).slice(0,LOW?3:MOBILE?6:10),levels=LOW?6:9;
    for(const a of alerts){const c=center(a.geometry);if(!c)continue;for(let i=0;i<levels;i++){const u=i/(levels-1),r=45+u*220,base=u*850,top=base+130;fs.push({type:'Feature',geometry:{type:'Polygon',coordinates:[ring(c.lng,c.lat,r,LOW?14:20,i*.33)]},properties:{base,top,u}})}}return fc(fs)
  }
  function updateNative(){
    ensureNative();
    setSource('bp2300-fx-flood',fc((scene.alerts||[]).filter(isFlood).map(a=>geomFeature(a.geometry,{kind:'flood-warning',source:a?.properties?.source||'NOAA/NWS'}))));
    setSource('bp2300-fx-ice',fc((scene.alerts||[]).filter(isIce).map(a=>geomFeature(a.geometry,{kind:'ice-risk',source:a?.properties?.source||'NOAA/NWS'}))));
    const burn=scene.burn_scars||scene.burnScars||[];setSource('bp2300-fx-burn',fc(burn.map(x=>geomFeature(x.geometry||x,{source:x.source||'authoritative-burn-scar'}))));
    setSource('bp2300-fx-containment',fc((scene.fires||[]).map(x=>geomFeature(x.geometry,{contained_pct:+x.contained_pct||0,name:x.name||'',source:x.source||''}))));
    setSource('bp2300-fx-tornado-src',tornadoFeatures());setSource('bp2300-fx-hurricane-src',stormFeatures());
    waterHazard=(scene.alerts||[]).some(isFlood)||(scene.storms||[]).length>0;
    map.triggerRepaint();
  }

  function nearestObs(){const a=scene.observations||[];if(!a.length)return null;const c=map.getCenter();let best=null,bd=Infinity;for(const o of a){if(!Number.isFinite(+o.lng)||!Number.isFinite(+o.lat))continue;const dx=(+o.lng-c.lng)*Math.cos(c.lat*RAD),dy=+o.lat-c.lat,d=dx*dx+dy*dy;if(d<bd){bd=d;best=o}}return best}
  function wind(o){const speed=Number(o?.wind_speed_mph??(Number.isFinite(+o?.wind_speed_kt)?+o.wind_speed_kt*1.15078:0))||0,dir=Number(o?.wind_dir_deg)||0,toward=(dir+180-(map.getBearing?.()||0))*RAD,strength=clamp(speed/55,0,2.6);return{x:Math.sin(toward)*strength,y:-Math.cos(toward)*strength,speed,dir}}
  function project(c){if(!c)return null;try{const p=map.project([c.lng,c.lat]),cv=map.getCanvas(),w=cv.clientWidth||1,h=cv.clientHeight||1;if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<-180||p.x>w+180||p.y<-180||p.y>h+180)return null;return{x:p.x,y:p.y,w,h}}catch(_){return null}}
  function radiusPx(c,miles){try{const p=project(c);if(!p)return 0;const dlng=miles/(69.172*Math.max(.18,Math.cos(c.lat*RAD))),q=map.project([c.lng+dlng,c.lat]);return Math.abs(q.x-p.x)}catch(_){return 0}}
  function push(px,py,size,kind,alpha,phase,aux,w,h,count){if(count>=MAX_POINTS||px<-size||py<-size||px>w+size||py>h+size)return count;const o=count*STRIDE;POINTS[o]=px/w*2-1;POINTS[o+1]=1-py/h*2;POINTS[o+2]=size;POINTS[o+3]=kind;POINTS[o+4]=alpha;POINTS[o+5]=phase;POINTS[o+6]=aux;return count+1}

  function buildParticles(t){
    if(!enabled||document.hidden){activeParticles=0;return 0}const cv=map.getCanvas(),w=cv.clientWidth||1,h=cv.clientHeight||1,z=map.getZoom(),moveScale=moving?.42:1,q=clamp(quality*moveScale,.22,1),o=nearestObs(),wv=wind(o);let n=0;
    const precip=inferPrecip(o);if(z>=5.2&&precip!=='none'){
      const k=precip==='rain'?0:precip==='snow'?1:2,count=Math.floor(BUDGET.precip*q),speed=precip==='snow'?.000055:precip==='hail'?.00034:.00023;
      for(let i=0;i<count&&n<MAX_POINTS;i++){const sx=hash(i+13),sy=hash(i+931),phase=hash(i+501),u=mod(sy+t*speed*(.55+phase*.85),1),drift=wv.x*(precip==='snow'?24:38)*(t/1000),flutter=precip==='snow'?Math.sin(t*.0014+phase*19)*16:0;let px=mod(sx*w+drift+flutter,w),py=u*h;if(precip==='hail'&&u>.86){const bu=(u-.86)/.14;py=h*.86-Math.sin(bu*Math.PI)*18}const size=precip==='rain'?5.5+wv.speed*.08:precip==='snow'?4+phase*4:3.4+phase*2.8;n=push(px,py,size,k,precip==='rain'?.58:precip==='snow'?.78:.88,phase,clamp(wv.x*.32,-.75,.75),w,h,n)}
    }
    const cloud=clamp(Number(o?.cloud_fraction??o?.cloud_cover_fraction??0),0,1);if(z>=3.2&&cloud>.08){const count=Math.floor(BUDGET.cloud*q*cloud);for(let i=0;i<count&&n<MAX_POINTS;i++){const p=hash(i+2301),s=hash(i+811),px=mod(p*w+t*.003*(8+wv.x*4),w),py=(.04+s*.58)*h,size=(65+hash(i+444)*115)*(LOW?.72:1),alpha=(.025+.075*cloud)*(1-.22*s);n=push(px,py,size,5,alpha,p,0,w,h,n)}}
    const fires=(scene.fires||[]).map(x=>({x,c:center(x.geometry)})).filter(x=>x.c).map(x=>({...x,p:project(x.c)})).filter(x=>x.p).slice(0,LOW?4:MOBILE?7:12);if(z>=4.5&&fires.length){const fireEach=Math.max(8,Math.floor(BUDGET.fire*q/fires.length)),smokeEach=Math.max(8,Math.floor(BUDGET.smoke*q/fires.length)),ashEach=Math.max(0,Math.floor(BUDGET.ash*q/fires.length));for(let fi=0;fi<fires.length;fi++){const {x,p}=fires[fi],acres=Math.max(1,+x.acres||1),r=clamp(7+Math.log10(acres+1)*9+(z-5)*1.4,7,62);for(let i=0;i<fireEach&&n<MAX_POINTS;i++){const ph=hash(i+fi*173+9),rise=mod(ph+t*.0005*(.7+hash(i+77)),1),ang=hash(i+31)*Math.PI*2,rr=r*Math.sqrt(hash(i+91))*(1-rise*.45),px=p.x+Math.cos(ang)*rr+wv.x*rise*3,py=p.y-Math.sin(ang)*rr*.28-rise*r*1.35,size=clamp(4+r*(.13+.18*(1-rise)),4,28);n=push(px,py,size,3,.9*(1-rise*.45),ph,0,w,h,n)}for(let i=0;i<smokeEach&&n<MAX_POINTS;i++){const ph=hash(i+fi*211+500),rise=mod(ph+t*.000105*(.65+hash(i+130)),1),ang=hash(i+611)*Math.PI*2,rr=r*(.2+rise*.7)*hash(i+701),px=p.x+Math.cos(ang)*rr+wv.x*rise*r*.9,py=p.y-r*.8-rise*r*2.25+Math.sin(ang)*rr*.3,size=clamp(10+r*(.22+.42*rise),10,64);n=push(px,py,size,4,.28*(1-rise*.58),ph,0,w,h,n)}if(z>=8)for(let i=0;i<ashEach&&n<MAX_POINTS;i++){const ph=hash(i+fi*97+1200),rise=mod(ph+t*.00008,1),px=p.x+(hash(i+73)-.5)*r*2+wv.x*rise*r,py=p.y-rise*r*2+(hash(i+17)-.5)*r;n=push(px,py,1.8+hash(i+3)*2.6,7,.48*(1-rise*.5),ph,0,w,h,n)}}}
    const storms=(scene.storms||[]).filter(s=>Number.isFinite(+s.lng)&&Number.isFinite(+s.lat)).map(s=>({s,c:{lng:+s.lng,lat:+s.lat}})).map(x=>({...x,p:project(x.c)})).filter(x=>x.p).slice(0,LOW?2:MOBILE?4:7);if(storms.length){const each=Math.max(20,Math.floor(BUDGET.storm*q/storms.length));for(let si=0;si<storms.length;si++){const {s,c,p}=storms[si],windMph=clamp(+s.wind_mph||+s.windMph||70,30,190),eye=Math.max(6,radiusPx(c,clamp(+s.eye_radius_mi||+s.eyeRadiusMiles||12,3,45))),outer=clamp(radiusPx(c,clamp(65+windMph*.55,70,170)),42,220);for(let i=0;i<each&&n<MAX_POINTS;i++){const u=.08+hash(i+si*311)*.92,arm=i%5,ang=t*.00016+arm*Math.PI*2/5+u*6.7,r=eye+u*(outer-eye),px=p.x+Math.cos(ang)*r,py=p.y+Math.sin(ang)*r*.62,size=2.4+u*4.2;n=push(px,py,size,6,.12+.18*u,hash(i+99),0,w,h,n)}}}
    const strikes=(scene.lightning||scene.strikes||[]).slice(0,LOW?8:24);for(let i=0;i<strikes.length&&n<MAX_POINTS;i++){const s=strikes[i],p=project({lng:+(s.lng??s.longitude),lat:+(s.lat??s.latitude)});if(!p)continue;const age=Math.max(0,Date.now()-Date.parse(s.time||s.observed_at||s.timestamp||generatedAt||nowIso())),pulse=age<1200?1:age<5000?.28:0;if(pulse>0)n=push(p.x,p.y,32+hash(i+7)*34,8,pulse,hash(i+19),0,w,h,n)}
    activeParticles=n;return n
  }

  function compile(gl,type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'weather shader compile');return sh}
  function initGL(gl){
    const webgl2=typeof WebGL2RenderingContext!=='undefined'&&gl instanceof WebGL2RenderingContext;
    const vs=webgl2?`#version 300 es\nprecision mediump float;in vec2 a_pos;in float a_size;in float a_kind;in float a_alpha;in float a_phase;in float a_aux;uniform float u_dpr;out float v_kind;out float v_alpha;out float v_phase;out float v_aux;void main(){gl_Position=vec4(a_pos,0.0,1.0);gl_PointSize=max(1.0,a_size*u_dpr);v_kind=a_kind;v_alpha=a_alpha;v_phase=a_phase;v_aux=a_aux;}`:`precision mediump float;attribute vec2 a_pos;attribute float a_size;attribute float a_kind;attribute float a_alpha;attribute float a_phase;attribute float a_aux;uniform float u_dpr;varying float v_kind;varying float v_alpha;varying float v_phase;varying float v_aux;void main(){gl_Position=vec4(a_pos,0.0,1.0);gl_PointSize=max(1.0,a_size*u_dpr);v_kind=a_kind;v_alpha=a_alpha;v_phase=a_phase;v_aux=a_aux;}`;
    const body=`precision mediump float;${webgl2?'in':'varying'} float v_kind;${webgl2?'in':'varying'} float v_alpha;${webgl2?'in':'varying'} float v_phase;${webgl2?'in':'varying'} float v_aux;${webgl2?'out vec4 outColor;':''}void main(){vec2 q=gl_PointCoord-vec2(.5);float a=0.0;vec3 c=vec3(1.0);if(v_kind<.5){float x=q.x+v_aux*q.y;a=(1.0-smoothstep(.035,.11,abs(x)))*(1.0-smoothstep(.17,.5,abs(q.y)));c=vec3(.48,.72,.84);}else if(v_kind<1.5){float d=length(q);a=(1.0-smoothstep(.28,.49,d))*(.72+.18*sin(v_phase*21.0));c=vec3(.96,.99,1.0);}else if(v_kind<2.5){float d=length(q);a=1.0-smoothstep(.28,.49,d);c=vec3(.82,.95,1.0);}else if(v_kind<3.5){float d=length(vec2(q.x*.82,q.y));a=(1.0-smoothstep(.18,.5,d));float y=clamp(gl_PointCoord.y,0.0,1.0);c=mix(vec3(1.0,.12,.02),mix(vec3(1.0,.48,.03),vec3(1.0,.98,.78),y),smoothstep(.12,.88,y));}else if(v_kind<4.5){float d=length(q);a=(1.0-smoothstep(.12,.5,d))*.76;c=mix(vec3(.16,.18,.19),vec3(.48,.51,.52),clamp(v_phase,0.0,1.0));}else if(v_kind<5.5){float d=length(vec2(q.x,q.y*.72));a=(1.0-smoothstep(.08,.5,d))*.72;c=vec3(.72,.78,.80);}else if(v_kind<6.5){float d=length(q);a=(1.0-smoothstep(.18,.5,d));c=vec3(.80,.92,.97);}else if(v_kind<7.5){float d=length(vec2(q.x*.45,q.y));a=1.0-smoothstep(.2,.5,d);c=vec3(.08,.07,.065);}else{float x=abs(q.x+sin(q.y*17.0+v_phase*6.28)*.08);a=(1.0-smoothstep(.02,.1,x))*(1.0-smoothstep(.42,.5,abs(q.y)));c=vec3(.94,.99,1.0);}a*=v_alpha;if(a<.008)discard;${webgl2?'outColor':'gl_FragColor'}=vec4(c,a);}`;
    const fs=webgl2?`#version 300 es\n${body}`:body;program=gl.createProgram();gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'weather program link');buffer=gl.createBuffer();attrs={pos:gl.getAttribLocation(program,'a_pos'),size:gl.getAttribLocation(program,'a_size'),kind:gl.getAttribLocation(program,'a_kind'),alpha:gl.getAttribLocation(program,'a_alpha'),phase:gl.getAttribLocation(program,'a_phase'),aux:gl.getAttribLocation(program,'a_aux'),dpr:gl.getUniformLocation(program,'u_dpr')};shaderReady=true;glRef=gl
  }
  function deleteGL(gl){try{if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program)}catch(_){}buffer=null;program=null;shaderReady=false;glRef=null}
  const gpuLayer={id:'bp2300-weather-fx-gpu',type:'custom',renderingMode:'2d',onAdd(_m,gl){try{initGL(gl)}catch(e){console.warn('V2300 weather GPU init',e);shaderReady=false}},onRemove(_m,gl){deleteGL(gl)},render(gl){if(!enabled||!shaderReady)return;const t=performance.now(),n=buildParticles(t);if(!n)return;dpr=Math.max(1,gl.drawingBufferWidth/Math.max(1,map.getCanvas().clientWidth));gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,POINTS.subarray(0,n*STRIDE),gl.DYNAMIC_DRAW);const stride=STRIDE*4;for(const [loc,size,off] of [[attrs.pos,2,0],[attrs.size,1,2],[attrs.kind,1,3],[attrs.alpha,1,4],[attrs.phase,1,5],[attrs.aux,1,6]]){if(loc<0)continue;gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,off*4)}gl.uniform1f(attrs.dpr,dpr);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.POINTS,0,n);gl.depthMask(true);gl.bindBuffer(gl.ARRAY_BUFFER,null);gl.useProgram(null)}};

  function installGPU(){if(!map.getLayer(gpuLayer.id))try{map.addLayer(gpuLayer)}catch(e){console.warn('V2300 weather custom layer',e)}}
  function tickWater(t){if(t-lastWater<800)return;lastWater=t;try{if(map.getLayer('gta-water')){const pulse=waterHazard?.96+.025*Math.sin(t*.003):.98;map.setPaintProperty('gta-water','fill-opacity',pulse);map.setPaintProperty('gta-water','fill-color',waterHazard?'#0a3047':'#071f31')}}catch(_){}
  }
  function schedule(){clearTimeout(repaintTimer);if(!enabled||document.hidden)return;const ms=LOW?50:MOBILE?34:TIER==='HIGH'?18:26;repaintTimer=setTimeout(()=>{if(enabled&&!document.hidden){tickWater(performance.now());map.triggerRepaint();schedule()}},ms)}
  function perfLoop(t){if(lastRaf){const inst=1000/Math.max(5,t-lastRaf);fps=fps*.92+Math.min(60,inst)*.08;if(fps<(MOBILE?43:50)){perfBad++;perfGood=0}else if(fps>55){perfGood++;perfBad=Math.max(0,perfBad-2)}else{perfBad=Math.max(0,perfBad-1);perfGood=Math.max(0,perfGood-1)}if(perfBad>75){quality=clamp(quality*.82,.28,1);perfBad=0}else if(perfGood>260&&quality<1){quality=clamp(quality+.08,.28,1);perfGood=0}}lastRaf=t;requestAnimationFrame(perfLoop)}
  function setScene(next={},meta={}){scene={...EMPTY_SCENE,...next};generatedAt=meta.generated_at||next.generated_at||generatedAt||nowIso();updateNative();schedule();return api.state}
  function setEnabled(v){enabled=!!v;for(const id of nativeIds)try{map.setLayoutProperty(id,'visibility',enabled?'visible':'none')}catch(_){}if(enabled){schedule();map.triggerRepaint()}else{clearTimeout(repaintTimer);activeParticles=0}return enabled}
  map.on('movestart',()=>{moving=true});map.on('moveend',()=>{moving=false;schedule()});document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(repaintTimer);else schedule()});
  ensureNative();installGPU();requestAnimationFrame(perfLoop);schedule();
  const api={version:VERSION,setScene,setEnabled,refreshNative:updateNative,get scene(){return scene},get state(){return{enabled,moving,tier:TIER,mobile:MOBILE,low:LOW,qualityScale:+quality.toFixed(2),fps:+fps.toFixed(1),shaderReady,activeParticles,secondaryCanvases:0,sharedMapLibreWebGLContext:true,budgets:{...BUDGET,maxPoints:MAX_POINTS},capabilities:{atmosphereFogClouds:true,rainSnowHail:true,tornadoCone:true,hurricaneSpiralEye:true,lightning:true,earthquakeLayer:true,floodIce:true,wildfireFlameParticles:true,smoke:true,ash:true,authoritativeBurnScarOnly:true,thermalContainment:true,dynamicWater:true,adaptiveLOD:true,viewportCulling:true},generatedAt}}};window.__bpWeatherFXV2300=api;return api
}

export function initWeather(map){
  if(window.__bpWeatherV2300)return window.__bpWeatherV2300;ensure(map);const fx=createWeatherFX(map);
  let active=true,radar=false,timer=0,last=0,abort=0,scene={...EMPTY_SCENE};
  function setData(id,data){try{source(map,id)?.setData(data)}catch(_){}}
  function nearest(obs){if(!obs?.length)return null;const c=map.getCenter();let best=null,dist=Infinity;for(const o of obs){if(!Number.isFinite(+o.lng)||!Number.isFinite(+o.lat))continue;const d=(+o.lng-c.lng)**2+(+o.lat-c.lat)**2;if(d<dist){dist=d;best=o}}return best}
  function atmosphere(obs){
    const best=nearest(obs);if(!best)return;const cloud=clamp(Number(best.cloud_fraction??best.cloud_cover_fraction??0),0,1),visibility=clamp(Number(best.visibility_mi??10),.05,50),cond=text([best.weather,best.weather_text,best.condition,best.conditions].filter(Boolean).join(' ')),storm=cloud>.78||/thunder|storm|squall|tornado|hurricane/.test(cond),heavyFog=visibility<1;
    try{map.setSky({'sky-color':storm?'#26313b':heavyFog?'#68777c':'#102d3e','horizon-color':storm?'#53606a':heavyFog?'#849196':'#31515e','fog-color':storm?'#69747d':heavyFog?'#9aa4a6':'#718a92','sky-horizon-blend':heavyFog?.035:.18,'horizon-fog-blend':heavyFog?.25:.04,'fog-ground-blend':heavyFog?.08:0,'atmosphere-blend':['interpolate',['linear'],['zoom'],0,.5+cloud*.25,6,.22+cloud*.18,10,heavyFog?.08:0]});map.setLight({anchor:'map',color:storm?'#9faab2':heavyFog?'#c4cccd':'#e5f7ff',intensity:storm?.27:heavyFog?.34:.48,position:[1.2,205,38]})}catch(_){}
  }
  async function refresh(force=false){
    if(!active)return;const now=Date.now();if(!force&&now-last<45000)return;last=now;const id=++abort,b=bbox(map,.12),z=map.getZoom();
    try{
      const d=await edge('bridgepoint-world-effects-v2190',{west:b.west,south:b.south,east:b.east,north:b.north,zoom:z,modes:['all']},14500);if(id!==abort)return;
      scene={alerts:d.alerts||[],fires:d.fires||[],earthquakes:d.earthquakes||[],storms:d.storms||[],thermal:d.thermal||[],observations:d.observations||[],lightning:d.lightning||d.strikes||[],burn_scars:d.burn_scars||d.burnScars||[],generated_at:d.generated_at,sources:d.sources||[]};
      setData('wx-alerts',fc(scene.alerts.map(x=>geomFeature(x.geometry,{...(x.properties||{}),source:x?.properties?.source||'NOAA/NWS'}))));
      setData('wx-fires',fc(scene.fires.map(x=>geomFeature(x.geometry,{id:x.id,name:x.name,acres:x.acres,contained_pct:x.contained_pct,source:x.source}))));
      setData('wx-quakes',fc(scene.earthquakes.map(x=>point(x.lng,x.lat,x))));setData('wx-storms',fc(scene.storms.map(x=>point(x.lng,x.lat,x))));setData('wx-thermal',fc(scene.thermal.map(x=>point(x.lng,x.lat,x))));setData('wx-obs',fc(scene.observations.map(x=>point(x.lng,x.lat,x))));
      atmosphere(scene.observations);fx.setScene(scene,{generated_at:d.generated_at});
      window.dispatchEvent(new CustomEvent('bp2300:weather-updated',{detail:{generated_at:d.generated_at,sources:d.sources||[],scene,counts:{alerts:scene.alerts.length,fires:scene.fires.length,quakes:scene.earthquakes.length,storms:scene.storms.length,thermal:scene.thermal.length,observations:scene.observations.length,lightning:scene.lightning.length,burnScars:scene.burn_scars.length},fx:fx.state}}));
    }catch(e){console.warn('V2300 weather',e)}
  }
  function setRadar(on){radar=!!on;try{map.setLayoutProperty('wx-radar','visibility',radar?'visible':'none')}catch(_){}const b=document.querySelector('[data-layer="radar"]');if(b)b.classList.toggle('active',radar)}
  function setActive(on){active=!!on;for(const id of ['wx-alert-fill','wx-alert-line','wx-fire-fill','wx-fire-line','wx-thermal','wx-quake-glow','wx-quake','wx-storm-glow','wx-storm','wx-obs'])try{map.setLayoutProperty(id,'visibility',active?'visible':'none')}catch(_){}fx.setEnabled(active);if(active)refresh(true)}
  map.on('moveend',()=>{clearTimeout(timer);timer=setTimeout(()=>refresh(false),LOW?700:350)});map.on('zoomend',()=>refresh(false));
  document.querySelector('[data-layer="radar"]')?.addEventListener('click',e=>setRadar(e.currentTarget.classList.contains('active')));document.querySelector('[data-layer="signals"]')?.addEventListener('click',e=>setActive(e.currentTarget.classList.contains('active')));
  refresh(true);setInterval(()=>document.querySelector('[data-surface="map"]')?.classList.contains('active')&&refresh(false),60000);
  const api={version:VERSION,refresh,setRadar,setActive,fx,getScene:()=>scene,get state(){return{active,radar,last,fx:fx.state,counts:{alerts:scene.alerts?.length||0,fires:scene.fires?.length||0,storms:scene.storms?.length||0,observations:scene.observations?.length||0}}}};window.__bpWeatherV2300=api;return api;
}
