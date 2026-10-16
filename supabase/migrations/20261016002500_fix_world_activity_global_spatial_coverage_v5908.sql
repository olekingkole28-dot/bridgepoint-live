CREATE OR REPLACE FUNCTION public.bridgepoint_public_world_activity_v5908(p_west double precision, p_south double precision, p_east double precision, p_north double precision, p_at timestamp with time zone DEFAULT now(), p_window_hours integer DEFAULT 24, p_limit integer DEFAULT 600)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'automation', 'intelligence'
 SET statement_timeout TO '3000ms'
AS $function$
DECLARE
  v_at timestamptz := coalesce(p_at,now());
  v_hours integer := least(greatest(coalesce(p_window_hours,24),1),48);
  v_limit integer := least(greatest(coalesce(p_limit,600),1),600);
  v_from timestamptz;
  v_box geometry;
  v_wrap_w geometry;
  v_wrap_e geometry;
  v_rows jsonb := '[]'::jsonb;
  v_returned integer := 0;
  v_hazards integer := 0;
  v_global integer := 0;
BEGIN
  IF p_west IS NULL OR p_south IS NULL OR p_east IS NULL OR p_north IS NULL
     OR p_west < -180 OR p_west > 180 OR p_east < -180 OR p_east > 180
     OR p_south < -90 OR p_north > 90 OR p_south >= p_north OR p_west = p_east THEN
    RETURN jsonb_build_object('complete',false,'resolved',false,'version',5908,
      'returned',0,'geojson',jsonb_build_object('type','FeatureCollection','features','[]'::jsonb),
      'error','INVALID_VIEWPORT');
  END IF;
  IF v_at < now()-interval '31 days' OR v_at > now()+interval '5 minutes' THEN
    RETURN jsonb_build_object('complete',false,'resolved',false,'version',5908,
      'returned',0,'error','TIMESTAMP_OUT_OF_RANGE',
      'truth_notice','The public activity slider is limited to the latest 30 days.');
  END IF;

  v_from := v_at - make_interval(hours => v_hours);
  IF p_west < p_east THEN
    v_box := public.st_makeenvelope(p_west,p_south,p_east,p_north,4326);
  ELSE
    v_wrap_w := public.st_makeenvelope(p_west,p_south,180,p_north,4326);
    v_wrap_e := public.st_makeenvelope(-180,p_south,p_east,p_north,4326);
  END IF;

  WITH hazard_rows AS MATERIALIZED (
    SELECT
      'HAZARD'::text AS domain,
      'hazard:'||e.hazard_event_id::text AS event_id,
      coalesce(e.hazard_type,'HAZARD') AS family_key,
      coalesce(e.hazard_type,'HAZARD') AS event_type_key,
      left(coalesce(nullif(e.event_name,''),nullif(e.headline,''),e.hazard_type,'Source hazard'),180) AS title,
      left(coalesce(nullif(e.headline,''),nullif(e.area_description,''),'Source-reported hazard observation'),320) AS description,
      e.severity::text AS severity,
      e.certainty::text AS certainty,
      coalesce(e.observed_at,e.starts_at,e.source_updated_at,e.first_seen_at,e.last_seen_at) AS observed_at,
      coalesce(e.provider,'Weather source') AS source_label,
      CASE WHEN coalesce(e.source_url,'') ~* '^https?://' THEN e.source_url ELSE NULL END AS source_url,
      CASE WHEN jsonb_typeof(e.geometry_geojson)='object' THEN e.geometry_geojson
           WHEN e.longitude IS NOT NULL AND e.latitude IS NOT NULL
             THEN jsonb_build_object('type','Point','coordinates',jsonb_build_array(e.longitude,e.latitude))
           ELSE NULL END AS geom_json
    FROM intelligence.hazard_events_v903 e
    WHERE coalesce(e.observed_at,e.starts_at,e.source_updated_at,e.first_seen_at,e.last_seen_at) >= v_from
      AND coalesce(e.observed_at,e.starts_at,e.source_updated_at,e.first_seen_at,e.last_seen_at) <= v_at
      AND e.latitude BETWEEN p_south AND p_north
      AND (
        (p_west < p_east AND e.longitude BETWEEN p_west AND p_east)
        OR (p_west > p_east AND (e.longitude >= p_west OR e.longitude <= p_east))
      )
    ORDER BY coalesce(e.observed_at,e.starts_at,e.source_updated_at,e.first_seen_at,e.last_seen_at) DESC
    LIMIT least(v_limit,350)
  ),
  global_rows AS MATERIALIZED (
    SELECT
      'GLOBAL_EVENT'::text AS domain,
      'event:'||e.event_id::text AS event_id,
      coalesce(e.family_key,'GLOBAL_EVENT') AS family_key,
      coalesce(e.event_type_key,e.family_key,'GLOBAL_EVENT') AS event_type_key,
      left(coalesce(nullif(e.title,''),e.event_type_key,e.family_key,'Source event'),180) AS title,
      left(coalesce(nullif(e.description,''),'Source-reported global event. Area and property effects require separate verification.'),320) AS description,
      e.severity::text AS severity,
      NULL::text AS certainty,
      e.observed_at,
      coalesce(e.source_code,'Global source') AS source_label,
      CASE
        WHEN coalesce(e.metadata->>'source_url',e.metadata->>'url','') ~* '^https?://'
          THEN coalesce(e.metadata->>'source_url',e.metadata->>'url')
        ELSE NULL
      END AS source_url,
      CASE
        WHEN e.event_area_geom IS NOT NULL THEN public.st_asgeojson(
          CASE WHEN public.st_geometrytype(e.event_area_geom) IN ('ST_Polygon','ST_MultiPolygon')
               THEN public.st_simplifypreservetopology(e.event_area_geom,0.001)
               ELSE e.event_area_geom END,6)::jsonb
        WHEN e.event_geom IS NOT NULL THEN public.st_asgeojson(e.event_geom,6)::jsonb
        WHEN e.longitude IS NOT NULL AND e.latitude IS NOT NULL
          THEN jsonb_build_object('type','Point','coordinates',jsonb_build_array(e.longitude,e.latitude))
        ELSE NULL
      END AS geom_json
    FROM automation.global_lifecycle_events_v5825 e
    WHERE e.observed_at >= v_from AND e.observed_at <= v_at
      AND (
        (
          e.latitude BETWEEN p_south AND p_north
          AND (
            (p_west < p_east AND e.longitude BETWEEN p_west AND p_east)
            OR (p_west > p_east AND (e.longitude >= p_west OR e.longitude <= p_east))
          )
        )
        OR (
          e.event_geom IS NOT NULL AND (
            (p_west < p_east AND e.event_geom && v_box AND public.st_intersects(e.event_geom,v_box))
            OR (p_west > p_east AND (
              (e.event_geom && v_wrap_w AND public.st_intersects(e.event_geom,v_wrap_w))
              OR (e.event_geom && v_wrap_e AND public.st_intersects(e.event_geom,v_wrap_e))
            ))
          )
        )
        OR (
          e.event_area_geom IS NOT NULL AND (
            (p_west < p_east AND e.event_area_geom && v_box AND public.st_intersects(e.event_area_geom,v_box))
            OR (p_west > p_east AND (
              (e.event_area_geom && v_wrap_w AND public.st_intersects(e.event_area_geom,v_wrap_w))
              OR (e.event_area_geom && v_wrap_e AND public.st_intersects(e.event_area_geom,v_wrap_e))
            ))
          )
        )
      )
    ORDER BY e.observed_at DESC
    LIMIT least(v_limit,350)
  ),
  all_rows AS MATERIALIZED (
    SELECT * FROM hazard_rows WHERE geom_json IS NOT NULL
    UNION ALL
    SELECT * FROM global_rows WHERE geom_json IS NOT NULL
  ),
  ordered_rows AS MATERIALIZED (
    SELECT * FROM all_rows
    ORDER BY observed_at DESC NULLS LAST,domain,event_id
    LIMIT v_limit
  ),
  features AS (
    SELECT domain,observed_at,
      jsonb_build_object(
        'type','Feature','id',event_id,'geometry',geom_json,
        'properties',jsonb_build_object(
          'event_id',event_id,'domain',domain,'family_key',family_key,
          'event_type_key',event_type_key,'title',title,'description',description,
          'severity',severity,'certainty',certainty,'observed_at',observed_at,
          'source_label',source_label,'source_url',source_url
        )
      ) AS feature
    FROM ordered_rows
  )
  SELECT coalesce(jsonb_agg(feature ORDER BY observed_at DESC NULLS LAST),'[]'::jsonb),
         count(*)::integer,
         count(*) FILTER (WHERE domain='HAZARD')::integer,
         count(*) FILTER (WHERE domain='GLOBAL_EVENT')::integer
  INTO v_rows,v_returned,v_hazards,v_global
  FROM features;

  RETURN jsonb_build_object(
    'complete',true,'resolved',true,'version',5908,
    'requested_at',v_at,'window_start',v_from,'window_end',v_at,
    'window_hours',v_hours,'returned',v_returned,
    'hazard_observations',v_hazards,'global_events',v_global,
    'geojson',jsonb_build_object('type','FeatureCollection','features',v_rows),
    'truth_notice','This is a time-filtered view of source-reported observations and global events, not a pixel-perfect historical replay. A weather observation, forecast, or event overlay is not proof of property damage. Base-map imagery and building geometry are not rewound.'
  );
END
$function$;

REVOKE ALL ON FUNCTION public.bridgepoint_public_world_activity_v5908(double precision,double precision,double precision,double precision,timestamp with time zone,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bridgepoint_public_world_activity_v5908(double precision,double precision,double precision,double precision,timestamp with time zone,integer,integer) TO anon,authenticated,service_role;
