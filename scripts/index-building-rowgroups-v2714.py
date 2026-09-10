#!/usr/bin/env python3
import argparse, json, os
import duckdb, requests

U=os.environ['SUPABASE_URL'].rstrip('/')
KEY=os.environ['SUPABASE_KEY']
BROKER=f'{U}/functions/v1/bridgepoint-building-archive-broker-v2710'
INV=f'{U}/rest/v1/rpc/bridgepoint_public_building_source_inventory_v2710'
AUD='bridgepoint-building-v2710'

def post(url,payload,headers=None,timeout=180):
    h={'content-type':'application/json'}; h.update(headers or {})
    r=requests.post(url,json=payload,headers=h,timeout=timeout)
    if not r.ok: raise RuntimeError(f'{r.status_code}: {r.text[:1200]}')
    return r.json()

def oidc():
    u=os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']; t=os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']
    sep='&' if '?' in u else '?'
    r=requests.get(f'{u}{sep}audience={AUD}',headers={'Authorization':f'bearer {t}'},timeout=30)
    r.raise_for_status(); return r.json()['value']

def q(s): return "'"+str(s).replace("'","''")+"'"

ap=argparse.ArgumentParser(); ap.add_argument('--shard',type=int,required=True); ap.add_argument('--shards',type=int,default=4); a=ap.parse_args()
if a.shard<0 or a.shard>=a.shards: raise SystemExit('invalid shard')
inv=post(INV,{}, {'apikey':KEY,'authorization':f'Bearer {KEY}'})
items=list(inv.get('items') or [])
expected_global=int(inv.get('total_rows',0))
if expected_global<=0 or not items: raise RuntimeError('empty building source inventory')
selected=[x for i,x in enumerate(items) if i%a.shards==a.shard]
con=duckdb.connect(':memory:'); con.execute('INSTALL httpfs; LOAD httpfs')
indexed=0; groups_total=0
for item in selected:
    url=item['url']; sk=item['source_key']; iid=item['item_id']; expected=int(item['num_rows'])
    rows=con.execute(f"SELECT row_group_id,row_group_num_rows,path_in_schema,stats_min,stats_max FROM parquet_metadata({q(url)}) WHERE lower(path_in_schema) LIKE '%bbox%'").fetchall()
    by={}
    for rg,n,path,smin,smax in rows:
        d=by.setdefault(int(rg),{'row_count':int(n),'w':None,'s':None,'e':None,'n':None})
        p=str(path).lower().replace('_','').replace('.','')
        try:
            if 'xmin' in p:d['w']=float(smin)
            elif 'ymin' in p:d['s']=float(smin)
            elif 'xmax' in p:d['e']=float(smax)
            elif 'ymax' in p:d['n']=float(smax)
        except Exception: pass
    if not by: raise RuntimeError(f'No bbox row-group metadata for {sk}/{iid}')
    start=0; groups=[]
    for rg in sorted(by):
        d=by[rg]
        if None in (d['w'],d['s'],d['e'],d['n']): raise RuntimeError(f'Incomplete bbox stats {sk}/{iid}/rg{rg}: {d}')
        groups.append({'row_group_id':rg,'row_start':start,'row_count':d['row_count'],'bbox_west':d['w'],'bbox_south':d['s'],'bbox_east':d['e'],'bbox_north':d['n']})
        start+=d['row_count']
    if start!=expected: raise RuntimeError(f'Row-group sum mismatch {sk}/{iid}: {start}/{expected}')
    receipt=post(BROKER,{'action':'persist_rowgroups','oidc_token':oidc(),'source_key':sk,'item_id':iid,'groups':groups})
    indexed+=expected; groups_total+=len(groups)
    print(json.dumps(receipt,separators=(',',':')))
con.close()
expected_selected=sum(int(x['num_rows']) for x in selected)
if indexed!=expected_selected: raise RuntimeError(f'Shard accounting mismatch {indexed}/{expected_selected}')
print(json.dumps({'complete':True,'shard':a.shard,'shards':a.shards,'items':len(selected),'indexed_rows':indexed,'row_groups':groups_total,'global_denominator':expected_global},separators=(',',':')))
