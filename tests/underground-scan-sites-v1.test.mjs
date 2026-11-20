import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {UNDERGROUND_SCAN_SITES,UNDERGROUND_SCAN_RIGHTS_HOLDS,buildUndergroundSiteFeatures,undergroundSitePopupHtml} from '../rebuild-v5000/bridgepoint-underground-scan-sites-v1.js';

const features=buildUndergroundSiteFeatures();
assert.equal(features.length,94,'ninety-four reviewed cave site anchors are mapped');
assert.equal(UNDERGROUND_SCAN_SITES.reduce((n,s)=>n+s.models.length,0),108,'one hundred eight real creator-hosted 3D models and tours are cataloged');
assert.equal(UNDERGROUND_SCAN_RIGHTS_HOLDS.length,3,'rights/source holds are exposed');
assert.ok(features.every(f=>f.geometry.type==='Point'&&f.properties.iconImage));
assert.ok(UNDERGROUND_SCAN_SITES.every(s=>s.models.every(m=>m.uid&&m.creator&&(
 m.matterportTourId ? (m.matterportTourId==='1BTGHi85s96'&&m.modelUrl==='https://my.matterport.com/show/?m=1BTGHi85s96'&&m.license.includes('original rights retained'))
 : m.embedOnly ? (['cbe5a1c208674091b48f65ac2d4cca94','be7675a23595489c86211608f0fb1886','ccfc7c2f43214b559e93c4857eb6ed4a','899e6c8016954dab825dffb07d583fb9','d0c88d0853844a8e9a1de22a342326cb','34861aec56564489bdb8ec1cd030ff00','239d912831f6471da95a2fd672b53398','74b4a560749743eaa53cd89793b4a629','cd6c5687814e484da0bf4d360a324c60','2989d29a52a0494aa0cd2e279b411247','df5dea76480f4ed3af018d885a13b704','5dc79d2891f24e9fa571b9e910556ec8','2f06ab8d1bd14ce5a85c417fefd91cda','85a2ff52fa7b4a44b87033145fd1b01f','7161373c7ccb48da9aa00e52214df1b8','11aedb4bc1064685a8cfe33f8956a108','14773139954740e48be1fa1861d01eb7','d1691e402d0840378804f2df5aaedb2b','a35b2ecd72094b2d8a2fef9a32b98186','b9aac38260054f5f8858be684279c37e','e2420bd47de1497993addd2b3f6e1e7e','a8890e16ca49498c892d82496cdbbae9','bf983bfabc194e94893d9955ed87f471','e36a8a863b8348159d237ea808d492d7','3be79c6a956c423d9b05fa67ce559ee9','a873f750875d4f37a3784ffddc9f5abc','d07aa3cf92a4478684130d9261e1d94c','d010364e4b684a488e934d6664a3c54e','17c248ec0c284b6ebbd201d35753c4b8','c92b96fed07743ce8277619d2a6fb347','5e49a7bc370147f7a57d70187257ffb7','e0e487e56083459d935bde3eb51f12ae','2eac394c5e4945deadadbc45c32a093e','58f3d97cd9b3410a8f34193979c4d13a','3ed9bf8dd9eb4821851b56974c4f1a6b','a96e1387d5af46189920d78b9297c898','c3e3ce73bff4404b8006014b240ac8c2','1663083e3d0f46bb99efccd8a4a8f941','nd70Yvu9EP5yEA4pb7iSCbMb25q','d7d0abceb316400b828d28cbf26ed6d2','12d1180e0d2f4c24b1f827d3322f4d54','78580c37f2a54a6791919d7a15b87719','9c4363f2250f4b04bdcd163d2843dd91','f6f8ce48fe0f49339ba2dfab69d49174','ca8ba859d0694aab8c0c046804c36b55','dadb5c06f534428a8d27fbff612afc6a','d3595bd7ab974e4e8eb2efa3ceeec04d','e23deee8940f4b048a2c8a99e98358f9','9ab1ea083f9e464fb2da2a166ea01111','c2dfbdb76eab4d89a8282117c996ccac','04f3f56a7c0f45cc9f8f17176155b4b1','2caa3caeb04d4170a02a42ae685d9d54','b6e0621ac72e4d3990bbefb430ace085','4fd7b521620a437bb410230a8c60b97e','463f6d459d964170a64eb3c48e214a73','dc192656b67c4a028931d9e34f94d8cc','ab543f777609488da82646ebe1253470','a21804bb454b46e5a8aad1590472e4ca','e01723d1e6f64dafb001c098c58d613b','4b4fa4ab61c84c8883b32a9cd4ee5ff8','1624b224a7514762baf9025e6fe7dc4f','be70b89f9c264fc19d63dca2ae78b224','eb2e2c36ba8a4d8197dc30dd947984d2','0da6c7789e6a4dffbabfcbd93bf6e868','ff65fb61e6af4774873cb2a7046c283d','e0e43e0c995a4832be6b0689c4a4f32b','31109af6c895415b987561a54d21f4ba','c5ea8441fc2445a481bb4198f83273cc','3d46c0e9e8a74541af5df1b3341e4027','20b1fed375104cd7bebb2db7cdaf0f0c','b1bb4d6d9bfa4bd2a85621186016734e','4368b31623f54917b462041beb6cbd3c','b395c56bdeec4047853670c7cd39ef72','e8f36eab22ae4e7fb94d3a7cc9939669','810411acbae84502af5dca94fd3c596a','9eba84c6a6c84d83b6235956e171b7c9','a0fbb78a90704f77974ad03428a3d704','60242ad002694827b6a95eeeecd22c84','4a251113722f4d969b6cf2ca5f35c502','29ff71ac4b1340caa1fd539dd2f6abe0','c739f35a5ac8499087ef25a3ea9f2fb6','9591e10d536d4cf28879ab45418cfcaf','7ba54dd84e324c83987612a4ed4523f3','4f98063d11c14c84952fcfd4b798cfe4','7fbfe67ec4864d439f25303b50697189','5bc88658fc5e458f8f25af8a0ac9ee7b','935f17a3824d49f7b2505a0686450d51','4bab0afa71084cabb003ecda93cc8be2','af0ee6605da74f7bac2ea7fb0160cef9','4ef8168053794fc8817a0a90933830c6','79f2af1fd7024a949d7eb11f77628d8b','268d73136c4d4bc89eac4db3ad97a49f','f195fd290abd413bac1287b9094138e5','fee676a94d1a4ed7abdb0d777fbde084'].includes(m.uid)&&(['cd6c5687814e484da0bf4d360a324c60','e2420bd47de1497993addd2b3f6e1e7e','bf983bfabc194e94893d9955ed87f471','3be79c6a956c423d9b05fa67ce559ee9','a873f750875d4f37a3784ffddc9f5abc','58f3d97cd9b3410a8f34193979c4d13a','2caa3caeb04d4170a02a42ae685d9d54','be70b89f9c264fc19d63dca2ae78b224','c5ea8441fc2445a481bb4198f83273cc','20b1fed375104cd7bebb2db7cdaf0f0c'].includes(m.uid)?m.license==='CC Attribution' :(['b1bb4d6d9bfa4bd2a85621186016734e','e8f36eab22ae4e7fb94d3a7cc9939669'].includes(m.uid)?m.license.includes('CC Attribution-NonCommercial')&&m.license.includes('creator-hosted embed only'):m.license.includes('no reuse license displayed')))&&m.modelUrl.startsWith('https://sketchfab.com/3d-models/'))
 : (m.license==='CC Attribution'&&m.modelUrl.startsWith('https://sketchfab.com/3d-models/'))
))));
assert.equal(UNDERGROUND_SCAN_SITES.find(s=>s.id==='paris-catacombs').models.length,3);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='vrlovka-cave').models[0].method,/LiDAR/i);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='om-jaettestue').locationNote,/not a natural cave/i);
const treak=UNDERGROUND_SCAN_SITES.find(s=>s.id==='treak-cliff-cavern');
assert.ok(treak&&treak.type==='cave','add only Treak Cliff Cavern as a real natural cave');
assert.deepEqual(treak.coordinates,[-1.7972,53.3451]);
assert.equal(treak.models.length,1);
assert.equal(treak.models[0].uid,'a6183b4fd7364ed59518a276ad8ef8ec');
assert.match(treak.models[0].method,/photogrammetry/i);
assert.match(treak.locationPrecision,/Approximate/i);
const palhares=UNDERGROUND_SCAN_SITES.find(s=>s.id==='gruta-dos-palhares');
assert.ok(palhares&&palhares.type==='cave','new Palhares entry must be a real natural cave');
assert.deepEqual(palhares.coordinates,[-47.466659,-19.931757]);
assert.equal(palhares.models.length,1);
assert.equal(palhares.models[0].uid,'378b82695f934eafa01b397ba4d0ff83');
assert.equal(palhares.models[0].license,'CC Attribution');
assert.match(palhares.models[0].method,/photogrammetry/i);
const sete=UNDERGROUND_SCAN_SITES.find(s=>s.id==='gruta-dos-sete-saloes');
assert.ok(sete&&sete.type==='cave','Sete Salões must be a real natural cave with its own marker');
assert.deepEqual(sete.coordinates,[-41.377075,-19.276911]);
assert.equal(sete.models.length,1);
assert.equal(sete.models[0].uid,'d3a9e08821e84226876b426958691adf');
assert.equal(sete.models[0].license,'CC Attribution');
assert.match(sete.models[0].method,/photogrammetry/i);
assert.match(sete.locationPrecision,/Approximate/i);
assert.ok(undergroundSitePopupHtml(sete).includes('sketchfab.com/models/d3a9e08821e84226876b426958691adf/embed'));
const jackson=UNDERGROUND_SCAN_SITES.find(s=>s.id==='jackson-blue-spring-cavern');
assert.ok(jackson&&jackson.type==='cave','Jackson Blue Spring is an actual underwater natural cave');
assert.deepEqual(jackson.coordinates,[-85.140083,30.790528]);
assert.equal(jackson.models.length,1);
assert.equal(jackson.models[0].uid,'c0ecd1020c794a9a83771d7957517438');
assert.equal(jackson.models[0].license,'CC Attribution');
assert.match(jackson.models[0].method,/photogrammetry/i);
assert.match(jackson.models[0].method,/1,017/);
assert.match(jackson.locationPrecision,/Florida Geological Survey/i);
assert.ok(undergroundSitePopupHtml(jackson).includes('sketchfab.com/models/c0ecd1020c794a9a83771d7957517438/embed'));
assert.ok(undergroundSitePopupHtml(jackson).includes('Matthew Hardman'));
assert.equal(UNDERGROUND_SCAN_SITES.filter(s=>s.id==='jackson-blue-spring-cavern').length,1);
const ellora=UNDERGROUND_SCAN_SITES.find(s=>s.id==='ellora-caves-india');
assert.ok(ellora&&ellora.type==='cave','Ellora must have its own rock-cut cave heritage marker');
assert.deepEqual(ellora.coordinates,[75.17917,20.02639]);
assert.equal(ellora.models.length,1);
assert.equal(ellora.models[0].uid,'1a5ec1e212f9451e80dc051e97164d17');
assert.equal(ellora.models[0].license,'CC Attribution');
assert.match(ellora.models[0].method,/photogrammetry/i);
assert.match(ellora.locationPrecision,/Ministry of Culture/i);
assert.ok(undergroundSitePopupHtml(ellora).includes('sketchfab.com/models/1a5ec1e212f9451e80dc051e97164d17/embed'));
assert.ok(undergroundSitePopupHtml(ellora).includes('Graphic solutions'));
assert.equal(UNDERGROUND_SCAN_SITES.filter(s=>s.id==='ellora-caves-india').length,1);
const bethells=UNDERGROUND_SCAN_SITES.find(s=>s.id==='bethells-beach-sea-cave');
assert.ok(bethells&&bethells.type==='cave','Bethells Beach must be a real natural sea cave marker');
assert.deepEqual(bethells.coordinates,[174.44382,-36.89555]);
assert.equal(bethells.models.length,2);
assert.equal(bethells.models[0].uid,'ce71dc2848984acfb11d8002a48a6043');
assert.equal(bethells.models[0].license,'CC Attribution');
assert.match(bethells.models[0].method,/photogrammetry/i);
assert.match(bethells.models[0].method,/46-photo/i);
assert.match(bethells.locationPrecision,/Approximate/i);
assert.ok(undergroundSitePopupHtml(bethells).includes('sketchfab.com/models/ce71dc2848984acfb11d8002a48a6043/embed'));
assert.ok(undergroundSitePopupHtml(bethells).includes('b_nealie'));
assert.equal(UNDERGROUND_SCAN_SITES.filter(s=>s.id==='bethells-beach-sea-cave').length,1);
const anchorChurch=UNDERGROUND_SCAN_SITES.find(s=>s.id==='anchor-church-caves-derbyshire');
assert.ok(anchorChurch&&anchorChurch.type==='cave','new Anchor Church entry must be a real photographed sandstone cave');
assert.deepEqual(anchorChurch.coordinates,[-1.49750,52.84167]);
assert.equal(anchorChurch.models.length,1);
assert.equal(anchorChurch.models[0].uid,'c7125417f09e43229288316c8144e625');
assert.equal(anchorChurch.models[0].license,'CC Attribution');
assert.match(anchorChurch.models[0].method,/photogrammetry/i);
assert.match(anchorChurch.models[0].method,/122-image/i);
assert.match(anchorChurch.locationPrecision,/Approximate/i);
assert.ok(undergroundSitePopupHtml(anchorChurch).includes('sketchfab.com/models/c7125417f09e43229288316c8144e625/embed'));
assert.ok(undergroundSitePopupHtml(anchorChurch).includes('Shiro Morturn'));
assert.equal(UNDERGROUND_SCAN_SITES.filter(s=>s.id==='anchor-church-caves-derbyshire').length,1);
const rockHouse=UNDERGROUND_SCAN_SITES.find(s=>s.id==='rock-house-ohio');
assert.ok(rockHouse&&rockHouse.type==='cave','real Hocking Hills Ohio natural cave has mapped icon');
assert.deepEqual(rockHouse.coordinates,[-82.61359,39.49755]);
assert.equal(rockHouse.models.length,1);
assert.equal(rockHouse.models[0].matterportTourId,'1BTGHi85s96');
assert.match(rockHouse.models[0].method,/photo-textured/i);
assert.match(rockHouse.models[0].method,/depth sensing/i);
assert.ok(!rockHouse.models[0].license.includes('CC Attribution'),'no invented CC license for Matterport');
assert.ok(undergroundSitePopupHtml(rockHouse).includes('src="https://my.matterport.com/show/?m=1BTGHi85s96"'));
assert.ok(!undergroundSitePopupHtml(rockHouse).includes('&amp;play=1'),'no Matterport mobile autoplay escalation');
assert.ok(undergroundSitePopupHtml(rockHouse).includes('sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-presentation"'));
assert.ok(!undergroundSitePopupHtml(rockHouse).includes('allow-top-navigation'),'Ohio iframe may not navigate the parent page');
assert.ok(!undergroundSitePopupHtml(rockHouse).includes('allow-popups'),'Ohio iframe may not launch a different browser tab');
assert.ok(!undergroundSitePopupHtml(rockHouse).includes('allowfullscreen'),'Ohio iframe cannot trigger an external fullscreen takeover');
assert.ok(!undergroundSitePopupHtml(rockHouse).includes('target="_blank"'),'Ohio viewer must have no external anchor');
assert.ok(!undergroundSitePopupHtml(rockHouse).includes('href="https://my.matterport.com/'),'Ohio viewer must not render a clickable provider link');
assert.ok(undergroundSitePopupHtml(rockHouse).includes('Original 3D publisher: Elements of Media'));
assert.ok(undergroundSitePopupHtml(rockHouse).includes('bp-underground-site-popup-matterport-v1'));
assert.ok(undergroundSitePopupHtml(rockHouse).includes('Play the tour here in BridgePoint'));
assert.ok(undergroundSitePopupHtml(rockHouse).includes('Elements of Media'));
assert.ok(undergroundSitePopupHtml(rockHouse).includes('does not claim it is a pure photogrammetry'));
assert.ok(undergroundSitePopupHtml(rockHouse).includes('Access / rights:'));
assert.ok(undergroundSitePopupHtml(rockHouse).includes('original publisher retains rights'));
assert.equal(UNDERGROUND_SCAN_SITES.filter(s=>s.id==='rock-house-ohio').length,1);
const japan=UNDERGROUND_SCAN_SITES.find(s=>s.id==='abukuma-cave-japan');
assert.ok(japan&&japan.type==='cave','Abukuma must be a real Japan cave with its own large persistent icon');
assert.deepEqual(japan.coordinates,[140.67292,37.34417]);
assert.equal(japan.models.length,1);
assert.equal(japan.models[0].uid,'cbe5a1c208674091b48f65ac2d4cca94');
assert.equal(japan.models[0].embedOnly,true);
assert.match(japan.models[0].method,/724 photographs/);
assert.match(japan.models[0].method,/photogrammetry/i);
assert.match(japan.locationPrecision,/entrance/i);
assert.ok(undergroundSitePopupHtml(japan).includes('sketchfab.com/models/cbe5a1c208674091b48f65ac2d4cca94/embed'));
assert.ok(undergroundSitePopupHtml(japan).includes('Fujihiko Matsumoto'));
const china=UNDERGROUND_SCAN_SITES.find(s=>s.id==='yungang-cave-18-china');
assert.ok(china&&china.type==='cave','Yungang Cave 18 must be a real cave in China');
assert.deepEqual(china.coordinates,[113.12334,40.11019]);
assert.equal(china.models.length,1);
assert.equal(china.models[0].uid,'be7675a23595489c86211608f0fb1886');
assert.equal(china.models[0].embedOnly,true);
assert.match(china.models[0].method,/photogrammetry/i);
assert.match(china.locationPrecision,/Cave 18 entrance/);
assert.ok(undergroundSitePopupHtml(china).includes('sketchfab.com/models/be7675a23595489c86211608f0fb1886/embed'));
assert.ok(undergroundSitePopupHtml(china).includes('Di Luo'));
const egypt=UNDERGROUND_SCAN_SITES.find(s=>s.id==='pyramid-of-unas-egypt');
assert.ok(egypt&&egypt.type==='tomb','Egyptian Pyramid of Unas must have its own large persistent gold tomb icon');
assert.deepEqual(egypt.coordinates,[31.21494,29.86819]);
assert.equal(egypt.models.length,1);
assert.equal(egypt.models[0].uid,'ccfc7c2f43214b559e93c4857eb6ed4a');
assert.equal(egypt.models[0].embedOnly,true,'Egypt scan must remain original creator-hosted mesh');
assert.match(egypt.models[0].method,/260-photo photogrammetry/);
assert.match(egypt.models[0].method,/Metashape/i);
assert.match(egypt.locationPrecision,/Pyramid of Unas site/i);
assert.ok(undergroundSitePopupHtml(egypt).includes('sketchfab.com/models/ccfc7c2f43214b559e93c4857eb6ed4a/embed'));
assert.ok(undergroundSitePopupHtml(egypt).includes('D. Anderson'));
assert.ok(undergroundSitePopupHtml(egypt).includes('Pyramid Texts'));
assert.equal(UNDERGROUND_SCAN_SITES.filter(s=>s.id==='pyramid-of-unas-egypt').length,1);
const antarctic=UNDERGROUND_SCAN_SITES.find(s=>s.id==='lima-lima-cave-antarctica');
assert.ok(antarctic&&antarctic.type==='cave','real Antarctic Lima Lima cave has existing large persistent icon');
assert.deepEqual(antarctic.coordinates,[-61.0369667,-62.61545]);
assert.equal(antarctic.models.length,4,'original Antarctic cave plus three original-source research chamber scans');
assert.equal(antarctic.models[0].uid,'899e6c8016954dab825dffb07d583fb9');
assert.equal(antarctic.models[0].embedOnly,true);
assert.match(antarctic.models[0].method,/laser capture/i,'laser origin must not be misrepresented as photo-mesh');
assert.match(antarctic.models[0].method,/Metashape 1\.8\.3/i);
assert.match(antarctic.models[0].method,/2,000,000 triangles/i);
assert.match(antarctic.models[0].method,/solid polygon geometry/i);
assert.match(antarctic.models[0].method,/NOT photo-based photogrammetry/i);
assert.match(antarctic.locationPrecision,/Antarctic Treaty Secretariat/i);
assert.match(antarctic.locationPrecision,/2022/i);
assert.ok(undergroundSitePopupHtml(antarctic).includes('sketchfab.com/models/899e6c8016954dab825dffb07d583fb9/embed'));
assert.ok(undergroundSitePopupHtml(antarctic).includes('LEACH'));
assert.ok(undergroundSitePopupHtml(antarctic).includes('White Landscapes'));
assert.ok(undergroundSitePopupHtml(antarctic).includes('not a camera-photogrammetry scan'),'capture modality must be disclosed');
assert.equal(UNDERGROUND_SCAN_SITES.filter(s=>s.id==='lima-lima-cave-antarctica').length,1);
const africa=UNDERGROUND_SCAN_SITES.find(s=>s.id==='elands-bay-cave-south-africa');
assert.ok(africa&&africa.type==='cave','real South African Elands Bay cave has existing large persistent icon');
assert.deepEqual(africa.coordinates,[18.31766,-32.31779]);
assert.equal(africa.models.length,1);
assert.equal(africa.models[0].uid,'d0c88d0853844a8e9a1de22a342326cb');
assert.equal(africa.models[0].embedOnly,true);
assert.match(africa.models[0].method,/250 DSLR photographs/i);
assert.match(africa.models[0].method,/1,500 drone photographs/);
assert.match(africa.models[0].method,/3 laser scans/);
assert.match(africa.models[0].method,/RealityCapture/);
assert.match(africa.models[0].method,/408,500 triangles/);
assert.match(africa.locationPrecision,/OpenStreetMap Elands Bay Cave entrance node 10614878708/);
assert.ok(undergroundSitePopupHtml(africa).includes('sketchfab.com/models/d0c88d0853844a8e9a1de22a342326cb/embed'));
assert.ok(undergroundSitePopupHtml(africa).includes('The Rock Art Portal'));
assert.ok(undergroundSitePopupHtml(africa).includes('NoAI usage restriction'),'source usage restrictions attributed');
assert.ok(undergroundSitePopupHtml(africa).includes('not a raw point-cloud viewer'));
assert.equal(UNDERGROUND_SCAN_SITES.filter(s=>s.id==='elands-bay-cave-south-africa').length,1);
assert.equal(UNDERGROUND_SCAN_SITES.find(s=>s.id==='lima-lima-cave-antarctica').models[0].uid,'899e6c8016954dab825dffb07d583fb9','Antarctic model retained');


const marineAddedIds=["muriwai-sea-cave-nz","rothesay-sea-cave-nz","john-millar-blue-hole-bahamas","villefranche-marine-cave-france","hilbre-shore-cave-uk","middle-eye-sandstone-cave-uk","algarve-coastal-cave-portugal","marseille-30m-cave-entrance-france"];
const marineAddedSites=marineAddedIds.map(id=>UNDERGROUND_SCAN_SITES.find(s=>s.id===id));
assert.ok(marineAddedSites.every(s=>s&&s.type==='cave'&&s.models.length===1));
const previousBelTorrente=UNDERGROUND_SCAN_SITES.find(s=>s.id==='bel-torrente-underwater-cave-sardinia');
assert.ok(previousBelTorrente);
assert.deepEqual(previousBelTorrente.coordinates,[9.6348,40.1794]);
assert.equal(previousBelTorrente.models.length,2);
assert.equal(previousBelTorrente.models[0].uid,'2f06ab8d1bd14ce5a85c417fefd91cda');
const newBethells=UNDERGROUND_SCAN_SITES.find(s=>s.id==='bethells-beach-sea-cave');
assert.ok(newBethells);
assert.equal(newBethells.models.length,2);
assert.equal(newBethells.models[0].uid,'ce71dc2848984acfb11d8002a48a6043');
assert.equal(newBethells.models[1].uid,'3be79c6a956c423d9b05fa67ce559ee9');
const marineModels=marineAddedSites.flatMap(s=>s.models).concat(previousBelTorrente.models.slice(1),newBethells.models.slice(1));
assert.equal(marineModels.length,10);
assert.equal(new Set(marineModels.map(m=>m.uid)).size,10);
for(const site of marineAddedSites.concat([previousBelTorrente,newBethells])){
 for(const model of site===previousBelTorrente||site===newBethells?site.models.slice(1):site.models){
  assert.equal(model.embedOnly,true);
  const h=undergroundSitePopupHtml(site,model.uid);
  assert.ok(h.includes('sketchfab.com/models/'+model.uid+'/embed'));
  assert.ok(h.includes('sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-presentation"'));
  assert.ok(!h.includes('allow-top-navigation')&&!h.includes('allow-popups'));
 }
}
const largeCavesV18=[["arco-do-andre-brazil","a873f750875d4f37a3784ffddc9f5abc",250],["devilstep-hollow-full-tennessee","d07aa3cf92a4478684130d9261e1d94c",110],["peak-cavern-submerged-swine-hole","d010364e4b684a488e934d6664a3c54e",120],["barenfalle-high-alpine-cave-austria","17c248ec0c284b6ebbd201d35753c4b8",0],["hohle-fels-giant-chamber-germany","c92b96fed07743ce8277619d2a6fb347",30]];
assert.equal(largeCavesV18.length,5);
assert.equal(new Set(largeCavesV18.map(x=>x[1])).size,5);
for(const [id,uid] of largeCavesV18){
 const site=UNDERGROUND_SCAN_SITES.find(s=>s.id===id);
 assert.ok(site&&site.type==='cave');
 assert.equal(site.models.length,1);
 assert.equal(site.models[0].uid,uid);
 assert.equal(site.models[0].embedOnly,true);
 assert.ok(site.models[0].method&&site.models[0].detail&&site.locationPrecision);
 const html=undergroundSitePopupHtml(site);
 assert.ok(html.includes('sketchfab.com/models/'+uid+'/embed'));
 assert.ok(html.includes('sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-presentation"'));
 assert.ok(!html.includes('allow-top-navigation')&&!html.includes('allow-popups'));
}

const polarNewGreenland=[
 ['eqik-cove-cave-greenland',[-21.93311,80.25346],['5e49a7bc370147f7a57d70187257ffb7','e0e487e56083459d935bde3eb51f12ae']],
 ['inussuk-cairn-climb-cave-greenland',[-21.71019,80.37756],['2eac394c5e4945deadadbc45c32a093e']],
 ['geus-ordovician-cave-greenland',[-30,78],['58f3d97cd9b3410a8f34193979c4d13a']]
];
assert.equal(polarNewGreenland.length,3);
const limaLimaAntarcticIds=['3ed9bf8dd9eb4821851b56974c4f1a6b','a96e1387d5af46189920d78b9297c898','c3e3ce73bff4404b8006014b240ac8c2'];
assert.deepEqual(antarctic.models.slice(1).map(m=>m.uid),limaLimaAntarcticIds);
const sevenVerifiedPolarModels=polarNewGreenland.flatMap(([id,coords,uids])=>{
 const site=UNDERGROUND_SCAN_SITES.find(s=>s.id===id);
 assert.ok(site&&site.type==='cave');
 assert.deepEqual(site.coordinates,coords);
 assert.deepEqual(site.models.map(m=>m.uid),uids);
 assert.ok(site.locationPrecision.length>=50);
 assert.ok(site.models.every(m=>m.embedOnly));
 return site.models.map(m=>[site,m]);
}).concat(antarctic.models.slice(1).map(m=>[antarctic,m]));
assert.equal(sevenVerifiedPolarModels.length,7);
assert.equal(new Set(sevenVerifiedPolarModels.map(([,m])=>m.uid)).size,7);
for(const [site,m] of sevenVerifiedPolarModels){
 assert.ok(m.creator&&m.method&&m.detail&&m.modelUrl.includes(m.uid));
 const html=undergroundSitePopupHtml(site,m.uid);
 assert.ok(html.includes('sketchfab.com/models/'+m.uid+'/embed'));
 assert.ok(html.includes('sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-presentation"'));
 assert.ok(!html.includes('allow-top-navigation')&&!html.includes('allow-popups')&&!html.includes('target="_blank"'));
}
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='geus-ordovician-cave-greenland').locationPrecision,/region-only/);
assert.ok(!UNDERGROUND_SCAN_SITES.some(s=>s.models.some(m=>m.uid==='8232d52d0ad949be9e4df415b5480704')),'noncommercial Greenland U-cave model not added to BridgePoint');
const tenUsCaveSitesV20=[["alabama-300m-archived-cave",["1663083e3d0f46bb99efccd8a4a8f941"]],["mammoth-cave-kentucky-3d-survey",["nd70Yvu9EP5yEA4pb7iSCbMb25q"]],["carlsbad-painted-grotto-nm",["d7d0abceb316400b828d28cbf26ed6d2"]],["big-bat-cave-kentucky-real-mesh",["12d1180e0d2f4c24b1f827d3322f4d54","78580c37f2a54a6791919d7a15b87719"]],["hidden-cave-fallon-nevada-photogrammetry",["9c4363f2250f4b04bdcd163d2843dd91","f6f8ce48fe0f49339ba2dfab69d49174"]],["petit-jean-rock-house-cave-arkansas",["ca8ba859d0694aab8c0c046804c36b55"]],["paisley-cave-one-oregon",["dadb5c06f534428a8d27fbff612afc6a"]],["lava-beds-photo-cave-california",["d3595bd7ab974e4e8eb2efa3ceeec04d"]],["russell-cave-national-monument-alabama",["e23deee8940f4b048a2c8a99e98358f9"]],["chilly-bowl-boogie-tube-arkansas",["9ab1ea083f9e464fb2da2a166ea01111"]]];
assert.equal(tenUsCaveSitesV20.length,10,'ten distinct US cave map markers');
assert.equal(tenUsCaveSitesV20.reduce((n,[,models])=>n+models.length,0),12,'two extra choices at Big Bat and Hidden Cave');
assert.equal(new Set(tenUsCaveSitesV20.map(([id])=>id)).size,10);
for(const [siteId,modelIds] of tenUsCaveSitesV20){
 const site=UNDERGROUND_SCAN_SITES.find(s=>s.id===siteId);
 assert.ok(site&&site.type==='cave','genuine cave environment site '+siteId);
 assert.deepEqual(site.models.map(m=>m.uid),modelIds,'creator-hosted 3D scans for '+siteId);
 assert.equal(site.models.length,modelIds.length,'no duplicate or synthetic scans');
 assert.ok(site.locationPrecision.length>50&&site.locationNote.length>30);
 assert.ok(site.models.every(m=>m.embedOnly&&m.method&&m.detail&&m.creator));
 for(const uid of modelIds){
  const html=undergroundSitePopupHtml(site,uid);
  assert.ok(html.includes('sketchfab.com/models/'+uid+'/embed'),'in-BridgePoint viewer '+uid);
  assert.ok(html.includes('sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-presentation"'));
  assert.ok(!html.includes('allow-top-navigation')&&!html.includes('allow-popups')&&!html.includes('target="_blank"'));
 }
}
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='alabama-300m-archived-cave').locationPrecision,/REGION ONLY/);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='mammoth-cave-kentucky-3d-survey').models[0].detail,/UNSPECIFIED scanned segment/);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='big-bat-cave-kentucky-real-mesh').models[0].detail,/PART/);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='hidden-cave-fallon-nevada-photogrammetry').models[0].detail,/DEFAULT/);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='petit-jean-rock-house-cave-arkansas').models[0].detail,/HALF/);


const mexicoCanadaMonumentsV21={
 mexico:[["sotano-del-barro-queretaro","c2dfbdb76eab4d89a8282117c996ccac"],["naica-crystal-cave-chihuahua","04f3f56a7c0f45cc9f8f17176155b4b1"],["chiquihuite-cave-zacatecas-mexico","2caa3caeb04d4170a02a42ae685d9d54"],["mayan-blue-cenote-tulum","b6e0621ac72e4d3990bbefb430ace085"],["acambalam-puuc-chultun-yucatan","4fd7b521620a437bb410230a8c60b97e"]],
 canadaNomash:["463f6d459d964170a64eb3c48e214a73","dc192656b67c4a028931d9e34f94d8cc","ab543f777609488da82646ebe1253470","a21804bb454b46e5a8aad1590472e4ca"],
 canadaWellsGray:'0da6c7789e6a4dffbabfcbd93bf6e868',
 globalSites:[["petra-royal-tombs-jordan","e01723d1e6f64dafb001c098c58d613b"],["petra-great-temple-jordan","4b4fa4ab61c84c8883b32a9cd4ee5ff8"],["chichen-itza-el-castillo-mexico","1624b224a7514762baf9025e6fe7dc4f"],["angkor-wat-khmer-temple-cambodia","be70b89f9c264fc19d63dca2ae78b224"],["machu-picchu-inca-citadel-peru","eb2e2c36ba8a4d8197dc30dd947984d2"]]
};
assert.equal(mexicoCanadaMonumentsV21.mexico.length,5,'five Mexican cave/underground heritage sites');
assert.equal(mexicoCanadaMonumentsV21.canadaNomash.length+1,5,'five original-source Canada cave scan choices');
assert.equal(mexicoCanadaMonumentsV21.globalSites.length,5,'five huge archaeological sites');
const v21AllIds=mexicoCanadaMonumentsV21.mexico.map(x=>x[1]).concat(mexicoCanadaMonumentsV21.canadaNomash,[mexicoCanadaMonumentsV21.canadaWellsGray],mexicoCanadaMonumentsV21.globalSites.map(x=>x[1]));
assert.equal(v21AllIds.length,15);
assert.equal(new Set(v21AllIds).size,15,'all models are different original-source assets');
const v21NewSites=mexicoCanadaMonumentsV21.mexico.concat(mexicoCanadaMonumentsV21.globalSites);
for(const [siteId,uid] of v21NewSites){
 const site=UNDERGROUND_SCAN_SITES.find(s=>s.id===siteId);
 assert.ok(site,'new site '+siteId);
 assert.equal(site.models.length,1);
 assert.equal(site.models[0].uid,uid);
 assert.ok(site.models[0].embedOnly,'in BridgePoint creator-hosted viewer');
 assert.ok(site.models[0].creator&&site.models[0].method&&site.models[0].detail&&site.models[0].license);
 assert.ok(site.locationPrecision.length>55&&site.locationNote);
 assert.ok(site.coordinates.every(n=>Number.isFinite(n)));
 assert.equal(site.type,mexicoCanadaMonumentsV21.globalSites.some(x=>x[0]===siteId)?'tomb':'cave','large historical sites receive gold tomb-style icon');
 const html=undergroundSitePopupHtml(site,uid);
 assert.ok(html.includes('sketchfab.com/models/'+uid+'/embed'));
 assert.ok(html.includes('sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-presentation"'));
 assert.ok(!html.includes('allow-top-navigation')&&!html.includes('allow-popups')&&!html.includes('target="_blank"'));
}
const nomashV21=UNDERGROUND_SCAN_SITES.find(s=>s.id==='nomash-river-wetdream-cave-bc');
assert.ok(nomashV21&&nomashV21.type==='cave');
assert.deepEqual(nomashV21.models.map(m=>m.uid),mexicoCanadaMonumentsV21.canadaNomash);
assert.match(nomashV21.locationPrecision,/regional/);
for(const m of nomashV21.models){
 assert.ok(m.embedOnly);
 assert.ok(undergroundSitePopupHtml(nomashV21,m.uid).includes('sketchfab.com/models/'+m.uid+'/embed'));
}
const wellsV21=UNDERGROUND_SCAN_SITES.find(s=>s.id==='wells-gray-sarlaccs-pit-canada');
assert.equal(wellsV21.models.length,2);
assert.equal(wellsV21.models[0].uid,'df5dea76480f4ed3af018d885a13b704','original Wells Gray kept');
assert.equal(wellsV21.models[1].uid,mexicoCanadaMonumentsV21.canadaWellsGray);
assert.ok(undergroundSitePopupHtml(wellsV21,wellsV21.models[1].uid).includes('sketchfab.com/models/'+wellsV21.models[1].uid+'/embed'));
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='acambalam-puuc-chultun-yucatan').models[0].detail,/MAN-MADE/i);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='mayan-blue-cenote-tulum').models[0].detail,/CLUSTER/);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='petra-great-temple-jordan').models[0].method,/7.8 million/i);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='chiquihuite-cave-zacatecas-mexico').models[0].detail,/UNIT X-12/);


const fifteenUniqueArchaeologicalV22=[["kaymakli-underground-city-turkey","ff65fb61e6af4774873cb2a7046c283d","catacomb"],["kyiv-pechersk-near-caves-ukraine","e0e43e0c995a4832be6b0689c4a4f32b","catacomb"],["kyiv-pechersk-far-caves-ukraine","31109af6c895415b987561a54d21f4ba","catacomb"],["matera-sassi-cave-houses-italy","c5ea8441fc2445a481bb4198f83273cc","tomb"],["basarabi-murfatlar-b4-rock-church-romania","3d46c0e9e8a74541af5df1b3341e4027","catacomb"],["brno-ossuary-underground-czechia","20b1fed375104cd7bebb2db7cdaf0f0c","catacomb"],["petra-ad-deir-monastery-jordan","b1bb4d6d9bfa4bd2a85621186016734e","tomb"],["great-zimbabwe-great-enclosure-scan","4368b31623f54917b462041beb6cbd3c","tomb"],["meroe-northern-pyramid-field-sudan","b395c56bdeec4047853670c7cd39ef72","tomb"],["persepolis-achaemenid-terrace-iran","e8f36eab22ae4e7fb94d3a7cc9939669","tomb"],["abu-simbel-twin-temples-egypt","810411acbae84502af5dca94fd3c596a","tomb"],["karnak-harpre-north-temple-egypt","9eba84c6a6c84d83b6235956e171b7c9","tomb"],["chavin-de-huantar-andes-peru","a0fbb78a90704f77974ad03428a3d704","tomb"],["bagan-khayiminga-temple-group-myanmar","60242ad002694827b6a95eeeecd22c84","tomb"],["giza-khufu-great-pyramid-egypt","4a251113722f4d969b6cf2ca5f35c502","tomb"]];
assert.equal(fifteenUniqueArchaeologicalV22.length,15,'fifteen independent archaeological site markers');
assert.equal(new Set(fifteenUniqueArchaeologicalV22.map(x=>x[0])).size,15,'no duplicate site markers');
assert.equal(new Set(fifteenUniqueArchaeologicalV22.map(x=>x[1])).size,15,'fifteen real unique original 3D scans');
assert.equal(fifteenUniqueArchaeologicalV22.filter(([, ,t])=>t==='catacomb').length,5,'five underground cave-city/ossuary heritage anchors');
assert.equal(fifteenUniqueArchaeologicalV22.filter(([, ,t])=>t==='tomb').length,10,'ten large temple, pyramid and ancient city anchors');
for(const [siteId,uid,icon] of fifteenUniqueArchaeologicalV22){
 const site=UNDERGROUND_SCAN_SITES.find(s=>s.id===siteId);
 assert.ok(site,'source-published archaeological site '+siteId);
 assert.equal(site.type,icon,'persistent archaeology marker type '+siteId);
 assert.equal(site.models.length,1,'no imaginary extra source scans');
 const m=site.models[0];
 assert.equal(m.uid,uid);
 assert.equal(m.embedOnly,true,'safe original-creator hosted model');
 assert.ok(m.creator&&m.license&&m.method&&m.detail&&m.modelUrl.endsWith(uid));
 assert.ok(site.locationPrecision&&site.locationPrecision.length>75&&site.locationNote&&site.locationNote.length>30);
 assert.ok(site.coordinates.every(n=>typeof n==='number'&&Number.isFinite(n)));
 const html=undergroundSitePopupHtml(site,uid);
 assert.ok(html.includes('sketchfab.com/models/'+uid+'/embed'),'in-BridgePoint viewer '+uid);
 assert.ok(html.includes('sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-presentation"'));
 assert.ok(!html.includes('allow-top-navigation')&&!html.includes('allow-popups')&&!html.includes('target="_blank"'));
}
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='kyiv-pechersk-near-caves-ukraine').models[0].detail,/383.metre/);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='kyiv-pechersk-far-caves-ukraine').models[0].detail,/293.metre/);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='kaymakli-underground-city-turkey').models[0].detail,/gallery/i);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='petra-ad-deir-monastery-jordan').models[0].method,/9,250/);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='meroe-northern-pyramid-field-sudan').models[0].method,/16.7 million/);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='giza-khufu-great-pyramid-egypt').models[0].detail,/NOT show/);


const newHistoricSitesV23=[["rakvere-castle-estonia","29ff71ac4b1340caa1fd539dd2f6abe0",[26.35191,59.348026]],["koknese-castle-ruins-latvia","c739f35a5ac8499087ef25a3ea9f2fb6",[25.41742,56.63801]],["dobele-castle-ruins-latvia","9591e10d536d4cf28879ab45418cfcaf",[23.272663,56.622654]],["mirow-castle-ruins-poland","7ba54dd84e324c83987612a4ed4523f3",[19.4751,50.61452]],["dunnottar-castle-scotland","4f98063d11c14c84952fcfd4b798cfe4",[-2.19718,56.94599]],["rocca-calascio-fortress-italy","7fbfe67ec4864d439f25303b50697189",[13.68888,42.32889]],["hatshepsut-deir-el-bahari-egypt","5bc88658fc5e458f8f25af8a0ac9ee7b",[32.60644,25.73834]],["roman-temple-evora-portugal","935f17a3824d49f7b2505a0686450d51",[-7.90734,38.57264]],["metsamor-citadel-armenia","4bab0afa71084cabb003ecda93cc8be2",[44.18508,40.13936]],["apollo-portara-naxos-greece","af0ee6605da74f7bac2ea7fb0160cef9",[25.37245,37.11017]],["vindolanda-roman-fort-uk","4ef8168053794fc8817a0a90933830c6",[-2.36026,54.99138]],["sibhudu-cave-heritage-south-africa","79f2af1fd7024a949d7eb11f77628d8b",[31.085889,-29.522639]],["afrosiyob-excavation-samarkand-uzbekistan","268d73136c4d4bc89eac4db3ad97a49f",[66.987747,39.67022]],["biokovo-tumulus-excavation-croatia","f195fd290abd413bac1287b9094138e5",[17.05,43.32]],["khirbat-en-nahas-area-m-jordan","fee676a94d1a4ed7abdb0d777fbde084",[35.43633,30.67939]]];
assert.equal(newHistoricSitesV23.length,15,'fifteen new real 3D historical sites');
assert.equal(new Set(newHistoricSitesV23.map(([id])=>id)).size,15,'unique new map anchors');
assert.equal(new Set(newHistoricSitesV23.map(([,uid])=>uid)).size,15,'unique original-source 3D models');
for(const [id,uid,coordinates] of newHistoricSitesV23){
 const site=UNDERGROUND_SCAN_SITES.find(s=>s.id===id);
 assert.ok(site&&site.models.length===1,'heritage site '+id);
 assert.deepEqual(site.coordinates,coordinates);
 const model=site.models[0];
 assert.equal(model.uid,uid);
 assert.equal(model.embedOnly,true,'creator-hosted 3D model is contained in BridgePoint');
 assert.ok(model.creator&&model.method&&model.detail&&model.license.includes('no reuse license displayed'));
 assert.ok(site.locationPrecision.length>70&&site.locationNote.length>30);
 assert.ok(model.modelUrl.endsWith(uid));
 const html=undergroundSitePopupHtml(site,uid);
 assert.ok(html.includes('sketchfab.com/models/'+uid+'/embed'));
 assert.ok(html.includes('sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-presentation"'));
 assert.ok(!html.includes('allow-popups')&&!html.includes('allow-top-navigation')&&!html.includes('target="_blank"'));
}
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='biokovo-tumulus-excavation-croatia').locationPrecision,/REGIONAL ONLY/);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='sibhudu-cave-heritage-south-africa').models[0].method,/laser stations/);

const fiveRemoteDeepCaves=[
 {id:'wells-gray-sarlaccs-pit-canada',coordinates:[-120,52.33306],uid:'df5dea76480f4ed3af018d885a13b704',method:/photogrammetry/i,detail:/ONLY reconstructs the exposed entrance/,placement:/regional/i},
 {id:'gorner-glacier-g6-moulin-switzerland',coordinates:[7.81528,45.94750],uid:'5dc79d2891f24e9fa571b9e910556ec8',method:/Photogrammetry/i,detail:/not a LiDAR point-cloud/,placement:/NOT the surveyed/i},
 {id:'bel-torrente-underwater-cave-sardinia',coordinates:[9.6348,40.1794],uid:'2f06ab8d1bd14ce5a85c417fefd91cda',method:/Underwater photogrammetry/i,detail:/only the entrance floor/,placement:/NOT its precisely surveyed/i},
 {id:'sipadan-turtle-tomb-malaysia',coordinates:[118.627411,4.116292],uid:'85a2ff52fa7b4a44b87033145fd1b01f',method:/900 RAW photographs/,detail:/only ONE SECTION/,placement:/Island regional anchor/},
 {id:'wonderwerk-cave-south-africa',coordinates:[23.55398,-27.84647],uid:'7161373c7ccb48da9aa00e52214df1b8',method:/NOT a raw LiDAR point-cloud/,detail:/NOT claimed to be exclusively camera photogrammetry/,placement:/OpenStreetMap cave node 1388709831/}
];
assert.equal(new Set(fiveRemoteDeepCaves.map(s=>s.id)).size,5);
assert.equal(new Set(fiveRemoteDeepCaves.map(s=>s.uid)).size,5);
for(const spec of fiveRemoteDeepCaves){
 const s=UNDERGROUND_SCAN_SITES.find(x=>x.id===spec.id);
 assert.ok(s && s.type==='cave',spec.id+' is added as real Cave type');
 assert.deepEqual(s.coordinates,spec.coordinates);
 assert.equal(s.models.length,['bel-torrente-underwater-cave-sardinia','wells-gray-sarlaccs-pit-canada'].includes(spec.id)?2:1);
 assert.equal(s.models[0].uid,spec.uid);
 assert.equal(s.models[0].embedOnly,true);
 assert.match(s.models[0].method,spec.method);
 assert.match(s.models[0].detail,spec.detail);
 assert.match(s.locationPrecision,spec.placement);
 assert.ok(s.models[0].license.includes('no reuse license displayed'));
 const html=undergroundSitePopupHtml(s);
 assert.ok(html.includes('sketchfab.com/models/'+spec.uid+'/embed'),'3D model opens in existing Cave card');
 assert.ok(html.includes('sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-presentation"'));
 assert.ok(!html.includes('allow-popups')&&!html.includes('allow-top-navigation'));
 assert.ok(!html.includes('allowfullscreen')&&!html.includes('target="_blank"'));
 assert.ok(html.includes('Creator:')&&html.includes('Map placement:'));
}

const newGlobalSites=[
 {id:'leidarendi-lava-cave-iceland',coord:[-21.84298,63.98462],uid:'34861aec56564489bdb8ec1cd030ff00',method:/iPhone 12 Pro/,location:/node 451798297/,creator:/Hamburg/},
 {id:'masaya-bat-cave-nicaragua',coord:[-86.1688,11.9844],uid:'239d912831f6471da95a2fd672b53398',method:/1,001 digital photos/,location:/regional anchor/,creator:/Cliff Gill/},
 {id:'cueva-de-las-manos-argentina',coord:[-70.66667,-47.15833],uid:'74b4a560749743eaa53cd89793b4a629',method:/Agisoft PhotoScan photogrammetry/,location:/National Institute of Anthropology/,creator:/guigus60/},
 {id:'kelkaya-sinkhole-turkey',coord:[29.41611,37.74667],uid:'cd6c5687814e484da0bf4d360a324c60',method:/2,400,000 triangles/,location:/Regional marker at Honaz/,creator:/3BATS/},
 {id:'weld-range-rock-shelter-australia',coord:[117.61801,-26.95327],uid:'2989d29a52a0494aa0cd2e279b411247',method:/Photogrammetric rock-shelter reconstruction/,location:/Regional Weld Range landmark/,creator:/Paul Bourke/}
];
assert.equal(new Set(newGlobalSites.map(s=>s.id)).size,5);
assert.equal(new Set(newGlobalSites.map(s=>s.uid)).size,5);
for(const expected of newGlobalSites){
 const site=UNDERGROUND_SCAN_SITES.find(s=>s.id===expected.id);
 assert.ok(site&&site.type==='cave',expected.id+' is a genuine separately mapped cave');
 assert.deepEqual(site.coordinates,expected.coord);
 assert.equal(site.models.length,1);
 assert.equal(site.models[0].uid,expected.uid);
 assert.equal(site.models[0].embedOnly,true);
 assert.match(site.models[0].method,expected.method);
 assert.match(site.locationPrecision,expected.location);
 assert.match(site.models[0].creator,expected.creator);
 assert.equal(UNDERGROUND_SCAN_SITES.filter(s=>s.id===expected.id).length,1);
 const html=undergroundSitePopupHtml(site);
 assert.ok(html.includes('sketchfab.com/models/'+expected.uid+'/embed'),'same original creator-hosted embedded 3D viewer');
 assert.ok(html.includes('sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-presentation"'),'new 3D viewer contained in BridgePoint');
 assert.ok(!html.includes('target="_blank"'),'no external link in the card');
 assert.ok(!html.includes('allow-top-navigation')&&!html.includes('allow-popups'),'iframe cannot navigate away or open tabs');
 assert.ok(!html.includes('href="https://sketchfab.com'),'do not redirect to Sketchfab');
 assert.ok(!html.includes('allowfullscreen'),'mobile viewer cannot trigger fullscreen redirect');
 assert.ok(html.includes('Explore the photo-mesh here in BridgePoint'),'keep original in-app viewer format');
 assert.ok(html.includes('Creator:'));
 assert.ok(html.includes('Capture method:'));
 assert.ok(html.includes('Map placement:'));
}
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='kelkaya-sinkhole-turkey').models[0].license,/^CC Attribution$/);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='leidarendi-lava-cave-iceland').models[0].detail,/does not represent it as verified pure photogrammetry/);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='weld-range-rock-shelter-australia').locationPrecision,/NOT the exact position/);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='masaya-bat-cave-nicaragua').locationPrecision,/actual Tzinancostoc/);
assert.equal(UNDERGROUND_SCAN_SITES.find(s=>s.id==='elands-bay-cave-south-africa').models[0].uid,'d0c88d0853844a8e9a1de22a342326cb','previous 19 models preserved');
for(const site of [japan,china,egypt,antarctic,africa]){
 const html=undergroundSitePopupHtml(site);
 assert.ok(html.includes('sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-presentation"'),'new caves must stay inside BridgePoint');
 assert.ok(!html.includes('target="_blank"'),'new cave cards may not open external websites');
 assert.ok(!html.includes('allow-top-navigation'),'embedded scan cannot navigate away');
 assert.ok(!html.includes('allow-popups'),'embedded scan cannot open popup tabs');
 assert.ok(!html.includes('href="https://sketchfab.com'),'new card should show creator, not external link');
 assert.ok(html.includes('Explore the photo-mesh here in BridgePoint'));
 assert.ok(html.includes('no reuse license displayed'));
 assert.ok(!html.includes('allowfullscreen'),'new model cannot hijack mobile fullscreen');
}
assert.equal(UNDERGROUND_SCAN_SITES.filter(s=>s.id==='abukuma-cave-japan'||s.id==='yungang-cave-18-china').length,2);
assert.equal(UNDERGROUND_SCAN_SITES.find(s=>s.id==='rock-house-ohio').models[0].matterportTourId,'1BTGHi85s96','Ohio preserved');
assert.equal(UNDERGROUND_SCAN_SITES.find(s=>s.id==='anchor-church-caves-derbyshire').models[0].uid,'c7125417f09e43229288316c8144e625');
assert.ok(undergroundSitePopupHtml(anchorChurch).includes('sketchfab.com/models/c7125417f09e43229288316c8144e625/embed'));
assert.ok(undergroundSitePopupHtml(anchorChurch).includes('Open original Sketchfab model'));
assert.ok(undergroundSitePopupHtml(anchorChurch).includes('allowfullscreen'),'existing Sketchfab viewer permissions retained');
assert.ok(!undergroundSitePopupHtml(anchorChurch).includes('sandbox='),'existing Sketchfab model unchanged by Ohio escape fix');
assert.equal(UNDERGROUND_SCAN_SITES.find(s=>s.id==='bethells-beach-sea-cave').models[0].uid,'ce71dc2848984acfb11d8002a48a6043');
assert.equal(UNDERGROUND_SCAN_SITES.find(s=>s.id==='ellora-caves-india').models[0].uid,'1a5ec1e212f9451e80dc051e97164d17');
assert.equal(UNDERGROUND_SCAN_SITES.find(s=>s.id==='jackson-blue-spring-cavern').models[0].uid,'c0ecd1020c794a9a83771d7957517438');
assert.equal(UNDERGROUND_SCAN_SITES.find(s=>s.id==='gruta-dos-palhares').models[0].uid,'378b82695f934eafa01b397ba4d0ff83');
assert.deepEqual(UNDERGROUND_SCAN_SITES.map(s=>s.id).filter(id=>id==='gruta-dos-sete-saloes'),['gruta-dos-sete-saloes']);
assert.ok(undergroundSitePopupHtml(palhares).includes('sketchfab.com/models/378b82695f934eafa01b397ba4d0ff83/embed'));
assert.match(undergroundSitePopupHtml(treak),/sketchfab\.com\/models\/a6183b4fd7364ed59518a276ad8ef8ec\/embed/);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='paris-catacombs').locationPrecision,/Approximate/i);
assert.match(undergroundSitePopupHtml(UNDERGROUND_SCAN_SITES[0]),/sketchfab\.com\/models\/39e7050d272f4aac8493497621b86f39\/embed/);
assert.match(undergroundSitePopupHtml(UNDERGROUND_SCAN_SITES[0]),/CC Attribution/);
assert.match(undergroundSitePopupHtml(UNDERGROUND_SCAN_SITES[0]),/Creator:/);
assert.match(undergroundSitePopupHtml(UNDERGROUND_SCAN_SITES[0]),/Approximate district anchor/);
assert.match(undergroundSitePopupHtml(UNDERGROUND_SCAN_SITES[1]),/Center for Geospatial Technologies/);
assert.equal(buildUndergroundSiteFeatures([{id:'bad',coordinates:[999,0],models:[{}]}]).length,0);

const [moduleSource,landing,app,deploy]=await Promise.all([
 readFile(new URL('../rebuild-v5000/bridgepoint-underground-scan-sites-v1.js',import.meta.url),'utf8'),
 readFile(new URL('../rebuild-v5000/landing.js',import.meta.url),'utf8'),
 readFile(new URL('../rebuild-v5000/app.js',import.meta.url),'utf8'),
 readFile(new URL('../.github/workflows/deploy-intelligence-rebuild-v5000.yml',import.meta.url),'utf8')
]);
assert.ok(moduleSource.includes('minzoom:0,maxzoom:24'),'icons must persist at every zoom');
assert.ok(moduleSource.includes("const CAVE_ICON_SIZE=['interpolate',['linear'],['zoom'],0,1.6,3,1.8,7,2.0,12,2.2,18,2.4,23,3.0]"),'Caves & Sites icons are large at all zoom levels');
assert.ok(moduleSource.includes("'icon-size':CAVE_ICON_SIZE"),'Cave symbol uses the persistent size');
assert.ok(moduleSource.includes("state.map.on(event,state.handlePersistence)"),'Cave markers reassert on style/zoom changes');
assert.ok(moduleSource.includes("map.off(event,state.handlePersistence)"),'Cave listeners are cleaned up');
assert.ok(moduleSource.includes("map.getLayoutProperty(MARKER_ID,'icon-size')"),'Cave marker size is repaired if another renderer overrides it');
assert.ok(moduleSource.includes("state.map.getLayoutProperty(id,'visibility')!==wanted"),'Cave visibility writes are idempotent to avoid styledata loops');
assert.ok(moduleSource.includes('bpv-dock-actions'),'control must live in the existing globe card');
assert.ok(moduleSource.includes('window.__BP_UNDERGROUND_SCAN_SITES_V1__'));
assert.ok(landing.includes("import('./bridgepoint-underground-scan-sites-v1.js?v=2-big-persistent-cave-icons')"));
assert.ok(app.includes("import('./bridgepoint-underground-scan-sites-v1.js?v=2-big-persistent-cave-icons')"));
assert.ok(landing.includes("./bridgepoint-underground-scan-sites-v1.js?v=2-mobile-big-persistent-cave-icons"));
assert.ok(deploy.includes('cp rebuild-v5000/bridgepoint-underground-scan-sites-v1.js site/bridgepoint-underground-scan-sites-v1.js'));
assert.ok(deploy.includes('cp rebuild-v5000/bridgepoint-underground-scan-sites-v1.js site/app/bridgepoint-underground-scan-sites-v1.js'));
assert.ok(deploy.includes('node tests/underground-scan-sites-v1.test.mjs'));
console.log('BRIDGEPOINT_UNDERGROUND_SCAN_SITES_V1_PASS');
