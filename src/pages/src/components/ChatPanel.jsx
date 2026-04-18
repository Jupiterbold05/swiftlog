import { useState, useEffect, useRef } from 'react'
import { T } from '../lib/theme'
import { supabase } from '../lib/supabase'

export default function ChatPanel({ userId, isAdmin, onBack, targetUser }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const bottom = useRef(null)

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`from_id.eq.${userId},to_id.eq.${userId}`)
      .order('created_at', { ascending: true })

    if (!error && data) {
      const filtered = data.filter(m =>
        (m.from_id === userId && m.to_id === 'admin') ||
        (m.from_id === 'admin' && m.to_id === userId)
      )
      setMessages(filtered)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel(`chat-${userId}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new
        const inThread =
          (msg.from_id === userId && msg.to_id === 'admin') ||
          (msg.from_id === 'admin' && msg.to_id === userId)
        if (inThread) {
          setMessages(prev => {
            const withoutTemp = prev.filter(m => !String(m.id).startsWith('tmp-'))
            if (withoutTemp.find(m => m.id === msg.id)) return withoutTemp
            return [...withoutTemp, msg]
          })
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId])

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
    const tempId = `tmp-${Date.now()}`
    setMessages(prev => [...prev, { ...msg, id: tempId }])
    const { error } = await supabase.from('messages').insert(msg)
    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      console.error('Send error:', error.message)
    }
  }

  const isMine = (msg) => isAdmin ? msg.from_id === 'admin' : msg.from_id === userId

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#fff' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #E4E8F0',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        {isAdmin && onBack && (
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#0A6EFF', fontWeight: 600, fontSize: 13, flexShrink: 0,
          }}>← Back</button>
        )}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: '#EBF3FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, color: '#0A6EFF', fontSize: 14, flexShrink: 0,
        }}>
          {isAdmin ? (targetUser?.name?.[0] || '?') : 'S'}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isAdmin ? targetUser?.name : 'Support Team'}
          </div>
          <div style={{ fontSize: 11, color: '#0C8A5F', fontWeight: 500 }}>● Online</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px 6px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7585', fontSize: 13 }}>
            Loading messages…
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6B7585', gap: 8, textAlign: 'center', padding: 32 }}>
            <span style={{ fontSize: 28 }}>💬</span>
            <p style={{ fontWeight: 600, color: '#16191F', fontSize: 14 }}>No messages yet</p>
            <p style={{ fontSize: 13 }}>{isAdmin ? 'Start the conversation.' : "Send us a message and we'll get back to you."}</p>
          </div>
        )}
        {!loading && messages.map((m, i) => {
          const mine = isMine(m)
          const isTemp = String(m.id).startsWith('tmp-')
          return (
            <div key={m.id || i} style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 6 }}>
              {!mine && (
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E4E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#6B7585', flexShrink: 0 }}>
                  {isAdmin ? (targetUser?.name?.[0] || '?') : 'A'}
                </div>
              )}
              <div style={{
                maxWidth: '75%', background: mine ? '#0A6EFF' : '#F4F6FB',
                color: mine ? '#fff' : '#16191F',
                borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                padding: '8px 12px', fontSize: 14, lineHeight: 1.5, opacity: isTemp ? 0.7 : 1,
              }}>
                {m.text}
                <div style={{ fontSize: 10, opacity: .55, marginTop: 2, textAlign: mine ? 'right' : 'left' }}>
                  {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>

      {/* Input */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #E4E8F0', display: 'flex', gap: 8, background: '#fff', flexShrink: 0, alignItems: 'center' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Type a message…"
          style={{ flex: 1, padding: '9px 14px', border: '1px solid #E4E8F0', borderRadius: 99, fontSize: 14, outline: 'none', background: '#F4F6FB', minWidth: 0 }}
        />
        <button onClick={send} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: text.trim() ? '#0A6EFF' : '#E4E8F0',
          border: 'none', cursor: text.trim() ? 'pointer' : 'default',
          color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background .15s', flexShrink: 0,
        }}>➤</button>
      </div>
    </div>
  )
}
