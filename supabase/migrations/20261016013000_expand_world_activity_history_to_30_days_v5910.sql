-- Restore the full 30-day range offered by the public world-activity scrubber.
-- Keep the client-clock clamp and all existing source/provenance filters.
DO $migration$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(
    'public.bridgepoint_public_world_activity_v5908(double precision,double precision,double precision,double precision,timestamp with time zone,integer,integer)'::regprocedure
  ) INTO v_def;

  IF position('v_hours integer := least(greatest(coalesce(p_window_hours,24),1),48);' in v_def)=0
     AND position('v_hours integer := least(greatest(coalesce(p_window_hours,24),1),720);' in v_def)=0 THEN
    RAISE EXCEPTION 'Expected world-activity history-window assignment not found; aborting safely';
  END IF;

  v_def := replace(
    v_def,
    'v_hours integer := least(greatest(coalesce(p_window_hours,24),1),48);',
    'v_hours integer := least(greatest(coalesce(p_window_hours,24),1),720);'
  );

  EXECUTE v_def;
END
$migration$;
