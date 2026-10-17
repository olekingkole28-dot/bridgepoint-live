-- BridgePoint public satellite orbit catalog and guarded source worker (v5926).
-- Provider access returned HTTP 403; scheduled external fetch is deliberately paused pending human review.
CREATE TABLE IF NOT EXISTS public.bridgepoint_satellite_catalog_v5926 (
  norad_cat_id text PRIMARY KEY,
  object_name text NOT NULL,
  object_type text,
  epoch timestamptz,
  omm jsonb NOT NULL,
  source_key text NOT NULL DEFAULT 'CELESTRAK_GP_ACTIVE_OMM',
  source_url text NOT NULL DEFAULT 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bridgepoint_satellite_catalog_epoch_v5926_idx ON public.bridgepoint_satellite_catalog_v5926(epoch DESC);
CREATE INDEX IF NOT EXISTS bridgepoint_satellite_catalog_seen_v5926_idx ON public.bridgepoint_satellite_catalog_v5926(last_seen_at DESC);
ALTER TABLE public.bridgepoint_satellite_catalog_v5926 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bridgepoint_satellite_catalog_v5926 FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS public.bridgepoint_satellite_catalog_status_v5926 (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 total_known_objects bigint NOT NULL DEFAULT 0,
 latest_active_group_count bigint NOT NULL DEFAULT 0,
 source_fetched_at timestamptz,
 last_refresh_attempt_at timestamptz,
 last_refresh_status text NOT NULL DEFAULT 'WAITING_FOR_FIRST_SOURCE_REFRESH',
 last_error text,
 source_key text NOT NULL DEFAULT 'CELESTRAK_GP_ACTIVE_OMM',
 source_url text NOT NULL DEFAULT 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON',
 source_refresh_policy_minutes integer NOT NULL DEFAULT 120,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bridgepoint_satellite_catalog_status_v5926 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bridgepoint_satellite_catalog_status_v5926 FROM PUBLIC,anon,authenticated;
INSERT INTO public.bridgepoint_satellite_catalog_status_v5926(singleton) VALUES(true) ON CONFLICT(singleton) DO NOTHING;

CREATE OR REPLACE FUNCTION public.bridgepoint_satellite_claim_refresh_v5926(p_task_token text, p_force boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'automation'
AS $function$
DECLARE s public.bridgepoint_satellite_catalog_status_v5926%ROWTYPE;
  v_active integer:=0; v_io integer:=0; v_locks integer:=0; v_http integer:=0;
BEGIN
  IF p_task_token IS NULL OR NOT EXISTS (
    SELECT 1 FROM automation.geographic_expansion_worker_secret_v90
    WHERE singleton=true AND task_token=p_task_token
  ) THEN
    RETURN jsonb_build_object('ok',false,'error','UNAUTHORIZED');
  END IF;
  IF NOT pg_try_advisory_xact_lock(hashtextextended('bridgepoint-satellite-catalog-v5926',0)) THEN
    RETURN jsonb_build_object('ok',false,'skipped','LOCKED');
  END IF;

  SELECT
    count(*) FILTER (WHERE backend_type='client backend' AND state='active' AND pid<>pg_backend_pid())::int,
    count(*) FILTER (WHERE backend_type='client backend' AND state='active' AND wait_event_type='IO')::int,
    count(*) FILTER (WHERE backend_type='client backend' AND state='active' AND wait_event_type='Lock')::int
  INTO v_active,v_io,v_locks FROM pg_stat_activity WHERE datname=current_database();
  SELECT count(*)::int INTO v_http FROM net.http_request_queue;
  IF v_active>24 OR v_io>9 OR v_locks>2 OR v_http>=30 THEN
    RETURN jsonb_build_object('ok',false,'skipped','PRESSURE_GATE','active',v_active,'io',v_io,'locks',v_locks,'http_queue',v_http);
  END IF;
  SELECT * INTO s FROM public.bridgepoint_satellite_catalog_status_v5926
  WHERE singleton=true FOR UPDATE;
  IF s.last_refresh_status='FAILED' AND coalesce(s.last_error,'') ILIKE '%403%' THEN
    RETURN jsonb_build_object('ok',false,'skipped','PROVIDER_REVIEW_REQUIRED',
      'source_key',s.source_key,'last_refresh_attempt_at',s.last_refresh_attempt_at,
      'message','Provider returned HTTP 403; automated source fetching is paused until a human resolves provider access.');
  END IF;
  IF NOT coalesce(p_force,false) AND s.source_fetched_at IS NOT NULL
     AND s.source_fetched_at > now() - interval '110 minutes' THEN
    RETURN jsonb_build_object('ok',false,'skipped','SOURCE_REFRESH_COOLDOWN',
      'source_fetched_at',s.source_fetched_at,'refresh_policy_minutes',s.source_refresh_policy_minutes);
  END IF;
  IF NOT coalesce(p_force,false) AND s.last_refresh_attempt_at IS NOT NULL
     AND s.last_refresh_attempt_at > now()-interval '110 minutes' THEN
    RETURN jsonb_build_object('ok',false,'skipped','SOURCE_ATTEMPT_COOLDOWN',
      'last_refresh_attempt_at',s.last_refresh_attempt_at,'refresh_policy_minutes',s.source_refresh_policy_minutes);
  END IF;
  IF s.last_refresh_status='RUNNING' AND s.last_refresh_attempt_at > now()-interval '30 minutes' THEN
    RETURN jsonb_build_object('ok',false,'skipped','REFRESH_ALREADY_RUNNING',
      'last_refresh_attempt_at',s.last_refresh_attempt_at);
  END IF;
  UPDATE public.bridgepoint_satellite_catalog_status_v5926
    SET last_refresh_attempt_at=now(),last_refresh_status='RUNNING',
        last_error=NULL,updated_at=now()
    WHERE singleton=true;
  RETURN jsonb_build_object('ok',true,'version',5926,'started_at',now());
END;
$function$
;
REVOKE ALL ON FUNCTION public.bridgepoint_satellite_claim_refresh_v5926(text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bridgepoint_satellite_claim_refresh_v5926(text,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.bridgepoint_satellite_finish_refresh_v5926(p_task_token text, p_success boolean, p_group_count integer DEFAULT NULL::integer, p_error text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'automation'
AS $function$
DECLARE v_known bigint;
BEGIN
  IF p_task_token IS NULL OR NOT EXISTS (
    SELECT 1 FROM automation.geographic_expansion_worker_secret_v90
    WHERE singleton=true AND task_token=p_task_token
  ) THEN
    RETURN jsonb_build_object('ok',false,'error','UNAUTHORIZED');
  END IF;
  SELECT count(*) INTO v_known FROM public.bridgepoint_satellite_catalog_v5926;
  UPDATE public.bridgepoint_satellite_catalog_status_v5926
    SET total_known_objects=v_known,
        latest_active_group_count=CASE WHEN p_success AND p_group_count IS NOT NULL
          THEN p_group_count ELSE latest_active_group_count END,
        source_fetched_at=CASE WHEN p_success THEN now() ELSE source_fetched_at END,
        last_refresh_status=CASE WHEN p_success THEN 'SUCCESS' ELSE 'FAILED' END,
        last_error=CASE WHEN p_success THEN NULL ELSE left(coalesce(p_error,'SOURCE_REFRESH_FAILED'),1000) END,
        updated_at=now()
    WHERE singleton=true;
  RETURN jsonb_build_object('ok',true,'success',coalesce(p_success,false),
    'total_known_objects',v_known,'latest_active_group_count',p_group_count,
    'source_fetched_at',CASE WHEN p_success THEN now() ELSE NULL END);
END;
$function$
;
REVOKE ALL ON FUNCTION public.bridgepoint_satellite_finish_refresh_v5926(text,boolean,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bridgepoint_satellite_finish_refresh_v5926(text,boolean,integer,text) TO service_role;

CREATE OR REPLACE FUNCTION public.bridgepoint_public_satellite_summary_v5926()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT jsonb_build_object(
    'version',5926,
    'total_known_objects',s.total_known_objects,
    'latest_active_group_count',s.latest_active_group_count,
    'source_fetched_at',s.source_fetched_at,
    'last_refresh_attempt_at',s.last_refresh_attempt_at,
    'last_refresh_status',s.last_refresh_status,
    'operator_review_required',s.last_refresh_status='FAILED' AND s.last_error LIKE '%403%',
    'last_error',CASE
      WHEN s.last_refresh_status='FAILED' AND s.last_error LIKE '%403%'
      THEN 'The upstream provider returned HTTP 403. Automatic fetches are paused to comply with the provider usage policy; no orbital records were materialized.'
      WHEN s.last_refresh_status='FAILED'
      THEN 'The latest source refresh failed; no new objects were published and the prior materialized catalog is retained.'
      ELSE NULL END,
    'source_key',s.source_key,'source_url',s.source_url,
    'source_refresh_policy_minutes',s.source_refresh_policy_minutes,
    'updated_at',s.updated_at
  ) FROM public.bridgepoint_satellite_catalog_status_v5926 s WHERE s.singleton=true;
$function$
;
REVOKE ALL ON FUNCTION public.bridgepoint_public_satellite_summary_v5926() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bridgepoint_public_satellite_summary_v5926() TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.bridgepoint_public_satellite_orbits_v5926(p_after_id text DEFAULT NULL::text, p_limit integer DEFAULT 1200)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_limit integer:=LEAST(GREATEST(COALESCE(p_limit,1200),1),2500);
  v_items jsonb;
  v_last text;
  v_more boolean:=false;
  v_total bigint;
  v_fetched timestamptz;
BEGIN
  SELECT total_known_objects,source_fetched_at
    INTO v_total,v_fetched
    FROM public.bridgepoint_satellite_catalog_status_v5926 WHERE singleton=true;
  WITH page AS MATERIALIZED (
    SELECT norad_cat_id,object_name,object_type,epoch,omm,source_key,source_url,
           last_seen_at,first_seen_at
    FROM public.bridgepoint_satellite_catalog_v5926
    WHERE p_after_id IS NULL OR norad_cat_id::bigint > p_after_id::bigint
    ORDER BY norad_cat_id::bigint
    LIMIT v_limit
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'norad_cat_id',norad_cat_id,'object_name',object_name,'object_type',object_type,
      'epoch',epoch,'omm',omm,'source_key',source_key,'source_url',source_url,
      'last_seen_at',last_seen_at,'first_seen_at',first_seen_at
    ) ORDER BY norad_cat_id::bigint),'[]'::jsonb),
    max(norad_cat_id::bigint)::text
  INTO v_items,v_last FROM page;
  IF v_last IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.bridgepoint_satellite_catalog_v5926
      WHERE norad_cat_id::bigint > v_last::bigint) INTO v_more;
  ELSE
    v_more:=coalesce(v_total,0)>0;
  END IF;
  RETURN jsonb_build_object(
    'version',5926,'items',v_items,'loaded_count',jsonb_array_length(v_items),
    'total_known_objects',coalesce(v_total,0),'next_after_id',v_last,'has_more',v_more,
    'source_key','CELESTRAK_GP_ACTIVE_OMM','source_url','https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON',
    'source_fetched_at',v_fetched,
    'note','Positions are propagated estimates from the latest public orbital elements, not live onboard telemetry. Catalogue fetch frequency is limited to once every two hours.'
  );
END;
$function$
;
REVOKE ALL ON FUNCTION public.bridgepoint_public_satellite_orbits_v5926(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bridgepoint_public_satellite_orbits_v5926(text,integer) TO anon,authenticated,service_role;

DO $satellite_job$
BEGIN
 IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='bridgepoint-satellite-catalog-v5926') THEN
  PERFORM cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='bridgepoint-satellite-catalog-v5926' LIMIT 1),active:=false);
 ELSE
  PERFORM cron.schedule('bridgepoint-satellite-catalog-v5926','*/15 * * * *',
    $cmd$ SELECT net.http_post(
      url:='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-satellite-catalog-v5926',
      headers:='{"Content-Type":"application/json"}'::jsonb,
      body:=jsonb_build_object('task_token',(SELECT task_token FROM automation.geographic_expansion_worker_secret_v90 WHERE singleton=true)),
      timeout_milliseconds:=120000
    ); $cmd$);
  PERFORM cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='bridgepoint-satellite-catalog-v5926' LIMIT 1),active:=false);
 END IF;
END
$satellite_job$;
