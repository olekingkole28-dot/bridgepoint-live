import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const document={querySelector:()=>null,documentElement:{}};
class MutationObserver{observe(){}}
const window={};
vm.runInNewContext(fs.readFileSync(process.argv[2],'utf8'),{window,document,MutationObserver,URL,console,setTimeout,clearTimeout});
const api=window.__BP_SKETCHFAB_IMPORTER_V1__;
assert.equal(api.version,1);
assert.equal(api.validateModelId('a1acde1460fd45d5bcf0deb12caccaa2'),'a1acde1460fd45d5bcf0deb12caccaa2');
assert.equal(api.validateModelId('https://sketchfab.com/3d-models/freeman-alley-in-new-york-city-a1acde1460fd45d5bcf0deb12caccaa2'),'a1acde1460fd45d5bcf0deb12caccaa2');
assert.equal(api.validateModelId('https://example.com/a1acde1460fd45d5bcf0deb12caccaa2'),null);
for(const [url,expected] of [['https://creativecommons.org/licenses/by/4.0/',true],['https://creativecommons.org/publicdomain/zero/1.0/',true],['https://creativecommons.org/licenses/by-nc/4.0/',false],['https://creativecommons.org/licenses/by-nd/4.0/',false],['https://creativecommons.org/licenses/by-sa/4.0/',false],['',false]]) assert.equal(api.classifyLicense({license:{url}}).permitted,expected,url);
console.log('SKETCHFAB_IMPORTER_SMOKE_PASS');
