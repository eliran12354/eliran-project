import type { Request, Response } from 'express';
import { insertContactSubmission } from '../services/contactService.js';

const NAME_MAX = 200;
const EMAIL_MAX = 320;
const MESSAGE_MAX = 5000;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function submitContact(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, message } = req.body as Record<string, unknown>;

    if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
      res.status(400).json({ success: false, error: 'שם, אימייל והודעה נדרשים' });
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedMessage = message.trim();

    if (!trimmedName.length || trimmedName.length > NAME_MAX) {
      res.status(400).json({ success: false, error: 'שם לא תקין' });
      return;
    }
    if (!trimmedEmail.length || trimmedEmail.length > EMAIL_MAX || !isValidEmail(trimmedEmail)) {
      res.status(400).json({ success: false, error: 'כתובת אימייל לא תקינה' });
      return;
    }
    if (!trimmedMessage.length || trimmedMessage.length > MESSAGE_MAX) {
      res.status(400).json({ success: false, error: 'הודעה לא תקינה' });
      return;
    }

    const { id } = await insertContactSubmission({
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage,
    });

    res.status(201).json({ success: true, id });
  } catch (e: unknown) {
    console.error('submitContact error:', e);
    res.status(500).json({ success: false, error: 'לא ניתן לשלוח את הפנייה כעת' });
  }
}
