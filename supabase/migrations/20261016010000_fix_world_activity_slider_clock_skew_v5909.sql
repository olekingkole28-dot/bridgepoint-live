-- Tolerate client clock skew in the public 30-day world-activity slider.
-- The browser timestamp is only a requested upper bound; never query beyond database time.
DO $migration$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(
    'public.bridgepoint_public_world_activity_v5908(double precision,double precision,double precision,double precision,timestamp with time zone,integer,integer)'::regprocedure
  ) INTO v_def;

  IF position('v_at timestamptz := coalesce(p_at,now());' in v_def)=0
     AND position('v_at timestamptz := least(coalesce(p_at,now()),now());' in v_def)=0 THEN
    RAISE EXCEPTION 'Expected world-activity clock assignment not found; aborting safely';
  END IF;

  v_def := replace(
    v_def,
    'v_at timestamptz := coalesce(p_at,now());',
    'v_at timestamptz := least(coalesce(p_at,now()),now());'
  );

  EXECUTE v_def;
END
$migration$;
