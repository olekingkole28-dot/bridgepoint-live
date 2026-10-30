(()=>{
  if(location.pathname.startsWith('/earth/'))return;
  if(document.getElementById('bp-earth-rebuild-notice'))return;
  const note=document.createElement('a');
  note.id='bp-earth-rebuild-notice';
  note.href='/earth/';
  note.setAttribute('aria-label','Preview the new BridgePoint Earth renderer');
  note.innerHTML='<span class="bp-ern-dot"></span><span class="bp-ern-copy"><b>BRIDGEPOINT EARTH IS BEING REBUILT</b><small>Preview the new living-world renderer</small></span><span class="bp-ern-arrow">↗</span>';
  note.style.cssText='position:fixed;z-index:99999;right:14px;top:calc(12px + env(safe-area-inset-top));display:flex;align-items:center;gap:10px;max-width:min(340px,calc(100vw - 28px));padding:10px 12px;border:1px solid rgba(126,231,203,.35);border-radius:11px;background:rgba(3,17,26,.93);box-shadow:0 12px 32px rgba(0,0,0,.34);backdrop-filter:blur(14px);color:#d9f4ef;text-decoration:none;font:10px/1.3 system-ui,sans-serif';
  const style=document.createElement('style');
  style.textContent='#bp-earth-rebuild-notice .bp-ern-dot{width:7px;height:7px;flex:0 0 auto;border-radius:50%;background:#7ef1c8;box-shadow:0 0 12px #7ef1c8}#bp-earth-rebuild-notice .bp-ern-copy{display:flex;flex-direction:column;gap:3px}#bp-earth-rebuild-notice b{font-size:8px;letter-spacing:.12em;color:#96efd4}#bp-earth-rebuild-notice small{font-size:9px;color:#b3cbd0}#bp-earth-rebuild-notice .bp-ern-arrow{margin-left:auto;color:#8aebce;font-size:16px}';
  document.head.appendChild(style);
  document.body.appendChild(note);
  const appMap=document.getElementById('liveMap');
  if(location.pathname.startsWith('/app/') && appMap && !appMap.querySelector('.bp-earth-app-frame')){
    const frame=document.createElement('iframe');
    frame.className='bp-earth-app-frame';
    frame.src='/earth/?embed=1&app=1&bpbuild=earth-v7-20261030';
    frame.title='BridgePoint Earth intelligence world';
    frame.loading='eager';
    frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.allow='geolocation';
    frame.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;z-index:40;background:#020812';
    appMap.style.position='relative';
    appMap.appendChild(frame);
    const legacy=document.createElement('style');
    legacy.textContent='.map-brand-card,.map-tools,.search-box,.map-status,.measure-readout,#mapResults{display:none!important}';
    document.head.appendChild(legacy);
  }

  const preview=document.getElementById('previewMap');
  if(preview && !preview.querySelector('.bp-earth-preview-frame')){
    preview.style.position='relative';
    const frame=document.createElement('iframe');
    frame.className='bp-earth-preview-frame';
    frame.src='/earth/?embed=1&surface=preview&bpbuild=earth-v7-20261030';
    frame.title='BridgePoint new Earth renderer preview';
    frame.loading='eager';
    frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:inherit;z-index:8;background:#020812';
    preview.appendChild(frame);
  }
})();