#!/usr/bin/env python3
import argparse, base64, importlib.util, json, pathlib, time
import pyarrow as pa
import pyarrow.parquet as pq

HERE=pathlib.Path(__file__).resolve().parent
BASE_PATH=HERE/"build-current-building-crosswalk-v2752.py"
spec=importlib.util.spec_from_file_location("bp_crosswalk_base_v2783",BASE_PATH)
base=importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

def fetch_substripe(state,lane,lanes,sublane,sublanes,out_path):
    schema=pa.schema([
        ("building_geometry_id",pa.int64()),
        ("source_record_id",pa.string()),
        ("geometry_wkb",pa.binary()),
    ])
    writer=pq.ParquetWriter(out_path,schema,compression="zstd",use_dictionary=True,write_statistics=True)
    after=0
    total=0
    parent_expected=None
    bbox=None
    try:
        while True:
            page=base.broker("local_spatial_substripe_page",state,{
                "lane":lane,"lanes":lanes,
                "sublane":sublane,"sublanes":sublanes,
                "after_id":after,"limit":10000
            },timeout=240)
            rows=page.get("rows",[])
            if int(page.get("count",len(rows)))!=len(rows):
                raise RuntimeError("substripe page count mismatch")
            if parent_expected is None:
                parent_expected=int(page.get("parent_expected_rows",0))
                bbox=page.get("bbox")
            if rows:
                ids=[]; src=[]; wkbs=[]
                for row in rows:
                    ids.append(int(row["building_geometry_id"]))
                    src.append(str(row["source_record_id"]))
                    wkbs.append(base64.b64decode(row["geometry_wkb_b64"]))
                writer.write_table(pa.Table.from_arrays([
                    pa.array(ids,type=pa.int64()),
                    pa.array(src,type=pa.string()),
                    pa.array(wkbs,type=pa.binary()),
                ],schema=schema))
                total+=len(rows)
                nxt=int(page["next_after_id"])
                if nxt<=after:
                    raise RuntimeError("non-monotonic substripe cursor")
                after=nxt
            if bool(page.get("done")) or not rows:
                break
    finally:
        writer.close()
    if parent_expected is None or parent_expected<=0 or total<=0:
        raise RuntimeError(f"invalid substripe result state={state} lane={lane} sublane={sublane}/{sublanes}")
    return total,parent_expected,bbox

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--state",required=True,choices=["LA","NY","PA"])
    ap.add_argument("--lane",type=int,required=True)
    ap.add_argument("--lanes",type=int,required=True)
    ap.add_argument("--sublane",type=int,required=True)
    ap.add_argument("--sublanes",type=int,required=True)
    ap.add_argument("--out-dir",default="rescue-v2783")
    a=ap.parse_args()
    if a.lane<0 or a.lane>=a.lanes or a.sublane<0 or a.sublane>=a.sublanes:
        raise RuntimeError("invalid lane arguments")

    outdir=pathlib.Path(a.out_dir)/f"{a.state}-{a.lane:02d}-{a.sublane:02d}"
    outdir.mkdir(parents=True,exist_ok=True)
    local_path=outdir/"local.parquet"
    output_path=outdir/"crosswalk.parquet"
    receipt_path=outdir/"receipt.json"

    cat=dict(base.broker("catalog",a.state))
    local_rows,parent_expected,bbox=fetch_substripe(
        a.state,a.lane,a.lanes,a.sublane,a.sublanes,local_path
    )
    run_doc=base.broker("source_runs_substripe",a.state,{
        "lane":a.lane,"lanes":a.lanes,
        "sublane":a.sublane,"sublanes":a.sublanes
    },timeout=240)
    source_runs=list(run_doc.get("runs",[]))
    if not source_runs:
        raise RuntimeError("no source runs for substripe")
    if int(run_doc.get("parent_expected_rows",0))!=parent_expected:
        raise RuntimeError("parent lane expected row mismatch")
    if list(run_doc.get("bbox") or [])!=list(bbox or []):
        raise RuntimeError("substripe bbox mismatch")
    cat["bbox"]=run_doc["bbox"]

    con=base.setup_duckdb()
    try:
        started=time.time()
        validation=base.build_crosswalk(
            con,a.state,cat,local_path,output_path,
            source_runs=source_runs,
            expected_override=local_rows
        )
    finally:
        con.close()

    receipt={
        "complete":True,"version":2783,
        "partition_mode":"LONGITUDE_SUBSTRIPE_EXACT",
        "state":a.state,"lane":a.lane,"lanes":a.lanes,
        "sublane":a.sublane,"sublanes":a.sublanes,
        "local_rows":local_rows,"parent_expected_rows":parent_expected,
        "bbox":bbox,"source_run_count":len(source_runs),
        "source_raw_rows":int(run_doc.get("raw_rows",0)),
        "elapsed_seconds":round(time.time()-started,2),
        "validation":validation
    }
    receipt_path.write_text(json.dumps(receipt,separators=(",",":")),encoding="utf-8")
    print(json.dumps(receipt,separators=(",",":")))

if __name__=="__main__":
    main()
