/**
 * For tests of one question type: the fixture content with one more question,
 * "extra", at the end of the published node's pool, and what the pipeline
 * makes of it.
 */
import { expect } from 'vitest'
import type { ContentBundle, GrammarContent } from '../../src/content-model/index.ts'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { changeReviewedNode, fixtureContentWith, PUBLISHED } from './fixture.ts'

export const explanation = {
  en: 'With *du* the ending is *-st*.',
  fa: 'با *du* پایانه *-st* است.',
  de: 'Bei *du* ist die Endung *-st*.',
}

/** The fixture content with the question "extra" added. */
export function withQuestion(question: Record<string, unknown>): Promise<string> {
  return fixtureContentWith({
    [PUBLISHED]: changeReviewedNode((node) => {
      node.questions.push({ id: 'extra', ...question, explanation })
    }),
  })
}

/** What the report says about the question "extra": where the problem is and the message. */
export async function problemsOfExtra(contentDir: string) {
  const { report, bundle } = await compileContent(contentDir)
  expect(bundle).toBeNull()
  for (const problem of report.errors) {
    expect(problem).toMatchObject({ file: PUBLISHED, node: 'grammar-001', question: 'extra' })
  }
  return report.errors.map(({ where, message }) => ({ where: where?.replace(/^questions\[\d+\]\./, ''), message }))
}

/** The page of the fixture's published grammar node. */
export function grammarContent(bundle: ContentBundle | null): GrammarContent | undefined {
  const content = bundle?.nodes.find((node) => node.id === 'grammar-001')?.content
  return content?.kind === 'grammar' ? content : undefined
}

/** The question "extra" as the app gets it. */
export async function compiledExtra(contentDir: string) {
  const { report, bundle } = await compileContent(contentDir)
  expect(report.errors).toEqual([])
  return grammarContent(bundle)?.questions.find((q) => q.id === 'extra')
}
