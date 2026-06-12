import { useState } from "react";
import { Search, MapPin, Building2, Loader2, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { collectLandCheckData, type LandCheckInput, type LandCheckReport } from "@/lib/services/landCheckService";

type IdentificationType = "parcel" | "address";

interface LandCheckForm {
  identification_type: IdentificationType;
  // גוש/חלקה
  gush?: string;
  helka?: string;
  // כתובת
  city?: string;
  street?: string;
  house_number?: string;
}

export default function LandCheckPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<LandCheckReport | null>(null);
  const [formData, setFormData] = useState<LandCheckForm>({
    identification_type: "address",
  });

  // Debug function to discover GovMap services (uncomment to use)
  /*
  const discoverServices = async () => {
    const { discoverGovMapServices } = await import("@/lib/services/landCheckService");
    await discoverGovMapServices();
  };
  */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.identification_type === "parcel") {
      if (!formData.gush || !formData.helka) {
        toast({
          title: "שגיאה",
          description: "יש למלא מספר גוש וחלקה",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!formData.city || !formData.street || !formData.house_number) {
        toast({
          title: "שגיאה",
          description: "יש למלא עיר, רחוב ומספר בית",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setLoading(true);
      setReport(null);
      
      const input: LandCheckInput = {
        identification_type: formData.identification_type,
        gush: formData.gush,
        helka: formData.helka,
        city: formData.city,
        street: formData.street,
        house_number: formData.house_number,
      };
      
      const result = await collectLandCheckData(input);
      
      if (result) {
        setReport(result);
        toast({
          title: "הבדיקה הושלמה",
          description: "הדוח מוכן להצגה",
        });
      } else {
        throw new Error("לא התקבלו נתונים");
      }
      
    } catch (error: any) {
      console.error("Error in land check:", error);
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה בעת הבדיקה",
        variant: "destructive",
      });
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Search className="w-6 h-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold">בדיקת קרקע מתקדמת</h2>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            קבל דוח מקצועי מקיף על הקרקע שלך כולל סטטוס תכנוני, שווי, סיכונים ויתרונות
          </p>
        </div>
      </div>

      <SubscriptionGate>
      {/* Form Card */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* סוג זיהוי */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">סוג זיהוי הנכס</Label>
            <RadioGroup
              value={formData.identification_type}
              onValueChange={(value) => 
                setFormData({ ...formData, identification_type: value as IdentificationType })
              }
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="parcel" id="parcel" />
                <Label htmlFor="parcel" className="font-normal cursor-pointer">
                  גוש / חלקה
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="address" id="address" />
                <Label htmlFor="address" className="font-normal cursor-pointer">
                  כתובת
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* פרטי גוש/חלקה */}
          {formData.identification_type === "parcel" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gush" className="text-base">
                  מספר גוש <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="gush"
                  type="text"
                  value={formData.gush || ""}
                  onChange={(e) => setFormData({ ...formData, gush: e.target.value })}
                  placeholder="לדוגמה: 30500"
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="helka" className="text-base">
                  מספר חלקה <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="helka"
                  type="text"
                  value={formData.helka || ""}
                  onChange={(e) => setFormData({ ...formData, helka: e.target.value })}
                  placeholder="לדוגמה: 42"
                  className="text-base"
                />
              </div>
            </div>
          )}

          {/* פרטי כתובת */}
          {formData.identification_type === "address" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-base">
                    עיר <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.city || ""}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="לדוגמה: תל אביב"
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street" className="text-base">
                    רחוב <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="street"
                    type="text"
                    value={formData.street || ""}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="לדוגמה: רוטשילד"
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="house_number" className="text-base">
                    מספר בית <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="house_number"
                    type="text"
                    value={formData.house_number || ""}
                    onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                    placeholder="לדוגמה: 45"
                    className="text-base"
                  />
                </div>
              </div>
              
              {/* גוש וחלקה (אופציונלי) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="gush_address" className="text-base">
                    גוש <span className="text-gray-500 text-sm">(אופציונלי - יעזור לסנן פרויקטי בנייה)</span>
                  </Label>
                  <Input
                    id="gush_address"
                    type="text"
                    value={formData.gush || ""}
                    onChange={(e) => setFormData({ ...formData, gush: e.target.value })}
                    placeholder="לדוגמה: 12345"
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="helka_address" className="text-base">
                    חלקה <span className="text-gray-500 text-sm">(אופציונלי - יעזור לסנן פרויקטי בנייה)</span>
                  </Label>
                  <Input
                    id="helka_address"
                    type="text"
                    value={formData.helka || ""}
                    onChange={(e) => setFormData({ ...formData, helka: e.target.value })}
                    placeholder="לדוגמה: 12"
                    className="text-base"
                  />
                </div>
              </div>
            </>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-semibold mb-1">מה כולל הדוח?</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
                  <li>סטטוס תכנוני: חקלאית / בהפשרה / תוכנית בתוקף</li>
                  <li>רמת הכללה בתוכנית: מלאה / חלקית</li>
                  <li>ייעוד זכויות עתידיות</li>
                  <li>הערכת שווי למ״ר על בסיס עסקאות</li>
                  <li>סיכונים, יתרונות, פוטנציאל ועלויות</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full md:w-auto text-base px-8"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                איסוף נתונים...
              </>
            ) : (
              <>
                <Search className="w-5 h-5 ml-2" />
                התחל בדיקה
              </>
            )}
          </Button>
        </form>
      </Card>

      {/* Results Section - יופיע אחרי שהדוח מוכן */}
      {report && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">תוצאות הבדיקה</h3>
          
          {/* Parcel Info */}
          {report.parcel_info.coordinates && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">קואורדינטות:</p>
              <p className="font-mono text-sm">
                {report.parcel_info.coordinates.lat.toFixed(6)}, {report.parcel_info.coordinates.lng.toFixed(6)}
              </p>
            </div>
          )}

          {/* Planning Status */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">סטטוס תכנוני:</h4>
            <p className="mb-2">
              {report.planning_status.status === "agricultural" && "חקלאית"}
              {report.planning_status.status === "in_rezoning" && "בהפשרה"}
              {report.planning_status.status === "approved_plan" && "תוכנית בתוקף"}
              {report.planning_status.status === "unknown" && "לא ידוע"}
            </p>
            {report.planning_status.plan_name && (
              <p className="text-sm text-muted-foreground mb-1">
                תוכנית: {report.planning_status.plan_name}
              </p>
            )}
            {report.planning_status.plan_number && (
              <p className="text-sm text-muted-foreground">
                מספר תוכנית: {report.planning_status.plan_number}
              </p>
            )}
          </div>

          {/* Land Use - יעודי קרקע */}
          {report.land_use && report.land_use.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">יעודי קרקע (מבא"ת):</h4>
              <div className="space-y-2">
                {report.land_use.slice(0, 5).map((lu, index) => (
                  <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                    {lu.mavat_name && (
                      <p className="font-medium">{lu.mavat_name}</p>
                    )}
                    {lu.pl_name && (
                      <p className="text-muted-foreground text-xs">תוכנית: {lu.pl_name}</p>
                    )}
                    {lu.pl_number && (
                      <p className="text-muted-foreground text-xs">מספר: {lu.pl_number}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preparing Plans */}
          {report.preparing_plans && report.preparing_plans.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">תוכניות בהכנה:</h4>
              <div className="space-y-2">
                {report.preparing_plans.slice(0, 5).map((plan, index) => (
                  <div key={index} className="text-sm p-2 bg-blue-50 rounded">
                    {plan.tochnit && (
                      <p className="font-medium">{plan.tochnit}</p>
                    )}
                    {plan.migrash && (
                      <p className="text-muted-foreground text-xs">מגרש: {plan.migrash}</p>
                    )}
                    {plan.status && (
                      <p className="text-muted-foreground text-xs">סטטוס: {plan.status}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valuation */}
          {report.valuation.average_price_per_sqm && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">הערכת שווי:</h4>
              <p className="text-lg font-bold">
                {report.valuation.average_price_per_sqm.toLocaleString()} ₪ למ״ר
              </p>
              {report.valuation.transaction_count && (
                <p className="text-sm text-muted-foreground">
                  על בסיס {report.valuation.transaction_count} עסקאות
                </p>
              )}
            </div>
          )}

          {/* Price Trends Data */}
          {report.price_trends && (
            <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <h4 className="font-semibold mb-3 text-purple-900 dark:text-purple-100">📊 נתוני מגמות מחירים</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.price_trends.rental_yield_percent !== undefined && report.price_trends.rental_yield_percent !== null && (
                  <div>
                    <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">תשואת שכירות שנתית:</p>
                    <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{report.price_trends.rental_yield_percent}%</p>
                  </div>
                )}
                {report.price_trends.price_increase_percent !== undefined && report.price_trends.price_increase_percent !== null && (
                  <div>
                    <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">עליית מחירים (שנה אחרונה):</p>
                    <p className={`text-lg font-bold ${report.price_trends.price_increase_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {report.price_trends.price_increase_percent >= 0 ? '+' : ''}{report.price_trends.price_increase_percent}%
                    </p>
                  </div>
                )}
                {report.price_trends.prestige_score !== undefined && report.price_trends.prestige_score !== null && (
                  <div>
                    <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">ציון יוקר שכונה:</p>
                    <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                      {report.price_trends.prestige_score}/{report.price_trends.prestige_max || 10}
                    </p>
                  </div>
                )}
                {report.price_trends.quarter_prices?.neighborhood_name && (
                  <div>
                    <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">שכונה:</p>
                    <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{report.price_trends.quarter_prices.neighborhood_name}</p>
                  </div>
                )}
              </div>
              {report.price_trends.median_prices_by_rooms && (
                <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
                  <p className="text-sm text-purple-700 dark:text-purple-300 font-medium mb-2">מחירים ממוצעים לפי חדרים:</p>
                  <div className="flex gap-4 text-sm">
                    {report.price_trends.median_prices_by_rooms['3_rooms'] && (
                      <span className="text-purple-900 dark:text-purple-100">3 חדרים: {report.price_trends.median_prices_by_rooms['3_rooms']} מיליון ₪</span>
                    )}
                    {report.price_trends.median_prices_by_rooms['4_rooms'] && (
                      <span className="text-purple-900 dark:text-purple-100">4 חדרים: {report.price_trends.median_prices_by_rooms['4_rooms']} מיליון ₪</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Urban Renewal */}
          {report.urban_renewal_projects && report.urban_renewal_projects.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">התחדשות עירונית:</h4>
              <p>נמצאו {report.urban_renewal_projects.length} תוכניות בסביבה</p>
            </div>
          )}

          {/* Risks & Advantages */}
          {report.risks && report.risks.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2 text-red-600">סיכונים:</h4>
              <ul className="list-disc list-inside space-y-1">
                {report.risks.map((risk, index) => (
                  <li key={index} className="text-sm">{risk}</li>
                ))}
              </ul>
            </div>
          )}

          {report.advantages && report.advantages.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2 text-green-600">יתרונות:</h4>
              <ul className="list-disc list-inside space-y-1">
                {report.advantages.map((advantage, index) => (
                  <li key={index} className="text-sm">{advantage}</li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Analysis Section */}
          {report.ai_analysis && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-xl font-bold">ניתוח מקצועי מבוסס AI</h3>
              </div>

              {/* Summary */}
              {report.ai_analysis.summary && (
                <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <h4 className="font-semibold mb-2 text-purple-900 dark:text-purple-100">סיכום:</h4>
                  <p className="text-sm text-purple-800 dark:text-purple-200">{report.ai_analysis.summary}</p>
                </div>
              )}

              {/* Key Insights */}
              {report.ai_analysis.key_insights && report.ai_analysis.key_insights.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-purple-600 dark:text-purple-400">תובנות מרכזיות:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {report.ai_analysis.key_insights.map((insight, index) => (
                      <li key={index} className="text-sm">{insight}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Analysis Details */}
              {report.ai_analysis.analysis && (
                <div className="space-y-4">
                  {/* AI Risks */}
                  {report.ai_analysis.analysis.risks && report.ai_analysis.analysis.risks.length > 0 && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <h4 className="font-semibold mb-2 text-red-600 dark:text-red-400">סיכונים שנזוהו:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {report.ai_analysis.analysis.risks.map((risk, index) => (
                          <li key={index} className="text-sm text-red-800 dark:text-red-200">{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* AI Advantages */}
                  {report.ai_analysis.analysis.advantages && report.ai_analysis.analysis.advantages.length > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <h4 className="font-semibold mb-2 text-green-600 dark:text-green-400">יתרונות שנזוהו:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {report.ai_analysis.analysis.advantages.map((advantage, index) => (
                          <li key={index} className="text-sm text-green-800 dark:text-green-200">{advantage}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* AI Recommendations */}
                  {report.ai_analysis.analysis.recommendations && report.ai_analysis.analysis.recommendations.length > 0 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <h4 className="font-semibold mb-2 text-blue-600 dark:text-blue-400">המלצות מקצועיות:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {report.ai_analysis.analysis.recommendations.map((recommendation, index) => (
                          <li key={index} className="text-sm text-blue-800 dark:text-blue-200">{recommendation}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Potential Assessment */}
                  {report.ai_analysis.analysis.potential_assessment && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <h4 className="font-semibold mb-2 text-yellow-600 dark:text-yellow-400">הערכת פוטנציאל:</h4>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 whitespace-pre-line">
                        {report.ai_analysis.analysis.potential_assessment}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
      </SubscriptionGate>
    </div>
  );
}

