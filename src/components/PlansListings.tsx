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
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-bold">תוכניות בנייה</h2>
          </div>
          <div className="text-sm text-muted-foreground">
            טוען...
          </div>
        </div>

        <p className="text-xl text-muted-foreground">
          כל התוכניות הפעילות והרלוונטיות ביותר עבורך
        </p>

        <div className="grid grid-cols-4 gap-4">
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
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold">תוכניות בנייה</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          עמוד {currentPage} מתוך {totalPages} • {totalPlans} תוכניות בסך הכל
        </div>
      </div>

      <p className="text-xl text-muted-foreground">
        כל התוכניות הפעילות והרלוונטיות ביותר עבורך • {itemsPerPage} תוכניות בעמוד
      </p>

      {/* Search and Filters */}
      <Card className="bg-gradient-card shadow-soft border-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">חיפוש וסינון</h3>
          </div>
          
          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="חיפוש לפי שם תוכנית, מספר תוכנית, עיר, גוש חלקה..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-10"
                />
              </div>
              <Button onClick={handleSearch} className="h-10 px-6">
                <Search className="w-4 h-4 mr-2" />
                חפש
              </Button>
              <Button onClick={() => setSearchTerm('')} variant="outline" size="sm">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* No filters for now */}
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button onClick={clearFilters} variant="outline" size="sm">
                  <X className="w-4 h-4 mr-2" />
                  נקה סינונים
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-muted/20 rounded-lg border border-dashed border-border">
          <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">אין תוכניות בנייה</h3>
          <p className="text-muted-foreground">נסה שוב מאוחר יותר</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 animate-slide-up">
          {plans.map((plan, index) => {
            const statusInfo = getStatusBadge(plan.status || 'לא ידוע', plan.daysUntilDeadline);
            const priorityScore = getPriorityScore(plan.daysUntilDeadline, plan.status || 'לא ידוע');

            return (
              <Card key={plan.pk} className="overflow-hidden hover-lift bg-gradient-card shadow-soft border-0 group" style={{animationDelay: `${index * 0.1}s`}}>
                <div className="relative overflow-hidden">
                  <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge 
                        className={`shadow-medium text-xs ${
                          priorityScore > 85 
                            ? "bg-gradient-primary text-white border-0" 
                            : "bg-white/90 text-primary border-0"
                        }`}
                      >
                        {priorityScore}
                      </Badge>
                      <Badge variant="outline" className="text-xs px-2 py-1">
                        #{plan.meirim_id}
                      </Badge>
                    </div>
                    
                    {/* Plan Details Display */}
                    <div className="space-y-2 text-xs">
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                        <div className="font-semibold text-primary mb-1 text-xs">פרטי התוכנית:</div>
                        <div className="space-y-1 text-xs">
                          {plan.plan_number && (
                            <div><span className="font-medium">מספר תוכנית:</span> {plan.plan_number}</div>
                          )}
                          {plan.meirim_id && (
                            <div><span className="font-medium">מזהה מרים:</span> {plan.meirim_id}</div>
                          )}
                          {plan.county_name && (
                            <div><span className="font-medium">עירייה:</span> {plan.county_name}</div>
                          )}
                          {plan.plan_character_name && (
                            <div><span className="font-medium">אופי תוכנית:</span> {plan.plan_character_name}</div>
                          )}
                          {plan.entity_subtype_desc && (
                            <div><span className="font-medium">תת סוג:</span> {plan.entity_subtype_desc}</div>
                          )}
                        </div>
                      </div>
                      
                      {plan.goals_from_mavat && (
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                          <div className="font-semibold text-primary mb-1 text-xs">יעדים:</div>
                          <div className="text-xs line-clamp-3">
                            {plan.goals_from_mavat}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors duration-300 line-clamp-2">
                      {plan.plan_display_name || plan.plan_name || plan.plan_number || 'ללא שם'}
                    </h3>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <MapPin className="w-3 h-3" />
                      <span className="font-medium">{plan.county_name || 'לא צוין'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Badge 
                      variant={statusInfo.variant}
                      className="text-xs font-medium shadow-soft"
                    >
                      {statusInfo.text}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-medium">
                      {plan.status || 'ללא סטטוס'}
                    </Badge>
                  </div>

                  <Button 
                    className="w-full h-10 bg-gradient-primary shadow-glow hover:shadow-large transition-all duration-300 font-semibold text-sm"
                    onClick={() => {
                      if (plan.plan_url) {
                        window.open(plan.plan_url, '_blank');
                      } else if (plan.plan_new_mavat_url) {
                        window.open(plan.plan_new_mavat_url, '_blank');
                      } else {
                        console.log('No plan link available');
                      }
                    }}
                  >
                    {plan.plan_url || plan.plan_new_mavat_url ? 'צפה בתוכנית' : 'צפה בפרטים'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-4 pt-8">
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
