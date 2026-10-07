import { avatarAnimado, DEFAULT_AVATAR } from '../avatar.js';
import { escapeHtml, tiempoRelativo } from '../format.js';

export function CommentItem(comentario) {
    const autor = comentario.usuarios || {};
    const fecha = new Date(comentario.creado_en);
    const time = Number.isNaN(fecha.getTime())
        ? ''
        : `<time class="comment__time" datetime="${fecha.toISOString()}">${tiempoRelativo(fecha)}</time>`;

    return `
        <article class="comment">
            <img class="comment-avatar" src="${escapeHtml(avatarAnimado(autor.avatar_url))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';">
            <div class="comment__body">
                <div class="comment__header">
                    <span class="comment__author">${escapeHtml(autor.gd_username || 'Jugador')}</span>
                    ${time}
                </div>
                <p class="comment__text">${escapeHtml(comentario.texto)}</p>
            </div>
        </article>
    `;
}
