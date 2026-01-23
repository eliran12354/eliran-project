import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, MapPin, Calendar, Clock, FileText, ChevronLeft, ChevronRight, Search, X, Filter, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { tenderQueries, type MichrazActive } from "@/lib/tender-queries";

interface TenderWithDetails extends MichrazActive {
  title?: string;
  status?: string;
  area?: string;
  publication_date?: string;
  deadline_date?: string;
  daysUntilDeadline?: number;
}

export function TenderListings() {
  const [tenders, setTenders] = useState<TenderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTenders, setTotalTenders] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const itemsPerPage = 60;

  useEffect(() => {
    loadTenders();
  }, [currentPage, activeSearchQuery]);

  const loadTenders = async () => {
    try {
      setLoading(true);
      
      // Use search if there's a query, otherwise use regular pagination
      const result = activeSearchQuery.trim() 
        ? await tenderQueries.searchActiveTenders(activeSearchQuery, currentPage, itemsPerPage)
        : await tenderQueries.getActivePaginated(currentPage, itemsPerPage);
      
      // Transform the data to include calculated fields from raw JSONB
      const tendersWithDetails = result.data.map(tender => {
        const raw = tender.raw;
        const deadlineDate = raw.SgiraDate ? new Date(raw.SgiraDate) : null;
        const now = new Date();
        const daysUntilDeadline = deadlineDate ? 
          Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 
          null;
        
        return {
          ...tender,
          title: raw.MichrazName || 'ללא כותרת',
          status: raw.StatusMichraz || 'לא ידוע',
          area: raw.Shchuna || 'לא צוין',
          publication_date: raw.PirsumDate,
          deadline_date: raw.SgiraDate,
          daysUntilDeadline: daysUntilDeadline
        };
      });
      
      setTenders(tendersWithDetails);
      setTotalPages(result.totalPages);
      setTotalTenders(result.total);
    } catch (error) {
      console.error('Error loading tenders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, daysUntilDeadline: number | null) => {
    if (daysUntilDeadline === null) return { text: 'ללא תאריך', variant: 'secondary' as const };
    if (daysUntilDeadline < 0) return { text: 'פג תוקף', variant: 'destructive' as const };
    if (daysUntilDeadline <= 3) return { text: 'דחוף', variant: 'destructive' as const };
    if (daysUntilDeadline <= 7) return { text: 'פג בקרוב', variant: 'secondary' as const };
    return { text: 'פעיל', variant: 'default' as const };
  };

  const getPriorityScore = (daysUntilDeadline: number | null, status: string) => {
    if (daysUntilDeadline === null) return 50;
    if (daysUntilDeadline < 0) return 0;
    if (daysUntilDeadline <= 3) return 95;
    if (daysUntilDeadline <= 7) return 85;
    if (daysUntilDeadline <= 30) return 75;
    return 60;
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousPage = () => {
    handlePageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    handlePageChange(currentPage + 1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearch = () => {
    setActiveSearchQuery(searchQuery);
    setCurrentPage(1); // Reset to first page when searching
  };

  const clearSearch = () => {
    setSearchQuery('');
    setActiveSearchQuery('');
    setCurrentPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const getSourceUrl = (tender: TenderWithDetails): string | null => {
    // Always build URL from MichrazID, ignore source_endpoint
    if (tender.raw?.MichrazID) {
      return `https://apps.land.gov.il/MichrazimSite/#/michraz/${tender.raw.MichrazID}`;
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8 animate-fade-in">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <ArrowRight className="w-6 h-6 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold">מכרזי רמ&quot;י</h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              טוען מכרזים פעילים ממערכת רמ&quot;י
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="overflow-hidden bg-gradient-card shadow-soft border-0 animate-pulse">
              <div className="h-40 bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Search & Filter Area */}
      <section className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">filter_list</span>
          חיפוש וסינון
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">חיפוש חופשי</label>
            <Input
              type="text"
              placeholder="חפש לפי עיר, מספר מכרז או מאפיין אחר..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="h-12 rounded-lg border-[#dbe0e6] dark:border-gray-700 dark:bg-gray-800 focus:ring-primary focus:border-primary text-sm"
              dir="rtl"
            />
          </div>
        </div>
        <div className="flex justify-start gap-4 mt-8">
          <Button 
            onClick={handleSearch} 
            className="bg-primary text-white font-bold py-2.5 px-8 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">search</span>
            חיפוש
          </Button>
          {(searchQuery || activeSearchQuery) && (
            <Button 
              onClick={clearSearch} 
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold py-2.5 px-8 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              ניקוי
            </Button>
          )}
        </div>
      </section>

      {/* Results Header */}
      {tenders && tenders.length > 0 && (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-[#617589] dark:text-gray-400 font-medium">
            מציג {tenders.length} מתוך {totalTenders} מכרזים שנמצאו
          </p>
        </div>
      )}

      {/* Results List */}
      {tenders && tenders.length > 0 ? (
        <div className="space-y-4">
          {tenders.map((tender) => {
            const getStatusBadgeComponent = (status?: string, daysUntilDeadline?: number | null) => {
              if (daysUntilDeadline === null || daysUntilDeadline === undefined) {
                return (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                    ללא תאריך
                  </span>
                );
              }
              if (daysUntilDeadline < 0) {
                return (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    פג תוקף
                  </span>
                );
              }
              if (daysUntilDeadline <= 3) {
                return (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    דחוף
                  </span>
                );
              }
              if (daysUntilDeadline <= 7) {
                return (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    פג בקרוב
                  </span>
                );
              }
              return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  פעיל
                </span>
              );
            };

            const formatDate = (date: string) => {
              if (!date) return '';
              try {
                const d = new Date(date);
                if (isNaN(d.getTime())) return date;
                return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
              } catch {
                return date;
              }
            };
            
            return (
              <article key={tender.michraz_id} className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-6 shadow-sm hover:border-primary/50 transition-colors">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6" dir="rtl">
                  <div>
                    <h4 className="text-xl font-bold mb-1">
                      {tender.title || tender.raw?.MichrazName || 'ללא כותרת'}
                    </h4>
                    <p className="text-sm text-[#617589] dark:text-gray-400">
                      {tender.area || tender.raw?.Shchuna || 'לא צוין'} | {tender.raw?.MichrazID || tender.michraz_id ? `מכרז מס' ${tender.raw?.MichrazID || tender.michraz_id}` : ''}
                    </p>
                  </div>
                  {getStatusBadgeComponent(tender.status, tender.daysUntilDeadline)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 border-y border-[#f0f2f4] dark:border-gray-800 py-4">
                  {tender.raw?.PirsumDate && (
                    <div>
                      <p className="text-xs text-[#617589] mb-1">תאריך פרסום</p>
                      <p className="text-lg font-bold">{formatDate(tender.raw.PirsumDate)}</p>
                    </div>
                  )}
                  {tender.raw?.SgiraDate && (
                    <div>
                      <p className="text-xs text-[#617589] mb-1">תאריך סגירה</p>
                      <p className="text-lg font-bold">{formatDate(tender.raw.SgiraDate)}</p>
                    </div>
                  )}
                  {tender.daysUntilDeadline !== null && tender.daysUntilDeadline !== undefined && (
                    <div>
                      <p className="text-xs text-[#617589] mb-1">ימים נותרים</p>
                      <p className="text-lg font-bold text-primary">
                        {tender.daysUntilDeadline > 0 ? `${tender.daysUntilDeadline} ימים` : 'פג תוקף'}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center justify-between gap-4" dir="rtl">
                  <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-[#617589] dark:text-gray-400">
                    {tender.raw?.StatusMichraz && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[#111418] dark:text-white">סטטוס:</span>
                        {tender.raw.StatusMichraz}
                      </div>
                    )}
                    {tender.raw?.KodSugMichraz && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[#111418] dark:text-white">סוג מכרז:</span>
                        {tender.raw.KodSugMichraz}
                      </div>
                    )}
                    {tender.raw?.YechidotDiur && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[#111418] dark:text-white">יחידות דיור:</span>
                        {tender.raw.YechidotDiur}
                      </div>
                    )}
                    {tender.raw?.KodYeshuv && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[#111418] dark:text-white">קוד ישוב:</span>
                        {tender.raw.KodYeshuv}
                      </div>
                    )}
                  </div>
                  {(() => {
                    const sourceUrl = getSourceUrl(tender);
                    return sourceUrl ? (
                      <a 
                        href={sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary font-bold text-sm flex items-center gap-1 hover:underline"
                      >
                        צפייה במכרז המלא
                        <span className="material-symbols-outlined text-sm rotate-180">arrow_forward</span>
                      </a>
                    ) : null;
                  })()}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">gavel</span>
          {(searchQuery || activeSearchQuery) ? (
            <>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                לא נמצאו מכרזים
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                נסה לשנות את הסינון או החיפוש
              </p>
              <Button 
                onClick={clearSearch} 
                variant="outline"
              >
                נקה סינון
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                אין מכרזים פעילים
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                אין מכרזי רמ"י זמינים כרגע
              </p>
            </>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4 md:gap-0 md:space-x-4 pt-8">
          <Button
            variant="outline"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            עמוד קודם
          </Button>
          
          <div className="flex items-center space-x-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  onClick={() => handlePageChange(pageNum)}
                  className="w-10 h-10"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2"
          >
            עמוד הבא
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
