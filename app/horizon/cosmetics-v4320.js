export const HORIZON_COSMETICS_V4320={
  starter_wrap:{key:'wrap_ash',display:'Ash',kind:'WEAPON_WRAP'},
  wraps:{
    wrap_toxic_rain:{key:'wrap_toxic_rain',display:'Toxic Rain',base:0x2d8f67,accent:0x78ffc8,emissive:0x0d5038},
    wrap_blood_rust:{key:'wrap_blood_rust',display:'Blood Rust',base:0x8d4935,accent:0xd67a4d,emissive:0x2b1009},
    wrap_ash:{key:'wrap_ash',display:'Ash',base:0x4a5960,accent:0x78868b,emissive:0x000000}
  },
  paid_avatars:{
    skin_hazmat_ashfall:{model:'/app/horizon-playable/assets/characters/mesh2motion/models/hazmat_suit_male.glb',variant:2,display:'Hazmat Knox: Ashfall'},
    skin_swat_night_siege:{model:'/app/horizon-playable/assets/characters/mesh2motion/models/swat_male.glb',variant:2,display:'SWAT Mercer: Night Siege'},
    skin_officer_dead_city:{model:'/app/horizon-playable/assets/characters/mesh2motion/models/police_male.glb',variant:2,display:'Officer Vale: Dead City'}
  }
};

export function normalizeWrapKey(ref=''){
  const s=String(ref).toLowerCase();
  if(s.includes('toxic_rain')||s.includes('toxic-rain'))return 'wrap_toxic_rain';
  if(s.includes('blood_rust')||s.includes('blood-rust'))return 'wrap_blood_rust';
  if(s.includes('wrap_ash')||s.includes('/ash'))return 'wrap_ash';
  return HORIZON_COSMETICS_V4320.wraps[s]?s:'wrap_ash';
}
export function wrapSpec(ref=''){
  return HORIZON_COSMETICS_V4320.wraps[normalizeWrapKey(ref)]||HORIZON_COSMETICS_V4320.wraps.wrap_ash;
}
export function avatarModelForKey(key,fallbackMap={}){
  const paid=HORIZON_COSMETICS_V4320.paid_avatars[String(key||'')];
  return paid?.model||fallbackMap[String(key||'')]||fallbackMap.free_03||'';
}
export function avatarVariantForKey(key){
  return HORIZON_COSMETICS_V4320.paid_avatars[String(key||'')]?.variant||((Number(String(key||'').match(/\d+/)?.[0]||1)%2)?1:2);
}
export function makeHorizonRifle(THREE,ref='wrap_ash'){
  const spec=wrapSpec(ref),group=new THREE.Group();
  const material=(color,metal=.12,rough=.48,emissive=0)=>new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough,emissive,emissiveIntensity:emissive?0.2:0});
  const dark=material(0x171d1e,.72,.25),skin=material(spec.base,.52,.34,spec.emissive);
  const receiver=new THREE.Mesh(new THREE.BoxGeometry(2.45,.34,.42),skin);group.add(receiver);
  const handguard=new THREE.Mesh(new THREE.BoxGeometry(1.28,.27,.3),skin);handguard.position.x=1.73;group.add(handguard);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,1.5,12),dark);barrel.rotation.z=Math.PI/2;barrel.position.x=3.12;group.add(barrel);
  const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(.095,.095,.28,12),dark);muzzle.rotation.z=Math.PI/2;muzzle.position.x=3.9;group.add(muzzle);
  const stock=new THREE.Mesh(new THREE.BoxGeometry(.96,.27,.38),dark);stock.position.x=-1.68;stock.rotation.z=-.12;group.add(stock);
  const grip=new THREE.Mesh(new THREE.BoxGeometry(.28,.24,.9),dark);grip.position.set(-.35,0,-.57);grip.rotation.y=-.18;group.add(grip);
  const mag=new THREE.Mesh(new THREE.BoxGeometry(.42,.25,.84),dark);mag.position.set(.36,0,-.62);mag.rotation.y=.16;group.add(mag);
  const optic=new THREE.Mesh(new THREE.BoxGeometry(.56,.24,.23),material(0x252b2c,.78,.18));optic.position.set(.46,0,.37);group.add(optic);
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.25,.355,.065),material(spec.accent,.28,.32,spec.emissive));stripe.position.set(.2,0,.175);group.add(stripe);
  group.userData={cosmetic_key:spec.key,display_name:spec.display,muzzle};
  return group;
}
