import { APP_VERSION } from './config.js';
import { mountSiteCredit } from './components/SiteCredit.js';
import { mountOpusDisclaimer } from './components/OpusDisclaimer.js';
import { YouTubePlayer } from './components/RecordCard.js';
import { abrirModal, cerrarModal } from './modal.js';

// Se re-exportan para los módulos que ya importaban cerrarModal desde ui.js.
export { abrirModal, cerrarModal };

mountSiteCredit({ version: APP_VERSION });
mountOpusDisclaimer();

const THEME_KEY = 'ncl-theme';
const themeSwitch = document.getElementById('theme-switch');
const themeMedia = window.matchMedia('(prefers-color-scheme: light)');

function aplicarTema(theme, { guardar = false } = {}) {
    document.documentElement.dataset.theme = theme;
    if (guardar) localStorage.setItem(THEME_KEY, theme);
    themeSwitch?.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f3f1ee' : '#111115');
}

themeSwitch?.addEventListener('click', () => {
    const actual = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    aplicarTema(actual === 'dark' ? 'light' : 'dark', { guardar: true });
});

themeMedia.addEventListener('change', () => {
    if (localStorage.getItem(THEME_KEY)) return;
    aplicarTema(themeMedia.matches ? 'light' : 'dark');
});

if (themeSwitch) aplicarTema(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

// --- Buscador del ranking y entrada de las filas ---
const searchInput = document.getElementById('search-input');
const searchEmpty = document.getElementById('search-empty');
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const podioDesktopQuery = window.matchMedia('(min-width: 769px)');
let debounceTimer;
let consultaAnterior = '';
let observerEntrada = null;
const entradaEnCurso = new Set();

function prefiereReducirMovimiento() {
    return motionQuery.matches;
}

function esPodioDeEscritorio(card) {
    return podioDesktopQuery.matches && Boolean(card.closest('.podium-container.is-active'));
}

function asegurarObservador() {
    if (observerEntrada || !('IntersectionObserver' in window)) return observerEntrada;
    observerEntrada = new IntersectionObserver((entries) => {
        const entrantes = entries
            .filter((entry) => entry.isIntersecting)
            .map((entry) => entry.target)
            .filter((card) => !card.classList.contains('is-filtered-out') && !card.classList.contains('is-revealed') && !esPodioDeEscritorio(card))
            .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
        if (entrantes.length) reproducirEntrada(entrantes);
    }, { threshold: 0 });
    return observerEntrada;
}

function limpiarEntrada(card) {
    card.classList.remove('is-pending', 'is-revealed', 'is-entering');
    card.style.removeProperty('--enter-delay');
    observerEntrada?.unobserve(card);
}

function reproducirEntrada(cards) {
    const lista = cards.filter((card) => !entradaEnCurso.has(card) && !esPodioDeEscritorio(card));
    if (!lista.length || prefiereReducirMovimiento()) return;

    lista.forEach((card) => entradaEnCurso.add(card));
    queueMicrotask(() => lista.forEach((card) => entradaEnCurso.delete(card)));

    lista.forEach((card, index) => {
        card.classList.add('is-pending');
        card.classList.remove('is-revealed', 'is-entering');
        if (index === 0) card.style.removeProperty('--enter-delay');
        else card.style.setProperty('--enter-delay', `${Math.min(index, 4) * 32}ms`);
        observerEntrada?.unobserve(card);
    });

    void lista[0].offsetWidth;
    lista.forEach((card) => card.classList.add('is-revealed', 'is-entering'));
}

function vigilarEntrada(cards) {
    const observer = asegurarObservador();
    if (!observer || prefiereReducirMovimiento()) return;
    cards.forEach((card) => {
        if (card.classList.contains('is-filtered-out') || esPodioDeEscritorio(card)) return;
        card.classList.add('is-pending');
        card.classList.remove('is-revealed', 'is-entering');
        card.style.removeProperty('--enter-delay');
        observer.observe(card);
    });
}

function prepararEntrada(cards) {
    if (!cards.length || prefiereReducirMovimiento()) return;
    const altura = window.innerHeight;
    const enVista = [];
    const fuera = [];

    cards.forEach((card) => {
        if (esPodioDeEscritorio(card) || card.classList.contains('is-filtered-out')) return;
        const rect = card.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < altura) enVista.push(card);
        else fuera.push(card);
    });

    enVista.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    reproducirEntrada(enVista);
    vigilarEntrada(fuera);
}

function tarjetasIniciales() {
    const lista = [...document.querySelectorAll('#ranking-container .player-card')];
    if (podioDesktopQuery.matches) return lista;
    return [...document.querySelectorAll('#podium-container .player-card'), ...lista];
}

function animarCoincidencias(coinciden, { empezando, terminando }) {
    // Al empezar a buscar, o cuando una fila vuelve a verse, se repite la entrada.
    // Afinar el texto no reinicia las que siguieron en pantalla.
    const entran = [];
    coinciden.forEach(({ card, estabaOculta }) => {
        if (terminando && esPodioDeEscritorio(card)) {
            limpiarEntrada(card);
            return;
        }
        if (empezando || estabaOculta) entran.push(card);
    });
    prepararEntrada(entran);
}

function filtrarRanking(valor) {
    const texto = valor.trim();
    const term = texto.toLowerCase();
    const buscando = term.length > 0;
    const empezando = buscando && consultaAnterior === '';
    const terminando = !buscando && consultaAnterior !== '';
    const cambio = term !== consultaAnterior;
    const podiumContainer = document.getElementById('podium-container');

    podiumContainer?.classList.toggle('is-searching', buscando);
    podiumContainer?.classList.toggle('is-active', !buscando);

    const coinciden = [];
    let visibles = 0;
    document.querySelectorAll('.player-card').forEach((card) => {
        const playerName = card.querySelector('.player-card__title')?.textContent.toLowerCase() || '';
        const coincide = playerName.includes(term);
        const estabaOculta = card.classList.contains('is-filtered-out');
        card.classList.toggle('is-filtered-out', !coincide);
        if (!coincide) {
            observerEntrada?.unobserve(card);
            return;
        }
        visibles += 1;
        coinciden.push({ card, estabaOculta });
    });

    if (searchEmpty) {
        const sinResultados = buscando && visibles === 0;
        searchEmpty.hidden = !sinResultados;
        searchEmpty.textContent = sinResultados ? `Ningún jugador coincide con “${texto}”.` : '';
    }

    if (cambio) animarCoincidencias(coinciden, { empezando, terminando });
    consultaAnterior = term;
}

document.addEventListener('gdnc:ranking-ready', () => {
    consultaAnterior = '';
    const texto = searchInput?.value ?? '';
    if (texto.trim()) filtrarRanking(texto);
    else prepararEntrada(tarjetasIniciales());
});

document.addEventListener('focusin', (event) => {
    const card = event.target instanceof Element ? event.target.closest('.player-card') : null;
    if (!card || card.classList.contains('is-revealed') || card.classList.contains('is-filtered-out') || esPodioDeEscritorio(card)) return;
    card.classList.add('is-revealed');
    card.classList.remove('is-pending', 'is-entering');
    observerEntrada?.unobserve(card);
});

document.addEventListener('animationend', (event) => {
    if (event.animationName !== 'card-enter' || !(event.target instanceof Element)) return;
    event.target.classList.remove('is-entering', 'is-pending');
});

motionQuery.addEventListener('change', () => {
    if (!prefiereReducirMovimiento()) return;
    observerEntrada?.disconnect();
    observerEntrada = null;
    document.querySelectorAll('.player-card').forEach(limpiarEntrada);
});

searchInput?.addEventListener('input', (event) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => filtrarRanking(event.target.value), 200);
});

// --- Menú de cuenta (disclosure: botón con aria-expanded + panel) ---
function cerrarMenus({ devolverFoco = false } = {}) {
    document.querySelectorAll('[data-menu-trigger][aria-expanded="true"]').forEach((trigger) => {
        trigger.setAttribute('aria-expanded', 'false');
        document.getElementById(trigger.getAttribute('aria-controls'))?.setAttribute('hidden', '');
        if (devolverFoco) trigger.focus();
    });
}

document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-menu-trigger]');
    if (trigger) {
        const abrir = trigger.getAttribute('aria-expanded') !== 'true';
        cerrarMenus();
        if (abrir) {
            trigger.setAttribute('aria-expanded', 'true');
            document.getElementById(trigger.getAttribute('aria-controls'))?.removeAttribute('hidden');
        }
        return;
    }
    if (!event.target.closest('.account-menu__panel')) cerrarMenus();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.querySelector('[data-menu-trigger][aria-expanded="true"]')) {
        cerrarMenus({ devolverFoco: true });
    }
});

// Al salir del menú con Tab, se cierra.
document.addEventListener('focusout', (event) => {
    const menu = event.target.closest?.('.account-menu');
    if (menu && event.relatedTarget && !menu.contains(event.relatedTarget)) cerrarMenus();
});

// --- Miniaturas de video: se cambian por el reproductor al pulsarlas ---
document.addEventListener('click', (event) => {
    const media = event.target.closest('.record-media[data-youtube-id]');
    if (!media) return;

    const player = document.createElement('div');
    player.className = 'record-media record-media--playing';
    player.innerHTML = YouTubePlayer(media.dataset.youtubeId, media.dataset.title);
    media.replaceWith(player);
    player.querySelector('iframe')?.focus();
});
