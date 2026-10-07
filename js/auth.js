import { getCurrentUser } from './config.js';
import { abrirModal, cerrarModal } from './modal.js';
import { copiarConAviso, marcarOcupado } from './utils.js';
import { NavAccount, InboxModal, InboxItem, InboxEmpty, etiquetaBuzon } from './components/NavAccount.js';
import {
    iniciarSesionDiscord,
    cerrarSesion as cerrarSesionSupabase,
    alCambiarSesion,
    obtenerPerfilUsuario,
    sincronizarAvatar,
    obtenerMisEnvios,
    marcarEnviosLeidos,
    guardarCodigoVerificacion,
    buscarComentariosGD,
    confirmarVerificacionGD
} from './api/authApi.js';

const btnLogin = document.getElementById('btn-login');
const authSection = document.getElementById('auth-section');

// Elementos del modal de GD (solo existen en index.html)
const gdSetupModal = document.getElementById('gd-setup-modal');
const gdStepLabel = document.getElementById('gd-step-label');
const paso1Gd = document.getElementById('paso-1-gd');
const paso2Gd = document.getElementById('paso-2-gd');
const gdInputName = document.getElementById('gd-input-name');
const codigoDisplay = document.getElementById('codigo-display');
const gdErrorMsg = document.getElementById('gd-error-msg');
const btnGenerarCodigo = document.getElementById('btn-generar-codigo');
const btnVerificarGd = document.getElementById('btn-verificar-gd');
const btnCopiarCodigo = document.getElementById('btn-copiar-codigo');

let currentUserUid = null;
let currentCodigo = null;
let currentGdName = null;

async function loginConDiscord() {
    await iniciarSesionDiscord();
}

async function cerrarSesion() {
    await cerrarSesionSupabase();
    window.location.reload();
}

// ==========================================
// 1. ESTADO DE LA SESIÓN Y NAVBAR
// ==========================================
async function checkUserStatus() {
    const user = await getCurrentUser();

    if (!user) {
        btnLogin?.addEventListener('click', loginConDiscord);
        return;
    }

    currentUserUid = user.id;

    let perfil;
    try {
        perfil = await obtenerPerfilUsuario(user.id);
    } catch (error) {
        console.error('No se pudo cargar el perfil de la sesión:', error);
        return;
    }
    if (!perfil) return;

    // Discord puede cambiar la foto: se guarda la actual sin bloquear la carga si falla.
    const authAvatar = user.user_metadata?.avatar_url;
    if (authAvatar && authAvatar !== perfil.avatar_url) {
        perfil.avatar_url = authAvatar;
        sincronizarAvatar(user.id, authAvatar).catch((error) => console.warn('No se pudo sincronizar el avatar:', error));
    }

    if (!perfil.gd_username || !perfil.gd_verificado) {
        abrirModal(gdSetupModal, { focus: gdInputName });
        return;
    }

    let envios = [];
    try {
        envios = await obtenerMisEnvios(user.id);
    } catch (error) {
        console.error('No se pudieron cargar los envíos:', error);
    }

    renderCuenta(perfil, envios, user.id);
}

/**
 * Pinta la campana y el menú de cuenta, y prepara el modal de envíos.
 * La campana muestra un punto con el estado del último envío mientras no se haya leído.
 */
function renderCuenta(perfil, envios, uid) {
    const ultimoEnvio = envios[0];
    let estadoNoLeido = ultimoEnvio && ultimoEnvio.leido === false ? ultimoEnvio.estado : null;

    authSection.innerHTML = NavAccount(perfil, { estadoNoLeido });

    let inboxModal = document.getElementById('inbox-modal');
    if (!inboxModal) {
        document.body.insertAdjacentHTML('beforeend', InboxModal());
        inboxModal = document.getElementById('inbox-modal');
        document.getElementById('btn-close-inbox').addEventListener('click', () => cerrarModal(inboxModal));
    }

    document.getElementById('inbox-items-container').innerHTML = envios.length
        ? envios.map(InboxItem).join('')
        : InboxEmpty();

    document.getElementById('btn-logout').addEventListener('click', cerrarSesion);

    const btnInbox = document.getElementById('btn-inbox');
    btnInbox.addEventListener('click', async () => {
        abrirModal(inboxModal);
        if (!estadoNoLeido) return;

        estadoNoLeido = null;
        document.getElementById('inbox-dot')?.classList.remove('is-unread');
        btnInbox.setAttribute('aria-label', etiquetaBuzon(null));
        try {
            await marcarEnviosLeidos(uid);
        } catch (error) {
            console.warn('No se pudieron marcar los envíos como leídos:', error);
        }
    });
}

// ==========================================
// 2. VERIFICACIÓN DE LA CUENTA DE GEOMETRY DASH
// ==========================================
function mostrarEstadoGd(texto = '', tipo = 'error') {
    if (!gdErrorMsg) return;
    gdErrorMsg.textContent = texto;
    gdErrorMsg.className = `form-feedback form-feedback--${tipo}`;
}

function mostrarPasoGd(paso) {
    paso1Gd.hidden = paso !== 1;
    paso2Gd.hidden = paso !== 2;
    if (gdStepLabel) gdStepLabel.textContent = `Paso ${paso} de 2`;
    (paso === 1 ? gdInputName : btnVerificarGd)?.focus();
}

paso1Gd?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const gdName = gdInputName.value.trim();
    if (!gdName) {
        gdInputName.setAttribute('aria-invalid', 'true');
        mostrarEstadoGd('Escribe tu nombre de Geometry Dash.');
        gdInputName.focus();
        return;
    }

    gdInputName.removeAttribute('aria-invalid');
    const restaurar = marcarOcupado(btnGenerarCodigo, 'Generando…');
    currentGdName = gdName;
    currentCodigo = 'GDNC-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
        await guardarCodigoVerificacion(currentUserUid, currentCodigo);
        codigoDisplay.textContent = currentCodigo;
        mostrarEstadoGd('');
        mostrarPasoGd(2);
    } catch (error) {
        console.error(error);
        mostrarEstadoGd('No se pudo generar el código. Inténtalo de nuevo.');
    } finally {
        restaurar();
    }
});

btnVerificarGd?.addEventListener('click', async () => {
    mostrarEstadoGd('Buscando el código en tu perfil. Puede tardar unos segundos.', 'info');
    const restaurar = marcarOcupado(btnVerificarGd, 'Verificando…');

    try {
        const comentarios = await buscarComentariosGD(currentGdName);
        const codigoEncontrado = comentarios.some((comentario) => comentario.content?.includes(currentCodigo));

        if (codigoEncontrado) {
            await confirmarVerificacionGD(currentUserUid, currentGdName);
            window.location.reload();
            return;
        }
        mostrarEstadoGd('Todavía no vemos el código. Publícalo como comentario en tu perfil de GD, espera un minuto y vuelve a intentarlo.');
    } catch (error) {
        console.error(error);
        mostrarEstadoGd('No encontramos ese jugador. Revisa que el nombre esté bien escrito.');
    }
    restaurar();
});

btnCopiarCodigo?.addEventListener('click', () => copiarConAviso(btnCopiarCodigo, currentCodigo || ''));

document.getElementById('btn-gd-back')?.addEventListener('click', () => {
    mostrarEstadoGd('');
    mostrarPasoGd(1);
});

document.getElementById('btn-gd-dismiss')?.addEventListener('click', cerrarSesion);

checkUserStatus();

alCambiarSesion((event) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkUserStatus();
    }
});
