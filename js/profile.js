import { getCurrentUser } from './config.js';
import { abrirModal, cerrarModal } from './modal.js';
import { recalcularPuntosUsuario } from './api/modApi.js';
import {
    obtenerPerfil, obtenerRolUsuario, obtenerPosicionEnRanking, obtenerRecordsAceptados,
    obtenerInteracciones, publicarComentario, alternarMeGusta,
    crearRecordAceptado, borrarRecord, actualizarPuntosRecord,
    actualizarBannerActivo, subirBannerPersonalizado, BANNER_MAX_BYTES, BANNER_MIME_TYPES
} from './api/profileApi.js';
import {
    ProfileBanner, BannerOption, BannerProgress, BANNER_REWARDS, CUSTOM_BANNER_ID,
    PUNTOS_BANNER_PERSONALIZADO, resolverBanner, aplicarFondoBanner
} from './components/ProfileBanner.js';
import { RecordCard, RecordDivider } from './components/RecordCard.js';
import { CommentItem } from './components/CommentItem.js';
import { confirmDialog, promptDialog, alertDialog } from './components/Dialog.js';
import { icon } from './components/icons.js';
import { formatearPuntos } from './format.js';
import { marcarOcupado } from './utils.js';

// ==========================================
// 1. CONFIGURACIÓN INICIAL
// ==========================================
const profileHeader = document.getElementById('profile-banner');
const recordsHeader = document.getElementById('records-header');
const recordsGrid = document.getElementById('records-grid');
const btnModAddRecord = document.getElementById('btn-mod-add-record');

const targetUid = new URLSearchParams(window.location.search).get('uid');

// Perfil que se está viendo y uid de quien lo mira (null sin sesión).
let perfilDueno = null;
let visitanteUid = null;

const portada = () => profileHeader.querySelector('.profile-banner');

function terminarCarga() {
    profileHeader.removeAttribute('role');
    profileHeader.removeAttribute('aria-label');
}

function pintarPerfilNoDisponible(titulo, texto) {
    terminarCarga();
    profileHeader.innerHTML = `
        <div class="profile-banner profile-banner--empty">
            <div class="empty-state empty-state--compact">
                <span class="empty-state__icon">${icon('user', 22)}</span>
                <p class="empty-state__title">${titulo}</p>
                <p class="empty-state__text">${texto}</p>
                <a class="btn-outline" href="index.html">Volver al ranking</a>
            </div>
        </div>
    `;
    recordsHeader.hidden = true;
    recordsGrid.innerHTML = '';
}

// ==========================================
// 2. CARGA PRINCIPAL DEL PERFIL
// ==========================================
async function cargarPerfilCompleto() {
    if (!targetUid) {
        return pintarPerfilNoDisponible('No se indicó un jugador', 'Abre un perfil desde el ranking.');
    }

    const sessionUser = await getCurrentUser();
    visitanteUid = sessionUser?.id || null;
    const isOwner = visitanteUid === targetUid;

    let perfil;
    let isMod = false;
    try {
        [perfil, isMod] = await Promise.all([
            obtenerPerfil(targetUid),
            visitanteUid ? obtenerRolUsuario(visitanteUid).then((rol) => rol === 'mod') : false
        ]);
    } catch (error) {
        console.error('No se pudo cargar el perfil:', error);
        return pintarPerfilNoDisponible('No se pudo cargar el perfil', 'Revisa tu conexión y recarga la página.');
    }

    if (!perfil) {
        return pintarPerfilNoDisponible('No encontramos a este jugador', 'Puede que el enlace esté mal o que la cuenta ya no exista.');
    }

    perfilDueno = perfil;
    if (perfil.gd_username) document.title = `${perfil.gd_username} · NCL Opus`;

    terminarCarga();
    profileHeader.innerHTML = ProfileBanner(perfil, { isOwner });
    aplicarFondoBanner(portada(), resolverBanner(perfil));

    if (isOwner) inicializarSelectorBanners();
    if (isMod) inicializarEventosMod();

    if (perfil.gd_verificado) {
        obtenerPosicionEnRanking(perfil.puntos_totales || 0)
            .then((puesto) => { document.getElementById('stat-rank').textContent = `#${puesto}`; })
            .catch(() => { document.getElementById('stat-rank').textContent = '—'; });
    }

    let records = [];
    try {
        records = await obtenerRecordsAceptados(targetUid);
    } catch (error) {
        console.error('No se pudieron cargar los récords:', error);
        document.getElementById('stat-records').textContent = '—';
        recordsGrid.innerHTML = '<p class="status-message status-message--error">No se pudieron cargar los récords. Recarga la página para intentarlo de nuevo.</p>';
        return;
    }

    document.getElementById('stat-records').textContent = formatearPuntos(records.length);
    pintarRecords(records, { isOwner, isMod });
}

function pintarRecords(records, { isOwner, isMod }) {
    if (records.length === 0) {
        const canSubmit = document.body.dataset.canSubmit === 'true';
        recordsGrid.innerHTML = `
            <div class="empty-state">
                <span class="empty-state__icon">${icon('video', 22)}</span>
                <p class="empty-state__title">${isOwner ? 'Todavía no tienes récords' : 'Sin récords todavía'}</p>
                <p class="empty-state__text">${isOwner
                    ? 'Sube el video de una completion y un moderador le asignará los puntos.'
                    : 'Cuando un moderador acepte uno de sus récords, aparecerá aquí.'}</p>
                ${isOwner ? `<button type="button" id="btn-empty-submit" class="btn-primary" ${canSubmit ? '' : 'hidden'}>${icon('plus')}Subir récord</button>` : ''}
            </div>
        `;
        document.getElementById('btn-empty-submit')?.addEventListener('click', () => {
            document.getElementById('btn-open-submit')?.click();
        });
        return;
    }

    // Los tres primeros son los que suman; el resto va detrás de un separador.
    recordsGrid.innerHTML = records.map((record, index) => {
        const card = RecordCard(record, { isMod });
        return index === 2 && records.length > 3 ? `${card}${RecordDivider('Otros récords')}` : card;
    }).join('');
}

document.addEventListener('gdnc:can-submit', () => {
    const button = document.getElementById('btn-empty-submit');
    if (button) button.hidden = false;
});

// ==========================================
// 3. SISTEMA DE COMENTARIOS Y LIKES
// ==========================================
const commentsModal = document.getElementById('comments-modal');
const commentsList = document.getElementById('comments-list');
const commentForm = document.getElementById('comment-form');
const commentLoginHint = document.getElementById('comment-login-hint');
const commentFeedback = document.getElementById('comment-feedback');
const newCommentInput = document.getElementById('new-comment-input');
const btnSendComment = document.getElementById('btn-send-comment');
const btnLikeSubmit = document.getElementById('btn-like-submit');
const likeCountDisplay = document.getElementById('like-count');
const likeLabel = document.getElementById('like-label');
const modalLvlTitle = document.getElementById('modal-lvl-title');

let currentSubmitId = null;
let likesActuales = 0;
let likePendiente = false;

recordsGrid.addEventListener('click', (event) => {
    const button = event.target.closest('.btn-comentarios');
    if (!button) return;
    currentSubmitId = button.dataset.submitid;
    modalLvlTitle.textContent = button.dataset.lvlname;
    commentFeedback.textContent = '';
    abrirModal(commentsModal);
    cargarComentarios();
});

document.getElementById('btn-close-comments').addEventListener('click', () => cerrarModal(commentsModal));

function pintarLike(liked, total) {
    likesActuales = Math.max(0, total);
    btnLikeSubmit.classList.toggle('is-liked', liked);
    btnLikeSubmit.setAttribute('aria-pressed', String(liked));
    likeCountDisplay.textContent = formatearPuntos(likesActuales);
    likeLabel.textContent = liked ? 'Te gusta' : 'Me gusta';
}

async function cargarComentarios() {
    const submitId = currentSubmitId;
    const conSesion = Boolean(visitanteUid);

    commentsList.innerHTML = '<p class="status-message">Cargando comentarios…</p>';
    commentForm.hidden = !conSesion;
    commentLoginHint.hidden = conSesion;
    btnLikeSubmit.disabled = !conSesion;

    let interacciones;
    try {
        interacciones = await obtenerInteracciones(submitId, visitanteUid);
    } catch (error) {
        console.error(error);
        if (submitId === currentSubmitId) {
            commentsList.innerHTML = '<p class="status-message status-message--error">No se pudieron cargar los comentarios.</p>';
        }
        return;
    }

    // Si se abrió otro récord mientras cargaba, esta respuesta ya no vale.
    if (submitId !== currentSubmitId) return;

    const { likes, meGusta, comentarios } = interacciones;
    pintarLike(meGusta, likes);

    if (comentarios.length === 0) {
        commentsList.innerHTML = `<p class="status-message">Todavía no hay comentarios.${conSesion ? ' Escribe el primero.' : ''}</p>`;
        return;
    }

    commentsList.innerHTML = comentarios.map(CommentItem).join('');
    commentsList.scrollTop = commentsList.scrollHeight;
}

commentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const texto = newCommentInput.value.trim();
    if (!texto || !currentSubmitId || !visitanteUid) return;

    commentFeedback.textContent = '';
    const restaurar = marcarOcupado(btnSendComment);
    try {
        await publicarComentario(currentSubmitId, visitanteUid, texto);
        newCommentInput.value = '';
        await cargarComentarios();
    } catch (error) {
        console.error(error);
        commentFeedback.textContent = 'No se pudo publicar el comentario. Inténtalo de nuevo.';
    } finally {
        restaurar();
        newCommentInput.focus();
    }
});

// Se pinta al momento y se revierte si Supabase rechaza el cambio.
btnLikeSubmit.addEventListener('click', async () => {
    if (!visitanteUid || !currentSubmitId || likePendiente) return;

    const teniaLike = btnLikeSubmit.getAttribute('aria-pressed') === 'true';
    const totalAnterior = likesActuales;
    pintarLike(!teniaLike, totalAnterior + (teniaLike ? -1 : 1));
    likePendiente = true;

    try {
        const ahora = await alternarMeGusta(currentSubmitId, visitanteUid);
        // Otra pestaña cambió el like mientras tanto: se vuelve a leer el estado real.
        if (ahora === teniaLike) cargarComentarios();
    } catch (error) {
        console.error(error);
        pintarLike(teniaLike, totalAnterior);
    } finally {
        likePendiente = false;
    }
});

// ==========================================
// 4. HERRAMIENTAS DE MODERACIÓN
// ==========================================
const PUNTOS_VALIDOS = /^\d+$/;
const validarPuntos = (valor) => (PUNTOS_VALIDOS.test(valor) && Number(valor) > 0 ? '' : 'Escribe un número entero mayor que 0.');

function marcarCampo(input, valido) {
    if (valido) input.removeAttribute('aria-invalid');
    else input.setAttribute('aria-invalid', 'true');
    return valido;
}

async function guardarYRecargar(accion, tituloError) {
    try {
        await accion();
        await recalcularPuntosUsuario(targetUid);
        window.location.reload();
    } catch (error) {
        console.error(error);
        alertDialog({ title: tituloError, message: 'Revisa tu conexión e inténtalo de nuevo.' });
    }
}

function inicializarEventosMod() {
    const modModal = document.getElementById('mod-add-modal');
    const modForm = document.getElementById('mod-add-form');
    const modFeedback = document.getElementById('mod-add-feedback');
    const btnModSubmit = document.getElementById('btn-mod-submit');

    btnModAddRecord.hidden = false;
    btnModAddRecord.addEventListener('click', () => {
        modFeedback.textContent = '';
        abrirModal(modModal, { focus: '#mod-lvl-name' });
    });

    const cerrarModAdd = () => cerrarModal(modModal);
    document.getElementById('btn-mod-cancel').addEventListener('click', cerrarModAdd);
    document.getElementById('btn-mod-close').addEventListener('click', cerrarModAdd);

    modForm.addEventListener('input', (event) => event.target.removeAttribute('aria-invalid'));

    modForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const inputs = ['mod-lvl-name', 'mod-lvl-id', 'mod-lvl-video', 'mod-lvl-pts'].map((id) => document.getElementById(id));
        const [nameInput, idInput, videoInput, ptsInput] = inputs;
        const pts = ptsInput.value.trim();

        const validos = [
            marcarCampo(nameInput, nameInput.value.trim() !== ''),
            marcarCampo(idInput, /^\d+$/.test(idInput.value.trim())),
            marcarCampo(videoInput, /^https?:\/\/\S+$/i.test(videoInput.value.trim())),
            marcarCampo(ptsInput, validarPuntos(pts) === '')
        ];

        const primerInvalido = inputs[validos.indexOf(false)];
        if (primerInvalido) {
            modFeedback.textContent = 'Revisa los campos marcados: el ID es numérico, el video empieza con https:// y los puntos son mayores que 0.';
            primerInvalido.focus();
            return;
        }

        modFeedback.textContent = '';
        const restaurar = marcarOcupado(btnModSubmit, 'Guardando…');
        try {
            await crearRecordAceptado({
                uid: targetUid,
                gdUsername: perfilDueno.gd_username,
                nivelNombre: nameInput.value.trim(),
                nivelId: idInput.value.trim(),
                videoUrl: videoInput.value.trim(),
                puntos: Number(pts)
            });
            await recalcularPuntosUsuario(targetUid);
            window.location.reload();
        } catch (error) {
            console.error(error);
            modFeedback.textContent = 'No se pudo guardar el récord. Inténtalo de nuevo.';
            restaurar();
        }
    });

    recordsGrid.addEventListener('click', async (event) => {
        const editButton = event.target.closest('.btn-edit-record');
        if (editButton) {
            const puntos = await promptDialog({
                title: 'Editar puntos',
                message: editButton.dataset.lvlname,
                label: 'Puntos',
                value: editButton.dataset.pts,
                inputMode: 'numeric',
                confirmText: 'Guardar puntos',
                validate: validarPuntos
            });
            if (puntos === null) return;
            await guardarYRecargar(() => actualizarPuntosRecord(editButton.dataset.id, Number(puntos)), 'No se pudieron guardar los puntos');
            return;
        }

        const deleteButton = event.target.closest('.btn-delete-record');
        if (!deleteButton) return;

        const confirmado = await confirmDialog({
            title: `¿Borrar ${deleteButton.dataset.lvlname}?`,
            message: 'El récord desaparece del perfil y los puntos del jugador se recalculan. No se puede deshacer.',
            confirmText: 'Borrar récord',
            destructive: true
        });
        if (!confirmado) return;

        deleteButton.disabled = true;
        await guardarYRecargar(() => borrarRecord(deleteButton.dataset.id), 'No se pudo borrar el récord');
        deleteButton.disabled = false;
    });
}

// ==========================================
// 5. SELECTOR DE BANNERS
// ==========================================
const bannerModal = document.getElementById('banner-modal');
const bannerList = document.getElementById('banner-list');
const bannerProgress = document.getElementById('banner-progress');
const bannerPointsLabel = document.getElementById('banner-points-label');
const bannerFileInput = document.getElementById('banner-file-input');
const bannerFeedback = document.getElementById('banner-feedback');

function mostrarFeedbackBanner(mensaje) {
    bannerFeedback.textContent = mensaje || '';
    bannerFeedback.hidden = !mensaje;
}

// "En uso" es el banner que se ve en la portada, no el guardado: si este quedó bloqueado, se muestra el clásico.
const bannerEnUso = () => resolverBanner(perfilDueno).id;

function renderOpcionesBanner() {
    const puntos = perfilDueno?.puntos_totales || 0;
    const enUso = bannerEnUso();
    bannerProgress.innerHTML = BannerProgress(puntos);

    bannerList.innerHTML = BANNER_REWARDS.map((banner) => BannerOption(banner, {
        unlocked: puntos >= banner.pts,
        selected: enUso === banner.id,
        customUrl: perfilDueno.banner_custom_url
    })).join('');
}

const enfocarOpcion = (bannerId) => bannerList.querySelector(`[data-id="${bannerId}"] .banner-option__hit`)?.focus();

function abrirSelectorBanners() {
    bannerPointsLabel.textContent = `Se desbloquean con tus puntos totales. Con ${formatearPuntos(PUNTOS_BANNER_PERSONALIZADO)} pts puedes subir tu propia imagen o GIF.`;
    mostrarFeedbackBanner('');
    renderOpcionesBanner();
    abrirModal(bannerModal, { focus: '.banner-option.selected .banner-option__hit' });
}

function pintarBanner() {
    aplicarFondoBanner(portada(), resolverBanner(perfilDueno));
}

async function seleccionarBanner(bannerId) {
    if (bannerId === bannerEnUso()) return;
    const anterior = perfilDueno.banner_activo || 'default';

    perfilDueno.banner_activo = bannerId;
    pintarBanner();
    renderOpcionesBanner();
    enfocarOpcion(bannerId);

    try {
        await actualizarBannerActivo(targetUid, bannerId);
        mostrarFeedbackBanner('');
    } catch (error) {
        console.error(error);
        perfilDueno.banner_activo = anterior;
        pintarBanner();
        renderOpcionesBanner();
        enfocarOpcion(bannerEnUso());
        mostrarFeedbackBanner('No se pudo guardar el banner. Revisa que hayas iniciado sesión.');
    }
}

function pedirImagenPersonalizada() {
    bannerFileInput.value = '';
    bannerFileInput.click();
}

async function onArchivoBanner(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!BANNER_MIME_TYPES.includes(file.type)) {
        return mostrarFeedbackBanner('Usa una imagen PNG, JPG, WEBP o GIF.');
    }
    if (file.size > BANNER_MAX_BYTES) {
        return mostrarFeedbackBanner('La imagen no puede pesar más de 5 MB.');
    }

    mostrarFeedbackBanner('Subiendo banner…');
    try {
        const url = await subirBannerPersonalizado(targetUid, file);
        perfilDueno.banner_custom_url = url;
        perfilDueno.banner_activo = CUSTOM_BANNER_ID;
        pintarBanner();
        renderOpcionesBanner();
        enfocarOpcion(CUSTOM_BANNER_ID);
        mostrarFeedbackBanner('Banner personalizado guardado.');
    } catch (error) {
        console.error(error);
        mostrarFeedbackBanner(`No se pudo subir la imagen. Necesitas ${formatearPuntos(PUNTOS_BANNER_PERSONALIZADO)} puntos y haber iniciado sesión.`);
    }
}

function inicializarSelectorBanners() {
    document.getElementById('btn-edit-banner').addEventListener('click', abrirSelectorBanners);

    bannerList.addEventListener('click', (event) => {
        if (event.target.closest('[data-action="upload"]')) {
            return pedirImagenPersonalizada();
        }

        const option = event.target.closest('.banner-option');
        if (!option) return;

        const bannerId = option.dataset.id;
        if (option.dataset.unlocked !== 'true') {
            const banner = BANNER_REWARDS.find((item) => item.id === bannerId);
            const faltan = banner.pts - (perfilDueno.puntos_totales || 0);
            return mostrarFeedbackBanner(`Te faltan ${formatearPuntos(faltan)} pts para desbloquear ${banner.nombre}.`);
        }

        if (bannerId === CUSTOM_BANNER_ID && !perfilDueno.banner_custom_url) {
            return pedirImagenPersonalizada();
        }
        seleccionarBanner(bannerId);
    });

    bannerFileInput.addEventListener('change', onArchivoBanner);
}

document.getElementById('btn-close-banner-modal').addEventListener('click', () => cerrarModal(bannerModal));

cargarPerfilCompleto();
