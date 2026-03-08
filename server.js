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

const app = express();
const PORT = 3000;

app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Local API running at http://localhost:${PORT}`);
  console.log(`  GET  http://localhost:${PORT}/api/health`);
  console.log(`  POST http://localhost:${PORT}/api/generate-schema`);
  console.log(`  POST http://localhost:${PORT}/api/generate-optimized-schema`);
  console.log(`  POST http://localhost:${PORT}/api/analyze-text`);
  console.log(`  POST http://localhost:${PORT}/api/optimize-text`);
  console.log(`  POST http://localhost:${PORT}/api/structure-catalog`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('  ⚠ GEMINI_API_KEY not set — copy .env.example to .env and add your key for AI features.');
  }
});
