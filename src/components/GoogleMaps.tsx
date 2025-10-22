import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { govmapQueries } from "@/lib/supabase-queries";
import type { GovmapPlan } from "@/lib/supabase";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper function to convert ITM coordinates to WGS84 (lat/lng)
const convertITMToWGS84 = (x: number, y: number): [number, number] => {
  // This is a simplified conversion - for production use a proper library
  // ITM to WGS84 conversion constants for Israel
  const a = 6378137.0; // WGS84 semi-major axis
  const f = 1/298.257223563; // WGS84 flattening
  const e2 = 2*f - f*f; // First eccentricity squared
  
  // ITM projection parameters
  const k0 = 1.0000067; // Scale factor
  const lat0 = 31.734393611111; // Central latitude in radians
  const lon0 = 35.204516944444; // Central longitude in radians
  const x0 = 219529.584; // False easting
  const y0 = 626907.39; // False northing
  
  // Convert ITM to WGS84
  const x_adj = x - x0;
  const y_adj = y - y0;
  
  const lat = lat0 + (y_adj / (a * k0)) * (1 - e2/2 - 3*e2*e2/8);
  const lon = lon0 + (x_adj / (a * k0 * Math.cos(lat0)));
  
  return [lat, lon];
};

// Helper function to extract coordinates from govmap plan
const getCoordinatesFromPlan = (plan: GovmapPlan): [number, number] | null => {
  try {
    // Try to get coordinates from raw JSONB data first
    if (plan.raw && plan.raw.bbox && Array.isArray(plan.raw.bbox) && plan.raw.bbox.length >= 4) {
      const [minX, minY, maxX, maxY] = plan.raw.bbox;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      return convertITMToWGS84(centerX, centerY);
    }
    
    // Try to get coordinates from bbox field
    if (plan.bbox && Array.isArray(plan.bbox) && plan.bbox.length >= 4) {
      const [minX, minY, maxX, maxY] = plan.bbox;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      return convertITMToWGS84(centerX, centerY);
    }
    
    // Try to get coordinates from coordinates field
    if (plan.coordinates && Array.isArray(plan.coordinates)) {
      // If it's a polygon, get the first point
      if (plan.coordinates[0] && Array.isArray(plan.coordinates[0])) {
        const firstPoint = plan.coordinates[0][0];
        if (Array.isArray(firstPoint) && firstPoint.length >= 2) {
          return convertITMToWGS84(firstPoint[0], firstPoint[1]);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting coordinates from plan:', error);
    return null;
  }
};

function FitBoundsToPlans({ plans }: { plans: GovmapPlan[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (map && plans.length > 0) {
      const validCoords = plans
        .map(plan => getCoordinatesFromPlan(plan))
        .filter((coord): coord is [number, number] => coord !== null);
      
      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [map, plans]);

  return null;
}

export function LeafletMap() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const center: [number, number] = [32.0749, 34.7668]; // Tel Aviv center

  // Fetch govmap plans with coordinates
  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['govmap-plans'],
    queryFn: () => govmapQueries.getWithCoordinates()
  });

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center rounded-xl border border-dashed border-primary/30 text-sm text-muted-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>טוען תוכניות בנייה...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center rounded-xl border border-dashed border-primary/30 text-sm text-red-500">
        שגיאה בטעינת התוכניות
      </div>
    );
  }

  // Filter plans that have valid coordinates
  const plansWithCoords = plans?.filter(plan => getCoordinatesFromPlan(plan) !== null) || [];

  console.log('Plans loaded:', plans?.length || 0);
  console.log('Plans with coordinates:', plansWithCoords.length);

  // If no plans with coordinates, show a fallback marker
  const hasValidPlans = plansWithCoords.length > 0;

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
        
        {hasValidPlans && <FitBoundsToPlans plans={plansWithCoords} />}
        
        {plansWithCoords.map((plan) => {
          const coords = getCoordinatesFromPlan(plan);
          if (!coords) return null;
          
          return (
            <Marker
              key={plan.pk}
              position={coords}
              eventHandlers={{
                click: () => setSelectedId(plan.pk)
              }}
            >
              <Popup>
                <div dir="rtl" className="text-right min-w-[250px]">
                  <div className="font-bold text-lg text-gray-900 mb-2">
                    {plan.tochnit || 'תוכנית בנייה'}
                  </div>
                  {plan.migrash && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">מיגרש:</span> {plan.migrash}
                    </div>
                  )}
                  {plan.mishasava && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">משאסבה:</span> {plan.mishasava}
                    </div>
                  )}
                  {plan.shape_area && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">שטח:</span> {plan.shape_area.toLocaleString('he-IL')} מ״ר
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    ID: {plan.objectid}
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
            const plan = plans?.find(p => p.pk === selectedId);
            if (!plan) return null;
            
            return (
              <div>
                <div className="font-bold text-lg text-gray-900 mb-1">
                  {plan.tochnit || 'תוכנית בנייה'}
                </div>
                {plan.migrash && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">מיגרש:</span> {plan.migrash}
                  </div>
                )}
                {plan.mishasava && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">משאסבה:</span> {plan.mishasava}
                  </div>
                )}
                {plan.shape_area && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">שטח:</span> {plan.shape_area.toLocaleString('he-IL')} מ״ר
                  </div>
                )}
                <div className="text-xs text-gray-500 mb-2">
                  ID: {plan.objectid}
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
        <div className="text-sm font-medium text-gray-900 mb-1">תוכניות בנייה</div>
        <div className="text-xs text-gray-600">
          {plansWithCoords.length} תוכניות במפה
        </div>
        {plansWithCoords.length === 0 && (
          <div className="text-xs text-orange-600 mt-1">
            אין תוכניות עם קואורדינטות
          </div>
        )}
      </div>
    </div>
  );
}

export default LeafletMap;