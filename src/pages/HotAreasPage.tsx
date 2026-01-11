import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Flame, 
  Building2, 
  MapPin, 
  Calendar, 
  Users, 
  TrendingUp,
  ArrowRight,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { urbanRenewalProjectQueries } from "@/lib/supabase-queries";
import type { UrbanRenewalProject } from "@/lib/supabase";

// רשימת פרויקטי פינוי-בינוי מבוקשים
const popularUrbanRenewalProjects = [
  { name: "קרית משה המתחדשת", city: "רחובות", searchTerms: ["קרית משה", "רחובות"] },
  { name: "פרויקט גבעת קנדי – התחדשות עירונית", city: "עתלית", searchTerms: ["גבעת קנדי", "עתלית"] },
  { name: "רמת אליהו המתחדשת", city: "ראשון לציון", searchTerms: ["רמת אליהו", "ראשון לציון"] },
  { name: "תוכנית פינוי בינוי יוספטל", city: "קרית ים", searchTerms: ["יוספטל", "קרית ים"] },
  { name: "פרויקט פינוי-בינוי בשכונת קריית נורדאו – רוטשטיין", city: "נתניה", searchTerms: ["קריית נורדאו", "רוטשטיין", "נתניה"] },
  { name: "מתחם נחום", city: "נתניה", searchTerms: ["מתחם נחום", "נתניה"] },
  { name: "קריית שפרינצק", city: "חיפה", searchTerms: ["קריית שפרינצק", "חיפה"] },
  { name: "כפר סבא – מתחם גאולה-ששת הימים", city: "כפר סבא", searchTerms: ["גאולה", "ששת הימים", "כפר סבא"] },
  { name: "רמלה – פרויקט בן-גוריון", city: "רמלה", searchTerms: ["בן-גוריון", "רמלה"] },
  { name: "בת-ים – קוממיות", city: "בת ים", searchTerms: ["קוממיות", "בת ים"] },
  { name: "בת ים - מתחם אילת", city: "בת ים", searchTerms: ["מתחם אילת", "בת ים"] },
  { name: "מתחם אפק", city: "קריית ביאליק", searchTerms: ["מתחם אפק", "קריית ביאליק"] },
  { name: "תוכנית חדרה גבעת אולגה", city: "חדרה", searchTerms: ["גבעת אולגה", "חדרה"] },
];

// רשימת קרקעות בשלבי הפשרה
const landReleaseProjects = [
  { name: "ח-500", city: "חולון", searchTerms: ["ח-500", "חולון"] },
  { name: "גבעת הפרחים", city: "נתניה", searchTerms: ["גבעת הפרחים", "נתניה"] },
  { name: "ביאליק בפארק", city: "קרית ביאליק", searchTerms: ["ביאליק בפארק", "קרית ביאליק"] },
  { name: "מתחם 2000", city: "ראשון לציון", searchTerms: ["מתחם 2000", "ראשון לציון"] },
  { name: "פי גלילות", city: "תל אביב", searchTerms: ["פי גלילות", "גלילות", "תל אביב"] },
  { name: "בן יהודה", city: "כפר סבא", searchTerms: ["בן יהודה", "כפר סבא"] },
  { name: "רובע הים", city: "חדרה", searchTerms: ["רובע הים", "חדרה"] },
  { name: "רובע שדה דב", city: "תל אביב", searchTerms: ["רובע שדה דב", "שדה דב", "תל אביב"] },
  { name: "הנגב הדרומי - ישוב חדש בדרום", city: "סמוך לצומת תל ארד", searchTerms: ["הנגב הדרומי", "תל ארד"] },
  { name: "תמ״א 70", city: "ראשון לציון", searchTerms: ["תמ״א 70", "תמ״א70", "ראשון לציון"] },
  { name: "הרובע הצפוני", city: "הרצליה", searchTerms: ["הרובע הצפוני", "הרצליה"] },
];

interface ProjectWithData {
  name: string;
  city: string;
  searchTerms: string[];
  dbData?: UrbanRenewalProject | null;
}

export default function HotAreasPage() {
  const [urbanRenewalProjects, setUrbanRenewalProjects] = useState<ProjectWithData[]>([]);
  const [landReleaseProjectsData, setLandReleaseProjectsData] = useState<ProjectWithData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // טעינת כל פרויקטי התחדשות עירונית
      const allUrbanRenewal = await urbanRenewalProjectQueries.getAll();
      
      // חיפוש התאמות לפרויקטי פינוי-בינוי
      const matchedUrbanRenewal = popularUrbanRenewalProjects.map(project => {
        const match = allUrbanRenewal.find(ur => {
          const projectName = (ur.project_name || '').toLowerCase();
          const cityName = (ur.city_name || '').toLowerCase();
          return project.searchTerms.some(term => 
            projectName.includes(term.toLowerCase()) || 
            cityName.includes(term.toLowerCase())
          );
        });
        return { ...project, dbData: match || null };
      });
      
      setUrbanRenewalProjects(matchedUrbanRenewal);
      
      // חיפוש התאמות לקרקעות בשלבי הפשרה
      const matchedLandRelease = landReleaseProjects.map(project => {
        const match = allUrbanRenewal.find(ur => {
          const projectName = (ur.project_name || '').toLowerCase();
          const cityName = (ur.city_name || '').toLowerCase();
          return project.searchTerms.some(term => 
            projectName.includes(term.toLowerCase()) || 
            cityName.includes(term.toLowerCase())
          );
        });
        return { ...project, dbData: match || null };
      });
      
      setLandReleaseProjectsData(matchedLandRelease);
    } catch (error) {
      console.error('Error loading hot areas data:', error);
      // אם יש שגיאה, עדיין נציג את הרשימה
      setUrbanRenewalProjects(popularUrbanRenewalProjects.map(p => ({ ...p, dbData: null })));
      setLandReleaseProjectsData(landReleaseProjects.map(p => ({ ...p, dbData: null })));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Flame className="w-8 h-8 text-orange-500" />
          <h1 className="text-3xl font-bold">אזורים חמים למעקב</h1>
        </div>
        <p className="text-muted-foreground">טוען נתונים...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Flame className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              אזורים חמים למעקב
            </h1>
            <p className="text-muted-foreground mt-1">
              תוכניות עם פוטנציאל גבוה ומתחמי פינוי-בינוי מבוקשים
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            תוכניות עם פוטנציאל גבוה
          </TabsTrigger>
          <TabsTrigger value="urban-renewal" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            מתחמי פינוי-בינוי מבוקשים
          </TabsTrigger>
        </TabsList>

        {/* Land Release Projects Tab */}
        <TabsContent value="plans" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">קרקעות בשלבי הפשרה</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {landReleaseProjectsData.length} תוכניות קרקע בשלבי הפשרה
              </p>
            </div>
          </div>

          {landReleaseProjectsData.length === 0 ? (
            <Card className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">לא נמצאו תוכניות קרקע</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {landReleaseProjectsData.map((project, index) => (
                <Card key={index} className="overflow-hidden bg-gradient-card border-0 shadow-soft hover:shadow-medium transition-all duration-300 hover-lift">
                  <div className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2 line-clamp-2">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{project.city}</span>
                        </div>
                      </div>
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                        בשלבי הפשרה
                      </Badge>
                    </div>

                    {/* DB Data if available */}
                    {project.dbData && (
                      <div className="space-y-2 pt-2 border-t border-border/50">
                        {project.dbData.proposed_units && (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">יחידות מתוכננות:</span>
                            <span className="font-semibold">{project.dbData.proposed_units.toLocaleString()}</span>
                          </div>
                        )}
                        {project.dbData.project_type && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">סוג:</span>
                            <Badge variant="outline">{project.dbData.project_type}</Badge>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Popular Urban Renewal Tab */}
        <TabsContent value="urban-renewal" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">מתחמי פינוי-בינוי מבוקשים</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {urbanRenewalProjects.length} מתחמים עם פוטנציאל גבוה
              </p>
            </div>
          </div>

          {urbanRenewalProjects.length === 0 ? (
            <Card className="p-8 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">לא נמצאו מתחמי פינוי-בינוי מבוקשים</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {urbanRenewalProjects.map((project, index) => (
                <Card key={index} className="overflow-hidden bg-gradient-card border-0 shadow-soft hover:shadow-medium transition-all duration-300 hover-lift">
                  <div className="p-6 space-y-4">
                    {/* Header */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold text-lg flex-1 line-clamp-2">
                          {project.name}
                        </h3>
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          מבוקש
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{project.city}</span>
                      </div>
                    </div>

                    {/* DB Data if available */}
                    {project.dbData && (
                      <>
                        {/* Details */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                          {project.dbData.proposed_units && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="w-4 h-4" />
                                <span>יחידות מתוכננות</span>
                              </div>
                              <p className="font-semibold text-lg text-primary">
                                {project.dbData.proposed_units.toLocaleString()}
                              </p>
                            </div>
                          )}
                          {project.dbData.existing_units && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="w-4 h-4" />
                                <span>יחידות קיימות</span>
                              </div>
                              <p className="font-semibold">
                                {project.dbData.existing_units.toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Additional Info */}
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          {project.dbData.project_type && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">סוג:</span>
                              <Badge variant="outline">{project.dbData.project_type}</Badge>
                            </div>
                          )}
                          {project.dbData.plan_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">תוכנית:</span>
                              <span className="font-medium">{project.dbData.plan_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {project.dbData.plan_link && (
                          <div className="pt-4">
                            <Button 
                              variant="outline" 
                              className="w-full group"
                              onClick={() => window.open(project.dbData!.plan_link, '_blank')}
                            >
                              <span>פרטים נוספים</span>
                              <ExternalLink className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}

                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

