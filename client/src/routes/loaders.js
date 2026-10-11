import { data } from 'react-router';
import { api, ApiError } from '../api/client.js';
import { PAGE_SIZE } from '../lib/site.js';

/**
 * Los loaders cargan los datos ANTES de mostrar la vista: así, cuando cambia
 * la ruta y movemos el foco al h1, el contenido ya está completo (el lector
 * no lee una pantalla a medio cargar).
 */

/** Convierte un 404 de la API en un 404 de ruta (lo muestra ErrorPage). */
async function load(path, signal) {
  try {
    return await api(path, { signal });
  } catch (err) {
    if (err instanceof ApiError && err.code === 'NOT_FOUND') {
      throw data({ message: err.message }, { status: 404 });
    }
    throw err;
  }
}

export async function homeLoader({ request }) {
  const { data: latest } = await load('/posts/latest?perCategory=3', request.signal);
  return { latest };
}

/** ?pagina=2 → 2. Cualquier valor inválido vuelve a la página 1. */
function pageFrom(request) {
  const n = Number(new URL(request.url).searchParams.get('pagina'));
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function categoryLoader(category) {
  return async ({ request }) => {
    const page = pageFrom(request);
    const { data: posts, meta } = await load(
      `/posts?category=${category}&page=${page}&limit=${PAGE_SIZE}`,
      request.signal,
    );
    return { posts, meta };
  };
}

export function postLoader(category) {
  return async ({ params, request }) => {
    const path = `/posts/${category}/${encodeURIComponent(params.slug)}`;
    // Los comentarios se cargan en paralelo; si fallan, la publicación se muestra igual.
    const [{ data: post }, comments] = await Promise.all([
      load(path, request.signal),
      api(`${path}/comments`, { signal: request.signal })
        .then((r) => r.data)
        .catch(() => []),
    ]);
    return { post, comments };
  };
}

export async function aboutLoader({ request }) {
  try {
    const { data: page } = await api('/pages/acerca', { signal: request.signal });
    return { page };
  } catch (err) {
    // Si todavía no se cargó contenido, la vista muestra un texto por defecto.
    if (err instanceof ApiError && err.code === 'NOT_FOUND') return { page: null };
    throw err;
  }
}

export function notFoundLoader() {
  throw data({ message: 'No encontramos la página que buscás.' }, { status: 404 });
}
