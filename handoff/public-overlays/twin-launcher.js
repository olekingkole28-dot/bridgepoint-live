(()=>{
  const ID='bp-property-twin-launcher';
  if(document.getElementById(ID)) return;
  const style=document.createElement('style');
  style.textContent=`
    #${ID}{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483200;display:flex;align-items:center;gap:8px;min-height:46px;padding:0 14px;border:1px solid rgba(72,225,255,.42);border-radius:14px;background:rgba(5,16,28,.96);color:#fff;box-shadow:0 16px 46px rgba(0,0,0,.45),0 0 28px rgba(72,225,255,.10);font:900 12px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;backdrop-filter:blur(16px)}
    #${ID}:hover{transform:translateY(-1px);border-color:rgba(72,225,255,.78)}
    #${ID} .bp-twin-orb{width:10px;height:10px;border-radius:50%;background:#48e1ff;box-shadow:0 0 16px rgba(72,225,255,.88)}
    #${ID} .bp-twin-sub{color:#9fb5c9;font-size:9px;font-weight:800;letter-spacing:.02em}
    @media(max-width:560px){#${ID}{right:10px;bottom:max(10px,env(safe-area-inset-bottom));padding:0 11px;min-height:44px}#${ID} .bp-twin-sub{display:none}}
  `;
  document.head.appendChild(style);
  const button=document.createElement('button');
  button.id=ID;
  button.type='button';
  button.setAttribute('aria-label','Open BridgePoint Property Twin 3D');
  button.innerHTML='<span class="bp-twin-orb" aria-hidden="true"></span><span><span style="display:block">Property Twin 3D</span><span class="bp-twin-sub">3D • front • aerial • history</span></span>';
  button.addEventListener('click',()=>{location.href='/app/twin/';});
  document.body.appendChild(button);
})();