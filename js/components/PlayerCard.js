export function PlayerCard(player, rank) {
    // Lógica para destacar a los 3 primeros lugares
    let rankClass = "rank-normal";
    if (rank === 1) rankClass = "rank-first";
    if (rank === 2) rankClass = "rank-second";
    if (rank === 3) rankClass = "rank-third";

    const avatar = player.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png';

    // Generar la lista de sus top 3 hardests
    let hardestsHTML = '';
    if (player.top_3_hardests && player.top_3_hardests.length > 0) {
        hardestsHTML = player.top_3_hardests.map(nivel => `
            <div class="hardest-item">
                <span class="lvl-name">${nivel.nombre}</span>
                <span class="lvl-pts">${nivel.puntos}pt</span>
            </div>
        `).join('');
    } else {
        hardestsHTML = '<span class="empty-hardests">Sin récords registrados</span>';
    }

    // CAMBIO: Transformamos el <div> principal en un <a>
    return `
        <a href="profile.html?uid=${player.uid}" class="player-card ${rankClass}" style="text-decoration: none; color: inherit; display: flex;">
            <div class="rank-number">#${rank}</div>
            
            <img src="${avatar}" alt="Avatar de ${player.gd_username}" class="player-avatar-large">
            
            <div class="player-info-main">
                <h3 class="player-gd-title" style="margin-bottom: 3px;">${player.gd_username}</h3>
                
                <!-- NUEVO CONTENEDOR DE DISCORD PARA LA TARJETA -->
                <div style="display: flex; align-items: center; gap: 5px; color: #5865F2;">
                    <svg width="14" height="14" viewBox="0 0 127.14 96.36" fill="currentColor">
                        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c2.64-27.38-4.51-51.11-19.32-72.15ZM42.68,65.27C36.67,65.27,31.7,59.65,31.7,52.7c0-6.86,4.78-12.58,10.98-12.58,6.26,0,11.11,5.81,10.98,12.58C53.66,59.65,48.8,65.27,42.68,65.27Zm41.85,0c-6.01,0-10.98-5.62-10.98-12.58,0-6.86,4.78-12.58,10.98-12.58,6.26,0,11.11,5.81,10.98,12.58C95.51,59.65,90.65,65.27,84.53,65.27Z"/>
                    </svg>
                    <span style="font-size: 0.85rem; font-weight: 600;">${player.discord_username}</span>
                </div>
                <!-- FIN DEL NUEVO CONTENEDOR -->

            </div>

            <div class="player-hardests-container">
                ${hardestsHTML}
            </div>

            <div class="player-total-points">
                <span class="pts-value">${player.puntos_totales || 0}</span>
                <span class="pts-label">PTS</span>
            </div>
        </a>
    `;
}