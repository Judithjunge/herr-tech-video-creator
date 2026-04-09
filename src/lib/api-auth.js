/**
 * Wiederverwendbare Auth-Hilfsfunktionen für API-Routes.
 * Ersetzt das alte Cookie-basierte user-session.js System.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';

/**
 * Gibt die aktuelle Session zurück oder sendet 401.
 * Verwendung in API-Handlern:
 *   const { session, ownerId } = await requireAuth(req, res);
 *   if (!session) return; // 401 bereits gesendet
 */
export async function requireAuth(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    res.status(401).json({ error: 'Nicht autorisiert' });
    return { session: null, ownerId: null };
  }
  return { session, ownerId: session.user.id };
}

/**
 * Prüft ob der aktuelle User Admin ist.
 */
export function isAdmin(session) {
  return (
    session?.user?.role === 'admin' ||
    session?.user?.email === process.env.ADMIN_EMAIL
  );
}
