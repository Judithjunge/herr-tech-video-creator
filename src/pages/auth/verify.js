import Head from 'next/head';
import { useRouter } from 'next/router';

const T = {
  bg: '#ffffff', card: '#ffffff', border: '#e5e7eb',
  accent: '#FF5757', accentBg: 'rgba(255,87,87,0.08)',
  text: '#0a1437', muted: '#6b7280',
};

export default function VerifyPage() {
  const router = useRouter();

  return (
    <>
      <Head><title>E-Mail überprüfen — JuThinkAI</title></Head>
      <div style={{
        minHeight: '100vh', background: T.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}>
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 16, padding: '48px 40px', maxWidth: 420,
          width: '100%', textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>📬</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.accent,
                        letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 16 }}>
            JuThinkAI
          </div>
          <h1 style={{ margin: '0 0 14px', fontSize: 22, fontWeight: 800,
                       color: T.text, letterSpacing: '-0.5px' }}>
            E-Mail gesendet!
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 15, color: T.muted, lineHeight: 1.7 }}>
            Prüfe dein Postfach und klicke auf den Login-Link in der E-Mail.
          </p>
          <div style={{ background: T.accentBg, border: `1px solid rgba(255, 87, 87,0.25)`,
                        borderRadius: 10, padding: '14px 18px', marginBottom: 28,
                        fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
            ⚡ Der Link ist 30 Minuten gültig.<br />
            Schau auch im Spam-Ordner nach.
          </div>
          <button onClick={() => router.push('/auth/signin')}
            style={{
              padding: '11px 24px', borderRadius: 9999,
              border: `1px solid ${T.border}`, background: 'transparent',
              color: T.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Zurück zum Login
          </button>
        </div>
      </div>
    </>
  );
}
