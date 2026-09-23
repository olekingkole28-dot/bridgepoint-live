#!/usr/bin/env python3
"""BridgePoint Master Parcel Boundary Atlas v5631.
Supabase-independent local parcel atlas built from rescued state Parquet.
Reads C:\\BridgePointData\\snapshots and builds a resumable SQLite/RTree index.
"""
from __future__ import annotations
import argparse, base64, json, math, os, sqlite3, struct, threading, time, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

VERSION=5631
DATA=Path(os.environ.get("BRIDGEPOINT_DATA_ROOT",r"C:\BridgePointData"))
SNAP=DATA/"snapshots"
ATLAS=DATA/"atlas"
DB=ATLAS/"parcel_atlas.sqlite"
HOST="127.0.0.1"; PORT=8766
MAX_FEATURES=7000
STATES="AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY AS GU MP PR VI".split()

def db():
    ATLAS.mkdir(parents=True,exist_ok=True)
    c=sqlite3.connect(DB,timeout=30)
    c.execute("pragma journal_mode=WAL"); c.execute("pragma synchronous=NORMAL")
    c.execute("""create table if not exists files(
      path text primary key,size integer,mtime real,indexed_at text,row_count integer)""")
    c.execute("""create table if not exists parcels(
      id integer primary key,state_code text,property_id text,county text,municipality text,
      parcel_number text,srid integer,wkb blob,minx real,miny real,maxx real,maxy real)""")
    c.execute("create virtual table if not exists parcel_rtree using rtree(id,minx,maxx,miny,maxy)")
    c.execute("create index if not exists idx_parcels_state on parcels(state_code)")
    c.commit(); return c

def _dims_and_type(t):
    z=bool(t&0x80000000); m=bool(t&0x40000000); srid=bool(t&0x20000000)
    base=t&0x0fffffff
    dims=2+(1 if z else 0)+(1 if m else 0)
    if base>=3000: base-=3000; dims=4
    elif base>=2000: base-=2000; dims=3
    elif base>=1000: base-=1000; dims=3
    return base,dims,srid

def parse_wkb(buf,off=0):
    if not buf or off>=len(buf): raise ValueError("empty wkb")
    endian="<" if buf[off]==1 else ">"; off+=1
    t=struct.unpack_from(endian+"I",buf,off)[0]; off+=4
    base,dims,has_srid=_dims_and_type(t)
    srid=None
    if has_srid: srid=struct.unpack_from(endian+"I",buf,off)[0]; off+=4
    def point():
        nonlocal off
        vals=struct.unpack_from(endian+("d"*dims),buf,off); off+=8*dims
        return [vals[0],vals[1]]
    if base==1:
        p=point(); return {"type":"Point","coordinates":p},off,srid
    if base==2:
        n=struct.unpack_from(endian+"I",buf,off)[0]; off+=4
        pts=[point() for _ in range(n)]
        return {"type":"LineString","coordinates":pts},off,srid
    if base==3:
        nr=struct.unpack_from(endian+"I",buf,off)[0]; off+=4; rings=[]
        for _ in range(nr):
            n=struct.unpack_from(endian+"I",buf,off)[0]; off+=4
            rings.append([point() for _ in range(n)])
        return {"type":"Polygon","coordinates":rings},off,srid
    if base in (4,5,6,7):
        n=struct.unpack_from(endian+"I",buf,off)[0]; off+=4; geoms=[]
        for _ in range(n):
            g,off,_=parse_wkb(buf,off); geoms.append(g)
        names={4:"MultiPoint",5:"MultiLineString",6:"MultiPolygon",7:"GeometryCollection"}
        if base==7: return {"type":"GeometryCollection","geometries":geoms},off,srid
        coords=[g.get("coordinates") for g in geoms]
        return {"type":names[base],"coordinates":coords},off,srid
    raise ValueError("unsupported geometry type "+str(base))

def all_points(g):
    if g.get("type")=="GeometryCollection":
        for x in g.get("geometries",[]): yield from all_points(x)
        return
    def walk(x):
        if isinstance(x,list) and len(x)>=2 and all(isinstance(v,(int,float)) for v in x[:2]):
            yield x
        elif isinstance(x,list):
            for y in x: yield from walk(y)
    yield from walk(g.get("coordinates",[]))

def transform_3857(g):
    def conv(p):
        x,y=p[0],p[1]; lon=x*180.0/20037508.34
        lat=math.degrees(2*math.atan(math.exp(y/6378137.0))-math.pi/2)
        return [lon,lat]
    def walk(x):
        if isinstance(x,list) and len(x)>=2 and all(isinstance(v,(int,float)) for v in x[:2]): return conv(x)
        if isinstance(x,list): return [walk(y) for y in x]
        return x
    if g.get("type")=="GeometryCollection":
        g["geometries"]=[transform_3857(x) for x in g["geometries"]]
    else: g["coordinates"]=walk(g["coordinates"])
    return g

def geom_and_bbox(raw,srid_hint=None):
    b=base64.b64decode(raw) if isinstance(raw,str) else bytes(raw)
    g,_,embedded=parse_wkb(b)
    srid=int(srid_hint or embedded or 4326)
    if srid==3857: g=transform_3857(g); srid=4326
    pts=list(all_points(g))
    if not pts: raise ValueError("no coordinates")
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    return b,g,(min(xs),min(ys),max(xs),max(ys)),srid

def safe_parquet_files():
    if not SNAP.exists(): return []
    out=[]
    now=time.time()
    for p in SNAP.glob("state_code=*/parcel_geometry/*.parquet"):
        try:
            # Never read a part that may still be settling.
            if now-p.stat().st_mtime>120: out.append(p)
        except OSError: pass
    return sorted(out)

def index_file(p):
    import pyarrow.parquet as pq
    stat=p.stat()
    c=db()
    row=c.execute("select size,mtime from files where path=?",(str(p),)).fetchone()
    if row and int(row[0])==stat.st_size and float(row[1])==stat.st_mtime:
        c.close(); return 0
    table=pq.read_table(p,columns=[
      "property_id","state_code","county","municipality","parcel_number",
      "parcel_geom_ewkb_base64","parcel_geom_srid"])
    inserted=0
    cols=table.to_pydict(); n=table.num_rows
    c.execute("begin")
    try:
        for i in range(n):
            raw=cols["parcel_geom_ewkb_base64"][i]
            if not raw: continue
            try:
                wkb,_,bb,srid=geom_and_bbox(raw,cols["parcel_geom_srid"][i])
            except Exception: continue
            cur=c.execute("""insert into parcels(state_code,property_id,county,municipality,parcel_number,srid,wkb,minx,miny,maxx,maxy)
              values(?,?,?,?,?,?,?,?,?,?,?)""",(
                str(cols["state_code"][i] or ""),str(cols["property_id"][i] or ""),
                str(cols["county"][i] or ""),str(cols["municipality"][i] or ""),
                str(cols["parcel_number"][i] or ""),srid,sqlite3.Binary(wkb),*bb))
            rid=cur.lastrowid
            c.execute("insert into parcel_rtree values(?,?,?,?,?)",(rid,bb[0],bb[2],bb[1],bb[3]))
            inserted+=1
        c.execute("insert or replace into files(path,size,mtime,indexed_at,row_count) values(?,?,?,?,?)",
                  (str(p),stat.st_size,stat.st_mtime,time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),inserted))
        c.commit()
    except Exception:
        c.rollback(); raise
    finally: c.close()
    return inserted

def index_loop():
    while True:
        try:
            for p in safe_parquet_files():
                index_file(p); time.sleep(.05)
        except Exception as e:
            (ATLAS/"index-errors.log").open("a",encoding="utf-8").write(f"{time.time()} {type(e).__name__}: {e}\n")
        time.sleep(30)

def coverage():
    rows=[]
    for s in STATES:
        d=SNAP/f"state_code={s}"
        files=list((d/"parcel_geometry").glob("*.parquet")) if (d/"parcel_geometry").exists() else []
        rows.append({"state":s,"started":d.exists(),"parcel_files":len(files),
          "core":(d/"EMERGENCY_CORE_COMPLETE.json").exists(),
          "complete":(d/"COMPLETE.json").exists()})
    return rows

def query_parcels(w,s,e,n,limit=MAX_FEATURES):
    c=db()
    rows=c.execute("""select p.id,p.state_code,p.property_id,p.county,p.municipality,p.parcel_number,p.srid,p.wkb
      from parcel_rtree r join parcels p on p.id=r.id
      where r.maxx>=? and r.minx<=? and r.maxy>=? and r.miny<=?
      order by p.id limit ?""",(w,e,s,n,min(max(limit,1),MAX_FEATURES))).fetchall()
    c.close(); feats=[]
    for row in rows:
        try:
            g,_,_=parse_wkb(bytes(row[7]))
            if int(row[6] or 4326)==3857:g=transform_3857(g)
            feats.append({"type":"Feature","id":row[0],"geometry":g,"properties":{
              "state_code":row[1],"property_id":row[2],"county":row[3],
              "municipality":row[4],"parcel_number":row[5]}})
        except Exception: pass
    return feats

def status():
    c=db()
    indexed=c.execute("select count(*) from parcels").fetchone()[0]
    files=c.execute("select count(*) from files").fetchone()[0]; c.close()
    cov=coverage()
    return {"version":VERSION,"data_root":str(DATA),"indexed_parcels":indexed,"indexed_files":files,
      "states_started":sum(x["started"] for x in cov),"states_core":sum(x["core"] or x["complete"] for x in cov),
      "states_complete":sum(x["complete"] for x in cov),"coverage":cov}

HTML=r"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BridgePoint Master Parcel Boundary Atlas</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0;background:#02080d;color:#eaffff;font-family:system-ui}#panel{position:absolute;z-index:1000;left:12px;top:12px;width:min(390px,calc(100vw - 24px));background:#06131be8;border:1px solid #26dce955;border-radius:14px;padding:12px;box-shadow:0 12px 40px #0009}b{font-size:15px}.small{font-size:10px;color:#9dc0ca;line-height:1.4}.stats{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.stats span{padding:4px 7px;border:1px solid #ffffff22;border-radius:999px;font-size:10px}.legend{font-size:10px;color:#73ffff}.btn{background:#0c2832;color:#fff;border:1px solid #2ce8f766;border-radius:8px;padding:7px 9px;margin:4px 4px 0 0;cursor:pointer}#states{max-height:120px;overflow:auto;font-size:9px;margin-top:7px}.s{display:inline-block;width:30px;padding:2px;margin:1px;text-align:center;border-radius:4px;background:#26333a}.full{background:#14683c}.core{background:#685b14}.partial{background:#304a64}.leaflet-overlay-pane path{vector-effect:non-scaling-stroke}</style></head>
<body><div id="map"></div><div id="panel"><b>BridgePoint Master Parcel Boundary Atlas</b>
<div class="small">Supabase-independent. Geometry comes from rescued local Parquet. Existing parcel lines remain on-screen while the next viewport loads.</div>
<div class="stats" id="stats"></div><div class="legend">Green = full state rescue · gold = core rescue · blue = partial. Exact parcel lines appear from local index and refine as you zoom.</div>
<button class="btn" onclick="reloadNow()">Refresh local lines</button><button class="btn" onclick="printSheet()">Open printable SVG sheet</button>
<div id="states"></div></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
const map=L.map('map',{minZoom:3,maxZoom:20,preferCanvas:true}).setView([39.3,-98.5],4);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'Base map © OpenStreetMap contributors'}).addTo(map);
const persistent=L.geoJSON([], {style:{color:'#73ffff',weight:1,opacity:.92,fill:false},onEachFeature:(f,l)=>l.bindPopup((f.properties?.state_code||'')+' '+(f.properties?.parcel_number||''))}).addTo(map);
const seen=new Set(); let busy=false;
async function boot(){const r=await fetch('/api/status',{cache:'no-store'});const s=await r.json();
 document.getElementById('stats').innerHTML='<span>'+s.indexed_parcels.toLocaleString()+' parcels indexed</span><span>'+s.states_started+'/56 started</span><span>'+s.states_core+'/56 core-safe</span><span>'+s.states_complete+'/56 full</span>';
 document.getElementById('states').innerHTML=s.coverage.map(x=>'<span class="s '+(x.complete?'full':x.core?'core':x.started?'partial':'')+'" title="'+x.parcel_files+' parcel files">'+x.state+'</span>').join('');
}
async function load(){if(busy||map.getZoom()<7)return;busy=true;try{const b=map.getBounds();const u='/api/parcels?w='+b.getWest()+'&s='+b.getSouth()+'&e='+b.getEast()+'&n='+b.getNorth()+'&limit=7000';const j=await (await fetch(u)).json();for(const f of j.features||[]){if(seen.has(f.id))continue;seen.add(f.id);persistent.addData(f)}}finally{busy=false}}
function reloadNow(){boot();load()} function printSheet(){const b=map.getBounds();window.open('/print.svg?w='+b.getWest()+'&s='+b.getSouth()+'&e='+b.getEast()+'&n='+b.getNorth()+'&width=12000&height=8000','_blank')}
map.on('moveend zoomend',load);boot();load();setInterval(boot,30000);
</script></body></html>"""

def svg_sheet(w,s,e,n,width=12000,height=8000):
    feats=query_parcels(w,s,e,n,20000)
    sx=width/max(e-w,1e-9); sy=height/max(n-s,1e-9)
    paths=[]
    def path_coords(coords):
        if not coords:return ""
        return "M"+" ".join(f"{(p[0]-w)*sx:.1f},{height-(p[1]-s)*sy:.1f}" for p in coords)+" Z"
    for f in feats:
        g=f["geometry"]; typ=g.get("type"); c=g.get("coordinates",[])
        if typ=="Polygon":
            paths.extend(path_coords(r) for r in c)
        elif typ=="MultiPolygon":
            for poly in c: paths.extend(path_coords(r) for r in poly)
    body="".join(f'<path d="{d}" fill="none" stroke="#111" stroke-width="0.7"/>' for d in paths if d)
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}"><rect width="100%" height="100%" fill="white"/>{body}</svg>'

class H(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def send_bytes(self,b,ctype="application/json",code=200):
        if isinstance(b,str):b=b.encode()
        self.send_response(code);self.send_header("Content-Type",ctype);self.send_header("Content-Length",str(len(b)));self.send_header("Cache-Control","no-store");self.end_headers();self.wfile.write(b)
    def do_GET(self):
        u=urlparse(self.path); q=parse_qs(u.query)
        try:
            if u.path in ("/","/index.html"): return self.send_bytes(HTML,"text/html; charset=utf-8")
            if u.path=="/api/status": return self.send_bytes(json.dumps(status()))
            if u.path=="/api/parcels":
                w=float(q["w"][0]);s=float(q["s"][0]);e=float(q["e"][0]);n=float(q["n"][0]); lim=int(q.get("limit",["7000"])[0])
                fs=query_parcels(w,s,e,n,lim)
                return self.send_bytes(json.dumps({"type":"FeatureCollection","features":fs,"returned":len(fs),"version":VERSION}))
            if u.path=="/print.svg":
                w=float(q["w"][0]);s=float(q["s"][0]);e=float(q["e"][0]);n=float(q["n"][0])
                width=min(int(q.get("width",["12000"])[0]),30000);height=min(int(q.get("height",["8000"])[0]),30000)
                return self.send_bytes(svg_sheet(w,s,e,n,width,height),"image/svg+xml")
            return self.send_bytes('{"error":"not found"}',code=404)
        except Exception as e:
            return self.send_bytes(json.dumps({"error":str(e)}),code=500)

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--port",type=int,default=PORT);ap.add_argument("--no-browser",action="store_true");a=ap.parse_args()
    db()
    threading.Thread(target=index_loop,daemon=True,name="bp-atlas-indexer").start()
    srv=ThreadingHTTPServer((HOST,a.port),H); url=f"http://{HOST}:{a.port}/"
    print(f"BridgePoint Master Parcel Boundary Atlas v{VERSION}"); print("Data:",DATA); print("URL:",url)
    if not a.no_browser: threading.Timer(1.0,lambda:webbrowser.open(url)).start()
    try:srv.serve_forever()
    except KeyboardInterrupt:pass
    finally:srv.server_close()
if __name__=="__main__": main()
