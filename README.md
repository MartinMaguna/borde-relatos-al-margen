# Borde. Relatos al Margen

Sitio editorial de lectura (poesía, cuentos, talleres y convocatorias) con panel de edición.
Diseñado con la **accesibilidad como requisito central** (WCAG 2.2 AA, lectores de pantalla).

| Parte | Tecnología | Deploy |
| ----- | ---------- | ------ |
| `client/` | React + Vite + React Router | Vercel |
| `server/` | Node.js + Express + Mongoose | Railway |
| Base de datos | MongoDB Atlas | — |

## Estructura

```
.
├── client/               # Frontend (SPA)
│   ├── public/
│   ├── src/
│   │   ├── a11y/         # región viva (Announcer), foco al cambiar de ruta, document.title
│   │   ├── api/          # cliente fetch con el formato de la API
│   │   ├── components/   # layout, menú, tarjetas, paginación, ruta de navegación
│   │   ├── lib/          # categorías, menú, formato de fechas
│   │   ├── pages/        # Inicio, listado por categoría, detalle, Acerca, error/404
│   │   ├── routes/       # rutas y loaders (React Router 8, modo datos)
│   │   ├── styles/       # global.css (tokens, claro/oscuro, foco, lectura)
│   │   └── test/         # tests de la interfaz + axe
│   ├── index.html        # lang="es", viewport sin bloqueo de zoom
│   ├── vite.config.js    # proxy /api → server en desarrollo
│   └── eslint.config.js  # incluye jsx-a11y (strict)
├── server/               # API REST
│   ├── scripts/          # seed.js (editor + Acerca), demo-posts.js
│   ├── test/             # tests de API (node:test + supertest + Mongo en memoria)
│   └── src/
│       ├── config/       # env.js (validación con Zod), db.js (Atlas)
│       ├── middleware/   # auth, validación, errores centralizados
│       ├── models/       # User, Post, Page
│       ├── routes/       # auth, posts (público), adminPosts, pages, health
│       ├── utils/        # markdown (sanitizado), slug, respuestas
│       ├── validators/   # esquemas Zod de entrada
│       ├── app.js        # crea la app (testeable sin levantar el puerto)
│       └── index.js      # conecta a Atlas y levanta el servidor
├── docs/
│   └── accesibilidad.md  # decisiones y checklist manual
└── package.json          # npm workspaces + scripts globales
```

## Requisitos

- Node.js **22.22** o superior (ver `.nvmrc`; lo exige React Router 8).
- Una cuenta gratuita de [MongoDB Atlas](https://www.mongodb.com/atlas).

## Puesta en marcha local

1. **Instalar dependencias** (desde la raíz; instala ambos workspaces):

   ```bash
   npm install
   ```

2. **Crear la base en Atlas**
   1. Crear un cluster gratuito (M0).
   2. *Database Access*: crear un usuario con contraseña.
   3. *Network Access*: agregar tu IP (para Railway, más adelante, `0.0.0.0/0`).
   4. *Connect → Drivers*: copiar la cadena `mongodb+srv://…` y agregar el nombre de la base (`/borde`) antes del `?`.

3. **Variables de entorno del server**

   ```bash
   cp server/.env.example server/.env
   ```

   Completar `MONGODB_URI` y `JWT_SECRET`. Para generar un secreto:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   El cliente no necesita `.env` en desarrollo (los valores por defecto ya apuntan al proxy).

   Completar también `SEED_EDITOR_NAME`, `SEED_EDITOR_EMAIL` y `SEED_EDITOR_PASSWORD` (mínimo 12 caracteres).

4. **Crear el usuario editor** (no hay registro público):

   ```bash
   npm run seed
   ```

   Crea o actualiza el editor y la página "Acerca". Es idempotente: correrlo de nuevo sirve para cambiar la contraseña.
   Para cargar además publicaciones de ejemplo (solo si la base está vacía):

   ```bash
   npm run seed -w server -- --demo
   ```

5. **Levantar todo**

   ```bash
   npm run dev
   ```

   - Cliente: http://localhost:5173
   - API: http://localhost:4000/api/health → `{"ok":true,"data":{"status":"ok","db":"conectado",…}}`

   La página inicial del cliente anuncia el estado de la conexión con la API y la base.

## Scripts (raíz)

| Script | Qué hace |
| ------ | -------- |
| `npm run dev` | Server (con `--watch`) y cliente en paralelo |
| `npm run dev:server` / `npm run dev:client` | Cada uno por separado |
| `npm run build` | Build de producción del cliente |
| `npm run seed` | Crea/actualiza el editor y la página Acerca |
| `npm run lint` | ESLint en server y cliente (incluye jsx-a11y) |
| `npm test` | Tests de la API y de la interfaz (incluye axe) |

## Sitio público

| Ruta | Vista |
| ---- | ----- |
| `/` | Presentación y últimas 3 publicaciones de cada categoría |
| `/poesia`, `/cuentos`, `/talleres`, `/convocatorias` | Listado paginado (`?pagina=2`) |
| `/:categoria/:slug` | Detalle de la publicación |
| `/acerca` | Página editable "Acerca" |

Las decisiones de accesibilidad están registradas en [docs/accesibilidad.md](docs/accesibilidad.md).

### Tests

- **Cliente** (`npm test -w client`): Vitest + Testing Library + axe-core, con la API simulada.
- **API** (`npm test -w server`): ver abajo.

Los tests de la API usan **MongoDB en memoria** (`mongodb-memory-server`): no tocan Atlas ni necesitan `.env`.
La primera ejecución descarga un binario de MongoDB (en Windows, unos 800 MB; queda en caché en `~/.cache/mongodb-binaries`).

## API

Base: `/api`. Las rutas `/api/admin/*` exigen sesión de editor (cookie `borde_session`).

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/health` | Estado de la API y de la base |
| POST | `/auth/login` | `{ email, password }` → setea la cookie de sesión. Limitado a 10 intentos / 15 min por IP |
| POST | `/auth/logout` | Borra la cookie |
| GET | `/auth/me` | Usuario de la sesión actual (401 si no hay) |
| GET | `/posts?category=&page=&limit=` | Publicadas, paginadas, sin el cuerpo |
| GET | `/posts/latest?perCategory=3` | Últimas publicadas agrupadas por categoría (portada) |
| GET | `/posts/:category/:slug` | Detalle publicado, con `bodyHtml` |
| GET | `/pages/acerca` | Página Acerca, con `bodyHtml` |
| GET | `/admin/posts?category=&status=&q=&page=&limit=` | Todas (borradores incluidos), con filtros |
| GET | `/admin/posts/:id` | Una publicación, con el Markdown original |
| POST | `/admin/posts` | Crear |
| PUT | `/admin/posts/:id` | Editar (se envía la publicación completa) |
| DELETE | `/admin/posts/:id` | Eliminar |
| GET / PUT | `/admin/pages/acerca` | Leer / guardar la página Acerca |

### Publicación (`Post`)

| Campo | Notas |
| ----- | ----- |
| `title`, `author`, `body` | Obligatorios. `body` en Markdown |
| `slug` | Opcional: si va vacío se genera del título (`"Canción del Ñandú"` → `cancion-del-nandu`) |
| `category` | `poesia` · `cuentos` · `talleres` · `convocatorias` (coinciden con las URLs del sitio) |
| `summary` | Hasta 500 caracteres |
| `image` | `{ url, alt }` o `null`. **`alt` es obligatorio** |
| `status` | `draft` · `published`. `publishedAt` se registra la primera vez que se publica |
| `deadline`, `basesUrl` | Solo convocatorias; `deadline` obligatorio. Una fecha sola (`2026-11-30`) vale hasta las 23:59 de ese día (UTC-3) |
| `callStatus` | Calculado: `abierta` / `cerrada` según `deadline` |

El Markdown se convierte a HTML en el servidor y se **sanitiza** con lista blanca: sin scripts, estilos ni imágenes embebidas; los saltos de línea simples se respetan (poesía) y los encabezados se bajan un nivel para que el único `h1` sea el título.

## Convenciones de la API

Todas las respuestas tienen la misma forma:

```json
{ "ok": true,  "data": { }, "meta": { } }
{ "ok": false, "error": { "message": "…", "code": "NOT_FOUND", "details": [] } }
```

Los errores se manejan en un único middleware (`server/src/middleware/errors.js`); los 500 nunca exponen detalles internos.

## Por qué un rewrite de `/api` en Vercel

El navegador siempre habla con **un solo origen** (`/api/...`): en local lo resuelve el proxy de Vite y en producción un rewrite de Vercel hacia Railway. Así la cookie httpOnly del JWT es *first-party*, puede usar `SameSite=Strict` (protección contra CSRF) y no depende de CORS ni de cookies de terceros (que Safari y otros navegadores bloquean).

## Seguridad

- Contraseñas con **bcrypt** (costo 12). El login responde igual si falla el email o la contraseña, y tarda lo mismo.
- **JWT** firmado con HS256 en cookie `httpOnly`, `Secure` (producción) y `SameSite=Strict`. En cada request se verifica que el usuario siga existiendo.
- **Rate limiting** del login por IP. **helmet** para cabeceras seguras. Las respuestas de `/api` llevan `Cache-Control: no-store`.
- **Validación** de toda entrada con Zod (mensajes en español, errores por campo). URLs solo `http(s)`.
- **Sanitización** del HTML generado desde Markdown.

## Deploy

Guía paso a paso para Railway y Vercel: se completa en la **Fase 6**.

## Accesibilidad

Ver [docs/accesibilidad.md](docs/accesibilidad.md).
