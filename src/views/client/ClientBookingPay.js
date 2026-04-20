import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CRow,
  CSpinner,
} from '@coreui/react'
import { supabase } from '../../supabaseClient'
import { messageForFunctionsInvokeError } from '../../utils/edgeFunctionErrors'

const ClientBookingPay = () => {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [booking, setBooking] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const run = async () => {
      setErrorMessage('')
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) {
        window.location.href = '/#/login'
        return
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
          id,
          user_id,
          status,
          payment_total_dop,
          payment_deposit_dop,
          payment_balance_dop,
          payment_status,
          booking_date,
          start_time
        `,
        )
        .eq('id', bookingId)
        .single()

      if (error || !data || data.user_id !== user.id) {
        setErrorMessage(error?.message || 'Reserva no encontrada.')
        setBooking(null)
        setLoading(false)
        return
      }

      setBooking(data)
      setLoading(false)
    }

    run()
  }, [bookingId])

  const startCheckout = async (phase) => {
    setBusy(true)
    setErrorMessage('')
    const { data, error } = await supabase.functions.invoke('stripe-booking-checkout', {
      body: { bookingId: Number(bookingId), phase },
    })
    setBusy(false)
    if (error) {
      setErrorMessage(await messageForFunctionsInvokeError(error))
      return
    }
    if (data?.error) {
      setErrorMessage(data.error)
      return
    }
    if (data?.url) {
      window.location.href = data.url
      return
    }
    setErrorMessage('No se recibió la URL de Stripe. ¿Están desplegadas las funciones Edge y STRIPE_SECRET_KEY?')
  }

  if (loading) {
    return (
      <CContainer className="py-5 text-center">
        <CSpinner color="primary" />
      </CContainer>
    )
  }

  if (!booking) {
    return (
      <CContainer className="py-4">
        <CAlert color="danger">{errorMessage || 'No disponible.'}</CAlert>
      </CContainer>
    )
  }

  const total = Number(booking.payment_total_dop) || 0
  const deposit = Number(booking.payment_deposit_dop) || 0
  const balance = Number(booking.payment_balance_dop) || 0
  const ps = booking.payment_status

  return (
    <CContainer className="py-4" lg>
      <CRow>
        <CCol md={8}>
          <CCard>
            <CCardHeader>
              <strong>Pago con tarjeta</strong>
            </CCardHeader>
            <CCardBody>
              <p className="text-body-secondary">
                Pagos en pesos dominicanos (DOP) con tarjeta vía Stripe Checkout. Depósito del 30% al
                aceptar la reserva; el 70% restante cuando el servicio figure como completado.
              </p>
              <p>
                <strong>Reserva #{booking.id}</strong> · {booking.booking_date} · {booking.start_time}
              </p>
              <p>
                <strong>Estado reserva:</strong> {booking.status}
              </p>
              <p>
                <strong>Total estimado:</strong> RD$ {total.toLocaleString('es-DO')}
              </p>
              <p>
                <strong>Depósito (30%):</strong> RD$ {deposit.toLocaleString('es-DO')}
              </p>
              <p>
                <strong>Saldo (70%):</strong> RD$ {balance.toLocaleString('es-DO')}
              </p>
              <p>
                <strong>Estado de pago:</strong> {ps || '—'}
              </p>

              {errorMessage && <CAlert color="danger">{errorMessage}</CAlert>}

              {total <= 0 && (
                <CAlert color="secondary" className="mb-0">
                  Esta reserva no tiene monto calculado (tarifa o duración). No se requiere pago por la
                  app.
                </CAlert>
              )}

              {total > 0 &&
                ps === 'pending_deposit' &&
                (booking.status === 'accepted' || booking.status === 'in_progress') && (
                <div className="mt-3">
                  <CButton color="primary" disabled={busy} onClick={() => startCheckout('deposit')}>
                    {busy ? 'Abriendo Stripe…' : 'Pagar depósito 30% con tarjeta'}
                  </CButton>
                </div>
              )}

              {total > 0 &&
                ps === 'pending_deposit' &&
                booking.status !== 'accepted' &&
                booking.status !== 'in_progress' && (
                <CAlert color="warning" className="mt-3 mb-0">
                  El depósito solo se paga cuando la reserva está aceptada.
                </CAlert>
              )}

              {total > 0 && ps === 'deposit_paid' && (
                <CAlert color="success" className="mt-3">
                  Depósito recibido. El saldo (70%) se habilitará cuando el contratista marque el servicio
                  como completado.
                </CAlert>
              )}

              {total > 0 && ps === 'pending_balance' && booking.status === 'completed' && (
                <div className="mt-3">
                  <CButton color="primary" disabled={busy} onClick={() => startCheckout('balance')}>
                    {busy ? 'Abriendo Stripe…' : 'Pagar saldo 70% con tarjeta'}
                  </CButton>
                </div>
              )}

              {ps === 'paid_full' && (
                <CAlert color="success" className="mt-3 mb-0">
                  Pagos completados. Gracias.
                </CAlert>
              )}

              <CButton color="link" className="px-0 mt-3" onClick={() => navigate('/my-bookings')}>
                Volver a mis reservas
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default ClientBookingPay
