# ChargerFleet · Sales Rep Reporting

Enterprise sales rep GP KPI reporting module built with React 18 + Vite. Matches the ChargerFleet / Pearl Technologies design system used in Maintenance Workspace.

## Quick start

```bash
cd ~/Projects/sales-rep-reporting
npm install
npm run dev
```

Open `http://localhost:5173` — routes to **Dashboard** by default.

## Pages

| Route | Purpose |
|-------|---------|
| `/reports/sales-rep/dashboard` | High-level KPI dashboard — country filter (US / Canada / Mexico), performance donuts, GP trend, top/bottom reps, full rep table |
| `/reports/sales-rep/rep-detail?rep=sr-001` | User-level view — select a sales rep, see customers, monthly GP breakdown, trends |

## Design system

- Tokens: `src/styles/colors_and_type.css` (light theme default via `data-theme="light"`)
- Layout: `src/styles/app.css` (shell), `src/styles/reporting.css` (dashboard/detail)
- Primitives: `src/components/primitives.jsx`
- Charts: `src/components/charts.jsx` (ECharts SVG renderer, CSS var bridge)

## Mock data

- `src/data/salesRepMock.js` — 38 sales reps, ~140 customers, 18 months of metrics
- `src/data/selectors.js` — aggregation, trending classification, module chart builders

**Trending logic (last 3 vs prior 3 months):**
- `trending` — GP growth ≥ 12%
- `profit` — positive GP, below trending threshold
- `loss` — negative GP
- `flat` — otherwise

## Adding a module chart + slice filter

1. Add slices in `buildModuleCharts()` inside `src/data/selectors.js`
2. Implement matching in `sliceMatchesRep(rep, sliceId, moduleId)`
3. Dashboard wires `ModuleCard` → `toggleSlice` → `selectedSlices` → table filter
4. Each slice key is stored as `moduleId:sliceId` (e.g. `performance:trending`)

## State persisted in localStorage

- `sr.reporting.filters` — country, rep, performance filter
- `sr.sidebarCollapsed` — app shell sidebar
- `sr.reportsHubCollapsed` — hub nav sidebar

## Stack

- React 18 + Vite
- react-router-dom v7
- echarts ^6 + echarts-for-react ^3
- lucide-react icons
- CSS custom properties (no Tailwind)
