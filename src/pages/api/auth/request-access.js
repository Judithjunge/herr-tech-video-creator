import { prisma } from '../../../lib/prisma';
import { sendRequestReceivedEmail, sendAdminNewUserNotification } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, name, note } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existing) {
      if (existing.status === 'ACTIVE') {
        return res.status(200).json({ ok: true, message: 'already_active' });
      }
      if (existing.status === 'PENDING') {
        // Bereits ausstehend — kein Duplikat anlegen
        return res.status(200).json({ ok: true, message: 'already_pending' });
      }
      if (existing.status === 'DISABLED') {
        return res.status(403).json({ error: 'Kein Zugriff möglich.' });
      }
    }

    // Neuen User mit PENDING-Status anlegen
    await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() || null,
        requestNote: note?.trim() || null,
        status: 'PENDING',
        role: 'user',
      },
    });

    // Emails versenden
    await Promise.allSettled([
      sendRequestReceivedEmail(normalizedEmail, name?.trim()),
      sendAdminNewUserNotification(normalizedEmail, name?.trim()),
    ]);

    return res.status(200).json({ ok: true, message: 'pending' });
  } catch (err) {
    console.error('[request-access]', err);
    return res.status(500).json({ error: 'Interner Fehler. Bitte versuche es erneut.' });
  }
}
