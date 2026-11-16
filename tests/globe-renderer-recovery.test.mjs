import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../release-v2300/world-v2300-map.js', import.meta.url), 'utf8');
const start = source.indexOf('let bpRecoveryTimer=0,bpLastRecovery=0,bpResourceErrorCount=0,bpLastResourceErrorAt=0;');
assert.ok(start >= 0, 'core globe exposes the bounded renderer recovery controller');

const end = source.indexOf('\n\n function solarPosition', start);
assert.ok(end > start, 'renderer recovery block has a bounded end');
const block = source.slice(start, end);

assert.ok(block.includes("const recoverRenderer=(reason='resume',resizeMap=false)=>"), 'renderer recovery distinguishes viewport resize from repaint');
assert.ok(block.includes('if(resizeMap)map.resize();'), 'resize is gated behind a true viewport lifecycle change');
assert.ok(block.includes("recoverRenderer('visibility-resume',true)"), 'visibility resume can reconcile changed viewport dimensions');
assert.ok(block.includes("recoverRenderer('pageshow',true)"), 'page restore can reconcile viewport dimensions');
assert.ok(block.includes("recoverRenderer('orientation',true)"), 'orientation changes can reconcile viewport dimensions');
assert.ok(block.includes("recoverRenderer('webgl-restored')"), 'WebGL restoration requests a repaint without forcing a resize');
assert.ok(block.includes("recoverRenderer('network-online')"), 'network reconnection requests a repaint without forcing a resize');

const resourceHandler = block.slice(block.indexOf("map.on('error',e=>"));
assert.ok(resourceHandler.includes("reason:'transient-map-resource'"), 'transient resource failures remain diagnosable');
assert.ok(resourceHandler.includes('resizeSkipped:true'), 'transient resource failures are explicitly prevented from forcing a canvas resize');
assert.ok(!resourceHandler.includes('map.resize()'), 'the tile/error handler never resizes the live globe');
assert.ok(!resourceHandler.includes("recoverRenderer('transient-map-resource'"), 'tile/source failures do not repeatedly schedule renderer recovery');

console.log('BRIDGEPOINT_GLOBE_RESOURCE_RECOVERY_NO_RESIZE_PASS');
