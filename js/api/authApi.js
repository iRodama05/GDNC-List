import { supabase } from '../config.js';

export async function iniciarSesionDiscord() {
    await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: window.location.origin }
    });
}

export async function cerrarSesion() {
    await supabase.auth.signOut();
}

export function alCambiarSesion(callback) {
    return supabase.auth.onAuthStateChange(callback);
}

export async function obtenerPerfilUsuario(uid) {
    const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('uid', uid)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function sincronizarAvatar(uid, avatarUrl) {
    const { error } = await supabase
        .from('usuarios')
        .update({ avatar_url: avatarUrl })
        .eq('uid', uid);

    if (error) throw error;
}

export async function obtenerMisEnvios(uid) {
    const { data, error } = await supabase
        .from('submits')
        .select('*')
        .eq('user_uid', uid)
        .order('submit_id', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function marcarEnviosLeidos(uid) {
    const { error } = await supabase
        .from('submits')
        .update({ leido: true })
        .eq('user_uid', uid)
        .eq('leido', false);

    if (error) throw error;
}

export async function guardarCodigoVerificacion(uid, codigo) {
    const { error } = await supabase
        .from('usuarios')
        .update({ codigo_verificacion_gd: codigo })
        .eq('uid', uid);

    if (error) throw error;
}

// La Edge Function consulta GDBrowser y devuelve los comentarios del perfil de GD.
export async function buscarComentariosGD(gdName) {
    const { data, error } = await supabase.functions.invoke('gdbrowser-proxy', {
        body: { gdName }
    });

    if (error || !data || data.error) throw error || new Error(data?.error || 'No se encontró el jugador.');
    return Array.isArray(data) ? data : [];
}

export async function confirmarVerificacionGD(uid, gdName) {
    const { error } = await supabase
        .from('usuarios')
        .update({
            gd_username: gdName,
            gd_verificado: true,
            codigo_verificacion_gd: null
        })
        .eq('uid', uid);

    if (error) throw error;
}
