/**
 * POST /api/generate-schema
 * Accepts agency details and returns JSON-LD (ProfessionalService) and llms.txt markdown.
 */
import { buildSchema } from './lib/schema.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = buildSchema(req.body || {});
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate schema' });
  }
}
