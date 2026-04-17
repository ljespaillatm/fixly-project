import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilSettings, cilBell, cilCode, cilCreditCard } from '@coreui/icons'
import { CNavItem } from '@coreui/react'

const clientNavigation = [
  {
    component: CNavItem,
    name: 'Preferencias',
    to: '/client/preferences',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Notificaciones',
    to: '/notifications/alerts',
    icon: <CIcon icon={cilBell} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Generar código',
    to: '/client/codigo-cierre',
    icon: <CIcon icon={cilCode} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Pagos',
    to: '/client/pagos',
    icon: <CIcon icon={cilCreditCard} customClassName="nav-icon" />,
  },
]

export default clientNavigation
