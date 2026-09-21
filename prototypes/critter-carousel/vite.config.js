import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // Vite's default. strictPort makes a busy port an error instead of a
    // silent move to 5174, so a port conflict is something we agree on
    // rather than something that happens to you.
    port: 5173,
    strictPort: true,
  },
});
