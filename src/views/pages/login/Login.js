import React, { useState } from 'react'
import { supabase } from 'src/supabaseClient'
import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const redirectAfterLogin = (profile) => {
    if (!profile) {
      window.location.href = '/#/'
      return
    }

    if (profile.role === 'client') {
      window.location.href = profile.onboarding_completed ? '/#/' : '/#/client/preferences'
      return
    }

    if (profile.role === 'contractor') {
      window.location.href = profile.onboarding_completed
        ? '/#/contractor/dashboard'
        : '/#/contractor/preferences'
      return
    }

    if (profile.role === 'admin') {
      window.location.href = '/#/admin/usuarios'
      return
    }

    window.location.href = '/#/'
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('email not confirmed') || msg.includes('confirm')) {
        alert(
          'Debes confirmar el correo antes de entrar. Revisa tu bandeja (y spam) por el enlace de Fixly.',
        )
      } else {
        alert(error.message || 'Credenciales incorrectas ❌')
      }
      return
    }

    const user = data.user

    // 🔍 Buscar rol
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('id', user.id)
      .single()

    redirectAfterLogin(profile)
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8}>
            <CCardGroup>
              <CCard className="p-4">
                <CCardBody>
                  <CForm onSubmit={handleLogin}>
                    <h1>Login</h1>

                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        placeholder="Email"
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </CInputGroup>

                    <CInputGroup className="mb-4">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="Password"
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </CInputGroup>

                    <CButton type="submit">Login</CButton>
                  </CForm>
                </CCardBody>
              </CCard>

              <CCard className="text-white bg-primary py-5" style={{ width: '44%' }}>
                <CCardBody className="text-center">
                  <h2>Sign up</h2>
                  <a href="/#/register">
                    <CButton color="light">Register</CButton>
                  </a>
                </CCardBody>
              </CCard>
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login