import { useRef, useState } from 'react';
import { api } from '../../api/client.js';
import { useAnnounce } from '../../a11y/Announcer.jsx';
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, formatBytes, isUploadedImage, prepareImage } from '../../lib/images.js';
import { Fieldset, TextArea, fieldId } from './fields.jsx';

/**
 * Imagen de una publicación: subir un archivo o, si se prefiere, pegar una
 * dirección web. Siempre con texto alternativo.
 *
 * Accesibilidad:
 * - <input type="file"> nativo con etiqueta visible: lo anuncian todos los
 *   lectores y funciona con teclado y en móvil (cámara o galería).
 * - La subida empieza al elegir el archivo; el progreso y el resultado se
 *   anuncian en la región viva, sin mover el foco (WCAG 3.2.2).
 * - Errores junto al campo, con "Error:" y vinculados con aria-describedby.
 * - La vista previa es decorativa (alt=""): la descripción real es el texto
 *   alternativo que escribe la persona, y se lee en su propio campo.
 *
 * El valor que se envía viaja en un input oculto name="image.url".
 */
export default function ImageField({
  initialUrl = '',
  initialAlt = '',
  errors = {},
  urlName = 'image.url',
  altName = 'image.alt',
  legend = 'Imagen',
  hint = 'Opcional. Podés subir un archivo o pegar la dirección de una imagen publicada en otro sitio.',
}) {
  const announce = useAnnounce();
  const fileRef = useRef(null);
  const [url, setUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const uploaded = isUploadedImage(url);
  const fileId = fieldId('imagen');
  const linkId = fieldId(urlName);
  const fileError = uploadError ?? errors.imagen;
  const linkError = errors[urlName];

  async function handleFile(event) {
    const original = event.target.files?.[0];
    if (!original) return;
    setUploadError(null);

    if (!ACCEPTED_IMAGE_TYPES.includes(original.type)) {
      setUploadError('El archivo tiene que ser una imagen JPG, PNG, WebP, GIF o AVIF.');
      return;
    }

    setUploading(true);
    announce('Subiendo la imagen…');
    try {
      const file = await prepareImage(original);
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error(`La imagen pesa ${formatBytes(file.size)} y el máximo es 3 MB. Probá con una versión más liviana.`);
      }
      const form = new FormData();
      form.append('imagen', file);
      const { data } = await api('/admin/images', { method: 'POST', body: form });
      setUrl(data.url);
      announce(altName ? 'Imagen subida. Acordate de escribir el texto alternativo.' : 'Imagen subida.');
    } catch (err) {
      const message = err.details?.[0]?.message ?? err.message;
      setUploadError(message);
      announce(`No se pudo subir la imagen. ${message}`, { assertive: true });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function removeImage() {
    setUrl('');
    setUploadError(null);
    announce('Se quitó la imagen.');
    // El botón "Quitar" desaparece: el foco va al selector de archivo, que sigue ahí.
    fileRef.current?.focus();
  }

  return (
    <Fieldset legend={legend} hint={hint}>
      <input type="hidden" name={urlName} value={url} />

      {url && (
        <div className="image-preview">
          <img src={url} alt="" className="image-preview__img" />
          <div>
            <p className="image-preview__label">{uploaded ? 'Imagen subida.' : 'Imagen desde una dirección web.'}</p>
            <button type="button" className="button button--secondary button--small" onClick={removeImage}>
              Quitar la imagen
            </button>
          </div>
        </div>
      )}

      <div className={`field${fileError ? ' field--error' : ''}`}>
        <label className="field__label" htmlFor={fileId}>
          {url ? 'Reemplazar por otra imagen' : 'Subir una imagen'}
          <span className="field__optional"> (opcional)</span>
        </label>
        <p id={`${fileId}-pista`} className="field__hint">
          JPG, PNG, WebP o GIF. Las fotos grandes se achican solas antes de subirse.
        </p>
        {fileError && (
          <p id={`${fileId}-error`} className="field__error">
            <span className="field__error-prefix">Error:</span> {fileError}
          </p>
        )}
        <input
          ref={fileRef}
          id={fileId}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className="field__file"
          onChange={handleFile}
          aria-invalid={fileError ? true : undefined}
          aria-describedby={[`${fileId}-pista`, fileError && `${fileId}-error`].filter(Boolean).join(' ')}
        />
        {uploading && <p className="field__hint">Subiendo la imagen…</p>}
      </div>

      {!uploaded && (
        <div className={`field${linkError ? ' field--error' : ''}`}>
          <label className="field__label" htmlFor={linkId}>
            O pegá la dirección de una imagen
            <span className="field__optional"> (opcional)</span>
          </label>
          <p id={`${linkId}-pista`} className="field__hint">
            Dirección completa, por ejemplo https://ejemplo.com/foto.jpg
          </p>
          {linkError && (
            <p id={`${linkId}-error`} className="field__error">
              <span className="field__error-prefix">Error:</span> {linkError}
            </p>
          )}
          <input
            id={linkId}
            type="url"
            inputMode="url"
            className="field__input"
            value={url}
            onChange={(e) => setUrl(e.target.value.trim())}
            aria-invalid={linkError ? true : undefined}
            aria-describedby={[`${linkId}-pista`, linkError && `${linkId}-error`].filter(Boolean).join(' ')}
          />
        </div>
      )}

      {/* Sin altName (logos): el texto alternativo es el nombre, que se carga en otro campo. */}
      {altName && (
        <TextArea
          name={altName}
          label="Texto alternativo"
          optional
          rows={2}
          maxLength={300}
          hint="Obligatorio si hay imagen. Contá qué se ve y por qué importa, en una o dos frases. No empieces con «imagen de»."
          defaultValue={initialAlt}
          error={errors[altName]}
        />
      )}
    </Fieldset>
  );
}
