import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Más adelante reemplazaremos esto con las claves reales de tu proyecto
const supabaseUrl = 'https://ibhdscjosnqakvtrqbnr.supabase.co'
const supabaseKey = 'sb_publishable_wJHKG2HgYFGcYjqE-6XWgA_LMCiIE9O'

export const supabase = createClient(supabaseUrl, supabaseKey)

// --- VERSIÓN DE LA APLICACIÓN ---
export const APP_VERSION = "1.0.0 alpha";

// Inyectamos la versión en la esquina inferior derecha de todas las pantallas
document.addEventListener("DOMContentLoaded", () => {
    const versionTag = document.createElement("div");
    versionTag.textContent = `v${APP_VERSION}`;
    
    // Estilos para que flote sutilmente sin estorbar
    Object.assign(versionTag.style, {
        position: "fixed",
        bottom: "10px",
        right: "15px",
        color: "rgba(255, 255, 255, 0.3)", // Blanco con mucha transparencia
        fontSize: "1rem",
        fontWeight: "bold",
        zIndex: "9999",
        pointerEvents: "none" // Para que los clics lo atraviesen y no bloquee nada
    });
    
    document.body.appendChild(versionTag);
});