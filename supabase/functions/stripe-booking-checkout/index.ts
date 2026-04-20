// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!
    const siteUrl = Deno.env.get('PUBLIC_APP_URL') || 'http://localhost:3000'

    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY no configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    const { bookingId, phase } = await req.json()
    if (!bookingId || (phase !== 'deposit' && phase !== 'balance')) {
      return new Response(JSON.stringify({ error: 'bookingId y phase (deposit|balance) requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: booking, error: bErr } = await supabaseUser
      .from('bookings')
      .select(
        'id, user_id, status, payment_total_dop, payment_deposit_dop, payment_balance_dop, payment_status',
      )
      .eq('id', bookingId)
      .single()

    if (bErr || !booking || booking.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Reserva no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const total = Number(booking.payment_total_dop) || 0
    const deposit = Number(booking.payment_deposit_dop) || 0
    const balance = Number(booking.payment_balance_dop) || 0

    if (phase === 'deposit') {
      if (booking.payment_status !== 'pending_deposit') {
        return new Response(JSON.stringify({ error: 'El depósito ya no está pendiente' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (deposit <= 0) {
        return new Response(JSON.stringify({ error: 'Sin monto de depósito' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      if (booking.status !== 'completed') {
        return new Response(JSON.stringify({ error: 'El saldo solo se paga cuando el servicio está completado' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (booking.payment_status !== 'pending_balance') {
        return new Response(JSON.stringify({ error: 'El saldo no está pendiente' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (balance <= 0) {
        return new Response(JSON.stringify({ error: 'Sin monto de saldo' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    const amountDop = phase === 'deposit' ? deposit : balance
    // Stripe espera DOP en la unidad menor (centavos), no en pesos enteros.
    const unitAmount = Math.round(amountDop * 100)
    const label = phase === 'deposit' ? 'Depósito Fixly (30%)' : `Saldo Fixly (70% · total RD$${total})`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'dop',
            unit_amount: unitAmount,
            product_data: { name: label, description: `Reserva #${bookingId}` },
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: String(bookingId),
        phase,
        client_user_id: user.id,
      },
      client_reference_id: `${bookingId}:${phase}`,
      success_url: `${siteUrl}/#/client/pago-exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#/client/pago/${bookingId}?canceled=1`,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Error Stripe' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
