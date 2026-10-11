import RootLayout from '../components/RootLayout.jsx';
import HomePage from '../pages/HomePage.jsx';
import CategoryPage from '../pages/CategoryPage.jsx';
import PostPage from '../pages/PostPage.jsx';
import AboutPage from '../pages/AboutPage.jsx';
import SavedPage from '../pages/SavedPage.jsx';
import ContactPage from '../pages/ContactPage.jsx';
import ErrorPage from '../pages/ErrorPage.jsx';
import PanelLayout from '../components/PanelLayout.jsx';
import LoginPage from '../pages/panel/LoginPage.jsx';
import PostsAdminPage from '../pages/panel/PostsAdminPage.jsx';
import PostFormPage from '../pages/panel/PostFormPage.jsx';
import AboutEditPage from '../pages/panel/AboutEditPage.jsx';
import CommentsAdminPage from '../pages/panel/CommentsAdminPage.jsx';
import ApplicationsAdminPage from '../pages/panel/ApplicationsAdminPage.jsx';
import { CATEGORIES, SITE_NAME } from '../lib/site.js';
import { aboutLoader, categoryLoader, homeLoader, notFoundLoader, postLoader } from './loaders.js';
import {
  adminCommentsLoader,
  adminPostsLoader,
  applicationsLoader,
  editAboutLoader,
  editPostLoader,
  loginLoader,
  requireUserLoader,
} from './panelLoaders.js';

/** Se muestra solo en la primera carga, mientras llegan los datos iniciales. */
function InitialLoading() {
  return (
    <main className="container">
      <p role="status">Cargando {SITE_NAME}…</p>
    </main>
  );
}

/**
 * Rutas del panel y del sitio público. El errorElement va en una ruta intermedia sin path:
 * así un error o un 404 se muestran DENTRO del layout (con header y menú).
 * Exportadas aparte para poder usarlas en tests con createMemoryRouter.
 */
export const routes = [
  // Panel del editor: va antes que el sitio público para que /panel no lo capture el comodín *.
  {
    path: '/panel',
    element: <PanelLayout />,
    hydrateFallbackElement: <InitialLoading />,
    children: [
      {
        errorElement: <ErrorPage />,
        children: [
          { path: 'ingresar', loader: loginLoader, element: <LoginPage /> },
          {
            // Ruta sin path que protege a todas sus hijas (y la que comparte el usuario con el layout).
            id: 'panel',
            loader: requireUserLoader,
            children: [
              { index: true, loader: adminPostsLoader, element: <PostsAdminPage /> },
              { path: 'publicaciones/nueva', element: <PostFormPage /> },
              { path: 'publicaciones/:id', loader: editPostLoader, element: <PostFormPage /> },
              { path: 'publicaciones/:id/postulaciones', loader: applicationsLoader, element: <ApplicationsAdminPage /> },
              { path: 'comentarios', loader: adminCommentsLoader, element: <CommentsAdminPage /> },
              { path: 'acerca', loader: editAboutLoader, element: <AboutEditPage /> },
            ],
          },
        ],
      },
    ],
  },
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
          { path: 'contacto', element: <ContactPage /> },
          { path: 'guardados', element: <SavedPage /> },
          { path: '*', loader: notFoundLoader, element: null },
        ],
      },
    ],
  },
];
