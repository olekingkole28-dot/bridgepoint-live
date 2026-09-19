import{VERSION,EDGE,EMPTY,MOBILE,LOW,TIER,rpc,edge,tileTransform,bbox,fc,clamp}from'./world-v2300-config.js';
window.__BP_WORLD_RENDER_VERSION__=5370;

const OFM='https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf';
const NASA='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';
const USGS='https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}';
const DEM='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const BUILDINGS=`${EDGE}bridgepoint-public-building-city-tile-v5370?z={z}&x={x}&y={y}&limit=4500`;
const PARCELS=`${EDGE}bridgepoint-spatial-tile-v1957?layer=parcels&z={z}&x={x}&y={y}&limit=9000`;
const MAX_EXACT=MOBILE?900:(TIER==='LOW'?1400:TIER==='HIGH'?3200:2200);
const DETAIL_MIN=MOBILE?13.8:(TIER==='LOW'?13.4:TIER==='HIGH'?12.3:12.8);
const FACADE_DETAIL_MIN=MOBILE?(TIER==='LOW'?15.4:14.8):(TIER==='LOW'?14.8:TIER==='HIGH'?13.6:14.1);
const PARCEL_MIN=MOBILE?12.9:(TIER==='LOW'?13.2:TIER==='HIGH'?12.2:12.6);
const LIGHT_MIN=TIER==='LOW'?16.8:TIER==='HIGH'?15.6:16.1;
const US_BOUNDS=[-125,24,-66,50];

const roadFilter=classes=>['in',['get','class'],['literal',classes]];
const vis=(map,id,on)=>{try{if(!map.getLayer(id))return;const next=on?'visible':'none';if((map.getLayoutProperty(id,'visibility')||'visible')!==next)map.setLayoutProperty(id,'visibility',next)}catch(_){}};
const paint=(map,id,k,v)=>{try{if(map.getLayer(id))map.setPaintProperty(id,k,v)}catch(_){}};

function style(){
 const bType=['downcase',['to-string',['coalesce',['get','facade_material'],['get','building_material'],['get','building_type'],['get','property_type'],['get','building'],['get','class'],['get','type'],'']]];
 const bAmenity=['downcase',['to-string',['coalesce',['get','amenity'],['get','facility_type'],['get','subtype'],'']]];
 const bHeight=['coalesce',['to-number',['get','render_height_m']],['to-number',['get','render_height']],['to-number',['get','height_m']],['to-number',['get','height']],['*',['coalesce',['to-number',['get','levels']],['to-number',['get','num_floors']],2],3],8];
 const bYear=['coalesce',
   ['to-number',['get','construction_year']],
   ['to-number',['get','year_built']],
   ['to-number',['get','start_date']],
   ['to-number',['get','construction:year']],
   ['to-number',['get','construction_year',['coalesce',['get','metadata'],['literal',{}]]]],
   0
 ];
 const bSeedBase=['to-number',
   ['coalesce',['get','style_seed'],['id'],['get','building_id'],['get','osm_id'],['get','id']],
   ['+',137,['*',31,['round',bHeight]],['*',7,['round',bYear]]]
 ];
 const seed=(salt,mod)=>['%', ['abs',['+', ['*',bSeedBase,salt], salt*7919]], mod];
 const pick=(names,salt=1)=>{const s=seed(salt,names.length),x=['match',s];for(let i=0;i<names.length;i++)x.push(i,names[i]);x.push(names[0]);return x};
 const inType=xs=>['in',bType,['literal',xs]];
 const tall=['>',bHeight,55],veryTall=['>',bHeight,105];
 const old=['all',['>',bYear,0],['<',bYear,1945]],mid=['all',['>=',bYear,1945],['<',bYear,1985]],modern=['>=',bYear,1985];
 const residential=['res-cream','res-sage','res-blue','res-tan','res-rose','res-white','row-red','row-brown','row-cream','res-charcoal'];
 const brick=['brick-red','brick-brown','brick-tan','brick-dark','brick-orange','brick-cream'];
 const glass=['glass-blue','glass-teal','glass-smoke','glass-silver','glass-green','glass-bronze','glass-ice','office-charcoal'];
 const office=['office-stone','office-beige','office-white','office-charcoal','office-sand','office-gray','glass-blue','glass-silver','glass-bronze'];
 const industrial=['industrial-gray','industrial-blue','industrial-tan','industrial-white','industrial-green','industrial-rust'];
 const barns=['barn-red','barn-wood','barn-white'];
 const civic=['civic-limestone','civic-stone','civic-brick','civic-granite'];
 const medical=['medical-white','medical-brick','medical-glass'];
 const fire=['fire-red','fire-brick','fire-modern'];
 const school=['school-brick','school-stone','school-modern'];
 const police=['police-stone','police-modern'];
 const neutral=['neutral-warm','neutral-cool','neutral-dark','office-stone','res-tan','brick-tan','office-gray','res-blue','brick-red','glass-smoke'];
 const inAmenity=xs=>['in',bAmenity,['literal',xs]];
 const facadeDetail=['case',
  ['any',inType(['hospital','clinic','medical']),inAmenity(['hospital','clinic','doctors','pharmacy'])],pick(medical,131),
  ['any',inType(['fire_station','fire station']),inAmenity(['fire_station'])],pick(fire,137),
  ['any',inType(['school','college','university','kindergarten']),inAmenity(['school','college','university','kindergarten'])],pick(school,139),
  ['any',inType(['police','sheriff']),inAmenity(['police'])],pick(police,149),
  inType(['brick','masonry']),pick(brick,3),
  inType(['glass']),pick(glass,5),
  inType(['office','commercial','retail','hotel','mixed_use','mixed-use']),pick(office,7),
  inType(['barn','farm_auxiliary','stable','cowshed']),pick(barns,11),
  inType(['industrial','warehouse','hangar','manufacture','factory']),pick(industrial,12),
  inType(['hospital','school','university','college','civic','public','government','church','cathedral','chapel','mosque','synagogue','temple']),pick(civic,13),
  inType(['wood','timber','residential','apartments','house','detached','semidetached_house','terrace','dormitory','bungalow']),pick(residential,17),
  ['all',old,['<',bHeight,55]],pick(['row-red','row-brown','brick-red','brick-brown','brick-tan','civic-stone','res-cream'],19),
  ['all',modern,veryTall],pick(['glass-blue','glass-teal','glass-silver','glass-green','glass-bronze','glass-ice','office-charcoal'],23),
  ['all',modern,tall],pick(['office-white','office-gray','glass-smoke','glass-blue','office-charcoal','office-sand'],29),
  ['all',mid,tall],pick(['office-stone','office-beige','office-gray','neutral-cool','industrial-gray'],31),
  pick(neutral,37)
 ];
 const facadeVariant=seed(127,128);
 const solidName=n=>['concat','bpfacade-solid-',n,'-v',['to-string',facadeVariant]];
 const detailName=n=>['concat','bpfacade-',n,'-v',['to-string',facadeVariant]];
 const facadePattern=['step',['zoom'],solidName(facadeDetail),15.15,detailName(facadeDetail)];
 const facadeColor=['case',
  ['any',inType(['hospital','clinic','medical']),inAmenity(['hospital','clinic','doctors','pharmacy'])],pick(['#c7c9c3','#ddd9cf','#9faeb2','#b6b7af','#d5d6d0','#87999e'],151),
  ['any',inType(['fire_station','fire station']),inAmenity(['fire_station'])],pick(['#8f3f35','#7b4b3e','#b05b43','#6d3c34','#8f7567'],157),
  ['any',inType(['school','college','university','kindergarten']),inAmenity(['school','college','university','kindergarten'])],pick(['#8a6957','#927960','#77766e','#a08b70','#6e7472'],163),
  ['any',inType(['police','sheriff']),inAmenity(['police'])],pick(['#717a7a','#7f817a','#626c70','#8c877c'],167),
  inType(['brick','masonry']),pick(['#8b5e50','#7b5046','#9a715f','#5f4c46','#a5664d','#b39a7d'],41),
  inType(['glass']),pick(['#496c7d','#4c777c','#596a72','#78868b','#54766f','#4a5961','#6c8797','#716858'],43),
  inType(['office','commercial','retail','hotel','mixed_use','mixed-use']),pick(['#6a706f','#777063','#8b8b82','#4b5559','#567381','#737f84','#8a806d','#5f666b'],47),
  inType(['barn','farm_auxiliary','stable','cowshed']),pick(['#7c3731','#765b42','#a8a394','#6f302d','#80674e','#b8b2a5'],51),
  inType(['industrial','warehouse','hangar','manufacture','factory']),pick(['#6a6e6c','#65757c','#7b705f','#898982','#667363','#845f4c'],53),
  inType(['hospital','school','university','college','civic','public','government']),pick(['#8c826d','#747976','#855b4e','#686765'],59),
  inType(['wood','timber','residential','apartments','house','detached','semidetached_house','terrace','dormitory','bungalow']),pick(['#827567','#738069','#667985','#8a7863','#8a6863','#8a8980','#81584b','#675047','#a18f72','#5f6464'],61),
  ['all',old,['<',bHeight,55]],pick(['#80574b','#6d4d43','#916b58','#a08268','#786553','#8e7b68'],67),
  ['all',modern,veryTall],pick(['#486b7a','#547b80','#68797f','#798789','#526f75','#646f7a','#5c665d'],71),
  ['all',modern,tall],pick(['#737a78','#8a887f','#5a666d','#667d89','#7a7469','#555f64'],73),
  ['all',mid,tall],pick(['#696d6b','#777267','#858177','#60696d','#706a5e'],79),
  pick(['#726c61','#687279','#585e60','#7d7567','#77675a','#685b54','#7d6856','#617078','#83695b','#586c65','#74726c','#8b7b68'],83)
 ];
 const roofKind=['downcase',['to-string',['coalesce',['get','roof_material'],['get','roof:material'],['get','roof_shape'],['get','roof:shape'],'']]];
 const genericRoofs=['roof-membrane-dark','roof-membrane-light','roof-gravel','roof-shingle-gray','roof-shingle-brown','roof-metal-dark','roof-metal-silver','roof-tile-red','roof-tile-brown','roof-slate'];
 const roofName=['case',
  ['in',roofKind,['literal',['metal','steel','tin','zinc']]],pick(['roof-metal-silver','roof-metal-dark'],89),
  ['in',roofKind,['literal',['tile','tiles','clay','terracotta']]],pick(['roof-tile-red','roof-tile-brown'],97),
  ['in',roofKind,['literal',['slate']]],'roof-slate',
  ['in',roofKind,['literal',['shingle','shingles','asphalt_shingles']]],pick(['roof-shingle-gray','roof-shingle-brown'],101),
  ['in',roofKind,['literal',['concrete','cement']]],pick(['roof-membrane-light','roof-gravel'],103),
  pick(genericRoofs,107)
 ];
 const roofPattern=['concat','bproof-',roofName];
 const nightWindowPattern=pick(['bp-window-night-warm','bp-window-night-cool','bp-window-night-mixed'],109);
 const roofColor=['case',
  ['in',roofKind,['literal',['metal','steel','tin','zinc']]],pick(['#7d898b','#596367']),
  ['in',roofKind,['literal',['tile','tiles','clay','terracotta']]],pick(['#8b5544','#765441']),
  ['in',roofKind,['literal',['slate']]],'#4f5d66',
  ['in',roofKind,['literal',['shingle','shingles','asphalt_shingles']]],pick(['#686866','#6e594b']),
  ['in',roofKind,['literal',['concrete','cement']]],pick(['#7a7c76','#686a67']),
  pick(['#4b4d4b','#72736d','#777066','#646664','#6b574a','#586164','#7d898b','#865744','#725a45','#4f5d66'])
 ];
 return{
 version:8,
 glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
 sources:{
  ofm:{type:'vector',tiles:[OFM],minzoom:0,maxzoom:14,attribution:'OpenFreeMap © OpenMapTiles · © OpenStreetMap contributors'},
  nasa:{type:'raster',tiles:[NASA],tileSize:256,maxzoom:8,attribution:'NASA EOSDIS GIBS · Blue Marble'},
  usgs:{type:'raster',tiles:[USGS],tileSize:256,minzoom:4,maxzoom:17,bounds:US_BOUNDS,attribution:'USDA · USGS The National Map orthoimagery'},
  dem:{type:'raster-dem',tiles:[DEM],tileSize:256,maxzoom:15,encoding:'terrarium',attribution:'Mapzen Terrain Tiles · AWS Open Data'},
  bpBuildings:{type:'vector',tiles:[BUILDINGS],minzoom:11,maxzoom:22,attribution:'BridgePoint source-backed city-scale building geometry · V5370'},
  bpParcels:{type:'vector',tiles:[PARCELS],minzoom:10,maxzoom:22,attribution:'BridgePoint parcel provenance'},
  exact:{type:'geojson',data:EMPTY},exactRoof:{type:'geojson',data:EMPTY},selected:{type:'geojson',data:EMPTY},streetlights:{type:'geojson',data:EMPTY},bpOpportunities:{type:'geojson',data:EMPTY},bpSemanticLabels:{type:'geojson',data:EMPTY},bpLivingWorld:{type:'geojson',data:EMPTY,attribution:'BridgePoint source-backed living-world detail · public/open government and OSM sources'},bpLivingWorld3D:{type:'geojson',data:EMPTY,attribution:'BridgePoint source-backed positions · derived display geometry'},bpRoad3D:{type:'geojson',data:EMPTY,attribution:'OpenStreetMap/OpenFreeMap centerlines · BridgePoint derived physical road deck'}
 },
 layers:[
  {id:'gta-bg',type:'background',paint:{'background-color':'#071017'}},
  {id:'gta-nasa',type:'raster',source:'nasa',layout:{visibility:'none'},paint:{'raster-opacity':.93,'raster-saturation':-.08,'raster-contrast':.12,'raster-fade-duration':0}},
  {id:'gta-usgs',type:'raster',source:'usgs',layout:{visibility:'none'},paint:{'raster-opacity':['interpolate',['linear'],['zoom'],5,.45,9,.82,13,.96,17,.99],'raster-saturation':-.06,'raster-contrast':.1,'raster-fade-duration':0}},
  {id:'gta-water',type:'fill',source:'ofm','source-layer':'water',paint:{'fill-color':['interpolate',['linear'],['zoom'],2,'#0a3550',10,'#123f58',17,'#174e63'],'fill-opacity':.99}},
  {id:'gta-coast-shadow',type:'line',source:'ofm','source-layer':'water',minzoom:4,paint:{'line-color':'#071721','line-width':['interpolate',['linear'],['zoom'],4,.55,10,1.4,16,3.1,20,5.5],'line-opacity':.88,'line-blur':1.1}},
  {id:'gta-coast-edge',type:'line',source:'ofm','source-layer':'water',minzoom:5,paint:{'line-color':['interpolate',['linear'],['zoom'],5,'#557988',12,'#8fb6bd',18,'#c6dedb'],'line-width':['interpolate',['linear'],['zoom'],5,.3,12,.8,18,1.8,20,2.5],'line-opacity':.62}},
  {id:'gta-coast-foam',type:'line',source:'ofm','source-layer':'water',minzoom:13,paint:{'line-color':'#d9efea','line-width':['interpolate',['linear'],['zoom'],13,.25,18,.9,20,1.4],'line-opacity':.18,'line-blur':.35,'line-dasharray':[2,5]}},
  {id:'gta-landcover',type:'fill',source:'ofm','source-layer':'landcover',minzoom:2,paint:{'fill-color':['match',['downcase',['to-string',['coalesce',['get','class'],'']]],['wood','forest'],'#214d32',['grass','meadow'],'#4f713c','farmland','#706741',['wetland','marsh'],'#41695f',['sand','beach'],'#b79d68',['desert','dune'],'#9f7d4b',['bare_rock','rock','scree'],'#68675d',['ice','glacier','snow'],'#7696a8',['scrub','heath'],'#5f673e','#303a35'],'fill-opacity':['interpolate',['linear'],['zoom'],2,.72,8,.82,13,.92]}},
  {id:'gta-landcover-texture',type:'fill',source:'ofm','source-layer':'landcover',minzoom:9.2,paint:{'fill-pattern':['match',['downcase',['to-string',['coalesce',['get','class'],'']]],['wood','forest'],'bpterrain-forest',['grass','meadow'],'bpterrain-grass','farmland','bpterrain-farm',['wetland','marsh'],'bpterrain-wetland',['sand','beach'],'bpterrain-sand',['desert','dune'],'bpterrain-desert',['bare_rock','rock','scree'],'bpterrain-rock',['ice','glacier','snow'],'bpterrain-glacier',['scrub','heath'],'bpterrain-scrub','bpterrain-neutral'],'fill-opacity':['interpolate',['linear'],['zoom'],9.2,.18,13,.32,17,.46]}},
  {id:'gta-landuse',type:'fill',source:'ofm','source-layer':'landuse',minzoom:7.5,paint:{'fill-color':['match',['downcase',['to-string',['coalesce',['get','class'],'']]],['park','recreation_ground'],'#285b38','grass','#4c733f','cemetery','#3d5b43','residential','#373b3a','commercial','#44403a','retail','#494039','industrial','#454642','school','#555649','hospital','#55514a','#3b403d'],'fill-opacity':['interpolate',['linear'],['zoom'],7.5,.68,14,.82,18,.9]}},
  {id:'gta-hillshade',type:'hillshade',source:'dem',minzoom:4,paint:{'hillshade-exaggeration':LOW?.42:TIER==='HIGH'?.76:.62,'hillshade-shadow-color':'#11130f','hillshade-highlight-color':'#d6d2bb','hillshade-accent-color':'#686955'}},
  {id:'gta-road3d-curb',type:'fill-extrusion',source:'bpRoad3D',minzoom:15.7,filter:['!=',['get','part'],'bridge_rail'],paint:{'fill-extrusion-color':'#e7e5de','fill-extrusion-base':['to-number',['get','base_m'],0],'fill-extrusion-height':['to-number',['get','curb_top_m'],.2],'fill-extrusion-opacity':.94,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-road3d-deck',type:'fill-extrusion',source:'bpRoad3D',minzoom:15.7,filter:['!=',['get','part'],'bridge_rail'],paint:{'fill-extrusion-color':['case',['==',['get','bridge'],true],'#0d0f11','#111315'],'fill-extrusion-base':['to-number',['get','base_m'],0],'fill-extrusion-height':['to-number',['get','deck_top_m'],.1],'fill-extrusion-opacity':.99,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-road3d-bridge-rail',type:'fill-extrusion',source:'bpRoad3D',minzoom:15.7,filter:['==',['get','part'],'bridge_rail'],paint:{'fill-extrusion-color':'#b7b8b3','fill-extrusion-base':['to-number',['get','rail_base_m'],.2],'fill-extrusion-height':['to-number',['get','rail_top_m'],1.15],'fill-extrusion-opacity':.98,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-road3d-bridge-pier',type:'fill-extrusion',source:'bpRoad3D',minzoom:15.7,filter:['==',['get','part'],'bridge_pier'],paint:{'fill-extrusion-color':'#7f817d','fill-extrusion-base':0,'fill-extrusion-height':['to-number',['get','pier_top_m'],2],'fill-extrusion-opacity':.98,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-road-major-shadow',type:'line',source:'ofm','source-layer':'transportation',minzoom:6.5,filter:roadFilter(['motorway','trunk','primary','secondary']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#000000','line-width':['interpolate',['exponential',1.35],['zoom'],7,1.8,11,4.4,15,12.5,19,26],'line-opacity':.58,'line-blur':1.5}},
  {id:'gta-road-major-glow',type:'line',source:'ofm','source-layer':'transportation',minzoom:6.5,filter:roadFilter(['motorway','trunk','primary','secondary']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#f2f0e8','line-width':['interpolate',['exponential',1.35],['zoom'],7,1.2,11,3.4,15,10.2,19,21.5],'line-opacity':.98}},
  {id:'gta-road-major',type:'line',source:'ofm','source-layer':'transportation',minzoom:6.5,filter:roadFilter(['motorway','trunk','primary','secondary']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#101214','line-width':['interpolate',['exponential',1.35],['zoom'],7,.72,11,2.35,15,7.6,19,16.8],'line-opacity':1}},
  {id:'gta-road-major-marking',type:'line',source:'ofm','source-layer':'transportation',minzoom:14,filter:roadFilter(['motorway','trunk','primary','secondary']),layout:{'line-cap':'butt','line-join':'round'},paint:{'line-color':['match',['get','class'],'motorway','#f2c94c','trunk','#f2c94c','primary','#f2c94c','secondary','#f5f3ed','#f2c94c'],'line-width':['interpolate',['linear'],['zoom'],14,.42,17,.9,20,1.45],'line-opacity':['interpolate',['linear'],['zoom'],14,.35,16,.74,20,.9],'line-dasharray':[3,4]}},
  {id:'gta-road-local-casing',type:'line',source:'ofm','source-layer':'transportation',minzoom:10.5,filter:roadFilter(['tertiary','minor','service','track']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#f2f0e8','line-width':['interpolate',['exponential',1.35],['zoom'],10.5,1,14,3.4,17,8.8,20,17.5],'line-opacity':.92}},
  {id:'gta-road-local',type:'line',source:'ofm','source-layer':'transportation',minzoom:10.5,filter:roadFilter(['tertiary','minor','service','track']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['get','class'],'track','#27251f','#111315'],'line-width':['interpolate',['exponential',1.35],['zoom'],10.5,.42,14,1.55,17,4.7,20,10.8],'line-opacity':['interpolate',['linear'],['zoom'],10.5,.68,14,.9,17,1]}},
  {id:'gta-road-local-marking',type:'line',source:'ofm','source-layer':'transportation',minzoom:16.2,filter:roadFilter(['tertiary','minor']),layout:{'line-cap':'butt','line-join':'round'},paint:{'line-color':['match',['get','class'],'tertiary','#f2c94c','minor','#f5f3ed','#f5f3ed'],'line-width':['interpolate',['linear'],['zoom'],16.2,.3,20,.8],'line-opacity':.54,'line-dasharray':[2,5]}},
  {id:'gta-bridge-shadow',type:'line',source:'ofm','source-layer':'transportation',minzoom:10.5,filter:['==',['get','brunnel'],'bridge'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#000000','line-width':['interpolate',['exponential',1.3],['zoom'],10.5,3,14,7,17,16,20,29],'line-opacity':.72,'line-blur':2.2,'line-translate':[0,3]}},
  {id:'gta-bridge-deck',type:'line',source:'ofm','source-layer':'transportation',minzoom:10.5,filter:['==',['get','brunnel'],'bridge'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#111315','line-width':['interpolate',['exponential',1.3],['zoom'],10.5,1.8,14,4.8,17,11.5,20,22],'line-opacity':1}},
  {id:'gta-bridge-centerline',type:'line',source:'ofm','source-layer':'transportation',minzoom:14,filter:['==',['get','brunnel'],'bridge'],layout:{'line-cap':'butt','line-join':'round'},paint:{'line-color':'#f2c94c','line-width':['interpolate',['linear'],['zoom'],14,.35,18,.8,20,1.15],'line-opacity':.92,'line-dasharray':[3,4]}},
  {id:'gta-bridge-rails',type:'line',source:'ofm','source-layer':'transportation',minzoom:15,filter:['==',['get','brunnel'],'bridge'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#f4f2ea','line-width':['interpolate',['linear'],['zoom'],15,.5,20,1.2],'line-gap-width':['interpolate',['linear'],['zoom'],15,3.2,20,14],'line-opacity':.84}},
  {id:'gta-rail',type:'line',source:'ofm','source-layer':'transportation',minzoom:11,filter:roadFilter(['rail','transit']),paint:{'line-color':'#f2d88e','line-width':['interpolate',['linear'],['zoom'],11,.4,17,1.7,20,3.5],'line-opacity':.66,'line-dasharray':[2,2]}},
  {id:'gta-waterway',type:'line',source:'ofm','source-layer':'waterway',minzoom:8,paint:{'line-color':'#2bc5ff','line-width':['interpolate',['linear'],['zoom'],8,.4,17,2.5],'line-opacity':.72}},
  {id:'gta-waterway-flow',type:'line',source:'ofm','source-layer':'waterway',minzoom:11,paint:{'line-color':'#a9eaf4','line-width':['interpolate',['linear'],['zoom'],11,.22,17,.85,20,1.3],'line-opacity':.34,'line-dasharray':[1.2,4.8]}},
  {id:'gta-state',type:'line',source:'ofm','source-layer':'boundary',minzoom:2.5,filter:['==',['get','admin_level'],4],paint:{'line-color':'#e6fbff','line-width':['interpolate',['linear'],['zoom'],3,.5,9,1.4,15,2.2],'line-opacity':.84}},
  {id:'gta-county',type:'line',source:'ofm','source-layer':'boundary',minzoom:7,filter:['==',['get','admin_level'],6],paint:{'line-color':'#5c8a93','line-width':.8,'line-opacity':.5,'line-dasharray':[3,2]}},
  {id:'gta-context-building-footprints',type:'fill',source:'ofm','source-layer':'building',minzoom:9.25,maxzoom:11.25,paint:{'fill-color':facadeColor,'fill-opacity':['interpolate',['linear'],['zoom'],9.25,.18,10.4,.28,11.2,.42]}},
  {id:'gta-context-building-shadow',type:'fill',source:'ofm','source-layer':'building',minzoom:11.2,layout:{visibility:'none'},paint:{'fill-color':'#020304','fill-opacity':.16,'fill-translate':[5,5],'fill-translate-anchor':'map'}},
  {id:'gta-bp-building-shadow',type:'fill',source:'bpBuildings','source-layer':'buildings',minzoom:11.4,layout:{visibility:'none'},paint:{'fill-color':'#020304','fill-opacity':.2,'fill-translate':[5,5],'fill-translate-anchor':'map'}},
  {id:'gta-exact-building-shadow',type:'fill',source:'exact',minzoom:DETAIL_MIN,layout:{visibility:'none'},paint:{'fill-color':'#010203','fill-opacity':.24,'fill-translate':[5,5],'fill-translate-anchor':'map'}},
  {id:'gta-context-buildings',type:'fill-extrusion',source:'ofm','source-layer':'building',minzoom:9.6,paint:{'fill-extrusion-color':facadeColor,'fill-extrusion-height':['max',4,bHeight],'fill-extrusion-base':0,'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],9.6,.58,11,.76,13,.9,15,.97,18,.995],'fill-extrusion-vertical-gradient':true}},
  {id:'gta-context-floor-lines',type:'fill-extrusion',source:'ofm','source-layer':'building',minzoom:MOBILE?16.2:15.7,layout:{visibility:'none'},paint:{'fill-extrusion-pattern':'bp-floor-lines','fill-extrusion-height':['max',4,bHeight],'fill-extrusion-base':0,'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],MOBILE?16.2:15.7,.46,18,.72,21,.84],'fill-extrusion-vertical-gradient':false}},
  {id:'gta-context-facade-detail',type:'fill-extrusion',source:'ofm','source-layer':'building',minzoom:16.15,layout:{visibility:'none'},paint:{'fill-extrusion-pattern':facadePattern,'fill-extrusion-height':['max',4,bHeight],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','render_min_height']],['to-number',['get','min_height']],0]],'fill-extrusion-opacity':.995,'fill-extrusion-vertical-gradient':false}},
  {id:'gta-context-building-parts',type:'fill-extrusion',source:'ofm','source-layer':'building',minzoom:15.2,filter:['>', ['coalesce',['to-number',['get','render_min_height']],['to-number',['get','min_height']],0], .05],layout:{visibility:'none'},paint:{'fill-extrusion-color':facadeColor,'fill-extrusion-height':['max',4,bHeight],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','render_min_height']],['to-number',['get','min_height']],0]],'fill-extrusion-opacity':.998,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-context-roofs',type:'fill-extrusion',source:'ofm','source-layer':'building',minzoom:MOBILE?12.6:11.4,filter:['any',['has','roof_shape'],['has','roof:shape'],['has','roof_material'],['has','roof:material'],['has','roof_height'],['has','roof:height']],layout:{visibility:'none'},paint:{'fill-extrusion-color':roofColor,'fill-extrusion-base':['max',4,bHeight],'fill-extrusion-height':['+',['max',4,bHeight],.24],'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],11.4,.62,13,.8,16,.94,18,.99],'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-buildings',type:'fill-extrusion',source:'bpBuildings','source-layer':'buildings',minzoom:11.0,layout:{visibility:'none'},paint:{'fill-extrusion-color':facadeColor,'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','base_height_m']],0]],'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],11,.78,12,.9,13,.97,15,.998,18,1],'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-facade-detail',type:'fill-extrusion',source:'bpBuildings','source-layer':'buildings',minzoom:16.15,layout:{visibility:'none'},paint:{'fill-extrusion-pattern':facadePattern,'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','base_height_m']],0]],'fill-extrusion-opacity':.999,'fill-extrusion-vertical-gradient':false}},
  {id:'gta-bp-roofs',type:'fill-extrusion',source:'bpBuildings','source-layer':'buildings',minzoom:11.0,layout:{visibility:'none'},paint:{'fill-extrusion-color':roofColor,'fill-extrusion-base':['max',['coalesce',['to-number',['get','base_height_m']],0],['-',['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],['max',.18,['coalesce',['to-number',['get','roof_height_m']],.3]]]],'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],11,.7,12.5,.86,15,.96,18,.997],'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-building-edge',type:'line',source:'bpBuildings','source-layer':'buildings',minzoom:11.8,layout:{visibility:'none'},paint:{'line-color':['interpolate',['linear'],['zoom'],11.8,'#88aeb7',17,'#b6d4d9',20,'#d5e5e7'],'line-width':['interpolate',['linear'],['zoom'],13.2,.25,18,.7,21,1.05],'line-opacity':['interpolate',['linear'],['zoom'],13.2,.28,17,.46,20,.6]}},
  {id:'gta-opportunity-buildings',type:'fill-extrusion',source:'bpOpportunities',minzoom:11.8,layout:{visibility:'none'},paint:{'fill-extrusion-color':['coalesce',['get','color'],'#7adcf0'],'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','base_height_m']],0]],'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],11.8,.88,14,.96,17,.995],'fill-extrusion-vertical-gradient':true}},
  {id:'gta-parcel-glow',type:'line',source:'bpParcels','source-layer':'parcels',minzoom:PARCEL_MIN,paint:{'line-color':'#26e8ff','line-width':['interpolate',['linear'],['zoom'],PARCEL_MIN,2,17,4.8,21,8],'line-opacity':.17,'line-blur':3}},
  {id:'gta-parcel',type:'line',source:'bpParcels','source-layer':'parcels',minzoom:PARCEL_MIN,paint:{'line-color':['case',['>', ['coalesce',['get','render_score'],0],75],'#ffd15c','#d4fbff'],'line-width':['interpolate',['linear'],['zoom'],PARCEL_MIN,.55,17,1.25,21,2.1],'line-opacity':.94}},
  {id:'gta-exact-building',type:'fill-extrusion',source:'exact',minzoom:DETAIL_MIN,layout:{visibility:'none'},paint:{'fill-extrusion-color':facadeColor,'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','base_height_m']],0]],'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-exact-floor-lines',type:'fill-extrusion',source:'exact',minzoom:MOBILE?16.2:15.7,layout:{visibility:'none'},paint:{'fill-extrusion-pattern':'bp-floor-lines','fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','base_height_m']],0]],'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],MOBILE?16.2:15.7,.58,18,.78,21,.9],'fill-extrusion-vertical-gradient':false}},
  {id:'gta-exact-facade-detail',type:'fill-extrusion',source:'exact',minzoom:16.15,layout:{visibility:'none'},paint:{'fill-extrusion-pattern':facadePattern,'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','base_height_m']],0]],'fill-extrusion-opacity':.999,'fill-extrusion-vertical-gradient':false}},
  {id:'gta-exact-roof',type:'fill-extrusion',source:'exactRoof',minzoom:DETAIL_MIN,filter:['!=',['get','roof_truth'],'VISUAL_CAP'],layout:{visibility:'none'},paint:{'fill-extrusion-color':roofColor,'fill-extrusion-pattern':roofPattern,'fill-extrusion-base':['get','roof_base_m'],'fill-extrusion-height':['get','roof_top_m'],'fill-extrusion-opacity':.999,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-building-outline',type:'line',source:'exact',minzoom:DETAIL_MIN,paint:{'line-color':['interpolate',['linear'],['zoom'],14.5,'#9dbbc1',18,'#c7dde1',21,'#e4eff1'],'line-width':['interpolate',['linear'],['zoom'],14.5,.35,18,.9,21,1.35],'line-opacity':['interpolate',['linear'],['zoom'],14.5,.42,18,.62,21,.72]}},
  {id:'gta-context-night-windows',type:'fill-extrusion',source:'ofm','source-layer':'building',minzoom:MOBILE?17.35:15.2,layout:{visibility:'none'},paint:{'fill-extrusion-pattern':nightWindowPattern,'fill-extrusion-height':['max',4,bHeight],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','render_min_height']],['to-number',['get','min_height']],0]],'fill-extrusion-opacity':0,'fill-extrusion-vertical-gradient':false}},
  {id:'gta-bp-night-windows',type:'fill-extrusion',source:'bpBuildings','source-layer':'buildings',minzoom:MOBILE?17.35:15.2,layout:{visibility:'none'},paint:{'fill-extrusion-pattern':nightWindowPattern,'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-base':0,'fill-extrusion-opacity':0,'fill-extrusion-vertical-gradient':false}},
  {id:'gta-exact-night-windows',type:'fill-extrusion',source:'exact',minzoom:MOBILE?17.35:DETAIL_MIN,layout:{visibility:'none'},paint:{'fill-extrusion-pattern':nightWindowPattern,'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','base_height_m']],0]],'fill-extrusion-opacity':0,'fill-extrusion-vertical-gradient':false}},
  {id:'gta-streetlights-glow',type:'circle',source:'streetlights',minzoom:LIGHT_MIN,paint:{'circle-radius':['interpolate',['linear'],['zoom'],LIGHT_MIN,2,18,4.4,21,6],'circle-color':'#fff1a6','circle-opacity':['interpolate',['linear'],['zoom'],LIGHT_MIN,.15,18,.34,21,.48],'circle-blur':.8}},
  {id:'gta-streetlights',type:'circle',source:'streetlights',minzoom:LIGHT_MIN,paint:{'circle-radius':['interpolate',['linear'],['zoom'],LIGHT_MIN,.7,18,1.5,21,2.4],'circle-color':'#fff9d8','circle-opacity':['interpolate',['linear'],['zoom'],LIGHT_MIN,.22,18,.86,21,1]}},
  {id:'gta-water-label',type:'symbol',source:'ofm','source-layer':'water_name',minzoom:5,layout:{'symbol-placement':'point','text-field':['coalesce',['get','name_en'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],5,10,12,12,17,14],'text-allow-overlap':false,'text-ignore-placement':false,'text-padding':8,'symbol-sort-key':['coalesce',['get','rank'],20]},paint:{'text-color':'#7dd9ff','text-halo-color':'rgba(4,14,22,.92)','text-halo-width':1.5,'text-halo-blur':.4}},
  {id:'gta-place-label',type:'symbol',source:'ofm','source-layer':'place',minzoom:3,layout:{'text-field':['coalesce',['get','name_en'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],3,10,6,12,10,14,14,16],'text-variable-anchor':['top','bottom','left','right'],'text-radial-offset':.45,'text-justify':'auto','text-allow-overlap':false,'text-ignore-placement':false,'text-padding':10,'symbol-sort-key':['coalesce',['get','rank'],20]},paint:{'text-color':'#edf9ff','text-halo-color':'rgba(5,12,17,.96)','text-halo-width':2,'text-halo-blur':.5}},
  {id:'gta-road-label-major',type:'symbol',source:'ofm','source-layer':'transportation_name',minzoom:9,filter:['match',['get','class'],['motorway','trunk','primary','secondary','tertiary'],true,false],layout:{'symbol-placement':'line','symbol-spacing':420,'text-field':['coalesce',['get','name_en'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],9,10,13,11.5,17,13.5,20,15],'text-rotation-alignment':'map','text-allow-overlap':false,'text-ignore-placement':false,'text-padding':12},paint:{'text-color':'#d9f7fb','text-halo-color':'rgba(4,11,16,.96)','text-halo-width':2,'text-halo-blur':.35}},
  {id:'gta-road-label-local',type:'symbol',source:'ofm','source-layer':'transportation_name',minzoom:14.2,filter:['match',['get','class'],['minor','service','track','path'],true,false],layout:{'symbol-placement':'line','symbol-spacing':520,'text-field':['coalesce',['get','name_en'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],14.2,10,18,12.5,21,14],'text-rotation-alignment':'map','text-allow-overlap':false,'text-ignore-placement':false,'text-padding':10},paint:{'text-color':'#a9c7d0','text-halo-color':'rgba(5,12,17,.96)','text-halo-width':1.8}},
  {id:'gta-bp-tree3d-trunk',type:'fill-extrusion',source:'bpLivingWorld3D',minzoom:15.5,filter:['==',['get','part'],'tree_trunk'],paint:{'fill-extrusion-color':'#5b412d','fill-extrusion-base':0,'fill-extrusion-height':['to-number',['get','top_m'],1],'fill-extrusion-opacity':.99,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-tree3d-canopy',type:'fill-extrusion',source:'bpLivingWorld3D',minzoom:15.5,filter:['==',['get','part'],'tree_canopy'],paint:{'fill-extrusion-color':['match',['get','leaf_cycle'],'evergreen','#285837','deciduous','#397344','#32673d'],'fill-extrusion-base':['to-number',['get','base_m'],0],'fill-extrusion-height':['to-number',['get','top_m'],1],'fill-extrusion-opacity':.96,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-streetlight3d-pole',type:'fill-extrusion',source:'bpLivingWorld3D',minzoom:16,filter:['==',['get','part'],'streetlight_pole'],paint:{'fill-extrusion-color':'#666d70','fill-extrusion-base':0,'fill-extrusion-height':['to-number',['get','top_m'],1],'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-streetlight3d-lamp',type:'fill-extrusion',source:'bpLivingWorld3D',minzoom:16,filter:['==',['get','part'],'streetlight_lamp'],paint:{'fill-extrusion-color':'#ffe8a8','fill-extrusion-base':['to-number',['get','base_m'],0],'fill-extrusion-height':['to-number',['get','top_m'],1],'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':false}},
  {id:'gta-bp-fountain3d-basin',type:'fill-extrusion',source:'bpLivingWorld3D',minzoom:15.5,filter:['==',['get','part'],'fountain_basin'],paint:{'fill-extrusion-color':'#8b8e89','fill-extrusion-base':0,'fill-extrusion-height':.42,'fill-extrusion-opacity':.98,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-fountain3d-water',type:'fill-extrusion',source:'bpLivingWorld3D',minzoom:15.5,filter:['==',['get','part'],'fountain_water'],paint:{'fill-extrusion-color':'#5dbbd2','fill-extrusion-base':.43,'fill-extrusion-height':.48,'fill-extrusion-opacity':.88,'fill-extrusion-vertical-gradient':false}},
  {id:'gta-bp-landmark3d-plinth',type:'fill-extrusion',source:'bpLivingWorld3D',minzoom:15.6,filter:['==',['get','part'],'landmark_plinth'],paint:{'fill-extrusion-color':'#817a6d','fill-extrusion-base':0,'fill-extrusion-height':['to-number',['get','top_m'],.8],'fill-extrusion-opacity':.99,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-landmark3d-body',type:'fill-extrusion',source:'bpLivingWorld3D',minzoom:15.6,filter:['==',['get','part'],'landmark_body'],paint:{'fill-extrusion-color':['match',['get','landmark_kind'],'statue','#8b816e','sculpture','#7b807d','memorial','#8d8678','monument','#8e887b','#807d75'],'fill-extrusion-base':['to-number',['get','base_m'],.8],'fill-extrusion-height':['to-number',['get','top_m'],4],'fill-extrusion-opacity':.99,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-sidewalk3d',type:'fill-extrusion',source:'bpLivingWorld3D',minzoom:15.7,filter:['==',['get','part'],'sidewalk'],paint:{'fill-extrusion-color':['match',['get','surface'],'brick','#9a6d58','paving_stones','#aaa08c','asphalt','#555957','concrete','#b9b5aa','#a6a39a'],'fill-extrusion-base':.015,'fill-extrusion-height':.13,'fill-extrusion-opacity':.98,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-shrub3d',type:'fill-extrusion',source:'bpLivingWorld3D',minzoom:15.7,filter:['==',['get','part'],'shrub'],paint:{'fill-extrusion-color':'#3f7041','fill-extrusion-base':0,'fill-extrusion-height':['to-number',['get','top_m'],1.2],'fill-extrusion-opacity':.95,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-hedge3d',type:'fill-extrusion',source:'bpLivingWorld3D',minzoom:15.7,filter:['==',['get','part'],'hedge'],paint:{'fill-extrusion-color':'#365f39','fill-extrusion-base':0,'fill-extrusion-height':['to-number',['get','top_m'],1.45],'fill-extrusion-opacity':.96,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-sidewalk-casing',type:'line',source:'bpLivingWorld',minzoom:14.5,filter:['any',['in',['get','class'],['literal',['footway','pedestrian','path','cycleway','steps','living_street']]],['==',['get','layer_key'],'SIDEWALKS_PARKING'],['==',['get','layer_key'],'SURFACE_MATERIAL_FINE']],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#343431','line-width':['interpolate',['linear'],['zoom'],14.5,1.2,17,3.8,20,8.5],'line-opacity':.95}},
  {id:'gta-bp-sidewalk',type:'line',source:'bpLivingWorld',minzoom:14.5,filter:['any',['in',['get','class'],['literal',['footway','pedestrian','path','cycleway','steps','living_street']]],['==',['get','layer_key'],'SIDEWALKS_PARKING'],['==',['get','layer_key'],'SURFACE_MATERIAL_FINE']],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['downcase',['to-string',['coalesce',['get','surface'],['get','subtype'],'']]],['concrete','paved'],'#b9b5aa','paving_stones','#aa9f8c','asphalt','#696d6b',['gravel','fine_gravel','compacted'],'#9c927c',['dirt','ground','unpaved'],'#816d50','brick','#9a6d58','wood','#765e46','grass','#698155','#99978e'],'line-width':['interpolate',['linear'],['zoom'],14.5,.6,17,2.5,20,6.2],'line-opacity':.98}},
  {id:'gta-bp-pools',type:'fill',source:'bpLivingWorld',minzoom:15,filter:['==',['get','layer_key'],'POOLS_PROPERTY_WATER'],paint:{'fill-color':'#328fbd','fill-opacity':.88,'fill-outline-color':'#a7ddec'}},
  {id:'gta-bp-barriers',type:'line',source:'bpLivingWorld',minzoom:15,filter:['==',['get','layer_key'],'BARRIERS_WALLS_FENCES'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['downcase',['to-string',['coalesce',['get','class'],'']]],'wall','#8f8270','retaining_wall','#80786b','gate','#a79b83','bollard','#b2a98f','fence','#77766d','#77766d'],'line-width':['interpolate',['linear'],['zoom'],15,.65,18,1.6,20,2.5],'line-opacity':.9}},
  {id:'gta-bp-property-improvements',type:'fill-extrusion',source:'bpLivingWorld',minzoom:15.2,filter:['==',['get','layer_key'],'PROPERTY_IMPROVEMENTS_FINE'],paint:{'fill-extrusion-color':['match',['downcase',['to-string',['coalesce',['get','class'],'']]],'greenhouse','#7b9b8c',['shed','garage','carport'],'#716b60','barn','#765b49',['silo','storage_tank','water_tower'],'#7b8280','chimney','#6b625b','#706d63'],'fill-extrusion-height':['coalesce',['to-number',['get','height_m']],['match',['downcase',['to-string',['coalesce',['get','class'],'']]],'greenhouse',3,'shed',2.8,'garage',3.2,'carport',2.7,'barn',7,'silo',12,'storage_tank',8,'water_tower',18,'chimney',8,3]],'fill-extrusion-opacity':.94,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-rooftop-solar',type:'fill',source:'bpLivingWorld',minzoom:16.5,filter:['==',['get','layer_key'],'ROOFTOP_SOLAR_DETAIL'],paint:{'fill-color':'#244c68','fill-opacity':.95,'fill-outline-color':'#759ab1'}},
  {id:'gta-bp-rocks',type:'circle',source:'bpLivingWorld',minzoom:15.5,filter:['==',['get','layer_key'],'ROCKS_BOULDERS_CLIFFS'],paint:{'circle-radius':['interpolate',['linear'],['zoom'],15.5,2.2,19,5.5],'circle-color':'#716e64','circle-stroke-color':'#9c988a','circle-stroke-width':.8,'circle-opacity':.95}},
  {id:'gta-bp-tree-trunks',type:'circle',source:'bpLivingWorld',minzoom:16,filter:['==',['get','layer_key'],'TREE_OBJECTS_3D'],paint:{'circle-radius':['interpolate',['linear'],['zoom'],16,1,20,2.4],'circle-color':'#614a33','circle-opacity':.95}},
  {id:'gta-bp-tree-crowns',type:'circle',source:'bpLivingWorld',minzoom:16,filter:['==',['get','layer_key'],'TREE_OBJECTS_3D'],paint:{'circle-radius':['interpolate',['linear'],['zoom'],16,3,18,6,20,10],'circle-color':['interpolate',['linear'],['coalesce',['to-number',['get','height_m']],8],2,'#668c4d',8,'#47743f',20,'#315f37',35,'#294f31'],'circle-stroke-color':'#24472c','circle-stroke-width':1,'circle-opacity':.9,'circle-blur':.05}},
  {id:'gta-bp-infra-points',type:'circle',source:'bpLivingWorld',minzoom:16,filter:['all',['in',['get','layer_key'],['literal',['STREETLIGHTS_SIGNALS','BASE_INFRASTRUCTURE']]],['!=',['get','asset_kind'],'transit_stop']],paint:{'circle-radius':['interpolate',['linear'],['zoom'],16,1.8,20,3.5],'circle-color':['match',['get','asset_kind'],'streetlight','#ffe6a3','signal','#ffce4d','#b6aa7f'],'circle-stroke-color':'#222a2a','circle-stroke-width':1,'circle-opacity':.94}},
  {id:'gta-bp-transit-stops',type:'symbol',source:'bpLivingWorld',minzoom:15,filter:['==',['get','asset_kind'],'transit_stop'],layout:{'icon-image':'bp-transit-stop','icon-size':['interpolate',['linear'],['zoom'],15,.5,19,.86],'icon-anchor':'bottom','icon-allow-overlap':false,'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],15,9,19,12],'text-variable-anchor':['top','left','right'],'text-radial-offset':1,'text-optional':true},paint:{'text-color':'#dff6f7','text-halo-color':'rgba(5,12,17,.96)','text-halo-width':2}},
  {id:'gta-bp-landmarks',type:'symbol',source:'bpLivingWorld',minzoom:15,filter:['==',['get','layer_key'],'LANDMARK_OBJECTS_FINE'],layout:{'icon-image':['case',['==',['downcase',['to-string',['coalesce',['get','class'],'']]],'fountain'],'bp-landmark-fountain',['in',['downcase',['to-string',['coalesce',['get','subtype'],'']]],['literal',['statue','sculpture','artwork']]],'bp-landmark-statue','bp-landmark-monument'],'icon-size':['interpolate',['linear'],['zoom'],15,.65,19,1.05],'icon-anchor':'bottom','icon-allow-overlap':false,'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],15,9.5,19,13],'text-variable-anchor':['top','left','right'],'text-radial-offset':1,'text-optional':true},paint:{'text-color':'#e4ddca','text-halo-color':'rgba(8,11,11,.96)','text-halo-width':2}},
  {id:'gta-transit-stops',type:'symbol',source:'ofm','source-layer':'poi',minzoom:15,filter:['any',['in',['downcase',['to-string',['coalesce',['get','class'],'']]],['literal',['bus','bus_stop','station','transit']]],['in',['downcase',['to-string',['coalesce',['get','subclass'],'']]],['literal',['bus_stop','bus_station','tram_stop','station']]]],layout:{'icon-image':'bp-transit-stop','icon-size':['interpolate',['linear'],['zoom'],15,.48,18,.72,20,.9],'icon-anchor':'bottom','icon-allow-overlap':false,'text-field':['coalesce',['get','name_en'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],15,9,19,12],'text-variable-anchor':['top','left','right'],'text-radial-offset':1,'text-optional':true},paint:{'text-color':'#dff6f7','text-halo-color':'rgba(5,12,17,.96)','text-halo-width':2}},
  {id:'gta-poi-probe',type:'circle',source:'ofm','source-layer':'poi',minzoom:12.5,paint:{'circle-radius':3,'circle-color':'#ffffff','circle-opacity':.001,'circle-stroke-opacity':0}},
  {id:'gta-landmark-monuments',type:'symbol',source:'ofm','source-layer':'poi',minzoom:14,filter:['any',['in',['get','class'],['literal',['monument','memorial','attraction','artwork']]],['in',['get','subclass'],['literal',['monument','memorial','statue','sculpture','artwork','fountain']]]],layout:{'icon-image':['case',['in',['get','subclass'],['literal',['fountain']]],'bp-landmark-fountain',['in',['get','subclass'],['literal',['statue','sculpture','artwork']]],'bp-landmark-statue','bp-landmark-monument'],'icon-size':['interpolate',['linear'],['zoom'],14,.62,18,.9,20,1.1],'icon-anchor':'bottom','icon-allow-overlap':false,'text-field':['coalesce',['get','name_en'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],14,9.5,18,12.5,20,14],'text-variable-anchor':['top','left','right'],'text-radial-offset':1.1,'text-optional':true},paint:{'text-color':'#e6dfcd','text-halo-color':'rgba(10,12,12,.96)','text-halo-width':2}},
  {id:'gta-poi-label',type:'symbol',source:'bpSemanticLabels',minzoom:13.4,layout:{'icon-image':['get','icon_id'],'icon-size':['interpolate',['linear'],['zoom'],13.4,.62,17,.82,20,1],'icon-anchor':'bottom','icon-allow-overlap':false,'icon-ignore-placement':false,'icon-padding':10,'text-field':['get','display_label'],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],13.4,10,17,11.5,20,13],'text-variable-anchor':['top','bottom','left','right'],'text-radial-offset':1.1,'text-justify':'auto','text-optional':true,'text-allow-overlap':false,'text-ignore-placement':false,'text-padding':11,'symbol-sort-key':['coalesce',['get','priority'],9]},paint:{'text-color':['coalesce',['get','label_color'],'#e8f8fc'],'text-halo-color':'rgba(4,11,16,.97)','text-halo-width':2,'text-halo-blur':.4}},
  {id:'gta-opportunity-label',type:'symbol',source:'bpOpportunities',minzoom:12.8,layout:{'icon-image':['match',['get','icon_key'],'ROOF','bp-opp-roof','STORM','bp-opp-storm','FIRE','bp-opp-fire','WATER','bp-opp-water','SOLAR','bp-opp-solar','DEVELOPMENT','bp-opp-development','INVESTMENT','bp-opp-investment','COMPLIANCE','bp-opp-compliance','bp-opp-general'],'icon-size':['interpolate',['linear'],['zoom'],12.8,.7,17,.9,20,1.05],'icon-anchor':'bottom','icon-offset':[0,-.35],'icon-allow-overlap':false,'icon-ignore-placement':false,'icon-padding':12,'text-field':['get','label'],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],13.8,10,17,11.5,20,13],'text-variable-anchor':['top','left','right','bottom'],'text-radial-offset':1.25,'text-optional':true,'text-allow-overlap':false,'text-ignore-placement':false,'text-padding':12,'symbol-sort-key':['-',0,['coalesce',['get','opportunity_count'],1]]},paint:{'text-color':['coalesce',['get','color'],'#7adcf0'],'text-halo-color':'rgba(3,9,14,.98)','text-halo-width':2.2,'text-halo-blur':.4}},
  {id:'gta-selected-body',type:'fill-extrusion',source:'selected',minzoom:11,paint:{'fill-extrusion-color':'#00fff0','fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],10]],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','base_height_m']],0]],'fill-extrusion-opacity':.28}},
  {id:'gta-selected-glow',type:'line',source:'selected',minzoom:11,paint:{'line-color':'#00fff0','line-width':8,'line-opacity':.34,'line-blur':4}},
  {id:'gta-selected-outline',type:'line',source:'selected',minzoom:11,paint:{'line-color':'#b9ffff','line-width':3,'line-opacity':1}}
 ]
}};


function bpIconImage(id){
 const size=48,c=document.createElement('canvas');c.width=size;c.height=size;const x=c.getContext('2d');
 const opp=id.startsWith('bp-opp-'),key=id.replace(/^bp-(?:opp|poi)-/,'');
 const colors={roof:'#f2c94c',storm:'#9b7cff',fire:'#ff6b4a',water:'#4aa3ff',solar:'#ffd65a',development:'#45d6e8',investment:'#56d58a',compliance:'#ff9f43',general:'#7adcf0',medical:'#62e6ff',school:'#8dd8ff',police:'#79a8ff',transit:'#78e3cf',food:'#ffc76d',shop:'#e3a6ff',park:'#72d68c',government:'#8fb2ff',library:'#82d7ff',hotel:'#ffb6d8',fuel:'#ffd36a',parking:'#91a8b5',worship:'#c5a8ff',airport:'#79d7ff'};
 const color=colors[key]||'#7adcf0';x.clearRect(0,0,size,size);x.fillStyle='rgba(4,11,16,.94)';x.strokeStyle=color;x.lineWidth=3;x.beginPath();x.arc(24,24,20,0,Math.PI*2);x.fill();x.stroke();x.strokeStyle=color;x.fillStyle=color;x.lineWidth=3;x.lineCap='round';x.lineJoin='round';
 const line=(a,b,c1,d)=>{x.beginPath();x.moveTo(a,b);x.lineTo(c1,d);x.stroke()};
 if(key==='medical'){x.fillRect(20,11,8,26);x.fillRect(11,20,26,8)}
 else if(key==='school'){line(11,20,24,13);line(24,13,37,20);line(14,21,14,34);line(34,21,34,34);line(14,34,34,34);line(19,26,29,26)}
 else if(key==='government'){x.strokeRect(12,19,24,16);line(10,19,24,10);line(24,10,38,19);for(const q of [16,24,32])line(q,21,q,33)}
 else if(key==='library'){x.strokeRect(12,13,24,23);line(24,13,24,36);line(15,18,21,18);line(27,18,33,18)}
 else if(key==='hotel'){x.strokeRect(11,14,26,22);line(11,24,37,24);line(17,14,17,36);x.beginPath();x.arc(15,20,2,0,Math.PI*2);x.fill()}
 else if(key==='fuel'){x.strokeRect(13,12,16,24);x.strokeRect(16,16,10,7);line(29,17,35,20);line(35,20,35,35)}
 else if(key==='parking'){x.font='bold 25px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('P',24,25)}
 else if(key==='worship'){line(24,10,24,36);line(17,18,31,18);x.beginPath();x.arc(24,28,10,0,Math.PI*2);x.stroke()}
 else if(key==='airport'){line(24,9,24,39);line(24,20,37,14);line(24,20,11,14);line(24,31,32,35);line(24,31,16,35)}
 else if(key==='police'||key==='compliance'){x.beginPath();x.moveTo(24,10);x.lineTo(36,15);x.lineTo(33,31);x.lineTo(24,38);x.lineTo(15,31);x.lineTo(12,15);x.closePath();x.stroke();if(key==='compliance'){line(17,24,22,29);line(22,29,31,19)}}
 else if(key==='transit'){x.strokeRect(13,12,22,25);line(13,19,35,19);x.beginPath();x.arc(18,33,2.5,0,Math.PI*2);x.arc(30,33,2.5,0,Math.PI*2);x.fill()}
 else if(key==='food'){line(16,12,16,36);line(12,12,12,21);line(20,12,20,21);line(12,21,20,21);line(31,12,31,36);x.beginPath();x.arc(31,17,5,0,Math.PI*2);x.stroke()}
 else if(key==='shop'){x.strokeRect(14,19,20,17);line(17,19,19,13);line(19,13,29,13);line(29,13,31,19)}
 else if(key==='park'){line(24,17,24,36);x.beginPath();x.arc(24,18,9,0,Math.PI*2);x.stroke();x.beginPath();x.arc(18,23,6,0,Math.PI*2);x.stroke();x.beginPath();x.arc(30,23,6,0,Math.PI*2);x.stroke()}
 else if(key==='roof'){line(11,26,24,14);line(24,14,37,26);line(15,25,15,35);line(33,25,33,35);line(15,35,33,35)}
 else if(key==='storm'){x.beginPath();x.moveTo(28,9);x.lineTo(17,25);x.lineTo(24,25);x.lineTo(19,39);x.lineTo(33,21);x.lineTo(26,21);x.closePath();x.fill()}
 else if(key==='fire'){x.beginPath();x.moveTo(25,9);x.bezierCurveTo(31,17,36,22,34,30);x.bezierCurveTo(32,38,17,39,14,30);x.bezierCurveTo(12,23,20,19,22,13);x.bezierCurveTo(23,18,28,21,27,27);x.bezierCurveTo(31,23,30,16,25,9);x.fill()}
 else if(key==='water'){x.beginPath();x.moveTo(24,9);x.bezierCurveTo(17,20,13,24,15,31);x.bezierCurveTo(17,40,31,40,34,31);x.bezierCurveTo(36,24,30,18,24,9);x.fill()}
 else if(key==='solar'){x.beginPath();x.arc(24,24,7,0,Math.PI*2);x.fill();for(let a=0;a<8;a++){const q=a*Math.PI/4;line(24+11*Math.cos(q),24+11*Math.sin(q),24+17*Math.cos(q),24+17*Math.sin(q))}}
 else if(key==='development'){x.strokeRect(13,21,10,15);x.strokeRect(25,13,10,23);line(16,26,20,26);line(28,19,32,19);line(28,25,32,25)}
 else if(key==='investment'){line(13,34,35,12);line(26,12,35,12);line(35,12,35,21);line(13,34,20,34)}
 else {x.beginPath();x.moveTo(24,10);x.lineTo(38,24);x.lineTo(24,38);x.lineTo(10,24);x.closePath();x.stroke();if(opp){x.beginPath();x.arc(24,24,4,0,Math.PI*2);x.fill()}}
 return x.getImageData(0,0,size,size)
}
function installBridgePointIcons(map){
 const ids=['bp-poi-medical','bp-poi-school','bp-poi-fire','bp-poi-police','bp-poi-transit','bp-poi-food','bp-poi-shop','bp-poi-park','bp-poi-government','bp-poi-library','bp-poi-hotel','bp-poi-fuel','bp-poi-parking','bp-poi-worship','bp-poi-airport','bp-poi-general','bp-opp-roof','bp-opp-storm','bp-opp-fire','bp-opp-water','bp-opp-solar','bp-opp-development','bp-opp-investment','bp-opp-compliance','bp-opp-general'];
 const add=id=>{try{if(!map.hasImage(id))map.addImage(id,bpIconImage(id),{pixelRatio:2})}catch(e){console.warn('BridgePoint icon',id,e)}};
 map.on('styleimagemissing',e=>{if(String(e.id||'').startsWith('bp-'))add(e.id)});
 for(const id of ids)add(id)
}

function facadePatternImage(id){
 const size=96,cv=document.createElement('canvas');cv.width=size;cv.height=size;const x=cv.getContext('2d');
 const solid=id.includes('bpfacade-solid-'),raw=id.replace('bpfacade-solid-','').replace('bpfacade-',''),vm=raw.match(/-v(\d+)$/),variant=vm?Number(vm[1])%128:0,kind=raw.replace(/-v\d+$/,'');
 const specs={
  'res-cream':['#b3a48d','#5f5145','#ded0b5','#8d7d68','res'],
  'res-sage':['#87937a','#445548','#c4cbb2','#697760','res'],
  'res-blue':['#758897','#3e5260','#bdc9cf','#596d7b','res'],
  'res-tan':['#9b8569','#584b3e','#d7c4a2','#796a55','res'],
  'res-rose':['#956f67','#58433f','#d7b5aa','#74554f','res'],
  'res-white':['#aaa99f','#585d5c','#e5e2d7','#85857d','res'],
  'res-charcoal':['#626765','#343b3e','#9ba09b','#4b504f','res'],
  'row-cream':['#a48f75','#5c5148','#dec9a5','#806e59','row'],
  'row-red':['#86564b','#40353a','#c69a83','#68433c','row'],
  'row-brown':['#6f5448','#37363a','#ad8d75','#554237','row'],
  'brick-red':['#824f45','#3a3335','#bd8871','#653c35','brick'],
  'brick-brown':['#695047','#33363a','#a58470','#523d36','brick'],
  'brick-tan':['#93745d','#47413c','#c6aa86','#745a48','brick'],
  'brick-dark':['#544948','#2b3033','#8a7169','#413a3a','brick'],
  'brick-orange':['#9a6048','#493735','#cc8d68','#774937','brick'],
  'brick-cream':['#a18c70','#554c43','#d8c3a0','#7c6c56','brick'],
  'glass-blue':['#416b80','#1f3542','#94b8c6','#31586a','glass'],
  'glass-teal':['#3f7072','#223c40','#8eada8','#31595b','glass'],
  'glass-smoke':['#56646d','#29363e','#9ba8ad','#43515a','glass'],
  'glass-silver':['#77858a','#35454d','#c1c9c7','#5e6d72','glass'],
  'glass-green':['#55766f','#2a403d','#9fb1a8','#405e58','glass'],
  'glass-bronze':['#6f665a','#373939','#b7a98e','#554e46','glass'],
  'glass-ice':['#718c99','#354c57','#c1d8df','#58717d','glass'],
  'office-stone':['#817d71','#3e4344','#bdb7a4','#666258','office'],
  'office-beige':['#95856e','#484744','#cfbea0','#766954','office'],
  'office-white':['#999d99','#424b50','#d6d9d3','#767b78','office'],
  'office-charcoal':['#555d60','#242e34','#90999a','#41494c','office'],
  'office-sand':['#8d816d','#474642','#c6b79a','#706653','office'],
  'office-gray':['#707674','#343d40','#a9afaa','#575d5b','office'],
  'industrial-gray':['#676c6b','#343b3e','#9da2a0','#505554','industrial'],
  'industrial-blue':['#61747c','#32444c','#91a4a9','#4c5d64','industrial'],
  'industrial-tan':['#7d7363','#453f38','#aaa08d','#635b4e','industrial'],
  'industrial-white':['#8d918c','#4a4f4e','#c2c5bd','#6e716d','industrial'],
  'industrial-green':['#677361','#37433a','#9ca68f','#505b4b','industrial'],
  'industrial-rust':['#805f4e','#443936','#aa8068','#654a3d','industrial'],
  'barn-red':['#813a34','#482e2c','#c18b78','#672e2a','barn'],
  'barn-wood':['#765b42','#3f342b','#b99d76','#5d4835','barn'],
  'barn-white':['#aaa69a','#565650','#e2ddd0','#858177','barn'],
  'civic-limestone':['#9a9078','#504b43','#cec3a8','#7d735f','civic'],
  'civic-stone':['#7c7b73','#464948','#b5b2a7','#64645e','civic'],
  'civic-brick':['#7f594e','#41383a','#b88b76','#62443d','civic'],
  'civic-granite':['#73716b','#404445','#a8a49a','#5a5955','civic'],
  'medical-white':['#c7c9c3','#526269','#edf0ed','#9ba6a7','office'],
  'medical-brick':['#8b665a','#4d4240','#d0a99b','#705247','brick'],
  'medical-glass':['#71919b','#334b55','#c5d9de','#58737d','glass'],
  'fire-red':['#8b4036','#3d3230','#cc7861','#6b302a','industrial'],
  'fire-brick':['#7a5046','#393234','#b37b69','#604039','brick'],
  'fire-modern':['#777b78','#343d40','#b4b8b1','#5e625f','industrial'],
  'school-brick':['#876152','#41383a','#c39a84','#694a40','brick'],
  'school-stone':['#858178','#454746','#c1bbb0','#68645e','civic'],
  'school-modern':['#7b8583','#374448','#bbc5c0','#5f6a68','office'],
  'police-stone':['#727873','#3d4546','#afb2a9','#585e5a','civic'],
  'police-modern':['#68777d','#304149','#a7bac0','#506168','office'],
  'neutral-warm':['#75695d','#393a3a','#aaa08f','#5a5148','office'],
  'neutral-cool':['#637077','#303b41','#98a5a8','#4d5b61','office'],
  'neutral-dark':['#4f5555','#242c30','#858b88','#3d4343','office']
 };
 const p=specs[kind]||specs['neutral-cool'],mode=p[4];x.fillStyle=p[0];x.fillRect(0,0,size,size);
 if(solid)return x.getImageData(0,0,size,size);
 const win=(xx,yy,w,h,lit=false)=>{const dx=((variant*5+yy)%7)-3,dw=(variant%3)-1,dh=((variant>>1)%3)-1;xx=Math.max(1,Math.min(size-7,xx+dx));w=Math.max(6,Math.min(size-xx-1,w+dw));h=Math.max(7,h+dh);x.fillStyle=p[1];x.fillRect(xx,yy,w,h);x.fillStyle=p[2];x.globalAlpha=lit?.42:.24;x.fillRect(xx+1,yy+1,Math.max(1,w-2),Math.min(3,h-2));x.globalAlpha=1};
 if(mode==='brick'||mode==='row'){
  x.strokeStyle=p[3];x.lineWidth=1;x.globalAlpha=.55;
  for(let y=0;y<=size;y+=7){x.beginPath();x.moveTo(0,y+.5);x.lineTo(size,y+.5);x.stroke()}
  for(let y=0;y<size;y+=7)for(let xx=(Math.floor(y/7)%2)*6;xx<size;xx+=12){x.beginPath();x.moveTo(xx+.5,y);x.lineTo(xx+.5,y+7);x.stroke()}
  x.globalAlpha=1;
  const gap=mode==='row'?20:24;for(let y=11;y<size;y+=24)for(let xx=6;xx<size;xx+=gap)win(xx,y,mode==='row'?8:11,13,(xx+y)%3===0);
 } else if(mode==='glass'){
  x.strokeStyle=p[3];x.lineWidth=1;
  for(let y=0;y<size;y+=16)for(let xx=0;xx<size;xx+=16){x.fillStyle=((xx+y)/16)%4===0?p[2]:p[0];x.globalAlpha=.42;x.fillRect(xx+1,y+1,14,14);x.globalAlpha=1;x.strokeRect(xx+.5,y+.5,16,16)}
 } else if(mode==='industrial'){
  x.strokeStyle=p[3];x.globalAlpha=.55;for(let xx=0;xx<size;xx+=6+(variant%3)){x.beginPath();x.moveTo(xx+.5,0);x.lineTo(xx+.5,size);x.stroke()}x.globalAlpha=1;
  for(let xx=8+(variant%5);xx<size;xx+=24+(variant%4)){win(xx,15+(variant%4),13+(variant%3),8+(variant%3));win(xx,47-(variant%3),14,9)}x.fillStyle=p[3];const bay=18+(variant%5)*2;x.fillRect(6+(variant%4)*3,72,bay,24);x.fillRect(52-(variant%3)*2,69,24+(variant%4),27);
 } else if(mode==='barn'){
  x.strokeStyle=p[3];x.globalAlpha=.58;for(let xx=0;xx<size;xx+=5+(variant%3)){x.beginPath();x.moveTo(xx+.5,0);x.lineTo(xx+.5,size);x.stroke()}x.globalAlpha=1;
  const doorW=30+(variant%4)*4,doorX=Math.round((size-doorW)/2);x.fillStyle=p[1];x.fillRect(doorX,48,doorW,47);x.strokeStyle=p[2];x.lineWidth=2;x.strokeRect(doorX+1,49,doorW-2,45);x.beginPath();x.moveTo(doorX+2,50);x.lineTo(doorX+doorW-2,92);x.moveTo(doorX+doorW-2,50);x.lineTo(doorX+2,92);x.stroke();win(10+(variant%5),18,13,15);win(68-(variant%5),18,13,15);
 } else if(mode==='civic'){
  x.strokeStyle=p[3];x.globalAlpha=.5;for(let y=0;y<size;y+=20){x.beginPath();x.moveTo(0,y+.5);x.lineTo(size,y+.5);x.stroke()}for(let xx=0;xx<size;xx+=24){x.beginPath();x.moveTo(xx+.5,0);x.lineTo(xx+.5,size);x.stroke()}x.globalAlpha=1;
  for(let y=12;y<size;y+=30)for(let xx=8;xx<size;xx+=24)win(xx,y,10,16,true);
 } else {
  x.strokeStyle=p[3];x.globalAlpha=.35;for(let y=0;y<size;y+=12){x.beginPath();x.moveTo(0,y+.5);x.lineTo(size,y+.5);x.stroke()}x.globalAlpha=1;
  const rowShift=(variant%3)*2,rows=mode==='res'?[10+rowShift,37+rowShift,64+rowShift]:[10+rowShift,32+rowShift,54+rowShift,76+rowShift];for(const y of rows)for(let xx=5+(variant%4)*2;xx<size;xx+=18+(variant%5))win(xx,y,9+(variant%3),9+((variant>>1)%3),(xx+y+variant)%4===0);
  if(mode==='res'){x.strokeStyle=p[2];x.globalAlpha=.25;for(let y=24+(variant%3);y<size;y+=27+(variant%3)){x.beginPath();x.moveTo(0,y);x.lineTo(size,y);x.stroke()}x.globalAlpha=1}
 }
 if(mode==='res'||mode==='row'){const dw=10+(variant%4)*2,dx=6+((variant*17)%Math.max(8,size-dw-12));x.fillStyle=p[1];x.fillRect(dx,size-23,dw,22);x.fillStyle=p[2];x.globalAlpha=.32;x.fillRect(dx+2,size-21,Math.max(2,dw-4),4);x.globalAlpha=1}
 else if(mode==='office'){const ew=20+(variant%5)*3,ex=Math.max(3,Math.round((size-ew)/2)+((variant%3)-1)*8);x.fillStyle=p[1];x.fillRect(ex,size-19,Math.min(ew,size-ex-3),18);x.fillStyle=p[2];x.globalAlpha=.3;x.fillRect(ex+2,size-17,Math.max(4,Math.min(ew,size-ex-3)-4),5);x.globalAlpha=1}
 x.strokeStyle=p[3];x.globalAlpha=.62;x.strokeRect(.5,.5,size-1,size-1);x.globalAlpha=1;
 return x.getImageData(0,0,size,size)
}
function nightWindowPatternImage(id){
 const size=64,cv=document.createElement('canvas');cv.width=size;cv.height=size;const x=cv.getContext('2d');x.clearRect(0,0,size,size);
 const kind=id.replace('bp-window-night-',''),warm='#ffd98a',cool='#b9dfff',white='#f0e7c9';
 for(let y=8;y<size;y+=14)for(let xx=6;xx<size;xx+=14){
  const n=((xx*13+y*7)+(kind==='cool'?5:kind==='mixed'?11:2))%9;if(n<4)continue;
  x.fillStyle=kind==='warm'?warm:kind==='cool'?cool:(n%2?warm:cool);x.globalAlpha=.48+((n%3)*.14);x.fillRect(xx,y,7,7);
  if(n===8){x.fillStyle=white;x.globalAlpha=.82;x.fillRect(xx+1,y+1,5,2)}
 }
 x.globalAlpha=1;return x.getImageData(0,0,size,size)
}
function roofPatternImage(id){
 const size=64,cv=document.createElement('canvas');cv.width=size;cv.height=size;const x=cv.getContext('2d'),kind=id.replace('bproof-','');
 const specs={
  'roof-membrane-dark':['#4d4e4b','#3c3e3d','membrane'],
  'roof-membrane-light':['#777872','#5c5e5a','membrane'],
  'roof-gravel':['#777064','#5b574f','gravel'],
  'roof-shingle-gray':['#666966','#4b4f4d','shingle'],
  'roof-shingle-brown':['#705b4d','#57463c','shingle'],
  'roof-metal-dark':['#586265','#414a4d','metal'],
  'roof-metal-silver':['#818c8e','#606a6d','metal'],
  'roof-tile-red':['#895646','#6d4034','tile'],
  'roof-tile-brown':['#775845','#5f4638','tile'],
  'roof-slate':['#52616a','#3d4b53','slate']
 };
 const p=specs[kind]||specs['roof-membrane-dark'];x.fillStyle=p[0];x.fillRect(0,0,size,size);x.strokeStyle=p[1];x.globalAlpha=.55;
 if(p[2]==='metal'){for(let xx=2;xx<size;xx+=7){x.beginPath();x.moveTo(xx,0);x.lineTo(xx,size);x.stroke()}}
 else if(p[2]==='tile'||p[2]==='shingle'||p[2]==='slate'){for(let y=4;y<size;y+=8){x.beginPath();x.moveTo(0,y);x.lineTo(size,y);x.stroke()}for(let y=4;y<size;y+=8)for(let xx=((y/8)%2)*6;xx<size;xx+=12){x.beginPath();x.moveTo(xx,y-8);x.lineTo(xx,y);x.stroke()}}
 else if(p[2]==='gravel'){x.fillStyle=p[1];for(let i=0;i<90;i++)x.fillRect((i*17)%size,(i*31)%size,1,1)}
 else {for(let y=8;y<size;y+=16){x.beginPath();x.moveTo(0,y);x.lineTo(size,y);x.stroke()}}
 x.globalAlpha=1;return x.getImageData(0,0,size,size)
}
function floorLinePatternImage(){
 const size=64,cv=document.createElement('canvas');cv.width=size;cv.height=size;const x=cv.getContext('2d');x.clearRect(0,0,size,size);
 x.strokeStyle='rgba(35,43,46,.88)';x.lineWidth=2;
 for(let y=15;y<size;y+=16){x.beginPath();x.moveTo(0,y+.5);x.lineTo(size,y+.5);x.stroke()}
 x.strokeStyle='rgba(203,219,220,.14)';x.lineWidth=1;
 for(let y=16;y<size;y+=16){x.beginPath();x.moveTo(0,y+.5);x.lineTo(size,y+.5);x.stroke()}
 return x.getImageData(0,0,size,size)
}
function installBuildingMaterials(map){
 const facadeKinds=['res-cream','res-sage','res-blue','res-tan','res-rose','res-white','res-charcoal','row-red','row-brown','row-cream','brick-red','brick-brown','brick-tan','brick-dark','brick-orange','brick-cream','glass-blue','glass-teal','glass-smoke','glass-silver','glass-green','glass-bronze','glass-ice','office-stone','office-beige','office-white','office-charcoal','office-sand','office-gray','industrial-gray','industrial-blue','industrial-tan','industrial-white','industrial-green','industrial-rust','barn-red','barn-wood','barn-white','civic-limestone','civic-stone','civic-brick','civic-granite','medical-white','medical-brick','medical-glass','fire-red','fire-brick','fire-modern','school-brick','school-stone','school-modern','police-stone','police-modern','neutral-warm','neutral-cool','neutral-dark'];
 const roofKinds=['roof-membrane-dark','roof-membrane-light','roof-gravel','roof-shingle-gray','roof-shingle-brown','roof-metal-dark','roof-metal-silver','roof-tile-red','roof-tile-brown','roof-slate'];
 const facadeIds=facadeKinds.flatMap(k=>['bpfacade-solid-'+k+'-v0','bpfacade-'+k+'-v0']),roofIds=roofKinds.map(k=>'bproof-'+k),windowIds=['bp-window-night-warm','bp-window-night-cool','bp-window-night-mixed'],floorIds=['bp-floor-lines'];
 const add=id=>{try{if(map.hasImage(id))return;if(id==='bp-floor-lines')map.addImage(id,floorLinePatternImage(),{pixelRatio:2});else if(id.startsWith('bproof-'))map.addImage(id,roofPatternImage(id),{pixelRatio:2});else if(id.startsWith('bp-window-night-'))map.addImage(id,nightWindowPatternImage(id),{pixelRatio:2});else map.addImage(id,facadePatternImage(id),{pixelRatio:2})}catch(e){console.warn('BridgePoint building material',id,e)}};
 map.on('styleimagemissing',e=>{const id=String(e.id||'');if(id==='bp-floor-lines'||id.startsWith('bpfacade-')||id.startsWith('bproof-')||id.startsWith('bp-window-night-'))add(id)});
 for(const id of [...facadeIds,...roofIds,...windowIds,...floorIds])add(id);
 window.__BP_BUILDING_MATERIALS__={version:'v5365',mode:'grey-3d-detail',simpleGreyGeometry:true,legacyPersistentGlobalShell:true,floorLines:true,facadeTextures:false,roofOverlays:true,exactRoofs:true,buildingParts:false,nightWindows:false,exactWorldOverlay:true,updatedAt:Date.now()}
}

function surfacePatternImage(id){
 const size=64,c=document.createElement('canvas');c.width=size;c.height=size;const x=c.getContext('2d'),kind=id.replace('bpterrain-','');
 const pal={forest:['#214d32','#173c28','#345d3a'],grass:['#55753e','#446532','#6d844d'],farm:['#756a43','#665b38','#897a50'],wetland:['#486b61','#35564f','#6f8170'],sand:['#b79c68','#a48655','#ccb17a'],desert:['#9d7a4b','#88633b','#b48d58'],rock:['#66655c','#51524d','#7a776c'],scrub:['#5e673e','#4b5732','#72784c'],glacier:['#7f9dac','#587989','#a8bec5'],neutral:['#3a403b','#303631','#464b45']};
 const p=pal[kind]||pal.neutral;x.fillStyle=p[0];x.fillRect(0,0,size,size);
 if(kind==='forest'){for(let y=4;y<64;y+=9)for(let xx=((y/9)%2)*5;xx<64;xx+=10){x.fillStyle=((xx+y)%3)?p[1]:p[2];x.beginPath();x.arc(xx,y,2.2,0,Math.PI*2);x.fill()}}
 else if(kind==='grass'||kind==='scrub'){x.strokeStyle=p[2];x.globalAlpha=.42;for(let i=0;i<70;i++){const xx=(i*17)%64,y=(i*29)%64;x.beginPath();x.moveTo(xx,y+3);x.lineTo(xx+1,y);x.stroke()}x.globalAlpha=1}
 else if(kind==='farm'){x.strokeStyle=p[1];x.globalAlpha=.55;for(let y=2;y<64;y+=7){x.beginPath();x.moveTo(0,y);x.lineTo(64,y+8);x.stroke()}x.globalAlpha=1}
 else if(kind==='wetland'){x.strokeStyle=p[2];x.globalAlpha=.45;for(let y=6;y<64;y+=12){x.beginPath();x.moveTo(0,y);x.bezierCurveTo(14,y-3,28,y+3,42,y);x.bezierCurveTo(50,y-2,57,y+2,64,y);x.stroke()}x.globalAlpha=1}
 else if(kind==='sand'||kind==='desert'){x.fillStyle=p[2];x.globalAlpha=.3;for(let i=0;i<80;i++){x.fillRect((i*23)%64,(i*37)%64,1,1)}x.globalAlpha=1}
 else if(kind==='glacier'){x.strokeStyle=p[1];x.lineWidth=1.2;x.globalAlpha=.52;for(let i=0;i<34;i++){const xx=(i*23)%64,y=(i*37)%64;x.beginPath();x.moveTo(xx,y);x.lineTo((xx+8+(i%7))%64,(y+15+(i%11))%64);x.stroke()}x.fillStyle=p[2];x.globalAlpha=.18;for(let i=0;i<24;i++)x.fillRect((i*17)%64,(i*29)%64,5,2);x.globalAlpha=1}
 else if(kind==='rock'){x.strokeStyle=p[2];x.globalAlpha=.36;for(let i=0;i<28;i++){const xx=(i*19)%64,y=(i*31)%64;x.strokeRect(xx,y,3+(i%4),2+(i%3))}x.globalAlpha=1}
 return x.getImageData(0,0,size,size)
}
function landmarkIconImage(kind){
 const size=56,c=document.createElement('canvas');c.width=size;c.height=size;const x=c.getContext('2d');x.clearRect(0,0,size,size);
 x.strokeStyle='#e4dcc5';x.fillStyle='#8f8268';x.lineWidth=2.2;x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=3;
 if(kind==='fountain'){x.strokeStyle='#bdebf4';x.fillStyle='#4f8fa2';x.lineWidth=2;x.beginPath();x.ellipse(28,39,19,6,0,0,Math.PI*2);x.fill();x.beginPath();x.moveTo(28,35);x.quadraticCurveTo(13,21,28,12);x.quadraticCurveTo(43,21,28,35);x.stroke();x.beginPath();x.moveTo(28,35);x.lineTo(28,16);x.stroke();x.fillStyle='#d8f5f7';x.beginPath();x.arc(28,14,2.6,0,Math.PI*2);x.fill()}
 else if(kind==='transit'){x.fillStyle='#2e6678';x.strokeStyle='#dff6f7';x.fillRect(11,15,34,25);x.strokeRect(11,15,34,25);x.fillStyle='#dff6f7';x.fillRect(17,20,10,7);x.fillRect(30,20,9,7);x.beginPath();x.arc(19,43,4,0,Math.PI*2);x.arc(37,43,4,0,Math.PI*2);x.fill()}
 else if(kind==='statue'){x.fillRect(19,38,18,6);x.fillRect(22,32,12,6);x.beginPath();x.arc(28,13,4,0,Math.PI*2);x.fill();x.beginPath();x.moveTo(25,17);x.lineTo(21,31);x.lineTo(26,31);x.lineTo(28,23);x.lineTo(31,31);x.lineTo(36,31);x.lineTo(31,17);x.closePath();x.fill()}
 else{x.fillRect(17,40,22,5);x.fillRect(21,34,14,6);x.beginPath();x.moveTo(28,9);x.lineTo(38,34);x.lineTo(18,34);x.closePath();x.fill();x.stroke()}
 return x.getImageData(0,0,size,size)
}
function installWorldMaterials(map){
 const terrain=['forest','grass','farm','wetland','sand','desert','rock','scrub','glacier','neutral'];
 const addTerrain=id=>{try{if(!map.hasImage(id))map.addImage(id,surfacePatternImage(id),{pixelRatio:2})}catch(e){console.warn('BridgePoint surface',id,e)}};
 for(const k of terrain)addTerrain('bpterrain-'+k);
 for(const [id,kind] of [['bp-landmark-monument','monument'],['bp-landmark-statue','statue'],['bp-landmark-fountain','fountain'],['bp-transit-stop','transit']]){try{if(!map.hasImage(id))map.addImage(id,landmarkIconImage(kind),{pixelRatio:2})}catch(e){console.warn('BridgePoint landmark',id,e)}}
 map.on('styleimagemissing',e=>{const id=String(e.id||'');if(id.startsWith('bpterrain-'))addTerrain(id)});
 window.__BP_WORLD_MATERIALS__={version:'v5370',biomes:true,glacierRelief:true,physicalRoads:true,blackYellowWhiteRoads:true,bridgeDecks:true,shorelineMotion:true,landmarks:true,updatedAt:Date.now()}
}

function roadLights(map){if(map.getZoom()<LIGHT_MIN)return EMPTY;let fs=[];try{fs=map.queryRenderedFeatures({layers:['gta-road-major','gta-road-local']})||[]}catch(_){return EMPTY}const pts=[],seen=new Set(),max=MOBILE?260:(TIER==='LOW'?320:TIER==='HIGH'?900:560);for(const f of fs){const g=f.geometry,lines=g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];for(const line of lines){const step=Math.max(4,Math.ceil(line.length/(MOBILE?6:10)));for(let i=0;i<line.length&&pts.length<max;i+=step){const c=line[i],k=`${c[0].toFixed(5)}|${c[1].toFixed(5)}`;if(seen.has(k))continue;seen.add(k);pts.push({type:'Feature',properties:{kind:'streetlight'},geometry:{type:'Point',coordinates:c}})}}}return fc(pts)}


function bpLandmarkOffset(coord,eastM,northM){const lat=coord[1]*Math.PI/180,ml=111320*Math.max(.12,Math.cos(lat));return[coord[0]+eastM/ml,coord[1]+northM/110540]}
function bpLandmarkCircle(coord,r,n=18){const ring=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,p=bpLandmarkOffset(coord,Math.cos(a)*r,Math.sin(a)*r);ring.push(p)}ring.push(ring[0]);return[ring]}
function statueOfLibertyGeoJSON(){
 const c=[-74.0445004,40.6892494],features=[],add=(coord,r,base,top,color,part,n=18)=>features.push({type:'Feature',properties:{part,color,base_m:base,top_m:top,truth:'PUBLIC_LANDMARK_POSITION_MODELED_3D'},geometry:{type:'Polygon',coordinates:bpLandmarkCircle(coord,r,n)}});
 add(c,10.8,0,8,'#8b8171','fort_base',24);
 add(c,8.4,8,28,'#b8aa91','granite_pedestal_lower',20);
 add(c,6.1,28,47,'#c3b79e','granite_pedestal_upper',20);
 add(c,5.0,47,64,'#5f9d88','copper_robe_lower',20);
 add(c,3.8,64,78,'#65a58f','copper_robe_upper',18);
 add(c,2.1,78,85.5,'#6aac96','head',18);
 add(c,2.65,85.5,87.2,'#6aac96','crown_band',20);
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2,p=bpLandmarkOffset(c,Math.cos(a)*2.6,Math.sin(a)*2.6);add(p,.24,87.2,91.2,'#72b39c','crown_ray',8)}
 const arm=bpLandmarkOffset(c,3.2,.8);add(arm,.72,69,91,'#69a991','torch_arm',12);
 const torch=bpLandmarkOffset(c,3.7,1.0);add(torch,.95,90.4,93.4,'#d7b34a','torch_flame',12);
 return{type:'FeatureCollection',features}
}
function installStatueOfLiberty(map){
 try{
  if(!map.getSource('bpStatueLiberty'))map.addSource('bpStatueLiberty',{type:'geojson',data:statueOfLibertyGeoJSON()});
  if(!map.getLayer('bp-statue-liberty-3d'))map.addLayer({id:'bp-statue-liberty-3d',type:'fill-extrusion',source:'bpStatueLiberty',minzoom:8.6,paint:{'fill-extrusion-color':['get','color'],'fill-extrusion-base':['to-number',['get','base_m'],0],'fill-extrusion-height':['to-number',['get','top_m'],1],'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],8.6,.76,11,.94,15,1],'fill-extrusion-vertical-gradient':true}});
  if(!map.getLayer('bp-statue-liberty-label'))map.addLayer({id:'bp-statue-liberty-label',type:'symbol',source:'bpStatueLiberty',minzoom:8.4,filter:['==',['get','part'],'copper_robe_lower'],layout:{'text-field':'Statue of Liberty','text-size':['interpolate',['linear'],['zoom'],8.4,10,12,13,16,15],'text-offset':[0,-1.2],'text-anchor':'bottom','text-allow-overlap':false},paint:{'text-color':'#d9f5ee','text-halo-color':'#071017','text-halo-width':1.4}});
  window.__BP_STATUE_OF_LIBERTY_STATE__={status:'ready',modeled3D:true,colored:true,sourcePosition:[-74.0445004,40.6892494],heightM:93.4,truth:'PUBLIC_LANDMARK_POSITION_MODELED_3D',version:5370,updatedAt:Date.now()}
 }catch(e){console.warn('BridgePoint Statue of Liberty',e);window.__BP_STATUE_OF_LIBERTY_STATE__={status:'error',error:String(e?.message||e),updatedAt:Date.now()}}
}

export function initWorld(options={}){
 const containerId=String(options.containerId||'liveMap'),globalKey=String(options.globalKey||'__bpWorldV2300'),container=document.getElementById(containerId);if(!container||!window.maplibregl)return null;if(window[globalKey]?.map)return window[globalKey];container.innerHTML='';
 const initialCenter=Array.isArray(options.center)&&options.center.length===2?options.center:[-98.5,39.5],initialZoom=Number.isFinite(options.zoom)?Number(options.zoom):(MOBILE?2.75:3.35),initialPitch=Number.isFinite(options.pitch)?Number(options.pitch):0,initialBearing=Number.isFinite(options.bearing)?Number(options.bearing):0,projectionType=String(options.projection||((MOBILE||options.preview)?'mercator':'globe'));
 const map=new maplibregl.Map({container,style:style(),center:initialCenter,zoom:initialZoom,pitch:initialPitch,bearing:initialBearing,minZoom:2.2,maxZoom:22,maxPitch:85,projection:{type:projectionType},pixelRatio:MOBILE?1:Math.min(window.devicePixelRatio||1,2),antialias:!MOBILE&&!LOW,fadeDuration:0,renderWorldCopies:false,transformRequest:tileTransform,maxTileCacheSize:MOBILE?48:(TIER==='LOW'?96:TIER==='HIGH'?240:160),refreshExpiredTiles:false,cancelPendingTileRequestsWhileZooming:MOBILE,crossSourceCollisions:!MOBILE,validateStyle:false});
 const runtimeMapErrors=[];map.on('error',e=>{const raw=e?.error||e,msg=String(raw?.message||raw||'MapLibre runtime error');runtimeMapErrors.push({message:msg,at:Date.now()});if(runtimeMapErrors.length>30)runtimeMapErrors.shift();window.__BP_MAP_RUNTIME_ERRORS__=runtimeMapErrors;console.warn('BridgePoint MapLibre',msg)});
 try{map.touchZoomRotate?.enable();map.touchZoomRotate?.enableRotation?.();map.touchPitch?.enable?.();map.dragPan?.enable();map.dragRotate?.enable?.();map.scrollZoom?.enable();map.doubleClickZoom?.enable();map.keyboard?.enable();map.boxZoom?.enable()}catch(_){};
 map.addControl(new maplibregl.NavigationControl({visualizePitch:true,showCompass:true}),'top-right');
 let detailSeq=0,livingSeq=0,detailTimer=0,lightTimer=0,solarTimer=0,waterTimer=0,road3dTimer=0,autoCameraTimer=0,lodWatchTimer=0,lodWatchSig='',lodWatchStable=0,autoCameraApplying=false,streetFxRaf=0,streetFxLastConditionAt=0,streetFxCondition=null,parcelPulseTimer=0,parcelPulsePhase=0,hoverFrame=0,exactCount=0,livingCount=0,base='gta',moving=false,terrainOn=false,walkMode=false,workerReq=0,lastTouchBuildingAt=0,lastBuildingClickAt=0,touchPointer=null,touchNative=null,buildingSelectHandler=null,activeTouchPointers=new Set(),lastExactFetchAt=0,lastLivingFetchAt=0,buildingShellQuietUntil=0,streetPhotoState={sequenceId:null,frames:[],index:-1,loadedCenter:null,loading:false},layerState={parcels:false,buildings:true};const worker=new Worker('./world-v2300-worker.js?v=5312',{type:'module'}),workerWait=new Map();
 worker.onmessage=e=>{const m=e.data||{},r=workerWait.get(m.requestId);if(r){workerWait.delete(m.requestId);r(m)}};
 const prepare=(features,max)=>new Promise(resolve=>{const requestId=++workerReq;workerWait.set(requestId,resolve);worker.postMessage({type:'prepare',requestId,features,max});setTimeout(()=>{if(workerWait.has(requestId)){workerWait.delete(requestId);resolve({buildings:fc(features.slice(0,max)),roofs:EMPTY,count:Math.min(features.length,max)})}},2500)});
 const setStatus=t=>{const e=document.getElementById('mapStatus');if(e)e.textContent=t};
 function solarPosition(date,lat,lng){
  const rad=Math.PI/180,dayMs=86400000,jd=date.getTime()/dayMs+2440587.5,n=jd-2451545.0,L=(280.46+.9856474*n)%360,g=(357.528+.9856003*n)%360,lambda=(L+1.915*Math.sin(g*rad)+.02*Math.sin(2*g*rad))*rad,eps=(23.439-.0000004*n)*rad;
  const ra=Math.atan2(Math.cos(eps)*Math.sin(lambda),Math.cos(lambda)),dec=Math.asin(Math.sin(eps)*Math.sin(lambda));
  const gmst=(280.46061837+360.98564736629*(jd-2451545.0))%360,ha=((gmst+lng)*rad-ra),phi=lat*rad;
  const alt=Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(ha)),az=Math.atan2(-Math.sin(ha),Math.tan(dec)*Math.cos(phi)-Math.sin(phi)*Math.cos(ha));
  return{alt:alt/rad,az:(az/rad+360)%360}
 }
 function updateWorldLight(){
  if(moving)return;
  try{
   const center=map.getCenter(),sun=solarPosition(new Date(),center.lat,center.lng),alt=sun.alt,day=clamp((alt+8)/28,0,1),night=1-day,twilight=alt<8&&alt>-12;
   const intensity=alt>18?.78:alt>2?.58:alt>-8?.34:.20,color=alt>10?'#fff3d7':alt>-6?'#f0b083':'#9fb7d8',skyColor=alt>8?'#4a7f9a':alt>-6?'#263f55':'#07121f',horizon=alt>8?'#9fb5b2':alt>-6?'#6f4b49':'#182a3d',fog=alt>8?'#83959a':alt>-6?'#514c52':'#263443';
   map.setLight({anchor:'map',color,intensity,position:[1.35,sun.az,clamp(90-alt,18,84)]});
   map.setSky({'sky-color':skyColor,'horizon-color':horizon,'fog-color':fog,'sky-horizon-blend':.2,'horizon-fog-blend':.06,'fog-ground-blend':.025,'atmosphere-blend':['interpolate',['linear'],['zoom'],0,.62,5,.36,9,.09,12,0]});
   paint(map,'gta-streetlights-glow','circle-opacity',night?['interpolate',['linear'],['zoom'],LIGHT_MIN,.38,18,.68,21,.88]:['interpolate',['linear'],['zoom'],LIGHT_MIN,.02,18,.05,21,.08]);
   paint(map,'gta-streetlights','circle-opacity',night?['interpolate',['linear'],['zoom'],LIGHT_MIN,.58,18,.94,21,1]:['interpolate',['linear'],['zoom'],LIGHT_MIN,.03,18,.08,21,.12]);
   paint(map,'gta-water','fill-color',alt>4?['interpolate',['linear'],['zoom'],2,'#0a3550',10,'#123f58',17,'#174e63']:['interpolate',['linear'],['zoom'],2,'#061521',10,'#0b2330',17,'#10303e']);
   paint(map,'gta-hillshade','hillshade-highlight-color',alt>0?'#d6d2bb':'#6e7f8f');
   paint(map,'gta-hillshade','hillshade-shadow-color',alt>0?'#11130f':'#02070d');
   const shadowLen=alt>2?clamp(34/Math.tan(Math.max(4,alt)*Math.PI/180),3,38):4,shadowRad=(sun.az+180)*Math.PI/180,shadowTranslate=[Math.sin(shadowRad)*shadowLen,-Math.cos(shadowRad)*shadowLen],shadowOpacity=alt>2?clamp(.34-(alt/240),.12,.3):.05;
   for(const id of ['gta-context-building-shadow','gta-bp-building-shadow','gta-exact-building-shadow']){paint(map,id,'fill-translate',shadowTranslate);paint(map,id,'fill-opacity',shadowOpacity)}
   for(const id of ['gta-context-buildings','gta-bp-buildings','gta-exact-building'])paint(map,id,'fill-extrusion-opacity',alt>0?['interpolate',['linear'],['zoom'],11.4,.9,13,.96,15,.995,18,1]:['interpolate',['linear'],['zoom'],11.4,.94,13,.98,15,1]);
   const windowOpacity=alt>2?(map.getZoom()>=16.8?.12:0):clamp((-alt+2)/16,.08,.72);for(const id of ['gta-context-night-windows','gta-bp-night-windows','gta-exact-night-windows'])paint(map,id,'fill-extrusion-opacity',windowOpacity);
   window.__BP_WORLD_LIGHT__={version:5370,sunAltitude:alt,sunAzimuth:sun.az,daylight:day,night:night>0.55,twilight,moonlight:night>0.45,updatedAt:Date.now()}
  }catch(e){console.warn('BridgePoint world light',e)}
 }
 function sky(){updateWorldLight();clearInterval(solarTimer);solarTimer=setInterval(updateWorldLight,60000)}
 function terrain(){const z=map.getZoom(),should=z>=6.5&&z<15.25,ex=z>=14.5?.28:z>=13.2?.58:(LOW?.9:TIER==='HIGH'?1.08:1);try{if(should){map.setTerrain({source:'dem',exaggeration:ex});terrainOn=true}else if(terrainOn){map.setTerrain(null);terrainOn=false}vis(map,'gta-hillshade',z<15.25);vis(map,'gta-landcover-texture',z<15.75);window.__BP_TERRAIN_VISUAL_STATE__={zoom:z,enabled:should,exaggeration:should?ex:0,streetLevelClamped:z>=15.25,coastRoadCliffProtection:true,streetHillshadeDeferred:z>=15.25,streetTextureDeferred:z>=15.75,updatedAt:Date.now()}}catch(_){terrainOn=false}}
 function applyAutoCamera(){window.__BP_AUTO_CAMERA__={enabled:false,singleView:true,mode:'FREE_FLY',maxPitch:85,zoom:map.getZoom(),pitch:map.getPitch(),updatedAt:Date.now()};return false}
 function setBase(next){base=next==='satellite'?'satellite':'gta';const sat=base==='satellite';vis(map,'gta-nasa',sat);vis(map,'gta-usgs',sat);paint(map,'gta-landcover','fill-opacity',sat?['interpolate',['linear'],['zoom'],2,.22,8,.12,12,.035,15,0]:['interpolate',['linear'],['zoom'],2,.58,8,.75,13,.84]);paint(map,'gta-landuse','fill-opacity',sat?.06:.72);document.querySelectorAll('[data-base]').forEach(b=>b.classList.toggle('active',b.dataset.base===base));map.triggerRepaint()}
 function metersLon(lat){return 111320*Math.max(.12,Math.cos(lat*Math.PI/180))}
 function circlePoly(coord,r,n=10){const out=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;out.push([coord[0]+Math.cos(a)*r/metersLon(coord[1]),coord[1]+Math.sin(a)*r/110540])}out.push(out[0]);return[out]}
 function ribbonPoly(a,b,half){const lat=(a[1]+b[1])*.5,ml=metersLon(lat),dx=(b[0]-a[0])*ml,dy=(b[1]-a[1])*110540,len=Math.hypot(dx,dy);if(len<.35)return null;const nx=-dy/len,ny=dx/len,ox=nx*half/ml,oy=ny*half/110540;return[[[a[0]+ox,a[1]+oy],[b[0]+ox,b[1]+oy],[b[0]-ox,b[1]-oy],[a[0]-ox,a[1]-oy],[a[0]+ox,a[1]+oy]]]}
 function ribbonOffsetPoly(a,b,centerOffset,half){const lat=(a[1]+b[1])*.5,ml=metersLon(lat),dx=(b[0]-a[0])*ml,dy=(b[1]-a[1])*110540,len=Math.hypot(dx,dy);if(len<.35)return null;const nx=-dy/len,ny=dx/len,cx=nx*centerOffset/ml,cy=ny*centerOffset/110540,hx=nx*half/ml,hy=ny*half/110540;return[[[a[0]+cx+hx,a[1]+cy+hy],[b[0]+cx+hx,b[1]+cy+hy],[b[0]+cx-hx,b[1]+cy-hy],[a[0]+cx-hx,a[1]+cy-hy],[a[0]+cx+hx,a[1]+cy+hy]]]}
 function livingPhysical(data){
  const out=[],cap=MOBILE?72:(TIER==='HIGH'?420:220);let used=0;
  const linesOf=g=>g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?(g.coordinates||[]):[];
  const polygonsOf=g=>g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?(g.coordinates||[]):[];
  for(const ft of data?.features||[]){if(used>=cap)break;const p=ft.properties||{},g=ft.geometry;if(!g)continue;
   const kind=String(p.asset_kind||'').toLowerCase(),cls=String(p.class||'').toLowerCase(),surface=String(p.surface||p.properties?.tags?.surface||'concrete').toLowerCase();
   if(['footway','pedestrian','path','cycleway','steps','living_street'].includes(cls)||p.layer_key==='SIDEWALKS_PARKING'){
    const width=clamp(Number(String(p.properties?.tags?.width||'').match(/\d+(?:\.\d+)?/)?.[0])||1.7,.8,5.5);
    for(const line of linesOf(g))for(let i=0;i<line.length-1&&used<cap;i++){const poly=ribbonPoly(line[i],line[i+1],width*.5);if(poly){out.push({type:'Feature',geometry:{type:'Polygon',coordinates:poly},properties:{part:'sidewalk',surface,truth:'SOURCE_LINE_DERIVED_WIDTH'}});used++}}
    continue
   }
   if(cls==='hedge'){
    const ht=clamp(Number(p.height_m)||1.45,.45,4),width=.42;
    for(const line of linesOf(g))for(let i=0;i<line.length-1&&used<cap;i++){const poly=ribbonPoly(line[i],line[i+1],width*.5);if(poly){out.push({type:'Feature',geometry:{type:'Polygon',coordinates:poly},properties:{part:'hedge',top_m:ht,truth:'SOURCE_HEDGE_LINE_DERIVED_WIDTH'}});used++}}
    for(const poly of polygonsOf(g)){if(used>=cap)break;out.push({type:'Feature',geometry:{type:'Polygon',coordinates:poly},properties:{part:'hedge',top_m:ht,truth:'SOURCE_HEDGE_AREA'}});used++}
    continue
   }
   if(kind==='shrub'||cls==='shrub'){
    const ht=clamp(Number(p.height_m)||1.15,.35,3.5);
    if(g.type==='Point'){out.push({type:'Feature',geometry:{type:'Polygon',coordinates:circlePoly(g.coordinates,clamp(ht*.62,.45,1.8),10)},properties:{part:'shrub',top_m:ht,truth:'SOURCE_POSITION_DERIVED_FORM'}});used++}
    else for(const poly of polygonsOf(g)){if(used>=cap)break;out.push({type:'Feature',geometry:{type:'Polygon',coordinates:poly},properties:{part:'shrub',top_m:ht,truth:'SOURCE_SHRUB_AREA'}});used++}
    continue
   }
   if(cls==='fountain'||String(p.subtype||'').toLowerCase()==='fountain'){
    if(g.type==='Point'){const rr=clamp(Number(p.properties?.tags?.diameter)||2.6,1.2,8);out.push({type:'Feature',geometry:{type:'Polygon',coordinates:circlePoly(g.coordinates,rr,14)},properties:{part:'fountain_basin',truth:'SOURCE_POSITION_DERIVED_FORM'}},{type:'Feature',geometry:{type:'Polygon',coordinates:circlePoly(g.coordinates,rr*.78,14)},properties:{part:'fountain_water',truth:'SOURCE_POSITION_DERIVED_FORM'}});used++}
    else for(const poly of polygonsOf(g)){if(used>=cap)break;out.push({type:'Feature',geometry:{type:'Polygon',coordinates:poly},properties:{part:'fountain_basin',truth:'SOURCE_FOUNTAIN_AREA'}},{type:'Feature',geometry:{type:'Polygon',coordinates:poly},properties:{part:'fountain_water',truth:'SOURCE_FOUNTAIN_AREA'}});used++}
    continue
   }
   if(g.type!=='Point'||!Array.isArray(g.coordinates))continue;const coord=g.coordinates,h=clamp(Number(p.height_m)||8,2,35),sub=String(p.subtype||'').toLowerCase();
   if(p.layer_key==='LANDMARK_OBJECTS_FINE'&&(['statue','sculpture','monument','memorial','artwork'].includes(cls)||['statue','sculpture','monument','memorial','war_memorial'].includes(sub))){
    const lk=['statue','sculpture'].includes(sub)?sub:(['monument','memorial'].includes(cls)?cls:'monument'),lh=clamp(Number(p.height_m)||((lk==='statue'||lk==='sculpture')?4.5:6),1.2,35),pr=clamp(lh*.16,.35,2.2),br=clamp(pr*.55,.18,1.1),base=clamp(lh*.18,.45,2.4);
    out.push({type:'Feature',geometry:{type:'Polygon',coordinates:circlePoly(coord,pr,12)},properties:{part:'landmark_plinth',landmark_kind:lk,top_m:base,truth:'SOURCE_POSITION_DERIVED_FORM'}},{type:'Feature',geometry:{type:'Polygon',coordinates:circlePoly(coord,br,12)},properties:{part:'landmark_body',landmark_kind:lk,base_m:base,top_m:lh,truth:'SOURCE_POSITION_DERIVED_FORM'}});used++;continue
   }
   if(p.layer_key==='TREE_OBJECTS_3D'||kind==='tree'){
    const crown=clamp(h*.28,1.4,5.5),trunk=clamp(h*.035,.12,.38),base=clamp(h*.32,1.5,7);
    out.push({type:'Feature',geometry:{type:'Polygon',coordinates:circlePoly(coord,trunk,8)},properties:{part:'tree_trunk',top_m:base,truth:'SOURCE_POSITION_DERIVED_FORM'}},{type:'Feature',geometry:{type:'Polygon',coordinates:circlePoly(coord,crown,11)},properties:{part:'tree_canopy',base_m:base,top_m:h,leaf_cycle:String(p.properties?.tags?.leaf_cycle||p.subtype||'').toLowerCase(),truth:'SOURCE_POSITION_DERIVED_FORM'}});used++
   }else if(kind==='streetlight'||cls==='street_lamp'){
    const ph=clamp(Number(p.height_m)||6.5,4,12);
    out.push({type:'Feature',geometry:{type:'Polygon',coordinates:circlePoly(coord,.09,7)},properties:{part:'streetlight_pole',top_m:ph,truth:'SOURCE_POSITION_DERIVED_FORM'}},{type:'Feature',geometry:{type:'Polygon',coordinates:circlePoly(coord,.28,8)},properties:{part:'streetlight_lamp',base_m:ph-.12,top_m:ph+.12,truth:'SOURCE_POSITION_DERIVED_FORM'}});used++
   }
  }
  return{type:'FeatureCollection',features:out}
 }
 function road3dWidth(p){const explicit=Number(String(p?.width||'').match(/\d+(?:\.\d+)?/)?.[0]);if(Number.isFinite(explicit)&&explicit>1&&explicit<60)return explicit;const lanes=Number(p?.lanes);if(Number.isFinite(lanes)&&lanes>0)return clamp(lanes*3.25,3,26);const k=String(p?.class||'').toLowerCase();return({motorway:11,trunk:9,primary:8,secondary:7,tertiary:5.8,minor:4.8,residential:5.2,living_street:4.5,service:3.5,track:2.8,path:1.6,footway:1.5,cycleway:1.8}[k]||4.2)}
 function rebuildRoad3D(delay=MOBILE?1450:(LOW?850:520)){
  clearTimeout(road3dTimer);road3dTimer=setTimeout(()=>{
   if(moving)return;const z=map.getZoom(),src=map.getSource('bpRoad3D');if(!src)return;
   if(z<13.6){src.setData(EMPTY);window.__BP_ROAD3D_STATE__={segments:0,retainedDuringMotion:true,lod:'off',updatedAt:Date.now()};return}
   if(z<15.7){window.__BP_ROAD3D_STATE__={...(window.__BP_ROAD3D_STATE__||{}),retainedDuringMotion:true,lod:'retained-below-detail',updatedAt:Date.now()};return}
   const build=()=>{
    if(moving)return;const layers=['gta-road-major','gta-road-local','gta-road-supplement-bp','gta-bridge-deck'].filter(id=>map.getLayer(id));let fs=[];try{fs=map.queryRenderedFeatures({layers})||[]}catch(_){return}
    const out=[],seen=new Set(),cap=MOBILE?68:(TIER==='HIGH'?320:160);let used=0,rails=0,piers=0;
    outer:for(const ft of fs){const p=ft.properties||{},g=ft.geometry,lines=g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[],bridge=String(p.brunnel||'').toLowerCase()==='bridge'||String(p.bridge||'').toLowerCase()==='yes',w=road3dWidth(p),base=bridge?clamp((Number(p.layer)||1)*2.5,1.5,14):.015;
     for(const line of lines)for(let i=0;i<line.length-1;i++){if(used>=cap)break outer;const a=line[i],b=line[i+1],key=[a[0].toFixed(5),a[1].toFixed(5),b[0].toFixed(5),b[1].toFixed(5),Math.round(w*10)].join(':');if(seen.has(key))continue;seen.add(key);const poly=ribbonPoly(a,b,w*.5+.32);if(!poly)continue;
      out.push({type:'Feature',geometry:{type:'Polygon',coordinates:poly},properties:{part:'deck',base_m:base,deck_top_m:base+.09,curb_top_m:base+.2,bridge,road_class:p.class||'',truth:'SOURCE_CENTERLINE_DERIVED_WIDTH'}});
      if(bridge){for(const side of [-1,1]){const rail=ribbonOffsetPoly(a,b,side*(w*.5+.18),.075);if(rail){out.push({type:'Feature',geometry:{type:'Polygon',coordinates:rail},properties:{part:'bridge_rail',rail_base_m:base+.18,rail_top_m:base+1.15,bridge:true,truth:'SOURCE_BRIDGE_CENTERLINE_DERIVED_RAIL'}});rails++}}const mid=[(a[0]+b[0])*.5,(a[1]+b[1])*.5],pier=circlePoly(mid,clamp(w*.08,.22,.85),8);out.push({type:'Feature',geometry:{type:'Polygon',coordinates:pier},properties:{part:'bridge_pier',pier_top_m:base+.04,bridge:true,truth:'SOURCE_BRIDGE_CENTERLINE_DERIVED_PIER'}});piers++}
      used++
     }
    }
    src.setData({type:'FeatureCollection',features:out});window.__BP_ROAD3D_STATE__={segments:used,bridgeRails:rails,bridgePiers:piers,retainedDuringMotion:true,derivedFromSourceCenterlines:true,lod:'close',updatedAt:Date.now()}
   };
   if('requestIdleCallback'in window)requestIdleCallback(build,{timeout:MOBILE?2200:1200});else setTimeout(build,MOBILE?180:60)
  },delay)
 }
 async function exact(){const z=map.getZoom();if(z<DETAIL_MIN||moving)return;const seq=++detailSeq,b=bbox(map,MOBILE?.045:.075);lastExactFetchAt=performance.now();try{const d=await rpc('bridgepoint_building_viewport_v2300',{p_west:b.west,p_south:b.south,p_east:b.east,p_north:b.north,p_limit:MAX_EXACT},9000);if(seq!==detailSeq||moving)return;const p=await prepare(d?.features||[],MAX_EXACT);if(seq!==detailSeq||moving)return;if((p.buildings?.features?.length||0)>0){map.getSource('exact')?.setData(p.buildings);map.getSource('exactRoof')?.setData(p.roofs||EMPTY);exactCount=Number(p.count||0);syncBuildingShells()}window.__BP_EXACT_DETAIL_STATE__={status:exactCount>0?'ready':'empty',count:exactCount,visible:exactCount>0&&z>=DETAIL_MIN,worldOverlay:exactCount>0&&z>=DETAIL_MIN,inspectorAvailable:exactCount>0,zoom:z,updatedAt:Date.now()};setStatus(`BridgePoint World · persistent detail · ${exactCount.toLocaleString()} exact buildings retained · refinement visible`)}catch(e){if(seq===detailSeq){window.__BP_EXACT_DETAIL_STATE__={status:'error',count:exactCount,error:String(e?.message||e),updatedAt:Date.now()};setStatus(`BridgePoint World · persistent detail retained · background refinement retrying`)}}}
 async function livingWorld(){
  if(map.getZoom()<14.2||moving)return;const seq=++livingSeq,b=bbox(map,MOBILE?.035:.06);lastLivingFetchAt=performance.now();
  try{
   const d=await edge('bridgepoint-living-world-viewport-v5319',{west:b.west,south:b.south,east:b.east,north:b.north,limit:MOBILE?550:(TIER==='HIGH'?1500:1100)},8500);
   if(seq!==livingSeq||moving)return;
   const data=d?.type==='FeatureCollection'?d:EMPTY;if((data?.features?.length||0)>0){map.getSource('bpLivingWorld')?.setData(data);map.getSource('bpLivingWorld3D')?.setData(livingPhysical(data));livingCount=Number(data.features.length)}
   window.__BP_LIVING_WORLD_STATE__={status:'ready',count:livingCount,viewport:{west:b.west,south:b.south,east:b.east,north:b.north},updatedAt:Date.now()}
  }catch(e){
   if(seq!==livingSeq)return;window.__BP_LIVING_WORLD_STATE__={status:'error',count:livingCount,error:String(e?.message||e),updatedAt:Date.now()}
  }
 }
 function scheduleLivingWorld(delay=MOBILE?1200:120){clearTimeout(map.__bpLivingTimer);if(map.getZoom()<14.2)return;map.__bpLivingTimer=setTimeout(()=>{if(!moving)livingWorld()},delay)}
 function lights(delay=MOBILE?1450:120){clearTimeout(lightTimer);lightTimer=setTimeout(()=>{if(moving)return;map.getSource('streetlights')?.setData(roadLights(map));updateWorldLight()},delay)}
 function scheduleExact(delay=MOBILE?420:70){clearTimeout(detailTimer);detailTimer=setTimeout(()=>{if(!moving)exact()},delay)}
 function startParcelFlow(){clearInterval(parcelPulseTimer);parcelPulseTimer=setInterval(()=>{if(moving||!layerState.parcels||map.getZoom()<PARCEL_MIN)return;parcelPulsePhase=(parcelPulsePhase+1)%16;const t=(Math.sin((parcelPulsePhase/16)*Math.PI*2)+1)/2;paint(map,'gta-parcel-glow','line-opacity',.11+.18*t);paint(map,'gta-parcel-glow','line-blur',2.1+2.4*t);paint(map,'gta-parcel','line-opacity',.82+.16*t)},260)}
 function bridgePointDomesticCenter(){
  const p=map.getCenter(),x=p.lng,y=p.lat;
  return (x>=-125&&x<=-66&&y>=24&&y<=50)||(x>=-170&&x<=-129&&y>=51&&y<=72)||(x>=-161&&x<=-154&&y>=18&&y<=23)||(x>=-68.2&&x<=-64.3&&y>=17.5&&y<=19)||(x>=144&&x<=146&&y>=13&&y<=21)||(x>=-171&&x<=-168&&y>=-15&&y<=-10);
 }
 function bridgePointBuildingCoverageReady(){
   if(map.getZoom()<10.9)return false;
   try{
    if(!map.getSource('bpBuildings')||!map.isSourceLoaded?.('bpBuildings'))return false;
    const fs=map.querySourceFeatures?.('bpBuildings',{sourceLayer:'buildings'})||[];
    return fs.length>0
   }catch(_){return false}
  }
  function syncBuildingShells(){
   if(!layerState.buildings){
    for(const id of ['gta-context-building-footprints','gta-context-buildings','gta-context-floor-lines','gta-context-roofs','gta-bp-buildings','gta-bp-facade-detail','gta-bp-roofs','gta-bp-building-edge','gta-exact-building','gta-exact-floor-lines','gta-exact-roof','gta-building-outline'])vis(map,id,false);
    return
   }
   const z=map.getZoom(),cityShell=z>=9.6,bpReady=z>=10.9&&bridgePointBuildingCoverageReady(),exactReady=exactCount>0&&z>=DETAIL_MIN;
   const floors=z>=(MOBILE?15.1:14.4),roofFallback=z>=(MOBILE?12.6:11.4),facade=z>=FACADE_DETAIL_MIN;
   vis(map,'gta-context-building-footprints',z>=9.25&&z<9.6);
   vis(map,'gta-context-buildings',cityShell&&!bpReady);
   vis(map,'gta-context-floor-lines',floors&&!bpReady);
   vis(map,'gta-context-roofs',roofFallback&&!bpReady);
   vis(map,'gta-bp-buildings',bpReady);
   vis(map,'gta-bp-facade-detail',bpReady&&facade);
   vis(map,'gta-bp-roofs',bpReady);
   vis(map,'gta-bp-building-edge',bpReady&&z>=11.8);
   vis(map,'gta-exact-building',exactReady);
   vis(map,'gta-exact-floor-lines',exactReady&&floors);
   vis(map,'gta-exact-roof',exactReady);
   vis(map,'gta-building-outline',exactReady&&z>=12.6);
   for(const id of [
    'gta-context-building-shadow','gta-context-facade-detail','gta-context-building-parts','gta-context-night-windows',
    'gta-bp-building-shadow','gta-bp-night-windows',
    'gta-exact-building-shadow','gta-exact-facade-detail','gta-exact-night-windows',
    'gta-opportunity-buildings'
   ])vis(map,id,false);
   clearTimeout(map.__bpBuildingShellProbe);
   window.__BP_BUILDING_SHELL_MODE__={
    authoritative:bpReady?'BRIDGEPOINT_SOURCE_BACKED_CITY_MVT':'OPENFREEMAP_GLOBAL_CONTEXT',
    cityScale3D:cityShell,
    farZoomColored:true,
    bridgePointHandoff:bpReady,
    immediate:true,
    fullGroundExtrusion:true,
    additiveExactHeight:exactReady,
    floorLines:floors,
    exactRoofs:exactReady,
    sourceBackedRoofs:bpReady,
    contextRoofFallback:roofFallback&&!bpReady,
    exactCount,
    facadeDetail:bpReady&&facade,
    buildingParts:false,
    closeTexturedShell:bpReady&&facade,
    displaySource:bpReady?'BRIDGEPOINT_PUBLIC_BUILDING_CITY_TILE_V5370':'OPENFREEMAP_GLOBAL_BUILDING',
    cameraMode:'FREE_FLY_SINGLE_VIEW',
    version:5370,
    updatedAt:Date.now()
   }
  }
  function startStationaryLodWatchdog(){
  clearInterval(lodWatchTimer);
  if(!MOBILE)return;
  lodWatchTimer=setInterval(()=>{
   if(!layerState.buildings)return;
   const center=map.getCenter(),sig=[center.lng.toFixed(6),center.lat.toFixed(6),map.getZoom().toFixed(3),map.getPitch().toFixed(2),map.getBearing().toFixed(2)].join('|');
   if(sig!==lodWatchSig){lodWatchSig=sig;lodWatchStable=0;return}
   lodWatchStable++;
   const mode=window.__BP_BUILDING_SHELL_MODE__||{},needsClose=map.getZoom()>=FACADE_DETAIL_MIN&&mode.closeTexturedShell!==true;
   if(lodWatchStable<2||(!moving&&!mode.fineDetailDeferred&&!needsClose))return;
   moving=false;
   buildingShellQuietUntil=0;
   syncBuildingShells();
   if(map.getZoom()>=DETAIL_MIN&&exactCount===0)scheduleExact(0);
   window.__BP_STATIONARY_LOD_WATCHDOG__={forced:true,stableTicks:lodWatchStable,zoom:map.getZoom(),pitch:map.getPitch(),closeTextured:!!window.__BP_BUILDING_SHELL_MODE__?.closeTexturedShell,roofMode:window.__BP_BUILDING_SHELL_MODE__?.roofMode||null,updatedAt:Date.now()}
  },500)
 }
 function startWaterMotion(){
  clearInterval(waterTimer);let phase=0;waterTimer=setInterval(()=>{if(moving)return;phase=(phase+1)%12;const s=(Math.sin(phase/12*Math.PI*2)+1)/2;paint(map,'gta-coast-foam','line-opacity',.12+.18*s);paint(map,'gta-coast-foam','line-width',['interpolate',['linear'],['zoom'],13,.22+.06*s,18,.72+.3*s,20,1.15+.35*s]);paint(map,'gta-waterway-flow','line-opacity',.24+.22*s)},650)
 }
 function armFineDetailSettle(delay=MOBILE?1650:180){
  clearTimeout(map.__bpBuildingFineSettle);
  map.__bpBuildingFineSettle=setTimeout(()=>{
   if(map.isMoving?.()){armFineDetailSettle(MOBILE?320:120);return}
   moving=false;
   buildingShellQuietUntil=0;
   syncBuildingShells();
   window.__BP_FINE_DETAIL_SETTLE__={settled:true,zoom:map.getZoom(),closeTextured:!!window.__BP_BUILDING_SHELL_MODE__?.closeTexturedShell,updatedAt:Date.now()}
  },delay)
 }
 function movement(on){
  moving=on;
  if(on){
   if(MOBILE)buildingShellQuietUntil=performance.now()+3500;
   clearTimeout(detailTimer);clearTimeout(map.__bpLivingTimer);clearTimeout(lightTimer);clearTimeout(road3dTimer);clearTimeout(map.__bpBuildingShellProbe);clearTimeout(map.__bpMotionHardRelease);clearTimeout(map.__bpBuildingFineSettle);
   const recover=()=>{
    if(map.isMoving?.()){map.__bpMotionHardRelease=setTimeout(recover,MOBILE?260:120);return}
    const stale=moving;
    moving=false;
    buildingShellQuietUntil=0;
    syncBuildingShells();
    armFineDetailSettle(0);
    if(stale){scheduleExact(MOBILE?900:90);scheduleLivingWorld(MOBILE?1100:120);lights(MOBILE?850:140)}
    window.__BP_CAMERA_STALE_MOTION_RECOVERY__={recovered:true,zoom:map.getZoom(),closeTextured:!!window.__BP_BUILDING_SHELL_MODE__?.closeTexturedShell,updatedAt:Date.now()}
   };
   map.__bpMotionHardRelease=setTimeout(recover,MOBILE?1100:500);
   if(MOBILE)syncBuildingShells();
   return
  }
  clearTimeout(map.__bpMotionHardRelease);
  if(MOBILE)buildingShellQuietUntil=performance.now()+900;
  terrain();syncBuildingShells();armFineDetailSettle();rebuildRoad3D(MOBILE?1800:620);scheduleExact(MOBILE?520:90);scheduleLivingWorld(MOBILE?1800:120);lights(MOBILE?1200:140)
 }
 function toggleLayer(name,on){if(name==='parcels'){layerState.parcels=!!on;for(const id of ['gta-parcel','gta-parcel-glow'])vis(map,id,on);if(on)startParcelFlow()}if(name==='buildings'){layerState.buildings=!!on;if(!on){for(const id of ['gta-context-building-footprints','gta-context-building-shadow','gta-context-buildings','gta-context-facade-detail','gta-context-building-parts','gta-context-roofs','gta-context-night-windows','gta-bp-building-shadow','gta-bp-buildings','gta-bp-facade-detail','gta-bp-roofs','gta-bp-building-edge','gta-bp-night-windows','gta-exact-building-shadow','gta-exact-building','gta-exact-facade-detail','gta-exact-roof','gta-exact-night-windows','gta-building-outline'])vis(map,id,false)}else syncBuildingShells()}}
 function resultRows(rows){const root=document.getElementById('mapResults');if(!root)return;root.innerHTML='';for(const r of rows||[]){const b=document.createElement('button');b.type='button';b.className='data-card';b.innerHTML=`<b>${String(r.full_address||'Property').replace(/[<>&]/g,'')}</b><small>${[r.municipality,r.state_code,r.parcel_number].filter(Boolean).join(' · ')}</small>`;b.onclick=()=>{root.innerHTML='';if(Number.isFinite(+r.longitude)&&Number.isFinite(+r.latitude))map.easeTo({center:[+r.longitude,+r.latitude],zoom:17,pitch:62,bearing:-18,duration:LOW?320:620})};root.appendChild(b)}}

 function walkAngleDiff(a,b){let d=((a-b+540)%360)-180;return d}
 function roadBearing(a,b){const p1=a[1]*Math.PI/180,p2=b[1]*Math.PI/180,dl=(b[0]-a[0])*Math.PI/180;return (Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))*180/Math.PI+360)%360}
 function roadMeters(a,b){const lat=((a[1]+b[1])*.5)*Math.PI/180,dx=(b[0]-a[0])*111320*Math.cos(lat),dy=(b[1]-a[1])*110540;return Math.hypot(dx,dy)}
 function nearestWalkSegment(){
  const center=map.getCenter(),cx=center.lng,cy=center.lat,layers=['gta-road-major','gta-road-local','gta-bridge-deck'].filter(id=>map.getLayer(id));let fs=[];
  try{fs=map.queryRenderedFeatures({layers})||[]}catch(_){return null}
  let best=null;
  for(const f of fs){const g=f.geometry,lines=g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];for(const line of lines)for(let i=0;i<line.length-1;i++){const a=line[i],b=line[i+1],lat=((cy+a[1]+b[1])/3)*Math.PI/180,sx=111320*Math.cos(lat),sy=110540,ax=(a[0]-cx)*sx,ay=(a[1]-cy)*sy,bx=(b[0]-cx)*sx,by=(b[1]-cy)*sy,vx=bx-ax,vy=by-ay,l2=vx*vx+vy*vy;if(l2<1)continue;const t=clamp((-(ax*vx+ay*vy))/l2,0,1),px=ax+t*vx,py=ay+t*vy,d=Math.hypot(px,py);if(!best||d<best.dist){best={a,b,t,dist:d,proj:[cx+px/sx,cy+py/sy],bearing:roadBearing(a,b),len:Math.sqrt(l2)}}}}
  return best
 }
 function ensureStreetWeatherCss(){
  if(document.getElementById('bpStreetWeatherCss'))return;
  const s=document.createElement('style');s.id='bpStreetWeatherCss';s.textContent=`
  #bpStreetWeatherFx{position:absolute;inset:0 auto auto 0;width:100%;height:var(--bp-street-photo-h,27vh);pointer-events:none;z-index:2;opacity:0;transition:opacity .25s ease;background-position:0 0}
  #bpStreetWeatherFx.rain{opacity:1;background-image:repeating-linear-gradient(104deg,transparent 0 15px,rgba(181,222,240,.55) 16px 17px,transparent 18px 31px);background-size:130px 180px;animation:bpWxRain .55s linear infinite}
  #bpStreetWeatherFx.snow{opacity:1;background-image:radial-gradient(circle,rgba(250,253,255,.92) 0 2px,transparent 2.8px),radial-gradient(circle,rgba(238,248,255,.72) 0 1.5px,transparent 2.3px);background-size:42px 48px,59px 63px;background-position:0 0,22px 11px;animation:bpWxSnow 5s linear infinite}
  #bpStreetWeatherFx.hail{opacity:1;background-image:radial-gradient(circle,rgba(231,248,255,.96) 0 2.2px,rgba(184,219,232,.66) 2.3px 3px,transparent 3.2px);background-size:34px 42px;animation:bpWxHail .72s linear infinite}
  #bpStreetWeatherFx.fog{opacity:1;background-image:linear-gradient(180deg,rgba(216,226,227,.16),rgba(181,196,199,.34));animation:bpWxFog 4s ease-in-out infinite alternate}
  #bpStreetWeatherFx.smoke{opacity:1;background-image:radial-gradient(ellipse at 20% 72%,rgba(68,64,59,.42),transparent 42%),radial-gradient(ellipse at 75% 42%,rgba(95,91,84,.33),transparent 48%),linear-gradient(rgba(60,57,53,.12),rgba(36,34,32,.28));animation:bpWxSmoke 7s ease-in-out infinite alternate}
  #bpStreetWeatherFx.fire{opacity:1;background-image:radial-gradient(ellipse at 12% 102%,rgba(255,69,10,.85),transparent 28%),radial-gradient(ellipse at 38% 106%,rgba(255,153,24,.7),transparent 27%),radial-gradient(ellipse at 68% 104%,rgba(255,63,8,.78),transparent 30%),radial-gradient(ellipse at 91% 105%,rgba(255,188,38,.63),transparent 24%);animation:bpWxFire 1.1s ease-in-out infinite alternate}
  #bpStreetWeatherFx.lightning:after{content:"";position:absolute;inset:0;background:rgba(237,248,255,.0);animation:bpWxFlash 4.2s steps(1,end) infinite}
  @keyframes bpWxRain{to{background-position:38px 180px}}
  @keyframes bpWxSnow{to{background-position:34px 150px,70px 190px}}
  @keyframes bpWxHail{to{background-position:25px 170px}}
  @keyframes bpWxFog{from{filter:blur(1px);opacity:.58}to{filter:blur(4px);opacity:.86}}
  @keyframes bpWxSmoke{from{background-position:0 0,0 0,0 0}to{background-position:42px -8px,-36px 16px,0 0}}
  @keyframes bpWxFire{from{filter:saturate(1);background-position:0 8px,0 0,0 5px,0 0}to{filter:saturate(1.25);background-position:0 -6px,0 10px,0 -4px,0 7px}}
  @keyframes bpWxFlash{0%,92%,95%,100%{background:rgba(237,248,255,0)}93%{background:rgba(237,248,255,.45)}94%{background:rgba(237,248,255,.12)}}
  `;document.head.appendChild(s)
 }
 function stopStreetPhotoWeather(){
  if(streetFxRaf){clearInterval(streetFxRaf);streetFxRaf=0}
  const fx=document.getElementById('bpStreetWeatherFx');if(fx){fx.className='';fx.style.backgroundImage='';fx.style.opacity='0'}
  window.__BP_STREET_WEATHER__={active:false,updatedAt:Date.now()}
 }
 function streetWeatherCondition(){
  const p=streetPhotoState.frames[streetPhotoState.index],lng=Number(p?.matchLng??p?.lng??map.getCenter().lng),lat=Number(p?.matchLat??p?.lat??map.getCenter().lat),now=Date.now();
  if(now-streetFxLastConditionAt>900||!streetFxCondition){streetFxLastConditionAt=now;try{streetFxCondition=window.__bpWeatherV2300?.localConditions?.(lng,lat)||window.BridgePointWorldV2300?.weather?.localConditions?.(lng,lat)||null}catch(_){streetFxCondition=null}}
  return streetFxCondition
 }
 function renderStreetPhotoWeather(){
  const panel=document.getElementById('bpStreetPhotoPanel'),fx=document.getElementById('bpStreetWeatherFx'),meta=document.getElementById('bpStreetPhotoMeta');
  if(!walkMode||!panel||panel.style.display==='none'||!fx)return;
  ensureStreetWeatherCss();const q=streetWeatherCondition();let classes=[];
  if(q?.rain)classes.push('rain');else if(q?.snow)classes.push('snow');else if(q?.hail)classes.push('hail');
  if(q?.fog)classes.push('fog');if(q?.smoke)classes.push('smoke');if(q?.wildfire)classes.push('fire');if(q?.lightning)classes.push('lightning');
  fx.className=classes.join(' ');
  const p=streetPhotoState.frames[streetPhotoState.index],shot=p?.shotDate||p?.dateAdded||'',label=q?.wildfire?'WILDFIRE':q?.hail?'HAIL':q?.snow?'SNOW':q?.rain?'RAIN':q?.fog?'FOG':q?.smoke?'SMOKE':'LIVE WEATHER';
  if(meta)meta.textContent=`REAL STREET PHOTO · ${label} · ${shot?String(shot).slice(0,10)+' · ':''}© Grab and KartaView Contributors`;
  window.__BP_STREET_WEATHER__={...(q||{}),active:true,mode:'LIVE_CONDITIONS_OVER_PUBLIC_STREET_PHOTO',domOverlay:true,secondaryCanvases:0,updatedAt:Date.now()}
 }
 function startStreetPhotoWeather(){
  if(streetFxRaf)return;renderStreetPhotoWeather();streetFxRaf=setInterval(renderStreetPhotoWeather,850)
 }
 function streetPhotoUrl(p){if(!p)return'';return p.fileurlProc||p.fileurlLTh||p.fileurlTh||String(p.fileurl||'').replace('[[sizeprefix]]','wrapped_proc')}
 function updateStreetPhotoPanel(){
  const panel=document.getElementById('bpStreetPhotoPanel'),img=document.getElementById('bpStreetPhotoImg'),meta=document.getElementById('bpStreetPhotoMeta');if(!panel||!img||!meta)return;
  const p=streetPhotoState.frames[streetPhotoState.index],url=streetPhotoUrl(p);if(!walkMode||!p||!url){panel.style.display='none';img.removeAttribute('src');stopStreetPhotoWeather();return}
  panel.style.display='block';if(img.src!==url)img.src=url;renderStreetPhotoWeather();startStreetPhotoWeather()
 }
 function applyStreetPhotoFrame(index){
  if(!streetPhotoState.frames.length)return false;streetPhotoState.index=clamp(index,0,streetPhotoState.frames.length-1);const p=streetPhotoState.frames[streetPhotoState.index],lng=Number(p.matchLng??p.lng),lat=Number(p.matchLat??p.lat),heading=Number(p.heading);if(Number.isFinite(lng)&&Number.isFinite(lat))map.easeTo({center:[lng,lat],zoom:19.35,pitch:82,bearing:Number.isFinite(heading)?heading:map.getBearing(),duration:LOW?180:300});updateStreetPhotoPanel();setStatus('Street Walk · real KartaView imagery where available · BridgePoint 3D stays synchronized');return true
 }
 async function loadStreetPhotoSequence(center){
  if(streetPhotoState.loading)return;const here=Array.isArray(center)?center:map.getCenter().toArray();
  if(streetPhotoState.frames.length&&streetPhotoState.loadedCenter&&roadMeters(streetPhotoState.loadedCenter,here)<120){updateStreetPhotoPanel();return}
  streetPhotoState.loading=true;
  try{
   const nearbyUrl=`https://api.openstreetcam.org/2.0/photo/?lat=${encodeURIComponent(here[1])}&lng=${encodeURIComponent(here[0])}&zoomLevel=18&radius=120&join=sequence&orderBy=id&orderDirection=desc`;
   const nr=await fetch(nearbyUrl,{mode:'cors',credentials:'omit'});if(!nr.ok)throw new Error('nearby '+nr.status);const nj=await nr.json(),near=Array.isArray(nj?.result?.data)?nj.result.data:[];if(!near.length)throw new Error('no nearby imagery');
   near.sort((x,y)=>roadMeters([Number(x.matchLng??x.lng),Number(x.matchLat??x.lat)],here)-roadMeters([Number(y.matchLng??y.lng),Number(y.matchLat??y.lat)],here));
   const seed=near[0],sequenceId=seed?.sequenceId||seed?.sequence?.id;if(!sequenceId)throw new Error('no sequence');
   const sr=await fetch(`https://api.openstreetcam.org/2.0/photo/?sequenceId=${encodeURIComponent(sequenceId)}&page=1&itemsPerPage=150`,{mode:'cors',credentials:'omit'});if(!sr.ok)throw new Error('sequence '+sr.status);const sj=await sr.json(),frames=Array.isArray(sj?.result?.data)?sj.result.data:[];if(!frames.length)throw new Error('empty sequence');
   let best=0,bestD=Infinity;frames.forEach((p,i)=>{const lng=Number(p.matchLng??p.lng),lat=Number(p.matchLat??p.lat);if(!Number.isFinite(lng)||!Number.isFinite(lat))return;const d=roadMeters([lng,lat],here);if(d<bestD){bestD=d;best=i}});
   streetPhotoState={sequenceId:String(sequenceId),frames,index:best,loadedCenter:here,loading:false};applyStreetPhotoFrame(best);window.__BP_STREET_PHOTO__={provider:'KartaView',sequenceId:String(sequenceId),coverage:true,license:'CC BY-SA 4.0',attribution:'© Grab and KartaView Contributors',updatedAt:Date.now()}
  }catch(e){streetPhotoState={sequenceId:null,frames:[],index:-1,loadedCenter:here,loading:false};updateStreetPhotoPanel();window.__BP_STREET_PHOTO__={provider:'KartaView',coverage:false,error:String(e?.message||e),updatedAt:Date.now()};setStatus('Street Walk · no public street photo here · using BridgePoint 3D road navigation')}
 }
 function updateWalkUI(){
  const panel=document.getElementById('bpStreetWalkControls'),toggle=document.getElementById('bpWalkToggle');if(panel)panel.style.display=walkMode?'grid':'none';if(toggle){toggle.classList.toggle('active',walkMode);toggle.textContent=walkMode?'EXIT WALK':'WALK'}if(!walkMode)updateStreetPhotoPanel()
 }
 function enterWalk(){
  const s=nearestWalkSegment();walkMode=true;let center=map.getCenter().toArray(),bearing=map.getBearing();if(s){center=s.proj;let bb=s.bearing;if(Math.abs(walkAngleDiff(bb,bearing))>90)bb=(bb+180)%360;bearing=bb}
  map.easeTo({center,zoom:Math.max(map.getZoom(),19.15),pitch:82,bearing,duration:LOW?280:520});updateWalkUI();setStatus(s?'Street Walk · loading public street imagery if coverage exists':'Street Walk · zoom into a mapped street and use the arrows');window.__BP_STREET_WALK__={active:true,mode:'hybrid-3d-plus-public-street-imagery',photoProvider:'KartaView',updatedAt:Date.now()};setTimeout(()=>loadStreetPhotoSequence(center),450)
 }
 function exitWalk(){walkMode=false;stopStreetPhotoWeather();map.easeTo({pitch:58,zoom:Math.min(map.getZoom(),18.2),duration:LOW?220:420});updateWalkUI();setStatus('Street Walk off · BridgePoint 3D world');window.__BP_STREET_WALK__={active:false,mode:'hybrid-3d-plus-public-street-imagery',photoProvider:'KartaView',updatedAt:Date.now()}}
 function walkStep(dir){
  if(!walkMode){enterWalk();return}if(streetPhotoState.frames.length){const next=streetPhotoState.index+dir;if(next>=0&&next<streetPhotoState.frames.length){applyStreetPhotoFrame(next);return}}
  const s=nearestWalkSegment();if(!s){setStatus('Street Walk · no mapped road under the camera');return}
  let forward=s.bearing,along=1;if(Math.abs(walkAngleDiff(forward,map.getBearing()))>90){forward=(forward+180)%360;along=-1}
  const metres=MOBILE?16:22,delta=Math.min(.42,metres/Math.max(6,s.len))*dir*along,t=clamp(s.t+delta,0,1),target=[s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t];
  const viewBearing=dir>0?forward:(forward+180)%360;map.easeTo({center:target,zoom:19.35,pitch:82,bearing:viewBearing,duration:LOW?220:360});setStatus('Street Walk · moving through BridgePoint 3D · checking public imagery');setTimeout(()=>loadStreetPhotoSequence(target),420)
 }
 function turnWalk(delta){if(!walkMode){enterWalk();return}map.easeTo({bearing:(map.getBearing()+delta+360)%360,pitch:82,duration:LOW?160:260})}
 function installWalkUI(){
  let toggle=document.getElementById('bpWalkToggle');if(!toggle){toggle=document.createElement('button');toggle.id='bpWalkToggle';toggle.type='button';toggle.textContent='WALK';toggle.title='Street Walk · 3D navigation + public KartaView imagery where available';document.querySelector('.map-tools')?.appendChild(toggle)}
  toggle?.addEventListener('click',()=>walkMode?exitWalk():enterWalk());
  if(!document.getElementById('bpStreetPhotoPanel')){const photo=document.createElement('div');photo.id='bpStreetPhotoPanel';Object.assign(photo.style,{position:'absolute',left:'10px',right:'10px',bottom:'160px',zIndex:'17',display:'none',overflow:'hidden',borderRadius:'16px',background:'#090b0c',border:'1px solid rgba(230,226,211,.28)',boxShadow:'0 12px 36px rgba(0,0,0,.45)'});const img=document.createElement('img');img.id='bpStreetPhotoImg';img.alt='KartaView street-level imagery';Object.assign(img.style,{display:'block',width:'100%',height:MOBILE?'27vh':'34vh',objectFit:'cover',background:'#111'});photo.style.position='absolute';const fx=document.createElement('div');fx.id='bpStreetWeatherFx';fx.setAttribute('aria-hidden','true');fx.style.setProperty('--bp-street-photo-h',MOBILE?'27vh':'34vh');const foot=document.createElement('div');Object.assign(foot.style,{display:'flex',justifyContent:'space-between',gap:'8px',alignItems:'center',padding:'7px 10px',fontSize:'10px',letterSpacing:'.04em',color:'#d9d5c8',background:'rgba(8,10,11,.96)'});const meta=document.createElement('span');meta.id='bpStreetPhotoMeta';const credit=document.createElement('span');credit.textContent='KartaView';credit.style.color='#9bd6df';foot.append(meta,credit);photo.append(img,fx,foot);container.appendChild(photo)}
  if(document.getElementById('bpStreetWalkControls'))return;const panel=document.createElement('div');panel.id='bpStreetWalkControls';Object.assign(panel.style,{position:'absolute',left:'50%',bottom:'82px',transform:'translateX(-50%)',zIndex:'18',display:'none',gridTemplateColumns:'54px 58px 54px',gap:'7px',alignItems:'center',padding:'9px',borderRadius:'18px',background:'rgba(6,11,14,.72)',backdropFilter:'blur(10px)',border:'1px solid rgba(194,235,238,.28)',boxShadow:'0 10px 28px rgba(0,0,0,.35)'});
  const mk=(txt,title,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=txt;b.title=title;Object.assign(b.style,{height:'48px',borderRadius:'14px',border:'1px solid rgba(220,235,232,.35)',background:'rgba(35,43,43,.92)',color:'#f3f0df',fontSize:'22px',fontWeight:'900'});b.addEventListener('click',e=>{e.stopPropagation();fn()});return b};
  panel.append(mk('↶','Look left',()=>turnWalk(-22)),mk('▲','Walk forward',()=>walkStep(1)),mk('↷','Look right',()=>turnWalk(22)));panel.append(document.createElement('span'),mk('▼','Step backward',()=>walkStep(-1)),document.createElement('span'));container.appendChild(panel)
 }
 function bindUI(){
  document.querySelectorAll('[data-base]').forEach(b=>b.addEventListener('click',()=>setBase(b.dataset.base)));
  document.querySelectorAll('[data-layer]').forEach(b=>{if(['parcels','buildings'].includes(b.dataset.layer))toggleLayer(b.dataset.layer,b.classList.contains('active'));b.addEventListener('click',()=>{b.classList.toggle('active');const on=b.classList.contains('active');if(['parcels','buildings'].includes(b.dataset.layer))toggleLayer(b.dataset.layer,on);if(b.dataset.layer==='parcels')setStatus(on?(map.getZoom()>=PARCEL_MIN?'Exact BridgePoint parcel boundaries ON':'Parcel boundaries ON · zoom in to neighborhood level to render exact lines'):'Parcel boundaries OFF')})});
  const form=document.getElementById('mapSearchForm'),input=document.getElementById('mapSearch');if(form&&input)form.addEventListener('submit',async e=>{e.preventDefault();const q=input.value.trim();if(q.length<3)return;setStatus('Searching BridgePoint properties…');try{const d=await rpc('bridgepoint_home_search_properties_v142',{p_query:q,p_limit:12},8000);resultRows(d?.results||[]);setStatus(`${d?.results?.length||0} property matches`)}catch(err){setStatus(`Search unavailable · ${err.message}`)}});
  document.getElementById('resetMap')?.addEventListener('click',()=>map.easeTo({center:[-98.5,39.5],zoom:MOBILE?2.75:3.35,pitch:0,bearing:0,duration:LOW?220:480}));
  document.getElementById('locateMe')?.addEventListener('click',()=>{if(!navigator.geolocation){setStatus('Location is unavailable on this device');return}setStatus('Getting your location…');navigator.geolocation.getCurrentPosition(p=>map.easeTo({center:[p.coords.longitude,p.coords.latitude],zoom:16.8,pitch:60,bearing:-18,duration:LOW?350:700}),()=>setStatus('Location permission was not available'),{enableHighAccuracy:false,timeout:7000,maximumAge:120000})});
 }
 function chooseBuilding(e){if(window.__BP_MEASURE_ACTIVE__)return false;const layers=['gta-exact-building','gta-context-buildings'].filter(id=>map.getLayer(id)&&(map.getLayoutProperty(id,'visibility')||'visible')!=='none');let f=Array.isArray(e?.features)?e.features.find(x=>layers.includes(x?.layer?.id))||null:null;try{if(!f)f=map.queryRenderedFeatures(e.point,{layers})[0]||null}catch(_){}if(!f)return false;lastBuildingClickAt=performance.now();const p={...(f.properties||{})};if(!p.render_height_m)p.render_height_m=Number(p.height||p.render_height||8.5);const ll=e.lngLat||map.unproject(e.point),feature={type:'Feature',geometry:f.geometry,properties:p,id:f.id,layer:{id:f.layer?.id||''}},detail={lngLat:ll,feature};if(typeof window.__BP_V5000_SELECT_BUILDING__==='function'){try{window.__BP_V5000_SELECT_BUILDING__(detail)}catch(err){console.warn('v5000 building selector',err)}}else if(typeof buildingSelectHandler==='function'){try{buildingSelectHandler(detail)}catch(err){console.warn('building selection handler',err)}}window.dispatchEvent(new CustomEvent('bp2300:building-click',{detail}));return true}
 function bindBuildingHitLayers(){for(const id of ['gta-exact-building','gta-context-buildings']){if(!map.getLayer(id))continue;map.on('click',id,e=>chooseBuilding(e));map.on('mouseenter',id,()=>{map.getCanvas().style.cursor='pointer'});map.on('mouseleave',id,()=>{map.getCanvas().style.cursor=''})}} map.on('load',()=>{installBridgePointIcons(map);installBuildingMaterials(map);installWorldMaterials(map);installStatueOfLiberty(map);sky();terrain();bindUI();bindBuildingHitLayers();setBase('gta');startParcelFlow();startWaterMotion();syncBuildingShells();window.__BP_CAMERA_MODE__={mode:'FREE_FLY_SINGLE_VIEW',singleView:true,autoViewSwitching:false,streetWalkMode:false,maxPitch:85,minZoom:2.2,maxZoom:22,manualPitch:true,manualRotation:true,updatedAt:Date.now()};setTimeout(()=>rebuildRoad3D(MOBILE?1200:750),MOBILE?650:420);setTimeout(scheduleExact,MOBILE?350:220);setTimeout(scheduleLivingWorld,MOBILE?900:520);setTimeout(lights,MOBILE?850:600);setStatus('BridgePoint World v5370 · city-scale 3D · source-backed roofs · exact refinement')});
 map.on('sourcedata',e=>{if(e?.sourceId==='bpBuildings'&&e?.isSourceLoaded&&!moving)syncBuildingShells()});
 map.on('movestart',()=>movement(true));map.on('moveend',()=>movement(false));map.on('zoomend',()=>{terrain();syncBuildingShells();if(!MOBILE){rebuildRoad3D(560);if(!moving)updateWorldLight()}});
 const canvas=map.getCanvas();
 const nativeBuildingTap=(clientX,clientY,originalEvent)=>{const r=canvas.getBoundingClientRect(),point={x:clientX-r.left,y:clientY-r.top};if(point.x<0||point.y<0||point.x>r.width||point.y>r.height)return false;const hit=chooseBuilding({point,lngLat:map.unproject(point),originalEvent});if(hit)lastTouchBuildingAt=performance.now();return hit};
 canvas.addEventListener('pointerdown',ev=>{if(ev.pointerType!=='touch'&&ev.pointerType!=='pen')return;activeTouchPointers.add(ev.pointerId);if(activeTouchPointers.size!==1){touchPointer=null;return}touchPointer={id:ev.pointerId,x:ev.clientX,y:ev.clientY,t:performance.now()}},{passive:true,capture:true});
 canvas.addEventListener('pointercancel',ev=>{activeTouchPointers.delete(ev.pointerId);if(touchPointer?.id===ev.pointerId)touchPointer=null},{passive:true,capture:true});
 canvas.addEventListener('pointerup',ev=>{if(ev.pointerType!=='touch'&&ev.pointerType!=='pen')return;const start=touchPointer;activeTouchPointers.delete(ev.pointerId);if(!start||start.id!==ev.pointerId){if(activeTouchPointers.size===0)touchPointer=null;return}touchPointer=null;if(activeTouchPointers.size>0)return;const moved=Math.hypot(ev.clientX-start.x,ev.clientY-start.y),elapsed=performance.now()-start.t;if(moved>14||elapsed>850)return;nativeBuildingTap(ev.clientX,ev.clientY,ev)},{passive:true,capture:true});
 container.addEventListener('touchstart',ev=>{if(ev.target?.closest?.('.maplibregl-control-container,.maplibregl-ctrl'))return;if(ev.touches.length!==1){touchNative=null;return}const t=ev.touches[0];touchNative={x:t.clientX,y:t.clientY,t:performance.now()}},{passive:true,capture:true});
 container.addEventListener('touchend',ev=>{if(ev.target?.closest?.('.maplibregl-control-container,.maplibregl-ctrl')){touchNative=null;return}if(!touchNative||ev.changedTouches.length!==1)return;const start=touchNative,t=ev.changedTouches[0];touchNative=null;const moved=Math.hypot(t.clientX-start.x,t.clientY-start.y),elapsed=performance.now()-start.t;if(moved>14||elapsed>850)return;if(performance.now()-lastTouchBuildingAt<250)return;nativeBuildingTap(t.clientX,t.clientY,ev)},{passive:true,capture:true});
 container.addEventListener('touchcancel',()=>{touchNative=null},{passive:true,capture:true});
 map.on('click',e=>{if(performance.now()-lastTouchBuildingAt<700||performance.now()-lastBuildingClickAt<180)return;chooseBuilding(e)});
 map.on('mousemove',e=>{if(hoverFrame)return;const point={x:e.point.x,y:e.point.y};hoverFrame=requestAnimationFrame(()=>{hoverFrame=0;try{const hit=map.queryRenderedFeatures(point,{layers:['gta-exact-building','gta-context-buildings'].filter(id=>map.getLayer(id)&&(map.getLayoutProperty(id,'visibility')||'visible')!=='none')}).length;map.getCanvas().style.cursor=hit?'pointer':''}catch(_){}})});
 const state={version:VERSION,architecture:'MAPLIBRE_CITY_SCALE_COLORED_3D_PLUS_SOURCE_ROOFS_EXACT_REFINEMENT_FREE_FLY',openRuntimeOnly:true,competitorSdk:false,staleWhileRevalidateExact:true,interactionPriorityScheduling:true,mainWebGLCanvases:()=>container.querySelectorAll('canvas').length,get exactCount(){return exactCount},get livingCount(){return livingCount},get moving(){return moving},get terrain(){return terrainOn},get base(){return base},get streetWalk(){return false},get cameraMode(){return window.__BP_CAMERA_MODE__||null},get worldLight(){return window.__BP_WORLD_LIGHT__||null},get buildingShellMode(){return window.__BP_BUILDING_SHELL_MODE__||null},get road3D(){return window.__BP_ROAD3D_STATE__||null},get runtimeErrors(){return runtimeMapErrors.slice(-8)},sources:{map:'MapLibre GL JS',vectors:'OpenFreeMap/OpenStreetMap + BridgePoint exact viewport',globalImagery:'NASA EOSDIS GIBS Blue Marble',usImagery:'USGS The National Map orthoimagery',terrain:'Mapzen Terrain Tiles on AWS Open Data',parcels:'BridgePoint MVT',livingWorld:'BridgePoint living-world viewport v5319'}};
 const api={version:VERSION,map,state,setBase,enterWalk:()=>false,exitWalk:()=>false,walkStep:()=>false,turnWalk:()=>false,refresh:()=>{terrain();exact();livingWorld();lights();updateWorldLight()},selectBuildingAtPoint:point=>chooseBuilding({point,lngLat:map.unproject(point)}),onBuildingSelect:fn=>{buildingSelectHandler=typeof fn==='function'?fn:null;return()=>{if(buildingSelectHandler===fn)buildingSelectHandler=null}}};window[globalKey]=api;if(globalKey==='__bpWorldV2300')window.__bpWorldV2300=api;return api;
}
