import { supabase } from './config.js';
import { PlayerCard } from './components/PlayerCard.js';

const rankingContainer = document.getElementById('ranking-container');

async function cargarRanking() {
    rankingContainer.innerHTML = '<p style="text-align:center; color:#888;">Cargando jugadores...</p>';

    // Hacemos la consulta a Supabase
    const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('gd_verificado', true) // Solo mostrar a los que ya verificaron su GD
        .order('puntos_totales', { ascending: false }); // Ordenar de mayor a menor

    if (error) {
        console.error("Error al cargar el ranking:", error);
        rankingContainer.innerHTML = '<p style="color:red;">Hubo un error al cargar los datos.</p>';
        return;
    }

    if (usuarios.length === 0) {
        rankingContainer.innerHTML = '<p style="text-align:center; color:#888;">Aún no hay jugadores verificados en la lista.</p>';
        return;
    }

    // Limpiamos el contenedor y dibujamos las tarjetas
    rankingContainer.innerHTML = '';
    
    usuarios.forEach((jugador, index) => {
        const rankIndex = index + 1; // Para que empiece en 1 y no en 0
        rankingContainer.innerHTML += PlayerCard(jugador, rankIndex);
    });
}

// Ejecutamos la función apenas cargue el archivo
cargarRanking();