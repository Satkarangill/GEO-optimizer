/**
 * POST /api/structure-catalog
 * Accepts raw service descriptions (any agency: PR, consulting, tech, etc.).
 * Returns a Structured Service Catalog as JSON: services table + asset mapping.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 60000;

const PROMPT = `You are an expert at organizing service descriptions into a clear, reusable structure. Your task is to turn raw, messy text into a Structured Service Catalog.

RULES:
1. **Services**: Extract every distinct service/offering. For each one provide:
   - serviceName: Short, clear name (e.g. "Communications Strategy", "Media Relations").
   - valueProposition: The FULL original description for this service — do NOT shorten or summarize. Keep the same length and detail as the source text. Only edit to: (a) ensure it starts with an active verb (e.g. "Develops", "Leverages", "Empowering"), and (b) wrap "Authority Signals" in double asterisks for bold (e.g. "**400+ tier-1 placements**", "**$50M in exit value**", years, client counts). If the original is a long paragraph, keep the full paragraph.
   - keywords: Array of 2–5 primary SEO/target keywords for that service (e.g. ["PR Agency Toronto", "Data-driven Strategy"]).

2. **Asset Mapping**: From the text, extract into a separate list (do not leave them inside service descriptions):
   - Every image filename (e.g. image_7132a7.png, Andrea_Alisha_Trudeau_edited.jpg). Put each as { "label": "Short label (e.g. Hero Image, Leadership Bio)", "value": "filename.png" }.
   - Contact info if present (email, phone). Put as { "label": "Contact", "value": "info@example.com | 416-123-4567" }.

3. **Consistency**: Every valueProposition must start with an active verb. Keep tone professional. Preserve the business's industry (PR, consulting, tech, etc.). CRITICAL: valueProposition length must match the original — no condensing into one short sentence; use the full original text with only the verb and bold formatting applied.

Output ONLY a single JSON object, no markdown or explanation. Use this exact structure:
{
  "services": [
    {
      "serviceName": "string",
      "valueProposition": "string with **bold** authority signals",
      "keywords": ["keyword1", "keyword2"]
    }
  ],
  "assetMapping": [
    { "label": "string", "value": "string" }
  ]
}

If no image filenames or contact info appear in the text, assetMapping can be an empty array. If no clear services are found, return services: [] but still try to extract any asset mapping.

Raw text to process:

---
`;

function stripJsonPreamble(text) {
  const raw = (text || '').trim();
  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not set. Add it to .env or your deployment environment.',
    });
  }

  const body = req.body || {};
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    });

    const prompt = PROMPT + text + '\n---';
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), TIMEOUT_MS)
      ),
    ]);

    const response = result.response;
    if (!response || !response.text) {
      return res.status(502).json({
        error: 'Gemini returned no text. Try again.',
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(stripJsonPreamble(response.text()));
    } catch (e) {
      console.error('Structure catalog JSON parse error:', e.message);
      return res.status(502).json({
        error: 'Gemini response was not valid JSON. Try again.',
      });
    }

    const services = Array.isArray(parsed.services)
      ? parsed.services.map((s) => ({
          serviceName: typeof s.serviceName === 'string' ? s.serviceName : '',
          valueProposition: typeof s.valueProposition === 'string' ? s.valueProposition : '',
          keywords: Array.isArray(s.keywords) ? s.keywords.filter((k) => typeof k === 'string') : [],
        }))
      : [];
    const assetMapping = Array.isArray(parsed.assetMapping)
      ? parsed.assetMapping.map((a) => ({
          label: typeof a.label === 'string' ? a.label : '',
          value: typeof a.value === 'string' ? a.value : '',
        }))
      : [];

    return res.status(200).json({
      services,
      assetMapping,
    });
  } catch (err) {
    if (err.message === 'Request timed out') {
      return res.status(504).json({ error: 'Request timed out. Try again.' });
    }
    console.error(err);
    return res.status(500).json({
      error: err.message || 'Failed to structure catalog',
    });
  }
}
