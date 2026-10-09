import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ error: 'Ingresá tu correo electrónico' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Ingresá un correo electrónico válido' })),
  password: z.string({ error: 'Ingresá tu contraseña' }).min(1, 'Ingresá tu contraseña').max(200),
});
