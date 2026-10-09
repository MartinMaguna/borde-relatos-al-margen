import mongoose from 'mongoose';
import { PAGE_SLUGS } from '../constants.js';
import { renderMarkdown } from '../utils/markdown.js';
import { toJSONOptions } from './shared.js';

/** Páginas institucionales editables (por ahora, "Acerca"). */
const pageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, enum: PAGE_SLUGS },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, default: '' },
    bodyHtml: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

pageSchema.pre('validate', function () {
  if (this.isModified('body')) this.bodyHtml = renderMarkdown(this.body);
});

export const Page = mongoose.model('Page', pageSchema);
