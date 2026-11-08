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
 * - The near-side Moon can stream NASA Apollo Metric Camera elevation tiles
 *   and LRO WAC imagery into a real displaced terrain mesh. Areas without this
 *   regional DEM coverage retain the global NASA imagery/procedural fallback.
 */
import * as THREE from '/vendor/three.module.js?v=169-local';

(() => {
  'use strict';
  const VERSION = 'v6257';
  if (window.__BP_WELCOME_SPACE_V6257__) return;
  window.__BP_WELCOME_SPACE_V6257__ = true;

  const host = document.querySelector('#bpWelcomeGateV1 .bpw-celestial-system');
  if (!host) return;
  host.removeAttribute('aria-hidden');

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
  canvas.id = 'bpWelcomeSpaceCanvasV6257';
  canvas.className = 'bpw-space-renderer-canvas';
  canvas.setAttribute('aria-label', 'Interactive three-dimensional Earth, Moon, Sun and starfield');
  canvas.tabIndex = 0;
  host.appendChild(canvas);

  const style = document.createElement('style');
  style.id = 'bpWelcomeSpaceStylesV6257';
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
  controls.innerHTML = '<button type="button" data-space-reset>RESET VIEW</button>'; 
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

  // The existing MapLibre Earth remains the only Earth in the welcome scene.
  // This invisible origin is only the Moon's orbital reference point.
  const earth = new THREE.Group();
  earth.name = 'BridgePoint Earth reference anchor';
  scene.add(earth);

  const moonPivot = new THREE.Group();
  moonPivot.name = 'Moon orbital pivot';
  scene.add(moonPivot);
  const moonGeometry = new THREE.SphereGeometry(MOON_RADIUS_KM / EARTH_RADIUS_KM, mobile ? 96 : 144, mobile ? 64 : 96);
  const moonMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(0.55, 0.38, 0.74).normalize() }, uBaseTexture: { value: null }, uBaseTextureReady: { value: 0 }, uTerrainMask: { value: null }, uTerrainUvRect: { value: new THREE.Vector4(0,0,0,0) }, uTerrainActive: { value: 0 } },
    vertexShader: `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec3 vNormal; varying vec3 vPos; varying vec2 vUv;
      void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: `
      #include <common>
      #include <logdepthbuf_pars_fragment>
      precision highp float; varying vec3 vNormal; varying vec3 vPos; varying vec2 vUv; uniform float uTime; uniform vec3 uSunDir; uniform sampler2D uBaseTexture; uniform float uBaseTextureReady; uniform sampler2D uTerrainMask; uniform vec4 uTerrainUvRect; uniform float uTerrainActive;
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
        vec3 p=normalize(vPos);vec2 bodyUV=vec2(atan(-p.x,p.z)/6.28318530718+.5,.5+asin(clamp(p.y,-1.0,1.0))/3.14159265359);if(uTerrainActive>.5){vec2 patchUV=(bodyUV-uTerrainUvRect.xy)/uTerrainUvRect.zw;if(all(greaterThanEqual(patchUV,vec2(0.0)))&&all(lessThanEqual(patchUV,vec2(1.0)))){if(texture2D(uTerrainMask,patchUV).a>.5)discard;}}float maria=fbm(p*5.1+vec3(5,2,1));
        float high=fbm(p*24.0);float small=fbm(p*88.0);float micro=fbm(p*176.0);
        float cr=crater(p,19.0)+crater(p,46.0)*.58;
        float relief=high*.16+small*.08+micro*.035-cr;
        vec3 highlands=vec3(.69,.70,.69);vec3 basalt=vec3(.30,.32,.33);
        vec3 albedo=mix(basalt,highlands,smoothstep(.36,.66,maria+relief*.2));
        vec3 nasaBase=texture2D(uBaseTexture,bodyUV).rgb;
        albedo=mix(albedo,nasaBase*1.32,uBaseTextureReady*.88);
        albedo*=.78+relief*.7;albedo+=vec3(.09,.09,.085)*pow(max(small-.68,0.0),2.0);
        vec3 normal=normalize(vNormal);float light=max(dot(normal,normalize(uSunDir)),0.0);
        float limb=.20+.80*pow(max(normal.z,0.0),.42);
        vec3 color=albedo*(.075+.98*light)*limb;
        float ejecta=pow(max(fbm(p*62.0)-.70,0.0),2.0);color+=vec3(.11,.105,.095)*ejecta;
        gl_FragColor=vec4(color,1.0);
        #include <logdepthbuf_fragment>
      }`,
    depthTest: true, depthWrite: true, transparent: false, side: THREE.FrontSide
  });
  const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
  const moonUserRotation = new THREE.Quaternion();
  moonMesh.name = 'Moon';
  moonMesh.userData.body = 'moon';
  moonMesh.position.set(8.2, 0.7, -1.4);
  moonPivot.add(moonMesh);

  let sunPosition = new THREE.Vector3(2.05,4.6,3.4);
  // Cinematic overview compresses inter-body distance and disk scale; ground sky uses apparent angular diameter.
  const sunRadiusVisual = 1.22;
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
  const clickables=[moonMesh,sunMesh];
  let viewState='overview',focusedObject=null;
  let focusLocalTarget=null,moonTerrainController=null;

// NASA lunar data is streamed only when the Moon is selected.
// The equatorial Apollo Metric Camera grayscale tiles encode actual elevation
// (-8,000m to +8,000m). NASA LRO WAC tiles provide the matching surface imagery.
function moonSurfacePoint(latDeg, lonDeg, elevationMeters = 0) {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const radius = MOON_RADIUS_KM / EARTH_RADIUS_KM + Number(elevationMeters || 0) / (1000 * EARTH_RADIUS_KM);
  return new THREE.Vector3(
    -radius * Math.cos(lat) * Math.sin(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.cos(lon)
  );
}

function createMoonTerrainController() {
  const DEM_Z = 8, DEM_COLS = 512, DEM_ROWS = 256, TILE = 256, PATCH_TILES = 3;
  const DEM_LAYER = 'Apollo15_MetricCam_Gray_Global_1024ppd';
  const WAC_LAYER = 'LRO_WAC_Mosaic_Global_303ppd_v02';
  const BASE = 'https://trek.nasa.gov/tiles/Moon/EQ/';
  const bitmapCache = new Map();
  let active = false, requestId = 0, patchKey = '', loadingKey = '', loadingPromise = null;
  let patchMesh = null, colorTexture = null, maskTexture = null, lastHeightCanvas = null;
  let lastHeightPixels = null, lastRegion = null, baseTextureLoading = null;
  const state = {
    version: 1, source: 'NASA Apollo 15 Metric Camera DEM + NASA LRO WAC global mosaic',
    demEncoding: '8-bit grayscale maps -8000m to +8000m; transparent pixels are no-data',
    demTileZoom: DEM_Z, patchTiles: PATCH_TILES, status: 'idle', updatedAt: Date.now()
  };

  function url(layer, z, row, col, ext) {
    return BASE + layer + '/1.0.0/default/default028mm/' + z + '/' + row + '/' + col + '.' + ext;
  }
  function bitmap(src) {
    if (bitmapCache.has(src)) return bitmapCache.get(src);
    const task = (async () => {
      try {
        const response = await fetch(src, { mode: 'cors', credentials: 'omit', cache: 'force-cache' });
        if (!response.ok) return null;
        return await createImageBitmap(await response.blob());
      } catch (error) {
        console.warn('[BridgePoint Moon] NASA tile unavailable:', src, error?.message || error);
        return null;
      }
    })();
    bitmapCache.set(src, task);
    return task;
  }
  function commitState(status, extra = {}) {
    Object.assign(state, extra, { status, active, updatedAt: Date.now() });
    window.__BP_MOON_TERRAIN_V1__ = state;
  }
  function clearTerrainPatch() {
    if (patchMesh) {
      moonMesh.remove(patchMesh);
      patchMesh.geometry.dispose();
      patchMesh.material.map?.dispose();
      patchMesh.material.dispose();
      patchMesh = null;
    }
    colorTexture?.dispose();
    maskTexture?.dispose();
    colorTexture = null;
    maskTexture = null;
    moonMaterial.uniforms.uTerrainMask.value = null;
    moonMaterial.uniforms.uTerrainActive.value = 0;
    patchKey = '';
    lastHeightCanvas = null;
    lastHeightPixels = null;
    lastRegion = null;
  }
  async function loadGlobalWac() {
    if (moonMaterial.uniforms.uBaseTextureReady.value > 0.5) return true;
    if (baseTextureLoading) return baseTextureLoading;
    baseTextureLoading = (async () => {
      const canvas = document.createElement('canvas');
      canvas.width = TILE * 2;
      canvas.height = TILE;
      const ctx = canvas.getContext('2d');
      const tiles = await Promise.all([
        bitmap(url(WAC_LAYER, 0, 0, 0, 'jpg')),
        bitmap(url(WAC_LAYER, 0, 0, 1, 'jpg'))
      ]);
      tiles.forEach((image, index) => { if (image) ctx.drawImage(image, index * TILE, 0, TILE, TILE); });
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = true;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      moonMaterial.uniforms.uBaseTexture.value = texture;
      moonMaterial.uniforms.uBaseTextureReady.value = tiles.some(Boolean) ? 1 : 0;
      return tiles.some(Boolean);
    })().catch(error => {
      console.warn('[BridgePoint Moon] NASA WAC global imagery could not load:', error);
      return false;
    }).finally(() => { baseTextureLoading = null; });
    return baseTextureLoading;
  }
  function elevationAt(latDeg, lonDeg) {
    if (!lastHeightPixels || !lastRegion) return null;
    const lon = ((lonDeg + 180) % 360 + 360) % 360;
    const worldCol = lon / 360 * DEM_COLS;
    const worldRow = (90 - latDeg) / 180 * DEM_ROWS;
    const u = (worldCol - lastRegion.startCol) / PATCH_TILES;
    const v = (worldRow - lastRegion.startRow) / PATCH_TILES;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    const px = Math.max(0, Math.min(lastRegion.width - 1, Math.round(u * (lastRegion.width - 1))));
    const py = Math.max(0, Math.min(lastRegion.height - 1, Math.round(v * (lastRegion.height - 1))));
    const offset = (py * lastRegion.width + px) * 4;
    if (lastHeightPixels[offset + 3] < 16) return null;
    return lastHeightPixels[offset] / 255 * 16000 - 8000;
  }
  function focusResult(latDeg, lonDeg) {
    const elevation = elevationAt(latDeg, lonDeg);
    if (!Number.isFinite(elevation)) return null;
    return {
      lat: latDeg, lon: lonDeg, elevationMeters: elevation,
      focusPointLocal: moonSurfacePoint(latDeg, lonDeg, elevation)
    };
  }
  async function loadPatch(latDeg, lonDeg) {
    const worldCol = ((lonDeg + 180) % 360 + 360) % 360 / 360 * DEM_COLS;
    const worldRow = (90 - latDeg) / 180 * DEM_ROWS;
    const centerCol = Math.floor(worldCol);
    const centerRow = Math.floor(worldRow);
    const startCol = Math.max(0, Math.min(DEM_COLS - PATCH_TILES, centerCol - 1));
    const startRow = Math.max(0, Math.min(DEM_ROWS - PATCH_TILES, centerRow - 1));
    const key = startCol + ':' + startRow;
    if (patchKey === key && patchMesh) {
      patchMesh.visible = active;
      moonMaterial.uniforms.uTerrainActive.value = active ? 1 : 0;
      commitState('ready', { tileWindow: key, elevationSource: DEM_LAYER });
      return focusResult(latDeg, lonDeg);
    }
    if (loadingKey === key && loadingPromise) return loadingPromise;
    loadingKey = key;
    const thisRequest = ++requestId;
    loadingPromise = (async () => {
      commitState('loading', { tileWindow: key, elevationSource: DEM_LAYER });
      const heightCanvas = document.createElement('canvas');
      const colorCanvas = document.createElement('canvas');
      const width = TILE * PATCH_TILES, height = TILE * PATCH_TILES;
      heightCanvas.width = colorCanvas.width = width;
      heightCanvas.height = colorCanvas.height = height;
      const hctx = heightCanvas.getContext('2d', { willReadFrequently: true });
      const cctx = colorCanvas.getContext('2d');
      const jobs = [];
      for (let row = 0; row < PATCH_TILES; row++) {
        for (let col = 0; col < PATCH_TILES; col++) {
          const drawX = col * TILE, drawY = row * TILE;
          const sourceRow = startRow + row, sourceCol = startCol + col;
          jobs.push(bitmap(url(DEM_LAYER, DEM_Z, sourceRow, sourceCol, 'png')).then(image => {
            if (image) hctx.drawImage(image, drawX, drawY, TILE, TILE);
          }));
          jobs.push(bitmap(url(WAC_LAYER, DEM_Z, sourceRow, sourceCol, 'jpg')).then(image => {
            if (image) cctx.drawImage(image, drawX, drawY, TILE, TILE);
          }));
        }
      }
      await Promise.all(jobs);
      if (thisRequest !== requestId || !active) return null;
      const pixels = hctx.getImageData(0, 0, width, height).data;
      const mobileBudget = matchMedia('(max-width: 700px)').matches || (navigator.deviceMemory || 4) <= 3;
      const segments = mobileBudget ? 384 : 768;
      const vertexWidth = segments + 1, vertexCount = vertexWidth * vertexWidth;
      const positions = new Float32Array(vertexCount * 3);
      const uvs = new Float32Array(vertexCount * 2);
      const valid = new Uint8Array(vertexCount);
      const coverageCanvas = document.createElement('canvas');
      coverageCanvas.width = segments;
      coverageCanvas.height = segments;
      const coverageContext = coverageCanvas.getContext('2d', { willReadFrequently: false });
      const coverageImage = coverageContext.createImageData(segments, segments);
      const radiusBase = MOON_RADIUS_KM / EARTH_RADIUS_KM;
      for (let y = 0; y <= segments; y++) {
        const v = y / segments;
        const rowPixel = Math.max(0, Math.min(height - 1, Math.round(v * (height - 1))));
        const lat = THREE.MathUtils.degToRad(90 - ((startRow + v * PATCH_TILES) / DEM_ROWS) * 180);
        for (let x = 0; x <= segments; x++) {
          const u = x / segments;
          const colPixel = Math.max(0, Math.min(width - 1, Math.round(u * (width - 1))));
          const pixelOffset = (rowPixel * width + colPixel) * 4;
          const vertex = y * vertexWidth + x;
          const alpha = pixels[pixelOffset + 3];
          const hasHeight = alpha >= 16;
          valid[vertex] = hasHeight ? 1 : 0;
          const elevation = hasHeight ? pixels[pixelOffset] / 255 * 16000 - 8000 : 0;
          const radius = radiusBase + elevation / (1000 * EARTH_RADIUS_KM);
          const lon = THREE.MathUtils.degToRad(((startCol + u * PATCH_TILES) / DEM_COLS) * 360 - 180);
          const c = Math.cos(lat);
          const p = vertex * 3;
          positions[p] = -radius * c * Math.sin(lon);
          positions[p + 1] = radius * Math.sin(lat);
          positions[p + 2] = radius * c * Math.cos(lon);
          const uv = vertex * 2;
          uvs[uv] = u;
          uvs[uv + 1] = 1 - v;
        }
      }
      const indices = [];
      for (let y = 0; y < segments; y++) {
        const row = y * vertexWidth;
        for (let x = 0; x < segments; x++) {
          const a = row + x, b = a + 1, d = a + vertexWidth, c = d + 1;
          if (valid[a] && valid[b] && valid[c] && valid[d]) {
            indices.push(a, b, d, b, c, d);
            const coverageOffset = (y * segments + x) * 4;
            coverageImage.data[coverageOffset] = 255;
            coverageImage.data[coverageOffset + 1] = 255;
            coverageImage.data[coverageOffset + 2] = 255;
            coverageImage.data[coverageOffset + 3] = 255;
          }
        }
      }
      if (thisRequest !== requestId) return null;
      if (indices.length < 300) {
        clearTerrainPatch();
        commitState('no-dem-coverage', { tileWindow: key, elevationSource: DEM_LAYER });
        return null;
      }
      coverageContext.putImageData(coverageImage, 0, 0);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      const texture = new THREE.CanvasTexture(colorCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = true;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      const mask = new THREE.CanvasTexture(coverageCanvas);
      mask.flipY = true;
      mask.generateMipmaps = false;
      mask.minFilter = THREE.NearestFilter;
      mask.magFilter = THREE.NearestFilter;
      const material = new THREE.MeshStandardMaterial({
        map: texture, roughness: 1, metalness: 0, side: THREE.DoubleSide,
        depthTest: true, depthWrite: true, transparent: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = 'NASA Apollo 15 Metric Camera lunar elevation mesh';
      mesh.userData = {
        source: 'NASA Moon Trek WMTS Apollo15 MetricCam DEM',
        imagery: 'NASA LRO WAC Mosaic Global 303ppd',
        resolutionLabel: 'NASA source product 1024ppd; delivered as 256px regional WMTS tiles',
        heightRangeMeters: [-8000, 8000],
        tileZoom: DEM_Z,
        tileWindow: key
      };
      mesh.frustumCulled = false;
      mesh.renderOrder = 2;
      moonMesh.add(mesh);
      if (patchMesh) {
        moonMesh.remove(patchMesh);
        patchMesh.geometry.dispose();
        patchMesh.material.map?.dispose();
        patchMesh.material.dispose();
      }
      colorTexture?.dispose();
      maskTexture?.dispose();
      patchMesh = mesh;
      colorTexture = texture;
      maskTexture = mask;
      lastHeightCanvas = heightCanvas;
      lastHeightPixels = pixels;
      lastRegion = { startCol, startRow, width, height };
      patchKey = key;
      const uMin = startCol / DEM_COLS;
      const uRange = PATCH_TILES / DEM_COLS;
      const northLat = 90 - startRow / DEM_ROWS * 180;
      const southLat = 90 - (startRow + PATCH_TILES) / DEM_ROWS * 180;
      const vMin = 0.5 + southLat / 180;
      const vRange = (northLat - southLat) / 180;
      moonMaterial.uniforms.uTerrainMask.value = maskTexture;
      moonMaterial.uniforms.uTerrainUvRect.value.set(uMin, vMin, uRange, vRange);
      moonMaterial.uniforms.uTerrainActive.value = active ? 1 : 0;
      patchMesh.visible = active;
      commitState('ready', {
        tileWindow: key, validTriangles: indices.length / 3, meshVertices: vertexCount,
        heightResolution: 'NASA Apollo 15 Metric Camera DEM WMTS level 8',
        imageryResolution: 'NASA LRO WAC WMTS level 8'
      });
      return focusResult(latDeg, lonDeg);
    })().finally(() => {
      if (loadingKey === key) { loadingKey = ''; loadingPromise = null; }
    });
    return loadingPromise;
  }
  function surfaceRadiusAt(latDeg, lonDeg) {
    const elevation = elevationAt(latDeg, lonDeg);
    const base = MOON_RADIUS_KM / EARTH_RADIUS_KM;
    return base + (Number.isFinite(elevation) ? elevation / (1000 * EARTH_RADIUS_KM) : 0);
  }
  function setActive(value) {
    active = !!value;
    moonMaterial.uniforms.uTerrainActive.value = active && maskTexture ? 1 : 0;
    if (patchMesh) patchMesh.visible = active;
    commitState(active ? (patchMesh ? 'ready' : 'loading') : 'inactive');
  }
  function updateForCamera(worldPosition) {
    if (!active || !worldPosition) return Promise.resolve(null);
    moonMesh.updateMatrixWorld(true);
    const local = moonMesh.worldToLocal(worldPosition.clone());
    const normal = local.normalize();
    const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(normal.y, -1, 1)));
    const lon = THREE.MathUtils.radToDeg(Math.atan2(-normal.x, normal.z));
    return loadPatch(lat, lon);
  }
  void loadGlobalWac();
  window.__BP_MOON_TERRAIN_V1__ = state;
  return {
    activate(lat, lon) {
      setActive(true);
      return loadPatch(lat, lon).then(result => result || {
        lat, lon, elevationMeters: null, focusPointLocal: moonSurfacePoint(lat, lon, 0)
      });
    },
    updateForCamera(worldPosition) {
      if (!active || !worldPosition) return Promise.resolve(null);
      moonMesh.updateMatrixWorld(true);
      const local = moonMesh.worldToLocal(worldPosition.clone());
      const normal = local.normalize();
      const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(normal.y, -1, 1)));
      const lon = THREE.MathUtils.radToDeg(Math.atan2(-normal.x, normal.z));
      return loadPatch(lat, lon).then(result => result || {
        lat, lon, elevationMeters: null, focusPointLocal: moonSurfacePoint(lat, lon, 0)
      });
    },
    setActive,
    surfaceRadiusAt,
    get state() { return state; }
  };
}


  const target=new THREE.Vector3(0,0,0);
  let cameraFrom=camera.position.clone(),cameraTo=camera.position.clone();
  let targetFrom=target.clone(),targetTo=target.clone(),transitionStart=0,transitionDuration=1.35;
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  function animateCamera(position,lookAt,duration=1.45){
    cameraFrom.copy(camera.position);cameraTo.copy(position);
    targetFrom.copy(target);targetTo.copy(lookAt);
    transitionStart=nowSeconds();transitionDuration=duration;
  }
  function setResponsiveSunPosition(){
    const aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);
    sunPosition.copy(aspect<.72?new THREE.Vector3(2.05,4.6,3.4):aspect<1?new THREE.Vector3(2.8,4.9,4.0):new THREE.Vector3(4.0,5.1,4.5));
    sunGroup.position.copy(sunPosition);sunLight.position.copy(sunPosition);
  }
  function focusBody(body){
    const focused=body==='moon'?moonMesh:body==='sun'?sunMesh:null;
    if(!focused)return;
    focusedObject=focused;viewState=body;camera.up.set(0,1,0);
    if(body!=='moon'){focusLocalTarget=null;moonTerrainController?.setActive(false);camera.near=0.001;}else{camera.near=0.00000005;}
    moonPivot.visible=true;sunGroup.visible=true;stars.visible=true;haze.visible=true;
    moonMesh.scale.setScalar(1);sunMesh.scale.setScalar(1);
    const world=focused===sunMesh?sunGroup.getWorldPosition(new THREE.Vector3()):focused.getWorldPosition(new THREE.Vector3());
    if(body==='moon'){
      camera.fov=42;camera.updateProjectionMatrix();
      // Keep the selected NASA near-side DEM site at the center of the lunar view.
      const focusLat=26.1322,focusLon=3.6333;
      focusLocalTarget=moonSurfacePoint(focusLat,focusLon,0);
      moonMesh.updateMatrixWorld(true);
      const surface=moonMesh.localToWorld(focusLocalTarget.clone());
      const surfaceNormal=focusLocalTarget.clone().normalize().transformDirection(moonMesh.matrixWorld);
      animateCamera(surface.clone().addScaledVector(surfaceNormal,1.25),surface,1.55);
      if(!moonTerrainController)moonTerrainController=createMoonTerrainController();
      void moonTerrainController.activate(focusLat,focusLon).then(result=>{
        if(!result||viewState!=='moon'||!focusLocalTarget)return;
        focusLocalTarget.copy(result.focusPointLocal);
        moonMesh.updateMatrixWorld(true);
        const resolved=moonMesh.localToWorld(focusLocalTarget.clone());
        if(transitionStart){const delta=resolved.clone().sub(targetTo);targetTo.add(delta);cameraTo.add(delta);}
        else{const delta=resolved.clone().sub(target);target.copy(resolved);camera.position.add(delta);camera.lookAt(target);}
      }).catch(error=>console.warn('[BridgePoint Moon] NASA DEM load failed:',error));
    }else{
      camera.fov=62;camera.updateProjectionMatrix();
      animateCamera(world.clone().add(new THREE.Vector3(0,0,sunRadiusVisual*2.7)),world,1.8);
    }
  }
  function resetView(){
    focusedObject=null;focusLocalTarget=null;viewState='overview';moonTerrainController?.setActive(false);camera.near=0.001;camera.up.set(0,1,0);camera.fov=48;camera.updateProjectionMatrix();
    moonMesh.scale.setScalar(1);sunMesh.scale.setScalar(1);
    moonPivot.visible=true;sunGroup.visible=true;stars.visible=true;haze.visible=true;
    setResponsiveSunPosition();
    const aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight),distance=aspect<.72?20.5:aspect<1?18.5:16.5;
    animateCamera(new THREE.Vector3(0,4.2,distance),new THREE.Vector3(0,0,0),1.25);
  }

  let dragging=false,lastX=0,lastY=0,pointerMoved=false;
  const activePointers=new Map();
  let pinchDistance=0,gestureCenter=null,gestureAngle=0;

  function enforceMoonCameraClearance(){
    if(viewState!=='moon')return;
    moonMesh.updateMatrixWorld(true);
    const localCamera=moonMesh.worldToLocal(camera.position.clone());
    if(localCamera.lengthSq()<1e-18)return;
    const radial=localCamera.clone().normalize();
    const latitude=THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(radial.y,-1,1)));
    const longitude=THREE.MathUtils.radToDeg(Math.atan2(-radial.x,radial.z));
    const surfaceRadius=moonTerrainController?.surfaceRadiusAt(latitude,longitude)
      ?? MOON_RADIUS_KM/EARTH_RADIUS_KM;
    const clearance=3/(1000*EARTH_RADIUS_KM);
    const minimumRadius=surfaceRadius+clearance;
    if(localCamera.length()<minimumRadius){
      localCamera.setLength(minimumRadius);
      camera.position.copy(moonMesh.localToWorld(localCamera));
    }
  }
  function moonZoomDistance(distance){
    const minimum=viewState==='moon'?0.00000045:1.8;
    return THREE.MathUtils.clamp(distance,minimum,5000);
  }
  function zoomCameraBy(factor){
    const direction=camera.position.clone().sub(target).normalize();
    const distance=moonZoomDistance(camera.position.distanceTo(target)*factor);
    camera.position.copy(target).addScaledVector(direction,distance);
    enforceMoonCameraClearance();
    camera.lookAt(target);
  }
  function rotateMoonBy(dx,dy,twist=0){
    if(viewState!=='moon')return;
    moonMesh.updateMatrixWorld(true);
    const inverseMoon=moonMesh.getWorldQuaternion(new THREE.Quaternion()).invert();
    const cameraRight=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion).applyQuaternion(inverseMoon).normalize();
    const cameraUp=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion).applyQuaternion(inverseMoon).normalize();
    const cameraForward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).applyQuaternion(inverseMoon).normalize();
    const yaw=new THREE.Quaternion().setFromAxisAngle(cameraUp,-dx*.0042);
    const pitch=new THREE.Quaternion().setFromAxisAngle(cameraRight,-dy*.0042);
    const roll=new THREE.Quaternion().setFromAxisAngle(cameraForward,twist);
    moonUserRotation.multiply(yaw).multiply(pitch).multiply(roll).normalize();
    enforceMoonCameraClearance();
  }
  function moonCameraTiltRadians(){
    if(viewState!=='moon'||!focusLocalTarget)return 0;
    moonMesh.updateMatrixWorld(true);
    const surfaceNormal=focusLocalTarget.clone().normalize().transformDirection(moonMesh.matrixWorld);
    const cameraOutward=camera.position.clone().sub(target).normalize();
    return Math.acos(THREE.MathUtils.clamp(cameraOutward.dot(surfaceNormal),-1,1));
  }
  function tiltMoonCamera(deltaY){
    if(viewState!=='moon'||!focusLocalTarget||Math.abs(deltaY)<.01)return;
    moonMesh.updateMatrixWorld(true);
    const surfaceNormal=focusLocalTarget.clone().normalize().transformDirection(moonMesh.matrixWorld);
    const offset=camera.position.clone().sub(target);
    const currentAngle=Math.acos(THREE.MathUtils.clamp(offset.clone().normalize().dot(surfaceNormal),-1,1));
    const maximumTilt=THREE.MathUtils.degToRad(84);
    const nextAngle=THREE.MathUtils.clamp(currentAngle-deltaY*.0042,0,maximumTilt);
    const deltaAngle=nextAngle-currentAngle;
    if(Math.abs(deltaAngle)<1e-7)return;
    const cameraRight=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion).normalize();
    offset.applyAxisAngle(cameraRight,deltaAngle);
    camera.position.copy(target).add(offset);
    enforceMoonCameraClearance();
    camera.lookAt(target);
  }
  function rotateCameraOrMoon(dx,dy){
    if(viewState==='moon'){
      rotateMoonBy(dx,dy);
      return;
    }
    const offset=camera.position.clone().sub(target);
    const spherical=new THREE.Spherical().setFromVector3(offset);
    spherical.theta-=dx*.004;
    spherical.phi=THREE.MathUtils.clamp(spherical.phi+dy*.004,.10,Math.PI-.10);
    offset.setFromSpherical(spherical);
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
  }
  function refreshLunarTerrainFromView(){
    if(viewState!=='moon'||!moonTerrainController)return;
    void moonTerrainController.updateForCamera(camera.position.clone()).then(result=>{
      if(!result||viewState!=='moon')return;
      focusLocalTarget=result.focusPointLocal.clone();
      moonMesh.updateMatrixWorld(true);
      const resolved=moonMesh.localToWorld(focusLocalTarget.clone());
      const delta=resolved.clone().sub(target);
      if(transitionStart){targetTo.add(delta);cameraTo.add(delta);}
      else{target.copy(resolved);camera.position.add(delta);enforceMoonCameraClearance();camera.lookAt(target);}
    }).catch(error=>console.warn('[BridgePoint Moon] terrain viewport refresh failed:',error));
  }
  function getTwoPointerGesture(){
    const pts=[...activePointers.values()].slice(0,2);
    if(pts.length<2)return null;
    return {
      distance:Math.max(1,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)),
      center:{x:(pts[0].x+pts[1].x)*.5,y:(pts[0].y+pts[1].y)*.5},
      angle:Math.atan2(pts[1].y-pts[0].y,pts[1].x-pts[0].x)
    };
  }
  canvas.addEventListener('pointerdown',event=>{
    if(activePointers.size===0){pointerMoved=false;lastX=event.clientX;lastY=event.clientY;}
    activePointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    dragging=true;
    if(activePointers.size===2){
      const gesture=getTwoPointerGesture();
      pinchDistance=gesture.distance;
      gestureCenter=gesture.center;
      gestureAngle=gesture.angle;
      pointerMoved=true;
    }
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(!activePointers.has(event.pointerId))return;
    activePointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(activePointers.size>1){
      const gesture=getTwoPointerGesture();
      if(!gesture)return;
      if(viewState==='moon'&&gestureCenter){
        const dx=gesture.center.x-gestureCenter.x;
        const dy=gesture.center.y-gestureCenter.y;
        let twist=gesture.angle-gestureAngle;
        if(twist>Math.PI)twist-=Math.PI*2;
        if(twist<-Math.PI)twist+=Math.PI*2;
        // Match Earth's globe touchPitch: vertical two-finger movement tilts the view,
        // horizontal movement spins the lunar globe, and finger spread still zooms.
        rotateMoonBy(dx,0,twist);
        tiltMoonCamera(dy);
      }
      if(pinchDistance>0)zoomCameraBy(pinchDistance/gesture.distance);
      pinchDistance=gesture.distance;
      gestureCenter=gesture.center;
      gestureAngle=gesture.angle;
      pointerMoved=true;
      return;
    }
    if(!dragging)return;
    const dx=event.clientX-lastX,dy=event.clientY-lastY;
    if(Math.abs(dx)+Math.abs(dy)>2)pointerMoved=true;
    lastX=event.clientX;lastY=event.clientY;
    rotateCameraOrMoon(dx,dy);
  });
  canvas.addEventListener('pointerup',event=>{
    activePointers.delete(event.pointerId);
    dragging=activePointers.size>0;
    if(activePointers.size===1){
      const remaining=[...activePointers.values()][0];
      lastX=remaining.x;lastY=remaining.y;
      pinchDistance=0;gestureCenter=null;
    }else if(activePointers.size===0){
      pinchDistance=0;gestureCenter=null;
    }
    if(pointerMoved){
      if(activePointers.size===0){refreshLunarTerrainFromView();pointerMoved=false;}
      return;
    }
    if(activePointers.size!==0)return;
    const rect=canvas.getBoundingClientRect();
    pointer.x=((event.clientX-rect.left)/rect.width)*2-1;
    pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(clickables,false)[0];
    if(hit?.object?.userData?.body)focusBody(hit.object.userData.body);
  });
  canvas.addEventListener('pointercancel',event=>{
    activePointers.delete(event.pointerId);dragging=activePointers.size>0;
    if(activePointers.size<2){pinchDistance=0;gestureCenter=null;}
    if(activePointers.size===0){pointerMoved=false;refreshLunarTerrainFromView();}
  });
  canvas.addEventListener('wheel',event=>{
    event.preventDefault();
    zoomCameraBy(Math.exp(event.deltaY*.001));
  },{passive:false});
  controls.querySelector('[data-space-reset]').addEventListener('click',resetView);

  function resize(){
    const width=Math.max(1,host.clientWidth||innerWidth),height=Math.max(1,host.clientHeight||innerHeight);
    renderer.setSize(width,height,false);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    if(viewState==='overview')resetView();
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
    const aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);
    const orbitCompression=aspect<.72?.055:aspect<1?.085:.14;
    const orbitRadius=MOON_ORBIT_KM/EARTH_RADIUS_KM*orbitCompression;
    moonPivot.position.set(0,0,0);
    {
      moonMesh.position.set(orbitRadius*Math.cos(trueAnomaly),Math.sin(trueAnomaly)*Math.sin(inclination)*orbitRadius,orbitRadius*Math.sin(trueAnomaly));
      moonMesh.lookAt(earth.position);
      moonMesh.quaternion.multiply(moonUserRotation);
      const sunWorld=sunGroup.getWorldPosition(new THREE.Vector3());
      moonMaterial.uniforms.uSunDir.value.copy(moonMesh.worldToLocal(sunWorld.clone()).normalize());
    }
    if(transitionStart){
      const u=THREE.MathUtils.clamp((t-transitionStart)/transitionDuration,0,1),k=ease(u);
      camera.position.lerpVectors(cameraFrom,cameraTo,k);target.lerpVectors(targetFrom,targetTo,k);camera.lookAt(target);
      if(u>=1)transitionStart=0;
    }
    sunMaterial.uniforms.uTime.value=t;
    moonMaterial.uniforms.uTime.value=t;
    const sunWorld=sunGroup.getWorldPosition(new THREE.Vector3());
    moonMaterial.uniforms.uSunDir.value.copy(moonMesh.worldToLocal(sunWorld.clone()).normalize());
    if(!reducedMotion)sunGroup.rotation.y+=elapsed*.012;
    if(focusedObject&&!transitionStart&&!dragging){
      const focusedWorld=focusedObject===sunMesh?sunGroup.getWorldPosition(new THREE.Vector3()):(focusLocalTarget?moonMesh.localToWorld(focusLocalTarget.clone()):focusedObject.getWorldPosition(new THREE.Vector3()));
      camera.position.add(focusedWorld.clone().sub(target));target.copy(focusedWorld);camera.lookAt(target);
    }
    if(viewState==='moon'){enforceMoonCameraClearance();camera.lookAt(target);}
    stars.rotation.y+=reducedMotion?0:elapsed*.0008;
    renderer.render(scene,camera);
    if(!document.hidden)requestAnimationFrame(render);
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestAnimationFrame(render);});
  resize();
  render();

  window.__BP_WELCOME_SPACE_V6257__={
    version:VERSION,
    focus:focusBody,
    reset:resetView,
    state:()=>({viewState,moonOrbitPeriodDays:MOON_PERIOD_DAYS,
      moonCameraTiltDegrees:THREE.MathUtils.radToDeg(moonCameraTiltRadians()),
      radiiKm:{earth:EARTH_RADIUS_KM,moon:MOON_RADIUS_KM,sun:SUN_RADIUS_KM},
      cinematicOrbitDistanceScale:'responsive-compressed',
      lunarTerrain:window.__BP_MOON_TERRAIN_V1__||{status:'not-requested'},
      proceduralLunarRelief:'fallback-only-outside-loaded-NASA-DEM-coverage'})
  };
})();
