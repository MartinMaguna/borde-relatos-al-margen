import mongoose from 'mongoose';

/**
 * Textos del sitio editables desde el panel ("Textos del sitio").
 * Es un único documento (_id: 'sitio'); si un texto está vacío, se usa el
 * valor por defecto.
 */
export const DEFAULT_SETTINGS = {
  convocatoriasEmpty: 'En este momento no hay convocatorias abiertas.',
};

const siteSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'sitio' },
    // Página Convocatorias cuando no hay ninguna publicada.
    convocatoriasEmpty: { type: String, trim: true, maxlength: 1000, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema, 'sitesettings');

/** Textos vigentes (con los valores por defecto donde no hay uno propio). */
export async function currentSettings() {
  const doc = await SiteSettings.findById('sitio').lean();
  return { convocatoriasEmpty: doc?.convocatoriasEmpty || DEFAULT_SETTINGS.convocatoriasEmpty };
}
