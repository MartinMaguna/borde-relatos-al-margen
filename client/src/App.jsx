import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

/**
 * Pantalla provisoria de la Fase 1: solo verifica que cliente ↔ API ↔ Atlas
 * estén conectados. El layout accesible y las rutas llegan en la Fase 3.
 */
export default function App() {
  const [status, setStatus] = useState('Comprobando conexión con la API…');

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then(({ data }) => setStatus(`API: ${data.status}. Base de datos: ${data.db}.`))
      .catch(() => setStatus('No se pudo conectar con la API.'));
  }, []);

  return (
    <main>
      <h1>Borde. Relatos al Margen</h1>
      {/* role="status" es una región aria-live="polite" nativa */}
      <p role="status">{status}</p>
    </main>
  );
}
