import { prisma } from '../../../../lib/prisma';
import { requireAuth, isAdmin } from '../../../../lib/api-auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Nur GET' });

  const { session } = await requireAuth(req, res);
  if (!session) return;
  if (!isAdmin(session)) return res.status(403).json({ error: 'Kein Zugriff' });

  const { status } = req.query;

  const where = status ? { status } : {};
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      status: true,
      createdAt: true,
      approvedAt: true,
      approvedBy: true,
      requestNote: true,
      projectsCreated: true,
      imagesGenerated: true,
      videosGenerated: true,
    },
  });

  return res.status(200).json({ users });
}
