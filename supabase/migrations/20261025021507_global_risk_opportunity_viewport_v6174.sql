CREATE OR REPLACE FUNCTION public.bridgepoint_public_global_risk_viewport_v6174(p_west double precision, p_south double precision, p_east double precision, p_north double precision, p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'core', 'analytics', 'opportunity_engine', 'intelligence'
 SET statement_timeout TO '3000ms'
AS $function$
DECLARE
  env geometry;
  area_deg2 double precision;
  lim integer := least(greatest(coalesce(p_limit,100),1),300);
  features jsonb := '[]'::jsonb;
  v_returned integer := 0;
BEGIN
  IF p_west IS NULL OR p_south IS NULL OR p_east IS NULL OR p_north IS NULL
     OR p_west < -180 OR p_east > 180 OR p_south < -90 OR p_north > 90
     OR p_west >= p_east OR p_south >= p_north THEN
    RETURN jsonb_build_object(
      'version',6174,'resolved',false,'returned',0,'viewport_mode','INVALID',
      'geojson',jsonb_build_object('type','FeatureCollection','features','[]'::jsonb),
      'truth_notice','Invalid viewport. No risk-review records were returned.'
    );
  END IF;

  env := public.st_makeenvelope(p_west,p_south,p_east,p_north,4326);
  area_deg2 := (p_east-p_west)*(p_north-p_south);

  IF area_deg2 > 10 THEN
    WITH base AS MATERIALIZED (
      SELECT
        o.global_property_id,o.country_code,o.opportunity_key,o.opportunity_name,
        o.opportunity_family,o.opportunity_score,o.confidence_score,o.reason,
        o.recommended_action,o.opportunity_status,o.first_detected_at,o.latest_evidence_at,o.updated_at,
        i.centroid_geom,
        coalesce(s.signal_count,0) AS source_count,
        coalesce(s.pattern_count,0) AS matched_pattern_count,
        CASE
          WHEN upper(o.opportunity_key) LIKE '%PRECIPITATION%' OR upper(o.opportunity_key) LIKE '%RAIN%' THEN 'RAIN'
          WHEN upper(o.opportunity_key) LIKE '%FLOOD%' OR upper(o.opportunity_key) LIKE '%WATER%' THEN 'WATER'
          WHEN upper(o.opportunity_key) LIKE '%WIND%' OR upper(o.opportunity_key) LIKE '%STORM%' OR upper(o.opportunity_key) LIKE '%HURRICANE%' THEN 'STORM'
          WHEN upper(o.opportunity_key) LIKE '%FIRE%' OR upper(o.opportunity_key) LIKE '%WILDFIRE%' THEN 'FIRE'
          ELSE 'EXPOSURE'
        END AS icon_key
      FROM opportunity_engine.global_opportunities_v5825 o
      JOIN core.global_property_identities_v953 i ON i.global_property_id=o.global_property_id
      LEFT JOIN intelligence.global_property_scores_v5825 s ON s.global_property_id=o.global_property_id
      WHERE upper(coalesce(o.opportunity_status,''))='ACTIVE'
        AND upper(coalesce(o.opportunity_family,''))='GLOBAL_PROPERTY_RISK'
        AND i.active AND i.centroid_geom IS NOT NULL AND i.centroid_geom && env
    ),
    per_property AS (
      SELECT b.*,
        row_number() OVER (
          PARTITION BY b.global_property_id
          ORDER BY b.opportunity_score DESC NULLS LAST,b.latest_evidence_at DESC NULLS LAST,b.opportunity_key
        ) AS property_rn
      FROM base b
    ),
    grid_ranked AS (
      SELECT p.*,
        row_number() OVER (
          PARTITION BY floor((public.st_y(p.centroid_geom)+90))::integer,
                       floor((public.st_x(p.centroid_geom)+180))::integer
          ORDER BY p.opportunity_score DESC NULLS LAST,p.latest_evidence_at DESC NULLS LAST,p.global_property_id
        ) AS grid_rn
      FROM per_property p
      WHERE p.property_rn=1
    ),
    encoded AS (
      SELECT jsonb_build_object(
        'type','Feature',
        'id','global-risk:'||global_property_id::text||':'||opportunity_key,
        'geometry',public.st_asgeojson(public.st_force2d(centroid_geom),7,0)::jsonb,
        'properties',jsonb_build_object(
          'global_property_id',global_property_id,
          'country_code',country_code,
          'building_id',NULL,
          'icon_key',icon_key,
          'map_color_key',icon_key,
          'map_color_label',CASE icon_key
            WHEN 'RAIN' THEN 'Precipitation exposure review'
            WHEN 'WATER' THEN 'Flood / water resilience review'
            WHEN 'STORM' THEN 'Wind / storm exposure review'
            WHEN 'FIRE' THEN 'Fire exposure review'
            ELSE 'Multi-hazard resilience review'
          END,
          'specific_opportunity',coalesce(nullif(btrim(opportunity_name),''),nullif(btrim(opportunity_key),''),'Global property risk review'),
          'opportunity_key',opportunity_key,
          'vertical_key','RISK_RESILIENCE',
          'opportunity_family',opportunity_family,
          'record_kind','RISK_REVIEW',
          'source_count',source_count,
          'matched_pattern_count',matched_pattern_count,
          'opportunity_score',opportunity_score,
          'confidence_score',confidence_score,
          'color',CASE icon_key
            WHEN 'RAIN' THEN '#4aa3ff'
            WHEN 'WATER' THEN '#00a8ff'
            WHEN 'STORM' THEN '#9b7cff'
            WHEN 'FIRE' THEN '#ff6b4a'
            ELSE '#ff8a00'
          END,
          'label',coalesce(nullif(btrim(opportunity_name),''),'Global property risk review'),
          'opportunity_count',1,
          'corroborated',source_count>=2 AND matched_pattern_count>=2,
          'latest_evidence_at',latest_evidence_at,
          'record_updated_at',updated_at
        )
      ) AS feature
      FROM grid_ranked
      WHERE grid_rn=1
      ORDER BY opportunity_score DESC NULLS LAST,latest_evidence_at DESC NULLS LAST,global_property_id
      LIMIT lim
    )
    SELECT coalesce(jsonb_agg(feature),'[]'::jsonb) INTO features FROM encoded;
  ELSE
    WITH base AS MATERIALIZED (
      SELECT
        o.global_property_id,o.country_code,o.opportunity_key,o.opportunity_name,
        o.opportunity_family,o.opportunity_score,o.confidence_score,o.reason,
        o.recommended_action,o.opportunity_status,o.first_detected_at,o.latest_evidence_at,o.updated_at,
        i.centroid_geom,i.parcel_geom,
        coalesce(s.signal_count,0) AS source_count,
        coalesce(s.pattern_count,0) AS matched_pattern_count,
        CASE
          WHEN upper(o.opportunity_key) LIKE '%PRECIPITATION%' OR upper(o.opportunity_key) LIKE '%RAIN%' THEN 'RAIN'
          WHEN upper(o.opportunity_key) LIKE '%FLOOD%' OR upper(o.opportunity_key) LIKE '%WATER%' THEN 'WATER'
          WHEN upper(o.opportunity_key) LIKE '%WIND%' OR upper(o.opportunity_key) LIKE '%STORM%' OR upper(o.opportunity_key) LIKE '%HURRICANE%' THEN 'STORM'
          WHEN upper(o.opportunity_key) LIKE '%FIRE%' OR upper(o.opportunity_key) LIKE '%WILDFIRE%' THEN 'FIRE'
          ELSE 'EXPOSURE'
        END AS icon_key
      FROM opportunity_engine.global_opportunities_v5825 o
      JOIN core.global_property_identities_v953 i ON i.global_property_id=o.global_property_id
      LEFT JOIN intelligence.global_property_scores_v5825 s ON s.global_property_id=o.global_property_id
      WHERE upper(coalesce(o.opportunity_status,''))='ACTIVE'
        AND upper(coalesce(o.opportunity_family,''))='GLOBAL_PROPERTY_RISK'
        AND i.active AND i.centroid_geom IS NOT NULL AND i.centroid_geom && env
    ),
    per_property AS (
      SELECT b.*,
        row_number() OVER (
          PARTITION BY b.global_property_id
          ORDER BY b.opportunity_score DESC NULLS LAST,b.latest_evidence_at DESC NULLS LAST,b.opportunity_key
        ) AS property_rn
      FROM base b
    ),
    chosen AS MATERIALIZED (
      SELECT p.*
      FROM per_property p
      WHERE p.property_rn=1
      ORDER BY p.opportunity_score DESC NULLS LAST,p.latest_evidence_at DESC NULLS LAST,p.global_property_id
      LIMIT lim
    ),
    matched AS (
      SELECT c.*,b.building_id,b.geometry,
        coalesce(nullif(b.height_m,0),CASE WHEN b.num_floors BETWEEN 1 AND 250 THEN b.num_floors*3.2 END,8.5)::real AS render_height_m
      FROM chosen c
      LEFT JOIN LATERAL (
        SELECT g.building_id,g.geometry,g.height_m,g.num_floors
        FROM analytics.universal_building_geometry_v918 g
        WHERE c.parcel_geom IS NOT NULL
          AND g.country_code=c.country_code
          AND g.geometry && c.parcel_geom
          AND public.st_intersects(g.geometry,c.parcel_geom)
        ORDER BY public.st_area(public.st_intersection(g.geometry,c.parcel_geom)::geography) DESC NULLS LAST,
                 g.building_id
        LIMIT 3
      ) b ON true
    ),
    encoded AS (
      SELECT jsonb_build_object(
        'type','Feature',
        'id','global-risk:'||global_property_id::text||':'||opportunity_key||':'||coalesce(building_id::text,'point'),
        'geometry',CASE WHEN geometry IS NULL
          THEN public.st_asgeojson(public.st_force2d(centroid_geom),7,0)::jsonb
          ELSE public.st_asgeojson(public.st_simplifypreservetopology(public.st_force2d(geometry),0.0000004),7,0)::jsonb END,
        'properties',jsonb_build_object(
          'global_property_id',global_property_id,
          'country_code',country_code,
          'building_id',building_id,
          'icon_key',icon_key,
          'map_color_key',icon_key,
          'map_color_label',CASE icon_key
            WHEN 'RAIN' THEN 'Precipitation exposure review'
            WHEN 'WATER' THEN 'Flood / water resilience review'
            WHEN 'STORM' THEN 'Wind / storm exposure review'
            WHEN 'FIRE' THEN 'Fire exposure review'
            ELSE 'Multi-hazard resilience review'
          END,
          'specific_opportunity',coalesce(nullif(btrim(opportunity_name),''),nullif(btrim(opportunity_key),''),'Global property risk review'),
          'opportunity_key',opportunity_key,
          'vertical_key','RISK_RESILIENCE',
          'opportunity_family',opportunity_family,
          'record_kind','RISK_REVIEW',
          'source_count',source_count,
          'matched_pattern_count',matched_pattern_count,
          'opportunity_score',opportunity_score,
          'confidence_score',confidence_score,
          'color',CASE icon_key
            WHEN 'RAIN' THEN '#4aa3ff'
            WHEN 'WATER' THEN '#00a8ff'
            WHEN 'STORM' THEN '#9b7cff'
            WHEN 'FIRE' THEN '#ff6b4a'
            ELSE '#ff8a00'
          END,
          'label',coalesce(nullif(btrim(opportunity_name),''),'Global property risk review'),
          'render_height_m',render_height_m,
          'base_height_m',0,
          'opportunity_count',1,
          'corroborated',source_count>=2 AND matched_pattern_count>=2,
          'latest_evidence_at',latest_evidence_at,
          'record_updated_at',updated_at
        )
      ) AS feature
      FROM matched
    )
    SELECT coalesce(jsonb_agg(feature),'[]'::jsonb) INTO features FROM encoded;
  END IF;

  v_returned := jsonb_array_length(features);
  RETURN jsonb_build_object(
    'version',6174,
    'resolved',true,
    'returned',v_returned,
    'viewport_mode',CASE WHEN area_deg2>10 THEN 'GLOBAL_RISK_GRID_POINTS' ELSE 'LOCAL_RISK_BUILDING_GEOMETRY_WHERE_LINKED' END,
    'source','opportunity_engine.global_opportunities_v5825',
    'geojson',jsonb_build_object('type','FeatureCollection','features',features),
    'truth_notice','These are source-backed global property risk/resilience reviews, not current weather watches, warnings, proof of damage, or guaranteed commercial work.',
    'privacy_notice','No property address, owner, contact details, or raw evidence payload is returned.'
  );
END
$function$;

REVOKE ALL ON FUNCTION public.bridgepoint_public_global_risk_viewport_v6174(double precision,double precision,double precision,double precision,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bridgepoint_public_global_risk_viewport_v6174(double precision,double precision,double precision,double precision,integer) TO anon, authenticated, service_role;
