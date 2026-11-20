import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const view=readFileSync(new URL('../rebuild-v5000/bridgepoint-view-v5917.js',import.meta.url),'utf8');
const wildfire=readFileSync(new URL('../rebuild-v5000/bridgepoint-wildfires-volumetric-v1.js',import.meta.url),'utf8');
const old="dock.querySelectorAll('[data-bpv-action]').forEach(b=>{b.dataset.bpvBound='1';";
const bypass='dock.querySelectorAll(\'[data-bpv-action]:not([data-bpv-action="wildfire"])\').forEach(b=>{b.dataset.bpvBound=\'1\';';
assert.ok(!view.includes(old),'the generic click handler must NEVER capture Wildfire');
assert.equal(view.split(bypass).length,2,'only one precise Wildfire bypass on generic handler');
assert.match(view,/const panelOpenButtons=ui.actions.querySelectorAll\('\[data-bpv-action\]'\);/,
 'the dedicated dispatcher must still bind the Wildfire control');
assert.match(view,/panelOpenButtons\.forEach\(b=>\{if\(b\.dataset\.bpvBound\)return;/,
 'other buttons preserve their already-bound generic handlers');
const specific=view.slice(view.indexOf('const panelOpenButtons=ui.actions.querySelectorAll'),view.indexOf('buildPropertyPanel();',view.indexOf('const panelOpenButtons=ui.actions.querySelectorAll')));
assert.match(specific,/if\(a==='wildfire'\)\{/);
assert.match(specific,/bridgepoint-wildfires-volumetric-v1\.js/);
assert.match(specific,/initLiveWildfireRenderer\(activeMap\)/);
assert.match(specific,/api\.setEnabled\(next\)/);
assert.match(specific,/b\.setAttribute\('aria-pressed',String\(next\)\)/);
assert.match(specific,/if\(a==='wildfire'\)\{[\s\S]*?\n return;\n\}/,
 'Wildfire must return without falling through to openPanel');
assert.ok(!/openPanel\(['"]wildfire['"]\)/.test(view),'no wildfire fallback-panel navigation');
assert.match(wildfire,/export function initLiveWildfireRenderer\(/);
assert.match(wildfire,/https:\/\/worldfires\.org\/api\/v1/);
assert.match(wildfire,/eonet\.gsfc\.nasa\.gov/);
assert.match(wildfire,/flameTongue/);
assert.match(wildfire,/queryTerrainElevation/);
assert.match(wildfire,/pointWithinFireGeometry/);
console.log('WILDFIRE_BUTTON_ROUTING_V2_PASS: generic listener excludes Wildfire, dedicated source-backed 3D handler bound and intact.');
