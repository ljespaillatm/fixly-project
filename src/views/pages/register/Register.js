import React, { useState } from 'react'
import { supabase } from '../../../supabaseClient'
import {
  CButton,
  CCard,
  CCardBody,
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

const Register = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [role, setRole] = useState('client')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password !== repeatPassword) {
      alert('Las contraseñas no coinciden ❌')
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      alert(error.message)
      return
    }

    const user = data.user

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: user.id,
          email,
          role,
          onboarding_completed: false,
        },
      ])

    if (profileError) {
      alert(profileError.message)
      return
    }

    alert('Usuario registrado correctamente ✅')

    await supabase.auth.signInWithPassword({
      email,
      password,
    })

    window.location.href =
      role === 'contractor' ? '/#/contractor/preferences' : '/#/client/preferences'
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={9} lg={7} xl={6}>
            <CCard className="mx-4">
              <CCardBody className="p-4">
                <CForm onSubmit={handleSubmit}>
                  <h1>Registro</h1>

                  {/* EMAIL */}
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilUser} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Email"
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </CInputGroup>

                  {/* ROLE */}
                  <div className="mb-3">
                    <select
                      className="form-control"
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="client">Cliente</option>
                      <option value="contractor">Contratista</option>
                    </select>
                  </div>

                  {/* PASSWORD */}
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      type="password"
                      placeholder="Password"
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </CInputGroup>

                  {/* REPEAT PASSWORD */}
                  <CInputGroup className="mb-4">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      type="password"
                      placeholder="Repeat password"
                      onChange={(e) => setRepeatPassword(e.target.value)}
                    />
                  </CInputGroup>

                  <div className="d-grid">
                    <CButton color="success" type="submit">
                      Crear Cuenta
                    </CButton>
                  </div>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Register