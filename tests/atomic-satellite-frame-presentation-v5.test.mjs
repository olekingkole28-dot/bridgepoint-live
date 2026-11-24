import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../release-v2300/world-v2300-map.js',import.meta.url),'utf8');
const start=source.indexOf('  function installAtomicSatelliteFramePresentationV5(){');
const end=source.indexOf('\n  installAtomicSatelliteFramePresentationV5();',start);
assert.ok(start>0&&end>start,'guard installed in the actual production map constructor');
const codeToTest=source.slice(start,end);
for(const forbidden of ['map.setStyle(','map.setLayoutProperty(','map.setPaintProperty(','map.triggerRepaint(','gl.clear('])
 assert.ok(!codeToTest.includes(forbidden),'guard must never mutate the existing map styles or GPU scene: '+forbidden);
assert.ok(codeToTest.includes("const liveCanvas=map.getCanvas?.()"),'samples the exact production WebGL globe canvas');
assert.ok(codeToTest.includes("preserveDrawingBuffer"),'backups require an intact source framebuffer');
assert.ok(codeToTest.includes("getParameter(gl.FRAMEBUFFER_BINDING)"),'must skip non-default/offscreen GPU framebuffers');
assert.ok(codeToTest.includes("readPixels"),'samples real renderer pixels instead of relying on layer visibility');
assert.ok(!codeToTest.includes("if(map.isMoving?.()"),'ambient auto rotation cannot disable protection');
assert.ok(codeToTest.includes("host.addEventListener('pointerdown',reset"),'intentional touch gestures clear the retained frame');
assert.match(source,/id:'gta-nasa',type:'raster'/);
assert.match(source,/id:'gta-esri',type:'raster'/);
assert.match(source,/id:'gta-solar-night-shade',type:'fill'/);
assert.match(source,/keepSatelliteRasterLayersVisible\('render'\)/);
const events={},domEvents={},drawn=[];
const context={drawImage:(...args)=>drawn.push(args),clearRect(){}};
const overlay={style:{display:'none'},width:0,height:0,setAttribute(){},remove(){},getContext:()=>context};
const canvas={isConnected:true,getContext:()=>gl};
const host={appendChild(){},addEventListener:(name,fn)=>{domEvents[name]=fn}};
const doc={hidden:false,createElement:kind=>{assert.equal(kind,'canvas');return overlay}};
const gl={
 drawingBufferWidth:1000,drawingBufferHeight:1000,FRAMEBUFFER_BINDING:0x8ca6,
 RGBA:6408,UNSIGNED_BYTE:5121,getContextAttributes:()=>({preserveDrawingBuffer:true}),
 getParameter:()=>null,brightness:100,
 readPixels:(x,y,w,h,format,type,out)=>{
  assert.ok(x>=0&&y>=0&&w===4&&h===4);
  for(let i=0;i<out.length;i+=4){out[i]=out[i+1]=out[i+2]=gl.brightness;out[i+3]=255}
 }
};
let time=0,center={lng:-103,lat:38},zoom=1.35,moving=true;
const perf={now:()=>time};
const map={
 getCanvas:()=>canvas,getCanvasContainer:()=>host,getLayer:id=>id==='gta-nasa'?{}:null,
 isMoving:()=>moving,getCenter:()=>center,getZoom:()=>zoom,getPitch:()=>0,getBearing:()=>0,
 on:(name,fn)=>{events[name]=fn}
};
const win={WebGLRenderingContext:function(){},__BP_APP_SPACE_EXPLORER_V1__:{state:{open:false}}};
Function('map','document','window','performance',codeToTest+'\nreturn installAtomicSatelliteFramePresentationV5;')(map,doc,win,perf)();
const state=win.__BP_ATOMIC_GLOBE_FRAME_V5__;
assert.equal(state.enabled,true);
const frame=(at,brightness)=>{time=at;gl.brightness=brightness;events.render()};
frame(500,100);
frame(1100,100);
assert.ok(drawn.length>0,'a verified bright frame is retained before a black frame');
assert.equal(state.captures,1);
frame(1500,100);
frame(1900,10);
assert.equal(state.held,true,'first bad frame is prevented from appearing');
assert.equal(overlay.style.display,'block','last good frame is shown instead');
assert.equal(state.rejectedDarkFrames,1);
frame(2200,100);
assert.equal(state.held,false,'normal rendering resumes immediately when satellite pixels recover');
assert.equal(overlay.style.display,'none');
frame(2500,8);
assert.equal(state.held,true,'repeated one-frame pulse also protected');
assert.equal(state.heldDarkFrames,2);
assert.ok(state.validFrames>=3);
domEvents.pointerdown();
assert.equal(state.held,false,'gesture immediately releases backup');
assert.equal(overlay.style.display,'none');
center={lng:-70,lat:45};
frame(3000,8);
assert.equal(state.held,false,'new camera never shows stale satellite frame');
frame(3500,100);
frame(4600,100);
assert.ok(state.captures>=2,'new stable camera reacquires a new backup');
console.log('ATOMIC_GLOBE_FRAME_V5_PASS',JSON.stringify({protectedBlackFrames:state.heldDarkFrames,captures:state.captures,canvasRepaintsUnchanged:true,layersUnchanged:true,ambientMovementHandled:true}));
