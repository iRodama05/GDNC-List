import { avatarAnimado, DEFAULT_AVATAR } from '../avatar.js';
import { escapeHtml, formatearPuntos } from '../format.js';
import { discordIcon } from './icons.js';

/**
 * Fila del ranking. El podio usa el mismo marcado: cards.css lo convierte en tarjeta
 * cuando #podium-container tiene .is-active, y vuelve a ser fila mientras se busca.
 * ui.js filtra por .player-card y .player-card__title, así que esas dos clases no cambian.
 */
export function PlayerCard(player, rank, { eager = false } = {}) {
    const medalla = rank <= 3 ? ` player-card--rank-${rank}` : '';
    const nombre = escapeHtml(player.gd_username);
    const hardests = Array.isArray(player.top_3_hardests) ? player.top_3_hardests : [];

    const hardestsHTML = hardests.length > 0
        ? hardests.map((nivel) => `
            <li class="hardest-item">
                <span class="hardest-item__name">${escapeHtml(nivel.nombre)}</span>
                <span class="hardest-item__pts">${formatearPuntos(nivel.puntos)} pts</span>
            </li>
        `).join('')
        : '<li class="hardest-item hardest-item--empty">Sin récords todavía</li>';

    const discord = player.discord_username
        ? `<p class="player-card__discord">${discordIcon(13)}<span class="player-card__discord-text">${escapeHtml(player.discord_username)}</span></p>`
        : '';

    return `
        <a href="profile.html?uid=${encodeURIComponent(player.uid)}" class="player-card${medalla}">
            <span class="player-card__rank"><span class="visually-hidden">Puesto </span><span class="player-card__rank-hash" aria-hidden="true">#</span>${rank}</span>

            <img src="${escapeHtml(avatarAnimado(player.avatar_url))}" alt="" class="player-card__avatar" ${eager ? '' : 'loading="lazy"'} decoding="async" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';">

            <div class="player-card__info">
                <h3 class="player-card__title">${nombre}</h3>
                ${discord}
            </div>

            <ul class="player-card__hardests" aria-label="Récords que suman">
                ${hardestsHTML}
            </ul>

            <p class="player-card__points">
                <span class="player-card__points-value">${formatearPuntos(player.puntos_totales)}</span>
                <span class="player-card__points-label">pts</span>
            </p>
        </a>
    `;
}
