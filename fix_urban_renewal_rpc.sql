-- Fix RPC function to transform coordinates from Israel Grid to WGS84
-- Run this in your Supabase SQL editor

-- First, check what SRID the geometry is stored in
-- You can run this query to check:
-- SELECT ST_SRID(geom) FROM govmap_urban_renewal_compounds LIMIT 1;

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS get_urban_renewal_compounds_geojson();

-- Create RPC function with coordinate transformation
-- This assumes the geometry is in Israel Grid (SRID 2039) or similar
-- If it's a different SRID, change 2039 to the correct one
CREATE OR REPLACE FUNCTION get_urban_renewal_compounds_geojson()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  source_srid integer;
BEGIN
  -- Get the SRID of the first geometry to determine the source projection
  SELECT ST_SRID(geom) INTO source_srid
  FROM govmap_urban_renewal_compounds
  WHERE geom IS NOT NULL
  LIMIT 1;
  
  -- If no SRID found or already WGS84, use direct conversion
  IF source_srid IS NULL OR source_srid = 4326 THEN
    SELECT jsonb_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'properties', jsonb_build_object(
              'object_id', object_id,
              'caption', caption,
              'heara', heara,
              'kishur', kishur,
              'source', source,
              'project_name', project_name,
              'city_name', city_name,
              'city_code', city_code,
              'neighborhood_name', neighborhood_name,
              'status', status,
              'approval_stage', approval_stage,
              'housing_units', housing_units,
              'planned_units', planned_units,
              'executing_body', executing_body,
              'last_update', last_update,
              'remarks', remarks
            ),
            'geometry', ST_AsGeoJSON(geom)::jsonb
          )
        ),
        '[]'::jsonb
      )
    )
    INTO result
    FROM govmap_urban_renewal_compounds
    WHERE geom IS NOT NULL;
  ELSE
    -- Transform from source SRID to WGS84 (4326)
    SELECT jsonb_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'properties', jsonb_build_object(
              'object_id', object_id,
              'caption', caption,
              'heara', heara,
              'kishur', kishur,
              'source', source,
              'project_name', project_name,
              'city_name', city_name,
              'city_code', city_code,
              'neighborhood_name', neighborhood_name,
              'status', status,
              'approval_stage', approval_stage,
              'housing_units', housing_units,
              'planned_units', planned_units,
              'executing_body', executing_body,
              'last_update', last_update,
              'remarks', remarks
            ),
            'geometry', ST_AsGeoJSON(ST_Transform(geom, 4326))::jsonb
          )
        ),
        '[]'::jsonb
      )
    )
    INTO result
    FROM govmap_urban_renewal_compounds
    WHERE geom IS NOT NULL;
  END IF;
  
  RETURN COALESCE(result, '{"type":"FeatureCollection","features":[]}'::jsonb);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_urban_renewal_compounds_geojson() TO anon;
GRANT EXECUTE ON FUNCTION get_urban_renewal_compounds_geojson() TO authenticated;





