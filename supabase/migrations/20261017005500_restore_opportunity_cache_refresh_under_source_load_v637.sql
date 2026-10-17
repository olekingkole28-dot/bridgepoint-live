-- Keep the customer opportunity/listing cache refreshing while source ingestion
-- is active, without allowing it to start under extreme queue/backend pressure.
-- The old <16 HTTP-queue / <10 active-client gate was starved once global ingestion
-- kept the queue above 16; the global dispatchers already stop adding work at 25.
DO $migration$
DECLARE
  v_command text;
  v_new text;
BEGIN
  SELECT command INTO v_command
  FROM cron.job
  WHERE jobname='bridgepoint-customer-opportunity-cache-v637'
  FOR UPDATE;

  IF v_command IS NULL THEN
    RAISE EXCEPTION 'Customer opportunity cache cron job not found';
  END IF;

  v_new:=replace(
    v_command,
    '(select count(*) from net.http_request_queue) < 16',
    '(select count(*) from net.http_request_queue) < 24'
  );
  v_new:=replace(
    v_new,
    'and pid<>pg_backend_pid()) < 10',
    'and pid<>pg_backend_pid()) < 14'
  );

  IF v_new=v_command THEN
    IF position('(select count(*) from net.http_request_queue) < 24' in v_command)>0
       AND position('and pid<>pg_backend_pid()) < 14' in v_command)>0 THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'Expected opportunity cache pressure gate not found; aborting safely';
  END IF;

  PERFORM cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname='bridgepoint-customer-opportunity-cache-v637'),
    command=>v_new
  );
END
$migration$;
