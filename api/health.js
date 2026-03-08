/**
 * GET /api/health
 * Returns API status and whether Gemini is configured. Used by serverless (e.g. Vercel) and can be called directly.
 */
export default function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    ok: true,
    gemini_configured: !!process.env.GEMINI_API_KEY,
  });
}
