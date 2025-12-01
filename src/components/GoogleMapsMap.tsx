import { useState, useCallback, useEffect } from "react";
import { APIProvider, Map, Marker, InfoWindow } from "@vis.gl/react-google-maps";
import { GoogleMapsLayers } from "./GoogleMapsLayers";
import { GoogleMapsSearch } from "./GoogleMapsSearch";

// Get API key from environment variable
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Default center (Tel Aviv, Israel)
const DEFAULT_CENTER = { lat: 32.0749, lng: 34.7668 };
const DEFAULT_ZOOM = 13;

interface GoogleMapsMapProps {
  searchGush?: string;
  searchHelka?: string;
}

export function GoogleMapsMap({ searchGush, searchHelka }: GoogleMapsMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<{ lat: number; lng: number; title: string } | null>(null);
  const [searchMarker, setSearchMarker] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [center] = useState(DEFAULT_CENTER);
  const [zoom] = useState(DEFAULT_ZOOM);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showUrbanRenewal, setShowUrbanRenewal] = useState(true);
  const [showPriceProgram, setShowPriceProgram] = useState(true);

  // Listen for Google Maps API errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || event.error?.message || '';
      if (errorMessage.includes('ApiNotActivatedMapError') || 
          errorMessage.includes('ApiNotActivated') ||
          errorMessage.includes('Google Maps JavaScript API error')) {
        setApiError('API_NOT_ACTIVATED');
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || event.reason || '';
      if (errorMessage.includes('ApiNotActivatedMapError') || 
          errorMessage.includes('ApiNotActivated')) {
        setApiError('API_NOT_ACTIVATED');
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // If no API key, show error message
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="h-full w-full flex items-center justify-center rounded-xl border border-dashed border-red-300 bg-red-50" dir="rtl">
        <div className="text-center p-6 max-w-md">
          <p className="text-red-600 font-medium mb-2 text-lg">מפתח API של Google Maps חסר</p>
          <p className="text-sm text-red-500 mb-4">
            אנא הוסף את המפתח לקובץ .env או .env.local:
          </p>
          <code className="block bg-white p-3 rounded border border-red-200 text-xs text-left mb-4">
            VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
          </code>
          <p className="text-xs text-gray-600 mt-2">שים לב: אחרי הוספת המפתח, הפעל מחדש את השרת</p>
        </div>
      </div>
    );
  }

  // If API is not activated, show specific error message
  if (apiError === 'API_NOT_ACTIVATED') {
    return (
      <div className="h-full w-full flex items-center justify-center rounded-xl border border-dashed border-red-300 bg-red-50" dir="rtl">
        <div className="text-center p-6 max-w-lg">
          <p className="text-red-600 font-medium mb-2 text-lg">Maps JavaScript API לא מופעל</p>
          <p className="text-sm text-red-500 mb-4">
            המפתח נמצא, אבל ה-API לא מופעל ב-Google Cloud Console.
          </p>
          <div className="bg-white p-4 rounded border border-red-200 text-xs text-right space-y-2">
            <p className="font-bold text-gray-800">צעדים לתיקון:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>לך ל-<a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a></li>
              <li>בחר את הפרויקט שלך</li>
              <li>לך ל-APIs & Services → Library</li>
              <li>חפש "Maps JavaScript API"</li>
              <li>לחץ על "Enable" (הפעל)</li>
              <li>חכה כמה דקות והפעל מחדש את הדפדפן</li>
            </ol>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            רענן דף
          </button>
        </div>
      </div>
    );
  }

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setSelectedMarker({
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
        title: "מיקום נבחר"
      });
    }
  }, []);

  return (
    <APIProvider 
      apiKey={GOOGLE_MAPS_API_KEY}
      libraries={['places']}
    >
      <div className="w-full h-full rounded-xl overflow-hidden shadow-large border border-border/20 relative">
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          mapId="google-maps-property-map"
          onClick={handleMapClick}
          fullscreenControl={true}
          streetViewControl={true}
          mapTypeControl={true}
          zoomControl={true}
          style={{ width: "100%", height: "100%" }}
        >
          {selectedMarker && (
            <>
              <Marker
                position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                onClick={() => setSelectedMarker(null)}
              />
              <InfoWindow
                position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div dir="rtl" className="p-2">
                  <h3 className="font-bold text-sm mb-1">{selectedMarker.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    קואורדינטות: {selectedMarker.lat.toFixed(6)}, {selectedMarker.lng.toFixed(6)}
                  </p>
                </div>
              </InfoWindow>
            </>
          )}
          
          {/* Map Layers */}
          <GoogleMapsLayers showUrbanRenewal={showUrbanRenewal} showPriceProgram={showPriceProgram} />
          
          {/* Search Marker */}
          {searchMarker && (
            <>
              <Marker
                position={{ lat: searchMarker.lat, lng: searchMarker.lng }}
                title={searchMarker.address}
              />
              <InfoWindow
                position={{ lat: searchMarker.lat, lng: searchMarker.lng }}
                onCloseClick={() => setSearchMarker(null)}
              >
                <div dir="rtl" className="p-2">
                  <h3 className="font-bold text-sm mb-1">{searchMarker.address}</h3>
                  <p className="text-xs text-muted-foreground">
                    קואורדינטות: {searchMarker.lat.toFixed(6)}, {searchMarker.lng.toFixed(6)}
                  </p>
                </div>
              </InfoWindow>
            </>
          )}
        </Map>
        
        {/* Search Box */}
        <GoogleMapsSearch
          onLocationSelected={(location) => {
            setSearchMarker(location);
            setSelectedMarker(null); // Clear click marker if exists
          }}
        />
        
        {/* Layer Controls */}
        <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-3" dir="rtl">
          <div className="font-semibold mb-2 text-sm text-gray-900">שכבות</div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showUrbanRenewal}
                onChange={(e) => setShowUrbanRenewal(e.target.checked)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-gray-700">התחדשות עירונית</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showPriceProgram}
                onChange={(e) => setShowPriceProgram(e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-gray-700">מחיר למשתכן</span>
            </label>
          </div>
        </div>
      </div>
    </APIProvider>
  );
}
