import React from 'react'
import { Icon } from '../primitives.jsx'
import { formatCurrency, formatPct } from '../charts.jsx'

function healthTone(score) {
  if (score >= 80) return 'strong'
  if (score >= 65) return 'good'
  if (score >= 50) return 'watch'
  return 'risk'
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

function MomentumRow({ customer, onSelect }) {
  const clickable = customer.isSubRep && onSelect
  return (
    <button
      type="button"
      className={`sr-momentum-row sr-momentum-row--${customer.trend}${clickable ? ' is-clickable' : ''}`}
      onClick={clickable ? () => onSelect(customer.id) : undefined}
      disabled={!clickable}
    >
      <span className={`sr-momentum-row__dot sr-momentum-row__dot--${customer.trend}`} />
      <span className="sr-momentum-row__body">
        <span className="sr-momentum-row__top">
          <span className="sr-momentum-row__name" title={customer.name}>{customer.name}</span>
          <TrendBadge trend={customer.trend} momentum={customer.momentum} />
        </span>
        <span className="sr-momentum-row__meta">
          {customer.isSubRep ? 'Direct report' : customer.industry}
          {' · '}
          {formatCurrency(customer.gp)}
          {' · '}
          {customer.share}% share
        </span>
      </span>
    </button>
  )
}

function MomentumSection({ title, trend, customers, onSelectRep }) {
  if (!customers.length) return null
  return (
    <section className={`sr-momentum-section sr-momentum-section--${trend} sr-momentum-section--compact`}>
      <header className="sr-momentum-section__head">
        <span className="sr-momentum-section__title">{title}</span>
        <span className="sr-momentum-section__count">{customers.length}</span>
      </header>
      <div className="sr-momentum-section__list">
        {customers.map((c) => (
          <MomentumRow key={`${c.id}-${c.isSubRep ? 'rep' : 'cust'}`} customer={c} onSelect={onSelectRep} />
        ))}
      </div>
    </section>
  )
}

export default function RepProfilePanel({ profile, summary, onSelectRep, onCollapse }) {
  const tone = healthTone(profile.healthScore)

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
        <MomentumSection title="Rising" trend="up" customers={profile.rising} onSelectRep={onSelectRep} />
        <MomentumSection title="Stable" trend="flat" customers={profile.stable} onSelectRep={onSelectRep} />
        <MomentumSection title="Declining" trend="down" customers={profile.declining} onSelectRep={onSelectRep} />
      </div>
    </aside>
  )
}
