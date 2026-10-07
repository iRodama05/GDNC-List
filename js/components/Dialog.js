import { abrirModal, cerrarModal } from '../modal.js';
import { escapeHtml } from '../format.js';

let contador = 0;

/**
 * Crea un diálogo temporal encima de todo y lo elimina al cerrarse.
 * `alResolver(form)` decide el valor con el que se resuelve al confirmar; si devuelve undefined, el diálogo sigue abierto.
 * Escape o un clic en el fondo cuentan como cancelar y resuelven con `valorCancelar`.
 */
function crearDialogo({ title, message, body = () => '', confirmText, cancelText, destructive = false, alResolver, valorCancelar }) {
    const id = `dialog-${++contador}`;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay modal-overlay--top';
    overlay.dataset.dismiss = 'backdrop';
    overlay.innerHTML = `
        <form class="modal-content dialog" role="${destructive ? 'alertdialog' : 'dialog'}" aria-modal="true" aria-labelledby="${id}-title" ${message ? `aria-describedby="${id}-message"` : ''} novalidate>
            <h2 id="${id}-title" class="modal-title">${escapeHtml(title)}</h2>
            ${message ? `<p id="${id}-message" class="dialog-message">${escapeHtml(message)}</p>` : ''}
            ${body(id)}
            <div class="modal-actions">
                ${cancelText ? `<button type="button" class="btn-outline" data-action="cancel">${escapeHtml(cancelText)}</button>` : ''}
                <button type="submit" class="${destructive ? 'btn-danger' : 'btn-primary'}">${escapeHtml(confirmText)}</button>
            </div>
        </form>
    `;
    document.body.appendChild(overlay);

    const form = overlay.querySelector('form');

    return new Promise((resolve) => {
        let resuelto = false;

        const observer = new MutationObserver(() => {
            if (resuelto || overlay.classList.contains('is-open')) return;
            resuelto = true;
            observer.disconnect();
            overlay.remove();
            resolve(valorCancelar);
        });

        const terminar = async (valor) => {
            if (resuelto) return;
            resuelto = true;
            observer.disconnect();
            await cerrarModal(overlay);
            overlay.remove();
            resolve(valor);
        };

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const valor = alResolver(form);
            if (valor !== undefined) terminar(valor);
        });

        form.querySelector('[data-action="cancel"]')?.addEventListener('click', () => terminar(valorCancelar));

        observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
        abrirModal(overlay, { focus: destructive ? '[data-action="cancel"]' : 'input, button[type="submit"]' });
    });
}

export function confirmDialog({ title, message, confirmText = 'Aceptar', cancelText = 'Cancelar', destructive = false }) {
    return crearDialogo({
        title,
        message,
        confirmText,
        cancelText,
        destructive,
        valorCancelar: false,
        alResolver: () => true
    });
}

export function alertDialog({ title, message, confirmText = 'Entendido' }) {
    return crearDialogo({
        title,
        message,
        confirmText,
        valorCancelar: true,
        alResolver: () => true
    });
}

/**
 * Pide un valor con validación en línea. `validate(valor)` devuelve un mensaje de error o '' si es válido.
 * Se resuelve con el texto escrito, o con null si se cancela.
 */
export function promptDialog({ title, message, label, value = '', inputMode = 'text', confirmText = 'Guardar', cancelText = 'Cancelar', validate = () => '' }) {
    return crearDialogo({
        title,
        message,
        confirmText,
        cancelText,
        valorCancelar: null,
        body: (id) => `
            <div class="field">
                <label class="field__label" for="${id}-input">${escapeHtml(label)}</label>
                <input id="${id}-input" class="input-field" type="text" inputmode="${inputMode}" value="${escapeHtml(value)}" autocomplete="off" aria-describedby="${id}-error">
                <span id="${id}-error" class="field__error" role="status"></span>
            </div>
        `,
        alResolver: (form) => {
            const input = form.querySelector('input');
            const error = form.querySelector('.field__error');
            const valor = input.value.trim();
            const mensaje = validate(valor);

            input.setAttribute('aria-invalid', String(Boolean(mensaje)));
            error.textContent = mensaje;
            if (mensaje) {
                input.focus();
                return undefined;
            }
            return valor;
        }
    });
}
