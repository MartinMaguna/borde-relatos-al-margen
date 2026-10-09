import { z } from 'zod';

/**
 * Validamos las variables de entorno al arrancar: si falta algo crítico,
 * el proceso falla de inmediato con un mensaje claro en vez de romperse
 * más tarde en medio de un request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string({ error: 'es obligatoria' }).min(1, 'es obligatoria'),
  JWT_SECRET: z.string({ error: 'es obligatoria' }).min(32, 'debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
};
