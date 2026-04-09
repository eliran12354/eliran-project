import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { postPurchaseTax } from "@/lib/api/taxApi";
import type { BuyerCategory, TaxCalculationResult } from "@/lib/tax/types";
import { purchaseTaxFormSchema } from "@/lib/validation/tax";
import { CalculationResult } from "./CalculationResult";

const BUYER_LABELS: Record<BuyerCategory, string> = {
  single_home: "דירה יחידה (רוכש מתאים)",
  additional_home: "דירה נוספת",
  foreign_resident: "תושב חוץ",
  new_immigrant: "עולה חדש",
};

const PROPERTY_TYPES = [
  { value: "residential", label: "מגורים" },
  { value: "commercial", label: "מסחרי" },
  { value: "land", label: "קרקע" },
];

/** קודי זכאות לדוגמה — חייבים להתאים לשורות ב-purchase_tax_adjustments ב-Supabase */
const MOCK_ELIGIBILITY = [
  { code: "MOCK_EXEMPT_FULL", label: "דוגמה: פטור מלא (בדיקה בלבד)" },
  { code: "MOCK_DISCOUNT_10", label: "דוגמה: הנחה 10% (בדיקה בלבד)" },
];

export function PurchaseTaxCalculator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [transactionDate, setTransactionDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [propertyValue, setPropertyValue] = useState("");
  const [propertyType, setPropertyType] = useState("residential");
  const [buyerCategory, setBuyerCategory] = useState<BuyerCategory>("single_home");
  const [ownershipFraction, setOwnershipFraction] = useState("1");
  const [isResident, setIsResident] = useState(true);
  const [isFirstAndOnlyHome, setIsFirstAndOnlyHome] = useState(false);
  const [eligibility, setEligibility] = useState<Record<string, boolean>>({});

  const toggleCode = (code: string, checked: boolean) => {
    setEligibility((prev) => ({ ...prev, [code]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const specialEligibilityCodes = Object.entries(eligibility)
      .filter(([, v]) => v)
      .map(([k]) => k);

    const raw = {
      transactionDate,
      propertyValue: Number(propertyValue.replace(/,/g, "")),
      propertyType,
      buyerCategory,
      ownershipFraction: Number(ownershipFraction),
      specialEligibilityCodes,
      isResident,
      isFirstAndOnlyHome,
    };

    const parsed = purchaseTaxFormSchema.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues.map((x) => x.message).join(" · ") || "קלט לא תקין");
      return;
    }

    const body = {
      ...parsed.data,
      transactionDate: parsed.data.transactionDate,
    };

    try {
      setLoading(true);
      const data = await postPurchaseTax({
        ...body,
        transactionDate: body.transactionDate,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא חשובה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-blue-100 shadow-sm">
      <CardHeader>
        <CardTitle className="text-blue-800">מחשבון מס רכישה</CardTitle>
        <CardDescription>
          מחיר הנכס וקטגוריית הרוכש נשלחים לשרת; המדרגות נטענות ממסד הנתונים לפי תאריך העסקה.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pt-date">תאריך עסקה</Label>
              <Input
                id="pt-date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pt-value">שווי / מחיר הנכס (₪)</Label>
              <Input
                id="pt-value"
                type="number"
                min={0}
                step={1000}
                value={propertyValue}
                onChange={(e) => setPropertyValue(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>סוג נכס</Label>
              <Select value={propertyType} onValueChange={setPropertyType} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>קטגוריית רוכש</Label>
              <Select
                value={buyerCategory}
                onValueChange={(v) => setBuyerCategory(v as BuyerCategory)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(BUYER_LABELS) as BuyerCategory[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {BUYER_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pt-frac">חלק בבעלות (0–1)</Label>
              <Input
                id="pt-frac"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={ownershipFraction}
                onChange={(e) => setOwnershipFraction(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Checkbox
                id="pt-res"
                checked={isResident}
                onCheckedChange={(v) => setIsResident(!!v)}
                disabled={loading}
              />
              <Label htmlFor="pt-res" className="font-normal">
                תושב ישראל
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="pt-first"
                checked={isFirstAndOnlyHome}
                onCheckedChange={(v) => setIsFirstAndOnlyHome(!!v)}
                disabled={loading}
              />
              <Label htmlFor="pt-first" className="font-normal">
                דירה ראשונה ויחידה (לשימוש מידעי)
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>זכאות מיוחדת</Label>
            <div className="space-y-2 rounded-md border border-dashed p-3">
              {MOCK_ELIGIBILITY.map((m) => (
                <div key={m.code} className="flex items-center gap-2">
                  <Checkbox
                    id={m.code}
                    checked={!!eligibility[m.code]}
                    onCheckedChange={(v) => toggleCode(m.code, !!v)}
                    disabled={loading}
                  />
                  <Label htmlFor={m.code} className="font-normal">
                    {m.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="ms-2 size-4 animate-spin" />
                מחשב…
              </>
            ) : (
              "חשב מס רכישה"
            )}
          </Button>
        </form>

        <CalculationResult result={result} error={error} />
      </CardContent>
    </Card>
  );
}
