export class DeterministicRng{
  constructor(seed){this.s=BigInt.asUintN(64,BigInt(seed||1));if(this.s===0n)this.s=1n}
  next(){let x=this.s;x^=x<<13n;x^=x>>7n;x^=x<<17n;this.s=BigInt.asUintN(64,x);return Number(this.s&0xffffffffn)/0xffffffff}
  int(min,max){return Math.floor(this.next()*(max-min+1))+min}
  pick(arr){return arr[Math.min(arr.length-1,Math.floor(this.next()*arr.length))]}
}

export class KillCamBuffer{
  constructor(windowMs=12000){this.windowMs=windowMs;this.frames=[]}
  push(snapshot,now=performance.now()){
    this.frames.push({t:now,s:snapshot});
    const cut=now-this.windowMs;
    while(this.frames.length&&this.frames[0].t<cut)this.frames.shift();
  }
  clip(deathAt=performance.now(),preMs=5000,postMs=5000){
    return {deathAt,preMs,postMs,slowRate:.35,frames:this.frames.filter(f=>f.t>=deathAt-preMs&&f.t<=deathAt+postMs)}
  }
}

export class DwellPickupController{
  constructor({dwellMs=3000,onProgress=()=>{},onComplete=()=>{}}={}){
    this.dwellMs=dwellMs;this.onProgress=onProgress;this.onComplete=onComplete;this.target=null;this.started=0;this.done=false
  }
  enter(item,now=performance.now()){if(this.target===item)return;this.target=item;this.started=now;this.done=false;this.onProgress(0,item)}
  leave(item){if(!item||item===this.target){this.target=null;this.started=0;this.done=false;this.onProgress(0,null)}}
  update(now=performance.now()){
    if(!this.target||this.done)return;
    const p=Math.max(0,Math.min(1,(now-this.started)/this.dwellMs));
    this.onProgress(p,this.target);
    if(p>=1){this.done=true;this.onComplete(this.target)}
  }
}

export const HorizonRuntimeContract=Object.freeze({
  version:4341,
  controls:{
    aim:{mode:'toggle',small:true},
    shoot:{mode:'hold-or-tap',small:true},
    run:{mode:'hold-or-toggle-by-setting',small:true},
    build:{mode:'contextual-build-wheel',large:true},
    rightButtonCount:4
  },
  pickup:{mode:'dwell-auto',dwellMs:3000,progress:'radial-around-world-item'},
  collision:{
    groundProps:'solid',
    cars:'solid',
    walls:'solid',
    closedDoors:'solid',
    openDoors:'passable',
    intactWindows:'solid',
    openOrBrokenWindows:'contextual-hurdle'
  },
  hurdle:{
    minOpeningWidth:0.55,
    maxSillHeight:1.35,
    maxOpeningHeight:2.2,
    requiresNoGlass:true,
    animation:'contextual-vault'
  },
  killcam:{preMs:5000,postMs:5000,slowRate:.35,skippable:true,storage:'client-ring-buffer'},
  world:{
    seedRule:'match_seed + world_cell_id + prop_slot',
    coverBudget:{minPerStreetSegment:4,maxPerStreetSegment:14},
    coverFamilies:['pallet','barrel','concrete-barrier','desk','pillar','wrecked-car','dumpster','crate','fence','sandbag','generator','bus-stop','planter'],
    indoorCoverFamilies:['desk','cabinet','counter','pillar','shelving','crate','couch','vending-machine'],
    deterministic:true
  },
  account:{required:true,free:true,uniqueHandle:true},
  inventory:{quickSlots:5,backpackSlots:5,persistentYearOne:true,deathDrops:true,finiteWorldLoot:true},
  weapons:{rarities:['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','MYTHIC'],maxSpareClips:4,visibleSpecs:true,recoilAnimation:true,meleeSwingAnimation:true,explosionAnimation:true},
  yearOne:{
    scope:'CONUS_48_ONLY',pvp:false,wallDamage:25,finalCities:5,persistentLocation:true,persistentExploration:true,
    activePlayerCount:true,presenceHeartbeatSeconds:10,dailyQualifyingMinutes:15,absenceGraceHours:48,absenceDecayHours:12,
    monsterRespawnSeconds:120,noSpawnRadiusM:45,liveWeather:true,realLocalDaylight:true,campfireWarmth:true
  },
  tdm:{targetPlayers:100,teamSize:50,playerHealth:150,shield:0,partySizes:[1,2,3,4],botBackfill:true,mapCount:50,mapVoteSeconds:10,mapVoteChoices:2,randomVote:true,prematchFreezeSeconds:10,prematchLookOnly:true,fireCircleSeconds:1800,fireDamagePerSecond:25,loadoutPresets:5,tacticalSlots:2,lethalSlots:1,attachmentSlots:['OPTIC','BARREL','MUZZLE','UNDERBARREL','MAGAZINE','STOCK','GRIP'],buildLimit:3,deathToLobbyMs:10000,deathLootDwellMs:3000},
  progression:{maxLevel:100,maxPrestige:15,prestigeCharacterChoices:3}
});

export function canHurdleWindow(w){
  return !!w && !w.hasGlass && w.openingWidth>=HorizonRuntimeContract.hurdle.minOpeningWidth &&
    w.sillHeight<=HorizonRuntimeContract.hurdle.maxSillHeight &&
    w.openingHeight<=HorizonRuntimeContract.hurdle.maxOpeningHeight;
}

export function solidColliderFor(entity){
  if(!entity)return false;
  if(entity.type==='door')return entity.state!=='open';
  if(entity.type==='window')return !canHurdleWindow(entity);
  if(entity.groundProp===true)return true;
  return ['car','wall','barrier','crate','barrel','pallet','pillar','desk','building'].includes(entity.type);
}

export function generateCover(seed,segments=16){
  const rng=new DeterministicRng(seed);
  const out=[];
  const fam=HorizonRuntimeContract.world.coverFamilies;
  for(let s=0;s<segments;s++){
    const count=rng.int(HorizonRuntimeContract.world.coverBudget.minPerStreetSegment,HorizonRuntimeContract.world.coverBudget.maxPerStreetSegment);
    for(let i=0;i<count;i++)out.push({
      id:`cover-${s}-${i}`,
      segment:s,
      family:rng.pick(fam),
      lane:rng.int(0,2),
      offset:Number(rng.next().toFixed(4)),
      rotation:Number((rng.next()*Math.PI*2).toFixed(4)),
      collider:true
    });
  }
  return out;
}

export function createMobileControlState(){
  return {aim:false,shoot:false,run:false,build:false};
}
