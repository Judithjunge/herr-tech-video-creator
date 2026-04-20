import { useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import Head from 'next/head';

const T = {
  bg: '#ffffff', card: '#ffffff', border: '#e5e7eb',
  accent: '#FF5757', accentBg: 'rgba(255,87,87,0.08)', accentBrd: 'rgba(255,87,87,0.25)',
  text: '#0a1437', muted: '#6b7280', subtle: '#f3f4f6',
  red: '#ef4444', redBg: 'rgba(239,68,68,0.08)', redBrd: 'rgba(239,68,68,0.25)',
};

const ERROR_MESSAGES = {
  AccessDenied: 'Diese App ist nur für den Inhaber. Zugriff verweigert.',
  Verification: 'Der Link ist abgelaufen oder ungültig. Fordere einen neuen an.',
  Default: 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.',
};

export default function SignInPage() {
  const router = useRouter();
  const { error } = router.query;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await signIn('email', { email, redirect: false, callbackUrl: '/' });
      if (res?.error) {
        setErr(ERROR_MESSAGES[res.error] || ERROR_MESSAGES.Default);
      } else {
        setSubmitted(true);
      }
    } catch {
      setErr(ERROR_MESSAGES.Default);
    } finally {
      setLoading(false);
    }
  };

  const errorMsg = error ? (ERROR_MESSAGES[error] || ERROR_MESSAGES.Default) : null;

  return (
    <>
      <Head><title>Anmelden — JuThinkAI</title></Head>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        input:focus { border-color: ${T.accentBrd} !important; }
      `}</style>

      <div style={{
        minHeight: '80vh', background: T.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}>
        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeIn .3s ease' }}>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 700,
                          color: T.accent, letterSpacing: '2.5px',
                          textTransform: 'uppercase', marginBottom: 10 }}>
              JuThinkAI
            </div>
            <h1 style={{ fontFamily: "'Poppins',sans-serif", margin: 0, fontSize: 28, fontWeight: 700,
                         color: T.text, letterSpacing: '-0.5px' }}>
              Video Creator
            </h1>
            <p style={{ fontSize: 13, color: T.muted, marginTop: 12, lineHeight: 1.5 }}>
              Nur für Judith. Bitte gib deine hinterlegte Admin-E-Mail ein.
            </p>
          </div>

          <div style={{ background: T.card, border: `1px solid ${T.border}`,
                        borderRadius: 16, padding: 28,
                        boxShadow: '0 1px 3px rgba(10,20,55,0.04)' }}>

            {errorMsg && (
              <div style={{ background: T.redBg, border: `1px solid ${T.redBrd}`,
                            borderRadius: 8, padding: '12px 14px', marginBottom: 20,
                            fontSize: 13, color: T.red, lineHeight: 1.5 }}>
                {errorMsg}
              </div>
            )}

            {err && (
              <div style={{ background: T.redBg, border: `1px solid ${T.redBrd}`,
                            borderRadius: 8, padding: '12px 14px', marginBottom: 20,
                            fontSize: 13, color: T.red, lineHeight: 1.5 }}>
                {err}
              </div>
            )}

            {!submitted ? (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
                                  color: T.muted, textTransform: 'uppercase',
                                  letterSpacing: '0.08em', marginBottom: 6 }}>
                    E-Mail-Adresse
                  </label>
                  <input type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="kitools@juthinkai.de"
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 10,
                      background: T.subtle, border: `1px solid ${T.border}`,
                      color: T.text, fontSize: 15, outline: 'none',
                      fontFamily: 'inherit', boxSizing: 'border-box',
                      transition: 'border-color .15s',
                    }}
                  />
                </div>
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                  background: T.accent, color: '#ffffff', fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                  fontFamily: "'Poppins',sans-serif", transition: 'opacity .15s',
                }}>
                  {loading ? 'Link wird gesendet…' : 'Magic Link senden'}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
                <h2 style={{ fontFamily: "'Poppins',sans-serif", margin: 0, fontSize: 18, color: T.text }}>
                  Magic Link wurde gesendet
                </h2>
                <p style={{ fontSize: 13, color: T.muted, marginTop: 10, lineHeight: 1.5 }}>
                  Check dein Postfach. Falls nichts kommt: Spam-Ordner checken.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
