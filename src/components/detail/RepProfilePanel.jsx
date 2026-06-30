import React from 'react'
import { Icon } from '../primitives.jsx'
import { formatCurrency, formatPct } from '../charts.jsx'
import {
  HoverPopoverGrid, HoverPopoverHint, HoverPopoverTitle,
  RowHoverPopover, useRowHover,
} from '../RowHoverPopover.jsx'

function healthTone(score) {
  if (score >= 80) return 'strong'
  if (score >= 65) return 'good'
  if (score >= 50) return 'watch'
  return 'risk'
}

const TREND_COLORS = {
  up: { stroke: '#1F7A43', fill: 'rgba(31, 122, 67, 0.14)', bg: 'rgba(230, 246, 236, 0.65)' },
  down: { stroke: '#A32B22', fill: 'rgba(163, 43, 34, 0.12)', bg: 'rgba(250, 232, 230, 0.7)' },
  flat: { stroke: '#6B7685', fill: 'rgba(107, 118, 133, 0.1)', bg: 'rgba(244, 246, 248, 0.9)' },
}

function MiniSparkline({ data, trend }) {
  if (!data?.length) return null
  const w = 72
  const h = 30
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const coords = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w
    const y = h - 3 - ((v - min) / range) * (h - 6)
    return [x, y]
  })
  const line = coords.map((p) => p.join(',')).join(' ')
  const area = `${coords.map((p) => `${p[0]},${p[1]}`).join(' ')} ${w},${h} 0,${h}`
  const colors = TREND_COLORS[trend] || TREND_COLORS.flat
  return (
    <svg className="sr-momentum-spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      <polygon points={area} fill={colors.fill} />
      <polyline points={line} fill="none" stroke={colors.stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrendBadge({ trend, momentum }) {
  const icons = { up: 'trending-up', down: 'trending-down', flat: 'minus' }
  const cls = trend === 'up' ? 'sr-ai-badge--up' : trend === 'down' ? 'sr-ai-badge--down' : 'sr-ai-badge--flat'
  const sign = trend === 'down' ? '' : trend === 'up' ? '+' : ''
  return (
    <span className={`sr-ai-badge sr-ai-badge--compact ${cls}`}>
      <Icon name={icons[trend]} size={11} />
      {sign}{Math.abs(momentum).toFixed(1)}%
    </span>
  )
}

function MomentumCard({ customer, onSelect, cardHover, cardId }) {
  const clickable = customer.isSubRep && onSelect
  const colors = TREND_COLORS[customer.trend] || TREND_COLORS.flat
  const Tag = clickable ? 'button' : 'article'
  const hovered = cardHover.isHovered(cardId)
  return (
    <Tag
      type={clickable ? 'button' : undefined}
      className={`sr-momentum-card sr-momentum-card--${customer.trend}${clickable ? ' is-clickable' : ''}${hovered ? ' is-hovered' : ''}`}
      style={{ '--momentum-tint': colors.bg }}
      onClick={clickable ? () => onSelect(customer.id) : undefined}
      {...cardHover.bind(cardId, customer)}
    >
      <div className="sr-momentum-card__main">
        <div className="sr-momentum-card__copy">
          <div className="sr-momentum-card__top">
            <span className="sr-momentum-card__name" title={customer.name}>{customer.name}</span>
            <TrendBadge trend={customer.trend} momentum={customer.momentum} />
          </div>
          <span className="sr-momentum-card__meta">
            {formatCurrency(customer.gp)}
            <span className="sr-momentum-card__sep">·</span>
            {customer.share}% share
          </span>
        </div>
        <MiniSparkline data={customer.spark} trend={customer.trend} />
      </div>
    </Tag>
  )
}

function MomentumSection({ title, trend, customers, onSelectRep, cardHover, sectionKey }) {
  if (!customers.length) return null
  return (
    <section className={`sr-momentum-section sr-momentum-section--${trend} sr-momentum-section--cards`}>
      <header className="sr-momentum-section__head">
        <span className="sr-momentum-section__title">{title}</span>
        <span className="sr-momentum-section__count">{customers.length}</span>
      </header>
      <div className="sr-momentum-section__list">
        {customers.map((c) => {
          const cardId = `${sectionKey}-${c.id}-${c.isSubRep ? 'rep' : 'cust'}`
          return (
            <MomentumCard
              key={cardId}
              cardId={cardId}
              customer={c}
              onSelect={onSelectRep}
              cardHover={cardHover}
            />
          )
        })}
      </div>
    </section>
  )
}

export default function RepProfilePanel({ profile, summary, onSelectRep, onCollapse }) {
  const tone = healthTone(profile.healthScore)
  const cardHover = useRowHover()
  const hovered = cardHover.hover?.data

  return (
    <aside className="sr-insight-panel">
      <header className="sr-insight-panel__header sr-insight-panel__header--compact">
        <div className="sr-insight-panel__title-row">
          <span className="sr-insight-panel__eyebrow">
            <Icon name="sparkles" size={13} />
            AI Insight
          </span>
          <button
            type="button"
            className="sr-insight-panel__collapse"
            onClick={onCollapse}
            aria-label="Collapse AI Insight panel"
            title="Collapse panel"
          >
            <Icon name="panel-right-close" size={15} />
          </button>
        </div>

        <div className={`sr-insight-health sr-insight-health--${tone}`}>
          <div className="sr-insight-health__ring" aria-label={`Health score ${profile.healthScore}`}>
            <span className="sr-insight-health__score">{profile.healthScore}</span>
          </div>
          <div className="sr-insight-health__copy">
            <span className="sr-insight-health__label">Portfolio health</span>
            <p className="sr-insight-health__insight">{profile.insight}</p>
          </div>
        </div>

        <div className="sr-insight-metrics">
          <div className="sr-insight-metric">
            <span className="sr-insight-metric__label">12-mo GP</span>
            <strong className="sr-insight-metric__value">{formatCurrency(summary.gp12)}</strong>
          </div>
          <div className="sr-insight-metric">
            <span className="sr-insight-metric__label">3-mo GP</span>
            <strong className={`sr-insight-metric__value ${summary.gp3 >= 0 ? 'is-positive' : 'is-negative'}`}>
              {formatCurrency(summary.gp3)}
            </strong>
          </div>
          <div className="sr-insight-metric">
            <span className="sr-insight-metric__label">GP change</span>
            <strong className={`sr-insight-metric__value ${summary.gpChange >= 0 ? 'is-positive' : 'is-negative'}`}>
              {formatPct(summary.gpChange, true)}
            </strong>
          </div>
          <div className="sr-insight-metric">
            <span className="sr-insight-metric__label">Customers</span>
            <strong className="sr-insight-metric__value">{summary.customerCount}</strong>
          </div>
        </div>
      </header>

      <div className="sr-insight-panel__body sr-insight-panel__body--momentum">
        <MomentumSection title="Rising" trend="up" sectionKey="up" customers={profile.rising} onSelectRep={onSelectRep} cardHover={cardHover} />
        <MomentumSection title="Stable" trend="flat" sectionKey="flat" customers={profile.stable} onSelectRep={onSelectRep} cardHover={cardHover} />
        <MomentumSection title="Declining" trend="down" sectionKey="down" customers={profile.declining} onSelectRep={onSelectRep} cardHover={cardHover} />
      </div>

      <RowHoverPopover hover={cardHover.hover} width={260}>
        {hovered && (
          <>
            <HoverPopoverTitle sub={hovered.isSubRep ? `Direct report · ${hovered.country}` : `${hovered.industry} · ${hovered.country}`}>
              {hovered.name}
            </HoverPopoverTitle>
            <HoverPopoverGrid rows={[
              ['Momentum', formatPct(hovered.momentum, true)],
              ['Gross profit', formatCurrency(hovered.gp)],
              ['Portfolio share', `${hovered.share}%`],
              ['Orders', hovered.orders?.toLocaleString() ?? '—'],
              ['Health score', hovered.health],
            ]} />
            {hovered.isSubRep && <HoverPopoverHint>Click to open this rep&apos;s detail</HoverPopoverHint>}
          </>
        )}
      </RowHoverPopover>
    </aside>
  )
}
