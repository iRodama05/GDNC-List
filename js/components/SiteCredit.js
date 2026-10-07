import { DEV_USER_ID } from '../config.js';
import { avatarAnimado, DEFAULT_AVATAR } from '../avatar.js';
import { obtenerAvatarPorUid } from '../api/profileApi.js';
import { abrirModal, cerrarModal } from '../modal.js';
import { escapeHtml } from '../format.js';
import { copiarConAviso } from '../utils.js';
import { icon } from './icons.js';

const DISCORD_USER = 'i.rodaa';
const DISCORD_DISPLAY = 'iRodamaa';

/**
 * Pie de página con el crédito del autor y la versión. Visible en todas las vistas que cargan ui.js.
 * Va en el flujo del documento: está a la vista al final de cada página y no tapa contenido en móvil.
 */
export function mountSiteCredit({ version } = {}) {
    if (document.getElementById('btn-site-credit')) return;

    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `
        <div class="site-footer__inner">
            <button type="button" id="btn-site-credit" class="site-credit" aria-haspopup="dialog">
                ${icon('code', 16)}
                <span>Hecho por <strong>iRodamaa05</strong></span>
            </button>
            ${version ? `<span class="app-version">v${escapeHtml(version)}</span>` : ''}
        </div>
    `;

    const modal = document.createElement('div');
    modal.id = 'credit-modal';
    modal.className = 'modal-overlay';
    modal.dataset.dismiss = 'backdrop';
    modal.innerHTML = `
        <div class="modal-content credit-modal" role="dialog" aria-modal="true" aria-labelledby="credit-modal-title">
            <div class="credit-modal__accent" aria-hidden="true"></div>
            <button type="button" class="btn-close-icon credit-modal__close" id="btn-close-credit" aria-label="Cerrar">${icon('close', 18)}</button>
            <p class="credit-modal__kicker">NCL Opus</p>
            <h2 id="credit-modal-title" class="credit-modal__title">Esta página fue hecha por</h2>
            <p class="credit-modal__name">iRodamaa05</p>
            <p class="credit-modal__lead">Si te interesa una página similar para tu comunidad, escríbeme por Discord.</p>
            <div class="credit-discord">
                <img class="credit-discord__mark" id="credit-avatar" alt="" src="${DEFAULT_AVATAR}">
                <div class="credit-discord__text">
                    <p class="credit-discord__display">${DISCORD_DISPLAY}</p>
                    <p class="credit-discord__user">${DISCORD_USER}</p>
                </div>
                <button type="button" class="btn-outline btn-sm credit-discord__copy" id="btn-copy-discord">
                    ${icon('copy', 16)}
                    <span>Copiar usuario</span>
                </button>
            </div>
        </div>
    `;

    const main = document.querySelector('main');
    if (main) main.after(footer);
    else document.body.append(footer);
    document.body.append(modal);

    const trigger = footer.querySelector('#btn-site-credit');
    const avatar = modal.querySelector('#credit-avatar');
    avatar.addEventListener('error', () => {
        avatar.onerror = null;
        avatar.src = DEFAULT_AVATAR;
    });
    obtenerAvatarPorUid(DEV_USER_ID)
        .then((url) => {
            if (url) avatar.src = avatarAnimado(url);
        })
        .catch(() => {});

    trigger.addEventListener('click', () => abrirModal(modal));
    modal.querySelector('#btn-close-credit').addEventListener('click', () => cerrarModal(modal));

    const copyBtn = modal.querySelector('#btn-copy-discord');
    copyBtn.addEventListener('click', () => copiarConAviso(copyBtn, DISCORD_USER));
}
