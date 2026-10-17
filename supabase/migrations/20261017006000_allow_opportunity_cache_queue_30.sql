-- Allow the 14.8-second customer opportunity cache refresh when source jobs
-- leave a queue in the normal 24–29 request band. The source dispatchers
-- already back off at 25 requests, but concurrent workers can briefly exceed it.
DO $migration$
DECLARE
  v_job_id bigint;
  v_command text;
  v_new text;
BEGIN
  SELECT jobid,command INTO v_job_id,v_command
  FROM cron.job
  WHERE jobname='bridgepoint-customer-opportunity-cache-v637'
  FOR UPDATE;

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'Customer opportunity cache cron job not found';
  END IF;

  IF position('(select count(*) from net.http_request_queue) < 30' in v_command)>0 THEN
    RETURN;
  END IF;

  v_new:=replace(
    v_command,
    '(select count(*) from net.http_request_queue) < 24',
    '(select count(*) from net.http_request_queue) < 30'
  );
  IF v_new=v_command THEN
    RAISE EXCEPTION 'Expected customer cache queue guard not found; aborting safely';
  END IF;

  PERFORM cron.alter_job(v_job_id,command=>v_new);
END
$migration$;
