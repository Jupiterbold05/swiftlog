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
      }}>
        <div style={{ fontSize: 32 }}>🚚</div>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid rgba(10,110,255,.2)',
          borderTopColor: '#0A6EFF',
          animation: 'spin .7s linear infinite',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // Password reset flow
  if (isReset) {
    return <ResetPassword onDone={() => {
      setIsReset(false)
      window.location.hash = ''
    }} />
  }

  // Not logged in
  if (!session || !profile) {
    return <Auth onLogin={async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const p = await loadProfile(session.user.id)
        setSession(session)
        setProfile(p)
      }
    }} />
  }

  // Admin
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
