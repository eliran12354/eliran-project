import { calculatePurchaseTax } from '../tax/purchaseTax.js';
import { estimateCapitalGainsTax } from '../tax/capitalGains.js';
import type { CapitalGainsInput, PurchaseTaxInput } from '../tax/types.js';
import {
  getActiveRuleVersionByDate,
  getCapitalGainsRule,
  getPurchaseAdjustments,
  getPurchaseBrackets,
  insertCalculationLog,
} from '../repositories/taxRulesRepository.js';

export async function runPurchaseTaxService(
  input: PurchaseTaxInput,
  userId: string | null
) {
  const version = await getActiveRuleVersionByDate('purchase', input.transactionDate);
  if (!version) {
    const err = new Error('NO_RULE_VERSION') as Error & { code?: string };
    err.code = 'NO_RULE_VERSION';
    throw err;
  }

  const [brackets, adjustments] = await Promise.all([
    getPurchaseBrackets(version.id),
    getPurchaseAdjustments(version.id),
  ]);

  const result = calculatePurchaseTax(input, {
    ruleVersion: version,
    brackets,
    adjustments,
  });

  await insertCalculationLog({
    userId,
    calculatorType: 'purchase',
    inputPayload: input,
    resultPayload: result,
    ruleVersionId: version.id,
  });

  return result;
}

export async function runCapitalGainsService(
  input: CapitalGainsInput,
  userId: string | null
) {
  const version = await getActiveRuleVersionByDate('capital_gains', input.saleDate);
  if (!version) {
    const err = new Error('NO_RULE_VERSION') as Error & { code?: string };
    err.code = 'NO_RULE_VERSION';
    throw err;
  }

  const rule = await getCapitalGainsRule(version.id, input.assetType);
  if (!rule) {
    const err = new Error('NO_CAPITAL_GAINS_RULE') as Error & { code?: string };
    err.code = 'NO_CAPITAL_GAINS_RULE';
    throw err;
  }

  const result = estimateCapitalGainsTax(input, { ruleVersion: version, rule });

  await insertCalculationLog({
    userId,
    calculatorType: 'capital_gains',
    inputPayload: input,
    resultPayload: result,
    ruleVersionId: version.id,
  });

  return result;
}
