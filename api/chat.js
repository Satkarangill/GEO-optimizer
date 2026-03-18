/**
 * POST /api/chat
 * Gemini Expert Consultant-style endpoint.
 * Accepts { message } and returns { response } using the same
 * system instruction behavior as the FastAPI backend.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 25000;

const SYSTEM_INSTRUCTION =
  'You are an expert, highly analytical consultant. Whenever the user asks a question, ' +
  'provide a clear, direct answer first. Then, automatically follow up with in-depth ' +
  'suggestions, best practices, or alternative approaches they might not have considered.';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ response: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      response: 'Error: GEMINI_API_KEY is not set. Add it to .env.',
    });
  }

  const body = req.body || {};
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return res.status(400).json({ response: 'message is required' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      TIMEOUT_MS,
    );

    const result = await model.generateContent(
      { contents: [{ role: 'user', parts: [{ text: message }] }] },
      { signal: controller.signal },
    );

    clearTimeout(timeoutId);

    const text = result?.response?.text() || 'No response generated.';
    return res.status(200).json({ response: text });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ response: 'Request timed out. Try again.' });
    }
    console.error('Error in /api/chat:', err);
    return res.status(500).json({
      response: `Error calling Gemini: ${err.message || String(err)}`,
    });
  }
}

