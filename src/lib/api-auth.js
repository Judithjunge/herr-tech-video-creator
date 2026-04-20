// BasicAuth (Caddy) ist die einzige Auth-Schicht.
// Server-seitig: wer diesen Code erreicht, wurde schon von Caddy gelassen → Admin.
const { prisma } = require('./prisma');

let cachedAdmin = null;

async function getAdminUser() {
  if (cachedAdmin) return cachedAdmin;
  const email = (process.env.ADMIN_EMAIL || 'admin@juthinkai.de').toLowerCase().trim();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: 'Judith',
        role: 'admin',
        status: 'ACTIVE',
        emailVerified: new Date(),
        approvedAt: new Date(),
      },
    });
  } else if (user.status !== 'ACTIVE' || user.role !== 'admin') {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE', role: 'admin' },
    });
  }
  cachedAdmin = user;
  return user;
}

async function requireSession(req, res) {
  const user = await getAdminUser();
  return {
    session: { user: { id: user.id, email: user.email, role: 'admin', status: 'ACTIVE', name: user.name } },
    ownerId: user.id,
  };
}

function requireAdmin(session) {
  return true;
}

module.exports = { requireSession, requireAdmin, getAdminUser };
