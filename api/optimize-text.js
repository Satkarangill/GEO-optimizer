/**
 * POST /api/optimize-text
 * Accepts text (and optional analysis). Uses Gemini to rewrite the text so it ranks
 * higher in ChatGPT: applies AI-friendly adjectives, quantifiable facts, and suggestions.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzeText } from './lib/analyze.js';

const MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 25000;

function parseUserPrompts(input) {
  if (typeof input !== 'string' || !input.trim()) return [];
  return input
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildPrompt(text, options) {
  const { howToOptimize, userPromptsList, suggestions } = options;

  const promptsSection =
    userPromptsList.length > 0
      ? `TARGET PROMPTS (exact queries people type to find this business — your rewrite MUST rank for these):
${userPromptsList.map((p) => `- "${p}"`).join('\n')}

The text should read as a direct, natural answer to those queries. Weave in the exact phrases and concepts from these prompts where they fit.`
      : 'No specific prompts were provided. Optimize for general ChatGPT-style recommendations (AI-friendly adjectives, clear value, quantifiable facts where plausible).';

  const goalSection =
    howToOptimize && howToOptimize.trim()
      ? `OPTIMIZATION GOAL (follow this exactly):
${howToOptimize.trim()}`
      : 'Apply standard SEO/ChatGPT best practices: AI-friendly adjectives, concrete numbers where plausible, clear entity names.';

  const suggestionBlurb =
    suggestions && suggestions.length > 0
      ? `Additional improvements to weave in naturally:\n${suggestions.map((s) => `- ${s.title}: ${s.text}`).join('\n')}`
      : '';

  return `You are an SEO and copy expert. REWRITE the text below so it ranks at the top when people ask ChatGPT (or similar AI) the exact prompts listed. Analyze the current text: it is weak for those prompts. Fix it so the rewritten version is exactly what an AI would want to cite when answering those queries.

${promptsSection}

${goalSection}
${suggestionBlurb ? '\n' + suggestionBlurb : ''}

Rules:
- Output ONLY the rewritten text. No explanation, no "Here is the optimized version", no markdown.
- Keep the same general length and tone unless the user's optimization goal says otherwise. Do not add bullet lists or sections unless they were in the original.
- Preserve company/agency names and key facts. Weave in language that matches the target prompts and the user's optimization instructions.
- Write in the same person (first person "we" or third person as in the original).

Original text to optimize:

---
${text}
---`;
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

  const howToOptimize = typeof body.how_to_optimize === 'string' ? body.how_to_optimize : '';
  const userPromptsList = parseUserPrompts(body.user_prompts || '');

  let suggestions = body.suggestions;
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    const analysis = analyzeText(text);
    suggestions = analysis.suggestions || [];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: 0.5,
      },
    });

    const prompt = buildPrompt(text, {
      howToOptimize,
      userPromptsList,
      suggestions,
    });
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

    let optimized = (response.text() || '').trim();
    // Strip common LLM preambles if they slip through
    const stripPatterns = [
      /^Here (?:is|'s) (?:the )?(?:optimized|rewritten|improved) (?:version|text):\s*/i,
      /^Optimized text:\s*/i,
      /^```\w*\s*/,
      /\s*```$/,
    ];
    for (const p of stripPatterns) {
      optimized = optimized.replace(p, '');
    }
    optimized = optimized.trim();

    return res.status(200).json({
      optimized_text: optimized,
      suggestions_used: suggestions.length,
      prompts_used: userPromptsList.length,
    });
  } catch (err) {
    if (err.message === 'Request timed out') {
      return res.status(504).json({ error: 'Request timed out. Try again.' });
    }
    console.error(err);
    return res.status(500).json({
      error: err.message || 'Failed to optimize text',
    });
  }
}
