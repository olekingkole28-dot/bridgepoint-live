(()=>{
  'use strict';
  if(window.__bridgepointExperienceV974)return;
  window.__bridgepointExperienceV974=true;
  const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co';
  const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
  const languages=[
    ['en','English'],['es','Español'],['fr','Français'],['pt-BR','Português (Brasil)'],['de','Deutsch'],['it','Italiano'],['nl','Nederlands'],['pl','Polski'],['ro','Română'],['ru','Русский'],['uk','Українська'],['tr','Türkçe'],['ar','العربية'],['he','עברית'],['hi','हिन्दी'],['bn','বাংলা'],['pa','ਪੰਜਾਬੀ'],['ur','اردو'],['zh-Hans','简体中文'],['zh-Hant','繁體中文'],['ja','日本語'],['ko','한국어'],['vi','Tiếng Việt'],['id','Bahasa Indonesia'],['tl','Filipino / Tagalog'],['th','ไทย'],['ht','Kreyòl ayisyen']
  ];
  const states=['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  const css=document.createElement('style');
  css.textContent=`
    #bp974-cosmos{position:fixed;inset:0;z-index:2147480500;pointer-events:none;opacity:.60;mix-blend-mode:screen;transition:opacity .22s ease,visibility .22s ease}
    #bp974-cosmos.bp974-covered{opacity:0!important;visibility:hidden!important}
    #bp974-preapp{position:fixed;z-index:2147483300;right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));display:flex;gap:7px;align-items:center;font:800 12px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .bp974-pill{min-height:40px;border:1px solid rgba(72,225,255,.26);border-radius:12px;padding:0 12px;background:rgba(6,17,30,.90);color:#fff;box-shadow:0 10px 32px rgba(0,0,0,.28);backdrop-filter:blur(14px);cursor:pointer;font-weight:850}.bp974-pill.primary{color:#06111e;background:linear-gradient(135deg,#48e1ff,#6c83ff);border-color:transparent}
    #bp974-modal{position:fixed;z-index:2147483640;inset:0;display:none;place-items:center;padding:16px;background:rgba(1,4,9,.80);backdrop-filter:blur(16px);font:500 13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}#bp974-modal.show{display:grid}#bp974-modal *{box-sizing:border-box}
    .bp974-card{width:min(690px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:20px;border-radius:20px;background:linear-gradient(160deg,rgba(10,25,42,.99),rgba(4,10,20,.99));border:1px solid rgba(72,225,255,.22);box-shadow:0 28px 100px rgba(0,0,0,.62)}
    .bp974-head{display:flex;gap:10px;align-items:flex-start}.bp974-grow{flex:1}.bp974-title{font-size:21px;font-weight:950}.bp974-sub{margin-top:4px;color:#a9bdd0}.bp974-close{border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer}
    .bp974-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.bp974-field{display:flex;flex-direction:column;gap:6px}.bp974-field.full{grid-column:1/-1}.bp974-field label{font-size:10px;color:#9fb3c6;font-weight:900;letter-spacing:.55px;text-transform:uppercase}.bp974-field input,.bp974-field select{width:100%;min-height:46px;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:#0b1c2e;color:#fff;padding:0 12px;font:700 13px system-ui;outline:none}.bp974-field input:focus,.bp974-field select:focus{border-color:#48e1ff;box-shadow:0 0 0 3px rgba(72,225,255,.08)}
    .bp974-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.bp974-actions button{min-height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.12);padding:0 15px;background:#12243a;color:#fff;font-weight:900;cursor:pointer}.bp974-actions .primary{background:linear-gradient(135deg,#48e1ff,#6c83ff);color:#031018;border:0}.bp974-status{min-height:18px;margin-top:10px;color:#9fb3c6}.bp974-status.bad{color:#ff8d8d}.bp974-status.good{color:#45e6a6}
    .bp974-language-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:15px}.bp974-language{min-height:45px;text-align:left;border:1px solid rgba(255,255,255,.10);border-radius:11px;background:#0b1c2e;color:#fff;padding:0 10px;font-weight:800;cursor:pointer}.bp974-language.active{border-color:#48e1ff;background:rgba(72,225,255,.10);color:#76ebff}
    @media(max-width:680px){#bp974-preapp{right:8px;top:max(8px,env(safe-area-inset-top));gap:5px}.bp974-pill{min-height:38px;padding:0 9px;font-size:11px}.bp974-grid{grid-template-columns:1fr}.bp974-field.full{grid-column:auto}.bp974-language-list{grid-template-columns:1fr 1fr}.bp974-card{padding:16px}#bp974-cosmos{opacity:.56}}
    @media(prefers-reduced-motion:reduce){#bp974-cosmos{opacity:.26}}
  `;
  document.head.appendChild(css);

  function findAccessToken(){
    const seen=new Set();
    const walk=v=>{if(v==null||seen.has(v))return null;if(typeof v==='object'){seen.add(v);if(typeof v.access_token==='string'&&v.access_token.length>30)return v.access_token;for(const x of Object.values(v)){const hit=walk(x);if(hit)return hit;}}return null;};
    try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(!/auth|supabase|sb-/i.test(k))continue;const raw=localStorage.getItem(k);if(!raw)continue;try{const hit=walk(JSON.parse(raw));if(hit)return hit;}catch(_){}}}catch(_){ }
    return null;
  }

  const canvas=document.createElement('canvas');canvas.id='bp974-cosmos';canvas.setAttribute('aria-hidden','true');document.body.appendChild(canvas);const ctx=canvas.getContext('2d');let dpr=1,w=0,h=0,t=0,raf=0;
  const reduce=matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
  const intake=[
    ['home','72,225,255'],['roof','255,201,94'],['hail','141,232,255'],['tornado','155,123,255'],
    ['hurricane','108,131,255'],['fire','255,107,107'],['flood','66,191,255'],['rain','108,131,255'],
    ['lightning','255,201,94'],['claim','255,120,198'],['permit','255,149,87'],['construction','255,201,94'],
    ['solar','69,230,166'],['risk','72,225,255'],['commercial','139,92,246'],['location','69,230,166']
  ];
  function resize(){dpr=Math.min(devicePixelRatio||1,2);w=innerWidth;h=innerHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}
  const frac=v=>v-Math.floor(v);
  function star(i){return [frac(Math.sin(i*12.9898+1.7)*43758.5453)*w,frac(Math.sin(i*8.233+4.1)*24634.6345)*h];}
  function drawPlanet(x,y,r,inner,outer){const g=ctx.createRadialGradient(x-r*.28,y-r*.32,r*.05,x,y,r);g.addColorStop(0,inner);g.addColorStop(.55,outer);g.addColorStop(1,'rgba(1,3,8,.18)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  function drawIntakeIcon(kind,x,y,s,rgb,alpha){
    ctx.save();ctx.translate(x,y);ctx.scale(s/24,s/24);ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=1.8;ctx.strokeStyle=`rgba(${rgb},${alpha})`;ctx.fillStyle=`rgba(${rgb},${alpha*.16})`;ctx.shadowBlur=10;ctx.shadowColor=`rgba(${rgb},${alpha*.48})`;
    const path=()=>ctx.beginPath();
    if(kind==='home'){path();ctx.moveTo(-9,0);ctx.lineTo(0,-8);ctx.lineTo(9,0);ctx.lineTo(7,0);ctx.lineTo(7,8);ctx.lineTo(-7,8);ctx.lineTo(-7,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeRect(-2,3,4,5);}
    else if(kind==='roof'){path();ctx.moveTo(-10,3);ctx.lineTo(0,-6);ctx.lineTo(10,3);ctx.stroke();ctx.strokeRect(4,-6,2,5);path();ctx.moveTo(-6,4);ctx.lineTo(6,4);ctx.stroke();}
    else if(kind==='hail'){path();ctx.arc(-3,-2,4,Math.PI,.1);ctx.arc(2,-4,4,Math.PI,0);ctx.arc(6,-1,3.5,-Math.PI/2,Math.PI/2);ctx.lineTo(-7,2);ctx.stroke();for(const hx of[-5,0,5]){ctx.beginPath();ctx.arc(hx,6,1.7,0,Math.PI*2);ctx.fill();ctx.stroke();}}
    else if(kind==='tornado'){for(let i=0;i<5;i++){const yy=-7+i*3.2,ww=9-i*1.7;path();ctx.moveTo(-ww,yy);ctx.bezierCurveTo(-ww*.25,yy+2,ww*.65,yy-1,ww,yy+.5);ctx.stroke();}path();ctx.moveTo(-1,6);ctx.lineTo(1,9);ctx.stroke();}
    else if(kind==='hurricane'){ctx.beginPath();ctx.arc(0,0,2.4,0,Math.PI*2);ctx.stroke();path();ctx.arc(-1,0,8,-.35,2.35);ctx.stroke();path();ctx.arc(1,0,8,Math.PI-.35,Math.PI*2+2.35);ctx.stroke();}
    else if(kind==='fire'){path();ctx.moveTo(0,10);ctx.bezierCurveTo(-9,5,-6,-2,-1,-8);ctx.bezierCurveTo(0,-3,4,-5,4,-10);ctx.bezierCurveTo(10,-3,9,5,0,10);ctx.closePath();ctx.fill();ctx.stroke();path();ctx.moveTo(0,7);ctx.bezierCurveTo(-3,4,-1,1,2,-2);ctx.bezierCurveTo(5,2,4,5,0,7);ctx.stroke();}
    else if(kind==='flood'){for(let i=0;i<3;i++){const yy=-4+i*5;path();ctx.moveTo(-10,yy);ctx.bezierCurveTo(-6,yy-3,-2,yy+3,2,yy);ctx.bezierCurveTo(6,yy-3,8,yy+2,10,yy);ctx.stroke();}}
    else if(kind==='rain'){path();ctx.arc(-3,-3,4,Math.PI,.1);ctx.arc(2,-5,4,Math.PI,0);ctx.arc(6,-2,3.5,-Math.PI/2,Math.PI/2);ctx.lineTo(-7,1);ctx.stroke();for(const xx of[-5,0,5]){path();ctx.moveTo(xx,4);ctx.lineTo(xx-2,8);ctx.stroke();}}
    else if(kind==='lightning'){path();ctx.moveTo(2,-10);ctx.lineTo(-5,1);ctx.lineTo(0,1);ctx.lineTo(-2,10);ctx.lineTo(7,-3);ctx.lineTo(2,-3);ctx.closePath();ctx.fill();ctx.stroke();}
    else if(kind==='claim'){ctx.strokeRect(-7,-9,14,18);path();ctx.moveTo(2,-9);ctx.lineTo(7,-4);ctx.lineTo(2,-4);ctx.closePath();ctx.stroke();path();ctx.moveTo(-4,2);ctx.lineTo(-1,5);ctx.lineTo(5,-2);ctx.stroke();}
    else if(kind==='permit'){ctx.strokeRect(-7,-7,14,15);ctx.strokeRect(-3,-10,6,4);path();ctx.moveTo(-4,0);ctx.lineTo(4,0);ctx.moveTo(-4,4);ctx.lineTo(2,4);ctx.stroke();}
    else if(kind==='construction'){path();ctx.moveTo(-8,7);ctx.lineTo(5,-6);ctx.moveTo(1,-8);ctx.lineTo(8,-1);ctx.moveTo(-10,4);ctx.lineTo(-5,9);ctx.stroke();path();ctx.moveTo(1,-8);ctx.lineTo(5,-9);ctx.lineTo(9,-5);ctx.lineTo(8,-1);ctx.stroke();}
    else if(kind==='solar'){ctx.strokeRect(-9,0,14,8);path();ctx.moveTo(-4,0);ctx.lineTo(-4,8);ctx.moveTo(1,0);ctx.lineTo(1,8);ctx.moveTo(-9,4);ctx.lineTo(5,4);ctx.stroke();ctx.beginPath();ctx.arc(6,-6,3,0,Math.PI*2);ctx.stroke();for(let a=0;a<8;a++){const q=a*Math.PI/4;path();ctx.moveTo(6+Math.cos(q)*5,-6+Math.sin(q)*5);ctx.lineTo(6+Math.cos(q)*7,-6+Math.sin(q)*7);ctx.stroke();}}
    else if(kind==='risk'){path();ctx.moveTo(0,-10);ctx.lineTo(8,-6);ctx.lineTo(7,2);ctx.bezierCurveTo(6,7,2,9,0,10);ctx.bezierCurveTo(-2,9,-6,7,-7,2);ctx.lineTo(-8,-6);ctx.closePath();ctx.fill();ctx.stroke();path();ctx.moveTo(-3,0);ctx.lineTo(-.5,3);ctx.lineTo(4,-3);ctx.stroke();}
    else if(kind==='commercial'){ctx.strokeRect(-8,-9,16,18);for(const yy of[-5,0,5])for(const xx of[-4,4])ctx.strokeRect(xx-1.5,yy-1.5,3,3);}
    else if(kind==='location'){path();ctx.moveTo(0,10);ctx.bezierCurveTo(-8,1,-8,-3,-5,-7);ctx.bezierCurveTo(-2,-11,2,-11,5,-7);ctx.bezierCurveTo(8,-3,8,1,0,10);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,-3,2.5,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }
  function draw(){
    ctx.clearRect(0,0,w,h);
    const cx=w*.5,cy=h*.50,r=Math.max(126,Math.min(w,h)*.285),pulse=.5+.5*Math.sin(t*.016);
    for(let i=0;i<118;i++){const [x,y]=star(i),tw=.25+.75*(.5+.5*Math.sin(t*.003+i*1.7)),big=i%23===0,rr=big?1.35:i%7===0?.85:.45,a=.10+tw*(big?.30:.13);ctx.fillStyle=`rgba(230,242,255,${a})`;ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.fill();if(big){ctx.strokeStyle=`rgba(230,242,255,${a*.55})`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x-3.2,y);ctx.lineTo(x+3.2,y);ctx.moveTo(x,y-3.2);ctx.lineTo(x,y+3.2);ctx.stroke();}}
    drawPlanet(w*.13,h*.18,Math.max(16,Math.min(w,h)*.052),'rgba(125,151,205,.55)','rgba(29,45,83,.24)');
    drawPlanet(w*.86,h*.80,Math.max(11,Math.min(w,h)*.034),'rgba(211,143,103,.46)','rgba(74,34,52,.20)');
    const glow=ctx.createRadialGradient(cx,cy,r*.42,cx,cy,r*3.1);glow.addColorStop(0,'rgba(0,0,0,.98)');glow.addColorStop(.27,'rgba(0,0,0,.93)');glow.addColorStop(.43,`rgba(139,92,246,${.12+pulse*.035})`);glow.addColorStop(.60,'rgba(108,131,255,.075)');glow.addColorStop(.78,'rgba(72,225,255,.026)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,r*3.1,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.18+Math.sin(t*.00015)*.018);for(let i=0;i<14;i++){ctx.beginPath();ctx.ellipse(0,0,r*(1.72+i*.045),r*(.35+i*.012),0,t*.00034+i*.018,t*.00034+i*.018+Math.PI*(1.72-(i%4)*.055));const hue=i%5===0?'255,201,94':i%2===0?'72,225,255':'139,92,246';ctx.strokeStyle=`rgba(${hue},${.09+i*.008+pulse*.02})`;ctx.lineWidth=1+(i%4)*.55;ctx.shadowBlur=9+(i%4)*2;ctx.shadowColor=`rgba(${hue},.24)`;ctx.stroke();}ctx.restore();
    for(let i=0;i<intake.length;i++){const journey=frac(t*.000028+i/intake.length),e=journey*journey*journey,rr=r*(4.0-e*3.22),a=i*.92+journey*Math.PI*4.35+t*.00009,px=cx+Math.cos(a)*rr,py=cy+Math.sin(a)*rr*.47,enter=Math.min(1,journey/.10),vanish=1-Math.max(0,Math.min(1,(journey-.80)/.17)),alpha=.15+.72*enter*vanish,size=(19+(i%4)*2.5)*(1-e*.30);drawIntakeIcon(intake[i][0],px,py,size,intake[i][1],alpha);}
    ctx.strokeStyle=`rgba(72,225,255,${.19+pulse*.08})`;ctx.lineWidth=2.1;ctx.shadowBlur=13;ctx.shadowColor='rgba(72,225,255,.34)';ctx.beginPath();ctx.arc(cx,cy,r*(.82+pulse*.014),0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='rgba(0,0,0,.995)';ctx.beginPath();ctx.arc(cx,cy,r*(.69+pulse*.008),0,Math.PI*2);ctx.fill();ctx.strokeStyle=`rgba(139,92,246,${.10+pulse*.025})`;ctx.lineWidth=.8;ctx.beginPath();ctx.arc(cx,cy,r*.705,0,Math.PI*2);ctx.stroke();
    if(!reduce){t+=16;raf=requestAnimationFrame(draw);}
  }
  resize();addEventListener('resize',resize);draw();

  const controls=document.createElement('div');controls.id='bp974-preapp';controls.innerHTML='<button class="bp974-pill" data-language type="button">🌐 Language</button><button class="bp974-pill primary" data-create type="button">Create account</button>';document.body.appendChild(controls);
  let selected=localStorage.getItem('bpPreferredLocaleV974')||'en';
  const modal=document.createElement('div');modal.id='bp974-modal';document.body.appendChild(modal);
  const close=()=>modal.classList.remove('show');
  function languageName(code){return languages.find(x=>x[0]===code)?.[1]||'English';}
  function openLanguages(){modal.innerHTML=`<div class="bp974-card"><div class="bp974-head"><div class="bp974-grow"><div class="bp974-title">Choose your language</div><div class="bp974-sub">27 languages are available before you enter BridgePoint. Your choice is remembered on this device.</div></div><button class="bp974-close" aria-label="Close">×</button></div><div class="bp974-language-list">${languages.map(([code,name])=>`<button class="bp974-language${code===selected?' active':''}" data-code="${code}" type="button">${name}</button>`).join('')}</div></div>`;modal.classList.add('show');modal.querySelector('.bp974-close').onclick=close;modal.querySelectorAll('[data-code]').forEach(b=>b.onclick=()=>{selected=b.dataset.code;localStorage.setItem('bpPreferredLocaleV974',selected);controls.querySelector('[data-language]').textContent='🌐 '+languageName(selected);openLanguages();});}
  function opts(values,current){return values.map(v=>`<option${v===current?' selected':''}>${v}</option>`).join('');}
  function openCreate(){modal.innerHTML=`<div class="bp974-card"><div class="bp974-head"><div class="bp974-grow"><div class="bp974-title">Create your BridgePoint account</div><div class="bp974-sub">Start with language and a few questions so BridgePoint can open in the right context for your work.</div></div><button class="bp974-close" aria-label="Close">×</button></div><form data-form><div class="bp974-grid"><div class="bp974-field"><label>Language</label><select name="locale">${languages.map(([code,name])=>`<option value="${code}"${code===selected?' selected':''}>${name}</option>`).join('')}</select></div><div class="bp974-field"><label>Primary state</label><select name="state">${states.map(s=>`<option${s==='CT'?' selected':''}>${s}</option>`).join('')}</select></div><div class="bp974-field full"><label>Email</label><input name="email" type="email" autocomplete="email" required placeholder="you@company.com"></div><div class="bp974-field full"><label>Password</label><input name="password" type="password" autocomplete="new-password" required minlength="6" placeholder="At least 6 characters"></div><div class="bp974-field"><label>Industry</label><select name="industry">${opts(['Roofing','Restoration / Mitigation','Public Adjusting','Insurance / Claims','Real Estate / Investing','Property Management','Homeowner','Other'],'Roofing')}</select></div><div class="bp974-field"><label>Your role</label><select name="role">${opts(['Owner / Founder','Manager','Sales / Field','Adjuster / Claims','Analyst','Homeowner','Other'],'Owner / Founder')}</select></div><div class="bp974-field"><label>Primary goal</label><select name="goal">${opts(['Find the best opportunities','Evaluate properties','Manage claims','Track risk','Build portfolio intelligence','Other'],'Find the best opportunities')}</select></div><div class="bp974-field"><label>Experience</label><select name="experience">${opts(['Just starting','Growing business','Established team','Enterprise / Carrier'],'Growing business')}</select></div></div><div class="bp974-status" data-status></div><div class="bp974-actions"><button type="button" data-cancel>Cancel</button><button class="primary" type="submit">Create account</button></div></form></div>`;modal.classList.add('show');modal.querySelector('.bp974-close').onclick=close;modal.querySelector('[data-cancel]').onclick=close;const form=modal.querySelector('[data-form]');form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form),status=form.querySelector('[data-status]'),submit=form.querySelector('[type=submit]');const email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');if(!email.includes('@')||password.length<6){status.className='bp974-status bad';status.textContent='Enter a valid email and a password with at least 6 characters.';return;}submit.disabled=true;status.className='bp974-status';status.textContent='Creating your account…';selected=String(fd.get('locale')||'en');localStorage.setItem('bpPreferredLocaleV974',selected);try{const r=await fetch(`${SUPA}/auth/v1/signup`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password,data:{preferred_locale:selected,onboarding_version:'v974',industry:String(fd.get('industry')||''),role:String(fd.get('role')||''),primary_goal:String(fd.get('goal')||''),primary_state:String(fd.get('state')||''),experience:String(fd.get('experience')||'')}})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.msg||j?.message||j?.error_description||`Signup failed (${r.status})`);status.className='bp974-status good';status.textContent=j?.access_token?'Account created. BridgePoint is refreshing your session; if needed, sign in with the same email and password.':'Account created. Check your email if confirmation is required, then sign in to BridgePoint.';controls.querySelector('[data-language]').textContent='🌐 '+languageName(selected);}catch(err){status.className='bp974-status bad';status.textContent=String(err?.message||err);}finally{submit.disabled=false;}};}
  controls.querySelector('[data-language]').textContent='🌐 '+languageName(selected);controls.querySelector('[data-language]').onclick=openLanguages;controls.querySelector('[data-create]').onclick=openCreate;modal.addEventListener('click',e=>{if(e.target===modal)close();});
  function modalLikeOpen(){
    if(modal.classList.contains('show'))return true;
    for(const el of document.querySelectorAll('[role="dialog"],[aria-modal="true"]')){
      const rect=el.getBoundingClientRect?.();
      if(!rect||rect.width<2||rect.height<2)continue;
      if(el.getAttribute?.('aria-modal')==='true'||rect.height>innerHeight*.30)return true;
    }
    for(const el of document.querySelectorAll('flt-semantics[aria-label]')){
      const label=(el.getAttribute('aria-label')||'').trim();
      if(!/^(property|opportunity|signal|state)\b/i.test(label))continue;
      const rect=el.getBoundingClientRect?.();
      if(!rect)continue;
      const looksLikeBottomSheet=rect.top>innerHeight*.12&&rect.top<innerHeight*.72&&rect.bottom>innerHeight*.82&&rect.height>innerHeight*.34&&rect.width>innerWidth*.70;
      if(looksLikeBottomSheet)return true;
    }
    return false;
  }
  function syncAuth(){const token=findAccessToken();controls.style.display=token?'none':'flex';canvas.classList.toggle('bp974-covered',modalLikeOpen());}
  syncAuth();setInterval(syncAuth,700);
  new MutationObserver(syncAuth).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['role','aria-modal','aria-label','class']});
})();