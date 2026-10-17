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
          'map_color_key',icon_key,
          'map_color_label',CASE icon_key
            WHEN 'ROOF' THEN 'Roof / shingles' WHEN 'STORM' THEN 'Storm / wind / hail'
            WHEN 'FIRE' THEN 'Fire / smoke' WHEN 'WATER' THEN 'Flood / water'
            WHEN 'SOLAR' THEN 'Solar'
            WHEN 'DEVELOPMENT' THEN 'Development / permits'
            WHEN 'INVESTMENT' THEN 'Investment / acquisition'
            WHEN 'COMPLIANCE' THEN 'Code / compliance'
            ELSE 'General property intelligence' END,
          'specific_opportunity',coalesce(nullif(btrim(opportunity_name),''),nullif(btrim(opportunity_key),''),'Property opportunity'),
          'opportunity_key',opportunity_key,
          'vertical_key',vertical_key,
          'opportunity_family',opportunity_family,
          'source_count',coalesce(source_count,0),
          'matched_pattern_count',coalesce(matched_pattern_count,0),
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
          'building_id',building_id,
          'icon_key',icon_key,
          'map_color_key',icon_key,
          'map_color_label',CASE icon_key
            WHEN 'ROOF' THEN 'Roof / shingles' WHEN 'STORM' THEN 'Storm / wind / hail'
            WHEN 'FIRE' THEN 'Fire / smoke' WHEN 'WATER' THEN 'Flood / water'
            WHEN 'SOLAR' THEN 'Solar'
            WHEN 'DEVELOPMENT' THEN 'Development / permits'
            WHEN 'INVESTMENT' THEN 'Investment / acquisition'
            WHEN 'COMPLIANCE' THEN 'Code / compliance'
            ELSE 'General property intelligence' END,
          'specific_opportunity',coalesce(nullif(btrim(opportunity_name),''),nullif(btrim(opportunity_key),''),'Property opportunity'),
          'opportunity_key',opportunity_key,
          'vertical_key',vertical_key,
          'opportunity_family',opportunity_family,
          'source_count',coalesce(source_count,0),
          'matched_pattern_count',coalesce(matched_pattern_count,0),
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
$function$;

REVOKE ALL ON FUNCTION public.bridgepoint_public_opportunity_viewport_v5907(double precision,double precision,double precision,double precision,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bridgepoint_public_opportunity_viewport_v5907(double precision,double precision,double precision,double precision,integer) TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.bridgepoint_map_opportunity_snapshot_v5920 (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  payload jsonb NOT NULL,
  generated_at timestamptz NOT NULL
);
ALTER TABLE public.bridgepoint_map_opportunity_snapshot_v5920 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bridgepoint_map_opportunity_snapshot_v5920 FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bridgepoint_refresh_map_opportunity_snapshot_v5920()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' SET statement_timeout = '120s'
AS $bp$
DECLARE v_payload jsonb;
BEGIN
  WITH eligible AS MATERIALIZED (
    SELECT o.property_id,
      lower(coalesce(nullif(btrim(o.vertical_key), ''), 'other')) AS vertical_key,
      lower(coalesce(nullif(btrim(o.opportunity_family), ''), 'other')) AS opportunity_family,
      upper(core.opportunity_icon_key_v965(o.opportunity_family,o.opportunity_key,o.vertical_key,o.opportunity_name)) AS map_color_key,
      coalesce(o.source_count,0) >= 2 AND coalesce(o.matched_pattern_count,0) >= 2 AS corroborated,
      o.updated_at,o.latest_evidence_at
    FROM opportunity_engine.opportunities_v38 o
    WHERE lower(coalesce(o.opportunity_status,'active')) = 'active'
      AND coalesce(o.matched_pattern_count,0) > 0
      AND coalesce(o.source_count,0) > 0
      AND nullif(btrim(o.intelligence_stage),'') IS NOT NULL
  ),
  totals AS (
    SELECT count(*)::bigint AS map_opportunity_records,
      count(DISTINCT property_id)::bigint AS map_unique_properties,
      count(*) FILTER (WHERE corroborated)::bigint AS corroborated_map_records,
      max(updated_at) AS latest_source_update,
      max(latest_evidence_at) AS latest_evidence_at
    FROM eligible
  ),
  by_type AS (
    SELECT vertical_key,opportunity_family,count(*)::bigint AS opportunity_count,
      count(DISTINCT property_id)::bigint AS unique_properties,
      count(*) FILTER (WHERE corroborated)::bigint AS corroborated_records
    FROM eligible GROUP BY vertical_key,opportunity_family
  ),
  by_map_color AS (
    SELECT map_color_key,count(*)::bigint AS opportunity_count,
      count(DISTINCT property_id)::bigint AS unique_properties,
      count(*) FILTER (WHERE corroborated)::bigint AS corroborated_records
    FROM eligible GROUP BY map_color_key
  )
  SELECT jsonb_build_object(
    'version',5920,'complete',true,'generated_at',clock_timestamp(),
    'definitions',jsonb_build_object(
      'map_inventory','Qualified active rows in opportunity_engine.opportunities_v38: active status, source_count > 0, matched_pattern_count > 0, and non-empty intelligence_stage.',
      'map_unique_properties','Distinct property_id values across the qualified active map inventory. A property can have multiple opportunity records.',
      'corroborated_map_records','Qualified records with at least two source records and at least two matched patterns.',
      'map_color_classes','Color class is derived from BridgePoint opportunity key, family, vertical and name. Category records are not additive unique buildings.',
      'state_country_scope','State counts and global country risk-review counts are separate customer-ready and international risk-review cohorts, not a full main-map state/country count.'
    ),
    'counts',(SELECT jsonb_build_object('map_opportunity_records',map_opportunity_records,'map_unique_properties',map_unique_properties,'corroborated_map_records',corroborated_map_records,'latest_source_update',latest_source_update,'latest_evidence_at',latest_evidence_at) FROM totals),
    'by_type',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.opportunity_count DESC,t.vertical_key) FROM by_type t),'[]'::jsonb),
    'by_map_color',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.opportunity_count DESC,c.map_color_key) FROM by_map_color c),'[]'::jsonb),
    'freshness',jsonb_build_object('snapshot_generated_at',clock_timestamp(),'refresh_cadence_minutes',60)
  ) INTO v_payload;
  INSERT INTO public.bridgepoint_map_opportunity_snapshot_v5920(singleton,payload,generated_at)
  VALUES (true,v_payload,clock_timestamp())
  ON CONFLICT (singleton) DO UPDATE SET payload=EXCLUDED.payload,generated_at=EXCLUDED.generated_at;
  RETURN v_payload;
END
$bp$;

CREATE OR REPLACE FUNCTION public.bridgepoint_public_map_opportunity_summary_v5920()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $bp$
  SELECT s.payload FROM public.bridgepoint_map_opportunity_snapshot_v5920 s WHERE s.singleton=true
$bp$;

REVOKE ALL ON FUNCTION public.bridgepoint_refresh_map_opportunity_snapshot_v5920() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bridgepoint_refresh_map_opportunity_snapshot_v5920() TO service_role;
REVOKE ALL ON FUNCTION public.bridgepoint_public_map_opportunity_summary_v5920() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bridgepoint_public_map_opportunity_summary_v5920() TO anon, authenticated, service_role;

INSERT INTO public.bridgepoint_map_opportunity_snapshot_v5920(singleton,payload,generated_at)
VALUES (true,jsonb_build_object(
  'version',5920,'complete',true,'generated_at',clock_timestamp(),
  'definitions',jsonb_build_object(
    'map_inventory','Qualified active rows in opportunity_engine.opportunities_v38, with active status, source_count > 0, matched_pattern_count > 0 and non-empty intelligence_stage.',
    'map_unique_properties','Distinct property_id values across the qualified active map inventory; a property may carry multiple opportunity records.',
    'corroborated_map_records','Qualified records with at least two source records and at least two matched patterns.',
    'map_color_classes','Color class follows BridgePoint opportunity key, family, vertical and name. Counts are records, not unique buildings.',
    'state_country_scope','State counts and global country risk-review counts remain separate cohorts, not a full main-map state/country count.'
  ),
  'counts',jsonb_build_object('map_opportunity_records',1311009,'map_unique_properties',332357,'corroborated_map_records',808881,'latest_source_update',NULL,'latest_evidence_at',NULL),
  'by_type',jsonb_build_array(
    jsonb_build_object('vertical_key','public_adjusting','opportunity_family','claims','opportunity_count',332273,'unique_properties',332273,'corroborated_records',162652),
    jsonb_build_object('vertical_key','restoration','opportunity_family','property_damage','opportunity_count',332265,'unique_properties',332265,'corroborated_records',287529),
    jsonb_build_object('vertical_key','roofing','opportunity_family','property_damage','opportunity_count',332265,'unique_properties',332265,'corroborated_records',287529),
    jsonb_build_object('vertical_key','property_investment','opportunity_family','acquisition','opportunity_count',163769,'unique_properties',163769,'corroborated_records',71155),
    jsonb_build_object('vertical_key','general_contracting','opportunity_family','construction','opportunity_count',150395,'unique_properties',150395,'corroborated_records',16),
    jsonb_build_object('vertical_key','development','opportunity_family','redevelopment','opportunity_count',21,'unique_properties',21,'corroborated_records',0),
    jsonb_build_object('vertical_key','solar','opportunity_family','property_improvement','opportunity_count',21,'unique_properties',21,'corroborated_records',0)
  ),
  'by_map_color',jsonb_build_array(
    jsonb_build_object('map_color_key','GENERAL','opportunity_count',664538,'unique_properties',332356,'corroborated_records',450181),
    jsonb_build_object('map_color_key','ROOF','opportunity_count',332265,'unique_properties',332265,'corroborated_records',287529),
    jsonb_build_object('map_color_key','INVESTMENT','opportunity_count',163769,'unique_properties',163769,'corroborated_records',71155),
    jsonb_build_object('map_color_key','DEVELOPMENT','opportunity_count',150416,'unique_properties',150395,'corroborated_records',16),
    jsonb_build_object('map_color_key','SOLAR','opportunity_count',21,'unique_properties',21,'corroborated_records',0)
  ),
  'freshness',jsonb_build_object('snapshot_generated_at',clock_timestamp(),'refresh_cadence_minutes',60)
),clock_timestamp())
ON CONFLICT (singleton) DO NOTHING;

DO $schedule$
DECLARE v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname='bridgepoint-map-opportunity-snapshot-v5920' LIMIT 1;
  IF v_job_id IS NOT NULL THEN PERFORM cron.unschedule(v_job_id); END IF;
  PERFORM cron.schedule('bridgepoint-map-opportunity-snapshot-v5920','17 * * * *','SELECT public.bridgepoint_refresh_map_opportunity_snapshot_v5920();');
END
$schedule$;
