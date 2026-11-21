/* BridgePoint Mine & Quarry Photogrammetry v1.
 * Additive map layer: public scan listings remain hosted by their original publishers.
 * Each pin stores its coordinate precision and scan scope; the embedded viewer shows the published 3D model.
 */
const VERSION=1, MAP_STATES=new WeakMap();
const SOURCE_ID='bp-underground-mines-source-v1';
const HALO_ID='bp-underground-mines-halo-v1';
const MARKER_ID='bp-underground-mines-markers-v1';
const LABEL_ID='bp-underground-mines-labels-v1';
const CONTROL_ID='bp-underground-mines-control-v1';
const TOGGLE_ID='bp-underground-mines-toggle-v1';
const COUNT_ID='bp-underground-mines-count-v1';
const STATUS_ID='bp-underground-mines-status-v1';
const ICON_ID='bp-underground-mines-icon-v1';
const UNDERGROUND_MINE_SCANS_V1=[
  {
    "id": "muttental-witten",
    "name": "Former Quarry Muttental",
    "kind": "Quarry",
    "place": "Witten, Germany",
    "coordinates": [
      7.305077,
      51.42341
    ],
    "precision": "Survey coordinate published with scan",
    "status": "Former quarry documented",
    "scope": "Quarry outcrop and surrounding terrain",
    "method": "DJI Phantom 4 Pro imagery processed in Agisoft Metashape",
    "uid": "f314d17a44d146f0942fd0cdf0b56213"
  },
  {
    "id": "abandoned-marble-quarry-greece",
    "name": "Abandoned Marble Quarry",
    "kind": "Quarry",
    "place": "Paranesti area, Greece",
    "coordinates": [
      24.59433098,
      41.0631250706
    ],
    "precision": "Model pin coordinate; publisher notes it falls on a truck",
    "status": "Abandoned (publisher description)",
    "scope": "Approx. 200 × 100 m quarry space from ground photos",
    "method": "Photogrammetry from ground imagery; workflow as described by publisher",
    "uid": "95a83ed8dc224a04a84fef799f9d9bb1"
  },
  {
    "id": "clipstone-colliery",
    "name": "Clipstone Coal Mine",
    "kind": "Mine",
    "place": "Nottinghamshire, United Kingdom",
    "coordinates": [
      -1.116,
      53.174
    ],
    "precision": "Approximate site point",
    "status": "Closed in 2003",
    "scope": "Published mine-site photogrammetry model",
    "method": "1,766 Phantom 4 Pro photos processed in RealityCapture",
    "uid": "02a0b38a5f3b468686a8ed9fa3e0f7e3"
  },
  {
    "id": "log-cabin-mine",
    "name": "Log Cabin Mine",
    "kind": "Mine",
    "place": "California, United States",
    "coordinates": [
      -120.25,
      37.86
    ],
    "precision": "Regional point; listing does not publish coordinates",
    "status": "Closed after WWII; restart attempt unsuccessful",
    "scope": "Mine buildings and site features from 73 images",
    "method": "Photogrammetry in RealityCapture",
    "uid": "071e18ef35144e368829680f040e7ec8"
  },
  {
    "id": "leadfield-mine",
    "name": "Leadfield Ghost-Town Mine",
    "kind": "Mine",
    "place": "Death Valley, California, United States",
    "coordinates": [
      -117.06115,
      36.84777
    ],
    "precision": "Published site coordinate",
    "status": "Historic abandoned mining site",
    "scope": "Photogrammetry scan of a site feature",
    "method": "Mobile photogrammetry scan (Scaniverse)",
    "uid": "f831619e9fed46d7aa28fe8761a8d937"
  },
  {
    "id": "stanislaw-quartz-quarry",
    "name": "Stanisław Quartz Quarry",
    "kind": "Quarry",
    "place": "Izera Mountains, Poland",
    "coordinates": [
      15.49,
      50.87
    ],
    "precision": "Approximate quarry point",
    "status": "Historic open-pit quarry; current status not stated",
    "scope": "Open-pit quarry and quartz outcrop",
    "method": "Agisoft Metashape photogrammetry",
    "uid": "12494d05d02343adbc8ce7b84dfb2c6c"
  },
  {
    "id": "saliara-marble-quarry",
    "name": "Saliara Marble Quarry",
    "kind": "Quarry",
    "place": "Thassos, Greece",
    "coordinates": [
      24.77,
      40.72
    ],
    "precision": "Approximate quarry point",
    "status": "Abandoned status not confirmed",
    "scope": "Quarry reconstruction from 811 aerial image captures",
    "method": "DJI Phantom 4 Pro imagery processed with Agisoft Photoscan/Metashape",
    "uid": "f9b9cc3dcda14a8cb76574c6afe558fe"
  },
  {
    "id": "predjama-fault-quarry",
    "name": "Predjama Fault Quarry",
    "kind": "Quarry",
    "place": "Predjama, Slovenia",
    "coordinates": [
      14.095,
      45.815
    ],
    "precision": "Approximate quarry point",
    "status": "Abandoned quarry",
    "scope": "Fault exposure in limestone quarry",
    "method": "Agisoft Metashape photogrammetry",
    "uid": "44b631f0b48046c3a653edebeac631a2"
  },
  {
    "id": "repedea-big-quarry",
    "name": "Repedea Big Quarry",
    "kind": "Quarry",
    "place": "Iași, Romania",
    "coordinates": [
      27.64396,
      47.0877
    ],
    "precision": "Approximate outcrop coordinate from published locality",
    "status": "Quarry status not stated",
    "scope": "Rock outcrop / quarry face, not a complete underground scan",
    "method": "Photogrammetry model; capture workflow not specified on listing",
    "uid": "b826fa79e54d458ba27756c5c685a002"
  },
  {
    "id": "roque-courbe-agly",
    "name": "Roque Courbe / Agly Quarry",
    "kind": "Quarry",
    "place": "Pyrénées-Orientales, France",
    "coordinates": [
      2.61697,
      42.76961
    ],
    "precision": "Published locality coordinate",
    "status": "Quarry status not stated",
    "scope": "Long quarry outcrop, approx. 321 m feature",
    "method": "Camera photogrammetry processed with Meshroom",
    "uid": "36375af073854f568ad7a817806dda06"
  },
  {
    "id": "cerro-boa-vista",
    "name": "Cerro da Boa Vista Quarry",
    "kind": "Quarry",
    "place": "Santana da Boa Vista, Brazil",
    "coordinates": [
      -53.18931,
      -30.85991
    ],
    "precision": "Approximate hill/locality coordinate",
    "status": "Quarry status not stated",
    "scope": "Part of the quarry/outcrop",
    "method": "200 Canon EOS Rebel T7 images processed in Metashape",
    "uid": "bbe8659ba9564c798973c04b36bd34d7"
  },
  {
    "id": "three-bears-iron-mine",
    "name": "Three Bears Cave Iron Mine",
    "kind": "Mine",
    "place": "Fforest Fawr, Wales, United Kingdom",
    "coordinates": [
      -3.24748,
      51.54501
    ],
    "precision": "Geotagged locality point",
    "status": "Historic iron-mine workings",
    "scope": "Mine entrance / cave and adjacent terrain",
    "method": "168 DJI images processed with WebODM",
    "uid": "90b370ab8a9b44a983d3167e19d5c939"
  },
  {
    "id": "north-wales-quarry-tailings",
    "name": "Quarry Tailings Scan",
    "kind": "Quarry feature",
    "place": "Abandoned slate quarry, North Wales",
    "coordinates": [
      -4.08,
      53.05
    ],
    "precision": "Regional point; listing does not identify the individual quarry",
    "status": "Abandoned slate quarry (publisher description)",
    "scope": "Tailings pile only; scan was made from a few distant exposures",
    "method": "Photogrammetry mesh with 8K diffuse texture",
    "uid": "723df35f7d22444aa1705dd8094c2d4a"
  },
  {
    "id": "north-wales-quarry-cart",
    "name": "Quarry Rusty Cart Scan",
    "kind": "Mine/quarry feature",
    "place": "Abandoned slate quarry, North Wales",
    "coordinates": [
      -4.08,
      53.05
    ],
    "precision": "Regional point; listing does not identify the individual quarry",
    "status": "Abandoned slate quarry (publisher description)",
    "scope": "Rusty overturned rail cart feature, not the whole quarry",
    "method": "Photogrammetry mesh with 8K diffuse texture",
    "uid": "c9311c9d277249fda263cad72bf8ddf8"
  },
  {
    "id": "north-wales-quarry-rubble",
    "name": "Quarry Brick Rubble Scan",
    "kind": "Quarry feature",
    "place": "Abandoned slate quarry, North Wales",
    "coordinates": [
      -4.08,
      53.05
    ],
    "precision": "Regional point; listing does not identify the individual quarry",
    "status": "Abandoned slate quarry (publisher description)",
    "scope": "Brick rubble feature, not the whole quarry",
    "method": "Photogrammetry scan; exact workflow not stated on listing",
    "uid": "842716d1e5404e4495db1090fa356ca6"
  },
  {
    "id": "bosahan-lower-wheel-pit",
    "name": "Bosahan Woods Lower Wheel Pit",
    "kind": "Mine feature",
    "place": "Wheal Vyvyan, Cornwall, United Kingdom",
    "coordinates": [
      -5.18,
      50.14
    ],
    "precision": "Approximate heritage-site point",
    "status": "Historic mine feature",
    "scope": "Lower wheel pit associated with Wheal Vyvyan",
    "method": "Photogrammetry scan listing; capture workflow not specified",
    "uid": "ac8a259d03fe40a7be790f0449d2e578"
  },
  {
    "id": "nant-yr-eira-copper-mine",
    "name": "Nant Yr Eira Copper Mine",
    "kind": "Mine",
    "place": "Powys, Wales, United Kingdom",
    "coordinates": [
      -3.42,
      52.38
    ],
    "precision": "Regional point",
    "status": "Prehistoric mine site",
    "scope": "Mine feature scan",
    "method": "Drone photogrammetry",
    "uid": "cf6ab27ea29748ac8b5df5f333d61722"
  },
  {
    "id": "cliff-colliery-trefrane",
    "name": "Cliff Colliery",
    "kind": "Mine",
    "place": "Trefrane, Pembrokeshire, Wales",
    "coordinates": [
      -5.13,
      51.87
    ],
    "precision": "Approximate site point",
    "status": "Historic colliery",
    "scope": "Site feature including chimney remains",
    "method": "Agisoft Metashape photogrammetry",
    "uid": "43dc2c30489249918a52f396d2b30f6a"
  },
  {
    "id": "diffwys-quarry-winding-house",
    "name": "Diffwys Quarry Winding House",
    "kind": "Quarry feature",
    "place": "Blaenau Ffestiniog, Wales, United Kingdom",
    "coordinates": [
      -3.94,
      53
    ],
    "precision": "Approximate quarry point",
    "status": "Historic slate quarry; extraction largely ended by 1925",
    "scope": "Floor 6 winding house and nearby mill features",
    "method": "3D survey model; capture method not stated on listing",
    "uid": "f8ea8bbe6e884f83bf1f1fd7d5e79538"
  },
  {
    "id": "hashima-gunkanjima",
    "name": "Hashima / Gunkanjima Coal Island",
    "kind": "Mine",
    "place": "Nagasaki, Japan",
    "coordinates": [
      129.7382,
      32.6277
    ],
    "precision": "Island coordinate",
    "status": "Coal mine closed; island abandoned",
    "scope": "Abandoned mining island and built environment",
    "method": "Photogrammetry-tagged 3D island/site scan",
    "uid": "8b5f4004326144c9886233fcba8e10bd"
  },
  {
    "id": "maiden-mount-salt-mine",
    "name": "Maiden Mount Salt Mine Sinkhole",
    "kind": "Mine",
    "place": "Northern Ireland, United Kingdom",
    "coordinates": [
      -7.45,
      54.55
    ],
    "precision": "Regional survey-area point",
    "status": "Historic solution salt mine; collapse survey from 2017",
    "scope": "Sinkhole topography over part of historic mine",
    "method": "Drone/UAV imagery with GNSS ground control",
    "uid": "7cc6d57dae6a4f6aa0cc9316ada2eaff"
  },
  {
    "id": "towanroath-engine-house",
    "name": "Towanroath Engine House",
    "kind": "Mine feature",
    "place": "Wheal Coates, Cornwall, United Kingdom",
    "coordinates": [
      -5.206,
      50.307
    ],
    "precision": "Approximate heritage-site point",
    "status": "Historic disused mine buildings",
    "scope": "Engine house and adjacent ground",
    "method": "Aerial 3D photogrammetry",
    "uid": "76e8c59672fa4fd1a3375cc3241f4c92"
  },
  {
    "id": "magpie-mine",
    "name": "Magpie Mine",
    "kind": "Mine",
    "place": "Derbyshire, England, United Kingdom",
    "coordinates": [
      -1.74302,
      53.20978
    ],
    "precision": "Published site coordinate",
    "status": "Historic lead mine",
    "scope": "Aerial mine-site scan",
    "method": "160 aerial photographs processed as photogrammetry",
    "uid": "9d0dbacd07fd47ce899967d2dbd5460a"
  },
  {
    "id": "ajo-inactive-open-pit",
    "name": "In-Active Open Pit Mine",
    "kind": "Mine",
    "place": "Ajo, Arizona, United States",
    "coordinates": [
      -112.86,
      32.37
    ],
    "precision": "Approximate locality point; model listing gives Ajo but not exact coordinates",
    "status": "Listed as inactive",
    "scope": "Open-pit mine scene from a GoPro video",
    "method": "3DF Zephyr photogrammetry",
    "uid": "d86665e1b1a14331909e3a44ec35fc45"
  },
  {
    "id": "mariscal-mine",
    "name": "Mariscal Mine Historic District",
    "kind": "Mine",
    "place": "Big Bend National Park, Texas, United States",
    "coordinates": [
      -103.184,
      29.105
    ],
    "precision": "Approximate historic-site point",
    "status": "Historic mine district",
    "scope": "Mine-site model; exact scan coverage is shown in the viewer",
    "method": "Public 3D photogrammetry model listing",
    "uid": "a0e6eb63daa5457da430418e89566e9e"
  },
  {
    "id": "bluebird-mine-bunkhouse",
    "name": "Bluebird Mine Bunkhouse",
    "kind": "Mine feature",
    "place": "Boulder County, Colorado, United States",
    "coordinates": [
      -105.533888,
      39.996931
    ],
    "precision": "Published mine locality point",
    "status": "Historic mine; current status inactive",
    "scope": "Bunkhouse/building feature at mine site",
    "method": "650 iPhone and DJI Air 2S images processed with 3DF Zephyr",
    "uid": "25009ac7e12d4aa4ae4e68b20378b634"
  },
  {
    "id": "blue-jay-mine",
    "name": "Blue Jay Mine",
    "kind": "Mine",
    "place": "Colorado, United States",
    "coordinates": [
      -105.55,
      39.98
    ],
    "precision": "Approximate mine-site point",
    "status": "Historic mine site; abandonment status not stated",
    "scope": "Mine site feature",
    "method": "629 DJI Air 2S images; photogrammetry",
    "uid": "76576ee589254fa79267882ebab2a65b"
  },
  {
    "id": "yewthwaite-lead-mine",
    "name": "Yewthwaite Lead Mine",
    "kind": "Mine",
    "place": "Newlands Valley, Cumbria, United Kingdom",
    "coordinates": [
      -3.17237,
      54.56222
    ],
    "precision": "Mine locality coordinate",
    "status": "Abandoned in 1893",
    "scope": "Historic mine-site scan",
    "method": "Public photogrammetry scan; capture workflow not stated on listing",
    "uid": "55275babea234e5bae22e827037eee6f"
  },
  {
    "id": "denee-flooded-quarry",
    "name": "Denee Flooded Quarry",
    "kind": "Quarry",
    "place": "Denee, Belgium",
    "coordinates": [
      4.75,
      50.32
    ],
    "precision": "Approximate quarry point",
    "status": "Abandoned/flooded quarry",
    "scope": "Whole flooded quarry site reconstruction",
    "method": "Photogrammetry from approx. 51,000 images; publisher reports 12M mesh",
    "uid": "ce990957d3514039a65cf70dba555157"
  },
  {
    "id": "carrshield-mine-adit",
    "name": "Carrshield Mine Drainage Adit",
    "kind": "Mine feature",
    "place": "Northumberland, England, United Kingdom",
    "coordinates": [
      -2.24,
      54.83
    ],
    "precision": "Approximate heritage-site point",
    "status": "Historic disused mine feature",
    "scope": "Drainage adit feature",
    "method": "Agisoft Metashape photogrammetry",
    "uid": "af5f42918c1847cfb1a2a7d53b0e6c35"
  },
  {
    "id": "nenthead-smelt-mill",
    "name": "Nenthead Mines Smelt Mill",
    "kind": "Mine feature",
    "place": "Cumbria, England, United Kingdom",
    "coordinates": [
      -2.34,
      54.78
    ],
    "precision": "Approximate heritage-site point",
    "status": "Historic mining complex",
    "scope": "Smelt mill building within mining landscape",
    "method": "Photogrammetry/3D scan listing; capture workflow not stated",
    "uid": "0793432f8bd14c50848cd214a4874e36"
  },
  {
    "id": "parys-mountain-mine-entrance",
    "name": "Parys Mountain Mine Entrance",
    "kind": "Mine",
    "place": "Amlwch, Anglesey, Wales, United Kingdom",
    "coordinates": [
      -4.34,
      53.41
    ],
    "precision": "Approximate mine-site point",
    "status": "Historic disused copper mine",
    "scope": "Mine entrance feature",
    "method": "Public 3D scan listing; capture method not stated",
    "uid": "9c031e12af4144d5a303fc7c4bc01cec"
  },
  {
    "id": "cloncurry-open-cut-copper",
    "name": "Open Cut Copper Mine",
    "kind": "Mine",
    "place": "Near Cloncurry, Queensland, Australia",
    "coordinates": [
      140.5,
      -20.7
    ],
    "precision": "Regional point southwest of Cloncurry",
    "status": "Mine status not stated",
    "scope": "Partial open-cut mine scan",
    "method": "105 Nikon photos processed in Metashape",
    "uid": "91f5a115ac984dc69517cea5b8a7a16e"
  },
  {
    "id": "timna-chalcolithic-mine",
    "name": "Timna Chalcolithic Copper Mine",
    "kind": "Mine",
    "place": "Timna Valley, Israel",
    "coordinates": [
      34.98,
      29.79
    ],
    "precision": "Approximate archaeological site point",
    "status": "Prehistoric mine site",
    "scope": "Mine excavation/outcrop feature",
    "method": "1,473 overlapping 24MP images processed in Agisoft PhotoScan",
    "uid": "d2a3f78bb6f74cdd8fdc4c5d9ef0d943"
  },
  {
    "id": "kleinkogel-prehistoric-mine",
    "name": "Kleinkogel Prehistoric Copper Mine",
    "kind": "Mine",
    "place": "Tyrol, Austria",
    "coordinates": [
      11.12,
      47.33
    ],
    "precision": "Regional archaeological-site point",
    "status": "Prehistoric mine",
    "scope": "Mine and geological feature scan",
    "method": "Approx. 3,000 DSLR photographs",
    "uid": "d44dda372e954f1a885cd6de95929116"
  },
  {
    "id": "takata-stone-quarry-japan",
    "name": "Takata Stone Quarry",
    "kind": "Quarry",
    "place": "Kawanabe, Minamikyushu, Japan",
    "coordinates": [
      130.42,
      31.38
    ],
    "precision": "Approximate locality point",
    "status": "Quarry status not stated",
    "scope": "Stone quarry feature",
    "method": "Agisoft Metashape photogrammetry",
    "uid": "413832760dde4714bcf32a526fce806e"
  },
  {
    "id": "tahuna-road-quarry",
    "name": "Tahuna Road Quarry",
    "kind": "Quarry",
    "place": "New Zealand (regional location from publisher)",
    "coordinates": [
      175.2,
      -37.45
    ],
    "precision": "Regional point; exact quarry coordinates not stated",
    "status": "Quarry status not stated",
    "scope": "Quarry survey model",
    "method": "Agisoft Metashape; aerial survey model",
    "uid": "8653036eb6f1430d93cd68222ea11647"
  },
  {
    "id": "graniczna-open-pit",
    "name": "Graniczna Open-Pit Mine",
    "kind": "Mine",
    "place": "Lower Silesia, Poland",
    "coordinates": [
      15.7,
      51.15
    ],
    "precision": "Regional point; listing identifies voivodeship only",
    "status": "Mine status not stated",
    "scope": "Textured open-pit surface mesh",
    "method": "Low-altitude UAV photogrammetry",
    "uid": "64b887af4676475f8e9310e7c54c049c"
  },
  {
    "id": "quarry-g-na-phra-lan",
    "name": "Abandoned Limestone Quarry G",
    "kind": "Quarry",
    "place": "Na Phra Lan, Thailand",
    "coordinates": [
      100.79,
      14.68
    ],
    "precision": "Approximate locality point",
    "status": "Abandoned (publisher title)",
    "scope": "Quarry scan; exact extent not stated",
    "method": "Capture workflow not stated on listing",
    "uid": "cdfa3415b48a4df28c9e03a347422a9a"
  },
  {
    "id": "quarry-zelesice",
    "name": "Quarry Želešice",
    "kind": "Quarry",
    "place": "South Moravia, Czechia",
    "coordinates": [
      16.58,
      49.12
    ],
    "precision": "Approximate quarry point",
    "status": "Quarry status not stated",
    "scope": "Quarry survey surface",
    "method": "Drone photogrammetry survey",
    "uid": "007e8bf3ca1349219f4e45619543320a"
  }
];
export {UNDERGROUND_MINE_SCANS_V1};
function esc(value){return String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function features(){return UNDERGROUND_MINE_SCANS_V1.map(s=>({type:'Feature',geometry:{type:'Point',coordinates:s.coordinates},properties:{recordId:s.id,name:s.name,iconImage:ICON_ID}}));}
function makeIcon(){
 const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');
 x.shadowColor='rgba(0,0,0,.65)';x.shadowBlur=7;x.beginPath();x.arc(32,30,23,0,Math.PI*2);x.fillStyle='#162a2c';x.fill();
 x.lineWidth=4;x.strokeStyle='#edbb69';x.stroke();x.shadowBlur=0;
 x.lineCap='round';x.lineJoin='round';x.strokeStyle='#f4d58d';x.lineWidth=5;
 x.beginPath();x.moveTo(19,41);x.lineTo(43,17);x.stroke();
 x.beginPath();x.moveTo(32,16);x.quadraticCurveTo(40,10,48,16);x.lineTo(43,23);x.stroke();
 x.beginPath();x.moveTo(18,37);x.quadraticCurveTo(14,31,16,25);x.lineTo(24,27);x.stroke();
 return {width:64,height:64,data:x.getImageData(0,0,64,64).data};
}
function setVisibility(state,visible){
 const v=visible?'visible':'none';
 for(const id of [HALO_ID,MARKER_ID,LABEL_ID])if(state.map.getLayer(id))state.map.setLayoutProperty(id,'visibility',v);
}
function installLayers(state){
 const map=state.map;
 if(!map?.getStyle?.()||(typeof map.isStyleLoaded==='function'&&!map.isStyleLoaded()))return false;
 try{
  if(!map.hasImage?.(ICON_ID))map.addImage(ICON_ID,makeIcon(),{pixelRatio:2});
  if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{type:'geojson',data:{type:'FeatureCollection',features:features()},buffer:64,maxzoom:14,attribution:'Public mine and quarry scan listings; original publisher linked in each BridgePoint card'});
  const add=(id,layer)=>{if(!map.getLayer(id))map.addLayer(layer);};
  add(HALO_ID,{id:HALO_ID,type:'circle',source:SOURCE_ID,minzoom:0,maxzoom:24,layout:{visibility:state.enabled?'visible':'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,4,5,6,11,8,18,10,23,11],'circle-color':'#f0bb67','circle-opacity':.32,'circle-blur':.45}});
  add(MARKER_ID,{id:MARKER_ID,type:'symbol',source:SOURCE_ID,minzoom:0,maxzoom:24,layout:{visibility:state.enabled?'visible':'none','icon-image':['get','iconImage'],'icon-size':['interpolate',['linear'],['zoom'],0,.40,3,.48,7,.60,12,.72,18,.84,23,.95],'icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport','icon-anchor':'bottom','icon-allow-overlap':true,'icon-ignore-placement':true,'symbol-sort-key':235}});
  add(LABEL_ID,{id:LABEL_ID,type:'symbol',source:SOURCE_ID,minzoom:6,maxzoom:24,layout:{visibility:state.enabled?'visible':'none','text-field':['get','name'],'text-size':['interpolate',['linear'],['zoom'],6,9,12,11,18,13],'text-offset':[0,1.05],'text-anchor':'top','text-allow-overlap':false,'text-ignore-placement':false},paint:{'text-color':'#fff2d8','text-halo-color':'rgba(12,15,18,.96)','text-halo-width':1.7}});
  setVisibility(state,state.enabled);return true;
 }catch(error){state.lastError=String(error?.message||error);console.warn('BridgePoint underground mine layers',error);return false;}
}
function refreshUi(state){
 const button=document.getElementById(TOGGLE_ID);if(button){button.setAttribute('aria-pressed',String(state.enabled));button.classList.toggle('is-active',state.enabled);}
}
function setStatus(state,text){state.status=text;const el=document.getElementById(STATUS_ID);if(el)el.textContent=text;}
function schedulePersistence(state){
 if(!state.enabled||state.dead||state.frame)return;
 const request=window.requestAnimationFrame||((fn)=>setTimeout(fn,16));
 state.frame=request(()=>{state.frame=0;if(!state.enabled||state.dead)return;try{if(typeof state.map.isStyleLoaded==='function'&&!state.map.isStyleLoaded())return;if(installLayers(state))setVisibility(state,true);}catch(error){state.lastError=String(error?.message||error);}});
}
function popupHtml(scan){
 const uid=encodeURIComponent(scan.uid);
 const embed='https://sketchfab.com/models/'+uid+'/embed?autostart=1&preload=1&ui_theme=dark&dnt=1';
 const source='https://sketchfab.com/3d-models/'+encodeURIComponent(scan.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))+'-'+uid;
 return '<article class="bp-underground-mines-card-v1">'+
 '<p class="bp-underground-mines-kicker-v1">PUBLIC 3D PHOTOGRAMMETRY SCAN · '+esc(scan.kind)+'</p>'+
 '<h3>'+esc(scan.name)+'</h3><p class="bp-underground-mines-place-v1">'+esc(scan.place)+'</p>'+
 '<div class="bp-underground-mines-view-v1"><iframe title="Interactive 3D scan: '+esc(scan.name)+'" src="'+embed+'" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'+
 '<div class="bp-underground-mines-details-v1"><div><b>Status</b><span>'+esc(scan.status)+'</span></div><div><b>Scan coverage</b><span>'+esc(scan.scope)+'</span></div><div><b>Capture method</b><span>'+esc(scan.method)+'</span></div><div><b>Pin precision</b><span>'+esc(scan.precision)+'</span></div></div>'+
 '<p class="bp-underground-mines-note-v1">This is the original publisher-hosted scan embedded in BridgePoint. It shows only the photographed/reconstructed area; the pin may be approximate where the source does not publish exact coordinates. Creator and license details are on the source listing.</p>'+
 '<a class="bp-underground-mines-source-v1" href="'+source+'" target="_blank" rel="noopener noreferrer">Source scan and attribution ↗</a></article>';
}
function openPopup(state,scan,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 state.popup?.remove();
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'500px',className:'bp-underground-mines-popup-wrap-v1'}).setLngLat(lngLat||scan.coordinates).setHTML(popupHtml(scan)).addTo(state.map);
}
function bindInteractions(state){
 state.handleClick=event=>{
  if(!state.enabled)return;
  const hits=state.map.queryRenderedFeatures?.(event.point,{layers:[MARKER_ID]})||[];
  const hit=hits.find(f=>f.properties?.recordId);if(!hit)return;
  const scan=UNDERGROUND_MINE_SCANS_V1.find(s=>s.id===String(hit.properties.recordId));
  if(scan)openPopup(state,scan,event.lngLat||scan.coordinates);
 };
 state.handleStyle=()=>{if(!state.enabled)return;if(installLayers(state))setStatus(state,'Layer on · '+UNDERGROUND_MINE_SCANS_V1.length+' scan pins persist from globe to street zoom.');refreshUi(state);};
 state.handlePersistence=()=>schedulePersistence(state);
 state.map.on('click',state.handleClick);state.map.on('style.load',state.handleStyle);state.map.on('load',state.handleStyle);
 for(const e of ['styledata','idle','moveend','zoomend','rotateend','pitchend'])state.map.on(e,state.handlePersistence);
}
function addControlGroup(state){
 const dock=document.getElementById('bpv-dock-actions');if(!dock)return false;
 if(document.getElementById(CONTROL_ID))return true;
 const group=document.createElement('section');group.id=CONTROL_ID;group.className='bpv-command-group';
 group.setAttribute('data-bpv-command-section','underground-mines');group.setAttribute('aria-label','Abandoned mines and quarries');
 group.innerHTML='<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">⛏️</span><span><b>MINES & QUARRIES</b><small>Public photogrammetry scans with BridgePoint 3D viewers</small></span></div>'+
 '<div class="bpv-command-grid"><button id="'+TOGGLE_ID+'" type="button" class="bpv-command-btn" aria-pressed="false" title="Show persistent abandoned mine and quarry scan pins"><span class="bpv-command-icon" aria-hidden="true">⛏</span><span class="bpv-command-label">Mines & Quarries</span></button></div>'+
 '<div id="'+COUNT_ID+'" class="bpv-data-note">'+UNDERGROUND_MINE_SCANS_V1.length+' scan records · global selection</div>'+
 '<div id="'+STATUS_ID+'" class="bpv-data-note">Layer off · select a pin for the published 3D scan and details</div>'+
 '<style id="bp-underground-mines-style-v1">#'+CONTROL_ID+' .bpv-data-note{font:600 10px/1.45 system-ui,sans-serif;color:#9bb7c6;margin:5px 2px;overflow-wrap:anywhere}#'+TOGGLE_ID+'.is-active{border-color:rgba(240,187,103,.8);background:rgba(89,61,23,.58);box-shadow:inset 0 0 0 1px rgba(240,187,103,.24)}.bp-underground-mines-popup-wrap-v1 .maplibregl-popup-content{background:#11191b;color:#f5f4ef;border:1px solid rgba(238,186,100,.55);border-radius:14px;padding:12px;font:12px/1.45 system-ui,sans-serif;max-height:min(82vh,780px);overflow:auto;width:min(460px,calc(100vw - 50px))}.bp-underground-mines-popup-wrap-v1 .maplibregl-popup-tip{border-top-color:#11191b;border-bottom-color:#11191b}.bp-underground-mines-card-v1 h3{font-size:18px;line-height:1.2;color:#fff;margin:4px 0}.bp-underground-mines-kicker-v1{font-size:9px;letter-spacing:.1em;text-transform:uppercase;font-weight:900;color:#efc474;margin:0}.bp-underground-mines-place-v1{color:#b4c1c3;margin:0 0 8px}.bp-underground-mines-view-v1{height:250px;background:#090e10;border:1px solid rgba(238,186,100,.35);border-radius:10px;overflow:hidden}.bp-underground-mines-view-v1 iframe{width:100%;height:100%;border:0}.bp-underground-mines-details-v1{display:grid;grid-template-columns:1fr;gap:7px;margin:10px 0}.bp-underground-mines-details-v1 div{display:grid;grid-template-columns:96px 1fr;gap:8px;padding:6px 7px;background:rgba(255,255,255,.045);border-radius:7px}.bp-underground-mines-details-v1 b{font-size:10px;color:#f0c36d}.bp-underground-mines-details-v1 span{color:#d3dddc;overflow-wrap:anywhere}.bp-underground-mines-note-v1{font-size:10px;color:#9eafb1;margin:9px 0}.bp-underground-mines-source-v1{display:block;color:#ffd487;font-weight:800;text-decoration:none}</style>';
 dock.appendChild(group);
 const button=document.getElementById(TOGGLE_ID);button?.addEventListener('click',()=>setEnabled(state,!state.enabled));refreshUi(state);return true;
}
function setEnabled(state,enabled){
 state.enabled=!!enabled;
 if(state.enabled){if(!installLayers(state))setStatus(state,'Waiting for the map style before showing mine and quarry pins…');else setStatus(state,'Layer on · '+UNDERGROUND_MINE_SCANS_V1.length+' scan pins stay marked from globe to street zoom. Select a pin for its 3D scan and details.');schedulePersistence(state);}
 else{state.popup?.remove();state.popup=null;setVisibility(state,false);setStatus(state,'Layer off · all existing BridgePoint layers remain unchanged.');}
 refreshUi(state);return state.enabled;
}
export function initUndergroundMinesRenderer(target){
 const map=target&&(target.map||target);if(!map||typeof map.getBounds!=='function'||typeof map.addSource!=='function')return null;
 const existing=MAP_STATES.get(map);if(existing)return existing.api;
 const state={map,enabled:false,dead:false,popup:null,frame:0,status:'off',lastError:null};
 const api={version:VERSION,get enabled(){return state.enabled;},get status(){return state.status;},get stats(){return{version:VERSION,scans:UNDERGROUND_MINE_SCANS_V1.length,lastError:state.lastError};},toggle(){return setEnabled(state,!state.enabled);},setEnabled(value){return setEnabled(state,value);},refresh(){const src=map.getSource(SOURCE_ID);if(src?.setData)src.setData({type:'FeatureCollection',features:features()});return api.stats;},destroy(){state.dead=true;state.popup?.remove();if(state.handleClick)map.off('click',state.handleClick);if(state.handleStyle){map.off('style.load',state.handleStyle);map.off('load',state.handleStyle);}if(state.handlePersistence)for(const e of ['styledata','idle','moveend','zoomend','rotateend','pitchend'])map.off(e,state.handlePersistence);if(state.frame)(window.cancelAnimationFrame||clearTimeout)(state.frame);state.observer?.disconnect();if(state.dockTimer)clearTimeout(state.dockTimer);for(const id of [LABEL_ID,MARKER_ID,HALO_ID])if(map.getLayer(id))map.removeLayer(id);if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID);document.getElementById(CONTROL_ID)?.remove();document.getElementById('bp-underground-mines-style-v1')?.remove();MAP_STATES.delete(map);}};
 state.api=api;MAP_STATES.set(map,state);window.__BP_UNDERGROUND_MINES_V1__=api;bindInteractions(state);
 const observe=()=>{if(state.dead)return;if(addControlGroup(state))return;state.dockTimer=setTimeout(observe,500);};observe();
 if(typeof MutationObserver!=='undefined'&&document.body){state.observer=new MutationObserver(()=>{if(!document.getElementById(CONTROL_ID))addControlGroup(state);});state.observer.observe(document.body,{childList:true,subtree:true});}
 return api;
}
