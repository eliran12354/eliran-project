import { Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { portfolioSourceId } from "@/lib/api/portfolioApi";
import { LoginDialog } from "@/components/LoginDialog";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";
const ITEMS_PER_PAGE = 20;
const ITEM_TYPE_LOTTERY = "housing_lottery";
const ITEM_TYPE_TENDER = "tender_result";

interface LotteryRecord {
  _id?: number;
  ProjectName?: string;
  LamasName?: string;
  Neighborhood?: string;
  LotteryStatusValue?: string;
  LotteryExecutionDate?: string;
  LotteryEndSignupDate?: string;
  LotteryHousingUnits?: number;
  PriceForMeter?: string;
  MarketingMethodDesc?: string;
  [key: string]: unknown;
}

interface TenderRecord {
  _id?: number;
  TenderNumber?: number;
  TenderYear?: number;
  TenderDescription?: string;
  LamasName?: string;
  AtarName?: string;
  PublishDate?: string;
  DecisionDate?: string;
  ProposalsNumber?: number;
  OMDAN?: number;
  [key: string]: unknown;
}

export default function PortfolioPage() {
  const { user } = useAuth();
  const { items: savedItems, isSaved, toggle, remove, loading: portfolioLoading } = usePortfolio();
  const { toast } = useToast();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [savingLotteryId, setSavingLotteryId] = useState<string | null>(null);
  const [savingTenderId, setSavingTenderId] = useState<string | null>(null);

  const [lotteryData, setLotteryData] = useState<LotteryRecord[]>([]);
  const [lotteryTotal, setLotteryTotal] = useState(0);
  const [lotteryLoading, setLotteryLoading] = useState(true);
  const [lotteryPage, setLotteryPage] = useState(1);
  const [lotteryCityFilter, setLotteryCityFilter] = useState("");
  const [lotteryCityApplied, setLotteryCityApplied] = useState("");

  const [tenderData, setTenderData] = useState<TenderRecord[]>([]);
  const [tenderTotal, setTenderTotal] = useState(0);
  const [tenderLoading, setTenderLoading] = useState(true);
  const [tenderPage, setTenderPage] = useState(1);
  const [tenderCityFilter, setTenderCityFilter] = useState("");
  const [tenderCityApplied, setTenderCityApplied] = useState("");

  const fetchLottery = useCallback(() => {
    setLotteryLoading(true);
    const offset = (lotteryPage - 1) * ITEMS_PER_PAGE;
    const params = new URLSearchParams({
      limit: String(ITEMS_PER_PAGE),
      offset: String(offset),
    });
    if (lotteryCityApplied.trim()) params.set("q", lotteryCityApplied.trim());
    fetch(`${API_URL}/api/datagov/housing-lottery?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setLotteryData(data.data);
          setLotteryTotal(data.total ?? data.data.length);
        }
        setLotteryLoading(false);
      })
      .catch(() => setLotteryLoading(false));
  }, [lotteryPage, lotteryCityApplied]);

  const fetchTender = useCallback(() => {
    setTenderLoading(true);
    const offset = (tenderPage - 1) * ITEMS_PER_PAGE;
    const params = new URLSearchParams({
      limit: String(ITEMS_PER_PAGE),
      offset: String(offset),
    });
    if (tenderCityApplied.trim()) params.set("q", tenderCityApplied.trim());
    fetch(`${API_URL}/api/datagov/tender-results?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setTenderData(data.data);
          setTenderTotal(data.total ?? data.data.length);
        }
        setTenderLoading(false);
      })
      .catch(() => setTenderLoading(false));
  }, [tenderPage, tenderCityApplied]);

  useEffect(() => {
    fetchLottery();
  }, [fetchLottery]);

  useEffect(() => {
    fetchTender();
  }, [fetchTender]);

  const lotteryTotalPages = Math.max(1, Math.ceil(lotteryTotal / ITEMS_PER_PAGE));
  const tenderTotalPages = Math.max(1, Math.ceil(tenderTotal / ITEMS_PER_PAGE));

  const handleLotteryPageChange = (page: number) => {
    if (page >= 1 && page <= lotteryTotalPages) {
      setLotteryPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleTenderPageChange = (page: number) => {
    if (page >= 1 && page <= tenderTotalPages) {
      setTenderPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const applyLotteryFilter = () => {
    setLotteryCityApplied(lotteryCityFilter.trim());
    setLotteryPage(1);
  };

  const clearLotteryFilter = () => {
    setLotteryCityFilter("");
    setLotteryCityApplied("");
    setLotteryPage(1);
  };

  const applyTenderFilter = () => {
    setTenderCityApplied(tenderCityFilter.trim());
    setTenderPage(1);
  };

  const clearTenderFilter = () => {
    setTenderCityFilter("");
    setTenderCityApplied("");
    setTenderPage(1);
  };

  const paginationButtons = (
    currentPage: number,
    totalPages: number,
    onPageChange: (p: number) => void
  ) => {
    const buttons: React.ReactNode[] = [];
    const show = Math.min(5, totalPages);
    for (let i = 0; i < show; i++) {
      let pageNum: number;
      if (totalPages <= 5) pageNum = i + 1;
      else if (currentPage <= 3) pageNum = i + 1;
      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
      else pageNum = currentPage - 2 + i;
      buttons.push(
        <button
          key={pageNum}
          onClick={() => onPageChange(pageNum)}
          className={`w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
            currentPage === pageNum ? "bg-primary text-white font-bold border-primary" : ""
          }`}
        >
          {pageNum}
        </button>
      );
    }
    return buttons;
  };

  const getLotteryStatusBadge = (status?: string) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s.includes("תוצאות") || s.includes("פורסמו")) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          {status}
        </span>
      );
    }
    if (s.includes("הגרלה") || s.includes("תהליכ")) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
        {status}
      </span>
    );
  };

  return (
    <div className="w-full" dir="rtl">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-6">
          <Link
            className="text-[#617589] dark:text-gray-400 text-sm font-medium hover:text-primary transition-colors"
            to="/"
          >
            דף הבית
          </Link>
          <span className="material-symbols-outlined text-sm text-[#617589]">chevron_left</span>
          <Link
            className="text-[#617589] dark:text-gray-400 text-sm font-medium hover:text-primary transition-colors"
            to="/settings"
          >
            הגדרות
          </Link>
          <span className="material-symbols-outlined text-sm text-[#617589]">chevron_left</span>
          <span className="text-[#111418] dark:text-white text-sm font-semibold">תיק המשקיע</span>
        </nav>

        {/* Headline */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <span className="material-symbols-outlined text-3xl">work</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-display">תיק המשקיע</h1>
        </div>
        <p className="text-[#617589] dark:text-gray-400 font-medium mb-8">
          מעקב הגרלות דירה בהנחה ותוצאות מכרזי פיתוח ותשתית
        </p>

        {/* הפריטים שלי */}
        <section className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-6 shadow-sm mb-8">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">bookmark</span>
            הפריטים שלי
          </h3>
          {!user ? (
            <p className="text-[#617589] dark:text-gray-400 text-sm py-4">
              <Button variant="link" className="p-0 h-auto text-primary" asChild>
                <Link to="/settings">התחבר</Link>
              </Button>
              {" "}כדי לשמור פריטים לתיק ולצפות בהם כאן.
            </p>
          ) : portfolioLoading ? (
            <p className="text-[#617589] dark:text-gray-400 text-sm py-4">טוען...</p>
          ) : savedItems.length === 0 ? (
            <p className="text-[#617589] dark:text-gray-400 text-sm py-4">
              עדיין לא שמרת פריטים. שמור מעמוד{" "}
              <Link to="/urban-renewal" className="text-primary font-medium hover:underline">
                מתחמי התחדשות עירונית
              </Link>
              {" "}או מהרשימות למטה.
            </p>
          ) : (
            <div className="space-y-3">
              {savedItems.map((item) => {
                const sn = (item.snapshot || {}) as Record<string, unknown>;
                const title = (sn.title as string) ?? item.source_id;
                const typeLabel =
                  item.item_type === "urban_renewal"
                    ? "התחדשות עירונית"
                    : item.item_type === "housing_lottery"
                      ? "הגרלת דירה בהנחה"
                      : "תוצאות מכרז";
                const city =
                  item.item_type === "urban_renewal"
                    ? (sn.yeshuv as string) || (sn.Yeshuv as string)
                    : (sn.LamasName as string);
                const subLine =
                  item.item_type === "urban_renewal"
                    ? [sn.status].filter(Boolean).join(" · ") || typeLabel
                    : item.item_type === "housing_lottery"
                      ? [sn.Neighborhood, sn.LotteryStatusValue].filter(Boolean).join(" · ") || typeLabel
                      : [sn.AtarName, sn.TenderDescription].filter(Boolean).join(" · ") || typeLabel;
                const planLink = (sn.kishur_latar as string) || (sn.KishurLatar as string) || "";
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-2 border-b border-[#f0f2f4] dark:border-gray-800 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#111418] dark:text-white">{title}</p>
                      <p className="text-xs text-[#617589] dark:text-gray-400 mt-0.5">{typeLabel}</p>
                      {city && (
                        <p className="text-sm text-[#617589] dark:text-gray-400 mt-1">
                          עיר: {city}
                        </p>
                      )}
                      {subLine && (
                        <p className="text-sm text-[#617589] dark:text-gray-400 mt-0.5 truncate" title={String(subLine)}>
                          {subLine}
                        </p>
                      )}
                      {planLink && (
                        <a
                          href={planLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-sm font-medium hover:underline mt-1 inline-flex items-center gap-1"
                        >
                          קישור לתוכנית
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const ok = await remove(item.item_type, item.source_id);
                        toast(ok ? { title: "הוסר מתיק" } : { title: "שגיאה", variant: "destructive" });
                      }}
                      className="gap-1"
                    >
                      <span className="material-symbols-outlined text-base">bookmark_border</span>
                      הסר מתיק
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* מעקב הגרלות דירה בהנחה */}
        <section className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-6 shadow-sm mb-8">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">confirmation_number</span>
            מעקב הגרלות דירה בהנחה
          </h3>
          {/* סינון לפי עיר - הגרלות */}
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div className="flex flex-col gap-2 min-w-[200px]">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">סינון לפי עיר</label>
              <Input
                placeholder="הזן שם עיר..."
                value={lotteryCityFilter}
                onChange={(e) => setLotteryCityFilter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyLotteryFilter()}
                className="h-12 rounded-lg border-[#dbe0e6] dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <Button
              onClick={applyLotteryFilter}
              className="bg-primary text-white font-bold py-2.5 px-8 rounded-lg hover:bg-blue-700 h-12"
            >
              <span className="material-symbols-outlined text-sm ml-1">search</span>
              חיפוש
            </Button>
            {(lotteryCityFilter || lotteryCityApplied) && (
              <Button
                variant="outline"
                onClick={clearLotteryFilter}
                className="border border-gray-300 dark:border-gray-600 h-12 rounded-lg"
              >
                ניקוי
              </Button>
            )}
          </div>
          {lotteryLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          ) : lotteryData.length === 0 ? (
            <div className="rounded-xl p-12 text-center border border-[#dbe0e6] dark:border-gray-800">
              <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">confirmation_number</span>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">לא נמצאו רשומות</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {lotteryCityApplied ? "נסה לשנות את סינון העיר." : "אין נתוני הגרלות זמינים כרגע."}
              </p>
              {lotteryCityApplied && (
                <Button onClick={clearLotteryFilter} variant="outline" className="mt-4">
                  נקה סינון
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="text-[#617589] dark:text-gray-400 font-medium mb-6">
                מציג {(lotteryPage - 1) * ITEMS_PER_PAGE + 1}–{(lotteryPage - 1) * ITEMS_PER_PAGE + lotteryData.length} מתוך {lotteryTotal} רשומות
              </p>
              <div className="space-y-4">
                {lotteryData.map((r) => (
                  <article
                    key={r._id ?? (r as any).LotteryId}
                    className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-6 shadow-sm hover:border-primary/50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                      <div>
                        <h4 className="text-xl font-bold mb-1">
                          {r.ProjectName ?? "—"}
                        </h4>
                        <p className="text-sm text-[#617589] dark:text-gray-400">
                          {r.LamasName ?? "—"} {r.Neighborhood ? `| ${r.Neighborhood}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getLotteryStatusBadge(r.LotteryStatusValue)}
                        {(() => {
                          const sid = portfolioSourceId(ITEM_TYPE_LOTTERY, (r as any).LotteryId ?? r._id);
                          const saved = isSaved(ITEM_TYPE_LOTTERY, sid);
                          const busy = savingLotteryId === String((r as any).LotteryId ?? r._id);
                          const onSave = async () => {
                            if (!user) {
                              setLoginDialogOpen(true);
                              toast({ title: "התחבר כדי לשמור לתיק" });
                              return;
                            }
                            setSavingLotteryId(String((r as any).LotteryId ?? r._id));
                            let fullData: Record<string, unknown>;
                            try {
                              fullData = JSON.parse(JSON.stringify(r));
                            } catch {
                              fullData = { ...r };
                            }
                            const snapshot = {
                              title: r.ProjectName ?? (r as any).ProjectName,
                              ...fullData,
                            };
                            const ok = await toggle(ITEM_TYPE_LOTTERY, sid, snapshot);
                            setSavingLotteryId(null);
                            toast(ok ? { title: saved ? "הוסר מתיק" : "נוסף לתיק" } : { title: "שגיאה", variant: "destructive" });
                          };
                          return (
                            <Button variant="outline" size="sm" onClick={onSave} disabled={busy || portfolioLoading} className="gap-1">
                              <span className="material-symbols-outlined text-base">{saved ? "bookmark" : "bookmark_border"}</span>
                              {saved ? "הסר מתיק" : "שמור לתיק"}
                            </Button>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-[#f0f2f4] dark:border-gray-800 pt-4">
                      <div>
                        <p className="text-xs text-[#617589] mb-1">יחידות בהגרלה</p>
                        <p className="text-lg font-bold">{r.LotteryHousingUnits ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#617589] mb-1">מחיר למ״ר</p>
                        <p className="text-lg font-bold">{r.PriceForMeter ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#617589] mb-1">מסלול</p>
                        <p className="text-lg font-bold">{r.MarketingMethodDesc ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-[#617589] dark:text-gray-400 mt-4">
                      {r.LotteryEndSignupDate && (
                        <span><strong className="text-[#111418] dark:text-white">תאריך סיום הרשמה:</strong> {r.LotteryEndSignupDate}</span>
                      )}
                      {r.LotteryExecutionDate && (
                        <span><strong className="text-[#111418] dark:text-white">תאריך הגרלה:</strong> {r.LotteryExecutionDate}</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {/* עימוד - הגרלות */}
              {lotteryTotalPages > 1 && (
                <div className="mt-12 flex justify-center items-center gap-2">
                  <button
                    onClick={() => handleLotteryPageChange(lotteryPage - 1)}
                    disabled={lotteryPage === 1}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                  {paginationButtons(lotteryPage, lotteryTotalPages, handleLotteryPageChange)}
                  {lotteryTotalPages > 5 && lotteryPage < lotteryTotalPages - 2 && <span className="mx-2">...</span>}
                  {lotteryTotalPages > 5 && (
                    <button
                      onClick={() => handleLotteryPageChange(lotteryTotalPages)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-bold transition-colors ${
                        lotteryPage === lotteryTotalPages ? "bg-primary text-white border-primary" : ""
                      }`}
                    >
                      {lotteryTotalPages}
                    </button>
                  )}
                  <button
                    onClick={() => handleLotteryPageChange(lotteryPage + 1)}
                    disabled={lotteryPage === lotteryTotalPages}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* תוצאות מכרזי פיתוח ותשתית */}
        <section className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">gavel</span>
            תוצאות מכרזי פיתוח ותשתית
          </h3>
          {/* סינון לפי עיר - מכרזים */}
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div className="flex flex-col gap-2 min-w-[200px]">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">סינון לפי עיר</label>
              <Input
                placeholder="הזן שם עיר..."
                value={tenderCityFilter}
                onChange={(e) => setTenderCityFilter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyTenderFilter()}
                className="h-12 rounded-lg border-[#dbe0e6] dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <Button
              onClick={applyTenderFilter}
              className="bg-primary text-white font-bold py-2.5 px-8 rounded-lg hover:bg-blue-700 h-12"
            >
              <span className="material-symbols-outlined text-sm ml-1">search</span>
              חיפוש
            </Button>
            {(tenderCityFilter || tenderCityApplied) && (
              <Button
                variant="outline"
                onClick={clearTenderFilter}
                className="border border-gray-300 dark:border-gray-600 h-12 rounded-lg"
              >
                ניקוי
              </Button>
            )}
          </div>
          {tenderLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          ) : tenderData.length === 0 ? (
            <div className="rounded-xl p-12 text-center border border-[#dbe0e6] dark:border-gray-800">
              <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">gavel</span>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">לא נמצאו רשומות</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {tenderCityApplied ? "נסה לשנות את סינון העיר." : "אין נתוני מכרזים זמינים כרגע."}
              </p>
              {tenderCityApplied && (
                <Button onClick={clearTenderFilter} variant="outline" className="mt-4">
                  נקה סינון
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="text-[#617589] dark:text-gray-400 font-medium mb-6">
                מציג {(tenderPage - 1) * ITEMS_PER_PAGE + 1}–{(tenderPage - 1) * ITEMS_PER_PAGE + tenderData.length} מתוך {tenderTotal} רשומות
              </p>
              <div className="space-y-4">
                {tenderData.map((r) => (
                  <article
                    key={r._id ?? `${r.TenderNumber}-${r.TenderYear}`}
                    className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-6 shadow-sm hover:border-primary/50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                      <div>
                        <h4 className="text-xl font-bold mb-1">
                          מכרז {r.TenderNumber ?? "—"} ({r.TenderYear ?? "—"})
                        </h4>
                        <p className="text-sm text-[#617589] dark:text-gray-400">
                          {String(r.LamasName ?? "—").trim()} {r.AtarName ? `| ${String(r.AtarName).trim()}` : ""}
                        </p>
                      </div>
                      {(() => {
                        const sid = portfolioSourceId(ITEM_TYPE_TENDER, r.TenderNumber, r.TenderYear);
                        const saved = isSaved(ITEM_TYPE_TENDER, sid);
                        const busy = savingTenderId === `${r.TenderNumber}-${r.TenderYear}`;
                        const onSave = async () => {
                          if (!user) {
                            setLoginDialogOpen(true);
                            toast({ title: "התחבר כדי לשמור לתיק" });
                            return;
                          }
                          setSavingTenderId(`${r.TenderNumber}-${r.TenderYear}`);
                          let fullData: Record<string, unknown>;
                          try {
                            fullData = JSON.parse(JSON.stringify(r));
                          } catch {
                            fullData = { ...r };
                          }
                          const snapshot = {
                            title: `מכרז ${r.TenderNumber} (${r.TenderYear})`,
                            ...fullData,
                          };
                          const ok = await toggle(ITEM_TYPE_TENDER, sid, snapshot);
                          setSavingTenderId(null);
                          toast(ok ? { title: saved ? "הוסר מתיק" : "נוסף לתיק" } : { title: "שגיאה", variant: "destructive" });
                        };
                        return (
                          <Button variant="outline" size="sm" onClick={onSave} disabled={busy || portfolioLoading} className="gap-1">
                            <span className="material-symbols-outlined text-base">{saved ? "bookmark" : "bookmark_border"}</span>
                            {saved ? "הסר מתיק" : "שמור לתיק"}
                          </Button>
                        );
                      })()}
                    </div>
                    {r.TenderDescription && (
                      <p className="text-sm text-[#111418] dark:text-gray-300 mb-4">
                        {r.TenderDescription}
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-[#f0f2f4] dark:border-gray-800 pt-4">
                      <div>
                        <p className="text-xs text-[#617589] mb-1">תאריך פרסום</p>
                        <p className="text-lg font-bold">{r.PublishDate ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#617589] mb-1">תאריך החלטה</p>
                        <p className="text-lg font-bold">{r.DecisionDate ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#617589] mb-1">מספר הצעות</p>
                        <p className="text-lg font-bold">{r.ProposalsNumber ?? "—"}</p>
                      </div>
                    </div>
                    {r.OMDAN != null && (
                      <p className="text-xs text-[#617589] dark:text-gray-400 mt-4">
                        <strong className="text-[#111418] dark:text-white">ערך:</strong> {Number(r.OMDAN).toLocaleString("he-IL")} ₪
                      </p>
                    )}
                  </article>
                ))}
              </div>
              {/* עימוד - מכרזים */}
              {tenderTotalPages > 1 && (
                <div className="mt-12 flex justify-center items-center gap-2">
                  <button
                    onClick={() => handleTenderPageChange(tenderPage - 1)}
                    disabled={tenderPage === 1}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                  {paginationButtons(tenderPage, tenderTotalPages, handleTenderPageChange)}
                  {tenderTotalPages > 5 && tenderPage < tenderTotalPages - 2 && <span className="mx-2">...</span>}
                  {tenderTotalPages > 5 && (
                    <button
                      onClick={() => handleTenderPageChange(tenderTotalPages)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-bold transition-colors ${
                        tenderPage === tenderTotalPages ? "bg-primary text-white border-primary" : ""
                      }`}
                    >
                      {tenderTotalPages}
                    </button>
                  )}
                  <button
                    onClick={() => handleTenderPageChange(tenderPage + 1)}
                    disabled={tenderPage === tenderTotalPages}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </div>
  );
}
