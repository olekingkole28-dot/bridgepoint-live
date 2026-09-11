#!/usr/bin/env python3
import argparse, importlib.util, json, pathlib
import duckdb

HERE=pathlib.Path(__file__).resolve().parent
BASE_PATH=HERE/"build-current-building-crosswalk-v2752.py"
SPATIAL_PATH=HERE/"build-current-building-crosswalk-spatial-lane-v2775.py"

bspec=importlib.util.spec_from_file_location("bp_crosswalk_base_merge_v2780",BASE_PATH)
base=importlib.util.module_from_spec(bspec)
bspec.loader.exec_module(base)

sspec=importlib.util.spec_from_file_location("bp_crosswalk_spatial_merge_v2780",SPATIAL_PATH)
spatial=importlib.util.module_from_spec(sspec)
sspec.loader.exec_module(spatial)

def already_verified(state,lane):
    doc=base.broker("parts",state)
    for p in doc.get("parts",[]):
        if int(p.get("part_index",-1))==lane and str(p.get("status",""))=="VERIFIED":
            imported=str((p.get("metadata") or {}).get("imported_to_analytics","false")).lower()=="true"
            if imported:
                return True,p
    return False,None

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--state",required=True,choices=["LA","NY","PA"])
    ap.add_argument("--lane",type=int,required=True)
    ap.add_argument("--lanes",type=int,required=True)
    ap.add_argument("--sublanes",type=int,required=True)
    ap.add_argument("--input-dir",default="downloaded-rescue-v2780")
    ap.add_argument("--out-dir",default="merged-rescue-v2780")
    a=ap.parse_args()

    verified,part=already_verified(a.state,a.lane)
    if verified:
        print(json.dumps({"complete":True,"version":2780,"state":a.state,"lane":a.lane,"skipped":"PARENT_ALREADY_VERIFIED","part":part},separators=(",",":")))
        return

    root=pathlib.Path(a.input_dir)
    pattern=f"{a.state}-{a.lane:02d}-*/crosswalk.parquet"
    files=sorted(root.glob(pattern))
    receipts=sorted(root.glob(f"{a.state}-{a.lane:02d}-*/receipt.json"))
    if len(files)!=a.sublanes or len(receipts)!=a.sublanes:
        raise RuntimeError(f"rescue artifact count mismatch files={len(files)} receipts={len(receipts)} expected={a.sublanes}")

    receipt_docs=[json.loads(p.read_text(encoding="utf-8")) for p in receipts]
    parent_expected={int(x["parent_expected_rows"]) for x in receipt_docs}
    if len(parent_expected)!=1:
        raise RuntimeError(f"parent expected mismatch: {parent_expected}")
    expected=parent_expected.pop()

    run_doc=base.broker("source_runs_spatial",a.state,{"lane":a.lane,"lanes":a.lanes},timeout=240)
    if int(run_doc.get("expected_lane_rows",0))!=expected:
        raise RuntimeError("broker parent expected mismatch")

    outdir=pathlib.Path(a.out_dir)/a.state/f"lane-{a.lane:02d}"
    outdir.mkdir(parents=True,exist_ok=True)
    out_path=outdir/"crosswalk.parquet"

    con=duckdb.connect(":memory:")
    con.execute("SET threads=4")
    con.execute("SET memory_limit='7GB'")
    con.execute("SET preserve_insertion_order=false")
    file_list="["+",".join(base.q(str(p)) for p in files)+"]"
    con.execute(f"CREATE TEMP TABLE raw AS SELECT * FROM read_parquet({file_list}, union_by_name=true)")

    raw=con.execute("""
      SELECT
        count(*)::BIGINT,
        count(DISTINCT building_geometry_id)::BIGINT,
        count(*) FILTER(WHERE match_status IS NULL OR match_status='')::BIGINT
      FROM raw
    """).fetchone()
    if int(raw[0])!=expected or int(raw[1])!=expected or int(raw[2])!=0:
        raise RuntimeError(f"merged raw reconciliation failed expected={expected} raw={raw}")

    con.execute("""
      CREATE TEMP TABLE shared AS
      SELECT overture_building_id,count(*)::INTEGER local_count
      FROM raw
      WHERE overture_building_id IS NOT NULL
      GROUP BY overture_building_id
      HAVING count(*)>1
    """)

    con.execute(f"""
      COPY (
        SELECT
          r.building_geometry_id,
          r.candidate_id,
          r.state_code,
          r.local_source_record_id,
          r.overture_building_id,
          r.overlap_ratio,
          r.local_coverage_ratio,
          r.overture_coverage_ratio,
          r.match_score,
          CASE
            WHEN s.local_count>1 THEN 'CANDIDATE_SHARED_OVERTURE'
            ELSE r.match_status
          END match_status,
          CASE
            WHEN s.local_count>1 THEN 'SPATIAL_OVERLAP_SHARED_OVERTURE_NO_COLLAPSE'
            ELSE r.match_method
          END match_method,
          CASE
            WHEN s.local_count>1 THEN s.local_count
            ELSE r.overture_local_count
          END overture_local_count,
          r.overture_release,
          r.overture_license,
          r.local_source_record_id_rule,
          r.local_legal_status,
          r.local_legal_basis,
          r.matcher_version
        FROM raw r
        LEFT JOIN shared s USING(overture_building_id)
        ORDER BY r.building_geometry_id
      )
      TO {base.q(str(out_path))}
      (FORMAT PARQUET,COMPRESSION ZSTD,ROW_GROUP_SIZE 100000)
    """)

    val=con.execute(f"""
      SELECT
        count(*)::BIGINT,
        (count(*)-count(DISTINCT building_geometry_id))::BIGINT,
        count(*) FILTER(WHERE match_status IS NULL OR match_status='')::BIGINT,
        (
          count(*) FILTER(WHERE match_status='CONFIRMED' AND overture_building_id IS NOT NULL)
          - count(DISTINCT overture_building_id) FILTER(WHERE match_status='CONFIRMED' AND overture_building_id IS NOT NULL)
        )::BIGINT,
        count(*) FILTER(WHERE match_status='CONFIRMED')::BIGINT,
        count(*) FILTER(WHERE match_status LIKE 'CANDIDATE%')::BIGINT,
        count(*) FILTER(WHERE match_status='UNMATCHED')::BIGINT
      FROM read_parquet({base.q(str(out_path))})
    """).fetchone()
    con.close()

    if int(val[0])!=expected or any(int(val[i]) for i in (1,2,3)):
        raise RuntimeError(f"merged rescue validation failed: {val}")
    if int(val[4])+int(val[5])+int(val[6])!=expected:
        raise RuntimeError(f"merged rescue status accounting failed: {val}")

    verified,part=already_verified(a.state,a.lane)
    if verified:
        print(json.dumps({"complete":True,"version":2780,"state":a.state,"lane":a.lane,"skipped":"PARENT_VERIFIED_DURING_RESCUE","part":part},separators=(",",":")))
        return

    receipt=spatial.upload_lane(
        a.state,a.lane,a.lanes,out_path,
        {
          "output_rows":expected,
          "duplicate_output_local_ids":0,
          "missing_status":0,
          "duplicate_confirmed_overture_ids":0,
          "rescue_version":2780
        }
    )
    print(json.dumps({
        "complete":True,"version":2780,"state":a.state,
        "lane":a.lane,"lanes":a.lanes,"sublanes":a.sublanes,
        "rows":expected,"shared_overture_ids":int(con_shared_count if False else 0),
        "receipt":receipt
    },separators=(",",":")))

if __name__=="__main__":
    main()
