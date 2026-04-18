import { z } from 'zod';

export const hotInvestorBoardCategorySchema = z.enum([
  'pinui_binui',
  'up_to_1m',
  'land_thaw',
]);

export const createHotInvestorBoardSchema = z.object({
  category: hotInvestorBoardCategorySchema,
  title: z.string().min(1, 'נדרש כותרת').max(200),
  subtitle: z.string().max(300).nullable().optional(),
  description: z.string().max(8000).nullable().optional(),
  price_label: z.string().max(120).nullable().optional(),
  location_label: z.string().max(200).nullable().optional(),
  contact_phone: z.string().max(40).nullable().optional(),
  contact_email: z.string().email('אימייל לא תקין').max(200).nullable().optional(),
  external_link: z.string().url('קישור לא תקין').max(2000).nullable().optional(),
  image_url: z.string().max(2_000_000).nullable().optional(),
  display_order: z.number().int().min(0).max(9999).optional(),
  is_published: z.boolean().optional(),
});

export const updateHotInvestorBoardSchema = createHotInvestorBoardSchema.partial();
