import { config } from '../config/env.js';

type SendResult = { ok: true } | { ok: false; error: string };

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<SendResult> {
  const { resendApiKey, from } = config.email;
  const subject = 'איפוס סיסמה — מפת הבית שלי';
  const text = `ביקשת לאפס את הסיסמה. פתח את הקישור (תקף שעה אחת):\n\n${resetUrl}\n\nאם לא ביקשת זאת, התעלם מהודעה זו.`;

  if (!resendApiKey) {
    if (config.server.nodeEnv === 'development') {
      console.warn('[email] RESEND_API_KEY not set; reset link (dev only):', resetUrl);
      return { ok: true };
    }
    console.error('[email] RESEND_API_KEY not set; cannot send password reset email');
    return { ok: false, error: 'Email not configured' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[email] Resend error:', res.status, body);
    return { ok: false, error: 'Failed to send email' };
  }

  return { ok: true };
}
