import React, { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Icon } from '../components/primitives.jsx'
import { salesReps } from '../data/salesRepMock.js'

const HUB_KEY = 'sr.reportsHubCollapsed'
const LAST_REP_KEY = 'sr.lastRepId'

function defaultRepId() {
  try {
    const saved = localStorage.getItem(LAST_REP_KEY)
    if (saved && salesReps.some((r) => r.id === saved)) return saved
  } catch {}
  return salesReps[0]?.id || ''
}

const LINKS = [
  { segment: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', path: 'sales-rep/dashboard' },
  { segment: 'rep-detail', label: 'Sales Rep Detail', icon: 'user', path: 'sales-rep/rep-detail' },
]

function navActive(pathname, segment) {
  if (segment === 'dashboard') return pathname.includes('/sales-rep/dashboard')
  if (segment === 'rep-detail') return pathname.includes('/sales-rep/rep-detail')
  return false
}

function linkTo(link) {
  if (link.segment === 'rep-detail') {
    const rep = defaultRepId()
    return rep ? `${link.path}?rep=${rep}` : link.path
  }
  return link.path
}

export default function ReportsHub() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(HUB_KEY) === '1' } catch { return false }
  })

  const toggle = () => setCollapsed((c) => {
    const next = !c
    try { localStorage.setItem(HUB_KEY, next ? '1' : '0') } catch {}
    return next
  })

  return (
    <div className="reports-hub">
      <aside
        className={`shell-navy reports-hub__sidebar${collapsed ? ' is-collapsed' : ''}`}
        style={{ width: collapsed ? 64 : 220 }}
      >
        <div className="reports-hub__sidebar-head">
          {!collapsed && (
            <div className="reports-hub__head-text">
              <div className="reports-hub__heading">Sales Rep Reporting</div>
              <div className="reports-hub__subheading">GP KPI Metrics · USD</div>
            </div>
          )}
          <button type="button" className="reports-hub__toggle" onClick={toggle} aria-label={collapsed ? 'Expand' : 'Collapse'}>
            <Icon name={collapsed ? 'panel-left-open' : 'panel-left-close'} size={16} />
          </button>
        </div>
        <div className="reports-hub__sidebar-body">
          <nav className="reports-hub__side-nav">
            {!collapsed && <div className="reports-hub__side-label">Views</div>}
            {LINKS.map((link) => (
              <NavLink
                key={link.segment}
                to={linkTo(link)}
                title={collapsed ? link.label : undefined}
                isActive={(_, loc) => navActive(loc.pathname, link.segment)}
                className={({ isActive }) => `shell-nav-item${isActive ? ' is-active' : ''}`}
              >
                <span className="shell-nav-item__icon"><Icon name={link.icon} size={16} /></span>
                {!collapsed && <span className="shell-nav-item__label">{link.label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
      <div className="reports-hub__main">
        <Outlet />
      </div>
    </div>
  )
}
