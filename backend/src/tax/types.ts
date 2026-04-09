/**
 * טיפוסים לחישובי מס — לוגיקה טהורה בלבד, ללא תלות ב-React.
 * TODO: CPA / עו״ד מס — לאמת מול חוקי מס רכישה ושבח בפועל.
 */

export type TaxType = 'purchase' | 'capital_gains';

export type BuyerCategory =
  | 'single_home'
  | 'additional_home'
  | 'foreign_resident'
  | 'new_immigrant';

export type PurchaseTaxAdjustmentType =
  | 'exemption_full'
  | 'discount_percent'
  | 'discount_fixed'
  | 'other';

export interface TaxRuleVersion {
  id: string;
  taxType: TaxType;
  versionName: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface PurchaseTaxBracketRow {
  id: string;
  ruleVersionId: string;
  buyerCategory: string;
  minAmount: number;
  maxAmount: number | null;
  rate: number;
  fixedAmount: number | null;
  sortOrder: number;
}

export interface PurchaseTaxAdjustmentRow {
  id: string;
  ruleVersionId: string;
  code: string;
  labelHe: string;
  adjustmentType: PurchaseTaxAdjustmentType;
  value: number | null;
  metadata: Record<string, unknown>;
}

export interface CapitalGainsRuleRow {
  id: string;
  ruleVersionId: string;
  assetType: string;
  baseTaxRate: number | null;
  allowPurchaseTaxDeduction: boolean;
  allowBrokerFeeDeduction: boolean;
  allowLawyerFeeDeduction: boolean;
  allowRenovationDeduction: boolean;
  estimatorOnly: boolean;
  metadata: Record<string, unknown>;
}

export interface PurchaseTaxInput {
  transactionDate: string;
  propertyValue: number;
  propertyType: string;
  buyerCategory: BuyerCategory;
  ownershipFraction: number;
  specialEligibilityCodes: string[];
  isResident: boolean;
  isFirstAndOnlyHome: boolean;
}

export interface CapitalGainsInput {
  purchaseDate: string;
  saleDate: string;
  purchasePrice: number;
  salePrice: number;
  deductibleExpenses: number;
  lawyerFees: number;
  brokerFees: number;
  renovationExpenses: number;
  purchaseTaxPaid: number;
  assetType: string;
  exemptionEligibilityCodes: string[];
}

export interface BreakdownStep {
  /** מזהה טכני לביקורת */
  stepId: string;
  labelHe: string;
  formula?: string;
  /** סכומים ביניים — שקלים */
  amount?: number;
  rate?: number;
  tax?: number;
  bracketRange?: string;
}

export interface PurchaseTaxResult {
  estimatedTax: number;
  effectiveTaxRate: number;
  taxableBase: number;
  appliedRuleVersion: { id: string; versionName: string; effectiveFrom: string };
  breakdown: BreakdownStep[];
  warnings: string[];
  disclaimer: string;
}

export interface CapitalGainsResult {
  estimatedTax: number;
  effectiveTaxRate: number;
  taxableBase: number;
  appliedRuleVersion: { id: string; versionName: string; effectiveFrom: string };
  breakdown: BreakdownStep[];
  warnings: string[];
  disclaimer: string;
}

export interface PurchaseTaxRulesContext {
  ruleVersion: TaxRuleVersion;
  brackets: PurchaseTaxBracketRow[];
  adjustments: PurchaseTaxAdjustmentRow[];
}

export interface CapitalGainsRulesContext {
  ruleVersion: TaxRuleVersion;
  rule: CapitalGainsRuleRow;
}
