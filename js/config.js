import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

//Claves 
const supabaseUrl = 'https://ibhdscjosnqakvtrqbnr.supabase.co'
const supabaseKey = 'sb_publishable_wJHKG2HgYFGcYjqE-6XWgA_LMCiIE9O'

export const supabase = createClient(supabaseUrl, supabaseKey)

// --- VERSIÓN DE LA APLICACIÓN ---
export const APP_VERSION = "1.1.0 alpha";

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

// --- SISTEMA DE BÚSQUEDA EN TIEMPO REAL ---
const searchInput = document.getElementById('search-input');

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        // Convertimos el texto a minúsculas para que la búsqueda no sea estricta
        const term = e.target.value.toLowerCase();
        
        // Seleccionamos todas las tarjetas renderizadas en el DOM
        const playerCards = document.querySelectorAll('.player-card');
        
        playerCards.forEach(card => {
            // Buscamos el nombre del jugador dentro de cada tarjeta
            const playerName = card.querySelector('.player-gd-title').textContent.toLowerCase();
            
            // Si el nombre incluye lo que escribimos, mostramos la tarjeta (flex), si no, la ocultamos (none)
            if (playerName.includes(term)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });
}