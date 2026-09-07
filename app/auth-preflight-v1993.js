(()=>{
'use strict';
try{
  const u=new URL(location.href);
  const authCallback=u.searchParams.has('code')||u.searchParams.has('token_hash')||u.searchParams.has('access_token')||u.searchParams.has('refresh_token')||/access_token=|refresh_token=|token_hash=/.test(location.hash||'');
  if(authCallback)return;
  const keys=['sb-xdfsjztwgsbmabshzsjw-auth-token','bp-homepage-auth-v1990','bp-homepage-auth-v1992'];
  const hasSession=keys.some(key=>{
    try{
      const raw=localStorage.getItem(key);
      if(!raw)return false;
      const x=JSON.parse(raw);
      const s=x?.access_token?x:(x?.currentSession||x?.session||x?.data?.session||null);
      return !!(s?.access_token&&s?.refresh_token);
    }catch(_){return false;}
  });
  if(!hasSession){
    const target='/app/'+(u.searchParams.get('surface')?`?surface=${encodeURIComponent(u.searchParams.get('surface'))}`:'');
    location.replace('/?signin=1&return='+encodeURIComponent(target)+'&v=1993');
  }
}catch(_){
  location.replace('/?signin=1&return='+encodeURIComponent('/app/')+'&v=1993');
}
})();