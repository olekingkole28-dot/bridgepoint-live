(()=>{'use strict';
const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co',KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const H={apikey:KEY,'Content-Type':'application/json',Accept:'application/json'};
const PALETTE=['#60e5ff','#ffca66','#b387ff','#62e0a1','#ff7e8d','#5f9bff','#f59f5a','#84d7ff','#e77cff','#b9dc6a','#ff9fd1','#66d1c1'];
const $=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString();
async function rpc(name,args={},ms=6500){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(SUPA+'/rest/v1/rpc/'+name,{method:'POST',headers:H,body:JSON.stringify(args),signal:c.signal,cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||('HTTP '+r.status));return d}finally{clearTimeout(t)}}
function setBook(d){
 const status=String(d?.google_play_status||'PENDING_VERIFICATION'),buy=$('landingBookBuy'),msg=$('landingBookStatus');
 if(!buy||!msg)return;
 const live=status==='LIVE'&&d?.purchase_url,pre=status==='PREORDER'&&d?.purchase_url;
 if(live||pre){buy.hidden=false;buy.href=d.purchase_url;buy.target='_blank';buy.rel='noopener noreferrer';buy.textContent=(live?'BUY ON GOOGLE PLAY':'PREORDER ON GOOGLE PLAY')+' · $'+Number(d.list_price_amount||d.price_usd||4.99).toFixed(2);msg.innerHTML='<strong>'+status.replaceAll('_',' ')+'</strong> · official Google purchase link is live.'}
 else{buy.hidden=true;buy.removeAttribute('href');const checked=d?.last_checked_at?new Date(d.last_checked_at).toLocaleString():'not checked yet';msg.innerHTML='<strong>'+status.replaceAll('_',' ')+'</strong> · last Google sale check '+checked+'. The button will appear here automatically when Google exposes the verified sale listing.'}
}
function donutData(rows){
 const live=(rows||[]).filter(x=>Number(x.canonical_records)>0).sort((a,b)=>Number(b.canonical_records)-Number(a.canonical_records));
 if(!live.length)return{rows:[],gradient:'#18313d',total:0};
 const total=live.reduce((s,x)=>s+Number(x.canonical_records||0),0);let pct=0,parts=[];
 live.forEach((x,i)=>{const p=total?Number(x.canonical_records||0)/total*100:0,start=pct,end=pct+pct===pct?pct+p:pct+p;pct=end;parts.push(PALETTE[i%PALETTE.length]+' '+start.toFixed(3)+'% '+end.toFixed(3)+'%')});
 return{rows:live,gradient:'conic-gradient('+parts.join(',')+')',total};
}
function legend(el,rows,total){
 if(!el)return;el.replaceChildren();
 rows.slice(0,14).forEach((x,i)=>{const row=document.createElement('div');row.className='bp-coverage-legend-row';const dot=document.createElement('i');dot.style.background=PALETTE[i%PALETTE.length];const name=document.createElement('span');name.textContent=(x.country_name||x.country_code)+' · '+fmt(x.canonical_records);const pct=document.createElement('small');pct.textContent=total?((Number(x.canonical_records)/total)*100).toFixed(1)+'%':'0%';row.append(dot,name,pct);el.append(row)});
}
function states(el,rows){
 if(!el)return;el.replaceChildren();const top=(rows||[]).slice().sort((a,b)=>Number(b.canonical_records)-Number(a.canonical_records)).slice(0,12),max=Math.max(1,...top.map(x=>Number(x.canonical_records||0)));
 top.forEach((x,i)=>{const row=document.createElement('div');row.className='bp-state-row';const code=document.createElement('span');code.textContent=x.state_code;const track=document.createElement('div');track.className='bp-state-track';const fill=document.createElement('div');fill.className='bp-state-fill';fill.style.width=Math.max(1,Number(x.canonical_records||0)/max*100)+'%';fill.style.background=PALETTE[i%PALETTE.length];track.append(fill);const count=document.createElement('span');count.className='bp-state-count';count.textContent=fmt(x.canonical_records);row.append(code,track,count);el.append(row)});
}
function setCoverage(d){
 const s=d?.summary||{},countries=d?.countries||[],us=d?.us_states||[],dd=donutData(countries);
 if($('coverageCountries'))$('coverageCountries').textContent=fmt(s.countries_registered);
 if($('coveragePopulated'))$('coveragePopulated').textContent=fmt(s.countries_with_canonical_records);
 if($('coverageUSRecords'))$('coverageUSRecords').textContent=fmt(s.us_canonical_records);
 if($('coverageUSJurisdictions'))$('coverageUSJurisdictions').textContent=fmt(s.us_jurisdictions_reporting);
 if($('coverageDonut'))$('coverageDonut').style.background=dd.gradient;
 if($('coverageDonutValue'))$('coverageDonutValue').textContent=fmt(dd.total);
 legend($('coverageCountryLegend'),dd.rows,dd.total);states($('coverageStateBars'),us);
 const when=s.last_updated_at?new Date(s.last_updated_at).toLocaleString():'awaiting refresh';if($('coverageUpdated'))$('coverageUpdated').textContent='Last updated '+when;
 window.__BP_PUBLIC_COVERAGE_V5598__={version:5598,countriesRegistered:Number(s.countries_registered||0),countriesPopulated:Number(s.countries_with_canonical_records||0),canonicalRecords:Number(s.us_canonical_records||0),updatedAt:Date.now()};
}
async function refresh(){
 if(document.hidden)return;try{const [book,coverage]=await Promise.all([rpc('bridgepoint_public_book_v5595',{},4500),rpc('bridgepoint_public_global_coverage_v5597',{},6000)]);setBook(book);setCoverage(coverage)}catch(e){console.warn('BridgePoint public growth/coverage refresh',e);if($('coverageUpdated'))$('coverageUpdated').textContent='Live coverage refresh retrying';}
}
function boot(){const run=()=>refresh();if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:3500});else setTimeout(run,1200);setInterval(refresh,300000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()},{passive:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();