/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{ ok: boolean, user?: import('@supabase/supabase-js').User, redirect?: string }>}
 */
export async function fetchAdminGuard(supabase) {
  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) {
    return { ok: false, redirect: '/#/login' }
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') {
    return { ok: false, redirect: '/#/' }
  }

  return { ok: true, user }
}
