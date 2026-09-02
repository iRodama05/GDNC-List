import { supabase } from './config.js';

const btnLogin = document.getElementById('btn-login');
const authSection = document.getElementById('auth-section');

// Elementos del Modal de GD
const gdSetupModal = document.getElementById('gd-setup-modal');
const paso1Gd = document.getElementById('paso-1-gd');
const paso2Gd = document.getElementById('paso-2-gd');
const gdInputName = document.getElementById('gd-input-name');
const codigoDisplay = document.getElementById('codigo-display');
const gdErrorMsg = document.getElementById('gd-error-msg');

let currentUserUid = null;
let currentCodigo = null;
let currentGdName = null;

// --- FUNCIÓN DE LOGIN ---
async function loginConDiscord() {
    await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
            redirectTo: window.location.origin 
        }
    });
}

async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.reload();
}

// 1. Revisar estado y cargar perfil de la base de datos
async function checkUserStatus() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        currentUserUid = user.id;
        
        const { data: perfil, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('uid', user.id)
            .single();

        if (perfil) {
            if (!perfil.gd_username || !perfil.gd_verificado) {
                gdSetupModal.style.display = 'flex';
            } else {
                const roleClass = perfil.rol === 'mod' ? 'nav-role nav-role--mod' : 'nav-role';
                const roleText = perfil.rol === 'mod' ? 'MODERADOR' : 'JUGADOR';
                const avatar = perfil.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png';

                let modButtonHTML = '';
                if (perfil.rol === 'mod') {
                    modButtonHTML = `<button id="btn-mod-panel" class="btn-primary btn-primary--mod" style="margin-left: 10px;">Panel Mod</button>`;
                }

                // Consultamos los submits del usuario ordenados por el más reciente
                const { data: misEnvios } = await supabase.from('submits')
                    .select('*')
                    .eq('user_uid', user.id)
                    .order('submit_id', { ascending: false });

                let hasUnread = false;
                let dotClass = '';
                let inboxItemsHTML = '<p style="color: var(--text-muted); font-size:0.9rem;">No has subido ningún récord aún.</p>';

                if (misEnvios && misEnvios.length > 0) {
                    // La notificación toma el color del último envío si no está leído
                    const ultimoEnvio = misEnvios[0];
                    if (ultimoEnvio.leido === false) {
                        hasUnread = true;
                        if (ultimoEnvio.estado === 'aceptado') dotClass = 'inbox-dot--green';
                        else if (ultimoEnvio.estado === 'rechazado') dotClass = 'inbox-dot--red';
                        else dotClass = 'inbox-dot--yellow';
                    }

                    inboxItemsHTML = misEnvios.map(envio => {
                        let colorText = 'var(--color-warning)';
                        if (envio.estado === 'aceptado') colorText = 'var(--color-success)';
                        if (envio.estado === 'rechazado') colorText = 'var(--color-error)';
                        
                        const notaMod = envio.mod_nota ? `<p class="inbox-item__note">" ${envio.mod_nota} "</p>` : '';
                        
                        return `
                            <div class="inbox-item inbox-item--${envio.estado}">
                                <div class="inbox-item__status" style="color: ${colorText}">${envio.estado}</div>
                                <div class="inbox-item__title">${envio.nivel_nombre} (ID: ${envio.nivel_id})</div>
                                ${notaMod}
                            </div>
                        `;
                    }).join('');
                }

                // 1. Inyectamos la info del perfil en la derecha (SIN el botón del buzón)
                authSection.innerHTML = `
                    <div class="nav-user-profile">
                        <a href="profile.html?uid=${perfil.uid}">
                            <img src="${avatar}" alt="Avatar" class="nav-avatar">
                            <div class="nav-user-info">
                                <span class="nav-gd-name">${perfil.gd_username}</span>
                                <span class="${roleClass}">${roleText}</span>
                            </div>
                        </a>
                        
                        <div class="points-badge" style="margin-left: 10px;">
                            <span class="points-badge__number">${perfil.puntos_totales || 0}</span>
                            <span class="points-badge__label">PTS</span>
                        </div>
                        ${modButtonHTML}
                        <button id="btn-logout" class="btn-outline" style="margin-left: 10px;">Log Out</button>
                    </div>
                `;

                // 2. Movemos el buzón a la izquierda (junto al logo) usando JavaScript puro
                let navBrand = document.querySelector('.nav-brand');
                if (!navBrand) {
                    const logo = document.querySelector('.logo');
                    navBrand = document.createElement('div');
                    navBrand.className = 'nav-brand';
                    logo.parentNode.insertBefore(navBrand, logo);
                    navBrand.appendChild(logo);
                }

                let btnInbox = document.getElementById('btn-inbox');
                if (!btnInbox) {
                    btnInbox = document.createElement('button');
                    btnInbox.id = 'btn-inbox';
                    btnInbox.className = 'btn-inbox';
                    btnInbox.title = 'Buzón de Notificaciones';
                    navBrand.appendChild(btnInbox);
                }

                // Inyectamos el vector SVG de campana moderna
                btnInbox.innerHTML = `
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <span id="inbox-dot" class="inbox-dot ${hasUnread ? 'is-unread ' + dotClass : ''}"></span>
                `;
                
                // 3. Inyectamos el Modal del Buzón (Verificando que no exista ya)
                if (!document.getElementById('inbox-modal')) {
                    const inboxModalHTML = `
                        <div id="inbox-modal" class="modal-overlay">
                            <div class="modal-content" style="max-height: 80vh; display: flex; flex-direction: column;">
                                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-default); padding-bottom: 10px; margin-bottom: 15px;">
                                    <h2 style="margin: 0; font-size: 1.5rem;">Mis Envíos</h2>
                                    <button id="btn-close-inbox" style="background: none; border: none; color: var(--text-main); font-size: 1.5rem; cursor: pointer;">&times;</button>
                                </div>
                                <div id="inbox-items-container" style="flex: 1; overflow-y: auto; padding-right: 5px;">
                                    ${inboxItemsHTML}
                                </div>
                            </div>
                        </div>
                    `;
                    document.body.insertAdjacentHTML('beforeend', inboxModalHTML);
                } else {
                    // Si ya existe (por cambio rápido de página), solo recargamos la lista
                    document.getElementById('inbox-items-container').innerHTML = inboxItemsHTML;
                }

                document.getElementById('btn-logout').addEventListener('click', cerrarSesion);
                
                if (perfil.rol === 'mod') {
                    document.getElementById('btn-mod-panel').addEventListener('click', () => {
                        window.location.href = 'mod-panel.html';
                    });
                }

                // Eventos del Buzón
                const inboxModal = document.getElementById('inbox-modal');
                document.getElementById('btn-inbox').addEventListener('click', async () => {
                    inboxModal.style.display = 'flex';
                    // Al abrirlo, apagamos la bolita y marcamos como leídos en la BD
                    if (hasUnread) {
                        document.getElementById('inbox-dot').classList.remove('is-unread');
                        hasUnread = false;
                        await supabase.from('submits').update({ leido: true }).eq('user_uid', user.id).eq('leido', false);
                    }
                });

                document.getElementById('btn-close-inbox').addEventListener('click', () => {
                    inboxModal.classList.add('is-closing');
                    setTimeout(() => {
                        inboxModal.style.display = 'none';
                        inboxModal.classList.remove('is-closing');
                    }, 300);
                });
            }
        }
    } else {
        if (btnLogin) btnLogin.addEventListener('click', loginConDiscord);
    }
}

// 2. Lógica para generar el código
const btnGenerarCodigo = document.getElementById('btn-generar-codigo');
if (btnGenerarCodigo) {
    btnGenerarCodigo.addEventListener('click', async () => {
        const gdName = gdInputName.value.trim();
        if (!gdName) {
            gdErrorMsg.textContent = "Por favor, ingresa tu nombre de GD.";
            return;
        }

        currentGdName = gdName;
        currentCodigo = "GDNC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const { error } = await supabase
            .from('usuarios')
            .update({ codigo_verificacion_gd: currentCodigo })
            .eq('uid', currentUserUid);

        if (!error) {
            codigoDisplay.textContent = currentCodigo;
            paso1Gd.style.display = 'none';
            paso2Gd.style.display = 'block';
            gdErrorMsg.textContent = "";
        }
    });
}

// 3. Lógica para leer GDBrowser y verificar
const btnVerificarGd = document.getElementById('btn-verificar-gd');
if (btnVerificarGd) {
    btnVerificarGd.addEventListener('click', async () => {
        gdErrorMsg.textContent = "Buscando comentario... (esto puede tardar)";
        
        try {
            const { data: comentarios, error } = await supabase.functions.invoke('gdbrowser-proxy', {
                body: { gdName: currentGdName }
            });

            if (error || !comentarios || comentarios.error) {
                throw new Error("No se pudo encontrar el jugador.");
            }
            
            const codigoEncontrado = comentarios.some(comentario => comentario.content.includes(currentCodigo));

            if (codigoEncontrado) {
                await supabase
                    .from('usuarios')
                    .update({ 
                        gd_username: currentGdName, 
                        gd_verificado: true,
                        codigo_verificacion_gd: null
                    })
                    .eq('uid', currentUserUid);
                
                window.location.reload();
            } else {
                gdErrorMsg.textContent = "No se encontró el código. Asegúrate de publicarlo en tu perfil de GD y esperar un minuto.";
            }

        } catch (error) {
            gdErrorMsg.textContent = "Hubo un error. Revisa que el nombre esté bien escrito.";
            console.error(error);
        }
    });
}

// Inicializar una sola vez
checkUserStatus();

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkUserStatus();
    }
});