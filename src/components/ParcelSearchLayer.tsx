import { useEffect, useState } from "react";
import { GeoJSON as LeafletGeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import type { Feature, FeatureCollection } from "geojson";

interface ParcelSearchLayerProps {
  gush?: string;
  helka?: string;
  onParcelFound?: (parcel: Feature) => void;
}

const parcelStyle: L.PathOptions = {
  color: "#ef4444",
  weight: 3,
  fillOpacity: 0.2,
  fillColor: "#ef4444",
  opacity: 0.9,
};

export function ParcelSearchLayer({ gush, helka, onParcelFound }: ParcelSearchLayerProps) {
  const map = useMap();
  const [parcelData, setParcelData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gush || !helka) {
      setParcelData(null);
      return;
    }

    const searchParcel = async () => {
      setLoading(true);
      setError(null);
      setParcelData(null);

      try {
        const gushNum = parseInt(gush, 10);
        const helkaNum = parseInt(helka, 10);

        if (isNaN(gushNum) || isNaN(helkaNum)) {
          throw new Error("גוש וחלקה חייבים להיות מספרים");
        }

        // WFS URL from GovMap
        const wfsUrl = `https://ags.govmap.gov.il/arcgis/services/cadastre/MapServer/WFSServer?service=WFS&version=2.0.0&request=GetFeature&typeName=Cadastre&outputFormat=application/json&CQL_FILTER=gush=${gushNum}%20AND%20helka=${helkaNum}`;

        console.log("Searching parcel via WFS:", wfsUrl);

        const response = await fetch(wfsUrl);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Check if we got features
        if (data.features && data.features.length > 0) {
          const featureCollection: FeatureCollection = {
            type: "FeatureCollection",
            features: data.features,
          };

          setParcelData(featureCollection);

          // Notify parent component
          if (onParcelFound && data.features[0]) {
            onParcelFound(data.features[0]);
          }

          // Zoom to parcel
          setTimeout(() => {
            const layer = L.geoJSON(featureCollection);
            if (layer.getBounds().isValid()) {
              map.fitBounds(layer.getBounds(), {
                padding: [50, 50],
                maxZoom: 16,
              });
            }
          }, 100);
        } else {
          throw new Error("לא נמצאה חלקה עם הגוש והחלקה שצוינו");
        }
      } catch (err) {
        console.error("Error searching parcel:", err);
        setError(err instanceof Error ? err.message : "שגיאה בחיפוש חלקה");
        setParcelData(null);
      } finally {
        setLoading(false);
      }
    };

    searchParcel();
  }, [gush, helka, map, onParcelFound]);

  if (loading) {
    return null; // You can add a loading indicator here if needed
  }

  if (error) {
    console.error("Parcel search error:", error);
    return null; // You can add an error message here if needed
  }

  if (!parcelData || parcelData.features.length === 0) {
    return null;
  }

  return (
    <LeafletGeoJSON
      data={parcelData}
      style={parcelStyle}
      onEachFeature={(feature, layer) => {
        // Add popup with parcel info
        const props = feature.properties || {};
        const popupContent = `
          <div style="text-align: right; direction: rtl;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #ef4444;">
              חלקה שנמצאה
            </h3>
            <p style="margin: 5px 0;"><strong>גוש:</strong> ${props.gush || gush}</p>
            <p style="margin: 5px 0;"><strong>חלקה:</strong> ${props.helka || helka}</p>
            ${props.area ? `<p style="margin: 5px 0;"><strong>שטח:</strong> ${props.area} מ"ר</p>` : ""}
          </div>
        `;
        layer.bindPopup(popupContent);

        // Highlight on hover
        layer.on({
          mouseover: (e) => {
            const layer = e.target;
            layer.setStyle({
              weight: 5,
              fillOpacity: 0.3,
            });
          },
          mouseout: (e) => {
            const layer = e.target;
            layer.setStyle(parcelStyle);
          },
        });
      }}
    />
  );
}

