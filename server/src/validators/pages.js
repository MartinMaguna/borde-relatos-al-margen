import { z } from 'zod';
import { PAGE_SLUGS } from '../constants.js';

export const pageParams = z.object({ slug: z.enum(PAGE_SLUGS) });

export const pageInputSchema = z.object({
  title: z.string({ error: 'El título es obligatorio' }).trim().min(1, 'El título es obligatorio').max(200),
  body: z.string().trim().max(100_000).default(''),
});
