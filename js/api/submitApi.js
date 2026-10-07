import { supabase } from '../config.js';

export async function obtenerNombreGD(uid) {
    const { data, error } = await supabase
        .from('usuarios')
        .select('gd_username')
        .eq('uid', uid)
        .maybeSingle();

    if (error) throw error;
    return data?.gd_username || null;
}

export async function enviarRecord({ uid, gdUsername, nivelNombre, nivelId, videoUrl }) {
    const { error } = await supabase.from('submits').insert([{
        user_uid: uid,
        gd_username: gdUsername,
        nivel_nombre: nivelNombre,
        nivel_id: nivelId,
        video_url: videoUrl,
        estado: 'pendiente'
    }]);

    if (error) throw error;
}
