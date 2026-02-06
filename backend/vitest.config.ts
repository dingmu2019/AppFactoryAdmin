import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true, // Allows using describe, it, expect without importing
    include: ['src/**/*.test.ts'],
  },
});
