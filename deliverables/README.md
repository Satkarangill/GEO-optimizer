# GEO Blueprint Deliverables

This folder contains one-off copy and templates for **Generative Engine Optimization (GEO)** for a Toronto PR agency. Use them on your website and external profiles; no code changes to the GEO-PR-Lite app are required.

## Before you use these

1. **Replace placeholders**  
   Run find-replace (or edit by hand) across the files:
   - `[Agency Name]` → your agency’s legal or brand name  
   - `[Founder Name]` → founder/CEO name where used  
   - `[Case Study 1]`, `[your-linkedin-slug]`, etc. → your real URLs and slugs  

2. **Keep wording consistent**  
   Use the same service list and adjectives (Strategic, Responsive, Results-driven, etc.) on your site, llms.txt, Bing, and LinkedIn so search and LLMs see one clear entity.

---

## Index

| File | Purpose |
|------|--------|
| [llms.txt](llms.txt) | Agency summary for LLM crawlers. Place at site root (e.g. `https://yourdomain.com/llms.txt`) or in your public folder. |
| [schema.json](schema.json) | JSON-LD for your agency. Use for reference or to generate the script block. |
| [schema-embed.html](schema-embed.html) | Same JSON-LD in a `<script type="application/ld+json">` block. Copy into the `<head>` of your homepage (next/head, React Helmet, or static HTML). |
| [homepage-rewrite-brief.md](homepage-rewrite-brief.md) | Rules and examples for rewriting homepage copy for information gain. |
| [case-study-format-guide.md](case-study-format-guide.md) | Challenge → Strategy → Execution → Result format for case studies. |
| [bing-places.txt](bing-places.txt) | Bing Places categories and description. Paste into Bing Places for Business. |
| [linkedin-about-and-bio.txt](linkedin-about-and-bio.txt) | LinkedIn company “About” and founder/CEO bio. |
| [review-request-email-template.md](review-request-email-template.md) | Email template to ask clients for reviews on Facebook, Yelp, and Clutch (with a light keyword nudge). |

---

## Where to put what

- **llms.txt** — Root of your website or `public/` so it is served at `https://yourdomain.com/llms.txt`.
- **Schema** — Inside the `<head>` of your homepage only once (via schema-embed.html or your CMS).
- **Homepage / case studies** — Apply the brief and format guide when editing your live site.
- **Bing / LinkedIn / Email** — Copy from the .txt and .md files into each platform or email client.
