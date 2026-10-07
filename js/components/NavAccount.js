import { avatarAnimado, DEFAULT_AVATAR } from '../avatar.js';
import { escapeHtml, formatearPuntos, tiempoRelativo, formatoFecha } from '../format.js';
import { icon } from './icons.js';

export const ESTADO_LABEL = {
    aceptado: 'Aceptado',
    rechazado: 'Rechazado',
    pendiente: 'Pendiente'
};

const ESTADOS_VALIDOS = Object.keys(ESTADO_LABEL);

export function etiquetaBuzon(estadoNoLeido) {
    return estadoNoLeido ? `Tus envíos, novedad: ${ESTADO_LABEL[estadoNoLeido] || 'actualizado'}` : 'Tus envíos';
}

/**
 * Zona derecha de la navbar con sesión iniciada: campana de envíos y menú de cuenta.
 * ui.js abre y cierra el menú a partir de [data-menu-trigger]; auth.js conecta los botones.
 */
export function NavAccount(perfil, { estadoNoLeido = null } = {}) {
    const nombre = escapeHtml(perfil.gd_username);
    const avatar = escapeHtml(avatarAnimado(perfil.avatar_url));
    const esMod = perfil.rol === 'mod';
    const puntos = formatearPuntos(perfil.puntos_totales);
    const dotClass = estadoNoLeido && ESTADOS_VALIDOS.includes(estadoNoLeido)
        ? ` is-unread inbox-dot--${estadoNoLeido}`
        : '';
    const fallback = `onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';"`;

    return `
        <button id="btn-inbox" class="btn-icon" type="button" aria-haspopup="dialog" aria-label="${etiquetaBuzon(estadoNoLeido)}" title="Tus envíos">
            ${icon('bell', 20)}
            <span id="inbox-dot" class="inbox-dot${dotClass}" aria-hidden="true"></span>
        </button>

        <div class="account-menu">
            <button class="account-trigger" type="button" data-menu-trigger aria-expanded="false" aria-controls="account-menu-panel">
                <img class="account-trigger__avatar" src="${avatar}" alt="" ${fallback}>
                <span class="account-trigger__text">
                    <span class="account-trigger__name">${nombre}</span>
                    <span class="account-trigger__meta">${puntos} pts</span>
                </span>
                ${icon('chevronDown', 16, 'account-trigger__chevron')}
            </button>

            <div class="account-menu__panel" id="account-menu-panel" hidden>
                <div class="account-menu__header">
                    <img class="account-menu__avatar" src="${avatar}" alt="" ${fallback}>
                    <div class="account-menu__identity">
                        <span class="account-menu__name">${nombre}</span>
                        <span class="account-menu__meta">${esMod ? 'Moderador' : 'Jugador'} · ${puntos} pts</span>
                    </div>
                </div>
                <a class="account-menu__item" href="profile.html?uid=${encodeURIComponent(perfil.uid)}">${icon('user', 18)}Mi perfil</a>
                ${esMod ? `<a class="account-menu__item" id="btn-mod-panel" href="mod-panel.html">${icon('shield', 18)}Panel de moderación</a>` : ''}
                <div class="account-menu__sep" role="separator"></div>
                <button class="account-menu__item account-menu__item--danger" id="btn-logout" type="button">${icon('logout', 18)}Cerrar sesión</button>
            </div>
        </div>
    `;
}

export function InboxModal() {
    return `
        <div id="inbox-modal" class="modal-overlay" data-dismiss="backdrop">
            <div class="modal-content modal-content--scroll" role="dialog" aria-modal="true" aria-labelledby="inbox-title">
                <div class="modal-header">
                    <div>
                        <h2 id="inbox-title">Tus envíos</h2>
                        <p class="modal-lead modal-lead--tight">El estado de cada récord que has subido.</p>
                    </div>
                    <button id="btn-close-inbox" class="btn-close-icon" type="button" aria-label="Cerrar">${icon('close', 18)}</button>
                </div>
                <div id="inbox-items-container" class="inbox-list"></div>
            </div>
        </div>
    `;
}

export function InboxItem(envio) {
    const estado = ESTADOS_VALIDOS.includes(envio.estado) ? envio.estado : 'pendiente';
    const meta = [`ID ${escapeHtml(envio.nivel_id)}`];
    if (envio.fecha_submit) {
        meta.push(`<time datetime="${escapeHtml(envio.fecha_submit)}" title="${escapeHtml(formatoFecha(envio.fecha_submit))}">${escapeHtml(tiempoRelativo(envio.fecha_submit))}</time>`);
    }
    if (estado === 'aceptado' && envio.puntos_asignados) meta.push(`${formatearPuntos(envio.puntos_asignados)} pts`);

    const nota = envio.mod_nota
        ? `<p class="inbox-item__note"><span class="visually-hidden">Motivo: </span>${escapeHtml(envio.mod_nota)}</p>`
        : '';

    return `
        <article class="inbox-item">
            <div class="inbox-item__top">
                <h3 class="inbox-item__title">${escapeHtml(envio.nivel_nombre)}</h3>
                <span class="status-chip status-chip--${estado}">${ESTADO_LABEL[estado]}</span>
            </div>
            <p class="inbox-item__meta">${meta.join(' · ')}</p>
            ${nota}
        </article>
    `;
}

export function InboxEmpty() {
    return `
        <div class="empty-state empty-state--compact">
            <span class="empty-state__icon">${icon('inbox', 22)}</span>
            <p class="empty-state__title">Todavía no has subido récords</p>
            <p class="empty-state__text">Cuando subas uno, aquí verás si se acepta o se rechaza.</p>
        </div>
    `;
}
