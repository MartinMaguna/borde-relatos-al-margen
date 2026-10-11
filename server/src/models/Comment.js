import mongoose from 'mongoose';
import { toJSONOptions } from './shared.js';

export const COMMENT_STATUS = ['pending', 'approved', 'rejected'];

/**
 * Comentarios de lectores. Se publican solo después de que el equipo los
 * aprueba en el panel (pre-moderación): frena spam y agresiones sin exigir cuentas.
 */
const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: COMMENT_STATUS, default: 'pending', index: true },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

export const Comment = mongoose.model('Comment', commentSchema);
