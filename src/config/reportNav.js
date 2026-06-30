/** Left-nav report folders — add `path` on items when routes are ready */
export const REPORT_NAV = [
  {
    id: 'asset',
    label: 'Asset',
    icon: 'truck',
    items: [
      { id: 'idling', label: 'Idling' },
      { id: 'truck-utilization', label: 'Truck Utilization' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: 'bar-chart-2',
    items: [
      { id: 'profit-loss', label: 'Profit / Loss' },
      { id: 'rep-performance', label: 'Sale Rep Performance', path: '/reports/sales-rep/dashboard' },
    ],
  },
  {
    id: 'brokerage',
    label: 'Brokerage',
    icon: 'package',
    items: [],
  },
  {
    id: 'safety',
    label: 'Safety',
    icon: 'shield',
    items: [],
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: 'receipt',
    items: [],
  },
  {
    id: 'customs',
    label: 'Customs',
    icon: 'globe',
    items: [],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'landmark',
    items: [],
  },
]
