import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export function useRowHover() {
  const [hover, setHover] = useState(null)

  const show = (id, data, rect) => setHover({ id, data, rect })
  const hide = () => setHover(null)

  const bind = (id, data) => ({
    onMouseEnter: (e) => show(id, data, e.currentTarget.getBoundingClientRect()),
    onMouseLeave: hide,
  })

  return { hover, bind, hide, isHovered: (id) => hover?.id === id }
}

export function RowHoverPopover({ hover, children, width = 280 }) {
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!hover?.rect) return
    const { rect } = hover
    const margin = 12
    const maxTop = window.innerHeight - 16
    let left = rect.right + margin
    if (left + width > window.innerWidth - margin) {
      left = Math.max(margin, rect.left - width - margin)
    }
    const top = Math.min(Math.max(margin, rect.top), maxTop - 180)
    setPos({ top, left })
  }, [hover, width])

  if (!hover) return null

  return createPortal(
    <div className="sr-row-hover-popover" style={{ top: pos.top, left: pos.left, width }} role="tooltip">
      {children}
    </div>,
    document.body,
  )
}

export function HoverPopoverTitle({ children, sub }) {
  return (
    <header className="sr-hover-popover__head">
      <div className="sr-hover-popover__title">{children}</div>
      {sub && <div className="sr-hover-popover__sub">{sub}</div>}
    </header>
  )
}

export function HoverPopoverGrid({ rows }) {
  return (
    <dl className="sr-hover-popover__grid">
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  )
}

export function HoverPopoverHint({ children }) {
  return <div className="sr-hover-popover__hint">{children}</div>
}
