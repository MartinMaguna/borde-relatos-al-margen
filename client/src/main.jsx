import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AnnouncerProvider } from './a11y/Announcer.jsx';
import { routes } from './routes/routes.jsx';
import './styles/global.css';

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AnnouncerProvider>
      <RouterProvider router={router} />
    </AnnouncerProvider>
  </StrictMode>,
);
