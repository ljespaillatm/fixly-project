import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CAlertHeading,
  CAlertLink,
  CCard,
  CCardBody,
  CContainer,
  CSpinner,
} from '@coreui/react'
import { supabase } from '../../../supabaseClient'
import ChatBox from '../../chat/Chatbox'

/**
 * Ruta cliente: #/notifications/alerts — solicitudes aceptadas / en curso, detalle y chat.
 */
const ClientNotificationsAlerts = () => {
  const [loading, setLoading] = useState(true)
  const [clientId, setClientId] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const run = async () => {
      setLoadError('')
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user

      if (!user) {
        window.location.href = '/#/login'
        return
      }

      setClientId(user.id)

      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
          id,
          booking_date,
          start_time,
          end_time,
          status,
          contractor_id,
          payment_total_dop,
          payment_deposit_dop,
          payment_balance_dop,
          payment_status,
          contractor:contractor_id ( id, email, name, username ),
          service:service_id ( category, title )
        `,
        )
        .eq('user_id', user.id)
        .in('status', ['accepted', 'in_progress'])
        .order('booking_date', { ascending: false })

      if (error) {
        setLoadError(error.message)
        setBookings([])
      } else {
        setBookings(data || [])
      }

      setLoading(false)
    }

    run()
  }, [])

  const serviceLabel = (b) =>
    b.service?.title || b.service?.category || 'Servicio'

  const contractorLabel = (b) =>
    b.contractor?.name ||
    b.contractor?.username ||
    b.contractor?.email ||
    'Contratista'

  if (loading) {
    return (
      <CContainer className="py-5 text-center">
        <CSpinner color="primary" />
      </CContainer>
    )
  }

  return (
    <CContainer className="py-4" lg>
      <h2 className="mb-4">Notificaciones</h2>
      <p className="text-body-secondary mb-4">
        Aquí ves las reservas que el contratista ya aceptó. Puedes revisar los datos y escribir en el
        chat.
      </p>

      {loadError && (
        <CAlert color="danger" className="mb-4">
          No se pudieron cargar las notificaciones: {loadError}
        </CAlert>
      )}

      {!loadError && bookings.length === 0 && (
        <CAlert color="info" className="mb-4">
          <CAlertHeading as="h5">Sin solicitudes aceptadas</CAlertHeading>
          <p className="mb-2">
            Cuando un contratista acepte una de tus solicitudes, aparecerá aquí con el chat para
            coordinar.
          </p>
          <CAlertLink href="/#/my-bookings">Ver todas mis reservas</CAlertLink>
          {' · '}
          <CAlertLink href="/#/">Ir al inicio</CAlertLink>
        </CAlert>
      )}

      {bookings.map((b) => (
        <CCard key={b.id} className="mb-4">
          <CCardBody>
            <CAlert color="success" className="mb-3">
              <CAlertHeading as="h5">Solicitud aceptada</CAlertHeading>
              <p className="mb-1">
                <strong>Servicio:</strong> {serviceLabel(b)}
              </p>
              <p className="mb-1">
                <strong>Contratista:</strong> {contractorLabel(b)}
                {b.contractor?.email ? ` (${b.contractor.email})` : ''}
              </p>
              <p className="mb-1">
                <strong>Fecha:</strong> {b.booking_date}
              </p>
              <p className="mb-1">
                <strong>Hora inicio:</strong> {b.start_time}
              </p>
              <p className="mb-1">
                <strong>Hora fin:</strong> {b.end_time || '—'}
              </p>
              <p className="mb-0">
                <strong>Estado:</strong> {b.status === 'in_progress' ? 'En curso' : 'Aceptada'}
              </p>
            </CAlert>

            {Number(b.payment_total_dop) > 0 && b.payment_status === 'pending_deposit' && (
              <CAlert color="warning" className="mb-3">
                <CAlertHeading as="h6">Pago con tarjeta</CAlertHeading>
                <p className="mb-2">
                  Depósito del 30%: RD$ {(Number(b.payment_deposit_dop) || 0).toLocaleString('es-DO')} (total
                  estimado RD$ {(Number(b.payment_total_dop) || 0).toLocaleString('es-DO')}).
                </p>
                <CAlertLink href={`/#/client/pago/${b.id}`}>Pagar depósito ahora</CAlertLink>
              </CAlert>
            )}

            {Number(b.payment_total_dop) > 0 && b.payment_status === 'deposit_paid' && (
              <CAlert color="info" className="mb-3">
                Depósito recibido. El saldo (70%) se paga cuando el servicio esté completado.
              </CAlert>
            )}

            {clientId && b.contractor_id && (
              <ChatBox bookingId={b.id} userId={clientId} otherUserId={b.contractor_id} />
            )}
          </CCardBody>
        </CCard>
      ))}
    </CContainer>
  )
}

export default ClientNotificationsAlerts
