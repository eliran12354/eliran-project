import { useState } from "react";
import { FileText, Building2, MapPin, Mail, User, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  // סוג נסח
  document_type: "regular" | "consolidated" | "historical";
  // פרטי משתמש
  email: string;
  full_name?: string;
}

export default function TabuRequestPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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
    }));
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold">הפקת נסח טאבו</h2>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            מלא את הפרטים להפקת נסח טאבו מרשם המקרקעין
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="bg-gradient-card shadow-soft border-0">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* סוג הזיהוי */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">1. סוג הזיהוי של הנכס</Label>
              </div>
              
              <RadioGroup
                value={formData.identification_type}
                onValueChange={handleIdentificationTypeChange}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="address" id="address" />
                  <Label htmlFor="address" className="font-normal cursor-pointer">
                    זיהוי לפי כתובת (פשוט)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="parcel" id="parcel" />
                  <Label htmlFor="parcel" className="font-normal cursor-pointer">
                    זיהוי לפי גוש/חלקה (מתקדם)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* פרטי הנכס */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">2. פרטי הנכס</Label>
              </div>

              {formData.identification_type === "parcel" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gush">
                      מספר גוש <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="gush"
                      type="text"
                      value={formData.gush || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, gush: e.target.value }))
                      }
                      required
                      placeholder="לדוגמה: 30502"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="helka">
                      מספר חלקה <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="helka"
                      type="text"
                      value={formData.helka || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, helka: e.target.value }))
                      }
                      required
                      placeholder="לדוגמה: 42"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub_helka">תת-חלקה (אופציונלי)</Label>
                    <Input
                      id="sub_helka"
                      type="text"
                      value={formData.sub_helka || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, sub_helka: e.target.value }))
                      }
                      placeholder="אופציונלי"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">
                      עיר <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      type="text"
                      value={formData.city || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, city: e.target.value }))
                      }
                      required
                      placeholder="לדוגמה: תל אביב"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="street">
                      רחוב <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="street"
                      type="text"
                      value={formData.street || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, street: e.target.value }))
                      }
                      required
                      placeholder="לדוגמה: רחוב הרצל"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="house_number">
                      מספר בית <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="house_number"
                      type="text"
                      value={formData.house_number || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, house_number: e.target.value }))
                      }
                      required
                      placeholder="לדוגמה: 15"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apartment">דירה (אופציונלי)</Label>
                    <Input
                      id="apartment"
                      type="text"
                      value={formData.apartment || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, apartment: e.target.value }))
                      }
                      placeholder="אופציונלי"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* סוג הנסח */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">3. סוג הנסח המבוקש</Label>
              </div>
              
              <Select
                value={formData.document_type}
                onValueChange={(value: "regular" | "consolidated" | "historical") =>
                  setFormData((prev) => ({ ...prev, document_type: value }))
                }
              >
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">נסח רגיל</SelectItem>
                  <SelectItem value="consolidated">נסח מרוכז</SelectItem>
                  <SelectItem value="historical">נסח היסטורי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* פרטי משתמש */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">4. פרטי משתמש</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="w-4 h-4 inline mr-2" />
                    אימייל <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                    placeholder="your.email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    <User className="w-4 h-4 inline mr-2" />
                    שם מלא (אופציונלי)
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={formData.full_name || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                    }
                    placeholder="לדוגמה: יוסי כהן"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6 border-t">
              <Button
                type="submit"
                disabled={loading}
                className="min-w-32 bg-gradient-primary shadow-glow hover:shadow-large"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    שמור בקשה
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}









