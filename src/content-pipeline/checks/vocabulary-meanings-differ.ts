import { asLearned, type NodeFile } from '../../content-model/index.ts'
import { type ContentCheck, type ContentProblem, problemIn } from './check.ts'

type Entry = NonNullable<NodeFile['words']>[number]

/** The texts by which a word is asked for and offered, one per language a learner may read in. */
const MEANINGS: Array<{ where: string; name: string; of: (entry: Entry) => string | undefined }> = [
  { where: 'meaning.en', name: 'meaning in en', of: (entry) => entry.meaning?.en },
  { where: 'meaning.fa', name: 'meaning in fa', of: (entry) => entry.meaning?.fa },
  { where: 'definition', name: 'definition', of: (entry) => entry.definition },
]

/**
 * No two words of a vocabulary node have the same meaning in a language.
 *
 * The test asks for a word by its meaning and offers meanings to choose
 * from. With the same meaning twice, a learner asked for one word could
 * rightly type the other, and would see the right option twice.
 *
 * Two words that really are the same thing ("Sofa", "Couch") may share a
 * meaning when they say so: each names the other in `tooCloseTo`, so neither
 * is offered beside the other, and lists it in `alsoAccepted`, so either is
 * right when one is asked for.
 */
export const vocabularyMeaningsDiffer: ContentCheck = ({ nodes }) => {
  const problems: ContentProblem[] = []
  for (const checked of nodes) {
    const words = checked.node.words ?? []
    for (const { where, name, of } of MEANINGS) {
      const first = new Map<string, number>()
      words.forEach((entry, index) => {
        const meaning = of(entry)?.normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
        if (meaning === undefined) return
        const earlier = first.get(meaning)
        const other = earlier === undefined ? undefined : words[earlier]
        if (other === undefined) {
          first.set(meaning, index)
        } else if (!standForEachOther(entry, other)) {
          problems.push(
            problemIn(checked, {
              where: `words[${index}].${where}`,
              message: `"${entry.word}" has the same ${name} as "${other.word}" (words[${earlier}]): "${of(entry)?.trim()}". Asked for either, both would be right; tell them apart`,
            }),
          )
        }
      })
    }
  }
  return problems
}

/** Whether each of the two is accepted for the other, and neither is offered as a wrong option for the other. */
function standForEachOther(a: Entry, b: Entry): boolean {
  const apart = a.tooCloseTo.includes(b.word) || b.tooCloseTo.includes(a.word)
  return apart && a.alsoAccepted.includes(asLearned(b)) && b.alsoAccepted.includes(asLearned(a))
}
