# What SchemaBuilder Does (v2.0)

This document describes the **SchemaBuilder** component and its backend in the AI-powered v2.0 flow.

---

## In One Sentence

SchemaBuilder is an **AI-driven** form that takes an agency’s name, **industry**, **business description**, target neighborhoods/regions, and social URLs, then uses the **Gemini API** to generate **SEO-optimized JSON-LD**, an **llms.txt** summary, and a **Keyword Strategy** (primary and secondary keywords) tailored to your business niche.

---

## User Flow

1. **You fill in the form**
   - **Agency name** (required) — e.g. “Acme Consulting” or “Zenith Law”
   - **Industry** — select (e.g. PR / Communications, Consulting, Legal, SaaS) or “Other” with free text
   - **Business description** — brief “About” or mission statement (textarea)
   - **Target neighborhoods/regions** — comma- or semicolon-separated (e.g. “Brooklyn, NY” or “Remote/Global”)
   - **Optional URLs:** Wikidata, Clutch, Website, LinkedIn

2. **You click “Generate”**
   - The frontend sends a POST request to **`/api/generate-optimized-schema`** with that data.

3. **AI step (Gemini)**
   - The backend calls the Gemini API with an SEO-expert prompt. Gemini returns a JSON object with:
     - A Schema.org **jsonLd** object (dynamic `@type`, ~150-char description)
     - An **llmsTxt** markdown string for LLM crawlers
     - **keywords**: `primary` (3–5) and `secondary` arrays

4. **Sanitizer**
   - The backend runs **sanitizeSchema()** on the AI JSON-LD: enforces Schema.org context and an allowlisted `@type`, injects your **name**, **sameAs**, and **areaServed** from the form, and caps/strips unsafe fields.

5. **You get three outputs**
   - **JSON-LD** — ready to paste into your page (e.g. in a `<script type="application/ld+json">` tag).
   - **llms.txt** — markdown summary for LLM crawlers.
   - **Keyword Strategy** — Primary and secondary keywords with a “Copy all” button.
   - Each block has a **Copy** button; “Copied” appears for 2 seconds after copying.

---

## What the AI-Powered Backend Builds

### 1. Dynamic JSON-LD (Schema.org)

- **@type:** Chosen by Gemini to fit your industry (e.g. `ConsultingBusiness`, `LegalService`, `SoftwareApplication`, `ProfessionalService`, `LocalBusiness`). Sanitizer allowlists types and falls back to `ProfessionalService` if invalid.
- **@context:** Always `https://schema.org`.
- **name:** From your form (enforced by sanitizer).
- **description:** AI-generated, SEO-optimized, ~150 characters; sanitizer truncates if longer.
- **sameAs:** Your provided URLs (validated); injected by sanitizer.
- **areaServed:** Built from your neighborhoods/regions as `Place` objects; injected by sanitizer.
- Other Schema.org-safe fields from the AI (e.g. `serviceType`, `url`) may be preserved by the sanitizer.

### 2. llms.txt

- **Heading:** Your business name.
- **About:** AI-generated short paragraph describing your business and niche.
- **Service areas:** Bullet list from your regions (or e.g. “Remote/Global”).
- Formatted for LLM crawlers that read llms.txt.

### 3. Keyword Intelligence

- **Primary:** 3–5 main SEO keywords/phrases (can include local modifiers, e.g. “Strategy Consulting in London”).
- **Secondary:** Additional relevant keywords for metadata and content.

---

## Technical Details

| Piece | What it does |
|-------|----------------------|
| **`SchemaBuilder.jsx`** | React form; collects name, industry, business description, neighborhoods, social links; calls `/api/generate-optimized-schema`; displays JSON-LD, llms.txt, and Keyword Strategy with Copy buttons. |
| **`getApiBase()`** | Uses `VITE_API_URL` if set, otherwise `''` so the request goes to the same origin. |
| **POST body** | `agency_name`, `industry`, `business_description`, `neighborhoods` (string, split on comma/semicolon), `social_links`: `{ wikidata, clutch, website, linkedin }`. |
| **API** | `api/generate-optimized-schema.js` → builds prompt → calls **Gemini** → parses JSON → **sanitizeSchema()** → returns `{ json_ld, llms_txt, keywords: { primary, secondary } }`. |
| **`api/lib/schema.js`** | **sanitizeSchema(aiJsonLd, options)** — Enforces `@context`, allowlisted `@type`, user `name` / `sameAs` / `areaServed`; caps description length; strips disallowed keys. **buildSchema(body)** kept for v1 `/api/generate-schema`. |
| **Environment** | `GEMINI_API_KEY` must be set in the Node environment (e.g. `.env` for local, Vercel env vars for deploy). If missing, the optimized endpoint returns 503. |

---

## Why Use the AI Version?

- **Niche-agnostic:** Works for any industry (consulting, legal, SaaS, PR, local services, etc.), not just PR.
- **Better rankings:** Industry-specific `@type` and keywords help search engines and LLMs categorize your business accurately.
- **Future-proof:** llms.txt helps when users ask ChatGPT or Gemini about “top [niche] in [location]” — your business is easier to find and cite.

So in short: **SchemaBuilder v2 turns agency name + industry + description + regions + links into ready-to-use JSON-LD, llms.txt, and a keyword strategy for your site.**
