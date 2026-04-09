/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['fluent-ffmpeg', 'openai', 'formidable', '@anthropic-ai/sdk', 'google-auth-library', '@google/genai', '@prisma/client', 'prisma'],
  },
};

module.exports = nextConfig;
