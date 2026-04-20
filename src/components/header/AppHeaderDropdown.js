import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CAvatar,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilCreditCard,
  cilEnvelopeOpen,
  cilList,
  cilLockLocked,
  cilPeople,
  cilSettings,
  cilTrash,
  cilUser,
} from '@coreui/icons'

import { supabase } from '../../supabaseClient'

const AppHeaderDropdown = () => {
  const [role, setRole] = useState(null)
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) {
        setRole(null)
        setEmail('')
        setReady(true)
        return
      }
      setEmail(user.email || '')
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      setRole(profile?.role || 'client')
      setReady(true)
    }

    load()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load()
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/#/'
  }

  const initial = (email || '?').trim().charAt(0).toUpperCase() || '?'

  const menuForRole = () => {
    if (role === 'contractor') {
      return (
        <>
          <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">Contratista</CDropdownHeader>
          <CDropdownItem as={Link} to="/contractor/dashboard">
            <CIcon icon={cilList} className="me-2" />
            Reservas (bookings)
          </CDropdownItem>
          <CDropdownItem as={Link} to="/contractor/preferences">
            <CIcon icon={cilUser} className="me-2" />
            Perfil (tus datos)
          </CDropdownItem>
          <CDropdownItem as={Link} to="/contractor/preferences">
            <CIcon icon={cilSettings} className="me-2" />
            Preferencias y servicios
          </CDropdownItem>
        </>
      )
    }

    if (role === 'admin') {
      return (
        <>
          <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">Administración</CDropdownHeader>
          <CDropdownItem as={Link} to="/admin/usuarios">
            <CIcon icon={cilPeople} className="me-2" />
            Usuarios
          </CDropdownItem>
          <CDropdownItem as={Link} to="/admin/pagos">
            <CIcon icon={cilCreditCard} className="me-2" />
            Pagos
          </CDropdownItem>
          <CDropdownItem as={Link} to="/admin/gestion">
            <CIcon icon={cilTrash} className="me-2" />
            Gestión
          </CDropdownItem>
        </>
      )
    }

    // client (default)
    return (
      <>
        <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">Cliente</CDropdownHeader>
        <CDropdownItem as={Link} to="/notifications/alerts">
          <CIcon icon={cilBell} className="me-2" />
          Notificaciones
          <span className="d-block small text-body-secondary ms-4">Reservas pendientes, aceptadas o rechazadas</span>
        </CDropdownItem>
        <CDropdownItem as={Link} to="/my-bookings">
          <CIcon icon={cilEnvelopeOpen} className="me-2" />
          Mensajes y chat
          <span className="d-block small text-body-secondary ms-4">Chats con contratistas en reservas activas</span>
        </CDropdownItem>
        <CDropdownItem as={Link} to="/client/preferences">
          <CIcon icon={cilUser} className="me-2" />
          Perfil
          <span className="d-block small text-body-secondary ms-4">Resumen de tus datos</span>
        </CDropdownItem>
        <CDropdownItem as={Link} to="/client/preferences">
          <CIcon icon={cilSettings} className="me-2" />
          Preferencias
          <span className="d-block small text-body-secondary ms-4">Zona y datos de contacto</span>
        </CDropdownItem>
        <CDropdownItem as={Link} to="/client/pagos">
          <CIcon icon={cilCreditCard} className="me-2" />
          Pagos
          <span className="d-block small text-body-secondary ms-4">Depósitos y saldos con tarjeta</span>
        </CDropdownItem>
      </>
    )
  }

  if (!ready) {
    return (
      <div className="nav-item py-1 px-2">
        <span className="spinner-border spinner-border-sm" role="status" />
      </div>
    )
  }

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <CAvatar color="primary" textColor="white" size="md">
          {initial}
        </CAvatar>
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        {menuForRole()}
        <CDropdownDivider />
        <CDropdownItem as="button" type="button" onClick={handleLogout}>
          <CIcon icon={cilLockLocked} className="me-2" />
          Cerrar sesión
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
