import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetRouteFocus } from '../a11y/hooks.js';

// jsdom no implementa showModal()/close() de <dialog>: reemplazo mínimo para los tests.
// El comportamiento modal real (foco atrapado, fondo inerte) se verifica en navegador.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  resetRouteFocus();
});
