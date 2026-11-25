import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Kredensial HANYA dibaca dari environment — tidak ada URL atau key
// yang ditulis langsung (hardcode) di file mana pun.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined

/** True hanya bila kedua variabel environment Supabase terisi. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * Klien Supabase proyek HQ (proyek terpisah dari platform SINEVERSE).
 * Bernilai null bila environment belum dikonfigurasi — halaman harus
 * menampilkan status "Belum dikonfigurasi" dan tidak menganggap data ada.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null
