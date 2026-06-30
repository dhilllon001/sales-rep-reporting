import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Panel, Pill, Select, Input } from '../components/primitives.jsx'
import {
  StatTile, LineTrendChart, BarList, MultiLineChart,
  formatCurrency, formatPct,
} from '../components/charts.jsx'
import ModuleBreakdown from '../components/dashboard/ModuleBreakdown.jsx'
import { useReportingScope } from '../context/ReportingScopeContext.jsx'
import { LAST_REFRESH, monthLabel, MONTHS, salesReps, COUNTRIES } from '../data/salesRepMock.js'
import {
  repSummaryRows, monthlyTrend, topBottomReps, topBottomCustomers, performanceCounts,
  buildDashboardDonuts, sliceMatchesRep, withGpPct, sumMetrics, topRepsTrendSeries,
  metricsForRep, periodMonths, channelSplit, tableRowsWithHierarchy,
} from '../data/selectors.js'

const TREND_MONTHS = MONTHS.slice(-12)
const LAST_3 = MONTHS.slice(-3)
const LAST_12 = MONTHS.slice(-12)

function TrendBadge({ change }) {
  if (change == null) return <span className="sr-trend-badge sr-trend-badge--flat">—</span>
  const cls = change >= 12 ? 'sr-trend-badge--up' : change <= -12 ? 'sr-trend-badge--down' : 'sr-trend-badge--flat'
  const arrow = change >= 12 ? '↑' : change <= -12 ? '↓' : '→'
  return <span className={`sr-trend-badge ${cls}`}>{arrow} {formatPct(change, true)}</span>
}

function RankToggle({ mode, onChange }) {
  return (
    <div className="sr-rank-toggle">
      <button type="button" className={mode === 'reps' ? 'is-active' : ''} onClick={() => onChange('reps')}>Reps</button>
      <button type="button" className={mode === 'customers' ? 'is-active' : ''} onClick={() => onChange('customers')}>Customers</button>
    </div>
  )
}

export default function SalesRepDashboard() {
  const navigate = useNavigate()
  const { filters, setFilters } = useReportingScope()
  const [selectedSlices, setSelectedSlices] = useState([])
  const [topRankMode, setTopRankMode] = useState('reps')
  const [bottomRankMode, setBottomRankMode] = useState('reps')

  const periodKey = filters.deliveryMonth || 'LAST_3'
  const periodLabel = periodKey === 'LAST_12' ? 'last 12 months' : 'last 3 months'

  const baseFilters = useMemo(() => ({
    country: filters.country,
    status: filters.status,
    salesRepId: filters.salesRepId,
    searchQuery: filters.searchQuery || '',
    viewAsId: filters.viewAsId || 'ALL',
    deliveryMonth: periodKey,
  }), [filters, periodKey])

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
    return tableRowsWithHierarchy(rows.sort((a, b) => b.recent.gp - a.recent.gp), filters.viewAsId)
  }, [baseFilters, filters.performanceFilter, filters.viewAsId, selectedSlices])

  const scopeRepIds = useMemo(() => tableRows.filter((r) => !r.isSubRow).map((r) => r.id), [tableRows])

  const trendData = useMemo(() => {
    const ids = scopeRepIds.length && (filters.viewAsId !== 'ALL' || filters.salesRepId !== 'ALL' || filters.country !== 'ALL')
      ? scopeRepIds
      : null
    return monthlyTrend(TREND_MONTHS, ids)
  }, [scopeRepIds, filters.viewAsId, filters.salesRepId, filters.country])

  const revenueTrend = useMemo(() => monthlyTrend(TREND_MONTHS, scopeRepIds.length ? scopeRepIds : null), [scopeRepIds])

  const totals = useMemo(() => withGpPct(sumMetrics(tableRows.filter((r) => !r.isSubRow).map((r) => r.recent))), [tableRows])
  const channelTotals = useMemo(() => channelSplit(scopeRepIds, periodMonths(periodKey)), [scopeRepIds, periodKey])

  const { top, bottom } = useMemo(() => topBottomReps(baseFilters, 5), [baseFilters])
  const { top: topCust, bottom: bottomCust } = useMemo(() => topBottomCustomers(baseFilters, 5), [baseFilters])

  const topTrendSeries = useMemo(
    () => topRepsTrendSeries(top.slice(0, 4).map((r) => r.id), LAST_3),
    [top],
  )

  const barRows = useMemo(() => (
    [...tableRows.filter((r) => !r.isSubRow)]
      .map((r) => ({ ...r, gp12: metricsForRep(r.id, LAST_12).gp }))
      .sort((a, b) => b.gp12 - a.gp12)
      .slice(0, 10)
  ), [tableRows])

  const toggleSlice = (modId, sliceId) => {
    const key = `${modId}:${sliceId}`
    setSelectedSlices((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])
  }

  const activeTags = [
    filters.viewAsId !== 'ALL' && { id: 'viewAs', label: `View as: ${salesReps.find((r) => r.id === filters.viewAsId)?.name}` },
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
    if (id === 'viewAs') setFilters({ viewAsId: 'ALL' })
    else if (id === 'country') setFilters({ country: 'ALL' })
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

  const onOpenRep = (id) => {
    setFilters({ viewAsId: id, salesRepId: id })
    navigate(`/reports/sales-rep/rep-detail?rep=${id}`)
  }

  const repOptions = [
    { value: 'ALL', label: 'All Sales Reps' },
    ...salesReps
      .filter((r) => filters.country === 'ALL' || r.country === filters.country)
      .map((r) => ({ value: r.id, label: r.name })),
  ]

  const viewAsOptions = [
    { value: 'ALL', label: 'Management (all)' },
    ...salesReps.map((r) => ({ value: r.id, label: r.name })),
  ]

  return (
    <div className="sr-page">
      <header className="sr-page__header">
        <div className="sr-page__header-main">
          <div className="sr-page__header-left">
            <h1 className="sr-page__title">Contract GP KPI Metrics (Currency in USD)</h1>
            <div className="sr-page__subtitle">Last Update Date: {LAST_REFRESH}</div>
          </div>
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
        <div className="sr-page__filters">
          <div className="sr-filter-field">
            <label>View as</label>
            <Select
              value={filters.viewAsId || 'ALL'}
              onChange={(e) => setFilters({ viewAsId: e.target.value, salesRepId: 'ALL' })}
              options={viewAsOptions}
            />
          </div>
          <div className="sr-filter-field sr-filter-field--wide">
            <label>Search</label>
            <Input
              icon="search"
              placeholder="Rep, customer…"
              value={filters.searchQuery || ''}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
            />
          </div>
          <div className="sr-filter-field">
            <label>Sales Rep</label>
            <Select value={filters.salesRepId} onChange={(e) => setFilters({ salesRepId: e.target.value })} options={repOptions} />
          </div>
          <div className="sr-filter-field">
            <label>Country</label>
            <Select
              value={filters.country}
              onChange={(e) => setFilters({ country: e.target.value, salesRepId: 'ALL' })}
              options={[{ value: 'ALL', label: 'All Countries' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
            />
          </div>
          <div className="sr-filter-field">
            <label>Status</label>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
              options={[{ value: 'ALL', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
            />
          </div>
          <div className="sr-filter-field">
            <label>Period</label>
            <Select
              value={periodKey}
              onChange={(e) => setFilters({ deliveryMonth: e.target.value })}
              options={[{ value: 'LAST_3', label: 'Last 3 Months' }, { value: 'LAST_12', label: 'Last 12 Months' }]}
            />
          </div>
          <div className="sr-filter-field">
            <label>Currency</label>
            <Select value="USD" onChange={() => {}} options={[{ value: 'USD', label: 'USD' }]} />
          </div>
        </div>
      </header>

      <div className="sr-page__body">
        <div className="sr-kpi-strip sr-kpi-strip--hero">
          <StatTile label="Total Orders" value={totals.orders.toLocaleString()} spark={trendData.slice(-6).map((t) => t.orders)} sparkColor="var(--action)" />
          <StatTile label="Portioned Revenue" value={formatCurrency(totals.revenue)} spark={revenueTrend.slice(-6).map((t) => t.revenue)} sparkColor="#5795E3" />
          <StatTile label="Gross Profit" value={formatCurrency(totals.gp)} accent={totals.gp >= 0 ? '#1F7A43' : '#A32B22'} spark={trendData.slice(-6).map((t) => t.gp)} sparkColor="var(--accent)" />
          <StatTile label="GP Margin" value={formatPct(totals.gpPct)} sub={`${tableRows.filter((r) => !r.isSubRow).length} reps · ${periodLabel}`} />
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
            <Button variant="ghost" size="sm" onClick={() => { setSelectedSlices([]); setFilters({ country: 'ALL', salesRepId: 'ALL', viewAsId: 'ALL', performanceFilter: null, searchQuery: '' }) }}>Clear all</Button>
          </div>
        )}

        <ModuleBreakdown
          modules={analytics.modules}
          selectedSliceIds={selectedSlices}
          onSelectSlice={onSliceClick}
        />

        <section className="sr-charts-row">
          <Panel title="Gross Profit Trend" sub={`Last 12 months · ${periodLabel}`} pad bodyStyle={{ padding: '12px 8px 4px' }}>
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

        <section className="sr-charts-row sr-charts-row--triple">
          <Panel
            title="Top Performers"
            sub={topRankMode === 'reps' ? `${periodLabel} GP` : `${periodLabel} customer GP`}
            aside={<RankToggle mode={topRankMode} onChange={setTopRankMode} />}
            pad
            bodyStyle={{ padding: '8px 12px' }}
          >
            {topRankMode === 'reps' ? (
              <table className="sr-table sr-rank-table sr-rank-table--lg">
                <thead><tr><th>Rep</th><th className="num">Orders</th><th className="num">Revenue</th><th className="num">GP</th><th className="num">Trend</th></tr></thead>
                <tbody>
                  {top.map((r) => (
                    <tr key={r.id} onClick={() => onOpenRep(r.id)}>
                      <td className="rep-name">{r.name}</td>
                      <td className="num mono">{r.recent.orders}</td>
                      <td className="num mono">{formatCurrency(r.recent.revenue)}</td>
                      <td className="num mono sr-gp-positive">{formatCurrency(r.recent.gp)}</td>
                      <td className="num"><TrendBadge change={r.gpChange} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="sr-table sr-rank-table sr-rank-table--lg">
                <thead><tr><th>Customer</th><th>Rep</th><th className="num">Orders</th><th className="num">Revenue</th><th className="num">GP</th></tr></thead>
                <tbody>
                  {topCust.map((c) => (
                    <tr key={c.id}>
                      <td className="rep-name">{c.name}</td>
                      <td>{c.salesRepName}</td>
                      <td className="num mono">{c.orders}</td>
                      <td className="num mono">{formatCurrency(c.revenue)}</td>
                      <td className="num mono sr-gp-positive">{formatCurrency(c.gp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel
            title="Bottom Performers"
            sub={bottomRankMode === 'reps' ? `${periodLabel} GP` : `${periodLabel} customer GP`}
            aside={<RankToggle mode={bottomRankMode} onChange={setBottomRankMode} />}
            pad
            bodyStyle={{ padding: '8px 12px' }}
          >
            {bottomRankMode === 'reps' ? (
              <table className="sr-table sr-rank-table sr-rank-table--lg">
                <thead><tr><th>Rep</th><th className="num">Orders</th><th className="num">Revenue</th><th className="num">GP</th><th className="num">Trend</th></tr></thead>
                <tbody>
                  {bottom.map((r) => (
                    <tr key={r.id} onClick={() => onOpenRep(r.id)}>
                      <td className="rep-name">{r.name}</td>
                      <td className="num mono">{r.recent.orders}</td>
                      <td className="num mono">{formatCurrency(r.recent.revenue)}</td>
                      <td className={`num mono ${r.recent.gp >= 0 ? 'sr-gp-positive' : 'sr-gp-negative'}`}>{formatCurrency(r.recent.gp)}</td>
                      <td className="num"><TrendBadge change={r.gpChange} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="sr-table sr-rank-table sr-rank-table--lg">
                <thead><tr><th>Customer</th><th>Rep</th><th className="num">Orders</th><th className="num">Revenue</th><th className="num">GP</th></tr></thead>
                <tbody>
                  {bottomCust.map((c) => (
                    <tr key={c.id}>
                      <td className="rep-name">{c.name}</td>
                      <td>{c.salesRepName}</td>
                      <td className="num mono">{c.orders}</td>
                      <td className="num mono">{formatCurrency(c.revenue)}</td>
                      <td className={`num mono ${c.gp >= 0 ? 'sr-gp-positive' : 'sr-gp-negative'}`}>{formatCurrency(c.gp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Top Rep GP Trend" sub="Last 3 months · top 4 performers" pad bodyStyle={{ padding: '8px 4px' }}>
            <MultiLineChart labels={LAST_3.map(monthLabel)} series={topTrendSeries} height={220} />
          </Panel>
        </section>

        <section className="sr-charts-row sr-charts-row--bar">
          <Panel title="Rep GP Distribution" sub="Top 10 reps · last 12 months gross profit" pad>
            <BarList
              rows={barRows.map((r, i) => ({
                key: r.id,
                label: `${i + 1}. ${r.name}`,
                value: Math.abs(r.gp12),
                color: r.gp12 < 0 ? '#E8564A' : '#5795E3',
              }))}
              onRow={onOpenRep}
              valueFmt={formatCurrency}
              height={32}
            />
          </Panel>

          <div className="sr-scope-summary">
            <div className="sr-scope-summary__badge">{tableRows.filter((r) => !r.isSubRow).length} reps in scope</div>
            <div className="sr-summary-cards">
              <div className="sr-summary-card">
                <div className="sr-summary-card__label">Avg GP / rep</div>
                <div className="sr-summary-card__value">{formatCurrency(tableRows.filter((r) => !r.isSubRow).length ? totals.gp / tableRows.filter((r) => !r.isSubRow).length : 0)}</div>
                <div className="sr-summary-card__sub">Asset {formatCurrency(channelTotals.asset.gp)} · Broker {formatCurrency(channelTotals.brokerage.gp)}</div>
              </div>
              <div className="sr-summary-card">
                <div className="sr-summary-card__label">Avg orders / rep</div>
                <div className="sr-summary-card__value">{tableRows.filter((r) => !r.isSubRow).length ? Math.round(totals.orders / tableRows.filter((r) => !r.isSubRow).length) : 0}</div>
              </div>
              <div className="sr-summary-card">
                <div className="sr-summary-card__label">Customers in scope</div>
                <div className="sr-summary-card__value">{tableRows.reduce((s, r) => s + r.customerCount, 0)}</div>
              </div>
              <div className="sr-summary-card">
                <div className="sr-summary-card__label">At loss</div>
                <div className="sr-summary-card__value sr-gp-negative">{counts.loss}</div>
              </div>
            </div>
          </div>
        </section>

        <Panel title="Sales Rep Performance" sub={`${tableRows.length} reps · click row for detail`} bodyStyle={{ padding: 0 }}>
          <div className="sr-table-wrap sr-table-wrap--full">
            <table className="sr-table sr-table--lg">
              <thead>
                <tr>
                  <th>Sales Rep</th>
                  <th>Team</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th className="num">Customers</th>
                  <th className="num">Orders</th>
                  <th className="num">Revenue</th>
                  <th className="num">Cost</th>
                  <th className="num">Gross Profit</th>
                  <th className="num">GP %</th>
                  <th className="num">Trend</th>
                  <th>Performance</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => (
                  <tr key={r.id} className={r.isSubRow ? 'sr-table__sub-row' : ''} onClick={() => onOpenRep(r.id)}>
                    <td className="rep-name">{r.isSubRow ? `↳ ${r.name}` : r.name}</td>
                    <td>{r.teamId}</td>
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
                  <td colSpan={5}>Grand Total ({tableRows.filter((r) => !r.isSubRow).length} reps)</td>
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
