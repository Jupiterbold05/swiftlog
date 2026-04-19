import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import UserDash from './pages/UserDash'
import AdminDash from './pages/AdminDash'
import ResetPassword from './pages/ResetPassword'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [isReset, setIsReset] = useState(false)

  const loadOrCreateProfile = async (user) => {
    try {
      let { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!p) {
        const name =
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          user.email

        const { data: created } = await supabase
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

        p = created
      }
      return p
    } catch (e) {
      console.error('Profile error:', e)
      return null
    }
  }

  useEffect(() => {
    // Handle password recovery URL
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setIsReset(true)
      setSession(null)
      return
    }

    // Get initial session once
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s) {
        const p = await loadOrCreateProfile(s.user)
        setProfile(p)
      }
      setSession(s || null)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReset(true)
        setSession(null)
        return
      }
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setProfile(null)
        return
      }
      if (s && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        const p = await loadOrCreateProfile(s.user)
        setProfile(p)
        setSession(s)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // session undefined = still loading
  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0C1623',
        flexDirection: 'column', gap: 14,
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

  return <UserDash user={{ id: session.user.id, email: session.user.email, ...profile }} onLogout={handleLogout} />
}
