import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import ChatBox from './chat/Chatbox'

const MyBookings = () => {
  const [bookings, setBookings] = useState([])
  const [clientId, setClientId] = useState(null)

  useEffect(() => {
    getBookings()
  }, [])

  async function getBookings() {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) return

    setClientId(user.id)

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        status,
        contractor_id,
        payment_total_dop,
        payment_deposit_dop,
        payment_balance_dop,
        payment_status,
        contractor:contractor_id ( id, email ),
        service:service_id ( category )
      `)
      .eq('user_id', user.id)
      .order('booking_date', { ascending: true })

    if (!error) {
      setBookings(data || [])
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Mis Reservas</h2>

      {bookings.length === 0 ? (
        <p>No tienes reservas</p>
      ) : (
        bookings.map((b) => (
          <div
            key={b.id}
            style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}
          >
            <p><strong>Servicio:</strong> {b.service?.category}</p>
            <p><strong>Contratista:</strong> {b.contractor?.email}</p>
            <p><strong>Fecha:</strong> {b.booking_date}</p>
            <p><strong>Inicio:</strong> {b.start_time}</p>
            <p>
              <strong>Fin:</strong>{' '}
              {b.status === 'pending'
                ? 'Por confirmar (el contratista define la duración al aceptar)'
                : b.end_time || 'Pendiente de confirmación'}
            </p>
            <p><strong>Estado:</strong> {b.status}</p>

            {Number(b.payment_total_dop) > 0 && (
              <>
                <p>
                  <strong>Pago (tarjeta):</strong> {b.payment_status || '—'} · Total estimado: RD${' '}
                  {(Number(b.payment_total_dop) || 0).toLocaleString('es-DO')}
                </p>
                {b.payment_status === 'pending_deposit' && b.status === 'accepted' && (
                  <p>
                    <Link to={`/client/pago/${b.id}`}>Pagar depósito 30% con tarjeta</Link>
                  </p>
                )}
                {b.payment_status === 'deposit_paid' && (
                  <p className="text-success">Depósito pagado. El saldo se habilita al completar el servicio.</p>
                )}
                {b.payment_status === 'pending_balance' && b.status === 'completed' && (
                  <p>
                    <Link to={`/client/pago/${b.id}`}>Pagar saldo 70% con tarjeta</Link>
                  </p>
                )}
                {b.payment_status === 'paid_full' && (
                  <p className="text-success">Pago completado.</p>
                )}
              </>
            )}

            {clientId &&
              b.contractor_id &&
              (b.status === 'accepted' || b.status === 'in_progress') && (
                <ChatBox
                  bookingId={b.id}
                  userId={clientId}
                  otherUserId={b.contractor_id}
                />
              )}
          </div>
        ))
      )}
    </div>
  )
}

export default MyBookings