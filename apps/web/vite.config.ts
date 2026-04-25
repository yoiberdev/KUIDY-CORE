import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  const apiPort = env.API_PORT ?? '3000';
  const webPort = Number(env.WEB_PORT ?? 5173);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: webPort,
      proxy: {
        '/auth': `http://localhost:${apiPort}`,
        '/api': `http://localhost:${apiPort}`,
      },
    },
  };
});
