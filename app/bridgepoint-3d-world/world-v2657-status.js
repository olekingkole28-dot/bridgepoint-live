const status=document.getElementById('status');
if(status){
  let rewriting=false;
  const clean=()=>{
    if(rewriting)return;
    const before=status.textContent||'';
    const after=before
      .replace(/BridgePoint World V2500/gi,'BridgePoint Generated World')
      .replace(/World V2500/gi,'Generated World')
      .replace(/\bV2500\b/gi,'Generated');
    if(after!==before){rewriting=true;status.textContent=after;rewriting=false}
  };
  new MutationObserver(clean).observe(status,{childList:true,characterData:true,subtree:true});
  clean();
}
document.documentElement.dataset.bridgepointVisibleVersion='generated-world';
