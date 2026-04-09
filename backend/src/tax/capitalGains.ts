import type {
  BreakdownStep,
  CapitalGainsInput,
  CapitalGainsResult,
  CapitalGainsRulesContext,
} from './types.js';

const DISCLAIMER_HE =
  'החישוב באתר הוא להערכה ראשונית בלבד ואינו מהווה ייעוץ מס, ייעוץ משפטי או תחליף לבדיקה מקצועית. מס שבח — הערכה בלבד; התוצאה אינה מחייבת ואינה מהווה ייעוץ מס.';

/**
 * הערכת מס שבח — פשטני: רווח × שיעור. אינו כולל אינדקסציה, מבצעים מורכבים או פטורים ספציפיים.
 * TODO: עו״ד מס / רואה חשבון — לאמת נוסחה, שיעור, פטורים וניכויים.
 */
export function estimateCapitalGainsTax(
  input: CapitalGainsInput,
  ctx: CapitalGainsRulesContext
): CapitalGainsResult {
  const warnings: string[] = [
    'מחשבון מס שבח: הערכה בלבד — לא ייעוץ מס. יש להציג בפני רואה חשבון או יועץ מס לפני החלטה.',
  ];

  const { rule, ruleVersion } = ctx;
  if (!rule.estimatorOnly) {
    warnings.push('גרסת כללים מסומנת כלא-מעריכית בלבד — יש לבדוק הגדרות ב-Supabase.');
  }

  let deductions = input.deductibleExpenses;
  const breakdown: BreakdownStep[] = [];

  if (rule.allowLawyerFeeDeduction) {
    deductions += input.lawyerFees;
    breakdown.push({
      stepId: 'ded-lawyer',
      labelHe: 'שכר עורך דין (ניכוי)',
      formula: 'לפי כללים בגרסה',
      amount: input.lawyerFees,
    });
  } else if (input.lawyerFees > 0) {
    warnings.push('שכר עורך דין לא נוכה לפי גרסת הכללים — ההערכה עשויה להיות גבוהה מהמציאות.');
  }

  if (rule.allowBrokerFeeDeduction) {
    deductions += input.brokerFees;
    breakdown.push({
      stepId: 'ded-broker',
      labelHe: 'עמלת תיווך (ניכוי)',
      amount: input.brokerFees,
    });
  } else if (input.brokerFees > 0) {
    warnings.push('עמלת תיווך לא נוכתה לפי גרסת הכללים.');
  }

  if (rule.allowRenovationDeduction) {
    deductions += input.renovationExpenses;
    breakdown.push({
      stepId: 'ded-reno',
      labelHe: 'שיפוצים (ניכוי)',
      amount: input.renovationExpenses,
    });
  } else if (input.renovationExpenses > 0) {
    warnings.push('הוצאות שיפוץ לא נוכו לפי גרסת הכללים.');
  }

  if (rule.allowPurchaseTaxDeduction) {
    deductions += input.purchaseTaxPaid;
    breakdown.push({
      stepId: 'ded-purchase-tax',
      labelHe: 'מס רכישה ששולם (ניכוי)',
      amount: input.purchaseTaxPaid,
    });
  } else if (input.purchaseTaxPaid > 0) {
    warnings.push('מס רכישה לא נוכה לפי גרסת הכללים.');
  }

  const gain = input.salePrice - input.purchasePrice - deductions;

  breakdown.push({
    stepId: 'base',
    labelHe: 'חישוב בסיס לרווח',
    formula: 'מחיר מכירה − מחיר רכישה − ניכויים מותרים',
    amount: gain,
  });

  if (gain < 0) {
    warnings.push('התקבל בסיס שלילי (הפסד או נתונים חסרים) — מס משוער 0.');
    return {
      estimatedTax: 0,
      effectiveTaxRate: 0,
      taxableBase: Math.max(0, gain),
      appliedRuleVersion: {
        id: ruleVersion.id,
        versionName: ruleVersion.versionName,
        effectiveFrom: ruleVersion.effectiveFrom,
      },
      breakdown,
      warnings,
      disclaimer: DISCLAIMER_HE,
    };
  }

  // שיעור ברירת מחדל לדוגמה בלבד — חייב להגיע מטבלה; אחרת 25% placeholder
  // TODO: CPA — שיעור אמיתי לפי סוג נכס ושנות החזקה
  const rate =
    rule.baseTaxRate != null && rule.baseTaxRate >= 0
      ? Number(rule.baseTaxRate)
      : 0.25;
  if (rule.baseTaxRate == null) {
    warnings.push('שיעור מס לא הוגדר בטבלה — בשימוש שיעור placeholder של 25% (דוגמה בלבד).');
  }

  const tax = gain * rate;

  breakdown.push({
    stepId: 'apply-rate',
    labelHe: 'החלת שיעור מס על הרווח החייב',
    formula: 'רווח חייב × שיעור (מבוסס נתוני גרסה)',
    amount: gain,
    rate,
    tax,
  });

  if (input.exemptionEligibilityCodes.length > 0) {
    warnings.push('קודי פטור/זכאות הוזנו — הלוגיקה כאן אינה מיישמת פטורים; נדרש ייעוץ מקצועי.');
  }

  const sale = input.salePrice;
  const effectiveTaxRate = sale > 0 ? tax / sale : 0;

  return {
    estimatedTax: roundMoney(tax),
    effectiveTaxRate,
    taxableBase: gain,
    appliedRuleVersion: {
      id: ruleVersion.id,
      versionName: ruleVersion.versionName,
      effectiveFrom: ruleVersion.effectiveFrom,
    },
    breakdown,
    warnings,
    disclaimer: DISCLAIMER_HE,
  };
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
