import mongoose from 'mongoose';

/**
 * Almacén de express-rate-limit en MongoDB, para Vercel.
 *
 * En serverless cada instancia tiene su propia memoria y se descarta al poco
 * tiempo: con el almacén en memoria (el de siempre) los límites de intentos de
 * login y de envíos se reiniciarían solos. Acá el conteo vive en la base, en la
 * colección `ratelimits`, que Atlas limpia sola (índice TTL).
 *
 * Fuera de Vercel (desarrollo, tests, Railway) se sigue usando la memoria.
 */
class MongoStore {
  constructor(prefix) {
    this.prefix = prefix;
    // Una sola petición por clave a la vez: el conteo es atómico en la base.
    this.localKeys = false;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  get collection() {
    return mongoose.connection.collection('ratelimits');
  }

  async ensureIndex() {
    MongoStore.indexReady ??= this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {
      MongoStore.indexReady = null;
    });
    await MongoStore.indexReady;
  }

  async increment(key) {
    await this.ensureIndex();
    const now = new Date();
    const expired = { $or: [{ $lte: ['$expiresAt', now] }, { $eq: [{ $type: '$expiresAt' }, 'missing'] }] };
    // Si la ventana venció (o no existe), arranca de nuevo en 1; si no, suma 1.
    const doc = await this.collection.findOneAndUpdate(
      { _id: `${this.prefix}:${key}` },
      [
        {
          $set: {
            hits: { $cond: [expired, 1, { $add: ['$hits', 1] }] },
            expiresAt: { $cond: [expired, new Date(now.getTime() + this.windowMs), '$expiresAt'] },
          },
        },
      ],
      { upsert: true, returnDocument: 'after' },
    );
    return { totalHits: doc.hits, resetTime: doc.expiresAt };
  }

  async decrement(key) {
    await this.collection.updateOne({ _id: `${this.prefix}:${key}`, hits: { $gt: 0 } }, { $inc: { hits: -1 } });
  }

  async resetKey(key) {
    await this.collection.deleteOne({ _id: `${this.prefix}:${key}` });
  }
}

/** Opción `store` para un limitador: en Vercel, MongoDB; en el resto, ninguna (memoria). */
export function rateLimitStore(prefix) {
  return process.env.VERCEL ? { store: new MongoStore(prefix) } : {};
}
