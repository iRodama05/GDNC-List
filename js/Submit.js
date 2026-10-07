import { getCurrentUser } from './config.js';
import { abrirModal, cerrarModal } from './modal.js';
import { obtenerNombreGD, enviarRecord } from './api/submitApi.js';
import { SubmitModal } from './components/SubmitModal.js';
import { marcarOcupado } from './utils.js';

// El modal es el mismo en las tres páginas: se monta aquí en lugar de repetirlo en cada HTML.
document.body.insertAdjacentHTML('beforeend', SubmitModal());

const btnOpenSubmit = document.getElementById('btn-open-submit');
const submitModal = document.getElementById('submit-modal');
const submitForm = document.getElementById('submit-form');
const submitSuccess = document.getElementById('submit-success');
const btnSendSubmit = document.getElementById('btn-send-submit');
const submitMsg = document.getElementById('submit-msg');

const CAMPOS = [
    { id: 'submit-lvl-name', mensaje: 'Escribe el nombre del nivel.' },
    { id: 'submit-lvl-id', mensaje: 'Escribe el ID del nivel (solo números).', patron: /^\d+$/ },
    { id: 'submit-video-url', mensaje: 'Pega el enlace del video (empieza con https://).', patron: /^https?:\/\/\S+$/i }
];

let currentUserData = null;

function marcarFeedback(tipo, texto) {
    submitMsg.className = `form-feedback form-feedback--${tipo}`;
    submitMsg.textContent = texto;
}

// El botón solo aparece para cuentas con nombre de GD; db.js y profile.js escuchan el evento.
async function initSubmitButton() {
    const user = await getCurrentUser();
    if (!user || !btnOpenSubmit) return;

    let gdUsername = null;
    try {
        gdUsername = await obtenerNombreGD(user.id);
    } catch (error) {
        console.error('No se pudo comprobar la cuenta de GD:', error);
    }
    if (!gdUsername) return;

    currentUserData = { uid: user.id, gdUsername };
    btnOpenSubmit.hidden = false;
    document.body.dataset.canSubmit = 'true';
    document.dispatchEvent(new CustomEvent('gdnc:can-submit'));
}

function mostrarFormulario() {
    submitForm.hidden = false;
    submitSuccess.hidden = true;
}

function limpiarFormulario() {
    submitForm.reset();
    CAMPOS.forEach(({ id }) => document.getElementById(id).removeAttribute('aria-invalid'));
    submitMsg.textContent = '';
    submitMsg.className = 'form-feedback';
}

// Marca los campos vacíos o con formato inválido y enfoca el primero. Devuelve los valores si todo está bien.
function validar() {
    let primerError = null;
    const valores = {};

    CAMPOS.forEach(({ id, mensaje, patron }) => {
        const input = document.getElementById(id);
        let valor = input.value.trim();
        // "youtu.be/abc" sin protocolo también vale.
        if (id === 'submit-video-url' && /^[\w-]+(\.[\w-]+)+\//.test(valor)) valor = `https://${valor}`;

        const valido = valor.length > 0 && (!patron || patron.test(valor));
        if (valido) input.removeAttribute('aria-invalid');
        else input.setAttribute('aria-invalid', 'true');
        if (!valido && !primerError) primerError = { input, mensaje };
        valores[id] = valor;
    });

    if (primerError) {
        marcarFeedback('error', primerError.mensaje);
        primerError.input.focus();
        return null;
    }
    return valores;
}

function abrirSubmit() {
    mostrarFormulario();
    abrirModal(submitModal, { focus: '#submit-lvl-name' });
}

btnOpenSubmit?.addEventListener('click', abrirSubmit);

const cerrarSubmit = () => cerrarModal(submitModal);
document.getElementById('btn-cancel-submit').addEventListener('click', cerrarSubmit);
document.getElementById('btn-close-submit').addEventListener('click', cerrarSubmit);
document.getElementById('btn-submit-done').addEventListener('click', cerrarSubmit);

document.getElementById('btn-submit-another').addEventListener('click', () => {
    limpiarFormulario();
    mostrarFormulario();
    document.getElementById('submit-lvl-name').focus();
});

// Tras un envío correcto, el formulario se vacía al cerrar para el siguiente récord.
submitModal.addEventListener('modal:closed', () => {
    if (!submitSuccess.hidden) limpiarFormulario();
    mostrarFormulario();
});

submitForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const valores = validar();
    if (!valores || !currentUserData) return;

    submitMsg.textContent = '';
    const restaurar = marcarOcupado(btnSendSubmit, 'Enviando…');

    try {
        await enviarRecord({
            uid: currentUserData.uid,
            gdUsername: currentUserData.gdUsername,
            nivelNombre: valores['submit-lvl-name'],
            nivelId: valores['submit-lvl-id'],
            videoUrl: valores['submit-video-url']
        });
    } catch (error) {
        console.error(error);
        marcarFeedback('error', 'No se pudo enviar el récord. Revisa tu conexión e inténtalo de nuevo.');
        return;
    } finally {
        restaurar();
    }

    submitForm.hidden = true;
    submitSuccess.hidden = false;
    document.getElementById('btn-submit-done').focus();
});

// Al corregir un campo marcado, se quita la marca.
CAMPOS.forEach(({ id }) => {
    document.getElementById(id).addEventListener('input', (event) => event.target.removeAttribute('aria-invalid'));
});

initSubmitButton();
