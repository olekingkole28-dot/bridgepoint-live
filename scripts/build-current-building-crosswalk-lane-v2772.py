#!/usr/bin/env python3
import argparse, base64, hashlib, importlib.util, json, os, pathlib, time
import pyarrow as pa
import pyarrow.parquet as pq
import requests

HERE=pathlib.Path(__file__).resolve().parent
BASE_PATH=HERE/"build-current-building-crosswalk-v2752.py"
spec=importlib.util.spec_from_file_location("bp_crosswalk_base",BASE_PATH)
base=importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

HARD_BYTES=42*1024*1024

def fetch_lane(state,lane,lanes,out_path):
    schema=pa.schema([
        ("building_geometry_id",pa.int64()),
        ("source_record_id",pa.string()),
        ("geometry_wkb",pa.binary()),
    ])
    writer=pq.ParquetWriter(out_path,schema,compression="zstd",use_dictionary=True,write_statistics=True)
    after=0; total=0
    try:
        while True:
            page=base.broker("local_lane_page",state,{
                "lane":lane,"lanes":lanes,"after_id":after,"limit":10000
            },timeout=180)
            rows=page.get("rows",[])
            if int(page.get("count",len(rows)))!=len(rows):
                raise RuntimeError("lane page count mismatch")
            if rows:
                ids=[]; src=[]; wkbs=[]
                for r in rows:
                    ids.append(int(r["building_geometry_id"]))
                    src.append(str(r["source_record_id"]))
                    wkbs.append(base64.b64decode(r["geometry_wkb_b64"]))
                writer.write_table(pa.Table.from_arrays([
                    pa.array(ids,type=pa.int64()),
                    pa.array(src,type=pa.string()),
                    pa.array(wkbs,type=pa.binary()),
                ],schema=schema))
                total+=len(rows)
                nxt=int(page["next_after_id"])
                if nxt<=after: raise RuntimeError("non-monotonic lane cursor")
                after=nxt
            if bool(page.get("done")) or not rows:
                break
    finally:
        writer.close()
    if total<=0:
        raise RuntimeError(f"empty local lane state={state} lane={lane}/{lanes}")
    return total

def file_sha(path):
    h=hashlib.sha256()
    with open(path,"rb") as f:
        for chunk in iter(lambda:f.read(8*1024*1024),b""): h.update(chunk)
    return h.hexdigest()

def upload_lane(state,lane,lanes,out_path,validation):
    size=out_path.stat().st_size
    if size>HARD_BYTES:
        raise RuntimeError(f"lane output too large state={state} lane={lane} bytes={size}")
    con=base.setup_duckdb()
    try:
        row=con.execute(f"""
          select count(*)::bigint,
                 count(*) filter(where match_status='CONFIRMED')::bigint,
                 count(*) filter(where match_status like 'CANDIDATE%')::bigint,
                 count(*) filter(where match_status='UNMATCHED')::bigint,
                 (count(*)-count(distinct building_geometry_id))::bigint,
                 count(*) filter(where match_status is null or match_status='')::bigint
          from read_parquet({base.q(str(out_path))})
        """).fetchone()
    finally:
        con.close()
    rows,confirmed,candidate,unmatched,dup,missing=map(int,row)
    if rows!=int(validation["output_rows"]) or dup or missing:
        raise RuntimeError(f"lane output validation failed rows={row} validation={validation}")

    digest=file_sha(out_path)
    signed=base.broker("sign_part",state,{"part_index":lane})
    err=None
    for attempt in range(1,4):
        try:
            with open(out_path,"rb") as fh:
                rr=requests.put(
                    signed["signed_url"],data=fh,
                    headers={
                        "content-type":"application/vnd.apache.parquet",
                        "x-upsert":"true",
                        "content-length":str(size)
                    },timeout=1800
                )
            if rr.ok: err=None; break
            err=f"HTTP {rr.status_code}: {rr.text[:1000]}"
        except Exception as exc:
            err=str(exc)
        if attempt<3:
            time.sleep(3*attempt)
            signed=base.broker("sign_part",state,{"part_index":lane})
    if err: raise RuntimeError(f"upload failed: {err}")

    result=base.broker("finalize_part",state,{
        "part_index":lane,
        "object_path":signed["path"],
        "row_count":rows,
        "confirmed_rows":confirmed,
        "candidate_rows":candidate,
        "unmatched_rows":unmatched,
        "file_bytes":size,
        "sha256":digest,
        "validation":{
            "duplicate_output_local_ids":dup,
            "missing_status":missing
        },
        "metadata":{
            "builder":"CURRENT_BUILDING_CROSSWALK_FIXED_LANE_V2772",
            "parallel_version":2772,
            "lane":lane,
            "lanes":lanes,
            "matcher_version":2772,
            "overture_input_mode":"TARGETED_OVERTURE_ROWGROUP_RUNS"
        }
    },timeout=420)
    return {"rows":rows,"confirmed":confirmed,"candidate":candidate,"unmatched":unmatched,"bytes":size,"sha256":digest,"broker":result}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--state",required=True,choices=["LA","NY","PA"])
    ap.add_argument("--lane",type=int,required=True)
    ap.add_argument("--lanes",type=int,required=True)
    args=ap.parse_args()
    if args.lanes<1 or args.lane<0 or args.lane>=args.lanes: raise RuntimeError("invalid lane")
    state=args.state
    outdir=pathlib.Path("crosswalk-parallel-v2772")/state/f"lane-{args.lane:02d}"
    outdir.mkdir(parents=True,exist_ok=True)
    local_path=outdir/"local.parquet"
    output_path=outdir/"crosswalk.parquet"

    cat=base.broker("catalog",state)
    run_doc=base.broker("source_runs",state,timeout=240)
    source_runs=list(run_doc.get("runs",[]))
    if not source_runs: raise RuntimeError("no source runs")

    local_rows=fetch_lane(state,args.lane,args.lanes,local_path)
    con=base.setup_duckdb()
    try:
        started=time.time()
        validation=base.build_crosswalk(
            con,state,cat,local_path,output_path,
            source_runs=source_runs,
            expected_override=local_rows
        )
    finally:
        con.close()

    receipt=upload_lane(state,args.lane,args.lanes,output_path,validation)
    print(json.dumps({
        "complete":True,"version":2772,"state":state,
        "lane":args.lane,"lanes":args.lanes,
        "local_rows":local_rows,
        "elapsed_seconds":round(time.time()-started,2),
        "receipt":receipt
    },separators=(",",":")))

if __name__=="__main__":
    main()
