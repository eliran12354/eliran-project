import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FeaturedProfessionalCard } from "@/components/FeaturedProfessionalCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFeaturedProfessionalsPublic } from "@/lib/api/featuredProfessionalsApi";

const sectionFullBleedStyle = {
  marginLeft: "calc(50% - 50vw)",
  marginRight: "calc(50% - 50vw)",
  width: "100vw",
} as const;

function ShowcaseSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="overflow-hidden border-slate-200/90 p-6">
          <div className="flex flex-col items-center">
            <Skeleton className="mb-4 h-24 w-24 rounded-full" />
            <Skeleton className="mb-2 h-6 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="mt-5 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="mx-auto h-3 w-[75%]" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function FeaturedProfessionalsShowcase() {
  const { data, isPending, isError } = useQuery({
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

  if (isError) {
    return null;
  }

  if (isPending) {
    return (
      <section
        className="relative overflow-hidden bg-gradient-to-b from-white via-[#f8fafc] to-[#F5F7FA] py-24 md:py-28"
        style={sectionFullBleedStyle}
        dir="rtl"
        aria-busy="true"
        aria-label="טוען בעלי מקצוע מומלצים"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.35]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 20%, rgba(17,82,212,0.07), transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(13,36,71,0.06), transparent 45%)`,
            }}
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <Skeleton className="mx-auto mb-3 h-10 w-64 max-w-full rounded-lg" />
            <Skeleton className="mx-auto h-5 w-96 max-w-full rounded-md" />
          </div>
          <ShowcaseSkeleton />
        </div>
      </section>
    );
  }

  if (!data?.length) {
    return null;
  }

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-white via-[#f8fafc] to-[#F5F7FA] py-24 md:py-28"
      style={sectionFullBleedStyle}
      dir="rtl"
      aria-labelledby="featured-professionals-heading"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.4]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 15% 25%, rgba(17,82,212,0.08), transparent 52%),
              radial-gradient(circle at 85% 70%, rgba(13,36,71,0.07), transparent 48%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V4h4V2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V4h4V2H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <header className="mb-14 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary/80">שותפים מקצועיים</p>
          <h2
            id="featured-professionals-heading"
            className="font-display text-3xl font-black tracking-tight text-[#111318] md:text-4xl lg:text-5xl"
          >
            בעלי מקצוע מומלצים
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
            אנשי מקצוע שנבחרו לשירותכם — יצירת קשר ישירה מהאתר.
          </p>
        </header>

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
            />
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button variant="outline" className="h-12 gap-2 rounded-xl border-primary/30 px-8 font-semibold text-primary shadow-sm hover:bg-primary/5" asChild>
            <Link to="/professionals">
              <span>לרשימה המלאה</span>
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
