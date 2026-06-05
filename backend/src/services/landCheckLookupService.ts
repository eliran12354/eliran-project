/**
 * Lookups used by the frontend land-check flow:
 *  - parcel centroid cache (govmap_gushim_parcels_by_search)
 *  - address → deals search (deals)
 *  - urban renewal compounds by city/street (urban_renewal_mitchamim_rashut)
 */

import { query, queryOne } from '../config/database.js';

/** Cached parcel row by gush/parcel; returns the `raw_entity` JSON (holds centroid). */
export async function getParcelByGushHelka(
  gushNum: number,
  parcelNum: number
): Promise<{ raw_entity: unknown } | null> {
  return queryOne<{ raw_entity: unknown }>(
    `SELECT raw_entity
     FROM govmap_gushim_parcels_by_search
     WHERE gush_num = $1 AND parcel = $2
     LIMIT 1`,
    [gushNum, parcelNum]
  );
}

/** Search deals by address (free text / street+number) within a city. */
export async function searchDealsByAddress(
  searchAddress: string,
  street: string,
  houseNumber: string,
  city: string
): Promise<Record<string, unknown>[]> {
  return query(
    `SELECT address, raw, city_name
     FROM deals
     WHERE (address ILIKE $1 OR address ILIKE $2)
       AND city_name ILIKE $3
     LIMIT 10`,
    [`%${searchAddress}%`, `%${street}%${houseNumber}%`, `%${city}%`]
  );
}

/** Urban renewal compounds (rashut) by city (yeshuv), optionally narrowed by street name. */
export async function getUrbanRenewalMitchamim(
  city: string,
  street?: string
): Promise<Record<string, unknown>[]> {
  const conditions = ['yeshuv ILIKE $1'];
  const params: unknown[] = [`%${city}%`];

  if (street) {
    params.push(`%${street}%`);
    conditions.push(`shem_mitcham ILIKE $${params.length}`);
  }

  return query(
    `SELECT * FROM urban_renewal_mitchamim_rashut
     WHERE ${conditions.join(' AND ')}
     LIMIT 20`,
    params
  );
}
