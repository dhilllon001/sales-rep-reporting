import React from 'react'
import * as Lucide from 'lucide-react'

export function Icon({ name, size = 16, color, style = {}, strokeWidth = 1.75, className }) {
  const cmpName = String(name).split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  const Cmp = Lucide[cmpName] || Lucide.Circle
  return (
    <Cmp
      size={size}
      color={color || 'currentColor'}
      strokeWidth={strokeWidth}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    />
  )
}

export function Pill({ status, children, style = {} }) {
  return <span className={`pill st-${status}`} style={style}>{children}</span>
}

export function Button({ variant = 'primary', size = 'md', icon, iconRight, children, style = {}, ...rest }) {
  const sizes = { sm: { padding: '5px 10px', fontSize: 12 }, md: { padding: '7px 13px', fontSize: 13 }, lg: { padding: '10px 16px', fontSize: 14 } }
  const v = {
    primary: { background: 'var(--action)', color: 'var(--action-fg)', border: '1px solid transparent' },
    secondary: { background: 'var(--bg-surface-2)', color: 'var(--fg-1)', border: '1px solid var(--border-3)' },
    ghost: { background: 'transparent', color: 'var(--fg-2)', border: '1px solid transparent' },
    danger: { background: '#C8372D', color: '#fff', border: '1px solid transparent' },
  }[variant]
  return (
    <button
      {...rest}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'var(--font-body)', fontWeight: 600, borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'filter var(--dur-base) var(--ease-out), background var(--dur-base)', whiteSpace: 'nowrap', ...sizes[size], ...v, ...style }}
      onMouseDown={(e) => (e.currentTarget.style.filter = 'brightness(0.92)')}
      onMouseUp={(e) => (e.currentTarget.style.filter = 'none')}
      onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 13 : 15} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 13 : 15} />}
    </button>
  )
}

export function Input({ icon, style = {}, ...rest }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      {icon && <span style={{ position: 'absolute', left: 9, color: 'var(--fg-3)', pointerEvents: 'none', display: 'flex' }}><Icon name={icon} size={14} /></span>}
      <input {...rest} style={{ width: '100%', height: 32, padding: icon ? '0 10px 0 29px' : '0 10px', background: 'var(--bg-surface-1)', border: '1px solid var(--border-3)', borderRadius: 'var(--radius-md)', color: 'var(--fg-1)', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none', ...style }} />
    </div>
  )
}

export function Select({ value, onChange, options, style = {} }) {
  return (
    <select value={value} onChange={onChange} style={{ height: 32, padding: '0 26px 0 10px', background: 'var(--bg-surface-1)', border: '1px solid var(--border-3)', borderRadius: 'var(--radius-md)', color: 'var(--fg-1)', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7685' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', ...style }}>
      {options.map((o) => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function Panel({ title, sub, aside, children, style = {}, bodyStyle = {}, pad = false }) {
  return (
    <section style={{ background: 'var(--bg-surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
      {title && (
        <header style={{ minHeight: 44, padding: '9px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border-1)', flex: 'none' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.2 }}>{title}</div>
            {sub && <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 2 }}>{sub}</div>}
          </div>
          {aside && <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>{aside}</div>}
        </header>
      )}
      <div style={{ flex: 1, minHeight: 0, ...(pad ? { padding: 16 } : {}), ...bodyStyle }}>{children}</div>
    </section>
  )
}

export function Eyebrow({ children, style = {} }) {
  return <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-3)', ...style }}>{children}</div>
}

export function FlagTag({ tone = 'exception', children, title }) {
  const map = {
    exception: ['var(--st-exception-bg)', 'var(--st-exception-fg)'],
    late: ['var(--st-late-bg)', 'var(--st-late-fg)'],
    detention: ['var(--st-detention-bg)', 'var(--st-detention-fg)'],
    loading: ['var(--st-loading-bg)', 'var(--st-loading-fg)'],
    atborder: ['var(--st-atborder-bg)', 'var(--st-atborder-fg)'],
    dispatched: ['var(--st-dispatched-bg)', 'var(--st-dispatched-fg)'],
    cleared: ['var(--st-cleared-bg)', 'var(--st-cleared-fg)'],
    enroute: ['var(--st-enroute-bg)', 'var(--st-enroute-fg)'],
    neutral: ['var(--bg-surface-3)', 'var(--fg-2)'],
  }[tone] || ['var(--bg-surface-3)', 'var(--fg-2)']
  return <span title={title} style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 6px', borderRadius: 'var(--radius-sm)', background: map[0], color: map[1], fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{children}</span>
}
