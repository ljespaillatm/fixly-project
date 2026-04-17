import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CContainer,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { supabase } from '../../supabaseClient'
import { fetchAdminGuard } from '../../utils/adminGuard'

const displayName = (p) => {
  const n = [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
  if (n) return n
  if (p.name) return p.name
  if (p.username) return p.username
  return p.email || '—'
}

const AdminContractors = () => {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      const guard = await fetchAdminGuard(supabase)
      if (!guard.ok) {
        window.location.href = guard.redirect
        return
      }

      const { data: contractors, error: cErr } = await supabase
        .from('profiles')
        .select('id, email, name, username, first_name, last_name')
        .eq('role', 'contractor')
        .order('email', { ascending: true })

      if (cErr) {
        setError(cErr.message)
        setRows([])
        setLoading(false)
        return
      }

      const list = contractors || []
      const ids = list.map((c) => c.id)
      let ratingsByContractor = {}

      if (ids.length) {
        const { data: reviews, error: rErr } = await supabase
          .from('reviews')
          .select('contractor_id, rating')
          .in('contractor_id', ids)

        if (rErr) {
          setError((e) => (e ? `${e}; ${rErr.message}` : rErr.message))
        } else {
          const sums = {}
          ;(reviews || []).forEach((r) => {
            const id = r.contractor_id
            if (!sums[id]) sums[id] = { sum: 0, n: 0 }
            sums[id].sum += Number(r.rating) || 0
            sums[id].n += 1
          })
          ratingsByContractor = Object.fromEntries(
            Object.entries(sums).map(([id, { sum, n }]) => [id, { avg: n ? sum / n : null, n }]),
          )
        }
      }

      setRows(
        list.map((c) => ({
          ...c,
          stars: ratingsByContractor[c.id]?.avg,
          reviewCount: ratingsByContractor[c.id]?.n ?? 0,
        })),
      )
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
      <h2 className="mb-3">Contratistas</h2>
      <p className="text-body-secondary mb-4">
        Contratistas registrados y promedio de estrellas según reseñas en la plataforma.
      </p>

      {error && <CAlert color="warning">{error}</CAlert>}

      <CCard>
        <CCardHeader>
          <strong>{rows.length}</strong> contratistas
        </CCardHeader>
        <CCardBody className="p-0">
          <div className="table-responsive">
            <CTable hover responsive className="mb-0">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell scope="col">Nombre / correo</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Estrellas (prom.)</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Reseñas</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.map((c) => (
                  <CTableRow key={c.id}>
                    <CTableDataCell>
                      <div className="fw-semibold">{displayName(c)}</div>
                      <div className="small text-body-secondary">{c.email}</div>
                    </CTableDataCell>
                    <CTableDataCell>
                      {c.stars != null ? `★ ${c.stars.toFixed(2)}` : '—'}
                    </CTableDataCell>
                    <CTableDataCell>{c.reviewCount}</CTableDataCell>
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

export default AdminContractors
