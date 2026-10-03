import { supabase } from '../config.js';

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
