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

## Panel del editor

Se entra escribiendo `/panel` al final de la dirección del sitio (no hay enlace público). No hay registro público: el usuario editor se crea con `npm run seed`.

| Ruta | Vista |
| ---- | ----- |
| `/panel/ingresar` | Login (si ya hay sesión, va directo al panel) |
| `/panel` | Publicaciones: filtros por título, categoría y estado; editar, ver y eliminar (con confirmación) |
| `/panel/publicaciones/nueva` | Alta |
| `/panel/publicaciones/:id` | Edición |
| `/panel/acerca` | Edición de la página Acerca |

Todas las rutas del panel verifican la sesión (`/api/auth/me`) antes de mostrarse; sin sesión se redirige al login y, al ingresar, se vuelve a la página pedida.

Las decisiones de accesibilidad están registradas en [docs/accesibilidad.md](docs/accesibilidad.md).

### Tests

- **Cliente** (`npm test -w client`): Vitest + Testing Library + axe-core, con la API simulada.
- **API** (`npm test -w server`): ver abajo.
- **Accesibilidad en navegador real** (`npm run test:e2e -w client`): Playwright + axe en Chromium, en escritorio claro, escritorio oscuro y móvil. Levanta solo su API con base en memoria (puertos 4100 y 5174). La primera vez, instalá el navegador con `npx playwright install chromium` (desde `client/`). Reporte HTML en `client/playwright-report/`.

La checklist manual con lectores de pantalla está en [docs/accesibilidad.md](docs/accesibilidad.md#cómo-verificar).

### Probar sin Atlas

```bash
npm run dev:memory -w server
```

Levanta la API con una base MongoDB en memoria, el editor de prueba y las publicaciones de ejemplo (todo se borra al cerrarla). En otra terminal, `npm run dev -w client`.

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
| GET | `/posts/:category/:slug/comments` | Comentarios aprobados de una publicación |
| POST | `/posts/:category/:slug/comments` | Enviar un comentario `{ name, text }`: queda **pendiente** de moderación. Límite: 5 cada 15 min por IP |
| POST | `/posts/convocatorias/:slug/applications` | Postularse `{ name, email, workTitle, text?, link?, message?, consent: true }`. Solo si la convocatoria tiene el formulario activado y está abierta. Límite: 5 por hora por IP |
| GET / PATCH / DELETE | `/admin/comments[/:id]` | Moderar comentarios (`?status=pending\|approved\|rejected`; PATCH `{ status }`) |
| GET | `/admin/posts/:id/applications[.csv]` | Postulaciones de una convocatoria (JSON o CSV para planilla) |
| DELETE | `/admin/applications/:id` | Eliminar una postulación |
| POST | `/contact` | Formulario de contacto `{ name, email, message }`: se guarda y se reenvía por correo al equipo. Límite: 5 por hora por IP |
| GET / DELETE | `/admin/messages[/:id]` | Mensajes de contacto (con `emailStatus`: `sent`, `failed` o `skipped`) |
| GET | `/supporters` | Logos del pie, agrupados (`impulsan`, `apoyan`, `organizan`, `colaboran`) |
| GET / POST / PUT / DELETE | `/admin/supporters[/:id]` | Cargar, editar y quitar logos `{ name, role, logoUrl, link? }` |
| POST | `/admin/preview` | Vista previa del Markdown con las mismas reglas que al publicar |
| POST | `/admin/images` | Subir una imagen (`multipart/form-data`, campo `imagen`, máx. 3 MB) → `{ id, url }` |
| GET | `/images/:id` | Ver una imagen subida (público, caché de un año) |

### Imágenes

Las imágenes subidas desde el panel se guardan **en MongoDB** (colección `images`): Railway no tiene disco persistente, así que no pueden quedar como archivos en el servidor.

- El navegador las **achica antes de subirlas** (lado mayor 1600 px, WebP o JPEG): una foto de celular de varios MB queda en unos cientos de KB. Los GIF se suben tal cual para no perder la animación.
- La API verifica el tipo **por el contenido** del archivo (JPG, PNG, WebP, GIF, AVIF), no por el nombre. No se aceptan SVG (pueden contener scripts).
- Al cambiar la imagen de una publicación o eliminarla, la imagen anterior se borra si ninguna otra publicación la usa.
- El plan gratuito de Atlas tiene 512 MB: alcanza para cientos de imágenes. Si el sitio crece mucho, conviene pasar a un servicio de imágenes (Cloudinary, S3…).
- También se puede usar una imagen de otro sitio pegando su dirección `https://…`.

### Audio y lengua de señas

No ocupan espacio en Vercel ni en MongoDB: solo se guardan los enlaces.

- **Audio:** el archivo se aloja en otro lugar (Archive.org, Dropbox, un bucket…) y en el panel se pega el **enlace directo al archivo**. Las páginas de SoundCloud o Spotify no sirven, porque el sitio reproduce el archivo con `<audio>`. En el formulario aparece un reproductor de prueba para verificar que se escucha. En las tarjetas hay un botón "Escuchar"; en la página de la publicación, un reproductor completo y un enlace para abrir o descargar el audio.
- **Lengua de señas:** enlace a un video de YouTube. En las tarjetas aparece el ícono "Lengua de señas", que lleva a la sección del video en la página de la publicación. El video se inserta desde `youtube-nocookie.com` (sin cookies de seguimiento hasta que se reproduce).

### Publicación (`Post`)

| Campo | Notas |
| ----- | ----- |
| `title`, `author`, `body` | Obligatorios. `body` en Markdown |
| `slug` | Opcional: si va vacío se genera del título (`"Canción del Ñandú"` → `cancion-del-nandu`) |
| `category` | `poesia` · `cuentos` · `talleres` · `convocatorias` (coinciden con las URLs del sitio) |
| `summary` | Hasta 500 caracteres |
| `image` | `{ url, alt }` o `null`. `url`: una imagen subida (`/api/images/<id>`) o una dirección `https://…`. **`alt` es obligatorio** |
| `audio` | `{ url, label }` o `null`. **Enlace** https directo a un archivo de audio alojado en otro sitio (`.mp3`, `.m4a`, `.ogg`, `.wav`…); no se sube nada. Los enlaces de Dropbox se pasan a directos. `label` por defecto: "Lectura en voz alta" |
| `signVideoUrl` | Video de YouTube con la versión en **lengua de señas** (cualquier formato de enlace; se guarda como `youtube.com/watch?v=…`). La API agrega `signVideoId` para insertarlo |
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

```
Navegador ──► Vercel (client/dist + vercel.json)
                 │  /poesia, /panel… → index.html (SPA)
                 └─ /api/*  ──rewrite──► Railway (server) ──► MongoDB Atlas
```

El navegador solo habla con el dominio de Vercel. Vercel reenvía `/api/*` a Railway, así la cookie de sesión es del mismo sitio (`SameSite=Strict`) y no hace falta CORS.

Producción actual:

| Servicio | URL |
| -------- | --- |
| Sitio (Vercel) | https://borde-relatos-al-margen.vercel.app |
| API (Railway) | https://server-production-3d08.up.railway.app/api/health |

### 1. MongoDB Atlas

1. Cluster (el gratuito M0 alcanza) y un usuario de base de datos con contraseña.
2. *Network Access* → **Add IP Address** → `0.0.0.0/0`. Railway no tiene IP fija; la seguridad la da el usuario y la contraseña de la cadena de conexión.
3. *Connect → Drivers*: copiar la cadena `mongodb+srv://…` y agregar el nombre de la base (`/borde`) antes del `?`.

### 2. Railway (API)

1. **New Project → Deploy from GitHub repo** → este repositorio.
2. En el servicio, *Settings*:
   - **Root Directory: `/`** (la raíz). No `server`: el `package-lock.json` del monorepo está en la raíz.
   - El resto lo define [`railway.json`](railway.json): arranque con `npm run start -w server`, *healthcheck* en `/api/health`, reinicio ante fallas y `watchPatterns` (un cambio solo en `client/` no redespliega la API).
3. *Variables*:

   | Variable | Valor |
   | -------- | ----- |
   | `NODE_ENV` | `production` (recomendado: logs de producción; la cookie igual sale `Secure` por HTTPS) |
   | `MONGODB_URI` | cadena de Atlas |
   | `JWT_SECRET` | 48+ bytes aleatorios: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `TRUST_PROXY` | opcional, `1` por defecto (ver nota) |
   | `CLIENT_ORIGIN` | `https://borde-relatos-al-margen.vercel.app` |
   | `SESSION_TTL_HOURS`, `LOGIN_RATE_LIMIT` | opcionales (8 y 10 por defecto) |
   | `RESEND_API_KEY` | clave de [Resend](https://resend.com) para que los mensajes de Contacto lleguen por correo (ver *Formulario de contacto*) |
   | `CONTACT_TO_EMAIL` | correo del equipo que recibe los mensajes de Contacto (no se muestra en el sitio) |
   | `CONTACT_FROM_EMAIL` | opcional; remitente, `Borde <onboarding@resend.dev>` por defecto |
   | `COMMENT_RATE_LIMIT`, `APPLICATION_RATE_LIMIT`, `CONTACT_RATE_LIMIT` | opcionales (5 envíos por IP) |
   | `SEED_EDITOR_NAME`, `SEED_EDITOR_EMAIL`, `SEED_EDITOR_PASSWORD` | solo hasta crear el primer editor (ver paso 5) |

   `PORT` no se define: Railway la inyecta.

   > **Nota sobre `TRUST_PROXY`.** Con `1`, el límite de intentos de login cuenta por la IP con la que Vercel llega a Railway, que pueden compartir varias personas: en el peor caso, un ataque al login bloquea el ingreso 15 minutos. Subirlo a `2` haría que se cuente por la IP real de cada persona, pero quien llame **directo** a la URL de Railway podría falsear esa IP y saltarse el límite. Para un equipo editorial chico, `1` es la opción más segura.
4. *Networking* → **Generate Domain** (o un dominio propio).
5. **Primer editor: se crea solo.** Al arrancar, si la base no tiene ningún usuario y están las variables `SEED_EDITOR_*`, la API crea ese editor (y la página "Acerca" si falta). En los logs de Railway aparece `👤 Primer editor creado: …`. Si no hay usuario ni variables, el log lo avisa.
   - **Ingresá** en `https://borde-relatos-al-margen.vercel.app/panel` con `SEED_EDITOR_EMAIL` y `SEED_EDITOR_PASSWORD`.
   - Después, **borrá las tres variables `SEED_*`** en Railway: ya no hacen falta y así la contraseña no queda guardada.
   - El arranque **nunca** modifica usuarios existentes. Para cambiar una contraseña o cargar publicaciones de ejemplo, usá el seed manual: con la [CLI de Railway](https://docs.railway.com/guides/cli), `railway link` y luego `railway ssh`; dentro del contenedor, `npm run seed -w server` (o `npm run seed -w server -- --demo`). También se puede correr `npm run seed` desde tu equipo con un `server/.env` que tenga la misma `MONGODB_URI` y las `SEED_*`.

### 3. Vercel (sitio)

1. **Add New → Project** → este repositorio.
2. *Settings → Build and Deployment*:
   - **Root Directory: `client`**, con "Incluir archivos fuera del directorio raíz" activado (el lockfile está en la raíz).
   - Framework, build y salida los define [`client/vercel.json`](client/vercel.json): Vite, `npm run build`, `dist`.
3. No hacen falta variables de entorno: el cliente usa `/api` y el rewrite de `vercel.json` lo lleva a Railway. **Si cambia la URL de Railway, hay que actualizarla en `client/vercel.json`.**
4. `vercel.json` además:
   - devuelve `index.html` para cualquier ruta (`/poesia`, `/panel`…), así se puede entrar directo o recargar;
   - cachea un año los archivos de `/assets` (llevan hash en el nombre);
   - agrega cabeceras de seguridad básicas al HTML.

### 4. Verificar el deploy

```bash
curl https://server-production-3d08.up.railway.app/api/health
```
→ `{"ok":true,"data":{"status":"ok","db":"conectado",…}}` (Railway ↔ Atlas)

```bash
curl https://borde-relatos-al-margen.vercel.app/api/health
```
→ la misma respuesta (Vercel ↔ Railway: el rewrite funciona)

```bash
curl -I https://borde-relatos-al-margen.vercel.app/poesia
```
→ `200` con `content-type: text/html` (fallback de la SPA)

En el navegador: la portada muestra las secciones (o "Todavía no hay…" si la base está vacía), `/panel` lleva al login y, tras ingresar, la cookie `borde_session` aparece con `HttpOnly`, `Secure` y `SameSite=Strict` (DevTools → Application → Cookies).

### Problemas frecuentes

| Síntoma | Causa probable |
| ------- | -------------- |
| La portada dice "Algo salió mal: el servidor respondió de forma inesperada" | El rewrite de `/api` no llega a Railway: revisar la URL en `client/vercel.json`. |
| `/poesia` da 404 de Vercel al recargar | Falta `client/vercel.json` o el Root Directory de Vercel no es `client`. |
| `/api/health` dice `"db":"desconectado"` o el deploy no pasa el healthcheck | `MONGODB_URI` mal copiada o Atlas no permite `0.0.0.0/0`. |
| No puedo ingresar al panel en un deploy nuevo | No hay editor: revisar en los logs de Railway el aviso del arranque y las variables `SEED_EDITOR_*` (contraseña de 12+ caracteres). |
| El login funciona en Railway pero no en Vercel (o al revés) | La cookie es de un solo dominio: usar siempre la URL de Vercel. |
| "Demasiados intentos" para todo el equipo a la vez | Alguien está probando contraseñas: el límite es por IP de Vercel (ver nota sobre `TRUST_PROXY`). Se libera solo en 15 minutos. |

## Design system

La identidad visual (colores, tipografía, formas y componentes) está documentada en el design system **Borde**: https://claude.ai/artifact/16SMTbxRSUEukMddJrCsFg. Los tokens de `client/src/styles/global.css` usan los mismos nombres; si se cambia un valor allá, se cambia acá con el mismo nombre. Las fuentes (Archivo y Atkinson Hyperlegible Next) se alojan en el propio sitio con `@fontsource`.

## Lectores: guardar, compartir, comentar, postularse y contacto

- **Guardar**: sin cuentas; se guarda en el navegador de la persona (`localStorage`) y se ve en `/guardados`.
- **Compartir**: copiar enlace, WhatsApp, correo, Facebook, LinkedIn y, en móviles, el menú de compartir del sistema.
- **Comentarios**: se publican solo después de aprobarlos en el panel (`/panel/comentarios`). Tienen campo trampa contra bots y límite de envíos por IP.
- **Postulaciones**: en cada convocatoria, la casilla "Recibir postulaciones con el formulario del sitio" agrega un formulario mientras esté abierta. Sin adjuntos (texto pegado o enlace). Se ven en el panel ("Postulaciones" en el listado) y se descargan en CSV. Al eliminar la convocatoria se eliminan sus postulaciones y comentarios.
- **Contacto**: `/contacto`, formulario (nombre, correo, mensaje). El correo del equipo no aparece en el sitio. Ver abajo.
- Todavía **no se envían avisos por correo** de nuevos comentarios o postulaciones: se revisan en el panel.

### Formulario de contacto

Cada mensaje se guarda en la base y se ve en el panel → **Mensajes** (con aviso si no llegó por correo). Además se reenvía por correo con [Resend](https://resend.com), con "Responder" dirigido a quien escribió:

1. Crear una cuenta gratuita en Resend **con el mismo correo que va a recibir los mensajes** (sin dominio propio, el remitente de prueba `onboarding@resend.dev` solo puede enviar a ese correo).
2. *API Keys* → **Create API Key** (permiso *Sending access*).
3. En Railway, agregar `RESEND_API_KEY` (la clave) y `CONTACT_TO_EMAIL` (el correo del equipo).

Sin esas variables el formulario funciona igual y los mensajes quedan solo en el panel. Con un dominio propio verificado en Resend se puede usar otro remitente con `CONTACT_FROM_EMAIL`.

## Logos al pie

En el panel → **Logos** se cargan quienes impulsan, apoyan, organizan o colaboran: nombre (también es el texto alternativo), grupo, logo (archivo o dirección) y enlace opcional. Se muestran al pie de todas las páginas, agrupados, tal como se cargan sobre una franja oscura: conviene subir la versión clara (blanca) en PNG con fondo transparente. Sin logos, la sección no aparece.

## Créditos

Íconos de lengua de señas, compartir, guardar y comentar: [Font Awesome Free](https://fontawesome.com) (licencia de íconos CC BY 4.0).

## Accesibilidad

Ver [docs/accesibilidad.md](docs/accesibilidad.md).
