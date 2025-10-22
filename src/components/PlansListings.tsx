import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Calendar, Clock, FileText, ChevronLeft, ChevronRight, Building, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { plansQueries, type TabaPlan } from "@/lib/tender-queries";

interface PlanWithDetails extends TabaPlan {
  daysUntilDeadline?: number | null;
}

export function PlansListings() {
  const [plans, setPlans] = useState<PlanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPlans, setTotalPlans] = useState(0);
  const itemsPerPage = 50;

  useEffect(() => {
    loadPlans();
  }, [currentPage]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const result = await plansQueries.getPlansPaginated(currentPage, itemsPerPage);
      
      // Transform the data to include calculated fields
      const plansWithDetails = result.data.map(plan => {
        const toDate = plan.to_date ? new Date(plan.to_date) : null;
        const now = new Date();
        const daysUntilDeadline = toDate ? 
          Math.ceil((toDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 
          null;
        
        return {
          ...plan,
          daysUntilDeadline: daysUntilDeadline
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
                        #{plan.plan_id}
                      </Badge>
                    </div>
                    
                    {/* Plan Details Display */}
                    <div className="space-y-2 text-xs">
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                        <div className="font-semibold text-primary mb-1 text-xs">פרטי התוכנית:</div>
                        <div className="space-y-1 text-xs">
                          {plan.raw?.planNumber && (
                            <div><span className="font-medium">מספר תוכנית:</span> {plan.raw.planNumber}</div>
                          )}
                          {plan.raw?.planId && (
                            <div><span className="font-medium">מזהה תוכנית:</span> {plan.raw.planId}</div>
                          )}
                          {plan.raw?.status && (
                            <div><span className="font-medium">סטטוס:</span> {plan.raw.status}</div>
                          )}
                          {plan.raw?.cityText && (
                            <div><span className="font-medium">עיר:</span> {plan.raw.cityText}</div>
                          )}
                          {plan.raw?.mahut && (
                            <div><span className="font-medium">מחו"ת:</span> {plan.raw.mahut}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                        <div className="font-semibold text-primary mb-1 text-xs">תאריכים:</div>
                        <div className="space-y-1 text-xs">
                          {plan.raw?.statusDate && (
                            <div><span className="font-medium">תאריך סטטוס:</span> {plan.raw.statusDate.trim()}</div>
                          )}
                          {plan.publication_date && (
                            <div><span className="font-medium">פרסום:</span> {new Date(plan.publication_date).toLocaleDateString('he-IL')}</div>
                          )}
                          {plan.from_date && (
                            <div><span className="font-medium">מתאריך:</span> {new Date(plan.from_date).toLocaleDateString('he-IL')}</div>
                          )}
                          {plan.to_date && (
                            <div><span className="font-medium">עד תאריך:</span> {new Date(plan.to_date).toLocaleDateString('he-IL')}</div>
                          )}
                        </div>
                      </div>
                      
                      {plan.raw?.documentsSet && (
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                          <div className="font-semibold text-primary mb-1 text-xs">מסמכים זמינים:</div>
                          <div className="space-y-1 text-xs">
                            {plan.raw.documentsSet.map && (
                              <div className="flex items-center gap-2">
                                <ExternalLink className="w-3 h-3 text-green-500" />
                                <span className="font-medium text-green-600">מפה זמינה</span>
                              </div>
                            )}
                            {plan.raw.documentsSet.mmg && (
                              <div><span className="font-medium">ממג:</span> {plan.raw.documentsSet.mmg.info}</div>
                            )}
                            {plan.raw.documentsSet.takanon && (
                              <div><span className="font-medium">תקנון:</span> {plan.raw.documentsSet.takanon.info}</div>
                            )}
                            {plan.raw.documentsSet.tasritim && plan.raw.documentsSet.tasritim.length > 0 && (
                              <div><span className="font-medium">תשריטים:</span> {plan.raw.documentsSet.tasritim.length} קבצים</div>
                            )}
                            {plan.raw.documentsSet.nispachim && plan.raw.documentsSet.nispachim.length > 0 && (
                              <div><span className="font-medium">נספחים:</span> {plan.raw.documentsSet.nispachim.length} קבצים</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors duration-300 line-clamp-2">
                      {plan.raw?.planNumber || plan.plan_name || 'ללא שם'}
                    </h3>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <MapPin className="w-3 h-3" />
                      <span className="font-medium">{plan.raw?.cityText || plan.area || 'לא צוין'}</span>
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
                      {plan.raw?.status || plan.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="text-center p-2 bg-primary/5 rounded-lg">
                      <div className="font-medium text-muted-foreground mb-1 text-xs">תאריך פרסום</div>
                      <div className="text-primary font-bold text-sm">
                        {plan.publication_date ? 
                          new Date(plan.publication_date).toLocaleDateString('he-IL') : 
                          'לא צוין'
                        }
                      </div>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <div className="font-medium text-muted-foreground mb-1 text-xs">תאריך סיום</div>
                      <div className="font-bold text-sm">
                        {plan.to_date ? 
                          new Date(plan.to_date).toLocaleDateString('he-IL') : 
                          'לא צוין'
                        }
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                    <Clock className="w-3 h-3" />
                    <span className="font-medium">
                      {plan.daysUntilDeadline === null 
                        ? (plan.raw?.statusDate ? plan.raw.statusDate.trim() : 'ללא תאריך סיום')
                        : plan.daysUntilDeadline > 0 
                          ? `נותרו ${plan.daysUntilDeadline} ימים`
                          : 'פג תוקף'
                      }
                    </span>
                  </div>

                  <Button 
                    className="w-full h-10 bg-gradient-primary shadow-glow hover:shadow-large transition-all duration-300 font-semibold text-sm"
                    onClick={() => {
                      if (plan.raw?.documentsSet?.map?.path) {
                        window.open(plan.raw.documentsSet.map.path, '_blank');
                      } else {
                        // אם אין קישור למפה, אפשר להוסיף פונקציונליות אחרת
                        console.log('No map link available for plan:', plan.plan_id);
                      }
                    }}
                  >
                    {plan.raw?.documentsSet?.map?.path ? 'צפה במפה' : 'צפה בפרטים'}
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
