import { GeoJSON as LeafletGeoJSON } from "react-leaflet";
import { useState, useEffect, useCallback } from "react";
import L, { type Layer } from "leaflet";
import type { Feature, FeatureCollection, GeoJsonProperties, Point } from "geojson";

// Backend API URL - use environment variable or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface GushimProperties extends GeoJsonProperties {
  id?: number;
  object_id?: number;
  gush_num?: number;
  gush_suffix?: number | null;
  status_text?: string | null;
}

type GushimFeature = Feature<Point, GushimProperties>;
type GushimCollection = FeatureCollection<Point, GushimProperties>;

const gushimLayerStyle = {
  color: "#3b82f6",
  weight: 1.5,
  fillOpacity: 0.2,
  fillColor: "#60a5fa",
  opacity: 0.7,
};

interface GushimLayerProps {
  show: boolean;
}

export function GushimLayer({ show }: GushimLayerProps) {
  const [gushimData, setGushimData] = useState<GushimCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!show) {
      setGushimData(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadGushim = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Loading gushim from backend API with progressive loading...');

        // Progressive loading - load chunks and update map immediately
        let allFeatures: GushimFeature[] = [];
        let page = 1;
        const pageSize = 500;
        let hasMore = true;
        
        // Initialize with empty FeatureCollection
        if (isMounted) {
          setGushimData({
            type: 'FeatureCollection',
            features: []
          } as GushimCollection);
        }

        while (hasMore && isMounted) {
          try {
            // Fetch chunk from backend API
            const response = await fetch(
              `${API_URL}/api/gushim/chunk?page=${page}&pageSize=${pageSize}`
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
                setGushimData({
                  type: 'FeatureCollection',
                  features: allFeatures
                } as GushimCollection);
              }

              console.log(`Loaded chunk ${page}: ${data.features.length} gushim, total: ${allFeatures.length}`);

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

        console.log(`Finished loading ${allFeatures.length} gushim total`);

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "שגיאה בטעינת גושים");
        setGushimData(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadGushim();

    return () => {
      isMounted = false;
    };
  }, [show]);

  const handleFeature = useCallback((feature: Feature, layer: Layer) => {
    const props = (feature as GushimFeature).properties || {};
    const popupParts: string[] = [
      '<div dir="rtl" style="text-align:right;">',
      '<div style="font-weight:700;font-size:14px;margin-bottom:4px;">גוש</div>',
    ];

    if (props.gush_num) {
      popupParts.push(`<div style="font-size:13px;color:#374151;">מספר גוש: ${props.gush_num}</div>`);
    }
    if (props.gush_suffix) {
      popupParts.push(`<div style="font-size:13px;color:#374151;">תת גוש: ${props.gush_suffix}</div>`);
    }
    if (props.status_text) {
      popupParts.push(`<div style="font-size:12px;color:#6b7280;margin-top:4px;">סטטוס: ${props.status_text}</div>`);
    }

    popupParts.push("</div>");
    layer.bindPopup(popupParts.join(""));
  }, []);

  if (!show || !gushimData || gushimData.features.length === 0) {
    return null;
  }

  return (
    <LeafletGeoJSON
      key={`gushim-${gushimData.features.length}`}
      data={gushimData}
      style={() => gushimLayerStyle}
      pointToLayer={(feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 5,
          fillColor: "#60a5fa",
          color: "#3b82f6",
          weight: 1.5,
          opacity: 0.7,
          fillOpacity: 0.6
        });
      }}
      onEachFeature={handleFeature}
    />
  );
}

