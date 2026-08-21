import { supabase } from './config.js';

const btnOpenSubmit = document.getElementById('btn-open-submit');
const submitModal = document.getElementById('submit-modal');
const btnCancelSubmit = document.getElementById('btn-cancel-submit');
const btnSendSubmit = document.getElementById('btn-send-submit');
const submitMsg = document.getElementById('submit-msg');

let currentUserData = null;

// 1. Mostrar el botón solo si el usuario tiene sesión y perfil vinculado
async function initSubmitButton() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        // Traemos su nombre de GD para guardarlo junto al récord
        const { data } = await supabase.from('usuarios').select('gd_username').eq('uid', user.id).single();
        if (data && data.gd_username) {
            currentUserData = { uid: user.id, gd_username: data.gd_username };
            btnOpenSubmit.style.display = 'inline-block';
        }
    }
}

// 2. Controladores del Modal
btnOpenSubmit.addEventListener('click', () => {
    submitModal.style.display = 'flex';
});

btnCancelSubmit.addEventListener('click', () => {
    submitModal.style.display = 'none';
    submitMsg.textContent = '';
});

// 3. Enviar los datos a la base de datos
btnSendSubmit.addEventListener('click', async () => {
    const lvlName = document.getElementById('submit-lvl-name').value.trim();
    const lvlId = document.getElementById('submit-lvl-id').value.trim();
    const videoUrl = document.getElementById('submit-video-url').value.trim();

    if (!lvlName || !lvlId || !videoUrl) {
        submitMsg.style.color = '#d9534f'; // Rojo
        submitMsg.textContent = 'Por favor, llena todos los campos.';
        return;
    }

    // Desactivamos el botón temporalmente para evitar doble clic
    btnSendSubmit.disabled = true;
    btnSendSubmit.textContent = 'Enviando...';
    submitMsg.textContent = '';

    // Insertamos el récord en la tabla "submits"
    const { error } = await supabase.from('submits').insert([{
        user_uid: currentUserData.uid,
        gd_username: currentUserData.gd_username,
        nivel_nombre: lvlName,
        nivel_id: lvlId,
        video_url: videoUrl,
        estado: 'pendiente' // Aseguramos que inicie pendiente
    }]);

    if (error) {
        submitMsg.style.color = '#d9534f';
        submitMsg.textContent = 'Hubo un error de conexión al enviar el récord.';
        console.error(error);
    } else {
        submitMsg.style.color = '#43b581'; // Verde
        submitMsg.textContent = '¡Récord enviado exitosamente!';
        
        // Limpiamos el formulario y cerramos el modal después de 2 segundos
        setTimeout(() => {
            submitModal.style.display = 'none';
            submitMsg.textContent = '';
            document.getElementById('submit-lvl-name').value = '';
            document.getElementById('submit-lvl-id').value = '';
            document.getElementById('submit-video-url').value = '';
        }, 2000);
    }
    
    btnSendSubmit.disabled = false;
    btnSendSubmit.textContent = 'Enviar a Revisión';
});

// Inicializar validación
initSubmitButton();