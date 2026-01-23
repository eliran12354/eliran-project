import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type IdentificationType = "parcel" | "address";

interface TabuRequestForm {
  identification_type: IdentificationType;
  // גוש/חלקה
  gush?: string;
  helka?: string;
  sub_helka?: string;
  // כתובת
  city?: string;
  street?: string;
  house_number?: string;
  apartment?: string;
  entrance?: string;
  // סוג נסח
  document_type: "regular" | "consolidated" | "historical";
  // פרטי משתמש
  email: string;
  full_name?: string;
}

export default function TabuRequestPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<TabuRequestForm>({
    identification_type: "address",
    document_type: "regular",
    email: "",
    full_name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email) {
      toast({
        title: "שגיאה",
        description: "יש למלא כתובת אימייל",
        variant: "destructive",
      });
      return;
    }

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

      const { error } = await supabase.from("tabu_requests").insert([
        {
          identification_type: formData.identification_type,
          gush: formData.gush || null,
          helka: formData.helka || null,
          sub_helka: formData.sub_helka || null,
          city: formData.city || null,
          street: formData.street || null,
          house_number: formData.house_number || null,
          apartment: formData.apartment || null,
          document_type: formData.document_type,
          email: formData.email,
          full_name: formData.full_name || null,
        },
      ]);

      if (error) {
        console.error("Error saving request:", error);
        throw error;
      }

      toast({
        title: "הצלחה",
        description: "הבקשה להפקת נסח טאבו נשמרה בהצלחה",
      });

      // Reset form
      setFormData({
        identification_type: "address",
        document_type: "regular",
        email: "",
        full_name: "",
      });
      setCurrentStep(1);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת הבקשה. נסה שוב.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIdentificationTypeChange = (value: IdentificationType) => {
    setFormData((prev) => ({
      ...prev,
      identification_type: value,
      // Clear fields when switching
      gush: undefined,
      helka: undefined,
      sub_helka: undefined,
      city: undefined,
      street: undefined,
      house_number: undefined,
      apartment: undefined,
      entrance: undefined,
    }));
  };

  // Calculate progress percentage
  const progressPercentage = (currentStep / 4) * 100;

  return (
    <div className="w-full" dir="rtl">
      <div className="max-w-[960px] mx-auto px-4 py-12">
        {/* Headline */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2 font-display">הפקת נסח טאבו</h1>
          <p className="text-slate-500 dark:text-slate-400">תהליך קצר ופשוט לקבלת מידע ממרשם המקרקעין</p>
        </div>

        {/* Progress Stepper */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 mb-8">
          <div className="flex justify-between relative mb-12">
            {/* Progress Line Background */}
            <div className="absolute top-5 right-0 left-0 h-0.5 bg-slate-100 dark:bg-slate-800 z-0"></div>
            {/* Active Progress Line */}
            <div 
              className="absolute top-5 right-0 h-0.5 bg-primary z-0 transition-all duration-300" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
            
            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className={`size-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                currentStep >= 1 
                  ? 'bg-primary text-white' 
                  : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400'
              }`}>
                1
              </div>
              <span className={`text-sm font-bold ${
                currentStep >= 1 ? 'text-primary' : 'text-slate-400 font-medium'
              }`}>
                זיהוי נכס
              </span>
            </div>
            
            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className={`size-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                currentStep >= 2 
                  ? 'bg-primary text-white' 
                  : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400'
              }`}>
                2
              </div>
              <span className={`text-sm font-bold ${
                currentStep >= 2 ? 'text-primary' : 'text-slate-400 font-medium'
              }`}>
                פרטי נכס
              </span>
            </div>
            
            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className={`size-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                currentStep >= 3 
                  ? 'bg-primary text-white' 
                  : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400'
              }`}>
                3
              </div>
              <span className={`text-sm font-bold ${
                currentStep >= 3 ? 'text-primary' : 'text-slate-400 font-medium'
              }`}>
                סוג נסח
              </span>
            </div>
            
            {/* Step 4 */}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className={`size-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                currentStep >= 4 
                  ? 'bg-primary text-white' 
                  : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400'
              }`}>
                4
              </div>
              <span className={`text-sm font-bold ${
                currentStep >= 4 ? 'text-primary' : 'text-slate-400 font-medium'
              }`}>
                פרטי משתמש
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Section 1: Identification Method */}
            <section>
              <div className="flex items-center gap-2 mb-6 border-r-4 border-primary pr-4">
                <h2 className="text-xl font-bold">שלב 1: בחירת שיטת זיהוי</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`group relative flex flex-col p-6 cursor-pointer rounded-lg border transition-all ${
                  formData.identification_type === 'address'
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary'
                }`}>
                  <input
                    type="radio"
                    name="id_method"
                    value="address"
                    checked={formData.identification_type === 'address'}
                    onChange={() => {
                      handleIdentificationTypeChange('address');
                      setCurrentStep(2);
                    }}
                    className="invisible absolute"
                  />
                  <div className="flex items-center gap-4">
                    <span className={`material-symbols-outlined transition-transform ${
                      formData.identification_type === 'address' ? 'text-primary scale-110' : 'text-slate-400 group-hover:text-primary'
                    }`}>
                      location_on
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-slate-100">חיפוש לפי כתובת</span>
                      <span className="text-xs text-slate-500">איתור הנכס לפי עיר, רחוב ומספר בית</span>
                    </div>
                  </div>
                </label>
                
                <label className={`group relative flex flex-col p-6 cursor-pointer rounded-lg border transition-all ${
                  formData.identification_type === 'parcel'
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary'
                }`}>
                  <input
                    type="radio"
                    name="id_method"
                    value="parcel"
                    checked={formData.identification_type === 'parcel'}
                    onChange={() => {
                      handleIdentificationTypeChange('parcel');
                      setCurrentStep(2);
                    }}
                    className="invisible absolute"
                  />
                  <div className="flex items-center gap-4">
                    <span className={`material-symbols-outlined transition-colors ${
                      formData.identification_type === 'parcel' ? 'text-primary scale-110' : 'text-slate-400 group-hover:text-primary'
                    }`}>
                      grid_view
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-slate-100">חיפוש לפי גוש/חלקה</span>
                      <span className="text-xs text-slate-500">איתור הנכס לפי המידע הרשום בטאבו</span>
                    </div>
                  </div>
                </label>
              </div>
            </section>

            {/* Section 2: Property Details */}
            <section>
              <div className="flex items-center gap-2 mb-6 border-r-4 border-primary pr-4">
                <h2 className="text-xl font-bold">שלב 2: פרטי הנכס</h2>
              </div>
              
              {formData.identification_type === "parcel" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="font-bold text-sm text-slate-700 dark:text-slate-300">מספר גוש</label>
                    <Input
                      type="text"
                      value={formData.gush || ""}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, gush: e.target.value }));
                        setCurrentStep(3);
                      }}
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-primary h-12 px-4"
                      placeholder="לדוגמה: 30502"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-bold text-sm text-slate-700 dark:text-slate-300">מספר חלקה</label>
                    <Input
                      type="text"
                      value={formData.helka || ""}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, helka: e.target.value }));
                        setCurrentStep(3);
                      }}
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-primary h-12 px-4"
                      placeholder="לדוגמה: 42"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-bold text-sm text-slate-700 dark:text-slate-300">תת-חלקה <span className="text-slate-400 font-normal">(אופציונלי)</span></label>
                    <Input
                      type="text"
                      value={formData.sub_helka || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sub_helka: e.target.value }))}
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-primary h-12 px-4"
                      placeholder="אופציונלי"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-6 flex flex-col gap-2">
                    <label className="font-bold text-sm text-slate-700 dark:text-slate-300">עיר / יישוב</label>
                    <Input
                      type="text"
                      value={formData.city || ""}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, city: e.target.value }));
                        setCurrentStep(3);
                      }}
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-primary h-12 px-4"
                      placeholder="הקלד שם עיר..."
                      required
                    />
                  </div>
                  <div className="md:col-span-6 flex flex-col gap-2">
                    <label className="font-bold text-sm text-slate-700 dark:text-slate-300">רחוב</label>
                    <Input
                      type="text"
                      value={formData.street || ""}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, street: e.target.value }));
                        setCurrentStep(3);
                      }}
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-primary h-12 px-4"
                      placeholder="הקלד שם רחוב..."
                      required
                    />
                  </div>
                  <div className="md:col-span-4 flex flex-col gap-2">
                    <label className="font-bold text-sm text-slate-700 dark:text-slate-300">מספר בית</label>
                    <Input
                      type="number"
                      value={formData.house_number || ""}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, house_number: e.target.value }));
                        setCurrentStep(3);
                      }}
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-primary h-12 px-4"
                      required
                    />
                  </div>
                  <div className="md:col-span-4 flex flex-col gap-2">
                    <label className="font-bold text-sm text-slate-700 dark:text-slate-300">דירה <span className="text-slate-400 font-normal">(אופציונלי)</span></label>
                    <Input
                      type="number"
                      value={formData.apartment || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, apartment: e.target.value }))}
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-primary h-12 px-4"
                    />
                  </div>
                  <div className="md:col-span-4 flex flex-col gap-2">
                    <label className="font-bold text-sm text-slate-700 dark:text-slate-300">כניסה</label>
                    <Input
                      type="text"
                      value={formData.entrance || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, entrance: e.target.value }))}
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-primary h-12 px-4"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Section 3: Extract Type */}
            <section>
              <div className="flex items-center gap-2 mb-6 border-r-4 border-primary pr-4">
                <h2 className="text-xl font-bold">שלב 3: סוג הנסח המבוקש</h2>
              </div>
              <div className="max-w-md flex flex-col gap-2">
                <label className="font-bold text-sm text-slate-700 dark:text-slate-300">סוג נסח</label>
                <div className="relative">
                  <Select
                    value={formData.document_type}
                    onValueChange={(value: "regular" | "consolidated" | "historical") => {
                      setFormData((prev) => ({ ...prev, document_type: value }));
                      setCurrentStep(4);
                    }}
                  >
                    <SelectTrigger className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-primary h-12 px-4 appearance-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">נסח מלא</SelectItem>
                      <SelectItem value="consolidated">נסח מרוכז</SelectItem>
                      <SelectItem value="historical">נסח היסטורי</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="material-symbols-outlined absolute left-3 top-3 pointer-events-none text-slate-400">expand_more</span>
                </div>
              </div>
            </section>

            {/* Section 4: User Details */}
            <section>
              <div className="flex items-center gap-2 mb-6 border-r-4 border-primary pr-4">
                <h2 className="text-xl font-bold">שלב 4: פרטי המזמין</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-bold text-sm text-slate-700 dark:text-slate-300">שם מלא</label>
                  <Input
                    type="text"
                    value={formData.full_name || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-primary h-12 px-4"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-bold text-sm text-slate-700 dark:text-slate-300">כתובת דואר אלקטרוני</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, email: e.target.value }));
                      setCurrentStep(4);
                    }}
                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-primary h-12 px-4"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">הנסח המופק יישלח לכתובת אימייל זו מיד עם סיום הטיפול.</p>
                </div>
              </div>
            </section>

            {/* Footer Buttons */}
            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row-reverse items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row-reverse items-center gap-4 w-full md:w-auto">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-10 rounded-lg transition-colors w-full md:w-auto flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      שומר...
                    </>
                  ) : (
                    <>
                      שמור בקשה והמשך לתשלום
                      <span className="material-symbols-outlined text-sm" style={{ transform: 'scaleX(-1)' }}>arrow_forward</span>
                    </>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      identification_type: "address",
                      document_type: "regular",
                      email: "",
                      full_name: "",
                    });
                    setCurrentStep(1);
                  }}
                  className="text-slate-500 hover:text-red-600 font-medium px-6 py-2 transition-colors"
                >
                  ביטול
                </button>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="material-symbols-outlined text-sm">lock</span>
                <span className="text-xs">מידע זה מאובטח ומוגן על ידי משרד המשפטים</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
