import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import UserDash from './pages/UserDash'
import AdminDash from './pages/AdminDash'
import ResetPassword from './pages/ResetPassword'

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isReset, setIsReset] = useState(false)

  const loadOrCreateProfile = async (u) => {
    try {
      let { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single()

      if (!p) {
        const name =
          u.user_metadata?.name ||
          u.user_metadata?.full_name ||
          u.email

        const { data: created } = await supabase
          .from('profiles')
          .insert({
            id: u.id,
            name,
            phone: u.user_metadata?.phone || '',
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
    // Password recovery
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setIsReset(true)
      setLoading(false)
      return
    }

    // Use getUser() — reads directly from localStorage, no lock needed
    const init = async () => {
      try {
        const { data: { user: u } } = await supabase.auth.getUser()
        if (u) {
          const p = await loadOrCreateProfile(u)
          setUser(u)
          setProfile(p)
        }
      } catch (e) {
        console.error('Init error:', e)
      } finally {
        setLoading(false)
      }
    }

    init()

    // Only listen for live auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReset(true)
        setLoading(false)
        return
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        return
      }
      if (event === 'SIGNED_IN' && session?.user) {
        const p = await loadOrCreateProfile(session.user)
        setUser(session.user)
        setProfile(p)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
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

  if (!user || !profile) {
    return <Auth />
  }

  if (profile.role === 'admin') {
    return <AdminDash onLogout={handleLogout} />
  }

  return <UserDash
    user={{ id: user.id, email: user.email, ...profile }}
    onLogout={handleLogout}
  />
}
