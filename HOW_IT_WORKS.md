# How GEO-PR-Lite Actually Works

This document explains **what the product does**, **why it exists**, and **how each part behaves** from a user and business perspective. It is not about code, files, or frameworks.

---

## What problem this tool solves

Agencies and marketers need their work to show up in **search engines** and in **AI assistants** (like ChatGPT) when people ask for recommendations. That requires:

- **Structured data** search engines can read (so Google understands *who you are* and *what you offer*).
- **Copy** that sounds authoritative and includes the phrases real people type into chatbots and search boxes.
- **Clear service breakdowns** so messaging stays consistent across the site, sales, and pitches.

GEO-PR-Lite bundles those jobs into one dashboard: you paste or enter information, and the system helps you **analyze**, **rewrite**, **organize**, and **export** outputs you can paste into a website, CMS, or brief.

---

## The big picture

You work in a **three-column workspace**:

1. **Left:** Choose what you’re working on (mainly **Schema Builder** or **Keyword Checker**).
2. **Center:** Type or paste your inputs and run actions (analyze, generate, optimize).
3. **Right:** **Intelligence** (scores and gaps) and a **media-style view** of assets mentioned in your catalog.

Nothing here “publishes” your site automatically. You **copy** JSON-LD, markdown, or text and place it where you host your site. The tool is a **workbench**, not a replacement for your CMS or hosting.

---

## What “AI” means in this product

Several features call a **Google Gemini** model behind the scenes. In plain terms:

- The model reads your text and instructions.
- It returns **new text** (rewritten copy, a table of services, or structured data) according to rules baked into the product.
- You are still responsible for **fact-checking** anything the model invents or exaggerates. Treat AI output as a **strong draft**, not a legal or factual guarantee.

If the AI service is unavailable or you hit quota limits, those features will error or ask you to try again later. Non-AI parts (like the rule-based keyword scan) can still work.

---

## Schema Builder: two ways to get structured data

### What you’re producing

**JSON-LD** is a small block of JSON that describes your business in a format search engines understand. **llms.txt** (Markdown) is a human- and crawler-friendly summary some teams put on their site so AI crawlers can quickly grasp what you do.

### The “classic” path (no AI)

You fill in business details. The tool builds a **predictable** schema and a matching markdown summary using fixed rules. Good when you want **consistency** and **no API dependency**.

### The “AI-optimized” path

You add richer context: **industry**, **business description**, **regions**, and **social links**. The system asks the AI to:

- Pick a **Schema.org type** that fits your business (not always a generic “generic agency” type).
- Write a **short, SEO-minded description** that fits search snippets.
- Propose **primary and secondary keywords** for metadata and positioning.

Before anything is shown to you, the product **sanitizes** the AI’s JSON-LD: it keeps types and fields safe, merges in your real URLs and service areas, and avoids broken or overly long descriptions.

**What you do with it:** Copy the JSON-LD into your site (often in a `<script type="application/ld+json">` tag or your SEO plugin). Copy or adapt the llms.txt and host it if your team uses that pattern.

---

## Keyword Checker: three layers of help

### 1. Analyze (rule-based)

You paste text (reviews, website copy, a pitch). The tool scans for **AI- and SEO-friendly language patterns**—things like “data-driven,” “results-driven,” “authority,” and similar phrases. It:

- Counts how many of those signals appear.
- **Highlights** them in your text so you see what’s already strong.
- Suggests **concrete improvements** (e.g. add location, numbers, clearer claims) so the copy reads more like something an AI would **cite** when answering “who is a good PR agency in Toronto?”

This step does **not** rewrite text for you; it **diagnoses** and **guides**.

### 2. Optimize with AI

You describe **how** you want the copy to change (tone, emphasis, audience) and optionally list **exact phrases people type** to find you (e.g. “best PR agency Toronto,” “crisis communications GTA”). The AI:

- Rewrites the text so it **aligns** with those queries and your goals.
- Tries to keep **length and voice** similar to what you started with unless you say otherwise.
- Can **reuse** the analyzer’s suggestions if you didn’t run Analyze first or you want extra reinforcement.

**What you do with it:** Copy the optimized paragraph into your page, blog, or deck. Edit for accuracy and brand voice.

### 3. Structure catalog

You paste long, multi-service copy (or a messy list). The AI is asked to:

- Split the content into **services** (name + full value proposition + keywords per row).
- Pull **filenames** and **contact info** into a separate **asset mapping** list when it finds them in the text.

If the model collapses everything into one row, the product can **fall back** to splitting your text by paragraphs so you still get a usable table.

**What you do with it:** Use the table as a **source of truth** for services on the site, in proposals, or in a content calendar. You can copy Markdown for documentation or handoff.

---

## Intelligence Sidebar (right column)

This section **does not call the server**. It reads whatever you’ve already produced in the session:

- **LLM-readiness score** — A simple score based on how many **measurable “authority” signals** appear in your text (numbers, dollar amounts, placement counts, etc.). Higher means more concrete proof points for AI and humans to latch onto.
- **Detected entities** — Service names and keywords from your catalog, colored to show whether they **actually appear** in your value-proposition text (strong) or only exist as labels (weaker).
- **Missing keywords** — For each service, keywords from your catalog that **don’t appear** in that service’s value proposition. That’s a **coverage gap**: search and AI systems work better when important phrases appear in the narrative, not only in a keyword column.

Use it as a **checklist**, not a grade from Google.

---

## Media Assets (drawer)

When the catalog finds **image filenames** or similar references, they appear as **cards** with a label and a “copy path” action so you can align creative assets with services. If there are more services than mapped images, **placeholder** cards remind you to add visuals so each service line has a matching asset.

**Replace / Upload** are **UI placeholders** in the current product: they don’t upload files to your server by themselves. They express intent for your workflow (designer drops files in CMS, etc.).

---

## Config tab

A short reminder that **AI features need an API key** configured in your deployment or local environment. It’s not a full settings panel; it’s orientation for you or your team.

---

## The separate “Expert Consultant” chat (optional)

Some setups include a **separate small chat** page that talks to the same backend as a **consultant-style** assistant: answers first, then deeper suggestions. It’s a **conversation** interface, not the main dashboard. It uses the same AI key and quota as other AI features.

---

## Access control (how people get in)

### On the live website (Vercel-style hosting)

The site can be restricted so only **approved email addresses** can use it. Typical flow:

1. Allowed list is configured on the server.
2. You open a special link **once** with your email in the URL; the site sets a **cookie** so your browser is recognized.
3. After that, normal visits work until the cookie expires or you clear it.

If you’re not on the list, you see a **forbidden** message instead of the app.

### On your own computer (development)

The local API server may require **HTTP Basic Authentication**: username and password. The username is expected to be your **email** and the password a shared secret configured for development. Browsers don’t send that automatically unless you configure them; this is mainly for **locking down** a dev machine on a shared network.

---

## Data and privacy (what to assume)

- Text you paste is sent to **your backend** and, for AI features, to **Google’s Gemini API** as described in Google’s terms.
- The product does not ship with a built-in **user database** or login system for end customers; access control is **environment + cookie** or **Basic Auth** as described above.
- **Do not paste secrets** (passwords, API keys, private financial data) into the tool.

---

## Limits you will hit in real life

- **API quotas** — Free tiers cap how many AI requests you can make per day. You’ll see errors when the limit is hit; wait or upgrade per Google’s billing.
- **Timeouts** — Very long inputs or slow responses can time out; retry with shorter text or off-peak times.
- **Model behavior** — Occasionally the AI returns JSON or text that doesn’t parse cleanly; the product tries to recover, but a retry may be needed.

---

## How the pieces fit together in a typical workflow

1. **Define the business** in Schema Builder (AI path) → copy JSON-LD and optional llms.txt.
2. **Paste core page or pitch copy** into Keyword Checker → **Analyze** to see gaps.
3. **Optimize with AI** using real search phrases and your tone goals.
4. **Structure catalog** on the same or expanded copy → get a service table + asset list.
5. **Watch the sidebar** to tighten authority signals and keyword coverage.
6. **Use the media drawer** to align filenames with services before publishing.

---

## One-sentence summary

**GEO-PR-Lite** is a strategist’s workbench: it helps you **diagnose** copy, **rewrite** it for how people and AI systems actually search, **extract** a structured service catalog, and **export** schema and summaries you can deploy—while a right-hand panel keeps you honest about **proof points** and **keyword coverage**.
