from pathlib import Path
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import json,re,html,email.utils

ROOT=Path("rebuild-v5000")
NEWS=ROOT/"news"
HOST="https://bridgepointintelligence.online"
APP=(ROOT/"app.js").read_text(encoding="utf-8")
SUPA=re.search(r"const SUPA=['\"]([^'\"]+)",APP).group(1)
KEY=re.search(r"const KEY=['\"]([^'\"]+)",APP).group(1)
ET=ZoneInfo("America/New_York")

def fetch_json(url,data=None,headers=None,timeout=25):
    h={"User-Agent":"BridgePointIntelligence-Newsroom/5810 (https://bridgepointintelligence.online/)","Accept":"application/json"}
    if headers:h.update(headers)
    req=Request(url,data=data,headers=h,method="POST" if data is not None else "GET")
    with urlopen(req,timeout=timeout) as r:return json.loads(r.read().decode("utf-8"))

def esc(v):return html.escape(str(v or ""),quote=True)
def fmt(n):return f"{int(n or 0):,}"
def iso(dt):return dt.isoformat(timespec="seconds")
def xml(v):return esc(v)

now=datetime.now(timezone.utc).astimezone(ET)
status=fetch_json(SUPA+"/rest/v1/rpc/bridgepoint_public_global_status_v957",b"{}",{"apikey":KEY,"Content-Type":"application/json"})
countries=status.get("countries") or []

events=re.compile(r"(wind|flood|storm|high surf|coastal|hurricane|tropical|rain|rip current)",re.I)
alerts={}
for area in ("CT","NY","NJ","RI","MA","PA"):
    try:
        data=fetch_json("https://api.weather.gov/alerts/active?area="+area)
    except Exception:
        continue
    for f in data.get("features") or []:
        p=f.get("properties") or {}
        ev=str(p.get("event") or "")
        if not events.search(ev):continue
        aid=str(f.get("id") or p.get("@id") or p.get("id") or (ev+"|"+str(p.get("areaDesc"))))
        alerts[aid]={"id":aid,"event":ev,"headline":p.get("headline") or ev,"area":p.get("areaDesc") or area,
                     "severity":p.get("severity") or "Unknown","description":p.get("description") or "",
                     "instruction":p.get("instruction") or "","expires":p.get("expires") or "","sent":p.get("sent") or ""}
alert_list=sorted(alerts.values(),key=lambda x:(x["severity"],x["event"],x["area"]))[:24]

storm_window=datetime(2026,9,25,tzinfo=ET).date() <= now.date() <= datetime(2026,9,29,tzinfo=ET).date()
weather_title=("September 2026 Nor'easter: active Northeast wind and coastal flood alerts"
               if storm_window and alert_list else "Northeast Hazard Intelligence: live National Weather Service alerts")
weather_desc=("BridgePoint Intelligence tracks the September 2026 Nor'easter using official National Weather Service alerts and live geospatial property context."
              if storm_window else "BridgePoint Intelligence tracks active Northeast weather alerts from the National Weather Service alongside property and geospatial context.")

alert_html=""
for a in alert_list:
    desc=" ".join(str(a["description"]).split())
    if len(desc)>520:desc=desc[:517]+"..."
    href=a["id"] if str(a["id"]).startswith("http") else "https://www.weather.gov/"
    alert_html+=f'<div class="alert"><strong>{esc(a["event"])} · {esc(a["severity"])}</strong><span>{esc(a["area"])}</span><p>{esc(desc)}</p><a href="{esc(href)}" rel="nofollow">Official NWS alert</a></div>'

if not alert_html:
    alert_html='<div class="alert"><strong>No qualifying active Northeast alert was returned during this refresh.</strong><p>BridgePoint will republish this page when official NWS alerts change.</p></div>'

weather=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(weather_title)} | BridgePoint Intelligence</title><meta name="description" content="{esc(weather_desc)}">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"><link rel="canonical" href="{HOST}/news/current-northeast-weather.html"><link rel="stylesheet" href="/news/news.css">
<script type="application/ld+json">{json.dumps({"@context":"https://schema.org","@type":"NewsArticle","headline":weather_title,"datePublished":"2026-09-26T19:36:00-04:00","dateModified":iso(now),"mainEntityOfPage":HOST+"/news/current-northeast-weather.html","publisher":{"@type":"Organization","name":"BridgePoint Intelligence","url":HOST+"/"},"author":{"@type":"Organization","name":"BridgePoint Intelligence"}})}</script></head>
<body><div class="wrap"><header class="top"><a class="brand" href="/">BRIDGEPOINT INTELLIGENCE</a><nav class="nav"><a href="/app/">LIVE APP</a><a href="/news/">NEWSROOM</a></nav></header>
<main><section class="hero"><span class="eyebrow">LIVE WEATHER INTELLIGENCE · {esc(now.strftime("%B %d, %Y"))}</span><h1>{esc(weather_title)}</h1><p>{esc(weather_desc)} Official NWS alerts remain authoritative; BridgePoint provides spatial context and is not the issuing authority.</p></section>
<article class="article"><h2>Active official alerts</h2>{alert_html}
<h2>Why BridgePoint tracks this spatially</h2><p>Wind, flood, rain, roads, structures, roofs and parcel boundaries overlap differently block by block. BridgePoint places hazard feeds beside property and building context to make changing exposure easier to inspect.</p>
<p><a class="cta" href="/app/">OPEN THE LIVE BRIDGEPOINT MAP</a></p>
<div class="sources"><strong>Primary official sources</strong><ul><li><a href="https://www.weather.gov/okx/">National Weather Service New York</a></li><li><a href="https://www.weather.gov/box/">National Weather Service Boston/Norton</a></li><li><a href="https://api.weather.gov/">National Weather Service API</a></li></ul></div></article></main>
<footer class="foot"><a href="/news/">Back to newsroom</a> · Automated source-backed refresh: {esc(now.strftime("%Y-%m-%d %I:%M %p %Z"))}</footer></div></body></html>'''
(NEWS/"current-northeast-weather.html").write_text(weather,encoding="utf-8")

world=int(status.get("worldwide_canonical_total") or 0)
nonus=int(status.get("global_non_us_canonical") or status.get("active_global_canonical") or 0)
bounds=int(status.get("materialized_global_boundaries") or 0)
buildings=int(status.get("global_building_footprints") or 0)
models=int(status.get("global_3d_building_models") or 0)
targets=int(status.get("target_country_count") or 0)
top=sorted([c for c in countries if int(c.get("active_canonical") or 0)>0],key=lambda x:int(x.get("active_canonical") or 0),reverse=True)[:12]
rows="".join(f'<div class="fact"><span>{esc(c.get("country_name") or c.get("country_code"))}</span><b>{fmt(c.get("active_canonical"))}</b><small>{fmt(c.get("materialized_boundary_rows"))} materialized boundaries</small></div>' for c in top)
global_title=f"BridgePoint global property coverage reaches {fmt(world)} worldwide canonical identities"
global_page=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(global_title)}</title><meta name="description" content="Live BridgePoint global expansion counters for canonical property identities, materialized parcel boundaries, buildings and 3D structures.">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"><link rel="canonical" href="{HOST}/news/global-expansion.html"><link rel="stylesheet" href="/news/news.css">
<script type="application/ld+json">{json.dumps({"@context":"https://schema.org","@type":"NewsArticle","headline":global_title,"datePublished":"2026-09-26T19:36:00-04:00","dateModified":iso(now),"mainEntityOfPage":HOST+"/news/global-expansion.html","publisher":{"@type":"Organization","name":"BridgePoint Intelligence","url":HOST+"/"},"author":{"@type":"Organization","name":"BridgePoint Intelligence"}})}</script></head>
<body><div class="wrap"><header class="top"><a class="brand" href="/">BRIDGEPOINT INTELLIGENCE</a><nav class="nav"><a href="/app/">LIVE APP</a><a href="/news/">NEWSROOM</a></nav></header>
<main><section class="hero"><span class="eyebrow">GLOBAL COVERAGE · LIVE COUNTERS</span><h1>{esc(global_title)}</h1><p>Operational counters change as official-source ingestion, deduplication, linking and materialization continue. Layers are counted separately rather than being inferred from one another.</p></section>
<section class="facts"><div class="fact"><span>Worldwide canonical total</span><b>{fmt(world)}</b></div><div class="fact"><span>Non-U.S. canonical</span><b>{fmt(nonus)}</b></div><div class="fact"><span>Materialized global boundaries</span><b>{fmt(bounds)}</b></div><div class="fact"><span>Global building footprints</span><b>{fmt(buildings)}</b></div><div class="fact"><span>Global 3D building models</span><b>{fmt(models)}</b></div><div class="fact"><span>Tracked target countries</span><b>{fmt(targets)}</b></div></section>
<article class="article"><h2>Leading live country counters</h2><section class="facts">{rows}</section><p>BridgePoint distinguishes parcel/canonical coverage from building, roof, address and official-geospatial foothold coverage. Counts may be revised as duplicate identities and source relationships are reconciled.</p><p><a class="cta" href="/app/">VIEW THE LIVE GLOBAL MAP</a></p></article></main>
<footer class="foot"><a href="/news/">Back to newsroom</a> · Automated counter refresh: {esc(now.strftime("%Y-%m-%d %I:%M %p %Z"))}</footer></div></body></html>'''
(NEWS/"global-expansion.html").write_text(global_page,encoding="utf-8")

news_index=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BridgePoint Intelligence Newsroom | Weather, Property Data & Global Expansion</title><meta name="description" content="BridgePoint Intelligence newsroom: official-source weather context and live global property coverage updates."><meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"><link rel="canonical" href="{HOST}/news/"><link rel="alternate" type="application/rss+xml" href="/feed.xml" title="BridgePoint Intelligence News"><link rel="stylesheet" href="/news/news.css"></head><body><div class="wrap"><header class="top"><a class="brand" href="/">BRIDGEPOINT INTELLIGENCE</a><nav class="nav"><a href="/app/">LIVE APP</a><a href="/news/">NEWS</a></nav></header><section class="hero"><span class="eyebrow">BRIDGEPOINT NEWSROOM</span><h1>Live conditions. Global expansion. Source-backed updates.</h1><p>Automated updates use official weather feeds and BridgePoint public counters — not generic filler.</p></section><section class="grid"><article class="card"><span class="eyebrow">WEATHER · {esc(now.strftime("%b %d, %Y").upper())}</span><h2><a href="/news/current-northeast-weather.html">{esc(weather_title)}</a></h2><p>{esc(weather_desc)}</p></article><article class="card"><span class="eyebrow">GLOBAL COVERAGE · LIVE COUNTERS</span><h2><a href="/news/global-expansion.html">{esc(global_title)}</a></h2><p>{fmt(bounds)} materialized global boundaries and {fmt(buildings)} global building footprints in the latest public counter refresh.</p></article></section><footer class="foot">BridgePoint Intelligence · <a href="/feed.xml">RSS</a> · <a href="/sitemap.xml">Sitemap</a></footer></div></body></html>'''
(NEWS/"index.html").write_text(news_index,encoding="utf-8")

last=now.date().isoformat()
(ROOT/"sitemap.xml").write_text(f'''<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{HOST}/</loc><lastmod>{last}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url><url><loc>{HOST}/app/</loc><lastmod>{last}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url><url><loc>{HOST}/pricing.html</loc><changefreq>weekly</changefreq><priority>0.7</priority></url><url><loc>{HOST}/book/</loc><changefreq>monthly</changefreq><priority>0.6</priority></url><url><loc>{HOST}/news/</loc><lastmod>{last}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url><url><loc>{HOST}/news/current-northeast-weather.html</loc><lastmod>{last}</lastmod><changefreq>hourly</changefreq><priority>0.9</priority></url><url><loc>{HOST}/news/global-expansion.html</loc><lastmod>{last}</lastmod><changefreq>hourly</changefreq><priority>0.9</priority></url></urlset>''',encoding="utf-8")
(ROOT/"news-sitemap.xml").write_text(f'''<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"><url><loc>{HOST}/news/current-northeast-weather.html</loc><news:news><news:publication><news:name>BridgePoint Intelligence</news:name><news:language>en</news:language></news:publication><news:publication_date>{iso(now)}</news:publication_date><news:title>{xml(weather_title)}</news:title></news:news></url><url><loc>{HOST}/news/global-expansion.html</loc><news:news><news:publication><news:name>BridgePoint Intelligence</news:name><news:language>en</news:language></news:publication><news:publication_date>{iso(now)}</news:publication_date><news:title>{xml(global_title)}</news:title></news:news></url></urlset>''',encoding="utf-8")
pub=email.utils.format_datetime(now.astimezone(timezone.utc))
(ROOT/"feed.xml").write_text(f'''<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>BridgePoint Intelligence News</title><link>{HOST}/news/</link><description>Weather, property intelligence and global coverage updates from BridgePoint Intelligence.</description><language>en-us</language><lastBuildDate>{pub}</lastBuildDate><item><title>{xml(weather_title)}</title><link>{HOST}/news/current-northeast-weather.html</link><guid>{HOST}/news/current-northeast-weather.html</guid><pubDate>{pub}</pubDate><description>{xml(weather_desc)}</description></item><item><title>{xml(global_title)}</title><link>{HOST}/news/global-expansion.html</link><guid>{HOST}/news/global-expansion.html</guid><pubDate>{pub}</pubDate><description>Live BridgePoint global parcel, building and 3D structure expansion counters.</description></item></channel></rss>''',encoding="utf-8")
print(json.dumps({"updated":iso(now),"alerts":len(alert_list),"worldwide":world,"global_boundaries":bounds}))
