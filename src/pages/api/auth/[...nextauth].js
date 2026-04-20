import NextAuth from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '../../../lib/prisma';
import { sendMagicLinkEmail } from '../../../lib/email';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();

export const authOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    EmailProvider({
      server: {},
      from: process.env.EMAIL_FROM || 'JuThinkAI <onboarding@resend.dev>',
      sendVerificationRequest: async ({ identifier: email, url }) => {
        // Nur Admin-E-Mail bekommt überhaupt einen Magic Link
        if (email.toLowerCase().trim() !== ADMIN_EMAIL) {
          console.log('[auth] Blocked magic link request for non-admin email:', email);
          return;
        }
        await sendMagicLinkEmail(email, url);
      },
    }),
  ],

  pages: {
    signIn:        '/auth/signin',
    verifyRequest: '/auth/verify',
    error:         '/auth/error',
  },

  callbacks: {
    async signIn({ user, email }) {
      const addr = (user?.email || email?.verificationRequest || '').toLowerCase().trim();
      if (addr !== ADMIN_EMAIL) {
        console.log('[auth] Blocked sign-in for non-admin email:', addr);
        return false; // -> /auth/error?error=AccessDenied
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = 'admin';
        session.user.status = 'ACTIVE';
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      // Erster Login: direkt Admin/ACTIVE setzen
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'ACTIVE', role: 'admin' },
      });
    },
  },

  session: { strategy: 'database' },
};

export default NextAuth(authOptions);
