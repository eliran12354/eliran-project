/** Lemon Squeezy embedded checkout URL (include `?embed=1` for overlay). Override via env per environment. */
export const LEMONSQUEEZY_CHECKOUT_URL =
  import.meta.env.VITE_LEMONSQUEEZY_CHECKOUT_URL ??
  "https://nadlanpro.lemonsqueezy.com/checkout/buy/a1433f74-7fa8-4d35-bc05-c840d697f31e?embed=1";
