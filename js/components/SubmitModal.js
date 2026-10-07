import { icon } from './icons.js';

// Un solo modal para las tres páginas: Submit.js lo monta al cargar.
export function SubmitModal() {
    return `
        <div id="submit-modal" class="modal-overlay" data-dismiss="backdrop">
            <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="submit-title">
                <div class="modal-header">
                    <h2 id="submit-title">Subir récord</h2>
                    <button id="btn-close-submit" class="btn-close-icon" type="button" aria-label="Cerrar">${icon('close', 18)}</button>
                </div>

                <form id="submit-form" novalidate>
                    <p class="modal-lead">Un moderador revisa el video antes de sumar los puntos a tu perfil.</p>

                    <div class="field">
                        <label class="field__label" for="submit-lvl-name">Nombre del nivel</label>
                        <input type="text" id="submit-lvl-name" class="input-field" placeholder="Ej. Kyouki" autocomplete="off" required>
                    </div>
                    <div class="field">
                        <label class="field__label" for="submit-lvl-id">ID del nivel</label>
                        <input type="text" id="submit-lvl-id" class="input-field" inputmode="numeric" placeholder="Ej. 12345678" autocomplete="off" required>
                    </div>
                    <div class="field">
                        <label class="field__label" for="submit-video-url">Enlace al video</label>
                        <input type="url" id="submit-video-url" class="input-field" placeholder="https://youtu.be/…" autocomplete="off" aria-describedby="submit-video-hint" required>
                        <span id="submit-video-hint" class="field__hint">Los videos de YouTube se ven dentro de la lista. Medal o Twitch también sirven.</span>
                    </div>

                    <p id="submit-msg" class="form-feedback" role="status"></p>

                    <div class="modal-actions">
                        <button id="btn-cancel-submit" class="btn-outline" type="button">Cancelar</button>
                        <button id="btn-send-submit" class="btn-primary" type="submit">Enviar a revisión</button>
                    </div>
                </form>

                <div id="submit-success" class="submit-success" role="status" hidden>
                    <span class="submit-success__icon">${icon('check', 28)}</span>
                    <h3 class="modal-title">Enviado a revisión</h3>
                    <p class="submit-success__text">Verás si se acepta en tus envíos, desde la campana de la barra superior.</p>
                    <div class="modal-actions btn-block">
                        <button id="btn-submit-another" class="btn-outline" type="button">Subir otro</button>
                        <button id="btn-submit-done" class="btn-primary" type="button">Listo</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}
