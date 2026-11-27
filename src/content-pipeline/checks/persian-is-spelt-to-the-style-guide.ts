import { misspeltPersian } from '../../language/persian-spelling.ts'
import { CHAPTERS_FILE, type ContentCheck, type ContentProblem, problemIn } from './check.ts'
import { persianTextsOf } from './german-in-persian-is-marked.ts'

/**
 * Persian text follows the spelling of content/persian-style.md: Persian ی
 * and ک, Persian digits, and a half-space after می and before ها. German in
 * asterisks is left alone. It covers the same texts as the rule that German
 * stands in asterisks, the meanings of words, and the chapter names.
 */
export const persianIsSpeltToTheStyleGuide: ContentCheck = ({ nodes, chapters }) => {
  const problems: ContentProblem[] = []

  for (const checked of nodes) {
    const texts: Array<{ where: string; text: string; question?: string }> = [
      ...persianTextsOf(checked.node),
      ...(checked.node.words ?? []).flatMap((word, index) =>
        word.meaning === undefined ? [] : [{ where: `words[${index}].meaning.fa`, text: word.meaning.fa }],
      ),
    ]
    for (const { where, text, question } of texts) {
      const message = misspeltPersian(text)
      if (message) problems.push(problemIn(checked, { ...(question ? { question } : {}), where, message }))
    }
  }

  ;(chapters ?? []).forEach((chapter, index) => {
    const message = misspeltPersian(chapter.title.fa)
    if (message) problems.push({ file: CHAPTERS_FILE, where: `[${index}].title.fa`, message })
  })

  return problems
}
