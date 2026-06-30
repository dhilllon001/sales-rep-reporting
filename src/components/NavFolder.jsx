import React, { useState } from 'react'
import { Icon } from './primitives.jsx'

const OPEN_KEY = 'sr.navFoldersOpen'

function readOpenFolders() {
  try {
    const raw = localStorage.getItem(OPEN_KEY)
    return raw ? JSON.parse(raw) : { sales: true }
  } catch {
    return { sales: true }
  }
}

function writeOpenFolders(next) {
  try { localStorage.setItem(OPEN_KEY, JSON.stringify(next)) } catch {}
}

export function NavFolder({ folder, collapsed, pathname, onNavigate }) {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = readOpenFolders()
    return saved[folder.id] ?? folder.id === 'sales'
  })
  const hasChildren = folder.items.length > 0
  const folderActive = folder.items.some((item) => item.path && pathname.startsWith(item.path))

  const toggle = () => {
    setIsOpen((prev) => {
      const next = !prev
      writeOpenFolders({ ...readOpenFolders(), [folder.id]: next })
      return next
    })
  }

  if (collapsed) {
    return (
      <button
        type="button"
        className={`shell-nav-folder__icon-btn${folderActive ? ' is-active' : ''}`}
        title={folder.label}
        onClick={() => {
          if (folder.items.find((i) => i.path)) {
            const first = folder.items.find((i) => i.path)
            onNavigate(first.path)
          }
        }}
      >
        <Icon name={folder.icon} size={16} />
      </button>
    )
  }

  return (
    <div className={`shell-nav-folder${isOpen ? ' is-open' : ''}${folderActive ? ' is-active-group' : ''}`}>
      <button
        type="button"
        className="shell-nav-folder__head"
        onClick={toggle}
        aria-expanded={hasChildren ? isOpen : undefined}
      >
        <span className="shell-nav-folder__chevron">
          <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={14} />
        </span>
        <span className="shell-nav-folder__icon"><Icon name={folder.icon} size={15} /></span>
        <span className="shell-nav-folder__label">{folder.label}</span>
      </button>
      {isOpen && (
        <div className="shell-nav-folder__children">
          {hasChildren ? folder.items.map((item) => {
            const active = item.path && pathname.startsWith(item.path)
            const disabled = !item.path
            return (
              <button
                key={item.id}
                type="button"
                className={`shell-nav-folder__item${active ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
                disabled={disabled}
                title={disabled ? `${item.label} — coming soon` : item.label}
                onClick={() => item.path && onNavigate(item.path)}
              >
                <span className="shell-nav-folder__item-dot" />
                <span className="shell-nav-folder__item-label">{item.label}</span>
              </button>
            )
          }) : (
            <div className="shell-nav-folder__empty">No reports yet</div>
          )}
        </div>
      )}
    </div>
  )
}
