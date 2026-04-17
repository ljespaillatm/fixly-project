import React, { useCallback, useEffect, useState } from 'react'
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
import { generateVerificationCode, upsertBookingVerification } from '../../utils/bookingVerification'

const ClientCompletionCode = () => {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [bookings, setBookings] = useState([])
  const [codesByBooking, setCodesByBooking] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadBookings = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('bookings')
      .select(
        `
        id,
        booking_date,
        start_time,
        status,
        contractor_id,
        contractor:contractor_id ( email )
      `,
      )
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .order('booking_date', { ascending: false })

    if (error) {
      setErrorMessage(error.message)
      setBookings([])
      return
    }

    setBookings(data || [])

    const ids = (data || []).map((b) => b.id)
    if (!ids.length) {
      setCodesByBooking({})
      return
    }

    const { data: rows } = await supabase
      .from('booking_verification_codes')
      .select('booking_id, code')
      .in('booking_id', ids)

    const map = {}
    ;(rows || []).forEach((r) => {
      map[r.booking_id] = r.code
    })
    setCodesByBooking(map)
  }, [])

  useEffect(() => {
    const run = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const current = authData?.user
      if (!current) {
        window.location.href = '/#/login'
        return
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', current.id).single()

      if (profile?.role !== 'client') {
        window.location.href = '/#/'
        return
      }

      setUser(current)
      await loadBookings(current.id)
      setLoading(false)
    }

    run()
  }, [loadBookings])

  const handleGenerate = async (booking) => {
    if (!user) return
    setErrorMessage('')
    setSuccessMessage('')
    setBusyId(booking.id)

    const code = generateVerificationCode()

    try {
      await upsertBookingVerification({
        bookingId: booking.id,
        contractorId: booking.contractor_id,
        clientId: user.id,
        code,
      })
      setCodesByBooking((prev) => ({ ...prev, [booking.id]: code }))
      setSuccessMessage(
        'Código generado. Dicta o envía este número al contratista para que pueda cerrar el servicio en su panel.',
      )
    } catch (e) {
      setErrorMessage(e?.message || 'No se pudo guardar el código.')
    } finally {
      setBusyId(null)
    }
  }

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      setSuccessMessage('Código copiado al portapapeles.')
    } catch {
      setErrorMessage('No se pudo copiar. Copia el número manualmente.')
    }
  }

  if (loading) {
    return (
      <CContainer className="py-5 text-center">
        <CSpinner color="primary" />
      </CContainer>
    )
  }

  return (
    <CContainer className="py-4" lg>
      <CRow>
        <CCol lg={8}>
          <CCard>
            <CCardHeader>
              <strong>Generar código de cierre</strong>
            </CCardHeader>
            <CCardBody>
              <p className="text-body-secondary">
                Cuando el servicio esté en curso, el contratista te pedirá un código para marcarlo como
                completado. Genera aquí un código de 6 dígitos y compártelo con él. Puedes regenerarlo si
                hace falta (el anterior dejará de valer).
              </p>

              {errorMessage && (
                <CAlert color="danger" className="mt-2">
                  {errorMessage}
                </CAlert>
              )}
              {successMessage && (
                <CAlert color="success" className="mt-2" dismissible onClose={() => setSuccessMessage('')}>
                  {successMessage}
                </CAlert>
              )}

              {bookings.length === 0 ? (
                <CAlert color="info" className="mb-0">
                  No tienes reservas en curso. El código solo aplica cuando el contratista ha iniciado el
                  servicio (estado &quot;en curso&quot;).
                </CAlert>
              ) : (
                bookings.map((b) => {
                  const code = codesByBooking[b.id]
                  return (
                    <CCard key={b.id} className="mb-3 border">
                      <CCardBody>
                        <p className="mb-1">
                          <strong>Contratista:</strong> {b.contractor?.email || '—'}
                        </p>
                        <p className="mb-1">
                          <strong>Fecha:</strong> {b.booking_date} · <strong>Inicio:</strong> {b.start_time}
                        </p>

                        {code ? (
                          <div className="mt-3">
                            <p className="mb-1 small text-body-secondary">Código actual para el contratista:</p>
                            <div
                              className="d-flex flex-wrap align-items-center gap-2"
                              style={{
                                fontFamily: 'ui-monospace, monospace',
                                fontSize: '1.5rem',
                                letterSpacing: '0.2em',
                                fontWeight: 700,
                              }}
                            >
                              {code}
                            </div>
                            <CButton
                              color="secondary"
                              size="sm"
                              className="mt-2 me-2"
                              onClick={() => copyCode(code)}
                            >
                              Copiar
                            </CButton>
                            <CButton
                              color="primary"
                              size="sm"
                              className="mt-2"
                              disabled={busyId === b.id}
                              onClick={() => handleGenerate(b)}
                            >
                              {busyId === b.id ? 'Generando…' : 'Generar nuevo código'}
                            </CButton>
                          </div>
                        ) : (
                          <CButton
                            color="primary"
                            className="mt-3"
                            disabled={busyId === b.id}
                            onClick={() => handleGenerate(b)}
                          >
                            {busyId === b.id ? 'Generando…' : 'Generar código'}
                          </CButton>
                        )}
                      </CCardBody>
                    </CCard>
                  )
                })
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default ClientCompletionCode
