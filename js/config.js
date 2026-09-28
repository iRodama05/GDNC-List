import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Claves de Supabase
const supabaseUrl = 'https://ibhdscjosnqakvtrqbnr.supabase.co'
const supabaseKey = 'sb_publishable_wJHKG2HgYFGcYjqE-6XWgA_LMCiIE9O'

export const supabase = createClient(supabaseUrl, supabaseKey)

// --- MODO DESARROLLO (solo localhost) ---
export const IS_DEV_MODE = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const DEV_USER = {
    id: 'dev-uid',
    uid: 'dev-uid',
    rol: 'mod',
    gd_username: 'LocalMod',
    gd_verificado: true,
    discord_username: 'LocalMod',
    avatar_url: null,
    puntos_totales: 0
};

if (IS_DEV_MODE) {
    window.DEV_USER = DEV_USER;
    console.warn('[DEV MODE] Autenticación desactivada. Usuario falso:', DEV_USER);
}

export async function getCurrentUser() {
    if (IS_DEV_MODE) return DEV_USER;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// --- VERSIÓN DE LA APLICACIÓN ---
export const APP_VERSION = "1.0.5 beta";