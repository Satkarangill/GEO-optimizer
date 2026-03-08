/** Allowlist of Schema.org types for structured data. */
const ALLOWED_TYPES = new Set([
  'ProfessionalService',
  'ConsultingBusiness',
  'LegalService',
  'SoftwareApplication',
  'LocalBusiness',
  'Organization',
  'FinancialService',
  'MedicalBusiness',
  'RealEstateAgent',
  'AccountingService',
  'Dentist',
  'Physician',
  'Plumber',
  'Electrician',
  'GeneralContractor',
]);

/** Schema.org keys we allow in sanitized JSON-LD (non-exhaustive safe set). */
const ALLOWED_JSONLD_KEYS = new Set([
  '@context',
  '@type',
  'name',
  'description',
  'url',
  'sameAs',
  'areaServed',
  'address',
  'serviceType',
  'slogan',
  'foundingDate',
  'numberOfEmployees',
  'priceRange',
]);

const MAX_DESCRIPTION_LENGTH = 160;

function isValidUrl(s) {
  if (typeof s !== 'string' || !s.trim()) return false;
  try {
    const u = new URL(s.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize AI-generated JSON-LD: enforce Schema.org context/type, inject user name/sameAs/areaServed,
 * cap description length, strip disallowed keys.
 * @param {object} aiJsonLd - Parsed JSON-LD from AI
 * @param {{ name: string, sameAs?: string[], areasServed?: string[] }} options - User-supplied values
 * @returns {{ json_ld: string } | { error: string }}
 */
export function sanitizeSchema(aiJsonLd, options = {}) {
  if (!aiJsonLd || typeof aiJsonLd !== 'object') {
    return { error: 'Invalid or missing AI JSON-LD' };
  }

  const { name, sameAs = [], areasServed = [] } = options;
  const nameStr = typeof name === 'string' ? name.trim() : '';
  const sameAsFiltered = Array.isArray(sameAs)
    ? sameAs.filter((u) => isValidUrl(u))
    : [];
  const areasNormalized = Array.isArray(areasServed)
    ? areasServed.filter(Boolean).map((a) => String(a).trim())
    : [];

  let type = aiJsonLd['@type'];
  if (typeof type !== 'string' || !ALLOWED_TYPES.has(type.trim())) {
    type = 'ProfessionalService';
  } else {
    type = type.trim();
  }

  let description = aiJsonLd.description;
  if (typeof description !== 'string') {
    description = '';
  }
  description = description.trim();
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    description = description.slice(0, MAX_DESCRIPTION_LENGTH - 3) + '...';
  }

  const out = {
    '@context': 'https://schema.org',
    '@type': type,
    name: nameStr || (aiJsonLd.name && String(aiJsonLd.name).trim()) || 'Business',
    ...(description && { description }),
    ...(sameAsFiltered.length > 0 && { sameAs: sameAsFiltered }),
  };

  if (areasNormalized.length > 0) {
    out.areaServed = areasNormalized.map((loc) => ({
      '@type': 'Place',
      name: loc,
      addressLocality: loc,
    }));
  }

  for (const key of Object.keys(aiJsonLd)) {
    if (key.startsWith('@')) continue;
    if (!ALLOWED_JSONLD_KEYS.has(key)) continue;
    if (out[key] !== undefined) continue;
    const val = aiJsonLd[key];
    if (val === null || val === undefined) continue;
    if (key === 'sameAs' || key === 'areaServed') continue;
    if (key === 'name' || key === 'description') continue;
    out[key] = val;
  }

  return {
    json_ld: JSON.stringify(out, null, 2),
  };
}

/**
 * Pure logic for generating JSON-LD and llms.txt from agency details (v1, no AI).
 */
export function buildSchema(body) {
  const { agency_name, neighborhoods = [], social_links = {} } = body || {};

  if (!agency_name || typeof agency_name !== 'string') {
    return { error: 'agency_name is required' };
  }

  const areasServed = Array.isArray(neighborhoods)
    ? neighborhoods.filter(Boolean).map((n) => String(n).trim())
    : [];
  const sameAs = [
    social_links.wikidata,
    social_links.clutch,
    social_links.website,
    social_links.linkedin,
  ].filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: agency_name.trim(),
    description: `Public relations and communications agency serving ${areasServed.length ? areasServed.join(', ') : 'Toronto'} and surrounding areas.`,
    ...(areasServed.length > 0 && {
      areaServed: areasServed.map((name) => ({
        '@type': 'Place',
        name,
        addressLocality: name,
        addressRegion: 'ON',
        addressCountry: 'CA',
      })),
    }),
    ...(sameAs.length > 0 && { sameAs }),
  };

  const llmsTxt = `# ${agency_name.trim()}

## About
Public relations and communications agency${areasServed.length ? ` serving ${areasServed.join(', ')}` : ''} and surrounding areas.

## Service areas
${areasServed.length ? areasServed.map((a) => `- ${a}`).join('\n') : '- Toronto and GTA'}

## Links
${sameAs.map((url) => `- ${url}`).join('\n')}
`;

  return {
    json_ld: JSON.stringify(jsonLd, null, 2),
    llms_txt: llmsTxt,
  };
}
