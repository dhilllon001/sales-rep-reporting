import React, { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'

export function cssVar(name, fallback = '#000') {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

const baseTextStyle = {
  fontFamily: 'Inter 18pt, Inter, Helvetica Neue, Arial, sans-serif',
}

export function baseTooltip() {
  return {
    backgroundColor: cssVar('--bg-surface-1'),
    borderColor: cssVar('--border-2'),
    borderWidth: 1,
    textStyle: { color: cssVar('--fg-1'), fontFamily: baseTextStyle.fontFamily, fontSize: 12 },
    extraCssText: 'box-shadow: 0 4px 16px rgba(0,0,0,0.10); border-radius: 6px;',
  }
}

export function Sparkline({ data, color = 'var(--action)', width = 120, height = 28, fill = true }) {
  const resolvedColor = useMemo(() => color.startsWith('var(') ? cssVar(color.slice(4, -1)) : color, [color])
  const option = useMemo(() => ({
    grid: { left: 0, right: 0, top: 2, bottom: 2 },
    xAxis: { type: 'category', show: false, boundaryGap: false, data: data.map((_, i) => i) },
    yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
    series: [{
      type: 'line', data, smooth: 0.3, showSymbol: false,
      lineStyle: { width: 1.5, color: resolvedColor },
      areaStyle: fill ? {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: resolvedColor + '33' }, { offset: 1, color: resolvedColor + '00' }],
        },
      } : undefined,
    }],
    tooltip: { show: false }, animation: false,
  }), [data, resolvedColor, fill])
  return <ReactECharts option={option} style={{ width, height }} opts={{ renderer: 'svg' }} notMerge lazyUpdate />
}

export function StatTile({ label, value, unit, sub, subTone, spark, sparkColor, accent = 'var(--fg-1)', onClick, active }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} style={{
      textAlign: 'left', background: 'var(--bg-surface-1)', border: `1px solid ${active ? 'var(--action)' : 'var(--border-2)'}`,
      borderRadius: 'var(--radius-lg)', padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 8,
      cursor: onClick ? 'pointer' : 'default', minWidth: 0, transition: 'border-color var(--dur-base), background var(--dur-base)',
      boxShadow: active ? '0 0 0 1px var(--action)' : 'none', font: 'inherit', width: '100%',
    }}
      onMouseEnter={(e) => { if (onClick && !active) e.currentTarget.style.background = 'var(--bg-surface-3)' }}
      onMouseLeave={(e) => { if (onClick && !active) e.currentTarget.style.background = 'var(--bg-surface-1)' }}
    >
      <div style={{ fontWeight: 600, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 30, lineHeight: 1, color: accent, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
          {unit && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-3)' }}>{unit}</span>}
        </div>
        {spark && <Sparkline data={spark} color={sparkColor || 'var(--fg-4)'} width={78} height={26} />}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: subTone || 'var(--fg-3)' }}>{sub}</div>}
    </button>
  )
}

export function BarList({ rows, onRow, valueFmt = (v) => v.toLocaleString(), height = 30, maxRows }) {
  const data = maxRows ? rows.slice(0, maxRows) : rows
  const containerH = data.length * height + 16
  const maxVal = Math.max(...data.map((r) => r.value), 1)
  const option = useMemo(() => ({
    grid: { left: 130, right: 70, top: 4, bottom: 4 },
    xAxis: { type: 'value', show: false, max: maxVal },
    yAxis: {
      type: 'category', inverse: true, data: data.map((r) => r.label),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: cssVar('--fg-1'), fontFamily: baseTextStyle.fontFamily, fontSize: 12, fontWeight: 500, overflow: 'truncate', width: 128 },
    },
    tooltip: { ...baseTooltip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
    series: [{
      type: 'bar',
      data: data.map((r) => ({
        value: r.value,
        itemStyle: {
          color: r.color ? (r.color.startsWith('var(') ? cssVar(r.color.slice(4, -1)) : r.color) : cssVar('--action'),
          borderRadius: [0, 999, 999, 0],
        },
      })),
      barWidth: 10,
      label: { show: true, position: 'right', formatter: (p) => valueFmt(p.value), color: cssVar('--fg-1'), fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 },
      cursor: onRow ? 'pointer' : 'default',
    }],
    animationDuration: 500,
  }), [data, valueFmt, onRow, maxVal])
  const onEvents = useMemo(() => ({
    click: (p) => { if (onRow && data[p.dataIndex]) onRow(data[p.dataIndex].key) },
  }), [data, onRow])
  return <ReactECharts option={option} style={{ width: '100%', height: containerH }} opts={{ renderer: 'svg' }} onEvents={onEvents} notMerge lazyUpdate />
}

export function LineTrendChart({ labels, series, height = 260, yFmt, showEveryLabel = false }) {
  const fmt = yFmt || ((v) => {
    const abs = Math.abs(v)
    const sign = v < 0 ? '-' : ''
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`
    return `${sign}$${abs.toFixed(0)}`
  })
  const option = useMemo(() => ({
    grid: { left: 62, right: 20, top: 36, bottom: labels.length > 6 ? 56 : 40 },
    tooltip: { ...baseTooltip(), trigger: 'axis', valueFormatter: fmt, textStyle: { fontSize: 13 } },
    legend: series.length > 1 ? { bottom: 0, textStyle: { color: cssVar('--fg-2'), fontFamily: baseTextStyle.fontFamily, fontSize: 12 } } : undefined,
    xAxis: {
      type: 'category', data: labels,
      axisLine: { lineStyle: { color: cssVar('--border-2') } },
      axisLabel: {
        color: cssVar('--fg-2'), fontSize: 12, fontFamily: baseTextStyle.fontFamily,
        rotate: labels.length > 6 ? 32 : 0, interval: showEveryLabel ? 0 : 'auto',
      },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value', axisLine: { show: false },
      splitLine: { lineStyle: { color: cssVar('--border-1'), type: 'dashed' } },
      axisLabel: { color: cssVar('--fg-2'), fontSize: 12, formatter: fmt, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 },
    },
    series: series.map((s) => ({
      name: s.name, type: 'line', data: s.data, smooth: 0.25, symbol: 'circle', symbolSize: 8,
      lineStyle: { width: 2.5, color: s.color?.startsWith('var(') ? cssVar(s.color.slice(4, -1)) : s.color },
      itemStyle: { color: s.color?.startsWith('var(') ? cssVar(s.color.slice(4, -1)) : s.color, borderWidth: 2, borderColor: cssVar('--bg-surface-1') },
      label: s.showLabels ? {
        show: true, position: 'top', formatter: (p) => fmt(p.value),
        fontSize: 11, fontWeight: 600, color: cssVar('--fg-1'), fontFamily: 'JetBrains Mono, monospace',
      } : undefined,
      areaStyle: s.fill ? {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: (s.color?.startsWith('var(') ? cssVar(s.color.slice(4, -1)) : s.color) + '28' },
            { offset: 1, color: (s.color?.startsWith('var(') ? cssVar(s.color.slice(4, -1)) : s.color) + '00' },
          ],
        },
      } : undefined,
    })),
    animationDuration: 500,
  }), [labels, series, fmt, showEveryLabel])
  return <ReactECharts option={option} style={{ width: '100%', height }} opts={{ renderer: 'svg' }} notMerge lazyUpdate />
}

export function formatCurrency(v, compact = true) {
  if (v == null || Number.isNaN(v)) return '—'
  const abs = Math.abs(v)
  const sign = v < 0 ? '(' : ''
  const end = v < 0 ? ')' : ''
  if (compact) {
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M${end}`
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K${end}`
  }
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${end}`
}

export function formatDonutValue(v, fmt) {
  if (v == null || Number.isNaN(v)) return '—'
  if (fmt === 'currency') return formatCurrency(v, false)
  if (fmt === 'count' || fmt === 'number') return v.toLocaleString()
  return v.toLocaleString()
}

export function DonutChartPopover({
  title, subtitle, centerValue, centerLabel, slices, highlightId, valueFmt, mode = 'slice', total, className = '',
}) {
  const fmt = valueFmt || ((v) => v.toLocaleString())
  const sum = total ?? (slices.reduce((s, x) => s + Math.max(0, x.value), 0) || 1)
  const visible = slices.filter((s) => s.value > 0)
  const highlighted = highlightId && highlightId !== 'center' ? slices.find((s) => s.id === highlightId) : null

  if (mode === 'slice' && highlighted) {
    const pct = sum > 0 ? ((Math.max(0, highlighted.value) / sum) * 100).toFixed(1) : '0.0'
    return (
      <div className={`sr-donut-popover sr-donut-popover--slice ${className}`.trim()} role="tooltip">
        <div className="sr-donut-popover__accent" style={{ background: highlighted.color }} />
        <div className="sr-donut-popover__head">
          <span className="sr-donut-popover__eyebrow">{title}</span>
          <span className="sr-donut-popover__name">{highlighted.label}</span>
        </div>
        <div className="sr-donut-popover__metrics">
          <span className="sr-donut-popover__metric-main">{fmt(highlighted.value)}</span>
          <span className="sr-donut-popover__metric-sub">{pct}% of total</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`sr-donut-popover sr-donut-popover--center ${className}`.trim()} role="tooltip">
      <div className="sr-donut-popover__head">
        <span className="sr-donut-popover__name">{title}</span>
        {subtitle && <span className="sr-donut-popover__sub">{subtitle}</span>}
      </div>
      {(centerValue != null) && (
        <div className="sr-donut-popover__hero">
          <span className="sr-donut-popover__metric-main">{centerValue}</span>
          {centerLabel && <span className="sr-donut-popover__metric-sub">{centerLabel}</span>}
        </div>
      )}
      <ul className="sr-donut-popover__list">
        {visible.map((s) => {
          const pct = sum > 0 ? ((Math.max(0, s.value) / sum) * 100).toFixed(1) : '0.0'
          const isActive = highlightId === s.id
          return (
            <li key={s.id} className={isActive ? 'is-active' : ''}>
              <span className="sr-donut-popover__dot" style={{ background: s.color }} />
              <span className="sr-donut-popover__row-label">{s.label}</span>
              <span className="sr-donut-popover__row-val">{fmt(s.value)}</span>
              <span className="sr-donut-popover__row-pct">{pct}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function DonutKpiChart({
  slices, selectedSliceIds = [], onSelectSlice, size = 120,
  centerValue, centerLabel, valueFmt,
  highlightSliceId = null, onSliceHover,
  onCenterHover,
}) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0) || 1
  const option = useMemo(() => ({
    series: [{
      type: 'pie',
      radius: ['52%', '78%'],
      center: ['50%', '50%'],
      startAngle: 90,
      padAngle: 2,
      label: { show: false },
      emphasis: { scale: true, scaleSize: 6, focus: 'self' },
      blur: { itemStyle: { opacity: 0.25 } },
      data: slices.filter((s) => s.value > 0).map((s) => {
        const dimmed = highlightSliceId && highlightSliceId !== s.id
        return {
          name: s.id,
          value: s.value,
          itemStyle: {
            color: s.color?.startsWith('var(') ? cssVar(s.color.slice(4, -1)) : s.color,
            borderRadius: 6,
            borderWidth: selectedSliceIds.includes(s.id) ? 3 : 0,
            borderColor: cssVar('--action'),
            opacity: dimmed ? 0.35 : 1,
          },
        }
      }),
    }],
    tooltip: { show: false },
    animationDuration: 300,
  }), [slices, selectedSliceIds, highlightSliceId])

  const onEvents = useMemo(() => ({
    click: (p) => { if (onSelectSlice && p.name) onSelectSlice(p.name) },
    mouseover: (p) => { if (onSliceHover && p.name) onSliceHover(p.name) },
  }), [onSelectSlice, onSliceHover])

  return (
    <div className="sr-donut-chart" style={{ width: size, height: size }}>
      <ReactECharts option={option} style={{ width: size, height: size }} opts={{ renderer: 'svg' }} onEvents={onEvents} notMerge lazyUpdate />
      <button
        type="button"
        className="sr-donut-chart__center-hit"
        aria-label={`${centerLabel || 'Total'}: ${centerValue}`}
        onMouseEnter={() => onCenterHover?.(true)}
        onFocus={() => onCenterHover?.(true)}
      />
      <div className="sr-donut-chart__center" aria-hidden="true">
        <div className="sr-donut-chart__value">{centerValue}</div>
        {centerLabel && <div className="sr-donut-chart__label">{centerLabel}</div>}
      </div>
    </div>
  )
}

export function ModulePie({ slices, selectedSliceIds = [], onSelectSlice, size = 72, valueFmt, highlightSliceId, onSliceHover }) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0) || 1
  const option = useMemo(() => ({
    series: [{
      type: 'pie', radius: ['48%', '82%'], center: ['50%', '50%'], startAngle: 90, padAngle: 2,
      label: { show: false }, emphasis: { scale: true, scaleSize: 4, focus: 'self' },
      data: slices.filter((s) => s.value > 0).map((s) => ({
        name: s.id, value: s.value,
        itemStyle: {
          color: s.color?.startsWith('var(') ? cssVar(s.color.slice(4, -1)) : s.color,
          borderRadius: 5,
          borderWidth: selectedSliceIds.includes(s.id) ? 3 : 0,
          borderColor: cssVar('--action'),
          opacity: highlightSliceId && highlightSliceId !== s.id ? 0.35 : 1,
        },
      })),
    }],
    tooltip: { show: false },
    animationDuration: 300,
  }), [slices, selectedSliceIds, highlightSliceId])
  const onEvents = useMemo(() => ({
    click: (p) => { if (onSelectSlice && p.name) onSelectSlice(p.name) },
    mouseover: (p) => { if (onSliceHover && p.name) onSliceHover(p.name) },
  }), [onSelectSlice, onSliceHover])
  return <ReactECharts option={option} style={{ width: size, height: size }} opts={{ renderer: 'svg' }} onEvents={onEvents} notMerge lazyUpdate />
}

export function MultiLineChart({ labels, series, height = 220, yFmt, legendRight = false }) {
  const fmt = yFmt || ((v) => {
    const abs = Math.abs(v); const sign = v < 0 ? '-' : ''
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`
    return `${sign}$${abs.toFixed(0)}`
  })
  const showLegend = series.length > 1
  const option = useMemo(() => ({
    grid: {
      left: 52,
      right: legendRight && showLegend ? 148 : 16,
      top: 16,
      bottom: 28,
    },
    tooltip: { ...baseTooltip(), trigger: 'axis', valueFormatter: fmt },
    legend: showLegend ? (legendRight ? {
      orient: 'vertical',
      right: 4,
      top: 'middle',
      itemWidth: 10,
      itemHeight: 8,
      itemGap: 10,
      textStyle: { fontSize: 10, color: cssVar('--fg-2'), width: 120, overflow: 'truncate' },
    } : {
      bottom: 0,
      type: 'scroll',
      textStyle: { fontSize: 10, color: cssVar('--fg-2') },
    }) : undefined,
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: {
        fontSize: 10,
        color: cssVar('--fg-2'),
        fontFamily: baseTextStyle.fontFamily,
        rotate: legendRight ? 0 : 20,
        interval: legendRight ? 'auto' : 0,
      },
      axisLine: { lineStyle: { color: cssVar('--border-2') } },
      axisTick: { show: false },
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 11, color: cssVar('--fg-2'), formatter: fmt, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }, splitLine: { lineStyle: { color: cssVar('--border-1'), type: 'dashed' } } },
    series: series.map((s) => ({ name: s.name, type: 'line', data: s.data, smooth: 0.2, symbol: 'circle', symbolSize: 4, lineStyle: { width: 1.5, color: s.color }, itemStyle: { color: s.color } })),
    animationDuration: 500,
  }), [labels, series, fmt, legendRight, showLegend])
  return <ReactECharts option={option} style={{ width: '100%', height }} opts={{ renderer: 'svg' }} notMerge lazyUpdate />
}

export function formatPct(v, signed = false) {
  if (v == null || Number.isNaN(v)) return '—'
  const prefix = signed && v > 0 ? '+' : ''
  return `${prefix}${v.toFixed(2)}%`
}
