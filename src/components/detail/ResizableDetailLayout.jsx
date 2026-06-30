import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '../primitives.jsx'

const STORAGE_KEY = 'sr.detailSidePct'
const DEFAULT_PCT = 40
const MIN_SIDE = 28
const MAX_SIDE = 55

function loadPct() {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY))
    if (Number.isFinite(v) && v >= MIN_SIDE && v <= MAX_SIDE) return v
  } catch {}
  return DEFAULT_PCT
}

export default function ResizableDetailLayout({
  side,
  children,
  sideCollapsed,
  onExpandSide,
}) {
  const [sidePct, setSidePct] = useState(loadPct)
  const layoutRef = useRef(null)
  const dragging = useRef(false)

  const onPointerDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current || !layoutRef.current) return
      const rect = layoutRef.current.getBoundingClientRect()
      const fromRight = rect.right - e.clientX
      const pct = Math.round((fromRight / rect.width) * 100)
      const clamped = Math.min(MAX_SIDE, Math.max(MIN_SIDE, pct))
      setSidePct(clamped)
    }
    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setSidePct((pct) => {
        try { localStorage.setItem(STORAGE_KEY, String(pct)) } catch {}
        return pct
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  if (sideCollapsed) {
    return (
      <div className="sr-detail-layout sr-detail-layout--collapsed">
        <div className="sr-detail-layout__main">
          <div className="sr-detail-layout__scroll">{children}</div>
        </div>
        <button
          type="button"
          className="sr-detail-collapsed-rail"
          onClick={onExpandSide}
          aria-label="Open AI Insight panel"
          title="Open AI Insight"
        >
          <span className="sr-detail-collapsed-rail__icon">
            <Icon name="sparkles" size={16} />
          </span>
          <span className="sr-detail-collapsed-rail__label">AI Insight</span>
          <span className="sr-detail-collapsed-rail__chevron">
            <Icon name="chevron-left" size={14} />
          </span>
        </button>
      </div>
    )
  }

  return (
    <div
      ref={layoutRef}
      className="sr-detail-layout sr-detail-layout--resizable"
      style={{ gridTemplateColumns: `minmax(0, ${100 - sidePct}fr) 10px minmax(260px, ${sidePct}fr)` }}
    >
      <div className="sr-detail-layout__main">
        <div className="sr-detail-layout__scroll">{children}</div>
      </div>
      <div
        className="sr-detail-layout__resizer"
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={sidePct}
        aria-label="Resize AI Insight panel"
        onPointerDown={onPointerDown}
      >
        <span className="sr-detail-layout__resizer-grip" />
      </div>
      <div className="sr-detail-layout__side">
        <div className="sr-detail-layout__side-inner">{side}</div>
      </div>
    </div>
  )
}
