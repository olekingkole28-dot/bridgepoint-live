#!/usr/bin/env node
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const API_URL = 'https://energy.usgs.gov/api/uswtdb/v1/turbines';
const SOURCE_URL = 'https://energy.usgs.gov/uswtdb/';
const SOURCE_VERSION = 'USWTDB v9.1 · 2026-09-28';
const VERSION_ID = 'USWTDB_V9_1_20260928';
const FIELDS = [
  'case_id','faa_ors','faa_asn','usgs_pr_id','eia_id',
  't_state','t_county','t_fips','p_name','p_year','p_tnum','p_cap',
  't_manu','t_model','t_cap','t_hh','t_rd','t_rsa','t_ttlh',
  't_retrofit','t_retro_yr','t_offshore','t_conf_atr','t_conf_loc',
  't_img_date','t_img_src','xlong','ylat'
].join(',');
const REQUEST_LIMIT = 100000;
const MAX_ROWS = 150000;

function outputPathFromArgs(args) {
  const index = args.indexOf('--output');
  return index >= 0 && args[index+1] ? resolve(args[index+1]) :
    resolve('site/data/bridgepoint-uswtdb-turbines-v9_1.json');
}
async function requestRows(offset) {
  const url = new URL(API_URL);
  url.searchParams.set('select',FIELDS);
  url.searchParams.set('limit',String(REQUEST_LIMIT));
  url.searchParams.set('offset',String(offset));
  let lastError = null;
  for (let attempt=0;attempt<4;attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),90000);
    try {
      const response = await fetch(url.toString(),{
        method:'GET',
        headers:{'Accept':'application/json','Prefer':'count=exact'},
        signal:controller.signal
      });
      if (!response.ok) throw new Error('USWTDB API HTTP '+response.status);
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('USWTDB API response was not an array');
      const range = response.headers.get('content-range') || '';
      const match = String(range).match(/\/\s*(\d+)\s*$/);
      return {rows,total:match?Number(match[1]):null,range:range};
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolveDelay=>setTimeout(resolveDelay,1000*(attempt+1)));
    } finally { clearTimeout(timer); }
  }
  throw lastError || new Error('USWTDB API request failed');
}

async function buildSnapshot() {
  const first = await requestRows(0);
  if (!first.rows.length) throw new Error('USWTDB API returned zero records');
  const records = first.rows.slice();
  const expected = first.total;
  let offset = records.length;
  while (offset < MAX_ROWS && (expected === null ? records.length === REQUEST_LIMIT : offset < expected)) {
    const page = await requestRows(offset);
    if (!page.rows.length) break;
    records.push(...page.rows);
    offset += page.rows.length;
    if (expected !== null && page.total !== null && page.total !== expected) {
      throw new Error('USWTDB row count changed while snapshot was being downloaded');
    }
    process.stdout.write('USWTDB snapshot progress: '+records.length.toLocaleString('en-US')+
      (expected===null?'':' / '+expected.toLocaleString('en-US'))+' records\n');
  }
  if (records.length < 10000) throw new Error('USWTDB snapshot is unexpectedly small: '+records.length);
  if (expected !== null && records.length !== expected) {
    throw new Error('USWTDB snapshot incomplete: received '+records.length+' of '+expected);
  }
  if (records.length >= MAX_ROWS) throw new Error('USWTDB snapshot exceeded the safety row cap');
  const ids = new Set();
  for (const row of records) {
    if (row.case_id === null || row.case_id === undefined) throw new Error('A USWTDB record has no case_id');
    const id = String(row.case_id);
    if (ids.has(id)) throw new Error('Duplicate USWTDB case_id: '+id);
    ids.add(id);
    if (!Number.isFinite(Number(row.xlong)) || !Number.isFinite(Number(row.ylat))) {
      throw new Error('USWTDB record '+id+' has invalid coordinates');
    }
  }
  return {
    metadata:{
      dataset:'United States Wind Turbine Database',
      sourceVersion:SOURCE_VERSION,
      version:VERSION_ID,
      generatedAtUtc:new Date().toISOString(),
      recordCount:records.length,
      coordinateToleranceM:10,
      sourceUrl:SOURCE_URL,
      apiUrl:API_URL,
      sourceFields:FIELDS.split(',')
    },
    records
  };
}

async function main() {
  const output = outputPathFromArgs(process.argv.slice(2));
  await mkdir(dirname(output),{recursive:true});
  const temporary = output+'.tmp';
  try {
    const snapshot = await buildSnapshot();
    const serialized = JSON.stringify(snapshot);
    await writeFile(temporary,serialized,{encoding:'utf8'});
    await rename(temporary,output);
    const info = await stat(output);
    console.log('BRIDGEPOINT_USWTDB_SNAPSHOT_READY '+JSON.stringify({
      output:output,records:snapshot.records.length,bytes:info.size,
      version:snapshot.metadata.version,generatedAtUtc:snapshot.metadata.generatedAtUtc
    }));
  } catch (error) {
    try {
      const existing = await stat(output);
      if (existing.isFile() && existing.size > 100000) {
        console.warn('USWTDB refresh failed; preserving prior published snapshot: '+String(error && error.message || error));
        return;
      }
    } catch (_) {}
    throw error;
  }
}
main().catch(error=>{
  console.error('BRIDGEPOINT_USWTDB_SNAPSHOT_FAILED',error);
  process.exitCode=1;
});
