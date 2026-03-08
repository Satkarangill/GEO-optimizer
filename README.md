# SEO Optimization

This repo contains two projects: **Gemini Expert Consultant Chatbot** and **GEO-PR-Lite**.

---

## Gemini Expert Consultant Chatbot (FastAPI + React)

Chatbot that uses the Gemini API as an expert consultant: direct answers first, then in-depth suggestions.

### Run (two terminals)

1. **Backend (FastAPI + Gemini)**  
   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env and set GEMINI_API_KEY=your_actual_key
   uvicorn main:app --reload --port 8000
   ```

2. **Frontend (Vite)**  
   In a second terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open **http://localhost:5173**. The chat talks to `http://localhost:8000/api/chat`.

### Project layout

- `backend/main.py` — FastAPI app, CORS for localhost:5173, POST `/api/chat` (Gemini `gemini-2.5-flash` with system instruction).
- `backend/.env.example` — Copy to `.env` and set `GEMINI_API_KEY`.
- `frontend/src/App.jsx` — Chat UI (message history, input, Send, loading state).

---

# GEO-PR-Lite

MVP dashboard for agencies and businesses to generate AI-optimized schema, keyword strategy, and track keyword sentiment.

## Features

- **Schema & LLM Builder (v2.0)** — Enter agency name, **industry**, **business description**, target neighborhoods/regions, and social links. The app uses the **Gemini API** to produce:
  - **JSON-LD** — Schema.org structured data with an industry-appropriate `@type` (e.g. ConsultingBusiness, LegalService, SaaS) and an SEO-optimized description.
  - **llms.txt** — Markdown summary for LLM crawlers.
  - **Keyword Strategy** — Primary (3–5) and secondary keywords tailored to your niche and locations.
- **AI Keyword Checker** — Paste reviews, articles, or website copy; see a score and highlighted AI-friendly adjectives (e.g. strategic, results-driven, data-driven).

## Tech stack

- **Frontend:** React (Vite)
- **API:** Node (Express) in `server.js`; same logic in `api/` for optional Vercel deploy. Schema v2 uses `@google/generative-ai` (Gemini) and `dotenv` for `GEMINI_API_KEY`.

## Run locally (no deploy)

1. `npm install`
2. **Optional for Schema v2:** Create a `.env` in the project root with `GEMINI_API_KEY=your_key` (from [Google AI Studio](https://aistudio.google.com/)). Without it, the optimized schema endpoint returns 503.
3. `npm run dev`
4. Open **http://localhost:5173** — the app and API both run; Generate and Analyze work.

One command starts the local API and the React app. No deployment or second terminal needed.

## Optional: Deploy to Vercel

1. Push the repo to GitHub (or connect another Git provider).
2. In [Vercel](https://vercel.com), import the project. Vercel will detect Vite and the `api/` folder.
3. Set **GEMINI_API_KEY** in the project’s Environment Variables for the optimized schema to work.
4. Deploy. The same deployment serves the React app and the API at `/api/generate-schema`, `/api/generate-optimized-schema`, and `/api/analyze-text`.

Or from the CLI: `npx vercel` and follow the prompts.

## Project layout

- `api/generate-schema.js` — POST /api/generate-schema (v1: JSON-LD + llms.txt, no AI)
- `api/generate-optimized-schema.js` — POST /api/generate-optimized-schema (v2: Gemini → JSON-LD + llms.txt + keywords)
- `api/lib/schema.js` — `buildSchema()` (v1), `sanitizeSchema()` (v2 sanitizer)
- `api/analyze-text.js` — POST /api/analyze-text (keyword score + matches)
- `src/App.jsx` — Two-tab layout
- `src/components/SchemaBuilder.jsx` — Schema & LLM Builder tab (v2 form + triple output)
- `src/components/KeywordChecker.jsx` — AI Keyword Checker tab
- `vercel.json` — SPA rewrite so all non-API routes serve `index.html`
