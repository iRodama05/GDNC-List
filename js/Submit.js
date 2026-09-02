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
        const { data } = await supabase.from('usuarios').select('gd_username').eq('uid', user.id).single();
        if (data && data.gd_username) {
            currentUserData = { uid: user.id, gd_username: data.gd_username };
            // Mostramos el botón
            if (btnOpenSubmit) btnOpenSubmit.style.display = 'inline-block';
        }
    }
}

// 2. Controladores del Modal
if (btnOpenSubmit) {
    btnOpenSubmit.addEventListener('click', () => {
        submitModal.style.display = 'flex';
    });
}

if (btnCancelSubmit) {
    btnCancelSubmit.addEventListener('click', () => {
        submitModal.style.display = 'none';
        submitMsg.textContent = '';
    });
}

// 3. Enviar los datos a la base de datos
if (btnSendSubmit) {
    btnSendSubmit.addEventListener('click', async () => {
        const lvlName = document.getElementById('submit-lvl-name').value.trim();
        const lvlId = document.getElementById('submit-lvl-id').value.trim();
        const videoUrl = document.getElementById('submit-video-url').value.trim();

        if (!lvlName || !lvlId || !videoUrl) {
            submitMsg.style.color = 'var(--color-error)'; 
            submitMsg.textContent = 'Por favor, llena todos los campos.';
            return;
        }

        btnSendSubmit.disabled = true;
        btnSendSubmit.textContent = 'Enviando...';
        submitMsg.textContent = '';

        const { error } = await supabase.from('submits').insert([{
            user_uid: currentUserData.uid,
            gd_username: currentUserData.gd_username,
            nivel_nombre: lvlName,
            nivel_id: lvlId,
            video_url: videoUrl,
            estado: 'pendiente'
        }]);

        if (error) {
            submitMsg.style.color = 'var(--color-error)';
            submitMsg.textContent = 'Hubo un error de conexión al enviar el récord.';
            console.error(error);
        } else {
            submitMsg.style.color = 'var(--color-success)'; 
            submitMsg.textContent = '¡Récord enviado exitosamente!';
            
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
}

initSubmitButton();