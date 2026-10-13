import { Router } from 'express';
import { CATEGORIES } from '../constants.js';
import { Post } from '../models/Post.js';
import { HttpError } from '../middleware/errors.js';
import { validate } from '../middleware/validate.js';
import { categorySlugParams, latestQuery, publicListQuery } from '../validators/posts.js';
import { paginationMeta, sendOk } from '../utils/respond.js';

/**
 * API pública de lectura: solo publicaciones con estado "published".
 * En los listados no enviamos el cuerpo completo (más liviano).
 */
const router = Router();
const PUBLISHED = { status: 'published' };
const LIST_FIELDS = '-body -bodyHtml -chapters -createdBy -updatedBy';
const DETAIL_FIELDS = '-body -chapters.body -createdBy -updatedBy';

// GET /api/posts?category=poesia&page=1&limit=10
router.get('/', validate({ query: publicListQuery }), async (req, res) => {
  const { category, page, limit } = req.valid.query;
  const filter = { ...PUBLISHED, ...(category && { category }) };

  const [items, total] = await Promise.all([
    Post.find(filter).select(LIST_FIELDS).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Post.countDocuments(filter),
  ]);
  sendOk(res, items, { meta: paginationMeta({ page, limit, total }) });
});

// GET /api/posts/latest?perCategory=3 → { poesia: [...], cuentos: [...], ... } para la portada
router.get('/latest', validate({ query: latestQuery }), async (req, res) => {
  const { perCategory } = req.valid.query;
  const lists = await Promise.all(
    CATEGORIES.map((category) =>
      Post.find({ ...PUBLISHED, category }).select(LIST_FIELDS).sort({ publishedAt: -1 }).limit(perCategory),
    ),
  );
  sendOk(res, Object.fromEntries(CATEGORIES.map((c, i) => [c, lists[i]])));
});

// GET /api/posts/poesia/mi-poema
router.get('/:category/:slug', validate({ params: categorySlugParams }), async (req, res) => {
  const { category, slug } = req.valid.params;
  const post = await Post.findOne({ ...PUBLISHED, category, slug }).select(DETAIL_FIELDS);
  if (!post) throw new HttpError(404, 'No encontramos esa publicación', { code: 'NOT_FOUND' });
  sendOk(res, post);
});

export default router;
