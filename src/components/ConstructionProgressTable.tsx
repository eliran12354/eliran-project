import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { constructionProgressQueries } from "@/lib/supabase-queries";
import type { ConstructionProgressRecord } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  HardHat,
  MapPin,
  Building2,
  Layers,
  Users,
  Ruler,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2
} from "lucide-react";

const stageFields: Array<{ key: keyof ConstructionProgressRecord; label: string }> = [
  { key: "TAARICH_SHLAV_BNIYA_5", label: "שלב 5" },
  { key: "TAARICH_SHLAV_BNIYA_7", label: "שלב 7" },
  { key: "TAARICH_SHLAV_BNIYA_8", label: "שלב 8" },
  { key: "TAARICH_SHLAV_BNIYA_16", label: "שלב 16" },
  { key: "TAARICH_SHLAV_BNIYA_18", label: "שלב 18" },
  { key: "TAARICH_SHLAV_BNIYA_29", label: "שלב 29" },
  { key: "TAARICH_SHLAV_BNIYA_39", label: "שלב 39" },
  { key: "TAARICH_SHLAV_BNIYA_42", label: "שלב 42" }
];

const formatDate = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);

  if (match) {
    const [, dayStr, monthStr, yearStr] = match;
    const day = Number(dayStr);
    const month = Number(monthStr) - 1;
    const year = yearStr.length === 2 ? Number(`20${yearStr}`) : Number(yearStr);

    const parsedDate = new Date(year, month, day);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleDateString("he-IL");
    }
  }

  return trimmed;
};

const formatNumber = (value?: string) => {
  if (!value) return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value;
  return numeric.toLocaleString("he-IL");
};

export function ConstructionProgressTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  const { data, isLoading, error } = useQuery({
    queryKey: ["construction-progress", currentPage, pageSize],
    queryFn: () => constructionProgressQueries.getPaginated(currentPage, pageSize),
    keepPreviousData: true
  });

  const records = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const cards = useMemo(() => {
    return records.map((record) => {
      const title =
        record.SHEM_MITHAM ||
        record.ATAR ||
        record.MISPAR_MITHAM ||
        "מתחם ללא שם";

      const stageEntries = stageFields
        .map(({ key, label }) => {
          const value = record[key];
          if (!value) return null;
          return {
            label,
            value: formatDate(value)
          };
        })
        .filter(Boolean) as Array<{ label: string; value: string | null }>;

      return {
        record,
        title,
        stageEntries
      };
    });
  }, [records]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-red-500">
          שגיאה בטעינת נתוני ההתקדמות. נסה שוב מאוחר יותר.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2 flex items-center justify-center gap-2">
          <HardHat className="w-7 h-7" />
          התקדמות בנייה
        </h1>
        <p className="text-muted-foreground">
          מוצגות {records.length} רשומות מתוך {total.toLocaleString("he-IL")} סך הכול.
        </p>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            לא נמצאו רשומות להצגה בעמוד זה.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cards.map(({ record, title, stageEntries }) => (
            <Card
              key={record.id}
              className="h-full overflow-hidden rounded-2xl border border-border/50 bg-background/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <CardHeader className="space-y-2 bg-muted/40 pb-4">
                <CardTitle className="text-lg font-semibold leading-tight">
                  {title}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {record.MAHOZ && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {record.MAHOZ}
                    </span>
                  )}
                  {record.YESHUV_LAMAS && (
                    <Badge variant="outline">למ"ס {record.YESHUV_LAMAS}</Badge>
                  )}
                  {record.SHITAT_SHIVUK && (
                    <Badge variant="secondary">{record.SHITAT_SHIVUK}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-5 text-sm text-foreground pt-5">
                <div className="space-y-2">
                  {record.MISPAR_MITHAM && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="w-4 h-4 text-primary/70" />
                      <span>
                        מספר מתחם:{" "}
                        <span className="font-medium text-foreground">
                          {record.MISPAR_MITHAM}
                        </span>
                      </span>
                    </div>
                  )}
                  {record.MIGRASH && (
                    <div className="text-muted-foreground">
                      מגרש:{" "}
                      <span className="font-medium text-foreground">
                        {record.MIGRASH}
                      </span>
                    </div>
                  )}
                  {(record.GUSH || record.HELKA) && (
                    <div className="text-muted-foreground">
                      גוש{" "}
                      <span className="font-medium text-foreground">
                        {record.GUSH || "-"}
                      </span>{" "}
                      • חלקה{" "}
                      <span className="font-medium text-foreground">
                        {record.HELKA || "-"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {record.MISPAR_BINYAN && (
                    <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                      <Layers className="w-4 h-4 text-primary/70" />
                      <span className="text-muted-foreground">
                        בניין:{" "}
                        <span className="font-medium text-foreground">
                          {record.MISPAR_BINYAN}
                        </span>
                      </span>
                    </div>
                  )}
                  {record.KOMOT_BINYAN && (
                    <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                      <HardHat className="w-4 h-4 text-primary/70" />
                      <span className="text-muted-foreground">
                        קומות:{" "}
                        <span className="font-medium text-foreground">
                          {record.KOMOT_BINYAN}
                        </span>
                      </span>
                    </div>
                  )}
                  {record.YEHIDOT_BINYAN && (
                    <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                      <Users className="w-4 h-4 text-primary/70" />
                      <span className="text-muted-foreground">
                        יחידות:{" "}
                        <span className="font-medium text-foreground">
                          {formatNumber(record.YEHIDOT_BINYAN)}
                        </span>
                      </span>
                    </div>
                  )}
                  {record.SHETAH && (
                    <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                      <Ruler className="w-4 h-4 text-primary/70" />
                      <span className="text-muted-foreground">
                        שטח:{" "}
                        <span className="font-medium text-foreground">
                          {formatNumber(record.SHETAH)} מ״ר
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {(record.TAARICH_KOBEA || record.SHNAT_HOZE) && (
                  <div className="space-y-2 rounded-xl bg-muted/30 px-4 py-3">
                    {record.TAARICH_KOBEA && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 text-primary/70" />
                        <span>
                          תאריך קובע:{" "}
                          <span className="font-medium text-foreground">
                            {formatDate(record.TAARICH_KOBEA)}
                          </span>
                        </span>
                      </div>
                    )}
                    {record.SHNAT_HOZE && (
                      <div className="text-muted-foreground">
                        שנת חוזה:{" "}
                        <span className="font-medium text-foreground">
                          {record.SHNAT_HOZE}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {stageEntries.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground tracking-wide">
                      אבני דרך בבנייה
                    </div>
                    <div className="relative pr-6">
                      <div className="absolute inset-y-2 right-2 w-px bg-border" aria-hidden />
                      <div className="flex flex-col gap-4">
                        {stageEntries.map((stage, index) => {
                          const isComplete =
                            Boolean(stage.value && stage.value !== "-");
                          return (
                            <div key={stage.label} className="relative flex gap-3">
                              <div className="flex flex-col items-center">
                                <div
                                  className={cn(
                                    "flex size-6 items-center justify-center rounded-full border-2 bg-background shadow-sm transition-colors",
                                    isComplete
                                      ? "border-primary text-primary"
                                      : "border-border text-muted-foreground"
                                  )}
                                >
                                  {isComplete ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  ) : (
                                    <span className="text-[10px] font-semibold">
                                      {index + 1}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="text-sm font-medium text-foreground">
                                  {stage.label}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {stage.value ?? "אין תאריך"}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-4 pt-4">
        <Button
          variant="outline"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          הקודם
        </Button>
        <span className="text-sm text-muted-foreground">
          עמוד {currentPage} מתוך {totalPages}
        </span>
        <Button
          variant="outline"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-2"
        >
          הבא
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

