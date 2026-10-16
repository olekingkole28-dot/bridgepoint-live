-- BridgePoint GIS Core v5910: authenticated, append-only, hash-linked processing events.
-- Client roles can read their own events but cannot directly insert, update, or delete.
create table if not exists public.bridgepoint_gis_processing_event_v5910 (
  event_id uuid primary key default pg_catalog.gen_random_uuid(),
  run_id uuid not null,
  user_id uuid not null,
  operation_key text not null check (operation_key = any (array[
    'SATELLITE_ANALYSIS','PROPERTY_GROUND_TRUTH','HAZARD_INTERSECTION','TERRAIN_ANALYSIS',
    'GEOMETRY_WKT','COORDINATE_CONVERSION','FIELD_INGEST','ROUTING_ANALYSIS',
    'EVIDENCE_EXPORT','REAL_WORLD_RENDERING'
  ]::text[])),
  status text not null check (status = any (array['requested','completed','partial','blocked','failed']::text[])),
  input_manifest jsonb not null default '{}'::jsonb check (pg_catalog.jsonb_typeof(input_manifest) = 'object'),
  result_manifest jsonb not null default '{}'::jsonb check (pg_catalog.jsonb_typeof(result_manifest) = 'object'),
  source_refs jsonb not null default '[]'::jsonb check (pg_catalog.jsonb_typeof(source_refs) = 'array'),
  recorded_at timestamptz not null default pg_catalog.clock_timestamp(),
  previous_hash text,
  event_hash text not null check (event_hash ~ '^[0-9a-f]{64}$'),
  check (pg_catalog.octet_length(input_manifest::text) <= 32768),
  check (pg_catalog.octet_length(result_manifest::text) <= 32768),
  check (pg_catalog.octet_length(source_refs::text) <= 32768)
);

create index if not exists bridgepoint_gis_event_user_time_v5910
  on public.bridgepoint_gis_processing_event_v5910 (user_id, recorded_at desc, event_id desc);
create index if not exists bridgepoint_gis_event_user_run_v5910
  on public.bridgepoint_gis_processing_event_v5910 (user_id, run_id, recorded_at desc);

alter table public.bridgepoint_gis_processing_event_v5910 enable row level security;
drop policy if exists bridgepoint_gis_read_own_events_v5910 on public.bridgepoint_gis_processing_event_v5910;
create policy bridgepoint_gis_read_own_events_v5910
  on public.bridgepoint_gis_processing_event_v5910
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.bridgepoint_gis_processing_event_v5910 from public, anon, authenticated;
grant select on table public.bridgepoint_gis_processing_event_v5910 to authenticated;

create or replace function public.bridgepoint_gis_record_processing_event_v5910(
  p_run_id uuid,
  p_operation_key text,
  p_status text,
  p_input_manifest jsonb default '{}'::jsonb,
  p_result_manifest jsonb default '{}'::jsonb,
  p_source_refs jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid;
  v_event uuid;
  v_run uuid;
  v_recorded timestamptz;
  v_previous text;
  v_hash text;
  v_input jsonb;
  v_result jsonb;
  v_sources jsonb;
  v_payload text;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'SIGN_IN_REQUIRED' using errcode = '28000';
  end if;

  if p_operation_key is null or p_operation_key <> all (array[
    'SATELLITE_ANALYSIS','PROPERTY_GROUND_TRUTH','HAZARD_INTERSECTION','TERRAIN_ANALYSIS',
    'GEOMETRY_WKT','COORDINATE_CONVERSION','FIELD_INGEST','ROUTING_ANALYSIS',
    'EVIDENCE_EXPORT','REAL_WORLD_RENDERING'
  ]::text[]) then
    raise exception 'UNSUPPORTED_GIS_OPERATION' using errcode = '22023';
  end if;
  if p_status is null or p_status <> all (array['requested','completed','partial','blocked','failed']::text[]) then
    raise exception 'UNSUPPORTED_GIS_STATUS' using errcode = '22023';
  end if;

  v_input := coalesce(p_input_manifest, '{}'::jsonb);
  v_result := coalesce(p_result_manifest, '{}'::jsonb);
  v_sources := coalesce(p_source_refs, '[]'::jsonb);
  if pg_catalog.jsonb_typeof(v_input) <> 'object'
     or pg_catalog.jsonb_typeof(v_result) <> 'object'
     or pg_catalog.jsonb_typeof(v_sources) <> 'array' then
    raise exception 'GIS_MANIFEST_TYPES_INVALID' using errcode = '22023';
  end if;
  if pg_catalog.octet_length(v_input::text) > 32768
     or pg_catalog.octet_length(v_result::text) > 32768
     or pg_catalog.octet_length(v_sources::text) > 32768
     or pg_catalog.jsonb_array_length(v_sources) > 40 then
    raise exception 'GIS_MANIFEST_TOO_LARGE' using errcode = '22023';
  end if;

  v_run := coalesce(p_run_id, pg_catalog.gen_random_uuid());
  v_event := pg_catalog.gen_random_uuid();
  -- Serialize per actor so concurrent requests cannot fork the actor's hash chain.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 5910));
  select e.event_hash into v_previous
    from public.bridgepoint_gis_processing_event_v5910 as e
    where e.user_id = v_user
    order by e.recorded_at desc, e.event_id desc
    limit 1;

  v_recorded := pg_catalog.clock_timestamp();
  v_payload := pg_catalog.concat_ws(E'\n',
    v_event::text, v_run::text, v_user::text, p_operation_key, p_status,
    v_recorded::text, coalesce(v_previous, ''), v_input::text, v_result::text, v_sources::text
  );
  v_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(v_payload, 'UTF8'), 'sha256'), 'hex');

  insert into public.bridgepoint_gis_processing_event_v5910 (
    event_id, run_id, user_id, operation_key, status, input_manifest, result_manifest,
    source_refs, recorded_at, previous_hash, event_hash
  ) values (
    v_event, v_run, v_user, p_operation_key, p_status, v_input, v_result,
    v_sources, v_recorded, v_previous, v_hash
  );

  return pg_catalog.jsonb_build_object(
    'event_id', v_event,
    'run_id', v_run,
    'operation_key', p_operation_key,
    'status', p_status,
    'recorded_at', v_recorded,
    'previous_hash', v_previous,
    'event_hash', v_hash,
    'hash_algorithm', 'SHA-256',
    'chain_scope', 'per authenticated user',
    'integrity_note', 'Tamper-evident for app roles; privileged database administrators remain trusted.'
  );
end;
$function$;

revoke all on function public.bridgepoint_gis_record_processing_event_v5910(uuid,text,text,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.bridgepoint_gis_record_processing_event_v5910(uuid,text,text,jsonb,jsonb,jsonb) to authenticated;

create or replace function public.bridgepoint_gis_processing_history_v5910(p_limit integer default 20)
returns table (
  event_id uuid,
  run_id uuid,
  operation_key text,
  status text,
  input_manifest jsonb,
  result_manifest jsonb,
  source_refs jsonb,
  recorded_at timestamptz,
  previous_hash text,
  event_hash text
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select e.event_id, e.run_id, e.operation_key, e.status, e.input_manifest, e.result_manifest,
         e.source_refs, e.recorded_at, e.previous_hash, e.event_hash
  from public.bridgepoint_gis_processing_event_v5910 as e
  where e.user_id = (select auth.uid())
  order by e.recorded_at desc, e.event_id desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$function$;

revoke all on function public.bridgepoint_gis_processing_history_v5910(integer) from public, anon;
grant execute on function public.bridgepoint_gis_processing_history_v5910(integer) to authenticated;

comment on table public.bridgepoint_gis_processing_event_v5910 is
  'Authenticated append-only GIS task ledger with per-user SHA-256 hash links and source manifests. Not immutable against privileged database administrators.';
