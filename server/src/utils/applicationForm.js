/**
 * Formulario de postulación de una convocatoria, tal como lo arma el equipo
 * en el panel. Las convocatorias anteriores (sin configuración) usan los
 * valores por defecto, que son el formulario original.
 */
export const FIELD_MODES = ['required', 'optional', 'off'];

export const DEFAULT_FIELDS = {
  workTitle: 'required',
  text: 'optional',
  link: 'optional',
  message: 'optional',
};

export function resolveApplicationForm(form) {
  const fields = { ...DEFAULT_FIELDS, ...(form?.fields ?? {}) };
  return {
    intro: form?.intro ?? '',
    fields,
    questions: form?.questions ?? [],
    // Si se piden texto y enlace, y ninguno es obligatorio, hace falta al menos uno de los dos.
    needsTextOrLink: fields.text === 'optional' && fields.link === 'optional',
  };
}
