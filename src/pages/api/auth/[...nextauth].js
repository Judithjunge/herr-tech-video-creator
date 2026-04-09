import NextAuth from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '../../../lib/prisma';
import {
  sendMagicLinkEmail,
  sendAdminNewUserNotification,
} from '../../../lib/email';

export const authOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    EmailProvider({
      server: {},  // Wir versenden selbst via sendVerificationRequest
      from: process.env.EMAIL_FROM || 'noreply@herr.tech',
      sendVerificationRequest: async ({ identifier: email, url }) => {
        await sendMagicLinkEmail(email, url);
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  pages: {
    signIn:      '/auth/signin',
    verifyRequest: '/auth/verify',
    error:       '/auth/error',
  },

  callbacks: {
    async signIn({ user }) {
      // Prüfe Status in der DB
      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      if (!dbUser) {
        // Noch nicht in DB — wird durch createUser-Event angelegt (Google OAuth)
        // Kurz blockieren bis Event feuert; NextAuth erstellt den User zuerst
        return true; // createUser-Event setzt status auf PENDING und blockiert dann
      }
      if (dbUser.status === 'PENDING')  return `/auth/signin?error=PendingApproval`;
      if (dbUser.status === 'DISABLED') return `/auth/signin?error=AccountDisabled`;
      return true;
    },

    async session({ session, user }) {
      if (session.user) {
        session.user.id     = user.id;
        session.user.role   = user.role;
        session.user.status = user.status;
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      // Neuer User wurde angelegt (OAuth oder Email-Registrierung via Prisma direkt)
      // Status auf PENDING setzen falls noch nicht gesetzt
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (dbUser?.status === 'ACTIVE') return; // Admin direkt hinzugefügt → überspringen

      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'PENDING' },
      });
      await sendAdminNewUserNotification(user.email, user.name);
    },
  },

  session: {
    strategy: 'database',
  },
};

export default NextAuth(authOptions);
