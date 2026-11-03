import { defineConfig } from 'vite';
import { TuningDevelopmentServer } from './src/tuning/editor/TuningDevelopmentServer.ts';

export default defineConfig({
  plugins: [new TuningDevelopmentServer().createPlugin()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    open: true,
  },
  preview: {
    host: '127.0.0.1',
    open: true,
  },
});
