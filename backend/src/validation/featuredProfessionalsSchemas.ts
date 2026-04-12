import { z } from 'zod';

export const createFeaturedProfessionalSchema = z.object({
  name: z.string().min(1, 'נדרש שם').max(200),
  headline: z.string().max(300).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z.string().max(320).nullable().optional(),
  website_url: z.string().max(2000).nullable().optional(),
  whatsapp: z.string().max(40).nullable().optional(),
  image_url: z.string().max(2000).nullable().optional(),
  display_order: z.number().int().min(-100000).max(100000).optional(),
  is_published: z.boolean().optional(),
});

export const updateFeaturedProfessionalSchema = createFeaturedProfessionalSchema.partial();

export type CreateFeaturedProfessionalBody = z.infer<typeof createFeaturedProfessionalSchema>;
export type UpdateFeaturedProfessionalBody = z.infer<typeof updateFeaturedProfessionalSchema>;
