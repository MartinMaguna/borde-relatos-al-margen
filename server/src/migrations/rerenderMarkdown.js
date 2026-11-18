import mongoose from 'mongoose';
import { Page } from '../models/Page.js';
import { Post } from '../models/Post.js';
import { renderMarkdown } from '../utils/markdown.js';

/**
 * Vuelve a generar el HTML de todos los textos cuando cambian las reglas de
 * renderMarkdown (noviembre de 2026: se conservan las líneas en blanco
 * seguidas y las sangrías, para que el sitio muestre lo mismo que el editor).
 * No cambia lo que escribió el equipo (body), solo su versión para leer.
 * Corre una sola vez: queda registrada en la colección `migrations`.
 */
export const MIGRATION_ID = '2026-11-texto-como-en-el-editor';

export async function rerenderMarkdownOnce({ log = console } = {}) {
  const migrations = mongoose.connection.collection('migrations');
  if (await migrations.findOne({ _id: MIGRATION_ID })) return { skipped: true };

  let changed = 0;
  for (const post of await Post.find().select('body chapters')) {
    const set = { bodyHtml: post.body ? renderMarkdown(post.body) : '' };
    post.chapters.forEach((chapter, i) => {
      set[`chapters.${i}.bodyHtml`] = renderMarkdown(chapter.body);
    });
    // Sin tocar updatedAt: el contenido no cambió.
    await Post.updateOne({ _id: post._id }, { $set: set }, { timestamps: false });
    changed++;
  }
  for (const page of await Page.find().select('body')) {
    await Page.updateOne({ _id: page._id }, { $set: { bodyHtml: renderMarkdown(page.body) } }, { timestamps: false });
    changed++;
  }

  await migrations.insertOne({ _id: MIGRATION_ID, at: new Date(), changed });
  log.info(`📝 HTML de ${changed} texto(s) regenerado con las reglas nuevas.`);
  return { changed };
}
