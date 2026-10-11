import { useEffect, useRef, useState } from 'react';
import { useAnnounce } from '../a11y/Announcer.jsx';
import { PauseIcon, PlayIcon } from './icons.jsx';

/**
 * Botón para escuchar el audio de una publicación desde su tarjeta.
 *
 * - Es un <button> nativo; su texto cambia entre "Escuchar" y "Pausar", y el
 *   título de la publicación va en el nombre accesible ("Escuchar «Orilla»"),
 *   así cada botón se distingue en la lista de controles del lector.
 * - El <audio> no tiene controles, así que no aparece en el árbol de
 *   accesibilidad: el único control es el botón.
 * - Suena un solo audio a la vez: al empezar uno, se pausan los demás.
 * - preload="none": no se descarga nada hasta que la persona pide escuchar.
 * - Si el audio no se puede reproducir, se dice con texto y en la región viva.
 */
export default function AudioButton({ src, title }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const announce = useAnnounce();

  useEffect(() => {
    const audio = audioRef.current;
    const onPlay = () => setPlaying(true);
    const onStop = () => setPlaying(false);
    const onError = () => {
      setPlaying(false);
      setFailed(true);
    };
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onStop);
    audio.addEventListener('ended', onStop);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onStop);
      audio.removeEventListener('ended', onStop);
      audio.removeEventListener('error', onError);
      audio.pause();
    };
  }, []);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    for (const other of document.querySelectorAll('audio')) {
      if (other !== audio) other.pause();
    }
    setFailed(false);
    try {
      await audio.play();
    } catch (err) {
      // AbortError: la persona pausó antes de que empezara. No es un fallo.
      if (err?.name === 'AbortError') return;
      setFailed(true);
      announce(`No se pudo reproducir el audio de «${title}».`, { assertive: true });
    }
  }

  return (
    <div className="audio-button">
      <button type="button" className="button button--secondary button--small" onClick={toggle}>
        {playing ? <PauseIcon /> : <PlayIcon />}
        {playing ? 'Pausar' : 'Escuchar'} <span className="visually-hidden">«{title}»</span>
      </button>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- audio de lectura: el texto completo de la publicación es su transcripción */}
      <audio ref={audioRef} src={src} preload="none" />
      {failed && <p className="audio-button__error">No se pudo reproducir el audio.</p>}
    </div>
  );
}
