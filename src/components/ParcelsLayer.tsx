import { GeoJSON as LeafletGeoJSON } from "react-leaflet";
import { useState, useEffect, useCallback } from "react";
import L, { type Layer } from "leaflet";
import type { Feature, FeatureCollection, GeoJsonProperties, Point } from "geojson";

// Backend API URL - use environment variable or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

        console.log('Loading parcels from backend API with progressive loading...');

        // Progressive loading - load chunks and update map immediately
        let allFeatures: ParcelsFeature[] = [];
        let page = 1;
        const pageSize = 500;
        let hasMore = true;
        
        // Initialize with empty FeatureCollection
        if (isMounted) {
          setParcelsData({
            type: 'FeatureCollection',
            features: []
          } as ParcelsCollection);
        }

        while (hasMore && isMounted) {
          try {
            // Fetch chunk from backend API
            const response = await fetch(
              `${API_URL}/api/parcels/chunk?page=${page}&pageSize=${pageSize}`
            );

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.features && data.features.length > 0) {
              // Add new features to existing ones
              allFeatures = [...allFeatures, ...data.features];
              
              // Update map immediately with current features
              if (isMounted) {
                setParcelsData({
                  type: 'FeatureCollection',
                  features: allFeatures
                } as ParcelsCollection);
              }

              console.log(`Loaded chunk ${page}: ${data.features.length} parcels, total: ${allFeatures.length}`);

              // Check if there are more chunks
              hasMore = data.hasMore === true;
              page++;
            } else {
              hasMore = false;
            }
          } catch (chunkError) {
            console.error(`Error loading chunk ${page}:`, chunkError);
            // Continue to next chunk instead of failing completely
            hasMore = false;
          }
        }

        console.log(`Finished loading ${allFeatures.length} parcels total`);

        if (isMounted) {
          setLoading(false);
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

