CREATE TABLE IF NOT EXISTS public.bridgepoint_map_opportunity_state_snapshot_v5923 (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  payload jsonb NOT NULL,
  generated_at timestamptz NOT NULL
);
ALTER TABLE public.bridgepoint_map_opportunity_state_snapshot_v5923 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bridgepoint_map_opportunity_state_snapshot_v5923 FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bridgepoint_refresh_map_opportunity_state_snapshot_v5923()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '120s'
AS $bp$
DECLARE v_payload jsonb;
BEGIN
  WITH eligible AS (
    SELECT o.property_id,
      coalesce(nullif(upper(trim(p.state_code::text)),''),'UNKNOWN') AS state_code
    FROM opportunity_engine.opportunities_v38 o
    JOIN core.properties p ON p.property_id=o.property_id
    WHERE p.active
      AND lower(coalesce(o.opportunity_status,'active'))='active'
      AND coalesce(o.matched_pattern_count,0)>0
      AND coalesce(o.source_count,0)>0
      AND nullif(btrim(o.intelligence_stage),'') IS NOT NULL
  ),
  by_state AS (
    SELECT state_code,count(*)::bigint AS opportunity_records,
      count(DISTINCT property_id)::bigint AS unique_properties
    FROM eligible GROUP BY state_code
  )
  SELECT jsonb_build_object(
    'version',5923,
    'generated_at',clock_timestamp(),
    'counts',jsonb_build_object(
      'opportunity_records',coalesce((SELECT sum(opportunity_records) FROM by_state),0),
      'unique_properties',coalesce((SELECT sum(unique_properties) FROM by_state),0),
      'states_with_opportunities',(SELECT count(*) FROM by_state WHERE opportunity_records>0)
    ),
    'by_state',coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.opportunity_records DESC,s.state_code) FROM by_state s),'[]'::jsonb),
    'definitions',jsonb_build_object(
      'opportunity_records','Qualified active opportunity-engine rows whose property_id resolves to an active core.properties record and state code.',
      'unique_properties','Distinct property IDs per state; properties belong to one state in this table.',
      'scope','Main-map U.S. opportunity-engine cohort. International risk-review rows are reported separately by country.'
    )
  ) INTO v_payload;

  INSERT INTO public.bridgepoint_map_opportunity_state_snapshot_v5923(singleton,payload,generated_at)
  VALUES(true,v_payload,clock_timestamp())
  ON CONFLICT(singleton) DO UPDATE SET payload=EXCLUDED.payload,generated_at=EXCLUDED.generated_at;
  RETURN v_payload;
END
$bp$;

CREATE OR REPLACE FUNCTION public.bridgepoint_public_map_opportunity_summary_v5920()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $bp$
  SELECT s.payload || jsonb_build_object(
    'by_state',coalesce(ss.payload->'by_state','[]'::jsonb),
    'state_counts',coalesce(ss.payload->'counts','{}'::jsonb),
    'state_snapshot_generated_at',ss.generated_at
  )
  FROM public.bridgepoint_map_opportunity_snapshot_v5920 s
  LEFT JOIN public.bridgepoint_map_opportunity_state_snapshot_v5923 ss ON ss.singleton=true
  WHERE s.singleton=true
$bp$;

REVOKE ALL ON FUNCTION public.bridgepoint_refresh_map_opportunity_state_snapshot_v5923() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bridgepoint_refresh_map_opportunity_state_snapshot_v5923() TO service_role;
REVOKE ALL ON FUNCTION public.bridgepoint_public_map_opportunity_summary_v5920() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bridgepoint_public_map_opportunity_summary_v5920() TO anon,authenticated,service_role;

INSERT INTO public.bridgepoint_map_opportunity_state_snapshot_v5923(singleton,payload,generated_at)
VALUES(true,jsonb_build_object(
  'version',5923,
  'generated_at',clock_timestamp(),
  'counts',jsonb_build_object('opportunity_records',1311009,'unique_properties',332357,'states_with_opportunities',18),
  'by_state',jsonb_build_array(
    jsonb_build_object('state_code','CT','opportunity_records',1296546,'unique_properties',329177),
    jsonb_build_object('state_code','IL','opportunity_records',6256,'unique_properties',1361),
    jsonb_build_object('state_code','OH','opportunity_records',4181,'unique_properties',954),
    jsonb_build_object('state_code','AR','opportunity_records',1540,'unique_properties',316),
    jsonb_build_object('state_code','IN','opportunity_records',794,'unique_properties',187),
    jsonb_build_object('state_code','NE','opportunity_records',579,'unique_properties',121),
    jsonb_build_object('state_code','OK','opportunity_records',318,'unique_properties',64),
    jsonb_build_object('state_code','WI','opportunity_records',198,'unique_properties',42),
    jsonb_build_object('state_code','CO','opportunity_records',185,'unique_properties',37),
    jsonb_build_object('state_code','MN','opportunity_records',155,'unique_properties',31),
    jsonb_build_object('state_code','UT','opportunity_records',134,'unique_properties',37),
    jsonb_build_object('state_code','DE','opportunity_records',65,'unique_properties',13),
    jsonb_build_object('state_code','MA','opportunity_records',15,'unique_properties',3),
    jsonb_build_object('state_code','FL','opportunity_records',10,'unique_properties',2),
    jsonb_build_object('state_code','NC','opportunity_records',10,'unique_properties',5),
    jsonb_build_object('state_code','NY','opportunity_records',9,'unique_properties',3),
    jsonb_build_object('state_code','NJ','opportunity_records',9,'unique_properties',3),
    jsonb_build_object('state_code','TX','opportunity_records',5,'unique_properties',1)
  ),
  'definitions',jsonb_build_object('opportunity_records','Qualified active opportunity-engine rows joined to active core.properties.','unique_properties','Distinct property IDs per state.','scope','Main-map U.S. opportunity-engine cohort; international risk-review rows are separate.')
),clock_timestamp())
ON CONFLICT(singleton) DO NOTHING;

DO $schedule$
DECLARE v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname='bridgepoint-map-opportunity-state-snapshot-v5923' LIMIT 1;
  IF v_job_id IS NOT NULL THEN PERFORM cron.unschedule(v_job_id); END IF;
  PERFORM cron.schedule('bridgepoint-map-opportunity-state-snapshot-v5923','23 * * * *',
    'SELECT public.bridgepoint_refresh_map_opportunity_state_snapshot_v5923();');
END
$schedule$;
