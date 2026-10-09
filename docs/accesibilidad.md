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
| 4 | Etiqueta visible y asociada (`label for`) en cada campo; pistas y errores vinculados con `aria-describedby` | El lector lee etiqueta, pista y error al enfocar el campo. Nada de placeholder como etiqueta. |
| 4 | Se marcan los campos **opcionales** "(opcional)"; los obligatorios llevan `required` | Menos ruido visual; el lector anuncia "obligatorio" por sí solo. |
| 4 | Validación al enviar (no mientras se escribe) con `noValidate`; errores de la API mostrados por campo | Los globos nativos del navegador son inconsistentes con lectores de pantalla; un único origen de validación (servidor). |
| 4 | Resumen de errores arriba del formulario, enfocado al fallar; cada error es un enlace que enfoca su campo | Patrón GOV.UK: la persona sabe cuántos errores hay y llega a cada uno directamente (WCAG 3.3.1, 3.3.3). |
| 4 | Errores con prefijo "Error:" en texto, borde más grueso y barra lateral; `aria-invalid="true"` en el campo | WCAG 1.4.1 y 3.3.1: no se depende del color. |
| 4 | `document.title` empieza con "Error:" mientras haya errores | Es lo primero que se anuncia; confirma que el envío falló. |
| 4 | Lo escrito se conserva tras un error (formulario no controlado) | Nadie tiene que volver a tipear un texto largo. |
| 4 | Botón de envío nunca `disabled` mientras envía (se evita el doble envío por código) | Un botón deshabilitado pierde el foco y el lector queda en el vacío. |
| 4 | Radios y grupos dentro de `fieldset`/`legend` ("Estado", "Imagen", "Datos de la convocatoria") | El lector anuncia la pregunta al entrar al grupo. |
| 4 | Campos de convocatoria aparecen después del selector de categoría, con una pista que lo avisa | Cambio de contexto predecible (WCAG 3.2.2): el contenido nuevo queda adelante en el orden de lectura. |
| 4 | Pista para el texto alternativo ("Contá qué se ve y por qué importa… No empieces con «imagen de»") | Ayuda a que el equipo editorial escriba buenos `alt`. |
| 4 | Confirmación de borrado con `<dialog>` nativo y `showModal()`; foco inicial en "Cancelar"; Escape cierra | Foco atrapado y fondo inerte sin ARIA extra. La opción segura es la predeterminada. |
| 4 | Tras eliminar, foco al `h1` y aviso en región viva ("Se eliminó «…»") | El botón que abrió el diálogo ya no existe: el foco no queda perdido. |
| 4 | Acciones con el título en el nombre accesible ("Editar «Orilla»", "Eliminar «Orilla»") | En la lista de botones del lector cada acción se distingue. |
| 4 | Avisos de éxito visibles **y** anunciados (región viva) | Un mensaje que aparece en pantalla no se lee solo. |
| 4 | Filtros como formulario GET con `role="search"` y nombre; "N publicaciones con estos filtros" debajo del `h1` | Cada búsqueda tiene URL; el foco va al `h1` y lo siguiente que se lee es el resultado. |
| 4 | Listado como tarjetas, no tabla | Sin scroll horizontal en móvil ni con zoom alto. |
| 4 | Login con `autocomplete="username"` / `current-password` y opción "Mostrar la contraseña" | WCAG 1.3.5 y 3.3.8 (autenticación accesible): permite gestores de contraseñas y verificar lo escrito. |

### Pendiente de verificar con lector de pantalla (Fase 5)

- Que NVDA/JAWS/VoiceOver lean el texto oculto de los botones ("Eliminar «título»") como parte del nombre.
- Lectura del resumen de errores al recibir el foco en cada lector.
- Comportamiento del `<dialog>` modal en VoiceOver iOS y TalkBack.

## Tests automáticos

- `npm test -w client`: Vitest + Testing Library + **axe-core** sobre la app renderizada (portada, listado, detalle, 404). Verifican además: primer Tab en "Saltar al contenido", landmarks, un solo `h1`, foco al `h1` tras navegar, `document.title`, menú con `aria-expanded` y Escape.
- jsdom no aplica CSS: el contraste y la visibilidad real se revisan con axe en navegador (Fase 5, Playwright).
