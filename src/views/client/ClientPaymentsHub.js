import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

const ClientPaymentsHub = () => {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  useEffect(() => {
    const run = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) {
        window.location.href = '/#/login'
        return
      }

      const { data } = await supabase
        .from('bookings')
        .select('id, status, payment_status, payment_total_dop, payment_deposit_dop, payment_balance_dop')
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false })

      const list = (data || []).filter((b) => {
        const total = Number(b.payment_total_dop) || 0
        if (total <= 0) return false
        if (b.payment_status === 'pending_deposit' && b.status === 'accepted') return true
        if (b.payment_status === 'pending_balance' && b.status === 'completed') return true
        return false
      })

      setRows(list)
      setLoading(false)
    }

    run()
  }, [])

  if (loading) {
    return (
      <CContainer className="py-5 text-center">
        <CSpinner color="primary" />
      </CContainer>
    )
  }

  return (
    <CContainer className="py-4" lg>
      <h2 className="mb-3">Pagos con tarjeta</h2>
      <p className="text-body-secondary">
        Depósito del 30% cuando la reserva está aceptada; saldo del 70% cuando el servicio está completado.
      </p>

      {rows.length === 0 ? (
        <CAlert color="info">No tienes pagos pendientes con tarjeta en este momento.</CAlert>
      ) : (
        <CRow>
          {rows.map((b) => (
            <CCol md={6} key={b.id} className="mb-3">
              <CCard>
                <CCardHeader>Reserva #{b.id}</CCardHeader>
                <CCardBody>
                  <p className="mb-1">
                    <strong>Total:</strong> RD$ {(Number(b.payment_total_dop) || 0).toLocaleString('es-DO')}
                  </p>
                  <p className="mb-1">
                    <strong>Pago:</strong> {b.payment_status}
                  </p>
                  <p className="mb-3">
                    <strong>Reserva:</strong> {b.status}
                  </p>
                  <Link to={`/client/pago/${b.id}`}>
                    <CButton color="primary">Ir a pagar</CButton>
                  </Link>
                </CCardBody>
              </CCard>
            </CCol>
          ))}
        </CRow>
      )}
    </CContainer>
  )
}

export default ClientPaymentsHub
