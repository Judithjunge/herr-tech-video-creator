const { Resend } = require('resend');

// Lazy init — verhindert Crash beim Start wenn RESEND_API_KEY noch nicht gesetzt ist
let _resend = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');
  return _resend;
}
const resend = { emails: { send: (...args) => getResend().emails.send(...args) } };

const FROM = process.env.EMAIL_FROM || 'Herr Tech <noreply@herr.tech>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jacob@startup-creator.com';
const APP_URL = process.env.NEXTAUTH_URL || 'https://videos.herr.tech';

// ── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg:      '#0a0a0a',
  card:    '#111111',
  border:  '#1e1e1e',
  accent:  '#B598E2',
  text:    '#ffffff',
  muted:   '#888888',
  subtle:  '#222222',
};

// ── Basis-Template ───────────────────────────────────────────────────────────
function baseTemplate({ title, body, ctaText, ctaUrl, footer }) {
  const cta = ctaUrl ? `
    <tr>
      <td style="padding:0 40px 32px;">
        <a href="${ctaUrl}"
           style="display:inline-block;padding:14px 32px;background:${T.accent};color:#000000;
                  font-weight:700;font-size:15px;border-radius:9999px;text-decoration:none;
                  letter-spacing:-0.2px;">
          ${ctaText}
        </a>
      </td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${T.bg};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:${T.card};border:1px solid ${T.border};border-radius:16px;
                    overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="padding:28px 40px;border-bottom:1px solid ${T.border};">
            <span style="font-size:11px;font-weight:700;color:${T.accent};
                         letter-spacing:2.5px;text-transform:uppercase;">
              HERR TECH · KI Video Creator
            </span>
          </td>
        </tr>

        <!-- Titel -->
        <tr>
          <td style="padding:32px 40px 20px;">
            <h1 style="margin:0;font-size:22px;font-weight:800;color:${T.text};
                       letter-spacing:-0.5px;line-height:1.3;">
              ${title}
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:0 40px 28px;color:${T.text};font-size:15px;line-height:1.7;">
            ${body}
          </td>
        </tr>

        ${cta}

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid ${T.border};
                     font-size:12px;color:${T.muted};line-height:1.6;">
            ${footer || `© ${new Date().getFullYear()} herr.tech — KI Video Creator`}
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── 1. Magic Link (NextAuth Email Provider) ──────────────────────────────────
async function sendMagicLinkEmail(email, url) {
  const html = baseTemplate({
    title: 'Dein Login-Link',
    body: `
      <p style="margin:0 0 16px;color:${T.muted};">
        Klicke auf den Button um dich bei Herr Tech anzumelden.<br>
        Der Link ist <strong style="color:${T.text};">30 Minuten</strong> gültig.
      </p>
      <p style="margin:0;color:${T.muted};font-size:13px;">
        Falls du diesen Link nicht angefordert hast, kannst du diese E-Mail ignorieren.
      </p>`,
    ctaText: 'Jetzt anmelden',
    ctaUrl: url,
  });

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Dein Login-Link — Herr Tech',
    html,
  });
}

// ── 2. Zugriffsanfrage erhalten (an den User) ────────────────────────────────
async function sendRequestReceivedEmail(email, name) {
  const greeting = name ? `Hallo ${name},` : 'Hallo,';
  const html = baseTemplate({
    title: 'Deine Anfrage ist eingegangen',
    body: `
      <p style="margin:0 0 16px;">${greeting}</p>
      <p style="margin:0 0 16px;color:${T.muted};">
        Wir haben deine Zugriffsanfrage für <strong style="color:${T.text};">${email}</strong> erhalten.
      </p>
      <p style="margin:0 0 16px;color:${T.muted};">
        Der Admin wird deine Anfrage prüfen und dich per E-Mail benachrichtigen, sobald du freigeschaltet wurdest.
      </p>
      <div style="background:${T.subtle};border:1px solid ${T.border};border-radius:10px;
                  padding:16px 20px;margin-top:8px;">
        <p style="margin:0;font-size:13px;color:${T.muted};">
          ℹ️ Du erhältst eine weitere E-Mail mit einem Login-Link, sobald dein Zugang bestätigt wurde.
        </p>
      </div>`,
  });

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Zugriffsanfrage erhalten — Herr Tech',
    html,
  });
}

// ── 3. Admin-Benachrichtigung (neue Anfrage eingegangen) ─────────────────────
async function sendAdminNewUserNotification(userEmail, userName) {
  const adminPanelUrl = `${APP_URL}/admin`;
  const html = baseTemplate({
    title: 'Neue Zugriffsanfrage',
    body: `
      <p style="margin:0 0 16px;color:${T.muted};">
        Es gibt eine neue Zugriffsanfrage für den KI Video Creator:
      </p>
      <div style="background:${T.subtle};border:1px solid ${T.border};border-radius:10px;
                  padding:16px 20px;margin-bottom:20px;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:${T.muted};padding-bottom:6px;min-width:80px;">E-Mail</td>
            <td style="font-size:14px;color:${T.text};font-weight:600;">${userEmail}</td>
          </tr>
          ${userName ? `
          <tr>
            <td style="font-size:13px;color:${T.muted};min-width:80px;">Name</td>
            <td style="font-size:14px;color:${T.text};">${userName}</td>
          </tr>` : ''}
        </table>
      </div>
      <p style="margin:0;color:${T.muted};font-size:14px;">
        Öffne das Admin-Panel um die Anfrage zu genehmigen oder abzulehnen.
      </p>`,
    ctaText: 'Admin-Panel öffnen',
    ctaUrl: adminPanelUrl,
  });

  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Neue Zugriffsanfrage: ${userEmail}`,
    html,
  });
}

// ── 4. Zugang genehmigt (an den User, mit Magic Link) ───────────────────────
async function sendAccessGrantedEmail(email, name, loginUrl) {
  const greeting = name ? `Hallo ${name},` : 'Hallo,';
  const html = baseTemplate({
    title: 'Dein Zugang ist freigeschaltet! 🎉',
    body: `
      <p style="margin:0 0 16px;">${greeting}</p>
      <p style="margin:0 0 16px;color:${T.muted};">
        Dein Zugang für <strong style="color:${T.text};">${email}</strong> wurde vom Admin bestätigt.
      </p>
      <p style="margin:0 0 20px;color:${T.muted};">
        Klicke auf den Button um dich direkt anzumelden — kein Passwort notwendig.
      </p>
      <div style="background:${T.subtle};border:1px solid ${T.border};border-radius:10px;
                  padding:16px 20px;margin-top:8px;">
        <p style="margin:0;font-size:13px;color:${T.muted};">
          ⚡ Du kannst dich jederzeit mit Magic Link oder Google-Login anmelden.
        </p>
      </div>`,
    ctaText: 'Jetzt einloggen',
    ctaUrl: loginUrl,
  });

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Zugang freigeschaltet — Herr Tech',
    html,
  });
}

// ── 5. Zugang abgelehnt (optional) ──────────────────────────────────────────
async function sendRejectionEmail(email, name) {
  const greeting = name ? `Hallo ${name},` : 'Hallo,';
  const html = baseTemplate({
    title: 'Zugriffsanfrage abgelehnt',
    body: `
      <p style="margin:0 0 16px;">${greeting}</p>
      <p style="margin:0 0 16px;color:${T.muted};">
        Leider können wir deiner Zugriffsanfrage für <strong style="color:${T.text};">${email}</strong>
        aktuell nicht entsprechen.
      </p>
      <p style="margin:0;color:${T.muted};">
        Bei Fragen wende dich direkt an ${ADMIN_EMAIL}.
      </p>`,
  });

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Zugriffsanfrage — Herr Tech',
    html,
  });
}

module.exports = {
  sendMagicLinkEmail,
  sendRequestReceivedEmail,
  sendAdminNewUserNotification,
  sendAccessGrantedEmail,
  sendRejectionEmail,
};
