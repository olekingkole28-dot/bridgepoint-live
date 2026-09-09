from pathlib import Path
import hashlib
import re

root = Path('site/app')
index = root / 'index.html'
service_worker = root / 'flutter_service_worker.js'

s = index.read_text()
s = s.replace('href="bridgepoint-3d-world/"', 'href="bridgepoint-world-v2652/"')

if 'bridgepoint-home-v2652.css' not in s:
    s = s.replace('</head>', '  <link rel="stylesheet" href="bridgepoint-home-v2652.css?v=2652">\n</head>', 1)

home = '''
  <section id="bp-v2652-home" aria-label="BridgePoint V2652 Home">
    <div class="bp-v2652-wrap">
      <div class="bp-v2652-top">
        <div class="bp-v2652-logo"></div>
        <div><div class="bp-v2652-title">BRIDGEPOINT INTELLIGENCE</div><div class="bp-v2652-sub">Living property + world intelligence</div></div>
        <div class="bp-v2652-live">● V2652 LIVE</div>
      </div>
      <div class="bp-v2652-hero">
        <h1>Your world is the home screen.</h1>
        <p>BridgePoint combines canonical properties, claims intelligence, weather, hazards, structures, transportation, public infrastructure, imagery, physical-world observations and future governed layers in one living map. The layer catalog is driven by the backend so new capabilities do not disappear from the app.</p>
        <div class="bp-v2652-actions">
          <button id="bp-v2652-open-world" class="bp-v2652-btn primary" type="button">Explore living world</button>
          <button id="bp-v2652-workspace" class="bp-v2652-btn gold" type="button">Open full workspace</button>
          <button id="bp-v2652-refresh" class="bp-v2652-btn" type="button">Refresh truth</button>
          <span id="bp-v2652-updated" class="bp-v2652-sub" style="align-self:center"></span>
        </div>
        <div class="bp-v2652-metrics">
          <div class="bp-v2652-stat"><b data-bp-v2652-stat="layers">—</b><span>WORLD LAYERS</span></div>
          <div class="bp-v2652-stat"><b data-bp-v2652-stat="sources">—</b><span>ACTIVE SOURCES</span></div>
          <div class="bp-v2652-stat"><b data-bp-v2652-stat="observations">—</b><span>OBSERVATIONS</span></div>
          <div class="bp-v2652-stat"><b data-bp-v2652-stat="roofs">—</b><span>ROOF ASSETS</span></div>
          <div class="bp-v2652-stat"><b data-bp-v2652-stat="parcels">—</b><span>CANONICAL PARCELS</span></div>
          <div class="bp-v2652-stat"><b data-bp-v2652-stat="opportunities">—</b><span>OPPORTUNITIES</span></div>
        </div>
        <div id="bp-v2652-meta" class="bp-v2652-sub" style="margin-top:10px">Synchronizing backend catalog…</div>
      </div>
      <div class="bp-v2652-worldCard">
        <div class="bp-v2652-worldbar"><b>BridgePoint World V2652</b><span>versioned path · cache-busted · proven V2500 property core underneath</span></div>
        <iframe id="bp-v2652-map" class="bp-v2652-world" src="bridgepoint-world-v2652/?release=2652" title="BridgePoint World V2652" allow="geolocation; fullscreen"></iframe>
      </div>
      <div class="bp-v2652-foot">Truth rule: source registration, materialized coverage and current observations are separate. BridgePoint labels source-backed, derived, modeled, forecast and historical states instead of inventing missing detail. Use <b>Open full workspace</b> for the existing application tools while the complete Flutter rebuild is promoted.</div>
    </div>
  </section>
'''

if 'id="bp-v2652-home"' not in s:
    s = s.replace('<body>', '<body>\n' + home, 1)

if 'bridgepoint-home-v2652.js' not in s:
    s = s.replace(
        '<script src="flutter_bootstrap.js" async></script>',
        '<script type="module" src="bridgepoint-home-v2652.js?v=2652"></script>\n  <script src="flutter_bootstrap.js" async></script>',
        1,
    )

index.write_text(s)

text = service_worker.read_text()
digest = hashlib.md5(s.encode()).hexdigest()
text = re.sub(r'("index\.html"\s*:\s*")[0-9a-f]+(")', rf'\g<1>{digest}\2', text)
text = re.sub(r'("/"\s*:\s*")[0-9a-f]+(")', rf'\g<1>{digest}\2', text)
text += f'\n// BridgePoint V2652 shell refresh {digest}\n'
service_worker.write_text(text)

assert 'id="bp-v2652-home"' in s
assert 'bridgepoint-world-v2652/' in s
assert 'bridgepoint-home-v2652.js' in s
print(digest)
