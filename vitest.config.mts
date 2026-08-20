import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The integration tests bind a real port and share one server instance, so they must
    // not run in parallel with each other.
    fileParallelism: false,
    include: ['server/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
})
