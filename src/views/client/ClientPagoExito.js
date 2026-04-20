import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CAlert, CButton, CContainer, CSpinner } from '@coreui/react'
import { supabase } from '../../supabaseClient'
import { messageForFunctionsInvokeError } from '../../utils/edgeFunctionErrors'

function sessionIdFromHash() {
  const hash = window.location.hash || ''
  const qIndex = hash.indexOf('?')
  if (qIndex < 0) return ''
  return new URLSearchParams(hash.slice(qIndex + 1)).get('session_id') || ''
}

const ClientPagoExito = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('working')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const run = async () => {
      const sessionId = sessionIdFromHash()
      if (!sessionId) {
        setStatus('error')
        setMessage('No se encontró el identificador de sesión de Stripe en la URL.')
        return
      }

      const { data, error } = await supabase.functions.invoke('stripe-booking-verify', {
        body: { sessionId },
      })

      if (error) {
        setStatus('error')
        setMessage(await messageForFunctionsInvokeError(error))
        return
      }
      if (data?.error) {
        setStatus('error')
        setMessage(data.error)
        return
      }

      setStatus('ok')
      setMessage(
        data?.phase === 'balance'
          ? 'Saldo pagado. Gracias.'
          : 'Depósito registrado. El contratista ya puede iniciar el servicio.',
      )
    }

    run()
  }, [])

  if (status === 'working') {
    return (
      <CContainer className="py-5 text-center">
        <CSpinner color="primary" />
        <p className="mt-3">Confirmando pago…</p>
      </CContainer>
    )
  }

  return (
    <CContainer className="py-4">
      <CAlert color={status === 'ok' ? 'success' : 'danger'}>{message}</CAlert>
      <CButton color="primary" className="me-2" onClick={() => navigate('/my-bookings')}>
        Mis reservas
      </CButton>
      <CButton color="secondary" variant="outline" onClick={() => navigate('/notifications/alerts')}>
        Notificaciones
      </CButton>
    </CContainer>
  )
}

export default ClientPagoExito
