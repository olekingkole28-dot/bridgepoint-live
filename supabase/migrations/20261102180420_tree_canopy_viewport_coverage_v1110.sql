-- Tree viewport coverage v1110.
-- Record completed raster sub-cells so partial cached data cannot be mistaken
-- for a fully processed visible region. Empty canopy cells are recorded too.

CREATE TABLE IF NOT EXISTS analytics.global_tree_canopy_coverage_v1110 (
  coverage_key text PRIMARY KEY,
  source_key text NOT NULL DEFAULT 'META_WRI_CHMV2_LOCAL_MAXIMA_V1109',
  source_version integer NOT NULL DEFAULT 1109,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE analytics.global_tree_canopy_coverage_v1110 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE analytics.global_tree_canopy_coverage_v1110 FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE analytics.global_tree_canopy_coverage_v1110 TO service_role;

CREATE OR REPLACE FUNCTION public.bridgepoint_tree_canopy_coverage_get_v1110(p_keys text[])
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'analytics'
AS $function$
  SELECT COALESCE(array_agg(c.coverage_key), ARRAY[]::text[])
  FROM analytics.global_tree_canopy_coverage_v1110 c
  WHERE c.coverage_key = ANY(COALESCE(p_keys, ARRAY[]::text[]))
    AND c.source_key = 'META_WRI_CHMV2_LOCAL_MAXIMA_V1109'
    AND c.source_version = 1109;
$function$;

CREATE OR REPLACE FUNCTION public.bridgepoint_tree_canopy_coverage_mark_v1110(p_keys text[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'analytics'
AS $function$
DECLARE
  n integer;
BEGIN
  INSERT INTO analytics.global_tree_canopy_coverage_v1110
    (coverage_key, source_key, source_version, processed_at)
  SELECT DISTINCT k, 'META_WRI_CHMV2_LOCAL_MAXIMA_V1109', 1109, now()
  FROM unnest(COALESCE(p_keys, ARRAY[]::text[])) AS k
  WHERE k IS NOT NULL AND length(k) BETWEEN 1 AND 160
  ON CONFLICT (coverage_key) DO UPDATE
    SET source_key = EXCLUDED.source_key,
        source_version = EXCLUDED.source_version,
        processed_at = EXCLUDED.processed_at;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;

REVOKE ALL ON FUNCTION public.bridgepoint_tree_canopy_coverage_get_v1110(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bridgepoint_tree_canopy_coverage_mark_v1110(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bridgepoint_tree_canopy_coverage_get_v1110(text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.bridgepoint_tree_canopy_coverage_mark_v1110(text[]) TO service_role;
