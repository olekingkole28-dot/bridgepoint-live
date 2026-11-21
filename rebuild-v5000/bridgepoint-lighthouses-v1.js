/* BridgePoint lighthouse scan catalogue v3.
 * Map pins point to real, publicly hosted 3D scan/tour assets.
 * No procedural lighthouse geometry or remote location scraping.
 */
const VERSION = 'photogrammetry-v3';
const STATES = new WeakMap();
const SOURCE = 'bp-lighthouse-scan-source-v3';
const ICON = 'bp-lighthouse-scan-icon-v3';
const MARKER = 'bp-lighthouse-scan-markers-v3';
const LABEL = 'bp-lighthouse-scan-labels-v3';
const CONTROL = 'bpv-lighthouses-scan-control-v3';
const BUTTON = 'bpv-lighthouses-scan-button-v3';
const STYLE = 'bp-lighthouses-scan-style-v3';

function sf(id, label, kind, sourceUrl) {
  return {
    label, kind,
    url: 'https://sketchfab.com/models/' + id + '/embed?autostart=1&preload=1&ui_infos=0',
    sourceUrl
  };
}
function mp(id, label) {
  return {
    label: label || 'Interior 3D walkthrough',
    kind: 'Matterport 360° interior walkthrough',
    url: 'https://my.matterport.com/show/?m=' + id + '&play=1',
    sourceUrl: 'https://my.matterport.com/show/?m=' + id
  };
}
function kiri(id, label) {
  return {
    label: label || 'Official site 3D Gaussian splat',
    kind: 'Image-based 3D Gaussian splat (not a photogrammetry mesh)',
    url: 'https://www.kiriengine.app/share/3dgsEmbed/' + id,
    sourceUrl: 'https://www.kiriengine.app/share/3dgsEmbed/' + id
  };
}
function luma(id, label) {
  const url = 'https://lumalabs.ai/embed/' + id + '?background=%23666e76&cinematicVideo=undefined&color=%23FFFFFF&infoPosition=bottom-right&loadBg=true&logoPosition=bottom-left&mode=sparkles&showMenu=false&showTitle=true';
  return { label, kind: 'Image-based 3D scene capture', url, sourceUrl: url };
}

export const DATA = Object.freeze([
  {
    id: 'alnes-norway', name: 'Alnes Lighthouse', country: 'Norway',
    coordinates: [5.96733, 62.48996],
    description: 'Historic lighthouse station on Godøy, west of Ålesund. The public catalogue includes an official lighthouse model and an interior walk-through.',
    capture: 'Official Kystverkmusea 3D model; the model page does not identify its exact capture method. The station digitization project combines photogrammetry, 3D scanning, 360° cameras and drone imagery.',
    coverage: 'The model view shows the lighthouse structure. The separate Matterport view covers interior spaces. Exterior route coverage is not confirmed.',
    approach: 'The viewer does not establish the full walking approach to the station.',
    sourceUrl: 'https://fyr.kystverket.no/en/alnes/fyr/',
    models: [
      sf('8d9464d5288a4173beaaaf94cecc498b', 'Lighthouse 3D model', 'Official Kystverkmusea 3D model; per-model capture method not stated', 'https://fyr.kystverket.no/en/alnes/fyr/'),
      mp('oNZ5k8J1mMU')
    ]
  },
  {
    id: 'aniva-russia', name: 'Aniva Lighthouse', country: 'Russia · Sakhalin',
    coordinates: [143.414077, 46.018885],
    description: 'Remote offshore lighthouse on a rock at the southeast tip of Sakhalin. The public model was reconstructed from crowdsourced photographs and video.',
    capture: 'Photogrammetry processed in Metashape from mixed photo and video sources; some fine details were modeled or reprojected during cleanup.',
    coverage: 'Exterior tower and rock setting. No interior scan or landing path is included in the published model.',
    approach: 'Offshore sea approach to Sivuchya Rock; no overland path.',
    sourceUrl: 'https://sketchfab.com/3d-models/aniva-light-house-092213041f504051a2464c425ce8ad58',
    models: [
      sf('092213041f504051a2464c425ce8ad58', 'Aniva photogrammetry model', 'Crowdsourced photo/video photogrammetry', 'https://sketchfab.com/3d-models/aniva-light-house-092213041f504051a2464c425ce8ad58')
    ]
  },
  {
    id: 'erie-land-usa', name: 'Erie Land Lighthouse', country: 'United States · Pennsylvania',
    coordinates: [-80.06225, 42.143917],
    description: 'The original Presque Isle light overlooking Lake Erie and the entrance to Presque Isle Bay.',
    capture: 'Hybrid 3D capture: elevated drone imagery plus terrestrial laser scanning. This is a real scan, but not a photogrammetry-only model.',
    coverage: 'Elevated exterior context and detailed ground-level spatial capture. The project source does not confirm full interior coverage or the full approach path.',
    approach: 'On the Lake Erie shore at the historic harbor entrance.',
    sourceUrl: 'https://var.psu.edu/portfolio-items/lake-erie-lighthouse-scan/',
    models: [
      sf('a61c0c8c840d4fe4be794b275c1a4f9d', 'Erie Land Lighthouse hybrid scan', 'Drone imaging + terrestrial laser scan', 'https://var.psu.edu/portfolio-items/lake-erie-lighthouse-scan/')
    ]
  },
  {
    id: 'fugloykalven-norway', name: 'Fugløykalven Lighthouse', country: 'Norway',
    coordinates: [20.15351, 70.31675],
    description: 'Remote lighthouse in the outer waters north of Tromsø, digitally documented as an inaccessible station.',
    capture: 'Interior Matterport 3D walkthrough. The broader Kystverkmusea station documentation uses 3D scanners, photogrammetry, 360° cameras and drone imagery; this tour is not itself a photogrammetry mesh.',
    coverage: 'Interior walkthrough. Exterior island and approach-route coverage are not confirmed by this tour.',
    approach: 'Remote island approach by sea.',
    sourceUrl: 'https://fyr.kystverket.no/en/fugloeykalven/',
    models: [mp('Usf5vCMBmSR')]
  },
  {
    id: 'geitungen-norway', name: 'Geitungen Lighthouse', country: 'Norway',
    coordinates: [5.24268, 59.13148],
    description: 'Historic lighthouse station on a small island northwest of Stavanger, with official exterior 3D views and an interior walkthrough.',
    capture: 'Official Kystverkmusea 3D model and site-level 3D Gaussian splat; the station documentation project combines photogrammetry, 3D scanning, 360° cameras and drone imagery.',
    coverage: 'Exterior tower/site splat and interior walkthrough are available as separate views. The published mesh listing does not specify whether the landing path is captured.',
    approach: 'Island approach; path coverage is not verified in the hosted models.',
    sourceUrl: 'https://fyr.kystverket.no/en/geitungen/',
    models: [
      sf('387fbfbf93de4a738cab75fc5059af7c', 'Official lighthouse 3D model', 'Official Kystverkmusea model; exact mesh capture mix not stated', 'https://fyr.kystverket.no/en/geitungen/'),
      kiri('1820021419568791552', 'Exterior/site 3D Gaussian splat'),
      mp('KUrzaaqWnEB')
    ]
  },
  {
    id: 'golleneset-norway', name: 'Golleneset Lighthouse', country: 'Norway',
    coordinates: [5.5575, 62.373889],
    description: 'Lighthouse at the north point of Nerlandsøya. A marked walking route passes coastal pasture and a protected Bronze Age burial mound before reaching the ocean-facing site.',
    capture: 'Official lighthouse 3D model and an image-based site capture. Kystverkmusea’s broader station digitization uses photogrammetry, 3D scanning, 360° cameras and drone imagery; the individual model page does not publish a method breakdown.',
    coverage: 'Old tower model plus a 3D scene view. A separate public trail description documents the walking approach, but the path is not confirmed as part of the 3D capture.',
    approach: 'Marked walk from the end of Hamnevegen in Kvalsvika, over pasture and past Kjemperøysa.',
    sourceUrl: 'https://morotur.no/en/tur/golleneset-paa-nerlandsoey',
    models: [
      sf('af59850a12584c62a7db5dc07bdb0d72', 'Golleneset lighthouse scan model', 'Official Kystverkmusea 3D model; per-model capture method not stated', 'https://fyr.kystverket.no/en/gollenes/'),
      kiri('1785283138042200064', 'Old tower 3D Gaussian splat')
    ]
  },
  {
    id: 'grip-norway', name: 'Grip Lighthouse', country: 'Norway',
    coordinates: [7.60917, 63.23361],
    description: 'Red iron lighthouse on a stone base in the exposed Grip archipelago outside Kristiansund.',
    capture: 'Image-based Luma 3D scene capture published by Kystverkmusea; the capture page does not specify whether the source imagery was processed as a photogrammetry mesh.',
    coverage: 'Hosted 3D scene view of the lighthouse and its immediate setting. Interior and full approach coverage are not stated.',
    approach: 'Island approach by sea; the hosted capture does not document a landing route.',
    sourceUrl: 'https://kystverkmusea.no/digitale-utstillinger/digital-dokumentasjon',
    models: [luma('d336a0ae-92e5-40dc-a486-6f7f36907162', 'Grip lighthouse 3D scene')]
  },
  {
    id: 'hellisoy-norway', name: 'Hellisøy Lighthouse', country: 'Norway',
    coordinates: [4.7104, 60.75217],
    description: 'Historic lighthouse station at Fedje, northwest of Bergen, with official exterior and interior digital views.',
    capture: 'Official Kystverkmusea 3D model and site-level 3D Gaussian splat; the station digitization project combines photogrammetry, 3D scanning, 360° cameras and drone imagery.',
    coverage: 'Exterior/site splat and interior walk-through are separate views. The exact extent of the approach route is not stated.',
    approach: 'Island approach; complete landing and path capture is not confirmed.',
    sourceUrl: 'https://fyr.kystverket.no/en/hellisoey/',
    models: [
      sf('f1a3066053e14ec9a04304d369afe2d9', 'Official lighthouse 3D model', 'Official Kystverkmusea model; exact mesh capture mix not stated', 'https://fyr.kystverket.no/en/hellisoey/'),
      kiri('1869656356655464448', 'Exterior/site 3D Gaussian splat'),
      mp('mhWdfYQyrTP')
    ]
  },
  {
    id: 'jomfruland-norway', name: 'Jomfruland Old Lighthouse', country: 'Norway',
    coordinates: [9.59637, 58.86511],
    description: 'The 1839 tower at Jomfruland. The published mesh was made from 125 images; an interior walk-through is also available.',
    capture: 'Photogrammetry processed in RealityScan from 125 images for the old tower model.',
    coverage: 'Photogrammetry tower mesh plus a separate interior 3D walkthrough. The mesh listing does not establish whether the full island approach is included.',
    approach: 'Island approach; the hosted scan does not confirm the full route to the tower.',
    sourceUrl: 'https://sketchfab.com/3d-models/jomfruland-fyr-gamle-fyrtarnet-fra-1839-f0b53e0da816498f8bb835bf253911aa',
    models: [
      sf('f0b53e0da816498f8bb835bf253911aa', 'Jomfruland photogrammetry mesh', 'Photogrammetry · 125 images · RealityScan', 'https://sketchfab.com/3d-models/jomfruland-fyr-gamle-fyrtarnet-fra-1839-f0b53e0da816498f8bb835bf253911aa'),
      mp('5XS9iCSC4Uz')
    ]
  },
  {
    id: 'kaura-norway', name: 'Kaura Lighthouse', country: 'Norway',
    coordinates: [10.13327, 64.23012],
    description: 'Lighthouse on a small offshore islet in the mouth of Brandsfjorden, in Trøndelag.',
    capture: 'Official Kystverkmusea interior walk-through plus a KIRI image-based 3D Gaussian splat; the splat is a real 3D scene capture, not a textured photogrammetry mesh.',
    coverage: 'Interior and exterior/site views are available separately. The published model does not confirm the full sea-landing route.',
    approach: 'Offshore islet approach by sea; route coverage is not stated.',
    sourceUrl: 'https://fyr.kystverket.no/en/kaura/',
    models: [
      kiri('1822935793274978304', 'Kaura exterior/site 3D Gaussian splat'),
      mp('JrTX8WJDCK8')
    ]
  },
  {
    id: 'lepsoyrevet-norway', name: 'Lepsøyrevet Lighthouse', country: 'Norway',
    coordinates: [6.264282, 62.58949],
    description: 'Former coastal light built in 1879 to guide ships through the shallow Lepsøyrevet channel north of Ålesund.',
    capture: 'Two public Kystverkmusea Sketchfab 3D models of the lighthouse. Their listing identifies them as 3D models but does not publish the capture method.',
    coverage: 'Tower/site models; interior and approach-path coverage are not confirmed.',
    approach: 'The lighthouse marks a shallow sea channel; no scanned land or sea approach is confirmed in the model listings.',
    sourceUrl: 'https://kystverkmusea.no/digitale-utstillinger/digital-dokumentasjon',
    models: [
      sf('f6cd36b671f44931823fcf764b83a8d4', 'Lepsøyrevet lighthouse 2022', 'Kystverkmusea 3D model; exact capture method not stated', 'https://kystverkmusea.no/digitale-utstillinger/digital-dokumentasjon'),
      sf('1aa7859e0e114c62b5a2a1a841e747a1', 'Lepsøyrevet lighthouse 2022 · alternate view', 'Kystverkmusea 3D model; exact capture method not stated', 'https://kystverkmusea.no/digitale-utstillinger/digital-dokumentasjon')
    ]
  },
  {
    id: 'mabana-shima-japan', name: 'Mabana Shima Lighthouse', country: 'Japan · Mie',
    coordinates: [136.683333, 34.316667],
    description: 'Small white lighthouse on an uninhabited rocky islet off Nakatsuhamaura in Minami-Ise.',
    capture: 'Photogrammetry model created for the Tokiwatari cultural-preservation project using drone photography.',
    coverage: 'Photogrammetry captures the tower and its surface; the published model does not include an interior or full island approach.',
    approach: 'Rocky-islet approach; local descriptions mention viewing from shore and approaching by kayak/SUP. The model does not scan the route.',
    sourceUrl: 'https://tokiwatari.jp/site/mabanajima/',
    models: [
      sf('bfdc407529c84c2080c5dad5b88ec40d', 'Mabana Shima photogrammetry model', 'Photogrammetry + drone photography', 'https://tokiwatari.jp/site/mabanajima/')
    ]
  },
  {
    id: 'myken-norway', name: 'Myken Lighthouse', country: 'Norway',
    coordinates: [12.47697, 66.76453],
    description: 'Historic lighthouse on Jutøya, with official tower/site models and an interior walkthrough.',
    capture: 'Official Kystverkmusea lighthouse model and KIRI 3D Gaussian splat. The national station digitization project combines photogrammetry, 3D scanning, 360° cameras and drone imagery.',
    coverage: 'Exterior tower/site and interior walk-through are available in separate views; the path from the landing point is not confirmed.',
    approach: 'Island approach by sea; full route to the station is not verified in the hosted captures.',
    sourceUrl: 'https://fyr.kystverket.no/en/myken/',
    models: [
      sf('a8e8d0cfec854c4e90cdce6080fdc86d', 'Official lighthouse 3D model', 'Official Kystverkmusea model; exact mesh capture mix not stated', 'https://fyr.kystverket.no/en/myken/'),
      kiri('1853411349745369088', 'Exterior/site 3D Gaussian splat'),
      mp('zbWTRnFBYVc')
    ]
  },
  {
    id: 'nordoyan-norway', name: 'Nordøyan Lighthouse', country: 'Norway',
    coordinates: [10.54759, 64.79845],
    description: 'Remote lighthouse station west of Rørvik, with an interior 3D walkthrough and an official station model.',
    capture: 'Matterport 360° interior walkthrough; Kystverkmusea lighthouse digitization uses photogrammetry, 3D scanning, 360° cameras and drone imagery. This tour is not a photogrammetry mesh.',
    coverage: 'Interior walk-through. Exterior route and island approach coverage are not confirmed.',
    approach: 'Remote island approach by sea.',
    sourceUrl: 'https://fyr.kystverket.no/en/nordoeyan/',
    models: [mp('E6s2afEHnBy')]
  },
  {
    id: 'oksoy-norway', name: 'Oksøy Lighthouse', country: 'Norway',
    coordinates: [8.05282, 58.07229],
    description: 'Offshore lighthouse south of Kristiansand, with an interior 3D station walk-through.',
    capture: 'Matterport 360° interior walkthrough. The tour is an indoor scene capture, not an exterior photogrammetry mesh.',
    coverage: 'Interior walk-through; surrounding island and landing route are not confirmed by the tour.',
    approach: 'Offshore island approach by sea.',
    sourceUrl: 'https://fyr.kystverket.no/en/oksoey/',
    models: [mp('WmUqaByPGQA')]
  },
  {
    id: 'ryvarden-norway', name: 'Ryvarden Lighthouse', country: 'Norway',
    coordinates: [5.22516, 59.52693],
    description: 'Lighthouse and coastal cultural site on the western shore of Sveio, reached by a marked coastal walk.',
    capture: 'Matterport 360° interior walkthrough; not a photogrammetry mesh.',
    coverage: 'Interior walkthrough. A separate public visitor description documents the coastal approach, but the route is not confirmed in the 3D tour.',
    approach: 'Coastal walking approach from the parking area; the hosted tour does not confirm the entire trail is captured.',
    sourceUrl: 'https://www.visitnorway.com/listings/ryvarden-lighthouse/501858/',
    models: [mp('obFvjxN93A3')]
  },
  {
    id: 'skalmen-norway', name: 'Skalmen Lighthouse', country: 'Norway',
    coordinates: [7.75694, 63.47194],
    description: 'Exposed lighthouse station in Smøla Municipality, Møre og Romsdal.',
    capture: 'Matterport 360° interior walkthrough; not a photogrammetry mesh.',
    coverage: 'Interior walkthrough. Exterior islet and access route are not confirmed in the hosted tour.',
    approach: 'Offshore islet approach by sea.',
    sourceUrl: 'https://fyr.kystverket.no/en/skalmen/',
    models: [mp('TLLPhq79ZEP')]
  },
  {
    id: 'stavernsodden-norway', name: 'Stavernsodden Lighthouse', country: 'Norway',
    coordinates: [10.05228, 58.98739],
    description: 'Historic station near Stavern, with an official exterior model, site-level scene and interior walkthrough.',
    capture: 'Official Kystverkmusea 3D model and KIRI 3D Gaussian splat; the station digitization project combines photogrammetry, scanners, 360° cameras and drone imagery.',
    coverage: 'Exterior/site and interior views are separate; the access path is not confirmed in the hosted models.',
    approach: 'Coastal-island station; full approach coverage is not established.',
    sourceUrl: 'https://fyr.kystverket.no/en/stavernsodden/',
    models: [
      sf('b8750d88a9184a95ab53573586bf78a0', 'Official lighthouse 3D model', 'Official Kystverkmusea model; exact mesh capture mix not stated', 'https://fyr.kystverket.no/en/stavernsodden/'),
      kiri('1937819091372867584', 'Exterior/site 3D Gaussian splat'),
      mp('YK7NFmtY9f9')
    ]
  },
  {
    id: 'store-torungen-norway', name: 'Store Torungen Lighthouse', country: 'Norway',
    coordinates: [8.79025, 58.39885],
    description: 'Historic lighthouse on Store Torungen island at the entrance to Arendal.',
    capture: 'Matterport 360° interior walkthrough; not a photogrammetry mesh.',
    coverage: 'Interior walkthrough; island exterior and approach route are not confirmed.',
    approach: 'Island approach by sea.',
    sourceUrl: 'https://fyr.kystverket.no/en/store-torungen/',
    models: [mp('492vHsqmVSi')]
  },
  {
    id: 'stromtangen-fredrikstad-norway', name: 'Strømtangen Lighthouse · Fredrikstad', country: 'Norway',
    coordinates: [10.82939, 59.15105],
    description: 'Lighthouse station outside Fredrikstad with an interior 3D walkthrough.',
    capture: 'Matterport 360° interior walkthrough; not a photogrammetry mesh.',
    coverage: 'Interior walkthrough; shoreline approach and surrounding site coverage are not confirmed.',
    approach: 'Coastal station approached over water; full path/landing capture is not confirmed.',
    sourceUrl: 'https://fyr.kystverket.no/en/stroemtangen/',
    models: [mp('jegug5XP4TM')]
  },
  {
    id: 'svinoy-norway', name: 'Svinøy Lighthouse', country: 'Norway',
    coordinates: [5.26746, 62.3276],
    description: 'Offshore lighthouse on Svinøy, with an interior station walkthrough.',
    capture: 'Matterport 360° interior walkthrough; not a photogrammetry mesh.',
    coverage: 'Interior walkthrough; exterior island and approach route are not confirmed.',
    approach: 'Remote island approach by sea.',
    sourceUrl: 'https://fyr.kystverket.no/en/svinoy/',
    models: [mp('K5Cbov17i9F')]
  },
  {
    id: 'villa-norway', name: 'Villa Lighthouse', country: 'Norway · Trøndelag',
    coordinates: [10.6813417, 64.545528],
    description: 'Historic lighthouse on Villa island, with an official station model and image-based 3D site capture.',
    capture: 'Official Kystverkmusea model plus KIRI 3D Gaussian splat. Kystverkmusea’s station documentation combines photogrammetry, 3D scanning, 360° cameras and drone imagery.',
    coverage: 'Exterior/site capture; interior and island approach coverage are not confirmed.',
    approach: 'Island approach by sea; full route coverage is not stated.',
    sourceUrl: 'https://fyr.kystverket.no/en/villa/',
    models: [
      sf('20ac28e2a89e4bdfa30c1d99cf415c93', 'Official lighthouse 3D model', 'Official Kystverkmusea model; exact mesh capture mix not stated', 'https://fyr.kystverket.no/en/villa/'),
      kiri('1887062231158358016', 'Exterior/site 3D Gaussian splat')
    ]
  },
  {
    id: 'westkapelle-netherlands', name: 'Westkapelle High Lighthouse', country: 'Netherlands · Zeeland',
    coordinates: [3.441, 51.529],
    description: 'The tall masonry lighthouse at Westkapelle, Zeeland.',
    capture: 'Photogrammetry model of the real lighthouse by netgis.',
    coverage: 'Exterior tower model; interior and route along the sea wall are not included in the published model.',
    approach: 'The model does not include a verified path/sea-wall approach.',
    sourceUrl: 'https://sketchfab.com/3d-models/lighthouse-t-hoge-licht-westkapelle-5e010b5eb6e2489e8f73c6353e078584',
    models: [
      sf('5e010b5eb6e2489e8f73c6353e078584', 'Westkapelle photogrammetry model', 'Photogrammetry scan', 'https://sketchfab.com/3d-models/lighthouse-t-hoge-licht-westkapelle-5e010b5eb6e2489e8f73c6353e078584')
    ]
  },
  {
    id: 'whitford-point-wales', name: 'Whitford Point Lighthouse', country: 'Wales · United Kingdom',
    coordinates: [-4.2509, 51.6526],
    description: 'Cast-iron lighthouse at the northwest tip of the Gower, exposed to the Burry Estuary.',
    capture: 'Photogrammetry survey published with RealityScan by the Royal Commission on the Ancient and Historical Monuments of Wales.',
    coverage: 'The model covers the full structure and surrounding apron. Interior and the full tidal approach are not confirmed.',
    approach: 'Tidal intertidal approach; the scan record focuses on the lighthouse/apron.',
    sourceUrl: 'https://coflein.gov.uk/en/site/34289/',
    models: [
      sf('86b514ace0664b1a97982f239c9c90bd', 'Whitford Point photogrammetry scan', 'RealityScan photogrammetry · structure and apron', 'https://coflein.gov.uk/en/site/34289/')
    ]
  },
  {
    id: 'wicklow-head-ireland', name: 'Wicklow Head Old Lighthouse', country: 'Ireland',
    coordinates: [-6.0006277, 52.965403],
    description: 'The historic 1781 lighthouse tower at Wicklow Head.',
    capture: 'RealityScan 3D model of the real historic tower; the creator does not publish a detailed capture protocol.',
    coverage: 'Exterior tower scan only; interior and full cliff approach are not confirmed in the published model.',
    approach: 'Cliff-top headland; route coverage is not confirmed by the scan.',
    sourceUrl: 'https://sketchfab.com/3d-models/wicklow-head-old-lighthouse-c5fa47953871459d80a0730ada48274f',
    models: [
      sf('c5fa47953871459d80a0730ada48274f', 'Wicklow Head old tower scan', 'RealityScan model · capture protocol not stated', 'https://sketchfab.com/3d-models/wicklow-head-old-lighthouse-c5fa47953871459d80a0730ada48274f')
    ]
  },
  {
    id: 'ytteroyane-norway', name: 'Ytterøyane Lighthouse', country: 'Norway',
    coordinates: [4.682366, 61.571272],
    description: 'Offshore lighthouse station in Kinn, Vestland, with official exterior/site models.',
    capture: 'Official Kystverkmusea lighthouse model and KIRI image-based 3D Gaussian splat; broader station documentation uses photogrammetry, scanners, 360° cameras and drone imagery.',
    coverage: 'Exterior/site views; interior and the landing path are not confirmed in the published models.',
    approach: 'Remote island approach by sea.',
    sourceUrl: 'https://fyr.kystverket.no/en/ytteroeyane/fyr/',
    models: [
      sf('e4a4a5f8d66a47479175e31b71ec4421', 'Official lighthouse 3D model', 'Official Kystverkmusea model; exact mesh capture mix not stated', 'https://fyr.kystverket.no/en/ytteroeyane/fyr/'),
      kiri('1785228350139138048', 'Exterior/site 3D Gaussian splat')
    ]
  }
]);

export const RECORD_COUNT = DATA.length;
const MAP_STATES = new WeakMap();

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}
function allowedEmbed(value) {
  try {
    const url = new URL(String(value || ''));
    const hosts = ['sketchfab.com', 'my.matterport.com', 'www.kiriengine.app', 'lumalabs.ai'];
    if (url.protocol !== 'https:' || !hosts.includes(url.hostname)) return '';
    return url.href;
  } catch (_) {
    return '';
  }
}
function asFeatureCollection() {
  return {
    type: 'FeatureCollection',
    features: DATA.map(record => ({
      type: 'Feature',
      id: record.id,
      geometry: { type: 'Point', coordinates: record.coordinates },
      properties: { recordId: record.id, name: record.name }
    }))
  };
}
const COLLECTION = asFeatureCollection();

function lighthouseIcon() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 72;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Lighthouse scan icon canvas unavailable');
  ctx.clearRect(0, 0, 72, 72);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.65)';
  ctx.shadowBlur = 7;
  ctx.fillStyle = '#10242d';
  ctx.beginPath();
  ctx.arc(36, 36, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f1c96b';
  ctx.stroke();
  ctx.fillStyle = 'rgba(250,218,135,.85)';
  ctx.beginPath();
  ctx.moveTo(9, 20);
  ctx.lineTo(29, 27);
  ctx.lineTo(29, 32);
  ctx.lineTo(9, 31);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(63, 20);
  ctx.lineTo(43, 27);
  ctx.lineTo(43, 32);
  ctx.lineTo(63, 31);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff8df';
  ctx.beginPath();
  ctx.moveTo(27, 57);
  ctx.lineTo(31, 30);
  ctx.lineTo(41, 30);
  ctx.lineTo(45, 57);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#cf554b';
  ctx.fillRect(29, 42, 14, 5);
  ctx.fillStyle = '#f1c96b';
  ctx.fillRect(28, 25, 16, 8);
  ctx.fillStyle = '#fff7de';
  ctx.fillRect(30, 17, 12, 8);
  ctx.fillStyle = '#f1c96b';
  ctx.fillRect(28, 14, 16, 3);
  ctx.fillRect(34, 10, 4, 4);
  ctx.restore();
  return canvas;
}

function ensureStyle() {
  if (document.getElementById(STYLE)) return;
  const style = document.createElement('style');
  style.id = STYLE;
  style.textContent =
    '.bp-lighthouse-scan-popup-v3 .maplibregl-popup-content{background:#11191d;color:#f3f4ef;border:1px solid rgba(241,201,107,.68);border-radius:14px;padding:12px;font:12px/1.45 system-ui,sans-serif;max-height:min(84vh,820px);overflow:auto;width:min(470px,calc(100vw - 44px));box-shadow:0 12px 45px rgba(0,0,0,.5)}' +
    '.bp-lighthouse-scan-popup-v3 .maplibregl-popup-tip{border-top-color:#11191d;border-bottom-color:#11191d}' +
    '.bp-lighthouse-scan-card-v3 h3{font-size:18px;line-height:1.2;color:#fff;margin:4px 0}' +
    '.bp-lighthouse-scan-card-v3 p{margin:7px 0;color:#d0d9d9}' +
    '.bp-lighthouse-scan-kicker-v3{font-size:9px;letter-spacing:.11em;text-transform:uppercase;font-weight:900;color:#f1c96b;margin:0}' +
    '.bp-lighthouse-scan-place-v3{color:#b6c3c4!important;margin:0 0 8px!important}' +
    '.bp-lighthouse-scan-view-v3{height:min(53vh,390px);min-height:230px;overflow:hidden;border-radius:9px;background:#080d10;margin:9px 0}' +
    '.bp-lighthouse-scan-view-v3 iframe{width:100%;height:100%;border:0}' +
    '.bp-lighthouse-scan-tabs-v3{display:flex;gap:5px;overflow:auto;padding:2px 0 4px}' +
    '.bp-lighthouse-scan-tabs-v3 button{flex:none;background:#202d32;border:1px solid #43545a;border-radius:7px;color:#eaf0ee;padding:6px 8px;font:700 10px/1.2 system-ui;cursor:pointer}' +
    '.bp-lighthouse-scan-tabs-v3 button[aria-selected=true]{background:#574824;border-color:#e4bc5a;color:#fff6d8}' +
    '.bp-lighthouse-scan-details-v3{display:grid;gap:6px;margin:10px 0}' +
    '.bp-lighthouse-scan-details-v3 div{display:grid;grid-template-columns:92px 1fr;gap:8px;align-items:start}' +
    '.bp-lighthouse-scan-details-v3 b{color:#f1c96b}' +
    '.bp-lighthouse-scan-note-v3{font-size:10px;color:#aebbbc!important}' +
    '.bp-lighthouse-scan-link-v3{color:#f6d987;font-weight:800}' +
    '#'+BUTTON+'.is-active{border-color:rgba(241,201,107,.9);background:rgba(89,71,30,.62);box-shadow:inset 0 0 0 1px rgba(241,201,107,.28)}';
  document.head.appendChild(style);
}

function cardHtml(record) {
  const first = record.models[0];
  const initialUrl = allowedEmbed(first && first.url);
  const tabs = record.models.map((model, index) => {
    return '<button type="button" data-lighthouse-scan-index="' + index + '" data-lighthouse-scan-url="' +
      escapeHtml(allowedEmbed(model.url)) + '" aria-selected="' + String(index === 0) + '">' +
      escapeHtml(model.label) + '</button>';
  }).join('');
  const source = record.sourceUrl && /^https:\/\//.test(record.sourceUrl)
    ? '<p><a class="bp-lighthouse-scan-link-v3" href="' + escapeHtml(record.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Capture and location source ↗</a></p>' : '';
  const models = record.models.map((model, index) => {
    const link = model.sourceUrl && /^https:\/\//.test(model.sourceUrl)
      ? '<a class="bp-lighthouse-scan-link-v3" href="' + escapeHtml(model.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Source ↗</a>' : '';
    return '<div data-lighthouse-model-details="' + index + '" ' + (index ? 'hidden' : '') +
      '><b>Viewer:</b> ' + escapeHtml(model.kind) + ' ' + link + '</div>';
  }).join('');
  return '<article class="bp-lighthouse-scan-card-v3">' +
    '<p class="bp-lighthouse-scan-kicker-v3">BridgePoint · Lighthouse scan record ' + escapeHtml(record.id) + '</p>' +
    '<h3>' + escapeHtml(record.name) + '</h3>' +
    '<p class="bp-lighthouse-scan-place-v3">' + escapeHtml(record.country) + ' · ' +
      Number(record.coordinates[1]).toFixed(5) + ', ' + Number(record.coordinates[0]).toFixed(5) + '</p>' +
    '<p>' + escapeHtml(record.description) + '</p>' +
    '<div class="bp-lighthouse-scan-tabs-v3" role="tablist" aria-label="Lighthouse 3D capture views">' + tabs + '</div>' +
    '<div class="bp-lighthouse-scan-view-v3"><iframe title="' + escapeHtml(record.name + ' 3D viewer') +
      '" src="' + escapeHtml(initialUrl) + '" loading="eager" allow="autoplay; fullscreen; xr-spatial-tracking; accelerometer; gyroscope" allowfullscreen></iframe></div>' +
    '<div class="bp-lighthouse-scan-details-v3">' +
      '<div><b>Capture</b><span>' + escapeHtml(record.capture) + '</span></div>' +
      '<div><b>Coverage</b><span>' + escapeHtml(record.coverage) + '</span></div>' +
      '<div><b>Approach</b><span>' + escapeHtml(record.approach) + '</span></div>' +
      '<div><b>View type</b><span data-lighthouse-model-details="active">' + escapeHtml(first.kind) + '</span></div>' +
      '<div><b>Location</b><span>Pin from published lighthouse coordinates; map marker stays fixed to the station at every zoom.</span></div>' +
    '</div>' + models + source +
    '<p class="bp-lighthouse-scan-note-v3">Embedded public capture by its credited publisher. A viewer is shown only where a public model or walkthrough is linked; unsurveyed geometry is not filled in.</p>' +
    '</article>';
}

function addLayers(map) {
  if (!map.getSource(SOURCE)) map.addSource(SOURCE, {
    type: 'geojson', data: COLLECTION, tolerance: 0.1,
    attribution: 'Lighthouse scan sources: Kystverkmusea, Sketchfab model creators, Matterport, and named public project sources'
  });
  if (typeof map.hasImage === 'function' && !map.hasImage(ICON)) {
    map.addImage(ICON, lighthouseIcon(), { pixelRatio: 2 });
  }
  if (!map.getLayer(MARKER)) map.addLayer({
    id: MARKER, type: 'symbol', source: SOURCE,
    minzoom: 0, maxzoom: 24,
    layout: {
      'icon-image': ICON,
      'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.35, 3, 0.43, 7, 0.60, 12, 0.74, 18, 0.9],
      'icon-anchor': 'center', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      'icon-padding': 0
    },
    paint: { 'icon-opacity': 1 }
  });
  if (!map.getLayer(LABEL)) map.addLayer({
    id: LABEL, type: 'symbol', source: SOURCE, minzoom: 4.5, maxzoom: 24,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 4.5, 10, 9, 12, 15, 13],
      'text-offset': [0, 1.35], 'text-anchor': 'top',
      'text-max-width': 12, 'text-optional': true,
      'text-allow-overlap': false, 'text-ignore-placement': false
    },
    paint: {
      'text-color': '#fff4d1', 'text-halo-color': '#182126',
      'text-halo-width': 1.5, 'text-halo-blur': 0.4
    }
  });
}

function setVisible(map, visible) {
  for (const layer of [MARKER, LABEL]) {
    if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none');
  }
}

function ensureButton(state) {
  const dock = document.getElementById('bpv-dock-actions');
  if (!dock) return false;
  ensureStyle();
  if (document.getElementById(CONTROL)) return true;
  const section = document.createElement('section');
  section.id = CONTROL;
  section.className = 'bpv-command-group';
  section.setAttribute('data-bpv-command-section', 'lighthouses');
  section.setAttribute('aria-label', 'Lighthouses');
  section.innerHTML = '<div class="bpv-command-grid"><button id="' + BUTTON +
    '" type="button" class="bpv-command-btn" aria-pressed="false" title="Show lighthouse scan pins">' +
    '<span class="bpv-command-icon" aria-hidden="true">⚓</span>' +
    '<span class="bpv-command-label">Lighthouses</span></button></div>';
  dock.appendChild(section);
  const button = section.querySelector('#' + BUTTON);
  button.addEventListener('click', () => setEnabled(state, !state.enabled));
  return true;
}

function popup(state, record, lngLat) {
  const Popup = window.maplibregl && window.maplibregl.Popup;
  if (!Popup) return;
  state.popup && state.popup.remove();
  state.popup = new Popup({
    closeButton: true, closeOnClick: true, maxWidth: '500px',
    className: 'bp-lighthouse-scan-popup-v3'
  }).setLngLat(lngLat || record.coordinates).setHTML(cardHtml(record)).addTo(state.map);
  const root = state.popup.getElement && state.popup.getElement().querySelector('.bp-lighthouse-scan-card-v3');
  if (!root) return;
  root.addEventListener('click', event => {
    const tab = event.target.closest && event.target.closest('[data-lighthouse-scan-index]');
    if (!tab) return;
    const index = Number(tab.getAttribute('data-lighthouse-scan-index'));
    const model = record.models[index];
    const url = allowedEmbed(tab.getAttribute('data-lighthouse-scan-url'));
    if (!model || !url) return;
    const frame = root.querySelector('.bp-lighthouse-scan-view-v3 iframe');
    if (frame) frame.src = url;
    root.querySelectorAll('[data-lighthouse-scan-index]').forEach(node => {
      node.setAttribute('aria-selected', String(node === tab));
    });
    const kind = root.querySelector('[data-lighthouse-model-details="active"]');
    if (kind) kind.textContent = model.kind;
  });
}

function install(state) {
  const map = state.map;
  if (state.dead || !map.getStyle || !map.getStyle()) return false;
  try {
    addLayers(map);
    setVisible(map, state.enabled);
    state.status = 'ready';
    return true;
  } catch (error) {
    state.status = 'map-layer-unavailable';
    state.lastError = String(error && error.message || error);
    console.warn('BridgePoint lighthouse scan pins could not attach', error);
    return false;
  }
}

function setEnabled(state, value) {
  state.enabled = Boolean(value);
  if (state.enabled) install(state);
  setVisible(state.map, state.enabled);
  const button = document.getElementById(BUTTON);
  if (button) {
    button.setAttribute('aria-pressed', String(state.enabled));
    button.classList.toggle('is-active', state.enabled);
  }
  if (!state.enabled && state.popup) {
    state.popup.remove();
    state.popup = null;
  }
  state.status = state.enabled ? 'ready' : 'off';
  return state.enabled;
}

export function initLighthouseRenderer(target) {
  const map = target && (target.map || target);
  if (!map || typeof map.addSource !== 'function' || typeof map.getBounds !== 'function') return null;
  const previous = MAP_STATES.get(map);
  if (previous) return previous.api;
  ensureStyle();
  const state = { map, enabled: false, dead: false, status: 'off', lastError: null, popup: null, observer: null, retry: 0 };
  state.click = event => {
    if (!state.enabled || !map.queryRenderedFeatures) return;
    const hits = map.queryRenderedFeatures(event.point, { layers: [MARKER] }) || [];
    const id = hits.length && hits[0].properties && String(hits[0].properties.recordId);
    const record = DATA.find(item => item.id === id);
    if (record) popup(state, record, event.lngLat || record.coordinates);
  };
  state.hover = event => {
    if (!state.enabled || !map.getLayer(MARKER) || !map.queryRenderedFeatures) return;
    const hit = (map.queryRenderedFeatures(event.point, { layers: [MARKER] }) || []).length > 0;
    map.getCanvas().style.cursor = hit ? 'pointer' : '';
  };
  state.style = () => { if (state.enabled) install(state); };
  state.persist = () => {
    if (state.dead || !state.enabled || state.frame) return;
    const raf = window.requestAnimationFrame || (callback => setTimeout(callback, 16));
    state.frame = raf(() => {
      state.frame = 0;
      if (!state.dead && state.enabled && (!map.isStyleLoaded || map.isStyleLoaded())) install(state);
    });
  };
  map.on('click', state.click);
  map.on('mousemove', state.hover);
  map.on('style.load', state.style);
  map.on('load', state.style);
  for (const eventName of ['styledata', 'idle', 'moveend', 'zoomend', 'rotateend', 'pitchend']) {
    map.on(eventName, state.persist);
  }
  const retryButton = () => {
    if (state.dead || ensureButton(state)) return;
    state.retry = setTimeout(retryButton, 500);
  };
  retryButton();
  if (typeof MutationObserver !== 'undefined' && document.body) {
    state.observer = new MutationObserver(() => {
      if (!state.dead && !document.getElementById(CONTROL)) ensureButton(state);
    });
    state.observer.observe(document.body, { childList: true, subtree: true });
  }
  const api = {
    version: VERSION,
    get enabled() { return state.enabled; },
    get status() { return state.status; },
    get stats() {
      return {
        version: VERSION, records: DATA.length,
        photogrammetryRecords: DATA.filter(item => item.models.some(model => /photogrammetry/i.test(model.kind))).length,
        walkthroughs: DATA.filter(item => item.models.some(model => /Matterport/i.test(model.kind))).length,
        markerLayerReady: Boolean(map.getLayer(MARKER)),
        lastError: state.lastError
      };
    },
    toggle() { return setEnabled(state, !state.enabled); },
    setEnabled(value) { return setEnabled(state, value); },
    refresh() {
      const source = map.getSource(SOURCE);
      if (source && source.setData) source.setData(COLLECTION);
      return api.stats;
    },
    destroy() {
      state.dead = true;
      if (state.retry) clearTimeout(state.retry);
      if (state.frame) (window.cancelAnimationFrame || clearTimeout)(state.frame);
      state.popup && state.popup.remove();
      map.off('click', state.click);
      map.off('mousemove', state.hover);
      map.off('style.load', state.style);
      map.off('load', state.style);
      for (const eventName of ['styledata', 'idle', 'moveend', 'zoomend', 'rotateend', 'pitchend']) {
        map.off(eventName, state.persist);
      }
      state.observer && state.observer.disconnect();
      for (const layer of [LABEL, MARKER]) if (map.getLayer(layer)) map.removeLayer(layer);
      if (map.getSource(SOURCE)) map.removeSource(SOURCE);
      if (map.hasImage && map.hasImage(ICON)) map.removeImage(ICON);
      document.getElementById(CONTROL) && document.getElementById(CONTROL).remove();
      document.getElementById(STYLE) && document.getElementById(STYLE).remove();
      MAP_STATES.delete(map);
    }
  };
  state.api = api;
  MAP_STATES.set(map, state);
  window.__BP_LIGHTHOUSES_V1__ = api;
  if (map.isStyleLoaded && map.isStyleLoaded()) state.status = 'off';
  return api;
}
