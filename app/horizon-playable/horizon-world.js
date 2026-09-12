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
const BUILD_VERSION=4237;
const PLAYER_BASE_SPEED=3.45;
const PLAYER_SPRINT_MULT=1.68;
const PLAYER_MAX_SPEED=PLAYER_BASE_SPEED*PLAYER_SPRINT_MULT;
const MAX_HOSTILE_SPEED=PLAYER_MAX_SPEED*.91;
const SAVE_KEY='bridgepoint-horizon-survivor-v3050';
const LEGACY_SAVE_KEY='bridgepoint-horizon-survivor-v3040';
const FREE_BASE='https://cdn.jsdelivr.net/gh/agentkaerf/FreeModels@main/Zombie%20Apocalypse%20Kit%20-%20March%202024';
const SUSHI_ENV='https://cdn.jsdelivr.net/gh/agentkaerf/FreeModels@main/Sushi%20Restaurant%20Kit%20-%20May%202023/Environment/glTF';
const SUSHI_DECOR='https://cdn.jsdelivr.net/gh/agentkaerf/FreeModels@main/Sushi%20Restaurant%20Kit%20-%20May%202023/Decoration/glTF';
const AURISAR_MOBS='https://cdn.jsdelivr.net/gh/brandon-aurgames/aurisar-app@main/public/assets/mobs';
const CONSTELLATION_MODELS='https://cdn.jsdelivr.net/gh/Hakhyun-Kim/constellation-defense@main/assets/models';
const QUATERNIUS_SHOWCASE='https://cdn.jsdelivr.net/gh/trebeljahr/quaternius-showcase@main/public/glb';
const DERETH_MOBS='https://cdn.jsdelivr.net/gh/w5ohr/Dereth@main/assets/models/monsters';
const M2M_BASE='https://raw.githubusercontent.com/Mesh2Motion/mesh2motion-app/main/static';
const ASSETS={
  player:FREE_BASE+'/Characters/glTF/Characters_Matt.gltf',
  playerLis:FREE_BASE+'/Characters/glTF/Characters_Lis.gltf',
  playerSam:FREE_BASE+'/Characters/glTF/Characters_Sam.gltf',
  playerShaun:FREE_BASE+'/Characters/glTF/Characters_Shaun.gltf',
  playerRealistic:'https://threejs.org/examples/models/gltf/Soldier.glb',
  playerSurvivor:M2M_BASE+'/models-variation/human/male_32.glb',
  playerFemale:M2M_BASE+'/models-variation/human/female_31.glb',
  playerSwat:M2M_BASE+'/models-variation/human/swat_male.glb',
  playerPolice:M2M_BASE+'/models-variation/human/police_male.glb',
  playerHazmat:M2M_BASE+'/models-variation/human/hazmat_suit_male.glb',
  playerAnimations:M2M_BASE+'/animations/human-base-animations.glb',
  infectedM2MZombie:M2M_BASE+'/models-variation/human/zombie.glb',
  infectedM2MMonster3:M2M_BASE+'/models-variation/human/monster_3.glb',
  infectedM2MMonster4:M2M_BASE+'/models-variation/human/monster_4.glb',
  infectedM2MMonster5:M2M_BASE+'/models-variation/human/monster_5.glb',
  infectedHuman:'https://raw.githubusercontent.com/kunalkushwaha/vsim/main/packages/assets/library/human.glb',
  infectedMan:'https://raw.githubusercontent.com/kunalkushwaha/vsim/main/packages/assets/library/man.glb',
  infectedScreamer:'https://raw.githubusercontent.com/kunalkushwaha/vsim/main/packages/assets/library/speaker.glb',
  infectedBearReal:'https://raw.githubusercontent.com/kunalkushwaha/vsim/main/packages/assets/library/bear.glb',
  infectedWolfReal:'https://raw.githubusercontent.com/kunalkushwaha/vsim/main/packages/assets/library/wolf.glb',
  zombie:FREE_BASE+'/Characters/glTF/Zombie_Basic.gltf',
  zombieChubby:FREE_BASE+'/Characters/glTF/Zombie_Chubby.gltf',
  zombieRibcage:FREE_BASE+'/Characters/glTF/Zombie_Ribcage.gltf',
  infectedShepherd:FREE_BASE+'/Characters/glTF/Characters_GermanShepherd.gltf',
  infectedPug:FREE_BASE+'/Characters/glTF/Characters_Pug.gltf',
  wolf:QUATERNIUS_SHOWCASE+'/animals_pack/Wolf.glb',
  orc:CONSTELLATION_MODELS+'/quaternius-orc.glb',
  spider:QUATERNIUS_SHOWCASE+'/easy_enemies_pack/Spider.glb',
  yeti:CONSTELLATION_MODELS+'/quaternius-yeti.glb',
  bear:DERETH_MOBS+'/Bear.glb',
  infectedCrow:'https://cdn.jsdelivr.net/gh/adammikulis/local-agents@main/addons/local_agents/assets/models/fauna/vulture.glb',
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
  smg:FREE_BASE+'/Weapons/glTF/SMG.gltf',
  spear:FREE_BASE+'/Weapons/glTF/Spear.gltf',
  sawBat:FREE_BASE+'/Weapons/glTF/WoodenBat_Saw.gltf',
  guitar:FREE_BASE+'/Weapons/glTF/Guitar.gltf',
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
  {weapon_id:'shotgun',weapon_name:'Shotgun',weapon_type:'primary',equip_slot:'primary',stance_type:'two_handed_rifle',fire_mode:'pump',damage:92,range_m:28,magazine_size:6,reserve_default:30,fire_interval_seconds:.72,reload_time_seconds:2.75,recoil_pitch_deg:3,recoil_yaw_deg:1.1,spread_deg:2.4,aim_fov:50,two_handed:true,hitscan:true,model_url:ASSETS.shotgun,license_code:'CC0'},
  {weapon_id:'smg',weapon_name:'SMG',weapon_type:'primary',equip_slot:'primary',stance_type:'two_handed_rifle',fire_mode:'auto',damage:34,range_m:62,magazine_size:32,reserve_default:160,fire_interval_seconds:.085,reload_time_seconds:1.8,recoil_pitch_deg:.8,recoil_yaw_deg:.72,spread_deg:.8,aim_fov:50,two_handed:true,hitscan:true,model_url:ASSETS.smg,license_code:'CC0'},
  {weapon_id:'spear',weapon_name:'Spear',weapon_type:'melee',equip_slot:'melee',stance_type:'two_handed_melee',fire_mode:'melee',damage:68,range_m:3.15,magazine_size:0,reserve_default:0,fire_interval_seconds:.62,reload_time_seconds:0,recoil_pitch_deg:0,recoil_yaw_deg:0,spread_deg:0,aim_fov:62,two_handed:true,hitscan:true,model_url:ASSETS.spear,license_code:'CC0'},
  {weapon_id:'saw_bat',weapon_name:'Saw Bat',weapon_type:'melee',equip_slot:'melee',stance_type:'two_handed_melee',fire_mode:'melee',damage:66,range_m:2.7,magazine_size:0,reserve_default:0,fire_interval_seconds:.52,reload_time_seconds:0,recoil_pitch_deg:0,recoil_yaw_deg:0,spread_deg:0,aim_fov:62,two_handed:true,hitscan:true,model_url:ASSETS.sawBat,license_code:'CC0'},
  {weapon_id:'guitar',weapon_name:'Guitar',weapon_type:'melee',equip_slot:'melee',stance_type:'two_handed_melee',fire_mode:'melee',damage:46,range_m:2.55,magazine_size:0,reserve_default:0,fire_interval_seconds:.48,reload_time_seconds:0,recoil_pitch_deg:0,recoil_yaw_deg:0,spread_deg:0,aim_fov:62,two_handed:true,hitscan:true,model_url:ASSETS.guitar,license_code:'CC0'},
  {weapon_id:'fists',weapon_name:'Fists',weapon_type:'melee',equip_slot:'melee',stance_type:'unarmed',fire_mode:'melee',damage:24,range_m:1.55,magazine_size:0,reserve_default:0,fire_interval_seconds:.38,reload_time_seconds:0,recoil_pitch_deg:0,recoil_yaw_deg:0,spread_deg:0,aim_fov:62,two_handed:false,hitscan:true,model_url:null,license_code:'internal'}
];

const params=new URLSearchParams(location.search);
const MAP_PRESETS=[
  {id:'times_square',name:'Times Square Collapse',state:'NY',lat:40.7580,lon:-73.9855,span:1.0,size:'SMALL',preview:'city',theme:'downtown',density:2.15},
  {id:'lower_manhattan',name:'Lower Manhattan Siege',state:'NY',lat:40.7075,lon:-74.0113,span:1.7,size:'MEDIUM',preview:'city',theme:'downtown',density:2.10},
  {id:'brooklyn_docks',name:'Brooklyn Dockyards',state:'NY',lat:40.6782,lon:-74.0165,span:2.4,size:'LARGE',preview:'coastal',theme:'harbor',density:1.95,waterRing:true},
  {id:'bronx_ruins',name:'Bronx Ruins',state:'NY',lat:40.8448,lon:-73.8648,span:1.5,size:'MEDIUM',preview:'city',theme:'urban',density:2.0},
  {id:'boston_harbor',name:'Boston Harbor',state:'MA',lat:42.3601,lon:-71.0522,span:1.8,size:'MEDIUM',preview:'coastal',theme:'harbor',density:1.95,waterRing:true},
  {id:'philadelphia_center',name:'Philadelphia Center City',state:'PA',lat:39.9526,lon:-75.1652,span:1.8,size:'MEDIUM',preview:'city',theme:'downtown',density:2.05},
  {id:'baltimore_inner_harbor',name:'Baltimore Inner Harbor',state:'MD',lat:39.2847,lon:-76.6132,span:1.6,size:'MEDIUM',preview:'coastal',theme:'harbor',density:2.0,waterRing:true},
  {id:'dc_mall',name:'D.C. Containment Zone',state:'DC',lat:38.8951,lon:-77.0364,span:2.2,size:'LARGE',preview:'city',theme:'government',density:1.9},
  {id:'pittsburgh_river',name:'Pittsburgh River Siege',state:'PA',lat:40.4406,lon:-79.9959,span:2.0,size:'MEDIUM',preview:'coastal',theme:'industrial',density:1.95},
  {id:'cleveland_flats',name:'Cleveland Flats',state:'OH',lat:41.4974,lon:-81.7048,span:1.7,size:'MEDIUM',preview:'city',theme:'industrial',density:2.0},
  {id:'detroit_downtown',name:'Detroit Blackout',state:'MI',lat:42.3314,lon:-83.0458,span:2.0,size:'MEDIUM',preview:'city',theme:'industrial',density:2.05},
  {id:'chicago_loop',name:'Chicago Loop',state:'IL',lat:41.8837,lon:-87.6325,span:2.2,size:'LARGE',preview:'city',theme:'downtown',density:2.1},
  {id:'milwaukee_river',name:'Milwaukee Riverfront',state:'WI',lat:43.0389,lon:-87.9065,span:1.7,size:'MEDIUM',preview:'coastal',theme:'industrial',density:1.95},
  {id:'minneapolis_mill',name:'Minneapolis Mill District',state:'MN',lat:44.9788,lon:-93.2570,span:1.8,size:'MEDIUM',preview:'city',theme:'industrial',density:1.95},
  {id:'st_louis_gateway',name:'St. Louis Gateway',state:'MO',lat:38.6270,lon:-90.1994,span:2.0,size:'MEDIUM',preview:'city',theme:'urban',density:1.9},
  {id:'nashville_core',name:'Nashville Core',state:'TN',lat:36.1627,lon:-86.7816,span:1.7,size:'MEDIUM',preview:'city',theme:'downtown',density:2.0},
  {id:'memphis_river',name:'Memphis Riverfront',state:'TN',lat:35.1495,lon:-90.0490,span:1.8,size:'MEDIUM',preview:'coastal',theme:'industrial',density:1.9},
  {id:'atlanta_midtown',name:'Atlanta Midtown',state:'GA',lat:33.7811,lon:-84.3866,span:1.9,size:'MEDIUM',preview:'city',theme:'urban',density:2.05},
  {id:'charleston_port',name:'Charleston Port',state:'SC',lat:32.7765,lon:-79.9311,span:1.8,size:'MEDIUM',preview:'coastal',theme:'harbor',density:1.95,waterRing:true},
  {id:'savannah_river',name:'Savannah River District',state:'GA',lat:32.0809,lon:-81.0912,span:1.6,size:'MEDIUM',preview:'coastal',theme:'historic',density:1.9},
  {id:'miami_beach',name:'Miami Beach Isolation',state:'FL',lat:25.7907,lon:-80.1300,span:2.0,size:'MEDIUM',preview:'coastal',theme:'resort',density:2.0,waterRing:true},
  {id:'tampa_channelside',name:'Tampa Channelside',state:'FL',lat:27.9446,lon:-82.4450,span:1.8,size:'MEDIUM',preview:'coastal',theme:'harbor',density:1.95,waterRing:true},
  {id:'orlando_core',name:'Orlando Evacuation Grid',state:'FL',lat:28.5383,lon:-81.3792,span:1.5,size:'MEDIUM',preview:'city',theme:'urban',density:2.0},
  {id:'jacksonville_river',name:'Jacksonville Riverfront',state:'FL',lat:30.3322,lon:-81.6557,span:2.1,size:'LARGE',preview:'coastal',theme:'harbor',density:1.9},
  {id:'new_orleans_french',name:'New Orleans Floodline',state:'LA',lat:29.9584,lon:-90.0644,span:1.7,size:'MEDIUM',preview:'coastal',theme:'historic',density:2.05},
  {id:'houston_downtown',name:'Houston Downtown',state:'TX',lat:29.7604,lon:-95.3698,span:2.3,size:'LARGE',preview:'city',theme:'urban',density:2.0},
  {id:'dallas_core',name:'Dallas Core',state:'TX',lat:32.7767,lon:-96.7970,span:2.0,size:'MEDIUM',preview:'city',theme:'downtown',density:2.0},
  {id:'austin_river',name:'Austin River District',state:'TX',lat:30.2672,lon:-97.7431,span:1.8,size:'MEDIUM',preview:'coastal',theme:'urban',density:1.95},
  {id:'san_antonio_riverwalk',name:'San Antonio Riverwalk',state:'TX',lat:29.4241,lon:-98.4936,span:1.6,size:'MEDIUM',preview:'city',theme:'historic',density:1.95},
  {id:'el_paso_core',name:'El Paso Dust Zone',state:'TX',lat:31.7619,lon:-106.4850,span:1.8,size:'MEDIUM',preview:'city',theme:'desert',density:1.9},
  {id:'denver_core',name:'Denver Core',state:'CO',lat:39.7392,lon:-104.9903,span:1.9,size:'MEDIUM',preview:'city',theme:'urban',density:2.0},
  {id:'colorado_mountain',name:'Rocky Mountain Outbreak',state:'CO',lat:39.1911,lon:-106.8175,span:2.5,size:'LARGE',preview:'mountain',theme:'mountain',density:1.85},
  {id:'salt_lake',name:'Salt Lake Collapse',state:'UT',lat:40.7608,lon:-111.8910,span:1.9,size:'MEDIUM',preview:'city',theme:'urban',density:1.95},
  {id:'phoenix_core',name:'Phoenix Heat Zone',state:'AZ',lat:33.4484,lon:-112.0740,span:2.2,size:'LARGE',preview:'city',theme:'desert',density:1.95},
  {id:'las_vegas_strip',name:'Las Vegas Strip',state:'NV',lat:36.1147,lon:-115.1728,span:2.0,size:'MEDIUM',preview:'city',theme:'resort',density:2.15},
  {id:'albuquerque',name:'Albuquerque Dead Zone',state:'NM',lat:35.0844,lon:-106.6504,span:1.8,size:'MEDIUM',preview:'city',theme:'desert',density:1.9},
  {id:'los_angeles_dt',name:'Los Angeles Downtown',state:'CA',lat:34.0522,lon:-118.2437,span:2.4,size:'LARGE',preview:'city',theme:'downtown',density:2.1},
  {id:'long_beach_port',name:'Long Beach Port',state:'CA',lat:33.7542,lon:-118.2165,span:2.5,size:'LARGE',preview:'coastal',theme:'harbor',density:2.0,waterRing:true},
  {id:'san_diego_harbor',name:'San Diego Harbor',state:'CA',lat:32.7157,lon:-117.1730,span:2.0,size:'MEDIUM',preview:'coastal',theme:'harbor',density:1.95,waterRing:true},
  {id:'san_francisco_downtown',name:'San Francisco Downtown',state:'CA',lat:37.7890,lon:-122.4010,span:1.9,size:'MEDIUM',preview:'city',theme:'downtown',density:2.1},
  {id:'oakland_port',name:'Oakland Port',state:'CA',lat:37.7955,lon:-122.2783,span:2.1,size:'LARGE',preview:'coastal',theme:'industrial',density:2.0,waterRing:true},
  {id:'sacramento_core',name:'Sacramento Core',state:'CA',lat:38.5816,lon:-121.4944,span:1.8,size:'MEDIUM',preview:'city',theme:'urban',density:1.95},
  {id:'portland_river',name:'Portland Riverfront',state:'OR',lat:45.5152,lon:-122.6784,span:1.9,size:'MEDIUM',preview:'coastal',theme:'industrial',density:1.95},
  {id:'seattle_waterfront',name:'Seattle Waterfront',state:'WA',lat:47.6062,lon:-122.3425,span:2.1,size:'LARGE',preview:'coastal',theme:'harbor',density:2.05,waterRing:true},
  {id:'tacoma_port',name:'Tacoma Port',state:'WA',lat:47.2529,lon:-122.4443,span:2.0,size:'MEDIUM',preview:'coastal',theme:'industrial',density:1.95,waterRing:true},
  {id:'honolulu_waikiki',name:'Honolulu Waikiki',state:'HI',lat:21.2793,lon:-157.8292,span:1.8,size:'MEDIUM',preview:'coastal',theme:'resort',density:2.0,waterRing:true},
  {id:'anchorage_port',name:'Anchorage Port',state:'AK',lat:61.2181,lon:-149.9003,span:2.4,size:'LARGE',preview:'coastal',theme:'industrial',density:1.85,waterRing:true},
  {id:'san_juan_old',name:'Old San Juan',state:'PR',lat:18.4655,lon:-66.1057,span:1.5,size:'MEDIUM',preview:'coastal',theme:'historic',density:2.0,waterRing:true},
  {id:'guam_hagatna',name:'Hagåtña Outbreak',state:'GU',lat:13.4757,lon:144.7489,span:1.8,size:'MEDIUM',preview:'coastal',theme:'island',density:1.9,waterRing:true},
  {id:'st_thomas',name:'Charlotte Amalie Last Stand',state:'VI',lat:18.3419,lon:-64.9307,span:1.5,size:'MEDIUM',preview:'coastal',theme:'island',density:1.9,waterRing:true}
];
const MAP_BY_ID=new Map(MAP_PRESETS.map(x=>[x.id,x]));
const MAP_KEY=String(params.get('map')||'times_square').toLowerCase();
const MAP_PRESET=MAP_BY_ID.get(MAP_KEY)||MAP_PRESETS[0];
const PREVIEW_KEY=['city','mountain','coastal'].includes(String(params.get('preview')||MAP_PRESET.preview||'').toLowerCase())?String(params.get('preview')||MAP_PRESET.preview).toLowerCase():null;
const PLAYER_VARIANTS={
  survivor:ASSETS.playerSurvivor,
  female:ASSETS.playerFemale,
  swat:ASSETS.playerSwat,
  police:ASSETS.playerPolice,
  hazmat:ASSETS.playerHazmat,
  realistic:ASSETS.playerRealistic,
  matt:ASSETS.player,lis:ASSETS.playerLis,sam:ASSETS.playerSam,shaun:ASSETS.playerShaun
};
const M2M_PLAYER_KEYS=new Set(['survivor','female','swat','police','hazmat']);
const CHARACTER_KEY=String(params.get('character')||({city:'survivor',mountain:'survivor',coastal:'survivor'}[PREVIEW_KEY]||'survivor')).toLowerCase();
const PLAYER_ASSET=PLAYER_VARIANTS[CHARACTER_KEY]||ASSETS.player;
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
const stateParam=String(params.get('state')||MAP_PRESET.state||'NY').toUpperCase();
const SELECTED_STATE=JURISDICTIONS[stateParam]?stateParam:(JURISDICTIONS[MAP_PRESET.state]?MAP_PRESET.state:'NY');
const selectedJurisdiction=JURISDICTIONS[SELECTED_STATE];
const latParam=params.get('lat'),lonParam=params.get('lon');
const STREAM_LAT=latParam!==null&&latParam!==''&&Number.isFinite(Number(latParam))?Number(latParam):Number(MAP_PRESET.lat||selectedJurisdiction[1]);
const STREAM_LON=lonParam!==null&&lonParam!==''&&Number.isFinite(Number(lonParam))?Number(lonParam):Number(MAP_PRESET.lon||selectedJurisdiction[2]);
const STREAM_SPAN=Math.max(.75,Math.min(5.5,Number(params.get('span_km')||MAP_PRESET.span||3.4)));
const MAP_DENSITY=Math.max(1,Number(MAP_PRESET.density||1.7));
const ENDLESS_HORDE=true;
const ENDLESS_ACTIVE_CAP=MAP_PRESET.size==='LARGE'?44:MAP_PRESET.size==='SMALL'?26:34;
const densePreview=()=>PREVIEW_KEY?PREVIEW_KEY==='city':(CELL==='manhattan'||CELL==='national');

document.body.classList.toggle('nationalMode',CELL==='national');
$('cellNational')?.classList.toggle('active',CELL==='national');
$('cellMiddletown')?.classList.toggle('active',CELL==='middletown');
$('cellManhattan')?.classList.toggle('active',CELL==='manhattan');
const jurisdictionSelect=$('jurisdictionSelect');
if(jurisdictionSelect){
  jurisdictionSelect.innerHTML=Object.entries(JURISDICTIONS).map(([code,v])=>'<option value="'+code+'">'+v[0]+' ('+code+')</option>').join('');
  jurisdictionSelect.value=SELECTED_STATE;
}
const mapSelect=$('mapSelect');
if(mapSelect){
  mapSelect.innerHTML=MAP_PRESETS.map(m=>'<option value="'+m.id+'">'+m.name+' · '+m.size+'</option>').join('');
  mapSelect.value=MAP_PRESET.id;
  mapSelect.addEventListener('change',()=>{
    const m=MAP_BY_ID.get(mapSelect.value)||MAP_PRESETS[0],u=new URL(location.href);
    u.searchParams.set('map',m.id);u.searchParams.set('cell','national');u.searchParams.set('state',m.state);
    u.searchParams.set('lat',String(m.lat));u.searchParams.set('lon',String(m.lon));u.searchParams.set('span_km',String(m.span));u.searchParams.set('preview',m.preview);u.searchParams.set('build',String(BUILD_VERSION));
    location.href=u.toString();
  });
}
const mapSizeBadge=$('mapSizeBadge');if(mapSizeBadge)mapSizeBadge.textContent=MAP_PRESET.size+' · '+MAP_PRESET.theme.toUpperCase();
const characterSelect=$('characterSelect');
if(characterSelect){
  characterSelect.value=PLAYER_VARIANTS[CHARACTER_KEY]?CHARACTER_KEY:'survivor';
  characterSelect.addEventListener('change',()=>{
    const u=new URL(location.href);u.searchParams.set('character',characterSelect.value);u.searchParams.set('build',String(BUILD_VERSION));location.href=u.toString();
  });
}
$('jurisdictionGo')?.addEventListener('click',()=>{
  const code=jurisdictionSelect?.value||SELECTED_STATE,v=JURISDICTIONS[code]||selectedJurisdiction;
  const u=new URL(location.href);u.searchParams.set('cell','national');u.searchParams.set('state',code);
  u.searchParams.set('lat',String(v[1]));u.searchParams.set('lon',String(v[2]));u.searchParams.set('span_km','3.4');u.searchParams.set('build',String(BUILD_VERSION));
  location.href=u.toString();
});

const MOBILE_GPU_SAFE=matchMedia?.('(pointer:coarse)')?.matches||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent||'');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x68746e);
scene.fog=new THREE.FogExp2(0x69736d,densePreview()?.00019:.00027);

const camera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.08,12000);
camera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',stencil:false});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,MOBILE_GPU_SAFE?1.05:1.35));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.03;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights=true;
root.appendChild(renderer.domElement);

let composer=null,gtaoPass=null,bloomPass=null,postFxMode='renderer';
function initPostProcessing(){
  if(MOBILE_GPU_SAFE){composer=null;gtaoPass=null;bloomPass=null;postFxMode='mobile-filmic';return false}
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

THREE.Cache.enabled=true;
const loader=new GLTFLoader();
const assetPromiseCache=new Map();
let activeAssetLoads=0;const assetLoadWaiters=[];const ASSET_LOAD_LIMIT=MOBILE_GPU_SAFE?2:6;const ASSET_TIMEOUT_MS=MOBILE_GPU_SAFE?5000:20000;
async function acquireAssetSlot(){if(activeAssetLoads<ASSET_LOAD_LIMIT){activeAssetLoads++;return}await new Promise(resolve=>assetLoadWaiters.push(resolve));activeAssetLoads++}
function releaseAssetSlot(){activeAssetLoads=Math.max(0,activeAssetLoads-1);const next=assetLoadWaiters.shift();if(next)next()}
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
let parcelLayer,partsLayer,buildingLayer,roadLayer,terrainLayer,instantMassingLayer=null,instantMassingMesh=null;
let hemi,sun,lightMode=0;
let playerRoot=null,playerVisualRoot=null,playerMixer=null,playerClips=[],playerAction=null,playerVisualBaseScaleZ=1;
let playerModelYawOffset=0,playerAssetLoaded=false,playerAssetMode='fallback';
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
let equipmentMounts={rightHand:null,leftHand:null,hip:null,backGun:null,backMelee:null,activeGrip:null};
let activeSlot='melee',activeWeapon='Axe',aiming=false,fireCooldown=0,muzzleFlash=0;
const weaponRaycaster=new THREE.Raycaster();
let weaponRegistry=new Map(),weaponRegistryMode='fallback',weaponRegistryError=null;
let characterWeaponTemplates={},aimBones={};
let ammoState={Pistol:12,Rifle:20,Shotgun:6,SMG:32};
let reserveAmmo={Pistol:48,Rifle:100,Shotgun:30,SMG:160};
let reloadState={active:false,weapon:null,startedAt:0,endsAt:0};
let recoilPitch=0,recoilYaw=0,fireHeld=false;
let playerDead=false,kills=0;
let audioCtx=null,audioMaster=null,lastFootstepAt=0;
let worldPickups=[],pickupTemplates={},pickupSeq=0;
let waveNumber=0,nextWaveAt=0,maxActiveZombies=MOBILE_GPU_SAFE?Math.min(18,ENDLESS_ACTIVE_CAP):ENDLESS_ACTIVE_CAP;
let zombieTemplate=null,zombieTemplates=[],enemyArchetypes=[];
let mobileMove={x:0,y:0},mobileSprint=false,mobileInputMode='pointer-fallback',nippleManager=null;
let interiorMode=false,activeInterior=null,exteriorReturn=new THREE.Vector3(),exteriorYaw=0;
let interiorWalls=[],interiorContainers=[],interiorBounds=null,interiorExit=null,interiorFloorLinks=[],interiorStairs=[],interiorTemplates={},interiorLootedKeys=new Set();
let streetLifeStats={trees:0,bikes:0,vehicles:0,props:0,grass:0,benches:0,planters:0,backgroundTrees:0,shrubs:0,drivable:0};
let drivableVehicles=[],activeVehicle=null;

// Horizon 3050 systems inspired by the expanded survival design:
// source-aligned dressing, decay shaders, tactical movement, doors, repair,
// match rules, progression, local faction claims and spectator play.
let sceneFetchAttempts=0,sceneFetchError=null;
let decayPatchedMaterials=0,smartSnappedProps=0,openSpaceProps=0;
let flashlight=null,flashlightTarget=null,flashlightOn=false,autoDayNight=true,lastAtmosphereUpdate=0;
let slideTime=0,leanAmount=0,leanTarget=0,lastVaultAt=0,reticleSpread=10,locomotionIntent='idle',lastGrounded=true,ambientSmoke=[];
let doorAnimations=[],doorSystemCount=0,lastDoorStreamAt=0;
let xp=0,battleTier=0,livesRemaining=3,spectatorMode=false,spectatorIndex=0,lastSpectatorSwitch=0;
let claimedBaseId=null,factionId='SURVIVORS',factionColor='#47e285',factionBanner=null;
let matchMode=['survival','skirmish','year365'].includes(String(params.get('mode')||'survival').toLowerCase())?String(params.get('mode')||'survival').toLowerCase():'survival';
let matchRadius=Infinity,matchCenter=new THREE.Vector2(),matchRing=null;
const MATCH_SEASON_START=Date.UTC(2026,8,12);
const MODERATION_BLOCKLIST=['slur_placeholder_disabled'];
const cosmeticUnlocks=new Set();

let RAPIER=null,physicsWorld=null,physicsReady=false,physicsMode='manual-fallback',physicsError=null;
let playerPhysicsBody=null,playerPhysicsCollider=null,characterController=null,terrainPhysicsCollider=null,terrainSafetyRescues=0;
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
let worldMapOpen=false,worldMapZoom=1,mapMarkerType='loot',mapMarkers=[];
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
    installWeaponRegistry([...DEFAULT_WEAPON_CONFIGS,...payload.weapons],'supabase');
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
      const boundaryTemplate=zombieTemplate?.template||zombieTemplate;
      const n=normalizedModel(boundaryTemplate.scene,1.76,true);n.root.position.set(x+(horizontal?0:(edge==='east'?-1:1)),y+(horizontal?(edge==='north'?-1:1):0),z+.02);
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
function normalizeProjectedRing(r){
  const pts=[];
  for(const p of r||[]){
    if(!Array.isArray(p)||p.length<2||!Number.isFinite(+p[0])||!Number.isFinite(+p[1]))continue;
    const q=project(p);if(!Number.isFinite(q.x)||!Number.isFinite(q.y))continue;
    const prev=pts[pts.length-1];
    if(prev&&Math.hypot(prev.x-q.x,prev.y-q.y)<.01)continue;
    pts.push(q);
  }
  if(pts.length>2&&Math.hypot(pts[0].x-pts[pts.length-1].x,pts[0].y-pts[pts.length-1].y)<.01)pts.pop();
  if(pts.length<3)return null;
  let area=0;for(let i=0,j=pts.length-1;i<pts.length;j=i++)area+=pts[j].x*pts[i].y-pts[i].x*pts[j].y;
  if(!Number.isFinite(area)||Math.abs(area)<.08)return null;
  return pts;
}
function shapeFromRing(r){
  const pts=normalizeProjectedRing(r);if(!pts)return null;
  const s=new THREE.Shape();s.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++)s.lineTo(pts[i].x,pts[i].y);
  s.closePath();return s;
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
  if(MAP_PRESET)return MAP_PRESET.name.toUpperCase()+' · '+MAP_PRESET.size+' BRIDGEPOINT MAP';
  if(PREVIEW_KEY==='city')return'DENSE CITY · MANHATTAN SURVIVAL CELL';
  if(PREVIEW_KEY==='mountain')return'MOUNTAIN TOWN · ASPEN SURVIVAL CELL';
  if(PREVIEW_KEY==='coastal')return'WATERFRONT SUBURB · SEATTLE SURVIVAL CELL';
  if(CELL==='manhattan')return'DOWNTOWN MANHATTAN · SURVIVAL CELL';
  if(CELL==='middletown')return'MIDDLETOWN · NEIGHBORHOOD CELL';
  return (JURISDICTIONS[SELECTED_STATE]?.[0]||SELECTED_STATE).toUpperCase()+' · NATIONAL STREAM CELL';
}
function worldCellTitle(){
  if(MAP_PRESET)return MAP_PRESET.name+' · endless horde';
  if(PREVIEW_KEY==='city')return'Manhattan after collapse';
  if(PREVIEW_KEY==='mountain')return'Aspen after collapse';
  if(PREVIEW_KEY==='coastal')return'Waterfront suburb after collapse';
  if(CELL==='manhattan')return'Downtown Manhattan survivor';
  if(CELL==='middletown')return'Neighborhood survivor';
  return (JURISDICTIONS[SELECTED_STATE]?.[0]||SELECTED_STATE)+' survivor';
}
function worldRequestUrl(){
  const u=new URL(ENDPOINT);
  if(CELL==='national'){
    u.searchParams.set('state',SELECTED_STATE);u.searchParams.set('lat',String(STREAM_LAT));u.searchParams.set('lon',String(STREAM_LON));u.searchParams.set('span_km',String(STREAM_SPAN));u.searchParams.set('cell_id','HORIZON_MAP_'+MAP_PRESET.id.toUpperCase());
  }else u.searchParams.set('cell',CELL);
  return u.toString();
}
async function fetchSceneWithRetry(url,attempts=3){
  let last=null;
  // Prefer deploy-time prewarmed BridgePoint snapshots. They are same-origin static files,
  // so map selection does not wait on a live database function every time.
  const presetMatch=Math.abs(STREAM_LAT-Number(MAP_PRESET.lat||0))<1e-5&&Math.abs(STREAM_LON-Number(MAP_PRESET.lon||0))<1e-5&&Math.abs(STREAM_SPAN-Number(MAP_PRESET.span||0))<1e-5;
  if(CELL==='national'&&presetMatch){
    try{
      const r=await fetch('/app/horizon/maps/'+encodeURIComponent(MAP_PRESET.id)+'.json',{cache:'force-cache'});
      if(r.ok){
        const body=await r.json();
        if(body?.complete){sceneFetchAttempts=0;sceneFetchError=null;streetLifeStats.staticMapCache=true;return body}
      }
    }catch(_){}
  }
  // Reopening or switching back to a map should not redownload the same BridgePoint cell.
  if('caches'in globalThis){
    try{
      const cache=await caches.open('bp-horizon-scenes-v4223'),hit=await cache.match(url);
      if(hit){
        const body=await hit.clone().json();
        if(body?.complete){sceneFetchAttempts=0;sceneFetchError=null;return body}
      }
    }catch(_){}
  }
  for(let i=1;i<=attempts;i++){
    sceneFetchAttempts=i;
    try{
      const r=await fetch(url,{headers:{accept:'application/json'},cache:'default'});
      const copy=r.clone();
      let body=null;try{body=await r.json()}catch(_){}
      if(r.ok&&body?.complete){
        sceneFetchError=null;
        if('caches'in globalThis)try{const cache=await caches.open('bp-horizon-scenes-v4223');await cache.put(url,copy)}catch(_){}
        return body
      }
      const detail=body?.error?': '+String(body.error).slice(0,240):'';
      throw new Error('Horizon scene endpoint returned '+r.status+detail);
    }catch(e){
      last=e;sceneFetchError=String(e?.message||e);
      if(i<attempts){
        loadText.textContent='World stream retry '+(i+1)+' / '+attempts+'…';
        await new Promise(resolve=>setTimeout(resolve,220*i*i));
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
function ensureTerrainPhysicsCollider(){
  if(!physicsReady||!terrainLayer?.geometry)return false;
  if(terrainPhysicsCollider)return true;
  terrainPhysicsCollider=addStaticPhysicsGeometry(terrainLayer.geometry,'terrain-runtime-safety',.96);
  return Boolean(terrainPhysicsCollider);
}
function createPlayerPhysics(){
  if(!physicsReady||!playerRoot)return false;
  ensureTerrainPhysicsCollider();
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
  if(playerVisualRoot)playerVisualRoot.scale.z=playerVisualBaseScaleZ;
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
  const minSurface=surfaceZXY(next.x,next.y)+.015;
  let rootZ=next.z-PHYSICS_PLAYER_CENTER;
  // Hard invariant: outside, the survivor can never resolve below the BridgePoint
  // terrain/road surface. This remains active even if Rapier finishes loading after
  // terrain construction or a trimesh collider misses a frame.
  if(!Number.isFinite(rootZ)||rootZ<minSurface-.035){
    rootZ=minSurface;verticalVelocity=-.12;grounded=true;terrainSafetyRescues++;
    const safe={x:next.x,y:next.y,z:rootZ+PHYSICS_PLAYER_CENTER};
    playerPhysicsBody.setNextKinematicTranslation(safe);
    playerPhysicsBody.setTranslation(safe,true);
    try{physicsWorld.propagateModifiedBodyPositionsToColliders()}catch(_){}
  }
  playerRoot.position.set(next.x,next.y,Math.max(rootZ,minSurface));
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
    mesh.receiveShadow=true;terrainLayer=mesh;worldGroup.add(mesh);terrainPhysicsCollider=addStaticPhysicsGeometry(mesh.geometry,'terrain-flat',.96)||terrainPhysicsCollider;return;
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
  terrainLayer.receiveShadow=true;worldGroup.add(terrainLayer);terrainPhysicsCollider=addStaticPhysicsGeometry(g,'terrain-3dep',.96)||terrainPhysicsCollider;
}

function buildApocalypseGroundDressing(){
  if(!roadAnchors.length)return 0;
  const group=new THREE.Group();group.name='apocalypse-ground-dressing';artGroup.add(group);
  const dense=densePreview(),rubbleTarget=dense?360:170,puddleTarget=dense?85:38,paperTarget=dense?190:85;
  const rubbleGeo=new THREE.BoxGeometry(1,1,1),rubbleMat=new THREE.MeshStandardMaterial({color:0x55524b,roughness:.96,metalness:.02});
  const rubble=new THREE.InstancedMesh(rubbleGeo,rubbleMat,rubbleTarget),dummy=new THREE.Object3D();let rc=0;
  for(let i=0;i<rubbleTarget*3&&rc<rubbleTarget;i++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],side=rand()>.5?1:-1,p=roadSidePoint(a,a.width/2+(.3+rand()*2.4),side);
    if(isBlockedExterior(p.x,p.y,.18))continue;
    const sx=.10+rand()*.65,sy=.08+rand()*.52,sz=.035+rand()*.22;
    dummy.position.set(p.x,p.y,p.z+sz*.5+.015);dummy.rotation.set((rand()-.5)*.22,(rand()-.5)*.22,rand()*Math.PI);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();rubble.setMatrixAt(rc++,dummy.matrix);
  }
  rubble.count=rc;rubble.instanceMatrix.needsUpdate=true;rubble.castShadow=true;rubble.receiveShadow=true;group.add(rubble);
  const puddleGeo=new THREE.CircleGeometry(1,22),puddleMat=new THREE.MeshPhysicalMaterial({color:0x1d2929,roughness:.12,metalness:.05,transparent:true,opacity:.56,clearcoat:.55,clearcoatRoughness:.18});
  const puddles=new THREE.InstancedMesh(puddleGeo,puddleMat,puddleTarget);let pc=0;
  for(let i=0;i<puddleTarget*3&&pc<puddleTarget;i++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],p=roadSidePoint(a,(rand()-.5)*Math.max(2,a.width*.32),1);
    if(isBlockedExterior(p.x,p.y,.35))continue;
    dummy.position.set(p.x,p.y,p.z+.035);dummy.rotation.set(0,0,rand()*Math.PI);dummy.scale.set(.35+rand()*1.7,.18+rand()*.85,1);dummy.updateMatrix();puddles.setMatrixAt(pc++,dummy.matrix);
  }
  puddles.count=pc;puddles.instanceMatrix.needsUpdate=true;group.add(puddles);
  const paperGeo=new THREE.PlaneGeometry(.34,.24),paperMat=new THREE.MeshStandardMaterial({color:0xb8b0a0,roughness:.9,side:THREE.DoubleSide});
  const papers=new THREE.InstancedMesh(paperGeo,paperMat,paperTarget);let qc=0;
  for(let i=0;i<paperTarget*3&&qc<paperTarget;i++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],p=roadSidePoint(a,a.width/2+rand()*2.1,rand()>.5?1:-1);
    if(isBlockedExterior(p.x,p.y,.1))continue;
    dummy.position.set(p.x,p.y,p.z+.025);dummy.rotation.set((rand()-.5)*.08,(rand()-.5)*.08,rand()*Math.PI*2);dummy.scale.set(.65+rand()*.9,.65+rand()*.9,1);dummy.updateMatrix();papers.setMatrixAt(qc++,dummy.matrix);
  }
  papers.count=qc;papers.instanceMatrix.needsUpdate=true;group.add(papers);
  const crackPos=[];
  for(let i=0;i<(dense?320:140);i++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],x=a.x+(rand()-.5)*a.width*.7,y=a.y+(rand()-.5)*a.width*.7,z=surfaceZXY(x,y)+.045;
    const ang=rand()*Math.PI*2,len=.4+rand()*2.5;crackPos.push(x,y,z,x+Math.cos(ang)*len,y+Math.sin(ang)*len,z+.002);
  }
  const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(crackPos,3));
  group.add(new THREE.LineSegments(cg,new THREE.LineBasicMaterial({color:0x111513,transparent:true,opacity:.48})));
  const weedTarget=dense?720:320,weedGeo=new THREE.ConeGeometry(.055,.48,3),weedMat=new THREE.MeshStandardMaterial({color:0x40583a,roughness:.96});
  const weeds=new THREE.InstancedMesh(weedGeo,weedMat,weedTarget);let wc=0;
  for(let i=0;i<weedTarget*4&&wc<weedTarget;i++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],side=rand()>.5?1:-1,p=roadSidePoint(a,a.width/2+.25+rand()*2.5,side);
    if(isBlockedExterior(p.x,p.y,.09))continue;
    dummy.position.set(p.x,p.y,p.z+.22);dummy.rotation.set(Math.PI/2+(rand()-.5)*.12,(rand()-.5)*.16,rand()*Math.PI);dummy.scale.set(.55+rand()*.8,.6+rand()*1.2,.55+rand()*.8);dummy.updateMatrix();weeds.setMatrixAt(wc++,dummy.matrix);
  }
  weeds.count=wc;weeds.instanceMatrix.needsUpdate=true;weeds.castShadow=false;group.add(weeds);
  streetLifeStats.groundDetails=rc+pc+qc+wc+crackPos.length/6;
  return streetLifeStats.groundDetails;
}

function makeSmokeTexture(){
  const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d'),g=x.createRadialGradient(64,64,8,64,64,62);
  g.addColorStop(0,'rgba(90,92,88,.72)');g.addColorStop(.42,'rgba(65,68,65,.46)');g.addColorStop(1,'rgba(35,38,37,0)');
  x.fillStyle=g;x.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;
}
let smokeTexture=null;
function spawnSmokePlumeAt(x,y,z,scale=1){
  smokeTexture=smokeTexture||makeSmokeTexture();
  const g=new THREE.Group();g.position.set(x,y,z);artGroup.add(g);
  for(let i=0;i<5;i++){
    const mat=new THREE.SpriteMaterial({map:smokeTexture,color:0x6d716c,transparent:true,opacity:.36-i*.035,depthWrite:false});
    const s=new THREE.Sprite(mat);const size=(1.6+i*.8)*scale;s.scale.set(size,size,1);s.position.set((rand()-.5)*.35*scale,(rand()-.5)*.35*scale,i*.72*scale);s.userData.baseZ=s.position.z;s.userData.phase=rand()*Math.PI*2;s.userData.smokeScale=scale;g.add(s);
    ambientSmoke.push(s);
  }
  return g;
}
function updateAmbientSmoke(dt,now){
  for(const s of ambientSmoke){
    if(!s?.parent)continue;
    const sc=s.userData.smokeScale||1,phase=s.userData.phase||0,t=(now*.00018+phase)%1;
    s.position.z=s.userData.baseZ+t*3.4*sc;s.position.x+=Math.sin(now*.0011+phase)*dt*.08*sc;s.position.y+=Math.cos(now*.0009+phase)*dt*.06*sc;
    if(s.material)s.material.opacity=.34*(1-t);
  }
}
function buildDenseApocalypseLayers(){
  if(!roadAnchors.length)return 0;
  const density=Math.max(1,MAP_DENSITY),group=new THREE.Group();group.name='dense-apocalypse-microdetail';artGroup.add(group),d=new THREE.Object3D();
  const fenceCount=Math.min(520,Math.round((densePreview()?210:120)*density)),barCount=Math.min(420,Math.round((densePreview()?150:90)*density));
  const fenceGeo=new THREE.BoxGeometry(2.35,.07,1.25),fenceMat=new THREE.MeshStandardMaterial({color:0x3d403d,roughness:.76,metalness:.34});
  const fences=new THREE.InstancedMesh(fenceGeo,fenceMat,fenceCount);let fc=0;
  for(let i=0;i<fenceCount*4&&fc<fenceCount;i++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],side=rand()>.5?1:-1,p=roadSidePoint(a,a.width/2+2.5+rand()*4.5,side);
    if(isBlockedExterior(p.x,p.y,.55))continue;
    d.position.set(p.x,p.y,p.z+.64);d.rotation.set(0,0,a.heading+(rand()-.5)*.25);d.scale.set(.75+rand()*.8,1,.8+rand()*.55);d.updateMatrix();fences.setMatrixAt(fc++,d.matrix);
  }
  fences.count=fc;fences.instanceMatrix.needsUpdate=true;fences.castShadow=true;group.add(fences);
  const barGeo=new THREE.BoxGeometry(1.8,.42,.72),barMat=new THREE.MeshStandardMaterial({color:0x5a5144,roughness:.93});
  const bars=new THREE.InstancedMesh(barGeo,barMat,barCount);let bc=0;
  for(let i=0;i<barCount*4&&bc<barCount;i++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],p=roadSidePoint(a,(rand()-.5)*Math.max(2,a.width*.72),1);
    if(isBlockedExterior(p.x,p.y,.55))continue;
    d.position.set(p.x,p.y,p.z+.36);d.rotation.set(0,0,a.heading+(rand()-.5)*.7);d.scale.set(.65+rand()*.95,.75+rand()*.8,.75+rand()*.55);d.updateMatrix();bars.setMatrixAt(bc++,d.matrix);
  }
  bars.count=bc;bars.instanceMatrix.needsUpdate=true;bars.castShadow=true;group.add(bars);

  let gazebos=0;const gazeboTarget=Math.max(4,Math.min(18,Math.round(7*density)));
  for(let i=0;i<gazeboTarget*12&&gazebos<gazeboTarget;i++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],side=rand()>.5?1:-1,p=roadSidePoint(a,a.width/2+7+rand()*12,side);
    if(isBlockedExterior(p.x,p.y,2.5))continue;
    const g=new THREE.Group(),postMat=new THREE.MeshStandardMaterial({color:0x50483d,roughness:.92}),roofMat=new THREE.MeshStandardMaterial({color:0x3e403d,roughness:.84,metalness:.08});
    for(const sx of[-1,1])for(const sy of[-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(.14,.14,2.55),postMat);post.position.set(sx*1.35,sy*1.35,1.28);g.add(post)}
    const roof=new THREE.Mesh(new THREE.ConeGeometry(2.25,.82,4),roofMat);roof.position.z=2.92;roof.rotation.z=Math.PI/4;g.add(roof);g.position.set(p.x,p.y,p.z);g.rotation.z=rand()*Math.PI;group.add(g);gazebos++;
  }

  let ponds=0;const pondTarget=MAP_PRESET.waterRing?3:Math.max(4,Math.min(14,Math.round(5*density)));
  const pondMat=new THREE.MeshPhysicalMaterial({color:0x214b52,roughness:.16,metalness:.02,transparent:true,opacity:.72,clearcoat:.7,clearcoatRoughness:.15});
  for(let i=0;i<pondTarget*16&&ponds<pondTarget;i++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],side=rand()>.5?1:-1,p=roadSidePoint(a,a.width/2+11+rand()*24,side);
    if(isBlockedExterior(p.x,p.y,4.5))continue;
    const m=new THREE.Mesh(new THREE.CircleGeometry(1,30),pondMat);m.position.set(p.x,p.y,p.z+.025);m.scale.set(2.8+rand()*6.8,1.7+rand()*4.2,1);m.rotation.z=rand()*Math.PI;group.add(m);ponds++;
  }

  let smoke=0;const smokeTarget=Math.max(7,Math.min(28,Math.round((densePreview()?13:8)*density)));
  for(let i=0;i<smokeTarget*12&&smoke<smokeTarget;i++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],side=rand()>.5?1:-1,p=roadSidePoint(a,a.width/2+1+rand()*5,side);
    if(isBlockedExterior(p.x,p.y,.6))continue;spawnSmokePlumeAt(p.x,p.y,p.z+.35,.8+rand()*1.4);smoke++;
  }

  let gameInfill=0;
  if(Number(data.counts?.buildings||0)<140){
    const target=Math.min(180,140-Number(data.counts?.buildings||0)+45),geo=new THREE.BoxGeometry(1,1,1),mat=new THREE.MeshStandardMaterial({color:0x555953,roughness:.96}),mesh=new THREE.InstancedMesh(geo,mat,target);let n=0;
    for(let i=0;i<target*8&&n<target;i++){
      const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],side=rand()>.5?1:-1,p=roadSidePoint(a,a.width/2+5+rand()*14,side);
      if(isBlockedExterior(p.x,p.y,2.2))continue;
      const w=4+rand()*8,dep=4+rand()*8,h=3+rand()*12;d.position.set(p.x,p.y,p.z+h/2);d.rotation.set(0,0,a.heading+(rand()-.5)*.18);d.scale.set(w,dep,h);d.updateMatrix();mesh.setMatrixAt(n++,d.matrix);
    }
    mesh.count=n;mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);gameInfill=n;
  }
  streetLifeStats.fences=fc;streetLifeStats.barricades=bc;streetLifeStats.gazebos=gazebos;streetLifeStats.ponds=ponds;streetLifeStats.smokePlumes=smoke;streetLifeStats.gameInfillStructures=gameInfill;
  return fc+bc+gazebos+ponds+smoke+gameInfill;
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
function closestPointOnSegment2D(p,a,b){
  const vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy;
  const t=l2>1e-9?THREE.MathUtils.clamp(((p.x-a.x)*vx+(p.y-a.y)*vy)/l2,0,1):0;
  return{x:a.x+vx*t,y:a.y+vy*t,t};
}
function shellRoadAnchor(meta){
  let best=null,d=Infinity,step=Math.max(1,Math.floor(roadAnchors.length/1200));
  for(let i=0;i<roadAnchors.length;i+=step){
    const a=roadAnchors[i],q=(a.x-meta.x)*(a.x-meta.x)+(a.y-meta.y)*(a.y-meta.y);
    if(q<d){d=q;best=a}
  }
  return best||roadAnchors[0]||{x:meta.x,y:meta.y};
}
function addShellBox(group,cx,cy,cz,sx,sy,sz,rot,mat,label,physics=true){
  const g=new THREE.BoxGeometry(Math.max(.02,sx),Math.max(.02,sy),Math.max(.02,sz));
  const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),rot||0);
  const m=new THREE.Matrix4().compose(new THREE.Vector3(cx,cy,cz),q,new THREE.Vector3(1,1,1));g.applyMatrix4(m);
  const mesh=new THREE.Mesh(g,mat);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  if(physics)addStaticPhysicsGeometry(g,label,.86);return mesh;
}
function addShellRamp(group,cx,cy,baseZ,run,rise,rot,label){
  const len=Math.hypot(run,rise),angle=Math.atan2(rise,run),g=new THREE.BoxGeometry(1.42,len,.16);
  const qYaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),rot||0);
  const qPitch=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),angle);
  const q=qYaw.multiply(qPitch),m=new THREE.Matrix4().compose(new THREE.Vector3(cx,cy,baseZ+rise/2),q,new THREE.Vector3(1,1,1));g.applyMatrix4(m);
  const mat=new THREE.MeshStandardMaterial({color:0x474b48,roughness:.92,metalness:.05}),mesh=new THREE.Mesh(g,mat);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);addStaticPhysicsGeometry(g,label,.92);
  const stepMat=new THREE.MeshStandardMaterial({color:0x555954,roughness:.94});
  for(let i=0;i<11;i++){
    const t=(i+.5)/11,ly=-run/2+t*run,lz=baseZ+t*rise;
    const px=cx-Math.sin(rot||0)*ly,py=cy+Math.cos(rot||0)*ly;
    addShellBox(group,px,py,lz,1.48,.25,.075,rot||0,stepMat,label+'-step-'+i,false);
  }
}
const shellGlassMaterial=new THREE.MeshPhysicalMaterial({color:0x9fcbd6,roughness:.04,metalness:0,transparent:true,opacity:.34,transmission:.62,depthWrite:false,side:THREE.DoubleSide});
function prepareDoorMetadata(meta){
  if(meta?.shellEdges?.length&&Number.isFinite(meta.doorX)&&Number.isFinite(meta.doorY))return meta;
  const edges=[];
  for(let i=1;i<(meta.poly||[]).length;i++){const a=meta.poly[i-1],b=meta.poly[i],len=Math.hypot(b.x-a.x,b.y-a.y);if(len>.5)edges.push({a,b,len,angle:Math.atan2(b.y-a.y,b.x-a.x)})}
  if((meta.poly||[]).length>2){const a=meta.poly[meta.poly.length-1],b=meta.poly[0],len=Math.hypot(b.x-a.x,b.y-a.y);if(len>.5)edges.push({a,b,len,angle:Math.atan2(b.y-a.y,b.x-a.x)})}
  const road=shellRoadAnchor(meta);let doorEdge=0,doorPoint={x:meta.x,y:meta.y,t:.5},doorDist=Infinity;
  edges.forEach((e,idx)=>{const p=closestPointOnSegment2D(road,e.a,e.b),d=Math.hypot(p.x-road.x,p.y-road.y);if(d<doorDist){doorDist=d;doorEdge=idx;doorPoint=p}});
  const de=edges[doorEdge];
  if(de){const minT=Math.min(.78/de.len,.42),maxT=1-minT,t=THREE.MathUtils.clamp(doorPoint.t,minT,maxT);doorPoint={x:THREE.MathUtils.lerp(de.a.x,de.b.x,t),y:THREE.MathUtils.lerp(de.a.y,de.b.y,t),t}}
  meta.doorEdgeIndex=doorEdge;meta.doorX=doorPoint.x;meta.doorY=doorPoint.y;meta.doorRot=de?.angle||0;meta.doorGap=1.65;meta.shellEdges=edges;return meta;
}
function hideMassingBuilding(meta){
  if(!instantMassingMesh||!Number.isInteger(meta?.massingIndex))return;
  const z=new THREE.Matrix4().makeScale(.0001,.0001,.0001);instantMassingMesh.setMatrixAt(meta.massingIndex,z);instantMassingMesh.instanceMatrix.needsUpdate=true;
}
function ensureExplorableShell(entry){
  if(!entry?.explorable)return false;
  const meta=buildingCenters.find(b=>b.id===entry.id)||entry;if(meta.shellBuilt){Object.assign(entry,meta);return true}
  prepareDoorMetadata(meta);
  try{
    buildExplorableShell({ring:meta.sourceRing,materialKey:meta.sourceMaterialKey},meta);meta.shellBuilt=true;hideMassingBuilding(meta);Object.assign(entry,meta);
    streetLifeStats.openBuildings=buildingCenters.filter(b=>b.shellBuilt).length;return true;
  }catch(err){meta.shellError=String(err?.message||err);console.warn('lazy open building skipped',meta.id,err);return false}
}
function buildExplorableShell(rec,meta){
  const group=new THREE.Group();group.name='source-open-building-'+meta.id;buildingLayer.add(group);
  const wallMat=buildingMaterials[rec.materialKey]||buildingMaterials.concrete;
  prepareDoorMetadata(meta);
  const edges=meta.shellEdges||[],doorEdge=meta.doorEdgeIndex||0,de=edges[doorEdge];
  const floorH=3.05,floors=Math.min(60,Math.max(1,Math.floor(meta.height/floorH))),stairRun=Math.min(4.8,Math.max(3.4,Math.min(meta.width,meta.depth)*.36));
  meta.openFloors=floors;
  for(let f=0;f<floors;f++){
    const base=meta.z+f*floorH,slabShape=shapeFromRing(rec.ring);
    if(slabShape){
      if(f>0&&floors>1){
        const hw=.92,hy=stairRun*.58,hole=new THREE.Path();
        hole.moveTo(meta.x-hw,meta.y-hy);hole.lineTo(meta.x+hw,meta.y-hy);hole.lineTo(meta.x+hw,meta.y+hy);hole.lineTo(meta.x-hw,meta.y+hy);hole.closePath();slabShape.holes.push(hole);
      }
      const slabGeo=new THREE.ShapeGeometry(slabShape);slabGeo.translate(0,0,base+.035);
      const slab=new THREE.Mesh(slabGeo,new THREE.MeshStandardMaterial({color:f%2?0x4b4b47:0x555049,roughness:.98,side:THREE.DoubleSide}));slab.receiveShadow=true;group.add(slab);addStaticPhysicsGeometry(slabGeo,'open-floor-'+meta.id+'-'+f,.94);
    }
    edges.forEach((e,ei)=>{
      const bays=Math.max(1,Math.min(8,Math.floor(e.len/2.45))),bay=e.len/bays,ux=(e.b.x-e.a.x)/e.len,uy=(e.b.y-e.a.y)/e.len,panes=[];
      for(let bi=0;bi<bays;bi++){
        const centerT=(bi+.5)/bays,cx=THREE.MathUtils.lerp(e.a.x,e.b.x,centerT),cy=THREE.MathUtils.lerp(e.a.y,e.b.y,centerT);
        const doorBay=f===0&&ei===doorEdge&&Math.hypot(cx-meta.doorX,cy-meta.doorY)<bay*.7;
        if(!doorBay)addShellBox(group,cx,cy,base+.34,bay+.025,.18,.68,e.angle,wallMat,'open-wall-low-'+meta.id,false);
        addShellBox(group,cx,cy,base+2.68,bay+.025,.18,.74,e.angle,wallMat,'open-wall-high-'+meta.id,false);
        const leftT=bi/bays,lx=THREE.MathUtils.lerp(e.a.x,e.b.x,leftT),ly=THREE.MathUtils.lerp(e.a.y,e.b.y,leftT);
        addShellBox(group,lx,ly,base+1.52,.22,.22,2.34,e.angle,wallMat,'open-wall-post-'+meta.id,false);
        if(!doorBay){
          const glass=addShellBox(group,cx,cy,base+1.50,Math.max(.55,bay-.32),.035,1.54,e.angle,shellGlassMaterial,'glass-'+meta.id,false);
          glass.userData.breakableGlass=true;glass.userData.sourceBuilding=meta.id;
          glass.userData.edgeFloorKey=meta.id+':'+f+':'+ei;glass.userData.centerX=cx;glass.userData.centerY=cy;panes.push(glass);
        }
      }
      // One mid-height collision guard per edge/floor replaces thousands of pane/post colliders.
      // Breaking any pane on that edge removes its guard, while the visible lower/header wall remains.
      const mx=(e.a.x+e.b.x)/2,my=(e.a.y+e.b.y)/2;
      if(f===0&&ei===doorEdge&&de){
        const p=meta.doorGap/2,doorT=closestPointOnSegment2D({x:meta.doorX,y:meta.doorY},de.a,de.b).t;
        const leftLen=Math.max(0,de.len*doorT-p),rightLen=Math.max(0,de.len*(1-doorT)-p),guards=[];
        if(leftLen>.4){
          const t=(leftLen/2)/de.len,gx=THREE.MathUtils.lerp(de.a.x,de.b.x,t),gy=THREE.MathUtils.lerp(de.a.y,de.b.y,t);
          const gg=new THREE.BoxGeometry(leftLen,.085,1.62),qm=new THREE.Matrix4().compose(new THREE.Vector3(gx,gy,base+1.49),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),e.angle),new THREE.Vector3(1,1,1));gg.applyMatrix4(qm);guards.push({side:-1,collider:addStaticPhysicsGeometry(gg,'window-guard-'+meta.id+'-'+f+'-'+ei+'-l',.2)});
        }
        if(rightLen>.4){
          const t=1-(rightLen/2)/de.len,gx=THREE.MathUtils.lerp(de.a.x,de.b.x,t),gy=THREE.MathUtils.lerp(de.a.y,de.b.y,t);
          const gg=new THREE.BoxGeometry(rightLen,.085,1.62),qm=new THREE.Matrix4().compose(new THREE.Vector3(gx,gy,base+1.49),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),e.angle),new THREE.Vector3(1,1,1));gg.applyMatrix4(qm);guards.push({side:1,collider:addStaticPhysicsGeometry(gg,'window-guard-'+meta.id+'-'+f+'-'+ei+'-r',.2)});
        }
        for(const pane of panes){
          const side=(((pane.userData.centerX||0)-meta.doorX)*(de.b.x-de.a.x)+((pane.userData.centerY||0)-meta.doorY)*(de.b.y-de.a.y))<0?-1:1;
          pane.userData.glassCollider=guards.find(g=>g.side===side)?.collider||null;
        }
      }else{
        const gg=new THREE.BoxGeometry(e.len,.085,1.62),qm=new THREE.Matrix4().compose(new THREE.Vector3(mx,my,base+1.49),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),e.angle),new THREE.Vector3(1,1,1));gg.applyMatrix4(qm);
        const guard=addStaticPhysicsGeometry(gg,'window-guard-'+meta.id+'-'+f+'-'+ei,.2);
        for(const pane of panes)pane.userData.glassCollider=guard;
      }
    });
    if(f<floors-1&&meta.width>6&&meta.depth>6){
      const rot=f%2?Math.PI:0;
      addShellRamp(group,meta.x,meta.y,base+.08,stairRun,floorH-.16,rot,'open-stair-'+meta.id+'-'+f);
    }
  }
  const roofShape=shapeFromRing(rec.ring);
  if(roofShape){
    const roofGeo=new THREE.ShapeGeometry(roofShape);roofGeo.translate(0,0,meta.z+floors*floorH);
    const roof=new THREE.Mesh(roofGeo,new THREE.MeshStandardMaterial({color:0x3f4240,roughness:.96,side:THREE.DoubleSide}));roof.receiveShadow=true;group.add(roof);addStaticPhysicsGeometry(roofGeo,'open-roof-'+meta.id,.9);
  }
  meta.shellBuilt=true;meta.shellGroup=group;return group;
}
function buildInstantBuildingMassing(){
  if(instantMassingLayer){worldGroup.remove(instantMassingLayer);instantMassingLayer=null;instantMassingMesh=null}
  if(!buildingLayer){buildingLayer=new THREE.Group();buildingLayer.name='lazy-source-open-buildings';worldGroup.add(buildingLayer)}
  buildingCenters=[];const rows=[];let ri=0;
  for(const row of data.buildings||[])for(const ring of outerRings(row.geometry)){
    const pts=ring.map(project).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));if(pts.length<3)continue;
    const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
    const center=centerRing(ring),q=project(center),ht=heightFor(row),z=terrainZ(center[0],center[1]),w=Math.max(1.2,maxx-minx),d=Math.max(1.2,maxy-miny),h=Math.max(2.4,ht.h),key=facadeKey(row,ht.h);
    const meta={id:String(row.id||hash(JSON.stringify(center)))+':'+(ri++),x:q.x,y:q.y,z,height:h,minx,maxx,miny,maxy,width:w,depth:d,poly:pts,explorable:w>3.0&&d>3.0&&h>2.6,shellBuilt:false,sourceRing:ring,sourceMaterialKey:key,massingIndex:rows.length};
    rows.push({x:q.x,y:q.y,z,w,d,h,key,meta});buildingCenters.push(meta);
  }
  if(!rows.length)return 0;
  const geo=new THREE.BoxGeometry(1,1,1),mat=new THREE.MeshStandardMaterial({color:0x59615e,roughness:.94,metalness:.03,vertexColors:true});
  const mesh=new THREE.InstancedMesh(geo,mat,rows.length),o=new THREE.Object3D();
  const colors={brick:new THREE.Color(0x66514a),concrete:new THREE.Color(0x666a67),glass:new THREE.Color(0x4b6168),wood:new THREE.Color(0x63594a),metal:new THREE.Color(0x545b59)};
  rows.forEach((b,i)=>{
    o.position.set(b.x,b.y,b.z+b.h*.5);o.rotation.set(0,0,0);o.scale.set(b.w,b.d,b.h);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i,colors[b.key]||colors.concrete);
  });
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=true;mesh.frustumCulled=true;
  instantMassingLayer=new THREE.Group();instantMassingLayer.name='instant-source-building-massing';instantMassingMesh=mesh;instantMassingLayer.add(mesh);worldGroup.add(instantMassingLayer);
  streetLifeStats.instantMassing=rows.length;streetLifeStats.doorableBuildings=buildingCenters.filter(b=>b.explorable).length;return rows.length;
}
function clearInstantBuildingMassing(){
  if(!instantMassingLayer)return;
  worldGroup.remove(instantMassingLayer);
  instantMassingLayer.traverse(o=>{if(o.geometry)o.geometry.dispose?.();if(o.material){const a=Array.isArray(o.material)?o.material:[o.material];for(const m of a)m.dispose?.()}});
  instantMassingLayer=null;
}
function buildBuildings(){
  buildingLayer=new THREE.Group();buildingLayer.name='source-buildings';worldGroup.add(buildingLayer);buildingCenters=[];
  const buckets={brick:[],concrete:[],glass:[],wood:[],metal:[]},records=[];let proxies=0,sourceH=0,ri=0,invalidShapes=0,shellFailures=0;
  for(const row of data.buildings||[])for(const r of outerRings(row.geometry)){
    const shape=shapeFromRing(r);if(!shape){invalidShapes++;continue;}
    const ht=heightFor(row);ht.proxy?proxies++:sourceH++;
    const center=centerRing(r),q=project(center),z=terrainZ(center[0],center[1]),pts=r.map(project).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
    if(pts.length<3)continue;
    const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys),width=maxx-minx,depth=maxy-miny;
    const id=String(row.id||hash(JSON.stringify(center)))+':'+(ri++);
    records.push({row,ring:r,shape,ht,center,q,z,pts,minx,maxx,miny,maxy,width,depth,id,materialKey:facadeKey(row,ht.h)});
  }
  const shellLimit=MAP_PRESET.size==='LARGE'?7:MAP_PRESET.size==='SMALL'?4:5;
  const eligible=records.filter(x=>x.width>6&&x.depth>6&&x.ht.h>5&&Math.hypot(x.q.x,x.q.y)<320);
  const towerSlots=MAP_PRESET.size==='LARGE'?3:2;
  const nearest=[...eligible].sort((a,b)=>(a.q.x*a.q.x+a.q.y*a.q.y)-(b.q.x*b.q.x+b.q.y*b.q.y)).slice(0,Math.max(1,shellLimit-towerSlots));
  const towers=[...eligible].sort((a,b)=>b.ht.h-a.ht.h).slice(0,towerSlots);
  const shellIds=new Set([...nearest,...towers].map(x=>x.id));
  let openCount=0;
  for(const rec of records){
    const meta={id:rec.id,x:rec.q.x,y:rec.q.y,z:rec.z,height:rec.ht.h,minx:rec.minx,maxx:rec.maxx,miny:rec.miny,maxy:rec.maxy,width:rec.width,depth:rec.depth,poly:rec.pts,explorable:shellIds.has(rec.id)};
    if(meta.width>2.8&&meta.depth>2.8)buildingCenters.push(meta);
    if(meta.explorable){
      try{buildExplorableShell(rec,meta);openCount++;continue}
      catch(err){shellFailures++;meta.explorable=false;console.warn('open building shell skipped',meta.id,err)}
    }
    const geo=new THREE.ExtrudeGeometry(rec.shape,{depth:rec.ht.h,bevelEnabled:false,steps:1});geo.translate(0,0,rec.z+.16);geo.computeVertexNormals();buckets[rec.materialKey].push(geo);
  }
  for(const [k,geos] of Object.entries(buckets)){
    if(!geos.length)continue;
    const merged=mergeLocal(geos);if(!merged)continue;
    const mesh=new THREE.Mesh(merged,buildingMaterials[k]);mesh.castShadow=true;mesh.receiveShadow=true;buildingLayer.add(mesh);
    addStaticPhysicsGeometry(merged,'buildings-'+k,.82);for(const g of geos)g.dispose();
  }
  streetLifeStats.openBuildings=openCount;streetLifeStats.invalidShapes=invalidShapes;streetLifeStats.shellFailures=shellFailures;
  loadText.textContent='Geometry ready · '+records.length.toLocaleString()+' valid building shapes · '+openCount+' physically open buildings';
}
function buildFacadeDetails(){
  const candidates=[...buildingCenters].filter(b=>!b.shellBuilt&&b.height>9&&b.width>3&&b.depth>3).sort((a,b)=>b.height-a.height).slice(0,densePreview()?650:220);
  const maxWindows=densePreview()?14000:5200;
  const winGeo=new THREE.BoxGeometry(1,.07,.72);
  const litMat=new THREE.MeshPhysicalMaterial({color:0xa9c9d0,emissive:0x394f47,emissiveIntensity:.34,roughness:.08,metalness:.04,transparent:true,opacity:.48,transmission:.32,depthWrite:true});
  const darkMat=new THREE.MeshPhysicalMaterial({color:0x486069,emissive:0x0c1415,emissiveIntensity:.10,roughness:.10,metalness:.06,transparent:true,opacity:.36,transmission:.42,depthWrite:true});
  const lit=new THREE.InstancedMesh(winGeo,litMat,maxWindows),dark=new THREE.InstancedMesh(winGeo,darkMat,maxWindows);
  const d=new THREE.Object3D();let li=0,di=0,total=0;
  const put=(b,x,y,z,side,litOn,scale)=>{
    if(total>=maxWindows)return false;
    d.position.set(x,y,z);d.rotation.set(0,0,side?Math.PI/2:0);d.scale.set(scale,1,1);d.updateMatrix();
    const target=litOn?lit:dark,idx=litOn?li++:di++;target.setMatrixAt(idx,d.matrix);total++;return true;
  };
  for(const b of candidates){
    const floors=Math.min(60,Math.max(2,Math.floor(b.height/3.05))),step=1;
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
  lit.castShadow=false;dark.castShadow=false;lit.userData.breakableFacade=true;dark.userData.breakableFacade=true;worldGroup.add(lit,dark);

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
  const candidates=[...buildingCenters].filter(b=>b.explorable).map(b=>prepareDoorMetadata(b))
    .sort((a,b)=>(a.x*a.x+a.y*a.y)-(b.x*b.x+b.y*b.y));
  for(const b of candidates){
    const road=nearestRoadForBuilding(b);if(!road)continue;
    buildingEntries.push({
      ...b,entryX:b.doorX,entryY:b.doorY,entryZ:b.z,doorRoot:null,doorPivot:null,doorOpen:false,doorTarget:0,
      seed:hash(b.id+':interior'),returnX:road.x,returnY:road.y,returnZ:road.z
    });
  }
  streetLifeStats.doorableBuildings=buildingEntries.length;
}
function createDoorVisual(e){
  if(!e||e.doorRoot)return Boolean(e?.doorRoot);
  const root=new THREE.Group(),frameMat=new THREE.MeshStandardMaterial({color:0x20231f,roughness:.88,metalness:.12}),glowMat=new THREE.MeshStandardMaterial({color:0x281815,emissive:0x5a160c,emissiveIntensity:.28,roughness:.9});
  const left=new THREE.Mesh(new THREE.BoxGeometry(.15,.18,2.35),frameMat),right=left.clone();left.position.set(-.62,0,1.17);right.position.set(.62,0,1.17);
  const top=new THREE.Mesh(new THREE.BoxGeometry(1.38,.18,.15),frameMat);top.position.set(0,0,2.28);
  const lamp=new THREE.Mesh(new THREE.BoxGeometry(.18,.12,.18),glowMat);lamp.position.set(0,-.12,2.05);root.add(left,right,top,lamp);
  root.position.set(e.entryX,e.entryY,e.entryZ);root.rotation.z=e.doorRot||0;entryGroup.add(root);e.doorRoot=root;
  const doorMat=new THREE.MeshStandardMaterial({color:0x4c4032,roughness:.88,metalness:.03}),pivot=new THREE.Group();pivot.position.set(-.54,-.02,0);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.08,.10,2.08),doorMat);door.position.set(.54,0,1.04);door.castShadow=true;
  const knob=new THREE.Mesh(new THREE.SphereGeometry(.055,7,5),new THREE.MeshStandardMaterial({color:0x9d8756,metalness:.5,roughness:.4}));knob.position.set(.92,-.075,1.05);door.add(knob);pivot.add(door);root.add(pivot);
  e.doorPivot=pivot;pivot.rotation.z=e.doorTarget||0;
  if(!e.doorOpen&&physicsReady&&RAPIER&&physicsWorld){
    try{
      const q={x:0,y:0,z:Math.sin((e.doorRot||0)/2),w:Math.cos((e.doorRot||0)/2)};
      e.doorCollider=physicsWorld.createCollider(RAPIER.ColliderDesc.cuboid(.56,.08,1.04).setTranslation(e.entryX,e.entryY,e.entryZ+1.04).setRotation(q).setFriction(.65));
      e.doorCollider.userData={label:'interactive-door-'+e.id};
    }catch(err){console.warn('door collider skipped',e.id,err)}
  }
  if(!doorAnimations.includes(e))doorAnimations.push(e);return true;
}
function destroyDoorVisual(e){
  if(!e?.doorRoot||e.doorOpen||String(e.id||e.seed)===String(claimedBaseId||''))return;
  if(e.doorCollider&&physicsWorld){try{physicsWorld.removeCollider(e.doorCollider,true)}catch(_){}e.doorCollider=null}
  e.doorRoot.parent?.remove(e.doorRoot);e.doorRoot=null;e.doorPivot=null;
}
function updateDoorStreaming(now=performance.now(),force=false){
  if(!playerRoot||interiorMode)return;
  if(!force&&now-lastDoorStreamAt<450)return;lastDoorStreamAt=now;
  const near=[];
  for(const e of buildingEntries){
    const d=Math.hypot(playerRoot.position.x-e.entryX,playerRoot.position.y-e.entryY);
    if(d<150)near.push([d,e]);else if(d>230)destroyDoorVisual(e);
  }
  near.sort((a,b)=>a[0]-b[0]);
  for(let i=0;i<Math.min(150,near.length);i++)createDoorVisual(near[i][1]);
  streetLifeStats.activeDoorVisuals=buildingEntries.filter(e=>e.doorRoot).length;
}
function installInteractiveDoors(){
  doorAnimations=[];doorSystemCount=buildingEntries.length;updateDoorStreaming(performance.now(),true);return doorSystemCount;
}
function openDoor(entry,kicked=false){
  if(!entry)return false;
  if(!entry.doorPivot)createDoorVisual(entry);
  if(!entry?.doorPivot)return false;
  if(entry.explorable&&!ensureExplorableShell(entry)){showToast('Building interior still streaming');return false}
  entry.doorOpen=true;entry.doorTarget=kicked?-1.48:-1.18;
  if(entry.doorCollider&&physicsWorld){try{physicsWorld.removeCollider(entry.doorCollider,true)}catch(_){}entry.doorCollider=null}
  showToast(kicked?'Door kicked open':'Door opened');return true;
}
function shatterFacadeGlass(mesh,instanceId){
  if(!mesh?.userData?.breakableFacade||instanceId==null)return false;
  const zero=new THREE.Matrix4().makeScale(.0001,.0001,.0001);mesh.setMatrixAt(instanceId,zero);mesh.instanceMatrix.needsUpdate=true;
  showToast('Window shattered');return true;
}
function shatterGlass(mesh){
  if(!mesh?.userData?.breakableGlass)return false;
  const p=new THREE.Vector3();mesh.getWorldPosition(p);
  if(mesh.userData.glassCollider&&physicsWorld){
    const guard=mesh.userData.glassCollider;
    try{physicsWorld.removeCollider(guard,true)}catch(_){}
    const key=mesh.userData.edgeFloorKey;
    if(key)scene.traverse(o=>{if(o.userData?.edgeFloorKey===key)o.userData.glassCollider=null});
    mesh.userData.glassCollider=null;
  }
  mesh.parent?.remove(mesh);
  ensureAudio();showToast('Glass shattered');
  return true;
}
function breakNearestGlass(){
  if(!interiorMode||!playerRoot)return false;let best=null,d=2.25;
  interiorGroup.traverse(o=>{if(!o.userData?.breakableGlass)return;const p=new THREE.Vector3();o.getWorldPosition(p);const q=Math.hypot(p.x-playerRoot.position.x,p.y-playerRoot.position.y);if(q<d){d=q;best=o}});
  return best?shatterGlass(best):false;
}
function kickNearestDoor(){
  if(!playerRoot)return false;
  if(interiorMode)return breakNearestGlass();
  let best=null,d=2.55;
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
    const sidewalk=new THREE.Mesh(sidewalkGeo,new THREE.MeshStandardMaterial({map:wallTex,color:0x77766f,roughness:1,metalness:0}));
    sidewalk.receiveShadow=true;roadLayer.add(sidewalk);addStaticPhysicsGeometry(sidewalkGeo,'sidewalks',.96);
  }
  const curbGeo=buildStrips(roads,2.3,.155);
  if(curbGeo){
    const curb=new THREE.Mesh(curbGeo,new THREE.MeshStandardMaterial({map:wallTex,color:0x5f625e,roughness:.98}));
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
function buildWaterfrontPerimeter(){
  if(!MAP_PRESET?.waterRing)return 0;
  const inner=Math.max(150,STREAM_SPAN*1000*.34),outer=Math.max(inner+450,STREAM_SPAN*1000*.95);
  const g=new THREE.RingGeometry(inner,outer,128,3);
  const mat=new THREE.MeshPhysicalMaterial({color:0x214f5b,roughness:.16,metalness:.02,transparent:true,opacity:.86,clearcoat:.45,clearcoatRoughness:.2});
  const mesh=new THREE.Mesh(g,mat);mesh.position.z=baseElevation?-.12:.08;mesh.receiveShadow=true;worldGroup.add(mesh);
  streetLifeStats.waterPerimeter=1;return 1;
}
function addLights(){
  hemi=new THREE.HemisphereLight(0xdce9df,0x283125,1.15);scene.add(hemi);
  sun=new THREE.DirectionalLight(0xffefd0,2.65);sun.position.set(-900,-650,1500);sun.castShadow=true;sun.shadow.mapSize.set(MOBILE_GPU_SAFE?1024:1536,MOBILE_GPU_SAFE?1024:1536);
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
  if(!url)return null;
  if(assetPromiseCache.has(url))return await assetPromiseCache.get(url);
  const p=(async()=>{
    await acquireAssetSlot();
    try{
      const timeout=new Promise(resolve=>setTimeout(()=>resolve(null),ASSET_TIMEOUT_MS));
      const loaded=await Promise.race([loader.loadAsync(url).catch(()=>null),timeout]);
      if(!loaded)console.warn('Asset load timed out/failed',url);
      return loaded;
    }catch(e){console.warn('Asset load failed',url,e);return null}
    finally{releaseAssetSlot()}
  })();
  assetPromiseCache.set(url,p);
  const out=await p;
  if(!out)assetPromiseCache.delete(url);
  return out;
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
  const root=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0x39473d,roughness:.82}),skin=new THREE.MeshStandardMaterial({color:0x9b806c,roughness:.85});
  const pelvis=new THREE.Group();pelvis.name='pelvis';pelvis.position.z=.92;root.add(pelvis);
  const spine=new THREE.Group();spine.name='spine_03';spine.position.z=.42;pelvis.add(spine);
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.30,.72,4,8),mat);body.position.z=.08;body.rotation.x=Math.PI/2;spine.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.23,12,10),skin);head.position.z=.76;spine.add(head);
  const makeArm=(side,name)=>{
    const upper=new THREE.Group();upper.name='upperarm_'+name;upper.position.set(.31*side,.01,.34);spine.add(upper);
    const lower=new THREE.Group();lower.name='lowerarm_'+name;lower.position.set(.22*side,0,-.18);upper.add(lower);
    const hand=new THREE.Group();hand.name='hand_'+name;hand.position.set(.20*side,.03,-.22);lower.add(hand);
    const armMesh=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.44,3,6),mat);armMesh.rotation.x=Math.PI/2;armMesh.position.set(.11*side,0,-.10);upper.add(armMesh);
    const handMesh=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),skin);hand.add(handMesh);return hand;
  };
  makeArm(1,'r');makeArm(-1,'l');return root;
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
  // Prefer the actual palm/wrist. Mesh2Motion uses hand_r/hand_l; the old code
  // accidentally searched a middle-finger bone first and often fell back to playerRoot.
  const right=modelRoot?.getObjectByName('hand_r')||modelRoot?.getObjectByName('Hand.R')||modelRoot?.getObjectByName('mixamorigRightHand')||modelRoot?.getObjectByName('RightHand')||modelRoot?.getObjectByName('lowerarm_r')||modelRoot?.getObjectByName('LowerArm.R')||findBoneByHints(modelRoot,['hand_r','hand.r','righthand','mixamorigright','lowerarm_r','lowerarm.r']);
  const left=modelRoot?.getObjectByName('hand_l')||modelRoot?.getObjectByName('Hand.L')||modelRoot?.getObjectByName('mixamorigLeftHand')||modelRoot?.getObjectByName('LeftHand')||modelRoot?.getObjectByName('lowerarm_l')||modelRoot?.getObjectByName('LowerArm.L')||findBoneByHints(modelRoot,['hand_l','hand.l','lefthand','mixamorigleft','lowerarm_l','lowerarm.l']);
  const hips=modelRoot?.getObjectByName('pelvis')||modelRoot?.getObjectByName('Hips')||modelRoot?.getObjectByName('mixamorigHips')||findBoneByHints(modelRoot,['pelvis','hips','mixamorighips']);
  const torso=modelRoot?.getObjectByName('spine_03')||modelRoot?.getObjectByName('Torso')||modelRoot?.getObjectByName('Abdomen')||modelRoot?.getObjectByName('mixamorigSpine2')||modelRoot?.getObjectByName('Spine2')||findBoneByHints(modelRoot,['spine_03','torso','abdomen','spine2','mixamorigspine']);
  const upperR=modelRoot?.getObjectByName('upperarm_r')||modelRoot?.getObjectByName('UpperArm.R')||modelRoot?.getObjectByName('mixamorigRightArm')||findBoneByHints(modelRoot,['upperarm_r','upperarm.r','rightarm','mixamorigrightarm']);
  const upperL=modelRoot?.getObjectByName('upperarm_l')||modelRoot?.getObjectByName('UpperArm.L')||modelRoot?.getObjectByName('mixamorigLeftArm')||findBoneByHints(modelRoot,['upperarm_l','upperarm.l','leftarm','mixamorigleftarm']);
  const lowerR=modelRoot?.getObjectByName('lowerarm_r')||modelRoot?.getObjectByName('LowerArm.R')||modelRoot?.getObjectByName('mixamorigRightForeArm')||findBoneByHints(modelRoot,['lowerarm_r','lowerarm.r','rightforearm','mixamorigrightforearm']);
  const lowerL=modelRoot?.getObjectByName('lowerarm_l')||modelRoot?.getObjectByName('LowerArm.L')||modelRoot?.getObjectByName('mixamorigLeftForeArm')||findBoneByHints(modelRoot,['lowerarm_l','lowerarm.l','leftforearm','mixamorigleftforearm']);

  equipmentMounts.rightHand=makeMount(right||playerRoot);
  equipmentMounts.leftHand=makeMount(left||playerRoot);
  // Holsters now follow the animated skeleton instead of floating in player-root/chest space.
  equipmentMounts.hip=makeMount(hips||playerRoot,[.17,.035,-.02],[0,.18,-1.10]);
  equipmentMounts.backGun=makeMount(torso||playerRoot,[0,-.055,-.13],[.18,1.42,.12]);
  equipmentMounts.backMelee=makeMount(torso||playerRoot,[-.09,-.045,-.11],[.10,1.35,-.55]);
  // A root-level grip is deliberately kept in addition to bone sockets. It guarantees that
  // an equipped weapon is visibly DRAWN even on third-party rigs whose hand axes differ.
  equipmentMounts.activeGrip=makeMount(right||playerRoot);
  equipmentMounts.activeGrip.userData.handSocket=Boolean(right);
  equipmentMounts.activeGrip.userData.socketBone=right?.name||'playerRoot';

  aimBones={torso,upperR,upperL,lowerR,lowerL};
}
function hasRenderableWeapon(obj){
  if(!obj)return false;let meshes=0;
  obj.traverse(o=>{if(o.isMesh&&o.geometry?.attributes?.position?.count>2)meshes++});
  return meshes>0;
}
function cloneCharacterWeapon(name){
  const t=characterWeaponTemplates[name];
  if(!t)return null;
  const obj=t.clone(true);obj.visible=true;
  obj.traverse(o=>{o.visible=true;if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  if(!hasRenderableWeapon(obj))return null;
  const target={Axe:.68,Knife:.34,Pistol:.32,Rifle:1.02,Shotgun:.92,SMG:.72,Spear:1.35,WoodenBat_Barbed:.88,WoodenBat_Saw:.88}[name];
  if(target){
    obj.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(obj),size=new THREE.Vector3();box.getSize(size);
    const longest=Math.max(size.x,size.y,size.z,.001);
    if(!Number.isFinite(longest)||longest<.005)return null;
    obj.scale.multiplyScalar(target/longest);
  }
  return obj;
}
function putCharacterWeapon(slot,name,mode='leftHand'){
  const m=equipmentMounts[slot];if(!m)return null;
  clearMount(m);if(!name)return null;
  if(mode==='leftHand'||mode==='rightHand'){
    let obj=cloneCharacterWeapon(name);
    if(!obj){
      const key=name==='WoodenBat_Barbed'?'bat':name==='WoodenBat_Saw'?'sawBat':name==='Axe'?'axe':name==='Knife'?'knife':name==='Pistol'?'pistol':name==='Rifle'?'rifle':name==='Shotgun'?'shotgun':name==='SMG'?'smg':name==='Spear'?'spear':name==='Guitar'?'guitar':null;
      const len=name==='Pistol'?.33:name==='Rifle'?1.02:name==='Shotgun'?.92:name==='SMG'?.72:name==='Spear'?1.35:name==='Guitar'?.82:name==='Axe'?.66:name==='Knife'?.34:.88;
      if(key)obj=propCloneByLength(weaponTemplates[key],len);
    }
    if(!obj)return null;
    if(mode==='rightHand'){
      obj.position.x*=-1;
      const q=obj.quaternion.clone();obj.quaternion.set(q.x,-q.y,-q.z,q.w);
    }
    m.add(obj);return obj;
  }
  const authored=cloneCharacterWeapon(name);
  const key=name==='WoodenBat_Barbed'?'bat':name==='WoodenBat_Saw'?'sawBat':name==='Axe'?'axe':name==='Knife'?'knife':name==='Pistol'?'pistol':name==='Rifle'?'rifle':name==='Shotgun'?'shotgun':name==='SMG'?'smg':name==='Spear'?'spear':name==='Guitar'?'guitar':null;
  const len=name==='Pistol'?.33:name==='Rifle'?1.02:name==='Shotgun'?.92:name==='SMG'?.72:name==='Spear'?1.35:name==='Guitar'?.82:name==='Axe'?.66:name==='Knife'?.34:.88;
  const obj=authored||(key?propCloneByLength(weaponTemplates[key],len):null);if(!obj)return null;
  obj.position.set(0,0,0);
  if(mode==='hip')obj.rotation.set(.12,.08,-1.18);
  if(mode==='backGun')obj.rotation.set(.12,.03,1.50);
  if(mode==='backMelee')obj.rotation.set(.10,.05,-.70);
  m.add(obj);return obj;
}
function fallbackHeldWeapon(name){
  const g=new THREE.Group(),dark=new THREE.MeshStandardMaterial({color:0x202522,roughness:.48,metalness:.35}),wood=new THREE.MeshStandardMaterial({color:0x4f3424,roughness:.82});
  if(isFirearm(name)){
    const len=name==='Pistol'?.34:name==='Shotgun'?.92:name==='Rifle'?1.04:.72;
    const body=new THREE.Mesh(new THREE.BoxGeometry(.12,len,.12),dark);body.position.y=len*.44;
    const grip=new THREE.Mesh(new THREE.BoxGeometry(.10,.18,.14),dark);grip.position.set(.02,.12,-.11);grip.rotation.x=-.35;g.add(body,grip);
  }else{
    const len=name==='Knife'?.34:name==='Spear'?1.35:.72;
    const handle=new THREE.Mesh(new THREE.CylinderGeometry(.035,.04,len*.62,8),wood);handle.rotation.x=Math.PI/2;handle.position.y=len*.22;
    const head=new THREE.Mesh(name==='Knife'?new THREE.BoxGeometry(.045,len*.38,.012):new THREE.BoxGeometry(.24,.13,.055),dark);head.position.y=len*.57;g.add(handle,head);
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g;
}
function putActiveGripWeapon(name){
  const m=equipmentMounts.activeGrip;if(!m)return null;clearMount(m);if(!name||name==='Fists')return null;
  let obj=cloneCharacterWeapon(name);
  if(!obj){
    const key=name==='Barbed Bat'?'bat':name==='Saw Bat'?'sawBat':name==='Axe'?'axe':name==='Knife'?'knife':name==='Pistol'?'pistol':name==='Rifle'?'rifle':name==='Shotgun'?'shotgun':name==='SMG'?'smg':name==='Spear'?'spear':name==='Guitar'?'guitar':null;
    const len=name==='Pistol'?.33:name==='Rifle'?1.02:name==='Shotgun'?.92:name==='SMG'?.72:name==='Spear'?1.35:name==='Guitar'?.82:name==='Axe'?.66:name==='Knife'?.34:.88;
    if(key)obj=propCloneByLength(weaponTemplates[key],len);
  }
  if(!hasRenderableWeapon(obj))obj=null;
  obj=obj||fallbackHeldWeapon(name);
  if(!hasRenderableWeapon(obj))return null;
  const gun=isFirearm(name),two=Boolean(weaponCfg(name).two_handed),handSocket=Boolean(m.userData.handSocket);
  // Follow the animated hand when the rig exposes one; only use root-space as a fallback.
  if(handSocket){
    m.position.set(0,0,0);m.rotation.set(0,0,0);
    obj.position.set(gun?.02:.015,gun?.035:.02,gun?.02:0);
    obj.rotation.set(gun?(two?-.10:-.05):.04,gun?0:.04,gun?(two?-.06:-.10):-.12);
  }else if(gun){
    m.position.set(two?.10:.25,.22,two?1.28:1.22);m.rotation.set(.02,0,two?-.04:-.10);
    obj.position.set(0,0,0);obj.rotation.set(two?-.06:.02,0,two?.02:.06);
  }else{
    m.position.set(.30,.12,1.08);m.rotation.set(.04,0,-.10);
    obj.position.set(0,0,0);obj.rotation.set(.04,0,-.04);
  }
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
  const current=activeItemForSlot(activeSlot)||equipment.melee||equipment.offhand||equipment.sidearm||equipment.primary||'Fists';
  activeWeapon=current;equippedWeaponName=current;

  // Draw the active weapon every time a slot is selected. Bone sockets still carry
  // holstered items, while activeGrip guarantees a clearly visible held weapon.
  putActiveGripWeapon(current);
  if(isFirearm(current)){
    if(equipment.melee){
      const stow=equipment.melee==='Barbed Bat'?'WoodenBat_Barbed':equipment.melee==='Saw Bat'?'WoodenBat_Saw':equipment.melee==='Saw Bat'?'WoodenBat_Saw':equipment.melee;
      putCharacterWeapon('backMelee',stow,'backMelee');
    }
  }else if(activeSlot==='offhand'){
    if(equipment.melee)putCharacterWeapon('backMelee',equipment.melee==='Barbed Bat'?'WoodenBat_Barbed':equipment.melee==='Saw Bat'?'WoodenBat_Saw':equipment.melee,'backMelee');
  }else{
    if(equipment.offhand&&activeSlot!=='offhand')putCharacterWeapon('leftHand',equipment.offhand,'leftHand');
  }

  if(equipment.sidearm&&activeSlot!=='sidearm')putCharacterWeapon('hip',equipment.sidearm,'hip');
  if(equipment.primary&&activeSlot!=='primary')putCharacterWeapon('backGun',equipment.primary,'backGun');
  weaponPivot=equipmentMounts.activeGrip|| (isFirearm(current)?equipmentMounts.leftHand:equipmentMounts.rightHand);
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
  if(!slots.length){activeSlot='melee';activeWeapon='Fists';equippedWeaponName='Fists';refreshEquipmentVisuals();updateInventory();return}
  const i=Math.max(0,slots.indexOf(activeSlot));selectSlot(slots[(i+1)%slots.length]);
}
function equipInventoryWeapon(item){
  const cfg=weaponRegistry.get(item)||weaponRegistry.get(String(item||'').toLowerCase());
  if(!cfg||!inventory[item])return false;
  const slot=cfg.equip_slot;
  if(!['melee','offhand','sidearm','primary'].includes(slot))return false;
  equipment[slot]=item;activeSlot=slot;activeWeapon=item;equippedWeaponName=item;aiming=false;
  refreshEquipmentVisuals();updateInventory();showToast('Equipped '+item);return true;
}
function dropActiveWeapon(){
  const item=activeItemForSlot(activeSlot);
  if(!item||item==='Fists'){showToast('Nothing equipped to drop');return false}
  const cfg=weaponCfg(item),slot=activeSlot;
  const heading=(playerRoot?.rotation.z||0)-playerModelYawOffset;
  const x=(playerRoot?.position.x||0)+Math.sin(heading)*1.35;
  const y=(playerRoot?.position.y||0)+Math.cos(heading)*1.35;
  const z=interiorMode?.04:surfaceZXY(x,y)+.04;
  spawnVisiblePickup(item,x,y,z,interiorMode?'interior':'exterior',hash('drop:'+item+':'+performance.now()));
  equipment[slot]=null;
  if((inventory[item]||0)>0){inventory[item]--;lootCount=Math.max(0,lootCount-1);if(inventory[item]<=0)delete inventory[item]}
  cancelReload(false);aiming=false;
  const next=['primary','sidearm','melee','offhand'].find(s=>activeItemForSlot(s));
  if(next){activeSlot=next;activeWeapon=activeItemForSlot(next);equippedWeaponName=activeWeapon}
  else{activeSlot='melee';activeWeapon='Fists';equippedWeaponName='Fists'}
  refreshEquipmentVisuals();updateInventory();showToast('Dropped '+item);return true;
}

function sanitizeCharacterClips(clips){
  return (clips||[]).map(src=>{
    const clip=src.clone();
    clip.tracks=clip.tracks.filter(t=>{
      const n=String(t.name||'');
      if(/^(Root|root|CharacterArmature)\.(position|quaternion|scale)$/i.test(n))return false;
      // Mesh2Motion locomotion tracks pelvis translation for retargeting. In a third-person
      // game that translation double-applies vertical motion and makes the survivor look
      // permanently crouched/sunken. Keep pelvis rotation, strip only its translation.
      if(/^(pelvis|hips|mixamorigHips)\.position$/i.test(n))return false;
      return true;
    });
    clip.resetDuration();return clip;
  });
}
async function hydratePlayerAnimations(modelRoot){
  const pack=await loadAsset(ASSETS.playerAnimations);
  if(!pack?.animations?.length||!modelRoot)return false;
  playerClips=sanitizeCharacterClips(pack.animations);
  playerMixer?.stopAllAction();playerMixer=new THREE.AnimationMixer(modelRoot);playerAction=null;
  playPlayerAnimation('idle');return true;
}
function removeEquipmentMounts(){
  for(const m of Object.values(equipmentMounts))if(m?.parent)m.parent.remove(m);
  equipmentMounts={rightHand:null,leftHand:null,hip:null,backGun:null,backMelee:null,activeGrip:null};
}
async function hydrateRealPlayerModel(){
  let gltf=await loadAsset(PLAYER_ASSET),playerMode=CHARACTER_KEY;
  if(!gltf&&(CHARACTER_KEY==='realistic'||CHARACTER_KEY==='survivor')){gltf=await loadAsset(ASSETS.playerRealistic);playerMode='realistic-fallback'}
  if(!gltf)gltf=await loadAsset(ASSETS.player);
  if(!gltf||!playerRoot)return false;
  const n=normalizedModel(gltf.scene,1.82,true);
  n.root.remove(n.oriented);
  removeEquipmentMounts();
  if(playerVisualRoot?.parent===playerRoot)playerRoot.remove(playerVisualRoot);
  playerVisualRoot=n.oriented;playerRoot.add(playerVisualRoot);
  const visualYaw=M2M_PLAYER_KEYS.has(CHARACTER_KEY)?0:Math.PI;
  n.model.rotation.y=visualYaw;n.model.updateMatrixWorld(true);
  playerModelYawOffset=0;playerVisualRoot.position.z-=PHYSICS_VISUAL_DROP;playerVisualBaseScaleZ=Math.abs(playerVisualRoot.scale.z);playerVisualRoot.scale.z=playerVisualBaseScaleZ;
  playerAssetLoaded=true;playerAssetMode=playerMode;
  playerClips=sanitizeCharacterClips(gltf.animations);playerMixer=new THREE.AnimationMixer(n.model);playerAction=null;
  captureCharacterWeaponTemplates(n.model);setupEquipmentMounts(n.model);refreshEquipmentVisuals();playPlayerAnimation(locomotionIntent||'idle');
  hydratePlayerAnimations(n.model).catch(e=>console.warn('player animation hydration',e));
  if(!MOBILE_GPU_SAFE)hydrateWeaponTemplates().catch(e=>console.warn('weapon hydration',e));
  return true;
}
async function hydrateWeaponTemplates(){
  const [axe,bat,knife,pistol,rifle,shotgun,smg,spear,sawBat,guitar]=await Promise.all([
    loadAsset(weaponCfg('Axe').model_url||ASSETS.axe),
    loadAsset(weaponCfg('Barbed Bat').model_url||ASSETS.bat),
    loadAsset(weaponCfg('Knife').model_url||ASSETS.knife),
    loadAsset(weaponCfg('Pistol').model_url||ASSETS.pistol),
    loadAsset(weaponCfg('Rifle').model_url||ASSETS.rifle),
    loadAsset(weaponCfg('Shotgun').model_url||ASSETS.shotgun),
    loadAsset(weaponCfg('SMG').model_url||ASSETS.smg),
    loadAsset(weaponCfg('Spear').model_url||ASSETS.spear),
    loadAsset(weaponCfg('Saw Bat').model_url||ASSETS.sawBat),
    loadAsset(weaponCfg('Guitar').model_url||ASSETS.guitar)
  ]);
  weaponTemplates={axe,bat,knife,pistol,rifle,shotgun,smg,spear,sawBat,guitar};
  if(playerRoot)refreshEquipmentVisuals();
}
async function buildPlayer(){
  const spawn=nearestRoadToCenter();playerSpawn.set(spawn.x,spawn.y,surfaceZXY(spawn.x,spawn.y)+.015);
  playerStance='stand';slideTime=0;weaponTemplates={};
  playerRoot=new THREE.Group();const fallback=fallbackPlayer();playerVisualRoot=fallback;playerVisualBaseScaleZ=1;playerModelYawOffset=0;
  playerRoot.add(fallback);setupEquipmentMounts(fallback);playerAssetLoaded=false;playerAssetMode='streaming-fallback';
  playerRoot.position.copy(playerSpawn);scene.add(playerRoot);
  const restoredItem=activeItemForSlot(activeSlot);
  if(!restoredItem)activeSlot=equipment.melee?'melee':equipment.sidearm?'sidearm':equipment.primary?'primary':'offhand';
  activeWeapon=activeItemForSlot(activeSlot)||equipment.melee||'Axe';equippedWeaponName=activeWeapon;
  refreshEquipmentVisuals();playPlayerAnimation('idle');
  hydrateRealPlayerModel().catch(e=>console.warn('real player hydration',e));
  return true;
}
function clipBy(...patterns){
  for(const re of patterns){const x=playerClips.find(c=>re.test(String(c.name||'')));if(x)return x}
  return null;
}
function playPlayerAnimation(state){
  if(!playerMixer||!playerClips.length)return;
  const gun=isFirearm(activeWeapon);let desired=null;
  if(state==='reload'&&gun)desired=clipBy(/^Pistol_Reload$/i,/reload/i);
  else if(state==='fire'&&gun)desired=clipBy(/^Pistol_Shoot$/i,/shoot|fire/i);
  else if(state==='aim'&&gun)desired=clipBy(/^Pistol_Aim_Neutral$/i,/aim.*neutral|aim/i,/^Pistol_Idle$/i);
  else if(state==='gunIdle'&&gun)desired=clipBy(/^Pistol_Idle$/i,/fighting idle/i,/idle_subtle/i,/^idle/i);
  else if(state==='sprint')desired=clipBy(/^Sprint$/i,/^Jog$/i,/sprint|jog|run/i);
  else if(state==='strafeL')desired=clipBy(/^Strafe_left$/i,/strafe.*left/i,/walk/i);
  else if(state==='strafeR')desired=clipBy(/^Strafe_right$/i,/strafe.*right/i,/walk/i);
  else if(state==='back')desired=clipBy(/^Walk_Backwards$/i,/walk.*back/i,/backward/i,/walk/i);
  else if(state==='crouchIdle')desired=clipBy(/^Crouch_Idle$/i,/crouch.*idle/i,/idle/i);
  else if(state==='crouchWalk')desired=clipBy(/^Crouch_Walk$/i,/crouch.*walk/i,/walk/i);
  else if(state==='prone')desired=clipBy(/^Crawl$/i,/crawl/i,/prone/i);
  else if(state==='attack'&&!gun)desired=clipBy(/sword_attack|melee_hook|slash|stab|punch|attack|melee/i);
  else if(state==='run')desired=clipBy(/^Jog$/i,/sprint|jog|run/i);
  else if(state==='walk')desired=clipBy(/^Walk$/i,/walk/i);
  else if(state==='idle')desired=clipBy(/^Idle_A$/i,/idle_subtle/i,/^idle$/i,/idle/i,/stand/i);
  if(!desired)desired=clipBy(/idle|stand|walk|jog|run/i);
  if(!desired)return;
  if(playerAction?._clip===desired)return;
  const next=playerMixer.clipAction(desired);next.reset().fadeIn(.075).play();if(playerAction)playerAction.fadeOut(.075);playerAction=next;
}
function applyProceduralAim(){
  if(!aiming||!isFirearm(activeWeapon)||!playerRoot)return;
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);
  const elevation=Math.asin(THREE.MathUtils.clamp(dir.z,-1,1));
  // Let authored animation own shoulders/elbows; only add restrained spine pitch.
  if(aimBones.torso)aimBones.torso.rotateX(-elevation*.22);
}
function staticClone(template,targetHeight){
  const scene=template?.scene||template?.template?.scene||null;
  if(!scene?.clone)return null;
  const n=normalizedModel(scene,targetHeight,false);return n?.root||null;
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
function makeFoliageTexture(){
  const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d'),r=seeded(728551);
  x.clearRect(0,0,128,128);
  for(let i=0;i<95;i++){
    const px=20+r()*88,py=18+r()*92,rx=5+r()*12,ry=3+r()*8,a=.18+r()*.42;
    x.fillStyle='rgba('+(35+Math.floor(r()*35))+','+(58+Math.floor(r()*50))+','+(28+Math.floor(r()*28))+','+a+')';
    x.beginPath();x.ellipse(px,py,rx,ry,r()*Math.PI,0,Math.PI*2);x.fill();
  }
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
const foliageTex=makeFoliageTexture();
const treeMats={
  trunk:new THREE.MeshStandardMaterial({color:0x4b3425,roughness:1}),
  leaf1:new THREE.MeshStandardMaterial({map:foliageTex,color:0x607858,roughness:1,transparent:true,alphaTest:.18,side:THREE.DoubleSide}),
  leaf2:new THREE.MeshStandardMaterial({map:foliageTex,color:0x3e5d43,roughness:1,transparent:true,alphaTest:.18,side:THREE.DoubleSide})
};
const treeGeo={
  trunk:new THREE.CylinderGeometry(.12,.23,2.55,10),
  leaf:new THREE.PlaneGeometry(1.55,1.08)
};
function makeStreetTree(seedValue){
  const r=seeded(seedValue),g=new THREE.Group();
  const trunk=new THREE.Mesh(treeGeo.trunk,treeMats.trunk);trunk.rotation.x=Math.PI/2;trunk.position.z=1.27;trunk.castShadow=true;g.add(trunk);
  const branchPoints=[];
  for(let i=0;i<7;i++){
    const a=(i/7)*Math.PI*2+r()*.45,z=1.55+r()*1.35,len=.65+r()*.7;
    const base=new THREE.Vector3(0,0,z),tip=new THREE.Vector3(Math.cos(a)*len,Math.sin(a)*len,z+.35+r()*.45);
    const br=cylinderBetween(base,tip,.045+r()*.035,treeMats.trunk);br.castShadow=true;g.add(br);branchPoints.push(tip);
  }
  branchPoints.push(new THREE.Vector3(0,0,3.15+r()*.4));
  branchPoints.forEach((p,i)=>{
    const count=2+(i%2);
    for(let j=0;j<count;j++){
      const leaf=new THREE.Mesh(treeGeo.leaf,(i+j)%2?treeMats.leaf1:treeMats.leaf2);
      leaf.position.copy(p).add(new THREE.Vector3((r()-.5)*.55,(r()-.5)*.55,(r()-.5)*.45));
      leaf.rotation.set(Math.PI/2+(r()-.5)*.4,(r()-.5)*.35,r()*Math.PI);leaf.scale.set(.75+r()*.55,.72+r()*.5,1);leaf.castShadow=true;g.add(leaf);
    }
  });
  return g;
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
function rustifyVehicle(root,seedValue){
  const r=seeded(seedValue);root?.traverse(o=>{
    if(!o.isMesh||!o.material)return;const src=Array.isArray(o.material)?o.material:[o.material];
    const mats=src.map(base=>{const m=base.clone();if(m.color)m.color.lerp(new THREE.Color(r()>.5?0x6f4931:0x4b3d31),.22+r()*.28);m.roughness=Math.max(.72,Number(m.roughness||.5));m.metalness=Math.max(.05,Number(m.metalness||0)-.1);return m});
    o.material=Array.isArray(o.material)?mats:mats[0];
  });
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
    root.position.set(p.x,p.y,p.z+.02);root.rotation.z=a.heading+(side<0?Math.PI:0);rustifyVehicle(root,hash('rust:'+type+':'+made+':'+attempts));artGroup.add(root);
    const requiredParts=type==='truck'?['Car battery','Tire','Radiator hose']:type==='sports'?['Car battery','Spark plug','Tire']:['Car battery','Spark plug','Tire'];
    drivableVehicles.push({root,type,heading:root.rotation.z,speed:0,maxSpeed:type==='bike'?8:type==='truck'?16:type==='sports'?25:19,accel:type==='bike'?5:type==='truck'?5.2:7.2,requiredParts,installedParts:[],fuel:0,stalled:false});
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
    drivableVehicles.push({root,type:'bike',heading:a.heading,speed:0,maxSpeed:8,accel:4.2,requiredParts:['Bike chain','Tire'],installedParts:[],fuel:100,stalled:false});made++;
  }
  return made;
}
function vehicleReady(v){return !v?.requiredParts?.some(p=>!v.installedParts?.includes(p))&&Number(v?.fuel||0)>0}
function repairVehicle(v){
  if(!v)return false;const missing=(v.requiredParts||[]).filter(p=>!v.installedParts.includes(p));let installed=0;
  for(const part of missing)if((inventory[part]||0)>0){inventory[part]--;lootCount=Math.max(0,lootCount-1);v.installedParts.push(part);installed++}
  let fueled=false;if(Number(v.fuel||0)<=0&&(inventory['Fuel can']||0)>0){inventory['Fuel can']--;lootCount=Math.max(0,lootCount-1);v.fuel=70+rand()*30;fueled=true}
  updateInventory();
  if(vehicleReady(v)){awardXP(75,'vehicle repair');showToast(v.type+' running · '+Math.round(v.fuel)+'% fuel');return true}
  const still=v.requiredParts.filter(p=>!v.installedParts.includes(p));const need=[...still,...(v.fuel>0?[]:['Fuel can'])];
  showToast((installed||fueled)?'Worked on '+v.type+' · still need '+need.join(' + '):'Need '+need.join(' + '));return false;
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
  if(v.fuel<=0){v.speed=THREE.MathUtils.lerp(v.speed,0,1-Math.exp(-7*dt));if(!v.stalled){v.stalled=true;showToast('Out of fuel · find a Fuel can')}return}
  v.stalled=false;v.fuel=Math.max(0,v.fuel-Math.abs(throttle)*dt*.42);
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
    if(i===0||i%5===0){v.installedParts=[...(v.requiredParts||[])];v.fuel=35+rand()*55}
  }
  const anchors=localRoadAnchors(180);
  const parts=['Spark plug','Car battery','Fuel can','Tire','Radiator hose','Bike chain'];
  for(let i=0;i<Math.min(24,anchors.length);i++){
    const a=anchors[(i*7)%anchors.length],p=roadSidePoint(a,a.width/2+1.1,i%2?1:-1);
    if(!isBlockedExterior(p.x,p.y,.3))spawnVisiblePickup(parts[i%parts.length],p.x,p.y,p.z,'exterior',hash('vehicle-part:'+i));
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
    ?entries.slice(0,16).map(([k,v])=>'<span class="packTile" data-item="'+k+'" title="'+k+'"><i>'+inventoryIcon(k)+'</i><b>'+k+'</b><em>'+v+'</em></span>').join('')
    :'<span class="empty">Search rooms, cabinets, furniture and visible loot.</span>';
  persistSurvivor();
}
function addInventoryItem(item){
  const ammoPickup={
    'Pistol Ammo':{weapon:'Pistol',rounds:12},
    'Rifle Ammo':{weapon:'Rifle',rounds:20},
    'Shotgun Shells':{weapon:'Shotgun',rounds:6},
    'SMG Ammo':{weapon:'SMG',rounds:32}
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
  if(item==='SMG')return{template:weaponTemplates.smg,length:.72};
  if(item==='Spear')return{template:weaponTemplates.spear,length:1.35};
  if(item==='Saw Bat')return{template:weaponTemplates.sawBat,length:.88};
  if(item==='Guitar')return{template:weaponTemplates.guitar,length:.82};
  return null;
}
function makeGenericLootVisual(item){
  const g=new THREE.Group(),dark=new THREE.MeshStandardMaterial({color:0x252a28,roughness:.76}),cloth=new THREE.MeshStandardMaterial({color:0xd8d2c2,roughness:.96}),med=new THREE.MeshStandardMaterial({color:0xb8c8bc,roughness:.82}),metal=new THREE.MeshStandardMaterial({color:0x565d5c,roughness:.48,metalness:.38});let o=null;
  if(/Water|Energy drink|Alcohol/i.test(item)){o=new THREE.Mesh(new THREE.CylinderGeometry(.10,.12,.42,10),new THREE.MeshStandardMaterial({color:/Water/i.test(item)?0x7fa9b1:0x695848,roughness:.36,transparent:/Water/i.test(item),opacity:.84}));o.rotation.x=Math.PI/2}
  else if(/Bandage|wipes|Cloth|gloves/i.test(item))o=new THREE.Mesh(new THREE.BoxGeometry(.34,.24,.13),cloth);
  else if(/First aid|Painkillers/i.test(item)){const box=new THREE.Mesh(new THREE.BoxGeometry(.42,.30,.18),med),h=new THREE.Mesh(new THREE.BoxGeometry(.18,.035,.06),dark),v=new THREE.Mesh(new THREE.BoxGeometry(.035,.18,.06),dark);h.position.z=v.position.z=.11;g.add(box,h,v)}
  else if(/Ammo|Shells/i.test(item))o=new THREE.Mesh(new THREE.BoxGeometry(.34,.24,.18),metal);
  else if(/Battery|Spark plug|Radio|Flashlight/i.test(item))o=new THREE.Mesh(new THREE.BoxGeometry(.18,.38,.16),dark);
  else if(/Tire/i.test(item)){o=new THREE.Mesh(new THREE.TorusGeometry(.22,.07,8,18),dark);o.rotation.x=Math.PI/2}
  else if(/Fuel can/i.test(item))o=new THREE.Mesh(new THREE.BoxGeometry(.34,.20,.46),new THREE.MeshStandardMaterial({color:0x774139,roughness:.74}));
  else if(/Canned food|Food ration|Energy bar/i.test(item)){o=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.24,10),metal);o.rotation.x=Math.PI/2}
  else if(/Backpack|Duffel/i.test(item))o=new THREE.Mesh(new THREE.BoxGeometry(.48,.25,.56),new THREE.MeshStandardMaterial({color:0x4b5146,roughness:.94}));
  else o=new THREE.Mesh(new THREE.BoxGeometry(.34,.28,.22),dark);
  if(o)g.add(o);g.traverse(x=>{if(x.isMesh){x.castShadow=true;x.receiveShadow=true}});return g;
}
function inventoryIcon(item){
  if(/Pistol|Rifle|Shotgun|SMG/i.test(item))return'▰';if(/Axe|Knife|Spear|Bat|Guitar/i.test(item))return'⚔';if(/Ammo|Shell/i.test(item))return'▥';if(/Water|drink/i.test(item))return'◒';if(/Bandage|First aid|Painkiller/i.test(item))return'✚';if(/Backpack|Duffel/i.test(item))return'▣';if(/Battery|Spark|Tire|Fuel|hose|chain/i.test(item))return'⚙';if(/Food|Canned|bar/i.test(item))return'◫';return'◆';
}
function makePickupVisual(item,seedValue){
  const root=new THREE.Group(),weapon=pickupTemplateFor(item);
  let model=null;
  if(weapon?.template){
    model=propCloneByLength(weapon.template,weapon.length);
    if(model){model.rotation.set(.12,.08,-.2);model.position.z=.28;root.add(model)}
  }else{
    model=makeGenericLootVisual(item);
    if(model){model.position.z=.12;root.add(model)}
  }
  if(!model){
    model=new THREE.Mesh(new THREE.BoxGeometry(.42,.30,.24),new THREE.MeshStandardMaterial({color:0x77664f,roughness:.78}));
    model.position.z=.2;root.add(model);
  }
  const rare=/Pistol|Rifle|Shotgun|SMG|Spear|Saw Bat|Axe|Backpack|Duffel/.test(item);
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
  const table=['Bandage','Water','First aid kit','Batteries','Canned food','Pistol Ammo','Rifle Ammo','Shotgun Shells','SMG Ammo','Pistol','Rifle','Shotgun','SMG','Axe','Spear','Saw Bat','Guitar','Hiking Backpack'];
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
    else if(roll>.975&&roll<=.984)item='Shotgun';
    else if(roll>.984&&roll<=.990)item='SMG';
    else if(roll>.990&&roll<=.994)item=rand()>.5?'Spear':'Saw Bat';
    else if(roll>.994&&roll<=.997)item='Guitar';
    else if(roll>.997)item='Hiking Backpack';
    spawnVisiblePickup(item,p.x,p.y,p.z,'exterior',hash(CELL+':loot:'+attempts));placed++;
  }
  return placed;
}
function spawnInteriorVisibleLoot(w,h,seedValue){
  const r=seeded(seedValue+301),count=3+Math.floor(r()*4);
  const items=['Bandage','Water','Batteries','Pistol Ammo','Rifle Ammo','Shotgun Shells','SMG Ammo','Pistol','First aid kit','Rifle','Shotgun','SMG','Spear','Saw Bat','Hiking Backpack'];
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
let doorwayPursuerKinds=[];
function clearInterior(){
  while(interiorGroup.children.length)interiorGroup.remove(interiorGroup.children[0]);
  worldPickups=worldPickups.filter(p=>p.mode!=='interior');
  interiorWalls=[];interiorContainers=[];interiorZombies=[];interiorFloorLinks=[];interiorStairs=[];interiorBounds=null;interiorExit=null;
}
function makeWalkableStairs(label,x,y,direction){
  const g=new THREE.Group(),steps=12,run=3.6,rise=2.72,mat=new THREE.MeshStandardMaterial({color:0x4b4e49,roughness:.92,metalness:.06});
  for(let i=0;i<steps;i++){
    const t=(i+.5)/steps,step=new THREE.Mesh(new THREE.BoxGeometry(1.5,run/steps+.035,rise/steps),mat);
    step.position.set(0,(t-.5)*run,(i+.5)*(rise/steps)/2);step.position.z=(i+.5)*(rise/steps);step.castShadow=true;step.receiveShadow=true;g.add(step);
  }
  const railMat=new THREE.MeshStandardMaterial({color:0x2d302e,roughness:.6,metalness:.42});
  for(const side of [-1,1]){
    const rail=new THREE.Mesh(new THREE.BoxGeometry(.055,run,1.0),railMat);rail.position.set(side*.79,0,1.32);g.add(rail);
  }
  g.position.set(x,y,0);g.rotation.z=direction<0?Math.PI:0;interiorGroup.add(g);
  const s={kind:direction>0?'floorUp':'floorDown',label,x,y,run,rise,direction,floor:direction>0?(activeInterior?.floor||1)+1:(activeInterior?.floor||1)-1};
  interiorStairs.push(s);return s;
}
function interiorGroundZ(x,y){
  let z=.015;
  for(const s of interiorStairs){
    const dx=x-s.x,dy=y-s.y,ly=s.direction>0?dy:-dy;
    if(Math.abs(dx)>.92||ly<-s.run/2-.25||ly>s.run/2+.25)continue;
    const t=THREE.MathUtils.clamp((ly+s.run/2)/s.run,0,1);z=Math.max(z,t*s.rise+.015);
  }
  return z;
}
function maybeUseWalkableStairs(){
  if(!interiorMode||!activeInterior||!playerRoot)return false;
  for(const s of interiorStairs){
    const dx=playerRoot.position.x-s.x,dy=playerRoot.position.y-s.y,ly=s.direction>0?dy:-dy;
    if(Math.abs(dx)>.88||ly<s.run/2-.22)continue;
    if(s.direction>0&&activeInterior.floor<activeInterior.floors){changeInteriorFloor(activeInterior.floor+1,'stairs');return true}
    if(s.direction<0&&activeInterior.floor>1){changeInteriorFloor(activeInterior.floor-1,'stairs');return true}
  }
  return false;
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

  const windowMat=new THREE.MeshPhysicalMaterial({color:0x9fc5cf,roughness:.08,metalness:0,transparent:true,opacity:.42,transmission:.42,depthWrite:false,side:THREE.DoubleSide});
  for(let x=-w/2+1.4;x<w/2-1;x+=2.2){
    const win=new THREE.Mesh(new THREE.BoxGeometry(1.25,.045,1.15),windowMat.clone());
    win.position.set(x,h/2-.13,1.62);win.userData.breakableGlass=true;interiorGroup.add(win);
  }

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
  activeInterior={entry,width:w,depth:h,layout,floor:floorNumber,floors};
  if(floorNumber<floors){
    const s=makeWalkableStairs('UP',upX,upY,1);s.floor=floorNumber+1;
  }
  if(floorNumber>1){
    const s=makeWalkableStairs('DOWN',downX,downY,-1);s.floor=floorNumber-1;
  }
  spawnInteriorVisibleLoot(w,h,floorSeed);
  const zCount=floorNumber>1&&r()<.44?1:0;
  for(let i=0;i<zCount;i++)spawnInteriorZombie(zombieTemplates.length?zombieTemplates[Math.floor(r()*zombieTemplates.length)]:zombieTemplate,r,w,h);
}
function changeInteriorFloor(nextFloor,via='interaction'){
  if(!interiorMode||!activeInterior)return;
  const entry=activeInterior.entry,floors=activeInterior.floors;
  nextFloor=THREE.MathUtils.clamp(Math.round(nextFloor),1,floors);
  if(nextFloor===activeInterior.floor)return;
  generateInterior(entry,nextFloor);
  if(via==='stairs'){
    const arrivingFromBelow=nextFloor>1;
    const x=activeInterior.width/2-1.45,y=-activeInterior.depth/2+(arrivingFromBelow?3.72:1.95);
    playerRoot.position.set(x,y,.015);
  }else playerRoot.position.set(0,-activeInterior.depth/2+2.15,.015);
  playerVelocity.set(0,0,0);
  $('worldTitle').textContent=activeInterior.layout+' · Floor '+activeInterior.floor+' / '+activeInterior.floors;
  loadText.textContent='Floor '+activeInterior.floor+' of '+activeInterior.floors+' · search rooms, visible loot and stashes.';
  showToast('Floor '+activeInterior.floor+' / '+activeInterior.floors);
}

function spawnInteriorZombie(template,r,w,h){
  spawnZombieAt(template,{x:(r()-.5)*w*.48,y:h*.28},true,r);
}
function captureExteriorPursuers(entry){
  doorwayPursuerKinds=[];
  const near=zombies.filter(z=>!z.dead&&(z.aggro||Math.hypot(z.root.position.x-entry.entryX,z.root.position.y-entry.entryY)<16))
    .sort((a,b)=>Math.hypot(a.root.position.x-entry.entryX,a.root.position.y-entry.entryY)-Math.hypot(b.root.position.x-entry.entryX,b.root.position.y-entry.entryY))
    .slice(0,8);
  for(const z of near){
    doorwayPursuerKinds.push(z.kind);z.root.parent?.remove(z.root);
    const i=zombies.indexOf(z);if(i>=0)zombies.splice(i,1);
  }
}
function injectDoorwayPursuers(){
  if(!activeInterior||!doorwayPursuerKinds.length)return;
  const y=-activeInterior.depth/2+1.05;
  doorwayPursuerKinds.forEach((kind,i)=>{
    const a=enemyArchetypes.find(x=>x.id===kind)||zombieTemplate;if(!a)return;
    const z=spawnZombieAt(a,{x:(i%3-1)*.72,y:y+Math.floor(i/3)*.62},true,rand);
    if(z){z.aggro=true;z.doorPursuer=true;z.deaggroRadius=999}
  });
}
function enterInterior(entry){
  if(interiorMode||!playerRoot)return;
  exteriorReturn.set(
    Number.isFinite(entry.returnX)?entry.returnX:entry.entryX,
    Number.isFinite(entry.returnY)?entry.returnY:entry.entryY,
    (Number.isFinite(entry.returnZ)?entry.returnZ:entry.entryZ)+.05
  );exteriorYaw=yaw;captureExteriorPursuers(entry);generateInterior(entry,1);
  exteriorRoot.visible=false;interiorGroup.visible=true;interiorMode=true;playerVelocity.set(0,0,0);
  playerRoot.position.set(0,-activeInterior.depth/2+2.0,.05);yaw=0;pitch=.12;injectDoorwayPursuers();
  $('cellLabel').textContent='PROCEDURAL INTERIOR · GAME ART';
  $('worldTitle').textContent=activeInterior.layout+' · Floor '+activeInterior.floor+' / '+activeInterior.floors;
  loadText.textContent='Search furniture, drawers, cabinets and hidden stashes.';
  const mapLabel=document.querySelector('.mapLabel b');if(mapLabel)mapLabel.textContent='FLOOR PLAN';
  const mapSub=document.querySelector('.mapLabel span');if(mapSub)mapSub.textContent='search every room';
  updateZombieCount();
}
function exitInterior(){
  if(!interiorMode)return;
  const searchedEntry=activeInterior?.entry||null;
  const escapedKinds=interiorZombies.filter(z=>!z.dead&&z.doorPursuer).map(z=>z.kind).slice(0,8);
  interiorMode=false;interiorGroup.visible=false;exteriorRoot.visible=true;clearInterior();playerVelocity.set(0,0,0);playerRoot.position.copy(exteriorReturn);playerRoot.position.z=surfaceZXY(playerRoot.position.x,playerRoot.position.y)+.04;yaw=exteriorYaw;syncPhysicsToPlayer();
  escapedKinds.forEach((kind,i)=>{
    const a=enemyArchetypes.find(x=>x.id===kind)||zombieTemplate;if(!a)return;
    const ang=(i/Math.max(1,escapedKinds.length))*Math.PI*2,rad=2.4+(i%3)*.45;
    const x=playerRoot.position.x+Math.cos(ang)*rad,y=playerRoot.position.y+Math.sin(ang)*rad;
    const z=spawnZombieAt(a,{x,y},false,rand);if(z){z.aggro=true;z.deaggroRadius=999}
  });
  $('cellLabel').textContent=worldCellLabel();
  $('worldTitle').textContent=worldCellTitle();
  loadText.textContent=(data.counts?.buildings||0).toLocaleString()+' source-backed buildings · true walk-through doors only';
  const mapLabel=document.querySelector('.mapLabel b');if(mapLabel)mapLabel.textContent='EXPLORED';
  const mapSub=document.querySelector('.mapLabel span');if(mapSub)mapSub.textContent='fog clears as you travel';
  if(searchedEntry)addMapMarkerWorld(searchedEntry.entryX,searchedEntry.entryY,'searched','Searched building');
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
      const missing=[...v.requiredParts.filter(p=>!v.installedParts.includes(p)),...(v.fuel>0?[]:['Fuel can'])];best={kind:ready?'vehicle':'vehicleRepair',label:ready?'DRIVE '+v.type.toUpperCase()+' · '+Math.round(v.fuel)+'% FUEL':'REPAIR '+v.type.toUpperCase()+' · '+missing.join(' + '),vehicle:v};
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
    for(const e of buildingEntries){
      const d=Math.hypot(playerRoot.position.x-e.entryX,playerRoot.position.y-e.entryY);
      if(d>=2.4||d>=bestD)continue;
      if(e.doorPivot&&!e.doorOpen){best={kind:'door',label:'OPEN DOOR',entry:e};bestD=d}
      else if(!e.explorable){best={kind:'entry',label:'ENTER BUILDING',entry:e};bestD=d}
    }
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
function maybeWalkThroughOpenDoor(){
  if(interiorMode||activeVehicle||!playerRoot)return false;
  for(const e of buildingEntries){
    if(!e.doorOpen||e.explorable)continue;
    const d=Math.hypot(playerRoot.position.x-e.entryX,playerRoot.position.y-e.entryY);
    if(d<.82){enterInterior(e);return true}
  }
  return false;
}
function maybeWalkOutOpenDoor(){
  if(!interiorMode||!interiorExit||!playerRoot)return false;
  const d=Math.hypot(playerRoot.position.x-interiorExit.x,playerRoot.position.y-interiorExit.y);
  if(d<.62){exitInterior();return true}
  return false;
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
  z.dead=true;kills++;awardXP(25,'hostile');dropFromZombie(z,mode);
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
  const t=$('deathText');if(t)t.textContent='Wave '+Math.max(1,waveNumber)+' overwhelmed you · '+kills+' hostiles eliminated · '+livesRemaining+' lives remain.';
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
  if(zombieTemplate){spawnZombieWave(performance.now(),true);spawnFacadeSpiders(densePreview()?4:2)}
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
    if(h.object?.userData?.breakableGlass){
      shatterGlass(h.object);
      return{z:null,target:h.point.clone(),dist:h.distance,origin,dir,blocked:false,glass:true};
    }
    if(h.object?.userData?.breakableFacade){
      shatterFacadeGlass(h.object,h.instanceId);
      return{z:null,target:h.point.clone(),dist:h.distance,origin,dir,blocked:false,glass:true};
    }
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
  applyRecoil(cfg);muzzleFlash=.08;playPlayerAnimation('fire');updateReticleUi(true,false);updateInventory();
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
  const recover=1-Math.exp(-9.5*dt);
  recoilPitch=THREE.MathUtils.lerp(recoilPitch,0,recover);
  recoilYaw=THREE.MathUtils.lerp(recoilYaw,0,recover);
  const moving=Math.hypot(playerVelocity.x,playerVelocity.y)>.15,sprint=locomotionIntent==='sprint';
  const targetSpread=isFirearm(activeWeapon)?(aiming?2.2:moving?(sprint?15:10):6)+THREE.MathUtils.radToDeg(Math.abs(recoilPitch))*1.05:0;
  reticleSpread=THREE.MathUtils.lerp(reticleSpread,targetSpread,1-Math.exp(-15*dt));updateReticleUi(moving,sprint);
  if(!weaponPivot)return;
  if(isFirearm(activeWeapon)){
    const bob=moving?Math.sin(performance.now()*.010)*(sprint?.035:.016):0;
    weaponPivot.rotation.set(aiming?-pitch*.055+bob:Math.abs(bob)*.8,0,aiming?-leanAmount*.045:bob*.7);
    return
  }
  if(swingTime>0){
    const total=Math.max(.22,Math.min(.55,Number(weaponCfg(activeWeapon).fire_interval_seconds||.48))),t=1-swingTime/total;
    swingTime=Math.max(0,swingTime-dt);
    weaponPivot.rotation.z=-Math.sin(t*Math.PI)*.75;weaponPivot.rotation.x=Math.sin(t*Math.PI)*.24;
  }else weaponPivot.rotation.set(0,0,0);
}

function buildPatrolRoute(x,y,rng=rand,count=16){
  const start=nearestNavNode(x,y);if(!start||!navNodes.length)return[{x,y,z:surfaceZXY(x,y)}];
  const route=[];let cur=start,prev=-1;
  const max=Math.max(8,Math.min(30,count));
  for(let i=0;i<max;i++){
    route.push({x:cur.x,y:cur.y,z:cur.z});
    const choices=[...cur.links].filter(id=>id!==prev);
    const pool=choices.length?choices:[...cur.links];
    if(!pool.length)break;
    const nextId=pool[Math.floor(rng()*pool.length)];prev=cur.id;cur=navNodes[nextId]||cur;
  }
  return route.length>1?route:[{x,y,z:surfaceZXY(x,y)}];
}
function enemyClipSet(clips){
  const find=(re)=>clips.find(x=>re.test(String(x.name||'')));
  return{
    idle:find(/idle|stand|breath|survey/i),
    walk:find(/walk|shamble|crawl|move/i),
    run:find(/run|sprint|charge|trot|gallop/i),
    attack:find(/attack|bite|slash|punch|hit|wave|roar/i),
    death:find(/death|die|fall/i),
    raw:clips
  };
}
function setEnemyAnimation(z,state,force=false){
  if(!z?.mixer||!z.clipSet)return;
  const desired=z.clipSet[state]||z.clipSet.walk||z.clipSet.idle||z.clipSet.raw?.[0];if(!desired)return;
  if(!force&&z.actionState===state&&z.action?._clip===desired)return;
  const next=z.mixer.clipAction(desired);next.reset().fadeIn(.12).play();
  const scale=state==='run'?(z.animSpeed||1)*1.18:state==='attack'?(z.animSpeed||1)*1.32:(z.animSpeed||1);
  next.setEffectiveTimeScale(Math.max(.45,Math.min(2.5,scale)));
  if(z.action&&z.action!==next)z.action.fadeOut(.12);z.action=next;z.actionState=state;
}
function applyInfectedLook(model,archetype,rng=rand){
  model?.traverse(o=>{
    if(o.morphTargetDictionary&&o.morphTargetInfluences){
      const idx=o.morphTargetDictionary.mouthOpen??o.morphTargetDictionary.MouthOpen;
      if(idx!=null)o.morphTargetInfluences[idx]=archetype.screamer ? .78 : .18+rng()*.18;
    }
    if(!o.isMesh||!o.material)return;
    const src=Array.isArray(o.material)?o.material:[o.material];
    const mats=src.map(base=>{
      const m=base.clone(),tint=new THREE.Color(archetype.tint||0x68705f);
      if(m.color)m.color.lerp(tint,archetype.tintMix??.34);
      m.roughness=Math.max(.74,Number(m.roughness??.6));
      if(m.emissive){m.emissive.set(archetype.emissive||0x1b0303);m.emissiveIntensity=archetype.screamer ? .16 : .07}
      const prior=m.onBeforeCompile;
      m.onBeforeCompile=shader=>{
        prior?.(shader);
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vInfPos;');
        shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvInfPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vInfPos;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          float bruise=smoothstep(.80,.98,sin(vInfPos.x*1.73+vInfPos.z*.61)*sin(vInfPos.y*1.19-vInfPos.z*.77));
          float dried=smoothstep(.88,.995,sin(vInfPos.x*.93-vInfPos.y*1.47+vInfPos.z*.51)*.5+.5);
          diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.38,.43,.34),bruise*.34);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.21,.035,.025),dried*.22);`);
      };
      m.needsUpdate=true;return m;
    });
    o.material=Array.isArray(o.material)?mats:mats[0];
  });
}
function spawnZombieAt(source,a,interior=false,rng=rand){
  if(!source)return null;
  const archetype=source?.template?source:{id:'walker',label:'Walker',template:source,height:1.78,speed:[.28,.43],hp:100,damage:8,attackRange:1.28,attackMs:1050,behavior:'stalk',yawOffset:0};
  const template=archetype.template;if(!template?.scene)return null;
  const n=normalizedModel(template.scene,archetype.height||1.78,true);
  if(archetype.tint){
    n.model.traverse(o=>{
      if(!o.isMesh||!o.material)return;
      const src=Array.isArray(o.material)?o.material:[o.material],mats=src.map(base=>{
        const m=base.clone();
        if(m.color)m.color.lerp(new THREE.Color(archetype.tint),Number(archetype.tintMix||.32));
        if(m.emissive&&archetype.emissive){m.emissive.set(archetype.emissive);m.emissiveIntensity=.18}
        return m;
      });
      o.material=Array.isArray(o.material)?mats:mats[0];
    });
  }
  const root=n.root;
  if(interior)root.position.set(a.x,a.y,.015);
  else if(archetype.flying)root.position.set(a.x,a.y,surfaceZXY(a.x,a.y)+7+rng()*7);
  else root.position.set(a.x,a.y,surfaceZXY(a.x,a.y)+.015);
  root.rotation.z=rng()*Math.PI*2;
  (interior?interiorGroup:zombieGroup).add(root);
  const clips=sanitizeCharacterClips(template.animations),clipSet=enemyClipSet(clips);
  let mixer=null,action=null;if(clips.length)mixer=new THREE.AnimationMixer(n.model);
  if(archetype.realisticInfected||archetype.infectedMonster)applyInfectedLook(n.model,archetype,rng);
  const s=archetype.speed||[.28,.43],patrolRoute=interior?[]:buildPatrolRoute(root.position.x,root.position.y,rng,12+Math.floor(rng()*14));
  const z={root,mixer,action,clipSet,actionState:null,animSpeed:archetype.animSpeed||1,kind:archetype.id||'walker',label:archetype.label||'Hostile',behavior:archetype.behavior||'stalk',
    speed:s[0]+rng()*Math.max(0,s[1]-s[0]),patrolSpeed:(archetype.patrolSpeed||.55)*(0.86+rng()*.25),chaseMult:archetype.chaseMult||1.65,hp:archetype.hp||100,damage:archetype.damage||8,
    attackRange:archetype.attackRange||1.28,attackMs:archetype.attackMs||1050,yawOffset:archetype.yawOffset||0,
    burst:archetype.burst||1,nextBurstAt:performance.now()+900+rng()*2500,burstUntil:0,
    aggro:false,aggroRadius:archetype.aggroRadius||14,deaggroRadius:archetype.deaggroRadius||Math.max(24,(archetype.aggroRadius||14)*1.9),
    home:new THREE.Vector3(root.position.x,root.position.y,root.position.z),patrolRoute,patrolIndex:0,patrolDir:1,patrolPauseUntil:0,
    dead:false,steer:rng()>.5?1:-1,lastTurn:0,state:'patrol',path:[],pathIndex:0,nextPathAt:0,nextAttackAt:0};
  if(mixer)setEnemyAnimation(z,'walk',true);
  root.userData.zombieRef=z;
  root.traverse(o=>{o.userData.zombieRef=z});
  (interior?interiorZombies:zombies).push(z);return z;
}
function spawnZombieWave(now=performance.now(),force=false){
  if(!zombieTemplate||!roadAnchors.length||playerDead||interiorMode)return 0;
  const active=zombies.filter(z=>!z.dead).length;
  if(!force&&(now<nextWaveAt||active>=maxActiveZombies))return 0;
  const pressure=Math.min(7,2+Math.floor(kills/18));
  const desired=Math.min(maxActiveZombies-active,force?Math.min(12,maxActiveZombies):pressure);
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
    const realistic=zombieTemplates.filter(x=>x.realisticInfected);const pool=(realistic.length&&rand()<.72)?realistic:zombieTemplates;
    const variant=pool.length?pool[Math.floor(rand()*pool.length)]:zombieTemplate;
    if(spawnZombieAt(variant,a,false))made++;
  }
  if(made){waveNumber++;if(force||waveNumber%5===0)showToast('ENDLESS HORDE · '+active+'+'+made+' active')}
  nextWaveAt=now+(active<maxActiveZombies*.45?1250:2400)+rand()*1600;
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
    if(b.explorable){
      if(!b.shellBuilt){if(polyBlocksPoint(x,y,b.poly,r))return true;continue}
      if(pointInPoly(x,y,b.poly))continue;
      let nearWall=false,doorPass=false;
      for(let i=0;i<(b.shellEdges||[]).length;i++){
        const e=b.shellEdges[i],d=pointSegDist(x,y,e.a,e.b);if(d>=r)continue;
        if(i===b.doorEdgeIndex&&Math.hypot(x-b.doorX,y-b.doorY)<(b.doorGap||1.65)*.62+r){
          const entry=buildingEntries.find(q=>q.id===b.id);doorPass=Boolean(entry?.doorOpen);if(doorPass)break;
        }
        nearWall=true;
      }
      if(doorPass)continue;
      if(nearWall)return true;
      continue;
    }
    if(polyBlocksPoint(x,y,b.poly,r))return true;
  }
  return false;
}
function findInteriorPath(sx,sy,tx,ty){
  if(!interiorBounds)return[];
  const cell=.72,b=interiorBounds,key=(x,y)=>x+','+y;
  const toGrid=(x,y)=>({x:Math.round((x-b.minx)/cell),y:Math.round((y-b.miny)/cell)});
  const toWorld=(x,y)=>({x:b.minx+x*cell,y:b.miny+y*cell});
  const s=toGrid(sx,sy),g=toGrid(tx,ty),open=[s],came=new Map(),seen=new Set([key(s.x,s.y)]);
  const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];let found=null,guard=0;
  while(open.length&&guard++<2600){
    open.sort((a,b2)=>Math.hypot(a.x-g.x,a.y-g.y)-Math.hypot(b2.x-g.x,b2.y-g.y));
    const q=open.shift();if(Math.abs(q.x-g.x)<=1&&Math.abs(q.y-g.y)<=1){found=q;break}
    for(const d of dirs){
      const n={x:q.x+d[0],y:q.y+d[1]},w=toWorld(n.x,n.y),k=key(n.x,n.y);
      if(w.x<b.minx||w.x>b.maxx||w.y<b.miny||w.y>b.maxy||seen.has(k)||isBlockedInterior(w.x,w.y))continue;
      seen.add(k);came.set(k,q);open.push(n);
    }
  }
  if(!found)return[];
  const out=[];let q=found;while(q&&out.length<120){out.push(toWorld(q.x,q.y));q=came.get(key(q.x,q.y))}
  return out.reverse();
}
function moveZombieToward(z,tx,ty,dt,interior,now){
  let targetX=tx,targetY=ty;
  const rawDist=Math.hypot(tx-z.root.position.x,ty-z.root.position.y);
  if(!z.aggro&&rawDist<=z.aggroRadius)z.aggro=true;
  if(z.aggro&&rawDist>=z.deaggroRadius)z.aggro=false;
  if(!z.aggro){
    const route=z.patrolRoute||[];
    if(route.length){
      const wp=route[z.patrolIndex%route.length];targetX=wp.x;targetY=wp.y;
      const pd=Math.hypot(targetX-z.root.position.x,targetY-z.root.position.y);
      if(pd<.72&&now>=z.patrolPauseUntil){
        z.patrolIndex=(z.patrolIndex+z.patrolDir+route.length)%route.length;
        if(z.patrolIndex===0||z.patrolIndex===route.length-1)z.patrolDir*=-1;
        z.patrolPauseUntil=now+250+rand()*950;
      }
    }else{targetX=z.home.x;targetY=z.home.y}
  }
  if(z.aggro&&rawDist>1.6){
    if(interior){
      if(now>=z.nextPathAt||!z.path?.length||z.pathIndex>=z.path.length){
        z.path=findInteriorPath(z.root.position.x,z.root.position.y,tx,ty);z.pathIndex=0;z.nextPathAt=now+520+rand()*260;
      }
    }else if(rawDist>5.5&&navNodes.length){
      if(now>=z.nextPathAt||!z.path?.length||z.pathIndex>=z.path.length){
        z.path=findNavPath(z.root.position.x,z.root.position.y,tx,ty);z.pathIndex=0;z.nextPathAt=now+900+rand()*500;
      }
    }
    const wp=z.path?.[z.pathIndex];
    if(wp){
      targetX=wp.x;targetY=wp.y;
      if(Math.hypot(targetX-z.root.position.x,targetY-z.root.position.y)<(interior?.58:1.05))z.pathIndex++;
    }
  }
  if(z.aggro&&z.behavior==='weave'&&rawDist>2.5){const phase=now*.003+(z.root.id%17);targetX+=Math.sin(phase)*2.1;targetY+=Math.cos(phase*.83)*2.1}
  if(z.aggro&&(z.behavior==='pounce'||z.behavior==='charge')&&rawDist>2.2&&rawDist<16&&now>=z.nextBurstAt){
    z.burstUntil=now+(z.behavior==='pounce'?520:850);z.nextBurstAt=now+2200+rand()*3200;
  }
  const dx=targetX-z.root.position.x,dy=targetY-z.root.position.y,dist=Math.hypot(dx,dy)||.001;
  const vx=dx/dist,vy=dy/dist;
  const baseMove=z.aggro?z.speed*z.chaseMult:z.speed*z.patrolSpeed;
  const dynamicSpeed=Math.min(MAX_HOSTILE_SPEED,baseMove*(now<z.burstUntil?z.burst:1)),step=dynamicSpeed*dt;
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
  z.root.rotation.z=Math.atan2(vx,vy)+(z.yawOffset||0);
  z.state=z.aggro?(rawDist<(z.attackRange||1.3)?'attack':'chase'):(now<z.patrolPauseUntil?'idle':'patrol');
  setEnemyAnimation(z,z.state==='chase'?'run':z.state==='attack'?'attack':z.state==='idle'?'idle':'walk');
  return rawDist;
}
function updateFlyingCrow(z,dt,now){
  const p=playerRoot?.position;if(!p)return Infinity;
  const dx=p.x-z.root.position.x,dy=p.y-z.root.position.y,dz=(p.z+1.15)-z.root.position.z,playerDist=Math.hypot(dx,dy,dz);
  if(!z.aggro&&playerDist<=z.aggroRadius)z.aggro=true;
  if(z.aggro&&playerDist>=z.deaggroRadius)z.aggro=false;
  if(!z.flightPhase)z.flightPhase=rand()*Math.PI*2;
  if(!z.aggro){
    z.flightPhase+=dt*(.45+z.speed*.12);
    const rad=5+(z.root.id%5),tx=z.home.x+Math.cos(z.flightPhase)*rad,ty=z.home.y+Math.sin(z.flightPhase)*rad,tz=z.home.z+Math.sin(z.flightPhase*1.7)*1.5;
    z.root.position.lerp(new THREE.Vector3(tx,ty,tz),1-Math.exp(-1.7*dt));z.state='circle';
  }else{
    const dive=(Math.sin(now*.006+z.flightPhase)>.05),tz=dive?p.z+1.0:p.z+6.5;
    const target=new THREE.Vector3(p.x,p.y,tz),dir=target.sub(z.root.position),dist=dir.length()||1;dir.normalize();
    z.root.position.addScaledVector(dir,Math.min(MAX_HOSTILE_SPEED,z.speed*(dive?1.10:1))*dt);z.state=dive?'dive':'climb';
  }
  const face=new THREE.Vector3(p.x-z.root.position.x,p.y-z.root.position.y,0);if(face.lengthSq()>.001)z.root.rotation.z=Math.atan2(face.x,face.y);
  return playerDist;
}
function attachSpiderToFacade(z,b,rng=rand){
  if(!z||!b)return false;
  const faces=[
    {name:'south',normal:new THREE.Vector3(0,-1,0),x:b.minx+.6+rng()*Math.max(.2,b.width-1.2),y:b.miny-.16},
    {name:'north',normal:new THREE.Vector3(0,1,0),x:b.minx+.6+rng()*Math.max(.2,b.width-1.2),y:b.maxy+.16},
    {name:'west',normal:new THREE.Vector3(-1,0,0),x:b.minx-.16,y:b.miny+.6+rng()*Math.max(.2,b.depth-1.2)},
    {name:'east',normal:new THREE.Vector3(1,0,0),x:b.maxx+.16,y:b.miny+.6+rng()*Math.max(.2,b.depth-1.2)}
  ];
  const face=faces[Math.floor(rng()*faces.length)],minZ=b.z+.55,maxZ=b.z+Math.max(2.2,Math.min(b.height-.55,48));
  z.climb={buildingId:b.id,face:face.name,normal:face.normal,baseX:face.x,baseY:face.y,minZ,maxZ,dir:rng()>.5?1:-1,speed:.58+rng()*.92,phase:rng()*Math.PI*2,tangent:Math.abs(face.normal.x)>.5?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)};
  z.root.position.set(face.x,face.y,THREE.MathUtils.lerp(minZ,maxZ,.12+rng()*.76));
  return true;
}
function poseSpiderOnWall(z,now){
  const q=z.climb;if(!q)return;
  const forward=new THREE.Vector3(0,0,q.dir>0?1:-1),right=new THREE.Vector3().crossVectors(forward,q.normal).normalize();
  z.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,forward,q.normal));
  const sway=Math.sin(now*.0026+q.phase)*.22;
  z.root.position.x=q.baseX+q.tangent.x*sway;z.root.position.y=q.baseY+q.tangent.y*sway;
}
function updateClimbingSpider(z,dt,now){
  const q=z.climb;if(!q)return Infinity;
  z.root.position.z+=q.dir*q.speed*dt;
  if(z.root.position.z>=q.maxZ){z.root.position.z=q.maxZ;q.dir=-1}
  if(z.root.position.z<=q.minZ){z.root.position.z=q.minZ;q.dir=1}
  poseSpiderOnWall(z,now);z.state=q.dir>0?'climb-up':'climb-down';
  return playerRoot?Math.hypot(playerRoot.position.x-z.root.position.x,playerRoot.position.y-z.root.position.y,playerRoot.position.z-z.root.position.z):Infinity;
}
function spawnFacadeSpiders(count=densePreview()?5:3){
  const spider=enemyArchetypes.find(x=>x.id==='spider');if(!spider||!buildingCenters.length)return 0;
  const origin=playerRoot?.position||playerSpawn;
  let buildings=buildingCenters.filter(b=>b.height>7&&b.width>4&&b.depth>4&&Math.hypot(b.x-origin.x,b.y-origin.y)>10&&Math.hypot(b.x-origin.x,b.y-origin.y)<165);
  if(!buildings.length)buildings=buildingCenters.filter(b=>b.height>7&&b.width>4&&b.depth>4);
  let made=0,attempts=0;
  while(made<count&&buildings.length&&attempts<count*8){
    attempts++;const b=buildings[Math.floor(rand()*buildings.length)],z=spawnZombieAt(spider,{x:b.x,y:b.y},false,rand);
    if(z&&attachSpiderToFacade(z,b,rand)){poseSpiderOnWall(z,performance.now());made++}
  }
  return made;
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
    const dist=(!interiorMode&&z.kind==='crow')?updateFlyingCrow(z,dt,now):(!interiorMode&&z.kind==='spider'&&z.climb)?updateClimbingSpider(z,dt,now):moveZombieToward(z,playerRoot.position.x,playerRoot.position.y,dt,interiorMode,now);
    if(dist<38&&audioCtx&&now>(z.nextGroan||0)){z.nextGroan=now+3200+rand()*4200;spatialTone(z.root.position,'groan')}
    if(dist<(z.attackRange||1.28)&&now>=(z.nextAttackAt||0)){
      setEnemyAnimation(z,'attack',true);
      const lunge=z.behavior==='pounce'?1.15:(z.behavior==='charge'?.62:.28);
      if(lunge>0&&!interiorMode){const dx=playerRoot.position.x-z.root.position.x,dy=playerRoot.position.y-z.root.position.y,d=Math.hypot(dx,dy)||1;z.root.position.x+=(dx/d)*lunge;z.root.position.y+=(dy/d)*lunge}
      damagePlayer(z.damage||8);z.nextAttackAt=now+(z.attackMs||1050);lastDamageAt=now;
      if(!playerDead)showToast((z.label||'Hostile')+' hit · '+health+' health');
    }
  }
  updateZombieCount();
}

function dressOpenSourceBuildings(bodyTemplate){
  const opens=buildingCenters.filter(b=>b.shellBuilt),keys=['chair','couch','table','shelf','cabinet','bench','fridge','plant'],sizeByKey={chair:1.05,couch:1.0,table:.8,shelf:1.8,cabinet:1.1,bench:.9,fridge:1.8,plant:1.15};
  if(!opens.length)return 0;
  let made=0,bodies=0,lights=0;
  for(const b of opens){
    const floors=Math.max(1,Number(b.openFloors||Math.floor(b.height/3.05)||1));
    const r=seeded(hash('open-dress:'+MAP_PRESET.id+':'+b.id));
    const floorList=[];
    for(let f=0;f<floors;f++)if(f<5||f===floors-1||f%3===0)floorList.push(f);
    for(const floor of floorList){
      const propCount=floor<3?5:floor===floors-1?6:3;
      for(let p=0;p<propCount;p++){
        let x=b.x,y=b.y,ok=false;
        for(let tries=0;tries<14;tries++){
          x=b.x+(r()-.5)*b.width*.68;y=b.y+(r()-.5)*b.depth*.68;
          if(pointInPoly(x,y,b.poly)&&Math.hypot(x-b.x,y-b.y)>2.25){ok=true;break}
        }
        if(!ok)continue;
        const key=keys[Math.floor(r()*keys.length)],template=interiorTemplates[key];if(!template)continue;
        const obj=staticClone(template,sizeByKey[key]||1);if(!obj)continue;
        obj.position.set(x,y,b.z+floor*3.05+.06);obj.rotation.z=r()*Math.PI*2;
        if(r()<.38)obj.rotation.x=(r()-.5)*.22;
        artGroup.add(obj);made++;
      }
      if(bodyTemplate&&r()<.24){
        let x=b.x,y=b.y;
        for(let tries=0;tries<10;tries++){const tx=b.x+(r()-.5)*b.width*.55,ty=b.y+(r()-.5)*b.depth*.55;if(pointInPoly(tx,ty,b.poly)&&Math.hypot(tx-b.x,ty-b.y)>2){x=tx;y=ty;break}}
        const body=staticClone(bodyTemplate,1.72);
        if(body){body.position.set(x,y,b.z+floor*3.05+.08);body.rotation.set(0,Math.PI/2,r()*Math.PI*2);applyInfectedLook(body,{tint:0x3e413c,tintMix:.62,emissive:0x080000},r);artGroup.add(body);bodies++}
      }
    }
    const lightFloors=[0,Math.max(0,Math.floor((floors-1)*.55)),floors-1].filter((v,i,a)=>a.indexOf(v)===i);
    for(const floor of lightFloors){
      const light=new THREE.PointLight(r()>.45?0xffb36b:0xb7d1c2,2.6+r()*4.2,12,2);light.position.set(b.x+(r()-.5)*1.4,b.y+(r()-.5)*1.4,b.z+floor*3.05+2.25);artGroup.add(light);lights++;
    }
  }
  streetLifeStats.openInteriorProps=made;streetLifeStats.openInteriorBodies=bodies;streetLifeStats.openInteriorLights=lights;
  return made+bodies;
}
function scatterStreetCorpses(template,count){
  if(!template||!roadAnchors.length)return 0;let made=0,attempts=0;
  while(made<count&&attempts<count*20){
    attempts++;const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],p=roadSidePoint(a,(rand()-.5)*Math.max(1.5,a.width*.42),1);
    if(isBlockedExterior(p.x,p.y,.45))continue;
    const body=staticClone(template,1.72);if(!body)continue;
    body.position.set(p.x,p.y,p.z+.07);body.rotation.set(0,Math.PI/2+(rand()-.5)*.22,a.heading+(rand()-.5)*1.7);
    body.traverse(o=>{
      if(!o.isMesh||!o.material)return;
      const wasArray=Array.isArray(o.material),arr=wasArray?o.material:[o.material];
      const mats=arr.map(m=>{
        if(!m?.clone)return m;
        const q=m.clone();if(q.color)q.color.multiplyScalar(.46);q.roughness=Math.max(.9,Number(q.roughness||.8));return q;
      }).filter(Boolean);
      if(mats.length)o.material=wasArray?mats:mats[0];
    });
    artGroup.add(body);made++;
  }
  return made;
}
function scatterAmbientFires(count){
  if(!roadAnchors.length)return 0;let made=0,attempts=0;
  const ember=new THREE.MeshStandardMaterial({color:0x33110b,emissive:0xff4a16,emissiveIntensity:3.2,roughness:.8,transparent:true,opacity:.92});
  const flame=new THREE.MeshStandardMaterial({color:0xffa02c,emissive:0xff5a0b,emissiveIntensity:4.6,roughness:.55,transparent:true,opacity:.78});
  while(made<count&&attempts<count*25){
    attempts++;const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],side=rand()>.5?1:-1,p=roadSidePoint(a,a.width/2+.5+rand()*2.2,side);
    if(isBlockedExterior(p.x,p.y,.45))continue;
    const g=new THREE.Group(),base=new THREE.Mesh(new THREE.CylinderGeometry(.28,.42,.18,9),ember),f1=new THREE.Mesh(new THREE.ConeGeometry(.22,.82,8),flame),f2=f1.clone();
    base.rotation.x=Math.PI/2;base.position.z=.10;f1.rotation.x=Math.PI/2;f1.position.set(-.12,.02,.46);f2.rotation.x=Math.PI/2;f2.scale.set(.72,.72,.72);f2.position.set(.16,-.06,.34);
    const light=new THREE.PointLight(0xff5a18,7,8,2);light.position.z=.75;g.add(base,f1,f2,light);g.position.set(p.x,p.y,p.z+.02);g.userData.fire=true;artGroup.add(g);made++;
  }
  return made;
}
function proceduralInfectedTemplate(kind='walker'){
  const root=new THREE.Group();
  const brute=kind==='brute',hound=kind==='hound',spiderKind=kind==='spider',bird=kind==='crow';
  const skin=new THREE.MeshStandardMaterial({color:brute?0x4c5148:spiderKind?0x302b2d:bird?0x232523:0x596058,roughness:.92,emissive:0x170101,emissiveIntensity:.2});
  const dark=new THREE.MeshStandardMaterial({color:0x252823,roughness:.97});
  if(spiderKind){
    const body=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),skin);body.scale.set(1.2,.8,.55);body.position.z=.3;root.add(body);
    for(let i=0;i<8;i++){const a=(i/8)*Math.PI*2,leg=new THREE.Mesh(new THREE.CylinderGeometry(.022,.03,.55,5),dark);leg.position.set(Math.cos(a)*.26,Math.sin(a)*.26,.28);leg.rotation.set(Math.PI/2,0,a);root.add(leg)}
  }else if(bird){
    const body=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),skin);body.scale.set(1.4,.7,.7);root.add(body);
    for(const s of[-1,1]){const wing=new THREE.Mesh(new THREE.BoxGeometry(.52,.16,.025),dark);wing.position.x=.28*s;wing.rotation.z=.28*s;root.add(wing)}
  }else if(hound){
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.7,4,6),dark);body.rotation.y=Math.PI/2;body.position.z=.42;root.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.17,8,6),skin);head.position.set(0,.42,.52);root.add(head);
    for(const sx of[-1,1])for(const sy of[-1,1]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.46,5),dark);leg.position.set(.12*sx,.22*sy,.22);leg.rotation.x=Math.PI/2;root.add(leg)}
  }else{
    const torso=new THREE.Mesh(new THREE.CapsuleGeometry(brute?.35:.25,brute?.86:.66,4,7),dark);torso.position.z=1.05;torso.rotation.x=Math.PI/2;root.add(torso);
    const head=new THREE.Mesh(new THREE.SphereGeometry(brute?.25:.19,10,8),skin);head.position.set(kind==='lurker'?.12:0,kind==='lurker'?.08:0,1.72);root.add(head);
    for(const side of[-1,1]){
      const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.07,.58,3,6),skin);arm.position.set(.29*side,.02,.98);arm.rotation.set(.15*side,kind==='lurker'?.55:.18,Math.PI/2+(kind==='lurker'?.28*side:0));root.add(arm);
      const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.085,.66,3,6),dark);leg.position.set(.14*side,0,.38);leg.rotation.x=Math.PI/2;root.add(leg);
    }
  }
  return{scene:root,animations:[]};
}
function fastEnemyArchetypes(){
  const human=proceduralInfectedTemplate('walker'),brute=proceduralInfectedTemplate('brute'),lurker=proceduralInfectedTemplate('lurker'),hound=proceduralInfectedTemplate('hound'),spider=proceduralInfectedTemplate('spider'),crow=proceduralInfectedTemplate('crow');
  return[
    {id:'graveborn',label:'Graveborn infected',template:human,height:1.80,speed:[.40,.72],patrolSpeed:.38,chaseMult:1.68,hp:125,damage:12,attackRange:1.30,attackMs:980,behavior:'stalk',aggroRadius:14,deaggroRadius:30,realisticInfected:true,tint:0x53584e,tintMix:.42,emissive:0x2b0202},
    {id:'mauler',label:'Rot mauler',template:brute,height:2.05,speed:[.48,.82],patrolSpeed:.34,chaseMult:1.60,hp:260,damage:22,attackRange:1.62,attackMs:1180,behavior:'charge',aggroRadius:15,deaggroRadius:32,realisticInfected:true,tint:0x4c5148,tintMix:.52,emissive:0x300202},
    {id:'wretch',label:'Wretch',template:lurker,height:1.92,speed:[.62,.98],patrolSpeed:.40,chaseMult:1.72,hp:170,damage:17,attackRange:1.42,attackMs:900,behavior:'weave',aggroRadius:17,deaggroRadius:34,realisticInfected:true,tint:0x565047,tintMix:.48,emissive:0x2d0202},
    {id:'abomination',label:'Abomination',template:brute,height:2.38,speed:[.36,.62],patrolSpeed:.30,chaseMult:1.48,hp:420,damage:34,attackRange:1.94,attackMs:1520,behavior:'charge',aggroRadius:13,deaggroRadius:28,realisticInfected:true,tint:0x474944,tintMix:.58,emissive:0x390202},
    {id:'ashen',label:'Ashen infected',template:human,height:1.72,speed:[.48,.72],patrolSpeed:.48,chaseMult:1.55,hp:112,damage:9,attackRange:1.28,attackMs:1080,behavior:'stalk',aggroRadius:11,deaggroRadius:25,realisticInfected:true},
    {id:'stalker',label:'Stalker infected',template:lurker,height:1.86,speed:[.60,.92],patrolSpeed:.46,chaseMult:1.82,hp:128,damage:12,attackRange:1.34,attackMs:930,behavior:'weave',aggroRadius:15,deaggroRadius:31,realisticInfected:true},
    {id:'screamer',label:'Screamer',template:human,height:1.77,speed:[.72,1.08],patrolSpeed:.40,chaseMult:1.92,hp:96,damage:10,attackRange:1.30,attackMs:760,behavior:'charge',burst:1.48,aggroRadius:20,deaggroRadius:38,realisticInfected:true,screamer:true},
    {id:'sprinter',label:'Fresh sprinter',template:human,height:1.82,speed:[.92,1.30],patrolSpeed:.38,chaseMult:2.05,hp:82,damage:8,attackRange:1.24,attackMs:650,behavior:'charge',burst:1.72,aggroRadius:18,deaggroRadius:36,realisticInfected:true},
    {id:'hound',label:'Rot hound',template:hound,height:1.05,speed:[1.15,1.70],patrolSpeed:.6,chaseMult:1.72,hp:62,damage:11,attackRange:1.15,attackMs:720,behavior:'pounce',burst:1.42,aggroRadius:16,deaggroRadius:32,infectedMonster:true},
    {id:'spider',label:'Carrion spider',template:spider,height:.82,speed:[.95,1.48],patrolSpeed:.62,chaseMult:1.74,hp:82,damage:12,attackRange:1.08,attackMs:680,behavior:'pounce',burst:1.35,aggroRadius:14,deaggroRadius:30,infectedMonster:true},
    {id:'realbear',label:'Diseased bear',template:brute,height:1.72,speed:[.78,1.18],patrolSpeed:.5,chaseMult:1.76,hp:360,damage:29,attackRange:1.9,attackMs:1380,behavior:'charge',burst:1.55,aggroRadius:12,deaggroRadius:28,realisticInfected:true},
    {id:'realwolf',label:'Rabid wolf',template:hound,height:1.04,speed:[1.05,1.50],patrolSpeed:.62,chaseMult:1.96,hp:92,damage:14,attackRange:1.2,attackMs:720,behavior:'pounce',burst:1.72,aggroRadius:16,deaggroRadius:32,realisticInfected:true},
    {id:'crow',label:'Rot crow',template:crow,height:.58,speed:[2.8,4.2],patrolSpeed:.8,chaseMult:1.1,hp:28,damage:9,attackRange:1.15,attackMs:620,behavior:'dive',flying:true,aggroRadius:21,deaggroRadius:34,infectedMonster:true}
  ];
}
async function hydrateMobileEnemyTemplates(){
  const specs=[
    ['graveborn',ASSETS.infectedM2MZombie],['mauler',ASSETS.infectedM2MMonster3],['wretch',ASSETS.infectedM2MMonster4],['abomination',ASSETS.infectedM2MMonster5],
    ['hound',ASSETS.infectedShepherd],['spider',ASSETS.spider],['crow',ASSETS.infectedCrow]
  ];
  for(const [id,url] of specs){
    const loaded=await loadAsset(url);if(!loaded)continue;
    const a=enemyArchetypes.find(x=>x.id===id);if(a)a.template=loaded;
    await yieldToRenderer();
  }
  window.BP_HORIZON_HYDRATION.backgroundComplete=true;
}
async function buildSurvivalArtMobileFast(){
  const started=performance.now();
  window.BP_HORIZON_HYDRATION={phase:'instant-procedural',startedAt:started,mobile:true,complete:false,backgroundComplete:false};
  interiorTemplates={};pickupTemplates={};enemyArchetypes=fastEnemyArchetypes();zombieTemplates=enemyArchetypes;zombieTemplate=enemyArchetypes[0];
  try{
    const life=scatterLocalProceduralLife(),furniture=scatterStreetFurniture();
    streetLifeStats={...streetLifeStats,trees:(streetLifeStats.trees||0)+(life.trees||0),bikes:(streetLifeStats.bikes||0)+(life.bikes||0),benches:(streetLifeStats.benches||0)+(furniture.benches||0),planters:(streetLifeStats.planters||0)+(furniture.planters||0),proceduralEnemyFallback:true};
  }catch(err){streetLifeStats.mobileDecorRecovery=String(err?.message||err);console.warn('mobile decor recovered',err)}
  try{spawnOutdoorLoot()}catch(err){streetLifeStats.mobileLootRecovery=String(err?.message||err);console.warn('mobile loot recovered',err)}
  try{streetLifeStats.corpses=scatterStreetCorpses(zombieTemplate,MOBILE_GPU_SAFE?18:24)}catch(err){streetLifeStats.corpses=0;streetLifeStats.corpseRecovery=String(err?.message||err);console.warn('corpse dressing recovered',err)}
  try{streetLifeStats.fires=Math.max(Number(streetLifeStats.fires||0),scatterAmbientFires(7))}catch(err){streetLifeStats.fireRecovery=String(err?.message||err);console.warn('fire dressing recovered',err)}
  try{await buildZombies(zombieTemplate);spawnFacadeSpiders(2)}catch(err){streetLifeStats.enemyRecovery=String(err?.message||err);console.warn('enemy hydration recovered',err)}
  window.BP_HORIZON_HYDRATION={...window.BP_HORIZON_HYDRATION,phase:'ready',complete:true,readyMs:Math.round(performance.now()-started),enemyTypes:enemyArchetypes.length,assetCacheSize:assetPromiseCache.size,recovered:Boolean(streetLifeStats.mobileDecorRecovery||streetLifeStats.mobileLootRecovery||streetLifeStats.corpseRecovery||streetLifeStats.fireRecovery||streetLifeStats.enemyRecovery)};
  setTimeout(()=>hydrateMobileEnemyTemplates().catch(e=>console.warn('mobile enemy hydration',e)),1600);
  return true;
}
async function buildSurvivalArt(){
  if(MOBILE_GPU_SAFE)return buildSurvivalArtMobileFast();
  return buildSurvivalArtFull();
}
async function buildSurvivalArtFull(){
  const optional=async url=>MOBILE_GPU_SAFE?null:loadAsset(url);
  const mobileInteriorKeys=new Set(['chair','couch','table','shelf','cabinet']);
  window.BP_HORIZON_HYDRATION={phase:'essential-assets',startedAt:performance.now(),mobile:MOBILE_GPU_SAFE,complete:false};
  const [
    barrel,trash,pallet,barrier,cone,streetlight,hydrant,traffic1,traffic2,plasticBarrier,cinder,
    containerGreen,containerRed,pipes,wheelStack,townSign,pickup,sports,truck,
    zombie,zombieChubby,zombieRibcage,realHuman,realMan,realScreamer,m2mZombie,m2mMonster3,m2mMonster4,m2mMonster5,dogShepherd,dogPug,wolf,orc,spider,yeti,bear,crow,realBear,realWolf,
    chest,chestSpecial,...interiors
  ]=await Promise.all([
    loadAsset(ASSETS.barrel),loadAsset(ASSETS.trash),loadAsset(ASSETS.pallet),loadAsset(ASSETS.barrier),
    loadAsset(ASSETS.cone),loadAsset(ASSETS.streetlight),loadAsset(ASSETS.hydrant),
    optional(ASSETS.traffic1),optional(ASSETS.traffic2),optional(ASSETS.plasticBarrier),optional(ASSETS.cinder),
    optional(ASSETS.containerGreen),optional(ASSETS.containerRed),optional(ASSETS.pipes),optional(ASSETS.wheelStack),optional(ASSETS.townSign),
    loadAsset(ASSETS.vehicle),optional(ASSETS.sportsCar),optional(ASSETS.truck),
    optional(ASSETS.zombie),optional(ASSETS.zombieChubby),optional(ASSETS.zombieRibcage),
    optional(ASSETS.infectedHuman),optional(ASSETS.infectedMan),optional(ASSETS.infectedScreamer),
    loadAsset(ASSETS.infectedM2MZombie),loadAsset(ASSETS.infectedM2MMonster3),loadAsset(ASSETS.infectedM2MMonster4),loadAsset(ASSETS.infectedM2MMonster5),
    loadAsset(ASSETS.infectedShepherd),optional(ASSETS.infectedPug),optional(ASSETS.wolf),
    optional(ASSETS.orc),loadAsset(ASSETS.spider),optional(ASSETS.yeti),optional(ASSETS.bear),loadAsset(ASSETS.infectedCrow),optional(ASSETS.infectedBearReal),optional(ASSETS.infectedWolfReal),
    loadAsset(ASSETS.chest),loadAsset(ASSETS.chestSpecial),
    ...Object.entries(INTERIOR_ASSETS).map(([k,url])=>(!MOBILE_GPU_SAFE||mobileInteriorKeys.has(k))?loadAsset(url):Promise.resolve(null))
  ]);
  window.BP_HORIZON_HYDRATION.phase='scene-build';
  const keys=Object.keys(INTERIOR_ASSETS);interiorTemplates={};keys.forEach((k,i)=>interiorTemplates[k]=interiors[i]);
  pickupTemplates={chest,chestSpecial};
  const sharedHumanAnimations=await loadAsset(ASSETS.playerAnimations);
  for(const t of [m2mZombie,m2mMonster3,m2mMonster4,m2mMonster5])if(t&&(!t.animations||!t.animations.length)&&sharedHumanAnimations?.animations?.length)t.animations=sharedHumanAnimations.animations;
  enemyArchetypes=[
    m2mZombie&&{id:'graveborn',label:'Graveborn infected',template:m2mZombie,height:1.80,speed:[.40,.72],patrolSpeed:.38,chaseMult:1.68,hp:125,damage:12,attackRange:1.30,attackMs:980,behavior:'stalk',animSpeed:.86,aggroRadius:14,deaggroRadius:30,realisticInfected:true,tint:0x53584e,tintMix:.42,emissive:0x2b0202},
    m2mMonster3&&{id:'mauler',label:'Rot mauler',template:m2mMonster3,height:2.05,speed:[.48,.82],patrolSpeed:.34,chaseMult:1.60,hp:260,damage:22,attackRange:1.62,attackMs:1180,behavior:'charge',animSpeed:.9,aggroRadius:15,deaggroRadius:32,realisticInfected:true,tint:0x4c5148,tintMix:.52,emissive:0x300202},
    m2mMonster4&&{id:'wretch',label:'Wretch',template:m2mMonster4,height:1.92,speed:[.62,.98],patrolSpeed:.40,chaseMult:1.72,hp:170,damage:17,attackRange:1.42,attackMs:900,behavior:'weave',animSpeed:1.02,aggroRadius:17,deaggroRadius:34,realisticInfected:true,tint:0x565047,tintMix:.48,emissive:0x2d0202},
    m2mMonster5&&{id:'abomination',label:'Abomination',template:m2mMonster5,height:2.38,speed:[.36,.62],patrolSpeed:.30,chaseMult:1.48,hp:420,damage:34,attackRange:1.94,attackMs:1520,behavior:'charge',animSpeed:.78,aggroRadius:13,deaggroRadius:28,realisticInfected:true,tint:0x474944,tintMix:.58,emissive:0x390202},
    realHuman&&{id:'ashen',label:'Ashen infected',template:realHuman,height:1.72,speed:[.48,.72],patrolSpeed:.48,chaseMult:1.55,hp:112,damage:9,attackRange:1.28,attackMs:1080,behavior:'stalk',animSpeed:.88,aggroRadius:11,deaggroRadius:25,realisticInfected:true,tint:0x6c7465,tintMix:.42,emissive:0x160202},
    realMan&&{id:'stalker',label:'Stalker infected',template:realMan,height:1.86,speed:[.60,.92],patrolSpeed:.46,chaseMult:1.82,hp:128,damage:12,attackRange:1.34,attackMs:930,behavior:'weave',animSpeed:.96,aggroRadius:15,deaggroRadius:31,realisticInfected:true,tint:0x596257,tintMix:.46,emissive:0x210303},
    realScreamer&&{id:'screamer',label:'Screamer',template:realScreamer,height:1.77,speed:[.72,1.08],patrolSpeed:.40,chaseMult:1.92,hp:96,damage:10,attackRange:1.30,attackMs:760,behavior:'charge',burst:1.48,animSpeed:1.12,aggroRadius:20,deaggroRadius:38,realisticInfected:true,screamer:true,tint:0x747260,tintMix:.38,emissive:0x2b0303},
    realMan&&{id:'sprinter',label:'Fresh sprinter',template:realMan,height:1.82,speed:[.92,1.30],patrolSpeed:.38,chaseMult:2.05,hp:82,damage:8,attackRange:1.24,attackMs:650,behavior:'charge',burst:1.72,animSpeed:1.32,aggroRadius:18,deaggroRadius:36,realisticInfected:true,tint:0x75665f,tintMix:.30,emissive:0x240202},
    realHuman&&{id:'lurker',label:'Lurker',template:realHuman,height:1.68,speed:[.34,.54],patrolSpeed:.34,chaseMult:1.48,hp:145,damage:15,attackRange:1.38,attackMs:1320,behavior:'stalk',animSpeed:.72,aggroRadius:8,deaggroRadius:20,realisticInfected:true,tint:0x4f5d51,tintMix:.52,emissive:0x120101},
    zombie&&{id:'walker',label:'Walker',template:zombie,height:1.78,speed:[.28,.46],hp:90,damage:7,attackRange:1.25,attackMs:1150,behavior:'stalk',animSpeed:.75,aggroRadius:12,wanderRadius:5},
    zombieChubby&&{id:'bruiser',label:'Chubby infected',template:zombieChubby,height:1.88,speed:[.20,.32],hp:180,damage:14,attackRange:1.42,attackMs:1450,behavior:'stalk',animSpeed:.68,aggroRadius:10,wanderRadius:4},
    zombieRibcage&&{id:'runner',label:'Ribcage runner',template:zombieRibcage,height:1.80,speed:[.48,.76],hp:78,damage:9,attackRange:1.30,attackMs:900,behavior:'charge',burst:1.5,animSpeed:1.05,aggroRadius:19,wanderRadius:7},
    dogShepherd&&{id:'hound',label:'Rot hound',template:dogShepherd,height:1.05,speed:[1.15,1.70],hp:62,damage:11,attackRange:1.15,attackMs:720,behavior:'pounce',burst:1.42,animSpeed:1.48,tint:0x4f5a4a,tintMix:.58,emissive:0x300303,aggroRadius:16,wanderRadius:8,infectedMonster:true},
    dogPug&&{id:'pug',label:'Infected pug',template:dogPug,height:.62,speed:[1.05,1.55],hp:42,damage:7,attackRange:.92,attackMs:640,behavior:'weave',animSpeed:1.55,tint:0x6b745f,tintMix:.36,emissive:0x240a08,aggroRadius:12,wanderRadius:6},
    
    spider&&{id:'spider',label:'Carrion spider',template:spider,height:.82,speed:[.95,1.48],hp:82,damage:12,attackRange:1.08,attackMs:680,behavior:'pounce',burst:1.35,animSpeed:1.4,aggroRadius:14,wanderRadius:7,infectedMonster:true,tint:0x382f32,tintMix:.66,emissive:0x360303},
    orc&&{id:'orc',label:'Plague orc',template:orc,height:2.10,speed:[.58,.90],hp:245,damage:21,attackRange:1.62,attackMs:1250,behavior:'charge',burst:1.38,animSpeed:.98,aggroRadius:16,wanderRadius:7,infectedMonster:true,tint:0x465044,tintMix:.60,emissive:0x330303},
    yeti&&{id:'troll',label:'Rot troll',template:yeti,height:2.62,speed:[.42,.72],hp:380,damage:30,attackRange:1.92,attackMs:1580,behavior:'charge',burst:1.28,animSpeed:.78,aggroRadius:14,wanderRadius:5,infectedMonster:true,tint:0x4d5045,tintMix:.64,emissive:0x2d0202},
    realBear&&{id:'realbear',label:'Diseased bear',template:realBear,height:1.72,speed:[.78,1.18],patrolSpeed:.50,chaseMult:1.76,hp:360,damage:29,attackRange:1.9,attackMs:1380,behavior:'charge',burst:1.55,animSpeed:.92,aggroRadius:12,deaggroRadius:28,realisticInfected:true,tint:0x575b50,tintMix:.36,emissive:0x220303},
    realWolf&&{id:'realwolf',label:'Rabid wolf',template:realWolf,height:1.04,speed:[1.05,1.50],patrolSpeed:.62,chaseMult:1.96,hp:92,damage:14,attackRange:1.2,attackMs:720,behavior:'pounce',burst:1.72,animSpeed:1.42,aggroRadius:16,deaggroRadius:32,realisticInfected:true,tint:0x545b52,tintMix:.30,emissive:0x1c0202},
    bear&&{id:'bear',label:'Infected bear',template:bear,height:1.78,speed:[.72,1.28],hp:380,damage:30,attackRange:1.9,attackMs:1450,behavior:'charge',burst:1.42,animSpeed:.9,aggroRadius:12,wanderRadius:6,tint:0x4c5548,tintMix:.58,emissive:0x250303,infectedMonster:true},
    crow&&{id:'crow',label:'Rot crow',template:crow,height:.58,speed:[2.8,4.2],hp:28,damage:9,attackRange:1.15,attackMs:620,behavior:'dive',flying:true,aggroRadius:21,deaggroRadius:34,wanderRadius:12,tint:0x252625,tintMix:.68,emissive:0x2b0202,infectedMonster:true}
  ].filter(Boolean);
  zombieTemplates=enemyArchetypes;
  zombieTemplate=enemyArchetypes[0]||null;

  const dense=densePreview(),density=MAP_DENSITY,artScale=MOBILE_GPU_SAFE?.30:1;
  const D=n=>Math.max(1,Math.round(n*density*artScale));
  let props=0,vehicles=0;
  props+=scatterRoadsideTemplate(streetlight,D(dense?132:52),4.8,'sidewalk')||0;
  props+=scatterRoadsideTemplate(hydrant,D(dense?66:26),.95,'sidewalk')||0;
  props+=scatterRoadsideTemplate(traffic1,D(dense?36:12),3.4,'sidewalk')||0;
  props+=scatterRoadsideTemplate(traffic2,D(dense?28:10),3.4,'sidewalk')||0;
  props+=scatterRoadsideTemplate(barrier,D(dense?54:22),1.1,'sidewalk')||0;
  props+=scatterRoadsideTemplate(plasticBarrier,D(dense?44:18),.95,'sidewalk')||0;
  props+=scatterRoadsideTemplate(cone,D(dense?82:30),.75,'sidewalk')||0;
  props+=scatterRoadsideTemplate(trash,D(dense?92:38),.72,'sidewalk')||0;
  props+=scatterRoadsideTemplate(pallet,D(dense?34:16),.32,'sidewalk')||0;
  props+=scatterRoadsideTemplate(barrel,D(dense?46:20),1.15,'sidewalk')||0;
  props+=scatterRoadsideTemplate(cinder,D(dense?60:20),.28,'sidewalk')||0;
  props+=scatterRoadsideTemplate(pipes,D(dense?20:8),.70,'sidewalk')||0;
  props+=scatterRoadsideTemplate(wheelStack,D(dense?28:10),.75,'sidewalk')||0;
  props+=scatterRoadsideTemplate(townSign,D(dense?18:8),1.8,'sidewalk')||0;
  props+=scatterRoadsideTemplate(containerGreen,D(dense?12:4),2.5,'sidewalk')||0;
  props+=scatterRoadsideTemplate(containerRed,D(dense?12:4),2.5,'sidewalk')||0;

  vehicles+=scatterRoadsideTemplate(pickup,D(dense?36:12),1.72,'parking')||0;
  vehicles+=scatterRoadsideTemplate(sports,D(dense?34:10),1.35,'parking')||0;
  vehicles+=scatterRoadsideTemplate(truck,D(dense?18:7),2.25,'parking')||0;

  // Every preset gets a different visual signature while all geometry still comes from the BridgePoint stream.
  if(MAP_PRESET.theme==='harbor'||MAP_PRESET.theme==='industrial'){
    props+=scatterRoadsideTemplate(containerGreen,D(dense?28:14),2.5,'sidewalk')||0;
    props+=scatterRoadsideTemplate(containerRed,D(dense?24:12),2.5,'sidewalk')||0;
    props+=scatterRoadsideTemplate(barrel,D(dense?48:24),1.15,'sidewalk')||0;
    props+=scatterRoadsideTemplate(pipes,D(dense?22:12),.70,'sidewalk')||0;
  }else if(MAP_PRESET.theme==='mountain'){
    props+=scatterRoadsideTemplate(pallet,D(dense?26:18),.32,'sidewalk')||0;
    props+=scatterRoadsideTemplate(barrier,D(dense?34:20),1.1,'sidewalk')||0;
  }else if(MAP_PRESET.theme==='desert'){
    props+=scatterRoadsideTemplate(wheelStack,D(dense?36:20),.75,'sidewalk')||0;
    props+=scatterRoadsideTemplate(cinder,D(dense?52:28),.28,'sidewalk')||0;
  }else{
    props+=scatterRoadsideTemplate(trash,D(dense?70:34),.72,'sidewalk')||0;
    props+=scatterRoadsideTemplate(cone,D(dense?52:28),.75,'sidewalk')||0;
    props+=scatterRoadsideTemplate(barrier,D(dense?38:22),1.1,'sidewalk')||0;
  }

  let localProps=0,localVehicles=0;
  localProps+=scatterRoadsideTemplateLocal(streetlight,D(dense?42:20),4.8,'sidewalk')||0;
  localProps+=scatterRoadsideTemplateLocal(hydrant,D(dense?20:10),.95,'sidewalk')||0;
  localProps+=scatterRoadsideTemplateLocal(trash,D(dense?30:16),.72,'sidewalk')||0;
  localProps+=scatterRoadsideTemplateLocal(cone,D(dense?24:12),.75,'sidewalk')||0;
  localProps+=scatterRoadsideTemplateLocal(barrier,D(dense?18:8),1.1,'sidewalk')||0;
  localVehicles+=scatterRoadsideTemplateLocal(pickup,D(dense?12:6),1.72,'parking')||0;
  localVehicles+=scatterRoadsideTemplateLocal(sports,D(dense?14:5),1.35,'parking')||0;
  localVehicles+=scatterRoadsideTemplateLocal(truck,D(dense?6:3),2.25,'parking')||0;

  const life=scatterProceduralStreetLife();
  const localLife=scatterLocalProceduralLife();
  const furniture=scatterStreetFurniture();
  const grass=buildGrassDetails();
  const denseVeg=buildDenseVegetation();
  const drivable=
    spawnDrivableVehicle(pickup,'pickup',MOBILE_GPU_SAFE?2:(dense?5:3),1.72)+
    spawnDrivableVehicle(sports,'sports',MOBILE_GPU_SAFE?0:(dense?5:2),1.35)+
    spawnDrivableVehicle(truck,'truck',MOBILE_GPU_SAFE?0:(dense?3:2),2.25)+
    spawnDrivableBike(MOBILE_GPU_SAFE?2:(dense?5:3));
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
  dressOpenSourceBuildings(m2mZombie||zombie);
  streetLifeStats.corpses=scatterStreetCorpses(m2mZombie||zombie,MOBILE_GPU_SAFE?18:(densePreview()?52:24));
  streetLifeStats.fires=scatterAmbientFires(MOBILE_GPU_SAFE?7:(densePreview()?15:7));
  await buildZombies(zombieTemplate);
  spawnFacadeSpiders(MOBILE_GPU_SAFE?2:(densePreview()?5:3));
  window.BP_HORIZON_HYDRATION={...window.BP_HORIZON_HYDRATION,phase:'ready',complete:true,readyMs:Math.round(performance.now()-window.BP_HORIZON_HYDRATION.startedAt),enemyTypes:enemyArchetypes.length,assetCacheSize:assetPromiseCache.size};
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
  loadExploration();loadMapMarkers();
}
function revealMap(x,y,save=true){
  const m=toMapXY(x,y);fogCtx.globalCompositeOperation='destination-out';
  const radius=densePreview()?13:15,gr=fogCtx.createRadialGradient(m.x,m.y,2,m.x,m.y,radius);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.72,'rgba(0,0,0,.96)');gr.addColorStop(1,'rgba(0,0,0,0)');
  fogCtx.fillStyle=gr;fogCtx.beginPath();fogCtx.arc(m.x,m.y,radius,0,Math.PI*2);fogCtx.fill();
  if(save){
    exploredPoints.push([Math.round(x),Math.round(y)]);if(exploredPoints.length>500)exploredPoints.shift();
    try{localStorage.setItem(mapStorageKey('horizon-explore'),JSON.stringify(exploredPoints))}catch(_){}
  }
}
function loadExploration(){
  try{const a=JSON.parse(localStorage.getItem(mapStorageKey('horizon-explore'))||'[]');if(Array.isArray(a)){exploredPoints=a.slice(-500);for(const p of exploredPoints)revealMap(+p[0],+p[1],false)}}catch(_){}
}
function mapStorageKey(prefix){return prefix+'-'+CELL+'-'+MAP_PRESET.id}
function mapMarkerKey(){return mapStorageKey('horizon-map-markers')}
function loadMapMarkers(){try{const v=JSON.parse(localStorage.getItem(mapMarkerKey())||'[]');mapMarkers=Array.isArray(v)?v.slice(-250):[]}catch(_){mapMarkers=[]}}
function saveMapMarkers(){try{localStorage.setItem(mapMarkerKey(),JSON.stringify(mapMarkers.slice(-250)))}catch(_){}}
function mapPixelToWorld(px,py){
  const west=project([data.bbox.west,lat0]).x,east=project([data.bbox.east,lat0]).x,south=project([lon0,data.bbox.south]).y,north=project([lon0,data.bbox.north]).y;
  return{x:west+(px/mapBase.width)*(east-west),y:south+((mapBase.height-py)/mapBase.height)*(north-south)};
}
function markerColor(type){return({loot:'#e8b85f',searched:'#73e6a0',danger:'#e75d55',vehicle:'#73b9e6',base:'#d79cff'}[type]||'#fff')}
function drawMapMarkers(ctx,scale=1){
  for(const m of mapMarkers){const p=toMapXY(m.x,m.y);ctx.fillStyle=markerColor(m.type);ctx.beginPath();ctx.arc(p.x,p.y,Math.max(2.2,3.4/scale),0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.75)';ctx.lineWidth=Math.max(.7,1/scale);ctx.stroke()}
}
function addMapMarkerWorld(x,y,type=mapMarkerType,label=''){
  const nearby=mapMarkers.find(m=>m.type===type&&Math.hypot(m.x-x,m.y-y)<4);
  if(nearby){nearby.x=x;nearby.y=y;nearby.label=label||nearby.label}else mapMarkers.push({x,y,type,label,at:Date.now()});
  saveMapMarkers();renderWorldMapOverlay();
}
function renderWorldMapOverlay(){
  const canvas=$('worldMapCanvas');if(!canvas)return;
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.save();
  const z=worldMapZoom,cx=w/2,cy=h/2;ctx.translate(cx,cy);ctx.scale(z,z);ctx.translate(-mapBase.width/2,-mapBase.height/2);
  ctx.drawImage(mapBase,0,0);ctx.drawImage(mapFog,0,0);drawMapMarkers(ctx,z);
  if(playerRoot){const p=toMapXY(playerRoot.position.x,playerRoot.position.y);ctx.fillStyle='#8effb5';ctx.beginPath();ctx.arc(p.x,p.y,4/z,0,Math.PI*2);ctx.fill()}
  ctx.restore();$('mapZoomLabel').textContent=Math.round(z*100)+'%';
}
function openWorldMap(){worldMapOpen=true;$('worldMapOverlay').hidden=false;renderWorldMapOverlay()}
function closeWorldMap(){worldMapOpen=false;$('worldMapOverlay').hidden=true}
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
  mapCtx.drawImage(mapBase,0,0);mapCtx.drawImage(mapFog,0,0);drawMapMarkers(mapCtx,1);
  const p=toMapXY(playerRoot.position.x,playerRoot.position.y);
  mapCtx.save();mapCtx.translate(p.x,p.y);mapCtx.rotate(-yaw);mapCtx.fillStyle='#8effb5';mapCtx.beginPath();mapCtx.moveTo(0,-7);mapCtx.lineTo(5,6);mapCtx.lineTo(-5,6);mapCtx.closePath();mapCtx.fill();mapCtx.restore();
}

function updateReticleUi(moving=false,sprint=false){
  const cross=$('crosshair'),sight=$('weaponSight'),gun=isFirearm(activeWeapon);
  if(cross){cross.hidden=!gun||playerDead;cross.classList.toggle('ads',aiming);cross.style.setProperty('--spread',reticleSpread.toFixed(1)+'px')}
  if(sight){sight.hidden=!(gun&&aiming&&!playerDead);sight.classList.toggle('firing',muzzleFlash>0)}
  document.body.classList.toggle('adsMode',gun&&aiming);
}
function setAiming(v){
  aiming=Boolean(v)&&isFirearm(activeWeapon)&&!playerDead;
  $('aimBtn')?.classList.toggle('active',aiming);
  updateReticleUi();
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
    if(e.code==='KeyH')dropActiveWeapon();
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
  $('kickBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();kickNearestDoor()});
  const attackBtn=$('attackBtn');
  attackBtn?.addEventListener('pointerdown',e=>{e.preventDefault();fireHeld=true;useActiveWeapon()});
  attackBtn?.addEventListener('pointerup',()=>fireHeld=false);
  attackBtn?.addEventListener('pointercancel',()=>fireHeld=false);
  $('weaponBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();cycleWeapon()});
  $('reloadBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();requestReload()});
  $('dropBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();dropActiveWeapon()});
  $('dropMobileBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();dropActiveWeapon()});
  $('inventoryList')?.addEventListener('pointerdown',e=>{const tile=e.target?.closest?.('[data-item]'),item=tile?.dataset?.item;if(item)equipInventoryWeapon(item)});
  const aimBtn=$('aimBtn');aimBtn?.addEventListener('pointerdown',e=>{e.preventDefault();setAiming(true)});aimBtn?.addEventListener('pointerup',()=>setAiming(false));aimBtn?.addEventListener('pointercancel',()=>setAiming(false));
  document.querySelectorAll('.loadoutSlot[data-slot]').forEach(btn=>btn.addEventListener('pointerdown',e=>{e.preventDefault();selectSlot(btn.dataset.slot)}));
  const sprint=$('sprintBtn');sprint?.addEventListener('pointerdown',e=>{e.preventDefault();mobileSprint=true});sprint?.addEventListener('pointerup',()=>mobileSprint=false);sprint?.addEventListener('pointercancel',()=>mobileSprint=false);

  $('moreBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();$('mobileActionTray')?.classList.toggle('open')});
  $('flashMobileBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();toggleFlashlight()});
  $('mapMobileBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();openWorldMap()});
  $('minimap')?.addEventListener('pointerdown',e=>{e.preventDefault();openWorldMap()});
  $('mapCloseBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();closeWorldMap()});
  $('mapZoomIn')?.addEventListener('pointerdown',e=>{e.preventDefault();worldMapZoom=Math.min(3.2,worldMapZoom*1.25);renderWorldMapOverlay()});
  $('mapZoomOut')?.addEventListener('pointerdown',e=>{e.preventDefault();worldMapZoom=Math.max(.75,worldMapZoom/1.25);renderWorldMapOverlay()});
  document.querySelectorAll('[data-map-marker]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();mapMarkerType=b.dataset.mapMarker;document.querySelectorAll('[data-map-marker]').forEach(x=>x.classList.toggle('active',x===b))}));
  $('worldMapCanvas')?.addEventListener('pointerdown',e=>{const canvas=e.currentTarget,rect=canvas.getBoundingClientRect(),sx=(e.clientX-rect.left)/rect.width*canvas.width,sy=(e.clientY-rect.top)/rect.height*canvas.height,cx=canvas.width/2,cy=canvas.height/2,px=(sx-cx)/worldMapZoom+mapBase.width/2,py=(sy-cy)/worldMapZoom+mapBase.height/2,w=mapPixelToWorld(px,py);addMapMarkerWorld(w.x,w.y,mapMarkerType,mapMarkerType)});
  $('cameraBtn').onclick=()=>cameraMode=(cameraMode+1)%2;
  $('lightBtn').onclick=()=>{autoDayNight=false;setLighting(lightMode+1);showToast('Manual lighting enabled')};
  $('parcelBtn').onclick=()=>{if(!interiorMode){parcelLayer.visible=!parcelLayer.visible;$('parcelBtn').classList.toggle('active',parcelLayer.visible)}};
  $('artBtn').onclick=()=>{if(!interiorMode){artGroup.visible=!artGroup.visible;zombieGroup.visible=artGroup.visible;entryGroup.visible=artGroup.visible;$('artBtn').classList.toggle('active',artGroup.visible)}};
}
function lerpAngle(a,b,t){let d=(b-a+Math.PI)%(Math.PI*2)-Math.PI;return a+d*t}
function playerFacingYaw(worldHeading){return worldHeading+playerModelYawOffset}
function visualFacingAlignment(worldHeading=0){
  const rootHeading=playerFacingYaw(worldHeading),visualFix=M2M_PLAYER_KEYS.has(CHARACTER_KEY)?0:Math.PI,visualHeading=rootHeading+visualFix;
  return{
    dot:Math.cos(visualHeading-worldHeading),
    expectedHeading:worldHeading,gameplayRootHeading:rootHeading,visualHeading,
    modelYawOffset:playerModelYawOffset,visualImportYawFix:visualFix,
    locomotionRootMatchesTravel:Math.cos(visualHeading-worldHeading)>.92
  };
}
function normalizeMovementInput(ix,iy){
  ix=Number.isFinite(ix)?ix:0;iy=Number.isFinite(iy)?iy:0;
  const ax=Math.abs(ix),ay=Math.abs(iy);
  // Strong cardinal lock for sticks/pads: pushing mostly forward/back never leaks sideways,
  // and pushing mostly left/right never leaks forward/back.
  if(ay>.06&&ax<ay*.30)ix=0;
  else if(ax>.06&&ay<ax*.30)iy=0;
  const len=Math.hypot(ix,iy);
  if(len>1){ix/=len;iy/=len}
  if(Math.hypot(ix,iy)<.06)return{x:0,y:0};
  return{x:ix,y:iy};
}
function movementVector(ix,iy,angle=yaw){
  // Controls are camera-relative and literal:
  // +Y = forward, -Y = backward, -X = left, +X = right.
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
  ({x:ix,y:iy}=normalizeMovementInput(ix,iy));
  const moving=Math.hypot(ix,iy)>.06,sprint=(keys.has('ShiftLeft')||keys.has('ShiftRight')||mobileSprint)&&!aiming&&playerStance==='stand'&&iy>.18;
  if(activeVehicle){
    updateVehicle(dt,ix,iy);maybeNationalTravel();return;
  }
  if(slideTime>0){slideTime=Math.max(0,slideTime-dt);if(slideTime===0&&playerStance==='crouch')setPlayerStance('stand')}
  const stanceSpeed=(STANCES[playerStance]||STANCES.stand).speed,slideBoost=slideTime>0?1.85:1;
  const speed=(interiorMode?3.05:PLAYER_BASE_SPEED)*(sprint?PLAYER_SPRINT_MULT:1)*(aiming?.72:1)*stanceSpeed*slideBoost;
  if(slideTime>0&&Math.hypot(ix,iy)<.2)iy=1;
  const move=movementVector(ix,iy,yaw);
  let desiredX=moving||slideTime>0?move.x*speed:0,desiredY=moving||slideTime>0?move.y*speed:0;
  if(!interiorMode&&playerRoot){
    if(playerBlocked(playerRoot.position.x+desiredX*dt,playerRoot.position.y))desiredX=0;
    if(playerBlocked(playerRoot.position.x,playerRoot.position.y+desiredY*dt))desiredY=0;
    if(CELL==='national'&&boundaryBlocks(playerRoot.position.x+desiredX*dt,playerRoot.position.y))desiredX=0;
    if(CELL==='national'&&boundaryBlocks(playerRoot.position.x,playerRoot.position.y+desiredY*dt))desiredY=0;
    if(matchBlocks(playerRoot.position.x+desiredX*dt,playerRoot.position.y+desiredY*dt)){desiredX=0;desiredY=0}
  }
  // Shooter locomotion: immediate direction changes but eased speed changes, giving a
  // planted acceleration/deceleration response without the old sideways drift.
  const accel=moving||slideTime>0?24:38,blend=1-Math.exp(-accel*dt);
  playerVelocity.x=THREE.MathUtils.lerp(playerVelocity.x,desiredX,blend);
  playerVelocity.y=THREE.MathUtils.lerp(playerVelocity.y,desiredY,blend);

  let usedRapier=false;
  if(!interiorMode&&physicsReady&&playerPhysicsBody&&playerPhysicsCollider){
    usedRapier=movePlayerRapier(playerVelocity.x*dt,playerVelocity.y*dt,dt);
  }
  if(!usedRapier){
    movePlayerStable(playerVelocity.x*dt,playerVelocity.y*dt);
    const targetGround=interiorMode?interiorGroundZ(playerRoot.position.x,playerRoot.position.y):surfaceZXY(playerRoot.position.x,playerRoot.position.y)+.015;
    playerRoot.position.z=THREE.MathUtils.lerp(playerRoot.position.z,targetGround,1-Math.exp(-22*dt));
  }

  const firearm=isFirearm(activeWeapon);
  if(firearm){
    // With a gun drawn the torso stays camera-relative, so forward/back/strafe input never
    // corkscrews the survivor. Melee still turns into travel.
    playerRoot.rotation.z=lerpAngle(playerRoot.rotation.z,yaw,1-Math.exp(-(aiming?20:15)*dt));
  }else if(moving||slideTime>0){
    const targetRot=Math.atan2(move.x,move.y);
    playerRoot.rotation.z=lerpAngle(playerRoot.rotation.z,targetRot,1-Math.exp(-14*dt));
  }
  if(playerStance==='prone')locomotionIntent='prone';
  else if(playerStance==='crouch')locomotionIntent=moving?'crouchWalk':'crouchIdle';
  else if(reloadState.active)locomotionIntent='reload';
  else if(aiming&&firearm&&!moving)locomotionIntent='aim';
  else if(firearm&&!moving)locomotionIntent='gunIdle';
  else if(moving&&sprint)locomotionIntent='sprint';
  else if(moving&&firearm&&iy<-.28)locomotionIntent='back';
  else if(moving&&firearm&&Math.abs(ix)>Math.max(.34,Math.abs(iy)*.72))locomotionIntent=ix<0?'strafeL':'strafeR';
  else locomotionIntent=moving?'walk':firearm?'gunIdle':'idle';
  if(swingTime<=0||reloadState.active)playPlayerAnimation(locomotionIntent);
  if(playerAction)playerAction.setEffectiveTimeScale(sprint?1.18:moving?1.0:.92);
  playerMixer?.update(dt);
  applyProceduralAim();
  const nowAudio=performance.now();
  if(moving&&grounded&&nowAudio-lastFootstepAt>(sprint?280:430)){lastFootstepAt=nowAudio;if(audioCtx)spatialTone(playerRoot.position,'foot')}

  if(interiorMode){if(maybeUseWalkableStairs())return;if(maybeWalkOutOpenDoor())return}
  if(!interiorMode){
    if(maybeWalkThroughOpenDoor())return;
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
  const dist=aiming?.92:interiorMode?(cameraMode===0?2.85:1.72):(cameraMode===0?3.8:2.0);
  const shoulder=(aiming?.20:cameraMode===0?.42:.27)+leanAmount*.48;
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

const yieldToRenderer=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));
async function boot(){
  const bootStarted=performance.now();
  try{
    $('cellLabel').textContent=worldCellLabel();
    $('worldTitle').textContent=worldCellTitle();
    restoreSurvivor();updateInventory();
    loadText.textContent='Streaming BridgePoint map…';
    // Do not hold the first playable frame behind weapon-registry, physics-module or
    // post-processing network work. Defaults/manual collision are valid until those hydrate.
    const weaponReady=loadWeaponRegistry().catch(()=>false);
    const physicsReadyPromise=initRapierPhysics().catch(()=>false);
    const sceneReady=fetchSceneWithRetry(worldRequestUrl(),3);
    data=await sceneReady;if(!data?.complete)throw new Error(data?.error||'Horizon scene incomplete');
    lon0=Number(data.center.lon);lat0=Number(data.center.lat);mx=111320*Math.cos(lat0*Math.PI/180);my=110540;
    const meta=$('jurisdictionMeta');if(meta&&CELL==='national')meta.textContent=(JURISDICTIONS[SELECTED_STATE]?.[0]||SELECTED_STATE)+' · '+(data.counts?.buildings||0).toLocaleString()+' buildings · '+(data.counts?.parcels||0).toLocaleString()+' open parcel outlines · '+Number(data.span_km||STREAM_SPAN).toFixed(1)+' km streamed cell';

    // Critical path is intentionally tiny: source-backed terrain/roads plus a one-draw-call
    // skyline massing, then the survivor. Exact footprints, doors, windows and props hydrate
    // without blocking control.
    buildAtmosphere();buildTerrain();buildRoads();buildWater();buildWaterfrontPerimeter();buildInstantBuildingMassing();
    addLights();setLighting(0);drawMinimapBase();initInput();
    await buildPlayer();
    if(physicsReady){ensureTerrainPhysicsCollider();createPlayerPhysics()}
    else physicsReadyPromise.then(ok=>{
      if(!ok)return;
      ensureTerrainPhysicsCollider();
      // Snap to the current BridgePoint surface before turning Rapier on so the
      // delayed physics module can never inherit a below-ground transform.
      if(playerRoot&&!interiorMode){
        playerRoot.position.z=Math.max(playerRoot.position.z,surfaceZXY(playerRoot.position.x,playerRoot.position.y)+.015);
      }
      if(playerRoot&&!playerPhysicsBody)createPlayerPhysics();
    });
    renderFactionBanner();initFlashlight();
    revealMap(playerRoot.position.x,playerRoot.position.y,true);lastReveal=playerRoot.position.clone();
    updateInventory();updateInteractionPrompt();resizeRenderer();
    window.BP_HORIZON_PLAYABLE={ok:true,build:BUILD_VERSION,readyMs:Math.round(performance.now()-bootStarted),stance:playerStance,weaponSocket:equipmentMounts.activeGrip?.userData?.socketBone||null,map:MAP_PRESET.id,instantBuildings:Number(streetLifeStats.instantMassing||0)};
    window.BP_HORIZON_QUICK_TEST={
      facing:()=>visualFacingAlignment(yaw),
      activeWeapon:()=>({name:activeWeapon,visible:Boolean(equipmentMounts.activeGrip?.children?.some?.(hasRenderableWeapon)),children:equipmentMounts.activeGrip?.children?.length||0}),
      switchAllWeapons:()=>{
        const prior={equipment:{...equipment},slot:activeSlot,weapon:activeWeapon};
        const out=[];
        for(const cfg of DEFAULT_WEAPON_CONFIGS){
          if(cfg.weapon_name==='Fists')continue;
          equipment[cfg.equip_slot]=cfg.weapon_name;activeSlot=cfg.equip_slot;activeWeapon=cfg.weapon_name;equippedWeaponName=cfg.weapon_name;refreshEquipmentVisuals();
          const child=equipmentMounts.activeGrip?.children?.[0]||null;
          out.push({weapon:cfg.weapon_name,visible:hasRenderableWeapon(child),children:equipmentMounts.activeGrip?.children?.length||0});
        }
        equipment={...prior.equipment};activeSlot=prior.slot;activeWeapon=prior.weapon;equippedWeaponName=prior.weapon;refreshEquipmentVisuals();
        return out;
      }
    };
    loadText.textContent='PLAYABLE · exact buildings and apocalypse details streaming…';

    // Immediate gameplay hydration: doors, apocalypse ground and hostile pressure are
    // ready before any expensive facade/parts/parcel decoration. Those details stream later.
    await yieldToRenderer();
    try{buildEntryPoints();installInteractiveDoors()}catch(err){console.error('door system recovered',err);streetLifeStats.buildingGeometryError=String(err?.message||err)}
    await yieldToRenderer();
    try{buildApocalypseGroundDressing();buildDenseApocalypseLayers()}catch(err){console.warn('ground dressing skipped',err)}
    loadText.textContent='PLAYABLE · infected entering world…';
    await buildSurvivalArt();
    configureMatchMode(matchMode);
    loadText.textContent=(data.counts?.buildings||0).toLocaleString()+' source-backed buildings · '+buildingEntries.length+' walk-through doorways · endless horde active';
    window.BP_HORIZON_SMOKE={
      ok:true,cell:CELL,buildings:Number(data.counts?.buildings||0),parts:Number(data.counts?.building_parts||0),
      player:Boolean(playerRoot),playerAssetLoaded,playerAssetMode,character:CHARACTER_KEY,preview:PREVIEW_KEY,mapPreset:MAP_PRESET.id,mapCount:MAP_PRESETS.length,mapSize:MAP_PRESET.size,endlessHorde:ENDLESS_HORDE,endlessCap:maxActiveZombies,loot:buildingEntries.length,zombies:zombies.length,entries:buildingEntries.length,
      enemyArchetypes:enemyArchetypes.map(x=>x.id),realisticInfected:enemyArchetypes.filter(x=>x.realisticInfected).length,precomputedPatrols:zombies.filter(z=>z.patrolRoute?.length>1).length,mapMarkers:mapMarkers.length,groundDetails:Number(streetLifeStats.groundDetails||0),climbingSpiders:zombies.filter(z=>z.kind==='spider'&&z.climb).length,weaponCatalog:[...new Set([...DEFAULT_WEAPON_CONFIGS.map(x=>x.weapon_name),...weaponRegistry.values()].map(x=>x.weapon_name).filter(Boolean))],dropWeapon:true,
      packCapacity,weapon:equippedWeaponName,interiorAssets:Object.values(interiorTemplates).filter(Boolean).length,
      artChildren:artGroup.children.length,roadLayers:roadLayer?.children?.length||0,streetLife:{...streetLifeStats},denseApocalypse:true,
      spawnBlocked:isBlockedExterior(playerRoot.position.x,playerRoot.position.y,.36),
      visiblePack:Boolean(packMesh),pickupCount:worldPickups.filter(p=>p.active&&p.mode==='exterior').length,
      equipment:{...equipment},
      playerSurfaceZ:surfaceZXY(playerRoot.position.x,playerRoot.position.y),locomotionIntent,reticleSpread,
      playerRootZ:playerRoot.position.z,
      activeWeapon,activeSlot,zombieVariants:zombieTemplates.length,
      physicsMode,physicsReady,physicsError,terrainPhysicsReady:Boolean(terrainPhysicsCollider),terrainSafetyRescues,postFxMode,boundaryEdges:[...activeBoundaryEdges],build:BUILD_VERSION,
      navNodes:navNodes.length,drivableVehicles:drivableVehicles.length,stance:playerStance,fastPlayableMs:Number(window.BP_HORIZON_PLAYABLE?.readyMs||0),weaponSocket:equipmentMounts.activeGrip?.userData?.socketBone||null,assetCacheSize:assetPromiseCache.size,assetLoadLimit:ASSET_LOAD_LIMIT,assetTimeoutMs:ASSET_TIMEOUT_MS,mobileGpuSafe:MOBILE_GPU_SAFE,hydrationReadyMs:Number(window.BP_HORIZON_HYDRATION?.readyMs||0),proceduralFastHydration:Boolean(streetLifeStats.proceduralEnemyFallback),cloneRecovery4237:true,detailHydrationComplete:Boolean(streetLifeStats.detailHydrationComplete),hydrationComplete:Boolean(window.BP_HORIZON_HYDRATION?.complete),worldTickMs:MOBILE_GPU_SAFE?34:16,minimapTickMs:MOBILE_GPU_SAFE?140:70,instantMassing:Number(streetLifeStats.instantMassing||0),
      streamed:Boolean(data?.streamed),resolvedJurisdiction:data?.resolved_jurisdiction||null,
      weaponRegistryMode,weaponRegistrySize:new Set([...weaponRegistry.values()].map(x=>x.weapon_id)).size,
      weaponRegistryError,mobileInputMode,reserveAmmo:{...reserveAmmo},
      reloadActive:reloadState.active,aimFov:weaponCfg(activeWeapon).aim_fov,
      sceneFetchAttempts,sceneFetchError,decayPatchedMaterials,smartSnappedProps,openSpaceProps,doorSystemCount,activeDoorVisuals:Number(streetLifeStats.activeDoorVisuals||0),doorStreaming:true,fullHeightLazyTowers:true,walkableStairs:true,transparentFacadeWindows:true,openSourceBuildings:Number(streetLifeStats.openBuildings||0),doorableBuildings:Number(streetLifeStats.doorableBuildings||0),lazyOpenBuildings:true,seamlessOpenBuildings:true,towerPriorityOpenBuildings:true,optimizedOpenBuildingPhysics:true,shapeRecovery:true,staticMapCache:Boolean(streetLifeStats.staticMapCache),invalidShapes:Number(streetLifeStats.invalidShapes||0),shellFailures:Number(streetLifeStats.shellFailures||0),openInteriorProps:Number(streetLifeStats.openInteriorProps||0),
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
        ({x:ix,y:iy}=normalizeMovementInput(ix,iy));
        const v=movementVector(ix,iy,0);
        return {dx:v.x,dy:v.y,heading:Math.atan2(v.x,v.y)};
      },
      visualFacingAlignment,
      playerAssetProbe:()=>({loaded:playerAssetLoaded,mode:playerAssetMode,character:CHARACTER_KEY,stance:playerStance,visualScaleZ:playerVisualRoot?.scale?.z||null,baseScaleZ:playerVisualBaseScaleZ,weaponSocket:equipmentMounts.activeGrip?.userData?.socketBone||null,bones:Object.fromEntries(Object.entries(aimBones).map(([k,v])=>[k,Boolean(v)]))}),
      aimProbe:()=>{
        addInventoryItem('Pistol');selectSlot('sidearm',true);setAiming(false);camera.fov=66;camera.updateProjectionMatrix();
        const before=camera.fov,target=weaponCfg('Pistol').aim_fov;
        setAiming(true);for(let i=0;i<50;i++)updateCamera(1/60);
        const aimed=camera.fov,crosshairVisible=!$('crosshair')?.hidden,buttonActive=$('aimBtn')?.classList.contains('active')||false;
        setAiming(false);for(let i=0;i<30;i++)updateCamera(1/60);
        return{before,target,aimed,restored:camera.fov,crosshairVisible,buttonActive};
      },
      dropWeaponAvailable:()=>Boolean(activeItemForSlot(activeSlot)&&activeWeapon!=='Fists'),
      enemyCatalog:()=>enemyArchetypes.map(x=>({id:x.id,label:x.label,speed:x.speed,hp:x.hp,damage:x.damage,behavior:x.behavior,realistic:Boolean(x.realisticInfected),infected:Boolean(x.realisticInfected||x.infectedMonster)})),
      pursuitProbe:()=>({maxHostileSpeed:MAX_HOSTILE_SPEED,playerSprintSpeed:PLAYER_MAX_SPEED,interiorPathing:true,doorwayCarry:true}),
      patrolProbe:()=>zombies.filter(z=>!z.dead&&z.kind!=='crow'&&!(z.kind==='spider'&&z.climb)).slice(0,8).map(z=>({kind:z.kind,route:z.patrolRoute?.length||0,index:z.patrolIndex,state:z.state,aggro:z.aggro,chaseMult:z.chaseMult})),
      climbingSpiderCount:()=>zombies.filter(z=>z.kind==='spider'&&z.climb).length,
      weaponCatalog:()=>[...new Set([...DEFAULT_WEAPON_CONFIGS.map(x=>x.weapon_name),...weaponRegistry.values()].map(x=>x.weapon_name).filter(Boolean))],
      allWeaponsVisibleProbe:()=>window.BP_HORIZON_QUICK_TEST?.switchAllWeapons?.()||[],
      cardinalControlsProbe:()=>{
        const probe=(x,y)=>{const n=normalizeMovementInput(x,y),v=movementVector(n.x,n.y,0),heading=Math.atan2(v.x,v.y);return{x:n.x,y:n.y,dx:v.x,dy:v.y,heading,playerYaw:playerFacingYaw(heading)}};
        return{
          forward:probe(0,1),backward:probe(0,-1),left:probe(-1,0),right:probe(1,0),
          forwardStickNoise:probe(.12,.9),rightStickNoise:probe(.9,.12),
          modelYawOffset:playerModelYawOffset,
          locomotionAlwaysFacesTravel:false,
          aimingBackpedalAllowed:true,
          shooterAimFacesCamera:true,
          maxHostileSpeed:MAX_HOSTILE_SPEED,
          playerSprintSpeed:PLAYER_MAX_SPEED
        };
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
      heldWeaponProbe:()=>{
        addInventoryItem('Pistol');selectSlot('sidearm',true);refreshEquipmentVisuals();
        const m=equipmentMounts.activeGrip,child=m?.children?.[0]||null;
        if(!child)return{visible:false,children:m?.children?.length||0};
        child.updateWorldMatrix(true,true);const box=new THREE.Box3().setFromObject(child),size=new THREE.Vector3(),center=new THREE.Vector3();box.getSize(size);box.getCenter(center);
        const p=playerRoot.position;return{visible:true,children:m.children.length,size:{x:size.x,y:size.y,z:size.z},distance:Math.hypot(center.x-p.x,center.y-p.y,center.z-(p.z+1.1)),weapon:activeWeapon};
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
      terrainGuardProbe:()=>{
        if(!playerRoot)return null;
        const surface=surfaceZXY(playerRoot.position.x,playerRoot.position.y)+.015,prior=playerRoot.position.clone();
        playerRoot.position.z=surface-4;
        if(physicsReady&&playerPhysicsBody)syncPhysicsToPlayer();
        updatePlayer(1/60);
        const after=playerRoot.position.z,ok=after>=surface-.04;
        playerRoot.position.copy(prior);if(physicsReady&&playerPhysicsBody)syncPhysicsToPlayer();
        return{surface,after,ok,physicsReady,terrainPhysicsReady:Boolean(terrainPhysicsCollider),terrainSafetyRescues};
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
    const hydrateDeferredWorld=async()=>{
      loadText.textContent='PLAYABLE · high-detail facades and interiors streaming…';
      await yieldToRenderer();
      try{buildFacadeDetails()}catch(err){console.warn('facade details skipped',err)}
      await yieldToRenderer();
      try{buildParts()}catch(err){console.warn('building parts skipped',err)}
      await yieldToRenderer();
      try{buildParcels()}catch(err){console.warn('parcel overlay skipped',err)}
      applyApocalypseDecay(worldGroup);
      if(!MOBILE_GPU_SAFE)initPostProcessing();
      await weaponReady;
      initializeVehicleRepair();snapInfrastructureToRoadNodes();populateOpenSpace();
      streetLifeStats.detailHydrationComplete=true;
      loadText.textContent=(data.counts?.buildings||0).toLocaleString()+' source-backed buildings · '+buildingEntries.length+' walk-through doorways · endless horde active';
    };
    setTimeout(()=>hydrateDeferredWorld().catch(err=>console.warn('deferred world hydration',err)),MOBILE_GPU_SAFE?2200:250);
  }catch(e){
    console.error(e);window.BP_HORIZON_SMOKE={ok:false,cell:CELL,error:String(e?.message||e)};$('error').hidden=false;$('errorText').textContent=String(e?.message||e);loadText.textContent='Preview unavailable';
  }
}

let lastPrompt=0,lastWorldTick=0,lastSmokeTick=0,lastMiniTick=0;
function loop(now=performance.now()){
  const dt=Math.min(.05,clock.getDelta()||.016);
  updateWeapon(dt);updatePlayer(dt);
  const worldCadence=MOBILE_GPU_SAFE?34:16;
  if(now-lastWorldTick>=worldCadence){
    const wdt=Math.min(.07,lastWorldTick?Math.max(.012,(now-lastWorldTick)/1000):dt);
    updateZombieWaves(now);updateZombies(wdt,now);animatePickups(wdt,now);updateDoors(wdt);lastWorldTick=now;
  }
  if(now-lastSmokeTick>=(MOBILE_GPU_SAFE?80:32)){updateAmbientSmoke(Math.min(.09,(now-lastSmokeTick)/1000||dt),now);lastSmokeTick=now}
  if(spectatorMode)updateSpectator(now);else updateCamera(dt);
  updateFlashlight();updateDayNight(now);
  updateDoorStreaming(now);if(now-lastPrompt>120){updateInteractionPrompt();lastPrompt=now}
  updateAudioListener();
  if(now-lastMiniTick>=(MOBILE_GPU_SAFE?140:70)){renderMinimap();lastMiniTick=now}
  if(composer)composer.render();else renderer.render(scene,camera);requestAnimationFrame(loop);
}
loop();boot();
