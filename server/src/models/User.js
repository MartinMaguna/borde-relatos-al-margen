import mongoose from 'mongoose';
import { ROLES } from '../constants.js';
import { toJSONOptions } from './shared.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false → nunca sale de la base salvo que se pida explícitamente.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'editor' },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

export const User = mongoose.model('User', userSchema);
