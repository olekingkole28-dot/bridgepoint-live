-- Version the opportunity run worker to mark score versions which already have
-- an opportunity. Previously the selector repeatedly scanned past the same
-- scored properties without evaluating or marking them, leading to large
-- scans and intermittent two-minute timeouts. This retains the evidence gates
-- and original duplicate-prevention semantics; no opportunity scores are fabricated.
DO $migration$
DECLARE
  v_def text;
  v_pos integer;
  v_marker text;
  v_insert text;
  v_old text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef('opportunity_engine.run_v38(integer)'::regprocedure)
    INTO v_def;

  IF to_regprocedure('opportunity_engine.run_v38_v1013(integer)') IS NULL THEN
    v_def := replace(
      v_def,
      'CREATE OR REPLACE FUNCTION opportunity_engine.run_v38(',
      'CREATE OR REPLACE FUNCTION opportunity_engine.run_v38_v1013('
    );
    v_def := replace(v_def, ',1012', ',1013');
    v_def := replace(v_def, 'v_marked bigint := 0;', 'v_marked bigint := 0; v_premarked bigint := 0;');

    v_marker := '    for v_property in';
    v_pos := position(v_marker in v_def);
    IF v_pos=0 THEN
      RAISE EXCEPTION 'Run-v38 main loop not found; aborting safely';
    END IF;

    v_insert := $body$  -- Record score versions that already have any opportunity.
  -- Without this, each run repeatedly scans past the same high-scoring rows
  -- even though detect_property_v38 cannot create a duplicate for them.
  WITH victims AS MATERIALIZED (
    SELECT s.property_score_id
    FROM scoring_engine.current_property_scores_v37 s
    WHERE s.intelligence_score >= 5
      AND coalesce(s.metadata->>'opportunity_evaluated_score_id','') <> s.property_score_id::text
      AND EXISTS (
        SELECT 1 FROM opportunity_engine.opportunities_v38 o
        WHERE o.property_id=s.property_id
      )
    ORDER BY s.intelligence_score DESC,s.property_id
    LIMIT least(greatest(v_limit*100,500),2000)
  ), marked AS (
    UPDATE scoring_engine.property_scores_v37 ps
    SET metadata=coalesce(ps.metadata,'{}'::jsonb)||jsonb_build_object(
      'opportunity_evaluated_score_id',ps.property_score_id::text,
      'opportunity_evaluated_at',now(),
      'opportunity_evaluation_run_id',v_run_id,
      'opportunity_evaluation_result','ALREADY_HAS_OPPORTUNITY_V1013'
    )
    FROM victims v
    WHERE ps.property_score_id=v.property_score_id
    RETURNING ps.property_score_id
  )
  SELECT count(*) INTO v_premarked FROM marked;
  v_marked:=v_marked+v_premarked;

$body$;

    v_def := substring(v_def from 1 for v_pos-1) || v_insert || substring(v_def from v_pos);
    EXECUTE v_def;
  END IF;

  SELECT pg_get_functiondef('automation.engine_generate_opportunities_v38(jsonb)'::regprocedure)
    INTO v_def;
  v_old := 'CREATE OR REPLACE FUNCTION automation.engine_generate_opportunities_v38(';
  v_new := 'CREATE OR REPLACE FUNCTION automation.engine_generate_opportunities_v38_v1013(';
  IF position(v_new in v_def)=0 THEN
    IF position(v_old in v_def)=0 THEN
      RAISE EXCEPTION 'Opportunity generator wrapper did not match; aborting safely';
    END IF;
    v_def := replace(v_def,v_old,v_new);
    v_def := replace(v_def,'opportunity_engine.run_v38(v_limit)','opportunity_engine.run_v38_v1013(v_limit)');
    EXECUTE v_def;
  END IF;

  SELECT pg_get_functiondef('automation.opportunity_reconciliation_guarded_v3051(integer)'::regprocedure)
    INTO v_def;
  v_old := 'automation.engine_generate_opportunities_v38(';
  v_new := 'automation.engine_generate_opportunities_v38_v1013(';
  IF position(v_new in v_def)=0 THEN
    IF position(v_old in v_def)=0 THEN
      RAISE EXCEPTION 'Reconciliation generator call did not match; aborting safely';
    END IF;
    v_def := replace(v_def,v_old,v_new);
    EXECUTE v_def;
  END IF;
END
$migration$;
