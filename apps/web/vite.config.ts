import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: { target: 'es2022', sourcemap: false },
  server: {
    // Respeita a porta atribuída pelo harness de preview quando existir.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
});
