import { abrirModal, cerrarModal } from '../modal.js';
import { icon } from './icons.js';

/**
 * Señal de alerta a la derecha del logo. Abre el aviso de que NCL Opus es un fork experimental.
 * Se monta en todas las vistas que cargan ui.js.
 */
export function mountOpusDisclaimer() {
    const logo = document.querySelector('.navbar .logo');
    if (!logo || document.getElementById('btn-opus-disclaimer')) return;

    if (!logo.parentElement.classList.contains('nav-brand')) {
        const brand = document.createElement('div');
        brand.className = 'nav-brand';
        logo.replaceWith(brand);
        brand.append(logo);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'btn-opus-disclaimer';
    button.className = 'opus-alert';
    button.setAttribute('aria-label', 'Aviso sobre NCL Opus');
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'opus-disclaimer');
    button.innerHTML = icon('warning', 18);
    logo.after(button);

    const modal = document.createElement('div');
    modal.id = 'opus-disclaimer';
    modal.className = 'modal-overlay';
    modal.dataset.dismiss = 'backdrop';
    modal.innerHTML = `
        <div class="modal-content opus-disclaimer" role="dialog" aria-modal="true" aria-labelledby="opus-disclaimer-title" aria-describedby="opus-disclaimer-body">
            <button type="button" class="btn-close-icon opus-disclaimer__close" id="btn-close-opus-disclaimer" aria-label="Cerrar">${icon('close', 18)}</button>
            <p class="modal-eyebrow">Aviso</p>
            <h2 id="opus-disclaimer-title" class="modal-title">NCL Opus es un experimento</h2>
            <div id="opus-disclaimer-body" class="opus-disclaimer__body">
                <p>NCL Opus es una bifurcación (fork) basada en la versión v1.0.3 de GDNC List, desarrollada de manera íntegra mediante inteligencia artificial. La arquitectura e implementación principal fueron ejecutadas por Opus 5.5, con el apoyo de Grok 4.7 en ajustes y refinamientos menores.</p>
                <p>Este proyecto tiene carácter puramente experimental y no está previsto para entornos de producción. Asimismo, iRodamaa declina la atribución de autoría sobre esta entrega, reconociendo el código como el resultado directo de los modelos de IA empleados.</p>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-primary" id="btn-opus-disclaimer-ok">Entendido</button>
            </div>
        </div>
    `;
    document.body.append(modal);

    const cerrar = () => cerrarModal(modal);
    button.addEventListener('click', () => abrirModal(modal));
    modal.querySelector('#btn-close-opus-disclaimer').addEventListener('click', cerrar);
    modal.querySelector('#btn-opus-disclaimer-ok').addEventListener('click', cerrar);
}
