import { MapContainer, TileLayer, GeoJSON as LeafletGeoJSON, useMap, useMapEvents } from "react-leaflet";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import L, { type Layer, type PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson";
import { urbanRenewalCompoundQueries, talarPrepQueries } from "@/lib/supabase-queries";
import { ParcelsLayer } from "./ParcelsLayer";
import { Tama70Layer } from "./Tama70Layer";
import { GushimLayer } from "./GushimLayer";
import { LandUseMavatLayer } from "./LandUseMavatLayer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Layers } from "lucide-react";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

type DeclaredGeometry = Polygon | MultiPolygon;

interface DeclaredProperties extends GeoJsonProperties {
  codeStat_1?: number;
  codeStatus?: number;
  heara?: string;
  Kishur?: string;
  MisparProj?: number;
  plan_name?: string;
  Shape_STAr?: number;
  Shape_STLe?: number;
  ShemMitcha?: string;
  Source?: string;
  taarichTok?: string;
  TeurMakotT?: string;
  TeurMaslul?: string;
  TeurSugMas?: string;
  yachadKaya?: string;
  yachadMutz?: string;
  YachadTosa?: number;
  Yeshuv?: string;
}

interface ResidentialInventoryProperties extends GeoJsonProperties {
  prjMatala?: number;
}

interface PriceProgramProperties extends GeoJsonProperties {
  ProjectNam?: string;
  ActiveProj?: number;
  HousingUni?: number;
  PriceForMe?: number;
  StartSignu?: string;
  EndSignupD?: string;
  Marketin_1?: string;
  Marketin_2?: string;
}

interface UrbanRenewalProperties extends GeoJsonProperties {
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

interface TalarPrepProperties extends GeoJsonProperties {
  id?: number;
  object_id?: number;
  [key: string]: any; // For dynamic fields from fields and raw_entity
}

interface GushimProperties extends GeoJsonProperties {
  id?: number;
  object_id?: number;
  gush_num?: number;
  gush_suffix?: string;
  status_text?: string;
  [key: string]: any; // For dynamic fields from raw_entity
}

type DeclaredFeature = Feature<DeclaredGeometry, DeclaredProperties>;
type DeclaredCollection = FeatureCollection<DeclaredGeometry, DeclaredProperties>;
type ResidentialInventoryFeature = Feature<DeclaredGeometry, ResidentialInventoryProperties>;
type ResidentialInventoryCollection = FeatureCollection<DeclaredGeometry, ResidentialInventoryProperties>;
type PriceProgramFeature = Feature<DeclaredGeometry, PriceProgramProperties>;
type PriceProgramCollection = FeatureCollection<DeclaredGeometry, PriceProgramProperties>;
type UrbanRenewalFeature = Feature<DeclaredGeometry, UrbanRenewalProperties>;
type UrbanRenewalCollection = FeatureCollection<DeclaredGeometry, UrbanRenewalProperties>;
type TalarPrepFeature = Feature<DeclaredGeometry, TalarPrepProperties>;
type TalarPrepCollection = FeatureCollection<DeclaredGeometry, TalarPrepProperties>;
type GushimFeature = Feature<DeclaredGeometry, GushimProperties>;
type GushimCollection = FeatureCollection<DeclaredGeometry, GushimProperties>;
type AnyFeature = Feature<DeclaredGeometry, GeoJsonProperties>;

const declaredLayerStyle: PathOptions = {
  color: "#ea580c",
  weight: 1.5,
  fillOpacity: 0.2,
  fillColor: "#f97316",
};

const residentialInventoryLayerStyle: PathOptions = {
  color: "#2563eb",
  weight: 1.2,
  fillOpacity: 0.15,
  fillColor: "#1d4ed8",
};

const priceProgramLayerStyle: PathOptions = {
  color: "#16a34a",
  weight: 1.2,
  fillOpacity: 0.18,
  fillColor: "#22c55e",
};

const urbanRenewalLayerStyle: PathOptions = {
  color: "#9333ea",
  weight: 2,
  fillOpacity: 0.3,
  fillColor: "#a855f7",
  opacity: 0.8,
};

const talarPrepLayerStyle: PathOptions = {
  color: "#dc2626",
  weight: 2,
  fillOpacity: 0.25,
  fillColor: "#ef4444",
  opacity: 0.8,
};

// Gushim layer style is now in GushimLayer component
const gushimLayerStyle_OLD: PathOptions = {
  color: "#0891b2",
  weight: 1.5,
  fillOpacity: 0.2,
  fillColor: "#06b6d4",
  opacity: 0.7,
};

const getLatLngTuplesFromFeature = (feature: AnyFeature): [number, number][] => {
  if (!feature.geometry) return [];

  const toLatLng = (coords: number[][]) =>
    coords
      .filter((point): point is [number, number] => Array.isArray(point) && point.length >= 2)
      .map(([lng, lat]) => [lat, lng] as [number, number]);

  if (feature.geometry.type === "Polygon") {
    return feature.geometry.coordinates.flatMap((ring) => toLatLng(ring as unknown as number[][]));
  }

  if (feature.geometry.type === "MultiPolygon") {
    return feature.geometry.coordinates.flatMap((polygon) =>
      polygon.flatMap((ring) => toLatLng(ring as unknown as number[][]))
    );
  }

  return [];
};

// Component to get map reference
function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      mapRef.current = map;
    }
  }, [map, mapRef]);
  
  return null;
}

function FitBoundsToFeatures({ features }: { features: AnyFeature[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || features.length === 0) return;

    const bounds = L.latLngBounds([]);
    let hasValidCoords = false;

    features.forEach((feature) => {
      const coords = getLatLngTuplesFromFeature(feature);
      if (coords.length > 0) {
        coords.forEach((coord) => {
          // Validate coordinates are within reasonable bounds (Israel is roughly 29-34 lat, 34-36 lng)
          if (coord[0] >= 29 && coord[0] <= 34 && coord[1] >= 34 && coord[1] <= 36) {
            bounds.extend(coord);
            hasValidCoords = true;
          }
        });
      }
    });

    // Only fit bounds if we have valid coordinates and bounds are valid
    if (hasValidCoords && bounds.isValid() && bounds.getNorth() > bounds.getSouth()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
    }
  }, [map, features]);

  return null;
}

export default function DeclaredProjectsMap() {
  const [showDeclaredLayer, setShowDeclaredLayer] = useState(true);
  const [declaredData, setDeclaredData] = useState<DeclaredCollection | null>(null);
  const [declaredLoading, setDeclaredLoading] = useState(true);
  const [declaredError, setDeclaredError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const [showResidentialInventoryLayer, setShowResidentialInventoryLayer] = useState(true);
  const [residentialInventoryData, setResidentialInventoryData] = useState<ResidentialInventoryCollection | null>(null);
  const [residentialInventoryLoading, setResidentialInventoryLoading] = useState(true);
  const [residentialInventoryError, setResidentialInventoryError] = useState<string | null>(null);

  const [showPriceProgramLayer, setShowPriceProgramLayer] = useState(true);
  const [priceProgramData, setPriceProgramData] = useState<PriceProgramCollection | null>(null);
  const [priceProgramLoading, setPriceProgramLoading] = useState(true);
  const [priceProgramError, setPriceProgramError] = useState<string | null>(null);

  const [showUrbanRenewalLayer, setShowUrbanRenewalLayer] = useState(true);
  const [urbanRenewalData, setUrbanRenewalData] = useState<UrbanRenewalCollection | null>(null);
  const [urbanRenewalLoading, setUrbanRenewalLoading] = useState(true);
  const [urbanRenewalError, setUrbanRenewalError] = useState<string | null>(null);
  const [selectedUrbanRenewalId, setSelectedUrbanRenewalId] = useState<number | null>(null);

  const [showTalarPrepLayer, setShowTalarPrepLayer] = useState(true);
  const [talarPrepData, setTalarPrepData] = useState<TalarPrepCollection | null>(null);
  const [talarPrepLoading, setTalarPrepLoading] = useState(true);
  const [talarPrepError, setTalarPrepError] = useState<string | null>(null);
  const [selectedTalarPrepId, setSelectedTalarPrepId] = useState<number | null>(null);

  const [showGushimLayer, setShowGushimLayer] = useState(true);

  const [showParcelsLayer, setShowParcelsLayer] = useState(true);

  const [showTama70Layer, setShowTama70Layer] = useState(true);

  const [showLandUseMavatLayer, setShowLandUseMavatLayer] = useState(false);

  // Layers panel state
  const [showLayersPanel, setShowLayersPanel] = useState(false);

  // Search by gush and helka state
  const [searchGush, setSearchGush] = useState<string>("");
  const [searchHelka, setSearchHelka] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchResultFeature, setSearchResultFeature] = useState<Feature | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const center: [number, number] = [32.0749, 34.7668]; // Tel Aviv center

  const declaredFeatures = useMemo(() => declaredData?.features ?? [], [declaredData]);
  const residentialInventoryFeatures = useMemo(
    () => residentialInventoryData?.features ?? [],
    [residentialInventoryData]
  );
  const priceProgramFeatures = useMemo(() => priceProgramData?.features ?? [], [priceProgramData]);
  const urbanRenewalFeatures = useMemo(() => urbanRenewalData?.features ?? [], [urbanRenewalData]);
  const talarPrepFeatures = useMemo(() => {
    const features = talarPrepData?.features ?? [];
    if (features.length > 0 && features[0]?.geometry) {
      const geom = features[0].geometry;
      let coords: any = null;
      if (geom.type === 'Point') {
        coords = geom.coordinates;
      } else if (geom.type === 'Polygon') {
        coords = geom.coordinates[0]?.[0];
      } else if (geom.type === 'MultiPolygon') {
        coords = geom.coordinates[0]?.[0]?.[0];
      }
      
      if (coords && Array.isArray(coords) && coords.length >= 2) {
        const [lng, lat] = coords;
        const inIsrael = lat >= 29 && lat <= 34 && lng >= 34 && lng <= 36;
        console.log('Talar prep features memo:', {
          hasData: !!talarPrepData,
          featuresCount: features.length,
          firstFeatureGeometryType: geom.type,
          firstFeatureCoords: coords,
          inIsrael: inIsrael,
          lat: lat,
          lng: lng
        });
      }
    }
    return features;
  }, [talarPrepData]);
  const visibleFeatures = useMemo(() => {
    const features: AnyFeature[] = [];
    if (showDeclaredLayer) {
      features.push(...(declaredFeatures as AnyFeature[]));
    }
    if (showResidentialInventoryLayer) {
      features.push(...(residentialInventoryFeatures as AnyFeature[]));
    }
    if (showPriceProgramLayer) {
      features.push(...(priceProgramFeatures as AnyFeature[]));
    }
    if (showUrbanRenewalLayer) {
      features.push(...(urbanRenewalFeatures as AnyFeature[]));
    }
    if (showTalarPrepLayer) {
      features.push(...(talarPrepFeatures as AnyFeature[]));
    }
    // Gushim layer is now handled by GushimLayer component
    return features;
  }, [declaredFeatures, residentialInventoryFeatures, priceProgramFeatures, urbanRenewalFeatures, talarPrepFeatures, showDeclaredLayer, showResidentialInventoryLayer, showPriceProgramLayer, showUrbanRenewalLayer, showTalarPrepLayer]);

  const selectedDeclaredFeature = useMemo(() => {
    if (!selectedProjectId) return null;
    return declaredFeatures.find((feature) => feature.properties?.MisparProj === selectedProjectId) ?? null;
  }, [selectedProjectId, declaredFeatures]);

  const selectedUrbanRenewalFeature = useMemo(() => {
    if (!selectedUrbanRenewalId) return null;
    return urbanRenewalFeatures.find((feature) => feature.properties?.object_id === selectedUrbanRenewalId) ?? null;
  }, [selectedUrbanRenewalId, urbanRenewalFeatures]);

  const selectedTalarPrepFeature = useMemo(() => {
    if (!selectedTalarPrepId) return null;
    return talarPrepFeatures.find((feature) => feature.properties?.id === selectedTalarPrepId) ?? null;
  }, [selectedTalarPrepId, talarPrepFeatures]);

  // Gushim selection is now handled by GushimLayer component

  // Search for parcel by gush and helka using GovMap API
  const handleGushHelkaSearch = async () => {
    if (!searchGush || !searchHelka) {
      setSearchError("נא להזין גוש וחלקה");
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSearchResult(null);
    setSearchResultFeature(null);

    try {
      const gushNum = parseInt(searchGush, 10);
      const helkaNum = parseInt(searchHelka, 10);

      if (isNaN(gushNum) || isNaN(helkaNum)) {
        throw new Error('גוש וחלקה חייבים להיות מספרים');
      }

      // Use GovMap API entitiesByPoint to search for parcel
      // According to the user's finding, we need to POST to:
      // https://www.govmap.gov.il/api/layers-catalog/entitiesByPoint
      // But first, we need to find the parcel coordinates by gush/helka
      // Let's try using the backend API first, then fallback to direct GovMap API
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      let result: any = null;
      
      let backendResponse: Response | null = null;
      
      try {
        // Try backend API first
        backendResponse = await fetch(
          `${API_URL}/api/govmap/search?gush=${gushNum}&helka=${helkaNum}`
        );

        // Parse JSON once (response body can only be read once)
        let backendData: any;
        try {
          backendData = await backendResponse.json();
        } catch (parseErr) {
          // If we can't parse JSON, use status code
          throw new Error(`שגיאה בחיפוש חלקה (${backendResponse.status})`);
        }
        
        if (backendResponse.ok) {
          if (backendData.success && backendData.data) {
            result = backendData.data;
          } else if (!backendData.success) {
            // Backend returned success: false
            throw new Error(backendData.message || backendData.error || 'שגיאה בחיפוש חלקה');
          }
        } else {
          // Backend returned error status - use the error message from response
          const errorMsg = backendData.message || backendData.error || 'שגיאה בחיפוש חלקה';
          console.error('Backend search error:', backendData);
          throw new Error(errorMsg);
        }
      } catch (backendErr) {
        console.error('Backend API error:', backendErr);
        throw backendErr;
      }

      // If backend didn't return data, show error
      if (!result) {
        throw new Error('לא נמצאו תוצאות לחלקה זו');
      }
      
      // Convert coordinates to WGS84 if needed
      let lat: number, lng: number;
      
      if (result.LAT && result.LNG) {
        lat = result.LAT;
        lng = result.LNG;
      } else if (result.X && result.Y) {
        // Assume ITM coordinates - convert to WGS84
        // For now, we'll use a simple conversion
        // TODO: Use proper ITM to WGS84 conversion
        lat = result.Y / 111000; // Approximate
        lng = result.X / 111000; // Approximate
      } else if (result.centroid && Array.isArray(result.centroid) && result.centroid.length >= 2) {
        // Handle centroid from entitiesByPoint response
        const [x, y] = result.centroid;
        // These are likely ITM coordinates, need proper conversion
        // For now, approximate
        lat = y / 111000;
        lng = x / 111000;
      } else {
        throw new Error('לא נמצאו קואורדינטות לחלקה');
      }

      // Create a feature for the search result
      const feature: Feature = {
        type: 'Feature',
        properties: {
          gush_num: gushNum,
          helka: helkaNum,
          ...result
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      };

      setSearchResult({ gush_num: gushNum, helka: helkaNum, ...result });
      setSearchResultFeature(feature);

      // Zoom to the parcel location
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 15);
      }

    } catch (err) {
      console.error('Error searching parcel:', err);
      setSearchError(err instanceof Error ? err.message : 'שגיאה בחיפוש חלקה');
    } finally {
      setSearching(false);
    }
  };

  const handleDeclaredFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const typedFeature = feature as DeclaredFeature;
      const props = typedFeature.properties || {};
      const projectId = props.MisparProj ?? null;

      const popupParts: string[] = [
        '<div dir="rtl" style="text-align:right;">',
        '<div style="font-weight:700;font-size:14px;margin-bottom:4px;">פרויקט התחדשות עירונית מוכרז</div>',
      ];

      if (props.ShemMitcha) {
        popupParts.push(`<div style="font-size:13px;color:#374151;">מתחם: ${props.ShemMitcha}</div>`);
      }
      if (props.Yeshuv) {
        popupParts.push(`<div style="font-size:13px;color:#374151;">יישוב: ${props.Yeshuv}</div>`);
      }
      if (props.TeurMaslul) {
        popupParts.push(`<div style="font-size:12px;color:#6b7280;margin-top:4px;">מסלול: ${props.TeurMaslul}</div>`);
      }

      popupParts.push("</div>");

      layer.bindPopup(popupParts.join(""));

      layer.on("click", () => {
        setSelectedProjectId(projectId);
      });

      layer.on("popupclose", () => {
        setSelectedProjectId((current) => (current === projectId ? null : current));
      });

      layer.on("mouseover", () => {
        (layer as L.Path).setStyle({ weight: 3, fillOpacity: 0.3 });
      });

      layer.on("mouseout", () => {
        (layer as L.Path).setStyle(declaredLayerStyle);
      });
    },
    []
  );

  const handleResidentialInventoryFeature = useCallback((feature: Feature, layer: Layer) => {
    const typedFeature = feature as ResidentialInventoryFeature;
    const props = typedFeature.properties || {};

    const popupParts: string[] = [
      '<div dir="rtl" style="text-align:right;">',
      '<div style="font-weight:700;font-size:14px;margin-bottom:4px;">מלאי תכנוני למגורים</div>',
    ];

    if (props.prjMatala) {
      popupParts.push(`<div style="font-size:13px;color:#374151;">מספר תוכנית: ${props.prjMatala}</div>`);
    }

    popupParts.push("</div>");

    layer.bindPopup(popupParts.join(""));

    layer.on("mouseover", () => {
      (layer as L.Path).setStyle({ weight: 2, fillOpacity: 0.25 });
    });

    layer.on("mouseout", () => {
      (layer as L.Path).setStyle(residentialInventoryLayerStyle);
    });
  }, []);

  const handlePriceProgramFeature = useCallback((feature: Feature, layer: Layer) => {
    const typedFeature = feature as PriceProgramFeature;
    const props = typedFeature.properties || {};

    const popupParts: string[] = [
      '<div dir="rtl" style="text-align:right;">',
      '<div style="font-weight:700;font-size:14px;margin-bottom:4px;">פרויקטים - מחיר למשתכן</div>',
    ];

    if (props.ProjectNam) {
      popupParts.push(`<div style=\"font-size:13px;color:#1f2937;\">שם הפרויקט: ${props.ProjectNam}</div>`);
    }
    if (props.HousingUni) {
      popupParts.push(`<div style=\"font-size:12px;color:#4b5563;\">יחידות דיור: ${props.HousingUni}</div>`);
    }
    if (typeof props.PriceForMe === "number") {
      popupParts.push(`<div style=\"font-size:12px;color:#4b5563;\">מחיר למ"ר: ${props.PriceForMe.toLocaleString("he-IL")}</div>`);
    }
    if (props.StartSignu || props.EndSignupD) {
      const start = props.StartSignu ? new Date(props.StartSignu).toLocaleDateString("he-IL") : "לא ידוע";
      const end = props.EndSignupD ? new Date(props.EndSignupD).toLocaleDateString("he-IL") : "לא ידוע";
      popupParts.push(`<div style=\"font-size:12px;color:#4b5563;\">רישום: ${start} - ${end}</div>`);
    }

    popupParts.push("</div>");

    layer.bindPopup(popupParts.join(""));

    layer.on("mouseover", () => {
      (layer as L.Path).setStyle({ weight: 2, fillOpacity: 0.25 });
    });

    layer.on("mouseout", () => {
      (layer as L.Path).setStyle(priceProgramLayerStyle);
    });
  }, []);

  const handleUrbanRenewalFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const typedFeature = feature as UrbanRenewalFeature;
      const props = typedFeature.properties || {};
      const compoundId = props.object_id ?? null;

      // Debug: Log feature geometry for first few features
      if (compoundId && compoundId <= 3) {
        const geom = typedFeature.geometry;
        let firstCoord: any = null;
        
        if (geom?.type === 'Polygon' && geom.coordinates?.[0]?.[0]) {
          firstCoord = geom.coordinates[0][0];
        } else if (geom?.type === 'MultiPolygon' && geom.coordinates?.[0]?.[0]?.[0]) {
          firstCoord = geom.coordinates[0][0][0];
        }
        
        console.log(`Urban renewal feature ${compoundId} geometry:`, {
          type: geom?.type,
          hasCoordinates: !!geom?.coordinates,
          firstCoord: firstCoord,
          coordLength: Array.isArray(geom?.coordinates) ? geom.coordinates.length : 0,
          layerType: layer.constructor.name,
          bounds: (layer as any).getBounds ? (layer as any).getBounds() : 'no bounds'
        });
        
        // Check if coordinates are in Israel bounds
        if (firstCoord && Array.isArray(firstCoord) && firstCoord.length >= 2) {
          const [lng, lat] = firstCoord;
          const inIsrael = lat >= 29 && lat <= 34 && lng >= 34 && lng <= 36;
          console.log(`  Coordinates [${lng}, ${lat}] - In Israel: ${inIsrael}`);
        }
      }

      const popupParts: string[] = [
        '<div dir="rtl" style="text-align:right;">',
        '<div style="font-weight:700;font-size:14px;margin-bottom:4px;">התחדשות עירונית</div>',
      ];

      if (props.project_name) {
        popupParts.push(`<div style="font-size:13px;color:#374151;">שם פרויקט: ${props.project_name}</div>`);
      }
      if (props.city_name) {
        popupParts.push(`<div style="font-size:13px;color:#374151;">עיר: ${props.city_name}</div>`);
      }
      if (props.neighborhood_name) {
        popupParts.push(`<div style="font-size:12px;color:#6b7280;margin-top:4px;">שכונה: ${props.neighborhood_name}</div>`);
      }
      if (props.status) {
        popupParts.push(`<div style="font-size:12px;color:#6b7280;">סטטוס: ${props.status}</div>`);
      }
      if (props.approval_stage) {
        popupParts.push(`<div style="font-size:12px;color:#6b7280;">שלב אישור: ${props.approval_stage}</div>`);
      }
      if (props.housing_units || props.planned_units) {
        const units = props.housing_units || props.planned_units;
        popupParts.push(`<div style="font-size:12px;color:#6b7280;">יחידות דיור: ${units}</div>`);
      }

      popupParts.push("</div>");

      layer.bindPopup(popupParts.join(""));

      layer.on("click", () => {
        setSelectedUrbanRenewalId(compoundId);
      });

      layer.on("popupclose", () => {
        setSelectedUrbanRenewalId((current) => (current === compoundId ? null : current));
      });

      layer.on("mouseover", () => {
        (layer as L.Path).setStyle({ weight: 3, fillOpacity: 0.3 });
      });

      layer.on("mouseout", () => {
        (layer as L.Path).setStyle(urbanRenewalLayerStyle);
      });

      // Ensure layer is added to map
      if (layer && (layer as any).addTo) {
        console.log(`Urban renewal layer ${compoundId} added to map`);
      }
    },
    []
  );

  const handleTalarPrepFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const typedFeature = feature as TalarPrepFeature;
      const props = typedFeature.properties || {};
      const planId = props.id ?? null;

      // Debug: Log all features to see what we're getting
      const geom = typedFeature.geometry;
      let firstCoord: any = null;
      
      if (geom?.type === 'Point' && geom.coordinates) {
        firstCoord = geom.coordinates;
      } else if (geom?.type === 'Polygon' && geom.coordinates?.[0]?.[0]) {
        firstCoord = geom.coordinates[0][0];
      } else if (geom?.type === 'MultiPolygon' && geom.coordinates?.[0]?.[0]?.[0]) {
        firstCoord = geom.coordinates[0][0][0];
      }
      
      console.log(`Talar prep feature ${planId || 'unknown'} added to map:`, {
        type: geom?.type,
        hasCoordinates: !!geom?.coordinates,
        firstCoord: firstCoord,
        layerType: layer.constructor.name,
        properties: props
      });
      
      if (firstCoord && Array.isArray(firstCoord) && firstCoord.length >= 2) {
        const [lng, lat] = firstCoord;
        const inIsrael = lat >= 29 && lat <= 34 && lng >= 34 && lng <= 36;
        console.log(`  Coordinates [${lng}, ${lat}] - In Israel: ${inIsrael}`);
        if (!inIsrael) {
          console.warn(`  WARNING: Coordinates outside Israel bounds!`);
        }
      }

      const popupParts: string[] = [
        '<div dir="rtl" style="text-align:right;">',
        '<div style="font-weight:700;font-size:14px;margin-bottom:4px;">תוכנית בהכנה</div>',
      ];

      if (props.object_id) {
        popupParts.push(`<div style="font-size:13px;color:#374151;">מספר אובייקט: ${props.object_id}</div>`);
      }
      
      // Add any relevant fields from the properties
      const relevantFields = ['name', 'title', 'plan_name', 'city', 'city_name', 'status', 'stage'];
      relevantFields.forEach(field => {
        if (props[field]) {
          popupParts.push(`<div style="font-size:12px;color:#6b7280;">${field}: ${props[field]}</div>`);
        }
      });

      popupParts.push("</div>");

      layer.bindPopup(popupParts.join(""));

      layer.on("click", () => {
        setSelectedTalarPrepId(planId);
      });

      layer.on("popupclose", () => {
        setSelectedTalarPrepId((current) => (current === planId ? null : current));
      });

      layer.on("mouseover", () => {
        (layer as L.Path).setStyle({ weight: 3, fillOpacity: 0.35 });
      });

      layer.on("mouseout", () => {
        (layer as L.Path).setStyle(talarPrepLayerStyle);
      });
    },
    []
  );

  // Gushim feature handler is now in GushimLayer component
  const handleGushimFeature_OLD = useCallback(
    (feature: Feature, layer: Layer) => {
      const typedFeature = feature as GushimFeature;
      const props = typedFeature.properties || {};
      const gushId = props.id ?? null;

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
      if (props.object_id) {
        popupParts.push(`<div style="font-size:12px;color:#6b7280;">מספר אובייקט: ${props.object_id}</div>`);
      }

      popupParts.push("</div>");

      layer.bindPopup(popupParts.join(""));

      layer.on("click", () => {
        setSelectedGushId(gushId);
      });

      layer.on("popupclose", () => {
        setSelectedGushId((current) => (current === gushId ? null : current));
      });

      layer.on("mouseover", () => {
        (layer as L.Path).setStyle({ weight: 2.5, fillOpacity: 0.3 });
      });

      layer.on("mouseout", () => {
        (layer as L.Path).setStyle(gushimLayerStyle);
      });
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadDeclaredLayer = async () => {
      try {
        setDeclaredLoading(true);
        setDeclaredError(null);
        const response = await fetch("/data/declared_projects.geojson", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`שגיאה בטעינת שכבת הפרויקטים המוכרזים (status ${response.status})`);
        }

        const json = (await response.json()) as DeclaredCollection;

        if (isMounted) {
          setDeclaredData(json);
        }
      } catch (err) {
        if (!isMounted) return;
        if ((err as Error).name === "AbortError") {
          return;
        }
        setDeclaredError((err as Error).message || "שגיאה לא ידועה בטעינת שכבת הפרויקטים המוכרזים");
        setDeclaredData(null);
      } finally {
        if (isMounted) {
          setDeclaredLoading(false);
        }
      }
    };

    loadDeclaredLayer();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadResidentialInventoryLayer = async () => {
      try {
        setResidentialInventoryLoading(true);
        setResidentialInventoryError(null);

        const response = await fetch("/data/residential_inventory.geojson", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`שגיאה בטעינת שכבת המלאי התכנוני (status ${response.status})`);
        }

        const json = (await response.json()) as ResidentialInventoryCollection;

        if (isMounted) {
          setResidentialInventoryData(json);
        }
      } catch (err) {
        if (!isMounted) return;
        if ((err as Error).name === "AbortError") {
          return;
        }
        setResidentialInventoryError((err as Error).message || "שגיאה לא ידועה בטעינת שכבת המלאי התכנוני");
        setResidentialInventoryData(null);
      } finally {
        if (isMounted) {
          setResidentialInventoryLoading(false);
        }
      }
    };

    loadResidentialInventoryLayer();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadPriceProgramLayer = async () => {
      try {
        setPriceProgramLoading(true);
        setPriceProgramError(null);

        const response = await fetch("/data/price_program_projects.geojson", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`שגיאה בטעינת שכבת מחיר למשתכן (status ${response.status})`);
        }

        const json = (await response.json()) as PriceProgramCollection;

        if (isMounted) {
          setPriceProgramData(json);
        }
      } catch (err) {
        if (!isMounted) return;
        if ((err as Error).name === "AbortError") {
          return;
        }
        setPriceProgramError((err as Error).message || "שגיאה לא ידועה בטעינת שכבת מחיר למשתכן");
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
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadUrbanRenewalLayer = async () => {
      try {
        setUrbanRenewalLoading(true);
        setUrbanRenewalError(null);

        const geoJSON = await urbanRenewalCompoundQueries.getAsGeoJSON();

        console.log('Urban renewal GeoJSON loaded:', {
          type: geoJSON?.type,
          featuresCount: geoJSON?.features?.length || 0,
          firstFeature: geoJSON?.features?.[0],
          firstFeatureGeometry: geoJSON?.features?.[0]?.geometry,
          firstFeatureCoords: geoJSON?.features?.[0]?.geometry?.coordinates?.[0]?.[0]
        });

        if (isMounted) {
          if (geoJSON && geoJSON.features && geoJSON.features.length > 0) {
            setUrbanRenewalData(geoJSON as UrbanRenewalCollection);
            console.log('Urban renewal data set successfully');
          } else {
            // No data but no error - just empty collection
            console.warn('Urban renewal GeoJSON has no features');
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
  }, []);

  useEffect(() => {
    if (!showDeclaredLayer) {
      setSelectedProjectId(null);
    }
  }, [showDeclaredLayer]);

  useEffect(() => {
    if (!showUrbanRenewalLayer) {
      setSelectedUrbanRenewalId(null);
    }
  }, [showUrbanRenewalLayer]);

  useEffect(() => {
    let isMounted = true;

    const loadTalarPrepLayer = async () => {
      try {
        setTalarPrepLoading(true);
        setTalarPrepError(null);

        const geoJSON = await talarPrepQueries.getAsGeoJSON();

        console.log('Talar prep GeoJSON loaded:', {
          type: geoJSON?.type,
          featuresCount: geoJSON?.features?.length || 0,
          firstFeature: geoJSON?.features?.[0]
        });

        if (isMounted) {
          if (geoJSON && geoJSON.features && geoJSON.features.length > 0) {
            setTalarPrepData(geoJSON as TalarPrepCollection);
            console.log('Talar prep data set successfully');
          } else {
            console.warn('Talar prep GeoJSON has no features');
            setTalarPrepData({
              type: 'FeatureCollection',
              features: []
            } as TalarPrepCollection);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Error loading talar prep layer:', err);
        setTalarPrepError(errorMessage || "שגיאה לא ידועה בטעינת שכבת תוכניות בהכנה");
        setTalarPrepData(null);
      } finally {
        if (isMounted) {
          setTalarPrepLoading(false);
        }
      }
    };

    loadTalarPrepLayer();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!showTalarPrepLayer) {
      setSelectedTalarPrepId(null);
    }
  }, [showTalarPrepLayer]);

  // Gushim layer is now handled by GushimLayer component (uses backend API with progressive loading)

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-large border border-border/20 relative">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        className="h-full w-full"
        scrollWheelZoom
      >
        <MapRefSetter mapRef={mapRef} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {visibleFeatures.length > 0 && visibleFeatures.some(f => getLatLngTuplesFromFeature(f).length > 0) && (
          <FitBoundsToFeatures features={visibleFeatures} />
        )}

        {showPriceProgramLayer && priceProgramFeatures.length > 0 && (
          <LeafletGeoJSON
            data={priceProgramData as PriceProgramCollection}
            style={() => priceProgramLayerStyle}
            onEachFeature={handlePriceProgramFeature}
          />
        )}

        {showResidentialInventoryLayer && residentialInventoryFeatures.length > 0 && (
          <LeafletGeoJSON
            data={residentialInventoryData as ResidentialInventoryCollection}
            style={() => residentialInventoryLayerStyle}
            onEachFeature={handleResidentialInventoryFeature}
          />
        )}

        {showDeclaredLayer && declaredFeatures.length > 0 && (
          <LeafletGeoJSON
            data={declaredData as DeclaredCollection}
            style={() => declaredLayerStyle}
            onEachFeature={handleDeclaredFeature}
          />
        )}

        {showUrbanRenewalLayer && urbanRenewalData && urbanRenewalFeatures.length > 0 && (
          <LeafletGeoJSON
            key={`urban-renewal-${urbanRenewalFeatures.length}`}
            data={urbanRenewalData as UrbanRenewalCollection}
            style={(feature) => {
              // Use a more visible style
              return {
                color: "#9333ea",
                weight: 2,
                fillOpacity: 0.3,
                fillColor: "#a855f7",
                opacity: 0.8,
              };
            }}
            onEachFeature={handleUrbanRenewalFeature}
          />
        )}

        {showTalarPrepLayer && talarPrepData && talarPrepFeatures.length > 0 && (
          <>
            {console.log('Rendering talar prep layer:', {
              showLayer: showTalarPrepLayer,
              hasData: !!talarPrepData,
              featuresCount: talarPrepFeatures.length,
              firstFeature: talarPrepFeatures[0]
            })}
            <LeafletGeoJSON
              key={`talar-prep-${talarPrepFeatures.length}`}
              data={talarPrepData as TalarPrepCollection}
              style={() => talarPrepLayerStyle}
              pointToLayer={(feature, latlng) => {
                // Create a red circle marker for Point features
                return L.circleMarker(latlng, {
                  radius: 6,
                  fillColor: "#ef4444",
                  color: "#dc2626",
                  weight: 2,
                  opacity: 0.8,
                  fillOpacity: 0.7
                });
              }}
              onEachFeature={handleTalarPrepFeature}
            />
          </>
        )}

        {/* Gushim layer - now using GushimLayer component with backend API */}
        <GushimLayer show={showGushimLayer} />

        <ParcelsLayer show={showParcelsLayer} />
        <Tama70Layer show={showTama70Layer} />
        <LandUseMavatLayer show={showLandUseMavatLayer} />

        {/* Search result marker */}
        {searchResultFeature && (
          <LeafletGeoJSON
            key="search-result"
            data={searchResultFeature}
            pointToLayer={(feature, latlng) => {
              return L.circleMarker(latlng, {
                radius: 10,
                fillColor: "#ef4444",
                color: "#dc2626",
                weight: 3,
                opacity: 1,
                fillOpacity: 0.8
              });
            }}
            onEachFeature={(feature, layer) => {
              const props = feature.properties || {};
              
              // Extract information from properties
              const gushNum = props.gush_num || props.GUSH || 'לא ידוע';
              const gushSuffix = props.gush_suffix || props.gush_suffi || null;
              const helka = props.helka || props.HELKA || props.parcel || 'לא ידוע';
              const legalArea = props.legal_area_m2 || props.legalArea || null;
              
              // Try to get from raw_entity fields if available
              let gushFromFields = null;
              let gushSuffixFromFields = null;
              let helkaFromFields = null;
              let legalAreaFromFields = null;
              
              if (props.raw_entity?.fields && Array.isArray(props.raw_entity.fields)) {
                const fields = props.raw_entity.fields;
                const gushField = fields.find((f: any) => f.fieldName === 'גוש' || f.fieldName === 'מספר גוש');
                const gushSuffixField = fields.find((f: any) => f.fieldName === 'תת גוש');
                const helkaField = fields.find((f: any) => f.fieldName === 'חלקה' || f.fieldName === 'מספר חלקה');
                const legalAreaField = fields.find((f: any) => f.fieldName === 'שטח רשום (מ"ר)' || f.fieldName === 'שטח רשום');
                
                if (gushField) gushFromFields = gushField.fieldValue;
                if (gushSuffixField) gushSuffixFromFields = gushSuffixField.fieldValue;
                if (helkaField) helkaFromFields = helkaField.fieldValue;
                if (legalAreaField) legalAreaFromFields = legalAreaField.fieldValue;
              }
              
              // Use field values if available, otherwise use direct properties
              const finalGush = gushFromFields || gushNum;
              const finalGushSuffix = gushSuffixFromFields !== null ? gushSuffixFromFields : (gushSuffix !== null ? gushSuffix : null);
              const finalHelka = helkaFromFields || helka;
              const finalLegalArea = legalAreaFromFields !== null ? legalAreaFromFields : legalArea;
              
              const popupParts: string[] = [
                '<div dir="rtl" style="text-align:right;">',
                '<div style="font-weight:700;font-size:14px;margin-bottom:6px;">חלקה שנמצאה</div>',
                `<div style="font-size:13px;color:#374151;margin-bottom:3px;"><strong>מספר גוש:</strong> ${finalGush}</div>`
              ];
              
              if (finalGushSuffix !== null && finalGushSuffix !== undefined && finalGushSuffix !== 0) {
                popupParts.push(`<div style="font-size:13px;color:#374151;margin-bottom:3px;"><strong>תת גוש:</strong> ${finalGushSuffix}</div>`);
              }
              
              popupParts.push(`<div style="font-size:13px;color:#374151;margin-bottom:3px;"><strong>מספר חלקה:</strong> ${finalHelka}</div>`);
              
              if (finalLegalArea !== null && finalLegalArea !== undefined) {
                const areaFormatted = typeof finalLegalArea === 'number' 
                  ? finalLegalArea.toLocaleString('he-IL') 
                  : finalLegalArea;
                popupParts.push(`<div style="font-size:13px;color:#374151;margin-bottom:3px;"><strong>שטח רשום:</strong> ${areaFormatted} מ"ר</div>`);
              }
              
              if (props.status_text) {
                popupParts.push(`<div style="font-size:12px;color:#6b7280;margin-top:4px;"><strong>סטטוס:</strong> ${props.status_text}</div>`);
              }
              
              popupParts.push('</div>');
              
              const popupContent = popupParts.join('');
              layer.bindPopup(popupContent);
            }}
          />
        )}
      </MapContainer>

      {/* Layers Dropdown Menu */}
      <div className="absolute top-4 right-4 z-[1000]" dir="rtl">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-semibold transition border shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              שכבות
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 z-[2000]" dir="rtl">
            <DropdownMenuLabel>בחר שכבות להצגה</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={showDeclaredLayer}
              onCheckedChange={(checked) => setShowDeclaredLayer(checked === true)}
            >
              פרויקטים מוכרזים ({declaredFeatures.length.toLocaleString("he-IL")})
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showResidentialInventoryLayer}
              onCheckedChange={(checked) => setShowResidentialInventoryLayer(checked === true)}
            >
              מלאי תכנוני למגורים ({residentialInventoryFeatures.length.toLocaleString("he-IL")})
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showPriceProgramLayer}
              onCheckedChange={(checked) => setShowPriceProgramLayer(checked === true)}
            >
              מחיר למשתכן ({priceProgramFeatures.length.toLocaleString("he-IL")})
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showUrbanRenewalLayer}
              onCheckedChange={(checked) => setShowUrbanRenewalLayer(checked === true)}
            >
              התחדשות עירונית ({urbanRenewalFeatures.length.toLocaleString("he-IL")})
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showTalarPrepLayer}
              onCheckedChange={(checked) => setShowTalarPrepLayer(checked === true)}
            >
              תוכניות בהכנה ({talarPrepFeatures.length.toLocaleString("he-IL")})
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showGushimLayer}
              onCheckedChange={(checked) => setShowGushimLayer(checked === true)}
            >
              גושים
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showParcelsLayer}
              onCheckedChange={(checked) => setShowParcelsLayer(checked === true)}
            >
              חלקות
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showTama70Layer}
              onCheckedChange={(checked) => setShowTama70Layer(checked === true)}
            >
              תמא/70 - מטרו - גבול תכנית
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showLandUseMavatLayer}
              onCheckedChange={(checked) => setShowLandUseMavatLayer(checked === true)}
            >
              יעודי קרקע - מבא"ת
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectedDeclaredFeature && (
        <div className="absolute z-[1000] bottom-6 right-6 bg-white rounded-xl shadow-lg border p-4 min-w-[320px]" dir="rtl">
          {(() => {
            const props = selectedDeclaredFeature.properties;
            if (!props) return null;

            return (
              <div>
                <div className="font-bold text-lg text-gray-900 mb-1">
                  פרויקט התחדשות עירונית מוכרז
                </div>
                {props.ShemMitcha && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">מתחם:</span> {props.ShemMitcha}
                  </div>
                )}
                {props.plan_name && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">שם תוכנית:</span> {props.plan_name}
                  </div>
                )}
                {props.Yeshuv && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">יישוב:</span> {props.Yeshuv}
                  </div>
                )}
                {props.TeurMaslul && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">מסלול:</span> {props.TeurMaslul}
                  </div>
                )}
                {props.TeurSugMas && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">סוג מימון:</span> {props.TeurSugMas}
                  </div>
                )}
                {(props.yachadKaya || props.yachadMutz || props.YachadTosa) && (
                  <div className="text-sm text-gray-600 mb-2">
                    {props.yachadKaya && <span>יח"ד קיימות: {props.yachadKaya}</span>}
                    {props.yachadMutz && <span className="mx-1">• יח"ד מוצעות: {props.yachadMutz}</span>}
                    {typeof props.YachadTosa === "number" && (
                      <span className="mx-1">• תוספת: {props.YachadTosa.toLocaleString("he-IL")}</span>
                    )}
                  </div>
                )}
                {props.taarichTok && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">תאריך יעד:</span> {new Date(props.taarichTok).toLocaleDateString("he-IL")}
                  </div>
                )}
                {(props.Shape_STAr || props.Shape_STLe) && (
                  <div className="text-xs text-gray-500 mb-2">
                    {props.Shape_STAr && <>שטח: {Math.round(props.Shape_STAr).toLocaleString("he-IL")} מ״ר</>}
                    {props.Shape_STLe && <> • היקף: {Math.round(props.Shape_STLe).toLocaleString("he-IL")} מ׳</>}
                  </div>
                )}
                {props.MisparProj && (
                  <div className="text-xs text-gray-500 mb-2">
                    מספר תוכנית: {props.MisparProj.toLocaleString("he-IL")}
                  </div>
                )}
                {props.Source && (
                  <div className="text-xs text-gray-500 mb-2">
                    מקור: {props.Source}
                  </div>
                )}
                {props.Kishur && (
                  <div className="mt-2">
                    <a
                      href={props.Kishur}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1"
                    >
                      פרטים נוספים באתר ממשל זמין
                    </a>
                  </div>
                )}
                <button
                  onClick={() => setSelectedProjectId(null)}
                  className="mt-2 text-xs	text-gray-500 hover:text-gray-700"
                >
                  ✕ סגור
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {selectedTalarPrepFeature && (
        <div className="absolute z-[1000] bottom-6 right-6 bg-white rounded-xl shadow-lg border p-4 min-w-[320px]" dir="rtl">
          {(() => {
            const props = selectedTalarPrepFeature.properties;
            if (!props) return null;

            return (
              <div>
                <div className="font-bold text-lg text-gray-900 mb-1">
                  תוכנית בהכנה
                </div>
                {props.object_id && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">מספר אובייקט:</span> {props.object_id}
                  </div>
                )}
                {Object.keys(props).filter(key => !['id', 'object_id'].includes(key) && props[key]).slice(0, 10).map(key => (
                  <div key={key} className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">{key}:</span> {String(props[key])}
                  </div>
                ))}
                <button
                  onClick={() => setSelectedTalarPrepId(null)}
                  className="mt-2 text-xs	text-gray-500 hover:text-gray-700"
                >
                  ✕ סגור
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {selectedUrbanRenewalFeature && (
        <div className="absolute z-[1000] bottom-6 right-6 bg-white rounded-xl shadow-lg border p-4 min-w-[320px]" dir="rtl">
          {(() => {
            const props = selectedUrbanRenewalFeature.properties;
            if (!props) return null;

            return (
              <div>
                <div className="font-bold text-lg text-gray-900 mb-1">
                  התחדשות עירונית
                </div>
                {props.project_name && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">שם פרויקט:</span> {props.project_name}
                  </div>
                )}
                {props.caption && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">כותרת:</span> {props.caption}
                  </div>
                )}
                {props.city_name && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">עיר:</span> {props.city_name}
                  </div>
                )}
                {props.neighborhood_name && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">שכונה:</span> {props.neighborhood_name}
                  </div>
                )}
                {props.status && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">סטטוס:</span> {props.status}
                  </div>
                )}
                {props.approval_stage && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">שלב אישור:</span> {props.approval_stage}
                  </div>
                )}
                {(props.housing_units || props.planned_units) && (
                  <div className="text-sm text-gray-600 mb-2">
                    {props.housing_units && <span>יח"ד קיימות: {props.housing_units}</span>}
                    {props.planned_units && (
                      <span className="mx-1">• יח"ד מתוכננות: {props.planned_units}</span>
                    )}
                  </div>
                )}
                {props.executing_body && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">גוף מבצע:</span> {props.executing_body}
                  </div>
                )}
                {props.heara && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">הערה:</span> {props.heara}
                  </div>
                )}
                {props.last_update && (
                  <div className="text-xs text-gray-500 mb-2">
                    עדכון אחרון: {new Date(props.last_update).toLocaleDateString("he-IL")}
                  </div>
                )}
                {props.kishur && (
                  <div className="mt-2">
                    <a
                      href={props.kishur}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1"
                    >
                      קישור למידע נוסף
                    </a>
                  </div>
                )}
                {props.remarks && (
                  <div className="text-xs text-gray-500 mb-2 mt-2">
                    הערות: {props.remarks}
                  </div>
                )}
                <button
                  onClick={() => setSelectedUrbanRenewalId(null)}
                  className="mt-2 text-xs	text-gray-500 hover:text-gray-700"
                >
                  ✕ סגור
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Gushim selection is now handled by GushimLayer component */}
      {false && selectedGushFeature && (
        <div className="absolute z-[1000] bottom-6 right-6 bg-white rounded-xl shadow-lg border p-4 min-w-[320px]" dir="rtl">
          {(() => {
            const props = selectedGushFeature.properties;
            if (!props) return null;

            return (
              <div>
                <div className="font-bold text-lg text-gray-900 mb-1">
                  גוש
                </div>
                {props.gush_num && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">מספר גוש:</span> {props.gush_num}
                  </div>
                )}
                {props.gush_suffix && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">תת גוש:</span> {props.gush_suffix}
                  </div>
                )}
                {props.status_text && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">סטטוס:</span> {props.status_text}
                  </div>
                )}
                {props.object_id && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">מספר אובייקט:</span> {props.object_id}
                  </div>
                )}
                <button
                  onClick={() => setSelectedGushId(null)}
                  className="mt-2 text-xs	text-gray-500 hover:text-gray-700"
                >
                  ✕ סגור
                </button>
              </div>
            );
          })()}
        </div>
      )}


      {/* Search by Gush and Helka - moved to bottom left for better visibility */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-4 z-[2000] space-y-3 min-w-[320px] max-w-[400px]" dir="rtl">
        <div className="text-sm font-medium text-gray-900 mb-2">חיפוש לפי גוש וחלקה</div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="search-gush" className="block text-xs text-gray-600 mb-1">
              גוש
            </label>
            <input
              id="search-gush"
              type="number"
              value={searchGush}
              onChange={(e) => setSearchGush(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleGushHelkaSearch();
                }
              }}
              placeholder="לדוגמה: 30500"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
              dir="ltr"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="search-helka" className="block text-xs text-gray-600 mb-1">
              חלקה
            </label>
            <input
              id="search-helka"
              type="number"
              value={searchHelka}
              onChange={(e) => setSearchHelka(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleGushHelkaSearch();
                }
              }}
              placeholder="לדוגמה: 42"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
              dir="ltr"
            />
          </div>
        </div>
        <button
          onClick={handleGushHelkaSearch}
          disabled={searching || !searchGush || !searchHelka}
          className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {searching ? "מחפש..." : "חפש"}
        </button>
        {searchError && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded text-xs">
            {searchError}
          </div>
        )}
        {searchResult && (
          <div className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded text-xs">
            נמצא: גוש {searchResult.gush_num}, חלקה {searchResult.helka}
          </div>
        )}
      </div>

    </div>
  );
}





