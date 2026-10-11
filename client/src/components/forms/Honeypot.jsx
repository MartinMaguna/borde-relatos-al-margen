/**
 * Campo trampa contra bots: invisible y fuera del orden de tabulación, oculto
 * también al lector de pantalla. Las personas no lo ven ni lo completan; muchos
 * bots sí, y el servidor descarta ese envío en silencio.
 */
export default function Honeypot({ id }) {
  return (
    <div className="honeypot" aria-hidden="true">
      <label htmlFor={id}>No completar este campo</label>
      <input id={id} name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
