update automation.global_boundary_sources_v953 s
set publication_scope='PUBLIC',
    public_reason='Owner-approved public map display on BridgePoint. Source rights are VERIFIED_OPEN and the license/allowed-use record supports open reuse. Only source-backed geometry is sent to public vector tiles; keep restricted owner/personal attributes out and preserve source attribution.',
    metadata=coalesce(s.metadata,'{}'::jsonb) || jsonb_build_object(
      'public_geometry_allowed',true,
      'public_counts_allowed',true,
      'bridgepoint_owner_public_display_approved_at',now(),
      'bridgepoint_previous_publication_scope',s.publication_scope,
      'bridgepoint_public_display_policy_version','OWNER_APPROVAL_2026-10-25'
    ),
    updated_at=now()
where s.active
  and s.rights_status='VERIFIED_OPEN'
  and s.publication_scope='OWNER_ONLY'
  and s.technical_status in ('COMPLETE','READY')
  and coalesce(s.public_reason,'') not ilike '%superseded%'
  and length(coalesce(s.license_text,''))>4
  and length(coalesce(s.allowed_use_scope,''))>4
  and (
    upper(s.allowed_use_scope) like '%OPEN%'
    or upper(s.allowed_use_scope) like '%CC0%'
    or upper(s.allowed_use_scope) like '%CC_BY%'
    or upper(s.allowed_use_scope) like '%ODBL%'
    or upper(s.allowed_use_scope) like '%ATTRIBUTION%'
    or upper(s.allowed_use_scope) like '%PUBLIC_DOMAIN%'
    or upper(s.allowed_use_scope) like '%UNRESTRICTED%'
    or upper(s.allowed_use_scope) like '%REUSE%'
  )
  and upper(s.allowed_use_scope) not like '%BOUNDED_INTERFACE%'
  and upper(s.allowed_use_scope) not like '%INTERNAL_ONLY%'
  and upper(s.allowed_use_scope) not like '%OWNER_ONLY%'
  and upper(s.allowed_use_scope) not like '%NO_PUBLIC%';

insert into automation.boundary_tile_entitlements_v5801
 (source_kind,source_id,jurisdiction_code,owner_allowed,public_allowed,publication_scope,rights_status,technical_status,refreshed_at)
 select 'GLOBAL',s.source_id,coalesce(nullif(s.region_code,''),s.country_code),true,true,
        s.publication_scope,s.rights_status,s.technical_status,now()
 from automation.global_boundary_sources_v953 s
 where s.active=true and s.rights_status='VERIFIED_OPEN'
   and s.publication_scope='PUBLIC' and s.technical_status in ('COMPLETE','READY')
 on conflict (source_kind,source_id) do update set
   jurisdiction_code=excluded.jurisdiction_code,
   owner_allowed=true,public_allowed=true,
   publication_scope=excluded.publication_scope,
   rights_status=excluded.rights_status,
   technical_status=excluded.technical_status,
   refreshed_at=now();


CREATE OR REPLACE FUNCTION automation.parcel_boundary_tile_v5804(p_z integer, p_x integer, p_y integer, p_public boolean DEFAULT false)
 RETURNS bytea
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'automation'
AS $function$
with tile as (
  select st_tileenvelope(p_z,p_x,p_y) geom3857
),
bounds as (
  select geom3857,st_transform(geom3857,4326) geom4326 from tile
),
us_entitled as materialized (
  select source_id
  from automation.boundary_tile_entitlements_v5801
  where source_kind='US'
    and owner_allowed
    and (not p_public or public_allowed)
),
us_base as materialized (
  select
    p.state_code,p.candidate_id,p.source_record_id,
    c.candidate_name::text as source_name,
    coalesce(c.metadata->>'license',c.metadata->>'license_text',c.metadata->>'license_name','See published source terms')::text as license_text,
    p.source_url::text as source_url,
    case
      when p_z>=14 then p.geom
      when p_z>=12 then st_simplify(p.geom,0.000015)
      when p_z>=10 then st_simplify(p.geom,0.000045)
      when p_z=9 then st_simplify(p.geom,0.00010)
      when p_z=8 then st_simplify(p.geom,0.00028)
      when p_z=7 then st_simplify(p.geom,0.00070)
      when p_z=6 then st_simplify(p.geom,0.00140)
      else st_simplify(p.geom,0.00070)
    end g
  from us_entitled e
  join automation.parcel_boundary_provenance_v1831 p on p.candidate_id=e.source_id
  join automation.geographic_source_candidates_v86 c on c.candidate_id=p.candidate_id
  cross join bounds b
  where p_z>=4 and p.geom is not null and p.geom && b.geom4326
  limit case when p_public then case when p_z=4 then 65 when p_z=5 then 180 when p_z=6 then 450 when p_z=7 then 700 when p_z=8 then 1100 when p_z=9 then 1800 when p_z>=12 then 2147483647 else 3200 end else case when p_z>=14 then 12000 when p_z>=12 then 7000 when p_z>=10 then 3200 when p_z=9 then 1800 when p_z=8 then 1100 when p_z=7 then 700 when p_z=6 then 450 when p_z=5 then 180 else 65 end end
),
global_entitled as materialized (
  select source_id
  from automation.boundary_tile_entitlements_v5801
  where source_kind='GLOBAL' and owner_allowed and (not p_public or public_allowed)
),
global_base as materialized (
  select
    g.country_code,g.source_id,g.source_record_id,
    s.source_name::text as source_name,
    s.license_text::text as license_text,
    coalesce(s.provenance_url,s.source_url)::text as source_url,
    case
      when p_z>=14 then g.geometry
      when p_z>=12 then st_simplify(g.geometry,0.000015)
      when p_z>=10 then st_simplify(g.geometry,0.000045)
      when p_z=9 then st_simplify(g.geometry,0.00010)
      when p_z=8 then st_simplify(g.geometry,0.00028)
      when p_z=7 then st_simplify(g.geometry,0.00070)
      when p_z=6 then st_simplify(g.geometry,0.00140)
      else st_simplify(g.geometry,0.00070)
    end g
  from global_entitled e
  join automation.global_parcel_boundary_provenance_v953 g on g.source_id=e.source_id
  join automation.global_boundary_sources_v953 s on s.source_id=g.source_id
  cross join bounds b
  where p_z>=4 and g.geometry is not null and g.geometry && b.geom4326
  limit case when p_public then case when p_z=4 then 65 when p_z=5 then 180 when p_z=6 then 450 when p_z=7 then 700 when p_z=8 then 1100 when p_z=9 then 1800 when p_z>=12 then 2147483647 else 3200 end else case when p_z=4 then 300 when p_z=5 then 450 when p_z=6 then 450 when p_z=7 then 700 when p_z=8 then 1100 when p_z=9 then 1800 else 3200 end end
),
seed_parsed as materialized (
  select
    trim(s.country_code::text) country_code,
    s.source_key,
    s.source_record_id,
    coalesce(s.properties->>'source_name',s.properties->>'dataset_name',s.source_key)::text as source_name,
    coalesce(s.properties->>'license',s.properties->>'license_text',s.properties->>'license_name','See source provenance')::text as license_text,
    s.source_url::text as source_url,
    case
      when left(ltrim(s.geometry_gml),1)='{' and s.geometry_crs='EPSG:4326'
        then st_setsrid(st_geomfromgeojson(s.geometry_gml),4326)
      when left(ltrim(s.geometry_gml),1)='{' and s.geometry_crs='EPSG:3059'
        then st_transform(st_setsrid(st_geomfromgeojson(s.geometry_gml),3059),4326)
      when left(ltrim(s.geometry_gml),1)='<'
        then st_transform(
          st_geomfromgml(
            regexp_replace(
              regexp_replace(s.geometry_gml,'^<[^>]*geom[^>]*>','','i'),
              '</[^>]*geom>$','','i'
            )
          ),4326
        )
      else null::geometry
    end g
  from automation.global_country_seed_staging_v5719 s
  join automation.global_country_expansion_backlog_v5715 b
    on b.country_code=s.country_code
  where p_z>=4
    and s.feature_class ilike '%PARCEL%'
    and s.geometry_gml is not null
    and length(s.geometry_gml)>20
    and (
      (
        not p_public
        and s.country_code in ('CV','HU','IM','LV')
        and b.rights_status in ('VERIFIED_OPEN','VERIFIED_CONDITIONAL')
        and coalesce((b.metadata->>'public_geometry_allowed')::boolean,false)=false
        and coalesce((b.metadata->>'owner_geometry_allowed')::boolean,true)=true
      )
      or
      (
        p_public
        and b.rights_status in ('VERIFIED_OPEN','VERIFIED_CONDITIONAL','VERIFIED_PUBLIC_RECORD')
        and coalesce((b.metadata->>'public_geometry_allowed')::boolean,false)=true
      )
    )
),
seed_base as materialized (
  select
    s.country_code,s.source_key,s.source_record_id,s.source_name,s.license_text,s.source_url,
    case
      when p_z>=14 then s.g
      when p_z>=12 then st_simplify(s.g,0.000015)
      when p_z>=10 then st_simplify(s.g,0.000045)
      when p_z=9 then st_simplify(s.g,0.00010)
      when p_z=8 then st_simplify(s.g,0.00028)
      when p_z=7 then st_simplify(s.g,0.00070)
      when p_z=6 then st_simplify(s.g,0.00140)
      else st_simplify(s.g,0.00070)
    end g
  from seed_parsed s
  cross join bounds b
  where s.g is not null
    and geometrytype(s.g) in ('POLYGON','MULTIPOLYGON')
    and s.g && b.geom4326
  limit case when p_public then case when p_z=4 then 65 when p_z=5 then 180 when p_z=6 then 450 when p_z=7 then 700 when p_z=8 then 1100 when p_z=9 then 1800 when p_z>=12 then 2147483647 else 3200 end else case when p_z=4 then 300 when p_z=5 then 450 when p_z=6 then 450 when p_z=7 then 700 when p_z=8 then 1100 when p_z=9 then 1800 else 3200 end end
),
src as (
  select state_code,'US'::text country_code,candidate_id::text source_key,source_record_id,source_name,license_text,source_url,g
  from us_base where g is not null and not st_isempty(g)
  union all
  select null::text,trim(country_code::text),source_id::text,source_record_id,source_name,license_text,source_url,g
  from global_base where g is not null and not st_isempty(g)
  union all
  select null::text,country_code,source_key,source_record_id,source_name,license_text,source_url,g
  from seed_base where g is not null and not st_isempty(g)
),
mvtrows as (
  select
    case when p_public then null else state_code end state_code,
    country_code,
    case when p_public then null else source_key end source_key,
    case when p_public then null else source_record_id end source_record_id,
    source_name,license_text,source_url,
    st_asmvtgeom(st_transform(st_boundary(g),3857),b.geom3857,4096,32,true) geom
  from src
  cross join bounds b
  where g is not null and not st_isempty(g)
)
select coalesce(
  (select st_asmvt(mvtrows,'parcels',4096,'geom') from mvtrows),
  '\x'::bytea
);
$function$
;
