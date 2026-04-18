import { useState, useEffect } from 'react'
import { T } from '../lib/theme'

export default function Sidebar({ items, active, onSelect, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const check = () => {
      const isMobile = window.innerWidth < 768
      setMobile(isMobile)
      if (isMobile) setCollapsed(false)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const w = collapsed ? 64 : 224
  const isOpen = mobile ? mobileOpen : true

  const handleSelect = (key) => {
    onSelect(key)
    if (mobile) setMobileOpen(false)
  }

  return (
    <>
      {/* Mobile hamburger */}
      {mobile && (
        <button
          onClick={() => setMobileOpen(o => !o)}
          style={{
            position: 'fixed', top: 14, left: 14, zIndex: 1100,
            width: 40, height: 40, borderRadius: 10,
            background: T.navy, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 18, boxShadow: '0 4px 14px rgba(0,0,0,.3)',
          }}
        >☰</button>
      )}

      {/* Mobile overlay */}
      {mobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
            zIndex: 1050, animation: 'fadeIn .2s',
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: w,
        minHeight: '100vh',
        background: T.navy,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: mobile ? 'fixed' : 'sticky',
        top: 0,
        left: mobile ? (mobileOpen ? 0 : -240) : 0,
        height: '100vh',
        zIndex: mobile ? 1100 : 10,
        transition: 'width .22s ease, left .25s ease',
        overflow: 'hidden',
      }}>
        {/* Logo + collapse toggle */}
        <div style={{
          padding: collapsed ? '22px 14px 16px' : '22px 18px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          minHeight: 72,
          flexShrink: 0,
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 32, height: 32, background: T.accent, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                flexShrink: 0,
              }}>🚚</div>
              <div>
                <span style={{ fontFamily: "'DM Serif Display', serif", color: '#fff', fontSize: 17, letterSpacing: -.3 }}>Swift</span>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>Logistics</div>
              </div>
            </div>
          )}

          {collapsed && (
            <div style={{
              width: 32, height: 32, background: T.accent, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            }}>🚚</div>
          )}

          {!mobile && (
            <button
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 6, color: 'rgba(255,255,255,.5)', cursor: 'pointer',
                width: 24, height: 24, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, flexShrink: 0,
                transition: 'background .15s',
              }}
            >
              {collapsed ? '›' : '‹'}
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {items.map(({ key, icon, label, badge }) => {
            const on = active === key
            return (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                title={collapsed ? label : undefined}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: collapsed ? 0 : 10,
                  padding: collapsed ? '11px 0' : '10px 11px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  background: on ? 'rgba(10,110,255,.18)' : 'transparent',
                  color: on ? '#fff' : 'rgba(255,255,255,.45)',
                  fontWeight: on ? 600 : 400,
                  fontSize: 14,
                  textAlign: 'left',
                  marginBottom: 2,
                  transition: 'all .15s',
                  position: 'relative',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                {!collapsed && (
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                )}
                {!collapsed && badge > 0 && (
                  <span style={{
                    background: T.danger, color: '#fff', fontSize: 10, fontWeight: 700,
                    borderRadius: 99, minWidth: 17, height: 17,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                  }}>{badge}</span>
                )}
                {collapsed && badge > 0 && (
                  <span style={{
                    position: 'absolute', top: 6, right: 8,
                    width: 8, height: 8, borderRadius: '50%', background: T.danger,
                  }} />
                )}
              </button>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{
          padding: collapsed ? '12px 8px' : '12px 12px',
          borderTop: '1px solid rgba(255,255,255,.07)',
          flexShrink: 0,
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', background: T.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
              }}>{user.name[0]}</div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ color: 'rgba(255,255,255,.35)', fontSize: 11 }}>
                  {user.role === 'admin' ? 'Administrator' : 'Customer'}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            title="Sign out"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,.06)',
              border: '1px solid rgba(255,255,255,.09)',
              color: 'rgba(255,255,255,.5)',
              borderRadius: 8,
              padding: collapsed ? '8px 0' : '8px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>⎋</span>
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Spacer for mobile so content doesn't hide under fixed sidebar */}
      {mobile && <div style={{ width: 0, flexShrink: 0 }} />}
    </>
  )
}
