/**
 * BridgePoint Intelligence — Welcome Space Scene v6264
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
  const VERSION = 'v6283-saturn-isolated';
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
  function moonSurfacePoint(lat, lon, elevationMeters = 0) {
    const latitude = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(lat, -90, 90));
    const longitude = THREE.MathUtils.degToRad(lon);
    const cosLatitude = Math.cos(latitude);
    const radius = MOON_RADIUS_KM / EARTH_RADIUS_KM
      + (Number(elevationMeters) || 0) / (1000 * EARTH_RADIUS_KM);
    return new THREE.Vector3(
      -Math.sin(longitude) * cosLatitude * radius,
      Math.sin(latitude) * radius,
      Math.cos(longitude) * cosLatitude * radius
    );
  }

  const canvas = document.createElement('canvas');
  canvas.id = 'bpWelcomeSpaceCanvasV6257';
  canvas.className = 'bpw-space-renderer-canvas';
  canvas.setAttribute('aria-label', 'Interactive three-dimensional Earth, Moon, Sun and starfield');
  canvas.tabIndex = 0;
  host.appendChild(canvas);

  const style = document.createElement('style');
  style.id = 'bpWelcomeSpaceStylesV6257';
  style.textContent = `
    #bpWelcomeGateV1 .bpw-starfield{display:none!important;visibility:hidden!important}
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
  const camera = new THREE.PerspectiveCamera(48, 1, 0.001, 100000000000);
  camera.position.set(0, 4.2, 16.5);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight(0x7895bd, 0.24);
  scene.add(ambient);

  // The existing MapLibre Earth remains the only Earth in the welcome scene.
  // This invisible origin is only the Moon's orbital reference point.
  const earth = new THREE.Group();
  earth.name = 'BridgePoint Earth reference anchor';
  scene.add(earth);
  // MapLibre renders the visible Earth behind this transparent Three.js canvas.
  // This opaque depth-only sphere gives the star shell the same globe occlusion,
  // so stars on the far side can never shine through the Earth disk.
  const earthDepthOccluder = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, mobile ? 96 : 160, mobile ? 64 : 112),
    new THREE.MeshBasicMaterial({ colorWrite:false, depthWrite:true, depthTest:true, side:THREE.FrontSide })
  );
  earthDepthOccluder.name = 'Earth opaque depth occluder';
  earthDepthOccluder.userData.body = 'earth';
  earthDepthOccluder.renderOrder = -1000;
  earth.add(earthDepthOccluder);

  const moonPivot = new THREE.Group();
  moonPivot.name = 'Moon orbital pivot';
  scene.add(moonPivot);
  const moonGeometry = new THREE.SphereGeometry(MOON_RADIUS_KM / EARTH_RADIUS_KM, mobile ? 96 : 144, mobile ? 64 : 96);
  const moonMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(0.55, 0.38, 0.74).normalize() }, uCameraLocal: { value: new THREE.Vector3(0,0,10) }, uApolloCutoutRect: { value: new THREE.Vector4(0,0,0,0) }, uApolloCutoutActive: { value: 0 }, uGlobalCutoutRect: { value: new THREE.Vector4(0,0,0,0) }, uGlobalCutoutActive: { value: 0 }, uAllowDetailCutouts: { value: 1 }, uBaseTexture: { value: null }, uBaseTextureReady: { value: 0 } },
    vertexShader: `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec3 vNormal; varying vec3 vPos; varying vec2 vUv;
      void main(){vUv=uv;vNormal=normalize(normal);vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: `
      #include <common>
      #include <logdepthbuf_pars_fragment>
      precision highp float; varying vec3 vNormal; varying vec3 vPos; varying vec2 vUv; uniform float uTime; uniform vec3 uSunDir; uniform vec3 uCameraLocal; uniform vec4 uApolloCutoutRect; uniform float uApolloCutoutActive; uniform vec4 uGlobalCutoutRect; uniform float uGlobalCutoutActive; uniform float uAllowDetailCutouts; uniform sampler2D uBaseTexture; uniform float uBaseTextureReady;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        float a=hash(i),b=hash(i+vec3(1,0,0)),c=hash(i+vec3(0,1,0)),d=hash(i+vec3(1,1,0));
        float e=hash(i+vec3(0,0,1)),f1=hash(i+vec3(1,0,1)),g=hash(i+vec3(0,1,1)),hh=hash(i+vec3(1,1,1));
        return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,f1,f.x),mix(g,hh,f.x),f.y),f.z);}
      float fbm(vec3 p){float v=0.0,a=.55;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec3(2.1,1.4,3.2);a*=.48;}return v;}
      void main(){
        vec3 p=normalize(vPos);vec2 bodyUV=vec2(atan(-p.x,p.z)/6.28318530718+.5,.5+asin(clamp(p.y,-1.0,1.0))/3.14159265359);if(uAllowDetailCutouts>.5){if(uApolloCutoutActive>.5){vec2 apolloUV=(bodyUV-uApolloCutoutRect.xy)/uApolloCutoutRect.zw;if(all(greaterThanEqual(apolloUV,vec2(0.0)))&&all(lessThanEqual(apolloUV,vec2(1.0))))discard;}if(uGlobalCutoutActive>.5){vec2 globalUV=(bodyUV-uGlobalCutoutRect.xy)/uGlobalCutoutRect.zw;if(all(greaterThanEqual(globalUV,vec2(0.0)))&&all(lessThanEqual(globalUV,vec2(1.0))))discard;}}float maria=fbm(p*5.1+vec3(5,2,1));
        float high=fbm(p*24.0);float small=fbm(p*88.0);float micro=fbm(p*176.0);float fine=fbm(p*360.0);
        float relief=high*.16+small*.08+micro*.035+fine*.018;
        vec3 highlands=vec3(.69,.70,.69);vec3 basalt=vec3(.30,.32,.33);
        vec3 albedo=mix(basalt,highlands,smoothstep(.36,.66,maria+relief*.2));
        vec3 nasaBase=texture2D(uBaseTexture,bodyUV).rgb;
        albedo=mix(albedo,nasaBase*1.32,uBaseTextureReady*.88);
        albedo*=.78+relief*.7;albedo+=vec3(.09,.09,.085)*pow(max(small-.68,0.0),2.0);
        vec3 normal=normalize(vNormal);
        float light=max(dot(normal,normalize(uSunDir)),0.0);float viewFacing=max(dot(normal,normalize(uCameraLocal-vPos)),0.0);
        float limb=.30+.70*pow(viewFacing,.42);
        vec3 color=albedo*(.10+1.05*light)*limb;
        float ejecta=pow(max(fbm(p*62.0)-.70,0.0),2.0);color+=vec3(.11,.105,.095)*ejecta;
        gl_FragColor=vec4(color,1.0);
        #include <logdepthbuf_fragment>
      }`,
    depthTest: true, depthWrite: true, transparent: false, side: THREE.FrontSide,
    extensions: { derivatives: true }
  });
  const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
  function createMoonPatchMaterial(allowDetailCutouts = false) {
    const vertexShader = moonMaterial.vertexShader
      .replace('varying vec3 vNormal; varying vec3 vPos; varying vec2 vUv;', 'varying vec3 vNormal; varying vec3 vPos; varying vec2 vUv; attribute vec4 color; varying float vAlpha;')
      .replace('void main(){vUv=uv;vNormal=normalize(normal);vPos=position;', 'void main(){vUv=uv;vNormal=normalize(normal);vPos=position;vAlpha=color.a;');
    const fragmentShader = moonMaterial.fragmentShader
      .replace('precision highp float;', 'precision highp float; varying float vAlpha;')
      .replace('gl_FragColor=vec4(color,1.0);', 'gl_FragColor=vec4(color,vAlpha);');
    return new THREE.ShaderMaterial({
      uniforms: { ...moonMaterial.uniforms, uAllowDetailCutouts: { value: allowDetailCutouts ? 1 : 0 } },
      vertexShader, fragmentShader,
      depthTest: true, depthWrite: false, transparent: true,
      side: THREE.DoubleSide, polygonOffset: true,
      polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      extensions: { derivatives: true }
    });
  }

  const moonUserRotation = new THREE.Quaternion();
  moonMesh.name = 'Moon';
  moonMesh.userData.body = 'moon';
  moonMesh.position.set(8.2, 0.7, -1.4);
  moonPivot.add(moonMesh);

  let sunPosition = new THREE.Vector3(2.05,4.6,3.4);
  // Cinematic overview compresses inter-body distance and disk scale; ground sky uses apparent angular diameter.
  const sunRadiusVisual = 1.22;
  const solarReliefScale = 0.0065;
  // Dense radial tessellation allows real HMI-derived sunspot depressions.
  const sunGeometry = new THREE.SphereGeometry(sunRadiusVisual, mobile ? 256 : 512, mobile ? 128 : 256);
  const sunMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime:{value:0},
      uPhotosphereMap:{value:null},uPhotosphereReady:{value:0},
      uActivityMap:{value:null},uActivityReady:{value:0},
      uMagneticMap:{value:null},uMagneticReady:{value:0},
      uAIA131Map:{value:null},uAIA131Ready:{value:0},
      uAIA171Map:{value:null},uAIA171Ready:{value:0},
      uAIA193Map:{value:null},uAIA193Ready:{value:0},
      uAIA304Map:{value:null},uAIA304Ready:{value:0},
      uFarSideMap:{value:null},uFarSideReady:{value:0}
    },
    vertexShader:`
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec3 vPos;varying vec3 vNormal;varying vec3 vWorldNormal;varying vec3 vWorldPos;
      void main(){
        vPos=position;vNormal=normalize(normal);
        vec4 wp=modelMatrix*vec4(position,1.0);
        vWorldPos=wp.xyz;vWorldNormal=normalize(mat3(modelMatrix)*normal);
        gl_Position=projectionMatrix*viewMatrix*wp;
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader:`
      #include <common>
      #include <logdepthbuf_pars_fragment>
      precision highp float;
      varying vec3 vPos;varying vec3 vNormal;varying vec3 vWorldNormal;varying vec3 vWorldPos;
      uniform float uTime;
      uniform sampler2D uPhotosphereMap;uniform float uPhotosphereReady;
      uniform sampler2D uActivityMap;uniform float uActivityReady;
      uniform sampler2D uMagneticMap;uniform float uMagneticReady;
      uniform sampler2D uAIA131Map;uniform float uAIA131Ready;
      uniform sampler2D uAIA171Map;uniform float uAIA171Ready;
      uniform sampler2D uAIA193Map;uniform float uAIA193Ready;
      uniform sampler2D uAIA304Map;uniform float uAIA304Ready;
      uniform sampler2D uFarSideMap;uniform float uFarSideReady;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){
        vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        float a=hash(i),b=hash(i+vec3(1,0,0)),c=hash(i+vec3(0,1,0)),d=hash(i+vec3(1,1,0));
        float e=hash(i+vec3(0,0,1)),f1=hash(i+vec3(1,0,1)),g=hash(i+vec3(0,1,1)),hh=hash(i+vec3(1,1,1));
        return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,f1,f.x),mix(g,hh,f.x),f.y),f.z);
      }
      float fbm(vec3 p){float v=0.0,a=.56;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.02+vec3(1.7,2.4,3.1);a*=.48;}return v;}
      void main(){
        vec3 p=normalize(vPos);float t=uTime*.72;
        float gran=fbm(p*52.0+vec3(t,-t*.8,t*.47));
        float cells=fbm(p*108.0+vec3(-t*1.15,t*.7,t));
        float filaments=fbm(p*24.0+vec3(t*.9,4.0,-t*.75));
        vec3 procedural=mix(vec3(.44,.33,.16),vec3(1.0,.94,.78),smoothstep(.16,.76,gran));
        procedural=mix(procedural,vec3(1.0,.99,.88),smoothstep(.34,.78,cells)*.72);
        procedural*=.91+.12*filaments;
        vec2 bodyUV=vec2(atan(-p.x,p.z)/6.28318530718+.5,.5+asin(clamp(p.y,-1.0,1.0))/3.14159265359);
        vec3 observed=texture2D(uPhotosphereMap,bodyUV).rgb;
        float continuum=dot(observed,vec3(.299,.587,.114));
        vec3 warmPhotosphere=observed*vec3(1.20,.91,.66)+vec3(.055,.025,.006)*continuum;
        vec3 c=mix(procedural,warmPhotosphere,uPhotosphereReady);
        vec3 activity=texture2D(uActivityMap,bodyUV).rgb;
        float activityLevel=clamp(max(max(activity.r,activity.g),activity.b),0.0,1.0);
        c=mix(c,c*.84+activity*.25,uActivityReady*clamp(activityLevel*.32,0.0,.28));

        // SDO full-disk projections use an orthographic disk map, not the
        // equirectangular UVs used by the HMI continuum photosphere.
        vec2 solarDiskUV=vec2(.5+p.x*.46,.5+p.y*.46);
        float solarDiskMask=1.0-smoothstep(.94,1.08,length(p.xy));
        vec3 magnetic=texture2D(uMagneticMap,solarDiskUV).rgb;
        float magMax=max(max(magnetic.r,magnetic.g),magnetic.b);
        float magMin=min(min(magnetic.r,magnetic.g),magnetic.b);
        float magneticPolarityContrast=smoothstep(.055,.19,magMax-magMin)*solarDiskMask;
        c=mix(c,magnetic,uMagneticReady*magneticPolarityContrast*.66);

        vec3 aia131=texture2D(uAIA131Map,solarDiskUV).rgb;
        vec3 aia171=texture2D(uAIA171Map,solarDiskUV).rgb;
        vec3 aia304=texture2D(uAIA304Map,solarDiskUV).rgb;
        float hot131=dot(aia131,vec3(.299,.587,.114));
        float loops171=dot(aia171,vec3(.299,.587,.114));
        float chromosphere304=dot(aia304,vec3(.299,.587,.114));
        float flareFootpoint=smoothstep(.10,.36,hot131)*solarDiskMask*uAIA131Ready;
        float coronalFootpoint=smoothstep(.12,.38,loops171)*solarDiskMask*uAIA171Ready;
        float chromosphereSignal=smoothstep(.12,.40,chromosphere304)*solarDiskMask*uAIA304Ready;
        c+=vec3(.015,.10,.16)*flareFootpoint*.62;
        c+=vec3(.10,.055,.008)*coronalFootpoint*.42;
        c+=vec3(.14,.026,.004)*chromosphereSignal*.30;
        vec3 farActivity=texture2D(uFarSideMap,bodyUV).rgb;
        float backSide=1.0-smoothstep(-.07,.07,p.z);
        float farEnergy=clamp(max(max(farActivity.r,farActivity.g),farActivity.b),0.0,1.0);
        c=mix(c,mix(c,farActivity*.82+vec3(.035,.018,.006),.68),backSide*uFarSideReady*step(.015,farEnergy));
        // Molten photosphere overlay: preserve the observed HMI/AIA detail underneath
        // while animated convection cells and incandescent filaments roll across it.
        float magmaFlow=gran*.46+filaments*.34+cells*.20;
        float magmaRidges=smoothstep(.39,.72,magmaFlow);
        float incandescentCore=smoothstep(.62,.82,cells*.62+gran*.38);
        float fireFlicker=.91+.09*sin(uTime*3.4+gran*17.0+cells*11.0+filaments*8.0);
        vec3 moltenPalette=mix(vec3(.86,.055,.002),vec3(1.0,.32,.014),magmaRidges);
        moltenPalette=mix(moltenPalette,vec3(1.55,.91,.34),incandescentCore*.82);
        float moltenCoverage=clamp(magmaRidges*.23+incandescentCore*.19,0.0,.34);
        c=mix(c,max(c,moltenPalette),moltenCoverage*fireFlicker);
        c+=vec3(.16,.028,.002)*incandescentCore*.10;

        // The Sun emits light: use observed view-dependent limb darkening, not a
        // fixed object-space normal that paints an artificial dark hemisphere.
        vec3 viewDir=normalize(cameraPosition-vWorldPos);
        float mu=clamp(dot(normalize(vWorldNormal),viewDir),0.0,1.0);
        float limbDarkening=.43+.57*pow(mu,.48);
        float boiling=.975+.045*sin(uTime*2.6+gran*14.0+filaments*10.0)+.018*sin(uTime*6.8+cells*24.0);
        c*=limbDarkening*boiling;
        c+=vec3(.12,.048,.008)*pow(1.0-mu,4.0)*.22;
        gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);
        #include <logdepthbuf_fragment>
      }`,
    depthTest:true,depthWrite:true,side:THREE.FrontSide
  });
  const solarTextureLoader = new THREE.TextureLoader();
  const SOLAR_ASSET_BASE='/assets/sun/v2/';
  function loadSolarV2Texture(file,readyUniform){
    const url=SOLAR_ASSET_BASE+file;
    return solarTextureLoader.load(url,texture=>{
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;
      texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),mobile?4:8);
      texture.needsUpdate=true;sunMaterial.uniforms[readyUniform].value=1;
      if(window.__BP_SOLAR_SURFACE_V2__)window.__BP_SOLAR_SURFACE_V2__[readyUniform]=true;
    },undefined,error=>console.error('[BridgePoint Sun] Local solar texture failed:',url,error));
  }
  const solarObservationTextures={
    photosphere:loadSolarV2Texture('sun-photosphere-v2.webp','uPhotosphereReady'),
    activity:loadSolarV2Texture('sun-coronal-activity-v2.webp','uActivityReady'),
    magnetic:loadSolarV2Texture('sun-magnetogram-hmi-2026-11-09.jpg','uMagneticReady'),
    aia131:loadSolarV2Texture('sun-aia-131-latest.jpg','uAIA131Ready'),
    aia171:loadSolarV2Texture('sun-aia-171-latest.jpg','uAIA171Ready'),
    aia193:loadSolarV2Texture('sun-aia-193-latest.jpg','uAIA193Ready'),
    aia304:loadSolarV2Texture('sun-aia-304-latest.jpg','uAIA304Ready'),
    farSide:loadSolarV2Texture('sun-stereoB-farside-EUV-2014-09-27-v2.webp','uFarSideReady')
  };
  sunMaterial.uniforms.uPhotosphereMap.value=solarObservationTextures.photosphere;
  sunMaterial.uniforms.uActivityMap.value=solarObservationTextures.activity;
  sunMaterial.uniforms.uFarSideMap.value=solarObservationTextures.farSide;
  sunMaterial.uniforms.uMagneticMap.value=solarObservationTextures.magnetic;
  sunMaterial.uniforms.uAIA131Map.value=solarObservationTextures.aia131;
  sunMaterial.uniforms.uAIA171Map.value=solarObservationTextures.aia171;
  sunMaterial.uniforms.uAIA193Map.value=solarObservationTextures.aia193;
  sunMaterial.uniforms.uAIA304Map.value=solarObservationTextures.aia304;
  const sunDepthGeometry=sunGeometry.clone();
  const sunDepthMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,depthTest:true,side:THREE.FrontSide});
  const sunDepthMesh=new THREE.Mesh(sunDepthGeometry,sunDepthMaterial);
  sunDepthMesh.name='Sun solid opaque depth occluder';
  sunDepthMesh.renderOrder=-1000;
  function syncSunDepthGeometry(){
    const src=sunGeometry.attributes.position,dst=sunDepthGeometry.attributes.position;
    for(let i=0;i<src.count;i++){
      const x=src.getX(i),y=src.getY(i),z=src.getZ(i),len=Math.sqrt(x*x+y*y+z*z)||1;
      const radius=Math.max(.001,len-.00018);
      dst.setXYZ(i,x/len*radius,y/len*radius,z/len*radius);
    }
    dst.needsUpdate=true;sunDepthGeometry.computeBoundingSphere();
  }
  function applySunReliefFromImage(image){
    try{
      const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
      const canvasHeight=document.createElement('canvas');canvasHeight.width=w;canvasHeight.height=h;
      const ctx=canvasHeight.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(image,0,0,w,h);
      const pixels=ctx.getImageData(0,0,w,h).data;
      const positions=sunGeometry.attributes.position;
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
        const lon=Math.atan2(-x,z),lat=Math.asin(THREE.MathUtils.clamp(y/sunRadiusVisual,-1,1));
        const u=((lon/(Math.PI*2)+.5)%1+1)%1,v=.5+lat/Math.PI;
        const px=Math.min(w-1,Math.floor(u*w)),py=Math.min(h-1,Math.max(0,Math.floor((1-v)*h)));
        const sample=pixels[(py*w+px)*4];
        const relief=((sample-128)/127)*solarReliefScale;
        const radial=new THREE.Vector3(x,y,z).normalize().multiplyScalar(sunRadiusVisual+relief);
        positions.setXYZ(i,radial.x,radial.y,radial.z);
      }
      positions.needsUpdate=true;sunGeometry.computeVertexNormals();sunGeometry.computeBoundingSphere();syncSunDepthGeometry();
      if(window.__BP_SOLAR_SURFACE_V2__)window.__BP_SOLAR_SURFACE_V2__.reliefStatus='displaced-hmi-sunspot-geometry';
    }catch(error){console.error('[BridgePoint Sun] Relief texture decode failed:',error);}
  }
  const heightImage=new Image();
  heightImage.onload=()=>applySunReliefFromImage(heightImage);
  heightImage.onerror=error=>console.error('[BridgePoint Sun] HMI height map failed',error);
  heightImage.src=SOLAR_ASSET_BASE+'sun-photosphere-height-v2.webp';
  window.__BP_SOLAR_SURFACE_V2__={version:2,status:'loading-local-assets',assetBase:SOLAR_ASSET_BASE,photosphereSource:'NASA SDO HMI continuum intensity, warm visible-light photosphere grade',activitySources:['SDO AIA 131','171','193','304','335'],farSideSource:'NASA STEREO-B SECCHI/EUVI 2014-09-27 final usable Behind disk (171/195/284/304)',farSideType:'archived EUV activity image, not visible-light photosphere',reliefSource:'HMI continuum contrast; Wilson depressions/facular structure visually exaggerated ~4x',runtimeNetwork:'same-origin-local-static-assets-only'};
  window.__BP_SOLAR_SURFACE_V3__={version:3,status:'loading-locally-hosted-nasa-observations',observations:{hmiMagnetogram:'2026-11-09T04:15:00Z',aia131:'2026-11-09T05:06:44Z',aia171:'2026-11-09T04:57:22Z',aia193:'2026-11-09T05:03:06Z',aia304:'2026-11-09T04:58:42Z'},magneticGeometrySource:'SDO/HMI colored line-of-sight polarity pairs; arcs are a 3D visualization, not a PFSS field extrapolation',coronalSource:'SDO/AIA 131, 171 and 304 angstrom full-disk observations',refreshCadence:'snapshot from latest available NASA public image products; no three-minute client refresh configured',runtimeNetwork:'same-origin-local-static-assets-only'};
  window.__BP_SOLAR_SURFACE_V4__={version:4,status:'loading-fire-plasma-visual-layers',surfaceConvection:'animated-molten-photosphere-shader-preserving-HMI-AIA-data',rim:'animated-Fresnel-incandescent-corona',plasma:'particle-streams-emitted-from-observed-AIA-131-active-regions',particleCount:0,activeRegionCount:0};

  const sunGroup = new THREE.Group();
  sunGroup.name = 'Sun';
  sunGroup.position.copy(sunPosition);
  scene.add(sunGroup);
  sunGroup.add(sunDepthMesh);
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  sunMesh.name = 'Sun surface';
  sunMesh.userData.body = 'sun';
  sunMesh.renderOrder = -900;
  sunGroup.add(sunMesh);
  function sunSurfacePoint(latitude,longitude,radius=sunRadiusVisual){
    const lat=THREE.MathUtils.degToRad(latitude),lon=THREE.MathUtils.degToRad(longitude),c=Math.cos(lat);
    return new THREE.Vector3(-c*Math.sin(lon)*radius,Math.sin(lat)*radius,c*Math.cos(lon)*radius);
  }
  const solarFeatureGroup=new THREE.Group();
  solarFeatureGroup.name='SDO/HMI-observation-driven three-dimensional magnetic field lines and AIA plasma eruptions';
  sunGroup.add(solarFeatureGroup);
  function createSolarPlasmaMaterial(color,opacity,phase){
    return new THREE.ShaderMaterial({
      uniforms:{uTime:{value:0},uOpacity:{value:opacity},uPhase:{value:phase},uColor:{value:new THREE.Color(color)}},
      vertexShader:`uniform float uTime;uniform float uPhase;varying vec2 vUv;varying float vFlow;
        void main(){
          vUv=uv;
          float flow=sin(uv.x*30.0-uTime*3.4+uPhase)+.35*sin(uv.x*67.0-uTime*6.1+uPhase*1.7);
          vec3 p=position+normal*(.0036*flow);
          vFlow=flow;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
        }`,
      fragmentShader:`uniform float uTime;uniform float uOpacity;uniform float uPhase;uniform vec3 uColor;varying vec2 vUv;varying float vFlow;
        void main(){
          float edge=abs(vUv.y-.5)*2.0;
          float core=pow(max(0.0,1.0-edge),1.45);
          float stream=.54+.46*sin(vUv.x*38.0-uTime*4.1+uPhase);
          float turbulence=.72+.28*sin(vUv.x*89.0-uTime*7.0+uPhase*2.0+vFlow*2.0);
          vec3 hot=vec3(1.0,.96,.78);
          vec3 col=mix(uColor,hot,clamp(core*.94,0.0,1.0));
          float alpha=(.12+.88*core)*stream*turbulence*uOpacity;
          gl_FragColor=vec4(col* (1.0+core*.35),alpha);
        }`,
      transparent:true,depthTest:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide
    });
  }
  const coronalLoopMeshes=[];
  const observedMagneticPolarityPairs=[];
  const addCoronalLoop=(lat1,lon1,lat2,lon2,height,color,phase)=>{
    const start=sunSurfacePoint(lat1,lon1,sunRadiusVisual*1.008);
    const end=sunSurfacePoint(lat2,lon2,sunRadiusVisual*1.008);
    const control=start.clone().add(end).normalize().multiplyScalar(sunRadiusVisual*height);
    const curve=new THREE.QuadraticBezierCurve3(start,control,end);
    const material=createSolarPlasmaMaterial(color,.56,phase);
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,64,mobile?.0065:.010,9,false),material);
    mesh.userData.phase=phase;solarFeatureGroup.add(mesh);coronalLoopMeshes.push(mesh);
  };
  const imagePointToSolarLatLon=(x,y,width,height)=>{
    const radius=Math.min(width,height)*.46;
    const nx=(x-width*.5)/radius,ny=(height*.5-y)/radius;
    const r2=nx*nx+ny*ny;
    if(r2>.985)return null;
    const nz=Math.sqrt(Math.max(0,1-r2));
    return {
      latitude:THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(ny,-1,1))),
      longitude:THREE.MathUtils.radToDeg(Math.atan2(-nx,nz))
    };
  };
  function observationCanvas(image){
    const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
    const canvasObservation=document.createElement('canvas');
    canvasObservation.width=width;canvasObservation.height=height;
    const ctx=canvasObservation.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(image,0,0,width,height);
    return {width,height,pixels:ctx.getImageData(0,0,width,height).data};
  }
  function buildMagneticLoopsFromImage(image){
    try{
      const {width,height,pixels}=observationCanvas(image),bins=28;
      const cells=Array.from({length:bins*bins},()=>({positive:0,negative:0,px:0,py:0,nx:0,ny:0,pc:0,nc:0}));
      const diskRadius=Math.min(width,height)*.46,cx=width*.5,cy=height*.5,step=3;
      for(let y=Math.floor(cy-diskRadius);y<cy+diskRadius;y+=step){
        for(let x=Math.floor(cx-diskRadius);x<cx+diskRadius;x+=step){
          const dx=(x-cx)/diskRadius,dy=(cy-y)/diskRadius;
          if(dx*dx+dy*dy>.94)continue;
          const k=(y*width+x)*4,r=pixels[k],g=pixels[k+1],b=pixels[k+2];
          const polarity=r-b;
          if(Math.abs(polarity)<24)continue;
          const ix=THREE.MathUtils.clamp(Math.floor((dx+1)*.5*bins),0,bins-1);
          const iy=THREE.MathUtils.clamp(Math.floor((dy+1)*.5*bins),0,bins-1);
          const cell=cells[iy*bins+ix],strength=Math.abs(polarity);
          if(polarity>0){cell.positive+=strength;cell.px+=x*strength;cell.py+=y*strength;cell.pc+=strength;}
          else{cell.negative+=strength;cell.nx+=x*strength;cell.ny+=y*strength;cell.nc+=strength;}
        }
      }
      const strongest=polarity=>cells.map((cell,index)=>{
        const score=polarity==='positive'?cell.positive:cell.negative;
        const weight=polarity==='positive'?cell.pc:cell.nc;
        const x=polarity==='positive'?cell.px:cell.nx;
        const y=polarity==='positive'?cell.py:cell.ny;
        return {score,index,x:weight?x/weight:0,y:weight?y/weight:0};
      }).filter(v=>v.score>800).sort((a,b)=>b.score-a.score);
      const selectSeparated=items=>{
        const chosen=[];
        for(const item of items){
          const ix=item.index%bins,iy=Math.floor(item.index/bins);
          if(chosen.some(other=>Math.hypot(ix-(other.index%bins),iy-Math.floor(other.index/bins))<2.2))continue;
          const point=imagePointToSolarLatLon(item.x,item.y,width,height);
          if(point)chosen.push({...item,...point});
          if(chosen.length>=8)break;
        }
        return chosen;
      };
      const positive=selectSeparated(strongest('positive'));
      const negative=selectSeparated(strongest('negative'));
      const used=new Set();let made=0;
      for(const p of positive){
        let best=-1,bestDistance=Infinity;
        for(let i=0;i<negative.length;i++){
          if(used.has(i))continue;
          const n=negative[i],distance=Math.hypot((p.longitude-n.longitude)*Math.cos((p.latitude+n.latitude)*Math.PI/360),p.latitude-n.latitude);
          if(distance<bestDistance){bestDistance=distance;best=i;}
        }
        if(best<0||bestDistance<1.2)continue;
        used.add(best);
        const n=negative[best],strength=Math.min(1,p.score/90000,n.score/90000);
        const height=1.10+THREE.MathUtils.clamp(bestDistance/95,.10,.42);
        addCoronalLoop(p.latitude,p.longitude,n.latitude,n.longitude,height,strength>.65?0xffc35a:0xff8a36,made*.79);
        observedMagneticPolarityPairs.push({positive:{latitude:p.latitude,longitude:p.longitude},negative:{latitude:n.latitude,longitude:n.longitude},relativeStrength:strength});
        made++;
      }
      if(window.__BP_SOLAR_SURFACE_V3__)window.__BP_SOLAR_SURFACE_V3__.magneticLoopStatus=made?'built-from-HMI-polarity-pairs':'no-strong-opposite-polarity-pairs-found';
      if(made===0)console.warn('[BridgePoint Sun] HMI image loaded, but no strong polarity pairs were found for loop geometry.');
    }catch(error){console.error('[BridgePoint Sun] HMI polarity geometry decode failed:',error);}
  }
  const flareMeshes=[];
  const observedActiveRegions=[];
  let solarPlasmaParticles=null;
  function buildSolarSurfaceParticlePlumes(regions){
    if(solarPlasmaParticles){
      solarFeatureGroup.remove(solarPlasmaParticles);
      solarPlasmaParticles.geometry.dispose();
      solarPlasmaParticles.material.dispose();
      solarPlasmaParticles=null;
    }
    if(!regions.length){
      if(window.__BP_SOLAR_SURFACE_V4__)window.__BP_SOLAR_SURFACE_V4__.plasmaParticles='no-observed-active-regions';
      return;
    }
    const particlesPerRegion=mobile?44:82;
    const count=regions.length*particlesPerRegion;
    const origins=new Float32Array(count*3);
    const directions=new Float32Array(count*3);
    const tangents=new Float32Array(count*3);
    const seeds=new Float32Array(count);
    const heights=new Float32Array(count);
    const sizes=new Float32Array(count);
    const heats=new Float32Array(count);
    const fract=value=>value-Math.floor(value);
    let cursor=0;
    regions.forEach((region,regionIndex)=>{
      const base=sunSurfacePoint(region.latitude,region.longitude,sunRadiusVisual*1.014);
      const normal=base.clone().normalize();
      let tangent=new THREE.Vector3(0,1,0).cross(normal);
      if(tangent.lengthSq()<.01)tangent=new THREE.Vector3(1,0,0).cross(normal);
      tangent.normalize();
      const bitangent=normal.clone().cross(tangent).normalize();
      for(let j=0;j<particlesPerRegion;j++){
        const seed=fract(Math.sin((regionIndex+1)*91.731+(j+1)*17.173)*43758.5453);
        const spreadA=fract(Math.sin((regionIndex+4)*37.719+(j+3)*9.137)*24634.6345);
        const spreadB=fract(Math.sin((regionIndex+7)*19.131+(j+5)*23.711)*56445.2341);
        const direction=normal.clone()
          .addScaledVector(tangent,(spreadA-.5)*.82)
          .addScaledVector(bitangent,(spreadB-.5)*.66)
          .normalize();
        const origin=base.clone().addScaledVector(normal,.003);
        const k=cursor*3;
        origins[k]=origin.x;origins[k+1]=origin.y;origins[k+2]=origin.z;
        directions[k]=direction.x;directions[k+1]=direction.y;directions[k+2]=direction.z;
        tangents[k]=tangent.x;tangents[k+1]=tangent.y;tangents[k+2]=tangent.z;
        seeds[cursor]=fract(seed+cursor*.61803398875);
        heights[cursor]=.16+spreadB*.58;
        sizes[cursor]=.34+spreadA*.72;
        heats[cursor]=THREE.MathUtils.clamp(region.intensity*(.72+spreadB*.34),.25,1.0);
        cursor++;
      }
    });
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(origins,3));
    geometry.setAttribute('aOrigin',new THREE.BufferAttribute(origins,3));
    geometry.setAttribute('aDirection',new THREE.BufferAttribute(directions,3));
    geometry.setAttribute('aTangent',new THREE.BufferAttribute(tangents,3));
    geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
    geometry.setAttribute('aHeight',new THREE.BufferAttribute(heights,1));
    geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));
    geometry.setAttribute('aHeat',new THREE.BufferAttribute(heats,1));
    const material=new THREE.ShaderMaterial({
      uniforms:{uTime:{value:0},uSizeScale:{value:mobile?96:122},uMaxPointSize:{value:mobile?15:24}},
      vertexShader:`
        #include <common>
        #include <logdepthbuf_pars_vertex>
        uniform float uTime;
        uniform float uSizeScale;
        uniform float uMaxPointSize;
        attribute vec3 aOrigin;
        attribute vec3 aDirection;
        attribute vec3 aTangent;
        attribute float aSeed;
        attribute float aHeight;
        attribute float aSize;
        attribute float aHeat;
        varying float vLife;
        varying float vFade;
        varying float vHeat;
        void main(){
          float life=fract(uTime*.17+aSeed);
          float travel=.018+life*aHeight;
          float sway=sin(uTime*2.8+aSeed*39.0+life*3.2)*.052*life;
          vec3 plumePosition=aOrigin+aDirection*travel+aTangent*sway;
          vec4 mvPosition=modelViewMatrix*vec4(plumePosition,1.0);
          gl_Position=projectionMatrix*mvPosition;
          gl_PointSize=clamp(aSize*uSizeScale/max(-mvPosition.z,.55),1.0,uMaxPointSize);
          vLife=life;
          vFade=smoothstep(0.0,.10,life)*(1.0-smoothstep(.72,1.0,life));
          vHeat=aHeat;
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader:`
        #include <common>
        #include <logdepthbuf_pars_fragment>
        precision highp float;
        uniform float uTime;
        varying float vLife;
        varying float vFade;
        varying float vHeat;
        void main(){
          vec2 point=(gl_PointCoord-vec2(.5))*2.0;
          float radius=dot(point,point);
          if(radius>1.0)discard;
          float core=exp(-radius*10.0);
          float halo=exp(-radius*2.45);
          float flicker=.78+.22*sin(uTime*10.0+vLife*25.0);
          vec3 plasma=mix(vec3(1.0,.105,.003),vec3(1.0,.91,.52),core);
          float alpha=(core*.88+halo*.32)*vFade*vHeat*flicker*.78;
          gl_FragColor=vec4(plasma*(.9+core*1.35),alpha);
          #include <logdepthbuf_fragment>
        }`,
      transparent:true,depthTest:true,depthWrite:false,
      blending:THREE.AdditiveBlending,toneMapped:false
    });
    solarPlasmaParticles=new THREE.Points(geometry,material);
    solarPlasmaParticles.name='NASA AIA active-region surface-ejected plasma particle streams';
    solarPlasmaParticles.frustumCulled=false;
    solarFeatureGroup.add(solarPlasmaParticles);
    if(window.__BP_SOLAR_SURFACE_V4__){
      window.__BP_SOLAR_SURFACE_V4__.plasmaParticleCount=count;
      window.__BP_SOLAR_SURFACE_V4__.activeRegionCount=regions.length;
      window.__BP_SOLAR_SURFACE_V4__.plasmaParticles='flowing-from-observed-AIA-131-active-regions';
    }
  }
  function buildObservedEruptionArcs(image){
    try{
      const {width,height,pixels}=observationCanvas(image),bins=28;
      const cells=Array.from({length:bins*bins},()=>({sum:0,x:0,y:0,count:0}));
      const radius=Math.min(width,height)*.46,cx=width*.5,cy=height*.5,step=3;
      for(let y=Math.floor(cy-radius);y<cy+radius;y+=step){
        for(let x=Math.floor(cx-radius);x<cx+radius;x+=step){
          const dx=(x-cx)/radius,dy=(cy-y)/radius;
          if(dx*dx+dy*dy>.92)continue;
          const k=(y*width+x)*4,luma=(pixels[k]*.299+pixels[k+1]*.587+pixels[k+2]*.114)/255;
          const ix=THREE.MathUtils.clamp(Math.floor((dx+1)*.5*bins),0,bins-1),iy=THREE.MathUtils.clamp(Math.floor((dy+1)*.5*bins),0,bins-1);
          const cell=cells[iy*bins+ix];cell.sum+=Math.max(0,luma-.09);cell.x+=x*Math.max(0,luma-.09);cell.y+=y*Math.max(0,luma-.09);cell.count++;
        }
      }
      const active=cells.map((cell,index)=>({score:cell.sum/(cell.count||1),x:cell.sum?cell.x/cell.sum:0,y:cell.sum?cell.y/cell.sum:0,index}))
        .filter(v=>v.score>.24).sort((a,b)=>b.score-a.score);
      const selected=[];
      for(const item of active){
        const point=imagePointToSolarLatLon(item.x,item.y,width,height);
        if(!point)continue;
        const ix=item.index%bins,iy=Math.floor(item.index/bins);
        if(selected.some(v=>Math.hypot(ix-v.ix,iy-v.iy)<3))continue;
        selected.push({...point,ix,iy,intensity:THREE.MathUtils.clamp(item.score,0,1)});
        if(selected.length>=5)break;
      }
      observedActiveRegions.length=0;
      selected.forEach(region=>observedActiveRegions.push({...region}));
      buildSolarSurfaceParticlePlumes(observedActiveRegions);
      selected.forEach((region,i)=>{
        const base=sunSurfacePoint(region.latitude,region.longitude,sunRadiusVisual*1.012);
        const normal=base.clone().normalize();
        let tangent=new THREE.Vector3(0,1,0).cross(normal);
        if(tangent.lengthSq()<.01)tangent=new THREE.Vector3(1,0,0).cross(normal);
        tangent.normalize();
        const bend=(i%2?1:-1)*sunRadiusVisual*(.10+region.intensity*.10);
        const height=.38+region.intensity*.62;
        const points=[
          base,
          base.clone().addScaledVector(normal,sunRadiusVisual*.18).addScaledVector(tangent,bend*.28),
          base.clone().addScaledVector(normal,sunRadiusVisual*height*.67).addScaledVector(tangent,bend),
          base.clone().addScaledVector(normal,sunRadiusVisual*height).addScaledVector(tangent,bend*1.28)
        ];
        const curve=new THREE.CatmullRomCurve3(points);
        const material=createSolarPlasmaMaterial(region.intensity>.58?0xff6b24:0xffa947,.86,i*1.19);
        const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,72,mobile?.008:.014,10,false),material);
        mesh.userData={phase:i*1.19,observationIntensity:region.intensity,observation:{latitude:region.latitude,longitude:region.longitude}};
        solarFeatureGroup.add(mesh);flareMeshes.push(mesh);
      });
      if(window.__BP_SOLAR_SURFACE_V3__)window.__BP_SOLAR_SURFACE_V3__.observedEruptionArcs=flareMeshes.length;
    }catch(error){console.error('[BridgePoint Sun] AIA 131 active-region geometry decode failed:',error);}
  }
  const magneticImage=new Image();
  magneticImage.onload=()=>buildMagneticLoopsFromImage(magneticImage);
  magneticImage.onerror=error=>console.error('[BridgePoint Sun] Local HMI magnetogram failed',error);
  magneticImage.src=SOLAR_ASSET_BASE+'sun-magnetogram-hmi-2026-11-09.jpg';
  const aiaHotImage=new Image();
  aiaHotImage.onload=()=>buildObservedEruptionArcs(aiaHotImage);
  aiaHotImage.onerror=error=>console.error('[BridgePoint Sun] Local AIA 131 observation failed',error);
  aiaHotImage.src=SOLAR_ASSET_BASE+'sun-aia-131-latest.jpg';
  const coronaGeometry=new THREE.SphereGeometry(sunRadiusVisual*1.22,mobile?192:320,mobile?96:160);
  const coronaMaterial=new THREE.ShaderMaterial({
    uniforms:{
      uTime:{value:0},
      uAIA131Map:{value:solarObservationTextures.aia131},
      uAIA171Map:{value:solarObservationTextures.aia171},
      uAIA193Map:{value:solarObservationTextures.aia193},
      uAIA304Map:{value:solarObservationTextures.aia304}
    },
    vertexShader:`
      #include <common>
      #include <logdepthbuf_pars_vertex>
      uniform float uTime;
      varying vec3 vSolarPos;
      varying float vMotion;
      void main(){
        vec3 dir=normalize(position);
        float wave=sin(dir.x*24.0+dir.y*17.0+uTime*.34)
          +.52*sin(dir.y*43.0-dir.z*27.0-uTime*.23)
          +.28*cos(dir.z*61.0+dir.x*31.0+uTime*.41);
        vec3 displaced=position+normal*(.012*wave+.006*sin(uTime*.7+dir.y*32.0));
        vSolarPos=displaced/1.22;
        vMotion=wave;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(displaced,1.0);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader:`
      #include <common>
      #include <logdepthbuf_pars_fragment>
      precision highp float;
      uniform sampler2D uAIA131Map;
      uniform sampler2D uAIA171Map;
      uniform sampler2D uAIA193Map;
      uniform sampler2D uAIA304Map;
      varying vec3 vSolarPos;
      varying float vMotion;
      void main(){
        if(vSolarPos.z<0.0)discard;
        vec2 uv=vec2(.5+vSolarPos.x*.46,.5+vSolarPos.y*.46);
        vec3 hot131=texture2D(uAIA131Map,uv).rgb;
        vec3 loops171=texture2D(uAIA171Map,uv).rgb;
        vec3 active193=texture2D(uAIA193Map,uv).rgb;
        vec3 chromo304=texture2D(uAIA304Map,uv).rgb;
        float h=dot(hot131,vec3(.299,.587,.114));
        float l=dot(loops171,vec3(.299,.587,.114));
        float a=dot(active193,vec3(.299,.587,.114));
        float c=dot(chromo304,vec3(.299,.587,.114));
        float flare=smoothstep(.055,.27,h);
        float loop=smoothstep(.075,.32,l);
        float active=smoothstep(.075,.30,a);
        float prominence=smoothstep(.07,.29,c);
        float signal=max(max(max(flare*.92,loop*.58),active*.48),prominence*.66);
        if(signal<.075)discard;
        vec3 plasma=hot131*vec3(.42,.96,1.38)*flare
          +loops171*vec3(1.30,.88,.28)*loop
          +active193*vec3(.64,1.04,.23)*active
          +chromo304*vec3(1.32,.24,.035)*prominence;
        float stream=.88+.12*sin(vSolarPos.x*48.0+vSolarPos.y*31.0+vMotion*2.0);
        float alpha=clamp(signal*(.23+.25*stream),0.0,.56);
        gl_FragColor=vec4(plasma*1.7*stream,alpha);
        #include <logdepthbuf_fragment>
      }`,
    transparent:true,depthTest:true,depthWrite:false,
    blending:THREE.AdditiveBlending,side:THREE.FrontSide
  });
  const corona=new THREE.Mesh(coronaGeometry,coronaMaterial);
  corona.name='SDO AIA 131/171/304 observation-driven 3D corona shell';
  corona.renderOrder=-899;
  sunGroup.add(corona);
  const solarCoronaGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(), color: 0xffa43d, transparent: true, opacity: 0.48,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  solarCoronaGlow.scale.set(sunRadiusVisual * 3.9, sunRadiusVisual * 3.9, 1);
  solarCoronaGlow.material.color.setHex(0xff7520);
  solarCoronaGlow.material.opacity=0.56;
  sunGroup.add(solarCoronaGlow);
  const solarFireRimGeometry=new THREE.SphereGeometry(sunRadiusVisual*1.018,mobile?128:256,mobile?64:128);
  const solarFireRimMaterial=new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0}},
    vertexShader:`
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec3 vFireNormal;
      varying vec3 vFireView;
      varying vec3 vFirePosition;
      uniform float uTime;
      void main(){
        float roll=sin(position.y*21.0+uTime*1.35)+.42*sin(position.x*37.0-position.z*26.0-uTime*1.8);
        vec3 displaced=position+normal*(.0025*roll);
        vec4 worldPosition=modelMatrix*vec4(displaced,1.0);
        vFireNormal=normalize(mat3(modelMatrix)*normal);
        vFireView=normalize(cameraPosition-worldPosition.xyz);
        vFirePosition=normalize(position);
        gl_Position=projectionMatrix*viewMatrix*worldPosition;
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader:`
      #include <common>
      #include <logdepthbuf_pars_fragment>
      precision highp float;
      uniform float uTime;
      varying vec3 vFireNormal;
      varying vec3 vFireView;
      varying vec3 vFirePosition;
      void main(){
        float facing=clamp(dot(normalize(vFireNormal),normalize(vFireView)),0.0,1.0);
        float fresnel=pow(1.0-facing,2.05);
        float turbulence=.5+.5*sin(vFirePosition.y*37.0+vFirePosition.x*23.0-uTime*1.9
          +sin(vFirePosition.z*31.0+uTime*1.2)*1.4);
        float tongues=smoothstep(.12,.90,turbulence);
        float rim=fresnel*(.70+.30*tongues);
        vec3 fire=mix(vec3(1.0,.075,.002),vec3(1.0,.58,.075),smoothstep(.08,.86,fresnel)+tongues*.18);
        fire=mix(fire,vec3(1.0,.94,.62),smoothstep(.72,.98,fresnel)*.62);
        float alpha=clamp(pow(rim,1.24)*.72,0.0,.68);
        gl_FragColor=vec4(fire*(1.1+.34*tongues),alpha);
        #include <logdepthbuf_fragment>
      }`,
    transparent:true,depthTest:true,depthWrite:false,
    blending:THREE.AdditiveBlending,side:THREE.FrontSide,toneMapped:false
  });
  const solarFireRim=new THREE.Mesh(solarFireRimGeometry,solarFireRimMaterial);
  solarFireRim.name='Animated Fresnel solar fire rim and eruptive plasma glow';
  solarFireRim.renderOrder=-898;
  sunGroup.add(solarFireRim);
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

  // The real Gaia catalogue is the only stellar point field in this scene.
  // Its loader starts below and makes measured stars visible from the first view.
  const stars=new THREE.Group();
  stars.name='BridgePoint unified Gaia DR3 stellar positions in parsecs';
  stars.visible=true;
  scene.add(stars);
  let solarCosmos=null;
  let focusedPlanetRadius=0;

  // Three-point depth layering adds a faint distant stellar haze without a flat CSS sky.
  const hazeGeometry=new THREE.SphereGeometry(3200,24,16);
  const haze=new THREE.Mesh(hazeGeometry,new THREE.MeshBasicMaterial({color:0x111c48,side:THREE.BackSide,transparent:true,opacity:.075,depthWrite:false}));
  scene.add(haze);

  const raycaster=new THREE.Raycaster();
  const pointer=new THREE.Vector2();
  const clickables=[earthDepthOccluder,moonMesh,sunMesh];
  let viewState='overview',focusedObject=null;
  let focusLocalTarget=null,moonTerrainController=null,sunFocusLocalTarget=null;\n  let saturnFocusMesh=null,saturnFocusLocalTarget=null;

// Lunar elevation and color are served only from BridgePoint static assets.
// Source products were materialized locally; the browser never requests NASA/Moon Trek tiles.
function createMoonTerrainController() {
  const ASSET = '/assets/moon/v1/';
  const PATCH = { west: 1.6333, east: 5.6333, south: 24.1322, north: 28.1322 };
  const mobile = matchMedia('(max-width: 700px)').matches || (navigator.deviceMemory || 4) <= 3;
  let active = false, assetsPromise = null, globalData = null, patchData = null;
  let colorTexture = null, patchMesh = null;
  let globalDetailPatchMesh = null, globalDetailMaterial = null;
  let globalDetailBounds = null;
  const highResolutionTileCache = new Map();
  let highResolutionPatchMesh = null, highResolutionPatchMaterial = null;
  let highResolutionBounds = null, highResolutionRequestId = 0;
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
    highResolutionTerrainStatus: 'not-loaded',
    highResolutionTerrainResolutionPixelsPerDegree: 128,
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
  function highResolutionTileInfo(lat, lon) {
    if (!Number.isFinite(lat) || lat <= -60 || lat >= 60) return null;
    const normalizedLon = ((lon + 180) % 360 + 360) % 360 - 180;
    const column = THREE.MathUtils.clamp(Math.floor((normalizedLon + 180) / 10), 0, 35);
    const row = THREE.MathUtils.clamp(Math.floor((60 - lat) / 10), 0, 11);
    const west = -180 + column * 10, north = 60 - row * 10;
    const rowName = String(row).padStart(2, '0'), columnName = String(column).padStart(2, '0');
    return { key: 'y' + rowName + '-x' + columnName, row, column, west, east: west + 10, north, south: north - 10, file: 'moon-sldem-128ppd-y' + rowName + '-x' + columnName + '.png' };
  }
  async function loadHighResolutionTile(lat, lon) {
    const info = highResolutionTileInfo(lat, lon);
    if (!info) return null;
    if (highResolutionTileCache.has(info.key)) return highResolutionTileCache.get(info.key);
    const grid = await decodePng16Gray(ASSET + 'sldem-128ppd/' + info.file);
    if (grid.width !== 1280 || grid.height !== 1280) throw new Error('Invalid local SLDEM2015 128ppd tile dimensions: ' + info.file);
    const tile = { ...info, ...grid };
    highResolutionTileCache.set(info.key, tile);
    while (highResolutionTileCache.size > 2) highResolutionTileCache.delete(highResolutionTileCache.keys().next().value);
    state.highResolutionTerrainStatus = 'ready';
    state.highResolutionTerrainTile = info.key;
    state.highResolutionTerrainSpacingMetersAtEquator = 236.9011752;
    state.updatedAt = Date.now();
    return tile;
  }
  function sampleHighResolutionTile(tile, lat, lon) {
    if (!tile || lat < tile.south || lat > tile.north || lon < tile.west || lon > tile.east) return null;
    return sampleGrid(tile, (lon - tile.west) / 10, (tile.north - lat) / 10);
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
    const apolloElevation = patchElevation(lat, lon);
    if (Number.isFinite(apolloElevation)) return apolloElevation;
    const tileInfo = highResolutionTileInfo(lat, lon);
    const tile = tileInfo ? highResolutionTileCache.get(tileInfo.key) : null;
    const globalHighResolution = sampleHighResolutionTile(tile, lat, lon);
    return Number.isFinite(globalHighResolution) ? globalHighResolution : globalElevation(lat, lon);
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
  const globalWidthSegments = mobile ? 1024 : 2048;
  const globalHeightSegments = mobile ? 512 : 1024;
  function buildGlobalTerrain() {
    const base = MOON_RADIUS_KM / EARTH_RADIUS_KM;
    const geometry = new THREE.SphereGeometry(base, globalWidthSegments, globalHeightSegments);
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
    const colors = new Float32Array(vertexCount * 4);
    const indices = new Uint32Array(segments * segments * 6);
    let indexOffset = 0;
    for (let y = 0; y <= segments; y++) {
      const v = y / segments, lat = PATCH.north - v * (PATCH.north - PATCH.south);
      for (let x = 0; x <= segments; x++) {
        const u = x / segments, lon = PATCH.west + u * (PATCH.east - PATCH.west);
        const sourceElevation = sampleGrid(patchData, u, v);
        const edgeDistanceDegrees = Math.min(u, v, 1-u, 1-v) * 4;
        const morphToBase = THREE.MathUtils.smoothstep(edgeDistanceDegrees, 0, 0.16);
        const elevation = globalElevation(lat, lon) * (1 - morphToBase) + sourceElevation * morphToBase;
        const point = moonSurfacePoint(lat, lon, elevation);
        const vertex = y * rowWidth + x, p = vertex * 3, uv = vertex * 2;
        positions[p] = point.x; positions[p+1] = point.y; positions[p+2] = point.z;
        uvs[uv] = (lon + 180) / 360;
        uvs[uv+1] = 0.5 + lat / 180;
        const edgeDistance = Math.min(u, v, 1-u, 1-v);
        const edgeAlpha = THREE.MathUtils.smoothstep(edgeDistance, 0.0, 0.035);
        colors[vertex*4] = 1; colors[vertex*4+1] = 1; colors[vertex*4+2] = 1; colors[vertex*4+3] = edgeAlpha;
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
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const material = createMoonPatchMaterial();
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

    patchMesh.visible = active;
    const inset = 0.17;
    const uMin = (PATCH.west + inset + 180) / 360;
    const vMin = 0.5 + (PATCH.south + inset) / 180;
    moonMaterial.uniforms.uApolloCutoutRect.value.set(uMin, vMin,
      (PATCH.east - PATCH.west - inset * 2) / 360, (PATCH.north - PATCH.south - inset * 2) / 180);
    moonMaterial.uniforms.uApolloCutoutActive.value = active ? 1 : 0;
  }
  async function refreshGlobalDetailPatch(centerLat, centerLon, force = false) {
    if (!active || !globalData || !colorTexture) return;
    const latitudeCenter = THREE.MathUtils.clamp(centerLat, -84.5, 84.5);
    const longitudeCenter = THREE.MathUtils.clamp(centerLon, -174.5, 174.5);
    if (globalDetailBounds && !force
      && Math.abs(latitudeCenter - globalDetailBounds.centerLat) < 3.5
      && Math.abs(longitudeCenter - globalDetailBounds.centerLon) < 3.5) {
      await refreshHighResolutionCraterPatch(centerLat, centerLon, force);
      return;
    }
    const halfSpan = 5.5;
    const west = longitudeCenter - halfSpan, east = longitudeCenter + halfSpan;
    const south = Math.max(-90, latitudeCenter - halfSpan);
    const north = Math.min(90, latitudeCenter + halfSpan);
    const widthSegments = Math.max(16, Math.round((east - west) * 16));
    const heightSegments = Math.max(16, Math.round((north - south) * 16));
    const rowWidth = widthSegments + 1;
    const vertexCount = rowWidth * (heightSegments + 1);
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const colors = new Float32Array(vertexCount * 4);
    const indices = new Uint32Array(widthSegments * heightSegments * 6);
    let indexOffset = 0;
    for (let y = 0; y <= heightSegments; y++) {
      const v = y / heightSegments;
      const lat = north - v * (north - south);
      for (let x = 0; x <= widthSegments; x++) {
        const u = x / widthSegments;
        const lon = west + u * (east - west);
        const point = moonSurfacePoint(lat, lon, globalElevation(lat, lon));
        const vertex = y * rowWidth + x, p = vertex * 3, uv = vertex * 2;
        positions[p] = point.x; positions[p+1] = point.y; positions[p+2] = point.z;
        uvs[uv] = (lon + 180) / 360;
        uvs[uv+1] = 0.5 + lat / 180;
        const edgeDistance = Math.min(u, v, 1-u, 1-v);
        const edgeAlpha = THREE.MathUtils.smoothstep(edgeDistance, 0.0, 0.055);
        colors[vertex*4] = 1; colors[vertex*4+1] = 1; colors[vertex*4+2] = 1; colors[vertex*4+3] = edgeAlpha;
        if (x < widthSegments && y < heightSegments) {
          const cellLat = north - (y + 0.5) / heightSegments * (north - south);
          const cellLon = west + (x + 0.5) / widthSegments * (east - west);
          const insideApolloPatch = cellLon >= PATCH.west && cellLon <= PATCH.east
            && cellLat >= PATCH.south && cellLat <= PATCH.north;
          if (!insideApolloPatch) {
            const a = vertex, b = a + 1, d = a + rowWidth, c = d + 1;
            indices[indexOffset++] = a; indices[indexOffset++] = b; indices[indexOffset++] = d;
            indices[indexOffset++] = b; indices[indexOffset++] = c; indices[indexOffset++] = d;
          }
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    geometry.setIndex(new THREE.BufferAttribute(indices.subarray(0, indexOffset), 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    if (!globalDetailMaterial) globalDetailMaterial = createMoonPatchMaterial(true);
    if (!globalDetailPatchMesh) {
      globalDetailPatchMesh = new THREE.Mesh(geometry, globalDetailMaterial);
      globalDetailPatchMesh.name = 'BridgePoint camera-centered global LOLA 16ppd terrain patch';
      globalDetailPatchMesh.frustumCulled = false;
      globalDetailPatchMesh.renderOrder = 3;
      moonMesh.add(globalDetailPatchMesh);
    } else {
      const previous = globalDetailPatchMesh.geometry;
      globalDetailPatchMesh.geometry = geometry;
      previous.dispose();
    }
    globalDetailPatchMesh.visible = active;
    globalDetailBounds = { west, east, south, north, centerLat: latitudeCenter, centerLon: longitudeCenter };
    state.globalDetailPatch = { source: 'BridgePoint-hosted NASA LRO LOLA global 16ppd fallback', resolutionPixelsPerDegree: 16, meshVertices: vertexCount, bounds: globalDetailBounds };
    state.updatedAt = Date.now();
    await refreshHighResolutionCraterPatch(centerLat, centerLon, force);
  }
  async function refreshHighResolutionCraterPatch(centerLat, centerLon, force = false) {
    if (!active || !globalData || !colorTexture) return;
    const tileInfo = highResolutionTileInfo(centerLat, centerLon);
    if (!tileInfo) {
      if (highResolutionPatchMesh) highResolutionPatchMesh.visible = false;
      highResolutionBounds = null;
      moonMaterial.uniforms.uGlobalCutoutActive.value = 0;
      state.highResolutionTerrainStatus = 'outside-128ppd-coverage-using-global-LOLA-fallback';
      return;
    }
    if (highResolutionBounds && !force && highResolutionBounds.tileKey === tileInfo.key
      && Math.abs(centerLat - highResolutionBounds.centerLat) < 0.85
      && Math.abs(centerLon - highResolutionBounds.centerLon) < 0.85) return;
    const requestId = ++highResolutionRequestId;
    let tile;
    try { tile = await loadHighResolutionTile(centerLat, centerLon); }
    catch (error) {
      state.highResolutionTerrainStatus = 'tile-load-failed-using-global-LOLA-fallback';
      state.highResolutionTerrainError = String(error?.message || error);
      state.updatedAt = Date.now();
      console.warn('[BridgePoint Moon] Local 128ppd crater DEM tile unavailable:', error);
      return;
    }
    if (!active || requestId !== highResolutionRequestId || !tile) return;
    const halfSpan = 2.0;
    const patchCenterLon = THREE.MathUtils.clamp(centerLon, tile.west + halfSpan, tile.east - halfSpan);
    const patchCenterLat = THREE.MathUtils.clamp(centerLat, tile.south + halfSpan, tile.north - halfSpan);
    const west = patchCenterLon - halfSpan, east = patchCenterLon + halfSpan;
    const south = patchCenterLat - halfSpan, north = patchCenterLat + halfSpan;
    if (west >= PATCH.west && east <= PATCH.east && south >= PATCH.south && north <= PATCH.north) {
      if (highResolutionPatchMesh) highResolutionPatchMesh.visible = false;
      highResolutionBounds = null;
      moonMaterial.uniforms.uGlobalCutoutActive.value = 0;
      state.highResolutionTerrainStatus = 'apollo-15-512ppd-patch-has-priority';
      return;
    }
    const segments = 512, rowWidth = segments + 1;
    const vertexCount = rowWidth * rowWidth;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const colors = new Float32Array(vertexCount * 4);
    const indices = new Uint32Array(segments * segments * 6);
    let indexOffset = 0;
    for (let y = 0; y <= segments; y++) {
      const v = y / segments, lat = north - v * (north - south);
      for (let x = 0; x <= segments; x++) {
        const u = x / segments, lon = west + u * (east - west);
        const highResolutionElevation = sampleHighResolutionTile(tile, lat, lon);
        const baseElevation = globalElevation(lat, lon);
        const edgeDistanceDegrees = Math.min(lon - west, east - lon, lat - south, north - lat);
        const morphToBase = THREE.MathUtils.smoothstep(edgeDistanceDegrees, 0, 0.16);
        const elevation = baseElevation * (1 - morphToBase) + highResolutionElevation * morphToBase;
        const point = moonSurfacePoint(lat, lon, elevation);
        const vertex = y * rowWidth + x, p = vertex * 3, uv = vertex * 2;
        positions[p] = point.x; positions[p+1] = point.y; positions[p+2] = point.z;
        uvs[uv] = (lon + 180) / 360;
        uvs[uv+1] = 0.5 + lat / 180;
        const edgeDistance = Math.min(u, v, 1-u, 1-v);
        const edgeAlpha = THREE.MathUtils.smoothstep(edgeDistance, 0, 0.04);
        colors[vertex*4] = 1; colors[vertex*4+1] = 1; colors[vertex*4+2] = 1; colors[vertex*4+3] = edgeAlpha;
        if (x < segments && y < segments) {
          const cellLat = north - (y + 0.5) / segments * (north - south);
          const cellLon = west + (x + 0.5) / segments * (east - west);
          const insideApolloPatch = cellLon >= PATCH.west && cellLon <= PATCH.east && cellLat >= PATCH.south && cellLat <= PATCH.north;
          if (!insideApolloPatch) {
            const a = vertex, b = a + 1, d = a + rowWidth, c = d + 1;
            indices[indexOffset++] = a; indices[indexOffset++] = b; indices[indexOffset++] = d;
            indices[indexOffset++] = b; indices[indexOffset++] = c; indices[indexOffset++] = d;
          }
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    geometry.setIndex(new THREE.BufferAttribute(indices.subarray(0, indexOffset), 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    if (!highResolutionPatchMaterial) highResolutionPatchMaterial = createMoonPatchMaterial(false);
    if (!highResolutionPatchMesh) {
      highResolutionPatchMesh = new THREE.Mesh(geometry, highResolutionPatchMaterial);
      highResolutionPatchMesh.name = 'BridgePoint locally hosted SLDEM2015 128ppd geometric crater bowls';
      highResolutionPatchMesh.frustumCulled = false;
      highResolutionPatchMesh.renderOrder = 4;
      moonMesh.add(highResolutionPatchMesh);
    } else {
      const previous = highResolutionPatchMesh.geometry;
      highResolutionPatchMesh.geometry = geometry;
      previous.dispose();
    }
    highResolutionPatchMesh.visible = active && indexOffset > 0;
    highResolutionBounds = { tileKey: tile.key, west, east, south, north, centerLat: patchCenterLat, centerLon: patchCenterLon };
    const inset = 0.17;
    const uMin = (west + inset + 180) / 360;
    const vMin = 0.5 + (south + inset) / 180;
    moonMaterial.uniforms.uGlobalCutoutRect.value.set(uMin, vMin, (east - west - inset * 2) / 360, (north - south - inset * 2) / 180);
    moonMaterial.uniforms.uGlobalCutoutActive.value = active && indexOffset > 0 ? 1 : 0;
    state.highResolutionTerrainStatus = 'ready';
    state.highResolutionTerrainTile = tile.key;
    state.highResolutionTerrainMesh = { source: 'NASA LRO LOLA + SELENE SLDEM2015', resolutionPixelsPerDegree: 128, sampleSpacingMetersAtEquator: 236.9011752, vertices: vertexCount, triangles: indexOffset / 3, bounds: highResolutionBounds };
    state.updatedAt = Date.now();
  }
  async function loadLocalAssets() {
    if (assetsPromise) return assetsPromise;
    assetsPromise = (async () => {
      commitState('loading', { runtimeMode: 'local-static-assets' });
      const loader = new THREE.TextureLoader();
      const results = await Promise.all([
        decodePng16Gray(ASSET + 'moon-global-height-16ppd-u16.png'),
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
        globalHeightResolution: globalData.width + 'x' + globalData.height + ' LOLA (16 pixels/degree)',
        globalTerrainMeshResolution: globalWidthSegments + 'x' + globalHeightSegments + ' vertices',
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
    if (!active) {
      highResolutionRequestId += 1;
      highResolutionBounds = null;
      if (highResolutionPatchMesh) highResolutionPatchMesh.visible = false;
      moonMaterial.uniforms.uGlobalCutoutActive.value = 0;
      state.highResolutionTerrainStatus = 'inactive';
    }
    if (patchMesh) patchMesh.visible = active;
    if (globalDetailPatchMesh) globalDetailPatchMesh.visible = active;
    if (highResolutionPatchMesh) highResolutionPatchMesh.visible = active && !!highResolutionBounds;
    moonMaterial.uniforms.uApolloCutoutActive.value = active && patchMesh ? 1 : 0;
    moonMaterial.uniforms.uGlobalCutoutActive.value = active && highResolutionPatchMesh && highResolutionBounds ? 1 : 0;
    labelsGroup.visible = active;
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
    void refreshGlobalDetailPatch(lat, lon);
    return Promise.resolve(focusResult(lat, lon));
  }
  window.__BP_MOON_TERRAIN_V1__ = state;
  return {
    async activate(lat, lon) {
      setActive(true);
      try {
        await loadLocalAssets();
        setActive(true);
        await refreshGlobalDetailPatch(lat, lon, true);
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
  let overviewBaseDistance=Math.hypot(4.2,16.5),lastSpaceZoomDistance=NaN,lastSpaceZoomSyncAt=0;
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  function animateCamera(position,lookAt,duration=1.45){
    cameraFrom.copy(camera.position);cameraTo.copy(position);
    targetFrom.copy(target);targetTo.copy(lookAt);
    transitionStart=nowSeconds();transitionDuration=duration;
  }
  function setResponsiveSunPosition(){
    const aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);
    sunPosition.copy(aspect<.72?new THREE.Vector3(2.05,4.6,3.4):aspect<1?new THREE.Vector3(2.8,4.9,4.0):new THREE.Vector3(4.0,5.1,4.5));
    sunGroup.position.copy(sunPosition);sunLight.position.copy(sunPosition);stars.position.copy(sunPosition);
  }
  function focusBody(body){
    const key=String(body||'').toLowerCase();
    const bodyData=solarCosmos?.getBody?.(key)||null;
    const focused=key==='moon'?moonMesh:key==='sun'?sunMesh:key==='earth'?earthDepthOccluder:bodyData?.mesh||null;
    if(!focused)return;
    const saturnBody=['saturn','titan','enceladus','mimas'].includes(key);
    solarCosmos?.setSelection?.(key);
    focusedObject=focused;
    saturnFocusMesh=saturnBody?focused:null;
    saturnFocusLocalTarget=null;
    if(saturnBody){
      // The welcome renderer is transparent over MapLibre. Saturn needs an
      // opaque deep-space background so the Earth map cannot show through.
      scene.background=new THREE.Color(0x02050c);
      earth.visible=false;moonPivot.visible=false;sunGroup.visible=false;haze.visible=false;
      stars.visible=true;
      viewState=key==='saturn'?'saturn-system':'saturn-surface';
    }else{
      scene.background=null;
      earth.visible=true;
      viewState=(key==='moon'||key==='sun')?key:'planet';
    }
    camera.up.set(0,1,0);
    if(key==='moon'){
      focusedPlanetRadius=0;sunFocusLocalTarget=null;focusLocalTarget=null;camera.near=0.00000005;
      moonTerrainController?.setActive(false);
    }else if(key==='sun'){
      focusedPlanetRadius=0;focusLocalTarget=null;moonTerrainController?.setActive(false);camera.near=0.0000001;
    }else{
      focusLocalTarget=null;sunFocusLocalTarget=null;moonTerrainController?.setActive(false);
      focusedPlanetRadius=key==='earth'?1:(bodyData?.radius||1);
      camera.near=Math.max(1e-12,focusedPlanetRadius*1e-7);
      camera.far=Math.max(camera.far,100000000000);
      camera.fov=48;camera.updateProjectionMatrix();
    }
    if(!saturnBody){
      earth.visible=true;moonPivot.visible=true;sunGroup.visible=true;stars.visible=true;haze.visible=true;
    }
    if(key==='moon'||key==='sun'){moonMesh.scale.setScalar(1);sunMesh.scale.setScalar(1);}
    const world=focused===sunMesh?sunGroup.getWorldPosition(new THREE.Vector3()):focused.getWorldPosition(new THREE.Vector3());
    if(key==='moon'){
      camera.fov=42;camera.updateProjectionMatrix();
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
    }else if(key==='sun'){
      camera.fov=62;camera.updateProjectionMatrix();
      sunFocusLocalTarget=new THREE.Vector3(0,0,sunRadiusVisual);
      sunGroup.updateMatrixWorld(true);
      const surface=sunGroup.localToWorld(sunFocusLocalTarget.clone());
      const surfaceNormal=sunFocusLocalTarget.clone().normalize().transformDirection(sunGroup.matrixWorld);
      animateCamera(surface.clone().addScaledVector(surfaceNormal,sunRadiusVisual*1.7),surface,1.8);
    }else if(saturnBody){
      const saturnMesh=solarCosmos?.getBody?.('saturn')?.mesh;
      const saturnCenter=saturnMesh?saturnMesh.getWorldPosition(new THREE.Vector3()):new THREE.Vector3();
      // Place the camera on the moon's outward orbital side so Saturn remains
      // naturally behind it when a moon is opened from the system view.
      const direction=key==='saturn'?camera.position.clone().sub(world):world.clone().sub(saturnCenter);
      if(direction.lengthSq()<1e-12)direction.set(0,0,1);
      direction.normalize();
      focused.updateMatrixWorld(true);
      const localDirection=direction.clone().applyQuaternion(focused.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();
      saturnFocusLocalTarget=localDirection.multiplyScalar(focusedPlanetRadius);
      const surface=focused.localToWorld(saturnFocusLocalTarget.clone());
      const systemDistance=Number(bodyData?.systemCameraDistance)>0?bodyData.systemCameraDistance:Math.max(focusedPlanetRadius*4.1,.22);
      animateCamera(world.clone().addScaledVector(direction,systemDistance),surface,key==='saturn'?2.1:1.5);
    }else{
      const direction=camera.position.clone().sub(world);
      if(direction.lengthSq()<1e-12)direction.set(0,0,1);
      direction.normalize();
      const systemDistance=Number(bodyData?.systemCameraDistance)>0?bodyData.systemCameraDistance:Math.max(focusedPlanetRadius*3.2,.25);
      animateCamera(world.clone().addScaledVector(direction,systemDistance),world,1.5);
    }
  }
  function resetView(){
    focusedObject=null;focusLocalTarget=null;sunFocusLocalTarget=null;saturnFocusMesh=null;saturnFocusLocalTarget=null;focusedPlanetRadius=0;solarCosmos?.clearSelection?.();viewState='overview';scene.background=null;moonTerrainController?.setActive(false);camera.near=0.001;camera.up.set(0,1,0);camera.fov=48;camera.updateProjectionMatrix();
    moonMesh.scale.setScalar(1);sunMesh.scale.setScalar(1);
    earth.visible=true;moonPivot.visible=true;sunGroup.visible=true;stars.visible=true;haze.visible=true;
    setResponsiveSunPosition();
    const aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight),distance=aspect<.72?20.5:aspect<1?18.5:16.5;
    overviewBaseDistance=Math.hypot(4.2,distance);lastSpaceZoomDistance=NaN;
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
  function enforceSunCameraClearance(){
    if(viewState!=='sun')return;
    sunGroup.updateMatrixWorld(true);
    const localCamera=sunGroup.worldToLocal(camera.position.clone());
    if(localCamera.lengthSq()<1e-18)return;
    const minimumRadius=sunRadiusVisual+Math.max(.00035,sunRadiusVisual*.00025);
    if(localCamera.length()<minimumRadius){
      localCamera.setLength(minimumRadius);
      camera.position.copy(sunGroup.localToWorld(localCamera));
    }
  }
  function enforceSaturnCameraClearance(){
    if(!saturnFocusMesh||!saturnFocusLocalTarget)return;
    saturnFocusMesh.updateMatrixWorld(true);
    const localCamera=saturnFocusMesh.worldToLocal(camera.position.clone());
    if(localCamera.lengthSq()<1e-18)return;
    const clearance=Math.max(.00035,focusedPlanetRadius*.00025);
    const minimumRadius=focusedPlanetRadius+clearance;
    if(localCamera.length()<minimumRadius){
      localCamera.setLength(minimumRadius);
      camera.position.copy(saturnFocusMesh.localToWorld(localCamera));
    }
  }
  function syncSaturnFocusToTarget(){
    if(!saturnFocusMesh||!saturnFocusLocalTarget)return;
    saturnFocusMesh.updateMatrixWorld(true);
    const local=saturnFocusMesh.worldToLocal(target.clone());
    if(local.lengthSq()<1e-18)return;
    saturnFocusLocalTarget=local.normalize().multiplyScalar(focusedPlanetRadius);
    const exact=saturnFocusMesh.localToWorld(saturnFocusLocalTarget.clone());
    const correction=exact.clone().sub(target);
    target.copy(exact);camera.position.add(correction);
  }
  function panSaturnSurface(dx,dy){
    if(!saturnFocusMesh||!saturnFocusLocalTarget||(!dx&&!dy))return;
    saturnFocusMesh.updateMatrixWorld(true);
    const localTarget=saturnFocusMesh.worldToLocal(target.clone());
    if(localTarget.lengthSq()<1e-18)return;
    const normalWorld=localTarget.clone().normalize().transformDirection(saturnFocusMesh.matrixWorld);
    const cameraRight=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
    cameraRight.addScaledVector(normalWorld,-cameraRight.dot(normalWorld));
    if(cameraRight.lengthSq()<1e-10)return;
    cameraRight.normalize();
    let screenUp=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
    screenUp.addScaledVector(normalWorld,-screenUp.dot(normalWorld));
    if(screenUp.lengthSq()<.025){
      screenUp.set(0,0,-1).applyQuaternion(camera.quaternion);
      screenUp.addScaledVector(normalWorld,-screenUp.dot(normalWorld));
    }
    if(screenUp.lengthSq()<1e-10)return;
    screenUp.normalize();
    const height=Math.max(1,canvas.clientHeight||innerHeight||1);
    const distance=camera.position.distanceTo(target);
    const worldPerPixel=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))/height;
    const travel=cameraRight.multiplyScalar(-dx).add(screenUp.multiplyScalar(dy)).multiplyScalar(worldPerPixel*1.15);
    const length=travel.length();
    if(length<1e-12)return;
    const axis=normalWorld.clone().cross(travel.clone().normalize());
    if(axis.lengthSq()<1e-12)return;
    axis.normalize();
    const move=new THREE.Quaternion().setFromAxisAngle(axis,length/Math.max(1e-9,focusedPlanetRadius));
    const center=saturnFocusMesh.getWorldPosition(new THREE.Vector3());
    camera.position.sub(center).applyQuaternion(move).add(center);
    target.sub(center).applyQuaternion(move).add(center);
    camera.quaternion.premultiply(move);camera.up.applyQuaternion(move);
    syncSaturnFocusToTarget();enforceSaturnCameraClearance();camera.lookAt(target);
  }
  function tiltSaturnCamera(deltaY){
    if(!saturnFocusMesh||!saturnFocusLocalTarget||Math.abs(deltaY)<.01)return;
    saturnFocusMesh.updateMatrixWorld(true);
    const normal=saturnFocusLocalTarget.clone().normalize().transformDirection(saturnFocusMesh.matrixWorld);
    const offset=camera.position.clone().sub(target);
    const current=Math.acos(THREE.MathUtils.clamp(offset.clone().normalize().dot(normal),-1,1));
    const next=THREE.MathUtils.clamp(current-deltaY*.0042,0,THREE.MathUtils.degToRad(84));
    const delta=next-current;
    if(Math.abs(delta)<1e-7)return;
    const view=offset.clone().normalize();
    let axis=normal.clone().cross(view);
    if(axis.lengthSq()<1e-10)axis.set(1,0,0).applyQuaternion(camera.quaternion);
    else axis.normalize();
    offset.applyAxisAngle(axis,delta);
    camera.position.copy(target).add(offset);
    enforceSaturnCameraClearance();camera.lookAt(target);
  }
  function syncSunFocusToTarget(){
    if(viewState!=='sun')return;
    sunGroup.updateMatrixWorld(true);
    const local=sunGroup.worldToLocal(target.clone());
    if(local.lengthSq()<1e-18)return;
    sunFocusLocalTarget=local.normalize().multiplyScalar(sunRadiusVisual);
    const exact=sunGroup.localToWorld(sunFocusLocalTarget.clone());
    const correction=exact.clone().sub(target);
    target.copy(exact);camera.position.add(correction);
  }
  function panSunSurface(dx,dy){
    if(viewState!=='sun'||(!dx&&!dy)||!sunFocusLocalTarget)return;
    sunGroup.updateMatrixWorld(true);
    const normal=sunFocusLocalTarget.clone().normalize().transformDirection(sunGroup.matrixWorld);
    const cameraRight=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
    cameraRight.addScaledVector(normal,-cameraRight.dot(normal));
    if(cameraRight.lengthSq()<1e-10)return;
    cameraRight.normalize();
    let screenUp=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
    screenUp.addScaledVector(normal,-screenUp.dot(normal));
    if(screenUp.lengthSq()<.025){
      screenUp.set(0,0,-1).applyQuaternion(camera.quaternion);
      screenUp.addScaledVector(normal,-screenUp.dot(normal));
    }
    if(screenUp.lengthSq()<1e-10)return;
    screenUp.normalize();
    const viewportHeight=Math.max(1,canvas.clientHeight||innerHeight||1);
    const range=camera.position.distanceTo(target);
    const worldPerPixel=2*range*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))/viewportHeight;
    const travel=cameraRight.multiplyScalar(-dx).add(screenUp.multiplyScalar(dy)).multiplyScalar(worldPerPixel*1.15);
    const length=travel.length();if(length<1e-12)return;
    const axis=normal.clone().cross(travel.clone().normalize());if(axis.lengthSq()<1e-12)return;
    axis.normalize();
    const rotation=new THREE.Quaternion().setFromAxisAngle(axis,length/sunRadiusVisual);
    const center=sunGroup.getWorldPosition(new THREE.Vector3());
    camera.position.sub(center).applyQuaternion(rotation).add(center);
    target.sub(center).applyQuaternion(rotation).add(center);
    camera.quaternion.premultiply(rotation);camera.up.applyQuaternion(rotation);
    syncSunFocusToTarget();enforceSunCameraClearance();camera.lookAt(target);
  }
  function tiltSunCamera(deltaY){
    if(viewState!=='sun'||!sunFocusLocalTarget||Math.abs(deltaY)<.01)return;
    sunGroup.updateMatrixWorld(true);
    const normal=sunFocusLocalTarget.clone().normalize().transformDirection(sunGroup.matrixWorld);
    const offset=camera.position.clone().sub(target);
    const current=Math.acos(THREE.MathUtils.clamp(offset.clone().normalize().dot(normal),-1,1));
    const next=THREE.MathUtils.clamp(current-deltaY*.0042,0,THREE.MathUtils.degToRad(84));
    const delta=next-current;if(Math.abs(delta)<1e-7)return;
    let axis=normal.clone().cross(offset.clone().normalize());
    if(axis.lengthSq()<1e-10)axis.set(1,0,0).applyQuaternion(camera.quaternion);else axis.normalize();
    offset.applyAxisAngle(axis,delta);
    camera.position.copy(target).add(offset);
    enforceSunCameraClearance();camera.lookAt(target);
  }
  function rotateSunSurface(dx,dy){
    if(viewState!=='sun'||(!dx&&!dy))return;
    const yaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-dx*.0042);
    const pitch=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-dy*.0042);
    const rotation=yaw.multiply(pitch),center=sunGroup.getWorldPosition(new THREE.Vector3());
    sunGroup.quaternion.premultiply(rotation);
    camera.position.sub(center).applyQuaternion(rotation).add(center);
    target.sub(center).applyQuaternion(rotation).add(center);
    camera.quaternion.premultiply(rotation);camera.up.applyQuaternion(rotation);
    enforceSunCameraClearance();camera.lookAt(target);
  }
  function moonZoomDistance(distance){
    const minimum=saturnFocusMesh?Math.max(0.00000045,focusedPlanetRadius*1.0004):viewState==='moon'?0.00000045:viewState==='sun'?.0015:viewState==='planet'?Math.max(1e-9,focusedPlanetRadius*1.015):1.8;
    const maximum=solarCosmos?.maxCameraDistance?.()||5000;
    return THREE.MathUtils.clamp(distance,minimum,maximum);
  }
  function zoomCameraBy(factor){
    const direction=camera.position.clone().sub(target).normalize();
    const distance=moonZoomDistance(camera.position.distanceTo(target)*factor);
    camera.position.copy(target).addScaledVector(direction,distance);
    enforceMoonCameraClearance();
    enforceSunCameraClearance();
    enforceSaturnCameraClearance();
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
  function rotateMoonBy(dx,dy){
    // Compatibility path: gestures adjust the lunar camera, never the Moon body.
    rotateMoonViewYaw(dx);
    tiltMoonCamera(dy);
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
    if(viewState==='saturn-system'||viewState==='saturn-surface'){
      panSaturnSurface(dx,dy);
      return;
    }
    if(viewState==='moon'){
      rotateMoonBy(dx,dy);
      return;
    }
    if(viewState==='sun'){
      // At every zoom level, drag the camera tangent across the Sun's real surface.
      // Do not rotate the Sun and camera together; that cancels the visible motion.
      panSunSurface(dx,dy);
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
    if(viewState!=='moon'||!moonTerrainController||!focusLocalTarget)return;
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
      if((viewState==='moon'||viewState==='sun'||viewState==='saturn-system'||viewState==='saturn-surface')&&gestureCenter){
        const dx=gesture.center.x-gestureCenter.x;
        const dy=gesture.center.y-gestureCenter.y;
        // Horizontal two-finger movement pans along the selected body's surface.
        // Vertical two-finger movement raises the camera toward an oblique 3D horizon.
        // Pinch distance remains independent and controls zoom.
        if(viewState==='moon'){panMoonSurface(dx,0);tiltMoonCamera(dy);}
        else if(viewState==='sun'){panSunSurface(dx,0);tiltSunCamera(dy);}
        else{panSaturnSurface(dx,0);tiltSaturnCamera(dy);}
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
    }else if(viewState==='sun'){
      panSunSurface(dx,dy);
    }else if(viewState==='saturn-system'||viewState==='saturn-surface'){
      panSaturnSurface(dx,dy);
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
  controls.querySelector('[data-space-reset]').addEventListener('click',()=>resetView());

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
    if(viewState!=='moon'){
      moonPivot.position.set(0,0,0);
      moonMesh.position.set(orbitRadius*Math.cos(trueAnomaly),Math.sin(trueAnomaly)*Math.sin(inclination)*orbitRadius,orbitRadius*Math.sin(trueAnomaly));
      moonMesh.lookAt(earth.position);
      moonMesh.quaternion.multiply(moonUserRotation);
    }
    if(transitionStart){
      const u=THREE.MathUtils.clamp((t-transitionStart)/transitionDuration,0,1),k=ease(u);
      camera.position.lerpVectors(cameraFrom,cameraTo,k);target.lerpVectors(targetFrom,targetTo,k);camera.lookAt(target);
      if(u>=1)transitionStart=0;
    }
    const followsEarthCamera=viewState==='overview'||(viewState==='planet'&&focusedObject===earthDepthOccluder);
    const spaceDistance=camera.position.distanceTo(target);
    const spaceZoomRatio=spaceDistance/Math.max(1e-9,overviewBaseDistance);
    if(followsEarthCamera){
      if(!Number.isFinite(lastSpaceZoomDistance)
        ||Math.abs(spaceDistance-lastSpaceZoomDistance)>Math.max(.001,spaceDistance*.002)
        ||t-lastSpaceZoomSyncAt>.12){
        window.__BP_WELCOME_SYNC_SPACE_ZOOM_V1__?.(spaceZoomRatio);
        lastSpaceZoomDistance=spaceDistance;lastSpaceZoomSyncAt=t;
      }
    }else if(lastSpaceZoomDistance!==0){
      window.__BP_WELCOME_SYNC_SPACE_ZOOM_V1__?.(1);
      lastSpaceZoomDistance=0;
    }
    sunMaterial.uniforms.uTime.value=t;
    coronaMaterial.uniforms.uTime.value=t;
    solarFireRimMaterial.uniforms.uTime.value=t;
    if(solarPlasmaParticles)solarPlasmaParticles.material.uniforms.uTime.value=t;
    moonMaterial.uniforms.uTime.value=t;
    const sunWorld=sunGroup.getWorldPosition(new THREE.Vector3());
    moonMaterial.uniforms.uSunDir.value.copy(moonMesh.worldToLocal(sunWorld.clone()).normalize());
    moonMaterial.uniforms.uCameraLocal.value.copy(moonMesh.worldToLocal(camera.position.clone()));
    if(!reducedMotion)sunGroup.rotation.y+=elapsed*(TAU/(25.38*86400));
    coronalLoopMeshes.forEach((mesh,i)=>{
      mesh.material.uniforms.uTime.value=t;
      mesh.material.uniforms.uOpacity.value=.40+.20*Math.sin(t*.92+mesh.material.uniforms.uPhase.value);
    });
    flareMeshes.forEach((mesh,i)=>{
      mesh.material.uniforms.uTime.value=t;
      mesh.material.uniforms.uOpacity.value=.64+.26*(.5+.5*Math.sin(t*1.65+mesh.material.uniforms.uPhase.value));
    });
    if(focusedObject&&!transitionStart&&!dragging){
      const focusedWorld=focusedObject===sunMesh?(sunFocusLocalTarget?sunGroup.localToWorld(sunFocusLocalTarget.clone()):sunGroup.getWorldPosition(new THREE.Vector3())):(saturnFocusMesh===focusedObject&&saturnFocusLocalTarget?saturnFocusMesh.localToWorld(saturnFocusLocalTarget.clone()):(focusLocalTarget?moonMesh.localToWorld(focusLocalTarget.clone()):focusedObject.getWorldPosition(new THREE.Vector3())));
      camera.position.add(focusedWorld.clone().sub(target));target.copy(focusedWorld);camera.lookAt(target);
    }
    if(viewState==='moon'){
      enforceMoonCameraClearance();
      camera.lookAt(target);
      moonTerrainController?.refreshLabels();
    }else if(viewState==='sun'){
      enforceSunCameraClearance();
      camera.lookAt(target);
    }else if(viewState==='saturn-system'||viewState==='saturn-surface'){
      enforceSaturnCameraClearance();
      camera.lookAt(target);
    }
    solarCosmos?.update?.();
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
    state:()=>({viewState,moonOrbitPeriodDays:MOON_PERIOD_DAYS,solarRotationPeriodDays:25.38,solarReliefStatus:window.__BP_SOLAR_SURFACE_V2__?.reliefStatus||'loading',solarCameraTiltDegrees:viewState==='sun'&&sunFocusLocalTarget?THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(camera.position.clone().sub(target).normalize().dot(sunFocusLocalTarget.clone().normalize().transformDirection(sunGroup.matrixWorld)),-1,1))):null,solarCoronalLoopCount:coronalLoopMeshes.length,solarFlareArcCount:flareMeshes.length,solarAssets:window.__BP_SOLAR_SURFACE_V3__||window.__BP_SOLAR_SURFACE_V2__||{status:'not-requested'},
      solarMagneticLoopCount:coronalLoopMeshes.length,solarObservedEruptionArcCount:flareMeshes.length,solarFireLayer:window.__BP_SOLAR_SURFACE_V4__||{status:'loading'},solarPlasmaParticleCount:solarPlasmaParticles?.geometry.attributes.position.count||0,
      moonCameraTiltDegrees:THREE.MathUtils.radToDeg(moonCameraTiltRadians()),
      moonCameraDistanceKm:viewState==='moon'?camera.position.distanceTo(target)*EARTH_RADIUS_KM:null,
      radiiKm:{earth:EARTH_RADIUS_KM,moon:MOON_RADIUS_KM,sun:SUN_RADIUS_KM},
      cinematicOrbitDistanceScale:'responsive-compressed',
      lunarTerrain:window.__BP_MOON_TERRAIN_V1__||{status:'not-requested'},
      lunarSurfaceNavigation:'two-finger-vertical=continuous-camera-tilt; two-finger-horizontal=surface-pan; pinch=zoom; one-finger=surface-pan; reset=original-celestial-overview',
      solarSurfaceNavigation:'one-finger=spin-the-Sun; two-finger-vertical=oblique-3D-camera-tilt; two-finger-horizontal=surface-pan; pinch=surface-zoom; reset=original-celestial-overview',
      lunarFocusFrame:'shared-celestial-scene; Moon orbital position held while lunar camera is active',
      saturnModuleMode:viewState==='saturn-system'||viewState==='saturn-surface'?'isolated-opaque-saturn-system':'inactive',
      saturnSurfaceNavigation:'one-finger=surface-pan; two-finger-horizontal=surface-pan; two-finger-vertical=84-degree-camera-tilt; pinch=surface-zoom; direct-raycast=focus-moving-moon',
      lunarLabelCount:window.__BP_MOON_TERRAIN_V1__?.labelCount||0,
      proceduralLunarRelief:'fallback-only-outside-loaded-NASA-DEM-coverage'})
  };
  void import('./bridgepoint-gaia-galaxy-v6270.js?v=6283-saturn-isolated')
    .then(module=>{
      solarCosmos=module.initBridgePointSolarCosmos({
        THREE,scene,camera,canvas,host,controls,starsGroup:stars,
        getSunPosition:()=>sunPosition.clone(),
        getMoonPosition:()=>moonMesh.getWorldPosition(new THREE.Vector3()),
        focusBody,clickables,
        bodyRefs:{earth:earthDepthOccluder,moon:moonMesh,sun:sunMesh},
        isMobile:mobile
      });
    })
    .catch(error=>console.warn('[BridgePoint Gaia DR3] Unified celestial scene unavailable:',error));
})();
