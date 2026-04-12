import { buildWhatsappHref } from "@/lib/featuredProfessionals";

const MESSAGE_TEMPLATE = `שלום 👋
רכשתי ליווי אישי, הנה הפרטים שלי:
תקציב:
הון עצמי:
אזור:
מטרה:`;

export type PersonalAccompanimentDetails = {
  budget: string;
  equity: string;
  area: string;
  goal: string;
};

function buildMessageBody(details?: Partial<PersonalAccompanimentDetails>): string {
  if (!details) return MESSAGE_TEMPLATE;
  const { budget = "", equity = "", area = "", goal = "" } = details;
  return `שלום 👋
רכשתי ליווי אישי, הנה הפרטים שלי:
תקציב: ${budget}
הון עצמי: ${equity}
אזור: ${area}
מטרה: ${goal}`;
}

/** קישור wa.me עם טקסט מוכן (אופציונלי: שדות מהטופס). */
export function buildPersonalAccompanimentWhatsappHref(
  phoneRaw: string,
  details?: Partial<PersonalAccompanimentDetails>,
): string {
  const base = buildWhatsappHref(phoneRaw);
  if (base === "#") return "#";
  const body = buildMessageBody(details);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}text=${encodeURIComponent(body)}`;
}
