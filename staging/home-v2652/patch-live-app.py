from pathlib import Path
import hashlib
import re

root = Path('site/app')
index = root / 'index.html'
service_worker = root / 'flutter_service_worker.js'

s = index.read_text()
s = s.replace('href="bridgepoint-3d-world/"', 'href="bridgepoint-world-v2652/"')

if 'bridgepoint-home-v2652.css' not in s:
    s = s.replace('</head>', '  <link rel="stylesheet" href="bridgepoint-home-v2652.css?v=2653">\n</head>', 1)

home = '''
  <section id="bp-v2652-home" aria-label="BridgePoint Generated World Home">
    <div class="bp-v2652-wrap">
      <div class="bp-v2652-top">
        <div class="bp-v2652-logo"></div>
        <div><div class="bp-v2652-title">BRIDGEPOINT INTELLIGENCE</div><div class="bp-v2652-sub">Living property + generated real-world intelligence</div></div>
        <div class="bp-v2652-live">● V2653 LIVE</div>
      </div>
      <div class="bp-v2652-hero">
        <h1>Your world is the home screen.</h1>
        <p>BridgePoint builds the visible U.S. world from governed terrain, land-cover/material classifications, property geometry, buildings, roofs, roads, water, vegetation, weather, hazards, transportation and live observations. Satellite and aerial imagery are evidence inputs only — not the default world skin.</p>
        <div class="bp-v2652-actions">
          <button id="bp-v2652-open-world" class="bp-v2652-btn primary" type="button">Explore generated world</button>
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
        <div class="bp-v2652-worldbar"><b>BridgePoint World V2653</b><span>BridgePoint-derived surface · satellite default OFF · proven property core underneath</span></div>
        <iframe id="bp-v2652-map" class="bp-v2652-world" src="bridgepoint-world-v2652/?release=2653" title="BridgePoint World V2653" allow="geolocation; fullscreen"></iframe>
      </div>
      <div class="bp-v2652-foot">Truth rule: source registration, materialized coverage and current observations are separate. BridgePoint labels source-backed, derived, modeled, forecast and historical states instead of inventing missing detail. The generated world can use imagery as evidence, but imagery no longer paints the Earth by default.</div>
    </div>
  </section>
'''

if 'id="bp-v2652-home"' not in s:
    s = s.replace('<body>', '<body>\n' + home, 1)
else:
    s = re.sub(r'<section id="bp-v2652-home".*?</section>\s*', home, s, count=1, flags=re.S)

if 'bridgepoint-home-v2652.js' not in s:
    s = s.replace(
        '<script src="flutter_bootstrap.js" async></script>',
        '<script type="module" src="bridgepoint-home-v2652.js?v=2653"></script>\n  <script src="flutter_bootstrap.js" async></script>',
        1,
    )
else:
    s = re.sub(r'bridgepoint-home-v2652\.js\?v=\d+', 'bridgepoint-home-v2652.js?v=2653', s)

index.write_text(s)

text = service_worker.read_text()
digest = hashlib.md5(s.encode()).hexdigest()
text = re.sub(r'("index\.html"\s*:\s*")[0-9a-f]+(")', rf'\g<1>{digest}\2', text)
text = re.sub(r'("/"\s*:\s*")[0-9a-f]+(")', rf'\g<1>{digest}\2', text)
text += f'\n// BridgePoint V2653 generated-world shell refresh {digest}\n'
service_worker.write_text(text)

assert 'id="bp-v2652-home"' in s
assert 'bridgepoint-world-v2652/?release=2653' in s
assert 'BridgePoint World V2653' in s
print(digest)