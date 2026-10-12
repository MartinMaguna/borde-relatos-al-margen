/**
 * Utilidades de test: MongoDB en memoria (no toca Atlas) y helpers de sesión.
 *
 * Las variables de entorno se definen ANTES de importar la app (por eso los
 * imports de src/ son dinámicos): env.js las valida al cargarse.
 */
import request from 'supertest';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://definida-en-runtime';
process.env.JWT_SECRET = 'secreto-de-test-con-mas-de-32-caracteres-123';
process.env.LOGIN_RATE_LIMIT = '5';
// Correo de contacto "configurado": los tests reemplazan fetch, nunca se llama a Resend.
process.env.RESEND_API_KEY = 're_test';
process.env.CONTACT_TO_EMAIL = 'equipo@test.local';

export const EDITOR = { name: 'Editora Test', email: 'editora@test.local', password: 'contrasena-de-prueba' };

export async function startTestDb() {
  // En Windows el primer arranque de mongod puede tardar (antivirus): margen amplio.
  const mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
  const { connectDB, disconnectDB } = await import('../src/config/db.js');
  const log = console.info;
  console.info = () => {}; // silencia el log de conexión
  await connectDB(mongod.getUri());
  console.info = log;

  const { createApp } = await import('../src/app.js');
  const models = {
    User: (await import('../src/models/User.js')).User,
    Post: (await import('../src/models/Post.js')).Post,
    Page: (await import('../src/models/Page.js')).Page,
  };
  // Los índices únicos (email, slug) tienen que existir antes de los tests de duplicados.
  await Promise.all(Object.values(models).map((m) => m.init()));

  return {
    createApp,
    models,
    async reset() {
      await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
    },
    async stop() {
      await disconnectDB();
      await mongod.stop();
    },
  };
}

/** Crea el editor de prueba (costo bajo de bcrypt para que los tests sean rápidos). */
export async function createEditor(User, data = EDITOR) {
  const passwordHash = await bcrypt.hash(data.password, 4);
  return User.create({ name: data.name, email: data.email, passwordHash });
}

/** Devuelve un agente de supertest con la cookie de sesión ya puesta. */
export async function loginAgent(app, { email, password } = EDITOR) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password }).expect(200);
  return agent;
}

/** Publicación válida mínima, para extender en cada test. */
export function postData(overrides = {}) {
  return {
    title: 'Un texto de prueba',
    category: 'cuentos',
    author: 'Autora Test',
    summary: 'Resumen',
    body: 'Cuerpo del texto.',
    status: 'published',
    ...overrides,
  };
}
