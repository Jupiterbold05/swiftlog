import { useState, useEffect, useRef } from 'react'
import { T } from '../lib/theme'
import { supabase } from '../lib/supabase'

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export default function ChatPanel({ userId, isAdmin, onBack, targetUser }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const bottom = useRef(null)

  // The chat thread key: always (user_id, admin) pair
  // from_id = sender's user id, to_id = recipient's user id
  // For admin: userId is the customer they're chatting with
  // For user: userId is themselves

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        isAdmin
          ? `and(from_id.eq.${userId},to_id.eq.admin),and(from_id.eq.admin,to_id.eq.${userId})`
          : `and(from_id.eq.${userId},to_id.eq.admin),and(from_id.eq.admin,to_id.eq.${userId})`
      )
      .order('created_at', { ascending: true })

    if (!error && data) setMessages(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchMessages()

    // Real-time subscription
    const channel = supabase
      .channel(`chat-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new
          const relevant = isAdmin
            ? (msg.from_id === userId || msg.to_id === userId)
            : (msg.from_id === userId || msg.to_id === userId)
          if (relevant) {
            setMessages(prev => {
              if (prev.find(m => m.id === msg.id)) return prev
              return [...prev, msg]
            })
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId, isAdmin])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async () => {
    const tr = text.trim()
    if (!tr) return
    setText('')

    const msg = {
      from_id: isAdmin ? 'admin' : userId,
      to_id: isAdmin ? userId : 'admin',
      text: tr,
      created_at: new Date().toISOString(),
    }

    // Optimistic update
    const tempId = `tmp-${Date.now()}`
    setMessages(prev => [...prev, { ...msg, id: tempId }])

    const { error } = await supabase.from('messages').insert(msg)
    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      console.error('Send error:', error)
    }
  }

  const isMine = (msg) => isAdmin ? msg.from_id === 'admin' : msg.from_id === userId

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      background: T.surface,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: T.surface,
        flexShrink: 0,
      }}>
        {isAdmin && onBack && (
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.accent, fontWeight: 600, fontSize: 13, flexShrink: 0,
          }}>← Back</button>
        )}
        <div style={{
          width: 34, height: 34, borderRadius: '50%', background: T.accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, color: T.accent, fontSize: 15, flexShrink: 0,
        }}>
          {isAdmin ? (targetUser?.name?.[0] || '?') : 'S'}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {isAdmin ? targetUser?.name : 'Support Team'}
          </div>
          <div style={{ fontSize: 12, color: T.success, fontWeight: 500 }}>● Online</div>
        </div>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 16px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 0,
      }}>
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.sub }}>
            Loading…
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: T.sub, gap: 8, textAlign: 'center', padding: 40,
          }}>
            <span style={{ fontSize: 32 }}>💬</span>
            <p style={{ fontWeight: 600, color: T.text }}>No messages yet</p>
            <p style={{ fontSize: 13 }}>
              {isAdmin ? 'Start the conversation.' : 'Send us a message and we\'ll get back to you.'}
            </p>
          </div>
        )}
        {!loading && messages.map((m, i) => {
          const mine = isMine(m)
          return (
            <div key={m.id || i} style={{
              display: 'flex',
              flexDirection: mine ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              gap: 7,
            }}>
              {!mine && (
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', background: T.border,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: T.sub, flexShrink: 0,
                }}>
                  {isAdmin ? (targetUser?.name?.[0] || '?') : 'A'}
                </div>
              )}
              <div style={{
                maxWidth: '72%',
                background: mine ? T.accent : T.bg,
                color: mine ? '#fff' : T.text,
                borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '9px 13px',
                fontSize: 14,
                lineHeight: 1.5,
              }}>
                {m.text}
                <div style={{ fontSize: 11, opacity: .55, marginTop: 3, textAlign: mine ? 'right' : 'left' }}>
                  {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 14px',
        borderTop: `1px solid ${T.border}`,
        display: 'flex',
        gap: 9,
        background: T.surface,
        flexShrink: 0,
      }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Type a message…"
          style={{
            flex: 1, padding: '9px 14px', border: `1px solid ${T.border}`,
            borderRadius: 99, fontSize: 14, outline: 'none', background: T.bg,
          }}
        />
        <button
          onClick={send}
          style={{
            width: 38, height: 38, borderRadius: '50%',
            background: text.trim() ? T.accent : T.border,
            border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            color: '#fff', fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background .15s', flexShrink: 0,
          }}
        >➤</button>
      </div>
    </div>
  )
}
