/**
 * Route / DB helper: `services.id` may be UUID (Supabase) or a numeric id (legacy).
 */
export function coerceServiceId(param) {
  if (param == null) return null
  const s = String(param).trim()
  if (!s) return null
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return s
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
