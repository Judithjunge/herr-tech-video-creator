import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JuThinkAI Video Creator',
  description: 'KI-gestützter Video-Creator von JuThinkAI — Whisper, Claude, Imagen4 und Veo3 in einem Flow.',
  icons: {
    icon: 'https://juthinkai.de/favicon-32.png',
    apple: 'https://juthinkai.de/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body style={{ background: '#ffffff', color: '#0a1437', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <header style={{ borderBottom: '1px solid #e5e7eb', background: '#ffffff', padding: '16px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FF5757', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(255,87,87,0.25)' }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 18, color: '#0a1437', lineHeight: 1.1 }}>
                JuThinkAI <span style={{ color: '#FF5757' }}>Video Creator</span>
              </span>
              <span style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.02em' }}>KI-gestützter Video-Flow</span>
            </div>
          </div>
        </header>
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
