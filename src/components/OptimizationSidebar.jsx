import { useMemo } from 'react'

/** Match authority signals: numbers with +, $ amounts, years, placements, etc. */
const AUTHORITY_PATTERNS = [
  /\d+\s*\+/g,
  /\$\s*[\d.,]+[MK]?/gi,
  /\d+\s*(?:years?|placements?|clients?|campaigns?|media)\b/gi,
  /\b\d{2,}\s*(?:tier-?1|tier-?2)\b/gi,
  /\b(?:400|500)\s*\+/g,
]

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

/** LLM-Readiness Score 0-100: based on authority signal count (cap at 4+ for 100). */
function computeScore(text) {
  const n = countAuthoritySignals(text)
  if (n === 0) return 0
  if (n >= 4) return 100
  return Math.min(100, n * 25)
}

/** Entities: service names + all keywords. Strong = appears in text, generic = not. */
function getEntities(services = [], valuePropText = '') {
  const lower = (valuePropText || '').toLowerCase()
  const entities = []
  const seen = new Set()
  ;(services || []).forEach((s) => {
    if (s.serviceName && !seen.has(s.serviceName)) {
      seen.add(s.serviceName)
      entities.push({
        name: s.serviceName,
        strong: lower.includes(s.serviceName.toLowerCase()),
      })
    }
    ;(s.keywords || []).forEach((k) => {
      if (k && !seen.has(k)) {
        seen.add(k)
        entities.push({
          name: k,
          strong: lower.includes(k.toLowerCase()),
        })
      }
    })
  })
  return entities
}

/** Gap: for each service, keywords not found in its valueProposition. */
function getMissingKeywords(services = []) {
  const gaps = []
  ;(services || []).forEach((s) => {
    const prop = ((s.valueProposition || '').replace(/\*\*/g, '')).toLowerCase()
    const missing = (s.keywords || []).filter(
      (k) => k && !prop.includes(k.toLowerCase())
    )
    if (missing.length > 0) {
      gaps.push({ serviceName: s.serviceName, keywords: missing })
    }
  })
  return gaps
}

export default function OptimizationSidebar({
  valuePropositionText = '',
  optimizedText = '',
  catalog = null,
  analysisResult = null,
}) {
  const combinedText = [valuePropositionText, optimizedText].filter(Boolean).join('\n\n')

  const score = useMemo(() => computeScore(combinedText), [combinedText])
  const services = catalog?.services || []
  const entities = useMemo(
    () => getEntities(services, combinedText),
    [services, combinedText]
  )
  const missingKeywords = useMemo(() => getMissingKeywords(services), [services])

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
        <div className="entityPills">
          {entities.length === 0 && (
            <span className="entityPill entityPillMuted">No entities yet</span>
          )}
          {entities.map((e, i) => (
            <span
              key={i}
              className={`entityPill ${e.strong ? 'entityPillStrong' : 'entityPillGeneric'}`}
            >
              {e.name}
            </span>
          ))}
        </div>
      </div>

      <div className="sidebarSection">
        <h4 className="sidebarSectionTitle">Missing Keywords</h4>
        <p className="sidebarHint">Targeted keywords not yet in value propositions</p>
        {missingKeywords.length === 0 && (
          <p className="sidebarMuted">100% coverage</p>
        )}
        <ul className="gapList">
          {missingKeywords.map((g, i) => (
            <li key={i}>
              <strong>{g.serviceName}:</strong>{' '}
              {g.keywords.join(', ')}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
