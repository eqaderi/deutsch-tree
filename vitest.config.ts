import { defineConfig } from 'vitest/config'

// Unit-level seams (content pipeline now; learning engine and pack builder later).
// Browser journeys live in tests/browser and run with Playwright, not Vitest.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
