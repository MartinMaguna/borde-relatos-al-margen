# Borde Relatos al margen

Sitio editorial de lectura (poesía, cuentos, talleres y convocatorias) con panel de edición.
Diseñado con la **accesibilidad como requisito central** (WCAG 2.2 AA, lectores de pantalla).

| Parte | Tecnología | Deploy |
| ----- | ---------- | ------ |
| `client/` | React + Vite + React Router | Vercel |
| `server/` | Node.js + Express + Mongoose | Vercel (función serverless) |
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
   3. *Network Access*: agregar tu IP (para Vercel, `0.0.0.0/0`).
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
| POST | `/posts/convocatorias/:slug/applications` | Postularse `{ name, email, workTitle, text?, link?, message?, consent: true }`. Solo si la convocatoria tiene el formulario activado y está abierta. Límite: 5 por hora por IP |
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

Las imágenes subidas desde el panel se guardan **en MongoDB** (colección `images`): las funciones de Vercel no tienen disco persistente, así que no pueden quedar como archivos en el servidor.

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

## Por qué la API vive bajo `/api` del mismo dominio

El navegador siempre habla con **un solo origen** (`/api/...`): en local lo resuelve el proxy de Vite y en producción la función serverless de Vercel, en el mismo dominio que el sitio. Así la cookie httpOnly del JWT es *first-party*, puede usar `SameSite=Strict` (protección contra CSRF) y no depende de CORS ni de cookies de terceros (que Safari y otros navegadores bloquean).

## Seguridad

- Contraseñas con **bcrypt** (costo 12). El login responde igual si falla el email o la contraseña, y tarda lo mismo.
- **JWT** firmado con HS256 en cookie `httpOnly`, `Secure` (producción) y `SameSite=Strict`. En cada request se verifica que el usuario siga existiendo.
- **Rate limiting** del login y de los formularios públicos por IP (en Vercel, el conteo se guarda en MongoDB para que valga entre instancias). **helmet** para cabeceras seguras. Las respuestas de `/api` llevan `Cache-Control: no-store`.
- **Validación** de toda entrada con Zod (mensajes en español, errores por campo). URLs solo `http(s)`.
- **Sanitización** del HTML generado desde Markdown.

## Deploy (Vercel + MongoDB Atlas, costo USD 0)

```
Navegador ──► Vercel
                 ├─ /poesia, /panel…  → client/dist/index.html (SPA)
                 └─ /api/*  → función serverless client/api/index.js
                                (la app de Express de /server) ──► MongoDB Atlas (M0)
```

Todo en un solo proyecto de Vercel (plan Hobby) y una base gratuita de Atlas (M0). Los datos —publicaciones, imágenes, usuarios, postulaciones, mensajes— están en Atlas: el servidor no guarda archivos en disco.

| Servicio | URL |
| -------- | --- |
| Sitio y API (Vercel) | https://borde-relatos-al-margen.vercel.app (salud: `/api/health`) |

### Cómo funciona la API en Vercel

- [`client/api/index.js`](client/api/index.js) es la función: reexporta [`server/src/serverless.js`](server/src/serverless.js), que conecta a Atlas una vez por instancia (la conexión se reutiliza), crea el primer editor y la página Acerca si faltan, y le pasa cada petición a la **misma app de Express** de siempre (`server/src/app.js`).
- [`client/vercel.json`](client/vercel.json) reescribe `/api/<ruta>` → `/api?__ruta=<ruta>` y la función rearma la URL original. El resto de las rutas devuelve `index.html` (SPA).
- Vercel incluye en la función el código de `/server` y sus dependencias (están en el `node_modules` de la raíz del monorepo): por eso el proyecto necesita "Include files outside the root directory".
- Límites de intentos (login, postulaciones, contacto): con la variable `VERCEL` (la define Vercel) se guardan en la colección `ratelimits` de Atlas, que se limpia sola.
- Las imágenes se sirven con `s-maxage`: la CDN de Vercel las guarda y no se invoca la función en cada visita.
- En local nada cambia: `npm run dev` levanta Express con `server/src/index.js`.

### 1. MongoDB Atlas

1. Cluster gratuito **M0** y un usuario de base de datos con contraseña.
2. *Network Access* → **Add IP Address** → `0.0.0.0/0`. Vercel no tiene IP fija; la seguridad la da el usuario y la contraseña de la cadena de conexión.
3. *Connect → Drivers*: copiar la cadena `mongodb+srv://…` y agregar el nombre de la base (`/borde`) antes del `?`.

### 2. Vercel

1. **Add New → Project** → este repositorio (o el proyecto existente).
2. *Settings → Build and Deployment*:
   - **Root Directory: `client`**, con **"Include files outside the root directory in the Build Step"** activado (la función usa el código de `/server` y el lockfile está en la raíz).
   - Framework, build, salida, rewrites y duración de la función los define [`client/vercel.json`](client/vercel.json).
3. *Settings → Environment Variables* (para **Production** y **Preview**):

   | Variable | Valor |
   | -------- | ----- |
   | `MONGODB_URI` | cadena de Atlas |
   | `JWT_SECRET` | 48+ bytes aleatorios: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `CLIENT_ORIGIN` | `https://borde-relatos-al-margen.vercel.app` |
   | `NODE_ENV` | `production` |
   | `RESEND_API_KEY`, `CONTACT_TO_EMAIL` | opcionales: para que los mensajes de Contacto lleguen por correo (ver *Formulario de contacto*) |
   | `CONTACT_FROM_EMAIL` | opcional; remitente, `Borde <onboarding@resend.dev>` por defecto |
   | `SESSION_TTL_HOURS`, `LOGIN_RATE_LIMIT`, `APPLICATION_RATE_LIMIT`, `CONTACT_RATE_LIMIT`, `TRUST_PROXY` | opcionales (8, 10, 5, 5 y 1 por defecto) |
   | `SEED_EDITOR_NAME`, `SEED_EDITOR_EMAIL`, `SEED_EDITOR_PASSWORD` | solo si la base no tiene ningún usuario (ver abajo) |

   Un cambio de variables se aplica en el **próximo deploy** (*Deployments → … → Redeploy*).
4. **Primer editor: se crea solo.** En la primera petición a la API, si la base no tiene ningún usuario y están las variables `SEED_EDITOR_*`, se crea ese editor (y la página "Acerca" si falta). Después, borrá las `SEED_*`. Para cambiar una contraseña o cargar ejemplos: `npm run seed` desde tu equipo, con un `server/.env` que tenga la misma `MONGODB_URI` y las `SEED_*`.

### 3. Verificar el deploy

```bash
curl https://borde-relatos-al-margen.vercel.app/api/health
```
→ `{"ok":true,"data":{"status":"ok","db":"conectado",…}}` (Vercel ↔ Atlas)

```bash
curl -I https://borde-relatos-al-margen.vercel.app/poesia
```
→ `200` con `content-type: text/html` (fallback de la SPA)

En el navegador: la portada muestra las publicaciones, `/panel` lleva al login y, tras ingresar, la cookie `borde_session` aparece con `HttpOnly`, `Secure` y `SameSite=Strict` (DevTools → Application → Cookies).

### Problemas frecuentes

| Síntoma | Causa probable |
| ------- | -------------- |
| `/api/health` responde 503 "El servidor no está disponible" | La función no conecta: falta una variable (los logs de la función dicen cuál), `MONGODB_URI` mal copiada o Atlas no permite `0.0.0.0/0`. |
| La función falla con "Cannot find module" | Falta activar "Include files outside the root directory" en Vercel. |
| `/poesia` da 404 de Vercel al recargar | Falta `client/vercel.json` o el Root Directory de Vercel no es `client`. |
| No puedo ingresar al panel en un deploy nuevo | No hay editor: definir `SEED_EDITOR_*` (contraseña de 12+ caracteres) y volver a desplegar. |
| La primera carga después de un rato tarda 1–3 segundos | Arranque en frío de la función (normal en el plan gratuito); las siguientes son rápidas. |

### Anterior: Railway

Hasta noviembre de 2026 la API corría en Railway (`https://server-production-3d08.up.railway.app`, configuración en [`railway.json`](railway.json); `server/src/index.js` sigue funcionando como servidor tradicional). Se conserva hasta confirmar que todo funciona en Vercel.

## Design system

La identidad visual (colores, tipografía, formas y componentes) está documentada en el design system **Borde**: https://claude.ai/artifact/16SMTbxRSUEukMddJrCsFg. Los tokens de `client/src/styles/global.css` usan los mismos nombres; si se cambia un valor allá, se cambia acá con el mismo nombre. Las fuentes (Archivo y Atkinson Hyperlegible Next) se alojan en el propio sitio con `@fontsource`.

## Lectores: guardar, compartir, postularse y contacto

- **Guardar**: sin cuentas; se guarda en el navegador de la persona (`localStorage`) y se ve en `/guardados` (botón "Mis guardados" en cada publicación).
- **Comentarios**: no hay (se quitaron).
- **Capítulos** (solo cuentos): en el panel, "Agregar capítulo" (título y texto, se pueden reordenar). En el sitio se muestran con un índice; el texto principal queda como introducción.
- **Convocatorias**: fecha de apertura opcional y fecha límite. Antes de la apertura figuran como "Próximamente" y no reciben postulaciones.
- **Talleres y convocatorias**: a todo el ancho, con el formato de la portada.
- **Compartir**: copiar enlace, WhatsApp, correo, Facebook, LinkedIn y, en móviles, el menú de compartir del sistema.
- **Postulaciones**: en cada convocatoria, la casilla "Recibir postulaciones con el formulario del sitio" agrega un formulario mientras esté abierta. Al marcarla aparece el editor **Formulario de postulación**: introducción, texto de la confirmación final, información sobre datos personales y una lista de secciones y preguntas (respuesta corta o larga, número, correo, enlace, lista desplegable u opciones; obligatorias u opcionales; reordenables). «Nombre y apellido» y «Medio de contacto» van siempre. Sin configuración, cada convocatoria usa el **formulario modelo de Borde** (datos personales, presentación, obra por enlace, apoyos y confirmación), que también se puede cargar con un botón. La obra se entrega por enlace (Drive, YouTube, Dropbox): no se suben archivos. Las respuestas se ven en el panel y salen en el CSV, una columna por pregunta.
- **Contacto**: `/contacto`, formulario (nombre, correo, mensaje). El correo del equipo no aparece en el sitio. Ver abajo.
- Todavía **no se envían avisos por correo** de nuevas postulaciones: se revisan en el panel.
- **Redes sociales** (pie): las direcciones de Instagram y YouTube están en `SOCIAL_LINKS`, en `client/src/lib/site.js`.

### Formulario de contacto

Cada mensaje se guarda en la base y se ve en el panel → **Mensajes** (con aviso si no llegó por correo). Además se reenvía por correo con [Resend](https://resend.com), con "Responder" dirigido a quien escribió:

1. Crear una cuenta gratuita en Resend **con el mismo correo que va a recibir los mensajes** (sin dominio propio, el remitente de prueba `onboarding@resend.dev` solo puede enviar a ese correo).
2. *API Keys* → **Create API Key** (permiso *Sending access*).
3. En Vercel (*Settings → Environment Variables*), agregar `RESEND_API_KEY` (la clave) y `CONTACT_TO_EMAIL` (el correo del equipo), y volver a desplegar.

Sin esas variables el formulario funciona igual y los mensajes quedan solo en el panel. Con un dominio propio verificado en Resend se puede usar otro remitente con `CONTACT_FROM_EMAIL`.

## Logos al pie

En el panel → **Logos** se cargan quienes impulsan, apoyan, organizan o colaboran: nombre (también es el texto alternativo), grupo, logo (archivo o dirección) y enlace opcional. Se muestran al pie de todas las páginas, agrupados, tal como se cargan sobre una franja oscura: conviene subir la versión clara (blanca) en PNG con fondo transparente. Sin logos, la sección no aparece.

## Créditos

Íconos de compartir, guardar y redes: [Font Awesome Free](https://fontawesome.com) (licencia de íconos CC BY 4.0). Ícono de lengua de señas: vectorizado a partir de una ilustración aportada por el equipo de Borde (`client/src/components/signHand.js`).

## Accesibilidad

Ver [docs/accesibilidad.md](docs/accesibilidad.md).
