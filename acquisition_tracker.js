(()=>{
  'use strict';

  const supabaseUrl='https://xdfsjztwgsbmabshzsjw.supabase.co';
  const apikey='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
  const endpoint=`${supabaseUrl}/rest/v1/rpc/track_acquisition_event_v400`;
  const captureVersion=432;

  const visitorKey='bp_visitor_id_v421';
  const sessionKey='bp_session_id_v421';
  const geoKey='bp_coarse_geo_v432';
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
  async function fetchText(url,controller){
    const response=await fetch(url,{signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    if(!response.ok)throw new Error(`geo ${response.status}`);
    return (await response.text()).trim();
  }
  async function loadCoarseGeo(){
    if(geo.country_code&&geo.region_code)return geo;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),1600);
    try{
      const [countryRaw,regionRaw]=await Promise.all([
        fetchText('https://ipapi.co/country/',controller),
        fetchText('https://ipapi.co/region_code/',controller),
      ]);
      const country=cleanCode(countryRaw,2);
      const region=cleanCode(regionRaw,8);
      const next={};
      if(/^[A-Z]{2}$/.test(country))next.country_code=country;
      if(country==='US'&&/^[A-Z]{2}$/.test(region))next.region_code=region;
      geo=next;
      try{sessionStorage.setItem(geoKey,JSON.stringify(geo));}catch(_){/* session-only cache is optional */}
    }catch(_){/* server-side country capture still works when coarse lookup is unavailable */}
    finally{clearTimeout(timer);}
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
