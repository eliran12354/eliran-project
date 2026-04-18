import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildWhatsappHref, initialsFromName } from "@/lib/featuredProfessionals";
import { cn } from "@/lib/utils";
import { Globe, Mail, MapPin, MessageCircle, Phone, Sparkles } from "lucide-react";

export type FeaturedProfessionalCardProps = {
  name: string;
  headline: string | null;
  description: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  whatsapp: string | null;
  imageUrl: string | null;
  experienceLabel: string | null;
  rating: number | null;
  /** ברירת מחדל: כרטיס קומפקטי (דף הבית). */
  variant?: "compact" | "full";
  /** מציג באדג׳ "מומלץ ע״י המערכת" (רשימה מגויסת באתר). */
  showSystemRecommendation?: boolean;
  /** Classes for the description block; default clamps to 3 lines in compact mode. */
  descriptionClassName?: string;
};

const compactDescriptionClass =
  "text-sm leading-relaxed text-muted-foreground line-clamp-3 whitespace-pre-wrap break-words";

function StarRating({ value }: { value: number }) {
  const n = Math.min(5, Math.max(1, Math.round(value)));
  const stars = "★".repeat(n) + "☆".repeat(5 - n);
  return (
    <span
      className="tracking-tight text-amber-500"
      aria-label={`דירוג ${n} מתוך 5`}
      role="img"
    >
      {stars}
    </span>
  );
}

function primaryContactHref(
  phone: string | null,
  whatsapp: string | null,
  email: string | null,
): { href: string; external: boolean } | null {
  if (whatsapp?.trim()) {
    const h = buildWhatsappHref(whatsapp);
    if (h !== "#") return { href: h, external: true };
  }
  if (phone?.trim()) {
    return { href: `tel:${phone.replace(/\s/g, "")}`, external: false };
  }
  if (email?.trim()) {
    return { href: `mailto:${email.trim()}`, external: false };
  }
  return null;
}

export function FeaturedProfessionalCard({
  name,
  headline,
  description,
  city,
  phone,
  email,
  websiteUrl,
  whatsapp,
  imageUrl,
  experienceLabel,
  rating,
  variant = "compact",
  showSystemRecommendation = true,
  descriptionClassName,
}: FeaturedProfessionalCardProps) {
  const initials = initialsFromName(name);
  const descClass =
    descriptionClassName ??
    (variant === "full"
      ? "text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap break-words"
      : compactDescriptionClass);

  const contact = primaryContactHref(phone, whatsapp, email);
  const showRating = rating != null && rating >= 1 && rating <= 5;

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden border-border/80 bg-card text-card-foreground shadow-[var(--shadow-soft)] transition-[box-shadow,border-color] duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-medium)]">
      <div className="relative flex flex-1 flex-col gap-4 p-5 md:p-6">
        <div className="flex flex-row gap-4">
          <div className="relative shrink-0">
            {imageUrl ? (
              <>
                <div
                  className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-primary/25 via-primary/5 to-transparent opacity-90 blur-[2px]"
                  aria-hidden
                />
                <img
                  src={imageUrl}
                  alt={name}
                  className="relative h-[7.5rem] w-[7.5rem] rounded-2xl border border-border/60 object-cover shadow-sm ring-2 ring-primary/10"
                />
              </>
            ) : (
              <div
                className="flex h-[7.5rem] w-[7.5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-2xl font-bold text-primary-foreground shadow-md ring-2 ring-primary/15"
                aria-hidden
              >
                {initials}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2 text-right">
            <div className="flex flex-wrap items-start justify-end gap-2">
              {showSystemRecommendation && (
                <Badge className="gap-1 border-0 bg-primary/12 font-semibold text-primary hover:bg-primary/15">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  מומלץ ע״י המערכת
                </Badge>
              )}
              {headline ? (
                <Badge variant="outline" className="border-primary/25 font-medium text-foreground">
                  {headline}
                </Badge>
              ) : null}
            </div>

            <h3 className="font-display text-lg font-bold tracking-tight text-foreground md:text-xl">
              {name}
            </h3>

            <dl className="space-y-2 text-sm text-muted-foreground">
              {city ? (
                <div className="flex items-start justify-end gap-2">
                  <dd className="min-w-0 text-right font-medium text-foreground">{city}</dd>
                  <dt className="flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    אזור פעילות
                  </dt>
                </div>
              ) : null}
              {experienceLabel ? (
                <div className="flex justify-end gap-2">
                  <dd className="font-medium text-foreground">{experienceLabel}</dd>
                  <dt className="text-xs font-semibold uppercase tracking-wide">ניסיון</dt>
                </div>
              ) : null}
              {showRating ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <dd>
                    <StarRating value={rating} />
                  </dd>
                  <dt className="text-xs font-semibold uppercase tracking-wide">דירוג</dt>
                </div>
              ) : null}
            </dl>
          </div>
        </div>

        {description ? <p className={cn(descClass)}>{description}</p> : null}
      </div>

      <div className="mt-auto border-t border-border/60 bg-muted/20 px-5 py-4 md:px-6">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm">
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
                dir="ltr"
              >
                <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {phone.trim()}
              </a>
            ) : null}
            {whatsapp ? (
              <a
                href={buildWhatsappHref(whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
              >
                <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                וואטסאפ
              </a>
            ) : null}
          </div>
          {websiteUrl ? (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-end gap-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <Globe className="h-3.5 w-3.5" aria-hidden />
              אתר
            </a>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {contact ? (
            <Button className="h-11 min-w-[8.5rem] font-semibold shadow-sm" asChild>
              <a href={contact.href} {...(contact.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                צור קשר
              </a>
            </Button>
          ) : null}
          {email && contact?.href !== `mailto:${email.trim()}` ? (
            <Button variant="outline" size="sm" className="h-11 gap-1.5 font-semibold" asChild>
              <a href={`mailto:${email.trim()}`}>
                <Mail className="h-4 w-4" aria-hidden />
                אימייל
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
