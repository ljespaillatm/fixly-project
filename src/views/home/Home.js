import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'

import {
  CButton,
  CCard,
  CCardBody,
  CCardTitle,
  CCol,
  CContainer,
  CRow,
  CSpinner,
} from '@coreui/react'

const Home = () => {
  const navigate = useNavigate()

  const [authResolved, setAuthResolved] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  const [categories, setCategories] = useState([])
  const [userZone, setUserZone] = useState('')
  const [contractors, setContractors] = useState([])
  const [ratingsMap, setRatingsMap] = useState({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUser(data.session?.user ?? null)
      setAuthResolved(true)
    })
  }, [])

  useEffect(() => {
    if (!authResolved || !currentUser) return

    loadCategories()
    loadUserZoneAndContractorsForUser(currentUser.id)
  }, [authResolved, currentUser])

  async function loadCategories() {
    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select('id, category')

    if (servicesError || !servicesData) {
      return
    }

    const allCategories = [
      ...new Set(
        servicesData
          .map((item) => item.category)
          .filter((category) => typeof category === 'string' && category.trim().length > 0),
      ),
    ]
    setCategories(allCategories)
  }

  async function loadUserZoneAndContractorsForUser(userId) {
    const { data: profile } = await supabase.from('profiles').select('zone').eq('id', userId).single()

    const zone = (profile?.zone || '').trim()
    setUserZone(zone)

    if (!zone) {
      setContractors([])
      setRatingsMap({})
      return
    }

    const { data: zonesRows, error: zonesError } = await supabase
      .from('contractor_zones')
      .select('contractor_id')
      .ilike('zone', zone)

    if (zonesError || !zonesRows?.length) {
      setContractors([])
      setRatingsMap({})
      return
    }

    const contractorIdsInZone = [...new Set(zonesRows.map((r) => r.contractor_id))]

    const { data: csRows, error: coverageError } = await supabase
      .from('contractor_services')
      .select('service_id, contractor_id')
      .in('contractor_id', contractorIdsInZone)

    if (coverageError || !csRows?.length) {
      setContractors([])
      setRatingsMap({})
      return
    }

    const matchedContractorIds = [...new Set(csRows.map((r) => r.contractor_id))]

    const { data: profRows, error: profError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', matchedContractorIds)

    if (profError || !profRows?.length) {
      setContractors([])
      setRatingsMap({})
      return
    }

    const profileById = new Map(profRows.map((p) => [p.id, p]))
    const contractorsData = matchedContractorIds
      .filter((cid) => profileById.has(cid))
      .map((cid) => ({
        id: cid,
        email: profileById.get(cid).email,
        zone,
      }))
    const contractorIds = contractorsData.map((contractor) => contractor.id)

    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('contractor_id, rating')
      .in('contractor_id', contractorIds)

    const ratingsByContractor = {}
    contractorIds.forEach((contractorId) => {
      const contractorReviews = (reviewsData || []).filter((review) => review.contractor_id === contractorId)
      if (!contractorReviews.length) {
        ratingsByContractor[contractorId] = { avg: null, label: 'Nuevo' }
        return
      }

      const sum = contractorReviews.reduce((acc, review) => acc + Number(review.rating || 0), 0)
      const avg = sum / contractorReviews.length
      ratingsByContractor[contractorId] = {
        avg,
        label: avg.toFixed(1),
      }
    })

    const sortedContractors = contractorsData.sort((a, b) => {
      const ratingA = ratingsByContractor[a.id]?.avg ?? -1
      const ratingB = ratingsByContractor[b.id]?.avg ?? -1
      return ratingB - ratingA
    })

    const ratingLabels = {}
    contractorIds.forEach((contractorId) => {
      ratingLabels[contractorId] = ratingsByContractor[contractorId]?.label || 'Nuevo'
    })

    setContractors(sortedContractors)
    setRatingsMap(ratingLabels)
  }

  if (!authResolved) {
    return (
      <div className="py-5 text-center">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <CContainer fluid className="px-lg-5 py-5">
        <CRow className="align-items-center gy-5">
          <CCol lg={6}>
            <p className="text-body-secondary text-uppercase small fw-semibold mb-2">Marketplace de servicios</p>
            <h1 className="display-5 fw-bold mb-4">Bienvenido a Fixly</h1>
            <p className="lead text-body-secondary mb-4">
              Fixly es una plataforma que conecta a <strong>personas que necesitan un servicio</strong> con{' '}
              <strong>contratistas de confianza</strong> en su zona: plomería, electricidad, pintura y más.
              Explora categorías, reserva en pocos pasos y coordina todo desde un solo lugar.
            </p>
            <ul className="text-body-secondary mb-4">
              <li>Crea tu cuenta como cliente o contratista.</li>
              <li>Los clientes buscan por categoría y zona; los contratistas publican sus servicios.</li>
              <li>Reservas, chat y pagos con tarjeta para mayor tranquilidad.</li>
            </ul>
            <div className="d-flex flex-wrap gap-2">
              <CButton color="primary" size="lg" as={Link} to="/register">
                Registrarse gratis
              </CButton>
              <CButton color="secondary" variant="outline" size="lg" as={Link} to="/login">
                Ya tengo cuenta
              </CButton>
            </div>
          </CCol>
          <CCol lg={6}>
            <CCard className="border-0 shadow-sm bg-body-tertiary">
              <CCardBody className="p-4 p-lg-5">
                <h2 className="h5 mb-3">¿Cómo empezar?</h2>
                <ol className="text-body-secondary ps-3 mb-0">
                  <li className="mb-2">Regístrate con tu correo.</li>
                  <li className="mb-2">Completa tus preferencias (zona, datos de contacto).</li>
                  <li className="mb-2">Explora servicios o publica los tuyos si eres contratista.</li>
                  <li>Solicita una reserva y sigue el estado desde tu panel.</li>
                </ol>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    )
  }

  return (
    <CContainer className="mt-4">
      <h2 className="mb-4">Categorías</h2>

      <CRow>
        {categories.length === 0 ? (
          <p>No hay categorías...</p>
        ) : (
          categories.map((cat) => (
            <CCol md={4} key={cat} className="mb-4">
              <CCard style={{ cursor: 'pointer' }} onClick={() => navigate(`/category/${cat}`)}>
                <CCardBody>
                  <CCardTitle>{cat}</CCardTitle>
                </CCardBody>
              </CCard>
            </CCol>
          ))
        )}
      </CRow>

      {userZone && (
        <>
          <h2 className="mt-5 mb-4">Contratistas en tu zona ({userZone})</h2>

          <CRow>
            {contractors.length === 0 ? (
              <p>No hay contratistas en tu zona</p>
            ) : (
              contractors.map((c) => (
                <CCol md={4} key={c.id} className="mb-4">
                  <CCard>
                    <CCardBody>
                      <CCardTitle>{c.email}</CCardTitle>
                      <p>Zona: {c.zone}</p>
                      <p>⭐ {ratingsMap[c.id] || 'Nuevo'}</p>
                    </CCardBody>
                  </CCard>
                </CCol>
              ))
            )}
          </CRow>
        </>
      )}
    </CContainer>
  )
}

export default Home
