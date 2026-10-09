import RootLayout from '../components/RootLayout.jsx';
import HomePage from '../pages/HomePage.jsx';
import CategoryPage from '../pages/CategoryPage.jsx';
import PostPage from '../pages/PostPage.jsx';
import AboutPage from '../pages/AboutPage.jsx';
import ErrorPage from '../pages/ErrorPage.jsx';
import { CATEGORIES, SITE_NAME } from '../lib/site.js';
import { aboutLoader, categoryLoader, homeLoader, notFoundLoader, postLoader } from './loaders.js';

/** Se muestra solo en la primera carga, mientras llegan los datos iniciales. */
function InitialLoading() {
  return (
    <main className="container">
      <p role="status">Cargando {SITE_NAME}…</p>
    </main>
  );
}

/**
 * Rutas públicas. El errorElement va en una ruta intermedia sin path:
 * así un error o un 404 se muestran DENTRO del layout (con header y menú).
 * Exportadas aparte para poder usarlas en tests con createMemoryRouter.
 */
export const routes = [
  {
    path: '/',
    element: <RootLayout />,
    hydrateFallbackElement: <InitialLoading />,
    children: [
      {
        errorElement: <ErrorPage />,
        children: [
          { index: true, loader: homeLoader, element: <HomePage /> },
          ...CATEGORIES.flatMap((category) => [
            { path: category.slug, loader: categoryLoader(category.slug), element: <CategoryPage category={category} /> },
            { path: `${category.slug}/:slug`, loader: postLoader(category.slug), element: <PostPage /> },
          ]),
          { path: 'acerca', loader: aboutLoader, element: <AboutPage /> },
          { path: '*', loader: notFoundLoader, element: null },
        ],
      },
    ],
  },
];
