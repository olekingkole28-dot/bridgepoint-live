(()=>{
'use strict';
if(window.__bridgepointLegalGateV1054)return;window.__bridgepointLegalGateV1054=true;
const PROJECT='https://xdfsjztwgsbmabshzsjw.supabase.co',KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25',API=`${PROJECT}/rest/v1/rpc/`;
const ACCEPT_KEY='bp1054_required_legal_acceptance';
let legal=null,loading=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function publicRpc(name,body={}){const c=new AbortController(),tm=setTimeout(()=>c.abort(),9000);try{const r=await fetch(API+name,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body),signal:c.signal,cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`${name}:${r.status}`);return d;}finally{clearTimeout(tm);}}
function loadLegal(){if(legal)return Promise.resolve(legal);if(loading)return loading;loading=publicRpc('bridgepoint_public_legal_preview_v1054',{}).then(d=>(legal=d,d)).finally(()=>loading=null);return loading;}
function currentAcceptance(){try{return JSON.parse(sessionStorage.getItem(ACCEPT_KEY)||'null');}catch(_){return null;}}
function saveAcceptance(docs){const x={accepted:true,accepted_at:new Date().toISOString(),documents:docs.map(d=>({document_key:d.document_key,document_version:d.document_version}))};try{sessionStorage.setItem(ACCEPT_KEY,JSON.stringify(x));}catch(_){}return x;}
function clearAcceptance(){try{sessionStorage.removeItem(ACCEPT_KEY);}catch(_){}}
function acceptedFor(docs){const a=currentAcceptance();if(!a?.accepted||!Array.isArray(a.documents))return false;return docs.every(d=>a.documents.some(x=>x.document_key===d.document_key&&x.document_version===d.document_version));}
const nativeFetch=window.fetch.bind(window);
window.fetch=async function(input,init={}){
  let url='';try{url=typeof input==='string'?input:input?.url||'';}catch(_){}
  if(/\/auth\/v1\/signup(?:\?|$)/.test(url)&&init?.body){
    try{
      const docs=legal?.required_documents||[],a=currentAcceptance();
      if(!docs.length||!acceptedFor(docs)||!a?.accepted)throw new Error('REQUIRED_LEGAL_NOT_ACCEPTED');
      const body=JSON.parse(init.body);body.data={...(body.data||{}),legal_accepted:true,legal_acceptance_source:'PRE_SIGNUP_V1054',legal_accepted_at:a.accepted_at,legal_document_versions:a.documents};
      init={...init,body:JSON.stringify(body)};
    }catch(e){if(String(e?.message||e)==='REQUIRED_LEGAL_NOT_ACCEPTED')throw e;}
  }
  return nativeFetch(input,init);
};
const style=document.createElement('style');style.id='bp1054-legal-gate-style';style.textContent=`
.bp1054-legal{display:none;margin:2px 0 3px;padding:11px;border:1px solid rgba(255,201,94,.2);border-radius:14px;background:rgba(255,201,94,.045)}.bp1054-legal.show{display:block}.bp1054-legal-head{display:flex;gap:8px;align-items:flex-start;margin-bottom:8px}.bp1054-legal-head div{flex:1}.bp1054-legal-head b{display:block;font-size:12px}.bp1054-legal-head small{display:block;color:#aa9a77;font-size:9px;margin-top:2px}.bp1054-legal-doc{border-top:1px solid rgba(255,255,255,.07);padding:8px 0}.bp1054-legal-doc summary{cursor:pointer;font-weight:900;font-size:10.5px;color:#f4f7fa}.bp1054-legal-doc p{margin:5px 0;color:#9eb0be;font-size:9px}.bp1054-legal-copy{max-height:180px;overflow:auto;white-space:pre-wrap;padding:8px;border-radius:9px;background:#071421;color:#aebdca;font-size:8.5px;line-height:1.45}.bp1054-accept{display:flex;gap:8px;align-items:flex-start;margin-top:8px;color:#d7e0e7;font-size:10px;cursor:pointer}.bp1054-accept input{width:18px;height:18px;flex:0 0 18px;accent-color:#48e1ff}.bp1054-legal-ok{margin-top:7px;color:#6ce8ae;font-size:9px;font-weight:900}.bp1054-legal-error{margin-top:7px;color:#ffaaa5;font-size:9px;font-weight:900}`;document.head.appendChild(style);
function createGate(root,docs){let gate=root.querySelector('.bp1054-legal');if(gate)return gate;gate=document.createElement('section');gate.className='bp1054-legal';gate.innerHTML=`<div class="bp1054-legal-head"><div><b>Required before account creation</b><small>Review and accept the current Terms, Privacy, Data & Scoring, Acceptable Use, and Platform Safety disclosures. Your accepted versions are stored with the account.</small></div></div><div data-docs>${docs.map(d=>`<details class="bp1054-legal-doc"><summary>${esc(d.title)} • ${esc(d.document_version)}</summary><p>${esc(d.summary)}</p><div class="bp1054-legal-copy">${esc(d.content_markdown||'')}</div></details>`).join('')}</div><label class="bp1054-accept"><input type="checkbox" data-legal-accept><span>I have reviewed and agree to all required BridgePoint disclosures listed above.</span></label><div data-legal-state></div>`;
  const submit=root.querySelector('[data-submit]');submit?.parentElement?.insertBefore(gate,submit);
  const cb=gate.querySelector('[data-legal-accept]');cb.checked=acceptedFor(docs);cb.onchange=()=>{if(cb.checked){saveAcceptance(docs);gate.querySelector('[data-legal-state]').className='bp1054-legal-ok';gate.querySelector('[data-legal-state]').textContent='Required disclosures accepted for this signup.';}else{clearAcceptance();gate.querySelector('[data-legal-state]').textContent='';}sync(root,docs);};
  return gate;
}
function createMode(root){return root.querySelector('[data-mode="create"]')?.classList.contains('active');}
function sync(root,docs){const gate=createGate(root,docs),isCreate=createMode(root);gate.classList.toggle('show',isCreate);const submit=root.querySelector('[data-submit]');if(isCreate&&submit&&!acceptedFor(docs)){submit.setAttribute('aria-disabled','true');submit.title='Accept the required BridgePoint disclosures before creating an account.';}else if(submit){submit.removeAttribute('aria-disabled');submit.title='';}}
async function mount(){const root=document.getElementById('bp1046-auth');if(!root||root.dataset.bp1054Legal==='1')return;root.dataset.bp1054Legal='1';let d;try{d=await loadLegal();}catch(_){d={required_documents:[]};}const docs=Array.isArray(d?.required_documents)?d.required_documents:[];if(!docs.length){root.dataset.bp1054Legal='error';return;}createGate(root,docs);sync(root,docs);
  root.addEventListener('click',e=>{if(e.target.closest('[data-mode]'))setTimeout(()=>sync(root,docs),0);const submit=e.target.closest('[data-submit]');if(submit&&createMode(root)&&!acceptedFor(docs)){e.preventDefault();e.stopImmediatePropagation();const st=root.querySelector('[data-status]');if(st){st.textContent='Review and accept the required BridgePoint disclosures before creating your account.';st.className='bp1046a-status bad';}const gate=root.querySelector('.bp1054-legal');gate?.scrollIntoView({behavior:'smooth',block:'center'});}},true);
}
const mo=new MutationObserver(()=>mount());mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(mount,250);
window.BridgePointLegalGateV1054={loadLegal,currentAcceptance};
})();