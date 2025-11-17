import { GeoJSON as LeafletGeoJSON } from "react-leaflet";
import { useState, useEffect, useCallback } from "react";
import L, { type Layer } from "leaflet";
import type { Feature, FeatureCollection, GeoJsonProperties, Point } from "geojson";
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

interface ParcelsProperties extends GeoJsonProperties {
  id?: number;
  object_id?: number;
  gush_num?: number;
  gush_suffix?: number;
  parcel?: number;
  legal_area?: number;
  ownership_type?: string;
  remark?: string;
  doc_url?: string;
}

type ParcelsFeature = Feature<Point, ParcelsProperties>;
type ParcelsCollection = FeatureCollection<Point, ParcelsProperties>;

const parcelsLayerStyle = {
  color: "#059669",
  weight: 1.5,
  fillOpacity: 0.2,
  fillColor: "#10b981",
  opacity: 0.7,
};

interface ParcelsLayerProps {
  show: boolean;
}

export function ParcelsLayer({ show }: ParcelsLayerProps) {
  const [parcelsData, setParcelsData] = useState<ParcelsCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!show) {
      setParcelsData(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadParcels = async () => {
      try {
        setLoading(true);
        setError(null);

        // Skip RPC function - ST_Transform from ITM is too slow and times out
        // Use direct query fallback only - will show parcels with WGS84 coordinates
        console.log('Skipping RPC function - using direct query fallback');

        // Fallback: Direct query - use raw_entity->centroid (centroid_geom is PostGIS and requires RPC)
        // First, check how many parcels exist in the table
        const { count } = await supabase
          .from('parcel_ownership_new')
          .select('*', { count: 'exact', head: true })
          .not('raw_entity->centroid', 'is', null);
        
        console.log(`Total parcels in table with coordinates: ${count || 0}`);

        // Load parcels with pagination - load all of them (12,000+)
        // Supabase has a default limit of 1000, so we need to use pagination
        // Use smaller page size to avoid timeout
        let allParcels: any[] = [];
        let from = 0;
        const pageSize = 500; // Reduced from 1000 to avoid timeout
        let hasMore = true;
        
        console.log('Loading parcels with pagination...');
        
        while (hasMore) {
          const { data: parcels, error: queryError } = await supabase
            .from('parcel_ownership_new')
            .select('id, govmap_object_id, gush_num, gush_suffi, parcel, legal_area_m2, ownership_type, remark, doc_url, raw_entity')
            .not('raw_entity->centroid', 'is', null)
            .order('id', { ascending: true })
            .range(from, from + pageSize - 1);
          
          if (queryError) {
            throw queryError;
          }
          
          if (parcels && parcels.length > 0) {
            allParcels = [...allParcels, ...parcels];
            from += pageSize;
            hasMore = parcels.length === pageSize;
            console.log(`Loaded ${allParcels.length} parcels so far...`);
          } else {
            hasMore = false;
          }
        }
        
        const parcels = allParcels;
        console.log(`Finished loading ${parcels.length} parcels total`);

        if (!parcels || parcels.length === 0) {
          if (isMounted) {
            setParcelsData({
              type: 'FeatureCollection',
              features: []
            } as ParcelsCollection);
            setLoading(false);
          }
          return;
        }

        // Convert to GeoJSON - only use coordinates already in WGS84
        const features = parcels
          .map((parcel: any, index: number) => {
            try {
              let coords: number[] | null = null;
              
              // Try to get coordinates from centroid_geom (geometry column) first
              // centroid_geom is a PostGIS geometry with SRID 2039 (ITM)
              // If centroid_geom exists, we need to use RPC to convert it
              // For now, use centroid jsonb array from raw_entity
              
              // Use centroid jsonb array from raw_entity (centroid is stored in raw_entity)
              let centroidData = parcel.raw_entity?.centroid;
              
              if (!centroidData) {
                // If no centroid in raw_entity, skip this parcel
                return null;
              }

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
                    console.log(`Parcel ${parcel.id} converted from Web Mercator [${first}, ${second}] to WGS84 [${finalX}, ${finalY}]`);
                  }
                } else {
                  // These are likely ITM coordinates - convert to WGS84
                  const converted = convertITMToWGS84(first, second);
                  if (!converted) {
                    if (index < 5) {
                      console.warn(`Parcel ${parcel.id} ITM conversion failed for [${first}, ${second}]`);
                    }
                    return null;
                  }
                  const [convertedLat, convertedLng] = converted;
                  finalX = convertedLng; // GeoJSON uses [lng, lat]
                  finalY = convertedLat;
                  
                  if (index < 5) {
                    console.log(`Parcel ${parcel.id} converted from ITM [${first}, ${second}] to WGS84 [${finalX}, ${finalY}]`);
                  }
                }
                
                // Validate converted coordinates are in Israel bounds
                if (finalY < 29 || finalY > 34 || finalX < 34 || finalX > 36) {
                  if (index < 5) {
                    console.warn(`Parcel ${parcel.id} converted coordinates outside Israel: [${finalX}, ${finalY}]`);
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

              // Extract properties from fields array in raw_entity
              const fields = parcel.raw_entity?.fields || [];
              const gushNum = fields.find((f: any) => f.fieldName === 'גוש')?.fieldValue || parcel.gush_num;
              const gushSuffix = fields.find((f: any) => f.fieldName === 'תת גוש')?.fieldValue || parcel.gush_suffi;
              const parcelNum = fields.find((f: any) => f.fieldName === 'חלקה')?.fieldValue || parcel.parcel;
              const legalArea = fields.find((f: any) => f.fieldName === 'שטח רשום (מ"ר)')?.fieldValue || parcel.legal_area_m2;
              const ownershipType = fields.find((f: any) => f.fieldName === 'סוג בעלות')?.fieldValue || parcel.ownership_type;
              const remark = fields.find((f: any) => f.fieldName === 'הערה')?.fieldValue || parcel.remark;

              return {
                type: 'Feature' as const,
                properties: {
                  id: parcel.id,
                  object_id: parcel.govmap_object_id || parcel.object_id,
                  gush_num: gushNum,
                  gush_suffix: gushSuffix,
                  parcel: parcelNum,
                  legal_area: legalArea,
                  ownership_type: ownershipType,
                  remark: remark,
                  doc_url: parcel.doc_url,
                },
                geometry: {
                  type: 'Point' as const,
                  coordinates: [lng, lat] as [number, number]
                }
              };
            } catch (err) {
              console.error(`Error processing parcel ${parcel.id}:`, err);
              return null;
            }
          })
          .filter((f): f is ParcelsFeature => f !== null);

        // Log summary
        console.log(`Parcels loaded: ${parcels.length} total, ${features.length} successfully converted and displayed`);

        if (isMounted) {
          setParcelsData({
            type: 'FeatureCollection',
            features: features
          } as ParcelsCollection);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "שגיאה בטעינת חלקות");
        setParcelsData(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadParcels();

    return () => {
      isMounted = false;
    };
  }, [show]);

  const handleFeature = useCallback((feature: Feature, layer: Layer) => {
    const props = (feature as ParcelsFeature).properties || {};
    const popupParts: string[] = [
      '<div dir="rtl" style="text-align:right;">',
      '<div style="font-weight:700;font-size:14px;margin-bottom:4px;">חלקה</div>',
    ];

    if (props.gush_num) {
      popupParts.push(`<div style="font-size:13px;color:#374151;">מספר גוש: ${props.gush_num}</div>`);
    }
    if (props.gush_suffix) {
      popupParts.push(`<div style="font-size:13px;color:#374151;">תת גוש: ${props.gush_suffix}</div>`);
    }
    if (props.parcel) {
      popupParts.push(`<div style="font-size:13px;color:#374151;">מספר חלקה: ${props.parcel}</div>`);
    }
    if (props.legal_area) {
      popupParts.push(`<div style="font-size:13px;color:#374151;">שטח רשום: ${props.legal_area} מ"ר</div>`);
    }
    if (props.ownership_type) {
      popupParts.push(`<div style="font-size:12px;color:#6b7280;margin-top:4px;">סוג בעלות: ${props.ownership_type}</div>`);
    }
    if (props.remark) {
      popupParts.push(`<div style="font-size:12px;color:#6b7280;">הערה: ${props.remark}</div>`);
    }
    if (props.doc_url) {
      popupParts.push(`<div style="font-size:12px;color:#6b7280;"><a href="${props.doc_url}" target="_blank">קישור למסמך</a></div>`);
    }

    popupParts.push("</div>");
    layer.bindPopup(popupParts.join(""));
  }, []);

  if (!show || !parcelsData || parcelsData.features.length === 0) {
    return null;
  }

  return (
    <LeafletGeoJSON
      key={`parcels-${parcelsData.features.length}`}
      data={parcelsData}
      style={() => parcelsLayerStyle}
      pointToLayer={(feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 5,
          fillColor: "#10b981",
          color: "#059669",
          weight: 1.5,
          opacity: 0.7,
          fillOpacity: 0.6
        });
      }}
      onEachFeature={handleFeature}
    />
  );
}

