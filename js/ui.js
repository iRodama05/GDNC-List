import { APP_VERSION } from './config.js';

// --- DEBUG ---
console.log("ui.js cargado correctamente. Versión:", APP_VERSION);

// 1. INYECCIÓN DE LA VERSIÓN
const versionTag = document.createElement("div");
versionTag.textContent = `v${APP_VERSION}`;
Object.assign(versionTag.style, {
    position: "fixed",
    bottom: "10px",
    right: "15px",
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: "1rem",
    fontWeight: "bold",
    zIndex: "9999", 
    pointerEvents: "none"
});
document.body.appendChild(versionTag);

// 2. SISTEMA DE BÚSQUEDA EN TIEMPO REAL
const searchInput = document.getElementById('search-input');
let debounceTimer; // Variable para controlar el retraso

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        // 1. Si el usuario escribe otra letra, cancelamos el temporizador anterior
        clearTimeout(debounceTimer);

        // 2. Creamos un nuevo temporizador que esperará 250ms antes de actuar
        debounceTimer = setTimeout(() => {
            const term = e.target.value.toLowerCase();
            const playerCards = document.querySelectorAll('.player-card');
            const podiumContainer = document.getElementById('podium-container');
            
            if (podiumContainer) {
                if (term.length > 0) {
                    podiumContainer.classList.add('is-searching');
                    podiumContainer.classList.remove('is-active');
                } else {
                    podiumContainer.classList.remove('is-searching');
                    podiumContainer.classList.add('is-active');
                }
            }

            let delayIndex = 0;

            playerCards.forEach(card => {
                const playerName = card.querySelector('.player-card__title').textContent.toLowerCase();
                
                if (playerName.includes(term)) {
                    // Si estaba oculta o saliendo, la volvemos a mostrar con cascada
                    if (card.style.display === 'none' || card.classList.contains('fade-out')) {
                        card.style.display = 'flex';
                        card.classList.remove('fade-out');
                        card.classList.remove('is-visible');
                        
                        // Forzamos un 'reflow' del DOM para reiniciar la animación limpiamente
                        void card.offsetWidth;
                        
                        setTimeout(() => {
                            card.classList.add('is-visible');
                        }, delayIndex * 50); 
                        
                        delayIndex++;
                    }
                } else {
                    // Si está visible, iniciamos su animación de salida
                    if (card.style.display !== 'none' && !card.classList.contains('fade-out')) {
                        card.classList.remove('is-visible');
                        card.classList.add('fade-out');
                        
                        // Esperamos a que termine el desvanecimiento para borrarla del espacio
                        setTimeout(() => {
                            // Comprobación de seguridad
                            if (card.classList.contains('fade-out')) {
                                card.style.display = 'none';
                            }
                        }, 300);
                    }
                }
            });
        }, 250); // Retraso actual ajustado a 250ms
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

// 4. CERRAR MODALES CON CLIC AFUERA (ANIMADO)
document.addEventListener('click', (e) => {
    // Si el usuario hace clic exactamente en el fondo oscuro
    if (e.target.classList.contains('modal-overlay')) {
        // Disparamos la animación de salida
        e.target.classList.add('is-closing');
        
        // Esperamos 300ms a que termine la animación antes de ocultarlo (display: none)
        setTimeout(() => {
            e.target.style.display = 'none';
            e.target.classList.remove('is-closing'); // Limpiamos la clase para la próxima vez
        }, 300);
    }
});

// =========================================
// 5. ANIMACIONES AL HACER SCROLL (INTERSECTION OBSERVER)
// =========================================
export function observarTarjetas() {
    // Configuramos el observador
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Pequeño retraso basado en el índice para crear un efecto "cascada" 
                // solo para los que aparecen juntos en pantalla al mismo tiempo
                setTimeout(() => {
                    entry.target.classList.add('is-visible');
                }, index * 50); 
                
                // Una vez animado, dejamos de observarlo para ahorrar memoria
                observer.unobserve(entry.target);
            }
        });
    }, {
        root: null, // Usa el viewport del navegador
        threshold: 0.1, // Se dispara cuando el 10% de la tarjeta es visible
        rootMargin: "0px 0px -50px 0px" // Dispara un poco antes de que toque el fondo exacto
    });

    // Seleccionamos todas las tarjetas y las preparamos
    const tarjetas = document.querySelectorAll('.player-card');
    tarjetas.forEach(tarjeta => {
        tarjeta.classList.add('animate-on-scroll');
        observer.observe(tarjeta);
    });
}