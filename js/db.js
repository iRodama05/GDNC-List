import { supabase } from './config.js';
import { PlayerCard } from './components/PlayerCard.js';

const rankingContainer = document.getElementById('ranking-container');

async function cargarRanking() {
    if (!rankingContainer) return;
    
    // Usamos las variables de CSS en lugar de hexadecimales crudos
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
    
    usuarios.forEach((jugador, index) => {
        const rankIndex = index + 1;
        rankingContainer.innerHTML += PlayerCard(jugador, rankIndex);
    });
}

cargarRanking();