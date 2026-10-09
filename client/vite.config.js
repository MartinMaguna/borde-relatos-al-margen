import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // El proxy replica en local lo que hará el rewrite de Vercel en producción:
      // el navegador solo habla con un origen, así las cookies httpOnly funcionan igual.
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  };
});
