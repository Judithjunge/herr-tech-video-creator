import { prisma } from '../../../lib/prisma';
import { requireAuth, isAdmin } from '../../../lib/api-auth';
import { sendAccessGrantedEmail } from '../../../lib/email';
import { createVerificationToken } from '../../../lib/auth-helpers';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST' });

  const { session } = await requireAuth(req, res);
  if (!session) return;
  if (!isAdmin(session)) return res.status(403).json({ error: 'Kein Zugriff' });

  const { email, name } = req.body ?? {};
  if (!email?.trim()) return res.status(400).json({ error: 'Email fehlt' });

  const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (existing) return res.status(409).json({ error: 'User existiert bereits' });

  const user = await prisma.user.create({
    data: {
      email: email.trim(),
      name: name?.trim() || null,
      status: 'ACTIVE',
      approvedAt: new Date(),
      approvedBy: session.user.email,
    },
  });

  // Send magic link
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const magicLinkUrl = await createVerificationToken(user.email, baseUrl);
    await sendAccessGrantedEmail(user.email, magicLinkUrl);
  } catch (err) {
    console.error('[admin/add] Email fehlgeschlagen:', err.message);
  }

  return res.status(200).json({ ok: true, userId: user.id });
}
