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
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowRight className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-bold">טוען מכרזים...</h2>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden bg-gradient-card shadow-soft border-0 animate-pulse">
              <div className="h-52 bg-muted"></div>
              <div className="p-6 space-y-4">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-start" dir="rtl">
        <h2 className="text-3xl font-bold text-right">מכרזי רמ&quot;י</h2>
      </div>

      {/* Search and Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" dir="rtl">
            <Filter className="w-5 h-5" />
            חיפוש וסינון
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-row-reverse">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="חפש לפי עיר או מספר מכרז..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyPress={handleKeyPress}
                className="h-10"
                dir="rtl"
              />
            </div>
            <Button 
              onClick={handleSearch}
              className="h-10"
            >
              חפש
              <Search className="w-4 h-4 mr-2" />
            </Button>
            {(searchQuery || activeSearchQuery) && (
              <Button 
                onClick={clearSearch} 
                variant="outline"
                className="h-10"
                aria-label="נקה חיפוש"
              >
                נקה
                <X className="w-4 h-4 mr-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-xl text-muted-foreground">
        מכרזים פעילים שכדאי לעקוב אחריהם • {itemsPerPage} מכרזים בעמוד
      </p>

      {tenders.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">אין מכרזים פעילים</h3>
          <p className="text-muted-foreground">נסה שוב מאוחר יותר</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-slide-up">
          {tenders.map((tender, index) => {
            const statusInfo = getStatusBadge(tender.status || 'לא ידוע', tender.daysUntilDeadline);
            const priorityScore = getPriorityScore(tender.daysUntilDeadline, tender.status || 'לא ידוע');
            
            return (
              <Card key={tender.michraz_id} className="overflow-hidden hover-lift bg-gradient-card shadow-soft border-0 group" style={{animationDelay: `${index * 0.1}s`}}>
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
                        #{tender.michraz_id}
                      </Badge>
                    </div>
                    
                    {/* Raw JSONB Data Display */}
                    <div className="space-y-2 text-xs">
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                        <div className="font-semibold text-primary mb-1 text-xs">פרטי המכרז:</div>
                        <div className="space-y-1 text-xs">
                          {tender.raw.MichrazName && (
                            <div><span className="font-medium">שם מכרז:</span> {tender.raw.MichrazName}</div>
                          )}
                          {tender.raw.MichrazID && (
                            <div><span className="font-medium">מספר מכרז:</span> {tender.raw.MichrazID}</div>
                          )}
                          {tender.raw.StatusMichraz && (
                            <div><span className="font-medium">סטטוס:</span> {tender.raw.StatusMichraz}</div>
                          )}
                          {tender.raw.KodSugMichraz && (
                            <div><span className="font-medium">סוג מכרז:</span> {tender.raw.KodSugMichraz}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                        <div className="font-semibold text-primary mb-1 text-xs">פרטי נדל״ן:</div>
                        <div className="space-y-1 text-xs">
                          {tender.raw.YechidotDiur && (
                            <div><span className="font-medium">יחידות דיור:</span> {tender.raw.YechidotDiur}</div>
                          )}
                          {tender.raw.KhalYaadRashi && (
                            <div><span className="font-medium">חל יאד ראשי:</span> {tender.raw.KhalYaadRashi}</div>
                          )}
                          {tender.raw.KodMerchav && (
                            <div><span className="font-medium">קוד מרחב:</span> {tender.raw.KodMerchav}</div>
                          )}
                          {tender.raw.KodYeshuv && (
                            <div><span className="font-medium">קוד ישוב:</span> {tender.raw.KodYeshuv}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                        <div className="font-semibold text-primary mb-1 text-xs">תאריכים:</div>
                        <div className="space-y-1 text-xs">
                          {tender.raw.PirsumDate && (
                            <div><span className="font-medium">תאריך פרסום:</span> {new Date(tender.raw.PirsumDate).toLocaleDateString('he-IL')}</div>
                          )}
                          {tender.raw.PtichaDate && (
                            <div><span className="font-medium">תאריך פתיחה:</span> {new Date(tender.raw.PtichaDate).toLocaleDateString('he-IL')}</div>
                          )}
                          {tender.raw.SgiraDate && (
                            <div><span className="font-medium">תאריך סגירה:</span> {new Date(tender.raw.SgiraDate).toLocaleDateString('he-IL')}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors duration-300 line-clamp-2">
                      {tender.title}
                    </h3>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <MapPin className="w-3 h-3" />
                      <span className="font-medium">{tender.area}</span>
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
                      {tender.tender_number}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="text-center p-2 bg-primary/5 rounded-lg">
                      <div className="font-medium text-muted-foreground mb-1 text-xs">תאריך פרסום</div>
                      <div className="text-primary font-bold text-sm">
                        {tender.publication_date ? 
                          new Date(tender.publication_date).toLocaleDateString('he-IL') : 
                          'לא צוין'
                        }
                      </div>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <div className="font-medium text-muted-foreground mb-1 text-xs">תאריך פג תוקף</div>
                      <div className="font-bold text-sm">
                        {tender.deadline_date ? 
                          new Date(tender.deadline_date).toLocaleDateString('he-IL') : 
                          'לא צוין'
                        }
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                    <Clock className="w-3 h-3" />
                    <span className="font-medium">
                      {tender.daysUntilDeadline === null 
                        ? 'ללא תאריך פג תוקף'
                        : tender.daysUntilDeadline > 0 
                          ? `נותרו ${tender.daysUntilDeadline} ימים`
                          : 'פג תוקף'
                      }
                    </span>
                  </div>

                  {/* Additional Raw Data */}
                  <div className="space-y-2">
                    {tender.raw.KodYeudMichraz && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">קוד יעוד מכרז:</span> {tender.raw.KodYeudMichraz}
                      </div>
                    )}
                    {tender.raw.PublishedChoveret !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">פורסם בחוברת:</span> {tender.raw.PublishedChoveret ? 'כן' : 'לא'}
                      </div>
                    )}
                    {tender.raw.ChoveretUpdateDate && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">תאריך עדכון חוברת:</span> {new Date(tender.raw.ChoveretUpdateDate).toLocaleDateString('he-IL')}
                      </div>
                    )}
                    {tender.raw.VaadaDate && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">תאריך ועדה:</span> {new Date(tender.raw.VaadaDate).toLocaleDateString('he-IL')}
                      </div>
                    )}
                    {tender.raw.Mekuvan !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">מקוון:</span> {tender.raw.Mekuvan ? 'כן' : 'לא'}
                      </div>
                    )}
                  </div>

                  {(() => {
                    const sourceUrl = getSourceUrl(tender);
                    return sourceUrl ? (
                      <Button 
                        className="w-full h-10 bg-gradient-primary shadow-glow hover:shadow-large transition-all duration-300 font-semibold text-sm"
                        onClick={() => {
                          console.log('Opening URL:', sourceUrl);
                          window.open(sourceUrl, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <ExternalLink className="w-4 h-4 ml-2" />
                        קישור למקור הממשלתי
                      </Button>
                    ) : (
                      <Button 
                        className="w-full h-10 bg-gradient-primary shadow-glow hover:shadow-large transition-all duration-300 font-semibold text-sm"
                        disabled
                      >
                        קישור לא זמין
                      </Button>
                    );
                  })()}
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
