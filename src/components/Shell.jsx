import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './primitives.jsx'
import { NavFolder } from './NavFolder.jsx'
import { REPORT_NAV } from '../config/reportNav.js'

const SIDEBAR_KEY = 'sr.sidebarCollapsed'

export function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === '1' } catch { return false }
  })

  const toggle = () => setCollapsed((c) => {
    const next = !c
    try { localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0') } catch {}
    return next
  })

  return (
    <aside className={`shell-navy shell-sidebar${collapsed ? ' is-collapsed' : ''}`} style={{ width: collapsed ? 64 : 'var(--sidebar-width)' }}>
      <div className="shell-sidebar__brand">
        <img src="/logo-mark.svg" width="24" height="24" alt="" style={{ flex: 'none' }} />
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="shell-sidebar__brand-name">ChargerFleet</div>
            <div className="shell-sidebar__brand-sub">Reporting</div>
          </div>
        )}
        {!collapsed && (
          <button type="button" className="shell-sidebar__toggle" onClick={toggle} aria-label="Collapse sidebar">
            <Icon name="panel-left-close" size={16} />
          </button>
        )}
      </div>
      {collapsed && (
        <button type="button" className="shell-sidebar__toggle" onClick={toggle} aria-label="Expand sidebar" style={{ margin: '10px auto 0' }}>
          <Icon name="panel-left-open" size={16} />
        </button>
      )}
      <nav className="shell-sidebar__nav">
        <div className="shell-sidebar__section">
          {!collapsed && <div className="shell-sidebar__section-label">Reports</div>}
          {collapsed && <div className="shell-sidebar__divider" />}
          <div className={`shell-nav-folders${collapsed ? ' is-collapsed' : ''}`}>
            {REPORT_NAV.map((folder) => (
              <NavFolder
                key={folder.id}
                folder={folder}
                collapsed={collapsed}
                pathname={pathname}
                onNavigate={navigate}
              />
            ))}
          </div>
        </div>
      </nav>
      <div className="shell-sidebar__footer">
        <div className="shell-sidebar__avatar">SD</div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="shell-sidebar__user-name">Sukhdeep</div>
            <div className="shell-sidebar__user-email">sukhdeep@chargerfleet.com</div>
          </div>
        )}
      </div>
    </aside>
  )
}
