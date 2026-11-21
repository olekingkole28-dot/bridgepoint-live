/* BridgePoint Shipwrecks v5 — Titanic + Robert Gaskin + HMS Grafton + Kanonvraget + Timaru + HMS Loo.
 * Each wreck has a persistent marker, dedicated source-backed card and native underwater model.
 */
const VERSION=14, MAP_STATES=new WeakMap();
const THREE_URL='/vendor/three.module.js?v=169-local';
const GLTF_URL='/vendor/GLTFLoader.bundle.js?v=169-local';
const DRACO_URL='/vendor/DRACOLoader.bundle.js?v=169-draco-v1';
const KTX2_URL='/vendor/KTX2Loader.bundle.js?v=169-ktx2-v1';
const NATIVE_MODEL_LAYER_ID='bp-shipwrecks-native-model-v2';
const ROBERT_GASKIN_ASSET='/assets/shipwrecks/robert-gaskin-photogrammetry.glb.gz';
const ROBERT_GASKIN_LENGTH_M=40.42;
const HMS_GRAFTON_ASSET='/assets/shipwrecks/hms-grafton-photogrammetry.glb.gz';
const CANNON_ASSET='/assets/shipwrecks/cannon-photogrammetry.glb.gz';
const KXI_ASSET='/assets/shipwrecks/hnlms-kxi-photogrammetry.glb.gz';
const CAPE_OTWAY_ASSET='/assets/shipwrecks/cape-otway-photogrammetry.glb.gz';
const TIMARU_ASSET='/assets/shipwrecks/timaru-photogrammetry.glb.gz';
const HMS_LOO_ASSET='/assets/shipwrecks/hms-loo-photogrammetry.glb.gz';
let shipwreckThreePromise=null;
const SOURCE_ID='bp-shipwrecks-titanic-source-v1';
const HALO_ID='bp-shipwrecks-titanic-halo-v1';
const MARKER_ID='bp-shipwrecks-titanic-markers-v1';
const LABEL_ID='bp-shipwrecks-titanic-labels-v1';
const CONTROL_ID='bp-shipwrecks-control-v1';
const TOGGLE_ID='bp-shipwrecks-toggle-v1';
const COUNT_ID='bp-shipwrecks-count-v1';
const STATUS_ID='bp-shipwrecks-status-v1';
const ICON_ID='bp-shipwrecks-icon-v2';

export const TITANIC_SHIPWRECK_PARTS=[
 {id:'titanic-bow',name:'RMS Titanic — Bow section',label:'TITANIC · BOW',part:'bow',coordinates:[-49.946944444444,41.7325],
  coordinateText:'41° 43′ 57″ N, 49° 56′ 49″ W',depthM:3800,defaultModelId:'titanic-bow-photogrammetry',
  locationPrecision:'NOAA 2004 Titanic Expedition waypoint: center of the bow section.'},
 {id:'titanic-stern',name:'RMS Titanic — Stern section',label:'TITANIC · STERN',part:'stern',coordinates:[-49.948333333333,41.726388888889],
  coordinateText:'41° 43′ 35″ N, 49° 56′ 54″ W',depthM:3800,defaultModelId:'titanic-stern-photogrammetry',
  locationPrecision:'NOAA 2004 Titanic Expedition waypoint: center of the stern section.'},
 {id:'titanic-debris',name:'RMS Titanic — Debris-field center',label:'TITANIC · DEBRIS FIELD',part:'debris',coordinates:[-49.946944444444,41.725555555556],
  coordinateText:'41° 43′ 32″ N, 49° 56′ 49″ W',depthM:3800,defaultModelId:null,
  locationPrecision:'NOAA 2004 Titanic Expedition waypoint: center of the debris field. No separate debris-field mesh is included in this release.'}
];

export const ROBERT_GASKIN_WRECK={
 id:'robert-gaskin',name:'Robert Gaskin — 1889 wooden barque',label:'ROBERT GASKIN',
 part:'hull',coordinates:[-75.677083,44.589317],
 coordinateText:'44° 35′ 21.54″ N, 75° 40′ 37.50″ W',
 depthM:19.8,depthRangeM:[18.3,21.3],waterSurfaceElevationM:74.64,verticalDatum:'IGLD 1985',waterSurfaceReferenceDate:'2026-11-16',lengthM:40.42,beamM:8.02,
 sourcePhotos:49000,triangles:598600,vertices:322800,license:'CC BY 4.0',creator:'Christian Rémillard',
 sourceUrl:'https://sketchfab.com/3d-models/robert-gaskin-wreck-1916420a764c4e73b754755d7f2780ce',
 datasetUrl:'https://doi.org/10.5281/zenodo.10288556',
 locationSourceUrl:'https://www.shipwreckworld.com/maps/robert-gaskin-barque-st-lawrence-river-shipwreck',
 historySourceUrl:'https://www.hmdb.org/m.asp?m=141820',assetUrl:ROBERT_GASKIN_ASSET,
 locationPrecision:'Approximate wreck-site center from published wreck coordinates; the photogrammetry mesh origin is not GPS-georeferenced.',
 scalePrecision:'Visualization scale calibrated against published 132.6 ft (40.42 m) vessel length; not a survey-control certificate.',
 orientationPrecision:'Approximate north/inland axis based on the dive-site description that the bow faces inland; not a survey-grade heading.',
 detail:'Photogrammetry reconstruction from approximately 49,000 underwater photographs. The original scan is preserved as a native GLB and placed at the wreck-site coordinate and published 18.3–21.3 m depth range.'
};
export const HMS_GRAFTON_WRECK={
 id:'hms-grafton',name:'HMS Grafton — 1940 G-class destroyer',label:'HMS GRAFTON',
 part:'hull',coordinates:[2.818383333333,51.4071],
 coordinateText:'51° 24.4260′ N, 2° 49.1030′ E',
 scanDepthM:19,waterSurfaceElevationM:0,capturedAt:'2025-05-19',
 license:'CC BY 4.0',creators:'DTU Aqua · Patrizio Mariani · Fletcher Thompson · Javier Alonso Fernández',
 sourceUrl:'https://zenodo.org/records/19592377',datasetUrl:'https://doi.org/10.5281/zenodo.19592377',
 licenseSourceUrl:'https://datasetcatalog.nlm.nih.gov/dataset?q=0000776569',
 locationSourceUrl:'https://publicaties.vlaanderen.be/view-file/83815',
 historySourceUrl:'https://www.uboat.net/allies/warships/ship/4395.html',
 assetUrl:HMS_GRAFTON_ASSET,
 locationPrecision:'The Belgian maritime plan gives the wreck-site coordinate. The source GLB does not publish a verified GPS origin or per-model geodetic transform; its center is placed at the official site point for visualization.',
 scalePrecision:'The source GLB scale is preserved. No survey-control scale certificate is published with this single-model file.',
 orientationPrecision:'The source GLB orientation is preserved; its heading relative to true north is not verified.',
 detail:'DTU Aqua underwater 3D reconstruction at the Grafton site off Oostende, captured 19 May 2025. The source record reports an approximate capture depth of 19 m.'
};
export const CANNON_WRECK={
 id:'kanonvraget',name:'Kanonvraget — Cannon Wreck',label:'KANONVRAGET · CANNON WRECK',
 part:'wreck',coordinates:[12.8688,55.6448],coordinateText:'55.6448° N, 12.8688° E',
 depthRangeM:[14,16],displayDepthM:15,captureDepthM:11,
 estimatedLengthM:48,cannonCount:16,cannonWeightPounds:[12,14],capturedAt:'2025-06-12',
 license:'CC BY 4.0',
 creators:'DTU Aqua · Patrizio Mariani · Fletcher Thompson · Javier Alonso Fernández',
 sourceUrl:'https://zenodo.org/records/19592377',datasetUrl:'https://doi.org/10.5281/zenodo.19592377',
 locationSourceUrl:'https://www.vragguiden.dk/vrag/4643',
 coordinateSourceUrl:'https://www.vragguiden.dk/api/WreckPdf/4643',
 assetUrl:CANNON_ASSET,
 location:'East of Saltholm in the Øresund, Denmark, about 4.4 km from shore.',
 locationPrecision:'Verified WGS84 wreck-site position from the Danish wreck database. The GLB itself does not publish a GPS origin or survey-control transform; BridgePoint centers the original scan at the wreck-site coordinate for visualization.',
 scalePrecision:'BridgePoint preserves the source GLB scale and orientation. The approximately 48 m vessel length is a historical estimate, not a scale-control certificate for the mesh.',
 detail:'The wreck is unidentified. The Danish wreck record describes at least 16 large 12–14-pound iron cannons scattered across and beside an approximately 48 m vessel. Kanonvraget is a descriptive wreck name, not a confirmed vessel name.'
};

export const HNLMS_KXI_WRECK={
 id:'hnlms-kxi',name:'HNLMS K XI — Dutch K XI-class patrol submarine',label:'HNLMS K XI',part:'hull',
 coordinates:[115.499470,-32.150390],coordinateText:'32° 09.0234′ S, 115° 29.9682′ E',
 depthRangeM:[38,40],displayDepthM:40,lengthM:66.63,lengthUncertaintyM:0.22,
 sourcePhotos:6733,capturedAt:'2025-01-11',discoveredAt:'2025-01-01',
 builtYear:1925,decommissionedYear:1946,scuttledYear:1949,
 license:'CC BY 4.0',creator:'Western Australian Museum (@wamuseum)',
 creators:'Western Australian Museum · WreckSploration (Andrew Oakeley, David Jackson and Patrick Morrison)',
 sourceUrl:'https://sketchfab.com/3d-models/kxi-submarine-rottnest-deepwater-graveyard-7899b257a0274c93becf69676482531f',
 datasetUrl:'https://museum.wa.gov.au/maritime-archaeology-db/maritime-reports/dutch-k-xi-submarine-1925-1946-discovered-wadjemup-rottnest-island-perth',
 locationSourceUrl:'https://wrecksploration.au/projects/kxi/',
 repositoryUrl:'https://github.com/patrick-morrison/below-wrecksploration/tree/51c255e21c0709b46f4f1fe24d9de05bdd62822c/models',
 assetUrl:KXI_ASSET,
 locationPrecision:'Published WGS84 wreck-site coordinate from WreckSploration. The source GLB does not publish a GPS-georeferenced origin; BridgePoint centers the scan at the wreck-site point for visualization.',
 scalePrecision:'Photogrammetry site plan measures the wreck at 66.63 ± 0.22 m. BridgePoint calibrates the GLB long axis to that measured length; this is not a survey-control certificate.',
 orientationPrecision:'Original GLB orientation is preserved. A survey-grade heading relative to true north is not published.',
 detail:'Full-length photogrammetry reconstruction of the visible HNLMS K XI wreck, created from 6,733 underwater images. The wreck is substantially buried, so the model represents recorded exposed structure rather than a pristine reconstruction of the entire original submarine.'
};

export const CAPE_OTWAY_WRECK={
 id:'cape-otway',name:'SS Cape Otway — 1931 single-screw steamer',label:'SS CAPE OTWAY',part:'hull',
 coordinates:[115.372533,-32.059833],coordinateText:'32.059833° S, 115.372533° E',
 displayDepthM:87,lengthM:60.10,beamM:10.40,draftM:4.60,
 triangles:200000,vertices:100600,capturedAt:'2023-01-20',scuttledDate:'1968-09-07',
 license:'CC BY 4.0',creator:'WreckSploration',creators:'WreckSploration · Andrew Oakeley, David Jackson and Patrick Morrison',
 sourceUrl:'https://sketchfab.com/3d-models/cape-otway-d5520c55462148f58b16a176f97d50cf',
 datasetUrl:'https://wrecksploration.au/projects/capeotway/',
 locationSourceUrl:'https://museum.wa.gov.au/maritime-archaeology-db/wrecks/id-682',
 repositoryUrl:'https://github.com/patrick-morrison/below-wrecksploration/tree/51c255e21c0709b46f4f1fe24d9de05bdd62822c/models/02%20Otway.glb',
 assetUrl:CAPE_OTWAY_ASSET,
 location:'West of Rottnest Island, Western Australia, in the Rottnest Ships Graveyard.',
 locationPrecision:'WGS84 wreck-site position from the Western Australian Museum. The source GLB does not publish a geodetic origin or survey-control transform; BridgePoint centers the scan at the official site point.',
 scalePrecision:'BridgePoint calibrates the model long axis to the museum-published 60.10 m vessel length. This is a visualization scale, not a survey-control certificate.',
 orientationPrecision:'WreckSploration records the bow facing north. The source GLB has no published GPS transform or survey-grade heading; its source orientation is preserved.',
 detail:'Underwater photogrammetry scan of the wreck site, with approximately 200,000 triangles and 100,600 vertices. The source description identifies two boilers, a single triple-expansion steam engine and two masts. The model was captured on 20 January 2023.'
};

export const TIMARU_WRECK={
 id:'timaru',name:'Timaru — Site 42 / Commonwealth Naval Dredge 4',label:'TIMARU · SITE 42',part:'wreck',
 coordinates:[115.4327897,-32.069910],coordinateText:'32.069910° S, 115.432790° E',
 displayDepthM:50,lengthM:44.9,beamM:9.17,registeredLengthM:44.20,registeredBeamM:9.20,
 triangles:750000,vertices:374800,capturedAt:'2025-06-01',discoveredAt:'2025-03-28',
 builtYear:1893,lostYear:1930,
 license:'CC BY 4.0',creator:'WreckSploration',creators:'WreckSploration · Site 42 survey team',
 sourceUrl:'https://sketchfab.com/3d-models/site-42-timaru-2d8c988bfd3048858c752b9fa4095f66',
 datasetUrl:'https://wrecksploration.au/projects/timaru/',
 locationSourceUrl:'https://museum.wa.gov.au/maritime-archaeology-db/wrecks/timaru-nd4-cnd4',
 repositoryUrl:'https://github.com/patrick-morrison/below-wrecksploration/tree/51c255e21c0709b46f4f1fe24d9de05bdd62822c/models/15%20Timaru.glb',
 assetUrl:TIMARU_ASSET,
 location:'Southwest of Rottnest Island, Western Australia, at the Rottnest Ships Graveyard.',
 locationPrecision:'Approximate wreck-site center from the public WreckSploration wreck layer. The source GLB does not publish a GPS/geodetic origin or survey-control transform.',
 scalePrecision:'Long axis calibrated to the WreckSploration site measurement of 44.9 m for visualization. The Western Australian Museum register separately lists 44.20 m overall vessel length; neither value is a survey-control certificate for the scan.',
 orientationPrecision:'Original GLB orientation is preserved. The scan does not publish a survey-grade true-north heading.',
 detail:'Site 42 is the broken-up remains of Timaru / Naval Dredger 4 / Commonwealth Naval Dredge 4, a steel steam hopper barge built in 1893. The 2025 photogrammetry records exposed wreck structure and scattered remains, including a boiler standing on end; it is not an intact restored ship model.'
};

export const HMS_LOO_WRECK={
 id:'hms-loo',name:'HMS Loo — 1744 Looe Key wrecksite',label:'HMS LOO · LOOE KEY',part:'wrecksite',
 coordinates:[-81.4052,24.5477],coordinateText:'24.5477° N, 81.4052° W (approximate recorded position)',
 displayDepthM:6.75,depthRangeM:[4.5,9],
 builtYear:1706,lostDate:'1744-02-05',guns:44,crewEscaped:274,
 triangles:4099999,vertices:2051535,capturedAt:'2023',publishedAt:'2024-02-07',
 license:'CC BY 4.0',creator:'NOAA Florida Keys National Marine Sanctuary',
 creators:'NOAA Florida Keys National Marine Sanctuary · East Carolina University Maritime Studies Program',
 sourceUrl:'https://sketchfab.com/3d-models/hms-loo-shipwreck-fc5901d8556743458c40aa4a096f01b6',
 datasetUrl:'https://huggingface.co/datasets/Stable-X/ScanSceneverse',
 locationSourceUrl:'https://shipwrecksmap.com/wrecks/hms-looe-1741/',
 historySourceUrl:'https://floridakeys.noaa.gov/shipwrecks/hms-loo.html',
 depthSourceUrl:'https://library.oarcloud.noaa.gov/noaa_documents.lib/NOS/CZIC/EIS_Looe_Key_1980.pdf',
 assetUrl:HMS_LOO_ASSET,
 location:'Looe Key Reef, Lower Florida Keys, Florida, USA',
 locationPrecision:'Approximate recorded position from a Wikidata coordinate (CC0), not a survey-grade wreck waypoint. NOAA places the wreckage at Looe Key Reef. The model scan itself has no GPS origin.',
 scalePrecision:'The NOAA/ECU photogrammetry includes scale bars with 25 cm target spacing. BridgePoint preserves the source GLB scale; no independent survey-control certificate is published.',
 orientationPrecision:'Original source GLB orientation is preserved. No georeferenced heading or true-north transform is published.',
 detail:'A 2023 NOAA / East Carolina University underwater photogrammetry survey of the HMS Loo wrecksite: coral-encrusted ballast blocks, scattered ship structure and artifacts on the seabed. This is a scan of the remains and surrounding seabed, not an intact or reconstructed ship hull.'
};

// Sixty additional scan records. Each map marker opens its scan inside BridgePoint's
// existing wreck card; the Sketchfab embed remains the scan's attributed source.
export const ADDITIONAL_SHIPWRECKS=[
 {id:'ex-hmas-junee',name:'Ex HMAS Junee — Bathurst-class minesweeper',label:'EX HMAS JUNEE',coordinates:[115.379817,-32.056583],coordinateText:'32.056583° S, 115.379817° E',displayDepthM:83,lengthM:56.7,beamM:9.5,builtYear:1943,scuttledYear:1968,modelId:'b614ee45b449455a9a6b2e6667395c0c',creator:'WreckSploration',sourceUrl:'https://sketchfab.com/3d-models/ex-hmas-junee-b614ee45b449455a9a6b2e6667395c0c',projectUrl:'https://wrecksploration.au/projects/junee/',locationSourceUrl:'https://museum.wa.gov.au/maritime-archaeology-db/wrecks/id-914',locationPrecision:'Western Australian Museum wreck-site coordinate. The Sketchfab scan does not publish a GPS georeference or survey-control transform.',detail:'A converted Bathurst-class minesweeper used for naval training before being scuttled off Rottnest Island in 1968. WreckSploration records the site at about 83 m depth; the published vessel measures 56.70 m long with a 9.50 m beam.'},
 {id:'ss-pericles',name:'SS Pericles — 1908 ocean liner',label:'SS PERICLES',coordinates:[115.1373333333,-34.4221666667],coordinateText:'34.422167° S, 115.137333° E',displayDepthM:36,lengthM:152.6,beamM:19,builtYear:1908,lostYear:1910,modelId:'4e5f8e9418bd40ee8cbcb2a78cb54fcf',creator:'WreckSploration',sourceUrl:'https://sketchfab.com/3d-models/ss-pericles-4e5f8e9418bd40ee8cbcb2a78cb54fcf',projectUrl:'https://wrecksploration.au/projects/pericles/',locationSourceUrl:'https://museum.wa.gov.au/maritime-archaeology-db/wrecks/pericles-1',detail:'The largest wreck in this set: the 152.6 m Aberdeen Line steam liner struck an uncharted rock off Cape Leeuwin in 1910. The public photogrammetry model is partial; WreckSploration describes the full site as over 150 m long and the wreck at about 35 m depth.'},
 {id:'county-of-caithness',name:'County of Caithness — four-masted iron ship',label:'COUNTY OF CAITHNESS · SITE 41',coordinates:[115.3333333333,-32.0666666667],coordinateText:'Approx. 32°04′ S, 115°20′ E · Rottnest graveyard area',displayDepthM:80,lengthM:81.19,beamM:11.82,builtYear:1876,modelId:'6d798673278f477bbd0238af96f96389',creator:'WreckSploration',sourceUrl:'https://sketchfab.com/3d-models/county-of-caithness-6d798673278f477bbd0238af96f96389',projectUrl:'https://wrecksploration.au/projects/caithness/',locationPrecision:'Approximate regional reference only: the source identifies Site 41 off southwest Rottnest at 80 m but does not publish numeric coordinates on its project page. The marker is placed near the published graveyard-area center, not presented as a survey waypoint.',detail:'A four-masted iron ship built in 1876, measuring 81.19 m long. WreckSploration and the Western Australian Museum identify Graveyard Site 41 as County of Caithness by matching the wreck’s mast layout and measured length; the scan was made in 2025.'},
 {id:'gunga',name:'Gunga — 1864 iron sailing ship',label:'GUNGA · SITE 36',coordinates:[115.269817,-31.832117],coordinateText:'31.832117° S, 115.269817° E',displayDepthM:117,lengthM:78.1,builtYear:1864,modelId:'85767d8cf51c4523862d18d92549aa09',creator:'WreckSploration',sourceUrl:'https://sketchfab.com/3d-models/gunga-85767d8cf51c4523862d18d92549aa09',projectUrl:'https://wrecksploration.au/projects/gunga/',locationPrecision:'Published Site 36 wreck position. The photogrammetry mesh itself has no published GPS origin.',detail:'An iron sailing ship built in Hull in 1864 and later used as a coal hulk. Its wreck lies at about 117 m depth north of Rottnest; the photogrammetry measures the visible wreck at roughly 78 m long.'},
 {id:'sesa-site-03',name:'Sesa (ex-Mallowdale) — Site 03',label:'SESA · SITE 03',coordinates:[115.3699,-32.0526333333],coordinateText:'32.052633° S, 115.369900° E',displayDepthM:92,lengthM:64.7,builtYear:1869,scuttledYear:1928,modelId:'d4134d96b8134737bc33971aab9dc8be',creator:'WreckSploration',sourceUrl:'https://sketchfab.com/3d-models/the-sesa-site-03-d4134d96b8134737bc33971aab9dc8be',projectUrl:'https://wrecksploration.au/projects/site03/',locationSourceUrl:'https://museum.wa.gov.au/maritime-archaeology-db/wrecks/id-1017',detail:'The 64.7 m Site 03 wreck is identified by WreckSploration and WA Museum researchers as the Sesa, formerly Mallowdale. Its measured length, two-deck arrangement and mast layout match the historical vessel; the site lies at about 92 m.'},
 {id:'clipper-site-06',name:'The 60 m Clipper — Site 06 wreck',label:'THE CLIPPER · SITE 06',coordinates:[115.3841833333,-32.0858833333],coordinateText:'32.085883° S, 115.384183° E',displayDepthM:65,lengthM:62,modelId:'cd8e10a2ce2c42298ec9d66350313161',creator:'WreckSploration',sourceUrl:'https://sketchfab.com/3d-models/the-clipper-shipwreck-rottnest-graveyard-cd8e10a2ce2c42298ec9d66350313161',projectUrl:'https://wrecksploration.au/projects/clipper/',locationSourceUrl:'https://museum.wa.gov.au/maritime-archaeology-db/wrecks/id-1018',detail:'A large wreck known to divers as “The Clipper,” in about 65 m of water. The Western Australian Museum database keeps the vessel identity unresolved as Graveyard Site 06; the card preserves that uncertainty.'},
 {id:'tamerlane-site-07',name:'Tamerlane — Site 07 wreck',label:'TAMERLANE · SITE 07',coordinates:[115.3498288333,-32.0596805],coordinateText:'32.059681° S, 115.349829° E',displayDepthM:100,lengthM:58,modelId:'3cfdbee7bdef4a8880c2cbce9c811961',creator:'WreckSploration',sourceUrl:'https://sketchfab.com/3d-models/site07-tamerlane-3cfdbee7bdef4a8880c2cbce9c811961',projectUrl:'https://wrecksploration.au/projects/tamerlane/',locationSourceUrl:'https://museum.wa.gov.au/maritime-archaeology-db/wrecks/id-984',detail:'A wrecksite surveyed in 2024 at approximately 100 m depth. WreckSploration presents the scan as Tamerlane; the Western Australian Museum’s public record still labels the site unidentified, so the identity is shown with its Site 07 qualifier.'},
 {id:'eucla',name:'Eucla (ex-Wexford) — steel screw steamer',label:'EUCLA · SITE 09',coordinates:[115.345483,-32.076933],coordinateText:'32.076933° S, 115.345483° E',displayDepthM:103,lengthM:57.3,builtYear:1901,modelId:'24a9661c44ca44f19e07223fa708a8c9',creator:'WreckSploration',sourceUrl:'https://sketchfab.com/3d-models/eucla-24a9661c44ca44f19e07223fa708a8c9',projectUrl:'https://wrecksploration.au/projects/eucla/',locationSourceUrl:'https://museum.wa.gov.au/maritime-archaeology-db/wrecks/id-921',detail:'The 57.3 m steel screw steamer Eucla, formerly Wexford, was launched in 1901. WreckSploration surveyed the broken-up wreck at about 103 m depth; a large boiler remains visible in the scan.'},
 {id:'knowsley-site-04',name:'Knowsley — Site 04 coal hulk',label:'KNOWSLEY · SITE 04',coordinates:[115.36891,-32.070665],coordinateText:'32.070665° S, 115.368910° E',displayDepthM:88,lengthM:50.85,builtYear:1864,scuttledYear:1923,modelId:'98419da25c2545e7a77ad12402cbe36d',creator:'WreckSploration',sourceUrl:'https://sketchfab.com/3d-models/knowsley-site-04-98419da25c2545e7a77ad12402cbe36d',projectUrl:'https://wrecksploration.au/projects/knowsley/',locationSourceUrl:'https://museum.wa.gov.au/maritime-archaeology-db/wrecks/id-985',detail:'An 1864-built hulk identified by Western Australian Museum archaeologists as Knowsley from the Site 04 scan’s length, deck and mast configuration. The model measures the visible wreck at about 50.85 m; the site lies at approximately 88 m.'},
 {id:'thornliebank',name:'Thornliebank — three-masted barque',label:'THORNLIEBANK · SITE 44',coordinates:[115.4604167,-32.1146],coordinateText:'32.114600° S, 115.460417° E',displayDepthM:46,lengthM:68,builtYear:1886,modelId:'de9f7c06cf304f818ba67040e87dbd77',creator:'WreckSploration',sourceUrl:'https://sketchfab.com/3d-models/thornliebank-1886-1928-de9f7c06cf304f818ba67040e87dbd77',projectUrl:'https://wrecksploration.au/projects/thornliebank/',locationPrecision:'WreckSploration project-site location. The Sketchfab scan itself does not publish a georeferenced mesh origin.',detail:'A 68 m three-masted barque wreck lying at about 46 m depth in the Rottnest Ships Graveyard. WreckSploration documented the site in 2024 using underwater photogrammetry.'},
 {id:'uss-yorktown',name:'USS Yorktown (CV-5) — WWII aircraft carrier',label:'USS YORKTOWN · CV-5',coordinates:[-176.566667,30.6],coordinateText:'30° 36′ N, 176° 34′ W · approximate sinking position',displayDepthM:5000,lengthM:246.7,beamM:26.2,builtYear:1936,lostYear:1942,modelId:null,embedUrl:'https://construkted.com/embed/aom5meytdnz',viewerProvider:'NOAA Ocean Exploration · Construkted Reality',creator:'Raymond Phipps · NOAA Ocean Exploration / Ocean Exploration Trust',sourceUrl:'https://oceanexplorer.noaa.gov/photogrammetry/yorktown/',sourceLinkLabel:'NOAA Ocean Exploration · photogrammetry source ↗',projectUrl:'https://construkted.com/asset/aom5meytdnz/',projectLinkLabel:'Interactive NOAA scan on Construkted Reality ↗',locationSourceUrl:'https://www.history.navy.mil/research/archives/digital-exhibits-highlights/action-reports/wwii-battle-of-midway/commander-in-chief-pacific-fleet.html',locationLinkLabel:'U.S. Navy report · sinking position ↗',scanLabel:'NOAA 2023 survey · 9,819 source images',locationPrecision:'Approximate wreck-site position from the reported 30°36′ N, 176°34′ W sinking coordinate. NOAA’s viewer stitches seven photogrammetry sections; it does not publish a single georeferenced hull origin.',detail:'The 246.7 m aircraft carrier rests upright at about 5,000 m depth. NOAA Ocean Exploration and Ocean Exploration Trust built seven photogrammetry sections from 9,819 images gathered during the 2023 survey. The in-card scan shows those recorded sections rather than a complete watertight hull mesh.'},
 {id:'burdigala',name:'SS Burdigala — ex-Kaiser Friedrich ocean liner',label:'SS BURDIGALA',coordinates:[24.3051,37.6607],coordinateText:'Approx. 37.6607° N, 24.3051° E · Kea Channel',displayDepthM:74,lengthM:180,builtYear:1898,lostYear:1916,modelId:'59df801a824b493da036f376af005a3b',viewerProvider:'Sketchfab',creator:'Holger Buss · Dive3D',sourceUrl:'https://sketchfab.com/3d-models/wreck-of-burdigala-ex-ss-kaiser-friedrich-59df801a824b493da036f376af005a3b',sourceLinkLabel:'Sketchfab · full wreck photogrammetry viewer ↗',projectUrl:'https://dive3d.eu/models/greece/burdigala/',projectLinkLabel:'Dive3D · scan and dive notes ↗',locationSourceUrl:'https://burdigalaproject.wordpress.com/the-wreck/',locationLinkLabel:'S/S Burdigala Project · wreck history ↗',scanLabel:'Dive3D 2023 full-wreck survey',locationPrecision:'Approximate publicly charted site position near Kea Island. The marker identifies the wreck area; the Sketchfab scan does not publish a GPS mesh origin.',detail:'The French liner had a 180 m hull; the broken wreck spans roughly 200 m when the gap between sections is included. Dive3D reports the wreck at 50–74 m and says its 2023 photogrammetry scan covers the entire wreck.'},
 {id:'ss-polynesien',name:'SS Polynesien — French ocean liner and troop transport',label:'SS POLYNESIEN',coordinates:[14.60495,35.8578167],coordinateText:'35° 51.469′ N, 14° 36.297′ E · bow position',displayDepthM:65,lengthM:152.5,beamM:15,builtYear:1890,lostYear:1918,modelId:'1db4337c3c5e483bac928143d475037d',viewerProvider:'Sketchfab',creator:'3dmb · Malta underwater heritage scan',sourceUrl:'https://sketchfab.com/3d-models/ss-polynesien-1db4337c3c5e483bac928143d475037d',sourceLinkLabel:'Sketchfab · underwater 3D scan ↗',projectUrl:'https://underwatermalta.org/discover/ss-polynesien/',projectLinkLabel:'Underwater Malta · virtual wreck museum ↗',locationSourceUrl:'https://www.transport.gov.mt/include/filestreaming.asp?fileid=9421',locationLinkLabel:'Transport Malta · charted wreck coordinates ↗',scanLabel:'Underwater Malta / 3dmb photogrammetry',locationPrecision:'WGS84 bow position listed by Transport Malta. This marker is the bow coordinate, not the wreck center; the in-card mesh is not positioned as a seabed model.',detail:'Heritage Malta lists the French liner at 152.5 m long with a 15 m beam. Torpedoed in 1918, the protected wreck rests on its port side off southeastern Malta at a maximum depth of about 65 m; its scan is also featured in Underwater Malta’s virtual museum.'},
 {id:'ss-thistlegorm',name:'SS Thistlegorm — WWII cargo ship',label:'SS THISTLEGORM',coordinates:[33.9186639,27.8084972],coordinateText:'27° 48′ 30.59″ N, 33° 55′ 7.19″ E',displayDepthM:30,lengthM:126.5,beamM:17.7,builtYear:1940,lostYear:1941,modelId:'d4e49cce7d53470b8afead0b94313817',viewerProvider:'Sketchfab',creator:'Simon Brown · Deep3D',sourceUrl:'https://sketchfab.com/models/d4e49cce7d53470b8afead0b94313817',sourceLinkLabel:'Sketchfab · full wreck photogrammetry viewer ↗',projectUrl:'https://thethistlegormproject.com/3d-photogrammetry-survey/',projectLinkLabel:'The Thistlegorm Project · survey notes ↗',locationSourceUrl:'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0282239',locationLinkLabel:'Research paper · wreck position and depth ↗',scanLabel:'Deep3D 2017 survey · 24,307 images',locationPrecision:'Published WGS84 wreck-site position from the SS Thistlegorm survey literature; the map marker identifies the site center, while the card viewer preserves the original scan.',detail:'The 126.5 m cargo ship lies in about 30 m of water in the Red Sea. Simon Brown’s full-site 2017 photogrammetry survey used 24,307 high-resolution images to record the wreck and its cargo.'},
 {id:'anna-c-minch',name:'Anna C. Minch — Lake Michigan bulk freighter',label:'ANNA C. MINCH',coordinates:[-86.462933,43.763067],coordinateText:'43° 45.784′ N, 86° 27.776′ W · bow waypoint',displayDepthM:12.2,lengthM:115.82,beamM:15.24,builtYear:1903,lostYear:1940,modelId:'4168e5aa1af140b3a560a3d784357259',viewerProvider:'Sketchfab',creator:'Andrew Goodman · Ken Merryman / 3DShipwrecks.org',sourceUrl:'https://sketchfab.com/models/4168e5aa1af140b3a560a3d784357259',sourceLinkLabel:'3DShipwrecks.org · bow photogrammetry scan ↗',projectUrl:'https://3dshipwrecks.org/shipwreck-anna-c-minch/',projectLinkLabel:'3DShipwrecks.org · wreck record and stern scan ↗',locationSourceUrl:'https://3dshipwrecks.org/shipwreck-anna-c-minch/',locationLinkLabel:'Published Lake Michigan site coordinates ↗',scanLabel:'3DShipwrecks 2025 bow scan · 4,258 images',locationPrecision:'Wreck-site bow waypoint published by 3DShipwrecks.org. The freighter broke into bow and stern sections about 600 ft apart; this marker and viewer identify the bow section.',detail:'The steel bulk freighter was 380 ft (115.8 m) long. Its bow and stern lie about 600 ft apart in 35–45 ft of Lake Michigan; the BridgePoint card opens the complete bow photogrammetry scan, recorded from 4,258 images in 2025.'},
 {id:'uss-monitor',name:'USS Monitor — Civil War ironclad',label:'USS MONITOR',coordinates:[-75.40633,35.00195],coordinateText:'35° 00′ 7.02″ N, 75° 24′ 22.79″ W',displayDepthM:73.2,lengthM:52.7,beamM:12.65,builtYear:1862,lostYear:1862,modelId:'31147e90a3c14d9cb1cb35c65ad16eae',viewerProvider:'Sketchfab · NOAA Monitor National Marine Sanctuary',creator:'NOAA Monitor National Marine Sanctuary',sourceUrl:'https://sketchfab.com/models/31147e90a3c14d9cb1cb35c65ad16eae',sourceLinkLabel:'NOAA · 2015 photogrammetry viewer ↗',projectUrl:'https://monitor.noaa.gov/about/expeditions.html',projectLinkLabel:'NOAA Monitor NMS · expedition record ↗',locationSourceUrl:'https://monitor.noaa.gov/shipwrecks/uss_monitor.html',locationLinkLabel:'NOAA Monitor NMS · official position and dimensions ↗',scanLabel:'NOAA 2015 photogrammetry model',locationPrecision:'Official NOAA wreck coordinates for Monitor National Marine Sanctuary. The marker uses the sanctuary’s wreck point; the viewer scan is not rendered as a georeferenced seabed mesh.',detail:'NOAA’s 2015 photogrammetry model documents the 52.7 m Civil War ironclad. USS Monitor rests about 73 m below the Atlantic, 16 miles off Cape Hatteras, North Carolina.'},
 {id:'american-heritage',name:'American Heritage — Santa Monica Bay supply ship',label:'AMERICAN HERITAGE',coordinates:[-118.7,33.88],coordinateText:'Approx. 8 mi south of Malibu, California · display coordinate approximate',displayDepthM:700,lengthM:60,lostYear:1995,modelId:'c0d0238511f8405a9a1e399c719cb81c',viewerProvider:'Sketchfab · MBARI',creator:'Ben Erwin · MBARI',sourceUrl:'https://sketchfab.com/3d-models/american-heritage-shipwreck-c0d0238511f8405a9a1e399c719cb81c',sourceLinkLabel:'Sketchfab · MBARI photogrammetry reconstruction ↗',projectUrl:'https://www.mbari.org/news/rov-pilot-helps-discover-sunken-ship-that-he-sailed-on-in-the-1990s/',projectLinkLabel:'MBARI · discovery and 3D reconstruction ↗',locationSourceUrl:'https://www.mbari.org/news/rov-pilot-helps-discover-sunken-ship-that-he-sailed-on-in-the-1990s/',locationLinkLabel:'MBARI · published location and depth ↗',scanLabel:'MBARI ROV survey · thousands of stills',locationPrecision:'Approximate display point based on MBARI’s published location about 13 km (8 mi) south of Malibu. Exact public wreck coordinates are not given in the article; the scan is incomplete and is not GPS-georeferenced in BridgePoint.',detail:'The 60 m supply ship rests nearly 700 m below Santa Monica Bay. MBARI reconstructed visible portions from thousands of still images extracted from ROV video; some parts were missing because they could not be seen clearly.'},
 {id:'ss-wollongbar-ii',name:'SS Wollongbar II — Australian coastal steamer',label:'SS WOLLONGBAR II',coordinates:[153.1036667,-31.2094417],coordinateText:'31° 12.5665′ S, 153° 06.220′ E · north wreck section',displayDepthM:92,lengthM:86.89,beamM:12.83,builtYear:1922,lostYear:1943,modelId:'dd93fb4c1352465a85a4c31c71fdc7b3',viewerProvider:'Sketchfab · Curtin HIVE',creator:'Daniel Adams · Curtin University HIVE; ROV video by Heritage NSW',sourceUrl:'https://sketchfab.com/3d-models/ss-wollongbar-ii-1943-shipwreck-3d-model-dd93fb4c1352465a85a4c31c71fdc7b3',sourceLinkLabel:'Curtin HIVE · underwater 3D model viewer ↗',projectUrl:'https://hive.curtin.edu.au/3D-shipwrecks/',projectLinkLabel:'Curtin HIVE · shipwreck digitisation project ↗',locationSourceUrl:'https://www.environment.nsw.gov.au/maritimeheritageapp/resources/Maritime/documents/890523ed60adbaf4dfa86e0f50299504835.pdf',locationLinkLabel:'Heritage NSW · inspection report and wreck position ↗',scanLabel:'Curtin HIVE reconstruction from Heritage NSW ROV video',locationPrecision:'WGS84 north wreck-section coordinate from the published Heritage NSW inspection report. The BridgePoint marker is a site waypoint, not a georeferenced model origin.',detail:'The 86.89 m Australian coastal steamer was torpedoed in 1943 and rests about 92–100 m deep off Crescent Head, New South Wales. Curtin HIVE built this 3D photogrammetric reconstruction from Heritage NSW ROV video.'},
 {id:'amagisan-maru',name:'Amagisan Maru — Chuuk Lagoon cargo and passenger ship',label:'AMAGISAN MARU',coordinates:[151.8622,7.2927],coordinateText:'Approx. 7.2927° N, 151.8622° E · Chuuk Lagoon',displayDepthM:60,lengthM:138,beamM:18,builtYear:1933,lostYear:1944,modelId:'b04ea047454042e0b237cd3e41e00ce9',viewerProvider:'Sketchfab · Dive3D',creator:'Holger Buss · Dive3D',sourceUrl:'https://sketchfab.com/3d-models/amagisan-maru-at-truk-lagoon-chuuk-b04ea047454042e0b237cd3e41e00ce9',sourceLinkLabel:'Sketchfab · 2025 wreck photogrammetry scan ↗',projectUrl:'https://dive3d.eu/models/chuuk-lagoon-truk/amagisan-maru/',projectLinkLabel:'Dive3D · wreck details and scan notes ↗',locationSourceUrl:'https://www.divers.world/divesite/chuuk-lagoon/amagisan-maru/',locationLinkLabel:'Published Chuuk Lagoon dive-site coordinate ↗',scanLabel:'Dive3D 2025 photogrammetry scan',locationPrecision:'Approximate publicly published dive-site coordinate. The scan origin is not georeferenced to the map, and 60 m is the deepest seabed level (the ship’s deck starts much shallower).',detail:'The 138 m cargo/passenger ship was sunk during the 1944 attack on Truk Lagoon. Dive3D scanned the wreck in 2025; the hull lies on a slope from about 36 m at the deck to 60 m at the seabed.'},
 {id:'ss-benwood',name:'SS Benwood — Florida Keys steam freighter',label:'SS BENWOOD',coordinates:[-80.332,25.052133],coordinateText:'25° 03.128′ N, 80° 19.920′ W · Wreck Trail buoy 1',displayDepthM:11,lengthM:109.73,beamM:9.45,builtYear:1910,lostYear:1942,modelId:'3ac9327e60e249e2ada29c4e595be571',viewerProvider:'Sketchfab · Indiana University Underwater Science',creator:'Matthew Maus · Indiana University Underwater Science',sourceUrl:'https://sketchfab.com/models/3ac9327e60e249e2ada29c4e595be571',sourceLinkLabel:'Indiana University · original Benwood photogrammetry ↗',projectUrl:'https://underwaterscience.indiana.edu/research/florida-keys/benwood-3d-modeling.html',projectLinkLabel:'IU Center for Underwater Science · model data ↗',locationSourceUrl:'https://floridakeys.noaa.gov/ShipwreckTrail/benwood.html',locationLinkLabel:'NOAA Florida Keys · Benwood Wreck Trail ↗',scanLabel:'Indiana University / NOAA survey · 6,460 images',locationPrecision:'NOAA buoy coordinates identify Benwood Wreck Trail marker 1. The photogrammetry viewer presents the wreck scan independently; its mesh origin is not used as a map transform.',detail:'The 109.7 m freighter sank after a 1942 collision and now lies in 25–45 ft of water in the Florida Keys. Indiana University, NOAA and scientific divers built the in-card photogrammetric site model from 6,460 aligned images covering about 3,070 m².'},

 {"id":"ss-kamloops","name":"SS Kamloops — Isle Royale freighter","label":"SS KAMLOOPS","coordinates":[-88.7647,48.085],"coordinateText":"48.0850° N, 88.7647° W · Lake Superior, off Isle Royale","displayDepthM":79,"lengthM":76,"beamM":13,"builtYear":1924,"lostYear":1927,"modelId":"1b871413a5574c949e29b738a0e3d3ec","creator":"izzni","sourceUrl":"https://sketchfab.com/3d-models/ss-kamloops-shipwreck-site-1b871413a5574c949e29b738a0e3d3ec","projectUrl":"https://greatamericanlakes.com/shipwrecks/superior/kamloops/","projectLinkLabel":"Great American Lakes · ship and site record ↗","locationSourceUrl":"https://greatamericanlakes.com/shipwrecks/superior/kamloops/","detail":"A 76 m Canadian package freighter lost with all hands off Isle Royale in 1927. This published underwater model is partly photogrammetric and partly parametric; the map pin uses the published wreck position, not a mesh georeference.","locationPrecision":"Published Great Lakes wreck position; the Sketchfab model does not document a georeferenced mesh transform."},
 {"id":"sidewheel-detroit-1854","name":"Sidewheel Steamer Detroit — Lake Huron","label":"STEAMER DETROIT","coordinates":[-82.82,44.05],"coordinateText":"Approx. 44.05° N, 82.82° W · off Point aux Barques, Lake Huron","displayDepthM":64,"lengthM":59,"beamM":9,"builtYear":1854,"lostYear":1854,"modelId":"05c1e9d651f3493f9d3d6f91ffe35c4c","creator":"As credited on the original model page","sourceUrl":"https://sketchfab.com/3d-models/sidewheel-steamer-detroit-shipwreck-05c1e9d651f3493f9d3d6f91ffe35c4c","projectUrl":"https://sketchfab.com/3d-models/sidewheel-steamer-detroit-shipwreck-05c1e9d651f3493f9d3d6f91ffe35c4c","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A mid-19th-century wooden passenger and package steamer that sank after a collision off Point aux Barques. The scan captures the surviving wreck site; the pin is an approximate location from published loss descriptions.","locationPrecision":"Approximate wreck-area position from historical place-of-loss descriptions; scan mesh is not georeferenced."},
 {"id":"manasoo-lake-huron","name":"SS Manasoo — Lake Huron freighter","label":"SS MANASOO","coordinates":[-81.58,45.12],"coordinateText":"Approx. 45.12° N, 81.58° W · Lake Huron, near Hope Island","displayDepthM":64,"lengthM":70,"beamM":11,"builtYear":1888,"lostYear":1928,"modelId":"ad4084c0c79a42deba605e85f406b29f","creator":"3DShipwrecks","sourceUrl":"https://sketchfab.com/3d-models/shipwreck-manasoo-2022-ad4084c0c79a42deba605e85f406b29f","projectUrl":"https://3dshipwrecks.org/shipwreck-manasoo/","projectLinkLabel":"3DShipwrecks · scan notes ↗","locationSourceUrl":"https://3dshipwrecks.org/shipwreck-manasoo/","detail":"The Manasoo, also known as Macassa, was a steel propeller passenger and freight vessel lost on Lake Huron. The 3DShipwrecks scan records the wreck; the site pin is approximate because the model publisher lists no GPS coordinate.","locationPrecision":"Approximate site position near Hope Island; source model publisher reports no GPS coordinate or georeferenced mesh."},
 {"id":"samuel-mather-superior","name":"SS Samuel Mather — Whitefish Bay","label":"SS SAMUEL MATHER","coordinates":[-84.7054,46.5718],"coordinateText":"46.5718° N, 84.7054° W · Whitefish Bay, Lake Superior","displayDepthM":43,"lengthM":75,"beamM":12,"builtYear":1887,"lostYear":1891,"modelId":"5c8412419e3c4d4b91922b0d963cac60","creator":"3DShipwrecks","sourceUrl":"https://sketchfab.com/3d-models/shipwreck-samuel-mather-5c8412419e3c4d4b91922b0d963cac60","projectUrl":"https://greatamericanlakes.com/shipwrecks/superior/samuel-mather/","projectLinkLabel":"Great American Lakes · ship and site record ↗","locationSourceUrl":"https://greatamericanlakes.com/shipwrecks/superior/samuel-mather/","detail":"An 1891 wooden bulk freighter wreck in Whitefish Bay, modeled from underwater survey imagery. Its published position and history place it in Lake Superior near the St. Marys River entrance.","locationPrecision":"Published wreck position; the Sketchfab photogrammetry scan is not registered to a seabed coordinate frame."},
 {"id":"valbanera-florida-keys","name":"SS Valbanera — Half Moon Shoal","label":"SS VALBANERA","coordinates":[-82.66,24.7],"coordinateText":"Approx. 24.70° N, 82.66° W · Half Moon Shoal, Florida Keys","displayDepthM":8,"lengthM":121.9,"beamM":14.6,"builtYear":1906,"lostYear":1919,"modelId":"27a1606357174e7a979a78cb697456d6","creator":"NOAA Ocean Exploration","sourceUrl":"https://sketchfab.com/3d-models/ss-valbanera-27a1606357174e7a979a78cb697456d6","projectUrl":"https://oceanexplorer.noaa.gov/expedition-feature/21quicksands-features-summary/","projectLinkLabel":"NOAA Ocean Exploration · survey summary ↗","locationSourceUrl":"https://floridakeys.noaa.gov/shipwrecks/valbanera.html","locationLinkLabel":"NOAA Florida Keys · wreck history ↗","detail":"The 122 m Spanish passenger steamer was lost in the 1919 Florida Keys hurricane with 488 people aboard. NOAA and University of Miami teams surveyed the largely buried wreck and produced a partial 3D site model.","locationPrecision":"Approximate Half Moon Shoal site position west of Key West; NOAA reports shifting sand and a partly buried wreck."},
 {"id":"quedagh-merchant","name":"Quedagh Merchant — Isla Catalina","label":"QUEDAGH MERCHANT","coordinates":[-68.96,18.31],"coordinateText":"Approx. 18.31° N, 68.96° W · Isla Catalina, Dominican Republic","displayDepthM":8,"lengthM":40,"beamM":9,"builtYear":1695,"lostYear":1699,"modelId":"59ccb09967d645678f0c4a52804cae5f","creator":"As credited on the original model page","sourceUrl":"https://sketchfab.com/3d-models/quedagh-merchant-59ccb09967d645678f0c4a52804cae5f","projectUrl":"https://sketchfab.com/3d-models/quedagh-merchant-59ccb09967d645678f0c4a52804cae5f","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"The late-17th-century merchant vessel associated with Captain William Kidd was abandoned off Isla Catalina. The published photogrammetry site model was assembled from more than two thousand aligned images and documents the archaeological wreck area.","locationPrecision":"Approximate Isla Catalina wreck-area position from published site identification; model origin is not a navigation point."},
 {"id":"hebat-allah-red-sea","name":"MV Hebat Allah — Red Sea","label":"MV HEBAT ALLAH","coordinates":[33.82,27.31],"coordinateText":"Approx. 27.31° N, 33.82° E · Red Sea, Egypt","displayDepthM":46,"lengthM":44,"beamM":8,"builtYear":1985,"scuttledYear":2004,"modelId":"3a5306f3961146729d054ee42bc063e5","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/shipwreck-mv-hebat-allah-3a5306f3961146729d054ee42bc063e5","projectUrl":"https://dive3d.eu/models/egypt/hebat-allah/","projectLinkLabel":"Dive3D · wreck and survey details ↗","locationSourceUrl":"https://dive3d.eu/models/egypt/hebat-allah/","detail":"A 44 m coastal freighter intentionally scuttled in 2004 and scanned underwater in 2024. It stands upright on sand at about 46 m depth; the model creator notes the scan was processed aboard the liveaboard.","locationPrecision":"Approximate Red Sea wreck-site position; the scan is not supplied as a georeferenced seabed mesh."},
 {"id":"pirapama-recife","name":"Vapor Pirapama — Recife","label":"VAPOR PIRAPAMA","coordinates":[-34.87,-8.08],"coordinateText":"Approx. 8.08° S, 34.87° W · Recife, Brazil","displayDepthM":24,"lengthM":57,"beamM":9,"builtYear":1889,"lostYear":1889,"modelId":"47e9e45806e64cafb5a7fec6d9146b23","creator":"As credited on the original model page","sourceUrl":"https://sketchfab.com/3d-models/vapor-pirapama-47e9e45806e64cafb5a7fec6d9146b23","projectUrl":"https://sketchfab.com/3d-models/vapor-pirapama-47e9e45806e64cafb5a7fec6d9146b23","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A historic Brazilian steamship wreck off Recife, documented in an underwater 3D scan. The icon marks the wreck site in coastal waters; the hosted viewer model remains an attributed scan, not a georeferenced seabed asset.","locationPrecision":"Approximate Recife wreck-site position; verify the scan page and local chart before using as a precise waypoint."},
 {"id":"munin-baltic","name":"German Minesweeper Munin — Baltic Sea","label":"MINESWEEPER MUNIN","coordinates":[14.1,54.68],"coordinateText":"Approx. 54.68° N, 14.10° E · Baltic Sea","displayDepthM":42,"lengthM":42,"beamM":7,"builtYear":1941,"lostYear":1945,"modelId":"4aa9522a21ea4f46adea4c045499444a","creator":"bart.pitala","sourceUrl":"https://sketchfab.com/3d-models/german-minesweeper-munin-baltic-sea-42m-4aa9522a21ea4f46adea4c045499444a","projectUrl":"https://sketchfab.com/3d-models/german-minesweeper-munin-baltic-sea-42m-4aa9522a21ea4f46adea4c045499444a","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A German WWII minesweeper lying in the Baltic at about 42 m. The underwater photogrammetry model was built from a large image set and shows the wreck as it rests on the seafloor.","locationPrecision":"Approximate Baltic Sea site center from published wreck listing; no survey-control transform is supplied with the scan."},
 {"id":"k18-bryza","name":"K-18 Bryza — Hel Peninsula","label":"K-18 BRYZA","coordinates":[18.8,54.61],"coordinateText":"Approx. 54.61° N, 18.80° E · near Hel, Poland","displayDepthM":18,"lengthM":18,"beamM":4,"builtYear":1960,"scuttledYear":2009,"modelId":"52c88894d2d149eab58443070843e2d4","creator":"Underwater 3D","sourceUrl":"https://sketchfab.com/3d-models/k-18-bryza-shipwreck-52c88894d2d149eab58443070843e2d4","projectUrl":"https://www.underwater-3d.com/3d-models/bryza","projectLinkLabel":"Underwater 3D · Baltic scan information ↗","locationSourceUrl":"https://archiwum.gohel.pl/gohel.pl/galeria-22-16_08_2009_zatopienie_kutra.html","locationLinkLabel":"Hel municipal archive · scuttling record ↗","detail":"A Polish naval liaison craft deliberately sunk as a diver attraction about 200 m off Hel beach in 2009. The scan shows the Baltic wreck site at roughly 18 m.","locationPrecision":"Approximate position just offshore of Hel; the underwater model is not georeferenced."},
 {"id":"u670-jastarnia","name":"U-670 — Baltic Sea submarine","label":"U-670","coordinates":[18.76,54.76],"coordinateText":"Approx. 54.76° N, 18.76° E · Baltic Sea, north of Jastarnia","displayDepthM":82,"lengthM":67,"beamM":6,"builtYear":1942,"lostYear":1943,"modelId":"459006a362c14d1796ac8e6085ccb3b8","creator":"bart.pitala","sourceUrl":"https://sketchfab.com/3d-models/u-boot-u-670-wreck-baltic-sea-jastarnia-82m-459006a362c14d1796ac8e6085ccb3b8","projectUrl":"https://sketchfab.com/3d-models/u-boot-u-670-wreck-baltic-sea-jastarnia-82m-459006a362c14d1796ac8e6085ccb3b8","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A Type VIIC submarine wreck lying near Jastarnia at about 82 m. The underwater scan documents its current condition on the Baltic seabed.","locationPrecision":"Approximate wreck-area position from the published Jastarnia site description; model is not georeferenced."},
 {"id":"mt-terra-baltic","name":"M/T Terra — WWII tanker","label":"M/T TERRA","coordinates":[23.05,58.96],"coordinateText":"Approx. 58.96° N, 23.05° E · Baltic Sea","displayDepthM":44,"lengthM":60,"beamM":9,"builtYear":1930,"lostYear":1944,"modelId":"976923a887c7443a8cefb630c3bc493e","creator":"bart.pitala","sourceUrl":"https://sketchfab.com/3d-models/mt-terra-german-ww2-tanker-baltic-sea-44m-976923a887c7443a8cefb630c3bc493e","projectUrl":"https://sketchfab.com/3d-models/mt-terra-german-ww2-tanker-baltic-sea-44m-976923a887c7443a8cefb630c3bc493e","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A German WWII tanker wreck resting in the Baltic Sea at approximately 44 m. The scan page documents the underwater wreck model; the map point is a site-area placement rather than a mesh transform.","locationPrecision":"Approximate Baltic wreck-area point; scan publisher does not provide georeferenced mesh coordinates."},
 {"id":"baron-gautsch","name":"SS Baron Gautsch — Adriatic Sea","label":"BARON GAUTSCH","coordinates":[13.57333,44.9375],"coordinateText":"44.93750° N, 13.57333° E · Adriatic Sea, Croatia","displayDepthM":36,"lengthM":84.55,"beamM":11.6,"builtYear":1908,"lostYear":1914,"modelId":"154a9784d62c487e93e7c1429f2a5d0d","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/baron-gautsch-154a9784d62c487e93e7c1429f2a5d0d","projectUrl":"https://dive3d.eu/models/croatia/baron-gautsch/","projectLinkLabel":"Dive3D · wreck and scan details ↗","locationSourceUrl":"https://www.padi.com/dive-site/croatia/baron-gautsch-2/","locationLinkLabel":"PADI · Adriatic wreck site ↗","detail":"The 84.55 m Austrian passenger liner sank in 1914 and is preserved as one of the Adriatic's best-known wreck sites. The model is an underwater photogrammetry scan.","locationPrecision":"Published wreck-site coordinates; the scan is not georeferenced to the map marker."},
 {"id":"cs-retriever-greece","name":"CS Retriever — Greek waters","label":"CS RETRIEVER","coordinates":[23.77,37.36],"coordinateText":"Approx. 37.36° N, 23.77° E · Greece","displayDepthM":50,"lengthM":50,"beamM":8,"builtYear":1940,"lostYear":1944,"modelId":"bdd67eca62bb417ea14e15933f888865","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/cs-retriever-bdd67eca62bb417ea14e15933f888865","projectUrl":"https://dive3d.eu/models/greece/cs-retriever/","projectLinkLabel":"Dive3D · wreck and scan details ↗","detail":"An underwater wreck in Greek waters scanned for an interactive 3D model. The published scan is hosted by its creator; the icon marks the reported wreck area and is not derived from the model origin.","locationPrecision":"Approximate Greek site-area placement; use the scan and linked dive-site record for context."},
 {"id":"liban-marseille","name":"Liban — Marseille steamship wreck","label":"LIBAN · MARSEILLE","coordinates":[5.29,43.28],"coordinateText":"Approx. 43.28° N, 5.29° E · Marseille, France","displayDepthM":33,"lengthM":91,"beamM":11,"builtYear":1882,"lostYear":1903,"modelId":"11633fcb90d94468827b1f85f379a8ff","creator":"Septentrion · CNRS photogrammetry project","sourceUrl":"https://sketchfab.com/3d-models/liban-shipwreck-marseille-11633fcb90d94468827b1f85f379a8ff","projectUrl":"https://sketchfab.com/3d-models/liban-shipwreck-marseille-11633fcb90d94468827b1f85f379a8ff","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"The 1903 steamship Liban wreck lies off Marseille. This photogrammetry model covers the surviving stern section, rather than reconstructing the complete 91 m vessel.","locationPrecision":"Approximate wreck-site placement off Marseille; scan covers a partial stern and is not georeferenced."},
 {"id":"x127-venice","name":"X127 — Venice Lagoon wreck","label":"X127 · VENICE","coordinates":[12.34,45.43],"coordinateText":"Approx. 45.43° N, 12.34° E · Venice Lagoon, Italy","displayDepthM":8,"lengthM":31,"beamM":6,"builtYear":1911,"lostYear":1945,"modelId":"035c7626b53e49218461bf7cb2ed4730","creator":"As credited on the original model page","sourceUrl":"https://sketchfab.com/3d-models/x127-wreck-035c7626b53e49218461bf7cb2ed4730","projectUrl":"https://sketchfab.com/3d-models/x127-wreck-035c7626b53e49218461bf7cb2ed4730","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A small military lighter wreck in the Venice Lagoon, captured as an underwater photogrammetry model. Its in-card viewer presents the scan at its source, while the icon marks the lagoon site.","locationPrecision":"Approximate Venice Lagoon site center; not a navigational waypoint or model georeference."},
 {"id":"skjernoysund-wreck","name":"Skjernøysund historic wreck — Norway","label":"SKJERNØYSUND WRECK","coordinates":[7.55,58.03],"coordinateText":"Approx. 58.03° N, 7.55° E · Skjernøysund, Norway","displayDepthM":15,"lengthM":30,"beamM":7,"modelId":"7fbd32041d1c4850a6ddbbeacb7fbdc2","creator":"As credited on the original model page","sourceUrl":"https://sketchfab.com/3d-models/skjernoysund-wreck-7fbd32041d1c4850a6ddbbeacb7fbdc2","projectUrl":"https://sketchfab.com/3d-models/skjernoysund-wreck-7fbd32041d1c4850a6ddbbeacb7fbdc2","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A historic Norwegian wreck documented through underwater photogrammetry. The scan focuses on the archaeological remains at Skjernøysund; vessel identity and full dimensions are not firmly established in the public scan record.","locationPrecision":"Approximate Skjernøysund survey area; the source model is not georeferenced.","scanLabel":"Historic wreck · photogrammetry scan"},
 {"id":"estonia-merchant-18c","name":"Early 18th-century merchant vessel — Estonia","label":"ESTONIAN MERCHANT WRECK","coordinates":[24.35,59.45],"coordinateText":"Approx. 59.45° N, 24.35° E · near Suurupi, Estonia","displayDepthM":34,"lengthM":25,"beamM":7,"builtYear":1700,"modelId":"3af13ad1712b4facbed23148c9cf9f2f","creator":"As credited on the original model page","sourceUrl":"https://sketchfab.com/3d-models/early-18th-century-merchant-vessel-estonia-3af13ad1712b4facbed23148c9cf9f2f","projectUrl":"https://sketchfab.com/3d-models/early-18th-century-merchant-vessel-estonia-3af13ad1712b4facbed23148c9cf9f2f","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"An archaeological merchant-vessel wreck near the Suurupi peninsula, assigned to the early 18th century. The photogrammetry scan records the wreck remains at about 34 m.","locationPrecision":"Approximate site placement near Suurupi based on the published regional location; model is not georeferenced."},
 {"id":"lootsi-cog-estonia","name":"Lootsi Cog — Tallinn, Estonia","label":"LOOTSI COG","coordinates":[24.745,59.438],"coordinateText":"Approx. 59.438° N, 24.745° E · Tallinn, Estonia","displayDepthM":5,"lengthM":24,"beamM":8,"builtYear":1300,"modelId":"11a30eb9136546f694600a0fddfb8e5d","creator":"As credited on the original model page","sourceUrl":"https://sketchfab.com/3d-models/lootsi-cog-11a30eb9136546f694600a0fddfb8e5d","projectUrl":"https://sketchfab.com/3d-models/lootsi-cog-11a30eb9136546f694600a0fddfb8e5d","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A medieval merchant cog excavated in Tallinn and later conserved for museum display. This digital scan represents a recovered wreck; the map marker identifies the archaeological find area.","locationPrecision":"Approximate Tallinn find-site position; this is a recovered museum vessel scan rather than an in-situ seabed mesh."},
 {"id":"ampyri-finland","name":"Ämpyri wreck — Finland","label":"ÄMPYRI WRECK","coordinates":[24.95,60.12],"coordinateText":"Approx. 60.12° N, 24.95° E · Gulf of Finland","displayDepthM":15,"lengthM":25,"beamM":6,"modelId":"81863c7ef7ad42e4bf23dfbf2bfa9fb6","creator":"Finnish Heritage Agency","sourceUrl":"https://sketchfab.com/3d-models/ampyri-wreck-81863c7ef7ad42e4bf23dfbf2bfa9fb6","projectUrl":"https://sketchfab.com/3d-models/ampyri-wreck-81863c7ef7ad42e4bf23dfbf2bfa9fb6","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A Finnish underwater archaeological wreck documented by the Finnish Heritage Agency using photogrammetry. The published scan is a site record, not a full-scale georeferenced seabed model.","locationPrecision":"Approximate Gulf of Finland placement based on the public archive locality.","scanLabel":"Finnish Heritage Agency · underwater scan"},
 {"id":"vasa-museum","name":"Vasa — Stockholm museum scan","label":"VASA · STOCKHOLM","coordinates":[18.091,59.326],"coordinateText":"59.326° N, 18.091° E · Vasa Museum, Stockholm, Sweden","displayDepthM":32,"lengthM":69,"beamM":11.7,"builtYear":1628,"modelId":"7081e21369e241b99266afefa43a4f38","creator":"As credited on the original model page","sourceUrl":"https://sketchfab.com/3d-models/vasa-shipwreck-7081e21369e241b99266afefa43a4f38","projectUrl":"https://www.vasamuseet.se/en","projectLinkLabel":"Vasa Museum · vessel history and preservation ↗","locationSourceUrl":"https://www.vasamuseet.se/en","locationLinkLabel":"Vasa Museum · official site ↗","detail":"The 17th-century Swedish warship sank in Stockholm harbor on its maiden voyage and was raised in 1961. This scan represents the preserved ship on museum display; the original wreck lay in roughly 32 m of water.","locationPrecision":"Marker identifies the museum display location; it is not the ship's original harbor wreck coordinate."},
 {"id":"mary-rose-museum","name":"Mary Rose — Portsmouth museum scan","label":"MARY ROSE · PORTSMOUTH","coordinates":[-1.108,50.78],"coordinateText":"50.78° N, 1.108° W · Mary Rose Museum, Portsmouth, England","displayDepthM":12,"lengthM":38,"beamM":12,"builtYear":1511,"lostYear":1545,"modelId":"316db8d7099b42b28f889aedddc86e9d","creator":"As credited on the original model page","sourceUrl":"https://sketchfab.com/3d-models/mary-rose-wreck-316db8d7099b42b28f889aedddc86e9d","projectUrl":"https://maryrose.org/","projectLinkLabel":"Mary Rose Museum · ship history and conservation ↗","locationSourceUrl":"https://maryrose.org/","locationLinkLabel":"Mary Rose Museum · official site ↗","detail":"Henry VIII's warship sank in 1545 and was raised from the Solent in 1982. The in-card scan presents the preserved wreck in its Portsmouth museum; the historical wreck site was in about 12 m of water.","locationPrecision":"Marker identifies the museum display location; the scan is not an in-situ seafloor model."},
 {"id":"james-fennell-portland","name":"James Fennell wreck — Portland, England","label":"JAMES FENNELL WRECK","coordinates":[-2.45,50.58],"coordinateText":"Approx. 50.58° N, 2.45° W · Portland, Dorset, England","displayDepthM":18,"lengthM":40,"beamM":8,"modelId":"b4fdc29a0cee4d419b7661cf8d7ebd75","creator":"As credited on the original model page","sourceUrl":"https://sketchfab.com/3d-models/james-fennell-wreck-b4fdc29a0cee4d419b7661cf8d7ebd75","projectUrl":"https://sketchfab.com/3d-models/james-fennell-wreck-b4fdc29a0cee4d419b7661cf8d7ebd75","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A wreck off Portland documented in a photogrammetry project supported by Historic England. The available model captures the surveyed remains, not a digitally reconstructed full hull.","locationPrecision":"Approximate Portland-area site placement from the public survey description; scan is not georeferenced.","scanLabel":"Historic England-supported photogrammetry survey"},
 {"id":"kaptan-ismail-hakki","name":"Kaptan Ismail Hakki — Aegean Sea","label":"KAPTAN ISMAIL HAKKI","coordinates":[25.3,36.2],"coordinateText":"Approx. 36.2° N, 25.3° E · Aegean Sea, Greece","displayDepthM":12,"lengthM":58.3,"beamM":9,"modelId":"845f90352f604e4fa942aadbe360ffbb","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/kaptan-ismail-hakki-845f90352f604e4fa942aadbe360ffbb","projectUrl":"https://dive3d.eu/models/greece/kaptan-ismail-hakki/","projectLinkLabel":"Dive3D · wreck and scan details ↗","detail":"A 58.3 m vessel wreck in Greek waters, scanned underwater by Dive3D. The wreck rests on its side in shallow water; the hosted photogrammetry viewer shows the surveyed remains.","locationPrecision":"Approximate Aegean site-area point; use the linked Dive3D site page for the published dive location.","scanLabel":"Dive3D underwater photogrammetry"},
 {"id":"ms-alaska-ii-suez","name":"MS Alaska II — Gulf of Suez","label":"MS ALASKA II","coordinates":[33.72,27.73],"coordinateText":"Approx. 27.73° N, 33.72° E · Gulf of Suez, Egypt","displayDepthM":30,"lengthM":82,"beamM":12,"builtYear":1950,"lostYear":1980,"modelId":"50ee2a07822c426ba7f3662c096b3ae8","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/ms-alaska-ii-50ee2a07822c426ba7f3662c096b3ae8","projectUrl":"https://dive3d.eu/models/egypt/alaska/","projectLinkLabel":"Dive3D · wreck and scan details ↗","detail":"An 82 m refrigerated cargo vessel wreck in the Gulf of Suez, captured as a large underwater 3D model. The source scan uses photogrammetry and preserves the wreck's broad hull and deck structures.","locationPrecision":"Approximate Gulf of Suez site location; model is not georeferenced."},
 {"id":"hmas-ae1","name":"HMAS AE1 — Rabaul, Papua New Guinea","label":"HMAS AE1","coordinates":[152.37,-4.23],"coordinateText":"Approx. 4.23° S, 152.37° E · Duke of York Islands, Papua New Guinea","displayDepthM":300,"lengthM":55,"beamM":6.2,"builtYear":1913,"lostYear":1914,"modelId":"41520d15cde0450db48d272f038aac96","creator":"Curtin HIVE","sourceUrl":"https://sketchfab.com/3d-models/hmas-ae1-wreck-digital-3d-model-by-curtin-hive-41520d15cde0450db48d272f038aac96","projectUrl":"https://sketchfab.com/3d-models/hmas-ae1-wreck-digital-3d-model-by-curtin-hive-41520d15cde0450db48d272f038aac96","projectLinkLabel":"Curtin HIVE · digital model and survey attribution ↗","detail":"Australia's first submarine vanished with all 35 aboard in 1914. The 2018 survey captured more than 8,000 images for a photogrammetric 3D reconstruction of the wreck, discovered near the Duke of York Islands.","locationPrecision":"Approximate site-area point near the reported discovery region; wreck is deep and the model is not georeferenced."},
 {"id":"hms-buffalo-new-zealand","name":"HMS Buffalo — Mercury Bay, New Zealand","label":"HMS BUFFALO","coordinates":[175.77,-36.82],"coordinateText":"Approx. 36.82° S, 175.77° E · Mercury Bay, New Zealand","displayDepthM":6,"lengthM":40,"beamM":9,"builtYear":1840,"lostYear":1840,"modelId":"4c171a9f2bca4bea906746564a29eeab","creator":"As credited on the original model page","sourceUrl":"https://sketchfab.com/3d-models/hms-buffalo-wreck-new-zealand-4c171a9f2bca4bea906746564a29eeab","projectUrl":"https://sketchfab.com/3d-models/hms-buffalo-wreck-new-zealand-4c171a9f2bca4bea906746564a29eeab","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"The 1840 wreck lies in Mercury Bay, where roughly 70% of the hull remains exposed. A detailed photogrammetry survey recorded the surviving hull from a large set of underwater images.","locationPrecision":"Approximate Mercury Bay wreck location; the published model does not provide a georeferenced transform."},
 {"id":"hoki-maru-chuuk","name":"Hoki Maru — Chuuk Lagoon","label":"HOKI MARU","coordinates":[151.843,7.356],"coordinateText":"Approx. 7.356° N, 151.843° E · Chuuk Lagoon, Micronesia","displayDepthM":50,"lengthM":137,"beamM":18,"builtYear":1921,"lostYear":1944,"modelId":"cce0f5afe6894a04ba7f50d1bd040177","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/hoki-maru-in-truk-lagoon-chuuk-cce0f5afe6894a04ba7f50d1bd040177","projectUrl":"https://dive3d.eu/models/chuuk-lagoon-truk/hoki-maru/","projectLinkLabel":"Dive3D · scan and vessel details ↗","detail":"A large WWII cargo ship in Chuuk Lagoon, sunk during Operation Hailstone. Dive3D's 2025 survey produced an underwater photogrammetry scan of the wreck; published vessel length is about 137 m.","locationPrecision":"Approximate Chuuk Lagoon site placement; model origin is not used as a map coordinate."},
 {"id":"rio-de-janeiro-maru","name":"Rio de Janeiro Maru — Chuuk Lagoon","label":"RIO DE JANEIRO MARU","coordinates":[151.895,7.355],"coordinateText":"Approx. 7.355° N, 151.895° E · Chuuk Lagoon, Micronesia","displayDepthM":34,"lengthM":137,"beamM":18,"builtYear":1922,"lostYear":1944,"modelId":"e75027e47a66457899ac0f602c8ace28","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/rio-de-janeiro-maru-at-truk-lagoon-chuuk-e75027e47a66457899ac0f602c8ace28","projectUrl":"https://sketchfab.com/3d-models/rio-de-janeiro-maru-at-truk-lagoon-chuuk-e75027e47a66457899ac0f602c8ace28","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A large Japanese cargo and passenger liner sunk in Chuuk Lagoon during WWII. Its 3D photogrammetry scan shows the wreck site and surrounding seabed.","locationPrecision":"Approximate Chuuk Lagoon wreck location; the photogrammetry mesh is not georeferenced."},
 {"id":"san-francisco-maru","name":"San Francisco Maru — Chuuk Lagoon","label":"SAN FRANCISCO MARU","coordinates":[151.854,7.385],"coordinateText":"Approx. 7.385° N, 151.854° E · Chuuk Lagoon, Micronesia","displayDepthM":62,"lengthM":117,"beamM":16,"builtYear":1919,"lostYear":1944,"modelId":"a9051932ebcb47499fb400aeb00fbce1","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/san-francisco-maru-a9051932ebcb47499fb400aeb00fbce1","projectUrl":"https://dive3d.eu/models/chuuk-lagoon-truk/san-francisco-maru/","projectLinkLabel":"Dive3D · wreck and survey details ↗","detail":"A 117 m Japanese cargo ship wreck in Chuuk Lagoon, famous for its deep cargo holds and deck vehicles. Dive3D scanned the site in 2025 and published an underwater photogrammetry model.","locationPrecision":"Approximate Chuuk Lagoon site center; scan is not supplied as a georeferenced mesh."},
 {"id":"sankisan-maru","name":"Sankisan Maru — Chuuk Lagoon","label":"SANKISAN MARU","coordinates":[151.903,7.353],"coordinateText":"Approx. 7.353° N, 151.903° E · Chuuk Lagoon, Micronesia","displayDepthM":46,"lengthM":112,"beamM":16,"builtYear":1940,"lostYear":1944,"modelId":"8b052091ce044afa98cb91e5d20a471a","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/sankisan-maru-in-truk-lagoon-chuuk-8b052091ce044afa98cb91e5d20a471a","projectUrl":"https://sketchfab.com/3d-models/sankisan-maru-in-truk-lagoon-chuuk-8b052091ce044afa98cb91e5d20a471a","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A WWII Japanese transport ship of about 112 m lying in Chuuk Lagoon. The published photogrammetry viewer captures its underwater structure and the site condition.","locationPrecision":"Approximate lagoon site placement; model origin is not a geographic reference."},
 {"id":"aikoku-maru-chuuk","name":"Aikoku Maru — Chuuk Lagoon","label":"AIKOKU MARU","coordinates":[151.837,7.362],"coordinateText":"Approx. 7.362° N, 151.837° E · Chuuk Lagoon, Micronesia","displayDepthM":64,"lengthM":150,"beamM":20,"builtYear":1939,"lostYear":1944,"modelId":"2054407b1051470cab6e1daab88add97","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/aikoku-maru-2054407b1051470cab6e1daab88add97","projectUrl":"https://sketchfab.com/3d-models/aikoku-maru-2054407b1051470cab6e1daab88add97","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A 150 m Japanese auxiliary cruiser and passenger liner sunk in Chuuk Lagoon during Operation Hailstone. Its underwater scan presents a major WWII wreck and surrounding remains.","locationPrecision":"Approximate Chuuk Lagoon site-area point; scan is not georeferenced."},
 {"id":"nippo-maru-chuuk","name":"Nippo Maru — Chuuk Lagoon","label":"NIPPO MARU","coordinates":[151.86,7.37],"coordinateText":"Approx. 7.370° N, 151.860° E · Chuuk Lagoon, Micronesia","displayDepthM":50,"lengthM":108,"beamM":15,"builtYear":1936,"lostYear":1944,"modelId":"817011fba64b4fb0b0dc697d870e9208","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/nippo-maru-in-truk-lagoon-chuuk-817011fba64b4fb0b0dc697d870e9208","projectUrl":"https://sketchfab.com/3d-models/nippo-maru-in-truk-lagoon-chuuk-817011fba64b4fb0b0dc697d870e9208","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A Japanese cargo vessel wreck from Operation Hailstone, resting in Chuuk Lagoon. The in-card 3D view is the underwater photogrammetry scan from its original publisher.","locationPrecision":"Approximate lagoon site location; the model is not georeferenced."},
 {"id":"shinkoku-maru-chuuk","name":"Shinkoku Maru — Chuuk Lagoon tanker","label":"SHINKOKU MARU","coordinates":[151.84,7.36],"coordinateText":"Approx. 7.360° N, 151.840° E · Chuuk Lagoon, Micronesia","displayDepthM":39,"lengthM":152,"beamM":20,"builtYear":1939,"lostYear":1944,"modelId":"b2b1a2839f5e4b5db53218e93fe3d846","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/shinkoku-maru-in-truk-lagoon-chuuk-b2b1a2839f5e4b5db53218e93fe3d846","projectUrl":"https://dive3d.eu/models/chuuk-lagoon-truk/shinkoku-maru/","projectLinkLabel":"Dive3D · scan and vessel details ↗","detail":"The 152 m oil tanker was the second-largest wreck in Chuuk Lagoon. Dive3D scanned it in 2025; its bridge lies around 11 m deep and the propeller reaches about 39 m.","locationPrecision":"Approximate Chuuk Lagoon site point; model is not tied to a survey-control coordinate frame."},
 {"id":"olympia-maru-coron","name":"Olympia Maru — Coron Bay","label":"OLYMPIA MARU","coordinates":[120.176,12.08],"coordinateText":"Approx. 12.080° N, 120.176° E · Coron Bay, Philippines","displayDepthM":30,"lengthM":120,"beamM":17,"builtYear":1921,"lostYear":1944,"modelId":"680fea97a76646aeb02dcebd2967f7b0","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/olympia-maru-coron-bay-680fea97a76646aeb02dcebd2967f7b0","projectUrl":"https://sketchfab.com/3d-models/olympia-maru-coron-bay-680fea97a76646aeb02dcebd2967f7b0","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A WWII Japanese cargo ship wreck in Coron Bay, part of the fleet destroyed during the September 1944 air attack. The underwater model shows the wreck and its coral-covered structures.","locationPrecision":"Approximate Coron Bay wreck area; scan mesh is not georeferenced."},
 {"id":"el-capitan-subic-bay","name":"El Capitan — Subic Bay","label":"EL CAPITAN · SUBIC BAY","coordinates":[120.23,14.8],"coordinateText":"Approx. 14.80° N, 120.23° E · Subic Bay, Philippines","displayDepthM":22,"lengthM":53,"beamM":9,"builtYear":1930,"lostYear":1942,"modelId":"b6d43336a8a946d29d8beebb6e9a1d29","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/el-capitan-majaba-subic-bay-b6d43336a8a946d29d8beebb6e9a1d29","projectUrl":"https://sketchfab.com/3d-models/el-capitan-majaba-subic-bay-b6d43336a8a946d29d8beebb6e9a1d29","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A cargo vessel wreck in Subic Bay, now covered in marine growth. Dive3D's underwater scan captures the surviving hull and surrounding site in photogrammetry.","locationPrecision":"Approximate Subic Bay wreck-site location; the model is not georeferenced."},
 {"id":"ijm-i169-chuuk","name":"IJN Submarine I-169 — Chuuk Lagoon","label":"IJN SUBMARINE I-169","coordinates":[151.86,7.39],"coordinateText":"Approx. 7.390° N, 151.860° E · Chuuk Lagoon, Micronesia","displayDepthM":42,"lengthM":100,"beamM":9,"builtYear":1934,"lostYear":1944,"modelId":"6ff8e32bc68240ffb960dce9543a3319","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/ijn-submarine-i-169-6ff8e32bc68240ffb960dce9543a3319","projectUrl":"https://sketchfab.com/3d-models/ijn-submarine-i-169-6ff8e32bc68240ffb960dce9543a3319","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A Japanese submarine wreck in Chuuk Lagoon surveyed by Dive3D. The 2025 photogrammetry model shows the underwater wreck as preserved on the seafloor.","locationPrecision":"Approximate Chuuk Lagoon wreck-site placement; model does not publish georeferenced coordinates."},
 {"id":"bounty-pontoon-bali","name":"Bounty Pontoon — Nusa Lembongan","label":"BOUNTY PONTOON","coordinates":[115.453,-8.683],"coordinateText":"Approx. 8.683° S, 115.453° E · Nusa Lembongan, Bali, Indonesia","displayDepthM":8,"lengthM":30,"beamM":12,"scuttledYear":2020,"modelId":"aec69800b89243f6bede6437cc244d05","creator":"CheeseAndJamSandwich","sourceUrl":"https://sketchfab.com/3d-models/the-bounty-pontoon-wreck-september-2021-aec69800b89243f6bede6437cc244d05","projectUrl":"https://sketchfab.com/3d-models/the-bounty-pontoon-wreck-september-2021-aec69800b89243f6bede6437cc244d05","projectLinkLabel":"Scan page · model details and attribution ↗","detail":"A large floating dive pontoon that sank in the bay of Nusa Lembongan in 2020 and settled on a shallow reef at about 8 m. The scan records the wreck after wave and current damage and salvage.","locationPrecision":"Approximate bay location; the scan is not georeferenced.","scanLabel":"2021 underwater photogrammetry scan"},
 {"id":"alma-jane-philippines","name":"MV Alma Jane — Puerto Galera","label":"MV ALMA JANE","coordinates":[120.9736,13.52255],"coordinateText":"13.52255° N, 120.97360° E · Puerto Galera, Philippines","displayDepthM":30,"lengthM":32,"beamM":7,"builtYear":1966,"scuttledYear":2003,"modelId":"99c70dc4f5494ea4962aaa408f8ec705","creator":"Holger Buss · Dive3D","sourceUrl":"https://sketchfab.com/3d-models/shipwreck-alma-jane-in-the-philippines-99c70dc4f5494ea4962aaa408f8ec705","projectUrl":"https://dive3d.eu/models/philippines/alma-jane-mv/","projectLinkLabel":"Dive3D · wreck and scan details ↗","locationSourceUrl":"https://www.padi.com/dive-site/philippines/alma-jane/","locationLinkLabel":"PADI · Puerto Galera dive site ↗","detail":"A 32 m cargo vessel deliberately scuttled in 2003 as an artificial reef off Puerto Galera. Dive3D scanned the upright wreck in November 2026; the site rests on sand at about 30 m.","locationPrecision":"Published dive-site coordinates; underwater scan is not georeferenced to this marker."},
 {"id":"zeewijk-abrolhos","name":"Zeewijk (1727) — Houtman Abrolhos","label":"ZEEWIJK · ABROLHOS","coordinates":[113.82,-28.88],"coordinateText":"Approx. 28.88° S, 113.82° E · outer Half Moon Reef, Houtman Abrolhos, Australia","displayDepthM":4,"lengthM":40,"beamM":9,"builtYear":1726,"lostYear":1727,"modelId":"5c8a8b3e71d34389b9e9c5572df37f42","creator":"Western Australian Museum · Patrick Morrison","sourceUrl":"https://sketchfab.com/3d-models/zeewijk-1727-wreck-site-2022-5c8a8b3e71d34389b9e9c5572df37f42","projectUrl":"https://museum.wa.gov.au/maritime-archaeology-db/wrecks/zeewijk","projectLinkLabel":"Western Australian Museum · wreck history ↗","locationSourceUrl":"https://museum.wa.gov.au/maritime-archaeology-db/wrecks/zeewijk","locationLinkLabel":"Western Australian Museum · wreck record ↗","detail":"The Dutch East India Company ship Zeewijk wrecked on the outer Half Moon Reef in 1727. The Western Australian Museum recorded the site with 6,413 images over a four-day 2022 photogrammetry survey.","locationPrecision":"Approximate center of the outer Half Moon Reef site; the Sketchfab scan is an archaeological site mesh, not a georeferenced marker transform."},
];

const ADDITIONAL_SHIPWRECK_BY_ID=new Map(ADDITIONAL_SHIPWRECKS.map(w=>[w.id,w]));
export function buildAdditionalShipwreckFeatures(records=ADDITIONAL_SHIPWRECKS){
 return (Array.isArray(records)?records:[]).filter(w=>
  w&&typeof w.id==='string'&&Array.isArray(w.coordinates)&&
  Number.isFinite(Number(w.coordinates[0]))&&Number.isFinite(Number(w.coordinates[1]))&&
  Math.abs(Number(w.coordinates[0]))<=180&&Math.abs(Number(w.coordinates[1]))<=85
 ).map(w=>({type:'Feature',id:w.id,geometry:{type:'Point',coordinates:[Number(w.coordinates[0]),Number(w.coordinates[1])]},
  properties:{wreckId:w.id,name:w.name,label:w.label,part:'photogrammetry-scan',iconImage:ICON_ID,depthM:w.displayDepthM,coordinateText:w.coordinateText}}));
}

export function buildAllShipwreckFeatures(){
 const p=ROBERT_GASKIN_WRECK;
 const gaskin={type:'Feature',id:p.id,geometry:{type:'Point',coordinates:[Number(p.coordinates[0]),Number(p.coordinates[1])]},
  properties:{wreckId:p.id,name:p.name,label:p.label,part:p.part,iconImage:ICON_ID,depthM:p.depthM,coordinateText:p.coordinateText}};
 const g=HMS_GRAFTON_WRECK;
 const grafton={type:'Feature',id:g.id,geometry:{type:'Point',coordinates:[Number(g.coordinates[0]),Number(g.coordinates[1])]},
  properties:{wreckId:g.id,name:g.name,label:g.label,part:g.part,iconImage:ICON_ID,depthM:g.scanDepthM,coordinateText:g.coordinateText}};
 const c=CANNON_WRECK;
 const cannon={type:'Feature',id:c.id,geometry:{type:'Point',coordinates:[Number(c.coordinates[0]),Number(c.coordinates[1])]},
  properties:{wreckId:c.id,name:c.name,label:c.label,part:c.part,iconImage:ICON_ID,depthM:c.displayDepthM,coordinateText:c.coordinateText}};
 const k=HNLMS_KXI_WRECK;
 const kxi={type:'Feature',id:k.id,geometry:{type:'Point',coordinates:[Number(k.coordinates[0]),Number(k.coordinates[1])]},
  properties:{wreckId:k.id,name:k.name,label:k.label,part:k.part,iconImage:ICON_ID,depthM:k.displayDepthM,coordinateText:k.coordinateText}};
 const o=CAPE_OTWAY_WRECK;
 const capeOtway={type:'Feature',id:o.id,geometry:{type:'Point',coordinates:[Number(o.coordinates[0]),Number(o.coordinates[1])]},
  properties:{wreckId:o.id,name:o.name,label:o.label,part:o.part,iconImage:ICON_ID,depthM:o.displayDepthM,coordinateText:o.coordinateText}};
 const t=TIMARU_WRECK;
 const timaru={type:'Feature',id:t.id,geometry:{type:'Point',coordinates:[Number(t.coordinates[0]),Number(t.coordinates[1])]},
  properties:{wreckId:t.id,name:t.name,label:t.label,part:t.part,iconImage:ICON_ID,depthM:t.displayDepthM,coordinateText:t.coordinateText}};
 const l=HMS_LOO_WRECK;
 const hmsLoo={type:'Feature',id:l.id,geometry:{type:'Point',coordinates:[Number(l.coordinates[0]),Number(l.coordinates[1])]},
  properties:{wreckId:l.id,name:l.name,label:l.label,part:l.part,iconImage:ICON_ID,depthM:l.displayDepthM,coordinateText:l.coordinateText}};
 return [...buildTitanicShipwreckFeatures(),gaskin,grafton,cannon,kxi,capeOtway,timaru,hmsLoo,...buildAdditionalShipwreckFeatures()];
}

export const TITANIC_3D_MODELS=[
 {id:'titanic-bow-photogrammetry',part:'bow',title:'RMS Titanic’s bow wreck',creator:'Pramet.Peet',platform:'Sketchfab',
  triangles:'5 million',vertices:'2.5 million',
  sourceUrl:'https://sketchfab.com/3d-models/rms-titanics-bow-wreck-292b9f523d4a4366bf6dfbbd5d959e43',
  embedUrl:'https://sketchfab.com/models/292b9f523d4a4366bf6dfbbd5d959e43/embed?autostart=0&ui_infos=1&ui_controls=1&ui_watermark=1&ui_theme=dark',
  description:'Independent Sketchfab upload titled “RMS Titanic’s bow wreck” and tagged photogrammetry. Its publisher does not document a survey-grade scale, georeferenced origin or connection to Magellan’s official dataset.'},
 {id:'titanic-stern-photogrammetry',part:'stern',title:'RMS Titanic’s stern wreck',creator:'Pramet.Peet',platform:'Sketchfab',
  triangles:'4.5 million',vertices:'2.2 million',
  sourceUrl:'https://sketchfab.com/3d-models/rms-titanics-stern-wreck-5baccbaf949f4882b4f73f1c0169392d',
  embedUrl:'https://sketchfab.com/models/5baccbaf949f4882b4f73f1c0169392d/embed?autostart=0&ui_infos=1&ui_controls=1&ui_watermark=1&ui_theme=dark',
  description:'Independent Sketchfab upload titled “RMS Titanic’s stern wreck” and tagged photogrammetry. Its publisher does not document a survey-grade scale, georeferenced origin or connection to Magellan’s official dataset.'},
 {id:'titanic-full-size-reference',part:'reference',title:'RMS Titanic — full-size historical reconstruction',creator:'Nicholas Correia · The Wreck Explorer',platform:'The Wreck Explorer',
  sourceUrl:'https://www.wreckexplorer.co.uk/titanic-3d',
  embedUrl:'https://www.wreckexplorer.co.uk/titanic-3d#t3-stage',
  triangles:null,vertices:null,
  description:'Interactive 1:1 historical reconstruction (one scene unit equals one metre), not a photogrammetry scan or survey of the wreck. Its author notes that its wreck view places the bow and stern 200 m apart rather than their seabed separation.'}
];

export const TITANIC_OFFICIAL_SCAN_SOURCES=[
 {title:'NOAA — Titanic Expedition 2004 waypoint record',url:'https://repository.library.noaa.gov/view/noaa/10519/noaa_10519_DS1.pdf'},
 {title:'Magellan — Titanic TT24 full-size digital twin',url:'https://www.magellan.gg/magellan-titanic-tt24/'},
 {title:'Voyis — RMS Titanic survey and 3D reconstruction',url:'https://voyis.com/projects-titanic/'}
];

export function buildTitanicShipwreckFeatures(parts=TITANIC_SHIPWRECK_PARTS){
 return (Array.isArray(parts)?parts:[]).filter(p=>
  p&&typeof p.id==='string'&&Array.isArray(p.coordinates)&&
  Number.isFinite(Number(p.coordinates[0]))&&Number.isFinite(Number(p.coordinates[1]))&&
  Math.abs(Number(p.coordinates[0]))<=180&&Math.abs(Number(p.coordinates[1]))<=85
 ).map(p=>({
  type:'Feature',id:p.id,
  geometry:{type:'Point',coordinates:[Number(p.coordinates[0]),Number(p.coordinates[1])]},
  properties:{partId:p.id,name:p.name,label:p.label,part:p.part,iconImage:ICON_ID,depthM:p.depthM,coordinateText:p.coordinateText}
 }));
}

function safe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function modelById(id){return TITANIC_3D_MODELS.find(m=>m.id===id)||null;}
function partById(id){return TITANIC_SHIPWRECK_PARTS.find(p=>p.id===id)||null;}
export function additionalShipwreckPopupHtml(wreck){
 if(!wreck)return '';
 const embed=wreck.embedUrl||'https://sketchfab.com/models/'+encodeURIComponent(wreck.modelId)+'/embed?autostart=0&ui_infos=1&ui_controls=1&ui_watermark=1&ui_theme=dark';
 const facts=[
  ['Wreck-site position',wreck.coordinateText],
  ['Seafloor depth','About '+wreck.displayDepthM+' m'],
  ['Vessel length',wreck.lengthM+' m'+(wreck.beamM?' · '+wreck.beamM+' m beam':'')],
  ['Scan / identification',wreck.scanLabel||(wreck.builtYear?'Built '+wreck.builtYear+(wreck.scuttledYear?' · scuttled '+wreck.scuttledYear:''):'WreckSploration photogrammetry')]
 ].map(([label,value])=>'<span><b>'+safe(label)+'</b>'+safe(value)+'</span>').join('');
 const links='<a href="'+safe(wreck.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+safe(wreck.sourceLinkLabel||'Sketchfab · original interactive photogrammetry scan ↗')+'</a>'+ 
  '<a href="'+safe(wreck.projectUrl)+'" target="_blank" rel="noopener noreferrer">'+safe(wreck.projectLinkLabel||'WreckSploration · project notes and scan details ↗')+'</a>'+ 
  (wreck.locationSourceUrl?'<a href="'+safe(wreck.locationSourceUrl)+'" target="_blank" rel="noopener noreferrer">'+safe(wreck.locationLinkLabel||'Western Australian Museum · wreck record and position ↗')+'</a>':'');
 return '<article class="bp-shipwreck-titanic-popup-v1 bp-shipwreck-additional-popup-v1">'+
  '<div class="bp-shipwreck-kicker-v1">BRIDGEPOINT · SHIPWRECKS</div><h3>'+safe(wreck.name)+'</h3>'+ 
  '<div class="bp-shipwreck-part-v1">Wreck site · 3D photogrammetry</div>'+ 
  '<div class="bp-shipwreck-facts-v1">'+facts+'</div>'+ 
  '<div class="bp-shipwreck-viewer-v1"><iframe title="'+safe(wreck.name)+' interactive 3D photogrammetry scan" src="'+safe(embed)+'" allow="autoplay; fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'+ 
  '<div class="bp-shipwreck-official-v1"><b>Scan, history and site references</b>'+links+'</div>'+ 
  '<p class="bp-shipwreck-accuracy-v1"><strong>Scan and placement:</strong> '+safe(wreck.detail)+' The interactive model is embedded from its attributed '+safe(wreck.viewerProvider||'Sketchfab')+' source inside this BridgePoint card. The map marker uses the cited wreck-site position; the scan itself is not georeferenced or scaled as a seabed mesh.</p>'+ 
  (wreck.locationPrecision?'<p class="bp-shipwreck-source-v1">'+safe(wreck.locationPrecision)+'</p>':'')+ 
  '<p class="bp-shipwreck-source-v1">Photogrammetry creator: '+safe(wreck.creator)+'. The model remains hosted by its published source and opens here without leaving BridgePoint.</p></article>';
}
function openAdditionalShipwreckPopup(state,wreck,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup||!wreck)return;
 if(state.popup)state.popup.remove();
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'450px',className:'bp-shipwreck-titanic-popup-wrap-v1'}).setLngLat(lngLat||wreck.coordinates).setHTML(additionalShipwreckPopupHtml(wreck)).addTo(state.map);
}
function officialLinksHtml(){
 return TITANIC_OFFICIAL_SCAN_SOURCES.map(s=>'<a href="'+safe(s.url)+'" target="_blank" rel="noopener noreferrer">'+safe(s.title)+' ↗</a>').join('');
}

export function titanicShipwreckPopupHtml(part,selectedModelId=null){
 if(!part)return '';
 const selected=modelById(selectedModelId);
 const modelChoices=TITANIC_3D_MODELS.map(m=>
  '<button type="button" class="bp-shipwreck-model-choice-v1'+(selected&&m.id===selected.id?' is-active':'')+'" data-shipwreck-model-id="'+safe(m.id)+'" aria-pressed="'+String(!!selected&&m.id===selected.id)+'"><span>'+safe(m.title)+'</span><small>'+safe(m.creator)+' · '+safe(m.platform)+'</small></button>'
 ).join('');
 const viewer=selected
  ?'<iframe id="bp-shipwreck-titanic-viewer-v1" title="'+safe(selected.title)+' — interactive 3D model" src="'+safe(selected.embedUrl)+'" allow="autoplay; fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>'
  :'<div class="bp-shipwreck-viewer-empty-v1" id="bp-shipwreck-viewer-empty-v1">No separate debris-field 3D mesh is included yet. Choose the bow or stern scan above to explore those wreck sections.</div>';
 const modelNote=selected?selected.description:'The selected map waypoint is the debris-field center; the available 3D section models are listed above.';
 const source=selected?selected.sourceUrl:'https://www.magellan.gg/magellan-titanic-tt24/';
 return '<article class="bp-shipwreck-titanic-popup-v1">'+
  '<div class="bp-shipwreck-kicker-v1">BRIDGEPOINT · SHIPWRECKS</div>'+
  '<h3>RMS Titanic</h3>'+
  '<div class="bp-shipwreck-part-v1">'+safe(part.name)+'</div>'+
  '<div class="bp-shipwreck-facts-v1"><span><b>NOAA waypoint</b>'+safe(part.coordinateText)+'</span><span><b>Seafloor depth</b>Approximately '+safe(Number(part.depthM).toLocaleString())+' m</span></div>'+
  '<div class="bp-shipwreck-viewer-v1" id="bp-shipwreck-titanic-viewer-wrap-v1">'+viewer+'</div>'+
  '<div class="bp-shipwreck-model-meta-v1">'+
   '<b id="bp-shipwreck-model-title-v1">'+safe(selected?selected.title:'Select a Titanic 3D model')+'</b>'+
   '<span id="bp-shipwreck-model-creator-v1">'+safe(selected?('Creator: '+selected.creator+' · '+selected.platform):'Bow, stern and full-size reference models are available above')+'</span>'+
   '<span id="bp-shipwreck-model-detail-v1">'+safe(selected?(selected.triangles?'Mesh listing: '+selected.triangles+' triangles · '+selected.vertices+' vertices':'Model scale: 1 unit = 1 metre · original ship dimensions: 269.1 m × 28.2 m'):modelNote)+'</span>'+
   '<p id="bp-shipwreck-model-note-v1">'+safe(modelNote)+'</p>'+
   '<a id="bp-shipwreck-model-source-v1" href="'+safe(source)+'" target="_blank" rel="noopener noreferrer">Open selected model source ↗</a>'+
  '</div>'+
  '<div class="bp-shipwreck-model-choices-v1" aria-label="Titanic 3D model choices">'+modelChoices+'</div>'+
  '<div class="bp-shipwreck-official-v1"><b>Official survey references</b>'+officialLinksHtml()+'</div>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Placement and model accuracy:</strong> The globe markers use the NOAA expedition waypoint for each section. The two Sketchfab models are independent public uploads tagged “photogrammetry”; their published pages do not document metric scale, georeferencing or provenance from Magellan. The official Magellan digital twin is linked above, but its complete model is not offered there as a public embeddable mesh. The 1:1 historical reconstruction is an interpretive reference, not the scanned wreck.</p>'+
  '<p class="bp-shipwreck-source-v1">NOAA coordinates are section/field centers, not survey footprints. The viewer models are references only and are not positioned or scaled as 3D meshes on the globe.</p>'+
 '</article>';
}

function makeTitanicIcon(){
 const canvas=document.createElement('canvas');canvas.width=88;canvas.height=88;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,88,88);
 const g=ctx.createRadialGradient(28,23,4,44,44,40);
 g.addColorStop(0,'#fff7d8');g.addColorStop(.32,'#e3b55c');g.addColorStop(1,'#68451f');
 ctx.fillStyle='rgba(3,14,25,.94)';ctx.beginPath();ctx.arc(44,44,40,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#f5cf81';ctx.lineWidth=3;ctx.stroke();
 ctx.fillStyle=g;ctx.strokeStyle='#fff3cb';ctx.lineWidth=2.2;
 // A clearly recognizable ship silhouette, gently listing above three sonar/wave rings.
 ctx.beginPath();ctx.moveTo(15,47);ctx.lineTo(72,47);ctx.lineTo(63,61);ctx.lineTo(25,61);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#fff0c6';ctx.fillRect(31,35,8,11);ctx.fillRect(43,31,9,15);ctx.fillRect(56,36,7,10);
 ctx.strokeStyle='#fff0c6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(35,34);ctx.lineTo(35,25);ctx.moveTo(47,30);ctx.lineTo(47,21);ctx.moveTo(59,35);ctx.lineTo(59,28);ctx.stroke();
 ctx.strokeStyle='rgba(150,225,240,.95)';ctx.lineWidth=2.4;
 for(const [y,w] of [[68,27],[75,19]]){ctx.beginPath();ctx.moveTo(44-w/2,y);ctx.quadraticCurveTo(44,y+4,44+w/2,y);ctx.stroke();}
 return ctx.getImageData(0,0,88,88);
}
function setStatus(state,msg){state.status=msg;const el=document.getElementById(STATUS_ID);if(el)el.textContent=msg;}
function refreshStatusUi(state){
 const count=document.getElementById(COUNT_ID);
 if(count)count.textContent='70 persistent wreck icons · 7 native CC BY 4.0 seabed scans · 60 additional in-card photogrammetry scans · '+state.stats.models.toLocaleString()+' Titanic viewer references';
 const status=document.getElementById(STATUS_ID);if(status)status.textContent=state.status;
 const button=document.getElementById(TOGGLE_ID);
 if(button){button.setAttribute('aria-pressed',String(state.enabled));button.classList.toggle('is-active',state.enabled);}
}
export function syncTitanicShipwreckCategory(enabled,overlayGuard){
 if(!overlayGuard||typeof overlayGuard.allowLayerCategory!=='function')return false;
 return overlayGuard.allowLayerCategory('shipwrecks',!!enabled)!==false;
}
function syncSharedOverlayCategory(state){
 try{
  state.stats.sharedVisibilityCategoryReady=syncTitanicShipwreckCategory(
   state.enabled,window.__BP_DRONE_AWARENESS_V1__
  );
 }catch(error){
  state.stats.sharedVisibilityCategoryReady=false;
  state.stats.sharedVisibilityCategoryError=String(error?.message||error);
 }
 return !!state.stats.sharedVisibilityCategoryReady;
}
function setVisibility(state,visible){
 syncSharedOverlayCategory(state);
 const next=visible?'visible':'none';
 for(const id of [HALO_ID,MARKER_ID,LABEL_ID]){
  if(!state.map.getLayer(id))continue;
  const current=state.map.getLayoutProperty(id,'visibility')||'visible';
  if(current!==next)state.map.setLayoutProperty(id,'visibility',next);
 }
}
function installLayers(state){
 const map=state.map;if(!map?.getStyle?.())return false;
 try{
  if(!map.hasImage?.(ICON_ID))map.addImage(ICON_ID,makeTitanicIcon(),{pixelRatio:2});
  if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{
   type:'geojson',data:{type:'FeatureCollection',features:buildAllShipwreckFeatures()},
   buffer:64,maxzoom:14,attribution:'Titanic waypoint centers: NOAA 2004 Expedition. Robert Gaskin photogrammetry: Christian Remillard, CC BY 4.0 / Zenodo 10.5281/zenodo.10288556. SS Cape Otway photogrammetry: WreckSploration, CC BY 4.0. Timaru Site 42 photogrammetry: WreckSploration, CC BY 4.0.'
  });
  const add=(id,layer)=>{if(!map.getLayer(id))map.addLayer(layer);};
  add(HALO_ID,{id:HALO_ID,type:'circle',source:SOURCE_ID,minzoom:0,maxzoom:24,
   layout:{visibility:state.enabled?'visible':'none'},
   paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,4,5,7,10,10,16,14,22,17],
    'circle-color':'#e6b95f','circle-opacity':0.36,'circle-blur':0.52}});
  add(MARKER_ID,{id:MARKER_ID,type:'symbol',source:SOURCE_ID,minzoom:0,maxzoom:24,
   layout:{visibility:state.enabled?'visible':'none','icon-image':ICON_ID,
    'icon-size':['interpolate',['linear'],['zoom'],0,0.35,3,0.45,7,0.60,12,0.74,18,0.84,23,0.92],
    'icon-anchor':'center','icon-allow-overlap':true,'icon-ignore-placement':true,'symbol-sort-key':120}});
  add(LABEL_ID,{id:LABEL_ID,type:'symbol',source:SOURCE_ID,minzoom:4,maxzoom:24,
   layout:{visibility:state.enabled?'visible':'none','text-field':['get','label'],
    'text-size':['interpolate',['linear'],['zoom'],4,9,10,11,17,13],
    'text-offset':[0,1.28],'text-anchor':'top','text-allow-overlap':false,'text-ignore-placement':false},
   paint:{'text-color':'#ffe8b7','text-halo-color':'rgba(3,12,22,.96)','text-halo-width':1.5,'text-opacity':0.98}});
  setVisibility(state,state.enabled);return true;
 }catch(error){
  state.stats.lastError=String(error?.message||error);
  console.warn('BridgePoint Titanic shipwreck layer unavailable',error);return false;
 }
}
function applySelectedModel(root,model){
 const viewer=root.querySelector('#bp-shipwreck-titanic-viewer-wrap-v1');
 if(viewer){
  viewer.replaceChildren();
  if(model){
   const frame=document.createElement('iframe');
   frame.id='bp-shipwreck-titanic-viewer-v1';frame.title=model.title+' — interactive 3D model';
   frame.src=model.embedUrl;frame.allow='autoplay; fullscreen; xr-spatial-tracking; gyroscope; accelerometer';
   frame.allowFullscreen=true;frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
   viewer.appendChild(frame);
  }else{
   const empty=document.createElement('div');empty.className='bp-shipwreck-viewer-empty-v1';
   empty.textContent='No separate debris-field 3D mesh is included yet. Choose the bow or stern scan above to explore those wreck sections.';
   viewer.appendChild(empty);
  }
 }
 const put=(selector,value)=>{const el=root.querySelector(selector);if(el)el.textContent=value;};
 put('#bp-shipwreck-model-title-v1',model?model.title:'Select a Titanic 3D model');
 put('#bp-shipwreck-model-creator-v1',model?('Creator: '+model.creator+' · '+model.platform):'Bow, stern and full-size reference models are available above');
 put('#bp-shipwreck-model-detail-v1',model?(model.triangles?'Mesh listing: '+model.triangles+' triangles · '+model.vertices+' vertices':'Model scale: 1 unit = 1 metre · original ship dimensions: 269.1 m × 28.2 m'):'The selected map waypoint is the debris-field center.');
 put('#bp-shipwreck-model-note-v1',model?model.description:'No separate debris-field 3D mesh is included in this first release.');
 const link=root.querySelector('#bp-shipwreck-model-source-v1');
 if(link){link.href=model?model.sourceUrl:'https://www.magellan.gg/magellan-titanic-tt24/';link.textContent=model?'Open selected model source ↗':'Open official Magellan scan reference ↗';}
 for(const button of root.querySelectorAll('[data-shipwreck-model-id]')){
  const active=!!model&&button.getAttribute('data-shipwreck-model-id')===model.id;
  button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));
 }
}
function openTitanicPopup(state,part,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 if(state.popup)state.popup.remove();
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'450px',className:'bp-shipwreck-titanic-popup-wrap-v1'})
  .setLngLat(lngLat||part.coordinates).setHTML(titanicShipwreckPopupHtml(part,part.defaultModelId)).addTo(state.map);
 const root=state.popup.getElement?.();if(!root)return;
 for(const button of root.querySelectorAll('[data-shipwreck-model-id]')){
  button.addEventListener('click',()=>{
   const model=modelById(button.getAttribute('data-shipwreck-model-id'));
   if(model)applySelectedModel(root,model);
  });
 }
}
function updateRobertGaskinModelStatus(state,message){
 state.nativeModelStatus=String(message||'');
 const element=document.getElementById('bp-shipwreck-robert-status-v2');
 if(element)element.textContent=state.nativeModelStatus;
 const popup=state.popup?.getElement?.()?.querySelector('[data-robert-gaskin-status]');
 if(popup)popup.textContent=state.nativeModelStatus;
}
function updateHmsGraftonModelStatus(state,message){
 state.graftonModelStatus=String(message||'');
 const popup=state.popup?.getElement?.()?.querySelector('[data-hms-grafton-status]');
 if(popup)popup.textContent=state.graftonModelStatus;
}
function updateCannonModelStatus(state,message){
 state.cannonModelStatus=String(message||'');
 const popup=state.popup?.getElement?.()?.querySelector('[data-cannon-wreck-status]');
 if(popup)popup.textContent=state.cannonModelStatus;
}
function updateKxiModelStatus(state,message){
 state.kxiModelStatus=String(message||'');
 const popup=state.popup?.getElement?.()?.querySelector('[data-kxi-status]');
 if(popup)popup.textContent=state.kxiModelStatus;
}
function updateCapeOtwayModelStatus(state,message){
 state.capeOtwayModelStatus=String(message||'');
 const popup=state.popup?.getElement?.()?.querySelector('[data-cape-otway-status]');
 if(popup)popup.textContent=state.capeOtwayModelStatus;
}
function updateTimaruModelStatus(state,message){
 state.timaruModelStatus=String(message||'');
 const popup=state.popup?.getElement?.()?.querySelector('[data-timaru-status]');
 if(popup)popup.textContent=state.timaruModelStatus;
}
function updateHmsLooModelStatus(state,message){
 state.hmsLooModelStatus=String(message||'');
 const popup=state.popup?.getElement?.()?.querySelector('[data-hms-loo-status]');
 if(popup)popup.textContent=state.hmsLooModelStatus;
}
async function loadShipwreckThree(){
 if(!shipwreckThreePromise)shipwreckThreePromise=Promise.all([import(THREE_URL),import(GLTF_URL),import(DRACO_URL),import(KTX2_URL)]).then(([THREE,loader,decoder,ktx2])=>{
  if(!THREE?.WebGLRenderer||!loader?.GLTFLoader||!decoder?.DRACOLoader||!ktx2?.KTX2Loader)throw new Error('BridgePoint local Three.js / GLTFLoader / DRACOLoader / KTX2Loader unavailable');
  return {THREE,GLTFLoader:loader.GLTFLoader,DRACOLoader:decoder.DRACOLoader,KTX2Loader:ktx2.KTX2Loader};
 }).catch(error=>{shipwreckThreePromise=null;throw error;});
 return shipwreckThreePromise;
}
function createShipwreckGLTFLoader(state,renderer=null){
 const loader=new state.GLTFLoader();
 if(!state.dracoLoader){
  if(!state.DRACOLoader)throw new Error('BridgePoint local DRACOLoader is unavailable');
  state.dracoLoader=new state.DRACOLoader();
  state.dracoLoader.setDecoderPath('/vendor/draco/');
  state.dracoLoader.setWorkerLimit(2);
 }
 const supportRenderer=renderer||state.nativeModelRenderer;
 if(!state.ktx2Loader){
  if(!state.KTX2Loader)throw new Error('BridgePoint local KTX2Loader is unavailable');
  if(!supportRenderer)throw new Error('A live BridgePoint WebGL renderer is required to initialize KTX2 textures');
  state.ktx2Loader=new state.KTX2Loader();
  state.ktx2Loader.setTranscoderPath('/vendor/basis/');
  state.ktx2Loader.setWorkerLimit(2);
  state.ktx2Loader.detectSupport(supportRenderer);
 }
 loader.setDRACOLoader(state.dracoLoader);
 loader.setKTX2Loader(state.ktx2Loader);
 return loader;
}
function nativeMapMatrix(map,THREE,coordinates,altitudeM){
 try{
  const raw=map.transform?.getMatrixForModel?.([Number(coordinates[0]),Number(coordinates[1])],Number(altitudeM)||0);
  if(raw&&raw.length>=16)return new THREE.Matrix4().fromArray(raw);
  const Mercator=window.maplibregl?.MercatorCoordinate;
  if(!Mercator?.fromLngLat)return null;
  const mc=Mercator.fromLngLat([Number(coordinates[0]),Number(coordinates[1])],Number(altitudeM)||0);
  const metres=mc.meterInMercatorCoordinateUnits();
  if(![mc.x,mc.y,mc.z,metres].every(Number.isFinite)||metres<=0)return null;
  return new THREE.Matrix4().set(metres,0,0,mc.x,0,0,metres,mc.y,0,metres,0,0,0,0,0,1);
 }catch(_){return null;}
}
async function loadRobertGaskinMesh(state,renderer=null){
 if(state.nativeModelRoot)return state.nativeModelRoot;
 if(state.nativeModelPromise)return state.nativeModelPromise;
 state.nativeModelPromise=(async()=>{
  const pair=await loadShipwreckThree();if(state.destroyed)throw new Error('Shipwreck layer closed');
  state.THREE=pair.THREE;state.GLTFLoader=pair.GLTFLoader;state.DRACOLoader=pair.DRACOLoader;
  const response=await fetch(ROBERT_GASKIN_ASSET,{cache:'force-cache'});
  if(!response.ok)throw new Error('Robert Gaskin GLB request failed ('+response.status+')');
  if(typeof DecompressionStream==='undefined')throw new Error('Gzip decompression is unavailable in this browser');
  const stream=new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer=await new Response(stream).arrayBuffer();
  if(new DataView(buffer).getUint32(0,true)!==0x46546c67)throw new Error('Robert Gaskin asset is not a valid GLB');
  const gltf=await createShipwreckGLTFLoader(state,renderer).parseAsync(buffer,'');
  if(!gltf?.scene)throw new Error('Robert Gaskin GLB contains no scene');
  const root=gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const bounds=new pair.THREE.Box3().setFromObject(root);
  if(bounds.isEmpty())throw new Error('Robert Gaskin scan contains no 3D geometry');
  const size=bounds.getSize(new pair.THREE.Vector3());
  const longAxis=Math.max(size.x,size.z);
  if(!Number.isFinite(longAxis)||longAxis<=0)throw new Error('Robert Gaskin scan has invalid dimensions');
  const scale=ROBERT_GASKIN_LENGTH_M/longAxis;
  root.scale.multiplyScalar(scale);
  // The original GLB is not GPS-oriented. Rotate its long axis approximately
  // north/south; source dive notes say the bow faces inland.
  root.rotation.y=size.x>=size.z?Math.PI/2:0;
  root.updateMatrixWorld(true);
  const centeredBounds=new pair.THREE.Box3().setFromObject(root);
  const center=centeredBounds.getCenter(new pair.THREE.Vector3());
  root.position.x-=center.x;root.position.y-=center.y;root.position.z-=center.z;
  root.traverse(object=>{
   if(!object.isMesh&&!object.isPoints)return;
   object.frustumCulled=false;object.renderOrder=1000;
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!material)continue;
    material.depthTest=false;material.depthWrite=false;material.needsUpdate=true;
   }
  });
  root.updateMatrixWorld(true);
  state.nativeModelRoot=root;
  state.nativeModelBounds={x:size.x*scale,y:size.y*scale,z:size.z*scale};
  state.nativeModelScale=scale;
  if(state.nativeModelScene)state.nativeModelScene.add(root);
  return root;
 })().catch(error=>{state.nativeModelPromise=null;throw error;});
 return state.nativeModelPromise;
}
async function loadHmsGraftonMesh(state,renderer=null){
 if(state.graftonModelRoot)return state.graftonModelRoot;
 if(state.graftonModelPromise)return state.graftonModelPromise;
 state.graftonModelPromise=(async()=>{
  const pair=await loadShipwreckThree();if(state.destroyed)throw new Error('Shipwreck layer closed');
  state.THREE=pair.THREE;state.GLTFLoader=pair.GLTFLoader;state.DRACOLoader=pair.DRACOLoader;
  const response=await fetch(HMS_GRAFTON_ASSET,{cache:'force-cache'});
  if(!response.ok)throw new Error('HMS Grafton GLB request failed ('+response.status+')');
  if(typeof DecompressionStream==='undefined')throw new Error('Gzip decompression is unavailable in this browser');
  const stream=new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer=await new Response(stream).arrayBuffer();
  if(new DataView(buffer).getUint32(0,true)!==0x46546c67)throw new Error('HMS Grafton asset is not a valid GLB');
  const gltf=await createShipwreckGLTFLoader(state,renderer).parseAsync(buffer,'');
  if(!gltf?.scene)throw new Error('HMS Grafton GLB contains no scene');
  const root=gltf.scene.clone(true);root.updateMatrixWorld(true);
  const bounds=new pair.THREE.Box3().setFromObject(root);
  if(bounds.isEmpty())throw new Error('HMS Grafton scan contains no 3D geometry');
  const size=bounds.getSize(new pair.THREE.Vector3());
  if(![size.x,size.y,size.z].every(Number.isFinite)||Math.max(size.x,size.y,size.z)<=0)throw new Error('HMS Grafton scan has invalid dimensions');
  // The individual GLB lacks a published GPS transform; keep its source scale/orientation.
  const center=bounds.getCenter(new pair.THREE.Vector3());
  root.position.x-=center.x;root.position.y-=center.y;root.position.z-=center.z;
  root.visible=false;
  root.traverse(object=>{
   if(!object.isMesh&&!object.isPoints)return;
   object.frustumCulled=false;object.renderOrder=1000;
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!material)continue;
    material.depthTest=false;material.depthWrite=false;material.needsUpdate=true;
   }
  });
  root.updateMatrixWorld(true);
  state.graftonModelRoot=root;state.graftonModelBounds={x:size.x,y:size.y,z:size.z};
  if(state.nativeModelScene)state.nativeModelScene.add(root);
  return root;
 })().catch(error=>{state.graftonModelPromise=null;throw error;});
 return state.graftonModelPromise;
}
async function loadCannonMesh(state,renderer=null){
 if(state.cannonModelRoot)return state.cannonModelRoot;
 if(state.cannonModelPromise)return state.cannonModelPromise;
 state.cannonModelPromise=(async()=>{
  const pair=await loadShipwreckThree();if(state.destroyed)throw new Error('Shipwreck layer closed');
  state.THREE=pair.THREE;state.GLTFLoader=pair.GLTFLoader;state.DRACOLoader=pair.DRACOLoader;
  const response=await fetch(CANNON_ASSET,{cache:'force-cache'});
  if(!response.ok)throw new Error('Kanonvraget GLB request failed ('+response.status+')');
  if(typeof DecompressionStream==='undefined')throw new Error('Gzip decompression is unavailable in this browser');
  const stream=new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer=await new Response(stream).arrayBuffer();
  if(new DataView(buffer).getUint32(0,true)!==0x46546c67)throw new Error('Kanonvraget asset is not a valid GLB');
  const gltf=await createShipwreckGLTFLoader(state,renderer).parseAsync(buffer,'');
  if(!gltf?.scene)throw new Error('Kanonvraget GLB contains no scene');
  const root=gltf.scene.clone(true);root.updateMatrixWorld(true);
  const bounds=new pair.THREE.Box3().setFromObject(root);
  if(bounds.isEmpty())throw new Error('Kanonvraget scan contains no 3D geometry');
  const size=bounds.getSize(new pair.THREE.Vector3());
  if(![size.x,size.y,size.z].every(Number.isFinite)||Math.max(size.x,size.y,size.z)<=0)throw new Error('Kanonvraget scan has invalid dimensions');
  // Preserve DTU Aqua source scale/orientation; center the GLB on the wreck-site anchor.
  const center=bounds.getCenter(new pair.THREE.Vector3());
  root.position.x-=center.x;root.position.y-=center.y;root.position.z-=center.z;
  root.visible=false;
  root.traverse(object=>{
   if(!object.isMesh&&!object.isPoints)return;
   object.frustumCulled=false;object.renderOrder=1000;
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!material)continue;
    material.depthTest=false;material.depthWrite=false;material.needsUpdate=true;
   }
  });
  root.updateMatrixWorld(true);
  state.cannonModelRoot=root;state.cannonModelBounds={x:size.x,y:size.y,z:size.z};
  if(state.nativeModelScene)state.nativeModelScene.add(root);
  return root;
 })().catch(error=>{state.cannonModelPromise=null;throw error;});
 return state.cannonModelPromise;
}

async function loadKxiMesh(state,renderer=null){
 if(state.kxiModelRoot)return state.kxiModelRoot;
 if(state.kxiModelPromise)return state.kxiModelPromise;
 state.kxiModelPromise=(async()=>{
  const pair=await loadShipwreckThree();if(state.destroyed)throw new Error('Shipwreck layer closed');
  state.THREE=pair.THREE;state.GLTFLoader=pair.GLTFLoader;state.DRACOLoader=pair.DRACOLoader;
  const response=await fetch(KXI_ASSET,{cache:'force-cache'});
  if(!response.ok)throw new Error('HNLMS K XI GLB request failed ('+response.status+')');
  if(typeof DecompressionStream==='undefined')throw new Error('Gzip decompression is unavailable in this browser');
  const stream=new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer=await new Response(stream).arrayBuffer();
  if(new DataView(buffer).getUint32(0,true)!==0x46546c67)throw new Error('HNLMS K XI asset is not a valid GLB');
  const gltf=await createShipwreckGLTFLoader(state,renderer).parseAsync(buffer,'');
  if(!gltf?.scene)throw new Error('HNLMS K XI GLB contains no scene');
  const root=gltf.scene.clone(true);root.updateMatrixWorld(true);
  const bounds=new pair.THREE.Box3().setFromObject(root);
  if(bounds.isEmpty())throw new Error('HNLMS K XI photogrammetry scan contains no visible 3D geometry');
  const size=bounds.getSize(new pair.THREE.Vector3());
  const longAxis=Math.max(size.x,size.z);
  if(!Number.isFinite(longAxis)||longAxis<=0)throw new Error('HNLMS K XI scan has invalid horizontal dimensions');
  // Calibrate the long axis to the WA Museum/WreckSploration measurement.
  // Preserve source orientation; a survey-grade true-north heading is not published.
  const scale=HNLMS_KXI_WRECK.lengthM/longAxis;
  root.scale.multiplyScalar(scale);root.updateMatrixWorld(true);
  const scaledBounds=new pair.THREE.Box3().setFromObject(root);
  const center=scaledBounds.getCenter(new pair.THREE.Vector3());
  root.position.x-=center.x;root.position.y-=center.y;root.position.z-=center.z;
  root.visible=false;
  root.traverse(object=>{
   if(!object.isMesh&&!object.isPoints)return;
   object.frustumCulled=false;object.renderOrder=1000;
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!material)continue;
    material.depthTest=false;material.depthWrite=false;material.needsUpdate=true;
   }
  });
  root.updateMatrixWorld(true);
  state.kxiModelRoot=root;
  state.kxiModelBounds={x:size.x*scale,y:size.y*scale,z:size.z*scale};
  state.kxiModelScale=scale;
  if(state.nativeModelScene)state.nativeModelScene.add(root);
  return root;
 })().catch(error=>{state.kxiModelPromise=null;throw error;});
 return state.kxiModelPromise;
}

async function loadCapeOtwayMesh(state,renderer=null){
 if(state.capeOtwayModelRoot)return state.capeOtwayModelRoot;
 if(state.capeOtwayModelPromise)return state.capeOtwayModelPromise;
 state.capeOtwayModelPromise=(async()=>{
  const pair=await loadShipwreckThree();if(state.destroyed)throw new Error('Shipwreck layer closed');
  state.THREE=pair.THREE;state.GLTFLoader=pair.GLTFLoader;state.DRACOLoader=pair.DRACOLoader;
  const response=await fetch(CAPE_OTWAY_ASSET,{cache:'force-cache'});
  if(!response.ok)throw new Error('SS Cape Otway GLB request failed ('+response.status+')');
  if(typeof DecompressionStream==='undefined')throw new Error('Gzip decompression is unavailable in this browser');
  const stream=new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer=await new Response(stream).arrayBuffer();
  if(new DataView(buffer).getUint32(0,true)!==0x46546c67)throw new Error('SS Cape Otway asset is not a valid GLB');
  const gltf=await createShipwreckGLTFLoader(state,renderer).parseAsync(buffer,'');
  if(!gltf?.scene)throw new Error('SS Cape Otway GLB contains no scene');
  const root=gltf.scene.clone(true);root.updateMatrixWorld(true);
  const bounds=new pair.THREE.Box3().setFromObject(root);
  if(bounds.isEmpty())throw new Error('SS Cape Otway photogrammetry scan contains no visible 3D geometry');
  const size=bounds.getSize(new pair.THREE.Vector3());
  const longAxis=Math.max(size.x,size.z);
  if(!Number.isFinite(longAxis)||longAxis<=0)throw new Error('SS Cape Otway scan has invalid horizontal dimensions');
  // Calibrate the source scan against the Western Australian Museum's 60.10 m vessel length.
  // WreckSploration notes the bow points north; preserve the original GLB orientation.
  const scale=CAPE_OTWAY_WRECK.lengthM/longAxis;
  root.scale.multiplyScalar(scale);root.updateMatrixWorld(true);
  const scaledBounds=new pair.THREE.Box3().setFromObject(root);
  const center=scaledBounds.getCenter(new pair.THREE.Vector3());
  root.position.x-=center.x;root.position.y-=center.y;root.position.z-=center.z;
  root.visible=false;
  root.traverse(object=>{
   if(!object.isMesh&&!object.isPoints)return;
   object.frustumCulled=false;object.renderOrder=1000;
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!material)continue;
    material.depthTest=false;material.depthWrite=false;material.needsUpdate=true;
   }
  });
  root.updateMatrixWorld(true);
  state.capeOtwayModelRoot=root;
  state.capeOtwayModelBounds={x:size.x*scale,y:size.y*scale,z:size.z*scale};
  state.capeOtwayModelScale=scale;
  if(state.nativeModelScene)state.nativeModelScene.add(root);
  return root;
 })().catch(error=>{state.capeOtwayModelPromise=null;throw error;});
 return state.capeOtwayModelPromise;
}

async function loadTimaruMesh(state,renderer=null){
 if(state.timaruModelRoot)return state.timaruModelRoot;
 if(state.timaruModelPromise)return state.timaruModelPromise;
 state.timaruModelPromise=(async()=>{
  const pair=await loadShipwreckThree();if(state.destroyed)throw new Error('Shipwreck layer closed');
  state.THREE=pair.THREE;state.GLTFLoader=pair.GLTFLoader;state.DRACOLoader=pair.DRACOLoader;
  const response=await fetch(TIMARU_ASSET,{cache:'force-cache'});
  if(!response.ok)throw new Error('SS Timaru GLB request failed ('+response.status+')');
  if(typeof DecompressionStream==='undefined')throw new Error('Gzip decompression is unavailable in this browser');
  const stream=new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer=await new Response(stream).arrayBuffer();
  if(new DataView(buffer).getUint32(0,true)!==0x46546c67)throw new Error('SS Timaru asset is not a valid GLB');
  const gltf=await createShipwreckGLTFLoader(state,renderer).parseAsync(buffer,'');
  if(!gltf?.scene)throw new Error('SS Timaru GLB contains no scene');
  const root=gltf.scene.clone(true);root.updateMatrixWorld(true);
  const bounds=new pair.THREE.Box3().setFromObject(root);
  if(bounds.isEmpty())throw new Error('SS Timaru photogrammetry scan contains no visible 3D geometry');
  const size=bounds.getSize(new pair.THREE.Vector3());
  const longAxis=Math.max(size.x,size.z);
  if(!Number.isFinite(longAxis)||longAxis<=0)throw new Error('SS Timaru scan has invalid horizontal dimensions');
  // Calibrate the source scan to WreckSploration's 44.9 m observed site length.
  // WreckSploration notes the bow points north; preserve the original GLB orientation.
  const scale=TIMARU_WRECK.lengthM/longAxis;
  root.scale.multiplyScalar(scale);root.updateMatrixWorld(true);
  const scaledBounds=new pair.THREE.Box3().setFromObject(root);
  const center=scaledBounds.getCenter(new pair.THREE.Vector3());
  root.position.x-=center.x;root.position.y-=center.y;root.position.z-=center.z;
  root.visible=false;
  root.traverse(object=>{
   if(!object.isMesh&&!object.isPoints)return;
   object.frustumCulled=false;object.renderOrder=1000;
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!material)continue;
    material.depthTest=false;material.depthWrite=false;material.needsUpdate=true;
   }
  });
  root.updateMatrixWorld(true);
  state.timaruModelRoot=root;
  state.timaruModelBounds={x:size.x*scale,y:size.y*scale,z:size.z*scale};
  state.timaruModelScale=scale;
  if(state.nativeModelScene)state.nativeModelScene.add(root);
  return root;
 })().catch(error=>{state.timaruModelPromise=null;throw error;});
 return state.timaruModelPromise;
}

async function loadHmsLooMesh(state,renderer=null){
 if(state.hmsLooModelRoot)return state.hmsLooModelRoot;
 if(state.hmsLooModelPromise)return state.hmsLooModelPromise;
 state.hmsLooModelPromise=(async()=>{
  const pair=await loadShipwreckThree();if(state.destroyed)throw new Error('Shipwreck layer closed');
  state.THREE=pair.THREE;state.GLTFLoader=pair.GLTFLoader;state.DRACOLoader=pair.DRACOLoader;
  const response=await fetch(HMS_LOO_ASSET,{cache:'force-cache'});
  if(!response.ok)throw new Error('HMS Loo GLB request failed ('+response.status+')');
  if(typeof DecompressionStream==='undefined')throw new Error('Gzip decompression is unavailable in this browser');
  const stream=new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer=await new Response(stream).arrayBuffer();
  if(buffer.byteLength<32||new DataView(buffer).getUint32(0,true)!==0x46546c67)throw new Error('HMS Loo asset is not a valid GLB');
  if(new DataView(buffer).getUint32(8,true)!==buffer.byteLength)throw new Error('HMS Loo GLB length header is invalid');
  const gltf=await createShipwreckGLTFLoader(state,renderer).parseAsync(buffer,'');
  if(!gltf?.scene)throw new Error('HMS Loo GLB contains no scene');
  const root=gltf.scene.clone(true);root.updateMatrixWorld(true);
  const bounds=new pair.THREE.Box3().setFromObject(root);
  if(bounds.isEmpty())throw new Error('HMS Loo photogrammetry scan contains no visible 3D geometry');
  const size=bounds.getSize(new pair.THREE.Vector3());
  if(![size.x,size.y,size.z].every(Number.isFinite)||Math.max(size.x,size.y,size.z)<=0)throw new Error('HMS Loo scan has invalid dimensions');
  // Preserve the photogrammetry source scale/orientation, including its 25 cm scale targets.
  // The scan origin is not georeferenced; only its visual center is aligned to the approximate wreck point.
  const center=bounds.getCenter(new pair.THREE.Vector3());
  root.position.x-=center.x;root.position.y-=center.y;root.position.z-=center.z;
  root.visible=false;
  root.traverse(object=>{
   if(!object.isMesh&&!object.isPoints)return;
   object.frustumCulled=false;object.renderOrder=1000;
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!material)continue;
    material.depthTest=false;material.depthWrite=false;material.needsUpdate=true;
   }
  });
  root.updateMatrixWorld(true);
  state.hmsLooModelRoot=root;
  state.hmsLooModelBounds={x:size.x,y:size.y,z:size.z};
  if(state.nativeModelScene)state.nativeModelScene.add(root);
  return root;
 })().catch(error=>{state.hmsLooModelPromise=null;throw error;});
 return state.hmsLooModelPromise;
}

function bridgePointLocalViewerMarkup(id,title){
 if(id!=='hms-grafton'&&id!=='kanonvraget'&&id!=='hnlms-kxi'&&id!=='cape-otway'&&id!=='timaru'&&id!=='hms-loo')return '';
 return '<div class="bp-shipwreck-local-viewer-v1" data-bp-local-wreck-viewer="'+safe(id)+'" role="group" aria-label="'+safe(title)+' BridgePoint-hosted interactive 3D viewer">'+
  '<div class="bp-shipwreck-local-viewer-loading-v1" data-bp-local-viewer-status>Loading the BridgePoint-hosted '+safe(title)+' 3D scan…</div></div>';
}
function mountBridgePointLocalWreckViewer(state,popup,wreckId,title){
 const popupRoot=popup?.getElement?.();
 const host=popupRoot?.querySelector('[data-bp-local-wreck-viewer="'+wreckId+'"]');
 if(!host)return;
 const loading=host.querySelector('[data-bp-local-viewer-status]');
 let disposed=false,renderer=null,resizeObserver=null,model=null,scene=null,camera=null,renderFrame=0,resizeHandler=null;
 const cleanup=()=>{
  if(disposed)return;disposed=true;
  if(renderFrame)cancelAnimationFrame(renderFrame);
  if(resizeObserver)resizeObserver.disconnect();
  if(resizeHandler)window.removeEventListener('resize',resizeHandler);
  if(renderer){try{renderer.dispose();}catch(_){}}
  if(model)model.traverse(object=>{
   if(!object.isMesh&&!object.isPoints)return;
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    try{material?.dispose?.();}catch(_){}
   }
  });
  try{scene?.clear?.();}catch(_){}
 };
 popup.on?.('close',cleanup);
 const showError=error=>{
  if(disposed||!host.isConnected)return;
  if(loading){loading.style.display='grid';loading.textContent='BridgePoint 3D viewer could not start: '+String(error?.message||error);}
 };
 (async()=>{
  try{
   const pair=await loadShipwreckThree();
   if(disposed||!host.isConnected)return;
   const THREE=pair.THREE;
   if(!THREE?.WebGLRenderer)throw new Error('BridgePoint local Three.js runtime is unavailable');
   state.THREE=THREE;state.GLTFLoader=pair.GLTFLoader;state.DRACOLoader=pair.DRACOLoader;state.KTX2Loader=pair.KTX2Loader;
   const canvas=document.createElement('canvas');
   canvas.setAttribute('aria-label',title+' interactive 3D model. Drag to rotate; pinch or scroll to zoom.');
   canvas.style.touchAction='none';canvas.style.cursor='grab';
   host.appendChild(canvas);
   renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.toneMapping=THREE.ACESFilmicToneMapping;
   renderer.toneMappingExposure=1.08;
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
   const sourceRoot=wreckId==='hms-grafton'?await loadHmsGraftonMesh(state,renderer):wreckId==='hnlms-kxi'?await loadKxiMesh(state,renderer):wreckId==='cape-otway'?await loadCapeOtwayMesh(state,renderer):wreckId==='timaru'?await loadTimaruMesh(state,renderer):wreckId==='hms-loo'?await loadHmsLooMesh(state,renderer):await loadCannonMesh(state,renderer);
   if(disposed||!host.isConnected)return;
   model=sourceRoot.clone(true);
   model.visible=true;
   model.traverse(object=>{
    object.visible=true;
    if(!object.isMesh&&!object.isPoints)return;
    object.frustumCulled=false;
    if(object.material){
     const cloneMaterial=material=>{
      const copy=material?.clone?.()||material;
      if(copy){copy.depthTest=true;copy.depthWrite=true;copy.needsUpdate=true;}
      return copy;
     };
     object.material=Array.isArray(object.material)?object.material.map(cloneMaterial):cloneMaterial(object.material);
    }
   });
   model.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(model);
   if(bounds.isEmpty())throw new Error('The locally hosted GLB contains no visible 3D geometry');
   const dimensions=bounds.getSize(new THREE.Vector3());
   const center=bounds.getCenter(new THREE.Vector3());
   model.position.sub(center);
   const radius=Math.max(dimensions.x,dimensions.y,dimensions.z)*0.5||1;
   scene=new THREE.Scene();
   scene.background=new THREE.Color(0x020a13);
   scene.add(new THREE.HemisphereLight(0xd7efff,0x263342,1.65));
   const key=new THREE.DirectionalLight(0xffe8c2,2.15);key.position.set(1.5,2.4,3.2);scene.add(key);
   const fill=new THREE.DirectionalLight(0x88b9d4,0.8);fill.position.set(-2,-0.6,-1.4);scene.add(fill);
   scene.add(model);
   camera=new THREE.PerspectiveCamera(42,1,Math.max(radius/1000,0.001),Math.max(radius*100,100));
   let theta=0.82,phi=1.18,distance=radius*2.8;
   const homeDistance=distance;
   const target=new THREE.Vector3(0,0,0);
   const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
   const updateCamera=()=>{
    camera.position.set(
     target.x+distance*Math.sin(phi)*Math.sin(theta),
     target.y+distance*Math.cos(phi),
     target.z+distance*Math.sin(phi)*Math.cos(theta)
    );
    camera.lookAt(target);
   };
   const scheduleRender=()=>{
    if(disposed||renderFrame)return;
    renderFrame=requestAnimationFrame(()=>{
     renderFrame=0;
     if(!disposed&&renderer&&scene&&camera)renderer.render(scene,camera);
    });
   };
   const resize=()=>{
    if(disposed||!renderer||!camera)return;
    const rect=host.getBoundingClientRect();
    const width=Math.max(1,Math.floor(rect.width));
    const height=Math.max(1,Math.floor(rect.height));
    renderer.setSize(width,height,false);
    camera.aspect=width/height;camera.updateProjectionMatrix();scheduleRender();
   };
   if(typeof ResizeObserver!=='undefined'){
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
   }else{
    resizeHandler=resize;window.addEventListener('resize',resizeHandler,{passive:true});
   }
   const toolbar=document.createElement('div');toolbar.className='bp-shipwreck-local-viewer-toolbar-v1';
   const hint=document.createElement('span');hint.textContent='Drag to rotate · pinch or scroll to zoom';
   const reset=document.createElement('button');reset.type='button';reset.textContent='Reset view';
   reset.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();theta=0.82;phi=1.18;distance=homeDistance;updateCamera();scheduleRender();
   });
   toolbar.append(hint,reset);host.appendChild(toolbar);
   const pointers=new Map();let lastPointer=null,lastPinch=0;
   const pinchLength=()=>{
    const points=Array.from(pointers.values());
    return points.length<2?0:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
   };
   canvas.addEventListener('pointerdown',event=>{
    event.stopPropagation();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    try{canvas.setPointerCapture(event.pointerId);}catch(_){}
    if(pointers.size===1)lastPointer={x:event.clientX,y:event.clientY};
    else{lastPointer=null;lastPinch=pinchLength();}
   });
   canvas.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;
    event.stopPropagation();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size>=2){
     const current=pinchLength();
     if(lastPinch>0&&current>0)distance=clamp(distance*lastPinch/current,radius*1.08,radius*20);
     lastPinch=current;lastPointer=null;
    }else if(lastPointer){
     const dx=event.clientX-lastPointer.x,dy=event.clientY-lastPointer.y;
     theta-=dx*0.008;phi=clamp(phi+dy*0.008,0.12,Math.PI-0.12);
     lastPointer={x:event.clientX,y:event.clientY};
    }
    updateCamera();scheduleRender();
   });
   const endPointer=event=>{
    if(!pointers.has(event.pointerId))return;
    event.stopPropagation();pointers.delete(event.pointerId);
    try{canvas.releasePointerCapture(event.pointerId);}catch(_){}
    lastPinch=0;
    if(pointers.size===1){const point=Array.from(pointers.values())[0];lastPointer={x:point.x,y:point.y};}
    else lastPointer=null;
   };
   canvas.addEventListener('pointerup',endPointer);
   canvas.addEventListener('pointercancel',endPointer);
   canvas.addEventListener('lostpointercapture',endPointer);
   canvas.addEventListener('wheel',event=>{
    event.preventDefault();event.stopPropagation();
    distance=clamp(distance*Math.exp(event.deltaY*0.001),radius*1.08,radius*20);
    updateCamera();scheduleRender();
   },{passive:false});
   canvas.addEventListener('contextmenu',event=>event.preventDefault());
   updateCamera();resize();
   if(loading)loading.remove();
   scheduleRender();
  }catch(error){showError(error);}
 })();
 return cleanup;
}

function ensureRobertGaskinMapLayer(state){
 const map=state.map,THREE=state.THREE;
 if(!THREE||state.destroyed)return false;
 if(map.getLayer(NATIVE_MODEL_LAYER_ID)&&state.nativeModelRenderer&&state.nativeModelScene){
  for(const root of [state.nativeModelRoot,state.graftonModelRoot,state.cannonModelRoot,state.kxiModelRoot,state.capeOtwayModelRoot,state.timaruModelRoot,state.hmsLooModelRoot])if(root&&root.parent!==state.nativeModelScene)state.nativeModelScene.add(root);
  return true;
 }
 const layer={
  id:NATIVE_MODEL_LAYER_ID,type:'custom',renderingMode:'3d',
  onAdd(mapRef,gl){
   state.nativeModelRenderer=new THREE.WebGLRenderer({canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
   state.nativeModelRenderer.autoClear=false;state.nativeModelRenderer.outputColorSpace=THREE.SRGBColorSpace;
   state.nativeModelCamera=new THREE.Camera();state.nativeModelScene=new THREE.Scene();
   state.nativeModelScene.add(new THREE.AmbientLight(0xffffff,1.55));
   const key=new THREE.DirectionalLight(0xffe9c7,1.2);key.position.set(-.6,1.4,.9);state.nativeModelScene.add(key);
   for(const root of [state.nativeModelRoot,state.graftonModelRoot,state.cannonModelRoot,state.kxiModelRoot,state.capeOtwayModelRoot,state.timaruModelRoot,state.hmsLooModelRoot])if(root)state.nativeModelScene.add(root);
   state.stats.nativeModelLayerReady=true;
  },
  render(gl,args){
   if(!state.enabled||!state.nativeModelRenderer||!state.nativeModelScene||!state.nativeModelCamera)return;
   const raw=args&&(args.defaultProjectionData?.mainMatrix||args.modelViewProjectionMatrix);
   if(!raw||raw.length<16)return;
   const draw=(root,visible,coordinates,altitudeM,warningKey,label)=>{
    if(!root)return;
    const inZoom=Number(map.getZoom?.()||0)>=12.2;
    const bounds=map.getBounds?.();let inBounds=true;
    try{if(bounds&&!bounds.contains(coordinates))inBounds=false;}catch(_){}
    if(!visible||!inZoom||!inBounds){root.visible=false;return;}
    const matrix=nativeMapMatrix(map,THREE,coordinates,altitudeM);
    if(!matrix){root.visible=false;return;}
    root.visible=true;
    state.nativeModelCamera.projectionMatrix.copy(new THREE.Matrix4().fromArray(raw)).multiply(matrix);
    try{state.nativeModelRenderer.resetState();state.nativeModelRenderer.render(state.nativeModelScene,state.nativeModelCamera);}
    catch(error){if(!state[warningKey]){state[warningKey]=true;console.warn('BridgePoint '+label+' native seabed render',error);}}
    finally{root.visible=false;}
   };
   draw(state.nativeModelRoot,state.nativeModelVisible,ROBERT_GASKIN_WRECK.coordinates,
    ROBERT_GASKIN_WRECK.waterSurfaceElevationM-ROBERT_GASKIN_WRECK.depthM,'nativeModelRenderWarned','Robert Gaskin');
   draw(state.graftonModelRoot,state.graftonModelVisible,HMS_GRAFTON_WRECK.coordinates,
    HMS_GRAFTON_WRECK.waterSurfaceElevationM-HMS_GRAFTON_WRECK.scanDepthM,'graftonModelRenderWarned','HMS Grafton');
   draw(state.cannonModelRoot,state.cannonModelVisible,CANNON_WRECK.coordinates,
    -CANNON_WRECK.displayDepthM,'cannonModelRenderWarned','Kanonvraget');
   draw(state.kxiModelRoot,state.kxiModelVisible,HNLMS_KXI_WRECK.coordinates,
    -HNLMS_KXI_WRECK.displayDepthM,'kxiModelRenderWarned','HNLMS K XI');
   draw(state.capeOtwayModelRoot,state.capeOtwayModelVisible,CAPE_OTWAY_WRECK.coordinates,
    -CAPE_OTWAY_WRECK.displayDepthM,'capeOtwayModelRenderWarned','SS Cape Otway');
   draw(state.timaruModelRoot,state.timaruModelVisible,TIMARU_WRECK.coordinates,
    -TIMARU_WRECK.displayDepthM,'timaruModelRenderWarned','Timaru');
   draw(state.hmsLooModelRoot,state.hmsLooModelVisible,HMS_LOO_WRECK.coordinates,
    -HMS_LOO_WRECK.displayDepthM,'hmsLooModelRenderWarned','HMS Loo');
  },
  onRemove(){
   try{state.nativeModelRenderer?.dispose();}catch(_){}
   state.nativeModelRenderer=null;state.nativeModelCamera=null;state.nativeModelScene=null;
   state.stats.nativeModelLayerReady=false;
  }
 };
 try{map.addLayer(layer);return true;}catch(error){state.stats.nativeModelLastError=String(error?.message||error);console.warn('BridgePoint native shipwreck layer unavailable',error);return false;}
}
async function prepareShipwreckMapRenderer(state){
 const pair=await loadShipwreckThree();
 if(state.destroyed)throw new Error('Shipwreck layer closed');
 state.THREE=pair.THREE;state.GLTFLoader=pair.GLTFLoader;state.DRACOLoader=pair.DRACOLoader;state.KTX2Loader=pair.KTX2Loader;
 if(!ensureRobertGaskinMapLayer(state))throw new Error('MapLibre native 3D layer could not attach');
 if(!state.nativeModelRenderer)throw new Error('MapLibre WebGL renderer is unavailable for KTX2 texture support');
 return state.nativeModelRenderer;
}
async function showRobertGaskinOnRiverbed(state){
 if(!state.enabled)return false;
 state.nativeModelAutoAttempted=true;state.nativeModelVisible=true;
 updateRobertGaskinModelStatus(state,'Loading the CC BY 4.0 photogrammetry scan…');
 setStatus(state,'Robert Gaskin native underwater mesh loading; all seventy wreck icons remain on.');
 try{
  const renderer=await prepareShipwreckMapRenderer(state);
  await loadRobertGaskinMesh(state,renderer);
  if(state.destroyed||!state.enabled)return false;
  if(!ensureRobertGaskinMapLayer(state))throw new Error('MapLibre native 3D layer could not attach');
  if(state.nativeModelScene&&state.nativeModelRoot.parent!==state.nativeModelScene)state.nativeModelScene.add(state.nativeModelRoot);
  updateRobertGaskinModelStatus(state,'Native scan loaded · '+Math.round(state.nativeModelBounds.x*100)/100+' m long after historical-length calibration. Visible when zoomed in near the wreck site.');
  setStatus(state,'Robert Gaskin native photogrammetry mesh loaded at its published wreck-depth reference.');
  state.map.triggerRepaint?.();refreshStatusUi(state);return true;
 }catch(error){
  state.nativeModelVisible=false;
  updateRobertGaskinModelStatus(state,'Native scan could not load: '+String(error?.message||error));
  setStatus(state,'Robert Gaskin native 3D mesh unavailable: '+String(error?.message||error));
  return false;
 }
}
async function showHmsGraftonOnSeabed(state){
 if(!state.enabled)return false;
 state.graftonModelAutoAttempted=true;state.graftonModelVisible=true;
 updateHmsGraftonModelStatus(state,'Loading the CC BY 4.0 HMS Grafton scan…');
 setStatus(state,'HMS Grafton native underwater mesh loading; all seventy wreck icons remain on.');
 try{
  const renderer=await prepareShipwreckMapRenderer(state);
  await loadHmsGraftonMesh(state,renderer);
  if(state.destroyed||!state.enabled)return false;
  if(!ensureRobertGaskinMapLayer(state))throw new Error('MapLibre native 3D layer could not attach');
  if(state.nativeModelScene&&state.graftonModelRoot.parent!==state.nativeModelScene)state.nativeModelScene.add(state.graftonModelRoot);
  const b=state.graftonModelBounds;
  updateHmsGraftonModelStatus(state,'Native scan loaded · source GLB bounds '+[b.x,b.y,b.z].map(n=>n.toFixed(1)+' m').join(' × ')+'. Source scale/orientation preserved; displayed at the approximate 19 m capture-depth reference when zoomed to the wreck.');
  setStatus(state,'HMS Grafton native photogrammetry mesh loaded at its approximate wreck-site/depth reference.');
  state.map.triggerRepaint?.();refreshStatusUi(state);return true;
 }catch(error){
  state.graftonModelVisible=false;
  updateHmsGraftonModelStatus(state,'Native scan could not load: '+String(error?.message||error));
  setStatus(state,'HMS Grafton native 3D mesh unavailable: '+String(error?.message||error));
  return false;
 }
}
async function showCannonOnSeabed(state){
 if(!state.enabled)return false;
 state.cannonModelAutoAttempted=true;state.cannonModelVisible=true;
 updateCannonModelStatus(state,'Loading the CC BY 4.0 DTU Aqua Cannon Shipwreck scan…');
 setStatus(state,'Kanonvraget native underwater mesh loading; all seventy wreck icons remain on.');
 try{
  const renderer=await prepareShipwreckMapRenderer(state);
  await loadCannonMesh(state,renderer);
  if(state.destroyed||!state.enabled)return false;
  if(!ensureRobertGaskinMapLayer(state))throw new Error('MapLibre native 3D layer could not attach');
  if(state.nativeModelScene&&state.cannonModelRoot.parent!==state.nativeModelScene)state.nativeModelScene.add(state.cannonModelRoot);
  const b=state.cannonModelBounds;
  updateCannonModelStatus(state,'Native DTU Aqua scan loaded · source GLB bounds '+[b.x,b.y,b.z].map(n=>n.toFixed(1)+' m').join(' × ')+'. Source scale/orientation preserved; centered at the verified wreck position and displayed at the 15 m midpoint of the published 14–16 m depth range.');
  setStatus(state,'Kanonvraget native photogrammetry mesh loaded at its approximate wreck-site/depth reference.');
  state.map.triggerRepaint?.();refreshStatusUi(state);return true;
 }catch(error){
  state.cannonModelVisible=false;
  updateCannonModelStatus(state,'Native scan could not load: '+String(error?.message||error));
  setStatus(state,'Kanonvraget native 3D mesh unavailable: '+String(error?.message||error));
  return false;
 }
}
async function showKxiOnSeabed(state){
 if(!state.enabled)return false;
 state.kxiModelAutoAttempted=true;state.kxiModelVisible=true;
 updateKxiModelStatus(state,'Loading the CC BY 4.0 HNLMS K XI photogrammetry scan…');
 setStatus(state,'HNLMS K XI native underwater mesh loading; all seventy wreck icons remain on.');
 try{
  const renderer=await prepareShipwreckMapRenderer(state);
  await loadKxiMesh(state,renderer);
  if(state.destroyed||!state.enabled)return false;
  if(!ensureRobertGaskinMapLayer(state))throw new Error('MapLibre native 3D layer could not attach');
  if(state.nativeModelScene&&state.kxiModelRoot.parent!==state.nativeModelScene)state.nativeModelScene.add(state.kxiModelRoot);
  updateKxiModelStatus(state,'Native scan loaded · calibrated to '+HNLMS_KXI_WRECK.lengthM.toFixed(2)+' m. Approximate wreck-site/depth placement; visible when zoomed to the icon.');
  setStatus(state,'HNLMS K XI native photogrammetry mesh loaded at its approximate 40 m wreck-depth reference.');
  state.map.triggerRepaint?.();refreshStatusUi(state);return true;
 }catch(error){
  state.kxiModelVisible=false;
  updateKxiModelStatus(state,'Native scan could not load: '+String(error?.message||error));
  setStatus(state,'HNLMS K XI native 3D mesh unavailable: '+String(error?.message||error));
  return false;
 }
}

async function showCapeOtwayOnSeabed(state){
 if(!state.enabled)return false;
 state.capeOtwayModelAutoAttempted=true;state.capeOtwayModelVisible=true;
 updateCapeOtwayModelStatus(state,'Loading the CC BY 4.0 SS Cape Otway photogrammetry scan…');
 setStatus(state,'SS Cape Otway native underwater mesh loading; all seventy wreck icons remain on.');
 try{
  const renderer=await prepareShipwreckMapRenderer(state);
  await loadCapeOtwayMesh(state,renderer);
  if(state.destroyed||!state.enabled)return false;
  if(!ensureRobertGaskinMapLayer(state))throw new Error('MapLibre native 3D layer could not attach');
  if(state.nativeModelScene&&state.capeOtwayModelRoot.parent!==state.nativeModelScene)state.nativeModelScene.add(state.capeOtwayModelRoot);
  updateCapeOtwayModelStatus(state,'Native WreckSploration scan loaded · calibrated to 60.10 m. Approximate wreck-site/depth placement; visible when zoomed to the icon.');
  setStatus(state,'SS Cape Otway native photogrammetry mesh loaded at the approximate 87 m wreck-depth reference.');
  state.map.triggerRepaint?.();refreshStatusUi(state);return true;
 }catch(error){
  state.capeOtwayModelVisible=false;
  updateCapeOtwayModelStatus(state,'Native scan could not load: '+String(error?.message||error));
  setStatus(state,'SS Cape Otway native 3D mesh unavailable: '+String(error?.message||error));
  return false;
 }
}

async function showTimaruOnSeabed(state){
 if(!state.enabled)return false;
 state.timaruModelAutoAttempted=true;state.timaruModelVisible=true;
 updateTimaruModelStatus(state,'Loading the CC BY 4.0 Timaru photogrammetry scan…');
 setStatus(state,'Timaru native underwater mesh loading; all seventy wreck icons remain on.');
 try{
  const renderer=await prepareShipwreckMapRenderer(state);
  await loadTimaruMesh(state,renderer);
  if(state.destroyed||!state.enabled)return false;
  if(!ensureRobertGaskinMapLayer(state))throw new Error('MapLibre native 3D layer could not attach');
  if(state.nativeModelScene&&state.timaruModelRoot.parent!==state.nativeModelScene)state.nativeModelScene.add(state.timaruModelRoot);
  updateTimaruModelStatus(state,'Native WreckSploration scan loaded · calibrated to 44.9 m. Approximate wreck-site/depth placement; visible when zoomed to the icon.');
  setStatus(state,'Timaru native photogrammetry mesh loaded at the approximate 50 m wreck-depth reference.');
  state.map.triggerRepaint?.();refreshStatusUi(state);return true;
 }catch(error){
  state.timaruModelVisible=false;
  updateTimaruModelStatus(state,'Native scan could not load: '+String(error?.message||error));
  setStatus(state,'Timaru native 3D mesh unavailable: '+String(error?.message||error));
  return false;
 }
}

async function showHmsLooOnSeabed(state){
 if(!state.enabled)return false;
 state.hmsLooModelAutoAttempted=true;state.hmsLooModelVisible=true;
 updateHmsLooModelStatus(state,'Loading the CC BY 4.0 NOAA / East Carolina University photogrammetry scan…');
 setStatus(state,'HMS Loo native underwater mesh loading; all seventy wreck icons remain on.');
 try{
  const renderer=await prepareShipwreckMapRenderer(state);
  await loadHmsLooMesh(state,renderer);
  if(state.destroyed||!state.enabled)return false;
  if(!ensureRobertGaskinMapLayer(state))throw new Error('MapLibre native 3D layer could not attach');
  if(state.nativeModelScene&&state.hmsLooModelRoot.parent!==state.nativeModelScene)state.nativeModelScene.add(state.hmsLooModelRoot);
  const b=state.hmsLooModelBounds;
  updateHmsLooModelStatus(state,'Native NOAA / ECU scan loaded · source bounds '+[b.x,b.y,b.z].map(n=>n.toFixed(2)+' source units').join(' × ')+'. Original scale preserved; placed at the approximate 6.75 m depth reference when zoomed to the wreck.');
  setStatus(state,'HMS Loo native photogrammetry mesh loaded at the approximate 6.75 m midpoint of NOAA’s 4.5–9 m site-depth range.');
  state.map.triggerRepaint?.();refreshStatusUi(state);return true;
 }catch(error){
  state.hmsLooModelVisible=false;
  updateHmsLooModelStatus(state,'Native scan could not load: '+String(error?.message||error));
  setStatus(state,'HMS Loo native 3D mesh unavailable: '+String(error?.message||error));
  return false;
 }
}

function addRobertGaskinStyles(){
 if(document.getElementById('bp-shipwreck-gaskin-style-v2'))return;
 const style=document.createElement('style');style.id='bp-shipwreck-gaskin-style-v2';
 style.textContent='.bp-shipwreck-gaskin-popup-v2{color:#e8f5fb;font:12px/1.45 system-ui,sans-serif}.bp-shipwreck-gaskin-popup-v2 h3{font-size:18px;color:#fff;margin:4px 0}.bp-shipwreck-gaskin-popup-v2 .facts{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0}.bp-shipwreck-gaskin-popup-v2 .facts span{padding:7px;border:1px solid rgba(170,197,207,.18);border-radius:7px;font-size:10px}.bp-shipwreck-gaskin-popup-v2 .facts b{display:block;font-size:9px;color:#9eb7c5;text-transform:uppercase}.bp-shipwreck-gaskin-popup-v2 iframe{width:100%;height:210px;border:0}.bp-shipwreck-gaskin-actions-v2{display:grid;gap:7px;margin:10px 0}.bp-shipwreck-gaskin-actions-v2 button{background:#3b321f;color:#ffe9bb;border:1px solid #d7b66d;border-radius:8px;padding:9px;font-weight:800}.bp-shipwreck-local-viewer-v1{position:relative;width:100%;height:clamp(190px,52vw,285px);min-height:190px;overflow:hidden;border:1px solid rgba(226,186,109,.34);border-radius:9px;margin:9px 0;background:radial-gradient(ellipse at 50% 42%,#183447 0%,#06131f 68%,#02070d 100%);touch-action:none}.bp-shipwreck-local-viewer-v1 canvas{display:block;width:100%;height:100%;touch-action:none;cursor:grab}.bp-shipwreck-local-viewer-loading-v1{position:absolute;inset:0;display:grid;place-items:center;padding:18px;text-align:center;color:#c5d7df;font-size:11px;pointer-events:none}.bp-shipwreck-local-viewer-toolbar-v1{position:absolute;left:7px;right:7px;bottom:7px;display:flex;justify-content:space-between;align-items:center;gap:7px;pointer-events:none}.bp-shipwreck-local-viewer-toolbar-v1 span{max-width:72%;padding:5px 7px;border-radius:6px;background:rgba(2,10,18,.78);color:#d4e5ed;font-size:9px}.bp-shipwreck-local-viewer-toolbar-v1 button{pointer-events:auto;border:1px solid rgba(231,187,103,.58);border-radius:7px;padding:6px 8px;background:rgba(7,22,34,.92);color:#ffe8b7;font:700 10px system-ui,sans-serif}.bp-shipwreck-gaskin-status-v2{padding:8px;border:1px solid rgba(231,187,103,.28);border-radius:7px;color:#c8d9df;font-size:10px;margin:7px 0}.bp-shipwreck-gaskin-popup-v2 a{color:#f1cf88}';
 document.head.appendChild(style);
}
function openHmsGraftonPopup(state,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 addRobertGaskinStyles();
 if(state.popup)state.popup.remove();
 const p=HMS_GRAFTON_WRECK;
 const html='<article class="bp-shipwreck-grafton-popup-v1">'+
  '<div class="bp-shipwreck-kicker-v1">BRIDGEPOINT · SHIPWRECKS</div><h3>HMS Grafton (H89)</h3>'+
  '<p>British G-class destroyer · lost 29 May 1940 while returning from the Dunkirk evacuation</p>'+
  '<div class="facts"><span><b>Official wreck position</b>'+safe(p.coordinateText)+'</span><span><b>3D scan capture depth</b>Approximately 19 m</span>'+
  '<span><b>Scan captured</b>19 May 2025 · Oostende, Belgium</span><span><b>Model source</b>DTU Aqua · Benthic 3D Models and Tiles</span></div>'+
  bridgePointLocalViewerMarkup('hms-grafton','HMS Grafton')+
  '<div class="bp-shipwreck-gaskin-actions-v2"><button type="button" data-hms-grafton-action="materialize">Place native 3D scan beneath the water</button></div>'+
  '<div class="bp-shipwreck-gaskin-status-v2" data-hms-grafton-status>'+safe(state.graftonModelStatus||'Native scan not loaded yet. Select the button to download the licensed GLB and place it at the wreck-site depth reference.')+'</div>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>3D placement accuracy:</strong> The source dataset reports the Grafton model at an approximate 19 m capture depth. The Belgian maritime plan publishes the HMS Grafton wreck coordinate shown above. The individual GLB does not publish a verified GPS origin or a per-model geodetic/bathymetric transform. BridgePoint preserves the source GLB scale and orientation, centers it at the official wreck position and places its center at approximately 19 m below the water surface for visualization. This is an approximate site placement, not survey-controlled registration of the full scan to the actual seabed; local wreck relief and charted depths vary.</p>'+
  '<div class="bp-shipwreck-official-v1"><b>Model, rights and wreck references</b>'+
   '<a href="'+safe(p.datasetUrl)+'" target="_blank" rel="noopener noreferrer">DTU Aqua · original 3D dataset and GLB download ↗</a>'+
   '<a href="'+safe(p.licenseSourceUrl)+'" target="_blank" rel="noopener noreferrer">NLM Dataset Catalog · CC BY 4.0 rights and contributor record ↗</a>'+
   '<a href="'+safe(p.locationSourceUrl)+'" target="_blank" rel="noopener noreferrer">Belgian maritime plan · official HMS Grafton position ↗</a>'+
   '<a href="'+safe(p.historySourceUrl)+'" target="_blank" rel="noopener noreferrer">HMS Grafton history and sinking details ↗</a>'+
  '</div>'+
  '<p class="bp-shipwreck-source-v1">The native GLB is mirrored into BridgePoint under CC BY 4.0 with creator attribution. Its original coordinate transform is not included in the individual Grafton GLB.</p></article>';
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'450px',className:'bp-shipwreck-titanic-popup-wrap-v1'}).setLngLat(lngLat||p.coordinates).setHTML(html).addTo(state.map);
 const root=state.popup.getElement?.();
 root?.querySelector('[data-hms-grafton-action="materialize"]')?.addEventListener('click',()=>{void showHmsGraftonOnSeabed(state);});
 mountBridgePointLocalWreckViewer(state,state.popup,'hms-grafton','HMS Grafton');
}
function openCannonWreckPopup(state,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 addRobertGaskinStyles();
 if(state.popup)state.popup.remove();
 const p=CANNON_WRECK;
 const html='<article class="bp-shipwreck-grafton-popup-v1 bp-shipwreck-cannon-popup-v1">'+
  '<div class="bp-shipwreck-kicker-v1">BRIDGEPOINT · SHIPWRECKS</div><h3>Kanonvraget — Cannon Wreck</h3>'+
  '<p>Unidentified historic sailing vessel · east of Saltholm · Øresund, Denmark</p>'+
  '<div class="facts"><span><b>Verified WGS84 site</b>'+safe(p.coordinateText)+'</span><span><b>Wreck depth</b>14–16 m (site record)</span>'+
  '<span><b>DTU scan capture</b>12 June 2025 · approximately 11 m depth</span><span><b>Vessel length</b>Approximately 48 m (historical estimate)</span>'+
  '<span><b>Armament</b>At least 16 iron cannons · 12–14 lb</span><span><b>Scan model</b>DTU Aqua · underwater photogrammetry GLB</span></div>'+
  bridgePointLocalViewerMarkup('kanonvraget','Kanonvraget — Cannon Wreck')+
  '<div class="bp-shipwreck-gaskin-actions-v2"><button type="button" data-cannon-wreck-action="materialize">Place native 3D scan beneath the Øresund</button></div>'+
  '<div class="bp-shipwreck-gaskin-status-v2" data-cannon-wreck-status>'+safe(state.cannonModelStatus||'Native scan not loaded yet. Select the button to place the local DTU Aqua GLB at the wreck-site depth reference.')+'</div>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Scan and placement:</strong> DTU Aqua describes its Cannon Shipwreck reconstruction as captured on 12 June 2025 at approximately 11 m depth. The Danish wreck database separately gives a verified WGS84 position and a 14–16 m top-to-bottom wreck depth range. BridgePoint anchors the original GLB at that verified site coordinate and places its center at 15 m below the water surface for visualization. The GLB does not publish a GPS origin or survey-control transform; its source scale and orientation are preserved, so full mesh registration is approximate. The capture-depth and wreck-depth figures are kept separate rather than treated as the same measurement.</p>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Historical identification:</strong> The vessel has not been conclusively identified. The Danish wreck record describes at least 16 large 12–14-pound iron cannons and estimates the ship at about 48 m long. Suggestions such as a frigate from the 1801 Battle of Copenhagen or the frigate Charlotte are hypotheses, not confirmed identifications.</p>'+
  '<div class="bp-shipwreck-official-v1"><b>3D model, rights and wreck references</b>'+
   '<a href="'+safe(p.datasetUrl)+'" target="_blank" rel="noopener noreferrer">Zenodo · DTU Aqua original GLB and dataset (CC BY 4.0) ↗</a>'+

   '<a href="'+safe(p.locationSourceUrl)+'" target="_blank" rel="noopener noreferrer">Vragguiden · Kanonvraget verified wreck record and location ↗</a>'+
   '<a href="'+safe(p.coordinateSourceUrl)+'" target="_blank" rel="noopener noreferrer">Vragguiden · wreck coordinates, depth and historical description ↗</a>'+
   '<a href="https://datasetcatalog.nlm.nih.gov/dataset?q=0000776569" target="_blank" rel="noopener noreferrer">NLM Dataset Catalog · CC BY 4.0 rights record ↗</a></div>'+
  '<p class="bp-shipwreck-source-v1">Attribution: DTU Aqua, National Institute of Aquatic Resources, Technical University of Denmark; Patrizio Mariani; Fletcher Thompson; Javier Alonso Fernández. Licensed under Creative Commons Attribution 4.0 International.</p></article>';
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'450px',className:'bp-shipwreck-titanic-popup-wrap-v1'}).setLngLat(lngLat||p.coordinates).setHTML(html).addTo(state.map);
 const root=state.popup.getElement?.();
 root?.querySelector('[data-cannon-wreck-action="materialize"]')?.addEventListener('click',()=>{void showCannonOnSeabed(state);});
 mountBridgePointLocalWreckViewer(state,state.popup,'kanonvraget','Kanonvraget — Cannon Wreck');
}
function openKxiPopup(state,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 addRobertGaskinStyles();
 if(state.popup)state.popup.remove();
 const p=HNLMS_KXI_WRECK;
 const html='<article class="bp-shipwreck-grafton-popup-v1 bp-shipwreck-kxi-popup-v1">'+
  '<div class="bp-shipwreck-kicker-v1">BRIDGEPOINT · SHIPWRECKS</div><h3>HNLMS K XI</h3>'+
  '<p>Dutch K XI-class patrol submarine · World War II service · Rottnest, Western Australia</p>'+
  '<div class="facts"><span><b>Wreck-site position</b>'+safe(p.coordinateText)+'</span><span><b>Wreck depth</b>Approximately 38–40 m</span>'+
  '<span><b>Measured length</b>66.63 ± 0.22 m</span><span><b>Photogrammetry</b>6,733 underwater images</span>'+
  '<span><b>Recorded</b>11 January 2025</span><span><b>Identified</b>1 January 2025 · WA Museum</span></div>'+
  bridgePointLocalViewerMarkup('hnlms-kxi','HNLMS K XI — Dutch submarine')+
  '<div class="bp-shipwreck-gaskin-actions-v2"><button type="button" data-kxi-action="materialize">Place native 3D scan beneath the water</button></div>'+
  '<div class="bp-shipwreck-gaskin-status-v2" data-kxi-status>'+safe(state.kxiModelStatus||'Native scan not loaded yet. The BridgePoint-hosted GLB loads when you open the card.')+'</div>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Ship and survey:</strong> HNLMS K XI was a Royal Netherlands Navy patrol submarine built in the 1920s. The Western Australian Museum confirms its identity by comparing historic records with the WreckSploration 3D survey. The scan was assembled from 6,733 underwater images and measures 66.63 ± 0.22 m bow-to-stern. It records the visible wreck structure; portions of the vessel are substantially buried, so this is not a pristine reconstruction of every original submarine component.</p>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Underwater placement:</strong> BridgePoint centers the locally hosted scan on the published WGS84 wreck-site position and calibrates its long axis to the measured 66.63 m length. The display depth uses the WA Museum’s approximately 40 m site depth (WreckSploration describes about 38 m). The source GLB does not contain a published GPS origin or verified true-north heading, so the mesh placement is approximate and is not a survey-controlled seabed registration.</p>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>History:</strong> HNLMS K XI served with the Royal Netherlands Navy, including operations in the Dutch East Indies during World War II. The Museum records the vessel as decommissioned in 1946 and scuttled in 1949. It helped rescue 13 survivors from HMAS Yarra in 1942.</p>'+
  '<div class="bp-shipwreck-official-v1"><b>Model, history and location sources</b>'+
   '<a href="'+safe(p.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Western Australian Museum · official K XI 3D model listing (CC BY 4.0) ↗</a>'+
   '<a href="'+safe(p.datasetUrl)+'" target="_blank" rel="noopener noreferrer">WA Museum · Maritime Report 356 and photogrammetry site plan ↗</a>'+
   '<a href="'+safe(p.locationSourceUrl)+'" target="_blank" rel="noopener noreferrer">WreckSploration · wreck history, location and survey details ↗</a>'+
   '<a href="'+safe(p.repositoryUrl)+'" target="_blank" rel="noopener noreferrer">WreckSploration VR · source GLB repository ↗</a></div>'+
  '<p class="bp-shipwreck-source-v1">Attribution: © WreckSploration and Western Australian Museum. Model licensed CC BY 4.0. HNLMS K XI is a protected historic shipwreck under Australia’s Underwater Cultural Heritage Act 2018. Do not damage, disturb or remove any part of the wreck.</p></article>';
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'450px',className:'bp-shipwreck-titanic-popup-wrap-v1'}).setLngLat(lngLat||p.coordinates).setHTML(html).addTo(state.map);
 const root=state.popup.getElement?.();
 root?.querySelector('[data-kxi-action="materialize"]')?.addEventListener('click',()=>{void showKxiOnSeabed(state);});
 mountBridgePointLocalWreckViewer(state,state.popup,'hnlms-kxi','HNLMS K XI — Dutch submarine');
}
function openCapeOtwayPopup(state,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 addRobertGaskinStyles();
 if(state.popup)state.popup.remove();
 const p=CAPE_OTWAY_WRECK;
 const html='<article class="bp-shipwreck-grafton-popup-v1 bp-shipwreck-cape-otway-popup-v1">'+
  '<div class="bp-shipwreck-kicker-v1">BRIDGEPOINT · SHIPWRECKS</div><h3>SS Cape Otway</h3>'+
  '<p>1931 Australian single-screw steamer · scuttled 7 September 1968 · Rottnest Ships Graveyard, Western Australia</p>'+
  '<div class="facts"><span><b>Official wreck position</b>'+safe(p.coordinateText)+'</span><span><b>Wreck depth</b>Approximately 87 m</span>'+
  '<span><b>Published vessel length</b>60.10 m</span><span><b>Published beam</b>10.40 m</span>'+
  '<span><b>3D scan captured</b>20 January 2023</span><span><b>Photogrammetry mesh</b>200,000 triangles · 100,600 vertices</span></div>'+
  bridgePointLocalViewerMarkup('cape-otway','SS Cape Otway')+
  '<div class="bp-shipwreck-gaskin-actions-v2"><button type="button" data-cape-otway-action="materialize">Place native 3D scan beneath the water</button></div>'+
  '<div class="bp-shipwreck-gaskin-status-v2" data-cape-otway-status>'+safe(state.capeOtwayModelStatus||'BridgePoint-hosted scan loads inside this card and can be materialized at the wreck site.')+'</div>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Ship and scan:</strong> SS Cape Otway was built in 1931 at Cockatoo Dock, Sydney, and worked as a lighthouse maintenance vessel before being scuttled in 1968. WreckSploration surveyed the wreck on 20 January 2023. Its source description notes two boilers, a single triple-expansion steam engine and two masts. The original scan contains approximately 200,000 triangles and 100,600 vertices.</p>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Underwater placement:</strong> BridgePoint anchors the scan at the Western Australian Museum wreck-site coordinate and uses the published 60.10 m vessel length to calibrate its long axis. WreckSploration records the bow facing north. The source GLB does not publish a geodetic origin, bathymetric transform or survey-control heading; this is an approximate site placement, not survey-grade registration of every part of the mesh. The display depth uses the published approximate 87 m site depth.</p>'+
  '<div class="bp-shipwreck-official-v1"><b>Model, rights and wreck references</b>'+
   '<a href="'+safe(p.sourceUrl)+'" target="_blank" rel="noopener noreferrer">WreckSploration · original photogrammetry model · CC BY 4.0 ↗</a>'+
   '<a href="'+safe(p.datasetUrl)+'" target="_blank" rel="noopener noreferrer">WreckSploration · dive notes, imagery and bow orientation ↗</a>'+
   '<a href="'+safe(p.locationSourceUrl)+'" target="_blank" rel="noopener noreferrer">Western Australian Museum · official coordinates and vessel dimensions ↗</a>'+
   '<a href="'+safe(p.repositoryUrl)+'" target="_blank" rel="noopener noreferrer">WreckSploration · original GLB source repository ↗</a>'+
  '</div>'+
  '<p class="bp-shipwreck-source-v1">Attribution: WreckSploration, SS Cape Otway underwater photogrammetry, CC BY 4.0. The original source GLB is mirrored and served by BridgePoint with attribution.</p></article>';
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'450px',className:'bp-shipwreck-titanic-popup-wrap-v1'}).setLngLat(lngLat||p.coordinates).setHTML(html).addTo(state.map);
 const root=state.popup.getElement?.();
 root?.querySelector('[data-cape-otway-action="materialize"]')?.addEventListener('click',()=>{void showCapeOtwayOnSeabed(state);});
 mountBridgePointLocalWreckViewer(state,state.popup,'cape-otway','SS Cape Otway');
}

function openTimaruPopup(state,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 addRobertGaskinStyles();
 if(state.popup)state.popup.remove();
 const p=TIMARU_WRECK;
 const html='<article class="bp-shipwreck-grafton-popup-v1 bp-shipwreck-timaru-popup-v1">'+
  '<div class="bp-shipwreck-kicker-v1">BRIDGEPOINT · SHIPWRECKS</div><h3>Timaru — Site 42</h3>'+
  '<p>Commonwealth Naval Dredge 4 · steel steam hopper barge · Rottnest Ships Graveyard, Western Australia</p>'+
  '<div class="facts"><span><b>Approximate wreck position</b>'+safe(p.coordinateText)+'</span><span><b>Wreck-site depth</b>Approximately 50 m</span>'+
  '<span><b>Built</b>1893 · Lobnitz & Co.</span><span><b>Recorded lost / dismantled</b>1930 (WA Museum register)</span>'+
  '<span><b>Photogrammetry footprint</b>44.9 m × 9.17 m (WreckSploration site measurement)</span><span><b>Official register dimensions</b>44.20 m × 9.20 m</span>'+
  '<span><b>3D scan</b>Approximately 750,000 triangles · 374,800 vertices</span><span><b>Site discovered / scanned</b>28 March / 1 June 2025</span></div>'+
  bridgePointLocalViewerMarkup('timaru','Timaru — Site 42')+
  '<div class="bp-shipwreck-gaskin-actions-v2"><button type="button" data-timaru-action="materialize">Place native 3D scan beneath the water</button></div>'+
  '<div class="bp-shipwreck-gaskin-status-v2" data-timaru-status>'+safe(state.timaruModelStatus||'BridgePoint-hosted scan loads inside this card. The native scan can also be materialized at the wreck-site depth.')+'</div>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Vessel and discovery:</strong> Timaru was a steel steam hopper barge, also recorded as Naval Dredger 4 / Commonwealth Naval Dredge 4 (CND4), built in 1893 by Lobnitz & Co. The Western Australian Museum register records it as dismantled and sunk in 1930. The 2025 WreckSploration survey identifies the wreck at Site 42 off southwest Rottnest Island.</p>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>What the 3D scan shows:</strong> This is photogrammetry of the actual broken-up wreck remains, not a pristine or restored intact ship. The site is scattered and collapsed; the WreckSploration notes describe a boiler standing on end and detached structure across the seabed. The scan is a high-detail record of the exposed material.</p>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Underwater placement:</strong> BridgePoint places the locally hosted model at the approximate public wreck-layer point and 50 m below the water surface. Its long axis is calibrated to the WreckSploration site measurement of 44.9 m; the WA Museum register separately lists an overall vessel length of 44.20 m. The source GLB does not publish a GPS origin, bathymetric transform or survey-grade heading, so the site placement and orientation are approximate visualization—not survey-controlled registration of every wreck fragment to the seabed.</p>'+
  '<div class="bp-shipwreck-official-v1"><b>Model, rights, survey and wreck references</b>'+
   '<a href="'+safe(p.sourceUrl)+'" target="_blank" rel="noopener noreferrer">WreckSploration · Site 42 Timaru photogrammetry listing · CC BY 4.0 ↗</a>'+
   '<a href="'+safe(p.datasetUrl)+'" target="_blank" rel="noopener noreferrer">WreckSploration · dive notes, discovery and wreck survey ↗</a>'+
   '<a href="'+safe(p.locationSourceUrl)+'" target="_blank" rel="noopener noreferrer">Western Australian Museum · Timaru / ND4 / CND4 official wreck record ↗</a>'+
   '<a href="'+safe(p.repositoryUrl)+'" target="_blank" rel="noopener noreferrer">WreckSploration · pinned original GLB source file ↗</a>'+
   '<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution 4.0 licence ↗</a></div>'+
  '<p class="bp-shipwreck-source-v1">Attribution: WreckSploration, Site 42 — Timaru underwater photogrammetry, CC BY 4.0. BridgePoint mirrors the pinned original GLB and labels its approximate map placement.</p></article>';
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'450px',className:'bp-shipwreck-titanic-popup-wrap-v1'}).setLngLat(lngLat||p.coordinates).setHTML(html).addTo(state.map);
 const root=state.popup.getElement?.();
 root?.querySelector('[data-timaru-action="materialize"]')?.addEventListener('click',()=>{void showTimaruOnSeabed(state);});
 mountBridgePointLocalWreckViewer(state,state.popup,'timaru','Timaru — Site 42');
}
function openHmsLooPopup(state,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 addRobertGaskinStyles();
 if(state.popup)state.popup.remove();
 const p=HMS_LOO_WRECK;
 const html='<article class="bp-shipwreck-grafton-popup-v1 bp-shipwreck-hms-loo-popup-v1">'+
  '<div class="bp-shipwreck-kicker-v1">BRIDGEPOINT · SHIPWRECKS</div><h3>HMS Loo — Looe Key</h3>'+
  '<p>British Royal Navy 44-gun Fifth-Rate · wrecked 5 February 1744 · Looe Key Reef, Lower Florida Keys, Florida, USA</p>'+
  '<div class="facts"><span><b>Recorded wreck position</b>'+safe(p.coordinateText)+'</span><span><b>Published depth range</b>4.5–9 m (NOAA planning report)</span>'+
  '<span><b>Display depth reference</b>6.75 m midpoint of published range</span><span><b>Ship type</b>44-gun Fifth-Rate warship</span>'+
  '<span><b>Wrecked</b>5 February 1744</span><span><b>Survey</b>NOAA / ECU photogrammetry, 2023</span>'+
  '<span><b>3D mesh</b>4,099,999 triangles · 2,051,535 vertices</span><span><b>Model rights</b>CC BY 4.0</span></div>'+
  bridgePointLocalViewerMarkup('hms-loo','HMS Loo wrecksite')+
  '<div class="bp-shipwreck-gaskin-actions-v2"><button type="button" data-hms-loo-action="materialize">Place native 3D scan beneath the water</button></div>'+
  '<div class="bp-shipwreck-gaskin-status-v2" data-hms-loo-status>'+safe(state.hmsLooModelStatus||'BridgePoint-hosted scan loads inside this card. The same mesh can be materialized at the approximate wreck-site depth.')+'</div>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>History:</strong> HMS Loo was a 44-gun British Fifth-Rate under Captain Ashby Utting. On 5 February 1744, after recapturing the British vessel Billander Betty from Spanish control and setting course for Charleston, Loo grounded on a reef in the Lower Florida Keys. NOAA records that the surviving 274 sailors escaped in boats and a captured Spanish sloop after the remains were blown up.</p>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Archaeology and what the scan shows:</strong> The wreck was identified through artifacts including cannons bearing a crowned rose and British broad-arrow markings. The NOAA / East Carolina University 2023 photogrammetry records the actual coral-encrusted wrecksite: iron ballast blocks, scattered structure and artifacts on the seabed. It is not a complete intact ship hull or a computer reconstruction of the original vessel.</p>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Underwater placement:</strong> The recorded coordinate is approximate and comes from a public Wikidata location record; NOAA identifies the wreckage with Looe Key Reef. A NOAA planning report describes wreckage in 4.5–9 m of water. BridgePoint uses 6.75 m as the midpoint display reference. The model has no published GPS origin or survey-grade heading; its original source scale/orientation is preserved and its visual center is placed at the approximate map point. This is a visualization, not survey-controlled registration of every artifact to the seabed.</p>'+
  '<div class="bp-shipwreck-official-v1"><b>Photogrammetry, rights, archaeology and location references</b>'+
   '<a href="'+safe(p.sourceUrl)+'" target="_blank" rel="noopener noreferrer">NOAA Florida Keys National Marine Sanctuary · HMS Loo 3D photogrammetry model · CC BY 4.0 ↗</a>'+
   '<a href="'+safe(p.historySourceUrl)+'" target="_blank" rel="noopener noreferrer">NOAA · HMS Loo history and archaeological identification ↗</a>'+
   '<a href="'+safe(p.depthSourceUrl)+'" target="_blank" rel="noopener noreferrer">NOAA planning report · 4.5–9 m wreck depth reference ↗</a>'+
   '<a href="'+safe(p.locationSourceUrl)+'" target="_blank" rel="noopener noreferrer">Recorded wreck coordinate reference (CC0 position; approximate) ↗</a>'+
   '<a href="'+safe(p.datasetUrl)+'" target="_blank" rel="noopener noreferrer">Public ScanSceneverse GLB archive entry and source metadata ↗</a>'+
   '<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution 4.0 licence ↗</a></div>'+
  '<p class="bp-shipwreck-source-v1">Attribution: NOAA’s Florida Keys National Marine Sanctuary and East Carolina University’s Maritime Studies Program, HMS Loo wrecksite photogrammetry, CC BY 4.0. BridgePoint hosts the original scan locally. Wreck positions are for visualization, not navigation.</p></article>';
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'450px',className:'bp-shipwreck-titanic-popup-wrap-v1'}).setLngLat(lngLat||p.coordinates).setHTML(html).addTo(state.map);
 const root=state.popup.getElement?.();
 root?.querySelector('[data-hms-loo-action="materialize"]')?.addEventListener('click',()=>{void showHmsLooOnSeabed(state);});
 mountBridgePointLocalWreckViewer(state,state.popup,'hms-loo','HMS Loo wrecksite');
}
function openRobertGaskinPopup(state,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 addRobertGaskinStyles();
 if(state.popup)state.popup.remove();
 const p=ROBERT_GASKIN_WRECK;
 const html='<article class="bp-shipwreck-gaskin-popup-v2">'+
  '<div class="bp-shipwreck-kicker-v1">BRIDGEPOINT · SHIPWRECKS</div><h3>Robert Gaskin</h3>'+
  '<p>1863 wooden barque · sank 1889 · St. Lawrence River, Brockville, Ontario</p>'+
  '<div class="facts"><span><b>Wreck-site center</b>'+safe(p.coordinateText)+'</span><span><b>Hull depth range</b>18.3–21.3 m (60–70 ft)</span>'+
  '<span><b>Published length</b>40.42 m / 132.6 ft</span><span><b>Photogrammetry</b>approximately 49,000 photos</span></div>'+
  '<div class="bp-shipwreck-viewer-v1"><iframe title="Robert Gaskin underwater photogrammetry viewer" src="https://sketchfab.com/models/1916420a764c4e73b754755d7f2780ce/embed?autostart=0&ui_infos=1&ui_controls=1&ui_watermark=1&ui_theme=dark" allow="autoplay; fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'+
  '<div class="bp-shipwreck-gaskin-actions-v2"><button type="button" data-robert-gaskin-action="materialize">Place 3D scan at its wreck depth</button></div>'+
  '<div class="bp-shipwreck-gaskin-status-v2" data-robert-gaskin-status>'+safe(state.nativeModelStatus||'Native scan not loaded yet. Select the button to download and display the local 3D mesh at the wreck site.')+'</div>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Scan and placement:</strong> Christian Rémillard’s CC BY 4.0 GLB is a photogrammetry scan processed from approximately 49,000 underwater photographs (about 598,600 triangles). It is calibrated to the published 132.6 ft historical length and placed at the published wreck-site center. Its original mesh origin is not GPS-georeferenced, so its center and heading are approximate. The model uses a 74.64 m IGLD85 water-surface reference dated 16 Nov 2026 minus the 19.8 m midpoint depth; actual river levels vary. The source reports the bow faces inland and the bow/stern range from about 18.3 to 21.3 m.</p>'+
  '<div class="bp-shipwreck-official-v1"><b>Survey and location references</b><a href="'+safe(p.datasetUrl)+'" target="_blank" rel="noopener noreferrer">Zenodo CC BY 4.0 original GLB and metadata ↗</a><a href="'+safe(p.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Sketchfab photogrammetry source ↗</a><a href="'+safe(p.locationSourceUrl)+'" target="_blank" rel="noopener noreferrer">Shipwreck World GPS and depth reference ↗</a><a href="'+safe(p.historySourceUrl)+'" target="_blank" rel="noopener noreferrer">Brockville historical marker ↗</a></div>'+
  '<p class="bp-shipwreck-source-v1">The Robert Gaskin is a freshwater St. Lawrence River wreck, not an ocean site. The native GLB is locally hosted by BridgePoint under CC BY 4.0 with creator attribution.</p></article>';
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'450px',className:'bp-shipwreck-titanic-popup-wrap-v1'}).setLngLat(lngLat||p.coordinates).setHTML(html).addTo(state.map);
 const root=state.popup.getElement?.();
 root?.querySelector('[data-robert-gaskin-action="materialize"]')?.addEventListener('click',()=>{void showRobertGaskinOnRiverbed(state);});
}
function maybeAutoMaterializeRobertGaskin(state){
 if(!state.enabled||state.nativeModelAutoAttempted||state.nativeModelRoot||state.nativeModelPromise)return false;
 if(Number(state.map.getZoom?.()||0)<12.2)return false;
 const bounds=state.map.getBounds?.();
 try{if(bounds&&!bounds.contains(ROBERT_GASKIN_WRECK.coordinates))return false;}catch(_){}
 state.nativeModelAutoAttempted=true;
 void showRobertGaskinOnRiverbed(state);
 return true;
}
function maybeAutoMaterializeHmsGrafton(state){
 if(!state.enabled||state.graftonModelAutoAttempted||state.graftonModelRoot||state.graftonModelPromise)return false;
 if(Number(state.map.getZoom?.()||0)<12.2)return false;
 const bounds=state.map.getBounds?.();
 try{if(bounds&&!bounds.contains(HMS_GRAFTON_WRECK.coordinates))return false;}catch(_){}
 state.graftonModelAutoAttempted=true;
 void showHmsGraftonOnSeabed(state);
 return true;
}
function maybeAutoMaterializeCannon(state){
 if(!state.enabled||state.cannonModelAutoAttempted||state.cannonModelRoot||state.cannonModelPromise)return false;
 if(Number(state.map.getZoom?.()||0)<12.2)return false;
 const bounds=state.map.getBounds?.();
 try{if(bounds&&!bounds.contains(CANNON_WRECK.coordinates))return false;}catch(_){}
 state.cannonModelAutoAttempted=true;
 void showCannonOnSeabed(state);
 return true;
}
function maybeAutoMaterializeKxi(state){
 if(!state.enabled||state.kxiModelAutoAttempted||state.kxiModelRoot||state.kxiModelPromise)return false;
 if(Number(state.map.getZoom?.()||0)<12.2)return false;
 const bounds=state.map.getBounds?.();
 try{if(bounds&&!bounds.contains(HNLMS_KXI_WRECK.coordinates))return false;}catch(_){}
 state.kxiModelAutoAttempted=true;
 void showKxiOnSeabed(state);
 return true;
}
function maybeAutoMaterializeCapeOtway(state){
 if(!state.enabled||state.capeOtwayModelAutoAttempted||state.capeOtwayModelRoot||state.capeOtwayModelPromise)return false;
 if(Number(state.map.getZoom?.()||0)<12.2)return false;
 const bounds=state.map.getBounds?.();
 try{if(bounds&&!bounds.contains(CAPE_OTWAY_WRECK.coordinates))return false;}catch(_){}
 state.capeOtwayModelAutoAttempted=true;
 void showCapeOtwayOnSeabed(state);
 return true;
}
function maybeAutoMaterializeTimaru(state){
 if(!state.enabled||state.timaruModelAutoAttempted||state.timaruModelRoot||state.timaruModelPromise)return false;
 if(Number(state.map.getZoom?.()||0)<12.2)return false;
 const bounds=state.map.getBounds?.();
 try{if(bounds&&!bounds.contains(TIMARU_WRECK.coordinates))return false;}catch(_){}
 state.timaruModelAutoAttempted=true;
 void showTimaruOnSeabed(state);
 return true;
}
function maybeAutoMaterializeHmsLoo(state){
 if(!state.enabled||state.hmsLooModelAutoAttempted||state.hmsLooModelRoot||state.hmsLooModelPromise)return false;
 if(Number(state.map.getZoom?.()||0)<12.2)return false;
 const bounds=state.map.getBounds?.();
 try{if(bounds&&!bounds.contains(HMS_LOO_WRECK.coordinates))return false;}catch(_){}
 state.hmsLooModelAutoAttempted=true;
 void showHmsLooOnSeabed(state);
 return true;
}
function bindInteractions(state){
 if(state.interactionsBound)return;state.interactionsBound=true;
 state.handleClick=event=>{
  if(!state.enabled)return;
  const hits=state.map.queryRenderedFeatures?.(event.point,{layers:[MARKER_ID]})||[];
  const hit=hits.find(feature=>feature.properties?.partId||feature.properties?.wreckId);
  if(!hit)return;
  if(hit.properties?.wreckId==='robert-gaskin'){openRobertGaskinPopup(state,event.lngLat||ROBERT_GASKIN_WRECK.coordinates);return;}
  if(hit.properties?.wreckId==='hms-grafton'){openHmsGraftonPopup(state,event.lngLat||HMS_GRAFTON_WRECK.coordinates);return;}
  if(hit.properties?.wreckId==='kanonvraget'){openCannonWreckPopup(state,event.lngLat||CANNON_WRECK.coordinates);return;}
  if(hit.properties?.wreckId==='hnlms-kxi'){openKxiPopup(state,event.lngLat||HNLMS_KXI_WRECK.coordinates);return;}
  if(hit.properties?.wreckId==='cape-otway'){openCapeOtwayPopup(state,event.lngLat||CAPE_OTWAY_WRECK.coordinates);return;}
  if(hit.properties?.wreckId==='timaru'){openTimaruPopup(state,event.lngLat||TIMARU_WRECK.coordinates);return;}
  if(hit.properties?.wreckId==='hms-loo'){openHmsLooPopup(state,event.lngLat||HMS_LOO_WRECK.coordinates);return;}
  const additional=ADDITIONAL_SHIPWRECK_BY_ID.get(String(hit.properties?.wreckId||''));
  if(additional){openAdditionalShipwreckPopup(state,additional,event.lngLat||additional.coordinates);return;}
  const part=partById(String(hit.properties.partId));
  if(part)openTitanicPopup(state,part,event.lngLat||part.coordinates);
 };
 state.handlePersistentVisibility=()=>{
  if(!state.enabled)return;
  // The shared clean-start guard can hide optional marker layers after camera
  // settles. Re-allow this dedicated category and restore only Titanic layers.
  syncSharedOverlayCategory(state);
  if(!installLayers(state)){
   setStatus(state,'Shipwrecks ON · waiting for the globe style before restoring all seventy shipwreck icons.');
   refreshStatusUi(state);return;
  }
  setVisibility(state,true);
  state.stats.visibilityReassertions=(state.stats.visibilityReassertions||0)+1;
  if((state.nativeModelVisible&&state.nativeModelRoot)||(state.graftonModelVisible&&state.graftonModelRoot)||(state.cannonModelVisible&&state.cannonModelRoot)||(state.kxiModelVisible&&state.kxiModelRoot)||(state.capeOtwayModelVisible&&state.capeOtwayModelRoot)||(state.timaruModelVisible&&state.timaruModelRoot)||(state.hmsLooModelVisible&&state.hmsLooModelRoot))ensureRobertGaskinMapLayer(state);
  maybeAutoMaterializeRobertGaskin(state);
  maybeAutoMaterializeHmsGrafton(state);
  maybeAutoMaterializeCannon(state);
  maybeAutoMaterializeKxi(state);
  maybeAutoMaterializeCapeOtway(state);
  maybeAutoMaterializeTimaru(state);
  maybeAutoMaterializeHmsLoo(state);
  setStatus(state,'Shipwrecks ON · all seventy persistent icons remain visible through zoom, angle and style changes. Select a wreck for its BridgePoint card and 3D scan.');
  refreshStatusUi(state);
 };
 state.handleStyleLoad=state.handlePersistentVisibility;
 state.map.on('click',state.handleClick);
 for(const event of ['style.load','load','idle','moveend','zoomend','rotateend','pitchend'])
  state.map.on(event,state.handlePersistentVisibility);
}
function addControlGroup(state){
 const dock=document.getElementById('bpv-dock-actions');if(!dock)return false;
 if(document.getElementById(CONTROL_ID))return true;
 const group=document.createElement('section');group.id=CONTROL_ID;group.className='bpv-command-group';
 group.setAttribute('data-bpv-command-section','shipwrecks');
 group.setAttribute('aria-label','Shipwrecks');
 group.innerHTML=
  '<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">🚢</span><span><b>SHIPWRECKS</b><small>70 persistent markers · 60 additional photogrammetry scans</small></span></div>'+
  '<div class="bpv-command-grid"><button id="'+TOGGLE_ID+'" data-bpv-action="shipwrecks" type="button" class="bpv-command-btn" aria-pressed="false" title="Show or hide mapped shipwreck markers"><span class="bpv-command-icon" aria-hidden="true">🚢</span><span class="bpv-command-label">Shipwrecks</span></button></div>'+
  '<div id="'+COUNT_ID+'" class="bpv-data-note">70 persistent wreck icons · '+state.stats.models+' Titanic viewer references · 7 native seabed GLBs · 60 additional in-card scan viewers</div>'+
  '<div id="'+STATUS_ID+'" class="bpv-data-note">Layer off · the rest of the BridgePoint globe remains unchanged.</div>'+
  '<style id="bp-shipwrecks-titanic-style-v2">'+
  '#'+CONTROL_ID+' .bpv-data-note{font:600 10px/1.45 system-ui,sans-serif;color:#9bb7c6;margin:5px 2px;overflow-wrap:anywhere}'+
  '#'+TOGGLE_ID+'.is-active{border-color:rgba(235,192,112,.88);background:rgba(102,71,28,.52);box-shadow:inset 0 0 0 1px rgba(255,226,165,.2)}'+
  '.bp-shipwreck-titanic-popup-wrap-v1 .maplibregl-popup-content{background:#06131f;color:#e8f5fb;border:1px solid rgba(231,187,103,.55);border-radius:13px;padding:12px;font:12px/1.45 system-ui,sans-serif;max-height:min(80vh,780px);overflow:auto;width:min(410px,calc(100vw - 54px))}'+
  '.bp-shipwreck-titanic-popup-wrap-v1 .maplibregl-popup-tip{border-top-color:#06131f;border-bottom-color:#06131f}'+
  '.bp-shipwreck-kicker-v1{font-size:9px;letter-spacing:.13em;font-weight:900;color:#f0c878}.bp-shipwreck-titanic-popup-v1 h3{font-size:18px;color:#fff;margin:4px 0 2px}.bp-shipwreck-part-v1{font-size:12px;font-weight:800;color:#d9c49b;margin-bottom:8px}'+
  '.bp-shipwreck-facts-v1{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:7px 0 10px}.bp-shipwreck-facts-v1 span{display:grid;gap:2px;padding:7px;border:1px solid rgba(170,197,207,.18);border-radius:7px;color:#e4eff4;font-size:10px}.bp-shipwreck-facts-v1 b{font-size:9px;color:#9eb7c5;text-transform:uppercase;letter-spacing:.08em}'+
  '.bp-shipwreck-viewer-v1{width:100%;aspect-ratio:4/3;min-height:205px;background:#02070d;border-radius:9px;overflow:hidden;margin:9px 0;border:1px solid rgba(226,186,109,.28)}.bp-shipwreck-viewer-v1 iframe{width:100%;height:100%;border:0;display:block}.bp-shipwreck-viewer-empty-v1{display:grid;place-items:center;min-height:205px;padding:20px;text-align:center;color:#aec3cd;font-size:12px;background:radial-gradient(ellipse at center,rgba(28,67,83,.42),rgba(2,7,13,.96))}'+
  '.bp-shipwreck-model-meta-v1{display:grid;gap:4px;color:#b9d0d8;font-size:11px}.bp-shipwreck-model-meta-v1>b{font-size:13px;color:#fff}.bp-shipwreck-model-meta-v1 p{margin:4px 0;color:#adc3cc}.bp-shipwreck-model-meta-v1 a,.bp-shipwreck-official-v1 a{color:#f1cf88;text-decoration:underline}'+
  '.bp-shipwreck-model-choices-v1{display:grid;gap:5px;margin:10px 0}.bp-shipwreck-model-choice-v1{display:grid;gap:2px;text-align:left;border:1px solid rgba(157,187,199,.24);background:rgba(14,36,47,.8);color:#eafaff;border-radius:8px;padding:7px 9px;font:600 11px/1.35 system-ui,sans-serif}.bp-shipwreck-model-choice-v1 small{font-size:9px;color:#9cbac5}.bp-shipwreck-model-choice-v1.is-active{border-color:#e3b76a;background:rgba(82,60,28,.48)}'+
  '.bp-shipwreck-official-v1{display:grid;gap:5px;border-top:1px solid rgba(154,205,212,.16);padding-top:8px;margin-top:8px;font-size:10px}.bp-shipwreck-official-v1>b{color:#dceaf0}.bp-shipwreck-accuracy-v1,.bp-shipwreck-source-v1{color:#a9c2cb;margin:8px 0;font-size:10px}.bp-shipwreck-source-v1{border-top:1px solid rgba(154,205,212,.16);padding-top:8px}'+
  '@media(max-width:480px){.bp-shipwreck-titanic-popup-wrap-v1 .maplibregl-popup-content{width:min(345px,calc(100vw - 44px));padding:10px}.bp-shipwreck-viewer-v1{min-height:175px}.bp-shipwreck-facts-v1{grid-template-columns:1fr 1fr}}'+
  '</style>';
 const wells=document.getElementById('bp-subsurface-wells-control-v1');
 if(wells&&wells.parentNode===dock)wells.after(group);else dock.appendChild(group);
 group.querySelector('#'+TOGGLE_ID).addEventListener('click',()=>{void setEnabled(state,!state.enabled);});
 refreshStatusUi(state);return true;
}
async function setEnabled(state,on){
 state.enabled=!!on;
 if(state.enabled){
  if(!installLayers(state))setStatus(state,'Shipwrecks ON · waiting for the map style before showing all seventy wreck icons.');
  else setStatus(state,'Shipwrecks ON · all seventy wreck icons remain visible from global zoom through close zoom. Select a marker for its card and 3D scan.');
  if(state.nativeModelRoot){
   state.nativeModelVisible=true;
   if(!state.map.getLayer(NATIVE_MODEL_LAYER_ID))ensureRobertGaskinMapLayer(state);
  }else{
   maybeAutoMaterializeRobertGaskin(state);
  }
  if(state.graftonModelRoot){
   state.graftonModelVisible=true;
   if(!state.map.getLayer(NATIVE_MODEL_LAYER_ID))ensureRobertGaskinMapLayer(state);
  }else{
   maybeAutoMaterializeHmsGrafton(state);
  }
  if(state.cannonModelRoot){
   state.cannonModelVisible=true;
   if(!state.map.getLayer(NATIVE_MODEL_LAYER_ID))ensureRobertGaskinMapLayer(state);
  }else{
   maybeAutoMaterializeCannon(state);
  }
  if(state.kxiModelRoot){
   state.kxiModelVisible=true;
   if(!state.map.getLayer(NATIVE_MODEL_LAYER_ID))ensureRobertGaskinMapLayer(state);
  }else{
   maybeAutoMaterializeKxi(state);
  }
  if(state.capeOtwayModelRoot){
   state.capeOtwayModelVisible=true;
   if(!state.map.getLayer(NATIVE_MODEL_LAYER_ID))ensureRobertGaskinMapLayer(state);
  }else{
   maybeAutoMaterializeCapeOtway(state);
  }
  if(state.timaruModelRoot){
   state.timaruModelVisible=true;
   if(!state.map.getLayer(NATIVE_MODEL_LAYER_ID))ensureRobertGaskinMapLayer(state);
  }else{
   maybeAutoMaterializeTimaru(state);
  }
  if(state.hmsLooModelRoot){
   state.hmsLooModelVisible=true;
   if(!state.map.getLayer(NATIVE_MODEL_LAYER_ID))ensureRobertGaskinMapLayer(state);
  }else{
   maybeAutoMaterializeHmsLoo(state);
  }
 }else{
  if(state.popup){state.popup.remove();state.popup=null;}
  state.nativeModelVisible=false;state.nativeModelAutoAttempted=false;if(state.nativeModelRoot)state.nativeModelRoot.visible=false;
  state.graftonModelVisible=false;state.graftonModelAutoAttempted=false;if(state.graftonModelRoot)state.graftonModelRoot.visible=false;
  state.cannonModelVisible=false;state.cannonModelAutoAttempted=false;if(state.cannonModelRoot)state.cannonModelRoot.visible=false;
  state.kxiModelVisible=false;state.kxiModelAutoAttempted=false;if(state.kxiModelRoot)state.kxiModelRoot.visible=false;
  state.capeOtwayModelVisible=false;state.capeOtwayModelAutoAttempted=false;if(state.capeOtwayModelRoot)state.capeOtwayModelRoot.visible=false;
  state.timaruModelVisible=false;state.timaruModelAutoAttempted=false;if(state.timaruModelRoot)state.timaruModelRoot.visible=false;
  state.hmsLooModelVisible=false;state.hmsLooModelAutoAttempted=false;if(state.hmsLooModelRoot)state.hmsLooModelRoot.visible=false;
  setVisibility(state,false);setStatus(state,'Shipwrecks off · all seventy wreck icons and all seven native meshes are hidden; other BridgePoint layers are unchanged.');
 }
 refreshStatusUi(state);state.map.triggerRepaint?.();return state.enabled;
}
export function initShipwrecksRenderer(target){
 const map=target&&(target.map||target);
 if(!map||typeof map.getBounds!=='function'||typeof map.addSource!=='function')return null;
 const existing=MAP_STATES.get(map);if(existing)return existing.api;
 const state={map,enabled:false,popup:null,interactionsBound:false,status:'off',destroyed:false,
  nativeModelVisible:false,nativeModelAutoAttempted:false,nativeModelStatus:'Native scan not loaded.',nativeModelRoot:null,nativeModelPromise:null,
  graftonModelVisible:false,graftonModelAutoAttempted:false,graftonModelStatus:'Native scan not loaded.',graftonModelRoot:null,graftonModelPromise:null,graftonModelBounds:null,
  cannonModelVisible:false,cannonModelAutoAttempted:false,cannonModelStatus:'Native scan not loaded.',cannonModelRoot:null,cannonModelPromise:null,cannonModelBounds:null,
  kxiModelVisible:false,kxiModelAutoAttempted:false,kxiModelStatus:'Native scan not loaded.',kxiModelRoot:null,kxiModelPromise:null,kxiModelBounds:null,
  capeOtwayModelVisible:false,capeOtwayModelAutoAttempted:false,capeOtwayModelStatus:'Native scan not loaded.',capeOtwayModelRoot:null,capeOtwayModelPromise:null,capeOtwayModelBounds:null,
  timaruModelVisible:false,timaruModelAutoAttempted:false,timaruModelStatus:'Native scan not loaded.',timaruModelRoot:null,timaruModelPromise:null,timaruModelBounds:null,
  hmsLooModelVisible:false,hmsLooModelAutoAttempted:false,hmsLooModelStatus:'Native scan not loaded.',hmsLooModelRoot:null,hmsLooModelPromise:null,hmsLooModelBounds:null,
  DRACOLoader:null,dracoLoader:null,KTX2Loader:null,ktx2Loader:null,
  nativeModelRenderer:null,nativeModelCamera:null,nativeModelScene:null,nativeModelLayerReady:false,nativeModelBounds:null,
  stats:{version:VERSION,parts:3,sites:67,additionalSites:60,models:TITANIC_3D_MODELS.length,nativeModels:7,lastError:null}};
 const api={
  version:VERSION,get enabled(){return state.enabled;},get status(){return state.status;},
  get stats(){return Object.assign({},state.stats);},get partCount(){return state.stats.parts;},get modelCount(){return state.stats.models;},
  toggle(){return setEnabled(state,!state.enabled);},setEnabled(on){return setEnabled(state,on);},
  refresh(){const source=map.getSource(SOURCE_ID);if(source?.setData)source.setData({type:'FeatureCollection',features:buildAllShipwreckFeatures()});return state.stats;},
  showRobertGaskinOnRiverbed(){return showRobertGaskinOnRiverbed(state);},
  showHmsGraftonOnSeabed(){return showHmsGraftonOnSeabed(state);},
  showCannonOnSeabed(){return showCannonOnSeabed(state);},
  showKxiOnSeabed(){return showKxiOnSeabed(state);},
  showCapeOtwayOnSeabed(){return showCapeOtwayOnSeabed(state);},
  showTimaruOnSeabed(){return showTimaruOnSeabed(state);},
  showHmsLooOnSeabed(){return showHmsLooOnSeabed(state);},
  destroy(){
   state.destroyed=true;state.enabled=false;state.nativeModelVisible=false;state.graftonModelVisible=false;state.cannonModelVisible=false;state.kxiModelVisible=false;state.capeOtwayModelVisible=false;state.timaruModelVisible=false;state.hmsLooModelVisible=false;
   if(state.popup)state.popup.remove();
   if(state.handleClick)map.off('click',state.handleClick);
   if(state.handlePersistentVisibility){
    for(const event of ['style.load','load','idle','moveend','zoomend','rotateend','pitchend'])
     map.off(event,state.handlePersistentVisibility);
   }
   if(state.observer)state.observer.disconnect();if(state.dockTimer)clearTimeout(state.dockTimer);
   if(map.getLayer(NATIVE_MODEL_LAYER_ID))map.removeLayer(NATIVE_MODEL_LAYER_ID);
   try{state.nativeModelRenderer?.dispose();}catch(_){}
   try{state.ktx2Loader?.dispose?.();}catch(_){}
   state.ktx2Loader=null;
   if(state.nativeModelRoot){state.nativeModelScene?.remove(state.nativeModelRoot);state.nativeModelRoot=null;}
   if(state.graftonModelRoot){state.nativeModelScene?.remove(state.graftonModelRoot);state.graftonModelRoot=null;}
   if(state.cannonModelRoot){state.nativeModelScene?.remove(state.cannonModelRoot);state.cannonModelRoot=null;}
   if(state.kxiModelRoot){state.nativeModelScene?.remove(state.kxiModelRoot);state.kxiModelRoot=null;}
   if(state.capeOtwayModelRoot){state.nativeModelScene?.remove(state.capeOtwayModelRoot);state.capeOtwayModelRoot=null;}
   if(state.timaruModelRoot){state.nativeModelScene?.remove(state.timaruModelRoot);state.timaruModelRoot=null;}
   if(state.hmsLooModelRoot){state.nativeModelScene?.remove(state.hmsLooModelRoot);state.hmsLooModelRoot=null;}
   for(const id of [LABEL_ID,MARKER_ID,HALO_ID])if(map.getLayer(id))map.removeLayer(id);
   if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID);
   try{if(map.hasImage?.(ICON_ID))map.removeImage(ICON_ID)}catch(_){}
   MAP_STATES.delete(map);
  }
 };
 state.api=api;MAP_STATES.set(map,state);window.__BP_SHIPWRECKS_V1__=api;bindInteractions(state);
 const observeDock=()=>{if(!MAP_STATES.has(map))return;if(addControlGroup(state))return;state.dockTimer=setTimeout(observeDock,500);};
 observeDock();
 if(typeof MutationObserver!=='undefined'&&document.body){
  state.observer=new MutationObserver(()=>{if(MAP_STATES.has(map)&&!document.getElementById(CONTROL_ID))addControlGroup(state);});
  state.observer.observe(document.body,{childList:true,subtree:true});
 }
 return api;
}
