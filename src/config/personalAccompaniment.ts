/** מחיר לתצוגה בלבד — מקור האמת לתשלום יהיה במערכת התשלומים כשתחובר. */
export const PERSONAL_ACCOMPANIMENT_PRICE_LABEL = "3,500 ₪";

/**
 * כשמוגדר (למשל URL של Lemon Squeezy), עמוד התשלום יפנה אליו.
 * כל עוד ריק — זרימת placeholder באתר (מעבר לדף הברוכים הבאים).
 */
export const PERSONAL_ACCOMPANIMENT_CHECKOUT_URL =
  import.meta.env.VITE_PERSONAL_ACCOMPANIMENT_CHECKOUT_URL?.trim() ?? "";

/** מספר וואטסאפ לליווי (ספרות, 05..., או קישור מלא). */
export const PERSONAL_ACCOMPANIMENT_WHATSAPP =
  import.meta.env.VITE_PERSONAL_ACCOMPANIMENT_WHATSAPP?.trim() ?? "";

export function isPersonalAccompanimentCheckoutConfigured(): boolean {
  return PERSONAL_ACCOMPANIMENT_CHECKOUT_URL.length > 0;
}
