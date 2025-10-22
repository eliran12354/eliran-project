import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { urbanRenewalQueries } from "@/lib/supabase-queries";
import type { UrbanRenewalLocation } from "@/lib/supabase";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper function to convert ITM coordinates to WGS84 (lat/lng)
const convertITMToWGS84 = (x: number, y: number): [number, number] => {
  // Convert ITM to WGS84 for Israel
  // The coordinates you provided are in a different ITM system
  
  // For the specific coordinates you provided (3873423.4, 3773434.1)
  // These appear to be in a different projection system
  
  // Let's try a different approach - these might be in a local Israeli grid
  // or a different coordinate system
  
  // First, let's try to normalize the coordinates
  // The numbers are very large, so let's see if we can scale them down
  const normalizedX = x / 10000; // Scale down by 10,000
  const normalizedY = y / 10000; // Scale down by 10,000
  
  // Now try standard ITM conversion
  const a = 6378137.0; // Semi-major axis
  const f = 1/298.257223563; // Flattening
  const e2 = 2*f - f*f; // First eccentricity squared
  
  // ITM projection parameters
  const k0 = 1.0000067; // Scale factor at central meridian
  const lat0 = 31.734393611111 * Math.PI / 180; // Central latitude in radians
  const lon0 = 35.204516944444 * Math.PI / 180; // Central longitude in radians
  const x0 = 219529.584; // False easting
  const y0 = 626907.39; // False northing
  
  // Convert normalized coordinates
  const x_adj = normalizedX - x0;
  const y_adj = normalizedY - y0;
  
  // Calculate latitude
  const M = y_adj / (a * k0);
  const mu = M / (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256);
  
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
  
  const lat = fp - (N1 * Math.tan(fp) / R1) * (D*D/2 - (5 + 3*T1 + 10*C1 - 4*C1*C1 - 9*e_2)*D*D*D*D/24 + (61 + 90*T1 + 298*C1 + 45*T1*T1 - 252*e_2 - 3*C1*C1)*D*D*D*D*D*D/720);
  
  const lon = lon0 + (D - (1 + 2*T1 + C1)*D*D*D/6 + (5 - 2*C1 + 28*T1 - 3*C1*C1 + 8*e_2 + 24*T1*T1)*D*D*D*D*D/120) / Math.cos(fp);
  
  return [lat * 180 / Math.PI, lon * 180 / Math.PI];
};

// Helper function to check if coordinates are within Israel bounds
const isWithinIsraelBounds = (lat: number, lng: number): boolean => {
  // Israel approximate bounds:
  // North: 33.3°N, South: 29.5°N
  // East: 35.9°E, West: 34.2°E
  return lat >= 29.5 && lat <= 33.3 && lng >= 34.2 && lng <= 35.9;
};

// Helper function to extract coordinates from urban renewal location
const getCoordinatesFromLocation = (location: UrbanRenewalLocation): [number, number] | null => {
  try {
    // Get coordinates from coordinates field
    if (location.coordinates && Array.isArray(location.coordinates)) {
      // If it's a polygon, get the first point
      if (location.coordinates[0] && Array.isArray(location.coordinates[0])) {
        const firstPoint = location.coordinates[0][0];
        if (Array.isArray(firstPoint) && firstPoint.length >= 2) {
          const lat = firstPoint[1];
          const lng = firstPoint[0];
          
          // Check if coordinates are within Israel bounds
          if (isWithinIsraelBounds(lat, lng)) {
            console.log(`Location ${location.id}: Using WGS84(${lat}, ${lng}) - within Israel bounds`);
            return [lat, lng]; // Note: lat/lng order
          } else {
            console.log(`Location ${location.id}: Skipping WGS84(${lat}, ${lng}) - outside Israel bounds`);
            return null;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting coordinates from location:', error);
    return null;
  }
};

function FitBoundsToLocations({ locations }: { locations: UrbanRenewalLocation[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (map && locations.length > 0) {
      const validCoords = locations
        .map(location => getCoordinatesFromLocation(location))
        .filter((coord): coord is [number, number] => coord !== null);
      
      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [map, locations]);

  return null;
}

export function LeafletMap() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const center: [number, number] = [32.0749, 34.7668]; // Tel Aviv center

  // Fetch urban renewal locations with coordinates
  const { data: locations, isLoading, error } = useQuery({
    queryKey: ['urban-renewal-locations'],
    queryFn: () => urbanRenewalQueries.getWithCoordinates()
  });

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center rounded-xl border border-dashed border-primary/30 text-sm text-muted-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>טוען מיקומי התחדשות עירונית...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center rounded-xl border border-dashed border-primary/30 text-sm text-red-500">
        שגיאה בטעינת המיקומים
      </div>
    );
  }

  // Filter locations that have valid coordinates
  const locationsWithCoords = locations?.filter(location => getCoordinatesFromLocation(location) !== null) || [];

  console.log('Locations loaded:', locations?.length || 0);
  console.log('Locations with coordinates:', locationsWithCoords.length);
  
  // Debug: Log first few locations to see the data structure
  if (locations && locations.length > 0) {
    console.log('First location data:', locations[0]);
    console.log('First location coordinates:', locations[0].coordinates);
  }

  // If no locations with coordinates, show a fallback marker
  const hasValidLocations = locationsWithCoords.length > 0;

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-large border border-border/20 relative">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {hasValidLocations && <FitBoundsToLocations locations={locationsWithCoords} />}
        
        {/* Test marker in Tel Aviv to verify map positioning */}
        <Marker position={[32.0853, 34.7818]}>
          <Popup>
            <div dir="rtl" className="text-right">
              <div className="font-bold text-lg text-gray-900 mb-2">
                נקודת בדיקה - תל אביב
              </div>
              <div className="text-sm text-gray-600">
                אם אתה רואה את זה, המפה עובדת נכון
              </div>
            </div>
          </Popup>
        </Marker>

        {locationsWithCoords.map((location) => {
          const coords = getCoordinatesFromLocation(location);
          if (!coords) return null;
          
          return (
            <Marker
              key={location.id}
              position={coords}
              eventHandlers={{
                click: () => setSelectedId(location.id)
              }}
            >
              <Popup>
                <div dir="rtl" className="text-right min-w-[250px]">
                  <div className="font-bold text-lg text-gray-900 mb-2">
                    מיקום התחדשות עירונית
                  </div>
                  {location.object_id && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">מזהה אובייקט:</span> {location.object_id}
                    </div>
                  )}
                  {location.layer_id && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">מזהה שכבה:</span> {location.layer_id}
                    </div>
                  )}
                  {location.geometry_type && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">סוג גיאומטריה:</span> {location.geometry_type}
                    </div>
                  )}
                  {location.shape_area && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">שטח:</span> {location.shape_area.toLocaleString('he-IL')} מ״ר
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    ID: {location.id}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    קואורדינטות: {coords[0].toFixed(6)}, {coords[1].toFixed(6)}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {selectedId && (
        <div className="absolute z-[1000] bottom-6 right-6 bg-white rounded-xl shadow-lg border p-4 min-w-[320px]" dir="rtl">
          {(() => {
            const location = locations?.find(l => l.id === selectedId);
            if (!location) return null;
            
            return (
              <div>
                <div className="font-bold text-lg text-gray-900 mb-1">
                  מיקום התחדשות עירונית
                </div>
                {location.object_id && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">מזהה אובייקט:</span> {location.object_id}
                  </div>
                )}
                {location.layer_id && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">מזהה שכבה:</span> {location.layer_id}
                  </div>
                )}
                {location.geometry_type && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">סוג גיאומטריה:</span> {location.geometry_type}
                  </div>
                )}
                {location.shape_area && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">שטח:</span> {location.shape_area.toLocaleString('he-IL')} מ״ר
                  </div>
                )}
                <div className="text-xs text-gray-500 mb-2">
                  ID: {location.id}
                </div>
                <button 
                  onClick={() => setSelectedId(null)}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  ✕ סגור
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Map info */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 z-10" dir="rtl">
        <div className="text-sm font-medium text-gray-900 mb-1">מיקומי התחדשות עירונית בישראל</div>
        <div className="text-xs text-gray-600">
          {locationsWithCoords.length} מיקומים במפה
        </div>
        {locationsWithCoords.length === 0 && (
          <div className="text-xs text-orange-600 mt-1">
            אין מיקומים בישראל
          </div>
        )}
      </div>
    </div>
  );
}

export default LeafletMap;