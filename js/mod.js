import { IS_DEV_MODE } from './config.js';
import { verificarAccesoMod, obtenerSubmitsPendientes, rechazarSubmit, aceptarSubmit } from './modApi.js';

const pendientesContainer = document.getElementById('pendientes-container');

async function initModPanel() {
    // 1. Verificamos sesión y permisos
    const { user, esMod } = await verificarAccesoMod();

    if (!user || !esMod) {
        if (IS_DEV_MODE) {
            console.warn('[DEV MODE] El usuario de desarrollo no es mod en la base de datos; se omite la redirección.');
        } else {
            if (user) alert("Acceso denegado. No eres moderador.");
            return window.location.replace('index.html');
        }
    }

    cargarPendientes();
}

async function cargarPendientes() {
    pendientesContainer.innerHTML = '<p style="color: var(--text-muted);">Cargando récords...</p>';

    // 2. Extraer los récords que estén pendientes
    let pendientes;
    try {
        pendientes = await obtenerSubmitsPendientes();
    } catch (error) {
        console.error("Error al cargar pendientes:", error);
        pendientesContainer.innerHTML = '<p style="color: var(--color-error); text-align:center;">Hubo un error al cargar los récords pendientes.</p>';
        return;
    }

    if (pendientes.length === 0) {
        pendientesContainer.innerHTML = '<p style="color: var(--color-success); text-align:center;">No hay récords pendientes por revisar. ¡Todo al día!</p>';
        return;
    }

    pendientesContainer.innerHTML = '';

    // 3. Dibujar cada récord usando las clases base limpias
    pendientes.forEach(submit => {
        const card = document.createElement('div');
        // Reutilizamos player-card pero lo adaptamos ligeramente para que sea una columna
        card.className = 'player-card'; 
        card.style.flexDirection = 'column';
        card.style.alignItems = 'stretch';
        card.style.gap = '15px';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-default); padding-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                <div>
                    <h3 class="player-card__title" style="color: var(--color-discord);">${submit.nivel_nombre} <span style="font-size:0.8rem; color: var(--text-muted);">(ID: ${submit.nivel_id})</span></h3>
                    <p style="font-size:0.9rem; color: var(--text-main);">Enviado por: <strong>${submit.gd_username}</strong></p>
                </div>
                <a href="${submit.video_url}" target="_blank" class="btn-primary" style="text-decoration:none; display: inline-flex; align-items: center; height: fit-content;">Ver Video</a>
            </div>
            
            <!-- CONTROLES PRINCIPALES (Aceptar / Iniciar Rechazo) -->
            <div id="main-controls-${submit.submit_id}" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; align-items: center; margin-top: 5px; transition: opacity 0.3s ease;">
                <input type="number" id="pts-${submit.submit_id}" class="input-field" placeholder="Pts a otorgar..." style="width: 150px; margin-bottom: 0; border: 2px solid var(--color-success); font-weight: bold; text-align: center; background: rgba(67, 181, 129, 0.1);">
                <button class="btn-primary btn-primary--success btn-accept" data-id="${submit.submit_id}" data-uid="${submit.user_uid}" data-lvl="${submit.nivel_nombre}">Aceptar Récord</button>
                <button class="btn-outline btn-outline--danger btn-reject-init" data-id="${submit.submit_id}">Rechazar</button>
            </div>

            <!-- CONTROLES DE RECHAZO (Ocultos por defecto) -->
            <div id="reject-controls-${submit.submit_id}" style="display: none; background: rgba(217, 83, 79, 0.1); padding: 15px; border-radius: 8px; margin-top: 5px; border: 1px solid var(--color-error); opacity: 0; transition: opacity 0.3s ease;">
                <label style="font-size: 0.85rem; color: var(--color-error); font-weight: bold; margin-bottom: 10px; display: block;">Selecciona el motivo del rechazo:</label>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                    <select id="reason-${submit.submit_id}" class="input-field" style="flex: 1; margin: 0; min-width: 200px; border-color: var(--color-error);">
                        <option value="Video privado o caído">Video privado o caído</option>
                        <option value="Falta de clics / Raw footage no válido">Falta de clics / Raw footage no válido</option>
                        <option value="Uso de hacks o botting detectado">Uso de hacks o botting detectado</option>
                        <option value="Nivel o ID incorrecto">Nivel o ID incorrecto</option>
                        <option value="El video no muestra una completación válida">El video no muestra una completación válida</option>
                    </select>
                    <button class="btn-outline btn-cancel-reject" data-id="${submit.submit_id}">Cancelar</button>
                    <button class="btn-primary btn-reject-confirm" data-id="${submit.submit_id}" style="background-color: var(--color-error); color: white;">Confirmar Rechazo</button>
                </div>
            </div>
        `;
        pendientesContainer.appendChild(card);
    });

    asignarEventos();
}

function asignarEventos() {
    // 1. Mostrar menú de rechazo con animación
    document.querySelectorAll('.btn-reject-init').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const submitId = e.target.getAttribute('data-id');
            const mainControls = document.getElementById(`main-controls-${submitId}`);
            const rejectControls = document.getElementById(`reject-controls-${submitId}`);
            
            // Fade out principal
            mainControls.style.opacity = '0';
            setTimeout(() => {
                mainControls.style.display = 'none';
                
                // Fade in rechazo
                rejectControls.style.display = 'block';
                void rejectControls.offsetWidth; // Forzar reflow para que corra la transición
                rejectControls.style.opacity = '1';
            }, 300);
        });
    });

    // 2. Cancelar rechazo (volver a controles principales)
    document.querySelectorAll('.btn-cancel-reject').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const submitId = e.target.getAttribute('data-id');
            const mainControls = document.getElementById(`main-controls-${submitId}`);
            const rejectControls = document.getElementById(`reject-controls-${submitId}`);
            
            rejectControls.style.opacity = '0';
            setTimeout(() => {
                rejectControls.style.display = 'none';
                
                mainControls.style.display = 'flex';
                void mainControls.offsetWidth;
                mainControls.style.opacity = '1';
            }, 300);
        });
    });

    // 3. Confirmar Rechazo
    document.querySelectorAll('.btn-reject-confirm').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const submitId = e.target.getAttribute('data-id');
            const selectReason = document.getElementById(`reason-${submitId}`).value;
            
            if(confirm("¿Seguro que quieres rechazar este récord? Se notificará al usuario.")) {
                const textoOriginal = e.target.textContent;
                e.target.disabled = true;
                e.target.textContent = "...";

                try {
                    await rechazarSubmit(submitId, selectReason);
                    cargarPendientes();
                } catch (error) {
                    console.error("Error al rechazar récord:", error);
                    alert("Hubo un error procesando la petición.");
                    e.target.disabled = false;
                    e.target.textContent = textoOriginal;
                }
            }
        });
    });

    // 4. Aceptar Récord
    document.querySelectorAll('.btn-accept').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const submitId = e.target.getAttribute('data-id');
            const userUid = e.target.getAttribute('data-uid');
            const inputPts = document.getElementById(`pts-${submitId}`).value;
            const puntosNuevos = parseInt(inputPts);

            // Validar que el mod no haya olvidado poner los puntos
            if (!inputPts || puntosNuevos <= 0 || isNaN(puntosNuevos)) {
                return alert("⚠️ Por favor, ingresa los puntos que otorgarás antes de aceptar.");
            }

            const textoOriginal = e.target.textContent;
            e.target.disabled = true;
            e.target.textContent = "Procesando...";

            try {
                await aceptarSubmit(submitId, userUid, puntosNuevos);
                cargarPendientes(); // Recargar lista
            } catch (error) {
                console.error("Error al procesar récord:", error);
                alert("Hubo un error procesando la petición.");
                e.target.disabled = false;
                e.target.textContent = textoOriginal;
            }
        });
    });
}

initModPanel();