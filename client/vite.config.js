import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The API allows this exact origin (CORS_ORIGIN), so don't silently move to another port.
  server: { port: 5173, strictPort: true },
});
