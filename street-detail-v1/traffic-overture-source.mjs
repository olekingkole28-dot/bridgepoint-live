import {PMTiles} from 'pmtiles';
import {VectorTile} from '@mapbox/vector-tile';
import Pbf from 'pbf';
const ROOT='https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/2026-10-21.0/';
const base=new PMTiles(ROOT+'base.pmtiles'),roads=new PMTiles(ROOT+'transportation.pmtiles');
const R=6378137,D=Math.PI/180,Z=14,N=2**Z,wrap=a=>(a%360+360)%360,delta=(a,b)=>Math.abs((a-b+540)%360-180);
const xy=(p,q)=>[(q[0]-p[0])*R*D*Math.cos(p[1]*D),(q[1]-p[1])*R*D];
const distance=(p,q)=>Math.hypot(...xy(p,q)),bearing=(p,q)=>wrap(Math.atan2(...xy(p,q))/D);
const offset=(p,a,m)=>[p[0]+Math.sin(a*D)*m/(R*D*Math.cos(p[1]*D)),p[1]+Math.cos(a*D)*m/(R*D)];
const tile=(p,z)=>[Math.floor((p[0]+180)/360*2**z),Math.floor((1-Math.asinh(Math.tan(p[1]*D))/Math.PI)/2*2**z)];
const cache=new Map();
async function read(archive,z,x,y){
 const header=await archive.getHeader(),az=Math.min(z,header.maxZoom),factor=2**(z-az),ax=Math.floor(x/factor),ay=Math.floor(y/factor),key=(archive===base?'b':'r')+':'+az+'/'+ax+'/'+ay;
 if(!cache.has(key)){
 const work=archive.getZxy(az,ax,ay).then(t=>{if(!t)return [];const v=new VectorTile(new Pbf(new Uint8Array(t.data))),out=[];for(const [name,l] of Object.entries(v.layers)){if(archive===base&&name!=='infrastructure')continue;for(let i=0;i<l.length;i++){const f=l.feature(i),p=f.properties,c=p.class;
 if(archive===base&&!['traffic_signals','stop','give_way','pedestrian_crossing','crossing'].includes(c))continue;
 if(archive===roads&&(f.type!==2||!['motorway','trunk','primary','secondary','tertiary','residential','unclassified','living_street','service','road','minor','motorway_link','trunk_link','primary_link','secondary_link','tertiary_link'].includes(c)))continue;
 if(archive===base&&f.type!==1)continue;out.push(f.toGeoJSON(ax,ay,az));}}return out;}).catch(e=>{cache.delete(key);throw e});cache.set(key,work);while(cache.size>36)cache.delete(cache.keys().next().value);
 }return cache.get(key);
}
const rank=c=>({motorway:7,trunk:6,primary:5,secondary:4,tertiary:3,residential:2,unclassified:2,service:1,living_street:1})[String(c).replace('_link','')]||2;
const roadWidth=p=>{const n=parseFloat(p.width??p.width_m??p['width:carriageway']),lanes=parseInt(p.lanes??p.num_lanes??p.lane_count),one=['yes','1','true','-1'].includes(String(p.oneway))||p.is_oneway===true;return n>=2.6&&n<=45?n:Math.max(3.6,Math.min(32,(lanes||(one?2:rank(p.class)>=5?4:rank(p.class)>=3?3:2))*3.25));};
function tags(p){let t=p.source_tags;try{if(typeof t==='string')t=JSON.parse(t)}catch(_){t={}}return {...p,...(t&&typeof t==='object'?t:{})};}
function left(p,polys){const inside=r=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};return polys.some(r=>inside(r[0])&&!r.slice(1).some(inside));}
function directions(p,segments,index){
 const [gx,gy]=tile(p,18),found=new Set(),hits=[];
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)for(const s of index.get((gx+dx)+','+(gy+dy))||[]){if(found.has(s))continue;found.add(s);const {a,b,t}=s,u=xy(p,a),v=xy(a,b),den=v[0]**2+v[1]**2;if(den<.4)continue;const f=Math.max(0,Math.min(1,-(u[0]*v[0]+u[1]*v[1])/den)),d=Math.hypot(u[0]+v[0]*f,u[1]+v[1]*f);if(d>28)continue;const q=[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f],w=roadWidth(t);
 const one=['yes','1','true'].includes(String(t.oneway))||t.is_oneway===true,rev=String(t.oneway)==='-1';if(!rev&&distance(q,a)>1.2)hits.push({face:bearing(q,a),d,width:w,rank:rank(t.class),q,t,dir:'forward'});if(!one&&distance(q,b)>1.2)hits.push({face:bearing(q,b),d,width:w,rank:rank(t.class),q,t,dir:'backward'});
 }hits.sort((a,b)=>a.d-b.d);const max=Math.min(24,(hits[0]?.d||0)+8);return hits.filter(x=>x.d<=max).filter((x,i,a)=>a.findIndex(y=>delta(y.face,x.face)<24)===i).slice(0,6);
}
// A control node usually describes a stop line or crossing, not the physical pole.
function clearance(p,index){
 const [gx,gy]=tile(p,18),found=new Set();let gap=Infinity;
 for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const s of index.get((gx+dx)+','+(gy+dy))||[]){
  if(found.has(s))continue;found.add(s);const u=xy(p,s.a),v=xy(s.a,s.b),den=v[0]**2+v[1]**2;if(den<.01)continue;
  const f=Math.max(0,Math.min(1,-(u[0]*v[0]+u[1]*v[1])/den)),d=Math.hypot(u[0]+v[0]*f,u[1]+v[1]*f);gap=Math.min(gap,d-roadWidth(s.t)/2);
 }return gap;
}
function roadside(x,index,side,kind,intersection=false){
 const half=x.width/2,away=wrap(x.face-90*side);
 // Snap to the centerline first, then search along the approach for the curb corner.
 const steps=kind==='vehicle'?(intersection?[-half-3,-half-5,-half-8,-half-11,half+3,half+6,half+10]:[-2,-4,-6,2,4,6,9]):[1.7,3.5,5.5,8,11,14,-2,-5];
 for(const shift of steps)for(const margin of [1.15,1.8,2.6,3.6]){
  const axis=offset(x.q,x.face,shift),q=offset(axis,away,half+margin),gap=clearance(q,index);
  if(gap>=.85&&Number.isFinite(gap))return {q,arm:half+margin,clearance:gap,centerline:axis};
 }return null;
}
function crossingSide(x,index,side){
 const half=x.width/2,away=wrap(x.face+90*side);
 for(const longitudinal of [2.8,-2.8,4.6,-4.6,6.5,-6.5,9,-9,12,-12])for(const margin of [1.25,2,3.2]){
  const axis=offset(x.q,x.face,longitudinal),q=offset(axis,away,half+margin),gap=clearance(q,index);
  if(gap>=.85&&Number.isFinite(gap))return {q,face:wrap(away+180),clearance:gap,centerline:axis};
 }return null;
}
export function buildRows(points,roadFeatures,polys=[]){
 const index=new Map(),segments=[];
 for(const f of roadFeatures){const t=tags(f.properties),g=f.geometry,lines=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[];for(const line of lines)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i];if(distance(a,b)<1)continue;const s={a,b,t},[x,y]=tile(a,18),[xx,yy]=tile(b,18);if(Math.abs(x-xx)>60||Math.abs(y-yy)>60)continue;for(let iy=Math.min(y,yy);iy<=Math.max(y,yy);iy++)for(let ix=Math.min(x,xx);ix<=Math.max(x,xx);ix++){const k=ix+','+iy;if(!index.has(k))index.set(k,[]);index.get(k).push(s);}segments.push(s);}}
 const out=[],seen=new Set(),signals=points.filter(f=>f.properties.class==='traffic_signals').map(f=>f.geometry.coordinates);
 for(const f of points){const p=f.geometry.coordinates,t=tags(f.properties),c=t.class,id=String(t.id||p.map(x=>x.toFixed(6)).join(','));if(seen.has(id))continue;seen.add(id);const a=directions(p,segments,index);if(!a.length)continue;
 const side=t.driving_side==='left'||(t.driving_side!=='right'&&left(p,polys))?-1:1;
 const explicit=t['traffic_signals:direction']??t['stop:direction']??t['traffic_sign:direction']??t.direction,number=explicit!==undefined&&explicit!==''&&Number.isFinite(Number(explicit))?wrap(Number(explicit)+180):null;
 let chosen=number!==null?[a.slice().sort((x,y)=>delta(x.face,number)-delta(y.face,number))[0]]:a.filter(x=>!['forward','backward'].includes(explicit)||x.dir===explicit);if(!chosen.length)chosen=a.slice(0,1);
 if(c==='traffic_signals'&&!['pedestrian','pedestrian_signals'].includes(t.traffic_signals)){
  const intersection=a.some(y=>delta(y.face,a[0].face)>35&&delta(y.face,a[0].face)<145);
  for(const [i,x] of chosen.slice(0,4).entries()){const mount=roadside(x,index,side,'vehicle',intersection);if(!mount)continue;out.push({id:id+'-v-'+i,kind:'vehicle',...mount,face:x.face,side,source:p,estimated:true});}
 }
 if(['stop','give_way'].includes(c)&&t.subtype!=='transit'){
  const signs=t.stop==='all'?chosen.slice(0,4):t.stop==='minor'?chosen.filter(x=>x.rank===Math.min(...chosen.map(y=>y.rank))).slice(0,2):chosen.slice(0,1);
  for(const [i,x] of signs.entries()){const mount=roadside(x,index,side,'sign');if(!mount)continue;out.push({id:id+'-s-'+i,kind:c==='stop'?'stop':'yield',...mount,face:x.face,side,height:2.6,source:p,estimated:true});}
 }
 const pedestrian=t.crossing==='traffic_signals'||t['crossing:signals']==='yes'||['pedestrian','pedestrian_crossing','pedestrian_signals'].includes(t.traffic_signals)||(['pedestrian_crossing','crossing'].includes(c)&&signals.some(q=>distance(p,q)<24));
 if(pedestrian){const x=a[0];for(const [i,s] of [-1,1].entries()){const mount=crossingSide(x,index,s);if(!mount)continue;out.push({id:id+'-p-'+i,kind:'pedestrian',...mount,side,height:2.8,source:p,estimated:true});}}

 }
 // Merge repeated nearby fixtures representing the same physical approach.
 const unique=[],bins=new Map();
 for(const row of out){const [gx,gy]=tile(row.q,22);let duplicate=false;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const old of bins.get((gx+dx)+','+(gy+dy))||[]){if(old.kind===row.kind&&distance(old.q,row.q)<2.3&&delta(old.face,row.face)<25)duplicate=true;}if(duplicate)continue;const key=gx+','+gy;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(row);unique.push(row);}
 return unique;
}
export async function loadOvertureTile(x,y,polys=[]){
 const [b,r]=await Promise.all([read(base,Z,x,y),read(roads,Z,x,y)]);
 const points=b.filter(f=>{const [a,c]=tile(f.geometry.coordinates,Z);return a===x&&c===y;});
 const rows=buildRows(points,r,polys);
 return {rows,sourcePoints:points.length,roadFeatures:r.length,classes:points.reduce((a,f)=>(a[f.properties.class]=(a[f.properties.class]||0)+1,a),{})};
}
