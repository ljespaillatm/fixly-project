import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  CButton,
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  useColorModes,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilContrast, cilMoon, cilSun } from '@coreui/icons'

const PublicHeader = () => {
  const headerRef = useRef()
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')

  useEffect(() => {
    const handleScroll = () => {
      headerRef.current?.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    }
    document.addEventListener('scroll', handleScroll)
    return () => document.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <CHeader position="sticky" className="mb-0 p-0" ref={headerRef}>
      <CContainer fluid className="border-bottom px-4 py-2 d-flex align-items-center flex-wrap gap-2">
        <Link to="/" className="text-body text-decoration-none me-auto">
          <span className="fs-3 fw-bold">Fixly</span>
        </Link>
        <div className="d-flex align-items-center gap-2 ms-auto">
          <CDropdown variant="btn-group" direction="dropstart">
            <CDropdownToggle color="ghost" size="sm" caret={false}>
              {colorMode === 'dark' ? (
                <CIcon icon={cilMoon} size="lg" />
              ) : colorMode === 'auto' ? (
                <CIcon icon={cilContrast} size="lg" />
              ) : (
                <CIcon icon={cilSun} size="lg" />
              )}
            </CDropdownToggle>
            <CDropdownMenu>
              <CDropdownItem active={colorMode === 'light'} as="button" onClick={() => setColorMode('light')}>
                <CIcon className="me-2" icon={cilSun} /> Claro
              </CDropdownItem>
              <CDropdownItem active={colorMode === 'dark'} as="button" onClick={() => setColorMode('dark')}>
                <CIcon className="me-2" icon={cilMoon} /> Oscuro
              </CDropdownItem>
              <CDropdownItem active={colorMode === 'auto'} as="button" onClick={() => setColorMode('auto')}>
                <CIcon className="me-2" icon={cilContrast} /> Sistema
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>
          <CButton color="ghost" variant="ghost" as={Link} to="/login">
            Iniciar sesión
          </CButton>
          <CButton color="primary" as={Link} to="/register">
            Registrarse
          </CButton>
        </div>
      </CContainer>
    </CHeader>
  )
}

export default React.memo(PublicHeader)
