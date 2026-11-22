/* BridgePoint Maps v1 — independent travel/explore overlay. */
(() => {
  'use strict';
  if (window.__BP_MAPS_V1__) return;

  const VERSION = '1.0.0';
  const ROUTE_SOURCE = 'bp-maps-routes-source-v1';
  const ROUTE_LAYER = 'bp-maps-routes-layer-v1';
  const MODE = [
    { id:'robot', label:'Walking robot', icon:'🤖', kind:'robot', color:'#8b7cff', note:'A walking robot viewpoint' },
    { id:'rover', label:'Small rover', icon:'🛞', kind:'rover', color:'#e5a54d', note:'A compact ground rover viewpoint' },
    { id:'drone', label:'Drone', icon:'🛸', kind:'drone', color:'#51d6e6', note:'A low-altitude aerial viewpoint' },
    { id:'helicopter', label:'Helicopter', icon:'🚁', kind:'helicopter', color:'#56d78b', note:'A helicopter viewpoint' },
    { id:'plane', label:'Plane', icon:'✈️', kind:'plane', color:'#70a9ff', note:'An aircraft viewpoint' },
    { id:'sedan', label:'Car · sedan', icon:'🚘', kind:'car', color:'#ffca5c', note:'Sedan driving viewpoint' },
    { id:'suv', label:'Car · SUV', icon:'🚙', kind:'car', color:'#ff9b52', note:'SUV driving viewpoint' },
    { id:'pickup', label:'Car · pickup', icon:'🛻', kind:'car', color:'#d88cff', note:'Pickup driving viewpoint' },
    { id:'tesla3', label:'Tesla · Model 3', icon:'🚗', kind:'car', color:'#e95a66', note:'Tesla Model 3 driving viewpoint' },
    { id:'teslay', label:'Tesla · Model Y', icon:'🚙', kind:'car', color:'#ed6973', note:'Tesla Model Y driving viewpoint' },
    { id:'motorboat', label:'Boat · motorboat', icon:'🚤', kind:'boat', color:'#50d6e8', note:'Motorboat viewpoint' },
    { id:'sailboat', label:'Boat · sailboat', icon:'⛵', kind:'boat', color:'#7be1d2', note:'Sailboat viewpoint' },
    { id:'yacht', label:'Boat · yacht', icon:'🛥️', kind:'boat', color:'#8bc7ff', note:'Yacht viewpoint' },
    { id:'bicycle', label:'Bicycle', icon:'🚲', kind:'bike', color:'#ffba6c', note:'Bicycle viewpoint' },
    { id:'walk', label:'Walking', icon:'🚶', kind:'walk', color:'#f1d565', note:'Walking viewpoint' },
    { id:'train', label:'Train', icon:'🚆', kind:'train', color:'#ff846d', note:'Train viewpoint' },
    { id:'balloon', label:'Hot air balloon', icon:'🎈', kind:'balloon', color:'#fd7e9d', note:'Hot air balloon viewpoint' },
    { id:'default', label:'Default', icon:'🌐', kind:'default', color:'#d2e5ed', note:'Default BridgePoint viewpoint' }
  ];
  const PLACES = [
    { group:'Major cities', name:'New York City, USA', coordinates:[-74.0060,40.7128], zoom:14 },
    { group:'Major cities', name:'London, United Kingdom', coordinates:[-0.1276,51.5072], zoom:14 },
    { group:'Major cities', name:'Tokyo, Japan', coordinates:[139.6917,35.6895], zoom:14 },
    { group:'Major cities', name:'Paris, France', coordinates:[2.3522,48.8566], zoom:14 },
    { group:'Major cities', name:'Singapore', coordinates:[103.8198,1.3521], zoom:14 },
    { group:'Major cities', name:'Sydney, Australia', coordinates:[151.2093,-33.8688], zoom:14 },
    { group:'Oceanside', name:'Miami Beach, Florida', coordinates:[-80.1300,25.7907], zoom:14 },
    { group:'Oceanside', name:'Bondi Beach, Sydney', coordinates:[151.2743,-33.8915], zoom:14 },
    { group:'Oceanside', name:'Copacabana Beach, Rio de Janeiro', coordinates:[-43.1868,-22.9711], zoom:14 },
    { group:'Oceans', name:'North Atlantic Ocean', coordinates:[-35,35], zoom:5 },
    { group:'Oceans', name:'Pacific Ocean · Hawaii', coordinates:[-157.8583,21.3069], zoom:7 },
    { group:'Oceans', name:'Indian Ocean', coordinates:[75,-15], zoom:5 },
    { group:'Lakes', name:'Lake Tahoe, USA', coordinates:[-120.0324,39.0968], zoom:12 },
    { group:'Lakes', name:'Lake Michigan, USA', coordinates:[-87.1,43.7], zoom:7 },
    { group:'Lakes', name:'Lake Geneva, Switzerland', coordinates:[6.55,46.45], zoom:9 },
    { group:'Rivers', name:'Amazon River · Manaus, Brazil', coordinates:[-60.0217,-3.1190], zoom:12 },
    { group:'Rivers', name:'Thames River · London', coordinates:[-0.073,51.507], zoom:13 },
    { group:'Rivers', name:'Mississippi River · New Orleans', coordinates:[-90.0715,29.9511], zoom:12 },
    { group:'Highways', name:'Route 66 · Flagstaff, Arizona', coordinates:[-111.6513,35.1983], zoom:13 },
    { group:'Highways', name:'Pacific Coast Highway · Big Sur', coordinates:[-121.8081,36.2704], zoom:13 },
    { group:'Highways', name:'Autobahn · Berlin', coordinates:[13.4050,52.5200], zoom:12 },
    { group:'Downtowns', name:'Manhattan · New York', coordinates:[-73.9855,40.7580], zoom:15 },
    { group:'Downtowns', name:'Shibuya · Tokyo', coordinates:[139.7016,35.6595], zoom:15 },
    { group:'Downtowns', name:'Dubai Downtown', coordinates:[55.2744,25.1972], zoom:14 },
    { group:'Islands', name:'Oahu, Hawaii', coordinates:[-157.8583,21.3069], zoom:9 },
    { group:'Islands', name:'Manhattan Island, USA', coordinates:[-73.9712,40.7831], zoom:11 },
    { group:'Islands', name:'Santorini, Greece', coordinates:[25.4615,36.3932], zoom:12 }
  ];
  const state = {
    tab:'explore', screen:'home', mode:'default', place:null, origin:null, destination:null,
    results:{explore:[],from:[],to:[]}, routes:[], selectedRoute:0, status:'', statusKind:'info',
    exploreSession:false, navigation:false, watchId:null, marker:null, lastFix:null,
    startedAt:0, travelledMeters:0, speedMph:0, arrived:false, routeGeoJSON:null,
    cache:new Map(), lastRequest:{geo:0,route:0}, map:null, mapHandlers:false, mountButton:null
  };
  const $ = (sel, root=document) => root.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getMode = id => MODE.find(m => m.id === id) || MODE[MODE.length - 1];
  const mapNow = () => window.__BP_V5000_WORLD__?.map || window.__bpWorldV2300?.map || null;
  function signedIn(){
    try {
      const s = JSON.parse(localStorage.getItem('bp_auth_v5045') || 'null');
      const exp = Number(s?.expires_at || 0);
      return !!s?.access_token && (!exp || exp * 1000 > Date.now() + 15000);
    } catch (_) { return false; }
  }
  function visibleAppMap(){
    const el = $('#liveMap');
    if (!el) return false;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 50 && r.height > 50 && cs.display !== 'none' && cs.visibility !== 'hidden';
  }
  function setStatus(message, kind='info'){
    state.status = String(message || ''); state.statusKind = kind;
    const node = $('#bpMapsStatus');
    if (node) { node.textContent = state.status; node.dataset.kind = kind; node.hidden = !state.status; }
  }
  function installCSS(){
    if ($('#bpMapsStyleV1')) return;
    const css = `
      #bpMapsLaunchV1{position:fixed;z-index:2147482900;top:max(12px,env(safe-area-inset-top));right:14px;min-height:44px;padding:0 16px;border:1px solid #ffe29a;border-radius:14px;background:linear-gradient(135deg,#ffe597,#dcae38 60%,#a87716);color:#171108;font:900 12px/1 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.065em;box-shadow:0 8px 28px #0008,0 0 20px #f2c54b44;cursor:pointer;touch-action:manipulation}
      #bpMapsLaunchV1:active{transform:translateY(1px);filter:brightness(.94)}
      #bpMapsRootV1{position:fixed;inset:0;z-index:2147482890;display:flex;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top) + 12px) 12px calc(env(safe-area-inset-bottom) + 12px);background:rgba(2,8,13,.60);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font:500 14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;color:#eaf5fa}
      #bpMapsRootV1[hidden],#bpMapsHudV1[hidden]{display:none!important}
      .bpMapsPanel{width:min(900px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(106,213,232,.48);border-radius:22px;background:linear-gradient(150deg,rgba(9,24,34,.98),rgba(4,12,20,.98));box-shadow:0 28px 90px #000b,0 0 46px #28cde21a}
      .bpMapsHead{display:flex;align-items:center;gap:12px;padding:15px 17px;border-bottom:1px solid #99dce525;background:linear-gradient(100deg,#102b39,#07131c)}
      .bpMapsBrand{min-width:0;flex:1}.bpMapsBrand b{display:block;color:#f4d06a;font-size:13px;letter-spacing:.09em}.bpMapsBrand small{display:block;margin-top:2px;color:#91aeb9;font-size:10px;letter-spacing:.1em}
      .bpMapsClose{width:38px;height:38px;border:1px solid #6d9bab55;border-radius:12px;background:#0b1921;color:#eaf5fa;font-size:22px;cursor:pointer}
      .bpMapsTabs{display:flex;gap:8px;padding:11px 16px 0}.bpMapsTab{flex:1;min-height:40px;border:1px solid #3a5968;border-radius:12px;background:#0a1820;color:#a9c2cc;font-weight:800;letter-spacing:.04em;cursor:pointer}.bpMapsTab[aria-selected=true]{border-color:#f0ca59;background:linear-gradient(115deg,#654f1f,#292313);color:#ffe187;box-shadow:inset 0 0 18px #f4ce5422}
      .bpMapsBody{overflow:auto;overscroll-behavior:contain;padding:14px 16px 18px}.bpMapsSection{margin:0 0 17px}.bpMapsSection h3{margin:0 0 8px;color:#a7d4df;font-size:11px;letter-spacing:.12em;text-transform:uppercase}.bpMapsIntro{margin:0 0 12px;color:#a8bac2;font-size:12px}.bpMapsModeGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.bpMapsMode{min-height:68px;display:flex;align-items:center;gap:9px;padding:8px;border:1px solid #29414e;border-radius:13px;background:linear-gradient(145deg,#10212c,#09151d);color:#e6f3f7;text-align:left;cursor:pointer}.bpMapsMode[aria-pressed=true]{border-color:var(--mode-color,#f0ca59);box-shadow:0 0 0 1px color-mix(in srgb,var(--mode-color,#f0ca59) 45%,transparent),inset 0 0 22px color-mix(in srgb,var(--mode-color,#f0ca59) 13%,transparent)}.bpMapsIcon{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;border-radius:12px;background:radial-gradient(circle at 30% 20%,#fff3,transparent 70%),linear-gradient(145deg,color-mix(in srgb,var(--mode-color,#f0ca59) 35%,#13232d),#0a1119);font-size:22px;filter:drop-shadow(0 5px 5px #0007)}.bpMapsMode span:last-child{font-size:11px;font-weight:800;line-height:1.2}.bpMapsQuickGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.bpMapsPlace{min-height:43px;padding:8px 10px;border:1px solid #29424d;border-radius:11px;background:#0c1b24;color:#d9edf3;text-align:left;font-size:11px;cursor:pointer}.bpMapsPlace small{display:block;color:#75c9d7;font-size:9px;letter-spacing:.07em;text-transform:uppercase}.bpMapsSearch{display:flex;gap:7px}.bpMapsSearch input{width:100%;min-width:0;min-height:42px;padding:0 12px;border:1px solid #426172;border-radius:11px;background:#061119;color:#f4f8fa;font:600 13px system-ui}.bpMapsSearch button,.bpMapsPrimary,.bpMapsSecondary,.bpMapsDanger{min-height:42px;padding:0 14px;border:1px solid #f0cf65;border-radius:11px;background:linear-gradient(120deg,#f6db82,#d1a438);color:#1c170a;font-weight:900;letter-spacing:.03em;cursor:pointer;white-space:nowrap}.bpMapsSecondary{border-color:#467182;background:linear-gradient(120deg,#173746,#0d202b);color:#cbeaf1}.bpMapsDanger{border-color:#a84d52;background:#431c25;color:#ffdfe1}.bpMapsResults{display:grid;gap:6px;margin-top:8px}.bpMapsResult{width:100%;padding:10px 11px;border:1px solid #385765;border-radius:11px;background:#0b1a22;color:#eff8fa;text-align:left;font-size:12px;cursor:pointer}.bpMapsResult small{display:block;margin-top:3px;color:#89a7b2;font-size:10px}.bpMapsSelected{display:flex;align-items:center;gap:12px;padding:11px;border:1px solid #51707b;border-radius:15px;background:linear-gradient(120deg,#102935,#0a171e)}.bpMapsSelectedFigure{width:78px;height:72px;flex:0 0 78px;display:grid;place-items:center;overflow:hidden;border:1px solid #70d0d955;border-radius:16px;background:radial-gradient(ellipse at 50% 70%,#50d3e422,transparent 65%),linear-gradient(145deg,#1b3440,#07121a);perspective:400px}.bpMapsSelectedFigure span{display:block;font-size:44px;transform:rotateX(18deg) rotateY(-20deg);filter:drop-shadow(8px 10px 3px #0009);animation:bpMapsBob 2.6s ease-in-out infinite}.bpMapsSelectedCopy{min-width:0;flex:1}.bpMapsSelectedCopy b{display:block;color:#f8dc85}.bpMapsSelectedCopy small{display:block;margin-top:3px;color:#a5bdc5;font-size:10px}.bpMapsNotice{margin:8px 0 0;color:#8ea8b3;font-size:10px}.bpMapsStatus{min-height:0;margin:9px 0 0;padding:0;color:#9bc6d2;font-size:11px}.bpMapsStatus:not([hidden]){padding:9px 11px;border:1px solid #3f6772;border-radius:10px;background:#0c222c}.bpMapsStatus[data-kind=error]{border-color:#a74c55;background:#301920;color:#ffdadd}.bpMapsStatus[data-kind=success]{border-color:#4c9e82;background:#102b25;color:#bff5db}.bpMapsRouteList{display:grid;gap:8px}.bpMapsRoute{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #3a5969;border-radius:13px;background:#0a1922;color:#e7f4f8;text-align:left;cursor:pointer}.bpMapsRoute[aria-pressed=true]{border-color:#f0ce62;background:linear-gradient(120deg,#403719,#10212a)}.bpMapsRouteNum{width:27px;height:27px;flex:0 0 27px;display:grid;place-items:center;border:1px solid #f0cc60;border-radius:50%;color:#ffe285;font-weight:900}.bpMapsRouteInfo{min-width:0;flex:1}.bpMapsRouteInfo b{display:block;font-size:12px}.bpMapsRouteInfo small{display:block;margin-top:2px;color:#95b0bb;font-size:10px}.bpMapsRouteTime{font-size:12px;font-weight:900;color:#c6eff6;white-space:nowrap}.bpMapsHud{position:fixed;z-index:2147482880;right:14px;bottom:clamp(145px,21vh,230px);width:min(245px,calc(100vw - 28px));padding:11px;border:1px solid #54bfd0aa;border-radius:17px;background:linear-gradient(145deg,#071820ee,#09131eea);box-shadow:0 9px 30px #0009;color:#e6f5f8;backdrop-filter:blur(12px);touch-action:manipulation}.bpMapsHudTop{display:flex;align-items:center;gap:7px}.bpMapsHudTop b{flex:1;color:#f4d472;font-size:10px;letter-spacing:.08em}.bpMapsHudTop button{min-height:28px;padding:0 8px;border:1px solid #476c78;border-radius:8px;background:#10242d;color:#d9edf2;font-size:10px;font-weight:800}.bpMapsPad{display:grid;grid-template-columns:repeat(3,39px);grid-template-rows:repeat(2,37px);justify-content:center;gap:4px;margin-top:8px}.bpMapsPad button{border:1px solid #588796;border-radius:10px;background:linear-gradient(145deg,#183643,#0c1b24);color:#c9f2f8;font-size:17px;font-weight:900;touch-action:manipulation}.bpMapsPad button:nth-child(1){grid-column:2}.bpMapsPad button:nth-child(2){grid-column:1;grid-row:2}.bpMapsPad button:nth-child(3){grid-column:2;grid-row:2}.bpMapsPad button:nth-child(4){grid-column:3;grid-row:2}.bpMapsSpeed{margin-top:8px;padding:7px;border-radius:10px;background:#08121a;text-align:center;color:#a8c1c9;font-size:10px}.bpMapsSpeed strong{color:#f4dc88;font-size:18px}.bpMapsFooter{padding:9px 16px;border-top:1px solid #89d6e21e;color:#829ba5;font-size:10px}.bpMapsFooter a{color:#9bd9e3}.bpMapsRail{font-size:10px;color:#9bb3bd}
      @keyframes bpMapsBob{0%,100%{transform:translateY(2px) rotateX(18deg) rotateY(-20deg)}50%{transform:translateY(-4px) rotateX(18deg) rotateY(-20deg)}}
      @media(max-width:700px){#bpMapsLaunchV1{top:max(9px,env(safe-area-inset-top));right:9px;min-height:39px;padding:0 11px;border-radius:12px;font-size:10px}.bpMapsPanel{border-radius:17px}.bpMapsHead{padding:11px 12px}.bpMapsTabs{padding:8px 10px 0}.bpMapsBody{padding:11px 10px 13px}.bpMapsModeGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.bpMapsMode{min-height:58px;padding:6px;gap:7px}.bpMapsIcon{width:34px;height:34px;flex-basis:34px;font-size:19px}.bpMapsMode span:last-child{font-size:10px}.bpMapsQuickGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.bpMapsPlace{min-height:40px;padding:7px;font-size:10px}.bpMapsSearch input{font-size:12px}.bpMapsHud{right:8px;bottom:max(112px,calc(env(safe-area-inset-bottom) + 105px));width:196px;padding:8px}.bpMapsPad{grid-template-columns:repeat(3,34px);grid-template-rows:repeat(2,32px)}.bpMapsSpeed strong{font-size:16px}.bpMapsFooter{padding:8px 11px}}
      @media(min-width:701px){.bpMapsHud{bottom:20px}}
    `;
    const style = document.createElement('style'); style.id='bpMapsStyleV1'; style.textContent=css; document.head.appendChild(style);
  }
  function ensureNodes(){
    if ($('#bpMapsRootV1')) return;
    const btn=document.createElement('button');btn.id='bpMapsLaunchV1';btn.type='button';btn.textContent='✦  BRIDGEPOINT MAPS';btn.setAttribute('aria-haspopup','dialog');btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click',()=>{openPanel();});document.body.appendChild(btn);state.mountButton=btn;
    const root=document.createElement('div');root.id='bpMapsRootV1';root.hidden=true;root.innerHTML='<section class="bpMapsPanel" role="dialog" aria-modal="true" aria-labelledby="bpMapsTitle"><header class="bpMapsHead"><div class="bpMapsBrand"><b id="bpMapsTitle">BRIDGEPOINT MAPS</b><small>3D WORLD EXPLORATION · DIRECTIONS</small></div><button class="bpMapsClose" type="button" data-action="close" aria-label="Close BridgePoint Maps">×</button></header><nav class="bpMapsTabs" aria-label="BridgePoint Maps mode"><button class="bpMapsTab" type="button" data-action="tab" data-tab="explore" aria-selected="true">EXPLORE THE WORLD</button><button class="bpMapsTab" type="button" data-action="tab" data-tab="directions" aria-selected="false">DIRECTIONS</button></nav><main class="bpMapsBody" id="bpMapsBody"></main><footer class="bpMapsFooter">Place searches go to OpenStreetMap Nominatim; route requests send the selected endpoints to FOSSGIS. Live GPS tracking stays in this browser. <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">Fix the map</a>. Exact vehicle CAD assets are not included in this build; previews are visual mode markers.</footer></section>';
    root.addEventListener('click',onClick);root.addEventListener('submit',onSubmit);root.addEventListener('keydown',onKeyDown);document.body.appendChild(root);
    const hud=document.createElement('aside');hud.id='bpMapsHudV1';hud.className='bpMapsHud';hud.hidden=true;document.body.appendChild(hud);
  }
  function mount(){
    const ok=signedIn() && visibleAppMap() && !!window.__BRIDGEPOINT_VIEW_V5917__?.ready && !!mapNow();
    if(ok){installCSS();ensureNodes();return true;}
    const btn=$('#bpMapsLaunchV1');if(btn)btn.remove();
    const root=$('#bpMapsRootV1');if(root){root.hidden=true;root.remove();}
    const hud=$('#bpMapsHudV1');if(hud){hud.hidden=true;hud.remove();}
    return false;
  }
  function openPanel(){
    if(!mount())return;
    const root=$('#bpMapsRootV1');root.hidden=false;
    $('#bpMapsLaunchV1').setAttribute('aria-expanded','true');render();
  }
  function closePanel(){const root=$('#bpMapsRootV1');if(root)root.hidden=true;$('#bpMapsLaunchV1')?.setAttribute('aria-expanded','false');}
  function setTab(tab){state.tab=tab==='directions'?'directions':'explore';state.screen='home';render();}
  function render(){
    const root=$('#bpMapsRootV1');if(!root)return;
    root.querySelectorAll('.bpMapsTab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===state.tab)));
    const body=$('#bpMapsBody');if(!body)return;
    body.innerHTML=state.tab==='explore'?renderExplore():renderDirections();
    const n=$('#bpMapsStatus');if(n){n.textContent=state.status;n.dataset.kind=state.statusKind;n.hidden=!state.status;}
    updateHud();
  }
  function modeCards(){return `<div class="bpMapsModeGrid">${MODE.map(m=>`<button class="bpMapsMode" style="--mode-color:${m.color}" type="button" data-action="mode" data-mode="${m.id}" aria-pressed="${state.mode===m.id}"><span class="bpMapsIcon" aria-hidden="true">${m.icon}</span><span>${esc(m.label)}</span></button>`).join('')}</div>`;}
  function placeResults(kind){
    const rows=state.results[kind]||[];if(!rows.length)return '';
    return `<div class="bpMapsResults">${rows.map((p,i)=>`<button class="bpMapsResult" type="button" data-action="place-result" data-kind="${kind}" data-index="${i}">${esc(p.name)}<small>${esc(p.display || `${p.coordinates[1].toFixed(4)}, ${p.coordinates[0].toFixed(4)}`)}</small></button>`).join('')}</div>`;
  }
  function placeSearch(kind,label,placeholder){
    const val=kind==='from'?state.origin?.name:kind==='to'?state.destination?.name:state.place?.name;
    return `<form class="bpMapsSearch" data-search-kind="${kind}" autocomplete="off"><input name="q" type="search" value="${esc(val||'')}" placeholder="${esc(placeholder)}" aria-label="${esc(label)}" maxlength="180"><button type="submit">SEARCH</button></form>${placeResults(kind)}`;
  }
  function selectedPreview(){
    const m=getMode(state.mode);const name=state.place?.name||'Choose a starting location';
    return `<div class="bpMapsSelected"><div class="bpMapsSelectedFigure"><span>${m.icon}</span></div><div class="bpMapsSelectedCopy"><b>${esc(m.label)} · 3D world view</b><small>${esc(name)}</small><small>${esc(m.note)}. The current world layers remain available.</small></div></div><p class="bpMapsNotice">The globe moves to the selected place. Use the floating directional pad (or W/A/S/D) to roam; close this panel to reach the existing BridgePoint layer controls.</p>`;
  }
  function renderExplore(){
    if(state.screen==='roam')return `<section class="bpMapsSection"><h3>Explore session</h3>${selectedPreview()}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="bpMapsPrimary" type="button" data-action="close">CLOSE AND ROAM</button><button class="bpMapsSecondary" type="button" data-action="end-explore">END SESSION</button></div></section><div id="bpMapsStatus" class="bpMapsStatus" role="status" hidden></div>`;
    const groups=[...new Set(PLACES.map(p=>p.group))];
    return `<p class="bpMapsIntro">Pick a travel viewpoint, then choose a preset or search a place anywhere in the world. The current BridgePoint globe and its layer controls stay in place.</p><section class="bpMapsSection"><h3>1 · Choose a travel mode or model</h3>${modeCards()}</section><section class="bpMapsSection"><h3>2 · Search the globe</h3>${placeSearch('explore','Search for a place','City, ocean, lake, river, highway, island, address…')}</section><section class="bpMapsSection"><h3>Quick places</h3><div class="bpMapsQuickGrid">${groups.map(g=>PLACES.filter(p=>p.group===g).slice(0,5).map(p=>`<button type="button" class="bpMapsPlace" data-action="quick-place" data-name="${esc(p.name)}"><small>${esc(g)}</small>${esc(p.name)}</button>`).join('')).join('')}</div></section><div id="bpMapsStatus" class="bpMapsStatus" role="status" hidden></div>`;
  }
  function fieldBox(kind,label,placeholder,value){return `<div class="bpMapsSection"><h3>${label}</h3><div style="display:flex;gap:7px;align-items:stretch"><form class="bpMapsSearch" data-search-kind="${kind}" autocomplete="off" style="flex:1"><input name="q" type="search" value="${esc(value||'')}" placeholder="${esc(placeholder)}" aria-label="${label}" maxlength="180"><button type="submit">SEARCH</button></form><button type="button" class="bpMapsSecondary" style="padding:0 10px" data-action="use-center" data-kind="${kind}" title="Use the current globe center">CENTER</button></div>${placeResults(kind)}<div class="bpMapsNotice">${esc(kind==='from'?state.origin?.name||'No starting point selected':state.destination?.name||'No destination selected')}</div></div>`;}
  function renderRoutes(){
    if(!state.routes.length)return '';
    const stepText=s=>{const m=s.maneuver||{},action=m.instruction||[m.type,m.modifier,s.name].filter(Boolean).join(' ');return `${action}${s.distance?` · ${(s.distance/1609.344).toFixed(2)} mi`:''}`;};
    return `<div class="bpMapsRouteList">${state.routes.map((r,i)=>{const steps=(r.legs||[]).flatMap(l=>l.steps||[]).slice(0,4).map(stepText).join(' → ');return `<button class="bpMapsRoute" type="button" data-action="select-route" data-index="${i}" aria-pressed="${i===state.selectedRoute}"><span class="bpMapsRouteNum">${i+1}</span><span class="bpMapsRouteInfo"><b>Route ${i+1}${i===0?' · fastest':''}</b><small>${(r.distance/1609.344).toFixed(1)} mi · ${r.legs?.[0]?.steps?.length||0} steps${r.data_version?` · map ${esc(r.data_version.slice(0,10))}`:''}</small>${steps?`<small>${esc(steps)}</small>`:''}</span><span class="bpMapsRouteTime">${Math.round(r.duration/60)} min</span></button>`;}).join('')}</div>`;
  }
  function renderDirections(){
    const m=getMode(state.mode);
    return `<p class="bpMapsIntro">Enter the start and destination. The map will show up to five fastest alternatives returned by the open routing source; available routes vary with location and transport mode.</p><section class="bpMapsSection"><h3>Travel mode</h3><div class="bpMapsModeGrid">${MODE.filter(x=>['sedan','suv','tesla3','teslay','bicycle','walk','train'].includes(x.id)).map(x=>`<button class="bpMapsMode" style="--mode-color:${x.color}" type="button" data-action="mode" data-mode="${x.id}" aria-pressed="${state.mode===x.id}"><span class="bpMapsIcon">${x.icon}</span><span>${esc(x.label)}</span></button>`).join('')}</div>${state.mode==='train'?'<p class="bpMapsNotice">Worldwide rail journey planning is not connected to this app yet. No train route will be fabricated.</p>':''}</section>${fieldBox('from','STARTING POINT','Address, city, station or place',state.origin?.name)}${fieldBox('to','DESTINATION','Address, city, station or place',state.destination?.name)}<section class="bpMapsSection"><button class="bpMapsPrimary" type="button" data-action="find-routes" ${state.mode==='train'?'disabled':''}>FIND FASTEST AVAILABLE ROUTES</button> ${state.routes.length?'<button class="bpMapsSecondary" type="button" data-action="clear-route">CLEAR ROUTE</button>':''}<div class="bpMapsNotice">Current directions support driving, walking and cycling. Train is shown as a selectable mode but has no connected global rail routing feed. Route requests go to the OSM/FOSSGIS service.</div></section><section class="bpMapsSection">${state.routes.length?`<h3>Routes · ${state.routes.length} available</h3>${renderRoutes()}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" class="bpMapsPrimary" data-action="start-navigation">START LIVE NAVIGATION</button><button type="button" class="bpMapsSecondary" data-action="close">CLOSE MAPS</button></div><p class="bpMapsNotice">Live navigation asks for browser location permission only after you press Start. Speed and trip tracking stay in this browser.</p>`:''}</section><div id="bpMapsStatus" class="bpMapsStatus" role="status" hidden></div>`;
  }
  async function pace(which){
    const now=Date.now(),wait=Math.max(0,1000-(now-state.lastRequest[which]));
    if(wait)await new Promise(resolve=>setTimeout(resolve,wait));state.lastRequest[which]=Date.now();
  }
  async function geocode(q){
    const query=String(q||'').trim();if(query.length<2)throw new Error('Enter at least two characters to search.');
    const key=query.toLocaleLowerCase();const cached=state.cache.get(key);if(cached&&cached.exp>Date.now())return cached.places;
    await pace('geo');
    const url='https://nominatim.openstreetmap.org/search?'+new URLSearchParams({format:'jsonv2',limit:'5',addressdetails:'1',q:query});
    const res=await fetch(url,{headers:{'Accept':'application/json'},credentials:'omit',cache:'no-store'});
    if(!res.ok)throw new Error(`Place search returned HTTP ${res.status}. Try again shortly.`);
    const rows=await res.json();const places=(Array.isArray(rows)?rows:[]).map(x=>({name:x.name||x.display_name?.split(',')[0]||query,display:x.display_name||'',coordinates:[Number(x.lon),Number(x.lat)],zoom:14})).filter(p=>p.coordinates.every(Number.isFinite));
    if(!places.length)throw new Error('No matching places found. Try a nearby city or a more specific search.');
    state.cache.set(key,{exp:Date.now()+6*60*60*1000,places});return places;
  }
  async function searchLocation(kind,query){
    setStatus('Searching OpenStreetMap places…');
    try{state.results[kind]=await geocode(query);render();setStatus(`${state.results[kind].length} place options found. Choose one.`);}
    catch(e){render();setStatus(e?.message||'Place search failed.', 'error');}
  }
  function onSubmit(e){
    const form=e.target.closest('form[data-search-kind]');if(!form)return;e.preventDefault();
    const q=$('input[name="q"]',form)?.value||'';void searchLocation(form.dataset.searchKind,q);
  }
  function onKeyDown(e){
    if(e.key==='Escape'){closePanel();return;}
    const t=e.target;if(t&&/INPUT|TEXTAREA|SELECT/.test(t.tagName))return;
    if(state.exploreSession&&!state.navigation){const keys={ArrowUp:[0,-1],w:[0,-1],W:[0,-1],ArrowDown:[0,1],s:[0,1],S:[0,1],ArrowLeft:[-1,0],a:[-1,0],A:[-1,0],ArrowRight:[1,0],d:[1,0],D:[1,0]};const move=keys[e.key];if(move){e.preventDefault();roam(move[0],move[1]);}}
  }
  function onClick(e){
    const b=e.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;
    if(action==='close'){closePanel();return;}
    if(action==='tab'){if(b.dataset.tab==='directions'&&state.mode==='default')state.mode='sedan';setTab(b.dataset.tab);return;}
    if(action==='mode'){state.mode=b.dataset.mode;state.status='';render();return;}
    if(action==='quick-place'){const p=PLACES.find(x=>x.name===b.dataset.name);if(p)beginExplore(p);return;}
    if(action==='place-result'){const arr=state.results[b.dataset.kind]||[];const p=arr[Number(b.dataset.index)];if(!p)return;if(b.dataset.kind==='explore')beginExplore(p);else if(b.dataset.kind==='from'){state.origin=p;state.results.from=[];render();setStatus('Starting point selected.');}else{state.destination=p;state.results.to=[];render();setStatus('Destination selected.');}return;}
    if(action==='use-center'){const m=mapNow();if(!m){setStatus('The 3D globe is still initializing.','error');return;}const c=m.getCenter();const p={name:'Current globe center',display:`${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`,coordinates:[c.lng,c.lat],zoom:14};if(b.dataset.kind==='from')state.origin=p;else state.destination=p;render();setStatus('Current globe center selected.');return;}
    if(action==='select-route'){state.selectedRoute=Number(b.dataset.index)||0;drawRoutes();render();focusRoute();setStatus('Route highlighted on the 3D globe.');return;}
    if(action==='find-routes'){void findRoutes();return;}
    if(action==='start-navigation'){startNavigation();return;}
    if(action==='clear-route'){clearRoute();render();setStatus('Route cleared.');return;}
    if(action==='end-explore'){endSession();state.screen='home';render();return;}
    if(action==='roam'){roam(Number(b.dataset.dx)||0,Number(b.dataset.dy)||0);return;}
    if(action==='stop-navigation'){if(state.arrived){endSession();setStatus('Trip finished. Route stays on the globe.','success');}else{stopNavigation();updateHud();setStatus('Live location tracking stopped. Route stays on the globe.');}return;}
    if(action==='end-session'){endSession();updateHud();setStatus('BridgePoint Maps session ended.');return;}
  }
  function fitCamera(coordinates,zoom=14,duration=1900){
    const map=mapNow();if(!map)return false;state.map=map;
    try{map.stop();map.flyTo({center:coordinates,zoom,pitch:zoom<8?40:58,bearing:0,duration,essential:true});return true;}catch(_){return false;}
  }
  function setVehicleMarker(coordinates){
    const map=mapNow();if(!map||!window.maplibregl?.Marker)return;
    state.marker?.remove();state.marker=null;
    const mode=getMode(state.mode);const el=document.createElement('div');el.className='bpMapsLiveMarker';el.setAttribute('role','img');el.setAttribute('aria-label',mode.label);
    el.style.cssText=`width:54px;height:54px;display:grid;place-items:center;border:1px solid ${mode.color};border-radius:18px;background:radial-gradient(circle at 30% 25%,#fff8,transparent 55%),linear-gradient(145deg,${mode.color}55,#06141ddd);box-shadow:0 8px 22px #0009,0 0 20px ${mode.color}77;transform:perspective(300px) rotateX(18deg) rotateY(-16deg);font:32px system-ui;`;
    el.textContent=mode.icon;state.marker=new window.maplibregl.Marker({element:el,anchor:'center'}).setLngLat(coordinates).addTo(map);
  }
  function beginExplore(place){
    if(!place?.coordinates?.every(Number.isFinite)){setStatus('This place has no usable map coordinates.','error');return;}
    if(state.watchId!==null)stopNavigation();
    state.place=place;state.exploreSession=true;state.navigation=false;state.mode=state.mode||'default';state.screen='roam';
    state.routes=[];state.routeGeoJSON=null;drawRoutes();
    const mode=getMode(state.mode);const zoom=Number(place.zoom)||(['plane','balloon','helicopter'].includes(mode.kind)?12:14);
    setVehicleMarker(place.coordinates);fitCamera(place.coordinates,zoom);
    render();setStatus(`${mode.label} placed at ${place.name}. Use the direction controls to roam the live BridgePoint globe.` ,'success');updateHud();
  }
  function roam(dx,dy){
    const map=mapNow();if(!map||!state.exploreSession||state.navigation)return;
    const kind=getMode(state.mode).kind;const scale=kind==='plane'||kind==='helicopter'||kind==='balloon'?220:kind==='drone'?150:90;
    try{map.panBy([dx*scale,dy*scale],{duration:420,animate:true});map.once('moveend',()=>{const c=map.getCenter();state.marker?.setLngLat([c.lng,c.lat]);});}catch(_){ }
  }
  function updateHud(){
    const hud=$('#bpMapsHudV1');if(!hud)return;
    const visible=state.exploreSession||state.navigation;hud.hidden=!visible;
    if(!visible)return;
    const mode=getMode(state.mode);const label=state.navigation?'LIVE NAVIGATION':`ROAMING · ${mode.label.toUpperCase()}`;
    const speed=state.navigation?`<div class="bpMapsSpeed"><strong>${state.speedMph.toFixed(1)}</strong> mph${state.arrived?'<br><b>ARRIVED</b>':''}</div>`:'';
    const elapsed=Math.max(0,Math.round((Date.now()-state.startedAt)/60000));
    const kcal=state.mode==='bicycle'?Math.round(elapsed*8):Math.round(elapsed*4);
    const arrival=state.arrived?`<div class="bpMapsSpeed"><b>ARRIVED AT ${esc(state.destination?.name||'DESTINATION')}</b><br>${(state.travelledMeters/1609.344).toFixed(2)} mi traveled · ${elapsed} min${['walk','bicycle'].includes(state.mode)?` · about ${kcal} kcal (70 kg reference)`:''}</div>`:'';
    const controls=state.navigation?`${state.arrived?'':`<div class="bpMapsSpeed">${esc(state.destination?.name||'Destination')}<br>${(state.travelledMeters/1609.344).toFixed(2)} mi tracked · ${elapsed} min</div>`}<button type="button" class="bpMapsDanger" data-action="stop-navigation" style="width:100%;margin-top:6px">${state.arrived?'FINISH TRIP':'STOP LOCATION SHARING'}</button>`:`<div class="bpMapsPad" aria-label="Roam controls"><button type="button" data-action="roam" data-dx="0" data-dy="-1" aria-label="Move forward">▲</button><button type="button" data-action="roam" data-dx="-1" data-dy="0" aria-label="Move left">◀</button><button type="button" data-action="roam" data-dx="0" data-dy="1" aria-label="Move back">▼</button><button type="button" data-action="roam" data-dx="1" data-dy="0" aria-label="Move right">▶</button></div>`;
    const notice=state.statusKind==='error'?`<div class="bpMapsNotice" style="color:#ffc8cc">${esc(state.status)}</div>`:'';
    hud.innerHTML=`<div class="bpMapsHudTop"><span style="font-size:20px">${mode.icon}</span><b>${label}</b><button type="button" data-action="end-session">END</button></div>${controls}${speed}${arrival}${notice}`;
  }
  function drawRoutes(){
    const map=mapNow();if(!map)return;state.map=map;
    const apply=()=>{
      if(map!==mapNow()||!map.isStyleLoaded?.())return;
      try{
        if(!map.getSource(ROUTE_SOURCE))map.addSource(ROUTE_SOURCE,{type:'geojson',data:state.routeGeoJSON||{type:'FeatureCollection',features:[]}});
        if(!map.getLayer(ROUTE_LAYER))map.addLayer({id:ROUTE_LAYER,type:'line',source:ROUTE_SOURCE,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['case',['boolean',['get','selected'],false],'#f5cd5d','#40cde0'],'line-width':['case',['boolean',['get','selected'],false],7,3],'line-opacity':['case',['boolean',['get','selected'],false],.96,.58]}});
        else map.getSource(ROUTE_SOURCE)?.setData(state.routeGeoJSON||{type:'FeatureCollection',features:[]});
      }catch(e){console.warn('BridgePoint Maps route overlay',e);}
    };
    if(map.isStyleLoaded?.())apply();else if(!state.mapHandlers){map.once('load',apply);}
    if(!state.mapHandlers){state.mapHandlers=true;map.on('style.load',()=>{state.mapHandlers=false;drawRoutes();});}
  }
  function packRoutes(){
    state.routeGeoJSON={type:'FeatureCollection',features:state.routes.map((r,i)=>({type:'Feature',id:String(i),properties:{index:i,selected:i===state.selectedRoute,duration:r.duration,distance:r.distance},geometry:r.geometry}))};drawRoutes();
  }
  function focusRoute(){
    const map=mapNow(),r=state.routes[state.selectedRoute];if(!map||!r?.geometry?.coordinates?.length)return;
    try{const b=new window.maplibregl.LngLatBounds();r.geometry.coordinates.forEach(c=>b.extend(c));map.stop();map.fitBounds(b,{padding:{top:90,right:80,bottom:170,left:80},maxZoom:15,duration:1500,pitch:54,bearing:0});}catch(_){ }
  }
  async function findRoutes(){
    if(state.mode==='train'){setStatus('Train directions are not available yet; a global rail routing feed is not connected.','error');return;}
    if(!state.origin||!state.destination){setStatus('Choose a starting point and destination first.','error');return;}
    if(state.origin.coordinates[0]===state.destination.coordinates[0]&&state.origin.coordinates[1]===state.destination.coordinates[1]){setStatus('Choose two different places.','error');return;}
    setStatus('Calculating up to five fastest available routes…');
    const kind=getMode(state.mode).kind;const prefix=kind==='bike'?'routed-bike':kind==='walk'?'routed-foot':'routed-car';
    const [a,b]=[state.origin.coordinates,state.destination.coordinates];
    const url=`https://routing.openstreetmap.de/${prefix}/route/v1/driving/${a[0]},${a[1]};${b[0]},${b[1]}?${new URLSearchParams({alternatives:'4',steps:'true',overview:'full',geometries:'geojson'})}`;
    try{
      await pace('route');const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),22000);
      const res=await fetch(url,{headers:{'Accept':'application/json'},credentials:'omit',signal:controller.signal,cache:'no-store'});clearTimeout(timer);
      if(!res.ok)throw new Error(`Route service returned HTTP ${res.status}.`);
      const data=await res.json();if(data.code!=='Ok'||!Array.isArray(data.routes)||!data.routes.length)throw new Error('No connected route was found for those places and this travel mode.');
      state.routes=data.routes.filter(r=>r.geometry?.coordinates?.length).sort((x,y)=>x.duration-y.duration).slice(0,5);state.selectedRoute=0;
      if(!state.routes.length)throw new Error('The route source returned no displayable geometry.');
      state.routeGeoJSON={type:'FeatureCollection',features:state.routes.map((r,i)=>({type:'Feature',id:String(i),properties:{index:i,selected:i===0,duration:r.duration,distance:r.distance},geometry:r.geometry}))};
      render();drawRoutes();focusRoute();setStatus(`Showing ${state.routes.length} fastest available ${kind==='bike'?'cycling':kind==='walk'?'walking':'driving'} route${state.routes.length===1?'':'s'}.`,'success');
    }catch(e){render();setStatus(e?.name==='AbortError'?'Route request timed out. Try a closer destination.':e?.message||'Route calculation failed.','error');}
  }
  function clearRoute(){
    stopNavigation();const map=mapNow();state.routes=[];state.routeGeoJSON={type:'FeatureCollection',features:[]};
    try{map?.getSource(ROUTE_SOURCE)?.setData(state.routeGeoJSON);}catch(_){ }
  }
  function startNavigation(){
    if(!state.routes.length||!state.routes[state.selectedRoute]){setStatus('Choose and load a route first.','error');return;}
    if(!navigator.geolocation){setStatus('This browser does not provide location tracking.','error');return;}
    if(!window.isSecureContext){setStatus('Live location sharing requires a secure HTTPS page.','error');return;}
    if(state.watchId!==null)navigator.geolocation.clearWatch(state.watchId);
    state.lastFix=null;state.travelledMeters=0;state.speedMph=0;state.startedAt=Date.now();state.arrived=false;
    // This watchPosition call runs only after the user presses START LIVE NAVIGATION.
    state.watchId=navigator.geolocation.watchPosition(onPosition,onPositionError,{enableHighAccuracy:true,maximumAge:1000,timeout:15000});
    state.navigation=true;state.exploreSession=true;state.screen='roam';state.place=state.destination;
    closePanel();updateHud();
    setStatus('Waiting for a location fix. Your browser will ask before sharing location.','info');
  }
  function onPosition(pos){
    if(!state.navigation)return;
    const c=pos.coords,point=[Number(c.longitude),Number(c.latitude)];if(!point.every(Number.isFinite))return;
    const now=pos.timestamp||Date.now();
    if(state.lastFix){const seconds=Math.max(.2,(now-state.lastFix.time)/1000);const moved=distanceMeters(state.lastFix.point,point);if(moved<5000){state.travelledMeters+=moved;if(c.speed==null)state.speedMph=(moved/seconds)*2.236936;}}
    if(c.speed!=null&&Number.isFinite(c.speed)&&c.speed>=0)state.speedMph=c.speed*2.236936;
    state.lastFix={point,time:now};state.marker?.setLngLat(point);const map=mapNow();try{map?.easeTo({center:point,duration:700,essential:true});}catch(_){ }
    const dest=state.destination?.coordinates;if(dest&&distanceMeters(point,dest)<35&&!state.arrived){state.arrived=true;if(state.watchId!==null)navigator.geolocation.clearWatch(state.watchId);state.watchId=null;setStatus(`Arrived at ${state.destination.name}.`,'success');}
    updateHud();
  }
  function onPositionError(error){
    if(!state.navigation)return;
    const msg=error?.code===1?'Location permission was denied. Enable it in your browser settings, then press Start again.':error?.code===3?'Location request timed out. Keep the browser open and retry.':'Location is unavailable right now.';
    setStatus(msg,'error');state.navigation=false;state.watchId=null;updateHud();
  }
  function distanceMeters(a,b){
    const rad=x=>x*Math.PI/180,R=6371000;const dLat=rad(b[1]-a[1]),dLon=rad(b[0]-a[0]);const aa=Math.sin(dLat/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(dLon/2)**2;return 2*R*Math.atan2(Math.sqrt(aa),Math.sqrt(1-aa));
  }
  function stopNavigation(){if(state.watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(state.watchId);state.watchId=null;state.navigation=false;state.speedMph=0;updateHud();}
  function endSession(){stopNavigation();state.exploreSession=false;state.place=null;state.marker?.remove();state.marker=null;state.arrived=false;updateHud();}
  function beginCurrentCenter(kind){const m=mapNow();if(!m)return;const c=m.getCenter();const p={name:'Current globe center',display:`${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`,coordinates:[c.lng,c.lat],zoom:14};if(kind==='from')state.origin=p;else state.destination=p;}
  window.addEventListener('storage',()=>{if(!signedIn())mount();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#bpMapsRootV1')?.hidden)closePanel();});
  const observer=new MutationObserver(()=>{if(!$('#bpMapsLaunchV1'))mount();});observer.observe(document.documentElement,{childList:true,subtree:true});
  const timer=setInterval(()=>{
    if(!signedIn()){mount();return;}
    const map=mapNow();if(map!==state.map&&map){state.map=map;state.mapHandlers=false;drawRoutes();if(state.exploreSession&&state.place?.coordinates)setVehicleMarker(state.place.coordinates);}
    if(!$('#bpMapsLaunchV1'))mount();
  },900);
  window.addEventListener('pagehide',()=>{clearInterval(timer);stopNavigation();observer.disconnect();});
  window.__BP_MAPS_V1__={version:VERSION,ready:true,open:openPanel,getState:()=>({tab:state.tab,mode:state.mode,explore:state.exploreSession,navigation:state.navigation,routeCount:state.routes.length})};
  mount();
})();
