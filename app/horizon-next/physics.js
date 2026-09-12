import * as THREE from 'three';
import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.20.0/+esm';

const CAPSULE_ROT={x:Math.SQRT1_2,y:0,z:0,w:Math.SQRT1_2};

function indexedArrays(geometry){
  const pos=geometry?.attributes?.position;
  if(!pos||!pos.count)return null;
  const vertices=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){
    vertices[i*3]=pos.getX(i);
    vertices[i*3+1]=pos.getY(i);
    vertices[i*3+2]=pos.getZ(i);
  }
  let indices;
  if(geometry.index){
    const src=geometry.index.array;
    indices=new Uint32Array(src.length);
    for(let i=0;i<src.length;i++)indices[i]=src[i];
  }else{
    indices=new Uint32Array(pos.count);
    for(let i=0;i<pos.count;i++)indices[i]=i;
  }
  return{vertices,indices};
}

export class HorizonPhysics{
  static async create(){
    await RAPIER.init();
    return new HorizonPhysics();
  }

  constructor(){
    this.R=RAPIER;
    this.world=null;
    this.controller=null;
    this.player=null;
    this.staticColliders=[];
    this.verticalVelocity=0;
    this.grounded=false;
    this.stance='stand';
    this.resetWorld();
  }

  resetWorld(){
    if(this.world?.free)this.world.free();
    this.world=new RAPIER.World({x:0,y:0,z:-18});
    this.controller=this.world.createCharacterController(0.018);
    this.controller.setUp({x:0,y:0,z:1});
    this.controller.setSlideEnabled(true);
    this.controller.enableAutostep(.44,.18,true);
    this.controller.enableSnapToGround(.42);
    this.controller.setMaxSlopeClimbAngle(Math.PI*.27);
    this.controller.setMinSlopeSlideAngle(Math.PI*.34);
    this.controller.setNormalNudgeFactor(.002);
    this.staticColliders=[];
    this.player=null;
    this.verticalVelocity=0;
    this.grounded=false;
  }

  addTrimesh(geometry,{friction=.92,restitution=0,label='mesh'}={}){
    const arrays=indexedArrays(geometry);
    if(!arrays||arrays.indices.length<3)return null;
    const desc=RAPIER.ColliderDesc.trimesh(arrays.vertices,arrays.indices)
      .setFriction(friction).setRestitution(restitution);
    const collider=this.world.createCollider(desc);
    collider.userData={label};
    this.staticColliders.push(collider);
    return collider;
  }

  addCuboid({x,y,z,hx,hy,hz,rotation=null,label='box',friction=.9}){
    const desc=RAPIER.ColliderDesc.cuboid(hx,hy,hz).setTranslation(x,y,z).setFriction(friction);
    if(rotation)desc.setRotation(rotation);
    const c=this.world.createCollider(desc);
    c.userData={label};
    this.staticColliders.push(c);
    return c;
  }

  addCylinder({x,y,z,halfHeight,radius,label='cylinder'}){
    const desc=RAPIER.ColliderDesc.cylinder(halfHeight,radius)
      .setTranslation(x,y,z)
      .setRotation(CAPSULE_ROT)
      .setFriction(.9);
    const c=this.world.createCollider(desc);c.userData={label};this.staticColliders.push(c);return c;
  }

  createPlayer(feet,{stance='stand'}={}){
    const dims=this.stanceDims(stance);
    const body=this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(feet.x,feet.y,feet.z+dims.footOffset)
    );
    const collider=this.world.createCollider(
      RAPIER.ColliderDesc.capsule(dims.halfHeight,dims.radius)
        .setRotation(CAPSULE_ROT)
        .setFriction(.7)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body
    );
    this.player={body,collider,...dims};
    this.stance=stance;
    this.verticalVelocity=0;
    this.grounded=false;
    return this.getPlayerFeet();
  }

  stanceDims(stance){
    if(stance==='prone')return{halfHeight:.06,radius:.30,footOffset:.36,height:.72};
    if(stance==='crouch')return{halfHeight:.23,radius:.31,footOffset:.54,height:1.08};
    return{halfHeight:.55,radius:.31,footOffset:.86,height:1.72};
  }

  setStance(stance){
    if(!this.player||stance===this.stance)return this.stance;
    const next=this.stanceDims(stance);
    const feet=this.getPlayerFeet();
    try{this.world.removeCollider(this.player.collider,true)}catch(_){}
    const collider=this.world.createCollider(
      RAPIER.ColliderDesc.capsule(next.halfHeight,next.radius)
        .setRotation(CAPSULE_ROT).setFriction(.7),
      this.player.body
    );
    this.player={body:this.player.body,collider,...next};
    this.stance=stance;
    this.player.body.setTranslation({x:feet.x,y:feet.y,z:feet.z+next.footOffset},true);
    return stance;
  }

  teleportFeet(feet){
    if(!this.player)return;
    this.player.body.setTranslation({x:feet.x,y:feet.y,z:feet.z+this.player.footOffset},true);
    this.player.body.setNextKinematicTranslation({x:feet.x,y:feet.y,z:feet.z+this.player.footOffset});
    this.verticalVelocity=0;
  }

  getPlayerFeet(){
    if(!this.player)return{x:0,y:0,z:0};
    const p=this.player.body.translation();
    return{x:p.x,y:p.y,z:p.z-this.player.footOffset};
  }

  move(horizontal,dt,{jump=false,sprint=false}={}){
    if(!this.player)return{feet:{x:0,y:0,z:0},grounded:false,movement:{x:0,y:0,z:0}};
    dt=Math.max(1/240,Math.min(.05,dt||1/60));
    if(jump&&this.grounded){
      this.verticalVelocity=this.stance==='stand'?6.8:5.4;
      this.grounded=false;
    }
    if(!this.grounded)this.verticalVelocity=Math.max(-20,this.verticalVelocity-18*dt);
    else if(this.verticalVelocity<0)this.verticalVelocity=-.35;

    const desired={x:horizontal.x*dt,y:horizontal.y*dt,z:this.verticalVelocity*dt};
    this.controller.computeColliderMovement(this.player.collider,desired);
    const m=this.controller.computedMovement();
    const p=this.player.body.translation();
    this.player.body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});
    this.world.timestep=dt;
    this.world.step();
    this.grounded=this.controller.computedGrounded();
    if(this.grounded&&this.verticalVelocity<0)this.verticalVelocity=0;
    return{feet:this.getPlayerFeet(),grounded:this.grounded,movement:{x:m.x,y:m.y,z:m.z}};
  }

  castRay(origin,direction,maxToi=50,solid=true){
    const ray=new RAPIER.Ray(origin,direction);
    return this.world.castRay(ray,maxToi,solid);
  }

  testPlayerFree(){
    if(!this.player)return false;
    const feet=this.getPlayerFeet();
    const dirs=[[.5,0],[-.5,0],[0,.5],[0,-.5]];
    let open=0;
    for(const [x,y] of dirs){
      this.controller.computeColliderMovement(this.player.collider,{x,y,z:0});
      const m=this.controller.computedMovement();
      if(Math.hypot(m.x,m.y)>.32)open++;
    }
    this.teleportFeet(feet);
    return open>=2;
  }
}

export {RAPIER};
