import { supabase } from './config.js';
import { PlayerCard } from './components/PlayerCard.js';
import { observarTarjetas } from './ui.js'; // Importamos el animador

const rankingContainer = document.getElementById('ranking-container');
const podiumContainer = document.getElementById('podium-container');

async function cargarRanking() {
    if (!rankingContainer) return;
    
    rankingContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Cargando jugadores...</p>';

    const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('gd_verificado', true)
        .order('puntos_totales', { ascending: false });

    if (error) {
        console.error("Error al cargar el ranking:", error);
        rankingContainer.innerHTML = '<p style="text-align:center; color: var(--color-error);">Hubo un error al cargar los datos.</p>';
        return;
    }

    if (usuarios.length === 0) {
        rankingContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Aún no hay jugadores verificados en la lista.</p>';
        return;
    }

    rankingContainer.innerHTML = '';
    
    // 1. LÓGICA DEL PODIO (TOP 3)
    if (podiumContainer) {
        podiumContainer.innerHTML = '';
        const top3 = usuarios.slice(0, 3);
        
        const podiumOrder = [];
        if (top3[1]) podiumOrder.push({ player: top3[1], rank: 2 });
        if (top3[0]) podiumOrder.push({ player: top3[0], rank: 1 });
        if (top3[2]) podiumOrder.push({ player: top3[2], rank: 3 });

        podiumOrder.forEach(item => {
            podiumContainer.innerHTML += PlayerCard(item.player, item.rank);
        });
    }

    // 2. LÓGICA DEL RESTO (TOP 4 EN ADELANTE)
    const rest = usuarios.slice(3);
    rest.forEach((jugador, index) => {
        const rankIndex = index + 4;
        rankingContainer.innerHTML += PlayerCard(jugador, rankIndex);
    });

    // 3. ACTIVAR ANIMACIONES EN CASCADA
    // Una vez que el HTML está inyectado, llamamos al observador para que las anime
    observarTarjetas();
}

cargarRanking();