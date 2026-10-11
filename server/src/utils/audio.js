// Extensiones que los navegadores pueden reproducir con <audio>.
const AUDIO_EXTENSIONS = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;

/**
 * Valida y normaliza el enlace a un archivo de audio alojado en otro sitio.
 *
 * Tiene que ser https y apuntar DIRECTO al archivo (terminar en .mp3, .m4a…):
 * el sitio lo reproduce con <audio>, que no puede reproducir páginas como
 * SoundCloud o Spotify. Los enlaces de Dropbox para compartir (?dl=0) se pasan
 * a enlace directo (?raw=1).
 *
 * Devuelve la URL normalizada, o null si no sirve.
 */
export function normalizeAudioUrl(value) {
  let url;
  try {
    url = new URL(String(value).trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (!AUDIO_EXTENSIONS.test(url.pathname)) return null;

  if (/(^|\.)dropbox\.com$/i.test(url.hostname)) {
    url.searchParams.delete('dl');
    url.searchParams.set('raw', '1');
  }
  return url.toString();
}
