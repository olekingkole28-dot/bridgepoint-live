import{VERSION,EDGE,EMPTY,MOBILE,LOW,TIER,rpc,edge,tileTransform,bbox,fc,clamp}from'./world-v2300-config.js';

const OFM='https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf';
const NASA='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';
const USGS='https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}';
const DEM='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const BUILDINGS=`${EDGE}bridgepoint-public-building-tile-v5019?z={z}&x={x}&y={y}&limit=7000&render=5326`;
const PARCELS=`${EDGE}bridgepoint-spatial-tile-v1957?layer=parcels&z={z}&x={x}&y={y}&limit=9000`;
const MAX_EXACT=MOBILE?650:(TIER==='LOW'?900:TIER==='HIGH'?2600:1600);
const DETAIL_MIN=MOBILE?15.6:(TIER==='LOW'?15.4:TIER==='HIGH'?14.25:14.8);
const PARCEL_MIN=MOBILE?12.9:(TIER==='LOW'?13.2:TIER==='HIGH'?12.2:12.6);
const LIGHT_MIN=TIER==='LOW'?16.8:TIER==='HIGH'?15.6:16.1;
const US_BOUNDS=[-125,24,-66,50];

const roadFilter=classes=>['in',['get','class'],['literal',classes]];
const vis=(map,id,on)=>{try{if(!map.getLayer(id))return;const next=on?'visible':'none';if((map.getLayoutProperty(id,'visibility')||'visible')!==next)map.setLayoutProperty(id,'visibility',next)}catch(_){}};
const paint=(map,id,k,v)=>{try{if(map.getLayer(id))map.setPaintProperty(id,k,v)}catch(_){}};

function style(){
 const bType=['downcase',['to-string',['coalesce',['get','facade_material'],['get','building_material'],['get','building_type'],['get','property_type'],['get','building'],['get','class'],['get','type'],'']]];
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
 const civic=['civic-limestone','civic-stone','civic-brick','civic-granite'];
 const neutral=['neutral-warm','neutral-cool','neutral-dark','office-stone','res-tan','brick-tan','office-gray','res-blue','brick-red','glass-smoke'];
 const facadeDetail=['case',
  inType(['brick','masonry']),pick(brick,3),
  inType(['glass']),pick(glass,5),
  inType(['office','commercial','retail','hotel','mixed_use','mixed-use']),pick(office,7),
  inType(['industrial','warehouse','hangar','manufacture','factory']),pick(industrial,11),
  inType(['hospital','school','university','college','civic','public','government','church','cathedral','chapel','mosque','synagogue','temple']),pick(civic,13),
  inType(['wood','timber','residential','apartments','house','detached','semidetached_house','terrace','dormitory','bungalow']),pick(residential,17),
  ['all',old,['<',bHeight,55]],pick(['row-red','row-brown','brick-red','brick-brown','brick-tan','civic-stone','res-cream'],19),
  ['all',modern,veryTall],pick(['glass-blue','glass-teal','glass-silver','glass-green','glass-bronze','glass-ice','office-charcoal'],23),
  ['all',modern,tall],pick(['office-white','office-gray','glass-smoke','glass-blue','office-charcoal','office-sand'],29),
  ['all',mid,tall],pick(['office-stone','office-beige','office-gray','neutral-cool','industrial-gray'],31),
  pick(neutral,37)
 ];
 const solidName=n=>['concat','bpfacade-solid-',n];
 const detailName=n=>['concat','bpfacade-',n];
 const facadePattern=['step',['zoom'],solidName(facadeDetail),15.15,detailName(facadeDetail)];
 const facadeColor=['case',
  inType(['brick','masonry']),pick(['#8b5e50','#7b5046','#9a715f','#5f4c46','#a5664d','#b39a7d'],41),
  inType(['glass']),pick(['#496c7d','#4c777c','#596a72','#78868b','#54766f','#4a5961','#6c8797','#716858'],43),
  inType(['office','commercial','retail','hotel','mixed_use','mixed-use']),pick(['#6a706f','#777063','#8b8b82','#4b5559','#567381','#737f84','#8a806d','#5f666b'],47),
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
  bpBuildings:{type:'vector',tiles:[BUILDINGS],minzoom:10,maxzoom:22,attribution:'BridgePoint public-safe source-backed building geometry · V5019'},
  bpParcels:{type:'vector',tiles:[PARCELS],minzoom:10,maxzoom:22,attribution:'BridgePoint parcel provenance'},
  exact:{type:'geojson',data:EMPTY},exactRoof:{type:'geojson',data:EMPTY},selected:{type:'geojson',data:EMPTY},streetlights:{type:'geojson',data:EMPTY},bpOpportunities:{type:'geojson',data:EMPTY},bpSemanticLabels:{type:'geojson',data:EMPTY},bpLivingWorld:{type:'geojson',data:EMPTY,attribution:'BridgePoint source-backed living-world detail · public/open government and OSM sources'}
 },
 layers:[
  {id:'gta-bg',type:'background',paint:{'background-color':'#071017'}},
  {id:'gta-nasa',type:'raster',source:'nasa',layout:{visibility:'none'},paint:{'raster-opacity':.93,'raster-saturation':-.08,'raster-contrast':.12,'raster-fade-duration':0}},
  {id:'gta-usgs',type:'raster',source:'usgs',layout:{visibility:'none'},paint:{'raster-opacity':['interpolate',['linear'],['zoom'],5,.45,9,.82,13,.96,17,.99],'raster-saturation':-.06,'raster-contrast':.1,'raster-fade-duration':0}},
  {id:'gta-water',type:'fill',source:'ofm','source-layer':'water',paint:{'fill-color':['interpolate',['linear'],['zoom'],2,'#0a3550',10,'#123f58',17,'#174e63'],'fill-opacity':.99}},
  {id:'gta-landcover',type:'fill',source:'ofm','source-layer':'landcover',minzoom:2,paint:{'fill-color':['match',['downcase',['to-string',['coalesce',['get','class'],'']]],['wood','forest'],'#214d32',['grass','meadow'],'#4f713c','farmland','#706741',['wetland','marsh'],'#41695f',['sand','beach'],'#b79d68',['desert','dune'],'#9f7d4b',['bare_rock','rock','scree'],'#68675d',['ice','glacier'],'#cbdde0',['scrub','heath'],'#5f673e','#303a35'],'fill-opacity':['interpolate',['linear'],['zoom'],2,.72,8,.82,13,.92]}},
  {id:'gta-landcover-texture',type:'fill',source:'ofm','source-layer':'landcover',minzoom:9.2,paint:{'fill-pattern':['match',['downcase',['to-string',['coalesce',['get','class'],'']]],['wood','forest'],'bpterrain-forest',['grass','meadow'],'bpterrain-grass','farmland','bpterrain-farm',['wetland','marsh'],'bpterrain-wetland',['sand','beach'],'bpterrain-sand',['desert','dune'],'bpterrain-desert',['bare_rock','rock','scree'],'bpterrain-rock',['scrub','heath'],'bpterrain-scrub','bpterrain-neutral'],'fill-opacity':['interpolate',['linear'],['zoom'],9.2,.18,13,.32,17,.46]}},
  {id:'gta-landuse',type:'fill',source:'ofm','source-layer':'landuse',minzoom:7.5,paint:{'fill-color':['match',['downcase',['to-string',['coalesce',['get','class'],'']]],['park','recreation_ground'],'#285b38','grass','#4c733f','cemetery','#3d5b43','residential','#373b3a','commercial','#44403a','retail','#494039','industrial','#454642','school','#555649','hospital','#55514a','#3b403d'],'fill-opacity':['interpolate',['linear'],['zoom'],7.5,.68,14,.82,18,.9]}},
  {id:'gta-hillshade',type:'hillshade',source:'dem',minzoom:4,paint:{'hillshade-exaggeration':LOW?.42:TIER==='HIGH'?.76:.62,'hillshade-shadow-color':'#11130f','hillshade-highlight-color':'#d6d2bb','hillshade-accent-color':'#686955'}},
  {id:'gta-road-major-shadow',type:'line',source:'ofm','source-layer':'transportation',minzoom:6.5,filter:roadFilter(['motorway','trunk','primary','secondary']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#090b0c','line-width':['interpolate',['exponential',1.35],['zoom'],7,1.8,11,4.4,15,12.5,19,26],'line-opacity':.58,'line-blur':1.5}},
  {id:'gta-road-major-glow',type:'line',source:'ofm','source-layer':'transportation',minzoom:6.5,filter:roadFilter(['motorway','trunk','primary','secondary']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['get','class'],'motorway','#b9afa0','trunk','#aaa79f','primary','#969897','#878c8d'],'line-width':['interpolate',['exponential',1.35],['zoom'],7,1.2,11,3.4,15,10.2,19,21.5],'line-opacity':.98}},
  {id:'gta-road-major',type:'line',source:'ofm','source-layer':'transportation',minzoom:6.5,filter:roadFilter(['motorway','trunk','primary','secondary']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['get','class'],'motorway','#5b5c58','trunk','#565956','primary','#505553','#494f4f'],'line-width':['interpolate',['exponential',1.35],['zoom'],7,.72,11,2.35,15,7.6,19,16.8],'line-opacity':1}},
  {id:'gta-road-major-marking',type:'line',source:'ofm','source-layer':'transportation',minzoom:14,filter:roadFilter(['motorway','trunk','primary','secondary']),layout:{'line-cap':'butt','line-join':'round'},paint:{'line-color':['match',['get','class'],'motorway','#efe2a8','trunk','#ece7d5','#ecebe5'],'line-width':['interpolate',['linear'],['zoom'],14,.42,17,.9,20,1.45],'line-opacity':['interpolate',['linear'],['zoom'],14,.35,16,.74,20,.9],'line-dasharray':[3,4]}},
  {id:'gta-road-local-casing',type:'line',source:'ofm','source-layer':'transportation',minzoom:10.5,filter:roadFilter(['tertiary','minor','service','track']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#8c8981','line-width':['interpolate',['exponential',1.35],['zoom'],10.5,1,14,3.4,17,8.8,20,17.5],'line-opacity':.92}},
  {id:'gta-road-local',type:'line',source:'ofm','source-layer':'transportation',minzoom:10.5,filter:roadFilter(['tertiary','minor','service','track']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['get','class'],'track','#6b6658','service','#4c504e','#454b4a'],'line-width':['interpolate',['exponential',1.35],['zoom'],10.5,.42,14,1.55,17,4.7,20,10.8],'line-opacity':['interpolate',['linear'],['zoom'],10.5,.68,14,.9,17,1]}},
  {id:'gta-road-local-marking',type:'line',source:'ofm','source-layer':'transportation',minzoom:16.2,filter:roadFilter(['tertiary','minor']),layout:{'line-cap':'butt','line-join':'round'},paint:{'line-color':'#deddd4','line-width':['interpolate',['linear'],['zoom'],16.2,.3,20,.8],'line-opacity':.54,'line-dasharray':[2,5]}},
  {id:'gta-bridge-shadow',type:'line',source:'ofm','source-layer':'transportation',minzoom:10.5,filter:['==',['get','brunnel'],'bridge'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#050607','line-width':['interpolate',['exponential',1.3],['zoom'],10.5,3,14,7,17,16,20,29],'line-opacity':.72,'line-blur':2.2,'line-translate':[0,3]}},
  {id:'gta-bridge-deck',type:'line',source:'ofm','source-layer':'transportation',minzoom:10.5,filter:['==',['get','brunnel'],'bridge'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#666661','line-width':['interpolate',['exponential',1.3],['zoom'],10.5,1.8,14,4.8,17,11.5,20,22],'line-opacity':1}},
  {id:'gta-bridge-rails',type:'line',source:'ofm','source-layer':'transportation',minzoom:15,filter:['==',['get','brunnel'],'bridge'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#c8c1ae','line-width':['interpolate',['linear'],['zoom'],15,.5,20,1.2],'line-gap-width':['interpolate',['linear'],['zoom'],15,3.2,20,14],'line-opacity':.84}},
  {id:'gta-rail',type:'line',source:'ofm','source-layer':'transportation',minzoom:11,filter:roadFilter(['rail','transit']),paint:{'line-color':'#f2d88e','line-width':['interpolate',['linear'],['zoom'],11,.4,17,1.7,20,3.5],'line-opacity':.66,'line-dasharray':[2,2]}},
  {id:'gta-waterway',type:'line',source:'ofm','source-layer':'waterway',minzoom:8,paint:{'line-color':'#2bc5ff','line-width':['interpolate',['linear'],['zoom'],8,.4,17,2.5],'line-opacity':.72}},
  {id:'gta-state',type:'line',source:'ofm','source-layer':'boundary',minzoom:2.5,filter:['==',['get','admin_level'],4],paint:{'line-color':'#e6fbff','line-width':['interpolate',['linear'],['zoom'],3,.5,9,1.4,15,2.2],'line-opacity':.84}},
  {id:'gta-county',type:'line',source:'ofm','source-layer':'boundary',minzoom:7,filter:['==',['get','admin_level'],6],paint:{'line-color':'#5c8a93','line-width':.8,'line-opacity':.5,'line-dasharray':[3,2]}},
  {id:'gta-context-building-shadow',type:'fill',source:'ofm','source-layer':'building',minzoom:11.2,paint:{'fill-color':'#020304','fill-opacity':.16,'fill-translate':[5,5],'fill-translate-anchor':'map'}},
  {id:'gta-bp-building-shadow',type:'fill',source:'bpBuildings','source-layer':'buildings',minzoom:11.4,paint:{'fill-color':'#020304','fill-opacity':.2,'fill-translate':[5,5],'fill-translate-anchor':'map'}},
  {id:'gta-exact-building-shadow',type:'fill',source:'exact',minzoom:DETAIL_MIN,paint:{'fill-color':'#010203','fill-opacity':.24,'fill-translate':[5,5],'fill-translate-anchor':'map'}},
  {id:'gta-context-buildings',type:'fill-extrusion',source:'ofm','source-layer':'building',minzoom:11.2,paint:{'fill-extrusion-color':facadeColor,'fill-extrusion-height':['max',4,bHeight],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','render_min_height']],['to-number',['get','min_height']],0]],'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],11.2,.72,13,.86,15,.96,18,.995],...(MOBILE?{}:{'fill-extrusion-pattern':facadePattern}),'fill-extrusion-vertical-gradient':true}},
  {id:'gta-context-roofs',type:'fill-extrusion',source:'ofm','source-layer':'building',minzoom:MOBILE?15.9:14.2,paint:{'fill-extrusion-color':roofColor,...(MOBILE?{}:{'fill-extrusion-pattern':roofPattern}),'fill-extrusion-base':['max',4,bHeight],'fill-extrusion-height':['+',['max',4,bHeight],.24],'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],14.2,.72,16,.9,18,.98],'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-buildings',type:'fill-extrusion',source:'bpBuildings','source-layer':'buildings',minzoom:11.4,paint:{'fill-extrusion-color':facadeColor,'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-base':0,'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],11.4,.91,13,.965,15,.995,18,1],...(MOBILE?{}:{'fill-extrusion-pattern':facadePattern}),'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-roofs',type:'fill-extrusion',source:'bpBuildings','source-layer':'buildings',minzoom:MOBILE?15.8:13.8,paint:{'fill-extrusion-color':roofColor,...(MOBILE?{}:{'fill-extrusion-pattern':roofPattern}),'fill-extrusion-base':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-height':['+',['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],.3],'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],13.8,.8,15,.94,18,.995],'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-building-edge',type:'line',source:'bpBuildings','source-layer':'buildings',minzoom:13.2,paint:{'line-color':['interpolate',['linear'],['zoom'],13.2,'#88aeb7',17,'#b6d4d9',20,'#d5e5e7'],'line-width':['interpolate',['linear'],['zoom'],13.2,.25,18,.7,21,1.05],'line-opacity':['interpolate',['linear'],['zoom'],13.2,.28,17,.46,20,.6]}},
  {id:'gta-opportunity-buildings',type:'fill-extrusion',source:'bpOpportunities',minzoom:11.8,paint:{'fill-extrusion-color':['coalesce',['get','color'],'#7adcf0'],'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-base':0,'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],11.8,.88,14,.96,17,.995],'fill-extrusion-vertical-gradient':true}},
  {id:'gta-parcel-glow',type:'line',source:'bpParcels','source-layer':'parcels',minzoom:PARCEL_MIN,paint:{'line-color':'#26e8ff','line-width':['interpolate',['linear'],['zoom'],PARCEL_MIN,2,17,4.8,21,8],'line-opacity':.17,'line-blur':3}},
  {id:'gta-parcel',type:'line',source:'bpParcels','source-layer':'parcels',minzoom:PARCEL_MIN,paint:{'line-color':['case',['>', ['coalesce',['get','render_score'],0],75],'#ffd15c','#d4fbff'],'line-width':['interpolate',['linear'],['zoom'],PARCEL_MIN,.55,17,1.25,21,2.1],'line-opacity':.94}},
  {id:'gta-exact-building',type:'fill-extrusion',source:'exact',minzoom:DETAIL_MIN,paint:{'fill-extrusion-color':facadeColor,'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','base_height_m']],0]],'fill-extrusion-opacity':.999,...(MOBILE?{}:{'fill-extrusion-pattern':facadePattern}),'fill-extrusion-vertical-gradient':true}},
  {id:'gta-exact-roof',type:'fill-extrusion',source:'exactRoof',minzoom:DETAIL_MIN,paint:{'fill-extrusion-color':roofColor,...(MOBILE?{}:{'fill-extrusion-pattern':roofPattern}),'fill-extrusion-base':['get','roof_base_m'],'fill-extrusion-height':['get','roof_top_m'],'fill-extrusion-opacity':.999,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-building-outline',type:'line',source:'exact',minzoom:DETAIL_MIN,paint:{'line-color':['interpolate',['linear'],['zoom'],14.5,'#9dbbc1',18,'#c7dde1',21,'#e4eff1'],'line-width':['interpolate',['linear'],['zoom'],14.5,.35,18,.9,21,1.35],'line-opacity':['interpolate',['linear'],['zoom'],14.5,.42,18,.62,21,.72]}},
  {id:'gta-context-night-windows',type:'fill-extrusion',source:'ofm','source-layer':'building',minzoom:MOBILE?17.35:15.2,paint:{'fill-extrusion-pattern':nightWindowPattern,'fill-extrusion-height':['max',4,bHeight],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','render_min_height']],['to-number',['get','min_height']],0]],'fill-extrusion-opacity':0,'fill-extrusion-vertical-gradient':false}},
  {id:'gta-bp-night-windows',type:'fill-extrusion',source:'bpBuildings','source-layer':'buildings',minzoom:MOBILE?17.35:15.2,paint:{'fill-extrusion-pattern':nightWindowPattern,'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-base':0,'fill-extrusion-opacity':0,'fill-extrusion-vertical-gradient':false}},
  {id:'gta-exact-night-windows',type:'fill-extrusion',source:'exact',minzoom:MOBILE?17.35:DETAIL_MIN,paint:{'fill-extrusion-pattern':nightWindowPattern,'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','base_height_m']],0]],'fill-extrusion-opacity':0,'fill-extrusion-vertical-gradient':false}},
  {id:'gta-streetlights-glow',type:'circle',source:'streetlights',minzoom:LIGHT_MIN,paint:{'circle-radius':['interpolate',['linear'],['zoom'],LIGHT_MIN,2,18,4.4,21,6],'circle-color':'#fff1a6','circle-opacity':['interpolate',['linear'],['zoom'],LIGHT_MIN,.15,18,.34,21,.48],'circle-blur':.8}},
  {id:'gta-streetlights',type:'circle',source:'streetlights',minzoom:LIGHT_MIN,paint:{'circle-radius':['interpolate',['linear'],['zoom'],LIGHT_MIN,.7,18,1.5,21,2.4],'circle-color':'#fff9d8','circle-opacity':['interpolate',['linear'],['zoom'],LIGHT_MIN,.22,18,.86,21,1]}},
  {id:'gta-water-label',type:'symbol',source:'ofm','source-layer':'water_name',minzoom:5,layout:{'symbol-placement':'point','text-field':['coalesce',['get','name_en'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],5,10,12,12,17,14],'text-allow-overlap':false,'text-ignore-placement':false,'text-padding':8,'symbol-sort-key':['coalesce',['get','rank'],20]},paint:{'text-color':'#7dd9ff','text-halo-color':'rgba(4,14,22,.92)','text-halo-width':1.5,'text-halo-blur':.4}},
  {id:'gta-place-label',type:'symbol',source:'ofm','source-layer':'place',minzoom:3,layout:{'text-field':['coalesce',['get','name_en'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],3,10,6,12,10,14,14,16],'text-variable-anchor':['top','bottom','left','right'],'text-radial-offset':.45,'text-justify':'auto','text-allow-overlap':false,'text-ignore-placement':false,'text-padding':10,'symbol-sort-key':['coalesce',['get','rank'],20]},paint:{'text-color':'#edf9ff','text-halo-color':'rgba(5,12,17,.96)','text-halo-width':2,'text-halo-blur':.5}},
  {id:'gta-road-label-major',type:'symbol',source:'ofm','source-layer':'transportation_name',minzoom:9,filter:['match',['get','class'],['motorway','trunk','primary','secondary','tertiary'],true,false],layout:{'symbol-placement':'line','symbol-spacing':420,'text-field':['coalesce',['get','name_en'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],9,10,13,11.5,17,13.5,20,15],'text-rotation-alignment':'map','text-allow-overlap':false,'text-ignore-placement':false,'text-padding':12},paint:{'text-color':'#d9f7fb','text-halo-color':'rgba(4,11,16,.96)','text-halo-width':2,'text-halo-blur':.35}},
  {id:'gta-road-label-local',type:'symbol',source:'ofm','source-layer':'transportation_name',minzoom:14.2,filter:['match',['get','class'],['minor','service','track','path'],true,false],layout:{'symbol-placement':'line','symbol-spacing':520,'text-field':['coalesce',['get','name_en'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],14.2,10,18,12.5,21,14],'text-rotation-alignment':'map','text-allow-overlap':false,'text-ignore-placement':false,'text-padding':10},paint:{'text-color':'#a9c7d0','text-halo-color':'rgba(5,12,17,.96)','text-halo-width':1.8}},
  {id:'gta-bp-sidewalk-casing',type:'line',source:'bpLivingWorld',minzoom:14.5,filter:['any',['in',['get','class'],['literal',['footway','pedestrian','path','cycleway','steps','living_street']]],['==',['get','layer_key'],'SIDEWALKS_PARKING'],['==',['get','layer_key'],'SURFACE_MATERIAL_FINE']],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#343431','line-width':['interpolate',['linear'],['zoom'],14.5,1.2,17,3.8,20,8.5],'line-opacity':.95}},
  {id:'gta-bp-sidewalk',type:'line',source:'bpLivingWorld',minzoom:14.5,filter:['any',['in',['get','class'],['literal',['footway','pedestrian','path','cycleway','steps','living_street']]],['==',['get','layer_key'],'SIDEWALKS_PARKING'],['==',['get','layer_key'],'SURFACE_MATERIAL_FINE']],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['downcase',['to-string',['coalesce',['get','surface'],['get','subtype'],'']]],['concrete','paved'],'#b9b5aa','paving_stones','#aa9f8c','asphalt','#696d6b',['gravel','fine_gravel','compacted'],'#9c927c',['dirt','ground','unpaved'],'#816d50','brick','#9a6d58','wood','#765e46','grass','#698155','#99978e'],'line-width':['interpolate',['linear'],['zoom'],14.5,.6,17,2.5,20,6.2],'line-opacity':.98}},
  {id:'gta-bp-pools',type:'fill',source:'bpLivingWorld',minzoom:15,filter:['==',['get','layer_key'],'POOLS_PROPERTY_WATER'],paint:{'fill-color':'#328fbd','fill-opacity':.88,'fill-outline-color':'#a7ddec'}},
  {id:'gta-bp-barriers',type:'line',source:'bpLivingWorld',minzoom:15,filter:['==',['get','layer_key'],'BARRIERS_WALLS_FENCES'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['downcase',['to-string',['coalesce',['get','class'],'']]],'wall','#8f8270','retaining_wall','#80786b','gate','#a79b83','bollard','#b2a98f','fence','#77766d','#77766d'],'line-width':['interpolate',['linear'],['zoom'],15,.65,18,1.6,20,2.5],'line-opacity':.9}},
  {id:'gta-bp-property-improvements',type:'fill-extrusion',source:'bpLivingWorld',minzoom:15.2,filter:['==',['get','layer_key'],'PROPERTY_IMPROVEMENTS_FINE'],paint:{'fill-extrusion-color':['match',['downcase',['to-string',['coalesce',['get','class'],'']]],'greenhouse','#7b9b8c',['shed','garage','carport'],'#716b60','barn','#765b49',['silo','storage_tank','water_tower'],'#7b8280','chimney','#6b625b','#706d63'],'fill-extrusion-height':['coalesce',['to-number',['get','height_m']],['match',['downcase',['to-string',['coalesce',['get','class'],'']]],'greenhouse',3,'shed',2.8,'garage',3.2,'carport',2.7,'barn',7,'silo',12,'storage_tank',8,'water_tower',18,'chimney',8,3]],'fill-extrusion-opacity':.94,'fill-extrusion-vertical-gradient':true}},
  {id:'gta-bp-rooftop-solar',type:'fill',source:'bpLivingWorld',minzoom:16.5,filter:['==',['get','layer_key'],'ROOFTOP_SOLAR_DETAIL'],paint:{'fill-color':'#244c68','fill-opacity':.95,'fill-outline-color':'#759ab1'}},
  {id:'gta-bp-rocks',type:'circle',source:'bpLivingWorld',minzoom:15.5,filter:['==',['get','layer_key'],'ROCKS_BOULDERS_CLIFFS'],paint:{'circle-radius':['interpolate',['linear'],['zoom'],15.5,2.2,19,5.5],'circle-color':'#716e64','circle-stroke-color':'#9c988a','circle-stroke-width':.8,'circle-opacity':.95}},
  {id:'gta-bp-tree-trunks',type:'circle',source:'bpLivingWorld',minzoom:16,filter:['==',['get','layer_key'],'TREE_OBJECTS_3D'],paint:{'circle-radius':['interpolate',['linear'],['zoom'],16,1,20,2.4],'circle-color':'#614a33','circle-opacity':.95}},
  {id:'gta-bp-tree-crowns',type:'circle',source:'bpLivingWorld',minzoom:16,filter:['==',['get','layer_key'],'TREE_OBJECTS_3D'],paint:{'circle-radius':['interpolate',['linear'],['zoom'],16,3,18,6,20,10],'circle-color':['interpolate',['linear'],['coalesce',['to-number',['get','height_m']],8],2,'#668c4d',8,'#47743f',20,'#315f37',35,'#294f31'],'circle-stroke-color':'#24472c','circle-stroke-width':1,'circle-opacity':.9,'circle-blur':.05}},
  {id:'gta-bp-infra-points',type:'circle',source:'bpLivingWorld',minzoom:16,filter:['in',['get','layer_key'],['literal',['STREETLIGHTS_SIGNALS','BASE_INFRASTRUCTURE']]],paint:{'circle-radius':['interpolate',['linear'],['zoom'],16,1.8,20,3.5],'circle-color':'#b6aa7f','circle-stroke-color':'#222a2a','circle-stroke-width':1,'circle-opacity':.9}},
  {id:'gta-bp-landmarks',type:'symbol',source:'bpLivingWorld',minzoom:15,filter:['==',['get','layer_key'],'LANDMARK_OBJECTS_FINE'],layout:{'icon-image':['case',['in',['downcase',['to-string',['coalesce',['get','subtype'],'']]],['literal',['statue','sculpture','artwork']]],'bp-landmark-statue','bp-landmark-monument'],'icon-size':['interpolate',['linear'],['zoom'],15,.65,19,1.05],'icon-anchor':'bottom','icon-allow-overlap':false,'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],15,9.5,19,13],'text-variable-anchor':['top','left','right'],'text-radial-offset':1,'text-optional':true},paint:{'text-color':'#e4ddca','text-halo-color':'rgba(8,11,11,.96)','text-halo-width':2}},
  {id:'gta-poi-probe',type:'circle',source:'ofm','source-layer':'poi',minzoom:12.5,paint:{'circle-radius':3,'circle-color':'#ffffff','circle-opacity':.001,'circle-stroke-opacity':0}},
  {id:'gta-landmark-monuments',type:'symbol',source:'ofm','source-layer':'poi',minzoom:14,filter:['any',['in',['get','class'],['literal',['monument','memorial','attraction','artwork']]],['in',['get','subclass'],['literal',['monument','memorial','statue','sculpture','artwork','fountain']]]],layout:{'icon-image':['case',['in',['get','subclass'],['literal',['statue','sculpture','artwork']]],'bp-landmark-statue','bp-landmark-monument'],'icon-size':['interpolate',['linear'],['zoom'],14,.62,18,.9,20,1.1],'icon-anchor':'bottom','icon-allow-overlap':false,'text-field':['coalesce',['get','name_en'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],14,9.5,18,12.5,20,14],'text-variable-anchor':['top','left','right'],'text-radial-offset':1.1,'text-optional':true},paint:{'text-color':'#e6dfcd','text-halo-color':'rgba(10,12,12,.96)','text-halo-width':2}},
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
 const solid=id.includes('bpfacade-solid-'),kind=id.replace('bpfacade-solid-','').replace('bpfacade-','');
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
  'civic-limestone':['#9a9078','#504b43','#cec3a8','#7d735f','civic'],
  'civic-stone':['#7c7b73','#464948','#b5b2a7','#64645e','civic'],
  'civic-brick':['#7f594e','#41383a','#b88b76','#62443d','civic'],
  'civic-granite':['#73716b','#404445','#a8a49a','#5a5955','civic'],
  'neutral-warm':['#75695d','#393a3a','#aaa08f','#5a5148','office'],
  'neutral-cool':['#637077','#303b41','#98a5a8','#4d5b61','office'],
  'neutral-dark':['#4f5555','#242c30','#858b88','#3d4343','office']
 };
 const p=specs[kind]||specs['neutral-cool'],mode=p[4];x.fillStyle=p[0];x.fillRect(0,0,size,size);
 if(solid)return x.getImageData(0,0,size,size);
 const win=(xx,yy,w,h,lit=false)=>{x.fillStyle=p[1];x.fillRect(xx,yy,w,h);x.fillStyle=p[2];x.globalAlpha=lit?.42:.24;x.fillRect(xx+1,yy+1,Math.max(1,w-2),Math.min(3,h-2));x.globalAlpha=1};
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
  x.strokeStyle=p[3];x.globalAlpha=.55;for(let xx=0;xx<size;xx+=6){x.beginPath();x.moveTo(xx+.5,0);x.lineTo(xx+.5,size);x.stroke()}x.globalAlpha=1;
  for(let xx=10;xx<size;xx+=26){win(xx,17,14,9);win(xx,48,14,9)}x.fillStyle=p[3];x.fillRect(7,72,21,24);x.fillRect(55,70,26,26);
 } else if(mode==='civic'){
  x.strokeStyle=p[3];x.globalAlpha=.5;for(let y=0;y<size;y+=20){x.beginPath();x.moveTo(0,y+.5);x.lineTo(size,y+.5);x.stroke()}for(let xx=0;xx<size;xx+=24){x.beginPath();x.moveTo(xx+.5,0);x.lineTo(xx+.5,size);x.stroke()}x.globalAlpha=1;
  for(let y=12;y<size;y+=30)for(let xx=8;xx<size;xx+=24)win(xx,y,10,16,true);
 } else {
  x.strokeStyle=p[3];x.globalAlpha=.35;for(let y=0;y<size;y+=12){x.beginPath();x.moveTo(0,y+.5);x.lineTo(size,y+.5);x.stroke()}x.globalAlpha=1;
  const rows=mode==='res'?[12,39,66]:[12,34,56,78];for(const y of rows)for(let xx=7;xx<size;xx+=20)win(xx,y,10,10,(xx+y)%4===0);
  if(mode==='res'){x.strokeStyle=p[2];x.globalAlpha=.25;for(let y=25;y<size;y+=28){x.beginPath();x.moveTo(0,y);x.lineTo(size,y);x.stroke()}x.globalAlpha=1}
 }
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
function installBuildingMaterials(map){
 const facadeKinds=['res-cream','res-sage','res-blue','res-tan','res-rose','res-white','res-charcoal','row-red','row-brown','row-cream','brick-red','brick-brown','brick-tan','brick-dark','brick-orange','brick-cream','glass-blue','glass-teal','glass-smoke','glass-silver','glass-green','glass-bronze','glass-ice','office-stone','office-beige','office-white','office-charcoal','office-sand','office-gray','industrial-gray','industrial-blue','industrial-tan','industrial-white','industrial-green','industrial-rust','civic-limestone','civic-stone','civic-brick','civic-granite','neutral-warm','neutral-cool','neutral-dark'];
 const roofKinds=['roof-membrane-dark','roof-membrane-light','roof-gravel','roof-shingle-gray','roof-shingle-brown','roof-metal-dark','roof-metal-silver','roof-tile-red','roof-tile-brown','roof-slate'];
 const facadeIds=facadeKinds.flatMap(k=>['bpfacade-solid-'+k,'bpfacade-'+k]),roofIds=roofKinds.map(k=>'bproof-'+k),windowIds=['bp-window-night-warm','bp-window-night-cool','bp-window-night-mixed'];
 const add=id=>{try{if(map.hasImage(id))return;if(id.startsWith('bproof-'))map.addImage(id,roofPatternImage(id),{pixelRatio:2});else if(id.startsWith('bp-window-night-'))map.addImage(id,nightWindowPatternImage(id),{pixelRatio:2});else map.addImage(id,facadePatternImage(id),{pixelRatio:2})}catch(e){console.warn('BridgePoint building material',id,e)}};
 map.on('styleimagemissing',e=>{const id=String(e.id||'');if(id.startsWith('bpfacade-')||id.startsWith('bproof-')||id.startsWith('bp-window-night-'))add(id)});
 for(const id of [...facadeIds,...roofIds,...windowIds])add(id);
 window.__BP_BUILDING_MATERIALS__={version:'v5326',mode:'rendered-vector-3d',aerialBase:false,roofCaps:true,directionalLight:true,facadeTextures:true,facadeArchetypes:facadeKinds.length,roofArchetypes:roofKinds.length,deterministicPerBuilding:true,globalStyle:true,updatedAt:Date.now()}
}

function surfacePatternImage(id){
 const size=64,c=document.createElement('canvas');c.width=size;c.height=size;const x=c.getContext('2d'),kind=id.replace('bpterrain-','');
 const pal={forest:['#214d32','#173c28','#345d3a'],grass:['#55753e','#446532','#6d844d'],farm:['#756a43','#665b38','#897a50'],wetland:['#486b61','#35564f','#6f8170'],sand:['#b79c68','#a48655','#ccb17a'],desert:['#9d7a4b','#88633b','#b48d58'],rock:['#66655c','#51524d','#7a776c'],scrub:['#5e673e','#4b5732','#72784c'],neutral:['#3a403b','#303631','#464b45']};
 const p=pal[kind]||pal.neutral;x.fillStyle=p[0];x.fillRect(0,0,size,size);
 if(kind==='forest'){for(let y=4;y<64;y+=9)for(let xx=((y/9)%2)*5;xx<64;xx+=10){x.fillStyle=((xx+y)%3)?p[1]:p[2];x.beginPath();x.arc(xx,y,2.2,0,Math.PI*2);x.fill()}}
 else if(kind==='grass'||kind==='scrub'){x.strokeStyle=p[2];x.globalAlpha=.42;for(let i=0;i<70;i++){const xx=(i*17)%64,y=(i*29)%64;x.beginPath();x.moveTo(xx,y+3);x.lineTo(xx+1,y);x.stroke()}x.globalAlpha=1}
 else if(kind==='farm'){x.strokeStyle=p[1];x.globalAlpha=.55;for(let y=2;y<64;y+=7){x.beginPath();x.moveTo(0,y);x.lineTo(64,y+8);x.stroke()}x.globalAlpha=1}
 else if(kind==='wetland'){x.strokeStyle=p[2];x.globalAlpha=.45;for(let y=6;y<64;y+=12){x.beginPath();x.moveTo(0,y);x.bezierCurveTo(14,y-3,28,y+3,42,y);x.bezierCurveTo(50,y-2,57,y+2,64,y);x.stroke()}x.globalAlpha=1}
 else if(kind==='sand'||kind==='desert'){x.fillStyle=p[2];x.globalAlpha=.3;for(let i=0;i<80;i++){x.fillRect((i*23)%64,(i*37)%64,1,1)}x.globalAlpha=1}
 else if(kind==='rock'){x.strokeStyle=p[2];x.globalAlpha=.36;for(let i=0;i<28;i++){const xx=(i*19)%64,y=(i*31)%64;x.strokeRect(xx,y,3+(i%4),2+(i%3))}x.globalAlpha=1}
 return x.getImageData(0,0,size,size)
}
function landmarkIconImage(kind){
 const size=56,c=document.createElement('canvas');c.width=size;c.height=size;const x=c.getContext('2d');x.clearRect(0,0,size,size);
 x.strokeStyle='#e4dcc5';x.fillStyle='#8f8268';x.lineWidth=2.2;x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=3;
 if(kind==='statue'){x.fillRect(19,38,18,6);x.fillRect(22,32,12,6);x.beginPath();x.arc(28,13,4,0,Math.PI*2);x.fill();x.beginPath();x.moveTo(25,17);x.lineTo(21,31);x.lineTo(26,31);x.lineTo(28,23);x.lineTo(31,31);x.lineTo(36,31);x.lineTo(31,17);x.closePath();x.fill()}
 else{x.fillRect(17,40,22,5);x.fillRect(21,34,14,6);x.beginPath();x.moveTo(28,9);x.lineTo(38,34);x.lineTo(18,34);x.closePath();x.fill();x.stroke()}
 return x.getImageData(0,0,size,size)
}
function installWorldMaterials(map){
 const terrain=['forest','grass','farm','wetland','sand','desert','rock','scrub','neutral'];
 const addTerrain=id=>{try{if(!map.hasImage(id))map.addImage(id,surfacePatternImage(id),{pixelRatio:2})}catch(e){console.warn('BridgePoint surface',id,e)}};
 for(const k of terrain)addTerrain('bpterrain-'+k);
 for(const [id,kind] of [['bp-landmark-monument','monument'],['bp-landmark-statue','statue']]){try{if(!map.hasImage(id))map.addImage(id,landmarkIconImage(kind),{pixelRatio:2})}catch(e){console.warn('BridgePoint landmark',id,e)}}
 map.on('styleimagemissing',e=>{const id=String(e.id||'');if(id.startsWith('bpterrain-'))addTerrain(id)});
 window.__BP_WORLD_MATERIALS__={version:'v5326',biomes:true,physicalRoads:true,bridgeDecks:true,landmarks:true,updatedAt:Date.now()}
}

function roadLights(map){if(map.getZoom()<LIGHT_MIN)return EMPTY;let fs=[];try{fs=map.queryRenderedFeatures({layers:['gta-road-major','gta-road-local']})||[]}catch(_){return EMPTY}const pts=[],seen=new Set(),max=MOBILE?260:(TIER==='LOW'?320:TIER==='HIGH'?900:560);for(const f of fs){const g=f.geometry,lines=g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];for(const line of lines){const step=Math.max(4,Math.ceil(line.length/(MOBILE?6:10)));for(let i=0;i<line.length&&pts.length<max;i+=step){const c=line[i],k=`${c[0].toFixed(5)}|${c[1].toFixed(5)}`;if(seen.has(k))continue;seen.add(k);pts.push({type:'Feature',properties:{kind:'streetlight'},geometry:{type:'Point',coordinates:c}})}}}return fc(pts)}

export function initWorld(options={}){
 const containerId=String(options.containerId||'liveMap'),globalKey=String(options.globalKey||'__bpWorldV2300'),container=document.getElementById(containerId);if(!container||!window.maplibregl)return null;if(window[globalKey]?.map)return window[globalKey];container.innerHTML='';
 const initialCenter=Array.isArray(options.center)&&options.center.length===2?options.center:[-98.5,39.5],initialZoom=Number.isFinite(options.zoom)?Number(options.zoom):(MOBILE?2.75:3.35),initialPitch=Number.isFinite(options.pitch)?Number(options.pitch):0,initialBearing=Number.isFinite(options.bearing)?Number(options.bearing):0,projectionType=String(options.projection||((MOBILE||options.preview)?'mercator':'globe'));
 const map=new maplibregl.Map({container,style:style(),center:initialCenter,zoom:initialZoom,pitch:initialPitch,bearing:initialBearing,minZoom:2.2,maxZoom:21,projection:{type:projectionType},pixelRatio:MOBILE?1:Math.min(window.devicePixelRatio||1,2),antialias:!MOBILE&&!LOW,fadeDuration:0,renderWorldCopies:false,transformRequest:tileTransform,maxTileCacheSize:MOBILE?180:(TIER==='LOW'?110:TIER==='HIGH'?280:180),refreshExpiredTiles:false,cancelPendingTileRequestsWhileZooming:false});
 try{map.touchZoomRotate?.enable();map.touchZoomRotate?.enableRotation?.();map.dragPan?.enable();map.scrollZoom?.enable();map.doubleClickZoom?.enable();map.keyboard?.enable();map.boxZoom?.enable()}catch(_){};
 map.addControl(new maplibregl.NavigationControl({visualizePitch:true,showCompass:true}),'top-right');
 let detailSeq=0,livingSeq=0,detailTimer=0,lightTimer=0,solarTimer=0,parcelPulseTimer=0,parcelPulsePhase=0,hoverFrame=0,exactCount=0,livingCount=0,base='gta',moving=false,terrainOn=false,walkMode=false,workerReq=0,lastTouchBuildingAt=0,lastBuildingClickAt=0,touchPointer=null,touchNative=null,buildingSelectHandler=null,activeTouchPointers=new Set(),lastExactFetchAt=0,lastLivingFetchAt=0,streetPhotoState={sequenceId:null,frames:[],index:-1,loadedCenter:null,loading:false},layerState={parcels:false,buildings:true};const worker=new Worker('./world-v2300-worker.js?v=5312',{type:'module'}),workerWait=new Map();
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
   const windowOpacity=alt>2?0:clamp((-alt+2)/16,.08,.72);for(const id of ['gta-context-night-windows','gta-bp-night-windows','gta-exact-night-windows'])paint(map,id,'fill-extrusion-opacity',windowOpacity);
   window.__BP_WORLD_LIGHT__={version:5321,sunAltitude:alt,sunAzimuth:sun.az,daylight:day,night:night>0.55,twilight,moonlight:night>0.45,updatedAt:Date.now()}
  }catch(e){console.warn('BridgePoint world light',e)}
 }
 function sky(){updateWorldLight();clearInterval(solarTimer);solarTimer=setInterval(updateWorldLight,60000)}
 function terrain(){const should=map.getZoom()>=6.5;try{if(should&&!terrainOn){map.setTerrain({source:'dem',exaggeration:LOW?1:TIER==='HIGH'?1.32:1.16});terrainOn=true}else if(!should&&terrainOn){map.setTerrain(null);terrainOn=false}}catch(_){terrainOn=false}}
 function setBase(next){base=next==='satellite'?'satellite':'gta';const sat=base==='satellite';vis(map,'gta-nasa',sat);vis(map,'gta-usgs',sat);paint(map,'gta-landcover','fill-opacity',sat?['interpolate',['linear'],['zoom'],2,.22,8,.12,12,.035,15,0]:['interpolate',['linear'],['zoom'],2,.58,8,.75,13,.84]);paint(map,'gta-landuse','fill-opacity',sat?.06:.72);document.querySelectorAll('[data-base]').forEach(b=>b.classList.toggle('active',b.dataset.base===base));map.triggerRepaint()}
 async function exact(){const z=map.getZoom();if(z<DETAIL_MIN||moving)return;const seq=++detailSeq,b=bbox(map,.13);lastExactFetchAt=performance.now();try{const d=await rpc('bridgepoint_building_viewport_v2300',{p_west:b.west,p_south:b.south,p_east:b.east,p_north:b.north,p_limit:MAX_EXACT},9000);if(seq!==detailSeq||moving)return;const p=await prepare(d?.features||[],MAX_EXACT);if(seq!==detailSeq||moving)return;if((p.buildings?.features?.length||0)>0){map.getSource('exact')?.setData(p.buildings);map.getSource('exactRoof')?.setData(p.roofs||EMPTY);exactCount=Number(p.count||0)}setStatus(`BridgePoint World · persistent detail · ${exactCount.toLocaleString()} exact buildings retained · instant refinement ready`)}catch(e){if(seq===detailSeq)setStatus(`BridgePoint World · persistent detail retained · background refinement retrying`) }}
 async function livingWorld(){
  if(map.getZoom()<14.2||moving)return;const seq=++livingSeq,b=bbox(map,MOBILE?.075:.11);lastLivingFetchAt=performance.now();
  try{
   const d=await edge('bridgepoint-living-world-viewport-v5319',{west:b.west,south:b.south,east:b.east,north:b.north,limit:MOBILE?900:(TIER==='HIGH'?2400:1700)},8500);
   if(seq!==livingSeq||moving)return;
   const data=d?.type==='FeatureCollection'?d:EMPTY;if((data?.features?.length||0)>0){map.getSource('bpLivingWorld')?.setData(data);livingCount=Number(data.features.length)}
   window.__BP_LIVING_WORLD_STATE__={status:'ready',count:livingCount,viewport:{west:b.west,south:b.south,east:b.east,north:b.north},updatedAt:Date.now()}
  }catch(e){
   if(seq!==livingSeq)return;window.__BP_LIVING_WORLD_STATE__={status:'error',count:livingCount,error:String(e?.message||e),updatedAt:Date.now()}
  }
 }
 function scheduleLivingWorld(delay=MOBILE?75:45){clearTimeout(map.__bpLivingTimer);if(map.getZoom()<14.2)return;map.__bpLivingTimer=setTimeout(()=>{if(!moving)livingWorld()},delay)}
 function lights(delay=MOBILE?55:35){clearTimeout(lightTimer);lightTimer=setTimeout(()=>{if(moving)return;map.getSource('streetlights')?.setData(roadLights(map));updateWorldLight()},delay)}
 function scheduleExact(delay=MOBILE?65:40){clearTimeout(detailTimer);detailTimer=setTimeout(()=>{if(!moving)exact()},delay)}
 function startParcelFlow(){clearInterval(parcelPulseTimer);parcelPulseTimer=setInterval(()=>{if(moving||!layerState.parcels||map.getZoom()<PARCEL_MIN)return;parcelPulsePhase=(parcelPulsePhase+1)%16;const t=(Math.sin((parcelPulsePhase/16)*Math.PI*2)+1)/2;paint(map,'gta-parcel-glow','line-opacity',.11+.18*t);paint(map,'gta-parcel-glow','line-blur',2.1+2.4*t);paint(map,'gta-parcel','line-opacity',.82+.16*t)},260)}
 function movement(on){
  moving=on;
  if(on){
   clearTimeout(detailTimer);clearTimeout(map.__bpLivingTimer);clearTimeout(lightTimer);
   return
  }
  terrain();scheduleExact(MOBILE?45:25);scheduleLivingWorld(MOBILE?60:35);lights(MOBILE?70:40)
 }
 function toggleLayer(name,on){if(name==='parcels'){layerState.parcels=!!on;for(const id of ['gta-parcel','gta-parcel-glow'])vis(map,id,on);if(on)startParcelFlow()}if(name==='buildings'){layerState.buildings=!!on;for(const id of ['gta-context-buildings','gta-context-roofs','gta-bp-buildings','gta-bp-roofs','gta-bp-building-edge','gta-exact-building','gta-exact-roof','gta-building-outline'])vis(map,id,on)}}
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
 function streetPhotoUrl(p){if(!p)return'';return p.fileurlProc||p.fileurlLTh||p.fileurlTh||String(p.fileurl||'').replace('[[sizeprefix]]','wrapped_proc')}
 function updateStreetPhotoPanel(){
  const panel=document.getElementById('bpStreetPhotoPanel'),img=document.getElementById('bpStreetPhotoImg'),meta=document.getElementById('bpStreetPhotoMeta');if(!panel||!img||!meta)return;
  const p=streetPhotoState.frames[streetPhotoState.index],url=streetPhotoUrl(p);if(!walkMode||!p||!url){panel.style.display='none';img.removeAttribute('src');return}
  panel.style.display='block';if(img.src!==url)img.src=url;const shot=p.shotDate||p.dateAdded||'';meta.textContent=`REAL STREET PHOTO · ${shot?String(shot).slice(0,10)+' · ':''}© Grab and KartaView Contributors`
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
 function exitWalk(){walkMode=false;map.easeTo({pitch:58,zoom:Math.min(map.getZoom(),18.2),duration:LOW?220:420});updateWalkUI();setStatus('Street Walk off · BridgePoint 3D world');window.__BP_STREET_WALK__={active:false,mode:'hybrid-3d-plus-public-street-imagery',photoProvider:'KartaView',updatedAt:Date.now()}}
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
  if(!document.getElementById('bpStreetPhotoPanel')){const photo=document.createElement('div');photo.id='bpStreetPhotoPanel';Object.assign(photo.style,{position:'absolute',left:'10px',right:'10px',bottom:'160px',zIndex:'17',display:'none',overflow:'hidden',borderRadius:'16px',background:'#090b0c',border:'1px solid rgba(230,226,211,.28)',boxShadow:'0 12px 36px rgba(0,0,0,.45)'});const img=document.createElement('img');img.id='bpStreetPhotoImg';img.alt='KartaView street-level imagery';Object.assign(img.style,{display:'block',width:'100%',height:MOBILE?'27vh':'34vh',objectFit:'cover',background:'#111'});const foot=document.createElement('div');Object.assign(foot.style,{display:'flex',justifyContent:'space-between',gap:'8px',alignItems:'center',padding:'7px 10px',fontSize:'10px',letterSpacing:'.04em',color:'#d9d5c8',background:'rgba(8,10,11,.96)'});const meta=document.createElement('span');meta.id='bpStreetPhotoMeta';const credit=document.createElement('span');credit.textContent='KartaView';credit.style.color='#9bd6df';foot.append(meta,credit);photo.append(img,foot);container.appendChild(photo)}
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
 function chooseBuilding(e){if(window.__BP_MEASURE_ACTIVE__)return false;const layers=['gta-opportunity-buildings','gta-exact-building','gta-bp-buildings','gta-context-buildings'].filter(id=>map.getLayer(id));let f=Array.isArray(e?.features)?e.features.find(x=>layers.includes(x?.layer?.id))||null:null;try{if(!f)f=map.queryRenderedFeatures(e.point,{layers})[0]||null}catch(_){}if(!f)return false;lastBuildingClickAt=performance.now();const p={...(f.properties||{})};if(!p.render_height_m)p.render_height_m=Number(p.height||p.render_height||8.5);const ll=e.lngLat||map.unproject(e.point),feature={type:'Feature',geometry:f.geometry,properties:p,id:f.id,layer:{id:f.layer?.id||''}},z=Math.max(map.getZoom(),16.6);map.easeTo({center:ll,zoom:clamp(z,15,19),pitch:64,bearing:map.getBearing(),duration:LOW?260:520});const detail={lngLat:ll,feature};if(typeof window.__BP_V5000_SELECT_BUILDING__==='function'){try{window.__BP_V5000_SELECT_BUILDING__(detail)}catch(err){console.warn('v5000 building selector',err)}}else if(typeof buildingSelectHandler==='function'){try{buildingSelectHandler(detail)}catch(err){console.warn('building selection handler',err)}}window.dispatchEvent(new CustomEvent('bp2300:building-click',{detail}));return true}
 function bindBuildingHitLayers(){for(const id of ['gta-opportunity-buildings','gta-exact-building','gta-bp-buildings','gta-context-buildings']){if(!map.getLayer(id))continue;map.on('click',id,e=>chooseBuilding(e));map.on('mouseenter',id,()=>{map.getCanvas().style.cursor='pointer'});map.on('mouseleave',id,()=>{map.getCanvas().style.cursor=''})}} map.on('load',()=>{installBridgePointIcons(map);installBuildingMaterials(map);installWorldMaterials(map);sky();terrain();bindUI();installWalkUI();bindBuildingHitLayers();setBase('gta');startParcelFlow();setTimeout(scheduleExact,MOBILE?1200:500);setTimeout(scheduleLivingWorld,MOBILE?1450:620);setTimeout(lights,MOBILE?1600:700);setStatus('BridgePoint World v5326 · per-building identity styling · age-aware facades · distinct roofs')});
 map.on('movestart',()=>movement(true));map.on('moveend',()=>movement(false));map.on('zoomend',()=>{terrain();if(!moving)updateWorldLight()});
 const canvas=map.getCanvas();
 const nativeBuildingTap=(clientX,clientY,originalEvent)=>{const r=canvas.getBoundingClientRect(),point={x:clientX-r.left,y:clientY-r.top};if(point.x<0||point.y<0||point.x>r.width||point.y>r.height)return false;const hit=chooseBuilding({point,lngLat:map.unproject(point),originalEvent});if(hit)lastTouchBuildingAt=performance.now();return hit};
 canvas.addEventListener('pointerdown',ev=>{if(ev.pointerType!=='touch'&&ev.pointerType!=='pen')return;activeTouchPointers.add(ev.pointerId);if(activeTouchPointers.size!==1){touchPointer=null;return}touchPointer={id:ev.pointerId,x:ev.clientX,y:ev.clientY,t:performance.now()}},{passive:true,capture:true});
 canvas.addEventListener('pointercancel',ev=>{activeTouchPointers.delete(ev.pointerId);if(touchPointer?.id===ev.pointerId)touchPointer=null},{passive:true,capture:true});
 canvas.addEventListener('pointerup',ev=>{if(ev.pointerType!=='touch'&&ev.pointerType!=='pen')return;const start=touchPointer;activeTouchPointers.delete(ev.pointerId);if(!start||start.id!==ev.pointerId){if(activeTouchPointers.size===0)touchPointer=null;return}touchPointer=null;if(activeTouchPointers.size>0)return;const moved=Math.hypot(ev.clientX-start.x,ev.clientY-start.y),elapsed=performance.now()-start.t;if(moved>14||elapsed>850)return;nativeBuildingTap(ev.clientX,ev.clientY,ev)},{passive:true,capture:true});
 container.addEventListener('touchstart',ev=>{if(ev.target?.closest?.('.maplibregl-control-container,.maplibregl-ctrl'))return;if(ev.touches.length!==1){touchNative=null;return}const t=ev.touches[0];touchNative={x:t.clientX,y:t.clientY,t:performance.now()}},{passive:true,capture:true});
 container.addEventListener('touchend',ev=>{if(ev.target?.closest?.('.maplibregl-control-container,.maplibregl-ctrl')){touchNative=null;return}if(!touchNative||ev.changedTouches.length!==1)return;const start=touchNative,t=ev.changedTouches[0];touchNative=null;const moved=Math.hypot(t.clientX-start.x,t.clientY-start.y),elapsed=performance.now()-start.t;if(moved>14||elapsed>850)return;if(performance.now()-lastTouchBuildingAt<250)return;nativeBuildingTap(t.clientX,t.clientY,ev)},{passive:true,capture:true});
 container.addEventListener('touchcancel',()=>{touchNative=null},{passive:true,capture:true});
 map.on('click',e=>{if(performance.now()-lastTouchBuildingAt<700||performance.now()-lastBuildingClickAt<180)return;chooseBuilding(e)});
 map.on('mousemove',e=>{if(hoverFrame)return;const point={x:e.point.x,y:e.point.y};hoverFrame=requestAnimationFrame(()=>{hoverFrame=0;try{const hit=map.queryRenderedFeatures(point,{layers:['gta-opportunity-buildings','gta-exact-building','gta-bp-buildings','gta-context-buildings'].filter(id=>map.getLayer(id))}).length;map.getCanvas().style.cursor=hit?'pointer':''}catch(_){}})});
 const state={version:VERSION,architecture:'MAPLIBRE_MVT_QUADTREE_LOD_PLUS_EXACT_VIEWPORT_WORKER',openRuntimeOnly:true,competitorSdk:false,staleWhileRevalidateExact:true,interactionPriorityScheduling:true,mainWebGLCanvases:()=>container.querySelectorAll('canvas').length,get exactCount(){return exactCount},get livingCount(){return livingCount},get moving(){return moving},get terrain(){return terrainOn},get base(){return base},get streetWalk(){return walkMode},get worldLight(){return window.__BP_WORLD_LIGHT__||null},sources:{map:'MapLibre GL JS',vectors:'OpenFreeMap/OpenStreetMap + BridgePoint MVT',globalImagery:'NASA EOSDIS GIBS Blue Marble',usImagery:'USGS The National Map orthoimagery',terrain:'Mapzen Terrain Tiles on AWS Open Data',parcels:'BridgePoint MVT',livingWorld:'BridgePoint living-world viewport v5319'}};
 const api={version:VERSION,map,state,setBase,enterWalk,exitWalk,walkStep,turnWalk,refresh:()=>{terrain();exact();livingWorld();lights();updateWorldLight()},selectBuildingAtPoint:point=>chooseBuilding({point,lngLat:map.unproject(point)}),onBuildingSelect:fn=>{buildingSelectHandler=typeof fn==='function'?fn:null;return()=>{if(buildingSelectHandler===fn)buildingSelectHandler=null}}};window[globalKey]=api;if(globalKey==='__bpWorldV2300')window.__bpWorldV2300=api;return api;
}
