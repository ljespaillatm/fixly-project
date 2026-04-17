import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilPeople, cilStar, cilCreditCard, cilTrash } from '@coreui/icons'
import { CNavItem } from '@coreui/react'

const adminNavigation = [
  {
    component: CNavItem,
    name: 'Usuarios',
    to: '/admin/usuarios',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Contratistas',
    to: '/admin/contratistas',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Pagos',
    to: '/admin/pagos',
    icon: <CIcon icon={cilCreditCard} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Gestión',
    to: '/admin/gestion',
    icon: <CIcon icon={cilTrash} customClassName="nav-icon" />,
  },
]

export default adminNavigation
