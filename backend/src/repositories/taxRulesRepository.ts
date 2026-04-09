import { supabase } from '../config/database.js';
import type {
  CapitalGainsRuleRow,
  PurchaseTaxAdjustmentRow,
  PurchaseTaxBracketRow,
  TaxRuleVersion,
  TaxType,
} from '../tax/types.js';

function mapVersion(row: Record<string, unknown>): TaxRuleVersion {
  return {
    id: String(row.id),
    taxType: row.tax_type as TaxRuleVersion['taxType'],
    versionName: String(row.version_name),
    effectiveFrom: String(row.effective_from).slice(0, 10),
    effectiveTo: row.effective_to ? String(row.effective_to).slice(0, 10) : null,
    isActive: Boolean(row.is_active),
  };
}

function mapBracket(row: Record<string, unknown>): PurchaseTaxBracketRow {
  return {
    id: String(row.id),
    ruleVersionId: String(row.rule_version_id),
    buyerCategory: String(row.buyer_category),
    minAmount: Number(row.min_amount),
    maxAmount: row.max_amount != null ? Number(row.max_amount) : null,
    rate: Number(row.rate),
    fixedAmount: row.fixed_amount != null ? Number(row.fixed_amount) : null,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapAdjustment(row: Record<string, unknown>): PurchaseTaxAdjustmentRow {
  return {
    id: String(row.id),
    ruleVersionId: String(row.rule_version_id),
    code: String(row.code),
    labelHe: String(row.label_he),
    adjustmentType: row.adjustment_type as PurchaseTaxAdjustmentRow['adjustmentType'],
    value: row.value != null ? Number(row.value) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function mapCapitalGains(row: Record<string, unknown>): CapitalGainsRuleRow {
  return {
    id: String(row.id),
    ruleVersionId: String(row.rule_version_id),
    assetType: String(row.asset_type),
    baseTaxRate: row.base_tax_rate != null ? Number(row.base_tax_rate) : null,
    allowPurchaseTaxDeduction: Boolean(row.allow_purchase_tax_deduction ?? true),
    allowBrokerFeeDeduction: Boolean(row.allow_broker_fee_deduction ?? true),
    allowLawyerFeeDeduction: Boolean(row.allow_lawyer_fee_deduction ?? true),
    allowRenovationDeduction: Boolean(row.allow_renovation_deduction ?? true),
    estimatorOnly: Boolean(row.estimator_only ?? true),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

/**
 * מחזיר את גרסת הכללים הפעילה לתאריך (לפי tax_type).
 */
export async function getActiveRuleVersionByDate(
  taxType: TaxType,
  asOfDate: string
): Promise<TaxRuleVersion | null> {
  const { data, error } = await supabase
    .from('tax_rule_versions')
    .select('*')
    .eq('tax_type', taxType)
    .eq('is_active', true)
    .lte('effective_from', asOfDate)
    .order('effective_from', { ascending: false });

  if (error) throw new Error(`tax_rule_versions: ${error.message}`);
  const rows = (data ?? []) as Record<string, unknown>[];
  const valid = rows.filter((row) => {
    const to = row.effective_to;
    if (to == null || to === '') return true;
    const toStr = String(to).slice(0, 10);
    return toStr >= asOfDate;
  });
  const first = valid[0];
  if (!first) return null;
  return mapVersion(first);
}

export async function getPurchaseBrackets(ruleVersionId: string): Promise<PurchaseTaxBracketRow[]> {
  const { data, error } = await supabase
    .from('purchase_tax_brackets')
    .select('*')
    .eq('rule_version_id', ruleVersionId)
    .order('sort_order', { ascending: true })
    .order('min_amount', { ascending: true });

  if (error) throw new Error(`purchase_tax_brackets: ${error.message}`);
  return (data ?? []).map((r) => mapBracket(r as Record<string, unknown>));
}

export async function getPurchaseAdjustments(ruleVersionId: string): Promise<PurchaseTaxAdjustmentRow[]> {
  const { data, error } = await supabase
    .from('purchase_tax_adjustments')
    .select('*')
    .eq('rule_version_id', ruleVersionId);

  if (error) throw new Error(`purchase_tax_adjustments: ${error.message}`);
  return (data ?? []).map((r) => mapAdjustment(r as Record<string, unknown>));
}

export async function getCapitalGainsRule(
  ruleVersionId: string,
  assetType: string
): Promise<CapitalGainsRuleRow | null> {
  const { data, error } = await supabase
    .from('capital_gains_rules')
    .select('*')
    .eq('rule_version_id', ruleVersionId)
    .eq('asset_type', assetType)
    .maybeSingle();

  if (error) throw new Error(`capital_gains_rules: ${error.message}`);
  if (!data) return null;
  return mapCapitalGains(data as Record<string, unknown>);
}

/** לוג חישוב — insert עם service role בלבד */
export async function insertCalculationLog(params: {
  userId: string | null;
  calculatorType: string;
  inputPayload: unknown;
  resultPayload: unknown;
  ruleVersionId: string | null;
}): Promise<void> {
  const { error } = await supabase.from('calculation_logs').insert({
    user_id: params.userId,
    calculator_type: params.calculatorType,
    input_payload: params.inputPayload,
    result_payload: params.resultPayload,
    rule_version_id: params.ruleVersionId,
  });

  if (error) {
    console.error('[calculation_logs]', error.message);
  }
}
