/**
 * BridgePoint Intelligence — Welcome Space Scene v6256
 * A self-contained Three.js celestial scene for the welcome gate.
 *
 * Scale policy:
 * - Earth and Moon radii use their mean-radius ratio. The welcome Sun disk is a
 *   cinematic presentation scale, not its physical radius.
 * - Inter-body distances in the cinematic overview are compressed so all bodies
 *   remain visible on a phone and desktop. Ground-sky mode restores the Sun and
 *   Moon's matching real apparent angular radii (about 0.5 degrees).
 * - Lunar relief and solar activity are procedural shaders, not claimed NASA
 *   LOLA/DEM or live solar-observatory textures.
 */
import * as THREE from '/vendor/three.module.js?v=169-local';

(() => {
  'use strict';
  const VERSION = 'v6256';
  if (window.__BP_WELCOME_SPACE_V6256__) return;
  window.__BP_WELCOME_SPACE_V6256__ = true;

  const host = document.querySelector('#bpWelcomeGateV1 .bpw-celestial-system');
  if (!host) return;

  const mobile = matchMedia('(max-width: 700px)').matches ||
    (navigator.deviceMemory || 4) <= 3;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  const EARTH_RADIUS_KM = 6371.0084;
  const MOON_RADIUS_KM = 1737.4;
  const SUN_RADIUS_KM = 695700;
  const MOON_ORBIT_KM = 384400;
  const MOON_PERIOD_DAYS = 27.321661;
  const SIDEREAL_DAY_SECONDS = 86164.0905;
  const nowSeconds = () => performance.now() * 0.001;

  const canvas = document.createElement('canvas');
  canvas.id = 'bpWelcomeSpaceCanvasV6256';
  canvas.className = 'bpw-space-renderer-canvas';
  canvas.setAttribute('aria-label', 'Interactive three-dimensional Earth, Moon, Sun and starfield');
  canvas.tabIndex = 0;
  host.appendChild(canvas);

  const style = document.createElement('style');
  style.id = 'bpWelcomeSpaceStylesV6256';
  style.textContent = `
    #bpWelcomeGateV1 .bpw-space-renderer-canvas{
      position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
      display:block!important;z-index:2!important;pointer-events:auto!important;
      touch-action:none!important;outline:none!important;mix-blend-mode:normal!important
    }
    #bpWelcomeGateV1 .bpw-celestial-canvas{display:none!important}
    #bpWelcomeGateV1 .bpw-space-controls{
      position:absolute;z-index:11;right:max(12px,env(safe-area-inset-right));
      top:calc(env(safe-area-inset-top) + clamp(68px,10vh,104px));
      display:flex;gap:7px;pointer-events:auto
    }
    #bpWelcomeGateV1 .bpw-space-controls button{
      appearance:none;border:1px solid rgba(160,205,238,.44);border-radius:999px;
      padding:8px 11px;background:rgba(5,15,29,.74);color:#eaf7ff;
      font:700 10px/1.1 system-ui,sans-serif;letter-spacing:.08em;
      box-shadow:0 4px 16px rgba(0,0,0,.35);backdrop-filter:blur(8px)
    }
    #bpWelcomeGateV1 .bpw-space-controls button:focus-visible{outline:2px solid #9bdcff;outline-offset:2px}
    @media(max-width:620px){
      #bpWelcomeGateV1 .bpw-space-controls{top:calc(env(safe-area-inset-top) + 88px);right:10px}
      #bpWelcomeGateV1 .bpw-space-controls button{padding:7px 9px;font-size:9px}
    }
  `;
  document.head.appendChild(style);

  const controls = document.createElement('div');
  controls.className = 'bpw-space-controls';
  controls.innerHTML = '<button type="button" data-space-ground>GROUND SKY</button><button type="button" data-space-reset>RESET VIEW</button>';
  host.appendChild(controls);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: !mobile,
      logarithmicDepthBuffer: true,
      powerPreference: mobile ? 'low-power' : 'high-performance'
    });
  } catch (error) {
    console.error('[BridgePoint space] WebGL renderer unavailable:', error);
    canvas.remove();
    controls.remove();
    return;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.1 : 1.5));

  const scene = new THREE.Scene();
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(48, 1, 0.001, 100000);
  camera.position.set(0, 4.2, 16.5);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight(0x7895bd, 0.24);
  scene.add(ambient);

  const earth = new THREE.Group();
  earth.name = 'Earth';
  scene.add(earth);
  const earthGeometry = new THREE.SphereGeometry(1, mobile ? 96 : 160, mobile ? 64 : 112);
  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(0.55, 0.38, 0.74).normalize() } },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vPosition; varying vec2 vUv;
      void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);vPosition=position;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
    `,
    fragmentShader: `
      precision highp float; varying vec3 vNormal; varying vec3 vPosition; varying vec2 vUv;
      uniform float uTime; uniform vec3 uSunDir;
      float h(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
        mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fbm(vec3 p){float v=0.0,a=.53;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec3(1.7,2.4,1.2);a*=.49;}return v;}
      void main(){
        vec3 normal=normalize(vPosition);float land=fbm(normal*5.5+vec3(0,0,uTime*.000015));
        float detail=fbm(normal*19.0+vec3(4.0,2.0,1.0));
        float coast=smoothstep(.48,.58,land+detail*.12);
        vec3 ocean=mix(vec3(.006,.035,.105),vec3(.012,.12,.24),detail);
        vec3 continent=mix(vec3(.12,.20,.10),vec3(.48,.43,.25),smoothstep(.22,.76,detail));
        float ice=smoothstep(.79,.97,abs(normal.y));
        vec3 base=mix(ocean,continent,coast);base=mix(base,vec3(.81,.88,.91),ice*.82);
        float clouds=fbm(normal*33.0+vec3(0,uTime*.000025,0));
        float cloud=smoothstep(.63,.78,clouds)*.22;
        base=mix(base,vec3(.86,.91,.96),cloud);
        float lambert=max(dot(normal,normalize(uSunDir)),0.0);
        float twilight=smoothstep(-.16,.18,dot(normal,normalize(uSunDir)));
        vec3 night=vec3(.002,.007,.023)+vec3(.012,.035,.08)*fbm(normal*45.0);
        vec3 day=base*(.13+.97*lambert);
        vec3 color=mix(night,day,twilight);
        float city=pow(fbm(normal*125.0),7.0)*(1.0-twilight);
        color+=vec3(1.0,.55,.20)*city*.75;
        float rim=pow(1.0-max(dot(normalize(vNormal),vec3(0,0,1)),0.0),3.0);
        color+=vec3(.09,.33,.75)*rim*.18;
        gl_FragColor=vec4(color,1.0);
      }`
  });
  const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
  earthMesh.name = 'Earth interactive globe';
  earthMesh.userData.body = 'earth';
  earth.add(earthMesh);
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.025, mobile ? 64 : 96, mobile ? 48 : 64),
    new THREE.MeshBasicMaterial({ color: 0x398bff, transparent: true, opacity: 0.105, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  earth.add(atmosphere);

  const moonPivot = new THREE.Group();
  moonPivot.name = 'Moon orbital pivot';
  scene.add(moonPivot);
  const moonGeometry = new THREE.SphereGeometry(MOON_RADIUS_KM / EARTH_RADIUS_KM, mobile ? 96 : 144, mobile ? 64 : 96);
  const moonMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(0.55, 0.38, 0.74).normalize() } },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vPos; varying vec2 vUv;
      void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
    `,
    fragmentShader: `
      precision highp float; varying vec3 vNormal; varying vec3 vPos; varying vec2 vUv; uniform float uTime; uniform vec3 uSunDir;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        float a=hash(i),b=hash(i+vec3(1,0,0)),c=hash(i+vec3(0,1,0)),d=hash(i+vec3(1,1,0));
        float e=hash(i+vec3(0,0,1)),f1=hash(i+vec3(1,0,1)),g=hash(i+vec3(0,1,1)),hh=hash(i+vec3(1,1,1));
        return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,f1,f.x),mix(g,hh,f.x),f.y),f.z);}
      float fbm(vec3 p){float v=0.0,a=.55;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec3(2.1,1.4,3.2);a*=.48;}return v;}
      float crater(vec3 p,float scale){vec3 q=p*scale;vec3 cell=floor(q);vec3 f=fract(q);float bowl=0.0;
        for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
          vec3 id=cell+vec3(float(x),float(y),float(z));vec3 rnd=vec3(hash(id),hash(id+17.2),hash(id+31.7));
          float d=length(vec3(float(x),float(y),float(z))+.15+rnd*.7-f);float r=.12+hash(id+9.1)*.20;
          float inside=1.0-smoothstep(r*.53,r*1.02,d);float rim=exp(-pow((d-r)/max(.014,r*.10),2.0));
          bowl=max(bowl,inside*.46-rim*.14);
        }return bowl;}
      void main(){
        vec3 p=normalize(vPos);float maria=fbm(p*5.1+vec3(5,2,1));
        float high=fbm(p*24.0);float small=fbm(p*88.0);float micro=fbm(p*176.0);
        float cr=crater(p,19.0)+crater(p,46.0)*.58;
        float relief=high*.16+small*.08+micro*.035-cr;
        vec3 highlands=vec3(.69,.70,.69);vec3 basalt=vec3(.30,.32,.33);
        vec3 albedo=mix(basalt,highlands,smoothstep(.36,.66,maria+relief*.2));
        albedo*=.78+relief*.7;albedo+=vec3(.09,.09,.085)*pow(max(small-.68,0.0),2.0);
        vec3 normal=normalize(vNormal);float light=max(dot(normal,normalize(uSunDir)),0.0);
        float limb=.20+.80*pow(max(normal.z,0.0),.42);
        vec3 color=albedo*(.075+.98*light)*limb;
        float ejecta=pow(max(fbm(p*62.0)-.70,0.0),2.0);color+=vec3(.11,.105,.095)*ejecta;
        gl_FragColor=vec4(color,1.0);
      }`
  });
  const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
  moonMesh.name = 'Moon';
  moonMesh.userData.body = 'moon';
  moonMesh.position.set(8.2, 0.7, -1.4);
  moonPivot.add(moonMesh);

  const sunPosition = new THREE.Vector3(4.2, 6.2, 4.5);
  // Cinematic overview compresses inter-body distance and disk scale; ground sky uses apparent angular diameter.\n  const sunRadiusVisual = 1.22;
  const sunGeometry = new THREE.SphereGeometry(sunRadiusVisual, mobile ? 80 : 128, mobile ? 56 : 96);
  const sunMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vPos; varying vec3 vNormal; void main(){vPos=position;vNormal=normalize(normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      precision highp float; varying vec3 vPos; varying vec3 vNormal; uniform float uTime;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        float a=hash(i),b=hash(i+vec3(1,0,0)),c=hash(i+vec3(0,1,0)),d=hash(i+vec3(1,1,0));
        float e=hash(i+vec3(0,0,1)),f1=hash(i+vec3(1,0,1)),g=hash(i+vec3(0,1,1)),hh=hash(i+vec3(1,1,1));
        return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,f1,f.x),mix(g,hh,f.x),f.y),f.z);}
      float fbm(vec3 p){float v=0.0,a=.56;for(int i=0;i<6;i++){v+=a*noise(p);p=p*2.02+vec3(1.7,2.4,3.1);a*=.48;}return v;}
      void main(){
        vec3 p=normalize(vPos);float t=uTime*.13;
        float gran=fbm(p*31.0+vec3(t,-t*.7,t*.4));
        float cells=fbm(p*74.0+vec3(-t*.8,t*.5,t));
        float filaments=fbm(p*18.0+vec3(t*.5,4.0,-t));
        vec3 c=mix(vec3(.42,.018,.002),vec3(1.0,.33,.035),smoothstep(.18,.78,gran));
        c=mix(c,vec3(1.0,.79,.30),smoothstep(.36,.80,cells)*.78);
        c=mix(c,vec3(1.0,.97,.77),pow(max(cells-.58,0.0),1.4)*.60);
        c*=.78+.38*filaments;
        float s1=length((p.xy-vec2(-.30,.18))*vec2(1.0,1.6));
        float s2=length((p.xy-vec2(.22,-.28))*vec2(1.4,1.0));
        float spots=max(1.0-smoothstep(.03,.13,s1),1.0-smoothstep(.025,.105,s2));
        c=mix(c,vec3(.16,.012,.001),spots*.82);
        c*=.42+.58*pow(max(vNormal.z,0.0),.42);
        gl_FragColor=vec4(c,1.0);
      }`
  });
  const sunGroup = new THREE.Group();
  sunGroup.name = 'Sun';
  sunGroup.position.copy(sunPosition);
  scene.add(sunGroup);
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  sunMesh.name = 'Sun surface';
  sunMesh.userData.body = 'sun';
  sunGroup.add(sunMesh);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(), color: 0xff9c3d, transparent: true, opacity: 0.68,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  corona.scale.set(sunRadiusVisual * 3.0, sunRadiusVisual * 3.0, 1);
  sunGroup.add(corona);
  const sunLight = new THREE.PointLight(0xffe2b2, 260000, 0, 2);
  sunLight.position.copy(sunPosition);
  scene.add(sunLight);
  // A parallel key light makes the Earth readable while retaining the point light
  // at the Sun's exact location as the system's physical point source.
  const keyLight = new THREE.DirectionalLight(0xffedcf, 2.1);
  keyLight.position.copy(sunPosition).normalize().multiplyScalar(100);
  scene.add(keyLight);

  function makeGlowTexture(){
    const size=128,data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const r=Math.hypot((x-size/2)/(size/2),(y-size/2)/(size/2));
      const a=Math.max(0,1-r);const k=(y*size+x)*4;
      data[k]=255;data[k+1]=170;data[k+2]=70;data[k+3]=Math.round(Math.pow(a,2.2)*190);
    }
    const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
    texture.needsUpdate=true;return texture;
  }

  // Distant 3D star shells and a small, explicitly named bright-star catalogue.
  const starVertices=[];
  const starColors=[];
  let seed=0x6256b;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const starCount=mobile?2600:6800;
  for(let i=0;i<starCount;i++){
    const z=random()*2-1,a=random()*TAU,r=Math.sqrt(1-z*z),d=500+random()*2500;
    starVertices.push(Math.cos(a)*r*d,z*d,Math.sin(a)*r*d);
    const hue=random();starColors.push(.66+hue*.34,.72+hue*.25,1);
  }
  const starsGeo=new THREE.BufferGeometry();
  starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starVertices,3));
  starsGeo.setAttribute('color',new THREE.Float32BufferAttribute(starColors,3));
  const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({size:mobile?1.15:1.5,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.92,depthWrite:false}));
  stars.name='Deep space star layers';scene.add(stars);

  const namedStars=[
    ['Betelgeuse',5.9195,7.4071],['Rigel',5.2423,-8.2016],['Bellatrix',5.4189,6.3497],
    ['Saiph',5.7959,-9.6696],['Alnitak',5.6793,-1.9426],['Alnilam',5.6036,-1.2019],
    ['Mintaka',5.5334,-0.2991],['Sirius',6.7525,-16.7161],['Procyon',7.655,-5.225],
    ['Aldebaran',4.5987,16.5093],['Capella',5.2782,45.998],['Polaris',2.5303,89.2641],
    ['Vega',18.6156,38.7837],['Deneb',20.6905,45.2803],['Altair',19.8464,8.8683],
    ['Arcturus',14.261,19.1824],['Spica',13.4199,-11.1613],['Antares',16.4901,-26.432],
    ['Fomalhaut',22.9608,-29.622],['Canopus',6.3992,-52.6957],['Regulus',10.1395,11.967]
  ];
  const starByName=new Map();
  const toSkyVector=(raHours,decDeg)=>{
    const ra=raHours*Math.PI/12,dec=THREE.MathUtils.degToRad(decDeg);
    return new THREE.Vector3(Math.cos(dec)*Math.cos(ra),Math.sin(dec),Math.cos(dec)*Math.sin(ra)).multiplyScalar(2200);
  };
  const namedGeometry=new THREE.BufferGeometry();
  const namedPositions=[];
  for(const [name,ra,dec] of namedStars){const v=toSkyVector(ra,dec);starByName.set(name,v);namedPositions.push(v.x,v.y,v.z);}
  namedGeometry.setAttribute('position',new THREE.Float32BufferAttribute(namedPositions,3));
  scene.add(new THREE.Points(namedGeometry,new THREE.PointsMaterial({color:0xd9eaff,size:2.2,sizeAttenuation:false,transparent:true,opacity:1,depthWrite:false})));
  const constellationLines=[
    ['Betelgeuse','Bellatrix'],['Bellatrix','Mintaka'],['Mintaka','Alnilam'],['Alnilam','Alnitak'],['Alnitak','Saiph'],['Saiph','Rigel'],['Rigel','Mintaka'],
    ['Vega','Deneb'],['Deneb','Altair'],['Altair','Vega'],
    ['Capella','Aldebaran'],['Aldebaran','Rigel']
  ];
  const linePoints=[];
  for(const [a,b] of constellationLines){linePoints.push(starByName.get(a),starByName.get(b));}
  const constellationGeometry=new THREE.BufferGeometry().setFromPoints(linePoints);
  scene.add(new THREE.LineSegments(constellationGeometry,new THREE.LineBasicMaterial({color:0x5a85ad,transparent:true,opacity:.23,depthWrite:false})));

  // Three-point depth layering adds a faint distant stellar haze without a flat CSS sky.
  const hazeGeometry=new THREE.SphereGeometry(3200,24,16);
  const haze=new THREE.Mesh(hazeGeometry,new THREE.MeshBasicMaterial({color:0x111c48,side:THREE.BackSide,transparent:true,opacity:.075,depthWrite:false}));
  scene.add(haze);

  const raycaster=new THREE.Raycaster();
  const pointer=new THREE.Vector2();
  const clickables=[earthMesh,moonMesh,sunMesh];
  const focusTargets={overview:{position:new THREE.Vector3(0,4.2,16.5),target:new THREE.Vector3(0,0,0)},
    earth:{position:new THREE.Vector3(0,.18,3.4),target:new THREE.Vector3(0,0,0)}};
  let viewState='overview',groundMode=false;
  const target=new THREE.Vector3(0,0,0);
  let cameraFrom=camera.position.clone(),cameraTo=camera.position.clone();
  let targetFrom=target.clone(),targetTo=target.clone(),transitionStart=0,transitionDuration=1.35;
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  function animateCamera(position,lookAt,duration=1.45){
    cameraFrom.copy(camera.position);cameraTo.copy(position);
    targetFrom.copy(target);targetTo.copy(lookAt);
    transitionStart=nowSeconds();transitionDuration=duration;
  }
  function focusBody(body){
    groundMode=false;
    camera.up.set(0,1,0);
    moonMesh.scale.setScalar(1);sunMesh.scale.setScalar(1);
    moonPivot.visible=true;sunGroup.visible=true;stars.visible=true;haze.visible=true;
    controls.querySelector('[data-space-ground]').textContent='GROUND SKY';
    if(body==='earth'){
      viewState='earth';animateCamera(new THREE.Vector3(0,.16,3.5),new THREE.Vector3(0,0,0));
    }else if(body==='moon'){
      viewState='moon';
      const outward=moonMesh.position.clone().normalize();
      const side=new THREE.Vector3(0,1,0).cross(outward).normalize();
      const pos=moonMesh.getWorldPosition(new THREE.Vector3()).addScaledVector(side,2.0).addScaledVector(outward,2.2);
      animateCamera(pos,moonMesh.getWorldPosition(new THREE.Vector3()),1.65);
    }else if(body==='sun'){
      viewState='sun';
      const pos=sunPosition.clone().add(new THREE.Vector3(0,0,sunRadiusVisual*3.6));
      animateCamera(pos,sunPosition,1.9);
    }
  }
  function resetView(){
    groundMode=false;viewState='overview';
    camera.up.set(0,1,0);
    moonMesh.scale.setScalar(1);sunMesh.scale.setScalar(1);
    moonPivot.visible=true;sunGroup.visible=true;stars.visible=true;haze.visible=true;
    controls.querySelector('[data-space-ground]').textContent='GROUND SKY';
    const aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);
    const distance=aspect<.72?20.5:aspect<1?18.5:16.5;
    animateCamera(new THREE.Vector3(0,4.2,distance),new THREE.Vector3(0,0,0),1.25);
  }

  function mapCenter(){
    const map=window.__BP_LANDING_WORLD__?.map||window.__bpLandingWorld__?.map||null;
    try{const c=map?.getCenter?.();if(c)return{lat:Number(c.lat)||0,lon:Number(c.lng)||0};}catch(_){}
    return{lat:0,lon:0};
  }
  function sunEquatorial(date){
    const jd=date.getTime()/86400000+2440587.5,n=jd-2451545,rad=Math.PI/180;
    const L=((280.46+.9856474*n)%360+360)%360,G=((357.528+.9856003*n)%360+360)%360;
    const lambda=(L+1.915*Math.sin(G*rad)+.020*Math.sin(2*G*rad))*rad,eps=(23.439-.0000004*n)*rad;
    return{ra:Math.atan2(Math.cos(eps)*Math.sin(lambda),Math.cos(lambda)),dec:Math.asin(Math.sin(eps)*Math.sin(lambda))};
  }
  function sidereal(date,lon){
    const jd=date.getTime()/86400000+2440587.5,d=jd-2451545;
    return THREE.MathUtils.degToRad((((280.46061837+360.98564736629*d+lon)%360)+360)%360);
  }
  function equatorialToLocal(ra,dec,date,lat,lon){
    const phi=THREE.MathUtils.degToRad(lat),ha=sidereal(date,lon)-ra;
    const east=-Math.cos(dec)*Math.sin(ha);
    const north=Math.sin(dec)*Math.cos(phi)-Math.cos(dec)*Math.cos(ha)*Math.sin(phi);
    const up=Math.sin(dec)*Math.sin(phi)+Math.cos(dec)*Math.cos(ha)*Math.cos(phi);
    return new THREE.Vector3(east,up,-north).normalize();
  }
  function setGroundSky(){
    groundMode=true;viewState='ground';
    controls.querySelector('[data-space-ground]').textContent='SPACE VIEW';
    const {lat,lon}=mapCenter(),normal=new THREE.Vector3(
      Math.cos(THREE.MathUtils.degToRad(lat))*Math.cos(THREE.MathUtils.degToRad(lon)),
      Math.sin(THREE.MathUtils.degToRad(lat)),
      Math.cos(THREE.MathUtils.degToRad(lat))*Math.sin(THREE.MathUtils.degToRad(lon))
    ).normalize();
    const observer=normal.clone().multiplyScalar(1.0015);
    camera.position.copy(observer);
    camera.up.copy(normal);
    const zenith=observer.clone().add(normal);
    camera.lookAt(zenith);
    target.copy(zenith);
    const date=new Date(),sun=sunEquatorial(date);
    const sunDir=equatorialToLocal(sun.ra,sun.dec,date,lat,lon);
    const moonRA=sun.ra+Math.PI+0.11,moonDec=-sun.dec+0.07;
    const moonDir=equatorialToLocal(moonRA,moonDec,date,lat,lon);
    const distant=900;
    sunGroup.position.copy(observer).addScaledVector(sunDir,distant);
    sunLight.position.copy(sunGroup.position);
    moonPivot.position.set(0,0,0);
    moonMesh.position.copy(observer).addScaledVector(moonDir,distant);
    moonMesh.scale.setScalar((SUN_RADIUS_KM/MOON_RADIUS_KM)*MOON_RADIUS_KM/SUN_RADIUS_KM);
    // Equal apparent angular radii in ground mode: both subtend about half a degree.
    const apparentRadius=Math.tan(THREE.MathUtils.degToRad(.266))*distant;
    sunMesh.scale.setScalar(apparentRadius/sunRadiusVisual);
    moonMesh.scale.setScalar(apparentRadius/(MOON_RADIUS_KM/EARTH_RADIUS_KM));
    sunGroup.visible=sunDir.dot(normal)>0;
    moonPivot.visible=moonDir.dot(normal)>0;
    stars.visible=sunDir.dot(normal)<-.08;
    haze.visible=stars.visible;
    renderer.render(scene,camera);
  }

  let dragging=false,lastX=0,lastY=0,pointerMoved=false;
  canvas.addEventListener('pointerdown',event=>{dragging=true;pointerMoved=false;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture?.(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{
    if(!dragging||groundMode)return;
    const dx=event.clientX-lastX,dy=event.clientY-lastY;
    if(Math.abs(dx)+Math.abs(dy)>2)pointerMoved=true;
    lastX=event.clientX;lastY=event.clientY;
    const offset=camera.position.clone().sub(target);
    const spherical=new THREE.Spherical().setFromVector3(offset);
    spherical.theta-=dx*.004;spherical.phi=THREE.MathUtils.clamp(spherical.phi+dy*.004,.10,Math.PI-.10);
    offset.setFromSpherical(spherical);camera.position.copy(target).add(offset);camera.lookAt(target);
  });
  canvas.addEventListener('pointerup',event=>{
    dragging=false;if(pointerMoved)return;
    const rect=canvas.getBoundingClientRect();
    pointer.x=((event.clientX-rect.left)/rect.width)*2-1;
    pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(clickables,false)[0];
    if(hit?.object?.userData?.body)focusBody(hit.object.userData.body);
  });
  canvas.addEventListener('pointercancel',()=>{dragging=false;});
  canvas.addEventListener('wheel',event=>{
    if(groundMode)return;
    event.preventDefault();
    const direction=camera.position.clone().sub(target).normalize();
    const distance=THREE.MathUtils.clamp(camera.position.distanceTo(target)*Math.exp(event.deltaY*.001),1.8,5000);
    camera.position.copy(target).addScaledVector(direction,distance);
  },{passive:false});
  controls.querySelector('[data-space-ground]').addEventListener('click',()=>groundMode?resetView():setGroundSky());
  controls.querySelector('[data-space-reset]').addEventListener('click',resetView);

  function resize(){
    const width=Math.max(1,host.clientWidth||innerWidth),height=Math.max(1,host.clientHeight||innerHeight);
    renderer.setSize(width,height,false);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    if(viewState==='overview'&&!groundMode)resetView();
  }
  const resizeObserver=new ResizeObserver(resize);
  resizeObserver.observe(host);
  window.addEventListener('resize',resize,{passive:true});

  const clock=new THREE.Clock();
  const reference=new Date('2026-01-01T00:00:00Z').getTime();
  let disposed=false;
  function render(){
    if(disposed)return;
    const elapsed=clock.getDelta(),t=nowSeconds();
    const elapsedFromStart=t;
    const orbitalDays=(Date.now()-reference)/86400000 + elapsedFromStart*1200/86400;
    const mean=TAU*orbitalDays/MOON_PERIOD_DAYS;
    const eccentricity=.0549;
    const E=mean+eccentricity*Math.sin(mean);
    const trueAnomaly=2*Math.atan2(Math.sqrt(1+eccentricity)*Math.sin(E/2),Math.sqrt(1-eccentricity)*Math.cos(E/2));
    const inclination=THREE.MathUtils.degToRad(5.145);
    const aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);\n    const orbitCompression=aspect<.72?.078:aspect<1?.105:.14;\n    const orbitRadius=MOON_ORBIT_KM/EARTH_RADIUS_KM*orbitCompression;
    moonPivot.position.set(0,0,0);
    if(!groundMode){
      moonMesh.position.set(orbitRadius*Math.cos(trueAnomaly),Math.sin(trueAnomaly)*Math.sin(inclination)*orbitRadius,orbitRadius*Math.sin(trueAnomaly));
      moonMesh.lookAt(earth.position);
      earth.rotation.y+=reducedMotion?0:elapsed*TAU/(SIDEREAL_DAY_SECONDS/1200);
      sunGroup.rotation.y+=reducedMotion?0:elapsed*.012;
      sunMaterial.uniforms.uTime.value=t;
      moonMaterial.uniforms.uTime.value=t;
      earthMaterial.uniforms.uTime.value=t;
      const sunDir=sunPosition.clone().normalize();
      earthMaterial.uniforms.uSunDir.value.copy(sunDir);
      moonMaterial.uniforms.uSunDir.value.copy(sunPosition.clone().sub(moonMesh.position).normalize());
      keyLight.position.copy(sunPosition);
      if(viewState==='moon'){
        const mp=moonMesh.getWorldPosition(new THREE.Vector3());
        const outward=mp.clone().normalize();
        const side=new THREE.Vector3(0,1,0).cross(outward).normalize();
        // Keep the Earth in the field of view beside/behind the foreground Moon.
        const desired=mp.clone().addScaledVector(side,2.1).addScaledVector(outward,2.0);
        if(!dragging&&transitionStart===0){camera.position.lerp(desired,.025);camera.lookAt(mp);}
      }
    }
    if(transitionStart){
      const u=THREE.MathUtils.clamp((t-transitionStart)/transitionDuration,0,1),k=ease(u);
      camera.position.lerpVectors(cameraFrom,cameraTo,k);target.lerpVectors(targetFrom,targetTo,k);camera.lookAt(target);
      if(u>=1)transitionStart=0;
    }
    if(!groundMode){
      const sunDir=sunPosition.clone().normalize();
      earthMaterial.uniforms.uSunDir.value.copy(sunDir);
      moonMaterial.uniforms.uSunDir.value.copy(sunPosition.clone().sub(moonMesh.position).normalize());
      sunLight.position.copy(sunPosition);
    }
    stars.rotation.y+=reducedMotion?0:elapsed*.0008;
    renderer.render(scene,camera);
    if(!document.hidden)requestAnimationFrame(render);
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestAnimationFrame(render);});
  resize();
  render();

  window.__BP_WELCOME_SPACE_V6256__={
    version:VERSION,
    focus:focusBody,
    reset:resetView,
    ground:setGroundSky,
    state:()=>({viewState,groundMode,moonOrbitPeriodDays:MOON_PERIOD_DAYS,
      radiiKm:{earth:EARTH_RADIUS_KM,moon:MOON_RADIUS_KM,sun:SUN_RADIUS_KM},
      cinematicOrbitDistanceScale:'responsive-compressed',proceduralLunarRelief:true})
  };
})();
