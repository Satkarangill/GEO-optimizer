import { useMemo } from 'react'

/** Match authority signals: numbers with +, $ amounts, years, placements, etc. */
const AUTHORITY_PATTERNS = [
  /\d+\s*\+/g,
  /\$\s*[\d.,]+[MK]?/gi,
  /\d+\s*(?:years?|placements?|clients?|campaigns?|media)\b/gi,
  /\b\d{2,}\s*(?:tier-?1|tier-?2)\b/gi,
  /\b(?:400|500)\s*\+/g,
]

const SERVICE_PLACEHOLDER_RE = /^service\s+\d+$/i

/** Junk that should never appear as an "entity" pill (form UI, filenames blob, sentences). */
function isJunkEntityLabel(name) {
  if (!name || typeof name !== 'string') return true
  const t = name.trim()
  if (t.length < 2) return true
  if (SERVICE_PLACEHOLDER_RE.test(t)) return true
  if (t.length > 64) return true
  if (t.split(/\s+/).length > 10) return true
  const lower = t.toLowerCase()
  if (
    /\b(first name|last name|email message)\b/i.test(t) &&
    /\b(linkedin|instagram|bluesky|facebook|twitter)\b/i.test(lower)
  ) {
    return true
  }
  if (/\bbluesky_edited\b/i.test(t) && /\b(instagram|linkedin)\b/i.test(lower)) return true
  if (/\bwe begin by identifying your audiences\b/i.test(t)) return true
  return false
}

function countAuthoritySignals(text) {
  if (!text || typeof text !== 'string') return 0
  const combined = text.replace(/\*\*/g, '')
  let count = 0
  const seen = new Set()
  for (const re of AUTHORITY_PATTERNS) {
    const matches = combined.match(re) || []
    matches.forEach((m) => {
      const norm = m.trim().toLowerCase()
      if (!seen.has(norm)) {
        seen.add(norm)
        count += 1
      }
    })
  }
  return count
}

function computeScore(text) {
  const n = countAuthoritySignals(text)
  if (n === 0) return 0
  if (n >= 4) return 100
  return Math.min(100, n * 25)
}

/**
 * Keywords can be "A, B" as one string — require each segment to appear in the value prop.
 */
function keywordAppearsInProp(propLower, keyword) {
  const raw = (keyword || '').trim()
  if (!raw) return true
  if (propLower.includes(raw.toLowerCase())) return true
  const segments = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (segments.length > 1) {
    return segments.every((seg) => propLower.includes(seg.toLowerCase()))
  }
  return false
}

/**
 * Deduped entity pills: service names + keywords, case-insensitive merge, drop junk and placeholders.
 */
function getEntities(services = [], combinedText = '') {
  const lower = (combinedText || '').toLowerCase()
  const byKey = new Map()

  for (const s of services || []) {
    const sn = (s.serviceName || '').trim()
    if (sn && !isJunkEntityLabel(sn) && !SERVICE_PLACEHOLDER_RE.test(sn)) {
      const key = sn.toLowerCase()
      if (!byKey.has(key)) {
        byKey.set(key, { name: sn, strong: lower.includes(key) })
      }
    }
    for (const k of s.keywords || []) {
      const kw = (k || '').trim()
      if (!kw || isJunkEntityLabel(kw)) continue
      if (kw.length > 56) continue
      const key2 = kw.toLowerCase()
      if (!byKey.has(key2)) {
        byKey.set(key2, { name: kw, strong: keywordAppearsInProp(lower, kw) })
      }
    }
  }

  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Gaps: (1) no keywords on row, (2) keyword not found in that row's value proposition.
 */
function getMissingKeywords(services = []) {
  const gaps = []
  for (const s of services || []) {
    const sn = (s.serviceName || '').trim() || 'Service'
    const prop = ((s.valueProposition || '').replace(/\*\*/g, '')).toLowerCase()
    const kws = (s.keywords || []).map((k) => (k || '').trim()).filter(Boolean)

    if (kws.length === 0) {
      gaps.push({ serviceName: sn, kind: 'no_keywords' })
      continue
    }
    const missing = kws.filter((k) => !keywordAppearsInProp(prop, k))
    if (missing.length > 0) {
      gaps.push({ serviceName: sn, kind: 'missing_in_text', keywords: missing })
    }
  }
  return gaps
}

export default function OptimizationSidebar({
  valuePropositionText = '',
  optimizedText = '',
  catalog = null,
}) {
  const combinedText = [valuePropositionText, optimizedText].filter(Boolean).join('\n\n')

  const score = useMemo(() => computeScore(combinedText), [combinedText])
  const services = catalog?.services || []
  const entities = useMemo(
    () => getEntities(services, combinedText),
    [services, combinedText],
  )
  const missingKeywords = useMemo(() => getMissingKeywords(services), [services])

  const coverageLabel = useMemo(() => {
    if (!services.length) return null
    if (missingKeywords.length === 0) return 'full'
    return 'gaps'
  }, [services.length, missingKeywords.length])

  return (
    <aside className="optimizationSidebar">
      <h3 className="sidebarTitle">Intelligence</h3>

      <div className="sidebarSection">
        <h4 className="sidebarSectionTitle">LLM-Readiness Score</h4>
        <div className="scoreRingWrap">
          <svg className="scoreRing" viewBox="0 0 36 36">
            <path
              className="scoreRingBg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="scoreRingFill"
              strokeDasharray={`${score} ${100 - score}`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="scoreRingValue">{score}</span>
        </div>
        <p className="sidebarHint">Authority signals in your copy (e.g. $50M+, 400+ placements)</p>
      </div>

      <div className="sidebarSection">
        <h4 className="sidebarSectionTitle">Detected Entities</h4>
        <p className="sidebarHint">Distinct services and keywords from your catalog (duplicates and noise hidden)</p>
        <div className="entityPills">
          {entities.length === 0 && (
            <span className="entityPill entityPillMuted">No entities yet — structure a catalog first</span>
          )}
          {entities.map((e, i) => (
            <span
              key={`${e.name}-${i}`}
              className={`entityPill ${e.strong ? 'entityPillStrong' : 'entityPillGeneric'}`}
            >
              {e.name}
            </span>
          ))}
        </div>
      </div>

      <div className="sidebarSection">
        <h4 className="sidebarSectionTitle">Missing Keywords</h4>
        <p className="sidebarHint">Rows with no keywords, or keywords not found in that row&apos;s value proposition</p>
        {!services.length && <p className="sidebarMuted">No strategy catalog loaded</p>}
        {services.length > 0 && coverageLabel === 'full' && (
          <p className="sidebarMuted">All rows have keywords, and each keyword appears in its value proposition.</p>
        )}
        {services.length > 0 && coverageLabel === 'gaps' && (
          <ul className="gapList">
            {missingKeywords.map((g, i) => (
              <li key={i}>
                {g.kind === 'no_keywords' ? (
                  <>
                    <strong>{g.serviceName}</strong>: no targeted keywords — add keywords for this service or run
                    Structure catalog again.
                  </>
                ) : (
                  <>
                    <strong>{g.serviceName}</strong>: missing in text — {g.keywords.join(', ')}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
