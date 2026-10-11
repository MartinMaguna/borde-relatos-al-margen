import { useSyncExternalStore } from 'react';

/**
 * Publicaciones guardadas por la persona, en ESTE navegador (localStorage).
 * El sitio no tiene cuentas de lectores: guardar no requiere registrarse, pero
 * lo guardado no pasa a otros dispositivos. Si el almacenamiento no está
 * disponible (navegación privada estricta), todo sigue funcionando sin guardar.
 */
const KEY = 'borde:guardados';
const EVENT = 'borde:guardados-cambio';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

let cache = null;
function snapshot() {
  if (cache === null) cache = read();
  return cache;
}

function write(list) {
  cache = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Sin almacenamiento: queda guardado solo mientras la página esté abierta.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback) {
  const onStorage = (e) => {
    if (e.key === KEY) {
      cache = null;
      callback();
    }
  };
  window.addEventListener(EVENT, callback);
  window.addEventListener('storage', onStorage); // otras pestañas
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}

const keyOf = (p) => `${p.category}/${p.slug}`;

export function useSaved() {
  const list = useSyncExternalStore(subscribe, snapshot, () => []);
  return {
    list,
    isSaved: (post) => list.some((p) => keyOf(p) === keyOf(post)),
    save: (post) =>
      write([
        { category: post.category, slug: post.slug, title: post.title, author: post.author, savedAt: new Date().toISOString() },
        ...list.filter((p) => keyOf(p) !== keyOf(post)),
      ]),
    remove: (post) => write(list.filter((p) => keyOf(p) !== keyOf(post))),
  };
}

/** Solo para tests. */
export function resetSavedCache() {
  cache = null;
}
