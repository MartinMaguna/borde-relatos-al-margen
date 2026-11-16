import mongoose from 'mongoose';
import { Page } from '../models/Page.js';
import { Post } from '../models/Post.js';

/**
 * Cambio de nombre (noviembre de 2026): el sitio deja de llamarse "Borde" y
 * pasa a ser solo "Relatos al margen".
 *
 * Reemplaza el nombre de la plataforma en el contenido institucional cargado
 * desde el panel: la página Acerca y las publicaciones de talleres y
 * convocatorias, y el autor "Borde" en cualquier publicación. Las obras
 * (poesía y cuentos) no se tocan: ahí "borde" puede ser parte del texto.
 * Solo "Borde" con mayúscula, como nombre propio.
 *
 * Corre una sola vez: queda registrada en la colección `migrations`.
 */
export const MIGRATION_ID = '2026-11-renombre-relatos-al-margen';
export const NEW_NAME = 'Relatos al margen';

const RULES = [
  // "Borde | Relatos al Margen", "Borde  Relatos al Margen", "Borde. Relatos al margen"…
  [/Borde\s*[|.·-]?\s*Relatos al [Mm]argen/g, NEW_NAME],
  // Cualquier otra mención como nombre propio ("en Borde", "plataforma Borde").
  [/\bBorde\b/g, NEW_NAME],
];

/** Texto con el nombre nuevo (sin cambios si no menciona "Borde"). */
export function renameBrand(text) {
  if (typeof text !== 'string') return text;
  return RULES.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

const INSTITUTIONAL = ['talleres', 'convocatorias'];

export async function renameBrandOnce({ log = console } = {}) {
  const migrations = mongoose.connection.collection('migrations');
  if (await migrations.findOne({ _id: MIGRATION_ID })) return { skipped: true };

  let changed = 0;
  const posts = await Post.find({ $or: [{ category: { $in: INSTITUTIONAL } }, { author: 'Borde' }] });
  for (const post of posts) {
    const institutional = INSTITUTIONAL.includes(post.category);
    if (post.author === 'Borde') post.author = NEW_NAME;
    if (institutional) {
      for (const field of ['title', 'summary', 'body']) post[field] = renameBrand(post[field]);
      if (post.image?.alt) post.image.alt = renameBrand(post.image.alt);
      if (post.applicationForm?.intro) {
        post.applicationForm = { ...post.applicationForm, intro: renameBrand(post.applicationForm.intro) };
        post.markModified('applicationForm');
      }
    }
    if (post.isModified()) {
      await post.save(); // vuelve a generar el HTML del texto
      changed++;
    }
  }

  for (const page of await Page.find()) {
    page.title = renameBrand(page.title);
    page.body = renameBrand(page.body);
    if (page.isModified()) {
      await page.save();
      changed++;
    }
  }

  await migrations.insertOne({ _id: MIGRATION_ID, at: new Date(), changed });
  log.info(`🏷️  Nombre actualizado a "${NEW_NAME}" en ${changed} documento(s).`);
  return { changed };
}
