const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
]);
const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extrae el id de un video de YouTube de cualquiera de sus formatos de enlace:
 * youtube.com/watch?v=ID, youtu.be/ID, /shorts/ID, /embed/ID, /live/ID.
 * Devuelve null si no es un enlace de YouTube válido.
 */
export function youTubeId(value) {
  let url;
  try {
    url = new URL(String(value).trim());
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol) || !YOUTUBE_HOSTS.has(url.hostname)) return null;

  let id;
  if (url.hostname === 'youtu.be') {
    id = url.pathname.slice(1).split('/')[0];
  } else if (url.pathname === '/watch') {
    id = url.searchParams.get('v');
  } else {
    const match = /^\/(?:shorts|embed|live|v)\/([^/?#]+)/.exec(url.pathname);
    id = match?.[1] ?? null;
  }
  return id && ID.test(id) ? id : null;
}

/** Forma canónica que se guarda: https://www.youtube.com/watch?v=ID */
export function canonicalYouTubeUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}
