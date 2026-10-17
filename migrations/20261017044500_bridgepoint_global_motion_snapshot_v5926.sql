-- BridgePoint global motion/source-materialization counters (v5926).
CREATE TABLE IF NOT EXISTS public.bridgepoint_global_motion_snapshot_v5926 (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 tree_source_records bigint NOT NULL DEFAULT 0,
 rail_segment_records bigint NOT NULL DEFAULT 0,
 bridge_tagged_centerlines bigint NOT NULL DEFAULT 0,
 pool_records bigint NOT NULL DEFAULT 0,
 rooftop_solar_records bigint NOT NULL DEFAULT 0,
 solar_site_boundary_records bigint NOT NULL DEFAULT 0,
 tunnel_underpass_records bigint NOT NULL DEFAULT 0,
 well_mine_quarry_records bigint NOT NULL DEFAULT 0,
 public_subsurface_records bigint NOT NULL DEFAULT 0,
 approved_subsurface_source_cohorts bigint NOT NULL DEFAULT 0,
 fhwa_nbi_expected_records bigint NOT NULL DEFAULT 0,
 fhwa_bridge_geometry_records bigint NOT NULL DEFAULT 0,
 world_tiles_ready bigint NOT NULL DEFAULT 0,
 world_tiles_complete bigint NOT NULL DEFAULT 0,
 world_feature_rows_persisted bigint NOT NULL DEFAULT 0,
 public_camera_feeds_connected bigint NOT NULL DEFAULT 0,
 realtime_train_feeds_connected bigint NOT NULL DEFAULT 0,
 refreshed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bridgepoint_global_motion_snapshot_v5926 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bridgepoint_global_motion_snapshot_v5926 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION automation.refresh_global_motion_snapshot_v5926()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'automation'
 SET statement_timeout TO '25s'
AS $function$
DECLARE
  v_assets record; v_bridges bigint:=0; v_fhwa_expected bigint:=0; v_fhwa_geom bigint:=0;
  v_sub_cohorts bigint:=0; v_world_ready bigint:=0; v_world_complete bigint:=0; v_world_rows bigint:=0;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtextextended('bridgepoint-global-motion-snapshot-v5926',0)) THEN
    RETURN jsonb_build_object('ok',false,'skipped','LOCKED');
  END IF;
  SELECT
    count(*) FILTER(WHERE layer_key='TREE_OBJECTS_3D') AS tree_source_records,
    count(*) FILTER(WHERE layer_key='TRANSPORT_NETWORK_DETAIL'
       AND (subtype='rail' OR class IN ('standard_gauge','monorail','subway','light_rail','narrow_gauge','tram'))) AS rail_segment_records,
    count(*) FILTER(WHERE layer_key='POOLS_PROPERTY_WATER') AS pool_records,
    count(*) FILTER(WHERE layer_key='ROOFTOP_SOLAR_DETAIL') AS rooftop_solar_records,
    count(*) FILTER(WHERE layer_key='TUNNELS_UNDERPASSES') AS tunnel_underpass_records,
    count(*) FILTER(WHERE lower(coalesce(layer_key,'')||' '||coalesce(asset_kind,'')||' '||coalesce(class,'')||' '||coalesce(subtype,'')) ~ '(well|mine|quarry|borehole)') AS well_mine_quarry_records
  INTO v_assets FROM analytics.living_world_vector_assets_v2636;

  SELECT count(*) INTO v_bridges
  FROM analytics.living_world_vector_assets_v2636
  WHERE layer_key='TRANSPORT_NETWORK_DETAIL'
    AND lower(coalesce(properties::text,'')) ~ '"bridge"[[:space:]]*:[[:space:]]*"(yes|true|1|viaduct|movable)"';

  SELECT coalesce(sum(expected_count),0) INTO v_fhwa_expected
  FROM public.intelligence_bridge_source_v5540 WHERE source_key='us_fhwa_nbi_2025';
  SELECT count(*) INTO v_fhwa_geom FROM public.intelligence_bridge_geometry_v5540;

  SELECT count(DISTINCT c.candidate_id) INTO v_sub_cohorts
  FROM automation.geographic_source_candidates_v86 c
  JOIN automation.source_compliance_validation_v720 v USING(candidate_id)
  WHERE c.metadata->>'fragmentation_lane'='SUBSURFACE_ESTATE'
    AND c.decision_status='ACCEPTED' AND v.activation_status='APPROVED'
    AND NOT coalesce((c.metadata->>'materialization_hold')::boolean,false);

  SELECT count(*) FILTER(WHERE status IN ('READY','RETRY')),
         count(*) FILTER(WHERE status='COMPLETE'),
         coalesce(sum(rows_persisted),0)
  INTO v_world_ready,v_world_complete,v_world_rows FROM automation.world_feature_tiles_v2600;

  INSERT INTO public.bridgepoint_global_motion_snapshot_v5926(
    singleton,tree_source_records,rail_segment_records,bridge_tagged_centerlines,
    pool_records,rooftop_solar_records,solar_site_boundary_records,tunnel_underpass_records,
    well_mine_quarry_records,public_subsurface_records,approved_subsurface_source_cohorts,
    fhwa_nbi_expected_records,fhwa_bridge_geometry_records,world_tiles_ready,world_tiles_complete,
    world_feature_rows_persisted,public_camera_feeds_connected,realtime_train_feeds_connected,refreshed_at
  ) VALUES(
    true,v_assets.tree_source_records,v_assets.rail_segment_records,v_bridges,
    v_assets.pool_records,v_assets.rooftop_solar_records,
    (SELECT count(*) FROM analytics.living_world_asset_manifest_v2613 WHERE layer_key='SOLAR_FARMS' AND rights_status='PUBLIC_DOMAIN' AND metadata ? 'geometry'),
    v_assets.tunnel_underpass_records,v_assets.well_mine_quarry_records,
    (SELECT count(*) FROM analytics.subsurface_asset_truth_v2805 WHERE geometry IS NOT NULL AND upper(coalesce(security_class,'PUBLIC')) IN ('PUBLIC','UNCLASSIFIED')
      AND coalesce(rights_scope,'') ~* '(public|open|odbl|commercial)'),
    v_sub_cohorts,v_fhwa_expected,v_fhwa_geom,v_world_ready,v_world_complete,v_world_rows,0,0,now()
  )
  ON CONFLICT(singleton) DO UPDATE SET
    tree_source_records=excluded.tree_source_records,
    rail_segment_records=excluded.rail_segment_records,
    bridge_tagged_centerlines=excluded.bridge_tagged_centerlines,
    pool_records=excluded.pool_records,
    rooftop_solar_records=excluded.rooftop_solar_records,
    solar_site_boundary_records=excluded.solar_site_boundary_records,
    tunnel_underpass_records=excluded.tunnel_underpass_records,
    well_mine_quarry_records=excluded.well_mine_quarry_records,
    public_subsurface_records=excluded.public_subsurface_records,
    approved_subsurface_source_cohorts=excluded.approved_subsurface_source_cohorts,
    fhwa_nbi_expected_records=excluded.fhwa_nbi_expected_records,
    fhwa_bridge_geometry_records=excluded.fhwa_bridge_geometry_records,
    world_tiles_ready=excluded.world_tiles_ready,
    world_tiles_complete=excluded.world_tiles_complete,
    world_feature_rows_persisted=excluded.world_feature_rows_persisted,
    refreshed_at=now();

  RETURN jsonb_build_object('ok',true,'version',5926,'refreshed_at',now(),
    'tree_source_records',v_assets.tree_source_records,'rail_segment_records',v_assets.rail_segment_records,
    'bridge_tagged_centerlines',v_bridges,'approved_subsurface_source_cohorts',v_sub_cohorts);
END;
$function$
;
REVOKE ALL ON FUNCTION automation.refresh_global_motion_snapshot_v5926() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.bridgepoint_public_global_motion_summary_v5926()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 SELECT jsonb_build_object(
   'version',5926,'tree_source_records',s.tree_source_records,
   'rail_segment_records',s.rail_segment_records,'bridge_tagged_centerlines',s.bridge_tagged_centerlines,
   'pool_records',s.pool_records,'rooftop_solar_records',s.rooftop_solar_records,
   'solar_site_boundary_records',s.solar_site_boundary_records,'tunnel_underpass_records',s.tunnel_underpass_records,
   'well_mine_quarry_records',s.well_mine_quarry_records,'public_subsurface_records',s.public_subsurface_records,
   'approved_subsurface_source_cohorts',s.approved_subsurface_source_cohorts,
   'fhwa_nbi_expected_records',s.fhwa_nbi_expected_records,'fhwa_bridge_geometry_records',s.fhwa_bridge_geometry_records,
   'world_tiles_ready',s.world_tiles_ready,'world_tiles_complete',s.world_tiles_complete,
   'world_feature_rows_persisted',s.world_feature_rows_persisted,
   'public_camera_feeds_connected',s.public_camera_feeds_connected,
   'realtime_train_feeds_connected',s.realtime_train_feeds_connected,
   'refreshed_at',s.refreshed_at,
   'truth_note','All values are sourced record counts, not unique physical objects. Real-time feeds are counted only after an authorized provider is connected.'
 ) FROM public.bridgepoint_global_motion_snapshot_v5926 s WHERE s.singleton=true;
$function$
;
REVOKE ALL ON FUNCTION public.bridgepoint_public_global_motion_summary_v5926() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bridgepoint_public_global_motion_summary_v5926() TO anon,authenticated,service_role;

SELECT automation.refresh_global_motion_snapshot_v5926();
DO $motion_job$
BEGIN
 IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='bridgepoint-global-motion-snapshot-v5926') THEN
  PERFORM cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='bridgepoint-global-motion-snapshot-v5926' LIMIT 1),schedule:='12,42 * * * *',active:=true);
 ELSE
  PERFORM cron.schedule('bridgepoint-global-motion-snapshot-v5926','12,42 * * * *','select automation.refresh_global_motion_snapshot_v5926();');
 END IF;
END
$motion_job$;
