/**
 * GovMap + data.gov.il helpers for the frontend.
 *
 * GovMap’s public JSON APIs (`search-service/autocomplete`, `entitiesByPoint`)
 * work from the browser when sent with `x-trace-id` / `x-user-id` (same pattern
 * as תב״ע-נט’s client bundle). Without those headers, `entitiesByPoint` returns
 * `{"error":"access denied"}`.
 */
import type { Feature, MultiPolygon, Polygon } from "geojson";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

const GOVMAP_ORIGIN = "https://www.govmap.gov.il";
const GOVMAP_AUTOCOMPLETE = `${GOVMAP_ORIGIN}/api/search-service/autocomplete`;
const GOVMAP_ENTITIES_BY_POINT = `${GOVMAP_ORIGIN}/api/layers-catalog/entitiesByPoint`;

/** Tolerance value copied from GovMap / tabanet client (`entitiesByPoint`). */
const GOVMAP_ENTITIES_TOLERANCE = 1.9843789687579378;

/** Default map centre (ITM as GovMap expects in the `c=` param). */
const DEFAULT_GOVMAP_CENTER = "219143.61%2C618345.06";

/**
 * Build the same embed URL pattern used elsewhere in the app (`GovMapPage`).
 * Opens the official parcel layer and runs a free-text search for גוש/חלקה.
 */
export function buildGovMapGushHelkaEmbedUrl(gush: number, helka: number): string {
  const q = `גוש ${gush} חלקה ${helka}`;
  return (
    `https://www.govmap.gov.il?c=${DEFAULT_GOVMAP_CENTER}` +
    `&lay=15&bb=1&zb=1&in=1&z=12&q=${encodeURIComponent(q)}`
  );
}

export type GovMapField = {
  fieldName: string;
  fieldValue: string | number;
  fieldType?: number;
  isVisible?: boolean;
};

export type GovMapEntity = {
  objectId: number;
  centroid: [number, number];
  geom?: string;
  fields: GovMapField[];
};

export type GovMapLayer = {
  name: string;
  caption: string;
  fieldsMapping?: Record<string, string>;
  entities: GovMapEntity[];
};

export type EntitiesByPointResponse =
  | { success: true; data: GovMapLayer[] }
  | { success: false; error: string };

/**
 * Get layers at a given ITM point (proxied through our backend).
 */
export async function fetchEntitiesByPoint(
  x: number,
  y: number,
  layers: number[] = [14, 15, 21],
  radius = 50,
  signal?: AbortSignal,
): Promise<EntitiesByPointResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/govmap/entities-by-point`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x, y, layers, radius }),
      signal,
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: GovMapLayer[];
      message?: string;
    };

    if (!res.ok || !json.success || !Array.isArray(json.data)) {
      return { success: false, error: json.message || "שגיאה בקבלת מידע על הנקודה" };
    }
    return { success: true, data: json.data };
  } catch (e) {
    const err = e as Error;
    if (err.name === "AbortError") return { success: false, error: "הבקשה בוטלה" };
    return { success: false, error: err.message || "שגיאת רשת" };
  }
}

export type DataGovDatastoreSearchResponse =
  | { success: true; result: unknown }
  | { success: false; error: string };

/**
 * Proxy CKAN `datastore_search` on data.gov.il (same mechanism tabanet uses
 * via base44 `dataGovIlProxy`). Requires a known `resource_id` UUID.
 */
export async function dataGovDatastoreSearch(
  body: {
    resource_id: string;
    filters?: Record<string, unknown>;
    q?: string;
    limit?: number;
    offset?: number;
  },
  signal?: AbortSignal,
): Promise<DataGovDatastoreSearchResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/datagov/datastore-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      result?: unknown;
      error?: string;
      message?: string;
    };
    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.message || json.error || "שגיאה ב-data.gov.il",
      };
    }
    return { success: true, result: json.result };
  } catch (e) {
    const err = e as Error;
    if (err.name === "AbortError") return { success: false, error: "הבקשה בוטלה" };
    return { success: false, error: err.message || "שגיאת רשת" };
  }
}

// --- GovMap browser client (tabanet-style) ---------------------------------

function randomGovMapHeaderId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`.padEnd(32, "0").slice(0, 32);
}

function govMapJsonHeaders(): HeadersInit {
  return {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
    Referer: `${GOVMAP_ORIGIN}/`,
    Origin: GOVMAP_ORIGIN,
    "x-trace-id": randomGovMapHeaderId(),
    "x-user-id": randomGovMapHeaderId(),
  };
}

export type GovMapAutocompleteHit = {
  id: string;
  text: string;
  type?: string;
  shape?: string;
};

export type GovMapAutocompleteResponse = {
  results?: GovMapAutocompleteHit[];
  resultsCount?: number;
};

const PARCEL_LABEL_RE = /^גוש\s+(\d+)\s+חלקה\s+(\d+)\s*$/;

export function parseGushHelkaFromParcelLabel(text: string): { gush: number; helka: number } | null {
  const m = text.trim().match(PARCEL_LABEL_RE);
  if (!m) return null;
  const gushNum = Number(m[1]);
  const helkaNum = Number(m[2]);
  if (!Number.isFinite(gushNum) || !Number.isFinite(helkaNum)) return null;
  return { gush: gushNum, helka: helkaNum };
}

export function pickExactParcelAutocompleteHit(
  results: GovMapAutocompleteHit[] | undefined,
  gush: number,
  helka: number,
): GovMapAutocompleteHit | null {
  if (!results?.length) return null;
  for (const r of results) {
    const parsed = parseGushHelkaFromParcelLabel(r.text);
    if (parsed && parsed.gush === gush && parsed.helka === helka) return r;
  }
  return null;
}

export function parseWktPointToWebMercator(shape: string | undefined): [number, number] | null {
  if (!shape) return null;
  const m = shape.match(/POINT\s*\(\s*([-0-9.]+)\s+([-0-9.]+)\s*\)/i);
  if (!m) return null;
  const x = Number(m[1]);
  const y = Number(m[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [x, y];
}

/** Web Mercator (EPSG:3857) metres → WGS84 lat/lng for Leaflet. */
export function webMercatorToLatLng(x: number, y: number): [number, number] {
  const lng = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [lat, lng];
}

/** WGS84 lat/lng → Web Mercator (EPSG:3857) metres (inverse of `webMercatorToLatLng`). */
export function wgs84ToWebMercator(lat: number, lng: number): [number, number] {
  const x = (lng * 20037508.34) / 180;
  let y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
  y = (y * 20037508.34) / 180;
  return [x, y];
}

/**
 * Convert parcel `geom` WKT in Web Mercator to a GeoJSON feature (lng/lat per GeoJSON).
 */
export function govMapParcelWktToGeoJsonFeature(
  wkt: string | undefined,
  properties: Record<string, unknown> = {},
): Feature<Polygon | MultiPolygon> | null {
  if (!wkt) return null;
  const trimmed = wkt.trim();
  if (/^MULTIPOLYGON/i.test(trimmed)) {
    const coords = parseMultiPolygonWktOuterRingsWebMercator(trimmed);
    if (!coords?.length) return null;
    return {
      type: "Feature",
      properties,
      geometry: { type: "MultiPolygon", coordinates: coords },
    };
  }
  if (/^POLYGON/i.test(trimmed)) {
    const rings = parsePolygonWktRingsWebMercator(trimmed);
    if (!rings?.length) return null;
    return {
      type: "Feature",
      properties,
      geometry: { type: "Polygon", coordinates: rings },
    };
  }
  return null;
}

function wmPairToLngLat(x: number, y: number): [number, number] {
  const [lat, lng] = webMercatorToLatLng(x, y);
  return [lng, lat];
}

/**
 * First polygon, outer ring only (`MULTIPOLYGON((( … )))` as returned by GovMap).
 * Web Mercator WKT → GeoJSON [lng, lat].
 */
function parseMultiPolygonWktOuterRingsWebMercator(wkt: string): number[][][][] | null {
  let s = wkt.trim();
  if (!/^MULTIPOLYGON/i.test(s)) return null;
  s = s.replace(/^MULTIPOLYGON\s*/i, "").trim();
  if (!s.startsWith("(((") || !s.endsWith(")))")) return null;
  const inner = s.slice(3, -3);
  if (inner.includes(")),((")) return null;
  const ringCoords = parseRingCoordinatePairsWebMercator(inner);
  if (!ringCoords.length) return null;
  return [[ringCoords]];
}

function parsePolygonWktRingsWebMercator(wkt: string): [number, number][][] | null {
  let s = wkt.trim();
  if (!/^POLYGON/i.test(s)) return null;
  s = s.replace(/^POLYGON\s*/i, "").trim();
  if (!s.startsWith("((") || !s.endsWith("))")) return null;
  const inner = s.slice(2, -2);
  const ringCoords = parseRingCoordinatePairsWebMercator(inner);
  if (!ringCoords.length) return null;
  return [ringCoords];
}

function parseRingCoordinatePairsWebMercator(inner: string): [number, number][] {
  const parts = inner.split(",").map((p) => p.trim()).filter(Boolean);
  const out: [number, number][] = [];
  for (const p of parts) {
    const bits = p.split(/\s+/).filter(Boolean);
    if (bits.length < 2) continue;
    const x = Number(bits[0]);
    const y = Number(bits[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    out.push(wmPairToLngLat(x, y));
  }
  return out;
}

export async function govMapAutocomplete(
  searchText: string,
  signal?: AbortSignal,
  maxResults = 12,
): Promise<GovMapAutocompleteResponse> {
  const res = await fetch(GOVMAP_AUTOCOMPLETE, {
    method: "POST",
    headers: govMapJsonHeaders(),
    body: JSON.stringify({
      searchText,
      language: "he",
      isAccurate: false,
      maxResults,
    }),
    signal,
  });
  if (!res.ok) throw new Error(`GovMap autocomplete: HTTP ${res.status}`);
  return (await res.json()) as GovMapAutocompleteResponse;
}

export type GovMapEntitiesByPointPayload = {
  data?: GovMapLayer[];
  error?: string;
};

/** GovMap layer ids used in this app. */
export const GOVMAP_LAYER_PARCEL = "15";
export const GOVMAP_LAYER_LAND_USE_MAVAT = "14";
/** מתחמי התחדשות עירונית (פוליגונים) ב-GovMap. */
export const GOVMAP_LAYER_URBAN_RENEWAL = "200720";
/** תוכניות לשיווק מכרזים – מינהל מקרקעי ישראל (רמ״י). */
export const GOVMAP_LAYER_RAMI_REAL_ESTATE_TENDERS = "363";
/** מלאי תכנוני למגורים (תוכניות בייעוד מגורים בשלבי תכנון). */
export const GOVMAP_LAYER_RESIDENTIAL_INVENTORY = "340";

export async function govMapEntitiesByPointWebMercator(
  wmX: number,
  wmY: number,
  layerIds: readonly string[] = [GOVMAP_LAYER_PARCEL],
  signal?: AbortSignal,
): Promise<GovMapLayer[]> {
  const res = await fetch(GOVMAP_ENTITIES_BY_POINT, {
    method: "POST",
    headers: govMapJsonHeaders(),
    body: JSON.stringify({
      point: [wmX, wmY],
      layers: layerIds.map((id) => ({ layerId: id })),
      tolerance: GOVMAP_ENTITIES_TOLERANCE,
    }),
    signal,
  });
  if (!res.ok) throw new Error(`GovMap entitiesByPoint: HTTP ${res.status}`);
  const json = (await res.json()) as GovMapEntitiesByPointPayload;
  if (json.error) throw new Error(String(json.error));
  if (!Array.isArray(json.data)) throw new Error("GovMap entitiesByPoint: תשובה לא צפויה");
  return json.data;
}

function entityMatchesGushHelka(
  entity: GovMapEntity,
  gush: number,
  helka: number,
  fieldsMapping: Record<string, string> | undefined,
): boolean {
  const gushField = fieldsMapping?.gush_num ?? "מספר גוש";
  const helkaField = fieldsMapping?.parcel ?? "חלקה";
  let g: number | null = null;
  let h: number | null = null;
  for (const f of entity.fields || []) {
    if (f.fieldName === gushField) g = Number(f.fieldValue);
    if (f.fieldName === helkaField) h = Number(f.fieldValue);
  }
  return g === gush && h === helka;
}

function entityFieldsForDisplay(entity: GovMapEntity): { label: string; value: string }[] {
  return (entity.fields || [])
    .filter((f) => f.isVisible !== false)
    .map((f) => ({ label: String(f.fieldName), value: String(f.fieldValue ?? "") }))
    .filter((row) => row.value.trim() !== "");
}

/**
 * Find the value of a field by its logical name (via `fieldsMapping`) or by a list
 * of literal Hebrew field names / substrings to look for in `fields[].fieldName`.
 */
function findFieldValue(
  entity: GovMapEntity,
  fieldsMapping: Record<string, string> | undefined,
  logicalKeys: string[],
  literalMatches: (string | RegExp)[],
): string | null {
  const mappedNames = new Set<string>();
  for (const key of logicalKeys) {
    const m = fieldsMapping?.[key];
    if (m) mappedNames.add(m);
  }
  for (const f of entity.fields || []) {
    if (mappedNames.has(f.fieldName)) {
      const v = String(f.fieldValue ?? "").trim();
      if (v) return v;
    }
  }
  for (const f of entity.fields || []) {
    for (const lit of literalMatches) {
      const isMatch =
        typeof lit === "string" ? f.fieldName === lit : lit.test(f.fieldName);
      if (isMatch) {
        const v = String(f.fieldValue ?? "").trim();
        if (v) return v;
      }
    }
  }
  return null;
}

export type GovMapLandUseEntry = {
  objectId: number;
  /** Best-effort headline (e.g. "מגורים ב'") */
  title: string | null;
  /** Best-effort plan number (e.g. "תא/2650") */
  planNumber: string | null;
  /** All visible fields, ready to display in a definition list. */
  fieldsForDisplay: { label: string; value: string }[];
};

function entityToLandUseEntry(
  entity: GovMapEntity,
  fieldsMapping: Record<string, string> | undefined,
): GovMapLandUseEntry {
  const title = findFieldValue(
    entity,
    fieldsMapping,
    ["mavat_name", "land_use_name", "yeud"],
    [/יעוד|ייעוד/],
  );
  const planNumber = findFieldValue(
    entity,
    fieldsMapping,
    ["pl_number", "plan_number"],
    [/מס(?:'|"|״)?\s*תוכנית|מספר\s*תוכנית|תכנית/],
  );
  return {
    objectId: entity.objectId,
    title,
    planNumber,
    fieldsForDisplay: entityFieldsForDisplay(entity),
  };
}

function extractLandUseEntries(layers: GovMapLayer[]): GovMapLandUseEntry[] {
  const layer = layers.find(
    (l) =>
      l.name === "land_use_mavat" ||
      l.name === "land_use" ||
      /יעוד|ייעוד|מבא/.test(l.caption ?? ""),
  );
  if (!layer || !Array.isArray(layer.entities)) return [];
  return layer.entities.map((en) => entityToLandUseEntry(en, layer.fieldsMapping));
}

/**
 * Generic shape for a GovMap layer entity returned by `entitiesByPoint`,
 * normalised for display in the UI (title + secondary identifier + visible fields).
 */
export type GovMapPointLayerEntry = {
  objectId: number;
  /** Best-effort headline (e.g. שם מתחם / שם מכרז / שם תוכנית). */
  title: string | null;
  /** Best-effort secondary identifier (e.g. מספר מתחם / מספר מכרז / מספר תוכנית). */
  subtitle: string | null;
  /** All visible fields, ready to display in a definition list. */
  fieldsForDisplay: { label: string; value: string }[];
};

/**
 * Pick the first layer in the response that matches *any* of the given
 * `name` regexes or `caption` regexes, then normalise its entities into
 * `GovMapPointLayerEntry`s using the supplied title/subtitle hints.
 *
 * GovMap doesn't expose `layerId` on the response items (only `name` /
 * `caption`), so we have to pattern-match. Hints are fed to `findFieldValue`
 * which already knows how to look through `fieldsMapping` first and then
 * fall back to literal `fieldName` matches.
 */
function extractPointLayerEntries(
  layers: GovMapLayer[],
  layerMatchers: { name?: RegExp[]; caption?: RegExp[] },
  titleHints: { keys: string[]; literals: (string | RegExp)[] },
  subtitleHints: { keys: string[]; literals: (string | RegExp)[] },
): GovMapPointLayerEntry[] {
  const layer = layers.find((l) => {
    const nameOk = layerMatchers.name?.some((p) => p.test(l.name ?? "")) ?? false;
    const captionOk = layerMatchers.caption?.some((p) => p.test(l.caption ?? "")) ?? false;
    return nameOk || captionOk;
  });
  if (!layer || !Array.isArray(layer.entities)) return [];
  return layer.entities.map((entity) => ({
    objectId: entity.objectId,
    title: findFieldValue(entity, layer.fieldsMapping, titleHints.keys, titleHints.literals),
    subtitle: findFieldValue(entity, layer.fieldsMapping, subtitleHints.keys, subtitleHints.literals),
    fieldsForDisplay: entityFieldsForDisplay(entity),
  }));
}

function extractUrbanRenewalEntries(layers: GovMapLayer[]): GovMapPointLayerEntry[] {
  return extractPointLayerEntries(
    layers,
    {
      name: [/urban[_-]?renewal|hitchadshut|mitcham/i],
      caption: [/התחדשות/],
    },
    {
      keys: ["mitcham_name", "shem_mitcham", "name"],
      literals: ["שם מתחם", "שם המתחם", /שם.*מתחם/],
    },
    {
      keys: ["mitcham_id", "mispar_mitcham", "mispar_mitham", "status"],
      literals: ["מספר מתחם", /מס(?:'|"|״)?\s*מתחם/, "סטטוס"],
    },
  );
}

function extractRamiTenderEntries(layers: GovMapLayer[]): GovMapPointLayerEntry[] {
  return extractPointLayerEntries(
    layers,
    {
      name: [/rami[_-]?tender|michraz/i],
      caption: [/מכרז.*(רמ|מקרקעין)/, /(רמ.{0,3}י).*מכרז/, /מכרזי.*שיווק/],
    },
    {
      keys: ["michraz_name", "tender_name", "name"],
      literals: ["שם מכרז", "שם המכרז", /שם.*מכרז/],
    },
    {
      keys: ["michraz_id", "tender_id", "tender_number", "number"],
      literals: ["מספר מכרז", /מס(?:'|"|״)?\s*מכרז/],
    },
  );
}

function extractResidentialInventoryEntries(
  layers: GovMapLayer[],
): GovMapPointLayerEntry[] {
  return extractPointLayerEntries(
    layers,
    {
      name: [/residential[_-]?inventory|mlai|malai/i],
      caption: [/מלאי\s*תכנוני|מלאי.*למגורים/],
    },
    {
      keys: ["plan_name", "name"],
      literals: ["שם תוכנית", /שם\s*תוכנית|שם\s*תכנית/],
    },
    {
      keys: ["plan_number", "plan_id"],
      literals: ["מספר תוכנית", /מס(?:'|"|״)?\s*ת(?:ו)?כנית/],
    },
  );
}

/**
 * Fetch GovMap land-use Mavat (שכבה 14) entries at a Web-Mercator point.
 * Convenience wrapper around `govMapEntitiesByPointWebMercator` + `extractLandUseEntries`.
 */
export async function fetchLandUseMavatByPoint(
  wmX: number,
  wmY: number,
  signal?: AbortSignal,
): Promise<GovMapLandUseEntry[]> {
  const layers = await govMapEntitiesByPointWebMercator(
    wmX,
    wmY,
    [GOVMAP_LAYER_LAND_USE_MAVAT],
    signal,
  );
  return extractLandUseEntries(layers);
}

export type ResolveGushHelkaOnOwnMapResult =
  | {
      ok: true;
      gush: number;
      helka: number;
      label: string;
      geojson: Feature<Polygon | MultiPolygon>;
      fieldsForDisplay: { label: string; value: string }[];
      landUse: GovMapLandUseEntry[];
      urbanRenewal: GovMapPointLayerEntry[];
      ramiTenders: GovMapPointLayerEntry[];
      residentialInventory: GovMapPointLayerEntry[];
    }
  | { ok: false; error: string };

/**
 * High-level loading milestones reported by `resolveGushHelkaForOwnMap` while
 * it talks to GovMap. The UI uses these to drive a multi-step progress display.
 */
export type ResolveGushHelkaStep =
  | "searching"
  | "geometry"
  | "cross-reference"
  | "rendering";

export type ResolveGushHelkaProgress = {
  step: ResolveGushHelkaStep;
  /** Coarse percentage 0–100 — purely for the progress bar UI. */
  percent: number;
};

/**
 * Resolve גוש/חלקה via GovMap (autocomplete → entitiesByPoint), same client flow
 * as tabanet’s browser code. GovMap מחזיר עד ~12 הצעות — אם אין התאמה מדויקת,
 * החזרה תיכשל (מומלץ לפתוח את GovMap בקישור חיצוני).
 *
 * `onProgress` receives coarse milestones so the UI can render a multi-step
 * progress display while we wait on the network.
 */
export async function resolveGushHelkaForOwnMap(
  gush: number,
  helka: number,
  signal?: AbortSignal,
  onProgress?: (progress: ResolveGushHelkaProgress) => void,
): Promise<ResolveGushHelkaOnOwnMapResult> {
  onProgress?.({ step: "searching", percent: 5 });
  const searchText = `גוש ${gush} חלקה ${helka}`;
  let hits: GovMapAutocompleteHit[] = [];
  try {
    const ac = await govMapAutocomplete(searchText, signal, 12);
    hits = ac.results ?? [];
  } catch (e) {
    const err = e as Error;
    if (err.name === "AbortError") return { ok: false, error: "הבקשה בוטלה" };
    return { ok: false, error: err.message || "שגיאה בחיפוש GovMap" };
  }

  const hit = pickExactParcelAutocompleteHit(hits, gush, helka);
  if (!hit) {
    return {
      ok: false,
      error:
        "לא נמצאה חלקה מדויקת ברשימת ההשלמה של GovMap (מוגבל לכ־12 תוצאות). " +
        "נסו לאמת את המספרים, או פתחו את החיפוש בממשק הרשמי.",
    };
  }

  onProgress?.({ step: "geometry", percent: 35 });

  const wm = parseWktPointToWebMercator(hit.shape);
  if (!wm) {
    return { ok: false, error: "לא ניתן לפרש נקודת חיפוש מ-GovMap" };
  }

  let layers: GovMapLayer[];
  try {
    layers = await govMapEntitiesByPointWebMercator(
      wm[0],
      wm[1],
      [
        GOVMAP_LAYER_PARCEL,
        GOVMAP_LAYER_LAND_USE_MAVAT,
        GOVMAP_LAYER_URBAN_RENEWAL,
        GOVMAP_LAYER_RAMI_REAL_ESTATE_TENDERS,
        GOVMAP_LAYER_RESIDENTIAL_INVENTORY,
      ],
      signal,
    );
  } catch (e) {
    const err = e as Error;
    if (err.name === "AbortError") return { ok: false, error: "הבקשה בוטלה" };
    return { ok: false, error: err.message || "שגיאה בטעינת גיאומטריית חלקה" };
  }

  onProgress?.({ step: "cross-reference", percent: 75 });

  const parcelLayer =
    layers.find((l) => l.name === "parcel_all" || l.caption === "חלקות") ?? layers[0];
  const entity =
    parcelLayer?.entities?.find((en) =>
      entityMatchesGushHelka(en, gush, helka, parcelLayer.fieldsMapping),
    ) ?? parcelLayer?.entities?.[0];

  if (!entity) {
    return { ok: false, error: "לא נמצאה חלקה בנקודה שנבחרה" };
  }

  const landUse = extractLandUseEntries(layers);
  const urbanRenewal = extractUrbanRenewalEntries(layers);
  const ramiTenders = extractRamiTenderEntries(layers);
  const residentialInventory = extractResidentialInventoryEntries(layers);

  onProgress?.({ step: "rendering", percent: 95 });

  const gj = govMapParcelWktToGeoJsonFeature(entity.geom, {
    gush,
    helka,
    objectId: entity.objectId,
    sourceLabel: hit.text,
  });
  if (!gj) {
    const [lat, lng] = webMercatorToLatLng(entity.centroid[0], entity.centroid[1]);
    return {
      ok: true,
      gush,
      helka,
      label: hit.text,
      geojson: {
        type: "Feature",
        properties: { gush, helka, objectId: entity.objectId, sourceLabel: hit.text },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [lng - 0.0003, lat - 0.0003],
              [lng + 0.0003, lat - 0.0003],
              [lng + 0.0003, lat + 0.0003],
              [lng - 0.0003, lat + 0.0003],
              [lng - 0.0003, lat - 0.0003],
            ],
          ],
        },
      },
      fieldsForDisplay: entityFieldsForDisplay(entity),
      landUse,
      urbanRenewal,
      ramiTenders,
      residentialInventory,
    };
  }

  return {
    ok: true,
    gush,
    helka,
    label: hit.text,
    geojson: gj,
    fieldsForDisplay: entityFieldsForDisplay(entity),
    landUse,
    urbanRenewal,
    ramiTenders,
    residentialInventory,
  };
}
