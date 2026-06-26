export const COUNTRIES = ['US', 'Canada', 'Mexico']
export const COUNTRY_LABELS = { US: 'United States', Canada: 'Canada', Mexico: 'Mexico' }

const FIRST = ['NICK', 'TRAVIS', 'PETER', 'JAMES', 'HEKTOR', 'VINEET', 'JEWAN', 'RYAN', 'EDWIN', 'SARAH', 'MARIA', 'CARLOS', 'DIANA', 'KEVIN', 'LISA', 'ROBERT', 'AMANDA', 'MICHAEL']
const LAST = ['BOCHAT', 'SKEENS', 'CHANASYK', 'BAUMER', 'SLIHO', 'PATEL', 'SINGH', 'JANES', 'CANO', 'MARTIN', 'GARCIA', 'LOPEZ', 'HERNANDEZ', 'WILSON', 'THOMPSON', 'ANDERSON', 'TAYLOR', 'MOORE']

const CUSTOMERS = [
  'SEALED AIR CORPORATION', 'CH ROBINSON', 'AMERICAN HONDA', 'FIAT CHRYSLER AUTOMOBILES US LLC',
  'AKZENT LOGISTICS', 'INEOS OLEFINS', 'PREGIS LLC', 'RYDER-LEXMARK', 'STORA-ENSO',
  'HILLMAN GROUP INC', 'VICTAULIC COMPANY', 'NOVA CHEMICALS', 'UNILEVER', 'HISENSE',
  'DOMTAR', 'GENERAL MOTORS', 'FORD MOTOR COMPANY', 'TOYOTA NA', 'BMW MANUFACTURING',
  'WALMART LOGISTICS', 'TARGET SUPPLY CHAIN', 'AMAZON FREIGHT', 'PEPSICO', 'NESTLE USA',
  'PROCTER AND GAMBLE', '3M COMPANY', 'HONEYWELL', 'DOW CHEMICAL', 'BASF CORPORATION',
]

function mulberry32(seed) {
  return function rand() {
    let t = (seed += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(42)

function monthKey(y, m) {
  return `${y}-${String(m).padStart(2, '0')}`
}

export function monthLabel(key) {
  const [y, m] = key.split('-')
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${names[Number(m) - 1]} ${y}`
}

function buildMonths() {
  const months = []
  for (let y = 2024; y <= 2026; y++) {
    const endM = y === 2026 ? 6 : 12
    for (let m = 1; m <= endM; m++) months.push(monthKey(y, m))
  }
  return months
}

export const MONTHS = buildMonths()
export const LAST_3_MONTHS = MONTHS.slice(-3)
export const PRIOR_3_MONTHS = MONTHS.slice(-6, -3)
export const LAST_REFRESH = '2026-06-26 06:06:36 AM'

const reps = []
let repIdx = 0
for (const country of COUNTRIES) {
  const count = country === 'US' ? 18 : country === 'Canada' ? 12 : 8
  for (let i = 0; i < count; i++) {
    const first = FIRST[repIdx % FIRST.length]
    const last = LAST[(repIdx + 3) % LAST.length]
    reps.push({
      id: `sr-${String(repIdx + 1).padStart(3, '0')}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@chargerfleet.com`,
      country,
      status: rand() > 0.12 ? 'active' : 'inactive',
      baseMargin: 0.12 + rand() * 0.22,
      volumeFactor: 0.5 + rand() * 1.5,
      trendBias: rand() * 2 - 0.5,
    })
    repIdx++
  }
}
export const salesReps = reps

const customers = []
let custIdx = 0
for (const rep of salesReps) {
  const n = 2 + Math.floor(rand() * 5)
  for (let c = 0; c < n; c++) {
    customers.push({
      id: `cust-${String(custIdx + 1).padStart(4, '0')}`,
      name: CUSTOMERS[(custIdx + c) % CUSTOMERS.length],
      salesRepId: rep.id,
      country: rep.country,
      industry: ['Automotive', 'Chemical', 'Retail', 'Food', 'Paper', 'Steel'][Math.floor(rand() * 6)],
    })
    custIdx++
  }
}
export const customersList = customers

const monthlyMetrics = []
const customerMonthly = []

for (const rep of salesReps) {
  const repCustomers = customers.filter((c) => c.salesRepId === rep.id)
  let seasonPhase = rand() * Math.PI * 2
  for (const month of MONTHS) {
    const monthIdx = MONTHS.indexOf(month)
    const seasonal = 1 + 0.15 * Math.sin(seasonPhase + monthIdx * 0.4)
    const growth = 1 + rep.trendBias * 0.008 * monthIdx
    const baseOrders = Math.round((8 + rand() * 35) * rep.volumeFactor * seasonal * growth)
    const revenue = Math.round(baseOrders * (2800 + rand() * 4200))
    const marginVar = rep.baseMargin + (rand() - 0.5) * 0.08
    const cost = Math.round(revenue * (1 - marginVar))
    const gp = revenue - cost
    monthlyMetrics.push({ salesRepId: rep.id, month, orders: baseOrders, revenue, cost, gp, gpPct: revenue > 0 ? (gp / revenue) * 100 : 0 })

    let remO = baseOrders; let remR = revenue; let remC = cost
    repCustomers.forEach((cust, ci) => {
      const isLast = ci === repCustomers.length - 1
      const share = isLast ? 1 : 0.15 + rand() * 0.35
      const o = isLast ? remO : Math.max(1, Math.round(baseOrders * share))
      const r = isLast ? remR : Math.round(revenue * share)
      const c = isLast ? remC : Math.round(cost * share)
      remO -= o; remR -= r; remC -= c
      customerMonthly.push({ customerId: cust.id, salesRepId: rep.id, month, orders: o, revenue: r, cost: c, gp: r - c, gpPct: r > 0 ? ((r - c) / r) * 100 : 0 })
    })
    seasonPhase += 0.05
  }
}

export const monthlyMetricsList = monthlyMetrics
export const customerMonthlyList = customerMonthly
