import assert from 'node:assert/strict';
import {buildOceanPolygonMesh,oceanFallbackTexture} from './bp-ocean-mesh-v3.mjs';
const square=[[-2,-2],[2,-2],[2,2],[-2,2],[-2,-2]],hole=[[-1,-1],[-1,1],[1,1],[1,-1],[-1,-1]];
const v=[];const r=buildOceanPolygonMesh([[square,hole]],{step:.002,maxVertices:12000,shoreAt:()=>.5},(...p)=>v.push(p));
assert(r.count>24);assert.equal(r.count,v.length);assert.equal(r.polygons,1);
const x0=179/360,x1=181/360,y0=.5-Math.log(Math.tan(Math.PI/4+Math.PI/360))/(2*Math.PI),y1=1-y0;
let area=0;
for(let i=0;i<v.length;i+=3){const [a,b,c]=v.slice(i,i+3);const x=(a[0]+b[0]+c[0])/3,y=(a[1]+b[1]+c[1])/3;assert(!(x>x0+1e-8&&x<x1-1e-8&&y>y0+1e-8&&y<y1-1e-8),'triangle inside island hole');area+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;assert(a[2]===.5)}
assert(area>0);
const low=buildOceanPolygonMesh([[square]],{step:1e-8,maxVertices:30},()=>{});assert(low.count<=30);
const dateline=buildOceanPolygonMesh([[[[179,1],[-179,1],[-179,-1],[179,-1],[179,1]]]],{},()=>{});assert.equal(dateline.count,0);
const tex=oceanFallbackTexture();assert.equal(tex.data.length,128*128*4);assert(tex.data.every((v,i)=>i%4!==3||v===255));
console.log('OCEAN_POLYGON_HOLE_SUBDIVISION_BUDGET_AND_TEXTURE_PASS');
