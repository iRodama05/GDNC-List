import { escapeHtml, enlaceSeguro, formatearPuntos } from '../format.js';
import { icon } from './icons.js';

const limpiarId = (id = '') => (/^[\w-]{6,20}$/.test(id) ? id : null);

// Acepta watch?v=, youtu.be/, /shorts/, /live/ y /embed/. Devuelve null si la URL no es de YouTube.
export function youtubeId(url = '') {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^(www|m)\./, '');

        if (host === 'youtu.be') return limpiarId(parsed.pathname.slice(1).split('/')[0]);
        if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
            const v = parsed.searchParams.get('v');
            if (v) return limpiarId(v);
            const match = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
            if (match) return limpiarId(match[1]);
        }
    } catch {
        // URL mal formada: se trata como enlace externo.
    }
    return null;
}

function plataformaDe(url = '') {
    if (/medal\.tv/i.test(url)) return 'Medal.tv';
    if (/twitch\.tv/i.test(url)) return 'Twitch';
    return null;
}

/**
 * Miniatura del video. En YouTube es un botón: el iframe solo se carga al pulsarlo,
 * así un perfil con muchos récords no descarga un reproductor por tarjeta.
 */
export function RecordMedia({ video_url: url = '', nivel_nombre: nombre = '' }) {
    const id = youtubeId(url);
    const titulo = escapeHtml(nombre);

    if (id) {
        return `
            <button type="button" class="record-media" data-youtube-id="${id}" data-title="${titulo}" aria-label="Reproducir el video de ${titulo}">
                <img class="record-media__thumb" src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" decoding="async">
                <span class="record-media__play">${icon('play', 22)}</span>
                <span class="record-media__source">YouTube</span>
            </button>
        `;
    }

    const plataforma = plataformaDe(url);
    const href = enlaceSeguro(url);
    const enlace = href
        ? `<a class="btn-outline btn-sm" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${plataforma ? `Ver en ${plataforma}` : 'Abrir video'}${icon('external', 14)}</a>`
        : '';

    let texto = 'Video fuera de YouTube';
    if (!href) texto = 'El enlace del video no es válido';
    else if (plataforma) texto = `Video en ${plataforma}`;

    return `
        <div class="record-media record-media--external">
            ${icon('video', 28)}
            <p>${texto}</p>
            ${enlace}
        </div>
    `;
}

export function YouTubePlayer(id, titulo = '') {
    return `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0" title="Video de ${escapeHtml(titulo)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
}

export function RecordCard(record, { isMod = false } = {}) {
    const nombre = escapeHtml(record.nivel_nombre);

    const modControls = isMod ? `
        <div class="record-actions">
            <button class="btn-ghost btn-sm btn-edit-record" type="button" data-id="${record.submit_id}" data-pts="${escapeHtml(record.puntos_asignados)}" data-lvlname="${nombre}" aria-label="Editar los puntos de ${nombre}">
                ${icon('edit', 16)}
                <span>Editar</span>
            </button>
            <button class="btn-ghost btn-ghost--danger btn-sm btn-delete-record" type="button" data-id="${record.submit_id}" data-lvlname="${nombre}" aria-label="Borrar ${nombre}">
                ${icon('trash', 16)}
                <span>Borrar</span>
            </button>
        </div>
    ` : '';

    return `
        <article class="record-card">
            ${RecordMedia(record)}
            <div class="record-body">
                <div class="record-heading">
                    <h3 class="record-title">${nombre}</h3>
                    <span class="record-points">${formatearPuntos(record.puntos_asignados)} <span class="record-points__label">pts</span></span>
                </div>
                <span class="record-id">ID ${escapeHtml(record.nivel_id)}</span>
                <div class="record-footer">
                    <button class="btn-ghost btn-sm btn-comentarios" type="button" data-submitid="${record.submit_id}" data-lvlname="${nombre}" aria-haspopup="dialog" aria-label="Comentarios de ${nombre}">
                        ${icon('message', 16)}
                        <span>Comentarios</span>
                    </button>
                    ${modControls}
                </div>
            </div>
        </article>
    `;
}

export function RecordDivider(texto) {
    return `<p class="record-divider">${escapeHtml(texto)}</p>`;
}
