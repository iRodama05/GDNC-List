import { escapeHtml, enlaceSeguro, fechaCorta } from '../format.js';
import { RecordMedia } from './RecordCard.js';
import { icon } from './icons.js';

export const MOTIVOS_RECHAZO = [
    { value: 'Video privado o caído', label: 'Video privado o caído' },
    { value: 'Falta de clics / Raw footage no válido', label: 'Falta de clics o raw footage no válido' },
    { value: 'Uso de hacks o botting detectado', label: 'Uso de hacks o botting' },
    { value: 'Nivel o ID incorrecto', label: 'Nivel o ID incorrecto' },
    { value: 'El video no muestra una completación válida', label: 'El video no muestra una completación válida' }
];

// Tarjeta de un récord pendiente. mod.js depende de los ids main-controls-, reject-controls-, pts-, reason- y review-feedback-.
export function ReviewCard(submit) {
    const id = submit.submit_id;
    const nivel = escapeHtml(submit.nivel_nombre);
    const fecha = fechaCorta(submit.fecha_submit);
    const meta = [`ID ${escapeHtml(submit.nivel_id)}`, `Enviado por <strong>${escapeHtml(submit.gd_username)}</strong>`];
    if (fecha) meta.push(fecha);

    // Sin enlace válido no hay botón: RecordMedia ya lo explica en la miniatura.
    const href = enlaceSeguro(submit.video_url);
    const abrirVideo = href
        ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="btn-ghost btn-sm">${icon('external', 16)}Abrir video</a>`
        : '';

    const opciones = MOTIVOS_RECHAZO
        .map(({ value, label }) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
        .join('');

    return `
        <article class="review-card" id="review-${id}">
            <div class="review-card__media">${RecordMedia(submit)}</div>

            <div class="review-card__body">
                <div class="review-card__header">
                    <div>
                        <h2 class="review-card__title">${nivel}</h2>
                        <p class="review-card__meta">${meta.join(' · ')}</p>
                    </div>
                    ${abrirVideo}
                </div>

                <div id="main-controls-${id}" class="review-card__actions">
                    <div class="field">
                        <label class="field__label" for="pts-${id}">Puntos</label>
                        <input type="text" id="pts-${id}" class="input-field" inputmode="numeric" placeholder="Ej. 120" autocomplete="off" aria-describedby="review-feedback-${id}">
                    </div>
                    <button class="btn-primary btn-accept" type="button" data-id="${id}" data-uid="${escapeHtml(submit.user_uid)}">${icon('check')}Aceptar récord</button>
                    <button class="btn-outline btn-outline--danger btn-reject-init" type="button" data-id="${id}">Rechazar</button>
                </div>

                <div id="reject-controls-${id}" class="review-reject" hidden>
                    <label class="review-reject__label" for="reason-${id}">Motivo del rechazo</label>
                    <div class="review-reject__row">
                        <select id="reason-${id}" class="select-field">${opciones}</select>
                        <button class="btn-outline btn-cancel-reject" type="button" data-id="${id}">Cancelar</button>
                        <button class="btn-danger btn-reject-confirm" type="button" data-id="${id}">Confirmar rechazo</button>
                    </div>
                </div>

                <p id="review-feedback-${id}" class="form-feedback form-feedback--error review-card__feedback" role="status"></p>
            </div>
        </article>
    `;
}
