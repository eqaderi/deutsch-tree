import { defineConfig } from 'vitest/config'

// The unit-level seams: the content pipeline, the learning engine, the pack builder and every other module of src/.
// Browser journeys live in tests/browser and run with Playwright, not Vitest.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
