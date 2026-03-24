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

function extractFirstBalancedJsonObject(input) {
  const text = String(input || '');
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseGeminiJson(rawText) {
  const cleaned = stripJsonPreamble(rawText);
  const attempts = [cleaned];

  const balanced = extractFirstBalancedJsonObject(cleaned);
  if (balanced) attempts.push(balanced);

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Keep trying next candidate.
    }
  }

  // Last-chance cleanup for common model formatting issues.
  const fallback = (balanced || cleaned)
    .replace(/,\s*([}\]])/g, '$1') // trailing commas
    .replace(/\u0000/g, '')
    .trim();
  return JSON.parse(fallback);
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
        // Use a generous token limit so the JSON object doesn't get cut off.
        maxOutputTokens: 4096,
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
    const rawText = response.text();
    try {
      parsed = parseGeminiJson(rawText);
    } catch (e) {
      // If model response is close-but-invalid JSON, ask Gemini once to repair it.
      try {
        const repairPrompt = [
          'Repair this into valid JSON only.',
          'Do not add explanation, markdown, or code fences.',
          'Preserve keys and values as much as possible.',
          '',
          rawText,
        ].join('\n');
        const repairedResult = await Promise.race([
          model.generateContent(repairPrompt),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), TIMEOUT_MS)
          ),
        ]);
        const repairedText = repairedResult?.response?.text?.() || '';
        try {
          parsed = parseGeminiJson(repairedText);
        } catch (inner) {
          console.error(
            'Structure catalog JSON parse error (repair failed):',
            inner.message,
            'raw:',
            String(rawText).slice(0, 500),
          );
          return res.status(500).json({
            error: 'Gemini response was malformed. Please try again.',
          });
        }
      } catch (repairErr) {
        console.error(
          'Structure catalog JSON parse error (repair request failed):',
          e.message,
          'raw:',
          String(rawText).slice(0, 500),
        );
        return res.status(500).json({
          error: 'Gemini response was malformed. Please try again.',
        });
      }
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
