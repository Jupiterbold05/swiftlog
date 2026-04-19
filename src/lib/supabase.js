import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient' // The file you created earlier

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true) // 1. Set a loading state

  useEffect(() => {
    // 2. Fetch the session on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false) // 3. Turn off the loading state once we know the answer!
    })

    // 4. Listen for any auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false) 
    })

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe()
  }, [])

  // 5. Block the rest of the app from rendering until Supabase is done
  if (loading) {
    return <div>Loading...</div> // This prevents the infinite redirect!
  }

  // 6. Once loading is false, safely render your routes
  return (
    <div>
      {session ? <p>Welcome back! You are logged in.</p> : <p>Please log in.</p>}
    </div>
  )
}
