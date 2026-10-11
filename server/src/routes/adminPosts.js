import { Router } from 'express';
import { Post } from '../models/Post.js';
import { Image, uploadedImageId } from '../models/Image.js';
import { HttpError } from '../middleware/errors.js';
import { validate } from '../middleware/validate.js';
import { adminListQuery, idParams, postInputSchema } from '../validators/posts.js';
import { paginationMeta, sendOk } from '../utils/respond.js';
import { slugify, uniqueSlug } from '../utils/slug.js';

/** CRUD del panel del editor. Ve borradores y publicados. Montado detrás de requireAuth. */
const router = Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Borra una imagen subida que dejó de usarse (se cambió o se eliminó la
 * publicación), salvo que otra publicación la siga usando. Las imágenes
 * externas (http…) no se tocan.
 */
async function deleteUnusedImage(url) {
  const id = uploadedImageId(url);
  if (!id) return;
  if (await Post.exists({ 'image.url': url })) return;
  await Image.deleteOne({ _id: id });
}

async function findPostOr404(id) {
  const post = await Post.findById(id);
  if (!post) throw new HttpError(404, 'No encontramos esa publicación', { code: 'NOT_FOUND' });
  return post;
}

/**
 * Slug: si el editor escribe uno, se respeta y debe estar libre (409 si no).
 * Si lo deja vacío, se genera a partir del título y se desambigua con -2, -3…
 */
async function resolveSlug({ slug, title }, currentId) {
  const takenBy = (s) => Post.exists({ slug: s, ...(currentId && { _id: { $ne: currentId } }) });
  if (slug) {
    if (await takenBy(slug)) {
      throw new HttpError(409, 'Ya existe otra publicación con esa dirección (slug)', {
        code: 'SLUG_TAKEN',
        details: [{ field: 'slug', message: 'Ya está en uso. Elegí otro o dejalo vacío para generarlo automáticamente.' }],
      });
    }
    return slug;
  }
  return uniqueSlug(slugify(title), takenBy);
}

// GET /api/admin/posts?category=&status=&q=&page=&limit=
router.get('/', validate({ query: adminListQuery }), async (req, res) => {
  const { category, status, q, page, limit } = req.valid.query;
  const filter = {
    ...(category && { category }),
    ...(status && { status }),
    ...(q && { title: { $regex: escapeRegex(q), $options: 'i' } }),
  };
  const [items, total] = await Promise.all([
    Post.find(filter).select('-body -bodyHtml').sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Post.countDocuments(filter),
  ]);
  sendOk(res, items, { meta: paginationMeta({ page, limit, total }) });
});

router.get('/:id', validate({ params: idParams }), async (req, res) => {
  sendOk(res, await findPostOr404(req.valid.params.id));
});

router.post('/', validate({ body: postInputSchema }), async (req, res) => {
  const data = req.valid.body;
  const slug = await resolveSlug(data);
  const post = await Post.create({ ...data, slug, createdBy: req.user.id, updatedBy: req.user.id });
  sendOk(res, post, { status: 201 });
});

// PUT: el formulario del panel siempre envía la publicación completa.
router.put('/:id', validate({ params: idParams, body: postInputSchema }), async (req, res) => {
  const post = await findPostOr404(req.valid.params.id);
  const data = req.valid.body;
  // Si el slug viene vacío en una edición, conservamos el actual (no rompemos enlaces ya compartidos).
  const slug = data.slug ? await resolveSlug(data, post.id) : post.slug;
  const previousImage = post.image?.url;
  // Los campos opcionales vacíos llegan como undefined: los pasamos a null para que se borren.
  post.set({
    ...data,
    slug,
    deadline: data.deadline ?? null,
    basesUrl: data.basesUrl ?? null,
    signVideoUrl: data.signVideoUrl ?? null,
    updatedBy: req.user.id,
  });
  await post.save();
  if (previousImage && previousImage !== post.image?.url) await deleteUnusedImage(previousImage);
  sendOk(res, post);
});

router.delete('/:id', validate({ params: idParams }), async (req, res) => {
  const post = await findPostOr404(req.valid.params.id);
  await post.deleteOne();
  if (post.image?.url) await deleteUnusedImage(post.image.url);
  sendOk(res, { id: post.id, title: post.title });
});

export default router;
