#!/usr/bin/env python3
from pathlib import Path

SITE=Path("site")
ROOT=SITE/"index.html"
HORIZON=SITE/"app"/"horizon"/"index.html"
WORLD=SITE/"app"/"bridgepoint-world-v2652"/"index.html"

def inject_once(text, marker, payload, before):
    if marker in text:
        return text
    if before not in text:
        raise RuntimeError(f"anchor not found for {marker}: {before[:80]}")
    return text.replace(before, payload+before, 1)

def patch_root():
    s=ROOT.read_text(encoding="utf-8")
    css=r'''
<style id="bp-b2b-world-v4246">
.b2b-world-demo{margin-top:46px}
.b2b-world-card{border:1px solid rgba(80,214,255,.22);background:linear-gradient(145deg,rgba(4,17,29,.96),rgba(3,8,15,.94));border-radius:26px;padding:20px;box-shadow:0 24px 90px rgba(0,0,0,.34)}
.b2b-world-head{display:flex;gap:18px;align-items:flex-end;justify-content:space-between;margin-bottom:16px}
.b2b-world-head h2{margin:.25rem 0 .45rem;font-size:clamp(30px,5vw,54px);line-height:1}
.b2b-world-head p{max-width:760px;color:#a9bdc9;line-height:1.55;margin:0}
.b2b-world-actions{display:flex;gap:10px;flex-wrap:wrap}
.b2b-world-actions button,.b2b-world-actions a{border:0;border-radius:12px;padding:12px 15px;font:800 13px/1 system-ui;text-decoration:none;cursor:pointer}
.b2b-world-actions button{background:#4edcff;color:#031018}.b2b-world-actions a{border:1px solid rgba(255,255,255,.18);color:#e9f8ff;background:rgba(255,255,255,.05)}
.b2b-world-frame{min-height:340px;border:1px solid rgba(255,255,255,.1);border-radius:18px;overflow:hidden;background:radial-gradient(circle at 50% 25%,rgba(73,213,255,.14),transparent 36%),#01050a;display:grid;place-items:center;position:relative}
.b2b-world-frame iframe{width:100%;height:min(72vh,760px);min-height:430px;border:0;display:block;background:#020711}
.b2b-world-cover{text-align:center;padding:38px;max-width:620px}.b2b-world-cover b{font-size:20px;display:block;margin-bottom:8px}.b2b-world-cover p{color:#91a7b5;line-height:1.5}
.b2b-horizon-cross{margin:30px auto 0;max-width:1050px;border-top:1px solid rgba(255,255,255,.09);padding-top:24px;text-align:center}.b2b-horizon-cross a{color:#9a7cff;font-weight:900;text-decoration:none}
@media(max-width:760px){.b2b-world-head{display:block}.b2b-world-actions{margin-top:14px}.b2b-world-card{padding:14px}.b2b-world-frame iframe{min-height:520px}}
</style>
'''
    s=inject_once(s,"bp-b2b-world-v4246",css,"</head>")

    section=r'''
    <section class="b2b-world-demo section-shell" id="bridgepoint-world">
      <div class="section-kicker">THE B2B WORLD</div>
      <div class="b2b-world-card">
        <div class="b2b-world-head">
          <div>
            <h2>See BridgePoint World without leaving this page.</h2>
            <p>The business world is separate from Horizon. It visualizes BridgePoint's source-backed property/spatial foundation, generated terrain and governed live context for professional use.</p>
          </div>
          <div class="b2b-world-actions">
            <button id="load-b2b-world-v4246" type="button">Load interactive world here</button>
            <a href="/app/bridgepoint-world-v2652/?release=b2b-world-v4246" target="_blank" rel="noopener">Open full screen ↗</a>
          </div>
        </div>
        <div class="b2b-world-frame" id="b2b-world-frame-v4246">
          <div class="b2b-world-cover">
            <b>Interactive 3D B2B world</b>
            <p>Tap Load to start the live world in this panel. It stays unloaded until requested so the public B2B page remains fast on phones.</p>
          </div>
        </div>
      </div>
    </section>
'''
    s=inject_once(s,'id="bridgepoint-world"',section,'    <section class="media section-shell" id="proof">')

    cross=r'''
    <div class="b2b-horizon-cross">
      <p>Looking for the survival game instead?</p>
      <a href="/app/horizon/">Open the separate BridgePoint Horizon page →</a>
    </div>
'''
    s=inject_once(s,'<div class="b2b-horizon-cross">',cross,"  </footer>")

    js=r'''
<script id="bp-b2b-world-loader-v4246">
(()=>{const b=document.getElementById('load-b2b-world-v4246'),h=document.getElementById('b2b-world-frame-v4246');if(!b||!h)return;b.addEventListener('click',()=>{if(h.querySelector('iframe'))return;const f=document.createElement('iframe');f.title='BridgePoint B2B World';f.loading='eager';f.allow='geolocation; fullscreen';f.src='/app/bridgepoint-world-v2652/?release=b2b-world-v4246&embedded=1';h.replaceChildren(f);b.textContent='World loaded';b.disabled=true;});})();
</script>
'''
    s=inject_once(s,"bp-b2b-world-loader-v4246",js,"</body>")
    ROOT.write_text(s,encoding="utf-8")

def patch_horizon():
    s=HORIZON.read_text(encoding="utf-8")
    css=r'''
<style id="bp-horizon-modes-v4246">
.mode-section{margin-top:26px}.mode-intro{margin-bottom:14px}.mode-intro h2{font-size:clamp(30px,4.5vw,48px);margin:4px 0 8px}.mode-intro p{margin:0;color:var(--muted);line-height:1.55}
.mode-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.mode-card{position:relative;overflow:hidden;padding:20px;border-radius:20px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(155deg,rgba(20,12,42,.9),rgba(4,18,23,.82));min-height:285px;display:flex;flex-direction:column}
.mode-card:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 85% 8%,rgba(65,242,192,.13),transparent 30%);pointer-events:none}.mode-num{font:950 11px/1 system-ui;letter-spacing:.14em;color:var(--mint)}.mode-card h3{font-size:25px;margin:12px 0 7px}.mode-card p{color:var(--muted);font-size:13px;line-height:1.5;margin:0 0 12px}.mode-card ul{margin:0 0 18px;padding-left:18px;color:#e5dfef;font-size:12px;line-height:1.55}.mode-card .mode-actions{margin-top:auto;display:flex;gap:8px;flex-wrap:wrap}.mode-card a{position:relative;z-index:1;text-decoration:none;border-radius:11px;padding:11px 12px;font-size:11px;font-weight:950}.mode-primary{background:linear-gradient(135deg,var(--violet),var(--mint));color:#06100d}.mode-secondary{border:1px solid rgba(255,255,255,.15);color:#fff;background:rgba(255,255,255,.04)}
.native-track{margin-top:14px;padding:20px;border:1px solid rgba(65,242,192,.22);border-radius:20px;background:rgba(5,18,18,.7)}.native-track h3{margin:0 0 7px;font-size:22px}.native-track p{color:var(--muted);line-height:1.5}.native-tags{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.native-tags span{font-size:10px;font-weight:900;padding:7px 9px;border-radius:999px;border:1px solid rgba(65,242,192,.2);background:rgba(65,242,192,.06)}
.cross-links{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}.cross-links a{display:inline-block}
@media(max-width:900px){.mode-grid{grid-template-columns:1fr}.mode-card{min-height:auto}}
</style>
'''
    s=inject_once(s,"bp-horizon-modes-v4246",css,"</head>")

    modes=r'''
<section class="mode-section" id="game-modes">
  <div class="mode-intro">
    <div class="kicker">THREE SEPARATE HORIZON MODES</div>
    <h2>Choose how you enter Horizon.</h2>
    <p>One shared lobby and loadout foundation; three different game experiences. Year One remains solo when launched. Team modes use the native UE5.8 multiplayer track.</p>
  </div>
  <div class="mode-grid">
    <article class="mode-card">
      <span class="mode-num">MODE 01 · SOLO</span>
      <h3>Year One Survival</h3>
      <p>The persistent 365-day survival event. Preseason stays separate until the owner explicitly starts Year One.</p>
      <ul><li>Solo only</li><li>3 event lives total once activated</li><li>Progressive infected difficulty</li><li>Zombie-wall endgame toward major cities</li><li>Daily free rewards + challenge NPCs</li></ul>
      <div class="mode-actions"><a class="mode-primary" href="/app/horizon/preview.html?mode=survival&preseason=1&build=4246">Open preseason world</a></div>
    </article>
    <article class="mode-card">
      <span class="mode-num">MODE 02 · 2–4 PLAYERS</span>
      <h3>Infinite Team Deathmatch</h3>
      <p>Fast rotating combat arenas selected from dense, vertical real-world-scale Horizon locations.</p>
      <ul><li>Duos, trios and squads</li><li>Infinite arena switcher</li><li>Rooftops, bridges, waterfronts and interiors</li><li>Team + proximity voice design</li><li>Respawns; no Year One lives consumed</li></ul>
      <div class="mode-actions"><a class="mode-secondary" href="#ue58-native">View UE5.8 native systems</a></div>
    </article>
    <article class="mode-card">
      <span class="mode-num">MODE 03 · 1–4 PLAYERS</span>
      <h3>Outbreak Raid</h3>
      <p>Co-op horror missions through dense cells with objectives, elites, bosses, rare loot and extraction.</p>
      <ul><li>1–4 player co-op</li><li>Multi-stage mission director</li><li>Elite/boss scaling</li><li>Extraction + rare loot</li><li>Party + proximity voice design</li></ul>
      <div class="mode-actions"><a class="mode-secondary" href="#ue58-native">View UE5.8 native systems</a></div>
    </article>
  </div>
  <div class="native-track" id="ue58-native">
    <div class="kicker">UE5.8 NATIVE TRACK · SOURCE PUBLISHED</div>
    <h3>The new native systems are now part of Horizon's public build track.</h3>
    <p>The native project contains the BridgePoint world-stream client/renderer plus Year One rules, infected director, zombie wall, generated interiors, rooftop ziplines, challenge NPCs, progression, lobby/loadout, Infinite TDM arena director, Outbreak Raid director and premium-audio director. The browser preview above remains the immediately playable surface; a true UE5.8 interactive stream requires a packaged Unreal build running on a GPU/Pixel Streaming host.</p>
    <div class="native-tags"><span>LIVE WORLD STREAM</span><span>USGS TERRAIN</span><span>BUILDINGS + PARTS</span><span>ROADS + WATER</span><span>GENERATED INTERIORS</span><span>ZIPLINES</span><span>INFECTED DIRECTOR</span><span>ZOMBIE WALL</span><span>TDM DIRECTOR</span><span>RAID DIRECTOR</span><span>EOS LOBBY/VOICE TRACK</span><span>PREMIUM AUDIO TRACK</span></div>
  </div>
</section>
'''
    s=inject_once(s,'id="game-modes"',modes,'<section class="panel section">')

    old='''<footer class="cross">
  <p class="muted">Work in construction, claims, insurance, investing, restoration or field operations?</p>
  <a href="/app/intelligence-launch/">Explore BridgePoint Intelligence →</a>
</footer>'''
    new='''<footer class="cross">
  <p class="muted">BridgePoint Horizon is the game. The professional property-intelligence product stays on its own B2B page.</p>
  <div class="cross-links">
    <a href="/">Open BridgePoint Intelligence B2B →</a>
    <a href="/app/bridgepoint-world-v2652/?release=b2b-world-v4246">Open the B2B 3D world →</a>
  </div>
</footer>'''
    if old in s:
        s=s.replace(old,new,1)
    elif 'cross-links' not in s:
        raise RuntimeError("Horizon cross footer anchor changed")

    s=s.replace('build=4245','build=4246')
    HORIZON.write_text(s,encoding="utf-8")

def patch_world():
    s=WORLD.read_text(encoding="utf-8")
    tag='<script src="./world-v4246-dateline-guard.js?v=4246"></script>\n'
    anchor='  <link rel="stylesheet" href="./world-v2500.css" />'
    if 'world-v4246-dateline-guard.js' not in s:
        if anchor not in s:
            raise RuntimeError("BridgePoint world Cesium anchor missing")
        s=s.replace(anchor,'  '+tag+anchor,1)
    WORLD.write_text(s,encoding="utf-8")

patch_root()
patch_horizon()
patch_world()

assert 'id="bridgepoint-world"' in ROOT.read_text()
assert 'id="game-modes"' in HORIZON.read_text()
assert 'world-v4246-dateline-guard.js' in WORLD.read_text()
print("V4246_PUBLIC_SPLIT_AND_WORLD_PATCH_OK")
