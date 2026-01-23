import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, MapPin, Calendar, Clock, FileText, ChevronLeft, ChevronRight, Building, ExternalLink, Search, Filter, X } from "lucide-react";
import { useEffect, useState } from "react";
import { plansQueries, type MeirimPlan } from "@/lib/tender-queries";

interface PlanWithDetails extends MeirimPlan {
  daysUntilDeadline?: number | null;
}

export function PlansListings() {
  const [plans, setPlans] = useState<PlanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPlans, setTotalPlans] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 50;

  useEffect(() => {
    loadPlans();
  }, [currentPage]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      let result;
      
      if (searchTerm) {
        result = await plansQueries.searchPlans(searchTerm, currentPage, itemsPerPage);
      } else {
        result = await plansQueries.getPlansPaginated(currentPage, itemsPerPage);
      }
      
      // Transform the data to include calculated fields
      const plansWithDetails = result.data.map(plan => {
        return {
          ...plan,
          daysUntilDeadline: null
        };
      });
      
      setPlans(plansWithDetails);
      setTotalPages(result.totalPages);
      setTotalPlans(result.total);
    } catch (error) {
      console.error('Error loading plans:', error);
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

  const clearFilters = () => {
    setSearchTerm('');
    setCurrentPage(1);
    loadPlans(); // Reload with cleared filters
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadPlans();
  };

  const hasActiveFilters = searchTerm !== '';

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8 animate-fade-in">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">טוען נתונים...</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden bg-gradient-card shadow-soft border-0 animate-pulse">
              <div className="w-full h-40 bg-gray-200/50 flex items-center justify-center">
                <Building className="w-16 h-16 text-gray-400" />
              </div>
              <div className="p-4 space-y-3">
                <div className="h-6 bg-gray-200/50 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200/50 rounded w-1/2"></div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="h-16 bg-gray-200/50 rounded-lg"></div>
                  <div className="h-16 bg-gray-200/50 rounded-lg"></div>
                </div>
                <div className="h-10 bg-gray-200/50 rounded-lg"></div>
                <div className="h-12 bg-gray-200/50 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
              placeholder="חיפוש לפי שם תוכנית, מספר תוכנית, עיר, גוש חלקה..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
              className="h-12 rounded-lg border-[#dbe0e6] dark:border-gray-700 dark:bg-gray-800 focus:ring-primary focus:border-primary text-sm"
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
          <Button 
            onClick={clearFilters} 
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold py-2.5 px-8 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ניקוי
          </Button>
        </div>
      </section>

      {/* Advanced Search Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => window.open('https://mavat.iplan.gov.il/SV3?searchEntity=0&searchType=0&entityType=0&searchMethod=2', '_blank')}
          variant="outline"
          className="gap-2"
        >
          חיפוש מתקדם - מידע תכנוני
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>

      {/* Results Header */}
      {plans && plans.length > 0 && (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-[#617589] dark:text-gray-400 font-medium">
            מציג {plans.length} מתוך {totalPlans} תוכניות שנמצאו
          </p>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">description</span>
          {searchTerm ? (
            <>
              <h3 className="text-xl font-bold mb-2 text-[#111418] dark:text-white">לא נמצאו תוכניות התואמות לחיפוש</h3>
              <p className="text-[#617589] dark:text-gray-400 mb-4">נסה לשנות את מילות החיפוש או לנקות סינונים</p>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" size="sm">
                  <X className="w-4 h-4 mr-2" />
                  נקה חיפוש
                </Button>
              )}
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold mb-2 text-[#111418] dark:text-white">אין תוכניות בנייה</h3>
              <p className="text-[#617589] dark:text-gray-400">נסה שוב מאוחר יותר</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const getStatusBadgeComponent = (status?: string) => {
              if (!status) return null;
              
              const statusLower = status.toLowerCase();
              if (statusLower.includes('מאושר') || statusLower.includes('אושר')) {
                return (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    מאושר
                  </span>
                );
              } else if (statusLower.includes('תכנון') || statusLower.includes('בתהליך')) {
                return (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    בתהליך תכנון
                  </span>
                );
              } else if (statusLower.includes('הפקדה') || statusLower.includes('מופקד')) {
                return (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    בהפקדה
                  </span>
                );
              } else if (statusLower.includes('ביצוע') || statusLower.includes('בביצוע')) {
                return (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    בביצוע
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
              <article 
                key={plan.id || plan.meirim_id} 
                className="bg-white dark:bg-gray-900 border border-[#dbe0e6] dark:border-gray-800 rounded-xl p-6 shadow-sm hover:border-primary/50 transition-colors"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                  <div>
                    <h4 className="text-xl font-bold mb-1">
                      {plan.plan_display_name || plan.plan_name || plan.plan_number || 'ללא שם'}
                    </h4>
                    <p className="text-sm text-[#617589] dark:text-gray-400">
                      {plan.county_name || 'לא צוין'} | {plan.plan_number ? `תוכנית מס' ${plan.plan_number}` : ''} {plan.meirim_id ? `| מזהה מרים: ${plan.meirim_id}` : ''}
                    </p>
                  </div>
                  {getStatusBadgeComponent(plan.status || undefined)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 border-y border-[#f0f2f4] dark:border-gray-800 py-4">
                  {plan.plan_number && (
                    <div>
                      <p className="text-xs text-[#617589] mb-1">מספר תוכנית</p>
                      <p className="text-lg font-bold">{plan.plan_number}</p>
                    </div>
                  )}
                  {plan.plan_character_name && (
                    <div>
                      <p className="text-xs text-[#617589] mb-1">אופי תוכנית</p>
                      <p className="text-lg font-bold">{plan.plan_character_name}</p>
                    </div>
                  )}
                  {plan.entity_subtype_desc && (
                    <div>
                      <p className="text-xs text-[#617589] mb-1">תת סוג</p>
                      <p className="text-lg font-bold text-primary">{plan.entity_subtype_desc}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-[#617589] dark:text-gray-400">
                    {plan.county_name && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[#111418] dark:text-white">עירייה:</span>
                        {plan.county_name}
                      </div>
                    )}
                    {plan.plan_number && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[#111418] dark:text-white">מספר תוכנית:</span>
                        {plan.plan_number}
                      </div>
                    )}
                    {plan.meirim_id && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[#111418] dark:text-white">מזהה מרים:</span>
                        {plan.meirim_id}
                      </div>
                    )}
                    {plan.goals_from_mavat && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[#111418] dark:text-white">יעדים:</span>
                        <span className="line-clamp-1">{plan.goals_from_mavat}</span>
                      </div>
                    )}
                  </div>
                  {(plan.plan_url || plan.plan_new_mavat_url) && (
                    <a 
                      href={plan.plan_url || plan.plan_new_mavat_url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary font-bold text-sm flex items-center gap-1 hover:underline"
                      onClick={(e) => {
                        if (!plan.plan_url && !plan.plan_new_mavat_url) {
                          e.preventDefault();
                        }
                      }}
                    >
                      צפייה בתוכנית המלאה
                      <span className="material-symbols-outlined text-sm rotate-180">arrow_forward</span>
                    </a>
                  )}
                </div>
              </article>
            );
          })}
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
