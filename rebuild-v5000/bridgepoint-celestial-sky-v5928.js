const VERSION=5928;
const ROOT='bp-celestial-sky-v5928';
const STYLE='bp-celestial-sky-style-v5928';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rad=Math.PI/180,deg=180/Math.PI,wrap=d=>((d%360)+360)%360;
const stars=[
 ['Sirius',6.7525,-16.716, -1.46],['Canopus',6.3992,-52.6957,-.74],['Arcturus',14.261,19.1825,-.05],
 ['Vega',18.6156,38.7837,.03],['Capella',5.2782,45.998,.08],['Rigel',5.2423,-8.2016,.13],
 ['Procyon',7.655,-5.225,.34],['Betelgeuse',5.9195,7.407,.42],['Achernar',1.6286,-57.2368,.46],
 ['Hadar',14.0637,-60.373,.61],['Altair',19.8464,8.8683,.77],['Acrux',12.4433,-63.0991,.76],
 ['Aldebaran',4.5987,16.5093,.85],['Spica',13.4199,-11.1614,.97],['Antares',16.4901,-26.432,.96],
 ['Pollux',7.7553,28.0262,1.14],['Fomalhaut',22.9608,-29.6222,1.16],['Deneb',20.6905,45.2803,1.25],
 ['Regulus',10.1395,11.9672,1.35],['Castor',7.5767,31.8883,1.58],['Bellatrix',5.4189,6.3497,1.64],
 ['Alnilam',5.6036,-1.2019,1.69],['Polaris',2.5303,89.2641,1.98],['Dubhe',11.0621,61.7508,1.79],
 ['Mirfak',3.4054,49.8612,1.79],['Shaula',17.5601,-37.1038,1.63],['Mintaka',5.5334,-0.2991,2.23],
 ['Alkaid',13.7923,49.3133,1.86],['Mizar',13.3987,54.9254,2.23],['Gacrux',12.5194,-57.1132,1.59],
 ['Kochab',14.8451,74.1555,2.08],['Algol',3.1361,40.9556,2.12],['Denebola',11.8177,14.5721,2.14],
 ['Sadr',20.3705,40.2567,2.23],['Elnath',5.4382,28.6075,1.65],['Alpheratz',0.1398,29.0904,2.06]
];
const planets=[
 {name:'Mercury',n:48.3313,nd:.0000324587,i:7.0047,id:.00000005,w:29.1241,wd:.0000101444,a:.387098,e:.205635,ed:.000000000559,m:168.6562,md:4.0923344368,color:'#d4c6ae',size:2.2},
 {name:'Venus',n:76.6799,nd:.0000246590,i:3.3946,id:.0000000275,w:54.8910,wd:.0000138374,a:.723330,e:.006773,ed:-.000000001302,m:48.0052,md:1.6021302244,color:'#fff1c7',size:3.4},
 {name:'Mars',n:49.5574,nd:.0000211081,i:1.8497,id:-.0000000178,w:286.5016,wd:.0000292961,a:1.523688,e:.093405,ed:.000000002516,m:18.6021,md:.5240207766,color:'#ff9475',size:3.1},
 {name:'Jupiter',n:100.4542,nd:.0000276854,i:1.3030,id:-.0000001557,w:273.8777,wd:.0000164505,a:5.20256,e:.048498,ed:.000000004469,m:19.8950,md:.0830853001,color:'#ffe2b4',size:4},
 {name:'Saturn',n:113.6634,nd:.0000238980,i:2.4886,id:-.0000001081,w:339.3939,wd:.0000297661,a:9.55475,e:.055546,ed:-.000000009499,m:316.9670,md:.0334442282,color:'#f2d6a0',size:3.6}
];
const CSS=[
 '#bp-celestial-sky-v5928{position:absolute;inset:0;width:100%;height:100%;z-index:9;pointer-events:none;display:block}',
 '@media(prefers-reduced-motion:reduce){#bp-celestial-sky-v5928{opacity:.95}}'
].join('\n');
function ensureStyle(){if(document.getElementById(STYLE))return;const s=document.createElement('style');s.id=STYLE;s.textContent=CSS;document.head.appendChild(s)}
function julianDate(date){return date.getTime()/86400000+2440587.5}
function obliquity(d){return (23.4393-3.563e-7*d)*rad}
function solarEq(date){
 const jd=julianDate(date),d=jd-2451545,T=d/36525;
 const L=wrap(280.46646+36000.76983*T+.0003032*T*T);
 const M=wrap(357.52911+35999.05029*T-.0001537*T*T+T*T*T/24490000)*rad;
 const C=(1.914602-.004817*T-.000014*T*T)*Math.sin(M)+(.019993-.000101*T)*Math.sin(2*M)+.000289*Math.sin(3*M);
 const lon=(L+C-.00569-.00478*Math.sin((125.04-1934.136*T)*rad))*rad;
 const eps=obliquity(d);
 return eclipticToEquatorial(lon,0,eps);
}
function eclipticToEquatorial(lon,lat,eps){
 const x=Math.cos(lat)*Math.cos(lon),y=Math.cos(lat)*Math.sin(lon),z=Math.sin(lat);
 const ye=y*Math.cos(eps)-z*Math.sin(eps),ze=y*Math.sin(eps)+z*Math.cos(eps);
 return {ra:wrap(Math.atan2(ye,x)*deg),dec:Math.asin(clamp(ze/Math.hypot(x,ye,ze),-1,1))*deg,lon:wrap(lon*deg),lat:lat*deg};
}
function heliocentric(p,d){
 const n=wrap(p.n+p.nd*d)*rad,i=(p.i+p.id*d)*rad,w=wrap(p.w+p.wd*d)*rad,e=p.e+p.ed*d,M=wrap(p.m+p.md*d)*rad;
 let E=M+e*Math.sin(M)*(1+e*Math.cos(M));
 for(let j=0;j<4;j++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
 const xv=p.a*(Math.cos(E)-e),yv=p.a*Math.sqrt(Math.max(0,1-e*e))*Math.sin(E),v=Math.atan2(yv,xv),r=Math.hypot(xv,yv);
 return {x:r*(Math.cos(n)*Math.cos(v+w)-Math.sin(n)*Math.sin(v+w)*Math.cos(i)),y:r*(Math.sin(n)*Math.cos(v+w)+Math.cos(n)*Math.sin(v+w)*Math.cos(i)),z:r*Math.sin(v+w)*Math.sin(i)};
}
function planetEq(p,date){
 const d=julianDate(date)-2451543.5;
 const earth=heliocentric({n:0,nd:0,i:0,id:0,w:282.9404,wd:.0000470935,a:1,e:.016709,ed:-.000000001151,m:356.0470,md:.9856002585},d);
 const pos=heliocentric(p,d),x=pos.x-earth.x,y=pos.y-earth.y,z=pos.z-earth.z,eps=obliquity(d);
 const ye=y*Math.cos(eps)-z*Math.sin(eps),ze=y*Math.sin(eps)+z*Math.cos(eps);
 return {ra:wrap(Math.atan2(ye,x)*deg),dec:Math.asin(clamp(ze/Math.hypot(x,ye,ze),-1,1))*deg};
}
function moonEq(date){
 const d=julianDate(date)-2451543.5;
 const N=wrap(125.1228-.0529538083*d)*rad,i=5.1454*rad,w=wrap(318.0634+.1643573223*d)*rad,a=60.2666,e=.0549,M=wrap(115.3654+13.0649929509*d)*rad;
 let E=M+e*Math.sin(M)*(1+e*Math.cos(M));
 for(let j=0;j<5;j++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
 const xv=a*(Math.cos(E)-e),yv=a*Math.sqrt(1-e*e)*Math.sin(E),v=Math.atan2(yv,xv),r=Math.hypot(xv,yv);
 const x=r*(Math.cos(N)*Math.cos(v+w)-Math.sin(N)*Math.sin(v+w)*Math.cos(i));
 const y=r*(Math.sin(N)*Math.cos(v+w)+Math.cos(N)*Math.sin(v+w)*Math.cos(i));
 const z=r*Math.sin(v+w)*Math.sin(i);
 const lon=Math.atan2(y,x),lat=Math.atan2(z,Math.hypot(x,y));
 const q=eclipticToEquatorial(lon,lat,obliquity(d));
 const sun=solarEq(date);const phase=(1-Math.cos((q.lon-sun.lon)*rad))/2;
 return {...q,phase};
}
function horizontal(eq,date,lat,lon){
 const jd=julianDate(date),T=(jd-2451545)/36525;
 const gmst=wrap(280.46061837+360.98564736629*(jd-2451545)+.000387933*T*T-T*T*T/38710000);
 const ha=wrap(gmst+lon-eq.ra)*rad,phi=lat*rad,dec=eq.dec*rad;
 const alt=Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(ha));
 const az=wrap(Math.atan2(Math.sin(ha),Math.cos(ha)*Math.sin(phi)-Math.tan(dec)*Math.cos(phi)*Math.cos(1e-12))*deg+180);
 return {altitude:alt*deg,azimuth:az};
}
function starPosition(star,date,lat,lon){return horizontal({ra:star[1]*15,dec:star[2]},date,lat,lon)}
function planetPosition(p,date,lat,lon){return horizontal(planetEq(p,date),date,lat,lon)}
function sunPosition(date,lat,lon){return horizontal(solarEq(date),date,lat,lon)}
function screenPoint(map,canvas,azimuth,elevation){
 const pitch=Number(map.getPitch?.()||0),zoom=Number(map.getZoom?.()||0),w=canvas.clientWidth||1,h=canvas.clientHeight||1;
 const skyTopPitch=clamp((pitch-17)/78,.055,.72),horizonY=h*skyTopPitch;
 const bearing=Number(map.getBearing?.()||0),delta=((azimuth-bearing+540)%360)-180;
 if(Math.abs(delta)>92||elevation< -1||elevation>90)return null;
 const x=w/2+(delta/92)*(w/2),y=horizonY*(1-clamp(elevation/90,0,1));
 if(x< -24||x>w+24||y< -24||y>horizonY+12)return null;
 return {x,y,horizonY,w,h,zoom,pitch};
}
export function initBridgePointCelestialSky(target){
 const map=target?.map||target,container=map?.getContainer?.();if(!map||!container)return null;
 if(window.__BP_CELESTIAL_SKY_V5928__?.map===map)return window.__BP_CELESTIAL_SKY_V5928__;
 ensureStyle();const canvas=document.createElement('canvas');canvas.id=ROOT;canvas.setAttribute('aria-hidden','true');container.appendChild(canvas);
 let enabled=true,disposed=false,timer=0,lastState=null;
 const ctx=canvas.getContext('2d',{alpha:true});
 function resize(){const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight),dpr=Math.min(window.devicePixelRatio||1,1.5);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0)}
 function render(){
  if(disposed||!enabled||document.hidden)return;
  resize();const w=container.clientWidth||1,h=container.clientHeight||1;ctx.clearRect(0,0,w,h);
  const center=map.getCenter(),date=new Date(),pitch=Number(map.getPitch()||0),zoom=Number(map.getZoom()||0);
  if(pitch<24||zoom<11.5){
   lastState={enabled,visible:false,reason:pitch<24?'Tilt BridgePoint toward the horizon to reveal the sky.':'Zoom in to ground level to reveal the celestial sky.',updatedAt:Date.now()};
   window.__BP_CELESTIAL_SKY_STATE_V5928__=lastState;return;
  }
  const sun=sunPosition(date,center.lat,center.lng),nightFactor=clamp((-sun.altitude+8)/32,0,1);
  // This is a view-dependent sky overlay, not a full volumetric planetarium renderer.
  // Use the map's own sky/atmosphere for the horizon and keep the stars in the upper sky band only.
  const gradient=ctx.createLinearGradient(0,0,0,h*.6);
  gradient.addColorStop(0,sun.altitude<-4?'rgba(2,7,22,.82)':sun.altitude<8?'rgba(32,56,76,.36)':'rgba(65,143,196,.13)');
  gradient.addColorStop(1,'rgba(5,18,32,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h*.6);
  if(nightFactor>.01){
   for(let i=0;i<stars.length;i++){
    const star=stars[i],pos=starPosition(star,date,center.lat,center.lng),p=screenPoint(map,canvas,pos.azimuth,pos.altitude);
    if(!p)continue;
    const radius=clamp(2.6-star[3]*.55,.8,2.7)*(.55+nightFactor*.55);
    const alpha=clamp((nightFactor-.05)*1.3,0,.85);
    ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fillStyle='rgba(219,239,255,'+alpha+')';ctx.fill();
    if(star[3]<.2&&p.pitch>30){ctx.beginPath();ctx.moveTo(p.x-radius*2.2,p.y);ctx.lineTo(p.x+radius*2.2,p.y);ctx.moveTo(p.x,p.y-radius*2.2);ctx.lineTo(p.x,p.y+radius*2.2);ctx.strokeStyle='rgba(195,230,255,'+(alpha*.28)+')';ctx.lineWidth=.7;ctx.stroke()}
   }
  }
  for(const p0 of planets){
   const pos=planetPosition(p0,date,center.lat,center.lng),p=screenPoint(map,canvas,pos.azimuth,pos.altitude);if(!p)continue;
   const alpha=sun.altitude>0?.45:.98;ctx.beginPath();ctx.arc(p.x,p.y,p0.size,0,Math.PI*2);ctx.fillStyle=p0.color;ctx.globalAlpha=alpha;ctx.fill();ctx.globalAlpha=1;
   if(p.zoom>14){ctx.font='9px system-ui,sans-serif';ctx.fillStyle='rgba(228,245,255,.86)';ctx.fillText(p0.name,p.x+p0.size+3,p.y+3)}
  }
  const moon=moonEq(date),mpos=horizontal(moon,date,center.lat,center.lng),mp=screenPoint(map,canvas,mpos.azimuth,mpos.altitude);
  if(mp){
   const r=clamp(7+zoom*.18,8,13);ctx.save();ctx.beginPath();ctx.arc(mp.x,mp.y,r,0,Math.PI*2);ctx.fillStyle='rgba(184,205,230,.9)';ctx.shadowColor='rgba(164,206,255,.5)';ctx.shadowBlur=10;ctx.fill();ctx.shadowBlur=0;
   // Approximate illuminated phase; orientation is schematic in this 2D sky cue.
   if(moon.phase<.98){ctx.beginPath();ctx.arc(mp.x+r*(.9-moon.phase),mp.y,r,0,Math.PI*2);ctx.fillStyle='rgba(9,20,39,.92)';ctx.fill()}
   ctx.restore();if(zoom>14){ctx.font='10px system-ui,sans-serif';ctx.fillStyle='rgba(236,246,255,.92)';ctx.fillText('MOON',mp.x+r+4,mp.y+3)}
  }
  const sp=screenPoint(map,canvas,sun.azimuth,sun.altitude);
  if(sp){
   const r=10,halo=ctx.createRadialGradient(sp.x,sp.y,2,sp.x,sp.y,30);halo.addColorStop(0,'rgba(255,235,158,.48)');halo.addColorStop(1,'rgba(255,220,110,0)');
   ctx.fillStyle=halo;ctx.beginPath();ctx.arc(sp.x,sp.y,30,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(sp.x,sp.y,r,0,Math.PI*2);ctx.fillStyle='#ffe9a5';ctx.fill();
   if(zoom>14){ctx.font='10px system-ui,sans-serif';ctx.fillStyle='rgba(255,244,206,.92)';ctx.fillText('SUN',sp.x+r+4,sp.y+3)}
  }
  lastState={enabled,visible:true,pitch,zoom,solarAltitude:sun.altitude,solarAzimuth:sun.azimuth,moonIllumination:moon.phase,visibleStars:stars.filter(s=>starPosition(s,date,center.lat,center.lng).altitude>0).length,planetaryElementsApproximate:true,updatedAt:Date.now()};
  window.__BP_CELESTIAL_SKY_STATE_V5928__=lastState;
 }
 const onView=()=>render();map.on('moveend',onView);map.on('rotate',onView);map.on('pitch',onView);map.on('resize',onView);
 const visibility=()=>render();document.addEventListener('visibilitychange',visibility);
 timer=setInterval(()=>{if(!document.hidden)render()},15000);
 const api={version:VERSION,map,canvas,open(){enabled=true;canvas.hidden=false;render();return api},close(){enabled=false;ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);canvas.hidden=true;return api},toggle(){return enabled?api.close():api.open()},get state(){return lastState||window.__BP_CELESTIAL_SKY_STATE_V5928__||null},destroy(){disposed=true;clearInterval(timer);map.off('moveend',onView);map.off('rotate',onView);map.off('pitch',onView);map.off('resize',onView);document.removeEventListener('visibilitychange',visibility);canvas.remove()}};
 window.__BP_CELESTIAL_SKY_V5928__=api;render();return api;
}
