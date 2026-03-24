import { useState } from 'react'

const getApiBase = () => {
  const configured = (import.meta.env.VITE_API_URL || '').trim()
  if (!configured) return ''
  if (typeof window !== 'undefined') {
    const isLocalPage =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const pointsToLocalApi =
      configured.includes('localhost') || configured.includes('127.0.0.1')
    // Prevent broken production calls if VITE_API_URL was set to localhost in hosted env.
    if (!isLocalPage && pointsToLocalApi) return ''
  }
  return configured.replace(/\/+$/, '')
}

const INDUSTRY_OPTIONS = [
  '',
  'PR / Communications',
  'Consulting',
  'Legal',
  'SaaS',
  'Financial Services',
  'Healthcare',
  'Real Estate',
  'Other',
]

export default function SchemaBuilder() {
  const [agencyName, setAgencyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [industryOther, setIndustryOther] = useState('')
  const [businessDescription, setBusinessDescription] = useState('')
  const [neighborhoods, setNeighborhoods] = useState('')
  const [wikidata, setWikidata] = useState('')
  const [clutch, setClutch] = useState('')
  const [website, setWebsite] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [jsonLd, setJsonLd] = useState('')
  const [llmsTxt, setLlmsTxt] = useState('')
  const [keywords, setKeywords] = useState({ primary: [], secondary: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState({ json: false, llms: false, keywords: false })

  const handleGenerate = async () => {
    if (!agencyName.trim()) {
      setError('Agency name is required.')
      return
    }
    setError('')
    setLoading(true)
    setKeywords({ primary: [], secondary: [] })
    try {
      const industryValue = industry === 'Other' ? industryOther.trim() : industry
      const res = await fetch(`${getApiBase()}/api/generate-optimized-schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agency_name: agencyName.trim(),
          industry: industryValue,
          business_description: businessDescription.trim(),
          neighborhoods: neighborhoods
            .split(/[,;]/)
            .map((n) => n.trim())
            .filter(Boolean),
          social_links: {
            wikidata: wikidata.trim() || undefined,
            clutch: clutch.trim() || undefined,
            website: website.trim() || undefined,
            linkedin: linkedin.trim() || undefined,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate schema')
        return
      }
      setJsonLd(data.json_ld ?? '')
      setLlmsTxt(data.llms_txt ?? '')
      setKeywords({
        primary: data.keywords?.primary ?? [],
        secondary: data.keywords?.secondary ?? [],
      })
    } catch (err) {
      setError(err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text, key) => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied((c) => ({ ...c, [key]: true }))
      setTimeout(() => setCopied((c) => ({ ...c, [key]: false })), 2000)
    })
  }

  const allKeywordsText =
    [...(keywords.primary || []), ...(keywords.secondary || [])].join(', ') || ''

  return (
    <>
      <div className="formGroup">
        <label htmlFor="agency_name">Agency name *</label>
        <input
          id="agency_name"
          type="text"
          value={agencyName}
          onChange={(e) => setAgencyName(e.target.value)}
          placeholder="e.g. Acme Consulting"
        />
      </div>
      <div className="formGroup">
        <label htmlFor="industry">Industry</label>
        <select
          id="industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        >
          {INDUSTRY_OPTIONS.map((opt) => (
            <option key={opt || 'blank'} value={opt}>
              {opt || '— Select —'}
            </option>
          ))}
        </select>
        {industry === 'Other' && (
          <input
            type="text"
            value={industryOther}
            onChange={(e) => setIndustryOther(e.target.value)}
            placeholder="e.g. Plumber, Marketing"
            style={{ marginTop: '0.5rem' }}
          />
        )}
      </div>
      <div className="formGroup">
        <label htmlFor="business_description">Business description (About / mission)</label>
        <textarea
          id="business_description"
          value={businessDescription}
          onChange={(e) => setBusinessDescription(e.target.value)}
          placeholder="Brief description of what your business does and who you serve..."
          rows={3}
        />
      </div>
      <div className="formGroup">
        <label htmlFor="neighborhoods">Target neighborhoods or regions</label>
        <input
          id="neighborhoods"
          type="text"
          value={neighborhoods}
          onChange={(e) => setNeighborhoods(e.target.value)}
          placeholder="e.g. Brooklyn NY, London; or Remote/Global"
        />
      </div>
      <div className="formGroup">
        <label htmlFor="wikidata">Wikidata URL</label>
        <input
          id="wikidata"
          type="url"
          value={wikidata}
          onChange={(e) => setWikidata(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="formGroup">
        <label htmlFor="clutch">Clutch URL</label>
        <input
          id="clutch"
          type="url"
          value={clutch}
          onChange={(e) => setClutch(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="formGroup">
        <label htmlFor="website">Website URL</label>
        <input
          id="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="formGroup">
        <label htmlFor="linkedin">LinkedIn URL</label>
        <input
          id="linkedin"
          type="url"
          value={linkedin}
          onChange={(e) => setLinkedin(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="actions">
        <button type="button" onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {jsonLd && (
        <div className="resultBlock">
          <div className="copyRow">
            <h4>JSON-LD (copy and paste)</h4>
            <button type="button" onClick={() => copyToClipboard(jsonLd, 'json')}>
              Copy
            </button>
            {copied.json && <span className="copied">Copied</span>}
          </div>
          <textarea className="result" readOnly value={jsonLd} rows={12} />
        </div>
      )}
      {llmsTxt && (
        <div className="resultBlock">
          <div className="copyRow">
            <h4>llms.txt (copy and paste)</h4>
            <button type="button" onClick={() => copyToClipboard(llmsTxt, 'llms')}>
              Copy
            </button>
            {copied.llms && <span className="copied">Copied</span>}
          </div>
          <textarea className="result" readOnly value={llmsTxt} rows={10} />
        </div>
      )}
      {(keywords.primary?.length > 0 || keywords.secondary?.length > 0) && (
        <div className="resultBlock">
          <div className="copyRow">
            <h4>Keyword Strategy</h4>
            <button
              type="button"
              onClick={() => copyToClipboard(allKeywordsText, 'keywords')}
            >
              Copy all
            </button>
            {copied.keywords && <span className="copied">Copied</span>}
          </div>
          {keywords.primary?.length > 0 && (
            <p>
              <strong>Primary:</strong>{' '}
              {keywords.primary.map((k, i) => (
                <span key={i}>
                  {i > 0 && ', '}
                  <span className="keyword">{k}</span>
                </span>
              ))}
            </p>
          )}
          {keywords.secondary?.length > 0 && (
            <p>
              <strong>Secondary:</strong>{' '}
              {keywords.secondary.map((k, i) => (
                <span key={i}>
                  {i > 0 && ', '}
                  <span className="keyword keywordSecondary">{k}</span>
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </>
  )
}
