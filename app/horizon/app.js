import {DeterministicRng,HorizonRuntimeContract,KillCamBuffer,DwellPickupController,generateCover} from './runtime-contract.js';
import {createLobbyScene} from './lobby-scene.js?v=4335';
import {mountModelPreviews} from './model-preview.js';

const SUPABASE_URL='https://xdfsjztwgsbmabshzsjw.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const sb=window.supabase?.createClient(SUPABASE_URL,PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const state={player:null,config:null,catalog:null,yearOne:null,party:null,match:null,worldCell:null,maps:[],selectedMap:null,selectedMode:'TDM',channel:null,peers:new Map(),killcam:new KillCamBuffer(),pickup:null,installPrompt:null,queueing:false,yearOneRolloverChecked:false,session:null,account:null,character:null,stats:null,activePlayers:0,owner:false,conusOutline:null};
const qs=new URLSearchParams(location.search);

function b64url(bytes){
  let s='';for(const b of bytes)s+=String.fromCharCode(b);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function identity(){
  let id=localStorage.getItem('horizon-player-id');
  let secret=localStorage.getItem('horizon-player-secret');
  if(!id){id=crypto.randomUUID();localStorage.setItem('horizon-player-id',id)}
  if(!secret){secret=b64url(crypto.getRandomValues(new Uint8Array(32)));localStorage.setItem('horizon-player-secret',secret)}
  return {id,secret};
}
const ident=identity();
const lobbyScene=$('lobby3d')?createLobbyScene($('lobby3d')):null;

async function rpc(name,params={}){
  const headers={apikey:PUBLISHABLE_KEY,'content-type':'application/json','accept':'application/json'};
  const token=state.session?.access_token;if(token)headers.authorization='Bearer '+token;
  const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(params)});
  const text=await r.text();
  if(!r.ok){let msg=text;try{msg=JSON.parse(text)?.message||text}catch{}throw new Error(msg)}
  return text?JSON.parse(text):null;
}
async function refreshAuthState(){
  if(!sb)return null;
  const {data}=await sb.auth.getSession();state.session=data?.session||null;
  if(state.session){
    try{
      const out=await rpc('bridgepoint_horizon_account_v4340',{p_player_id:ident.id,p_player_secret:ident.secret});
      state.account=out?.account||null;state.character=out?.character||null;state.stats=out?.stats||null;
      if(state.account?.handle){$('displayName').value=state.account.handle;localStorage.setItem('horizon-display-name',state.account.handle)}
      if(state.stats)localStorage.setItem('horizon-player-stats-v4340',JSON.stringify(state.stats));
      lobbyScene?.setLocalCharacter?.(state.character,ident.id);
    }catch{state.account=null}
  }else{state.account=null;state.character=null;state.stats=null}
  renderAccountState();syncPlayAvailability();return state.session;
}
function renderAccountState(){
  const btn=$('accountBtn'),st=$('accountState');if(!btn)return;
  btn.classList.toggle('signed',!!state.account);btn.classList.toggle('needs-setup',!!state.session&&!state.account);
  btn.textContent=state.account?state.account.handle:(state.session?'SET UP PROFILE':'SIGN IN');
  if(st)st.textContent=state.account?('SIGNED IN · @'+state.account.handle):(state.session?'CHOOSE UNIQUE HANDLE TO PLAY':'FREE ACCOUNT REQUIRED TO PLAY');
}
async function refreshActivePlayers(){
  try{
    const out=await rpc('bridgepoint_horizon_public_world_stats_v4341',{});state.activePlayers=Number(out?.active_total||0);state.publicStats=out;
    if($('horizonActiveCount'))$('horizonActiveCount').textContent=String(state.activePlayers);
  }catch{}
}
async function detectOwner(){
  if(!state.session){state.owner=false;$('ownerTab')?.setAttribute('hidden','');return false}
  try{await rpc('bridgepoint_horizon_owner_audit_v4341',{});state.owner=true;$('ownerTab')?.removeAttribute('hidden');return true}
  catch{state.owner=false;$('ownerTab')?.setAttribute('hidden','');return false}
}

function setNet(label,color='#f4c45e'){
  $('netLabel').textContent=label;$('netDot').style.background=color;$('netDot').style.color=color;
}
function status(msg){$('statusMessage').textContent=msg}
function yearOneCountdownParts(){
  const target=Date.parse(state.yearOne?.status==='LIVE'?state.yearOne?.end_at:state.yearOne?.start_at);
  if(!Number.isFinite(target))return null;
  const ms=Math.max(0,target-Date.now()),total=Math.floor(ms/1000);
  return {ms,days:Math.floor(total/86400),hours:Math.floor(total%86400/3600),minutes:Math.floor(total%3600/60),seconds:total%60};
}
async function refreshYearOneStatus(){
  state.yearOne=await rpc('bridgepoint_horizon_year_one_status_v4310',{p_player_id:ident.id,p_player_secret:ident.secret});
  state.yearOneRolloverChecked=false;
  markMode();renderYearOneCountdown();return state.yearOne;
}
function renderYearOneCountdown(){
  const el=$('yearOneCountdown'),modeEl=document.querySelector('.mode[data-mode="YEAR_ONE"]');
  if(!el||!modeEl||!state.yearOne)return;
  const c=yearOneCountdownParts();
  modeEl.classList.toggle('live',state.yearOne.status==='LIVE');
  modeEl.classList.toggle('preseason',state.yearOne.status==='PRESEASON');
  if(state.yearOne.status==='LIVE'){
    el.textContent=`LIVE · DAY ${state.yearOne.current_day||1} / 365`;
  }else if(state.yearOne.status==='PRESEASON'&&c){
    el.textContent=`${c.days}D ${String(c.hours).padStart(2,'0')}H ${String(c.minutes).padStart(2,'0')}M ${String(c.seconds).padStart(2,'0')}S`;
    if(c.ms<=0&&!state.yearOneRolloverChecked){
      state.yearOneRolloverChecked=true;
      refreshYearOneStatus().catch(()=>{state.yearOneRolloverChecked=false});
    }
  }else el.textContent=state.yearOne.status||'YEAR ONE';
}
function syncPlayAvailability(){
  const btn=$('playBtn'),label=$('playLabel');if(!btn||!label)return;
  const waiting=state.selectedMode==='YEAR_ONE'&&state.yearOne?.status!=='LIVE',needsAccount=!state.account;
  btn.disabled=!!state.queueing||waiting;
  if(state.queueing)label.textContent=state.selectedMode==='TDM'?'QUEUING':'LOADING';
  else if(needsAccount)label.textContent='SIGN IN';
  else if(waiting)label.textContent='OCT 1';
  else label.textContent='READY';
}
function getPreciseLocation(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(new Error('Year One needs location access to spawn you where you are.'));return}
    navigator.geolocation.getCurrentPosition(
      p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude,accuracy_m:p.coords.accuracy,altitude_m:p.coords.altitude}),
      e=>reject(new Error(e.code===1?'Enable precise location for Year One so Horizon can spawn you where you are.':'Could not lock your location. Try again where GPS/location services are available.')),
      {enableHighAccuracy:true,maximumAge:0,timeout:15000}
    );
  });
}

function avatarTheme(key){
  const n=Number(String(key||'').match(/\d+/)?.[0]||1);
  const skins=['#c88f6f','#8b5f4a','#e0ae89','#704b3d','#b97755','#d59a75','#6d4635','#a46a50','#e1b19c','#815846'];
  const armors=['#2f6c5d','#4c3b70','#384e74','#6f4838','#24565d','#594e32','#455b39','#5d385d','#285078','#6d3038'];
  return {skin:skins[(n-1)%skins.length],armor:armors[(n-1)%armors.length],num:String(n).padStart(2,'0')};
}
function renderParty(){
  const members=state.party?.members||[];
  const row=$('partyRow');row.innerHTML='';
  for(let slot=1;slot<=4;slot++){
    const m=members.find(x=>Number(x.slot)===slot);
    const box=document.createElement('div');box.className='player-slot '+(m?'occupied':'empty');
    if(m){
      const t=avatarTheme(m.avatar_key);
      box.innerHTML=`<div class="pedestal"></div><div class="nameplate">${escapeHtml(m.display_name)}<small>${m.host?'PARTY LEADER':'READY'}</small></div>`;
    }else{
      box.innerHTML=`<div class="pedestal"></div><div class="nameplate">＋ OPEN SLOT<small>TAP TO INVITE FRIEND</small></div>`;
      box.addEventListener('click',inviteFriend);
    }
    row.appendChild(box);
  }
  $('partyCode').textContent=state.party?.invite_code||'------';
  if(lobbyScene)lobbyScene.setParty(members);
  const me=members.find(x=>x.player_id===state.player?.player_id);
  if(me){
    const t=avatarTheme(me.avatar_key);$('avatarBadge').textContent=t.num;
  }
}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function paidCharacterOptions(){
  return (state.catalog?.store||[]).filter(s=>s.category==='CHARACTER_SKIN'&&['MODEL_RENDER','RUNTIME_RENDER'].includes(String(s.preview_kind||'').toUpperCase())).map(s=>({
    character_key:s.entitlement_key,display_name:s.display_name,model_path:s.preview_ref,outfit_variant:2,base_model_key:'STORE_SKIN',owned:!!s.owned,paid:true
  }));
}
function completeCharacterCatalog(){return [...(state.catalog?.characters||[]),...paidCharacterOptions()]}
async function refreshMapCatalog(){
  const out=await rpc('bridgepoint_horizon_map_catalog_v4330',{p_player_id:ident.id,p_player_secret:ident.secret});
  state.maps=out?.maps||[];
  state.selectedMap=state.maps.find(m=>m.map_key===out?.selected_map_key)||null;
  return out;
}
function mapPalette(name){
  return {
    'toxic-dawn':['#0b221c','#2d6050','#6dffd1','#d9b85e'],
    'storm-violet':['#111029','#3b3567','#947cff','#6be5d0'],
    'ember-night':['#21100d','#673523','#ef7048','#f0bc63'],
    'cold-moon':['#0c1c23','#264854','#69c1d9','#d8f8f0']
  }[name]||['#0c1c23','#264854','#69c1d9','#d8f8f0'];
}
function drawCatalogMini(canvas,m){
  if(!canvas||!m)return;const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height,p=mapPalette(m.palette);
  let seed=2166136261;for(const ch of String(m.map_key)){seed^=ch.charCodeAt(0);seed=Math.imul(seed,16777619)}
  const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  g.fillStyle=p[0];g.fillRect(0,0,w,h);g.strokeStyle='rgba(255,255,255,.10)';g.lineWidth=2;
  for(let i=0;i<7;i++){const y=10+i*(h-20)/6;g.beginPath();g.moveTo(0,y+(rnd()-.5)*8);g.lineTo(w,y+(rnd()-.5)*10);g.stroke()}
  for(let i=0;i<10;i++){const x=8+i*(w-16)/9;g.beginPath();g.moveTo(x+(rnd()-.5)*8,0);g.lineTo(x+(rnd()-.5)*10,h);g.stroke()}
  const water=/coastal|lake|river|island|flood/i.test(m.biome||'');if(water){g.fillStyle='rgba(70,167,207,.24)';g.fillRect(w*.72,0,w*.28,h)}
  for(let i=0;i<18;i++){const bw=8+rnd()*25,bh=6+rnd()*17,x=rnd()*(w-bw),y=rnd()*(h-bh);g.fillStyle=i%5===0?p[1]:'rgba(8,18,17,.78)';g.fillRect(x,y,bw,bh)}
  g.strokeStyle=p[2];g.lineWidth=2;g.strokeRect(1,1,w-2,h-2);
  g.fillStyle=p[2];g.beginPath();g.arc(w*.5,h*.5,4,0,Math.PI*2);g.fill();
}
function mountMapMinis(root=document){
  root.querySelectorAll('canvas.map-mini[data-map-key]').forEach(cv=>drawCatalogMini(cv,state.maps.find(m=>m.map_key===cv.dataset.mapKey)));
}

async function bootstrap(){
  setNet('BOOTING','#f4c45e');
  const savedName=localStorage.getItem('horizon-display-name')||`Survivor-${ident.id.slice(0,4).toUpperCase()}`;
  $('displayName').value=savedName;
  state.config=await rpc('bridgepoint_horizon_bootstrap_v4300',{p_player_id:ident.id,p_player_secret:ident.secret,p_display_name:savedName});
  state.player=state.config.player;
  localStorage.setItem('horizon-player-profile',JSON.stringify(state.player));
  await refreshAuthState();
  const [catalog,yearOne]=await Promise.all([
    rpc('bridgepoint_horizon_catalog_v4310',{p_player_id:ident.id,p_player_secret:ident.secret}),
    rpc('bridgepoint_horizon_year_one_status_v4310',{p_player_id:ident.id,p_player_secret:ident.secret})
  ]);
  state.catalog=catalog;state.yearOne=yearOne;
  renderYearOneCountdown();
  if(!window.__BP_YEAR_ONE_CLOCK__)window.__BP_YEAR_ONE_CLOCK__=setInterval(renderYearOneCountdown,1000);
  if(lobbyScene)lobbyScene.setCatalog(completeCharacterCatalog());
  $('loadoutName').textContent=state.config.loadouts.find(x=>x.slot===state.player.selected_loadout)?.name||'Ranger';

  const invite=(qs.get('party')||'').trim().toUpperCase();
  if(invite){
    try{
      const joined=await rpc('bridgepoint_horizon_join_party_v4300',{p_player_id:ident.id,p_player_secret:ident.secret,p_invite_code:invite});
      state.party=joined.party;status(`Joined ${invite}`);
    }catch(e){console.warn(e);status('Invite unavailable. Opening your own party…')}
  }
  if(!state.party){
    const opened=await rpc('bridgepoint_horizon_open_party_v4300',{p_player_id:ident.id,p_player_secret:ident.secret});
    state.party=opened.party;
  }
  const requested=(qs.get('mode')||'').trim().toUpperCase();
  if(requested&&state.party?.host_player_id===ident.id&&state.config.modes?.some(m=>m.key===requested)){
    try{
      const snap=await rpc('bridgepoint_horizon_select_mode_v4300',{p_player_id:ident.id,p_player_secret:ident.secret,p_mode:requested});
      state.party=snap.party;
    }catch{}
  }
  state.selectedMode=state.party.selected_mode||'TDM';
  await refreshMapCatalog().catch(e=>console.warn('map catalog',e));
  state.conusOutline=await rpc('bridgepoint_horizon_conus_outline_v4340',{}).catch(()=>null);
  markMode();
  renderParty();
  await refreshActivePlayers();await detectOwner();setInterval(refreshActivePlayers,10000);
  setNet('ONLINE','#44f3bd');
  status(state.account?'Lobby ready · free account linked · first-person only':'Lobby ready · sign in or create a free Horizon account to play');
  window.BP_HORIZON_LOBBY_V4340={
    ok:true,build:4340,player_id:state.player?.player_id,mode:state.selectedMode,
    perspective:'FIRST_PERSON_ONLY',authoritative_modes:['YEAR_ONE','TDM'],
    party_size:state.party?.members?.length||0,
    catalog_characters:completeCharacterCatalog().length,
    store_items:state.catalog?.store?.length||0,
    battle_pass_rewards:state.catalog?.battle_pass?.length||0,
    map_count:state.maps.length,map_rotation:'VOTE_TWO_PLUS_RANDOM',
    checkout_enabled:false,account_required:true,authenticated:!!state.session,account_linked:!!state.account,
    tdm_target_players:100,map_vote_seconds:10,year_one_scope:'CONUS_48',active_players:state.activePlayers,
    lobbyScene:()=>lobbyScene?.getStats?.()||null
  };
  window.BP_HORIZON_LOBBY_V4330=window.BP_HORIZON_LOBBY_V4340;
  window.BP_HORIZON_LOBBY_V4320=window.BP_HORIZON_LOBBY_V4340;
  connectPartySignal();
  setInterval(refreshParty,1800);
  const initialTab=(qs.get('tab')||'').trim().toUpperCase();
  if(initialTab&&['BATTLE_PASS','LOCKER','LOADOUTS','ARMORY','STORE','ARENA','WATCH','STATS','RULES','ABOUT','OWNER','ACCOUNT','CUSTOMIZE'].includes(initialTab))setTimeout(()=>openModal(initialTab),250);
}
async function refreshParty(){
  try{
    const snap=await rpc('bridgepoint_horizon_party_snapshot_v4300',{p_player_id:ident.id,p_player_secret:ident.secret});
    if(snap?.party){state.party=snap.party;renderParty();markMode()}
  }catch(e){setNet('RETRYING','#f4c45e')}
}
function partyUrl(){
  const code=state.party?.invite_code||'';
  return `${location.origin}/app/horizon/?party=${encodeURIComponent(code)}`;
}
async function inviteFriend(){
  const url=partyUrl(),text=`Join my BridgePoint Horizon party: ${state.party?.invite_code||''}`;
  if(navigator.share){try{await navigator.share({title:'BridgePoint Horizon',text,url});return}catch{}}
  await navigator.clipboard.writeText(`${text}\n${url}`);status('Party invite copied');
}
$('inviteBtn').onclick=inviteFriend;$('inviteTop').onclick=inviteFriend;
$('copyParty').onclick=async()=>{await navigator.clipboard.writeText(state.party?.invite_code||'');status('Party code copied')};

$('displayName').addEventListener('change',async e=>{
  const name=e.target.value.trim().slice(0,20)||'Survivor';
  localStorage.setItem('horizon-display-name',name);
  try{
    if(state.account){
      await rpc('bridgepoint_horizon_account_link_v4340',{p_player_id:ident.id,p_player_secret:ident.secret,p_handle:name,p_banner_key:state.account.banner_key||'banner_founder',p_icon_key:state.account.icon_key||'icon_skull'});
      await refreshAuthState();
    }else{
      const out=await rpc('bridgepoint_horizon_bootstrap_v4300',{p_player_id:ident.id,p_player_secret:ident.secret,p_display_name:name});state.player=out.player;
    }
    localStorage.setItem('horizon-player-profile',JSON.stringify(state.player));await refreshParty();
  }catch(err){status(err.message);if(state.account)$('displayName').value=state.account.handle}
});

function markMode(){
  document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.selectedMode));
  const d=state.config?.modes?.find(m=>m.key===state.selectedMode);
  if(!d){$('playSub').textContent='';syncPlayAvailability();return}
  if(d.key==='YEAR_ONE'){
    const c=yearOneCountdownParts();
    $('playSub').textContent=state.yearOne?.status==='LIVE'
      ?`DAY ${state.yearOne.current_day} · PVE ONLY · ${state.yearOne.player?.lives_remaining??3} lives`
      :c?`OCT 1 · ${c.days}D ${String(c.hours).padStart(2,'0')}H ${String(c.minutes).padStart(2,'0')}M`:'OCT 1 · 12:00 AM ET';
  }else if(d.key==='TDM')$('playSub').textContent='100 players · solo / duo / trio / squad · 50 maps · 10-second vote · bot backfill';
  else $('playSub').textContent='';
  renderYearOneCountdown();syncPlayAvailability();
}
document.querySelectorAll('.mode').forEach(btn=>btn.addEventListener('click',async()=>{
  const mode=btn.dataset.mode;
  const count=state.party?.members?.length||1;
  const cfg=state.config?.modes?.find(m=>m.key===mode);
  if(cfg?.solo&&count>1){status('Year One is solo. Leave the party first.');return}
  const meHost=state.party?.host_player_id===ident.id;
  if(!meHost){status('Party leader chooses the mode');return}
  try{
    const snap=await rpc('bridgepoint_horizon_select_mode_v4300',{p_player_id:ident.id,p_player_secret:ident.secret,p_mode:mode});
    state.party=snap.party;state.selectedMode=mode;state.queueing=false;markMode();renderParty();
  }catch(e){status(e.message)}
}));

$('playBtn').onclick=async()=>{
  if(!state.account){openModal('ACCOUNT');status('Create or sign in to a free Horizon account before playing.');return}
  if(state.party?.host_player_id!==ident.id){status('Party leader starts matchmaking');return}
  state.queueing=true;syncPlayAvailability();
  try{
    if(state.selectedMode==='YEAR_ONE'){
      await refreshYearOneStatus();
      if(state.yearOne?.status!=='LIVE')throw new Error('Year One unlocks October 1 at 12:00 AM Eastern.');
      status('Locking your precise spawn location…');
      const loc=await getPreciseLocation();
      const entered=await rpc('bridgepoint_horizon_year_one_enter_v4340',{
        p_player_id:ident.id,p_player_secret:ident.secret,
        p_lat:loc.lat,p_lon:loc.lon,p_accuracy_m:loc.accuracy_m,p_altitude_m:loc.altitude_m
      });
      const snap=await rpc('bridgepoint_horizon_match_snapshot_v4300',{p_player_id:ident.id,p_player_secret:ident.secret});
      if(!entered?.ok||!snap?.match)throw new Error('Year One world could not be opened at your location.');
      state.match=snap.match;
      status('Location locked · loading the BridgePoint world around you');
      showLoading(snap.match);
      return;
    }
    const q=await rpc('bridgepoint_horizon_queue_v4340',{p_player_id:ident.id,p_player_secret:ident.secret});
    status(q.queued?`Finding match… ${state.selectedMap?.display_name||'rotating map pool'} · direct P2P host will be elected`:'Solo world ready');
    pollMatch();
  }catch(e){
    state.queueing=false;status(e.message);syncPlayAvailability();
  }
};

let matchPoll=null;
async function pollMatch(){
  clearInterval(matchPoll);
  const check=async()=>{
    try{
      const r=await rpc('bridgepoint_horizon_match_snapshot_v4300',{p_player_id:ident.id,p_player_secret:ident.secret});
      if(r?.match){
        clearInterval(matchPoll);state.match=r.match;showLoading(r.match);return;
      }
      $('playLabel').textContent='SEARCHING';
    }catch(e){status(e.message)}
  };
  await check();matchPoll=setInterval(check,1000);
}

function hashSeed(x){
  let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return BigInt(h||1);
}
function drawUsLocator(match,progress=0){
  const cv=$('mapCanvas'),g=cv.getContext('2d'),W=cv.width,H=cv.height,geo=state.conusOutline?.geometry;
  const meta=match?.metadata||{},targetLon=Number(meta.world_lon),targetLat=Number(meta.world_lat);
  const full={minLon:-125,maxLon:-66,minLat:24,maxLat:50},local={minLon:targetLon-2.6,maxLon:targetLon+2.6,minLat:targetLat-1.7,maxLat:targetLat+1.7};
  const t=Math.max(0,Math.min(1,progress)),ease=t*t*(3-2*t),box={minLon:full.minLon+(local.minLon-full.minLon)*ease,maxLon:full.maxLon+(local.maxLon-full.maxLon)*ease,minLat:full.minLat+(local.minLat-full.minLat)*ease,maxLat:full.maxLat+(local.maxLat-full.maxLat)*ease};
  const xy=(lon,lat)=>[(lon-box.minLon)/(box.maxLon-box.minLon)*W,H-(lat-box.minLat)/(box.maxLat-box.minLat)*H];
  g.clearRect(0,0,W,H);const grad=g.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#071714');grad.addColorStop(1,'#020706');g.fillStyle=grad;g.fillRect(0,0,W,H);
  g.strokeStyle='rgba(89,255,206,.68)';g.fillStyle='rgba(34,98,79,.18)';g.lineWidth=2;
  const polys=geo?.type==='MultiPolygon'?geo.coordinates:geo?.type==='Polygon'?[geo.coordinates]:[];
  for(const poly of polys){for(const ring of poly){g.beginPath();ring.forEach((p,i)=>{const q=xy(p[0],p[1]);i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])});g.closePath();g.fill();g.stroke()}}
  if(Number.isFinite(targetLon)&&Number.isFinite(targetLat)){
    const q=xy(targetLon,targetLat),r=progress<.75?9:Math.max(22,80*progress);g.strokeStyle='#f4c45e';g.lineWidth=3;g.strokeRect(q[0]-r,q[1]-r*.65,r*2,r*1.3);g.fillStyle='#f4c45e';g.beginPath();g.arc(q[0],q[1],5,0,Math.PI*2);g.fill();
    g.font='900 18px system-ui';g.fillText(String(match.map_label||'COMBAT CELL').toUpperCase(),Math.min(W-250,q[0]+14),Math.max(30,q[1]-14));
  }
  g.fillStyle='rgba(226,255,244,.68)';g.font='800 12px system-ui';g.fillText(progress<.55?'CONTIGUOUS U.S. · LOCATING COMBAT CELL':'ZOOMING TO REAL LOCATION',22,28);
}
function animateUsToMap(match,duration=1350){
  return new Promise(resolve=>{const start=performance.now();const tick=now=>{const p=Math.min(1,(now-start)/duration);drawUsLocator(match,p);if(p<1)requestAnimationFrame(tick);else resolve()};requestAnimationFrame(tick)});
}
function drawWorldCellPreview(match,payload){
  const cv=$('mapCanvas'),g=cv.getContext('2d'),W=cv.width,H=cv.height,b=payload?.bbox;
  if(!b){drawMap(match);return}
  const west=Number(b.west),east=Number(b.east),south=Number(b.south),north=Number(b.north),xy=p=>[(Number(p[0])-west)/(east-west)*W,H-(Number(p[1])-south)/(north-south)*H];
  const ringsOf=geom=>!geom?[]:geom.type==='Polygon'?[geom.coordinates?.[0]||[]]:geom.type==='MultiPolygon'?(geom.coordinates||[]).map(x=>x?.[0]||[]):[];
  const linesOf=geom=>!geom?[]:geom.type==='LineString'?[geom.coordinates||[]]:geom.type==='MultiLineString'?geom.coordinates||[]:[];
  g.clearRect(0,0,W,H);g.fillStyle='#07110f';g.fillRect(0,0,W,H);
  for(const row of payload.water||[])for(const ring of ringsOf(row.geometry)){g.beginPath();ring.forEach((p,i)=>{const q=xy(p);i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])});g.closePath();g.fillStyle='rgba(53,129,170,.40)';g.fill()}
  g.strokeStyle='rgba(132,231,208,.34)';g.lineWidth=1.4;for(const row of payload.transport||[])for(const line of linesOf(row.geometry)){g.beginPath();line.forEach((p,i)=>{const q=xy(p);i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])});g.stroke()}
  const buildings=(payload.buildings||[]).slice(0,1800).map(row=>{const ring=ringsOf(row.geometry)[0]||[];const pts=ring.map(xy),avg=pts.length?pts.reduce((s,p)=>s+p[1],0)/pts.length:0;return{row,pts,avg}}).filter(x=>x.pts.length>=3).sort((a,b)=>a.avg-b.avg);
  for(const bld of buildings){
    const h=Math.max(4,Math.min(38,Number(bld.row?.height_m||bld.row?.height||bld.row?.floors*3||9)*.58)),base=bld.pts,top=base.map(p=>[p[0],p[1]-h]);
    for(let i=0;i<base.length;i++){const j=(i+1)%base.length;g.beginPath();g.moveTo(base[i][0],base[i][1]);g.lineTo(base[j][0],base[j][1]);g.lineTo(top[j][0],top[j][1]);g.lineTo(top[i][0],top[i][1]);g.closePath();g.fillStyle=i%2?'rgba(70,103,94,.28)':'rgba(48,77,70,.36)';g.fill()}
    g.beginPath();top.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fillStyle='rgba(214,242,231,.24)';g.fill();g.strokeStyle='rgba(174,255,226,.34)';g.stroke();
  }
  g.strokeStyle='#f4c45e';g.lineWidth=3;g.strokeRect(4,4,W-8,H-8);g.fillStyle='#dffff4';g.font='900 16px system-ui';g.fillText(String(match.map_label||'HORIZON SECTOR').toUpperCase()+' · SOURCE-BACKED 3D CELL PREVIEW',18,28);
}
function voteTone(sec){
  try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;voteTone.ctx=voteTone.ctx||new A();const o=voteTone.ctx.createOscillator(),gain=voteTone.ctx.createGain();o.frequency.value=sec<=3?880:520;gain.gain.setValueAtTime(.05,voteTone.ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,voteTone.ctx.currentTime+.11);o.connect(gain).connect(voteTone.ctx.destination);o.start();o.stop(voteTone.ctx.currentTime+.12)}catch{}
}
async function runMapVote(match){
  if(match.mode!=='TDM')return match;
  const candidates=Array.isArray(match.metadata?.map_vote_candidates)?match.metadata.map_vote_candidates:[];
  if(candidates.length<2)return match;
  const panel=$('mapVote'),opts=$('mapVoteOptions');panel.hidden=false;
  const mk=(x,label)=>`<button data-vote="${escapeHtml(x)}"><b>${escapeHtml(label)}</b><small>VOTE</small></button>`;
  opts.innerHTML=mk(candidates[0].map_key,candidates[0].display_name)+mk(candidates[1].map_key,candidates[1].display_name)+mk('random','RANDOM');
  let selected='';opts.querySelectorAll('[data-vote]').forEach(b=>b.onclick=async()=>{selected=b.dataset.vote;opts.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));const out=await rpc('bridgepoint_horizon_map_vote_v4340',{p_player_id:ident.id,p_player_secret:ident.secret,p_match_id:match.match_id,p_vote_key:selected}).catch(()=>null);if(out?.counts)opts.querySelectorAll('[data-vote]').forEach(x=>{const small=x.querySelector('small');if(small)small.textContent='VOTE · '+Number(out.counts[x.dataset.vote]||0)})});
  const end=Date.parse(match.metadata?.map_vote_ends_at||'')||Date.now()+10000;let last=-1;
  while(Date.now()<end){const sec=Math.max(1,Math.ceil((end-Date.now())/1000));$('launchCount').textContent=String(sec);$('loadingStatus').textContent='Vote: '+candidates[0].display_name+' · '+candidates[1].display_name+' · Random';if(sec!==last){voteTone(sec);last=sec}await new Promise(r=>setTimeout(r,120))}
  const out=await rpc('bridgepoint_horizon_map_vote_resolve_v4340',{p_player_id:ident.id,p_player_secret:ident.secret,p_match_id:match.match_id});
  panel.hidden=true;const resolved={...match,map_label:out?.map_label||match.map_label,metadata:out?.metadata||match.metadata};
  $('mapName').textContent=String(resolved.map_label||'HORIZON SECTOR').toUpperCase();return resolved;
}
function drawMap(match){
  const c=$('mapCanvas'),g=c.getContext('2d'),rng=new DeterministicRng(hashSeed(match.seed));
  const palettes={
    'toxic-dawn':['#0c2b24','#2a5d4d','#73ffc6','#e1bf66'],
    'storm-violet':['#15122e','#39325f','#8d76ff','#71e9d0'],
    'ember-night':['#21120f','#5a3021','#e46a45','#f5c76b'],
    'cold-moon':['#0f2026','#23424e','#65bcd2','#d8f4ed']
  };
  const p=palettes[match.map_palette]||palettes['cold-moon'];
  g.fillStyle=p[0];g.fillRect(0,0,c.width,c.height);
  g.strokeStyle='rgba(255,255,255,.07)';g.lineWidth=2;
  for(let i=0;i<9;i++){const y=40+i*58;g.beginPath();g.moveTo(0,y);g.lineTo(c.width,y+rng.int(-25,25));g.stroke()}
  for(let i=0;i<13;i++){const x=35+i*70;g.beginPath();g.moveTo(x,0);g.lineTo(x+rng.int(-35,35),c.height);g.stroke()}
  const labels=['HIGHRISE','RAIL YARD','MARKET','GARAGE','WATERFRONT','HOSPITAL','WAREHOUSE','SUBSTATION','OLD TOWN','ROOFTOPS'];
  for(let i=0;i<28;i++){
    const x=rng.int(22,c.width-145),y=rng.int(30,c.height-90),w=rng.int(45,125),h=rng.int(28,82);
    g.fillStyle=i%5===0?p[1]:'rgba(12,25,22,.88)';g.fillRect(x,y,w,h);
    g.strokeStyle=i%7===0?p[2]:'rgba(255,255,255,.09)';g.strokeRect(x,y,w,h);
  }
  g.font='700 16px system-ui';g.fillStyle='rgba(235,255,247,.86)';
  labels.slice(0,6).forEach((l,i)=>g.fillText(l,rng.int(40,c.width-180),60+i*72));
  g.font='900 12px system-ui';g.fillStyle=p[2];g.fillText('SPAWN A',40,c.height-35);g.fillStyle=p[3];g.fillText('SPAWN B',c.width-115,36);
}
function idbOpen(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('bridgepoint-horizon-cache',2);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('worldCells'))db.createObjectStore('worldCells')};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
async function cacheGet(key){
  try{const db=await idbOpen();return await new Promise((resolve,reject)=>{const tx=db.transaction('worldCells','readonly'),r=tx.objectStore('worldCells').get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}catch{return null}
}
async function cachePut(key,value){
  try{const db=await idbOpen();await new Promise((resolve,reject)=>{const tx=db.transaction('worldCells','readwrite');tx.objectStore('worldCells').put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}catch{}
}
function deviceClass(){
  const mem=Number(navigator.deviceMemory||0),cores=Number(navigator.hardwareConcurrency||0);
  if(/Android|iPhone|iPad/i.test(navigator.userAgent))return mem>=8||cores>=8?'mobile-high':'mobile';
  return 'desktop';
}
async function loadWorldCell(match){
  const m=match.metadata||{},stateCode=m.world_state,lat=Number(m.world_lat),lon=Number(m.world_lon),span=Number(m.world_span_km||3.2);
  if(!stateCode||!Number.isFinite(lat)||!Number.isFinite(lon))return null;
  const key=`v3022:${stateCode}:${lat.toFixed(4)}:${lon.toFixed(4)}:${span.toFixed(1)}`;
  const cached=await cacheGet(key);
  if(cached?.payload){$('loadingStatus').textContent='World cell loaded from this phone’s cache…';return cached.payload}
  $('loadingStatus').textContent='Streaming buildings, terrain, roads and water for this match…';
  const url=new URL(`${SUPABASE_URL}/functions/v1/bridgepoint-horizon-stream-v3020`);
  url.searchParams.set('state',stateCode);url.searchParams.set('lat',String(lat));url.searchParams.set('lon',String(lon));url.searchParams.set('span_km',String(span));
  const r=await fetch(url,{headers:{apikey:PUBLISHABLE_KEY}});
  if(!r.ok)throw new Error('WORLD_CELL_'+r.status);
  const payload=await r.json();
  if(payload?.complete===false)throw new Error(payload.error||'WORLD_CELL_FAILED');
  payload.procedural_cover=generateCover(hashSeed(match.seed),18);
  await cachePut(key,{saved_at:Date.now(),payload});
  return payload;
}
async function waitForSynchronizedStart(match){
  const started=performance.now();
  try{
    state.worldCell=await loadWorldCell(match);
    if(state.worldCell)drawWorldCellPreview(match,state.worldCell);else drawMap(match);
    $('loadbarFill').style.width='72%';
    const ready=await rpc('bridgepoint_horizon_match_ready_v4302',{
      p_player_id:ident.id,p_player_secret:ident.secret,p_match_id:match.match_id,
      p_loaded_build:'web-v4302',p_ping_ms:Math.round(performance.now()-started),p_device_class:deviceClass()
    });
    $('loadingStatus').textContent=ready.all_humans_ready?'Everyone is loaded. Synchronizing launch…':`${ready.humans_ready}/${ready.humans_total} players loaded…`;
  }catch(e){
    console.warn(e);$('loadingStatus').textContent='World stream degraded; deterministic fallback is ready.';
    await rpc('bridgepoint_horizon_match_ready_v4302',{
      p_player_id:ident.id,p_player_secret:ident.secret,p_match_id:match.match_id,
      p_loaded_build:'web-v4302-fallback',p_ping_ms:null,p_device_class:deviceClass()
    }).catch(()=>{});
  }

  return new Promise(resolve=>{
    const poll=setInterval(async()=>{
      try{
        const r=await rpc('bridgepoint_horizon_match_snapshot_v4300',{p_player_id:ident.id,p_player_secret:ident.secret});
        if(!r?.match)return;
        state.match=r.match;
        const readyCount=r.match.members.filter(x=>x.loaded).length;
        $('loadingStatus').textContent=`${readyCount}/${r.match.human_players} players loaded · same seed locked on every device`;
        if(r.match.starts_at){clearInterval(poll);resolve(r.match)}
      }catch{}
    },500);
  });
}
async function showLoading(match){
  $('loading').classList.add('show');$('loading').setAttribute('aria-hidden','false');
  $('mapName').textContent=String(match.map_label||'HORIZON SECTOR').toUpperCase();
  $('modeMeta').textContent=match.mode;$('humanMeta').textContent=`${match.human_players} HUMANS`;$('botMeta').textContent=`${match.bot_players} BOTS`;
  drawUsLocator(match,0);$('loadbarFill').style.width='10%';
  const voted=await runMapVote(match);
  await animateUsToMap(voted);$('loadbarFill').style.width='28%';
  const synchronized=await waitForSynchronizedStart(voted);
  connectMatchSignal(synchronized);startHostLease(synchronized);
  $('loadingStatus').textContent='Map loaded · moving into the 10-second in-world countdown…';
  $('loadbarFill').style.width='100%';$('launchCount').textContent='READY';
  const meta=synchronized.metadata||{};
  localStorage.setItem('horizon-active-match',JSON.stringify({
    match_id:synchronized.match_id,mode:synchronized.mode,seed:synchronized.seed,
    host_player_id:synchronized.host_player_id,cell_seed:synchronized.cell_seed,
    network_topic:synchronized.network_topic,started_at:new Date().toISOString(),
    human_players:synchronized.human_players,bot_players:synchronized.bot_players,
    target_players:synchronized.target_players,team_size:synchronized.team_size,
    members:synchronized.members||[],map_label:synchronized.map_label,map_palette:synchronized.map_palette,map_key:meta.map_key||null
  }));
  const u=new URL('/app/horizon-playable/v2-entry.html',location.origin);
  if(meta.world_state)u.searchParams.set('state',meta.world_state);
  if(meta.world_lat)u.searchParams.set('lat',meta.world_lat);
  if(meta.world_lon)u.searchParams.set('lon',meta.world_lon);
  if(meta.world_span_km)u.searchParams.set('span_km',meta.world_span_km);
  u.searchParams.set('mode',synchronized.mode);u.searchParams.set('match',synchronized.match_id);u.searchParams.set('seed',synchronized.seed);
  u.searchParams.set('prematch','10');location.assign(u.toString());
}

function weaponSvg(name){
  const type=/shotgun|rifle|smg|lmg|sidearm|pistol|revolver/i.test(name)?'gun':/grenade|betty|claymore|charge|decoy/i.test(name)?'grenade':'melee';
  if(type==='gun')return `<svg viewBox="0 0 80 36"><path d="M6 13h41l8 5h18v7H54l-7 4H30l-5-7H6z"/><path d="M38 25h8l4 10H39z"/></svg>`;
  if(type==='grenade')return `<svg viewBox="0 0 80 36"><path d="M29 9h24l7 8-4 15H26l-5-15z"/><path d="M37 3h12v7H37z"/></svg>`;
  return `<svg viewBox="0 0 80 36"><path d="M8 25 61 6l5 6-52 20z"/><path d="m56 5 11-4 6 9-9 5z"/></svg>`;
}
function money(cents,currency='USD'){return new Intl.NumberFormat(undefined,{style:'currency',currency}).format((cents||0)/100)}
function rewardArt(item){
  const ref=String(item.preview_ref||''),kind=String(item.preview_kind||'').toUpperCase();
  if(kind==='MODEL_RENDER'&&ref){
    return `<div class="preview"><canvas class="preview3d" data-model="${escapeHtml(ref)}" data-variant="1"></canvas></div>`;
  }
  if(kind==='RUNTIME_RENDER'&&ref){
    return `<div class="preview"><canvas class="preview3d runtime3d" data-runtime="${escapeHtml(ref)}"></canvas></div>`;
  }
  const fallback='catalog://reward/'+encodeURIComponent(String(item.reward_type||item.category||item.sku||item.reward_key||'horizon'));
  return `<div class="preview"><canvas class="preview3d runtime3d" data-runtime="${escapeHtml(fallback)}"></canvas></div>`;
}
function yearClockHtml(y){
  const c=y?.countdown||{days:365,hours:0,minutes:0,seconds:0};
  return `<div class="year-clock"><div><b>${c.days}</b><small>DAYS</small></div><div><b>${c.hours}</b><small>HOURS</small></div><div><b>${c.minutes}</b><small>MINUTES</small></div><div><b>${c.seconds}</b><small>SECONDS</small></div></div>`;
}
function leaderRows(rows=[]){return rows.map(r=>`<div class="leader-row"><b>#${r.rank}</b><span>@${escapeHtml(r.handle||'Survivor')} · LV ${r.level||1} · P${r.prestige||0}</span><span>${Number(r.kills||0).toLocaleString()} K</span><span>${Number(r.wins||0).toLocaleString()} W</span><span>${Math.floor(Number(r.play_seconds||0)/3600)}H</span></div>`).join('')||'<p style="color:#95aaa0">No ranked players yet.</p>'}
let directorTimer=null,partyChatTimer=null;
function drawDirectorMap(canvas,target=null){
  if(!canvas)return;const g=canvas.getContext('2d'),W=canvas.width,H=canvas.height,geo=state.conusOutline?.geometry;
  g.clearRect(0,0,W,H);const grad=g.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#071714');grad.addColorStop(1,'#020706');g.fillStyle=grad;g.fillRect(0,0,W,H);
  const xy=(lon,lat)=>[(lon+125)/59*W,H-(lat-24)/26*H],polys=geo?.type==='MultiPolygon'?geo.coordinates:geo?.type==='Polygon'?[geo.coordinates]:[];
  g.fillStyle='rgba(39,103,82,.22)';g.strokeStyle='rgba(98,255,210,.62)';g.lineWidth=1.4;
  for(const poly of polys)for(const ring of poly){g.beginPath();ring.forEach((p,i)=>{const q=xy(p[0],p[1]);i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])});g.closePath();g.fill();g.stroke()}
  if(Number.isFinite(Number(target?.lon))&&Number.isFinite(Number(target?.lat))){
    const q=xy(Number(target.lon),Number(target.lat));g.fillStyle='#f4c45e';g.beginPath();g.arc(q[0],q[1],6,0,Math.PI*2);g.fill();g.strokeStyle='rgba(244,196,94,.42)';g.lineWidth=2;g.beginPath();g.arc(q[0],q[1],14,0,Math.PI*2);g.stroke()
  }
}
async function refreshDirectorPanel(){
  try{
    const out=await rpc('bridgepoint_horizon_world_director_v4340',{}),box=$('directorStatus'),cv=$('directorMap'),t=out?.target||{};
    if(box)box.innerHTML='<b>'+escapeHtml(String(out?.source||'WORLD').replaceAll('_',' '))+'</b><small>'+Number(out?.active_players||0)+' ACTIVE · AUTO SWITCH '+Number(out?.rotation_seconds||12)+'S</small><span>'+escapeHtml(t.handle||t.scene||'Zombie world overview')+(t.mode?' · '+escapeHtml(t.mode):'')+'</span>';
    drawDirectorMap(cv,t);
  }catch{}
}
async function openModal(tab){
  $('installBanner')?.classList.add('hidden');
  const c=$('modalContent');
  if(tab==='ACCOUNT'){
    if(!state.session){
      c.innerHTML=`<div class="eyebrow">FREE HORIZON ACCOUNT</div><h1>Sign in or create your player identity</h1><p class="account-callout">A free account is required to play. Your unique handle, survivor progress, persistent Year One location, exploration, levels, prestige and unlocks attach to this account.</p><div class="auth-grid"><label>EMAIL<input id="authEmail" type="email" autocomplete="email" placeholder="you@example.com"></label><label>PASSWORD<input id="authPassword" type="password" autocomplete="current-password" minlength="8" placeholder="8+ characters"></label><label>UNIQUE HANDLE<input id="authHandle" maxlength="20" placeholder="3-20 letters, numbers, _" value="${escapeHtml($('displayName')?.value||'')}"></label></div><div class="auth-actions"><button data-auth-action="signup">CREATE FREE ACCOUNT</button><button data-auth-action="signin">SIGN IN</button></div><small style="color:#91a69e">If email confirmation is enabled, confirm the email once, then return and sign in.</small>`;
    }else if(!state.account){
      c.innerHTML=`<div class="eyebrow">PLAYER SETUP</div><h1>Claim your unique Horizon handle</h1><p class="account-callout">Handles are case-insensitive and cannot duplicate another player.</p><div class="auth-grid"><label>UNIQUE HANDLE<input id="authHandle" maxlength="20" placeholder="3-20 letters, numbers, _" value="${escapeHtml($('displayName')?.value||'')}"></label><label>BANNER<select id="authBanner"><option value="banner_founder">Foundry</option><option value="banner_storm">Stormline</option></select></label><label>3D PROFILE ICON<select id="authIcon"><option value="icon_skull">Skull</option><option value="icon_rose">Rose</option><option value="icon_alien">Alien</option></select></label></div><div class="auth-actions"><button data-auth-action="link">SAVE PLAYER PROFILE</button><button data-auth-action="signout">SIGN OUT</button></div>`;
    }else{
      c.innerHTML=`<div class="eyebrow">HORIZON ACCOUNT</div><h1>@${escapeHtml(state.account.handle)}</h1><p class="account-callout">Your account is linked. Year One returns you to your saved world position; your exploration, combat totals, levels, prestige and unlocks persist server-side.</p><div class="stats-grid"><article class="stats-card"><h3>LEVEL</h3><b>${state.stats?.level||1}</b></article><article class="stats-card"><h3>PRESTIGE</h3><b>${state.stats?.prestige||0} / 15</b></article><article class="stats-card"><h3>KILLS</h3><b>${Number(state.stats?.total_kills||0).toLocaleString()}</b></article><article class="stats-card"><h3>PLAY TIME</h3><b>${Math.floor(Number(state.stats?.play_seconds||0)/3600)}H</b></article></div><div class="auth-actions"><button data-open-customizer>CUSTOMIZE CHARACTER</button><button data-auth-action="signout">SIGN OUT</button></div>`;
    }
  }else if(tab==='CUSTOMIZE'){
    const a=state.character?.appearance||{},pres=state.character?.presentation||'UNSPECIFIED',preset=state.character?.preset_key||'nova';
    c.innerHTML=`<div class="eyebrow">CHARACTER CREATOR · STYLIZED HORIZON</div><h1>Build your survivor</h1><p style="color:#95aaa0">Choose a stylized base and customize the visible identity. Owned store, battle-pass and prestige characters remain switchable from your locker.</p><div class="customizer-grid"><div class="customizer-preview"><canvas class="preview3d runtime3d" width="360" height="300" data-runtime="catalog://character/${escapeHtml(preset)}"></canvas></div><label>PRESENTATION<select id="customPresentation"><option ${pres==='MALE'?'selected':''}>MALE</option><option ${pres==='FEMALE'?'selected':''}>FEMALE</option><option ${pres==='UNSPECIFIED'?'selected':''}>UNSPECIFIED</option></select></label><label>PRESET<select id="customPreset"><option value="nova" ${preset==='nova'?'selected':''}>Nova</option><option value="riot" ${preset==='riot'?'selected':''}>Riot</option><option value="moxie" ${preset==='moxie'?'selected':''}>Moxie</option><option value="vanta" ${preset==='vanta'?'selected':''}>Vanta</option><option value="cipher" ${preset==='cipher'?'selected':''}>Cipher</option></select></label><label>HAIR<select id="customHair"><option>FADE</option><option>BRAIDS</option><option>CURLS</option><option>WAVES</option><option>MOHAWK</option><option>LONG</option><option>BUZZ</option></select></label><label>EYES<select id="customEyes"><option>ROUND</option><option>SHARP</option><option>WIDE</option><option>HEAVY</option></select></label><label>EYE COLOR<input id="customEyeColor" type="color" value="${escapeHtml(a.eye_color||'#5ec8ff')}"></label><label>HAIR COLOR<input id="customHairColor" type="color" value="${escapeHtml(a.hair_color||'#22170f')}"></label><label>SKIN TONE<input id="customSkin" type="color" value="${escapeHtml(a.skin_tone||'#a96f50')}"></label><label>TOP COLOR<input id="customTop" type="color" value="${escapeHtml(a.top_color||'#245f55')}"></label><label>BOTTOM COLOR<input id="customBottom" type="color" value="${escapeHtml(a.bottom_color||'#242b32')}"></label><label>SHOES<select id="customShoes"><option>TACTICAL</option><option>HIGHTOP</option><option>RUNNER</option><option>BOOT</option></select></label><label>BACKPACK<select id="customBackpack"><option>NONE</option><option>SCOUT</option><option>FIELD</option><option>TECH</option></select></label><label>HEADWEAR<select id="customHeadwear"><option>NONE</option><option>CAP</option><option>BEANIE</option><option>HOOD</option><option>HELMET</option></select></label><label>SUNGLASSES<select id="customGlasses"><option>NONE</option><option>AVIATOR</option><option>VISOR</option><option>ROUND</option><option>SPORT</option></select></label></div><div class="customizer-actions"><button data-save-customizer>SAVE CHARACTER</button><button data-tab-jump="LOCKER">OWNED CHARACTERS</button></div>`;
  }else if(tab==='RULES'){
    c.innerHTML=`<div class="eyebrow">OFFICIAL HORIZON RULES · V4340</div><h1>How Horizon works</h1><div class="rules-grid">
      <article><h3>YEAR ONE · 365 DAYS</h3><ul><li>Launch: October 1, 2026 at 12:00 AM Eastern. The season runs 365 days.</li><li>First-person, PvE: players cannot damage one another in Year One.</li><li>Three lives. Base health 100. Shield is separate, +50 per jug up to 100, for 200 combined maximum.</li><li>Monster contact deals exactly 25, shield first. The zombie-wall hazard deals 25-point ticks.</li></ul></article>
      <article><h3>THE ZOMBIE WALL</h3><ul><li>Year One is the contiguous 48-state United States only—no Alaska, Hawaii or territories.</li><li>A literal dense wall of slow zombies follows the U.S. border and closes inward through the season.</li><li>Late season converges toward New York, Chicago, Los Angeles, Dallas and Atlanta, with final city zones tightening through day 365.</li><li>The wall is not a place you can hide inside: entering the unsafe side causes repeated 25-point damage.</li></ul></article>
      <article><h3>PERSISTENT WORLD</h3><ul><li>Your first Year One entry uses precise device location; later sessions return to your last server checkpoint.</li><li>Visited minimap cells stay discovered. Health, shield, location, inventory, ammo, kills and loot progress persist.</li><li>All active survivors share the same deterministic U.S. world and can encounter each other at matching coordinates, while Year One remains non-PvP.</li><li>An active-player counter and world-director camera track the live event.</li></ul></article>
      <article><h3>ACTIVITY & ANTI-CHEAT</h3><ul><li>Qualifying daily participation target: 15 minutes.</li><li>After 48 hours without a checkpoint, inactivity decay begins every 12 hours.</li><li>Each inactivity tick removes 25 directly from health; shield does not block it. Continued absence can consume lives and eliminate the survivor.</li><li>Signing out does not move your survivor to safety or erase world progress.</li></ul></article>
      <article><h3>ZOMBIES & HORDES</h3><ul><li>Random walkers, runners, dogs, spiders, orcs and other monsters remain throughout the world. Dogs travel in packs.</li><li>Dead monsters replenish after roughly two minutes, away from the player, and pressure scales with activity so hordes can keep forming.</li><li>Rain raises zombie pressure. Wildfire raises zombie-dog pressure. Aggro persists once a monster locks onto a player.</li><li>Health targets remain: spider 75, zombie dog 75, regular zombie 100, big orc 150, unspecified monsters 100.</li></ul></article>
      <article><h3>LOOT, INVENTORY & VEHICLES</h3><ul><li>Three-second dwell pickup. Five quick slots plus five backpack slots.</li><li>World loot instances are finite: once claimed, that exact instance does not reappear. Death drops eligible carried weapons, ammo, shields and items.</li><li>Ammo is scarce, normally one to four spare clips by weapon.</li><li>Vehicles require found parts such as a spark plug, wheels and gas before driving.</li></ul></article>
      <article><h3>WORLD & WEATHER</h3><ul><li>Source-backed buildings, roads, terrain and water are streamed from BridgePoint world data where available.</li><li>Solid collision applies to buildings, walls, cars, trees and cover; stairs require real openings at the upper floor.</li><li>Water is enterable, but remaining still causes sinking and 25-point damage after a grace period.</li><li>Local daylight follows real-world time. Live public weather/hazard feeds affect the simulation; cold exposure requires warmth/fire.</li></ul></article>
      <article><h3>TEAM DEATHMATCH</h3><ul><li>100-player target, 50-vs-50 team population, with solo/duo/trio/squad parties and moderate bot backfill when human population is short.</li><li>50 compact dense real-location maps. Before launch, players vote between two maps or Random during a 10-second audible vote.</li><li>Three builds maximum, five quick slots plus five backpack slots, limited ammo, kill feed, remaining-player count and killcam.</li><li>After death, gameplay returns to the lobby instead of silently auto-respawning the local player.</li></ul></article>
      <article><h3>LEVELS & PRESTIGE</h3><ul><li>Kills and activity award XP. Early levels require less XP; high levels take progressively more.</li><li>At level 100 you may prestige, up to Prestige 15.</li><li>Each prestige offers a choice among three character rewards plus escalating visible unlocks such as prestige cosmetics, vehicle customization and weapon variants.</li><li>Profiles track total kills, top weapon, wins, time, XP, level and prestige.</li></ul></article>
      <article><h3>ACCOUNTS & COSMETICS</h3><ul><li>A free authenticated account is required to play. Handles are unique and case-insensitive.</li><li>Banners, profile icons and characters come from starter, store, battle-pass and prestige catalogs.</li><li>Character creator supports male, female or unspecified presentation and stylized presets with hair, eyes, colors, clothing, shoes, backpacks, headwear and glasses.</li><li>Store checkout remains owner-locked until BridgePoint deliberately enables payment.</li></ul></article>
    </div>`;
  }else if(tab==='ABOUT'){
    c.innerHTML=`<div class="eyebrow">ABOUT BRIDGEPOINT HORIZON</div><h1>A real-world spatial backend turned into a playable world.</h1><div class="rules-grid"><article><h3>WHAT IT IS</h3><p>BridgePoint Horizon is the consumer/game side of BridgePoint Intelligence. Horizon turns BridgePoint's world-stream systems—real-world buildings, terrain, roads, water and live environmental context—into first-person survival and team combat.</p></article><article><h3>LIVE WORLD</h3><p>Horizon connects live public weather and hazard information to the game world and uses real local daylight. Year One adds a persistent continental survival state while TDM turns dense real locations into compact combat cells.</p></article><article><h3>BUILT BY</h3><p>Horizon is built by Kole Johnson, founder and CEO of BridgePoint Intelligence. It grew from the same data and mapping work behind BridgePoint Intelligence rather than from a separate fictional map database.</p></article><article><h3>STILL EVOLVING</h3><p>Higher-fidelity character/monster art, deeper animations, additional interior detail, broader authoritative world coverage and expanded cosmetics continue to be upgraded. The site separates already-running systems from targets still being improved.</p></article></div>`;
  }else if(tab==='STATS'){
    const [out,top,prestige]=await Promise.all([
      rpc('bridgepoint_horizon_leaderboard_v4340',{p_metric:'KILLS',p_limit:25}).catch(()=>({leaders:[]})),
      state.account?rpc('bridgepoint_horizon_top_weapon_v4340',{p_player_id:ident.id,p_player_secret:ident.secret}).catch(()=>({display_name:'NONE',kills:0})):Promise.resolve({display_name:'NONE',kills:0}),
      state.account?rpc('bridgepoint_horizon_prestige_choices_v4340',{p_player_id:ident.id,p_player_secret:ident.secret}).catch(()=>null):Promise.resolve(null)
    ]);
    const own=state.stats||{};
    const prestigeHtml=prestige?.eligible?`<section class="prestige-choice"><div class="eyebrow">PRESTIGE ${prestige.next_prestige} READY</div><h2>Choose one permanent character reward</h2><p>Prestiging resets your level to 1, keeps your recorded career totals, advances your prestige badge, and unlocks the next prestige tier of weapons/cosmetics.</p><div class="catalog-grid">${(prestige.choices||[]).map(x=>`<article class="catalog-card"><canvas class="preview3d runtime3d" data-runtime="${escapeHtml(x.preview_ref)}"></canvas><span class="eyebrow">CHOICE ${x.choice_no}</span><h3>${escapeHtml(x.display_name)}</h3><button data-prestige-choice="${x.choice_no}">PRESTIGE WITH THIS CHARACTER</button></article>`).join('')}</div></section>`:prestige?.prestige>=15?'<p class="account-callout">PRESTIGE 15 MAX REACHED</p>':'';
    c.innerHTML=`<div class="eyebrow">HORIZON LIVE STATS</div><h1>Player totals & world leaderboard</h1><div class="stats-grid"><article class="stats-card"><h3>YOUR KILLS</h3><b>${Number(own.total_kills||0).toLocaleString()}</b></article><article class="stats-card"><h3>WINS</h3><b>${Number(own.wins||0).toLocaleString()}</b></article><article class="stats-card"><h3>LEVEL</h3><b>${own.level||1}</b></article><article class="stats-card"><h3>PRESTIGE</h3><b>${own.prestige||0} / 15</b></article><article class="stats-card"><h3>TOP WEAPON</h3><b>${escapeHtml(top?.display_name||'NONE')}</b><small>${Number(top?.kills||0).toLocaleString()} KILLS</small></article><article class="stats-card"><h3>XP</h3><b>${Number(own.xp||0).toLocaleString()}</b></article></div>${prestigeHtml}<div class="metric-tabs"><button data-leader-metric="KILLS">KILLS</button><button data-leader-metric="WINS">WINS</button><button data-leader-metric="TIME">TIME PLAYED</button><button data-leader-metric="XP">XP</button></div><div class="leaderboard" id="leaderboardRows">${leaderRows(out?.leaders||[])}</div>`;
  }else if(tab==='OWNER'){
    const out=await rpc('bridgepoint_horizon_owner_audit_v4341',{}).catch(()=>null);
    if(!out){c.innerHTML='<div class="eyebrow">OWNER</div><h1>Owner access required</h1>';return}
    const ps=out.players||[],pays=out.purchases||[],signals=out.anticheat||[];
    c.innerHTML=`<div class="eyebrow">OWNER / CO-OWNER · HORIZON BACKEND</div><h1>Accounts, gameplay, purchases & anti-cheat</h1><p class="account-callout">Checkout is not connected yet, so purchase rows remain empty until Stripe is deliberately enabled. Both designated BridgePoint platform owners can see this page.</p><div class="owner-metrics"><article><h3>PLAYERS</h3><b>${ps.length}</b></article><article><h3>ACTIVE</h3><b>${state.activePlayers||0}</b></article><article><h3>PURCHASES</h3><b>${pays.length}</b></article><article><h3>UNREVIEWED FLAGS</h3><b>${signals.filter(x=>!x.reviewed).length}</b></article></div><h2>Player audit</h2><div class="leaderboard">${ps.map(p=>`<div class="leader-row"><b>LV ${p.level||1}</b><span>@${escapeHtml(p.handle||'Survivor')}<small style="display:block;color:#789087">${escapeHtml(p.email||'')}</small></span><span>${escapeHtml(p.current_mode||'OFFLINE')}</span><span>${Math.floor(Number(p.play_seconds||0)/60)}M</span><span>${Number(p.kills||0)} K · P${p.prestige||0} · ${Number(p.anticheat_unreviewed||0)} FLAGS</span></div>`).join('')||'<p>No linked Horizon accounts yet.</p>'}</div><h2>Payments</h2><div class="leaderboard">${pays.map(p=>`<div class="leader-row"><b>${escapeHtml(p.status)}</b><span>${escapeHtml(p.sku)}</span><span>${money(p.amount_cents,p.currency)}</span><span>TAX ${money(p.tax_cents,p.currency)}</span><span>${new Date(p.created_at).toLocaleString()}</span></div>`).join('')||'<p>No Horizon payments recorded. Stripe is still disconnected.</p>'}</div><h2>Anti-cheat signals</h2><div class="leaderboard">${signals.slice(0,100).map(s=>`<div class="leader-row"><b>S${s.severity}</b><span>${escapeHtml(s.signal_type)}</span><span>${escapeHtml(String(s.observed??''))}</span><span>MAX ${escapeHtml(String(s.expected_max??''))}</span><span>${new Date(s.created_at).toLocaleString()}</span></div>`).join('')||'<p>No anti-cheat signals.</p>'}</div>`;
  }else if(tab==='PARTY'){
    if(!state.account){c.innerHTML='<div class="eyebrow">PARTY</div><h1>Sign in to use squad chat</h1>';return}
    c.innerHTML=`<div class="eyebrow">SQUAD COMMS</div><h1>Party chat & headset voice</h1><p style="color:#95aaa0">Text chat is party-only. Voice uses direct WebRTC audio and your browser/device microphone permission; headset routing follows the device/browser audio output.</p><div class="auth-actions"><button data-party-voice>ENABLE HEADSET VOICE</button></div><div id="partyChatLog" class="party-chat-log"></div><div class="party-chat-compose"><input id="partyChatInput" maxlength="280" placeholder="Message your squad"><button data-party-send>SEND</button></div>`;
    let after=0;const refresh=async()=>{const out=await rpc('bridgepoint_horizon_party_chat_v4341',{p_player_id:ident.id,p_player_secret:ident.secret,p_after_id:after}).catch(()=>({messages:[]})),log=$('partyChatLog');for(const m of out.messages||[]){after=Math.max(after,Number(m.id||0));if(log)log.insertAdjacentHTML('beforeend',`<div><b>@${escapeHtml(m.handle)}</b><span>${escapeHtml(m.message)}</span></div>`)}if(log)log.scrollTop=log.scrollHeight};await refresh();clearInterval(partyChatTimer);partyChatTimer=setInterval(refresh,1200);
  }else if(tab==='ARMORY'){
    const out=await rpc('bridgepoint_horizon_weapon_catalog_v4340',{}).catch(()=>({weapons:[]})),weapons=out?.weapons||[],rank={COMMON:1,UNCOMMON:2,RARE:3,EPIC:4,LEGENDARY:5,MYTHIC:6};
    c.innerHTML=`<div class="eyebrow">HORIZON ARMORY · LIVE SPECS</div><h1>${weapons.length} weapons across all combat classes</h1><p style="color:#95aaa0">Damage, head damage, range, magazine size, spare-clip cap, level and prestige requirements come from the authoritative Horizon weapon catalog. Rarity colors are consistent in loot and the playable HUD.</p><div class="store-grid">${weapons.sort((a,b)=>(rank[b.rarity]||0)-(rank[a.rarity]||0)||String(a.weapon_class).localeCompare(String(b.weapon_class))).map(w=>`<article class="store-card" style="--rarity:${escapeHtml(w.rarity_color||'#9aa0a6')}">${rewardArt({preview_kind:'RUNTIME_RENDER',preview_ref:'catalog://weapon/'+w.weapon_key})}<span class="eyebrow" style="color:${escapeHtml(w.rarity_color||'#9aa0a6')}">${escapeHtml(w.rarity)} · ${escapeHtml(w.weapon_class)}</span><h3>${escapeHtml(w.display_name)}</h3><div class="weapon-spec-grid"><span><b>${w.body_damage}</b> BODY</span><span><b>${w.head_damage}</b> HEAD</span><span><b>${w.range_m}m</b> RANGE</span><span><b>${w.mag_size}</b> MAG</span><span><b>${w.max_spare_clips}</b> CLIPS</span><span><b>${w.fire_interval_ms}ms</b> FIRE</span></div><small>LEVEL ${w.unlocked_level} · PRESTIGE ${w.prestige_required||0}</small></article>`).join('')}</div>`;
  }else if(tab==='LOADOUTS'){
    const [lo,weps]=await Promise.all([
      rpc('bridgepoint_horizon_tdm_loadouts_v4341',{p_player_id:ident.id,p_player_secret:ident.secret}).catch(()=>({presets:[],saved:[],attachments:[]})),
      rpc('bridgepoint_horizon_weapon_catalog_v4340',{}).catch(()=>({weapons:[]}))
    ]);
    const savedBySlot=new Map((lo.saved||[]).map(x=>[Number(x.class_slot),x])),att=lo.attachments||[],weapons=weps.weapons||[];
    const attOptions=(slot,selected='')=>'<option value="">NONE</option>'+att.filter(a=>a.slot_type===slot).map(a=>`<option value="${escapeHtml(a.attachment_key)}" ${selected===a.attachment_key?'selected':''}>${escapeHtml(a.display_name)} · ${escapeHtml(a.rarity)}</option>`).join('');
    const weaponName=k=>weapons.find(w=>w.weapon_key===k)?.display_name||k||'CHOOSE';
    c.innerHTML=`<div class="eyebrow">TDM CLASSES · 150 HEALTH · NO SHIELD</div><h1>Five starting class presets</h1><p style="color:#95aaa0">Every firearm uses live backend damage, head damage, range, fire-rate, magazine and reserve-ammo caps. Attachments change real runtime stats. More class slots can unlock from the weekly store or monthly battle pass.</p><div class="catalog-grid">${(lo.presets||[]).map(p=>{const s=savedBySlot.get(Number(p.slot_no))||p,custom=p.preset_type==='CUSTOM';return `<article class="catalog-card ${s.selected?'selected':''}" data-class-card="${p.slot_no}"><canvas class="preview3d runtime3d" data-runtime="${escapeHtml(p.preview_ref)}"></canvas><span class="eyebrow">CLASS ${p.slot_no} · ${escapeHtml(p.preset_type)}</span><h3>${escapeHtml(p.display_name)}</h3>${custom?`<label>PRIMARY<select data-custom-primary="${p.slot_no}">${weapons.filter(w=>!String(w.weapon_class).startsWith('MELEE_')&&w.weapon_class!=='GRENADE').map(w=>`<option value="${escapeHtml(w.weapon_key)}" ${w.weapon_key===(s.primary_weapon_key||'ar12_rare')?'selected':''}>${escapeHtml(w.display_name)} · ${escapeHtml(w.weapon_class)}</option>`).join('')}</select></label><label>SECONDARY<select data-custom-secondary="${p.slot_no}">${weapons.filter(w=>['PISTOL','REVOLVER','SMG'].includes(w.weapon_class)).map(w=>`<option value="${escapeHtml(w.weapon_key)}" ${w.weapon_key===(s.secondary_weapon_key||'rook_common')?'selected':''}>${escapeHtml(w.display_name)} · ${escapeHtml(w.weapon_class)}</option>`).join('')}</select></label>`:`<div class="item-row"><div><small>PRIMARY</small><br><b>${escapeHtml(weaponName(s.primary_weapon_key||p.primary_weapon_key))}</b></div></div><div class="item-row"><div><small>SECONDARY</small><br><b>${escapeHtml(weaponName(s.secondary_weapon_key||p.secondary_weapon_key))}</b></div></div>`}<small>${escapeHtml(s.tactical_1||p.tactical_1)} + ${escapeHtml(s.tactical_2||p.tactical_2)} · LETHAL ${escapeHtml(s.lethal||p.lethal)}</small><div class="attachment-picker">${['OPTIC','BARREL','MUZZLE','UNDERBARREL','MAGAZINE','STOCK','GRIP'].map(sl=>`<label>${sl}<select data-att="${sl}" data-slot="${p.slot_no}">${attOptions(sl)}</select></label>`).join('')}</div><button data-save-tdm-class="${p.slot_no}" data-preset="${escapeHtml(p.preset_key)}" data-primary="${escapeHtml(s.primary_weapon_key||p.primary_weapon_key||'ar12_rare')}" data-secondary="${escapeHtml(s.secondary_weapon_key||p.secondary_weapon_key||'rook_common')}">USE CLASS</button></article>`}).join('')}</div>`;
  }else if(tab==='LOCKER'){
    const chars=completeCharacterCatalog().filter(ch=>!ch.paid||ch.owned);
    c.innerHTML=`<div class="eyebrow">LOCKER</div><h1>Your 3D Horizon survivors</h1><p style="color:#95aaa0">The model shown here is the same GLB definition used on the lobby stage and in the playable match. Paid skins only appear here after their entitlement exists.</p><div class="catalog-grid">${chars.map(ch=>`<article class="catalog-card ${ch.character_key===state.player.avatar_key?'selected':''}" data-avatar="${ch.character_key}">${String(ch.model_path||'').startsWith('catalog://')?`<canvas class="preview3d runtime3d" data-runtime="${escapeHtml(ch.model_path)}"></canvas>`:`<canvas class="preview3d" data-model="${escapeHtml(ch.model_path)}" data-variant="${ch.outfit_variant||1}"></canvas>`}<h3>${escapeHtml(ch.display_name)}</h3><small>${escapeHtml(ch.base_model_key||'SURVIVOR')} · ${ch.paid?'OWNED':'FREE'}</small></article>`).join('')}</div>`;
  }else if(tab==='BATTLE_PASS'){
    const bp=await rpc('bridgepoint_horizon_battle_pass_current_v4341',{}).catch(()=>({season:null,rewards:[]})),rewards=bp.rewards||[],p=state.stats||state.catalog?.progression||{};
    c.innerHTML=`<div class="eyebrow">MONTHLY BATTLE PASS</div><h1>${escapeHtml(bp.season?.display_name||'Current Battle Pass')}</h1><p style="color:#95aaa0">Level ${p.level||1} · Prestige ${p.prestige||0}. A new pass rolls automatically each month. Rewards use original 3D runtime previews and can include cosmetics or extra class slots.</p><div class="reward-scroll">${rewards.map(r=>`<article class="reward-card">${rewardArt(r)}<span class="eyebrow">LEVEL ${r.level} · ${r.rarity}</span><h3>${escapeHtml(r.reward_name)}</h3><small>${escapeHtml(r.reward_type)}${r.premium?' · PREMIUM':' · FREE'}</small></article>`).join('')}</div>`;
  }else if(tab==='STORE'){
    const rot=await rpc('bridgepoint_horizon_store_current_v4341',{}).catch(()=>({items:[]})),items=rot.items||[];
    c.innerHTML=`<div class="eyebrow">WEEKLY HORIZON STORE</div><h1>Original 3D cosmetics, loadout unlocks & Year One revives</h1><p style="color:#95aaa0">The rotating catalog refreshes weekly. Second Chance ($20) and Full Revival ($50) remain permanently listed. Stripe/tax checkout is not connected yet, so nothing can charge a player today.</p><div class="store-grid">${items.map(s=>`<article class="store-card">${rewardArt(s)}<span class="eyebrow">${s.permanent?'PERMANENT · ':''}${escapeHtml(s.rarity)} · ${escapeHtml(s.category)}</span><h3>${escapeHtml(s.display_name)}</h3><div class="price">${money(s.price_cents,s.currency)}</div><button disabled>3D PREVIEW · CHECKOUT NOT CONNECTED</button></article>`).join('')}</div>`;
  }else if(tab==='ARENA'){
    if(!state.maps.length)await refreshMapCatalog().catch(()=>{});
    c.innerHTML=`<div class="eyebrow">TDM ROTATION · 50 REAL LOCATIONS</div><h1>Dense fights. Automatic map switching.</h1><p style="color:#95aaa0">Team Deathmatch rotates through the complete 50-map pool automatically. Each arena is a compact BridgePoint world-stream cell centered on a dense real location; no party can lock the next map.</p><div class="map-catalog">${state.maps.map((m,i)=>`<article class="map-card"><canvas class="map-mini" width="260" height="130" data-map-key="${escapeHtml(m.map_key)}"></canvas><div class="map-card-body"><span class="eyebrow">#${i+1} · ${escapeHtml(m.state_code)} · ${escapeHtml(m.biome||'DENSE WORLD CELL')}</span><h3>${escapeHtml(m.display_name)}</h3><small>${Number(m.span_km||0).toFixed(1)} km combat cell · AUTO ROTATION</small></div></article>`).join('')}</div>`;
    requestAnimationFrame(()=>mountMapMinis(c));
  }else if(tab==='WATCH'){
    state.yearOne=await rpc('bridgepoint_horizon_year_one_status_v4310',{p_player_id:ident.id,p_player_secret:ident.secret}).catch(()=>state.yearOne);
    let cams=[];
    if(state.match?.match_id&&state.yearOne?.player?.spectator_only){
      const out=await rpc('bridgepoint_horizon_live_cameras_v4310',{p_player_id:ident.id,p_player_secret:ident.secret,p_match_id:state.match.match_id}).catch(()=>({cameras:[]}));
      cams=out?.cameras||[];
    }
    c.innerHTML=`<div class="eyebrow">YEAR ONE WORLD DIRECTOR</div><h1>${state.yearOne?.status==='LIVE'?'Live automatic event camera':'Preseason world overview'}</h1>${yearClockHtml(state.yearOne)}<p style="color:#95aaa0">The automatic director prioritizes the highest combat activity, then a random active survivor, then a live zombie-world overview when nobody is playing. It runs during preseason and throughout Year One.</p><div class="world-director-feed"><canvas id="directorMap" width="760" height="300" style="width:100%;height:100%"></canvas><div id="directorStatus" class="director-status"><b>LOCATING WORLD CAMERA</b><small>AUTO SWITCH 12S</small></div></div>${state.yearOne?.player?.spectator_only?`<h2>Survivor feeds</h2><div class="camera-grid">${cams.length?cams.map(x=>`<article class="camera-card"><div class="feed">LIVE CAMERA TOPIC</div><h3>${escapeHtml(x.display_name)}</h3><small>${x.alive?'ALIVE':'DOWN'} · ${escapeHtml(x.camera_topic)}</small></article>`).join(''):'<article class="camera-card"><div class="feed">NO SURVIVOR FEEDS</div><h3>Director stays on the world</h3></article>'}</div>`:''}`;
    clearInterval(directorTimer);setTimeout(refreshDirectorPanel,20);directorTimer=setInterval(refreshDirectorPanel,12000);
  }else if(tab==='INSTALL_HELP'){
    c.innerHTML='<div class="eyebrow">INSTALL HORIZON</div><h1>Add BridgePoint Horizon to your home screen</h1><p style="color:#95aaa0">Use your browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>. Horizon uses a separate app ID and icon from BridgePoint Intelligence.</p>';
  }else{
    c.innerHTML=`<div class="eyebrow">HORIZON</div><h1>Game controls</h1><p style="color:#95aaa0">Aim: toggle · Pickup: 3-second dwell · Death flow: killcam, then lobby at 10 seconds · Four right-side controls: Aim, Shoot, Run, Build. Utility rail includes crouch, jump, weapons, drops, campfire and light.</p>`;
  }
  mountModelPreviews(c);
  $('modal').classList.add('show');$('modal').setAttribute('aria-hidden','false');
}
function closeHorizonModal(){
  clearInterval(directorTimer);directorTimer=null;clearInterval(partyChatTimer);partyChatTimer=null;$('modal').classList.remove('show');$('modal').setAttribute('aria-hidden','true');refreshInstallUi();
}
$('closeModal').onclick=closeHorizonModal;
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeHorizonModal()});
$('settingsBtn').onclick=()=>openModal('SETTINGS');$('editLocker').onclick=()=>openModal(state.account?'CUSTOMIZE':'ACCOUNT');$('accountBtn').onclick=()=>openModal('ACCOUNT');
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('active',x===b));
  if(b.dataset.tab!=='PLAY')openModal(b.dataset.tab);
});
$('modalContent').addEventListener('click',async e=>{
  const auth=e.target.closest('[data-auth-action]');
  if(auth){
    const action=auth.dataset.authAction,email=$('authEmail')?.value.trim(),password=$('authPassword')?.value||'',handle=$('authHandle')?.value.trim();
    try{
      if(action==='signout'){
        await sb.auth.signOut();state.session=null;state.account=null;state.character=null;state.stats=null;renderAccountState();syncPlayAvailability();closeHorizonModal();status('Signed out of Horizon');return;
      }
      if(action==='signup'){
        if(!email||password.length<8)throw new Error('Enter an email and a password with at least 8 characters.');
        if(!/^[A-Za-z0-9_]{3,20}$/.test(handle||''))throw new Error('Choose a unique 3-20 character handle using letters, numbers, or _.');
        const {data,error}=await sb.auth.signUp({email,password});if(error)throw error;state.session=data?.session||null;
        if(!state.session){status('Account created · confirm your email, then sign in.');return}
        const linked=await rpc('bridgepoint_horizon_account_link_v4340',{p_player_id:ident.id,p_player_secret:ident.secret,p_handle:handle,p_banner_key:'banner_founder',p_icon_key:'icon_skull'});
        if(linked?.ok){await refreshAuthState();await detectOwner();await refreshParty();status('Free Horizon account linked · @'+state.account.handle);openModal('ACCOUNT');return}
      }
      if(action==='signin'){
        if(!email||!password)throw new Error('Enter your email and password.');
        const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;state.session=data?.session||null;
        await refreshAuthState();
        if(state.account){await detectOwner();status('Signed in · @'+state.account.handle);openModal('ACCOUNT');return}
        status('Signed in · finish your player profile.');openModal('ACCOUNT');return;
      }
      if(action==='link'){
        if(!/^[A-Za-z0-9_]{3,20}$/.test(handle||''))throw new Error('Choose a unique 3-20 character handle using letters, numbers, or _.');
        const linked=await rpc('bridgepoint_horizon_account_link_v4340',{p_player_id:ident.id,p_player_secret:ident.secret,p_handle:handle,p_banner_key:$('authBanner')?.value||'banner_founder',p_icon_key:$('authIcon')?.value||'icon_skull'});
        if(linked?.ok){await refreshAuthState();await detectOwner();await refreshParty();status('Player profile saved · @'+state.account.handle);openModal('ACCOUNT');return}
      }
    }catch(err){status(err.message);const box=document.querySelector('.account-callout');if(box)box.textContent=err.message}
    return;
  }
  if(e.target.closest('[data-open-customizer]')){openModal('CUSTOMIZE');return}
  const tabJump=e.target.closest('[data-tab-jump]');if(tabJump){openModal(tabJump.dataset.tabJump);return}
  if(e.target.closest('[data-save-customizer]')){
    if(!state.account){openModal('ACCOUNT');return}
    const appearance={hair:$('customHair')?.value,eyes:$('customEyes')?.value,eye_color:$('customEyeColor')?.value,hair_color:$('customHairColor')?.value,skin_tone:$('customSkin')?.value,top_color:$('customTop')?.value,bottom_color:$('customBottom')?.value,shoes:$('customShoes')?.value,backpack:$('customBackpack')?.value,headwear:$('customHeadwear')?.value,sunglasses:$('customGlasses')?.value};
    try{
      const out=await rpc('bridgepoint_horizon_character_save_v4340',{p_player_id:ident.id,p_player_secret:ident.secret,p_presentation:$('customPresentation')?.value||'UNSPECIFIED',p_preset_key:$('customPreset')?.value||'nova',p_appearance:appearance,p_equipped_character_key:'custom_v4340'});
      if(out?.ok){state.character={...(state.character||{}),presentation:out.presentation,preset_key:out.preset_key,appearance:out.appearance,equipped_character_key:out.equipped_character_key};localStorage.setItem('horizon-character-profile-v4340',JSON.stringify(state.character));lobbyScene?.setLocalCharacter?.(state.character,ident.id);status('Character saved to your Horizon account');openModal('CUSTOMIZE')}
    }catch(err){status(err.message)}
    return;
  }
  const prestigeChoice=e.target.closest('[data-prestige-choice]');
  if(prestigeChoice){
    try{
      const out=await rpc('bridgepoint_horizon_prestige_v4340',{p_player_id:ident.id,p_player_secret:ident.secret,p_choice_no:Number(prestigeChoice.dataset.prestigeChoice)});
      if(out?.ok){await refreshAuthState();status('Prestige '+out.prestige+' unlocked · '+(out.reward?.display_name||'character reward'));openModal('STATS')}
    }catch(err){status(err.message)}
    return;
  }
  const metric=e.target.closest('[data-leader-metric]');
  if(metric){
    const out=await rpc('bridgepoint_horizon_leaderboard_v4340',{p_metric:metric.dataset.leaderMetric,p_limit:25}).catch(()=>({leaders:[]}));
    const rows=$('leaderboardRows');if(rows)rows.innerHTML=leaderRows(out?.leaders||[]);return;
  }
  if(e.target.closest('[data-party-send]')){
    const input=$('partyChatInput'),message=input?.value.trim();if(!message)return;
    try{await rpc('bridgepoint_horizon_party_chat_send_v4341',{p_player_id:ident.id,p_player_secret:ident.secret,p_message:message});input.value=''}catch(err){status(err.message)}return;
  }
  if(e.target.closest('[data-party-voice]')){try{await enablePartyVoice();status('Party headset voice enabled')}catch(err){status(err.message)}return}
    const classBtn=e.target.closest('[data-save-tdm-class]');
  if(classBtn){
    if(!state.account){openModal('ACCOUNT');return}
    const card=classBtn.closest('[data-class-card]'),slot=Number(classBtn.dataset.saveTdmClass),preset=classBtn.dataset.preset;
    const primary=card?.querySelector('[data-custom-primary]')?.value||classBtn.dataset.primary;
    const secondary=card?.querySelector('[data-custom-secondary]')?.value||classBtn.dataset.secondary;
    const picked={primary:[]};
    card?.querySelectorAll('[data-att]').forEach(sel=>{if(sel.value)picked.primary.push(sel.value)});
    const defaults={
      preset_smg:['SMOKE','GAS','FRAG'],preset_assault:['SMOKE','FLASH','FRAG'],preset_lmg:['GAS','SMOKE','FRAG'],
      preset_sniper:['SMOKE','FLASH','FRAG'],preset_custom:['SMOKE','GAS','FRAG']
    }[preset]||['SMOKE','GAS','FRAG'];
    try{
      const out=await rpc('bridgepoint_horizon_tdm_loadout_save_v4341',{
        p_player_id:ident.id,p_player_secret:ident.secret,p_class_slot:slot,p_preset_key:preset,
        p_primary_weapon_key:primary,p_secondary_weapon_key:secondary,p_tactical_1:defaults[0],p_tactical_2:defaults[1],
        p_lethal:defaults[2],p_attachments:picked,p_selected:true
      });
      if(out?.ok){localStorage.setItem('horizon-tdm-class-v4341',String(slot));$('loadoutName').textContent='CLASS '+slot;status('TDM Class '+slot+' saved · 150 HP · attachments active');openModal('LOADOUTS')}
    }catch(err){status(err.message)}
    return;
  }
  const storeEquip=e.target.closest('[data-store-equip]');
  if(storeEquip){
    const key=storeEquip.dataset.storeEquip,kind=storeEquip.dataset.storeKind;
    try{
      const out=await rpc('bridgepoint_horizon_set_profile_v4320',{
        p_player_id:ident.id,p_player_secret:ident.secret,
        p_avatar_key:kind==='CHARACTER_SKIN'?key:null,
        p_wrap_key:kind==='WEAPON_WRAP'?key:null,
        p_loadout:null
      });
      state.player=out.player;localStorage.setItem('horizon-player-profile',JSON.stringify(state.player));
      if(lobbyScene)lobbyScene.setCatalog(completeCharacterCatalog());
      await refreshParty();status(kind==='WEAPON_WRAP'?'Weapon wrap equipped':'Character skin equipped');openModal('STORE');
    }catch(err){status(err.message)}
    return;
  }
  const loadout=e.target.closest('[data-loadout]');
  if(loadout){
    const slot=Number(loadout.dataset.loadout);
    try{
      const out=await rpc('bridgepoint_horizon_set_profile_v4320',{
        p_player_id:ident.id,p_player_secret:ident.secret,p_avatar_key:null,p_wrap_key:null,p_loadout:slot
      });
      state.player=out.player;localStorage.setItem('horizon-player-profile',JSON.stringify(state.player));localStorage.setItem('horizon-loadout',String(slot));
      $('loadoutName').textContent=state.config.loadouts.find(x=>x.slot===slot)?.name||'Ranger';
      document.querySelectorAll('[data-loadout]').forEach(x=>x.classList.toggle('selected',Number(x.dataset.loadout)===slot));
    }catch(err){status(err.message)}
    return;
  }
  const avatar=e.target.closest('[data-avatar]');
  if(avatar){
    try{
      const out=await rpc('bridgepoint_horizon_set_profile_v4320',{
        p_player_id:ident.id,p_player_secret:ident.secret,p_avatar_key:avatar.dataset.avatar,p_wrap_key:null,p_loadout:null
      });
      state.player=out.player;localStorage.setItem('horizon-player-profile',JSON.stringify(state.player));await refreshParty();
      document.querySelectorAll('[data-avatar]').forEach(x=>x.classList.toggle('selected',x.dataset.avatar===state.player.avatar_key));
    }catch(err){status(err.message)}
  }
});

function connectPartySignal(){
  if(!sb||!state.party?.invite_code)return;
  const ch=sb.channel(`horizon-party:${state.party.invite_code}`,{config:{broadcast:{self:false}}});
  ch.on('broadcast',{event:'party-ping'},()=>refreshParty())
    .on('broadcast',{event:'voice-hello'},({payload})=>{if(payload?.player_id&&payload.player_id!==ident.id&&String(ident.id)<String(payload.player_id))makeOffer(payload.player_id,ch)})
    .on('broadcast',{event:'signal'},({payload})=>handleSignal(payload,ch))
    .subscribe(status=>{if(status==='SUBSCRIBED'){ch.send({type:'broadcast',event:'party-ping',payload:{player_id:ident.id}});if(state.voiceStream)ch.send({type:'broadcast',event:'voice-hello',payload:{player_id:ident.id}})}});
  state.channel=ch;
}
async function enablePartyVoice(){
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('This browser does not expose microphone capture.');
  if(!state.voiceStream)state.voiceStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  for(const rec of state.peers.values())for(const track of state.voiceStream.getAudioTracks())if(!rec.pc.getSenders().some(s=>s.track===track))rec.pc.addTrack(track,state.voiceStream);
  state.channel?.send({type:'broadcast',event:'voice-hello',payload:{player_id:ident.id}});
}

const peerConfig={iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}]};
let hostLeaseTimer=null;
async function hostLeaseTick(){
  const m=state.match;if(!m?.match_id)return;
  try{
    if(m.host_player_id===ident.id){
      const hb=await rpc('bridgepoint_horizon_host_heartbeat_v4303',{
        p_player_id:ident.id,p_player_secret:ident.secret,p_match_id:m.match_id
      });
      if(hb?.host_player_id)state.match.host_player_id=hb.host_player_id;
      return;
    }
    const hostMember=m.members?.find(x=>x.player_id===m.host_player_id);
    const rec=hostMember?state.peers.get(hostMember.player_id):null;
    if(rec?.pc?.connectionState==='connected')return;
    const claim=await rpc('bridgepoint_horizon_claim_host_v4303',{
      p_player_id:ident.id,p_player_secret:ident.secret,p_match_id:m.match_id
    });
    if(claim?.host_player_id&&claim.host_player_id!==state.match.host_player_id){
      state.match.host_player_id=claim.host_player_id;
      $('peerMeta').textContent=claim.host_player_id===ident.id?'HOST MIGRATED TO YOU':'HOST MIGRATED';
      if(state.channel){
        state.channel.send({type:'broadcast',event:'hello',payload:{player_id:ident.id,host_epoch:claim.host_epoch}});
      }
    }
  }catch(e){console.warn('host lease',e)}
}
function startHostLease(match){
  state.match=match;clearInterval(hostLeaseTimer);hostLeaseTimer=setInterval(hostLeaseTick,2500);
  hostLeaseTick();
}

function connectMatchSignal(match){
  if(!sb)return;
  if(state.channel)sb.removeChannel(state.channel).catch(()=>{});
  const ch=sb.channel(match.network_topic,{config:{broadcast:{self:false}}});
  ch.on('broadcast',{event:'hello'},({payload})=>{if(payload?.player_id&&payload.player_id!==ident.id&&match.host_player_id===ident.id)makeOffer(payload.player_id,ch)})
    .on('broadcast',{event:'signal'},({payload})=>handleSignal(payload,ch))
    .subscribe(s=>{
      if(s==='SUBSCRIBED'){
        setNet('P2P SIGNALING','#64d7ff');
        ch.send({type:'broadcast',event:'hello',payload:{player_id:ident.id}});
        $('peerMeta').textContent=match.host_player_id===ident.id?'YOU ARE HOST':'P2P JOINING';
      }
    });
  state.channel=ch;
}
function pcFor(peerId,ch,initiator=false){
  let rec=state.peers.get(peerId);if(rec)return rec.pc;
  const pc=new RTCPeerConnection(peerConfig);rec={pc,dc:null};state.peers.set(peerId,rec);
  if(state.voiceStream)for(const track of state.voiceStream.getAudioTracks())pc.addTrack(track,state.voiceStream);
  pc.ontrack=e=>{let audio=document.querySelector('audio[data-peer="'+peerId+'"]');if(!audio){audio=document.createElement('audio');audio.dataset.peer=peerId;audio.autoplay=true;audio.playsInline=true;audio.hidden=true;document.body.appendChild(audio)}audio.srcObject=e.streams?.[0]||new MediaStream([e.track]);audio.play?.().catch(()=>{})};
  pc.onicecandidate=e=>{if(e.candidate)ch.send({type:'broadcast',event:'signal',payload:{from:ident.id,to:peerId,candidate:e.candidate}})};
  pc.onconnectionstatechange=()=>{
    if(pc.connectionState==='connected'){setNet('P2P DIRECT','#44f3bd');$('peerMeta').textContent=`${[...state.peers.values()].filter(x=>x.pc.connectionState==='connected').length+1} DIRECT`}
  };
  if(initiator){const dc=pc.createDataChannel('horizon-game',{ordered:false,maxRetransmits:0});wireData(peerId,dc)}
  pc.ondatachannel=e=>wireData(peerId,e.channel);
  return pc;
}
function wireData(peerId,dc){
  const rec=state.peers.get(peerId);if(rec)rec.dc=dc;
  dc.onopen=()=>{dc.send(JSON.stringify({t:'hello',player_id:ident.id,seed:state.match?.seed}))};
  dc.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.t==='snapshot')state.killcam.push(m.s)}catch{}};
}
async function makeOffer(peerId,ch){
  const pc=pcFor(peerId,ch,true),offer=await pc.createOffer();await pc.setLocalDescription(offer);
  ch.send({type:'broadcast',event:'signal',payload:{from:ident.id,to:peerId,sdp:pc.localDescription}});
}
async function handleSignal(p,ch){
  if(!p||p.to!==ident.id||!p.from)return;
  const pc=pcFor(p.from,ch,false);
  if(p.sdp){
    await pc.setRemoteDescription(p.sdp);
    if(p.sdp.type==='offer'){const ans=await pc.createAnswer();await pc.setLocalDescription(ans);ch.send({type:'broadcast',event:'signal',payload:{from:ident.id,to:p.from,sdp:pc.localDescription}})}
  }else if(p.candidate){try{await pc.addIceCandidate(p.candidate)}catch{}}
}

async function emitGhostEvent(type,eventKey,payload={},ttlSeconds=86400){
  if(!state.match?.match_id)return null;
  const cellKey=state.match.cell_seed||String(state.match.metadata?.world_state||'UNKNOWN');
  return rpc('bridgepoint_horizon_emit_world_event_v4303',{
    p_player_id:ident.id,p_player_secret:ident.secret,p_match_id:state.match.match_id,
    p_cell_key:cellKey,p_event_type:type,p_event_key:eventKey,p_payload:payload,p_ttl_seconds:ttlSeconds
  });
}
async function loadGhostEvents(){
  if(!state.match)return[];
  const cellKey=state.match.cell_seed||String(state.match.metadata?.world_state||'UNKNOWN');
  const out=await rpc('bridgepoint_horizon_world_events_v4303',{
    p_player_id:ident.id,p_player_secret:ident.secret,p_cell_key:cellKey,p_limit:100
  }).catch(()=>({events:[]}));
  return out?.events||[];
}

let deferredInstallPrompt=null;
function horizonInstalled(){
  if(qs.get('source')==='pwa'){localStorage.setItem('horizon-installed-v4311','1');return true}
  return localStorage.getItem('horizon-installed-v4311')==='1';
}
function refreshInstallUi(){
  const dismissed=Number(localStorage.getItem('horizon-install-dismissed-at')||0);
  const hide=horizonInstalled()||(dismissed&&Date.now()-dismissed<86400000);
  $('installBanner')?.classList.toggle('hidden',!!hide);
  if($('installBtn'))$('installBtn').textContent=horizonInstalled()?'✓ INSTALLED':'⬇ INSTALL';
}
async function installHorizon(){
  if(horizonInstalled()){status('BridgePoint Horizon is already installed as its own app.');return}
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    const result=await deferredInstallPrompt.userChoice;
    if(result.outcome==='accepted'){localStorage.setItem('horizon-installed-v4311','1');status('Horizon installation accepted.')}
    deferredInstallPrompt=null;refreshInstallUi();return;
  }
  openModal('INSTALL_HELP');
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;refreshInstallUi()});
window.addEventListener('appinstalled',()=>{localStorage.setItem('horizon-installed-v4311','1');deferredInstallPrompt=null;refreshInstallUi();status('BridgePoint Horizon installed')});
$('installBtn')?.addEventListener('click',installHorizon);
$('installBannerBtn')?.addEventListener('click',installHorizon);
$('installNotNow')?.addEventListener('click',()=>{localStorage.setItem('horizon-install-dismissed-at',String(Date.now()));refreshInstallUi()});
refreshInstallUi();

function animateSky(){
  const c=$('sky'),g=c.getContext('2d'),dpr=Math.min(2,devicePixelRatio||1);let pts=[];
  function resize(){c.width=innerWidth*dpr;c.height=innerHeight*dpr;c.style.width=innerWidth+'px';c.style.height=innerHeight+'px';g.setTransform(dpr,0,0,dpr,0,0);pts=Array.from({length:Math.min(120,Math.floor(innerWidth/9))},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.5+.3,s:Math.random()*.18+.03}))}
  addEventListener('resize',resize);resize();
  function frame(){g.clearRect(0,0,innerWidth,innerHeight);for(const p of pts){p.y-=p.s;if(p.y<0)p.y=innerHeight;g.fillStyle='rgba(174,255,226,.22)';g.beginPath();g.arc(p.x,p.y,p.r,0,Math.PI*2);g.fill()}requestAnimationFrame(frame)}frame();
}

state.pickup=new DwellPickupController({onProgress:(p)=>{document.documentElement.style.setProperty('--pickup',String(p))}});
animateSky();
sb?.auth?.onAuthStateChange?.((_event,session)=>{state.session=session||null;setTimeout(()=>{refreshAuthState().then(detectOwner).catch(()=>{})},0)});
bootstrap().catch(e=>{console.error(e);setNet('BACKEND ERROR','#ff5d71');status(e.message)});
if('serviceWorker' in navigator){
  navigator.serviceWorker.getRegistrations()
    .then(regs=>Promise.all(regs.filter(r=>r.scope.includes('/app/horizon/play/')||r.scope.includes('/app/horizon/native/')).map(r=>r.unregister())))
    .catch(()=>[])
    .finally(()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
