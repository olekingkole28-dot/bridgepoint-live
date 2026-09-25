const scan=document.getElementById('scan');
const result=document.getElementById('result');
const status=document.getElementById('status');
const set=(id,v)=>document.getElementById(id).textContent=v;

async function inspectActivePage(){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id)throw new Error('No active browser tab is available.');
  const [{result:data}]=await chrome.scripting.executeScript({
    target:{tabId:tab.id},
    func:()=>{
      const text=(document.body?.innerText||'').slice(0,500000);
      const zipMatches=[...text.matchAll(/\b(\d{5})(?:-\d{4})?\b/g)].map(m=>m[1]);
      const zip=zipMatches[0]||null;
      const money=(text.match(/\$\s?\d[\d,]*(?:\.\d{2})?/g)||[]).length;
      const terms=['estimate','replacement cost','actual cash value','roof','shingle','supplement','line item','deductible','depreciation'];
      const lower=text.toLowerCase();
      const detected=terms.filter(t=>lower.includes(t));
      return {zip,money,detected,title:document.title||'',url:location.href};
    }
  });
  return data;
}

scan.addEventListener('click',async()=>{
  scan.disabled=true;status.textContent='Inspecting visible page text locally…';
  try{
    const data=await inspectActivePage();
    set('zip',data.zip||'Not found');
    set('money',String(data.money));
    set('terms',data.detected.length?data.detected.join(', '):'No common estimate terms found');
    set('title',data.title||'Untitled page');
    const u=new URL('https://bridgepointintelligence.online/estimate-preflight/');
    u.searchParams.set('utm_source','browser_assist');
    u.searchParams.set('utm_medium','extension');
    u.searchParams.set('utm_campaign','distribution_v547');
    if(data.zip)u.searchParams.set('zip',data.zip);
    document.getElementById('open').href=u.toString();
    result.classList.remove('hidden');
    status.textContent='Local inspection complete. No page text was sent to BridgePoint.';
  }catch(error){status.textContent=`Unable to inspect this page: ${error.message}`;}
  finally{scan.disabled=false;}
});
