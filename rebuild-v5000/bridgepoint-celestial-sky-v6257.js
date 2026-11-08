const VERSION=6257;
const ROOT='bp-celestial-sky-v6257';
const STYLE='bp-celestial-sky-style-v6257';
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
function apparentAngularRadiusPx(height){
 const angularRadius=.266*rad;
 const verticalFov=36.87*rad;
 return clamp((height*.5)*Math.tan(angularRadius)/Math.tan(verticalFov*.5),.75,9);
}
const SKY_CSS=[
 '#bp-celestial-sky-v6257{position:absolute;inset:0;width:100%;height:100%;z-index:9;pointer-events:none;display:block;overflow:hidden}',
 '#bp-celestial-sky-v6257 .bp-sky-twinkle{transform-box:fill-box;transform-origin:center;animation:bpSkyTwinkle 3.7s ease-in-out infinite alternate}',
 '#bp-celestial-sky-v6257 .bp-sun-flares{transform-box:fill-box;transform-origin:center;animation:bpSunFlares 22s linear infinite}',
 '@keyframes bpSkyTwinkle{from{opacity:.45}to{opacity:1}}@keyframes bpSunFlares{to{transform:rotate(360deg)}}'
].join('\\n');
function ensureSkyStyle(){
 if(document.getElementById(STYLE))return;
 const s=document.createElement('style');s.id=STYLE;s.textContent=SKY_CSS;document.head.appendChild(s);
}
export function initBridgePointCelestialSky(target){
 const map=target?.map||target,container=map?.getContainer?.();
 if(!map||!container)return null;
 if(window.__BP_CELESTIAL_SKY_V6257__?.map===map)return window.__BP_CELESTIAL_SKY_V6257__;
 ensureSkyStyle();
 let svg=container.querySelector('#'+ROOT);
 if(!svg){
  svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.id=ROOT;svg.setAttribute('aria-hidden','true');svg.setAttribute('preserveAspectRatio','none');
  container.appendChild(svg);
 }
 let enabled=true,disposed=false,timer=0,lastState=null,raf=0;
 function resize(){
  const w=Math.max(1,container.clientWidth||1),h=Math.max(1,container.clientHeight||1);
  svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.setAttribute('width',String(w));svg.setAttribute('height',String(h));
  return {w,h};
 }
 function render(){
  if(disposed||!enabled||document.hidden)return;
  const {w,h}=resize(),center=map.getCenter(),date=new Date(),pitch=Number(map.getPitch?.()||0),zoom=Number(map.getZoom?.()||0);
  if(pitch<24||zoom<11.5){
   svg.innerHTML='';
   lastState={enabled,visible:false,reason:pitch<24?'Tilt the BridgePoint globe upward using LOOK UP · SKY VIEW to reveal the celestial sky.':'Zoom in toward street level to reveal the celestial sky.',updatedAt:Date.now()};
   window.__BP_CELESTIAL_SKY_STATE_V6257__=lastState;return;
  }
  const sun=sunPosition(date,center.lat,center.lng),nightFactor=clamp((-sun.altitude+8)/32,0,1);
  const r=apparentAngularRadiusPx(h);
  const parts=[\`<defs>
    <radialGradient id="bp6257-moon-surface" cx="31%" cy="24%" r="76%">
      <stop offset="0" stop-color="#f5f5ee"/><stop offset=".36" stop-color="#c9ccd0"/>
      <stop offset=".72" stop-color="#858c97"/><stop offset="1" stop-color="#303947"/>
    </radialGradient>
    <radialGradient id="bp6257-moon-glow"><stop offset="0" stop-color="#b8d1ed" stop-opacity=".24"/><stop offset="1" stop-color="#87bfff" stop-opacity="0"/></radialGradient>
    <radialGradient id="bp6257-sun-surface" cx="36%" cy="29%" r="74%">
      <stop offset="0" stop-color="#fffdf0"/><stop offset=".28" stop-color="#fff2b0"/>
      <stop offset=".58" stop-color="#ffc35a"/><stop offset=".82" stop-color="#f36a20"/><stop offset="1" stop-color="#8b2514"/>
    </radialGradient>
    <radialGradient id="bp6257-sun-glow"><stop offset="0" stop-color="#fff5c1" stop-opacity=".64"/><stop offset=".32" stop-color="#ffb33f" stop-opacity=".30"/><stop offset="1" stop-color="#ff6a20" stop-opacity="0"/></radialGradient>
    <radialGradient id="bp6257-sunspot"><stop offset="0" stop-color="#3b0904"/><stop offset=".72" stop-color="#8f290d"/><stop offset="1" stop-color="#d85b19" stop-opacity="0"/></radialGradient>
    <filter id="bp6257-soft-glow" x="-180%" y="-180%" width="460%" height="460%"><feGaussianBlur stdDeviation="3.4"/></filter>
    <clipPath id="bp6257-moon-clip"><circle cx="0" cy="0" r="\${r}"/></clipPath>
  </defs>\`];
  const tint=sun.altitude<-4?.18:sun.altitude<8?.075:.018;
  parts.push(\`<rect x="0" y="0" width="\${w}" height="\${h*.58}" fill="#07152c" opacity="\${tint}" />\`);
  let visibleStars=0;
  if(nightFactor>.01){
   for(let i=0;i<stars.length;i++){
    const star=stars[i],pos=starPosition(star,date,center.lat,center.lng),p=screenPoint(map,svg,pos.azimuth,pos.altitude);
    if(!p)continue;visibleStars++;
    const radius=clamp(2.1-star[3]*.42,.55,2.0)*(.5+nightFactor*.55);
    const alpha=clamp((nightFactor-.025)*1.22,0,.86);
    const twinkle=i%5===0?' class="bp-sky-twinkle"':'';
    parts.push(\`<circle\${twinkle} cx="\${p.x.toFixed(1)}" cy="\${p.y.toFixed(1)}" r="\${radius.toFixed(2)}" fill="#d9edff" opacity="\${alpha.toFixed(2)}"/>\`);
    if(star[3]<.18&&p.pitch>35){
     parts.push(\`<path d="M\${(p.x-radius*2.1).toFixed(1)} \${p.y.toFixed(1)}h\${(radius*4.2).toFixed(1)} M\${p.x.toFixed(1)} \${(p.y-radius*2.1).toFixed(1)}v\${(radius*4.2).toFixed(1)}" stroke="#b9dcff" stroke-opacity="\${(alpha*.24).toFixed(2)}" stroke-width=".6"/>\`);
    }
   }
  }
  for(let i=0;i<planets.length;i++){
   const body=planets[i],pos=planetPosition(body,date,center.lat,center.lng),p=screenPoint(map,svg,pos.azimuth,pos.altitude);
   if(!p)continue;
   const pr=Math.max(1,body.size*.58),label=zoom>14?\`<text x="\${(p.x+pr+3).toFixed(1)}" y="\${(p.y+3).toFixed(1)}" fill="#e4f2ff" font-size="9" font-family="system-ui" opacity=".85">\${body.name}</text>\`:'';
   parts.push(\`<g><circle cx="\${p.x.toFixed(1)}" cy="\${p.y.toFixed(1)}" r="\${(pr*1.6).toFixed(1)}" fill="\${body.color}" opacity=".14" filter="url(#bp6257-soft-glow)"/><circle cx="\${p.x.toFixed(1)}" cy="\${p.y.toFixed(1)}" r="\${pr.toFixed(1)}" fill="\${body.color}" stroke="#fff2d5" stroke-opacity=".35" stroke-width=".45"/>\${label}</g>\`);
  }
  const moon=moonEq(date),moonHorizontal=horizontal(moon,date,center.lat,center.lng),mp=screenPoint(map,svg,moonHorizontal.azimuth,moonHorizontal.altitude);
  if(mp){
   const x=mp.x.toFixed(1),y=mp.y.toFixed(1),phase=clamp(moon.phase,0,1);
   const craters=[[-.36,-.27,.13],[-.04,-.43,.09],[.30,-.14,.15],[.12,.31,.10],[-.38,.22,.08],[.42,.40,.07]];
   const craterSvg=craters.map(([cx,cy,cr])=>\`<circle cx="\${(cx*r).toFixed(2)}" cy="\${(cy*r).toFixed(2)}" r="\${(cr*r).toFixed(2)}" fill="#424b57" fill-opacity=".23" stroke="#f0f1ea" stroke-opacity=".32" stroke-width="\${Math.max(.28,r*.035).toFixed(2)}"/><ellipse cx="\${(cx*r-cr*r*.18).toFixed(2)}" cy="\${(cy*r-cr*r*.14).toFixed(2)}" rx="\${(cr*r*.48).toFixed(2)}" ry="\${(cr*r*.26).toFixed(2)}" fill="#323b47" fill-opacity=".16"/>\`).join('');
   const shadow=phase<.985?\`<ellipse cx="\${(r*(1-phase*2)).toFixed(2)}" cy="0" rx="\${Math.max(.1,r*(1-phase)).toFixed(2)}" ry="\${(r*1.02).toFixed(2)}" fill="#071020" opacity="\${(1-phase*.94).toFixed(2)}"/>\`:'';
   const lunarLabel=zoom>14?\`<text x="\${(mp.x+r+4).toFixed(1)}" y="\${(mp.y+3).toFixed(1)}" fill="#edf5ff" font-size="10" font-family="system-ui" opacity=".9">MOON</text>\`:'';
   parts.push(\`<g transform="translate(\${x} \${y})">
     <circle r="\${(r*2.45).toFixed(2)}" fill="url(#bp6257-moon-glow)" filter="url(#bp6257-soft-glow)"/>
     <circle r="\${r.toFixed(2)}" fill="url(#bp6257-moon-surface)" stroke="#f4f7ff" stroke-opacity=".34" stroke-width=".55"/>
     <g clip-path="url(#bp6257-moon-clip)">\${craterSvg}\${shadow}<ellipse cx="\${(-r*.24).toFixed(2)}" cy="\${(-r*.35).toFixed(2)}" rx="\${(r*.45).toFixed(2)}" ry="\${(r*.18).toFixed(2)}" fill="#fff" opacity=".10"/></g>
     <circle r="\${r.toFixed(2)}" fill="none" stroke="#e7efff" stroke-opacity=".28" stroke-width=".45"/>
   </g>\${lunarLabel}\`);
  }
  const sp=screenPoint(map,svg,sun.azimuth,sun.altitude);
  if(sp){
   const x=sp.x.toFixed(1),y=sp.y.toFixed(1),flareR=(r*4.2).toFixed(2);
   const rays=Array.from({length:18},(_,i)=>{
    const a=i*Math.PI/9,inner=r*1.03,outer=r*(1.42+.32*(.5+.5*Math.sin(i*3.71+date.getTime()*.0004)));
    const x1=Math.cos(a)*inner,y1=Math.sin(a)*inner,x2=Math.cos(a)*outer,y2=Math.sin(a)*outer;
    return \`<path d="M\${x1.toFixed(2)} \${y1.toFixed(2)}L\${x2.toFixed(2)} \${y2.toFixed(2)}" stroke="#ffb44e" stroke-opacity=".48" stroke-width="\${Math.max(.35,r*.07).toFixed(2)}" stroke-linecap="round"/>\`;
   }).join('');
   const sunLabel=zoom>14?\`<text x="\${(sp.x+r+4).toFixed(1)}" y="\${(sp.y+3).toFixed(1)}" fill="#fff0c5" font-size="10" font-family="system-ui" opacity=".92">SUN</text>\`:'';
   parts.push(\`<g transform="translate(\${x} \${y})">
     <circle r="\${flareR}" fill="url(#bp6257-sun-glow)" filter="url(#bp6257-soft-glow)"/>
     <g class="bp-sun-flares">\${rays}</g>
     <circle r="\${(r*1.06).toFixed(2)}" fill="url(#bp6257-sun-surface)" stroke="#fff0be" stroke-opacity=".7" stroke-width=".55"/>
     <ellipse cx="\${(-r*.27).toFixed(2)}" cy="\${(-r*.28).toFixed(2)}" rx="\${(r*.24).toFixed(2)}" ry="\${(r*.14).toFixed(2)}" fill="url(#bp6257-sunspot)" opacity=".65"/>
     <ellipse cx="\${(r*.29).toFixed(2)}" cy="\${(r*.22).toFixed(2)}" rx="\${(r*.17).toFixed(2)}" ry="\${(r*.11).toFixed(2)}" fill="url(#bp6257-sunspot)" opacity=".5"/>
   </g>\${sunLabel}\`);
  }
  svg.innerHTML=parts.join('');
  lastState={enabled,visible:true,pitch,zoom,solarAltitude:sun.altitude,solarAzimuth:sun.azimuth,
   moonIllumination:moon.phase,visibleStars,celestialBodies3DStyle:true,apparentAngularDiameterDegrees:.532,
   canvasCountInvariant:true,updatedAt:Date.now()};
  window.__BP_CELESTIAL_SKY_STATE_V6257__=lastState;
 }
 function requestRender(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;render()})}
 const onView=()=>requestRender();
 for(const event of ['move','moveend','rotate','pitch','resize'])try{map.on(event,onView)}catch(_){}
 const visibility=()=>{if(!document.hidden)requestRender()};
 document.addEventListener('visibilitychange',visibility);
 timer=setInterval(()=>{if(!document.hidden)requestRender()},10000);
 const api={version:VERSION,map,element:svg,
  open(){enabled=true;svg.hidden=false;render();return api},
  close(){enabled=false;svg.innerHTML='';svg.hidden=true;return api},
  toggle(){return enabled?api.close():api.open()},
  get state(){return lastState||window.__BP_CELESTIAL_SKY_STATE_V6257__||null},
  destroy(){disposed=true;clearInterval(timer);if(raf)cancelAnimationFrame(raf);for(const event of ['move','moveend','rotate','pitch','resize'])try{map.off(event,onView)}catch(_){}document.removeEventListener('visibilitychange',visibility);svg.remove();}
 };
 window.__BP_CELESTIAL_SKY_V6257__=api;render();return api;
}
