# Accesibilidad — Borde. Relatos al Margen

Objetivo: **WCAG 2.2 nivel AA**, con prioridad en personas ciegas que usan lector de pantalla.

> Documento en construcción. La checklist manual completa (NVDA, JAWS, VoiceOver, TalkBack)
> se redacta en la **Fase 5**. Acá se registran desde ya las decisiones tomadas.

## Decisiones registradas

| Fase | Decisión | Motivo |
| ---- | -------- | ------ |
| 1 | `<html lang="es">` | Los lectores de pantalla eligen voz y reglas de pronunciación según el idioma. |
| 1 | Viewport sin `maximum-scale` ni `user-scalable=no` | El zoom nunca se bloquea (WCAG 1.4.4). |
| 1 | `<meta name="color-scheme" content="light dark">` | Base para respetar `prefers-color-scheme`. |
| 1 | `eslint-plugin-jsx-a11y` en modo **strict** | Los problemas de accesibilidad detectables estáticamente son errores, no advertencias. |
| 1 | Mensajes de estado con `role="status"` | Región viva nativa (`aria-live="polite"`), sin ARIA extra. |
| 2 | Encabezados del Markdown bajan un nivel (`#` → `h2`) | El único `h1` de cada vista es el título; la jerarquía queda correcta aunque el editor use `#`. |
| 2 | Sin imágenes dentro del cuerpo; imagen principal con `alt` obligatorio (API rechaza `alt` vacío) | No se puede garantizar texto alternativo en imágenes embebidas en Markdown. |
| 2 | Errores de validación de la API como `[{ field, message }]` en español | El formulario del panel puede vincular cada error a su campo con `aria-describedby`. |
| 3 | "Saltar al contenido" es el primer enfocable; destino `<main id="contenido" tabindex="-1">` | WCAG 2.4.1. Al activarlo, el foco entra al contenido y el siguiente Tab sigue desde ahí. |
| 3 | Landmarks: `header`, `nav aria-label="Principal"`, `main`, `footer`; además `nav` "Ruta de navegación" y "Paginación" | Cada punto de referencia tiene nombre propio; se navega con la tecla D (NVDA) / rotor (VoiceOver). |
| 3 | Al cambiar de ruta, foco al `h1` (con `tabindex="-1"`) y `document.title` actualizado | En una SPA el navegador no anuncia el cambio de página; así el lector lee el título nuevo. No se hace en la carga inicial. |
| 3 | Datos cargados con *loaders* antes de mostrar la vista | El foco nunca cae en una pantalla a medio cargar. Si tarda más de 500 ms, se anuncia "Cargando…" en la región viva. |
| 3 | Menú móvil: `<button aria-expanded aria-controls>` + lista con `hidden`; Escape cierra y devuelve el foco | Elementos nativos; cerrado, el menú sale del orden de tabulación. Sin trampa de foco. |
| 3 | `aria-current="page"` en menú, paginación y ruta de navegación | Indica la ubicación actual; a la vista se marca además con subrayado grueso y negrita (no solo color). |
| 3 | Títulos de publicaciones como único enlace de cada tarjeta; textos de enlace únicos ("Ver toda la poesía", "Ver todos los cuentos") | Las listas de enlaces del lector no muestran "Leer más" repetidos sin contexto. |
| 3 | Estado de convocatoria en texto ("Abierta"/"Cerrada") + borde continuo/punteado | WCAG 1.4.1: no se depende solo del color. |
| 3 | Fechas completas ("9 de octubre de 2026") en `<time datetime>` | Sin abreviaturas, se leen bien en voz. |
| 3 | Paginación con enlaces reales (`?pagina=2`); "Página 2" como nombre accesible; Anterior/Siguiente omitidos cuando no aplican | Cada página es enlazable; no hay controles deshabilitados confusos. |
| 3 | Tipografía en rem, sin `font-size` en px en `html`; lectura serif 1.19–1.25rem, interlineado 1.75–1.9, ancho ~65 caracteres | Respeta el tamaño de letra elegido; lectura prolongada cómoda; zoom 200 % sin scroll horizontal (verificado a 375 px). |
| 3 | Contraste verificado: texto ≥ 14:1, secundario ≥ 7:1, acento ≥ 7:1, foco y bordes ≥ 3:1, en modo claro y oscuro | WCAG 1.4.3 / 1.4.11. axe en navegador real: 0 violaciones en ambos esquemas. |
| 3 | `prefers-color-scheme`, `prefers-reduced-motion` y `forced-colors` | Tema oscuro automático; sin animaciones si se piden reducidas; foco con colores del sistema en alto contraste de Windows. |
| 3 | Objetivos táctiles ≥ 2.75rem (44 px) en menú y paginación | WCAG 2.5.8. |

## Tests automáticos

- `npm test -w client`: Vitest + Testing Library + **axe-core** sobre la app renderizada (portada, listado, detalle, 404). Verifican además: primer Tab en "Saltar al contenido", landmarks, un solo `h1`, foco al `h1` tras navegar, `document.title`, menú con `aria-expanded` y Escape.
- jsdom no aplica CSS: el contraste y la visibilidad real se revisan con axe en navegador (Fase 5, Playwright).
