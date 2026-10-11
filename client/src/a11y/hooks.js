import { useEffect } from 'react';
import { useLocation, useNavigation } from 'react-router';
import { SITE_NAME } from '../lib/site.js';
import { useAnnounce } from './Announcer.jsx';

/** Actualiza document.title: "Poesía · Borde. Relatos al Margen". Es lo primero que lee el lector al cambiar de vista. */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  }, [title]);
}

// Estado global (no por componente): al pasar del sitio público al panel cambia
// el layout y se vuelve a montar, pero eso sigue siendo una navegación.
let initialKey = null;
let hasNavigated = false;

/** Solo para tests: cada test simula una carga inicial nueva. */
export function resetRouteFocus() {
  initialKey = null;
  hasNavigated = false;
}

/**
 * Al navegar dentro de la SPA el navegador no recarga la página, así que el
 * foco quedaría en el enlace pulsado (que quizá ya no existe). Lo movemos al h1
 * de la nueva vista: el lector anuncia el título y la lectura arranca desde ahí.
 *
 * No se hace en la carga inicial, donde el lector ya empieza desde el principio
 * y el primer Tab tiene que llegar a "Saltar al contenido". Se compara la clave
 * de la ubicación y no "es el primer render": en desarrollo, StrictMode ejecuta
 * los efectos dos veces y eso se confundía con una navegación.
 */
export function useRouteFocus() {
  const { key, pathname, search, hash } = useLocation();

  useEffect(() => {
    if (initialKey === null) initialKey = key;
    if (key !== initialKey) hasNavigated = true;

    // Enlace a una sección (p. ej. /poesia/orilla#lengua-de-senas): foco y scroll a esa
    // sección, también en la carga inicial (la persona pidió ir justo ahí).
    const section = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (section) {
      if (!section.hasAttribute('tabindex')) section.setAttribute('tabindex', '-1');
      section.focus();
      return;
    }

    if (!hasNavigated) return;
    const target = document.querySelector('main h1') ?? document.querySelector('main');
    // El scroll lo maneja <ScrollRestoration> (arriba al avanzar, posición previa al volver).
    target?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` cambia también con el hash (#contenido); solo reaccionamos a cambios de vista
  }, [pathname, search]);
}

/**
 * Si una navegación tarda, avisa "Cargando…" una sola vez.
 * El umbral evita anuncios innecesarios en cargas rápidas.
 */
export function useLoadingAnnouncement(delay = 500) {
  const announce = useAnnounce();
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';

  useEffect(() => {
    if (!isLoading) return undefined;
    const t = setTimeout(() => announce('Cargando…'), delay);
    return () => clearTimeout(t);
  }, [isLoading, announce, delay]);

  return isLoading;
}
