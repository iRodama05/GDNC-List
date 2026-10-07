import { IS_DEV_MODE } from './config.js';
import { verificarAccesoMod, obtenerSubmitsPendientes, rechazarSubmit, aceptarSubmit } from './api/modApi.js';
import { ReviewCard } from './components/ReviewCard.js';
import { SkeletonCards } from './components/Skeleton.js';
import { icon } from './components/icons.js';
import { marcarOcupado } from './utils.js';

const pendientesContainer = document.getElementById('pendientes-container');
const pendingCount = document.getElementById('pending-count');
const modLead = document.getElementById('mod-lead');

// Debe coincidir con la duración de card-out en css/components/animations.css.
const SALIDA_MS = 240;

async function initModPanel() {
    // 1. Verificamos sesión y permisos
    const { user, esMod } = await verificarAccesoMod();

    if (!user || !esMod) {
        if (IS_DEV_MODE) {
            console.warn('[DEV MODE] El usuario de desarrollo no es mod en la base de datos; se omite el bloqueo.');
        } else {
            return pintarSinAcceso(Boolean(user));
        }
    }

    cargarPendientes();
}

function pintarSinAcceso(conSesion) {
    modLead.textContent = 'Esta sección es solo para moderadores.';
    pendientesContainer.innerHTML = `
        <div class="empty-state">
            <span class="empty-state__icon">${icon('lock', 22)}</span>
            <p class="empty-state__title">${conSesion ? 'Tu cuenta no es de moderador' : 'Inicia sesión para continuar'}</p>
            <p class="empty-state__text">${conSesion
                ? 'Si crees que es un error, avisa a un moderador por Discord.'
                : 'Entra con una cuenta de moderador para revisar récords.'}</p>
            <a class="btn-outline" href="index.html">Volver al ranking</a>
        </div>
    `;
}

function pintarVacio() {
    pendientesContainer.innerHTML = `
        <div class="empty-state">
            <span class="empty-state__icon">${icon('checkCircle', 22)}</span>
            <p class="empty-state__title">No hay récords pendientes</p>
            <p class="empty-state__text">Cuando alguien suba un récord, aparecerá aquí para que lo revises.</p>
        </div>
    `;
}

// El contador del título y el estado vacío siguen a las tarjetas que quedan en pantalla.
function actualizarResumen() {
    const restantes = pendientesContainer.querySelectorAll('.review-card:not(.is-leaving)').length;
    pendingCount.textContent = restantes;
    pendingCount.hidden = restantes === 0;
    if (restantes === 0) pintarVacio();
}

async function cargarPendientes() {
    pendientesContainer.setAttribute('aria-busy', 'true');
    pendientesContainer.innerHTML = SkeletonCards(2, { label: 'Cargando récords pendientes', modifier: 'review' });

    let pendientes;
    try {
        pendientes = await obtenerSubmitsPendientes();
    } catch (error) {
        console.error('Error al cargar pendientes:', error);
        pendientesContainer.innerHTML = `
            <div class="empty-state">
                <span class="empty-state__icon">${icon('alert', 22)}</span>
                <p class="empty-state__title">No se pudieron cargar los récords</p>
                <p class="empty-state__text">Revisa tu conexión y recarga la página.</p>
            </div>
        `;
        return;
    } finally {
        pendientesContainer.removeAttribute('aria-busy');
    }

    pendientesContainer.innerHTML = (pendientes || []).map(ReviewCard).join('');
    actualizarResumen();
}

function mostrarError(submitId, mensaje) {
    const feedback = document.getElementById(`review-feedback-${submitId}`);
    if (feedback) feedback.textContent = mensaje;
}

// Saca la tarjeta revisada con una animación corta y deja el foco en la siguiente.
function retirarTarjeta(submitId) {
    const card = document.getElementById(`review-${submitId}`);
    if (!card) return;

    card.classList.add('is-leaving');
    actualizarResumen();
    setTimeout(() => {
        card.remove();
        if (!pendientesContainer.querySelector('.review-card')) return;
        pendientesContainer.querySelector('.review-card input')?.focus({ preventScroll: true });
    }, SALIDA_MS);
}

async function aceptar(button) {
    const submitId = button.dataset.id;
    const input = document.getElementById(`pts-${submitId}`);
    const valor = input.value.trim();
    const puntos = Number(valor);

    if (!/^\d+$/.test(valor) || puntos <= 0) {
        input.setAttribute('aria-invalid', 'true');
        mostrarError(submitId, 'Escribe los puntos (un número entero mayor que 0) antes de aceptar.');
        input.focus();
        return;
    }

    input.removeAttribute('aria-invalid');
    mostrarError(submitId, '');
    const restaurar = marcarOcupado(button, 'Aceptando…');

    try {
        await aceptarSubmit(submitId, button.dataset.uid, puntos);
        retirarTarjeta(submitId);
    } catch (error) {
        console.error('Error al procesar récord:', error);
        mostrarError(submitId, 'No se pudo aceptar el récord. Inténtalo de nuevo.');
        restaurar();
    }
}

async function rechazar(button) {
    const submitId = button.dataset.id;
    const motivo = document.getElementById(`reason-${submitId}`).value;
    const restaurar = marcarOcupado(button, 'Rechazando…');

    try {
        await rechazarSubmit(submitId, motivo);
        retirarTarjeta(submitId);
    } catch (error) {
        console.error('Error al rechazar récord:', error);
        mostrarError(submitId, 'No se pudo rechazar el récord. Inténtalo de nuevo.');
        restaurar();
    }
}

// Un solo listener para todas las tarjetas: se pintan y se retiran sin volver a enlazar eventos.
pendientesContainer.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-id]');
    if (!button) return;
    const submitId = button.dataset.id;

    if (button.classList.contains('btn-accept')) return aceptar(button);
    if (button.classList.contains('btn-reject-confirm')) return rechazar(button);

    if (button.classList.contains('btn-reject-init')) {
        mostrarError(submitId, '');
        document.getElementById(`main-controls-${submitId}`).hidden = true;
        document.getElementById(`reject-controls-${submitId}`).hidden = false;
        document.getElementById(`reason-${submitId}`).focus();
    }

    if (button.classList.contains('btn-cancel-reject')) {
        document.getElementById(`reject-controls-${submitId}`).hidden = true;
        document.getElementById(`main-controls-${submitId}`).hidden = false;
        document.querySelector(`#main-controls-${submitId} .btn-reject-init`)?.focus();
    }
});

pendientesContainer.addEventListener('input', (event) => {
    if (event.target.matches('input[id^="pts-"]')) event.target.removeAttribute('aria-invalid');
});

pendientesContainer.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !event.target.matches('input[id^="pts-"]')) return;
    const submitId = event.target.id.replace('pts-', '');
    const button = document.querySelector(`#main-controls-${submitId} .btn-accept`);
    if (button) aceptar(button);
});

initModPanel();
