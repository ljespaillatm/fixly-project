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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const asUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userErr,
    } = await asUser.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceKey)
    const { data: actor, error: actorErr } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (actorErr || actor?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo administradores' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { userId } = await req.json()
    if (!userId || typeof userId !== 'string') {
      return new Response(JSON.stringify({ error: 'userId requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (userId === user.id) {
      return new Response(JSON.stringify({ error: 'No puedes eliminar tu propia cuenta' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (targetProfile?.role === 'admin') {
      return new Response(JSON.stringify({ error: 'No se puede eliminar una cuenta administradora' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: delErr } = await adminClient.auth.admin.deleteUser(userId)
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
