/**
 * Local API server for development.
 * Run: npm run dev:api
 * Then run npm run dev in another terminal. Vite will proxy /api to this server.
 */
import 'dotenv/config';
import express from 'express';
import { buildSchema } from './api/lib/schema.js';
import { analyzeText } from './api/lib/analyze.js';
import generateOptimizedSchema from './api/generate-optimized-schema.js';
import optimizeText from './api/optimize-text.js';
import structureCatalog from './api/structure-catalog.js';
import chatHandler from './api/chat.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Simple CORS for local development; tighten origins as needed.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Strict email whitelist for all routes (site-wide).
// Auth method: HTTP Basic Auth (username=email, password=BASIC_AUTH_PASSWORD).
const EMAIL_WHITELIST = new Set([
  'satkarangill0@gmail.com',
  'andrea@amplifyonline.ca',
]);

function parseBasicAuth(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') return null;
  const [scheme, encoded] = headerValue.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) return null;
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx === -1) return null;
    return {
      username: decoded.slice(0, idx),
      password: decoded.slice(idx + 1),
    };
  } catch {
    return null;
  }
}

function requireWhitelist(req, res, next) {
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;
  if (!expectedPassword) {
    return res.status(500).json({
      error: 'Server misconfigured: BASIC_AUTH_PASSWORD is not set.',
    });
  }

  const auth = parseBasicAuth(req.headers.authorization);
  if (!auth || !auth.username || auth.password !== expectedPassword) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Restricted"');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const email = String(auth.username).trim().toLowerCase();
  if (!EMAIL_WHITELIST.has(email)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  req.user = { email };
  next();
}

app.use(requireWhitelist);

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    gemini_configured: !!process.env.GEMINI_API_KEY,
  });
});

app.post('/api/generate-schema', (req, res) => {
  try {
    const result = buildSchema(req.body || {});
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate schema' });
  }
});

app.post('/api/generate-optimized-schema', async (req, res) => {
  try {
    await generateOptimizedSchema(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Failed to generate optimized schema' });
    }
  }
});

app.post('/api/analyze-text', (req, res) => {
  try {
    const { text } = req.body || {};
    const result = analyzeText(text);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to analyze text' });
  }
});

app.post('/api/optimize-text', async (req, res) => {
  try {
    await optimizeText(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Failed to optimize text' });
    }
  }
});

app.post('/api/structure-catalog', async (req, res) => {
  try {
    await structureCatalog(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Failed to structure catalog' });
    }
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    await chatHandler(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ response: 'Error calling chat endpoint' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Local API running at http://localhost:${PORT}`);
  console.log(`  GET  http://localhost:${PORT}/api/health`);
  console.log(`  POST http://localhost:${PORT}/api/generate-schema`);
  console.log(`  POST http://localhost:${PORT}/api/generate-optimized-schema`);
  console.log(`  POST http://localhost:${PORT}/api/analyze-text`);
  console.log(`  POST http://localhost:${PORT}/api/optimize-text`);
  console.log(`  POST http://localhost:${PORT}/api/structure-catalog`);
   console.log(`  POST http://localhost:${PORT}/api/chat`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('  ⚠ GEMINI_API_KEY not set — copy .env.example to .env and add your key for AI features.');
  }
});
