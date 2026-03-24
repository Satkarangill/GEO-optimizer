import { useState, useMemo, useEffect } from 'react'

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  return ''
}

export default function KeywordChecker({ onShare }) {
  const [text, setText] = useState('')
  const [howToOptimize, setHowToOptimize] = useState('')
  const [userPrompts, setUserPrompts] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [optimizedText, setOptimizedText] = useState('')
  const [loadingOptimize, setLoadingOptimize] = useState(false)
  const [optimizeError, setOptimizeError] = useState('')
  const [copied, setCopied] = useState(false)
  const [catalog, setCatalog] = useState(null)
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [copiedCatalog, setCopiedCatalog] = useState(false)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    setError('')
    setResult(null)
    setOptimizedText('')
    setCatalog(null)
    setLoading(true)
    try {
      const res = await fetch(`${getApiBase()}/api/analyze-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const raw = await res.text()
      let data
      try {
        data = JSON.parse(raw)
      } catch {
        setError('Server returned an invalid response. Run "npm run dev" so both the app and API are running.')
        return
      }
      if (!res.ok) {
        setError(data.error || 'Failed to analyze text')
        return
      }
      setResult(data)
    } catch (err) {
      setError(err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOptimize = async () => {
    if (!text.trim()) return
    setOptimizeError('')
    setOptimizedText('')
    setLoadingOptimize(true)
    try {
      const res = await fetch(`${getApiBase()}/api/optimize-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          how_to_optimize: howToOptimize.trim(),
          user_prompts: userPrompts.trim(),
          suggestions: result?.suggestions,
        }),
      })
      const contentType = res.headers.get('content-type') || ''
      const raw = await res.text()
      if (!contentType.includes('application/json')) {
        setOptimizeError(
          'API not reachable or returned an error page. From the project root run "npm run dev", then add GEMINI_API_KEY to a .env file (see SETUP.md).'
        )
        return
      }
      let data
      try {
        data = JSON.parse(raw)
      } catch {
        setOptimizeError(
          'Invalid response from server. See SETUP.md: run "npm run dev" and set GEMINI_API_KEY in .env.'
        )
        return
      }
      if (!res.ok) {
        setOptimizeError(data.error || 'Failed to optimize text')
        return
      }
      setOptimizedText(data.optimized_text ?? '')
    } catch (err) {
      setOptimizeError(err.message || 'Request failed')
    } finally {
      setLoadingOptimize(false)
    }
  }

  useEffect(() => {
    if (typeof onShare === 'function') {
      onShare({ catalog, optimizedText, result, text })
    }
  }, [catalog, optimizedText, result, text, onShare])

  const copyOptimized = () => {
    if (!optimizedText) return
    navigator.clipboard.writeText(optimizedText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleStructureCatalog = async () => {
    if (!text.trim()) return
    setCatalogError('')
    setCatalog(null)
    setLoadingCatalog(true)
    try {
      const res = await fetch(`${getApiBase()}/api/structure-catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      const raw = await res.text()
      let data
      try {
        data = JSON.parse(raw)
      } catch {
        setCatalogError('Server returned an invalid response. Run "npm run dev" and ensure GEMINI_API_KEY is set in .env.')
        return
      }
      if (!res.ok) {
        setCatalogError(data.error || 'Failed to structure catalog')
        return
      }
      setCatalog(data)
    } catch (err) {
      setCatalogError(err.message || 'Request failed')
    } finally {
      setLoadingCatalog(false)
    }
  }

  const markdownExport = () => {
    if (!catalog) return ''
    const rows = (catalog.services || []).map(
      (s) =>
        `| ${s.serviceName} | ${(s.valueProposition || '').replace(/\*\*/g, '**')} | ${(s.keywords || []).join(', ')} |`
    )
    const table =
      '| Service | Value Proposition | Targeted Keywords |\n| --- | --- | --- |\n' + rows.join('\n')
    const assets =
      catalog.assetMapping && catalog.assetMapping.length > 0
        ? '\n\n## Asset & Contact Mapping\n\n' +
          catalog.assetMapping.map((a) => `${a.label}: ${a.value}`).join('\n')
        : ''
    return table + assets
  }

  const copyCatalogMarkdown = () => {
    const md = markdownExport()
    if (!md) return
    navigator.clipboard.writeText(md).then(() => {
      setCopiedCatalog(true)
      setTimeout(() => setCopiedCatalog(false), 2000)
    })
  }

  const highlightedHtml = useMemo(() => {
    if (!result || !result.highlights || result.highlights.length === 0) return text
    const sorted = [...result.highlights].sort((a, b) => a.start - b.start)
    const parts = []
    let last = 0
    for (const { start, end } of sorted) {
      if (start < last) continue
      parts.push({ type: 'text', value: text.slice(last, start) })
      parts.push({ type: 'mark', value: text.slice(start, end) })
      last = end
    }
    parts.push({ type: 'text', value: text.slice(last) })
    return parts
      .map((p) => (p.type === 'mark' ? `<mark>${escapeHtml(p.value)}</mark>` : escapeHtml(p.value)))
      .join('')
  }, [text, result])

  return (
    <>
      <div className="formGroup">
        <label htmlFor="analyze_text">Paste text to analyze (reviews, articles, website copy)</label>
        <textarea
          id="analyze_text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste client reviews, news clips, or your own copy here..."
        />
      </div>
      <div className="optimizeOptions">
        <div className="formGroup">
          <label htmlFor="how_to_optimize">How do you want it optimized?</label>
          <textarea
            id="how_to_optimize"
            value={howToOptimize}
            onChange={(e) => setHowToOptimize(e.target.value)}
            placeholder="e.g. More formal tone, emphasize crisis communications, shorter and punchier, focus on B2B tech clients..."
            rows={2}
          />
        </div>
        <div className="formGroup">
          <label htmlFor="user_prompts">Exact prompts people use to find you (in ChatGPT, search, etc.)</label>
          <textarea
            id="user_prompts"
            value={userPrompts}
            onChange={(e) => setUserPrompts(e.target.value)}
            placeholder={'e.g. best PR agency Toronto\nstrategic communications consultant Ottawa\ndata-driven consulting firm (one per line or comma-separated)'}
            rows={3}
          />
        </div>
      </div>
      <div className="actions">
        <button type="button" onClick={handleAnalyze} disabled={loading}>
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
        <button
          type="button"
          onClick={handleOptimize}
          disabled={loadingOptimize || !text.trim()}
          className="buttonOptimize"
        >
          {loadingOptimize ? 'Optimizing…' : 'Optimize with AI'}
        </button>
        <button
          type="button"
          onClick={handleStructureCatalog}
          disabled={loadingCatalog || !text.trim()}
          className="buttonCatalog"
        >
          {loadingCatalog ? 'Structuring…' : 'Structure catalog'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {optimizeError && <p className="error">{optimizeError}</p>}
      {catalogError && <p className="error">{catalogError}</p>}
      {result != null && (
        <>
          <div className="scoreDisplay">
            {result.score} AI-friendly adjective{result.score !== 1 ? 's' : ''} found
          </div>
          {result.matches && result.matches.length > 0 && (
            <div className="matchesList">
              <strong>Matches:</strong>
              <ul>
                {result.matches.map((m, i) => (
                  <li key={i}>
                    “{m.phrase}” × {m.count}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="suggestionsBlock">
            <h4>Suggestions to rank higher in ChatGPT</h4>
            {result.suggestions && result.suggestions.length > 0 ? (
              <ul className="suggestionsList">
                {result.suggestions.map((s, i) => (
                  <li key={i} className={`suggestion suggestion--${s.priority}`}>
                    <strong>{s.title}</strong> — {s.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="suggestionsFallback">
                Add &quot;Toronto&quot; or &quot;GTA&quot;, concrete numbers (e.g. &quot;400+ media placements&quot;, &quot;$50M in communications&quot;), and more adjectives like Strategic, Results-driven, and Responsive to strengthen how ChatGPT recommends you. If you restarted the app and still see only this, the analyzer is up to date.
              </p>
            )}
          </div>
          {text && (
            <div className="resultBlock">
              <h4>Text with highlights</h4>
              <div
                className="highlightBox"
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            </div>
          )}
        </>
      )}
      {optimizedText && (
        <div className="resultBlock resultBlock--optimized">
          <div className="copyRow">
            <h4>AI-optimized text (for ChatGPT ranking)</h4>
            <button type="button" onClick={copyOptimized}>
              Copy
            </button>
            {copied && <span className="copied">Copied</span>}
          </div>
          <textarea
            className="result result--optimized"
            readOnly
            value={optimizedText}
            rows={14}
          />
        </div>
      )}
      {catalog && (catalog.services?.length > 0 || (catalog.assetMapping?.length > 0)) && (
        <div className="resultBlock catalogResult">
          <div className="catalogSectionHead">
            <h2 className="sectionTitle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Strategy Catalog
            </h2>
            <span className="badge badgeMarkdown">Markdown</span>
          </div>
          <div className="copyRow">
            <button type="button" onClick={copyCatalogMarkdown}>
              Copy as Markdown
            </button>
            {copiedCatalog && <span className="copied">Copied</span>}
          </div>
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
                {(catalog.services || []).map((s, i) => (
                  <tr key={i}>
                    <td>{s.serviceName}</td>
                    <td>{withBold(s.valueProposition)}</td>
                    <td>{(s.keywords || []).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            {catalog.assetMapping && catalog.assetMapping.length > 0 && (
            <div className="assetMapping">
              <h2 className="sectionTitle mediaAssetsTitle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
                Media & Assets
              </h2>
              <ul>
                {catalog.assetMapping.map((a, i) => (
                  <li key={i}>
                    <strong>{a.label}:</strong> {a.value}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  )
}

function withBold(str) {
  if (typeof str !== 'string') return null
  const parts = str.split(/\*\*(.+?)\*\*/g)
  return parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p))
}

function escapeHtml(s) {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}
