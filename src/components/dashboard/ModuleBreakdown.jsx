import React, { useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import ReactECharts from 'echarts-for-react'
import { formatCurrency, cssVar } from '../charts.jsx'

const PIE_SIZE = 120

function formatCenterValue(mod) {
  if (mod.centerFmt === 'currency') return formatCurrency(mod.center)
  return mod.center.toLocaleString()
}

function formatSliceValue(value, mod) {
  if (mod.valueFmt === 'currency') return formatCurrency(value)
  return value.toLocaleString()
}

function formatBadgeValue(mod) {
  if (mod.valueFmt === 'currency') return formatCurrency(mod.pending)
  return mod.pending.toLocaleString()
}

function sliceLegendLabel(slice, mod, showFullLabel, selected) {
  if (mod.id === 'country' || mod.id === 'channel') return slice.short
  if (mod.id === 'trend') {
    const map = { surge: 'SURG', rising: 'RISE', stable: 'STBL', slipping: 'SLIP', declining: 'DECL' }
    if (!showFullLabel && !selected) return map[slice.id] || slice.short
  }
  if (showFullLabel || selected) return slice.label
  return slice.short
}

function ModuleTooltip({ mod, coords, highlightId, mode }) {
  if (!coords) return null
  const visible = mod.slices.filter((s) => s.value > 0)
  const total = visible.reduce((s, x) => s + Math.max(0, x.value), 0) || 1
  const highlighted = highlightId ? visible.find((s) => s.id === highlightId) : null

  const style = {
    position: 'fixed',
    left: coords.left,
    top: coords.top,
    zIndex: 10000,
    '--module-accent': mod.accent,
    '--module-soft': mod.soft,
  }

  if (mode === 'slice' && highlighted) {
    const pct = ((Math.max(0, highlighted.value) / total) * 100).toFixed(1)
    return createPortal(
      <div className="sr-mod-tooltip sr-mod-tooltip--slice" style={style} role="tooltip">
        <div className="sr-mod-tooltip__accent" style={{ background: highlighted.color }} />
        <div className="sr-mod-tooltip__body">
          <div className="sr-mod-tooltip__title">{mod.label}</div>
          <div className="sr-mod-tooltip__name">{highlighted.label}</div>
          <div className="sr-mod-tooltip__value">{formatSliceValue(highlighted.value, mod)}</div>
          <div className="sr-mod-tooltip__pct">{pct}% of module total</div>
        </div>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div className="sr-mod-tooltip sr-mod-tooltip--center" style={style} role="tooltip">
      <div className="sr-mod-tooltip__head">
        <span className="sr-mod-tooltip__title">{mod.label}</span>
        {mod.sub && <span className="sr-mod-tooltip__sub">{mod.sub}</span>}
      </div>
      <div className="sr-mod-tooltip__hero">
        <span className="sr-mod-tooltip__value">{formatCenterValue(mod)}</span>
        <span className="sr-mod-tooltip__pct">{mod.centerLabel || 'Total'}</span>
      </div>
      <ul className="sr-mod-tooltip__list">
        {visible.map((s) => {
          const pct = ((Math.max(0, s.value) / total) * 100).toFixed(1)
          return (
            <li key={s.id} className={highlightId === s.id ? 'is-active' : ''}>
              <span className="sr-mod-tooltip__dot" style={{ background: s.color }} />
              <span className="sr-mod-tooltip__row-label">{s.label}</span>
              <span className="sr-mod-tooltip__row-val">{formatSliceValue(s.value, mod)}</span>
              <span className="sr-mod-tooltip__row-pct">{pct}%</span>
            </li>
          )
        })}
      </ul>
    </div>,
    document.body,
  )
}

function ModulePie({ mod, selectedSliceIds, onSelectSlice, onSliceHover, highlightId, tooltip, onShowTooltip, onHideTooltip }) {
  const selected = useMemo(() => new Set(selectedSliceIds), [selectedSliceIds])
  const visible = mod.slices.filter((s) => s.value > 0)
  const chartRef = useRef(null)
  const centerRef = useRef(null)

  const data = useMemo(() => visible.map((s) => ({
    name: s.id,
    value: s.value,
    itemStyle: {
      color: s.color,
      borderRadius: 6,
      borderWidth: selected.has(s.id) ? 3 : 0,
      borderColor: cssVar('--action'),
      opacity: highlightId && highlightId !== s.id ? 0.35 : 1,
    },
  })), [visible, selected, highlightId])

  const option = useMemo(() => ({
    series: [{
      type: 'pie',
      radius: ['54%', '80%'],
      center: ['50%', '50%'],
      startAngle: 90,
      padAngle: 2,
      label: { show: false },
      emphasis: { scale: true, scaleSize: 5, focus: 'self' },
      data,
    }],
    tooltip: { show: false },
    animationDuration: 280,
  }), [data])

  const placeTooltip = useCallback((el, mode, sliceId = null) => {
    if (!el) return
    const rect = el.getBoundingClientRect()
    const width = mode === 'center' ? 260 : 220
    onShowTooltip({
      mode,
      highlightId: sliceId,
      coords: {
        left: Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12),
        top: rect.top - 10,
      },
    })
  }, [onShowTooltip])

  const onEvents = useMemo(() => ({
    click: (p) => { if (onSelectSlice && p.name) onSelectSlice(p.name) },
    mouseover: (p) => {
      if (p.name) {
        onSliceHover?.(p.name)
        placeTooltip(chartRef.current, 'slice', p.name)
      }
    },
    mouseout: () => onHideTooltip?.(),
  }), [onSelectSlice, onSliceHover, placeTooltip, onHideTooltip])

  return (
    <div className="sr-mod__pie-wrap" ref={chartRef} onMouseLeave={onHideTooltip}>
      <ReactECharts
        option={option}
        style={{ height: PIE_SIZE, width: PIE_SIZE }}
        opts={{ renderer: 'svg' }}
        onEvents={onEvents}
        notMerge
        lazyUpdate
      />
      <button
        type="button"
        className="sr-mod__center-hit"
        ref={centerRef}
        aria-label={`${mod.centerLabel}: ${formatCenterValue(mod)}`}
        onMouseEnter={() => {
          onSliceHover?.(null)
          placeTooltip(centerRef.current, 'center')
        }}
        onFocus={() => placeTooltip(centerRef.current, 'center')}
        onMouseLeave={onHideTooltip}
      />
      <div className="sr-mod__center" aria-hidden="true">
        <div className="sr-mod__center-value">{formatCenterValue(mod)}</div>
        <div className="sr-mod__center-label">{mod.centerLabel || 'Total'}</div>
      </div>
      {tooltip && (
        <ModuleTooltip mod={mod} coords={tooltip.coords} highlightId={tooltip.highlightId} mode={tooltip.mode} />
      )}
    </div>
  )
}

function SliceListItem({ slice, mod, selected, showFullLabel, onSelect, onHover, onShowTooltip, listRef }) {
  return (
    <button
      type="button"
      className={`sr-mod__list-item${selected ? ' is-active' : ''}`}
      onClick={() => onSelect(slice.id)}
      onMouseEnter={(e) => {
        onHover(slice.id)
        const rect = e.currentTarget.getBoundingClientRect()
        onShowTooltip({
          mode: 'slice',
          highlightId: slice.id,
          coords: {
            left: Math.min(rect.right + 8, window.innerWidth - 232),
            top: rect.top + rect.height / 2,
          },
        })
      }}
      onFocus={() => onHover(slice.id)}
      title={slice.label}
    >
      <span className="sr-mod__list-dot" style={{ background: slice.color }} />
      <span className={`sr-mod__list-text${showFullLabel || selected ? ' is-full' : ''}`}>
        {sliceLegendLabel(slice, mod, showFullLabel, selected)}
      </span>
      <span className="sr-mod__list-n">{formatSliceValue(slice.value, mod)}</span>
    </button>
  )
}

function ModuleCard({ mod, selectedSliceIds, onSelectSlice }) {
  const selected = selectedSliceIds.filter((id) => id.startsWith(`${mod.id}:`)).map((id) => id.split(':')[1])
  const active = selected.length > 0
  const visible = mod.slices.filter((s) => s.value > 0)
  const showFullLabel = visible.length <= 3
  const [hoverId, setHoverId] = useState(null)
  const [tooltip, setTooltip] = useState(null)

  const showTooltip = useCallback((t) => setTooltip(t), [])
  const hideTooltip = useCallback(() => setTooltip(null), [])

  return (
    <article
      className={`sr-mod__card${active ? ' is-active' : ''}`}
      style={{ '--module-accent': mod.accent, '--module-soft': mod.soft }}
      onMouseLeave={() => { setHoverId(null); hideTooltip() }}
    >
      <header className="sr-mod__head">
        <span className="sr-mod__dot" />
        <span className="sr-mod__label">{mod.shortTitle || mod.label}</span>
        <span className="sr-mod__badge">{formatBadgeValue(mod)}</span>
      </header>
      <div className="sr-mod__body">
        <ModulePie
          mod={mod}
          selectedSliceIds={selected}
          onSelectSlice={(id) => onSelectSlice(mod.id, id)}
          onSliceHover={setHoverId}
          highlightId={hoverId}
          tooltip={tooltip}
          onShowTooltip={showTooltip}
          onHideTooltip={hideTooltip}
        />
        <div className="sr-mod__list">
          {visible.map((slice) => (
            <SliceListItem
              key={slice.id}
              slice={slice}
              mod={mod}
              selected={selected.includes(slice.id)}
              showFullLabel={showFullLabel}
              onSelect={(id) => onSelectSlice(mod.id, id)}
              onHover={setHoverId}
              onShowTooltip={showTooltip}
            />
          ))}
        </div>
      </div>
    </article>
  )
}

export default function ModuleBreakdown({ modules, selectedSliceIds = [], onSelectSlice }) {
  return (
    <div className="sr-modules-bar">
      <div className="sr-modules-grid">
        {modules.map((mod) => (
          <ModuleCard
            key={mod.id}
            mod={mod}
            selectedSliceIds={selectedSliceIds}
            onSelectSlice={onSelectSlice}
          />
        ))}
      </div>
    </div>
  )
}
