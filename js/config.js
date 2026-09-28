import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Claves de Supabase
const supabaseUrl = 'https://ibhdscjosnqakvtrqbnr.supabase.co'
const supabaseKey = 'sb_publishable_wJHKG2HgYFGcYjqE-6XWgA_LMCiIE9O'

export const supabase = createClient(supabaseUrl, supabaseKey)

// --- MODO DESARROLLO (solo localhost) ---
export const IS_DEV_MODE = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// ID real de Supabase. El perfil (rol, puntos, banner...) se lee de la tabla `usuarios`.
export const DEV_USER_ID = '7d9f6d34-1e9d-423d-9cf7-a0be29f35cc2';
export const DEV_USER = { id: DEV_USER_ID };

if (IS_DEV_MODE) {
    window.DEV_USER = DEV_USER;
    console.warn('[DEV MODE] Se omite supabase.auth.getUser(). Usuario:', DEV_USER_ID);

    // Las escrituras siguen pasando por RLS: sin una sesión de este mismo usuario en localhost, Supabase las ignora.
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id !== DEV_USER_ID) {
            console.warn('[DEV MODE] No hay sesión de Discord para este usuario en localhost: podrás ver tu perfil, pero no guardar cambios. Inicia sesión una vez en localhost para poder editar.');
        }
    });
}

export async function getCurrentUser() {
    if (IS_DEV_MODE) return DEV_USER;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// --- VERSIÓN DE LA APLICACIÓN ---
export const APP_VERSION = "1.0.0 release";