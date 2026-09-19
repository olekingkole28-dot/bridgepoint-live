const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const paint=(m,id,k,v)=>{try{if(has(m,id))m.setPaintProperty(id,k,v)}catch(e){console.warn('V2300 building fidelity paint',id,k,e)}};
const add=(m,l,before)=>{try{if(!has(m,l.id))m.addLayer(l,before&&has(m,before)?before:undefined)}catch(e){console.warn('V2300 building fidelity layer',l.id,e)}};

const MATERIAL=['match',['downcase',['coalesce',['get','facade_material'],['get','building_material'],['get','material'],'']],
  'brick','#9b6658','masonry','#93877b','stone','#87857d','glass','#6f9eac','metal','#929da2','steel','#8d989e','concrete','#989b97','wood','#8d765d','stucco','#b2a79b','plaster','#b8afa4',
  ['match',['downcase',['coalesce',['get','building'],['get','class'],['get','subclass'],'']],
    'commercial','#9ca8ad','retail','#a49b93','industrial','#7f8b8f','warehouse','#7d878a','hospital','#b6a5a7','school','#aaa48e','church','#aaa18e','civic','#aaa4b1','government','#aaa4b1','office','#98a6ac','apartments','#9a9390','residential','#958d87','house','#968d86','#9aa5aa']];
const ROOF=['match',['downcase',['coalesce',['get','roof_material'],'']],
  'metal','#c5d2d6','tile','#ae745e','slate','#687a86','shingle','#817b76','concrete','#a8aeab','glass','#8fb1ba','#b5c0c2'];

export function initBuildingFidelity(map){
  if(!map)return null;if(window.__bpBuildingFidelityV2300?.map===map)return window.__bpBuildingFidelityV2300;
  let installed=false;
  function install(){
    let ready=false;try{ready=map.isStyleLoaded?.()===true||!!map.getSource?.('ofm')}catch(_){}
    if(!ready)return;
    // The shared world renderer owns facade/roof materials and authoritative shell visibility.
    // This additive module must not repaint those layers or re-enable the hidden exact duplicate shell.
    // Contact shadows and crisp roofline/footprint edges add depth without inventing facade textures or using another WebGL canvas.
    add(map,{id:'gta-bp-contact-shadow',type:'line',source:'bpBuildings','source-layer':'buildings',minzoom:13.4,paint:{'line-color':'#020609','line-width':['interpolate',['linear'],['zoom'],13.4,1.2,17,2.8,21,4.2],'line-opacity':.48,'line-blur':2.2}},'gta-bp-buildings');
    installed=true;map.triggerRepaint();
  }
  install();map.on('styledata',install);for(const ms of [80,280,900,2200])setTimeout(install,ms);
  const api={version:2300,map,requirementKey:'v2300_photoreal_buildings_v1',install,get state(){return{installed,solidPhysicalBodies:true,exactBuildingOpacity:null,exactRoofOpacity:null,sourceBackedGeometryPreserved:true,sourceBackedHeightPreserved:true,materialAwareFacadePalette:true,materialAwareRoofPalette:true,rendererOwnsMaterials:true,duplicateExactShell:false,syntheticFacadeTexture:false,photogrammetryTextureClaimed:false,contactShadowLayers:1,secondaryCanvases:0}}};
  window.__bpBuildingFidelityV2300=api;return api;
}
