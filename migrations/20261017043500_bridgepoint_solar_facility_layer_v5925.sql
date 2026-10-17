-- Add USGS/LBNL public-domain utility-scale solar facility boundaries to BridgePoint Eye.
ALTER TABLE public.bridgepoint_physical_map_snapshot_v5924
  ADD COLUMN IF NOT EXISTS solar_farm_records bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION automation.refresh_physical_map_snapshot_v5924()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'infrastructure', 'automation'
 SET statement_timeout TO '120s'
AS $function$
DECLARE r record;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtextextended('bridgepoint-physical-map-snapshot-v5924',0)) THEN
    RETURN jsonb_build_object('ok',false,'skipped','LOCKED');
  END IF;
  SELECT count(*) FILTER (WHERE geometry IS NOT NULL) AS roof_geometry_records,
         count(*) FILTER (WHERE geometry IS NOT NULL AND shape_truth IS TRUE) AS roof_shape_truth_records,
         count(*) FILTER (WHERE geometry IS NOT NULL AND truth_class = 'SOURCE_ROOF_PLANE') AS roof_plane_records,
         count(*) FILTER (WHERE geometry IS NOT NULL AND truth_class IN ('SOURCE_DERIVED_LIDAR_ROOF_FIT','SOURCE_DERIVED_LIDAR_ROOF')) AS lidar_roof_records
  INTO r FROM analytics.unified_roof_truth_v2603;
  INSERT INTO public.bridgepoint_physical_map_snapshot_v5924 (
    singleton, roof_geometry_records, roof_shape_truth_records, roof_plane_records, lidar_roof_records,
    solar_array_records, solar_farm_records, pool_records, tunnel_underpass_records, public_subsurface_records, refreshed_at
  )
  SELECT true, r.roof_geometry_records, r.roof_shape_truth_records, r.roof_plane_records, r.lidar_roof_records,
    (SELECT count(*) FROM analytics.living_world_vector_assets_v2636 WHERE layer_key='ROOFTOP_SOLAR_DETAIL' AND geometry IS NOT NULL),
    (SELECT count(*) FROM analytics.living_world_asset_manifest_v2613 WHERE layer_key='SOLAR_FARMS' AND rights_status='PUBLIC_DOMAIN' AND metadata ? 'geometry'),
    (SELECT count(*) FROM analytics.living_world_vector_assets_v2636 WHERE layer_key='POOLS_PROPERTY_WATER' AND geometry IS NOT NULL),
    (SELECT count(*) FROM analytics.living_world_vector_assets_v2636 WHERE layer_key='TUNNELS_UNDERPASSES' AND geometry IS NOT NULL),
    (SELECT count(*) FROM analytics.subsurface_asset_truth_v2805
      WHERE geometry IS NOT NULL AND upper(coalesce(security_class,'PUBLIC')) IN ('PUBLIC','UNCLASSIFIED')
        AND coalesce(rights_scope,'') ~* '(public|open|odbl|commercial)'),
    now()
  ON CONFLICT (singleton) DO UPDATE SET
    roof_geometry_records=excluded.roof_geometry_records,
    roof_shape_truth_records=excluded.roof_shape_truth_records,
    roof_plane_records=excluded.roof_plane_records,
    lidar_roof_records=excluded.lidar_roof_records,
    solar_array_records=excluded.solar_array_records,
    solar_farm_records=excluded.solar_farm_records,
    pool_records=excluded.pool_records,
    tunnel_underpass_records=excluded.tunnel_underpass_records,
    public_subsurface_records=excluded.public_subsurface_records,
    refreshed_at=now();
  RETURN jsonb_build_object('ok',true,'version',5924,'refreshed_at',now(),
    'roof_geometry_records',r.roof_geometry_records,'roof_shape_truth_records',r.roof_shape_truth_records,
    'roof_plane_records',r.roof_plane_records,'lidar_roof_records',r.lidar_roof_records);
END;
$function$
;
REVOKE ALL ON FUNCTION automation.refresh_physical_map_snapshot_v5924() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bridgepoint_public_physical_map_summary_v5924()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT jsonb_build_object(
    'version',5924,
    'roof_geometry_records',s.roof_geometry_records,
    'roof_shape_truth_records',s.roof_shape_truth_records,
    'roof_plane_records',s.roof_plane_records,
    'lidar_roof_records',s.lidar_roof_records,
    'solar_array_records',s.solar_array_records,
    'solar_farm_records',s.solar_farm_records,
    'pool_records',s.pool_records,
    'tunnel_underpass_records',s.tunnel_underpass_records,
    'public_subsurface_records',s.public_subsurface_records,
    'roof_coverage_note','Roof/plane coverage varies by source and region; counts are source records, not unique buildings.',
    'underground_coverage_note',CASE WHEN s.public_subsurface_records=0
      THEN 'No public source-backed subsurface utility records are materialized yet. Known mapped tunnels/underpasses are separate.'
      ELSE 'Only records with public/unclassified security and allowed public/open/commercial rights are returned.' END,
    'refreshed_at',s.refreshed_at
  )
  FROM public.bridgepoint_physical_map_snapshot_v5924 s WHERE s.singleton=true;
$function$
;
REVOKE ALL ON FUNCTION public.bridgepoint_public_physical_map_summary_v5924() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bridgepoint_public_physical_map_summary_v5924() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.bridgepoint_public_physical_map_viewport_v5924(p_west double precision, p_south double precision, p_east double precision, p_north double precision, p_zoom double precision DEFAULT 12, p_limit integer DEFAULT 700)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics'
 SET statement_timeout TO '12s'
AS $function$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit,700),1),1000);
  v_roof_limit integer; v_other_limit integer;
  v_features jsonb := '[]'::jsonb; v_meta jsonb;
  v_south double precision; v_north double precision; v_west double precision; v_east double precision;
BEGIN
  IF p_west IS NULL OR p_south IS NULL OR p_east IS NULL OR p_north IS NULL
    OR p_west < -180 OR p_west > 180 OR p_east < -180 OR p_east > 180
    OR p_south < -90 OR p_south > 90 OR p_north < -90 OR p_north > 90
    OR p_south >= p_north OR p_zoom IS NULL OR p_zoom < 0 OR p_zoom > 24 THEN
    RAISE EXCEPTION 'Invalid BridgePoint viewport';
  END IF;
  v_south:=GREATEST(-90,p_south); v_north:=LEAST(90,p_north); v_west:=p_west; v_east:=p_east;
  v_roof_limit:=LEAST(500,GREATEST(50,v_limit*50/100));
  v_other_limit:=LEAST(80,GREATEST(20,v_limit/12));
  IF p_zoom < 8.5 THEN
    RETURN jsonb_build_object('type','FeatureCollection','features','[]'::jsonb,
      'bridgepoint',jsonb_build_object('version',5924,'zoom',p_zoom,'features_loaded',0,
        'detail_gate','Zoom to 8.5+ for source-backed BridgePoint physical features.'));
  END IF;
  WITH bounds AS MATERIALIZED (
    SELECT CASE WHEN v_west<=v_east
      THEN ARRAY[ST_MakeEnvelope(v_west,v_south,v_east,v_north,4326)]
      ELSE ARRAY[ST_MakeEnvelope(v_west,v_south,180,v_north,4326),ST_MakeEnvelope(-180,v_south,v_east,v_north,4326)]
    END boxes
  ),
  roof_features AS MATERIALIZED (
    SELECT jsonb_build_object(
      'type','Feature','id','roof-'||r.roof_truth_id,
      'geometry',ST_AsGeoJSON(ST_Force2D(
        CASE WHEN p_zoom>=16 THEN r.geometry
             ELSE ST_SimplifyPreserveTopology(r.geometry,
               CASE WHEN p_zoom>=14 THEN 0.000001 WHEN p_zoom>=12 THEN 0.000004 ELSE 0.000015 END) END
      ),7,0)::jsonb,
      'properties',jsonb_build_object(
        'bp_layer','roof','bp_asset_id',r.roof_truth_id,'source_key',r.source_key,'source_record_id',r.source_record_id,
        'truth_class',r.truth_class,'roof_shape',r.roof_shape,'roof_material',r.roof_material,
        'roof_height_m',r.roof_height_m,'pitch_deg',r.pitch_deg,'azimuth_deg',r.azimuth_deg,
        'shape_truth',coalesce(r.shape_truth,false),'height_truth',coalesce(r.height_truth,false),
        'pitch_truth',coalesce(r.pitch_truth,false),'direction_truth',coalesce(r.direction_truth,false),
        'source_updated_at',r.source_updated_at,
        'coverage_note',CASE WHEN r.shape_truth THEN 'Source reports roof-shape evidence.'
          WHEN r.truth_class='SOURCE_ROOF_PLANE' THEN 'Source roof-plane polygon; plane metadata is not a full 3D roof mesh.'
          ELSE 'Source-derived roof geometry; verify source before measuring.' END))
      feature
    FROM analytics.unified_roof_truth_v2603 r CROSS JOIN bounds b
    WHERE p_zoom>=10.5 AND r.geometry IS NOT NULL
      AND (r.shape_truth IS TRUE OR r.truth_class IN ('SOURCE_ROOF_PLANE','SOURCE_DERIVED_LIDAR_ROOF_FIT','SOURCE_DERIVED_LIDAR_ROOF'))
      AND (
        (v_west<=v_east AND r.geometry && b.boxes[1] AND ST_Intersects(r.geometry,b.boxes[1]))
        OR (v_west>v_east AND (
          (r.geometry && b.boxes[1] AND ST_Intersects(r.geometry,b.boxes[1]))
          OR (r.geometry && b.boxes[2] AND ST_Intersects(r.geometry,b.boxes[2]))))
      )
    ORDER BY r.shape_truth DESC,r.source_updated_at DESC NULLS LAST,r.roof_truth_id DESC
    LIMIT v_roof_limit
  ),
  vector_features AS MATERIALIZED (
    SELECT jsonb_build_object(
      'type','Feature','id','asset-'||a.vector_asset_id,
      'geometry',ST_AsGeoJSON(ST_Force2D(
        CASE WHEN p_zoom>=15 THEN a.geometry ELSE ST_SimplifyPreserveTopology(a.geometry,
          CASE WHEN p_zoom>=12 THEN 0.000005 ELSE 0.00002 END) END
      ),7,0)::jsonb,
      'properties',jsonb_build_object(
        'bp_layer',CASE a.layer_key WHEN 'ROOFTOP_SOLAR_DETAIL' THEN 'solar'
          WHEN 'POOLS_PROPERTY_WATER' THEN 'pool' ELSE 'underground' END,
        'bp_asset_id',a.vector_asset_id,'asset_kind',a.asset_kind,'class',a.class,'subtype',a.subtype,
        'layer_key',a.layer_key,'source_key',a.source_key,'source_record_id',a.source_record_id,
        'jurisdiction_code',a.jurisdiction_code,'truth_class',a.truth_class,'source_vintage',a.source_vintage,
        'first_seen_at',a.first_seen_at,'last_seen_at',a.last_seen_at,
        'coverage_note',CASE a.layer_key
          WHEN 'ROOFTOP_SOLAR_DETAIL' THEN 'Mapped solar feature from cited source; may represent an array/generator, not individual panels.'
          WHEN 'POOLS_PROPERTY_WATER' THEN 'Mapped pool geometry from cited source.'
          ELSE 'Mapped tunnel/underpass geometry; this is not a buried utility alignment.' END))
      feature
    FROM analytics.living_world_vector_assets_v2636 a CROSS JOIN bounds b
    WHERE a.geometry IS NOT NULL AND a.layer_key IN ('ROOFTOP_SOLAR_DETAIL','POOLS_PROPERTY_WATER','TUNNELS_UNDERPASSES')
      AND ((a.layer_key='TUNNELS_UNDERPASSES' AND p_zoom>=8.5)
        OR (a.layer_key IN ('ROOFTOP_SOLAR_DETAIL','POOLS_PROPERTY_WATER') AND p_zoom>=10))
      AND (
        (v_west<=v_east AND a.geometry && b.boxes[1] AND ST_Intersects(a.geometry,b.boxes[1]))
        OR (v_west>v_east AND (
          (a.geometry && b.boxes[1] AND ST_Intersects(a.geometry,b.boxes[1]))
          OR (a.geometry && b.boxes[2] AND ST_Intersects(a.geometry,b.boxes[2]))))
      )
    ORDER BY a.layer_key,a.vector_asset_id LIMIT (v_other_limit*3)
  ),

  solar_farm_features AS MATERIALIZED (
    SELECT jsonb_build_object(
      'type','Feature','id','solar-farm-'||m.asset_id,
      'geometry',ST_AsGeoJSON(ST_Force2D(
        CASE WHEN p_zoom>=15
          THEN ST_SetSRID(ST_GeomFromGeoJSON((m.metadata->'geometry')::text),4326)
          ELSE ST_SimplifyPreserveTopology(ST_SetSRID(ST_GeomFromGeoJSON((m.metadata->'geometry')::text),4326),
                 CASE WHEN p_zoom>=12 THEN 0.00001 ELSE 0.00003 END)
        END
      ),7,0)::jsonb,
      'properties',jsonb_build_object(
        'bp_layer','solar_farm','bp_asset_id',m.asset_id,'asset_kind',m.asset_kind,
        'class','SOLAR_ARRAY_FACILITY','source_key',m.source_key,'source_record_id',m.source_asset_id,
        'jurisdiction_code',m.jurisdiction_code,'truth_class',m.truth_class,'source_vintage',m.vintage,
        'source_url',m.source_url,'source_provider','USGS / Lawrence Berkeley National Laboratory',
        'rights_status',m.rights_status,'resolution_m',m.resolution_m,
        'coverage_note',coalesce(m.metadata->>'truth_boundary','Source-backed solar facility boundary; not individual panel geometry.')
      )
    ) feature
    FROM analytics.living_world_asset_manifest_v2613 m CROSS JOIN bounds b
    WHERE m.layer_key='SOLAR_FARMS' AND m.rights_status='PUBLIC_DOMAIN'
      AND m.metadata ? 'geometry' AND m.bbox IS NOT NULL
      AND (
        (v_west<=v_east AND m.bbox && b.boxes[1] AND ST_Intersects(m.bbox,b.boxes[1]))
        OR (v_west>v_east AND (
          (m.bbox && b.boxes[1] AND ST_Intersects(m.bbox,b.boxes[1]))
          OR (m.bbox && b.boxes[2] AND ST_Intersects(m.bbox,b.boxes[2]))))
      )
    ORDER BY m.asset_id
    LIMIT v_other_limit
  ),
  subsurface_features AS MATERIALIZED (
    SELECT jsonb_build_object(
      'type','Feature','id','subsurface-'||s.asset_id,'geometry',ST_AsGeoJSON(ST_Force2D(s.geometry),7,0)::jsonb,
      'properties',jsonb_build_object('bp_layer','underground','bp_asset_id',s.asset_id,'asset_kind',s.asset_type,
        'truth_class',s.truth_class,'depth_min_m',s.depth_min_m,'depth_max_m',s.depth_max_m,
        'diameter_m',s.diameter_m,'material',s.material,'status',s.status,'source_provider',s.source_provider,
        'source_record_id',s.source_record_id,'source_url',s.source_url,'source_updated_at',s.source_updated_at,
        'confidence',s.confidence,'coverage_note','Public source-backed subsurface record; location/depth accuracy depend on source.')) feature
    FROM analytics.subsurface_asset_truth_v2805 s CROSS JOIN bounds b
    WHERE p_zoom>=11 AND s.geometry IS NOT NULL
      AND upper(coalesce(s.security_class,'PUBLIC')) IN ('PUBLIC','UNCLASSIFIED')
      AND coalesce(s.rights_scope,'') ~* '(public|open|odbl|commercial)'
      AND (
        (v_west<=v_east AND s.geometry && b.boxes[1] AND ST_Intersects(s.geometry,b.boxes[1]))
        OR (v_west>v_east AND (
          (s.geometry && b.boxes[1] AND ST_Intersects(s.geometry,b.boxes[1]))
          OR (s.geometry && b.boxes[2] AND ST_Intersects(s.geometry,b.boxes[2]))))
      )
    LIMIT v_other_limit
  ),
  features AS (SELECT feature FROM roof_features UNION ALL SELECT feature FROM vector_features UNION ALL SELECT feature FROM solar_farm_features UNION ALL SELECT feature FROM subsurface_features)
  SELECT COALESCE(jsonb_agg(feature),'[]'::jsonb),jsonb_build_object('version',5924,'zoom',p_zoom)
  INTO v_features,v_meta FROM features;
  RETURN jsonb_build_object('type','FeatureCollection','features',v_features,'bridgepoint',v_meta||jsonb_build_object(
    'features_loaded',jsonb_array_length(v_features),
    'roof_geometry_note','Source-backed mapped roof geometry is loaded for the current viewport; full 3D roof meshes are not available for every building.',
    'underground_note','Verified public subsurface records appear only when materialized with permitted source rights. Tunnels and underpasses are a separate layer.'));
END;
$function$
;
REVOKE ALL ON FUNCTION public.bridgepoint_public_physical_map_viewport_v5924(double precision,double precision,double precision,double precision,double precision,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bridgepoint_public_physical_map_viewport_v5924(double precision,double precision,double precision,double precision,double precision,integer) TO anon, authenticated, service_role;

SELECT automation.refresh_physical_map_snapshot_v5924();
