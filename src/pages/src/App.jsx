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
  const [debugLog, setDebugLog] = useState([])

  const log = (msg) => {
    console.log('[SwiftLog]', msg)
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  const loadOrCreateProfile = async (user) => {
    log(`Loading profile for ${user.email}`)

    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) log(`Profile fetch error: ${error.message}`)

    if (!profile) {
      log('No profile found — creating one...')
      const name =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email

      const { data: created, error: createErr } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          name,
          phone: user.user_metadata?.phone || '',
          role: 'user',
          status: 'active',
          sanctioned: false,
        })
        .select()
        .single()

      if (createErr) log(`Profile create error: ${createErr.message}`)
      else log(`Profile created: ${JSON.stringify(created)}`)
      profile = created
    } else {
      log(`Profile loaded: role=${profile.role}, status=${profile.status}`)
    }

    return profile
  }

  useEffect(() => {
    log('App mounted')

    const hash = window.location.hash
    log(`URL hash: "${hash}"`)

    if (hash && hash.includes('type=recovery')) {
      log('Password recovery detected')
      setIsReset(true)
      setLoading(false)
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sess) => {
      log(`Auth event: ${event}`)

      if (event === 'PASSWORD_RECOVERY') {
        setIsReset(true)
        setLoading(false)
        return
      }

      if (sess) {
        log(`Session found for: ${sess.user.email}`)
        const p = await loadOrCreateProfile(sess.user)
        if (p) {
          log(`Setting profile, role: ${p.role}`)
          setSession(sess)
          setProfile(p)
        } else {
          log('ERROR: profile is null after load/create — showing auth')
          setSession(null)
          setProfile(null)
        }
      } else {
        log('No session — showing login')
        setSession(null)
        setProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0C1623', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ fontSize: 32 }}>🚚</div>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid rgba(10,110,255,.2)',
          borderTopColor: '#0A6EFF',
          animation: 'spin .7s linear infinite',
        }} />
        {/* DEBUG LOG */}
        <div style={{
          marginTop: 20, padding: '12px 16px', background: 'rgba(255,255,255,.07)',
          borderRadius: 10, maxWidth: 340, width: '100%', fontSize: 11,
          color: 'rgba(255,255,255,.6)', fontFamily: 'monospace', lineHeight: 1.8,
        }}>
          {debugLog.length === 0 ? 'Connecting...' : debugLog.map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (isReset) {
    return <ResetPassword onDone={() => {
      setIsReset(false)
      window.location.hash = ''
    }} />
  }

  if (!session || !profile) {
    return <Auth />
  }

  if (profile.role === 'admin') {
    return <AdminDash onLogout={handleLogout} />
  }

  const user = {
    id: session.user.id,
    email: session.user.email,
    ...profile,
  }

  return <UserDash user={user} onLogout={handleLogout} />
}
