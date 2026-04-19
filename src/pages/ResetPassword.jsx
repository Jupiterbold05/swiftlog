import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { T, GLOBAL_CSS } from '../lib/theme'
import { Inp, Lbl, Btn, Toast } from '../components/UI'

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const t = (msg, type = 'success') => setToast({ msg, type })

  const submit = async () => {
    if (!password || password.length < 6) return t('Password must be at least 6 characters.', 'error')
    if (password !== confirm) return t('Passwords do not match.', 'error')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return t(error.message, 'error')
    setDone(true)
    setTimeout(() => onDone(), 2000)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(150deg, ${T.navy} 0%, #0d2b4a 55%, #0a1628 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeUp .45s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, background: T.accent, borderRadius: 15,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, marginBottom: 12, boxShadow: `0 10px 30px ${T.accent}55`,
          }}>🚚</div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", color: '#fff', fontSize: 28, letterSpacing: -.5 }}>
            SwiftLogistics
          </h1>
        </div>

        <div style={{
          background: T.surface, borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,.32)', padding: '28px 26px',
        }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Password updated!</h3>
              <p style={{ color: T.sub, fontSize: 14 }}>Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: T.text }}>Set New Password</h3>
              <p style={{ color: T.sub, fontSize: 13, marginBottom: 22 }}>Enter your new password below.</p>
              <Lbl t="New Password">
                <Inp
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </Lbl>
              <Lbl t="Confirm Password">
                <Inp
                  type="password"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
              </Lbl>
              <Btn v="primary" full onClick={submit} disabled={loading} sx={{ marginTop: 4 }}>
                {loading ? 'Updating…' : 'Update Password'}
              </Btn>
            </>
          )}
        </div>
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
