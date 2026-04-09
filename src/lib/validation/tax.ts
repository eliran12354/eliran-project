import { z } from "zod";

const buyerCategorySchema = z.enum([
  "single_home",
  "additional_home",
  "foreign_resident",
  "new_immigrant",
]);

export const purchaseTaxFormSchema = z.object({
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך בפורמט YYYY-MM-DD"),
  propertyValue: z.coerce.number().nonnegative(),
  propertyType: z.string().min(1),
  buyerCategory: buyerCategorySchema,
  ownershipFraction: z.coerce.number().min(0).max(1),
  specialEligibilityCodes: z.array(z.string()),
  isResident: z.boolean(),
  isFirstAndOnlyHome: z.boolean(),
});

export const capitalGainsFormSchema = z
  .object({
    purchaseDate: z.string().min(1),
    saleDate: z.string().min(1),
    purchasePrice: z.coerce.number().nonnegative(),
    salePrice: z.coerce.number().nonnegative(),
    deductibleExpenses: z.coerce.number().nonnegative(),
    lawyerFees: z.coerce.number().nonnegative(),
    brokerFees: z.coerce.number().nonnegative(),
    renovationExpenses: z.coerce.number().nonnegative(),
    purchaseTaxPaid: z.coerce.number().nonnegative(),
    assetType: z.string().min(1),
    exemptionEligibilityCodes: z.array(z.string()),
  })
  .refine((d) => new Date(d.saleDate) >= new Date(d.purchaseDate), {
    message: "תאריך מכירה חייב להיות אחרי או שווה לתאריך רכישה",
  });

export type PurchaseTaxFormValues = z.infer<typeof purchaseTaxFormSchema>;
export type CapitalGainsFormValues = z.infer<typeof capitalGainsFormSchema>;
