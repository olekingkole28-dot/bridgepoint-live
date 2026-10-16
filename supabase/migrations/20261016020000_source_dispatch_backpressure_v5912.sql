-- Apply stricter backpressure to high-volume source dispatchers while the
-- export tails and other database work are active. Requests already queued are
-- not cancelled; dispatchers resume automatically when the HTTP queue drains.
DO $migration$
DECLARE
  v_def text;
  c record;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      (
        'automation.dispatch_global_projected_gml_v961()',
        'if v_http>35 or v_active>14 or v_locks>0 or v_io>4 then',
        'if v_http>=25 or v_active>14 or v_locks>0 or v_io>4 then'
      ),
      (
        'automation.dispatch_global_gml_v960()',
        'if v_http>25 or v_active>14 or v_locks>0 or v_io>4 then',
        'if v_http>=25 or v_active>14 or v_locks>0 or v_io>4 then'
      ),
      (
        'automation.dispatch_global_arcgis_v1124()',
        'if v_http>40 or v_clients>18 then',
        'if v_http>=25 or v_clients>18 then'
      ),
      (
        'automation.expansion_parallel_source_feeder_tick_v628()',
        'or v_http>42 or v_pending=0',
        'or v_http>=25 or v_pending=0'
      ),
      (
        'automation.expansion_foundation_source_feeder_tick_v633()',
        'if coalesce(v_mode,''BALANCED'')<>''SPRINT'' or v_active>18 or v_long>1 or v_locks>1 or v_fail>3 or v_pending=0 or s.consecutive_failures>=3 then',
        'if coalesce(v_mode,''BALANCED'')<>''SPRINT'' or automation.http_queue_pressure_v917()>=25 or v_active>18 or v_long>1 or v_locks>1 or v_fail>3 or v_pending=0 or s.consecutive_failures>=3 then'
      )
    ) AS x(sig,old_text,new_text)
  LOOP
    SELECT pg_get_functiondef(c.sig::regprocedure) INTO v_def;
    IF position(c.new_text in v_def)>0 THEN
      CONTINUE;
    END IF;
    IF position(c.old_text in v_def)=0 THEN
      RAISE EXCEPTION 'Expected pressure-gate text not found in %; aborting migration',c.sig;
    END IF;
    v_def:=replace(v_def,c.old_text,c.new_text);
    EXECUTE v_def;
  END LOOP;
END
$migration$;
