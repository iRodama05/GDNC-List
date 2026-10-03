export const DEFAULT_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png';

// Discord guarda los avatares animados (hash `a_`) como PNG estático.
// Pedir el mismo archivo en .gif es lo que hace que la foto se mueva.
export function avatarAnimado(url) {
    const source = url || DEFAULT_AVATAR;

    try {
        const parsed = new URL(source);
        if (parsed.hostname !== 'cdn.discordapp.com' && parsed.hostname !== 'media.discordapp.net') {
            return source;
        }

        const segments = parsed.pathname.split('/');
        const file = segments.at(-1) || '';
        const animated = file.match(/^(a_[A-Za-z0-9_]+)\.(?:png|jpe?g|webp)$/i);
        if (!animated) return source;

        segments[segments.length - 1] = `${animated[1]}.gif`;
        parsed.pathname = segments.join('/');
        return parsed.toString();
    } catch {
        return source;
    }
}
