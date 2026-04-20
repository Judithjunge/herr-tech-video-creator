// NextAuth deaktiviert — Basic Auth (Caddy) ist die einzige Schicht
export default function handler(req, res) {
  res.status(404).json({ error: 'Auth disabled' });
}
