import { defineConfig } from 'vitest/config';

// Tests unitaires du moteur de recommandation (modules purs, sans réseau).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
