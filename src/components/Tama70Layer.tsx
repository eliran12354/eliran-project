import { GeoJSON as LeafletGeoJSON } from "react-leaflet";
import { useState, useEffect, useCallback } from "react";
import L, { type Layer } from "leaflet";
import type { Feature, FeatureCollection, GeoJsonProperties, Point, Polygon, MultiPolygon } from "geojson";
import { tama70Queries } from "@/lib/api/tama70Api";

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

        const geojson = await tama70Queries.getAsGeoJSON();

        if (isMounted) {
          setTama70Data(geojson as Tama70Collection);
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

