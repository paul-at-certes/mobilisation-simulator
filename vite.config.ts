import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// GitHub Pages serves project sites from /<repo>/. Set BASE_PATH=/mobilisation-minister/
// in the deploy workflow; local dev and custom domains use '/'.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        methodology: resolve(__dirname, 'methodology.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
