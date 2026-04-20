import Head from 'next/head';
import { useRouter } from 'next/router';

const T = {
  bg: '#ffffff', card: '#ffffff', border: '#e5e7eb',
  accent: '#FF5757', text: '#0a1437', muted: '#6b7280',
  red: '#ef4444', redBg: 'rgba(239,68,68,0.08)', redBrd: 'rgba(239,68,68,0.25)',
  amber: '#f59e0b', amberBg: 'rgba(245,158,11,0.08)', amberBrd: 'rgba(245,158,11,0.25)',
};

const ERROR_INFO = {
  PendingApproval: {
    icon: '🕐',
    title: 'Zugang noch nicht freigeschaltet',
    msg: 'Deine Anfrage wird noch geprüft. Du erhältst eine E-Mail sobald dein Zugang freigeschaltet wurde.',
    color: T.amber, bg: T.amberBg, brd: T.amberBrd,
  },
  AccountDisabled: {
    icon: '🚫',
    title: 'Konto deaktiviert',
    msg: 'Dein Konto wurde deaktiviert. Wende dich an den Administrator.',
    color: T.red, bg: T.redBg, brd: T.redBrd,
  },
  OAuthAccountNotLinked: {
    icon: '🔗',
    title: 'Konto bereits verknüpft',
    msg: 'Diese E-Mail-Adresse ist bereits mit einer anderen Login-Methode verknüpft. Bitte nutze dieselbe Methode wie bei der Registrierung.',
    color: T.amber, bg: T.amberBg, brd: T.amberBrd,
  },
};

export default function ErrorPage() {
  const router = useRouter();
  const { error } = router.query;

  const info = ERROR_INFO[error] || {
    icon: '⚠️',
    title: 'Fehler beim Anmelden',
    msg: 'Es ist ein unbekannter Fehler aufgetreten. Bitte versuche es erneut.',
    color: T.red, bg: T.redBg, brd: T.redBrd,
  };

  return (
    <>
      <Head><title>Fehler — JuThinkAI</title></Head>
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
          <div style={{ fontSize: 48, marginBottom: 20 }}>{info.icon}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.accent,
                        letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 16 }}>
            JuThinkAI
          </div>
          <h1 style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 800,
                       color: T.text, letterSpacing: '-0.3px' }}>
            {info.title}
          </h1>
          <div style={{ background: info.bg, border: `1px solid ${info.brd}`,
                        borderRadius: 10, padding: '14px 18px', marginBottom: 28,
                        fontSize: 14, color: info.color, lineHeight: 1.6, textAlign: 'left' }}>
            {info.msg}
          </div>
          <button onClick={() => router.push('/auth/signin')}
            style={{
              padding: '12px 28px', borderRadius: 9999, border: 'none',
              background: T.accent, color: '#000', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Zum Login
          </button>
        </div>
      </div>
    </>
  );
}
