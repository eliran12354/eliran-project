import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { postCapitalGains } from "@/lib/api/taxApi";
import type { TaxCalculationResult } from "@/lib/tax/types";
import { capitalGainsFormSchema } from "@/lib/validation/tax";
import { CalculationResult } from "./CalculationResult";

const ASSET_TYPES = [
  { value: "residential", label: "מגורים" },
  { value: "commercial", label: "מסחרי" },
  { value: "land", label: "קרקע" },
];

export function CapitalGainsCalculator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [purchaseDate, setPurchaseDate] = useState("2020-01-01");
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [purchasePrice, setPurchasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [deductibleExpenses, setDeductibleExpenses] = useState("0");
  const [lawyerFees, setLawyerFees] = useState("0");
  const [brokerFees, setBrokerFees] = useState("0");
  const [renovationExpenses, setRenovationExpenses] = useState("0");
  const [purchaseTaxPaid, setPurchaseTaxPaid] = useState("0");
  const [assetType, setAssetType] = useState("residential");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const raw = {
      purchaseDate,
      saleDate,
      purchasePrice: Number(purchasePrice.replace(/,/g, "")),
      salePrice: Number(salePrice.replace(/,/g, "")),
      deductibleExpenses: Number(deductibleExpenses),
      lawyerFees: Number(lawyerFees),
      brokerFees: Number(brokerFees),
      renovationExpenses: Number(renovationExpenses),
      purchaseTaxPaid: Number(purchaseTaxPaid),
      assetType,
      exemptionEligibilityCodes: [] as string[],
    };

    const parsed = capitalGainsFormSchema.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues.map((x) => x.message).join(" · ") || "קלט לא תקין");
      return;
    }

    try {
      setLoading(true);
      const data = await postCapitalGains({
        ...parsed.data,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא חשובה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-amber-100 shadow-sm">
      <CardHeader>
        <CardTitle className="text-amber-900">הערכת מס שבח (מס שבח)</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cg-purchase">תאריך רכישה</Label>
              <Input
                id="cg-purchase"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cg-sale">תאריך מכירה</Label>
              <Input
                id="cg-sale"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cg-purchase-p">מחיר רכישה (₪)</Label>
              <Input
                id="cg-purchase-p"
                type="number"
                min={0}
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cg-sale-p">מחיר מכירה (₪)</Label>
              <Input
                id="cg-sale-p"
                type="number"
                min={0}
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>סוג נכס</Label>
            <Select value={assetType} onValueChange={setAssetType} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cg-ded">הוצאות מוכרות (ניכוי כללי)</Label>
              <Input
                id="cg-ded"
                type="number"
                min={0}
                value={deductibleExpenses}
                onChange={(e) => setDeductibleExpenses(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cg-lawyer">שכר עורך דין</Label>
              <Input
                id="cg-lawyer"
                type="number"
                min={0}
                value={lawyerFees}
                onChange={(e) => setLawyerFees(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cg-broker">שכר תיווך</Label>
              <Input
                id="cg-broker"
                type="number"
                min={0}
                value={brokerFees}
                onChange={(e) => setBrokerFees(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cg-reno">שיפוצים</Label>
              <Input
                id="cg-reno"
                type="number"
                min={0}
                value={renovationExpenses}
                onChange={(e) => setRenovationExpenses(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cg-pt">מס רכישה ששולם</Label>
              <Input
                id="cg-pt"
                type="number"
                min={0}
                value={purchaseTaxPaid}
                onChange={(e) => setPurchaseTaxPaid(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="ms-2 size-4 animate-spin" />
                מחשב…
              </>
            ) : (
              "הערך מס שבח (הערכה בלבד)"
            )}
          </Button>
        </form>

        <CalculationResult result={result} error={error} isCapitalGainsEstimator />
      </CardContent>
    </Card>
  );
}
