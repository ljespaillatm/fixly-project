import React, { useEffect, useState } from 'react'
import { CSpinner } from '@coreui/react'
import { supabase } from '../supabaseClient'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'

const DefaultLayout = () => {
  const [sessionReady, setSessionReady] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const sync = (session) => {
      if (!cancelled) {
        setAuthed(!!session)
        setSessionReady(true)
      }
    }

    supabase.auth.getSession().then(({ data }) => sync(data.session))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      sync(session)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  if (!sessionReady) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="wrapper d-flex flex-column min-vh-100">
        <PublicHeader />
        <div className="body flex-grow-1 d-flex flex-column">
          <AppContent />
        </div>
        <PublicFooter />
      </div>
    )
  }

  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />
        <div className="body flex-grow-1">
          <AppContent />
        </div>
        <AppFooter />
      </div>
    </div>
  )
}

export default DefaultLayout
