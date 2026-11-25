import {readFileSync} from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
let s=readFileSync('rebuild-v5000/bridgepoint-temperature-v1.js','utf8');s=s.replace('mount();new MutationObserver(mount).observe','return;new MutationObserver(mount).observe');
const window={};vm.runInNewContext(s,{window});const a=window.__BP_TEMPERATURE_V1__;
assert.equal(a.degrees(0),'32°F · 0°C');assert.equal(a.degrees(30),'86°F · 30°C');assert.ok(a.color(-35)[2]>a.color(-35)[0]);assert.ok(a.color(38)[0]>a.color(38)[2]);
const g={nx:4,ny:2,step:90,values:[0,100,200,300,0,100,200,300]};assert.equal(a.sample(g,45,90),5);assert.equal(a.sample(g,-45,90),15);
console.log('TEMPERATURE_UNIT_AND_WRAP_PASS');
