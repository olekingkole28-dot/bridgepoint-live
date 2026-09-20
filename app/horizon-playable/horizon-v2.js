import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import {clone as skeletonClone} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/SkeletonUtils.js';
import {makeHorizonRifle,makeHorizonWeapon,avatarModelForKey,avatarVariantForKey} from '/app/horizon/cosmetics-v4320.js';
const SUPABASE_URL='https://xdfsjztwgsbmabshzsjw.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const ENDPOINT=SUPABASE_URL+'/functions/v1/bridgepoint-horizon-stream-v3020';
const $=id=>document.getElementById(id),root=$('world'),loadText=$('loadText'),errorBox=$('error'),errorText=$('errorText');
const p=new URLSearchParams(location.search);
const lat=Number(p.get('lat')||41.5623),lon=Number(p.get('lon')||-72.6506);
const span=Math.max(.75,Math.min(5,Number(p.get('span_km')||1.25)));
const stateCode=(p.get('state')||'CT').toUpperCase();
const mode=(p.get('mode')||'TDM').toUpperCase();
const matchId=p.get('match')||'';
const matchSeed=p.get('seed')||'4313';
const activeMatch=(()=>{try{return JSON.parse(localStorage.getItem('horizon-active-match')||'null')}catch{return null}})();
const playerId=localStorage.getItem('horizon-player-id')||'';
const playerSecret=localStorage.getItem('horizon-player-secret')||'';
const savedProfile=(()=>{try{return JSON.parse(localStorage.getItem('horizon-player-profile')||'null')}catch{return null}})();
function horizonAccessToken(){
  try{
    const raw=localStorage.getItem('sb-xdfsjztwgsbmabshzsjw-auth-token');if(!raw)return '';
    const q=JSON.parse(raw);return q?.access_token||q?.currentSession?.access_token||q?.session?.access_token||q?.[0]?.access_token||'';
  }catch{return ''}
}
const MOBILE=/Android|iPhone|iPad/i.test(navigator.userAgent);
const DEVICE_MEM=Number(navigator.deviceMemory||0),DEVICE_CORES=Number(navigator.hardwareConcurrency||0);
const HIGH_DEVICE=!MOBILE||(DEVICE_MEM>=8&&DEVICE_CORES>=8);
let renderScale=Math.min(devicePixelRatio||1,HIGH_DEVICE?1.25:(MOBILE?.88:1.05));
const scene=new THREE.Scene();scene.background=new THREE.Color(0x737e70);scene.fog=new THREE.FogExp2(0x70796c,.00072);
const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.08,2800);camera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:HIGH_DEVICE,powerPreference:'high-performance',stencil:false,depth:true});
renderer.setPixelRatio(renderScale);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
renderer.shadowMap.enabled=HIGH_DEVICE;renderer.shadowMap.type=THREE.PCFSoftShadowMap;root.appendChild(renderer.domElement);
localStorage.setItem('horizon-camera-mode','first');
const world=new THREE.Group();scene.add(world);const exteriorDetailGroup=new THREE.Group();world.add(exteriorDetailGroup);const mapLineGroup=new THREE.Group();world.add(mapLineGroup);const ambientDetailGroup=new THREE.Group();world.add(ambientDetailGroup);const interiorGroup=new THREE.Group();interiorGroup.visible=false;scene.add(interiorGroup);
const actorProxyGroup=new THREE.Group();world.add(actorProxyGroup);
const PROXY_MAX=120,PROXY_GEOM=new THREE.BoxGeometry(.52,.52,1.62);
const makeProxy=(color)=>{const m=new THREE.InstancedMesh(PROXY_GEOM,new THREE.MeshBasicMaterial({color}),PROXY_MAX);m.count=0;m.visible=false;m.frustumCulled=true;m.userData.perfProxy=true;actorProxyGroup.add(m);return m};
const allyProxy=makeProxy(0x5fdcc6),enemyProxy=makeProxy(0xd36859),infectedProxy=makeProxy(0x68765b);
const hemi=new THREE.HemisphereLight(0xcad5c1,0x263126,1.5);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffd69a,2.0);sun.position.set(-180,-110,240);sun.castShadow=HIGH_DEVICE;sun.shadow.mapSize.set(MOBILE?512:1024,MOBILE?512:1024);scene.add(sun);
const player=new THREE.Group();scene.add(player);player.position.set(0,0,0);
let data=null,centerLon=lon,centerLat=lat,yaw=0,pitch=-.08,moveX=0,moveY=0,touchMoveX=0,touchMoveY=0,keyMoveX=0,keyMoveY=0,sprint=false,aiming=false,shooting=false,last=performance.now(),frames=0,fpsT=performance.now(),lootCount=0,health=mode==='TDM'?150:100,shield=0,flash=false,storm=false,dayPhase=.62;
let terrainInfo=null,perfLowStreak=0,perfHighStreak=0,lastMeasuredFps=60;
let perfTier=0,perfEmaMs=16.7,perfWorstMs=16.7,lastPerfAdjustAt=0,fastSince=performance.now(),longFrames=0;
let aiAccumulator=0,fxAccumulator=0,lightAccumulator=0;
const PERF_TIER_NAMES=['FULL','BALANCED','SAFE','SURVIVAL'];
const lowMaterialCache=new WeakMap();
let liveWeather={feed:false,event:null,distance_km:null,last_at:null},rainFx=null;
const WORLD_COUNTS={buildings:0,buildingParts:0,parcels:0,roads:0,water:0};
// Every source building remains present in the playable world. Adaptive quality
// only controls fine facade dressing and collision/FX cost, never structure presence.
const DETAIL_BUILDING_LIMIT=MOBILE?(HIGH_DEVICE?52:22):120;
const BUILDING_LIMIT=Number.POSITIVE_INFINITY;
const PART_LIMIT=Number.POSITIVE_INFINITY;
const PARCEL_LIMIT=MOBILE?(HIGH_DEVICE?1250:850):1800;
let ammoMag=30,ammoReserve=90,reloading=false,dead=false,buildCount=0,pickupTarget=null,pickupStarted=0,lastFireAt=0,weaponRig=null,fpWeaponRig=null,muzzleFlash=null,lootDeltaPending=0,lastYearOneCheckpointAt=0,yearOneCheckpointBusy=false;
let yearOneZone=null,lastZonePollAt=0,lastWallDamageAt=0,lastWaterDamageAt=0,lastExposureDamageAt=0,lastWeatherSpawnAt=0,lastPresenceAt=0,lastExploreAt=0,waterIdleSeconds=0,coldExposureSeconds=0,nearbyPlayers=[],worldActivePlayers=0,tdmLoadout=null,tdmLoadoutCatalog=null,tdmFireZone=null,lastTdmFirePollAt=0,lastTdmFireDamageAt=0,prematchLockedUntil=0;
const exploredCells=new Set(),vehicleParts={spark_plug:0,wheel:0,gas:0},backpackSlots=Array(5).fill(null),sharedPlayers=new Map();
const waterAreas=[],zombieWallGroup=new THREE.Group(),sharedPlayerGroup=new THREE.Group(),tdmFireGroup=new THREE.Group();world.add(zombieWallGroup,sharedPlayerGroup,tdmFireGroup);
let cameraMode='first',crouched=false,prone=false,slideTime=0,verticalVelocity=0,airborne=false,interiorMode=false,activeInterior=null,rooftopState=null;
let activeZipline=null,activeVehicle=null,audioCtx=null,audioMaster=null,audioCompressor=null,audioReverb=null,audioReverbGain=null,lastAudioEnvAt=0,lastFootstepAt=0,contextTarget=null;const audioBuses={},audioBufferCache=new Map();
const buildingEntries=[],ziplines=[],vehicles=[],ambientFx=[],interiorRects=[];const exteriorReturn=new THREE.Vector3();let exteriorYaw=0;
let WEAPONS=[
  {key:'rifle',name:'AR-12 Cobalt',kind:'rifle',rarity:'RARE',mag:32,reserve:96,damage:40,head:72,interval:96,range:150,spread:.007,maxClips:3},
  {key:'smg',name:'Viper Flux',kind:'smg',rarity:'RARE',mag:40,reserve:160,damage:28,head:50,interval:68,range:88,spread:.012,maxClips:4},
  {key:'shotgun',name:'Breach Hammer',kind:'shotgun',rarity:'RARE',mag:8,reserve:16,damage:92,head:118,interval:660,range:34,spread:.055,maxClips:2},
  {key:'pistol',name:'Rook',kind:'pistol',rarity:'COMMON',mag:12,reserve:48,damage:38,head:68,interval:280,range:70,spread:.012,maxClips:4},
  {key:'axe',name:'Warden Axe',kind:'melee',rarity:'EPIC',mag:0,reserve:0,damage:96,head:96,interval:610,range:2.8,spread:0,maxClips:0}
];
const weaponState=Object.fromEntries(WEAPONS.map(w=>[w.key,{mag:w.mag,reserve:w.reserve,owned:true}]));
const savedStats=(()=>{try{return JSON.parse(localStorage.getItem('horizon-player-stats-v4340')||'null')||{}}catch{return {}}})();
const inventoryWeaponKeys=['rifle','smg','shotgun','pistol','axe',null,null,null,null,null];
let activeWeaponIndex=0;
const interactables=[],infected=[],combatants=[],roadAnchors=[],buildingCenters=[],solidRects=[],solidPolys=[],lootPickups=[],builtCover=[];
const ENTRANCE_CELL=28,entranceGrid=new Map();
const COLLISION_CELL=32,collisionGrid=new Map();
const activeMembers=Array.isArray(activeMatch?.members)?activeMatch.members:[];
const playerTeam=Number(activeMembers.find(m=>m.player_id===playerId)?.team_no||1);
const gltfLoader=new GLTFLoader(),assetCache=new Map(),killSnapshots=[];let infectedHumanoidSource=null,lastHordeSpawnAt=0;
const CHAR_MODELS={
  free_01:'/app/horizon-playable/assets/characters/mesh2motion/models/female_31.glb',
  free_02:'/app/horizon-playable/assets/characters/mesh2motion/models/female_31.glb',
  free_03:'/app/horizon-playable/assets/characters/mesh2motion/models/male_32.glb',
  free_04:'/app/horizon-playable/assets/characters/mesh2motion/models/male_32.glb',
  free_05:'/app/horizon-playable/assets/characters/mesh2motion/models/police_male.glb',
  free_06:'/app/horizon-playable/assets/characters/mesh2motion/models/police_male.glb',
  free_07:'/app/horizon-playable/assets/characters/mesh2motion/models/swat_male.glb',
  free_08:'/app/horizon-playable/assets/characters/mesh2motion/models/swat_male.glb',
  free_09:'/app/horizon-playable/assets/characters/mesh2motion/models/hazmat_suit_male.glb',
  free_10:'/app/horizon-playable/assets/characters/mesh2motion/models/hazmat_suit_male.glb'
};const rand=(s=>()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296))(913733);const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
async function rpc(name,params={}){
  if(!playerId||!playerSecret)throw new Error('HORIZON_PLAYER_IDENTITY_MISSING');
  const headers={apikey:PUBLISHABLE_KEY,'content-type':'application/json','accept':'application/json'},token=horizonAccessToken();
  if(token)headers.authorization='Bearer '+token;
  const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(params)});
  const t=await r.text();if(!r.ok){let m=t;try{m=JSON.parse(t)?.message||t}catch{}throw new Error(m)}return t?JSON.parse(t):null;
}
function weaponKindForClass(cls,renderKind){
  const r=String(renderKind||'').toLowerCase(),c=String(cls||'').toUpperCase();
  if(r==='grenade'||c==='GRENADE')return 'grenade';
  if(/^MELEE_/.test(c)||r==='melee')return 'melee';
  if(c==='SMG'||r==='smg')return 'smg';
  if(c==='SHOTGUN'||r==='shotgun')return 'shotgun';
  if(['PISTOL','REVOLVER'].includes(c)||r==='pistol')return 'pistol';
  return 'rifle';
}
async function hydrateWeaponCatalog(){
  try{
    const out=await rpc('bridgepoint_horizon_weapon_catalog_v4340',{}),rows=out?.weapons||[],existing=new Set(WEAPONS.map(w=>w.key));
    for(const q of rows){
      if(existing.has(q.weapon_key))continue;
      const kind=weaponKindForClass(q.weapon_class,q.render_kind),mag=Math.max(0,Number(q.mag_size||0)),clips=Math.max(0,Number(q.max_spare_clips||0));
      const w={key:q.weapon_key,name:q.display_name,kind,weaponClass:q.weapon_class,rarity:q.rarity,rarityColor:q.rarity_color,mag,
        reserve:mag*clips,damage:Number(q.body_damage||1),head:Number(q.head_damage||q.body_damage||1),interval:Number(q.fire_interval_ms||250),
        range:Number(q.range_m||50),spread:Number(q.spread||0),maxClips:clips,prestigeRequired:Number(q.prestige_required||0),
        unlockedLevel:Number(q.unlocked_level||1),metadata:q.metadata||{}};
      WEAPONS.push(w);weaponState[w.key]={mag:w.mag,reserve:w.mag*Math.min(1,w.maxClips),owned:false};existing.add(w.key);
    }
    return rows.length;
  }catch{return 0}
}

function attachmentEffectsFor(loadout){
  const out=[];const defs=new Map((tdmLoadoutCatalog?.attachments||[]).map(a=>[a.attachment_key,a]));
  const raw=loadout?.attachments&&typeof loadout.attachments==='object'?loadout.attachments:{};
  for(const keys of Object.values(raw)){for(const key of Array.isArray(keys)?keys:[]){const d=defs.get(key);if(d)out.push(d.effects||{})}}
  return out;
}
function applyAttachmentEffectsToWeapon(w,effects=[]){
  for(const e of effects){
    if(e.range_mult)w.range*=Number(e.range_mult);
    if(e.recoil_mult)w.recoil=(w.recoil||1)*Number(e.recoil_mult);
    if(e.spread_mult)w.spread*=Number(e.spread_mult);
    if(e.mag_mult&&w.mag){w.mag=Math.max(1,Math.round(w.mag*Number(e.mag_mult)));w.maxClips=Math.max(1,w.maxClips||1)}
    if(e.reload_mult)w.reloadMult=(w.reloadMult||1)*Number(e.reload_mult);
    if(e.mobility_mult)w.mobilityMult=(w.mobilityMult||1)*Number(e.mobility_mult);
    if(e.ads_zoom)w.adsZoom=Math.max(w.adsZoom||1,Number(e.ads_zoom));
  }
}
async function hydrateTdmLoadout(){
  if(mode!=='TDM')return null;
  try{
    const out=await rpc('bridgepoint_horizon_tdm_loadouts_v4341',{p_player_id:playerId,p_player_secret:playerSecret});tdmLoadoutCatalog=out;
    const saved=(out.saved||[]).find(x=>x.selected)||(out.saved||[])[0]||null;
    const preset=(out.presets||[]).find(x=>x.preset_key===(saved?.preset_key||'preset_smg'))||(out.presets||[])[0];
    tdmLoadout=saved||preset;
    const primary=String(tdmLoadout.primary_weapon_key||preset?.primary_weapon_key||'viper_rare'),secondary=String(tdmLoadout.secondary_weapon_key||preset?.secondary_weapon_key||'rook_common');
    for(const key of [primary,secondary]){const w=weaponByKey(key);if(w){weaponState[key].owned=true;weaponState[key].mag=w.mag;weaponState[key].reserve=w.mag*Math.min(w.maxClips||1,2)}}
    inventoryWeaponKeys.fill(null);inventoryWeaponKeys[0]=primary;inventoryWeaponKeys[1]=secondary;
    const effects=attachmentEffectsFor(tdmLoadout);for(const key of [primary,secondary]){const w=weaponByKey(key);if(w)applyAttachmentEffectsToWeapon(w,effects)}
    equipWeaponKey(primary);renderEquipmentButtons();
    return tdmLoadout;
  }catch{return null}
}
const tdmEquipment={tactical1:{kind:'SMOKE',charges:1},tactical2:{kind:'GAS',charges:1},lethal:{kind:'FRAG',charges:1}};
function renderEquipmentButtons(){
  if(tdmLoadout){tdmEquipment.tactical1.kind=String(tdmLoadout.tactical_1||'SMOKE');tdmEquipment.tactical2.kind=String(tdmLoadout.tactical_2||'GAS');tdmEquipment.lethal.kind=String(tdmLoadout.lethal||'FRAG')}
  const map=[['tacticalBtn1',tdmEquipment.tactical1],['tacticalBtn2',tdmEquipment.tactical2],['lethalBtn',tdmEquipment.lethal]];
  for(const [id,q] of map){const el=$(id);if(el){el.textContent=q.kind+' · '+q.charges;el.disabled=mode!=='TDM'||q.charges<=0}}
}
function cloudFx(kind){
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);const p=player.position.clone().addScaledVector(dir,8);p.z=terrainZ(p.x,p.y)+1.1;
  const color=kind==='GAS'?0x78a84e:0xd7e2df,g=new THREE.Group();
  for(let i=0;i<(MOBILE?10:18);i++){const m=new THREE.Mesh(new THREE.SphereGeometry(1.1+(i%4)*.22,10,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.11,depthWrite:false}));m.position.set((rand()-.5)*5,(rand()-.5)*5,(rand()-.5)*2);g.add(m)}
  g.position.copy(p);world.add(g);const started=performance.now();const tick=now=>{const age=(now-started)/1000;g.rotation.z+=.003;g.scale.setScalar(1+Math.min(2,age*.18));g.children.forEach(m=>m.material.opacity=Math.max(0,.11*(1-age/12)));if(age<12)requestAnimationFrame(tick);else world.remove(g)};requestAnimationFrame(tick);
}
function useEquipment(slot){
  if(mode!=='TDM'||dead||tdmMovementLocked())return;const q=tdmEquipment[slot];if(!q||q.charges<=0)return;q.charges--;renderEquipmentButtons();
  if(q.kind==='SMOKE'||q.kind==='GAS'||q.kind==='FLASH')cloudFx(q.kind);
  else{const frag=weaponByKey('frag_common')||{key:'frag',kind:'grenade',weaponClass:'GRENADE',name:'Fragment',damage:105,range:38,mag:1,metadata:{splash_radius_m:6,fuse_ms:1150}};const dir=new THREE.Vector3();camera.getWorldDirection(dir);launchExplosive(frag,camera.position.clone(),dir)}
}
function tdmMovementLocked(){return mode==='TDM'&&performance.now()<prematchLockedUntil}
async function beginTdmPrematch(){
  if(mode!=='TDM'||!matchId)return;
  try{
    const clock=await rpc('bridgepoint_horizon_tdm_combat_clock_v4341',{p_player_id:playerId,p_player_secret:playerSecret,p_match_id:matchId});
    const end=Date.parse(clock?.combat_live_at||'');prematchLockedUntil=performance.now()+Math.max(0,Number.isFinite(end)?end-Date.now():10000);
  }catch{prematchLockedUntil=performance.now()+10000}
  const box=$('prematchFreeze'),num=$('prematchCount');if(box)box.hidden=false;let last=-1;
  const tick=()=>{const left=Math.max(0,prematchLockedUntil-performance.now()),sec=Math.ceil(left/1000);if(num)num.textContent=String(sec||'GO');if(sec!==last&&sec>0){tone(sec<=3?880:520,.045,.045,'square');last=sec}
    if(left<=0){if(box)box.hidden=true;tone(1040,.08,.06,'square');toast('GO · FIRE CIRCLE ACTIVE');return}
    requestAnimationFrame(tick)
  };tick();
}
function loadAsset(url){
  if(!assetCache.has(url))assetCache.set(url,new Promise((resolve,reject)=>gltfLoader.load(url,resolve,undefined,reject)));
  return assetCache.get(url);
}
function prepHumanoid(root,{infectedTint=false,variant=1}={}){
  root.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;o.frustumCulled=MOBILE;
    const mats=(Array.isArray(o.material)?o.material:[o.material]).filter(Boolean);
    if(mats.length){
      const out=mats.map(m=>{const n=m.clone();if(n.color){if(infectedTint)n.color.multiply(new THREE.Color(.42,.55,.38));else if(variant===2)n.color.multiply(new THREE.Color(.74,.78,.96))}n.roughness=Math.min(1,(n.roughness??.72)+.05);return n});
      o.material=out.length===1?out[0]:out;
    }
  });
}
function orientHumanoid(root,targetHeight=1.8){
  const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());
  const h=Math.max(size.y,size.z,.01),scale=targetHeight/h;
  root.scale.multiplyScalar(scale);
  root.rotation.x=Math.PI/2;
  const b2=new THREE.Box3().setFromObject(root),min=b2.min;
  root.position.z-=min.z;
}
function makeNameSprite(name,color='#ffffff'){
  const c=document.createElement('canvas');c.width=512;c.height=96;
  const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.font='900 38px system-ui';x.textAlign='center';x.textBaseline='middle';x.strokeStyle='rgba(0,0,0,.88)';x.lineWidth=9;x.strokeText(name,256,48);x.fillStyle=color;x.fillText(name,256,48);
  const tex=new THREE.CanvasTexture(c),mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}),s=new THREE.Sprite(mat);s.scale.set(2.5,.47,1);s.position.z=2.45;s.renderOrder=20;return s;
}

function updateVitals(hitKind=''){
  const maxHealth=mode==='TDM'?150:100;
  health=Math.max(0,Math.min(maxHealth,Math.round(health)));
  shield=mode==='TDM'?0:Math.max(0,Math.min(100,Math.round(shield)));
  const he=$('health'),se=$('shield'),hb=$('healthBar'),sb=$('shieldBar');
  if(he)he.textContent=String(health);if(se)se.textContent=mode==='TDM'?'—':String(shield);
  if(hb)hb.style.width=(health/maxHealth*100)+'%';if(sb)sb.style.width=(mode==='TDM'?0:shield)+'%';
  const sv=document.querySelector('.shield-vital');if(sv)sv.style.display=mode==='TDM'?'none':'';
  if(hitKind){
    const node=document.querySelector(hitKind==='shield'?'.shield-vital':'.health-vital');
    if(node){node.classList.remove('hit');void node.offsetWidth;node.classList.add('hit');setTimeout(()=>node.classList.remove('hit'),260)}
  }
}
function applyPlayerHit(amount=25,killer=null){
  if(dead)return;
  let remaining=Math.max(0,Math.round(amount)),hitKind='health';
  if(mode!=='TDM'&&shield>0){
    const absorbed=Math.min(shield,remaining);shield-=absorbed;remaining-=absorbed;hitKind='shield';
  }
  if(remaining>0)health=Math.max(0,health-remaining);
  updateVitals(hitKind);
  if(mode==='YEAR_ONE')checkpointYearOne(false);
  if(health<=0)triggerDeath(killer);
}
function playerWorldCoordinate(){
  const cos=Math.max(.12,Math.cos(centerLat*Math.PI/180));
  let x=player.position.x,y=player.position.y;
  if(interiorMode&&activeInterior?.entry){x=activeInterior.entry.cx;y=activeInterior.entry.cy}
  return {lat:centerLat+y/110540,lon:centerLon+x/(111320*cos)};
}
async function hydrateYearOneRuntime(){
  if(mode!=='YEAR_ONE'||!playerId||!playerSecret)return null;
  try{
    const r=await rpc('bridgepoint_horizon_year_one_runtime_v4336',{p_player_id:playerId,p_player_secret:playerSecret});
    if(r?.ok){
      health=Number(r.health??100);shield=Number(r.shield??0);lootCount=Number(r.loot_collected??lootCount);
      const savedWeapons=r.weapon_state&&typeof r.weapon_state==='object'?r.weapon_state:null;
      if(savedWeapons){
        for(const w of WEAPONS){
          const q=savedWeapons[w.key];
          if(!q||typeof q!=='object')continue;
          weaponState[w.key].mag=Math.max(0,Math.min(w.mag,Number(q.mag??weaponState[w.key].mag)));
          weaponState[w.key].reserve=Math.max(0,Math.min(w.mag*(w.maxClips||3),Number(q.reserve??weaponState[w.key].reserve)));
          weaponState[w.key].owned=q.owned!==false;
        }
      }
      const savedInventory=Array.isArray(r.inventory_state?.inventory_weapon_keys)?r.inventory_state.inventory_weapon_keys.slice(0,10):null;
      if(savedInventory){
        while(savedInventory.length<10)savedInventory.push(null);
        for(let i=0;i<10;i++){const key=savedInventory[i];inventoryWeaponKeys[i]=key&&weaponByKey(key)?key:null}
      }
      const activeKey=String(r.inventory_state?.active_weapon_key||'');
      const activeByKey=WEAPONS.findIndex(w=>w.key===activeKey),idx=Number(r.inventory_state?.active_weapon_index);
      if(activeByKey>=0&&weaponState[activeKey]?.owned)activeWeaponIndex=activeByKey;
      else if(Number.isInteger(idx)&&idx>=0&&idx<WEAPONS.length&&weaponState[WEAPONS[idx].key]?.owned)activeWeaponIndex=idx;
      else{const first=inventoryWeaponKeys.slice(0,5).find(k=>k&&weaponState[k]?.owned);if(first)activeWeaponIndex=Math.max(0,WEAPONS.findIndex(w=>w.key===first))}
      $('loot').textContent=lootCount;updateVitals();updateAmmo();renderWeaponBar();
    }
    return r;
  }catch{return null}
}
async function checkpointYearOne(force=false){
  if(mode!=='YEAR_ONE'||!playerId||!playerSecret||yearOneCheckpointBusy)return;
  const now=performance.now();if(!force&&now-lastYearOneCheckpointAt<1800)return;
  yearOneCheckpointBusy=true;const coord=playerWorldCoordinate(),sentLoot=lootDeltaPending;
  const persistedWeapons=Object.fromEntries(WEAPONS.map(w=>[w.key,{
    mag:Math.max(0,Math.round(Number(weaponState[w.key]?.mag||0))),
    reserve:Math.max(0,Math.round(Number(weaponState[w.key]?.reserve||0))),
    owned:weaponState[w.key]?.owned!==false
  }]));
  try{
    await rpc('bridgepoint_horizon_year_one_checkpoint_v4337',{
      p_player_id:playerId,p_player_secret:playerSecret,p_health:Math.round(health),p_shield:Math.round(shield),
      p_lat:coord.lat,p_lon:coord.lon,p_accuracy_m:null,p_altitude_m:player.position.z,
      p_monster_kills_delta:0,p_loot_delta:sentLoot,
      p_inventory_state:{active_weapon_index:activeWeaponIndex,active_weapon_key:activeWeapon()?.key||null,inventory_weapon_keys:[...inventoryWeaponKeys]},
      p_weapon_state:persistedWeapons
    });
    lootDeltaPending=Math.max(0,lootDeltaPending-sentLoot);lastYearOneCheckpointAt=performance.now();
  }catch{}finally{yearOneCheckpointBusy=false}
}
function makeMonsterHealthBar(label,maxHealth,z=2.45){
  const c=document.createElement('canvas');c.width=320;c.height=86;const x=c.getContext('2d');
  const tex=new THREE.CanvasTexture(c),m=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false}),sprite=new THREE.Sprite(m);
  sprite.position.z=z;sprite.scale.set(2.65,.71,1);sprite.renderOrder=30;sprite.userData.hpBar=true;sprite.userData.canvas=c;sprite.userData.ctx=x;sprite.userData.maxHealth=maxHealth;sprite.userData.label=label;sprite.userData.texture=tex;
  return sprite;
}
function updateMonsterHealthBar(z){
  const b=z?.healthBar;if(!b)return;const x=b.userData.ctx,c=b.userData.canvas,max=Math.max(1,z.maxHealth||b.userData.maxHealth||100),hp=Math.max(0,Math.ceil(z.health||0)),ratio=Math.max(0,Math.min(1,hp/max));
  x.clearRect(0,0,c.width,c.height);
  x.fillStyle='rgba(3,7,6,.88)';x.fillRect(8,8,304,70);
  x.font='900 24px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';x.fillText((z.label||b.userData.label||'MONSTER')+'  '+hp+'/'+max,160,26);
  x.fillStyle='rgba(255,255,255,.14)';x.fillRect(28,49,264,14);
  x.fillStyle=ratio>.55?'#74f59d':ratio>.25?'#ffd166':'#ff626d';x.fillRect(28,49,264*ratio,14);
  b.userData.texture.needsUpdate=true;
}
function monsterMat(color){return new THREE.MeshStandardMaterial({color,roughness:.84,metalness:.03})}
function makeSpiderModel(){
  const g=new THREE.Group(),body=new THREE.Mesh(new THREE.SphereGeometry(.34,12,8),monsterMat(0x3d3438)),abd=new THREE.Mesh(new THREE.SphereGeometry(.44,12,8),monsterMat(0x292327));
  body.position.set(0,.18,.36);abd.position.set(0,-.28,.37);g.add(body,abd);
  const lm=monsterMat(0x211d20);
  for(let side of [-1,1])for(let i=0;i<4;i++){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.72,6),lm);leg.rotation.set(Math.PI/2,(i-1.5)*.22,side*.75);leg.position.set(side*(.36+i*.04),.08-i*.12,.26);g.add(leg)}
  return g;
}
function makeDogModel(){
  const g=new THREE.Group(),m=monsterMat(0x4d4b42),dark=monsterMat(0x302f2a),body=new THREE.Mesh(new THREE.BoxGeometry(1.05,.42,.52),m),head=new THREE.Mesh(new THREE.BoxGeometry(.42,.42,.42),dark);
  body.position.z=.55;head.position.set(0,.58,.68);g.add(body,head);
  for(const sx of [-.35,.35])for(const sy of [-.16,.16]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,.48,7),dark);leg.position.set(sx,sy,.25);g.add(leg)}
  return g;
}
function makeSimpleZombieModel(scale=1){
  const g=new THREE.Group(),skin=monsterMat(0x67715d),cloth=monsterMat(0x414a43),body=new THREE.Mesh(new THREE.BoxGeometry(.5,.3,.82),cloth),head=new THREE.Mesh(new THREE.SphereGeometry(.22,10,8),skin);
  body.position.z=.92*scale;head.position.z=1.52*scale;body.scale.setScalar(scale);head.scale.setScalar(scale);g.add(body,head);return g;
}

function circleVsRect(x,y,r,o){
  const nx=Math.max(o.minx,Math.min(x,o.maxx)),ny=Math.max(o.miny,Math.min(y,o.maxy));
  return (x-nx)*(x-nx)+(y-ny)*(y-ny)<r*r;
}
function pointInPoly(x,y,pts){
  let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y;
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+1e-12)+xi))inside=!inside;
  }return inside;
}
function segDistSq(px,py,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy||1;
  const t=Math.max(0,Math.min(1,((px-a.x)*dx+(py-a.y)*dy)/l)),x=a.x+t*dx,y=a.y+t*dy;
  return (px-x)*(px-x)+(py-y)*(py-y);
}
function circleVsPoly(x,y,r,o){
  if(x+r<o.minx||x-r>o.maxx||y+r<o.miny||y-r>o.maxy)return false;
  if(pointInPoly(x,y,o.pts))return true;
  const rr=r*r;for(let i=0,j=o.pts.length-1;i<o.pts.length;j=i++)if(segDistSq(x,y,o.pts[j],o.pts[i])<rr)return true;
  return false;
}
function collisionKey(ix,iy){return ix+':'+iy}
function registerSolidPoly(pts){
  if(!pts?.length)return;
  const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),o={pts,minx:Math.min(...xs),maxx:Math.max(...xs),miny:Math.min(...ys),maxy:Math.max(...ys),index:solidPolys.length};
  solidPolys.push(o);
  const ax=Math.floor(o.minx/COLLISION_CELL),bx=Math.floor(o.maxx/COLLISION_CELL),ay=Math.floor(o.miny/COLLISION_CELL),by=Math.floor(o.maxy/COLLISION_CELL);
  for(let ix=ax;ix<=bx;ix++)for(let iy=ay;iy<=by;iy++){const k=collisionKey(ix,iy),arr=collisionGrid.get(k)||[];arr.push(o);collisionGrid.set(k,arr)}
}
function blocked(x,y,r=.36){
  if(interiorMode)return interiorRects.some(o=>circleVsRect(x,y,r,o));
  if(rooftopState){
    const e=rooftopState.entry;
    if(e&&x>e.cx-e.w*.48&&x<e.cx+e.w*.48&&y>e.cy-e.d*.48&&y<e.cy+e.d*.48)return false;
  }
  if(solidRects.some(o=>circleVsRect(x,y,r,o)))return true;
  const ix=Math.floor(x/COLLISION_CELL),iy=Math.floor(y/COLLISION_CELL),seen=new Set();
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const o of collisionGrid.get(collisionKey(ix+dx,iy+dy))||[]){
    if(seen.has(o.index))continue;seen.add(o.index);if(circleVsPoly(x,y,r,o))return true;
  }
  return false;
}
function entranceKey(ix,iy){return ix+':'+iy}
function registerEntrance(q){
  const ix=Math.floor(q.x/ENTRANCE_CELL),iy=Math.floor(q.y/ENTRANCE_CELL),k=entranceKey(ix,iy),a=entranceGrid.get(k)||[];a.push(q);entranceGrid.set(k,a);
}
function nearbyEntrances(x,y){
  const ix=Math.floor(x/ENTRANCE_CELL),iy=Math.floor(y/ENTRANCE_CELL),out=[];
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)out.push(...(entranceGrid.get(entranceKey(ix+dx,iy+dy))||[]));
  return out;
}
function addKillFeed(killer,victim,weapon='AR-12',headshot=false){
  const feed=$('killFeed');if(!feed)return;
  const row=document.createElement('div');row.className='killRow'+(headshot?' headshot':'');
  row.innerHTML='<b>'+String(killer||'UNKNOWN')+'</b><span class="weapon">'+String(weapon||'')+'</span><b>'+String(victim||'UNKNOWN')+'</b>';
  feed.prepend(row);while(feed.children.length>6)feed.lastElementChild.remove();setTimeout(()=>row.remove(),6500);
}
function weaponByKey(key){return WEAPONS.find(w=>w.key===key)||null}
function activeWeapon(){return WEAPONS[activeWeaponIndex]||WEAPONS[0]}
function equipWeaponKey(key){const i=WEAPONS.findIndex(w=>w.key===key);if(i>=0)equipWeaponIndex(i)}
function renderWeaponBar(){
  const bar=$('weaponBar');if(!bar)return;
  bar.innerHTML=inventoryWeaponKeys.slice(0,5).map((key,slot)=>{
    const w=weaponByKey(key);if(!w)return '<button class="weaponSlot empty" data-slot="'+slot+'" disabled><b>EMPTY</b><small>QUICK '+(slot+1)+'</small></button>';
    const st=weaponState[w.key],ammo=w.mag?st.mag+'/'+st.reserve:'MELEE',active=w.key===activeWeapon()?.key;
    return '<button class="weaponSlot '+(active?'active ':'')+(st?.owned?'':'empty')+'" data-rarity="'+(w.rarity||'COMMON')+'" data-key="'+w.key+'" data-slot="'+slot+'"><b>'+w.name+'</b><small>'+ammo+' · '+(w.rarity||'COMMON')+'</small><span class="spec">'+w.damage+' BODY · '+w.head+' HEAD · '+w.range+'M · '+(w.mag?('MAG '+w.mag+' · '+w.maxClips+' SPARE CLIPS'):'MELEE')+'</span></button>';
  }).join('');
  bar.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>equipWeaponKey(b.dataset.key));
  const pack=$('backpackBar');
  if(pack){
    pack.innerHTML='<span>BACKPACK</span>'+inventoryWeaponKeys.slice(5,10).map((key,i)=>{const w=weaponByKey(key);return '<i '+(w?'data-pack="'+(i+5)+'" data-rarity="'+(w.rarity||'COMMON')+'"':'')+' title="'+(w?.name||'Empty')+'">'+(w?String(w.name).split(' ')[0].slice(0,7):String(i+1))+'</i>'}).join('');
    pack.querySelectorAll('[data-pack]').forEach(el=>el.onclick=()=>swapBackpackWeapon(Number(el.dataset.pack)));
  }
  const buildEl=$('builds');if(buildEl)buildEl.textContent=mode==='TDM'?buildCount+'/3':'—';
}
function swapBackpackWeapon(packSlot){
  const activeKey=activeWeapon()?.key,quickSlot=Math.max(0,inventoryWeaponKeys.slice(0,5).indexOf(activeKey));
  const next=inventoryWeaponKeys[packSlot];if(!next)return;
  inventoryWeaponKeys[packSlot]=inventoryWeaponKeys[quickSlot];inventoryWeaponKeys[quickSlot]=next;equipWeaponKey(next);checkpointYearOne(false);
}
function makeGrenadeRig(){
  const g=new THREE.Group(),body=new THREE.Mesh(new THREE.SphereGeometry(.18,14,10),new THREE.MeshStandardMaterial({color:0x3b4d3a,roughness:.72,metalness:.35})),
    cap=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,.13,10),new THREE.MeshStandardMaterial({color:0x242a28,roughness:.4,metalness:.72})),
    pin=new THREE.Mesh(new THREE.TorusGeometry(.065,.012,6,18),new THREE.MeshStandardMaterial({color:0xb7bdb9,metalness:.85,roughness:.24}));
  cap.position.z=.19;pin.rotation.x=Math.PI/2;pin.position.set(.07,0,.25);g.add(body,cap,pin);return g;
}
function weaponVisual(w,wrap){return w.kind==='grenade'?makeGrenadeRig():makeHorizonWeapon(THREE,w.kind,wrap)}
function refreshWeaponRig(){
  const w=activeWeapon(),wrap=savedProfile?.wrap_key||'wrap_ash';
  if(weaponRig){player.remove(weaponRig);weaponRig=null}
  if(fpWeaponRig){camera.remove(fpWeaponRig);fpWeaponRig=null}
  weaponRig=weaponVisual(w,wrap);weaponRig.scale.setScalar(w.kind==='grenade'?.75:w.kind==='melee'?.32:.28);weaponRig.rotation.set(.04,-.18,w.kind==='melee'?-.15:-Math.PI/2);weaponRig.position.set(.38,.08,1.28);player.add(weaponRig);
  fpWeaponRig=weaponVisual(w,wrap);fpWeaponRig.scale.setScalar(w.kind==='grenade'?.6:w.kind==='melee'?.24:.19);fpWeaponRig.rotation.set(.02,-.08,w.kind==='melee'?-.2:-Math.PI/2);fpWeaponRig.position.set(.29,-.42,-.24);camera.add(fpWeaponRig);
  fpWeaponRig.userData.basePosition=fpWeaponRig.position.clone();fpWeaponRig.userData.baseRotation=fpWeaponRig.rotation.clone();
  fpWeaponRig.visible=cameraMode==='first';
}
function equipWeaponIndex(i){
  i=(i+WEAPONS.length)%WEAPONS.length;if(!weaponState[WEAPONS[i].key]?.owned)return;
  activeWeaponIndex=i;reloading=false;refreshWeaponRig();updateAmmo();renderWeaponBar();toast(activeWeapon().name);
}
function cycleWeapon(){const quick=inventoryWeaponKeys.slice(0,5).filter(Boolean);if(!quick.length)return;const cur=quick.indexOf(activeWeapon()?.key),next=quick[(Math.max(0,cur)+1)%quick.length];equipWeaponKey(next)}
function dropActiveWeapon(){
  const w=activeWeapon();if(w.key==='axe'){toast('Keep one melee backup');return}
  weaponState[w.key].owned=false;const slot=inventoryWeaponKeys.indexOf(w.key);if(slot>=0)inventoryWeaponKeys[slot]=null;toast('Dropped '+w.name);
  cycleWeapon();renderWeaponBar();checkpointYearOne(false);
}
function updateAmmo(){
  const w=activeWeapon(),st=weaponState[w.key],el=$('ammo');
  ammoMag=st?.mag??0;ammoReserve=st?.reserve??0;
  if(el){el.textContent=w.mag?(ammoMag+'/'+ammoReserve):'MELEE';el.classList.toggle('ammoLow',w.mag>0&&ammoMag<=Math.max(2,Math.floor(w.mag*.2)))}
  renderWeaponBar();
}
function createAudioNoiseBuffer(key,duration=.12,decay=1.8){
  if(!audioCtx)return null;const ck=key+':'+audioCtx.sampleRate+':'+duration+':'+decay;
  if(audioBufferCache.has(ck))return audioBufferCache.get(ck);
  const len=Math.max(64,Math.floor(audioCtx.sampleRate*duration)),buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate),d=buf.getChannelData(0);let prev=0;
  for(let i=0;i<len;i++){const t=i/len,white=Math.random()*2-1;prev=prev*.2+white*.8;d[i]=prev*Math.pow(1-t,decay)}
  audioBufferCache.set(ck,buf);return buf;
}
function createProceduralImpulse(){
  if(!audioCtx)return null;const duration=MOBILE?.55:.9,len=Math.max(256,Math.floor(audioCtx.sampleRate*duration)),buf=audioCtx.createBuffer(2,len,audioCtx.sampleRate);
  for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);for(let i=0;i<len;i++){const t=i/len;d[i]=(Math.random()*2-1)*Math.pow(1-t,3.2)*(ch?.92:1)}}
  return buf;
}
function ensureAudio(){
  try{
    if(!audioCtx){
      audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      audioMaster=audioCtx.createGain();audioMaster.gain.value=.5;
      audioCompressor=audioCtx.createDynamicsCompressor();audioCompressor.threshold.value=-18;audioCompressor.knee.value=16;audioCompressor.ratio.value=4;
      audioMaster.connect(audioCompressor);audioCompressor.connect(audioCtx.destination);
      for(const [name,level] of Object.entries({weapons:.86,foley:.58,creatures:.66,ui:.50})){const g=audioCtx.createGain();g.gain.value=level;g.connect(audioMaster);audioBuses[name]=g}
      audioReverb=audioCtx.createConvolver();audioReverb.buffer=createProceduralImpulse();audioReverbGain=audioCtx.createGain();audioReverbGain.gain.value=.07;audioReverb.connect(audioReverbGain);audioReverbGain.connect(audioMaster);
    }
    if(audioCtx.state==='suspended')audioCtx.resume();
  }catch{}
}
function updateAudioEnvironment(force=false){
  if(!audioCtx||!audioReverbGain)return;const now=performance.now();if(!force&&now-lastAudioEnvAt<160)return;lastAudioEnvAt=now;
  const wet=perfTier>=2?0:(interiorMode?.24:rooftopState?.10:.045);audioReverbGain.gain.setTargetAtTime(wet,audioCtx.currentTime,.12);
}
function updateAudioListener(){
  if(!audioCtx)return;updateAudioEnvironment(false);const l=audioCtx.listener,dir=new THREE.Vector3();camera.getWorldDirection(dir);const p=camera.position;
  if(l.positionX){l.positionX.value=p.x;l.positionY.value=p.z;l.positionZ.value=-p.y;l.forwardX.value=dir.x;l.forwardY.value=dir.z;l.forwardZ.value=-dir.y;l.upX.value=0;l.upY.value=1;l.upZ.value=0}
}
function routeSpatialAudio(node,pos,bus='foley',wet=.06){
  if(!audioCtx||!node||!pos)return null;const p=audioCtx.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=2;p.maxDistance=95;p.rolloffFactor=1.08;
  p.positionX.value=pos.x;p.positionY.value=pos.z||0;p.positionZ.value=-pos.y;node.connect(p);p.connect(audioBuses[bus]||audioMaster);
  if(audioReverb&&wet>0&&perfTier<2){const send=audioCtx.createGain();send.gain.value=Math.min(.45,wet);p.connect(send);send.connect(audioReverb)}
  return p;
}
function tone(freq=140,dur=.05,gain=.035,type='square'){
  ensureAudio();if(!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(gain,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);o.connect(g);g.connect(audioBuses.ui||audioMaster||audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur);
}
function gunAudio(w){
  ensureAudio();if(!audioCtx)return;const now=audioCtx.currentTime,dur=w.kind==='shotgun'?.16:w.kind==='pistol'?.10:.075,src=audioCtx.createBufferSource(),g=audioCtx.createGain(),lp=audioCtx.createBiquadFilter();
  src.buffer=createAudioNoiseBuffer('gun-'+w.kind,dur,w.kind==='shotgun'?1.1:1.8);lp.type='lowpass';lp.frequency.value=w.kind==='shotgun'?2100:4200;
  g.gain.setValueAtTime(w.kind==='shotgun'?.34:.22,now);g.gain.exponentialRampToValueAtTime(.0001,now+dur);src.connect(lp);lp.connect(g);g.connect(audioBuses.weapons||audioMaster);src.start(now);
}
function footstepAudio(){
  const now=performance.now(),gap=sprint?250:prone?680:crouched?560:390;if(now-lastFootstepAt<gap)return;lastFootstepAt=now;ensureAudio();if(!audioCtx)return;
  const src=audioCtx.createBufferSource(),g=audioCtx.createGain(),lp=audioCtx.createBiquadFilter(),t=audioCtx.currentTime;src.buffer=createAudioNoiseBuffer(interiorMode?'step-in':'step-out',.055,1.5);
  lp.type='lowpass';lp.frequency.value=interiorMode?2700:1900;g.gain.setValueAtTime(sprint?.055:.038,t);g.gain.exponentialRampToValueAtTime(.0001,t+.065);src.connect(lp);lp.connect(g);g.connect(audioBuses.foley||audioMaster);src.start(t);
}
function creatureVocalAudio(pos,intensity=1){
  ensureAudio();if(!audioCtx||perfTier>=3)return;const now=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain(),lp=audioCtx.createBiquadFilter();o.type='sawtooth';
  o.frequency.setValueAtTime(84+rand()*25,now);o.frequency.exponentialRampToValueAtTime(48+rand()*12,now+.5);lp.type='lowpass';lp.frequency.value=1050;
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.055*intensity,now+.04);g.gain.exponentialRampToValueAtTime(.0001,now+.58);o.connect(lp);lp.connect(g);routeSpatialAudio(g,pos,'creatures',interiorMode?.25:.08);o.start(now);o.stop(now+.6);
}
function cycleCameraMode(){
  // Kept for legacy key/gamepad bindings, but Horizon no longer has a third-person mode.
  cameraMode='first';localStorage.setItem('horizon-camera-mode','first');
  if(fpWeaponRig)fpWeaponRig.visible=true;if(weaponRig)weaponRig.visible=false;
}
function setStance(next){
  prone=next==='prone';crouched=next==='crouch'||prone;
  const b=$('crouchBtn');if(b){b.classList.toggle('active',crouched);b.textContent=prone?'PRONE':crouched?'CROUCH':'STANCE'}
}
function toggleCrouch(){
  const moving=Math.abs(moveX)+Math.abs(moveY)>.3;
  if(sprint&&moving&&!prone){slideTime=.62;setStance('crouch');toast('SLIDE');tone(72,.08,.016,'triangle');return}
  if(!crouched)setStance('crouch');else if(!prone)setStance('prone');else setStance('stand');
  toast(prone?'PRONE':crouched?'CROUCH':'STAND');
}
function toggleFlashlight(){flash=!flash;$('lightUtilityBtn')?.classList.toggle('active',flash);toast(flash?'FLASHLIGHT ON':'FLASHLIGHT OFF')}
function jumpOrVault(){
  if(dead||activeZipline||activeVehicle)return;
  const f=new THREE.Vector2(-Math.sin(yaw),Math.cos(yaw)),near=.65,far=1.55;
  const bx=player.position.x+f.x*near,by=player.position.y+f.y*near,fx=player.position.x+f.x*far,fy=player.position.y+f.y*far;
  if(blocked(bx,by,.3)&&!blocked(fx,fy,.3)){player.position.x=fx;player.position.y=fy;verticalVelocity=3.1;airborne=true;toast('VAULT');return}
  if(!airborne){verticalVelocity=5.2;airborne=true;tone(90,.04,.018,'triangle')}
}
function pollGamepad(){
  const pads=navigator.getGamepads?.()||[],p=[...pads].find(Boolean);if(!p)return;
  const dz=.14,deadzone=v=>Math.abs(v)<=dz?0:Math.sign(v)*(Math.abs(v)-dz)/(1-dz);
  const lx=deadzone(p.axes?.[0]||0),ly=deadzone(p.axes?.[1]||0),rx=deadzone(p.axes?.[2]||0),ry=deadzone(p.axes?.[3]||0);
  if(Math.abs(lx)>Math.abs(touchMoveX))moveX=lx;if(Math.abs(ly)>Math.abs(touchMoveY))moveY=-ly;
  yaw-=rx*.045;pitch=Math.max(-.42,Math.min(.32,pitch-ry*.03));
  const edge=(i)=>p.buttons?.[i]?.pressed&&!pollGamepad.prev?.[i];
  if(edge(0))jumpOrVault();if(edge(1))toggleCrouch();if(edge(3))cycleWeapon();if(edge(2))reload();
  if(edge(4))useEquipment('tactical1');if(edge(5))useEquipment('tactical2');if(edge(9))useEquipment('lethal');
  if(edge(8))cycleCameraMode();sprint=!!p.buttons?.[10]?.pressed;aiming=!!p.buttons?.[6]?.pressed;
  if(p.buttons?.[7]?.pressed)shootOnce();
  pollGamepad.prev=(p.buttons||[]).map(b=>!!b.pressed);
}
function renderMinimap(){
  const cv=$('miniMap');if(!cv||!data)return;const g=cv.getContext('2d'),w=cv.width,h=cv.height,scale=2.4;
  g.clearRect(0,0,w,h);g.fillStyle=mode==='YEAR_ONE'?'rgba(28,31,32,.96)':'rgba(3,10,11,.92)';g.fillRect(0,0,w,h);
  const ox=w/2-player.position.x/scale,oy=h/2+player.position.y/scale;
  const drawLines=(rows,color,width=1)=>{g.strokeStyle=color;g.lineWidth=width;g.beginPath();for(const row of rows||[])for(const line of lines(row.geometry)){for(let i=0;i<line.length;i++){const p=project(line[i]),x=ox+p.x/scale,y=oy-p.y/scale;if(i===0)g.moveTo(x,y);else g.lineTo(x,y)}}g.stroke()};
  drawLines(data.transport,'rgba(95,226,255,.48)',1.2);
  g.strokeStyle='rgba(65,245,255,.24)';g.lineWidth=.8;for(const row of (data.parcels||[]).slice(0,350))for(const ring of rings(row.geometry)){g.beginPath();ring.forEach((q,i)=>{const p=project(q),x=ox+p.x/scale,y=oy-p.y/scale;i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke()}
  const mark=(x,y,color,r=3)=>{g.fillStyle=color;g.beginPath();g.arc(ox+x/scale,oy-y/scale,r,0,Math.PI*2);g.fill()};
  if(mode==='TDM')combatants.filter(q=>q.alive).forEach(q=>mark(q.g.position.x,q.g.position.y,q.friendly?'#64ffd4':'#ff7868',2.5));
  else{
    infected.filter(q=>q.alive&&Math.hypot(q.g.position.x-player.position.x,q.g.position.y-player.position.y)<70).forEach(q=>mark(q.g.position.x,q.g.position.y,'#ff7868',2));
    nearbyPlayers.forEach(q=>{const p=worldToLocal(Number(q.lat),Number(q.lon));mark(p.x,p.y,'#9d7cff',2.5)});
    g.save();g.globalCompositeOperation='destination-out';g.globalAlpha=.82;
    const cellSize=.0025;
    for(const key of exploredCells){
      const m=/^E(-?\d+):(-?\d+)$/.exec(String(key));if(!m)continue;
      const clat=(Number(m[1])+.5)*cellSize,clon=(Number(m[2])+.5)*cellSize,p=worldToLocal(clat,clon);
      const sx=ox+p.x/scale,sy=oy-p.y/scale;
      if(sx>-55&&sx<w+55&&sy>-55&&sy<h+55){g.beginPath();g.arc(sx,sy,30,0,Math.PI*2);g.fill()}
    }
    g.beginPath();g.arc(w/2,h/2,42,0,Math.PI*2);g.fill();g.restore();
  }
  g.save();g.translate(w/2,h/2);g.rotate(-yaw);g.fillStyle='#ffffff';g.beginPath();g.moveTo(0,-8);g.lineTo(6,7);g.lineTo(-6,7);g.closePath();g.fill();g.restore();
}
function snapshotKillcam(now=performance.now()){
  killSnapshots.push({
    t:now,camera:camera.position.toArray(),player:player.position.toArray(),yaw,pitch,
    infected:infected.map(z=>z.alive?z.g.position.toArray():null)
  });
  while(killSnapshots.length&&killSnapshots[0].t<now-12000)killSnapshots.shift();
}

function fail(e){errorBox.hidden=false;errorText.textContent=String(e?.message||e);loadText.textContent='V2 startup failed';console.error(e)}
function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1500)}
function project(c){return new THREE.Vector2((c[0]-centerLon)*111320*Math.cos(centerLat*Math.PI/180),(c[1]-centerLat)*110540)}
function rings(g){if(!g)return[];if(g.type==='Polygon')return[g.coordinates?.[0]||[]];if(g.type==='MultiPolygon')return(g.coordinates||[]).map(x=>x?.[0]||[]);return[]}
function lines(g){if(!g)return[];if(g.type==='LineString')return[g.coordinates||[]];if(g.type==='MultiLineString')return g.coordinates||[];return[]}
function mat(color,rough=.85,metal=.02){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
function addSky(){
  const sky=new THREE.Mesh(new THREE.SphereGeometry(2200,18,10),new THREE.MeshBasicMaterial({color:0x869184,side:THREE.BackSide}));scene.add(sky);
  const count=MOBILE?8:16,clouds=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,5),new THREE.MeshLambertMaterial({color:0xa5a69e,transparent:true,opacity:.34}),count),d=new THREE.Object3D();
  for(let i=0;i<count;i++){const s=18+rand()*30;d.position.set((rand()-.5)*900,(rand()-.5)*800,120+rand()*100);d.scale.set(s,s,s*.18);d.rotation.set(0,0,rand()*Math.PI);d.updateMatrix();clouds.setMatrixAt(i,d.matrix)}
  clouds.instanceMatrix.needsUpdate=true;scene.add(clouds);
}
const textureLoader=new THREE.TextureLoader();
function repeatTexture(url,x=12,y=12){
  const t=textureLoader.load(url);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(x,y);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function repeatDataTexture(url,x=12,y=12){
  const t=textureLoader.load(url);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(x,y);return t;
}
const DIRT_MAP=repeatTexture('/app/horizon-playable/assets/pbr/polyhaven/dirt_diff_1k.jpg',18,18);
const DIRT_NORMAL=repeatDataTexture('/app/horizon-playable/assets/pbr/polyhaven/dirt_nor_gl_1k.jpg',18,18);
const DIRT_ROUGH=repeatDataTexture('/app/horizon-playable/assets/pbr/polyhaven/dirt_rough_1k.jpg',18,18);
const ASPHALT_MAP=repeatTexture('/app/horizon-playable/assets/pbr/polyhaven/asphalt_03_diff_1k.jpg',7,7);
const ASPHALT_NORMAL=repeatDataTexture('/app/horizon-playable/assets/pbr/polyhaven/asphalt_03_nor_gl_1k.jpg',7,7);
const ASPHALT_ROUGH=repeatDataTexture('/app/horizon-playable/assets/pbr/polyhaven/asphalt_03_rough_1k.jpg',7,7);
const CONCRETE_MAP=repeatTexture('/app/horizon-playable/assets/pbr/polyhaven/concrete_wall_005_diff_1k.jpg',5,5);
const CONCRETE_NORMAL=repeatDataTexture('/app/horizon-playable/assets/pbr/polyhaven/concrete_wall_005_nor_gl_1k.jpg',5,5);
const CONCRETE_ROUGH=repeatDataTexture('/app/horizon-playable/assets/pbr/polyhaven/concrete_wall_005_rough_1k.jpg',5,5);
const UNIT_BOX=new THREE.BoxGeometry(1,1,1),UNIT_PLANE=new THREE.PlaneGeometry(1,1);
const ROAD_MAT=new THREE.MeshStandardMaterial({map:ASPHALT_MAP,normalMap:ASPHALT_NORMAL,roughnessMap:ASPHALT_ROUGH,color:0x727979,roughness:.94,metalness:.02});
const SIDEWALK_MAT=new THREE.MeshStandardMaterial({map:CONCRETE_MAP,normalMap:CONCRETE_NORMAL,roughnessMap:CONCRETE_ROUGH,color:0x9a9fa0,roughness:.9,metalness:.02});
const BUILD_COLORS=[0x98a1a3,0x808b8e,0xb2b6b4,0x737d80,0x9b9690,0x879093];
const BUILD_MATS=BUILD_COLORS.map(color=>new THREE.MeshStandardMaterial({map:CONCRETE_MAP,normalMap:CONCRETE_NORMAL,roughnessMap:CONCRETE_ROUGH,color,roughness:.82,metalness:.025}));
const PART_MAT=new THREE.MeshStandardMaterial({color:0xc0cbcd,roughness:.76,metalness:.04,transparent:true,opacity:.88});
const PARCEL_MAT=new THREE.LineBasicMaterial({color:0x48ecff,transparent:true,opacity:.56,depthWrite:false,blending:THREE.AdditiveBlending});
const ROAD_CYAN=new THREE.LineBasicMaterial({color:0x6beeff,transparent:true,opacity:.82,depthWrite:false});
const ROAD_YELLOW=new THREE.LineBasicMaterial({color:0xffdf7a,transparent:true,opacity:.92,depthWrite:false});
const RAIL_MAT=new THREE.LineBasicMaterial({color:0xe9f9ff,transparent:true,opacity:.72,depthWrite:false});
const WATER_LINE_MAT=new THREE.LineBasicMaterial({color:0x4ebfff,transparent:true,opacity:.75,depthWrite:false});
const WATER_MAT=new THREE.MeshStandardMaterial({color:0x225f7b,roughness:.18,metalness:.08,transparent:true,opacity:.84});

function initTerrain(){
  const t=data?.terrain;
  if(!t||!Array.isArray(t.heights_m)||Number(t.width)<2||Number(t.height)<2)return terrainInfo=null;
  const hs=t.heights_m.map(Number);if(!hs.some(Number.isFinite))return terrainInfo=null;
  const clean=hs.filter(Number.isFinite),base=Math.min(...clean);
  const west=project([data.bbox.west,centerLat]).x,east=project([data.bbox.east,centerLat]).x;
  const south=project([centerLon,data.bbox.south]).y,north=project([centerLon,data.bbox.north]).y;
  terrainInfo={width:Number(t.width),height:Number(t.height),heights:hs,base,west,east,south,north,source:t.source||'USGS 3DEP'};
  return terrainInfo;
}
function terrainZ(x,y){
  const t=terrainInfo;if(!t)return 0;
  const fx=Math.max(0,Math.min(1,(x-t.west)/Math.max(.001,t.east-t.west)));
  const fy=Math.max(0,Math.min(1,(t.north-y)/Math.max(.001,t.north-t.south)));
  const gx=fx*(t.width-1),gy=fy*(t.height-1),x0=Math.floor(gx),y0=Math.floor(gy),x1=Math.min(t.width-1,x0+1),y1=Math.min(t.height-1,y0+1),tx=gx-x0,ty=gy-y0;
  const h=(ix,iy)=>Number.isFinite(t.heights[iy*t.width+ix])?t.heights[iy*t.width+ix]:t.base;
  const a=h(x0,y0)*(1-tx)+h(x1,y0)*tx,b=h(x0,y1)*(1-tx)+h(x1,y1)*tx;
  return Math.max(-12,Math.min(260,(a*(1-ty)+b*ty)-t.base));
}
function addGround(){
  initTerrain();
  const west=project([data.bbox.west,centerLat]).x,east=project([data.bbox.east,centerLat]).x,south=project([centerLon,data.bbox.south]).y,north=project([centerLon,data.bbox.north]).y;
  const sx=terrainInfo?terrainInfo.width-1:1,sy=terrainInfo?terrainInfo.height-1:1;
  const g=new THREE.PlaneGeometry(Math.max(60,east-west),Math.max(60,north-south),sx,sy);
  if(terrainInfo){
    const pos=g.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setZ(i,terrainZ(pos.getX(i),pos.getY(i)));
    pos.needsUpdate=true;g.computeVertexNormals();
  }
  const m=new THREE.MeshStandardMaterial({map:DIRT_MAP,normalMap:DIRT_NORMAL,roughnessMap:DIRT_ROUGH,color:0x7b8374,roughness:.98,metalness:0});
  const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;world.add(mesh);
}
function lineSegmentsFrom(points,material,zOffset=.08){
  if(points.length<2)return null;
  const a=[];for(let i=1;i<points.length;i++){const p0=points[i-1],p1=points[i];a.push(p0.x,p0.y,terrainZ(p0.x,p0.y)+zOffset,p1.x,p1.y,terrainZ(p1.x,p1.y)+zOffset)}
  if(!a.length)return null;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));
  const l=new THREE.LineSegments(g,material);l.frustumCulled=true;world.add(l);return l;
}
function addRoads(){
  let n=0,surfaces=0;const cyan=[],yellow=[],rail=[],roadInstances=[],sidewalkInstances=[];
  const surfaceLimit=MOBILE?(HIGH_DEVICE?780:520):1300;
  for(const row of data.transport||[]){
    const kind=String(row.kind||'ROAD_LOCAL').toUpperCase();
    for(const line of lines(row.geometry)){
      for(let i=1;i<line.length;i++){
        const a=project(line[i-1]),b=project(line[i]),len=a.distanceTo(b);if(len<2||len>900)continue;
        const primary=kind.includes('PRIMARY'),secondary=kind.includes('SECONDARY'),isRail=kind.includes('RAIL');
        const w=isRail?2.5:primary?10.5:secondary?8:5.5,ang=Math.atan2(b.y-a.y,b.x-a.x)-Math.PI/2;
        if(!isRail&&surfaces<surfaceLimit){
          roadInstances.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:terrainZ((a.x+b.x)/2,(a.y+b.y)/2)+.035,w,len,ang});surfaces++;
          if((primary||secondary)&&!MOBILE){
            const rawAng=Math.atan2(b.y-a.y,b.x-a.x),nx=-Math.sin(rawAng),ny=Math.cos(rawAng),off=w/2+.7;
            sidewalkInstances.push({x:(a.x+b.x)/2+nx*off,y:(a.y+b.y)/2+ny*off,z:terrainZ((a.x+b.x)/2+nx*off,(a.y+b.y)/2+ny*off)+.045,w:.9,len,ang});
            sidewalkInstances.push({x:(a.x+b.x)/2-nx*off,y:(a.y+b.y)/2-ny*off,z:terrainZ((a.x+b.x)/2-nx*off,(a.y+b.y)/2-ny*off)+.045,w:.9,len,ang});
          }
        }
        const target=isRail?rail:primary?yellow:cyan;target.push(a,b);
        if(len>20&&!isRail&&n%2===0)roadAnchors.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,a:Math.atan2(b.y-a.y,b.x-a.x),w});
        n++;
      }
    }
  }
  const addInstancedStrips=(rows,material)=>{
    if(!rows.length)return;const inst=new THREE.InstancedMesh(UNIT_PLANE,material,rows.length),d=new THREE.Object3D();
    rows.forEach((r,i)=>{d.position.set(r.x,r.y,r.z);d.rotation.set(0,0,r.ang);d.scale.set(r.w,r.len,1);d.updateMatrix();inst.setMatrixAt(i,d.matrix)});
    inst.instanceMatrix.needsUpdate=true;inst.receiveShadow=true;inst.frustumCulled=true;world.add(inst);
  };
  addInstancedStrips(roadInstances,ROAD_MAT);addInstancedStrips(sidewalkInstances,SIDEWALK_MAT);
  const build=(pts,matl)=>{if(!pts.length)return;const arr=[];for(let i=0;i<pts.length;i+=2){const a=pts[i],b=pts[i+1];arr.push(a.x,a.y,terrainZ(a.x,a.y)+.075,b.x,b.y,terrainZ(b.x,b.y)+.075)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));const l=new THREE.LineSegments(g,matl);l.frustumCulled=true;mapLineGroup.add(l)};
  build(cyan,ROAD_CYAN);build(yellow,ROAD_YELLOW);build(rail,RAIL_MAT);WORLD_COUNTS.roads=n;return n;
}
function addParcels(){
  const arr=[];let count=0;
  for(const row of (data.parcels||[]).slice(0,PARCEL_LIMIT)){
    for(const ring of rings(row.geometry)){if(ring.length<3)continue;const pts=ring.map(project);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];arr.push(a.x,a.y,terrainZ(a.x,a.y)+.11,b.x,b.y,terrainZ(b.x,b.y)+.11)}count++}
  }
  if(arr.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));const l=new THREE.LineSegments(g,PARCEL_MAT);l.renderOrder=4;mapLineGroup.add(l)}
  WORLD_COUNTS.parcels=count;return count;
}
function addWater(){
  let count=0;const linePts=[];
  for(const row of (data.water||[]).slice(0,MOBILE?220:500)){
    for(const line of lines(row.geometry)){const pts=line.map(project);for(let i=1;i<pts.length;i++)linePts.push(pts[i-1],pts[i]);count++}
    for(const ring of rings(row.geometry)){
      if(ring.length<4)continue;const pts=ring.map(project),shape=new THREE.Shape();shape.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)shape.lineTo(pts[i].x,pts[i].y);
      const g=new THREE.ShapeGeometry(shape),mesh=new THREE.Mesh(g,WATER_MAT);const cx=pts.reduce((s,p)=>s+p.x,0)/pts.length,cy=pts.reduce((s,p)=>s+p.y,0)/pts.length;mesh.position.z=terrainZ(cx,cy)+.055;mesh.renderOrder=2;world.add(mesh);count++;
    }
  }
  if(linePts.length){const arr=[];for(let i=0;i<linePts.length;i+=2){const a=linePts[i],b=linePts[i+1];arr.push(a.x,a.y,terrainZ(a.x,a.y)+.08,b.x,b.y,terrainZ(b.x,b.y)+.08)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));mapLineGroup.add(new THREE.LineSegments(g,WATER_LINE_MAT))}
  WORLD_COUNTS.water=count;return count;
}
function roofMaterial(row){
  const s=String(row?.roof_material||'').toLowerCase();
  if(/metal|steel|copper|tin/.test(s))return mat(0x67767d,.36,.55);
  if(/tile|clay|terracotta/.test(s))return mat(0x815949,.86,.03);
  if(/shingle|asphalt/.test(s))return mat(0x383d40,.92,.02);
  if(/membrane|rubber|tpo|epdm/.test(s))return mat(0x757a7d,.9,.02);
  return mat(0x4d5456,.88,.03);
}
function addBuildingDetails(cx,cy,w,d,h,id,row,baseZ){
  const roofShape=String(row?.roof_shape||'').toLowerCase(),roofH=Math.max(.18,Math.min(5,Number(row?.roof_height_m||0)||.22)),rmat=roofMaterial(row);
  if(/gable|hip|pyramid|pyramidal/.test(roofShape)){
    const roof=new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*.68,Math.max(1.1,roofH),4),rmat);roof.position.set(cx,cy,baseZ+h+Math.max(.55,roofH/2));roof.rotation.z=Math.PI/4;exteriorDetailGroup.add(roof);
  }else{
    const roof=new THREE.Mesh(UNIT_BOX,rmat);roof.scale.set(w*.97,d*.97,Math.max(.14,roofH));roof.position.set(cx,cy,baseZ+h+Math.max(.08,roofH/2));exteriorDetailGroup.add(roof);
  }
  const floors=Math.max(1,Math.round(Number(row?.floors||0))||Math.round(h/3.05));
  if(MOBILE&&!HIGH_DEVICE)return;
  const dark=mat(0x26383a,.28,.18),cols=Math.min(7,Math.max(2,Math.floor(w/4)));
  for(let f=0;f<floors;f+=Math.max(1,Math.floor(floors/4)))for(let i=0;i<cols;i++){if(hash(id+':'+f+':'+i)%100<42)continue;const win=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(1.2,w/(cols+1)*.56),.7),dark);win.position.set(cx-w/2+(i+1)*w/(cols+1),cy-d/2-.012,baseZ+1.5+f*3);win.rotation.x=Math.PI/2;exteriorDetailGroup.add(win)}

}
function addBuildings(){
  let count=0;const buckets=BUILD_MATS.map(()=>[]),details=[];
  outer:for(const row of data.buildings||[]){
    for(const ring of rings(row.geometry)){
      if(ring.length<4)continue;const pts=ring.map(project),xs=pts.map(q=>q.x),ys=pts.map(q=>q.y),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys),w=maxx-minx,d=maxy-miny;
      if(!Number.isFinite(w)||!Number.isFinite(d)||w<=.25||d<=.25)continue;
      const id=String(row.id||count),sourceFloors=Math.max(0,Math.round(Number(row.floors||0))),sourceHeight=Number(row.height_m||0),
        h=sourceHeight>.5?Math.min(1200,sourceHeight):(sourceFloors>0?sourceFloors*3.05:9.0),
        cx=(minx+maxx)/2,cy=(miny+maxy)/2,baseZ=terrainZ(cx,cy),bucket=hash(id)%BUILD_MATS.length;
      buckets[bucket].push({cx,cy,h,w,d,baseZ});
      const entry={cx,cy,h,w,d,id,row,baseZ,pts,floors:sourceFloors>0?sourceFloors:Math.max(1,Math.round(h/3.05))};
      buildingEntries.push(entry);if(details.length<DETAIL_BUILDING_LIMIT)details.push(entry);
      buildingCenters.push({x:cx,y:cy,z:baseZ,h,w,d});registerSolidPoly(pts);count++;if(count>=BUILDING_LIMIT)break outer;
    }
  }
  const dummy=new THREE.Object3D();
  buckets.forEach((rows,i)=>{if(!rows.length)return;const inst=new THREE.InstancedMesh(UNIT_BOX,BUILD_MATS[i],rows.length);inst.castShadow=renderer.shadowMap.enabled;inst.receiveShadow=true;rows.forEach((r,j)=>{dummy.position.set(r.cx,r.cy,r.baseZ+r.h/2+.08);dummy.scale.set(r.w,r.d,r.h);dummy.rotation.set(0,0,0);dummy.updateMatrix();inst.setMatrixAt(j,dummy.matrix)});inst.instanceMatrix.needsUpdate=true;world.add(inst)});
  if(buildingEntries.length){
    const doorEntries=[...buildingEntries].sort((a,b)=>Math.hypot(a.cx,a.cy)-Math.hypot(b.cx,b.cy)).slice(0,MOBILE?(HIGH_DEVICE?1400:900):3200);
    const doorCount=doorEntries.reduce((n,e)=>n+4+(e.w>18?4:0)+(e.d>18?4:0),0),geom=new THREE.PlaneGeometry(1.05,2.05),doorMat=new THREE.MeshBasicMaterial({color:0x101716,transparent:true,opacity:.92,side:THREE.DoubleSide});
    const doors=new THREE.InstancedMesh(geom,doorMat,doorCount),dmy=new THREE.Object3D();let di=0;
    doorEntries.forEach((e)=>{
      const z=e.baseZ+1.03,defs=[
        {x:e.cx,y:e.cy-e.d/2-.025,ex:e.cx,ey:e.cy-e.d/2-1.05,r:0},
        {x:e.cx,y:e.cy+e.d/2+.025,ex:e.cx,ey:e.cy+e.d/2+1.05,r:Math.PI},
        {x:e.cx-e.w/2-.025,y:e.cy,ex:e.cx-e.w/2-1.05,ey:e.cy,r:Math.PI/2},
        {x:e.cx+e.w/2+.025,y:e.cy,ex:e.cx+e.w/2+1.05,ey:e.cy,r:-Math.PI/2}
      ];
      if(e.w>18){for(const off of[-e.w*.26,e.w*.26])defs.push(
        {x:e.cx+off,y:e.cy-e.d/2-.025,ex:e.cx+off,ey:e.cy-e.d/2-1.05,r:0},
        {x:e.cx+off,y:e.cy+e.d/2+.025,ex:e.cx+off,ey:e.cy+e.d/2+1.05,r:Math.PI}
      )}
      if(e.d>18){for(const off of[-e.d*.26,e.d*.26])defs.push(
        {x:e.cx-e.w/2-.025,y:e.cy+off,ex:e.cx-e.w/2-1.05,ey:e.cy+off,r:Math.PI/2},
        {x:e.cx+e.w/2+.025,y:e.cy+off,ex:e.cx+e.w/2+1.05,ey:e.cy+off,r:-Math.PI/2}
      )}
      for(const d of defs){dmy.position.set(d.x,d.y,z);dmy.rotation.set(Math.PI/2,0,d.r);dmy.scale.set(1,1,1);dmy.updateMatrix();doors.setMatrixAt(di++,dmy.matrix);registerEntrance({type:'door',x:d.ex,y:d.ey,z:e.baseZ,label:'ENTER',building:e})}
    });
    doors.count=di;doors.instanceMatrix.needsUpdate=true;doors.frustumCulled=true;world.add(doors);
  }
  const exactWallMat=new THREE.MeshStandardMaterial({map:CONCRETE_MAP,normalMap:CONCRETE_NORMAL,roughnessMap:CONCRETE_ROUGH,color:0x9da7a9,roughness:.82,metalness:.025,transparent:true,opacity:.98});
  const exactEdgeMat=new THREE.LineBasicMaterial({color:0xdffaff,transparent:true,opacity:.5,depthWrite:false});
  details.forEach(r=>{
    if(r.pts?.length>=4){
      const shape=new THREE.Shape();shape.moveTo(r.pts[0].x-r.cx,r.pts[0].y-r.cy);for(let i=1;i<r.pts.length;i++)shape.lineTo(r.pts[i].x-r.cx,r.pts[i].y-r.cy);
      const eg=new THREE.ExtrudeGeometry(shape,{depth:r.h,bevelEnabled:false,steps:1}),em=new THREE.Mesh(eg,exactWallMat);
      em.position.set(r.cx,r.cy,r.baseZ+.09);em.castShadow=renderer.shadowMap.enabled;em.receiveShadow=true;exteriorDetailGroup.add(em);
      const ep=r.pts.map(p=>new THREE.Vector3(p.x,p.y,terrainZ(p.x,p.y)+r.h+.13));if(ep.length){const edge=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ep),exactEdgeMat);exteriorDetailGroup.add(edge)}
    }
    addBuildingDetails(r.cx,r.cy,r.w,r.d,r.h,r.id,r.row,r.baseZ)
  });WORLD_COUNTS.buildings=count;return count;
}
function addBuildingParts(){
  const rows=[];let count=0;
  outer:for(const row of data.building_parts||[]){
    for(const ring of rings(row.geometry)){if(ring.length<4)continue;const pts=ring.map(project),xs=pts.map(q=>q.x),ys=pts.map(q=>q.y),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys),w=maxx-minx,d=maxy-miny;if(w<1||d<1||w>140||d>140)continue;const cx=(minx+maxx)/2,cy=(miny+maxy)/2,minH=Math.max(0,Number(row.min_height_m||0)),height=Math.max(.3,Math.min(110,Number(row.height_m||row.roof_height_m||2)));rows.push({cx,cy,w,d,z:terrainZ(cx,cy)+minH+height/2,h:height});count++;if(count>=PART_LIMIT)break outer}
  }
  if(rows.length){const inst=new THREE.InstancedMesh(UNIT_BOX,PART_MAT,rows.length),dummy=new THREE.Object3D();rows.forEach((r,i)=>{dummy.position.set(r.cx,r.cy,r.z);dummy.scale.set(r.w,r.d,r.h);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix)});inst.instanceMatrix.needsUpdate=true;inst.receiveShadow=true;world.add(inst)}
  WORLD_COUNTS.buildingParts=count;return count;
}

function interiorBox(x,y,z,w,d,h,material,collide=true){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,d,h),material);m.position.set(x,y,z+h/2);m.castShadow=renderer.shadowMap.enabled;m.receiveShadow=true;interiorGroup.add(m);
  if(collide)interiorRects.push({minx:x-w/2,maxx:x+w/2,miny:y-d/2,maxy:y+d/2});return m;
}
function clearInteriorRuntime(){
  for(let i=infected.length-1;i>=0;i--)if(infected[i].space==='interior')infected.splice(i,1);
  while(interiorGroup.children.length)interiorGroup.remove(interiorGroup.children[0]);
  for(let i=lootPickups.length-1;i>=0;i--)if(lootPickups[i].space==='interior')lootPickups.splice(i,1);
  interiorRects.length=0;activeInterior=null;
}
function spawnInteriorMonsters(entry){
  if(mode!=='YEAR_ONE'||!activeInterior)return 0;
  const n=Math.max(1,Math.min(activeInterior.floors,MOBILE?2:4));
  for(let i=0;i<n;i++){
    const floor=i%activeInterior.floors,spider=(hash(entry.id+':inside:'+i)%5===0),kind=spider?'spider':'zombie';
    const maxHealth=spider?75:100,label=spider?'SPIDER':'INDOOR ZOMBIE';
    const g=spider?makeSpiderModel():makeSimpleZombieModel(.92);
    const x=(hash(entry.id+':ix:'+i)%1000/1000-.5)*activeInterior.w*.42;
    let y=(hash(entry.id+':iy:'+i)%1000/1000-.5)*activeInterior.d*.50;
    if(floor===0&&y<-activeInterior.d*.18)y=activeInterior.d*.14;
    const z=floor*activeInterior.floorH;g.position.set(x,y,z);g.rotation.z=(hash(entry.id+':ir:'+i)%628)/100;
    const bar=makeMonsterHealthBar(label,maxHealth,spider?1.12:2.28);g.add(bar);interiorGroup.add(g);
    const patrol=[
      {x,y},{x:Math.max(-activeInterior.w*.35,Math.min(activeInterior.w*.35,-x)),y},
      {x:Math.max(-activeInterior.w*.35,Math.min(activeInterior.w*.35,-x)),y:Math.max(-activeInterior.d*.34,Math.min(activeInterior.d*.34,-y))},
      {x,y:Math.max(-activeInterior.d*.34,Math.min(activeInterior.d*.34,-y))}
    ];
    const q={g,s:spider?2.65:1.18,phase:i*.7,health:maxHealth,maxHealth,damage:25,detect:10,hearing:32,alive:true,index:1000+i,
      name:label+' '+String(i+1).padStart(2,'0'),label,kind,space:'interior',patrol,patrolIndex:0,lockedOn:false,alertUntil:0,lastHitAt:0,
      nextVocal:performance.now()+4500+i*900,nextScream:Infinity,hop:spider,hopHeight:spider?.62:0,hopPeriod:spider?780:900,hopPhase:i*150,healthBar:bar};
    infected.push(q);updateMonsterHealthBar(q);
  }
  return n;
}
function interiorFloorSlab(z,w,d,hx,hy,hw,hd,material){
  const left=(w-hw)/2,right=left,top=(d-hd)/2,bottom=top;
  interiorBox(-hw/2-left/2,0,z,left,d,.14,material,false);interiorBox(hw/2+right/2,0,z,right,d,.14,material,false);
  interiorBox(0,hy+hd/2+top/2,z,hw,top,.14,material,false);interiorBox(0,hy-hd/2-bottom/2,z,hw,bottom,.14,material,false);
}
function addInteriorWindowWall(y,w,z,seedValue){
  const wall=mat(0x8c8b84,.94,.02),glass=new THREE.MeshPhysicalMaterial({color:0x8dc7d4,roughness:.08,transparent:true,opacity:.30,transmission:.52,depthWrite:false,side:THREE.DoubleSide});
  const low=.72,high=2.30,levelH=2.86,openH=high-low,bays=Math.max(3,Math.min(8,Math.floor(w/2.4))),bay=w/bays,open=Math.abs(hash(seedValue))%bays;
  interiorBox(0,y,z,w,.16,low,wall,true);interiorBox(0,y,z+high,w,.16,levelH-high,wall,false);
  for(let i=0;i<=bays;i++){const x=-w/2+i*bay;interiorBox(x,y,z+low,.13,.17,openH,wall,false)}
  for(let i=0;i<bays;i++){if(i===open)continue;const pane=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(.5,bay-.24),openH-.08),glass.clone());pane.position.set(-w/2+(i+.5)*bay,y-.09,z+(low+high)/2);pane.rotation.x=Math.PI/2;interiorGroup.add(pane)}
}
function addRoomWallWithDoor(x,z,d){
  const wall=mat(0x77766f,.95,.01),gap=1.15;interiorBox(x,-d*.25,z,.14,d*.5-gap/2,2.75,wall,true);interiorBox(x,d*.25+gap/4,z,.14,d*.5-gap/2,2.75,wall,true);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.14,gap, .55),wall);head.position.set(x,0,z+2.48);interiorGroup.add(head);
}
function addInteriorVista(entry,w,d){
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({color:0x3b443c,roughness:1}));ground.position.set(0,0,-.22);interiorGroup.add(ground);
  const vm=new THREE.MeshStandardMaterial({color:0x566169,roughness:.84,metalness:.02});
  let n=0;for(const b of buildingCenters){
    if(n>36)break;const dx=b.x-entry.cx,dy=b.y-entry.cy;if(Math.hypot(dx,dy)<8||Math.hypot(dx,dy)>85)continue;
    const q=new THREE.Mesh(UNIT_BOX,vm);q.scale.set(Math.min(18,b.w),Math.min(18,b.d),Math.min(32,b.h));q.position.set(dx,dy,Math.min(16,b.h/2)-.1);interiorGroup.add(q);n++;
  }
}
function buildInterior(entry){
  clearInteriorRuntime();const w=Math.max(10,Math.min(24,entry.w*1.08)),d=Math.max(10,Math.min(22,entry.d*1.08)),actual=Math.max(1,entry.floors||Math.floor(entry.h/3.05)),floors=Math.min(actual,MOBILE?(HIGH_DEVICE?4:3):6),floorH=3.0;
  activeInterior={entry,w,d,floors,actualFloors:actual,floorH,stairX:w/2-2.0,stairMinY:-2.2,stairMaxY:2.2};
  const floorMat=new THREE.MeshStandardMaterial({color:0x5d5b54,roughness:.92}),wallMat=new THREE.MeshStandardMaterial({color:0x85837b,roughness:.95}),stairMat=new THREE.MeshStandardMaterial({color:0x444944,roughness:.88,metalness:.08});
  addInteriorVista(entry,w,d);
  for(let f=0;f<floors;f++){
    const z=f*floorH,holeX=activeInterior.stairX,holeY=0;
    interiorFloorSlab(z,w,d,holeX,holeY,2.1,4.8,floorMat);
    interiorBox(-w/2,0,z,.18,d,2.86,wallMat,true);interiorBox(w/2,0,z,.18,d,2.86,wallMat,true);
    addInteriorWindowWall(d/2,w,z,entry.id+':N:'+f);addInteriorWindowWall(-d/2,w,z,entry.id+':S:'+f);
    addRoomWallWithDoor(-w*.12,z,d);
    const warm=new THREE.PointLight(0xffd7a5,MOBILE?4:7,13,2);warm.position.set(-w*.22,-d*.08,z+2.35);interiorGroup.add(warm);
    if(f<floors-1){
      const dir=f%2===0?1:-1,steps=14,run=4.4;
      for(let i=0;i<steps;i++){const t=(i+.5)/steps,step=new THREE.Mesh(new THREE.BoxGeometry(1.55,run/steps+.035,floorH/steps),stairMat);step.position.set(activeInterior.stairX,(dir>0?-run/2:run/2)+dir*t*run,z+(i+.5)*floorH/steps);interiorGroup.add(step)}
    }
    const bed=new THREE.Mesh(new THREE.BoxGeometry(2.0,.95,.42),mat(0x655f55,.95,.01));bed.position.set(w*.22,d*.22,z+.23);interiorGroup.add(bed);
    const table=new THREE.Mesh(new THREE.BoxGeometry(1.3,.8,.08),mat(0x5f4937,.88,.02));table.position.set(-w*.28,d*.18,z+.78);interiorGroup.add(table);
    const lootType=['ammo','medkit','armor','weapon'][(hash(entry.id+':loot:'+f)%4)];
    const lootColor=lootType==='ammo'?0xd1b05e:lootType==='medkit'?0xd85858:lootType==='armor'?0x5aa7c9:0x73e1b2;
    const lx=(f%2?-.28:.27)*w,ly=(f%3-1)*d*.17,lz=z+.24;
    const lootMesh=new THREE.Mesh(lootType==='weapon'?new THREE.BoxGeometry(.9,.12,.12):new THREE.BoxGeometry(.34,.34,.22),new THREE.MeshStandardMaterial({color:lootColor,emissive:lootColor,emissiveIntensity:.25,roughness:.5}));
    lootMesh.position.set(lx,ly,lz);interiorGroup.add(lootMesh);
    lootPickups.push({id:'interior-'+entry.id+'-'+f,type:lootType,x:lx,y:ly,z:lz,space:'interior',mesh:lootMesh,picked:false});
  }
  const ceil=new THREE.Mesh(new THREE.BoxGeometry(w,d,.12),wallMat);ceil.position.set(0,0,floors*floorH+.08);interiorGroup.add(ceil);
  spawnInteriorMonsters(entry);syncFiniteLoot('interior').catch(()=>{});
  interiorGroup.visible=true;world.visible=false;
}
function enterInterior(entry,preciseWorldPoint=null){
  if(!entry||interiorMode)return;exteriorReturn.set(entry.cx,entry.cy-entry.d/2-1.8,entry.baseZ+.05);exteriorYaw=yaw;buildInterior(entry);interiorMode=true;rooftopState=null;
  if(preciseWorldPoint){
    const ix=THREE.MathUtils.clamp(preciseWorldPoint.x-entry.cx,-activeInterior.w*.38,activeInterior.w*.38);
    const iy=THREE.MathUtils.clamp(preciseWorldPoint.y-entry.cy,-activeInterior.d*.38,activeInterior.d*.38);
    player.position.set(ix,iy,.05);
  }else player.position.set(0,-activeInterior.d/2+1.5,.05);
  verticalVelocity=0;airborne=false;yaw=0;$('infected').textContent=infected.filter(z=>z.alive&&z.space==='interior').length;
  toast('PROCEDURAL INTERIOR · '+activeInterior.floors+' PLAYABLE FLOORS');
}
function applyPreciseSpawn(){
  if(mode!=='YEAR_ONE'){player.position.set(0,0,terrainZ(0,0));return 'WORLD'}
  if(interiorMode){interiorMode=false;interiorGroup.visible=false;world.visible=true;clearInteriorRuntime()}
  const containing=buildingEntries.find(e=>e.pts?.length>=3&&pointInPoly(0,0,e.pts));
  if(containing){enterInterior(containing,{x:0,y:0});return 'BUILDING'}
  player.position.set(0,0,terrainZ(0,0));verticalVelocity=0;airborne=false;rooftopState=null;
  $('infected').textContent=infected.filter(z=>z.alive&&z.space==='world').length;
  return 'OUTDOOR';
}
function exitInterior(){
  if(!interiorMode)return;interiorMode=false;interiorGroup.visible=false;world.visible=true;player.position.copy(exteriorReturn);yaw=exteriorYaw;verticalVelocity=0;airborne=false;
  $('infected').textContent=infected.filter(z=>z.alive&&z.space==='world').length;checkpointYearOne(false);toast('BACK OUTSIDE');
}
function interiorGroundZ(x,y,currentZ){
  if(!activeInterior)return 0;const fH=activeInterior.floorH,max=activeInterior.floors-1;
  let floor=Math.max(0,Math.min(max,Math.floor((currentZ+.16)/fH)));
  const sx=activeInterior.stairX;if(Math.abs(x-sx)<1.0&&y>=activeInterior.stairMinY-.25&&y<=activeInterior.stairMaxY+.25){
    const dir=floor%2===0?1:-1,t=THREE.MathUtils.clamp(dir>0?(y-activeInterior.stairMinY)/(activeInterior.stairMaxY-activeInterior.stairMinY):(activeInterior.stairMaxY-y)/(activeInterior.stairMaxY-activeInterior.stairMinY),0,1);
    if(floor<max)return floor*fH+t*fH;
    if(floor>0){const lower=floor-1,ldir=lower%2===0?1:-1,lt=THREE.MathUtils.clamp(ldir>0?(y-activeInterior.stairMinY)/(activeInterior.stairMaxY-activeInterior.stairMinY):(activeInterior.stairMaxY-y)/(activeInterior.stairMaxY-activeInterior.stairMinY),0,1),lz=lower*fH+lt*fH;if(Math.abs(lz-currentZ)<1.3)return lz}
  }
  return floor*fH;
}
function enterRooftop(entry){
  if(!entry)return;interiorMode=false;interiorGroup.visible=false;world.visible=true;rooftopState={entry};player.position.set(entry.cx,entry.cy,entry.baseZ+entry.h+.22);verticalVelocity=0;airborne=false;toast('ROOFTOP · ZIPLINES ACTIVE');
}
function roofPoint(entry){return new THREE.Vector3(entry.cx,entry.cy,entry.baseZ+entry.h+1.15)}
function zipPoint(z,t){const p=z.a.clone().lerp(z.b,t);p.z-=Math.sin(Math.PI*t)*Math.min(4,z.length*.045);return p}
function buildZiplines(){
  const candidates=buildingEntries.filter(e=>e.h>7&&e.w>4&&e.d>4).slice(0,MOBILE?50:90),used=new Set(),max=MOBILE?5:10,matLine=new THREE.LineBasicMaterial({color:0x252927,transparent:true,opacity:.9});
  for(const a of candidates){
    if(ziplines.length>=max||used.has(a.id))continue;let best=null,bd=Infinity;
    for(const b of candidates){if(a===b||used.has(b.id))continue;const d=Math.hypot(a.cx-b.cx,a.cy-b.cy);if(d>9&&d<120&&d<bd&&Math.abs(a.h-b.h)<38){best=b;bd=d}}
    if(!best)continue;const za=roofPoint(a),zb=roofPoint(best),z={a:za,b:zb,length:za.distanceTo(zb),from:a,to:best},pts=[];for(let i=0;i<=18;i++)pts.push(zipPoint(z,i/18));
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),matLine.clone());world.add(line);z.line=line;ziplines.push(z);used.add(a.id);used.add(best.id);
    interactables.push({type:'zipline',x:za.x,y:za.y,z:za.z-1,label:'ZIPLINE',zip:z,direction:1},{type:'zipline',x:zb.x,y:zb.y,z:zb.z-1,label:'ZIPLINE',zip:z,direction:-1});
  }return ziplines.length;
}
function startZipline(q){
  if(!q?.zip)return;activeZipline={zip:q.zip,t:q.direction>0?0:1,dir:q.direction>0?1:-1};rooftopState=null;verticalVelocity=0;airborne=true;toast('ZIPLINE');
}
function updateZipline(dt){
  if(!activeZipline)return false;const q=activeZipline,z=q.zip;q.t+=q.dir*(12.5*dt/Math.max(1,z.length));const done=q.dir>0?q.t>=1:q.t<=0;q.t=THREE.MathUtils.clamp(q.t,0,1);const p=zipPoint(z,q.t);
  player.position.set(p.x,p.y,p.z-.92);yaw=Math.atan2(z.b.x-z.a.x,z.b.y-z.a.y)+(q.dir<0?Math.PI:0);
  if(done){const e=q.dir>0?z.to:z.from;activeZipline=null;rooftopState={entry:e};player.position.set(e.cx,e.cy,e.baseZ+e.h+.2);airborne=false;toast('ZIPLINE LANDING')}return true;
}
function makeVehicle(a,i){
  const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(3.9,1.75,.72),mat(i%2?0x4d5652:0x65483d,.74,.25)),cab=new THREE.Mesh(new THREE.BoxGeometry(1.9,1.5,.7),mat(0x263438,.28,.35));
  body.position.z=.52;cab.position.set(.15,0,1.13);cab.userData.vehicleCab=true;g.add(body,cab);g.position.set(a.x,a.y,terrainZ(a.x,a.y)+.02);g.rotation.z=a.a;world.add(g);
  const v={root:g,x:a.x,y:a.y,heading:a.a,speed:0,maxSpeed:i%3===0?22:17,fuel:0,condition:72+rand()*28,type:i%3===0?'sport':'pickup',warnFuel:false,warnCondition:false,parts:{spark_plug:false,wheels:0,gas:false}};vehicles.push(v);interactables.push({type:'vehicle',x:a.x,y:a.y,z:g.position.z,label:'REPAIR / DRIVE',vehicle:v});return v;
}
function spawnVehicles(){for(let i=0;i<Math.min(MOBILE?3:6,roadAnchors.length);i++){const a=roadAnchors[(i*17+9)%roadAnchors.length];if(a)makeVehicle(a,i)}return vehicles.length}
function repairVehicleFromInventory(v){
  if(!v)return false;
  if(!v.parts.spark_plug&&vehicleParts.spark_plug>0){v.parts.spark_plug=true;vehicleParts.spark_plug--}
  while(v.parts.wheels<4&&vehicleParts.wheel>0){v.parts.wheels++;vehicleParts.wheel--}
  if(!v.parts.gas&&vehicleParts.gas>0){v.parts.gas=true;vehicleParts.gas--;v.fuel=55}
  return v.parts.spark_plug&&v.parts.wheels>=4&&v.parts.gas;
}
function enterVehicle(v){if(!v||interiorMode)return;if(v.condition<=0){toast('VEHICLE DISABLED · FIND REPAIR KIT');return}if(!repairVehicleFromInventory(v)){toast('NEEDS SPARK PLUG · 4 WHEELS · GAS');return}activeVehicle=v;player.visible=false;toast('DRIVING · '+Math.round(v.fuel)+'% FUEL · '+Math.round(v.condition)+'% CONDITION')}
function exitVehicle(){if(!activeVehicle)return;const v=activeVehicle,x=v.root.position.x+Math.cos(v.heading)*1.8,y=v.root.position.y-Math.sin(v.heading)*1.8;activeVehicle=null;player.visible=true;player.position.set(x,y,terrainZ(x,y));toast('EXITED VEHICLE')}
function updateVehicle(dt){
  if(!activeVehicle)return false;const v=activeVehicle,input=moveY;
  if(v.fuel<=0||v.condition<=0){v.speed=THREE.MathUtils.lerp(v.speed,0,1-Math.exp(-5*dt));if(v.fuel<=0&&!v.warnFuel){v.warnFuel=true;toast('OUT OF FUEL')}if(v.condition<=0&&!v.warnCondition){v.warnCondition=true;toast('VEHICLE DISABLED')}return true}
  const healthFactor=.45+.55*(v.condition/100),target=input*v.maxSpeed*healthFactor;v.speed=THREE.MathUtils.lerp(v.speed,target,1-Math.exp(-4.5*dt));v.heading-=moveX*(.75+Math.min(1,Math.abs(v.speed)/8))*dt*Math.sign(v.speed||1);
  const nx=v.root.position.x+Math.sin(v.heading)*v.speed*dt,ny=v.root.position.y+Math.cos(v.heading)*v.speed*dt;
  if(!blocked(nx,ny,.8)){v.root.position.x=nx;v.root.position.y=ny;if(Math.abs(v.speed)>.4)v.fuel=Math.max(0,v.fuel-Math.abs(v.speed)*dt*.018)}
  else{if(Math.abs(v.speed)>4){v.condition=Math.max(0,v.condition-Math.min(24,Math.abs(v.speed)*.9));tone(48,.09,.035,'sawtooth')}v.speed*=.12}
  v.root.position.z=terrainZ(v.root.position.x,v.root.position.y)+.02;v.root.rotation.z=v.heading;player.position.copy(v.root.position);yaw=THREE.MathUtils.lerp(yaw,v.heading,.14);return true;
}
function updateContext(){
  const btn=$('contextBtn');if(!btn)return;contextTarget=null;let best=3.4;
  if(activeVehicle){contextTarget={type:'vehicle_exit'};btn.hidden=false;btn.textContent='EXIT VEHICLE';return}
  if(interiorMode){
    if(player.position.y<-activeInterior.d/2+2.4&&player.position.z<1){contextTarget={type:'interior_exit'};btn.hidden=false;btn.textContent='EXIT';return}
    const top=(activeInterior.floors-1)*activeInterior.floorH;if(player.position.z>top-.3&&Math.abs(player.position.x-activeInterior.stairX)<1.5){contextTarget={type:'roof',building:activeInterior.entry};btn.hidden=false;btn.textContent='ROOF';return}
    btn.hidden=true;return;
  }
  const candidates=[...nearbyEntrances(player.position.x,player.position.y),...interactables.filter(q=>q.type!=='door')];
  for(const q of candidates){
    const qx=q.type==='vehicle'&&q.vehicle?.root?q.vehicle.root.position.x:q.x;
    const qy=q.type==='vehicle'&&q.vehicle?.root?q.vehicle.root.position.y:q.y;
    const qz=q.type==='vehicle'&&q.vehicle?.root?q.vehicle.root.position.z:(q.z??player.position.z);
    const dz=Math.abs(qz-player.position.z);if(dz>2.4)continue;const d=Math.hypot(player.position.x-qx,player.position.y-qy);
    if(d<best){best=d;contextTarget=q}
  }
  if(contextTarget){btn.hidden=false;btn.textContent=contextTarget.label||'USE'}else btn.hidden=true;
}
function contextUse(){
  const q=contextTarget;if(!q)return;if(q.type==='door')enterInterior(q.building);else if(q.type==='zipline')startZipline(q);else if(q.type==='vehicle')enterVehicle(q.vehicle);else if(q.type==='vehicle_exit')exitVehicle();else if(q.type==='interior_exit')exitInterior();else if(q.type==='roof')enterRooftop(q.building);
}

function addVegetation(){
  const size=span*1250,trMat=mat(0x4d3928,1,0),leafMats=[mat(0x344d32,1,0),mat(0x405b38,1,0),mat(0x50633e,1,0)];
  const treeN=MOBILE?(HIGH_DEVICE?240:135):430,bushN=MOBILE?(HIGH_DEVICE?100:55):180,trunks=[],leafGroups=[[],[],[]],bushGroups=[[],[],[]];
  for(let i=0;i<treeN;i++){
    const x=(rand()-.5)*size,y=(rand()-.5)*size;if(Math.hypot(x,y)<15)continue;const h=3+rand()*7,z=terrainZ(x,y);
    trunks.push({x,y,z:z+h/2,h});leafGroups[i%3].push({x,y,z:z+h+1.1,sx:.8+rand()*1.6,sy:.8+rand()*1.6,sz:2.2+rand()*3.2});
  }
  for(let i=0;i<bushN;i++){const x=(rand()-.5)*size,y=(rand()-.5)*size,s=.35+rand()*.65;bushGroups[(i+1)%3].push({x,y,z:terrainZ(x,y)+.4,s})}
  const d=new THREE.Object3D();
  if(trunks.length){const inst=new THREE.InstancedMesh(new THREE.CylinderGeometry(.16,.22,1,6),trMat,trunks.length);trunks.forEach((r,i)=>{d.position.set(r.x,r.y,r.z);d.rotation.set(Math.PI/2,0,0);d.scale.set(1,1,r.h);d.updateMatrix();inst.setMatrixAt(i,d.matrix)});inst.instanceMatrix.needsUpdate=true;ambientDetailGroup.add(inst)}
  leafGroups.forEach((rows,k)=>{if(!rows.length)return;const inst=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,7),leafMats[k],rows.length);rows.forEach((r,i)=>{d.position.set(r.x,r.y,r.z);d.rotation.set(0,0,0);d.scale.set(r.sx,r.sy,r.sz);d.updateMatrix();inst.setMatrixAt(i,d.matrix)});inst.instanceMatrix.needsUpdate=true;ambientDetailGroup.add(inst)});
  bushGroups.forEach((rows,k)=>{if(!rows.length)return;const inst=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),leafMats[k],rows.length);rows.forEach((r,i)=>{d.position.set(r.x,r.y,r.z);d.rotation.set(0,0,0);d.scale.setScalar(r.s);d.updateMatrix();inst.setMatrixAt(i,d.matrix)});inst.instanceMatrix.needsUpdate=true;ambientDetailGroup.add(inst)});
}
function addStreetLife(){
  const rows=[],signRows=[];for(let i=0;i<Math.min(110,roadAnchors.length);i+=2){const a=roadAnchors[i],side=i%4<2?1:-1,nx=-Math.sin(a.a),ny=Math.cos(a.a),x=a.x+nx*side*(a.w/2+2.2),y=a.y+ny*side*(a.w/2+2.2),z=terrainZ(x,y);rows.push({x,y,z});if(i%6===0)signRows.push({x:x+.35,y,z})}
  const d=new THREE.Object3D();
  if(rows.length){
    const poles=new THREE.InstancedMesh(new THREE.CylinderGeometry(.07,.09,1,6),mat(0x303a35,.6,.4),rows.length);
    const lamps=new THREE.InstancedMesh(UNIT_BOX,mat(0x49534e,.45,.45),rows.length);
    rows.forEach((r,i)=>{d.position.set(r.x,r.y,r.z+2.25);d.rotation.set(Math.PI/2,0,0);d.scale.set(1,1,4.5);d.updateMatrix();poles.setMatrixAt(i,d.matrix);d.position.set(r.x,r.y,r.z+4.45);d.rotation.set(0,0,0);d.scale.set(.65,.22,.18);d.updateMatrix();lamps.setMatrixAt(i,d.matrix)});
    poles.instanceMatrix.needsUpdate=lamps.instanceMatrix.needsUpdate=true;ambientDetailGroup.add(poles,lamps);
  }
  if(signRows.length){const signs=new THREE.InstancedMesh(UNIT_BOX,mat(0x6e2b24,.65,.12),signRows.length);signRows.forEach((r,i)=>{d.position.set(r.x,r.y,r.z+2.25);d.rotation.set(0,0,0);d.scale.set(.7,.08,.7);d.updateMatrix();signs.setMatrixAt(i,d.matrix)});signs.instanceMatrix.needsUpdate=true;ambientDetailGroup.add(signs)}
}
function makeSmokeTexture(){
  const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d'),r=g.createRadialGradient(32,32,3,32,32,31);
  r.addColorStop(0,'rgba(120,126,120,.72)');r.addColorStop(.45,'rgba(70,76,72,.42)');r.addColorStop(1,'rgba(20,24,22,0)');g.fillStyle=r;g.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(cv);
}
const SMOKE_TEX=makeSmokeTexture();
function addAmbientDisasterFx(){
  const count=MOBILE?(HIGH_DEVICE?5:3):9;
  for(let i=0;i<count;i++){
    const a=roadAnchors[(i*23+7)%Math.max(1,roadAnchors.length)]||{x:(rand()-.5)*250,y:(rand()-.5)*250};
    const x=a.x+(rand()-.5)*18,y=a.y+(rand()-.5)*18,z=terrainZ(x,y);
    const light=new THREE.PointLight(0xff6b2a,MOBILE?4:7,10,2);light.position.set(x,y,z+1.1);world.add(light);
    const fire=new THREE.Mesh(new THREE.ConeGeometry(.32+.18*rand(),1.1+.6*rand(),8),new THREE.MeshBasicMaterial({color:0xff6a2c,transparent:true,opacity:.82}));
    fire.position.set(x,y,z+.55);world.add(fire);
    const smoke=new THREE.Sprite(new THREE.SpriteMaterial({map:SMOKE_TEX,color:0x59615d,transparent:true,opacity:.52,depthWrite:false}));
    smoke.position.set(x,y,z+2.1);smoke.scale.set(2.4,3.4,1);world.add(smoke);
    ambientFx.push({fire,smoke,light,phase:rand()*6.28,baseZ:z});
  }
  return ambientFx.length;
}
function updateAmbientDisasterFx(now){
  if(interiorMode)return;
  const t=now*.001;
  for(const q of ambientFx){
    q.fire.scale.y=.82+.25*Math.sin(t*7+q.phase);q.fire.rotation.z=t*.35+q.phase;
    q.light.intensity=(MOBILE?3.2:5.5)+(1.4*Math.sin(t*11+q.phase));
    q.smoke.position.z=q.baseZ+2.0+(Math.sin(t*.7+q.phase)+1)*.7;q.smoke.material.opacity=.38+.16*Math.sin(t*.8+q.phase);
    q.smoke.scale.setScalar(2.4+.45*Math.sin(t*.6+q.phase));
  }
}

function addAbandonment(){
  const colors=[0x58473a,0x45514e,0x69433a,0x4c4d45],carGroups=[[],[],[],[]],cabRows=[];
  const carN=MOBILE?24:50;
  for(let i=0;i<carN;i++){
    const a=roadAnchors[i%Math.max(1,roadAnchors.length)]||{x:(rand()-.5)*400,y:(rand()-.5)*400,a:rand()*6.28,w:7};
    const x=a.x+(rand()-.5)*18,y=a.y+(rand()-.5)*18,ang=a.a+(rand()-.5)*.45,z=terrainZ(x,y);
    carGroups[i%4].push({x,y,z,ang});cabRows.push({x,y,z,ang});
    const rr=2.05;solidRects.push({type:'car',minx:x-rr,maxx:x+rr,miny:y-1.12,maxy:y+1.12});
  }
  const d=new THREE.Object3D();
  carGroups.forEach((rows,k)=>{if(!rows.length)return;const inst=new THREE.InstancedMesh(UNIT_BOX,mat(colors[k],.82,.22),rows.length);rows.forEach((r,i)=>{d.position.set(r.x,r.y,r.z+.52);d.rotation.set(0,0,r.ang);d.scale.set(3.8,1.72,.72);d.updateMatrix();inst.setMatrixAt(i,d.matrix)});inst.instanceMatrix.needsUpdate=true;ambientDetailGroup.add(inst)});
  if(cabRows.length){const inst=new THREE.InstancedMesh(UNIT_BOX,mat(0x283536,.34,.3),cabRows.length);cabRows.forEach((r,i)=>{const ox=Math.cos(r.ang)*.15,oy=Math.sin(r.ang)*.15;d.position.set(r.x+ox,r.y+oy,r.z+1.12);d.rotation.set(0,0,r.ang);d.scale.set(1.8,1.48,.66);d.updateMatrix();inst.setMatrixAt(i,d.matrix)});inst.instanceMatrix.needsUpdate=true;ambientDetailGroup.add(inst)}

  const coverRows=[[],[],[],[]],coverN=MOBILE?70:130;
  for(let i=0;i<coverN;i++){
    const a=roadAnchors[i%Math.max(1,roadAnchors.length)]||{x:(rand()-.5)*500,y:(rand()-.5)*500,a:rand()*6.28,w:7};
    const side=rand()<.5?-1:1,nx=-Math.sin(a.a),ny=Math.cos(a.a);
    const x=a.x+nx*side*(a.w/2+2+rand()*8)+(rand()-.5)*14,y=a.y+ny*side*(a.w/2+2+rand()*8)+(rand()-.5)*14;
    if(blocked(x,y,.9))continue;const kind=i%4;coverRows[kind].push({x,y,z:terrainZ(x,y),ang:rand()*Math.PI});solidRects.push({type:'cover',minx:x-.82,maxx:x+.82,miny:y-.65,maxy:y+.65});
  }
  const coverDefs=[
    {g:new THREE.BoxGeometry(1.25,.55,.85),m:mat(0x69513c,1,0),z:.42},
    {g:new THREE.CylinderGeometry(.34,.36,1.05,12),m:mat(0x565b57,.8,.12),z:.52,rx:Math.PI/2},
    {g:new THREE.BoxGeometry(1.7,.45,.72),m:mat(0x4a4038,.95,.02),z:.42},
    {g:new THREE.BoxGeometry(.8,.8,1.45),m:mat(0x6c6657,.9,.04),z:.72}
  ];
  coverRows.forEach((rows,k)=>{if(!rows.length)return;const def=coverDefs[k],inst=new THREE.InstancedMesh(def.g,def.m,rows.length);rows.forEach((r,i)=>{d.position.set(r.x,r.y,r.z+def.z);d.rotation.set(def.rx||0,0,r.ang);d.scale.set(1,1,1);d.updateMatrix();inst.setMatrixAt(i,d.matrix)});inst.instanceMatrix.needsUpdate=true;ambientDetailGroup.add(inst)});

  const types=['ammo','medkit','armor','weapon','gas','repair','sparkplug','wheel'],lootGroups=new Map(types.map(t=>[t,[]]));
  for(let i=0;i<44;i++){
    const a=roadAnchors[(i*3)%Math.max(1,roadAnchors.length)]||{x:(rand()-.5)*350,y:(rand()-.5)*350};
    const x=a.x+(rand()-.5)*22,y=a.y+(rand()-.5)*22;if(blocked(x,y,.45))continue;
    const type=types[i%types.length],lz=terrainZ(x,y)+.22;lootGroups.get(type).push({id:'loot-'+i,type,x,y,z:lz,ang:rand()*Math.PI});
  }
  const lootColor={ammo:0xd1b05e,medkit:0xd85858,armor:0x5aa7c9,weapon:0x73e1b2,gas:0xe0a13f,repair:0x90a4aa,sparkplug:0xe6e8d8,wheel:0x303638};
  for(const type of types){
    const rows=lootGroups.get(type);if(!rows.length)continue;
    const geom=type==='weapon'?new THREE.BoxGeometry(.9,.12,.12):type==='fuel'?new THREE.BoxGeometry(.38,.28,.58):new THREE.BoxGeometry(.34,.34,.22);
    const color=lootColor[type],inst=new THREE.InstancedMesh(geom,new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.25,roughness:.5}),rows.length);
    rows.forEach((r,i)=>{d.position.set(r.x,r.y,r.z);d.rotation.set(0,0,r.ang);d.scale.set(1,1,1);d.updateMatrix();inst.setMatrixAt(i,d.matrix);lootPickups.push({...r,space:'world',mesh:inst,instanceIndex:i})});
    inst.instanceMatrix.needsUpdate=true;ambientDetailGroup.add(inst);
  }

  const debrisN=MOBILE?90:220,debris=new THREE.InstancedMesh(UNIT_BOX,mat(0x51463b,1,.03),debrisN);
  for(let i=0;i<debrisN;i++){const x=(rand()-.5)*span*900,y=(rand()-.5)*span*900;d.position.set(x,y,terrainZ(x,y)+.08);d.rotation.set(rand()*2,rand()*2,rand()*6);d.scale.set(.15+rand()*.7,.15+rand()*.7,.08+rand()*.28);d.updateMatrix();debris.setMatrixAt(i,d.matrix)}
  debris.instanceMatrix.needsUpdate=true;ambientDetailGroup.add(debris);
}
function nearestLoot(){
  let best=null,dist=1.75;const wanted=interiorMode?'interior':'world';
  for(const q of lootPickups){
    if(q.picked||q.space!==wanted)continue;
    const dz=Math.abs(player.position.z-(q.z??player.position.z));if(dz>1.25)continue;
    const d=Math.hypot(player.position.x-q.x,player.position.y-q.y);if(d<dist){dist=d;best=q}
  }
  return best;
}
function nearestVehicle(max=18){
  let best=null,dist=max;for(const v of vehicles){const d=Math.hypot(player.position.x-v.root.position.x,player.position.y-v.root.position.y);if(d<dist){dist=d;best=v}}return best;
}
function lootKeyFor(q){return [mode,stateCode,centerLat.toFixed(4),centerLon.toFixed(4),q.space,q.id].join(':')}
function hideLootPickup(q){
  if(!q)return;q.picked=true;
  if(Number.isInteger(q.instanceIndex)&&q.mesh?.isInstancedMesh){const gone=new THREE.Matrix4().makeScale(0,0,0);q.mesh.setMatrixAt(q.instanceIndex,gone);q.mesh.instanceMatrix.needsUpdate=true}
  else if(q.mesh)q.mesh.visible=false;
}
async function syncFiniteLoot(space='world'){
  if(!playerId||!playerSecret)return;
  const rows=lootPickups.filter(q=>q.space===space&&q.type!=='deathdrop'&&!q.picked),keys=rows.map(lootKeyFor);
  if(!keys.length)return;
  try{
    const out=await rpc('bridgepoint_horizon_loot_state_v4340',{p_player_id:playerId,p_player_secret:playerSecret,p_loot_keys:keys});
    const taken=new Set((out?.items||[]).filter(x=>x.claimed||x.state==='CLAIMED').map(x=>x.loot_key));
    for(const q of rows)if(taken.has(lootKeyFor(q)))hideLootPickup(q);
  }catch{}
}
const deathDropMeshes=new Map();
function mergeDeathInventory(inv={}){
  shield=Math.min(100,shield+Math.max(0,Number(inv.shield||0)));
  const incoming=inv.weapons||{};
  for(const w of WEAPONS){const q=incoming[w.key];if(!q)continue;weaponState[w.key].owned=weaponState[w.key].owned||q.owned!==false;weaponState[w.key].mag=Math.min(w.mag,Math.max(weaponState[w.key].mag||0,Number(q.mag||0)));weaponState[w.key].reserve=Math.min(w.mag*(w.maxClips||3),Number(weaponState[w.key].reserve||0)+Number(q.reserve||0));if(q.owned!==false&&!inventoryWeaponKeys.includes(w.key)){const empty=inventoryWeaponKeys.findIndex(k=>!k);if(empty>=0)inventoryWeaponKeys[empty]=w.key}}
  for(const k of ['spark_plug','wheel','gas'])vehicleParts[k]=Number(vehicleParts[k]||0)+Number(inv.vehicle_parts?.[k]||0);
  updateVitals();updateAmmo();renderWeaponBar();checkpointYearOne(false);
}
async function syncDeathDrops(){
  if(!playerId||!playerSecret)return;const coord=playerWorldCoordinate();
  try{
    const out=await rpc('bridgepoint_horizon_death_drops_near_v4340',{p_player_id:playerId,p_player_secret:playerSecret,p_mode:mode,p_match_id:matchId||null,p_lat:coord.lat,p_lon:coord.lon,p_radius_m:220});
    const seen=new Set();
    for(const d of out?.drops||[]){
      const id=String(d.drop_id);seen.add(id);if(deathDropMeshes.has(id))continue;
      let x=Number(d.local_x),y=Number(d.local_y),z=Number(d.local_z);
      if(!Number.isFinite(x)||!Number.isFinite(y)){const p=worldToLocal(Number(d.lat),Number(d.lon));x=p.x;y=p.y;z=terrainZ(x,y)+.35}
      if(!Number.isFinite(z))z=terrainZ(x,y)+.35;
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(.72,.52,.42),new THREE.MeshStandardMaterial({color:0xa65cff,emissive:0x35124f,emissiveIntensity:.65,roughness:.35,metalness:.25}));
      mesh.position.set(x,y,z);world.add(mesh);deathDropMeshes.set(id,mesh);lootPickups.push({id:'death-'+id,type:'deathdrop',deathDropId:id,x,y,z,space:'world',mesh,picked:false,rarity:'EPIC'});
    }
    for(const [id,mesh] of deathDropMeshes)if(!seen.has(id)){mesh.visible=false;deathDropMeshes.delete(id)}
  }catch{}
}
async function collectDeathDrop(q){
  try{
    const out=await rpc('bridgepoint_horizon_death_drop_claim_v4340',{p_player_id:playerId,p_player_secret:playerSecret,p_drop_id:q.deathDropId});
    hideLootPickup(q);deathDropMeshes.delete(String(q.deathDropId));
    if(out?.ok){mergeDeathInventory(out.inventory||{});lootCount++;lootDeltaPending++;$('loot').textContent=lootCount;toast('PLAYER DROP CLAIMED')}
    else toast('Player drop already claimed');
  }catch{hideLootPickup(q)}
}
async function dropDeathLoot(){
  if(!playerId||!playerSecret)return;
  const coord=playerWorldCoordinate(),weapons=Object.fromEntries(WEAPONS.filter(w=>weaponState[w.key]?.owned).map(w=>[w.key,{owned:true,mag:weaponState[w.key].mag,reserve:weaponState[w.key].reserve,rarity:w.rarity}]));
  const inventory={weapons,shield,vehicle_parts:{...vehicleParts},backpack:[...backpackSlots],inventory_weapon_keys:[...inventoryWeaponKeys],active_weapon:activeWeapon()?.key};
  try{await rpc('bridgepoint_horizon_death_drop_v4340',{p_player_id:playerId,p_player_secret:playerSecret,p_mode:mode,p_match_id:matchId||null,p_lat:coord.lat,p_lon:coord.lon,p_local_x:player.position.x,p_local_y:player.position.y,p_local_z:player.position.z,p_inventory:inventory})}catch{}
}
function clearCarriedAfterDeath(){
  shield=0;for(const w of WEAPONS){weaponState[w.key].reserve=0;weaponState[w.key].mag=0;weaponState[w.key].owned=w.key==='axe'}vehicleParts.spark_plug=vehicleParts.wheel=vehicleParts.gas=0;backpackSlots.fill(null);inventoryWeaponKeys.fill(null);inventoryWeaponKeys[0]='axe';activeWeaponIndex=Math.max(0,WEAPONS.findIndex(w=>w.key==='axe'));updateVitals();updateAmmo();renderWeaponBar();
}
async function collectLoot(q){
  if(!q||q.picked)return;
  if(q.type==='deathdrop'){await collectDeathDrop(q);return}
  const coord=playerWorldCoordinate(),lootKey=lootKeyFor(q);
  try{
    const claim=await rpc('bridgepoint_horizon_loot_claim_v4340',{
      p_player_id:playerId,p_player_secret:playerSecret,p_loot_key:lootKey,p_mode:mode,p_world_key:stateCode+':'+centerLat.toFixed(4)+':'+centerLon.toFixed(4),
      p_item_key:q.type,p_rarity:q.rarity||'COMMON',p_lat:coord.lat,p_lon:coord.lon,p_local_x:q.x,p_local_y:q.y,p_local_z:q.z,p_metadata:{space:q.space}
    });
    if(claim?.already_taken){hideLootPickup(q);toast('Loot already taken');return}
  }catch(e){if(/ACCOUNT|AUTH|TOKEN|JWT/i.test(String(e?.message||''))){toast('Free Horizon account required');return}}
  hideLootPickup(q);
  lootCount++;lootDeltaPending++;$('loot').textContent=lootCount;
  if(q.type==='ammo'){for(const w of WEAPONS)if(w.mag&&weaponState[w.key]?.owned)weaponState[w.key].reserve=Math.min(w.mag*(w.maxClips||3),weaponState[w.key].reserve+Math.max(w.mag,Math.floor(w.mag*1.2)));updateAmmo();toast('Ammo acquired')}
  else if(q.type==='medkit'){health=Math.min(mode==='TDM'?150:100,health+35);updateVitals();toast('Med kit acquired')}
  else if(q.type==='armor'){if(mode==='TDM')toast('TDM uses 150 health · no shield');else{shield=Math.min(100,shield+50);updateVitals();toast(shield>=100?'Shield full · 100':'Shield +50 · '+shield)}}
  else if(q.type==='gas'){vehicleParts.gas++;toast('Gas acquired · vehicle part')}
  else if(q.type==='sparkplug'){vehicleParts.spark_plug++;toast('Spark plug acquired')}
  else if(q.type==='wheel'){vehicleParts.wheel++;toast('Wheel acquired · '+vehicleParts.wheel)}
  else if(q.type==='repair'){const v=activeVehicle||nearestVehicle();if(v){v.condition=Math.min(100,v.condition+38);toast('Vehicle repaired '+Math.round(v.condition)+'%')}else toast('Repair kit acquired')}
  else {
    const prestige=Number(savedStats?.prestige||0),level=Number(savedStats?.level||1),baseKeys=new Set(['rifle','smg','shotgun','pistol','axe']);
    const candidates=WEAPONS.filter(w=>!baseKeys.has(w.key)&&!weaponState[w.key]?.owned&&Number(w.prestigeRequired||0)<=prestige&&Number(w.unlockedLevel||1)<=level);
    const locked=candidates.length?candidates[hash(q.id+':weapon')%candidates.length]:null,empty=inventoryWeaponKeys.findIndex(k=>!k);
    if(locked&&empty>=0){
      weaponState[locked.key].owned=true;weaponState[locked.key].mag=locked.mag;weaponState[locked.key].reserve=locked.mag*Math.min(1,locked.maxClips||0);inventoryWeaponKeys[empty]=locked.key;
      toast(locked.rarity+' '+locked.name+' acquired · slot '+(empty+1));
    }else if(locked){
      const w=activeWeapon();if(w?.mag){weaponState[w.key].reserve=Math.min(w.mag*(w.maxClips||3),weaponState[w.key].reserve+w.mag);toast('Inventory full · weapon converted to '+w.name+' ammo')}
      else toast('Inventory full');
    }else toast('Weapon salvage acquired');
    renderWeaponBar();checkpointYearOne(false);
  }
}
function updateDwellPickup(now){
  const q=nearestLoot(),prompt=$('pickupPrompt'),ring=$('pickupRing'),label=$('pickupLabel');
  if(!q){pickupTarget=null;pickupStarted=0;if(prompt)prompt.hidden=true;return}
  if(pickupTarget!==q){pickupTarget=q;pickupStarted=now}
  const progress=Math.max(0,Math.min(1,(now-pickupStarted)/3000));
  if(prompt){prompt.hidden=false;prompt.style.setProperty('--pickup-angle',(progress*360)+'deg')}
  if(ring)ring.style.setProperty('--pickup-angle',(progress*360)+'deg');
  if(label)label.textContent='PICKING UP '+q.type.toUpperCase();
  if(progress>=1){collectLoot(q).catch(()=>{});pickupTarget=null;pickupStarted=0;if(prompt)prompt.hidden=true}
}
function clearSpawn(x,y,r=1.1){
  if(Math.hypot(x-player.position.x,y-player.position.y)<8)return false;
  return !blocked(x,y,r);
}
function chooseCombatSpawn(team,index){
  const pool=roadAnchors.length?roadAnchors:buildingCenters;
  for(let tries=0;tries<80;tries++){
    const seed=(index+1)*97+team*131+tries*17;
    const q=pool.length?pool[seed%pool.length]:{x:(rand()-.5)*220,y:(rand()-.5)*220};
    const ang=(seed%628)/100,dist=8+(seed%23);
    const x=q.x+Math.cos(ang)*dist,y=q.y+Math.sin(ang)*dist;
    if(clearSpawn(x,y))return{x,y};
  }
  return{x:(team===1?-1:1)*(35+index*3),y:(index%5-2)*8};
}
function canSee(a,b){
  const dx=b.x-a.x,dy=b.y-a.y;
  for(let i=1;i<8;i++){const t=i/8;if(blocked(a.x+dx*t,a.y+dy*t,.18))return false}
  return true;
}
async function spawnTdmBots(){
  const target=100,humanCount=Math.max(1,Number(activeMatch?.human_players||activeMembers.length||1)),requested=Math.max(0,Math.min(99,Number(activeMatch?.bot_players??(target-humanCount))));
  if(mode!=='TDM'||requested<=0){if($('enemyLabel'))$('enemyLabel').textContent=mode==='TDM'?'players':'infected';return 0}
  const source=await loadAsset(CHAR_MODELS.free_07),fullCap=MOBILE?(HIGH_DEVICE?12:8):20;
  const humanTeamCounts={1:0,2:0};for(const m of activeMembers){const t=Number(m.team_no||1);if(t===1||t===2)humanTeamCounts[t]++}
  const desired={1:Math.max(0,50-humanTeamCounts[1]),2:Math.max(0,50-humanTeamCounts[2])};
  let remaining=requested,index=0;
  for(const team of [1,2]){
    const n=Math.min(remaining,desired[team]);
    for(let j=0;j<n;j++,index++){
      let g;
      if(index<fullCap){g=skeletonClone(source.scene);prepHumanoid(g,{variant:(j+team)%2+1});orientHumanoid(g,1.8)}
      else{g=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.25,1.05,4,6),new THREE.MeshLambertMaterial({color:team===playerTeam?0x58798b:0x7a5d58}));body.position.z=.85;g.add(body)}
      const pos=chooseCombatSpawn(team,index);g.position.set(pos.x,pos.y,terrainZ(pos.x,pos.y));g.rotation.z=rand()*Math.PI*2;
      if(index<fullCap){const rifle=makeHorizonRifle(THREE,j%3===0?'wrap_toxic_rain':j%3===1?'wrap_blood_rust':'wrap_ash');rifle.scale.setScalar(.25);rifle.rotation.set(.04,-.18,-Math.PI/2);rifle.position.set(.36,.08,1.25);g.add(rifle)}
      const friendly=team===playerTeam,name=(friendly?'ALLY ':'ENEMY ')+String(index+1).padStart(2,'0');
      if(index<fullCap)g.add(makeNameSprite(name+' · LV '+(1+(index%100)),friendly?'#7dffe0':'#ff927d'));world.add(g);
      combatants.push({g,team,friendly,name,level:1+(index%100),health:150,maxHealth:150,alive:true,speed:3.05+rand()*.75,phase:rand()*6.28,lastShot:performance.now()+rand()*1200,index,weaponDamage:[28,40,31,108,38][index%5]});
    }remaining-=n;
  }
  if($('enemyLabel'))$('enemyLabel').textContent='combatants';if($('remaining'))$('remaining').textContent=String(combatants.filter(x=>x.alive).length+1);
  $('infected').textContent=combatants.filter(x=>x.alive&&!x.friendly).length;return combatants.length;
}
function respawnCombatant(b){
  const p=chooseCombatSpawn(b.team,b.index+17);b.g.position.set(p.x,p.y,terrainZ(p.x,p.y));b.g.visible=true;b.health=150;b.alive=true;b.lastShot=performance.now()+900;
  $('infected').textContent=combatants.filter(x=>x.alive&&!x.friendly).length;if($('remaining'))$('remaining').textContent=String(combatants.filter(x=>x.alive).length+(!dead?1:0));
}
function eliminateCombatant(b,killer='YOU'){
  if(!b.alive)return;b.alive=false;b.g.visible=false;
  addKillFeed(killer+' · LV '+(savedProfile?.level||1),b.name,'AR-12',false);
  $('infected').textContent=combatants.filter(x=>x.alive&&!x.friendly).length;if($('remaining'))$('remaining').textContent=String(combatants.filter(x=>x.alive).length+(!dead?1:0));

}
function updateCombatants(dt,t){
  if(mode!=='TDM'||tdmMovementLocked())return;
  const live=combatants.filter(x=>x.alive),maxPlayerAttackers=3;
  let attackersOnPlayer=0;
  for(const b of live){
    let target=null,targetPos=null,targetDistance=Infinity;
    const fireRadius=Number(tdmFireZone?.radius_m||Infinity);
    const outsideFire=Number.isFinite(fireRadius)&&Math.hypot(b.g.position.x,b.g.position.y)>fireRadius*.92;

    if(outsideFire){
      targetPos=new THREE.Vector3(0,0,terrainZ(0,0));
      targetDistance=Math.hypot(b.g.position.x,b.g.position.y);
      b.speed=Math.max(b.speed,6.2);
      b.roamTarget=null;
    }else{
      const rivals=live.filter(x=>x.team!==b.team);
      if(rivals.length){
        const nearest=rivals.reduce((best,q)=>{
          const d=Math.hypot(q.g.position.x-b.g.position.x,q.g.position.y-b.g.position.y);
          return !best||d<best.d?{q,d}:best;
        },null);
        if(nearest&&nearest.d<68){target=nearest.q;targetPos=nearest.q.g.position;targetDistance=nearest.d}
      }

      if(b.team!==playerTeam&&!dead&&attackersOnPlayer<maxPlayerAttackers){
        const pd=Math.hypot(player.position.x-b.g.position.x,player.position.y-b.g.position.y);
        const playerVisible=pd<42&&canSee(b.g.position,player.position);
        if(playerVisible&&(pd+5<targetDistance||!target)){
          target={player:true,name:savedProfile?.display_name||'YOU'};
          targetPos=player.position;targetDistance=pd;attackersOnPlayer++;
        }
      }

      if(!targetPos){
        if(!b.roamTarget||Math.hypot(b.g.position.x-b.roamTarget.x,b.g.position.y-b.roamTarget.y)<3){
          const pool=roadAnchors.length?roadAnchors:buildingCenters;
          const q=pool.length?pool[(b.index*37+Math.floor(t/7000)*11)%pool.length]:chooseCombatSpawn(b.team,b.index+23);
          b.roamTarget={x:q.x,y:q.y,z:terrainZ(q.x,q.y)};
        }
        targetPos=b.roamTarget;targetDistance=Math.hypot(targetPos.x-b.g.position.x,targetPos.y-b.g.position.y);
      }
    }

    if(!targetPos)continue;
    const dx=targetPos.x-b.g.position.x,dy=targetPos.y-b.g.position.y,d=Math.max(.001,Math.hypot(dx,dy)),visible=target?canSee(b.g.position,targetPos):false;
    if(!target||d>13||!visible){
      const roamSpeed=target?b.speed:Math.min(b.speed,2.45);
      const nx=b.g.position.x+dx/d*roamSpeed*dt,ny=b.g.position.y+dy/d*roamSpeed*dt;
      if(!blocked(nx,ny,.36)){b.g.position.x=nx;b.g.position.y=ny;b.g.position.z=terrainZ(nx,ny)}
      else if(!target)b.roamTarget=null;
    }else{
      const strafe=Math.sin(t*.002+b.phase)*b.speed*.28*dt,nx=b.g.position.x-dy/d*strafe,ny=b.g.position.y+dx/d*strafe;
      if(!blocked(nx,ny,.34)){b.g.position.x=nx;b.g.position.y=ny;b.g.position.z=terrainZ(nx,ny)}
    }
    b.g.rotation.z=Math.atan2(dy,dx)-Math.PI/2;

    if(target&&visible&&d<48&&t-b.lastShot>760+((b.index*137)%540)){
      b.lastShot=t;
      const accuracy=Math.max(.12,.56-d/120);
      if(rand()<accuracy){
        if(target.player){
          const dmg=Math.max(14,Math.round(Number(b.weaponDamage||31)*(0.68+rand()*.18)));
          applyPlayerHit(dmg,b);
        }else if(target.alive){
          target.health-=Math.max(14,Math.round(Number(b.weaponDamage||31)*(0.66+rand()*.20)));
          if(target.health<=0)eliminateCombatant(target,b.name+' · LV '+(b.level||1));
        }
      }
    }
  }
}
function buildInfectedPatrol(x,y,index){
  if(!roadAnchors.length)return[{x,y}];
  let cur=roadAnchors.reduce((best,a)=>{const d=Math.hypot(a.x-x,a.y-y);return !best||d<best.d?{a,d}:best},null)?.a||roadAnchors[index%roadAnchors.length],route=[];
  const used=new Set();
  for(let k=0;k<6;k++){
    route.push({x:cur.x,y:cur.y});used.add(cur);
    let best=null,score=Infinity;
    for(const a of roadAnchors){if(used.has(a))continue;const d=Math.hypot(a.x-cur.x,a.y-cur.y);if(d>8&&d<85){const s=d+((hash(index+':'+k+':'+Math.round(a.x))%100)/20);if(s<score){score=s;best=a}}}
    if(!best)break;cur=best;
  }
  return route.length?route:[{x,y}];
}
async function spawnInfected(){
  const humanoidSource=await loadAsset(CHAR_MODELS.free_03);infectedHumanoidSource=humanoidSource;
  const dogCount=3+(hash(matchSeed+':dog-pack')%3);
  const plan=[];
  for(let i=0;i<dogCount;i++)plan.push({kind:'zombie_dog',label:'ZOMBIE DOG',health:75,speed:7.25,detect:14,hearing:54,model:'dog',hop:false,barZ:1.35,pack:'DOG PACK'});
  for(let i=0;i<7;i++)plan.push({kind:'zombie',label:i%3===0?'SHAMBLER':'WALKER',health:100,speed:i%3===0?1.05:1.35,detect:12,hearing:34,model:'zombie',hop:false,barZ:2.42});
  for(let i=0;i<4;i++)plan.push({kind:'runner',label:'RUNNER',health:100,speed:7.05,detect:15,hearing:48,model:'zombie',hop:false,barZ:2.42});
  for(let i=0;i<3;i++)plan.push({kind:'spider',label:'SPIDER',health:75,speed:2.85,detect:11,hearing:30,model:'spider',hop:true,hopHeight:.68,hopPeriod:820,barZ:1.12});
  for(let i=0;i<2;i++)plan.push({kind:'orc',label:'BIG ORC',health:150,speed:2.25,detect:13,hearing:38,model:'orc',hop:true,hopHeight:.38,hopPeriod:1050,barZ:3.15});
  plan.push({kind:'screamer',label:'SCREAMER',health:100,speed:1.45,detect:16,hearing:50,model:'zombie',hop:false,barZ:2.42});
  const cap=MOBILE?(HIGH_DEVICE?18:14):plan.length,count=Math.min(cap,plan.length);
  const packAnchor=roadAnchors.length?roadAnchors[hash(matchSeed+':dog-anchor')%roadAnchors.length]:{x:28,y:28};

  for(let i=0;i<count;i++){
    const def=plan[i];let g;
    if(def.model==='spider')g=makeSpiderModel();
    else if(def.model==='dog')g=makeDogModel();
    else{
      g=skeletonClone(humanoidSource.scene);prepHumanoid(g,{infectedTint:true,variant:i%2+1});orientHumanoid(g,def.model==='orc'?2.35:1.72);
    }

    let gx,gy;
    if(def.kind==='zombie_dog'){
      const packIndex=i,angle=(packIndex/Math.max(1,dogCount))*Math.PI*2,radius=2.4+(packIndex%2)*1.1;
      gx=packAnchor.x+Math.cos(angle)*radius;gy=packAnchor.y+Math.sin(angle)*radius;
    }else{
      const a=roadAnchors.length?roadAnchors[(i*11+3)%roadAnchors.length]:null;
      gx=a?a.x+(((hash(matchSeed+':x:'+i)%1600)/100)-8):(rand()-.5)*300;
      gy=a?a.y+(((hash(matchSeed+':y:'+i)%1600)/100)-8):(rand()-.5)*300;
      if(blocked(gx,gy,.34)&&a){gx=a.x;gy=a.y}
    }

    const base=terrainZ(gx,gy);g.position.set(gx,gy,base);g.rotation.z=(hash(matchSeed+':rot:'+i)%628)/100;
    const bar=makeMonsterHealthBar(def.label,def.health,def.barZ);g.add(bar);world.add(g);
    const z={
      g,s:def.speed,phase:(hash(matchSeed+':phase:'+i)%628)/100,health:def.health,maxHealth:def.health,
      damage:25,detect:def.detect,hearing:def.hearing,alive:true,index:i,name:def.label+' '+String(i+1).padStart(2,'0'),
      label:def.label,kind:def.kind,space:'world',patrol:buildInfectedPatrol(gx,gy,i),patrolIndex:0,
      lockedOn:false,alertUntil:0,lastHitAt:0,nextVocal:performance.now()+3500+(hash(i+':vocal')%6500),
      nextScream:performance.now()+2500+(hash(i+':scream')%4500),hop:!!def.hop,hopHeight:def.hopHeight||0,
      hopPeriod:def.hopPeriod||900,hopPhase:hash(i+':hop')%900,healthBar:bar,pack:def.pack||null
    };
    infected.push(z);updateMonsterHealthBar(z);
  }
  $('infected').textContent=infected.filter(z=>z.alive&&z.space==='world').length;
}
async function addSurvivor(){
  const key=savedProfile?.avatar_key||'free_03',url=avatarModelForKey(key,CHAR_MODELS)||CHAR_MODELS.free_03;
  const source=await loadAsset(url),g=skeletonClone(source.scene);prepHumanoid(g,{variant:avatarVariantForKey(key)});orientHumanoid(g,1.82);
  g.userData.playerBody=true;player.add(g);player.add(makeNameSprite(savedProfile?.display_name||'SURVIVOR','#dffff4'));
  refreshWeaponRig();
  muzzleFlash=new THREE.PointLight(0xffc06c,0,4,2);muzzleFlash.position.set(.38,.86,1.32);player.add(muzzleFlash);
}
const flashlight=new THREE.SpotLight(0xfff0ca,0,38,.42,.55,1.5);camera.add(flashlight);flashlight.target.position.set(0,0,-4);camera.add(flashlight.target);scene.add(camera);
function nearest(){let best=null,dist=4.1;for(const q of interactables){const d=Math.hypot(player.position.x-q.x,player.position.y-q.y);if(d<dist){dist=d;best=q}}return best}
function use(){if(contextTarget)contextUse();else toast('Stand near a door, vehicle or zipline to interact')}
function reload(){
  const w=activeWeapon(),st=weaponState[w.key];if(!w.mag||reloading||st.mag>=w.mag||st.reserve<=0)return;
  reloading=true;toast('Reloading '+w.name);tone(190,.035,.02,'triangle');
  const reloadMs=w.kind==='shotgun'?1850:w.kind==='pistol'?1050:1350;
  setTimeout(()=>{const need=w.mag-st.mag,take=Math.min(need,st.reserve);st.mag+=take;st.reserve-=take;reloading=false;updateAmmo();tone(260,.03,.018,'triangle')},reloadMs);
}
function animateWeaponAttack(w){
  if(!fpWeaponRig)return;const baseP=fpWeaponRig.userData.basePosition?.clone?.()||fpWeaponRig.position.clone(),baseR=fpWeaponRig.userData.baseRotation?.clone?.()||fpWeaponRig.rotation.clone(),token=(fpWeaponRig.userData.attackToken||0)+1;fpWeaponRig.userData.attackToken=token;
  if(w.kind==='melee'){fpWeaponRig.rotation.x=baseR.x+.78;fpWeaponRig.rotation.z=baseR.z-.88;fpWeaponRig.position.y=baseP.y+.08}
  else if(w.kind==='grenade'){fpWeaponRig.rotation.x=baseR.x-.42;fpWeaponRig.position.z=baseP.z+.18;fpWeaponRig.position.y=baseP.y+.12}
  else{fpWeaponRig.rotation.x=baseR.x-.10;fpWeaponRig.position.z=baseP.z+.09;fpWeaponRig.position.y=baseP.y+.025}
  setTimeout(()=>{if(!fpWeaponRig||fpWeaponRig.userData.attackToken!==token)return;fpWeaponRig.position.copy(baseP);fpWeaponRig.rotation.copy(baseR)},w.kind==='melee'?190:95);
}
function explosionFx(pos,radius,damage,w){
  const core=new THREE.Mesh(new THREE.SphereGeometry(1,18,12),new THREE.MeshBasicMaterial({color:0xff8b3d,transparent:true,opacity:.86,depthWrite:false})),
    shock=new THREE.Mesh(new THREE.SphereGeometry(1,18,12),new THREE.MeshBasicMaterial({color:0xffd58a,wireframe:true,transparent:true,opacity:.62,depthWrite:false})),
    light=new THREE.PointLight(0xff7a38,34,Math.max(12,radius*2.5),2);
  core.position.copy(pos);shock.position.copy(pos);light.position.copy(pos);world.add(core,shock,light);tone(58,.18,.12,'sine');
  const started=performance.now(),dur=420;
  const step=now=>{const p=Math.min(1,(now-started)/dur),e=1-Math.pow(1-p,3),s=.25+radius*e;core.scale.setScalar(s*.32);shock.scale.setScalar(s);core.material.opacity=.86*(1-p);shock.material.opacity=.62*(1-p);light.intensity=34*(1-p);if(p<1)requestAnimationFrame(step);else{world.remove(core,shock,light);core.geometry.dispose();shock.geometry.dispose();core.material.dispose();shock.material.dispose()}};
  requestAnimationFrame(step);
  if(mode==='TDM'){
    for(const z of combatants){if(!z.alive||z.team===playerTeam)continue;const d=z.g.position.distanceTo(pos);if(d>radius)continue;z.health-=Math.round(damage*(1-.55*d/radius));if(z.health<=0){eliminateCombatant(z,savedProfile?.display_name||'YOU');recordTdmElimination(false,d,w).catch(()=>{})}}
  }else{
    for(const z of infected){if(!z.alive||z.space!==(interiorMode?'interior':'world'))continue;const d=z.g.position.distanceTo(pos);if(d>radius)continue;z.health-=Math.round(damage*(1-.55*d/radius));updateMonsterHealthBar(z);if(z.health<=0){z.health=0;z.alive=false;z.g.visible=false;z.respawnAt=performance.now()+120000;recordKill(z.name,false,z.kind,d,w).catch(()=>{})}}
  }
}
function launchExplosive(w,origin,dir){
  const radius=Number(w.metadata?.splash_radius_m||6),fuse=Number(w.metadata?.fuse_ms||700),distance=Math.min(w.range,w.kind==='grenade'?38:90),start=origin.clone(),end=origin.clone().addScaledVector(dir,distance);
  if(!interiorMode)end.z=Math.max(terrainZ(end.x,end.y)+.25,end.z);
  const proj=new THREE.Mesh(new THREE.SphereGeometry(w.kind==='grenade'?.12:.08,10,8),new THREE.MeshStandardMaterial({color:w.kind==='grenade'?0x475b46:0xffb66a,emissive:w.kind==='grenade'?0x000000:0x6e2d00,emissiveIntensity:.65,roughness:.45,metalness:.25}));
  proj.position.copy(start);world.add(proj);const began=performance.now();
  const fly=now=>{const p=Math.min(1,(now-began)/Math.max(220,fuse)),arc=w.kind==='grenade'?Math.sin(Math.PI*p)*5.2:Math.sin(Math.PI*p)*.7;proj.position.lerpVectors(start,end,p);proj.position.z+=arc;if(p<1)requestAnimationFrame(fly);else{const impact=proj.position.clone();world.remove(proj);proj.geometry.dispose();proj.material.dispose();explosionFx(impact,radius,w.damage,w)}};
  requestAnimationFrame(fly);
}
async function recordTdmElimination(headshot=false,distance=null,w=activeWeapon()){
  if(!matchId)return null;
  return rpc('bridgepoint_horizon_record_player_kill_v4340',{p_player_id:playerId,p_player_secret:playerSecret,p_match_id:matchId,p_event_type:'ELIMINATION',p_weapon_key:w?.key||null,p_headshot:!!headshot,p_distance_m:distance,p_metadata:{mode,client_build:4340,bot_victim:true}});
}
async function recordKill(victimName,headshot=false,kind='zombie',distance=null,w=activeWeapon()){
  addKillFeed(savedProfile?.display_name||'YOU',victimName,w?.name||activeWeapon().name,headshot);
  if(!matchId)return;
  return rpc('bridgepoint_horizon_record_player_kill_v4340',{
    p_player_id:playerId,p_player_secret:playerSecret,p_match_id:matchId,
    p_event_type:kind==='orc'?'BOSS_KILL':'INFECTED_KILL',
    p_weapon_key:w?.key||activeWeapon().key,p_headshot:!!headshot,p_distance_m:distance,p_metadata:{mode,client_build:4340,monster_kind:kind}
  }).catch(()=>null);
}
function shootOnce(){
  if(dead||reloading||tdmMovementLocked())return;
  const w=activeWeapon(),st=weaponState[w.key],now=performance.now();if(now-lastFireAt<w.interval)return;lastFireAt=now;
  if(w.mag&&st.mag<=0){reload();return}
  if(w.mag){st.mag--;updateAmmo();gunAudio(w);if(muzzleFlash){muzzleFlash.intensity=7;setTimeout(()=>{if(muzzleFlash)muzzleFlash.intensity=0},34)}}
  else tone(82,.06,.035,'triangle');
  animateWeaponAttack(w);
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);
  if(w.spread){dir.x+=(rand()-.5)*w.spread;dir.y+=(rand()-.5)*w.spread;dir.z+=(rand()-.5)*w.spread;dir.normalize()}
  const origin=camera.position.clone();
  if(w.weaponClass==='LAUNCHER'||w.weaponClass==='GRENADE'||w.kind==='grenade'){launchExplosive(w,origin,dir);if(w.mag&&st.mag===0)reload();return}
  let hit=null,best=Infinity,headshot=false,hitKind='';
  if(mode==='TDM'){
    for(const z of combatants){
      if(!z.alive||z.team===playerTeam)continue;
      const target=z.g.position.clone().add(new THREE.Vector3(0,0,1.2)),to=target.clone().sub(origin),along=to.dot(dir);
      if(along<0||along>w.range)continue;
      const closest=origin.clone().addScaledVector(dir,along),lateral=closest.distanceTo(target);
      if(lateral<.7&&along<best){hit=z;best=along;headshot=lateral<.22;hitKind='combatant'}
    }
  }else{
    const wanted=interiorMode?'interior':'world';
    for(const z of infected){
      if(!z.alive||z.space!==wanted)continue;
      const aimHeight=z.kind==='spider'?.38:z.kind==='zombie_dog'?.62:z.kind==='orc'?1.55:1.15;
      const target=z.g.position.clone().add(new THREE.Vector3(0,0,aimHeight)),to=target.clone().sub(origin),along=to.dot(dir);
      if(along<0||along>w.range)continue;
      const closest=origin.clone().addScaledVector(dir,along),lateral=closest.distanceTo(target);
      const radius=z.kind==='orc'?.92:z.kind==='spider'?.58:.72;
      if(lateral<radius&&along<best){hit=z;best=along;headshot=!['spider','zombie_dog'].includes(z.kind)&&lateral<.24;hitKind='infected'}
    }
  }
  if(hit){
    hit.health-=headshot?w.head:w.damage;hit.g.position.addScaledVector(dir,.08);
    if(hitKind==='infected')updateMonsterHealthBar(hit);
    if(hit.health<=0){
      if(hitKind==='combatant'){eliminateCombatant(hit,savedProfile?.display_name||'YOU');recordTdmElimination(headshot,best,w).catch(()=>{})}
      else{
        hit.health=0;updateMonsterHealthBar(hit);hit.alive=false;hit.g.visible=false;hit.respawnAt=performance.now()+120000;
        $('infected').textContent=infected.filter(z=>z.alive&&z.space===(interiorMode?'interior':'world')).length;
        recordKill(hit.name,headshot,hit.kind,best,w);rpc('bridgepoint_horizon_gameplay_event_v4340',{p_player_id:playerId,p_player_secret:playerSecret,p_mode:mode,p_match_id:matchId||null,p_event_type:'MONSTER_RESPAWN',p_event_key:'respawn:'+matchId+':'+hit.index+':'+Math.round(hit.respawnAt),p_value:120,p_payload:{monster:hit.kind,delay_seconds:120}}).catch(()=>{});
      }
    }
  }
  if(w.mag&&st.mag===0)reload();
}
function buildCover(){
  if(dead||tdmMovementLocked())return;
  if(mode==='TDM'&&buildCount>=3){toast('BUILD LIMIT · 3');return}
  const f=new THREE.Vector2(-Math.sin(yaw),Math.cos(yaw)),x=player.position.x+f.x*2.1,y=player.position.y+f.y*2.1;
  if(blocked(x,y,.8)){toast('Cannot build here');return}
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(2.2,.45,1.18),new THREE.MeshStandardMaterial({color:0x5c5144,roughness:.95,metalness:.03}));
  mesh.position.set(x,y,terrainZ(x,y)+.59);mesh.rotation.z=yaw;mesh.castShadow=mesh.receiveShadow=true;world.add(mesh);
  const rect={type:'built',minx:x-1.18,maxx:x+1.18,miny:y-.52,maxy:y+.52};solidRects.push(rect);builtCover.push({mesh,rect});buildCount++;if($('builds'))$('builds').textContent=mode==='TDM'?buildCount+'/3':'—';toast('Barricade built');
  if(matchId)rpc('bridgepoint_horizon_emit_world_event_v4303',{
    p_player_id:playerId,p_player_secret:playerSecret,p_match_id:matchId,p_cell_key:activeMatch?.cell_seed||('MATCH_'+matchId),
    p_event_type:'FORTIFICATION',p_event_key:'build-'+playerId+'-'+buildCount,p_payload:{kind:'barricade',x,y,yaw},p_ttl_seconds:86400
  }).catch(()=>{});
}
function buildCampfire(){
  if(mode!=='YEAR_ONE'){toast('Campfires are a Year One survival tool');return}
  if(dead||interiorMode||activeVehicle)return;
  buildCampfire.items=buildCampfire.items||[];
  if(buildCampfire.items.length>=3){toast('Maximum 3 active campfires nearby');return}
  const f=new THREE.Vector2(-Math.sin(yaw),Math.cos(yaw)),x=player.position.x+f.x*2.3,y=player.position.y+f.y*2.3;
  if(blocked(x,y,.65)){toast('Cannot build fire here');return}
  const z=terrainZ(x,y),g=new THREE.Group(),woodMat=new THREE.MeshStandardMaterial({color:0x4a2f20,roughness:.95}),stoneMat=new THREE.MeshStandardMaterial({color:0x5a5d58,roughness:1});
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2,s=new THREE.Mesh(new THREE.SphereGeometry(.16,8,6),stoneMat);s.scale.set(1.5,.9,.65);s.position.set(Math.cos(a)*.52,Math.sin(a)*.52,.12);g.add(s)}
  for(let i=0;i<3;i++){const log=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,.85,8),woodMat);log.rotation.set(Math.PI/2,0,i*Math.PI/3);log.position.z=.15;g.add(log)}
  const fire=new THREE.Mesh(new THREE.ConeGeometry(.34,1.05,9),new THREE.MeshBasicMaterial({color:0xff6a2c,transparent:true,opacity:.88}));fire.position.z=.62;g.add(fire);
  const smoke=new THREE.Sprite(new THREE.SpriteMaterial({map:SMOKE_TEX,color:0x59615d,transparent:true,opacity:.38,depthWrite:false}));smoke.position.z=2.0;smoke.scale.set(1.9,2.7,1);g.add(smoke);
  const light=new THREE.PointLight(0xff6b2a,7,11,2);light.position.z=1.0;g.add(light);g.position.set(x,y,z);world.add(g);
  const fx={fire,smoke,light,phase:rand()*6.28,baseZ:0,campfire:true,root:g};ambientFx.push(fx);buildCampfire.items.push(fx);solidRects.push({type:'campfire',minx:x-.55,maxx:x+.55,miny:y-.55,maxy:y+.55});
  rpc('bridgepoint_horizon_emit_world_event_v4303',{p_player_id:playerId,p_player_secret:playerSecret,p_match_id:matchId,p_cell_key:activeMatch?.cell_seed||('MATCH_'+matchId),p_event_type:'FORTIFICATION',p_event_key:'campfire-'+playerId+'-'+Date.now(),p_payload:{kind:'campfire',x,y,z},p_ttl_seconds:7200}).catch(()=>{});
  toast('CAMPFIRE BUILT · WARMTH RADIUS 8M');
}
let yearDeathResult=null,killcamTimer=null;
async function finishDeathFlow(){
  clearTimeout(killcamTimer);
  if(mode==='YEAR_ONE'&&yearDeathResult?.spectator_only){location.assign('/app/horizon/?tab=WATCH');return}
  location.assign('/app/horizon/?returned=death');
}
async function triggerDeath(killer){
  if(dead)return;dead=true;shooting=false;sprint=false;
  await dropDeathLoot();clearCarriedAfterDeath();
  const kc=$('killCam');if(kc)kc.hidden=false;
  const title=$('killCamTitle'),phase=$('killCamPhase');
  if(title)title.textContent='ELIMINATED BY '+(killer?.name||'THE HORDE');
  if(mode==='YEAR_ONE'&&playerId&&playerSecret){
    await checkpointYearOne(true);
    yearDeathResult=await rpc('bridgepoint_horizon_year_one_death_v4310',{
      p_player_id:playerId,p_player_secret:playerSecret,p_death_key:'death-'+Date.now()
    }).catch(()=>null);
  }
  const killerIndex=killer?.index??-1,pre=killSnapshots.filter(s=>s.t>=performance.now()-5000),started=performance.now();
  const playback=()=>{
    if(!dead)return;
    const elapsed=performance.now()-started;
    if(elapsed<5000&&pre.length&&killerIndex>=0){
      const idx=Math.min(pre.length-1,Math.floor(elapsed/5000*pre.length)),s=pre[idx],kp=s.infected?.[killerIndex],pp=s.player;
      if(kp&&pp){camera.position.set(kp[0],kp[1],kp[2]+1.5);camera.lookAt(pp[0],pp[1],pp[2]+1.05)}
      if(phase)phase.textContent='5 seconds before the kill';
      requestAnimationFrame(playback);return;
    }
    if(elapsed<6500){
      if(phase)phase.textContent='SLOW-MOTION KILL';
      if(killer){camera.position.lerp(killer.g.position.clone().add(new THREE.Vector3(0,0,1.5)),.08);camera.lookAt(player.position.clone().add(new THREE.Vector3(0,0,1.05)))}
      requestAnimationFrame(playback);return;
    }
    if(elapsed<11500){
      if(phase)phase.textContent='5 seconds after elimination';
      if(killer){camera.position.lerp(killer.g.position.clone().add(new THREE.Vector3(0,0,1.8)),.04);camera.lookAt(player.position.clone().add(new THREE.Vector3(0,0,1.0)))}
      requestAnimationFrame(playback);return;
    }
  };
  playback();killcamTimer=setTimeout(finishDeathFlow,10000);
}
function updateInfected(dt,t){
  const wanted=interiorMode?'interior':'world';
  for(const z of infected){
    if(!z.alive){
      if(z.respawnAt&&t>=z.respawnAt&&z.space==='world'){
        const home=z.patrol?.[0]||{x:z.g.position.x,y:z.g.position.y};
        if(Math.hypot(home.x-player.position.x,home.y-player.position.y)>=45){
          z.g.position.set(home.x,home.y,terrainZ(home.x,home.y));z.health=z.maxHealth;z.alive=true;z.lockedOn=false;z.respawnAt=0;z.g.visible=true;updateMonsterHealthBar(z);
        }
      }
      if(!z.alive)continue;
    }
    const sameSpace=z.space===wanted;
    if(!sameSpace){z.g.visible=false;continue}

    let dx=player.position.x-z.g.position.x,dy=player.position.y-z.g.position.y;
    let d=Math.hypot(dx,dy),vertical=Math.abs(player.position.z-z.g.position.z);
    const heard=!dead&&(t-lastFootstepAt<950)&&d<z.hearing;
    if(!dead&&(heard||d<z.detect))z.lockedOn=true;
    const aggro=!dead&&z.lockedOn;

    if(d>perfSimRadius()&&!aggro){z.g.visible=false;continue}else z.g.visible=true;

    if(z.kind==='screamer'&&aggro&&d<28&&t>z.nextScream){
      z.nextScream=t+7000;creatureVocalAudio(z.g.position,1.3);
      for(const q of infected){
        if(q.alive&&q.space===wanted&&Math.hypot(q.g.position.x-z.g.position.x,q.g.position.y-z.g.position.y)<70)q.lockedOn=true;
      }
    }else if(d<32&&t>z.nextVocal){
      z.nextVocal=t+5000+(hash(z.index+':v:'+Math.floor(t/1000))%8000);
      creatureVocalAudio(z.g.position,z.kind==='orc'?1.15:.75);
    }

    let tx=player.position.x,ty=player.position.y;
    if(aggro&&z.space==='interior'&&activeInterior&&vertical>1.35){
      tx=activeInterior.stairX;ty=(activeInterior.stairMinY+activeInterior.stairMaxY)/2;
      dx=tx-z.g.position.x;dy=ty-z.g.position.y;d=Math.max(.001,Math.hypot(dx,dy));
    }

    if(aggro&&d>1.08){
      const nx=z.g.position.x+dx/Math.max(.001,d)*z.s*dt,ny=z.g.position.y+dy/Math.max(.001,d)*z.s*dt;
      if(!blocked(nx,ny,z.kind==='orc'?.46:.30)){z.g.position.x=nx;z.g.position.y=ny}
      z.g.rotation.z=Math.atan2(dy,dx)-Math.PI/2;
    }else if(!dead&&z.patrol?.length){
      const p=z.patrol[z.patrolIndex%z.patrol.length],px=p.x-z.g.position.x,py=p.y-z.g.position.y,pd=Math.hypot(px,py);
      if(pd<1.0)z.patrolIndex=(z.patrolIndex+1)%z.patrol.length;
      else{
        const patrolSpeed=Math.min(1.35,z.s*.38),nx=z.g.position.x+px/pd*patrolSpeed*dt,ny=z.g.position.y+py/pd*patrolSpeed*dt;
        if(!blocked(nx,ny,.28)){z.g.position.x=nx;z.g.position.y=ny}z.g.rotation.z=Math.atan2(py,px)-Math.PI/2;
      }
    }

    const base=z.space==='interior'
      ?interiorGroundZ(z.g.position.x,z.g.position.y,z.g.position.z)
      :terrainZ(z.g.position.x,z.g.position.y);
    const hop=z.hop?Math.max(0,Math.sin(((t+z.hopPhase)%z.hopPeriod)/z.hopPeriod*Math.PI*2))*z.hopHeight:0;
    z.g.position.z=base+hop;

    const contactD=Math.hypot(player.position.x-z.g.position.x,player.position.y-z.g.position.y);
    const contactZ=Math.abs(player.position.z-z.g.position.z);
    if(!dead&&contactD<(z.kind==='orc'?1.45:1.18)&&contactZ<1.6&&t-z.lastHitAt>=850){
      z.lastHitAt=t;applyPlayerHit(25,z);
    }
  }
}
function kmBetween(lat1,lon1,lat2,lon2){
  const r=6371,toRad=Math.PI/180,dLat=(lat2-lat1)*toRad,dLon=(lon2-lon1)*toRad;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*toRad)*Math.cos(lat2*toRad)*Math.sin(dLon/2)**2;
  return 2*r*Math.asin(Math.sqrt(a));
}
function ensureRainFx(){
  if(rainFx)return rainFx;
  const n=MOBILE?260:520,positions=new Float32Array(n*3);
  for(let i=0;i<n;i++){positions[i*3]=(rand()-.5)*28;positions[i*3+1]=(rand()-.5)*28;positions[i*3+2]=2+rand()*18}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const m=new THREE.PointsMaterial({color:0xa7dcff,size:MOBILE?.045:.055,transparent:true,opacity:.62,depthWrite:false});
  rainFx=new THREE.Points(g,m);rainFx.visible=false;rainFx.frustumCulled=false;scene.add(rainFx);return rainFx;
}
function perfSimRadius(){return [230,180,135,95][perfTier]||95}
function perfCadence(){
  if(MOBILE)return [
    {ai:1/30,fx:1/30,light:1/20,minimap:8},
    {ai:1/24,fx:1/20,light:1/15,minimap:12},
    {ai:1/18,fx:1/15,light:1/12,minimap:18},
    {ai:1/12,fx:1/10,light:1/8,minimap:26}
  ][perfTier];
  return [
    {ai:1/60,fx:1/45,light:1/30,minimap:6},
    {ai:1/40,fx:1/30,light:1/24,minimap:9},
    {ai:1/28,fx:1/22,light:1/18,minimap:14},
    {ai:1/18,fx:1/15,light:1/12,minimap:20}
  ][perfTier];
}
function fillActorProxy(mesh,rows){
  const d=new THREE.Object3D();let n=0;
  const proxyRadius=perfSimRadius()*1.35,proxyCap=MOBILE?36:64;
  const ranked=rows.map(q=>({q,d:Math.hypot(q.g.position.x-player.position.x,q.g.position.y-player.position.y)}))
    .filter(x=>x.d<=proxyRadius).sort((a,b)=>a.d-b.d);
  for(const row of ranked){
    if(n>=Math.min(PROXY_MAX,proxyCap))break;
    const q=row.q;d.position.set(q.g.position.x,q.g.position.y,q.g.position.z+.81);
    d.rotation.set(0,0,q.g.rotation.z||0);d.scale.set(1,1,1);d.updateMatrix();mesh.setMatrixAt(n++,d.matrix);
  }
  mesh.count=n;mesh.visible=perfTier>=3&&n>0;mesh.instanceMatrix.needsUpdate=true;
}
function updateActorProxies(){
  if(perfTier<3){allyProxy.visible=enemyProxy.visible=infectedProxy.visible=false;return}
  fillActorProxy(allyProxy,combatants.filter(q=>q.alive&&q.friendly&&!q.g.visible));
  fillActorProxy(enemyProxy,combatants.filter(q=>q.alive&&!q.friendly&&!q.g.visible));
  fillActorProxy(infectedProxy,infected.filter(q=>q.alive&&!q.g.visible));
}
function updatePerfVisualBudget(){
  const maxFx=[ambientFx.length,Math.min(6,ambientFx.length),Math.min(2,ambientFx.length),0][perfTier];
  ambientFx.forEach((q,i)=>{
    const d=Math.hypot((q.fire?.position.x||0)-player.position.x,(q.fire?.position.y||0)-player.position.y);
    const on=i<maxFx&&d<(perfTier>=2?90:150);
    if(q.fire)q.fire.visible=on;if(q.smoke)q.smoke.visible=on;if(q.light)q.light.visible=on;
  });
  const radius=perfSimRadius(),actorCap=[30,14,8,1][perfTier];
  const rank=(arr)=>arr.filter(q=>q.alive).map(q=>({q,d:Math.hypot(q.g.position.x-player.position.x,q.g.position.y-player.position.y)})).sort((a,b)=>a.d-b.d);
  const infectRank=rank(infected),combatRank=rank(combatants);
  const visibleSet=(rows)=>new Set(rows.filter((x,i)=>x.d<radius&&i<actorCap).map(x=>x.q));
  const vi=visibleSet(infectRank),vc=visibleSet(combatRank);
  const tuneActor=(q,on,kind)=>{
    q.g.visible=on;
    q.g.traverse?.(o=>{
      if(o.isSprite){o.visible=on&&(o.userData?.hpBar||perfTier<2);return}
      if(!o.isMesh)return;
      if(perfTier>=3&&on){
        if(!o.userData.bpActorHqMaterial)o.userData.bpActorHqMaterial=o.material;
        if(!o.userData.bpActorLowMaterial)o.userData.bpActorLowMaterial=new THREE.MeshLambertMaterial({color:kind==='infected'?0x65735b:kind==='friendly'?0x58798b:0x7a5d58});
        o.material=o.userData.bpActorLowMaterial;
      }else if(o.userData.bpActorHqMaterial){
        o.material=o.userData.bpActorHqMaterial;
      }
    });
  };
  for(const z of infected)if(z.alive)tuneActor(z,vi.has(z),'infected');
  for(const b of combatants)if(b.alive)tuneActor(b,vc.has(b),b.friendly?'friendly':'enemy');
  ambientDetailGroup.visible=perfTier<3;
  for(const v of vehicles)for(const ch of v.root.children)if(ch.userData?.vehicleCab)ch.visible=perfTier<3;
  updateActorProxies();
}
function lowCostMaterial(m){
  if(!m||(!m.isMeshStandardMaterial&&!m.isMeshPhysicalMaterial))return m;
  if(lowMaterialCache.has(m))return lowMaterialCache.get(m);
  const q=new THREE.MeshLambertMaterial({
    color:m.color?.clone?.()||new THREE.Color(0xffffff),map:m.map||null,
    transparent:!!m.transparent,opacity:m.opacity??1,side:m.side,depthWrite:m.depthWrite!==false,
    alphaTest:m.alphaTest||0,vertexColors:!!m.vertexColors
  });
  lowMaterialCache.set(m,q);return q;
}
function applyWorldShaderBudget(low){
  world.traverse(o=>{
    if(!o.isMesh||o.userData?.playerBody||o.userData?.perfProxy)return;
    if(low){
      if(!o.userData.bpHqMaterial)o.userData.bpHqMaterial=o.material;
      const src=o.userData.bpHqMaterial;
      o.material=Array.isArray(src)?src.map(lowCostMaterial):lowCostMaterial(src);
    }else if(o.userData.bpHqMaterial){
      o.material=o.userData.bpHqMaterial;delete o.userData.bpHqMaterial;
    }
  });
  renderer.toneMapping=low?THREE.NoToneMapping:THREE.ACESFilmicToneMapping;
}
function setPerfTier(next,reason='auto'){
  next=Math.max(0,Math.min(3,next|0));if(next===perfTier)return;
  perfTier=next;
  const floor=MOBILE?.50:.72,deviceCeiling=Math.min(devicePixelRatio||1,HIGH_DEVICE?1.25:(MOBILE?.88:1.05));
  const cap=MOBILE?[deviceCeiling,.76,.62,.50][perfTier]:[deviceCeiling,1,.88,.74][perfTier];
  const desired=Math.max(floor,Math.min(renderScale,cap));
  if(Math.abs(desired-renderScale)>.015){renderScale=desired;renderer.setPixelRatio(renderScale);renderer.setSize(innerWidth,innerHeight,false)}
  if(perfTier>=2&&renderer.shadowMap.enabled){renderer.shadowMap.enabled=false;sun.castShadow=false}
  if(perfTier===0&&HIGH_DEVICE&&!renderer.shadowMap.enabled){renderer.shadowMap.enabled=true;sun.castShadow=true}
  applyWorldShaderBudget(perfTier>=2);
  exteriorDetailGroup.visible=perfTier<2;
  mapLineGroup.visible=perfTier<3;
  updatePerfVisualBudget();
  const perf=window.BP_HORIZON_PERF||{};perf.last_reason=reason;perf.last_tier_change_at=performance.now();window.BP_HORIZON_PERF=perf;
}
function updatePerformanceGovernor(rawDt,now){
  if(document.hidden||!Number.isFinite(rawDt)||rawDt<=0)return;
  const ms=Math.max(4,Math.min(250,rawDt*1000));perfEmaMs=THREE.MathUtils.lerp(perfEmaMs,ms,.065);perfWorstMs=Math.max(ms,perfWorstMs*.985);
  if(ms>42)longFrames++;else longFrames=Math.max(0,longFrames-.12);
  if(ms<18.2){if(!fastSince)fastSince=now}else fastSince=now;
  if(now-lastPerfAdjustAt>1800){
    lastPerfAdjustAt=now;
    if((perfEmaMs>27||longFrames>=4)&&perfTier<3){setPerfTier(perfTier+1,'frame_pressure');longFrames=0;fastSince=now}
    else if(perfEmaMs>21.5&&perfTier<3){setPerfTier(perfTier+1,'sustained_pressure');fastSince=now}
    else if(perfEmaMs<17.4&&now-fastSince>7000&&perfTier>0){setPerfTier(perfTier-1,'stable_recovery');fastSince=now}
  }
  window.BP_HORIZON_PERF={
    ...(window.BP_HORIZON_PERF||{}),build:4341,tier:perfTier,tier_name:PERF_TIER_NAMES[perfTier],
    ema_ms:Number(perfEmaMs.toFixed(2)),worst_ms:Number(perfWorstMs.toFixed(2)),fps:lastMeasuredFps,
    pixel_ratio:Number(renderScale.toFixed(2)),shadows:renderer.shadowMap.enabled,sim_radius_m:perfSimRadius(),
    draw_calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,lines:renderer.info.render.lines,points:renderer.info.render.points,
    programs:renderer.info.programs?.length||0,
    exterior_detail_visible:exteriorDetailGroup.visible,map_lines_visible:mapLineGroup.visible,ambient_detail_visible:ambientDetailGroup.visible,proxy_actors:allyProxy.count+enemyProxy.count+infectedProxy.count
  };
}
function updateWeatherFx(dt,now){
  const fx=rainFx;if(!fx||!fx.visible)return;
  fx.position.set(player.position.x,player.position.y,player.position.z);
  const p=fx.geometry.attributes.position;
  for(let i=0;i<p.count;i++){let z=p.getZ(i)-dt*24;if(z<.15)z=12+rand()*9;p.setZ(i,z)}
  p.needsUpdate=true;
  fx.material.opacity=.5+.12*Math.sin(now*.006);
}

function worldToLocal(wlat,wlon){return {x:(wlon-centerLon)*111320*Math.max(.12,Math.cos(centerLat*Math.PI/180)),y:(wlat-centerLat)*110540}}
function explorationCell(){
  const q=playerWorldCoordinate(),s=.0025;return 'E'+Math.floor(q.lat/s)+':'+Math.floor(q.lon/s);
}
function inWater(x,y){
  for(const poly of waterAreas)if(pointInPoly(x,y,poly))return true;return false;
}
function updateWaterSurvival(dt){
  if(interiorMode||activeVehicle||!inWater(player.position.x,player.position.y)){waterIdleSeconds=0;return}
  const moving=Math.abs(moveX)+Math.abs(moveY)>.18||sprint;
  if(moving){waterIdleSeconds=Math.max(0,waterIdleSeconds-dt*2);return}
  waterIdleSeconds+=dt;
  if(waterIdleSeconds>5&&performance.now()-lastWaterDamageAt>900){lastWaterDamageAt=performance.now();applyPlayerHit(25,{name:'DEEP WATER'});toast('KEEP MOVING · SINKING -25');rpc('bridgepoint_horizon_gameplay_event_v4340',{p_player_id:playerId,p_player_secret:playerSecret,p_mode:mode,p_match_id:matchId||null,p_event_type:'WATER_DAMAGE',p_event_key:null,p_value:25,p_payload:{idle_seconds:Math.round(waterIdleSeconds)}}).catch(()=>{})}
}
function rebuildZombieWall(zone){
  zombieWallGroup.clear();if(mode!=='YEAR_ONE'||!zone?.wall_nearby)return;
  const count=MOBILE?26:52,bodyGeom=new THREE.CapsuleGeometry(.25,.95,4,7),headGeom=new THREE.SphereGeometry(.25,8,6);
  const body=new THREE.InstancedMesh(bodyGeom,new THREE.MeshStandardMaterial({color:0x56664b,roughness:.9}),count);
  const heads=new THREE.InstancedMesh(headGeom,new THREE.MeshStandardMaterial({color:0x667558,roughness:.95}),count),d=new THREE.Object3D();
  let anchor={x:player.position.x,y:player.position.y},tx=1,ty=0;
  if(zone.phase==='BORDER'&&zone.closest_border){const border=worldToLocal(zone.closest_border.lat,zone.closest_border.lon),vx=player.position.x-border.x,vy=player.position.y-border.y,l=Math.hypot(vx,vy)||1,inset=Number(zone.border_inset_m||0);anchor={x:border.x+vx/l*inset,y:border.y+vy/l*inset};tx=-vy/l;ty=vx/l}
  else if(zone.nearest_city){const cc=worldToLocal(zone.nearest_city.lat,zone.nearest_city.lon),vx=player.position.x-cc.x,vy=player.position.y-cc.y,l=Math.hypot(vx,vy)||1;tx=-vy/l;ty=vx/l;anchor={x:player.position.x-vx/l*(Number(zone.wall_distance_m)||0)*(zone.safe?1:-1),y:player.position.y-vy/l*(Number(zone.wall_distance_m)||0)*(zone.safe?1:-1)}}
  const spacing=1.15;
  for(let i=0;i<count;i++){const off=(i-(count-1)/2)*spacing,jitter=((hash(matchSeed+':wall:'+i)%100)/100-.5)*.42,x=anchor.x+tx*off,y=anchor.y+ty*off,z=terrainZ(x,y);
    d.position.set(x,y,z+.76);d.rotation.set(0,0,Math.atan2(ty,tx)+Math.PI/2+jitter);d.scale.set(1,1,1);d.updateMatrix();body.setMatrixAt(i,d.matrix);
    d.position.set(x,y,z+1.54);d.updateMatrix();heads.setMatrixAt(i,d.matrix);
  }
  body.instanceMatrix.needsUpdate=heads.instanceMatrix.needsUpdate=true;zombieWallGroup.add(body,heads);
}
function spawnHordeZombie(reason='PRESSURE'){
  if(mode!=='YEAR_ONE'||!infectedHumanoidSource||dead)return false;
  const anchors=roadAnchors.filter(a=>Math.hypot(a.x-player.position.x,a.y-player.position.y)>=45&&Math.hypot(a.x-player.position.x,a.y-player.position.y)<=220);
  if(!anchors.length)return false;
  const a=anchors[hash(matchSeed+':horde:'+infected.length+':'+Math.floor(performance.now()/10000))%anchors.length],i=infected.length,late=Number(yearOneZone?.day||0)>260;
  const runner=late&&hash('runner:'+i+':'+reason)%5===0,label=runner?'RUNNER':'HORDE WALKER',speed=runner?7.05:1.22;
  const g=skeletonClone(infectedHumanoidSource.scene);prepHumanoid(g,{infectedTint:true,variant:i%2+1});orientHumanoid(g,1.72);
  const gx=a.x+((hash(i+':hx')%900)/100-4.5),gy=a.y+((hash(i+':hy')%900)/100-4.5);g.position.set(gx,gy,terrainZ(gx,gy));g.rotation.z=(hash(i+':hr')%628)/100;
  const bar=makeMonsterHealthBar(label,100,2.42);g.add(bar);world.add(g);
  const z={g,s:speed,phase:(hash(i+':hp')%628)/100,health:100,maxHealth:100,damage:25,detect:late?15:12,hearing:late?48:34,alive:true,index:i,name:label+' '+String(i+1).padStart(2,'0'),label,kind:runner?'runner':'zombie',space:'world',patrol:buildInfectedPatrol(gx,gy,i),patrolIndex:0,lockedOn:false,alertUntil:0,lastHitAt:0,nextVocal:performance.now()+2500+(hash(i+':vocal')%5000),nextScream:performance.now()+5000,hop:false,hopHeight:0,hopPeriod:900,hopPhase:0,healthBar:bar,pack:null};
  infected.push(z);updateMonsterHealthBar(z);$('infected').textContent=infected.filter(q=>q.alive&&q.space==='world').length;
  rpc('bridgepoint_horizon_gameplay_event_v4340',{p_player_id:playerId,p_player_secret:playerSecret,p_mode:mode,p_match_id:matchId||null,p_event_type:'HORDESPAWN',p_event_key:null,p_value:1,p_payload:{reason,monster:z.kind,day:yearOneZone?.day||0}}).catch(()=>{});
  return true;
}
function ensureHordePressure(zone){
  if(mode!=='YEAR_ONE'||!zone)return;
  const alive=infected.filter(z=>z.alive&&z.space==='world').length,deviceCap=MOBILE?(HIGH_DEVICE?28:20):44;
  const target=Math.min(deviceCap,18+Math.round(Number(zone.wall_density||.55)*12)+Math.min(12,Math.floor(worldActivePlayers/2)));
  const now=performance.now();if(alive<target&&now-lastHordeSpawnAt>6500){if(spawnHordeZombie('WORLD_PRESSURE'))lastHordeSpawnAt=now}
}
async function pollYearOneZone(force=false){
  if(mode!=='YEAR_ONE'||(!force&&performance.now()-lastZonePollAt<2500))return;lastZonePollAt=performance.now();
  const q=playerWorldCoordinate();
  try{
    const z=await rpc('bridgepoint_horizon_year_one_zone_v4340',{p_player_id:playerId,p_player_secret:playerSecret,p_lat:q.lat,p_lon:q.lon});yearOneZone=z;rebuildZombieWall(z);ensureHordePressure(z);
    const wl=$('wallLive');if(wl){wl.textContent='DAY '+z.day+' · '+z.phase.replaceAll('_',' ')+' · '+Math.round(Number(z.wall_distance_m||0))+'M';wl.classList.toggle('safe',!!z.safe)}
    const warn=$('wallWarning');if(warn)warn.hidden=!!z.safe;
  }catch{}
}
function syncSharedPlayers(rows=[]){
  if(mode!=='YEAR_ONE')return;
  const keep=new Set();
  for(const q of rows){
    const id=String(q.player_id||'');if(!id)continue;keep.add(id);let rec=sharedPlayers.get(id);
    if(!rec){
      const g=new THREE.Group(),body=new THREE.Mesh(new THREE.CapsuleGeometry(.24,1.02,6,10),new THREE.MeshStandardMaterial({color:0x5b6ea9,roughness:.56,metalness:.08})),head=new THREE.Mesh(new THREE.SphereGeometry(.22,14,10),new THREE.MeshStandardMaterial({color:0xb98264,roughness:.68}));
      body.position.z=.76;head.position.z=1.55;g.add(body,head,makeNameSprite(String(q.handle||'SURVIVOR').slice(0,20),'#a892ff'));sharedPlayerGroup.add(g);rec={g};sharedPlayers.set(id,rec);
    }
    const p=worldToLocal(Number(q.lat),Number(q.lon));rec.g.position.set(p.x,p.y,terrainZ(p.x,p.y));rec.g.rotation.z=Number(q.heading_deg||0)*Math.PI/180;rec.g.visible=!!q.alive&&Math.hypot(p.x-player.position.x,p.y-player.position.y)<perfSimRadius()*3;
  }
  for(const [id,rec] of sharedPlayers)if(!keep.has(id)){sharedPlayerGroup.remove(rec.g);sharedPlayers.delete(id)}
}
async function heartbeatWorld(force=false){
  const now=performance.now();if(!force&&now-lastPresenceAt<10000)return;lastPresenceAt=now;const q=playerWorldCoordinate();
  try{
    const out=await rpc('bridgepoint_horizon_presence_v4340',{p_player_id:playerId,p_player_secret:playerSecret,p_mode:mode,p_match_id:matchId||null,p_lat:q.lat,p_lon:q.lon,p_altitude_m:player.position.z,p_heading_deg:(yaw*180/Math.PI+360)%360,p_alive:!dead,p_combat_score:(shooting?5:0)+infected.filter(z=>z.alive&&z.lockedOn).length});
    worldActivePlayers=Number(out?.active_players||0);if($('activePlayers'))$('activePlayers').textContent=worldActivePlayers+' ACTIVE';
    if(mode==='YEAR_ONE'){const near=await rpc('bridgepoint_horizon_nearby_players_v4340',{p_player_id:playerId,p_player_secret:playerSecret,p_radius_m:1800});nearbyPlayers=near?.players||[];syncSharedPlayers(nearbyPlayers)}
    await syncDeathDrops();
  }catch{}
  if(mode==='YEAR_ONE'&&now-lastExploreAt>8000){lastExploreAt=now;const cell=explorationCell();if(!exploredCells.has(cell)){exploredCells.add(cell);rpc('bridgepoint_horizon_explore_v4340',{p_player_id:playerId,p_player_secret:playerSecret,p_cell_key:cell,p_lat:q.lat,p_lon:q.lon}).catch(()=>{})}}
}
function updateZoneDamage(now){
  if(mode!=='YEAR_ONE'||!yearOneZone||yearOneZone.safe||dead)return;
  if(now-lastWallDamageAt>=Number(yearOneZone.wall_tick_ms||800)){lastWallDamageAt=now;applyPlayerHit(25,{name:'ZOMBIE WALL'});rpc('bridgepoint_horizon_gameplay_event_v4340',{p_player_id:playerId,p_player_secret:playerSecret,p_mode:mode,p_match_id:matchId||null,p_event_type:'WALL_DAMAGE',p_event_key:null,p_value:25,p_payload:{day:yearOneZone.day,phase:yearOneZone.phase}}).catch(()=>{})}
}

function rebuildTdmFireWall(){
  tdmFireGroup.clear();if(mode!=='TDM'||!tdmFireZone)return;const radius=Number(tdmFireZone.radius_m||0),count=MOBILE?48:88;
  const geom=new THREE.ConeGeometry(.45,2.5,7),mat=new THREE.MeshBasicMaterial({color:0xff6a21,transparent:true,opacity:.72}),mesh=new THREE.InstancedMesh(geom,mat,count),d=new THREE.Object3D();
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2,x=Math.cos(a)*radius,y=Math.sin(a)*radius,z=terrainZ(x,y);d.position.set(x,y,z+1.15);d.rotation.set(0,0,a);d.scale.set(.7,1+((i%5)*.06),.7);d.updateMatrix();mesh.setMatrixAt(i,d.matrix)}mesh.instanceMatrix.needsUpdate=true;tdmFireGroup.add(mesh);
}
async function pollTdmFireZone(force=false){
  if(mode!=='TDM'||!matchId||(!force&&performance.now()-lastTdmFirePollAt<2000))return;lastTdmFirePollAt=performance.now();
  try{tdmFireZone=await rpc('bridgepoint_horizon_tdm_fire_zone_v4341',{p_player_id:playerId,p_player_secret:playerSecret,p_match_id:matchId});rebuildTdmFireWall();if($('climate'))$('climate').textContent='FIRE '+tdmFireZone.phase+' · '+Math.ceil(Number(tdmFireZone.remaining_seconds||0)/60)+'M'}catch{}
}
function updateTdmFireDamage(now){
  if(mode!=='TDM'||!tdmFireZone||dead)return;const outside=Math.hypot(player.position.x,player.position.y)>Number(tdmFireZone.radius_m||Infinity);
  if(outside&&now-lastTdmFireDamageAt>=1000){lastTdmFireDamageAt=now;applyPlayerHit(25,{name:'WILDFIRE'});toast('WILDFIRE · -25')}
}
function reviveWeatherMonster(kind){
  const choices=infected.filter(z=>!z.alive&&z.space==='world'&&(kind==='zombie'?['zombie','runner','screamer'].includes(z.kind):z.kind===kind));
  for(const z of choices){
    const home=z.patrol?.[0]||{x:z.g.position.x,y:z.g.position.y};
    if(Math.hypot(home.x-player.position.x,home.y-player.position.y)<45)continue;
    z.g.position.set(home.x,home.y,terrainZ(home.x,home.y));z.health=z.maxHealth;z.alive=true;z.lockedOn=false;z.respawnAt=0;z.g.visible=true;updateMonsterHealthBar(z);
    rpc('bridgepoint_horizon_gameplay_event_v4340',{p_player_id:playerId,p_player_secret:playerSecret,p_mode:mode,p_match_id:matchId||null,p_event_type:'HORDESPAWN',p_event_key:null,p_value:1,p_payload:{reason:kind==='zombie_dog'?'WILDFIRE':'RAIN',monster:z.kind}}).catch(()=>{});
    return true;
  }
  return false;
}
function applyWeatherGameplay(dt){
  if(mode!=='YEAR_ONE')return;const e=liveWeather?.event,name=String(e?.name||''),type=String(e?.type||'').toUpperCase();
  const cold=/snow|freeze|winter|cold|blizzard/i.test(name)||/SNOW|WINTER/.test(type),wildfire=/fire|wildfire/i.test(name)||/FIRE/.test(type),rain=/rain|storm|hurricane|thunder/i.test(name)||/HURRICANE|LIGHTNING/.test(type);
  if($('climate'))$('climate').textContent=cold?'COLD':wildfire?'WILDFIRE':rain?'RAIN':'NORMAL';
  if(cold&&!ambientFx.some(q=>Math.hypot((q.fire?.position.x||0)-player.position.x,(q.fire?.position.y||0)-player.position.y)<8)){
    coldExposureSeconds+=dt;if(coldExposureSeconds>30&&performance.now()-lastExposureDamageAt>3000){lastExposureDamageAt=performance.now();applyPlayerHit(25,{name:'EXPOSURE'});toast('COLD EXPOSURE · FIND FIRE');rpc('bridgepoint_horizon_gameplay_event_v4340',{p_player_id:playerId,p_player_secret:playerSecret,p_mode:mode,p_match_id:matchId||null,p_event_type:'WEATHER_EFFECT',p_event_key:null,p_value:25,p_payload:{effect:'COLD_EXPOSURE'}}).catch(()=>{})}
  }else coldExposureSeconds=0;
  if(rain)for(const z of infected)if(z.alive&&['zombie','runner','screamer'].includes(z.kind))z.detect=Math.max(z.detect,16);
  if(wildfire)for(const z of infected)if(z.kind==='zombie_dog')z.detect=Math.max(z.detect,22);
  const now=performance.now();
  if(now-lastWeatherSpawnAt>45000&&(rain||wildfire)){
    const revived=wildfire?reviveWeatherMonster('zombie_dog'):reviveWeatherMonster('zombie');
    if(revived)lastWeatherSpawnAt=now;
  }
}
function requestMobileGameMode(){
  if(!MOBILE)return;
  try{screen.orientation?.lock?.('landscape').catch(()=>{})}catch{}
  try{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.({navigationUI:'hide'}).catch(()=>{})}catch{}
}
async function pollLiveWeather(){
  const el=$('weatherLive');
  try{
    const out=await rpc('bridgepoint_public_weather_bootstrap_v5004',{}),items=Array.isArray(out?.items)?out.items:[];
    const now=Date.now();
    const active=items.filter(x=>{
      if(!Number.isFinite(Number(x?.lat))||!Number.isFinite(Number(x?.lon)))return false;
      if(String(x?.urgency||'').toLowerCase()==='past')return false;
      if(x?.ends_at&&Date.parse(x.ends_at)<now)return false;
      return true;
    }).map(x=>({...x,_km:kmBetween(lat,lon,Number(x.lat),Number(x.lon))})).sort((a,b)=>a._km-b._km);
    const near=active[0]||null,local=near&&near._km<=80?near:null;
    liveWeather={feed:true,event:local,distance_km:local?Number(local._km.toFixed(1)):null,last_at:new Date().toISOString()};
    const name=String(local?.name||''),type=String(local?.type||'').toUpperCase();
    const threat=!!local&&(/TORNADO|HURRICANE|FLOOD|WIND|HAIL|LIGHTNING/.test(type)||/storm|warning|advisory|rain/i.test(name));
    const wet=!!local&&(/rain|thunderstorm|hurricane|tropical|storm/i.test(name)||/HURRICANE|LIGHTNING/.test(type));
    storm=threat;
    const fx=ensureRainFx();fx.visible=wet;
    if(el){
      el.textContent=local?`LIVE · ${name} · ${Math.round(local._km)} km`:'LIVE WEATHER · NO NEARBY ACTIVE ALERT';
      el.classList.toggle('alert',!!local);
      el.title=local?`${local.source||'Public source'} · ${local.severity||''} · ${local.certainty||''}`:'No current source-labelled event within 80 km';
    }
    if(window.BP_HORIZON_V2)window.BP_HORIZON_V2.weather={...liveWeather};
  }catch(e){
    liveWeather={feed:false,event:null,distance_km:null,last_at:new Date().toISOString()};
    if(el)el.textContent='LIVE WEATHER · RETRYING';
  }
}
function updateWorldLight(t){
  const now=new Date(),utcHours=now.getUTCHours()+now.getUTCMinutes()/60,solarHour=(utcHours+lon/15+24)%24;
  dayPhase=solarHour/24;const daylight=solarHour>=6.2&&solarHour<=19.4,sunAmt=daylight?Math.max(.12,Math.sin((solarHour-6.2)/(13.2)*Math.PI)):.05;
  sun.intensity=storm?.72:(daylight?1.1+sunAmt*1.45:.12);hemi.intensity=storm?.58:(daylight?.9+sunAmt*.65:.22);
  scene.background.set(storm?0x454c49:(daylight?0x738071:0x0c1520));scene.fog.color.copy(scene.background);scene.fog.density=storm?.00105:(daylight?.00072:.001);
  renderer.toneMappingExposure=storm?.64:(daylight?.72+sunAmt*.35:.42);$('time').textContent=daylight?'DAY':'NIGHT';flashlight.intensity=flash?5.5:0;
}
let dtGlobal=0;
function updateCamera(dt){
  if(dead)return;
  pollGamepad();
  if(tdmMovementLocked()){moveX=0;moveY=0;sprint=false;slideTime=0;activeVehicle=null;activeZipline=null}
  if(activeZipline)updateZipline(dt);
  else if(activeVehicle)updateVehicle(dt);
  else{
    let baseSpeed=prone?1.55:(crouched?2.45:(sprint?8.4:aiming?2.8:4.65));if(slideTime>0){baseSpeed=10.2;slideTime=Math.max(0,slideTime-dt)}const sp=baseSpeed*dt;
    const f=new THREE.Vector2(-Math.sin(yaw),Math.cos(yaw)),r=new THREE.Vector2(Math.cos(yaw),Math.sin(yaw));
    const slideY=slideTime>0?1:moveY,slideX=slideTime>0?0:moveX;const dx=(f.x*slideY+r.x*slideX)*sp,dy=(f.y*slideY+r.y*slideX)*sp,nx=player.position.x+dx,ny=player.position.y+dy;
    if(!blocked(nx,player.position.y,.34))player.position.x=nx;
    if(!blocked(player.position.x,ny,.34))player.position.y=ny;
    let ground;
    if(interiorMode)ground=interiorGroundZ(player.position.x,player.position.y,player.position.z);
    else if(rooftopState){
      const e=rooftopState.entry,onRoof=e&&player.position.x>e.cx-e.w*.5&&player.position.x<e.cx+e.w*.5&&player.position.y>e.cy-e.d*.5&&player.position.y<e.cy+e.d*.5;
      if(onRoof)ground=e.baseZ+e.h+.18;else{rooftopState=null;ground=terrainZ(player.position.x,player.position.y);if(!airborne){airborne=true;verticalVelocity=-.5}}
    }else ground=terrainZ(player.position.x,player.position.y);
    if(airborne){player.position.z+=verticalVelocity*dt;verticalVelocity-=9.8*dt;if(player.position.z<=ground){player.position.z=ground;airborne=false;verticalVelocity=0}}
    else player.position.z=ground;
    if((Math.abs(moveX)+Math.abs(moveY))>.18&&!airborne)footstepAudio();
    player.rotation.z=yaw;
  }

  const bodyHeight=prone?.58:(crouched?1.02:1.46),target=player.position.clone().add(new THREE.Vector3(0,0,bodyHeight));
  const look=target.clone().add(new THREE.Vector3(-Math.sin(yaw)*9,Math.cos(yaw)*9,pitch*8));
  player.children.forEach(ch=>{if(ch.userData?.playerBody)ch.visible=cameraMode!=='first'&&!activeVehicle});
  if(weaponRig)weaponRig.visible=cameraMode!=='first'&&!activeVehicle;
  if(fpWeaponRig)fpWeaponRig.visible=cameraMode==='first'&&!activeVehicle;

  if(activeVehicle){
    const v=activeVehicle,carTarget=v.root.position.clone().add(new THREE.Vector3(0,0,1.15)),back=new THREE.Vector3(Math.sin(yaw)*6,-Math.cos(yaw)*6,3.0),desired=carTarget.clone().add(back);
    camera.position.lerp(desired,Math.min(1,dt*7));camera.lookAt(carTarget.clone().add(new THREE.Vector3(-Math.sin(yaw)*8,Math.cos(yaw)*8,0)));
  }else if(cameraMode==='first'){
    const eye=target.clone().add(new THREE.Vector3(0,0,prone ? .03 : (crouched ? .08 : .12)));camera.position.lerp(eye,Math.min(1,dt*18));camera.lookAt(look);
    if(fpWeaponRig){fpWeaponRig.position.lerp(aiming?new THREE.Vector3(.04,-.18,-.55):new THREE.Vector3(.29,-.32,-.62),Math.min(1,dt*12));fpWeaponRig.rotation.y=THREE.MathUtils.lerp(fpWeaponRig.rotation.y,aiming?0:-.08,Math.min(1,dt*12))}
  }else{
    const arm=aiming?2.15:4.9,camZ=aiming?1.8:2.35+pitch*2.4,back=new THREE.Vector3(Math.sin(yaw)*arm,-Math.cos(yaw)*arm,camZ),desired=target.clone().add(back);
    let safe=desired.clone(),prev=target.clone();
    for(let i=1;i<=10;i++){const q=target.clone().lerp(desired,i/10);if(blocked(q.x,q.y,.18)&&!interiorMode){safe=prev;break}prev=q;safe=q}
    camera.position.lerp(safe,Math.min(1,dt*(aiming?13:8)));camera.lookAt(look);
    if(weaponRig){const tw=aiming?new THREE.Vector3(.18,.16,1.38):new THREE.Vector3(.38,.08,1.28);weaponRig.position.lerp(tw,Math.min(1,dt*10));weaponRig.rotation.z=THREE.MathUtils.lerp(weaponRig.rotation.z,aiming?-1.38:(activeWeapon().kind==='melee'?-.15:-Math.PI/2),Math.min(1,dt*10))}
  }
  const targetFov=aiming?50:(cameraMode==='first'?72:68);camera.fov=THREE.MathUtils.lerp(camera.fov,targetFov,Math.min(1,dt*12));camera.updateProjectionMatrix();
  $('reticle')?.classList.toggle('aiming',aiming);updateContext();
}
async function pollKillFeed(){
  if(!matchId||!playerId||!playerSecret)return;
  let seen=0;
  setInterval(async()=>{
    try{
      const out=await rpc('bridgepoint_horizon_kill_feed_v4310',{p_player_id:playerId,p_player_secret:playerSecret,p_match_id:matchId,p_limit:12});
      for(const e of [...(out?.feed||[])].reverse()){
        if(Number(e.id)<=seen)continue;seen=Math.max(seen,Number(e.id));
        if(e.type==='INFECTED_KILL'&&e.killer_player_id===playerId)continue;
        addKillFeed(e.killer_name||'WORLD',e.victim_name||e.type,e.weapon_key||'',!!e.headshot);
      }
    }catch{}
  },1500);
}
async function startSpectatorHeartbeat(){
  if(!matchId||!playerId||!playerSecret)return;
  const beat=()=>rpc('bridgepoint_horizon_spectator_heartbeat_v4310',{p_player_id:playerId,p_player_secret:playerSecret,p_match_id:matchId,p_alive:!dead}).catch(()=>{});
  beat();setInterval(beat,5000);
}
async function load(){
  if(!horizonAccessToken())throw new Error('HORIZON_FREE_ACCOUNT_REQUIRED · SIGN IN FROM THE HORIZON LOBBY');
  requestMobileGameMode();
  const west=lon-span/111.32/2,east=lon+span/111.32/2,south=lat-span/110.54/2,north=lat+span/110.54/2,u=new URL(ENDPOINT);
  for(const [k,v] of Object.entries({lat,lon,west,east,south,north,state:stateCode,span_km:span,cell_id:'HORIZON_MATCH_'+(matchId||matchSeed)}))u.searchParams.set(k,String(v));
  const r=await fetch(u,{cache:'no-store',headers:{apikey:PUBLISHABLE_KEY}});
  if(!r.ok)throw new Error('world stream '+r.status);
  data=await r.json();if(!data?.complete)throw new Error(data?.error||'incomplete world stream');
  centerLon=(data.bbox.west+data.bbox.east)/2;centerLat=(data.bbox.south+data.bbox.north)/2;
  $('modeName').textContent=mode.replaceAll('_',' ');
  $('zone').textContent=mode==='YEAR_ONE'?'YEAR ONE · CONTIGUOUS U.S.':((data?.resolved_jurisdiction?.state||stateCode)+' · '+(data?.resolved_jurisdiction?.name||data?.resolved_jurisdiction?.label||'WORLD CELL'));
  addSky();addGround();
  const roads=addRoads(),parcels=addParcels(),water=addWater(),buildings=addBuildings(),buildingParts=addBuildingParts();
  waterAreas.length=0;for(const row of data.water||[])for(const ring of rings(row.geometry)){const pts=ring.map(project);if(pts.length>=3)waterAreas.push(pts)}
  await hydrateWeaponCatalog();if(mode==='TDM')await hydrateTdmLoadout();
  addVegetation();addStreetLife();addAbandonment();await syncFiniteLoot('world');const ziplineCount=buildZiplines(),vehicleCount=spawnVehicles(),disasterFx=addAmbientDisasterFx();

  if(mode==='YEAR_ONE')await hydrateYearOneRuntime();
  await Promise.all([addSurvivor(),mode==='TDM'?spawnTdmBots():spawnInfected()]);
  const spawnType=mode==='YEAR_ONE'?applyPreciseSpawn():'MATCH';
  if(mode==='TDM')await beginTdmPrematch();
  updateVitals();updateAmmo();renderWeaponBar();renderEquipmentButtons();pollKillFeed();startSpectatorHeartbeat();pollLiveWeather();setInterval(pollLiveWeather,30000);renderMinimap();heartbeatWorld(true);setInterval(()=>heartbeatWorld(false),10000);if(mode==='TDM'){pollTdmFireZone(true);setInterval(()=>pollTdmFireZone(false),2000)}if(mode==='YEAR_ONE'){pollYearOneZone(true);setInterval(()=>pollYearOneZone(false),2500);rpc('bridgepoint_horizon_exploration_v4340',{p_player_id:playerId,p_player_secret:playerSecret}).then(x=>(x?.cells||[]).forEach(q=>exploredCells.add(q.cell_key))).catch(()=>{})}

  if(mode==='YEAR_ONE'){
    checkpointYearOne(true);
    if(!window.__BP_YEAR_ONE_CHECKPOINT__)window.__BP_YEAR_ONE_CHECKPOINT__=setInterval(()=>checkpointYearOne(false),5000);
  }

  loadText.textContent=mode==='YEAR_ONE'
    ?`${buildings.toLocaleString()} source-backed structures · precise ${spawnType.toLowerCase()} spawn · PVE only · 25 damage per monster hit · 3-second auto pickup`
    :`${buildings.toLocaleString()} source-backed structures · ${buildingParts.toLocaleString()} building parts · ${parcels.toLocaleString()} parcel outlines · ${roads.toLocaleString()} transport segments · ${ziplineCount} ziplines · ${vehicleCount} vehicles · restored traversal active`;

  window.BP_HORIZON_INPUT_V4341={
    get movement(){return {moveX,moveY,touchMoveX,touchMoveY,keyMoveX,keyMoveY,locked:tdmMovementLocked(),padActive:pid!==null}},
    joystick:true,pointerCapture:true,touchAction:'none'
  };
  window.BP_HORIZON_V2={
    ok:true,build:4341,mode,matchId,state:data?.resolved_jurisdiction?.state||stateCode,
    buildings,buildingParts,parcels,roads,water,ziplines:ziplineCount,vehicles:vehicleCount,disasterFx,
    terrainSource:terrainInfo?.source||'FLAT SAFETY FALLBACK',terrainFallback:!terrainInfo,
    infected:infected.length,combatBots:combatants.length,playerTeam,mobileSafe:true,actualCharacterModel:true,
    sourceBackedTwin:true,exactFootprintCollision:true,liveWeather:true,weather:{...liveWeather},solidCollision:true,
    dwellPickup:true,pickupDwellSeconds:3,killFeed:true,killcam:true,firstPerson:true,crouch:true,prone:true,slide:true,
    jumpVault:true,gamepad:true,weaponInventory:true,minimap:true,proceduralInteriors:true,interiorLoot:true,
    roofTraversal:true,drivableVehicles:true,vehicleFuelRepair:true,infectedPatrols:true,ambientDisasterFx:true,
    spatialAudio:true,adaptivePerformanceGovernor:true,instancedWorldProps:true,instancedRoadSurfaces:true,
    adaptiveShaderBudget:true,adaptiveExteriorDetailBudget:true,
    tdm:mode==='TDM'?{playerHealthMax:150,shieldMax:0,targetPlayers:100,teamSize:50,prematchSeconds:10,fireCircleSeconds:1800,fireDamagePerSecond:25,loadoutPresets:5,attachmentSlots:7,deathLootDwellSeconds:3}:null,
    yearOne:mode==='YEAR_ONE'?{
      pveOnly:true,playerHealthMax:100,shieldMax:100,combinedMax:200,shieldPickup:50,monsterHitDamage:25,
      spawnPolicy:'PERSISTENT_LAST_LOCATION_AFTER_FIRST_ENTRY',spawnType,persistentAggro:true,serverCheckpointed:true,conusOnly:true,zombieWall:true,fiveFinalCities:true,
      persistentExploration:true,sharedPresence:true,offlineDecay:true,finiteLoot:true,deathDrops:true,vehiclePartsRequired:true,
      monsterHealth:{spider:75,orc:150,zombie:100,zombie_dog:75,other:100}
    }:null
  };
}
function animate(){
  requestAnimationFrame(animate);
  const now=performance.now(),rawDt=Math.max(.001,(now-last)/1000),dt=Math.min(.05,rawDt);last=now;dtGlobal=dt;
  const cadence=perfCadence();aiAccumulator+=dt;fxAccumulator+=dt;lightAccumulator+=dt;
  if(!dead){
    updateCamera(dt);updateDwellPickup(now);updateWaterSurvival(dt);applyWeatherGameplay(dt);updateZoneDamage(now);updateTdmFireDamage(now);heartbeatWorld(false);pollYearOneZone(false);pollTdmFireZone(false);if(shooting)shootOnce();
    if(aiAccumulator>=cadence.ai){const step=Math.min(.08,aiAccumulator);if(mode==='TDM')updateCombatants(step,now);else updateInfected(step,now);if(perfTier>=3)updateActorProxies();aiAccumulator=0}
    if(now-(killSnapshots.at(-1)?.t||0)>80)snapshotKillcam(now);
  }else if(aiAccumulator>=cadence.ai){
    const step=Math.min(.08,aiAccumulator);if(mode==='TDM')updateCombatants(step,now);else updateInfected(step,now);if(perfTier>=3)updateActorProxies();aiAccumulator=0;
  }
  if(fxAccumulator>=cadence.fx){const step=Math.min(.1,fxAccumulator);updateWeatherFx(step,now);updateAmbientDisasterFx(now);fxAccumulator=0}
  if(lightAccumulator>=cadence.light){updateWorldLight(now);updateAudioListener();lightAccumulator=0}
  if((frames%cadence.minimap)===0)renderMinimap();
  renderer.render(scene,camera);updatePerformanceGovernor(rawDt,now);
  frames++;
  if(now-fpsT>1200){
    const fps=Math.round(frames*1000/(now-fpsT));lastMeasuredFps=fps;$('fps').textContent=fps+' FPS · '+PERF_TIER_NAMES[perfTier];
    frames=0;fpsT=now;
  }
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(renderScale);renderer.setSize(innerWidth,innerHeight,false)});let looking=false,lx=0,ly=0;renderer.domElement.addEventListener('pointerdown',e=>{if(e.clientX<innerWidth*.4)return;looking=true;lx=e.clientX;ly=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(!looking)return;const dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;yaw-=dx*.006;pitch=Math.max(-.42,Math.min(.32,pitch-dy*.0035))});renderer.domElement.addEventListener('pointerup',()=>looking=false);
const pad=$('movePad'),knob=$('moveKnob');let pid=null;function padMove(e){const q=pad.getBoundingClientRect(),dx=e.clientX-(q.left+q.width/2),dy=e.clientY-(q.top+q.height/2),m=q.width*.34,l=Math.hypot(dx,dy)||1,s=Math.min(1,m/l),x=dx*s,y=dy*s;knob.style.transform=`translate(${x}px,${y}px)`;touchMoveX=x/m;touchMoveY=-y/m;moveX=Math.max(-1,Math.min(1,touchMoveX+keyMoveX));moveY=Math.max(-1,Math.min(1,touchMoveY+keyMoveY))}pad.addEventListener('pointerdown',e=>{pid=e.pointerId;try{pad.setPointerCapture?.(pid)}catch{}padMove(e)});pad.addEventListener('pointermove',e=>{if(e.pointerId===pid)padMove(e)});const endPad=e=>{if(e&&pid!==null&&e.pointerId!==pid)return;pid=null;touchMoveX=touchMoveY=0;moveX=keyMoveX;moveY=keyMoveY;knob.style.transform='translate(0,0)'};pad.addEventListener('pointerup',endPad);pad.addEventListener('pointercancel',endPad);pad.addEventListener('lostpointercapture',endPad);$('runBtn').addEventListener('pointerdown',()=>{sprint=true;$('runBtn').classList.add('active')});
$('runBtn').addEventListener('pointerup',()=>{sprint=false;$('runBtn').classList.remove('active')});
$('runBtn').addEventListener('pointercancel',()=>{sprint=false;$('runBtn').classList.remove('active')});
$('aimBtn').addEventListener('click',()=>{aiming=!aiming;sprint=false;$('aimBtn').classList.toggle('active',aiming);toast(aiming?'Aim locked':'Hip fire')});
const shootOn=()=>{shooting=true;$('shootBtn').classList.add('active');shootOnce()},shootOff=()=>{shooting=false;$('shootBtn').classList.remove('active')};
$('shootBtn').addEventListener('pointerdown',shootOn);$('shootBtn').addEventListener('pointerup',shootOff);$('shootBtn').addEventListener('pointercancel',shootOff);$('shootBtn').addEventListener('lostpointercapture',shootOff);
$('buildBtn').addEventListener('click',buildCover);
$('tacticalBtn1')?.addEventListener('click',()=>useEquipment('tactical1'));
$('tacticalBtn2')?.addEventListener('click',()=>useEquipment('tactical2'));
$('lethalBtn')?.addEventListener('click',()=>useEquipment('lethal'));
$('contextBtn')?.addEventListener('click',contextUse);
$('utilityToggle')?.addEventListener('click',()=>{$('utilityRail')?.classList.toggle('open')});
$('viewBtn')?.addEventListener('click',()=>{cycleCameraMode();if(matchMedia?.('(pointer:coarse)')?.matches)$('utilityRail')?.classList.remove('open')});
$('crouchBtn')?.addEventListener('click',()=>{toggleCrouch();if(matchMedia?.('(pointer:coarse)')?.matches)$('utilityRail')?.classList.remove('open')});
$('jumpBtn')?.addEventListener('click',()=>{jumpOrVault();if(matchMedia?.('(pointer:coarse)')?.matches)$('utilityRail')?.classList.remove('open')});
$('weaponBtn')?.addEventListener('click',()=>{cycleWeapon();if(matchMedia?.('(pointer:coarse)')?.matches)$('utilityRail')?.classList.remove('open')});
$('dropBtn')?.addEventListener('click',()=>{dropActiveWeapon();if(matchMedia?.('(pointer:coarse)')?.matches)$('utilityRail')?.classList.remove('open')});
$('fireUtilityBtn')?.addEventListener('click',()=>{buildCampfire();if(matchMedia?.('(pointer:coarse)')?.matches)$('utilityRail')?.classList.remove('open')});
$('lightUtilityBtn')?.addEventListener('click',()=>{toggleFlashlight();if(matchMedia?.('(pointer:coarse)')?.matches)$('utilityRail')?.classList.remove('open')});
$('skipKillcam').addEventListener('click',finishDeathFlow);
const keys={};
addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(e.code==='KeyQ'){aiming=!aiming;$('aimBtn').classList.toggle('active',aiming)}
  if(e.code==='KeyR')reload();
  if(e.code==='KeyB')buildCover();
  if(e.code==='KeyH')buildCampfire();
  if(e.code==='KeyT')toggleFlashlight();
  if(e.code==='KeyV')cycleCameraMode();
  if(e.code==='KeyC')toggleCrouch();
  if(e.code==='KeyF'||e.code==='KeyE')contextUse();
  if(e.code==='KeyX')dropActiveWeapon();
  if(e.code==='KeyG')cycleWeapon();
  if(e.code==='KeyZ')useEquipment('tactical1');
  if(e.code==='KeyN')useEquipment('tactical2');
  if(e.code==='KeyM')useEquipment('lethal');
  if(/^Digit[1-5]$/.test(e.code)){const k=inventoryWeaponKeys[Number(e.code.slice(-1))-1];if(k)equipWeaponKey(k)}
  if(e.code==='Space'){if(dead)finishDeathFlow();else jumpOrVault();e.preventDefault()}
});
addEventListener('keyup',e=>keys[e.code]=false);
renderer.domElement.addEventListener('pointerdown',e=>{if(e.button===0&&e.pointerType==='mouse')shootOn()});
renderer.domElement.addEventListener('pointerup',e=>{if(e.button===0&&e.pointerType==='mouse')shootOff()});renderer.domElement.addEventListener('wheel',e=>{cycleWeapon();e.preventDefault()},{passive:false});
setInterval(()=>{
  keyMoveX=(keys.KeyD?1:0)-(keys.KeyA?1:0);keyMoveY=(keys.KeyW?1:0)-(keys.KeyS?1:0);
  moveX=Math.max(-1,Math.min(1,touchMoveX+keyMoveX));moveY=Math.max(-1,Math.min(1,touchMoveY+keyMoveY));
  sprint=!!(keys.ShiftLeft||keys.ShiftRight);
},16);
addEventListener('pagehide',()=>{if(mode==='YEAR_ONE')checkpointYearOne(true)});
load().then(animate).catch(fail);