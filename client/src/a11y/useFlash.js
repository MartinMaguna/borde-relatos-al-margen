import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useAnnounce } from './Announcer.jsx';

/**
 * Mensaje de confirmación tras una acción ("Se guardó…").
 * Llega en el state de la navegación (navigate(to, { state: { flash } })) o se
 * fija localmente (p. ej. tras eliminar sin cambiar de página). Se muestra a la
 * vista y se anuncia en la región viva, porque un aviso que aparece en pantalla
 * no se lee solo.
 */
export function useFlash() {
  const location = useLocation();
  const announce = useAnnounce();
  const incoming = location.state?.flash ?? null;
  const [local, setLocal] = useState(null);

  // Un flash que llega con una navegación nueva reemplaza al local anterior.
  const [lastKey, setLastKey] = useState(location.key);
  if (lastKey !== location.key) {
    setLastKey(location.key);
    setLocal(null);
  }

  const message = local ?? incoming;

  useEffect(() => {
    if (message) announce(message);
  }, [message, announce]);

  return [message, setLocal];
}
