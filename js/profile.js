import { supabase, getCurrentUser } from './config.js';
import { actualizarBannerActivo, subirBannerPersonalizado, BANNER_MAX_BYTES, BANNER_MIME_TYPES } from './api/profileApi.js';
import { ProfileBanner, BannerOption, BANNER_REWARDS, CUSTOM_BANNER_ID, resolverBanner, aplicarFondoBanner } from './components/ProfileBanner.js';

// ==========================================
// 1. CONFIGURACIÓN INICIAL
// ==========================================
const profileBanner = document.getElementById('profile-banner');
const recordsGrid = document.getElementById('records-grid');

const urlParams = new URLSearchParams(window.location.search);
const targetUid = urlParams.get('uid');

// Declaramos la variable globalmente para usarla al guardar el récord manual
let perfilDueno = null;

// ==========================================
// 2. CARGA PRINCIPAL DEL PERFIL
// ==========================================
async function cargarPerfilCompleto() {
    if (!targetUid) return profileBanner.innerHTML = "<p style='color: var(--color-error);'>Usuario no especificado.</p>";

    let isMod = false;
    let isOwner = false;

    const sessionUser = await getCurrentUser();
    if (sessionUser) {
        // Evaluamos si el que visita es el dueño
        if (sessionUser.id === targetUid) {
            isOwner = true;
        }

        const { data: viewerProfile } = await supabase.from('usuarios')
            .select('rol').eq('uid', sessionUser.id).maybeSingle();
        if (viewerProfile && viewerProfile.rol === 'mod') {
            isMod = true;
        }
    }

    const { data: perfil, error: errPerfil } = await supabase
        .from('usuarios')
        .select('*')
        .eq('uid', targetUid)
        .maybeSingle();

    if (errPerfil || !perfil) return profileBanner.innerHTML = "<p style='color: var(--color-error);'>Jugador no encontrado.</p>";
    
    perfilDueno = perfil; 

    profileBanner.innerHTML = ProfileBanner(perfil, { isOwner, isMod });
    aplicarFondoBanner(profileBanner, resolverBanner(perfil));
    if (isOwner) inicializarSelectorBanners();

    const { data: records } = await supabase
        .from('submits')
        .select('*')
        .eq('user_uid', targetUid)
        .eq('estado', 'aceptado')
        .order('puntos_asignados', { ascending: false });

    if (!records || records.length === 0) {
        recordsGrid.innerHTML = "<p style='color: var(--text-muted);'>Este jugador aún no tiene récords registrados.</p>";
        return inicializarEventosMod(isMod);
    }

    recordsGrid.innerHTML = records.map((record, index) => {
        let videoContainerHTML = '';
        const rawUrl = (record.video_url || '').toLowerCase();
        
        if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')) {
            let embedUrl = record.video_url;
            if (embedUrl.includes('watch?v=')) {
                embedUrl = embedUrl.replace('watch?v=', 'embed/');
            } else if (embedUrl.includes('youtu.be/')) {
                embedUrl = embedUrl.replace('youtu.be/', 'youtube.com/embed/');
            }
            videoContainerHTML = `<iframe class="record-video" src="${embedUrl}" allowfullscreen></iframe>`;
        } 
        else {
            let btnColor = 'var(--color-discord)';
            let textColor = '#fff';
            let platformName = 'Ver enlace externo';
            
            if (rawUrl.includes('medal.tv')) {
                btnColor = '#FFB800'; 
                textColor = '#000';
                platformName = 'Ver en Medal.tv';
            } else if (rawUrl.includes('twitch.tv')) {
                btnColor = '#9146FF'; 
                textColor = '#fff';
                platformName = 'Ver en Twitch';
            }

            const externalIconSVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 5px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
            
            videoContainerHTML = `
                <div class="record-video" style="display: flex; flex-direction: column; justify-content: center; align-items: center; background: #0a0a0c;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin-bottom: 10px;"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                    <p style="color: var(--text-muted); margin-bottom: 15px; font-size: 0.85rem;">Video alojado externamente</p>
                    <a href="${record.video_url}" target="_blank" class="btn-primary" style="background-color: ${btnColor}; color: ${textColor}; text-decoration: none; display: flex; align-items: center; justify-content: center;">
                        ${platformName} ${externalIconSVG}
                    </a>
                </div>
            `;
        }

        const modControls = isMod ? `
            <div style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; width: 100%;">
                <button class="btn-outline btn-edit-record" data-id="${record.submit_id}" data-pts="${record.puntos_asignados}" style="border-color: var(--color-mod-alt); color: var(--color-mod-alt); padding: 2px 10px; font-size: 0.75rem;">Editar</button>
                <button class="btn-outline btn-outline--danger btn-delete-record" data-id="${record.submit_id}" style="padding: 2px 10px; font-size: 0.75rem;">Borrar</button>
            </div>
        ` : '';

        const cardHTML = `
            <div class="record-card">
                ${videoContainerHTML}
                <div class="record-info">
                    <div>
                        <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-main);">${record.nivel_nombre}</h3>
                        <span style="color: var(--text-muted); font-size: 0.8rem;">ID: ${record.nivel_id}</span>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: var(--color-accent); font-weight: bold; font-size: 1.1rem;">${record.puntos_asignados} PTS</span>
                        <br>
                        <button class="btn-outline btn-comentarios" data-submitid="${record.submit_id}" data-lvlname="${record.nivel_nombre}" style="padding: 2px 10px; font-size: 0.75rem; margin-top: 5px;">Comentarios</button>
                    </div>
                    ${modControls}
                </div>
            </div>
        `;

        if (index === 2 && records.length > 3) {
            return cardHTML + `
                <div style="grid-column: 1 / -1; margin: 30px 0 10px 0;">
                    <hr style="border: none; border-top: 1px solid var(--border-default);">
                    <p style="text-align: center; color: var(--text-muted); font-size: 0.8rem; letter-spacing: 2px; margin-top: 10px; text-transform: uppercase;">
                        Otras Récords
                    </p>
                </div>
            `;
        }
        return cardHTML;
    }).join('');

    inicializarEventosMod(isMod);
}

// ==========================================
// 3. SISTEMA DE COMENTARIOS Y LIKES
// ==========================================
const commentsModal = document.getElementById('comments-modal');
const btnCloseComments = document.getElementById('btn-close-comments');
const commentsList = document.getElementById('comments-list');
const btnSendComment = document.getElementById('btn-send-comment');
const newCommentInput = document.getElementById('new-comment-input');
const btnLikeSubmit = document.getElementById('btn-like-submit');
const likeCountDisplay = document.getElementById('like-count');
const modalLvlTitle = document.getElementById('modal-lvl-title');

let currentSubmitId = null;

recordsGrid.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-comentarios')) {
        currentSubmitId = e.target.getAttribute('data-submitid');
        modalLvlTitle.textContent = e.target.getAttribute('data-lvlname');
        abrirModalComentarios();
    }
});

btnCloseComments.addEventListener('click', () => {
    commentsModal.style.display = 'none';
});

async function abrirModalComentarios() {
    commentsModal.style.display = 'flex';
    commentsList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Cargando...</p>';
    likeCountDisplay.textContent = '...';

    const { count: likes } = await supabase.from('submit_likes').select('*', { count: 'exact', head: true }).eq('submit_id', currentSubmitId);
    likeCountDisplay.textContent = likes || 0;

    const user = await getCurrentUser();
    if (user) {
        const { data: miLike } = await supabase.from('submit_likes').select('id').eq('submit_id', currentSubmitId).eq('user_uid', user.id).maybeSingle();
        if (miLike) {
            btnLikeSubmit.style.backgroundColor = 'var(--color-brand-red)';
            btnLikeSubmit.style.color = 'white';
        } else {
            btnLikeSubmit.style.backgroundColor = 'transparent';
            btnLikeSubmit.style.color = 'var(--color-brand-red)';
        }
    }

    const { data: comentarios } = await supabase
        .from('comentarios')
        .select('texto, creado_en, usuarios ( gd_username, avatar_url )')
        .eq('submit_id', currentSubmitId)
        .order('creado_en', { ascending: true });

    if (!comentarios || comentarios.length === 0) {
        commentsList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Sé el primero en comentar.</p>';
        return;
    }

    commentsList.innerHTML = comentarios.map(com => `
        <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                <img src="${com.usuarios.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png'}" style="width: 24px; height: 24px; border-radius: 5px; object-fit: cover;" onerror="this.onerror=null;this.src='https://cdn.discordapp.com/embed/avatars/0.png';">
                <span style="font-weight: bold; color: var(--color-discord); font-size: 0.9rem;">${com.usuarios.gd_username}</span>
            </div>
            <p style="margin: 0; font-size: 0.9rem; color: var(--text-main); line-height: 1.4;">${com.texto}</p>
        </div>
    `).join('');
}

btnSendComment.addEventListener('click', async () => {
    const texto = newCommentInput.value.trim();
    if (!texto || !currentSubmitId) return;

    const user = await getCurrentUser();
    if (!user) return alert("Debes iniciar sesión para comentar.");

    btnSendComment.disabled = true;
    await supabase.from('comentarios').insert([{ submit_id: currentSubmitId, user_uid: user.id, texto: texto }]);
    
    newCommentInput.value = '';
    btnSendComment.disabled = false;
    abrirModalComentarios();
});

btnLikeSubmit.addEventListener('click', async () => {
    const user = await getCurrentUser();
    if (!user) return alert("Debes iniciar sesión para dar like.");

    const { data: miLike } = await supabase.from('submit_likes').select('id').eq('submit_id', currentSubmitId).eq('user_uid', user.id).maybeSingle();

    if (miLike) {
        await supabase.from('submit_likes').delete().eq('id', miLike.id);
    } else {
        await supabase.from('submit_likes').insert([{ submit_id: currentSubmitId, user_uid: user.id }]);
    }
    abrirModalComentarios();
});

// ==========================================
// 4. HERRAMIENTAS DE MODERACIÓN
// ==========================================

async function recalcularPerfil(uid) {
    const { data: top3 } = await supabase.from('submits')
        .select('nivel_nombre, puntos_asignados')
        .eq('user_uid', uid)
        .eq('estado', 'aceptado')
        .order('puntos_asignados', { ascending: false })
        .limit(3);

    const suma = top3.reduce((acc, lvl) => acc + Number(lvl.puntos_asignados), 0);
    const top3Hardests = top3.map(lvl => ({ nombre: lvl.nivel_nombre, puntos: Number(lvl.puntos_asignados) }));

    await supabase.from('usuarios').update({ puntos_totales: suma, top_3_hardests: top3Hardests }).eq('uid', uid);
}

function inicializarEventosMod(isMod) {
    if (!isMod) return;

    const modModal = document.getElementById('mod-add-modal');
    
    document.getElementById('btn-mod-add-record')?.addEventListener('click', () => {
        modModal.style.display = 'flex';
    });

    document.getElementById('btn-mod-cancel')?.addEventListener('click', () => {
        modModal.style.display = 'none';
    });

    document.getElementById('btn-mod-submit')?.addEventListener('click', async (e) => {
        const name = document.getElementById('mod-lvl-name').value.trim();
        const id = document.getElementById('mod-lvl-id').value.trim();
        const video = document.getElementById('mod-lvl-video').value.trim();
        const pts = parseInt(document.getElementById('mod-lvl-pts').value);

        if (!name || !id || !video || isNaN(pts) || pts <= 0) {
            return alert("Por favor, llena todos los campos correctamente.");
        }

        e.target.disabled = true;
        e.target.textContent = "Guardando...";

        await supabase.from('submits').insert([{
            user_uid: targetUid,
            gd_username: perfilDueno.gd_username,
            nivel_nombre: name,
            nivel_id: id,
            video_url: video,
            puntos_asignados: pts,
            estado: 'aceptado'
        }]);

        await recalcularPerfil(targetUid);
        window.location.reload();
    });

    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete-record')) {
            const submitId = e.target.getAttribute('data-id');
            if (confirm("MOD: ¿Eliminar este récord permanentemente? Los puntos se recalcularán.")) {
                e.target.textContent = "...";
                e.target.disabled = true;
                
                await supabase.from('submits').delete().eq('submit_id', submitId);
                await recalcularPerfil(targetUid);
                window.location.reload();
            }
        }

        if (e.target.classList.contains('btn-edit-record')) {
            const submitId = e.target.getAttribute('data-id');
            const ptsActuales = e.target.getAttribute('data-pts');
            
            const nuevosPts = prompt("MOD: Ingresa la nueva cantidad de puntos para este récord:", ptsActuales);
            
            if (nuevosPts !== null && !isNaN(nuevosPts) && Number(nuevosPts) > 0) {
                e.target.textContent = "...";
                e.target.disabled = true;
                
                await supabase.from('submits').update({ puntos_asignados: Number(nuevosPts) }).eq('submit_id', submitId);
                await recalcularPerfil(targetUid);
                window.location.reload();
            }
        }
    });
}

const bannerModal = document.getElementById('banner-modal');
const bannerList = document.getElementById('banner-list');
const bannerFileInput = document.getElementById('banner-file-input');
const bannerFeedback = document.getElementById('banner-feedback');

function mostrarFeedbackBanner(mensaje) {
    if (!bannerFeedback) return;
    bannerFeedback.textContent = mensaje || '';
    bannerFeedback.hidden = !mensaje;
}

function renderOpcionesBanner() {
    const puntos = perfilDueno?.puntos_totales || 0;
    const label = document.getElementById('banner-points-label');
    if (label) {
        label.textContent = `Tus puntos de banner: ${puntos}. Se calculan con tus 3 completions de mayor valor.`;
    }

    bannerList.innerHTML = BANNER_REWARDS.map((banner) => BannerOption(banner, {
        unlocked: puntos >= banner.pts,
        selected: (perfilDueno.banner_activo || 'default') === banner.id,
        customUrl: perfilDueno.banner_custom_url
    })).join('');
}

function abrirSelectorBanners() {
    mostrarFeedbackBanner('');
    renderOpcionesBanner();
    bannerModal.style.display = 'flex';
}

async function seleccionarBanner(bannerId) {
    const anterior = perfilDueno.banner_activo || 'default';
    if (bannerId === anterior) return;

    perfilDueno.banner_activo = bannerId;
    aplicarFondoBanner(profileBanner, resolverBanner(perfilDueno));
    renderOpcionesBanner();

    try {
        await actualizarBannerActivo(targetUid, bannerId);
        mostrarFeedbackBanner('');
    } catch (error) {
        console.error(error);
        perfilDueno.banner_activo = anterior;
        aplicarFondoBanner(profileBanner, resolverBanner(perfilDueno));
        renderOpcionesBanner();
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
        return mostrarFeedbackBanner('Usa una imagen PNG, JPG o WEBP.');
    }
    if (file.size > BANNER_MAX_BYTES) {
        return mostrarFeedbackBanner('La imagen no puede pesar más de 5 MB.');
    }

    mostrarFeedbackBanner('Subiendo banner...');
    try {
        const url = await subirBannerPersonalizado(targetUid, file);
        perfilDueno.banner_custom_url = url;
        perfilDueno.banner_activo = CUSTOM_BANNER_ID;
        aplicarFondoBanner(profileBanner, resolverBanner(perfilDueno));
        renderOpcionesBanner();
        mostrarFeedbackBanner('Banner personalizado guardado.');
    } catch (error) {
        console.error(error);
        mostrarFeedbackBanner('No se pudo subir la imagen. Necesitas 1200 puntos y haber iniciado sesión.');
    }
}

function inicializarSelectorBanners() {
    document.getElementById('btn-edit-banner')?.addEventListener('click', abrirSelectorBanners);

    bannerList?.addEventListener('click', (event) => {
        if (event.target.closest('[data-action="upload"]')) {
            return pedirImagenPersonalizada();
        }

        const option = event.target.closest('.banner-option');
        if (!option || option.getAttribute('data-unlocked') !== 'true') return;

        const bannerId = option.getAttribute('data-id');
        if (bannerId === CUSTOM_BANNER_ID && !perfilDueno.banner_custom_url) {
            return pedirImagenPersonalizada();
        }
        seleccionarBanner(bannerId);
    });

    bannerFileInput?.addEventListener('change', onArchivoBanner);
}

// 5. Cierre Global del Modal de Banners
document.getElementById('btn-close-banner-modal')?.addEventListener('click', () => {
    const modal = document.getElementById('banner-modal');
    if (modal) {
        modal.classList.add('is-closing');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('is-closing');
        }, 300);
    }
});

cargarPerfilCompleto();
