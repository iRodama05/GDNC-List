import { DEV_USER_ID } from '../config.js';
import { avatarAnimado, DEFAULT_AVATAR } from '../avatar.js';
import { obtenerAvatarPorUid } from '../api/profileApi.js';

const DISCORD_USER = 'i.rodaa';
const DISCORD_DISPLAY = 'iRodamaa';

/**
 * Crédito fijo del sitio. Visible en todas las vistas que cargan ui.js.
 * El botón es pequeño a propósito: quien quiera el contacto lo abre, el resto lo ignora.
 */
export function mountSiteCredit() {
    if (document.getElementById('btn-site-credit')) return;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = 'btn-site-credit';
    trigger.className = 'site-credit';
    trigger.innerHTML = 'Hecho por <strong>iRodamaa05</strong>';

    const modal = document.createElement('div');
    modal.id = 'credit-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content credit-modal" role="dialog" aria-labelledby="credit-modal-title">
            <div class="credit-modal__accent" aria-hidden="true"></div>
            <button type="button" class="btn-close-icon credit-modal__close" id="btn-close-credit" aria-label="Cerrar">&times;</button>
            <p class="credit-modal__kicker">GDNC List</p>
            <h2 id="credit-modal-title" class="credit-modal__title">Esta página fue hecha por</h2>
            <p class="credit-modal__name">iRodamaa05</p>
            <p class="credit-modal__lead">Si te interesa una página similar para tu comunidad, escríbeme por Discord.</p>
            <div class="credit-discord">
                <img class="credit-discord__mark" id="credit-avatar" alt="" src="${DEFAULT_AVATAR}">
                <div class="credit-discord__text">
                    <p class="credit-discord__display">${DISCORD_DISPLAY}</p>
                    <p class="credit-discord__user">${DISCORD_USER}</p>
                </div>
                <button type="button" class="btn-outline credit-discord__copy" id="btn-copy-discord">Copiar usuario</button>
            </div>
        </div>
    `;

    document.body.append(trigger, modal);

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

    const closeBtn = modal.querySelector('#btn-close-credit');
    const copyBtn = modal.querySelector('#btn-copy-discord');

    const openModal = () => {
        modal.classList.remove('is-closing');
        modal.style.display = 'flex';
    };

    const closeModal = () => {
        if (modal.style.display === 'none') return;
        modal.classList.add('is-closing');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('is-closing');
        }, 300);
    };

    trigger.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.style.display === 'flex') closeModal();
    });

    const copyDiscordUser = async () => {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(DISCORD_USER);
            return;
        }
        const field = document.createElement('textarea');
        field.value = DISCORD_USER;
        field.setAttribute('readonly', '');
        field.className = 'credit-copy-field';
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('copy failed');
    };

    copyBtn.addEventListener('click', async () => {
        try {
            await copyDiscordUser();
            copyBtn.textContent = 'Copiado';
        } catch {
            copyBtn.textContent = 'No se pudo copiar';
        }
        setTimeout(() => {
            copyBtn.textContent = 'Copiar usuario';
        }, 1600);
    });
}
