#!/usr/bin/env python3
"""Overlay always-on water onto the last verified complete BridgePoint artifact."""
from pathlib import Path
import shutil, sys

site=Path(sys.argv[1]); source=Path(sys.argv[2])
water=(source/'world-v2300-water.js').read_text(encoding='utf-8')
sensor=(source/'world-v2300-sensor-layers.js').read_text(encoding='utf-8')
for rel, data in [('world-v2300-water.js',water),('world-v2300-sensor-layers.js',sensor)]:
    (site/rel).write_text(data,encoding='utf-8')
    app=site/'app'/rel
    if app.exists(): app.write_text(data,encoding='utf-8')

landing=site/'landing.js'
ld=landing.read_text(encoding='utf-8')
landing_marker="  window.__BP_LANDING_WORLD__=world;\n"
landing_insert="""  window.__BP_LANDING_WORLD__=world;
  // Always-on global liquid ocean, including the pre-sign-in welcome globe.
  void import('./world-v2300-water.js?v=always-on-liquid-ocean')
   .then(m=>{const api=m.initWaterEngine(world,{surface:'landing',alwaysOn:true});if(api){api.active=true;api.setEnabled?.(true);window.__BP_WATER_ENGINE_LANDING_V6123__=api;window.__BP_WATER_ENGINE_LANDING_V6123_ENABLED__=true;try{world.map.setCenterClampedToGround?.(false);world.map.setMaxPitch?.(110)}catch(_){}}})
   .catch(e=>console.warn('BridgePoint always-on welcome liquid ocean unavailable',e));
"""
if 'always-on-liquid-ocean' not in ld:
    if ld.count(landing_marker)!=1: raise SystemExit('landing world anchor mismatch')
    landing.write_text(ld.replace(landing_marker,landing_insert,1),encoding='utf-8')

app=site/'app.js'
ad=app.read_text(encoding='utf-8')
app_marker=" const appMap=world.map;\n"
app_insert=""" const appMap=world.map;
 // Always-on global liquid ocean and unrestricted underwater camera.
 void import('./world-v2300-water.js?v=always-on-liquid-ocean')
  .then(m=>{const api=m.initWaterEngine(world,{surface:'app',alwaysOn:true});if(api){api.active=true;api.setEnabled?.(true);window.__BP_WATER_ENGINE_APP_V6123__=api;window.__BP_WATER_ENGINE_APP_V6123_ENABLED__=true;try{appMap.setCenterClampedToGround?.(false);appMap.setMaxPitch?.(110)}catch(_){}}})
  .catch(e=>console.warn('BridgePoint always-on app liquid ocean unavailable',e));
"""
if 'always-on-liquid-ocean' not in ad:
    if ad.count(app_marker)!=1: raise SystemExit('app map anchor mismatch')
    app.write_text(ad.replace(app_marker,app_insert,1),encoding='utf-8')
print('ALWAYS_ON_WATER_OVERLAY_PASS')
