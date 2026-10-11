import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AnnouncerProvider } from './a11y/Announcer.jsx';
import { routes } from './routes/routes.jsx';
// Fuentes del design system, alojadas en el propio sitio (sin pedidos a Google:
// no se comparte la IP de quien lee y el sitio no depende de un servicio externo).
// El subconjunto "latin" incluye ñ, tildes y comillas «».
import '@fontsource/archivo/latin-700.css';
import '@fontsource/archivo/latin-800.css';
import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-400-italic.css';
import '@fontsource/atkinson-hyperlegible-next/latin-700.css';
import './styles/global.css';

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AnnouncerProvider>
      <RouterProvider router={router} />
    </AnnouncerProvider>
  </StrictMode>,
);
