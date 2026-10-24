import { useEffect, useRef, useState } from 'react';
import { useAnnounce } from '../../a11y/Announcer.jsx';
import { Fieldset, SelectField, TextArea, TextField, fieldId } from './fields.jsx';
import { FIELD_MODE_OPTIONS, STANDARD_FIELDS, resolveApplicationForm } from '../../lib/applicationForm.js';

let counter = 0;
/** Identificador estable de una pregunta (las respuestas se guardan con él). */
const newKey = () => `p${Date.now().toString(36)}${(counter++).toString(36)}`;

const TYPE_OPTIONS = [
  { value: 'short', label: 'Respuesta corta (una línea)' },
  { value: 'long', label: 'Respuesta larga (varios renglones)' },
];

const name = (i, prop) => `applicationForm.questions.${i}.${prop}`;

/**
 * Editor del formulario de postulación de una convocatoria:
 * - Texto de introducción (aparece arriba del formulario).
 * - Qué campos estándar se piden y si son obligatorios.
 * - Preguntas propias (corta o larga, obligatoria u opcional), que se pueden
 *   agregar, quitar y reordenar.
 * Nombre, correo y consentimiento se piden siempre.
 *
 * Como el resto del formulario, los campos no son controlados: cada pregunta
 * tiene una clave estable, así al reordenar se mueve con lo que tiene escrito.
 */
export default function ApplicationFormEditor({ initial, errors = {} }) {
  const announce = useAnnounce();
  const resolved = resolveApplicationForm(initial);
  const [questions, setQuestions] = useState(() => resolved.questions.map((q) => ({ ...q })));
  const addRef = useRef(null);
  const pendingFocus = useRef(null);

  useEffect(() => {
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    if (!pending) return;
    if (pending === 'add') return addRef.current?.focus();
    const i = questions.findIndex((q) => q.key === pending.key);
    if (i < 0) return;
    const target = pending.target === 'label' ? fieldId(name(i, 'label')) : `${pending.key}-${pending.target}`;
    (document.getElementById(target) ?? document.getElementById(fieldId(name(i, 'label'))))?.focus();
  }, [questions]);

  /** Lo escrito en el DOM, para no perderlo al volver a dibujar. */
  function current() {
    const value = (i, prop) => document.getElementById(fieldId(name(i, prop)));
    return questions.map((q, i) => ({
      ...q,
      label: value(i, 'label')?.value ?? q.label,
      hint: value(i, 'hint')?.value ?? q.hint,
      type: value(i, 'type')?.value ?? q.type,
      required: value(i, 'required')?.checked ?? q.required,
    }));
  }

  function add() {
    const q = { key: newKey(), label: '', hint: '', type: 'short', required: false };
    pendingFocus.current = { key: q.key, target: 'label' };
    setQuestions([...current(), q]);
    announce(`Se agregó la pregunta ${questions.length + 1}.`);
  }

  function remove(i) {
    const list = current();
    list.splice(i, 1);
    pendingFocus.current = list.length ? { key: list[Math.max(0, i - 1)].key, target: 'label' } : 'add';
    setQuestions(list);
    announce(`Se quitó la pregunta ${i + 1}.`);
  }

  function move(i, delta) {
    const list = current();
    const [q] = list.splice(i, 1);
    list.splice(i + delta, 0, q);
    pendingFocus.current = { key: q.key, target: delta < 0 ? 'subir' : 'bajar' };
    setQuestions(list);
    announce(`La pregunta pasó al lugar ${i + delta + 1}.`);
  }

  return (
    <Fieldset legend="Formulario de postulación" hint="Así lo ven quienes se postulan. Nombre, correo electrónico y el consentimiento se piden siempre.">
      <TextArea
        name="applicationForm.intro"
        label="Introducción"
        optional
        rows={3}
        maxLength={2000}
        hint="Aparece arriba del formulario. Por ejemplo, qué enviar y cómo. Si la dejás vacía, se muestra un texto general."
        defaultValue={resolved.intro}
        error={errors['applicationForm.intro']}
      />

      {STANDARD_FIELDS.map((f) => (
        <SelectField
          key={f.key}
          name={`applicationForm.fields.${f.key}`}
          label={f.label}
          options={FIELD_MODE_OPTIONS}
          defaultValue={resolved.fields[f.key]}
          error={errors[`applicationForm.fields.${f.key}`]}
        />
      ))}
      <p className="field__hint form-editor__fixed">
        Si pedís el texto y el enlace, y los dos son opcionales, hace falta al menos uno de los dos.
      </p>

      <h2 className="fieldset__subtitle">Preguntas propias</h2>
      {questions.length === 0 && <p className="field__hint">Todavía no hay preguntas propias.</p>}
      {questions.map((q, i) => {
        const requiredId = fieldId(name(i, 'required'));
        return (
          <fieldset key={q.key} className="fieldset form-editor__question">
            <legend className="fieldset__legend">Pregunta {i + 1}</legend>
            <input type="hidden" name={name(i, 'key')} value={q.key} />
            <TextField
              name={name(i, 'label')}
              label={`Texto de la pregunta ${i + 1}`}
              maxLength={200}
              defaultValue={q.label}
              error={errors[name(i, 'label')]}
            />
            <TextField
              name={name(i, 'hint')}
              label={`Aclaración de la pregunta ${i + 1}`}
              optional
              maxLength={300}
              hint="Se muestra debajo de la pregunta."
              defaultValue={q.hint}
              error={errors[name(i, 'hint')]}
            />
            <SelectField name={name(i, 'type')} label={`Tipo de respuesta de la pregunta ${i + 1}`} options={TYPE_OPTIONS} defaultValue={q.type} />
            <div className="field">
              <div className="checkbox">
                <input id={requiredId} name={name(i, 'required')} type="checkbox" defaultChecked={q.required} />
                <label htmlFor={requiredId}>Respuesta obligatoria</label>
              </div>
            </div>
            <div className="button-group">
              {i > 0 && (
                <button id={`${q.key}-subir`} type="button" className="button button--secondary button--small" onClick={() => move(i, -1)}>
                  Subir <span className="visually-hidden">la pregunta {i + 1}</span>
                </button>
              )}
              {i < questions.length - 1 && (
                <button id={`${q.key}-bajar`} type="button" className="button button--secondary button--small" onClick={() => move(i, 1)}>
                  Bajar <span className="visually-hidden">la pregunta {i + 1}</span>
                </button>
              )}
              <button type="button" className="button button--danger button--small" onClick={() => remove(i)}>
                Quitar la pregunta {i + 1}
              </button>
            </div>
          </fieldset>
        );
      })}
      {errors['applicationForm.questions'] && (
        <p className="field__error">
          <span className="field__error-prefix">Error:</span> {errors['applicationForm.questions']}
        </p>
      )}
      <button ref={addRef} type="button" className="button button--secondary" onClick={add}>
        Agregar una pregunta
      </button>
    </Fieldset>
  );
}

/** Configuración del formulario a partir de los campos del formulario del panel. */
export function applicationFormFrom(form) {
  const get = (n) => String(form.get(n) ?? '').trim();
  const questions = [];
  for (let i = 0; form.has(name(i, 'key')); i++) {
    questions.push({
      key: get(name(i, 'key')),
      label: get(name(i, 'label')),
      hint: get(name(i, 'hint')),
      type: get(name(i, 'type')) || 'short',
      required: form.get(name(i, 'required')) === 'on',
    });
  }
  return {
    intro: get('applicationForm.intro'),
    fields: Object.fromEntries(STANDARD_FIELDS.map((f) => [f.key, get(`applicationForm.fields.${f.key}`) || 'optional'])),
    questions,
  };
}
