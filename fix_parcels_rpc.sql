-- Create RPC function to convert govmap_parcels centroids from ITM (EPSG:2039) to WGS84
-- Based on the data structure: centroid is [x, y] = [easting, northing] in ITM format

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS get_govmap_parcels_geojson();

-- Create RPC function - convert from centroid jsonb array (ITM 2039) to WGS84 (4326)
CREATE OR REPLACE FUNCTION get_govmap_parcels_geojson()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Convert centroid jsonb array from ITM (2039) to WGS84 (4326)
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
            'parcel', parcel,
            'legal_area', legal_area,
            'status_text', status_text,
            'note', note
          ),
          'geometry', 
          ST_AsGeoJSON(
            ST_Transform(
              ST_SetSRID(
                ST_MakePoint(
                  (centroid->>0)::numeric,  -- x (easting)
                  (centroid->>1)::numeric   -- y (northing)
                ),
                2039  -- ITM SRID (Israeli Transverse Mercator)
              ),
              4326  -- WGS84 SRID
            )
          )::jsonb
        )
      ) FILTER (WHERE centroid IS NOT NULL AND jsonb_typeof(centroid) = 'array' AND jsonb_array_length(centroid) >= 2),
      '[]'::jsonb
    )
  )
  INTO result
  FROM govmap_parcels
  WHERE centroid IS NOT NULL
    AND jsonb_typeof(centroid) = 'array'
    AND jsonb_array_length(centroid) >= 2
  LIMIT 5; -- Very small limit - ST_Transform from ITM is slow
  
  RETURN COALESCE(result, '{"type":"FeatureCollection","features":[]}'::jsonb);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_govmap_parcels_geojson() TO anon;
GRANT EXECUTE ON FUNCTION get_govmap_parcels_geojson() TO authenticated;

