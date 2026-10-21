#!/usr/bin/env python3
"""Convert one license-approved USGS LAS/LAZ tile into a Gold-only Potree LOD asset."""
import argparse,json,math,os,pathlib,subprocess,time,urllib.parse
import laspy,pyproj,requests
SUPABASE_URL=os.environ.get("SUPABASE_URL","https://xdfsjztwgsbmabshzsjw.supabase.co").rstrip("/")
BROKER=SUPABASE_URL+"/functions/v1/bridgepoint-global-lidar-broker-v6025"
AUDIENCE="bridgepoint-lidar-ingest-v6025";MAX_BYTES=64*1024*1024
TOKEN={"value":None,"exp":0};ALLOWED_HOSTS={"rockyweb.usgs.gov","prd-tnm.s3.amazonaws.com","www.sciencebase.gov"}
def decode_claims(token):
 import base64
 try:
  p=token.split(".")[1];p+="="*((4-len(p)%4)%4);return json.loads(base64.urlsafe_b64decode(p.encode()))
 except Exception:return {}
def oidc():
 now=int(time.time())
 if TOKEN["value"] and TOKEN["exp"]>now+60:return TOKEN["value"]
 url=os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"];secret=os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]
 r=requests.get(url+("&" if "?" in url else "?")+"audience="+urllib.parse.quote(AUDIENCE),headers={"Authorization":"bearer "+secret},timeout=20)
 r.raise_for_status();TOKEN["value"]=r.json()["value"];TOKEN["exp"]=int(decode_claims(TOKEN["value"]).get("exp",0));return TOKEN["value"]
def broker(action,extra=None,timeout=180):
 body={"action":action,"oidc_token":oidc()};body.update(extra or {})
 r=requests.post(BROKER,json=body,headers={"content-type":"application/json"},timeout=timeout)
 if not r.ok:raise RuntimeError(f"BROKER_{action}_HTTP_{r.status_code}:{r.text[:1200]}")
 data=r.json()
 if data.get("complete") is False:raise RuntimeError(f"BROKER_{action}_FAILED:{data}")
 return data
def download(url,path,estimated):
 parsed=urllib.parse.urlparse(str(url or ""))
 if parsed.scheme!="https" or parsed.hostname not in ALLOWED_HOSTS:raise RuntimeError("SOURCE_URL_HOST_NOT_ALLOWED")
 if estimated and int(estimated)>MAX_BYTES:raise RuntimeError("SOURCE_TILE_OVER_WORKER_LIMIT")
 r=requests.get(url,stream=True,timeout=(25,90),headers={"User-Agent":"BridgePoint-LiDAR/6025"});r.raise_for_status()
 if int(r.headers.get("content-length") or 0)>MAX_BYTES:r.close();raise RuntimeError("SOURCE_TILE_OVER_WORKER_LIMIT")
 total=0
 with open(path,"wb") as out:
  for chunk in r.iter_content(1024*1024):
   if not chunk:continue
   total+=len(chunk)
   if total>MAX_BYTES:raise RuntimeError("SOURCE_TILE_OVER_WORKER_LIMIT_DURING_DOWNLOAD")
   out.write(chunk)
 if total<100000:raise RuntimeError(f"SOURCE_TILE_TOO_SMALL:{total}")
 return total
def read_header(path,job):
 with laspy.open(str(path)) as f:
  h=f.header;count=int(h.point_count);crs=h.parse_crs();mins=[float(x) for x in h.mins];maxs=[float(x) for x in h.maxs]
 if count<10000:raise RuntimeError(f"INSUFFICIENT_SOURCE_POINTS:{count}")
 if crs is None:raise RuntimeError("LAS_HEADER_HAS_NO_CRS")
 if not all(math.isfinite(x) for x in mins+maxs) or maxs[0]<=mins[0] or maxs[1]<=mins[1]:raise RuntimeError("LAS_HEADER_BOUNDS_INVALID")
 cx=(mins[0]+maxs[0])/2;cy=(mins[1]+maxs[1])/2;ground=[]
 with laspy.open(str(path)) as f:
  for chunk in f.chunk_iterator(1000000):
   try:
    mask=(chunk.classification==2)&(abs(chunk.x-cx)<100)&(abs(chunk.y-cy)<100);vals=chunk.z[mask]
    if len(vals):ground.extend(float(z) for z in vals[:max(0,50000-len(ground))])
    if len(ground)>=50000:break
   except Exception:break
 ground_z=sorted(ground)[len(ground)//2] if ground else mins[2]+(maxs[2]-mins[2])*.03
 tr=pyproj.Transformer.from_crs(crs,pyproj.CRS.from_epsg(4326),always_xy=True);ring=[]
 for x,y in [(mins[0],mins[1]),(maxs[0],mins[1]),(maxs[0],maxs[1]),(mins[0],maxs[1])]:
  lon,lat=tr.transform(x,y)
  if not(math.isfinite(lon) and math.isfinite(lat) and -180<=lon<=180 and -90<=lat<=90):raise RuntimeError("LAS_BOUNDS_WGS84_TRANSFORM_FAILED")
  ring.append([lon,lat])
 ring.append(ring[0]);lon,lat=tr.transform(cx,cy);tc=(job.get("target_center") or {}).get("coordinates") or []
 if len(tc)<2:raise RuntimeError("TARGET_CENTER_MISSING")
 from pyproj import Geod
 _,_,distance=Geod(ellps="WGS84").inv(float(tc[0]),float(tc[1]),lon,lat)
 radius=int(job.get("radius_m") or 12000);allowance=min(10000,max(2000,math.hypot(maxs[0]-mins[0],maxs[1]-mins[1])*.55))
 if distance>radius+allowance:raise RuntimeError(f"OUTSIDE_TARGET_CITY_RADIUS:{int(distance)}m>{radius+int(allowance)}m")
 return {"point_count":count,"crs":crs.to_string(),"mins":mins,"maxs":maxs,"min_z":mins[2],"max_z":maxs[2],"ground_z":ground_z,
  "center":{"type":"Point","coordinates":[lon,lat]},"bounds":{"type":"Polygon","coordinates":[ring]},"distance_to_target_m":round(distance,2)}
def output_files(outdir):
 for meta in sorted(pathlib.Path(outdir).rglob("metadata.json"),key=lambda p:len(p.parts)):
  fs=[meta.parent/"metadata.json",meta.parent/"hierarchy.bin",meta.parent/"octree.bin"]
  if all(x.is_file() and x.stat().st_size>0 for x in fs):return fs
 raise RuntimeError("POTREE_OUTPUT_FILES_MISSING")
def upload(path,local,job,worker):
 url=broker("upload_url",{"job_id":int(job["job_id"]),"worker":worker,"tile_id":job["tile_id"],"path":path},timeout=90).get("signedUrl")
 if not url:raise RuntimeError("SIGNED_UPLOAD_URL_MISSING")
 with open(local,"rb") as body:r=requests.put(url,data=body,headers={"content-type":"application/octet-stream","x-upsert":"true","cache-control":"max-age=31536000"},timeout=(30,240))
 if r.status_code not in (200,201):raise RuntimeError(f"STORAGE_PUT_{r.status_code}:{r.text[:1000]}")
 return {"path":path,"bytes":os.path.getsize(local)}
def process(job,worker,converter):
 tile=job["tile_id"];prefix=f"usgs-3dep/{tile}/";work=pathlib.Path(os.environ.get("RUNNER_TEMP","/tmp"))/("bp-lidar-"+tile)
 work.mkdir(parents=True,exist_ok=True);src=work/"source.laz";out=work/"potree";out.mkdir(exist_ok=True)
 try:
  size=download(job["source_url"],src,job.get("estimated_bytes"));info=read_header(src,job)
  run=subprocess.run([converter,str(src),"-o",str(out)],text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=75*60)
  print(run.stdout[-12000:],flush=True)
  if run.returncode:raise RuntimeError(f"POTREE_CONVERTER_EXIT_{run.returncode}")
  files=output_files(out);meta=json.loads(files[0].read_text(encoding="utf-8"));pts=meta.get("points",meta.get("numPoints"))
  if pts is not None and int(pts)<10000:raise RuntimeError("POTREE_OUTPUT_TOO_FEW_POINTS")
  uploaded=[upload(prefix+f.name,f,job,worker) for f in files]
  manifest={"version":6025,"source_key":job["source_key"],"source_provider":job["provider"],"source_dataset":job["dataset_name"],
   "source_url":job["source_url"],"source_tile_id":job["source_tile_id"],"source_format":job["source_format"],"source_bytes":size,
   "source_point_count":info["point_count"],"converter_point_count":int(pts) if pts is not None else None,"source_crs":info["crs"],
   "source_bounds":{"mins":info["mins"],"maxs":info["maxs"]},"source_ground_z":info["ground_z"],"bounds_wgs84":info["bounds"],
   "center_wgs84":info["center"],"distance_to_target_m":info["distance_to_target_m"],"output_files":uploaded,"output_metadata":meta,
   "license_code":job["license_code"],"license_url":job.get("license_url"),"attribution":job.get("source_attribution"),
   "license_verified":True,"redistribution_allowed":True,"gold_lod_only":True,"converter":"PotreeConverter 2.1.4"}
  return broker("complete",{"job_id":int(job["job_id"]),"worker":worker,"tile_id":tile,"storage_prefix":prefix,"center":info["center"],
   "bounds":info["bounds"],"source_point_count":info["point_count"],"crs":info["crs"],"min_z":info["min_z"],"max_z":info["max_z"],"manifest":manifest},timeout=120)
 finally:src.unlink(missing_ok=True)
def main():
 p=argparse.ArgumentParser();p.add_argument("--worker",type=int,default=0);p.add_argument("--converter",required=True);a=p.parse_args()
 if not 0<=a.worker<=15:raise SystemExit("worker must be 0..15")
 worker=f"gha-lidar-v6025-{a.worker}-{os.getenv('GITHUB_RUN_ID','local')}-{os.getenv('GITHUB_RUN_ATTEMPT','1')}"
 claim=broker("claim",{"worker":worker})
 if not claim.get("claimed") or not claim.get("job"):print(json.dumps({"complete":True,"worker":worker,"claimed":False,"claim":claim}),flush=True);return
 job=claim["job"];print(json.dumps({"stage":"claimed","worker":worker,"job_id":job["job_id"],"tile_id":job["tile_id"],"city":job["city_name"],"source":job["source_tile_id"],"bytes":job["estimated_bytes"],"attempt":job["attempt_count"],"license":job["license_code"]}),flush=True)
 try:
  result=process(job,worker,a.converter);print(json.dumps({"stage":"materialized","job_id":job["job_id"],"tile_id":job["tile_id"],"result":result}),flush=True)
 except Exception as exc:
  msg=f"{type(exc).__name__}: {exc}";print(json.dumps({"stage":"failed","job_id":job["job_id"],"tile_id":job["tile_id"],"error":msg}),flush=True)
  retryable=not msg.startswith(("RuntimeError: OUTSIDE_TARGET_CITY_RADIUS","RuntimeError: INSUFFICIENT_SOURCE_POINTS","RuntimeError: LAS_HEADER_HAS_NO_CRS"))
  try:broker("failed",{"job_id":int(job["job_id"]),"worker":worker,"tile_id":job["tile_id"],"error":msg,"retryable":retryable},timeout=90)
  except Exception as err:print(f"FAILURE_STATE_UPDATE_FAILED:{err}",flush=True)
  raise
if __name__=="__main__":main()
