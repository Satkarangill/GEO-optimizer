import { useState } from 'react'

/**
 * MediaGrid: visual library from Asset Mapping + Service Strategy Catalog.
 * - Cards: placeholder thumbnail, filename, badge (service/label), Copy Path, Replace.
 * - Upload placeholders for services that have no image (1:1 mapping).
 */
export default function MediaGrid({ assetMapping = [], services = [] }) {
  const [copiedPath, setCopiedPath] = useState(null)

  const copyPath = (value) => {
    if (!value) return
    navigator.clipboard.writeText(value).then(() => {
      setCopiedPath(value)
      setTimeout(() => setCopiedPath(null), 2000)
    })
  }

  const numPlaceholders = Math.max(0, (services?.length || 0) - (assetMapping?.length || 0))

  return (
    <div className="mediaGridWrap">
      <div className="mediaGrid">
        {(assetMapping || []).map((asset, i) => (
          <div key={`asset-${i}`} className="mediaCard">
            <div className="mediaCardThumb">
              <span className="mediaCardThumbPlaceholder">Image</span>
            </div>
            <div className="mediaCardFilename" title={asset.value}>
              {asset.value}
            </div>
            <span className="mediaCardBadge">{asset.label || 'Asset'}</span>
            <div className="mediaCardActions">
              <button
                type="button"
                className="mediaCardBtn"
                onClick={() => copyPath(asset.value)}
              >
                {copiedPath === asset.value ? 'Copied' : 'Copy Path'}
              </button>
              <button type="button" className="mediaCardBtn mediaCardBtnReplace">
                Replace
              </button>
            </div>
          </div>
        ))}
        {numPlaceholders > 0 &&
          Array.from({ length: numPlaceholders }, (_, i) => (
            <div key={`placeholder-${i}`} className="mediaCard mediaCardPlaceholder">
              <div className="mediaCardThumb mediaCardThumbEmpty">
                <span className="mediaCardThumbPlaceholder">Upload</span>
              </div>
              <span className="mediaCardFilename mediaCardFilenameMuted">
                No image for service
              </span>
              <span className="mediaCardBadge mediaCardBadgeMuted">Placeholder</span>
              <div className="mediaCardActions">
                <button type="button" className="mediaCardBtn" disabled>
                  Copy Path
                </button>
                <button type="button" className="mediaCardBtn mediaCardBtnReplace">
                  Upload
                </button>
              </div>
            </div>
          ))}
      </div>
      {(!assetMapping || assetMapping.length === 0) && (!services || services.length === 0) && (
        <p className="mediaGridEmpty">Generate a Strategy Catalog to see assets and placeholders.</p>
      )}
    </div>
  )
}
