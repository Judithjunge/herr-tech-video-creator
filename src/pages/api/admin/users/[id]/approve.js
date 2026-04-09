import { prisma } from '../../../../../lib/prisma';
import { requireAuth, isAdmin } from '../../../../../lib/api-auth';
import { sendAccessGrantedEmail } from '../../../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST' });

  const { session } = await requireAuth(req, res);
  if (!session) return;
  if (!isAdmin(session)) return res.status(403).json({ error: 'Kein Zugriff' });

  const { id } = req.query;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

  await prisma.user.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      approvedAt: new Date(),
      approvedBy: session.user.email,
    },
  });

  // Send magic link via NextAuth email provider
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    // Create a verification token so the user can log in via magic link
    const { createVerificationToken } = await import('../../../../../lib/auth-helpers');
    const magicLinkUrl = await createVerificationToken(user.email, baseUrl);
    await sendAccessGrantedEmail(user.email, magicLinkUrl);
  } catch (err) {
    console.error('[approve] Email fehlgeschlagen:', err.message);
    // Don't fail the approval if email fails
  }

  return res.status(200).json({ ok: true });
}
