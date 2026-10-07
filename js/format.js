// Formato de textos, números, fechas y enlaces compartido por componentes y controladores. Sin DOM ni Supabase.

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text = '') {
    return String(text ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

// Solo http(s): un enlace de video escrito por un usuario no puede acabar en `javascript:`.
export function enlaceSeguro(url) {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
    } catch {
        return null;
    }
}

const NUMERO = new Intl.NumberFormat('es-MX');

export const formatearPuntos = (valor) => NUMERO.format(Number(valor) || 0);

const FECHA_CORTA = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const FECHA_LARGA = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

function formatear(formato, fecha) {
    const date = new Date(fecha);
    return Number.isNaN(date.getTime()) ? '' : formato.format(date);
}

export const fechaCorta = (fecha) => formatear(FECHA_CORTA, fecha);
export const formatoFecha = (fecha) => formatear(FECHA_LARGA, fecha);

const RELATIVO = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
const TRAMOS = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
];

// "hace 3 horas", "ayer"... Por debajo de un minuto devuelve "ahora mismo".
export function tiempoRelativo(fecha) {
    const ms = new Date(fecha).getTime();
    if (Number.isNaN(ms)) return '';

    const segundos = Math.round((ms - Date.now()) / 1000);
    const tramo = TRAMOS.find(([, duracion]) => Math.abs(segundos) >= duracion);
    if (!tramo) return 'ahora mismo';

    const [unidad, duracion] = tramo;
    return RELATIVO.format(Math.round(segundos / duracion), unidad);
}
