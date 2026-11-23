import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' permite publicar el sitio en cualquier carpeta (GitHub Pages, hosting compartido, etc.)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // three.js + react-three-fiber pesan ~1 MB sin comprimir (~250 KB gzip) y se cargan aparte
    chunkSizeWarningLimit: 1200,
  },
});
