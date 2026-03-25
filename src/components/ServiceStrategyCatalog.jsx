import { useEffect, useMemo } from 'react'

// NOTE: This component renders your catalog table and also extracts
// "Authority Signal" entities from the chosen Value Proposition text.
//
// It is intentionally deterministic-ish (regex-based) so UI stays stable
// even when Gemini output varies.

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function withBoldFromMarkdownStrong(str) {
  // Converts **entity** markers into <strong> ... </strong>.
  if (typeof str !== 'string') return ''
  const parts = str.split(/\*\*(.+?)\*\*/g)
  return parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p))
}

function splitSentences(text) {
  const raw = String(text || '').replace(/\r\n/g, '\n').trim()
  if (!raw) return []
  // Split on common sentence terminators.
  const sentences = raw.split(/(?<=[.!?])\s+|\n+/g).map((s) => s.trim()).filter(Boolean)
  return sentences
}

function stripMarkdownStrong(text) {
  return String(text || '').replace(/\*\*/g, '')
}

// Entity extraction requirements:
// - Names (e.g. Andrea)
// - Locations (Toronto, GTA, etc.)
// - Quantifiable Results ($50M+, 400+, years, tier-1 placements)
function extractAuthorityEntities(valuePropText) {
  const text = stripMarkdownStrong(valuePropText).trim()
  const entities = []
  const seen = new Set()

  const push = (s) => {
    const v = String(s || '').trim()
    if (!v) return
    const key = v.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    entities.push(v)
  }

  // Names: prioritize Andrea-related names.
  if (/\bAndrea\s+Chrysanthou\b/i.test(text)) push(text.match(/\bAndrea\s+Chrysanthou\b/i)?.[0])
  else if (/\bAndrea\b/i.test(text)) push(text.match(/\bAndrea\b/i)?.[0])
  if (/\bChrysanthou\b/i.test(text)) push(text.match(/\bChrysanthou\b/i)?.[0])

  // Locations.
  const locationPatterns = [
    /\bGreater\s+Toronto\s+Area\b/i,
    /\bToronto\b/i,
    /\bGTA\b/i,
    /\bCanada\b/i,
  ]
  for (const re of locationPatterns) {
    const m = text.match(re)
    if (m && m[0]) push(m[0])
  }

  // Quantifiable results: currency, + counts, tier-1 placements, years.
  const currency = text.match(/\$\s*[\d.,]+\s*[MK]?\s*\+?/gi) || []
  currency.forEach((m) => push(m.replace(/\s+/g, ' ').trim()))

  const plusNumbers = text.match(/\b\d[\d,]*\s*\+\b/g) || []
  plusNumbers.forEach((m) => push(m.replace(/\s+/g, ' ').trim()))

  const fewerThan = text.match(/\bfewer than\s+\d[\d,]*\b/gi) || []
  fewerThan.forEach((m) => push(m.replace(/\s+/g, ' ').trim()))

  const tierPlacements = text.match(/\b\d[\d,]*\s*(?:tier-?1|tier-?2)\b/gi) || []
  tierPlacements.forEach((m) => push(m.replace(/\s+/g, ' ').trim()))

  const years = text.match(/\b(?:almost\s+)?\d{1,2}\s+years?\b/gi) || []
  years.forEach((m) => push(m.replace(/\s+/g, ' ').trim()))

  // Optional: capture "APR" / certifications as "signals" if present.
  if (/\bAPR\b/.test(text)) push('APR')

  return entities
}

function boldEntitiesInText(valuePropText, entities) {
  const plain = stripMarkdownStrong(valuePropText)
  if (!entities || entities.length === 0) return plain
  // Bold longer entities first to avoid partial replacements.
  const sorted = [...entities].sort((a, b) => b.length - a.length)
  let out = plain
  for (const ent of sorted) {
    const re = new RegExp(escapeRegExp(ent), 'gi')
    out = out.replace(re, (m) => `**${m}**`)
  }
  return out
}

function scoreSentence(sentence, serviceName, keywords) {
  const s = sentence.toLowerCase()
  let score = 0

  // Strong signal: sentence contains quantifiable patterns.
  if (/\$\s*[\d.,]+[MK]?/i.test(sentence)) score += 40
  if (/\b\d[\d,]*\s*\+\b/.test(sentence)) score += 30
  if (/(tier-?1|tier-?2)/i.test(sentence)) score += 25
  if (/\b(?:almost\s+)?\d{1,2}\s+years?\b/i.test(sentence)) score += 15

  // Service name overlap.
  const sn = String(serviceName || '')
    .replace(/[&/]/g, ' ')
    .split(/\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 3)
  for (const token of sn) {
    if (s.includes(token.toLowerCase())) score += 10
  }

  // Keyword overlap.
  const kws = Array.isArray(keywords) ? keywords : []
  for (const kw of kws) {
    const clean = String(kw || '').trim()
    if (!clean) continue
    const parts = clean.split(',').map((p) => p.trim()).filter(Boolean)
    const matched = parts.some((p) => s.includes(p.toLowerCase()))
    if (matched) score += 8
  }

  return score
}

function chooseBestSentence(valueProposition, serviceName, keywords) {
  const vpText = stripMarkdownStrong(valueProposition)
  const sentences = splitSentences(vpText)
  if (sentences.length === 0) return vpText

  // Prefer any sentence with quantifiable results.
  const hasQuant = sentences.some(
    (s) => /\$\s*[\d.,]+[MK]?/i.test(s) || /\b\d[\d,]*\s*\+\b/.test(s) || /(tier-?1|tier-?2)/i.test(s),
  )

  let best = sentences[0]
  let bestScore = -Infinity
  for (const sentence of sentences) {
    if (hasQuant) {
      const containsQuant =
        /\$\s*[\d.,]+[MK]?/i.test(sentence) || /\b\d[\d,]*\s*\+\b/.test(sentence) || /(tier-?1|tier-?2)/i.test(sentence)
      if (!containsQuant) continue
    }

    const score = scoreSentence(sentence, serviceName, keywords)
    if (score > bestScore) {
      bestScore = score
      best = sentence
    }
  }

  return best
}

export default function ServiceStrategyCatalog({ catalog, onAuthoritySignals }) {
  const rows = catalog?.services || []
  const authoritySignals = useMemo(() => {
    const sigs = []
    const seen = new Set()
    const push = (s) => {
      const v = String(s || '').trim()
      if (!v) return
      const key = v.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      sigs.push(v)
    }

    for (const row of rows) {
      const chosen = chooseBestSentence(row.valueProposition || '', row.serviceName, row.keywords || [])
      const entities = extractAuthorityEntities(chosen)
      entities.forEach(push)
    }

    return sigs
  }, [rows])

  useEffect(() => {
    if (typeof onAuthoritySignals === 'function') {
      onAuthoritySignals(authoritySignals)
    }
  }, [authoritySignals, onAuthoritySignals])

  if (!rows || rows.length === 0) return null

  return (
    <div className="catalogTableWrap">
      <table className="catalogTable">
        <thead>
          <tr>
            <th>Service</th>
            <th>Value Proposition</th>
            <th>Targeted Keywords</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const chosenSentence = chooseBestSentence(s.valueProposition || '', s.serviceName, s.keywords || [])
            const entities = extractAuthorityEntities(chosenSentence)
            const bolded = boldEntitiesInText(chosenSentence, entities)

            return (
              <tr key={i}>
                <td>{s.serviceName}</td>
                <td>{withBoldFromMarkdownStrong(bolded)}</td>
                <td>{(s.keywords || []).join(', ')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

