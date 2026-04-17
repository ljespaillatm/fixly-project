import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from "../../supabaseClient"
import { coerceServiceId } from "../../utils/serviceId"
import ClientBookingForm from "../forms/ClientBookingForm"

const ServiceDetail = () => {
  const { id } = useParams()
  const serviceId = coerceServiceId(id)

  const [contractors, setContractors] = useState([])
  const [userZone, setUserZone] = useState('')
  const [user, setUser] = useState(null)
  const [discoveryNote, setDiscoveryNote] = useState('')

  // ⭐ ratings por contratista
  const [ratingsMap, setRatingsMap] = useState({})

  // ⭐ estados por contratista
  const [reviewsState, setReviewsState] = useState({})
  const [canReviewMap, setCanReviewMap] = useState({})
  const getRatingsSummary = async (contractorIds) => {
    if (!contractorIds.length) return {}

    const { data } = await supabase
      .from('reviews')
      .select('contractor_id, rating')
      .in('contractor_id', contractorIds)

    const grouped = {}
    contractorIds.forEach((contractorId) => {
      grouped[contractorId] = { avg: null, count: 0 }
    })

    ;(data || []).forEach((review) => {
      if (!grouped[review.contractor_id]) {
        grouped[review.contractor_id] = { avg: null, count: 0, sum: 0 }
      }
    })

    contractorIds.forEach((contractorId) => {
      const list = (data || []).filter((review) => review.contractor_id === contractorId)
      if (!list.length) return

      const sum = list.reduce((acc, review) => acc + Number(review.rating || 0), 0)
      grouped[contractorId] = {
        avg: sum / list.length,
        count: list.length,
      }
    })

    return grouped
  }

  const getReviewEligibility = async (contractorIds, userId) => {
    if (!userId || !contractorIds.length || serviceId == null) {
      setCanReviewMap({})
      return
    }

    const { data } = await supabase
      .from('bookings')
      .select('contractor_id')
      .eq('user_id', userId)
      .eq('service_id', serviceId)
      .eq('status', 'completed')
      .in('contractor_id', contractorIds)

    const eligibleIds = new Set((data || []).map((row) => row.contractor_id))
    const eligibilityMap = {}
    contractorIds.forEach((contractorId) => {
      eligibilityMap[contractorId] = eligibleIds.has(contractorId)
    })
    setCanReviewMap(eligibilityMap)
  }


  // -----------------------------
  // 🔹 USER + ZONA
  // -----------------------------
  useEffect(() => {
    const getUserData = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return

      setUser(data.user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('zone')
        .eq('id', data.user.id)
        .single()

      if (profile) setUserZone((profile.zone || '').trim())
    }

    getUserData()
  }, [])

  // -----------------------------
  // 🔥 CONTRATISTAS
  // -----------------------------
  useEffect(() => {
    if (serviceId == null) {
      setContractors([])
      setRatingsMap({})
      setCanReviewMap({})
      setDiscoveryNote('')
      return
    }
    if (!userZone) return

    const getContractors = async () => {
      setDiscoveryNote('')
      const zoneKey = (userZone || '').trim()
      if (!zoneKey) return

      const { data: zonesRows, error: zonesError } = await supabase
        .from('contractor_zones')
        .select('contractor_id')
        .ilike('zone', zoneKey)

      if (zonesError) {
        console.error('[ServiceDetail] contractor_zones:', zonesError)
        setContractors([])
        setRatingsMap({})
        setCanReviewMap({})
        setDiscoveryNote(zonesError.message || 'No se pudo leer cobertura por zona.')
        return
      }

      if (!zonesRows?.length) {
        setContractors([])
        setRatingsMap({})
        setCanReviewMap({})
        setDiscoveryNote(
          'No hay contratistas registrados en tu sector en la base de datos (tabla contractor_zones).',
        )
        return
      }

      const contractorIdsInZone = [...new Set(zonesRows.map((r) => r.contractor_id))]

      let { data: csRows, error: csError } = await supabase
        .from('contractor_services')
        .select('contractor_id, service_id, hourly_rate')
        .eq('service_id', serviceId)
        .in('contractor_id', contractorIdsInZone)

      if (csError) {
        console.error('[ServiceDetail] contractor_services:', csError)
        setContractors([])
        setRatingsMap({})
        setCanReviewMap({})
        setDiscoveryNote(csError.message || 'No se pudo leer servicios de contratistas.')
        return
      }

      if (!csRows?.length) {
        const { data: wideRows, error: wideErr } = await supabase
          .from('contractor_services')
          .select('contractor_id, service_id, hourly_rate')
          .in('contractor_id', contractorIdsInZone)

        if (!wideErr && wideRows?.length) {
          const want = String(serviceId)
          csRows = wideRows.filter((r) => String(r.service_id) === want)
        }
      }

      if (!csRows?.length) {
        setContractors([])
        setRatingsMap({})
        setCanReviewMap({})
        setDiscoveryNote(
          'Hay contratistas en tu sector, pero ninguno tiene este servicio activo (contractor_services). El contratista debe guardarlo en Preferencias.',
        )
        return
      }

      const byContractor = new Map()
      csRows.forEach((row) => {
        if (!byContractor.has(row.contractor_id)) {
          byContractor.set(row.contractor_id, {
            service_id: row.service_id,
            hourly_rate: row.hourly_rate,
          })
        }
      })
      const contractorIds = [...byContractor.keys()]

      const { data: profRows, error: profError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', contractorIds)

      if (profError) {
        console.error('[ServiceDetail] profiles:', profError)
        setContractors([])
        setRatingsMap({})
        setCanReviewMap({})
        setDiscoveryNote(
          `${profError.message} — Revisa la política RLS de profiles (lectura de filas de contratistas con contractor_services).`,
        )
        return
      }

      const profileById = new Map((profRows || []).map((p) => [p.id, p]))
      const contractorsData = contractorIds
        .filter((cid) => profileById.has(cid))
        .map((cid) => {
          const row = byContractor.get(cid)
          return {
            id: cid,
            email: profileById.get(cid).email,
            service_id: row.service_id,
            hourly_rate: row.hourly_rate,
            zone: userZone,
          }
        })

      if (!contractorsData.length) {
        setContractors([])
        setRatingsMap({})
        setCanReviewMap({})
        setDiscoveryNote(
          'Hay ofertas de servicio, pero no se pudieron cargar los perfiles (RLS en profiles o IDs distintos a profiles.id).',
        )
        return
      }

      const ratingsSummary = await getRatingsSummary(contractorsData.map((c) => c.id))

      const sortedContractors = contractorsData.sort((a, b) => {
        const ratingA = ratingsSummary[a.id]?.avg ?? -1
        const ratingB = ratingsSummary[b.id]?.avg ?? -1
        return ratingB - ratingA
      })

      const ratingLabelMap = {}
      contractorsData.forEach((contractor) => {
        const rating = ratingsSummary[contractor.id]
        ratingLabelMap[contractor.id] = rating?.avg ? rating.avg.toFixed(1) : 'Nuevo'
      })

      setContractors(sortedContractors)
      setRatingsMap(ratingLabelMap)
      await getReviewEligibility(
        contractorsData.map((c) => c.id),
        user?.id,
      )
    }

    getContractors()
  }, [userZone, serviceId, user?.id])

  // -----------------------------
  // ⭐ FETCH RATINGS
  // -----------------------------
  // -----------------------------
  // ⭐ HANDLE REVIEW CHANGE
  // -----------------------------
  const handleChange = (contractorId, field, value) => {
    setReviewsState(prev => ({
      ...prev,
      [contractorId]: {
        ...prev[contractorId],
        [field]: value
      }
    }))
  }

  // -----------------------------
  // ⭐ ENVIAR REVIEW
  // -----------------------------
  const handleReview = async (contractor) => {
    if (!user) {
      alert("Debes iniciar sesión")
      return
    }

    if (!canReviewMap[contractor.id]) {
      alert('Solo puedes dejar reseña cuando tengas una reserva completada con este contratista.')
      return
    }

    const reviewData = reviewsState[contractor.id] || {}

    const { error } = await supabase
      .from('reviews')
      .insert([
        {
          contractor_id: contractor.id,
          user_id: user.id,
          rating: parseInt(reviewData.rating || 5),
          comment: reviewData.comment || ''
        }
      ])

    if (!error) {
      alert("Review enviada ⭐")

      setReviewsState(prev => ({
        ...prev,
        [contractor.id]: { rating: 5, comment: '' }
      }))

      const contractorIds = contractors.map((item) => item.id)
      const ratingsSummary = await getRatingsSummary(contractorIds)
      const updatedRatings = {}
      contractorIds.forEach((contractorId) => {
        const rating = ratingsSummary[contractorId]
        updatedRatings[contractorId] = rating?.avg ? rating.avg.toFixed(1) : 'Nuevo'
      })
      setRatingsMap(updatedRatings)
    } else {
      alert("Error al enviar review ❌")
      console.log(error)
    }
  }

  // -----------------------------
  // UI
  // -----------------------------
  if (serviceId == null) {
    return (
      <div style={{ padding: '20px' }}>
        <p>El enlace del servicio no es válido.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Contratistas en tu zona ({userZone || '—'})</h2>

      {user && !userZone && (
        <p style={{ color: '#666', marginBottom: 16 }}>
          Para ver contratistas cerca de ti, configura tu sector en{' '}
          <a href="/#/client/preferences">Preferencias del cliente</a>.
        </p>
      )}

      {contractors.length === 0 ? (
        <div>
          <p>No hay contratistas disponibles.</p>
          {discoveryNote && (
            <p style={{ color: '#555', marginTop: 8, maxWidth: 640 }}>{discoveryNote}</p>
          )}
        </div>
      ) : (
        contractors.map(c => {
          const review = reviewsState[c.id] || {}

          return (
            <div
              key={c.id}
              style={{
                border: '1px solid #ccc',
                padding: '15px',
                marginBottom: '20px'
              }}
            >
              <h4>{c.email}</h4>
              <p>Zona: {c.zone}</p>
              {c.hourly_rate != null && Number(c.hourly_rate) > 0 && (
                <p>
                  <strong>Tarifa (preferencias del contratista):</strong> RD${' '}
                  {Number(c.hourly_rate).toLocaleString('es-DO')} / hora
                </p>
              )}

              {/* ⭐ RATING */}
              <p>⭐ {ratingsMap[c.id] || "Nuevo"}</p>

              {/* 🔥 BOOKING */}
              {user && (
                <ClientBookingForm
                  contractorId={c.id}
                  serviceId={c.service_id}
                  userId={user.id}
                />
              )}

              {canReviewMap[c.id] && (
                <>
                  <hr />
                  <h5>Dejar reseña</h5>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 8 }}>
                    Ya completaste un servicio con este contratista para esta categoría.
                  </p>
                  <select
                    value={review.rating || 5}
                    onChange={(e) =>
                      handleChange(c.id, "rating", e.target.value)
                    }
                  >
                    <option value="5">⭐⭐⭐⭐⭐</option>
                    <option value="4">⭐⭐⭐⭐</option>
                    <option value="3">⭐⭐⭐</option>
                    <option value="2">⭐⭐</option>
                    <option value="1">⭐</option>
                  </select>
                  <br /><br />
                  <textarea
                    placeholder="Comentario"
                    value={review.comment || ''}
                    onChange={(e) =>
                      handleChange(c.id, "comment", e.target.value)
                    }
                    style={{ width: '100%', height: '60px' }}
                  />
                  <br /><br />
                  <button type="button" onClick={() => handleReview(c)}>
                    Enviar reseña
                  </button>
                </>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

export default ServiceDetail