import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'

import {
  CCard,
  CCardBody,
  CCardTitle,
  CCol,
  CRow,
  CContainer,
} from '@coreui/react'

const Home = () => {
  const navigate = useNavigate()

  const [categories, setCategories] = useState([])
  const [userZone, setUserZone] = useState('')
  const [contractors, setContractors] = useState([])
  const [ratingsMap, setRatingsMap] = useState({})

  useEffect(() => {
    console.log('[Home] mount')
    loadCategories()
    loadUserZoneAndContractors()

    return () => {
      console.log('[Home] unmount')
    }
  }, [])

  useEffect(() => {
    console.log('[Home] categories state updated:', categories)
  }, [categories])

  const setCategoriesWithLog = (nextCategories, reason) => {
    console.log('[Home] setCategories called:', { reason, nextCategories })
    setCategories(nextCategories)
  }

  async function loadCategories() {
    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select('id, category')

    console.log('[Home] services query result:', { servicesData, servicesError })

    if (servicesError || !servicesData) {
      console.error('Error loading services for Home categories:', servicesError)
      // Keep last known categories on failure to avoid flicker/disappear issues.
      return
    }

    const allCategories = [
      ...new Set(
        servicesData
          .map((item) => item.category)
          .filter((category) => typeof category === 'string' && category.trim().length > 0),
      ),
    ]
    console.log('[Home] computed categories:', allCategories)
    // Clear categories only when we have a real successful empty result.
    setCategoriesWithLog(allCategories, 'services query success')
  }

  async function loadUserZoneAndContractors() {
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData?.user

    if (!currentUser) {
      setContractors([])
      setUserZone('')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('zone')
      .eq('id', currentUser.id)
      .single()

    const zone = (profile?.zone || '').trim()
    setUserZone(zone)

    if (!zone) {
      setContractors([])
      return
    }

    const { data: zonesRows, error: zonesError } = await supabase
      .from('contractor_zones')
      .select('contractor_id')
      .ilike('zone', zone)

    if (zonesError || !zonesRows?.length) {
      if (zonesError) console.error('[Home] contractor_zones query failed:', zonesError)
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
      if (coverageError) console.error('[Home] contractor_services query failed:', coverageError)
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
      if (profError) console.error('[Home] profiles query failed:', profError)
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

  return (
    <CContainer className="mt-4">

      {/* 🔥 CATEGORÍAS con cobertura real en la zona del cliente */}
      <h2 className="mb-4">Categorías</h2>

      <CRow>
        {categories.length === 0 ? (
          <p>No hay categorías...</p>
        ) : (
          categories.map(cat => (
            <CCol md={4} key={cat} className="mb-4">
              <CCard
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/category/${cat}`)}
              >
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
          {/* 🔹 CONTRATISTAS con al menos un servicio + zona compatible */}
          <h2 className="mt-5 mb-4">
            Contratistas en tu zona ({userZone})
          </h2>

          <CRow>
            {contractors.length === 0 ? (
              <p>No hay contratistas en tu zona</p>
            ) : (
              contractors.map(c => (
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