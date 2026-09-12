export class HorizonAudio{
  constructor(){
    this.ctx=null;this.master=null;this.enabled=false;this.lastStep=0;this.groanTimers=new Map();
  }
  async enable(){
    if(!this.ctx){
      this.ctx=new (window.AudioContext||window.webkitAudioContext)();
      this.master=this.ctx.createGain();this.master.gain.value=.34;this.master.connect(this.ctx.destination);
    }
    if(this.ctx.state==='suspended')await this.ctx.resume();
    this.enabled=true;
  }
  updateListener(camera){
    if(!this.enabled||!this.ctx)return;
    const p=camera.position,d={x:0,y:0,z:-1};
    const v=new THREE.Vector3();camera.getWorldDirection(v);
    const up=camera.up;
    const L=this.ctx.listener;
    if(L.positionX){
      L.positionX.value=p.x;L.positionY.value=p.y;L.positionZ.value=p.z;
      L.forwardX.value=v.x;L.forwardY.value=v.y;L.forwardZ.value=v.z;
      L.upX.value=up.x;L.upY.value=up.y;L.upZ.value=up.z;
    }else{
      L.setPosition(p.x,p.y,p.z);L.setOrientation(v.x,v.y,v.z,up.x,up.y,up.z);
    }
  }
  panner(pos,rolloff=1.1,maxDistance=90){
    const p=this.ctx.createPanner();
    p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=2;p.maxDistance=maxDistance;p.rolloffFactor=rolloff;
    if(p.positionX){p.positionX.value=pos.x;p.positionY.value=pos.y;p.positionZ.value=pos.z}
    else p.setPosition(pos.x,pos.y,pos.z);
    p.connect(this.master);return p;
  }
  noiseBuffer(seconds=.12){
    const n=Math.max(1,Math.floor(this.ctx.sampleRate*seconds)),b=this.ctx.createBuffer(1,n,this.ctx.sampleRate),a=b.getChannelData(0);
    for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);
    return b;
  }
  gunshot(pos,kind='Pistol'){
    if(!this.enabled)return;
    const now=this.ctx.currentTime,p=this.panner(pos,.75,160),g=this.ctx.createGain(),src=this.ctx.createBufferSource();
    src.buffer=this.noiseBuffer(kind==='Shotgun'?.22:.10);
    const vol=kind==='Shotgun'?1.1:kind==='Rifle'?.88:.7;g.gain.setValueAtTime(vol,now);g.gain.exponentialRampToValueAtTime(.001,now+.24);
    src.connect(g);g.connect(p);src.start(now);src.stop(now+.26);
    const osc=this.ctx.createOscillator(),og=this.ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(kind==='Shotgun'?72:kind==='Rifle'?105:132,now);osc.frequency.exponentialRampToValueAtTime(42,now+.18);og.gain.setValueAtTime(.32,now);og.gain.exponentialRampToValueAtTime(.001,now+.19);osc.connect(og);og.connect(p);osc.start(now);osc.stop(now+.2);
  }
  melee(pos){
    if(!this.enabled)return;
    const now=this.ctx.currentTime,p=this.panner(pos,1.4,30),o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type='triangle';o.frequency.setValueAtTime(260,now);o.frequency.exponentialRampToValueAtTime(85,now+.11);g.gain.setValueAtTime(.16,now);g.gain.exponentialRampToValueAtTime(.001,now+.12);o.connect(g);g.connect(p);o.start();o.stop(now+.13);
  }
  footstep(pos,sprint=false){
    if(!this.enabled)return;
    const now=performance.now();if(now-this.lastStep<(sprint?250:360))return;this.lastStep=now;
    const t=this.ctx.currentTime,p=this.panner(pos,1.5,24),src=this.ctx.createBufferSource(),g=this.ctx.createGain();
    src.buffer=this.noiseBuffer(.045);g.gain.setValueAtTime(sprint?.13:.085,t);g.gain.exponentialRampToValueAtTime(.001,t+.06);src.connect(g);g.connect(p);src.start(t);src.stop(t+.07);
  }
  zombieGroan(id,pos,distance){
    if(!this.enabled||distance>45)return;
    const now=performance.now(),last=this.groanTimers.get(id)||0;
    if(now-last<3500+Math.random()*3500)return;this.groanTimers.set(id,now);
    const t=this.ctx.currentTime,p=this.panner(pos,1.15,55),o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type='sawtooth';o.frequency.setValueAtTime(68+Math.random()*18,t);o.frequency.linearRampToValueAtTime(48+Math.random()*12,t+1.1);
    g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.06,t+.15);g.gain.exponentialRampToValueAtTime(.001,t+1.25);
    o.connect(g);g.connect(p);o.start(t);o.stop(t+1.3);
  }
}
