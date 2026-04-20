import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js'

const deployStripeHint =
  'En el panel de Supabase: Edge Functions → despliega `stripe-booking-checkout` y `stripe-booking-verify` (por ejemplo: `supabase functions deploy stripe-booking-checkout`). En Secretos de cada función configura STRIPE_SECRET_KEY y PUBLIC_APP_URL. La URL del front debe coincidir con VITE_SUPABASE_URL del mismo proyecto.'

/**
 * Mensaje legible para errores de supabase.functions.invoke (checkout / verify).
 * @param {unknown} error
 * @returns {Promise<string>}
 */
export async function messageForFunctionsInvokeError(error) {
  if (error instanceof FunctionsHttpError) {
    try {
      const res = error.context
      const body = typeof res?.json === 'function' ? await res.clone().json() : null
      const code = body?.code
      const msg = body?.message || body?.error
      if (code === 'NOT_FOUND' || /not found|no encontrad/i.test(String(msg || ''))) {
        return `La función de pago no existe en este proyecto de Supabase (${msg || code}). ${deployStripeHint}`
      }
      if (typeof msg === 'string' && msg.trim()) {
        return msg
      }
    } catch {
      /* ignore parse errors */
    }
    return `La función respondió con error HTTP. ${deployStripeHint}`
  }

  if (error instanceof FunctionsRelayError) {
    return `Supabase no pudo ejecutar la función (relay). Reintenta en unos segundos. Si persiste, ${deployStripeHint}`
  }

  if (error instanceof FunctionsFetchError) {
    return `No se pudo contactar la función Edge (red, CORS o función inexistente). ${deployStripeHint} Comprueba extensión bloqueadora, VPN y que el proyecto no esté pausado.`
  }

  const m = error && typeof error.message === 'string' ? error.message : ''
  if (/Failed to send a request to the Edge Function/i.test(m)) {
    return `No se pudo contactar la función Edge. ${deployStripeHint}`
  }
  return m || 'Error al llamar la función Edge.'
}
