import { useEffect, useState } from 'react'
import {
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
import ChatBox from '../chat/Chatbox'
import {
  generateVerificationCode,
  sendVerificationEmail,
  upsertBookingVerification,
} from '../../utils/bookingVerification'
import { computePaymentAmounts } from '../../utils/bookingPayments'

const SECTIONS = {
  BOOKINGS: 'bookings',
  REVIEWS: 'reviews',
  PREFERENCES: 'preferences',
}
const AUTO_GREETING =
  'Hola, gracias por reservar con Fixly. Estoy disponible para coordinar los detalles del servicio.'

export default function ContractorPanel() {
  const [user, setUser] = useState(null)
  const [pending, setPending] = useState([])
  const [activeBookings, setActiveBookings] = useState([])
  const [completedBookings, setCompletedBookings] = useState([])
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeSection, setActiveSection] = useState(SECTIONS.BOOKINGS)
  const [completionCodes, setCompletionCodes] = useState({})

  const fetchData = async (contractorId) => {
    const [{ data: pendingData }, { data: activeData }, { data: completedData }, { data: reviewsData }] =
      await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('contractor_id', contractorId)
          .eq('status', 'pending')
          .order('booking_date', { ascending: true }),
        supabase
          .from('bookings')
          .select('*')
          .eq('contractor_id', contractorId)
          .in('status', ['accepted', 'in_progress'])
          .order('booking_date', { ascending: true }),
        supabase
          .from('bookings')
          .select('*')
          .eq('contractor_id', contractorId)
          .eq('status', 'completed')
          .order('booking_date', { ascending: false }),
        supabase
          .from('reviews')
          .select('id, rating, comment, created_at')
          .eq('contractor_id', contractorId)
          .order('created_at', { ascending: false }),
      ])

    setPending(pendingData || [])
    setActiveBookings(activeData || [])
    setCompletedBookings(completedData || [])
    setReviews(reviewsData || [])
    setIsLoading(false)
  }

  useEffect(() => {
    const getUser = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const currentUser = authData?.user

      if (!currentUser) {
        window.location.href = '/#/login'
        return
      }

      setUser(currentUser)
      await fetchData(currentUser.id)
    }

    getUser()
  }, [])

  const acceptRequest = async (booking) => {
    const { data: serviceConfig, error: serviceConfigError } = await supabase
      .from('contractor_services')
      .select('estimated_duration_minutes, hourly_rate')
      .eq('contractor_id', user.id)
      .eq('service_id', booking.service_id)
      .single()

    if (serviceConfigError && serviceConfigError.code !== 'PGRST116') {
      alert(`No se pudo validar la duracion del servicio: ${serviceConfigError.message}`)
      return
    }

    const estimatedMinutes = Number(serviceConfig?.estimated_duration_minutes)
    if (!estimatedMinutes || estimatedMinutes <= 0) {
      alert(
        'No puedes aceptar esta reserva porque no tienes una duracion estimada configurada para este servicio. Ve a "Edit Preferences" y agrega la duracion en minutos.',
      )
      return
    }

    const start = new Date(`1970-01-01T${booking.start_time}`)
    const end = new Date(start.getTime() + estimatedMinutes * 60 * 1000)
    const endTime = end.toTimeString().slice(0, 5)

    const hourly = Number(serviceConfig?.hourly_rate)
    const { totalDop, depositDop, balanceDop } = computePaymentAmounts(hourly, estimatedMinutes)
    const paymentStatus = totalDop > 0 ? 'pending_deposit' : 'paid_full'

    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'accepted',
        end_time: endTime,
        payment_total_dop: totalDop,
        payment_deposit_dop: depositDop,
        payment_balance_dop: balanceDop,
        payment_status: paymentStatus,
      })
      .eq('id', booking.id)

    if (error) {
      alert('Error al aceptar')
      return
    }

    const [{ data: svcRow }, { data: contractorProfile }] = await Promise.all([
      supabase.from('services').select('title, category').eq('id', booking.service_id).maybeSingle(),
      supabase.from('profiles').select('name, username, email, phone').eq('id', user.id).maybeSingle(),
    ])
    const serviceLabel = svcRow?.title || svcRow?.category || 'Servicio'
    const who = contractorProfile?.name || contractorProfile?.username || 'Contratista'
    const contactEmail = contractorProfile?.email || ''
    const contactPhone = contractorProfile?.phone ? ` · Tel: ${contractorProfile.phone}` : ''
    const payPath = `/#/client/pago/${booking.id}`
    const BOOKING_SUMMARY =
      `Reserva confirmada · ${serviceLabel}\n` +
      `Tarifa (según tus preferencias): RD$ ${Number.isFinite(hourly) ? hourly.toLocaleString('es-DO') : '—'} / hora\n` +
      `Total estimado: RD$ ${totalDop.toLocaleString('es-DO')} (30% depósito con tarjeta: RD$ ${depositDop.toLocaleString('es-DO')})\n` +
      `Paga el depósito aquí: ${payPath}\n` +
      `${who}${contactEmail ? ` · ${contactEmail}` : ''}${contactPhone}`

    // Avoid duplicate auto-messages if the action is retried.
    const { data: existingGreeting } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('booking_id', booking.id)
      .eq('sender_id', user.id)
      .eq('receiver_id', booking.user_id)
      .eq('content', AUTO_GREETING)
      .limit(1)

    if (!existingGreeting?.length) {
      await supabase.from('chat_messages').insert([
        {
          booking_id: booking.id,
          sender_id: user.id,
          receiver_id: booking.user_id,
          content: AUTO_GREETING,
        },
        {
          booking_id: booking.id,
          sender_id: user.id,
          receiver_id: booking.user_id,
          content: BOOKING_SUMMARY,
        },
      ])
    }

    await fetchData(user.id)
  }

  const rejectRequest = async (bookingId) => {
    const { error } = await supabase.from('bookings').update({ status: 'rejected' }).eq('id', bookingId)

    if (error) {
      alert('Error al rechazar')
      return
    }

    await fetchData(user.id)
  }

  const startService = async (booking) => {
    const total = Number(booking.payment_total_dop) || 0
    const ps = booking.payment_status
    if (total > 0 && ps !== 'deposit_paid') {
      alert(
        'El cliente debe pagar primero el depósito del 30% con tarjeta (menú Pagos o enlace de la reserva) antes de iniciar el servicio.',
      )
      return
    }

    const verificationCode = generateVerificationCode()

    const { data: clientProfile, error: clientProfileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', booking.user_id)
      .single()

    if (clientProfileError || !clientProfile?.email) {
      alert('No se pudo obtener el correo del cliente para enviar el codigo de verificacion.')
      return
    }

    try {
      await upsertBookingVerification({
        bookingId: booking.id,
        contractorId: user.id,
        clientId: booking.user_id,
        code: verificationCode,
      })

      await sendVerificationEmail({
        toEmail: clientProfile.email,
        code: verificationCode,
        bookingId: booking.id,
      })
    } catch (error) {
      alert(`Error enviando codigo de verificacion: ${error.message}`)
      return
    }

    const { error: bookingUpdateError } = await supabase
      .from('bookings')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', booking.id)

    if (bookingUpdateError) {
      alert(bookingUpdateError.message)
      return
    }

    alert('Servicio iniciado. Se envio un codigo de verificacion al cliente.')
    await fetchData(user.id)
  }

  const completeService = async (booking) => {
    const enteredCode = completionCodes[booking.id]?.trim()
    if (!enteredCode) {
      alert('Ingresa el codigo de verificacion para completar el servicio.')
      return
    }

    const { data: codeRow, error: codeError } = await supabase
      .from('booking_verification_codes')
      .select('id, code')
      .eq('booking_id', booking.id)
      .eq('contractor_id', user.id)
      .is('verified_at', null)
      .single()

    if (codeError || !codeRow) {
      alert('No hay un codigo activo para esta reserva. Inicia el servicio primero.')
      return
    }

    if (codeRow.code !== enteredCode) {
      alert('Codigo incorrecto. Verifica con el cliente e intenta de nuevo.')
      return
    }

    const { error: verificationUpdateError } = await supabase
      .from('booking_verification_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', codeRow.id)

    if (verificationUpdateError) {
      alert(verificationUpdateError.message)
      return
    }

    const total = Number(booking.payment_total_dop) || 0
    const balance = Number(booking.payment_balance_dop) || 0
    const payStatus = booking.payment_status
    let nextPaymentStatus = payStatus
    if (total > 0 && payStatus === 'deposit_paid' && balance > 0) {
      nextPaymentStatus = 'pending_balance'
    } else if (total > 0 && balance <= 0 && payStatus === 'deposit_paid') {
      nextPaymentStatus = 'paid_full'
    } else if (total <= 0) {
      nextPaymentStatus = 'paid_full'
    }

    const { error: bookingUpdateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        payment_status: nextPaymentStatus,
      })
      .eq('id', booking.id)

    if (bookingUpdateError) {
      alert(bookingUpdateError.message)
      return
    }

    setCompletionCodes((prev) => ({ ...prev, [booking.id]: '' }))
    const payMsg =
      nextPaymentStatus === 'pending_balance'
        ? ' Indica al cliente que pague el saldo (70%) con tarjeta en Pagos o en el enlace de la reserva.'
        : ''
    alert(`Servicio marcado como completado.${payMsg}`)
    await fetchData(user.id)
  }

  if (isLoading) {
    return (
      <div className="pt-4 text-center">
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <CContainer className="py-4">
      <CRow className="mb-3">
        <CCol>
          <h3>Panel del contratista</h3>
          <div className="d-flex gap-2 mt-2">
            <CButton
              color={activeSection === SECTIONS.BOOKINGS ? 'primary' : 'secondary'}
              onClick={() => setActiveSection(SECTIONS.BOOKINGS)}
            >
              Bookings
            </CButton>
            <CButton
              color={activeSection === SECTIONS.REVIEWS ? 'primary' : 'secondary'}
              onClick={() => setActiveSection(SECTIONS.REVIEWS)}
            >
              Reviews
            </CButton>
            <CButton
              color={activeSection === SECTIONS.PREFERENCES ? 'primary' : 'secondary'}
              onClick={() => setActiveSection(SECTIONS.PREFERENCES)}
            >
              Edit Preferences
            </CButton>
          </div>
        </CCol>
      </CRow>

      {activeSection === SECTIONS.BOOKINGS && (
        <>
          <CCard className="mb-4">
            <CCardHeader>Solicitudes pendientes</CCardHeader>
            <CCardBody>
              {pending.length === 0 ? (
                <p className="mb-0">No hay solicitudes pendientes.</p>
              ) : (
                pending.map((booking) => (
                  <div key={booking.id} className="border rounded p-3 mb-3">
                    <p className="mb-1">
                      <strong>Fecha:</strong> {booking.booking_date}
                    </p>
                    <p className="mb-2">
                      <strong>Hora:</strong> {booking.start_time}
                    </p>
                    <CButton size="sm" color="success" className="me-2" onClick={() => acceptRequest(booking)}>
                      Aceptar
                    </CButton>
                    <CButton size="sm" color="danger" onClick={() => rejectRequest(booking.id)}>
                      Rechazar
                    </CButton>
                  </div>
                ))
              )}
            </CCardBody>
          </CCard>

          <CCard className="mb-4">
            <CCardHeader>Bookings activos (accepted / in_progress)</CCardHeader>
            <CCardBody>
              {activeBookings.length === 0 ? (
                <p className="mb-0">No tienes servicios activos.</p>
              ) : (
                activeBookings.map((booking) => (
                  <div key={booking.id} className="border rounded p-3 mb-3">
                    <p className="mb-1">
                      <strong>Fecha:</strong> {booking.booking_date}
                    </p>
                    <p className="mb-1">
                      <strong>Inicio:</strong> {booking.start_time}
                    </p>
                    <p className="mb-0">
                      <strong>Fin:</strong> {booking.end_time || 'Pendiente'}
                    </p>
                    <p className="mb-2">
                      <strong>Estado:</strong> {booking.status}
                    </p>

                    {booking.status === 'accepted' && (
                      <CButton size="sm" color="info" onClick={() => startService(booking)}>
                        Iniciar servicio (enviar codigo)
                      </CButton>
                    )}

                    {booking.status === 'in_progress' && (
                      <div>
                        <p className="small text-body-secondary mb-2">
                          Pide al cliente el código de 6 dígitos que genera en el menú lateral{' '}
                          <strong>Generar código</strong> (puede renovarlo; usa siempre el último que te
                          indique).
                        </p>
                        <div className="d-flex gap-2 align-items-center flex-wrap">
                          <input
                            className="form-control"
                            style={{ maxWidth: '180px' }}
                            placeholder="Código del cliente"
                            value={completionCodes[booking.id] || ''}
                            onChange={(event) =>
                              setCompletionCodes((prev) => ({
                                ...prev,
                                [booking.id]: event.target.value,
                              }))
                            }
                          />
                          <CButton size="sm" color="primary" onClick={() => completeService(booking)}>
                            Verificar y completar
                          </CButton>
                        </div>
                      </div>
                    )}

                    {user && (booking.status === 'accepted' || booking.status === 'in_progress') && (
                      <ChatBox
                        bookingId={booking.id}
                        userId={user.id}
                        otherUserId={booking.user_id}
                      />
                    )}
                  </div>
                ))
              )}
            </CCardBody>
          </CCard>

          <CCard>
            <CCardHeader>Servicios completados</CCardHeader>
            <CCardBody>
              {completedBookings.length === 0 ? (
                <p className="mb-0">No hay servicios completados aun.</p>
              ) : (
                completedBookings.map((booking) => (
                  <div key={booking.id} className="border rounded p-3 mb-3">
                    <p className="mb-1">
                      <strong>Fecha:</strong> {booking.booking_date}
                    </p>
                    <p className="mb-1">
                      <strong>Inicio:</strong> {booking.start_time}
                    </p>
                    <p className="mb-1">
                      <strong>Fin:</strong> {booking.end_time || 'Pendiente'}
                    </p>
                    <p className="mb-0">
                      <strong>Estado:</strong> {booking.status}
                    </p>
                  </div>
                ))
              )}
            </CCardBody>
          </CCard>
        </>
      )}

      {activeSection === SECTIONS.REVIEWS && (
        <CCard>
          <CCardHeader>Reviews recibidos</CCardHeader>
          <CCardBody>
            {reviews.length === 0 ? (
              <p className="mb-0">Aun no tienes reviews.</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border rounded p-3 mb-3">
                  <p className="mb-1">
                    <strong>Rating:</strong> {review.rating}/5
                  </p>
                  <p className="mb-1">
                    <strong>Comentario:</strong> {review.comment || 'Sin comentario'}
                  </p>
                  <p className="mb-0 text-body-secondary">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </CCardBody>
        </CCard>
      )}

      {activeSection === SECTIONS.PREFERENCES && (
        <CCard>
          <CCardHeader>Editar preferencias</CCardHeader>
          <CCardBody>
            <p className="mb-3">
              Actualiza tus datos personales, servicios, duraciones y zonas de trabajo.
            </p>
            <CButton color="primary" onClick={() => (window.location.href = '/#/contractor/preferences')}>
              Ir a Contractor Preferences
            </CButton>
          </CCardBody>
        </CCard>
      )}
    </CContainer>
  )
}