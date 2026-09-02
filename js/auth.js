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
            // Si no tiene cuenta de GD verificada, bloqueamos la pantalla
            if (!perfil.gd_username || !perfil.gd_verificado) {
                gdSetupModal.style.display = 'flex';
            } else {
                // Generamos las nuevas clases BEM dinámicamente
                const roleClass = perfil.rol === 'mod' ? 'nav-role nav-role--mod' : 'nav-role';
                const roleText = perfil.rol === 'mod' ? 'MODERADOR' : 'JUGADOR';
                const avatar = perfil.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png';

                // Botón condicional para mods
                let modButtonHTML = '';
                if (perfil.rol === 'mod') {
                    modButtonHTML = `<button id="btn-mod-panel" class="btn-primary btn-primary--mod" style="margin-left: 10px;">Panel Mod</button>`;
                }

                // Inyectamos todo en el NavBar con HTML limpio (sin styles en línea)
                authSection.innerHTML = `
                    <div class="nav-user-profile">
                        <a href="profile.html?uid=${perfil.uid}">
                            <img src="${avatar}" alt="Avatar" class="nav-avatar">
                            <div class="nav-user-info">
                                <span class="nav-gd-name">${perfil.gd_username}</span>
                                <span class="${roleClass}">${roleText}</span>
                            </div>
                        </a>
                        
                        <!-- Uso de la clase points-badge del CSS -->
                        <div class="points-badge" style="margin-left: 10px;">
                            <span class="points-badge__number">${perfil.puntos_totales || 0}</span>
                            <span class="points-badge__label">PTS</span>
                        </div>
                        ${modButtonHTML}
                        <button id="btn-logout" class="btn-outline" style="margin-left: 10px;">Log Out</button>
                    </div>
                `;
                
                document.getElementById('btn-logout').addEventListener('click', cerrarSesion);
                
                if (perfil.rol === 'mod') {
                    document.getElementById('btn-mod-panel').addEventListener('click', () => {
                        window.location.href = 'mod-panel.html';
                    });
                }
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