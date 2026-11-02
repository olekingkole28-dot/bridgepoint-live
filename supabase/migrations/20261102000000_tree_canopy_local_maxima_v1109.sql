-- Tree placement v1109:
-- Use canopy-height local maxima as estimated crown centres and exclude any
-- point covered by an authoritative global building footprint.
-- Existing v1101 rows are retained for rollback/audit and are not deleted.

CREATE OR REPLACE FUNCTION public.bridgepoint_global_tree_cache_upsert_v1104(p_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'analytics'
SET statement_timeout TO '8000ms'
AS $function$
DECLARE
  n integer;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RETURN 0;
  END IF;

  WITH incoming AS (
    SELECT
      x.source_key,
      x.source_record_id,
      x.tile_key,
      ST_SetSRID(ST_MakePoint(x.lon, x.lat), 4326) AS geom,
      x.height_m,
      x.render_height_m,
      x.trunk_height_m,
      x.crown_diameter_m,
      x.trunk_diameter_m,
      x.leaf_cycle,
      x.species,
      x.position_truth,
      x.height_truth,
      COALESCE(x.properties, '{}'::jsonb) AS properties
    FROM jsonb_to_recordset(p_rows) AS x(
      source_key text,
      source_record_id text,
      tile_key text,
      lon double precision,
      lat double precision,
      height_m double precision,
      render_height_m double precision,
      trunk_height_m double precision,
      crown_diameter_m double precision,
      trunk_diameter_m double precision,
      leaf_cycle text,
      species text,
      position_truth text,
      height_truth text,
      properties jsonb
    )
  )
  INSERT INTO analytics.global_tree_render_cache_v1101 (
    source_key, source_record_id, tile_key, geometry, height_m, render_height_m,
    trunk_height_m, crown_diameter_m, trunk_diameter_m, leaf_cycle, species,
    position_truth, height_truth, properties, generated_at
  )
  SELECT
    i.source_key,
    i.source_record_id,
    i.tile_key,
    i.geom,
    i.height_m,
    i.render_height_m,
    i.trunk_height_m,
    i.crown_diameter_m,
    i.trunk_diameter_m,
    i.leaf_cycle,
    i.species,
    i.position_truth,
    i.height_truth,
    i.properties,
    now()
  FROM incoming i
  WHERE i.source_key = 'META_WRI_CHMV2_LOCAL_MAXIMA_V1109'
    AND i.position_truth = 'CHMV2_LOCAL_CANOPY_PEAK_ESTIMATE_V1109'
    AND i.height_truth = 'MODELED_CANOPY_HEIGHT_META_WRI_DINOV3_V2'
    AND i.geom IS NOT NULL
    AND ST_X(i.geom) BETWEEN -180 AND 180
    AND ST_Y(i.geom) BETWEEN -85.05112878 AND 85.05112878
    AND i.height_m BETWEEN 2.5 AND 80
    AND i.render_height_m BETWEEN 2.5 AND 80
    AND NOT EXISTS (
      SELECT 1
      FROM analytics.universal_building_geometry_v918 b
      WHERE b.geometry && i.geom
        AND ST_Covers(b.geometry, i.geom)
    )
  ON CONFLICT (source_key, source_record_id) DO UPDATE SET
    tile_key = EXCLUDED.tile_key,
    geometry = EXCLUDED.geometry,
    height_m = EXCLUDED.height_m,
    render_height_m = EXCLUDED.render_height_m,
    trunk_height_m = EXCLUDED.trunk_height_m,
    crown_diameter_m = EXCLUDED.crown_diameter_m,
    trunk_diameter_m = EXCLUDED.trunk_diameter_m,
    leaf_cycle = EXCLUDED.leaf_cycle,
    species = EXCLUDED.species,
    position_truth = EXCLUDED.position_truth,
    height_truth = EXCLUDED.height_truth,
    properties = EXCLUDED.properties,
    generated_at = now();

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;

CREATE OR REPLACE FUNCTION public.bridgepoint_global_tree_cache_viewport_v1102(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_limit integer DEFAULT 1200
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'analytics'
SET statement_timeout TO '8000ms'
AS $function$
  WITH env AS (
    SELECT ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326) AS g
  ),
  picked AS (
    SELECT
      t.source_key,
      t.source_record_id,
      t.tile_key,
      ST_AsGeoJSON(t.geometry, 7, 0)::jsonb AS geom,
      t.height_m,
      t.render_height_m,
      t.trunk_height_m,
      t.crown_diameter_m,
      t.trunk_diameter_m,
      t.leaf_cycle,
      t.species,
      t.position_truth,
      t.height_truth,
      t.properties
    FROM analytics.global_tree_render_cache_v1101 t
    CROSS JOIN env
    WHERE t.source_key = 'META_WRI_CHMV2_LOCAL_MAXIMA_V1109'
      AND t.position_truth = 'CHMV2_LOCAL_CANOPY_PEAK_ESTIMATE_V1109'
      AND t.geometry && env.g
      AND ST_Intersects(t.geometry, env.g)
      AND NOT EXISTS (
        SELECT 1
        FROM analytics.universal_building_geometry_v918 b
        WHERE b.geometry && t.geometry
          AND ST_Covers(b.geometry, t.geometry)
      )
    ORDER BY t.tile_key, t.source_record_id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 1200), 50), 3000)
  )
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'version', 1109,
    'features', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'geometry', geom,
          'properties', jsonb_build_object(
            'layer_key', 'TREE_OBJECTS_3D',
            'asset_kind', 'tree',
            'class', 'tree',
            'source_key', source_key,
            'source_record_id', source_record_id,
            'tile_key', tile_key,
            'height_m', height_m,
            'render_height_m', render_height_m,
            'trunk_height_m', trunk_height_m,
            'crown_diameter_m', crown_diameter_m,
            'trunk_diameter_m', trunk_diameter_m,
            'leaf_cycle', leaf_cycle,
            'species', species,
            'position_truth', position_truth,
            'height_truth', height_truth,
            'properties', properties
          )
        )
      ),
      '[]'::jsonb
    )
  )
  FROM picked;
$function$;

REVOKE ALL ON FUNCTION public.bridgepoint_global_tree_cache_upsert_v1104(jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bridgepoint_global_tree_cache_viewport_v1102(
  double precision, double precision, double precision, double precision, integer
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.bridgepoint_global_tree_cache_upsert_v1104(jsonb)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.bridgepoint_global_tree_cache_viewport_v1102(
  double precision, double precision, double precision, double precision, integer
) TO service_role;
