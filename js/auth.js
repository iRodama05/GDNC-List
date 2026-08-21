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

async function loginConDiscord() {
    await supabase.auth.signInWithOAuth({ provider: 'discord' });
}

async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.reload();
}

// 1. Revisar estado y cargar perfil de la base de datos
// 1. Revisar estado y cargar perfil de la base de datos
async function checkUserStatus() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        currentUserUid = user.id;
        
        // Vamos a la tabla 'usuarios' a buscar el perfil completo
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
                // Generamos la clase y el texto del rol dinámicamente
                const roleClass = perfil.rol === 'mod' ? 'nav-role mod' : 'nav-role';
                const roleText = perfil.rol === 'mod' ? 'MODERADOR' : 'JUGADOR';
                
                const avatar = perfil.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png';

                // 1. Creamos el botón condicional para mods
                let modButtonHTML = '';
                if (perfil.rol === 'mod') {
                    modButtonHTML = `<button id="btn-mod-panel" class="btn-primary" style="background-color: #ffcc00; color: #000; margin-left: 10px; font-weight: bold;">Panel Mod</button>`;
                }

                // 2. Inyectamos todo en el NavBar
                authSection.innerHTML = `
                    <div class="nav-user-profile">
                        <!-- ENLACE A TU PROPIO PERFIL -->
                        <a href="profile.html?uid=${perfil.uid}" style="display: flex; align-items: center; gap: 15px; text-decoration: none; color: inherit; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <img src="${avatar}" alt="Avatar" class="nav-avatar">
                            <div class="nav-user-info">
                                <span class="nav-gd-name">${perfil.gd_username}</span>
                                <span class="${roleClass}">${roleText}</span>
                            </div>
                        </a>
                        
                        <!-- PUNTOS Y BOTONES -->
                        <div class="nav-points">
                            <span class="points-number">${perfil.puntos_totales || 0}</span>
                            <span class="points-label">PTS</span>
                        </div>
                        ${modButtonHTML}
                        <button id="btn-logout" class="btn-outline">Log Out</button>
                    </div>
                `;
                
                document.getElementById('btn-logout').addEventListener('click', cerrarSesion);
                
                // 3. Le damos la función de redirigir al botón si es que se dibujó en pantalla
                if (perfil.rol === 'mod') {
                    document.getElementById('btn-mod-panel').addEventListener('click', () => {
                        window.location.href = 'mod-panel.html';
                    });
                }
            }
        }
    } else {
        btnLogin.addEventListener('click', loginConDiscord);
    }
}

// Ejecutamos al iniciar la página
checkUserStatus();

// Escuchamos los cambios de sesión
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkUserStatus();
    }
});

// 2. Lógica para generar el código
document.getElementById('btn-generar-codigo').addEventListener('click', async () => {
    const gdName = gdInputName.value.trim();
    if (!gdName) {
        gdErrorMsg.textContent = "Por favor, ingresa tu nombre de GD.";
        return;
    }

    currentGdName = gdName;
    // Generar un código aleatorio de 6 caracteres (Ej: GDNC-A8B2C4)
    currentCodigo = "GDNC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Guardar el código en la base de datos temporalmente
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

// 3. Lógica para leer GDBrowser y verificar
document.getElementById('btn-verificar-gd').addEventListener('click', async () => {
    gdErrorMsg.textContent = "Buscando comentario... (esto puede tardar)";
    
    try {
        // Invocamos TU propia función en la nube de Supabase
        const { data: comentarios, error } = await supabase.functions.invoke('gdbrowser-proxy', {
            body: { gdName: currentGdName }
        });

        if (error || !comentarios || comentarios.error) {
            throw new Error("No se pudo encontrar el jugador.");
        }
        
        // Revisar si el código está en alguno de sus comentarios recientes
        console.log("Tipo de dato:", typeof comentarios, "Valor:", comentarios);
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

checkUserStatus();

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkUserStatus();
    }
});