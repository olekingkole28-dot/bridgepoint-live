(()=>{
'use strict';
if(window.__bridgepointVisualSystemV1055)return;window.__bridgepointVisualSystemV1055=true;
const s=document.createElement('style');s.id='bp1055-visual-system';s.textContent=`
:root{--bp-bg:#030811;--bp-panel:rgba(8,24,40,.82);--bp-panel2:rgba(11,31,50,.86);--bp-line:rgba(111,226,255,.15);--bp-cyan:#66e8ff;--bp-gold:#ffd36b;--bp-green:#67edb6;--bp-muted:#91a8ba;--bp-shadow:0 24px 80px rgba(0,0,0,.34)}
body{background:var(--bp-bg)}
#bp1044-preapp .bp1044p-wrap,#bp-live-home-v984 .bp984h-wrap{position:relative}
#bp1044-preapp .bp1044p-wrap:before,#bp-live-home-v984 .bp984h-wrap:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 14% 10%,rgba(72,225,255,.07),transparent 27%),radial-gradient(circle at 86% 28%,rgba(134,91,255,.08),transparent 32%),radial-gradient(circle at 40% 88%,rgba(255,201,94,.035),transparent 28%);mix-blend-mode:screen;z-index:-1}
#bp1044-preapp section,#bp1054-preapp .bp1054pr-section,#bp1046-home-widgets,#bp1054-owner .bp1054o-shell,#bp1054-work .bp1054w-card,#bp1042-properties .bp1042-property,#bp1042-more .bp1042-more-card,.bp1054m-card,.bp1046p-card,.bp1054mm-card{box-shadow:var(--bp-shadow);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
#bp1054-preapp .bp1054pr-section,#bp1046-home-widgets,#bp1054-owner .bp1054o-shell{border-color:var(--bp-line)!important;background:linear-gradient(145deg,rgba(10,28,47,.9),rgba(4,14,26,.88))!important}
#bp1046-auth{background:radial-gradient(circle at 50% 20%,rgba(72,225,255,.11),transparent 30%),radial-gradient(circle at 78% 62%,rgba(111,76,255,.1),transparent 34%),rgba(1,5,11,.88)!important}
#bp1046-auth .bp1046a-card{border:1px solid rgba(102,232,255,.25)!important;background:linear-gradient(155deg,rgba(11,31,51,.97),rgba(5,16,29,.98))!important;box-shadow:0 32px 120px rgba(0,0,0,.72),0 0 70px rgba(72,225,255,.06)!important}
#bp1046-auth .bp1046a-brand img{box-shadow:0 0 30px rgba(72,225,255,.12)}
#bp1046-auth .bp1046a-input,.bp1054mm-input,.bp1054mm-text,.bp1054o-input,.bp1054w-select{background:linear-gradient(145deg,#0c2034,#091827)!important;border-color:rgba(255,255,255,.11)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}
#bp1046-auth .bp1046a-input:focus,.bp1054mm-input:focus,.bp1054o-input:focus{border-color:var(--bp-cyan)!important;box-shadow:0 0 0 3px rgba(102,232,255,.09)!important}
#bp1054-nav{background:linear-gradient(180deg,rgba(7,22,38,.94),rgba(4,14,26,.985))!important;backdrop-filter:blur(22px);border-top-color:rgba(102,232,255,.17)!important}
#bp1054-header{background:linear-gradient(180deg,rgba(5,17,31,.97),rgba(7,25,42,.92))!important;backdrop-filter:blur(20px)}
.bp1054-tab.active .ico{box-shadow:inset 0 0 0 1px rgba(102,232,255,.2),0 0 24px rgba(72,225,255,.08)!important}
#bp1042-properties,#bp1042-more,#bp1054-work{background:radial-gradient(circle at 80% 8%,rgba(94,70,210,.08),transparent 30%),linear-gradient(180deg,#06111d,#040c16)!important}
.bp1042-property,.bp1042-more-card,.bp1054m-card,.bp1054w-card,.bp1054w-item,.bp1054mm-box,.bp1054o-box{transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
@media(hover:hover){.bp1042-property:hover,.bp1042-more-card:hover,.bp1054m-card:hover,.bp1054w-card.click:hover,.bp1054mm-box:hover{transform:translateY(-2px);border-color:rgba(102,232,255,.29)!important;box-shadow:0 18px 45px rgba(0,0,0,.28)}}
.bp1042-primary,.bp1054w-btn.primary,.bp1054mm-btn.primary,.bp1054o-btn,#bp1046-auth .bp1046a-primary{background:linear-gradient(135deg,#66e8ff,#7290ff)!important;box-shadow:0 10px 30px rgba(72,225,255,.12)}
.bp1055-section-glow{position:relative;overflow:hidden}.bp1055-section-glow:after{content:"";position:absolute;width:220px;height:220px;border-radius:50%;right:-100px;top:-120px;background:radial-gradient(circle,rgba(102,232,255,.11),transparent 68%);pointer-events:none}
.bp1055-status-live{color:var(--bp-green)!important}.bp1055-status-build{color:var(--bp-cyan)!important}.bp1055-status-gold{color:var(--bp-gold)!important}
@media(prefers-reduced-motion:no-preference){#bp1046-auth.show .bp1046a-card{animation:bp1055rise .24s ease-out}.bp1055-softpulse{animation:bp1055soft 3.2s ease-in-out infinite}@keyframes bp1055rise{from{opacity:.4;transform:translateY(8px) scale(.99)}to{opacity:1;transform:none}}@keyframes bp1055soft{50%{filter:drop-shadow(0 0 15px rgba(102,232,255,.18))}}}
@media(max-width:600px){#bp1042-properties,#bp1042-more,#bp1054-work{font-size:13px!important}.bp1042-muted,.bp1054w-head p{font-size:11px!important}.bp1042-more-card p,.bp1054m-card p{font-size:10.5px!important}}
`;document.head.appendChild(s);
})();