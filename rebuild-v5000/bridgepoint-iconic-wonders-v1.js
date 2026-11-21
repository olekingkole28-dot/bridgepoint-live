/* BridgePoint World Wonders v1
 * A separate, opt-in landmark layer. Pins are anchored to the named sites;
 * source-hosted photogrammetry/scan models open inside BridgePoint cards.
 */
(() => {
  'use strict';
  if (window.__BP_ICONIC_WONDERS_MODULE_V1__) return;
  window.__BP_ICONIC_WONDERS_MODULE_V1__ = true;

  const VERSION = 'world-wonders-v1';
  const SOURCE = 'bp-world-wonders-source-v1';
  const HALO = 'bp-world-wonders-halo-v1';
  const MARKER = 'bp-world-wonders-markers-v1';
  const ICONS = 'bp-world-wonders-icons-v1';
  const LABELS = 'bp-world-wonders-labels-v1';
  const CONTROL = 'bpv-world-wonders-control-v1';
  const BUTTON = 'bpv-world-wonders-button-v1';
  const STYLE = 'bp-world-wonders-style-v1';
  const EMPTY = { type: 'FeatureCollection', features: [] };
  const STATES = new WeakMap();
  const COUNTS = { total: 27, named: 7, additional: 20 };

  const DATA = Object.freeze([
    { id:'rome-colosseum', name:"Rome's Colosseum", country:'Rome, Italy', coordinates:[12.4924,41.8902], modelId:'4577eb4b21ac48ecba43e7944b4e1baf', slug:'romes-colosseum', creator:'eyesCloud3D', capture:'Drone photogrammetry: the creator says the Colosseum mesh and point cloud were made from drone imagery.', coverage:'The public model shows the Colosseum structure. Its site coordinate is the monument anchor; the published mesh is not georeferenced to BridgePoint terrain.', details:'The Flavian amphitheatre in central Rome, commissioned under Vespasian and opened under Titus around AD 80. The creator-hosted reconstruction is an image-based model, not an official survey deliverable.', mesh:'208,500 triangles · mesh and point cloud listed', license:'CC BY attribution is shown on the model page.' },
    { id:'lincoln-memorial', name:'Lincoln Memorial', country:'Washington, D.C., United States', coordinates:[-77.0502,38.8893], modelId:'5bf2b94005e24f428dc82a2e033135d4', slug:'lincoln-memorial', creator:'CyArk', capture:'CyArk documented the memorial in 2013. Its project listing says both LiDAR and photogrammetric data are available.', coverage:'A detailed memorial model. The card links to the source record; the model itself is not registered to the BridgePoint terrain surface.', details:'The marble memorial to Abraham Lincoln stands at the west end of the National Mall, across the Reflecting Pool from the Washington Monument.', mesh:'956,700 triangles', license:'Creator-hosted CyArk viewer; use the source page for current terms.' },
    { id:'mount-rushmore', name:'Mount Rushmore', country:'South Dakota, United States', coordinates:[-103.4591,43.8791], modelId:'382bda05e5a343f9ac1fb9a90e5efecf', slug:'mount-rushmore-high-resolution-model', creator:'CyArk', capture:'High-resolution photo-derived reconstruction from images collected at the base of the presidents in 2016; the public page does not identify the processing software.', coverage:'The published high-resolution model focuses on the carved presidential faces and the mountain immediately around them.', details:'The granite memorial in the Black Hills depicts George Washington, Thomas Jefferson, Theodore Roosevelt, and Abraham Lincoln.', mesh:'1.2 million triangles', license:'Creator-hosted CyArk viewer; use the source page for current terms.' },
    { id:'grand-canyon', name:'Grand Canyon · USGS photo model', country:'Arizona, United States', coordinates:[-112.1129,36.1069], modelId:'e1a5d6ba570b4c74a1133e3229c50a77', slug:'grand-canyon-usa', creator:'Ricardo Garnica', capture:'Photogrammetric terrain mesh made from USGS photographs; the creator names USGS EarthExplorer and ContextCapture in the listing.', coverage:'This is a photo-derived canyon terrain model, not a survey of the entire 446 km canyon. The pin marks the South Rim reference point.', details:'A major Colorado River canyon cut into the Colorado Plateau. The creator-published model provides a 3D view of canyon terrain from USGS imagery.', mesh:'1.2 million triangles', license:'CC BY attribution is shown on the model page.' },
    { id:'statue-of-liberty', name:'Statue of Liberty', country:'Liberty Island, New York, United States', coordinates:[-74.0445,40.6892], modelId:'734dd252ca9e42249d9a7de338031a8f', slug:'statue-of-liberty', creator:'Joseph E. Mathis', capture:'The creator describes this as a 3D scan and tags the model as photogrammetry. The page does not publish the survey position, camera coverage, or processing details.', coverage:'The hosted model is a separate scan asset; the BridgePoint pin marks the monument location and does not claim that the mesh is terrain-aligned.', details:'The copper Statue of Liberty and its pedestal stand on Liberty Island in New York Harbor. National Park Service documentation separately describes a comprehensive digital survey using photogrammetry and laser scanning.', mesh:'21,200 triangles', license:'CC BY attribution is shown on the model page.' },
    { id:'christ-the-redeemer', name:'Christ the Redeemer', country:'Rio de Janeiro, Brazil', coordinates:[-43.2105,-22.9519], modelId:'fa8c4b24898c40ec86a40449cec47474', slug:'christ-the-redeemer-rio', creator:'Pix4D SA', capture:'Aerial photogrammetry from 2,090 images acquired by an Aeryon Scout UAV and reconstructed with Pix4Dmapper.', coverage:'The published model covers the statue; Pix4D also published a separate Corcovado-and-statue view.', details:'The Art Deco statue of Jesus Christ atop Corcovado overlooks Rio de Janeiro. The original project reported a 134.4-million-point cloud and a textured multi-million-triangle mesh.', mesh:'About 1 million triangles in the public viewer; project collection reports a higher-resolution 2.5-million-triangle mesh.', license:'Creator-hosted Pix4D viewer; use the source page for current terms.' },
    { id:'eiffel-tower', name:'Eiffel Tower', country:'Paris, France', coordinates:[2.2945,48.8584], modelId:'f5df073e159044bfa9ce005e841c9607', slug:'eiffel-tower-france', creator:'Drones Imaging', capture:'Drone photogrammetry post-processed with Agisoft Metashape, as identified by the creator.', coverage:'Tower and surrounding context in the published model; flight plan and metric survey control are not provided on the listing.', details:'The 330 m iron tower was built for the 1889 Exposition Universelle and remains one of Paris’s defining structures.', mesh:'881,500 triangles', license:'Creator-hosted Sketchfab viewer; use the source page for current terms.' },

    { id:'petra-treasury', name:'Al-Khazneh · Petra Treasury', country:'Petra, Jordan', coordinates:[35.4444,30.3220], modelId:'966b88f5768d43ed9ebf4cc726c42f3d', slug:'al-khazneh-petra-jordan', creator:'Global Digital Heritage and GDH-Afrika', capture:'Hybrid heritage capture: the project description reports about 60 terrestrial laser scans and 5,500 photographs, combining range scanning with photogrammetry.', coverage:'The model focuses on the Treasury facade and its immediate rock-cut setting, not the entire Petra archaeological park.', details:'Al-Khazneh is the monumental Nabataean tomb facade at the end of Petra’s Siq. The card keeps the creator-hosted model and institutional project attribution together.', mesh:'About 4.2 million triangles', license:'Creator-hosted model; consult the linked source for current terms.' },
    { id:'machu-picchu', name:'Machu Picchu', country:'Cusco Region, Peru', coordinates:[-72.5450,-13.1631], modelId:'eb2e2c36ba8a4d8197dc30dd947984d2', slug:'machu-picchu', creator:'Théo Derory', capture:'Photogrammetry reconstructed from captures taken from 4K drone footage.', coverage:'The model covers the citadel and its steep ridge setting at overview scale; it is not a survey-grade terrain alignment.', details:'The 15th-century Inca citadel sits about 2,430 m above sea level in the eastern Andes, above the Urubamba River valley.', mesh:'About 400,000 triangles', license:'Creator-hosted Sketchfab viewer; use the source page for current terms.' },
    { id:'great-pyramid-giza', name:'Great Pyramid of Giza', country:'Giza, Egypt', coordinates:[31.1342,29.9792], modelId:'4a251113722f4d969b6cf2ca5f35c502', slug:'the-great-pyramid-of-giza', creator:'ianicolo', capture:'Photogrammetry assembled from video frames, as stated by the creator.', coverage:'The published mesh represents the Great Pyramid; it does not include a measured interior or the full Giza plateau.', details:'The pyramid of Khufu is the largest of the Giza pyramids and the only largely intact surviving structure among the Seven Wonders of the Ancient World.', mesh:'360,300 triangles', license:'CC BY attribution is shown on the model page.' },
    { id:'angkor-wat', name:'Angkor Wat', country:'Siem Reap, Cambodia', coordinates:[103.8670,13.4125], modelId:'be70b89f9c264fc19d63dca2ae78b224', slug:'angkor-wat', creator:'333DDD', capture:'The creator says the reconstruction was built solely from found 8K drone footage; the exact photogrammetry pipeline is not stated.', coverage:'Model view of the central temple; it does not cover the whole 162.6-hectare Angkor Wat complex.', details:'Angkor Wat is the vast Khmer temple complex built in the 12th century and one of Cambodia’s best-known heritage sites.', mesh:'379,400 triangles', license:'CC BY attribution is shown on the model page.' },
    { id:'parthenon', name:'The Parthenon', country:'Athens, Greece', coordinates:[23.7266,37.9715], modelId:'d5cc54ccd57a4bdeb3c164a96c677b59', slug:'parthenon', creator:'Sketchfab creator scan', capture:'Photogrammetry generated in Agisoft PhotoScan from drone video, according to the model description.', coverage:'Exterior monument model; the interior and complete Acropolis landscape are not part of this mesh.', details:'The Parthenon crowns the Acropolis of Athens and was built in the 5th century BCE as a temple to Athena.', mesh:'About 450,000 triangles', license:'CC BY attribution is shown on the model page.' },
    { id:'stonehenge', name:'Stonehenge', country:'Wiltshire, England', coordinates:[-1.8262,51.1789], modelId:'7e7febabef2045a68755cc39c8c7c91f', slug:'stonehenge-england-vr', creator:'GSXNet', capture:'Photogrammetric 3D scan, identified in the creator’s model tags.', coverage:'The stones and immediate monument setting are shown; not a full-resolution scan of the surrounding World Heritage landscape.', details:'Stonehenge is a prehistoric monument on Salisbury Plain, managed by English Heritage and protected as a World Heritage site.', mesh:'351,800 triangles', license:'CC BY attribution is shown on the model page.' },
    { id:'great-wall-huanghuacheng', name:'Great Wall of China · Huanghuacheng section', country:'Beijing Municipality, China', coordinates:[116.2590,40.4510], modelId:'3ce0cc3108e54097862ea735309d9292', slug:'great-wall-china-model-2', creator:'Lionel', capture:'Drone photogrammetry from 156 Mavic Pro photographs, per the model listing.', coverage:'A scanned section between Shihuyucun and Huanghuachengcun near Beijing, not a scan of the entire Great Wall.', details:'This model shows a mountain section of the Ming-era Great Wall near the Huanghuacheng reservoir region.', mesh:'2.7 million triangles', license:'CC BY attribution is shown on the model page.' },
    { id:'notre-dame-paris', name:'Notre-Dame de Paris', country:'Paris, France', coordinates:[2.3499,48.8530], modelId:'b5808186c49a451bbf815fbccdb727a3', slug:'notre-dame-de-paris', creator:'François Bouillé', capture:'Photogrammetry; the creator reports reducing a 20-million-triangle source mesh to a 303,800-triangle viewer mesh.', coverage:'Exterior model from a 2021 creator upload; the page does not state a complete interior survey or current restoration state.', details:'The medieval cathedral stands on Île de la Cité in the Seine. The source page records the model’s capture and mesh-reduction notes.', mesh:'303,800 triangles', license:'CC BY attribution is shown on the model page.' },
    { id:'chichen-itza', name:'El Castillo · Chichén Itzá', country:'Yucatán, Mexico', coordinates:[-88.5678,20.6843], modelId:'cadcd48c10cb404da78e293256c7fac5', slug:'chichen-itza-yucatan-photogrammetry-test', creator:'Nick G. Gizelis', capture:'Photogrammetry from parts of drone video, processed in Agisoft PhotoScan; creator notes that geometry and textures were cleaned up afterward.', coverage:'The principal pyramid and part of its landscape, not the entire archaeological zone.', details:'El Castillo, also called the Temple of Kukulcán, is the central pyramid at the Maya archaeological site of Chichén Itzá.', mesh:'228,900 triangles', license:'CC BY attribution is shown on the model page.' },
    { id:'teotihuacan-sun', name:'Pyramid of the Sun · Teotihuacán', country:'State of Mexico, Mexico', coordinates:[-98.8435,19.6925], modelId:'0cf4d7faefe244d6b23a62dcf6af43df', slug:'pyramid-of-the-sun-teotihuacan', creator:'Théo Derory', capture:'Photogrammetry from 481 photographs, according to the model description.', coverage:'The Pyramid of the Sun and nearby terrain are modeled; this is not a complete Teotihuacán city survey.', details:'The Pyramid of the Sun is the largest structure at Teotihuacán and faces the Avenue of the Dead.', mesh:'About 1.5 million triangles', license:'Creator-hosted model preview; use the source page for current terms.' },
    { id:'uluru', name:'Uluru · Ayers Rock', country:'Northern Territory, Australia', coordinates:[130.9885,-25.3444], modelId:'89c0028622bc4aae82f08796a6295301', slug:'uluru-ayers-rock-northern-territory-australia', creator:'Nate Loper', capture:'Creator-tagged photogrammetry / Photoscan model. The listing does not publish the photo count or capture footprint.', coverage:'Coarse landscape overview of the sandstone monolith; the public mesh has limited triangle density and should be treated as an overview, not a close survey.', details:'Uluru is a sacred sandstone monolith within Uluru-Kata Tjuta National Park in Australia’s Northern Territory.', mesh:'8,200 triangles', license:'CC BY attribution is shown on the model page.' },
    { id:'matterhorn', name:'Matterhorn · Cervin', country:'Valais, Switzerland / Aosta Valley, Italy', coordinates:[7.6586,45.9763], modelId:'a4fac92f8b6044fe94eafad0b009e625', slug:'3d-matterhorn-cervin', creator:'Pix4D SA', capture:'Aerial photogrammetry from more than 2,000 senseFly eBee images processed in Pix4Dmapper; reported ground sampling distance is 18 cm.', coverage:'Large-scale mountain surface model; fine summit details and metric control limits depend on the creator’s source project.', details:'The Matterhorn rises above Zermatt and the Aosta Valley and is among the Alps’ most recognizable peaks.', mesh:'About 1 million triangles', license:'Creator-hosted Pix4D viewer; use the source page for current terms.' },
    { id:'chillon-castle', name:'Chillon Castle', country:'Veytaux, Switzerland', coordinates:[6.9270,46.4140], modelId:'7f022938bee44f36bde778daffdbea8e', slug:'pix4d-chillon-castle', creator:'Pix4D SA', capture:'Image-based 3D reconstruction of a complex architectural structure, documented by Pix4D as an image-based modeling project.', coverage:'Exterior castle mesh and immediate shoreline context; the linked viewer does not claim a complete interior survey.', details:'Chillon Castle occupies a rocky island at the edge of Lake Geneva, near Montreux.', mesh:'403,100 triangles', license:'Creator-hosted Pix4D viewer; use the source page for current terms.' },
    { id:'niagara-falls', name:'Niagara Falls', country:'Ontario, Canada / New York, United States', coordinates:[-79.0740,43.0790], modelId:'6e663481f18644268449458784e8a4d7', slug:'niagara-falls', creator:'ariadams', capture:'Image-derived 3D reconstruction made with Google Earth Studio imagery and Metashape Pro; the creator tags the result as photogrammetry.', coverage:'A broad falls-and-river overview made from aerial imagery, not a close terrestrial scan of the cataract face.', details:'The Niagara River crosses the Canada–United States border through three major waterfalls, including Horseshoe Falls.', mesh:'870,200 triangles', license:'CC BY attribution is shown on the model page.' },
    { id:'bagan-eim-ya-kyaung', name:'Eim Ya Kyaung Temple · Bagan', country:'Bagan, Myanmar', coordinates:[94.8580,21.1685], modelId:'37a971286d4949dba7c93983d1818aca', slug:'bagan-eim-ya-kyaung-photogrammetry-scan', creator:'Miguel Bandera, using CyArk Open Heritage data', capture:'Photogrammetry reconstruction from CyArk Open Heritage project data.', coverage:'A single Bagan temple. The creator links a separate interior-and-exterior reconstruction; this card opens the exterior model listed here.', details:'Eim Ya Kyaung is one of the historic brick temples in the Bagan archaeological landscape.', mesh:'41,900 triangles', license:'CC BY attribution is shown on the model page.' },
    { id:'mont-saint-michel', name:'Mont-Saint-Michel', country:'Normandy, France', coordinates:[-1.5115,48.6360], modelId:'24189ce5f6b6491dbdc2490cce84cfa8', slug:'mont-saint-michel-1km-above', creator:'Gerpho 3D', capture:'Aerial photogrammetry captured from about 1 km away using a 200 mm lens; the creator reports 3–5 cm image resolution.', coverage:'Island, abbey, and bay model captured from long range. The source notes that airspace restrictions prevented a closer flight.', details:'The tidal island and abbey stand in the bay between Normandy and Brittany, France.', mesh:'303,500 triangles', license:'Creator-hosted Sketchfab viewer; use the source page for current terms.' },
    { id:'tikal', name:'Tikal · Maya city landscape', country:'Petén, Guatemala', coordinates:[-89.6237,17.2220], modelId:'95e4a56826d24f928ee32e62ea9df395', slug:'tikal-guatemala', creator:'CyArk', capture:'CyArk’s project lists both LiDAR and photogrammetric data for this site through Open Heritage 3D.', coverage:'A site overview model of part of the ancient city; source-linked research data extend beyond this viewer mesh.', details:'Tikal was a major Maya city in the Petén rainforest and is now part of Tikal National Park.', mesh:'484,000 triangles', license:'Creator-hosted CyArk viewer; use the source page for current terms.' },
    { id:'pompeii-jupiter-temple', name:'Temple of Jupiter · Pompeii', country:'Pompeii, Italy', coordinates:[14.4959,40.7509], modelId:'1738c376769b4fa3bc402fb64a19564a', slug:'pompeii-temple-of-jupiter', creator:'CyArk', capture:'CyArk digital heritage model. The public viewer listing does not specify the photogrammetry / LiDAR mix for this individual mesh.', coverage:'The temple model only; not the full Pompeii excavation or Mount Vesuvius landscape.', details:'The Temple of Jupiter stood at the north end of Pompeii’s Forum before the eruption of Vesuvius in AD 79.', mesh:'1.5 million triangles', license:'Creator-hosted CyArk viewer; use the source page for current terms.' },
    { id:'sagrada-familia', name:'Sagrada Família', country:'Barcelona, Spain', coordinates:[2.1744,41.4036], modelId:'7b49e57dde984534981b83eefee652ce', slug:'sagrada-familia-antoni-gaudi', creator:'AXL Visual & Design', capture:'The creator identifies this as a 3D scan and modeling process using digital photogrammetry.', coverage:'The source-hosted preview shows the basilica model; it is not a survey-grade, georeferenced mesh on the BridgePoint globe.', details:'Antoni Gaudí’s basilica in Barcelona remains an active construction site, with the Nativity façade and other elements recognized as UNESCO heritage.', mesh:'About 100,000 triangles in the public preview', license:'Creator-hosted model preview; use the source page for current terms.' },
    { id:'golden-gate-bridge', name:'Golden Gate Bridge · photogrammetry point cloud', country:'San Francisco, California, United States', coordinates:[-122.4783,37.8199], modelId:'cfe7ce3f80e04319819c95bc73effcca', slug:'golden-gate-bridge-point-cloud', creator:'SBCVL_UCSF', capture:'The published model is a 3D point cloud tagged as photogrammetry; the creator does not publish the camera count or survey control in the listing.', coverage:'A source-hosted point-cloud view of the bridge; it is not a metrically registered bridge mesh on BridgePoint terrain.', details:'The Golden Gate Bridge spans the entrance to San Francisco Bay and connects San Francisco with Marin County.', mesh:'Point-cloud model; triangle count is not applicable', license:'Creator-hosted Sketchfab viewer; use the source page for current terms.' }
  ]);

  const BY_ID = new Map(DATA.map(item => [item.id, item]));
  const COLLECTION = {
    type: 'FeatureCollection',
    features: DATA.map(item => ({
      type: 'Feature',
      id: item.id,
      properties: { id: item.id, name: item.name, country: item.country, color: '#ffd178' },
      geometry: { type: 'Point', coordinates: item.coordinates }
    }))
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }
  function modelPage(record) {
    return 'https://sketchfab.com/3d-models/' + record.slug + '-' + record.modelId;
  }
  function modelEmbed(record) {
    return 'https://sketchfab.com/models/' + record.modelId + '/embed?autostart=1&preload=1&ui_theme=dark&ui_infos=0&dnt=1';
  }
  function cardHtml(record) {
    const page = modelPage(record);
    return '<article class="bp-world-wonder-card-v1">' +
      '<div class="bp-world-wonder-kicker-v1">BRIDGEPOINT · WORLD WONDERS · 3D SCAN</div>' +
      '<h3>' + esc(record.name) + '</h3>' +
      '<div class="bp-world-wonder-place-v1">' + esc(record.country) + '</div>' +
      '<div class="bp-world-wonder-viewer-v1"><iframe title="' + esc(record.name) + ' interactive 3D scan" src="' + esc(modelEmbed(record)) + '" allow="autoplay; fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowfullscreen loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>' +
      '<p>' + esc(record.details) + '</p>' +
      '<div class="bp-world-wonder-facts-v1"><div><b>Capture</b><span>' + esc(record.capture) + '</span></div><div><b>Model scope</b><span>' + esc(record.coverage) + '</span></div>' +
      (record.mesh ? '<div><b>Mesh</b><span>' + esc(record.mesh) + '</span></div>' : '') +
      '<div><b>Attribution</b><span>' + esc(record.creator) + ' · ' + esc(record.license) + '</span></div></div>' +
      '<a class="bp-world-wonder-source-v1" href="' + esc(page) + '" target="_blank" rel="noopener noreferrer">Open creator’s source model ↗</a>' +
      '<p class="bp-world-wonder-note-v1">The marker is placed at the named landmark’s map coordinate. Creator-hosted scan meshes are shown in this BridgePoint card and are not represented as terrain-aligned meshes.</p>' +
      '</article>';
  }
  function ensureCss() {
    if (document.getElementById(STYLE)) return;
    const style = document.createElement('style');
    style.id = STYLE;
    style.textContent =
      '.bp-world-wonder-popup-v1 .maplibregl-popup-content{width:min(560px,calc(100vw - 36px));max-height:min(86vh,880px);overflow:auto;padding:13px;border:1px solid rgba(255,209,120,.58);border-radius:16px;background:linear-gradient(155deg,rgba(8,20,29,.98),rgba(3,10,16,.98));color:#edf6fb;box-shadow:0 16px 52px rgba(0,0,0,.52);font:12px/1.5 system-ui,sans-serif}' +
      '.bp-world-wonder-popup-v1 .maplibregl-popup-tip{border-top-color:#09151d;border-bottom-color:#09151d}' +
      '.bp-world-wonder-card-v1 h3{margin:3px 0 1px;color:#fff;font:800 19px/1.18 system-ui,sans-serif}' +
      '.bp-world-wonder-card-v1 p{margin:9px 0;color:#d2e0e7}' +
      '.bp-world-wonder-kicker-v1{color:#ffd178;font-size:9px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}' +
      '.bp-world-wonder-place-v1{margin:0 0 10px;color:#a8cad7;font-size:11px;font-weight:700}' +
      '.bp-world-wonder-viewer-v1{overflow:hidden;width:100%;aspect-ratio:16/10;min-height:205px;border:1px solid rgba(119,192,213,.28);border-radius:11px;background:#02080c}' +
      '.bp-world-wonder-viewer-v1 iframe{display:block;width:100%;height:100%;border:0}' +
      '.bp-world-wonder-facts-v1{display:grid;gap:7px;margin:10px 0}' +
      '.bp-world-wonder-facts-v1>div{display:grid;grid-template-columns:86px 1fr;gap:8px;padding:7px 8px;border:1px solid rgba(119,192,213,.14);border-radius:8px;background:rgba(15,35,47,.55)}' +
      '.bp-world-wonder-facts-v1 b{color:#ffd178;font-size:10px;text-transform:uppercase;letter-spacing:.05em}' +
      '.bp-world-wonder-facts-v1 span{color:#e2edf1;font-size:11px}' +
      '.bp-world-wonder-source-v1{display:inline-block;margin:2px 0 3px;color:#89e6fc;font-size:11px;font-weight:800;text-decoration:none}' +
      '.bp-world-wonder-source-v1:hover{text-decoration:underline}' +
      '.bp-world-wonder-card-v1 .bp-world-wonder-note-v1{margin:7px 0 0;color:#91aeba;font-size:10px}' +
      '@media(max-width:620px){.bp-world-wonder-popup-v1 .maplibregl-popup-content{width:calc(100vw - 34px);max-height:78vh;padding:10px}.bp-world-wonder-viewer-v1{min-height:190px}.bp-world-wonder-facts-v1>div{grid-template-columns:72px 1fr}}';
    document.head.appendChild(style);
  }
  function iconImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.save();
    ctx.shadowColor = 'rgba(255,190,91,0.72)'; ctx.shadowBlur = 13;
    ctx.beginPath(); ctx.arc(32, 30, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#102633'; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(32, 30, 21, 0, Math.PI * 2);
    ctx.lineWidth = 3; ctx.strokeStyle = '#ffd178'; ctx.stroke();
    ctx.fillStyle = '#effbff'; ctx.strokeStyle = '#effbff'; ctx.lineWidth = 3.3;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // A simple monument silhouette that remains legible at global zoom.
    ctx.beginPath(); ctx.moveTo(21, 24); ctx.lineTo(32, 17); ctx.lineTo(43, 24); ctx.closePath(); ctx.fill();
    ctx.fillRect(23, 26, 18, 3);
    ctx.fillRect(25, 29, 3, 11); ctx.fillRect(31, 29, 3, 11); ctx.fillRect(37, 29, 3, 11);
    ctx.fillRect(21, 41, 22, 3);
    return ctx.getImageData(0, 0, 64, 64);
  }
  function addLayer(map, layer) {
    if (!map.getLayer(layer.id)) map.addLayer(layer);
  }
  function installLayers(state) {
    const map = state.map;
    if (state.dead || !map.getStyle || !map.getStyle()) return false;
    try {
      if (!map.hasImage?.(VERSION) && map.addImage) map.addImage(VERSION, iconImage(), { pixelRatio: 2 });
      if (!map.getSource(SOURCE)) map.addSource(SOURCE, { type: 'geojson', data: COLLECTION, maxzoom: 14, tolerance: 0.35, buffer: 48 });
      addLayer(map, { id:HALO, type:'circle', source:SOURCE, minzoom:0, paint:{
        'circle-radius':['interpolate',['linear'],['zoom'],0,9,2,12,6,16,12,19],
        'circle-color':['get','color'], 'circle-opacity':0.18, 'circle-blur':0.35
      }});
      addLayer(map, { id:MARKER, type:'circle', source:SOURCE, minzoom:0, paint:{
        'circle-radius':['interpolate',['linear'],['zoom'],0,6.5,2,8,6,9.5,12,11],
        'circle-color':['get','color'], 'circle-stroke-color':'#f4fbff', 'circle-stroke-width':1.7, 'circle-opacity':0.98
      }});
      addLayer(map, { id:ICONS, type:'symbol', source:SOURCE, minzoom:0, layout:{
        'icon-image':VERSION, 'icon-size':['interpolate',['linear'],['zoom'],0,0.48,2,0.62,5,0.76,10,0.9],
        'icon-allow-overlap':true, 'icon-ignore-placement':true, 'icon-anchor':'center', 'icon-padding':1
      }});
      addLayer(map, { id:LABELS, type:'symbol', source:SOURCE, minzoom:3.4, layout:{
        'text-field':['get','name'], 'text-font':['Open Sans Semibold','Arial Unicode MS Regular'],
        'text-size':['interpolate',['linear'],['zoom'],3.4,9,7,11,13,13], 'text-anchor':'top', 'text-offset':[0,1.15],
        'text-max-width':16, 'text-optional':true, 'text-allow-overlap':false
      }, paint:{'text-color':'#fff5d9','text-halo-color':'rgba(5,12,18,.96)','text-halo-width':1.6}});
      const visibility = state.enabled ? 'visible' : 'none';
      for (const id of [HALO, MARKER, ICONS, LABELS]) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
      return true;
    } catch (error) {
      state.lastError = String(error && error.message || error);
      console.warn('BridgePoint World Wonders markers could not attach', error);
      return false;
    }
  }
  function setVisible(state, value) {
    for (const id of [HALO, MARKER, ICONS, LABELS]) {
      if (state.map.getLayer(id)) state.map.setLayoutProperty(id, 'visibility', value ? 'visible' : 'none');
    }
  }
  function ensureButton(state) {
    const dock = document.getElementById('bpv-dock-actions');
    if (!dock) return false;
    ensureCss();
    let section = document.getElementById(CONTROL);
    if (section) return true;
    section = document.createElement('section');
    section.id = CONTROL;
    section.className = 'bpv-command-group';
    section.setAttribute('data-bpv-command-section', 'world-wonders');
    section.setAttribute('aria-label', 'World Wonders');
    section.innerHTML = '<div class="bpv-command-grid"><button id="' + BUTTON + '" type="button" class="bpv-command-btn" aria-pressed="false" title="Show global landmark and natural wonder scan pins"><span class="bpv-command-icon" aria-hidden="true">✦</span><span class="bpv-command-label">World Wonders</span></button></div>';
    dock.appendChild(section);
    const button = section.querySelector('#' + BUTTON);
    button.addEventListener('click', () => setEnabled(state, !state.enabled));
    return true;
  }
  function openCard(state, item) {
    const Popup = window.maplibregl && window.maplibregl.Popup;
    if (!Popup) return;
    if (state.popup) state.popup.remove();
    state.popup = new Popup({ closeButton:true, closeOnClick:true, maxWidth:'590px', className:'bp-world-wonder-popup-v1' })
      .setLngLat(item.coordinates).setHTML(cardHtml(item)).addTo(state.map);
  }
  function setEnabled(state, value) {
    state.enabled = Boolean(value);
    const ready = state.enabled ? installLayers(state) : true;
    setVisible(state, state.enabled);
    if (state.enabled) state.map.triggerRepaint?.();
    const button = document.getElementById(BUTTON);
    if (button) {
      button.setAttribute('aria-pressed', String(state.enabled));
      button.classList.toggle('is-active', state.enabled);
    }
    if (!state.enabled && state.popup) { state.popup.remove(); state.popup = null; }
    state.status = !state.enabled ? 'off' : ready ? 'ready' : 'waiting-for-map-style';
    return state.enabled;
  }
  function initMap(target) {
    const map = target && (target.map || target);
    if (!map || typeof map.addSource !== 'function' || typeof map.getBounds !== 'function') return null;
    if (STATES.has(map)) return STATES.get(map).api;
    ensureCss();
    const state = { map, enabled:false, dead:false, status:'off', lastError:null, popup:null, observer:null, retry:0 };
    state.click = event => {
      if (!state.enabled || !map.queryRenderedFeatures) return;
      const layers = [MARKER].filter(id => map.getLayer(id));
      if (!layers.length) return;
      const hits = map.queryRenderedFeatures(event.point, { layers }) || [];
      let nearest = null, nearestDistance = Infinity;
      for (const feature of hits) {
        const item = BY_ID.get(String(feature.properties?.id || ''));
        if (!item) continue;
        try {
          const pixel = map.project(item.coordinates);
          const distance = Math.hypot(pixel.x - event.point.x, pixel.y - event.point.y);
          if (distance < nearestDistance) { nearest = item; nearestDistance = distance; }
        } catch (_) { if (!nearest) nearest = item; }
      }
      if (nearest) openCard(state, nearest);
    };
    state.hover = event => {
      if (!state.enabled || !map.queryRenderedFeatures) return;
      const hits = map.queryRenderedFeatures(event.point, { layers:[MARKER] }) || [];
      if (map.getCanvas) map.getCanvas().style.cursor = hits.length ? 'pointer' : '';
    };
    state.style = () => { if (state.enabled) installLayers(state); };
    state.persist = () => { if (!state.dead && state.enabled) installLayers(state); };
    map.on('click', state.click);
    map.on('mousemove', state.hover);
    map.on('style.load', state.style);
    map.on('load', state.style);
    map.on('styledata', state.persist);
    const retryButton = () => {
      if (state.dead || ensureButton(state)) return;
      state.retry = setTimeout(retryButton, 450);
    };
    retryButton();
    if (typeof MutationObserver !== 'undefined' && document.body) {
      state.observer = new MutationObserver(() => {
        if (!state.dead && !document.getElementById(CONTROL)) ensureButton(state);
      });
      state.observer.observe(document.body, { childList:true, subtree:true });
    }
    const api = {
      version:VERSION, records:DATA.length, named:COUNTS.named, additional:COUNTS.additional,
      get enabled() { return state.enabled; }, get status() { return state.status; },
      get stats() { return { version:VERSION, records:DATA.length, named:COUNTS.named, additional:COUNTS.additional, markersReady:Boolean(map.getLayer(MARKER)), enabled:state.enabled, lastError:state.lastError }; },
      toggle() { return setEnabled(state, !state.enabled); }, setEnabled(value) { return setEnabled(state, value); },
      destroy() {
        state.dead = true;
        if (state.retry) clearTimeout(state.retry);
        if (state.popup) state.popup.remove();
        map.off('click', state.click); map.off('mousemove', state.hover);
        map.off('style.load', state.style); map.off('load', state.style); map.off('styledata', state.persist);
        state.observer?.disconnect();
        for (const id of [LABELS, ICONS, MARKER, HALO]) if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(SOURCE)) map.removeSource(SOURCE);
        if (map.hasImage?.(VERSION)) map.removeImage(VERSION);
        document.getElementById(CONTROL)?.remove(); document.getElementById(STYLE)?.remove();
        STATES.delete(map); if (window.__BP_ICONIC_WONDERS_V1__ === api) delete window.__BP_ICONIC_WONDERS_V1__;
      }
    };
    state.api = api;
    STATES.set(map, state);
    window.__BP_ICONIC_WONDERS_V1__ = api;
    if (map.isStyleLoaded?.()) installLayers(state);
    return api;
  }

  function currentMaps() {
    const candidates = [window.__BP_V5000_WORLD, window.__BP_V5000_WORLD__, window.__bpWorldV2300, window.__BP_LANDING_WORLD__, window.__bpLandingWorldV5420];
    const found = [];
    for (const item of candidates) {
      const map = item && (item.map || item);
      if (map && typeof map.addSource === 'function' && typeof map.getBounds === 'function' && !found.includes(map)) found.push(map);
    }
    return found;
  }
  function attach(map) { if (map) return initMap(map); const maps = currentMaps(); return maps.length ? initMap(maps[0]) : null; }
  window.__BP_INIT_WORLD_WONDERS_V1__ = initMap;
  window.addEventListener('bp:world-map-ready-v5940', event => { const map = event.detail && event.detail.map; if (map) initMap(map); });
  attach();
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    if (window.__BP_ICONIC_WONDERS_V1__) { clearInterval(poll); return; }
    attach();
    if (attempts >= 90) clearInterval(poll);
  }, 500);
})();
