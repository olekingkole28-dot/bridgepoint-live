CREATE OR REPLACE FUNCTION public.bridgepoint_public_opportunity_viewport_v5907(p_west double precision, p_south double precision, p_east double precision, p_north double precision, p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'core', 'analytics', 'opportunity_engine', 'bridgepoint_public_internal'
 SET statement_timeout TO '3500ms'
AS $function$
DECLARE
  env geometry;
  area_deg2 double precision;
  lim integer := least(greatest(coalesce(p_limit,100),1),500);
  pool_limit integer := 2000;
  candidates jsonb := '[]'::jsonb;
  v_returned integer := 0;
  v_fresh integer := 0;
  v_stale integer := 0;
BEGIN
  IF p_west IS NULL OR p_south IS NULL OR p_east IS NULL OR p_north IS NULL
     OR p_west < -180 OR p_east > 180 OR p_south < -90 OR p_north > 90
     OR p_west >= p_east OR p_south >= p_north THEN
    RETURN jsonb_build_object('version',5907,'resolved',false,'returned',0,
      'geojson',jsonb_build_object('type','FeatureCollection','features','[]'::jsonb),
      'error','INVALID_VIEWPORT');
  END IF;

  env := public.st_makeenvelope(p_west,p_south,p_east,p_north,4326);
  area_deg2 := (p_east-p_west)*(p_north-p_south);

  IF area_deg2 > 10 THEN
    WITH pool AS MATERIALIZED (
      SELECT o.opportunity_id,o.property_id,o.opportunity_key,o.opportunity_name,
             o.vertical_key,o.opportunity_family,o.opportunity_status,
             o.opportunity_score,o.urgency_score,o.confidence_score,
             o.source_count,o.matched_pattern_count,o.intelligence_stage,
             o.latest_evidence_at,o.updated_at
      FROM opportunity_engine.opportunities_v38 o
      WHERE lower(coalesce(o.opportunity_status,'active'))='active'
        AND coalesce(o.matched_pattern_count,0)>0
        AND coalesce(o.source_count,0)>0
        AND nullif(btrim(o.intelligence_stage),'') IS NOT NULL
      ORDER BY o.opportunity_score DESC NULLS LAST,
               o.urgency_score DESC NULLS LAST,
               o.updated_at DESC NULLS LAST,o.opportunity_id
      LIMIT pool_limit
    ),
    joined AS MATERIALIZED (
      SELECT o.*,p.centroid_geom,p.state_code
      FROM pool o
      JOIN core.properties p ON p.property_id=o.property_id
      WHERE p.active AND p.centroid_geom IS NOT NULL AND p.centroid_geom && env
    ),
    property_ranked AS (
      SELECT j.*,
             count(*) OVER(PARTITION BY j.property_id) AS opportunity_count,
             row_number() OVER(PARTITION BY j.property_id ORDER BY
               j.opportunity_score DESC NULLS LAST,
               j.latest_evidence_at DESC NULLS LAST,j.opportunity_id) AS property_rn
      FROM joined j
    ),
    balanced AS (
      SELECT p.*,
             row_number() OVER(PARTITION BY coalesce(nullif(btrim(p.state_code::text),''),'US')
               ORDER BY p.opportunity_score DESC NULLS LAST,
                        p.latest_evidence_at DESC NULLS LAST,p.property_id) AS state_rn
      FROM property_ranked p
      WHERE p.property_rn=1
    ),
    chosen AS (
      SELECT b.*,
        core.opportunity_icon_key_v965(b.opportunity_family,b.opportunity_key,b.vertical_key,b.opportunity_name) AS icon_key
      FROM balanced b
      ORDER BY b.state_rn,
               b.opportunity_score DESC NULLS LAST,
               b.latest_evidence_at DESC NULLS LAST,b.property_id
      LIMIT lim
    ),
    encoded AS (
      SELECT jsonb_build_object(
        'type','Feature',
        'id',property_id::text||':'||opportunity_key,
        'geometry',public.st_asgeojson(public.st_force2d(centroid_geom),7,0)::jsonb,
        'properties',jsonb_build_object(
          'building_id',NULL,
          'icon_key',icon_key,
          'color',CASE icon_key
            WHEN 'ROOF' THEN '#fff200' WHEN 'STORM' THEN '#b026ff' WHEN 'FIRE' THEN '#ff3b19'
            WHEN 'WATER' THEN '#00a8ff' WHEN 'SOLAR' THEN '#ffe600' WHEN 'DEVELOPMENT' THEN '#00f0ff'
            WHEN 'INVESTMENT' THEN '#39ff88' WHEN 'COMPLIANCE' THEN '#ff8a00' ELSE '#ff2bd6' END,
          'label',CASE icon_key
            WHEN 'ROOF' THEN 'Roof opportunity' WHEN 'STORM' THEN 'Storm opportunity'
            WHEN 'FIRE' THEN 'Fire opportunity' WHEN 'WATER' THEN 'Water opportunity'
            WHEN 'SOLAR' THEN 'Solar opportunity' WHEN 'DEVELOPMENT' THEN 'Development opportunity'
            WHEN 'INVESTMENT' THEN 'Investment opportunity' WHEN 'COMPLIANCE' THEN 'Compliance opportunity'
            ELSE 'Property opportunity' END,
          'opportunity_count',opportunity_count,
          'corroborated',coalesce(source_count,0)>=2 AND coalesce(matched_pattern_count,0)>=2,
          'evidence_age_days',CASE WHEN latest_evidence_at IS NULL THEN NULL
            ELSE greatest(0,floor(extract(epoch FROM (now()-latest_evidence_at))/86400)) END,
          'freshness',CASE WHEN latest_evidence_at IS NULL THEN 'UNDATED'
            WHEN latest_evidence_at >= now()-interval '72 hours' THEN 'FRESH'
            WHEN latest_evidence_at >= now()-interval '14 days' THEN 'RECENT'
            WHEN latest_evidence_at >= now()-interval '45 days' THEN 'AGING'
            ELSE 'STALE' END,
          'record_updated_at',updated_at
        )
      ) feature
      FROM chosen
    )
    SELECT coalesce(jsonb_agg(feature),'[]'::jsonb) INTO candidates FROM encoded;
  ELSE
    WITH spatial_properties AS MATERIALIZED (
      SELECT p.property_id,p.centroid_geom,p.state_code
      FROM core.properties p
      WHERE p.active AND p.centroid_geom IS NOT NULL AND p.centroid_geom && env
      LIMIT 1500
    ),
    /*
      Drive opportunity lookups from the spatially bounded property set.
      The previous equality join let PostgreSQL scan ~1.31M active opportunity
      rows, then hash-filter against these 1,500 properties. LATERAL uses the
      property_id index for each candidate and preserves one best opportunity
      plus the count of all qualifying opportunities for that property.
    */
    joined AS MATERIALIZED (
      SELECT o.opportunity_id,o.property_id,o.opportunity_key,o.opportunity_name,
             o.vertical_key,o.opportunity_family,o.opportunity_status,
             o.opportunity_score,o.urgency_score,o.confidence_score,
             o.source_count,o.matched_pattern_count,o.intelligence_stage,
             o.latest_evidence_at,o.updated_at,o.opportunity_count,
             p.centroid_geom,p.state_code
      FROM spatial_properties p
      JOIN LATERAL (
        SELECT q.opportunity_id,q.property_id,q.opportunity_key,q.opportunity_name,
               q.vertical_key,q.opportunity_family,q.opportunity_status,
               q.opportunity_score,q.urgency_score,q.confidence_score,
               q.source_count,q.matched_pattern_count,q.intelligence_stage,
               q.latest_evidence_at,q.updated_at,
               count(*) OVER() AS opportunity_count
        FROM opportunity_engine.opportunities_v38 q
        WHERE q.property_id=p.property_id
          AND lower(coalesce(q.opportunity_status,'active'))='active'
          AND coalesce(q.matched_pattern_count,0)>0
          AND coalesce(q.source_count,0)>0
          AND nullif(btrim(q.intelligence_stage),'') IS NOT NULL
        ORDER BY q.opportunity_score DESC NULLS LAST,
                 q.latest_evidence_at DESC NULLS LAST,q.opportunity_id
        LIMIT 1
      ) o ON true
    ),
    selected AS MATERIALIZED (
      SELECT j.*,core.opportunity_icon_key_v965(j.opportunity_family,j.opportunity_key,j.vertical_key,j.opportunity_name) AS icon_key
      FROM joined j
      ORDER BY j.opportunity_score DESC NULLS LAST,j.latest_evidence_at DESC NULLS LAST,
        j.updated_at DESC NULLS LAST
      LIMIT least(lim,120)
    ),
    matched AS (
      SELECT s.*,b.building_id,b.geometry,
        coalesce(nullif(b.height_m,0),CASE WHEN b.num_floors BETWEEN 1 AND 250 THEN b.num_floors*3.2 END,8.5)::real AS render_height_m
      FROM selected s
      LEFT JOIN LATERAL (
        SELECT g.building_id,g.geometry,g.height_m,g.num_floors
        FROM analytics.universal_building_geometry_v918 g
        WHERE g.geometry && public.st_expand(s.centroid_geom,0.0015)
        ORDER BY CASE WHEN public.st_covers(g.geometry,s.centroid_geom) THEN 0 ELSE 1 END,
                 g.geometry <-> s.centroid_geom
        LIMIT 1
      ) b ON true
    ),
    building_ranked AS (
      SELECT m.*,row_number() OVER(PARTITION BY coalesce(m.building_id::text,m.property_id::text)
        ORDER BY coalesce(m.source_count,0) DESC,coalesce(m.matched_pattern_count,0) DESC,
          m.opportunity_score DESC NULLS LAST,m.opportunity_id) AS building_rn
      FROM matched m
    ),
    final_rows AS (
      SELECT b.* FROM building_ranked b WHERE b.building_rn=1
      ORDER BY b.opportunity_score DESC NULLS LAST,b.latest_evidence_at DESC NULLS LAST,b.property_id
      LIMIT lim
    ),
    encoded AS (
      SELECT jsonb_build_object(
        'type','Feature',
        'id',coalesce(building_id::text,property_id::text)||':'||opportunity_key,
        'geometry',CASE WHEN geometry IS NULL
          THEN public.st_asgeojson(public.st_force2d(centroid_geom),7,0)::jsonb
          ELSE public.st_asgeojson(public.st_simplifypreservetopology(public.st_force2d(geometry),0.0000004),7,0)::jsonb END,
        'properties',jsonb_build_object(
          'building_id',building_id,'icon_key',icon_key,
          'color',CASE icon_key
            WHEN 'ROOF' THEN '#fff200' WHEN 'STORM' THEN '#b026ff' WHEN 'FIRE' THEN '#ff3b19'
            WHEN 'WATER' THEN '#00a8ff' WHEN 'SOLAR' THEN '#ffe600' WHEN 'DEVELOPMENT' THEN '#00f0ff'
            WHEN 'INVESTMENT' THEN '#39ff88' WHEN 'COMPLIANCE' THEN '#ff8a00' ELSE '#ff2bd6' END,
          'label',CASE icon_key
            WHEN 'ROOF' THEN 'Roof opportunity' WHEN 'STORM' THEN 'Storm opportunity'
            WHEN 'FIRE' THEN 'Fire opportunity' WHEN 'WATER' THEN 'Water opportunity'
            WHEN 'SOLAR' THEN 'Solar opportunity' WHEN 'DEVELOPMENT' THEN 'Development opportunity'
            WHEN 'INVESTMENT' THEN 'Investment opportunity' WHEN 'COMPLIANCE' THEN 'Compliance opportunity'
            ELSE 'Property opportunity' END,
          'render_height_m',render_height_m,'opportunity_count',opportunity_count,
          'corroborated',coalesce(source_count,0)>=2 AND coalesce(matched_pattern_count,0)>=2,
          'evidence_age_days',CASE WHEN latest_evidence_at IS NULL THEN NULL
            ELSE greatest(0,floor(extract(epoch FROM (now()-latest_evidence_at))/86400)) END,
          'freshness',CASE WHEN latest_evidence_at IS NULL THEN 'UNDATED'
            WHEN latest_evidence_at >= now()-interval '72 hours' THEN 'FRESH'
            WHEN latest_evidence_at >= now()-interval '14 days' THEN 'RECENT'
            WHEN latest_evidence_at >= now()-interval '45 days' THEN 'AGING'
            ELSE 'STALE' END,
          'record_updated_at',updated_at
        )
      ) feature
      FROM final_rows
    )
    SELECT coalesce(jsonb_agg(feature),'[]'::jsonb) INTO candidates FROM encoded;
  END IF;

  v_returned := jsonb_array_length(candidates);
  SELECT count(*) FILTER (WHERE f->'properties'->>'freshness'='FRESH'),
         count(*) FILTER (WHERE f->'properties'->>'freshness'='STALE')
    INTO v_fresh,v_stale
  FROM jsonb_array_elements(candidates) f;

  RETURN jsonb_build_object(
    'version',5907,'resolved',true,'returned',v_returned,
    'viewport_mode',CASE WHEN area_deg2>10 THEN 'REGIONAL_BALANCED_POINTS' ELSE 'LOCAL_BUILDING_GEOMETRY' END,
    'as_of',now(),'fresh_records',coalesce(v_fresh,0),'stale_records',coalesce(v_stale,0),
    'geojson',jsonb_build_object('type','FeatureCollection','features',candidates),
    'truth_notice','Only qualified, active opportunities from BridgePoint live opportunity records are shown. Evidence freshness is labelled from its actual evidence timestamp. A score or opportunity is not proof of physical damage, sale intent, or guaranteed work.',
    'privacy_notice','No address, owner, contact data, raw evidence payload, or private customer facts are returned.'
  );
END
$function$

REVOKE ALL ON FUNCTION public.bridgepoint_public_opportunity_viewport_v5907(double precision,double precision,double precision,double precision,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bridgepoint_public_opportunity_viewport_v5907(double precision,double precision,double precision,double precision,integer) TO anon, authenticated, service_role;
