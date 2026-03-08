/**
 * Pure logic for analyzing text for target GEO/PR adjectives.
 */
const TARGET_ADJECTIVES = [
  'strategic',
  'results-driven',
  'results driven',
  'data-driven',
  'data driven',
  'innovative',
  'thought leadership',
  'thought leader',
  'trusted',
  'expert',
  'authority',
  'transparent',
  'authentic',
  'impactful',
  'value-driven',
  'value driven',
  'client-focused',
  'client focused',
  'award-winning',
  'award winning',
  'proven',
  'reliable',
  'creative',
  'collaborative',
  'agile',
  'comprehensive',
  'integrated',
  'measurable',
  'scalable',
];

export function analyzeText(text) {
  const input = typeof text === 'string' ? text : '';
  const lower = input.toLowerCase();
  const matches = [];

  for (const phrase of TARGET_ADJECTIVES) {
    const regex = new RegExp(phrase.replace(/\s+/g, '\\s+'), 'gi');
    const found = lower.match(regex);
    if (found && found.length > 0) {
      matches.push({ phrase, count: found.length });
    }
  }

  const score = matches.reduce((sum, m) => sum + m.count, 0);

  const highlights = [];
  for (const { phrase } of matches) {
    const regex = new RegExp(phrase.replace(/\s+/g, '\\s+'), 'gi');
    let match;
    while ((match = regex.exec(input)) !== null) {
      highlights.push({ start: match.index, end: match.index + match[0].length, phrase: match[0] });
    }
  }
  highlights.sort((a, b) => a.start - b.start);

  const suggestions = getSuggestions(input, matches, score);
  return { score, matches, highlights, suggestions };
}

/**
 * GEO suggestions so the text ranks better in ChatGPT / generative search.
 */
function getSuggestions(input, matches, score) {
  const suggestions = [];
  const lower = input.toLowerCase();
  const matchedPhrases = new Set((matches || []).map((m) => m.phrase.toLowerCase()));

  // Missing high-value adjectives
  const missing = TARGET_ADJECTIVES.filter((p) => !matchedPhrases.has(p)).slice(0, 8);
  if (missing.length > 0) {
    const examples = missing.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
    suggestions.push({
      type: 'adjectives',
      priority: 'high',
      title: 'Add AI-friendly adjectives',
      text: `Your text doesn't use some words that help ChatGPT recommend you. Consider weaving in: ${examples}.`,
    });
  }

  // No geographic signal
  if (!/\b(toronto|gta|greater toronto|ontario)\b/i.test(lower)) {
    suggestions.push({
      type: 'location',
      priority: 'high',
      title: 'Add a Toronto / GTA signal',
      text: "Mention 'Toronto' or 'Greater Toronto Area' so ChatGPT can associate you with local queries like 'best PR agency in Toronto'.",
    });
  }

  // No numbers / quantifiable facts
  const hasQuantifiable = /\d+([\+\%]|\s*(placement|media|campaign|client|year|million|m)\b)/i.test(lower) || /\$\s*\d/i.test(lower);
  if (!hasQuantifiable) {
    suggestions.push({
      type: 'facts',
      priority: 'high',
      title: 'Add quantifiable facts',
      text: "Include concrete numbers (e.g. '400+ tier-1 media placements', '$50M+ in exit communications'). Facts increase 'information gain' and make you easier for AI to cite.",
    });
  }

  // Low adjective count
  if (score < 2 && input.trim().length > 100) {
    suggestions.push({
      type: 'density',
      priority: 'medium',
      title: 'Increase sentiment keyword density',
      text: "Only a few target adjectives were found. Naturally add more terms like Strategic, Results-driven, Responsive, and Specialized so your copy aligns with how users and AI describe top agencies.",
    });
  }

  // Very short or vague
  if (input.trim().length > 0 && input.trim().length < 120) {
    suggestions.push({
      type: 'length',
      priority: 'medium',
      title: 'Expand with specifics',
      text: "Short blurbs give AI little to work with. Add your core services (Crisis Communications, Media Relations, etc.) and one or two concrete outcomes so LLMs have more to retrieve.",
    });
  }

  // Entity clarity (agency name)
  if (input.trim().length > 80 && !/\b(we|our (team|agency|firm)|(agency|firm|company) (name|is|provides))\b/i.test(lower) && !/\[Agency Name\]/.test(input)) {
    suggestions.push({
      type: 'entity',
      priority: 'medium',
      title: 'Name your agency clearly',
      text: "State your agency or firm name and that you're a PR firm (e.g. '[Agency] is a Toronto PR firm that…'). Clear entity names help ChatGPT attribute recommendations.",
    });
  }

  // Sort: high priority first
  const order = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => order[a.priority] - order[b.priority]);
  return suggestions;
}
