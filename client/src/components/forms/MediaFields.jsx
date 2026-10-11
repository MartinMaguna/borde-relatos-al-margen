import { useState } from 'react';
import { normalizeAudioUrl } from '../../lib/media.js';
import { Fieldset, TextField } from './fields.jsx';

/**
 * Audio (enlace a un archivo alojado en otro sitio) y versión en lengua de
 * señas (video de YouTube). No se sube nada: solo se guardan los enlaces.
 *
 * Cuando el enlace del audio es válido aparece un reproductor de prueba, para
 * confirmar que se escucha antes de guardar.
 */
export default function MediaFields({ post, errors = {} }) {
  const [audioInput, setAudioInput] = useState(post.audio?.url ?? '');
  const playable = normalizeAudioUrl(audioInput);

  return (
    <Fieldset
      legend="Audio y lengua de señas"
      hint="Opcional. Pegá los enlaces: los archivos quedan alojados en otro sitio, no se suben acá."
    >
      <TextField
        name="audio.url"
        label="Enlace al audio"
        type="url"
        inputMode="url"
        optional
        spellCheck={false}
        hint="Enlace directo al archivo, que termine en .mp3, .m4a, .ogg o .wav (por ejemplo, desde Archive.org, Dropbox o Google Cloud). Las páginas de SoundCloud o Spotify no sirven: el sitio necesita el archivo."
        defaultValue={post.audio?.url ?? ''}
        onChange={(e) => setAudioInput(e.target.value)}
        error={errors['audio.url']}
      />

      {audioInput.trim() !== '' &&
        (playable ? (
          <div className="audio-test">
            <p className="field__hint" id="probar-audio">
              Probá que se escuche antes de guardar:
            </p>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- reproductor de prueba del enlace en el panel */}
            <audio controls preload="none" src={playable} aria-labelledby="probar-audio" />
          </div>
        ) : (
          <p className="field__hint">
            Ese enlace todavía no parece un archivo de audio (tiene que empezar con https:// y terminar en .mp3, .m4a, .ogg…).
          </p>
        ))}

      <TextField
        name="audio.label"
        label="Descripción del audio"
        optional
        maxLength={120}
        hint="Por ejemplo: «Lectura de la autora». Si la dejás vacía, se muestra «Lectura en voz alta»."
        defaultValue={post.audio?.label && post.audio.label !== 'Lectura en voz alta' ? post.audio.label : ''}
        error={errors['audio.label']}
      />

      <TextField
        name="signVideoUrl"
        label="Video en lengua de señas (YouTube)"
        type="url"
        inputMode="url"
        optional
        spellCheck={false}
        hint="Enlace al video de YouTube con la versión en lengua de señas. Sirve cualquier formato: youtube.com/watch?v=…, youtu.be/…, Shorts."
        defaultValue={post.signVideoUrl ?? ''}
        error={errors.signVideoUrl}
      />
    </Fieldset>
  );
}
