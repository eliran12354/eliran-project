import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Info } from "lucide-react";
import type { TaxCalculationResult } from "@/lib/tax/types";
import { formatIls, formatPercent } from "@/lib/tax/format";

type Props = {
  result: TaxCalculationResult | null;
  /** מס שבח — הדגשת הערכה בלבד */
  isCapitalGainsEstimator?: boolean;
  error?: string | null;
};

export function CalculationResult({ result, isCapitalGainsEstimator, error }: Props) {
  if (error) {
    return (
      <Alert variant="destructive" className="mt-6 text-right" dir="rtl">
        <AlertTriangle className="size-4" />
        <AlertTitle>שגיאה</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!result) return null;

  return (
    <div className="mt-6 space-y-4" dir="rtl">
      {isCapitalGainsEstimator && (
        <Alert className="border-amber-500/50 bg-amber-500/10 text-right">
          <Info className="size-4 text-amber-700" />
          <AlertTitle className="text-amber-900">הערכת מס שבח בלבד</AlertTitle>
          <AlertDescription className="text-amber-900/90">
            התוצאה אינה מחייבת ואינה מהווה ייעוץ מס. יש להציג בפני רואה חשבון או יועץ מס.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-blue-200/80 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-blue-700">תוצאות</CardTitle>
          <p className="text-sm text-muted-foreground">
            גרסת כללים: {result.appliedRuleVersion.versionName} (מתאריך{" "}
            {result.appliedRuleVersion.effectiveFrom})
          </p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-2">
            <span className="text-muted-foreground">מס משוער</span>
            <span className="text-xl font-bold text-foreground">{formatIls(result.estimatedTax)}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <span className="text-muted-foreground">שיעור מס אפקטיבי</span>
            <span className="font-semibold">{formatPercent(result.effectiveTaxRate)}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <span className="text-muted-foreground">בסיס חיוב</span>
            <span className="font-semibold">{formatIls(result.taxableBase)}</span>
          </div>
        </CardContent>
      </Card>

      {result.warnings.length > 0 && (
        <Alert className="text-right">
          <AlertTriangle className="size-4" />
          <AlertTitle>הערות</AlertTitle>
          <AlertDescription asChild>
            <ul className="list-disc pr-4 pt-1 text-sm">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">פירוט שלבים</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">תיאור</TableHead>
                <TableHead className="text-right">נוסחה</TableHead>
                <TableHead className="text-left">סכומים</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.breakdown.map((row) => (
                <TableRow key={row.stepId}>
                  <TableCell className="align-top text-right font-medium">{row.labelHe}</TableCell>
                  <TableCell className="align-top text-right text-xs text-muted-foreground">
                    {row.formula ?? "—"}
                  </TableCell>
                  <TableCell className="align-top text-left text-xs whitespace-pre-wrap">
                    {row.bracketRange && <div>טווח: {row.bracketRange}</div>}
                    {row.amount != null && <div>סכום: {formatIls(row.amount)}</div>}
                    {row.rate != null && <div>שיעור: {formatPercent(row.rate)}</div>}
                    {row.tax != null && <div>מס: {formatIls(row.tax)}</div>}
                    {row.amount == null && row.rate == null && row.tax == null && "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="rounded-md border border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
        {result.disclaimer}
      </p>
    </div>
  );
}
