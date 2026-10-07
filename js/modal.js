// Apertura, cierre y foco de los .modal-overlay. modals.css los muestra con .is-open.

// Debe coincidir con la duración de overlay-out / modal-out en css/components/modals.css.
const MODAL_MOTION_MS = 160;

const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'iframe',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

const focoAnterior = new WeakMap();

const estaAbierto = (overlay) => overlay.classList.contains('is-open') && !overlay.classList.contains('is-closing');

function overlaySuperior() {
    const abiertos = [...document.querySelectorAll('.modal-overlay')].filter(estaAbierto);
    return abiertos.find((overlay) => overlay.classList.contains('modal-overlay--top')) || abiertos.at(-1) || null;
}

const visibles = (overlay) => [...overlay.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);

/**
 * Muestra un .modal-overlay, bloquea el scroll del body y mueve el foco dentro del diálogo.
 * `focus` acepta un selector o un elemento; por defecto se enfoca el propio diálogo,
 * así el lector de pantalla anuncia el título sin abrir el teclado en móvil.
 */
export function abrirModal(overlay, { focus } = {}) {
    if (!overlay) return;
    if (!estaAbierto(overlay)) focoAnterior.set(overlay, document.activeElement);

    overlay.classList.remove('is-closing');
    overlay.classList.add('is-open');
    document.body.classList.add('has-modal');

    const dialog = overlay.querySelector('[role="dialog"], [role="alertdialog"]');
    if (dialog && !dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');

    const destino = (typeof focus === 'string' ? overlay.querySelector(focus) : focus) || dialog;
    requestAnimationFrame(() => destino?.focus({ preventScroll: true }));
}

// Devuelve una promesa que se cumple cuando termina la animación de salida.
export function cerrarModal(overlay) {
    if (!overlay || !estaAbierto(overlay)) return Promise.resolve();
    overlay.classList.add('is-closing');

    return new Promise((resolve) => {
        setTimeout(() => {
            // Se volvió a abrir durante la animación de salida: se queda abierto.
            if (!overlay.classList.contains('is-closing')) return resolve();

            overlay.classList.remove('is-open', 'is-closing');
            if (!overlaySuperior()) document.body.classList.remove('has-modal');

            const anterior = focoAnterior.get(overlay);
            if (anterior?.isConnected) anterior.focus({ preventScroll: true });
            overlay.dispatchEvent(new CustomEvent('modal:closed'));
            resolve();
        }, MODAL_MOTION_MS);
    });
}

// Clic en el fondo: solo cierra los overlays que lo permiten.
document.addEventListener('click', (event) => {
    const overlay = event.target;
    if (overlay.classList?.contains('modal-overlay') && overlay.dataset.dismiss === 'backdrop') {
        cerrarModal(overlay);
    }
});

// Escape cierra el diálogo superior; Tab no se escapa del diálogo abierto.
document.addEventListener('keydown', (event) => {
    const overlay = overlaySuperior();
    if (!overlay) return;

    if (event.key === 'Escape') {
        if (overlay.dataset.dismiss === 'backdrop') {
            event.preventDefault();
            cerrarModal(overlay);
        }
        return;
    }

    if (event.key !== 'Tab') return;

    const items = visibles(overlay);
    if (items.length === 0) {
        event.preventDefault();
        return;
    }

    const first = items[0];
    const last = items.at(-1);
    const activo = document.activeElement;
    const fuera = !overlay.contains(activo) || activo.matches('[role="dialog"], [role="alertdialog"]');

    if (event.shiftKey && (activo === first || fuera)) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && (activo === last || (fuera && !overlay.contains(activo)))) {
        event.preventDefault();
        first.focus();
    }
});
