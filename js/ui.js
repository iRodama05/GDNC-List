import { APP_VERSION } from './config.js';

// --- DEBUG: Comprobador para la consola ---
console.log("ui.js cargado correctamente. Intentando dibujar versión:", APP_VERSION);

// 1. INYECCIÓN DE LA VERSIÓN
// Al ser type="module", el body ya existe, así que lo inyectamos directamente.
const versionTag = document.createElement("div");
versionTag.textContent = `v${APP_VERSION}`;

Object.assign(versionTag.style, {
    position: "fixed",
    bottom: "10px",
    right: "15px",
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: "1rem",
    fontWeight: "bold",
    zIndex: "9999", // Usamos el valor directo para máxima compatibilidad
    pointerEvents: "none"
});

document.body.appendChild(versionTag);

// 2. SISTEMA DE BÚSQUEDA EN TIEMPO REAL
const searchInput = document.getElementById('search-input');

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const playerCards = document.querySelectorAll('.player-card');
        
        playerCards.forEach(card => {
            const playerName = card.querySelector('.player-card__title').textContent.toLowerCase();
            
            if (playerName.includes(term)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// 3. LÓGICA DEL MENÚ MÓVIL
const menuBtn = document.getElementById('mobile-menu-btn');
const navActions = document.getElementById('nav-actions');

if (menuBtn && navActions) {
    menuBtn.addEventListener('click', () => {
        navActions.classList.toggle('active');
    });
}