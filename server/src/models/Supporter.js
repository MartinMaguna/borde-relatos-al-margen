import mongoose from 'mongoose';
import { toJSONOptions } from './shared.js';

/** Grupos, en el orden en que se muestran en el sitio. */
export const SUPPORTER_ROLES = ['impulsan', 'apoyan', 'organizan', 'colaboran'];

/**
 * Instituciones y personas que acompañan el proyecto: sus logos se muestran
 * al pie de todas las páginas, agrupados por rol.
 */
const supporterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, enum: SUPPORTER_ROLES, required: true, index: true },
    logoUrl: { type: String, required: true, trim: true },
    link: { type: String, trim: true, default: null },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

export const Supporter = mongoose.model('Supporter', supporterSchema);
