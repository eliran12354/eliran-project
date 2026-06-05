/**
 * Service for Advanced Land Check
 * Collects data from various sources to generate comprehensive land reports
 */

import { landCheckApi } from "../api/landCheckApi";
import type { Deal, GovmapPlan, UrbanRenewalProject } from "../types/db";
import {
  fetchLandUseMavatByPoint,
  govMapAutocomplete,
  parseWktPointToWebMercator,
  pickExactParcelAutocompleteHit,
  webMercatorToLatLng,
  wgs84ToWebMercator,
  type GovMapLandUseEntry,
} from "../api/govmapApi";

// Types
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ParcelInfo {
  gush?: string;
  helka?: string;
  coordinates?: Coordinates;
  area_m2?: number;
}

export interface LandCheckInput {
  identification_type: "parcel" | "address";
  // גוש/חלקה
  gush?: string;
  helka?: string;
  // כתובת
  city?: string;
  street?: string;
  house_number?: string;
}

export interface PlanningStatus {
  status: "agricultural" | "in_rezoning" | "approved_plan" | "unknown";
  plan_name?: string;
  plan_number?: string;
  inclusion_level?: "full" | "partial" | "unknown";
  future_rights?: string[];
}

export interface ValuationData {
  average_price_per_sqm?: number;
  transaction_count?: number;
  recent_transactions?: Deal[];
  price_range?: {
    min: number;
    max: number;
  };
}

export interface LandUseInfo {
  mavat_code?: number;
  mavat_name?: string;
  pl_number?: string;
  pl_name?: string;
  defq?: string;
}

export interface PreparingPlanInfo {
  tochnit?: string;
  migrash?: string;
  mishasava?: number;
  status?: string;
}

export interface PriceTrendsData {
  rental_yield_percent?: number; // תשואת שכירות חציונית שנתית
  price_increase_percent?: number; // עליית מחירים בשנה האחרונה
  prestige_score?: number; // ציון יוקר של השכונה
  prestige_max?: number; // ציון יוקר מקסימלי
  median_prices_by_rooms?: {
    "3_rooms"?: number;
    "4_rooms"?: number;
    weighted_all?: number;
  };
  quarter_prices?: {
    neighborhood_name?: string;
    neighborhood?: number;
    city?: number;
    national?: number;
  };
}

export interface ConstructionProgressProject {
  project_name?: string;
  project_id?: string;
  city?: string;
  street?: string;
  status?: string; // סטטוס הפרויקט (בבנייה, הושלם, וכו')
  progress_percent?: number; // אחוז התקדמות
  units_count?: number; // מספר יחידות
  coordinates?: Coordinates; // קואורדינטות הפרויקט (לא זמין בדאטהסט זה)
  distance_meters?: number; // מרחק מהנכס במטרים (לא ניתן לחשב - אין קואורדינטות)
  gush?: string; // גוש
  helka?: string; // חלקה
  matches_parcel?: boolean; // האם תואם לגוש/חלקה של הנכס
  area_m2?: number; // שטח במ"ר
  marketing_method?: string; // שיטת שיווק
  fixed_date?: string; // תאריך קובע
  [key: string]: any; // שדות נוספים מה-API
}

export interface TabaPlan {
  planNumber?: string; // מספר תוכנית (למשל: "תמ"א 3 שינוי 23", "221")
  planId?: number; // מזהה תוכנית
  cityText?: string; // שם עיר
  mahut?: string; // מהות התוכנית
  status?: string; // סטטוס (למשל: "פרסום לתוקף ברשומות")
  statusDate?: string; // תאריך סטטוס
  relationType?: string | null; // סוג קשר
  documentsSet?: {
    nispachim?: Array<{ path?: string; info?: string; codeMismach?: number }>; // נספחים
    tasritim?: Array<{ path?: string; info?: string; codeMismach?: number }>; // תשריטים
    mmg?: { path?: string; info?: string; codeMismach?: number } | null; // ממג
    map?: { path?: string; info?: string; codeMismach?: number } | null; // מפה
    takanon?: { path?: string; info?: string; codeMismach?: number } | null; // תקנון
  };
  [key: string]: any; // שדות נוספים מה-API
}

export interface UrbanRenewalMitcham {
  id?: number;
  shem_mitcham?: string; // שם מתחם
  yeshuv?: string; // עיר
  mispar_tochnit?: string; // מספר תוכנית
  status?: string; // סטטוס
  yachad_tosafti?: number; // יחידות נוספות
  [key: string]: any; // שדות נוספים מהטבלה
}

export interface LandCheckReport {
  parcel_info: ParcelInfo;
  planning_status: PlanningStatus;
  land_use?: LandUseInfo[]; // יעודי קרקע - מבא"ת
  preparing_plans?: PreparingPlanInfo[]; // תוכניות בהכנה
  valuation: ValuationData;
  price_trends?: PriceTrendsData; // נתוני מגמות מחירים מהסקריפט
  urban_renewal_projects?: UrbanRenewalProject[];
  urban_renewal_mitchamim?: UrbanRenewalMitcham[]; // מתחמי התחדשות עירונית (רשות)
  nearby_dangerous_buildings?: any[];
  construction_progress_projects?: ConstructionProgressProject[]; // פרויקטי התקדמות בנייה
  taba_plans?: TabaPlan[]; // תוכניות בנייה עיר (משרד המשפטים/הקרקעות)
  risks?: string[];
  advantages?: string[];
  recommendations?: string[];
  ai_analysis?: {
    analysis: {
      risks: string[];
      advantages: string[];
      recommendations: string[];
      potential_assessment: string;
    };
    summary: string;
    key_insights: string[];
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get coordinates from gush and helka.
 *
 * Strategy:
 *   1. Look up in our parcel cache (`govmap_gushim_parcels_by_search`) via the backend.
 *   2. Fall back to the same GovMap browser API that /gush-helka-search uses
 *      (autocomplete → WKT POINT in Web Mercator → WGS84).
 *
 * The old WFS endpoint at `ags.govmap.gov.il/arcgis/.../WFSServer` returns 404
 * (GovMap retired it), so we no longer use it.
 */
export async function getCoordinatesFromParcel(
  gush: string,
  helka: string
): Promise<Coordinates | null> {
  try {
    const gushNum = parseInt(gush, 10);
    const helkaNum = parseInt(helka, 10);

    if (isNaN(gushNum) || isNaN(helkaNum)) {
      throw new Error("גוש וחלקה חייבים להיות מספרים");
    }

    // Strategy 1: backend parcel cache
    try {
      const cached = await landCheckApi.getParcel(gushNum, helkaNum);
      if (cached?.raw_entity?.centroid) {
        const [x, y] = cached.raw_entity.centroid;
        const [lat, lng] = webMercatorToLatLng(x, y);
        return { lat, lng };
      }
    } catch (cacheErr) {
      console.warn("⚠️ Parcel cache lookup failed:", cacheErr);
    }

    // Strategy 2: GovMap autocomplete (same flow as /gush-helka-search)
    try {
      const ac = await govMapAutocomplete(`גוש ${gushNum} חלקה ${helkaNum}`);
      const hit = pickExactParcelAutocompleteHit(ac.results, gushNum, helkaNum);
      const wm = hit ? parseWktPointToWebMercator(hit.shape) : null;
      if (wm) {
        const [lat, lng] = webMercatorToLatLng(wm[0], wm[1]);
        return { lat, lng };
      }
      console.warn(
        `⚠️ GovMap autocomplete did not return an exact match for גוש ${gushNum} חלקה ${helkaNum} (returned ${ac.results?.length ?? 0} hits)`,
      );
    } catch (acErr) {
      console.warn("⚠️ GovMap autocomplete failed:", acErr);
    }

    return null;
  } catch (error) {
    console.error("Error getting coordinates from parcel:", error);
    return null;
  }
}

/**
 * Get coordinates from address using geocoding
 * Tries multiple methods:
 * 1. Search in deals table for similar addresses
 * 2. Use GovMap geocoding API (returns ITM, converts to WGS84)
 * 3. Use OpenStreetMap Nominatim (fallback, returns WGS84)
 * 
 * Returns WGS84 coordinates (lat, lng)
 */
export async function getCoordinatesFromAddress(
  city: string,
  street: string,
  house_number: string
): Promise<Coordinates | null> {
  try {
    // Build full address string
    const fullAddress = `${street} ${house_number}, ${city}, ישראל`;
    const addressParts = [street, house_number, city].filter(Boolean);
    const searchAddress = addressParts.join(" ");

    // Method 1: Try to find coordinates from deals table
    // Search for similar addresses
    let deals: Array<{ address?: string; raw?: any; city_name?: string }> = [];
    try {
      deals = await landCheckApi.searchDealsByAddress(searchAddress, street, house_number, city);
    } catch (dealsErr) {
      console.warn("⚠️ Deals address lookup failed:", dealsErr);
    }

    if (deals && deals.length > 0) {
      // Check if raw data contains coordinates
      for (const deal of deals) {
        if (deal.raw) {
          try {
            const raw = typeof deal.raw === 'string' ? JSON.parse(deal.raw) : deal.raw;
            // Try different possible coordinate fields
            if (raw.latitude && raw.longitude) {
              return { lat: parseFloat(raw.latitude), lng: parseFloat(raw.longitude) };
            }
            if (raw.lat && raw.lng) {
              return { lat: parseFloat(raw.lat), lng: parseFloat(raw.lng) };
            }
            if (raw.y && raw.x) {
              // Might be ITM coordinates, convert to WGS84
              const coords = convertITMToWGS84(parseFloat(raw.x), parseFloat(raw.y));
              if (coords) return coords;
            }
          } catch (e) {
            // Continue to next deal
          }
        }
      }
    }

    // Method 2: Try GovMap geocoding API via Backend Proxy (to avoid CORS)
    try {
      const backendUrl = `${BACKEND_API_URL}/api/govmap/geocode?term=${encodeURIComponent(fullAddress)}`;
      
      const govmapResponse = await fetch(backendUrl);
      if (govmapResponse.ok) {
        const result = await govmapResponse.json();
        
        if (result.success && result.data && result.data.length > 0) {
          // Take the first suggestion
          const suggestion = result.data[0];
          
          if (suggestion.coordinates) {
            const [x, y] = suggestion.coordinates;
            
            // Check if coordinates are in WGS84 format (reasonable lat/lng range for Israel)
            if (x >= 34 && x <= 36 && y >= 29 && y <= 34) {
              // Already in WGS84 format (lng, lat)
              console.log(`✅ Geocoded address via GovMap backend: ${fullAddress} -> WGS84(${y}, ${x})`);
              return { lat: y, lng: x };
            }
            
            // Otherwise, assume ITM format and convert to WGS84
            // ITM range for Israel: X ~100k-300k, Y ~500k-800k
            if (x >= 50000 && x <= 400000 && y >= 400000 && y <= 900000) {
              const coords = convertITMToWGS84(x, y);
              if (coords) {
                console.log(`✅ Geocoded address via GovMap backend: ${fullAddress} -> ITM(${x}, ${y}) -> WGS84(${coords.lat}, ${coords.lng})`);
                return coords;
              }
            }
            
            // If coordinates don't match expected ranges, log warning but try conversion anyway
            console.warn(`⚠️ Unexpected coordinate format from GovMap geocoding: x=${x}, y=${y}. Attempting ITM to WGS84 conversion...`);
            const coords = convertITMToWGS84(x, y);
            if (coords) {
              console.log(`✅ Converted coordinates: ITM(${x}, ${y}) -> WGS84(${coords.lat}, ${coords.lng})`);
              return coords;
            }
          }
        }
      }
    } catch (govmapError) {
      console.log("GovMap geocoding via backend failed, trying fallback:", govmapError);
    }

    // Method 3: Try OpenStreetMap Nominatim (fallback)
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1&countrycodes=il`;
      
      const nominatimResponse = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'LandCheckService/1.0', // Required by Nominatim
        },
      });
      
      if (nominatimResponse.ok) {
        const nominatimData = await nominatimResponse.json();
        
        if (nominatimData && nominatimData.length > 0) {
          const result = nominatimData[0];
          if (result.lat && result.lon) {
            return {
              lat: parseFloat(result.lat),
              lng: parseFloat(result.lon),
            };
          }
        }
      }
    } catch (nominatimError) {
      console.log("Nominatim geocoding failed:", nominatimError);
    }

    // All methods failed
    console.warn(`Could not geocode address: ${fullAddress}`);
    return null;
  } catch (error) {
    console.error("Error getting coordinates from address:", error);
    return null;
  }
}

/**
 * Convert ITM (Israel Grid) coordinates to WGS84
 */
function convertITMToWGS84(x: number, y: number): Coordinates | null {
  try {
    // ITM to WGS84 conversion parameters
    const a = 6378137.0;
    const f = 1/298.257223563;
    const e2 = 2*f - f*f;
    const e4 = e2 * e2;
    const e6 = e4 * e2;
    const k0 = 1.0000067;
    const lat0 = 31.734393611111 * Math.PI / 180;
    const lon0 = 35.204516944444 * Math.PI / 180;
    const x0 = 219529.584;
    const y0 = 626907.39;
    
    const x_adj = x - x0;
    const y_adj = y - y0;
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
    
    const lat_rad = fp - (N1 * Math.tan(fp) / R1) * (D*D/2 - (5 + 3*T1 + 10*C1 - 4*C1*C1 - 9*e_2)*D*D*D*D/24 + (61 + 90*T1 + 298*C1 + 45*T1*T1 - 252*e_2 - 3*C1*C1)*D*D*D*D*D*D/720);
    
    const lon_rad = lon0 + (D - (1 + 2*T1 + C1)*D*D*D/6 + (5 - 2*C1 + 28*T1 - 3*C1*C1 + 8*e_2 + 24*T1*T1)*D*D*D*D*D/120) / Math.cos(fp);
    
    return {
      lat: lat_rad * 180 / Math.PI,
      lng: lon_rad * 180 / Math.PI,
    };
  } catch (err) {
    console.error("Error converting ITM to WGS84:", err);
    return null;
  }
}

/**
 * Get plans from GovMap REST API directly
 * Layer 50 = Preparing Plans (תוכניות בהכנה)
 * Other plan layers might exist - need to identify service names
 */
async function getPlansFromGovMapAPI(
  coordinates: Coordinates,
  layerId: number = 50,
  radiusMeters: number = 500
): Promise<any[]> {
  try {
    const itmCoords = convertWGS84ToITM(coordinates.lat, coordinates.lng);
    if (!itmCoords) return [];

    const geometryPoint = {
      x: itmCoords.x,
      y: itmCoords.y,
      spatialReference: { wkid: 2039 }
    };

    // Try different possible service names for plans
    const possibleServices = [
      'Plans',
      'GovMap_Plans',
      'Planning',
      'Tochniyot',
      'plans'
    ];

    for (const service of possibleServices) {
      try {
        const url = new URL(
          `https://ags.govmap.gov.il/arcgis/rest/services/${service}/MapServer/${layerId}/query`
        );
        
        url.searchParams.append('geometry', JSON.stringify(geometryPoint));
        url.searchParams.append('geometryType', 'esriGeometryPoint');
        url.searchParams.append('inSR', '2039');
        url.searchParams.append('spatialRel', 'esriSpatialRelIntersects');
        url.searchParams.append('distance', radiusMeters.toString());
        url.searchParams.append('units', 'esriSRUnit_Meter');
        url.searchParams.append('outFields', '*');
        url.searchParams.append('returnGeometry', 'false');
        url.searchParams.append('f', 'json');

        console.log(`Trying GovMap plans service: ${service} (layer ${layerId})`);
        
        const response = await fetch(url.toString());
        
        if (!response.ok) continue;

        const data = await response.json();
        
        if (data.error || !data.features) continue;

        if (data.features.length > 0) {
          console.log(`✅ Found ${data.features.length} plans using service: ${service}`);
          return data.features.map((f: any) => f.attributes);
        }
      } catch (error: any) {
        console.log(`Service ${service} failed:`, error.message);
        continue;
      }
    }

    return [];
  } catch (error) {
    console.error('Error getting plans from GovMap API:', error);
    return [];
  }
}

/**
 * Get planning status and plans from GovMap.
 *
 * TODO: wire to backend/PostGIS spatial queries on `govmap_plans` when needed.
 * Today returns unknown — the old direct-table path was removed.
 */
export async function getPlanningStatus(
  coordinates: Coordinates,
  gush?: string,
  helka?: string
): Promise<PlanningStatus> {
  try {
    void coordinates;
    void gush;
    void helka;
    return {
      status: "unknown",
      inclusion_level: "unknown",
    };
  } catch (error) {
    console.error("Error getting planning status:", error);
    return {
      status: "unknown",
      inclusion_level: "unknown",
    };
  }
}

/**
 * Get land use from GovMap REST API directly
 * Layer 14 = Land Use Mavat (יעודי קרקע - מבא"ת)
 */
async function getLandUseFromGovMapAPI(
  coordinates: Coordinates,
  radiusMeters: number = 500
): Promise<any[]> {
  try {
    const itmCoords = convertWGS84ToITM(coordinates.lat, coordinates.lng);
    if (!itmCoords) return [];

    const geometryPoint = {
      x: itmCoords.x,
      y: itmCoords.y,
      spatialReference: { wkid: 2039 }
    };

    // Try different possible service names for land use
    const possibleServices = [
      'LandUse',
      'Mavat',
      'LandUse_Mavat',
      'GovMap_LandUse',
      'landuse'
    ];

    for (const service of possibleServices) {
      try {
        const url = new URL(
          `https://ags.govmap.gov.il/arcgis/rest/services/${service}/MapServer/14/query`
        );
        
        url.searchParams.append('geometry', JSON.stringify(geometryPoint));
        url.searchParams.append('geometryType', 'esriGeometryPoint');
        url.searchParams.append('inSR', '2039');
        url.searchParams.append('spatialRel', 'esriSpatialRelIntersects');
        url.searchParams.append('distance', radiusMeters.toString());
        url.searchParams.append('units', 'esriSRUnit_Meter');
        url.searchParams.append('outFields', '*');
        url.searchParams.append('returnGeometry', 'false');
        url.searchParams.append('f', 'json');

        console.log(`Trying GovMap land use service: ${service}`);
        
        const response = await fetch(url.toString());
        
        if (!response.ok) continue;

        const data = await response.json();
        
        if (data.error || !data.features) continue;

        if (data.features.length > 0) {
          console.log(`✅ Found ${data.features.length} land use records using service: ${service}`);
          return data.features.map((f: any) => f.attributes);
        }
      } catch (error: any) {
        console.log(`Service ${service} failed:`, error.message);
        continue;
      }
    }

    return [];
  } catch (error) {
    console.error('Error getting land use from GovMap API:', error);
    return [];
  }
}

/** Pick the first value among `entry.fieldsForDisplay` whose label matches a regex. */
function pickFieldValue(entry: GovMapLandUseEntry, labelRe: RegExp): string | undefined {
  const row = entry.fieldsForDisplay.find((r) => labelRe.test(r.label));
  const v = row?.value?.trim();
  return v ? v : undefined;
}

function parseNumericOrUndef(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Get land use information (יעודי קרקע - מבא"ת) from GovMap layer 14, using the
 * same point-in-layer flow the dedicated /gush-helka-search page uses.
 *
 * Works for any identification method (parcel or address) — the layer query
 * runs at the resolved WGS84 coordinates regardless of how we got there.
 */
export async function getLandUseInfo(
  coordinates: Coordinates,
  _gush?: string,
  _helka?: string,
): Promise<LandUseInfo[]> {
  try {
    const [wmX, wmY] = wgs84ToWebMercator(coordinates.lat, coordinates.lng);
    const entries = await fetchLandUseMavatByPoint(wmX, wmY);
    if (!entries.length) {
      console.log("ℹ️ GovMap layer 14 (יעודי קרקע - מבא״ת) returned no entries for point", coordinates);
      return [];
    }

    const mapped: LandUseInfo[] = entries.map((entry) => ({
      mavat_name: entry.title ?? undefined,
      pl_number: entry.planNumber ?? undefined,
      pl_name: pickFieldValue(entry, /שם\s*תוכנית|שם\s*תכנית/),
      defq: pickFieldValue(entry, /תיאור|פירוט|הערות?/),
      mavat_code: parseNumericOrUndef(
        pickFieldValue(entry, /קוד\s*י(?:י)?עוד|קוד\s*מבא/),
      ),
    }));

    console.log(`✅ Loaded ${mapped.length} land-use (מבא״ת) entries from GovMap layer 14`);
    return mapped;
  } catch (error) {
    console.error("Error getting land use info:", error);
    return [];
  }
}

/**
 * Get preparing plans (תוכניות בהכנה)
 */
export async function getPreparingPlans(
  coordinates: Coordinates,
  city?: string
): Promise<PreparingPlanInfo[]> {
  try {
    void coordinates;
    void city;
    return [];
  } catch (error) {
    console.error("Error getting preparing plans:", error);
    return [];
  }
}

/**
 * Discover available services in GovMap
 * This function queries the services directory to find available service names
 */
export async function discoverGovMapServices(): Promise<any> {
  try {
    const servicesUrl = 'https://ags.govmap.gov.il/arcgis/rest/services';
    
    console.log('Discovering GovMap services...');
    const response = await fetch(servicesUrl + '?f=json');
    
    if (!response.ok) {
      console.error('Failed to fetch services directory');
      return null;
    }

    const data = await response.json();
    
    console.log('Available services:', data);
    
    // Log all service names
    if (data.services) {
      console.log('Service names found:');
      data.services.forEach((service: any) => {
        console.log(`  - ${service.name} (type: ${service.type})`);
      });
    }

    return data;
  } catch (error) {
    console.error('Error discovering services:', error);
    return null;
  }
}

// Backend API URL
const BACKEND_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Convert WGS84 coordinates to ITM (Israeli Transverse Mercator)
 * Uses proper transformation algorithm (inverse of ITM to WGS84)
 */
function convertWGS84ToITM(lat: number, lng: number): { x: number; y: number } | null {
  try {
    // WGS84 ellipsoid parameters
    const a = 6378137.0; // Semi-major axis
    const f = 1/298.257223563; // Flattening
    const e2 = 2*f - f*f; // First eccentricity squared
    const e4 = e2 * e2;
    const e6 = e4 * e2;
    
    // ITM projection parameters (Israeli Transverse Mercator - EPSG:2039)
    const k0 = 1.0000067; // Scale factor at central meridian
    const lat0 = 31.734393611111 * Math.PI / 180; // Central latitude in radians
    const lon0 = 35.204516944444 * Math.PI / 180; // Central longitude in radians
    const x0 = 219529.584; // False easting
    const y0 = 626907.39; // False northing
    
    // Convert input to radians
    const lat_rad = lat * Math.PI / 180;
    const lon_rad = lng * Math.PI / 180;
    
    // Calculate intermediate values
    const sin_lat = Math.sin(lat_rad);
    const cos_lat = Math.cos(lat_rad);
    const N = a / Math.sqrt(1 - e2 * sin_lat * sin_lat); // Radius of curvature in prime vertical
    const T = Math.tan(lat_rad);
    const T2 = T * T;
    const C = (e2 / (1 - e2)) * cos_lat * cos_lat;
    const A = cos_lat * (lon_rad - lon0);
    const A2 = A * A;
    const A3 = A2 * A;
    const A4 = A3 * A;
    const A5 = A4 * A;
    const A6 = A5 * A;
    
    // Calculate M (meridional arc)
    const M = a * (
      (1 - e2/4 - 3*e4/64 - 5*e6/256) * lat_rad
      - (3*e2/8 + 3*e4/32 + 45*e6/1024) * Math.sin(2*lat_rad)
      + (15*e4/256 + 45*e6/1024) * Math.sin(4*lat_rad)
      - (35*e6/3072) * Math.sin(6*lat_rad)
    );
    
    // Calculate ITM coordinates using Transverse Mercator projection
    const x = x0 + k0 * N * (
      A
      + (1 - T2 + C) * A3 / 6
      + (5 - 18*T2 + T2*T2 + 72*C - 58) * A5 / 120
    );
    
    const y = y0 + k0 * (
      M
      + N * T * (
        A2 / 2
        + (5 - T2 + 9*C + 4*C*C) * A4 / 24
        + (61 - 58*T2 + T2*T2 + 600*C - 330) * A6 / 720
      )
    );
    
    // Validate result (ITM coordinates for Israel should be roughly: X: 100k-300k, Y: 500k-800k)
    if (x < 50000 || x > 400000 || y < 400000 || y > 900000) {
      console.warn(`Converted ITM coordinates out of expected range: x=${x}, y=${y} (for lat=${lat}, lng=${lng})`);
    }
    
    return { x, y };
  } catch (error) {
    console.error('Error converting WGS84 to ITM:', error);
    return null;
  }
}

/**
 * Get deals from GovMap via Backend Proxy
 * Uses backend API that proxies requests to GovMap entitiesByPoint endpoint
 */
async function getDealsFromGovMapAPI(
  coordinates: Coordinates,
  radiusMeters: number = 1000
): Promise<any[]> {
  try {
    // Convert WGS84 to ITM coordinates
    const itmCoords = convertWGS84ToITM(coordinates.lat, coordinates.lng);
    if (!itmCoords) {
      console.warn('Failed to convert coordinates to ITM');
      return [];
    }

    // Validate ITM coordinates (ITM Y should be around 600k-700k for Israel)
    // If Y is too large, it might be Web Mercator - convert from Web Mercator to WGS84 first
    if (itmCoords.y > 1000000 || itmCoords.y < 500000) {
      console.warn(`Suspicious ITM Y coordinate: ${itmCoords.y}. Expected range: 500k-700k`);
      console.warn(`Coordinates might be in wrong projection. Original: lat=${coordinates.lat}, lng=${coordinates.lng}`);
      
      // Check if the input coordinates themselves might be wrong
      // If lat/lng are reasonable but ITM is wrong, the conversion formula might be wrong
      // For now, log the issue and continue - backend will handle validation
    }

    console.log('Calling backend proxy for GovMap deals:', {
      original: { lat: coordinates.lat, lng: coordinates.lng },
      itm: { x: itmCoords.x, y: itmCoords.y },
      radius: radiusMeters,
      coordinates_note: itmCoords.y > 1000000 ? 'Y coordinate seems like Web Mercator' : 'Coordinates look like ITM',
    });

    // Call backend proxy
    const response = await fetch(`${BACKEND_API_URL}/api/govmap/deals-by-point`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        x: itmCoords.x,
        y: itmCoords.y,
        radius: radiusMeters,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      console.warn('Backend returned unsuccessful response:', result);
      return [];
    }

    console.log(`✅ Got ${result.count || result.data.length} deals from GovMap via backend`);
    return result.data;
  } catch (error) {
    console.error('Error getting deals from GovMap via backend:', error);
    return [];
  }
}


/**
 * Get valuation data from deals directly (from Nadlan scraping script).
 * Uses deals returned from the scraping flow (no DB round-trip here).
 */
function getValuationDataFromDeals(deals: any[]): ValuationData {
  try {
    if (!deals || deals.length === 0) {
      return {
        transaction_count: 0,
        recent_transactions: [],
      };
    }

    console.log(`✅ Using ${deals.length} deals directly from Nadlan scraping script`);

    // Calculate price per sqm for each deal
    const dealsWithPricePerSqm = deals
      .map((deal) => ({
        ...deal,
        price_per_sqm:
          deal.price_nis && deal.area_m2
            ? deal.price_nis / deal.area_m2
            : null,
      }))
      .filter((deal) => deal.price_per_sqm !== null && deal.price_per_sqm > 0);

    if (dealsWithPricePerSqm.length === 0) {
      return {
        transaction_count: 0,
        recent_transactions: [],
      };
    }

    // Calculate average price per sqm
    const totalPricePerSqm = dealsWithPricePerSqm.reduce(
      (sum, deal) => sum + (deal.price_per_sqm || 0),
      0
    );
    const averagePricePerSqm = totalPricePerSqm / dealsWithPricePerSqm.length;

    // Get price range
    const prices = dealsWithPricePerSqm.map((d) => d.price_per_sqm || 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Get recent transactions (last 10)
    const recentTransactions = deals
      .sort((a, b) => {
        const dateA = a.deal_date ? new Date(a.deal_date).getTime() : 0;
        const dateB = b.deal_date ? new Date(b.deal_date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10) as Deal[];

    return {
      average_price_per_sqm: Math.round(averagePricePerSqm),
      transaction_count: dealsWithPricePerSqm.length,
      recent_transactions: recentTransactions,
      price_range: {
        min: Math.round(minPrice),
        max: Math.round(maxPrice),
      },
    };
  } catch (error) {
    console.error("Error getting valuation data:", error);
    return {
      transaction_count: 0,
      recent_transactions: [],
    };
  }
}

/**
 * Get urban renewal projects in the area
 */
export async function getUrbanRenewalProjects(
  coordinates: Coordinates,
  city?: string,
  radiusKm: number = 1
): Promise<UrbanRenewalProject[]> {
  try {
    void coordinates;
    void city;
    void radiusKm;
    return [];
  } catch (error) {
    console.error("Error getting urban renewal projects:", error);
    return [];
  }
}

/**
 * Get urban renewal mitchamim (מתחמי התחדשות עירונית) from urban_renewal_mitchamim_rashut table
 * Searches by city and address (street name)
 * Only returns results if data is found
 */
export async function getUrbanRenewalMitchamim(
  city?: string,
  street?: string
): Promise<UrbanRenewalMitcham[]> {
  try {
    if (!city) {
      console.log("⚠️ [getUrbanRenewalMitchamim] No city provided, returning empty array");
      return [];
    }

    console.log(`🏘️ Fetching urban renewal mitchamim for city: ${city}, street: ${street || 'N/A'}...`);

    let mitchamim: UrbanRenewalMitcham[] = [];
    try {
      mitchamim = (await landCheckApi.getMitchamim(city, street)) as UrbanRenewalMitcham[];
    } catch (error: any) {
      console.error("❌ [getUrbanRenewalMitchamim] Lookup failed:", error?.message || error);
      return [];
    }

    console.log(`📥 [getUrbanRenewalMitchamim] Query result: ${mitchamim?.length || 0} records`);

    if (!mitchamim || mitchamim.length === 0) {
      console.log("⚠️ [getUrbanRenewalMitchamim] No urban renewal mitchamim found");
      return [];
    }

    console.log(`✅ [getUrbanRenewalMitchamim] Found ${mitchamim.length} urban renewal mitchamim`);
    return mitchamim as UrbanRenewalMitcham[];
  } catch (error: any) {
    console.error("❌ [getUrbanRenewalMitchamim] Exception:", error?.message || error);
    console.error("❌ [getUrbanRenewalMitchamim] Stack:", error?.stack);
    return [];
  }
}

/**
 * Get dangerous buildings in the area
 */
export async function getNearbyDangerousBuildings(
  coordinates: Coordinates,
  city?: string,
  radiusKm: number = 0.5
): Promise<any[]> {
  try {
    void coordinates;
    void city;
    void radiusKm;
    return [];
  } catch (error) {
    console.error("Error getting dangerous buildings:", error);
    return [];
  }
}

/**
 * Get construction progress projects from data.gov.il API via backend proxy
 * Uses backend API to avoid CORS issues - all SQL queries and pagination handled on backend
 */
async function getConstructionProgressProjects(
  coordinates: Coordinates,
  city?: string,
  radiusKm: number = 2,
  gush?: string,
  helka?: string
): Promise<ConstructionProgressProject[]> {
  try {
    console.log('🏗️ Fetching construction progress projects from data.gov.il via backend...');
    
    const response = await fetch(`${BACKEND_API_URL}/api/datagov/construction-projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        city,
        gush,
        helka,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.projects) {
      console.log(`✅ Got ${result.projects.length} construction progress projects from backend`);
      
      // Map backend response to our interface
      return result.projects.map((project: any) => ({
        project_name: project.project_name,
        project_id: project.project_id,
        city: project.city,
        street: project.street || '',
        status: project.status || 'לא צוין',
        progress_percent: project.progress_percent,
        units_count: project.units_count,
        coordinates: project.coordinates,
        distance_meters: project.distance_meters,
        gush: project.gush,
        helka: project.helka,
        area_m2: project.area_m2,
        marketing_method: project.marketing_method,
        fixed_date: project.fixed_date,
        matches_parcel: project.matches_parcel || false,
        ...project, // Include all original fields
      }));
    }

    return [];
  } catch (error: any) {
    console.error('❌ Error fetching construction progress projects:', error);
    return [];
  }
}

/**
 * Scrape deals from Nadlan.gov.il via backend.
 * Uses the Nadlan scraping script to fetch deals data AND price trends for the address.
 */
async function scrapeDealsFromNadlan(
  city: string,
  street: string,
  houseNumber: string
): Promise<{ deals: any[]; trendsData?: any }> {
  try {
    console.log(`🕷️ Starting Nadlan scraping for ${street} ${houseNumber}, ${city}...`);
    
    // Start scraping job
    const response = await fetch(`${BACKEND_API_URL}/api/nadlan/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cityName: city,
        street: street,
        houseNumber: houseNumber,
        maxPages: 50, // Scrape up to 50 pages (as per original script)
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
    }

    const startResult = await response.json();
    
    // Check if we got jobId (new job tracking system) or direct results (backward compatibility)
    if (startResult.jobId) {
      // New job tracking system - poll for results
      const jobId = startResult.jobId;
      console.log(`📋 Scraping job started with ID: ${jobId}, polling for results...`);
      
      // Poll for job completion (max 5 minutes = 60 checks with 5 second intervals)
      const maxAttempts = 60;
      const pollInterval = 5000; // 5 seconds
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        // Check job status
        const statusResponse = await fetch(`${BACKEND_API_URL}/api/nadlan/status/${jobId}`);
        if (!statusResponse.ok) {
          console.warn(`⚠️ Failed to check job status: ${statusResponse.statusText}`);
          continue;
        }
        
        const status = await statusResponse.json();
        
        if (status.status === 'done') {
          // Get results
          const resultResponse = await fetch(`${BACKEND_API_URL}/api/nadlan/result/${jobId}`);
          if (!resultResponse.ok) {
            throw new Error(`Failed to get results: ${resultResponse.statusText}`);
          }
          
          const result = await resultResponse.json();
          const deals = result.result?.deals || [];
          const trendsData = result.result?.trendsData || null;
          
          console.log(`✅ Scraped ${deals.length} deals from Nadlan.gov.il`);
          if (trendsData) {
            console.log('✅ Got price trends data directly from scraping');
          }
          
          return { deals, trendsData };
        } else if (status.status === 'error') {
          throw new Error(`Scraping failed: ${status.error || 'Unknown error'}`);
        } else if (status.status === 'running' || status.status === 'queued') {
          console.log(`⏳ Scraping in progress... (attempt ${attempt + 1}/${maxAttempts})`);
          continue;
        }
      }
      
      // Timeout - return empty results
      console.warn('⚠️ Scraping timed out after 5 minutes');
      return { deals: [] };
    } else if (startResult.success && startResult.data) {
      // Backward compatibility - direct results (for development or old backend)
      const deals = startResult.data.deals || [];
      const trendsData = startResult.data.trendsData || null;
      
      console.log(`✅ Scraped ${deals.length} deals from Nadlan.gov.il`);
      if (trendsData) {
        console.log('✅ Got price trends data directly from scraping');
      }
      
      return { deals, trendsData };
    }

    return { deals: [] };
  } catch (error) {
    console.error('Error scraping from Nadlan:', error);
    return { deals: [] };
  }
}

/**
 * Get Taba Plans (תוכניות בנייה עיר) from apps.land.gov.il via backend
 * Requires gush and helka
 */
async function getTabaPlans(
  gush: string,
  helka: string
): Promise<TabaPlan[]> {
  try {
    console.log(`📋 Fetching Taba plans for gush ${gush}, helka ${helka}...`);
    
    const response = await fetch(`${BACKEND_API_URL}/api/taba/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gush,
        helka,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.plans) {
      console.log(`✅ Got ${result.plans.length} Taba plans from backend`);
      return result.plans.map((plan: any) => ({
        planNumber: plan.planNumber,
        planId: plan.planId,
        cityText: plan.cityText,
        mahut: plan.mahut,
        status: plan.status,
        statusDate: plan.statusDate,
        relationType: plan.relationType,
        documentsSet: plan.documentsSet,
        ...plan, // Include all original fields
      }));
    }

    return [];
  } catch (error: any) {
    console.error('❌ Error fetching Taba plans:', error);
    return [];
  }
}

export async function collectLandCheckData(
    input: LandCheckInput
): Promise<LandCheckReport | null> {
  try {
    // Step 1: Get coordinates
    let coordinates: Coordinates | null = null;

    if (input.identification_type === "parcel") {
      if (!input.gush || !input.helka) {
        throw new Error("גוש וחלקה נדרשים");
      }
      coordinates = await getCoordinatesFromParcel(input.gush, input.helka);
    } else {
      if (!input.city || !input.street || !input.house_number) {
        throw new Error("עיר, רחוב ומספר בית נדרשים");
      }
      coordinates = await getCoordinatesFromAddress(
          input.city,
          input.street,
          input.house_number
      );
    }

    if (!coordinates) {
      throw new Error("לא נמצאו קואורדינטות למיקום המבוקש");
    }

    // Step 1.5: If we have address details, scrape deals from Nadlan.gov.il
    let scrapedDeals: any[] = [];
    let priceTrends: PriceTrendsData | undefined;
    if (input.identification_type === "address" && input.city && input.street && input.house_number) {
      try {
        const scrapingResult = await scrapeDealsFromNadlan(input.city, input.street, input.house_number);
        scrapedDeals = scrapingResult.deals || [];

        if (scrapedDeals.length > 0) {
          console.log(`✅ Scraped ${scrapedDeals.length} deals from Nadlan.gov.il`);
        }

        if (scrapingResult.trendsData && Object.keys(scrapingResult.trendsData).length > 0) {
          priceTrends = {
            rental_yield_percent: scrapingResult.trendsData.rental_yield_percent,
            price_increase_percent: scrapingResult.trendsData.price_increase_percent,
            prestige_score: scrapingResult.trendsData.prestige_score,
            prestige_max: scrapingResult.trendsData.prestige_max,
            median_prices_by_rooms: scrapingResult.trendsData.median_prices_by_rooms,
            quarter_prices: scrapingResult.trendsData.quarter_prices,
          };
          console.log('✅ Got price trends data directly from scraping:', priceTrends);
        }
      } catch (scrapeError: any) {
        console.warn('⚠️ Nadlan scraping failed:', scrapeError?.message || scrapeError);
      }
    }

    // Step 2: Collect all data in parallel
    // Include Taba plans only if we have gush and helka
    // Note: getValuationDataFromDeals is synchronous, so we wrap it in Promise.resolve
    const dataPromises: Promise<any>[] = [
      getPlanningStatus(coordinates, input.gush, input.helka),
      getLandUseInfo(coordinates, input.gush, input.helka),
      getPreparingPlans(coordinates, input.city),
      Promise.resolve(getValuationDataFromDeals(scrapedDeals)),
      getUrbanRenewalProjects(coordinates, input.city),
      getNearbyDangerousBuildings(coordinates, input.city),
      getConstructionProgressProjects(coordinates, input.city, 2, input.gush, input.helka),
    ];

    // Add Taba plans if we have gush and helka
    if (input.gush && input.helka) {
      dataPromises.push(getTabaPlans(input.gush, input.helka));
    } else {
      dataPromises.push(Promise.resolve([])); // Placeholder to maintain array indices
    }

    const [
      planningStatus,
      landUse,
      preparingPlans,
      valuation,
      urbanRenewalProjects,
      dangerousBuildings,
      constructionProjects,
      tabaPlans,
    ] = await Promise.all(dataPromises);

    // Step 2.5: Get urban renewal mitchamim AFTER planning status (only if we have city and street)
    // This happens after planning status as requested
    let urbanRenewalMitchamim: UrbanRenewalMitcham[] = [];
    console.log(`🔍 [Urban Renewal Mitchamim] Checking conditions - city: ${input.city}, street: ${input.street}`);
    if (input.city && input.street) {
      console.log(`✅ [Urban Renewal Mitchamim] Conditions met, calling getUrbanRenewalMitchamim...`);
      try {
        urbanRenewalMitchamim = await getUrbanRenewalMitchamim(input.city, input.street);
        console.log(`📊 [Urban Renewal Mitchamim] Result: ${urbanRenewalMitchamim.length} mitchamim found`);
        if (urbanRenewalMitchamim.length > 0) {
          console.log(`✅ Found ${urbanRenewalMitchamim.length} urban renewal mitchamim`);
        } else {
          console.log(`⚠️ No urban renewal mitchamim found for city: ${input.city}, street: ${input.street}`);
        }
      } catch (error: any) {
        console.error('❌ [Urban Renewal Mitchamim] Error fetching:', error?.message || error);
        console.error('❌ [Urban Renewal Mitchamim] Error stack:', error?.stack);
      }
    } else {
      console.log(`⚠️ [Urban Renewal Mitchamim] Skipping - missing city or street. city: ${input.city}, street: ${input.street}`);
    }

    // Step 3: Build report
    const report: LandCheckReport = {
      parcel_info: {
        gush: input.gush,
        helka: input.helka,
        coordinates,
      },
      planning_status: planningStatus,
      land_use: landUse,
      preparing_plans: preparingPlans,
      valuation,
      price_trends: priceTrends,
      urban_renewal_projects: urbanRenewalProjects,
      urban_renewal_mitchamim: urbanRenewalMitchamim.length > 0 ? urbanRenewalMitchamim : undefined,
      nearby_dangerous_buildings: dangerousBuildings,
      construction_progress_projects: constructionProjects,
      taba_plans: tabaPlans && tabaPlans.length > 0 ? tabaPlans : undefined,
      risks: [],
      advantages: [],
      recommendations: [],
    };

    // Step 4: Analyze and identify risks/advantages
    if (dangerousBuildings.length > 0) {
      report.risks?.push(`נמצאו ${dangerousBuildings.length} מבנים מסוכנים בסביבה`);
    }

    if (urbanRenewalProjects.length > 0) {
      report.advantages?.push(
          `יש ${urbanRenewalProjects.length} תוכניות התחדשות עירונית בסביבה`
      );
    }

    // Add advantages/recommendations based on urban renewal mitchamim (only if found)
    if (urbanRenewalMitchamim.length > 0) {
      const mitchamNames = urbanRenewalMitchamim
        .filter((m) => m.shem_mitcham)
        .map((m) => m.shem_mitcham)
        .slice(0, 3);
      
      if (mitchamNames.length > 0) {
        report.advantages?.push(
          `נמצאו ${urbanRenewalMitchamim.length} מתחמי התחדשות עירונית רלוונטיים: ${mitchamNames.join(", ")}`
        );
      } else {
        report.advantages?.push(
          `נמצאו ${urbanRenewalMitchamim.length} מתחמי התחדשות עירונית רלוונטיים באזור`
        );
      }
      
      report.recommendations?.push(
        `מומלץ לבדוק את פרטי מתחמי ההתחדשות העירונית הקשורים לכתובת`
      );
    }

    if (landUse.length > 0) {
      const landUseNames = landUse
          .filter((lu) => lu.mavat_name)
          .map((lu) => lu.mavat_name)
          .slice(0, 3);
      if (landUseNames.length > 0) {
        report.recommendations?.push(
            `יעודי קרקע: ${landUseNames.join(", ")}`
        );
      }
    }

    if (preparingPlans.length > 0) {
      report.advantages?.push(
          `יש ${preparingPlans.length} תוכניות בהכנה בסביבה`
      );
    }

    if (constructionProjects.length > 0) {
      const activeProjects = constructionProjects.filter(p =>
          p.status && !p.status.toLowerCase().includes('הושלם') && !p.status.toLowerCase().includes('סיום')
      );
      const completedProjects = constructionProjects.filter(p =>
          p.status && (p.status.toLowerCase().includes('הושלם') || p.status.toLowerCase().includes('סיום'))
      );

      if (activeProjects.length > 0) {
        report.advantages?.push(
            `יש ${activeProjects.length} פרויקטי בנייה פעילים בסביבה - האזור מתפתח`
        );
      }

      if (completedProjects.length > 0) {
        report.advantages?.push(
            `הושלמו ${completedProjects.length} פרויקטי בנייה בסביבה - האזור מתפתח`
        );
      }
    }

    if (valuation.average_price_per_sqm) {
      report.recommendations?.push(
          `שווי ממוצע למ״ר באזור: ${valuation.average_price_per_sqm.toLocaleString()} ₪`
      );
    }

    if (planningStatus.status === "unknown" && landUse.length > 0) {
      report.planning_status.status = "approved_plan";
    }

    // Add advantages/recommendations based on Taba plans
    if (tabaPlans && tabaPlans.length > 0) {
      const activePlans = tabaPlans.filter(p => 
        p.status && (p.status.includes('תוקף') || p.status.includes('אושר'))
      );
      if (activePlans.length > 0) {
        report.advantages?.push(
          `נמצאו ${activePlans.length} תוכניות בנייה עיר בתוקף הקשורות לנכס - חשוב לבדיקה`
        );
      }
      if (tabaPlans.length > 0) {
        report.recommendations?.push(
          `מומלץ לבדוק את ${tabaPlans.length} התוכניות הקשורות לנכס במערכת טאבו`
        );
      }
    }

    // Step 5: Analyze report with AI (if available)
    try {
      console.log('🔄 Attempting to load AI analysis service...');
      const { analyzeReportWithAI } = await import('./aiReportService');
      console.log('✅ AI service loaded, starting analysis...');
      const aiAnalysis = await analyzeReportWithAI(report);
      if (aiAnalysis) {
        report.ai_analysis = aiAnalysis;
        console.log('✅ AI analysis completed and added to report');
      } else {
        console.warn('⚠️ AI analysis returned null - check API key and service');
      }
    } catch (error: any) {
      console.error('❌ AI analysis failed:', error);
    }

    return report;
  } catch (error) {
    console.error("Error collecting land check data:", error);
    throw error;
  }
}


