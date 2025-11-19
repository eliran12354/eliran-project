-- Test different coordinate systems to find the correct one
-- The coordinates [3880796, 3786990] are too large for ITM (SRID 2039)
-- Maybe they're in Web Mercator (EPSG:3857) or another system?

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS get_govmap_gushim_geojson();

-- Create RPC function - try Web Mercator (EPSG:3857) instead of ITM
CREATE OR REPLACE FUNCTION get_govmap_gushim_geojson()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Try Web Mercator (EPSG:3857) - commonly used for web maps
  -- Web Mercator coordinates are typically in meters, can be millions
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'properties', jsonb_build_object(
            'id', id,
            'object_id', object_id,
            'gush_num', gush_num,
            'gush_suffix', gush_suffix,
            'status_text', status_text
          ),
          'geometry', 
          -- Try Web Mercator (EPSG:3857) - coordinates are [x, y] in meters
          -- centroid[0] = x (easting), centroid[1] = y (northing)
          ST_AsGeoJSON(
            ST_Transform(
              ST_SetSRID(
                ST_MakePoint(
                  (centroid->>0)::numeric,
                  (centroid->>1)::numeric
                ),
                3857  -- Web Mercator (EPSG:3857)
              ),
              4326  -- WGS84 SRID
            )
          )::jsonb
        )
      ) FILTER (WHERE centroid IS NOT NULL AND jsonb_typeof(centroid) = 'array'),
      '[]'::jsonb
    )
  )
  INTO result
  FROM govmap_gushim
  WHERE centroid IS NOT NULL
    AND jsonb_typeof(centroid) = 'array'
    AND jsonb_array_length(centroid) >= 2
  LIMIT 20;
  
  RETURN COALESCE(result, '{"type":"FeatureCollection","features":[]}'::jsonb);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_govmap_gushim_geojson() TO anon;
GRANT EXECUTE ON FUNCTION get_govmap_gushim_geojson() TO authenticated;
