/* BridgePoint Underground Transit v1.
 * Persistent station markers with a local, procedural public-passenger schematic viewer.
 * Models are illustrative and intentionally do not reproduce restricted engineering plans.
 */
const VERSION = 1;
const MAP_STATES = new WeakMap();
const SOURCE_ID = 'bp-underground-transit-source-v1';
const HALO_ID = 'bp-underground-transit-halo-v1';
const MARKER_ID = 'bp-underground-transit-markers-v1';
const LABEL_ID = 'bp-underground-transit-labels-v1';
const CONTROL_ID = 'bp-underground-transit-control-v1';
const TOGGLE_ID = 'bp-underground-transit-toggle-v1';
const COUNT_ID = 'bp-underground-transit-count-v1';
const STATUS_ID = 'bp-underground-transit-status-v1';
const VIEWER_ID = 'bp-underground-transit-viewer-v1';
const THREE_URL = '/vendor/three.module.js?v=169-local';

export const UNDERGROUND_TRANSIT_STATIONS_V1 = [
  {
    id: 'london-bank-monument', name: 'Bank / Monument', city: 'London', country: 'United Kingdom',
    network: 'London Underground · DLR', coordinates: [-0.0888, 51.5133], levels: ['Street access', 'Passenger concourses', 'Platforms'], platformGroups: 4,
    lines: [{name: 'Central', color: '#dc241f'}, {name: 'Northern', color: '#111820'}, {name: 'Waterloo & City', color: '#95cdba'}, {name: 'District / Circle at Monument', color: '#7aaf42'}, {name: 'DLR', color: '#00afad'}],
    description: 'Bank and Monument form a connected City interchange. This BridgePoint view shows a simplified passenger-level arrangement for the linked station complex.',
    sourceLabel: 'TfL passenger Tube map', sourceUrl: 'https://tfl.gov.uk/maps/track/tube'
  },
  {
    id: 'london-kings-cross-st-pancras', name: 'King’s Cross St Pancras', city: 'London', country: 'United Kingdom',
    network: 'London Underground · National Rail', coordinates: [-0.1236, 51.5308], levels: ['Street access', 'Passenger concourses', 'Platforms'], platformGroups: 4,
    lines: [{name: 'Circle', color: '#ffce00'}, {name: 'Hammersmith & City', color: '#f491a8'}, {name: 'Metropolitan', color: '#9b0056'}, {name: 'Northern', color: '#111820'}, {name: 'Piccadilly', color: '#0019a8'}, {name: 'Victoria', color: '#00a0e2'}],
    description: 'A major London interchange between six Underground lines and the King’s Cross and St Pancras rail terminals. The geometry is a public-facing schematic.',
    sourceLabel: 'TfL passenger Tube map', sourceUrl: 'https://tfl.gov.uk/maps/track/tube'
  },
  {
    id: 'london-tottenham-court-road', name: 'Tottenham Court Road', city: 'London', country: 'United Kingdom',
    network: 'London Underground · Elizabeth line', coordinates: [-0.1308, 51.5165], levels: ['Street access', 'Passenger concourses', 'Platforms'], platformGroups: 3,
    lines: [{name: 'Central', color: '#dc241f'}, {name: 'Northern', color: '#111820'}, {name: 'Elizabeth line', color: '#6950a1'}],
    description: 'A central London interchange linking the Central and Northern lines with the Elizabeth line. The viewer uses relative levels only.',
    sourceLabel: 'TfL passenger Tube and rail maps', sourceUrl: 'https://tfl.gov.uk/maps/track/'
  },
  {
    id: 'london-paddington', name: 'Paddington', city: 'London', country: 'United Kingdom',
    network: 'London Underground · Elizabeth line · National Rail', coordinates: [-0.1764, 51.5154], levels: ['Street access', 'Passenger concourses', 'Platforms'], platformGroups: 3,
    lines: [{name: 'Bakerloo', color: '#b36305'}, {name: 'Circle / Hammersmith & City', color: '#ffce00'}, {name: 'District', color: '#007d32'}, {name: 'Elizabeth line', color: '#6950a1'}],
    description: 'A large rail and Underground hub with Elizabeth line services. This schematic separates public access, concourse, and platform layers without claiming exact station dimensions.',
    sourceLabel: 'TfL passenger Tube and rail maps', sourceUrl: 'https://tfl.gov.uk/maps/track/'
  },
  {
    id: 'london-canary-wharf', name: 'Canary Wharf', city: 'London', country: 'United Kingdom',
    network: 'Elizabeth line · Jubilee line · DLR', coordinates: [-0.0208, 51.5035], levels: ['Street access', 'Passenger concourses', 'Platforms'], platformGroups: 3,
    lines: [{name: 'Jubilee', color: '#a1a5a7'}, {name: 'Elizabeth line', color: '#6950a1'}, {name: 'DLR', color: '#00afad'}],
    description: 'The Canary Wharf transport complex brings together the Jubilee line, Elizabeth line, and nearby DLR stations. The model illustrates public interchange levels only.',
    sourceLabel: 'TfL passenger Tube and rail maps', sourceUrl: 'https://tfl.gov.uk/maps/track/'
  },
  {
    id: 'tokyo-shinjuku', name: 'Shinjuku Station', city: 'Tokyo', country: 'Japan',
    network: 'Tokyo Metro · Toei · JR East · private rail', coordinates: [139.7006, 35.6909], levels: ['Street and rail halls', 'Passenger concourses', 'Subway platforms'], platformGroups: 4,
    lines: [{name: 'Tokyo Metro Marunouchi', color: '#f62e36'}, {name: 'Toei Shinjuku', color: '#6cbb5a'}, {name: 'Toei Oedo', color: '#b6007a'}, {name: 'JR East', color: '#80c341'}, {name: 'Odakyu / Keio', color: '#1686b7'}],
    description: 'Shinjuku is a multi-operator station complex. This viewer groups public passenger levels into a schematic; platform and concourse geometry is not survey-controlled.',
    sourceLabel: 'Tokyo Metro Shinjuku station maps', sourceUrl: 'https://www.tokyometro.jp/lang_en/station/shinjuku/index.html'
  },
  {
    id: 'tokyo-shibuya', name: 'Shibuya Station', city: 'Tokyo', country: 'Japan',
    network: 'Tokyo Metro · Toei · JR East · Tokyu · Keio', coordinates: [139.7018, 35.6580], levels: ['Street and rail halls', 'Passenger concourses', 'Subway platforms'], platformGroups: 4,
    lines: [{name: 'Ginza', color: '#f39700'}, {name: 'Hanzomon', color: '#8f76d6'}, {name: 'Fukutoshin', color: '#9caeb7'}, {name: 'JR East', color: '#80c341'}, {name: 'Tokyu / Keio', color: '#d84376'}],
    description: 'Shibuya’s station complex includes Tokyo Metro, JR East, Tokyu, and Keio services. The 3D view is an illustrative public-passenger schematic.',
    sourceLabel: 'Tokyo Metro Shibuya station maps', sourceUrl: 'https://www.tokyometro.jp/lang_en/station/shibuya/index.html'
  },
  {
    id: 'tokyo-station', name: 'Tokyo Station', city: 'Tokyo', country: 'Japan',
    network: 'Tokyo Metro · JR East · Shinkansen', coordinates: [139.7671, 35.6812], levels: ['Street and rail halls', 'Passenger concourses', 'Subway platforms'], platformGroups: 3,
    lines: [{name: 'Tokyo Metro Marunouchi', color: '#f62e36'}, {name: 'JR Yamanote', color: '#80c341'}, {name: 'JR Chuo', color: '#f15a22'}, {name: 'Tokaido Shinkansen', color: '#0072bc'}, {name: 'JR East Shinkansen', color: '#b31d2b'}],
    description: 'Tokyo Station combines the Marunouchi subway station with JR East and Shinkansen services. The model separates broad public passenger levels only.',
    sourceLabel: 'Tokyo Metro Tokyo station maps', sourceUrl: 'https://www.tokyometro.jp/lang_en/station/tokyo/index.html'
  }
];

function safe(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function makeIcon() {
  const canvas = document.createElement('canvas'); canvas.width = 88; canvas.height = 88;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(27, 20, 3, 44, 44, 44);
  glow.addColorStop(0, '#9cf4ff'); glow.addColorStop(.36, '#22a8ce'); glow.addColorStop(1, '#123656');
  ctx.fillStyle = 'rgba(3,11,20,.97)'; ctx.beginPath(); ctx.arc(44, 44, 41, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#83edff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(44, 40, 28, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#061520'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(30, 30); ctx.lineTo(30, 49); ctx.moveTo(44, 30); ctx.lineTo(44, 49); ctx.moveTo(58, 30); ctx.lineTo(58, 49); ctx.stroke();
  ctx.strokeStyle = '#e8fdff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(28, 56); ctx.lineTo(60, 56); ctx.moveTo(34, 62); ctx.lineTo(54, 62); ctx.stroke();
  return ctx.getImageData(0, 0, 88, 88);
}
function buildFeatures() {
  return UNDERGROUND_TRANSIT_STATIONS_V1.map(station => ({
    type: 'Feature', id: station.id,
    geometry: {type: 'Point', coordinates: station.coordinates},
    properties: {stationId: station.id, name: station.name, iconImage: 'bp-underground-transit-icon-v1'}
  }));
}
function setStatus(state, message) {
  state.status = String(message || '');
  const el = document.getElementById(STATUS_ID); if (el) el.textContent = state.status;
}
function refreshUi(state) {
  const count = document.getElementById(COUNT_ID);
  if (count) count.textContent = UNDERGROUND_TRANSIT_STATIONS_V1.length + ' public station hubs · London and Tokyo';
  const status = document.getElementById(STATUS_ID); if (status) status.textContent = state.status;
  const button = document.getElementById(TOGGLE_ID);
  if (button) { button.setAttribute('aria-pressed', String(state.enabled)); button.classList.toggle('is-active', state.enabled); }
}
function setVisibility(state, visible) {
  const value = visible ? 'visible' : 'none';
  for (const id of [HALO_ID, MARKER_ID, LABEL_ID]) {
    if (state.map.getLayer(id) && state.map.getLayoutProperty(id, 'visibility') !== value) state.map.setLayoutProperty(id, 'visibility', value);
  }
}
function installLayers(state) {
  const map = state.map;
  if (!map?.getStyle?.() || (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded())) return false;
  try {
    if (!map.hasImage?.('bp-underground-transit-icon-v1')) map.addImage('bp-underground-transit-icon-v1', makeIcon(), {pixelRatio: 2});
    if (!map.getSource(SOURCE_ID)) map.addSource(SOURCE_ID, {
      type: 'geojson', data: {type: 'FeatureCollection', features: buildFeatures()}, buffer: 64, maxzoom: 14,
      attribution: 'BridgePoint public passenger station hubs · operator maps linked in each station card'
    });
    const add = (id, layer) => { if (!map.getLayer(id)) map.addLayer(layer); };
    add(HALO_ID, {id: HALO_ID, type: 'circle', source: SOURCE_ID, minzoom: 0, maxzoom: 24,
      layout: {visibility: state.enabled ? 'visible' : 'none'},
      paint: {'circle-radius': ['interpolate',['linear'],['zoom'],0,3,5,5,10,7,16,9,22,10], 'circle-color': '#56dff2', 'circle-opacity': .27, 'circle-blur': .5}});
    add(MARKER_ID, {id: MARKER_ID, type: 'symbol', source: SOURCE_ID, minzoom: 0, maxzoom: 24,
      layout: {visibility: state.enabled ? 'visible' : 'none', 'icon-image': ['get','iconImage'],
        'icon-size': ['interpolate',['linear'],['zoom'],0,.34,3,.45,7,.58,12,.72,18,.86,23,.95],
        'icon-pitch-alignment': 'viewport', 'icon-rotation-alignment': 'viewport', 'icon-anchor': 'bottom',
        'icon-allow-overlap': true, 'icon-ignore-placement': true, 'symbol-sort-key': 230}});
    add(LABEL_ID, {id: LABEL_ID, type: 'symbol', source: SOURCE_ID, minzoom: 7, maxzoom: 24,
      layout: {visibility: state.enabled ? 'visible' : 'none', 'text-field': ['get','name'],
        'text-size': ['interpolate',['linear'],['zoom'],7,9,12,11,18,13], 'text-offset': [0,1.1], 'text-anchor': 'top',
        'text-allow-overlap': false, 'text-ignore-placement': false},
      paint: {'text-color': '#e9fcff', 'text-halo-color': 'rgba(2,10,18,.96)', 'text-halo-width': 1.6}});
    setVisibility(state, state.enabled); return true;
  } catch (error) {
    state.lastError = String(error?.message || error);
    console.warn('BridgePoint underground transit layers', error); return false;
  }
}
function schedulePersistence(state) {
  if (!state.enabled || state.dead || state.frame) return;
  const request = window.requestAnimationFrame || (fn => setTimeout(fn, 16));
  state.frame = request(() => {
    state.frame = 0; if (!state.enabled || state.dead) return;
    try {
      if (typeof state.map.isStyleLoaded === 'function' && !state.map.isStyleLoaded()) return;
      if (!installLayers(state)) return;
      setVisibility(state, true);
    } catch (error) { state.lastError = String(error?.message || error); }
  });
}
function lineChips(station) {
  return station.lines.map(line => {
    const color = /^#[0-9a-f]{6}$/i.test(line.color) ? line.color : '#44d6e8';
    return '<span class="bp-underground-transit-line-v1"><i style="background:' + color + '"></i>' + safe(line.name) + '</span>';
  }).join('');
}
function popupHtml(station) {
  const levels = station.levels.map(level => '<li>' + safe(level) + '</li>').join('');
  return '<article class="bp-underground-transit-card-v1">' +
    '<p class="bp-underground-transit-kicker-v1">' + safe(station.network) + '</p>' +
    '<h3>' + safe(station.name) + '</h3>' +
    '<p class="bp-underground-transit-place-v1">' + safe(station.city) + ' · ' + safe(station.country) + '</p>' +
    '<div class="bp-underground-transit-view-v1"><canvas id="' + VIEWER_ID + '" aria-label="Interactive 3D passenger-level station schematic"></canvas><span>Drag to rotate · scroll or pinch to zoom</span></div>' +
    '<p class="bp-underground-transit-description-v1">' + safe(station.description) + '</p>' +
    '<div class="bp-underground-transit-lines-v1">' + lineChips(station) + '</div>' +
    '<div class="bp-underground-transit-levels-v1"><b>Viewer layers</b><ul>' + levels + '</ul></div>' +
    '<p class="bp-underground-transit-note-v1">BridgePoint procedural passenger schematic. Relative levels are illustrative, not to scale; this is not an engineering survey or exact tunnel layout.</p>' +
    '<a class="bp-underground-transit-source-v1" href="' + safe(station.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Open ' + safe(station.sourceLabel) + '</a>' +
    '</article>';
}
function makeTextSprite(THREE, group, text, color, position) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = 'rgba(3,13,24,.94)'; ctx.fillRect(0,0,512,128);
  ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.strokeRect(4,4,504,120);
  ctx.fillStyle = '#f2fcff'; ctx.font = '700 34px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(text).slice(0,26),256,64,470);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({map:texture, transparent:true, depthTest:false});
  const sprite = new THREE.Sprite(material); sprite.position.set(position[0],position[1],position[2]); sprite.scale.set(3.9,.98,1); group.add(sprite);
}
function addBox(THREE, group, size, position, color, opacity=1) {
  const material = new THREE.MeshStandardMaterial({color, roughness:.78, metalness:.12, transparent:opacity<1, opacity});
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0],size[1],size[2]),material);
  mesh.position.set(position[0],position[1],position[2]); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function addStationSchematic(THREE, group, station) {
  const concrete = 0x526b7b, glass = 0x3b9ab0, levelStep = 1.18, top = 1.65;
  addBox(THREE,group,[6.8,.32,4.6],[0,top,0],0x203948,.94);
  addBox(THREE,group,[1.45,.76,1.15],[-2.1,top+.52,-.1],0x62d7eb,.92);
  const levels = station.levels.length;
  for (let i=0;i<levels;i++) {
    const y = top - (i+1)*levelStep;
    addBox(THREE,group,[6.5,.16,4.6],[0,y,0],concrete,.88);
    addBox(THREE,group,[4.55,.12,.72],[0,y+.18,-.45],glass,.83);
    addBox(THREE,group,[3.8,.12,.56],[0,y+.18,.78],0x344d5c,.96);
    makeTextSprite(THREE,group,station.levels[i],'#73e4f3',[-3.8,y+.68,0]);
  }
  const platformY = top - levels*levelStep + .28;
  const rows = Math.max(2,Math.min(4,Number(station.platformGroups)||2));
  const lineCount = Math.max(1,station.lines.length);
  for (let i=0;i<rows;i++) {
    const x = (i-(rows-1)/2)*1.62;
    const color = new THREE.Color(station.lines[i%lineCount].color);
    addBox(THREE,group,[1.25,.16,3.15],[x,platformY,0],0x617a87,.96);
    addBox(THREE,group,[1.3,.055,.17],[x,platformY+.105,-1.15],color,.98);
    addBox(THREE,group,[.10,.035,2.6],[x-.24,platformY-.1,0],0x202d36,.96);
    addBox(THREE,group,[.10,.035,2.6],[x+.24,platformY-.1,0],0x202d36,.96);
  }
  // Generic public access links show vertical connections without mapping real shafts or cross-passages.
  for (let i=1;i<levels;i++) {
    const upperY = top - i*levelStep + .35, lowerY = upperY-levelStep+.22;
    const stair = addBox(THREE,group,[2.15,.16,.42],[-1.72,(upperY+lowerY)/2,.15],0xe1f6f9,.92);
    stair.rotation.z = -.48;
    for (let n=0;n<7;n++) addBox(THREE,group,[.14,.045,.52],[-2.55+n*.25,upperY-.16-n*.12,.15],0x94c2ca,.94);
  }
  const shaftHeight = Math.max(1.2,levels*levelStep);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(.38,shaftHeight,.38),new THREE.MeshStandardMaterial({color:0xa8edf3,transparent:true,opacity:.3,metalness:.45}));
  shaft.position.set(2.55,top-shaftHeight/2,1.48);group.add(shaft);
  makeTextSprite(THREE,group,station.city+' · '+station.name,'#62ddf0',[0,top+1.35,0]);
}
async function mountViewer(state, root, station) {
  const canvas = root.querySelector('#'+VIEWER_ID); if (!canvas) return;
  try {
    const THREE = await import(THREE_URL); if (state.dead || !canvas.isConnected) return;
    const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5)); renderer.setClearColor(0x071522,1);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x071522);
    const camera = new THREE.PerspectiveCamera(42,1,.1,100); camera.position.set(10,8,13); camera.lookAt(0,-1.2,0);
    scene.add(new THREE.HemisphereLight(0xc6f7ff,0x172330,2.1));
    const key = new THREE.DirectionalLight(0xffffff,2.4); key.position.set(7,10,8); scene.add(key);
    const fill = new THREE.PointLight(0x31c9ed,38,24); fill.position.set(-6,4,3); scene.add(fill);
    const group = new THREE.Group(); scene.add(group); addStationSchematic(THREE,group,station);
    const resize = () => { if (!canvas.isConnected) return; const r=canvas.getBoundingClientRect(); const w=Math.max(220,r.width),h=Math.max(170,r.height); renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix(); };
    const observer = typeof ResizeObserver==='function' ? new ResizeObserver(resize) : null; observer?.observe(canvas); resize();
    let dragging=false,lastX=0,lastY=0,distance=18,frame=0,disposed=false;
    const down=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId);};
    const move=e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;group.rotation.y+=dx*.009;group.rotation.x=Math.max(-.55,Math.min(.55,group.rotation.x+dy*.006));};
    const up=()=>{dragging=false;};
    const wheel=e=>{e.preventDefault();distance=Math.max(10,Math.min(30,distance+Math.sign(e.deltaY)*1.3));const direction=camera.position.clone().normalize();camera.position.copy(direction.multiplyScalar(distance));camera.lookAt(0,-1.2,0);};
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});
    const render=()=>{if(disposed)return;frame=requestAnimationFrame(render);renderer.render(scene,camera);};render();
    state.viewerDispose=()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);group.traverse(o=>{o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(m=>{m.map?.dispose?.();m.dispose?.();});else{o.material?.map?.dispose?.();o.material?.dispose?.();}});renderer.dispose();};
  } catch (error) {
    const view=canvas.closest('.bp-underground-transit-view-v1'); if(view){const note=document.createElement('span');note.className='bp-underground-transit-fallback-v1';note.textContent='3D viewer unavailable on this device';view.appendChild(note);}
    console.warn('BridgePoint underground transit viewer',error);
  }
}
function openStationPopup(state, station, lngLat) {
  const Popup = window.maplibregl?.Popup; if (!Popup) return;
  state.viewerDispose?.();state.viewerDispose=null;
  state.popup?.remove();
  state.popup = new Popup({closeButton:true,closeOnClick:true,maxWidth:'450px',className:'bp-underground-transit-popup-wrap-v1'})
    .setLngLat(lngLat||station.coordinates).setHTML(popupHtml(station)).addTo(state.map);
  const root = state.popup.getElement?.(); if (!root) return;
  state.popup.on?.('close',()=>{state.viewerDispose?.();state.viewerDispose=null;});
  void mountViewer(state,root,station);
}
function bindInteractions(state) {
  state.handleClick = event => {
    if (!state.enabled) return;
    const hits=state.map.queryRenderedFeatures?.(event.point,{layers:[MARKER_ID]})||[];
    const hit=hits.find(feature=>feature.properties?.stationId); if(!hit)return;
    const station=UNDERGROUND_TRANSIT_STATIONS_V1.find(item=>item.id===String(hit.properties.stationId));
    if(station)openStationPopup(state,station,event.lngLat||station.coordinates);
  };
  state.handleStyle=()=>{if(!state.enabled)return;if(installLayers(state))setStatus(state,'Layer ON · '+UNDERGROUND_TRANSIT_STATIONS_V1.length+' station hubs stay marked from globe to street zoom.');refreshUi(state);};
  state.handlePersistence=()=>schedulePersistence(state);
  state.map.on('click',state.handleClick);state.map.on('style.load',state.handleStyle);state.map.on('load',state.handleStyle);
  for(const event of ['styledata','idle','moveend','zoomend','rotateend','pitchend'])state.map.on(event,state.handlePersistence);
}
function addControlGroup(state) {
  const dock=document.getElementById('bpv-dock-actions'); if(!dock)return false;
  if(document.getElementById(CONTROL_ID))return true;
  const group=document.createElement('section');group.id=CONTROL_ID;group.className='bpv-command-group';
  group.setAttribute('data-bpv-command-section','underground-transit');group.setAttribute('aria-label','Underground subway and train station hubs');
  group.innerHTML='<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">🚇</span><span><b>UNDERGROUND TRANSIT</b><small>Public passenger station hubs with interactive 3D schematics</small></span></div>'+
    '<div class="bpv-command-grid"><button id="'+TOGGLE_ID+'" type="button" class="bpv-command-btn" aria-pressed="false" title="Show persistent underground subway and train station icons"><span class="bpv-command-icon" aria-hidden="true">🚉</span><span class="bpv-command-label">Subway Stations</span></button></div>'+
    '<div id="'+COUNT_ID+'" class="bpv-data-note">'+UNDERGROUND_TRANSIT_STATIONS_V1.length+' public station hubs · London and Tokyo</div>'+
    '<div id="'+STATUS_ID+'" class="bpv-data-note">Layer off · select a marker for the BridgePoint 3D schematic and operator reference</div>'+
    '<style id="bp-underground-transit-style-v1">'+
    '#'+CONTROL_ID+' .bpv-data-note{font:600 10px/1.45 system-ui,sans-serif;color:#9bb7c6;margin:5px 2px;overflow-wrap:anywhere}'+
    '#'+TOGGLE_ID+'.is-active{border-color:rgba(92,224,242,.8);background:rgba(12,78,100,.62);box-shadow:inset 0 0 0 1px rgba(92,224,242,.24)}'+
    '.bp-underground-transit-popup-wrap-v1 .maplibregl-popup-content{background:#06131f;color:#e6f6fb;border:1px solid rgba(87,218,239,.48);border-radius:14px;padding:12px;font:12px/1.45 system-ui,sans-serif;max-height:min(80vh,760px);overflow:auto;width:min(420px,calc(100vw - 50px))}'+
    '.bp-underground-transit-popup-wrap-v1 .maplibregl-popup-tip{border-top-color:#06131f;border-bottom-color:#06131f}'+
    '.bp-underground-transit-card-v1 h3{font-size:18px;color:#fff;margin:4px 0}.bp-underground-transit-kicker-v1{font-size:9px;letter-spacing:.12em;text-transform:uppercase;font-weight:900;color:#6fe6f2;margin:0}.bp-underground-transit-place-v1{color:#9cb9c6;margin:0 0 7px}'+
    '.bp-underground-transit-view-v1{height:245px;position:relative;background:#071522;border:1px solid rgba(92,220,239,.24);border-radius:10px;overflow:hidden;margin:8px 0}.bp-underground-transit-view-v1 canvas{display:block;width:100%;height:100%;touch-action:none;cursor:grab}.bp-underground-transit-view-v1 canvas:active{cursor:grabbing}.bp-underground-transit-view-v1>span{position:absolute;left:7px;bottom:6px;background:rgba(3,10,17,.8);padding:4px 7px;border-radius:6px;font-size:9px;color:#b8d8e1;pointer-events:none}.bp-underground-transit-view-v1 .bp-underground-transit-fallback-v1{inset:auto 7px 7px;display:block}'+
    '.bp-underground-transit-description-v1{color:#bad0d8;margin:7px 0}.bp-underground-transit-lines-v1{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}.bp-underground-transit-line-v1{display:inline-flex;align-items:center;gap:5px;background:rgba(15,39,52,.9);border:1px solid rgba(139,190,204,.18);border-radius:999px;padding:4px 7px;font-size:10px;color:#e7faff}.bp-underground-transit-line-v1 i{width:8px;height:8px;border-radius:50%;display:inline-block}'+
    '.bp-underground-transit-levels-v1{border-top:1px solid rgba(150,205,216,.16);padding-top:7px;color:#d7edf2}.bp-underground-transit-levels-v1 ul{display:flex;flex-wrap:wrap;gap:5px;list-style:none;margin:5px 0;padding:0}.bp-underground-transit-levels-v1 li{background:rgba(23,51,67,.86);border-radius:6px;padding:4px 6px;font-size:10px;color:#b6d8e1}.bp-underground-transit-note-v1{border-top:1px solid rgba(150,205,216,.16);padding-top:7px;color:#91aebc;font-size:10px;margin:8px 0}.bp-underground-transit-source-v1{color:#72e4f1;font-weight:750;font-size:11px}'+
    '@media(max-width:480px){.bp-underground-transit-popup-wrap-v1 .maplibregl-popup-content{width:min(330px,calc(100vw - 42px));padding:10px}.bp-underground-transit-view-v1{height:210px}}'+
    '</style>';
  dock.appendChild(group);
  const button=document.getElementById(TOGGLE_ID);button?.addEventListener('click',()=>setEnabled(state,!state.enabled));
  return true;
}
function setEnabled(state, enabled) {
  state.enabled=!!enabled;
  if(state.enabled){
    if(!installLayers(state))setStatus(state,'Waiting for the map style before showing station icons…');
    else setStatus(state,'Layer ON · '+UNDERGROUND_TRANSIT_STATIONS_V1.length+' station hubs stay marked from globe to street zoom. Select any icon for its 3D schematic and details.');
    schedulePersistence(state);
  }else{
    state.viewerDispose?.();state.viewerDispose=null;
    if(state.popup){state.popup.remove();state.popup=null;}
    setVisibility(state,false);setStatus(state,'Layer off · all existing BridgePoint layers remain unchanged.');
  }
  refreshUi(state);return state.enabled;
}
export function initUndergroundTransitRenderer(target) {
  const map=target&&(target.map||target);
  if(!map||typeof map.getBounds!=='function'||typeof map.addSource!=='function')return null;
  const existing=MAP_STATES.get(map);if(existing)return existing.api;
  const state={map,enabled:false,dead:false,popup:null,frame:0,viewerDispose:null,status:'off',lastError:null};
  const api={version:VERSION,get enabled(){return state.enabled;},get status(){return state.status;},get stats(){return{version:VERSION,stations:UNDERGROUND_TRANSIT_STATIONS_V1.length,lastError:state.lastError};},
    toggle(){return setEnabled(state,!state.enabled);},setEnabled(value){return setEnabled(state,value);},refresh(){if(map.getSource(SOURCE_ID)?.setData)map.getSource(SOURCE_ID).setData({type:'FeatureCollection',features:buildFeatures()});return api.stats;},
    destroy(){state.dead=true;state.viewerDispose?.();state.popup?.remove();if(state.handleClick)map.off('click',state.handleClick);if(state.handleStyle){map.off('style.load',state.handleStyle);map.off('load',state.handleStyle);}if(state.handlePersistence)for(const event of ['styledata','idle','moveend','zoomend','rotateend','pitchend'])map.off(event,state.handlePersistence);if(state.frame)(window.cancelAnimationFrame||clearTimeout)(state.frame);state.observer?.disconnect();if(state.dockTimer)clearTimeout(state.dockTimer);for(const id of [LABEL_ID,MARKER_ID,HALO_ID])if(map.getLayer(id))map.removeLayer(id);if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID);document.getElementById(CONTROL_ID)?.remove();document.getElementById('bp-underground-transit-style-v1')?.remove();MAP_STATES.delete(map);}};
  state.api=api;MAP_STATES.set(map,state);window.__BP_UNDERGROUND_TRANSIT_V1__=api;bindInteractions(state);
  const observeDock=()=>{if(state.dead)return;if(addControlGroup(state))return;state.dockTimer=setTimeout(observeDock,500);};observeDock();
  if(typeof MutationObserver!=='undefined'&&document.body){state.observer=new MutationObserver(()=>{if(!document.getElementById(CONTROL_ID))addControlGroup(state);});state.observer.observe(document.body,{childList:true,subtree:true});}
  return api;
}
