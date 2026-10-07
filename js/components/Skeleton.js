// Siluetas de carga con la misma forma que el contenido que las reemplaza.
const FILA = `
    <div class="skeleton-row">
        <span class="skeleton-block"></span>
        <span class="skeleton-lines">
            <span class="skeleton-line"></span>
            <span class="skeleton-line skeleton-line--short"></span>
        </span>
    </div>
`;

export function SkeletonRanking(filas = 4) {
    return `
        <div class="skeleton-list" role="status" aria-label="Cargando ranking">
            <div class="skeleton-podium" aria-hidden="true">
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
            </div>
            ${FILA.repeat(filas)}
        </div>
    `;
}

export function SkeletonCards(cantidad = 2, { label = 'Cargando', modifier = '' } = {}) {
    const tarjeta = `<div class="skeleton-card${modifier ? ` skeleton-card--${modifier}` : ''}"></div>`;
    return `
        <div class="skeleton-list" role="status" aria-label="${label}">
            ${tarjeta.repeat(cantidad)}
        </div>
    `;
}
