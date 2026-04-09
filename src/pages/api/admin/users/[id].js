import fs from 'fs';
import path from 'path';
import { prisma } from '../../../../lib/prisma';
import { requireAuth, isAdmin } from '../../../../lib/api-auth';
import { PROJECTS_DIR } from '../../../../lib/project';

export default async function handler(req, res) {
  const { session } = await requireAuth(req, res);
  if (!session) return;
  if (!isAdmin(session)) return res.status(403).json({ error: 'Kein Zugriff' });

  const { id } = req.query;

  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({
      where: { id },
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
    if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

    // Load projects from filesystem for this user
    let projects = [];
    if (fs.existsSync(PROJECTS_DIR)) {
      const dirs = fs.readdirSync(PROJECTS_DIR);
      projects = dirs
        .map(d => {
          const jsonPath = path.join(PROJECTS_DIR, d, 'project.json');
          if (!fs.existsSync(jsonPath)) return null;
          try {
            const raw = fs.readFileSync(jsonPath, 'utf-8');
            return JSON.parse(raw);
          } catch { return null; }
        })
        .filter(p => p && p.ownerId === id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return res.status(200).json({ user, projects });
  }

  if (req.method === 'DELETE') {
    await prisma.user.delete({ where: { id } }).catch(() => {});
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Nur GET oder DELETE' });
}
