import { supabase } from './config.js';

// Devuelve { user, esMod }. user es null si no hay sesión.
export async function verificarAccesoMod() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { user: null, esMod: false };

    const { data: perfil } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('uid', user.id)
        .maybeSingle();

    return { user, esMod: perfil?.rol === 'mod' };
}

export async function obtenerSubmitsPendientes() {
    const { data, error } = await supabase
        .from('submits')
        .select('*')
        .eq('estado', 'pendiente')
        .order('fecha_submit', { ascending: true });

    if (error) throw error;
    return data;
}

export async function rechazarSubmit(submitId, motivo) {
    const { error } = await supabase
        .from('submits')
        .update({ estado: 'rechazado', mod_nota: motivo, leido: false })
        .eq('submit_id', submitId);

    if (error) throw error;
}

export async function aceptarSubmit(submitId, userUid, puntos) {
    const { error } = await supabase
        .from('submits')
        .update({ estado: 'aceptado', puntos_asignados: puntos, mod_nota: null, leido: false })
        .eq('submit_id', submitId);

    if (error) throw error;
    await recalcularPuntosUsuario(userUid);
}

// Los puntos del usuario son la suma de sus 3 récords aceptados con más puntos.
export async function recalcularPuntosUsuario(uid) {
    const { data: top3, error } = await supabase
        .from('submits')
        .select('nivel_nombre, puntos_asignados')
        .eq('user_uid', uid)
        .eq('estado', 'aceptado')
        .order('puntos_asignados', { ascending: false })
        .limit(3);

    if (error) throw error;

    const puntosTotales = top3.reduce((acc, nivel) => acc + Number(nivel.puntos_asignados), 0);
    const top3Hardests = top3.map(nivel => ({ nombre: nivel.nivel_nombre, puntos: Number(nivel.puntos_asignados) }));

    const { error: errUpdate } = await supabase
        .from('usuarios')
        .update({ puntos_totales: puntosTotales, top_3_hardests: top3Hardests })
        .eq('uid', uid);

    if (errUpdate) throw errUpdate;
}
