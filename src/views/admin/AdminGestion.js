import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CContainer,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
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

const AdminGestion = () => {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [target, setTarget] = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data, error: qErr } = await supabase
      .from('profiles')
      .select('id, email, role, name, username, first_name, last_name')
      .in('role', ['client', 'contractor'])
      .order('email', { ascending: true })

    if (qErr) {
      setError(qErr.message)
      setRows([])
    } else {
      setRows(data || [])
    }
  }

  useEffect(() => {
    const run = async () => {
      const guard = await fetchAdminGuard(supabase)
      if (!guard.ok) {
        window.location.href = guard.redirect
        return
      }
      await load()
      setLoading(false)
    }

    run()
  }, [])

  const openDelete = (p) => {
    setTarget(p)
    setConfirmText('')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setTarget(null)
    setConfirmText('')
  }

  const executeDelete = async () => {
    if (!target) return
    if (confirmText.trim().toUpperCase() !== 'ELIMINAR') {
      alert('Escribe la palabra ELIMINAR para confirmar.')
      return
    }

    setBusy(true)
    setError('')
    const { data, error: fnErr } = await supabase.functions.invoke('admin-delete-user', {
      body: { userId: target.id },
    })
    setBusy(false)

    if (fnErr) {
      setError(fnErr.message)
      return
    }
    if (data?.error) {
      setError(data.error)
      return
    }

    closeModal()
    await load()
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
      <h2 className="mb-3">Gestión</h2>
      <CAlert color="danger" className="mb-4">
        <strong>Uso excepcional.</strong> Eliminar un usuario borra la cuenta de autenticación y los datos
        enlazados según las reglas de la base (reservas, códigos, etc.). No puedes eliminar tu propia cuenta
        ni cuentas con rol administrador desde esta lista.
      </CAlert>

      {error && <CAlert color="warning">{error}</CAlert>}

      <CCard>
        <CCardHeader>
          <strong>{rows.length}</strong> usuarios (clientes y contratistas)
        </CCardHeader>
        <CCardBody className="p-0">
          <div className="table-responsive">
            <CTable hover responsive className="mb-0">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell scope="col">Correo</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Nombre</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Rol</CTableHeaderCell>
                  <CTableHeaderCell scope="col" className="text-end">
                    Acción
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.map((p) => (
                  <CTableRow key={p.id}>
                    <CTableDataCell>{p.email || '—'}</CTableDataCell>
                    <CTableDataCell>{displayName(p)}</CTableDataCell>
                    <CTableDataCell>{p.role || '—'}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      <CButton color="danger" size="sm" variant="outline" onClick={() => openDelete(p)}>
                        Eliminar cuenta
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>
        </CCardBody>
      </CCard>

      <CModal visible={modalOpen} onClose={closeModal} alignment="center">
        <CModalHeader>
          <strong>Confirmar eliminación</strong>
        </CModalHeader>
        <CModalBody>
          <p>
            Vas a eliminar permanentemente la cuenta de{' '}
            <strong>{target ? target.email || target.id : ''}</strong> ({target?.role}).
          </p>
          <p className="mb-2">Para confirmar, escribe <strong>ELIMINAR</strong> (mayúsculas):</p>
          <CFormInput
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="ELIMINAR"
            autoComplete="off"
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={closeModal} disabled={busy}>
            Cancelar
          </CButton>
          <CButton color="danger" onClick={executeDelete} disabled={busy}>
            {busy ? 'Eliminando…' : 'Eliminar definitivamente'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default AdminGestion
