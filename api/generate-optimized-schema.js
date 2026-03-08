/**
 * POST /api/generate-optimized-schema
 * Accepts agency name, industry, business description, regions, social links.
 * Calls Gemini for SEO-optimized JSON-LD, llms.txt, and keyword strategy; sanitizes JSON-LD and returns triple output.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sanitizeSchema } from './lib/schema.js';

const MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 20000;

function normalizeNeighborhoods(neighborhoods) {
  if (Array.isArray(neighborhoods)) {
    return neighborhoods.filter(Boolean).map((n) => String(n).trim());
  }
  if (typeof neighborhoods === 'string') {
    return neighborhoods
      .split(/[,;]/)
      .map((n) => n.trim())
      .filter(Boolean);
  }
  return [];
}

function buildPrompt(body) {
  const name = (body.agency_name || '').trim();
  const industry = (body.industry || '').trim();
  const description = (body.business_description || '').trim();
  const regions = normalizeNeighborhoods(body.neighborhoods || []);

  return `You are an SEO expert. Generate a single JSON object (no markdown, no code fences) with exactly these keys:

1. jsonLd — A Schema.org structured data object. Include:
   - "@context": "https://schema.org"
   - "@type": pick the BEST single type for this business (e.g. ConsultingBusiness, LegalService, SoftwareApplication, ProfessionalService, LocalBusiness, Organization). Only one @type.
   - "name": the business name
   - "description": exactly one SEO-optimized description, 120–150 characters, including the business name and niche. No quotes inside the string that would break JSON.
   Do NOT include sameAs or areaServed; the backend will add those.

2. llmsTxt — A markdown string for LLM crawlers. Start with "# " and the business name. Include "## About" with a short paragraph about the business. Include "## Service areas" with a bullet list (use the regions below or "Remote/Global" if none). Use \\n for newlines. Escape any quotes inside the string.

3. keywords — An object with:
   - "primary": array of 3–5 main SEO keywords/phrases for this niche (can include local modifiers e.g. "Strategy Consulting in London")
   - "secondary": array of 5–10 additional relevant keywords

Business name: ${name || 'Unknown'}
Industry: ${industry || 'General business'}
Business description / about: ${description || 'Not provided'}
Target regions (comma-separated): ${regions.length ? regions.join(', ') : 'Remote/Global'}

Return ONLY the JSON object, no other text.`;
}

function parseJsonFromResponse(text) {
  const raw = (text || '').trim();
  const stripped = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(stripped);
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
  const agencyName = (body.agency_name || '').trim();
  if (!agencyName) {
    return res.status(400).json({ error: 'agency_name is required' });
  }

  const neighborhoods = normalizeNeighborhoods(body.neighborhoods);
  const social_links = body.social_links || {};
  const sameAs = [
    social_links.wikidata,
    social_links.clutch,
    social_links.website,
    social_links.linkedin,
  ]
    .filter(Boolean)
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter((u) => u && (u.startsWith('http://') || u.startsWith('https://')));

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.6,
      },
    });

    const prompt = buildPrompt(body);
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
      parsed = parseJsonFromResponse(response.text());
    } catch (e) {
      console.error('Gemini JSON parse error:', e.message);
      return res.status(502).json({
        error: 'Gemini response was not valid JSON. Try again.',
      });
    }

    const jsonLdRaw = parsed.jsonLd;
    const llmsTxt = typeof parsed.llmsTxt === 'string' ? parsed.llmsTxt : '';
    const keywords = parsed.keywords || {};
    const primary = Array.isArray(keywords.primary) ? keywords.primary : [];
    const secondary = Array.isArray(keywords.secondary) ? keywords.secondary : [];

    const sanitized = sanitizeSchema(jsonLdRaw, {
      name: agencyName,
      sameAs,
      areasServed: neighborhoods,
    });

    if (sanitized.error) {
      return res.status(502).json({
        error: sanitized.error,
      });
    }

    return res.status(200).json({
      json_ld: sanitized.json_ld,
      llms_txt: llmsTxt,
      keywords: {
        primary,
        secondary,
      },
    });
  } catch (err) {
    if (err.message === 'Request timed out') {
      return res.status(504).json({ error: 'Request timed out. Try again.' });
    }
    console.error(err);
    return res.status(500).json({
      error: err.message || 'Failed to generate optimized schema',
    });
  }
}
