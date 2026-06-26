import { LAST_3_MONTHS, PRIOR_3_MONTHS, monthlyMetricsList, salesReps, customersList, customerMonthlyList } from './salesRepMock.js'

function matchesSearch(rep, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (rep.name.toLowerCase().includes(q)) return true
  if (rep.email?.toLowerCase().includes(q)) return true
  if (rep.country.toLowerCase().includes(q)) return true
  if (rep.id.toLowerCase().includes(q)) return true
  if (rep.performance?.toLowerCase().includes(q)) return true
  return customersList
    .filter((c) => c.salesRepId === rep.id)
    .some((c) => c.name.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q))
}

export function sumMetrics(rows) {
  return rows.reduce((acc, r) => ({
    orders: acc.orders + r.orders,
    revenue: acc.revenue + r.revenue,
    cost: acc.cost + r.cost,
    gp: acc.gp + r.gp,
  }), { orders: 0, revenue: 0, cost: 0, gp: 0 })
}

export function withGpPct(totals) {
  return { ...totals, gpPct: totals.revenue > 0 ? (totals.gp / totals.revenue) * 100 : 0 }
}

export function metricsForRep(repId, months = null) {
  let rows = monthlyMetricsList.filter((m) => m.salesRepId === repId)
  if (months) rows = rows.filter((m) => months.includes(m.month))
  return withGpPct(sumMetrics(rows))
}

export function classifyRep(repId) {
  const recent = metricsForRep(repId, LAST_3_MONTHS)
  const prior = metricsForRep(repId, PRIOR_3_MONTHS)
  const gpChange = prior.gp !== 0 ? ((recent.gp - prior.gp) / Math.abs(prior.gp)) * 100 : recent.gp > 0 ? 100 : 0
  let performance = 'flat'
  if (recent.gp < 0) performance = 'loss'
  else if (gpChange >= 12) performance = 'trending'
  else if (recent.gp > 0) performance = 'profit'
  return { recent, prior, gpChange, performance }
}

export function repSummaryRows(filters = {}) {
  const { country = 'ALL', status = 'ALL', performanceFilter = null, salesRepId = 'ALL', searchQuery = '' } = filters
  return salesReps
    .filter((r) => country === 'ALL' || r.country === country)
    .filter((r) => status === 'ALL' || r.status === status)
    .filter((r) => salesRepId === 'ALL' || r.id === salesRepId)
    .map((rep) => {
      const { recent, prior, gpChange, performance } = classifyRep(rep.id)
      return {
        ...rep,
        customerCount: customersList.filter((c) => c.salesRepId === rep.id).length,
        recent, prior, gpChange, performance,
        allTime: metricsForRep(rep.id),
      }
    })
    .filter((r) => !performanceFilter || r.performance === performanceFilter)
    .filter((r) => matchesSearch(r, searchQuery))
}

export function monthlyTrend(months, repIds = null) {
  let rows = monthlyMetricsList
  if (repIds) rows = rows.filter((m) => repIds.includes(m.salesRepId))
  return months.map((month) => {
    const monthRows = rows.filter((m) => m.month === month)
    return { month, ...withGpPct(sumMetrics(monthRows)) }
  })
}

export function topBottomReps(filters, n = 5) {
  const rows = repSummaryRows(filters)
  const sorted = [...rows].sort((a, b) => b.recent.gp - a.recent.gp)
  return { top: sorted.slice(0, n), bottom: sorted.slice(-n).reverse() }
}

export function customersForRep(repId, months = LAST_3_MONTHS) {
  return customersList
    .filter((c) => c.salesRepId === repId)
    .map((cust) => {
      const rows = customerMonthlyList.filter((m) => m.customerId === cust.id && months.includes(m.month))
      return { ...cust, ...withGpPct(sumMetrics(rows)) }
    })
    .sort((a, b) => b.gp - a.gp)
}

export function repMonthlyBreakdown(repId) {
  const months = MONTHS_FOR_REP(repId)
  return months.map((month, i) => {
    const row = monthlyMetricsList.find((m) => m.salesRepId === repId && m.month === month)
    const prev = i > 0 ? monthlyMetricsList.find((m) => m.salesRepId === repId && m.month === months[i - 1]) : null
    return {
      ...row,
      pctOrders: prev?.orders ? ((row.orders - prev.orders) / prev.orders) * 100 : null,
      pctRev: prev?.revenue ? ((row.revenue - prev.revenue) / prev.revenue) * 100 : null,
      pctGp: prev?.gp ? ((row.gp - prev.gp) / Math.abs(prev.gp)) * 100 : null,
    }
  })
}

function MONTHS_FOR_REP(repId) {
  return [...new Set(monthlyMetricsList.filter((m) => m.salesRepId === repId).map((m) => m.month))].sort()
}

export function performanceCounts(filters) {
  const rows = repSummaryRows({ ...filters, performanceFilter: null })
  return {
    active: rows.filter((r) => r.status === 'active').length,
    trending: rows.filter((r) => r.performance === 'trending').length,
    profit: rows.filter((r) => r.performance === 'profit').length,
    loss: rows.filter((r) => r.performance === 'loss').length,
    inactive: rows.filter((r) => r.status === 'inactive').length,
  }
}

export function buildModuleCharts(filters) {
  const rows = repSummaryRows({ ...filters, performanceFilter: null })
  const perf = { trending: 0, profit: 0, loss: 0, flat: 0 }
  const status = { active: 0, inactive: 0 }
  const country = { US: 0, Canada: 0, Mexico: 0 }
  for (const r of rows) {
    perf[r.performance] = (perf[r.performance] || 0) + 1
    status[r.status] = (status[r.status] || 0) + 1
    country[r.country] = (country[r.country] || 0) + 1
  }
  return [
    {
      id: 'performance', label: 'Performance', accent: '#25B1A4', pending: rows.length,
      slices: [
        { id: 'trending', label: 'Trending', short: 'Trend', value: perf.trending, color: '#3CC47A' },
        { id: 'profit', label: 'Profitable', short: 'Profit', value: perf.profit, color: '#5795E3' },
        { id: 'loss', label: 'Loss', short: 'Loss', value: perf.loss, color: '#E8564A' },
        { id: 'flat', label: 'Flat', short: 'Flat', value: perf.flat, color: '#A4ADBA' },
      ],
    },
    {
      id: 'country', label: 'Country', accent: '#5795E3', pending: rows.length,
      slices: [
        { id: 'US', label: 'United States', short: 'US', value: country.US, color: '#5795E3' },
        { id: 'Canada', label: 'Canada', short: 'CA', value: country.Canada, color: '#25B1A4' },
        { id: 'Mexico', label: 'Mexico', short: 'MX', value: country.Mexico, color: '#F5A72C' },
      ],
    },
    {
      id: 'status', label: 'Rep Status', accent: '#9F80F5', pending: rows.length,
      slices: [
        { id: 'active', label: 'Active', short: 'Active', value: status.active, color: '#3CC47A' },
        { id: 'inactive', label: 'Inactive', short: 'Inactive', value: status.inactive, color: '#A4ADBA' },
      ],
    },
  ]
}

export function sliceMatchesRep(rep, sliceId, moduleId) {
  if (moduleId === 'performance') return rep.performance === sliceId
  if (moduleId === 'country') return rep.country === sliceId
  if (moduleId === 'status') return rep.status === sliceId
  if (moduleId === 'trend') return trendBucket(rep.gpChange) === sliceId
  if (moduleId === 'margin') return marginBand(rep.recent.gpPct) === sliceId
  if (moduleId === 'orders') return rep.country === sliceId
  return false
}

function trendBucket(gpChange) {
  if (gpChange >= 25) return 'surge'
  if (gpChange >= 12) return 'rising'
  if (gpChange > -12) return 'stable'
  if (gpChange > -25) return 'slipping'
  return 'declining'
}

function marginBand(gpPct) {
  if (gpPct < 0) return 'negative'
  if (gpPct < 10) return 'low'
  if (gpPct < 20) return 'mid'
  return 'high'
}

/** Dollar-weighted donut modules for executive dashboard */
export function buildDashboardDonuts(filters) {
  const rows = repSummaryRows({ ...filters, performanceFilter: null })

  const perfGp = { trending: 0, profit: 0, loss: 0, flat: 0 }
  const countryGp = { US: 0, Canada: 0, Mexico: 0 }
  const countryRev = { US: 0, Canada: 0, Mexico: 0 }
  const trendGp = { surge: 0, rising: 0, stable: 0, slipping: 0, declining: 0 }
  const marginGp = { high: 0, mid: 0, low: 0, negative: 0 }
  const statusGp = { active: 0, inactive: 0 }

  for (const r of rows) {
    const gp = r.recent.gp
    if (r.performance === 'loss') perfGp.loss += Math.abs(gp)
    else perfGp[r.performance] = (perfGp[r.performance] || 0) + gp

    countryGp[r.country] = (countryGp[r.country] || 0) + gp
    countryRev[r.country] = (countryRev[r.country] || 0) + r.recent.revenue
    trendGp[trendBucket(r.gpChange)] = (trendGp[trendBucket(r.gpChange)] || 0) + Math.max(gp, 0)
    if (gp < 0) marginGp.negative += Math.abs(gp)
    else marginGp[marginBand(r.recent.gpPct)] = (marginGp[marginBand(r.recent.gpPct)] || 0) + gp
    statusGp[r.status] = (statusGp[r.status] || 0) + Math.max(gp, 0)
  }

  const totalGp = rows.reduce((s, r) => s + r.recent.gp, 0)
  const totalRev = rows.reduce((s, r) => s + r.recent.revenue, 0)
  const totalOrders = rows.reduce((s, r) => s + r.recent.orders, 0)

  return {
    totalGp, totalRev, totalOrders, repCount: rows.length,
    modules: [
      {
        id: 'performance', label: 'GP by Performance', shortTitle: 'Performance', sub: 'Last 3 months gross profit', accent: '#25B1A4',
        center: totalGp, centerFmt: 'currency',
        slices: [
          { id: 'trending', label: 'Trending', short: 'Trending', value: perfGp.trending, color: '#3CC47A' },
          { id: 'profit', label: 'Profitable', short: 'Profit', value: Math.max(0, perfGp.profit), color: '#5795E3' },
          { id: 'flat', label: 'Flat', short: 'Flat', value: Math.max(0, perfGp.flat), color: '#A4ADBA' },
          { id: 'loss', label: 'At Loss', short: 'Loss', value: perfGp.loss, color: '#E8564A' },
        ],
      },
      {
        id: 'trend', label: '3-Month GP Trend', shortTitle: 'GP Trend', sub: 'vs prior 3 months', accent: '#5795E3',
        center: rows.filter((r) => r.performance === 'trending').length, centerFmt: 'count', centerLabel: 'Trending Reps',
        slices: [
          { id: 'surge', label: 'Surge (+25%)', short: 'Surge', value: trendGp.surge, color: '#3CC47A' },
          { id: 'rising', label: 'Rising (+12%)', short: 'Rising', value: trendGp.rising, color: '#25B1A4' },
          { id: 'stable', label: 'Stable', short: 'Stable', value: trendGp.stable, color: '#5795E3' },
          { id: 'slipping', label: 'Slipping', short: 'Slip', value: trendGp.slipping, color: '#F5A72C' },
          { id: 'declining', label: 'Declining', short: 'Decline', value: trendGp.declining, color: '#E8564A' },
        ],
      },
      {
        id: 'country', label: 'GP by Country', shortTitle: 'Country', sub: 'Regional gross profit split', accent: '#1E5FAA',
        center: totalRev, centerFmt: 'currency', centerLabel: 'Revenue',
        slices: [
          { id: 'US', label: 'United States', short: 'US', value: Math.max(0, countryGp.US), color: '#5795E3' },
          { id: 'Canada', label: 'Canada', short: 'Canada', value: Math.max(0, countryGp.Canada), color: '#25B1A4' },
          { id: 'Mexico', label: 'Mexico', short: 'Mexico', value: Math.max(0, countryGp.Mexico), color: '#F5A72C' },
        ],
      },
      {
        id: 'margin', label: 'Margin Bands', shortTitle: 'Margin', sub: 'GP % distribution', accent: '#9F80F5',
        center: rows.length, centerFmt: 'count', centerLabel: 'Sales Reps',
        slices: [
          { id: 'high', label: 'High (>20%)', short: '>20%', value: marginGp.high, color: '#3CC47A' },
          { id: 'mid', label: 'Mid (10–20%)', short: '10–20%', value: marginGp.mid, color: '#5795E3' },
          { id: 'low', label: 'Low (<10%)', short: '<10%', value: marginGp.low, color: '#F5A72C' },
          { id: 'negative', label: 'Negative', short: 'Neg', value: Math.abs(marginGp.negative), color: '#E8564A' },
        ],
      },
      {
        id: 'status', label: 'Active vs Inactive', shortTitle: 'Rep Status', sub: 'GP contribution by rep status', accent: '#9F80F5',
        center: rows.filter((r) => r.status === 'active').length, centerFmt: 'count', centerLabel: 'Active',
        slices: [
          { id: 'active', label: 'Active Reps', short: 'Active', value: Math.max(0, statusGp.active), color: '#3CC47A' },
          { id: 'inactive', label: 'Inactive Reps', short: 'Inactive', value: Math.max(0, statusGp.inactive), color: '#A4ADBA' },
        ],
      },
      {
        id: 'orders', label: 'Orders by Country', shortTitle: 'Orders', sub: 'Volume distribution', accent: '#F07F3C',
        center: totalOrders, centerFmt: 'number', centerLabel: 'Orders',
        slices: [
          { id: 'US', label: 'United States', short: 'US', value: rows.filter((r) => r.country === 'US').reduce((s, r) => s + r.recent.orders, 0), color: '#5795E3' },
          { id: 'Canada', label: 'Canada', short: 'CA', value: rows.filter((r) => r.country === 'Canada').reduce((s, r) => s + r.recent.orders, 0), color: '#25B1A4' },
          { id: 'Mexico', label: 'Mexico', short: 'MX', value: rows.filter((r) => r.country === 'Mexico').reduce((s, r) => s + r.recent.orders, 0), color: '#F5A72C' },
        ],
      },
    ],
  }
}

export function topRepsTrendSeries(repIds, months) {
  return repIds.map((id, i) => {
    const rep = salesReps.find((r) => r.id === id)
    const colors = ['#3CC47A', '#5795E3', '#25B1A4', '#F5A72C', '#9F80F5']
    const data = months.map((month) => {
      const row = monthlyMetricsList.find((m) => m.salesRepId === id && m.month === month)
      return row?.gp ?? 0
    })
    return { name: rep?.name?.split(' ')[0] || id, data, color: colors[i % colors.length] }
  })
}
