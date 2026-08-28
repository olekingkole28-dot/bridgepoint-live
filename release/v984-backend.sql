-- STAGED ONLY. Apply together with the v984 public release after UI verification.

create or replace function public.bridgepoint_public_pipeline_activity_v984()
returns jsonb
language sql
stable
security definer
set search_path = 'pg_catalog','cron'
as $$
with runs as (
  select j.jobname,r.status,r.start_time,r.end_time
  from cron.job j
  join cron.job_run_details r on r.jobid=j.jobid
  where j.active is true
    and r.start_time >= now()-interval '60 minutes'
), mapped as (
  select 'signals'::text category,* from runs where jobname ilike 'bridgepoint-app-signal-feed-%'
  union all
  select 'matching',* from runs where jobname ilike 'bridgepoint-expansion-post-ingestion-%' or jobname ilike 'bridgepoint-us-county-parcel-reconcile-%'
  union all
  select 'scoring',* from runs where jobname ilike 'bridgepoint-foundation-intelligence-feeder-%' or jobname ilike 'bridgepoint-pattern-score-handoff-%'
  union all
  select 'patterns',* from runs where jobname ilike 'bridgepoint-pattern-v36-%' or jobname ilike 'bridgepoint-intelligence-booster-v468-pattern-%'
  union all
  select 'opportunities',* from runs where jobname='bridgepoint-opportunity-reconciliation'
), agg as (
  select category,
    count(*) filter(where status='succeeded' and start_time>=now()-interval '5 minutes')::bigint cycles_5m,
    count(*) filter(where status='succeeded')::bigint cycles_60m,
    max(end_time) filter(where status='succeeded') latest_success_at,
    count(*) filter(where status='failed')::bigint failed_60m
  from mapped
  group by category
), cats(category) as (values ('signals'),('matching'),('scoring'),('patterns'),('opportunities'))
select jsonb_build_object(
  'available',true,
  'scope','United States + District of Columbia',
  'generated_at',now(),
  'signals',coalesce((select to_jsonb(a)-'category' from agg a where a.category='signals'),jsonb_build_object('cycles_5m',0,'cycles_60m',0,'latest_success_at',null,'failed_60m',0)),
  'matching',coalesce((select to_jsonb(a)-'category' from agg a where a.category='matching'),jsonb_build_object('cycles_5m',0,'cycles_60m',0,'latest_success_at',null,'failed_60m',0)),
  'scoring',coalesce((select to_jsonb(a)-'category' from agg a where a.category='scoring'),jsonb_build_object('cycles_5m',0,'cycles_60m',0,'latest_success_at',null,'failed_60m',0)),
  'patterns',coalesce((select to_jsonb(a)-'category' from agg a where a.category='patterns'),jsonb_build_object('cycles_5m',0,'cycles_60m',0,'latest_success_at',null,'failed_60m',0)),
  'opportunities',coalesce((select to_jsonb(a)-'category' from agg a where a.category='opportunities'),jsonb_build_object('cycles_5m',0,'cycles_60m',0,'latest_success_at',null,'failed_60m',0))
);
$$;

grant execute on function public.bridgepoint_public_pipeline_activity_v984() to anon, authenticated;

create or replace function public.bridgepoint_owner_commerce_v984(p_since timestamptz default now()-interval '90 days')
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog','public','product','accounts','auth'
as $$
declare
  v_since timestamptz := greatest(coalesce(p_since,now()-interval '90 days'),now()-interval '365 days');
  v_result jsonb;
begin
  if auth.uid() is null or not accounts.is_platform_admin() then
    raise exception 'Owner access required';
  end if;

  select jsonb_build_object(
    'available',true,
    'since',v_since,
    'generated_at',now(),
    'totals',jsonb_build_object(
      'completed_purchases',(select count(*)::bigint from product.purchase_fulfillment_v223 where purchased_at>=v_since),
      'purchase_revenue_cents',(select coalesce(sum(amount_total_cents),0)::bigint from product.purchase_fulfillment_v223 where purchased_at>=v_since),
      'active_subscriptions',(select count(*)::bigint from product.subscriptions where status in ('active','trialing') and created_at>=v_since),
      'trialing_subscriptions',(select count(*)::bigint from product.subscriptions where status='trialing' and created_at>=v_since),
      'cancelled_or_expired',(select count(*)::bigint from product.subscriptions where status in ('cancelled','canceled','expired') and updated_at>=v_since)
    ),
    'recent_purchases',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.purchased_at desc)
      from (
        select u.email,p.user_id,p.package_key,p.package_name,p.billing_interval,p.amount_total_cents,p.currency,
               p.purchase_mode,p.fulfillment_status,p.delivery_status,p.purchased_at
        from product.purchase_fulfillment_v223 p
        left join auth.users u on u.id=p.user_id
        where p.purchased_at>=v_since
        order by p.purchased_at desc
        limit 50
      ) x
    ),'[]'::jsonb),
    'subscriptions',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.updated_at desc)
      from (
        select u.email,s.user_id,pk.package_key,pk.package_name,s.status,s.trial_started_at,s.trial_ends_at,
               s.current_period_start,s.current_period_end,s.cancel_at_period_end,s.created_at,s.updated_at,s.canceled_at
        from product.subscriptions s
        left join auth.users u on u.id=s.user_id
        left join product.packages pk on pk.package_id=s.package_id
        where greatest(s.created_at,s.updated_at)>=v_since
        order by s.updated_at desc
        limit 75
      ) x
    ),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

grant execute on function public.bridgepoint_owner_commerce_v984(timestamptz) to authenticated;
