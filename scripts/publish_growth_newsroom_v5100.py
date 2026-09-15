#!/usr/bin/env python3
from __future__ import annotations
import html, json, re, shutil, urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"newsroom"
ORIGIN="https://bridgepointintelligence.online"
SUPA="https://xdfsjztwgsbmabshzsjw.supabase.co"

def key():
    text=(ROOT/"rebuild-v5000"/"landing.js").read_text(encoding="utf-8")
    m=re.search(r"KEY='([^']+)'",text)
    if not m: raise RuntimeError("publishable key not found")
    return m.group(1)

KEY=key()
HEAD={"apikey":KEY,"Content-Type":"application/json","Accept":"application/json"}

def rpc(name,args=None):
    data=json.dumps(args or {}).encode()
    req=urllib.request.Request(f"{SUPA}/rest/v1/rpc/{name}",data=data,headers=HEAD,method="POST")
    with urllib.request.urlopen(req,timeout=20) as r:
        return json.loads(r.read().decode())

def esc(v): return html.escape(str(v if v is not None else ""))
def num(v): return f"{int(v or 0):,}"
def slug(v):
    s=re.sub(r"[^a-z0-9]+","-",str(v).lower()).strip("-")
    return s[:90] or "bridgepoint-update"

def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00","Z")

def hazard_family(h):
    name=str(h.get("name") or h.get("type") or "Live hazard").strip()
    low=name.lower()
    if low.startswith("probsevere storm"): return "ProbSevere convective storm signals"
    if low.startswith("day 1 hail outlook"): return "Day 1 hail outlook"
    if low.startswith("day 1 tornado outlook"): return "Day 1 tornado outlook"
    if low.startswith("day 1 wind outlook"): return "Day 1 severe wind outlook"
    if "flash flood warning" in low: return "Flash Flood Warning"
    if "flood warning" in low: return "Flood Warning"
    if "flood advisory" in low: return "Flood Advisory"
    if "tornado warning" in low: return "Tornado Warning"
    if "severe thunderstorm warning" in low: return "Severe Thunderstorm Warning"
    if "wildfire" in low or "fire warning" in low: return "Wildfire / fire weather"
    return name

def active_hazards(weather):
    now=datetime.now(timezone.utc)
    out=[]
    for x in weather.get("items",[]) or []:
        if not isinstance(x,dict): continue
        name=str(x.get("name") or x.get("type") or "Live hazard")
        typ=str(x.get("type") or "HAZARD").upper()
        if typ not in {"FLOOD","TORNADO","HURRICANE","WILDFIRE","LIGHTNING","WIND","HAIL"} and "Warning" not in name:
            continue
        ends=x.get("ends_at")
        if ends:
            try:
                if datetime.fromisoformat(ends.replace("Z","+00:00")) <= now: continue
            except Exception: pass
        if str(x.get("urgency") or "").lower()=="past": continue
        out.append(x)
    return out

STYLE="""<style>
:root{--bg:#061019;--panel:#0b1823;--line:#1c4055;--text:#f3fbff;--muted:#9db4c1;--cyan:#62e6ff;--blue:#178df0}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0,#0d2638 0,#061019 34%,#04090e 100%);color:var(--text);font:16px/1.6 Inter,system-ui,Arial,sans-serif}
main{max-width:1040px;margin:auto;padding:34px 20px 72px}a{color:var(--cyan)}.brand{display:flex;justify-content:space-between;gap:16px;align-items:center}.brand a{font-weight:950;color:white;text-decoration:none;letter-spacing:.03em}
.badge{display:inline-block;margin-top:30px;border:1px solid #2b607d;border-radius:999px;padding:5px 9px;color:#a8eaff;font-size:.72rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
h1{font-size:clamp(2.25rem,7vw,5rem);line-height:1.01;letter-spacing:-.045em;margin:16px 0}.lead{color:var(--muted);font-size:1.12rem;max-width:820px}
.metrics,.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:24px}.metric,.card{background:rgba(11,24,35,.94);border:1px solid var(--line);border-radius:16px;padding:18px}
.metric b{font-size:1.55rem}.metric span,.card small{display:block;color:var(--muted);font-size:.82rem}.card h2{font-size:1.18rem;line-height:1.25;margin:8px 0}.card p{color:#c5d6df}
.ctas{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}.btn{display:inline-block;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:950}.primary{background:var(--blue);color:white}.secondary{border:1px solid #35677f;color:#dff8ff;background:#0a1d2a}
.note{margin-top:24px;padding:15px;border-left:4px solid var(--cyan);background:#092033;color:#c5d9e4}.live{color:#75f1b2;font-weight:900}.warn{color:#ffd66e;font-weight:900}
footer{margin-top:38px;color:#78909d;font-size:.82rem}.share{margin-top:12px;color:#93aab6;font-size:.88rem}
</style>"""

def page(title,desc,body,canonical):
    t=esc(title); d=esc(desc); c=esc(canonical)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{t}</title><meta name="description" content="{d}"><link rel="canonical" href="{c}">
<meta property="og:type" content="article"><meta property="og:title" content="{t}"><meta property="og:description" content="{d}"><meta property="og:url" content="{c}">
<meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="/founder-access.css">{STYLE}</head><body><main>
<div class="brand"><a href="/">BRIDGEPOINT INTELLIGENCE</a><a href="/newsroom/">LIVE NEWSROOM</a></div>{body}
<footer>BridgePoint publishes live product metrics and source-labelled hazard context. Weather alerts do not prove property damage. Counts can change as sources reconcile.</footer>
<script defer src="/acquisition_tracker.js?v=5001"></script><script defer src="/founder-access.js?v=5101"></script><script defer src="/current-map-entry.js?v=5100"></script>
</main></body></html>"""

def founder_access(vertical="OTHER",state=""):
    attrs=f'data-founder-access data-product="INTELLIGENCE" data-vertical="{esc(vertical)}"'
    if state: attrs+=f' data-state="{esc(state)}"'
    return f'<div id="founder-access" {attrs}></div>'

def actions(campaign,lat=None,lon=None,vertical="OTHER",state=""):
    map_params={"utm_source":"newsroom","utm_medium":"organic_newsroom","utm_campaign":campaign}
    if lat is not None and lon is not None:
        map_params.update({"lat":lat,"lng":lon,"z":11,"live":1})
    map_url="/app/?"+urlencode(map_params)
    signup="/?"+urlencode({"auth":"signup","utm_source":"newsroom","utm_medium":"organic_newsroom","utm_campaign":campaign})
    return f'<div class="ctas"><a class="btn primary" href="{esc(map_url)}">OPEN THE LIVE MAP</a><a class="btn secondary" href="#founder-access">REQUEST FOUNDER ACCESS</a><a class="btn secondary" href="{esc(signup)}">CREATE A BRIDGEPOINT ACCOUNT</a></div>'+founder_access(vertical,state)

def horizon_actions(campaign):
    play="/app/horizon/?"+urlencode({"utm_source":"newsroom","utm_medium":"horizon_owned","utm_campaign":campaign})
    early="/app/horizon/early-access.html?"+urlencode({"utm_source":"newsroom","utm_medium":"horizon_owned","utm_campaign":campaign})
    return f'<div class="ctas"><a class="btn primary" href="{esc(play)}">OPEN HORIZON</a><a class="btn secondary" href="{esc(early)}">JOIN EARLY ACCESS</a></div>'+founder_access("OTHER")

def write(rel,text):
    p=OUT/rel
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(text,encoding="utf-8")

def main():
    if OUT.exists(): shutil.rmtree(OUT)
    OUT.mkdir(parents=True,exist_ok=True)
    status=rpc("bridgepoint_frontend_status_v5000")
    roof=rpc("bridgepoint_public_roof_status_v5100") or {}
    weather=rpc("bridgepoint_public_weather_bootstrap_v5004")
    generated=now_iso()
    canonical=int(status.get("canonical_properties") or 0)
    addresses=int(status.get("unique_addresses") or 0)
    buildings=int(status.get("map_ready_buildings") or 0)
    remaining=status.get("parcel_remaining") or {}
    hazards=active_hazards(weather)
    hazard_groups={}
    for h in hazards:
        hazard_groups.setdefault(hazard_family(h),[]).append(h)
    hazard_counts=Counter({k:len(v) for k,v in hazard_groups.items()})

    items=[]

    def add(slugv,title,desc,body,kind):
        url=f"{ORIGIN}/newsroom/{slugv}/"
        write(f"{slugv}/index.html",page(title,desc,body,url))
        items.append({"slug":slugv,"url":url,"title":title,"description":desc,"kind":kind,"generated_at":generated})

    add("169-million-canonical-property-map",
        f"BridgePoint now reports {canonical/1_000_000:.1f}M canonical U.S. property records",
        "A live proptech map combining canonical property identity, buildings, roofs and source-labelled hazards.",
        f'''<span class="badge">LIVE PRODUCT MILESTONE</span><h1>{num(canonical)} canonical properties.<br>One live spatial system.</h1>
<p class="lead">BridgePoint Intelligence currently reports <strong>{num(canonical)}</strong> canonical properties, <strong>{num(addresses)}</strong> address records and <strong>{num(buildings)}</strong> map-ready buildings. The product is live and the counts update from the backend—not from a static marketing counter.</p>
<div class="metrics"><div class="metric"><b>{num(canonical)}</b><span>canonical properties</span></div><div class="metric"><b>{num(addresses)}</b><span>address records</span></div><div class="metric"><b>{num(buildings)}</b><span>map-ready buildings</span></div></div>
<div class="note">BridgePoint uses “canonical property” as its identity layer. That is not automatically identical to a competitor’s parcel count. Current parcel reconciliation remains separately measured.</div>{actions("canonical_169m",None,None,"REAL_ESTATE")}''',"milestone")

    add("solo-builder-proptech",
        f"Solo builder creates a live property-intelligence map spanning {canonical/1_000_000:.1f}M canonical records",
        "An emerging proptech project built by a solo founder connects property identity, 3D buildings, roofs and live hazards.",
        f'''<span class="badge">EMERGING PROPTECH</span><h1>A solo builder is turning {num(canonical)} property identities into a living map.</h1>
<p class="lead">BridgePoint Intelligence is being built as one spatial interface for property identity, parcel boundaries, 3D structures, roof intelligence, weather, claims context and workflow. The current map is public enough to inspect before creating an account.</p>
<div class="note"><strong>For proptech operators, founders and technical teams:</strong> the interesting part is not a screenshot. It is the backend-to-map pipeline and the fact that the product exposes live source freshness and uncertainty instead of hiding it.</div>{actions("solo_builder_proptech",vertical="OTHER")}''',"proptech")

    add("founder-story-built-from-a-phone",
        "From homelessness and a phone to a national property-intelligence build",
        "The BridgePoint founder story: starting with a phone, building while homeless, and turning the idea into a live national property-intelligence product in about five months.",
        f'''<span class="badge">FOUNDER STORY</span><h1>Started while homeless.<br>Built first on a phone.<br>Now mapping {num(canonical)} canonical properties.</h1>
<p class="lead">BridgePoint’s founder story is part of the product story: the project began while its founder was homeless, working from a phone, and was pushed from idea to a live national-scale property-intelligence system in roughly five months.</p>
<p class="lead">The point is not the hardship by itself. The point is what exists now: a working map, live backend metrics, nationwide building and parcel infrastructure, roof processing and source-labelled weather context that people can inspect directly.</p>{actions("founder_story_phone",vertical="OTHER")}''',"founder")

    add("investor-live-product-callout",
        "Investors: BridgePoint is live—inspect the product instead of reading a pitch",
        "A direct callout to proptech, geospatial, insurance, climate-tech and data investors to inspect BridgePoint's live product.",
        f'''<span class="badge">INVESTOR CALLOUT</span><h1>Don’t start with the deck.<br>Start with the map.</h1>
<p class="lead">BridgePoint is inviting proptech, geospatial, insurance, climate-tech, construction-tech and data investors to inspect the live product. Current backend metrics report <strong>{num(canonical)}</strong> canonical properties and <strong>{num(buildings)}</strong> map-ready buildings.</p>
<div class="note">BridgePoint is still finishing parcel and roof materialization. That is visible rather than hidden. If the architecture, scale or founder execution is interesting, use the live product as the first diligence surface.</div>{actions("investor_callout",vertical="OTHER")}''',"investor")

    add("horizon-real-world-spatial-game",
        "BridgePoint Horizon turns the same national spatial backend into a playable survival world",
        "BridgePoint Horizon reuses BridgePoint terrain, roads, parcels and buildings as the spatial foundation for a playable survival and combat experience.",
        f'''<span class="badge">BRIDGEPOINT HORIZON</span><h1>The property-data backend has a second life:<br>a playable world.</h1>
<p class="lead">BridgePoint Horizon uses the same streamed spatial foundation behind BridgePoint Intelligence—terrain, roads, parcels and buildings—then adds fictional interiors, infected, vehicles, rooftop traversal and combat systems.</p>
<div class="metrics"><div class="metric"><b>4</b><span>current game modes</span></div><div class="metric"><b>50</b><span>match map locations</span></div><div class="metric"><b>{num(buildings)}</b><span>BridgePoint map-ready buildings feeding the broader spatial system</span></div></div>
<div class="note"><strong>Early-build truth:</strong> Horizon is being actively regression-tested and performance-tuned. Paid checkout is not enabled. Players can inspect the current web build and join early access without being charged.</div>{horizon_actions("horizon_spatial_game")}''',"horizon")

    add("roof-intelligence-mega-sprint",
        f"BridgePoint roof-intelligence sprint: {num(roof.get('lidar_buildings_refined'))} LiDAR-refined buildings and climbing",
        "Live roof materialization status from BridgePoint's active roof-data sprint.",
        f'''<span class="badge">ROOF INTELLIGENCE · LIVE BUILD</span><h1>Roof data is being materialized continuously.</h1>
<p class="lead">BridgePoint currently reports <strong>{num(roof.get("source_roof_records"))}</strong> source roof records, <strong>{num(roof.get("exact_roof_plane_records"))}</strong> exact source roof-plane records and <strong>{num(roof.get("lidar_buildings_refined"))}</strong> LiDAR-refined buildings.</p>
<div class="metrics"><div class="metric"><b>{num(roof.get("pitch_records"))}</b><span>pitch records</span></div><div class="metric"><b>{num(roof.get("direction_records"))}</b><span>direction records</span></div><div class="metric"><b>{num(roof.get("material_records"))}</b><span>material records</span></div></div>
<div class="note">Renderable roof shells and source-backed roof attributes are separate truth classes. Missing attributes remain unknown instead of being marketed as exact.</div>{actions("roof_mega_sprint",vertical="ROOFING")}''',"roof")

    if hazards:
        top=[(name,rows[0],len(rows)) for name,rows in sorted(hazard_groups.items(), key=lambda kv:(-len(kv[1]),kv[0]))[:12]]
        rows="".join(f'<article class="card"><small>{esc(h.get("type","HAZARD"))} · {esc(h.get("source","SOURCE"))}</small><h2>{esc(name)}</h2><p>{count} current record{"s" if count!=1 else ""} · {esc(h.get("severity") or "Source-labelled event")} · {esc(h.get("certainty") or "")}</p><a href="/app/?{urlencode({"lat":h.get("lat"),"lng":h.get("lon"),"z":11,"live":1,"utm_source":"newsroom","utm_medium":"storm_live","utm_campaign":slug(name)})}">Open this area on the map →</a></article>' for name,h,count in top)
        add("live-storm-intelligence",
            f"Live U.S. storm intelligence: {len(hazards)} active source-labelled hazard records",
            "Current BridgePoint storm and hazard context generated from live source-labelled weather data.",
            f'''<span class="badge">LIVE STORM INTELLIGENCE</span><h1>{len(hazards)} active source-labelled hazard records in the current public feed.</h1>
<p class="lead">BridgePoint is ingesting live weather context and tying it to the same spatial system used for properties, structures and roofs. These are alerts/observations—not automatic proof of property damage.</p><div class="grid">{rows}</div>{actions("live_storm_intelligence",vertical="RESTORATION")}''',"storm")

        for name,group in sorted(hazard_groups.items(), key=lambda kv:(-len(kv[1]),kv[0]))[:16]:
            h=group[0]; k=slug(name); count=len(group)
            lat=h.get("lat"); lon=h.get("lon")
            add(f"live-{k}",
                f"{name}: {count} current BridgePoint map record{'s' if count!=1 else ''}",
                f"Live source-labelled {name.lower()} context on the BridgePoint Intelligence map.",
                f'''<span class="badge">LIVE WEATHER · SOURCE-LABELLED</span><h1>{esc(name)} is active in BridgePoint’s live weather feed.</h1>
<p class="lead">The current public feed contains <strong>{count}</strong> active record{'s' if count!=1 else ''} in this event family. Open the live map to inspect the spatial context around a current source event.</p>
<div class="note">Weather alerts and observations do not prove a specific property was damaged. BridgePoint keeps the event source, severity, certainty and timing separate from property conclusions.</div>{actions("live_"+k,lat,lon,vertical="RESTORATION")}''',"storm")

    # Current parcel completion page, intentionally avoiding unsupported “largest parcel database” wording.
    fl=int(remaining.get("FL") or 0); ny=int(remaining.get("NY") or 0); pr=int(remaining.get("PR") or 0)
    add("parcel-build-status",
        f"BridgePoint parcel build status: {num(canonical)} canonical properties with final reconciliation still running",
        "Live parcel/canonical-property build status with explicit separation between canonical identity and parcel-boundary completion.",
        f'''<span class="badge">PARCEL BUILD STATUS</span><h1>{num(canonical)} canonical properties.<br>Parcel reconciliation is still visible.</h1>
<p class="lead">Current remaining parcel work reported by the backend: Florida <strong>{num(fl)}</strong>, New York <strong>{num(ny)}</strong>, Puerto Rico <strong>{num(pr)}</strong>. BridgePoint does not convert that into a “largest parcel database” claim until the parcel truth gate supports it.</p>{actions("parcel_build_status",vertical="REAL_ESTATE")}''',"parcel")

    cards="".join(f'<article class="card"><small>{esc(i["kind"]).upper()}</small><h2><a href="/newsroom/{esc(i["slug"])}/">{esc(i["title"])}</a></h2><p>{esc(i["description"])}</p></article>' for i in items)
    index_body=f'''<span class="badge">BRIDGEPOINT GROWTH NEWSROOM</span><h1>What BridgePoint is building—updated from the live system.</h1>
<p class="lead">Milestones, founder story, investor callouts, roof progress and live storm intelligence. Every page routes back to the current map and account flow.</p>
<div class="metrics"><div class="metric"><b>{num(canonical)}</b><span>canonical properties</span></div><div class="metric"><b>{num(buildings)}</b><span>map-ready buildings</span></div><div class="metric"><b>{len(hazards)}</b><span>active hazard records used for live stories</span></div></div>
<div class="grid">{cards}</div>{actions("newsroom_index",vertical="OTHER")}'''
    write("index.html",page("BridgePoint Intelligence Live Newsroom","Live BridgePoint milestones, founder story, investor callouts, roof progress and storm intelligence.",index_body,f"{ORIGIN}/newsroom/"))

    urls=[f"{ORIGIN}/newsroom/"]+[i["url"] for i in items]
    sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{esc(u)}</loc><lastmod>{generated[:10]}</lastmod></url>' for u in urls)+'</urlset>'
    write("sitemap.xml",sitemap)
    rss_items="".join(f'<item><title>{esc(i["title"])}</title><link>{esc(i["url"])}</link><guid>{esc(i["url"])}</guid><description>{esc(i["description"])}</description></item>' for i in items[:30])
    write("feed.xml",f'<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>BridgePoint Intelligence Live Newsroom</title><link>{ORIGIN}/newsroom/</link><description>Live BridgePoint product and storm intelligence updates.</description>{rss_items}</channel></rss>')
    manifest={"version":5100,"generated_at":generated,"canonical_properties":canonical,"address_records":addresses,"map_ready_buildings":buildings,"active_hazard_records":len(hazards),"pages":items}
    write("manifest.json",json.dumps(manifest,indent=2))
    share=[
      f"BridgePoint just crossed {canonical/1_000_000:.1f}M canonical U.S. property records. The map is live: {ORIGIN}/?utm_source=share_copy&utm_medium=organic&utm_campaign=canonical",
      f"Solo builder. Started on a phone. Roughly five months later: {canonical/1_000_000:.1f}M canonical property records feeding a live 3D property-intelligence map. {ORIGIN}/newsroom/solo-builder-proptech/",
      f"Investors in proptech/geospatial/insurtech: skip the pitch deck first. Inspect the live product. {ORIGIN}/newsroom/investor-live-product-callout/",
      f"The same spatial backend is becoming a game. BridgePoint Horizon turns streamed terrain, roads, parcels and buildings into a playable survival world. Early access: {ORIGIN}/app/horizon/early-access.html",
    ]
    if hazards:
        share.append(f"Live storm intelligence is active now: {len(hazards)} source-labelled hazard records are flowing into BridgePoint. {ORIGIN}/newsroom/live-storm-intelligence/")
    write("share-copy.json",json.dumps({"generated_at":generated,"posts":share},indent=2))
    print(json.dumps({"complete":True,"version":5100,"pages":len(items)+1,"hazards":len(hazards),"canonical":canonical}))

if __name__=="__main__":
    main()
