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
  return '—'
}

const AdminUsers = () => {
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

      const { data, error: qErr } = await supabase
        .from('profiles')
        .select('id, email, role, name, username, first_name, last_name, phone, onboarding_completed')
        .order('email', { ascending: true })

      if (qErr) {
        setError(qErr.message)
        setRows([])
      } else {
        setRows(data || [])
      }
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
      <h2 className="mb-3">Usuarios</h2>
      <p className="text-body-secondary mb-4">
        Listado de cuentas registradas en Fixly (perfil público en base de datos).
      </p>

      {error && <CAlert color="danger">{error}</CAlert>}

      <CCard>
        <CCardHeader>
          <strong>{rows.length}</strong> usuarios
        </CCardHeader>
        <CCardBody className="p-0">
          <div className="table-responsive">
            <CTable hover responsive className="mb-0">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell scope="col">Correo</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Nombre</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Rol</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Teléfono</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Onboarding</CTableHeaderCell>
                  <CTableHeaderCell scope="col">ID</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.map((p) => (
                  <CTableRow key={p.id}>
                    <CTableDataCell>{p.email || '—'}</CTableDataCell>
                    <CTableDataCell>{displayName(p)}</CTableDataCell>
                    <CTableDataCell>{p.role || '—'}</CTableDataCell>
                    <CTableDataCell>{p.phone || '—'}</CTableDataCell>
                    <CTableDataCell>{p.onboarding_completed ? 'Sí' : 'No'}</CTableDataCell>
                    <CTableDataCell>
                      <code className="small">{p.id}</code>
                    </CTableDataCell>
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

export default AdminUsers
