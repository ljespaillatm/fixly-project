import { createClient } from '@supabase/supabase-js'

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://dulzuojsbjxwmxenlxrs.supabase.co'
export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bHp1b2pzYmp4d214ZW5seHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTg5NjEsImV4cCI6MjA4NjM5NDk2MX0.gVie4qBZ1lxsN3W0VH4rVmTRtQtMnxtL0TjTrZDbf9g'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
console.log("SUPABASE URL:", supabaseUrl)