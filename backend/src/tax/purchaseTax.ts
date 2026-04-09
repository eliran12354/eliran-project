import type {
  BreakdownStep,
  PurchaseTaxBracketRow,
  PurchaseTaxAdjustmentRow,
  PurchaseTaxInput,
  PurchaseTaxResult,
  PurchaseTaxRulesContext,
  TaxRuleVersion,
} from './types.js';

type AdjustmentType = PurchaseTaxAdjustmentRow['adjustmentType'];

const DISCLAIMER_HE =
  'החישוב באתר הוא להערכה ראשונית בלבד ואינו מהווה ייעוץ מס, ייעוץ משפטי או תחליף לבדיקה מקצועית.';

function infinityCap(maxAmount: number | null): number {
  return maxAmount ?? Number.POSITIVE_INFINITY;
}

/**
 * מס רכישה — מדרגות מתקדמות (לא שיעור אחיד על כל הסכום).
 * TODO: CPA — לאמת מבנה מדרגות, שיעורים וחריגים מול חוק.
 */
export function calculatePurchaseTax(
  input: PurchaseTaxInput,
  ctx: PurchaseTaxRulesContext
): PurchaseTaxResult {
  const warnings: string[] = [];
  const { propertyValue, ownershipFraction, specialEligibilityCodes, buyerCategory } = input;

  if (propertyValue <= 0) {
    return emptyResult(ctx.ruleVersion, warnings, 0);
  }

  if (ownershipFraction <= 0 || ownershipFraction > 1) {
    warnings.push('חלק בבעלות חייב להיות בין 0 ל-1 — בוצעה בדיקה לפי הערך שהוזן.');
  }

  const brackets = ctx.brackets
    .filter((b) => b.buyerCategory === buyerCategory)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.minAmount - b.minAmount);

  if (brackets.length === 0) {
    warnings.push(
      `לא נמצאו מדרגות מס בגרסת החוקים עבור קטגוריית רוכש "${buyerCategory}". יש לעדכן נתונים ב-Supabase.`
    );
    return emptyResult(ctx.ruleVersion, warnings, propertyValue);
  }

  const breakdown: BreakdownStep[] = [];
  let totalTax = 0;

  for (const b of brackets) {
    const cap = infinityCap(b.maxAmount);
    const taxableInBracket = Math.max(0, Math.min(propertyValue, cap) - b.minAmount);
    if (taxableInBracket <= 0) continue;

    const ratePart = taxableInBracket * Number(b.rate);
    const fixedPart = b.fixedAmount != null && taxableInBracket > 0 ? Number(b.fixedAmount) : 0;
    const taxForBracket = ratePart + fixedPart;
    totalTax += taxForBracket;

    const maxLabel = b.maxAmount != null ? formatNum(b.maxAmount) : '∞';
    const bracketRange = `${formatNum(b.minAmount)} – ${maxLabel}`;

    breakdown.push({
      stepId: `bracket-${b.id}`,
      labelHe: `מדרגה (${bracketRange} ₪)`,
      formula: `max(0, min(ערך נכס, תקרת מדרגה) − רצפת מדרגה) × שיעור + סכום קבוע (אם קיים)`,
      amount: taxableInBracket,
      rate: b.rate,
      tax: taxForBracket,
      bracketRange,
    });
  }

  breakdown.push({
    stepId: 'pre-ownership',
    labelHe: 'סה״כ מס לפני יישום חלק בבעלות',
    formula: 'סכום מדרגות',
    tax: totalTax,
  });

  const fraction = Math.min(1, Math.max(0, ownershipFraction));
  const taxAfterFraction = totalTax * fraction;

  if (fraction < 1) {
    breakdown.push({
      stepId: 'ownership',
      labelHe: `יישום חלק בבעלות (${(fraction * 100).toFixed(2)}%)`,
      formula: 'מס לפני חלק בבעלות × ownershipFraction',
      amount: taxAfterFraction,
      tax: taxAfterFraction,
    });
  }

  let adjustedTax = taxAfterFraction;

  const applicableAdjustments = ctx.adjustments
    .filter((a) => specialEligibilityCodes.includes(a.code))
    .sort((a, b) => adjustmentPriority(a.adjustmentType) - adjustmentPriority(b.adjustmentType));

  for (const adj of applicableAdjustments) {
    const before = adjustedTax;
    switch (adj.adjustmentType) {
      case 'exemption_full':
        adjustedTax = 0;
        breakdown.push({
          stepId: `adj-${adj.id}`,
          labelHe: `${adj.labelHe} (פטור מלא)`,
          formula: 'מס = 0',
          tax: adjustedTax,
        });
        break;
      case 'discount_percent': {
        const pct = adj.value ?? 0;
        adjustedTax = adjustedTax * (1 - pct / 100);
        breakdown.push({
          stepId: `adj-${adj.id}`,
          labelHe: `${adj.labelHe} (הנחה ${pct}%)`,
          formula: 'מס × (1 − אחוז/100)',
          tax: adjustedTax,
        });
        break;
      }
      case 'discount_fixed': {
        const fixed = adj.value ?? 0;
        adjustedTax = Math.max(0, adjustedTax - fixed);
        breakdown.push({
          stepId: `adj-${adj.id}`,
          labelHe: `${adj.labelHe} (הנחה קבועה)`,
          formula: 'מס − סכום קבוע',
          tax: adjustedTax,
        });
        break;
      }
      default:
        warnings.push(`התאמה "${adj.code}" מסוג "${adj.adjustmentType}" — לא מיושמת אוטומטית. TODO: CPA.`);
        breakdown.push({
          stepId: `adj-${adj.id}`,
          labelHe: adj.labelHe,
          formula: 'לא מחושב — נדרשת הגדרה מקצועית',
          tax: before,
        });
    }
  }

  const effectiveTaxRate = propertyValue > 0 ? adjustedTax / propertyValue : 0;

  if (!input.isResident && buyerCategory !== 'foreign_resident') {
    warnings.push('סיווג רוכש/תושבות עשוי להשפיע על המס בפועל — יש להסתמך על ייעוץ מקצועי.');
  }

  return {
    estimatedTax: roundMoney(adjustedTax),
    effectiveTaxRate,
    taxableBase: propertyValue,
    appliedRuleVersion: {
      id: ctx.ruleVersion.id,
      versionName: ctx.ruleVersion.versionName,
      effectiveFrom: ctx.ruleVersion.effectiveFrom,
    },
    breakdown,
    warnings,
    disclaimer: DISCLAIMER_HE,
  };
}

function emptyResult(
  v: TaxRuleVersion,
  warnings: string[],
  taxableBase: number
): PurchaseTaxResult {
  return {
    estimatedTax: 0,
    effectiveTaxRate: 0,
    taxableBase,
    appliedRuleVersion: { id: v.id, versionName: v.versionName, effectiveFrom: v.effectiveFrom },
    breakdown: [],
    warnings,
    disclaimer: DISCLAIMER_HE,
  };
}

function formatNum(n: number): string {
  return new Intl.NumberFormat('he-IL').format(Math.round(n));
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function adjustmentPriority(t: AdjustmentType): number {
  switch (t) {
    case 'exemption_full':
      return 0;
    case 'discount_percent':
      return 1;
    case 'discount_fixed':
      return 2;
    default:
      return 9;
  }
}
