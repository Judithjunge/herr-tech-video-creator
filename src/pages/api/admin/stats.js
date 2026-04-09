import { prisma } from '../../../lib/prisma';
import { requireAuth, isAdmin } from '../../../lib/api-auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Nur GET' });

  const { session } = await requireAuth(req, res);
  if (!session) return;
  if (!isAdmin(session)) return res.status(403).json({ error: 'Kein Zugriff' });

  const [total, pending, active, disabled, aggregated] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'DISABLED' } }),
    prisma.user.aggregate({
      _sum: { projectsCreated: true, imagesGenerated: true, videosGenerated: true },
    }),
  ]);

  return res.status(200).json({
    users: { total, pending, active, disabled },
    usage: {
      projectsCreated: aggregated._sum.projectsCreated ?? 0,
      imagesGenerated: aggregated._sum.imagesGenerated ?? 0,
      videosGenerated: aggregated._sum.videosGenerated ?? 0,
    },
  });
}
