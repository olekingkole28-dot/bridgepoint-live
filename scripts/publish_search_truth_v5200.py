#!/usr/bin/env python3
from __future__ import annotations
import html, json, re, urllib.request
from pathlib import Path
from xml.sax.saxutils import escape as xesc

ORIGIN="https://bridgepointintelligence.online"
SB="https://xdfsjztwgsbmabshzsjw.supabase.co"
KEY="sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25"
OUT=Path("search")

INTEL_TOPICS=[
("proptech-property-intelligence","PropTech property intelligence platform","PropTech teams use BridgePoint to connect property identity, parcel context, buildings, roofs, hazards, provenance and operational workflows instead of stitching together disconnected property-data tools.","PropTech, property technology, property intelligence platform, real estate technology"),
("insurtech-property-intelligence","InsurTech property and claims intelligence","BridgePoint combines source-backed property, building, roof and hazard context for insurance-adjacent research, claims workflows and explainable investigation prioritization.","InsurTech, insurance technology, claims intelligence, property risk intelligence"),
("geospatial-property-intelligence","Geospatial property intelligence","BridgePoint resolves property identity into a spatial system with parcel geometry, building footprints, 3D structures, terrain, transport and source-labelled hazards.","geospatial intelligence, GIS property data, spatial intelligence, property maps"),
("3d-property-maps-digital-twin","3D property maps and digital-twin workflows","BridgePoint is building a property-centered 3D spatial world from public-source terrain, buildings, building parts, parcel geometry and source-backed structural context.","3D property maps, digital twin, 3D GIS, building intelligence"),
("parcel-boundaries-property-identity","Parcel boundaries and canonical property identity","BridgePoint separates canonical property/parcel identity from materialized parcel-boundary polygons and property-to-boundary links so coverage claims stay measurable and auditable.","parcel boundaries, parcel data, cadastral data, property identity, parcel matching"),
("address-normalization-property-matching","Address normalization and property matching","BridgePoint normalizes address records and links them to canonical property identities so downstream maps, claims, workflows and signals resolve to the correct property.","address normalization, property matching, address matching, property data quality"),
("storm-property-intelligence","Storm and weather property intelligence","BridgePoint overlays source-labelled storm, weather and disaster context on property and building intelligence to prioritize investigation without treating exposure as proof of damage.","storm intelligence, hail map, wind map, tornado map, hurricane property intelligence, flood intelligence"),
("insurance-claims-intelligence","Insurance claims and evidence intelligence","BridgePoint organizes property identity, weather context, public-source evidence, timelines and provenance for claims-oriented workflows while preserving uncertainty and source limitations.","claims intelligence, insurance claims technology, claims evidence, property claim timeline"),
("roofing-property-intelligence","Roofing property intelligence","BridgePoint combines property identity, buildings, roof geometry, source-backed roof attributes and storm context for roofing territory research and pre-visit qualification.","roofing software, roof intelligence, roofing leads, roofing property data"),
("roof-data-intelligence","Roof data and LiDAR roof intelligence","BridgePoint maintains a nationwide roof-shell layer and separately tracks source-backed roof material, pitch, direction, height, shape and LiDAR-refined roof geometry.","roof data, LiDAR roof data, roof pitch data, roof material data, roof geometry"),
("restoration-mitigation-intelligence","Restoration and mitigation property intelligence","BridgePoint connects property identity, structures, hazards and source provenance for restoration and mitigation teams researching where investigation may be warranted.","restoration software, mitigation intelligence, storm restoration, property damage research"),
("public-adjuster-intelligence","Public-adjuster property intelligence","BridgePoint gives public-adjusting workflows property identity, parcel/building context, weather exposure and source-labelled evidence in one spatial system.","public adjuster software, claims evidence, property intelligence for adjusters"),
("solar-roof-property-intelligence","Solar roof and property intelligence","BridgePoint helps solar teams research property identity, building and source-backed roof context before field verification or engineering review.","solar property data, solar roof data, solar GIS, rooftop solar intelligence"),
("real-estate-investor-intelligence","Real-estate investor property intelligence","BridgePoint combines property identity, parcel and building context, hazards and spatial research for acquisition, portfolio and due-diligence workflows.","real estate investor software, property due diligence, PropTech investing, property acquisition intelligence"),
("property-management-intelligence","Property management and portfolio intelligence","BridgePoint centralizes spatial property, building, hazard and workflow context for operators managing distributed property portfolios.","property management intelligence, portfolio property data, facilities intelligence"),
("climate-physical-risk-property","Climate and physical-risk property intelligence","BridgePoint attaches source-labelled weather, disaster and environmental context to property identities for research and prioritization without converting exposure into unsupported damage claims.","climate risk, physical risk, property risk data, climate tech, catastrophe intelligence"),
("property-data-api-infrastructure","Property-data API and data infrastructure","BridgePoint's underlying architecture focuses on canonical property identity, normalization, matching, provenance, refresh, spatial indexing and controlled downstream access.","property data API, property data infrastructure, geospatial API, parcel API, PropTech API"),
("nationwide-property-data","Nationwide U.S. property intelligence","BridgePoint tracks canonical property/parcel identities across U.S. jurisdictions and publishes jurisdiction-specific discovery pages with separate measures for boundaries, addresses, buildings and roofs.","nationwide property data, US parcel data, nationwide parcel database, property intelligence by state"),
("investor-emerging-b2b-proptech","Emerging B2B PropTech and investor research","BridgePoint is an emerging B2B property-intelligence platform combining national spatial data infrastructure, live hazards, 3D property context and workflow software.","PropTech startup, emerging B2B, InsurTech startup, geospatial startup, property data startup, investor PropTech"),
("solo-founder-geospatial-startup","Solo-founder geospatial and PropTech build","BridgePoint's public newsroom documents the product, data infrastructure and founder build so investors, operators and researchers can inspect live work instead of relying only on a pitch deck.","solo founder startup, geospatial founder, PropTech founder, startup building in public"),
("building-footprints-structures","Building footprints, structures and building parts","BridgePoint uses map-ready buildings and building parts as part of a property-centered spatial system supporting 2D/3D structure context and downstream roof/interior workflows.","building footprints, building data, 3D buildings, building parts, structure intelligence"),
]
HORIZON_TOPICS=[
("bridgepoint-horizon-real-world-game","BridgePoint Horizon real-world spatial game","BridgePoint Horizon turns BridgePoint's spatial foundation—terrain, roads, parcels and buildings—into a playable survival and combat world.","BridgePoint Horizon, real world map game, geospatial game, spatial game, 3D map game"),
("365-day-persistent-survival","365-day persistent survival game","Year One Survival is Horizon's planned 365-day persistent survival mode with three lives, escalating infected pressure and a late-game zombie-wall endgame.","365 day survival game, persistent survival game, year long game, Year One Survival"),
("zombie-apocalypse-spatial-game","Zombie apocalypse real-world map game","Horizon overlays infected, fictional interiors, traversal, vehicles and combat on a real-world spatial foundation while keeping the game world separate from BridgePoint's B2B product.","zombie survival game, zombie apocalypse game, real world zombie game, spatial survival"),
("extraction-raid-game","Raid and extraction game mode","Horizon includes a Raid / Extraction mode built around squads, infected objectives and extraction pressure on streamed spatial maps.","extraction game, raid game, outbreak extraction, squad survival game"),
("team-deathmatch-spatial-maps","6v6 team deathmatch on spatial maps","Horizon includes 6v6 Team Deathmatch with fast respawn, killcams, loadouts and map selection across spatially varied environments.","team deathmatch game, 6v6 shooter, spatial shooter, real world map shooter"),
("island-last-stand","Island Last Stand survival combat","Horizon includes an eight-player solo Island Last Stand mode designed around individual survival combat on specialized island cells.","last stand game, island survival game, battle survival"),
]

def rpc(name,payload=None):
    req=urllib.request.Request(SB+"/rest/v1/rpc/"+name,data=json.dumps(payload or {}).encode(),method="POST",
      headers={"apikey":KEY,"Content-Type":"application/json","Accept":"application/json","User-Agent":"BridgePoint-Search-Truth/5200"})
    with urllib.request.urlopen(req,timeout=25) as r: data=json.loads(r.read().decode())
    if isinstance(data,list) and len(data)==1 and isinstance(data[0],dict): data=data[0]
    return data

def esc(x): return html.escape(str(x),quote=True)
def slugify(x): return re.sub(r"[^a-z0-9]+","-",x.lower()).strip("-")

def page(slug,title,description,keywords,product,facts,demand):
    m=facts["metrics"]; canon=f"{ORIGIN}/search/{slug}/"
    target=f"{ORIGIN}/app/horizon/" if product=="HORIZON" else f"{ORIGIN}/app/"
    cta="OPEN BRIDGEPOINT HORIZON" if product=="HORIZON" else "OPEN BRIDGEPOINT INTELLIGENCE"
    demand_block=""
    if product=="HORIZON" and "365" in slug:
        demand_block=f'''<section class="fact"><b>{int(demand.get("unique_requests") or 0):,}</b><span>current public requests for the 365-day Year One world</span><p>This is an interest counter, not verified active players.</p><a href="/app/horizon/#yearOneDemandTitle">Request the 365-day world</a></section>'''
    metrics=f'''<div class="metrics"><div><b>{int(m["canonical_property_records"]):,}</b><span>canonical property/parcel identity records</span></div><div><b>{int(m["materialized_boundary_estimate"]):,}</b><span>materialized boundary estimate</span></div><div><b>{int(m["normalized_address_records"]):,}</b><span>normalized/public addresses</span></div><div><b>{int(m["map_ready_buildings"]):,}</b><span>map-ready buildings</span></div></div>''' if product=="INTELLIGENCE" else ""
    schema={"@context":"https://schema.org","@type":"WebPage","name":title,"url":canon,"description":description,
      "about":{"@type":"SoftwareApplication" if product=="INTELLIGENCE" else "VideoGame","name":"BridgePoint Intelligence" if product=="INTELLIGENCE" else "BridgePoint Horizon","url":target},
      "keywords":keywords}
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)} | {"BridgePoint Intelligence" if product=="INTELLIGENCE" else "BridgePoint Horizon"}</title>
<meta name="description" content="{esc(description)}"><meta name="keywords" content="{esc(keywords)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="canonical" href="{canon}"><link rel="stylesheet" href="/language-selector-v5200.css"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{canon}">
<script type="application/ld+json">{json.dumps(schema,separators=(",",":"))}</script>
<style>*{{box-sizing:border-box}}body{{margin:0;background:linear-gradient(145deg,#06101b,#0b1b26);color:#f3f9fd;font:16px/1.6 Arial,sans-serif}}main{{max-width:980px;margin:auto;padding:42px 20px 80px}}a{{color:#70d9ff}}.brand{{font-weight:950}}h1{{font-size:clamp(2.2rem,7vw,4.7rem);line-height:1;letter-spacing:-.045em;margin:32px 0 14px}}.lead{{font-size:1.12rem;color:#aac0ce;max-width:820px}}.metrics{{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:25px 0}}.metrics div,.fact{{border:1px solid #27495d;background:#0c1b28;border-radius:14px;padding:16px}}.metrics b,.fact b{{display:block;font-size:1.35rem}}.metrics span,.fact span{{color:#9db7c6}}.note{{margin:24px 0;padding:14px;border-left:4px solid #5ee0ff;background:#092131;color:#c7dae4}}.cta{{display:inline-block;margin-top:16px;background:#168df0;color:#fff;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:900}}</style></head>
<body><main><div class="brand"><a href="{"/app/horizon/" if product=="HORIZON" else "/"}">{"BRIDGEPOINT HORIZON" if product=="HORIZON" else "BRIDGEPOINT INTELLIGENCE"}</a></div><h1>{esc(title)}</h1><p class="lead">{esc(description)}</p>{metrics}{demand_block}
<div class="note">BridgePoint keeps canonical property identity, boundary polygons, addresses, buildings, roofs and hazard evidence as separate measurable layers. Weather exposure is context, not proof of physical damage or an insurance outcome.</div>
<a class="cta" href="{target}?utm_source=search_atlas&utm_medium=organic&utm_campaign={slug}">{cta}</a>
</main><script defer src="/acquisition_tracker.js?v=5001"></script><script defer src="/language-selector-v5200.js"></script></body></html>'''

def main():
    facts=rpc("bridgepoint_public_discovery_facts_v5200")
    demand=rpc("bridgepoint_horizon_year_one_demand_v5200")
    OUT.mkdir(parents=True,exist_ok=True)
    topics=[]
    urls=[]
    for product,rows in (("INTELLIGENCE",INTEL_TOPICS),("HORIZON",HORIZON_TOPICS)):
        for slug,title,description,keywords in rows:
            d=OUT/slug;d.mkdir(parents=True,exist_ok=True)
            (d/"index.html").write_text(page(slug,title,description,keywords,product,facts,demand),encoding="utf-8")
            u=f"{ORIGIN}/search/{slug}/";urls.append(u);topics.append({"slug":slug,"title":title,"product":product,"url":u,"keywords":keywords})
    m=facts["metrics"]
    index_schema={"@context":"https://schema.org","@type":"CollectionPage","name":"BridgePoint Search and AI Discovery Atlas","url":f"{ORIGIN}/search/","numberOfItems":len(topics)}
    cards="".join(f'<article><b>{esc(t["product"])}</b><h2><a href="/search/{t["slug"]}/">{esc(t["title"])}</a></h2><p>{esc(t["keywords"])}</p></article>' for t in topics)
    (OUT/"index.html").write_text(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BridgePoint Search & AI Discovery Atlas</title><meta name="description" content="Canonical BridgePoint topic directory for property intelligence, PropTech, InsurTech, geospatial data, storms, claims, 3D maps and BridgePoint Horizon."><meta name="robots" content="index,follow,max-snippet:-1"><link rel="canonical" href="{ORIGIN}/search/"><link rel="stylesheet" href="/language-selector-v5200.css"><script type="application/ld+json">{json.dumps(index_schema,separators=(",",":"))}</script><style>body{{margin:0;background:#06111b;color:#eff8fd;font:16px/1.5 Arial,sans-serif}}main{{max-width:1100px;margin:auto;padding:40px 20px}}h1{{font-size:clamp(2.2rem,6vw,4.5rem)}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}}article{{padding:16px;border:1px solid #28485c;border-radius:14px;background:#0b1b28}}a{{color:#70d9ff}}</style></head><body><main><h1>BridgePoint Search & AI Discovery Atlas</h1><p>Canonical topic pages for BridgePoint Intelligence and BridgePoint Horizon. Current BridgePoint Intelligence index: <strong>{int(m["canonical_property_records"]):,}</strong> canonical property/parcel identities.</p><div class="grid">{cards}</div></main><script defer src="/language-selector-v5200.js"></script></body></html>''',encoding="utf-8")
    urls.insert(0,f"{ORIGIN}/search/")
    facts_out=dict(facts);facts_out["horizon_year_one_demand"]=demand
    Path("discovery-facts.json").write_text(json.dumps(facts_out,indent=2)+"\n",encoding="utf-8")
    ai={"entity":"BridgePoint Intelligence","canonical":ORIGIN+"/","entity_id":ORIGIN+"/#organization","founder":{"name":"Kole Johnson","canonical":ORIGIN+"/founder/"},"public_evidence":[{"type":"PodcastEpisode","name":"Boroughs & Burbs Ep.240 — Beyond the Listing","url":"https://www.podscan.fm/podcasts/boroughs-amp-burbs-the-national-real-estate-conversation-2/episodes/beyond-the-listing-how-ai-and-property-intelligence-are-changing-the-way-we-evaluate-real-estate-boroughs-and-burbs-ep240-1"}],"products":[
      {"name":"BridgePoint Intelligence","type":"B2B property/geospatial intelligence","url":ORIGIN+"/app/","topics":[t for t in topics if t["product"]=="INTELLIGENCE"]},
      {"name":"BridgePoint Horizon","type":"real-world spatial survival/combat game","url":ORIGIN+"/app/horizon/","early_access":ORIGIN+"/app/horizon/early-access.html","topics":[t for t in topics if t["product"]=="HORIZON"]}],
      "live_facts":facts_out,"representation_rules":["Canonical property/parcel identities are not the same as materialized boundary polygons.","Weather exposure is not proof of damage.","Roof shell coverage is not source-backed material/pitch/shape coverage."]}
    Path("ai-index.json").write_text(json.dumps(ai,indent=2)+"\n",encoding="utf-8")
    graph={"@context":"https://schema.org","@graph":[
      {"@type":"Organization","@id":ORIGIN+"/#organization","name":"BridgePoint Intelligence","alternateName":"BridgePoint Intelligence (bridgepointintelligence.online)","url":ORIGIN+"/","founder":{"@type":"Person","@id":ORIGIN+"/founder/#kole-johnson","name":"Kole Johnson","url":ORIGIN+"/founder/"},"disambiguatingDescription":"U.S. property, parcel, building, roof, hazard, claims and geospatial intelligence platform published at bridgepointintelligence.online.","subjectOf":{"@type":"PodcastEpisode","name":"Beyond the Listing: How AI and Property Intelligence Are Changing the Way We Evaluate Real Estate | Boroughs and Burbs Ep.240","url":"https://www.podscan.fm/podcasts/boroughs-amp-burbs-the-national-real-estate-conversation-2/episodes/beyond-the-listing-how-ai-and-property-intelligence-are-changing-the-way-we-evaluate-real-estate-boroughs-and-burbs-ep240-1"}},
      {"@type":"SoftwareApplication","@id":ORIGIN+"/#intelligence","name":"BridgePoint Intelligence","applicationCategory":"BusinessApplication","url":ORIGIN+"/app/","description":"Property, parcel, building, roof, hazard, claims and geospatial intelligence platform."},
      {"@type":"Dataset","@id":ORIGIN+"/#property-index","name":"BridgePoint canonical property/parcel identity index","description":"National canonical property/parcel identity index with separately measured boundaries, addresses and buildings.","variableMeasured":[
        {"@type":"PropertyValue","name":"Canonical property/parcel identity records","value":m["canonical_property_records"]},
        {"@type":"PropertyValue","name":"Materialized boundary estimate","value":m["materialized_boundary_estimate"]},
        {"@type":"PropertyValue","name":"Normalized/public address records","value":m["normalized_address_records"]},
        {"@type":"PropertyValue","name":"Map-ready buildings","value":m["map_ready_buildings"]}]},
      {"@type":"VideoGame","@id":ORIGIN+"/#horizon","name":"BridgePoint Horizon","url":ORIGIN+"/app/horizon/","genre":["Survival","Action","Shooter","Extraction","Persistent World"],"description":"Real-world spatial survival and combat game using BridgePoint terrain, roads, parcels and buildings as a spatial foundation."}
    ]}
    Path("bridgepoint-knowledge.jsonld").write_text(json.dumps(graph,indent=2)+"\n",encoding="utf-8")
    lines=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls+[f"{ORIGIN}/discovery-facts.json",f"{ORIGIN}/ai-index.json",f"{ORIGIN}/bridgepoint-knowledge.jsonld",f"{ORIGIN}/app/horizon/",f"{ORIGIN}/app/horizon/early-access.html"]:
        lines.append(f'  <url><loc>{xesc(u)}</loc><changefreq>daily</changefreq><priority>0.85</priority></url>')
    lines.append('</urlset>')
    Path("search-sitemap.xml").write_text("\n".join(lines)+"\n",encoding="utf-8")
    print(json.dumps({"complete":True,"topics":len(topics),"canonical_properties":m["canonical_property_records"],"year_one_requests":demand.get("unique_requests",0)}))
if __name__=="__main__": main()
