import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * Regiones vivas globales para avisos a lectores de pantalla
 * (carga, errores, confirmaciones). Se montan una sola vez y vacías:
 * los lectores solo anuncian cambios en regiones que ya existían en el DOM.
 *
 *   const announce = useAnnounce();
 *   announce('Publicación guardada');                 // cortés: espera a que termine de hablar
 *   announce('No se pudo guardar', { assertive: true }); // interrumpe (solo para errores)
 */
const AnnouncerContext = createContext(() => {});

export function AnnouncerProvider({ children }) {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const timer = useRef();

  const announce = useCallback((message, { assertive: isAssertive = false } = {}) => {
    const set = isAssertive ? setAssertive : setPolite;
    // Vaciamos y volvemos a escribir: así se anuncia aunque el texto sea igual al anterior.
    set('');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => set(message), 100);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <AnnouncerContext.Provider value={announce}>
      {children}
      <div role="status" className="visually-hidden" data-testid="announcer-polite">
        {polite}
      </div>
      <div role="alert" className="visually-hidden" data-testid="announcer-assertive">
        {assertive}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnounce() {
  return useContext(AnnouncerContext);
}
