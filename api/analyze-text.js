/**
 * POST /api/analyze-text
 * Analyzes text for target GEO/PR adjectives and returns score + matches.
 */
import { analyzeText } from './lib/analyze.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body || {};
    const result = analyzeText(text);
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to analyze text' });
  }
}
