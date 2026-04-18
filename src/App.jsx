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

  const loadOrCreateProfile = async (user) => {
    // Try to get existing profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // If no profile exists (e.g. Google sign-in first time), create one
    if (!profile) {
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

      profile = created
    }

    return profile
  }

  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setIsReset(true)
      setLoading(false)
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sess) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReset(true)
        setLoading(false)
        return
      }

      if (sess) {
        const p = await loadOrCreateProfile(sess.user)
        setSession(sess)
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
