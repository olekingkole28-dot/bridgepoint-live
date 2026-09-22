-- BridgePoint v.01 autonomy durability patch
-- Purpose: make worldwide source discovery retry-safe and keep CRITICAL-mode expansion bounded.
-- Live authority: Supabase project xdfsjztwgsbmabshzsjw
-- Safety: discovery remains behind legal/compliance gates; no source is auto-approved here.

create or replace function automation.world_discovery_dispatch_v722(p_limit integer default 3)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','automation','bridgepoint_ai'
set statement_timeout to '12s'
set lock_timeout to '500ms'
as $function$
declare
  lim integer:=greatest(1,least(coalesce(p_limit,3),8));
  pressure integer;
  eligible integer;
  sent integer:=0;
  r record;
  dk text;
  objective text;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('bridgepoint-world-discovery-dispatch-v722',0)) then
    return jsonb_build_object('complete',true,'version',722,'skipped','LOCKED');
  end if;

  select count(*) into pressure
  from automation.ai_worker_tasks_v556
  where status in('QUEUED','RUNNING');

  select count(*) into eligible
  from automation.jurisdiction_source_tasks_v675 t
  join automation.jurisdictions_v675 j on j.jurisdiction_key=t.jurisdiction_key
  join automation.jurisdiction_parity_requirements_v675 q on q.requirement_key=t.requirement_key
  where j.country_code<>'US'
    and j.jurisdiction_kind in('COUNTRY','SUBDIVISION','TERRITORY')
    and j.build_status in('QUEUED','DISCOVERING')
    and t.task_status in('QUEUED','FAILED')
    and coalesce(t.next_retry_at,now())<=now();

  if pressure>=80 then
    insert into automation.world_discovery_dispatch_runs_v682(queue_pressure,eligible_tasks,dispatched_tasks,throttled,notes,metadata)
    values(pressure,eligible,0,true,'Worldwide dispatch held by pressure governor.',jsonb_build_object('version',722,'pressure_ceiling',80,'retry_safe',true));
    return jsonb_build_object('complete',true,'version',722,'throttled',true,'queue_pressure',pressure,'eligible_tasks',eligible,'dispatched',0,'pressure_ceiling',80);
  end if;

  for r in
    select t.task_id,t.jurisdiction_key,t.requirement_key,t.priority,t.attempts,
           j.country_code,j.region_code,j.jurisdiction_name,j.jurisdiction_kind,
           q.requirement_name,q.requirement_group,q.source_category,q.required_for_live,q.description
    from automation.jurisdiction_source_tasks_v675 t
    join automation.jurisdictions_v675 j on j.jurisdiction_key=t.jurisdiction_key
    join automation.jurisdiction_parity_requirements_v675 q on q.requirement_key=t.requirement_key
    where j.country_code<>'US'
      and j.jurisdiction_kind in('COUNTRY','SUBDIVISION','TERRITORY')
      and j.build_status in('QUEUED','DISCOVERING')
      and t.task_status in('QUEUED','FAILED')
      and coalesce(t.next_retry_at,now())<=now()
    order by q.required_for_live desc,
             case q.requirement_group when 'FOUNDATION' then 1 when 'TRUST' then 2 when 'PUBLIC_RECORDS' then 3 when 'HAZARD' then 4 when 'PROPERTY_HISTORY' then 5 when 'ENVIRONMENT' then 6 else 7 end,
             t.priority desc,j.country_code,j.region_code nulls first,t.requirement_key
    limit lim
  loop
    dk:='WORLD_DISCOVERY_V722:'||r.jurisdiction_key||':'||r.requirement_key||':A'||(coalesce(r.attempts,0)+1)::text;
    objective:=format(
      'Research BridgePoint source coverage for %s (%s%s), %s capability %s. Prefer authoritative government/open/licensed sources. Independently identify geographic scope, stable property identifiers, denominator/coverage, update cadence, access method, provenance, licensing/usage rights, personal-data implications, privacy/local-law/data-residency constraints, matching strategy and quality risks. Do not mark a source accepted, ingested, verified, compliant, or customer-live. Return concrete candidate source names/URLs only when externally supported; otherwise state the research gap.',
      r.jurisdiction_name,r.country_code,case when r.region_code is null then '' else '-'||r.region_code end,r.jurisdiction_kind,r.requirement_name
    );
    begin
      insert into automation.ai_worker_tasks_v556(
        worker_key,task_type,priority,status,input,requires_ai,requires_external_action,
        requires_owner_approval,security_class,dedupe_key,created_by,metadata
      )
      values(
        'RESEARCH','MASTER_LEDGER_WORK',least(99,greatest(70,r.priority)),'QUEUED',
        jsonb_build_object(
          'req_key','worldwide_expansion_control','category','WORLDWIDE_SOURCE_DISCOVERY',
          'objective',objective,'requirement',r.description,'jurisdiction_key',r.jurisdiction_key,
          'country_code',r.country_code,'region_code',r.region_code,'jurisdiction_name',r.jurisdiction_name,
          'jurisdiction_kind',r.jurisdiction_kind,'parity_requirement_key',r.requirement_key,
          'parity_requirement_name',r.requirement_name,'source_category',r.source_category,
          'success_criteria',jsonb_build_array(
            'Authoritative candidate sources identified or research gap stated',
            'Licensing/usage-rights and provenance explicitly considered',
            'Privacy/local-law/residency constraints explicitly considered',
            'Property identity/matching and refresh strategy considered',
            'No source automatically accepted without V720 compliance gate'
          ),
          'secondary_reviewer','DATA_US'
        ),
        true,false,false,'INTERNAL',dk,'WORLD_DISCOVERY_V722',
        jsonb_build_object('jurisdiction_task_id',r.task_id,'version',722,'discovery_only',true,'compliance_gate',720,'attempt',coalesce(r.attempts,0)+1)
      );

      update automation.jurisdiction_source_tasks_v675
      set task_status='DISCOVERING',
          attempts=attempts+1,
          last_error=null,
          next_retry_at=null,
          updated_at=now(),
          metadata=metadata||jsonb_build_object('latest_ai_dedupe_key',dk,'dispatched_at',now(),'dispatch_version',722,'retry_safe',true)
      where task_id=r.task_id;

      update automation.jurisdictions_v675
      set build_status=case when build_status='QUEUED' then 'DISCOVERING' else build_status end,
          last_activity_at=now(),updated_at=now()
      where jurisdiction_key=r.jurisdiction_key;
      sent:=sent+1;
    exception when unique_violation then
      update automation.jurisdiction_source_tasks_v675
      set next_retry_at=now()+interval '10 minutes',
          last_error='Retry identity collision; delayed for a new bounded attempt.',
          updated_at=now()
      where task_id=r.task_id;
    end;
  end loop;

  insert into automation.world_discovery_dispatch_runs_v682(queue_pressure,eligible_tasks,dispatched_tasks,throttled,notes,metadata)
  values(pressure,eligible,sent,false,'Bounded retry-safe worldwide discovery dispatch.',jsonb_build_object('limit',lim,'version',722,'compliance_gate',720,'retry_safe',true));

  return jsonb_build_object('complete',true,'version',722,'throttled',false,'queue_pressure',pressure,'eligible_tasks',eligible,'dispatched',sent,'limit',lim,'retry_safe',true);
end
$function$;

create or replace function automation.global_expansion_coordinator_v721(p_dispatch_limit integer default 3)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','automation'
set statement_timeout to '20s'
set lock_timeout to '500ms'
as $function$
declare rec jsonb; dis jsonb; n integer:=0;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('bridgepoint-global-expansion-coordinator-v721',0)) then
    return jsonb_build_object('complete',true,'version',723,'skipped','LOCKED');
  end if;
  rec:=automation.world_discovery_reconcile_v732(24);
  update automation.global_expansion_requests_v721 g
  set request_status=case
    when j.country_code='US' and j.build_status='LIVE' then 'LIVE'
    when j.country_code='US' then 'BUILDING'
    when c.ingest_status='APPROVED' and c.promotion_status='APPROVED' then case when j.build_status='LIVE' then 'LIVE' else 'READY_TO_INGEST' end
    when exists(select 1 from automation.jurisdiction_source_tasks_v675 t where t.jurisdiction_key=g.jurisdiction_key and t.task_status in('CANDIDATE_FOUND','VERIFIED')) then 'COMPLIANCE_REVIEW'
    when exists(select 1 from automation.jurisdiction_source_tasks_v675 t where t.jurisdiction_key=g.jurisdiction_key and t.task_status='DISCOVERING') then 'DISCOVERING'
    when j.build_status='DISCOVERING' then 'DISCOVERING'
    else 'QUEUED' end,
    last_activity_at=greatest(coalesce(g.last_activity_at,'epoch'::timestamptz),coalesce(j.last_activity_at,'epoch'::timestamptz)),
    updated_at=now()
  from automation.jurisdictions_v675 j
  join automation.jurisdiction_compliance_v721 c on c.jurisdiction_key=j.jurisdiction_key
  where g.jurisdiction_key=j.jurisdiction_key and g.request_status not in('LIVE','FAILED');
  get diagnostics n=row_count;
  dis:=automation.world_discovery_dispatch_v722(least(greatest(coalesce(p_dispatch_limit,3),1),8));
  return jsonb_build_object('complete',true,'version',723,'requests_reconciled',n,'research_reconcile',rec,'discovery_dispatch',dis,
    'open_requests',(select count(*) from automation.global_expansion_requests_v721 where request_status not in('LIVE','FAILED')),
    'compliance_blocked',(select count(*) from automation.global_expansion_requests_v721 g join automation.jurisdiction_compliance_v721 c using(jurisdiction_key) where g.request_status not in('LIVE','FAILED') and c.ingest_status<>'APPROVED'));
end
$function$;

create or replace function automation.autonomous_global_tick_v5601()
returns jsonb
language plpgsql
security definer
set search_path to ''
set statement_timeout to '45s'
set lock_timeout to '500ms'
as $function$
declare
  m text;
  r jsonb:='{}'::jsonb;
  rec jsonb:='{}'::jsonb;
  dis jsonb:='{}'::jsonb;
  seed jsonb:='{}'::jsonb;
begin
  select mode into m from automation.autonomous_ops_state_v5590 where singleton;
  if not pg_try_advisory_xact_lock(hashtextextended('bridgepoint-global-tick-v5601',0)) then
    return jsonb_build_object('complete',true,'version',5613,'skipped','LOCKED');
  end if;

  seed:=automation.queue_global_country_autopilot_v5601();

  if coalesce(m,'CRITICAL')='CRITICAL' then
    rec:=automation.world_discovery_reconcile_v732(4);
    dis:=automation.world_discovery_dispatch_v722(1);
    r:=jsonb_build_object('pressure_lane','BOUNDED_DISCOVERY_ONE','research_reconcile',rec,'discovery_dispatch',dis,'country_autopilot',seed,'external_dispatch',false,'heavy_completion',false);
  elsif m='HIGH' then
    r:=jsonb_build_object('country_autopilot',seed,'coordinator',automation.global_expansion_coordinator_v721(1),'completion_deferred',true);
  else
    r:=jsonb_build_object('country_autopilot',seed,'coordinator',automation.global_expansion_coordinator_v721(1),'completion',automation.global_completion_controller_v731(1));
  end if;

  update automation.autonomous_ops_state_v5590
  set last_global_tick_at=now(),updated_at=now()
  where singleton;

  update automation.bridgepoint_requirement_ledger_v5597
  set status='ACTIVE',last_progress_at=now(),
      evidence=coalesce(evidence,'{}'::jsonb)||jsonb_build_object(
        'last_global_mode',m,'last_tick',now(),'country_autopilot',seed,'tick_version',5613,
        'critical_lane','ONE_PRESSURE_GATED_DISCOVERY_TASK_PER_TICK'
      ),
      updated_at=now()
  where req_key in ('GLOBAL_EXPANSION','GLOBAL_COUNTS_HIERARCHY','PUBLIC_GLOBAL_CHARTS');

  return jsonb_build_object('complete',true,'version',5613,'mode',m,'result',r);
exception when others then
  return jsonb_build_object('complete',false,'version',5613,'mode',m,'error',sqlerrm);
end
$function$;

revoke execute on function automation.world_discovery_dispatch_v722(integer) from public,anon,authenticated;
revoke execute on function automation.global_expansion_coordinator_v721(integer) from public,anon,authenticated;
revoke execute on function automation.autonomous_global_tick_v5601() from public,anon,authenticated;
