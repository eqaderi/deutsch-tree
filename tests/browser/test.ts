import { test as base, expect } from '@playwright/test'

/**
 * Import `test` and `expect` from here in every browser test.
 *
 * It adds one rule to every test: the site may talk only to the server it was
 * loaded from. A request to a font service, an analytics service or any other
 * host fails the test.
 */
export const test = base.extend<{ sameOriginOnly: undefined }>({
  sameOriginOnly: [
    async ({ page, baseURL }, use) => {
      const origin = new URL(baseURL ?? '').origin
      const foreign: string[] = []
      page.on('request', (request) => {
        const url = new URL(request.url())
        if (url.protocol.startsWith('http') && url.origin !== origin) foreign.push(request.url())
      })
      await use(undefined)
      expect(foreign, 'requests to other servers').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
