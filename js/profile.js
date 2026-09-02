import { supabase } from './config.js';

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
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (sessionUser) {
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

    // Botón de Mod inyectado en el banner
    const modBannerBtn = isMod ? `
        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid var(--border-default);">
            <button id="btn-mod-add-record" class="btn-primary btn-primary--mod" style="font-size: 0.8rem; padding: 5px 15px;">+ Añadir Récord Manual</button>
        </div>
    ` : '';

    const roleClass = perfil.rol === 'mod' ? 'nav-role nav-role--mod' : 'nav-role';

    profileBanner.innerHTML = `
        <img src="${perfil.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png'}" class="profile-avatar-giant">
        <div style="flex: 1;">
            <h1 style="margin: 0; font-size: 2.5rem; color: var(--text-main);">${perfil.gd_username}</h1>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 5px; color: var(--color-discord);">
                <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="currentColor">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c2.64-27.38-4.51-51.11-19.32-72.15ZM42.68,65.27C36.67,65.27,31.7,59.65,31.7,52.7c0-6.86,4.78-12.58,10.98-12.58,6.26,0,11.11,5.81,10.98,12.58C53.66,59.65,48.8,65.27,42.68,65.27Zm41.85,0c-6.01,0-10.98-5.62-10.98-12.58,0-6.86,4.78-12.58,10.98-12.58,6.26,0,11.11,5.81,10.98,12.58C95.51,59.65,90.65,65.27,84.53,65.27Z"/>
                </svg>
                <span style="font-size: 1rem; font-weight: 600; letter-spacing: 0.5px;">${perfil.discord_username}</span>
            </div>
            ${modBannerBtn}
        </div>
        <div class="profile-stats-container">
            <div class="stat-box">
                <span class="stat-label">Puntos Actuales</span>
                <span class="stat-value stat-value--red">${perfil.puntos_totales || 0}</span>
            </div>
            <div class="stat-box">
                <span class="stat-label">Estado</span>
                <span class="${roleClass}" style="font-size: 1rem; padding: 5px 15px;">${perfil.rol.toUpperCase()}</span>
            </div>
        </div>
    `;

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
        let embedUrl = record.video_url;
        if (embedUrl.includes('youtube.com/watch?v=')) {
            embedUrl = embedUrl.replace('watch?v=', 'embed/');
        } else if (embedUrl.includes('youtu.be/')) {
            embedUrl = embedUrl.replace('youtu.be/', 'youtube.com/embed/');
        }

        const modControls = isMod ? `
            <div style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; width: 100%;">
                <button class="btn-outline btn-edit-record" data-id="${record.submit_id}" data-pts="${record.puntos_asignados}" style="border-color: var(--color-mod-alt); color: var(--color-mod-alt); padding: 2px 10px; font-size: 0.75rem;">Editar</button>
                <button class="btn-outline btn-outline--danger btn-delete-record" data-id="${record.submit_id}" style="padding: 2px 10px; font-size: 0.75rem;">Borrar</button>
            </div>
        ` : '';

        const cardHTML = `
            <div class="record-card">
                <iframe class="record-video" src="${embedUrl}" allowfullscreen></iframe>
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

    const { data: { user } } = await supabase.auth.getUser();
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
                <img src="${com.usuarios.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png'}" style="width: 24px; height: 24px; border-radius: 5px; object-fit: cover;">
                <span style="font-weight: bold; color: var(--color-discord); font-size: 0.9rem;">${com.usuarios.gd_username}</span>
            </div>
            <p style="margin: 0; font-size: 0.9rem; color: var(--text-main); line-height: 1.4;">${com.texto}</p>
        </div>
    `).join('');
}

btnSendComment.addEventListener('click', async () => {
    const texto = newCommentInput.value.trim();
    if (!texto || !currentSubmitId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Debes iniciar sesión para comentar.");

    btnSendComment.disabled = true;
    await supabase.from('comentarios').insert([{ submit_id: currentSubmitId, user_uid: user.id, texto: texto }]);
    
    newCommentInput.value = '';
    btnSendComment.disabled = false;
    abrirModalComentarios();
});

btnLikeSubmit.addEventListener('click', async () => {
    const { data: { user } } = await supabase.auth.getUser();
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

    // A. El HTML del modal ahora vive nativamente en profile.html
    const modModal = document.getElementById('mod-add-modal');
    
    // Evento para abrir el modal
    document.getElementById('btn-mod-add-record')?.addEventListener('click', () => {
        modModal.style.display = 'flex';
    });

    // Evento para cerrar el modal
    document.getElementById('btn-mod-cancel')?.addEventListener('click', () => {
        modModal.style.display = 'none';
    });

    // B. Lógica para guardar el récord manualmente
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

        // Insertar el récord saltándose la fase de pendientes ('estado: aceptado')
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

    // C. Escuchar clics en los botones de Borrar y Editar inyectados en las tarjetas
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

// Inicializador
cargarPerfilCompleto();