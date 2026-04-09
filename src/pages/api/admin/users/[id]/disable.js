import { prisma } from '../../../../../lib/prisma';
import { requireAuth, isAdmin } from '../../../../../lib/api-auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST' });

  const { session } = await requireAuth(req, res);
  if (!session) return;
  if (!isAdmin(session)) return res.status(403).json({ error: 'Kein Zugriff' });

  const { id } = req.query;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

  // Prevent admin from disabling themselves
  if (user.id === session.user.id) {
    return res.status(400).json({ error: 'Eigenen Account kann man nicht deaktivieren' });
  }

  const newStatus = user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
  await prisma.user.update({ where: { id }, data: { status: newStatus } });

  return res.status(200).json({ ok: true, status: newStatus });
}
