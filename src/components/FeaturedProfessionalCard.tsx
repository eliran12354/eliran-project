import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildWhatsappHref, initialsFromName } from "@/lib/featuredProfessionals";
import { cn } from "@/lib/utils";
import { Globe, Mail, MessageCircle, Phone } from "lucide-react";

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
  /** Classes for the description block; default clamps to 3 lines (home teaser). */
  descriptionClassName?: string;
};

const defaultDescriptionClass =
  "mb-5 line-clamp-3 text-center text-sm leading-relaxed text-slate-600";

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
  descriptionClassName,
}: FeaturedProfessionalCardProps) {
  const initials = initialsFromName(name);
  const descClass = descriptionClassName ?? defaultDescriptionClass;

  return (
    <Card className="group relative overflow-hidden border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 hover:border-primary/35 hover:shadow-[0_16px_48px_rgba(17,82,212,0.12)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
        style={{
          background:
            "radial-gradient(900px circle at 100% 0%, rgba(17,82,212,0.09), transparent 45%), radial-gradient(700px circle at 0% 100%, rgba(17,82,212,0.06), transparent 40%)",
        }}
      />
      <div className="relative p-6 md:p-7">
        <div className="absolute left-4 top-4 z-10">
          <Badge
            variant="secondary"
            className="bg-slate-900/5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 backdrop-blur-sm"
          >
            פרסום
          </Badge>
        </div>

        <div className="mb-5 flex flex-col items-center text-center">
          {imageUrl ? (
            <div className="relative mb-4">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/40 via-primary/15 to-transparent opacity-80 blur-sm" />
              <img
                src={imageUrl}
                alt={name}
                className="relative h-24 w-24 rounded-full border-2 border-white object-cover shadow-md ring-2 ring-primary/15"
              />
            </div>
          ) : (
            <div
              className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#0d2447] text-xl font-black text-white shadow-lg ring-4 ring-primary/10"
              aria-hidden
            >
              {initials}
            </div>
          )}
          <h3 className="text-lg font-bold text-[#111318] md:text-xl">{name}</h3>
          {headline && (
            <p className="mt-1.5 text-sm font-medium text-primary">{headline}</p>
          )}
          {city && (
            <p className="mt-1 text-xs text-slate-500">{city}</p>
          )}
        </div>

        {description && (
          <p className={cn(descClass)}>{description}</p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {phone && (
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-primary/25 font-semibold" asChild>
              <a href={`tel:${phone.replace(/\s/g, "")}`}>
                <Phone className="h-3.5 w-3.5" />
                התקשרו
              </a>
            </Button>
          )}
          {email && (
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-primary/25 font-semibold" asChild>
              <a href={`mailto:${email}`}>
                <Mail className="h-3.5 w-3.5" />
                אימייל
              </a>
            </Button>
          )}
          {whatsapp && (
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-primary/25 font-semibold" asChild>
              <a href={buildWhatsappHref(whatsapp)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-3.5 w-3.5" />
                וואטסאפ
              </a>
            </Button>
          )}
          {websiteUrl && (
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-primary/25 font-semibold" asChild>
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                <Globe className="h-3.5 w-3.5" />
                אתר
              </a>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
