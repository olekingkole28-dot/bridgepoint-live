from pathlib import Path

p = Path('app/experience-v974.js')
s = p.read_text()
old = "function syncAuth(){const token=findAccessToken();controls.style.display=token?'none':'flex';canvas.classList.toggle('bp974-covered',modalLikeOpen());}"
new = "function syncAuth(){const token=findAccessToken();controls.style.display=token?'none':'flex';const mapOpen=document.getElementById('bp974-map-dialog')?.classList.contains('show')===true;canvas.classList.toggle('bp974-covered',modalLikeOpen()||mapOpen);}"
if old not in s:
    raise SystemExit('syncAuth target not found')
p.write_text(s.replace(old,new))

idx = Path('app/index.html')
html = idx.read_text()
html = html.replace('experience-v974.js?v=979','experience-v974.js?v=982')
if 'live-home-v981.js' not in html:
    html = html.replace('<script src="signup-confirmation-v946.js?v=978"></script>', '<script src="signup-confirmation-v946.js?v=978"></script>\n  <script src="live-home-v981.js?v=981"></script>')
idx.write_text(html)
