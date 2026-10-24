/**
 * Formulario de postulación de una convocatoria: una lista de elementos
 * (secciones y preguntas) que el equipo arma en el panel.
 *
 * - "name" (Nombre y apellido) y "contact" (Medio de contacto) están siempre:
 *   se pueden mover y renombrar, no quitar.
 * - Una convocatoria sin configuración usa el formulario modelo de Borde.
 * - Las configuraciones del formato anterior ({ fields, questions }) se
 *   convierten al vuelo, así no se pierde nada de lo ya cargado.
 *
 * Copia de server/src/utils/applicationForm.js (mismos valores por defecto que la API).
 */
export const ITEM_TYPES = ['section', 'short', 'long', 'number', 'email', 'link', 'select', 'choice'];
export const CORE_KEYS = ['name', 'contact'];

export const DEFAULT_CONSENT = 'Confirmo que deseo presentar esta obra a la convocatoria y que conozco sus bases.';

export const DEPARTAMENTOS = [
  'Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno', 'Flores', 'Florida', 'Lavalleja', 'Maldonado',
  'Montevideo', 'Paysandú', 'Río Negro', 'Rivera', 'Rocha', 'Salto', 'San José', 'Soriano', 'Tacuarembó', 'Treinta y Tres',
];

const q = (key, type, label, extra = {}) => ({ key, type, label, hint: '', required: false, options: [], ...extra });

/** Formulario modelo de Borde (el que propuso el equipo). */
export const BORDE_TEMPLATE = {
  intro: 'Un formulario breve: solo pedimos la información necesaria para participar en la convocatoria.',
  consentText: DEFAULT_CONSENT,
  privacyText: '',
  items: [
    q('s-datos', 'section', 'Datos personales'),
    q('name', 'short', 'Nombre y apellido', { required: true }),
    q('seudonimo', 'short', 'Nombre artístico o seudónimo'),
    q('edad', 'number', 'Edad', { required: true }),
    q('departamento', 'select', 'Departamento de residencia', { required: true, options: DEPARTAMENTOS }),
    q('contact', 'short', 'Medio de contacto', {
      required: true,
      hint: 'Indicá un medio por el que podamos comunicarnos contigo: correo electrónico, teléfono o WhatsApp.',
    }),
    q('s-presentacion', 'section', 'Presentación personal', {
      hint: 'Contanos brevemente quién sos y qué te motiva a participar. No es necesario tener experiencia artística ni presentar un currículum.',
    }),
    q('presentacion-formato', 'choice', '¿Cómo preferís presentarte?', { options: ['Por escrito', 'Mediante un audio', 'Mediante un video'] }),
    q('presentacion', 'long', 'Tu presentación', {
      hint: 'Escribila acá. Si elegiste audio o video, pegá el enlace (por ejemplo, de Google Drive, YouTube o Dropbox).',
    }),
    q('s-obra', 'section', 'Sobre tu obra'),
    q('workTitle', 'short', 'Título de la obra', { required: true }),
    q('formato', 'choice', '¿En qué formato presentás tu obra?', { required: true, options: ['Texto escrito', 'Audio', 'Video'] }),
    q('idioma', 'choice', 'Idioma de la obra', { required: true, options: ['Español', 'Portugués', 'Lengua de Señas Uruguaya (LSU)'] }),
    q('obra', 'link', 'Enlace a tu obra', {
      required: true,
      hint: 'Subí tu obra a Google Drive, Dropbox o YouTube con permiso para verla, y pegá acá el enlace. Los formatos y la extensión se indican en las bases.',
    }),
    q('s-apoyos', 'section', 'Accesibilidad y apoyos'),
    q('apoyos', 'long', '¿Necesitás algún apoyo o ajuste para participar?', {
      hint: 'Por ejemplo, apoyo para completar el formulario, presentar tu obra o participar en las actividades. No es necesario informar diagnósticos ni datos médicos.',
    }),
    q('s-confirmacion', 'section', 'Confirmación'),
  ],
};

/** Formato anterior ({ fields, questions }) → lista de elementos. */
function fromLegacy(form) {
  const fields = { workTitle: 'required', text: 'optional', link: 'optional', message: 'optional', ...(form.fields ?? {}) };
  const std = [
    ['workTitle', 'short', 'Título de la obra'],
    ['text', 'long', 'Texto'],
    ['link', 'link', 'Enlace al texto'],
    ['message', 'long', 'Mensaje para el equipo'],
  ];
  return {
    intro: form.intro ?? '',
    consentText: DEFAULT_CONSENT,
    privacyText: '',
    items: [
      q('name', 'short', 'Nombre y apellido', { required: true }),
      q('contact', 'email', 'Correo electrónico', { required: true }),
      ...std.filter(([k]) => fields[k] !== 'off').map(([k, type, label]) => q(k, type, label, { required: fields[k] === 'required' })),
      ...(form.questions ?? []).map((x) => q(x.key, x.type === 'long' ? 'long' : 'short', x.label, { hint: x.hint ?? '', required: Boolean(x.required) })),
    ],
  };
}

/** El formulario efectivo de una convocatoria, siempre con "name" y "contact". */
export function resolveApplicationForm(form) {
  let resolved;
  if (!form || (!form.items?.length && !form.fields && !form.questions?.length)) resolved = BORDE_TEMPLATE;
  else if (!form.items?.length) resolved = fromLegacy(form);
  else resolved = { intro: form.intro ?? '', consentText: form.consentText || DEFAULT_CONSENT, privacyText: form.privacyText ?? '', items: form.items };

  const items = resolved.items.map((i) => ({ hint: '', options: [], required: false, ...i }));
  // Por si una configuración vieja o incompleta no los tiene.
  if (!items.some((i) => i.key === 'name')) items.unshift(q('name', 'short', 'Nombre y apellido', { required: true }));
  if (!items.some((i) => i.key === 'contact')) items.splice(1, 0, q('contact', 'short', 'Medio de contacto', { required: true }));
  for (const i of items) if (CORE_KEYS.includes(i.key)) i.required = true;
  return { ...resolved, items };
}

/** Solo las preguntas (sin las secciones). */
export const questionsOf = (form) => form.items.filter((i) => i.type !== 'section');
