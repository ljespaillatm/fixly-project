import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CWidgetStatsF,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChartPie, cilCheck, cilCreditCard, cilDollar } from '@coreui/icons'
import { supabase } from '../../supabaseClient'
import { fetchAdminGuard } from '../../utils/adminGuard'

const money = (n) => (Number(n) || 0).toLocaleString('es-DO')

const AdminPayments = () => {
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState([])
  const [profiles, setProfiles] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      const guard = await fetchAdminGuard(supabase)
      if (!guard.ok) {
        window.location.href = guard.redirect
        return
      }

      const { data: bRows, error: bErr } = await supabase
        .from('bookings')
        .select(
          `
          id,
          booking_date,
          status,
          user_id,
          contractor_id,
          payment_total_dop,
          payment_deposit_dop,
          payment_balance_dop,
          payment_status
        `,
        )
        .order('id', { ascending: false })
        .limit(500)

      if (bErr) {
        setError(bErr.message)
        setBookings([])
        setLoading(false)
        return
      }

      const all = bRows || []
      const withPay = all.filter(
        (b) =>
          (Number(b.payment_total_dop) || 0) > 0 ||
          (b.payment_status != null && b.payment_status !== ''),
      )

      const ids = new Set()
      withPay.forEach((b) => {
        if (b.user_id) ids.add(b.user_id)
        if (b.contractor_id) ids.add(b.contractor_id)
      })

      let map = {}
      if (ids.size) {
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('id, email, name, username')
          .in('id', [...ids])

        if (pErr) {
          setError(pErr.message)
        } else {
          map = Object.fromEntries((profs || []).map((p) => [p.id, p]))
        }
      }

      setProfiles(map)
      setBookings(withPay)
      setLoading(false)
    }

    run()
  }, [])

  const stats = useMemo(() => {
    const paidFull = bookings.filter((b) => b.payment_status === 'paid_full')
    const depositPaid = bookings.filter((b) =>
      ['deposit_paid', 'pending_balance', 'paid_full'].includes(b.payment_status),
    )
    const sumTotalPaid = paidFull.reduce((a, b) => a + (Number(b.payment_total_dop) || 0), 0)
    const sumDeposits = depositPaid.reduce((a, b) => a + (Number(b.payment_deposit_dop) || 0), 0)
    const sumBalances = paidFull.reduce((a, b) => a + (Number(b.payment_balance_dop) || 0), 0)

    const byStatus = {}
    bookings.forEach((b) => {
      const k = b.payment_status || 'sin_estado'
      byStatus[k] = (byStatus[k] || 0) + 1
    })

    return {
      reservasConMonto: bookings.length,
      pagosCompletos: paidFull.length,
      sumTotalEstimadoCobrado: sumTotalPaid,
      sumDepositosRegistrados: sumDeposits,
      sumSaldosEnCompletos: sumBalances,
      byStatus,
    }
  }, [bookings])

  const label = (id) => {
    const p = profiles[id]
    if (!p) return id?.slice(0, 8) || '—'
    return p.email || p.name || p.username || id?.slice(0, 8)
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
      <h2 className="mb-3">Pagos</h2>
      <p className="text-body-secondary mb-4">
        Reservas con montos o estado de pago (Stripe Checkout). Las cifras reflejan lo guardado en la
        base de datos tras verificación del cliente.
      </p>

      {error && <CAlert color="danger">{error}</CAlert>}

      <CRow className="mb-4">
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-4 mb-xl-0"
            color="primary"
            icon={<CIcon width={24} icon={cilCreditCard} size="xl" />}
            title="Reservas con pago"
            value={String(stats.reservasConMonto)}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-4 mb-xl-0"
            color="success"
            icon={<CIcon width={24} icon={cilCheck} size="xl" />}
            title="Pagos completos (paid_full)"
            value={String(stats.pagosCompletos)}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-4 mb-xl-0"
            color="info"
            icon={<CIcon width={24} icon={cilDollar} size="xl" />}
            title="Total estimado cobrado (RD$)"
            value={money(stats.sumTotalEstimadoCobrado)}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-4 mb-xl-0"
            color="warning"
            icon={<CIcon width={24} icon={cilChartPie} size="xl" />}
            title="Depósitos (30%) en filas con dep.+"
            value={money(stats.sumDepositosRegistrados)}
          />
        </CCol>
      </CRow>

      <CCard className="mb-4">
        <CCardHeader>Resumen por estado de pago</CCardHeader>
        <CCardBody>
          <ul className="mb-0">
            {Object.entries(stats.byStatus).map(([k, v]) => (
              <li key={k}>
                <strong>{k}</strong>: {v}
              </li>
            ))}
            {Object.keys(stats.byStatus).length === 0 && <li>Sin datos</li>}
          </ul>
        </CCardBody>
      </CCard>

      <CCard>
        <CCardHeader>
          <strong>{bookings.length}</strong> movimientos / reservas con información de pago
        </CCardHeader>
        <CCardBody className="p-0">
          <div className="table-responsive">
            <CTable hover responsive className="mb-0 small">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell scope="col">#</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Fecha</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Estado reserva</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Cliente</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Contratista</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Total</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Depósito</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Saldo</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Pago</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {bookings.map((b) => (
                  <CTableRow key={b.id}>
                    <CTableDataCell>{b.id}</CTableDataCell>
                    <CTableDataCell>{b.booking_date}</CTableDataCell>
                    <CTableDataCell>{b.status}</CTableDataCell>
                    <CTableDataCell>{label(b.user_id)}</CTableDataCell>
                    <CTableDataCell>{label(b.contractor_id)}</CTableDataCell>
                    <CTableDataCell>{money(b.payment_total_dop)}</CTableDataCell>
                    <CTableDataCell>{money(b.payment_deposit_dop)}</CTableDataCell>
                    <CTableDataCell>{money(b.payment_balance_dop)}</CTableDataCell>
                    <CTableDataCell>{b.payment_status || '—'}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>
        </CCardBody>
      </CCard>
    </CContainer>
  )
}

export default AdminPayments
