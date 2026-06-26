import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Panel, Pill, Select, Input } from '../components/primitives.jsx'
import {
  StatTile, LineTrendChart, BarList, DonutKpiChart, MultiLineChart,
  formatCurrency, formatPct,
} from '../components/charts.jsx'
import { useReportingScope } from '../context/ReportingScopeContext.jsx'
import { LAST_REFRESH, monthLabel, MONTHS, salesReps } from '../data/salesRepMock.js'
import {
  repSummaryRows, monthlyTrend, topBottomReps, performanceCounts,
  buildDashboardDonuts, sliceMatchesRep, withGpPct, sumMetrics, topRepsTrendSeries,
} from '../data/selectors.js'

const TREND_MONTHS = MONTHS.slice(-12)
const LAST_3 = MONTHS.slice(-3)

function TrendBadge({ change }) {
  if (change == null) return <span className="sr-trend-badge sr-trend-badge--flat">—</span>
  const cls = change >= 12 ? 'sr-trend-badge--up' : change <= -12 ? 'sr-trend-badge--down' : 'sr-trend-badge--flat'
  const arrow = change >= 12 ? '↑' : change <= -12 ? '↓' : '→'
  return <span className={`sr-trend-badge ${cls}`}>{arrow} {formatPct(change, true)}</span>
}

function formatCenter(value, fmt) {
  if (fmt === 'currency') return formatCurrency(value)
  if (fmt === 'count') return value.toLocaleString()
  return value.toLocaleString()
}

function DonutPanel({ mod, selectedSliceIds, onSelectSlice, valueFmt }) {
  const total = mod.slices.reduce((s, x) => s + Math.max(0, x.value), 0) || 1
  const active = mod.slices.some((s) => selectedSliceIds.includes(`${mod.id}:${s.id}`))
  const visibleSlices = mod.slices.filter((s) => s.value > 0)

  return (
    <div className={`sr-donut-panel sr-donut-panel--compact${active ? ' is-active' : ''}`} style={{ '--panel-accent': mod.accent }}>
      <div className="sr-donut-panel__title">{mod.shortTitle || mod.label}</div>
      <DonutKpiChart
        slices={mod.slices}
        size={68}
        centerValue={formatCenter(mod.center, mod.centerFmt)}
        centerLabel={mod.centerLabel || 'Total'}
        valueFmt={valueFmt}
        selectedSliceIds={selectedSliceIds.filter((id) => id.startsWith(`${mod.id}:`)).map((id) => id.split(':')[1])}
        onSelectSlice={(sliceId) => onSelectSlice(mod.id, sliceId)}
      />
      <ul className="sr-donut-legend sr-donut-legend--compact">
        {visibleSlices.map((s) => {
          const key = `${mod.id}:${s.id}`
          const selected = selectedSliceIds.includes(key)
          const pct = total > 0 ? ((Math.max(0, s.value) / total) * 100).toFixed(0) : '0'
          return (
            <li key={s.id}>
              <button
                type="button"
                className={`sr-donut-legend__item${selected ? ' is-active' : ''}`}
                onClick={() => onSelectSlice(mod.id, s.id)}
                title={s.label}
              >
                <span className="sr-donut-legend__dot" style={{ background: s.color }} />
                <span className="sr-donut-legend__label">{s.short}</span>
                <span className="sr-donut-legend__pct">{pct}%</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function SalesRepDashboard() {
  const navigate = useNavigate()
  const { filters, setFilters } = useReportingScope()
  const [selectedSlices, setSelectedSlices] = useState([])

  const baseFilters = useMemo(() => ({
    country: filters.country,
    status: filters.status,
    salesRepId: filters.salesRepId,
    searchQuery: filters.searchQuery || '',
  }), [filters])

  const analytics = useMemo(() => buildDashboardDonuts(baseFilters), [baseFilters])
  const counts = useMemo(() => performanceCounts(baseFilters), [baseFilters])

  const tableRows = useMemo(() => {
    let rows = repSummaryRows({ ...baseFilters, performanceFilter: filters.performanceFilter })
    if (selectedSlices.length) {
      rows = rows.filter((rep) => selectedSlices.some((key) => {
        const [modId, sliceId] = key.split(':')
        return sliceMatchesRep(rep, sliceId, modId)
      }))
    }
    return rows.sort((a, b) => b.recent.gp - a.recent.gp)
  }, [baseFilters, filters.performanceFilter, selectedSlices])

  const trendData = useMemo(() => {
    const ids = filters.salesRepId !== 'ALL'
      ? [filters.salesRepId]
      : (filters.country !== 'ALL' ? repSummaryRows(baseFilters).map((r) => r.id) : null)
    return monthlyTrend(TREND_MONTHS, ids)
  }, [baseFilters, filters.salesRepId, filters.country])

  const revenueTrend = useMemo(() => monthlyTrend(TREND_MONTHS, filters.salesRepId !== 'ALL' ? [filters.salesRepId] : null), [filters.salesRepId])

  const totals = useMemo(() => withGpPct(sumMetrics(tableRows.map((r) => r.recent))), [tableRows])
  const { top, bottom } = useMemo(() => topBottomReps(baseFilters, 5), [baseFilters])

  const topTrendSeries = useMemo(
    () => topRepsTrendSeries(top.slice(0, 4).map((r) => r.id), LAST_3),
    [top],
  )

  const toggleSlice = (modId, sliceId) => {
    const key = `${modId}:${sliceId}`
    setSelectedSlices((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])
  }

  const activeTags = [
    filters.salesRepId !== 'ALL' && { id: 'rep', label: `Rep: ${salesReps.find((r) => r.id === filters.salesRepId)?.name}` },
    filters.performanceFilter && { id: 'perf', label: `Performance: ${filters.performanceFilter}` },
    filters.country !== 'ALL' && { id: 'country', label: `Country: ${filters.country}` },
    filters.searchQuery && { id: 'search', label: `Search: "${filters.searchQuery}"` },
    ...selectedSlices
      .filter((key) => {
        const [modId] = key.split(':')
        return !(modId === 'country' && filters.country !== 'ALL')
      })
      .map((key) => {
      const [modId, sliceId] = key.split(':')
      const mod = analytics.modules.find((m) => m.id === modId)
      const slice = mod?.slices.find((s) => s.id === sliceId)
      return { id: key, label: `${mod?.shortTitle || mod?.label}: ${slice?.short || slice?.label}` }
    }),
  ].filter(Boolean)

  const clearTag = (id) => {
    if (id === 'country') setFilters({ country: 'ALL' })
    else if (id === 'rep') setFilters({ salesRepId: 'ALL' })
    else if (id === 'perf') setFilters({ performanceFilter: null })
    else if (id === 'search') setFilters({ searchQuery: '' })
    else setSelectedSlices((prev) => prev.filter((k) => k !== id))
  }

  const onSliceClick = (modId, sliceId) => {
    if (modId === 'country') {
      const next = filters.country === sliceId ? 'ALL' : sliceId
      setFilters({ country: next, salesRepId: 'ALL' })
      setSelectedSlices((prev) => {
        const rest = prev.filter((k) => !k.startsWith('country:'))
        return next === 'ALL' ? rest : [...rest, `country:${sliceId}`]
      })
      return
    }
    toggleSlice(modId, sliceId)
  }

  const repOptions = [
    { value: 'ALL', label: 'All Sales Reps' },
    ...salesReps
      .filter((r) => filters.country === 'ALL' || r.country === filters.country)
      .map((r) => ({ value: r.id, label: r.name })),
  ]

  const currencyFmt = (v) => formatCurrency(v)
  const isCurrencyModule = (id) => ['performance', 'country', 'trend', 'margin', 'status'].includes(id)

  return (
    <div className="sr-page">
      <header className="sr-page__header">
        <div className="sr-page__header-main">
          <div className="sr-page__header-left">
            <h1 className="sr-page__title">Sales Rep Contract GP KPI Metrics</h1>
            <div className="sr-page__subtitle">Currency in USD · Last refreshed {LAST_REFRESH}</div>
          </div>
          <div className="sr-page__header-right">
            <div className="sr-header-search">
              <Input
                icon="search"
                placeholder="Search rep, customer, country…"
                value={filters.searchQuery || ''}
                onChange={(e) => setFilters({ searchQuery: e.target.value })}
                style={{ width: 220 }}
              />
            </div>
            <Select
              value={filters.salesRepId}
              onChange={(e) => setFilters({ salesRepId: e.target.value })}
              options={repOptions}
              style={{ minWidth: 148 }}
              aria-label="Sales rep"
            />
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
              options={[{ value: 'ALL', label: 'All status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
              style={{ minWidth: 108 }}
              aria-label="Status"
            />
            <Select
              value="LAST_3"
              onChange={() => {}}
              options={[{ value: 'LAST_3', label: 'Last 3 mo' }, { value: 'LAST_12', label: 'Last 12 mo' }]}
              style={{ minWidth: 108 }}
              aria-label="Period"
            />
            <div className="sr-kpi-pills">
              {[
                { key: null, label: 'Active', count: counts.active, color: '#3CC47A' },
                { key: 'trending', label: 'Trending', count: counts.trending, color: '#25B1A4' },
                { key: 'profit', label: 'Profit', count: counts.profit, color: '#5795E3' },
                { key: 'loss', label: 'Loss', count: counts.loss, color: '#E8564A' },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={`sr-kpi-pill${filters.performanceFilter === p.key ? ' is-active' : ''}`}
                  onClick={() => setFilters({ performanceFilter: filters.performanceFilter === p.key ? null : p.key })}
                >
                  <span className="sr-kpi-pill__dot" style={{ background: p.color }} />
                  {p.label}
                  <span className="sr-kpi-pill__count">{p.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="sr-page__body">
        {/* KPI summary row */}
        <div className="sr-kpi-strip sr-kpi-strip--hero">
          <StatTile label="Total Orders" value={totals.orders.toLocaleString()} spark={trendData.slice(-6).map((t) => t.orders)} sparkColor="var(--action)" />
          <StatTile label="Portioned Revenue" value={formatCurrency(totals.revenue)} spark={revenueTrend.slice(-6).map((t) => t.revenue)} sparkColor="#5795E3" />
          <StatTile label="Gross Profit" value={formatCurrency(totals.gp)} accent={totals.gp >= 0 ? '#1F7A43' : '#A32B22'} spark={trendData.slice(-6).map((t) => t.gp)} sparkColor="var(--accent)" />
          <StatTile label="GP Margin" value={formatPct(totals.gpPct)} sub={`${tableRows.length} reps · last 3 months`} />
          <StatTile label="Trending Reps" value={counts.trending} accent="#25B1A4" sub="GP up ≥12% vs prior quarter" onClick={() => setFilters({ performanceFilter: filters.performanceFilter === 'trending' ? null : 'trending' })} active={filters.performanceFilter === 'trending'} />
        </div>

        {activeTags.length > 0 && (
          <div className="sr-active-filters">
            <span className="t-eyebrow">Filtered</span>
            {activeTags.map((t) => (
              <span key={t.id} className="sr-filter-tag">
                {t.label}
                <button type="button" onClick={() => clearTag(t.id)} aria-label={`Remove ${t.label}`}>×</button>
              </span>
            ))}
            <Button variant="ghost" size="sm" onClick={() => { setSelectedSlices([]); setFilters({ country: 'ALL', salesRepId: 'ALL', performanceFilter: null, searchQuery: '' }) }}>Clear all</Button>
          </div>
        )}

        {/* 6 compact donut cards — single row */}
        <section className="sr-donut-strip">
          {analytics.modules.map((mod) => (
            <DonutPanel
              key={mod.id}
              mod={mod}
              selectedSliceIds={selectedSlices}
              onSelectSlice={onSliceClick}
              valueFmt={isCurrencyModule(mod.id) ? currencyFmt : (v) => v.toLocaleString()}
            />
          ))}
        </section>

        {/* Charts row — side by side */}
        <section className="sr-charts-row">
          <Panel title="Gross Profit Trend" sub="Last 12 months · filtered scope" pad bodyStyle={{ padding: '12px 8px 4px' }}>
            <LineTrendChart
              labels={trendData.map((t) => monthLabel(t.month))}
              series={[{ name: 'Gross Profit', data: trendData.map((t) => t.gp), color: '#3CC47A', showLabels: true, fill: true }]}
              height={280}
              showEveryLabel
            />
          </Panel>

          <Panel title="Revenue Trend" sub="Portioned revenue · last 12 months" pad bodyStyle={{ padding: '12px 8px 4px' }}>
            <LineTrendChart
              labels={revenueTrend.map((t) => monthLabel(t.month))}
              series={[{ name: 'Revenue', data: revenueTrend.map((t) => t.revenue), color: '#5795E3', showLabels: true, fill: true }]}
              height={280}
              showEveryLabel
            />
          </Panel>
        </section>

        {/* Rankings + trending lines — side by side */}
        <section className="sr-charts-row sr-charts-row--triple">
          <Panel title="Top Performers" sub="Last 3 months GP" pad bodyStyle={{ padding: '8px 12px' }}>
            <table className="sr-table sr-rank-table sr-rank-table--lg">
              <thead><tr><th>Rep</th><th className="num">Orders</th><th className="num">Revenue</th><th className="num">GP</th><th className="num">Trend</th></tr></thead>
              <tbody>
                {top.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/reports/sales-rep/rep-detail?rep=${r.id}`)}>
                    <td className="rep-name">{r.name}</td>
                    <td className="num mono">{r.recent.orders}</td>
                    <td className="num mono">{formatCurrency(r.recent.revenue)}</td>
                    <td className="num mono sr-gp-positive">{formatCurrency(r.recent.gp)}</td>
                    <td className="num"><TrendBadge change={r.gpChange} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Bottom Performers" sub="Last 3 months GP" pad bodyStyle={{ padding: '8px 12px' }}>
            <table className="sr-table sr-rank-table sr-rank-table--lg">
              <thead><tr><th>Rep</th><th className="num">Orders</th><th className="num">Revenue</th><th className="num">GP</th><th className="num">Trend</th></tr></thead>
              <tbody>
                {bottom.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/reports/sales-rep/rep-detail?rep=${r.id}`)}>
                    <td className="rep-name">{r.name}</td>
                    <td className="num mono">{r.recent.orders}</td>
                    <td className="num mono">{formatCurrency(r.recent.revenue)}</td>
                    <td className={`num mono ${r.recent.gp >= 0 ? 'sr-gp-positive' : 'sr-gp-negative'}`}>{formatCurrency(r.recent.gp)}</td>
                    <td className="num"><TrendBadge change={r.gpChange} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Top Rep GP Trend" sub="Last 3 months · top 4 performers" pad bodyStyle={{ padding: '8px 4px' }}>
            <MultiLineChart
              labels={LAST_3.map(monthLabel)}
              series={topTrendSeries}
              height={220}
            />
          </Panel>
        </section>

        {/* Distribution bar + summary stats */}
        <section className="sr-charts-row sr-charts-row--bar">
          <Panel title="Rep GP Distribution" sub="Ranked by last 3 months gross profit" pad>
            <BarList
              rows={tableRows.slice(0, 10).map((r) => ({
                key: r.id,
                label: r.name,
                value: Math.abs(r.recent.gp),
                color: r.recent.gp < 0 ? '#E8564A' : '#5795E3',
              }))}
              onRow={(id) => navigate(`/reports/sales-rep/rep-detail?rep=${id}`)}
              valueFmt={formatCurrency}
              height={32}
            />
          </Panel>

          <div className="sr-summary-cards">
            <div className="sr-summary-card">
              <div className="sr-summary-card__label">Avg GP / Rep</div>
              <div className="sr-summary-card__value">{formatCurrency(tableRows.length ? totals.gp / tableRows.length : 0)}</div>
            </div>
            <div className="sr-summary-card">
              <div className="sr-summary-card__label">Avg Orders / Rep</div>
              <div className="sr-summary-card__value">{tableRows.length ? Math.round(totals.orders / tableRows.length) : 0}</div>
            </div>
            <div className="sr-summary-card">
              <div className="sr-summary-card__label">Customers in Scope</div>
              <div className="sr-summary-card__value">{tableRows.reduce((s, r) => s + r.customerCount, 0)}</div>
            </div>
            <div className="sr-summary-card">
              <div className="sr-summary-card__label">At Loss</div>
              <div className="sr-summary-card__value sr-gp-negative">{counts.loss}</div>
            </div>
          </div>
        </section>

        {/* Full data table */}
        <Panel title="Sales Rep Performance" sub={`${tableRows.length} reps · click row for detail`} bodyStyle={{ padding: 0 }}>
          <div className="sr-table-wrap sr-table-wrap--full">
            <table className="sr-table sr-table--lg">
              <thead>
                <tr>
                  <th>Sales Rep</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th className="num">Customers</th>
                  <th className="num">Orders</th>
                  <th className="num">Revenue</th>
                  <th className="num">Cost</th>
                  <th className="num">Gross Profit</th>
                  <th className="num">GP %</th>
                  <th className="num">3mo Trend</th>
                  <th>Performance</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/reports/sales-rep/rep-detail?rep=${r.id}`)}>
                    <td className="rep-name">{r.name}</td>
                    <td>{r.country}</td>
                    <td><Pill status={r.status === 'active' ? 'cleared' : 'exception'}>{r.status}</Pill></td>
                    <td className="num mono">{r.customerCount}</td>
                    <td className="num mono">{r.recent.orders}</td>
                    <td className="num mono">{formatCurrency(r.recent.revenue)}</td>
                    <td className="num mono">{formatCurrency(r.recent.cost)}</td>
                    <td className={`num mono ${r.recent.gp >= 0 ? 'sr-gp-positive' : 'sr-gp-negative'}`}>{formatCurrency(r.recent.gp)}</td>
                    <td className="num mono">{formatPct(r.recent.gpPct)}</td>
                    <td className="num"><TrendBadge change={r.gpChange} /></td>
                    <td>
                      <Pill status={r.performance === 'trending' ? 'enroute' : r.performance === 'loss' ? 'exception' : r.performance === 'profit' ? 'cleared' : 'dispatched'}>
                        {r.performance}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>Grand Total ({tableRows.length} reps)</td>
                  <td className="num mono">{totals.orders}</td>
                  <td className="num mono">{formatCurrency(totals.revenue)}</td>
                  <td className="num mono">{formatCurrency(totals.cost)}</td>
                  <td className={`num mono ${totals.gp >= 0 ? 'sr-gp-positive' : 'sr-gp-negative'}`}>{formatCurrency(totals.gp)}</td>
                  <td className="num mono">{formatPct(totals.gpPct)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  )
}
