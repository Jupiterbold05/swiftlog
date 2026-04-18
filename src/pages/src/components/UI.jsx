import { useEffect } from 'react'
import { T, SC } from '../lib/theme'

/* ─── INPUT STYLES ── */
const inp = {
  width: '100%', padding: '10px 13px',
  border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
  fontSize: 14, color: T.text, background: T.surface,
  outline: 'none', transition: 'border-color .15s',
}

export const Inp = (p) => (
  <input
    {...p}
    style={{ ...inp, ...(p.style || {}) }}
    onFocus={e => e.target.style.borderColor = T.accent}
    onBlur={e => e.target.style.borderColor = T.border}
  />
)

export const Sel = ({ children, ...p }) => (
  <select {...p} style={{ ...inp, cursor: 'pointer' }}>{children}</select>
)

export const TA = (p) => (
  <textarea {...p} rows={3} style={{ ...inp, resize: 'vertical' }} />
)

export const Lbl = ({ t, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{
      display: 'block', fontSize: 12, fontWeight: 600,
      color: T.sub, marginBottom: 5, textTransform: 'uppercase', letterSpacing: .6,
    }}>{t}</label>
    {children}
  </div>
)

/* ─── BUTTON ── */
const btnBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 6, fontWeight: 600, borderRadius: T.radiusSm,
  cursor: 'pointer', border: 'none', transition: 'opacity .15s, box-shadow .15s',
}
const BV = {
  primary: { background: T.accent,         color: '#fff' },
  danger:  { background: T.danger,         color: '#fff' },
  success: { background: T.success,        color: '#fff' },
  warn:    { background: '#F59E0B',         color: '#fff' },
  ghost:   { background: 'transparent',    color: T.sub, border: `1px solid ${T.border}` },
  subtle:  { background: T.bg,             color: T.text, border: `1px solid ${T.border}` },
}
export const Btn = ({ children, v = 'primary', full, sm, sx, ...p }) => (
  <button
    {...p}
    style={{
      ...btnBase, ...BV[v],
      fontSize: sm ? 12 : 14,
      padding: sm ? '6px 13px' : '10px 20px',
      width: full ? '100%' : undefined,
      ...(sx || {}),
    }}
  >{children}</button>
)

/* ─── CHIP ── */
export const Chip = ({ s }) => {
  const c = SC[s] || { bg: '#F3F4F6', color: T.sub, dot: T.sub, label: s }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c.bg, color: c.color, border: `1px solid ${c.color}22`,
      borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600, letterSpacing: .3,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  )
}

/* ─── TOAST ── */
export const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3800); return () => clearTimeout(t) }, [onClose])
  const c = type === 'error'
    ? { bg: T.dangerBg, color: T.danger }
    : { bg: T.successBg, color: T.success }
  return (
    <div style={{
      position: 'fixed', bottom: 22, right: 22, zIndex: 9999,
      background: c.bg, color: c.color, border: `1px solid ${c.color}33`,
      borderRadius: 12, padding: '12px 18px', fontWeight: 600, fontSize: 14,
      boxShadow: '0 8px 28px rgba(0,0,0,.1)', maxWidth: 340, animation: 'fadeUp .25s ease',
    }}>{msg}</div>
  )
}

/* ─── MODAL ── */
export const Modal = ({ title, sub, onClose, children }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(8,16,32,.48)',
    zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, animation: 'fadeIn .2s',
  }}>
    <div style={{
      background: T.surface, borderRadius: 18, width: '100%', maxWidth: 480,
      maxHeight: '92vh', overflowY: 'auto',
      boxShadow: '0 24px 72px rgba(0,0,0,.22)', animation: 'fadeUp .28s ease',
    }}>
      <div style={{
        padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{title}</h3>
          {sub && <p style={{ fontSize: 13, color: T.sub, marginTop: 3 }}>{sub}</p>}
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', fontSize: 20,
          cursor: 'pointer', color: T.faint, lineHeight: 1, padding: '2px 4px',
        }}>✕</button>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  </div>
)

/* ─── PAGE HEADER ── */
export const PH = ({ title, sub, action }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26,
  }}>
    <div>
      <h1 style={{
        fontSize: 22, fontWeight: 700, color: T.text,
        fontFamily: "'DM Serif Display', serif", letterSpacing: -.3,
      }}>{title}</h1>
      {sub && <p style={{ color: T.sub, marginTop: 4, fontSize: 14 }}>{sub}</p>}
    </div>
    {action}
  </div>
)

/* ─── STAT CARD ── */
export const StatCard = ({ icon, label, value, color, delay = 0 }) => (
  <div className="au" style={{
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: T.radius, padding: 20, animationDelay: `${delay}ms`,
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: 10, background: `${color}15`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 19, marginBottom: 13,
    }}>{icon}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color: T.text, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 13, color: T.sub, marginTop: 4, fontWeight: 500 }}>{label}</div>
  </div>
)

/* ─── SPINNER ── */
export const Spinner = ({ size = 36, color = T.accent }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    border: `3px solid ${color}22`, borderTopColor: color,
    animation: 'spin .7s linear infinite',
  }} />
)
