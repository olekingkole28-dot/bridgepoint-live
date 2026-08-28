(()=>{
  'use strict';
  if(window.__bridgepointPackagesAccessV962) return;
  window.__bridgepointPackagesAccessV962=true;

  const API='https://xdfsjztwgsbmabshzsjw.supabase.co/rest/v1/rpc/';
  const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
  const nf=new Intl.NumberFormat('en-US');

  function findAccessToken(){
    const seen=new Set();
    const walk=v=>{
      if(v==null||seen.has(v)) return null;
      if(typeof v==='object'){
        seen.add(v);
        if(typeof v.access_token==='string'&&v.access_token.length>30) return v.access_token;
        for(const x of Object.values(v)){const hit=walk(x);if(hit)return hit;}
      }
      return null;
    };
    try{
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i)||'';
        if(!/auth|supabase|sb-/i.test(k)) continue;
        const raw=localStorage.getItem(k);if(!raw)continue;
        try{const hit=walk(JSON.parse(raw));if(hit)return hit;}catch(_){ }
      }
    }catch(_){ }
    return null;
  }

  async function rpc(name,token){
    const headers={'apikey':KEY,'Content-Type':'application/json','Cache-Control':'no-cache','Authorization':`Bearer ${token||KEY}`};
    const res=await fetch(`${API}${name}`,{method:'POST',headers,body:'{}',cache:'no-store'});
    if(!res.ok) throw new Error(`${name}:${res.status}`);
    return await res.json();
  }

  const style=document.createElement('style');
  style.textContent=`
    #bp962-access-dialog{position:fixed;z-index:2147483610;inset:0;display:none;place-items:center;padding:16px;background:rgba(2,8,14,.78);backdrop-filter:blur(11px);font:500 13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
    #bp962-access-dialog.show{display:grid}
    #bp962-access-dialog .bp962-card{width:min(880px,100%);max-height:min(82vh,780px);overflow:auto;border-radius:20px;border:1px solid rgba(255,201,94,.22);background:#0b1929;box-shadow:0 28px 90px rgba(0,0,0,.58);padding:18px;box-sizing:border-box}
    #bp962-access-dialog .bp962-head{display:flex;gap:12px;align-items:flex-start}.bp962-grow{flex:1;min-width:0}.bp962-title{font-size:21px;font-weight:950}.bp962-sub{margin-top:5px;color:#b5c6d9}.bp962-close{min-height:40px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#12243a;color:#fff;padding:0 13px;font-weight:850;cursor:pointer}
    .bp962-section{margin-top:16px}.bp962-section h3{margin:0 0 8px;font-size:14px}.bp962-current{padding:14px;border-radius:15px;background:linear-gradient(135deg,rgba(255,201,94,.12),rgba(72,225,255,.06));border:1px solid rgba(255,201,94,.24)}.bp962-current-name{font-size:17px;font-weight:950}.bp962-meta{margin-top:5px;color:#b5c6d9;font-size:11.5px}.bp962-note{margin-top:9px;color:#8fa7bd;font-size:11.3px;line-height:1.45}
    .bp962-features{display:flex;flex-wrap:wrap;gap:6px}.bp962-chip{padding:6px 8px;border-radius:999px;background:#10243a;border:1px solid rgba(72,225,255,.10);color:#dce8f3;font-size:10.5px;font-weight:750}.bp962-plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:9px}.bp962-plan{padding:13px;border-radius:14px;background:#10243a;border:1px solid rgba(255,255,255,.07)}.bp962-plan.current{border-color:rgba(69,230,166,.35);box-shadow:0 0 0 1px rgba(69,230,166,.08) inset}.bp962-plan-name{font-weight:900;font-size:14px}.bp962-price{margin-top:4px;font-size:17px;font-weight:950;color:#48e1ff}.bp962-desc{margin-top:6px;color:#aabdd0;font-size:11.3px;line-height:1.4}.bp962-mode{margin-top:8px;font-size:9.5px;font-weight:900;letter-spacing:.5px;color:#ffc95e;text-transform:uppercase}.bp962-login{padding:18px;border-radius:14px;background:#10243a;color:#c8d7e6}
    @media(max-width:560px){#bp962-access-dialog{padding:8px}#bp962-access-dialog .bp962-card{padding:14px;border-radius:16px}.bp962-head{align-items:center}.bp962-title{font-size:18px}}
  `;
  document.head.appendChild(style);

  const dialog=document.createElement('div');
  dialog.id='bp962-access-dialog';
  dialog.innerHTML='<div class="bp962-card"><div class="bp962-head"><div class="bp962-grow"><div class="bp962-title">Packages & Access</div><div class="bp962-sub">Your BridgePoint access, explained in plain English.</div></div><button type="button" class="bp962-close">Close</button></div><div data-body></div></div>';
  const mountDialog=()=>{if(document.body&&!document.getElementById(dialog.id))document.body.appendChild(dialog)};
  if(document.body) mountDialog(); else document.addEventListener('DOMContentLoaded',mountDialog,{once:true});
  dialog.querySelector('.bp962-close').addEventListener('click',()=>dialog.classList.remove('show'));
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.classList.remove('show')});

  function money(v){const n=Number(v||0);return `$${nf.format(n)}`;}
  function prettyFeature(v){return String(v||'').replace(/^package_access\./,'').replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase());}
  function fmtDate(v){try{return new Date(v).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric'});}catch(_){return '—';}}

  async function openAccess(){
    const body=dialog.querySelector('[data-body]');
    dialog.classList.add('show');
    const token=findAccessToken();
    if(!token){body.innerHTML='<div class="bp962-section bp962-login">Sign in to BridgePoint to see your current package and unlocked features. The public plan catalog is available after sign-in.</div>';return;}
    body.innerHTML='<div class="bp962-section bp962-login">Checking your BridgePoint access…</div>';
    try{
      const [access,plans]=await Promise.all([rpc('bridgepoint_customer_access_contract_v318',token),rpc('bridgepoint_customer_plans_v944',token)]);
      const packages=Array.isArray(access?.packages)?access.packages:[];
      const features=Array.isArray(access?.features)?access.features:[];
      const catalog=Array.isArray(plans?.packages)?plans.packages:[];
      const currentKeys=new Set(packages.map(x=>x.package_key));
      const current=packages[0]||null;
      const status=current?.status==='trialing'?'Preview access':String(current?.status||'Active access').replaceAll('_',' ');
      const until=current?.trial_ends_at||current?.current_period_end||null;
      body.innerHTML='';

      const currentSection=document.createElement('section');currentSection.className='bp962-section';
      currentSection.innerHTML='<h3>Your access</h3>';
      const currentBox=document.createElement('div');currentBox.className='bp962-current';
      currentBox.innerHTML=`<div class="bp962-current-name">${current?.package_name||'BridgePoint account'}</div><div class="bp962-meta">${status}${until?` • current access through ${fmtDate(until)}`:''} • ${nf.format(features.length)} unlocked features</div><div class="bp962-note">BridgePoint shows only the features and geography your account is entitled to. Preview access does not by itself mean a paid subscription.</div>`;
      currentSection.appendChild(currentBox);body.appendChild(currentSection);

      const featureSection=document.createElement('section');featureSection.className='bp962-section';
      featureSection.innerHTML='<h3>Unlocked now</h3>';
      const featureWrap=document.createElement('div');featureWrap.className='bp962-features';
      for(const f of features){const chip=document.createElement('span');chip.className='bp962-chip';chip.textContent=prettyFeature(f);featureWrap.appendChild(chip);}
      if(!features.length){const chip=document.createElement('span');chip.className='bp962-chip';chip.textContent='No feature list returned';featureWrap.appendChild(chip);}
      featureSection.appendChild(featureWrap);body.appendChild(featureSection);

      const plansSection=document.createElement('section');plansSection.className='bp962-section';plansSection.innerHTML='<h3>Customer packages</h3>';
      const grid=document.createElement('div');grid.className='bp962-plans';
      for(const p of catalog){
        const el=document.createElement('div');el.className=`bp962-plan${currentKeys.has(p.package_key)?' current':''}`;
        const monthly=Number(p.monthly_price||0);const yearly=Number(p.yearly_price||0);
        el.innerHTML=`<div class="bp962-plan-name">${p.package_name||p.package_key}${currentKeys.has(p.package_key)?' ✓':''}</div><div class="bp962-price">${monthly?money(monthly)+'/mo':yearly?money(yearly)+'/yr':'Contact BridgePoint'}</div><div class="bp962-desc">${p.description||''}</div><div class="bp962-mode">${p.purchase_mode==='OWNER_APPROVAL_REQUIRED'?'Owner approval required':p.checkout_ready?'Checkout ready':'Managed activation'}</div>`;
        grid.appendChild(el);
      }
      plansSection.appendChild(grid);body.appendChild(plansSection);
    }catch(err){
      body.innerHTML='<div class="bp962-section bp962-login">BridgePoint could not verify package access right now. Your account has not been changed. Close this panel and try again.</div>';
    }
  }

  function attach(){
    const bar=document.getElementById('bp-live-system-v961');
    if(!bar) return false;
    if(bar.querySelector('[data-packages-v962]')) return true;
    const owner=bar.querySelector('.bp961-owner');
    const button=document.createElement('button');
    button.type='button';button.className='bp961-metric';button.setAttribute('data-packages-v962','');
    button.innerHTML='<span class="bp961-label">Packages</span><span class="bp961-value">My access</span>';
    button.addEventListener('click',openAccess);
    if(owner) bar.insertBefore(button,owner); else bar.appendChild(button);
    return true;
  }
  if(!attach()){
    let tries=0;const timer=setInterval(()=>{tries++;if(attach()||tries>80)clearInterval(timer)},250);
  }
})();