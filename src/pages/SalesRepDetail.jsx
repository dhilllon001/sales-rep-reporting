import React, { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Panel, Pill, Select } from '../components/primitives.jsx'
import { StatTile, LineTrendChart, MultiLineChart, formatCurrency, formatPct } from '../components/charts.jsx'
import { useReportingScope } from '../context/ReportingScopeContext.jsx'
import { LAST_REFRESH, monthLabel, MONTHS, salesReps } from '../data/salesRepMock.js'
import {
  customersForRep, metricsForRep, repMonthlyBreakdown, classifyRep,
} from '../data/selectors.js'
import { LAST_3_MONTHS } from '../data/salesRepMock.js'

const CHART_COLORS = ['#3CC47A', '#5795E3', '#25B1A4', '#F5A72C', '#9F80F5', '#E8564A']

function PctCell({ value }) {
  if (value == null) return <span>—</span>
  const cls = value < 0 ? 'sr-pct-negative' : value > 0 ? 'sr-pct-positive' : ''
  return <span className={cls}>{formatPct(value, true)}</span>
}

export default function SalesRepDetail() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { filters, setFilters } = useReportingScope()

  const repId = searchParams.get('rep') || (filters.salesRepId !== 'ALL' ? filters.salesRepId : salesReps[0]?.id)
  const rep = salesReps.find((r) => r.id === repId)

  const repOptions = salesReps.map((r) => ({ value: r.id, label: `${r.name} (${r.country})` }))

  const onRepChange = (id) => {
    setSearchParams({ rep: id })
    setFilters({ salesRepId: id })
  }

  const last3 = useMemo(() => rep ? metricsForRep(rep.id, LAST_3_MONTHS) : null, [rep])
  const allTime = useMemo(() => rep ? metricsForRep(rep.id) : null, [rep])
  const customers = useMemo(() => rep ? customersForRep(rep.id) : [], [rep])
  const monthly = useMemo(() => rep ? repMonthlyBreakdown(rep.id).slice(-12) : [], [rep])
  const classification = useMemo(() => rep ? classifyRep(rep.id) : null, [rep])

  const trendLabels = monthly.map((m) => monthLabel(m.month))
  const gpSeries = [{ name: 'Gross Profit', data: monthly.map((m) => m.gp), color: '#3CC47A', showLabels: true }]

  const topCustTrend = useMemo(() => {
    if (!rep) return []
    const top = customers.slice(0, 4)
    const months = MONTHS.slice(-8)
    return top.map((c, i) => {
      const data = months.map(() => 0)
      return { name: c.name.slice(0, 18), color: CHART_COLORS[i], data }
    })
  }, [rep, customers])

  if (!rep) {
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
    <div className="sr-page">
      <header className="sr-page__header">
        <div className="sr-detail-header">
          <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => navigate('/reports/sales-rep/dashboard')}>Dashboard</Button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="sr-page__title">{rep.name}</h1>
            <div className="sr-page__subtitle">
              {rep.email} · {rep.country} · Last refreshed {LAST_REFRESH}
            </div>
          </div>
          <Pill status={classification.performance === 'trending' ? 'enroute' : classification.performance === 'loss' ? 'exception' : 'cleared'}>
            {classification.performance}
          </Pill>
        </div>
        <div className="sr-page__filters">
          <div className="sr-filter-field sr-filter-field--wide">
            <label>Sales Rep</label>
            <Select value={rep.id} onChange={(e) => onRepChange(e.target.value)} options={repOptions} style={{ minWidth: 260 }} />
          </div>
          <div className="sr-filter-field">
            <label>Country</label>
            <Select value={rep.country} onChange={() => {}} options={[{ value: rep.country, label: rep.country }]} style={{ minWidth: 120 }} />
          </div>
          <div className="sr-filter-field">
            <label>Period</label>
            <Select value="LAST_3" onChange={() => {}} options={[{ value: 'LAST_3', label: 'Last 3 Months' }]} style={{ minWidth: 140 }} />
          </div>
        </div>
      </header>

      <div className="sr-page__body">
        <div className="sr-kpi-strip">
          <StatTile label="Customers" value={customers.length} sub="Active accounts under rep" />
          <StatTile label="Orders (3mo)" value={last3.orders.toLocaleString()} />
          <StatTile label="Revenue (3mo)" value={formatCurrency(last3.revenue)} />
          <StatTile label="Gross Profit (3mo)" value={formatCurrency(last3.gp)} accent={last3.gp >= 0 ? '#1F7A43' : '#A32B22'} sub={`${formatPct(last3.gpPct)} margin`} />
          <StatTile label="GP Trend" value={formatPct(classification.gpChange, true)} sub="vs prior 3 months" subTone={classification.gpChange >= 0 ? '#1F7A43' : '#A32B22'} />
          <StatTile label="All-time GP" value={formatCurrency(allTime.gp)} sub={`${allTime.orders.toLocaleString()} lifetime orders`} />
        </div>

        <div className="sr-detail-grid">
          <Panel title="Gross Profit Trend" sub="Monthly · last 12 months" pad>
            <LineTrendChart labels={trendLabels} series={gpSeries} height={220} />
          </Panel>
          <Panel title="Performance: Gross Profit" sub="Month-over-month change" pad bodyStyle={{ padding: 0 }}>
            <div className="sr-table-wrap" style={{ maxHeight: 220, border: 'none' }}>
              <table className="sr-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="num">Orders</th>
                    <th className="num">Revenue</th>
                    <th className="num">GP</th>
                    <th className="num">GP %</th>
                    <th className="num">Δ GP</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.slice(-6).map((m) => (
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
        </div>

        <Panel title="Customer Gross Profit" sub={`${customers.length} customers · last 3 months · USD`} pad bodyStyle={{ padding: 0 }} style={{ marginBottom: 16 }}>
          <div className="sr-table-wrap" style={{ maxHeight: 360, border: 'none', borderRadius: 0 }}>
            <table className="sr-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Industry</th>
                  <th>Country</th>
                  <th className="num">Orders</th>
                  <th className="num">Revenue</th>
                  <th className="num">Cost</th>
                  <th className="num">Gross Profit</th>
                  <th className="num">GP %</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="rep-name">{c.name}</td>
                    <td>{c.industry}</td>
                    <td>{c.country}</td>
                    <td className="num mono">{c.orders}</td>
                    <td className="num mono">{formatCurrency(c.revenue, false)}</td>
                    <td className="num mono">{formatCurrency(c.cost, false)}</td>
                    <td className={`num mono ${c.gp >= 0 ? 'sr-gp-positive' : 'sr-gp-negative'}`}>{formatCurrency(c.gp, false)}</td>
                    <td className={`num mono ${c.gpPct < 10 ? 'sr-pct-negative' : 'sr-gp-positive'}`}>{formatPct(c.gpPct)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Grand Total</td>
                  <td className="num mono">{last3.orders}</td>
                  <td className="num mono">{formatCurrency(last3.revenue, false)}</td>
                  <td className="num mono">{formatCurrency(last3.cost, false)}</td>
                  <td className={`num mono ${last3.gp >= 0 ? 'sr-gp-positive' : 'sr-gp-negative'}`}>{formatCurrency(last3.gp, false)}</td>
                  <td className="num mono">{formatPct(last3.gpPct)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>

        {topCustTrend.length > 0 && (
          <Panel title="Revenue Performance" sub="Monthly order revenue trend" pad>
            <MultiLineChart
              labels={MONTHS.slice(-8).map(monthLabel)}
              series={topCustTrend}
              height={200}
            />
          </Panel>
        )}
      </div>
    </div>
  )
}
