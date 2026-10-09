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
│   ├── index.html        # lang="es", viewport sin bloqueo de zoom
│   ├── vite.config.js    # proxy /api → server en desarrollo
│   └── eslint.config.js  # incluye jsx-a11y (strict)
├── server/               # API REST
│   └── src/
│       ├── config/       # env.js (validación con Zod), db.js (Atlas)
│       ├── middleware/   # errores centralizados
│       ├── routes/       # /api/health (más rutas en Fase 2)
│       ├── app.js        # crea la app (testeable sin levantar el puerto)
│       └── index.js      # conecta a Atlas y levanta el servidor
├── docs/
│   └── accesibilidad.md  # decisiones y checklist manual
└── package.json          # npm workspaces + scripts globales
```

## Requisitos

- Node.js **22 LTS** o superior (ver `.nvmrc`; mínimo 20.19 por Vite).
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

4. **Levantar todo**

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
| `npm run lint` | ESLint en server y cliente (incluye jsx-a11y) |
| `npm test` | Tests (se agregan en Fases 2 y 5) |

## Convenciones de la API

Todas las respuestas tienen la misma forma:

```json
{ "ok": true,  "data": { }, "meta": { } }
{ "ok": false, "error": { "message": "…", "code": "NOT_FOUND", "details": [] } }
```

Los errores se manejan en un único middleware (`server/src/middleware/errors.js`); los 500 nunca exponen detalles internos.

## Por qué un rewrite de `/api` en Vercel

El navegador siempre habla con **un solo origen** (`/api/...`): en local lo resuelve el proxy de Vite y en producción un rewrite de Vercel hacia Railway. Así la cookie httpOnly del JWT es *first-party*, funciona con `SameSite=Lax` y no depende de CORS ni de cookies de terceros (que Safari y otros navegadores bloquean).

## Deploy

Guía paso a paso para Railway y Vercel: se completa en la **Fase 6**.

## Accesibilidad

Ver [docs/accesibilidad.md](docs/accesibilidad.md).
