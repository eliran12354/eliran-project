import { useState, useEffect, useRef } from "react";

// Backend API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Extend Window interface for GovMap API
declare global {
  interface Window {
    govmap?: {
      createMap: (containerId: string, options?: any) => Promise<any>;
      setVisibleLayers: (options: { showLayers?: string[]; hideLayers?: string[] }) => void;
      zoomToXY: (options: { x: number; y: number; level?: number }) => void;
      searchAndLocate: (params: {
        type: any;
        lot?: number;
        parcel?: number;
        address?: string;
      }) => Promise<any[]>;
      locateType?: {
        addressToLotParcel: any;
        lotParcelToAddress: any;
      };
      zoomToObject?: (options: { objectId: number }) => void;
      getObjectCoordinates?: (objectId: number) => Promise<{ x: number; y: number }>;
      getBounds?: () => { minX: number; minY: number; maxX: number; maxY: number };
      onMoveEnd?: (callback: () => void) => void;
      onZoomEnd?: (callback: () => void) => void;
      getCenter?: () => { x: number; y: number };
      getZoom?: () => number;
    };
  }
}

interface GushFeature {
  type: 'Feature';
  properties: {
    id?: number;
    object_id?: number;
    gush_num?: number;
    gush_suffix?: number | null;
    status_text?: string | null;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

export default function GovMapPage() {
  const mapContainerId = "govmap-container";
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapInstanceRef = useRef<any>(null);
  
  // Get GovMap API token from environment variable
  const govmapToken = import.meta.env.VITE_GOVMAP_TOKEN || '';
  
  // Search state
  const [gush, setGush] = useState<string>("");
  const [helka, setHelka] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Gushim state
  const [gushimData, setGushimData] = useState<GushFeature[]>([]);
  const [showGushim, setShowGushim] = useState(true);
  const [gushimLoading, setGushimLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Land Use Mavat state
  const [landUseMavatData, setLandUseMavatData] = useState<any[]>([]);
  const [showLandUseMavat, setShowLandUseMavat] = useState(false);
  const [landUseMavatLoading, setLandUseMavatLoading] = useState(false);

  useEffect(() => {
    // Check if script already exists
    if (document.querySelector('script[src*="govmap.api.js"]')) {
      if (window.govmap) {
        setMapLoaded(true);
        return;
      }
    }

    // Load GovMap API script
    const script = document.createElement("script");
    script.src = "https://www.govmap.gov.il/govmap/api/govmap.api.js";
    script.async = true;
    script.onload = () => {
      console.log("GovMap API loaded");
      // Wait a bit for govmap to be available
      setTimeout(() => {
        if (window.govmap) {
          setMapLoaded(true);
        } else {
          setError("GovMap API לא זמין לאחר טעינה");
        }
      }, 100);
    };
    script.onerror = () => {
      console.error("Failed to load GovMap API");
      setError("שגיאה בטעינת GovMap API");
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup - don't remove script as it might be used elsewhere
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded || !window.govmap) return;

    // Wait a bit to ensure the element is fully rendered
    const timer = setTimeout(() => {
      const containerElement = document.getElementById(mapContainerId);
      if (!containerElement) {
        setError("Container element not found");
        return;
      }

      // Check if element has dimensions
      const rect = containerElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.warn("Map container has no dimensions, retrying...");
        // Retry after a short delay
        setTimeout(() => {
          createMapInstance();
        }, 200);
        return;
      }

      createMapInstance();
    }, 100);

    const createMapInstance = async () => {
      try {
        if (!window.govmap) return;

        // Create GovMap using createMap with container ID (string) - it returns a Promise
        // Add token if available
        const mapOptions: any = {
          // Options can include center, zoom, etc.
          // Check GovMap API docs for available options
        };
        
        // Add token if provided (required for authenticated API calls)
        if (govmapToken) {
          mapOptions.token = govmapToken;
        }
        
        const mapPromise = window.govmap.createMap(mapContainerId, mapOptions);

        // Handle the Promise
        const map = await mapPromise;
        mapInstanceRef.current = map;
        setMapReady(true);
        console.log("GovMap created successfully:", map);

        // Center map on Israel (approximate center in ITM)
        // Israel center is approximately: X=200000, Y=600000 in ITM
        if (window.govmap) {
          // Convert Israel center from WGS84 to ITM for zoomToXY
          // Approximate Israel center: 34.8°E, 31.5°N
          // Using zoomToXY with ITM coordinates
          setTimeout(() => {
            if (window.govmap) {
              window.govmap.zoomToXY({
                x: 200000, // Approximate Israel center X in ITM
                y: 600000, // Approximate Israel center Y in ITM
                level: 6 // Zoom level to show most of Israel
              });
              console.log("Centered map on Israel");
            }
          }, 500);
        }
        
      } catch (err) {
        console.error("Error creating GovMap:", err);
        setError(err instanceof Error ? err.message : "שגיאה ביצירת מפת GovMap");
      }
    };

    return () => {
      clearTimeout(timer);
    };
  }, [mapLoaded, govmapToken, showGushim]);

  // Load gushim data from backend
  useEffect(() => {
    if (!showGushim) {
      setGushimData([]);
      return;
    }

    let isMounted = true;

    const loadGushim = async () => {
      try {
        setGushimLoading(true);
        console.log('Loading gushim from backend API...');

        let allFeatures: GushFeature[] = [];
        let page = 1;
        const pageSize = 500;
        let hasMore = true;

        while (hasMore && isMounted) {
          try {
            const response = await fetch(
              `${API_URL}/api/gushim/chunk?page=${page}&pageSize=${pageSize}`
            );

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.features && data.features.length > 0) {
              allFeatures = [...allFeatures, ...data.features];
              console.log(`Loaded chunk ${page}: ${data.features.length} gushim, total: ${allFeatures.length}`);
              hasMore = data.hasMore === true;
              page++;
            } else {
              hasMore = false;
            }
          } catch (chunkError) {
            console.error(`Error loading chunk ${page}:`, chunkError);
            hasMore = false;
          }
        }

        if (isMounted) {
          setGushimData(allFeatures);
          console.log(`Finished loading ${allFeatures.length} gushim total`);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error loading gushim:', err);
      } finally {
        if (isMounted) {
          setGushimLoading(false);
        }
      }
    };

    loadGushim();

    return () => {
      isMounted = false;
    };
  }, [showGushim]);

  // Load land_use_mavat data from backend
  useEffect(() => {
    if (!showLandUseMavat) {
      setLandUseMavatData([]);
      return;
    }

    let isMounted = true;

    const loadLandUseMavat = async () => {
      try {
        setLandUseMavatLoading(true);
        console.log('Loading land_use_mavat from backend API...');

        let allFeatures: any[] = [];
        let page = 1;
        const pageSize = 500;
        let hasMore = true;

        while (hasMore && isMounted) {
          try {
            const response = await fetch(
              `${API_URL}/api/land-use-mavat/chunk?page=${page}&pageSize=${pageSize}`
            );

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.features && data.features.length > 0) {
              allFeatures = [...allFeatures, ...data.features];
              console.log(`Loaded chunk ${page}: ${data.features.length} land_use_mavat features, total: ${allFeatures.length}`);
              hasMore = data.hasMore === true;
              page++;
            } else {
              hasMore = false;
            }
          } catch (chunkError) {
            console.error(`Error loading chunk ${page}:`, chunkError);
            hasMore = false;
          }
        }

        if (isMounted) {
          setLandUseMavatData(allFeatures);
          console.log(`Finished loading ${allFeatures.length} land_use_mavat features total`);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error loading land_use_mavat:', err);
      } finally {
        if (isMounted) {
          setLandUseMavatLoading(false);
        }
      }
    };

    loadLandUseMavat();

    return () => {
      isMounted = false;
    };
  }, [showLandUseMavat]);

  // Search for parcel by GUSH and HELKA using GovMap searchAndLocate
  const handleSearch = async () => {
    if (!gush || !helka) {
      setSearchError("נא להזין גוש וחלקה");
      return;
    }

    if (!mapLoaded || !window.govmap) {
      setSearchError("המפה עדיין לא נטענה");
      return;
    }

    if (!window.govmap.searchAndLocate) {
      setSearchError("פונקציית החיפוש לא זמינה ב-GovMap API");
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const gushNum = parseInt(gush, 10);
      const helkaNum = parseInt(helka, 10);

      if (isNaN(gushNum) || isNaN(helkaNum)) {
        throw new Error('גוש וחלקה חייבים להיות מספרים');
      }

      // Use GovMap searchAndLocate API
      // type: addressToLotParcel - from lot/parcel to address
      // This returns addresses, not coordinates directly
      const params = {
        type: window.govmap.locateType?.addressToLotParcel || 'addressToLotParcel',
        lot: gushNum,
        parcel: helkaNum,
      };

      console.log('Searching with params:', params);
      const results = await window.govmap.searchAndLocate(params);
      console.log('Search results:', results);

      if (!results || results.length === 0) {
        throw new Error('לא נמצאו תוצאות לחלקה זו');
      }

      // The results contain ObjectId and Values (addresses)
      // We need to use the ObjectId to zoom to the location
      const firstResult = results[0];
      console.log('First result:', firstResult);

      // Try to zoom using ObjectId if available
      if (firstResult.ObjectId && window.govmap.zoomToObject) {
        window.govmap.zoomToObject({ objectId: firstResult.ObjectId });
        console.log(`Zoomed to object: ${firstResult.ObjectId}`);
      } else if (firstResult.ObjectId && window.govmap.getObjectCoordinates) {
        // Try to get coordinates from ObjectId
        const coords = await window.govmap.getObjectCoordinates(firstResult.ObjectId);
        window.govmap.zoomToXY({
          x: coords.x,
          y: coords.y,
          level: 10,
        });
        console.log(`Zoomed to coordinates: [${coords.x}, ${coords.y}]`);
      } else {
        // If we can't zoom, at least show that we found the parcel
        console.log('Parcel found:', firstResult);
        console.log('Address values:', firstResult.Values);
        // Show success but note that zoom might not work
        setSearchError(null);
        // You might want to show the addresses in a message
      }
    } catch (err) {
      console.error('Error searching parcel:', err);
      setSearchError(err instanceof Error ? err.message : 'שגיאה בחיפוש חלקה');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-6 border-b border-border/20">
        <h1 className="text-3xl font-bold text-primary mb-2">מפת GovMap</h1>
        <p className="text-muted-foreground mb-4">
          מפה מבוססת GovMap API עם שכבות מידע מובנות
        </p>
        
        {/* Toggle layers */}
        <div className="mb-4 flex gap-3" dir="rtl">
          <button
            onClick={() => setShowGushim(!showGushim)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showGushim
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showGushim ? 'הסתר גושים' : 'הצג גושים'}
          </button>
          {gushimData.length > 0 && (
            <span className="mr-3 text-sm text-muted-foreground">
              {gushimData.length} גושים נטענו
            </span>
          )}
          
          <button
            onClick={() => setShowLandUseMavat(!showLandUseMavat)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showLandUseMavat
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            disabled={landUseMavatLoading}
          >
            {landUseMavatLoading ? 'טוען...' : showLandUseMavat ? 'הסתר יעודי קרקע - מבא"ת' : 'הצג יעודי קרקע - מבא"ת'}
          </button>
          {landUseMavatData.length > 0 && (
            <span className="mr-3 text-sm text-muted-foreground">
              {landUseMavatData.length} יעודי קרקע נטענו
            </span>
          )}
        </div>
        
        {/* Search form */}
        <div className="flex gap-3 items-end" dir="rtl">
          <div className="flex-1">
            <label htmlFor="gush" className="block text-sm font-medium text-gray-700 mb-1">
              גוש
            </label>
            <input
              id="gush"
              type="number"
              value={gush}
              onChange={(e) => setGush(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              placeholder="לדוגמה: 30500"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              dir="ltr"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="helka" className="block text-sm font-medium text-gray-700 mb-1">
              חלקה
            </label>
            <input
              id="helka"
              type="number"
              value={helka}
              onChange={(e) => setHelka(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              placeholder="לדוגמה: 42"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              dir="ltr"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !mapLoaded}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {searching ? "מחפש..." : "חפש"}
          </button>
        </div>
        
        {searchError && (
          <div className="mt-3 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {searchError}
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        {error && (
          <div className="absolute top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg shadow-md">
            {error}
          </div>
        )}

        {!mapLoaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">טוען מפת GovMap...</p>
            </div>
          </div>
        )}

        <div
          id={mapContainerId}
          className="w-full h-full relative"
          style={{ minHeight: "600px" }}
        >
          {/* Gushim markers overlay */}
          {showGushim && gushimData.length > 0 && mapLoaded && (
            <GushimMarkers 
              gushim={gushimData} 
              mapContainerId={mapContainerId}
              mapInstance={mapInstanceRef.current}
            />
          )}

          {/* Land Use Mavat markers overlay */}
          {showLandUseMavat && landUseMavatData.length > 0 && mapLoaded && (
            <LandUseMavatMarkers 
              features={landUseMavatData} 
              mapContainerId={mapContainerId}
              mapInstance={mapInstanceRef.current}
            />
          )}
        </div>
      </div>

      <div className="p-4 border-t border-border/20 bg-gray-50">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>הערה:</strong> עמוד זה משתמש ב-GovMap API להצגת מפה עם שכבות מידע מובנות.
          </p>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => {
                if (window.govmap && mapLoaded) {
                  // Example: Show urban renewal layer
                  // You'll need to check GovMap API docs for exact layer names
                  window.govmap.setVisibleLayers({ 
                    showLayers: ['urban_renewal'] 
                  });
                  console.log("Set visible layers: urban_renewal");
                }
              }}
              className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90 text-xs"
            >
              הצג התחדשות עירונית
            </button>
            <button
              onClick={() => {
                if (window.govmap && mapLoaded) {
                  // Example: Hide all custom layers
                  window.govmap.setVisibleLayers({ 
                    hideLayers: ['urban_renewal'] 
                  });
                  console.log("Hide layers");
                }
              }}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
            >
              הסתר שכבות
            </button>
          </div>
          <p className="mt-2">
            תיעוד:{" "}
            <a
              href="https://api.govmap.gov.il/docs/intro/url-functions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              GovMap API Documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper function to convert WGS84 to ITM (Israel Grid)
function convertWGS84ToITM(lat: number, lng: number): { x: number; y: number } | null {
  try {
    // WGS84 ellipsoid parameters
    const a = 6378137.0; // Semi-major axis
    const f = 1/298.257223563; // Flattening
    const e2 = 2*f - f*f; // First eccentricity squared
    
    // ITM projection parameters
    const k0 = 1.0000067; // Scale factor
    const lat0 = 31.734393611111 * Math.PI / 180; // Central latitude
    const lon0 = 35.204516944444 * Math.PI / 180; // Central longitude
    const x0 = 219529.584; // False easting
    const y0 = 626907.39; // False northing
    
    const lat_rad = lat * Math.PI / 180;
    const lon_rad = lng * Math.PI / 180;
    
    const v = a / Math.sqrt(1 - e2 * Math.sin(lat_rad) * Math.sin(lat_rad));
    const rho = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(lat_rad) * Math.sin(lat_rad), 1.5);
    const eta2 = (v / rho) - 1;
    
    const N = a / Math.sqrt(1 - e2 * Math.sin(lat_rad) * Math.sin(lat_rad));
    
    // Calculate M0 first (for central latitude)
    const M0 = a * ((1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256) * lat0
      - (3*e2/8 + 3*e2*e2/32 + 45*e2*e2*e2/1024) * Math.sin(2*lat0)
      + (15*e2*e2/256 + 45*e2*e2*e2/1024) * Math.sin(4*lat0)
      - (35*e2*e2*e2/3072) * Math.sin(6*lat0));
    
    // Calculate M (for current latitude)
    const M = a * ((1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256) * lat_rad
      - (3*e2/8 + 3*e2*e2/32 + 45*e2*e2*e2/1024) * Math.sin(2*lat_rad)
      + (15*e2*e2/256 + 45*e2*e2*e2/1024) * Math.sin(4*lat_rad)
      - (35*e2*e2*e2/3072) * Math.sin(6*lat_rad));
    
    const dLon = lon_rad - lon0;
    const tanLat = Math.tan(lat_rad);
    const cosLat = Math.cos(lat_rad);
    
    const x = x0 + k0 * N * (dLon + (1/3) * dLon*dLon*dLon * cosLat*cosLat * (1 - tanLat*tanLat + eta2)
      + (1/15) * dLon*dLon*dLon*dLon*dLon * cosLat*cosLat*cosLat*cosLat * (2 - tanLat*tanLat));
    
    const y = y0 + k0 * (M - M0 + N * tanLat * (dLon*dLon/2 + (1/12) * dLon*dLon*dLon*dLon * cosLat*cosLat * (5 - tanLat*tanLat + 9*eta2 + 4*eta2*eta2)
      + (1/360) * dLon*dLon*dLon*dLon*dLon*dLon * cosLat*cosLat*cosLat*cosLat * (61 - 58*tanLat*tanLat + tanLat*tanLat*tanLat*tanLat + 270*eta2 - 330*eta2*tanLat*tanLat)));
    
    return { x, y };
  } catch (err) {
    console.error('Error converting WGS84 to ITM:', err);
    return null;
  }
}

// Component to render gushim markers on GovMap using DOM overlay
function GushimMarkers({ 
  gushim, 
  mapContainerId,
  mapInstance 
}: { 
  gushim: GushFeature[];
  mapContainerId: string;
  mapInstance: any;
}) {
  const markersContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!window.govmap) {
      console.log('GovMap API not available yet');
      return;
    }
    
    // Don't require mapInstance - we can work with just the container
    if (!mapInstance) {
      console.log('Map instance not available yet, but will try to render markers anyway');
      // Continue anyway - we can position markers based on container
    }
    
    if (gushim.length === 0) {
      console.log('No gushim data to render');
      return;
    }

    console.log(`Rendering ${gushim.length} gushim markers on GovMap`);
    
    // Create or get markers container
    const mapContainer = document.getElementById(mapContainerId);
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }

    // Create markers container if it doesn't exist
    let markersContainer = document.getElementById(`${mapContainerId}-markers`);
    if (!markersContainer) {
      markersContainer = document.createElement('div');
      markersContainer.id = `${mapContainerId}-markers`;
      markersContainer.style.position = 'absolute';
      markersContainer.style.top = '0';
      markersContainer.style.left = '0';
      markersContainer.style.width = '100%';
      markersContainer.style.height = '100%';
      markersContainer.style.pointerEvents = 'none';
      markersContainer.style.zIndex = '1000';
      mapContainer.style.position = 'relative';
      mapContainer.appendChild(markersContainer);
    }

    // Clear existing markers
    markersContainer.innerHTML = '';

    // Convert and render markers
    // Limit to first 1000 for performance (can be adjusted)
    const maxMarkers = Math.min(1000, gushim.length);
    const gushimToRender = gushim.slice(0, maxMarkers);

    let markersCreated = 0;
    let conversionErrors = 0;
    
    gushimToRender.forEach((gush, index) => {
      const [lng, lat] = gush.geometry.coordinates;
      
      // Debug first few coordinates
      if (index < 3) {
        console.log(`Gush ${gush.properties.gush_num}: coordinates [${lng}, ${lat}]`);
      }
      
      // Validate coordinates are in Israel bounds
      if (lng < 34 || lng > 36 || lat < 29.4 || lat > 33.4) {
        if (index < 5) {
          console.warn(`Gush ${gush.properties.gush_num} coordinates out of bounds: [${lng}, ${lat}]`);
        }
        conversionErrors++;
        return;
      }
      
      // Create marker element
      const marker = document.createElement('div');
      marker.style.position = 'absolute';
      marker.style.width = '10px';
      marker.style.height = '10px';
      marker.style.borderRadius = '50%';
      marker.style.backgroundColor = '#3b82f6';
      marker.style.border = '2px solid #ffffff';
      marker.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      marker.style.cursor = 'pointer';
      marker.style.pointerEvents = 'auto';
      marker.style.transform = 'translate(-50%, -50%)';
      marker.style.zIndex = '1001';
      marker.title = `גוש ${gush.properties.gush_num || 'לא ידוע'}`;
      
      // Store WGS84 coordinates for positioning
      (marker as any).lng = lng;
      (marker as any).lat = lat;
      (marker as any).gushData = gush;
      
      markersContainer.appendChild(marker);
      markersCreated++;
    });
    
    console.log(`Created ${markersCreated} markers, ${conversionErrors} conversion errors`);

    // Function to convert WGS84 coordinates to pixel position
    // This uses a more accurate approach - we need to know the map's current viewport
    // For now, we'll use a simple projection that assumes the map shows all of Israel
    const wgs84ToPixel = (lng: number, lat: number, containerWidth: number, containerHeight: number) => {
      // Israel bounds in WGS84 (more accurate)
      const minLng = 34.0;
      const maxLng = 36.0;
      const minLat = 29.4;
      const maxLat = 33.4;
      
      // Clamp coordinates to Israel bounds
      const clampedLng = Math.max(minLng, Math.min(maxLng, lng));
      const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
      
      // Normalize coordinates to 0-1 range
      // Note: lng is X (horizontal), lat is Y (vertical)
      const normalizedX = (clampedLng - minLng) / (maxLng - minLng);
      const normalizedY = 1 - (clampedLat - minLat) / (maxLat - minLat); // Invert Y axis (screen coordinates)
      
      // Convert to pixels
      const pixelX = normalizedX * containerWidth;
      const pixelY = normalizedY * containerHeight;
      
      // Debug: log first few markers to verify coordinates
      if (markersCreated < 3) {
        console.log(`Marker ${markersCreated + 1}: WGS84 [${lng}, ${lat}] -> Pixel [${pixelX}, ${pixelY}]`);
      }
      
      return { x: pixelX, y: pixelY };
    };

    // Function to update marker positions based on map view
    const updateMarkerPositions = () => {
      if (!window.govmap || !markersContainer) return;

      const containerRect = mapContainer.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      
      if (containerWidth === 0 || containerHeight === 0) return;
      
      const markers = markersContainer.querySelectorAll('div');
      let debugCount = 0;
      markers.forEach((marker: any) => {
        const pixelPos = wgs84ToPixel(marker.lng, marker.lat, containerWidth, containerHeight);
        marker.style.left = `${pixelPos.x}px`;
        marker.style.top = `${pixelPos.y}px`;
        
        // Debug first few marker positions
        if (debugCount < 3) {
          console.log(`Marker position: WGS84 [${marker.lng}, ${marker.lat}] -> Pixel [${pixelPos.x.toFixed(1)}, ${pixelPos.y.toFixed(1)}] (container: ${containerWidth}x${containerHeight})`);
          debugCount++;
        }
      });
    };

    // Initial positioning
    updateMarkerPositions();
    
    // Update positions when map container resizes
    const resizeObserver = new ResizeObserver(() => {
      updateMarkerPositions();
    });
    resizeObserver.observe(mapContainer);
    
    // Try to update positions when map moves/zooms (if GovMap API supports it)
    // For now, update positions periodically to catch map changes
    const positionUpdateInterval = setInterval(() => {
      updateMarkerPositions();
    }, 500); // Update every 500ms for better responsiveness
    
    // Also update on window resize
    const handleResize = () => {
      updateMarkerPositions();
    };
    window.addEventListener('resize', handleResize);
    
    console.log(`Created ${gushimToRender.length} gushim markers (showing first ${maxMarkers} of ${gushim.length} total)`);
    
    return () => {
      // Cleanup markers on unmount
      clearInterval(positionUpdateInterval);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (markersContainer && markersContainer.parentNode) {
        markersContainer.parentNode.removeChild(markersContainer);
      }
    };
  }, [gushim, mapContainerId, mapInstance]);

  return null;
}

// Component to render land_use_mavat markers on GovMap using DOM overlay
function LandUseMavatMarkers({ 
  features, 
  mapContainerId,
  mapInstance 
}: { 
  features: any[];
  mapContainerId: string;
  mapInstance: any;
}) {
  const markersContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!window.govmap) {
      console.log('GovMap API not available yet');
      return;
    }
    
    if (!mapInstance) {
      console.log('Map instance not available yet, but will try to render markers anyway');
    }
    
    if (features.length === 0) {
      console.log('No land_use_mavat data to render');
      return;
    }

    console.log(`Rendering ${features.length} land_use_mavat markers on GovMap`);
    
    // Create or get markers container
    const mapContainer = document.getElementById(mapContainerId);
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }

    // Create markers container if it doesn't exist
    let markersContainer = document.getElementById(`${mapContainerId}-land-use-mavat-markers`);
    if (!markersContainer) {
      markersContainer = document.createElement('div');
      markersContainer.id = `${mapContainerId}-land-use-mavat-markers`;
      markersContainer.style.position = 'absolute';
      markersContainer.style.top = '0';
      markersContainer.style.left = '0';
      markersContainer.style.width = '100%';
      markersContainer.style.height = '100%';
      markersContainer.style.pointerEvents = 'none';
      markersContainer.style.zIndex = '999'; // Below gushim markers
      mapContainer.style.position = 'relative';
      mapContainer.appendChild(markersContainer);
    }

    // Clear existing markers
    markersContainer.innerHTML = '';

    // Convert and render markers
    // Limit to first 2000 for performance (can be adjusted)
    const maxMarkers = Math.min(2000, features.length);
    const featuresToRender = features.slice(0, maxMarkers);

    let markersCreated = 0;
    let conversionErrors = 0;
    
    featuresToRender.forEach((feature, index) => {
      if (!feature.geometry) {
        conversionErrors++;
        return;
      }

      let coords: [number, number] | null = null;
      
      // Extract coordinates based on geometry type
      if (feature.geometry.type === 'Point') {
        coords = feature.geometry.coordinates;
      } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        // Use first coordinate of first ring
        const rings = feature.geometry.coordinates;
        if (rings && rings[0] && rings[0][0]) {
          coords = rings[0][0];
        }
      }
      
      if (!coords || coords.length < 2) {
        conversionErrors++;
        return;
      }
      
      const [lng, lat] = coords;
      
      // Validate coordinates are in Israel bounds
      if (lng < 34 || lng > 36 || lat < 29.4 || lat > 33.4) {
        if (index < 5) {
          console.warn(`Land use mavat feature ${feature.properties?.id} coordinates out of bounds: [${lng}, ${lat}]`);
        }
        conversionErrors++;
        return;
      }
      
      // Create marker element
      const marker = document.createElement('div');
      marker.style.position = 'absolute';
      marker.style.width = '8px';
      marker.style.height = '8px';
      marker.style.borderRadius = '50%';
      marker.style.backgroundColor = '#10b981'; // Green color
      marker.style.border = '2px solid #ffffff';
      marker.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      marker.style.cursor = 'pointer';
      marker.style.pointerEvents = 'auto';
      marker.style.transform = 'translate(-50%, -50%)';
      marker.style.zIndex = '1000';
      
      const mavatName = feature.properties?.mavat_name || feature.properties?.layer_name || 'יעוד קרקע';
      marker.title = `${mavatName}${feature.properties?.pl_number ? ` - תוכנית ${feature.properties.pl_number}` : ''}`;
      
      // Store WGS84 coordinates for positioning
      (marker as any).lng = lng;
      (marker as any).lat = lat;
      (marker as any).featureData = feature;
      
      markersContainer.appendChild(marker);
      markersCreated++;
    });
    
    console.log(`Created ${markersCreated} land_use_mavat markers, ${conversionErrors} conversion errors`);

    // Function to convert WGS84 coordinates to pixel position
    const wgs84ToPixel = (lng: number, lat: number, containerWidth: number, containerHeight: number) => {
      // Israel bounds in WGS84
      const minLng = 34.0;
      const maxLng = 36.0;
      const minLat = 29.4;
      const maxLat = 33.4;
      
      // Clamp coordinates to Israel bounds
      const clampedLng = Math.max(minLng, Math.min(maxLng, lng));
      const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
      
      // Normalize coordinates to 0-1 range
      const normalizedX = (clampedLng - minLng) / (maxLng - minLng);
      const normalizedY = 1 - (clampedLat - minLat) / (maxLat - minLat); // Invert Y axis
      
      // Convert to pixels
      const pixelX = normalizedX * containerWidth;
      const pixelY = normalizedY * containerHeight;
      
      return { x: pixelX, y: pixelY };
    };

    // Function to update marker positions based on map view
    const updateMarkerPositions = () => {
      if (!window.govmap || !markersContainer) return;

      const containerRect = mapContainer.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      
      if (containerWidth === 0 || containerHeight === 0) return;
      
      const markers = markersContainer.querySelectorAll('div');
      markers.forEach((marker: any) => {
        const pixelPos = wgs84ToPixel(marker.lng, marker.lat, containerWidth, containerHeight);
        marker.style.left = `${pixelPos.x}px`;
        marker.style.top = `${pixelPos.y}px`;
      });
    };

    // Initial positioning
    updateMarkerPositions();
    
    // Update positions when map container resizes
    const resizeObserver = new ResizeObserver(() => {
      updateMarkerPositions();
    });
    resizeObserver.observe(mapContainer);
    
    // Update positions periodically to catch map changes
    const positionUpdateInterval = setInterval(() => {
      updateMarkerPositions();
    }, 500);
    
    // Also update on window resize
    const handleResize = () => {
      updateMarkerPositions();
    };
    window.addEventListener('resize', handleResize);
    
    console.log(`Created ${featuresToRender.length} land_use_mavat markers (showing first ${maxMarkers} of ${features.length} total)`);
    
    return () => {
      // Cleanup markers on unmount
      clearInterval(positionUpdateInterval);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (markersContainer && markersContainer.parentNode) {
        markersContainer.parentNode.removeChild(markersContainer);
      }
    };
  }, [features, mapContainerId, mapInstance]);

  return null;
}

