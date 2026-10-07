import { obtenerRanking } from './api/rankingApi.js';
import { PlayerCard } from './components/PlayerCard.js';
import { icon } from './components/icons.js';

const rankingContainer = document.getElementById('ranking-container');
const podiumContainer = document.getElementById('podium-container');

function pintarVacio() {
    const canSubmit = document.body.dataset.canSubmit === 'true';
    rankingContainer.innerHTML = `
        <div class="empty-state">
            <span class="empty-state__icon">${icon('trophy', 22)}</span>
            <p class="empty-state__title">Todavía no hay jugadores en la lista</p>
            <p class="empty-state__text">Sube un récord con video: cuando un moderador lo acepte, aparecerás aquí.</p>
            <button type="button" id="btn-empty-submit" class="btn-primary" ${canSubmit ? '' : 'hidden'}>${icon('plus')}Subir récord</button>
        </div>
    `;
    document.getElementById('btn-empty-submit')?.addEventListener('click', () => {
        document.getElementById('btn-open-submit')?.click();
    });
}

function pintarError() {
    rankingContainer.innerHTML = `
        <div class="empty-state">
            <span class="empty-state__icon">${icon('alert', 22)}</span>
            <p class="empty-state__title">No se pudo cargar el ranking</p>
            <p class="empty-state__text">Revisa tu conexión y vuelve a intentarlo.</p>
            <button type="button" class="btn-outline" id="btn-retry-ranking">Reintentar</button>
        </div>
    `;
    document.getElementById('btn-retry-ranking')?.addEventListener('click', () => window.location.reload());
}

document.addEventListener('gdnc:can-submit', () => {
    const button = document.getElementById('btn-empty-submit');
    if (button) button.hidden = false;
});

async function cargarRanking() {
    if (!rankingContainer) return;

    let usuarios;
    try {
        usuarios = await obtenerRanking();
    } catch (error) {
        console.error('Error al cargar el ranking:', error);
        pintarError();
        return;
    } finally {
        rankingContainer.removeAttribute('aria-busy');
    }

    if (usuarios.length === 0) {
        pintarVacio();
        return;
    }

    // El podio va en orden 1, 2, 3 (lectura y tabulación); cards.css coloca al primero en el centro.
    podiumContainer.innerHTML = usuarios.slice(0, 3)
        .map((player, index) => PlayerCard(player, index + 1, { eager: true }))
        .join('');

    rankingContainer.innerHTML = usuarios.slice(3)
        .map((player, index) => PlayerCard(player, index + 4))
        .join('');

    document.dispatchEvent(new CustomEvent('gdnc:ranking-ready'));
}

cargarRanking();
