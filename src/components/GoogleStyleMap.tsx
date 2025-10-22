import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { govmapQueries } from '@/lib/supabase-queries';
import type { GovmapPlan } from '@/lib/supabase';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Google Maps style markers for plans
const createGoogleStyleIcon = (color: string) => new L.DivIcon({
  html: `
    <div style="position: relative;">
      <svg width="32" height="43" viewBox="0 0 32 43" xmlns="http://www.w3.org/2000/svg">
        <path fill="${color}" stroke="#ffffff" stroke-width="2" 
              d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 27 16 27s16-18.163 16-27C32 7.163 24.837 0 16 0z"/>
        <circle fill="#ffffff" cx="16" cy="16" r="8"/>
        <circle fill="${color}" cx="16" cy="16" r="5"/>
      </svg>
    </div>
  `,
  className: 'google-style-marker',
  iconSize: [32, 43],
  iconAnchor: [16, 43],
  popupAnchor: [0, -43]
});

const planIcon = createGoogleStyleIcon('#4285f4'); // Google blue

// Helper function to convert ITM coordinates to WGS84 (lat/lng)
const convertITMToWGS84 = (x: number, y: number): [number, number] => {
  // More accurate ITM to WGS84 conversion for Israel
  // Based on the official Israeli TM Grid (ITM) parameters
  
  // WGS84 ellipsoid parameters
  const a = 6378137.0; // Semi-major axis
  const f = 1/298.257223563; // Flattening
  const e2 = 2*f - f*f; // First eccentricity squared
  const e4 = e2 * e2;
  const e6 = e4 * e2;
  
  // ITM projection parameters (Israeli Transverse Mercator)
  const k0 = 1.0000067; // Scale factor at central meridian
  const lat0 = 31.734393611111 * Math.PI / 180; // Central latitude in radians
  const lon0 = 35.204516944444 * Math.PI / 180; // Central longitude in radians
  const x0 = 219529.584; // False easting
  const y0 = 626907.39; // False northing
  
  // Convert ITM to WGS84
  const x_adj = x - x0;
  const y_adj = y - y0;
  
  // Calculate latitude
  const M = y_adj / (a * k0);
  const mu = M / (1 - e2/4 - 3*e4/64 - 5*e6/256);
  
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

export function GoogleStyleMap() {
  const [selectedPlan, setSelectedPlan] = useState<GovmapPlan | null>(null);

  // Fetch govmap plans with coordinates
  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['govmap-plans-google-style'],
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
    <div className="h-full w-full rounded-xl overflow-hidden shadow-large border border-border/20 relative">
      <MapContainer
        center={[32.0749, 34.7668]} // תל אביב מרכז
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        className="z-0 google-maps-style"
        zoomControl={false}
      >
        {/* Google Maps style tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="google-tile-layer"
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
              <Popup className="google-style-popup">
                <div className="p-0 min-w-[320px] max-w-[380px]" dir="rtl">
                  {/* Header with image placeholder */}
                  <div className="h-32 bg-gradient-to-r from-blue-100 to-green-100 mb-3 rounded-t-lg flex items-center justify-center">
                    <div className="text-4xl">🏗️</div>
                  </div>
                  
                  <div className="px-4 pb-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-gray-900 leading-tight">
                        {plan.tochnit || 'תוכנית בנייה'}
                      </h3>
                      <span className="px-2 py-1 rounded-full text-xs font-medium border text-blue-700 bg-blue-50 border-blue-200">
                        תוכנית
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {plan.migrash && (
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-base mt-0.5">📍</span>
                          <span className="leading-relaxed">מיגרש: {plan.migrash}</span>
                        </div>
                      )}
                      
                      {plan.mishasava && (
                        <div className="flex items-center gap-2">
                          <span className="text-base">🏘️</span>
                          <span className="font-medium">משאסבה: {plan.mishasava}</span>
                        </div>
                      )}
                      
                      {plan.shape_area && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-base">📐</span>
                          <span className="font-bold text-primary text-lg">
                            {plan.shape_area.toLocaleString('he-IL')} מ״ר
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-base">🆔</span>
                        <span className="font-medium">ID: {plan.objectid}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <button className="flex-1 bg-white text-primary border-2 border-primary py-2 px-4 rounded-lg hover:bg-primary/5 transition-colors font-medium text-sm">
                        הכוונה
                      </button>
                      <button className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm">
                        פרטים נוספים
                      </button>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Google Maps style controls */}
      <div className="absolute bottom-6 left-6 z-10">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <button className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 border-b border-gray-200 text-gray-600 font-bold text-lg">
            +
          </button>
          <button className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-600 font-bold text-xl">
            −
          </button>
        </div>
      </div>

      {/* Google style satellite/map toggle */}
      <div className="absolute bottom-6 right-6 z-10">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-1.5">
          <button className="text-sm font-medium text-gray-700 hover:text-primary">לוויין</button>
        </div>
      </div>
      
      {/* Map Legend - Google style */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10" dir="rtl">
        <div className="font-medium mb-3 text-gray-900 text-sm">תוכניות בנייה</div>
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-700">תוכניות בנייה ({plansWithCoords.length})</span>
          </div>
        </div>
      </div>
    </div>
  );
}