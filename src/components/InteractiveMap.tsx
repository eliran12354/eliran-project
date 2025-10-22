import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { govmapQueries } from '@/lib/supabase-queries';
import type { GovmapPlan } from '@/lib/supabase';

// Fix for default markers in Leaflet with Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different plan types
const createCustomIcon = (color: string) => new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path fill="${color}" stroke="#ffffff" stroke-width="2" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0z"/>
      <circle fill="#ffffff" cx="12.5" cy="12.5" r="6"/>
    </svg>
  `)}`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41]
});

const planIcon = createCustomIcon('#3b82f6'); // blue for plans

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

export function InteractiveMap() {
  const [selectedPlan, setSelectedPlan] = useState<GovmapPlan | null>(null);

  // Fetch govmap plans with coordinates
  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['govmap-plans-interactive'],
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

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-large border border-border/20">
      <MapContainer
        center={[32.0749, 34.7668]} // Tel Aviv center
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {plansWithCoords.map((plan) => {
          const coords = getCoordinatesFromPlan(plan);
          if (!coords) return null;
          
          return (
            <Marker
              key={plan.pk}
              position={coords}
              icon={planIcon}
              eventHandlers={{
                click: () => setSelectedPlan(plan),
              }}
            >
              <Popup className="custom-popup">
                <div className="p-4 min-w-[280px]" dir="rtl">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-primary">
                      {plan.tochnit || 'תוכנית בנייה'}
                    </h3>
                    <span className="px-2 py-1 rounded-full text-xs font-medium text-blue-700 bg-blue-50">
                      תוכנית
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {plan.migrash && (
                      <p className="flex items-center gap-2">
                        <span className="font-medium">📍</span>
                        <span>מיגרש: {plan.migrash}</span>
                      </p>
                    )}
                    {plan.mishasava && (
                      <p className="flex items-center gap-2">
                        <span className="font-medium">🏘️</span>
                        <span>משאסבה: {plan.mishasava}</span>
                      </p>
                    )}
                    {plan.shape_area && (
                      <p className="flex items-center gap-2">
                        <span className="font-medium">📐</span>
                        <span className="font-bold text-primary text-base">
                          {plan.shape_area.toLocaleString('he-IL')} מ״ר
                        </span>
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <span className="font-medium">🆔</span>
                      <span>ID: {plan.objectid}</span>
                    </p>
                  </div>
                  
                  <button className="w-full mt-4 bg-gradient-primary text-white py-2 px-4 rounded-lg hover:shadow-glow transition-all duration-300 font-medium">
                    צפה בפרטים נוספים
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Map Controls Overlay */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-medium border border-primary/10 z-10" dir="rtl">
        <div className="font-semibold mb-3 text-primary">מקרא:</div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-soft"></div>
            <span className="font-medium">תוכניות בנייה ({plansWithCoords.length})</span>
          </div>
        </div>
      </div>
    </div>
  );
}