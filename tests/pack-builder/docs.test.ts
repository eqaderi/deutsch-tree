import { readFile } from 'node:fs/promises'
import { expect, test } from 'vitest'
import { parse } from 'yaml'
import { resolveProfile } from '../../src/pack-builder/profile.ts'
import { otherBookProfile } from './fixture.ts'

/** The YAML examples in docs/private-packs.md, in order. */
async function profilesInTheDoc() {
  const doc = await readFile(new URL('../../docs/private-packs.md', import.meta.url), 'utf8')
  return [...doc.matchAll(/```yaml\n(.*?)```/gs)].map((match) => parse(match[1] as string))
}

test('the defaults written out in the documentation are the defaults', async () => {
  const [defaults] = await profilesInTheDoc()

  expect(resolveProfile(defaults)).toEqual(resolveProfile())
  // Every section is written out, so the comparison above covers all of them.
  expect(Object.keys(defaults).sort()).toEqual(['answerKey', 'examPdf', 'modules', 'recordings'])
  expect(resolveProfile().errors).toEqual([])
})

test('the example profile in the documentation is the one the tests build a book with', async () => {
  const [, example] = await profilesInTheDoc()

  expect(example).toEqual({
    examPdf: otherBookProfile.examPdf,
    answerKey: otherBookProfile.answerKey,
    recordings: otherBookProfile.recordings,
  })
})
