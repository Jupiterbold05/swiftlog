import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, GLOBAL_CSS } from '../lib/theme'
import Sidebar from '../components/Sidebar'
import ChatPanel from '../components/ChatPanel'
import { Btn, Chip, Inp, Lbl, Toast, Modal, PH, StatCard } from '../components/UI'

export default function AdminDash({ onLogout }) {
  const [tab, setTab] = useState('overview')
  const [chatTarget, setChatTarget] = useState(null)
  const [modal, setModal] = useState(null)
  const [selDel, setSelDel] = useState(null)
  const [riderName, setRiderName] = useState('')
  const [sanTarget, setSanTarget] = useState(null)
  const [sanAction, setSanAction] = useState(null)
  const [toast, setToast] = useState(null)

  const [users, setUsers] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [unread, setUnread] = useState(0)

  const t = (msg, type = 'success') => setToast({ msg, type })

  const fetchAll = async () => {
    const [{ data: profiles }, { data: dels }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'user'),
      supabase.from('deliveries').select('*').order('created_at', { ascending: false }),
    ])
    if (profiles) setUsers(profiles)
    if (dels) setDeliveries(dels)
  }

  const fetchUnread = async () => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .neq('from_id', 'admin')
    setUnread(count || 0)
  }

  useEffect(() => {
    fetchAll()
    fetchUnread()

    const chan = supabase
      .channel('admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchAll)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchUnread)
      .subscribe()
    return () => supabase.removeChannel(chan)
  }, [])

  const assignRider = async () => {
    if (!riderName.trim()) return t('Please enter the rider\'s name.', 'error')
    const { error } = await supabase
      .from('deliveries')
      .update({ rider_name: riderName.trim(), status: 'in-transit' })
      .eq('id', selDel.id)
    if (error) return t(error.message, 'error')
    t('Rider assigned. Delivery is now in transit.')
    setModal(null); setRiderName(''); setSelDel(null); fetchAll()
  }

  const setStatus = async (id, status) => {
    const { error } = await supabase.from('deliveries').update({ status }).eq('id', id)
    if (error) return t(error.message, 'error')
    t(`Delivery marked as ${status}.`); fetchAll()
  }

  const doSanction = async () => {
    let updates = {}
    if (sanAction === 'sanction') updates = { status: 'sanctioned', sanctioned: true }
    else if (sanAction === 'suspend') updates = { status: 'suspended' }
    else if (sanAction === 'reinstate') updates = { status: 'active', sanctioned: false }

    const { error } = await supabase.from('profiles').update(updates).eq('id', sanTarget)
    if (error) return t(error.message, 'error')

    const u = users.find(u => u.id === sanTarget)
    if (sanAction === 'sanction') t(`${u?.name} has been sanctioned.`)
    else if (sanAction === 'suspend') t(`${u?.name}'s account suspended.`)
    else t(`${u?.name}'s account reinstated.`)

    setModal(null); setSanTarget(null); setSanAction(null); fetchAll()
  }

  const confirmSanction = (id, action) => { setSanTarget(id); setSanAction(action); setModal('sanction') }

  const pending = deliveries.filter(d => d.status === 'pending')
  const sanTargetUser = users.find(u => u.id === sanTarget)

  const stats = [
    { icon: '👥', label: 'Total Users',        value: users.length,                                        color: T.accent },
    { icon: '📦', label: 'All Deliveries',     value: deliveries.length,                                   color: '#8B5CF6' },
    { icon: '⏳', label: 'Pending Assignment', value: pending.length,                                      color: '#F59E0B' },
    { icon: '🚚', label: 'In Transit',         value: deliveries.filter(d => d.status === 'in-transit').length, color: T.success },
  ]

  const nav = [
    { key: 'overview',   icon: '📊', label: 'Overview' },
    { key: 'deliveries', icon: '📦', label: 'Deliveries' },
    { key: 'users',      icon: '👥', label: 'Users' },
    { key: 'messages',   icon: '💬', label: 'Messages', badge: unread },
  ]

  const isMessages = tab === 'messages'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <style>{GLOBAL_CSS + `@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Sidebar
        items={nav}
        active={tab}
        onSelect={k => { setTab(k); setChatTarget(null) }}
        user={{ name: 'Admin', role: 'admin' }}
        onLogout={onLogout}
      />

      <main style={{
        flex: 1,
        overflowY: isMessages ? 'hidden' : 'auto',
        padding: isMessages ? 0 : '28px 32px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>

        {tab === 'overview' && (
          <div className="au">
            <PH title="Overview" sub="Platform summary and pending actions." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(148px,1fr))', gap: 14, marginBottom: 30 }}>
              {stats.map((s, i) => <StatCard key={s.label} {...s} delay={i * 55} />)}
            </div>
            <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>⏳ Pending Rider Assignment ({pending.length})</h3>
            {pending.length === 0 ? (
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 28, textAlign: 'center', color: T.sub }}>
                All deliveries have been assigned 🎉
              </div>
            ) : pending.map(d => {
              const u = users.find(u => u.id === d.user_id)
              return (
                <div key={d.id} style={{
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderLeft: '3px solid #F59E0B', borderRadius: T.radius,
                  padding: '15px 20px', marginBottom: 10,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {d.package_desc}
                      <span style={{
                        fontSize: 11, background: d.urgency === 'express' ? '#FFF7E6' : T.accentBg,
                        color: d.urgency === 'express' ? '#B86800' : T.accent,
                        fontWeight: 700, padding: '2px 8px', borderRadius: 99, marginLeft: 6,
                      }}>{d.urgency?.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
                      👤 {u?.name} · 📍 {d.pickup_addr} → {d.dropoff_addr}
                    </div>
                    <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>{d.created_at?.slice(0, 10)}</div>
                  </div>
                  <Btn sm onClick={() => { setSelDel(d); setModal('assign') }}>Assign Rider</Btn>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'deliveries' && (
          <div className="au">
            <PH title="All Deliveries" sub={`${deliveries.length} total deliveries on the platform`} />
            {deliveries.map(d => {
              const u = users.find(u => u.id === d.user_id)
              return (
                <div key={d.id} style={{
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderRadius: T.radius, padding: '16px 20px', marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{d.package_desc}</span>
                      <span style={{
                        background: d.urgency === 'express' ? '#FFF7E6' : T.accentBg,
                        color: d.urgency === 'express' ? '#B86800' : T.accent,
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      }}>{d.urgency?.toUpperCase()}</span>
                    </div>
                    <Chip s={d.status} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '6px 18px', fontSize: 13, color: T.sub, marginBottom: 12 }}>
                    <span>👤 <strong style={{ color: T.text }}>Customer:</strong> {u?.name || '—'}</span>
                    <span>📍 <strong style={{ color: T.text }}>Pickup:</strong> {d.pickup_addr}</span>
                    <span>🏁 <strong style={{ color: T.text }}>Dropoff:</strong> {d.dropoff_addr}</span>
                    <span>⚖️ <strong style={{ color: T.text }}>Weight:</strong> {d.weight}</span>
                    {d.rider_name && <span>🏍️ <strong style={{ color: T.text }}>Rider:</strong> {d.rider_name}</span>}
                    {d.notes && <span style={{ gridColumn: '1/-1' }}>📝 {d.notes}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!d.rider_name && d.status === 'pending' && <Btn sm onClick={() => { setSelDel(d); setModal('assign') }}>Assign Rider</Btn>}
                    {d.status === 'in-transit' && <Btn sm v="success" onClick={() => setStatus(d.id, 'delivered')}>✓ Mark Delivered</Btn>}
                    {!['cancelled', 'delivered'].includes(d.status) && <Btn sm v="danger" onClick={() => setStatus(d.id, 'cancelled')}>Cancel</Btn>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'users' && (
          <div className="au">
            <PH title="Users" sub={`${users.length} registered customers`} />
            {users.map(u => {
              const count = deliveries.filter(d => d.user_id === u.id).length
              const borderColor = u.sanctioned ? T.danger : u.status === 'suspended' ? '#F59E0B' : T.success
              return (
                <div key={u.id} style={{
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderLeft: `3px solid ${borderColor}`, borderRadius: T.radius,
                  padding: '16px 20px', marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: '50%',
                        background: u.sanctioned ? '#FECACA' : `linear-gradient(135deg,${T.accent},#60A5FA)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: u.sanctioned ? T.danger : '#fff', fontWeight: 700, fontSize: 17,
                      }}>{u.name?.[0] || '?'}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{u.name}</div>
                        <div style={{ fontSize: 13, color: T.sub }}>{u.email} · {u.phone}</div>
                      </div>
                    </div>
                    <Chip s={u.status} />
                  </div>
                  <p style={{ fontSize: 13, color: T.sub, marginBottom: 12 }}>
                    📦 {count} deliveries · Joined {u.joined || '—'}
                    {u.sanctioned && <span style={{ color: T.danger, fontWeight: 600, marginLeft: 12 }}>⚠️ Sanctioned for policy violation.</span>}
                    {u.status === 'suspended' && !u.sanctioned && <span style={{ color: T.warn, fontWeight: 600, marginLeft: 12 }}>⏸ Account suspended.</span>}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {u.status === 'active' && (<>
                      <Btn sm v="danger" onClick={() => confirmSanction(u.id, 'sanction')}>🚫 Sanction</Btn>
                      <Btn sm v="warn" onClick={() => confirmSanction(u.id, 'suspend')}>⏸ Suspend</Btn>
                    </>)}
                    {(u.sanctioned || u.status === 'suspended') && <Btn sm v="success" onClick={() => confirmSanction(u.id, 'reinstate')}>✅ Reinstate</Btn>}
                    <Btn sm v="subtle" onClick={() => { setTab('messages'); setChatTarget(u.id) }}>💬 Message</Btn>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'messages' && (
          <div style={{ flex: 1, display: 'flex', height: '100vh', minHeight: 0 }}>
            {/* User list panel */}
            <div style={{
              width: chatTarget ? 280 : '100%',
              maxWidth: chatTarget ? 280 : undefined,
              borderRight: chatTarget ? `1px solid ${T.border}` : 'none',
              display: 'flex',
              flexDirection: 'column',
              background: T.surface,
              overflowY: 'auto',
            }}>
              <div style={{ padding: '18px 20px 12px', borderBottom: `1px solid ${T.border}` }}>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, fontWeight: 700 }}>Messages</h2>
                <p style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Customer conversations</p>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '10px 10px' }}>
                {users.map(u => {
                  const isActive = chatTarget === u.id
                  return (
                    <button
                      key={u.id}
                      onClick={() => setChatTarget(u.id)}
                      style={{
                        width: '100%', background: isActive ? T.accentBg : 'transparent',
                        border: `1px solid ${isActive ? T.accent + '33' : 'transparent'}`,
                        borderRadius: 10, padding: '12px 14px', marginBottom: 4,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, textAlign: 'left',
                        transition: 'all .15s',
                      }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: `linear-gradient(135deg,${T.accent},#60A5FA)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
                      }}>{u.name?.[0] || '?'}</div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.email}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Chat area — half page */}
            {chatTarget && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {/* Top half: chat */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  maxHeight: '60vh',
                  borderBottom: `1px solid ${T.border}`,
                }}>
                  <ChatPanel
                    userId={chatTarget}
                    isAdmin={true}
                    targetUser={users.find(u => u.id === chatTarget)}
                    onBack={() => setChatTarget(null)}
                  />
                </div>

                {/* Bottom half: user delivery info */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '18px 22px',
                  background: T.bg,
                }}>
                  {(() => {
                    const u = users.find(u => u.id === chatTarget)
                    const uDels = deliveries.filter(d => d.user_id === chatTarget)
                    return (
                      <>
                        <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: T.text }}>
                          📦 {u?.name}'s Deliveries ({uDels.length})
                        </h3>
                        {uDels.length === 0
                          ? <p style={{ color: T.sub, fontSize: 13 }}>No deliveries yet.</p>
                          : uDels.map(d => (
                            <div key={d.id} style={{
                              background: T.surface, border: `1px solid ${T.border}`,
                              borderRadius: 10, padding: '11px 15px', marginBottom: 8,
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                            }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{d.package_desc}</div>
                                <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
                                  {d.pickup_addr?.slice(0, 25)}… → {d.dropoff_addr?.slice(0, 25)}
                                </div>
                              </div>
                              <Chip s={d.status} />
                            </div>
                          ))
                        }
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

            {!chatTarget && users.length === 0 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.sub }}>
                No users yet.
              </div>
            )}
          </div>
        )}
      </main>

      {/* ASSIGN RIDER MODAL */}
      {modal === 'assign' && selDel && (
        <Modal title="Assign a Rider" sub="Enter the offline rider's name to assign this delivery." onClose={() => { setModal(null); setRiderName('') }}>
          <div style={{ background: T.bg, borderRadius: 10, padding: '12px 15px', marginBottom: 18, fontSize: 13, color: T.sub }}>
            <strong style={{ color: T.text, display: 'block', marginBottom: 3 }}>{selDel.package_desc}</strong>
            {selDel.pickup_addr} → {selDel.dropoff_addr}
          </div>
          <Lbl t="Rider Name *"><Inp placeholder="e.g. Emmanuel Okonkwo" value={riderName} onChange={e => setRiderName(e.target.value)} /></Lbl>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Btn v="primary" onClick={assignRider} sx={{ flex: 1 }}>Confirm Assignment</Btn>
            <Btn v="ghost" onClick={() => { setModal(null); setRiderName('') }} sx={{ flex: 1 }}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* SANCTION CONFIRM MODAL */}
      {modal === 'sanction' && sanTargetUser && (
        <Modal
          title={`Confirm: ${sanAction === 'sanction' ? 'Sanction' : sanAction === 'suspend' ? 'Suspend' : 'Reinstate'} Account`}
          onClose={() => { setModal(null); setSanTarget(null); setSanAction(null) }}
        >
          <p style={{ fontSize: 14, color: T.sub, marginBottom: 20, lineHeight: 1.6 }}>
            {sanAction === 'sanction' && `You are about to sanction ${sanTargetUser.name}. They will be locked out and notified of a policy violation.`}
            {sanAction === 'suspend' && `You are about to temporarily suspend ${sanTargetUser.name}. Their account will be inactive until reinstated.`}
            {sanAction === 'reinstate' && `You are about to reinstate ${sanTargetUser.name}. They will regain full access to their account.`}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn v={sanAction === 'reinstate' ? 'success' : 'danger'} onClick={doSanction} sx={{ flex: 1 }}>
              {sanAction === 'sanction' ? 'Sanction Account' : sanAction === 'suspend' ? 'Suspend Account' : 'Reinstate Account'}
            </Btn>
            <Btn v="ghost" onClick={() => { setModal(null); setSanTarget(null); setSanAction(null) }} sx={{ flex: 1 }}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
