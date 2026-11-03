-- Public BridgePoint Guide access and broader capability-question routing.
-- The function is read-only and returns only public-safe company facts, whitelisted
-- public capability readiness, and active public package catalog fields.
CREATE OR REPLACE FUNCTION public.bridgepoint_public_ai_ask_v1055(p_message text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'bridgepoint_ai', 'product', 'public'
AS $function$
declare
  q text := left(btrim(coalesce(p_message,'')),500);
  lq text := lower(q);
  facts jsonb := '[]'::jsonb;
  answer text;
  deep jsonb;
  packs jsonb;
begin
  if char_length(q)<2 then
    return jsonb_build_object('complete',false,'error','QUESTION_REQUIRED');
  end if;

  deep := public.bridgepoint_public_deeptech_v534();

  if lq ~ '(drone|iot|sensor|digital twin|lidar|thermal|moisture|gpr|acoustic|webxr|vr|climate|roof wind|hail|building automation|deep.?tech|capabilit|feature|what can|what has|what does bridgepoint|what do you have|what is available|do you have|coverage|global|map|globe|satellite|transport|vehicle|rail|ship|aircraft|weather|storm|(^|[^a-z])rf([^a-z]|$)|radio|electromagnetic|3d|building|parcel|property|claims|insurance|roof|imagery|cloud|data|source|portfolio|dataset|product|tool|system)' then
    select coalesce(jsonb_agg(x),'[]'::jsonb)
      into facts
    from jsonb_array_elements(coalesce(deep->'capabilities','[]'::jsonb)) x
    where lower(coalesce(x->>'name','')||' '||coalesce(x->>'summary','')||' '||coalesce(x->>'domain',''))
          like '%'||replace(split_part(lq,' ',1),'%','')||'%'
       or lq like '%'||lower(coalesce(x->>'name',''))||'%';

    if jsonb_array_length(facts)=0 then
      facts := coalesce(deep->'capabilities','[]'::jsonb);
    end if;

    select string_agg(
      (x->>'name')||' ['||(x->>'status')||']: '||(x->>'summary'),
      E'\n\n'
    )
    into answer
    from jsonb_array_elements(facts) x;

    answer := coalesce(answer,deep->>'subheadline')
      || E'\n\nBridgePoint labels experimental or screening systems by their actual readiness and does not present them as validated engineering, legal, actuarial or autonomous-flight conclusions.';
  elsif lq ~ '(price|pricing|package|plan|cost|api|technology package)' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'package_key',package_key,
      'package_name',package_name,
      'monthly_price',monthly_price,
      'yearly_price',yearly_price,
      'trial_days',trial_days,
      'description',description,
      'delivery_status',configuration->>'delivery_status',
      'purchase_mode',configuration->>'purchase_mode'
    ) order by display_order,package_name),'[]'::jsonb)
    into packs
    from product.packages
    where active;
    facts := packs;
    answer := 'BridgePoint has core subscriptions, Pattern Intelligence, API and technology products. Core plans with a trial use the live 7-day configuration; request-access technology products use managed/owner-approved activation. The live catalog shows monthly and annual pricing and availability.';
  elsif lq ~ '(what is bridgepoint|what does bridgepoint|tell me about bridgepoint|how does bridgepoint work)' then
    answer := 'BridgePoint Intelligence connects fragmented property records, weather, government data, imagery, physical intelligence, ownership, field observations, claims evidence and other authorized sources around a canonical property identity. It turns those inputs into explainable timelines, signals, patterns, scores, opportunities, digital twins and workflows while preserving provenance, confidence and important limitations.';
  elsif lq ~ '(private|proprietary|weights|methodology|secret|model logic)' then
    answer := 'BridgePoint protects private user data, source code, raw model weights, internal factor math, matching internals and proprietary learning logic. Customer-facing intelligence explains evidence and outputs without exposing protected methodology.';
  else
    select coalesce(jsonb_agg(x),'[]'::jsonb)
    into facts
    from (
      select
        title,
        fact_text,
        truth_status,
        last_verified_at,
        confidence,
        ts_rank(
          to_tsvector('simple',coalesce(title,'')||' '||coalesce(fact_text,'')),
          plainto_tsquery('simple',q)
        ) score
      from bridgepoint_ai.company_brain_facts_v553
      where public_safe
        and truth_status in ('VERIFIED','LIVE')
        and (
          to_tsvector('simple',coalesce(title,'')||' '||coalesce(fact_text,'')) @@ plainto_tsquery('simple',q)
          or title ilike '%'||split_part(q,' ',1)||'%'
          or fact_text ilike '%'||split_part(q,' ',1)||'%'
        )
      order by score desc,confidence desc,last_verified_at desc
      limit 10
    ) x;

    if jsonb_array_length(facts)>0 then
      select string_agg((f->>'title')||': '||(f->>'fact_text'),E'\n\n')
      into answer
      from jsonb_array_elements(facts) f;
    else
      answer := 'I do not have a verified public-safe company fact that answers that question yet. I will not expose private user data, proprietary model weights, hidden matching logic, or unverified claims.';
    end if;
  end if;

  return jsonb_build_object(
    'complete',true,
    'version',1055,
    'question',q,
    'answer',answer,
    'facts',facts,
    'mode','PUBLIC_SAFE_COMPANY_BRAIN_PLUS_LIVE_PRODUCT_REGISTRIES',
    'methodology_protected',true,
    'notice','BridgePoint Guide answers from public-safe company, package and capability information. Owner/private system intelligence is not exposed.'
  );
end
$function$;

REVOKE EXECUTE ON FUNCTION public.bridgepoint_public_ai_ask_v1055(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bridgepoint_public_ai_ask_v1055(text) TO anon, authenticated;
COMMENT ON FUNCTION public.bridgepoint_public_ai_ask_v1055(text) IS
'Intentional public BridgePoint Guide endpoint. Read-only. Returns only whitelisted public capability registry rows, active public package metadata, or company_brain_facts_v553 rows marked public_safe with truth_status VERIFIED or LIVE. Does not expose owner answers, customer records, source secrets, model weights, or private methodology.';
