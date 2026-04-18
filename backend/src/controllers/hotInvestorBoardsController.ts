import type { Request, Response } from 'express';
import { z } from 'zod';
import * as notificationPreferencesService from '../services/notificationPreferencesService.js';
import * as notificationService from '../services/notificationService.js';
import {
  createBoard,
  deleteBoard,
  getBoardById,
  listAllBoardsForAdmin,
  listPublishedBoards,
  updateBoard,
  type HotInvestorBoardCategory,
} from '../services/hotInvestorBoardsService.js';
import {
  createHotInvestorBoardSchema,
  hotInvestorBoardCategorySchema,
  updateHotInvestorBoardSchema,
} from '../validation/hotInvestorBoardsSchemas.js';

const uuidParam = z.string().uuid('מזהה לא תקין');

const NOTIFICATION_TYPE = 'hot_investor_board_published';
const LINK_PATH = '/hot-investor-boards';

async function notifySubscribersOfPublish(listingId: string, title: string): Promise<void> {
  const userIds =
    await notificationPreferencesService.listUserIdsWithHotInvestorBoardsNotificationsEnabled();
  const link = `${LINK_PATH}?highlight=${listingId}`;
  const safeTitle = title.trim() || 'מודעה חדשה';
  for (const userId of userIds) {
    try {
      await notificationService.createNotification({
        user_id: userId,
        type: NOTIFICATION_TYPE,
        title: `פורסמה מודעה חדשה: ${safeTitle}`,
        body: 'נוספה מודעה בלוחות נדל״ן חמים למשקיעים — לחץ לצפייה.',
        link,
        metadata: { listing_id: listingId },
      });
    } catch (e) {
      console.error(`hotInvestorBoards: notify failed for user ${userId}:`, e);
    }
  }
}

function normalizeCreateBody(raw: Record<string, unknown>): Record<string, unknown> {
  const str = (k: string): unknown => {
    const v = raw[k];
    if (v === '' || v === undefined) return undefined;
    return v;
  };
  return {
    ...raw,
    title: raw.title,
    category: raw.category,
    subtitle: str('subtitle'),
    description: str('description'),
    price_label: str('price_label'),
    location_label: str('location_label'),
    contact_phone: str('contact_phone'),
    contact_email: str('contact_email'),
    external_link: str('external_link'),
    image_url: str('image_url'),
  };
}

function normalizePatchBody(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    const v = raw[key];
    if (v === '') {
      if (key === 'title' || key === 'category') continue;
      out[key] = null;
    } else if (v !== undefined) {
      out[key] = v;
    }
  }
  return out;
}

export async function getPublicHotInvestorBoards(req: Request, res: Response): Promise<void> {
  try {
    const catRaw = req.query.category;
    let category: HotInvestorBoardCategory | undefined;
    if (typeof catRaw === 'string' && catRaw.length > 0) {
      const p = hotInvestorBoardCategorySchema.safeParse(catRaw);
      if (!p.success) {
        res.status(400).json({ success: false, error: 'קטגוריה לא תקינה' });
        return;
      }
      category = p.data;
    }
    const listings = await listPublishedBoards(category);
    res.json({ listings });
  } catch (e: unknown) {
    console.error('getPublicHotInvestorBoards:', e);
    res.status(500).json({ success: false, error: 'לא ניתן לטעון את הלוחות' });
  }
}

export async function getAdminHotInvestorBoards(_req: Request, res: Response): Promise<void> {
  try {
    const listings = await listAllBoardsForAdmin();
    res.json({ listings });
  } catch (e: unknown) {
    console.error('getAdminHotInvestorBoards:', e);
    res.status(500).json({ success: false, error: 'לא ניתן לטעון את הרשימה' });
  }
}

export async function postAdminHotInvestorBoard(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createHotInvestorBoardSchema.safeParse(
      normalizeCreateBody(req.body as Record<string, unknown>),
    );
    if (!parsed.success) {
      const msg =
        parsed.error.flatten().formErrors[0] ??
        parsed.error.errors[0]?.message ??
        'נתונים לא תקינים';
      res.status(400).json({ success: false, error: msg });
      return;
    }
    const row = await createBoard(parsed.data);
    if (row.is_published) {
      void notifySubscribersOfPublish(row.id, row.title);
    }
    res.status(201).json({ success: true, listing: row });
  } catch (e: unknown) {
    console.error('postAdminHotInvestorBoard:', e);
    res.status(500).json({ success: false, error: 'לא ניתן ליצור רשומה' });
  }
}

export async function patchAdminHotInvestorBoard(req: Request, res: Response): Promise<void> {
  try {
    const idParse = uuidParam.safeParse(req.params.id);
    if (!idParse.success) {
      res.status(400).json({ success: false, error: 'מזהה לא תקין' });
      return;
    }
    const id = idParse.data;
    const previous = await getBoardById(id);
    if (!previous) {
      res.status(404).json({ success: false, error: 'הרשומה לא נמצאה' });
      return;
    }

    const parsed = updateHotInvestorBoardSchema.safeParse(
      normalizePatchBody(req.body as Record<string, unknown>),
    );
    if (!parsed.success) {
      const msg =
        parsed.error.flatten().formErrors[0] ??
        parsed.error.errors[0]?.message ??
        'נתונים לא תקינים';
      res.status(400).json({ success: false, error: msg });
      return;
    }
    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({ success: false, error: 'אין שדות לעדכון' });
      return;
    }

    const row = await updateBoard(id, parsed.data);
    if (!row) {
      res.status(404).json({ success: false, error: 'הרשומה לא נמצאה' });
      return;
    }

    const becamePublished = !previous.is_published && row.is_published;
    if (becamePublished) {
      void notifySubscribersOfPublish(row.id, row.title);
    }

    res.json({ success: true, listing: row });
  } catch (e: unknown) {
    console.error('patchAdminHotInvestorBoard:', e);
    res.status(500).json({ success: false, error: 'לא ניתן לעדכן' });
  }
}

export async function deleteAdminHotInvestorBoard(req: Request, res: Response): Promise<void> {
  try {
    const idParse = uuidParam.safeParse(req.params.id);
    if (!idParse.success) {
      res.status(400).json({ success: false, error: 'מזהה לא תקין' });
      return;
    }
    const deleted = await deleteBoard(idParse.data);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'הרשומה לא נמצאה' });
      return;
    }
    res.json({ success: true });
  } catch (e: unknown) {
    console.error('deleteAdminHotInvestorBoard:', e);
    res.status(500).json({ success: false, error: 'לא ניתן למחוק' });
  }
}
