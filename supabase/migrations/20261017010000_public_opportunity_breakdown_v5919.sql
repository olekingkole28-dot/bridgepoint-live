CREATE OR REPLACE FUNCTION public.bridgepoint_public_opportunity_breakdown_v5919()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, product, opportunity_engine
AS $function$
WITH current_cache AS (
  SELECT current_generation, refreshed_at, status
  FROM product.customer_opportunity_cache_state_v637
  WHERE singleton = true AND upper(coalesce(status, '')) = 'READY'
  ORDER BY refreshed_at DESC NULLS LAST
  LIMIT 1
),
customer AS (
  SELECT c.opportunity_id, c.property_id, upper(trim(c.state_code)) AS state_code,
         lower(coalesce(nullif(trim(c.vertical_key), ''), 'other')) AS vertical_key,
         lower(coalesce(nullif(trim(c.opportunity_family), ''), 'other')) AS opportunity_family
  FROM product.customer_opportunity_cache_v637 c
  JOIN current_cache s ON c.generation = s.current_generation
  WHERE nullif(trim(c.state_code), '') IS NOT NULL
),
global_active AS (
  SELECT g.global_opportunity_id, g.global_property_id, upper(trim(g.country_code)) AS country_code,
         upper(trim(g.opportunity_key)) AS opportunity_key, upper(trim(g.opportunity_family)) AS opportunity_family,
         g.latest_evidence_at, g.updated_at
  FROM opportunity_engine.global_opportunities_v5825 g
  WHERE upper(coalesce(g.opportunity_status, '')) = 'ACTIVE'
    AND nullif(trim(g.country_code), '') IS NOT NULL
),
active_reo AS (
  SELECT upper(trim(l.state_code)) AS state_code
  FROM public.bridgepoint_public_listings_v5906 l
  WHERE upper(coalesce(l.listing_type, '')) = 'FOR_SALE'
    AND upper(coalesce(l.listing_status, '')) = 'ACTIVE'
    AND nullif(trim(l.state_code), '') IS NOT NULL
)
SELECT jsonb_build_object(
  'version', 5919, 'complete', true, 'generated_at', statement_timestamp(),
  'definitions', jsonb_build_object(
    'total_opportunities', 'Customer-ready U.S. opportunities plus active non-U.S. property-risk review rows. Counts are opportunity records, not building footprints.',
    'customer_ready', 'Current READY customer opportunity-cache generation. One property can appear in more than one opportunity type.',
    'global_risk', 'Active property-risk review records; exposure reviews are not proof of damage or confirmed commercial intent.',
    'active_reo_listings', 'Active public HUD/FHA REO for-sale inventory shown separately and not added to the opportunity total.'
  ),
  'counts', jsonb_build_object(
    'total_opportunities', (SELECT count(*) FROM customer) + (SELECT count(*) FROM global_active),
    'total_unique_properties', (SELECT count(DISTINCT property_id) FROM customer) + (SELECT count(DISTINCT global_property_id) FROM global_active),
    'active_jurisdictions', (SELECT count(DISTINCT state_code) FROM customer) + (SELECT count(DISTINCT country_code) FROM global_active),
    'customer_ready_opportunities', (SELECT count(*) FROM customer),
    'customer_ready_properties', (SELECT count(DISTINCT property_id) FROM customer),
    'customer_ready_states', (SELECT count(DISTINCT state_code) FROM customer),
    'global_risk_opportunities', (SELECT count(*) FROM global_active),
    'global_risk_properties', (SELECT count(DISTINCT global_property_id) FROM global_active),
    'global_risk_countries', (SELECT count(DISTINCT country_code) FROM global_active),
    'active_reo_for_sale_listings', (SELECT count(*) FROM active_reo),
    'active_reo_states', (SELECT count(DISTINCT state_code) FROM active_reo)
  ),
  'customer_ready_by_type', coalesce((
    SELECT jsonb_agg(to_jsonb(t) ORDER BY t.opportunity_count DESC, t.vertical_key)
    FROM (SELECT vertical_key, opportunity_family, count(*) AS opportunity_count,
                 count(DISTINCT property_id) AS unique_properties, count(DISTINCT state_code) AS state_count
          FROM customer GROUP BY vertical_key, opportunity_family) t
  ), '[]'::jsonb),
  'customer_ready_by_state', coalesce((
    SELECT jsonb_agg(to_jsonb(s) ORDER BY s.opportunity_count DESC, s.state_code)
    FROM (
      SELECT state_code, count(*) AS opportunity_count, count(DISTINCT property_id) AS unique_properties,
             coalesce((SELECT jsonb_object_agg(v.vertical_key, v.opportunity_count)
                       FROM (SELECT c2.vertical_key, count(*) AS opportunity_count
                             FROM customer c2 WHERE c2.state_code = c.state_code GROUP BY c2.vertical_key) v),
                      '{}'::jsonb) AS by_type
      FROM customer c GROUP BY state_code
    ) s
  ), '[]'::jsonb),
  'global_risk_by_type', coalesce((
    SELECT jsonb_agg(to_jsonb(t) ORDER BY t.opportunity_count DESC, t.country_code, t.opportunity_key)
    FROM (SELECT country_code, opportunity_key, opportunity_family, count(*) AS opportunity_count,
                 count(DISTINCT global_property_id) AS unique_properties,
                 max(latest_evidence_at) AS latest_evidence_at, max(updated_at) AS updated_at
          FROM global_active GROUP BY country_code, opportunity_key, opportunity_family) t
  ), '[]'::jsonb),
  'global_risk_by_country', coalesce((
    SELECT jsonb_agg(to_jsonb(c) ORDER BY c.opportunity_count DESC, c.country_code)
    FROM (
      SELECT country_code, count(*) AS opportunity_count, count(DISTINCT global_property_id) AS unique_properties,
             count(DISTINCT opportunity_key) AS type_count,
             coalesce((SELECT jsonb_object_agg(t.opportunity_key, t.opportunity_count)
                       FROM (SELECT g2.opportunity_key, count(*) AS opportunity_count
                             FROM global_active g2 WHERE g2.country_code = g.country_code GROUP BY g2.opportunity_key)),
                      '{}'::jsonb) AS by_type
      FROM global_active g GROUP BY country_code
    ) c
  ), '[]'::jsonb),
  'active_reo_by_state', coalesce((
    SELECT jsonb_agg(to_jsonb(s) ORDER BY s.listing_count DESC, s.state_code)
    FROM (SELECT state_code, count(*) AS listing_count FROM active_reo GROUP BY state_code) s
  ), '[]'::jsonb),
  'freshness', jsonb_build_object(
    'customer_cache_refreshed_at', (SELECT refreshed_at FROM current_cache),
    'global_risk_updated_at', (SELECT max(updated_at) FROM global_active),
    'active_reo_source_checked_at', (
      SELECT max(source_checked_at) FROM public.bridgepoint_public_listings_v5906
      WHERE upper(coalesce(listing_type, '')) = 'FOR_SALE' AND upper(coalesce(listing_status, '')) = 'ACTIVE'
    )
  )
);
$function$;

REVOKE ALL ON FUNCTION public.bridgepoint_public_opportunity_breakdown_v5919() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bridgepoint_public_opportunity_breakdown_v5919() TO anon, authenticated, service_role;
