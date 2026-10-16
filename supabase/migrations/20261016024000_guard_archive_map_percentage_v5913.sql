-- Prevent the public status endpoint from reporting >100% archive coverage
-- when the verified archive manifest and the live map-ready geometry count do not
-- describe the same denominator. The UI renders N/A until those counts are comparable.
DO $migration$
DECLARE
  v_def text;
  v_old text := $old$'archive_map_pct',round(100.0*map_ready.map_ready_buildings/nullif(archive.archived_buildings,0),2),$old$;
  v_new text := $new$'archive_map_pct',case
    when archive.archived_buildings>0
     and map_ready.map_ready_buildings<=archive.archived_buildings
    then round(100.0*map_ready.map_ready_buildings/nullif(archive.archived_buildings,0),2)
    else null
  end,
  'archive_map_pct_comparable',(archive.archived_buildings>0 and map_ready.map_ready_buildings<=archive.archived_buildings),
  'archive_map_pct_note',case
    when archive.archived_buildings<=0 then 'ARCHIVE_DENOMINATOR_MISSING'
    when map_ready.map_ready_buildings>archive.archived_buildings then 'NOT_COMPARABLE_ARCHIVE_MANIFEST_UNDERSHOOTS_MAP_READY'
    else 'COMPARABLE'
  end,$new$;
BEGIN
  SELECT pg_get_functiondef('public.bridgepoint_frontend_status_v5000()'::regprocedure)
    INTO v_def;
  IF position(v_new in v_def)>0 THEN
    RETURN;
  END IF;
  IF position(v_old in v_def)=0 THEN
    RAISE EXCEPTION 'Expected archive percentage formula not found; aborting safely';
  END IF;
  v_def:=replace(v_def,v_old,v_new);
  EXECUTE v_def;
END
$migration$;
