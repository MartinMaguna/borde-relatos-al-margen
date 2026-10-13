import { useEffect, useRef, useState } from 'react';
import { useAnnounce } from '../../a11y/Announcer.jsx';
import MarkdownEditor from './MarkdownEditor.jsx';
import { TextField, fieldId } from './fields.jsx';

let nextKey = 0;
const withKey = (chapter) => ({ key: `capitulo-${nextKey++}`, title: chapter.title ?? '', body: chapter.body ?? '' });

/**
 * Capítulos de un cuento: cada uno con título y texto (con la misma barra de
 * formato que el texto principal). Se pueden agregar, quitar y reordenar.
 *
 * Los campos no son controlados (los valores viven en el DOM, como en el resto
 * del formulario): cada capítulo tiene una clave estable, así al reordenar se
 * mueve con lo que ya tiene escrito. Los nombres ("chapters.0.title") siguen
 * la posición y coinciden con los errores de la API.
 *
 * Accesibilidad: cada capítulo es un <fieldset> con su número en la leyenda;
 * los botones dicen a qué capítulo afectan; después de agregar, quitar o mover,
 * el foco va a un lugar que tiene sentido y el cambio se anuncia.
 */
export default function ChaptersField({ initial = [], errors = {} }) {
  const announce = useAnnounce();
  const [chapters, setChapters] = useState(() => initial.map(withKey));
  const addButtonRef = useRef(null);
  // Qué enfocar después del próximo render: { key, target: 'title' | 'up' | 'down' } o 'add'.
  const pendingFocus = useRef(null);

  useEffect(() => {
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    if (!pending) return;
    if (pending === 'add') return addButtonRef.current?.focus();
    const index = chapters.findIndex((c) => c.key === pending.key);
    if (index < 0) return;
    const id =
      pending.target === 'title' ? fieldId(`chapters.${index}.title`) : `${pending.key}-${pending.target === 'up' ? 'subir' : 'bajar'}`;
    // Si el botón ya no existe (p. ej. quedó primero y no hay "Subir"), el foco va al título.
    (document.getElementById(id) ?? document.getElementById(fieldId(`chapters.${index}.title`)))?.focus();
  }, [chapters]);

  /** Lee lo escrito en el DOM, para no perderlo al volver a dibujar. */
  function current() {
    return chapters.map((c, i) => ({
      ...c,
      title: document.getElementById(fieldId(`chapters.${i}.title`))?.value ?? c.title,
      body: document.getElementById(fieldId(`chapters.${i}.body`))?.value ?? c.body,
    }));
  }

  function add() {
    const chapter = withKey({});
    pendingFocus.current = { key: chapter.key, target: 'title' };
    setChapters([...current(), chapter]);
    announce(`Se agregó el capítulo ${chapters.length + 1}.`);
  }

  function remove(index) {
    const list = current();
    list.splice(index, 1);
    pendingFocus.current = list.length ? { key: list[Math.max(0, index - 1)].key, target: 'title' } : 'add';
    setChapters(list);
    announce(`Se quitó el capítulo ${index + 1}.`);
  }

  function move(index, delta) {
    const list = current();
    const [chapter] = list.splice(index, 1);
    list.splice(index + delta, 0, chapter);
    pendingFocus.current = { key: chapter.key, target: delta < 0 ? 'up' : 'down' };
    setChapters(list);
    announce(`El capítulo pasó al lugar ${index + delta + 1}.`);
  }

  return (
    <fieldset className="fieldset fieldset--group chapters">
      <legend className="fieldset__legend">Capítulos</legend>
      <p className="field__hint">
        Opcional. Si el cuento está dividido en capítulos, cargalos acá: en el sitio aparecen con un índice. El texto
        principal (arriba) queda como introducción y puede quedar vacío.
      </p>

      {chapters.map((chapter, i) => (
        <fieldset key={chapter.key} className="fieldset chapter">
          <legend className="fieldset__legend">Capítulo {i + 1}</legend>
          <TextField
            name={`chapters.${i}.title`}
            label={`Título del capítulo ${i + 1}`}
            maxLength={200}
            defaultValue={chapter.title}
            error={errors[`chapters.${i}.title`]}
          />
          <MarkdownEditor
            name={`chapters.${i}.body`}
            label={`Texto del capítulo ${i + 1}`}
            rows={12}
            defaultValue={chapter.body}
            error={errors[`chapters.${i}.body`]}
            previewClassName="prose prose--cuentos"
          />
          <div className="button-group">
            {i > 0 && (
              <button id={`${chapter.key}-subir`} type="button" className="button button--secondary button--small" onClick={() => move(i, -1)}>
                Subir <span className="visually-hidden">el capítulo {i + 1}</span>
              </button>
            )}
            {i < chapters.length - 1 && (
              <button id={`${chapter.key}-bajar`} type="button" className="button button--secondary button--small" onClick={() => move(i, 1)}>
                Bajar <span className="visually-hidden">el capítulo {i + 1}</span>
              </button>
            )}
            <button type="button" className="button button--danger button--small" onClick={() => remove(i)}>
              Quitar el capítulo {i + 1}
            </button>
          </div>
        </fieldset>
      ))}

      <button ref={addButtonRef} type="button" className="button button--secondary" onClick={add}>
        Agregar capítulo
      </button>
    </fieldset>
  );
}

/** Capítulos del formulario, en orden: [{ title, body }]. */
export function chaptersFrom(form) {
  const chapters = [];
  for (let i = 0; form.has(`chapters.${i}.title`); i++) {
    chapters.push({
      title: String(form.get(`chapters.${i}.title`) ?? '').trim(),
      body: String(form.get(`chapters.${i}.body`) ?? '').trim(),
    });
  }
  return chapters;
}
