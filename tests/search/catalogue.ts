import type { Localised, NodeSummary, RichText, SearchData } from '../../src/content-model/index.ts'

/**
 * A small invented catalogue to search in: three written topics and one that
 * is coming soon, in curriculum order.
 */
export const nodes: NodeSummary[] = [
  topic('grammar-001', 'published', {
    en: ['Present tense'],
    fa: ['زمان حال'],
    de: ['Präsens'],
  }),
  topic('grammar-002', 'published', {
    en: ['The verb ', { de: 'sein' }],
    fa: ['فعل ', { de: 'sein' }],
    de: ['Das Verb ', { de: 'sein' }],
  }),
  topic('grammar-003', 'published', {
    en: ['Questions with a question word'],
    fa: ['پرسش با کلمهٔ پرسشی'],
    de: ['W-Fragen'],
  }),
  topic('grammar-004', 'coming-soon', {
    en: ['Modal verbs'],
    fa: ['فعل‌های کمکی'],
    de: ['Modalverben: ', { de: 'können' }, ', ', { de: 'müssen' }],
  }),
]

/** What the three written topics say, per language. */
export const data: Localised<SearchData> = {
  en: {
    entries: [
      entry('grammar-001', [
        ['A regular verb keeps its stem. With ', { de: 'ich' }, ' the ending is ', { de: '-e' }, '.'],
        [{ de: 'du · wohnst' }],
        [{ de: 'Ich wohne in der Goethestraße.' }, ' – I live in Goethe Street.'],
      ]),
      entry('grammar-002', [
        [{ de: 'sein' }, ' is irregular. It is the first verb to learn.'],
        [{ de: 'Wir sind müde.' }, ' – We are tired.'],
      ]),
      entry('grammar-003', [
        ['The question word stands first, the verb second. Present tense is enough here.'],
        [{ de: 'Wo wohnst du?' }, ' – Where do you live?'],
      ]),
    ],
  },
  fa: {
    entries: [
      entry('grammar-001', [
        ['فعل باقاعده ریشه‌اش را نگه می‌دارد. با ', { de: 'ich' }, ' پایانه ', { de: '-e' }, ' است.'],
        [{ de: 'Ich wohne in der Goethestraße.' }, ' – من در خیابان گوته زندگی می‌کنم.'],
      ]),
      entry('grammar-002', [[{ de: 'Wir sind müde.' }, ' – ما خسته‌ایم. آب کجاست؟']]),
      entry('grammar-003', [[{ de: 'Wo wohnst du?' }, ' – تو کجا زندگی می‌کنی؟']]),
    ],
  },
  de: {
    entries: [
      entry('grammar-001', [['Ein Verb behält den Stamm.'], [{ de: 'Ich wohne in der Goethestraße.' }]]),
      entry('grammar-002', [[{ de: 'Wir sind müde.' }]]),
      entry('grammar-003', [[{ de: 'Wo wohnst du?' }]]),
    ],
  },
}

function topic(id: string, status: NodeSummary['status'], title: Localised<RichText>): NodeSummary {
  return {
    id,
    kind: 'grammar',
    level: 'A1',
    chapter: 'verbs',
    order: Number(id.slice(-3)),
    status,
    recogniseOnly: false,
    prerequisites: [],
    title,
  }
}

function entry(node: string, passages: RichText[]) {
  return { node, passages }
}
