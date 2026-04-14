import { prisma } from '../../../lib/prisma';
import crypto from 'crypto';

async function findUser(email) {
  try {
    return await prisma.user.findUnique({ where: { email } });
  } catch {
    await new Promise(r => setTimeout(r, 2000));
    return await prisma.user.findUnique({ where: { email } });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { email, callbackUrl = '/' } = req.body;
    if (!email) return res.status(400).json({ error: 'E-Mail fehlt' });

    let user = await findUser(email.toLowerCase());

    // Auto-Create: Admin-User beim ersten Login automatisch anlegen
    if (!user) {
      const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
      if (email.toLowerCase() === adminEmail) {
        user = await prisma.user.create({
          data: { email: email.toLowerCase(), name: 'Admin', status: 'ACTIVE', role: 'admin' },
        });
      } else {
        return res.status(401).json({ error: 'NotFound' });
      }
    }

    if (user.status === 'PENDING')  return res.status(401).json({ error: 'PendingApproval' });
    if (user.status === 'DISABLED') return res.status(401).json({ error: 'AccountDisabled' });

    const sessionToken = crypto.randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });

    // Secure nur wenn HTTPS — prüfe ob hinter SSL-Proxy
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const secure = proto === 'https';
    const cookieName = secure ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
    const cookieParts = [
      `${cookieName}=${sessionToken}`,
      'Path=/',
      `Expires=${expires.toUTCString()}`,
      'HttpOnly',
      'SameSite=Lax',
      ...(secure ? ['Secure'] : []),
    ];
    res.setHeader('Set-Cookie', cookieParts.join('; '));
    return res.status(200).json({ success: true, redirectUrl: callbackUrl });
  } catch (err) {
    console.error('[direct-signin] Fehler:', err);
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
};
