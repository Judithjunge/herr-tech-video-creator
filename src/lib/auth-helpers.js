import crypto from 'crypto';
import { prisma } from './prisma';

/**
 * Creates a NextAuth VerificationToken for the given email and returns
 * the magic link URL that can be sent to the user.
 */
export async function createVerificationToken(email, baseUrl) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Delete any existing tokens for this email first
  await prisma.verificationToken.deleteMany({ where: { identifier: email } }).catch(() => {});

  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  });

  const params = new URLSearchParams({
    callbackUrl: baseUrl,
    token,
    email,
  });

  return `${baseUrl}/api/auth/callback/email?${params.toString()}`;
}
