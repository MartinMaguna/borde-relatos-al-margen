import { faBookmark as faBookmarkSolid, faLink, faArrowUpFromBracket, faListUl } from '@fortawesome/free-solid-svg-icons';
import { faBookmark, faEnvelope, faCopy } from '@fortawesome/free-regular-svg-icons';
import { SIGN_HAND_FILL_RULE, SIGN_HAND_PATH, SIGN_HAND_VIEWBOX } from './signHand.js';
import { faWhatsapp, faFacebook, faLinkedin, faInstagram, faYoutube } from '@fortawesome/free-brands-svg-icons';

/**
 * Íconos decorativos: siempre acompañan un texto visible, así que se ocultan
 * a los lectores de pantalla (aria-hidden) y no reciben foco.
 *
 * Varios provienen de Font Awesome Free (https://fontawesome.com), licencia
 * CC BY 4.0. El de lengua de señas es una seña de la mano, vectorizada a
 * partir de la ilustración que aportó el equipo (ver signHand.js).
 */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
  className: 'icon',
};

/** Ícono de Font Awesome a partir de su definición { icon: [ancho, alto, , , path] }. */
function FaIcon({ def, className = 'icon' }) {
  const [width, height, , , path] = def.icon;
  const paths = Array.isArray(path) ? path : [path];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} fill="currentColor" aria-hidden="true" focusable="false">
      {paths.map((d) => (
        <path key={d.slice(0, 16)} d={d} />
      ))}
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg {...base}>
      <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg {...base}>
      <path d="M8 5v14M16 5v14" strokeWidth={3} />
    </svg>
  );
}

/** Símbolo internacional de interpretación en lengua de señas (dos manos). */
export function SignLanguageIcon() {
  return (
    <svg viewBox={SIGN_HAND_VIEWBOX} className="icon icon--sign" aria-hidden="true" focusable="false">
      <path d={SIGN_HAND_PATH} fillRule={SIGN_HAND_FILL_RULE} fill="currentColor" />
    </svg>
  );
}

export const BookmarkIcon = ({ filled = false }) => <FaIcon def={filled ? faBookmarkSolid : faBookmark} />;
export const ShareIcon = () => <FaIcon def={faArrowUpFromBracket} />;
export const ListIcon = () => <FaIcon def={faListUl} />;
export const LinkIcon = () => <FaIcon def={faLink} />;
export const CopyIcon = () => <FaIcon def={faCopy} />;
export const MailIcon = () => <FaIcon def={faEnvelope} />;
export const WhatsappIcon = () => <FaIcon def={faWhatsapp} />;
export const FacebookIcon = () => <FaIcon def={faFacebook} />;
export const LinkedinIcon = () => <FaIcon def={faLinkedin} />;
export const InstagramIcon = () => <FaIcon def={faInstagram} />;
export const YoutubeIcon = () => <FaIcon def={faYoutube} />;
