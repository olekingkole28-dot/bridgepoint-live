-- Keep the headline/global counter consistent with the canonical counter's
-- geography contract: U.S. public parcels plus non-U.S. canonical identities,
-- excluding U.S. territories from the non-U.S. component so they aren't double-counted.
DO $migration$
DECLARE
  v_def text;
  v_old text := $old$nonus:=coalesce((g->>'active_global_canonical')::bigint,0);$old$;
  v_new text := $new$nonus:=coalesce((g->>'global_non_us_canonical')::bigint,0);$new$;
BEGIN
  SELECT pg_get_functiondef('automation.refresh_public_headline_cache_v5822()'::regprocedure)
    INTO v_def;
  IF position(v_new in v_def)>0 THEN
    RETURN;
  END IF;
  IF position(v_old in v_def)=0 THEN
    RAISE EXCEPTION 'Expected non-US headline count assignment not found; aborting safely';
  END IF;
  v_def:=replace(v_def,v_old,v_new);
  EXECUTE v_def;
END
$migration$;

SELECT automation.refresh_public_headline_cache_v5822();
