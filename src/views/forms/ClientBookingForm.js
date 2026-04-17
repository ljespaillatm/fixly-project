import { useEffect, useState } from "react"
import { supabase } from "../../supabaseClient"

export default function ClientBookingForm({ contractorId, serviceId, userId }) {
  const [days, setDays] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [slots] = useState(generateSlots())
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)

  // -----------------------------
  // GENERAR 7 DÍAS
  // -----------------------------
  const getNext7Days = () => {
    const arr = []

    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)

      arr.push({
        date: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("es-DO", {
          weekday: "short",
          day: "numeric"
        })
      })
    }

    return arr
  }

  // -----------------------------
  // GENERAR HORARIOS
  // -----------------------------
  function generateSlots() {
    const slots = []

    for (let h = 8; h < 18; h++) {
      slots.push(`${h.toString().padStart(2, "0")}:00`)
    }

    return slots
  }

  // -----------------------------
  // INIT
  // -----------------------------
  useEffect(() => {
    setDays(getNext7Days())
  }, [])

  // -----------------------------
  // CARGAR BOOKINGS DEL DÍA
  // -----------------------------
  const fetchBookings = async (date) => {
    setLoading(true)

    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("contractor_id", contractorId)
      .eq("booking_date", date)

    setBookings(data || [])
    setLoading(false)
  }

  // -----------------------------
  // CLICK DÍA
  // -----------------------------
  const handleDayClick = (day) => {
    setSelectedDay(day)
    fetchBookings(day.date)
  }

  // -----------------------------
  // ESTADO DEL SLOT
  // -----------------------------
  const getSlotStatus = (slot) => {
    const slotTime = new Date(`1970-01-01T${slot}`)
    let hasPendingRequest = false

    for (let b of bookings) {
      if (!b.start_time) continue

      // Confirmed bookings block every overlapping slot between start and end.
      if ((b.status === "accepted" || b.status === "in_progress") && b.end_time) {
        const start = new Date(`1970-01-01T${b.start_time}`)
        const end = new Date(`1970-01-01T${b.end_time}`)

        if (slotTime >= start && slotTime < end) {
          return "occupied"
        }
      }

      // Pending bookings are visible as requested, but do not block slot selection.
      if (b.status === "pending" && b.start_time === slot) {
        hasPendingRequest = true
      }
    }

    if (hasPendingRequest) return "pending"
    return "available"
  }

  // -----------------------------
  // CREAR SOLICITUD
  // -----------------------------
  /** DBs with NOT NULL on end_time: provisional 1h window; contractor overwrites on accept. */
  const provisionalEndTime = (startSlot) => {
    const d = new Date(`1970-01-01T${startSlot}`)
    d.setHours(d.getHours() + 1)
    return d.toTimeString().slice(0, 5)
  }

  const requestBooking = async (slot) => {
    if (!selectedDay) return

    if (!contractorId || !serviceId || !userId) {
      alert("Falta información (sesión o servicio). Recarga la página e intenta de nuevo.")
      return
    }

    const { error } = await supabase.from("bookings").insert({
      contractor_id: contractorId,
      service_id: serviceId,
      user_id: userId,
      booking_date: selectedDay.date,
      start_time: slot,
      end_time: provisionalEndTime(slot),
      status: "pending"
    })

    if (error) {
      alert(`Error creando solicitud: ${error.message}`)
      console.error(error)
      return
    }

    alert("Solicitud enviada ✔")
    fetchBookings(selectedDay.date)
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div style={{ padding: 20 }}>
      <h2>Solicitar Servicio</h2>

      {/* 7 días */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {days.map((d) => (
          <button
            key={d.date}
            onClick={() => handleDayClick(d)}
            style={{
              padding: 10,
              background: selectedDay?.date === d.date ? "#000" : "#eee",
              color: selectedDay?.date === d.date ? "#fff" : "#000"
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* slots */}
      {selectedDay && (
        <div>
          <h3>{selectedDay.label}</h3>

          {loading && <p>Cargando disponibilidad...</p>}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {slots.map((slot) => {
              const status = getSlotStatus(slot)

              return (
                <button
                  key={slot}
                  disabled={status === "occupied"}
                  onClick={() => requestBooking(slot)}
                  style={{
                    padding: 10,
                    background:
                      status === "available"
                        ? "green"
                        : status === "pending"
                        ? "orange"
                        : "gray",
                    color: "#fff",
                    cursor: status === "occupied" ? "not-allowed" : "pointer"
                  }}
                >
                  {slot}
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: 15 }}>
            <small>
              🟢 Disponible | 🟡 Solicitado | 🔴 Ocupado
            </small>
          </div>
        </div>
      )}
    </div>
  )
}