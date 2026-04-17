import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilList, cilStar, cilSettings } from '@coreui/icons'
import { CNavItem } from '@coreui/react'

const contractorNavigation = [
  {
    component: CNavItem,
    name: 'Bookings',
    to: '/contractor/dashboard',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Reviews',
    to: '/contractor/dashboard',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Edit Preferences',
    to: '/contractor/preferences',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
  },
]

export default contractorNavigation
