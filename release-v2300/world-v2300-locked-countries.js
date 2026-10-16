import{rpc}from'./world-v2300-config.js';

const COUNTRY='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
const US_CODES=['US','PR','GU','VI','AS','MP','UM'];
const usFilter=['all',
  ['!', ['in',['coalesce',['get','ISO_A2'],['get','ISO_A2_EH'],''],['literal',US_CODES]]],
  ['!=',['coalesce',['get','ADM0_A3'],''],'USA']
];
const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const add=(m,l,before)=>{try{if(!has(m,l.id))m.addLayer(l,before&&has(m,before)?before:undefined)}catch(e){console.warn('V2300 locked country layer',l.id,e)}};
const txt=v=>String(v??'').trim();

function countryIdentity(p={}){
  const code=txt(p.ISO_A2||p.ISO_A2_EH||p.ADM0_A3||p.SOV_A3).toUpperCase();
  const name=txt(p.ADMIN||p.NAME_EN||p.NAME_LONG||p.NAME||p.SOVEREIGNT)||'Country';
  return{code,name};
}

function buildPanel(map){
  const shell=document.querySelector('.map-shell');if(!shell)return null;
  let root=document.getElementById('bp2300CountryLockPanel');
  if(root)return root;
  root=document.createElement('section');root.id='bp2300CountryLockPanel';root.hidden=true;root.setAttribute('aria-live','polite');
  Object.assign(root.style,{position:'absolute',left:'12px',right:'12px',bottom:'72px',zIndex:'34',maxWidth:'430px',margin:'0 auto',padding:'13px 14px',border:'1px solid rgba(255,209,92,.62)',borderRadius:'14px',background:'rgba(5,9,12,.94)',boxShadow:'0 12px 36px rgba(0,0,0,.38)',backdropFilter:'blur(12px)',color:'#f6fbfc',font:'600 13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif'});
  const top=document.createElement('div');Object.assign(top.style,{display:'flex',gap:'10px',alignItems:'center'});
  const copy=document.createElement('div');copy.style.flex='1';
  const title=document.createElement('b');title.dataset.role='title';title.style.display='block';title.style.fontSize='14px';
  const detail=document.createElement('span');detail.dataset.role='detail';detail.style.cssText='display:block;margin-top:3px;color:#b9c9ce;font-weight:500';
  copy.append(title,detail);
  const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close');Object.assign(close.style,{width:'30px',height:'30px',borderRadius:'9px',border:'1px solid rgba(255,255,255,.16)',background:'#111a1f',color:'#fff',fontSize:'20px',cursor:'pointer'});close.onclick=()=>{root.hidden=true};
  top.append(copy,close);
  const button=document.createElement('button');button.type='button';button.dataset.role='request';button.textContent='Request Build';Object.assign(button.style,{width:'100%',marginTop:'11px',padding:'10px 12px',borderRadius:'10px',border:'1px solid #ffd15c',background:'#ffd15c',color:'#111',fontWeight:'800',cursor:'pointer'});
  const status=document.createElement('div');status.dataset.role='status';status.style.cssText='min-height:17px;margin-top:7px;color:#a9c3c9;font-weight:500';
  root.append(top,button,status);shell.appendChild(root);
  return root;
}

export function initLockedCountries(map){
  if(!map)return null;if(window.__bpLockedCountriesV2300?.map===map)return window.__bpLockedCountriesV2300;
  let installed=false,selected=null,requesting=false,panel=null;
  function install(){
    let ready=false;try{ready=map.isStyleLoaded?.()===true||!!map.getSource?.('ofm')}catch(_){}if(!ready)return;
    try{if(!map.getSource('bp-world-country-continuity'))map.addSource('bp-world-country-continuity',{type:'geojson',data:COUNTRY,generateId:true})}catch(e){console.warn('V2300 locked country source',e)}
    add(map,{id:'gta-locked-country-fill',type:'fill',source:'bp-world-country-continuity',minzoom:1.5,maxzoom:8.6,filter:usFilter,paint:{
      'fill-color':['interpolate',['linear'],['zoom'],1.5,'#171c21',5,'#1a2025',8.5,'#20262b'],
      'fill-opacity':['interpolate',['linear'],['zoom'],1.5,.20,4,.17,6,.13,8.5,.075]
    }},'gta-world-country-continuity-casing');
    add(map,{id:'gta-locked-country-outline',type:'line',source:'bp-world-country-continuity',minzoom:1.5,maxzoom:8.6,filter:usFilter,paint:{
      'line-color':'#ffd15c','line-width':['interpolate',['linear'],['zoom'],1.5,.45,5,.75,8.5,1.1],'line-opacity':['interpolate',['linear'],['zoom'],1.5,.34,5,.42,8.5,.28],'line-dasharray':[2,2]
    }},'gta-world-country-continuity');
    add(map,{id:'gta-locked-country-label',type:'symbol',source:'bp-world-country-continuity',minzoom:2.0,maxzoom:6.8,filter:usFilter,layout:{
      'text-field':['concat',['coalesce',['get','NAME_EN'],['get','ADMIN'],['get','NAME'],''],' · LOCKED'],
      'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],2,8.5,5,11.5,6.8,12.5],
      'text-transform':'uppercase','text-allow-overlap':false,'text-ignore-placement':false,'text-padding':8,
      'text-pitch-alignment':'map','text-rotation-alignment':'map'
    },paint:{'text-color':'#f6d36a','text-opacity':['interpolate',['linear'],['zoom'],2,.45,4,.7,6.8,.52],'text-halo-color':'#071017','text-halo-width':1.35,'text-halo-blur':.4}},'gta-state-label');
    installed=true;map.triggerRepaint();
  }
  function showFeature(f){
    const id=countryIdentity(f?.properties||{});if(!id.code||US_CODES.includes(id.code)||id.code==='USA')return;
    selected=id;panel=panel||buildPanel(map);if(!panel)return;
    panel.querySelector('[data-role="title"]').textContent=`${id.name} is locked`;
    panel.querySelector('[data-role="detail"]').textContent='BridgePoint has not opened this country yet. Request it and the expansion pipeline can queue discovery and build review.';
    const status=panel.querySelector('[data-role="status"]');status.textContent='';
    const btn=panel.querySelector('[data-role="request"]');btn.disabled=false;btn.textContent='Request Build';
    btn.onclick=async()=>{
      if(requesting||!selected)return;requesting=true;btn.disabled=true;btn.textContent='Requesting…';status.textContent='Submitting country request…';
      try{
        const result=await rpc('bridgepoint_request_country_expansion_v2170',{p_country_code:selected.code,p_country_name:selected.name},9000);
        status.textContent=result?.ok===false?'Request could not be queued yet. Please retry.':`${selected.name} request queued.`;
        btn.textContent=result?.ok===false?'Retry Request':'Requested';btn.disabled=result?.ok!==false;
        window.dispatchEvent(new CustomEvent('bp2300:country-build-requested',{detail:{...selected,result}}));
      }catch(e){status.textContent='Request could not be queued yet. Please retry.';btn.textContent='Retry Request';btn.disabled=false}
      finally{requesting=false}
    };
    panel.hidden=false;
  }
  const click=e=>{if(map.getZoom()>8.7)return;let f=null;try{f=map.queryRenderedFeatures(e.point,{layers:['gta-locked-country-fill'].filter(id=>has(map,id))})[0]||null}catch(_){}if(f)showFeature(f)};
  const move=e=>{if(map.getZoom()>8.7){map.getCanvas().style.cursor='';return}try{const hit=map.queryRenderedFeatures(e.point,{layers:['gta-locked-country-fill'].filter(id=>has(map,id))}).length;map.getCanvas().style.cursor=hit?'pointer':''}catch(_){}};
  install();map.on('styledata',install);map.on('click',click);map.on('mousemove',move);for(const ms of [100,400,1200,3200])setTimeout(install,ms);
  const api={version:2300,map,requirementKey:'v2300_locked_countries_surface_v1',showFeature,get state(){return{installed,nonUSLocked:true,usAndJurisdictionsExcluded:true,tappable:true,requestBuildRpc:'bridgepoint_request_country_expansion_v2170',surfaceAttached:true,maxInteractiveZoom:8.6,secondaryCanvases:0,selected}}};window.__bpLockedCountriesV2300=api;return api;
}
