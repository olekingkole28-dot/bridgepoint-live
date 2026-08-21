(()=>{
  'use strict';

  const supabaseUrl='https://xdfsjztwgsbmabshzsjw.supabase.co';
  const apikey='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
  const endpoint=`${supabaseUrl}/rest/v1/rpc/track_acquisition_event_v400`;
  const geoEndpoint=`${supabaseUrl}/functions/v1/bridgepoint-coarse-geo-v436`;
  const captureVersion=436;

  const visitorKey='bp_visitor_id_v421';
  const sessionKey='bp_session_id_v421';
  const geoKey='bp_coarse_geo_v436';
  const onceKey='bp_funnel_once_v432';

  const safeStorage=(storage,key,fallback)=>{
    try{
      let value=storage.getItem(key);
      if(!value){value=fallback();storage.setItem(key,value);}
      return value;
    }catch(_){return fallback();}
  };
  const newId=()=>globalThis.crypto?.randomUUID?.()||`bp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const visitorId=safeStorage(localStorage,visitorKey,newId);
  const sessionId=safeStorage(sessionStorage,sessionKey,newId);
  const params=new URLSearchParams(location.search);
  const path=location.pathname||'/';
  const referrerHost=(()=>{try{return document.referrer?new URL(document.referrer).hostname:null;}catch(_){return null;}})();

  let geo={};
  try{
    const cached=sessionStorage.getItem(geoKey);
    if(cached)geo=JSON.parse(cached)||{};
  }catch(_){geo={};}

  const cleanCode=(value,max)=>String(value||'').trim().toUpperCase().slice(0,max);
  const validCountry=value=>/^[A-Z]{2}$/.test(value);
  const validUsState=value=>/^(A[LKZR]|C[AOT]|D[EC]|F[L]|G[A]|H[I]|I[ADLN]|K[SY]|L[A]|M[ADEHINOST]|N[CDEHJMVY]|O[HKR]|P[A]|R[I]|S[CD]|T[NX]|U[T]|V[AIT]|W[AIVY])$/.test(value);
  function keepGeo(countryRaw,regionRaw,source){
    const country=cleanCode(countryRaw,2);
    const region=cleanCode(regionRaw,2);
    const next={};
    if(validCountry(country))next.country_code=country;
    if(country==='US'&&validUsState(region))next.region_code=region;
    if(next.country_code)next.geo_source=source;
    next.geo_resolver_version=436;
    return next;
  }
  function cacheGeo(next){
    if(next&&next.country_code)geo=next;
    try{sessionStorage.setItem(geoKey,JSON.stringify(geo));}catch(_){/* session-only cache is optional */}
    return geo;
  }
  async function fetchWithTimeout(url,options={},timeoutMs=2200){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{return await fetch(url,{...options,signal:controller.signal});}
    finally{clearTimeout(timer);}
  }
  async function bridgepointGeo(){
    try{
      const response=await fetchWithTimeout(geoEndpoint,{
        method:'GET',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',
        headers:{apikey,'Accept':'application/json'},
      },2400);
      if(!response.ok)return null;
      const data=await response.json();
      const next=keepGeo(data?.country_code,data?.region_code,`BRIDGEPOINT_${cleanCode(data?.source,32)||'EDGE'}`);
      return next.country_code?next:null;
    }catch(_){return null;}
  }
  async function legacyGeoFallback(){
    try{
      const response=await fetchWithTimeout('https://ipapi.co/json/',{
        cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Accept':'application/json'},
      },2600);
      if(!response.ok)return null;
      const data=await response.json();
      const next=keepGeo(data?.country_code??data?.country,data?.region_code,'IPAPI_BROWSER_FALLBACK');
      return next.country_code?next:null;
    }catch(_){return null;}
  }
  async function loadCoarseGeo(){
    if(geo.country_code&&(geo.country_code!=='US'||geo.region_code))return geo;
    const primary=await bridgepointGeo();
    if(primary?.country_code&&(primary.country_code!=='US'||primary.region_code))return cacheGeo(primary);
    const fallback=await legacyGeoFallback();
    if(fallback?.country_code)return cacheGeo(fallback);
    if(primary?.country_code)return cacheGeo(primary);
    return geo;
  }
  const geoReady=loadCoarseGeo();

  function currentSource(){
    return params.get('utm_source')||referrerHost||'direct/unknown';
  }
  function markOnce(key){
    try{
      const current=JSON.parse(sessionStorage.getItem(onceKey)||'{}');
      if(current[key])return false;
      current[key]=true;
      sessionStorage.setItem(onceKey,JSON.stringify(current));
      return true;
    }catch(_){return true;}
  }

  async function send(eventType,metadata={}){
    const body={
      p_event_type:eventType,
      p_visitor_id:visitorId,
      p_session_id:sessionId,
      p_page_path:`${location.pathname}${location.search}`.slice(0,256),
      p_platform:'WEB',
      p_referrer_host:referrerHost,
      p_utm_source:params.get('utm_source'),
      p_utm_medium:params.get('utm_medium'),
      p_utm_campaign:params.get('utm_campaign'),
      p_utm_content:params.get('utm_content'),
      p_referral_code:params.get('ref'),
      p_auth_error_code:null,
      p_metadata:{
        capture_version:captureVersion,
        visibility:document.visibilityState,
        source_hint:currentSource(),
        ...geo,
        ...metadata,
      },
    };
    try{
      await fetch(endpoint,{
        method:'POST',
        keepalive:true,
        headers:{apikey,'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify(body),
      });
    }catch(_){/* analytics must never block the customer experience */}
  }

  function initialStage(){
    if(path==='/')return ['LANDING_VIEW',{surface:'homepage'}];
    if(path.startsWith('/articles'))return ['VALUE_VIEW',{surface:'research'}];
    if(path.startsWith('/sample'))return ['SAMPLE_VIEW',{surface:'territory_sample'}];
    if(path.startsWith('/app'))return ['VALUE_VIEW',{surface:'app_entry'}];
    return ['VALUE_VIEW',{surface:'public_page'}];
  }

  geoReady.finally(()=>{
    const [eventType,metadata]=initialStage();
    send(eventType,metadata);
    if(path.startsWith('/sample'))send('VALUE_VIEW',{surface:'territory_sample',intent:'proof_before_signup'});
  });

  const valueSelectors=['#how','#markets','#research','[data-bp-value]'];
  const targets=valueSelectors.flatMap(selector=>Array.from(document.querySelectorAll(selector)));
  if('IntersectionObserver' in window&&targets.length){
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting||entry.intersectionRatio<0.45)continue;
        const id=entry.target.id||entry.target.getAttribute('data-bp-value')||'value-section';
        const key=`value:${path}:${id}`;
        if(markOnce(key))send('VALUE_VIEW',{surface:'homepage_section',section:id});
        observer.unobserve(entry.target);
      }
    },{threshold:[0.45]});
    targets.forEach(target=>observer.observe(target));
  }

  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target.closest('a,button'):null;
    if(!target)return;
    const text=(target.textContent||'').trim().toLowerCase();
    const href=target instanceof HTMLAnchorElement?target.getAttribute('href')||'':'';
    if(href.startsWith('/articles')||text.includes('research')||text.includes('brief')){
      send('VALUE_VIEW',{surface:'research_click',destination:href.slice(0,160)});
    }
    if(href.startsWith('/sample')||text.includes('territory sample')||text.includes('sample')){
      send('SAMPLE_REQUEST',{surface:'public_cta',destination:href.slice(0,160)});
    }
    if(href.startsWith('/app')||text.includes('start trial')||text.includes('start free')||text.includes('create account')){
      send('CREATE_ACCOUNT_CLICK',{surface:'public_cta',destination:href.slice(0,160)});
    }
    if(text.includes('pricing')||text.includes('plans')||text.includes('package')){
      send('PRICING_VIEW',{surface:'public_cta'});
    }
  },{capture:true});

  document.addEventListener('submit',event=>{
    const form=event.target instanceof HTMLFormElement?event.target:null;
    if(!form)return;
    if(path.startsWith('/sample')||form.matches('[data-bp-sample-form]')){
      send('SAMPLE_REQUEST',{surface:'territory_form_submit'});
    }
  },{capture:true});
})();
