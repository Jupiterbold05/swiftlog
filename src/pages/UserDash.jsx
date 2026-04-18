import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, GLOBAL_CSS } from '../lib/theme'
import Sidebar from '../components/Sidebar'
import ChatPanel from '../components/ChatPanel'
import { Btn, Chip, Inp, Lbl, Sel, TA, Toast, PH, StatCard } from '../components/UI'

const DeliveryCard = ({ d, expanded }) => {
  const urg = d.urgency === 'express'
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.radius, padding: '16px 20px', marginBottom: 10,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: expanded ? 10 : 0, flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{d.package_desc}</span>
          <span style={{
            background: urg ? '#FFF7E6' : T.accentBg,
            color: urg ? '#B86800' : T.accent,
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
          }}>{d.urgency?.toUpperCase()}</span>
        </div>
        <Chip s={d.status} />
      </div>
      {!expanded && (
        <p style={{ fontSize: 13, color: T.sub, marginTop: 6 }}>
          {d.pickup_addr} → {d.dropoff_addr} · {d.created_at?.slice(0, 10)}
        </p>
      )}
      {expanded && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
          gap: '7px 20px', fontSize: 13, color: T.sub, marginTop: 10,
        }}>
          <span>📍 <strong style={{ color: T.text }}>Pickup:</strong> {d.pickup_addr}</span>
          <span>🏁 <strong style={{ color: T.text }}>Dropoff:</strong> {d.dropoff_addr}</span>
          <span>⚖️ <strong style={{ color: T.text }}>Weight:</strong> {d.weight}</span>
          <span>📅 <strong style={{ color: T.text }}>Date:</strong> {d.created_at?.slice(0, 10)}</span>
          {d.notes && <span style={{ gridColumn: '1/-1' }}>📝 <strong style={{ color: T.text }}>Notes:</strong> {d.notes}</span>}
          {d.rider_name
            ? <div style={{ gridColumn: '1/-1', background: T.accentBg, padding: '8px 13px', borderRadius: 9, color: T.accent, fontWeight: 600, fontSize: 13 }}>
              🏍️ Assigned Rider: {d.rider_name}
            </div>
            : d.status === 'pending' && <div style={{ gridColumn: '1/-1', background: T.warnBg, padding: '8px 13px', borderRadius: 9, color: T.warn, fontWeight: 600, fontSize: 13 }}>
              ⏳ Awaiting rider assignment from admin
            </div>
          }
        </div>
      )}
    </div>
  )
}

export default function UserDash({ user, onLogout }) {
  const [tab, setTab] = useState('home')
  const [deliveries, setDeliveries] = useState([])
  const [f, setF] = useState({})
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  const t = (msg, type = 'success') => setToast({ msg, type })

  const fetchDeliveries = async () => {
    const { data } = await supabase
      .from('deliveries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setDeliveries(data)
  }

  const fetchUnread = async () => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('from_id', 'admin')
      .eq('to_id', user.id)
    setUnreadCount(count || 0)
  }

  useEffect(() => {
    fetchDeliveries()
    fetchUnread()

    // Real-time delivery updates
    const chan = supabase
      .channel('user-deliveries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `user_id=eq.${user.id}` },
        () => fetchDeliveries()
      )
      .subscribe()
    return () => supabase.removeChannel(chan)
  }, [user.id])

  const submit = async () => {
    const { pkg, pickup, dropoff, weight, urgency } = f
    if (!pkg || !pickup || !dropoff || !weight || !urgency) return t('Please fill all required fields.', 'error')
    setLoading(true)
    const { error } = await supabase.from('deliveries').insert({
      user_id: user.id,
      package_desc: pkg,
      pickup_addr: pickup,
      dropoff_addr: dropoff,
      weight, urgency,
      notes: f.notes || '',
      status: 'pending',
      rider_name: null,
    })
    setLoading(false)
    if (error) return t(error.message, 'error')
    t('Request submitted! Admin will assign a rider shortly.')
    setF({})
    setTab('orders')
    fetchDeliveries()
  }

  const stats = [
    { icon: '📦', label: 'Total Orders', value: deliveries.length, color: T.accent },
    { icon: '🚚', label: 'In Transit', value: deliveries.filter(d => d.status === 'in-transit').length, color: '#F59E0B' },
    { icon: '✅', label: 'Delivered', value: deliveries.filter(d => d.status === 'delivered').length, color: T.success },
    { icon: '⏳', label: 'Pending', value: deliveries.filter(d => d.status === 'pending').length, color: '#8B5CF6' },
  ]

  const nav = [
    { key: 'home', icon: '🏠', label: 'Dashboard' },
    { key: 'orders', icon: '📦', label: 'My Deliveries' },
    { key: 'request', icon: '➕', label: 'New Request' },
    { key: 'chat', icon: '💬', label: 'Support Chat', badge: unreadCount },
    { key: 'profile', icon: '👤', label: 'Profile' },
  ]

  const isChat = tab === 'chat'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <style>{GLOBAL_CSS + `@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Sidebar items={nav} active={tab} onSelect={setTab} user={user} onLogout={onLogout} />

      <main style={{
        flex: 1,
        overflow: isChat ? 'hidden' : 'auto',
        padding: isChat ? 0 : '28px 32px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        // on mobile, leave room for hamburger
        paddingTop: isChat ? 0 : undefined,
      }}>

        {/* Mobile top bar when not chat */}
        {!isChat && (
          <div style={{ height: 0 }} /> // placeholder, hamburger is fixed
        )}

        {tab === 'home' && (
          <div className="au">
            <PH
              title={`Good day, ${user.name?.split(' ')[0] || 'there'} 👋`}
              sub="Here's an overview of your shipments."
              action={<Btn onClick={() => setTab('request')}>+ New Request</Btn>}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(148px,1fr))', gap: 14, marginBottom: 28 }}>
              {stats.map((s, i) => <StatCard key={s.label} {...s} delay={i * 55} />)}
            </div>
            <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15, color: T.text }}>Recent Deliveries</h3>
            {deliveries.length === 0 ? (
              <div style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: T.radius, padding: 36, textAlign: 'center', color: T.sub,
              }}>
                <div style={{ fontSize: 34, marginBottom: 10 }}>📭</div>
                <p style={{ fontWeight: 600, color: T.text }}>No deliveries yet</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Make a request to get started.</p>
                <Btn onClick={() => setTab('request')} sx={{ marginTop: 16 }}>Make a Request</Btn>
              </div>
            ) : deliveries.slice(0, 3).map(d => <DeliveryCard key={d.id} d={d} />)}
          </div>
        )}

        {tab === 'orders' && (
          <div className="au">
            <PH
              title="My Deliveries"
              sub={`${deliveries.length} total order${deliveries.length !== 1 ? 's' : ''}`}
              action={<Btn onClick={() => setTab('request')}>+ New Request</Btn>}
            />
            {deliveries.length === 0
              ? <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 32, textAlign: 'center', color: T.sub }}>No deliveries yet.</div>
              : deliveries.map(d => <DeliveryCard key={d.id} d={d} expanded />)
            }
          </div>
        )}

        {tab === 'request' && (
          <div className="au" style={{ maxWidth: 540 }}>
            <PH title="New Delivery Request" sub="Fill in the details below and we'll handle the rest." />
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 26 }}>
              <Lbl t="Package Description *"><Inp placeholder="e.g. Electronics, Documents, Clothing" value={f.pkg || ''} onChange={e => s('pkg', e.target.value)} /></Lbl>
              <Lbl t="Pickup Address *"><Inp placeholder="Full address where we pick up" value={f.pickup || ''} onChange={e => s('pickup', e.target.value)} /></Lbl>
              <Lbl t="Delivery Address *"><Inp placeholder="Full destination address" value={f.dropoff || ''} onChange={e => s('dropoff', e.target.value)} /></Lbl>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Lbl t="Weight / Size *"><Inp placeholder="e.g. 2kg" value={f.weight || ''} onChange={e => s('weight', e.target.value)} /></Lbl>
                <Lbl t="Urgency *">
                  <Sel value={f.urgency || ''} onChange={e => s('urgency', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="standard">Standard (2–3 days)</option>
                    <option value="express">Express (Same day)</option>
                  </Sel>
                </Lbl>
              </div>
              <Lbl t="Special Notes (optional)">
                <TA placeholder="Fragile, keep upright, call on arrival…" value={f.notes || ''} onChange={e => s('notes', e.target.value)} />
              </Lbl>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <Btn v="primary" onClick={submit} sx={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Submitting…' : 'Submit Request'}
                </Btn>
                <Btn v="ghost" onClick={() => setF({})} sx={{ flex: 1 }}>Clear</Btn>
              </div>
            </div>
          </div>
        )}

        {tab === 'chat' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            minHeight: 0,
          }}>
            {/* Chat header outside panel */}
            <div style={{
              padding: '18px 24px 14px',
              borderBottom: `1px solid ${T.border}`,
              background: T.surface,
              flexShrink: 0,
            }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, fontWeight: 700, color: T.text }}>
                Support Chat
              </h2>
              <p style={{ color: T.sub, fontSize: 13, marginTop: 3 }}>
                Our team typically responds within minutes.
              </p>
            </div>

            {/* Half-page chat panel */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              maxHeight: '60vh',
              borderBottom: `1px solid ${T.border}`,
            }}>
              <ChatPanel userId={user.id} isAdmin={false} />
            </div>

            {/* Bottom half: info / FAQ */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '22px 24px',
              background: T.bg,
            }}>
              <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: T.text }}>
                Frequently Asked Questions
              </h3>
              {[
                ['How long does delivery take?', 'Standard deliveries take 2–3 business days. Express deliveries are same-day if placed before 12pm.'],
                ['Can I change my delivery address?', 'Contact support before a rider is assigned. Once in-transit, address changes are not guaranteed.'],
                ['What if my package is damaged?', 'Take photos immediately and send them here in chat. Our team will investigate and respond within 24 hours.'],
                ['How do I track my delivery?', 'Go to My Deliveries and check the status. Once a rider is assigned, their name will appear on your order.'],
              ].map(([q, a]) => (
                <div key={q} style={{
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderRadius: T.radius, padding: '14px 18px', marginBottom: 10,
                }}>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{q}</p>
                  <p style={{ fontSize: 13, color: T.sub, lineHeight: 1.6 }}>{a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'profile' && (
          <div className="au" style={{ maxWidth: 460 }}>
            <PH title="My Profile" />
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 26 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${T.border}`,
              }}>
                <div style={{
                  width: 58, height: 58, borderRadius: '50%',
                  background: `linear-gradient(135deg,${T.accent},#60A5FA)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 24, fontWeight: 700,
                }}>{user.name?.[0] || '?'}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{user.name}</div>
                  <div style={{ color: T.sub, fontSize: 13 }}>Customer Account</div>
                </div>
              </div>
              {[
                ['Full Name', user.name],
                ['Email', user.email],
                ['Phone', user.phone || '—'],
                ['Member Since', user.joined || user.created_at?.slice(0, 10) || '—'],
                ['Status', user.sanctioned ? 'Sanctioned' : 'Active'],
              ].map(([l, v]) => (
                <div key={l} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '11px 0', borderBottom: `1px solid ${T.border}`, fontSize: 14,
                }}>
                  <span style={{ color: T.sub, fontWeight: 500 }}>{l}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
