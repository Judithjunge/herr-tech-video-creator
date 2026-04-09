require('../../lib/load-env');

export default function handler(req, res) {
  res.json({
    anthropic: process.env.ANTHROPIC_API_KEY ? `${process.env.ANTHROPIC_API_KEY.slice(0,20)}... OK` : 'NICHT GESETZT',
    openai: process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.slice(0,15)}... OK` : 'NICHT GESETZT',
    fal: process.env.FAL_API_KEY ? `${process.env.FAL_API_KEY.slice(0,15)}... OK` : 'NICHT GESETZT',
    googleProject: process.env.GOOGLE_CLOUD_PROJECT ?? 'NICHT GESETZT',
  });
}
