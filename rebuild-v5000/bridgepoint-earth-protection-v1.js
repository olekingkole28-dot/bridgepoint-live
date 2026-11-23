import * as THREE from '/vendor/three.module.js?v=169-local';

/* BridgePoint Earth Protection layer v1. */
(() => {
  'use strict';

  const VERSION = '1.3.0';
  if (window.__BP_EARTH_PROTECTION_V1__?.version === VERSION) return;

  const BUTTON_ID = 'bpEarthProtectionLaunchV1';
  const ROOT_ID = 'bpEarthProtectionHudV1';
  const STYLE_ID = 'bpEarthProtectionStyleV1';
  const WIND_URL = 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json';
  const MAG_URL = 'https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json';
  const OZONE_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
  const state = {
    open: false,
    paused: false,
    mode: 'both',
    renderer:null, earthTexture:null, plasmaShells:[], pointers:new Map(),
    orbitYaw:0, orbitPitch:.1, orbitDistance:7, historyEntry:false,
    raf: 0,
    lastFrame: 0,
    time: 0,
    feedTimer: 0,
    feed: { density: 5, speed: 400, bz: 0, pressure: 1.34, r0: 10, live: false, checkedAt: 0, source: 'nominal model' },
    targetR0: 10,
    smoothR0: 10,
    dockState: null,
    closeControlState: null,
    openedExplorer: false,
    spaceApi: null,
    solarApi: null,
    scene: null,
    camera: null,
    earthMesh: null,
    root: null,
    magnetosphere: null,
    ozoneGroup: null,
    ozoneTexture: null,
    ozoneStatus: 'NASA daily ozone layer loading…',
    streamCurves: [],
    streamParticles: [],
    windVisual: null,
    windSeeds: [],
    windRibbons: [],
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const number = value => {
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
  };

  function setStatus(message, tone = 'info') {
    const node = $('#' + ROOT_ID + ' [data-shield-status]');
    if (!node) return;
    node.textContent = message;
    node.dataset.tone = tone;
  }

  function injectStyle() {
    if ($('#' + STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .bpEarthProtectionButtonV1{white-space:nowrap}
      #${BUTTON_ID}[hidden],#${ROOT_ID}[hidden]{display:none!important}
      #${ROOT_ID}{position:fixed;inset:0;z-index:2147483600;pointer-events:none;color:#effcff;font:600 13px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}
      #${ROOT_ID} *{box-sizing:border-box}
      .bpShieldHudCardV1{position:absolute;top:calc(env(safe-area-inset-top) + 12px);left:12px;width:min(570px,calc(100vw - 24px));padding:12px;border:1px solid #69e4f277;border-radius:17px;background:linear-gradient(135deg,#061a29ee,#0a2836dc);box-shadow:0 12px 32px #0009,0 0 24px #32dcef22;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);pointer-events:auto}
      .bpShieldTopLineV1{display:flex;align-items:flex-start;gap:12px}.bpShieldBrandV1{min-width:0;flex:1}.bpShieldKickerV1{margin:0 0 2px;color:#82f2ff;font-size:11px;font-weight:950;letter-spacing:.15em}.bpShieldTitleV1{margin:0;color:#effcff;font-size:clamp(16px,4vw,20px);font-weight:950;line-height:1.1;letter-spacing:.01em}.bpShieldDescriptionV1{margin:4px 0 0;color:#a6c4d0;font-size:12px;line-height:1.35}
      .bpShieldActionsV1{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:10px}.bpShieldActionsV1 button{min-height:37px;padding:0 11px;border:1px solid #4a8393;border-radius:11px;background:#081c2b;color:#c8e8ef;font:900 11px/1 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.04em;cursor:pointer;touch-action:manipulation}.bpShieldActionsV1 button[data-selected="true"]{border-color:#80f3f4;background:linear-gradient(130deg,#155064,#0e3244);color:#f3ffff;box-shadow:inset 0 0 14px #67ecf22c,0 0 12px #2bdcec24}.bpShieldActionsV1 button:last-child{margin-left:auto;border-color:#795c65;color:#ffdddf}
      .bpShieldReadoutV1{margin:9px 0 0;padding-top:8px;border-top:1px solid #b6f4ff20;color:#bed7df;font-size:11px;line-height:1.4}.bpShieldReadoutV1 strong{color:#83efff;font-weight:900}.bpShieldStatusV1{display:block;margin-top:5px;color:#9fbcc8}.bpShieldStatusV1[data-tone="error"]{color:#ffc3c8}.bpShieldStatusV1[data-tone="ok"]{color:#a5f1d0}
      .bpShieldFootV1{position:absolute;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 15px);width:min(700px,calc(100vw - 24px));margin:auto;padding:8px 11px;border:1px solid #4b8a9a77;border-radius:12px;background:#061724d9;color:#a8c5d0;font-size:10px;line-height:1.4;text-align:center;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);pointer-events:auto}
      @media(max-width:520px){.bpShieldHudCardV1{top:calc(env(safe-area-inset-top) + 8px);left:8px;width:calc(100vw - 16px);padding:10px;border-radius:14px}.bpShieldActionsV1{gap:6px}.bpShieldActionsV1 button{min-height:35px;padding:0 9px;font-size:10px}.bpShieldReadoutV1{font-size:10px}.bpShieldFootV1{left:8px;right:8px;width:calc(100vw - 16px);bottom:calc(env(safe-area-inset-bottom) + 8px);font-size:9px}}
      .bpShieldViewportV1{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,#082239,#01050c 75%);pointer-events:auto;touch-action:none}
      .bpShieldViewportV1 canvas{display:block;width:100%;height:100%;touch-action:none}
      .bpShieldHudCardV1,.bpShieldFootV1{z-index:2;pointer-events:none}
      @media(prefers-reduced-motion:reduce){.bpShieldHudCardV1,.bpShieldFootV1{scroll-behavior:auto}}
    `;
    document.head.appendChild(style);
  }

  function installButton() {
    const dock = $('#bpv-dock-actions');
    if (!dock) return;
    injectStyle();
    let button = $('#' + BUTTON_ID);
    if (!button) {
      button = document.createElement('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.className = 'bpv-v2-tool-button bpEarthProtectionButtonV1';
      button.dataset.bpvCommandSection = 'Explore';
      button.textContent = '◉  EARTH SHIELD';
      button.setAttribute('aria-label', 'Show the moving 3D Earth protection layers');
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', openShield);
    }
    if (button.parentElement !== dock) dock.appendChild(button);
    button.hidden = false;
  }

  function ensureHud(){
    if($('#'+ROOT_ID))return;
    const root=document.createElement('section');
    root.id=ROOT_ID;root.hidden=true;
    root.setAttribute('aria-label','Earth-only shield view');
    root.innerHTML='<div class="bpShieldViewportV1" data-shield-viewport></div>'+
      '<div class="bpShieldHudCardV1"><p class="bpShieldKickerV1">BRIDGEPOINT · EARTH SHIELD</p>'+
      '<h2 class="bpShieldTitleV1">Magnetic turbulence + ozone</h2>'+
      '<p class="bpShieldDescriptionV1">Both layers are on · drag to rotate · pinch to zoom · Back to return</p>'+
      '<div class="bpShieldReadoutV1" data-shield-readout></div>'+
      '<span class="bpShieldStatusV1" data-shield-status role="status" aria-live="polite">Loading Earth Shield…</span></div>'+
      '<div class="bpShieldFootV1" data-shield-note></div>';
    document.body.appendChild(root);
  }

  function hideDock(hide) {
    const dock = $('#bpv-dock');
    if (!dock) return;
    if (hide) {
      if (state.dockState) return;
      state.dockState = {
        visibility: dock.style.getPropertyValue('visibility'),
        visibilityPriority: dock.style.getPropertyPriority('visibility'),
        pointerEvents: dock.style.getPropertyValue('pointer-events'),
        pointerEventsPriority: dock.style.getPropertyPriority('pointer-events'),
        ariaHidden: dock.getAttribute('aria-hidden'),
      };
      dock.style.setProperty('visibility', 'hidden', 'important');
      dock.style.setProperty('pointer-events', 'none', 'important');
      dock.setAttribute('aria-hidden', 'true');
      return;
    }
    if (!state.dockState) return;
    const prior = state.dockState;
    if (prior.visibility) dock.style.setProperty('visibility', prior.visibility, prior.visibilityPriority);
    else dock.style.removeProperty('visibility');
    if (prior.pointerEvents) dock.style.setProperty('pointer-events', prior.pointerEvents, prior.pointerEventsPriority);
    else dock.style.removeProperty('pointer-events');
    if (prior.ariaHidden === null) dock.removeAttribute('aria-hidden');
    else dock.setAttribute('aria-hidden', prior.ariaHidden);
    state.dockState = null;
  }

  function hideSpaceCloseControl(hide) {
    const control = $('[data-app-space-close]');
    if (!control) return;
    if (hide) {
      if (!state.closeControlState) state.closeControlState = { hidden: control.hidden };
      control.hidden = true;
      return;
    }
    if (state.closeControlState) control.hidden = state.closeControlState.hidden;
    state.closeControlState = null;
  }

  async function waitFor(predicate, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline && state.open) {
      const value = predicate();
      if (value) return value;
      await new Promise(resolve => window.setTimeout(resolve, 100));
    }
    return null;
  }

  function earthMapUrl(){
    const url=new URL(OZONE_WMS);
    url.search=new URLSearchParams({service:'WMS',request:'GetMap',version:'1.1.1',
      layers:'BlueMarble_ShadedRelief_Bathymetry',styles:'',format:'image/jpeg',
      width:'2048',height:'1024',srs:'EPSG:4326',bbox:'-180,-90,180,90'}).toString();
    return url.toString();
  }

  async function loadEarthMap(){
    const mesh=state.earthMesh;if(!mesh)return;
    const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');
    for(const url of [earthMapUrl(),'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg']){
      try{
        const texture=await new Promise((ok,no)=>loader.load(url,ok,undefined,no));
        if(!state.open||state.earthMesh!==mesh){texture.dispose();return}
        texture.colorSpace=THREE.SRGBColorSpace;
        mesh.material.map=texture;mesh.material.color.setHex(0xffffff);
        mesh.material.needsUpdate=true;state.earthTexture=texture;return;
      }catch(_){}
    }
  }

  function resizeEarthOnly(){
    if(!state.open||!state.renderer||!state.camera)return;
    const el=$('#'+ROOT_ID+' [data-shield-viewport]');if(!el)return;
    const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);
    state.camera.aspect=w/h;state.camera.updateProjectionMatrix();state.renderer.setSize(w,h,false);
  }

  function connectShieldGestures(canvas){
    const p=state.pointers;
    const pinch=()=>{const a=[...p.values()];return a.length<2?0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)};
    let lastPinch=0;
    canvas.addEventListener('pointerdown',e=>{e.preventDefault();p.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture?.(e.pointerId);lastPinch=pinch()});
    canvas.addEventListener('pointermove',e=>{
      if(!p.has(e.pointerId))return;e.preventDefault();
      const prev=p.get(e.pointerId);p.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(p.size===1){state.orbitYaw-=(e.clientX-prev.x)*.006;state.orbitPitch=clamp(state.orbitPitch+(e.clientY-prev.y)*.005,-1.38,1.38)}
      else {const next=pinch();if(next&&lastPinch)state.orbitDistance=clamp(state.orbitDistance*lastPinch/next,2.6,19);lastPinch=next}
    });
    const end=e=>{p.delete(e.pointerId);lastPinch=pinch()};
    for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,end);
    canvas.addEventListener('wheel',e=>{e.preventDefault();state.orbitDistance=clamp(state.orbitDistance*Math.exp(e.deltaY*.001),2.6,19)},{passive:false});
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
  }

  async function openEarthOnlyScene(){
    const viewport=$('#'+ROOT_ID+' [data-shield-viewport]');
    if(!viewport)throw Error('Earth Shield viewer not available');
    const mobile=window.matchMedia('(max-width:650px)').matches;
    const renderer=new THREE.WebGLRenderer({alpha:false,antialias:!mobile,powerPreference:'default'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.25:1.65));
    renderer.setClearColor(0x010812,1);
    viewport.replaceChildren(renderer.domElement);
    state.renderer=renderer;
    state.scene=new THREE.Scene();
    state.camera=new THREE.PerspectiveCamera(43,1,.03,180);
    state.scene.add(new THREE.AmbientLight(0x82bfff,1.45));
    const sunlight=new THREE.DirectionalLight(0xffffff,2.0);
    sunlight.position.set(-3,4,6);state.scene.add(sunlight);
    state.earthMesh=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),
      new THREE.MeshPhongMaterial({color:0x1873a2,shininess:6,specular:0x14253b}));
    state.earthMesh.name='Earth-only globe';state.earthMesh.rotation.y=-.38;
    state.scene.add(state.earthMesh);
    createLayerObjects();
    state.magnetosphere.visible=true;state.ozoneGroup.visible=true;
    resizeEarthOnly();connectShieldGestures(renderer.domElement);
    void loadEarthMap();void loadOzoneTexture();void refreshSolarWind();
    updateReadout();
  }

  function createLayerObjects() {
    if (!state.scene || state.root) return;
    const root = new THREE.Group();
    root.name = 'BridgePoint live Earth protection visualization';
    root.frustumCulled = false;
    state.root = root;

    const shellGeometry = new THREE.SphereGeometry(1, 96, 64);
    const positions = shellGeometry.attributes.position;
    const local = new THREE.Vector3();
    for (let i = 0; i < positions.count; i += 1) {
      local.fromBufferAttribute(positions, i).normalize();
      const tail = Math.pow((1 - local.x) * 0.5, 1.65);
      const flare = 9.8 + 18.5 * tail;
      const lateral = 7.9 + 4.6 * clamp((-local.x + 0.18) / 1.18, 0, 1);
      positions.setXYZ(i, local.x * flare, local.y * lateral, local.z * lateral);
    }
    positions.needsUpdate = true;
    shellGeometry.computeVertexNormals();
    const shellMaterial = new THREE.ShaderMaterial({
      transparent:true,blending:THREE.AdditiveBlending,depthTest:true,depthWrite:false,
      side:THREE.DoubleSide,toneMapped:false,
      uniforms:{uTime:{value:0},uStress:{value:.22},uOpacity:{value:.19},uPhase:{value:0}},
      vertexShader:"varying vec3 vLocal,vN,vEye;uniform float uTime,uStress,uPhase;\nvoid main(){\n vec3 p=position;\n float a=sin(p.y*1.35+uTime*2.4+uPhase)*cos(p.z*.89-uTime*1.8);\n float b=sin(p.z*2.3-p.x*.22+uTime*1.55+uPhase);\n p+=normal*(.55+uStress*.38)*(a*.65+b*.35);\n vLocal=p;vec4 mv=modelViewMatrix*vec4(p,1.);vEye=-mv.xyz;vN=normalize(normalMatrix*normal);\n gl_Position=projectionMatrix*mv;\n}",fragmentShader:"precision highp float;\nuniform float uTime,uStress,uOpacity,uPhase;varying vec3 vLocal,vN,vEye;\nfloat hs(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}\nfloat nz(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);\n return mix(mix(mix(hs(i),hs(i+vec3(1,0,0)),f.x),mix(hs(i+vec3(0,1,0)),hs(i+vec3(1,1,0)),f.x),f.y),\n mix(mix(hs(i+vec3(0,0,1)),hs(i+vec3(1,0,1)),f.x),mix(hs(i+vec3(0,1,1)),hs(i+vec3(1,1,1)),f.x),f.y),f.z);}\nvoid main(){\n float t=uTime;vec3 flow=vec3(vLocal.x*.39+t*.41,vLocal.y*.69-t*.65,vLocal.z*.72+t*.53);\n float n=nz(flow)+.5*nz(flow*2.6+uPhase);\n float ribbon=pow(max(0.,.5+.5*sin(vLocal.y*2.5+vLocal.z*1.6-vLocal.x*.4+n*7.-t*3.9+uPhase)),9.);\n float filament=pow(max(0.,.5+.5*sin(vLocal.z*3.3-vLocal.y+n*9.+t*4.2)),14.);\n float rim=pow(1.-abs(dot(normalize(vN),normalize(vEye))),1.6);\n float billow=smoothstep(.3,.9,n),flare=max(ribbon,filament);\n vec3 color=mix(vec3(.06,.29,1.),vec3(.06,.94,1.),clamp(billow+flare*.5,0.,1.));\n color=mix(color,vec3(.46,.16,1.),(1.-n)*.27+uStress*.2);\n color=mix(color,vec3(.1,1.,.7),flare*.62);\n float alpha=clamp(uOpacity*(.07+rim*.5+flare*.75+billow*.23),0.,.72);\n gl_FragColor=vec4(color*(.75+flare*.55),alpha);\n}"
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.name = 'Live-pressure-driven magnetopause shell';
    shell.renderOrder = 12;
    root.add(shell);

    const fieldGroup = new THREE.Group();
    fieldGroup.name = 'Modeled geomagnetic field lines';
    for (const L of [1.9, 2.5, 3.2, 4.1, 5.1, 6.4]) {
      for (let side = 0; side < 2; side += 1) {
        const phi = side * Math.PI * 0.5 + (L * 0.19);
        const points = [];
        for (let j = 0; j <= 84; j += 1) {
          const theta = 0.07 + (Math.PI - 0.14) * j / 84;
          const r = L * Math.pow(Math.sin(theta), 2);
          points.push(new THREE.Vector3(
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.cos(theta),
            r * Math.sin(theta) * Math.sin(phi)
          ));
        }
        const line=new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),96,.032,4,false),
          new THREE.MeshBasicMaterial({color:side?0x53c8ff:0x54ffd2,transparent:true,
             opacity:.32,blending:THREE.AdditiveBlending,depthTest:true,depthWrite:false,toneMapped:false})
        );
        line.name='Magnetic flux tube';line.userData.phase=phi;line.renderOrder=14;
        fieldGroup.add(line);
      }
    }
    root.add(fieldGroup);
    state.magnetosphere = new THREE.Group();
    state.magnetosphere.name = 'Magnetosphere mode';
    state.magnetosphere.add(shell,fieldGroup);
    state.plasmaShells=[shell];
    for(let i=1;i<=2;i++){
      const curtain=new THREE.Mesh(shellGeometry.clone(),shellMaterial.clone());
      curtain.name='Secondary waving magnetic plasma curtain';
      curtain.material.uniforms.uPhase.value=i*2.35;
      curtain.material.uniforms.uOpacity.value=.18-i*.035;
      curtain.scale.setScalar(1+i*.095);curtain.renderOrder=12+i;
      state.magnetosphere.add(curtain);state.plasmaShells.push(curtain);
    }
    state.magnetosphere.scale.setScalar(.23);
    root.add(state.magnetosphere);

    const ozoneGroup = new THREE.Group();
    ozoneGroup.name = 'Daily total-column ozone layer';
    const ozoneGeometry = new THREE.SphereGeometry(1.055, 96, 64);
    const ozoneMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.46,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    const ozone = new THREE.Mesh(ozoneGeometry, ozoneMaterial);
    ozone.name = 'NASA OMI daily ozone raster on a thin visible shell';
    ozone.renderOrder=18;ozone.visible=false;
    ozoneGroup.add(ozone);
    // Reuse the same measured NASA ozone map on concentric shells to convey
    // vertical depth. These are visualization shells, not measured vertical profiles.
    const ozoneVertexShader = `
      varying vec2 vUvMap;
      varying vec3 vNormalView;
      varying vec3 vViewPosition;
      void main(){
        vUvMap=uv;
        vec4 mvPosition=modelViewMatrix*vec4(position,1.0);
        vViewPosition=-mvPosition.xyz;
        vNormalView=normalize(normalMatrix*normal);
        gl_Position=projectionMatrix*mvPosition;
      }
    `;
    const ozoneFragmentShader = `
      uniform sampler2D uOzoneMap;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUvMap;
      varying vec3 vNormalView;
      varying vec3 vViewPosition;
      void main(){
        vec4 measurement=texture2D(uOzoneMap,vUvMap);
        if(measurement.a<.025) discard;
        float rim=pow(1.0-abs(dot(normalize(vNormalView),normalize(vViewPosition))),2.0);
        float shimmer=.965+.035*sin(uTime*.8+vUvMap.x*31.0+vUvMap.y*18.0);
        float alpha=measurement.a*uOpacity*(.74+.44*rim)*shimmer;
        gl_FragColor=vec4(measurement.rgb*(.92+.22*rim),clamp(alpha,0.,.8));
      }
    `;
    for(const [index, radius, opacity] of [[0,1.078,.31],[1,1.102,.23],[2,1.126,.14]]){
      const depthMesh=new THREE.Mesh(
        new THREE.SphereGeometry(radius,96,64),
        new THREE.ShaderMaterial({
          transparent:true,depthTest:true,depthWrite:false,
          side:THREE.FrontSide,toneMapped:false,
          uniforms:{uOzoneMap:{value:null},uTime:{value:0},uOpacity:{value:opacity}},
          vertexShader:ozoneVertexShader,
          fragmentShader:ozoneFragmentShader,
        })
      );
      depthMesh.name='Measured ozone volumetric depth '+index;
      depthMesh.renderOrder=19+index;
      depthMesh.visible=false;
      ozoneGroup.add(depthMesh);
    }
    const ozoneGlow=new THREE.Mesh(
      new THREE.SphereGeometry(1.135,96,64),
      new THREE.ShaderMaterial({
        transparent:true,blending:THREE.AdditiveBlending,depthTest:true,depthWrite:false,
        side:THREE.DoubleSide,toneMapped:false,uniforms:{uTime:{value:0}},
        vertexShader:"varying vec3 vN,vEye,vP;void main(){vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vEye=-mv.xyz;gl_Position=projectionMatrix*mv;}",
        fragmentShader:"uniform float uTime;varying vec3 vN,vEye,vP;void main(){float rim=pow(1.-abs(dot(normalize(vN),normalize(vEye))),1.65);float band=.5+.5*sin(vP.y*17.+vP.z*8.+uTime*.88);vec3 col=vec3(.1,.64,.61);gl_FragColor=vec4(col,.016+rim*.075+band*.018);}",
      })
    );
    ozoneGlow.name='Continuously visible ozone flow';ozoneGlow.renderOrder=16;
    ozoneGroup.add(ozoneGlow);
    const ozoneRim = new THREE.Mesh(
      new THREE.SphereGeometry(1.135, 80, 56),
      new THREE.ShaderMaterial({
        transparent: true, depthTest: true, depthWrite: false, side: THREE.BackSide, toneMapped: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: 'varying vec3 vNormalView; varying vec3 vViewPosition; void main(){vec4 mvPosition=modelViewMatrix*vec4(position,1.0);vViewPosition=-mvPosition.xyz;vNormalView=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mvPosition;}',
        fragmentShader: 'uniform float uTime; varying vec3 vNormalView; varying vec3 vViewPosition; void main(){float edge=pow(1.0-abs(dot(normalize(vNormalView),normalize(vViewPosition))),2.2);float sweep=.5+.5*sin(uTime*.7);vec3 c=mix(vec3(.10,.78,.95),vec3(.22,1.0,.68),sweep);gl_FragColor=vec4(c,edge*.085);}',
      })
    );
    ozoneRim.renderOrder = 15;
    ozoneGroup.add(ozoneRim);
    root.add(ozoneGroup);
    ozoneGroup.scale.setScalar(1);
    state.ozoneGroup = ozoneGroup;
    state.scene.add(root);
    state.ozoneGroup.visible = true;
    buildSolarWindParticles();
  }

  function buildSolarWindParticles(){
    if(!state.magnetosphere)return;
    const group=new THREE.Group();
    group.name='Animated NOAA-driven solar wind stream field';
    state.magnetosphere.add(group);
    const seeds=[];
    for(let lane=0;lane<14;lane++){
      const angle=lane/14*Math.PI*2+(lane%2)*.11;
      const spread=5.7+(lane%4)*.64;
      const station=[[37,spread+1],[28,spread],[19,spread+.4],[12,spread+1.7],
        [6,spread+4.1],[-3,spread+6.8],[-13,spread+8.4],[-27,spread+8.1],[-43,spread+7.9]];
      const points=station.map(([x,r],index)=>{
        const phi=angle+.036*index+Math.sin(lane+index)*.03;
        return new THREE.Vector3(x,Math.cos(phi)*r,Math.sin(phi)*r);
      });
      const curve=new THREE.CatmullRomCurve3(points,false,'centripetal',.45);
      state.streamCurves.push(curve);
      const material=new THREE.ShaderMaterial({
        transparent:true,blending:THREE.AdditiveBlending,depthTest:true,depthWrite:false,
        side:THREE.DoubleSide,toneMapped:false,
        uniforms:{uTime:{value:0},uSpeed:{value:1},uTint:{value:angle}},
        vertexShader:"varying float vAlong;varying vec3 vNormalView,vEye;void main(){vAlong=uv.x;vec4 mv=modelViewMatrix*vec4(position,1.0);vEye=-mv.xyz;vNormalView=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}",
        fragmentShader:"uniform float uTime,uSpeed,uTint;varying float vAlong;varying vec3 vNormalView,vEye;void main(){float t=uTime*uSpeed;float streak=pow(.5+.5*sin(vAlong*114.-t*5.+uTint*4.),9.);float wave=pow(.5+.5*sin(vAlong*43.-t*2.8+uTint*2.),5.);float ends=smoothstep(0.,.08,vAlong)*(1.-smoothstep(.87,1.,vAlong));float rim=pow(1.-abs(dot(normalize(vNormalView),normalize(vEye))),.9);vec3 color=mix(vec3(.06,.55,.99),vec3(.21,1.,.81),.5+.5*sin(uTint+vAlong*21.-t*.7));gl_FragColor=vec4(color,clamp(ends*(.1+.38*rim)*(.24+.9*streak+.3*wave),0.,.5));}"
      });
      const ribbon=new THREE.Mesh(new THREE.TubeGeometry(curve,140,.14+(lane%3)*.025,5,false),material);
      ribbon.name='Animated moving solar wind plasma ribbon';
      ribbon.renderOrder=15;
      group.add(ribbon);
      state.windRibbons.push(material);
      for(let j=0;j<11;j++)seeds.push({lane,phase:(j/11+lane*.061)%1});
    }
    state.windSeeds=seeds;
    const positions=new Float32Array(seeds.length*3);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
    const material=new THREE.ShaderMaterial({
      transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,
      toneMapped:false,
      vertexShader:"varying float vFade;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(28.0/max(1.0,-mv.z),1.25,5.2);vFade=clamp(.85+mv.z*.015,.35,1.);}",
      fragmentShader:"varying float vFade;void main(){vec2 p=gl_PointCoord-.5;float glow=exp(-dot(p,p)*18.);gl_FragColor=vec4(.32,.94,1.,glow*vFade*.78);}"
    });
    const cloud=new THREE.Points(geometry,material);
    cloud.name='Animated solar-wind stream particle';
    cloud.frustumCulled=false;cloud.renderOrder=16;group.add(cloud);
    state.windVisual=cloud;
    animateSolarWind(0);
  }

  function animateSolarWind(time){
    const speed=clamp(state.feed.speed/400,.45,1.95);
    for(const material of state.windRibbons){
      material.uniforms.uTime.value=time;
      material.uniforms.uSpeed.value=speed;
    }
    const attr=state.windVisual?.geometry.getAttribute('position');
    if(!attr)return;
    for(let i=0;i<state.windSeeds.length;i++){
      const seed=state.windSeeds[i],curve=state.streamCurves[seed.lane];
      const phase=(seed.phase+time*(.04+.058*speed))%1;
      const point=curve.getPoint(phase);
      attr.setXYZ(i,point.x,point.y+Math.sin(time*2+i)*.15,point.z+Math.cos(time*2+i)*.15);
    }
    attr.needsUpdate=true;
  }

  function renderOzoneImage(time) {
    const url = new URL(OZONE_WMS);
    url.search = new URLSearchParams({
      service: 'WMS', request: 'GetMap', version: '1.1.1',
      layers: 'OMI_Ozone_DOAS_Total_Column', styles: '', format: 'image/png',
      transparent: 'true', width: '1024', height: '512', srs: 'EPSG:4326',
      bbox: '-180,-90,180,90', time,
    }).toString();
    return url.toString();
  }


  // NASA GIBS OMI Total Column legend is in Dobson Units (DU).
  // Source palette: https://gibs.earthdata.nasa.gov/colormaps/v1.3/OMI_Ozone_DOAS_Total_Column.xml
  // <220 DU is NASA's historical Antarctic ozone-hole threshold. Yellow
  // 220-275 DU and green >=275 DU are illustrative column-value bands,
  // NOT universal health/safety classifications or measured vertical profiles.
  const OZONE_SOURCE_STOPS = [
    [99.9,94,79,162],[100,50,136,189],[150,93,184,169],[200,147,211,164],
    [220,171,221,164],[250,197,232,158],[275,225,243,153],[300,238,238,147],
    [325,247,229,142],[350,253,215,131],[375,253,194,114],[400,253,174,97],
    [425,249,149,85],[450,245,119,72],[475,237,99,69],[497.5,224,80,74],
    [500,158,1,66]
  ];

  function colorizeMeasuredOzone(sourceTexture){
    const image=sourceTexture?.image;
    if(!image?.width||!image?.height)throw Error('NASA ozone image is empty');
    const canvas=document.createElement('canvas');
    canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw Error('Ozone pixel conversion unavailable');
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    const source=pixels.data,w=canvas.width,h=canvas.height;
    const values=new Float32Array(w*h);
    values.fill(NaN);
    const rowHasData=new Uint8Array(h);
    const palette=[];
    for(let du=100;du<=497.5;du+=2.5){
      let upper=OZONE_SOURCE_STOPS.findIndex(entry=>entry[0]>=du);
      if(upper<=0)upper=1;
      const hi=OZONE_SOURCE_STOPS[upper],lo=OZONE_SOURCE_STOPS[upper-1];
      const t=clamp((du-lo[0])/Math.max(.001,hi[0]-lo[0]),0,1);
      palette.push([lo[1]+(hi[1]-lo[1])*t,lo[2]+(hi[2]-lo[2])*t,lo[3]+(hi[3]-lo[3])*t,du]);
    }
    palette.push([94,79,162,90],[158,1,66,500]);
    const cache=new Map();
    let observed=0,estimated=0;
    for(let p=0;p<w*h;p++){
      const i=p*4;
      if(source[i+3]<12||(source[i]>247&&source[i+1]<15&&source[i+2]>247))continue;
      const key=(source[i]<<16)|(source[i+1]<<8)|source[i+2];
      let du=cache.get(key);
      if(du===undefined){
        let best=Infinity;du=300;
        for(const entry of palette){
          const dist=(source[i]-entry[0])**2+(source[i+1]-entry[1])**2+(source[i+2]-entry[2])**2;
          if(dist<best){best=dist;du=entry[3]}
        }
        cache.set(key,du);
      }
      values[p]=du;
      rowHasData[Math.floor(p/w)]=1;
      observed++;
    }
    if(observed<100)throw Error('NASA ozone raster has no usable readings');
    // Interpolate gaps between real NASA swath readings for a continuous
    // visual shell. These filled texels are estimates, not observations.
    const hits=[];
    for(let y=0;y<h;y++){
      hits.length=0;const start=y*w;
      for(let x=0;x<w;x++)if(Number.isFinite(values[start+x]))hits.push(x);
      if(!hits.length)continue;
      if(hits.length===1){
        const du=values[start+hits[0]];
        for(let x=0;x<w;x++)if(!Number.isFinite(values[start+x])){values[start+x]=du;estimated++}
        continue;
      }
      for(let k=0;k<hits.length;k++){
        const a=hits[k],b=k===hits.length-1?hits[0]+w:hits[k+1],span=b-a;
        const left=values[start+a],right=values[start+(b%w)];
        for(let dx=1;dx<span;dx++){
          values[start+(a+dx)%w]=left+(right-left)*dx/span;
          estimated++;
        }
      }
    }
    const rows=[];
    for(let y=0;y<h;y++)if(rowHasData[y])rows.push(y);
    for(let y=0;y<h;y++){
      if(rowHasData[y])continue;
      let index=0;
      while(index<rows.length&&rows[index]<y)index++;
      const lower=rows[Math.max(0,index-1)],upper=rows[Math.min(rows.length-1,index)];
      const t=lower===upper?0:(y-lower)/(upper-lower);
      for(let x=0;x<w;x++){
        values[y*w+x]=values[lower*w+x]*(1-t)+values[upper*w+x]*t;
        estimated++;
      }
    }
    const red=[239,51,63],yellow=[255,207,40],green=[47,224,101];
    for(let p=0;p<w*h;p++){
      const du=values[p],i=p*4;
      let color=du<220?red:du<275?yellow:green;
      if(du>=216&&du<224){
        const t=(du-216)/8;
        color=red.map((v,c)=>v+(yellow[c]-v)*t);
      }else if(du>=271&&du<279){
        const t=(du-271)/8;
        color=yellow.map((v,c)=>v+(green[c]-v)*t);
      }
      source[i]=color[0];source[i+1]=color[1];source[i+2]=color[2];source[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.wrapS=THREE.RepeatWrapping;
    texture.anisotropy=4;texture.needsUpdate=true;
    texture.userData.ozoneEstimatedPixelCount=estimated;
    texture.userData.ozoneObservedPixelCount=observed;
    return texture;
  }

  async function loadOzoneTexture() {
    if (!state.open || !state.ozoneGroup || state.ozoneTexture) return;
    state.ozoneStatus = 'Loading NASA OMI total-column ozone…';
    updateReadout();
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const base = new Date();
    base.setUTCHours(0, 0, 0, 0);
    let lastError = null;
    for (let day = 1; day <= 7 && state.open; day += 1) {
      const date = new Date(base.getTime() - day * 86400000).toISOString().slice(0, 10);
      try {
        const texture = await new Promise((resolve, reject) => loader.load(renderOzoneImage(date), resolve, undefined, reject));
        if (!state.open) { texture.dispose(); return; }
        let colored;
        try{
          colored=colorizeMeasuredOzone(texture);
        }catch(error){
          texture.dispose();
          throw error;
        }
        texture.dispose();
        if(!state.open||!state.ozoneGroup){colored.dispose();return}
        state.ozoneTexture=colored;
        const mesh=state.ozoneGroup.children.find(child=>child.isMesh&&child.name.startsWith('NASA OMI'));
        if(mesh?.material){
          mesh.material.map=colored;
          mesh.material.needsUpdate=true;
          mesh.visible=true;
        }
        for(const depthMesh of state.ozoneGroup.children.filter(child=>child.name.startsWith('Measured ozone volumetric depth'))){
          depthMesh.material.uniforms.uOzoneMap.value=colored;
          depthMesh.visible=true;
        }
        state.ozoneStatus='NASA OMI · '+date+' UTC · green ≥275 DU / yellow 220–274 / red <220 · gaps filled visually';
        updateReadout();
        return;
      } catch (error) { lastError = error; }
    }
    state.ozoneStatus = lastError ? 'NASA OMI raster unavailable · try again later' : 'NASA OMI raster unavailable';
    setStatus(state.ozoneStatus, 'error');
    updateReadout();
  }

  function latestRecord(payload) {
    if (!Array.isArray(payload)) return null;
    const rows = payload.filter(row => row && typeof row === 'object' && row.time_tag);
    const active = rows.filter(row => row.active === true || row.active === 'true' || row.active === 1 || row.active === '1');
    const candidates = active.length ? active : rows;
    candidates.sort((a, b) => String(b.time_tag).localeCompare(String(a.time_tag)));
    return candidates[0] || null;
  }

  function numericField(row, keys) {
    for (const key of keys) {
      const value = number(row?.[key]);
      if (value !== null) return value;
    }
    return null;
  }

  async function getJson(url) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { cache: 'no-store', mode: 'cors', credentials: 'omit', headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } finally { window.clearTimeout(timeout); }
  }

  async function refreshSolarWind() {
    if (!state.open) return;
    try {
      const [windData, magData] = await Promise.all([getJson(WIND_URL), getJson(MAG_URL)]);
      const wind = latestRecord(windData);
      const mag = latestRecord(magData);
      const density = numericField(wind, ['proton_density', 'density', 'protonDensity']);
      const speed = numericField(wind, ['proton_speed', 'speed', 'protonSpeed']);
      const bz = numericField(mag, ['bz_gsm', 'bz', 'Bz_GSM']);
      if (density === null || speed === null) throw new Error('No current active solar-wind sample');
      const dynamicPressure = Math.max(0.05, 1.6726219e-6 * density * speed * speed);
      const z = bz ?? 0;
      const noseRadius = clamp((10.22 + 1.29 * Math.tanh(0.184 * (z + 8.14))) * Math.pow(dynamicPressure, -1 / 6.6), 6, 14);
      const timestamp = String(wind?.time_tag || '');
      const ageMinutes = timestamp ? (Date.now() - Date.parse(timestamp + (timestamp.endsWith('Z') ? '' : 'Z'))) / 60000 : Infinity;
      const live = Number.isFinite(ageMinutes) && ageMinutes >= -2 && ageMinutes < 45;
      state.feed = {
        density, speed, bz: z, pressure: dynamicPressure, r0: noseRadius,
        live, checkedAt: Date.now(), source: live ? (wind?.active ? 'NOAA active L1 feed' : 'NOAA recent L1 feed') : 'NOAA feed stale',
      };
      state.targetR0 = noseRadius;
      setStatus(live ? 'NOAA solar-wind data connected · shell response updating' : 'NOAA data is delayed · showing the last sample', live ? 'ok' : 'info');
    } catch (error) {
      state.feed.live = false;
      state.feed.checkedAt = Date.now();
      state.feed.source = 'nominal model · NOAA unavailable';
      setStatus('NOAA solar-wind feed unavailable · using a gently moving nominal model', 'info');
    }
    updateReadout();
  }

  function updateReadout(){
    const r=$('#'+ROOT_ID+' [data-shield-readout]'),n=$('#'+ROOT_ID+' [data-shield-note]');
    if(!r||!n)return;
    const f=state.feed;
    r.innerHTML='<strong>'+(f.live?'LIVE NOAA SOLAR WIND':'SOLAR WIND MODEL')+'</strong> · '+
      f.density.toFixed(1)+' cm⁻³ · '+Math.round(f.speed)+' km/s · '+
      f.pressure.toFixed(2)+' nPa · nose ~'+state.smoothR0.toFixed(1)+' R⊕'+
      '<span style="display:block;margin-top:5px"><strong>OZONE ACTIVE</strong> · '+state.ozoneStatus+'</span>';
    n.textContent='Both shields remain on. NOAA-speed-driven solar wind flows around the magnetic field. NASA ozone gaps are interpolated estimates, not additional observations. Ozone colors show total-column ranges; 3D layer depth is exaggerated.';
  }

  function setMode(){
    state.mode='both';
    if(state.magnetosphere)state.magnetosphere.visible=true;
    if(state.ozoneGroup)state.ozoneGroup.visible=true;
    updateReadout();
  }

  function onHudClick(){ /* No inner controls or layer toggles. */ }

  function animate(now){
    state.raf=0;if(!state.open)return;
    const delta=state.lastFrame?clamp((now-state.lastFrame)/1000,0,.08):.016;
    state.lastFrame=now;
    if(!document.hidden&&state.root&&state.renderer&&state.camera&&state.earthMesh){
      state.time+=delta;
      state.smoothR0=THREE.MathUtils.damp(state.smoothR0,state.targetR0,.65,delta);
      state.earthMesh.rotation.y+=delta*.014;
      state.magnetosphere.scale.setScalar(.23*(state.smoothR0/10)*(1+Math.sin(state.time*.7)*.015));
      state.ozoneGroup.scale.setScalar(1);
      state.ozoneGroup.rotation.y=state.earthMesh.rotation.y;
      state.root.rotation.y=Math.sin(state.time*.09)*.12;
      const stress=clamp((12.5-state.smoothR0)/6.5,0,1);
      for(const plasma of state.plasmaShells){
        plasma.material.uniforms.uTime.value=state.time;
        plasma.material.uniforms.uStress.value=stress;
      }
      const field=state.magnetosphere.children.find(x=>x.name==='Modeled geomagnetic field lines');
      for(const strand of field?.children||[])strand.material.opacity=.24+.10*Math.sin(state.time*1.8+strand.userData.phase);
      animateSolarWind(state.time);
      for(const obj of state.ozoneGroup.children)if(obj.material?.uniforms?.uTime)obj.material.uniforms.uTime.value=state.time;
      const d=state.orbitDistance,y=state.orbitYaw,p=state.orbitPitch;
      state.camera.position.set(Math.sin(y)*Math.cos(p)*d,Math.sin(p)*d,Math.cos(y)*Math.cos(p)*d);
      state.camera.lookAt(0,0,0);
      state.renderer.render(state.scene,state.camera);
      if(Math.floor(state.time*2)!==Math.floor((state.time-delta)*2))updateReadout();
    }
    state.raf=requestAnimationFrame(animate);
  }

  async function openShield(){
    if(state.open)return;
    injectStyle();ensureHud();
    const root=$('#'+ROOT_ID);
    state.open=true;state.paused=false;state.mode='both';state.time=0;state.lastFrame=0;
    state.orbitYaw=0;state.orbitPitch=.1;state.orbitDistance=7;
    root.hidden=false;$('#'+BUTTON_ID)?.setAttribute('aria-pressed','true');
    hideDock(true);setStatus('Opening Earth-only 3D shields…');
    try{
      if(!history.state?.bpEarthShield){
        history.pushState({...((history.state&&typeof history.state==='object')?history.state:{}),bpEarthShield:true},'',location.href);
        state.historyEntry=true;
      }
      await openEarthOnlyScene();
      if(!state.open)return;
      window.clearInterval(state.feedTimer);
      state.feedTimer=window.setInterval(()=>{if(state.open&&!document.hidden)void refreshSolarWind()},300000);
      setStatus('Magnetosphere + ozone active · updating','ok');startAnimation();
    }catch(error){setStatus(String(error?.message||'Earth Shield unavailable'),'error')}
  }

  function startAnimation() {
    if (!state.raf && state.open) state.raf = requestAnimationFrame(animate);
  }

  function disposeLayer(){
    if(state.root){
      state.scene?.remove(state.root);
      state.root.traverse(o=>{o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose?.()});
    }
    if(state.earthMesh){state.scene?.remove(state.earthMesh);state.earthMesh.geometry?.dispose?.();state.earthMesh.material?.dispose?.()}
    state.renderer?.dispose?.();state.renderer?.domElement?.remove?.();
    state.earthTexture?.dispose?.();state.ozoneTexture?.dispose?.();
    state.renderer=null;state.earthTexture=null;state.ozoneTexture=null;state.earthMesh=null;
    state.scene=null;state.camera=null;state.root=null;state.magnetosphere=null;state.ozoneGroup=null;
    state.plasmaShells=[];state.streamCurves=[];state.streamParticles=[];state.windVisual=null;state.windSeeds=[];state.windRibbons=[];state.pointers.clear();
    state.ozoneStatus='NASA daily ozone layer loading…';
  }

  function closeShield(fromHistory=false){
    if(!state.open)return;
    state.open=false;state.paused=false;
    const root=$('#'+ROOT_ID);if(root)root.hidden=true;
    $('#'+BUTTON_ID)?.setAttribute('aria-pressed','false');
    if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;
    window.clearInterval(state.feedTimer);state.feedTimer=0;
    disposeLayer();hideDock(false);hideSpaceCloseControl(false);
    $('#'+BUTTON_ID)?.focus();
    if(state.historyEntry&&!fromHistory&&history.state?.bpEarthShield)history.back();
    state.historyEntry=false;
  }

  function boot(){
    injectStyle();installButton();
    const observer=new MutationObserver(()=>installButton());
    observer.observe(document.documentElement,{childList:true,subtree:true});
    window.setTimeout(()=>observer.disconnect(),120000);
    window.setInterval(installButton,1400);
    window.addEventListener('resize',resizeEarthOnly,{passive:true});
    window.addEventListener('popstate',()=>{if(state.open)closeShield(true)});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.open)closeShield()});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.raf){cancelAnimationFrame(state.raf);state.raf=0}else if(!document.hidden)startAnimation()});
  }

  window.__BP_EARTH_PROTECTION_V1__ = { version: VERSION, open: openShield, close: closeShield, state };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
