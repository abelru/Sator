import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    // The big chunks (7×7–9×9 word lists, the Firebase SDK) are all loaded on demand,
    // never on first paint, so the default 500 KB warning is noise here.
    chunkSizeWarningLimit: 600,
  },
});
