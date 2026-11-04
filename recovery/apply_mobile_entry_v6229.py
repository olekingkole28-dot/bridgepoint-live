from __future__ import annotations

import re
import sys
from pathlib import Path

LAZY_LOADER = r"""
<script id="bpMobileLazyLoaderV6229">
(()=> {
  const placeholders=Array.from(document.querySelectorAll('script[data-bp-lazy-src]'));
  if(!placeholders.length)return;
  let started=false;
  const unlocked=()=>{
    const gate=document.getElementById('bpWelcomeGateV1');
    return window.__BP_WELCOME_GATE_UNLOCKED_V6229__===true || !gate || gate.dataset.removed==='1';
  };
  const start=()=>{
    if(started || !unlocked())return;
    started=true;
    const scripts=[];
    for(const placeholder of placeholders){
      const script=document.createElement('script');
      script.src=placeholder.dataset.bpLazySrc;
      if(placeholder.dataset.bpLazyType==='module')script.type='module';
      else script.async=false;
      try{script.fetchPriority='low'}catch(_){}
      placeholder.replaceWith(script);
      scripts.push(script);
    }
    window.__BP_MOBILE_OPTIONAL_ASSETS_V6229__={queued:scripts.length,startedAt:Date.now()};
  };
  const gate=document.getElementById('bpWelcomeGateV1');
  if(gate && !unlocked()){
    const observer=new MutationObserver(()=>{
      if(unlocked()){observer.disconnect();start()}
    });
    observer.observe(gate,{attributes:true,attributeFilter:['data-removed']});
    window.addEventListener('bp:welcome-gate-unlocked-v6229',()=>{
      observer.disconnect();start();
    },{once:true});
  }else start();
})();
</script>
""".strip()


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise AssertionError(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def patch_landing_js(source: str) -> str:
    for marker in ("bpAuthRequestV6228", "world-v2300-map.js?v=6226-underwater-satellite-lock", "v=6224-underwater-dive-camera"):
        if marker not in source:
            raise AssertionError(f"V6228 production baseline missing {marker}")
    if "bp:welcome-gate-unlocked-v6229" in source:
        raise AssertionError("Landing bundle already contains V6229 deferral")

    pattern = re.compile(
        r"  void window\.__BP_ACTIVATE_CLOUDS__\(\)\.catch[\s\S]*?"
        r"\.catch\(e=>console\.warn\('BridgePoint real-world rendering controls unavailable',e\)\);"
    )
    matches = list(pattern.finditer(source))
    if len(matches) != 1:
        raise AssertionError(f"Expected one optional world-module block, found {len(matches)}")
    block = matches[0].group(0)
    deferred = (
        "  const startLandingOptionalModulesV6229=()=>{\n"
        "   if(window.__BP_LANDING_OPTIONAL_MODULES_STARTED_V6229__)return;\n"
        "   window.__BP_LANDING_OPTIONAL_MODULES_STARTED_V6229__=true;\n"
        + "\n".join("   " + line.strip() for line in block.splitlines())
        + "\n  };\n"
        "  window.__BP_LANDING_START_OPTIONAL_MODULES_V6229__=startLandingOptionalModulesV6229;\n"
        "  if(window.__BP_WELCOME_GATE_UNLOCKED_V6229__||!document.getElementById('bpWelcomeGateV1')){\n"
        "   setTimeout(startLandingOptionalModulesV6229,1200);\n"
        "  }else{\n"
        "   window.addEventListener('bp:welcome-gate-unlocked-v6229',startLandingOptionalModulesV6229,{once:true});\n"
        "  }"
    )
    result = source[:matches[0].start()] + deferred + source[matches[0].end():]
    if not all(x in result for x in ("world-v2300-clouds.js", "world-v2300-sensor-layers.js", "bridgepoint-landmarks-v5940.js")):
        raise AssertionError("One or more existing world enhancement loaders were not retained")
    return result


def patch_html(html: str, min_lazy_assets: int = 15) -> tuple[str, dict]:
    if "bpMobileLazyLoaderV6229" in html or "bp:welcome-gate-unlocked-v6229" in html:
        raise AssertionError("HTML already contains V6229 mobile changes")

    html, cache_count = re.subn(
        r"landing\.js\?v=6228-auth-retry(?=[&\"'])",
        "landing.js?v=6229-mobile-entry",
        html,
        count=1,
    )
    if cache_count != 1:
        raise AssertionError("Expected one V6228 landing bundle reference")

    optional_preloads = (
        "/world-v2300-clouds.js?v=6170-always-on-3d-cloud-volumes",
        "/world-v2300-lightning.js?v=6195-desktop-globe-flash-stability",
        "/world-v2300-weather.js?v=6195-desktop-globe-flash-stability",
        "/intelligence-global-v5507.js?v=6170-imerg-nrt-timeline",
    )
    for href in optional_preloads:
        tag_re = re.compile(
            r'<link\b(?=[^>]*rel=["\']modulepreload["\'])(?=[^>]*href=["\']'
            + re.escape(href)
            + r'["\'])[^>]*>\s*',
            re.IGNORECASE,
        )
        html, removed = tag_re.subn("", html, count=1)
        if removed != 1:
            raise AssertionError(f"Expected one optional preload tag for {href}")

    script_re = re.compile(
        r'''(?is)<script\b(?P<attrs>[^>]*)\bsrc=(?P<quote>["'])(?P<src>[^"']+)(?P=quote)(?P<tail>[^>]*)>\s*</script>'''
    )
    lazy_count = 0

    def defer_optional_script(match: re.Match) -> str:
        nonlocal lazy_count
        src = match.group("src")
        if src.startswith("./vendor/maplibre-gl.js") or src.startswith("./landing.js") or src.startswith("/acquisition_tracker.js"):
            return match.group(0)
        attrs = match.group("attrs") + " " + match.group("tail")
        kind = "module" if re.search(r'''(?i)\btype\s*=\s*["']module["']''', attrs) else "classic"
        lazy_count += 1
        return f'<script data-bp-lazy-src="{src}" data-bp-lazy-type="{kind}"></script>'

    html = script_re.sub(defer_optional_script, html)
    if lazy_count < min_lazy_assets:
        raise AssertionError(f"Only {lazy_count} optional scripts were deferred; expected at least {min_lazy_assets}")

    html = replace_once(
        html,
        "let musicChordTimer=0,musicArpTimer=0,sessionWatch=0,resizeHandler=null,gateSettled=false,sequenceStarted=false,spinTimer=0,spinActive=false;",
        "let musicChordTimer=0,musicArpTimer=0,sessionWatch=0,resizeHandler=null,gateSettled=false,sequenceStarted=false,spinTimer=0,spinActive=false,wordmarkBuilt=false,gateFallbackStarted=false;",
        "welcome gate state",
    )
    html = replace_once(
        html,
        "gate.remove();\n    if(resizeHandler)window.removeEventListener('resize',resizeHandler);",
        "gate.remove();\n    window.__BP_WELCOME_GATE_UNLOCKED_V6229__=true;\n    try{window.dispatchEvent(new CustomEvent('bp:welcome-gate-unlocked-v6229'))}catch(_){}\n    if(resizeHandler)window.removeEventListener('resize',resizeHandler);",
        "welcome gate unlock event",
    )
    html = replace_once(
        html,
        "if(isSignedIn()){gate.remove();return}",
        "if(isSignedIn()){gate.remove();window.__BP_WELCOME_GATE_UNLOCKED_V6229__=true;try{window.dispatchEvent(new CustomEvent('bp:welcome-gate-unlocked-v6229'))}catch(_){};return}",
        "already authenticated page visit",
    )

    start_re = re.compile(
        r"""const startSequence=\(\)=>\{\s*
        if\(sequenceStarted\|\|gateSettled\)return;\s*
        sequenceStarted=true;\s*
        startGlobeSpin\(\);\s*
        const lettersDuration=buildWordmark\(\);\s*
        if\(status\)status\.textContent='BRIDGEPOINT WORLD INITIALIZED';\s*
        setTimeout\(\(\)=>\{\s*
        if\(isSignedIn\(\)\)\{restorePage\(\);return\}\s*
        setTimeout\(settleGate,1250\);\s*
        \},lettersDuration\+160\);\s*
        \};""",
        re.VERBOSE,
    )
    start_repl = """const startSequence=()=>{
    if(sequenceStarted)return;
    sequenceStarted=true;
    if(activeMap)startGlobeSpin();
    const lettersDuration=wordmarkBuilt?0:buildWordmark();
    wordmarkBuilt=true;
    if(status&&!gateSettled)status.textContent='BRIDGEPOINT WORLD INITIALIZED';
    if(!gateSettled&&!gateFallbackStarted)setTimeout(()=>{
      if(isSignedIn()){restorePage();return}
      setTimeout(settleGate,1250);
    },lettersDuration+160);
  };"""
    html, start_count = start_re.subn(start_repl, html, count=1)
    if start_count != 1:
        raise AssertionError("Could not replace the existing welcome animation sequence safely")

    html = replace_once(
        html,
        "if(gateSettled)return;\n      try{activeMap=",
        "if(gate.dataset.removed==='1')return;\n      try{activeMap=",
        "welcome map readiness guard",
    )
    fallback = """if(Date.now()-startedAt>9000&&!gateSettled&&!gateFallbackStarted){
        gateFallbackStarted=true;
        if(status)status.textContent='BRIDGEPOINT WORLD IS LOADING — SIGN IN OR CREATE YOUR ACCOUNT';
        if(!wordmarkBuilt){
          wordmarkBuilt=true;
          const lettersDuration=buildWordmark();
          setTimeout(settleGate,lettersDuration+160);
        }else settleGate();
      }
      """
    html = replace_once(
        html,
        "if(Date.now()-startedAt>45000){",
        fallback + "if(Date.now()-startedAt>45000){",
        "bounded mobile entry fallback",
    )
    html = replace_once(
        html,
        "else{if(status)status.textContent='CONNECTING TO THE BRIDGEPOINT WORLD';setTimeout(waitForGlobe,1000);return}",
        "else{if(status&&!gateSettled)status.textContent='CONNECTING TO THE BRIDGEPOINT WORLD';setTimeout(waitForGlobe,1500);return}",
        "long map wait",
    )
    html = replace_once(
        html,
        "}else{setTimeout(waitForGlobe,220);return}",
        "}else{setTimeout(waitForGlobe,gateSettled?1500:220);return}",
        "post-fallback polling cadence",
    )

    body_end = html.lower().rfind("</body>")
    if body_end < 0:
        raise AssertionError("Missing body close for lazy-loader insertion")
    html = html[:body_end] + "\n" + LAZY_LOADER + "\n" + html[body_end:]

    for required in (
        "bpMobileLazyLoaderV6229",
        "bp:welcome-gate-unlocked-v6229",
        "BRIDGEPOINT WORLD IS LOADING",
        "landing.js?v=6229-mobile-entry",
        "bpWelcomeGateV1",
        "bpw-globe-aura",
    ):
        if required not in html:
            raise AssertionError(f"Missing required entry element: {required}")
    if 'data-bp-lazy-src="/world-v2300' not in html:
        raise AssertionError("World feature modules were removed instead of deferred")
    return html, {"lazy_scripts": lazy_count}


def patch_files(index_path: str, landing_path: str) -> dict:
    index = Path(index_path)
    landing = Path(landing_path)
    original_html = index.read_text(encoding="utf-8")
    original_js = landing.read_text(encoding="utf-8")
    patched_js = patch_landing_js(original_js)
    patched_html, stats = patch_html(original_html)
    landing.write_text(patched_js, encoding="utf-8")
    index.write_text(patched_html, encoding="utf-8")
    return stats


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: apply_mobile_entry_v6229.py site/index.html site/landing.js")
    print("V6229 mobile startup patch:", patch_files(sys.argv[1], sys.argv[2]))


if __name__ == "__main__":
    main()
