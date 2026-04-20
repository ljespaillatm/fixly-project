// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const bookingId = Number(body?.bookingId)
    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'bookingId requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: booking, error: bErr } = await supabaseUser
      .from('bookings')
      .select('id, contractor_id')
      .eq('id', bookingId)
      .single()

    if (bErr || !booking || booking.contractor_id !== user.id) {
      return new Response(JSON.stringify({ error: 'No autorizado para esta reserva' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Correo real: integrar Resend/SendGrid y RESEND_API_KEY en secretos.
    // El código ya está guardado en booking_verification_codes desde el cliente del contratista.
    return new Response(JSON.stringify({ ok: true, emailed: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
