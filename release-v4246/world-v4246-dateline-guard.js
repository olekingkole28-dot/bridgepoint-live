(function(){
  'use strict';
  if(!window.Cesium || !Cesium.Rectangle || window.__bpDatelineGuardV4246) return;

  const originalFromDegrees=Cesium.Rectangle.fromDegrees.bind(Cesium.Rectangle);
  const normalizeLon=(value)=>{
    let v=Number(value);
    if(!Number.isFinite(v)) return v;
    if(v>=-180 && v<=180) return v;
    v=((v+180)%360+360)%360-180;
    return Object.is(v,-0)?0:v;
  };
  const clampLat=(value)=>Math.max(-90,Math.min(90,Number(value)));

  Cesium.Rectangle.fromDegrees=function(west,south,east,north,result){
    return originalFromDegrees(
      normalizeLon(west),
      clampLat(south),
      normalizeLon(east),
      clampLat(north),
      result
    );
  };

  window.__bpDatelineGuardV4246={
    build:4246,
    normalizeLon,
    reason:'Cesium rectangles crossing +/-180 must wrap longitude instead of exceeding PI.'
  };
})();