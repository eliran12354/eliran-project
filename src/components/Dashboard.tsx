import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  MapPin, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Home,
  BarChart3,
  Target,
  Flame,
  FileText,
  Clock,
  LogOut,
  User,
  Shield
} from "lucide-react";
import { useState } from "react";
import { tenderQueries, type Michraz } from "@/lib/tender-queries";
import { LoginDialog } from "@/components/LoginDialog";
import { useAuth } from "@/hooks/useAuth";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: 'orange' | 'green' | 'blue' | 'purple';
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
  const colorClasses = {
    orange: 'text-orange-500 bg-orange-50',
    green: 'text-primary bg-primary-light',
    blue: 'text-info bg-info/10', 
    purple: 'text-purple-500 bg-purple-50'
  };

  return (
    <Card className="p-8 hover-lift bg-gradient-card shadow-soft border-0 group">
      <div className="flex items-center justify-between mb-6">
        <div className={`${colorClasses[color]} p-4 rounded-2xl shadow-medium group-hover:shadow-glow transition-shadow duration-300`}>
          {icon}
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-3xl font-bold">{value}</h3>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-sm text-primary font-semibold bg-primary/5 px-3 py-1 rounded-full inline-block">{change}</p>
      </div>
    </Card>
  );
}

export function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Michraz[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const { user, profile, logout, isAdmin } = useAuth();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      console.log('Searching for:', searchQuery);
      const result = await tenderQueries.searchAllTenders(searchQuery, 1, 20);
      console.log('Search result:', result);
      
      if (result && result.data) {
        setSearchResults(result.data);
        setShowResults(true);
      } else {
        console.warn('No data in search result');
        setSearchResults([]);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Error searching tenders:', error);
      setSearchResults([]);
      setShowResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const checkSampleData = async () => {
    try {
      console.log('Checking sample data...');
      const sample = await tenderQueries.getSampleTenders(3);
      console.log('Sample data from michrazim:', sample);
      
      if (sample && sample.length > 0) {
        alert(`נמצאו ${sample.length} מכרזים בטבלה. ראה בקונסול לפרטים.`);
      } else {
        alert('לא נמצאו מכרזים בטבלה michrazim');
      }
    } catch (error) {
      console.error('Error getting sample data:', error);
      alert(`שגיאה בטעינת נתונים: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Login/Auth Section - בחלק העליון בצד ימין */}
      <div className="flex justify-end items-center gap-4 w-full">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
              <User className="w-4 h-4 text-primary" />
              <span className="font-medium">
                {profile?.username || user.email}
              </span>
              {isAdmin && (
                <Badge variant="default" className="bg-purple-500">
                  <Shield className="w-3 h-3 ml-1" />
                  אדמין
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              onClick={logout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              התנתק
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setLoginDialogOpen(true)}
            className="gap-2"
          >
            <User className="w-4 h-4" />
            התחבר
          </Button>
        )}
      </div>

      {/* Header Section */}
      <div className="text-center space-y-6 py-16 bg-gradient-hero rounded-2xl shadow-glow">
        <div className="flex items-center justify-center gap-4 mb-6 animate-bounce-in">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-large animate-float">
            <Home className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white drop-shadow-lg">נדל״ן חכם</h1>
        </div>
        
        <p className="text-xl text-white/90 max-w-2xl mx-auto font-medium leading-relaxed">
          מערכת אינטרנטית חכמה להפצת קריינטי על קרקעות, נכסים והשקעות נדל״ן
        </p>
        
        <p className="text-lg text-white/80">
          קבל זכות מהתיאם ווימט תור שירותי • ניתוח AI מתקדם • מיזעד עיכב בזמן אמת
        </p>

        {/* Search Section */}
        <Card className="max-w-4xl mx-auto p-8 mt-12 bg-white/95 backdrop-blur-md shadow-large hover-lift border-0">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input 
                placeholder="הזן כתובת או תיאור הנכס (תל אביב, רחוב דיזנגוף 100)"
                className="h-14 text-lg border-2 border-primary/20 focus:border-primary shadow-soft"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
            <Select defaultValue="סוג נכס">
              <SelectTrigger className="w-52 h-14 border-2 border-primary/20 shadow-soft">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="shadow-large">
                <SelectItem value="כל הסוגים">כל הסוגים</SelectItem>
                <SelectItem value="דירה">דירה</SelectItem>
                <SelectItem value="בית">בית</SelectItem>
                <SelectItem value="קרקע">קרקע</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              className="h-14 px-10 text-lg gap-3 bg-gradient-primary shadow-glow hover:shadow-large transition-all duration-300"
              onClick={handleSearch}
              disabled={isSearching}
            >
              <Search className="w-5 h-5" />
              {isSearching ? "מחפש..." : "חפש"}
            </Button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-3 mt-6 text-sm">
            <span className="text-muted-foreground font-medium">חיפושים פופולרים:</span>
            <Button variant="outline" size="sm" className="hover-lift">נתנינ 7500 ת״ח 8</Button>
            <Button variant="outline" size="sm" className="hover-lift">גבעת 3000 ק״מ/ש 15</Button>
            <Button variant="outline" size="sm" className="hover-lift">רמת, שדות בן גוריון 25</Button>
            <Button variant="outline" size="sm" className="hover-lift">ירושלים, רחוב 50 ק״מ</Button>
            <Button variant="outline" size="sm" className="hover-lift">תל אביב, רחוב דיזנגוף 100</Button>
          </div>

          <div className="flex gap-4 mt-8">
            <Button variant="outline" className="gap-3 h-12 hover-lift">
              <MapPin className="w-5 h-5" />
              חיפוש לפי מיקום גיאוגרפי
            </Button>
            <Button className="gap-3 h-12 bg-gradient-primary hover-lift">
              <MapPin className="w-5 h-5" />
              חיפוש לפי כתובת
            </Button>
            <Button 
              variant="outline" 
              className="gap-3 h-12 hover-lift"
              onClick={checkSampleData}
            >
              <FileText className="w-5 h-5" />
              בדוק נתונים
            </Button>
          </div>
        </Card>
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="space-y-6 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">תוצאות חיפוש</h2>
            <Button 
              variant="outline" 
              onClick={() => setShowResults(false)}
              className="text-sm"
            >
              סגור תוצאות
            </Button>
          </div>
          
          {searchResults.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">לא נמצאו מכרזים</h3>
              <p className="text-muted-foreground">נסה חיפוש אחר או בדוק את האיות</p>
            </Card>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {searchResults.map((tender) => {
                const deadlineDate = tender.raw?.SgiraDate ? new Date(tender.raw.SgiraDate) : 
                                   tender.deadline_date ? new Date(tender.deadline_date) : null;
                const now = new Date();
                const daysUntilDeadline = deadlineDate ? 
                  Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 
                  null;

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

                const statusInfo = getStatusBadge(tender.status || 'לא ידוע', daysUntilDeadline);
                const priorityScore = getPriorityScore(daysUntilDeadline, tender.status || 'לא ידוע');

                return (
                  <Card key={tender.pk} className="overflow-hidden hover-lift bg-gradient-card shadow-soft border-0 group">
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
                              {tender.raw?.MichrazName && (
                                <div><span className="font-medium">שם מכרז:</span> {tender.raw.MichrazName}</div>
                              )}
                              {tender.raw?.MichrazID && (
                                <div><span className="font-medium">מספר מכרז:</span> {tender.raw.MichrazID}</div>
                              )}
                              {tender.raw?.StatusMichraz && (
                                <div><span className="font-medium">סטטוס:</span> {tender.raw.StatusMichraz}</div>
                              )}
                              {tender.raw?.KodSugMichraz && (
                                <div><span className="font-medium">סוג מכרז:</span> {tender.raw.KodSugMichraz}</div>
                              )}
                              {tender.raw?.KodYeudMichraz && (
                                <div><span className="font-medium">קוד יעוד:</span> {tender.raw.KodYeudMichraz}</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                            <div className="font-semibold text-primary mb-1 text-xs">פרטי נדל״ן:</div>
                            <div className="space-y-1 text-xs">
                              {tender.raw?.Shchuna && (
                                <div><span className="font-medium">שכונה:</span> {tender.raw.Shchuna}</div>
                              )}
                              {tender.raw?.KodYeshuv && (
                                <div><span className="font-medium">קוד ישוב:</span> {tender.raw.KodYeshuv}</div>
                              )}
                              {tender.raw?.KodMerchav && (
                                <div><span className="font-medium">קוד מרחב:</span> {tender.raw.KodMerchav}</div>
                              )}
                              {tender.raw?.YechidotDiur !== undefined && (
                                <div><span className="font-medium">יחידות דיור:</span> {tender.raw.YechidotDiur}</div>
                              )}
                              {tender.raw?.KhalYaadRashi !== null && tender.raw?.KhalYaadRashi !== undefined && (
                                <div><span className="font-medium">חל יאד ראשי:</span> {tender.raw.KhalYaadRashi}</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                            <div className="font-semibold text-primary mb-1 text-xs">תאריכים:</div>
                            <div className="space-y-1 text-xs">
                              {tender.raw?.PirsumDate && (
                                <div><span className="font-medium">פרסום:</span> {new Date(tender.raw.PirsumDate).toLocaleDateString('he-IL')}</div>
                              )}
                              {tender.raw?.PtichaDate && (
                                <div><span className="font-medium">פתיחה:</span> {new Date(tender.raw.PtichaDate).toLocaleDateString('he-IL')}</div>
                              )}
                              {tender.raw?.SgiraDate && (
                                <div><span className="font-medium">סגירה:</span> {new Date(tender.raw.SgiraDate).toLocaleDateString('he-IL')}</div>
                              )}
                              {tender.raw?.VaadaDate && (
                                <div><span className="font-medium">ועדה:</span> {new Date(tender.raw.VaadaDate).toLocaleDateString('he-IL')}</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                            <div className="font-semibold text-primary mb-1 text-xs">פרטים נוספים:</div>
                            <div className="space-y-1 text-xs">
                              {tender.raw?.Mekuvan !== undefined && (
                                <div><span className="font-medium">מקוון:</span> {tender.raw.Mekuvan ? 'כן' : 'לא'}</div>
                              )}
                              {tender.raw?.PublishedChoveret !== undefined && (
                                <div><span className="font-medium">פורסם בחוברת:</span> {tender.raw.PublishedChoveret ? 'כן' : 'לא'}</div>
                              )}
                              {tender.raw?.ChoveretUpdateDate && (
                                <div><span className="font-medium">עדכון חוברת:</span> {new Date(tender.raw.ChoveretUpdateDate).toLocaleDateString('he-IL')}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors duration-300 line-clamp-2">
                          {tender.raw?.MichrazName || tender.title || 'ללא כותרת'}
                        </h3>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <MapPin className="w-3 h-3" />
                          <span className="font-medium">{tender.raw?.Shchuna || tender.area || 'לא צוין'}</span>
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
                          {tender.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="text-center p-2 bg-primary/5 rounded-lg">
                          <div className="font-medium text-muted-foreground mb-1 text-xs">תאריך פרסום</div>
                          <div className="text-primary font-bold text-sm">
                            {tender.raw?.PirsumDate ? 
                              new Date(tender.raw.PirsumDate).toLocaleDateString('he-IL') : 
                              tender.publication_date ? 
                                new Date(tender.publication_date).toLocaleDateString('he-IL') : 
                                'לא צוין'
                            }
                          </div>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                          <div className="font-medium text-muted-foreground mb-1 text-xs">תאריך סגירה</div>
                          <div className="font-bold text-sm">
                            {tender.raw?.SgiraDate ? 
                              new Date(tender.raw.SgiraDate).toLocaleDateString('he-IL') : 
                              tender.deadline_date ? 
                                new Date(tender.deadline_date).toLocaleDateString('he-IL') : 
                                'לא צוין'
                            }
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                        <Clock className="w-3 h-3" />
                        <span className="font-medium">
                          {daysUntilDeadline === null 
                            ? 'ללא תאריך פג תוקף'
                            : daysUntilDeadline > 0 
                              ? `נותרו ${daysUntilDeadline} ימים`
                              : 'פג תוקף'
                          }
                        </span>
                      </div>

                      <Button className="w-full h-10 bg-gradient-primary shadow-glow hover:shadow-large transition-all duration-300 font-semibold text-sm">
                        צפה בפרטים
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-8 animate-slide-up">
        <StatCard
          title="התרחשויות פעילות"
          value="1,250"
          change="+25% השבוע"
          icon={<Target className="w-7 h-7" />}
          color="orange"
        />
        <StatCard
          title="שווי כולל"
          value="2.8B ש"
          change="+15% מהחודש הקודם"
          icon={<DollarSign className="w-7 h-7" />}
          color="green"
        />
        <StatCard
          title="עסקאות השנה"
          value="45,230"
          change="+8% השנה שעברה"
          icon={<TrendingUp className="w-7 h-7" />}
          color="blue"
        />
        <StatCard
          title="נכסים ברשתות"
          value="+250,000"
          change="+12% החודש"
          icon={<FileText className="w-7 h-7" />}
          color="purple"
        />
      </div>

      {/* Features Section */}
      <div className="text-center py-12 animate-scale-in">
        <h2 className="text-3xl font-bold mb-4">פיצ׳רים מרכזיים</h2>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          כל מה שאתה צריך לקבלת החלטות השקעה חכמות
        </p>

        <div className="grid grid-cols-3 gap-8">
          <Card className="p-8 text-center hover-lift bg-gradient-card shadow-soft border-0">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6 shadow-medium">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-4">ניתוח השקעות</h3>
            <p className="text-muted-foreground leading-relaxed">
              ניתוח ROI, מה שגה ההלמי השלוב עם AI
            </p>
          </Card>

          <Card className="p-8 text-center hover-lift bg-gradient-card shadow-soft border-0">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6 shadow-medium">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-4">מיפוי נכסים</h3>
            <p className="text-muted-foreground leading-relaxed">
              הצגת נכסים על מפה עם שכבות מידע מתקדמות
            </p>
          </Card>

          <Card className="p-8 text-center hover-lift bg-gradient-card shadow-soft border-0">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6 shadow-medium">
              <Search className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-4">חיפוש מתקדם</h3>
            <p className="text-muted-foreground leading-relaxed">
              חיפוש נכסים לפי כתיבת, גווני-חלקה או קריטריונים מתקדמים
            </p>
          </Card>
        </div>
      </div>

      {/* Bottom Features Grid */}
      <div className="grid grid-cols-3 gap-8 mt-16">
        <Card className="p-8 text-center hover-lift bg-gradient-card shadow-soft border-0">
          <div className="mx-auto w-16 h-16 bg-success/20 rounded-2xl flex items-center justify-center mb-6 shadow-medium">
            <BarChart3 className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-xl font-semibold mb-2">השוואות מחירים</h3>
        </Card>

        <Card className="p-8 text-center hover-lift bg-gradient-card shadow-soft border-0">
          <div className="mx-auto w-16 h-16 bg-warning/20 rounded-2xl flex items-center justify-center mb-6 shadow-medium">
            <Flame className="w-8 h-8 text-warning" />
          </div>
          <h3 className="text-xl font-semibold mb-2">האזורים החמים</h3>
        </Card>

        <Card className="p-8 text-center hover-lift bg-gradient-card shadow-soft border-0">
          <div className="mx-auto w-16 h-16 bg-info/20 rounded-2xl flex items-center justify-center mb-6 shadow-medium">
            <FileText className="w-8 h-8 text-info" />
          </div>
          <h3 className="text-xl font-semibold mb-2">כרטיס נכס מפורט</h3>
        </Card>
      </div>

      <LoginDialog 
        open={loginDialogOpen} 
        onOpenChange={setLoginDialogOpen} 
      />
    </div>
  );
}