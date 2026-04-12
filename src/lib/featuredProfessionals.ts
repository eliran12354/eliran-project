/** Build WhatsApp click-to-chat URL from stored digits or local Israeli mobile format. */
export function buildWhatsappHref(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "#";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "#";
  let intl = digits;
  if (digits.startsWith("0")) {
    intl = `972${digits.slice(1)}`;
  } else if (!digits.startsWith("972") && digits.length <= 10) {
    intl = `972${digits}`;
  }
  return `https://wa.me/${intl}`;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[1]?.[0];
    if (a && b) return (a + b).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}
