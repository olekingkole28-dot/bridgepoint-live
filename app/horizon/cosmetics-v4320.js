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
export function makeHorizonRifleLegacy(THREE,ref='wrap_ash'){
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

export function makeHorizonWeapon(THREE,type='rifle',ref='wrap_ash'){
  const spec=wrapSpec(ref),kind=String(type||'rifle').toLowerCase(),g=new THREE.Group();
  const mat=(color,metal=.12,rough=.48,emissive=0)=>new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough,emissive,emissiveIntensity:emissive?0.2:0});
  const dark=mat(0x171d1e,.75,.24),skin=mat(spec.base,.52,.34,spec.emissive),accent=mat(spec.accent,.3,.31,spec.emissive);
  const box=(x,y,z,px=0,py=0,pz=0,m=skin)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(x,y,z),m);q.position.set(px,py,pz);g.add(q);return q};
  const cyl=(r,l,px=0,py=0,pz=0,m=dark)=>{const q=new THREE.Mesh(new THREE.CylinderGeometry(r,r,l,10),m);q.rotation.z=Math.PI/2;q.position.set(px,py,pz);g.add(q);return q};
  let muzzle=null;
  if(kind==='pistol'){
    box(1.15,.28,.34,0,0,0,skin);box(.72,.26,.08,.06,0,.19,accent);box(.28,.24,.82,-.28,0,-.49,dark);muzzle=cyl(.055,.58,.86,0,0,dark);
  }else if(kind==='shotgun'){
    box(2.25,.3,.34,.1,0,0,skin);box(1.18,.25,.07,.34,0,.19,accent);box(.95,.28,.36,-1.45,0,-.02,dark);muzzle=cyl(.085,1.8,2.1,0,0,dark);
  }else if(kind==='smg'){
    box(1.75,.34,.42,0,0,0,skin);box(1.25,.29,.08,.25,0,.22,accent);box(.4,.24,.82,.1,0,-.58,dark);box(.78,.2,.28,-1.12,0,.02,dark);muzzle=cyl(.062,.92,1.35,0,0,dark);
  }else if(kind==='melee'){
    const shaft=cyl(.055,2.35,0,0,0,mat(0x6a533b,.05,.72));shaft.rotation.z=0;
    const blade=new THREE.Mesh(new THREE.BoxGeometry(.56,.12,.72),mat(0x8d9697,.78,.23));blade.position.z=1.34;blade.rotation.y=.25;g.add(blade);
  }else{
    box(2.45,.34,.42,0,0,0,skin);box(1.28,.27,.3,1.73,0,0,skin);box(.96,.27,.38,-1.68,0,-.02,dark);box(.28,.24,.9,-.35,0,-.57,dark);box(.42,.25,.84,.36,0,-.62,dark);box(.56,.24,.23,.46,0,.37,mat(0x252b2c,.78,.18));box(2.25,.355,.065,.2,0,.175,accent);muzzle=cyl(.065,1.78,3.2,0,0,dark);
  }
  g.userData={cosmetic_key:spec.key,display_name:spec.display,weapon_type:kind,muzzle};
  return g;
}

export function makeHorizonRifle(THREE,ref='wrap_ash'){return makeHorizonWeapon(THREE,'rifle',ref)}
