import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { T, GLOBAL_CSS } from '../lib/theme'
import { Inp, Lbl, Btn, Toast } from '../components/UI'

export default function Auth({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [step, setStep] = useState(1)
  const [f, setF] = useState({})
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)

  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  const t = (msg, type = 'success') => setToast({ msg, type })

  const login = async () => {
    if (!f.email || !f.pass) return t('Please fill all fields.', 'error')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: f.email, password: f.pass,
    })
    setLoading(false)
    if (error) return t(error.message, 'error')

    // Fetch profile to get role
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    onLogin({ ...data.user, ...profile, name: profile?.name || data.user.email })
  }

  const signup = async () => {
    if (!f.name || !f.email || !f.pass || !f.phone) return t('Please fill all fields.', 'error')
    if (f.pass.length < 6) return t('Password must be at least 6 characters.', 'error')
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email: f.email,
      password: f.pass,
      options: { data: { name: f.name, phone: f.phone } },
    })
    setLoading(false)
    if (error) return t(error.message, 'error')

    // Create profile row
    await supabase.from('profiles').insert({
      id: data.user.id,
      name: f.name,
      phone: f.phone,
      role: 'user',
      status: 'active',
      sanctioned: false,
    })

    t('Account created! Check your email to confirm, then sign in.')
    setTimeout(() => { setTab('login'); setF({}) }, 1500)
  }

  const sendCode = async () => {
    if (!f.email) return t('Enter your email.', 'error')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(f.email, {
      redirectTo: `${window.location.origin}/?reset=true`,
    })
    setLoading(false)
    if (error) return t(error.message, 'error')
    t('Password reset link sent to your email!')
    setStep(2)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(150deg, ${T.navy} 0%, #0d2b4a 55%, #0a1628 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <style>{GLOBAL_CSS}</style>

      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeUp .45s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, background: T.accent, borderRadius: 15,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, marginBottom: 12, boxShadow: `0 10px 30px ${T.accent}55`,
          }}>🚚</div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", color: '#fff', fontSize: 28, letterSpacing: -.5 }}>
            SwiftLogistics
          </h1>
          <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, marginTop: 5 }}>
            Reliable delivery, tracked end-to-end
          </p>
        </div>

        <div style={{
          background: T.surface, borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,.32)', overflow: 'hidden',
        }}>
          {tab !== 'forgot' && (
            <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
              {[['login', 'Sign In'], ['signup', 'Create Account']].map(([k, l]) => (
                <button key={k} onClick={() => { setTab(k); setF({}) }} style={{
                  flex: 1, padding: '16px', background: 'none', border: 'none',
                  borderBottom: tab === k ? `2px solid ${T.accent}` : '2px solid transparent',
                  color: tab === k ? T.accent : T.sub,
                  fontWeight: tab === k ? 700 : 500, fontSize: 14, cursor: 'pointer',
                  transition: 'all .18s',
                }}>{l}</button>
              ))}
            </div>
          )}

          <div style={{ padding: '24px 26px 22px' }}>
            {tab === 'login' && (
              <>
                <Lbl t="Email"><Inp type="email" placeholder="you@example.com" value={f.email || ''} onChange={e => s('email', e.target.value)} /></Lbl>
                <Lbl t="Password"><Inp type="password" placeholder="••••••••" value={f.pass || ''} onChange={e => s('pass', e.target.value)} /></Lbl>
                <Btn v="primary" full onClick={login} sx={{ marginBottom: 12, opacity: loading ? .7 : 1 }} disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </Btn>
                <p style={{ textAlign: 'center', fontSize: 13, color: T.sub }}>
                  <button onClick={() => { setTab('forgot'); setF({}); setStep(1) }} style={{
                    background: 'none', border: 'none', color: T.accent, cursor: 'pointer', fontWeight: 600,
                  }}>Forgot password?</button>
                </p>
              </>
            )}

            {tab === 'signup' && (
              <>
                <Lbl t="Full Name"><Inp placeholder="John Doe" value={f.name || ''} onChange={e => s('name', e.target.value)} /></Lbl>
                <Lbl t="Email"><Inp type="email" placeholder="you@example.com" value={f.email || ''} onChange={e => s('email', e.target.value)} /></Lbl>
                <Lbl t="Phone Number"><Inp placeholder="08012345678" value={f.phone || ''} onChange={e => s('phone', e.target.value)} /></Lbl>
                <Lbl t="Password"><Inp type="password" placeholder="Min. 6 characters" value={f.pass || ''} onChange={e => s('pass', e.target.value)} /></Lbl>
                <Btn v="primary" full onClick={signup} disabled={loading} sx={{ opacity: loading ? .7 : 1 }}>
                  {loading ? 'Creating account…' : 'Create Account'}
                </Btn>
              </>
            )}

            {tab === 'forgot' && (
              <>
                <button onClick={() => { setTab('login'); setStep(1) }} style={{
                  background: 'none', border: 'none', color: T.accent, cursor: 'pointer',
                  fontWeight: 600, fontSize: 13, marginBottom: 18,
                }}>← Back to Sign In</button>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, color: T.text }}>
                  {step === 1 ? 'Reset Password' : 'Check Your Email'}
                </h3>
                {step === 1 && (
                  <>
                    <Lbl t="Email">
                      <Inp type="email" placeholder="you@example.com" value={f.email || ''} onChange={e => s('email', e.target.value)} />
                    </Lbl>
                    <Btn v="primary" full onClick={sendCode} disabled={loading}>
                      {loading ? 'Sending…' : 'Send Reset Link'}
                    </Btn>
                  </>
                )}
                {step === 2 && (
                  <div style={{ background: T.successBg, borderRadius: 10, padding: '14px 16px', color: T.success, fontSize: 14, lineHeight: 1.6 }}>
                    ✅ A password reset link has been sent to <strong>{f.email}</strong>. Click the link in your email to set a new password.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
