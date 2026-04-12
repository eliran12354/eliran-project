import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createProfessional,
  deleteProfessional,
  listAllProfessionalsForAdmin,
  listPublishedProfessionals,
  updateProfessional,
} from '../services/featuredProfessionalsService.js';
import {
  createFeaturedProfessionalSchema,
  updateFeaturedProfessionalSchema,
} from '../validation/featuredProfessionalsSchemas.js';

const uuidParam = z.string().uuid('מזהה לא תקין');

function normalizeCreateBody(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const str = (k: string): unknown => {
    const v = raw[k];
    if (v === '' || v === undefined) return undefined;
    return v;
  };
  return {
    ...raw,
    name: raw.name,
    headline: str('headline'),
    description: str('description'),
    city: str('city'),
    phone: str('phone'),
    email: str('email'),
    website_url: str('website_url'),
    whatsapp: str('whatsapp'),
    image_url: str('image_url'),
  };
}

function normalizePatchBody(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    const v = raw[key];
    if (v === '') {
      if (key === 'name') continue;
      out[key] = null;
    } else if (v !== undefined) {
      out[key] = v;
    }
  }
  return out;
}

export async function getPublicFeaturedProfessionals(_req: Request, res: Response): Promise<void> {
  try {
    const professionals = await listPublishedProfessionals();
    res.json({ professionals });
  } catch (e: unknown) {
    console.error('getPublicFeaturedProfessionals:', e);
    res.status(500).json({ success: false, error: 'לא ניתן לטעון את רשימת בעלי המקצוע' });
  }
}

export async function getAdminFeaturedProfessionals(_req: Request, res: Response): Promise<void> {
  try {
    const professionals = await listAllProfessionalsForAdmin();
    res.json({ professionals });
  } catch (e: unknown) {
    console.error('getAdminFeaturedProfessionals:', e);
    res.status(500).json({ success: false, error: 'לא ניתן לטעון את הרשימה' });
  }
}

export async function postAdminFeaturedProfessional(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createFeaturedProfessionalSchema.safeParse(normalizeCreateBody(req.body as Record<string, unknown>));
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.errors[0]?.message ?? 'נתונים לא תקינים';
      res.status(400).json({ success: false, error: msg });
      return;
    }
    const row = await createProfessional(parsed.data);
    res.status(201).json({ success: true, professional: row });
  } catch (e: unknown) {
    console.error('postAdminFeaturedProfessional:', e);
    res.status(500).json({ success: false, error: 'לא ניתן ליצור רשומה' });
  }
}

export async function patchAdminFeaturedProfessional(req: Request, res: Response): Promise<void> {
  try {
    const idParse = uuidParam.safeParse(req.params.id);
    if (!idParse.success) {
      res.status(400).json({ success: false, error: 'מזהה לא תקין' });
      return;
    }
    const id = idParse.data;
    const parsed = updateFeaturedProfessionalSchema.safeParse(normalizePatchBody(req.body as Record<string, unknown>));
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.errors[0]?.message ?? 'נתונים לא תקינים';
      res.status(400).json({ success: false, error: msg });
      return;
    }
    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({ success: false, error: 'אין שדות לעדכון' });
      return;
    }
    const row = await updateProfessional(id, parsed.data);
    if (!row) {
      res.status(404).json({ success: false, error: 'הרשומה לא נמצאה' });
      return;
    }
    res.json({ success: true, professional: row });
  } catch (e: unknown) {
    console.error('patchAdminFeaturedProfessional:', e);
    res.status(500).json({ success: false, error: 'לא ניתן לעדכן' });
  }
}

export async function deleteAdminFeaturedProfessional(req: Request, res: Response): Promise<void> {
  try {
    const idParse = uuidParam.safeParse(req.params.id);
    if (!idParse.success) {
      res.status(400).json({ success: false, error: 'מזהה לא תקין' });
      return;
    }
    const deleted = await deleteProfessional(idParse.data);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'הרשומה לא נמצאה' });
      return;
    }
    res.json({ success: true });
  } catch (e: unknown) {
    console.error('deleteAdminFeaturedProfessional:', e);
    res.status(500).json({ success: false, error: 'לא ניתן למחוק' });
  }
}
