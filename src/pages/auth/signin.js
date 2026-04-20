import { useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const T = {
  bg:        '#ffffff',
  surface:   '#f8f9fc',
  card:      '#ffffff',
  border:    '#e5e7eb',
  accent:    '#FF5757',
  accentBg:  'rgba(255,87,87,0.08)',
  accentBrd: 'rgba(255,87,87,0.25)',
  text:      '#0a1437',
  muted:     '#6b7280',
  subtle:    '#f3f4f6',
  green:     '#22c55e',
  greenBg:   'rgba(34,197,94,0.08)',
  greenBrd:  'rgba(34,197,94,0.25)',
  red:       '#ef4444',
  redBg:     'rgba(239,68,68,0.08)',
  redBrd:    'rgba(239,68,68,0.25)',
  amber:     '#f59e0b',
  amberBg:   'rgba(245,158,11,0.08)',
  amberBrd:  'rgba(245,158,11,0.25)',
};

const ERROR_MESSAGES = {
  PendingApproval: 'Deine Anfrage wird noch geprüft. Du erhältst eine E-Mail sobald dein Zugang freigeschaltet wurde.',
  AccountDisabled: 'Dein Konto wurde deaktiviert. Wende dich an den Administrator.',
  OAuthAccountNotLinked: 'Diese E-Mail ist bereits mit einem anderen Login verknüpft.',
  Default: 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
};

export default function SignInPage() {
  const router = useRouter();
  const { error, callbackUrl } = router.query;

  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null); // 'magic_link' | 'pending' | 'already_pending' | 'already_active'
  const [err, setErr] = useState(null);

  // Wenn direkt mit ?error=PendingApproval aufgerufen → Tab auf Login setzen
  useEffect(() => {
    if (error) setTab('login');
  }, [error]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/auth/direct-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), callbackUrl: callbackUrl || '/' }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msgs = {
          PendingApproval: ERROR_MESSAGES.PendingApproval,
          AccountDisabled: ERROR_MESSAGES.AccountDisabled,
          NotFound: 'Diese E-Mail ist nicht registriert. Bitte beantrage zuerst Zugang.',
        };
        setErr(msgs[data.error] || ERROR_MESSAGES.Default);
      } else {
        router.push(data.redirectUrl || '/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: callbackUrl || '/' });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || ERROR_MESSAGES.Default);
      } else {
        setSubmitted(data.message || 'pending');
      }
    } finally {
      setLoading(false);
    }
  };

  const errorMsg = error ? (ERROR_MESSAGES[error] || ERROR_MESSAGES.Default) : null;

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    background: T.subtle, border: `1px solid ${T.border}`,
    color: T.text, fontSize: 15, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color .15s',
  };

  const btnPrimary = {
    width: '100%', padding: '13px', borderRadius: 10, border: 'none',
    background: T.accent, color: '#000', fontSize: 15, fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
    fontFamily: 'inherit', transition: 'opacity .15s',
  };

  return (
    <>
      <Head><title>Anmelden — JuThinkAI</title></Head>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        input:focus { border-color: ${T.accentBrd} !important; }
      `}</style>

      <div style={{
        minHeight: '100vh', background: T.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}>
        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeIn .3s ease' }}>

          {/* Logo / Titel */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: '2.5px',
                          textTransform: 'uppercase', marginBottom: 10 }}>
              HERR TECH
            </div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: T.text, letterSpacing: '-0.5px' }}>
              KI Video Creator
            </h1>
          </div>

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
              {[['login', 'Anmelden'], ['register', 'Zugang beantragen']].map(([key, label]) => (
                <button key={key} onClick={() => { setTab(key); setErr(null); setSubmitted(null); }}
                  style={{
                    flex: 1, padding: '14px', border: 'none',
                    background: tab === key ? T.accentBg : 'transparent',
                    color: tab === key ? T.accent : T.muted,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    borderBottom: tab === key ? `2px solid ${T.accent}` : '2px solid transparent',
                    transition: 'all .15s', fontFamily: 'inherit',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ padding: 28 }}>

              {/* Fehler-Banner (aus URL-Param) */}
              {errorMsg && (
                <div style={{ background: T.amberBg, border: `1px solid ${T.amberBrd}`,
                              borderRadius: 8, padding: '12px 14px', marginBottom: 20,
                              fontSize: 13, color: T.amber, lineHeight: 1.5 }}>
                  {errorMsg}
                </div>
              )}

              {/* Fehler-Banner (aus State) */}
              {err && (
                <div style={{ background: T.redBg, border: `1px solid ${T.redBrd}`,
                              borderRadius: 8, padding: '12px 14px', marginBottom: 20,
                              fontSize: 13, color: T.red, lineHeight: 1.5 }}>
                  {err}
                </div>
              )}

              {/* ── LOGIN TAB ── */}
              {tab === 'login' && !submitted && (
                <>
                  <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
                                      color: T.muted, textTransform: 'uppercase',
                                      letterSpacing: '0.08em', marginBottom: 6 }}>
                        E-Mail-Adresse
                      </label>
                      <input type="email" required value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="deine@email.com"
                        style={inputStyle}
                      />
                    </div>
                    <button type="submit" style={btnPrimary} disabled={loading}>
                      {loading ? 'Anmelden…' : 'Anmelden'}
                    </button>
                  </form>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                    <span style={{ fontSize: 12, color: T.muted }}>oder</span>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                  </div>

                  <button onClick={handleGoogleLogin}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 10,
                      border: `1px solid ${T.border}`, background: T.subtle,
                      color: T.text, fontSize: 15, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 10, fontFamily: 'inherit',
                      transition: 'border-color .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = T.accentBrd}
                    onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
                    </svg>
                    Mit Google anmelden
                  </button>

                  <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 12, color: T.muted }}>
                    Noch kein Zugang?{' '}
                    <span onClick={() => setTab('register')}
                      style={{ color: T.accent, cursor: 'pointer', textDecoration: 'underline' }}>
                      Zugang beantragen
                    </span>
                  </p>
                </>
              )}

              {/* ── REGISTER TAB ── */}
              {tab === 'register' && !submitted && (
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
                                    color: T.muted, textTransform: 'uppercase',
                                    letterSpacing: '0.08em', marginBottom: 6 }}>
                      Name (optional)
                    </label>
                    <input type="text" value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Dein Name"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
                                    color: T.muted, textTransform: 'uppercase',
                                    letterSpacing: '0.08em', marginBottom: 6 }}>
                      E-Mail-Adresse *
                    </label>
                    <input type="email" required value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="deine@email.com"
                      style={inputStyle}
                    />
                  </div>
                  <button type="submit" style={btnPrimary} disabled={loading}>
                    {loading ? 'Wird gesendet…' : 'Zugang beantragen'}
                  </button>
                  <p style={{ margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.5, textAlign: 'center' }}>
                    Der Admin muss deinen Zugang bestätigen.<br />
                    Du erhältst per E-Mail Bescheid.
                  </p>
                </form>
              )}

              {/* ── REGISTER ERFOLG ── */}
              {tab === 'register' && submitted && (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  {submitted === 'already_active' ? (
                    <>
                      <div style={{ fontSize: 36, marginBottom: 16 }}>✅</div>
                      <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: T.text }}>
                        Du hast bereits Zugang
                      </h2>
                      <p style={{ margin: '0 0 20px', fontSize: 14, color: T.muted }}>
                        Wechsle zum "Anmelden"-Tab um dich einzuloggen.
                      </p>
                      <button onClick={() => { setTab('login'); setSubmitted(null); }}
                        style={{ ...btnPrimary, width: 'auto', padding: '10px 24px' }}>
                        Zum Login
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 36, marginBottom: 16 }}>🕐</div>
                      <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: T.text }}>
                        {submitted === 'already_pending' ? 'Anfrage bereits gestellt' : 'Anfrage gesendet!'}
                      </h2>
                      <p style={{ margin: 0, fontSize: 14, color: T.muted, lineHeight: 1.6 }}>
                        {submitted === 'already_pending'
                          ? `Für ${email} liegt bereits eine Anfrage vor. Du wirst per E-Mail benachrichtigt.`
                          : `Deine Anfrage für ${email} ist eingegangen. Du erhältst eine E-Mail sobald dein Zugang freigeschaltet wurde.`
                        }
                      </p>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (session?.user?.status === 'ACTIVE') {
    return { redirect: { destination: '/', permanent: false } };
  }
  return { props: {} };
}
