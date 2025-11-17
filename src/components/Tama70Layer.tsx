import { GeoJSON as LeafletGeoJSON } from "react-leaflet";
import { useState, useEffect, useCallback } from "react";
import L, { type Layer } from "leaflet";
import type { Feature, FeatureCollection, GeoJsonProperties, Point, Polygon, MultiPolygon } from "geojson";
import { supabase } from "@/lib/supabase";

// Helper function to convert Web Mercator (EPSG:3857) coordinates to WGS84 (lat/lng)
const convertWebMercatorToWGS84 = (x: number, y: number): [number, number] => {
  // Web Mercator to WGS84 conversion
  const lng = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [lat, lng];
};

// Helper function to convert ITM (Israel Grid) coordinates to WGS84 (lat/lng)
const convertITMToWGS84 = (x: number, y: number): [number, number] | null => {
  try {
    // Manual conversion - ITM to WGS84
    // Based on the official Israeli TM Grid (ITM) parameters
    const a = 6378137.0; // Semi-major axis
    const f = 1/298.257223563; // Flattening
    const e2 = 2*f - f*f; // First eccentricity squared
    const e4 = e2 * e2;
    const e6 = e4 * e2;
    // ITM projection parameters (Israeli Transverse Mercator)
    const k0 = 1.0000067; // Scale factor at central meridian
    const lat0 = 31.734393611111 * Math.PI / 180; // Central latitude in radians
    const lon0 = 35.204516944444 * Math.PI / 180; // Central longitude in radians
    const x0 = 219529.584; // False easting
    const y0 = 626907.39; // False northing
    // Convert ITM to WGS84
    const x_adj = x - x0;
    const y_adj = y - y0;
    // Calculate latitude
    const M = y_adj / (a * k0);
    const mu = M / (1 - e2/4 - 3*e4/64 - 5*e6/256);
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const J1 = 3*e1/2 - 27*e1*e1*e1/32;
    const J2 = 21*e1*e1/16 - 55*e1*e1*e1*e1/32;
    const J3 = 151*e1*e1*e1/96;
    const J4 = 1097*e1*e1*e1*e1/512;
    const fp = mu + J1*Math.sin(2*mu) + J2*Math.sin(4*mu) + J3*Math.sin(6*mu) + J4*Math.sin(8*mu);
    const e_2 = e2 / (1 - e2);
    const C1 = e_2 * Math.cos(fp) * Math.cos(fp);
    const T1 = Math.tan(fp) * Math.tan(fp);
    const N1 = a / Math.sqrt(1 - e2 * Math.sin(fp) * Math.sin(fp));
    const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(fp) * Math.sin(fp), 1.5);
    const D = x_adj / (N1 * k0);
    const lat_rad = fp - (N1 * Math.tan(fp) / R1) * (D*D/2 - (5 + 3*T1 + 10*C1 - 4*C1*C1 - 9*e_2)*D*D*D*D/24 + (61 + 90*T1 + 298*C1 + 45*T1*T1 - 252*e_2 - 3*C1*C1)*D*D*D*D*D*D/720);
    const lon_rad = lon0 + (D - (1 + 2*T1 + C1)*D*D*D/6 + (5 - 2*C1 + 28*T1 - 3*C1*C1 + 8*e_2 + 24*T1*T1)*D*D*D*D*D/120) / Math.cos(fp);
    // Convert to degrees
    const lat = lat_rad * 180 / Math.PI;
    const lng = lon_rad * 180 / Math.PI;
    // Return [lat, lng] in degrees
    return [lat, lng];
  } catch (err) {
    console.error('Error converting ITM to WGS84:', err);
    return null;
  }
};

// Helper function to convert coordinate array from Web Mercator/ITM to WGS84
const convertCoordinates = (coords: number[][]): number[][] => {
  return coords.map((coord) => {
    if (coord.length < 2) return coord;
    const [x, y] = coord;
    
    // Check if coordinates are large numbers (could be ITM or Web Mercator)
    if (x > 100000 || y > 100000) {
      // Try Web Mercator first (coordinates like 3880796, 3786990 are likely Web Mercator)
      if (x > 1000000 || y > 1000000) {
        // These look like Web Mercator coordinates - convert to WGS84
        const [convertedLat, convertedLng] = convertWebMercatorToWGS84(x, y);
        return [convertedLng, convertedLat]; // GeoJSON uses [lng, lat]
      } else {
        // These are likely ITM coordinates - convert to WGS84
        const converted = convertITMToWGS84(x, y);
        if (converted) {
          const [lat, lng] = converted;
          return [lng, lat]; // GeoJSON uses [lng, lat]
        }
      }
    }
    
    // If not converted, return as-is (assuming already WGS84)
    return coord;
  });
};

interface Tama70Properties extends GeoJsonProperties {
  id?: number;
  object_id?: number;
  plan_number?: string;
  plan_name?: string;
  last_update?: string;
  link_url?: string;
}

type Tama70Geometry = Polygon | MultiPolygon | Point;
type Tama70Feature = Feature<Tama70Geometry, Tama70Properties>;
type Tama70Collection = FeatureCollection<Tama70Geometry, Tama70Properties>;

const tama70LayerStyle = {
  color: "#dc2626",
  weight: 2,
  fillOpacity: 0.2,
  fillColor: "#ef4444",
  opacity: 0.8,
};

interface Tama70LayerProps {
  show: boolean;
}

export function Tama70Layer({ show }: Tama70LayerProps) {
  const [tama70Data, setTama70Data] = useState<Tama70Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!show) {
      setTama70Data(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadTama70 = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Loading TAMA70 plans...');

        // First, check how many plans exist in the table
        const { count } = await supabase
          .from('tama70_plans')
          .select('*', { count: 'exact', head: true })
          .or('centroid_geom.not.is.null,raw_entity->centroid.not.is.null,geom.not.is.null');
        
        console.log(`Total TAMA70 plans in table with geometry: ${count || 0}`);

        // Load plans with pagination - load all of them
        // Supabase has a default limit of 1000, so we need to use pagination
        let allPlans: any[] = [];
        let from = 0;
        const pageSize = 1000; // Max per request
        let hasMore = true;
        
        console.log('Loading TAMA70 plans with pagination...');
        
        while (hasMore) {
          const { data: plans, error: queryError } = await supabase
            .from('tama70_plans')
            .select('id, govmap_object_id, plan_number, plan_name, last_update_raw, link_url, centroid_geom, geom, raw_entity')
            .or('centroid_geom.not.is.null,raw_entity->centroid.not.is.null,geom.not.is.null')
            .order('id', { ascending: true })
            .range(from, from + pageSize - 1);
          
          if (queryError) {
            throw queryError;
          }
          
          if (plans && plans.length > 0) {
            allPlans = [...allPlans, ...plans];
            from += pageSize;
            hasMore = plans.length === pageSize;
            console.log(`Loaded ${allPlans.length} TAMA70 plans so far...`);
          } else {
            hasMore = false;
          }
        }
        
        const plans = allPlans;
        console.log(`Finished loading ${plans.length} TAMA70 plans total`);

        if (!plans || plans.length === 0) {
          if (isMounted) {
            setTama70Data({
              type: 'FeatureCollection',
              features: []
            } as Tama70Collection);
            setLoading(false);
          }
          return;
        }

        // Convert to GeoJSON
        const features = plans
          .map((plan: any, index: number) => {
            try {
              let geometry: Tama70Geometry | null = null;

              // Try to use geom (polygon) first, then centroid_geom (point), then raw_entity.centroid
              if (plan.geom) {
                // geom is a PostGIS geometry - we can't directly use it in client-side
                // For now, skip geom and use centroid instead
                // TODO: Use RPC function to convert geom from PostGIS to GeoJSON
              }

              // Try centroid_geom (PostGIS geometry point) - skip for now, use raw_entity.centroid
              // Use centroid jsonb array from raw_entity
              let centroidData = plan.raw_entity?.centroid;
              
              if (!centroidData) {
                return null;
              }

              let coords: number[] | null = null;

              if (Array.isArray(centroidData)) {
                coords = centroidData.slice(0, 2).map((v: any) => Number(v));
              } else if (centroidData?.coordinates && Array.isArray(centroidData.coordinates)) {
                coords = centroidData.coordinates.slice(0, 2).map((v: any) => Number(v));
              } else if (centroidData?.lng && centroidData?.lat) {
                coords = [Number(centroidData.lng), Number(centroidData.lat)];
              }

              if (!coords || coords.length < 2 || isNaN(coords[0]) || isNaN(coords[1])) {
                return null;
              }

              let [first, second] = coords;
              let finalX: number;
              let finalY: number;

              // Check if coordinates are large numbers (could be ITM or Web Mercator)
              // ITM: typically 100,000 - 1,100,000
              // Web Mercator: typically millions (e.g., 3,816,333)
              if (first > 100000 || second > 100000) {
                // Try Web Mercator first (coordinates like 3816333, 3659807 are likely Web Mercator)
                if (first > 1000000 || second > 1000000) {
                  // These look like Web Mercator coordinates - convert to WGS84
                  const [convertedLat, convertedLng] = convertWebMercatorToWGS84(first, second);
                  finalX = convertedLng; // GeoJSON uses [lng, lat]
                  finalY = convertedLat;
                  
                  if (index < 5) {
                    console.log(`TAMA70 plan ${plan.id} converted from Web Mercator [${first}, ${second}] to WGS84 [${finalX}, ${finalY}]`);
                  }
                } else {
                  // These are likely ITM coordinates - convert to WGS84
                  const converted = convertITMToWGS84(first, second);
                  if (!converted) {
                    if (index < 5) {
                      console.warn(`TAMA70 plan ${plan.id} ITM conversion failed for [${first}, ${second}]`);
                    }
                    return null;
                  }
                  const [convertedLat, convertedLng] = converted;
                  finalX = convertedLng; // GeoJSON uses [lng, lat]
                  finalY = convertedLat;
                  
                  if (index < 5) {
                    console.log(`TAMA70 plan ${plan.id} converted from ITM [${first}, ${second}] to WGS84 [${finalX}, ${finalY}]`);
                  }
                }
                
                // Validate converted coordinates are in Israel bounds
                if (finalY < 29 || finalY > 34 || finalX < 34 || finalX > 36) {
                  if (index < 5) {
                    console.warn(`TAMA70 plan ${plan.id} converted coordinates outside Israel: [${finalX}, ${finalY}]`);
                  }
                  return null;
                }
              } else {
                // Not ITM - use coordinates as-is, but validate they're in Israel bounds
                finalX = first;
                finalY = second;
                
                // Validate coordinates are in valid Israel WGS84 bounds
                if (finalY < 29 || finalY > 34 || finalX < 34 || finalX > 36) {
                  // Try swapping coordinates - maybe they're stored as [lat, lng]
                  if (finalX >= 29 && finalX <= 34 && finalY >= 34 && finalY <= 36) {
                    const tempX = finalX;
                    finalX = finalY;
                    finalY = tempX;
                  } else {
                    return null;
                  }
                }
              }

              const [lng, lat] = [finalX, finalY];

              // Create Point geometry from centroid
              geometry = {
                type: 'Point' as const,
                coordinates: [lng, lat] as [number, number]
              };

              return {
                type: 'Feature' as const,
                properties: {
                  id: plan.id,
                  object_id: plan.govmap_object_id || plan.object_id,
                  plan_number: plan.plan_number,
                  plan_name: plan.plan_name,
                  last_update: plan.last_update_raw,
                  link_url: plan.link_url,
                },
                geometry: geometry
              };
            } catch (err) {
              console.error(`Error processing TAMA70 plan ${plan.id}:`, err);
              return null;
            }
          })
          .filter((f): f is Tama70Feature => f !== null);

        // Log summary
        console.log(`TAMA70 plans loaded: ${plans.length} total, ${features.length} successfully converted and displayed`);

        if (isMounted) {
          setTama70Data({
            type: 'FeatureCollection',
            features: features
          } as Tama70Collection);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "שגיאה בטעינת תמא/70");
        setTama70Data(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTama70();

    return () => {
      isMounted = false;
    };
  }, [show]);

  const handleFeature = useCallback((feature: Feature, layer: Layer) => {
    const props = (feature as Tama70Feature).properties || {};
    const popupParts: string[] = [
      '<div dir="rtl" style="text-align:right;">',
      '<div style="font-weight:700;font-size:14px;margin-bottom:4px;">תמא/70 - מטרו</div>',
    ];

    if (props.plan_number) {
      popupParts.push(`<div style="font-size:13px;color:#374151;">מספר תכנית: ${props.plan_number}</div>`);
    }
    if (props.plan_name) {
      popupParts.push(`<div style="font-size:13px;color:#374151;">שם תכנית: ${props.plan_name}</div>`);
    }
    if (props.last_update) {
      popupParts.push(`<div style="font-size:12px;color:#6b7280;margin-top:4px;">עדכון אחרון: ${props.last_update}</div>`);
    }
    if (props.link_url) {
      popupParts.push(`<div style="font-size:12px;color:#6b7280;"><a href="${props.link_url}" target="_blank">קישור לתכנית</a></div>`);
    }

    popupParts.push("</div>");
    layer.bindPopup(popupParts.join(""));
  }, []);

  if (!show || !tama70Data || tama70Data.features.length === 0) {
    return null;
  }

  return (
    <LeafletGeoJSON
      key={`tama70-${tama70Data.features.length}`}
      data={tama70Data}
      style={() => tama70LayerStyle}
      pointToLayer={(feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 6,
          fillColor: "#ef4444",
          color: "#dc2626",
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.6
        });
      }}
      onEachFeature={handleFeature}
    />
  );
}

