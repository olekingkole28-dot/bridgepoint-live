import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const ENDPOINT='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-horizon-stream-v3020';
const WEAPON_ENDPOINT='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-horizon-weapons-v3040';
const BUILD_VERSION=3051;
const SAVE_KEY='bridgepoint-horizon-survivor-v3050';
const LEGACY_SAVE_KEY='bridgepoint-horizon-survivor-v3040';
const FREE_BASE='https://cdn.jsdelivr.net/gh/agentkaerf/FreeModels@main/Zombie%20Apocalypse%20Kit%20-%20March%202024';
const SUSHI_ENV='https://cdn.jsdelivr.net/gh/agentkaerf/FreeModels@main/Sushi%20Restaurant%20Kit%20-%20May%202023/Environment/glTF';
const SUSHI_DECOR='https://cdn.jsdelivr.net/gh/agentkaerf/FreeModels@main/Sushi%20Restaurant%20Kit%20-%20May%202023/Decoration/glTF';
const ASSETS={
  player:FREE_BASE+'/Characters/glTF/Characters_Matt.gltf',
  zombie:FREE_BASE+'/Characters/glTF/Zombie_Basic.gltf',
  zombieChubby:FREE_BASE+'/Characters/glTF/Zombie_Chubby.gltf',
  zombieRibcage:FREE_BASE+'/Characters/glTF/Zombie_Ribcage.gltf',
  barrel:FREE_BASE+'/Environment/glTF/Barrel.gltf',
  trash:FREE_BASE+'/Environment/glTF/TrashBag_1.gltf',
  pallet:FREE_BASE+'/Environment/glTF/Pallet_Broken.gltf',
  barrier:FREE_BASE+'/Environment/glTF/TrafficBarrier_1.gltf',
  cone:FREE_BASE+'/Environment/glTF/TrafficCone_1.gltf',
  streetlight:FREE_BASE+'/Environment/glTF/StreetLights.gltf',
  hydrant:FREE_BASE+'/Environment/glTF/FireHydrant.gltf',
  traffic1:FREE_BASE+'/Environment/glTF/TrafficLight_1.gltf',
  traffic2:FREE_BASE+'/Environment/glTF/TrafficLight_2.gltf',
  plasticBarrier:FREE_BASE+'/Environment/glTF/PlasticBarrier.gltf',
  cinder:FREE_BASE+'/Environment/glTF/CinderBlock.gltf',
  containerGreen:FREE_BASE+'/Environment/glTF/Container_Green.gltf',
  containerRed:FREE_BASE+'/Environment/glTF/Container_Red.gltf',
  pipes:FREE_BASE+'/Environment/glTF/Pipes.gltf',
  wheelStack:FREE_BASE+'/Environment/glTF/Wheels_Stack.gltf',
  townSign:FREE_BASE+'/Environment/glTF/TownSign.gltf',
  vehicle:FREE_BASE+'/Vehicles/glTF/Vehicle_Pickup.gltf',
  sportsCar:FREE_BASE+'/Vehicles/glTF/Vehicle_Sports.gltf',
  truck:FREE_BASE+'/Vehicles/glTF/Vehicle_Truck.gltf',
  axe:FREE_BASE+'/Weapons/glTF/Axe.gltf',
  bat:FREE_BASE+'/Weapons/glTF/WoodenBat_Barbed.gltf',
  knife:FREE_BASE+'/Weapons/glTF/Knife.gltf',
  pistol:FREE_BASE+'/Weapons/glTF/Pistol.gltf',
  rifle:FREE_BASE+'/Weapons/glTF/Rifle.gltf',
  shotgun:FREE_BASE+'/Weapons/glTF/Shotgun.gltf',
  chest:FREE_BASE+'/Environment/glTF/Chest.gltf',
  chestSpecial:FREE_BASE+'/Environment/glTF/Chest_Special.gltf'
};
const INTERIOR_ASSETS={
  chair:SUSHI_ENV+'/Environment_Chair1.gltf',
  couch:SUSHI_ENV+'/Environment_Sofa.gltf',
  plant:SUSHI_DECOR+'/Decoration_Plant1.gltf',
  fridge:SUSHI_ENV+'/Environment_Fridge.gltf',
  sink:SUSHI_ENV+'/Environment_Counter_Sink.gltf',
  lamp:SUSHI_DECOR+'/Decoration_Light.gltf',
  oven:SUSHI_ENV+'/Environment_Oven.gltf',
  shelf:SUSHI_ENV+'/Environment_Cabinet_Shelves.gltf',
  table:SUSHI_ENV+'/Environment_Table.gltf',
  cabinet:SUSHI_ENV+'/Environment_Cabinet_Doors.gltf',
  cuttingTable:SUSHI_ENV+'/Environment_CuttingTable.gltf',
  bench:SUSHI_ENV+'/Environment_Bench.gltf',
  painting:SUSHI_DECOR+'/Decoration_Painting.gltf',
  wallLight:SUSHI_DECOR+'/Decoration_WallLight.gltf'
};
const DEFAULT_WEAPON_CONFIGS=[
  {weapon_id:'axe',weapon_name:'Axe',weapon_type:'melee',equip_slot:'melee',stance_type:'one_handed_melee',fire_mode:'melee',damage:72,range_m:2.45,magazine_size:0,reserve_default:0,fire_interval_seconds:.48,reload_time_seconds:0,recoil_pitch_deg:0,recoil_yaw_deg:0,spread_deg:0,aim_fov:62,two_handed:false,hitscan:true,model_url:ASSETS.axe,license_code:'CC0'},
  {weapon_id:'knife',weapon_name:'Knife',weapon_type:'melee',equip_slot:'offhand',stance_type:'one_handed_melee',fire_mode:'melee',damage:50,range_m:2.05,magazine_size:0,reserve_default:0,fire_interval_seconds:.36,reload_time_seconds:0,recoil_pitch_deg:0,recoil_yaw_deg:0,spread_deg:0,aim_fov:62,two_handed:false,hitscan:true,model_url:ASSETS.knife,license_code:'CC0'},
  {weapon_id:'barbed_bat',weapon_name:'Barbed Bat',weapon_type:'melee',equip_slot:'melee',stance_type:'two_handed_melee',fire_mode:'melee',damage:58,range_m:2.65,magazine_size:0,reserve_default:0,fire_interval_seconds:.56,reload_time_seconds:0,recoil_pitch_deg:0,recoil_yaw_deg:0,spread_deg:0,aim_fov:62,two_handed:true,hitscan:true,model_url:ASSETS.bat,license_code:'CC0'},
  {weapon_id:'pistol',weapon_name:'Pistol',weapon_type:'sidearm',equip_slot:'sidearm',stance_type:'one_handed_pistol',fire_mode:'semi',damage:52,range_m:60,magazine_size:12,reserve_default:48,fire_interval_seconds:.30,reload_time_seconds:1.35,recoil_pitch_deg:2.1,recoil_yaw_deg:.75,spread_deg:.65,aim_fov:52,two_handed:false,hitscan:true,model_url:ASSETS.pistol,license_code:'CC0'},
  {weapon_id:'rifle',weapon_name:'Rifle',weapon_type:'primary',equip_slot:'primary',stance_type:'two_handed_rifle',fire_mode:'auto',damage:76,range_m:95,magazine_size:20,reserve_default:100,fire_interval_seconds:.16,reload_time_seconds:2.10,recoil_pitch_deg:1.35,recoil_yaw_deg:.55,spread_deg:.45,aim_fov:48,two_handed:true,hitscan:true,model_url:ASSETS.rifle,license_code:'CC0'},
  {weapon_id:'shotgun',weapon_name:'Shotgun',weapon_type:'primary',equip_slot:'primary',stance_type:'two_handed_rifle',fire_mode:'pump',damage:92,range_m:28,magazine_size:6,reserve_default:30,fire_interval_seconds:.72,reload_time_seconds:2.75,recoil_pitch_deg:3,recoil_yaw_deg:1.1,spread_deg:2.4,aim_fov:50,two_handed:true,hitscan:true,model_url:ASSETS.shotgun,license_code:'CC0'}
];

const params=new URLSearchParams(location.search);
const requestedCell=String(params.get('cell')||'national').toLowerCase();
const CELL=requestedCell==='middletown'?'middletown':requestedCell==='manhattan'?'manhattan':'national';
const $=id=>document.getElementById(id);
const root=$('world');
const loadText=$('loadText');

const JURISDICTIONS={
  AL:['Alabama',32.377716,-86.300568],AK:['Alaska',58.301598,-134.420212],AZ:['Arizona',33.448143,-112.096962],
  AR:['Arkansas',34.746613,-92.288986],CA:['California',38.576668,-121.493629],CO:['Colorado',39.739227,-104.984856],
  CT:['Connecticut',41.764046,-72.682198],DE:['Delaware',39.157307,-75.519722],FL:['Florida',30.438118,-84.281296],
  GA:['Georgia',33.749027,-84.388229],HI:['Hawaii',21.307442,-157.857376],ID:['Idaho',43.617775,-116.199722],
  IL:['Illinois',39.798363,-89.654961],IN:['Indiana',39.768623,-86.162643],IA:['Iowa',41.591087,-93.603729],
  KS:['Kansas',39.048191,-95.677956],KY:['Kentucky',38.186722,-84.875374],LA:['Louisiana',30.457069,-91.187393],
  ME:['Maine',44.307167,-69.781693],MD:['Maryland',38.978764,-76.490936],MA:['Massachusetts',42.358162,-71.063698],
  MI:['Michigan',42.733635,-84.555328],MN:['Minnesota',44.955097,-93.102211],MS:['Mississippi',32.303848,-90.182106],
  MO:['Missouri',38.579201,-92.172935],MT:['Montana',46.585709,-112.018417],NE:['Nebraska',40.808075,-96.699654],
  NV:['Nevada',39.163914,-119.766121],NH:['New Hampshire',43.206898,-71.537994],NJ:['New Jersey',40.220596,-74.769913],
  NM:['New Mexico',35.682240,-105.939728],NY:['New York',40.7128,-74.0060],NC:['North Carolina',35.780430,-78.639099],
  ND:['North Dakota',46.820850,-100.783318],OH:['Ohio',39.961346,-82.999069],OK:['Oklahoma',35.492207,-97.503342],
  OR:['Oregon',44.938461,-123.030403],PA:['Pennsylvania',40.264378,-76.883598],RI:['Rhode Island',41.830914,-71.414963],
  SC:['South Carolina',34.000343,-81.033211],SD:['South Dakota',44.367031,-100.346405],TN:['Tennessee',36.165810,-86.784241],
  TX:['Texas',30.274670,-97.740349],UT:['Utah',40.777477,-111.888237],VT:['Vermont',44.262436,-72.580536],
  VA:['Virginia',37.538857,-77.433640],WA:['Washington',47.035805,-122.905014],WV:['West Virginia',38.336246,-81.612328],
  WI:['Wisconsin',43.074684,-89.384445],WY:['Wyoming',41.140259,-104.820236],DC:['District of Columbia',38.9072,-77.0369],
  PR:['Puerto Rico',18.4655,-66.1057],GU:['Guam',13.4443,144.7937],VI:['U.S. Virgin Islands',18.3419,-64.9307],
  AS:['American Samoa',-14.2710,-170.1322],MP:['Northern Mariana Islands',15.1778,145.7509],UM:['U.S. Minor Outlying Islands',19.2823,166.6470]
};
const stateParam=String(params.get('state')||'NY').toUpperCase();
const SELECTED_STATE=JURISDICTIONS[stateParam]?stateParam:'NY';
const selectedJurisdiction=JURISDICTIONS[SELECTED_STATE];
const latParam=params.get('lat'),lonParam=params.get('lon');
const STREAM_LAT=latParam!==null&&latParam!==''&&Number.isFinite(Number(latParam))?Number(latParam):selectedJurisdiction[1];
const STREAM_LON=lonParam!==null&&lonParam!==''&&Number.isFinite(Number(lonParam))?Number(lonParam):selectedJurisdiction[2];
const STREAM_SPAN=Math.max(1,Math.min(5.5,Number(params.get('span_km')||3.4)));
const densePreview=()=>CELL==='manhattan'||CELL==='national';

document.body.classList.toggle('nationalMode',CELL==='national');
$('cellNational')?.classList.toggle('active',CELL==='national');
$('cellMiddletown')?.classList.toggle('active',CELL==='middletown');
$('cellManhattan')?.classList.toggle('active',CELL==='manhattan');
const jurisdictionSelect=$('jurisdictionSelect');
if(jurisdictionSelect){
  jurisdictionSelect.innerHTML=Object.entries(JURISDICTIONS).map(([code,v])=>'<option value="'+code+'">'+v[0]+' ('+code+')</option>').join('');
  jurisdictionSelect.value=SELECTED_STATE;
}
$('jurisdictionGo')?.addEventListener('click',()=>{
  const code=jurisdictionSelect?.value||SELECTED_STATE,v=JURISDICTIONS[code]||selectedJurisdiction;
  const u=new URL(location.href);u.searchParams.set('cell','national');u.searchParams.set('state',code);
  u.searchParams.set('lat',String(v[1]));u.searchParams.set('lon',String(v[2]));u.searchParams.set('span_km','3.4');u.searchParams.set('build',String(BUILD_VERSION));
  location.href=u.toString();
});

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x68746e);
scene.fog=new THREE.FogExp2(0x69736d,densePreview()?.00019:.00027);

const camera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.08,12000);
camera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',stencil:false});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.03;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights=true;
root.appendChild(renderer.domElement);

let composer=null,gtaoPass=null,bloomPass=null,postFxMode='renderer';
function initPostProcessing(){
  try{
    composer=new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene,camera));
    gtaoPass=new GTAOPass(scene,camera,Math.max(1,root.clientWidth||innerWidth),Math.max(1,root.clientHeight||innerHeight));
    gtaoPass.output=GTAOPass.OUTPUT.Denoise;
    gtaoPass.blendIntensity=.72;
    composer.addPass(gtaoPass);
    bloomPass=new UnrealBloomPass(new THREE.Vector2(Math.max(1,root.clientWidth||innerWidth),Math.max(1,root.clientHeight||innerHeight)),.22,.45,.94);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    postFxMode='gtao+bloom+filmic';
    return true;
  }catch(e){
    console.warn('Post FX unavailable; renderer fallback',e);
    composer=null;gtaoPass=null;bloomPass=null;postFxMode='renderer';
    return false;
  }
}

function resizeRenderer(){
  const w=Math.max(1,root.clientWidth||innerWidth),h=Math.max(1,root.clientHeight||innerHeight);
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
  composer?.setSize(w,h);
}
addEventListener('resize',resizeRenderer,{passive:true});
addEventListener('orientationchange',()=>setTimeout(resizeRenderer,180),{passive:true});
resizeRenderer();

const loader=new GLTFLoader();
const clock=new THREE.Clock();
const exteriorRoot=new THREE.Group();
const worldGroup=new THREE.Group();
const artGroup=new THREE.Group();
const lootGroup=new THREE.Group();
const zombieGroup=new THREE.Group();
const entryGroup=new THREE.Group();
const interiorGroup=new THREE.Group();
exteriorRoot.add(worldGroup,artGroup,lootGroup,zombieGroup,entryGroup);
scene.add(exteriorRoot,interiorGroup);
interiorGroup.visible=false;

let data,lon0,lat0,mx,my,baseElevation=0;
let parcelLayer,partsLayer,buildingLayer,roadLayer,terrainLayer;
let hemi,sun,lightMode=0;
let playerRoot=null,playerVisualRoot=null,playerMixer=null,playerClips=[],playerAction=null;
let yaw=0,pitch=.14,cameraMode=0;
let health=100,lastDamageAt=0;
let playerSpawn=new THREE.Vector3();
const playerVelocity=new THREE.Vector3();
let roadAnchors=[],roadSegments=[],roadSurfaceGrid=new Map(),navNodes=[],navNodeMap=new Map(),buildingCenters=[],buildingEntries=[],zombies=[],interiorZombies=[];
let nearestInteract=null,lootCount=2;
let inventory={Bandage:1,Water:1};
let packName='Hidden Survivor Pack',packCapacity=24,packMesh=null;
let weaponPivot=null,weaponTemplates={},equippedWeaponName='Axe',swingTime=0,attackCooldown=0;
let equipment={melee:'Axe',offhand:'Knife',sidearm:null,primary:null,quick1:'Bandage',quick2:'Water'};
let equipmentMounts={rightHand:null,leftHand:null,hip:null,backGun:null,backMelee:null};
let activeSlot='melee',activeWeapon='Axe',aiming=false,fireCooldown=0,muzzleFlash=0;
const weaponRaycaster=new THREE.Raycaster();
let weaponRegistry=new Map(),weaponRegistryMode='fallback',weaponRegistryError=null;
let characterWeaponTemplates={},aimBones={};
let ammoState={Pistol:12,Rifle:20,Shotgun:6};
let reserveAmmo={Pistol:48,Rifle:100,Shotgun:30};
let reloadState={active:false,weapon:null,startedAt:0,endsAt:0};
let recoilPitch=0,recoilYaw=0,fireHeld=false;
let playerDead=false,kills=0;
let audioCtx=null,audioMaster=null,lastFootstepAt=0;
let worldPickups=[],pickupTemplates={},pickupSeq=0;
let waveNumber=0,nextWaveAt=0,maxActiveZombies=7;
let zombieTemplate=null,zombieTemplates=[];
let mobileMove={x:0,y:0},mobileSprint=false,mobileInputMode='pointer-fallback',nippleManager=null;
let interiorMode=false,activeInterior=null,exteriorReturn=new THREE.Vector3(),exteriorYaw=0;
let interiorWalls=[],interiorContainers=[],interiorBounds=null,interiorExit=null,interiorFloorLinks=[],interiorTemplates={},interiorLootedKeys=new Set();
let streetLifeStats={trees:0,bikes:0,vehicles:0,props:0,grass:0,benches:0,planters:0,backgroundTrees:0,shrubs:0,drivable:0};
let drivableVehicles=[],activeVehicle=null;

// Horizon 3050 systems inspired by the expanded survival design:
// source-aligned dressing, decay shaders, tactical movement, doors, repair,
// match rules, progression, local faction claims and spectator play.
let sceneFetchAttempts=0,sceneFetchError=null;
let decayPatchedMaterials=0,smartSnappedProps=0,openSpaceProps=0;
let flashlight=null,flashlightTarget=null,flashlightOn=false,autoDayNight=true,lastAtmosphereUpdate=0;
let slideTime=0,leanAmount=0,leanTarget=0,lastVaultAt=0;
let doorAnimations=[],doorSystemCount=0;
let xp=0,battleTier=0,livesRemaining=3,spectatorMode=false,spectatorIndex=0,lastSpectatorSwitch=0;
let claimedBaseId=null,factionId='SURVIVORS',factionColor='#47e285',factionBanner=null;
let matchMode=['survival','skirmish','year365'].includes(String(params.get('mode')||'survival').toLowerCase())?String(params.get('mode')||'survival').toLowerCase():'survival';
let matchRadius=Infinity,matchCenter=new THREE.Vector2(),matchRing=null;
const MATCH_SEASON_START=Date.UTC(2026,8,12);
const MODERATION_BLOCKLIST=['slur_placeholder_disabled'];
const cosmeticUnlocks=new Set();

let RAPIER=null,physicsWorld=null,physicsReady=false,physicsMode='manual-fallback',physicsError=null;
let playerPhysicsBody=null,playerPhysicsCollider=null,characterController=null;
let verticalVelocity=0,grounded=false,playerJumpQueued=false;
let playerStance='stand',gamepadMove={x:0,y:0},gamepadLook={x:0,y:0},gamepadPrev=[];
const PHYSICS_VISUAL_DROP=.07;
const STANCES={
  stand:{half:.58,radius:.33,speed:1,center:1.11},
  crouch:{half:.34,radius:.33,speed:.68,center:.87},
  prone:{half:.13,radius:.28,speed:.34,center:.61}
};
let PHYSICS_PLAYER_CENTER=STANCES.stand.center;
const physicsStaticColliders=[];
const boundaryPhysicsColliders=[];
const keys=new Set();

const minimap=$('minimap');
const mapCtx=minimap.getContext('2d');
const mapBase=document.createElement('canvas');
const mapFog=document.createElement('canvas');
mapBase.width=mapFog.width=minimap.width;
mapBase.height=mapFog.height=minimap.height;
const baseCtx=mapBase.getContext('2d');
const fogCtx=mapFog.getContext('2d');
let lastReveal=null,exploredPoints=[];
let travelPending=false,lastTravelCheck=0;
const activeBoundaryEdges=new Set();
const countryBarrierGroup=new THREE.Group();countryBarrierGroup.name='us-jurisdiction-barriers';exteriorRoot.add(countryBarrierGroup);

function normalizeWeaponConfig(row){
  const n=v=>Number.isFinite(Number(v))?Number(v):0;
  return{
    ...row,
    damage:n(row.damage),range_m:n(row.range_m),magazine_size:n(row.magazine_size),reserve_default:n(row.reserve_default),
    fire_interval_seconds:n(row.fire_interval_seconds),reload_time_seconds:n(row.reload_time_seconds),
    recoil_pitch_deg:n(row.recoil_pitch_deg),recoil_yaw_deg:n(row.recoil_yaw_deg),spread_deg:n(row.spread_deg),aim_fov:n(row.aim_fov)||56,
    two_handed:Boolean(row.two_handed),hitscan:row.hitscan!==false
  };
}
function installWeaponRegistry(rows,mode='fallback'){
  weaponRegistry=new Map();
  for(const raw of rows||[]){
    const row=normalizeWeaponConfig(raw),keys=[row.weapon_id,row.weapon_name,String(row.weapon_name||'').toLowerCase()];
    for(const k of keys)if(k)weaponRegistry.set(String(k),row);
  }
  weaponRegistryMode=mode;
}
function weaponCfg(name=activeWeapon){
  return weaponRegistry.get(name)||weaponRegistry.get(String(name||'').toLowerCase())||
    DEFAULT_WEAPON_CONFIGS.find(x=>x.weapon_name===name||x.weapon_id===name)||DEFAULT_WEAPON_CONFIGS[0];
}
async function loadWeaponRegistry(){
  installWeaponRegistry(DEFAULT_WEAPON_CONFIGS,'fallback');
  weaponRegistryError=null;
  try{
    const r=await fetch(WEAPON_ENDPOINT,{headers:{accept:'application/json'},cache:'no-store'});
    if(!r.ok)throw new Error('weapon registry HTTP '+r.status);
    const payload=await r.json();
    if(!payload?.ok||!Array.isArray(payload.weapons)||!payload.weapons.length)throw new Error(payload?.error||'empty weapon registry');
    installWeaponRegistry(payload.weapons,'supabase');
    for(const row of payload.weapons){
      const w=row.weapon_name;
      if(row.magazine_size>0&&reserveAmmo[w]==null)reserveAmmo[w]=Number(row.reserve_default||0);
      if(row.magazine_size>0&&ammoState[w]==null)ammoState[w]=Number(row.magazine_size||0);
    }
    return true;
  }catch(e){
    weaponRegistryError=String(e?.message||e);
    console.warn('Weapon registry fallback',e);
    return false;
  }
}
function persistSurvivor(){
  clearTimeout(persistSurvivor.t);
  persistSurvivor.t=setTimeout(()=>{
    try{
      localStorage.setItem(SAVE_KEY,JSON.stringify({
        inventory,equipment,ammoState,reserveAmmo,activeSlot,lootCount,packName,packCapacity,kills,
        xp,battleTier,livesRemaining,claimedBaseId,factionId,factionColor,matchMode,
        cosmeticUnlocks:[...cosmeticUnlocks]
      }));
    }catch(_){}
  },80);
}
function restoreSurvivor(){
  try{
    const raw=localStorage.getItem(SAVE_KEY)||localStorage.getItem(LEGACY_SAVE_KEY)||'null';
    const v=JSON.parse(raw);if(!v||typeof v!=='object')return;
    if(v.inventory&&typeof v.inventory==='object')inventory=v.inventory;
    if(v.equipment&&typeof v.equipment==='object')equipment={...equipment,...v.equipment};
    if(v.ammoState&&typeof v.ammoState==='object')ammoState={...ammoState,...v.ammoState};
    if(v.reserveAmmo&&typeof v.reserveAmmo==='object')reserveAmmo={...reserveAmmo,...v.reserveAmmo};
    if(typeof v.activeSlot==='string')activeSlot=v.activeSlot;
    if(Number.isFinite(+v.lootCount))lootCount=Math.max(0,+v.lootCount);
    if(typeof v.packName==='string')packName=v.packName;
    if(Number.isFinite(+v.packCapacity))packCapacity=Math.max(12,+v.packCapacity);
    if(Number.isFinite(+v.kills))kills=Math.max(0,+v.kills);
    if(Number.isFinite(+v.xp))xp=Math.max(0,+v.xp);
    if(Number.isFinite(+v.battleTier))battleTier=Math.max(0,+v.battleTier);
    if(Number.isFinite(+v.livesRemaining))livesRemaining=Math.max(0,+v.livesRemaining);
    if(typeof v.claimedBaseId==='string')claimedBaseId=v.claimedBaseId;
    if(typeof v.factionId==='string')factionId=v.factionId.slice(0,24);
    if(/^#[0-9a-f]{6}$/i.test(String(v.factionColor||'')))factionColor=v.factionColor;
    if(['survival','skirmish','year365'].includes(v.matchMode))matchMode=v.matchMode;
    if(Array.isArray(v.cosmeticUnlocks))for(const x of v.cosmeticUnlocks)cosmeticUnlocks.add(String(x));
  }catch(_){}
}
function streamXYBounds(){
  if(!data?.bbox)return null;
  const west=project([data.bbox.west,lat0]).x,east=project([data.bbox.east,lat0]).x;
  const south=project([lon0,data.bbox.south]).y,north=project([lon0,data.bbox.north]).y;
  return{west,east,south,north,width:east-west,height:north-south};
}
function boundaryBlocks(x,y){
  const b=streamXYBounds();if(!b)return false;const pad=4;
  if(activeBoundaryEdges.has('east')&&x>b.east-pad)return true;
  if(activeBoundaryEdges.has('west')&&x<b.west+pad)return true;
  if(activeBoundaryEdges.has('north')&&y>b.north-pad)return true;
  if(activeBoundaryEdges.has('south')&&y<b.south+pad)return true;
  return false;
}
function buildBoundaryVisual(edge){
  if(activeBoundaryEdges.has(edge))return;
  activeBoundaryEdges.add(edge);
  const b=streamXYBounds();if(!b)return;
  const horizontal=edge==='north'||edge==='south';
  const len=horizontal?b.width:b.height;
  const fixed=edge==='north'?b.north-3:edge==='south'?b.south+3:edge==='east'?b.east-3:b.west+3;
  const mat=new THREE.MeshStandardMaterial({color:0x7d1f1f,emissive:0x5e0808,emissiveIntensity:.9,roughness:.62});
  const postGeo=new THREE.BoxGeometry(horizontal?2.2:.36,horizontal?.36:2.2,2.25);
  const count=Math.max(24,Math.min(80,Math.floor(len/38)));
  for(let i=0;i<count;i++){
    const t=count<=1?.5:i/(count-1),x=horizontal?THREE.MathUtils.lerp(b.west,b.east,t):fixed,y=horizontal?fixed:THREE.MathUtils.lerp(b.south,b.north,t);
    const z=surfaceZXY(x,y);
    const post=new THREE.Mesh(postGeo,mat);post.position.set(x,y,z+1.12);countryBarrierGroup.add(post);
    if(zombieTemplate&&i%2===0){
      const n=normalizedModel(zombieTemplate.scene,1.76,true);n.root.position.set(x+(horizontal?0:(edge==='east'?-1:1)),y+(horizontal?(edge==='north'?-1:1):0),z+.02);
      n.root.rotation.z=horizontal?(edge==='north'?Math.PI:0):(edge==='east'?-Math.PI/2:Math.PI/2);
      countryBarrierGroup.add(n.root);
    }
  }
  showToast('U.S. JURISDICTION BOUNDARY · infected containment line');
}
async function resolveUniverse(lat,lon){
  const u=new URL(ENDPOINT);u.searchParams.set('mode','resolve');u.searchParams.set('lat',String(lat));u.searchParams.set('lon',String(lon));u.searchParams.set('_',String(Date.now()));
  const r=await fetch(u,{cache:'no-store'});if(!r.ok)return null;return await r.json();
}
function clampAtBoundary(edge){
  const b=streamXYBounds();if(!b||!playerRoot)return;
  if(edge==='east')playerRoot.position.x=Math.min(playerRoot.position.x,b.east-7);
  if(edge==='west')playerRoot.position.x=Math.max(playerRoot.position.x,b.west+7);
  if(edge==='north')playerRoot.position.y=Math.min(playerRoot.position.y,b.north-7);
  if(edge==='south')playerRoot.position.y=Math.max(playerRoot.position.y,b.south+7);
  syncPhysicsToPlayer();
}
async function checkNationalEdge(edge){
  if(travelPending||CELL!=='national')return;
  travelPending=true;
  try{
    const b=streamXYBounds();if(!b||!playerRoot)return;
    const dx=edge==='east'?b.width*.52:edge==='west'?-b.width*.52:0;
    const dy=edge==='north'?b.height*.52:edge==='south'?-b.height*.52:0;
    const [lon,lat]=unproject(playerRoot.position.x+dx,playerRoot.position.y+dy);
    const resolved=await resolveUniverse(lat,lon);
    if(resolved?.inside_us_universe&&resolved?.resolved_jurisdiction?.state){
      persistSurvivor();
      const u=new URL(location.href);
      u.searchParams.set('cell','national');u.searchParams.set('state',resolved.resolved_jurisdiction.state);
      u.searchParams.set('lat',String(lat));u.searchParams.set('lon',String(lon));u.searchParams.set('span_km',String(STREAM_SPAN));u.searchParams.set('build',String(BUILD_VERSION));
      showToast('Streaming '+resolved.resolved_jurisdiction.name+'…');
      setTimeout(()=>location.href=u.toString(),160);
      return;
    }
    if(resolved?.resolution_available===false||resolved?.inside_us_universe==null){
      console.warn('jurisdiction resolver unavailable; retaining current streamed cell');
      showToast('World edge lookup retrying — movement kept inside current cell');
      clampAtBoundary(edge);return;
    }
    buildBoundaryVisual(edge);clampAtBoundary(edge);
  }catch(e){console.warn('national edge resolve failed',e);clampAtBoundary(edge)}
  finally{travelPending=false}
}
function maybeNationalTravel(){
  if(CELL!=='national'||interiorMode||travelPending||!playerRoot)return;
  const now=performance.now();if(now-lastTravelCheck<650)return;lastTravelCheck=now;
  const b=streamXYBounds();if(!b)return;
  const margin=Math.max(34,Math.min(90,Math.min(b.width,b.height)*.08));
  const vx=playerVelocity.x,vy=playerVelocity.y;
  let edge=null;
  if(playerRoot.position.x>b.east-margin&&vx>.08)edge='east';
  else if(playerRoot.position.x<b.west+margin&&vx<-.08)edge='west';
  else if(playerRoot.position.y>b.north-margin&&vy>.08)edge='north';
  else if(playerRoot.position.y<b.south+margin&&vy<-.08)edge='south';
  if(!edge)return;
  if(activeBoundaryEdges.has(edge)){clampAtBoundary(edge);return}
  checkNationalEdge(edge);
}
const outerRings=g=>g?.type==='Polygon'?(g.coordinates?.[0]?[g.coordinates[0]]:[]):g?.type==='MultiPolygon'?(g.coordinates||[]).map(p=>p?.[0]).filter(Boolean):[];
const allLines=g=>g?.type==='LineString'?[g.coordinates||[]]:g?.type==='MultiLineString'?(g.coordinates||[]):g?.type==='Polygon'?(g.coordinates||[]):g?.type==='MultiPolygon'?(g.coordinates||[]).flat():[];
function project(p){return{x:(+p[0]-lon0)*mx,y:(+p[1]-lat0)*my}}
function unproject(x,y){return[lon0+x/mx,lat0+y/my]}
function centerRing(r){
  let x=0,y=0,n=0;
  for(const p of r||[])if(Number.isFinite(+p?.[0])&&Number.isFinite(+p?.[1])){x+=+p[0];y+=+p[1];n++}
  return n?[x/n,y/n]:[lon0,lat0];
}
function shapeFromRing(r){
  const s=new THREE.Shape();let first=true;
  for(const p of r||[]){const q=project(p);if(first){s.moveTo(q.x,q.y);first=false}else s.lineTo(q.x,q.y)}
  return first?null:s;
}
function ringArea(r){
  let a=0;
  for(let i=0,j=r.length-1;i<r.length;j=i++)a+=(+r[j][0])*(+r[i][1])-(+r[i][0])*(+r[j][1]);
  return Math.abs(a/2);
}
function heightFor(row){
  const h=Number(row.height_m);
  if(Number.isFinite(h)&&h>1)return{h:Math.min(h,500),proxy:false};
  const f=Number(row.floors);
  if(Number.isFinite(f)&&f>0)return{h:Math.min(f*3.15,420),proxy:true};
  return{h:densePreview()?13:7.5,proxy:true};
}
function terrainZ(lon,lat){
  const t=data?.terrain;
  if(!t?.heights_m?.length)return 0;
  const fx=(lon-data.bbox.west)/(data.bbox.east-data.bbox.west)*(t.width-1);
  const fy=(data.bbox.north-lat)/(data.bbox.north-data.bbox.south)*(t.height-1);
  const x0=Math.max(0,Math.min(t.width-1,Math.floor(fx))),x1=Math.max(0,Math.min(t.width-1,x0+1));
  const y0=Math.max(0,Math.min(t.height-1,Math.floor(fy))),y1=Math.max(0,Math.min(t.height-1,y0+1));
  const tx=Math.max(0,Math.min(1,fx-x0)),ty=Math.max(0,Math.min(1,fy-y0)),v=t.heights_m;
  const a=v[y0*t.width+x0],b=v[y0*t.width+x1],c=v[y1*t.width+x0],d=v[y1*t.width+x1];
  return ((a*(1-tx)+b*tx)*(1-ty)+(c*(1-tx)+d*tx)*ty)-baseElevation;
}
function terrainZXY(x,y){const p=unproject(x,y);return terrainZ(p[0],p[1])}

function worldCellLabel(){
  if(CELL==='manhattan')return'DOWNTOWN MANHATTAN · SURVIVAL CELL';
  if(CELL==='middletown')return'MIDDLETOWN · NEIGHBORHOOD CELL';
  return (JURISDICTIONS[SELECTED_STATE]?.[0]||SELECTED_STATE).toUpperCase()+' · NATIONAL STREAM CELL';
}
function worldCellTitle(){
  if(CELL==='manhattan')return'Downtown Manhattan survivor';
  if(CELL==='middletown')return'Neighborhood survivor';
  return (JURISDICTIONS[SELECTED_STATE]?.[0]||SELECTED_STATE)+' survivor';
}
function worldRequestUrl(){
  const u=new URL(ENDPOINT);
  if(CELL==='national'){
    u.searchParams.set('state',SELECTED_STATE);u.searchParams.set('lat',String(STREAM_LAT));u.searchParams.set('lon',String(STREAM_LON));u.searchParams.set('span_km',String(STREAM_SPAN));u.searchParams.set('cell_id','HORIZON_'+SELECTED_STATE+'_'+STREAM_LAT.toFixed(4)+'_'+STREAM_LON.toFixed(4));
  }else u.searchParams.set('cell',CELL);
  return u.toString();
}
async function fetchSceneWithRetry(url,attempts=4){
  let last=null;
  for(let i=1;i<=attempts;i++){
    sceneFetchAttempts=i;
    try{
      const r=await fetch(url,{headers:{accept:'application/json'},cache:'no-store'});
      let body=null;try{body=await r.json()}catch(_){}
      if(r.ok&&body?.complete){sceneFetchError=null;return body}
      const detail=body?.error?': '+String(body.error).slice(0,240):'';
      throw new Error('Horizon scene endpoint returned '+r.status+detail);
    }catch(e){
      last=e;sceneFetchError=String(e?.message||e);
      if(i<attempts){
        loadText.textContent='World stream retry '+(i+1)+' / '+attempts+'…';
        await new Promise(resolve=>setTimeout(resolve,350*i*i));
      }
    }
  }
  throw last||new Error('Horizon scene unavailable');
}

async function importWithTimeout(url,ms=18000){
  return await Promise.race([
    import(url),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('IMPORT_TIMEOUT '+url)),ms))
  ]);
}
async function initRapierPhysics(){
  physicsError=null;
  const urls=[
    'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.20.0/rapier.es.js',
    'https://unpkg.com/@dimforge/rapier3d-compat@0.20.0/rapier.es.js?module',
    'https://esm.sh/@dimforge/rapier3d-compat@0.20.0'
  ];
  let lastErr=null;
  for(const url of urls){
    try{
      const mod=await importWithTimeout(url);
      RAPIER=mod.default||mod;
      if(typeof RAPIER.init==='function')await RAPIER.init();
      physicsWorld=new RAPIER.World({x:0,y:0,z:-9.81});
      physicsWorld.timestep=1/60;
      characterController=physicsWorld.createCharacterController(.025);
      characterController.setUp({x:0,y:0,z:1});
      characterController.enableAutostep(.38,.18,true);
      characterController.enableSnapToGround(.42);
      characterController.setMaxSlopeClimbAngle(Math.PI*.28);
      characterController.setMinSlopeSlideAngle(Math.PI*.36);
      characterController.setSlideEnabled(true);
      physicsReady=true;physicsMode='rapier3d-kinematic';physicsError=null;
      return true;
    }catch(e){lastErr=e;console.warn('Rapier source failed',url,e)}
  }
  physicsError=String(lastErr?.message||lastErr||'Rapier unavailable');
  console.warn('Rapier init failed; retaining manual collision fallback',physicsError);
  physicsReady=false;physicsMode='manual-fallback';return false;
}
function geometryForPhysics(geometry){
  if(!geometry?.attributes?.position)return null;
  const g=geometry.index?geometry:geometry.toNonIndexed();
  const pos=g.attributes.position.array;
  const vertices=new Float32Array(pos.length);vertices.set(pos);
  let indices;
  if(g.index){
    const src=g.index.array;indices=new Uint32Array(src.length);for(let i=0;i<src.length;i++)indices[i]=src[i];
  }else{
    const n=vertices.length/3;indices=new Uint32Array(n);for(let i=0;i<n;i++)indices[i]=i;
  }
  return{vertices,indices};
}
function addStaticPhysicsGeometry(geometry,label='static',friction=.85){
  if(!physicsReady||!RAPIER||!physicsWorld||!geometry)return null;
  try{
    const p=geometryForPhysics(geometry);if(!p)return null;
    const flags=RAPIER.TriMeshFlags?.FIX_INTERNAL_EDGES;
    const desc=RAPIER.ColliderDesc.trimesh(p.vertices,p.indices,flags).setFriction(friction);
    const collider=physicsWorld.createCollider(desc);collider.userData={label};physicsStaticColliders.push(collider);return collider;
  }catch(e){console.warn('physics collider skipped',label,e);return null}
}
function createPlayerPhysics(){
  if(!physicsReady||!playerRoot)return false;
  if(playerPhysicsBody){
    try{physicsWorld.removeRigidBody(playerPhysicsBody)}catch(_){}
    playerPhysicsBody=null;playerPhysicsCollider=null;
  }
  const cfg=STANCES[playerStance]||STANCES.stand;
  PHYSICS_PLAYER_CENTER=cfg.center;
  const z=playerRoot.position.z+PHYSICS_PLAYER_CENTER;
  playerPhysicsBody=physicsWorld.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(playerRoot.position.x,playerRoot.position.y,z)
  );
  const q={x:Math.sin(Math.PI/4),y:0,z:0,w:Math.cos(Math.PI/4)};
  playerPhysicsCollider=physicsWorld.createCollider(
    RAPIER.ColliderDesc.capsule(cfg.half,cfg.radius).setRotation(q).setFriction(.42),
    playerPhysicsBody
  );
  verticalVelocity=-.12;grounded=true;return true;
}
function setPlayerStance(next){
  if(!STANCES[next]||next===playerStance||playerDead)return;
  playerStance=next;
  if(playerVisualRoot){
    const zScale=next==='stand'?1:next==='crouch'?.78:.48;
    playerVisualRoot.scale.z=zScale;
  }
  if(physicsReady&&!interiorMode)createPlayerPhysics();
  showToast(next==='stand'?'Standing':next==='crouch'?'Crouched':'Prone');
}
function cycleStance(){
  setPlayerStance(playerStance==='stand'?'crouch':playerStance==='crouch'?'prone':'stand');
}
function startSlide(){
  if(playerDead||interiorMode||playerStance!=='stand'||slideTime>0)return false;
  slideTime=.72;setPlayerStance('crouch');showToast('Tactical slide');return true;
}
function setLean(dir){leanTarget=THREE.MathUtils.clamp(dir,-1,1)}
function tryHurdle(){
  if(!playerRoot||playerDead||interiorMode||performance.now()-lastVaultAt<650)return false;
  const f=movementVector(0,1,yaw),near=.62,far=1.42;
  const blockedNear=isBlockedExterior(playerRoot.position.x+f.x*near,playerRoot.position.y+f.y*near,.28);
  const clearFar=!isBlockedExterior(playerRoot.position.x+f.x*far,playerRoot.position.y+f.y*far,.28);
  if(!blockedNear||!clearFar)return false;
  playerRoot.position.x+=f.x*far;playerRoot.position.y+=f.y*far;
  playerRoot.position.z=Math.max(playerRoot.position.z,surfaceZXY(playerRoot.position.x,playerRoot.position.y)+.32);
  verticalVelocity=2.8;grounded=false;lastVaultAt=performance.now();syncPhysicsToPlayer();showToast('Hurdle');return true;
}
function syncPhysicsToPlayer(){
  if(!physicsReady||!playerPhysicsBody||!playerRoot)return;
  playerPhysicsBody.setNextKinematicTranslation({
    x:playerRoot.position.x,y:playerRoot.position.y,z:playerRoot.position.z+PHYSICS_PLAYER_CENTER
  });
  playerPhysicsBody.setTranslation({
    x:playerRoot.position.x,y:playerRoot.position.y,z:playerRoot.position.z+PHYSICS_PLAYER_CENTER
  },true);
  physicsWorld.propagateModifiedBodyPositionsToColliders();
}
function movePlayerRapier(dx,dy,dt){
  if(!physicsReady||!playerPhysicsBody||!playerPhysicsCollider||!characterController)return false;
  if(playerJumpQueued&&grounded){verticalVelocity=5.1;grounded=false}
  playerJumpQueued=false;
  verticalVelocity=Math.max(-18,verticalVelocity-18.5*dt);
  const desired={x:dx,y:dy,z:verticalVelocity*dt};
  characterController.computeColliderMovement(playerPhysicsCollider,desired);
  const mv=characterController.computedMovement(),p=playerPhysicsBody.translation();
  playerPhysicsBody.setNextKinematicTranslation({x:p.x+mv.x,y:p.y+mv.y,z:p.z+mv.z});
  physicsWorld.step();
  const next=playerPhysicsBody.translation();
  grounded=Boolean(characterController.computedGrounded?.());
  if(grounded&&verticalVelocity<0)verticalVelocity=-.16;
  playerRoot.position.set(next.x,next.y,next.z-PHYSICS_PLAYER_CENTER);
  return true;
}
function rapierCameraPosition(target,desired){
  if(!physicsReady||!physicsWorld||interiorMode)return null;
  const d=desired.clone().sub(target),len=d.length();if(len<.01)return desired.clone();
  const dir=d.clone().multiplyScalar(1/len),ray=new RAPIER.Ray(
    {x:target.x,y:target.y,z:target.z},{x:dir.x,y:dir.y,z:dir.z}
  );
  const hit=physicsWorld.castRay(ray,len,true,undefined,undefined,playerPhysicsCollider||undefined);
  if(!hit)return desired.clone();
  const safe=Math.max(.18,hit.timeOfImpact-.24);
  return target.clone().addScaledVector(dir,safe);
}

function seeded(seed){let x=seed||1234567;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1000000)/1000000}}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
const rand=seeded(hash(CELL+'-horizon-2980'));

function canvasTexture(kind){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');const r=seeded(hash(kind));
  if(kind==='ground'){
    x.fillStyle='#5b664f';x.fillRect(0,0,256,256);
    for(let i=0;i<3400;i++){const g=Math.floor(55+r()*60),rr=Math.floor(55+r()*55),b=Math.floor(35+r()*35);x.fillStyle='rgba('+rr+','+g+','+b+','+(r()*.22+.03)+')';x.fillRect(r()*256,r()*256,1+r()*3,1+r()*3)}
  }else if(kind==='asphalt'){
    x.fillStyle='#2c302f';x.fillRect(0,0,256,256);
    for(let i=0;i<1400;i++){const v=Math.floor(35+r()*45);x.fillStyle='rgba('+v+','+v+','+v+','+(r()*.18)+')';x.fillRect(r()*256,r()*256,1,1)}
  }else{
    x.fillStyle=kind==='brick'?'#75645b':'#777d79';x.fillRect(0,0,256,256);
    for(let yy=6;yy<250;yy+=18){
      for(let xx=5;xx<250;xx+=18){
        if(r()>.22){x.fillStyle=kind==='glass'?'#273d42':(r()>.5?'#252c2d':'#403c32');x.fillRect(xx,yy,10,9)}
      }
    }
    x.fillStyle='rgba(255,255,255,.05)';
    for(let i=0;i<700;i++)x.fillRect(r()*256,r()*256,1,1);
  }
  const t=new THREE.CanvasTexture(c);
  t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(kind==='ground'?18:kind==='asphalt'?10:.055,kind==='ground'?18:kind==='asphalt'?10:.055);
  t.anisotropy=4;
  return t;
}
const groundTex=canvasTexture('ground'),asphaltTex=canvasTexture('asphalt'),wallTex=canvasTexture('wall'),brickTex=canvasTexture('brick'),glassTex=canvasTexture('glass');

function buildTerrain(){
  const t=data.terrain;
  if(!t?.heights_m?.length){
    const w=(data.bbox.east-data.bbox.west)*mx,h=(data.bbox.north-data.bbox.south)*my;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h,1,1),new THREE.MeshStandardMaterial({map:groundTex,color:0x7d846d,roughness:1}));
    mesh.receiveShadow=true;terrainLayer=mesh;worldGroup.add(mesh);addStaticPhysicsGeometry(mesh.geometry,'terrain-flat',.92);return;
  }
  const center=Math.floor(t.height/2)*t.width+Math.floor(t.width/2);
  baseElevation=Number(t.heights_m[center]||0);
  const pos=[],uv=[],idx=[];
  for(let y=0;y<t.height;y++)for(let x=0;x<t.width;x++){
    const lon=data.bbox.west+(data.bbox.east-data.bbox.west)*x/(t.width-1);
    const lat=data.bbox.north-(data.bbox.north-data.bbox.south)*y/(t.height-1),p=project([lon,lat]);
    pos.push(p.x,p.y,Number(t.heights_m[y*t.width+x])-baseElevation);uv.push(x/(t.width-1),1-y/(t.height-1));
  }
  for(let y=0;y<t.height-1;y++)for(let x=0;x<t.width-1;x++){const a=y*t.width+x,b=a+1,c=a+t.width,d=c+1;idx.push(a,c,b,b,c,d)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  terrainLayer=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:groundTex,color:0x8a8f78,roughness:1}));
  terrainLayer.receiveShadow=true;worldGroup.add(terrainLayer);addStaticPhysicsGeometry(g,'terrain-3dep',.94);
}

const buildingMaterials={
  brick:new THREE.MeshStandardMaterial({map:brickTex,color:0xb29b8e,roughness:.84,emissive:0x100b07,emissiveIntensity:.10}),
  concrete:new THREE.MeshStandardMaterial({map:wallTex,color:0xaeb1aa,roughness:.82,emissive:0x0d100c,emissiveIntensity:.08}),
  glass:new THREE.MeshStandardMaterial({map:glassTex,color:0x8fa7aa,roughness:.22,metalness:.20,emissive:0x172522,emissiveIntensity:.42}),
  wood:new THREE.MeshStandardMaterial({map:wallTex,color:0x8a755f,roughness:.90}),
  metal:new THREE.MeshStandardMaterial({map:wallTex,color:0x8e999a,roughness:.42,metalness:.34,emissive:0x111515,emissiveIntensity:.10})
};
function facadeKey(row,height=8){
  const f=String(row.facade_material||'').toLowerCase();
  if(f.includes('brick'))return'brick';
  if(/glass/.test(f))return'glass';
  if(/wood|timber/.test(f))return'wood';
  if(/metal|steel/.test(f))return'metal';
  const roll=hash(String(row.id||'')+':'+Math.round(height))%100;
  if(densePreview()&&height>85)return roll<72?'glass':'metal';
  if(densePreview()&&height>35)return roll<35?'glass':roll<64?'brick':'concrete';
  if(densePreview()&&roll<58)return'brick';
  return'concrete';
}
function buildBuildings(){
  buildingLayer=new THREE.Group();buildingLayer.name='source-buildings';worldGroup.add(buildingLayer);
  const buckets={brick:[],concrete:[],glass:[],wood:[],metal:[]};let proxies=0,sourceH=0;
  for(const row of data.buildings||[])for(const r of outerRings(row.geometry)){
    const shape=shapeFromRing(r);if(!shape)continue;
    const ht=heightFor(row);ht.proxy?proxies++:sourceH++;
    const geo=new THREE.ExtrudeGeometry(shape,{depth:ht.h,bevelEnabled:false,steps:1});
    const c=centerRing(r),q=project(c),z=terrainZ(c[0],c[1]);geo.translate(0,0,z+.16);geo.computeVertexNormals();
    buckets[facadeKey(row,ht.h)].push(geo);
    if(ringArea(r)>.0000000012){
      const pts=r.map(project).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
      const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
      const minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
      const width=maxx-minx,depth=maxy-miny;
      if(width>2.8&&depth>2.8)buildingCenters.push({id:String(row.id||hash(JSON.stringify(c))),x:q.x,y:q.y,z,height:ht.h,minx,maxx,miny,maxy,width,depth,poly:pts});
    }
  }
  for(const [k,geos] of Object.entries(buckets)){
    if(!geos.length)continue;
    const merged=mergeLocal(geos);if(!merged)continue;
    const mesh=new THREE.Mesh(merged,buildingMaterials[k]);mesh.castShadow=true;mesh.receiveShadow=true;buildingLayer.add(mesh);
    addStaticPhysicsGeometry(merged,'buildings-'+k,.82);
    for(const g of geos)g.dispose();
  }
  loadText.textContent='Geometry ready · '+sourceH.toLocaleString()+' source-height buildings · '+proxies.toLocaleString()+' visual-height proxies';
}
function buildFacadeDetails(){
  const candidates=[...buildingCenters].filter(b=>b.height>9&&b.width>3&&b.depth>3).sort((a,b)=>b.height-a.height).slice(0,densePreview()?650:220);
  const maxWindows=densePreview()?7600:2200;
  const winGeo=new THREE.BoxGeometry(1,.07,.72);
  const litMat=new THREE.MeshStandardMaterial({color:0xbfd6cf,emissive:0x6e8d77,emissiveIntensity:.55,roughness:.24,metalness:.12});
  const darkMat=new THREE.MeshStandardMaterial({color:0x314349,emissive:0x101c1f,emissiveIntensity:.18,roughness:.32,metalness:.18});
  const lit=new THREE.InstancedMesh(winGeo,litMat,maxWindows),dark=new THREE.InstancedMesh(winGeo,darkMat,maxWindows);
  const d=new THREE.Object3D();let li=0,di=0,total=0;
  const put=(b,x,y,z,side,litOn,scale)=>{
    if(total>=maxWindows)return false;
    d.position.set(x,y,z);d.rotation.set(0,0,side?Math.PI/2:0);d.scale.set(scale,1,1);d.updateMatrix();
    const target=litOn?lit:dark,idx=litOn?li++:di++;target.setMatrixAt(idx,d.matrix);total++;return true;
  };
  for(const b of candidates){
    const floors=Math.min(45,Math.max(2,Math.floor(b.height/3.05))),step=b.height>90?3:b.height>45?2:1;
    const colsX=Math.min(5,Math.max(1,Math.floor(b.width/3.2))),colsY=Math.min(5,Math.max(1,Math.floor(b.depth/3.2)));
    for(let f=1;f<floors&&total<maxWindows;f+=step){
      const z=b.z+Math.min(b.height-.8,f*3.05+1.05);
      for(let c=0;c<colsX&&total<maxWindows;c++){
        const x=THREE.MathUtils.lerp(b.minx+.9,b.maxx-.9,(c+.5)/colsX);
        const litOn=seeded(hash(b.id+':wx:'+f+':'+c))()>.54;
        put(b,x,b.miny-.045,z,0,litOn,.82);put(b,x,b.maxy+.045,z,0,!litOn,.82);
      }
      for(let c=0;c<colsY&&total<maxWindows;c++){
        const y=THREE.MathUtils.lerp(b.miny+.9,b.maxy-.9,(c+.5)/colsY);
        const litOn=seeded(hash(b.id+':wy:'+f+':'+c))()>.58;
        put(b,b.minx-.045,y,z,1,litOn,.82);put(b,b.maxx+.045,y,z,1,!litOn,.82);
      }
    }
  }
  lit.count=li;dark.count=di;lit.instanceMatrix.needsUpdate=true;dark.instanceMatrix.needsUpdate=true;
  lit.castShadow=false;dark.castShadow=false;worldGroup.add(lit,dark);

  const roofGeo=new THREE.BoxGeometry(1.25,1.05,.55),roofMat=new THREE.MeshStandardMaterial({color:0x686d69,roughness:.76,metalness:.34});
  const maxRoof=Math.min(700,candidates.length*2),roof=new THREE.InstancedMesh(roofGeo,roofMat,maxRoof);let ri=0;
  for(const b of candidates){
    const count=b.width*b.depth>180?2:1;
    for(let k=0;k<count&&ri<maxRoof;k++){
      const r=seeded(hash(b.id+':roof:'+k));
      d.position.set(b.x+(r()-.5)*b.width*.28,b.y+(r()-.5)*b.depth*.28,b.z+b.height+.28);
      d.rotation.set(0,0,r()*Math.PI);d.scale.set(.7+r()*.9,.7+r()*.9,.7+r()*.7);d.updateMatrix();roof.setMatrixAt(ri++,d.matrix);
    }
  }
  roof.count=ri;roof.instanceMatrix.needsUpdate=true;roof.castShadow=true;worldGroup.add(roof);
  streetLifeStats.windows=total;streetLifeStats.rooftops=ri;
}
function nearestRoadForBuilding(b){
  let best=null,d=Infinity;
  const step=Math.max(1,Math.floor(roadAnchors.length/900));
  for(let i=0;i<roadAnchors.length;i+=step){
    const a=roadAnchors[i];
    if(isBlockedExterior(a.x,a.y,.68))continue;
    const q=(a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y);
    if(q<d){d=q;best=a}
  }
  if(best)return best;
  for(const a of roadAnchors){
    if(isBlockedExterior(a.x,a.y,.42))continue;
    const q=(a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y);
    if(q<d){d=q;best=a}
  }
  return best;
}
function buildEntryPoints(){
  entryGroup.clear();buildingEntries=[];
  const candidates=[...buildingCenters]
    .sort((a,b)=>(a.x*a.x+a.y*a.y)-(b.x*b.x+b.y*b.y));
  const visualLimit=densePreview()?260:120;
  let visualCount=0;
  for(const b of candidates){
    const road=nearestRoadForBuilding(b);if(!road)continue;
    const dx=road.x-b.x,dy=road.y-b.y;let x=b.x,y=b.y,rot=0;
    if(Math.abs(dx)>Math.abs(dy)){
      x=dx>0?b.maxx+.58:b.minx-.58;
      y=THREE.MathUtils.clamp(road.y,b.miny+.7,b.maxy-.7);
      rot=Math.PI/2;
    }else{
      y=dy>0?b.maxy+.58:b.miny-.58;
      x=THREE.MathUtils.clamp(road.x,b.minx+.7,b.maxx-.7);
    }
    let root=null;
    if(visualCount<visualLimit){
      root=new THREE.Group();
      const frameMat=new THREE.MeshStandardMaterial({color:0x242922,roughness:.68,metalness:.22});
      const glowMat=new THREE.MeshStandardMaterial({color:0x506c57,emissive:0x2a7b49,emissiveIntensity:.68,roughness:.55});
      const left=new THREE.Mesh(new THREE.BoxGeometry(.15,.18,2.35),frameMat),right=left.clone();
      left.position.set(-.62,0,1.17);right.position.set(.62,0,1.17);
      const top=new THREE.Mesh(new THREE.BoxGeometry(1.38,.18,.15),frameMat);top.position.set(0,0,2.28);
      const lamp=new THREE.Mesh(new THREE.BoxGeometry(.18,.12,.18),glowMat);lamp.position.set(0,-.12,2.05);
      root.add(left,right,top,lamp);root.position.set(x,y,b.z);root.rotation.z=rot;entryGroup.add(root);visualCount++;
    }
    buildingEntries.push({
      ...b,entryX:x,entryY:y,entryZ:b.z,doorRoot:root,seed:hash(b.id+':interior'),
      returnX:road.x,returnY:road.y,returnZ:road.z
    });
  }
}
function installInteractiveDoors(){
  doorAnimations=[];doorSystemCount=0;const doorMat=new THREE.MeshStandardMaterial({color:0x4c4032,roughness:.88,metalness:.03});
  for(const e of buildingEntries){
    if(!e.doorRoot)continue;
    const pivot=new THREE.Group();pivot.position.set(-.54,-.02,0);
    const door=new THREE.Mesh(new THREE.BoxGeometry(1.08,.10,2.08),doorMat);door.position.set(.54,0,1.04);door.castShadow=true;
    const knob=new THREE.Mesh(new THREE.SphereGeometry(.055,7,5),new THREE.MeshStandardMaterial({color:0x9d8756,metalness:.5,roughness:.4}));knob.position.set(.92,-.075,1.05);door.add(knob);
    pivot.add(door);e.doorRoot.add(pivot);e.doorPivot=pivot;e.doorOpen=false;e.doorTarget=0;doorAnimations.push(e);doorSystemCount++;
  }
  return doorSystemCount;
}
function openDoor(entry,kicked=false){
  if(!entry?.doorPivot)return false;entry.doorOpen=true;entry.doorTarget=kicked?-1.48:-1.18;showToast(kicked?'Door kicked open':'Door opened');return true;
}
function kickNearestDoor(){
  if(!playerRoot||interiorMode)return false;let best=null,d=2.55;
  for(const e of buildingEntries){const q=Math.hypot(playerRoot.position.x-e.entryX,playerRoot.position.y-e.entryY);if(q<d){d=q;best=e}}
  if(!best)return false;return openDoor(best,true);
}
function updateDoors(dt){for(const e of doorAnimations)if(e.doorPivot)e.doorPivot.rotation.z=THREE.MathUtils.lerp(e.doorPivot.rotation.z,e.doorTarget||0,1-Math.exp(-10*dt))}
function claimNearestBase(){
  if(!playerRoot||interiorMode)return false;let best=null,d=4.5;
  for(const e of buildingEntries){const q=Math.hypot(playerRoot.position.x-e.entryX,playerRoot.position.y-e.entryY);if(q<d){d=q;best=e}}
  if(!best){showToast('Move closer to a building to claim it');return false}
  claimedBaseId=String(best.id||best.seed);persistSurvivor();renderFactionBanner();awardXP(100,'base claim');showToast(factionId+' claimed this base');return true;
}
function renderFactionBanner(){
  factionBanner?.parent?.remove(factionBanner);factionBanner=null;if(!claimedBaseId)return;
  const e=buildingEntries.find(x=>String(x.id||x.seed)===claimedBaseId);if(!e)return;
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const ctx=canvas.getContext('2d');
  ctx.fillStyle=factionColor;ctx.fillRect(0,0,256,128);ctx.fillStyle='#07110c';ctx.font='700 30px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(factionId,128,64);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.1,1.05),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
  mesh.position.set(e.entryX,e.entryY,e.entryZ+2.8);mesh.rotation.z=e.doorRoot?.rotation.z||0;entryGroup.add(mesh);factionBanner=mesh;
}
function mergeLocal(geos){
  if(!geos.length)return null;
  const first=geos[0],attrNames=Object.keys(first.attributes),indexArrays=[];
  let vertexOffset=0,totalVertices=0;
  const attrData={};
  for(const name of attrNames)attrData[name]=[];
  for(const g of geos){
    for(const name of attrNames){
      const a=g.getAttribute(name);if(!a)continue;
      for(let i=0;i<a.array.length;i++)attrData[name].push(a.array[i]);
    }
    const count=g.getAttribute('position').count;
    if(g.index){for(let i=0;i<g.index.array.length;i++)indexArrays.push(g.index.array[i]+vertexOffset)}
    else{for(let i=0;i<count;i++)indexArrays.push(i+vertexOffset)}
    vertexOffset+=count;totalVertices+=count;
  }
  const out=new THREE.BufferGeometry();
  for(const name of attrNames){
    const a=first.getAttribute(name);
    const arr=a.array instanceof Float64Array?new Float64Array(attrData[name]):new Float32Array(attrData[name]);
    out.setAttribute(name,new THREE.BufferAttribute(arr,a.itemSize,a.normalized));
  }
  out.setIndex(totalVertices>65535?new THREE.Uint32BufferAttribute(indexArrays,1):new THREE.Uint16BufferAttribute(indexArrays,1));
  out.computeBoundingSphere();return out;
}
function buildParts(){
  partsLayer=new THREE.Group();partsLayer.name='building-parts';worldGroup.add(partsLayer);const geos=[];
  for(const row of data.building_parts||[])for(const r of outerRings(row.geometry)){
    const shape=shapeFromRing(r);if(!shape)continue;
    const top=Math.max(Number(row.height_m)||4,2),min=Math.max(Number(row.min_height_m)||0,0);
    const geo=new THREE.ExtrudeGeometry(shape,{depth:Math.max(1,top-min),bevelEnabled:false,steps:1}),c=centerRing(r);
    geo.translate(0,0,terrainZ(c[0],c[1])+min+.22);geos.push(geo);
  }
  const g=mergeLocal(geos);
  if(g){const m=new THREE.MeshStandardMaterial({color:0x63716d,roughness:.62,metalness:.06});const mesh=new THREE.Mesh(g,m);mesh.castShadow=true;partsLayer.add(mesh)}
  for(const x of geos)x.dispose();
}
function buildParcels(){
  const pos=[];
  for(const row of data.parcels||[])for(const ring of allLines(row.geometry))for(let i=1;i<ring.length;i++){
    const a=ring[i-1],b=ring[i],pa=project(a),pb=project(b);
    pos.push(pa.x,pa.y,terrainZ(a[0],a[1])+.36,pb.x,pb.y,terrainZ(b[0],b[1])+.36);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  parcelLayer=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x71d99a,transparent:true,opacity:.30,depthWrite:false}));
  parcelLayer.visible=false;worldGroup.add(parcelLayer);
}
function lineFeatures(g){if(g?.type==='LineString')return[g.coordinates||[]];if(g?.type==='MultiLineString')return g.coordinates||[];if(g?.type==='Polygon')return g.coordinates||[];if(g?.type==='MultiPolygon')return(g.coordinates||[]).flat();return[]}
function roadWidth(kind){
  return kind==='ROAD_PRIMARY'?16:kind==='ROAD_SECONDARY'?11:kind==='ROAD_LOCAL'?7:kind==='RAIL'?3.5:6;
}
function buildStrips(features,extraWidth=0,zOffset=.18){
  const pos=[],idx=[];let vi=0;
  for(const f of features||[])for(const line of lineFeatures(f.geometry)){
    const width=roadWidth(f.kind)+extraWidth;
    for(let i=1;i<line.length;i++){
      const a=line[i-1],b=line[i],pa=project(a),pb=project(b),dx=pb.x-pa.x,dy=pb.y-pa.y,len=Math.hypot(dx,dy);
      if(len<.2)continue;
      const nx=-dy/len*width/2,ny=dx/len*width/2,za=terrainZ(a[0],a[1])+zOffset,zb=terrainZ(b[0],b[1])+zOffset;
      pos.push(pa.x+nx,pa.y+ny,za,pa.x-nx,pa.y-ny,za,pb.x+nx,pb.y+ny,zb,pb.x-nx,pb.y-ny,zb);
      idx.push(vi,vi+1,vi+2,vi+2,vi+1,vi+3);vi+=4;
    }
  }
  if(!pos.length)return null;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
function buildRoadCenterLines(roads){
  const pos=[];
  for(const f of roads){
    if(f.kind==='ROAD_LOCAL')continue;
    for(const line of lineFeatures(f.geometry))for(let i=1;i<line.length;i++){
      const a=line[i-1],b=line[i],pa=project(a),pb=project(b);
      const za=terrainZ(a[0],a[1])+.225,zb=terrainZ(b[0],b[1])+.225;
      pos.push(pa.x,pa.y,za,pb.x,pb.y,zb);
    }
  }
  if(!pos.length)return null;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  const m=new THREE.LineBasicMaterial({color:0xe9d58a,transparent:true,opacity:.72,depthWrite:false});
  return new THREE.LineSegments(g,m);
}
function roadGridKey(ix,iy){return ix+':'+iy}
function indexRoadSegment(seg){
  const cell=36,pad=seg.width/2+3;
  const minx=Math.floor((Math.min(seg.a.x,seg.b.x)-pad)/cell),maxx=Math.floor((Math.max(seg.a.x,seg.b.x)+pad)/cell);
  const miny=Math.floor((Math.min(seg.a.y,seg.b.y)-pad)/cell),maxy=Math.floor((Math.max(seg.a.y,seg.b.y)+pad)/cell);
  for(let ix=minx;ix<=maxx;ix++)for(let iy=miny;iy<=maxy;iy++){
    const k=roadGridKey(ix,iy);if(!roadSurfaceGrid.has(k))roadSurfaceGrid.set(k,[]);
    roadSurfaceGrid.get(k).push(seg);
  }
}
function nearbyRoadSegments(x,y){
  const cell=36,ix=Math.floor(x/cell),iy=Math.floor(y/cell),out=[];
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
    const a=roadSurfaceGrid.get(roadGridKey(ix+dx,iy+dy));if(a)out.push(...a);
  }
  return out;
}
function surfaceZXY(x,y){
  const base=terrainZXY(x,y);
  let best=Infinity,bestWidth=0;
  for(const seg of nearbyRoadSegments(x,y)){
    const d=pointSegDist(x,y,seg.a,seg.b);
    if(d<best){best=d;bestWidth=seg.width}
  }
  if(best<=bestWidth/2+.1)return base+.205;
  if(best<=bestWidth/2+2.7)return base+.155;
  return base+.025;
}
function navKey(x,y){return Math.round(x/8)+':'+Math.round(y/8)}
function navNode(x,y,z){
  const k=navKey(x,y);let n=navNodeMap.get(k);
  if(!n){n={id:navNodes.length,x,y,z,links:new Set()};navNodes.push(n);navNodeMap.set(k,n)}
  return n;
}
function linkNav(a,b){if(!a||!b||a===b)return;a.links.add(b.id);b.links.add(a.id)}
function buildNavGraph(roads){
  navNodes=[];navNodeMap=new Map();
  for(const f of roads||[])for(const line of lineFeatures(f.geometry)){
    let prev=null;
    for(let i=1;i<line.length;i++){
      const a=project(line[i-1]),b=project(line[i]),len=Math.hypot(b.x-a.x,b.y-a.y);if(len<1)continue;
      const steps=Math.max(1,Math.ceil(len/16));
      for(let k=0;k<=steps;k++){
        if(i>1&&k===0)continue;
        const t=k/steps,x=THREE.MathUtils.lerp(a.x,b.x,t),y=THREE.MathUtils.lerp(a.y,b.y,t),n=navNode(x,y,surfaceZXY(x,y));
        if(prev)linkNav(prev,n);prev=n;
      }
    }
  }
}
function nearestNavNode(x,y){
  let best=null,d=Infinity;
  for(const n of navNodes){const q=(n.x-x)*(n.x-x)+(n.y-y)*(n.y-y);if(q<d){d=q;best=n}}
  return best;
}
function findNavPath(sx,sy,tx,ty){
  const start=nearestNavNode(sx,sy),goal=nearestNavNode(tx,ty);if(!start||!goal)return[];
  if(start===goal)return[goal];
  const open=[start.id],came=new Map(),g=new Map([[start.id,0]]),f=new Map([[start.id,Math.hypot(goal.x-start.x,goal.y-start.y)]]);
  const seen=new Set();let loops=0;
  while(open.length&&loops++<2200){
    open.sort((a,b)=>(f.get(a)??Infinity)-(f.get(b)??Infinity));
    const id=open.shift();if(id===goal.id)break;if(seen.has(id))continue;seen.add(id);
    const n=navNodes[id];for(const nbId of n.links){
      const nb=navNodes[nbId],tent=(g.get(id)??Infinity)+Math.hypot(nb.x-n.x,nb.y-n.y);
      if(tent<(g.get(nbId)??Infinity)){came.set(nbId,id);g.set(nbId,tent);f.set(nbId,tent+Math.hypot(goal.x-nb.x,goal.y-nb.y));if(!seen.has(nbId))open.push(nbId)}
    }
  }
  if(!came.has(goal.id))return[goal];
  const ids=[goal.id];let cur=goal.id;while(cur!==start.id&&came.has(cur)){cur=came.get(cur);ids.push(cur)}ids.reverse();
  return ids.slice(1).map(id=>navNodes[id]);
}
function buildRoads(){
  const roads=(data.transport||[]).filter(x=>x.kind!=='RAIL'),rails=(data.transport||[]).filter(x=>x.kind==='RAIL');
  roadLayer=new THREE.Group();worldGroup.add(roadLayer);

  const sidewalkGeo=buildStrips(roads,5.2,.135);
  if(sidewalkGeo){
    const sidewalk=new THREE.Mesh(sidewalkGeo,new THREE.MeshStandardMaterial({color:0xb7b3aa,roughness:.96}));
    sidewalk.receiveShadow=true;roadLayer.add(sidewalk);addStaticPhysicsGeometry(sidewalkGeo,'sidewalks',.96);
  }
  const curbGeo=buildStrips(roads,2.3,.155);
  if(curbGeo){
    const curb=new THREE.Mesh(curbGeo,new THREE.MeshStandardMaterial({color:0x8c8b84,roughness:.92}));
    curb.receiveShadow=true;roadLayer.add(curb);
  }
  const rg=buildStrips(roads,0,.19);
  if(rg){
    const mesh=new THREE.Mesh(rg,new THREE.MeshStandardMaterial({map:asphaltTex,color:0x3c4140,roughness:.94,metalness:.02}));
    mesh.receiveShadow=true;roadLayer.add(mesh);addStaticPhysicsGeometry(rg,'roads',.88);
  }
  const centerLines=buildRoadCenterLines(roads);if(centerLines)roadLayer.add(centerLines);

  const rail=buildStrips(rails,0,.20);
  if(rail)roadLayer.add(new THREE.Mesh(rail,new THREE.MeshStandardMaterial({color:0x3e403e,roughness:.72,metalness:.32})));

  roadAnchors=[];roadSegments=[];roadSurfaceGrid=new Map();
  for(const f of roads)for(const line of lineFeatures(f.geometry))for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],pa=project(a),pb=project(b),dx=pb.x-pa.x,dy=pb.y-pa.y,len=Math.hypot(dx,dy);
    if(len<1)continue;
    const seg={a:{x:pa.x,y:pa.y},b:{x:pb.x,y:pb.y},width:roadWidth(f.kind),kind:f.kind};
    roadSegments.push(seg);indexRoadSegment(seg);
    const samples=Math.max(1,Math.min(5,Math.floor(len/24)+1));
    for(let k=0;k<samples;k++){
      const t=(k+.5)/samples,x=THREE.MathUtils.lerp(pa.x,pb.x,t),y=THREE.MathUtils.lerp(pa.y,pb.y,t);
      const lon=THREE.MathUtils.lerp(a[0],b[0],t),lat=THREE.MathUtils.lerp(a[1],b[1],t);
      roadAnchors.push({x,y,z:terrainZ(lon,lat),heading:Math.atan2(dx,dy),width:roadWidth(f.kind),kind:f.kind});
    }
  }
  buildNavGraph(roads);
}
function buildWater(){
  const geos=[];
  for(const f of data.water||[])for(const r of outerRings(f.geometry)){const s=shapeFromRing(r);if(!s)continue;const g=new THREE.ShapeGeometry(s),c=centerRing(r);g.translate(0,0,terrainZ(c[0],c[1])+.23);geos.push(g)}
  const g=mergeLocal(geos);
  if(g)worldGroup.add(new THREE.Mesh(g,new THREE.MeshPhysicalMaterial({color:0x315e66,roughness:.18,metalness:.03,transparent:true,opacity:.78})));
  for(const x of geos)x.dispose();
}
function addLights(){
  hemi=new THREE.HemisphereLight(0xdce9df,0x283125,1.15);scene.add(hemi);
  sun=new THREE.DirectionalLight(0xffefd0,2.65);sun.position.set(-900,-650,1500);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);
  sun.shadow.camera.left=-800;sun.shadow.camera.right=800;sun.shadow.camera.top=800;sun.shadow.camera.bottom=-800;sun.shadow.camera.far=3500;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xb7d1d7,.38);fill.position.set(500,900,700);scene.add(fill);
}
function setLighting(mode){
  lightMode=mode%3;const b=$('lightBtn'),modes=[['☀','Day'],['◐','Dusk'],['☾','Night']],v=modes[lightMode];b.innerHTML=v[0]+' <span>'+v[1]+'</span>';
  if(lightMode===0){scene.background.set(0x68746e);scene.fog.color.set(0x69736d);hemi.intensity=1.15;sun.intensity=2.65;sun.color.set(0xffefd0);renderer.toneMappingExposure=1.03}
  if(lightMode===1){scene.background.set(0x403d3a);scene.fog.color.set(0x494743);hemi.intensity=.63;sun.intensity=1.7;sun.color.set(0xf49a62);renderer.toneMappingExposure=.86}
  if(lightMode===2){scene.background.set(0x07100d);scene.fog.color.set(0x0b1511);hemi.intensity=.23;sun.intensity=.28;sun.color.set(0x91b8c4);renderer.toneMappingExposure=.64}
}

function normalizedModel(source,targetHeight,animated=false){
  const model=animated?cloneSkeleton(source):source.clone(true);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  const oriented=new THREE.Group();
  oriented.rotation.x=Math.PI/2;
  oriented.add(model);
  oriented.updateMatrixWorld(true);
  let box=new THREE.Box3().setFromObject(oriented),size=new THREE.Vector3();box.getSize(size);
  const scale=targetHeight/Math.max(.01,size.z);
  oriented.scale.setScalar(scale);
  oriented.updateMatrixWorld(true);
  box=new THREE.Box3().setFromObject(oriented);
  const center=new THREE.Vector3();box.getCenter(center);
  oriented.position.x-=center.x;
  oriented.position.y-=center.y;
  oriented.position.z-=box.min.z;
  oriented.updateMatrixWorld(true);
  const root=new THREE.Group();root.add(oriented);
  return{root,model,oriented};
}
async function loadAsset(url){
  try{return await loader.loadAsync(url)}catch(e){console.warn('Asset load failed',url,e);return null}
}
function pointInPoly(x,y,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;
    const hit=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-9)+xi);
    if(hit)inside=!inside;
  }
  return inside;
}
function pointSegDist(x,y,a,b){
  const vx=b.x-a.x,vy=b.y-a.y,wx=x-a.x,wy=y-a.y,l2=vx*vx+vy*vy;
  const t=l2>1e-9?THREE.MathUtils.clamp((wx*vx+wy*vy)/l2,0,1):0;
  return Math.hypot(x-(a.x+vx*t),y-(a.y+vy*t));
}
function polyBlocksPoint(x,y,poly,radius=.33){
  if(!poly?.length)return false;
  if(pointInPoly(x,y,poly))return true;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++)if(pointSegDist(x,y,poly[j],poly[i])<radius)return true;
  return false;
}
function nearestRoadToCenter(){
  if(!roadAnchors.length)return{x:0,y:0,z:terrainZ(lon0,lat0)};
  const ordered=[...roadAnchors].sort((a,b)=>(a.x*a.x+a.y*a.y)-(b.x*b.x+b.y*b.y));
  for(const a of ordered){
    if(!isBlockedExterior(a.x,a.y,.82))return a;
  }
  return ordered[0];
}
function fallbackPlayer(){
  const root=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0x39473d,roughness:.82});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.32,.8,4,8),mat);body.position.z=1.05;body.rotation.x=Math.PI/2;
  const head=new THREE.Mesh(new THREE.SphereGeometry(.24,12,10),new THREE.MeshStandardMaterial({color:0x9b806c,roughness:.85}));head.position.z=1.78;
  root.add(body,head);return root;
}
function attachDuffel(){
  return; // inventory is intentionally hidden on the character

  if(!playerRoot)return;
  const bag=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(.62,.28,.72),new THREE.MeshStandardMaterial({color:0x4b3a27,roughness:.94}));
  body.position.z=1.05;
  const flap=new THREE.Mesh(new THREE.BoxGeometry(.64,.30,.18),new THREE.MeshStandardMaterial({color:0x34291e,roughness:.92}));flap.position.set(0,-.03,1.37);
  const strapMat=new THREE.MeshStandardMaterial({color:0x25231e,roughness:.9});
  const strap1=new THREE.Mesh(new THREE.BoxGeometry(.07,.05,.85),strapMat);strap1.position.set(-.2,-.18,1.08);strap1.rotation.x=.18;
  const strap2=strap1.clone();strap2.position.x=.2;
  bag.add(body,flap,strap1,strap2);bag.position.set(0,.27,.12);playerRoot.add(bag);packMesh=bag;
}
function updatePackVisual(){/* pack capacity is UI-only; no backpack mesh on survivor */}
function mountWeaponModel(template,name){
  if(!playerRoot)return;
  equipment.melee=name||'Axe';
  if(activeSlot==='melee'){activeWeapon=equipment.melee;equippedWeaponName=equipment.melee}
  refreshEquipmentVisuals();updateInventory();
}
function equipWeapon(name){mountWeaponModel(null,name)}
function findBoneByHints(root,hints){
  let found=null;
  root?.traverse(o=>{
    if(found)return;
    const n=String(o.name||'').toLowerCase();
    if(hints.some(h=>n===h||n.includes(h)))found=o;
  });
  return found;
}
function makeMount(parent,pos=[0,0,0],rot=[0,0,0]){
  const g=new THREE.Group();
  g.position.set(...pos);g.rotation.set(...rot);
  (parent||playerRoot).add(g);return g;
}
function clearMount(m){if(!m)return;while(m.children.length)m.remove(m.children[0])}
function captureCharacterWeaponTemplates(modelRoot){
  characterWeaponTemplates={};
  for(const name of ['Axe','Knife','Pistol','Rifle','Shotgun','SMG','Spear','WoodenBat_Barbed','WoodenBat_Saw']){
    const obj=modelRoot?.getObjectByName(name);
    if(!obj)continue;
    characterWeaponTemplates[name]=obj.clone(true);
    obj.visible=false;
  }
}
function setupEquipmentMounts(modelRoot){
  const right=modelRoot?.getObjectByName('Middle1.R')||modelRoot?.getObjectByName('LowerArm.R')||findBoneByHints(modelRoot,['middle1.r','lowerarm.r']);
  const left=modelRoot?.getObjectByName('Middle1.L')||modelRoot?.getObjectByName('LowerArm.L')||findBoneByHints(modelRoot,['middle1.l','lowerarm.l']);
  const hips=modelRoot?.getObjectByName('Hips')||findBoneByHints(modelRoot,['hips','pelvis']);
  const torso=modelRoot?.getObjectByName('Torso')||modelRoot?.getObjectByName('Abdomen')||findBoneByHints(modelRoot,['torso','abdomen','spine']);
  const upperR=modelRoot?.getObjectByName('UpperArm.R')||findBoneByHints(modelRoot,['upperarm.r']);
  const upperL=modelRoot?.getObjectByName('UpperArm.L')||findBoneByHints(modelRoot,['upperarm.l']);
  const lowerR=modelRoot?.getObjectByName('LowerArm.R')||findBoneByHints(modelRoot,['lowerarm.r']);
  const lowerL=modelRoot?.getObjectByName('LowerArm.L')||findBoneByHints(modelRoot,['lowerarm.l']);

  equipmentMounts.rightHand=makeMount(right||playerRoot);
  equipmentMounts.leftHand=makeMount(left||playerRoot);
  // Holsters now follow the animated skeleton instead of floating in player-root/chest space.
  equipmentMounts.hip=makeMount(hips||playerRoot,[.17,.035,-.02],[0,.18,-1.10]);
  equipmentMounts.backGun=makeMount(torso||playerRoot,[0,-.055,-.13],[.18,1.42,.12]);
  equipmentMounts.backMelee=makeMount(torso||playerRoot,[-.09,-.045,-.11],[.10,1.35,-.55]);

  aimBones={torso,upperR,upperL,lowerR,lowerL};
}
function cloneCharacterWeapon(name){
  const t=characterWeaponTemplates[name];
  if(!t)return null;
  const obj=t.clone(true);obj.visible=true;
  obj.traverse(o=>{o.visible=true;if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  const target={Axe:.68,Knife:.34,Pistol:.32,Rifle:1.02,Shotgun:.92,SMG:.72,Spear:1.35,WoodenBat_Barbed:.88,WoodenBat_Saw:.88}[name];
  if(target){
    obj.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(obj),size=new THREE.Vector3();box.getSize(size);
    const longest=Math.max(size.x,size.y,size.z,.001);
    obj.scale.multiplyScalar(target/longest);
  }
  return obj;
}
function putCharacterWeapon(slot,name,mode='leftHand'){
  const m=equipmentMounts[slot];if(!m)return null;
  clearMount(m);if(!name)return null;
  if(mode==='leftHand'||mode==='rightHand'){
    const obj=cloneCharacterWeapon(name);if(!obj)return null;
    if(mode==='rightHand'){
      obj.position.x*=-1;
      const q=obj.quaternion.clone();obj.quaternion.set(q.x,-q.y,-q.z,q.w);
    }
    m.add(obj);return obj;
  }
  const authored=cloneCharacterWeapon(name);
  const key=name==='WoodenBat_Barbed'?'bat':name==='Axe'?'axe':name==='Knife'?'knife':name==='Pistol'?'pistol':name==='Rifle'?'rifle':name==='Shotgun'?'shotgun':null;
  const len=name==='Pistol'?.33:name==='Rifle'?1.02:name==='Shotgun'?.92:name==='Axe'?.66:name==='Knife'?.34:.88;
  const obj=authored||(key?propCloneByLength(weaponTemplates[key],len):null);if(!obj)return null;
  obj.position.set(0,0,0);
  if(mode==='hip')obj.rotation.set(.12,.08,-1.18);
  if(mode==='backGun')obj.rotation.set(.12,.03,1.50);
  if(mode==='backMelee')obj.rotation.set(.10,.05,-.70);
  m.add(obj);return obj;
}
function activeItemForSlot(slot){
  if(slot==='melee')return equipment.melee;
  if(slot==='sidearm')return equipment.sidearm;
  if(slot==='primary')return equipment.primary;
  if(slot==='offhand')return equipment.offhand;
  return null;
}
function refreshEquipmentVisuals(){
  for(const m of Object.values(equipmentMounts))clearMount(m);
  const current=activeItemForSlot(activeSlot)||equipment.melee||'Axe';
  activeWeapon=current;equippedWeaponName=current;

  if(isFirearm(current)){
    putCharacterWeapon('leftHand',current,'leftHand');
    if(equipment.melee){
      const stow=equipment.melee==='Barbed Bat'?'WoodenBat_Barbed':equipment.melee;
      putCharacterWeapon('backMelee',stow,'backMelee');
    }
  }else if(activeSlot==='offhand'){
    putCharacterWeapon('leftHand',equipment.offhand||'Knife','leftHand');
    if(equipment.melee)putCharacterWeapon('backMelee',equipment.melee==='Barbed Bat'?'WoodenBat_Barbed':equipment.melee,'backMelee');
  }else{
    const handName=current==='Barbed Bat'?'WoodenBat_Barbed':current;
    putCharacterWeapon('rightHand',handName,'rightHand');
    if(equipment.offhand)putCharacterWeapon('leftHand',equipment.offhand,'leftHand');
  }

  if(equipment.sidearm&&activeSlot!=='sidearm')putCharacterWeapon('hip',equipment.sidearm,'hip');
  if(equipment.primary&&activeSlot!=='primary')putCharacterWeapon('backGun',equipment.primary,'backGun');
  weaponPivot=isFirearm(current)?equipmentMounts.leftHand:equipmentMounts.rightHand;
}
function selectSlot(slot,quiet=false){
  if(slot==='quick1'||slot==='quick2')return useQuickSlot(slot);
  const item=activeItemForSlot(slot);
  if(!item){if(!quiet)showToast(slot.toUpperCase()+' SLOT EMPTY');return false}
  if(reloadState.active)cancelReload(false);
  activeSlot=slot;activeWeapon=item;equippedWeaponName=item;aiming=false;
  refreshEquipmentVisuals();updateInventory();
  if(!quiet)showToast('Equipped '+item);
  return true;
}
function cycleWeapon(){
  const slots=['melee','sidearm','primary','offhand'].filter(s=>activeItemForSlot(s));
  if(!slots.length)return;
  const i=Math.max(0,slots.indexOf(activeSlot));selectSlot(slots[(i+1)%slots.length]);
}

function sanitizeCharacterClips(clips){
  return (clips||[]).map(src=>{
    const clip=src.clone();
    clip.tracks=clip.tracks.filter(t=>!/^(Root|CharacterArmature)\.(position|quaternion|scale)$/i.test(String(t.name||'')));
    clip.resetDuration();return clip;
  });
}
async function buildPlayer(){
  const spawn=nearestRoadToCenter();playerSpawn.set(spawn.x,spawn.y,surfaceZXY(spawn.x,spawn.y)+.015);
  const [gltf,axe,bat,knife,pistol,rifle,shotgun]=await Promise.all([
    loadAsset(ASSETS.player),
    loadAsset(weaponCfg('Axe').model_url||ASSETS.axe),
    loadAsset(weaponCfg('Barbed Bat').model_url||ASSETS.bat),
    loadAsset(weaponCfg('Knife').model_url||ASSETS.knife),
    loadAsset(weaponCfg('Pistol').model_url||ASSETS.pistol),
    loadAsset(weaponCfg('Rifle').model_url||ASSETS.rifle),
    loadAsset(weaponCfg('Shotgun').model_url||ASSETS.shotgun)
  ]);
  weaponTemplates={axe,bat,knife,pistol,rifle,shotgun};
  if(gltf){
    const n=normalizedModel(gltf.scene,1.82,true);
    playerRoot=n.root;playerVisualRoot=n.oriented;playerVisualRoot.position.z-=PHYSICS_VISUAL_DROP;playerClips=sanitizeCharacterClips(gltf.animations);playerMixer=new THREE.AnimationMixer(n.model);
    captureCharacterWeaponTemplates(n.model);
    setupEquipmentMounts(n.model);
  }else{
    playerRoot=fallbackPlayer();playerVisualRoot=playerRoot;
    setupEquipmentMounts(playerRoot);
  }
  playerRoot.position.copy(playerSpawn);scene.add(playerRoot);
  const restoredItem=activeItemForSlot(activeSlot);
  if(!restoredItem)activeSlot=equipment.melee?'melee':equipment.sidearm?'sidearm':equipment.primary?'primary':'offhand';
  activeWeapon=activeItemForSlot(activeSlot)||equipment.melee||'Axe';
  equippedWeaponName=activeWeapon;
  refreshEquipmentVisuals();
  playPlayerAnimation('idle');
}
function playPlayerAnimation(state){
  if(!playerMixer||!playerClips.length)return;
  const cfg=weaponCfg(activeWeapon),gun=isFirearm(activeWeapon),stance=String(cfg.stance_type||'');
  let desired=null;
  if(state==='reload'&&gun)desired=playerClips.find(c=>/reload/i.test(c.name));
  else if(state==='attack'&&!gun)desired=playerClips.find(c=>/slash|stab|punch|attack|melee/i.test(c.name));
  else if(state==='aim'&&gun)desired=playerClips.find(c=>/aim|shoot|idle.*gun|gun.*idle/i.test(c.name));
  else if(state==='run'&&gun)desired=playerClips.find(c=>/^run_gun$/i.test(c.name)||/run.*gun/i.test(c.name));
  else if(state==='walk'&&gun)desired=playerClips.find(c=>/^walk_gun$/i.test(c.name)||/walk.*gun/i.test(c.name));
  else if(state==='idle'&&gun)desired=playerClips.find(c=>/^idle_gun$/i.test(c.name)||/idle.*gun/i.test(c.name));
  if(!desired&&stance.includes('two_handed'))desired=playerClips.find(c=>new RegExp(state+'.*(gun|rifle)|(?:gun|rifle).*'+state,'i').test(c.name));
  if(!desired){
    const re=state==='run'?/^run$|run|sprint|jog/i:state==='walk'?/^walk$|walk|locomotion|move/i:/^idle$|idle|stand/i;
    desired=playerClips.find(c=>re.test(c.name));
  }
  desired=desired||playerClips[0];
  if(playerAction?._clip===desired)return;
  const next=playerMixer.clipAction(desired);next.reset().fadeIn(.10).play();if(playerAction)playerAction.fadeOut(.10);playerAction=next;
}
function applyProceduralAim(){
  if(!aiming||!isFirearm(activeWeapon)||!playerRoot)return;
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);
  const elevation=Math.asin(THREE.MathUtils.clamp(dir.z,-1,1));
  const cfg=weaponCfg(activeWeapon),two=Boolean(cfg.two_handed);
  // Additive pass after AnimationMixer: animation provides locomotion/stance,
  // these small rotations keep the upper body following the crosshair.
  if(aimBones.torso)aimBones.torso.rotateX(-elevation*.34);
  if(aimBones.upperL)aimBones.upperL.rotateX(-elevation*(two?.44:.30));
  if(aimBones.upperR)aimBones.upperR.rotateX(-elevation*(two?.34:.18));
  if(two&&aimBones.lowerR)aimBones.lowerR.rotateZ(-.08);
  if(two&&aimBones.lowerL)aimBones.lowerL.rotateZ(.06);
}
function staticClone(template,targetHeight){
  if(!template)return null;
  const n=normalizedModel(template.scene,targetHeight,false);return n.root;
}
function propCloneByLength(template,targetLength){
  if(!template)return null;
  const model=template.scene.clone(true);
  model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(model),size=new THREE.Vector3();box.getSize(size);
  const longest=Math.max(size.x,size.y,size.z,.001);
  model.scale.multiplyScalar(targetLength/longest);
  model.updateMatrixWorld(true);
  const box2=new THREE.Box3().setFromObject(model),center=new THREE.Vector3();box2.getCenter(center);
  model.position.sub(center);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  const inner=new THREE.Group();inner.rotation.x=Math.PI/2;inner.add(model);
  const root=new THREE.Group();root.add(inner);return root;
}
function scatterTemplate(template,count,targetHeight,spread=7){
  if(!template||!roadAnchors.length)return;
  for(let i=0;i<count;i++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],o=staticClone(template,targetHeight);if(!o)continue;
    const ang=rand()*Math.PI*2,dist=2+rand()*spread,x=a.x+Math.cos(ang)*dist,y=a.y+Math.sin(ang)*dist;
    if(isBlockedExterior(x,y,.25))continue;
    o.position.set(x,y,surfaceZXY(x,y)+.015);o.rotation.z=rand()*Math.PI*2;artGroup.add(o);
  }
}
function roadSidePoint(a,offset,side){
  const sx=Math.cos(a.heading),sy=-Math.sin(a.heading);
  const x=a.x+sx*offset*side,y=a.y+sy*offset*side;
  return{x,y,z:surfaceZXY(x,y)};
}
function scatterRoadsideTemplate(template,count,targetHeight,mode='sidewalk',rotationOffset=0){
  if(!template||!roadAnchors.length)return 0;
  let placed=0,attempts=0;
  while(placed<count&&attempts<count*12){
    attempts++;
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],side=rand()>.5?1:-1;
    const offset=mode==='parking'?Math.max(1.7,a.width*.34):a.width/2+1.7+rand()*1.2;
    const p=roadSidePoint(a,offset,side);
    if(isBlockedExterior(p.x,p.y,mode==='parking'?.55:.34))continue;
    const o=staticClone(template,targetHeight);if(!o)continue;
    o.position.set(p.x,p.y,p.z+.05);
    o.rotation.z=a.heading+rotationOffset+(side<0?Math.PI:0);
    artGroup.add(o);placed++;
  }
  return placed;
}
const treeMats={
  trunk:new THREE.MeshStandardMaterial({color:0x59412d,roughness:.96}),
  leaf1:new THREE.MeshStandardMaterial({color:0x496d43,roughness:.92}),
  leaf2:new THREE.MeshStandardMaterial({color:0x345b38,roughness:.94})
};
const treeGeo={
  trunk:new THREE.CylinderGeometry(.13,.18,2.05,7),
  crown1:new THREE.IcosahedronGeometry(1.05,1),
  crown2:new THREE.IcosahedronGeometry(.78,1)
};
function makeStreetTree(seedValue){
  const r=seeded(seedValue),g=new THREE.Group();
  const trunk=new THREE.Mesh(treeGeo.trunk,treeMats.trunk);trunk.rotation.x=Math.PI/2;trunk.position.z=1.02;
  const c1=new THREE.Mesh(treeGeo.crown1,treeMats.leaf1);c1.scale.set(.8+r()*.3,.75+r()*.3,1.0+r()*.35);c1.position.z=2.45;
  const c2=new THREE.Mesh(treeGeo.crown2,treeMats.leaf2);c2.position.set((r()-.5)*.35,(r()-.5)*.35,3.25);
  c1.castShadow=c2.castShadow=true;trunk.castShadow=true;g.add(trunk,c1,c2);return g;
}
const bikeMats={
  frame:new THREE.MeshStandardMaterial({color:0x632b24,roughness:.56,metalness:.22}),
  metal:new THREE.MeshStandardMaterial({color:0x3b4142,roughness:.42,metalness:.58}),
  tire:new THREE.MeshStandardMaterial({color:0x141615,roughness:.9})
};
function cylinderBetween(a,b,radius,mat){
  const d=new THREE.Vector3().subVectors(b,a),len=d.length(),m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,len,6),mat);
  m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
  return m;
}
function makeBike(seedValue){
  const r=seeded(seedValue),g=new THREE.Group(),wheelGeo=new THREE.TorusGeometry(.34,.035,6,14);
  const w1=new THREE.Mesh(wheelGeo,bikeMats.tire),w2=w1.clone();w1.rotation.x=Math.PI/2;w2.rotation.x=Math.PI/2;
  w1.position.set(-.55,0,.38);w2.position.set(.55,0,.38);g.add(w1,w2);
  const rear=new THREE.Vector3(-.55,0,.38),front=new THREE.Vector3(.55,0,.38),seat=new THREE.Vector3(-.12,0,.82),crank=new THREE.Vector3(0,0,.43),bar=new THREE.Vector3(.39,0,.90);
  g.add(cylinderBetween(rear,seat,.035,bikeMats.frame),cylinderBetween(seat,crank,.035,bikeMats.frame),cylinderBetween(crank,rear,.035,bikeMats.frame),cylinderBetween(crank,front,.035,bikeMats.frame),cylinderBetween(seat,bar,.028,bikeMats.metal),cylinderBetween(bar,front,.028,bikeMats.metal));
  const seatMesh=new THREE.Mesh(new THREE.BoxGeometry(.24,.11,.06),bikeMats.tire);seatMesh.position.copy(seat);g.add(seatMesh);
  g.rotation.z=(r()-.5)*.08;return g;
}
function localRoadAnchors(radius=150){
  const o=playerSpawn;return roadAnchors.filter(a=>Math.hypot(a.x-o.x,a.y-o.y)<radius);
}
function scatterRoadsideTemplateLocal(template,count,targetHeight,mode='sidewalk',radius=150){
  const anchors=localRoadAnchors(radius);if(!template||!anchors.length)return 0;
  let placed=0,attempts=0;
  while(placed<count&&attempts<count*18){
    attempts++;const a=anchors[Math.floor(rand()*anchors.length)],side=rand()>.5?1:-1;
    const offset=mode==='parking'?Math.max(1.6,a.width*.36):a.width/2+1.5+rand()*1.5;
    const p=roadSidePoint(a,offset,side);if(isBlockedExterior(p.x,p.y,mode==='parking'?.5:.32))continue;
    const o=staticClone(template,targetHeight);if(!o)continue;
    o.position.set(p.x,p.y,p.z+.015);o.rotation.z=a.heading+(side<0?Math.PI:0);artGroup.add(o);placed++;
  }
  return placed;
}
function scatterLocalProceduralLife(){
  const anchors=localRoadAnchors(densePreview()?170:130);if(!anchors.length)return{trees:0,bikes:0,benches:0,planters:0};
  let trees=0,bikes=0,benches=0,planters=0;
  const add=(kind,target)=>{
    for(let attempts=0;attempts<target*20;attempts++){
      if((kind==='tree'?trees:kind==='bike'?bikes:kind==='bench'?benches:planters)>=target)break;
      const a=anchors[Math.floor(rand()*anchors.length)],side=rand()>.5?1:-1;
      const offset=a.width/2+(kind==='bike'?1.35:kind==='bench'?1.9:2.45)+rand()*1.35,p=roadSidePoint(a,offset,side);
      if(isBlockedExterior(p.x,p.y,kind==='tree'?.58:.38))continue;
      let o;
      if(kind==='tree')o=makeStreetTree(hash('localtree:'+attempts));
      else if(kind==='bike')o=makeBike(hash('localbike:'+attempts));
      else if(kind==='bench')o=makeBench();
      else o=makePlanter(hash('localplanter:'+attempts));
      o.position.set(p.x,p.y,p.z+.02);o.rotation.z=a.heading+(kind==='tree'||kind==='planter'?rand()*Math.PI:side<0?Math.PI:0);artGroup.add(o);
      if(kind==='tree')trees++;else if(kind==='bike')bikes++;else if(kind==='bench')benches++;else planters++;
    }
  };
  add('tree',densePreview()?42:26);add('bike',densePreview()?20:10);add('bench',densePreview()?18:10);add('planter',densePreview()?28:16);
  return{trees,bikes,benches,planters};
}
function spawnDrivableVehicle(template,type,count,targetHeight){
  const anchors=localRoadAnchors(densePreview()?260:190);if(!template||!anchors.length)return 0;
  let made=0,attempts=0;
  while(made<count&&attempts<count*25){
    attempts++;
    const a=anchors[Math.floor(rand()*anchors.length)],side=rand()>.5?1:-1;
    const p=roadSidePoint(a,Math.max(1.5,a.width*.34),side);
    if(isBlockedExterior(p.x,p.y,.72))continue;
    const root=staticClone(template,targetHeight);if(!root)continue;
    root.position.set(p.x,p.y,p.z+.02);root.rotation.z=a.heading+(side<0?Math.PI:0);artGroup.add(root);
    drivableVehicles.push({root,type,heading:root.rotation.z,speed:0,maxSpeed:type==='bike'?8:type==='truck'?16:type==='sports'?25:19,accel:type==='bike'?5:type==='truck'?5.2:7.2,requiredParts:type==='bike'?[]:['Car battery','Spark plug'],installedParts:[]});
    made++;
  }
  return made;
}
function spawnDrivableBike(count=5){
  const anchors=localRoadAnchors(180);let made=0,attempts=0;
  while(made<count&&attempts<count*20){
    attempts++;const a=anchors[Math.floor(rand()*anchors.length)];if(!a)continue;
    const p=roadSidePoint(a,a.width/2+1.15,rand()>.5?1:-1);if(isBlockedExterior(p.x,p.y,.42))continue;
    const root=makeBike(hash('drivebike:'+attempts));root.position.set(p.x,p.y,p.z+.03);root.rotation.z=a.heading;artGroup.add(root);
    drivableVehicles.push({root,type:'bike',heading:a.heading,speed:0,maxSpeed:8,accel:4.2,requiredParts:[],installedParts:[]});made++;
  }
  return made;
}
function vehicleReady(v){return !v?.requiredParts?.some(p=>!v.installedParts?.includes(p))}
function repairVehicle(v){
  if(!v)return false;const missing=(v.requiredParts||[]).filter(p=>!v.installedParts.includes(p));if(!missing.length)return true;let installed=0;
  for(const part of missing)if((inventory[part]||0)>0){inventory[part]--;lootCount=Math.max(0,lootCount-1);v.installedParts.push(part);installed++}
  updateInventory();
  if(vehicleReady(v)){awardXP(75,'vehicle repair');showToast(v.type+' repaired — driveable');return true}
  showToast(installed?'Installed '+installed+' part'+(installed===1?'':'s')+' · still need '+v.requiredParts.filter(p=>!v.installedParts.includes(p)).join(' + '):'Need '+missing.join(' + '));return false;
}
function nearestDrivable(){
  if(!playerRoot||activeVehicle)return null;let best=null,d=Infinity;
  for(const v of drivableVehicles){
    const q=Math.hypot(v.root.position.x-playerRoot.position.x,v.root.position.y-playerRoot.position.y);
    if(q<3.2&&q<d){d=q;best=v}
  }
  return best;
}
function enterVehicle(v){
  if(!v||activeVehicle||interiorMode)return;
  if(!vehicleReady(v)){repairVehicle(v);if(!vehicleReady(v))return}
  activeVehicle=v;playerRoot.visible=false;playerVelocity.set(0,0,0);
  if(playerPhysicsBody){try{physicsWorld.removeRigidBody(playerPhysicsBody)}catch(_){}playerPhysicsBody=null;playerPhysicsCollider=null}
  showToast('Driving '+v.type+' · E to exit');
}
function exitVehicle(){
  if(!activeVehicle||!playerRoot)return;
  const v=activeVehicle,sideX=Math.cos(v.heading)*1.7,sideY=-Math.sin(v.heading)*1.7;
  let x=v.root.position.x+sideX,y=v.root.position.y+sideY;
  if(isBlockedExterior(x,y,.36)){x=v.root.position.x-sideX;y=v.root.position.y-sideY}
  playerRoot.position.set(x,y,surfaceZXY(x,y)+.02);playerRoot.visible=true;activeVehicle=null;createPlayerPhysics();showToast('Exited vehicle');
}
function updateVehicle(dt,ix,iy){
  const v=activeVehicle;if(!v)return;
  const throttle=THREE.MathUtils.clamp(iy,-1,1),steer=THREE.MathUtils.clamp(ix,-1,1);
  const target=throttle*v.maxSpeed;
  v.speed=THREE.MathUtils.lerp(v.speed,target,1-Math.exp(-v.accel*dt));
  if(Math.abs(v.speed)<.03)v.speed=0;
  v.heading-=steer*(.65+Math.min(1,Math.abs(v.speed)/8))*dt*Math.sign(v.speed||1);
  const dx=Math.sin(v.heading)*v.speed*dt,dy=Math.cos(v.heading)*v.speed*dt;
  const nx=v.root.position.x+dx,ny=v.root.position.y+dy;
  if(!isBlockedExterior(nx,ny,.72)&&!boundaryBlocks(nx,ny)){v.root.position.x=nx;v.root.position.y=ny}else v.speed*=.18;
  v.root.position.z=surfaceZXY(v.root.position.x,v.root.position.y)+.02;v.root.rotation.z=v.heading;
  playerRoot.position.copy(v.root.position);
  yaw=lerpAngle(yaw,v.heading,1-Math.exp(-3.5*dt));
}
function initializeVehicleRepair(){
  for(let i=0;i<drivableVehicles.length;i++){
    const v=drivableVehicles[i];v.installedParts=v.installedParts||[];
    if(i===0||v.type==='bike'||i%4===0)v.installedParts=[...(v.requiredParts||[])];
  }
  const anchors=localRoadAnchors(180);
  for(let i=0;i<Math.min(10,anchors.length);i++){
    const a=anchors[(i*7)%anchors.length],p=roadSidePoint(a,a.width/2+1.1,i%2?1:-1);
    if(!isBlockedExterior(p.x,p.y,.3))spawnVisiblePickup(i%2?'Spark plug':'Car battery',p.x,p.y,p.z,'exterior',hash('vehicle-part:'+i));
  }
}
function scatterProceduralStreetLife(){
  if(!roadAnchors.length)return{trees:0,bikes:0};
  let trees=0,bikes=0;
  const treeTarget=densePreview()?150:82,bikeTarget=densePreview()?70:30;
  for(let i=0,attempts=0;i<treeTarget&&attempts<treeTarget*15;attempts++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],side=rand()>.5?1:-1,p=roadSidePoint(a,a.width/2+2.4+rand()*1.6,side);
    if(isBlockedExterior(p.x,p.y,.65))continue;
    const o=makeStreetTree(hash(CELL+':tree:'+attempts));o.position.set(p.x,p.y,p.z+.03);artGroup.add(o);i++;trees++;
  }
  for(let i=0,attempts=0;i<bikeTarget&&attempts<bikeTarget*15;attempts++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],side=rand()>.5?1:-1,p=roadSidePoint(a,a.width/2+1.45+rand()*.7,side);
    if(isBlockedExterior(p.x,p.y,.42))continue;
    const o=makeBike(hash(CELL+':bike:'+attempts));o.position.set(p.x,p.y,p.z+.04);o.rotation.z=a.heading+(rand()-.5)*.16;artGroup.add(o);i++;bikes++;
  }
  return{trees,bikes};
}
const streetDetailMats={
  bench:new THREE.MeshStandardMaterial({color:0x4c4031,roughness:.86}),
  metal:new THREE.MeshStandardMaterial({color:0x343a39,roughness:.52,metalness:.42}),
  planter:new THREE.MeshStandardMaterial({color:0x6f6c60,roughness:.92}),
  shrub:new THREE.MeshStandardMaterial({color:0x3d663f,roughness:.94})
};
function makeBench(){
  const g=new THREE.Group();
  const seat=new THREE.Mesh(new THREE.BoxGeometry(1.65,.52,.12),streetDetailMats.bench);seat.position.z=.52;
  const back=new THREE.Mesh(new THREE.BoxGeometry(1.65,.10,.72),streetDetailMats.bench);back.position.set(0,.25,.88);
  const leg1=new THREE.Mesh(new THREE.BoxGeometry(.10,.42,.52),streetDetailMats.metal);leg1.position.set(-.58,0,.26);
  const leg2=leg1.clone();leg2.position.x=.58;g.add(seat,back,leg1,leg2);return g;
}
function makePlanter(seedValue){
  const r=seeded(seedValue),g=new THREE.Group();
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.42,.50,.55,8),streetDetailMats.planter);pot.rotation.x=Math.PI/2;pot.position.z=.28;
  const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(.62,1),streetDetailMats.shrub);bush.scale.set(.85+r()*.25,.85+r()*.25,.75+r()*.35);bush.position.z=.88;
  g.add(pot,bush);return g;
}
function scatterStreetFurniture(){
  if(!roadAnchors.length)return{benches:0,planters:0};
  const benchTarget=densePreview()?58:28,planterTarget=densePreview()?96:46;
  let benches=0,planters=0;
  for(let attempts=0;benches<benchTarget&&attempts<benchTarget*14;attempts++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],side=rand()>.5?1:-1,p=roadSidePoint(a,a.width/2+2.0+rand()*1.2,side);
    if(isBlockedExterior(p.x,p.y,.9))continue;
    const o=makeBench();o.position.set(p.x,p.y,p.z+.03);o.rotation.z=a.heading+(side<0?Math.PI:0);artGroup.add(o);benches++;
  }
  for(let attempts=0;planters<planterTarget&&attempts<planterTarget*14;attempts++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],side=rand()>.5?1:-1,p=roadSidePoint(a,a.width/2+2.7+rand()*1.5,side);
    if(isBlockedExterior(p.x,p.y,.62))continue;
    const o=makePlanter(hash(CELL+':planter:'+attempts));o.position.set(p.x,p.y,p.z+.02);artGroup.add(o);planters++;
  }
  return{benches,planters};
}
function buildGrassDetails(){
  if(!roadAnchors.length)return 0;
  const count=densePreview()?2600:1400;
  const geo=new THREE.ConeGeometry(.07,.44,3);
  const mat=new THREE.MeshStandardMaterial({color:0x4b7547,roughness:.96});
  const inst=new THREE.InstancedMesh(geo,mat,count),dummy=new THREE.Object3D();
  let placed=0,attempts=0;
  while(placed<count&&attempts<count*10){
    attempts++;
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)];if(!a)continue;
    const side=rand()>.5?1:-1,offset=a.width/2+3.2+rand()*5.5,p=roadSidePoint(a,offset,side);
    if(isBlockedExterior(p.x,p.y,.15))continue;
    dummy.position.set(p.x,p.y,p.z+.20);dummy.rotation.set(rand()*.12,rand()*.12,rand()*Math.PI*2);
    const sc=.65+rand()*.85;dummy.scale.set(sc,sc,sc);dummy.updateMatrix();inst.setMatrixAt(placed,dummy.matrix);placed++;
  }
  inst.count=placed;inst.instanceMatrix.needsUpdate=true;inst.receiveShadow=false;inst.castShadow=false;artGroup.add(inst);return placed;
}
function buildDenseVegetation(){
  const b=streamXYBounds();if(!b)return{trees:0,shrubs:0};
  const treeTarget=densePreview()?420:220,shrubTarget=densePreview()?850:420;
  const trunkGeo=new THREE.CylinderGeometry(.10,.15,1.9,6),crownGeo=new THREE.IcosahedronGeometry(.82,1),shrubGeo=new THREE.IcosahedronGeometry(.42,1);
  const trunkMat=new THREE.MeshStandardMaterial({color:0x59432f,roughness:.97});
  const leafMat=new THREE.MeshStandardMaterial({color:0x3d6d42,roughness:.96});
  const shrubMat=new THREE.MeshStandardMaterial({color:0x4f7c4a,roughness:.97});
  const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,treeTarget),crowns=new THREE.InstancedMesh(crownGeo,leafMat,treeTarget),shrubs=new THREE.InstancedMesh(shrubGeo,shrubMat,shrubTarget);
  const d=new THREE.Object3D();let tc=0,sc=0,attempts=0;
  const roadGap=(x,y)=>{
    let best=Infinity;
    for(const seg of nearbyRoadSegments(x,y)){const q=pointSegDist(x,y,seg.a,seg.b)-seg.width/2;if(q<best)best=q}
    return best;
  };
  while(tc<treeTarget&&attempts<treeTarget*18){
    attempts++;const x=THREE.MathUtils.lerp(b.west,b.east,rand()),y=THREE.MathUtils.lerp(b.south,b.north,rand());
    if(isBlockedExterior(x,y,.55)||roadGap(x,y)<5.5)continue;
    const z=surfaceZXY(x,y),scal=.75+rand()*1.45;
    d.position.set(x,y,z+.95*scal);d.rotation.set(Math.PI/2,0,rand()*Math.PI*2);d.scale.set(scal,scal,scal);d.updateMatrix();trunks.setMatrixAt(tc,d.matrix);
    d.position.set(x+(rand()-.5)*.22,y+(rand()-.5)*.22,z+2.05*scal);d.rotation.set(rand()*.2,rand()*.2,rand()*Math.PI*2);d.scale.set(1.1*scal,.95*scal,1.25*scal);d.updateMatrix();crowns.setMatrixAt(tc,d.matrix);tc++;
  }
  attempts=0;
  while(sc<shrubTarget&&attempts<shrubTarget*16){
    attempts++;const x=THREE.MathUtils.lerp(b.west,b.east,rand()),y=THREE.MathUtils.lerp(b.south,b.north,rand());
    if(isBlockedExterior(x,y,.28)||roadGap(x,y)<3.8)continue;
    const z=surfaceZXY(x,y),sz=.55+rand()*1.1;d.position.set(x,y,z+.28);d.rotation.set(rand()*.2,rand()*.2,rand()*Math.PI*2);d.scale.set(sz,sz*(.7+rand()*.45),sz);d.updateMatrix();shrubs.setMatrixAt(sc++,d.matrix);
  }
  trunks.count=crowns.count=tc;shrubs.count=sc;trunks.instanceMatrix.needsUpdate=crowns.instanceMatrix.needsUpdate=shrubs.instanceMatrix.needsUpdate=true;
  trunks.castShadow=crowns.castShadow=true;shrubs.castShadow=false;artGroup.add(trunks,crowns,shrubs);return{trees:tc,shrubs:sc};
}
function applyApocalypseDecay(rootNode){
  const touched=new Set();
  rootNode?.traverse?.(o=>{
    if(!o.isMesh)return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    for(const mat of mats){
      if(!mat||touched.has(mat)||mat.userData?.horizonDecay)continue;
      touched.add(mat);mat.userData=mat.userData||{};mat.userData.horizonDecay=true;
      const prior=mat.onBeforeCompile;
      mat.onBeforeCompile=shader=>{
        prior?.(shader);
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vHorizonDecayPos;');
        shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvHorizonDecayPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vHorizonDecayPos;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          float moss=smoothstep(.62,.96,sin(vHorizonDecayPos.x*.071+vHorizonDecayPos.y*.043)*.5+.5);
          float crack=smoothstep(.965,.995,abs(sin(vHorizonDecayPos.x*.39+sin(vHorizonDecayPos.z*.31)*2.2)));
          float rust=smoothstep(.78,.98,sin(vHorizonDecayPos.y*.117-vHorizonDecayPos.z*.193)*.5+.5);
          diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.46,.62,.42),moss*.25);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.33,.14,.07),rust*.12);
          diffuseColor.rgb*=1.0-crack*.17;`);
      };
      mat.needsUpdate=true;decayPatchedMaterials++;
    }
  });
  return decayPatchedMaterials;
}
function makeStopSign(){
  const g=new THREE.Group(),poleMat=new THREE.MeshStandardMaterial({color:0x777b79,metalness:.55,roughness:.45});
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,2.15,7),poleMat);pole.rotation.x=Math.PI/2;pole.position.z=1.07;
  const sign=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.055,8),new THREE.MeshStandardMaterial({color:0x8e1919,emissive:0x280000,roughness:.65}));
  sign.rotation.x=Math.PI/2;sign.rotation.z=Math.PI/8;sign.position.z=2.02;g.add(pole,sign);return g;
}
function makeSourceLamp(){
  const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:0x333936,metalness:.42,roughness:.55});
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.065,3.8,7),m);pole.rotation.x=Math.PI/2;pole.position.z=1.9;
  const arm=new THREE.Mesh(new THREE.BoxGeometry(.78,.05,.05),m);arm.position.set(.34,0,3.72);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.10,8,6),new THREE.MeshStandardMaterial({color:0xffe2a3,emissive:0xffb84c,emissiveIntensity:.55}));
  bulb.position.set(.70,0,3.65);g.add(pole,arm,bulb);return g;
}
function snapInfrastructureToRoadNodes(){
  if(!roadAnchors.length)return 0;
  const chosen=[],cell=42,buckets=new Map();
  for(const a of roadAnchors){const k=Math.round(a.x/cell)+':'+Math.round(a.y/cell),list=buckets.get(k)||[];list.push(a);buckets.set(k,list)}
  for(const list of buckets.values()){
    if(list.length<2)continue;const a=list[Math.floor(list.length/2)];
    if(chosen.some(p=>Math.hypot(p.x-a.x,p.y-a.y)<28))continue;
    chosen.push(a);if(chosen.length>Math.min(80,densePreview()?80:42))break;
  }
  let n=0;
  for(let i=0;i<chosen.length;i++){
    const a=chosen[i],side=i%2?1:-1,p=roadSidePoint(a,a.width/2+1.5,side);
    if(isBlockedExterior(p.x,p.y,.28))continue;
    const lamp=makeSourceLamp();lamp.position.set(p.x,p.y,p.z+.02);lamp.rotation.z=a.heading;artGroup.add(lamp);n++;
    if(i%3===0){
      const sp=roadSidePoint(a,a.width/2+1.05,-side);
      if(!isBlockedExterior(sp.x,sp.y,.24)){const sign=makeStopSign();sign.position.set(sp.x,sp.y,sp.z+.02);sign.rotation.z=a.heading;artGroup.add(sign);n++}
    }
  }
  smartSnappedProps=n;return n;
}
function makeOpenSpaceFeature(seedValue){
  const r=seeded(seedValue),g=new THREE.Group();
  if(r()<.52){
    const basin=new THREE.Mesh(new THREE.CylinderGeometry(.72,.82,.18,20),new THREE.MeshStandardMaterial({color:0x727a75,roughness:.8}));basin.rotation.x=Math.PI/2;basin.position.z=.09;
    const water=new THREE.Mesh(new THREE.CylinderGeometry(.57,.57,.035,20),new THREE.MeshStandardMaterial({color:0x315e66,roughness:.18,transparent:true,opacity:.78}));water.rotation.x=Math.PI/2;water.position.z=.20;g.add(basin,water);
  }else{
    const base=new THREE.Mesh(new THREE.BoxGeometry(.7,.7,.42),new THREE.MeshStandardMaterial({color:0x696861,roughness:.92}));base.position.z=.21;
    const statue=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.72,4,7),new THREE.MeshStandardMaterial({color:0x59615c,metalness:.18,roughness:.74}));statue.rotation.x=Math.PI/2;statue.position.z=1.02;g.add(base,statue);
  }
  return g;
}
function populateOpenSpace(){
  const b=streamXYBounds();if(!b)return 0;let placed=0,attempts=0,target=densePreview()?26:14;
  while(placed<target&&attempts<target*45){
    attempts++;const x=THREE.MathUtils.lerp(b.west,b.east,rand()),y=THREE.MathUtils.lerp(b.south,b.north,rand());
    if(isBlockedExterior(x,y,1.1))continue;
    let roadDist=Infinity;for(const seg of nearbyRoadSegments(x,y)){roadDist=Math.min(roadDist,pointSegDist(x,y,seg.a,seg.b)-seg.width/2)}
    if(roadDist<10||roadDist>70)continue;
    const o=makeOpenSpaceFeature(hash(CELL+':open:'+attempts));o.position.set(x,y,surfaceZXY(x,y)+.02);o.rotation.z=rand()*Math.PI*2;artGroup.add(o);placed++;
  }
  openSpaceProps=placed;return placed;
}
function initFlashlight(){
  flashlight=new THREE.SpotLight(0xfff1cc,0,28,Math.PI/7,.42,1.25);flashlightTarget=new THREE.Object3D();
  scene.add(flashlight,flashlightTarget);flashlight.target=flashlightTarget;
}
function toggleFlashlight(force){
  flashlightOn=typeof force==='boolean'?force:!flashlightOn;if(flashlight)flashlight.intensity=flashlightOn?48:0;
  showToast(flashlightOn?'Flashlight on':'Flashlight off');return flashlightOn;
}
function updateFlashlight(){
  if(!flashlight||!playerRoot)return;const d=new THREE.Vector3();camera.getWorldDirection(d);
  flashlight.position.copy(camera.position);flashlightTarget.position.copy(camera.position).addScaledVector(d,12);
}
function updateDayNight(now){
  if(!autoDayNight||!sun||now-lastAtmosphereUpdate<900)return;lastAtmosphereUpdate=now;
  const utc=new Date(),hours=utc.getUTCHours()+utc.getUTCMinutes()/60+(Number(lon0||0)/15),h=(hours%24+24)%24,angle=(h-6)/24*Math.PI*2;
  const day=Math.max(0,Math.sin(angle)),twilight=Math.max(.12,Math.min(1,day*1.18+.10));
  sun.position.set(Math.cos(angle)*1200,-Math.sin(angle*.73)*780,Math.max(80,Math.sin(angle)*1500));
  sun.intensity=.18+2.45*twilight;hemi.intensity=.18+.98*twilight;renderer.toneMappingExposure=.58+.48*twilight;
  if(day<.08){scene.background.set(0x07100d);scene.fog.color.set(0x0b1511)}
  else if(day<.30){scene.background.set(0x403d3a);scene.fog.color.set(0x494743)}
  else{scene.background.set(0x68746e);scene.fog.color.set(0x69736d)}
}
function seasonDay(){return Math.max(1,Math.min(365,Math.floor((Date.now()-MATCH_SEASON_START)/86400000)+1))}
function configureMatchMode(mode=matchMode){
  matchMode=['survival','skirmish','year365'].includes(mode)?mode:'survival';const b=streamXYBounds();if(!b)return;
  matchCenter.set(playerSpawn.x,playerSpawn.y);
  if(matchMode==='survival')matchRadius=Infinity;
  else if(matchMode==='skirmish')matchRadius=Math.max(90,Math.min(b.width,b.height)*.33);
  else{const day=seasonDay(),start=Math.min(b.width,b.height)*.47,end=Math.max(55,Math.min(b.width,b.height)*.07);matchRadius=THREE.MathUtils.lerp(start,end,(day-1)/364)}
  if(matchRing){matchRing.parent?.remove(matchRing);matchRing.geometry?.dispose();matchRing=null}
  if(Number.isFinite(matchRadius)){
    matchRing=new THREE.Mesh(new THREE.RingGeometry(Math.max(1,matchRadius-.65),matchRadius+.65,128),new THREE.MeshBasicMaterial({color:0xe95656,transparent:true,opacity:.48,side:THREE.DoubleSide,depthWrite:false}));
    matchRing.position.set(matchCenter.x,matchCenter.y,surfaceZXY(matchCenter.x,matchCenter.y)+.48);artGroup.add(matchRing);
  }
  const el=$('modeStat');if(el)el.textContent=matchMode==='year365'?'YEAR '+seasonDay()+'/365':matchMode.toUpperCase();persistSurvivor();
}
function cycleMatchMode(){const modes=['survival','skirmish','year365'],i=modes.indexOf(matchMode);configureMatchMode(modes[(i+1)%modes.length]);showToast('Mode: '+matchMode)}
function matchBlocks(x,y){return Number.isFinite(matchRadius)&&Math.hypot(x-matchCenter.x,y-matchCenter.y)>matchRadius}
function awardXP(amount,reason='survival'){
  xp=Math.max(0,xp+Math.max(0,Math.floor(amount)));battleTier=Math.floor(xp/500);
  for(const [tier,item] of [[2,'ASH CAMO'],[5,'RUST WRAP'],[10,'HORIZON SKIN'],[20,'SURVIVOR EMOTE']])if(battleTier>=tier)cosmeticUnlocks.add(item);
  const el=$('xpStat');if(el)el.textContent=xp.toLocaleString();persistSurvivor();return{xp,battleTier,reason,unlocks:[...cosmeticUnlocks]};
}
function moderateChatMessage(message){
  let text=String(message||'').trim().slice(0,240);
  for(const token of MODERATION_BLOCKLIST)if(token&&text.toLowerCase().includes(token.toLowerCase()))return{allowed:false,text:'',reason:'blocked'};
  text=text.replace(/https?:\/\/\S+/gi,'[link]');return{allowed:Boolean(text),text,reason:text?'ok':'empty'};
}
function buildAtmosphere(){
  const geo=new THREE.SphereGeometry(5200,28,16);
  const mat=new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{top:{value:new THREE.Color(0x203b46)},horizon:{value:new THREE.Color(0xb6c6b4)},bottom:{value:new THREE.Color(0x6f786d)}},
    vertexShader:'varying vec3 vPos; void main(){vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec3 vPos; uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; void main(){float h=normalize(vPos).z; vec3 c=h>0.0?mix(horizon,top,pow(clamp(h,0.0,1.0),0.55)):mix(horizon,bottom,clamp(-h,0.0,1.0)); gl_FragColor=vec4(c,1.0);}'
  });
  const sky=new THREE.Mesh(geo,mat);sky.renderOrder=-1000;scene.add(sky);return sky;
}
function ensureAudio(){
  try{
    if(!audioCtx){
      audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      audioMaster=audioCtx.createGain();audioMaster.gain.value=.34;audioMaster.connect(audioCtx.destination);
    }
    if(audioCtx.state==='suspended')audioCtx.resume();
  }catch(_){}
}
function audioPosition(pos){
  if(!audioCtx||!pos)return null;
  const p=audioCtx.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=2;p.maxDistance=80;p.rolloffFactor=1.15;
  p.positionX.value=pos.x;p.positionY.value=pos.z;p.positionZ.value=-pos.y;return p;
}
function spatialTone(pos,type='groan'){
  if(!audioCtx||!audioMaster)return;
  const p=audioPosition(pos);if(!p)return;p.connect(audioMaster);
  const g=audioCtx.createGain(),o=audioCtx.createOscillator();o.connect(g);g.connect(p);
  const now=audioCtx.currentTime;
  if(type==='groan'){o.type='sawtooth';o.frequency.setValueAtTime(92+rand()*28,now);o.frequency.exponentialRampToValueAtTime(58+rand()*15,now+.55);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.16,now+.05);g.gain.exponentialRampToValueAtTime(.0001,now+.62)}
  else{o.type='triangle';o.frequency.setValueAtTime(type==='foot'?115:180,now);g.gain.setValueAtTime(.08,now);g.gain.exponentialRampToValueAtTime(.0001,now+.09)}
  o.start(now);o.stop(now+(type==='groan'?.65:.11));
}
function gunshotAudio(pos,weapon){
  if(!audioCtx||!audioMaster)return;
  const p=audioPosition(pos);if(!p)return;p.connect(audioMaster);
  const len=Math.floor(audioCtx.sampleRate*.16),buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<len;i++){const t=i/len;d[i]=(Math.random()*2-1)*Math.pow(1-t,weapon==='Shotgun'?1.2:2.1)}
  const src=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),g=audioCtx.createGain();src.buffer=buf;filter.type='lowpass';filter.frequency.value=weapon==='Rifle'?3200:weapon==='Pistol'?2600:1900;g.gain.value=weapon==='Shotgun'?.55:.36;
  src.connect(filter);filter.connect(g);g.connect(p);src.start();
}
function updateAudioListener(){
  if(!audioCtx||!playerRoot)return;
  const listener=audioCtx.listener,dir=new THREE.Vector3();camera.getWorldDirection(dir);
  const p=camera.position;
  if(listener.positionX){listener.positionX.value=p.x;listener.positionY.value=p.z;listener.positionZ.value=-p.y;listener.forwardX.value=dir.x;listener.forwardY.value=dir.z;listener.forwardZ.value=-dir.y;listener.upX.value=0;listener.upY.value=1;listener.upZ.value=0}
}
function showToast(message){
  let el=document.getElementById('lootToast');
  if(!el){el=document.createElement('div');el.id='lootToast';document.body.appendChild(el)}
  el.textContent=message;el.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.classList.remove('show'),2200);
}
function isFirearm(item){
  const cfg=weaponRegistry.get(item)||weaponRegistry.get(String(item||'').toLowerCase())||
    DEFAULT_WEAPON_CONFIGS.find(x=>x.weapon_name===item||x.weapon_id===item);
  return Boolean(cfg&&(cfg.weapon_type==='sidearm'||cfg.weapon_type==='primary'));
}
function updateInventory(){
  const entries=Object.entries(inventory).filter(([,v])=>v>0);
  $('inventoryCount').textContent=lootCount+' / '+packCapacity+' slots';
  const pack=$('packName');if(pack)pack.textContent=packName.toUpperCase();
  const weapon=$('equippedWeapon');
  if(weapon){
    const cfg=weaponCfg(activeWeapon);
    const ammo=isFirearm(activeWeapon)
      ?' · '+(ammoState[activeWeapon]??0)+' / '+(reserveAmmo[activeWeapon]??0)+' ammo'
      :'';
    const reload=reloadState.active&&reloadState.weapon===activeWeapon?' · RELOADING':'';
    weapon.textContent='Active: '+activeWeapon+ammo+reload+' · '+cfg.stance_type.replaceAll('_',' ');
  }
  const packStat=$('packStat');if(packStat)packStat.textContent=lootCount+'/'+packCapacity;
  const killStat=$('killStat');if(killStat)killStat.textContent=String(kills);
  const xpEl=$('xpStat');if(xpEl)xpEl.textContent=xp.toLocaleString();
  const livesEl=$('livesStat');if(livesEl)livesEl.textContent=String(livesRemaining);
  const modeEl=$('modeStat');if(modeEl)modeEl.textContent=matchMode==='year365'?'YEAR '+seasonDay()+'/365':matchMode.toUpperCase();
  $('lootStat').textContent=String(lootCount);
  const slots={
    slotMelee:equipment.melee||'EMPTY',
    slotOffhand:equipment.offhand||'EMPTY',
    slotSidearm:equipment.sidearm||'EMPTY',
    slotPrimary:equipment.primary||'EMPTY',
    slotQuick1:equipment.quick1||'EMPTY',
    slotQuick2:equipment.quick2||'EMPTY'
  };
  for(const [id,val] of Object.entries(slots)){const el=$(id);if(el)el.textContent=String(val).toUpperCase()}
  document.querySelectorAll('.loadoutSlot[data-slot]').forEach(el=>el.classList.toggle('active',el.dataset.slot===activeSlot));
  const label=$('attackLabel');if(label)label.textContent=isFirearm(activeWeapon)?(reloadState.active?'WAIT':'FIRE'):'SWING';
  const reloadLabel=$('reloadLabel');if(reloadLabel)reloadLabel.textContent=reloadState.active?'...':'RELOAD';
  const cross=$('crosshair');if(cross)cross.hidden=!(aiming&&isFirearm(activeWeapon));
  $('inventoryList').innerHTML=entries.length
    ?entries.slice(0,16).map(([k,v])=>'<span data-item="'+k+'">'+k+' ×'+v+'</span>').join('')
    :'<span class="empty">Search rooms, cabinets, furniture and visible loot.</span>';
  persistSurvivor();
}
function addInventoryItem(item){
  const ammoPickup={
    'Pistol Ammo':{weapon:'Pistol',rounds:12},
    'Rifle Ammo':{weapon:'Rifle',rounds:20},
    'Shotgun Shells':{weapon:'Shotgun',rounds:6}
  }[item];
  if(ammoPickup){
    if(lootCount>=packCapacity){showToast('PACK FULL — free a slot for ammo');return false}
    inventory[item]=(inventory[item]||0)+1;lootCount++;
    reserveAmmo[ammoPickup.weapon]=(reserveAmmo[ammoPickup.weapon]||0)+ammoPickup.rounds;
    updateInventory();showToast('+'+ammoPickup.rounds+' '+ammoPickup.weapon+' reserve');return true;
  }
  if(item==='Hiking Backpack'){
    if(packCapacity<36){packCapacity=36;packName='Hidden Hiking Pack';showToast('Capacity upgraded: 36 slots')}
    updateInventory();return true;
  }
  if(item==='Large Duffel'){
    if(packCapacity<42){packCapacity=42;packName='Hidden Large Pack';showToast('Capacity upgraded: 42 slots')}
    updateInventory();return true;
  }
  if(lootCount>=packCapacity){showToast('PACK FULL — find a larger bag');return false}
  inventory[item]=(inventory[item]||0)+1;lootCount++;
  const cfg=weaponRegistry.get(item)||weaponRegistry.get(String(item||'').toLowerCase());
  if(cfg){
    if(cfg.equip_slot==='melee')equipment.melee=item;
    else if(cfg.equip_slot==='offhand')equipment.offhand=item;
    else if(cfg.equip_slot==='sidearm')equipment.sidearm=item;
    else if(cfg.equip_slot==='primary')equipment.primary=item;
    if(cfg.magazine_size>0){
      ammoState[item]=Math.max(ammoState[item]||0,Number(cfg.magazine_size||0));
      reserveAmmo[item]=Math.max(reserveAmmo[item]||0,Math.ceil(Number(cfg.reserve_default||0)*.30));
    }
    refreshEquipmentVisuals();
    if(cfg.equip_slot==='melee'&&activeSlot==='melee'){activeWeapon=item;equippedWeaponName=item}
  }
  if(item==='Bandage'&&!equipment.quick1)equipment.quick1='Bandage';
  if(item==='Water'&&!equipment.quick2)equipment.quick2='Water';
  updateInventory();
  return true;
}
const pickupGlowMat=new THREE.MeshStandardMaterial({color:0x7cff9c,emissive:0x2ee56c,emissiveIntensity:1.25,roughness:.35,transparent:true,opacity:.84});
const pickupRareMat=new THREE.MeshStandardMaterial({color:0xe8b85f,emissive:0xc8781e,emissiveIntensity:1.2,roughness:.35,transparent:true,opacity:.88});
function pickupTemplateFor(item){
  if(item==='Pistol')return{template:weaponTemplates.pistol,length:.34};
  if(item==='Rifle')return{template:weaponTemplates.rifle,length:1.02};
  if(item==='Shotgun')return{template:weaponTemplates.shotgun,length:.92};
  if(item==='Axe')return{template:weaponTemplates.axe,length:.66};
  if(item==='Knife')return{template:weaponTemplates.knife,length:.34};
  return null;
}
function makePickupVisual(item,seedValue){
  const root=new THREE.Group(),weapon=pickupTemplateFor(item);
  let model=null;
  if(weapon?.template){
    model=propCloneByLength(weapon.template,weapon.length);
    if(model){model.rotation.set(.12,.08,-.2);model.position.z=.28;root.add(model)}
  }else if(pickupTemplates.chestSpecial||pickupTemplates.chest){
    model=staticClone(pickupTemplates.chestSpecial||pickupTemplates.chest,.42);
    if(model){model.position.z=.12;root.add(model)}
  }else{
    model=new THREE.Mesh(new THREE.BoxGeometry(.42,.30,.24),new THREE.MeshStandardMaterial({color:0x77664f,roughness:.78}));
    model.position.z=.2;root.add(model);
  }
  const rare=/Pistol|Rifle|Shotgun|Axe|Backpack|Duffel/.test(item);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.48,.035,8,22),rare?pickupRareMat:pickupGlowMat);
  ring.rotation.x=Math.PI/2;ring.position.z=.08;root.add(ring);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.72,5),rare?pickupRareMat:pickupGlowMat);
  stem.position.set(0,0,.48);root.add(stem);
  root.userData.pickupItem=item;root.userData.seed=seedValue;
  return root;
}
function spawnVisiblePickup(item,x,y,z,mode='exterior',seedValue=0){
  const root=makePickupVisual(item,seedValue||++pickupSeq);
  root.position.set(x,y,z+.03);
  (mode==='interior'?interiorGroup:lootGroup).add(root);
  const p={id:++pickupSeq,item,root,mode,active:true,x,y,z,phase:(seedValue%997)/997*Math.PI*2};
  worldPickups.push(p);return p;
}
function spawnOutdoorLoot(){
  const target=densePreview()?80:40;
  const table=['Bandage','Water','First aid kit','Batteries','Canned food','Pistol Ammo','Rifle Ammo','Shotgun Shells','Pistol','Rifle','Shotgun','Axe','Hiking Backpack'];
  let placed=0,attempts=0;
  while(placed<target&&attempts<target*24){
    attempts++;
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)];if(!a)continue;
    const d=Math.hypot(a.x-playerSpawn.x,a.y-playerSpawn.y);if(d<7||d>420)continue;
    const side=rand()>.5?1:-1;
    const insideEdge=Math.max(.75,a.width/2-(.65+rand()*1.15));
    let p=roadSidePoint(a,insideEdge,side);
    if(isBlockedExterior(p.x,p.y,.38)){
      p={x:a.x,y:a.y,z:surfaceZXY(a.x,a.y)};
      if(isBlockedExterior(p.x,p.y,.38))continue;
    }
    const roll=rand();let item=table[Math.floor(rand()*8)];
    if(roll>.68&&roll<=.80)item='Pistol Ammo';
    else if(roll>.80&&roll<=.87)item='Rifle Ammo';
    else if(roll>.87&&roll<=.91)item='Pistol';
    else if(roll>.91&&roll<=.945)item='Axe';
    else if(roll>.945&&roll<=.975)item='Rifle';
    else if(roll>.975&&roll<=.992)item='Shotgun';
    else if(roll>.992)item='Hiking Backpack';
    spawnVisiblePickup(item,p.x,p.y,p.z,'exterior',hash(CELL+':loot:'+attempts));placed++;
  }
  return placed;
}
function spawnInteriorVisibleLoot(w,h,seedValue){
  const r=seeded(seedValue+301),count=3+Math.floor(r()*4);
  const items=['Bandage','Water','Batteries','Pistol Ammo','Rifle Ammo','Shotgun Shells','Pistol','First aid kit','Rifle','Shotgun','Hiking Backpack'];
  for(let i=0;i<count;i++){
    const x=(r()-.5)*w*.65,y=(r()-.5)*h*.55;
    if(isBlockedInterior(x,y))continue;
    const roll=r(),item=roll>.88?items[5+Math.floor(r()*3)]:items[Math.floor(r()*5)];
    spawnVisiblePickup(item,x,y,.04,'interior',seedValue+i*17);
  }
}
function pickupLoose(p){
  if(!p?.active)return;
  if(!addInventoryItem(p.item))return;
  p.active=false;p.root.parent?.remove(p.root);
  showToast('Picked up: '+p.item);awardXP(5,'loot');
  updateInventory();
}
function animatePickups(dt,now){
  for(const p of worldPickups){
    if(!p.active||!p.root?.parent)continue;
    p.root.rotation.z+=dt*.45;
    p.root.position.z=p.z+.03+Math.sin(now*.002+p.phase)*.055;
  }
}

function lootForContainer(type,seed){
  const r=seeded(seed+lootCount*131);
  const common={
    kitchen:['Water','Canned food','Energy bar','Batteries','Kitchen knife','Cloth'],
    dresser:['Cloth','Bandage','Work gloves','Flashlight','Batteries','Painkillers','Pistol Ammo'],
    medicine:['Bandage','Painkillers','First aid kit','Alcohol wipes','Water'],
    shelf:['Batteries','Scrap','Tool parts','Flashlight','Radio','Cloth','Pistol Ammo','Car battery','Spark plug'],
    fridge:['Water','Canned food','Energy drink','Food ration'],
    bed:['Bandage','Pocket knife','Cloth','Water','Flashlight'],
    picture:['Axe','Barbed Bat','Knife','Pistol','First aid kit','Batteries','Tool parts','Pistol Ammo','Rifle Ammo'],
    cabinet:['Water','Bandage','Batteries','Canned food','Tool parts','Pistol']
  };
  const source=common[type]||common.cabinet;
  const count=1+Math.floor(r()*3),out=[];
  for(let i=0;i<count;i++)out.push(source[Math.floor(r()*source.length)]);
  const rare=r();
  if(rare<.06)out.push('Large Duffel');
  else if(rare<.14)out.push('Hiking Backpack');
  // Rare tactical gear remains below one percent per search. Location is a
  // gameplay density proxy, not a claim of authoritative zoning.
  if(r()<.009)out.push(r()<.55?'Rifle':'Shotgun');
  if((type==='picture'||type==='bed')&&r()<.18){
    const loadouts=[
      ['Axe','Bandage','Water','Work gloves'],
      ['Barbed Bat','First aid kit','Energy bar','Flashlight'],
      ['Knife','Pistol','Batteries','Radio','Canned food'],
      ['Tool parts','Bandage','Water','Batteries'],
      ['First aid kit','Bandage','Painkillers','Water']
    ];
    out.push(...loadouts[Math.floor(r()*loadouts.length)]);
  }
  return out;
}
function makePrimitive(type,matColor=0x6c6256){
  const mat=new THREE.MeshStandardMaterial({color:matColor,roughness:.86});
  if(type==='bed'){
    const g=new THREE.Group();
    const base=new THREE.Mesh(new THREE.BoxGeometry(2.1,3.7,.38),mat);base.position.z=.28;
    const mattress=new THREE.Mesh(new THREE.BoxGeometry(1.95,3.45,.28),new THREE.MeshStandardMaterial({color:0xb8b1a3,roughness:.95}));mattress.position.z=.57;
    const pillow=new THREE.Mesh(new THREE.BoxGeometry(.8,.62,.18),new THREE.MeshStandardMaterial({color:0xd3d0c7,roughness:.94}));pillow.position.set(0,1.12,.80);
    const head=new THREE.Mesh(new THREE.BoxGeometry(2.15,.14,1.0),new THREE.MeshStandardMaterial({color:0x4b3829,roughness:.9}));head.position.set(0,1.79,.72);
    g.add(base,mattress,pillow,head);return g;
  }
  if(type==='dresser'){
    const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(1.55,.62,1.12),mat);body.position.z=.56;g.add(body);
    for(let z=.25;z<1;z+=.28){const h=new THREE.Mesh(new THREE.BoxGeometry(.7,.05,.07),new THREE.MeshStandardMaterial({color:0x2c2822,metalness:.22,roughness:.5}));h.position.set(0,-.34,z);g.add(h)}
    return g;
  }
  if(type==='cabinet'){
    const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(1.2,.55,1.0),mat);body.position.z=.5;g.add(body);
    const seam=new THREE.Mesh(new THREE.BoxGeometry(.035,.03,.82),new THREE.MeshStandardMaterial({color:0x26231f}));seam.position.set(0,-.295,.52);g.add(seam);return g;
  }
  if(type==='picture'){
    const g=new THREE.Group(),frame=new THREE.Mesh(new THREE.BoxGeometry(1.2,.07,.82),new THREE.MeshStandardMaterial({color:0x34291e,roughness:.75}));frame.position.z=.45;
    const art=new THREE.Mesh(new THREE.BoxGeometry(1.02,.075,.64),new THREE.MeshStandardMaterial({color:0x725c49,roughness:.88}));art.position.set(0,-.01,.45);g.add(frame,art);return g;
  }
  return new THREE.Group();
}
function placeInteriorTemplate(key,x,y,z,height,rot=0){
  const template=interiorTemplates[key];if(!template)return null;
  const obj=staticClone(template,height);if(!obj)return null;
  obj.position.set(x,y,z);obj.rotation.z=rot;interiorGroup.add(obj);return obj;
}
function addWallRect(cx,cy,sx,sy,height=2.8,color=0xc1beb2,collision=true){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,height),new THREE.MeshStandardMaterial({color,roughness:.92}));
  mesh.position.set(cx,cy,height/2);mesh.castShadow=true;mesh.receiveShadow=true;interiorGroup.add(mesh);
  if(collision)interiorWalls.push({minx:cx-sx/2,maxx:cx+sx/2,miny:cy-sy/2,maxy:cy+sy/2});
  return mesh;
}
function addWallWithDoor(axis,pos,start,end,doorCenter,gap=1.45){
  const a1=start,a2=doorCenter-gap/2,b1=doorCenter+gap/2,b2=end;
  if(a2>a1){if(axis==='h')addWallRect((a1+a2)/2,pos,a2-a1,.16);else addWallRect(pos,(a1+a2)/2,.16,a2-a1)}
  if(b2>b1){if(axis==='h')addWallRect((b1+b2)/2,pos,b2-b1,.16);else addWallRect(pos,(b1+b2)/2,.16,b2-b1)}
}
function createSearchSpot(label,x,y,type,seed,key){
  const spot={label,x,y,type,seed,key:key||String(seed),active:!interiorLootedKeys.has(key||String(seed))};
  interiorContainers.push(spot);return spot;
}
function clearInterior(){
  while(interiorGroup.children.length)interiorGroup.remove(interiorGroup.children[0]);
  worldPickups=worldPickups.filter(p=>p.mode!=='interior');
  interiorWalls=[];interiorContainers=[];interiorZombies=[];interiorFloorLinks=[];interiorBounds=null;interiorExit=null;
}
function makeFloorPortal(label,x,y,direction){
  const g=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color:0x4b5150,roughness:.64,metalness:.25});
  const glow=new THREE.MeshStandardMaterial({color:direction>0?0x64e594:0xe3b861,emissive:direction>0?0x2a7d4a:0x8a5420,emissiveIntensity:.9});
  const frame=new THREE.Mesh(new THREE.BoxGeometry(1.25,.12,2.35),mat);frame.position.z=1.18;
  const panel=new THREE.Mesh(new THREE.BoxGeometry(.82,.14,.22),glow);panel.position.set(0,-.08,1.45);
  const step1=new THREE.Mesh(new THREE.BoxGeometry(1.25,.8,.16),mat);step1.position.set(0,.35,.08);
  const step2=new THREE.Mesh(new THREE.BoxGeometry(1.05,.65,.16),mat);step2.position.set(0,.72,.24);
  g.add(frame,panel,step1,step2);g.position.set(x,y,0);interiorGroup.add(g);
  return g;
}
function generateInterior(entry,requestedFloor=1){
  clearInterior();
  const floors=Math.max(1,Math.floor(entry.height/3.05));
  const floorNumber=THREE.MathUtils.clamp(Math.round(requestedFloor||1),1,floors);
  const floorSeed=entry.seed+floorNumber*9973;
  const r=seeded(floorSeed),w=THREE.MathUtils.clamp(entry.width*1.15,13,25),h=THREE.MathUtils.clamp(entry.depth*1.15,11,22);
  interiorBounds={minx:-w/2+.42,maxx:w/2-.42,miny:-h/2+.42,maxy:h/2-.42};
  const floorMat=new THREE.MeshStandardMaterial({color:r()>.5?0x665647:0x5c5e57,roughness:.88});
  const floorMesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,.18),floorMat);floorMesh.position.z=-.09;floorMesh.receiveShadow=true;interiorGroup.add(floorMesh);
  const ceiling=new THREE.Mesh(new THREE.BoxGeometry(w,h,.12),new THREE.MeshStandardMaterial({color:0x77766f,roughness:.96,side:THREE.DoubleSide}));ceiling.position.z=2.95;interiorGroup.add(ceiling);
  addWallRect(0,h/2,w,.18);addWallRect(-w/2,0,.18,h);addWallRect(w/2,0,.18,h);
  addWallWithDoor('h',-h/2,-w/2,w/2,0,1.75);
  interiorExit={x:0,y:-h/2+.9};

  const layoutRoll=r(),layout=layoutRoll<.24?'Two-bedroom apartment':layoutRoll<.48?'Loft apartment':layoutRoll<.72?'Office conversion':layoutRoll<.9?'Hotel-style floor':'Penthouse floor';
  if(layout==='Two-bedroom apartment'){
    addWallWithDoor('v',-w*.13,-h*.10,h/2,h*.17,1.35);
    addWallWithDoor('h',h*.08,-w/2,-w*.13,-w*.30,1.25);
    addWallWithDoor('h',-h*.18,-w*.13,w/2,w*.24,1.25);
  }else if(layout==='Office conversion'){
    addWallWithDoor('h',0,-w/2,w/2,w*.18,1.45);
    addWallWithDoor('v',w*.18,0,h/2,h*.24,1.35);
    addWallWithDoor('v',-w*.24,0,h/2,h*.24,1.35);
  }else if(layout==='Hotel-style floor'){
    addWallWithDoor('h',h*.06,-w/2,w/2,-w*.18,1.35);
    addWallWithDoor('v',0,h*.06,h/2,h*.28,1.25);
    addWallWithDoor('v',w*.28,h*.06,h/2,h*.28,1.25);
    addWallWithDoor('v',-w*.28,h*.06,h/2,h*.28,1.25);
  }else if(layout==='Penthouse floor'){
    addWallWithDoor('v',w*.22,-h*.10,h/2,h*.20,1.55);
    addWallWithDoor('h',h*.18,-w/2,w*.22,-w*.15,1.45);
  }else addWallWithDoor('v',w*.27,-h*.02,h/2,h*.19,1.4);

  const warm=new THREE.PointLight(0xffd6a0,18,18,2);warm.position.set(-w*.2,-h*.1,2.25);interiorGroup.add(warm);
  const cool=new THREE.PointLight(0xbfd7ff,10,15,2);cool.position.set(w*.28,h*.20,2.2);interiorGroup.add(cool);

  const windowMat=new THREE.MeshStandardMaterial({color:0x314650,emissive:0x182d36,emissiveIntensity:.52,roughness:.2,metalness:.12});
  for(let x=-w/2+1.4;x<w/2-1;x+=2.2){const win=new THREE.Mesh(new THREE.BoxGeometry(1.25,.08,1.15),windowMat);win.position.set(x,h/2-.13,1.62);interiorGroup.add(win)}

  placeInteriorTemplate('couch',-w*.22,h*.18,.02,1.0,Math.PI/2);
  placeInteriorTemplate('table',-w*.03,h*.18,.02,.78,0);
  placeInteriorTemplate('chair',w*.11,h*.18,.02,1.05,-Math.PI/2);
  placeInteriorTemplate('plant',w*.38,h*.32,.02,1.25,0);
  placeInteriorTemplate('fridge',-w*.38,-h*.25,.02,1.85,0);
  placeInteriorTemplate('sink',-w*.20,-h*.31,.02,1.0,0);
  placeInteriorTemplate('oven',-w*.04,-h*.31,.02,1.0,0);
  placeInteriorTemplate('shelf',w*.39,-h*.15,.02,1.9,-Math.PI/2);
  placeInteriorTemplate('lamp',w*.22,h*.25,.02,1.35,0);
  placeInteriorTemplate('cabinet',-w*.31,-h*.06,.02,1.15,Math.PI/2);
  placeInteriorTemplate('cuttingTable',-w*.12,-h*.22,.02,1.05,0);
  placeInteriorTemplate('bench',w*.08,h*.36,.02,.92,0);
  placeInteriorTemplate('painting',-w*.18,h/2-.18,1.05,.85,0);
  placeInteriorTemplate('wallLight',w*.32,h/2-.16,1.55,.72,0);

  const bed=makePrimitive('bed');bed.position.set(w*.28,h*.25,.02);bed.rotation.z=Math.PI/2;interiorGroup.add(bed);
  const dresser=makePrimitive('dresser');dresser.position.set(w*.40,h*.02,.02);dresser.rotation.z=-Math.PI/2;interiorGroup.add(dresser);
  const cabinet=makePrimitive('cabinet');cabinet.position.set(-w*.34,-h*.36,.02);interiorGroup.add(cabinet);
  const picture=makePrimitive('picture');picture.position.set(w*.20,h/2-.22,1.15);interiorGroup.add(picture);

  const keyBase=entry.id+':F'+floorNumber+':';
  createSearchSpot('Search kitchen cabinet',-w*.34,-h*.36,'kitchen',floorSeed+11,keyBase+'kitchen');
  createSearchSpot('Search refrigerator',-w*.38,-h*.25,'fridge',floorSeed+23,keyBase+'fridge');
  createSearchSpot('Search dresser drawers',w*.40,h*.02,'dresser',floorSeed+37,keyBase+'dresser');
  createSearchSpot('Check under the bed',w*.28,h*.25,'bed',floorSeed+51,keyBase+'bed');
  createSearchSpot('Search shelf',w*.39,-h*.15,'shelf',floorSeed+67,keyBase+'shelf');
  createSearchSpot('Look behind the picture',w*.20,h/2-.85,'picture',floorSeed+79,keyBase+'picture');
  if(r()>.34)createSearchSpot('Search bathroom cabinet',w*.06,-h*.02,'medicine',floorSeed+91,keyBase+'medicine');
  if(r()>.42)createSearchSpot('Search closet',-w*.39,h*.12,'dresser',floorSeed+107,keyBase+'closet');

  const upX=w/2-1.45,upY=-h/2+1.65,downX=w/2-1.45,downY=-h/2+3.45;
  if(floorNumber<floors){
    makeFloorPortal('UP',upX,upY,1);
    interiorFloorLinks.push({kind:'floorUp',x:upX,y:upY,label:'GO UP · FLOOR '+(floorNumber+1),floor:floorNumber+1});
  }
  if(floorNumber>1){
    makeFloorPortal('DOWN',downX,downY,-1);
    interiorFloorLinks.push({kind:'floorDown',x:downX,y:downY,label:'GO DOWN · FLOOR '+(floorNumber-1),floor:floorNumber-1});
  }

  activeInterior={entry,width:w,depth:h,layout,floor:floorNumber,floors};
  spawnInteriorVisibleLoot(w,h,floorSeed);
  const zCount=floorNumber>1&&r()<.44?1:0;
  for(let i=0;i<zCount;i++)spawnInteriorZombie(zombieTemplates.length?zombieTemplates[Math.floor(r()*zombieTemplates.length)]:zombieTemplate,r,w,h);
}
function changeInteriorFloor(nextFloor){
  if(!interiorMode||!activeInterior)return;
  const entry=activeInterior.entry,floors=activeInterior.floors;
  nextFloor=THREE.MathUtils.clamp(Math.round(nextFloor),1,floors);
  if(nextFloor===activeInterior.floor)return;
  generateInterior(entry,nextFloor);
  playerRoot.position.set(0,-activeInterior.depth/2+2.15,.015);playerVelocity.set(0,0,0);
  $('worldTitle').textContent=activeInterior.layout+' · Floor '+activeInterior.floor+' / '+activeInterior.floors;
  loadText.textContent='Floor '+activeInterior.floor+' of '+activeInterior.floors+' · search rooms, visible loot and stashes.';
  showToast('Floor '+activeInterior.floor+' / '+activeInterior.floors);
}

function spawnInteriorZombie(template,r,w,h){
  spawnZombieAt(template,{x:(r()-.5)*w*.48,y:h*.28},true,r);
}
function enterInterior(entry){
  if(interiorMode||!playerRoot)return;
  exteriorReturn.set(
    Number.isFinite(entry.returnX)?entry.returnX:entry.entryX,
    Number.isFinite(entry.returnY)?entry.returnY:entry.entryY,
    (Number.isFinite(entry.returnZ)?entry.returnZ:entry.entryZ)+.05
  );exteriorYaw=yaw;generateInterior(entry,1);
  exteriorRoot.visible=false;interiorGroup.visible=true;interiorMode=true;playerVelocity.set(0,0,0);
  playerRoot.position.set(0,-activeInterior.depth/2+2.0,.05);yaw=0;pitch=.12;
  $('cellLabel').textContent='PROCEDURAL INTERIOR · GAME ART';
  $('worldTitle').textContent=activeInterior.layout+' · Floor '+activeInterior.floor+' / '+activeInterior.floors;
  loadText.textContent='Search furniture, drawers, cabinets and hidden stashes.';
  const mapLabel=document.querySelector('.mapLabel b');if(mapLabel)mapLabel.textContent='FLOOR PLAN';
  const mapSub=document.querySelector('.mapLabel span');if(mapSub)mapSub.textContent='search every room';
  updateZombieCount();
}
function exitInterior(){
  if(!interiorMode)return;
  interiorMode=false;interiorGroup.visible=false;exteriorRoot.visible=true;clearInterior();playerVelocity.set(0,0,0);playerRoot.position.copy(exteriorReturn);playerRoot.position.z=surfaceZXY(playerRoot.position.x,playerRoot.position.y)+.04;yaw=exteriorYaw;syncPhysicsToPlayer();
  $('cellLabel').textContent=worldCellLabel();
  $('worldTitle').textContent=worldCellTitle();
  loadText.textContent=(data.counts?.buildings||0).toLocaleString()+' source-backed buildings · enter marked doorways';
  const mapLabel=document.querySelector('.mapLabel b');if(mapLabel)mapLabel.textContent='EXPLORED';
  const mapSub=document.querySelector('.mapLabel span');if(mapSub)mapSub.textContent='fog clears as you travel';
  updateZombieCount();
}
function searchContainer(spot){
  if(!spot?.active)return;
  spot.active=false;interiorLootedKeys.add(spot.key);const items=lootForContainer(spot.type,spot.seed),added=[];
  for(const item of items)if(addInventoryItem(item))added.push(item);
  updateInventory();if(added.length)awardXP(8+added.length*2,'search');showToast(added.length?'Found: '+added.join(' · '):'Nothing useful here');
}
function findNearestInteraction(){
  if(!playerRoot||playerDead)return null;
  if(activeVehicle)return{kind:'vehicleExit',label:'EXIT '+activeVehicle.type.toUpperCase()};
  let best=null,bestD=Infinity;
  if(!interiorMode){
    const v=nearestDrivable();if(v){
      const ready=vehicleReady(v);
      best={kind:ready?'vehicle':'vehicleRepair',label:ready?'DRIVE '+v.type.toUpperCase():'REPAIR '+v.type.toUpperCase()+' · '+v.requiredParts.filter(p=>!v.installedParts.includes(p)).join(' + '),vehicle:v};
      bestD=Math.hypot(v.root.position.x-playerRoot.position.x,v.root.position.y-playerRoot.position.y);
    }
  }
  for(const p of worldPickups){
    if(!p.active||p.mode!==(interiorMode?'interior':'exterior'))continue;
    const d=Math.hypot(playerRoot.position.x-p.root.position.x,playerRoot.position.y-p.root.position.y);
    if(d<2.7&&d<bestD){best={kind:'pickup',label:'PICK UP '+p.item.toUpperCase(),pickup:p};bestD=d}
  }
  if(interiorMode){
    if(interiorExit){const d=Math.hypot(playerRoot.position.x-interiorExit.x,playerRoot.position.y-interiorExit.y);if(d<2.05){best={kind:'exit',label:'EXIT BUILDING'};bestD=d}}
    for(const link of interiorFloorLinks){const d=Math.hypot(playerRoot.position.x-link.x,playerRoot.position.y-link.y);if(d<2.15&&d<bestD){best={kind:link.kind,label:link.label,floor:link.floor};bestD=d}}
    for(const c of interiorContainers)if(c.active){const d=Math.hypot(playerRoot.position.x-c.x,playerRoot.position.y-c.y);if(d<2.05&&d<bestD){best={kind:'loot',label:c.label,spot:c};bestD=d}}
  }else{
    for(const e of buildingEntries){const d=Math.hypot(playerRoot.position.x-e.entryX,playerRoot.position.y-e.entryY);if(d<2.4&&d<bestD){best={kind:e.doorPivot&&!e.doorOpen?'door':'entry',label:e.doorPivot&&!e.doorOpen?'OPEN DOOR':'ENTER BUILDING',entry:e};bestD=d}}
  }
  return best;
}
function interact(){
  const hit=findNearestInteraction();if(!hit)return;
  if(hit.kind==='vehicleExit')exitVehicle();
  else if(hit.kind==='vehicle')enterVehicle(hit.vehicle);
  else if(hit.kind==='vehicleRepair')repairVehicle(hit.vehicle);
  else if(hit.kind==='door')openDoor(hit.entry,false);
  else if(hit.kind==='pickup')pickupLoose(hit.pickup);
  else if(hit.kind==='floorUp'||hit.kind==='floorDown')changeInteriorFloor(hit.floor);
  else if(hit.kind==='entry')enterInterior(hit.entry);
  else if(hit.kind==='exit')exitInterior();
  else if(hit.kind==='loot')searchContainer(hit.spot);
}
function updateInteractionPrompt(){
  nearestInteract=findNearestInteraction();$('interactPrompt').hidden=!nearestInteract;if(nearestInteract)$('interactLabel').textContent=nearestInteract.label;
}
function dropFromZombie(z,mode){
  if(rand()>.38)return;
  const pool=['Bandage','Water','Batteries','Canned food','Pistol'];
  const item=pool[Math.floor(rand()*pool.length)];
  spawnVisiblePickup(item,z.root.position.x,z.root.position.y,z.root.position.z,mode,hash('zdrop:'+kills+':'+item));
}
function killZombie(z,mode){
  if(!z||z.dead)return;
  z.dead=true;kills++;awardXP(25,'infected');dropFromZombie(z,mode);
  z.root.parent?.remove(z.root);
  updateInventory();updateZombieCount();
}
function damagePlayer(amount){
  if(playerDead)return;
  health=Math.max(0,health-amount);$('healthStat').textContent=String(health);
  if(health<=0)killPlayer();
}
function killPlayer(){
  if(playerDead)return;
  playerDead=true;livesRemaining=Math.max(0,livesRemaining-1);playerVelocity.set(0,0,0);mobileMove={x:0,y:0};mobileSprint=false;persistSurvivor();
  const livesEl=$('livesStat');if(livesEl)livesEl.textContent=String(livesRemaining);
  if(livesRemaining<=0){enterSpectator();return}
  const box=$('deathBox');if(box)box.hidden=false;
  const t=$('deathText');if(t)t.textContent='Wave '+Math.max(1,waveNumber)+' overwhelmed you · '+kills+' infected eliminated · '+livesRemaining+' lives remain.';
  showToast('You were overrun');
}
function enterSpectator(){
  spectatorMode=true;playerDead=true;if(playerRoot)playerRoot.visible=false;
  const box=$('deathBox');if(box)box.hidden=false;const t=$('deathText');if(t)t.textContent='No lives remain · live spectator camera active.';
  const btn=$('respawnBtn');if(btn)btn.hidden=true;showToast('Spectator mode');
}
function updateSpectator(now){
  if(!spectatorMode)return;const targets=[...zombies.filter(z=>!z.dead).map(z=>z.root),...drivableVehicles.map(v=>v.root)].filter(Boolean);if(!targets.length)return;
  if(now-lastSpectatorSwitch>6500){lastSpectatorSwitch=now;spectatorIndex=(spectatorIndex+1)%targets.length}
  const t=targets[spectatorIndex%targets.length],target=t.position.clone().add(new THREE.Vector3(0,0,1.1)),desired=target.clone().add(new THREE.Vector3(5,-6,3.2));
  camera.position.lerp(desired,.08);camera.lookAt(target);
}
function clearOutdoorZombies(){
  for(const z of zombies)z.root?.parent?.remove(z.root);
  zombies=[];
}
function respawnPlayer(){
  if(!playerRoot||livesRemaining<=0)return;
  if(interiorMode){
    interiorMode=false;interiorGroup.visible=false;exteriorRoot.visible=true;clearInterior();
  }
  clearOutdoorZombies();
  health=100;playerDead=false;$('healthStat').textContent='100';
  const box=$('deathBox');if(box)box.hidden=true;
  const spawn=nearestRoadToCenter();playerSpawn.set(spawn.x,spawn.y,surfaceZXY(spawn.x,spawn.y)+.015);
  playerRoot.position.copy(playerSpawn);playerRoot.visible=true;playerVelocity.set(0,0,0);
  if(physicsReady){if(!playerPhysicsBody)createPlayerPhysics();else syncPhysicsToPlayer()}
  yaw=0;pitch=.14;waveNumber=0;nextWaveAt=0;
  if(zombieTemplate)spawnZombieWave(performance.now(),true);
  showToast('Respawned');
}
function shotDirection(cfg){
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);
  const spreadDeg=Number(cfg?.spread_deg||0)*(aiming?.42:1);
  if(spreadDeg>0){
    const right=new THREE.Vector3().crossVectors(dir,camera.up).normalize();
    const up=new THREE.Vector3().crossVectors(right,dir).normalize();
    const spread=Math.tan(THREE.MathUtils.degToRad(spreadDeg));
    const a=(Math.random()*2-1)*spread,b=(Math.random()*2-1)*spread;
    dir.addScaledVector(right,a).addScaledVector(up,b).normalize();
  }
  return dir;
}
function gunRaycast(cfg){
  const origin=camera.position.clone(),dir=shotDirection(cfg),range=Math.max(2,Number(cfg?.range_m||60));
  weaponRaycaster.near=.10;weaponRaycaster.far=range;weaponRaycaster.set(origin,dir);
  const list=(interiorMode?interiorZombies:zombies).filter(z=>!z.dead);
  const targetRoots=list.map(z=>z.root);
  const blockers=interiorMode
    ?interiorGroup.children.filter(x=>!targetRoots.includes(x))
    :[buildingLayer,partsLayer].filter(Boolean);
  const hits=weaponRaycaster.intersectObjects([...targetRoots,...blockers],true);
  for(const h of hits){
    let o=h.object,z=null;
    while(o){if(o.userData?.zombieRef){z=o.userData.zombieRef;break}o=o.parent}
    if(z&&!z.dead)return{z,target:h.point.clone(),dist:h.distance,origin,dir,blocked:false};
    if(h.object?.isMesh)return{z:null,target:h.point.clone(),dist:h.distance,origin,dir,blocked:true};
  }
  return{z:null,target:origin.clone().addScaledVector(dir,range),dist:range,origin,dir,blocked:false};
}
function tracer(from,to,hit=false){
  const g=new THREE.BufferGeometry().setFromPoints([from,to]);
  const m=new THREE.LineBasicMaterial({color:hit?0xffd98a:0xf1efe5,transparent:true,opacity:.9});
  const line=new THREE.Line(g,m);scene.add(line);
  const light=new THREE.PointLight(0xffc06c,5,4,2);light.position.copy(from);scene.add(light);
  setTimeout(()=>{scene.remove(line,light);g.dispose();m.dispose()},75);
}
function cancelReload(announce=true){
  if(!reloadState.active)return;
  reloadState={active:false,weapon:null,startedAt:0,endsAt:0};
  if(announce)showToast('Reload cancelled');
  updateInventory();
}
function requestReload(){
  if(playerDead||!isFirearm(activeWeapon))return false;
  const cfg=weaponCfg(activeWeapon),mag=Math.max(1,Number(cfg.magazine_size||0));
  const current=Number(ammoState[activeWeapon]||0),reserve=Number(reserveAmmo[activeWeapon]||0);
  if(reloadState.active)return false;
  if(current>=mag){showToast(activeWeapon+' magazine full');return false}
  if(reserve<=0){showToast('No '+activeWeapon+' reserve ammo');return false}
  const now=performance.now(),seconds=Math.max(.35,Number(cfg.reload_time_seconds||1.5));
  reloadState={active:true,weapon:activeWeapon,startedAt:now,endsAt:now+seconds*1000};
  fireCooldown=Math.max(fireCooldown,seconds);
  playPlayerAnimation('reload');updateInventory();
  showToast('Reloading '+activeWeapon+' · '+seconds.toFixed(1)+'s');
  return true;
}
function updateReload(now=performance.now()){
  if(!reloadState.active||now<reloadState.endsAt)return;
  const weapon=reloadState.weapon,cfg=weaponCfg(weapon),mag=Math.max(1,Number(cfg.magazine_size||0));
  const current=Number(ammoState[weapon]||0),reserve=Number(reserveAmmo[weapon]||0),need=Math.max(0,mag-current),take=Math.min(need,reserve);
  ammoState[weapon]=current+take;reserveAmmo[weapon]=reserve-take;
  reloadState={active:false,weapon:null,startedAt:0,endsAt:0};
  showToast(weapon+' ready · '+ammoState[weapon]+'/'+reserveAmmo[weapon]);updateInventory();
}
function applyRecoil(cfg){
  const pitchDeg=Number(cfg?.recoil_pitch_deg||0)*(aiming?.66:1);
  const yawDeg=Number(cfg?.recoil_yaw_deg||0)*(aiming?.62:1);
  recoilPitch=Math.min(THREE.MathUtils.degToRad(9),recoilPitch+THREE.MathUtils.degToRad(pitchDeg));
  recoilYaw=THREE.MathUtils.clamp(recoilYaw+THREE.MathUtils.degToRad((Math.random()*2-1)*yawDeg),-.09,.09);
}
function shoot(){
  if(playerDead||fireCooldown>0||!isFirearm(activeWeapon)||reloadState.active)return;
  const cfg=weaponCfg(activeWeapon),ammo=Number(ammoState[activeWeapon]||0);
  if(ammo<=0){requestReload();return}
  ammoState[activeWeapon]=ammo-1;ensureAudio();gunshotAudio(playerRoot.position,activeWeapon);
  fireCooldown=Math.max(.08,Number(cfg.fire_interval_seconds||.3));
  const hit=gunRaycast(cfg);
  tracer(hit.origin,hit.target,Boolean(hit.z));
  if(hit.z){
    let damage=Number(cfg.damage||50);
    if(activeWeapon==='Shotgun')damage=Math.max(damage*.38,damage-hit.dist*1.8);
    hit.z.hp-=damage;
    if(hit.z.hp<=0)killZombie(hit.z,interiorMode?'interior':'exterior');
  }
  applyRecoil(cfg);muzzleFlash=.08;updateInventory();
  if((ammoState[activeWeapon]||0)<=0&&(reserveAmmo[activeWeapon]||0)>0)setTimeout(()=>{if(activeWeapon===cfg.weapon_name)requestReload()},180);
}
function attack(){
  if(attackCooldown>0||!playerRoot||playerDead||reloadState.active)return;
  const cfg=weaponCfg(activeWeapon);
  attackCooldown=Math.max(.22,Number(cfg.fire_interval_seconds||.48));swingTime=Math.min(.55,attackCooldown);playPlayerAnimation('attack');
  const targets=interiorMode?interiorZombies:zombies,fx=Math.sin(yaw),fy=Math.cos(yaw);let hit=false;
  const range=Math.max(1.4,Number(cfg.range_m||2.4));
  for(const z of targets){
    if(z.dead)continue;
    const dx=z.root.position.x-playerRoot.position.x,dy=z.root.position.y-playerRoot.position.y,dist=Math.hypot(dx,dy);
    if(dist>range)continue;
    const dot=(dx*fx+dy*fy)/Math.max(dist,.001);if(dot<-.05)continue;
    z.hp-=Number(cfg.damage||50);hit=true;
    if(z.hp<=0)killZombie(z,interiorMode?'interior':'exterior');
  }
  if(hit)showToast(activeWeapon+' connected');
}
function useActiveWeapon(){
  if(activeVehicle){showToast('Exit vehicle to use weapons');return}
  if(isFirearm(activeWeapon))shoot();else attack();
}

function updateZombieCount(){
  const list=interiorMode?interiorZombies:zombies;$('zombieStat').textContent=String(list.filter(z=>!z.dead).length);
}
function updateWeapon(dt,now=performance.now()){
  attackCooldown=Math.max(0,attackCooldown-dt);
  fireCooldown=Math.max(0,fireCooldown-dt);
  muzzleFlash=Math.max(0,muzzleFlash-dt);
  updateReload(now);
  const cfg=weaponCfg(activeWeapon);
  if(isFirearm(activeWeapon)&&cfg.fire_mode==='auto'&&(fireHeld||keys.has('KeyF'))&&!reloadState.active&&fireCooldown<=0)shoot();
  const recover=1-Math.exp(-8.5*dt);
  recoilPitch=THREE.MathUtils.lerp(recoilPitch,0,recover);
  recoilYaw=THREE.MathUtils.lerp(recoilYaw,0,recover);
  if(!weaponPivot)return;
  if(isFirearm(activeWeapon)){weaponPivot.rotation.set(0,0,0);return}
  if(swingTime>0){
    const total=Math.max(.22,Math.min(.55,Number(weaponCfg(activeWeapon).fire_interval_seconds||.48))),t=1-swingTime/total;
    swingTime=Math.max(0,swingTime-dt);
    weaponPivot.rotation.z=-Math.sin(t*Math.PI)*.75;weaponPivot.rotation.x=Math.sin(t*Math.PI)*.24;
  }else weaponPivot.rotation.set(0,0,0);
}

function spawnZombieAt(template,a,interior=false,rng=rand){
  if(!template)return null;
  const n=normalizedModel(template.scene,1.78,true);
  const root=n.root;
  if(interior)root.position.set(a.x,a.y,.015);
  else root.position.set(a.x,a.y,surfaceZXY(a.x,a.y)+.015);
  root.rotation.z=rng()*Math.PI*2;
  (interior?interiorGroup:zombieGroup).add(root);
  const clips=sanitizeCharacterClips(template.animations);
  const clip=clips.find(c=>/walk/i.test(c.name))||clips.find(c=>/idle/i.test(c.name))||clips[0];
  let mixer=null;if(clip){mixer=new THREE.AnimationMixer(n.model);mixer.clipAction(clip).play()}
  const z={root,mixer,speed:.28+rng()*.15,hp:100,dead:false,steer:rng()>.5?1:-1,lastTurn:0,state:'stalk',path:[],pathIndex:0,nextPathAt:0};
  root.userData.zombieRef=z;
  root.traverse(o=>{o.userData.zombieRef=z});
  (interior?interiorZombies:zombies).push(z);return z;
}
function spawnZombieWave(now=performance.now(),force=false){
  if(!zombieTemplate||!roadAnchors.length||playerDead||interiorMode)return 0;
  const active=zombies.filter(z=>!z.dead).length;
  if(!force&&(now<nextWaveAt||active>=maxActiveZombies))return 0;
  const desired=Math.min(maxActiveZombies-active,3+(waveNumber%3));
  if(desired<=0)return 0;
  const origin=playerRoot?.position||playerSpawn;
  let candidates=roadAnchors.filter(a=>{
    const d=Math.hypot(a.x-origin.x,a.y-origin.y);
    return d>55&&d<185&&!isBlockedExterior(a.x,a.y,.55);
  });
  if(!candidates.length)candidates=roadAnchors.filter(a=>!isBlockedExterior(a.x,a.y,.55));
  let made=0;
  for(let i=0;i<desired&&candidates.length;i++){
    const a=candidates[Math.floor(rand()*candidates.length)];
    const variant=zombieTemplates.length?zombieTemplates[Math.floor(rand()*zombieTemplates.length)]:zombieTemplate;
    if(spawnZombieAt(variant,a,false))made++;
  }
  if(made){waveNumber++;showToast('Infected wave '+waveNumber+' approaching · '+made)}
  nextWaveAt=now+19000+rand()*9000;
  updateZombieCount();return made;
}
async function buildZombies(template){
  zombieTemplate=template;
  clearOutdoorZombies();waveNumber=0;nextWaveAt=0;
  spawnZombieWave(performance.now(),true);
}
function isBlockedInterior(x,y){
  const r=.34;if(!interiorBounds)return false;
  if(x-r<interiorBounds.minx||x+r>interiorBounds.maxx||y-r<interiorBounds.miny||y+r>interiorBounds.maxy)return true;
  for(const w of interiorWalls)if(x+r>w.minx&&x-r<w.maxx&&y+r>w.miny&&y-r<w.maxy)return true;
  return false;
}
function isBlockedExterior(x,y,r=.33){
  for(const b of buildingCenters){
    if(x<b.minx-r||x>b.maxx+r||y<b.miny-r||y>b.maxy+r)continue;
    if(polyBlocksPoint(x,y,b.poly,r))return true;
  }
  return false;
}
function moveZombieToward(z,tx,ty,dt,interior,now){
  let targetX=tx,targetY=ty;
  const rawDist=Math.hypot(tx-z.root.position.x,ty-z.root.position.y);
  if(!interior&&rawDist>9&&navNodes.length){
    if(now>=z.nextPathAt||!z.path?.length||z.pathIndex>=z.path.length){
      z.path=findNavPath(z.root.position.x,z.root.position.y,tx,ty);z.pathIndex=0;z.nextPathAt=now+1700+rand()*900;
    }
    const wp=z.path?.[z.pathIndex];
    if(wp){
      targetX=wp.x;targetY=wp.y;
      if(Math.hypot(targetX-z.root.position.x,targetY-z.root.position.y)<1.2)z.pathIndex++;
    }
  }
  const dx=targetX-z.root.position.x,dy=targetY-z.root.position.y,dist=Math.hypot(dx,dy)||.001;
  const vx=dx/dist,vy=dy/dist,step=z.speed*dt;
  let nx=z.root.position.x+vx*step,ny=z.root.position.y+vy*step;
  const blocked=(x,y)=>interior?isBlockedInterior(x,y):isBlockedExterior(x,y,.30);
  if(!blocked(nx,ny)){
    z.root.position.x=nx;z.root.position.y=ny;
  }else{
    const sx=-vy*z.steer,sy=vx*z.steer;
    nx=z.root.position.x+(vx*.18+sx*.98)*step;ny=z.root.position.y+(vy*.18+sy*.98)*step;
    if(!blocked(nx,ny)){z.root.position.x=nx;z.root.position.y=ny}else{z.steer*=-1;z.nextPathAt=0}
  }
  z.root.position.z=interior?.015:surfaceZXY(z.root.position.x,z.root.position.y)+.015;
  z.root.rotation.z=Math.atan2(vx,vy);
  z.state=rawDist<1.35?'attack':rawDist<22?'chase':'stalk';
  return rawDist;
}
function updateZombieWaves(now){
  if(!interiorMode&&!playerDead){
    const active=zombies.filter(z=>!z.dead).length;
    if(active<=1&&now+5000<nextWaveAt)nextWaveAt=now+5000;
    spawnZombieWave(now,false);
  }
}
function updateZombies(dt,now){
  if(!playerRoot||playerDead)return;
  const list=interiorMode?interiorZombies:zombies;
  for(const z of list){
    if(z.dead)continue;z.mixer?.update(dt);
    const dist=moveZombieToward(z,playerRoot.position.x,playerRoot.position.y,dt,interiorMode,now);
    if(dist<38&&audioCtx&&now>(z.nextGroan||0)){z.nextGroan=now+3200+rand()*4200;spatialTone(z.root.position,'groan')}
    if(dist<1.28&&now-lastDamageAt>1050){
      damagePlayer(8);lastDamageAt=now;
      if(!playerDead)showToast('Infected hit · '+health+' health');
    }
  }
  updateZombieCount();
}

async function buildSurvivalArt(){
  const [
    barrel,trash,pallet,barrier,cone,streetlight,hydrant,traffic1,traffic2,plasticBarrier,cinder,
    containerGreen,containerRed,pipes,wheelStack,townSign,pickup,sports,truck,zombie,zombieChubby,zombieRibcage,chest,chestSpecial,...interiors
  ]=await Promise.all([
    loadAsset(ASSETS.barrel),loadAsset(ASSETS.trash),loadAsset(ASSETS.pallet),loadAsset(ASSETS.barrier),
    loadAsset(ASSETS.cone),loadAsset(ASSETS.streetlight),loadAsset(ASSETS.hydrant),
    loadAsset(ASSETS.traffic1),loadAsset(ASSETS.traffic2),loadAsset(ASSETS.plasticBarrier),loadAsset(ASSETS.cinder),
    loadAsset(ASSETS.containerGreen),loadAsset(ASSETS.containerRed),loadAsset(ASSETS.pipes),loadAsset(ASSETS.wheelStack),loadAsset(ASSETS.townSign),
    loadAsset(ASSETS.vehicle),loadAsset(ASSETS.sportsCar),loadAsset(ASSETS.truck),
    loadAsset(ASSETS.zombie),loadAsset(ASSETS.zombieChubby),loadAsset(ASSETS.zombieRibcage),
    loadAsset(ASSETS.chest),loadAsset(ASSETS.chestSpecial),
    ...Object.values(INTERIOR_ASSETS).map(loadAsset)
  ]);
  const keys=Object.keys(INTERIOR_ASSETS);interiorTemplates={};keys.forEach((k,i)=>interiorTemplates[k]=interiors[i]);
  pickupTemplates={chest,chestSpecial};
  zombieTemplates=[zombie,zombieChubby,zombieRibcage].filter(Boolean);
  zombieTemplate=zombieTemplates[0]||zombie;

  const dense=densePreview();
  let props=0,vehicles=0;
  props+=scatterRoadsideTemplate(streetlight,dense?132:52,4.8,'sidewalk')||0;
  props+=scatterRoadsideTemplate(hydrant,dense?66:26,.95,'sidewalk')||0;
  props+=scatterRoadsideTemplate(traffic1,dense?36:12,3.4,'sidewalk')||0;
  props+=scatterRoadsideTemplate(traffic2,dense?28:10,3.4,'sidewalk')||0;
  props+=scatterRoadsideTemplate(barrier,dense?54:22,1.1,'sidewalk')||0;
  props+=scatterRoadsideTemplate(plasticBarrier,dense?44:18,.95,'sidewalk')||0;
  props+=scatterRoadsideTemplate(cone,dense?82:30,.75,'sidewalk')||0;
  props+=scatterRoadsideTemplate(trash,dense?92:38,.72,'sidewalk')||0;
  props+=scatterRoadsideTemplate(pallet,dense?34:16,.32,'sidewalk')||0;
  props+=scatterRoadsideTemplate(barrel,dense?46:20,1.15,'sidewalk')||0;
  props+=scatterRoadsideTemplate(cinder,dense?60:20,.28,'sidewalk')||0;
  props+=scatterRoadsideTemplate(pipes,dense?20:8,.70,'sidewalk')||0;
  props+=scatterRoadsideTemplate(wheelStack,dense?28:10,.75,'sidewalk')||0;
  props+=scatterRoadsideTemplate(townSign,dense?18:8,1.8,'sidewalk')||0;
  props+=scatterRoadsideTemplate(containerGreen,dense?12:4,2.5,'sidewalk')||0;
  props+=scatterRoadsideTemplate(containerRed,dense?12:4,2.5,'sidewalk')||0;

  vehicles+=scatterRoadsideTemplate(pickup,dense?36:12,1.72,'parking')||0;
  vehicles+=scatterRoadsideTemplate(sports,dense?34:10,1.35,'parking')||0;
  vehicles+=scatterRoadsideTemplate(truck,dense?18:7,2.25,'parking')||0;

  let localProps=0,localVehicles=0;
  localProps+=scatterRoadsideTemplateLocal(streetlight,dense?42:20,4.8,'sidewalk')||0;
  localProps+=scatterRoadsideTemplateLocal(hydrant,dense?20:10,.95,'sidewalk')||0;
  localProps+=scatterRoadsideTemplateLocal(trash,dense?30:16,.72,'sidewalk')||0;
  localProps+=scatterRoadsideTemplateLocal(cone,dense?24:12,.75,'sidewalk')||0;
  localProps+=scatterRoadsideTemplateLocal(barrier,dense?18:8,1.1,'sidewalk')||0;
  localVehicles+=scatterRoadsideTemplateLocal(pickup,dense?12:6,1.72,'parking')||0;
  localVehicles+=scatterRoadsideTemplateLocal(sports,dense?14:5,1.35,'parking')||0;
  localVehicles+=scatterRoadsideTemplateLocal(truck,dense?6:3,2.25,'parking')||0;

  const life=scatterProceduralStreetLife();
  const localLife=scatterLocalProceduralLife();
  const furniture=scatterStreetFurniture();
  const grass=buildGrassDetails();
  const denseVeg=buildDenseVegetation();
  const drivable=
    spawnDrivableVehicle(pickup,'pickup',dense?5:3,1.72)+
    spawnDrivableVehicle(sports,'sports',dense?5:2,1.35)+
    spawnDrivableVehicle(truck,'truck',dense?3:2,2.25)+
    spawnDrivableBike(dense?5:3);
  streetLifeStats={
    ...streetLifeStats,
    trees:life.trees+localLife.trees+denseVeg.trees,
    backgroundTrees:denseVeg.trees,
    shrubs:denseVeg.shrubs,
    bikes:life.bikes+localLife.bikes,
    vehicles:vehicles+localVehicles+drivable,
    drivable,
    props:props+localProps,
    grass,
    benches:furniture.benches+localLife.benches,
    planters:furniture.planters+localLife.planters
  };

  spawnOutdoorLoot();
  await buildZombies(zombieTemplate);
}
function toMapXY(x,y){
  const west=project([data.bbox.west,lat0]).x,east=project([data.bbox.east,lat0]).x;
  const south=project([lon0,data.bbox.south]).y,north=project([lon0,data.bbox.north]).y;
  return{x:(x-west)/(east-west)*mapBase.width,y:mapBase.height-(y-south)/(north-south)*mapBase.height};
}
function drawMinimapBase(){
  baseCtx.fillStyle='#435444';baseCtx.fillRect(0,0,mapBase.width,mapBase.height);
  baseCtx.lineCap='round';
  for(const f of data.transport||[]){
    baseCtx.strokeStyle=f.kind==='RAIL'?'#2b2c2b':f.kind==='ROAD_PRIMARY'?'#a39f8e':'#74776f';baseCtx.lineWidth=f.kind==='ROAD_PRIMARY'?3:f.kind==='ROAD_SECONDARY'?2:1;
    for(const line of lineFeatures(f.geometry)){baseCtx.beginPath();let first=true;for(const p of line){const q=project(p),m=toMapXY(q.x,q.y);if(first){baseCtx.moveTo(m.x,m.y);first=false}else baseCtx.lineTo(m.x,m.y)}baseCtx.stroke()}
  }
  baseCtx.fillStyle='#b2aea0';
  for(const row of data.buildings||[])for(const ring of outerRings(row.geometry)){baseCtx.beginPath();let first=true;for(const p of ring){const q=project(p),m=toMapXY(q.x,q.y);if(first){baseCtx.moveTo(m.x,m.y);first=false}else baseCtx.lineTo(m.x,m.y)}baseCtx.closePath();baseCtx.fill()}
  fogCtx.globalCompositeOperation='source-over';fogCtx.fillStyle='#696d68';fogCtx.fillRect(0,0,mapFog.width,mapFog.height);
  loadExploration();
}
function revealMap(x,y,save=true){
  const m=toMapXY(x,y);fogCtx.globalCompositeOperation='destination-out';
  const radius=densePreview()?13:15,gr=fogCtx.createRadialGradient(m.x,m.y,2,m.x,m.y,radius);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.72,'rgba(0,0,0,.96)');gr.addColorStop(1,'rgba(0,0,0,0)');
  fogCtx.fillStyle=gr;fogCtx.beginPath();fogCtx.arc(m.x,m.y,radius,0,Math.PI*2);fogCtx.fill();
  if(save){
    exploredPoints.push([Math.round(x),Math.round(y)]);if(exploredPoints.length>500)exploredPoints.shift();
    try{localStorage.setItem('horizon-explore-'+CELL,JSON.stringify(exploredPoints))}catch(_){}
  }
}
function loadExploration(){
  try{const a=JSON.parse(localStorage.getItem('horizon-explore-'+CELL)||'[]');if(Array.isArray(a)){exploredPoints=a.slice(-500);for(const p of exploredPoints)revealMap(+p[0],+p[1],false)}}catch(_){}
}
function renderMinimap(){
  if(!playerRoot)return;
  mapCtx.clearRect(0,0,minimap.width,minimap.height);
  if(interiorMode&&activeInterior){
    mapCtx.fillStyle='#5f625e';mapCtx.fillRect(0,0,minimap.width,minimap.height);
    const sx=minimap.width/activeInterior.width,sy=minimap.height/activeInterior.depth;
    mapCtx.fillStyle='#30332f';
    for(const w of interiorWalls){
      const x=(w.minx+activeInterior.width/2)*sx,y=minimap.height-(w.maxy+activeInterior.depth/2)*sy;
      mapCtx.fillRect(x,y,Math.max(2,(w.maxx-w.minx)*sx),Math.max(2,(w.maxy-w.miny)*sy));
    }
    const px=(playerRoot.position.x+activeInterior.width/2)*sx,py=minimap.height-(playerRoot.position.y+activeInterior.depth/2)*sy;
    mapCtx.save();mapCtx.translate(px,py);mapCtx.rotate(-yaw);mapCtx.fillStyle='#8effb5';mapCtx.beginPath();mapCtx.moveTo(0,-7);mapCtx.lineTo(5,6);mapCtx.lineTo(-5,6);mapCtx.closePath();mapCtx.fill();mapCtx.restore();
    return;
  }
  mapCtx.drawImage(mapBase,0,0);mapCtx.drawImage(mapFog,0,0);
  const p=toMapXY(playerRoot.position.x,playerRoot.position.y);
  mapCtx.save();mapCtx.translate(p.x,p.y);mapCtx.rotate(-yaw);mapCtx.fillStyle='#8effb5';mapCtx.beginPath();mapCtx.moveTo(0,-7);mapCtx.lineTo(5,6);mapCtx.lineTo(-5,6);mapCtx.closePath();mapCtx.fill();mapCtx.restore();
}

function setAiming(v){
  aiming=Boolean(v)&&isFirearm(activeWeapon)&&!playerDead;
  updateInventory();
}
function pollGamepad(){
  const pads=navigator.getGamepads?.()||[],p=[...pads].find(Boolean);
  if(!p){gamepadMove.x=gamepadMove.y=gamepadLook.x=gamepadLook.y=0;return}
  const dead=v=>Math.abs(v)<.14?0:v;
  gamepadMove.x=dead(p.axes?.[0]||0);gamepadMove.y=-dead(p.axes?.[1]||0);
  gamepadLook.x=dead(p.axes?.[2]||0);gamepadLook.y=dead(p.axes?.[3]||0);
  const pressed=i=>Boolean(p.buttons?.[i]?.pressed),edge=i=>pressed(i)&&!gamepadPrev[i];
  if(edge(0))playerJumpQueued=true;
  if(edge(1))cycleStance();
  if(edge(2))interact();
  if(edge(3))cycleWeapon();
  if(edge(5))useActiveWeapon();
  fireHeld=pressed(5);
  if(edge(9)&&isFirearm(activeWeapon))requestReload();
  if(edge(4))setAiming(!aiming);
  mobileSprint=pressed(10)||pressed(7);
  gamepadPrev=(p.buttons||[]).map(b=>Boolean(b.pressed));
}
function initInput(){
  addEventListener('pointerdown',ensureAudio,{once:true});addEventListener('keydown',ensureAudio,{once:true});
  addEventListener('keydown',e=>{
    keys.add(e.code);
    if(e.code==='KeyE')interact();
    if(e.code==='KeyF'){e.preventDefault();fireHeld=true;useActiveWeapon()}
    if(e.code==='Space'){e.preventDefault();if(!tryHurdle())playerJumpQueued=true}
    if(e.code==='KeyC')cycleStance();
    if(e.code==='KeyZ')startSlide();
    if(e.code==='KeyV')setLean(-1);
    if(e.code==='KeyB')setLean(1);
    if(e.code==='KeyK')kickNearestDoor();
    if(e.code==='KeyT')toggleFlashlight();
    if(e.code==='KeyM')cycleMatchMode();
    if(e.code==='KeyG')claimNearestBase();
    if(e.code==='KeyX')setPlayerStance('prone');
    if(e.code==='KeyQ')cycleWeapon();
    if(e.code==='Digit1')selectSlot('melee');
    if(e.code==='Digit2')selectSlot('sidearm');
    if(e.code==='Digit3')selectSlot('primary');
    if(e.code==='KeyR'&&isFirearm(activeWeapon)){e.preventDefault();requestReload()}
  });
  addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyF')fireHeld=false;if(e.code==='KeyV'||e.code==='KeyB')setLean(0)});
  renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());

  let lookId=null,lastX=0,lastY=0;
  renderer.domElement.addEventListener('pointerdown',e=>{
    if(e.button===2){setAiming(true);return}
    lookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId);
  });
  renderer.domElement.addEventListener('pointermove',e=>{
    if(e.pointerId!==lookId)return;
    const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
    yaw-=dx*.00425;pitch=THREE.MathUtils.clamp(pitch+dy*.0028,-.48,.70);
  });
  const stopLook=e=>{if(e.button===2)setAiming(false);if(e.pointerId===lookId)lookId=null};
  renderer.domElement.addEventListener('pointerup',stopLook);renderer.domElement.addEventListener('pointercancel',stopLook);

  const pad=$('movePad'),knob=$('moveKnob');let padId=null;
  if(pad&&window.nipplejs?.create){
    try{
      knob && (knob.style.display='none');
      nippleManager=window.nipplejs.create({
        zone:pad,mode:'static',position:{left:'50%',top:'50%'},size:112,
        color:{front:'rgba(71,226,133,.92)',back:'rgba(119,151,129,.26)'},
        restJoystick:true,threshold:.08
      });
      nippleManager.on('move',(_evt,data)=>{
        const v=data?.vector||{x:0,y:0},force=THREE.MathUtils.clamp(Number(data?.force||0),0,1);
        const mag=Math.max(.18,force);
        mobileMove.x=THREE.MathUtils.clamp((v.x||0)*mag,-1,1);
        mobileMove.y=THREE.MathUtils.clamp((v.y||0)*mag,-1,1);
      });
      nippleManager.on('end',()=>{mobileMove.x=0;mobileMove.y=0});
      mobileInputMode='nipplejs';
    }catch(e){console.warn('NippleJS fallback',e)}
  }
  if(mobileInputMode!=='nipplejs'){
    function padMove(e){
      const r=pad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.34,len=Math.hypot(dx,dy)||1,scl=Math.min(1,max/len),px=dx*scl,py=dy*scl;
      knob.style.transform='translate('+px+'px,'+py+'px)';
      const nx=px/max,ny=-py/max,mag=Math.hypot(nx,ny);
      mobileMove.x=mag<.16?0:nx;mobileMove.y=mag<.16?0:ny;
    }
    pad?.addEventListener('pointerdown',e=>{padId=e.pointerId;pad.setPointerCapture?.(e.pointerId);padMove(e)});
    pad?.addEventListener('pointermove',e=>{if(e.pointerId===padId)padMove(e)});
    const padEnd=e=>{if(e.pointerId!==padId)return;padId=null;mobileMove.x=mobileMove.y=0;knob.style.transform='translate(0,0)'};
    pad?.addEventListener('pointerup',padEnd);pad?.addEventListener('pointercancel',padEnd);
  }

  $('respawnBtn')?.addEventListener('click',respawnPlayer);
  $('jumpBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();playerJumpQueued=true});
  $('stanceBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();cycleStance()});
  $('flashlightBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();toggleFlashlight()});
  $('modeBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();cycleMatchMode()});
  $('claimBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();claimNearestBase()});
  $('interactBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();interact()});
  const attackBtn=$('attackBtn');
  attackBtn?.addEventListener('pointerdown',e=>{e.preventDefault();fireHeld=true;useActiveWeapon()});
  attackBtn?.addEventListener('pointerup',()=>fireHeld=false);
  attackBtn?.addEventListener('pointercancel',()=>fireHeld=false);
  $('weaponBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();cycleWeapon()});
  $('reloadBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();requestReload()});
  $('aimBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();setAiming(!aiming)});
  document.querySelectorAll('.loadoutSlot[data-slot]').forEach(btn=>btn.addEventListener('pointerdown',e=>{e.preventDefault();selectSlot(btn.dataset.slot)}));
  const sprint=$('sprintBtn');sprint?.addEventListener('pointerdown',e=>{e.preventDefault();mobileSprint=true});sprint?.addEventListener('pointerup',()=>mobileSprint=false);sprint?.addEventListener('pointercancel',()=>mobileSprint=false);

  $('cameraBtn').onclick=()=>cameraMode=(cameraMode+1)%2;
  $('lightBtn').onclick=()=>{autoDayNight=false;setLighting(lightMode+1);showToast('Manual lighting enabled')};
  $('parcelBtn').onclick=()=>{if(!interiorMode){parcelLayer.visible=!parcelLayer.visible;$('parcelBtn').classList.toggle('active',parcelLayer.visible)}};
  $('artBtn').onclick=()=>{if(!interiorMode){artGroup.visible=!artGroup.visible;zombieGroup.visible=artGroup.visible;entryGroup.visible=artGroup.visible;$('artBtn').classList.toggle('active',artGroup.visible)}};
}
function lerpAngle(a,b,t){let d=(b-a+Math.PI)%(Math.PI*2)-Math.PI;return a+d*t}
function movementVector(ix,iy,angle=yaw){
  const fx=Math.sin(angle),fy=Math.cos(angle),rx=Math.cos(angle),ry=-Math.sin(angle);
  return {x:fx*iy+rx*ix,y:fy*iy+ry*ix};
}
function playerBlocked(x,y){
  return interiorMode?isBlockedInterior(x,y):isBlockedExterior(x,y,.31);
}
function movePlayerStable(dx,dy){
  const dist=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(dist/.16)),sx=dx/steps,sy=dy/steps;
  for(let i=0;i<steps;i++){
    const nx=playerRoot.position.x+sx;
    if(!playerBlocked(nx,playerRoot.position.y))playerRoot.position.x=nx;else playerVelocity.x=0;
    const ny=playerRoot.position.y+sy;
    if(!playerBlocked(playerRoot.position.x,ny))playerRoot.position.y=ny;else playerVelocity.y=0;
  }
}
function updatePlayer(dt){
  if(!playerRoot||playerDead||spectatorMode)return;
  pollGamepad();
  yaw-=gamepadLook.x*.032;
  pitch=THREE.MathUtils.clamp(pitch+gamepadLook.y*.020,-.48,.70);

  let ix=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+mobileMove.x+gamepadMove.x;
  let iy=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+mobileMove.y+gamepadMove.y;
  const len=Math.hypot(ix,iy);if(len>1){ix/=len;iy/=len}
  const moving=Math.hypot(ix,iy)>.06,sprint=(keys.has('ShiftLeft')||keys.has('ShiftRight')||mobileSprint)&&!aiming&&playerStance==='stand';
  if(activeVehicle){
    updateVehicle(dt,ix,iy);maybeNationalTravel();return;
  }
  if(slideTime>0){slideTime=Math.max(0,slideTime-dt);if(slideTime===0&&playerStance==='crouch')setPlayerStance('stand')}
  const stanceSpeed=(STANCES[playerStance]||STANCES.stand).speed,slideBoost=slideTime>0?1.85:1;
  const speed=(interiorMode?3.05:3.45)*(sprint?1.68:1)*(aiming?.72:1)*stanceSpeed*slideBoost;
  if(slideTime>0&&Math.hypot(ix,iy)<.2)iy=1;
  const move=movementVector(ix,iy,yaw);
  let desiredX=moving||slideTime>0?move.x*speed:0,desiredY=moving||slideTime>0?move.y*speed:0;
  if(!interiorMode&&playerRoot){
    if(CELL==='national'&&boundaryBlocks(playerRoot.position.x+desiredX*dt,playerRoot.position.y))desiredX=0;
    if(CELL==='national'&&boundaryBlocks(playerRoot.position.x,playerRoot.position.y+desiredY*dt))desiredY=0;
    if(matchBlocks(playerRoot.position.x+desiredX*dt,playerRoot.position.y+desiredY*dt)){desiredX=0;desiredY=0}
  }
  const accel=1-Math.exp(-(moving?9.5:15)*dt);
  playerVelocity.x=THREE.MathUtils.lerp(playerVelocity.x,desiredX,accel);
  playerVelocity.y=THREE.MathUtils.lerp(playerVelocity.y,desiredY,accel);

  let usedRapier=false;
  if(!interiorMode&&physicsReady&&playerPhysicsBody&&playerPhysicsCollider){
    usedRapier=movePlayerRapier(playerVelocity.x*dt,playerVelocity.y*dt,dt);
  }
  if(!usedRapier){
    movePlayerStable(playerVelocity.x*dt,playerVelocity.y*dt);
    const targetGround=interiorMode?.015:surfaceZXY(playerRoot.position.x,playerRoot.position.y)+.015;
    playerRoot.position.z=THREE.MathUtils.lerp(playerRoot.position.z,targetGround,1-Math.exp(-22*dt));
  }

  if(aiming&&isFirearm(activeWeapon)){
    playerRoot.rotation.z=lerpAngle(playerRoot.rotation.z,yaw,1-Math.exp(-14*dt));
  }else if(moving){
    const targetRot=Math.atan2(playerVelocity.x,playerVelocity.y);
    playerRoot.rotation.z=lerpAngle(playerRoot.rotation.z,targetRot,1-Math.exp(-11*dt));
  }
  if(reloadState.active)playPlayerAnimation('reload');
  else if(aiming&&isFirearm(activeWeapon)&&!moving)playPlayerAnimation('aim');
  else if(swingTime<=0)playPlayerAnimation(moving?(sprint?'run':'walk'):'idle');
  playerMixer?.update(dt);
  applyProceduralAim();
  const nowAudio=performance.now();
  if(moving&&grounded&&nowAudio-lastFootstepAt>(sprint?280:430)){lastFootstepAt=nowAudio;if(audioCtx)spatialTone(playerRoot.position,'foot')}

  if(!interiorMode){
    maybeNationalTravel();
    const revealDist=lastReveal?Math.hypot(playerRoot.position.x-lastReveal.x,playerRoot.position.y-lastReveal.y):999;
    if(revealDist>4.5){revealMap(playerRoot.position.x,playerRoot.position.y,true);lastReveal=playerRoot.position.clone()}
  }
}
function cameraPointBlocked(p){
  if(interiorMode){
    if(!interiorBounds)return false;
    if(p.x<interiorBounds.minx+.12||p.x>interiorBounds.maxx-.12||p.y<interiorBounds.miny+.12||p.y>interiorBounds.maxy-.12)return true;
    return interiorWalls.some(w=>p.x>w.minx-.08&&p.x<w.maxx+.08&&p.y>w.miny-.08&&p.y<w.maxy+.08);
  }
  return isBlockedExterior(p.x,p.y,.12);
}
function safeCameraPosition(target,desired){
  const safe=target.clone(),steps=18;
  for(let i=1;i<=steps;i++){
    const t=i/steps,p=target.clone().lerp(desired,t);
    if(cameraPointBlocked(p))break;
    safe.copy(p);
  }
  if(interiorMode)safe.z=THREE.MathUtils.clamp(safe.z,.72,2.72);
  else safe.z=Math.max(safe.z,surfaceZXY(safe.x,safe.y)+.72);
  return safe;
}
function updateCamera(dt){
  if(!playerRoot)return;
  const fovTarget=aiming&&isFirearm(activeWeapon)?THREE.MathUtils.clamp(Number(weaponCfg(activeWeapon).aim_fov||52),38,62):66;
  camera.fov=THREE.MathUtils.lerp(camera.fov,fovTarget,1-Math.exp(-10*dt));camera.updateProjectionMatrix();
  if(activeVehicle){
    const target=activeVehicle.root.position.clone().add(new THREE.Vector3(0,0,1.15));
    const vy=yaw+recoilYaw,vp=THREE.MathUtils.clamp(pitch+recoilPitch,-.48,.70);
    const lookDir=new THREE.Vector3(Math.sin(vy)*Math.cos(vp),Math.cos(vy)*Math.cos(vp),-Math.sin(vp)).normalize();
    const desired=target.clone().addScaledVector(lookDir,-6.8);desired.z+=1.35;
    const safe=safeCameraPosition(target,desired);camera.position.lerp(safe,1-Math.exp(-7*dt));camera.lookAt(target.clone().addScaledVector(lookDir,8));return;
  }
  const cfg=STANCES[playerStance]||STANCES.stand;
  const target=playerRoot.position.clone().add(new THREE.Vector3(0,0,Math.max(.48,cfg.center+(aiming?.44:.34))));
  const viewYaw=yaw+recoilYaw,viewPitch=THREE.MathUtils.clamp(pitch+recoilPitch,-.48,.70);
  const lookDir=new THREE.Vector3(Math.sin(viewYaw)*Math.cos(viewPitch),Math.cos(viewYaw)*Math.cos(viewPitch),-Math.sin(viewPitch)).normalize();
  leanAmount=THREE.MathUtils.lerp(leanAmount,leanTarget,1-Math.exp(-13*dt));
  const right=new THREE.Vector3(Math.cos(viewYaw),-Math.sin(viewYaw),0);
  const dist=aiming?1.62:interiorMode?(cameraMode===0?2.85:1.72):(cameraMode===0?3.8:2.0);
  const shoulder=(aiming?.54:cameraMode===0?.42:.27)+leanAmount*.48;
  const desired=target.clone().addScaledVector(lookDir,-dist).addScaledVector(right,shoulder);
  if(!aiming)desired.z+=.18;
  const physicsSafe=!interiorMode?rapierCameraPosition(target,desired):null;
  const safe=physicsSafe||safeCameraPosition(target,desired),alpha=1-Math.exp(-(aiming?15:10)*dt);
  camera.position.lerp(safe,alpha);
  camera.lookAt(target.clone().addScaledVector(lookDir,aiming?12:5));
}
async function enterLandscape(){
  try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'})}catch(_){}
  try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape')}catch(_){}
  setTimeout(resizeRenderer,160);
}
$('landscapeBtn')?.addEventListener('click',enterLandscape);
$('fullscreenBtn')?.addEventListener('click',enterLandscape);

async function boot(){
  try{
    $('cellLabel').textContent=worldCellLabel();
    $('worldTitle').textContent=worldCellTitle();
    loadText.textContent='Loading weapon registry…';
    await loadWeaponRegistry();
    restoreSurvivor();updateInventory();
    loadText.textContent='Starting physics and renderer…';
    await initRapierPhysics();
    initPostProcessing();
    data=await fetchSceneWithRetry(worldRequestUrl(),4);if(!data?.complete)throw new Error(data?.error||'Horizon scene incomplete');
    lon0=Number(data.center.lon);lat0=Number(data.center.lat);mx=111320*Math.cos(lat0*Math.PI/180);my=110540;
    const meta=$('jurisdictionMeta');if(meta&&CELL==='national')meta.textContent=(JURISDICTIONS[SELECTED_STATE]?.[0]||SELECTED_STATE)+' · '+(data.counts?.buildings||0).toLocaleString()+' buildings · '+(data.counts?.parcels||0).toLocaleString()+' open parcel outlines · '+Number(data.span_km||STREAM_SPAN).toFixed(1)+' km streamed cell';

    buildAtmosphere();buildTerrain();buildRoads();buildWater();buildBuildings();buildFacadeDetails();buildParts();buildParcels();addLights();setLighting(0);drawMinimapBase();initInput();
    applyApocalypseDecay(worldGroup);
    await buildPlayer();createPlayerPhysics();buildEntryPoints();installInteractiveDoors();renderFactionBanner();initFlashlight();
    revealMap(playerRoot.position.x,playerRoot.position.y,true);lastReveal=playerRoot.position.clone();
    loadText.textContent='Loading interiors, city dressing and infected…';
    await buildSurvivalArt();
    initializeVehicleRepair();snapInfrastructureToRoadNodes();populateOpenSpace();configureMatchMode(matchMode);
    loadText.textContent=(data.counts?.buildings||0).toLocaleString()+' source-backed buildings · enter marked doorways and search interiors';
    updateInventory();updateInteractionPrompt();resizeRenderer();
    window.BP_HORIZON_SMOKE={
      ok:true,cell:CELL,buildings:Number(data.counts?.buildings||0),parts:Number(data.counts?.building_parts||0),
      player:Boolean(playerRoot),loot:buildingEntries.length,zombies:zombies.length,entries:buildingEntries.length,
      packCapacity,weapon:equippedWeaponName,interiorAssets:Object.values(interiorTemplates).filter(Boolean).length,
      artChildren:artGroup.children.length,roadLayers:roadLayer?.children?.length||0,streetLife:{...streetLifeStats},
      spawnBlocked:isBlockedExterior(playerRoot.position.x,playerRoot.position.y,.36),
      visiblePack:Boolean(packMesh),pickupCount:worldPickups.filter(p=>p.active&&p.mode==='exterior').length,
      equipment:{...equipment},
      playerSurfaceZ:surfaceZXY(playerRoot.position.x,playerRoot.position.y),
      playerRootZ:playerRoot.position.z,
      activeWeapon,activeSlot,zombieVariants:zombieTemplates.length,
      physicsMode,physicsReady,physicsError,postFxMode,boundaryEdges:[...activeBoundaryEdges],build:BUILD_VERSION,
      navNodes:navNodes.length,drivableVehicles:drivableVehicles.length,stance:playerStance,
      streamed:Boolean(data?.streamed),resolvedJurisdiction:data?.resolved_jurisdiction||null,
      weaponRegistryMode,weaponRegistrySize:new Set([...weaponRegistry.values()].map(x=>x.weapon_id)).size,
      weaponRegistryError,mobileInputMode,reserveAmmo:{...reserveAmmo},
      reloadActive:reloadState.active,aimFov:weaponCfg(activeWeapon).aim_fov,
      sceneFetchAttempts,sceneFetchError,decayPatchedMaterials,smartSnappedProps,openSpaceProps,doorSystemCount,
      matchMode,matchRadius:Number.isFinite(matchRadius)?matchRadius:null,seasonDay:seasonDay(),xp,battleTier,livesRemaining,
      flashlightReady:Boolean(flashlight),vehicleRepair:true,factionClaimMode:'local-preview',spectatorMode
    };
    window.BP_HORIZON_TEST={
      enterFirst:()=>{
        const e=buildingEntries[0];if(!e)return null;enterInterior(e);
        return {interiorMode,layout:activeInterior?.layout||null,containers:interiorContainers.length,floor:activeInterior?.floor||null};
      },
      searchFirst:()=>{
        const c=interiorContainers.find(x=>x.active);if(!c)return null;
        playerRoot.position.set(c.x,c.y,.05);updateInteractionPrompt();interact();
        return {lootCount,packCapacity,inventory:{...inventory}};
      },
      swing:()=>{attack();return {swingTime,equippedWeaponName}},
      exit:()=>{exitInterior();return {interiorMode}},
      state:()=>({interiorMode,entries:buildingEntries.length,containers:interiorContainers.length,lootCount,packCapacity,equippedWeaponName}),
      directionProbe:(dir)=>{
        let ix=0,iy=0;
        if(dir==='forward')iy=1;
        if(dir==='backward')iy=-1;
        if(dir==='left')ix=-1;
        if(dir==='right')ix=1;
        const v=movementVector(ix,iy,0);
        return {dx:v.x,dy:v.y};
      },
      weaponSize:()=>{
        if(!weaponPivot?.children?.length)return null;
        const box=new THREE.Box3().setFromObject(weaponPivot.children[0]),size=new THREE.Vector3();box.getSize(size);
        return {x:size.x,y:size.y,z:size.z,longest:Math.max(size.x,size.y,size.z)};
      },
      loosePickup:()=>{
        const p=worldPickups.find(x=>x.active&&x.mode==='exterior');if(!p)return null;
        const item=p.item;playerRoot.position.set(p.root.position.x,p.root.position.y,surfaceZXY(p.root.position.x,p.root.position.y)+.015);
        pickupLoose(p);return {item,equipment:{...equipment},lootCount,active:p.active};
      },
      zombieWave:()=>({waveNumber,active:zombies.filter(z=>!z.dead).length,speeds:zombies.filter(z=>!z.dead).map(z=>z.speed)}),
      equipmentProbe:()=>{
        addInventoryItem('Pistol');addInventoryItem('Rifle');
        const priorSlot=activeSlot;
        if(equipment.melee)selectSlot('melee',true);
        const result={
          equipment:{...equipment},
          hipChildren:equipmentMounts.hip?.children?.length||0,
          backChildren:equipmentMounts.backGun?.children?.length||0,
          visiblePack:Boolean(packMesh)
        };
        if(priorSlot&&activeItemForSlot(priorSlot))selectSlot(priorSlot,true);
        return result;
      },
      socketProbe:()=>{
        const localOf=o=>{
          if(!o)return null;o.updateWorldMatrix(true,false);
          const v=new THREE.Vector3();o.getWorldPosition(v);playerRoot.worldToLocal(v);return{x:v.x,y:v.y,z:v.z};
        };
        return {
          rightHand:localOf(equipmentMounts.rightHand),
          leftHand:localOf(equipmentMounts.leftHand),
          hip:localOf(equipmentMounts.hip),
          back:localOf(equipmentMounts.backGun),
          handChildren:equipmentMounts.rightHand?.children?.length||0,
          rightParent:equipmentMounts.rightHand?.parent?.name||null,
          leftParent:equipmentMounts.leftHand?.parent?.name||null,
          hipParent:equipmentMounts.hip?.parent?.name||null,
          backParent:equipmentMounts.backGun?.parent?.name||null
        };
      },
      gunProbe:()=>{
        addInventoryItem('Pistol');selectSlot('sidearm',true);setAiming(true);
        const before=ammoState.Pistol;shoot();const after=ammoState.Pistol;
        const side={activeSlot,activeWeapon,before,after,aiming};
        addInventoryItem('Rifle');selectSlot('primary',true);
        const primary={activeSlot,activeWeapon,backChildren:equipmentMounts.backGun?.children?.length||0};
        selectSlot('melee',true);setAiming(false);
        return{side,primary};
      },
      multiFloorProbe:()=>{
        if(interiorMode)exitInterior();
        const e=[...buildingEntries].sort((a,b)=>b.height-a.height)[0];if(!e)return null;
        enterInterior(e);const first={floor:activeInterior.floor,floors:activeInterior.floors};
        if(activeInterior.floors>1)changeInteriorFloor(2);
        const second={floor:activeInterior.floor,floors:activeInterior.floors,links:interiorFloorLinks.length,pickups:worldPickups.filter(p=>p.active&&p.mode==='interior').length};
        exitInterior();return{first,second};
      },
      cameraProbe:()=>{
        updateCamera(.5);return{blocked:cameraPointBlocked(camera.position),z:camera.position.z};
      },
      feetProbe:()=>{
        playerRoot?.updateMatrixWorld(true);
        const box=new THREE.Box3().setFromObject(playerVisualRoot||playerRoot);
        const surface=interiorMode?0:surfaceZXY(playerRoot.position.x,playerRoot.position.y);
        return {minZ:box.min.z,surface,rootZ:playerRoot.position.z,clearance:box.min.z-surface};
      },
      deathProbe:()=>{
        damagePlayer(200);const deadBefore=playerDead;respawnPlayer();
        return {deadBefore,deadAfter:playerDead,health};
      },
      physicsProbe:()=>({
        ready:physicsReady,mode:physicsMode,error:physicsError,hasBody:Boolean(playerPhysicsBody),hasCollider:Boolean(playerPhysicsCollider),
        controller:Boolean(characterController),staticColliders:physicsStaticColliders.length,grounded
      }),
      stanceProbe:()=>{
        const before=playerStance;setPlayerStance('crouch');
        const crouch={stance:playerStance,center:PHYSICS_PLAYER_CENTER,hasCollider:Boolean(playerPhysicsCollider)};
        setPlayerStance('stand');
        playerJumpQueued=true;
        const jumpQueued=playerJumpQueued;
        return{before,crouch,after:playerStance,jumpQueued};
      },
      navProbe:()=>({
        nodes:navNodes.length,
        active:zombies.filter(z=>!z.dead).map(z=>({state:z.state,speed:z.speed,pathLength:z.path?.length||0}))
      }),
      driveProbe:()=>{
        const v=drivableVehicles[0];if(!v)return null;
        const oldPos=v.root.position.clone();playerRoot.position.copy(v.root.position).add(new THREE.Vector3(.4,.4,0));syncPhysicsToPlayer();
        enterVehicle(v);const entered=Boolean(activeVehicle);
        updateVehicle(.25,.25,1);
        const moved=v.root.position.distanceTo(oldPos);
        exitVehicle();
        return{entered,moved,exited:!activeVehicle,type:v.type};
      },
      boundaryProbe:async()=>{
        const inside=await resolveUniverse(40.7128,-74.0060);
        const outside=await resolveUniverse(51.5074,-0.1278);
        return{
          inside:Boolean(inside?.inside_us_universe),
          insideState:inside?.resolved_jurisdiction?.state||null,
          outside:Boolean(outside?.inside_us_universe)
        };
      },
      postFxProbe:()=>({mode:postFxMode,composer:Boolean(composer),gtao:Boolean(gtaoPass),bloom:Boolean(bloomPass)}),
      registryProbe:()=>({
        mode:weaponRegistryMode,
        unique:new Set([...weaponRegistry.values()].map(x=>x.weapon_id)).size,
        pistol:weaponCfg('Pistol'),
        rifle:weaponCfg('Rifle'),
        input:mobileInputMode
      }),
      reloadProbe:()=>{
        addInventoryItem('Pistol');selectSlot('sidearm',true);
        const cfg=weaponCfg('Pistol');
        ammoState.Pistol=1;reserveAmmo.Pistol=Math.max(12,reserveAmmo.Pistol||0);
        const started=requestReload();
        const end=reloadState.endsAt;
        if(started){reloadState.endsAt=performance.now()-1;updateReload(performance.now())}
        return {started,end,mag:ammoState.Pistol,reserve:reserveAmmo.Pistol,expected:Number(cfg.magazine_size||12),active:reloadState.active};
      },
      recoilProbe:()=>{
        addInventoryItem('Rifle');selectSlot('primary',true);aiming=true;
        const before={pitch:recoilPitch,yaw:recoilYaw};
        const cfg=weaponCfg('Rifle');applyRecoil(cfg);
        const after={pitch:recoilPitch,yaw:recoilYaw,cfgPitch:cfg.recoil_pitch_deg,cfgYaw:cfg.recoil_yaw_deg};
        aiming=false;return {before,after};
      },
      horizon3050Probe:()=>({
        build:BUILD_VERSION,sceneFetchAttempts,sceneFetchError,decayPatchedMaterials,smartSnappedProps,openSpaceProps,doorSystemCount,
        matchMode,matchRadius:Number.isFinite(matchRadius)?matchRadius:null,seasonDay:seasonDay(),xp,battleTier,livesRemaining,
        flashlightReady:Boolean(flashlight),vehicleRepair:drivableVehicles.some(v=>(v.requiredParts||[]).length>0)
      }),
      doorProbe:()=>{
        const e=buildingEntries.find(x=>x.doorPivot);if(!e)return null;const before=e.doorOpen;openDoor(e,true);updateDoors(.5);
        return{before,after:e.doorOpen,angle:e.doorPivot.rotation.z,count:doorSystemCount};
      },
      repairProbe:()=>{
        const v=drivableVehicles.find(x=>(x.requiredParts||[]).length>0);if(!v)return null;
        const prior=[...v.installedParts];v.installedParts=[];inventory['Car battery']=(inventory['Car battery']||0)+1;inventory['Spark plug']=(inventory['Spark plug']||0)+1;
        const repaired=repairVehicle(v),result={repaired,ready:vehicleReady(v),installed:[...v.installedParts],required:[...v.requiredParts]};v.installedParts=prior;return result;
      },
      progressionProbe:()=>({xp,battleTier,livesRemaining,unlocks:[...cosmeticUnlocks]}),
      moderationProbe:(msg)=>moderateChatMessage(msg),
      matchProbe:()=>({mode:matchMode,radius:Number.isFinite(matchRadius)?matchRadius:null,day:seasonDay()}),
      spawnMobility:()=>{
        const p=playerRoot.position,step=.8,dirs={
          forward:movementVector(0,1,0),backward:movementVector(0,-1,0),
          left:movementVector(-1,0,0),right:movementVector(1,0,0)
        };
        const open={};
        for(const [k,v] of Object.entries(dirs))open[k]=!isBlockedExterior(p.x+v.x*step,p.y+v.y*step,.34);
        return {blockedHere:isBlockedExterior(p.x,p.y,.34),open};
      }
    };
  }catch(e){
    console.error(e);window.BP_HORIZON_SMOKE={ok:false,cell:CELL,error:String(e?.message||e)};$('error').hidden=false;$('errorText').textContent=String(e?.message||e);loadText.textContent='Preview unavailable';
  }
}

let lastPrompt=0;
function loop(now=performance.now()){
  const dt=Math.min(.05,clock.getDelta()||.016);
  updateWeapon(dt);updatePlayer(dt);updateZombieWaves(now);updateZombies(dt,now);animatePickups(dt,now);updateDoors(dt);
  if(spectatorMode)updateSpectator(now);else updateCamera(dt);
  updateFlashlight();updateDayNight(now);
  if(now-lastPrompt>120){updateInteractionPrompt();lastPrompt=now}
  updateAudioListener();renderMinimap();if(composer)composer.render();else renderer.render(scene,camera);requestAnimationFrame(loop);
}
loop();boot();
