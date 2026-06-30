import {
  LAST_3_MONTHS, PRIOR_3_MONTHS, LAST_12_MONTHS, PRIOR_12_MONTHS,
  MONTHS, monthlyMetricsList, salesReps, customersList, customerMonthlyList, MANAGER_REPORTS,
} from './salesRepMock.js'

export function periodMonths(deliveryMonth = 'LAST_3') {
  return deliveryMonth === 'LAST_12' ? LAST_12_MONTHS : LAST_3_MONTHS
}

export function priorPeriodMonths(deliveryMonth = 'LAST_3') {
  return deliveryMonth === 'LAST_12' ? PRIOR_12_MONTHS : PRIOR_3_MONTHS
}

function matchesSearch(rep, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (rep.name.toLowerCase().includes(q)) return true
  if (rep.email?.toLowerCase().includes(q)) return true
  if (rep.country.toLowerCase().includes(q)) return true
  if (rep.id.toLowerCase().includes(q)) return true
  if (rep.teamId?.toLowerCase().includes(q)) return true
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

export function teamMembersFor(repId) {
  const reportIds = MANAGER_REPORTS[repId] || []
  return salesReps.filter((r) => reportIds.includes(r.id))
}

export function isManager(repId) {
  return (MANAGER_REPORTS[repId]?.length ?? 0) > 0
}

/** Rep IDs in scope for View as: ALL = null means all reps after filters */
export function resolveViewScope(viewAsId, repId = null) {
  if (!viewAsId || viewAsId === 'ALL') return null
  const ids = [viewAsId]
  if (MANAGER_REPORTS[viewAsId]) ids.push(...MANAGER_REPORTS[viewAsId])
  return [...new Set(ids)]
}

export function metricsForRep(repId, months = null, channel = null) {
  let rows = monthlyMetricsList.filter((m) => m.salesRepId === repId)
  if (months) rows = rows.filter((m) => months.includes(m.month))
  if (channel) rows = rows.filter((m) => m.channel === channel)
  return withGpPct(sumMetrics(rows))
}

export function metricsForRepIds(repIds, months = null, channel = null) {
  let rows = monthlyMetricsList.filter((m) => repIds.includes(m.salesRepId))
  if (months) rows = rows.filter((m) => months.includes(m.month))
  if (channel) rows = rows.filter((m) => m.channel === channel)
  return withGpPct(sumMetrics(rows))
}

export function channelSplit(repIds, months) {
  const asset = metricsForRepIds(repIds, months, 'asset')
  const brokerage = metricsForRepIds(repIds, months, 'brokerage')
  return { asset, brokerage }
}

export function classifyRep(repId, deliveryMonth = 'LAST_3') {
  const recentMonths = periodMonths(deliveryMonth)
  const priorMonths = priorPeriodMonths(deliveryMonth)
  const recent = metricsForRep(repId, recentMonths)
  const prior = metricsForRep(repId, priorMonths)
  const gpChange = prior.gp !== 0 ? ((recent.gp - prior.gp) / Math.abs(prior.gp)) * 100 : recent.gp > 0 ? 100 : 0
  let performance = 'flat'
  if (recent.gp < 0) performance = 'loss'
  else if (gpChange >= 12) performance = 'trending'
  else if (recent.gp > 0) performance = 'profit'
  return { recent, prior, gpChange, performance }
}

export function repSummaryRows(filters = {}) {
  const {
    country = 'ALL', status = 'ALL', performanceFilter = null,
    salesRepId = 'ALL', searchQuery = '', viewAsId = 'ALL', deliveryMonth = 'LAST_3',
  } = filters
  const period = periodMonths(deliveryMonth)
  const scopeIds = resolveViewScope(viewAsId)

  return salesReps
    .filter((r) => country === 'ALL' || r.country === country)
    .filter((r) => status === 'ALL' || r.status === status)
    .filter((r) => salesRepId === 'ALL' || r.id === salesRepId)
    .filter((r) => !scopeIds || scopeIds.includes(r.id))
    .map((rep) => {
      const { recent, prior, gpChange, performance } = classifyRep(rep.id, deliveryMonth)
      const recentPeriod = metricsForRep(rep.id, period)
      const channel = channelSplit([rep.id], period)
      return {
        ...rep,
        isManager: isManager(rep.id),
        directReportCount: teamMembersFor(rep.id).length,
        customerCount: customersList.filter((c) => c.salesRepId === rep.id).length,
        recent: recentPeriod,
        prior,
        gpChange,
        performance,
        channel,
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
    const merged = {}
    for (const r of monthRows) {
      if (!merged[r.salesRepId]) merged[r.salesRepId] = { orders: 0, revenue: 0, cost: 0, gp: 0 }
      merged[r.salesRepId].orders += r.orders
      merged[r.salesRepId].revenue += r.revenue
      merged[r.salesRepId].cost += r.cost
      merged[r.salesRepId].gp += r.gp
    }
    return { month, ...withGpPct(sumMetrics(Object.values(merged))) }
  })
}

export function teamMonthlyTrend(repIds, months) {
  return monthlyTrend(months, repIds)
}

export function topBottomReps(filters, n = 5) {
  const rows = repSummaryRows(filters)
  const sorted = [...rows].sort((a, b) => b.recent.gp - a.recent.gp)
  return { top: sorted.slice(0, n), bottom: sorted.slice(-n).reverse() }
}

export function topBottomCustomers(filters, n = 5) {
  const rows = repSummaryRows({ ...filters, performanceFilter: null })
  const repIds = rows.map((r) => r.id)
  const period = periodMonths(filters.deliveryMonth || 'LAST_3')
  const byCustomer = new Map()

  for (const row of customerMonthlyList) {
    if (!repIds.includes(row.salesRepId)) continue
    if (!period.includes(row.month)) continue
    const cust = customersList.find((c) => c.id === row.customerId)
    if (!cust) continue
    const prev = byCustomer.get(cust.id) || { ...cust, orders: 0, revenue: 0, cost: 0, gp: 0 }
    prev.orders += row.orders
    prev.revenue += row.revenue
    prev.cost += row.cost
    prev.gp += row.gp
    byCustomer.set(cust.id, prev)
  }

  const list = [...byCustomer.values()].map((c) => ({
    ...c,
    gpPct: c.revenue > 0 ? (c.gp / c.revenue) * 100 : 0,
    salesRepName: salesReps.find((r) => r.id === c.salesRepId)?.name,
  }))
  const sorted = [...list].sort((a, b) => b.gp - a.gp)
  return { top: sorted.slice(0, n), bottom: sorted.slice(-n).reverse() }
}

export function customersForRep(repId, months = LAST_3_MONTHS) {
  return customersList
    .filter((c) => c.salesRepId === repId)
    .map((cust) => {
      const rows = customerMonthlyList.filter((m) => m.customerId === cust.id && months.includes(m.month))
      const merged = sumMetrics(rows)
      return { ...cust, ...withGpPct(merged) }
    })
    .sort((a, b) => b.gp - a.gp)
}

export function customersForRepIds(repIds, months) {
  return customersList
    .filter((c) => repIds.includes(c.salesRepId))
    .map((cust) => {
      const rows = customerMonthlyList.filter((m) => m.customerId === cust.id && months.includes(m.month))
      return { ...cust, ...withGpPct(sumMetrics(rows)) }
    })
    .sort((a, b) => b.gp - a.gp)
}

export function repMonthlyBreakdown(repId, repIds = null) {
  const ids = repIds || [repId]
  const months = [...new Set(monthlyMetricsList.filter((m) => ids.includes(m.salesRepId)).map((m) => m.month))].sort()
  return months.map((month, i) => {
    const monthRows = monthlyMetricsList.filter((m) => ids.includes(m.salesRepId) && m.month === month)
    const merged = sumMetrics(monthRows)
    const row = { month, ...withGpPct(merged) }
    const prevMonth = i > 0 ? months[i - 1] : null
    const prevRows = prevMonth
      ? monthlyMetricsList.filter((m) => ids.includes(m.salesRepId) && m.month === prevMonth)
      : []
    const prev = prevRows.length ? withGpPct(sumMetrics(prevRows)) : null
    return {
      ...row,
      pctOrders: prev?.orders ? ((row.orders - prev.orders) / prev.orders) * 100 : null,
      pctRev: prev?.revenue ? ((row.revenue - prev.revenue) / prev.revenue) * 100 : null,
      pctGp: prev?.gp ? ((row.gp - prev.gp) / Math.abs(prev.gp)) * 100 : null,
    }
  })
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

export function sliceMatchesRep(rep, sliceId, moduleId) {
  if (moduleId === 'performance') return rep.performance === sliceId
  if (moduleId === 'country') return rep.country === sliceId
  if (moduleId === 'status') return rep.status === sliceId
  if (moduleId === 'trend') return trendBucket(rep.gpChange) === sliceId
  if (moduleId === 'margin') return marginBand(rep.recent.gpPct) === sliceId
  if (moduleId === 'channel') {
    if (sliceId === 'asset') return rep.channel?.asset?.orders >= rep.channel?.brokerage?.orders
    if (sliceId === 'brokerage') return rep.channel?.brokerage?.orders > rep.channel?.asset?.orders
  }
  return false
}

export function buildDashboardDonuts(filters) {
  const rows = repSummaryRows({ ...filters, performanceFilter: null })
  const period = periodMonths(filters.deliveryMonth || 'LAST_3')
  const periodLabel = filters.deliveryMonth === 'LAST_12' ? 'Last 12 months' : 'Last 3 months'

  const perfGp = { trending: 0, profit: 0, loss: 0, flat: 0 }
  const countryGp = { US: 0, Canada: 0, Mexico: 0 }
  const trendGp = { surge: 0, rising: 0, stable: 0, slipping: 0, declining: 0 }
  const marginGp = { high: 0, mid: 0, low: 0, negative: 0 }
  const statusGp = { active: 0, inactive: 0 }
  const channelOrders = { asset: 0, brokerage: 0 }

  for (const r of rows) {
    const gp = r.recent.gp
    if (r.performance === 'loss') perfGp.loss += Math.abs(gp)
    else perfGp[r.performance] = (perfGp[r.performance] || 0) + gp

    countryGp[r.country] = (countryGp[r.country] || 0) + gp
    trendGp[trendBucket(r.gpChange)] = (trendGp[trendBucket(r.gpChange)] || 0) + Math.max(gp, 0)
    if (gp < 0) marginGp.negative += Math.abs(gp)
    else marginGp[marginBand(r.recent.gpPct)] = (marginGp[marginBand(r.recent.gpPct)] || 0) + gp
    statusGp[r.status] = (statusGp[r.status] || 0) + Math.max(gp, 0)

    const ch = channelSplit([r.id], period)
    channelOrders.asset += ch.asset.orders
    channelOrders.brokerage += ch.brokerage.orders
  }

  const totalGp = rows.reduce((s, r) => s + r.recent.gp, 0)
  const totalRev = rows.reduce((s, r) => s + r.recent.revenue, 0)
  const totalOrders = rows.reduce((s, r) => s + r.recent.orders, 0)
  const sumSlices = (obj) => Object.values(obj).reduce((a, b) => a + Math.max(0, b), 0)

  return {
    totalGp, totalRev, totalOrders, repCount: rows.length,
    modules: [
      {
        id: 'performance', label: 'GP by Performance', shortTitle: 'Performance', sub: `${periodLabel} gross profit`,
        accent: '#25B1A4', soft: '#E6F7F5', valueFmt: 'currency', pending: sumSlices(perfGp),
        center: totalGp, centerFmt: 'currency', centerLabel: 'total gp',
        slices: [
          { id: 'trending', label: 'Trending', short: 'Trending', value: perfGp.trending, color: '#3CC47A' },
          { id: 'profit', label: 'Profitable', short: 'Profit', value: Math.max(0, perfGp.profit), color: '#5795E3' },
          { id: 'flat', label: 'Flat', short: 'Flat', value: Math.max(0, perfGp.flat), color: '#A4ADBA' },
          { id: 'loss', label: 'At Loss', short: 'Loss', value: perfGp.loss, color: '#E8564A' },
        ],
      },
      {
        id: 'trend', label: 'GP Trend', shortTitle: 'GP Trend', sub: `vs prior ${filters.deliveryMonth === 'LAST_12' ? '12' : '3'} months`,
        accent: '#5795E3', soft: '#EBF3FC', valueFmt: 'currency', pending: sumSlices(trendGp),
        center: rows.filter((r) => r.performance === 'trending').length, centerFmt: 'count', centerLabel: 'Trending Reps',
        slices: [
          { id: 'surge', label: 'Surge (+25%)', short: 'SURG', value: trendGp.surge, color: '#3CC47A' },
          { id: 'rising', label: 'Rising (+12%)', short: 'RISE', value: trendGp.rising, color: '#25B1A4' },
          { id: 'stable', label: 'Stable', short: 'STBL', value: trendGp.stable, color: '#5795E3' },
          { id: 'slipping', label: 'Slipping', short: 'SLIP', value: trendGp.slipping, color: '#F5A72C' },
          { id: 'declining', label: 'Declining', short: 'DECL', value: trendGp.declining, color: '#E8564A' },
        ],
      },
      {
        id: 'country', label: 'GP by Country', shortTitle: 'Country', sub: 'Regional gross profit split',
        accent: '#1E5FAA', soft: '#EBF3FC', valueFmt: 'currency', pending: sumSlices(countryGp),
        center: totalRev, centerFmt: 'currency', centerLabel: 'Revenue',
        slices: [
          { id: 'US', label: 'United States', short: 'US', value: Math.max(0, countryGp.US), color: '#5795E3' },
          { id: 'Canada', label: 'Canada', short: 'CA', value: Math.max(0, countryGp.Canada), color: '#25B1A4' },
          { id: 'Mexico', label: 'Mexico', short: 'MX', value: Math.max(0, countryGp.Mexico), color: '#F5A72C' },
        ],
      },
      {
        id: 'margin', label: 'Margin Bands', shortTitle: 'Margin', sub: 'GP % distribution',
        accent: '#9F80F5', soft: '#F1ECFF', valueFmt: 'currency', pending: sumSlices(marginGp),
        center: rows.length, centerFmt: 'count', centerLabel: 'Sales Reps',
        slices: [
          { id: 'high', label: 'High (>20%)', short: '>20%', value: marginGp.high, color: '#3CC47A' },
          { id: 'mid', label: 'Mid (10–20%)', short: '10–20%', value: marginGp.mid, color: '#5795E3' },
          { id: 'low', label: 'Low (<10%)', short: '<10%', value: marginGp.low, color: '#F5A72C' },
          { id: 'negative', label: 'Negative', short: 'Neg', value: Math.abs(marginGp.negative), color: '#E8564A' },
        ],
      },
      {
        id: 'status', label: 'Active vs Inactive', shortTitle: 'Rep Status', sub: 'GP contribution by rep status',
        accent: '#9F80F5', soft: '#F1ECFF', valueFmt: 'currency', pending: sumSlices(statusGp),
        center: rows.filter((r) => r.status === 'active').length, centerFmt: 'count', centerLabel: 'Active',
        slices: [
          { id: 'active', label: 'Active Reps', short: 'Active', value: Math.max(0, statusGp.active), color: '#3CC47A' },
          { id: 'inactive', label: 'Inactive Reps', short: 'Inactive', value: Math.max(0, statusGp.inactive), color: '#A4ADBA' },
        ],
      },
      {
        id: 'channel', label: 'Orders by Channel', shortTitle: 'Channel', sub: 'Asset vs brokerage volume',
        accent: '#F07F3C', soft: '#FFF4E8', valueFmt: 'number', pending: totalOrders,
        center: totalOrders, centerFmt: 'number', centerLabel: 'Orders',
        slices: [
          { id: 'asset', label: 'Asset', short: 'Asset', value: channelOrders.asset, color: '#5795E3' },
          { id: 'brokerage', label: 'Brokerage', short: 'Broker', value: channelOrders.brokerage, color: '#25B1A4' },
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
      const rows = monthlyMetricsList.filter((m) => m.salesRepId === id && m.month === month)
      return sumMetrics(rows).gp
    })
    return { name: rep?.name?.split(' ')[0] || id, data, color: colors[i % colors.length] }
  })
}

export function customerRevenueTrend(repId, months, limit = 4, repIds = null) {
  const ids = repIds || [repId]
  const ranked = customersForRepIds(ids, months).slice(0, limit)
  const colors = ['#3CC47A', '#5795E3', '#25B1A4', '#F5A72C']
  return ranked.map((cust, i) => {
    const data = months.map((month) => {
      const rows = customerMonthlyList.filter((m) => m.customerId === cust.id && m.month === month)
      return sumMetrics(rows).revenue
    })
    return { name: cust.name.slice(0, 22), data, color: colors[i % colors.length] }
  })
}

function customerMomentum(custId, months) {
  const half = Math.floor(months.length / 2)
  const recent = months.slice(-half)
  const prior = months.slice(0, half)
  const sumGp = (ms) => customerMonthlyList
    .filter((m) => m.customerId === custId && ms.includes(m.month))
    .reduce((s, m) => s + m.gp, 0)
  const recentGp = sumGp(recent)
  const priorGp = sumGp(prior)
  const momentum = priorGp !== 0 ? ((recentGp - priorGp) / Math.abs(priorGp)) * 100 : recentGp > 0 ? 100 : 0
  let trend = 'flat'
  if (momentum >= 8) trend = 'up'
  else if (momentum <= -8) trend = 'down'
  return { momentum, trend }
}

export function buildRepProfile(rep, customers, classification, teamMembers = []) {
  const totalGp = customers.reduce((s, c) => s + c.gp, 0)
  const seed = rep.id.split('-').pop() * 1 || 1
  const healthScore = Math.min(99, Math.max(40, 68 + Math.round(classification.gpChange / 3) + (seed % 12)))
  const firstName = rep.name.split(' ')[0]

  const customerScores = customers.slice(0, 8).map((c, i) => {
    const { momentum, trend } = customerMomentum(c.id, LAST_12_MONTHS)
    const share = totalGp > 0 ? Math.round((c.gp / totalGp) * 100) : 0
    return {
      id: c.id,
      name: c.name,
      industry: c.industry,
      country: c.country,
      orders: c.orders,
      gp: c.gp,
      share,
      trend,
      momentum,
      health: Math.min(99, Math.max(35, 60 + Math.round(momentum / 2) + (i % 15))),
    }
  })

  const subRepScores = teamMembers.map((member) => {
    const cl = classifyRep(member.id)
    const trend = cl.gpChange >= 8 ? 'up' : cl.gpChange <= -8 ? 'down' : 'flat'
    return {
      id: member.id,
      name: member.name,
      industry: 'Sales team',
      country: member.country,
      orders: cl.recent.orders,
      gp: cl.recent.gp,
      share: totalGp > 0 ? Math.round((cl.recent.gp / (totalGp + cl.recent.gp)) * 100) : 0,
      trend,
      momentum: cl.gpChange,
      health: Math.min(99, Math.max(40, 65 + Math.round(cl.gpChange / 4))),
      isSubRep: true,
    }
  })

  const allRising = [...customerScores.filter((c) => c.trend === 'up'), ...subRepScores.filter((c) => c.trend === 'up')]
  const allStable = [...customerScores.filter((c) => c.trend === 'flat'), ...subRepScores.filter((c) => c.trend === 'flat')]
  const allDeclining = [...customerScores.filter((c) => c.trend === 'down'), ...subRepScores.filter((c) => c.trend === 'down')]

  return {
    healthScore,
    insight: `${firstName} is ${classification.gpChange >= 0 ? 'outperforming peers with strong GP momentum' : 'facing headwinds on GP'}. Focus on converting mid-tier accounts.`,
    customerScores,
    subRepScores,
    rising: allRising,
    stable: allStable,
    declining: allDeclining,
    momentumPct: classification?.gpChange ?? 0,
  }
}

export function tableRowsWithHierarchy(rows, viewAsId) {
  if (!viewAsId || viewAsId === 'ALL') return rows.map((r) => ({ ...r, isSubRow: false }))
  const manager = rows.find((r) => r.id === viewAsId)
  if (!manager) return rows.map((r) => ({ ...r, isSubRow: false }))
  const reports = rows.filter((r) => r.managerId === viewAsId)
  const others = rows.filter((r) => r.id !== viewAsId && r.managerId !== viewAsId)
  const ordered = [
    { ...manager, isSubRow: false },
    ...reports.map((r) => ({ ...r, isSubRow: true })),
    ...others.map((r) => ({ ...r, isSubRow: false })),
  ]
  return ordered
}
