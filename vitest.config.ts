import { defineConfig } from 'vitest/config'

/** The tests of the real content compile all of `content/`, which grows with every node written. */
const REAL_CONTENT = 'tests/real-content/**/*.test.ts'

// The unit-level seams: the content pipeline, the learning engine, the pack builder and every other module of src/.
// Browser journeys live in tests/browser and run with Playwright, not Vitest.
export default defineConfig({
  test: {
    projects: [
      { extends: true, test: { name: 'unit', include: ['tests/**/*.test.ts'], exclude: [REAL_CONTENT] } },
      {
        extends: true,
        // A minute for each test and hook: one of them took more than the default 5 s on a busy machine.
        test: { name: 'real-content', include: [REAL_CONTENT], testTimeout: 60_000, hookTimeout: 60_000 },
      },
    ],
  },
})
