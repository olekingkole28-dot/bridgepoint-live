CREATE OR REPLACE FUNCTION core.opportunity_icon_key_v965(family text, opportunity_key text, vertical_key text, title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $function$
  SELECT CASE
    WHEN lower(concat_ws(' ',family,opportunity_key,vertical_key,title)) ~ '(roof|shingle)' THEN 'ROOF'
    WHEN lower(concat_ws(' ',family,opportunity_key,vertical_key,title)) ~ '(storm|wind|hail|weather)' THEN 'STORM'
    WHEN lower(concat_ws(' ',family,opportunity_key,vertical_key,title)) ~ '(fire|burn|smoke)' THEN 'FIRE'
    WHEN lower(concat_ws(' ',family,opportunity_key,vertical_key,title)) ~ '(flood|water|drain|sewer)' THEN 'WATER'
    WHEN lower(concat_ws(' ',family,opportunity_key,vertical_key,title)) ~ '(solar|photovoltaic)' THEN 'SOLAR'
    WHEN lower(coalesce(vertical_key,'')) = 'restoration' THEN 'RESTORATION'
    WHEN lower(coalesce(vertical_key,'')) = 'public_adjusting'
      OR lower(coalesce(family,'')) = 'claims' THEN 'CLAIMS'
    WHEN lower(coalesce(vertical_key,'')) = 'general_contracting'
      OR lower(coalesce(family,'')) = 'construction' THEN 'CONSTRUCTION'
    WHEN lower(concat_ws(' ',family,opportunity_key,vertical_key,title)) ~ '(permit|develop|redevelop|building)' THEN 'DEVELOPMENT'
    WHEN lower(concat_ws(' ',family,opportunity_key,vertical_key,title)) ~ '(sale|transfer|invest|commercial|ownership|foreclos|probate)' THEN 'INVESTMENT'
    WHEN lower(concat_ws(' ',family,opportunity_key,vertical_key,title)) ~ '(code|violation|compliance|blight)' THEN 'COMPLIANCE'
    ELSE 'GENERAL'
  END;
$function$;
