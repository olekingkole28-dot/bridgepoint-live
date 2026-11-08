/**
 * BridgePoint Intelligence — Welcome Space Scene v6259
 * A self-contained Three.js celestial scene for the welcome gate.
 *
 * Scale policy:
 * - Earth and Moon radii use their mean-radius ratio. The welcome Sun disk is a
 *   cinematic presentation scale, not its physical radius.
 * - Inter-body distances in the cinematic overview are compressed so all bodies
 *   remain visible on a phone and desktop. Ground-sky mode restores the Sun and
 *   Moon's matching real apparent angular radii (about 0.5 degrees).
 * - The Moon uses BridgePoint-hosted SLDEM2015/LOLA elevation and LROC color
 *   assets. Global relief and a high-resolution crater patch are decoded locally;
 *   no NASA/Moon Trek terrain tiles are requested at runtime.
 */
import * as THREE from '/vendor/three.module.js?v=169-local';

(() => {
  'use strict';
  const VERSION = 'v6259';
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

// Lunar elevation and color are served only from BridgePoint static assets.
// Source products were materialized locally; the browser never requests NASA/Moon Trek tiles.
function createMoonTerrainController() {
  const ASSET = '/assets/moon/v1/';
  const PATCH = { west: 1.6333, east: 5.6333, south: 24.1322, north: 28.1322 };
  const mobile = matchMedia('(max-width: 700px)').matches || (navigator.deviceMemory || 4) <= 3;
  let active = false, assetsPromise = null, globalData = null, patchData = null;
  let colorTexture = null, patchMesh = null, maskTexture = null;
  let labelData = null, preparedLabels = [], labelSprites = new Map(), lastLabelRefreshAt = 0;
  const state = {
    version: 2,
    source: 'BridgePoint-hosted SLDEM2015 + LOLA elevation and LROC color',
    demEncoding: '16-bit grayscale PNG; elevationMeters = sample - 32768',
    runtimeMode: 'local-static-assets',
    assetBase: ASSET,
    status: 'idle',
    labelStatus: 'idle',
    labelCount: 0,
    visibleLabelCount: 0,
    navigationMode: 'surface-pan-pitch-clearance',
    updatedAt: Date.now()
  };
  const labelsGroup = new THREE.Group();
  labelsGroup.name = 'USGS IAU lunar feature labels and lunar exploration sites';
  labelsGroup.visible = false;
  moonMesh.add(labelsGroup);

  function commitState(status, extra = {}) {
    Object.assign(state, extra, { status, active, updatedAt: Date.now() });
    window.__BP_MOON_TERRAIN_V1__ = state;
  }
  function paeth(a, b, c) {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  }
  async function decodePng16Gray(url) {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'force-cache' });
    if (!response.ok) throw new Error('Local lunar asset unavailable: ' + url + ' (' + response.status + ')');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const signature = [137,80,78,71,13,10,26,10];
    for (let i = 0; i < 8; i++) if (bytes[i] !== signature[i]) throw new Error('Invalid PNG signature: ' + url);
    let width = 0, height = 0, bitDepth = 0, colorType = -1, total = 0;
    const chunks = [];
    const read32 = (i) => ((bytes[i] * 0x1000000) + (bytes[i+1] << 16) + (bytes[i+2] << 8) + bytes[i+3]) >>> 0;
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = read32(offset), type = String.fromCharCode(bytes[offset+4],bytes[offset+5],bytes[offset+6],bytes[offset+7]);
      const dataStart = offset + 8, dataEnd = dataStart + length;
      if (dataEnd + 4 > bytes.length) throw new Error('Truncated PNG chunk: ' + url);
      if (type === 'IHDR') {
        width = read32(dataStart); height = read32(dataStart + 4);
        bitDepth = bytes[dataStart + 8]; colorType = bytes[dataStart + 9];
      } else if (type === 'IDAT') {
        const part = bytes.slice(dataStart, dataEnd);
        chunks.push(part); total += part.length;
      } else if (type === 'IEND') break;
      offset = dataEnd + 4;
    }
    if (!width || !height || bitDepth !== 16 || colorType !== 0) {
      throw new Error('Expected 16-bit grayscale lunar PNG: ' + url);
    }
    const compressed = new Uint8Array(total);
    let writeAt = 0;
    for (const part of chunks) { compressed.set(part, writeAt); writeAt += part.length; }
    if (typeof DecompressionStream !== 'function') throw new Error('This browser cannot decode the local 16-bit lunar elevation package.');
    const inflated = new Uint8Array(await new Response(
      new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate'))
    ).arrayBuffer());
    const rowBytes = width * 2;
    if (inflated.length !== height * (rowBytes + 1)) throw new Error('Unexpected lunar PNG scanline size: ' + url);
    const decoded = new Uint8Array(height * rowBytes);
    let cursor = 0;
    for (let y = 0; y < height; y++) {
      const filter = inflated[cursor++], rowStart = y * rowBytes, priorStart = rowStart - rowBytes;
      for (let x = 0; x < rowBytes; x++) {
        const raw = inflated[cursor++];
        const left = x >= 2 ? decoded[rowStart + x - 2] : 0;
        const up = y > 0 ? decoded[priorStart + x] : 0;
        const upperLeft = y > 0 && x >= 2 ? decoded[priorStart + x - 2] : 0;
        let predictor = 0;
        if (filter === 1) predictor = left;
        else if (filter === 2) predictor = up;
        else if (filter === 3) predictor = Math.floor((left + up) / 2);
        else if (filter === 4) predictor = paeth(left, up, upperLeft);
        else if (filter !== 0) throw new Error('Unsupported PNG filter ' + filter);
        decoded[rowStart + x] = (raw + predictor) & 255;
      }
    }
    const values = new Uint16Array(width * height);
    for (let i = 0, j = 0; i < values.length; i++, j += 2) values[i] = (decoded[j] << 8) | decoded[j + 1];
    return { width, height, values };
  }
  function sampleGrid(grid, u, v) {
    const x = THREE.MathUtils.clamp(u, 0, 1) * (grid.width - 1);
    const y = THREE.MathUtils.clamp(v, 0, 1) * (grid.height - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(grid.width - 1, x0 + 1), y1 = Math.min(grid.height - 1, y0 + 1);
    const fx = x - x0, fy = y - y0, values = grid.values, w = grid.width;
    const a = values[y0*w+x0] * (1-fx) + values[y0*w+x1] * fx;
    const b = values[y1*w+x0] * (1-fx) + values[y1*w+x1] * fx;
    return a * (1-fy) + b * fy - 32768;
  }
  function globalElevation(lat, lon) {
    if (!globalData) return 0;
    const u = (((lon + 180) % 360) + 360) % 360 / 360;
    return sampleGrid(globalData, u, (90 - lat) / 180);
  }
  function patchElevation(lat, lon) {
    if (!patchData || lon < PATCH.west || lon > PATCH.east || lat < PATCH.south || lat > PATCH.north) return null;
    const u = (lon - PATCH.west) / (PATCH.east - PATCH.west);
    const v = (PATCH.north - lat) / (PATCH.north - PATCH.south);
    return sampleGrid(patchData, u, v);
  }
  function elevationAt(lat, lon) {
    const highResolution = patchElevation(lat, lon);
    return Number.isFinite(highResolution) ? highResolution : globalElevation(lat, lon);
  }
  function focusResult(lat, lon) {
    const elevationMeters = elevationAt(lat, lon);
    return { lat, lon, elevationMeters, focusPointLocal: moonSurfacePoint(lat, lon, elevationMeters) };
  }
  function clearLabelSprites() {
    for (const sprite of labelSprites.values()) {
      labelsGroup.remove(sprite);
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    labelSprites.clear();
    state.visibleLabelCount = 0;
  }
  function prepareLunarLabels() {
    if (!labelData || !Array.isArray(labelData.features)) return;
    preparedLabels = labelData.features.map(feature => {
      const lat = Number(feature.lat), lon = Number(feature.lon);
      return {
        ...feature,
        key: 'iau-' + feature.id,
        kind: 'feature',
        lat, lon,
        localPoint: moonSurfacePoint(lat, lon, elevationAt(lat, lon))
      };
    });
    for (const site of Array.isArray(labelData.sites) ? labelData.sites : []) {
      const lat = Number(site.lat), lon = Number(site.lon);
      preparedLabels.push({
        ...site,
        key: 'site-' + site.id,
        kind: 'site',
        lat, lon,
        diameterKm: 0,
        localPoint: moonSurfacePoint(lat, lon, elevationAt(lat, lon))
      });
    }
    state.labelCount = preparedLabels.length;
    state.labelStatus = 'ready';
  }
  function labelPriority(feature) {
    if (feature.kind === 'site') return 0;
    if (feature.type === 'Statio') return 1;
    if (/^(Mare|Oceanus|Mons|Montes|Sinus|Vallis|Lacus|Palus|Planitia)/i.test(feature.type || '')) return 2;
    if ((feature.type || '').includes('Astronaut')) return 3;
    if ((feature.type || '').includes('Crater')) return 4;
    return 5;
  }
  function createLunarLabelSprite(feature) {
    const canvasLabel = document.createElement('canvas');
    canvasLabel.width = 512;
    canvasLabel.height = 112;
    const ctx = canvasLabel.getContext('2d');
    const isSite = feature.kind === 'site' || feature.type === 'Statio';
    ctx.clearRect(0, 0, 512, 112);
    ctx.fillStyle = isSite ? 'rgba(31,22,8,.90)' : 'rgba(3,13,26,.88)';
    ctx.fillRect(3, 3, 506, 106);
    ctx.strokeStyle = isSite ? 'rgba(255,203,101,.96)' : 'rgba(148,205,240,.82)';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 504, 104);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 34px system-ui, sans-serif';
    ctx.fillStyle = isSite ? '#ffe2a0' : '#f3f9ff';
    const title = String(feature.name || 'Lunar feature').trim();
    ctx.fillText(title, 256, 43, 478);
    const subtitle = feature.kind === 'site'
      ? String(feature.mission || feature.type || 'LUNAR EXPLORATION SITE').toUpperCase()
      : String(feature.type || 'LUNAR FEATURE').replace(/,.*$/, '').toUpperCase()
        + (Number(feature.diameterKm) > 0 ? ' · ' + Number(feature.diameterKm).toFixed(Number(feature.diameterKm) < 10 ? 1 : 0) + ' KM' : '');
    ctx.font = '600 21px system-ui, sans-serif';
    ctx.fillStyle = isSite ? '#f6c968' : '#aad3ed';
    ctx.fillText(subtitle, 256, 82, 478);
    const texture = new THREE.CanvasTexture(canvasLabel);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      opacity: 0.98,
      sizeAttenuation: true
    });
    const sprite = new THREE.Sprite(material);
    sprite.name = 'Lunar label: ' + title;
    sprite.userData.feature = feature;
    const normal = feature.localPoint.clone().normalize();
    sprite.position.copy(feature.localPoint).addScaledVector(normal, 1.5 / (1000 * EARTH_RADIUS_KM));
    sprite.renderOrder = 12;
    labelsGroup.add(sprite);
    labelSprites.set(feature.key, sprite);
    return sprite;
  }
  function refreshLabels(force = false) {
    const now = performance.now();
    if (!force && now - lastLabelRefreshAt < 260) return;
    lastLabelRefreshAt = now;
    if (!active || !preparedLabels.length) {
      labelsGroup.visible = false;
      clearLabelSprites();
      return;
    }
    labelsGroup.visible = true;
    camera.updateMatrixWorld(true);
    moonMesh.updateMatrixWorld(true);
    const height = Math.max(1, canvas.clientHeight || innerHeight || 1);
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
    const viewProjection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const frustum = new THREE.Frustum().setFromProjectionMatrix(viewProjection);
    const localCamera = moonMesh.worldToLocal(camera.position.clone());
    const baseRadius = MOON_RADIUS_KM / EARTH_RADIUS_KM;
    const closeEnoughForSites = localCamera.length() <= baseRadius * 2.35;
    const centerX = Math.max(1, canvas.clientWidth || innerWidth || 1) * 0.5;
    const centerY = height * 0.5;
    const candidates = [];
    for (const feature of preparedLabels) {
      const localPoint = feature.localPoint;
      const worldPoint = localPoint.clone().applyMatrix4(moonMesh.matrixWorld);
      if (!frustum.containsPoint(worldPoint)) continue;
      const surfaceNormal = localPoint.clone().normalize().transformDirection(moonMesh.matrixWorld);
      const toCamera = camera.position.clone().sub(worldPoint);
      if (surfaceNormal.dot(toCamera) <= 0) continue;
      const distance = Math.max(1e-9, toCamera.length());
      const projected = worldPoint.clone().project(camera);
      if (!Number.isFinite(projected.x) || projected.z < -1 || projected.z > 1) continue;
      const screenX = (projected.x * 0.5 + 0.5) * centerX * 2;
      const screenY = (-projected.y * 0.5 + 0.5) * height;
      if (screenX < -30 || screenX > centerX * 2 + 30 || screenY < -24 || screenY > height + 24) continue;
      const isSite = feature.kind === 'site' || feature.type === 'Statio';
      if (isSite && !closeEnoughForSites) continue;
      const diameter = Math.max(0, Number(feature.diameterKm) || 0);
      const projectedDiameterPx = diameter > 0
        ? diameter / (distance * EARTH_RADIUS_KM) * height / (2 * tanHalfFov)
        : 0;
      const minDiameterPx = (feature.type || '').includes('Satellite Feature') ? 11
        : (feature.type || '').includes('Crater') ? 7
        : isSite ? 0 : 5;
      if (!isSite && projectedDiameterPx < minDiameterPx) continue;
      candidates.push({
        feature, distance, screenX, screenY, projectedDiameterPx,
        priority: labelPriority(feature),
        centerDistance: Math.hypot(screenX - centerX, screenY - centerY),
        isSite
      });
    }
    candidates.sort((a, b) =>
      a.priority - b.priority ||
      b.projectedDiameterPx - a.projectedDiameterPx ||
      a.centerDistance - b.centerDistance
    );
    const maxVisible = mobile ? 34 : 58;
    const chosen = [];
    for (const candidate of candidates) {
      const minGap = candidate.isSite ? 30 : 42;
      if (chosen.some(other => Math.hypot(other.screenX - candidate.screenX, other.screenY - candidate.screenY) < minGap)) continue;
      chosen.push(candidate);
      if (chosen.length >= maxVisible) break;
    }
    const wanted = new Set(chosen.map(candidate => candidate.feature.key));
    for (const [key, sprite] of labelSprites) {
      if (!wanted.has(key)) {
        labelsGroup.remove(sprite);
        sprite.material.map?.dispose();
        sprite.material.dispose();
        labelSprites.delete(key);
      }
    }
    for (const candidate of chosen) {
      const feature = candidate.feature;
      const sprite = labelSprites.get(feature.key) || createLunarLabelSprite(feature);
      const desiredWidthPx = THREE.MathUtils.clamp(78 + String(feature.name || '').length * 2.4, 84, 190);
      const desiredHeightPx = feature.kind === 'site' || feature.type === 'Statio' ? 34 : 29;
      const worldPerPixel = 2 * candidate.distance * tanHalfFov / height;
      sprite.scale.set(worldPerPixel * desiredWidthPx, worldPerPixel * desiredHeightPx, 1);
      sprite.visible = true;
    }
    state.visibleLabelCount = chosen.length;
    state.labelStatus = labelData ? 'ready' : 'unavailable';
    state.updatedAt = Date.now();
  }
  function buildGlobalTerrain() {
    const base = MOON_RADIUS_KM / EARTH_RADIUS_KM;
    const geometry = new THREE.SphereGeometry(base, mobile ? 256 : 384, mobile ? 128 : 192);
    const positions = geometry.attributes.position;
    const direction = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) {
      direction.fromBufferAttribute(positions, i).normalize();
      const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1)));
      const lon = THREE.MathUtils.radToDeg(Math.atan2(-direction.x, direction.z));
      const radius = base + globalElevation(lat, lon) / (1000 * EARTH_RADIUS_KM);
      positions.setXYZ(i, direction.x * radius, direction.y * radius, direction.z * radius);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const previous = moonMesh.geometry;
    moonMesh.geometry = geometry;
    previous.dispose();
  }
  function buildHighResolutionPatch() {
    const segments = mobile ? 512 : 768, rowWidth = segments + 1;
    const vertexCount = rowWidth * rowWidth;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = new Uint32Array(segments * segments * 6);
    let indexOffset = 0;
    for (let y = 0; y <= segments; y++) {
      const v = y / segments, lat = PATCH.north - v * (PATCH.north - PATCH.south);
      for (let x = 0; x <= segments; x++) {
        const u = x / segments, lon = PATCH.west + u * (PATCH.east - PATCH.west);
        const elevation = sampleGrid(patchData, u, v);
        const point = moonSurfacePoint(lat, lon, elevation);
        const vertex = y * rowWidth + x, p = vertex * 3, uv = vertex * 2;
        positions[p] = point.x; positions[p+1] = point.y; positions[p+2] = point.z;
        uvs[uv] = (lon + 180) / 360;
        uvs[uv+1] = 0.5 + lat / 180;
        if (x < segments && y < segments) {
          const a = vertex, b = a + 1, d = a + rowWidth, c = d + 1;
          indices[indexOffset++] = a; indices[indexOffset++] = b; indices[indexOffset++] = d;
          indices[indexOffset++] = b; indices[indexOffset++] = c; indices[indexOffset++] = d;
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const material = new THREE.MeshStandardMaterial({
      map: colorTexture, roughness: 1, metalness: 0, side: THREE.DoubleSide,
      depthTest: true, depthWrite: true, transparent: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'BridgePoint locally hosted 512ppd lunar elevation patch';
    mesh.userData = {
      source: 'Local SLDEM2015 merged LOLA + SELENE elevation',
      imagery: 'Local LROC 2025 WAC natural-color mosaic',
      resolutionLabel: '512 pixels per degree; approximately 59m source spacing at the equator',
      elevationRangeMeters: [-3075, 2924],
      bounds: { west: PATCH.west, east: PATCH.east, south: PATCH.south, north: PATCH.north }
    };
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    moonMesh.add(mesh);
    patchMesh = mesh;

    maskTexture = new THREE.DataTexture(new Uint8Array([255,255,255,255]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    maskTexture.minFilter = THREE.NearestFilter;
    maskTexture.magFilter = THREE.NearestFilter;
    maskTexture.generateMipmaps = false;
    maskTexture.flipY = false;
    maskTexture.needsUpdate = true;
    const uMin = (PATCH.west + 180) / 360;
    const vMin = 0.5 + PATCH.south / 180;
    moonMaterial.uniforms.uTerrainMask.value = maskTexture;
    moonMaterial.uniforms.uTerrainUvRect.value.set(
      uMin, vMin, (PATCH.east - PATCH.west) / 360, (PATCH.north - PATCH.south) / 180
    );
    patchMesh.visible = active;
    moonMaterial.uniforms.uTerrainActive.value = active ? 1 : 0;
  }
  async function loadLocalAssets() {
    if (assetsPromise) return assetsPromise;
    assetsPromise = (async () => {
      commitState('loading', { runtimeMode: 'local-static-assets' });
      const loader = new THREE.TextureLoader();
      const results = await Promise.all([
        decodePng16Gray(ASSET + 'moon-global-height-4ppd-u16.png'),
        decodePng16Gray(ASSET + 'moon-apollo15-4deg-512ppd-height-u16.png'),
        loader.loadAsync(ASSET + 'moon-lroc-color-4k.webp')
      ]);
      try {
        const response = await fetch(ASSET + 'moon-feature-labels.json', {
          credentials: 'same-origin', cache: 'force-cache'
        });
        if (!response.ok) throw new Error('Local lunar feature labels unavailable (' + response.status + ')');
        labelData = await response.json();
      } catch (labelError) {
        labelData = null;
        preparedLabels = [];
        state.labelStatus = 'unavailable';
        console.warn('[BridgePoint Moon] Local lunar labels could not be loaded:', labelError);
      }
      globalData = results[0];
      patchData = results[1];
      colorTexture = results[2];
      if (labelData) prepareLunarLabels();
      colorTexture.colorSpace = THREE.SRGBColorSpace;
      colorTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      colorTexture.generateMipmaps = true;
      colorTexture.minFilter = THREE.LinearMipmapLinearFilter;
      colorTexture.magFilter = THREE.LinearFilter;
      moonMaterial.uniforms.uBaseTexture.value = colorTexture;
      moonMaterial.uniforms.uBaseTextureReady.value = 1;
      buildGlobalTerrain();
      buildHighResolutionPatch();
      refreshLabels(true);
      commitState('ready', {
        globalHeightResolution: globalData.width + 'x' + globalData.height + ' (4 pixels/degree)',
        highResolutionPatchResolution: patchData.width + 'x' + patchData.height + ' (512 pixels/degree)',
        highResolutionPatchBounds: PATCH,
        colorResolution: '4096x2048 LROC WAC',
        runtimeMode: 'local-static-assets',
        externalRuntimeTerrainRequests: 0,
        labelStatus: labelData ? 'ready' : 'unavailable',
        labelCount: preparedLabels.length
      });
      return true;
    })().catch(error => {
      assetsPromise = null;
      commitState('error', { error: String(error?.message || error), runtimeMode: 'local-static-assets' });
      console.error('[BridgePoint Moon] Local lunar terrain load failed:', error);
      throw error;
    });
    return assetsPromise;
  }
  function setActive(value) {
    active = !!value;
    if (patchMesh) patchMesh.visible = active;
    labelsGroup.visible = active;
    moonMaterial.uniforms.uTerrainActive.value = active && maskTexture ? 1 : 0;
    if (active) refreshLabels(true);
    commitState(active ? (patchMesh ? 'ready' : 'loading') : 'inactive');
  }
  function surfaceRadiusAt(lat, lon) {
    return MOON_RADIUS_KM / EARTH_RADIUS_KM + elevationAt(lat, lon) / (1000 * EARTH_RADIUS_KM);
  }
  function updateForCamera(worldPosition) {
    if (!active || !worldPosition) return Promise.resolve(null);
    moonMesh.updateMatrixWorld(true);
    const local = moonMesh.worldToLocal(worldPosition.clone()).normalize();
    const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(local.y, -1, 1)));
    const lon = THREE.MathUtils.radToDeg(Math.atan2(-local.x, local.z));
    return Promise.resolve(focusResult(lat, lon));
  }
  window.__BP_MOON_TERRAIN_V1__ = state;
  return {
    async activate(lat, lon) {
      setActive(true);
      try {
        await loadLocalAssets();
        setActive(true);
        return focusResult(lat, lon);
      } catch (_) {
        return { lat, lon, elevationMeters: null, focusPointLocal: moonSurfacePoint(lat, lon, 0) };
      }
    },
    updateForCamera,
    setActive,
    surfaceRadiusAt,
    refreshLabels,
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
      animateCamera(surface.clone().addScaledVector(surfaceNormal,0.14),surface,1.55);
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
  function syncMoonFocusToTarget() {
    if (viewState !== 'moon') return;
    moonMesh.updateMatrixWorld(true);
    const localTarget = moonMesh.worldToLocal(target.clone());
    if (localTarget.lengthSq() < 1e-18) return;
    const radial = localTarget.normalize();
    const latitude = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(radial.y, -1, 1)));
    const longitude = THREE.MathUtils.radToDeg(Math.atan2(-radial.x, radial.z));
    const radius = moonTerrainController?.surfaceRadiusAt(latitude, longitude) ?? MOON_RADIUS_KM / EARTH_RADIUS_KM;
    focusLocalTarget = radial.multiplyScalar(radius);
    const exactSurfacePoint = moonMesh.localToWorld(focusLocalTarget.clone());
    const correction = exactSurfacePoint.clone().sub(target);
    target.copy(exactSurfacePoint);
    camera.position.add(correction);
  }
  function panMoonSurface(dx, dy) {
    if (viewState !== 'moon' || (!dx && !dy)) return;
    moonMesh.updateMatrixWorld(true);
    const localTarget = moonMesh.worldToLocal(target.clone());
    if (localTarget.lengthSq() < 1e-18) return;
    const normalWorld = localTarget.clone().normalize().transformDirection(moonMesh.matrixWorld);
    const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    cameraRight.addScaledVector(normalWorld, -cameraRight.dot(normalWorld));
    if (cameraRight.lengthSq() < 1e-10) return;
    cameraRight.normalize();
    let screenUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    screenUp.addScaledVector(normalWorld, -screenUp.dot(normalWorld));
    if (screenUp.lengthSq() < 0.025) {
      screenUp.set(0, 0, -1).applyQuaternion(camera.quaternion);
      screenUp.addScaledVector(normalWorld, -screenUp.dot(normalWorld));
    }
    if (screenUp.lengthSq() < 1e-10) return;
    screenUp.normalize();
    const viewportHeight = Math.max(1, canvas.clientHeight || innerHeight || 1);
    const range = camera.position.distanceTo(target);
    const worldPerPixel = 2 * range * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) / viewportHeight;
    const tangentTravel = cameraRight.multiplyScalar(-dx).add(screenUp.multiplyScalar(dy)).multiplyScalar(worldPerPixel * 1.15);
    const travelLength = tangentTravel.length();
    if (travelLength < 1e-12) return;
    const axis = normalWorld.clone().cross(tangentTravel.clone().normalize());
    if (axis.lengthSq() < 1e-12) return;
    axis.normalize();
    const angle = travelLength / Math.max(1e-9, localTarget.length());
    const move = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    const center = moonMesh.getWorldPosition(new THREE.Vector3());
    camera.position.sub(center).applyQuaternion(move).add(center);
    target.sub(center).applyQuaternion(move).add(center);
    camera.quaternion.premultiply(move);
    camera.up.applyQuaternion(move);
    syncMoonFocusToTarget();
    enforceMoonCameraClearance();
    camera.lookAt(target);
    moonTerrainController?.refreshLabels(true);
  }
  function rotateMoonViewYaw(deltaX) {
    if (viewState !== 'moon' || Math.abs(deltaX) < 0.01 || !focusLocalTarget) return;
    moonMesh.updateMatrixWorld(true);
    const normalWorld = focusLocalTarget.clone().normalize().transformDirection(moonMesh.matrixWorld);
    const offset = camera.position.clone().sub(target).applyAxisAngle(normalWorld, -deltaX * 0.0042);
    camera.position.copy(target).add(offset);
    camera.up.applyAxisAngle(normalWorld, -deltaX * 0.0042);
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
    const viewDirection=offset.clone().normalize();
    // Rotate around the surface/view tangent so the measured camera angle
    // increases predictably toward the horizon, independent of camera roll.
    const pitchAxis=surfaceNormal.clone().cross(viewDirection);
    if(pitchAxis.lengthSq()<1e-10){
      pitchAxis.set(1,0,0).applyQuaternion(camera.quaternion);
    }else{
      pitchAxis.normalize();
    }
    offset.applyAxisAngle(pitchAxis,deltaAngle);
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
    // Keep the active terrain/focal point under the view center. Using the
    // camera's radial direction here would snap an oblique two-finger tilt
    // back to a straight-down view after each gesture.
    moonMesh.updateMatrixWorld(true);
    const viewedSurfacePoint=moonMesh.localToWorld(focusLocalTarget.clone());
    void moonTerrainController.updateForCamera(viewedSurfacePoint).then(result=>{
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
  canvas.addEventListener('contextmenu',event=>event.preventDefault());
  canvas.addEventListener('pointerdown',event=>{
    if(activePointers.size===0){pointerMoved=false;lastX=event.clientX;lastY=event.clientY;}
    activePointers.set(event.pointerId,{x:event.clientX,y:event.clientY,button:event.button,pointerType:event.pointerType});
    if(event.button===2)event.preventDefault();
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
    const existingPointer=activePointers.get(event.pointerId)||{};
    activePointers.set(event.pointerId,{...existingPointer,x:event.clientX,y:event.clientY});
    if(activePointers.size>1){
      const gesture=getTwoPointerGesture();
      if(!gesture)return;
      if(viewState==='moon'&&gestureCenter){
        const dx=gesture.center.x-gestureCenter.x;
        const dy=gesture.center.y-gestureCenter.y;
        let twist=gesture.angle-gestureAngle;
        if(twist>Math.PI)twist-=Math.PI*2;
        if(twist<-Math.PI)twist+=Math.PI*2;
        // Two-finger vertical drag first pitches into the lunar horizon. Once
        // in a surface-facing view, the same gesture pans along the terrain.
        if(moonCameraTiltRadians()<THREE.MathUtils.degToRad(52)){
          panMoonSurface(dx,0);
          tiltMoonCamera(dy);
        }else{
          panMoonSurface(dx,dy);
        }
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
    const pointerState=activePointers.get(event.pointerId);
    if(viewState==='moon'){
      if(pointerState?.button===2||event.ctrlKey||event.shiftKey){
        rotateMoonViewYaw(dx);
        tiltMoonCamera(dy);
      }else{
        panMoonSurface(dx,dy);
      }
    }else{
      rotateCameraOrMoon(dx,dy);
    }
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
    if(event.button!==0)return;
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
    if(viewState==='moon'){
      enforceMoonCameraClearance();
      camera.lookAt(target);
      moonTerrainController?.refreshLabels();
    }
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
      moonCameraDistanceKm:viewState==='moon'?camera.position.distanceTo(target)*EARTH_RADIUS_KM:null,
      radiiKm:{earth:EARTH_RADIUS_KM,moon:MOON_RADIUS_KM,sun:SUN_RADIUS_KM},
      cinematicOrbitDistanceScale:'responsive-compressed',
      lunarTerrain:window.__BP_MOON_TERRAIN_V1__||{status:'not-requested'},
      lunarSurfaceNavigation:'two-finger-touch-pitch-and-pan; one-finger/mouse-left surface-pan; mouse-right/ctrl-drag pitch-and-yaw',
      lunarLabelCount:window.__BP_MOON_TERRAIN_V1__?.labelCount||0,
      proceduralLunarRelief:'fallback-only-outside-loaded-NASA-DEM-coverage'})
  };
})();
