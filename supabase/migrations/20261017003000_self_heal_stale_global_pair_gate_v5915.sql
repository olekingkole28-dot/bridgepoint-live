-- A stale global-country pair sprint must not permanently starve all other
-- verified public-count-eligible boundary sources. The pair controller is
-- expected to refresh updated_at every 30 seconds; once stale for 15 minutes,
-- release the global claim selector back to all otherwise eligible sources.
DO $migration$
DECLARE
  v_def text;
  v_old text := $old$  select exists(select 1 from automation.global_country_pair_sprint_v5708 where status='ACTIVE') into v_pair_mode;$old$;
  v_new text := $new$  select exists(
    select 1
    from automation.global_country_pair_sprint_v5708
    where status='ACTIVE'
      and updated_at >= now()-interval '15 minutes'
  ) into v_pair_mode;$new$;
BEGIN
  SELECT pg_get_functiondef('automation.claim_global_boundary_shards_v953(integer)'::regprocedure)
    INTO v_def;
  IF position(v_new in v_def)>0 THEN
    RETURN;
  END IF;
  IF position(v_old in v_def)=0 THEN
    RAISE EXCEPTION 'Expected pair-mode gate not found in global boundary claim; aborting safely';
  END IF;
  v_def:=replace(v_def,v_old,v_new);
  EXECUTE v_def;
END
$migration$;
