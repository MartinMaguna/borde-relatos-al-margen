import { data, redirect } from 'react-router';
import { api, ApiError } from '../api/client.js';
import { PAGE_SIZE } from '../lib/site.js';

export const LOGIN_PATH = '/panel/ingresar';

/** Si la API responde 401, la sesión no existe o venció: al login, recordando a dónde iba. */
function toLogin(request) {
  const { pathname, search } = new URL(request.url);
  return redirect(`${LOGIN_PATH}?volver=${encodeURIComponent(pathname + search)}`);
}

async function adminLoad(path, request) {
  try {
    return await api(path, { signal: request.signal });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) throw toLogin(request);
    if (err instanceof ApiError && err.code === 'NOT_FOUND') throw data({ message: err.message }, { status: 404 });
    throw err;
  }
}

/** Ruta padre de todo el panel: exige sesión. Sus hijas acceden al usuario con useRouteLoaderData('panel'). */
export async function requireUserLoader({ request }) {
  const { data: result } = await adminLoad('/auth/me', request);
  return { user: result.user };
}

/** En /panel/ingresar: si ya hay sesión, directo al panel. */
export async function loginLoader({ request }) {
  try {
    await api('/auth/me', { signal: request.signal });
  } catch {
    return null; // sin sesión: mostrar el formulario
  }
  throw redirect('/panel');
}

/** Filtros del listado, tomados de la URL (el formulario de filtros es un GET). */
export function readPostFilters(request) {
  const params = new URL(request.url).searchParams;
  const n = Number(params.get('pagina'));
  return {
    categoria: params.get('categoria') ?? '',
    estado: params.get('estado') ?? '',
    q: params.get('q') ?? '',
    page: Number.isInteger(n) && n > 0 ? n : 1,
  };
}

export async function adminPostsLoader({ request }) {
  const filters = readPostFilters(request);
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(PAGE_SIZE),
    ...(filters.categoria && { category: filters.categoria }),
    ...(filters.estado && { status: filters.estado }),
    ...(filters.q && { q: filters.q }),
  });
  const { data: posts, meta } = await adminLoad(`/admin/posts?${query}`, request);
  return { posts, meta, filters };
}

export async function editPostLoader({ params, request }) {
  const { data: post } = await adminLoad(`/admin/posts/${encodeURIComponent(params.id)}`, request);
  return { post };
}

export async function applicationsLoader({ params, request }) {
  const { data } = await adminLoad(`/admin/posts/${encodeURIComponent(params.id)}/applications`, request);
  return data;
}

export async function editAboutLoader({ request }) {
  const { data: page } = await adminLoad('/admin/pages/acerca', request);
  return { page };
}

export async function adminMessagesLoader({ request }) {
  const n = Number(new URL(request.url).searchParams.get('pagina'));
  const page = Number.isInteger(n) && n > 0 ? n : 1;
  const { data: messages, meta } = await adminLoad(`/admin/messages?page=${page}&limit=${PAGE_SIZE}`, request);
  return { messages, meta };
}

export async function adminSupportersLoader({ request }) {
  const { data: supporters } = await adminLoad('/admin/supporters', request);
  return { supporters };
}
