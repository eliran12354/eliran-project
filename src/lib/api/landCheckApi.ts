import { apiGet, toQuery } from "./client";

/**
 * Land-check lookups, served by the backend (`/api/land-check`).
 */
export const landCheckApi = {
  /** Cached parcel row by gush/helka (holds `raw_entity.centroid`). */
  getParcel(gush: number, helka: number): Promise<{ raw_entity: any } | null> {
    return apiGet(`/api/land-check/parcel${toQuery({ gush, helka })}`);
  },

  searchDealsByAddress(
    searchAddress: string,
    street: string,
    houseNumber: string,
    city: string,
  ): Promise<Array<{ address?: string; raw?: any; city_name?: string }>> {
    return apiGet(
      `/api/land-check/deals-by-address${toQuery({ searchAddress, street, houseNumber, city })}`,
    );
  },

  getMitchamim(city: string, street?: string): Promise<Record<string, any>[]> {
    return apiGet(`/api/land-check/mitchamim${toQuery({ city, street })}`);
  },
};
