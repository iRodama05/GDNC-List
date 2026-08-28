import { supabase } from './config.js';

const pendientesContainer = document.getElementById('pendientes-container');

async function initModPanel() {
    // 1. Verificamos sesión y permisos
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.replace('index.html');

    const { data: perfil } = await supabase.from('usuarios').select('rol').eq('uid', user.id).single();
    if (!perfil || perfil.rol !== 'mod') {
        alert("Acceso denegado. No eres moderador.");
        return window.location.replace('index.html');
    }

    cargarPendientes();
}

async function cargarPendientes() {
    pendientesContainer.innerHTML = '<p style="color:#888;">Cargando récords...</p>';

    // 2. Extraer los récords que estén pendientes
    const { data: pendientes, error } = await supabase
        .from('submits')
        .select('*')
        .eq('estado', 'pendiente')
        .order('fecha_submit', { ascending: true });

    if (error || pendientes.length === 0) {
        pendientesContainer.innerHTML = '<p style="color:#43b581; text-align:center;">No hay récords pendientes por revisar. ¡Todo al día!</p>';
        return;
    }

    pendientesContainer.innerHTML = '';

    // 3. Dibujar cada récord
    pendientes.forEach(submit => {
        const card = document.createElement('div');
        card.className = 'player-card'; // Reutilizamos el estilo de las tarjetas
        card.style.flexDirection = 'column';
        card.style.alignItems = 'flex-start';

        card.innerHTML = `
            <div style="width: 100%; display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 10px;">
                <div>
                    <h3 style="color: var(--primary-color);">${submit.nivel_nombre} <span style="font-size:0.8rem; color:#888;">(ID: ${submit.nivel_id})</span></h3>
                    <p style="font-size:0.9rem;">Enviado por: <strong>${submit.gd_username}</strong></p>
                </div>
                <a href="${submit.video_url}" target="_blank" class="btn-primary" style="text-decoration:none; height: fit-content;">Ver Video</a>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap; justify-content: center; align-items: center;">
                <input type="number" id="pts-${submit.submit_id}" placeholder="Puntos a otorgar" style="padding: 0.5rem; border-radius: 5px; border: none; background: #2a2a35; color: white; width: 150px;">
                
                <button class="btn-primary btn-accept" data-id="${submit.submit_id}" data-uid="${submit.user_uid}" data-lvl="${submit.nivel_nombre}" style="background-color: #43b581;">Aceptar Récord</button>
                
                <button class="btn-outline btn-reject" data-id="${submit.submit_id}" style="color: #d9534f; border-color: #d9534f;">Rechazar</button>
            </div>
        `;
        pendientesContainer.appendChild(card);
    });

    asignarEventos();
}

function asignarEventos() {
    // Evento Rechazar
    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const submitId = e.target.getAttribute('data-id');
            if(confirm("¿Seguro que quieres rechazar este récord?")) {
                await supabase.from('submits').update({ estado: 'rechazado' }).eq('submit_id', submitId);
                cargarPendientes();
            }
        });
    });

    // Evento Aceptar (Lógica de Auto-Corrección Top 3)
    document.querySelectorAll('.btn-accept').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const submitId = e.target.getAttribute('data-id');
            const userUid = e.target.getAttribute('data-uid');
            const inputPts = document.getElementById(`pts-${submitId}`).value;
            const puntosNuevos = parseInt(inputPts);

            if (!inputPts || puntosNuevos <= 0) return alert("Debes ingresar una cantidad de puntos válida.");

            e.target.disabled = true;
            e.target.textContent = "Procesando...";

            try {
                // 1. Actualizar el Submit primero para que ya cuente en la base de datos
                await supabase.from('submits')
                    .update({ estado: 'aceptado', puntos_asignados: puntosNuevos })
                    .eq('submit_id', submitId);
                
                // 2. Extraer los 3 mejores récords aceptados del jugador
                const { data: top3Niveles } = await supabase
                    .from('submits')
                    .select('nivel_nombre, puntos_asignados')
                    .eq('user_uid', userUid)
                    .eq('estado', 'aceptado')
                    .order('puntos_asignados', { ascending: false })
                    .limit(3);

                // 3. Sumar únicamente los puntos del Top 3
                const sumaTop3 = top3Niveles.reduce((acumulador, nivel) => acumulador + nivel.puntos_asignados, 0);

                // 4. Formatear la lista visual para la tarjeta de ranking
                const nuevoTop3 = top3Niveles.map(nivel => ({
                    nombre: nivel.nivel_nombre,
                    puntos: nivel.puntos_asignados
                }));

                // 5. Sobrescribir el perfil del usuario
                await supabase.from('usuarios')
                    .update({ puntos_totales: sumaTop3, top_3_hardests: nuevoTop3 })
                    .eq('uid', userUid);

                cargarPendientes(); // Recargar lista
            } catch (error) {
                console.error("Error al procesar récord:", error);
                alert("Hubo un error procesando la petición.");
            }
        });
    });
}

initModPanel();