import { supabase } from './config.js';

const profileBanner = document.getElementById('profile-banner');
const recordsGrid = document.getElementById('records-grid');

// Obtener el UID de la URL
const urlParams = new URLSearchParams(window.location.search);
const targetUid = urlParams.get('uid');

async function cargarPerfilCompleto() {
    if (!targetUid) return profileBanner.innerHTML = "Usuario no especificado.";

    // 1. Cargar datos del usuario
    const { data: perfil, error: errPerfil } = await supabase
        .from('usuarios')
        .select('*')
        .eq('uid', targetUid)
        .single();

    if (errPerfil) return profileBanner.innerHTML = "Jugador no encontrado.";

    // Renderizar Banner
    profileBanner.innerHTML = `
        <img src="${perfil.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png'}" class="profile-avatar-giant">
        <div style="flex: 1;">
            <h1 style="margin: 0; font-size: 2.5rem;">${perfil.gd_username}</h1>
            
            <!-- CONTENEDOR DEL USUARIO DE DISCORD -->
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 5px; color: #5865F2;">
                <!-- Icono SVG de Discord -->
                <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="currentColor">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c2.64-27.38-4.51-51.11-19.32-72.15ZM42.68,65.27C36.67,65.27,31.7,59.65,31.7,52.7c0-6.86,4.78-12.58,10.98-12.58,6.26,0,11.11,5.81,10.98,12.58C53.66,59.65,48.8,65.27,42.68,65.27Zm41.85,0c-6.01,0-10.98-5.62-10.98-12.58,0-6.86,4.78-12.58,10.98-12.58,6.26,0,11.11,5.81,10.98,12.58C95.51,59.65,90.65,65.27,84.53,65.27Z"/>
                </svg>
                <span style="font-size: 1rem; font-weight: 600; letter-spacing: 0.5px;">${perfil.discord_username}</span>
            </div>
            
        </div>
        <div class="profile-stats-container">
            <div class="stat-box">
                <span class="stat-label">Puntos Actuales</span>
                <span class="stat-value" style="color: #ff3333;">${perfil.puntos_totales || 0}</span>
            </div>
            <div class="stat-box">
                <span class="stat-label">Estado</span>
                <span class="nav-role" style="font-size: 1rem; padding: 5px 15px;">${perfil.rol.toUpperCase()}</span>
            </div>
        </div>
    `;

    // 2. Cargar récords aceptados
    const { data: records } = await supabase
        .from('submits')
        .select('*')
        .eq('user_uid', targetUid)
        .eq('estado', 'aceptado')
        .order('puntos_asignados', { ascending: false });

    if (!records || records.length === 0) {
        recordsGrid.innerHTML = "<p style='color: #888;'>Este jugador aún no tiene récords registrados.</p>";
        return;
    }

// Renderizar Tarjetas de Video con separador en el Top 3
    recordsGrid.innerHTML = records.map((record, index) => {
        // Convertir link normal de YT a link de "embed"
        let embedUrl = record.video_url;
        if (embedUrl.includes('youtube.com/watch?v=')) {
            embedUrl = embedUrl.replace('watch?v=', 'embed/');
        } else if (embedUrl.includes('youtu.be/')) {
            embedUrl = embedUrl.replace('youtu.be/', 'youtube.com/embed/');
        }

        // Construir la tarjeta del nivel
        const cardHTML = `
            <div class="record-card">
                <iframe class="record-video" src="${embedUrl}" allowfullscreen></iframe>
                <div class="record-info">
                    <div>
                        <h3 style="margin: 0; font-size: 1.1rem;">${record.nivel_nombre}</h3>
                        <span style="color: #888; font-size: 0.8rem;">ID: ${record.nivel_id}</span>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: #00d2ff; font-weight: bold; font-size: 1.1rem;">${record.puntos_asignados} PTS</span>
                        <br>
                        <button class="btn-outline btn-comentarios" data-submitid="${record.submit_id}" data-lvlname="${record.nivel_nombre}" style="padding: 2px 10px; font-size: 0.75rem; margin-top: 5px;">Comentarios</button>
                    </div>
                </div>
            </div>
        `;

        // Si es el 3er récord (índice 2) y hay más récords en la lista, inyectamos la línea divisoria.
        // grid-column: 1 / -1; hace que la línea ocupe toda la fila completa.
        if (index === 2 && records.length > 3) {
            return cardHTML + `
                <div style="grid-column: 1 / -1; margin: 30px 0 10px 0;">
                    <hr style="border: none; border-top: 1px solid #333;">
                    <p style="text-align: center; color: #666; font-size: 0.8rem; letter-spacing: 2px; margin-top: 10px; text-transform: uppercase;">
                        Récords antiguos / Historial
                    </p>
                </div>
            `;
        }

        return cardHTML;
    }).join('');
}

// --- SISTEMA DE COMENTARIOS Y LIKES ---
const commentsModal = document.getElementById('comments-modal');
const btnCloseComments = document.getElementById('btn-close-comments');
const commentsList = document.getElementById('comments-list');
const btnSendComment = document.getElementById('btn-send-comment');
const newCommentInput = document.getElementById('new-comment-input');
const btnLikeSubmit = document.getElementById('btn-like-submit');
const likeCountDisplay = document.getElementById('like-count');
const modalLvlTitle = document.getElementById('modal-lvl-title');

let currentSubmitId = null;

// Escuchar clics en el contenedor de los videos (Delegación de eventos)
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
    commentsList.innerHTML = '<p style="color: #888; text-align: center;">Cargando...</p>';
    likeCountDisplay.textContent = '...';

    // 1. Cargar Likes
    const { count: likes } = await supabase.from('submit_likes').select('*', { count: 'exact', head: true }).eq('submit_id', currentSubmitId);
    likeCountDisplay.textContent = likes || 0;

    // 2. Comprobar si el usuario actual ya le dio like
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: miLike } = await supabase.from('submit_likes').select('id').eq('submit_id', currentSubmitId).eq('user_uid', user.id).single();
        if (miLike) {
            btnLikeSubmit.style.backgroundColor = '#ff3333';
            btnLikeSubmit.style.color = 'white';
        } else {
            btnLikeSubmit.style.backgroundColor = 'transparent';
            btnLikeSubmit.style.color = '#ff3333';
        }
    }

    // 3. Cargar Comentarios (Haciendo un JOIN con la tabla usuarios para sacar sus nombres y avatares)
    const { data: comentarios } = await supabase
        .from('comentarios')
        .select(`
            texto,
            creado_en,
            usuarios ( gd_username, avatar_url )
        `)
        .eq('submit_id', currentSubmitId)
        .order('creado_en', { ascending: true });

    if (!comentarios || comentarios.length === 0) {
        commentsList.innerHTML = '<p style="color: #888; text-align: center;">Sé el primero en comentar.</p>';
        return;
    }

    commentsList.innerHTML = comentarios.map(com => `
        <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                <img src="${com.usuarios.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png'}" style="width: 24px; height: 24px; border-radius: 5px; object-fit: cover;">
                <span style="font-weight: bold; color: var(--primary-color); font-size: 0.9rem;">${com.usuarios.gd_username}</span>
            </div>
            <p style="margin: 0; font-size: 0.9rem; color: #eee; line-height: 1.4;">${com.texto}</p>
        </div>
    `).join('');
}

// Lógica para enviar un comentario
btnSendComment.addEventListener('click', async () => {
    const texto = newCommentInput.value.trim();
    if (!texto || !currentSubmitId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Debes iniciar sesión para comentar.");

    btnSendComment.disabled = true;

    await supabase.from('comentarios').insert([
        { submit_id: currentSubmitId, user_uid: user.id, texto: texto }
    ]);

    newCommentInput.value = '';
    btnSendComment.disabled = false;
    abrirModalComentarios(); // Recargamos la lista
});

// Lógica para dar/quitar Like
btnLikeSubmit.addEventListener('click', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Debes iniciar sesión para dar like.");

    // Revisamos si ya dimos like
    const { data: miLike } = await supabase.from('submit_likes').select('id').eq('submit_id', currentSubmitId).eq('user_uid', user.id).single();

    if (miLike) {
        // Quitar Like
        await supabase.from('submit_likes').delete().eq('id', miLike.id);
    } else {
        // Dar Like
        await supabase.from('submit_likes').insert([{ submit_id: currentSubmitId, user_uid: user.id }]);
    }
    
    abrirModalComentarios(); // Recargamos la UI
});

cargarPerfilCompleto();