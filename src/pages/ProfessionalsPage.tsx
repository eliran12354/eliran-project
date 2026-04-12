import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FeaturedProfessionalCard } from "@/components/FeaturedProfessionalCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFeaturedProfessionalsPublic } from "@/lib/api/featuredProfessionalsApi";
import { Briefcase } from "lucide-react";

const SUBTLE_NOISE_BG = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V4h4V2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V4h4V2H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

const fullPageDescriptionClass =
  "mb-5 text-center text-sm leading-relaxed text-slate-600 whitespace-pre-wrap break-words";

function PageSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="overflow-hidden border-slate-200/90 p-6">
          <div className="flex flex-col items-center">
            <Skeleton className="mb-4 h-24 w-24 rounded-full" />
            <Skeleton className="mb-2 h-6 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="mt-5 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="mx-auto h-3 w-[80%]" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function ProfessionalsPage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["featured-professionals-public"],
    queryFn: async () => {
      const res = await fetchFeaturedProfessionalsPublic();
      if (res.success === false) {
        throw new Error(res.error);
      }
      return res.professionals;
    },
    staleTime: 60_000,
  });

  return (
    <div
      className="relative w-full min-h-screen bg-[#F5F7FA] overflow-hidden pb-16"
      dir="rtl"
    >
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{ backgroundImage: SUBTLE_NOISE_BG }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6 py-8">
        <nav className="mb-6 flex items-center gap-2" aria-label="מיקום בעמוד">
          <Link
            className="text-sm font-medium text-[#617589] transition-colors hover:text-primary dark:text-gray-400"
            to="/"
          >
            דף הבית
          </Link>
          <span className="material-symbols-outlined text-sm text-[#617589]">chevron_left</span>
          <span className="text-sm font-semibold text-[#111418] dark:text-white">
            בעלי מקצוע מומלצים
          </span>
        </nav>

        <header className="mb-10">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Briefcase className="h-8 w-8" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#111318]">
              בעלי מקצוע מומלצים
            </h1>
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
            רשימה מלאה של אנשי מקצוע ושותפים — יצירת קשר ישירה בטלפון, במייל, בוואטסאפ או באתר.
            התוכן מנוהל על ידי צוות האתר.
          </p>
        </header>

        {isPending && <PageSkeleton />}

        {isError && (
          <Card className="border-destructive/30 bg-destructive/5 p-8 text-center">
            <p className="text-destructive font-medium">
              {error instanceof Error ? error.message : "לא ניתן לטעון את הרשימה כעת"}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              נסו שוב
            </Button>
          </Card>
        )}

        {!isPending && !isError && data?.length === 0 && (
          <Card className="border-dashed bg-white/80 p-12 text-center shadow-sm">
            <p className="text-slate-600">
              אין בעלי מקצוע מומלצים להצגה כרגע. חזרו לעמוד הבית או נסו שוב מאוחר יותר.
            </p>
            <Button className="mt-6" asChild>
              <Link to="/">חזרה לדף הבית</Link>
            </Button>
          </Card>
        )}

        {!isPending && !isError && data && data.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => (
              <FeaturedProfessionalCard
                key={p.id}
                name={p.name}
                headline={p.headline}
                description={p.description}
                city={p.city}
                phone={p.phone}
                email={p.email}
                websiteUrl={p.website_url}
                whatsapp={p.whatsapp}
                imageUrl={p.image_url}
                descriptionClassName={fullPageDescriptionClass}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
