/**
 * The real content's original mock exams, held against the spec: five of
 * them, in order. Each is written and reviewed on its own; until then it is
 * listed as coming soon.
 */
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { compileContent, formatReport } from '../../src/content-pipeline/index.ts'

const realContent = fileURLToPath(new URL('../../content', import.meta.url))

test('the real content lists the five original mock exams of the spec, in order', async () => {
  const { report, bundle } = await compileContent(realContent, { requireAudio: false })
  if (!bundle) throw new Error(formatReport(report))

  expect(bundle.mockExams.map((exam) => exam.id)).toEqual([
    'mock-exam-1',
    'mock-exam-2',
    'mock-exam-3',
    'mock-exam-4',
    'mock-exam-5',
  ])
})
