/**
 * Formulario de postulación: mismos valores por defecto que la API
 * (server/src/utils/applicationForm.js). Sin configuración, es el formulario original.
 */
export const DEFAULT_FIELDS = { workTitle: 'required', text: 'optional', link: 'optional', message: 'optional' };

export const FIELD_MODE_OPTIONS = [
  { value: 'required', label: 'Pedirlo, obligatorio' },
  { value: 'optional', label: 'Pedirlo, opcional' },
  { value: 'off', label: 'No pedirlo' },
];

/** Campos estándar que el equipo puede pedir o no (nombre, correo y consentimiento van siempre). */
export const STANDARD_FIELDS = [
  { key: 'workTitle', label: 'Título de la obra' },
  { key: 'text', label: 'Texto (pegado en el formulario)' },
  { key: 'link', label: 'Enlace al texto' },
  { key: 'message', label: 'Mensaje para el equipo' },
];

export function resolveApplicationForm(form) {
  const fields = { ...DEFAULT_FIELDS, ...(form?.fields ?? {}) };
  return {
    intro: form?.intro ?? '',
    fields,
    questions: form?.questions ?? [],
    needsTextOrLink: fields.text === 'optional' && fields.link === 'optional',
  };
}
