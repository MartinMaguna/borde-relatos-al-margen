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
  // Duración de la sesión del editor (JWT y cookie usan el mismo valor).
  SESSION_TTL_HOURS: z.coerce.number().positive().default(8),
  // Intentos de login permitidos por IP cada 15 minutos.
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  // Postulaciones por IP, por hora.
  APPLICATION_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  // Mensajes del formulario de contacto por IP, por hora.
  CONTACT_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  // Envío por correo de los mensajes de contacto (Resend). Sin estas dos variables,
  // los mensajes igual se guardan y se leen en el panel → Mensajes.
  RESEND_API_KEY: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
  CONTACT_TO_EMAIL: z.preprocess((v) => (v === '' ? undefined : v), z.email('tiene que ser un correo válido').optional()),
  // Remitente. Con la cuenta gratuita de Resend sin dominio propio, onboarding@resend.dev
  // solo puede enviar al correo con el que se creó la cuenta.
  CONTACT_FROM_EMAIL: z.string().default('Borde <onboarding@resend.dev>'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  // Proxies de confianza delante de la API: define de dónde sale req.ip (límite de
  // intentos de login). Con más de 1, quien llame directo a Railway podría falsear
  // su IP en X-Forwarded-For; ver README → Deploy.
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
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
