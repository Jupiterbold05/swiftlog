import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import UserDash from './pages/UserDash'
import AdminDash from './pages/AdminDash'
import ResetPassword from './pages/ResetPassword'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isReset, setIsReset] = useState(false)

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return data
  }

  useEffect(() => {
    // Detect password reset flow from URL hash
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setIsReset(true)
      setLoading(false)
      return
    }

    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const p = await loadProfile(session.user.id)
        setSession(session)
        setProfile(p)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReset(true)
        setLoading(false)
        return
      }
      if (session) {
        const p = await loadProfile(session.user.id)
        setSession(session)
        setProfile(p)
      } else {
        setSession(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0C1623', flexDirection: 'column', gap: 14,
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { T, GLOBAL_CSS } from '../lib/theme'
import { Inp, Lbl, Btn, Toast } from '../components/UI'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
)

const Divider = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
    <div style={{ flex: 1, height: 1, background: T.border }} />
    <span style={{ fontSize: 12, color: T.faint, fontWeight: 500 }}>or</span>
    <div style={{ flex: 1, height: 1, background: T.border }} />
  </div>
)

const GoogleBtn = ({ onClick, loading }) => (
  <button
    onClick={onClick}
    disabled={loading}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: '11px 16px',
      background: '#fff',
      border: `1.5px solid ${T.border}`,
      borderRadius: T.radiusSm,
      cursor: loading ? 'not-allowed' : 'pointer',
      fontSize: 14,
      fontWeight: 600,
      color: T.text,
      transition: 'box-shadow .15s, border-color .15s',
      opacity: loading ? .7 : 1,
      fontFamily: 'inherit',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = '#4285F4'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(66,133,244,.15)' }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none' }}
  >
    <GoogleIcon />
    {loading ? 'Redirecting…' : 'Continue with Google'}
  </button>
)

export default function Auth({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [step, setStep] = useState(1)
  const [f, setF] = useState({})
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  const t = (msg, type = 'success') => setToast({ msg, type })

  const signInWithGoogle = async () => {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      setGoogleLoading(false)
      t(error.message, 'error')
    }
    // If no error, browser redirects to Google — no need to setLoading(false)
  }

  const login = async () => {
    if (!f.email || !f.pass) return t('Please fill all fields.', 'error')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: f.email, password: f.pass,
    })
    setLoading(false)
    if (error) return t(error.message, 'error')

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
      redirectTo: `${window.location.origin}`,
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
                <GoogleBtn onClick={signInWithGoogle} loading={googleLoading} />
                <Divider />
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
                <GoogleBtn onClick={signInWithGoogle} loading={googleLoading} />
                <Divider />
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
