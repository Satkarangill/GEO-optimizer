import { useState } from 'react'
import SchemaBuilder from './components/SchemaBuilder'
import KeywordChecker from './components/KeywordChecker'
import OptimizationSidebar from './components/OptimizationSidebar'
import MediaGrid from './components/MediaGrid'
import './App.css'

function LogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="appLogo">
      <path d="M14 2L24 8v12L14 26L4 20V8L14 2z" stroke="currentColor" strokeWidth="1.5" fill="var(--accent)" fillOpacity="0.2" strokeLinejoin="round" />
      <path d="M14 10v8M10 14h8" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function NavIcon({ name }) {
  const icons = {
    dashboard: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    schema: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    keywords: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
    config: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  }
  return icons[name] || null
}

function App() {
  const [activeTab, setActiveTab] = useState('schema')
  const [sharedCatalog, setSharedCatalog] = useState(null)
  const [sharedOptimizedText, setSharedOptimizedText] = useState('')
  const [sharedResult, setSharedResult] = useState(null)
  const [sharedText, setSharedText] = useState('')
  const [mediaDrawerOpen, setMediaDrawerOpen] = useState(true)

  const handleShare = (data) => {
    if (data.catalog !== undefined) setSharedCatalog(data.catalog)
    if (data.optimizedText !== undefined) setSharedOptimizedText(data.optimizedText)
    if (data.result !== undefined) setSharedResult(data.result)
    if (data.text !== undefined) setSharedText(data.text)
  }

  const valuePropositionText = (sharedCatalog?.services || [])
    .map((s) => s.valueProposition)
    .filter(Boolean)
    .join('\n\n')

  return (
    <div className="app">
      <header className="appHeader">
        <div className="appHeaderLeft">
          <LogoIcon />
          <h1 className="appTitle">GEO-PR-Lite</h1>
        </div>
        <div className="appHeaderRight">
          <div className="userAvatar" aria-hidden="true" />
        </div>
      </header>

      <main className="appMain">
        <div className="dashboardLayout">
          <nav className="dashboardNav">
            <button
              type="button"
              className={`navItem ${activeTab === 'schema' ? 'active' : ''}`}
              onClick={() => setActiveTab('schema')}
            >
              <NavIcon name="dashboard" />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              className={`navItem ${activeTab === 'schema' ? 'active' : ''}`}
              onClick={() => setActiveTab('schema')}
              aria-label="Schema Builder"
            >
              <NavIcon name="schema" />
              <span>Schema Builder</span>
            </button>
            <button
              type="button"
              className={`navItem ${activeTab === 'keywords' ? 'active' : ''}`}
              onClick={() => setActiveTab('keywords')}
            >
              <NavIcon name="keywords" />
              <span>Keyword Checker</span>
            </button>
            <button
              type="button"
              className={`navItem ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              <NavIcon name="config" />
              <span>Config</span>
            </button>
          </nav>

          <div className="dashboardMain">
            <div className="panel">
              {(activeTab === 'schema' || activeTab === 'keywords') && (
                <h2 className="sectionTitle inputZoneTitle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                  Input Zone
                </h2>
              )}
              {activeTab === 'schema' && <SchemaBuilder />}
              {activeTab === 'keywords' && (
                <KeywordChecker onShare={handleShare} />
              )}
              {activeTab === 'config' && (
                <section className="sectionBlock">
                  <h2 className="sectionTitle">
                    <NavIcon name="config" />
                    Config
                  </h2>
                  <p className="textMuted">Environment and API settings. Ensure GEMINI_API_KEY is set in .env for AI features.</p>
                </section>
              )}
            </div>
          </div>

          <div className="dashboardIntelligence">
            <div className="dashboardIntelligenceSticky">
              <OptimizationSidebar
                valuePropositionText={valuePropositionText}
                optimizedText={sharedOptimizedText}
                catalog={sharedCatalog}
                analysisResult={sharedResult}
              />
            </div>
            <div className="mediaDrawer">
              <div className="mediaDrawerHeader">
                <span className="mediaGridTitle">Media Assets</span>
                <button
                  type="button"
                  onClick={() => setMediaDrawerOpen(!mediaDrawerOpen)}
                >
                  {mediaDrawerOpen ? 'Collapse' : 'Expand'}
                </button>
              </div>
              {mediaDrawerOpen && (
                <MediaGrid
                  assetMapping={sharedCatalog?.assetMapping || []}
                  services={sharedCatalog?.services || []}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
