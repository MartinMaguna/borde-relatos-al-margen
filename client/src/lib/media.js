// Igual que server/src/utils/audio.js: el reproductor de prueba del formulario
// usa la misma URL que va a guardar la API.
const AUDIO_EXTENSIONS = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;

/** Enlace https directo a un archivo de audio (Dropbox ?dl=0 → ?raw=1), o null. */
export function normalizeAudioUrl(value) {
  let url;
  try {
    url = new URL(String(value).trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !AUDIO_EXTENSIONS.test(url.pathname)) return null;
  if (/(^|\.)dropbox\.com$/i.test(url.hostname)) {
    url.searchParams.delete('dl');
    url.searchParams.set('raw', '1');
  }
  return url.toString();
}
