import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Claves de Supabase
const supabaseUrl = 'https://ibhdscjosnqakvtrqbnr.supabase.co'
const supabaseKey = 'sb_publishable_wJHKG2HgYFGcYjqE-6XWgA_LMCiIE9O'

export const supabase = createClient(supabaseUrl, supabaseKey)

// --- VERSIÓN DE LA APLICACIÓN ---
export const APP_VERSION = "1.0.0 beta";