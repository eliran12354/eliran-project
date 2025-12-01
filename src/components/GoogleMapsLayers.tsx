import { useEffect, useState, useMemo, useRef } from "react";
import { useMap, InfoWindow } from "@vis.gl/react-google-maps";
import { urbanRenewalCompoundQueries } from "@/lib/supabase-queries";
import type { Feature, FeatureCollection, Polygon as GeoJSONPolygon, MultiPolygon } from "geojson";

interface UrbanRenewalProperties {
  object_id?: number;
  caption?: string;
  heara?: string;
  kishur?: string;
  source?: string;
  project_name?: string;
  city_name?: string;
  city_code?: number;
  neighborhood_name?: string;
  status?: string;
  approval_stage?: string;
  housing_units?: number;
  planned_units?: number;
  executing_body?: string;
  last_update?: string;
  remarks?: string;
}

type UrbanRenewalFeature = Feature<GeoJSONPolygon | MultiPolygon, UrbanRenewalProperties>;
type UrbanRenewalCollection = FeatureCollection<GeoJSONPolygon | MultiPolygon, UrbanRenewalProperties>;

interface PriceProgramProperties {
  ProjectNam?: string;
  ActiveProj?: number;
  HousingUni?: number;
  PriceForMe?: number;
  StartSignu?: string;
  EndSignupD?: string;
  Marketin_1?: string;
  Marketin_2?: string;
}

type PriceProgramFeature = Feature<GeoJSONPolygon | MultiPolygon, PriceProgramProperties>;
type PriceProgramCollection = FeatureCollection<GeoJSONPolygon | MultiPolygon, PriceProgramProperties>;

interface GoogleMapsLayersProps {
  showUrbanRenewal?: boolean;
  showPriceProgram?: boolean;
}

// Convert GeoJSON coordinates to Google Maps LatLng arrays
const polygonToGoogleMapsPath = (coordinates: number[][][]): google.maps.LatLng[] => {
  const outerRing = coordinates[0] || [];
  return outerRing.map(coord => new google.maps.LatLng(coord[1], coord[0]));
};

const multiPolygonToPaths = (coordinates: number[][][][]): google.maps.LatLng[][] => {
  return coordinates.map(polygon => {
    const outerRing = polygon[0] || [];
    return outerRing.map(coord => new google.maps.LatLng(coord[1], coord[0]));
  });
};

function UrbanRenewalLayer({ show, map }: { show: boolean; map: google.maps.Map | null }) {
  const [urbanRenewalData, setUrbanRenewalData] = useState<UrbanRenewalCollection | null>(null);
  const [urbanRenewalLoading, setUrbanRenewalLoading] = useState(false);
  const [urbanRenewalError, setUrbanRenewalError] = useState<string | null>(null);
  const [selectedUrbanRenewalId, setSelectedUrbanRenewalId] = useState<number | null>(null);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Load urban renewal data
  useEffect(() => {
    if (!show) {
      setUrbanRenewalData(null);
      return;
    }

    let isMounted = true;

    const loadUrbanRenewalLayer = async () => {
      try {
        setUrbanRenewalLoading(true);
        setUrbanRenewalError(null);

        const geoJSON = await urbanRenewalCompoundQueries.getAsGeoJSON();

        if (isMounted) {
          if (geoJSON && geoJSON.features && geoJSON.features.length > 0) {
            setUrbanRenewalData(geoJSON as UrbanRenewalCollection);
          } else {
            setUrbanRenewalData({
              type: 'FeatureCollection',
              features: []
            } as UrbanRenewalCollection);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Error loading urban renewal layer:', err);
        setUrbanRenewalError(errorMessage || "שגיאה לא ידועה בטעינת שכבת התחדשות עירונית");
        setUrbanRenewalData(null);
      } finally {
        if (isMounted) {
          setUrbanRenewalLoading(false);
        }
      }
    };

    loadUrbanRenewalLayer();

    return () => {
      isMounted = false;
    };
  }, [show]);

  // Create and manage polygons on the map
  useEffect(() => {
    if (!map || !urbanRenewalData || !show) {
      // Clear existing polygons
      polygonsRef.current.forEach(polygon => polygon.setMap(null));
      polygonsRef.current = [];
      return;
    }

    // Clear existing polygons
    polygonsRef.current.forEach(polygon => polygon.setMap(null));
    polygonsRef.current = [];

    // Create polygons for each feature
    urbanRenewalData.features.forEach((feature) => {
      const props = feature.properties || {};
      const objectId = props.object_id;
      if (!objectId) return;

      try {
        let paths: google.maps.LatLng[] | google.maps.LatLng[][] = [];

        if (feature.geometry.type === 'Polygon') {
          paths = polygonToGoogleMapsPath(feature.geometry.coordinates);
        } else if (feature.geometry.type === 'MultiPolygon') {
          paths = multiPolygonToPaths(feature.geometry.coordinates);
        }

        // Create polygon(s) for this feature
        const pathsArray = Array.isArray(paths[0]) && paths[0] instanceof google.maps.LatLng
          ? (paths as google.maps.LatLng[][])
          : [paths as google.maps.LatLng[]];

        pathsArray.forEach((path) => {
          const polygon = new google.maps.Polygon({
            paths: path,
            map: map,
            fillColor: "#a855f7",
            fillOpacity: 0.3,
            strokeColor: "#9333ea",
            strokeWeight: 2,
            strokeOpacity: 0.8,
          });

          // Add click event
          polygon.addListener('click', () => {
            setSelectedUrbanRenewalId(objectId);
          });

          polygonsRef.current.push(polygon);
        });
      } catch (err) {
        console.error(`Error creating polygon for feature ${objectId}:`, err);
      }
    });

    // Cleanup function
    return () => {
      polygonsRef.current.forEach(polygon => polygon.setMap(null));
      polygonsRef.current = [];
    };
  }, [map, urbanRenewalData, show]);

  // Handle InfoWindow
  const selectedUrbanRenewalFeature = useMemo(() => {
    if (!selectedUrbanRenewalId || !urbanRenewalData) return null;
    return urbanRenewalData.features.find(
      (feature) => feature.properties?.object_id === selectedUrbanRenewalId
    ) ?? null;
  }, [selectedUrbanRenewalId, urbanRenewalData]);

  // Show/hide InfoWindow
  useEffect(() => {
    if (!map) return;

    // Close existing InfoWindow
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
      infoWindowRef.current = null;
    }

    if (!selectedUrbanRenewalFeature) return;

    const props = selectedUrbanRenewalFeature.properties || {};
    
    // Calculate center for InfoWindow
    let center: google.maps.LatLng | null = null;
    
    try {
      let coords: number[][] = [];
      if (selectedUrbanRenewalFeature.geometry.type === 'Polygon') {
        coords = selectedUrbanRenewalFeature.geometry.coordinates[0] || [];
      } else if (selectedUrbanRenewalFeature.geometry.type === 'MultiPolygon') {
        coords = selectedUrbanRenewalFeature.geometry.coordinates[0]?.[0] || [];
      }

      if (coords.length > 0) {
        let sumLat = 0;
        let sumLng = 0;
        coords.forEach(coord => {
          sumLat += coord[1];
          sumLng += coord[0];
        });
        center = new google.maps.LatLng(sumLat / coords.length, sumLng / coords.length);
      }
    } catch (err) {
      console.error('Error calculating center:', err);
    }

    if (!center) return;

    // Create InfoWindow content
    const content = `
      <div dir="rtl" style="padding: 8px; min-width: 280px; max-width: 380px;">
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 8px; color: #111827;">
          התחדשות עירונית
        </div>
        ${props.project_name ? `<div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;"><span style="font-weight: 600;">שם פרויקט:</span> ${props.project_name}</div>` : ''}
        ${props.city_name ? `<div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;"><span style="font-weight: 600;">עיר:</span> ${props.city_name}</div>` : ''}
        ${props.neighborhood_name ? `<div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;"><span style="font-weight: 600;">שכונה:</span> ${props.neighborhood_name}</div>` : ''}
        ${props.status ? `<div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;"><span style="font-weight: 600;">סטטוס:</span> ${props.status}</div>` : ''}
        ${props.approval_stage ? `<div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;"><span style="font-weight: 600;">שלב אישור:</span> ${props.approval_stage}</div>` : ''}
        ${(props.housing_units || props.planned_units) ? `<div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;">${props.housing_units ? `יח"ד קיימות: ${props.housing_units}` : ''}${props.planned_units ? (props.housing_units ? ' • ' : '') + `יח"ד מתוכננות: ${props.planned_units}` : ''}</div>` : ''}
        ${props.executing_body ? `<div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;"><span style="font-weight: 600;">גוף מבצע:</span> ${props.executing_body}</div>` : ''}
        ${props.last_update ? `<div style="font-size: 12px; color: #6b7280; margin-top: 8px;">עדכון אחרון: ${new Date(props.last_update).toLocaleDateString("he-IL")}</div>` : ''}
      </div>
    `;

    // Create and show InfoWindow
    const infoWindow = new google.maps.InfoWindow({
      content: content,
      position: center,
    });

    infoWindow.open(map);
    infoWindowRef.current = infoWindow;

    // Close InfoWindow when clicking close button or outside
    const closeHandler = () => {
      setSelectedUrbanRenewalId(null);
    };

    google.maps.event.addListener(infoWindow, 'closeclick', closeHandler);

    return () => {
      google.maps.event.removeListener(infoWindow, 'closeclick', closeHandler);
      infoWindow.close();
    };
  }, [map, selectedUrbanRenewalFeature]);

  if (!show) return null;

  return (
    <>
      {urbanRenewalLoading && (
        <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-3" dir="rtl">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>טוען התחדשות עירונית...</span>
          </div>
        </div>
      )}

      {urbanRenewalError && (
        <div className="absolute top-4 right-4 z-10 bg-red-50 border border-red-200 rounded-lg shadow-lg p-3" dir="rtl">
          <p className="text-sm text-red-600">{urbanRenewalError}</p>
        </div>
      )}
    </>
  );
}

function PriceProgramLayer({ show, map }: { show: boolean; map: google.maps.Map | null }) {
  const [priceProgramData, setPriceProgramData] = useState<PriceProgramCollection | null>(null);
  const [priceProgramLoading, setPriceProgramLoading] = useState(false);
  const [priceProgramError, setPriceProgramError] = useState<string | null>(null);
  const [selectedPriceProgramId, setSelectedPriceProgramId] = useState<string | null>(null);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Load price program data
  useEffect(() => {
    if (!show) {
      setPriceProgramData(null);
      return;
    }

    let isMounted = true;

    const loadPriceProgramLayer = async () => {
      try {
        setPriceProgramLoading(true);
        setPriceProgramError(null);

        const response = await fetch("/data/price_program_projects.geojson");

        if (!response.ok) {
          throw new Error(`שגיאה בטעינת שכבת מחיר למשתכן (status ${response.status})`);
        }

        const geoJSON = (await response.json()) as PriceProgramCollection;

        if (isMounted) {
          setPriceProgramData(geoJSON);
        }
      } catch (err) {
        if (!isMounted) return;
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Error loading price program layer:', err);
        setPriceProgramError(errorMessage || "שגיאה לא ידועה בטעינת שכבת מחיר למשתכן");
        setPriceProgramData(null);
      } finally {
        if (isMounted) {
          setPriceProgramLoading(false);
        }
      }
    };

    loadPriceProgramLayer();

    return () => {
      isMounted = false;
    };
  }, [show]);

  // Create and manage polygons on the map
  useEffect(() => {
    if (!map || !priceProgramData || !show) {
      polygonsRef.current.forEach(polygon => polygon.setMap(null));
      polygonsRef.current = [];
      return;
    }

    // Clear existing polygons
    polygonsRef.current.forEach(polygon => polygon.setMap(null));
    polygonsRef.current = [];

    // Create polygons for each feature
    priceProgramData.features.forEach((feature, index) => {
      const props = feature.properties || {};
      const featureId = `${props.ProjectNam || 'project'}-${index}`;

      try {
        let paths: google.maps.LatLng[] | google.maps.LatLng[][] = [];

        if (feature.geometry.type === 'Polygon') {
          paths = polygonToGoogleMapsPath(feature.geometry.coordinates);
        } else if (feature.geometry.type === 'MultiPolygon') {
          paths = multiPolygonToPaths(feature.geometry.coordinates);
        }

        const pathsArray = Array.isArray(paths[0]) && paths[0] instanceof google.maps.LatLng
          ? (paths as google.maps.LatLng[][])
          : [paths as google.maps.LatLng[]];

        pathsArray.forEach((path) => {
          const polygon = new google.maps.Polygon({
            paths: path,
            map: map,
            fillColor: "#22c55e",
            fillOpacity: 0.18,
            strokeColor: "#16a34a",
            strokeWeight: 1.2,
            strokeOpacity: 0.8,
          });

          polygon.addListener('click', () => {
            setSelectedPriceProgramId(featureId);
          });

          polygonsRef.current.push(polygon);
        });
      } catch (err) {
        console.error(`Error creating polygon for price program feature ${featureId}:`, err);
      }
    });

    return () => {
      polygonsRef.current.forEach(polygon => polygon.setMap(null));
      polygonsRef.current = [];
    };
  }, [map, priceProgramData, show]);

  // Handle InfoWindow
  const selectedPriceProgramFeature = useMemo(() => {
    if (!selectedPriceProgramId || !priceProgramData) return null;
    const index = parseInt(selectedPriceProgramId.split('-').pop() || '0');
    return priceProgramData.features[index] || null;
  }, [selectedPriceProgramId, priceProgramData]);

  // Show/hide InfoWindow
  useEffect(() => {
    if (!map) return;

    if (infoWindowRef.current) {
      infoWindowRef.current.close();
      infoWindowRef.current = null;
    }

    if (!selectedPriceProgramFeature) return;

    const props = selectedPriceProgramFeature.properties || {};
    
    let center: google.maps.LatLng | null = null;
    
    try {
      let coords: number[][] = [];
      if (selectedPriceProgramFeature.geometry.type === 'Polygon') {
        coords = selectedPriceProgramFeature.geometry.coordinates[0] || [];
      } else if (selectedPriceProgramFeature.geometry.type === 'MultiPolygon') {
        coords = selectedPriceProgramFeature.geometry.coordinates[0]?.[0] || [];
      }

      if (coords.length > 0) {
        let sumLat = 0;
        let sumLng = 0;
        coords.forEach(coord => {
          sumLat += coord[1];
          sumLng += coord[0];
        });
        center = new google.maps.LatLng(sumLat / coords.length, sumLng / coords.length);
      }
    } catch (err) {
      console.error('Error calculating center:', err);
    }

    if (!center) return;

    const content = `
      <div dir="rtl" style="padding: 8px; min-width: 280px; max-width: 380px;">
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 8px; color: #111827;">
          פרויקטים - מחיר למשתכן
        </div>
        ${props.ProjectNam ? `<div style="font-size: 14px; color: #1f2937; margin-bottom: 4px;"><span style="font-weight: 600;">שם הפרויקט:</span> ${props.ProjectNam}</div>` : ''}
        ${props.HousingUni ? `<div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;">יחידות דיור: ${props.HousingUni}</div>` : ''}
        ${typeof props.PriceForMe === 'number' ? `<div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;">מחיר למ"ר: ${props.PriceForMe.toLocaleString("he-IL")}</div>` : ''}
        ${(props.StartSignu || props.EndSignupD) ? `<div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;">רישום: ${props.StartSignu ? new Date(props.StartSignu).toLocaleDateString("he-IL") : "לא ידוע"} - ${props.EndSignupD ? new Date(props.EndSignupD).toLocaleDateString("he-IL") : "לא ידוע"}</div>` : ''}
      </div>
    `;

    const infoWindow = new google.maps.InfoWindow({
      content: content,
      position: center,
    });

    infoWindow.open(map);
    infoWindowRef.current = infoWindow;

    const closeHandler = () => {
      setSelectedPriceProgramId(null);
    };

    google.maps.event.addListener(infoWindow, 'closeclick', closeHandler);

    return () => {
      google.maps.event.removeListener(infoWindow, 'closeclick', closeHandler);
      infoWindow.close();
    };
  }, [map, selectedPriceProgramFeature]);

  if (!show) return null;

  return (
    <>
      {priceProgramLoading && (
        <div className="absolute top-[100px] right-4 z-10 bg-white rounded-lg shadow-lg p-3" dir="rtl">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
            <span>טוען מחיר למשתכן...</span>
          </div>
        </div>
      )}

      {priceProgramError && (
        <div className="absolute top-[100px] right-4 z-10 bg-red-50 border border-red-200 rounded-lg shadow-lg p-3" dir="rtl">
          <p className="text-sm text-red-600">{priceProgramError}</p>
        </div>
      )}
    </>
  );
}

export function GoogleMapsLayers({ showUrbanRenewal = true, showPriceProgram = true }: GoogleMapsLayersProps) {
  const map = useMap();

  return (
    <>
      <UrbanRenewalLayer show={showUrbanRenewal} map={map} />
      <PriceProgramLayer show={showPriceProgram} map={map} />
    </>
  );
}
