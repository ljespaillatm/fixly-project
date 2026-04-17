import React, { useEffect, useMemo, useState } from 'react'
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
import { coerceServiceId } from '../../utils/serviceId'

const REQUIRED_FIELDS = ['username', 'name', 'birth_date', 'cedula', 'address', 'phone']
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

const ContractorPreferences = () => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [services, setServices] = useState([])
  const [availableZones, setAvailableZones] = useState([])
  const [profileForm, setProfileForm] = useState({
    username: '',
    name: '',
    birth_date: '',
    cedula: '',
    address: '',
    phone: '',
  })
  const [selectedServices, setSelectedServices] = useState({})
  const [selectedZones, setSelectedZones] = useState([])

  const groupedServices = useMemo(() => {
    return services.reduce((acc, service) => {
      const category = service.category || 'Sin categoría'
      const subcategory = service.subcategory || 'General'

      if (!acc[category]) {
        acc[category] = {}
      }

      if (!acc[category][subcategory]) {
        acc[category][subcategory] = []
      }

      acc[category][subcategory].push(service)
      return acc
    }, {})
  }, [services])

  useEffect(() => {
    const loadData = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const currentUser = authData?.user

      if (!currentUser) {
        window.location.href = '/#/login'
        return
      }

      setUser(currentUser)

      const [{ data: profile, error: profileError }, { data: serviceData, error: servicesError }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single(),
          supabase.from('services').select('*').order('category'),
        ])

      if (profileError || !profile) {
        setErrorMessage(profileError?.message || 'No se pudo cargar tu perfil.')
        setIsLoading(false)
        return
      }

      if (profile.role !== 'contractor') {
        window.location.href = '/#/'
        return
      }

      setProfileForm({
        username: profile.username || '',
        name: profile.name || '',
        birth_date: profile.birth_date || '',
        cedula: profile.cedula || '',
        address: profile.address || '',
        phone: profile.phone || '',
      })

      if (servicesError) {
        setErrorMessage(servicesError.message)
        setIsLoading(false)
        return
      }

      const normalizedServices = (serviceData || []).map((service) => ({
        ...service,
        title: service.title || service.name || `Servicio ${service.id}`,
        category: service.category || 'Sin categoría',
        subcategory: service.subcategory || 'General',
      }))
      setServices(normalizedServices)

      const [{ data: contractorServices }, { data: contractorZones }] =
        await Promise.all([
          supabase
            .from('contractor_services')
            .select('service_id, estimated_duration_minutes, hourly_rate')
            .eq('contractor_id', currentUser.id),
          supabase.from('contractor_zones').select('zone').eq('contractor_id', currentUser.id),
        ])

      const serviceMap = (contractorServices || []).reduce((acc, item) => {
        acc[item.service_id] = {
          durationHours: item.estimated_duration_minutes
            ? String(Number(item.estimated_duration_minutes) / 60)
            : '',
          hourlyRate: String(item.hourly_rate || ''),
        }
        return acc
      }, {})

      setSelectedServices(serviceMap)
      setSelectedZones((contractorZones || []).map((item) => item.zone))

      const zones = new Set([
        ...SECTORES_DN,
        ...(contractorZones || []).map((item) => item.zone).filter(Boolean),
      ])
      setAvailableZones(Array.from(zones).sort())

      setIsLoading(false)
    }

    loadData()
  }, [])

  const onProfileFieldChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleService = (serviceId) => {
    setSelectedServices((prev) => {
      if (prev[serviceId]) {
        const next = { ...prev }
        delete next[serviceId]
        return next
      }

      return {
        ...prev,
        [serviceId]: {
          durationHours: '',
          hourlyRate: '',
        },
      }
    })
  }

  const updateDurationHours = (serviceId, value) => {
    setSelectedServices((prev) => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        durationHours: value,
      },
    }))
  }

  const updateHourlyRate = (serviceId, value) => {
    setSelectedServices((prev) => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        hourlyRate: value,
      },
    }))
  }

  const toggleZone = (zone) => {
    setSelectedZones((prev) => {
      if (prev.includes(zone)) {
        return prev.filter((selectedZone) => selectedZone !== zone)
      }

      return [...prev, zone]
    })
  }

  const validate = () => {
    for (const field of REQUIRED_FIELDS) {
      if (!profileForm[field]?.trim()) {
        return 'Completa todos los datos personales requeridos.'
      }
    }

    const serviceIds = Object.keys(selectedServices)
    if (!serviceIds.length) {
      return 'Selecciona al menos un servicio.'
    }

    for (const serviceId of serviceIds) {
      const hours = Number(selectedServices[serviceId]?.durationHours)
      if (!hours || hours <= 0) {
        return 'Debes indicar duración en horas para cada servicio seleccionado.'
      }

      const hourlyRate = Number(selectedServices[serviceId]?.hourlyRate)
      if (!hourlyRate || hourlyRate <= 0) {
        return 'Debes indicar una tarifa por hora para cada servicio seleccionado.'
      }
    }

    const trimmedZones = selectedZones
      .map((z) => (typeof z === 'string' ? z.trim() : ''))
      .filter(Boolean)
    if (!trimmedZones.length) {
      return 'Selecciona al menos una zona.'
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

    const zoneRows = selectedZones
      .map((zone) => (typeof zone === 'string' ? zone.trim() : ''))
      .filter(Boolean)
      .map((zone) => ({
        contractor_id: user.id,
        zone,
      }))

    if (!zoneRows.length) {
      setErrorMessage('Selecciona al menos una zona válida.')
      setIsSaving(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        role: 'contractor',
        username: profileForm.username.trim(),
        name: profileForm.name.trim(),
        birth_date: profileForm.birth_date,
        cedula: profileForm.cedula.trim(),
        address: profileForm.address.trim(),
        phone: profileForm.phone.trim(),
        onboarding_completed: true,
      },
      { onConflict: 'id' },
    )

    if (profileError) {
      setErrorMessage(profileError.message)
      setIsSaving(false)
      return
    }

    const { error: deleteServicesError } = await supabase
      .from('contractor_services')
      .delete()
      .eq('contractor_id', user.id)

    if (deleteServicesError) {
      setErrorMessage(deleteServicesError.message)
      setIsSaving(false)
      return
    }

    const serviceRows = Object.entries(selectedServices)
      .map(([serviceId, config]) => ({
        contractor_id: user.id,
        service_id: coerceServiceId(serviceId),
        estimated_duration_minutes: Math.round(Number(config.durationHours) * 60),
        hourly_rate: Number(config.hourlyRate),
      }))
      .filter((row) => row.service_id != null)

    if (serviceRows.length !== Object.keys(selectedServices).length) {
      setErrorMessage(
        'Uno o más servicios tienen un ID inválido. Recarga la página y vuelve a seleccionar los servicios.',
      )
      setIsSaving(false)
      return
    }

    const { error: insertServicesError } = await supabase
      .from('contractor_services')
      .insert(serviceRows)

    if (insertServicesError) {
      setErrorMessage(insertServicesError.message)
      setIsSaving(false)
      return
    }

    const { error: deleteZonesError } = await supabase
      .from('contractor_zones')
      .delete()
      .eq('contractor_id', user.id)

    if (deleteZonesError) {
      setErrorMessage(deleteZonesError.message)
      setIsSaving(false)
      return
    }

    const { error: insertZonesError } = await supabase.from('contractor_zones').insert(zoneRows)

    if (insertZonesError) {
      setErrorMessage(insertZonesError.message)
      setIsSaving(false)
      return
    }

    const { data: verifyZones, error: verifyZonesError } = await supabase
      .from('contractor_zones')
      .select('zone')
      .eq('contractor_id', user.id)

    if (verifyZonesError) {
      setErrorMessage(
        `Las zonas se enviaron pero no se pudieron leer de vuelta (${verifyZonesError.message}). Revisa RLS de contractor_zones.`,
      )
      setIsSaving(false)
      return
    }

    const savedNames = new Set((verifyZones || []).map((z) => (z.zone || '').trim()))
    const expectedNames = new Set(zoneRows.map((z) => z.zone))
    const missing = [...expectedNames].filter((z) => !savedNames.has(z))
    if (missing.length) {
      setErrorMessage(
        `Las zonas no coinciden tras guardar (faltan: ${missing.join(', ')}). Revisa RLS o duplicados en contractor_zones.`,
      )
      setIsSaving(false)
      return
    }

    setSuccessMessage(
      `Preferencias guardadas (${serviceRows.length} servicios, ${zoneRows.length} zonas). Redirigiendo…`,
    )
    setIsSaving(false)
    window.setTimeout(() => {
      window.location.href = '/#/contractor/dashboard'
    }, 900)
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
        <CCol md={10} lg={9}>
          <CCard>
            <CCardHeader>
              <strong>Contractor Preferences</strong>
            </CCardHeader>
            <CCardBody>
              {errorMessage && <CAlert color="danger">{errorMessage}</CAlert>}
              {successMessage && <CAlert color="success">{successMessage}</CAlert>}
              <CForm onSubmit={handleSubmit}>
                <h5 className="mb-3">Datos personales</h5>
                <CRow>
                  <CCol md={6} className="mb-3">
                    <CFormLabel>Username</CFormLabel>
                    <CFormInput
                      value={profileForm.username}
                      onChange={(event) => onProfileFieldChange('username', event.target.value)}
                      required
                    />
                  </CCol>
                  <CCol md={6} className="mb-3">
                    <CFormLabel>Nombre completo</CFormLabel>
                    <CFormInput
                      value={profileForm.name}
                      onChange={(event) => onProfileFieldChange('name', event.target.value)}
                      required
                    />
                  </CCol>
                  <CCol md={6} className="mb-3">
                    <CFormLabel>Fecha de nacimiento</CFormLabel>
                    <CFormInput
                      type="date"
                      value={profileForm.birth_date}
                      onChange={(event) => onProfileFieldChange('birth_date', event.target.value)}
                      required
                    />
                  </CCol>
                  <CCol md={6} className="mb-3">
                    <CFormLabel>Cedula</CFormLabel>
                    <CFormInput
                      value={profileForm.cedula}
                      onChange={(event) => onProfileFieldChange('cedula', event.target.value)}
                      required
                    />
                  </CCol>
                  <CCol md={8} className="mb-3">
                    <CFormLabel>Direccion</CFormLabel>
                    <CFormInput
                      value={profileForm.address}
                      onChange={(event) => onProfileFieldChange('address', event.target.value)}
                      required
                    />
                  </CCol>
                  <CCol md={4} className="mb-3">
                    <CFormLabel>Telefono</CFormLabel>
                    <CFormInput
                      value={profileForm.phone}
                      onChange={(event) => onProfileFieldChange('phone', event.target.value)}
                      required
                    />
                  </CCol>
                </CRow>

                <h5 className="mb-3 mt-3">Servicios y duracion estimada</h5>
                {Object.keys(groupedServices).length === 0 && (
                  <p className="text-body-secondary">No hay servicios disponibles.</p>
                )}
                {Object.entries(groupedServices).map(([category, subcategoryMap]) => (
                  <div key={category} className="mb-3">
                    <h6 className="mb-2">{category}</h6>
                    {Object.entries(subcategoryMap).map(([subcategory, items]) => (
                      <div key={`${category}-${subcategory}`} className="mb-2 ps-2">
                        <p className="mb-1 text-body-secondary">{subcategory}</p>
                        {items.map((service) => {
                          const isChecked = selectedServices[service.id] !== undefined
                          return (
                            <div key={service.id} className="d-flex align-items-center mb-2">
                              <input
                                type="checkbox"
                                className="form-check-input me-2"
                                checked={isChecked}
                                onChange={() => toggleService(service.id)}
                              />
                              <span className="me-3">{service.title}</span>
                              {isChecked && (
                                <div className="d-flex gap-2">
                                  <CFormInput
                                    type="number"
                                    min="0.5"
                                    step="0.5"
                                    placeholder="Horas"
                                    value={selectedServices[service.id]?.durationHours || ''}
                                    onChange={(event) =>
                                      updateDurationHours(service.id, event.target.value)
                                    }
                                    style={{ maxWidth: '120px' }}
                                    required
                                  />
                                  <CFormInput
                                    type="number"
                                    min="1"
                                    placeholder="Precio"
                                    value={selectedServices[service.id]?.hourlyRate || ''}
                                    onChange={(event) =>
                                      updateHourlyRate(service.id, event.target.value)
                                    }
                                    style={{ maxWidth: '140px' }}
                                    required
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                ))}

                <h5 className="mb-3 mt-3">Zonas</h5>
                {availableZones.length === 0 && (
                  <p className="text-body-secondary">
                    No hay zonas precargadas. Inserta zonas de clientes o zonas de referencia.
                  </p>
                )}
                <div className="d-flex flex-wrap gap-3">
                  {availableZones.map((zone) => (
                    <label key={zone} className="d-flex align-items-center gap-2">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedZones.includes(zone)}
                        onChange={() => toggleZone(zone)}
                      />
                      <span>{zone}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-4">
                  <CButton color="primary" type="submit" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar preferencias'}
                  </CButton>
                </div>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default ContractorPreferences
