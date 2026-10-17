-- BridgePoint internal listing inventory API v5927.
-- Listing images are served only when licensed assets have been materialized under BridgePoint-owned media paths.
CREATE OR REPLACE FUNCTION public.bridgepoint_public_listing_summary_v5927()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
 SET statement_timeout TO '3000ms'
AS $function$
 SELECT jsonb_build_object(
  'version',5927,
  'total_records',count(*),
  'active_records',count(*) FILTER (WHERE upper(coalesce(listing_status,'')) IN ('ACTIVE','AVAILABLE','OPEN')),
  'sale_records',count(*) FILTER (WHERE upper(coalesce(listing_type,'')) ~ '(SALE|REO|PURCHASE)'),
  'rent_records',count(*) FILTER (WHERE upper(coalesce(listing_type,'')) ~ '(RENT|LEASE|LET)'),
  'rental_records',count(*) FILTER (WHERE upper(coalesce(listing_type,'')) ~ '(RENT|LEASE|LET)'),
  'source_types',count(DISTINCT source_key),
  'source_freshness_latest',max(coalesce(source_updated_at,source_checked_at,updated_at)),
  'mapped_records',count(*) FILTER (WHERE geom IS NOT NULL OR (longitude BETWEEN -180 AND 180 AND latitude BETWEEN -90 AND 90)),
  'bridgepoint_photo_assets',count(*) FILTER (
    WHERE jsonb_typeof(attribute_data->'bridgepoint_images')='array'
      AND jsonb_array_length(attribute_data->'bridgepoint_images')>0
  ),
  'truth_note','Counts include only records actually materialized in BridgePoint. Do not treat a listing as currently available unless its source freshness supports it. Photos are only returned when BridgePoint-hosted licensed image assets are materialized.'
 )
 FROM public.bridgepoint_public_listings_v5906
$function$
;
REVOKE ALL ON FUNCTION public.bridgepoint_public_listing_summary_v5927() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bridgepoint_public_listing_summary_v5927() TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.bridgepoint_public_listings_viewport_v5927(p_west double precision, p_south double precision, p_east double precision, p_north double precision, p_limit integer DEFAULT 250, p_query text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
 SET statement_timeout TO '4000ms'
AS $function$
DECLARE
 v_limit integer := least(greatest(coalesce(p_limit,250),1),300);
 v_query text := left(btrim(coalesce(p_query,'')),100);
 v_box geometry;
 v_features jsonb := '[]'::jsonb;
 v_returned integer := 0;
 v_total integer := 0;
BEGIN
 IF p_west IS NULL OR p_south IS NULL OR p_east IS NULL OR p_north IS NULL
   OR p_west < -180 OR p_west > 180 OR p_east < -180 OR p_east > 180
   OR p_south < -90 OR p_north > 90 OR p_south >= p_north OR p_west=p_east THEN
  RETURN jsonb_build_object('complete',false,'resolved',false,'error','INVALID_VIEWPORT','returned',0,'features',jsonb_build_array());
 END IF;
 IF p_west < p_east THEN
  v_box:=public.st_makeenvelope(p_west,p_south,p_east,p_north,4326);
 END IF;
 WITH candidates AS MATERIALIZED (
  SELECT l.listing_id,l.source_key,l.listing_type,l.listing_status,l.title,l.address,l.city,l.state_code,l.postal_code,
   l.latitude,l.longitude,l.price_amount,l.price_currency,l.source_updated_at,l.source_checked_at,l.attribute_data,
   l.accuracy_notice,
   coalesce(l.geom,public.st_setsrid(public.st_makepoint(l.longitude,l.latitude),4326)) AS shape
  FROM public.bridgepoint_public_listings_v5906 l
  WHERE (l.geom IS NOT NULL OR (l.longitude BETWEEN -180 AND 180 AND l.latitude BETWEEN -90 AND 90))
    AND (
      (p_west<p_east AND (
       (l.geom IS NOT NULL AND l.geom && v_box AND public.st_intersects(l.geom,v_box))
       OR (l.longitude BETWEEN p_west AND p_east AND l.latitude BETWEEN p_south AND p_north)
      ))
      OR (p_west>p_east AND (
       (l.geom IS NOT NULL AND (
        (l.geom && public.st_makeenvelope(p_west,p_south,180,p_north,4326) AND public.st_intersects(l.geom,public.st_makeenvelope(p_west,p_south,180,p_north,4326)))
        OR (l.geom && public.st_makeenvelope(-180,p_south,p_east,p_north,4326) AND public.st_intersects(l.geom,public.st_makeenvelope(-180,p_south,p_east,p_north,4326)))
       ))
       OR ((l.longitude>=p_west OR l.longitude<=p_east) AND l.latitude BETWEEN p_south AND p_north)
      ))
    )
    AND (
      v_query='' OR l.title ILIKE '%'||v_query||'%' OR l.address ILIKE '%'||v_query||'%'
      OR l.city ILIKE '%'||v_query||'%' OR l.postal_code ILIKE '%'||v_query||'%'
      OR l.listing_type ILIKE '%'||v_query||'%'
    )
 ), counted AS (
  SELECT count(*)::integer AS n FROM candidates
 ), ordered AS (
  SELECT * FROM candidates
  ORDER BY
    (upper(coalesce(listing_status,'')) IN ('ACTIVE','AVAILABLE','OPEN')) DESC,
    coalesce(source_updated_at,source_checked_at) DESC NULLS LAST,
    listing_id
  LIMIT v_limit
 ), feature_rows AS (
  SELECT jsonb_build_object(
    'type','Feature',
    'id',listing_id,
    'geometry',public.st_asgeojson(shape,6)::jsonb,
    'properties',jsonb_build_object(
      'listing_id',listing_id,
      'source_key',source_key,
      'listing_type',listing_type,
      'listing_status',listing_status,
      'title',left(coalesce(nullif(title,''),nullif(address,''),'BridgePoint listing'),180),
      'address',left(coalesce(address,''),180),
      'city',left(coalesce(city,''),100),
      'state_code',state_code,
      'postal_code',postal_code,
      'price_amount',price_amount,
      'price_currency',price_currency,
      'source_updated_at',source_updated_at,
      'source_checked_at',source_checked_at,
      'bridgepoint_photo_assets',CASE WHEN jsonb_typeof(attribute_data->'bridgepoint_images')='array' THEN attribute_data->'bridgepoint_images' ELSE '[]'::jsonb END,
      'photo_count',CASE WHEN jsonb_typeof(attribute_data->'bridgepoint_images')='array' THEN jsonb_array_length(attribute_data->'bridgepoint_images') ELSE 0 END,
      'accuracy_notice',left(coalesce(accuracy_notice,'Source-backed listing record; confirm current status and details in BridgePoint source provenance.'),500),
      'display_color',CASE WHEN upper(coalesce(listing_type,'')) ~ '(RENT|LEASE|LET)' THEN '#55e8b5' ELSE '#69dfff' END,
      'internal_detail_only',true
    )
  ) AS feature FROM ordered
 )
 SELECT (SELECT n FROM counted),
        (SELECT coalesce(jsonb_agg(feature),'[]'::jsonb) FROM feature_rows)
 INTO v_total,v_features;
 v_returned:=jsonb_array_length(v_features);
 RETURN jsonb_build_object(
   'complete',true,'resolved',true,'version',5927,
   'returned',v_returned,'matching_in_view',v_total,
   'features',v_features,
   'geojson',jsonb_build_object('type','FeatureCollection','features',v_features),
   'truth_note','Only records actually materialized in BridgePoint are returned. The response contains no external listing destination links. Only BridgePoint-hosted licensed photos in bridgepoint_images may render; source citations and accuracy notice remain visible internally.'
 );
END
$function$
;
REVOKE ALL ON FUNCTION public.bridgepoint_public_listings_viewport_v5927(double precision,double precision,double precision,double precision,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bridgepoint_public_listings_viewport_v5927(double precision,double precision,double precision,double precision,integer,text) TO anon,authenticated,service_role;
