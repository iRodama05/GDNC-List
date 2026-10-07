import { supabase } from '../config.js';

export async function obtenerAvatarPorUid(uid) {
    const { data, error } = await supabase
        .from('usuarios')
        .select('avatar_url')
        .eq('uid', uid)
        .maybeSingle();

    if (error) throw error;
    return data?.avatar_url || null;
}

export async function obtenerRolUsuario(uid) {
    const { data, error } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('uid', uid)
        .maybeSingle();

    if (error) throw error;
    return data?.rol || null;
}

export async function obtenerPerfil(uid) {
    const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('uid', uid)
        .maybeSingle();

    if (error) throw error;
    return data;
}

// Puesto en el ranking global: jugadores verificados con más puntos, más uno.
export async function obtenerPosicionEnRanking(puntos) {
    const { count, error } = await supabase
        .from('usuarios')
        .select('uid', { count: 'exact', head: true })
        .eq('gd_verificado', true)
        .gt('puntos_totales', puntos);

    if (error) throw error;
    return (count ?? 0) + 1;
}

export async function obtenerRecordsAceptados(uid) {
    const { data, error } = await supabase
        .from('submits')
        .select('*')
        .eq('user_uid', uid)
        .eq('estado', 'aceptado')
        .order('puntos_asignados', { ascending: false });

    if (error) throw error;
    return data || [];
}

// Me gusta, si quien mira ya dio me gusta, y comentarios de un récord, en paralelo.
export async function obtenerInteracciones(submitId, viewerUid) {
    const [likesRes, comentariosRes, miLikeRes] = await Promise.all([
        supabase.from('submit_likes').select('*', { count: 'exact', head: true }).eq('submit_id', submitId),
        supabase
            .from('comentarios')
            .select('texto, creado_en, usuarios ( gd_username, avatar_url )')
            .eq('submit_id', submitId)
            .order('creado_en', { ascending: true }),
        viewerUid
            ? supabase.from('submit_likes').select('id').eq('submit_id', submitId).eq('user_uid', viewerUid).maybeSingle()
            : Promise.resolve({ data: null })
    ]);

    if (comentariosRes.error) throw comentariosRes.error;

    return {
        likes: likesRes.count || 0,
        meGusta: Boolean(miLikeRes.data),
        comentarios: comentariosRes.data || []
    };
}

export async function publicarComentario(submitId, uid, texto) {
    const { error } = await supabase
        .from('comentarios')
        .insert([{ submit_id: submitId, user_uid: uid, texto }]);

    if (error) throw error;
}

// Devuelve el estado final: true si ahora le gusta, false si lo quitó.
export async function alternarMeGusta(submitId, uid) {
    const { data: miLike, error } = await supabase
        .from('submit_likes')
        .select('id')
        .eq('submit_id', submitId)
        .eq('user_uid', uid)
        .maybeSingle();

    if (error) throw error;

    const { error: errCambio } = miLike
        ? await supabase.from('submit_likes').delete().eq('id', miLike.id)
        : await supabase.from('submit_likes').insert([{ submit_id: submitId, user_uid: uid }]);

    if (errCambio) throw errCambio;
    return !miLike;
}

export async function crearRecordAceptado({ uid, gdUsername, nivelNombre, nivelId, videoUrl, puntos }) {
    const { error } = await supabase.from('submits').insert([{
        user_uid: uid,
        gd_username: gdUsername,
        nivel_nombre: nivelNombre,
        nivel_id: nivelId,
        video_url: videoUrl,
        puntos_asignados: puntos,
        estado: 'aceptado'
    }]);

    if (error) throw error;
}

export async function borrarRecord(submitId) {
    const { error } = await supabase.from('submits').delete().eq('submit_id', submitId);
    if (error) throw error;
}

export async function actualizarPuntosRecord(submitId, puntos) {
    const { error } = await supabase
        .from('submits')
        .update({ puntos_asignados: puntos })
        .eq('submit_id', submitId);

    if (error) throw error;
}

const BANNER_BUCKET = 'banners';

// Deben coincidir con file_size_limit y allowed_mime_types del bucket 'banners'.
export const BANNER_MAX_BYTES = 5 * 1024 * 1024;
export const BANNER_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export async function actualizarBannerActivo(uid, bannerId) {
    const { error } = await supabase
        .from('usuarios')
        .update({ banner_activo: bannerId })
        .eq('uid', uid);

    if (error) throw error;
}

// Sube (o reemplaza) la imagen en banners/{uid}/custom y la deja como banner activo.
// La URL lleva un parámetro de versión para que el navegador no muestre la imagen anterior.
export async function subirBannerPersonalizado(uid, file) {
    const path = `${uid}/custom`;
    const storage = supabase.storage.from(BANNER_BUCKET);

    const { error: errUpload } = await storage.upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: '3600'
    });
    if (errUpload) throw errUpload;

    const { data: { publicUrl } } = storage.getPublicUrl(path);
    const url = `${publicUrl}?v=${Date.now()}`;

    const { error } = await supabase
        .from('usuarios')
        .update({ banner_custom_url: url, banner_activo: 'custom' })
        .eq('uid', uid);

    if (error) throw error;
    return url;
}
