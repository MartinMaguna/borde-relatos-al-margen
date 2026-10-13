# Accesibilidad — Borde Relatos al margen

Objetivo: **WCAG 2.2 nivel AA**, con prioridad en personas ciegas que usan lector de pantalla.

Contenido:

1. [Cómo verificar](#cómo-verificar): tests automáticos y checklist manual con lectores de pantalla.
2. [Decisiones registradas](#decisiones-registradas): qué se hizo y por qué, fase por fase.

---

## Cómo verificar

### 1. Tests automáticos

| Comando | Qué cubre |
| ------- | --------- |
| `npm run lint` | `eslint-plugin-jsx-a11y` en modo estricto: etiquetas, roles, `alt`, eventos de teclado. |
| `npm test -w client` | Vitest + Testing Library + axe-core (jsdom): estructura, foco, ARIA, formularios, diálogo. |
| `npm run test:e2e -w client` | Playwright + axe en **Chromium real**, en escritorio claro, escritorio oscuro y móvil: WCAG 2.2 A/AA **con contraste**, foco visible, menú móvil, reflow a 320 px, espaciado de texto, movimiento reducido, alto contraste forzado, diálogo modal, flujo de errores del panel. |

Los tests automáticos detectan entre un 30 y un 50 % de los problemas. **El resto requiere probar con personas y lectores de pantalla reales**: la checklist de abajo.

### 2. Preparar el entorno de prueba manual

```bash
npm run dev:memory -w server   # API con datos de ejemplo, sin Atlas
npm run dev -w client          # en otra terminal → http://localhost:5173
```

El editor de prueba de la base en memoria se muestra en la consola al arrancar (contraseña en `server/scripts/dev-memory.js`).

Combinaciones recomendadas (cubren la gran mayoría de usuarios):

| Lector | Sistema | Navegador |
| ------ | ------- | --------- |
| **NVDA** (gratuito) | Windows | Firefox y Chrome |
| **JAWS** | Windows | Chrome |
| **VoiceOver** | macOS | Safari |
| **VoiceOver** | iOS | Safari |
| **TalkBack** | Android | Chrome |

### 3. Atajos mínimos

| Acción | NVDA / JAWS | VoiceOver macOS (VO = Ctrl+Opción) | VoiceOver iOS / TalkBack |
| ------ | ----------- | ------------------------------------ | ------------------------ |
| Lista de encabezados | NVDA+F7 / Insert+F6 | VO+U → Encabezados | Rotor / menú de lectura → Encabezados |
| Siguiente encabezado | H (nivel: 1–6) | VO+Cmd+H | Rotor en "Encabezados" + deslizar abajo |
| Puntos de referencia | D / R (o ; en JAWS) | VO+U → Puntos de referencia | Rotor → Puntos de referencia |
| Lista de enlaces | NVDA+F7 / Insert+F7 | VO+U → Enlaces | Rotor → Enlaces |
| Siguiente campo de formulario | F | VO+Cmd+J | Rotor → Controles de formulario |
| Leer todo | NVDA+↓ / Insert+↓ | VO+A | Dos dedos deslizar abajo / Leer desde aquí |

### 4. Checklist manual

Marcá cada punto con el lector y navegador usados. Si algo falla, anotá qué se anunció y qué se esperaba.

#### A. Estructura y orientación (sitio público)

- [ ] Al cargar `/`, el lector anuncia el título "Borde Relatos al margen" y el idioma de voz es español.
- [ ] El primer Tab enfoca "Saltar al contenido", visible en pantalla. Al activarlo, la lectura sigue en el contenido principal (no en el menú).
- [ ] La lista de puntos de referencia muestra: banner, navegación "Principal", principal (main) e información de contenido (footer). En el detalle también "Ruta de navegación"; en listados largos, "Paginación".
- [ ] La lista de encabezados de la portada es: un nivel 1 (nombre del sitio), cuatro nivel 2 (Poesía, Cuentos, Talleres, Convocatorias) y nivel 3 para cada publicación. Sin saltos de nivel.
- [ ] Las secciones de la portada aparecen como regiones con nombre ("Poesía", "Cuentos"…).
- [ ] En la lista de enlaces no hay textos repetidos sin contexto ("Leer más", "Ver todo"): cada uno se entiende solo.

#### B. Navegación entre páginas

- [ ] Al elegir "Cuentos" en el menú, se anuncia "Cuentos, encabezado nivel 1" (el foco va al título) y el título de la pestaña cambia a "Cuentos · Borde Relatos al margen".
- [ ] La lectura continúa desde el título hacia abajo, no desde el principio de la página ni desde el menú.
- [ ] En el menú, la página actual se anuncia como "actual" / "página actual".
- [ ] Con conexión lenta (DevTools → Network → Slow 3G) se anuncia "Cargando…" una sola vez.
- [ ] Al volver atrás con el navegador, la página anterior se muestra y el foco va a su título.

#### C. Menú en móvil (VoiceOver iOS, TalkBack, o navegador con ventana angosta)

- [ ] El botón se anuncia "Menú, botón, contraído".
- [ ] Al activarlo se anuncia "expandido" y el siguiente elemento son los enlaces del menú.
- [ ] Con teclado, Escape cierra el menú y el foco vuelve al botón.
- [ ] Con el menú cerrado, sus enlaces no se pueden alcanzar ni con Tab ni deslizando.

#### D. Listados y paginación

- [ ] Al entrar en una lista se anuncia la cantidad de elementos ("lista, 2 elementos").
- [ ] Cada publicación se lee: título (encabezado y enlace), autor/a y fecha completa ("7 de octubre de 2026"), resumen.
- [ ] En convocatorias se anuncia "Estado de la convocatoria: Abierta" (o "Cerrada") y la fecha límite.
- [ ] En una tarjeta con audio, el botón se anuncia "Escuchar «título», botón"; al activarlo suena y pasa a "Pausar «título»". Al tocar otro, el primero se detiene.
- [ ] En una tarjeta con video en señas, el enlace se anuncia "Lengua de señas «título», enlace"; al activarlo se llega a la publicación con el foco en "Versión en lengua de señas".
- [ ] En el detalle, el reproductor de audio se anuncia con su nombre ("Escuchar: Lectura de la autora") y se maneja con teclado; el video se anuncia por su título y se puede reproducir y poner en pantalla completa con teclado.
- [ ] En la paginación, los números se anuncian "Página 2, enlace" y la actual como "actual". "Anterior: página 1" / "Siguiente: página 3" son claros.
- [ ] En la página 2 el título de la pestaña dice "(página 2 de N)".

#### E. Lectura de un texto

- [ ] En un poema, cada verso se lee como línea separada y las estrofas como párrafos distintos.
- [ ] La ruta de navegación se lee "Inicio, Poesía, Orilla (actual)", sin leer las barras "/".
- [ ] Si hay imagen, se lee su texto alternativo y tiene sentido sin verla.
- [ ] En una convocatoria, "Datos de la convocatoria" se lee como lista de definiciones (Estado, Fecha límite, Bases) y el enlace a las bases avisa "(sitio externo)".
- [ ] Los subtítulos dentro del texto aparecen en la lista de encabezados con nivel 2 o mayor (nunca un segundo nivel 1).

#### F. Login del panel

- [ ] Cada campo anuncia su etiqueta: "Correo electrónico, edición, obligatorio" y "Contraseña, protegido, obligatorio".
- [ ] El gestor de contraseñas del navegador ofrece autocompletar.
- [ ] "Mostrar la contraseña" es una casilla que se anuncia marcada/no marcada y cambia el campo.
- [ ] Con datos incorrectos, se anuncia el resumen ("Hay un problema…") y el título de la pestaña empieza con "Error:".
- [ ] Al volver al campo de correo se anuncia "inválido" y el mensaje "Error: El correo o la contraseña no son correctos".
- [ ] Con datos correctos, se llega al listado y se anuncia "Publicaciones, encabezado nivel 1".

#### G. Listado del panel

- [ ] El formulario de filtros aparece como punto de referencia "búsqueda" llamado "Filtrar publicaciones".
- [ ] Tras aplicar filtros, el foco va a "Publicaciones" y lo siguiente que se lee es la cantidad ("1 publicación con estos filtros").
- [ ] En la lista de botones/enlaces, cada acción incluye el título: "Editar «Orilla»", "Eliminar «Orilla»", "Ver en el sitio «Orilla»". *(Pendiente desde la Fase 4: confirmarlo en cada lector.)*
- [ ] El estado ("Publicado" / "Borrador") se lee como texto.

#### H. Eliminar (diálogo)

- [ ] Al pulsar "Eliminar «…»" se anuncia "¿Eliminar esta publicación?, diálogo" seguido de la descripción, y el foco está en "Cancelar".
- [ ] No se puede salir del diálogo con Tab ni con el cursor virtual / deslizando (el fondo está inerte). *(Verificar especialmente en VoiceOver iOS y TalkBack.)*
- [ ] Escape (o el gesto de "atrás"/escape de dos dedos en VoiceOver iOS) cierra el diálogo y el foco vuelve al botón "Eliminar".
- [ ] Al confirmar, se anuncia "Se eliminó «…»" y el foco queda en "Publicaciones".

#### I. Formulario de publicación

- [ ] Cada campo anuncia etiqueta y pista: p. ej. "Resumen, opcional, Hasta 500 caracteres…".
- [ ] Los obligatorios se anuncian como "obligatorio"; los opcionales dicen "(opcional)" en la etiqueta.
- [ ] Al final se encuentran los botones "Guardar borrador" y "Publicar" (o "Guardar cambios" y "Pasar a borrador" en una publicada), y en la edición se lee el "Estado actual".
- [ ] Pulsar Enter en un campo de texto guarda como borrador (no publica).
- [ ] "Subir una imagen" se anuncia como botón/selector de archivo con su pista; en móvil ofrece cámara o galería.
- [ ] Al elegir una foto se anuncia "Subiendo la imagen…" y después "Imagen subida. Acordate de escribir el texto alternativo.", sin que el foco salte.
- [ ] Un archivo que no es imagen muestra "Error: …" junto al selector, y se lee al volver a él.
- [ ] "Quitar la imagen" se anuncia "Se quitó la imagen." y el foco queda en el selector de archivo.
- [ ] Al elegir "Convocatorias", los campos de fecha límite y bases aparecen **después** del selector y se pueden alcanzar avanzando.
- [ ] El selector de fecha (`input type="date"`) se puede usar solo con teclado / gestos.
- [ ] Enviar vacío: se anuncia el resumen ("Hay N problemas"), cada error es un enlace y al activarlo el foco va al campo, que anuncia "inválido" y el mensaje "Error: …".
- [ ] Lo ya escrito sigue en los campos después del error.
- [ ] Al guardar bien, se llega al listado y se anuncia "Se creó «…»".
- [ ] En "Página Acerca", al guardar se anuncia "Se guardaron los cambios de la página Acerca." sin mover el foco.

#### J. Visión baja, zoom y preferencias (sin lector)

- [ ] Zoom del navegador al 200 % y al 400 %: todo se lee sin scroll horizontal, nada se superpone ni se corta.
- [ ] Tamaño de letra del sistema/navegador en "muy grande": el texto crece en todo el sitio.
- [ ] Solo con teclado: el foco siempre se ve (contorno azul grueso) y nunca queda oculto detrás de otro elemento.
- [ ] Tema oscuro del sistema: el sitio cambia y todo se lee bien.
- [ ] Alto contraste de Windows: enlaces, botones, bordes de campos y foco siguen siendo visibles.
- [ ] "Reducir movimiento" activado: no hay animaciones.
- [ ] Se puede usar con lupa (ZoomText, Lupa de Windows): los mensajes de error y avisos aparecen cerca de donde se está trabajando.

### 5. Registro de pruebas manuales

| Fecha | Persona | Lector + navegador | Secciones | Resultado / problemas |
| ----- | ------- | ------------------ | --------- | --------------------- |
| | | | | |

---

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
| 9 | **Design system "Borde"** aplicado ([referencia](https://claude.ai/artifact/16SMTbxRSUEukMddJrCsFg)): tokens con contraste verificado en claro y oscuro (ink ≥13.9:1, ink-muted ≥7:1, link ≥6.7:1, focus ≥6.4:1, line ≥3.3:1) | Los valores de la etapa 3 se reemplazan por los del design system; mismas exigencias. |
| 9 | `coral` y `orange` solo en formas y degradados; texto sobre rellenos de marca en `on-brand` (≥6.3:1 en ambos temas) | Esos tonos no alcanzan 4.5:1 como texto en el tema claro. |
| 9 | Degradados solo en formas sin texto (portada, cuarto de disco de las tarjetas, barra de carga) | El texto nunca queda sobre un fondo de contraste variable. |
| 9 | Tipografías **Atkinson Hyperlegible Next** (texto) y **Archivo** (títulos), alojadas en el propio sitio | Atkinson está diseñada para baja visión (no confunde I l 1, O 0). Alojarlas evita pedidos a Google (privacidad) y fallas si el servicio externo no responde. |
| 11 | Guardar: botón cuyo texto dice la acción ("Guardar" / "Quitar de guardados") y aviso en región viva | Un cambio de estado claro sin depender del ícono. |
| 11 | Compartir como "disclosure" (`aria-expanded`/`aria-controls`) con enlaces y botones comunes, no un menú ARIA; Escape cierra y devuelve el foco; enlaces externos avisan "(se abre en otra pestaña)" | Se recorre con Tab como el resto de la página; el patrón de menú ARIA exige teclas especiales que muchas personas no conocen. |
| 11 | "Comentar" lleva el foco al título de la sección de comentarios | La persona llega donde quería sin buscarlo. |
| 11 | Formularios de comentario y postulación con el mismo patrón de errores (resumen enfocable, errores por campo); al enviar, la confirmación recibe el foco | Coherencia con el panel; el resultado del envío se lee de inmediato. |
| 11 | Consentimiento como casilla con su error vinculado; los errores se muestran todos juntos | WCAG 3.3.1 / 3.3.3; nada aparece recién en un segundo intento. |
| 11 | Campo trampa antispam fuera de la vista, con `aria-hidden` y `tabindex="-1"` | No interfiere con teclado ni lector, a diferencia de un CAPTCHA. |
| 11 | Texto de comentarios y postulaciones como texto plano (sin HTML) | Seguridad (sin inyección de código) y lectura consistente. |
| 12 | Contacto por formulario (mismo patrón de errores y confirmación enfocada que comentarios y postulaciones) | No depende de tener un programa de correo configurado y no expone el correo del equipo. |
| 11 | Ícono de lengua de señas: símbolo internacional (dos manos), siempre con el texto "Lengua de señas" | Reconocible para la comunidad sorda; el texto evita ambigüedad. |
| 10 | Editor de texto: `<textarea>` nativo con barra de formato (`role="toolbar"`, un solo punto de tabulación, flechas), no un editor visual (contenteditable) | Los editores enriquecidos son muy difíciles de usar con lector de pantalla; el textarea funciona con todos los lectores, el corrector y el dictado. |
| 10 | Botones de formato con texto visible y nombre accesible que lo contiene ("Título" → "Título de sección"); atajos Control+B/I/K con `aria-keyshortcuts` | WCAG 2.5.3 (etiqueta en el nombre) y 2.1.1 (teclado). |
| 10 | Tras cada acción, foco de vuelta al texto con la selección lista y aviso en la región viva ("Negrita aplicada" / "quitada"); se puede deshacer con Control+Z | La persona sabe qué pasó sin buscarlo y puede revertirlo. |
| 10 | Vista previa generada por el servidor, con las mismas reglas que al publicar, en una región con nombre y botón con `aria-expanded` | Lo que se revisa es lo que se publica. |
| 10 | Imagen en las tarjetas con `alt=""` y `loading="lazy"` | En un listado la foto es decorativa: describir cada una antes de cada título vuelve lenta la navegación. Su descripción completa está en la publicación. |
| 12 | Logos al pie dentro del `<footer>` (contentinfo), en una región con título y una lista por grupo nombrada por su subtítulo; el texto alternativo de cada logo es el nombre (y el nombre del enlace, si lo tiene) | Todo el contenido queda en landmarks; el lector anuncia "Impulsan, lista, 2 elementos". |
| 12 | Logos tal como se cargan sobre una franja oscura fija (en los dos temas), con título de región solo para lectores de pantalla | Estilo de créditos de afiche pedido por el equipo; el título oculto mantiene la región con nombre. Los textos y el foco de la franja usan los tokens del tema oscuro (contraste AA). |
| 12 | Poesía y cuentos en una columna centrada de ~65 caracteres | Línea cómoda para la lectura prolongada. |
| 13 | Se quitan los comentarios; "Mis guardados" pasa a las acciones de cada publicación | El pie ya no tiene enlaces: Guardados sigue teniendo un acceso visible. |
| 13 | Redes sociales como íconos con nombre accesible ("Borde en Instagram") en una lista nombrada, con objetivo táctil de 44px | Un ícono solo no tiene texto: el nombre lo da `aria-label`. WCAG 2.5.8. |
| 13 | En la publicación, la imagen va antes del título | Pedido del equipo; la imagen conserva su texto alternativo y el foco sigue yendo al h1 al navegar. |
| 14 | Capítulos: índice en un `<nav>` con nombre y cada capítulo como sección con h2 ("Capítulo 2 El regreso") que recibe el foco desde el índice | Se recorren con la lista de encabezados y con los enlaces del índice. |
| 14 | Editor de capítulos: cada uno en un `<fieldset>` numerado; Subir/Bajar/Quitar dicen a qué capítulo afectan; el foco sigue al capítulo movido y el cambio se anuncia | El orden se puede cambiar solo con teclado y sin perder la ubicación. |
| 14 | Estado "Próximamente" con texto y borde punteado, además del color | WCAG 1.4.1. |
| 14 | Botones Guardar/Compartir/Mis guardados de 32px de alto | Más discretos y por encima del mínimo de 24px (WCAG 2.5.8). |
| 14 | "|" del pie oculto al lector (`aria-hidden`) | Se lee "Borde Relatos al margen", sin "barra vertical". |
| 9 | Composición geométrica de la portada con `aria-hidden` y fuera del área de texto; el `h1` conserva el nombre "Borde Relatos al margen" | La decoración no interfiere con la lectura ni con el lector de pantalla. |
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
| 7 | Subida de imágenes con `<input type="file">` nativo y etiqueta visible | Funciona con teclado, lectores de pantalla y en móvil (cámara o galería) sin componentes a medida. |
| 7 | Progreso y resultado de la subida anunciados en la región viva ("Subiendo la imagen…", "Imagen subida. Acordate de escribir el texto alternativo."), sin mover el foco | El cambio se comunica sin sorprender (WCAG 3.2.2, 4.1.3) y recuerda el paso siguiente. |
| 7 | Vista previa con `alt=""` | Es una copia decorativa de lo que se está editando; la descripción real es el campo "Texto alternativo". |
| 7 | "Quitar la imagen" devuelve el foco al selector de archivo | El botón desaparece al usarlo: el foco no queda perdido. |
| 8 | Botón "Escuchar «título»" / "Pausar «título»" en las tarjetas con audio: `<button>` nativo cuyo texto cambia (sin `aria-pressed`, para no anunciar dos estados), con el título en el nombre accesible | Cada botón se distingue en la lista de controles; el `<audio>` sin controles queda fuera del árbol de accesibilidad. Suena un solo audio a la vez. |
| 8 | Si el audio no se puede reproducir: texto visible y aviso en la región viva | Un fallo silencioso es invisible para quien no ve la pantalla. |
| 8 | En el detalle, `<audio controls>` nativo con nombre (`aria-labelledby` al título "Escuchar: …") y enlace para abrir o descargar | Los controles nativos son accesibles con teclado y lector en todos los navegadores; el enlace sirve si el reproductor falla. |
| 8 | El audio es una lectura del texto publicado: la transcripción es el propio texto, en la misma página | WCAG 1.2.1 (alternativa para audio grabado). Si se agrega un audio con contenido distinto al texto, hay que publicar su transcripción. |
| 8 | Enlace "Lengua de señas" con ícono **y texto visible**, que lleva a `#lengua-de-senas` en el detalle; al llegar, el foco va a esa sección | Un ícono solo es ambiguo; el foco en la sección evita tener que buscar el video. |
| 8 | Video insertado con `title` descriptivo ("Versión en lengua de señas de «…» (video de YouTube)"), 16:9 adaptable, `loading="lazy"`, desde `youtube-nocookie.com`, más enlace "Ver en YouTube" | El lector anuncia de qué es el iframe; no desborda en móvil; privacidad por defecto. WCAG 1.2.6 (lengua de señas, AAA) como mejora sobre el mínimo AA. |
| 7 | Estado con botones de acción: "Guardar borrador" / "Publicar" (o "Guardar cambios" / "Pasar a borrador" si ya está publicada), con el estado actual escrito arriba | Más claro que un grupo de radios al final: la acción dice qué pasa. Con Enter se usa el primer botón, que nunca cambia la visibilidad en el sitio. |
| 4 | Confirmación de borrado con `<dialog>` nativo y `showModal()`; foco inicial en "Cancelar"; Escape cierra | Foco atrapado y fondo inerte sin ARIA extra. La opción segura es la predeterminada. |
| 4 | Tras eliminar, foco al `h1` y aviso en región viva ("Se eliminó «…»") | El botón que abrió el diálogo ya no existe: el foco no queda perdido. |
| 4 | Acciones con el título en el nombre accesible ("Editar «Orilla»", "Eliminar «Orilla»") | En la lista de botones del lector cada acción se distingue. |
| 4 | Avisos de éxito visibles **y** anunciados (región viva) | Un mensaje que aparece en pantalla no se lee solo. |
| 4 | Filtros como formulario GET con `role="search"` y nombre; "N publicaciones con estos filtros" debajo del `h1` | Cada búsqueda tiene URL; el foco va al `h1` y lo siguiente que se lee es el resultado. |
| 4 | Listado como tarjetas, no tabla | Sin scroll horizontal en móvil ni con zoom alto. |
| 4 | Login con `autocomplete="username"` / `current-password` y opción "Mostrar la contraseña" | WCAG 1.3.5 y 3.3.8 (autenticación accesible): permite gestores de contraseñas y verificar lo escrito. |
| 5 | **Corrección:** en carga inicial el foco saltaba al `h1` en desarrollo (StrictMode ejecuta los efectos dos veces), y el primer Tab no llegaba a "Saltar al contenido". Ahora se compara la clave de la ubicación inicial | Detectado por Playwright. Los tests de Vitest ahora renderizan con StrictMode para atrapar este tipo de error. |
| 5 | **Corrección:** `aria-required="true"` en lugar de `required` nativo | Con `noValidate`, el `required` nativo no aporta nada y JAWS + Chrome puede anunciar "entrada no válida" en campos vacíos antes de escribir. |
| 5 | **Corrección:** el contenido del resumen de errores va dentro de `role="alert"` (además de recibir el foco) | Patrón actual de GOV.UK: algunos lectores no leen el contenido de un contenedor genérico al enfocarlo. |
| 5 | **Corrección:** los botones del diálogo y "Cerrar sesión" ya no se deshabilitan mientras procesan | Un botón deshabilitado pierde el foco; se ignoran los clics repetidos por código. |
| 5 | **Corrección:** el "…" de la paginación se oculta con su `<li>` completo | Un elemento de lista vacío se anunciaba sin contenido. |
| 5 | **Corrección:** si la sesión vence mientras se edita, el error indica cómo reingresar sin perder lo escrito | WCAG 2.2.1 / 2.2.5: la sesión dura 8 h; vencida, nada se pierde y se puede volver a guardar. |
| 5 | Tests e2e con Playwright + axe en Chromium real, contra el **build de producción**, en claro, oscuro y móvil | Lo que jsdom no ve: contraste real, visibilidad con CSS, diálogo modal nativo, reflow, espaciado de texto, preferencias del sistema. |

### Verificado en navegador real (Fase 5)

- Chrome incluye el texto oculto visualmente en el nombre accesible: Playwright encuentra `button "Eliminar «título»"` por rol y nombre.
- El `<dialog>` con `showModal()` deja inerte el fondo: con Tab el foco solo recorre el diálogo o sale a la interfaz del navegador.

### Pendiente de verificar con lectores de pantalla

Ver la [checklist manual](#4-checklist-manual), en especial las secciones G (nombres de las acciones), H (diálogo en VoiceOver iOS y TalkBack) e I (resumen de errores en cada lector).
