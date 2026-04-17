import { supabase, supabaseAnonKey, supabaseUrl } from '../supabaseClient'

export const VERIFICATION_EMAIL_FUNCTION = 'send-booking-verification-email'

export const generateVerificationCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export const sendVerificationEmail = async ({ toEmail, code, bookingId }) => {
  const functionUrl = `${supabaseUrl}/functions/v1/${VERIFICATION_EMAIL_FUNCTION}`
  const anonKey = supabaseAnonKey

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      to: toEmail,
      subject: 'Codigo de verificacion de servicio - Fixly',
      bookingId,
      code,
      message: `Tu codigo de verificacion para finalizar el servicio es: ${code}`,
    }),
  })

  if (!response.ok) {
    const bodyText = await response.text()
    throw new Error(bodyText || 'No se pudo enviar el correo de verificacion.')
  }
}

export const upsertBookingVerification = async ({ bookingId, contractorId, clientId, code }) => {
  const { error } = await supabase.from('booking_verification_codes').upsert(
    {
      booking_id: bookingId,
      contractor_id: contractorId,
      client_id: clientId,
      code,
      email_sent_at: new Date().toISOString(),
      verified_at: null,
    },
    { onConflict: 'booking_id' },
  )

  if (error) {
    throw new Error(error.message)
  }
}
