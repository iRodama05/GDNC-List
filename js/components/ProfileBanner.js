import { avatarAnimado, DEFAULT_AVATAR } from '../avatar.js';
import { escapeHtml, formatearPuntos } from '../format.js';
import { icon, discordIcon } from './icons.js';

export const CUSTOM_BANNER_ID = 'custom';

// Se desbloquean con puntos_totales: la suma de las 3 completions de mayor valor.
// `imagen` vive en /img/banners. `fallback` se ve si el archivo todavía no existe.
export const BANNER_REWARDS = [
    { pts: 0, id: 'default', nombre: 'Clásico', imagen: null, fallback: 'linear-gradient(135deg, #1e1e24, #2b2b36)' },
    { pts: 25, id: 'banner_10', nombre: 'Novato', imagen: '/img/banners/banner_10.svg', fallback: 'linear-gradient(90deg, #121826, #6d8bb5)' },
    { pts: 50, id: 'banner_25', nombre: 'Principiante', imagen: '/img/banners/banner_25.svg', fallback: 'linear-gradient(90deg, #0b3d4a, #43cea2)' },
    { pts: 100, id: 'banner_50', nombre: 'Avanzado', imagen: '/img/banners/banner_50.svg', fallback: 'linear-gradient(90deg, #ff512f, #dd2476)' },
    { pts: 200, id: 'banner_100', nombre: 'Veterano', imagen: '/img/banners/banner_100.svg', fallback: 'linear-gradient(90deg, #0f3d2e, #93f9b9)' },
    { pts: 300, id: 'banner_200', nombre: 'Experto', imagen: '/img/banners/banner_200.svg', fallback: 'linear-gradient(90deg, #2a1604, #ffe08a)' },
    { pts: 400, id: 'banner_400', nombre: 'Maestro', imagen: '/img/banners/banner_400.svg', fallback: 'linear-gradient(90deg, #14082a, #7f5cff)' },
    { pts: 600, id: 'banner_800', nombre: 'Leyenda', imagen: '/img/banners/banner_800.svg', fallback: 'linear-gradient(90deg, #1a0610, #f5c16c)' },
    { pts: 800, id: CUSTOM_BANNER_ID, nombre: 'Personalizado', imagen: null, fallback: 'linear-gradient(135deg, #2b2b36, #1e1e24)' }
];

export const PUNTOS_BANNER_PERSONALIZADO = BANNER_REWARDS.find((banner) => banner.id === CUSTOM_BANNER_ID).pts;

function variablesDeBanner(banner) {
    return {
        '--banner-fallback': banner.fallback
    };
}

// El GIF va en un <img>: como fondo CSS, con varias capas y background-size, el navegador lo deja en el primer frame.
function sincronizarMediaBanner(element, imagen) {
    let media = element.querySelector('.profile-banner__media');

    if (!imagen) {
        media?.remove();
        return;
    }

    if (!media) {
        media = document.createElement('img');
        media.className = 'profile-banner__media';
        media.alt = '';
        media.decoding = 'async';
        element.prepend(media);
    }

    if (media.getAttribute('src') !== imagen) media.src = imagen;
}

const estiloInline = (vars) => Object.entries(vars).map(([key, value]) => `${key}: ${value}`).join('; ');

// Si el banner guardado ya no está desbloqueado, o es personalizado sin imagen, se muestra el clásico.
export function resolverBanner(perfil) {
    const puntos = perfil.puntos_totales || 0;
    const banner = BANNER_REWARDS.find((item) => item.id === perfil.banner_activo);

    if (!banner || puntos < banner.pts) return BANNER_REWARDS[0];
    if (banner.id === CUSTOM_BANNER_ID) {
        return perfil.banner_custom_url ? { ...banner, imagen: perfil.banner_custom_url } : BANNER_REWARDS[0];
    }
    return banner;
}

export function aplicarFondoBanner(element, banner) {
    Object.entries(variablesDeBanner(banner)).forEach(([key, value]) => element.style.setProperty(key, value));
    sincronizarMediaBanner(element, banner.imagen);
}

const CARGANDO_STAT = '<span class="skeleton-line skeleton-line--stat" aria-hidden="true"></span><span class="visually-hidden">Cargando</span>';

/**
 * Contenido de #profile-banner (.profile-header): portada con avatar y nombre, y franja de estadísticas.
 * profile.js rellena #stat-rank y #stat-records cuando llegan sus consultas.
 * Un jugador sin verificar no aparece en el ranking, así que su puesto se muestra como "—".
 */
export function ProfileBanner(perfil, { isOwner = false } = {}) {
    const nombre = escapeHtml(perfil.gd_username || 'Jugador');

    const discord = perfil.discord_username
        ? `<span class="profile-banner__discord">${discordIcon(16)}<span>${escapeHtml(perfil.discord_username)}</span></span>`
        : '';

    const roleBadge = perfil.rol === 'mod'
        ? `<span class="role-badge role-badge--media">${icon('shield', 14)}Moderador</span>`
        : '';

    const editButton = isOwner
        ? `<button id="btn-edit-banner" class="btn-edit-banner" type="button" aria-haspopup="dialog">${icon('image', 16)}Cambiar banner</button>`
        : '';

    return `
        <div class="profile-banner">
            <div class="profile-banner__content">
                <img src="${escapeHtml(avatarAnimado(perfil.avatar_url))}" alt="" class="profile-avatar-giant" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';">
                <div class="profile-banner__identity">
                    <h1 class="profile-banner__name">${nombre}</h1>
                    ${discord}
                    ${roleBadge}
                </div>
            </div>
            ${editButton}
        </div>

        <dl class="profile-stats">
            <div class="profile-stat">
                <dt class="profile-stat__label">Puesto</dt>
                <dd class="profile-stat__value" id="stat-rank">${perfil.gd_verificado ? CARGANDO_STAT : '—'}</dd>
            </div>
            <div class="profile-stat">
                <dt class="profile-stat__label">Puntos</dt>
                <dd class="profile-stat__value">${formatearPuntos(perfil.puntos_totales)}</dd>
            </div>
            <div class="profile-stat">
                <dt class="profile-stat__label">Récords</dt>
                <dd class="profile-stat__value" id="stat-records">${CARGANDO_STAT}</dd>
            </div>
        </dl>
    `;
}

// Texto y barra hacia el siguiente banner por desbloquear.
export function BannerProgress(puntos) {
    const siguiente = BANNER_REWARDS.find((banner) => banner.pts > puntos);
    const tienes = `<strong>${formatearPuntos(puntos)} pts</strong>`;

    if (!siguiente) {
        return `
            <p class="banner-progress__text">Tienes ${tienes}: ya desbloqueaste todos los banners.</p>
            <div class="banner-progress__track" aria-hidden="true"><div class="banner-progress__fill" style="--progress: 100%"></div></div>
        `;
    }

    const anterior = BANNER_REWARDS.filter((banner) => banner.pts <= puntos).at(-1) || BANNER_REWARDS[0];
    const progreso = Math.round(((puntos - anterior.pts) / (siguiente.pts - anterior.pts)) * 100);

    return `
        <p class="banner-progress__text">Tienes ${tienes}. Te faltan <strong>${formatearPuntos(siguiente.pts - puntos)}</strong> para <strong>${escapeHtml(siguiente.nombre)}</strong>.</p>
        <div class="banner-progress__track" role="progressbar" aria-label="Progreso hacia ${escapeHtml(siguiente.nombre)}" aria-valuemin="${anterior.pts}" aria-valuemax="${siguiente.pts}" aria-valuenow="${puntos}">
            <div class="banner-progress__fill" style="--progress: ${progreso}%"></div>
        </div>
    `;
}

export function BannerOption(banner, { unlocked, selected, customUrl }) {
    const esCustom = banner.id === CUSTOM_BANNER_ID;
    const sinImagen = esCustom && !customUrl;
    const preview = esCustom && customUrl ? { ...banner, imagen: customUrl } : banner;
    const nombre = escapeHtml(banner.nombre);

    let estado = '';
    let etiqueta = nombre;
    if (!unlocked) {
        estado = `${icon('lock', 14)}Se desbloquea con ${formatearPuntos(banner.pts)} pts`;
        etiqueta = `${nombre}, se desbloquea con ${formatearPuntos(banner.pts)} pts`;
    } else if (selected) {
        estado = 'En uso';
        etiqueta = `${nombre}, en uso`;
    } else if (sinImagen) {
        estado = 'Sube una imagen o GIF';
        etiqueta = `${nombre}: subir una imagen o GIF`;
    }

    const uploadButton = esCustom && unlocked
        ? `<button type="button" class="banner-upload-btn" data-action="upload">${icon('upload', 14)}${customUrl ? 'Cambiar imagen' : 'Subir imagen'}</button>`
        : '';

    const media = preview.imagen
        ? `<img class="banner-option__media" src="${escapeHtml(preview.imagen)}" alt="" loading="lazy">`
        : '';

    const classes = [
        'banner-option',
        selected && 'selected',
        !unlocked && 'locked',
        sinImagen && unlocked && 'banner-option--empty'
    ].filter(Boolean).join(' ');

    return `
        <div class="${classes}" data-id="${banner.id}" data-unlocked="${unlocked}" style="${estiloInline(variablesDeBanner(preview))}">
            ${media}
            <button type="button" class="banner-option__hit" aria-pressed="${Boolean(selected)}" ${unlocked ? '' : 'aria-disabled="true"'} aria-label="${etiqueta}"></button>
            <span class="banner-option__label" aria-hidden="true">
                <span class="banner-option__name">${nombre}</span>
                ${estado ? `<span class="banner-option__status">${estado}</span>` : ''}
            </span>
            <span class="banner-option__check" aria-hidden="true">${icon('check', 16)}</span>
            ${uploadButton}
        </div>
    `;
}
