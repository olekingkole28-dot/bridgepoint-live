import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const U = Deno.env.get("SUPABASE_URL")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ISS = "https://token.actions.githubusercontent.com";
const AUD = "bridgepoint-lidar-ingest-v6025";
const JWKS_URL = "https://token.actions.githubusercontent.com/.well-known/jwks";
const ALLOWED_REPOSITORY = "olekingkole28-dot/bridgepoint-live";
const ALLOWED_REF = "refs/heads/main";
const ALLOWED_WORKFLOW = "olekingkole28-dot/bridgepoint-live/.github/workflows/global-lidar-ingest-v6025.yml@refs/heads/main";
const BUCKET = "bridgepoint-global-lidar-gold";
const CORS: Record<string,string> = {
  "content-type": "application/json",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const sb = createClient(U, S, { auth: { persistSession: false, autoRefreshToken: false } });
let jwksCache: any[] = [];
let jwksFetchedAt = 0;

function decode64(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const raw = atob(s), out = new Uint8Array(raw.length);
  for (let i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i);
  return out;
}
async function getKeys() {
  if (jwksCache.length && Date.now()-jwksFetchedAt < 5*60*1000) return jwksCache;
  const r = await fetch(JWKS_URL, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error("OIDC_JWKS_HTTP_"+r.status);
  const j = await r.json();
  if (!Array.isArray(j?.keys)) throw new Error("OIDC_JWKS_INVALID");
  jwksCache=j.keys; jwksFetchedAt=Date.now(); return jwksCache;
}
async function verifyOidc(token: string) {
  const parts=token.split(".");
  if(parts.length!==3) throw new Error("OIDC_FORMAT");
  const header=JSON.parse(new TextDecoder().decode(decode64(parts[0])));
  const claims=JSON.parse(new TextDecoder().decode(decode64(parts[1])));
  if(header.alg!=="RS256"||!header.kid) throw new Error("OIDC_ALGORITHM");
  const jwk=(await getKeys()).find((x:any)=>x.kid===header.kid);
  if(!jwk) throw new Error("OIDC_KID_NOT_FOUND");
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const verified=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode64(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
  if(!verified) throw new Error("OIDC_SIGNATURE_INVALID");
  const now=Math.floor(Date.now()/1000);
  if(claims.iss!==ISS) throw new Error("OIDC_ISSUER");
  if(!(claims.aud===AUD||(Array.isArray(claims.aud)&&claims.aud.includes(AUD)))) throw new Error("OIDC_AUDIENCE");
  if(Number(claims.exp||0)<now-30||Number(claims.iat||0)>now+60) throw new Error("OIDC_TIME");
  if(claims.repository!==ALLOWED_REPOSITORY) throw new Error("OIDC_REPOSITORY");
  if(claims.ref!==ALLOWED_REF) throw new Error("OIDC_REF");
  if(claims.workflow_ref!==ALLOWED_WORKFLOW) throw new Error("OIDC_WORKFLOW");
  return claims;
}
function respond(data: unknown, status=200) {
  return new Response(JSON.stringify(data),{status,headers:CORS});
}
async function rpc(name:string,args:Record<string,unknown>) {
  const {data,error}=await sb.rpc(name,args);
  if(error) throw new Error(name+":"+error.message);
  return data;
}
function safeStoragePath(value:string, tileId:string) {
  const p=String(value||"");
  if(!/^[0-9a-f-]{36}$/.test(tileId)) throw new Error("INVALID_TILE_ID");
  if(!new RegExp("^usgs-3dep/"+tileId+"/(metadata\\.json|hierarchy\\.bin|octree\\.bin)$").test(p)) {
    throw new Error("STORAGE_PATH_OUTSIDE_CLAIMED_TILE");
  }
  return p;
}
async function authorizeLease(jobId:number,worker:string,tileId:string) {
  const {data,error}=await sb.from("bridgepoint_lidar_ingest_jobs_v6025")
    .select("job_id,status,claimed_by,tile_id,job_type")
    .eq("job_id",jobId).maybeSingle();
  if(error) throw new Error("LEASE_LOOKUP_FAILED:"+error.message);
  if(!data||data.status!=="running"||data.claimed_by!==worker||data.tile_id!==tileId||data.job_type!=="materialize_gold_lod") {
    throw new Error("LIDAR_JOB_LEASE_MISMATCH");
  }
  return data;
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:CORS});
  if(req.method!=="POST") return respond({complete:false,error:"POST_REQUIRED"},405);
  try {
    const body=await req.json().catch(()=>({}));
    await verifyOidc(String(body.oidc_token||""));
    const action=String(body.action||"").toLowerCase();
    if(action==="claim") {
      const worker=String(body.worker||"github-lidar-worker").slice(0,120);
      const out=await rpc("bridgepoint_lidar_claim_github_v6025",{p_worker:worker,p_max_bytes:67108864});
      return respond(out);
    }
    if(action==="upload_url") {
      const jobId=Number(body.job_id),worker=String(body.worker||"").slice(0,120),tileId=String(body.tile_id||"");
      await authorizeLease(jobId,worker,tileId);
      const path=safeStoragePath(String(body.path||""),tileId);
      const {data,error}=await sb.storage.from(BUCKET).createSignedUploadUrl(path,{upsert:true});
      if(error||!data?.signedUrl) throw new Error("SIGNED_UPLOAD_URL_FAILED:"+(error?.message||"empty response"));
      return respond({complete:true,path,signedUrl:data.signedUrl,token:data.token,expiresInSeconds:7200});
    }
    if(action==="complete") {
      const jobId=Number(body.job_id),worker=String(body.worker||"").slice(0,120),tileId=String(body.tile_id||"");
      await authorizeLease(jobId,worker,tileId);
      const prefix=String(body.storage_prefix||"");
      if(prefix!=="usgs-3dep/"+tileId+"/") throw new Error("INVALID_STORAGE_PREFIX");
      const out=await rpc("bridgepoint_lidar_complete_github_v6025",{
        p_job_id:jobId,p_worker:worker,p_tile_id:tileId,p_storage_prefix:prefix,
        p_center:body.center,p_bounds:body.bounds,p_source_point_count:Number(body.source_point_count),
        p_crs:String(body.crs||""),p_min_z:body.min_z===null?null:Number(body.min_z),
        p_max_z:body.max_z===null?null:Number(body.max_z),p_manifest:body.manifest||{},
      });
      return respond(out);
    }
    if(action==="failed") {
      const jobId=Number(body.job_id),worker=String(body.worker||"").slice(0,120),tileId=String(body.tile_id||"");
      await authorizeLease(jobId,worker,tileId);
      const out=await rpc("bridgepoint_lidar_fail_github_v6025",{
        p_job_id:jobId,p_worker:worker,p_tile_id:tileId,
        p_error:String(body.error||"unknown worker error").slice(0,1700),
        p_retryable:body.retryable!==false,
      });
      return respond(out);
    }
    if(action==="status") {
      const [queued,running,materialized,ready,failed]=await Promise.all([
        sb.from("bridgepoint_lidar_ingest_jobs_v6025").select("job_id",{count:"exact",head:true}).eq("job_type","materialize_gold_lod").eq("status","queued"),
        sb.from("bridgepoint_lidar_ingest_jobs_v6025").select("job_id",{count:"exact",head:true}).eq("job_type","materialize_gold_lod").eq("status","running"),
        sb.from("bridgepoint_lidar_tiles_v6025").select("tile_id",{count:"exact",head:true}).eq("source_key","usgs-3dep").eq("process_status","materialized"),
        sb.from("bridgepoint_gold_lidar_assets_v6025").select("asset_id",{count:"exact",head:true}).eq("publish_status","ready").eq("gold_lod_only",true).eq("license_verified",true).eq("redistribution_allowed",true),
        sb.from("bridgepoint_lidar_ingest_jobs_v6025").select("job_id",{count:"exact",head:true}).eq("job_type","materialize_gold_lod").eq("status","failed"),
      ]);
      for(const r of [queued,running,materialized,ready,failed]) if(r.error) throw new Error("STATUS_QUERY_FAILED:"+r.error.message);
      return respond({complete:true,queued:queued.count||0,running:running.count||0,materializedTiles:materialized.count||0,readyGoldAssets:ready.count||0,failed:failed.count||0});
    }
    return respond({complete:false,error:"UNKNOWN_ACTION"},400);
  } catch(e) {
    const message=String((e as any)?.message||e);
    console.error("global LiDAR broker",message);
    return respond({complete:false,error:message},message.startsWith("OIDC_")?401:500);
  }
});
