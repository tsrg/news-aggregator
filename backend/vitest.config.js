import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.js'],
      exclude: ['src/server.js', 'src/**/*.test.js'],
    },
    // Дополнительное время для integration-тестов с HTTP-сервером
    testTimeout: 10000,
  },
});
