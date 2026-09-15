(()=>{
'use strict';
if(document.querySelector('[data-bp-language]'))return;
const langs=[
 ['en','English'],['es','Español'],['fr','Français'],['pt','Português'],['zh-CN','中文'],
 ['ar','العربية'],['hi','हिन्दी'],['ja','日本語'],['ko','한국어'],['vi','Tiếng Việt'],
 ['tl','Filipino'],['ht','Kreyòl ayisyen'],['de','Deutsch'],['it','Italiano'],['ru','Русский']
];
const wrap=document.createElement('div');wrap.className='bp-language';wrap.dataset.bpLanguage='1';
const label=document.createElement('label');label.textContent='LANGUAGE ';label.setAttribute('aria-label','Translate this page');
const sel=document.createElement('select');sel.setAttribute('aria-label','Select language');
for(const [code,name] of langs){const o=document.createElement('option');o.value=code;o.textContent=name;sel.appendChild(o)}
label.appendChild(sel);wrap.appendChild(label);document.body.appendChild(wrap);
sel.addEventListener('change',()=>{
 const code=sel.value;if(code==='en')return;
 const current=location.href;
 const target='https://translate.google.com/translate?sl=auto&tl='+encodeURIComponent(code)+'&u='+encodeURIComponent(current);
 window.open(target,'_blank','noopener,noreferrer');
});
})();