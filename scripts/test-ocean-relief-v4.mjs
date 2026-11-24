import assert from 'node:assert/strict';
import {shadeBathymetry} from './bp-ocean-relief-v4.mjs';
const input=new Uint8ClampedArray(5*4);
[-7000,-2000,-50,0,150].forEach((z,i)=>{const n=z+32768;input[i*4]=Math.floor(n/256);input[i*4+1]=n%256;input[i*4+3]=255});
const out=shadeBathymetry(input,5,1,10);
assert.equal(out[3],255);assert.equal(out[7],255);assert.equal(out[11],255);assert.equal(out[15],0);assert.equal(out[19],0);assert(out[9]>out[1]);
console.log('BATHYMETRY_LAND_TRANSPARENCY_DEPTH_PALETTE_PASS');
