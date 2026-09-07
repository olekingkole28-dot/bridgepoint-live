(()=>{
'use strict';
const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const RPC=`${SUPA}/rest/v1/rpc/`;
const AUTH=`${SUPA}/auth/v1`;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

async function rpc(name,body={}){
  const r=await fetch(RPC+name,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json',Accept:'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body),cache:'no-store'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d?.message||d?.error||`HTTP ${r.status}`);
  return d;
}
function saveAuth(data){
  if(!data?.access_token)return;
  try{localStorage.setItem('bp-sandbox-auth-v1986',JSON.stringify({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600),user:data.user||null}))}catch(_){ }
}

// Exact-source-derived BridgePoint cosmos math: center/radius/pulse/star field/accretion colors match bp974 production renderer.
function startCosmos(){
  const canvas=$('#cosmos'); if(!canvas)return; const ctx=canvas.getContext('2d');
  let w=0,h=0,dpr=1,t=0,raf=0; const reduce=matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
  const frac=v=>v-Math.floor(v);
  const star=i=>[frac(Math.sin(i*12.9898+1.7)*43758.5453)*w,frac(Math.sin(i*8.233+4.1)*24634.6345)*h];
  function resize(){dpr=Math.min(devicePixelRatio||1,2);w=innerWidth;h=innerHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
  function planet(x,y,r,inner,outer){const g=ctx.createRadialGradient(x-r*.28,y-r*.32,r*.05,x,y,r);g.addColorStop(0,inner);g.addColorStop(.55,outer);g.addColorStop(1,'rgba(1,3,8,.18)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
  const intake=[['⌂','72,225,255'],['⌁','255,201,94'],['●','141,232,255'],['≋','155,123,255'],['◉','108,131,255'],['♨','255,107,107'],['≈','66,191,255'],['⋮','108,131,255'],['ϟ','255,201,94'],['✓','255,120,198'],['▣','255,149,87'],['⌁','255,201,94'],['☼','69,230,166'],['◇','72,225,255'],['▦','139,92,246'],['⌖','69,230,166']];
  function draw(){ctx.clearRect(0,0,w,h);const cx=w*.5,cy=h*.50,r=Math.max(126,Math.min(w,h)*.285),pulse=.5+.5*Math.sin(t*.016);
    for(let i=0;i<118;i++){const [x,y]=star(i),tw=.25+.75*(.5+.5*Math.sin(t*.003+i*1.7)),big=i%23===0,rr=big?1.35:i%7===0?.85:.45,a=.10+tw*(big?.30:.13);ctx.fillStyle=`rgba(230,242,255,${a})`;ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.fill();if(big){ctx.strokeStyle=`rgba(230,242,255,${a*.55})`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x-3.2,y);ctx.lineTo(x+3.2,y);ctx.moveTo(x,y-3.2);ctx.lineTo(x,y+3.2);ctx.stroke()}}
    planet(w*.13,h*.18,Math.max(16,Math.min(w,h)*.052),'rgba(125,151,205,.55)','rgba(29,45,83,.24)');planet(w*.86,h*.80,Math.max(11,Math.min(w,h)*.034),'rgba(211,143,103,.46)','rgba(74,34,52,.20)');
    const glow=ctx.createRadialGradient(cx,cy,r*.42,cx,cy,r*3.1);glow.addColorStop(0,'rgba(0,0,0,.98)');glow.addColorStop(.27,'rgba(0,0,0,.93)');glow.addColorStop(.43,`rgba(139,92,246,${.12+pulse*.035})`);glow.addColorStop(.60,'rgba(108,131,255,.075)');glow.addColorStop(.78,'rgba(72,225,255,.026)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,r*3.1,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.18+Math.sin(t*.00015)*.018);for(let i=0;i<14;i++){ctx.beginPath();ctx.ellipse(0,0,r*(1.72+i*.045),r*(.35+i*.012),0,t*.00034+i*.018,t*.00034+i*.018+Math.PI*(1.72-(i%4)*.055));const hue=i%5===0?'255,201,94':i%2===0?'72,225,255':'139,92,246';ctx.strokeStyle=`rgba(${hue},${.09+i*.008+pulse*.02})`;ctx.lineWidth=1+(i%4)*.55;ctx.shadowBlur=9+(i%4)*2;ctx.shadowColor=`rgba(${hue},.24)`;ctx.stroke()}ctx.restore();
    for(let i=0;i<intake.length;i++){const journey=frac(t*.000028+i/intake.length),e=journey*journey*journey,rr=r*(4.0-e*3.22),a=i*.92+journey*Math.PI*4.35+t*.00009,px=cx+Math.cos(a)*rr,py=cy+Math.sin(a)*rr*.47,enter=Math.min(1,journey/.10),vanish=1-Math.max(0,Math.min(1,(journey-.80)/.17)),alpha=.15+.72*enter*vanish,size=(11+(i%4)*1.6)*(1-e*.30);ctx.save();ctx.font=`900 ${size}px system-ui`;ctx.fillStyle=`rgba(${intake[i][1]},${alpha})`;ctx.shadowBlur=10;ctx.shadowColor=`rgba(${intake[i][1]},.4)`;ctx.fillText(intake[i][0],px,py);ctx.restore()}
    ctx.strokeStyle=`rgba(72,225,255,${.19+pulse*.08})`;ctx.lineWidth=2.1;ctx.shadowBlur=13;ctx.shadowColor='rgba(72,225,255,.34)';ctx.beginPath();ctx.arc(cx,cy,r*(.82+pulse*.014),0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='rgba(0,0,0,.995)';ctx.beginPath();ctx.arc(cx,cy,r*(.69+pulse*.008),0,Math.PI*2);ctx.fill();ctx.strokeStyle=`rgba(139,92,246,${.10+pulse*.025})`;ctx.lineWidth=.8;ctx.beginPath();ctx.arc(cx,cy,r*.705,0,Math.PI*2);ctx.stroke();
    if(!reduce){t+=16;raf=requestAnimationFrame(draw)}
  }
  addEventListener('resize',resize,{passive:true});resize();draw();if(reduce)setTimeout(draw,120);
  addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});
}

let displayed=0;
function comma(n){return Number(n||0).toLocaleString('en-US')}
function animateCounter(to){const el=$('#parcel-counter');if(!el)return;const from=displayed||Math.max(0,to-120000),start=performance.now(),dur=900;function step(now){const p=Math.min(1,(now-start)/dur),e=1-Math.pow(1-p,3);displayed=Math.round(from+(to-from)*e);el.textContent=comma(displayed);if(p<1)requestAnimationFrame(step)}requestAnimationFrame(step)}
async function refreshPulse(){try{const d=await rpc('bridgepoint_public_system_pulse_v957');const n=Number(d.total_parcels||0);if(n)animateCounter(n);$('#counter-meta').textContent=`${d.states_present||51} jurisdictions present · ${d.active_opportunities?comma(d.active_opportunities)+' qualified opportunities · ':''}updated from live aggregate truth`; }catch(e){$('#parcel-counter').textContent=displayed?comma(displayed):'Live counter';$('#counter-meta').textContent='Live aggregate temporarily unavailable — no estimated count shown'}}

function coordsFromGeo(g){if(!g)return[];if(g.type==='Polygon')return g.coordinates?.[0]||[];if(g.type==='MultiPolygon')return g.coordinates?.[0]?.[0]||[];return[]}
function drawParcel(g){const path=$('#parcel-path');const pts=coordsFromGeo(g);if(!path)return;if(pts.length<3){path.setAttribute('d','M165 115 L440 95 L488 292 L320 354 L138 280 Z');path.style.opacity=.18;return}let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;pts.forEach(([x,y])=>{minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)});const dx=Math.max(maxX-minX,1e-9),dy=Math.max(maxY-minY,1e-9),pad=44,scale=Math.min((600-pad*2)/dx,(420-pad*2)/dy);const out=pts.map(([x,y])=>[pad+(x-minX)*scale,420-pad-(y-minY)*scale]);path.setAttribute('d',out.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')+' Z');path.style.opacity=1}
function permitRows(items){if(!items?.length)return '<div class="permit-item"><span>No linked permit records in this teaser.</span><small>—</small></div>';return items.map(x=>`<div class="permit-item"><span>${esc(x.permit_type||'Permit record')} · ${esc(x.permit_status||'status unavailable')}</span><small>${esc(x.activity_date||'date unavailable')}</small></div>`).join('')}
async function runTeaser(q){const state=$('#teaser-state'),empty=$('#teaser-empty-copy'),results=$('#teaser-results');state.classList.remove('empty');empty.innerHTML='<div class="target-icon">⌖</div><h3>Resolving the canonical property…</h3><p>Matching the address to BridgePoint’s public property foundation.</p>';results.hidden=true;try{const d=await rpc('bridgepoint_public_property_teaser_v1986',{p_query:q});if(!d.resolved){throw new Error(d.message||'No confident property match found.')}const p=d.property||{},t=d.teaser||{};drawParcel(t.parcel_geometry);empty.hidden=true;results.hidden=false;$('#result-address').textContent=p.display_address||q;$('#result-meta').textContent=[p.municipality,p.county,p.state_code,p.property_type].filter(Boolean).join(' · ');$('#weather-count').textContent=comma(t.weather_linked_record_count||0);$('#permit-count').textContent=comma(t.active_permit_record_count||0);$('#permit-total').textContent=`${comma(t.permit_record_count||0)} linked permit records total`;$('#permit-items').innerHTML=permitRows(t.recent_permits);$('#teaser-disclosure').textContent=[d.boundary_notice,d.weather_notice,d.permit_notice].filter(Boolean).join(' ')}catch(e){drawParcel(null);empty.hidden=false;empty.innerHTML=`<div class="target-icon">⌖</div><h3>We couldn't confidently match that property.</h3><p>${esc(e.message)} Try the street number, street name, city and state.</p>`;results.hidden=true}}

function mediaFrame(item){const url=String(item.media_url||'');const kind=String(item.media_kind||'video');let body='';let m=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);if(m)body=`<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(m[1])}" title="${esc(item.title)}" loading="lazy" allowfullscreen></iframe>`;else if((m=url.match(/vimeo\.com\/(\d+)/)))body=`<iframe src="https://player.vimeo.com/video/${encodeURIComponent(m[1])}" title="${esc(item.title)}" loading="lazy" allowfullscreen></iframe>`;else if(/\.mp4(?:\?|$)/i.test(url)||kind==='video')body=`<video controls preload="metadata" ${item.thumbnail_url?`poster="${esc(item.thumbnail_url)}"`:''}><source src="${esc(url)}" type="video/mp4"></video>`;else if(kind==='audio'||kind==='podcast')body=`<audio controls src="${esc(url)}" style="width:92%"></audio>`;else if(item.thumbnail_url)body=`<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(item.thumbnail_url)}" alt="${esc(item.title)}"></a>`;else body=`<a href="${esc(url)}" target="_blank" rel="noopener" class="ghost-cta">Open media ↗</a>`;return `<article class="media-card"><div class="media-frame">${body}</div><div class="media-copy"><small>${esc((item.source_name||kind).toUpperCase())}</small><h3>${esc(item.title)}</h3><p>${esc(item.description||'')}</p></div></article>`}
async function loadMedia(){const grid=$('#media-grid');try{const d=await rpc('bridgepoint_public_featured_media_v1986',{p_limit:12});if(d.items?.length)grid.innerHTML=d.items.map(mediaFrame).join('')}catch(_){}}

let legalLoaded=false;
function showModal(id){$$('.modal.show').forEach(x=>{x.classList.remove('show');x.setAttribute('aria-hidden','true')});const m=$(id);if(!m)return;m.classList.add('show');m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function closeModals(){$$('.modal.show').forEach(x=>{x.classList.remove('show');x.setAttribute('aria-hidden','true')});document.body.style.overflow=''}
async function loadLegal(){if(legalLoaded)return;const root=$('#legal-docs');try{const d=await rpc('bridgepoint_public_legal_preview_v1054');const docs=d.required_documents||[];root.innerHTML=docs.map(x=>`<details><summary>${esc(x.title)} · ${esc(x.document_version)}</summary><div class="doc-copy"><b>${esc(x.summary||'')}</b>\n\n${esc(x.content_markdown||'')}</div></details>`).join('')||'<div class="loading-line">No active required documents returned.</div>';legalLoaded=true}catch(e){root.innerHTML=`<div class="loading-line">Could not load the legal registry: ${esc(e.message)}</div>`}}
async function beginAccount(){showModal('#legal-modal');await loadLegal()}
function updateLegalButton(){const ok=$('#ack-terms').checked&&$('#ack-fcra').checked&&$('#ack-verify').checked;$('#continue-account').disabled=!ok}

async function signup(email,password,niche){const status=$('#account-status');status.className='form-status';status.textContent='Creating account…';const redirect=`${location.origin}/app/?entry=1&mode=signin&utm_source=homepage_v1986`;try{const r=await fetch(`${AUTH}/signup?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password,data:{legal_accepted:true,legal_acceptance_surface:'PUBLIC_FUNNEL_V1986',fcra_use_restriction_ack:true,independent_verification_ack:true,niche_focus:niche,trial_entry_source:'PUBLIC_FUNNEL_V1986'}})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.msg||d?.message||d?.error_description||`Signup failed (${r.status})`);saveAuth(d);status.className='form-status good';status.textContent='Account created. Your 7-day window has started.';$('#created-copy').textContent=d.access_token?'Your account is active. Open BridgePoint now; the app will read your server-backed trial countdown.':'Check your email to verify the address, then sign in. Your server-backed 7-day access window started when the account was created.';showModal('#created-modal')}catch(e){status.className='form-status bad';status.textContent=e.message}}
async function signin(email,password){const status=$('#signin-status');status.className='form-status';status.textContent='Signing in…';try{const r=await fetch(`${AUTH}/token?grant_type=password`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.msg||d?.message||d?.error_description||`Sign in failed (${r.status})`);saveAuth(d);status.className='form-status good';status.textContent='Signed in. Opening BridgePoint…';setTimeout(()=>location.href='/app/?entry=1&utm_source=homepage_v1986',350)}catch(e){status.className='form-status bad';status.textContent=e.message}}

function bind(){
  $$('[data-start-account]').forEach(b=>b.addEventListener('click',beginAccount));$$('[data-open-signin]').forEach(b=>b.addEventListener('click',()=>showModal('#signin-modal')));$$('[data-close-modal]').forEach(b=>b.addEventListener('click',closeModals));$$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModals()}));addEventListener('keydown',e=>{if(e.key==='Escape')closeModals()});
  ['#ack-terms','#ack-fcra','#ack-verify'].forEach(s=>$(s)?.addEventListener('change',updateLegalButton));$('#continue-account')?.addEventListener('click',()=>showModal('#account-modal'));$('#switch-signin')?.addEventListener('click',()=>showModal('#signin-modal'));
  $('#teaser-form')?.addEventListener('submit',e=>{e.preventDefault();const q=$('#address-input').value.trim();if(q)runTeaser(q)});
  $('#account-form')?.addEventListener('submit',e=>{e.preventDefault();signup($('#signup-email').value.trim(),$('#signup-password').value,$('#signup-niche').value)});
  $('#signin-form')?.addEventListener('submit',e=>{e.preventDefault();signin($('#signin-email').value.trim(),$('#signin-password').value)});
}

startCosmos();bind();refreshPulse();loadMedia();setInterval(refreshPulse,3000);
})();
