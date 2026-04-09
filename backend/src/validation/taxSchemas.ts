import { z } from 'zod';

const buyerCategorySchema = z.enum(['single_home', 'additional_home', 'foreign_resident', 'new_immigrant']);

export const purchaseTaxRequestSchema = z.object({
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  propertyValue: z.number().nonnegative(),
  propertyType: z.string().min(1),
  buyerCategory: buyerCategorySchema,
  ownershipFraction: z.number().min(0).max(1),
  specialEligibilityCodes: z.array(z.string()),
  isResident: z.boolean(),
  isFirstAndOnlyHome: z.boolean(),
});

export const capitalGainsRequestSchema = z
  .object({
    purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    purchasePrice: z.number().nonnegative(),
    salePrice: z.number().nonnegative(),
    deductibleExpenses: z.number().nonnegative(),
    lawyerFees: z.number().nonnegative(),
    brokerFees: z.number().nonnegative(),
    renovationExpenses: z.number().nonnegative(),
    purchaseTaxPaid: z.number().nonnegative(),
    assetType: z.string().min(1),
    exemptionEligibilityCodes: z.array(z.string()),
  })
  .refine((d) => new Date(d.saleDate) >= new Date(d.purchaseDate), {
    message: 'תאריך מכירה חייב להיות אחרי או שווה לתאריך רכישה',
  });

export const purchaseTaxResponseSchema = z.object({
  estimatedTax: z.number(),
  effectiveTaxRate: z.number(),
  taxableBase: z.number(),
  appliedRuleVersion: z.object({
    id: z.string(),
    versionName: z.string(),
    effectiveFrom: z.string(),
  }),
  breakdown: z.array(
    z.object({
      stepId: z.string(),
      labelHe: z.string(),
      formula: z.string().optional(),
      amount: z.number().optional(),
      rate: z.number().optional(),
      tax: z.number().optional(),
      bracketRange: z.string().optional(),
    })
  ),
  warnings: z.array(z.string()),
  disclaimer: z.string(),
});

export const capitalGainsResponseSchema = purchaseTaxResponseSchema;

export type PurchaseTaxRequestBody = z.infer<typeof purchaseTaxRequestSchema>;
export type CapitalGainsRequestBody = z.infer<typeof capitalGainsRequestSchema>;
