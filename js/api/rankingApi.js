import { supabase } from '../config.js';

export async function obtenerRanking() {
    const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('gd_verificado', true)
        .order('puntos_totales', { ascending: false });

    if (error) throw error;
    return data || [];
}
