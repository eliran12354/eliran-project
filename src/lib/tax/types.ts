/** תגובות API מחשבונות מס — מסונכרן עם backend */
export interface BreakdownStep {
  stepId: string;
  labelHe: string;
  formula?: string;
  amount?: number;
  rate?: number;
  tax?: number;
  bracketRange?: string;
}

export interface TaxCalculationResult {
  estimatedTax: number;
  effectiveTaxRate: number;
  taxableBase: number;
  appliedRuleVersion: { id: string; versionName: string; effectiveFrom: string };
  breakdown: BreakdownStep[];
  warnings: string[];
  disclaimer: string;
}

export type BuyerCategory =
  | "single_home"
  | "additional_home"
  | "foreign_resident"
  | "new_immigrant";
