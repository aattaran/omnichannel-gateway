import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 10000,
    hookTimeout: 5000,
    reporters: ['verbose'],
  },
});
