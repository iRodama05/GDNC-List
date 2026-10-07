// Ayudas de interfaz sin Supabase. El formato de textos y fechas vive en format.js.

// Deja el botón en estado de carga y devuelve una función que lo restaura.
export function marcarOcupado(button, texto) {
    if (!button) return () => {};
    const original = button.innerHTML;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    if (texto) button.textContent = texto;

    return () => {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.innerHTML = original;
    };
}

async function copiarTexto(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        return;
    } catch {
        // Navegadores embebidos (Discord, webviews) o sin permiso rechazan la API: se usa el método clásico.
    }

    const previo = document.activeElement;
    const field = document.createElement('textarea');
    field.value = texto;
    field.setAttribute('readonly', '');
    field.className = 'credit-copy-field';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    previo?.focus?.({ preventScroll: true });
    if (!copied) throw new Error('copy failed');
}

// Cambia la etiqueta de un botón de copiar durante un momento y la devuelve a su texto original.
export async function copiarConAviso(button, texto) {
    const etiqueta = button.querySelector('span') || button;
    const original = etiqueta.dataset.label || etiqueta.textContent;
    etiqueta.dataset.label = original;

    try {
        await copiarTexto(texto);
        etiqueta.textContent = 'Copiado';
    } catch {
        etiqueta.textContent = 'No se pudo copiar';
    }
    clearTimeout(Number(button.dataset.copyTimer));
    button.dataset.copyTimer = String(setTimeout(() => {
        etiqueta.textContent = original;
    }, 1600));
}
