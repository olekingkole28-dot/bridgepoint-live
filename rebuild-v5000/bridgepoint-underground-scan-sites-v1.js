/* BridgePoint Caves & Underground Sites v1.
 * Additive, opt-in map layer. Map anchors carry location precision; real 3D meshes remain
 * hosted by Sketchfab or (for Ohio Rock House only) its Matterport publisher. No third-party model files are downloaded, cached or redistributed.
 */
const VERSION=1, MAP_STATES=new WeakMap();
const SOURCE_ID='bp-underground-scan-sites-source-v1';
const HALO_ID='bp-underground-scan-sites-halo-v1';
const MARKER_ID='bp-underground-scan-sites-markers-v1';
const LABEL_ID='bp-underground-scan-sites-labels-v1';
const CONTROL_ID='bp-underground-scan-sites-control-v1';
const TOGGLE_ID='bp-underground-scan-sites-toggle-v1';
const COUNT_ID='bp-underground-scan-sites-count-v1';
const STATUS_ID='bp-underground-scan-sites-status-v1';
// Full-resolution Cave & Sites markers: 72px sprite at pixelRatio 2, scaled to ~58–108 CSS px.
const CAVE_ICON_SIZE=['interpolate',['linear'],['zoom'],0,1.6,3,1.8,7,2.0,12,2.2,18,2.4,23,3.0];

export const UNDERGROUND_SCAN_SITES=[
 {id:'paris-catacombs',name:'Paris Catacombs',type:'catacomb',coordinates:[2.3324,48.8336],
  locationPrecision:'Approximate district anchor. The scan creator identifies the Paris Catacombs but does not publish exact chamber coordinates.',
  locationNote:'The icon marks the Catacombs area in Paris, not the measured position of each scanned passage.',
  description:'Creator-scanned underground quarry galleries, passages and chambers in the Paris Catacombs.',
  models:[
   {uid:'39e7050d272f4aac8493497621b86f39',title:'Paris catacombs — Large gallery',creator:'Emm (@edemaistre)',license:'CC Attribution',method:'iPhone 12 Pro · Scaniverse',detail:'A scanned gallery section showing the variation in size and shape of the Paris underground quarry passages.',modelUrl:'https://sketchfab.com/3d-models/paris-catacombs-large-gallery-39e7050d272f4aac8493497621b86f39'},
   {uid:'27ae0d6041c54e2eab6638d197985842',title:'Paris catacombs — Level 1 to Level 2',creator:'Emm (@edemaistre)',license:'CC Attribution',method:'iPhone 12 Pro · 3DScannerApp',detail:'A scanned stair passage connecting two levels of the former underground quarries.',modelUrl:'https://sketchfab.com/3d-models/paris-catacombs-from-level-1-to-level-2-27ae0d6041c54e2eab6638d197985842'},
   {uid:'c63534cc8b97437bb933b8eba87ffb0d',title:'Paris catacombs — Our Lady of the Catacombs',creator:'Emm (@edemaistre)',license:'CC Attribution',method:'iPhone 12 Pro · Scaniverse',detail:'A scanned chamber containing a small chapel assembled inside the Catacombs.',modelUrl:'https://sketchfab.com/3d-models/paris-catacombs-our-lady-of-the-catacombs-c63534cc8b97437bb933b8eba87ffb0d'}
  ]},
 {id:'vrlovka-cave',name:'Vrlovka Cave',type:'cave',coordinates:[15.390412,45.636916],
  locationPrecision:'Published cave-site coordinate near the entrance. The displayed model is a high-detail interior segment, not a georegistered full-cave mesh.',
  locationNote:'The site anchor locates Špilja Vrlovka in Kamanje, Croatia; the model is a detailed cave-column cross-section.',
  description:'A high-detail GeoSLAM-derived cave scan segment showing a large stalagnate column inside Vrlovka Cave.',
  models:[
   {uid:'2bff1e25b797418caea81927f394fa9d',title:'Stalagnate within Vrlovka Cave — Highest LOD',creator:'Center for Geospatial Technologies (GAL)',license:'CC Attribution',method:'GeoSLAM mobile LiDAR survey',detail:'A highest-detail cave cross-section segment. The creator notes the complete cave is represented by a separate lower-detail model.',modelUrl:'https://sketchfab.com/3d-models/stalagnate-within-vrlovka-cave-highest-lod-2bff1e25b797418caea81927f394fa9d'}
  ]},
 {id:'hohlenstein-stadel',name:'Hohlenstein-Stadel Cave',type:'cave',coordinates:[10.1725,48.54917],
  locationPrecision:'Published archaeological cave-site coordinate. The scan is of the cave entrance, not a surveyed underground interior.',
  locationNote:'The point is the published Hohlenstein-Stadel cave location in the Swabian Jura, Germany.',
  description:'A photogrammetry scan of the real Hohlenstein-Stadel cave entrance in the Swabian Jura.',
  models:[
   {uid:'6b0765f8887a47e1b0a063a118293c83',title:'Hohlenstein-Stadel — Rocky cave entrance',creator:'Nature-témoin (@speleotv)',license:'CC Attribution',method:'27-photo photogrammetry · 3DF Zephyr',detail:'A photogrammetric record of the cave entrance below the mammoth-shaped rock.',modelUrl:'https://sketchfab.com/3d-models/rocky-cave-entrance-6b0765f8887a47e1b0a063a118293c83'}
  ]},
 {id:'treak-cliff-cavern',name:'Treak Cliff Cavern — Stalactites',type:'cave',coordinates:[-1.7972,53.3451],
  locationPrecision:'Approximate Treak Cliff Cavern entrance/site anchor near Castleton, Derbyshire. This photographic scan is an interior stalactite formation, not a surveyed georegistered cave passage.',
  locationNote:'The marker identifies Treak Cliff Cavern, not the measured underground position of this formation.',
  description:'A real image-based 3D photogrammetry scan of natural stalactites inside Treak Cliff Cavern in the Peak District, England.',
  models:[
   {uid:'a6183b4fd7364ed59518a276ad8ef8ec',title:'Treak Cliff Cavern — Natural Stalactite Formation',creator:'9of9 (@9of9)',license:'CC Attribution',method:'Phone-photo photogrammetry · RealityCapture',detail:'Textured 3D scan of natural limestone stalactites photographed during a guided cave visit. Coverage is partial, especially in low-light areas; this is not a complete cave model.',modelUrl:'https://sketchfab.com/3d-models/treak-cliff-cavern-stalactites-a6183b4fd7364ed59518a276ad8ef8ec'}
  ]},
 {id:'gruta-dos-palhares',name:'Gruta dos Palhares',type:'cave',coordinates:[-47.466659,-19.931757],
  locationPrecision:'Approximate published cave entrance/municipal park coordinate near Sacramento, Minas Gerais, Brazil; the source mesh is not certified as a survey-aligned subsurface model.',
  locationNote:'The map icon identifies Gruta dos Palhares at its public site coordinate, not a measured position for every surface in the scan.',
  description:'A textured photogrammetry 3D mesh of the real sandstone Gruta dos Palhares cave, a natural rock shelter in Sacramento, Minas Gerais, Brazil.',
  models:[
   {uid:'378b82695f934eafa01b397ba4d0ff83',title:'Gruta dos Palhares — Sandstone Cave Photogrammetry',creator:'Paulo Rodrigo Simões (@rollingdrone)',license:'CC Attribution',method:'Textured photo-based mesh · photogrammetry',detail:'Creator-published photogrammetry of the sandstone grotto and entrance hall, catalogued as Brazilian cave MG 299. The scan documents cave surfaces; its exact underground geometry and absolute dimensions are not independently validated for globe placement.',modelUrl:'https://sketchfab.com/3d-models/gruta-dos-palhares-sacramento-mg-378b82695f934eafa01b397ba4d0ff83'}
  ]},
 {id:'gruta-dos-sete-saloes',name:'Gruta dos Sete Salões',type:'cave',coordinates:[-41.377075,-19.276911],
  locationPrecision:'Approximate reported cave-site coordinates in Parque Estadual dos Sete Salões, Minas Gerais, Brazil. Public location records differ, and the photographed cave geometry is not survey-georeferenced.',
  locationNote:'The marker identifies the cave area in the state park, not a surveyed point within its underground chambers.',
  description:'A real textured, photo-reconstructed 3D scan of the quartzite Gruta dos Sete Salões in the protected Rio Doce region of Minas Gerais, Brazil.',
  models:[
   {uid:'d3a9e08821e84226876b426958691adf',title:'Gruta dos Sete Salões — Quartzite Cave Photogrammetry',creator:'Paulo Rodrigo Simões / Rolling Drone Geotecnologias (@rollingdrone)',license:'CC Attribution',method:'Photo-mesh photogrammetry · textured 3D reconstruction',detail:'An original photographic 3D record of a natural quartzite cave within Parque Estadual dos Sete Salões. The creator describes this as a cave scan; it is a partial photogrammetric record, not a complete metrically aligned underground survey. Source model: approximately 2.5 million triangles.',modelUrl:'https://sketchfab.com/3d-models/gruta-dos-sete-saloes-v1-d3a9e08821e84226876b426958691adf'}
  ]},
 {id:'jackson-blue-spring-cavern',name:'Jackson Blue Spring — Cavern and Chimney',type:'cave',coordinates:[-85.140083,30.790528],
  locationPrecision:'Florida Geological Survey site coordinate for Jackson Blue Spring vent at Merritts Mill Pond, near Marianna, Florida (30°47′25.9″ N, 85°08′24.3″ W). The scan itself is not independently survey-georeferenced.',
  locationNote:'The persistent map icon marks the documented spring vent, not the position or orientation of each submerged cave passage.',
  description:'A textured underwater 3D photogrammetry scan of the real Jackson Blue Spring cavern and descending chimney cave passage in Jackson County, Florida.',
  models:[
   {uid:'c0ecd1020c794a9a83771d7957517438',title:'Jackson Blue — Cavern and Down the Chimney',creator:'Matthew Hardman / Divers Atlas (@diversatlas)',license:'CC Attribution',method:'1,017 Insta360 photos · Agisoft Metashape photogrammetry · May 24, 2026',detail:'Detailed creator-published underwater photographic reconstruction of Jackson Blue Spring cavern and the chimney passage. Sketchfab lists approximately 6.3 million triangles. This is a photo-textured cave mesh, not a LiDAR point cloud or a georeferenced full-system cave survey. The 3D viewer is embedded within BridgePoint while the original model remains creator-hosted.',modelUrl:'https://sketchfab.com/3d-models/jackson-blue-cavern-and-down-the-chimney-c0ecd1020c794a9a83771d7957517438'}
  ]},
 {id:'ellora-caves-india',name:'Ellora Caves — Rock-Cut Cave Temples',type:'cave',coordinates:[75.17917,20.02639],
  locationPrecision:'Ministry of Culture, India, Ellora Caves UNESCO World Heritage site coordinates (20°01′35.004″ N, 75°10′45.012″ E). This is a complex-wide site anchor; individual carved caves and 3D mesh surfaces are not independently georegistered.',
  locationNote:'This icon locates the documented Ellora cave-temple complex, not a surveyed point for every chamber or the exact position of each part of this 3D scan.',
  description:'A photo-reconstructed 3D mesh of the real Ellora rock-cut cave-temple complex in Maharashtra, India, a UNESCO World Heritage Site carved into basalt cliffs.',
  models:[
   {uid:'1a5ec1e212f9451e80dc051e97164d17',title:'Ellora Caves, India — Rock-Cut Heritage Scan',creator:'Graphic solutions (@hermes3)',license:'CC Attribution',method:'Photo-based 3D reconstruction · photogrammetry · approx. 136,500 triangles',detail:'Creator-published photographic 3D reconstruction associated with the Ellora Caves archaeological site. Ellora has Buddhist, Hindu and Jain rock-cut monuments, including Cave 16 (Kailasa Temple). The model is not verified as a complete survey of all cave chambers or precisely aligned to the surrounding terrain; this is not a LiDAR point cloud.',modelUrl:'https://sketchfab.com/3d-models/ellora-caves-india-1a5ec1e212f9451e80dc051e97164d17'}
  ]},
 {id:'bethells-beach-sea-cave',name:'Bethells Beach — Sea Cave',type:'cave',coordinates:[174.44382,-36.89555],
  locationPrecision:'Approximate Te Henga / Bethells Beach site anchor from OpenStreetMap beach feature (36.89555° S, 174.44382° E). The source scan identifies a sea cave on this beach but does not publish a surveyed entrance coordinate or georeferenced mesh.',
  locationNote:'This icon marks the documented Bethells Beach coastal area, not the independently measured entrance of the particular cave or the position of each scanned wall.',
  description:'A textured photogrammetry 3D scan of a real sea cave at Te Henga / Bethells Beach near Auckland, New Zealand; one arm of the cave opens toward a forested area.',
  models:[
   {uid:'ce71dc2848984acfb11d8002a48a6043',title:'Sea Cave 3 — Te Henga / Bethells Beach Photogrammetry',creator:'b_nealie',license:'CC Attribution',method:'46-photo photogrammetry · 3DF Zephyr v4.353 · approx. 698,400 triangles',detail:'Creator-published photographic reconstruction of a natural coastal sea cave at Bethells Beach, Auckland, New Zealand. One cave arm leads toward vegetation; the source was created from 46 photographs. This is a textured photo mesh, not a LiDAR point cloud or a metrically aligned georeferenced cave survey. The BridgePoint card embeds the original creator-hosted viewer.',modelUrl:'https://sketchfab.com/3d-models/sea-cave-3-ce71dc2848984acfb11d8002a48a6043'},
{"uid":"3be79c6a956c423d9b05fa67ce559ee9","embedOnly":true,"title":"Sea Cave 2 — Te Henga Volcanic Sea Pillar","creator":"b_nealie","license":"CC Attribution","method":"3DF Zephyr v4.353 photo photogrammetry · 49 images · approximately 655,700 mesh triangles","detail":"An independent 49-photo capture of a real wave-cut sea cave at Bethells Beach, New Zealand. Ocean waves carved a distinct rock pillar at the cave mouth. This is separate from the existing Sea Cave 3 and is displayed in the same mapped site's BridgePoint in-card viewer.","modelUrl":"https://sketchfab.com/3d-models/sea-cave-2-3be79c6a956c423d9b05fa67ce559ee9"}
  ]},
 {id:'anchor-church-caves-derbyshire',name:'Anchor Church Caves — Derbyshire',type:'cave',coordinates:[-1.49750,52.84167],
  locationPrecision:'Approximate published Anchor Church cave-complex coordinate near Ingleby and Foremark, Derbyshire, England (52.84167° N, 1.49750° W). Model surfaces are not independently survey-georeferenced to this map point.',
  locationNote:'The persistent icon identifies the Anchor Church cave complex beside the former River Trent course, not a surveyed vertex of the photogrammetry mesh.',
  description:'A real textured photogrammetry reconstruction of the sandstone Anchor Church caves in Derbyshire. The caves originated through river erosion and were enlarged into interconnected rock-cut rooms.',
  models:[
   {uid:'c7125417f09e43229288316c8144e625',title:'Anchor Church Caves — Sandstone Chambers Photo Mesh',creator:'Shiro Morturn (@morturn) / Sudbury Digital Imaging',license:'CC Attribution',method:'122-image photogrammetry · RealityScan · approximately 1.3 million triangles',detail:'A creator-published merged 3D photographic reconstruction of the real Anchor Church cave complex, near Ingleby, Derbyshire. The River Trent eroded the sandstone, and people later extended and shaped the chambers, doors and windows. Model generated in RealityScan from 122 photographs. The creator-hosted textured mesh is not a LiDAR point cloud, nor a survey-aligned subterranean terrain asset; it is embedded in BridgePoint’s existing model viewer card.',modelUrl:'https://sketchfab.com/3d-models/anchor-church-caves-derbyshire-merged-c7125417f09e43229288316c8144e625'}
  ]},
 {id:'rock-house-ohio',name:'Rock House Cavern — Hocking Hills, Ohio',type:'cave',coordinates:[-82.61359,39.49755],
  locationPrecision:'Approximate Rock House Cave named-feature coordinate in Hocking Hills State Park, Ohio (39.49755° N, 82.61359° W). The Matterport tour is not an independently georeferenced raw underground mesh.',
  locationNote:'The large persistent icon identifies the documented Rock House cave site, not an exact position for each photographed wall or 3D tour scan station.',
  description:'A real interactive, photo-textured 3D digital twin of the 200-foot-long Rock House sandstone cave in Ohio, with natural window openings carved into Blackhand Sandstone.',
  models:[
   {uid:'matterport-rock-house-ohio-1BTGHi85s96',matterportTourId:'1BTGHi85s96',title:'Rock House — Hocking Hills 3D Cave Tour',creator:'Elements of Media (@elementsofmedia)',license:'Public publisher-hosted Matterport embed; original rights retained',method:'Matterport Pro3 · photo-textured spatial scan (depth sensing and imagery; not a point-cloud viewer)',detail:'The capture creator publicly shares this navigable Matterport 3D digital twin of Rock House in Hocking Hills State Park, Ohio. It shows the real sandstone cave, columns and window-like openings. Unlike the Sketchfab-only cave scans, this one uses a photo-textured Matterport tour, which may incorporate LiDAR-derived depth and camera imagery. It is not verified as a pure photogrammetry mesh or a downloadable/CC-licensed model. BridgePoint embeds the original creator-hosted viewer; no mesh bytes are copied or redistributed.',modelUrl:'https://my.matterport.com/show/?m=1BTGHi85s96'}
  ]},
 {id:'abukuma-cave-japan',name:'Abukuma Cave — Fukushima, Japan',type:'cave',coordinates:[140.67292,37.34417],
  locationPrecision:'OpenStreetMap Abukuma Cave entrance feature, Tamura, Fukushima, Japan (37.34417° N, 140.67292° E). The interior photographic scan is not georeferenced to this exact surface entrance coordinate.',
  locationNote:'The persistent cave marker identifies the Abukuma Cave entrance near Tamura, not the surveyed location of the chamber within the underground system.',
  description:'A real photo-textured 3D reconstruction of stalactite-rich limestone passages inside Abukuma Cave in Fukushima Prefecture, Japan.',
  models:[
   {uid:'cbe5a1c208674091b48f65ac2d4cca94',embedOnly:true,title:'Abukuma Cave #10–#12 — Interior Limestone Photo-Mesh',creator:'Fujihiko Matsumoto (@fujisan)',license:'Public creator-hosted Sketchfab embed · no reuse license displayed',method:'724 photographs · Nikon D750 · RealityCapture photogrammetry · 976,400 triangles',detail:'A creator-published photo-textured 3D scan of real Abukuma Cave interior formations, captured in March 2020 from 724 Nikon D750 photographs and processed with RealityCapture. The model covers selected cave sections #10–#12, not the complete underground system. This is genuine photo-based photogrammetry, not a LiDAR point cloud. No downloadable reuse license is displayed; BridgePoint only embeds the original creator-hosted viewer and does not copy or redistribute the mesh.',modelUrl:'https://sketchfab.com/3d-models/abukuma-cave-10-12-japan-cbe5a1c208674091b48f65ac2d4cca94'}
  ]},
 {id:'yungang-cave-18-china',name:'Yungang Cave 18 — Datong, China',type:'cave',coordinates:[113.12334,40.11019],
  locationPrecision:'OpenStreetMap mapped Yungang Cave 18 entrance (40.11019° N, 113.12334° E), Datong, Shanxi, China. The creator’s interior scan has not been independently registered to these entrance coordinates.',
  locationNote:'This icon identifies Cave 18 within the Yungang Grottoes UNESCO site, not a surveyed coordinate for each interior wall or sculpture.',
  description:'A true photogrammetry 3D scan of the interior of Yungang Cave 18, the fifth-century Buddhist rock-cut grotto known as the Cave of the Three Standing Buddhas in Shanxi, China.',
  models:[
   {uid:'be7675a23595489c86211608f0fb1886',embedOnly:true,title:'Yungang Cave 18 — Historic Buddha Grotto Photogrammetry',creator:'Di Luo 罗迪 (@dluo)',license:'Public creator-hosted Sketchfab embed · no reuse license displayed',method:'3D scan · Memento photogrammetry · approx. 301,300 triangles',detail:'A creator-published, photo-reconstructed textured 3D record of the interior of Yungang Cave 18, dated approximately 460–470 CE. This heritage grotto belongs to the UNESCO-listed Yungang cave temples at Datong, China. The mesh is a partial real-world scan, not a complete georeferenced cave system or a point-cloud LiDAR presentation. No downloadable reuse license is displayed; BridgePoint only embeds the original 3D viewer, with no download or redistribution of source assets.',modelUrl:'https://sketchfab.com/3d-models/yungang-cave-18-be7675a23595489c86211608f0fb1886'}
  ]},
 {id:'pyramid-of-unas-egypt',name:'Pyramid of Unas — Burial Chambers, Egypt',type:'tomb',coordinates:[31.21494,29.86819],
  locationPrecision:'Mapped Pyramid of Unas site coordinate from OpenStreetMap via Mapcarta at Saqqara, Egypt (29.86819° N, 31.21494° E). The 3D reconstruction documents interior chambers but is not individually survey-georeferenced to this site anchor.',
  locationNote:'The large persistent gold tomb icon marks the actual Pyramid of Unas in the Saqqara necropolis, not the independently surveyed position of each scanned chamber or text.',
  description:'Real photograph-based 3D reconstruction of burial chambers inside the ancient Pyramid of King Unas at Saqqara, Egypt, among the earliest pyramids to contain the inscribed Pyramid Texts.',
  models:[
   {uid:'ccfc7c2f43214b559e93c4857eb6ed4a',embedOnly:true,title:'King Unas Pyramid — Genuine Interior Chamber Photogrammetry',creator:'D. Anderson (@danderson4)',license:'Public creator-hosted Sketchfab embed · no reuse license displayed',method:'260-photo photogrammetry · Canon EOS Rebel T7i · Agisoft Metashape 1.6.1 · Blender mesh repairs',detail:'Original creator-published photographic 3D reconstruction of underground chambers inside the real Pyramid of Unas at Saqqara. The model was built using 260 photographs under difficult interior lighting; parts of its geometry were repaired or remeshed in Blender. The chamber walls are historically significant for their Pyramid Texts. This is a partial photo-based chamber scan, not a made-up CGI pyramid, a LiDAR point cloud or a georeferenced full-exterior pyramid survey. BridgePoint embeds the original creator-hosted 3D viewer only and does not copy the source 3D mesh.',modelUrl:'https://sketchfab.com/3d-models/chambers-in-the-pyramid-of-king-unas-saqqara-ccfc7c2f43214b559e93c4857eb6ed4a'}
  ]},
 {id:'lima-lima-cave-antarctica',name:'Lima-Lima Cave — Livingston Island, Antarctica',type:'cave',coordinates:[-61.0369667,-62.61545],
  locationPrecision:'Published Lima Lima 1 Cave coordinates from Antarctic Treaty Secretariat, Byers Peninsula ASPA 126 Management Plan (2022), Table 1: 62°36′55.62″S, 61°02′13.08″W. Approximate mapped cave-entrance anchor; the displayed research model does not provide an independently georeferenced mesh alignment to the globe.',
  locationNote:'The large persistent icon marks the actual documented Lima-Lima Cave archaeological site at Lair Point, Byers Peninsula, Livingston Island, Antarctica. It is a protected heritage site; these coordinates are for virtual viewing only.',
  description:'A real Antarctic coastal rock cave on Livingston Island, once used by nineteenth-century sealers and whalers. See the research team’s solid 3D surface model of its excavated chambers.',
  models:[
   {uid:'899e6c8016954dab825dffb07d583fb9',embedOnly:true,title:'Lima-Lima Cave — Excavated Chamber 3D Surface Mesh',creator:'LEACH–UFMG (@leach.ufmg) / White Landscapes Project; Alex Martire',license:'Public creator-hosted Sketchfab embed · no reuse license displayed',method:'Leica ScanStation P20 terrestrial laser capture → Agisoft Metashape 1.8.3 surface mesh · approx. 2,000,000 triangles (solid polygon geometry, not a point-cloud display; NOT photo-based photogrammetry)',detail:'A genuine 3D polygon-surface reconstruction of Lima-Lima Cave following archaeological excavation on Livingston Island, Antarctica. Researchers captured a Leica P20 laser survey and converted it into a solid approximately two-million-triangle polygon mesh using Agisoft Metashape 1.8.3, published through the White Landscapes project. This cave was used by 19th-century Antarctic sealers and whalers. It is not a camera-photogrammetry scan, a simulated ice cave, or a LiDAR point-cloud viewer. The original mesh remains hosted by the research team on Sketchfab; BridgePoint embeds its public viewer and does not download, relicense or claim the source scan.',modelUrl:'https://sketchfab.com/3d-models/lima-lima-cave-post-excavation-899e6c8016954dab825dffb07d583fb9'}
  ]},
 {id:'elands-bay-cave-south-africa',name:'Elands Bay Cave — South Africa',type:'cave',coordinates:[18.31766,-32.31779],
  locationPrecision:'OpenStreetMap Elands Bay Cave entrance node 10614878708 (32.31779° S, 18.31766° E), on Baboon Point, Western Cape, South Africa. This map location identifies the real cave site, not the independently survey-registered position of every mesh triangle.',
  locationNote:'The persistent large Cave icon marks the actual archaeological Elands Bay Cave entrance near Verlorenvlei; the original photographic mesh is not independently georeferenced to the globe.',
  description:'A real coastal sandstone cave and rock-art shelter above Elands Bay in South Africa, digitally captured with photographs and laser scanning. Explore its textured chamber and ancient San and Khoe rock-art setting.',
  models:[
   {uid:'d0c88d0853844a8e9a1de22a342326cb',embedOnly:true,title:'Elands Bay Cave — Real Textured Rock-Art Shelter 3D Scan',creator:'The Rock Art Portal (@Rock_Art_Portal)',license:'Public creator-hosted Sketchfab embed · no reuse license displayed',method:'Approx. 250 DSLR photographs + 1,500 drone photographs + 3 laser scans · RealityCapture, Blender and MeshLab · approx. 408,500 triangles',detail:'Creator-published 3D surface reconstruction of the real Elands Bay Cave near the Atlantic coast in the Western Cape, South Africa. The cave has ancient rock art, including depictions of eland and handprints, and archaeological traces of human occupation. The source model combines roughly 1,750 photographs with three laser scans and is displayed as a textured polygon surface, not a raw point-cloud viewer. It is therefore not exclusively photo-based photogrammetry. The source displays a NoAI usage restriction and no transferable model reuse license; BridgePoint embeds the original Sketchfab interactive viewer inside its existing Cave card without copying, training on, relicensing or redistributing any 3D assets.',modelUrl:'https://sketchfab.com/3d-models/elands-bay-cave-d0c88d0853844a8e9a1de22a342326cb'}
  ]},
 {id:'leidarendi-lava-cave-iceland',name:'Leiðarendi Lava Cave — Iceland',type:'cave',coordinates:[-21.84298,63.98462],
  locationPrecision:'Mapped Leiðarendi cave entrance in Iceland, OpenStreetMap node 451798297 (63.98462° N, 21.84298° W). No independently georeferenced alignment of the published 3D scan to the entrance is claimed.',
  locationNote:'Persistent Cave marker uses the publicly mapped lava-tube entrance, not a survey of the embedded model’s interior geometry.',
  description:'A real volcanic lava-tube cave southwest of Reykjavík, Iceland, digitally scanned by the University of Hamburg geology team.',
  models:[
   {uid:'34861aec56564489bdb8ec1cd030ff00',embedOnly:true,title:'Leiðarendi Lava Cave — Genuine 3D Capture',creator:'Institut für Geologie, Universität Hamburg (@IfG-UHH); J. O. Eisermann',license:'Public creator-hosted Sketchfab embed · no reuse license displayed; NoAI',method:'iPhone 12 Pro 3D capture · approximately 247,200 solid mesh triangles · underlying photo-versus-depth method unspecified',detail:'The University of Hamburg geology group published this real 3D surface capture of Leiðarendi Lava Cave in southwest Iceland using an iPhone 12 Pro. It displays approximately 247,200 triangles, not an empty marker or a raw point-cloud-only viewer. The source does not say whether imagery alone or additional phone depth data produced the mesh, so BridgePoint does not represent it as verified pure photogrammetry. Creator-hosted 3D viewer only, original rights retained, source marked NoAI.',modelUrl:'https://sketchfab.com/3d-models/leiarendi-lava-cave-iceland-34861aec56564489bdb8ec1cd030ff00'}
  ]},
 {id:'masaya-bat-cave-nicaragua',name:'Masaya Volcano Bat Cave — Nicaragua',type:'cave',coordinates:[-86.1688,11.9844],
  locationPrecision:'Masaya volcano complex regional anchor (11.9844° N, 86.1688° W) published by the Smithsonian Global Volcanism Program. The actual Tzinancostoc / Bat Cave lava-tube entrance is reported south of Santiago crater; its exact coordinates and scan georegistration are not published on the model source.',
  locationNote:'The large persistent marker identifies Masaya volcanic complex, not the exact opening of the documented 225-meter lava tube.',
  description:'A real 225-meter volcanic bat-cave lava tube at Masaya Volcano in Nicaragua, recreated from 1,001 cave photographs.',
  models:[
   {uid:'239d912831f6471da95a2fd672b53398',embedOnly:true,title:'Masaya Volcano Bat Cave — 1,001-Photo Lava Tube',creator:'Cliff Gill (@flightfollowing)',license:'Public creator-hosted Sketchfab embed · no reuse license displayed',method:'1,001 digital photos · Agisoft PhotoScan photogrammetry · approx. 10,000 triangles · 225-meter documented cave',detail:'The photographer and mapper Cliff Gill created this interactive model of a real 225-meter-long bat cave at Nicaragua’s Masaya Volcano from 1,001 photographs taken underground, using photogrammetry and a compass/tape cave survey. This is a relatively low-polygon scan (about 10,000 triangles), not an invented cave, raw LiDAR point cloud, or georegistered underground terrain tile. It stays in the BridgePoint card using the creator-hosted viewer.',modelUrl:'https://sketchfab.com/3d-models/masaya-volcano-nicaragua-bat-cave-lava-tube-239d912831f6471da95a2fd672b53398'}
  ]},
 {id:'cueva-de-las-manos-argentina',name:'Cueva de las Manos — Argentine Patagonia',type:'cave',coordinates:[-70.66667,-47.15833],
  locationPrecision:'Argentine National Institute of Anthropology mapped archaeological site anchor at 47°09′30″ S, 70°40′00″ W (47.15833° S, 70.66667° W). This identifies the Cueva de las Manos heritage-site area in the Río Pinturas canyon; interior photo mesh is not separately georeferenced.',
  locationNote:'Large persistent Cave marker identifies the UNESCO-inscribed prehistoric handprint rock-art site; not a registered geospatial position for each scan triangle.',
  description:'A true high-detail photograph-based 3D reconstruction of Cueva de las Manos, the celebrated Patagonian cave with prehistoric painted hand stencils.',
  models:[
   {uid:'74b4a560749743eaa53cd89793b4a629',embedOnly:true,title:'Cueva de las Manos — 2M-Triangle Rock Art Photogrammetry',creator:'guigus60',license:'Public creator-hosted Sketchfab embed · no reuse license displayed; NoAI',method:'Agisoft PhotoScan photogrammetry · approximately 2,000,000 textured triangles',detail:'A real photographic 3D reconstruction of the Cueva de las Manos cave and ancient painted hand silhouettes in Argentina’s Río Pinturas canyon, prepared with Agisoft PhotoScan and manually refined tie points. The original Sketchfab scan has about two million mesh triangles and is tagged NoAI. UNESCO identifies the cave complex for its exceptionally preserved painted handprints and hunting scenes. The 3D assets are not copied, converted or relicensed by BridgePoint.',modelUrl:'https://sketchfab.com/3d-models/argentina-cueva-de-los-manos-74b4a560749743eaa53cd89793b4a629'}
  ]},
 {id:'kelkaya-sinkhole-turkey',name:'Kelkaya Sinkhole — Denizli, Türkiye',type:'cave',coordinates:[29.41611,37.74667],
  locationPrecision:'Regional marker at Honaz town in Denizli Province, Türkiye (approx. 37.74667° N, 29.41611° E; GeoNames). The creator locates Kelkaya sinkhole near Honaz and a travertine quarry but does NOT publish the actual sinkhole entrance coordinate. The town marker must not be interpreted as the cave entrance.',
  locationNote:'A visible regional anchor for the published Kelkaya cave 3D model; exact cave entrance and mesh orientation have not been independently located.',
  description:'A real karst sinkhole cave near Honaz in western Türkiye, with striking stalactites and mineral-rich limestone formations.',
  models:[
   {uid:'cd6c5687814e484da0bf4d360a324c60',embedOnly:true,title:'Kelkaya Sinkhole — 2.4M-Triangle Karst Cave Mesh',creator:'3BATS (@3bats)',license:'CC Attribution',method:'Published textured 3D solid polygon model · approximately 2,400,000 triangles; source capture technique not documented',detail:'This publicly shared 3D model depicts Kelkaya Sinkhole close to a travertine quarry near Honaz, Denizli Province, Türkiye, with extensive stalactite mineral deposits. The model has approximately 2.4 million real polygon triangles and displays a CC Attribution license on Sketchfab. Because the creator does not identify the capture technique, BridgePoint describes it as a source-published textured 3D mesh rather than claiming a verified specific camera or laser method. The actual sinkhole entrance was not confirmed; the map icon uses the regional Honaz marker.',modelUrl:'https://sketchfab.com/3d-models/kelkaya-sinkhole-cd6c5687814e484da0bf4d360a324c60'}
  ]},
 {id:'weld-range-rock-shelter-australia',name:'Weld Range Rock Shelter — Western Australia',type:'cave',coordinates:[117.61801,-26.95327],
  locationPrecision:'Regional Weld Range landmark position (-26.95327° S, 117.61801° E) documented by ExplorOz; NOT the exact position of the culturally significant Wajarri rock-art shelter. The original 3D creator does not publish survey coordinates for this model.',
  locationNote:'The marker identifies the larger Weld Range region only; avoid interpreting it as a precise cultural heritage site coordinate.',
  description:'A real Aboriginal rock-art shelter in the remote Weld Range of Western Australia, documented as a high-detail photographic 3D model in collaboration with Wajarri Traditional Owners.',
  models:[
   {uid:'2989d29a52a0494aa0cd2e279b411247',embedOnly:true,title:'Weld Range Cave — Australian Rock-Art Photo-Mesh',creator:'Paul Bourke (@pbourke), University of Western Australia / Weld Range Web of Knowledge',license:'Public creator-hosted Sketchfab embed · no reuse license displayed; NoAI',method:'Photogrammetric rock-shelter reconstruction from field photographs · approx. 985,800 textured triangles',detail:'A genuine high-detail photogrammetric model of a Weld Range Aboriginal rock shelter in Western Australia. Paul Bourke developed 3D reconstructions for the Weld Range Web of Knowledge archaeological collaboration with Wajarri Traditional Owners; the Sketchfab model contains approximately 985,800 triangles and carries a NoAI restriction. The precise rock-art shelter location is not published in the model metadata and is intentionally represented by a regional Weld Range marker, not an invented exact site point. BridgePoint displays the original embedded viewer with creator and heritage attribution without redistributing source imagery or mesh geometry.',modelUrl:'https://sketchfab.com/3d-models/weld-range-cave-2989d29a52a0494aa0cd2e279b411247'}
  ]},

 {id:'wells-gray-sarlaccs-pit-canada',name:'Wells Gray / Sarlacc’s Pit — Canadian Deep Shaft',type:'cave',coordinates:[-120,52.33306],
  locationPrecision:'Regional Wells Gray Provincial Park center, British Columbia Geographical Names (52°19′59″N 120°00′00″W). This does NOT identify the remote closed cave entrance or georeference the scan; public access is restricted.',
  locationNote:'A regional protected park marker, NOT the precise entrance of the remote vertical cave.',
  description:'A giant remote Canadian limestone shaft with a photographed 3D reconstruction of its enormous opening, rather than an invented view of unexplored passages.',
  models:[{uid:'df5dea76480f4ed3af018d885a13b704',embedOnly:true,title:'Wells Gray — Aerial Photogrammetry of Giant Cave Opening',creator:'iamchris1134',license:'Public creator-hosted Sketchfab embed · no reuse license displayed',method:'Agisoft PhotoScan photogrammetry from aerial-video stills · 134,900 polygon triangles',detail:'Authentic photo-derived 3D surface of the opening of Sarlacc’s Pit discovered in Wells Gray Provincial Park in 2018. Its opening is described as 100 m long, 60 m wide and over 120 m down the high side; at least 180 m of cave depth has been estimated but not confirmed by the model. This scan ONLY reconstructs the exposed entrance, not the deep unexplored cave interior. Its marker uses the official park center, not the protected cave location.',modelUrl:'https://sketchfab.com/3d-models/wells-gray-cave-british-columbia-canada-df5dea76480f4ed3af018d885a13b704'}]},
 {id:'gorner-glacier-g6-moulin-switzerland',name:'Gorner Glacier G6 — Deep Swiss Ice Moulin',type:'cave',coordinates:[7.81528,45.94750],
  locationPrecision:'Approximate Gorner/Grenz glacier area reference in Valais, Switzerland; NOT the surveyed location of the October 2014 G6 moulin. Glacial entrance locations and shapes change over time.',
  locationNote:'Approximate Swiss glacier region, not a currently fixed or accessible ice-cave entrance.',
  description:'An expedition scan of a real near-vertical meltwater moulin reaching into the ice of the remote Gorner Glacier.',
  models:[{uid:'5dc79d2891f24e9fa571b9e910556ec8',embedOnly:true,title:'Gorner Glacier — G6 Moulin Photogrammetric 3D Surface',creator:'VIGEA — Virtual Geographic Agency (@vigea)',license:'Public creator-hosted Sketchfab embed · no reuse license displayed',method:'Photogrammetry-tagged expedition 3D solid surface · 1,100,000 triangles · recorded October 2014',detail:'A real high-resolution solid-mesh 3D record of the deep G6 moulin on the Gorner Glacier near Zermatt, documented during the 2014 International Glacier-Caving Camp. This is not a LiDAR point-cloud viewer. The original source does not give a verified vertical scan depth; BridgePoint does not infer one or treat this historical moving-ice passage as an unchanged present-day tunnel.',modelUrl:'https://sketchfab.com/3d-models/ice-cave-inside-the-gorner-glacier-5dc79d2891f24e9fa571b9e910556ec8'}]},
 {id:'bel-torrente-underwater-cave-sardinia',name:'Bel Torrente — Remote Sardinian Underwater Cave',type:'cave',coordinates:[9.6348,40.1794],
  locationPrecision:'Cala Sisine coastal regional anchor at 40.1794° N, 9.6348° E (Sardinian government shoreline data). The actual Bel Torrente submerged entrance lies north of Cala Sisine; these are NOT its precisely surveyed entrance coordinates.',
  locationNote:'Regional Mediterranean coastline marker, not the georegistered position of the underwater chamber.',
  description:'A remote Sardinian cave-diving system that extends inland from the Mediterranean seabed, captured in genuine underwater photogrammetry.',
  models:[{uid:'2f06ab8d1bd14ce5a85c417fefd91cda',embedOnly:true,title:'Bel Torrente — Underwater Cave Entrance-Floor Photo-Mesh',creator:'Bifrost Production (@bifrost_production) / Phreatic / Base1',license:'Public creator-hosted Sketchfab embed · no reuse license displayed',method:'Underwater photogrammetry · Agisoft Metashape · 694,500 solid textured triangles',detail:'A real photogrammetric scan of the ENTRANCE FLOOR of Grotta del Bel Torrente in the Gulf of Orosei, Sardinia, undertaken by the Phreatic project with Base1. Cave biology literature describes an extensive underwater system over 2.5 km long, but the creator’s particular 3D photo-mesh depicts only the entrance floor, not a full 2.5 km tunnel model. No raw point cloud or unlicensed hosted mesh is substituted.',modelUrl:'https://sketchfab.com/3d-models/bel-torrente-entrance-part-2-2f06ab8d1bd14ce5a85c417fefd91cda'},
{"uid":"e36a8a863b8348159d237ea808d492d7","embedOnly":true,"title":"Bel Torrente — Submerged Giant Stalactite Photo-Mesh","creator":"Bifrost Production / Phreatic / Base1","license":"Public creator-hosted Sketchfab embed · no reuse license displayed","method":"Underwater Agisoft Metashape photogrammetry, approximately 1.7 million solid triangles","detail":"A real photographed large stalactite inside the Bel Torrente underwater cave, Sardinia; a different mesh from the existing entrance-floor scan, not a raw LiDAR point viewer.","modelUrl":"https://sketchfab.com/3d-models/stalactite-in-bel-torrente-e36a8a863b8348159d237ea808d492d7"},
 {id:'sipadan-turtle-tomb-malaysia',name:'Sipadan Turtle Tomb — Borneo Underwater Cavern',type:'cave',coordinates:[118.627411,4.116292],
  locationPrecision:'Sipadan Island regional anchor, Sabah, Malaysia (4.116292° N, 118.627411° E). The submerged cave opens on the limestone wall of Sipadan; this does NOT specify the underwater chamber entrance or surveyed location of the photo mesh.',
  locationNote:'Island reference, not a dive-entry coordinate or underwater alignment of the actual scan.',
  description:'A striking and dangerous submerged cave complex inside Sipadan Island, with photogrammetry of part of the Turtle Tomb passage.',
  models:[{uid:'85a2ff52fa7b4a44b87033145fd1b01f',embedOnly:true,title:'Turtle Tomb — 900-Photo Underwater Cave Segment',creator:'Maxime Cheminade (@maximecheminade)',license:'Public creator-hosted Sketchfab embed · no reuse license displayed',method:'Underwater photogrammetry from 900 RAW photographs · 1,600,000 textured polygon triangles',detail:'Genuine underwater photographic reconstruction by Maxime Cheminade of the Triangle Section of the Turtle Tomb cave beyond Turtle Cavern. The 900 source RAW images produced a substantial solid polygon photo-mesh, NOT a LiDAR point cloud. The cave floor is described as roughly 8 m wide and includes turtle remains. The model covers only ONE SECTION of the submerged cave system, not an entire surveyed underwater network.',modelUrl:'https://sketchfab.com/3d-models/sipadan-turtle-tomb-triangle-section-85a2ff52fa7b4a44b87033145fd1b01f'}]},
 {id:'wonderwerk-cave-south-africa',name:'Wonderwerk Cave — Ancient Kalahari Chamber',type:'cave',coordinates:[23.55398,-27.84647],
  locationPrecision:'Actual mapped Wonderwerk Cave entrance at 27.84647° S, 23.55398° E, OpenStreetMap cave node 1388709831, Northern Cape, South Africa. The mesh is an independently reconstructed excavation area, not survey-registered to individual world coordinates.',
  locationNote:'Known cave entrance, not a complete georeferenced subterranean layout.',
  description:'Explore an extraordinary textured excavation area inside a remote South African cave containing some of humanity’s earliest traces of fire.',
  models:[{uid:'7161373c7ccb48da9aa00e52214df1b8',embedOnly:true,title:'Wonderwerk Cave — Excavation 1 Solid Textured 3D Scan',creator:'Zamani Project / University of Cape Town (@zamaniproject)',license:'Public creator-hosted Sketchfab embed · no reuse license displayed',method:'Real textured polygon mesh · 1,900,000 triangles · related survey used laser scanning; NOT a raw LiDAR point-cloud viewer',detail:'The Zamani Project created a real textured polygon reconstruction of the front section of Wonderwerk Cave. The creator specifies that ceilings and walls were removed from this model to reveal excavation area 1. Related research describes laser-based capture, so this is NOT claimed to be exclusively camera photogrammetry, though it is a solid textured surface mesh. The cave extends about 140 m underground, but the source model ONLY covers its front excavation area.',modelUrl:'https://sketchfab.com/3d-models/wonderwerk-cave-south-africa-excavation-area-1-7161373c7ccb48da9aa00e52214df1b8'}]},
{"id":"muriwai-sea-cave-nz","name":"Muriwai Sea Cave — New Zealand","type":"cave","coordinates":[174.433754,-36.824573],"locationPrecision":"Muriwai Beach regional coordinate, not the exact photographed sea-cave opening.","locationNote":"Approximate site/region anchor; model is not georegistered into globe terrain.","description":"Pacific coastal cave entrance with purple tidal growth.","models":[{"uid":"11aedb4bc1064685a8cfe33f8956a108","embedOnly":true,"title":"Muriwai Sea Cave — New Zealand — Genuine 3D scan","creator":"b_nealie","license":"Public creator-hosted Sketchfab embed · no reuse license displayed","method":"3DF Zephyr photogrammetry: 331 images, approximately 399,400 mesh triangles","detail":"331-photo source-published photogrammetric surface of a real Muriwai sea cave entrance. Dark sandy portions are incompletely reconstructed; the source does not contain hidden passages.","modelUrl":"https://sketchfab.com/3d-models/sea-cave-at-muriwai-11aedb4bc1064685a8cfe33f8956a108"}]},
{"id":"rothesay-sea-cave-nz","name":"Rothesay Bay Sea Cave — New Zealand","type":"cave","coordinates":[174.74064,-36.72602],"locationPrecision":"Rothesay Bay Auckland regional shoreline anchor, not a cave-opening GPS fix.","locationNote":"Approximate site/region anchor; model is not georegistered into globe terrain.","description":"Sandstone cave eroded by Pacific coastal waves.","models":[{"uid":"14773139954740e48be1fa1861d01eb7","embedOnly":true,"title":"Rothesay Bay Sea Cave — New Zealand — Genuine 3D scan","creator":"b_nealie","license":"Public creator-hosted Sketchfab embed · no reuse license displayed","method":"3DF Zephyr photogrammetry: 50 photographs, approximately 306,700 triangles","detail":"Actual 50-photo textured mesh of a sandstone sea cave at Rothesay Bay, New Zealand. This scan shows the visible cave walls, not an invented deeper tunnel.","modelUrl":"https://sketchfab.com/3d-models/sea-cave-14773139954740e48be1fa1861d01eb7"}]},
{"id":"john-millar-blue-hole-bahamas","name":"John Millar’s Blue Hole — Bahamas","type":"cave","coordinates":[-76.15,25.17],"locationPrecision":"Eleuthera offshore region marker; no precise blue-hole entrance coordinates are published by the source.","locationNote":"Approximate site/region anchor; model is not georegistered into globe terrain.","description":"Four-million-triangle underwater blue-hole research model.","models":[{"uid":"d1691e402d0840378804f2df5aaedb2b","embedOnly":true,"title":"John Millar’s Blue Hole — Bahamas — Genuine 3D scan","creator":"Perry Institute for Marine Science / Middlebury College","license":"Public creator-hosted Sketchfab embed · no reuse license displayed","method":"Underwater marine research photogrammetry: approximately 4,000,000 triangles (January 2020)","detail":"Authentic marine-science scan of John Millar's Blue Hole dive site off Eleuthera Island, Bahamas. This is a real textured blue-hole surface, not a model of unseen abyssal passages.","modelUrl":"https://sketchfab.com/3d-models/john-millars-blue-hole-d1691e402d0840378804f2df5aaedb2b"}]},
{"id":"villefranche-marine-cave-france","name":"Villefranche Submarine Cave — France","type":"cave","coordinates":[7.3106,43.6964],"locationPrecision":"Regional Bay of Villefranche-sur-Mer marker; published model lacks exact underwater entrance georeferencing.","locationNote":"Approximate site/region anchor; model is not georegistered into globe terrain.","description":"Mediterranean submarine cavern scanned as solid 3D geometry.","models":[{"uid":"a35b2ecd72094b2d8a2fef9a32b98186","embedOnly":true,"title":"Villefranche Submarine Cave — France — Genuine 3D scan","creator":"Davide Ferraris","license":"Public creator-hosted Sketchfab embed · no reuse license displayed","method":"Creator-published real underwater cave polygon surface, approximately 1,000,000 triangles; capture technique unspecified","detail":"Creator describes a cave in Villefranche-sur-Mer bay, France. The 3D surface mesh is real and not a raw point cloud. Photo-only method and exact survey-grade location are NOT verified.","modelUrl":"https://sketchfab.com/3d-models/sparse-cave-of-villefranche-sur-mer-a35b2ecd72094b2d8a2fef9a32b98186"}]},
{"id":"hilbre-shore-cave-uk","name":"Hilbre Island Coastal Cave — England","type":"cave","coordinates":[-3.229,53.382],"locationPrecision":"Approximate Hilbre/Middle Eye shore region, not a surveyed entrance coordinate.","locationNote":"Approximate site/region anchor; model is not georegistered into globe terrain.","description":"Tidal sea cave photographed from coastal video.","models":[{"uid":"b9aac38260054f5f8858be684279c37e","embedOnly":true,"title":"Hilbre Island Coastal Cave — England — Genuine 3D scan","creator":"megalitharchive","license":"Public creator-hosted Sketchfab embed · no reuse license displayed","method":"Agisoft Metashape photogrammetry from an eleven-minute 1080p video","detail":"Real wave-cut coastal cave on Middle Eye in the Hilbre Islands of northwest England, reconstructed from source video as textured surface geometry.","modelUrl":"https://sketchfab.com/3d-models/hilbre-cave-b9aac38260054f5f8858be684279c37e"}]},
{"id":"middle-eye-sandstone-cave-uk","name":"Middle Eye Sandstone Sea Cave — England","type":"cave","coordinates":[-3.227,53.381],"locationPrecision":"Approximate Middle Eye shore reference, with separate regional marker for a distinct scanned cave; not surveyed exact GPS.","locationNote":"Approximate site/region anchor; model is not georegistered into globe terrain.","description":"Shallow reddish sandstone sea-cave span by the tidal Dee estuary.","models":[{"uid":"e2420bd47de1497993addd2b3f6e1e7e","embedOnly":true,"title":"Middle Eye Sandstone Sea Cave — England — Genuine 3D scan","creator":"megalitharchive","license":"CC Attribution","method":"Photo-textured solid mesh, approximately 1,500,000 triangles","detail":"Real source-published Middle Eye sandstone cave overhang surrounded by seaweed. A visible marine erosion feature, not an invented deep cave network.","modelUrl":"https://sketchfab.com/3d-models/middle-eye-cave-e2420bd47de1497993addd2b3f6e1e7e"}]},
{"id":"algarve-coastal-cave-portugal","name":"Algarve Coastal Cave — Portugal","type":"cave","coordinates":[-8.47,37.09],"locationPrecision":"Regional coastal Algarve point near Lagoa, NOT creator-published exact entrance coordinates.","locationNote":"Approximate site/region anchor; model is not georegistered into globe terrain.","description":"Photographic scan of cave rock along the Atlantic Algarve coast.","models":[{"uid":"a8890e16ca49498c892d82496cdbbae9","embedOnly":true,"title":"Algarve Coastal Cave — Portugal — Genuine 3D scan","creator":"Andrea Cavallaro","license":"Public creator-hosted Sketchfab embed · no reuse license displayed; NoAI","method":"RealityScan Mobile photo-based photogrammetry, approximately 1,000,000 polygons","detail":"A genuine Algarve cave mesh tagged cave, sandstone and photoscan. The creator's NoAI restriction is preserved and the exact cave position remains unknown.","modelUrl":"https://sketchfab.com/3d-models/portugal-algarve-cave-a8890e16ca49498c892d82496cdbbae9"}]},
{"id":"marseille-30m-cave-entrance-france","name":"Marseille Marine Cave — 30 m Research Site","type":"cave","coordinates":[5.34,43.24],"locationPrecision":"Marseille coastal region marker, NOT exact submerged entrance/dive coordinates.","locationNote":"Approximate site/region anchor; model is not georegistered into globe terrain.","description":"Photogrammetry scan of underwater cave entrance research site at about 30 m depth.","models":[{"uid":"bf983bfabc194e94893d9955ed87f471","embedOnly":true,"title":"Marseille Marine Cave — 30 m Research Site — Genuine 3D scan","creator":"Septentrion Environnement / Aix-Marseille University LIS CNRS","license":"CC Attribution","method":"Underwater research photogrammetry: approximately 9,600,000 triangles, depth around 30 m","detail":"Real source-published underwater photograph-based 3D model showing a small historic ecological quadrat within a cave entrance around 30 m below sea level. Not a scan of the entire cave.","modelUrl":"https://sketchfab.com/3d-models/jean-georges-harmelins-quadrat-bf983bfabc194e94893d9955ed87f471"}]},
 {id:'om-jaettestue',name:'Øm Jættestue Passage Tomb',type:'tomb',coordinates:[11.994633,55.599731],
  locationPrecision:'Published GPS coordinate for the passage tomb site.',
  locationNote:'This is a Neolithic passage tomb and burial chamber, not a natural cave.',
  description:'A photogrammetric scan of the megalithic passage grave at Øm near Lejre, Denmark.',
  models:[
   {uid:'fe5da7d5202a4bfaa6b48e0096d4c6fd',title:'Passage Grave — Øm Jættestue, Denmark',creator:'Azad Balabanian (@azadbal)',license:'CC Attribution',method:'610-image photogrammetry · RealityCapture',detail:'A scan of the passage and chamber of a Neolithic megalithic tomb.',modelUrl:'https://sketchfab.com/3d-models/passage-grave-m-jttestue-denmark-fe5da7d5202a4bfaa6b48e0096d4c6fd'}
  ]}
];

export const UNDERGROUND_SCAN_RIGHTS_HOLDS=[
 {title:'Ice cave — Lester paints the world',reason:'Displayed license: CC Attribution-NonCommercial-ShareAlike. Excluded from BridgePoint commercial display until separate permission is obtained.',sourceUrl:'https://sketchfab.com/3d-models/ice-cave-lester-paints-the-world-76c1a32650da44fea7b11315cc30a02f'},
 {title:'Tomb of San Gennaro and Mosaics',reason:'Displayed license: CC Attribution-NonCommercial. Excluded from BridgePoint commercial display until separate permission is obtained.',sourceUrl:'https://sketchfab.com/3d-models/tomb-of-san-gennaro-and-mosaics-8ed34da0eaf6434c913b3dd417652efd'},
 {title:'Carlsbad Caverns scan candidate',reason:'No individually verified openly licensed Sketchfab scan with a defensible geographic anchor was confirmed for this first release. No marker or placeholder is fabricated.'}
];

export function buildUndergroundSiteFeatures(sites=UNDERGROUND_SCAN_SITES){
 return (Array.isArray(sites)?sites:[]).filter(s=>s&&typeof s.id==='string'&&Array.isArray(s.coordinates)&&Number.isFinite(Number(s.coordinates[0]))&&Number.isFinite(Number(s.coordinates[1]))&&Math.abs(Number(s.coordinates[0]))<=180&&Math.abs(Number(s.coordinates[1]))<=85&&Array.isArray(s.models)&&s.models.length>0).map(s=>({
  type:'Feature',id:s.id,geometry:{type:'Point',coordinates:[Number(s.coordinates[0]),Number(s.coordinates[1])]},
  properties:{siteId:s.id,name:s.name,type:s.type,iconImage:'bp-underground-site-icon-'+s.type+'-v1',modelCount:s.models.length,locationPrecision:s.locationPrecision}
 }));
}
function safe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function embedUrl(uid){return 'https://sketchfab.com/models/'+encodeURIComponent(uid)+'/embed?autostart=1&preload=1&ui_theme=dark&dnt=1';}
function modelByUid(site,uid){return (site.models||[]).find(m=>m.uid===uid)||site.models[0]||null;}
// Only the Ohio publisher's documented Matterport 3D showcase uses the alternate viewer.
// Existing Sketchfab embeds remain byte-for-byte identical.
function modelViewerUrl(model){
 if(model?.matterportTourId&&/^[A-Za-z0-9]{11}$/.test(model.matterportTourId))return 'https://my.matterport.com/show/?m='+encodeURIComponent(model.matterportTourId);
 return embedUrl(model?.uid);
}

export function undergroundSitePopupHtml(site,selectedUid=null){
 if(!site||!Array.isArray(site.models)||!site.models.length)return '';
 const selected=modelByUid(site,selectedUid);
 const isMatterport=Boolean(selected?.matterportTourId);
 const isEmbedOnly=Boolean(selected?.embedOnly);
 const containedViewer=isMatterport||isEmbedOnly;
 const choices=site.models.map(m=>'<button type="button" class="bp-underground-scan-choice-v1'+(m.uid===selected.uid?' is-active':'')+'" data-scan-uid="'+safe(m.uid)+'" aria-pressed="'+String(m.uid===selected.uid)+'"><span>'+safe(m.title)+'</span><small>'+safe(m.creator)+' · '+safe(m.license)+'</small></button>').join('');
 return '<article class="bp-underground-site-popup-v1'+(isMatterport?' bp-underground-site-popup-matterport-v1':'')+'">'+
  '<div class="bp-underground-site-kicker-v1">BRIDGEPOINT · CAVES & UNDERGROUND SITES</div><h3>'+safe(site.name)+'</h3>'+
  '<p class="bp-underground-site-description-v1">'+safe(site.description)+'</p>'+
  '<div class="bp-underground-site-viewer-v1"><iframe id="bp-underground-scan-viewer-v1" title="'+safe(selected.title)+' — interactive 3D scan by '+safe(selected.creator)+'" src="'+safe(modelViewerUrl(selected))+'" '+(containedViewer?'sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-presentation" allow="autoplay; xr-spatial-tracking"':'allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen')+' loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'+
  '<div class="bp-underground-site-model-meta-v1"><b id="bp-underground-scan-title-v1">'+safe(selected.title)+'</b>'+
  '<span>Creator: <strong id="bp-underground-scan-creator-v1">'+safe(selected.creator)+'</strong></span>'+
  '<span>'+(containedViewer?'Access / rights: ':'Displayed license: ')+'<strong id="bp-underground-scan-license-v1">'+safe(selected.license)+'</strong></span>'+
  '<span>Capture method: <strong id="bp-underground-scan-method-v1">'+safe(selected.method)+'</strong></span>'+
  '<p id="bp-underground-scan-detail-v1">'+safe(selected.detail)+'</p>'+
  (isMatterport?'<span class="bp-underground-site-provider-v1">Original 3D publisher: Elements of Media · Play the tour here in BridgePoint</span>':isEmbedOnly?'<span class="bp-underground-site-provider-v1">Original 3D creator: '+safe(selected.creator)+' · Explore the photo-mesh here in BridgePoint</span>':'<a id="bp-underground-scan-source-v1" href="'+safe(selected.modelUrl)+'" target="_blank" rel="noopener noreferrer">Open original Sketchfab model ↗</a>')+'</div>'+
  (site.models.length>1?'<div class="bp-underground-site-choices-v1" aria-label="Other scans at this site">'+choices+'</div>':'')+
  '<p class="bp-underground-site-precision-v1"><strong>Map placement:</strong> '+safe(site.locationPrecision)+'</p>'+
  '<p class="bp-underground-site-attribution-v1">'+(isMatterport?'3D tour is hosted by Matterport and published by Elements of Media; the original publisher retains rights. BridgePoint embeds the public interactive showcase, does not redistribute the model and does not claim it is a pure photogrammetry or survey-georeferenced mesh.':isEmbedOnly?'This real photogrammetry 3D model is hosted on its creator’s public Sketchfab viewer. No downloadable reuse license was displayed when reviewed. BridgePoint embeds that original viewer only; it does not copy the scan, claim ownership, or imply a georeferenced cave survey.':'3D content is hosted by Sketchfab and remains on its creator’s model page. Creator attribution and displayed license are shown above. BridgePoint does not claim this scan is a metrically georeferenced subsurface mesh.')+'</p></article>';
}

function makeIcon(type){
 const canvas=document.createElement('canvas');canvas.width=72;canvas.height=72;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,72,72);
 const colors=type==='tomb'?['#e0b66a','#8e6335']:type==='catacomb'?['#8fe5ed','#236c80']:['#9ce3b5','#2c7b5a'];
 const g=ctx.createRadialGradient(25,20,3,36,36,34);g.addColorStop(0,'#f4ffff');g.addColorStop(.22,colors[0]);g.addColorStop(1,colors[1]);
 ctx.fillStyle='rgba(3,13,21,.82)';ctx.beginPath();ctx.arc(36,36,32,0,Math.PI*2);ctx.fill();ctx.strokeStyle=colors[0];ctx.lineWidth=3;ctx.stroke();
 ctx.fillStyle=g;ctx.strokeStyle='#eefcff';ctx.lineWidth=2.2;
 if(type==='tomb'){
  ctx.beginPath();ctx.moveTo(15,30);ctx.lineTo(36,15);ctx.lineTo(57,30);ctx.lineTo(54,53);ctx.lineTo(18,53);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(29,53);ctx.lineTo(29,38);ctx.quadraticCurveTo(36,29,43,38);ctx.lineTo(43,53);ctx.stroke();
 }else if(type==='catacomb'){
  ctx.beginPath();ctx.moveTo(14,54);ctx.lineTo(14,34);ctx.quadraticCurveTo(36,5,58,34);ctx.lineTo(58,54);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#061a28';ctx.beginPath();ctx.moveTo(26,54);ctx.lineTo(26,36);ctx.quadraticCurveTo(36,20,46,36);ctx.lineTo(46,54);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#f0ffff';ctx.beginPath();ctx.moveTo(36,24);ctx.lineTo(36,46);ctx.moveTo(29,31);ctx.lineTo(43,31);ctx.stroke();
 }else{
  ctx.beginPath();ctx.moveTo(11,55);ctx.lineTo(11,40);ctx.lineTo(21,25);ctx.lineTo(31,32);ctx.lineTo(44,13);ctx.lineTo(61,40);ctx.lineTo(61,55);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#061a28';ctx.beginPath();ctx.moveTo(25,55);ctx.lineTo(25,42);ctx.quadraticCurveTo(36,29,47,42);ctx.lineTo(47,55);ctx.closePath();ctx.fill();
 }
 return ctx.getImageData(0,0,72,72);
}
function setStatus(state,msg){state.status=msg;const el=document.getElementById(STATUS_ID);if(el)el.textContent=msg;}
function refreshStatusUi(state){
 const count=document.getElementById(COUNT_ID);if(count)count.textContent=state.stats.models.toLocaleString()+' scan models · '+state.stats.sites.toLocaleString()+' site icons · '+state.stats.rightsHolds.toLocaleString()+' rights/source holds';
 const status=document.getElementById(STATUS_ID);if(status)status.textContent=state.status;
 const b=document.getElementById(TOGGLE_ID);if(b){b.setAttribute('aria-pressed',String(state.enabled));b.classList.toggle('is-active',state.enabled);}
}
function setVisibility(state,visible){
 const wanted=visible?'visible':'none';
 for(const id of [HALO_ID,MARKER_ID,LABEL_ID]){
  if(state.map.getLayer(id)&&state.map.getLayoutProperty(id,'visibility')!==wanted)state.map.setLayoutProperty(id,'visibility',wanted);
 }
}
// Preserve opt-in cave markers when another globe renderer updates the map style.
// One deferred check per frame maximum; no polling loop or extra network requests.
function scheduleCaveMarkerPersistence(state){
 if(state.dead||!state.enabled||state.markerFrame)return;
 const run=()=>{
  state.markerFrame=0;
  if(state.dead||!state.enabled)return;
  const map=state.map;
  if(typeof map.isStyleLoaded==='function'&&!map.isStyleLoaded())return;
  if(!map.getSource(SOURCE_ID)||!map.getLayer(MARKER_ID)||!map.hasImage?.('bp-underground-site-icon-cave-v1')){
   installLayers(state);
   return;
  }
  setVisibility(state,true);
  const size=map.getLayoutProperty(MARKER_ID,'icon-size');
  if(JSON.stringify(size)!==JSON.stringify(CAVE_ICON_SIZE))map.setLayoutProperty(MARKER_ID,'icon-size',CAVE_ICON_SIZE);
 };
 state.markerFrame=(typeof requestAnimationFrame==='function'?requestAnimationFrame:(cb=>setTimeout(cb,25)))(run);
}
function installLayers(state){
 const map=state.map;if(!map?.getStyle?.())return false;
 try{
  for(const type of ['cave','catacomb','tomb']){const id='bp-underground-site-icon-'+type+'-v1';if(!map.hasImage?.(id))map.addImage(id,makeIcon(type),{pixelRatio:2});}
  if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{type:'geojson',data:{type:'FeatureCollection',features:buildUndergroundSiteFeatures()},buffer:64,maxzoom:14,attribution:'3D scans via Sketchfab or creator-published Matterport; model rights and attribution are shown in each site viewer.'});
  const add=(id,layer)=>{if(!map.getLayer(id))map.addLayer(layer);};
  add(HALO_ID,{id:HALO_ID,type:'circle',source:SOURCE_ID,minzoom:0,maxzoom:24,layout:{visibility:state.enabled?'visible':'none'},paint:{
   'circle-radius':['interpolate',['linear'],['zoom'],0,3.5,5,6,10,9,16,13,22,16],
   'circle-color':['match',['get','type'],'tomb','#d9aa58','catacomb','#58d2e2','#7bd49a'],'circle-opacity':0.35,'circle-blur':0.55}});
  add(MARKER_ID,{id:MARKER_ID,type:'symbol',source:SOURCE_ID,minzoom:0,maxzoom:24,layout:{
   visibility:state.enabled?'visible':'none','icon-image':['get','iconImage'],
   'icon-size':CAVE_ICON_SIZE,'icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport',
   'icon-anchor':'bottom','icon-allow-overlap':true,'icon-ignore-placement':true,'symbol-sort-key':100}});
  add(LABEL_ID,{id:LABEL_ID,type:'symbol',source:SOURCE_ID,minzoom:4,maxzoom:24,layout:{
   visibility:state.enabled?'visible':'none','text-field':['get','name'],
   'text-size':['interpolate',['linear'],['zoom'],4,9,10,11,17,13],
   'text-offset':[0,1.28],'text-anchor':'top','text-allow-overlap':false,'text-ignore-placement':false
  },paint:{'text-color':'#eafcff','text-halo-color':'rgba(3,12,20,.94)','text-halo-width':1.4,'text-opacity':0.96}});
  setVisibility(state,state.enabled);return true;
 }catch(e){state.stats.lastError=String(e?.message||e);console.warn('BridgePoint cave and underground site layer unavailable',e);return false;}
}
function openSitePopup(state,site,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 if(state.popup)state.popup.remove();
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'430px',className:'bp-underground-site-popup-wrap-v1'})
  .setLngLat(lngLat||site.coordinates).setHTML(undergroundSitePopupHtml(site)).addTo(state.map);
 const root=state.popup.getElement?.();if(!root)return;
 for(const button of root.querySelectorAll('[data-scan-uid]'))button.addEventListener('click',()=>{
  const model=modelByUid(site,button.getAttribute('data-scan-uid'));if(!model)return;
  const viewer=root.querySelector('#bp-underground-scan-viewer-v1');
  if(viewer){viewer.src=modelViewerUrl(model);viewer.title=model.title+' — interactive 3D scan by '+model.creator;}
  const put=(selector,value)=>{const el=root.querySelector(selector);if(el)el.textContent=value;};
  put('#bp-underground-scan-title-v1',model.title);put('#bp-underground-scan-creator-v1',model.creator);
  put('#bp-underground-scan-license-v1',model.license);put('#bp-underground-scan-method-v1',model.method);put('#bp-underground-scan-detail-v1',model.detail);
  const link=root.querySelector('#bp-underground-scan-source-v1');if(link)link.href=model.modelUrl;
  for(const choice of root.querySelectorAll('[data-scan-uid]')){const active=choice.getAttribute('data-scan-uid')===model.uid;choice.classList.toggle('is-active',active);choice.setAttribute('aria-pressed',String(active));}
 });
}
function bindInteractions(state){
 if(state.interactionsBound)return;state.interactionsBound=true;
 state.handleClick=e=>{
  if(!state.enabled)return;
  const hits=state.map.queryRenderedFeatures?.(e.point,{layers:[MARKER_ID]})||[];
  const hit=hits.find(f=>f.properties?.siteId);if(!hit)return;
  const site=UNDERGROUND_SCAN_SITES.find(s=>s.id===String(hit.properties.siteId));if(site)openSitePopup(state,site,e.lngLat||site.coordinates);
 };
 state.handleStyleLoad=()=>{if(!state.enabled)return;if(installLayers(state))setStatus(state,'Layer ON · '+state.stats.sites+' site icons stay visible from global zoom through close zoom. Select an icon to open its real 3D scan.');refreshStatusUi(state);};
 state.handlePersistence=()=>scheduleCaveMarkerPersistence(state);
 state.map.on('click',state.handleClick);state.map.on('style.load',state.handleStyleLoad);state.map.on('load',state.handleStyleLoad);
 for(const event of ['styledata','idle','moveend','zoomend','pitchend'])state.map.on(event,state.handlePersistence);
}
function addControlGroup(state){
 const dock=document.getElementById('bpv-dock-actions');if(!dock)return false;
 if(document.getElementById(CONTROL_ID))return true;
 const group=document.createElement('section');group.id=CONTROL_ID;group.className='bpv-command-group';
 group.setAttribute('data-bpv-command-section','underground-scan-sites');
 group.setAttribute('aria-label','Caves, catacombs, passage tombs and underground 3D scans');
 group.innerHTML=
  '<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">🕳️</span><span><b>CAVES & UNDERGROUND SITES</b><small>Real cave surveys, catacombs, crypts and subterranean heritage scans</small></span></div>'+
  '<div class="bpv-command-grid"><button id="'+TOGGLE_ID+'" type="button" class="bpv-command-btn" aria-pressed="false" title="Show or hide real cave and underground heritage 3D scan locations"><span class="bpv-command-icon" aria-hidden="true">🪨</span><span class="bpv-command-label">Caves & Sites</span></button></div>'+
  '<div id="'+COUNT_ID+'" class="bpv-data-note">'+state.stats.models+' scan models · '+state.stats.sites+' site icons · '+state.stats.rightsHolds+' rights/source holds</div>'+
  '<div id="'+STATUS_ID+'" class="bpv-data-note">Layer off · no other BridgePoint layer is changed</div>'+
  '<style id="bp-underground-scan-sites-style-v1">'+
  '#'+CONTROL_ID+' .bpv-data-note{font:600 10px/1.45 system-ui,sans-serif;color:#9bb7c6;margin:5px 2px;overflow-wrap:anywhere}'+
  '#'+TOGGLE_ID+'.is-active{border-color:rgba(113,225,190,.78);background:rgba(22,86,72,.56);box-shadow:inset 0 0 0 1px rgba(113,225,190,.22)}'+
  '.bp-underground-site-popup-wrap-v1 .maplibregl-popup-content{background:#06131f;color:#e6f6fb;border:1px solid rgba(112,219,199,.40);border-radius:13px;padding:12px;font:12px/1.45 system-ui,sans-serif;max-height:min(78vh,760px);overflow:auto;width:min(390px,calc(100vw - 54px))}'+
  '.bp-underground-site-popup-wrap-v1 .maplibregl-popup-tip{border-top-color:#06131f;border-bottom-color:#06131f}'+
  '.bp-underground-site-kicker-v1{font-size:9px;letter-spacing:.13em;font-weight:900;color:#83dfc5}.bp-underground-site-popup-v1 h3{font-size:17px;color:#fff;margin:4px 0 6px}'+
  '.bp-underground-site-description-v1,.bp-underground-site-precision-v1,.bp-underground-site-attribution-v1{color:#a9c2cb;margin:6px 0}'+
  '.bp-underground-site-viewer-v1{width:100%;aspect-ratio:4/3;min-height:190px;background:#03080d;border-radius:9px;overflow:hidden;margin:9px 0;border:1px solid rgba(120,210,205,.25)}'+
  '.bp-underground-site-viewer-v1 iframe{width:100%;height:100%;border:0;display:block}'+
  '.bp-underground-site-popup-matterport-v1 .bp-underground-site-viewer-v1{aspect-ratio:4/5;min-height:min(52vh,440px)}'+
  '.bp-underground-site-provider-v1{color:#91dfce;font-weight:650}'+
  '.bp-underground-site-model-meta-v1{display:grid;gap:4px;color:#b9d0d8;font-size:11px}.bp-underground-site-model-meta-v1>b{font-size:13px;color:#fff}.bp-underground-site-model-meta-v1 strong{color:#edfaff}.bp-underground-site-model-meta-v1 p{margin:3px 0;color:#adc3cc}'+
  '.bp-underground-site-model-meta-v1 a{color:#7ee3d4;text-decoration:underline}'+
  '.bp-underground-site-choices-v1{display:grid;gap:5px;margin:10px 0}.bp-underground-scan-choice-v1{display:grid;gap:2px;text-align:left;border:1px solid rgba(135,184,196,.24);background:rgba(14,36,47,.8);color:#eafaff;border-radius:8px;padding:7px 9px;font:600 11px/1.35 system-ui,sans-serif}.bp-underground-scan-choice-v1 small{font-size:9px;color:#9cbac5}.bp-underground-scan-choice-v1.is-active{border-color:#75dbc8;background:rgba(22,82,75,.52)}'+
  '.bp-underground-site-precision-v1{border-top:1px solid rgba(154,205,212,.16);padding-top:8px;margin-top:9px}.bp-underground-site-attribution-v1{font-size:10px}'+
  '@media(max-width:480px){.bp-underground-site-popup-wrap-v1 .maplibregl-popup-content{width:min(320px,calc(100vw - 44px));padding:10px}.bp-underground-site-viewer-v1{min-height:170px}}'+
  '</style>';
 const wells=document.getElementById('bp-subsurface-wells-control-v1');
 if(wells&&wells.parentNode===dock)wells.after(group);else dock.appendChild(group);
 group.querySelector('#'+TOGGLE_ID).addEventListener('click',()=>{void setEnabled(state,!state.enabled)});
 refreshStatusUi(state);return true;
}
async function setEnabled(state,on){
 state.enabled=!!on;
 if(state.enabled){
  if(!installLayers(state))setStatus(state,'Waiting for the map style before showing cave and underground site icons…');
  else setStatus(state,'Layer ON · '+state.stats.sites+' site icons stay visible from global zoom through close zoom. Select an icon to open its real 3D scan.');
  scheduleCaveMarkerPersistence(state);
 }else{
  if(state.popup){state.popup.remove();state.popup=null;}
  setVisibility(state,false);setStatus(state,'Layer off · all existing BridgePoint layers remain unchanged.');
 }
 refreshStatusUi(state);return state.enabled;
}
export function initUndergroundScanSitesRenderer(target){
 const map=target&&(target.map||target);
 if(!map||typeof map.getBounds!=='function'||typeof map.addSource!=='function')return null;
 const existing=MAP_STATES.get(map);if(existing)return existing.api;
 const modelCount=UNDERGROUND_SCAN_SITES.reduce((n,s)=>n+s.models.length,0);
 const state={map,enabled:false,dead:false,popup:null,interactionsBound:false,markerFrame:0,status:'off',
  stats:{version:VERSION,sites:UNDERGROUND_SCAN_SITES.length,models:modelCount,rightsHolds:UNDERGROUND_SCAN_RIGHTS_HOLDS.length,lastError:null}};
 const api={
  version:VERSION,get enabled(){return state.enabled;},get status(){return state.status;},
  get stats(){return Object.assign({},state.stats);},get siteCount(){return state.stats.sites;},get modelCount(){return state.stats.models;},
  toggle(){return setEnabled(state,!state.enabled);},setEnabled(on){return setEnabled(state,on);},
  refresh(){const source=map.getSource(SOURCE_ID);if(source?.setData)source.setData({type:'FeatureCollection',features:buildUndergroundSiteFeatures()});return state.stats;},
  destroy(){
   state.dead=true;if(state.popup)state.popup.remove();
   if(state.handleClick)map.off('click',state.handleClick);
   if(state.handleStyleLoad){map.off('style.load',state.handleStyleLoad);map.off('load',state.handleStyleLoad);}
   if(state.handlePersistence)for(const event of ['styledata','idle','moveend','zoomend','pitchend'])map.off(event,state.handlePersistence);
   if(state.markerFrame)(typeof cancelAnimationFrame==='function'?cancelAnimationFrame:clearTimeout)(state.markerFrame);
   if(state.observer)state.observer.disconnect();if(state.dockTimer)clearTimeout(state.dockTimer);
   for(const id of [LABEL_ID,MARKER_ID,HALO_ID])if(map.getLayer(id))map.removeLayer(id);
   if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID);MAP_STATES.delete(map);
  }
 };
 state.api=api;MAP_STATES.set(map,state);window.__BP_UNDERGROUND_SCAN_SITES_V1__=api;bindInteractions(state);
 const observeDock=()=>{if(state.dead)return;if(addControlGroup(state))return;state.dockTimer=setTimeout(observeDock,500);};
 observeDock();
 if(typeof MutationObserver!=='undefined'&&document.body){state.observer=new MutationObserver(()=>{if(!document.getElementById(CONTROL_ID))addControlGroup(state);});state.observer.observe(document.body,{childList:true,subtree:true});}
 return api;
}
