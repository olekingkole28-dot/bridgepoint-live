import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {UNDERGROUND_SCAN_SITES,UNDERGROUND_SCAN_RIGHTS_HOLDS,buildUndergroundSiteFeatures,undergroundSitePopupHtml} from '../rebuild-v5000/bridgepoint-underground-scan-sites-v1.js';

const features=buildUndergroundSiteFeatures();
assert.equal(features.length,40,'forty reviewed cave site anchors are mapped');
assert.equal(UNDERGROUND_SCAN_SITES.reduce((n,s)=>n+s.models.length,0),44,'forty-four real creator-hosted 3D models and tours are cataloged');
assert.equal(UNDERGROUND_SCAN_RIGHTS_HOLDS.length,3,'rights/source holds are exposed');
assert.ok(features.every(f=>f.geometry.type==='Point'&&f.properties.iconImage));
assert.ok(UNDERGROUND_SCAN_SITES.every(s=>s.models.every(m=>m.uid&&m.creator&&(
 m.matterportTourId ? (m.matterportTourId==='1BTGHi85s96'&&m.modelUrl==='https://my.matterport.com/show/?m=1BTGHi85s96'&&m.license.includes('original rights retained'))
 : m.embedOnly ? (['cbe5a1c208674091b48f65ac2d4cca94','be7675a23595489c86211608f0fb1886','ccfc7c2f43214b559e93c4857eb6ed4a','899e6c8016954dab825dffb07d583fb9','d0c88d0853844a8e9a1de22a342326cb','34861aec56564489bdb8ec1cd030ff00','239d912831f6471da95a2fd672b53398','74b4a560749743eaa53cd89793b4a629','cd6c5687814e484da0bf4d360a324c60','2989d29a52a0494aa0cd2e279b411247','df5dea76480f4ed3af018d885a13b704','5dc79d2891f24e9fa571b9e910556ec8','2f06ab8d1bd14ce5a85c417fefd91cda','85a2ff52fa7b4a44b87033145fd1b01f','7161373c7ccb48da9aa00e52214df1b8','11aedb4bc1064685a8cfe33f8956a108','14773139954740e48be1fa1861d01eb7','d1691e402d0840378804f2df5aaedb2b','a35b2ecd72094b2d8a2fef9a32b98186','b9aac38260054f5f8858be684279c37e','e2420bd47de1497993addd2b3f6e1e7e','a8890e16ca49498c892d82496cdbbae9','bf983bfabc194e94893d9955ed87f471','e36a8a863b8348159d237ea808d492d7','3be79c6a956c423d9b05fa67ce559ee9','a873f750875d4f37a3784ffddc9f5abc','d07aa3cf92a4478684130d9261e1d94c','d010364e4b684a488e934d6664a3c54e','17c248ec0c284b6ebbd201d35753c4b8','c92b96fed07743ce8277619d2a6fb347'].includes(m.uid)&&(['cd6c5687814e484da0bf4d360a324c60','e2420bd47de1497993addd2b3f6e1e7e','bf983bfabc194e94893d9955ed87f471','3be79c6a956c423d9b05fa67ce559ee9','a873f750875d4f37a3784ffddc9f5abc'].includes(m.uid)?m.license==='CC Attribution':m.license.includes('no reuse license displayed'))&&m.modelUrl.startsWith('https://sketchfab.com/3d-models/'))
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
assert.equal(antarctic.models.length,1);
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
 assert.equal(s.models.length,spec.id==='bel-torrente-underwater-cave-sardinia'?2:1);
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
