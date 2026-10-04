import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Tailwind v4 runs as a Vite plugin - no tailwind.config.js or postcss.config.js needed
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  build: {
    // The 3D viewer chunk (three.js + react-three-fiber) is about 1 MB. It is lazy-loaded only on
    // artifact pages, so the warning Vite shows for chunks over 500 kB doesn't apply here.
    chunkSizeWarningLimit: 1200,
  },
});
