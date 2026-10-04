import { avatarAnimado } from '../avatar.js';

export const CUSTOM_BANNER_ID = 'custom';

// Se desbloquean con puntos_totales: la suma de las 3 completions de mayor valor.
// `imagen` vive en /img/banners. `fallback` se ve si el archivo todavía no existe.
export const BANNER_REWARDS = [
    { pts: 0, id: 'default', nombre: 'Clásico', imagen: null, fallback: 'linear-gradient(135deg, #1e1e24, #2b2b36)' },
    { pts: 5, id: 'banner_10', nombre: 'Novato', imagen: '/img/banners/banner_10.svg', fallback: 'linear-gradient(90deg, #121826, #6d8bb5)' },
    { pts: 15, id: 'banner_25', nombre: 'Principiante', imagen: '/img/banners/banner_25.svg', fallback: 'linear-gradient(90deg, #0b3d4a, #43cea2)' },
    { pts: 30, id: 'banner_50', nombre: 'Avanzado', imagen: '/img/banners/banner_50.svg', fallback: 'linear-gradient(90deg, #ff512f, #dd2476)' },
    { pts: 75, id: 'banner_100', nombre: 'Veterano', imagen: '/img/banners/banner_100.svg', fallback: 'linear-gradient(90deg, #0f3d2e, #93f9b9)' },
    { pts: 150, id: 'banner_200', nombre: 'Experto', imagen: '/img/banners/banner_200.svg', fallback: 'linear-gradient(90deg, #2a1604, #ffe08a)' },
    { pts: 300, id: 'banner_400', nombre: 'Maestro', imagen: '/img/banners/banner_400.svg', fallback: 'linear-gradient(90deg, #14082a, #7f5cff)' },
    { pts: 650, id: 'banner_800', nombre: 'Leyenda', imagen: '/img/banners/banner_800.svg', fallback: 'linear-gradient(90deg, #1a0610, #f5c16c)' },
    { pts: 1000, id: CUSTOM_BANNER_ID, nombre: 'Personalizado', imagen: null, fallback: 'linear-gradient(135deg, #2b2b36, #1e1e24)' }
];

const escapeHtml = (text = '') => String(text).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

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

export function ProfileBanner(perfil, { isOwner, isMod }) {
    const esModerador = perfil.rol === 'mod';
    const roleClass = esModerador ? 'nav-role nav-role--mod' : 'nav-role';

    const modButton = isMod
        ? '<button id="btn-mod-add-record" class="btn-primary btn-primary--mod profile-banner__mod-btn" type="button">+ Añadir Récord Manual</button>'
        : '';

    const editButton = isOwner ? `
        <button id="btn-edit-banner" class="btn-edit-banner" type="button" title="Cambiar Banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <span>Cambiar Banner</span>
        </button>
    ` : '';

    return `
        <img src="${escapeHtml(avatarAnimado(perfil.avatar_url))}" alt="Avatar de ${escapeHtml(perfil.gd_username)}" class="profile-avatar-giant" onerror="this.onerror=null;this.src='${escapeHtml(avatarAnimado())}';">

        <div class="profile-banner__identity">
            <h1 class="profile-banner__name">${escapeHtml(perfil.gd_username)}</h1>
            <div class="profile-banner__discord">
                <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="currentColor" aria-hidden="true">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c2.64-27.38-4.51-51.11-19.32-72.15ZM42.68,65.27C36.67,65.27,31.7,59.65,31.7,52.7c0-6.86,4.78-12.58,10.98-12.58,6.26,0,11.11,5.81,10.98,12.58C53.66,59.65,48.8,65.27,42.68,65.27Zm41.85,0c-6.01,0-10.98-5.62-10.98-12.58,0-6.86,4.78-12.58,10.98-12.58,6.26,0,11.11,5.81,10.98,12.58C95.51,59.65,90.65,65.27,84.53,65.27Z"/>
                </svg>
                <span>${escapeHtml(perfil.discord_username)}</span>
            </div>
            ${modButton}
        </div>

        <div class="profile-stats-container">
            <div class="stat-box">
                <span class="stat-label">Puntos Actuales</span>
                <span class="stat-value stat-value--red">${perfil.puntos_totales || 0}</span>
            </div>
            <div class="stat-box">
                <span class="stat-label">Estado</span>
                <span class="${roleClass} stat-role">${escapeHtml((perfil.rol || 'user').toUpperCase())}</span>
            </div>
        </div>

        ${editButton}
    `;
}

export function BannerOption(banner, { unlocked, selected, customUrl }) {
    const esCustom = banner.id === CUSTOM_BANNER_ID;
    const sinImagen = esCustom && !customUrl;
    const preview = esCustom && customUrl ? { ...banner, imagen: customUrl } : banner;

    let badgeText = banner.nombre;
    if (!unlocked) badgeText = `🔒 ${banner.nombre} · ${banner.pts} PTS`;
    else if (sinImagen) badgeText = 'Sube tu imagen o GIF';

    const uploadButton = esCustom && unlocked
        ? `<button type="button" class="banner-upload-btn" data-action="upload">${customUrl ? 'Cambiar imagen' : 'Subir imagen'}</button>`
        : '';

    const media = preview.imagen
        ? `<img class="banner-option__media" src="${escapeHtml(preview.imagen)}" alt="">`
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
            <span class="banner-badge">${badgeText}</span>
            ${uploadButton}
        </div>
    `;
}
