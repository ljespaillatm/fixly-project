import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
} from '@coreui/react'
import { supabase } from '../../supabaseClient'

const REQUIRED_FIELDS = ['first_name', 'last_name', 'cedula', 'phone', 'address', 'zone']
const SECTORES_DN = [
  'Naco',
  'Piantini',
  'Evaristo Morales',
  'Bella Vista',
  'Los Cacicazgos',
  'Mirador Sur',
  'Gazcue',
  'Zona Colonial',
  'Ensanche La Fe',
  'Ensanche Quisqueya',
  'Ensanche Julieta',
  'Ensanche Serralles',
  'Mata Hambre',
  'San Carlos',
  'Villa Juana',
  'Villa Consuelo',
  'Capotillo',
  'Cristo Rey',
  'La Zurza',
  'Los Prados',
  'El Millon',
  'Honduras del Oeste',
]

const ClientPreferences = () => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    cedula: '',
    phone: '',
    address: '',
    zone: '',
  })

  useEffect(() => {
    const loadData = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const currentUser = authData?.user

      if (!currentUser) {
        window.location.href = '/#/login'
        return
      }

      setUser(currentUser)

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, first_name, last_name, cedula, phone, address, zone')
        .eq('id', currentUser.id)
        .single()

      if (error || !profile) {
        setErrorMessage(error?.message || 'No se pudo cargar el perfil del cliente.')
        setIsLoading(false)
        return
      }

      if (profile.role !== 'client') {
        window.location.href = '/#/'
        return
      }

      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        cedula: profile.cedula || '',
        phone: profile.phone || '',
        address: profile.address || '',
        zone: profile.zone || '',
      })

      setIsLoading(false)
    }

    loadData()
  }, [])

  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validate = () => {
    for (const field of REQUIRED_FIELDS) {
      if (!formData[field]?.trim()) {
        return 'Completa todos los campos requeridos antes de continuar.'
      }
    }
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const validationError = validate()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    if (!user) {
      setErrorMessage('No se pudo identificar al usuario.')
      return
    }

    setIsSaving(true)

    const { error } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        role: 'client',
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        cedula: formData.cedula.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        zone: formData.zone.trim(),
        onboarding_completed: true,
      },
      { onConflict: 'id' },
    )

    if (error) {
      setErrorMessage(error.message)
      setIsSaving(false)
      return
    }

    setSuccessMessage('Preferencias de cliente guardadas correctamente.')
    setIsSaving(false)
    window.location.href = '/#/'
  }

  if (isLoading) {
    return (
      <div className="pt-4 text-center">
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <CContainer className="py-4">
      <CRow className="justify-content-center">
        <CCol md={8} lg={7}>
          <CCard>
            <CCardHeader>
              <strong>Preferencias del cliente</strong>
            </CCardHeader>
            <CCardBody>
              {errorMessage && <CAlert color="danger">{errorMessage}</CAlert>}
              {successMessage && <CAlert color="success">{successMessage}</CAlert>}
              <CForm onSubmit={handleSubmit}>
                <CRow>
                  <CCol md={6} className="mb-3">
                    <CFormLabel>Nombre</CFormLabel>
                    <CFormInput
                      value={formData.first_name}
                      onChange={(event) => setField('first_name', event.target.value)}
                      required
                    />
                  </CCol>
                  <CCol md={6} className="mb-3">
                    <CFormLabel>Apellido</CFormLabel>
                    <CFormInput
                      value={formData.last_name}
                      onChange={(event) => setField('last_name', event.target.value)}
                      required
                    />
                  </CCol>
                  <CCol md={6} className="mb-3">
                    <CFormLabel>Cedula</CFormLabel>
                    <CFormInput
                      value={formData.cedula}
                      onChange={(event) => setField('cedula', event.target.value)}
                      required
                    />
                  </CCol>
                  <CCol md={6} className="mb-3">
                    <CFormLabel>Telefono</CFormLabel>
                    <CFormInput
                      value={formData.phone}
                      onChange={(event) => setField('phone', event.target.value)}
                      required
                    />
                  </CCol>
                  <CCol md={8} className="mb-3">
                    <CFormLabel>Direccion</CFormLabel>
                    <CFormInput
                      value={formData.address}
                      onChange={(event) => setField('address', event.target.value)}
                      required
                    />
                  </CCol>
                  <CCol md={4} className="mb-3">
                    <CFormLabel>Zona</CFormLabel>
                    <select
                      className="form-control"
                      value={formData.zone}
                      onChange={(event) => setField('zone', event.target.value)}
                      required
                    >
                      <option value="">Selecciona tu zona</option>
                      {SECTORES_DN.map((sector) => (
                        <option key={sector} value={sector}>
                          {sector}
                        </option>
                      ))}
                    </select>
                  </CCol>
                </CRow>

                <CButton color="primary" type="submit" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar preferencias'}
                </CButton>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default ClientPreferences
