/**
 * Serialización común: exponemos `id` en lugar de `_id`, ocultamos `__v`
 * y nunca enviamos el hash de contraseña aunque se haya seleccionado.
 */
export const toJSONOptions = {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  },
};
