import { useEffect, useRef, useState } from 'react';
import { useAnnounce } from '../../a11y/Announcer.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';
import { Fieldset, SelectField, TextArea, TextField, fieldId } from './fields.jsx';
import { BORDE_TEMPLATE, CORE_KEYS, DEFAULT_CONSENT, resolveApplicationForm } from '../../lib/applicationForm.js';

let counter = 0;
/** Identificador estable de un elemento (las respuestas se guardan con él). */
const newKey = () => `p${Date.now().toString(36)}${(counter++).toString(36)}`;

const TYPE_OPTIONS = [
  { value: 'short', label: 'Respuesta corta (una línea)' },
  { value: 'long', label: 'Respuesta larga (varios renglones)' },
  { value: 'number', label: 'Número' },
  { value: 'email', label: 'Correo electrónico' },
  { value: 'link', label: 'Enlace (por ejemplo, a la obra)' },
  { value: 'select', label: 'Lista desplegable (elegir una)' },
  { value: 'choice', label: 'Opciones a la vista (elegir una)' },
];
const CONTACT_TYPES = TYPE_OPTIONS.filter((t) => t.value === 'short' || t.value === 'email');
const hasOptions = (type) => type === 'select' || type === 'choice';

const n = (i, prop) => `applicationForm.items.${i}.${prop}`;
const copy = (items) => items.map((i) => ({ ...i, options: [...(i.options ?? [])] }));

/**
 * Editor del formulario de postulación de una convocatoria: una lista de
 * secciones (título y descripción) y preguntas, en el orden en que se ven.
 * - "Nombre y apellido" y "Medio de contacto" están siempre (se pueden mover
 *   y renombrar, no quitar).
 * - Cada pregunta: texto, aclaración, tipo de respuesta, opciones (en listas)
 *   y si es obligatoria.
 * - "Usar el formulario modelo de Borde" carga el formulario propuesto por el equipo.
 *
 * Los campos no son controlados (como el resto del formulario): cada elemento
 * tiene una clave estable, así al reordenar se mueve con lo que tiene escrito.
 */
export default function ApplicationFormEditor({ initial, errors = {} }) {
  const announce = useAnnounce();
  const [state, setState] = useState(() => ({ version: 0, form: resolveApplicationForm(initial), items: copy(resolveApplicationForm(initial).items) }));
  const [confirmTemplate, setConfirmTemplate] = useState(false);
  const pendingFocus = useRef(null);
  const addRef = useRef(null);
  const titleRef = useRef(null);
  const { items, form, version } = state;

  useEffect(() => {
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    if (!pending) return;
    if (pending === 'title') return titleRef.current?.focus();
    if (pending === 'add') return addRef.current?.focus();
    const i = items.findIndex((it) => it.key === pending.key);
    if (i < 0) return;
    const target = pending.target === 'label' ? fieldId(n(i, 'label')) : `${version}-${pending.key}-${pending.target}`;
    (document.getElementById(target) ?? document.getElementById(fieldId(n(i, 'label'))))?.focus();
  }, [items, version]);

  /** Lo escrito en el DOM, para no perderlo al volver a dibujar. */
  function current() {
    const el = (i, prop) => document.getElementById(fieldId(n(i, prop)));
    return items.map((it, i) => ({
      ...it,
      label: el(i, 'label')?.value ?? it.label,
      hint: el(i, 'hint')?.value ?? it.hint,
      type: el(i, 'type')?.value ?? it.type,
      required: CORE_KEYS.includes(it.key) ? true : (el(i, 'required')?.checked ?? it.required),
      options: el(i, 'options') ? splitOptions(el(i, 'options').value) : it.options,
    }));
  }

  const update = (list) => setState((s) => ({ ...s, items: list }));

  function add(type) {
    const item = { key: newKey(), type, label: '', hint: '', required: false, options: [] };
    pendingFocus.current = { key: item.key, target: 'label' };
    update([...current(), item]);
    announce(type === 'section' ? `Se agregó una sección en el lugar ${items.length + 1}.` : `Se agregó una pregunta en el lugar ${items.length + 1}.`);
  }

  function remove(i) {
    const list = current();
    list.splice(i, 1);
    pendingFocus.current = list.length ? { key: list[Math.max(0, i - 1)].key, target: 'label' } : 'add';
    update(list);
    announce(`Se quitó el elemento ${i + 1}.`);
  }

  function move(i, delta) {
    const list = current();
    const [item] = list.splice(i, 1);
    list.splice(i + delta, 0, item);
    pendingFocus.current = { key: item.key, target: delta < 0 ? 'subir' : 'bajar' };
    update(list);
    announce(`El elemento pasó al lugar ${i + delta + 1}.`);
  }

  /** Al cambiar el tipo, se muestran (o no) las opciones. */
  function changeType() {
    update(current());
  }

  function loadTemplate() {
    setConfirmTemplate(false);
    pendingFocus.current = 'title';
    setState((s) => ({ version: s.version + 1, form: BORDE_TEMPLATE, items: copy(BORDE_TEMPLATE.items) }));
    announce('Se cargó el formulario modelo de Borde.');
  }

  return (
    <Fieldset
      legend="Formulario de postulación"
      hint="Así lo ven quienes se postulan, en este orden. «Nombre y apellido» y «Medio de contacto» van siempre."
    >
      <h2 className="fieldset__subtitle" tabIndex={-1} ref={titleRef}>
        Textos del formulario
      </h2>
      <TextArea
        key={`${version}-intro`}
        name="applicationForm.intro"
        label="Introducción"
        optional
        rows={3}
        maxLength={2000}
        hint="Aparece arriba del formulario."
        defaultValue={form.intro}
        error={errors['applicationForm.intro']}
      />
      <TextField
        key={`${version}-consent`}
        name="applicationForm.consentText"
        label="Texto de la confirmación final"
        optional
        maxLength={500}
        hint={`Es la casilla que hay que marcar para enviar. Si lo dejás vacío: «${DEFAULT_CONSENT}»`}
        defaultValue={form.consentText === DEFAULT_CONSENT ? '' : form.consentText}
        error={errors['applicationForm.consentText']}
      />
      <TextArea
        key={`${version}-privacy`}
        name="applicationForm.privacyText"
        label="Información sobre el tratamiento de datos personales"
        optional
        rows={3}
        maxLength={3000}
        hint="Se muestra antes de la confirmación final: para qué se usan los datos, quién los guarda y cómo pedir que se borren."
        defaultValue={form.privacyText}
        error={errors['applicationForm.privacyText']}
      />

      <h2 className="fieldset__subtitle">Secciones y preguntas</h2>
      {items.map((item, i) => {
        const core = CORE_KEYS.includes(item.key);
        const isSection = item.type === 'section';
        const requiredId = fieldId(n(i, 'required'));
        const position = `${isSection ? 'de la sección' : 'de la pregunta'} ${i + 1}`;
        return (
          <fieldset key={`${version}-${item.key}`} className={`fieldset form-editor__item${isSection ? ' form-editor__item--section' : ''}`}>
            <legend className="fieldset__legend">
              {i + 1}. {isSection ? 'Sección' : core ? `Pregunta fija (${item.key === 'name' ? 'nombre' : 'contacto'})` : 'Pregunta'}
            </legend>
            <input type="hidden" name={n(i, 'key')} value={item.key} />
            {isSection && <input type="hidden" name={n(i, 'type')} value="section" />}
            <TextField
              name={n(i, 'label')}
              label={isSection ? `Título de la sección ${i + 1}` : `Texto de la pregunta ${i + 1}`}
              maxLength={200}
              defaultValue={item.label}
              error={errors[n(i, 'label')]}
            />
            <TextField
              name={n(i, 'hint')}
              label={isSection ? `Descripción de la sección ${i + 1}` : `Aclaración de la pregunta ${i + 1}`}
              optional
              maxLength={500}
              hint={isSection ? 'Se muestra debajo del título de la sección.' : 'Se muestra debajo de la pregunta.'}
              defaultValue={item.hint}
              error={errors[n(i, 'hint')]}
            />
            {!isSection && item.key !== 'name' && (
              <SelectField
                name={n(i, 'type')}
                label={`Tipo de respuesta ${position}`}
                options={item.key === 'contact' ? CONTACT_TYPES : TYPE_OPTIONS}
                defaultValue={item.type}
                onChange={changeType}
              />
            )}
            {item.key === 'name' && <input type="hidden" name={n(i, 'type')} value="short" />}
            {hasOptions(item.type) && (
              <TextArea
                name={n(i, 'options')}
                label={`Opciones ${position}`}
                rows={4}
                hint="Una por línea, en el orden en que se muestran."
                defaultValue={item.options.join('\n')}
                error={errors[n(i, 'options')]}
              />
            )}
            {!isSection &&
              (core ? (
                <p className="field__hint">Siempre obligatoria.</p>
              ) : (
                <div className="field">
                  <div className="checkbox">
                    <input id={requiredId} name={n(i, 'required')} type="checkbox" defaultChecked={item.required} />
                    <label htmlFor={requiredId}>Respuesta obligatoria</label>
                  </div>
                </div>
              ))}
            <div className="button-group">
              {i > 0 && (
                <button id={`${version}-${item.key}-subir`} type="button" className="button button--secondary button--small" onClick={() => move(i, -1)}>
                  Subir <span className="visually-hidden">{`el elemento ${i + 1}`}</span>
                </button>
              )}
              {i < items.length - 1 && (
                <button id={`${version}-${item.key}-bajar`} type="button" className="button button--secondary button--small" onClick={() => move(i, 1)}>
                  Bajar <span className="visually-hidden">{`el elemento ${i + 1}`}</span>
                </button>
              )}
              {!core && (
                <button type="button" className="button button--danger button--small" onClick={() => remove(i)}>
                  Quitar <span className="visually-hidden">{`el elemento ${i + 1}`}</span>
                </button>
              )}
            </div>
          </fieldset>
        );
      })}
      {errors['applicationForm.items'] && (
        <p className="field__error">
          <span className="field__error-prefix">Error:</span> {errors['applicationForm.items']}
        </p>
      )}

      <div className="button-group">
        <button ref={addRef} type="button" className="button button--secondary" onClick={() => add('short')}>
          Agregar una pregunta
        </button>
        <button type="button" className="button button--secondary" onClick={() => add('section')}>
          Agregar una sección
        </button>
        <button type="button" className="button button--secondary" onClick={() => setConfirmTemplate(true)}>
          Usar el formulario modelo de Borde
        </button>
      </div>

      <ConfirmDialog
        open={confirmTemplate}
        title="¿Usar el formulario modelo de Borde?"
        confirmLabel="Sí, usar el modelo"
        onConfirm={loadTemplate}
        onCancel={() => setConfirmTemplate(false)}
      >
        <p>Se reemplazan los textos, secciones y preguntas de este formulario. Los cambios se guardan recién al guardar la publicación.</p>
      </ConfirmDialog>
    </Fieldset>
  );
}

const splitOptions = (text) =>
  text
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean);

/** Configuración del formulario a partir de los campos del formulario del panel. */
export function applicationFormFrom(form) {
  const get = (name) => String(form.get(name) ?? '').trim();
  const items = [];
  for (let i = 0; form.has(n(i, 'key')); i++) {
    const key = get(n(i, 'key'));
    const type = get(n(i, 'type')) || 'short';
    items.push({
      key,
      type,
      label: get(n(i, 'label')),
      hint: get(n(i, 'hint')),
      required: CORE_KEYS.includes(key) || form.get(n(i, 'required')) === 'on',
      options: hasOptions(type) ? splitOptions(String(form.get(n(i, 'options')) ?? '')) : [],
    });
  }
  return {
    intro: get('applicationForm.intro'),
    consentText: get('applicationForm.consentText'),
    privacyText: get('applicationForm.privacyText'),
    items,
  };
}
