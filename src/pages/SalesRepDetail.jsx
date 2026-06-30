import React, { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Panel, Pill, Select } from '../components/primitives.jsx'
import { StatTile, LineTrendChart, MultiLineChart, formatCurrency, formatPct } from '../components/charts.jsx'
import RepProfilePanel from '../components/detail/RepProfilePanel.jsx'
import ResizableDetailLayout from '../components/detail/ResizableDetailLayout.jsx'
import { useReportingScope } from '../context/ReportingScopeContext.jsx'
import { LAST_REFRESH, monthLabel, monthLabelShort, salesReps } from '../data/salesRepMock.js'
import {
  customersForRep, metricsForRepIds, repMonthlyBreakdown, classifyRep,
  customerRevenueTrend, buildRepProfile, teamMembersFor, isManager, periodMonths,
} from '../data/selectors.js'

const INSIGHT_COLLAPSED_KEY = 'sr.insightPanelCollapsed'
const LAST_REP_KEY = 'sr.lastRepId'

function PctCell({ value }) {
  if (value == null) return <span>—</span>
  const cls = value < 0 ? 'sr-pct-negative' : value > 0 ? 'sr-pct-positive' : ''
  return <span className={cls}>{formatPct(value, true)}</span>
}

function TeamToggle({ mode, onChange, show }) {
  if (!show) return null
  return (
    <div className="sr-rank-toggle">
      <button type="button" className={mode === 'self' ? 'is-active' : ''} onClick={() => onChange('self')}>My performance</button>
      <button type="button" className={mode === 'team' ? 'is-active' : ''} onClick={() => onChange('team')}>My team</button>
    </div>
  )
}

export default function SalesRepDetail() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { filters, setFilters } = useReportingScope()
  const [teamMode, setTeamMode] = useState('self')
  const [insightCollapsed, setInsightCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(INSIGHT_COLLAPSED_KEY)
      if (saved === '0') return false
      return true
    } catch {
      return true
    }
  })

  const setInsightPanelCollapsed = (collapsed) => {
    setInsightCollapsed(collapsed)
    try { localStorage.setItem(INSIGHT_COLLAPSED_KEY, collapsed ? '1' : '0') } catch {}
  }

  const periodKey = filters.deliveryMonth === 'LAST_3' ? 'LAST_3' : 'LAST_12'
  const periodMonthsList = useMemo(() => periodMonths(periodKey), [periodKey])

  const repId = searchParams.get('rep')
    || (filters.viewAsId && filters.viewAsId !== 'ALL' ? filters.viewAsId : null)
    || (filters.salesRepId !== 'ALL' ? filters.salesRepId : null)
    || (() => { try { return localStorage.getItem(LAST_REP_KEY) } catch { return null } })()
    || salesReps[0]?.id
  const rep = salesReps.find((r) => r.id === repId)
  const teamMembers = useMemo(() => (rep ? teamMembersFor(rep.id) : []), [rep])
  const showTeamToggle = rep && isManager(rep.id)

  const scopeRepIds = useMemo(() => {
    if (!rep) return []
    if (teamMode === 'team' && showTeamToggle) return [rep.id, ...teamMembers.map((m) => m.id)]
    return [rep.id]
  }, [rep, teamMode, showTeamToggle, teamMembers])

  const repOptions = salesReps.map((r) => ({ value: r.id, label: `${r.name} (${r.country})` }))
  const viewAsOptions = [
    { value: 'ALL', label: 'Management (all)' },
    ...salesReps.map((r) => ({ value: r.id, label: r.name })),
  ]

  const onRepChange = (id) => {
    setSearchParams({ rep: id })
    setFilters({ salesRepId: id, viewAsId: id })
    setTeamMode('self')
  }

  useEffect(() => {
    setTeamMode('self')
  }, [repId])

  useEffect(() => {
    if (!repId) return
    try { localStorage.setItem(LAST_REP_KEY, repId) } catch {}
    if (!searchParams.get('rep')) {
      setSearchParams({ rep: repId }, { replace: true })
    }
  }, [repId, searchParams, setSearchParams])

  const lastPeriod = useMemo(() => (scopeRepIds.length ? metricsForRepIds(scopeRepIds, periodMonthsList) : null), [scopeRepIds, periodMonthsList])
  const metrics12 = useMemo(() => (scopeRepIds.length ? metricsForRepIds(scopeRepIds, periodMonths('LAST_12')) : null), [scopeRepIds])
  const metrics3 = useMemo(() => (scopeRepIds.length ? metricsForRepIds(scopeRepIds, periodMonths('LAST_3')) : null), [scopeRepIds])
  const customers = useMemo(() => {
    if (!rep) return []
    if (teamMode === 'team' && showTeamToggle) {
      return scopeRepIds.flatMap((id) => customersForRep(id, periodMonthsList))
        .sort((a, b) => b.gp - a.gp)
    }
    return customersForRep(rep.id, periodMonthsList)
  }, [rep, teamMode, showTeamToggle, scopeRepIds, periodMonthsList])
  const monthly = useMemo(() => {
    if (!rep) return []
    const rows = repMonthlyBreakdown(rep.id, teamMode === 'team' && showTeamToggle ? scopeRepIds : null)
    return rows.slice(-periodMonthsList.length)
  }, [rep, teamMode, showTeamToggle, scopeRepIds, periodMonthsList])
  const classification = useMemo(() => rep ? classifyRep(rep.id, periodKey) : null, [rep, periodKey])
  const profile = useMemo(() => {
    if (!rep || !classification) return null
    const panelCustomers = customersForRep(rep.id, periodMonthsList)
    return buildRepProfile(rep, panelCustomers, classification, teamMembers)
  }, [rep, classification, teamMembers, periodMonthsList])
  const custTrend = useMemo(() => {
    if (!rep) return []
    return customerRevenueTrend(rep.id, periodMonthsList, 4, teamMode === 'team' && showTeamToggle ? scopeRepIds : null)
  }, [rep, periodMonthsList, teamMode, showTeamToggle, scopeRepIds])

  const trendLabels = monthly.map((m) => monthLabelShort(m.month))
  const gpSeries = [{ name: 'Gross Profit', data: monthly.map((m) => m.gp), color: '#3CC47A', showLabels: true, fill: true }]
  const periodLabel = periodKey === 'LAST_12' ? '12 months' : '3 months'

  const insightSummary = {
    gp12: metrics12?.gp ?? 0,
    gp3: metrics3?.gp ?? 0,
    gpChange: classification?.gpChange ?? 0,
    customerCount: customers.length,
  }

  if (!rep || !lastPeriod || !classification || !profile || !metrics12 || !metrics3) {
    return (
      <div className="sr-page">
        <div className="sr-empty">
          <div className="sr-empty__title">No sales rep selected</div>
          <p>Choose a rep from the dropdown to view their portfolio.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="sr-page sr-page--detail">
      <header className="sr-page__header sr-page__header--detail sr-page__header--compact">
        <div className="sr-detail-header sr-detail-header--compact">
          <div className="sr-detail-header__text">
            <h1 className="sr-detail-header__name">{rep.name}</h1>
            <div className="sr-detail-header__meta">
              <span>{rep.country}</span>
              <span className="sr-detail-header__sep">·</span>
              <span>{rep.email}</span>
              <span className="sr-detail-header__sep">·</span>
              <span>Updated {LAST_REFRESH}</span>
            </div>
          </div>
          <Pill status={classification.performance === 'trending' ? 'enroute' : classification.performance === 'loss' ? 'exception' : 'cleared'}>
            {classification.performance}
          </Pill>
        </div>
        <div className="sr-page__filters sr-page__filters--detail">
          {filters.viewAsId === 'ALL' && (
            <div className="sr-filter-field sr-filter-field--wide">
              <label>Sales Rep</label>
              <Select value={rep.id} onChange={(e) => onRepChange(e.target.value)} options={repOptions} style={{ minWidth: 220 }} />
            </div>
          )}
          <div className="sr-filter-field">
            <label>View as</label>
            <Select
              value={filters.viewAsId || 'ALL'}
              onChange={(e) => {
                const id = e.target.value
                setFilters({ viewAsId: id })
                if (id !== 'ALL') {
                  setSearchParams({ rep: id })
                  setFilters({ viewAsId: id, salesRepId: id })
                }
              }}
              options={viewAsOptions}
            />
          </div>
          <div className="sr-filter-field">
            <label>Period</label>
            <Select
              value={periodKey}
              onChange={(e) => setFilters({ deliveryMonth: e.target.value })}
              options={[{ value: 'LAST_12', label: 'Last 12 Months' }, { value: 'LAST_3', label: 'Last 3 Months' }]}
            />
          </div>
          {showTeamToggle && (
            <div className="sr-filter-field sr-filter-field--scope">
              <label>Scope</label>
              <div className="sr-filter-field__control">
                <TeamToggle mode={teamMode} onChange={setTeamMode} show={showTeamToggle} />
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="sr-detail-shell">
        <div className="sr-detail-kpi-strip sr-detail-kpi-strip--sticky sr-detail-kpi-strip--compact">
          <StatTile label="Customers" value={customers.length} sub={teamMode === 'team' ? 'Team portfolio' : 'Active accounts'} />
          <StatTile label="12-Month GP" value={formatCurrency(metrics12.gp)} accent={metrics12.gp >= 0 ? '#1F7A43' : '#A32B22'} sub={`${formatPct(metrics12.gpPct)} margin`} />
          <StatTile label="3-Month GP" value={formatCurrency(metrics3.gp)} accent={metrics3.gp >= 0 ? '#1F7A43' : '#A32B22'} sub={`${metrics3.orders.toLocaleString()} orders`} />
          <StatTile label="GP Trend" value={formatPct(classification.gpChange, true)} sub={`vs prior ${periodLabel}`} subTone={classification.gpChange >= 0 ? '#1F7A43' : '#A32B22'} />
        </div>

        <div className={`sr-detail-split${insightCollapsed ? ' sr-detail-split--collapsed' : ''}`}>
          <ResizableDetailLayout
            sideCollapsed={insightCollapsed}
            onExpandSide={() => setInsightPanelCollapsed(false)}
            side={(
              <RepProfilePanel
                profile={profile}
                summary={insightSummary}
                onSelectRep={onRepChange}
                onCollapse={() => setInsightPanelCollapsed(true)}
              />
            )}
          >
            <div className="sr-detail-main-stack">
              <div className="sr-detail-charts-row">
                <Panel title="Gross Profit Trend" sub={`Monthly · last ${periodLabel}${teamMode === 'team' ? ' · team' : ''}`} pad bodyStyle={{ padding: '12px 8px 4px' }}>
                  <LineTrendChart labels={trendLabels} series={gpSeries} height={260} showEveryLabel />
                </Panel>
                {custTrend.length > 0 ? (
                  <Panel title="Revenue Performance" sub={`Top customers · monthly revenue · last ${periodLabel}`} pad bodyStyle={{ padding: '8px 4px 12px' }}>
                    <MultiLineChart labels={trendLabels} series={custTrend} height={260} legendRight />
                  </Panel>
                ) : (
                  <Panel title="Revenue Performance" sub="No customer revenue data for this period" pad bodyStyle={{ padding: '24px 16px' }}>
                    <p className="sr-panel-empty">No revenue trend data available.</p>
                  </Panel>
                )}
              </div>

              <Panel title="Performance: Gross Profit" sub="Month-over-month change" pad bodyStyle={{ padding: 0 }}>
                <div className="sr-table-wrap sr-table-wrap--panel" style={{ maxHeight: 280 }}>
                  <table className="sr-table sr-table--compact">
                    <thead>
                      <tr><th>Month</th><th className="num">Orders</th><th className="num">Revenue</th><th className="num">GP</th><th className="num">GP %</th><th className="num">Δ GP</th></tr>
                    </thead>
                    <tbody>
                      {monthly.map((m) => (
                        <tr key={m.month}>
                          <td>{monthLabel(m.month)}</td>
                          <td className="num mono">{m.orders}</td>
                          <td className="num mono">{formatCurrency(m.revenue)}</td>
                          <td className={`num mono ${m.gp >= 0 ? 'sr-gp-positive' : 'sr-gp-negative'}`}>{formatCurrency(m.gp)}</td>
                          <td className="num mono">{formatPct(m.gpPct)}</td>
                          <td className="num"><PctCell value={m.pctGp} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel title="Customer Gross Profit" sub={`${customers.length} customers · last ${periodLabel} · USD`} pad bodyStyle={{ padding: 0 }}>
                <div className="sr-table-wrap sr-table-wrap--panel">
                  <table className="sr-table sr-table--compact">
                    <thead>
                      <tr><th>Customer</th><th>Industry</th><th>Country</th><th className="num">Orders</th><th className="num">Revenue</th><th className="num">Cost</th><th className="num">Gross Profit</th><th className="num">GP %</th></tr>
                    </thead>
                    <tbody>
                      {customers.map((c) => (
                        <tr key={`${c.id}-${c.salesRepId}`}>
                          <td className="rep-name">{c.name}</td>
                          <td>{c.industry}</td>
                          <td>{c.country}</td>
                          <td className="num mono">{c.orders}</td>
                          <td className="num mono">{formatCurrency(c.revenue, false)}</td>
                          <td className="num mono">{formatCurrency(c.cost, false)}</td>
                          <td className={`num mono ${c.gp >= 0 ? 'sr-gp-positive' : 'sr-gp-negative'}`}>{formatCurrency(c.gp, false)}</td>
                          <td className="num mono">{formatPct(c.gpPct)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="sr-grand-total-row">
                        <td colSpan={3}>Grand Total</td>
                        <td className="num mono">{lastPeriod.orders}</td>
                        <td className="num mono">{formatCurrency(lastPeriod.revenue, false)}</td>
                        <td className="num mono">{formatCurrency(lastPeriod.cost, false)}</td>
                        <td className={`num mono ${lastPeriod.gp >= 0 ? 'sr-gp-positive' : 'sr-gp-negative'}`}>{formatCurrency(lastPeriod.gp, false)}</td>
                        <td className="num mono">{formatPct(lastPeriod.gpPct)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Panel>
            </div>
          </ResizableDetailLayout>
        </div>
      </div>
    </div>
  )
}
