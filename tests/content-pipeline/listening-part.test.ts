import { expect, test } from 'vitest'
import { hasPractice } from '../../src/content-model/scoring.ts'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { blindPool } from '../../src/content-pipeline/review.ts'
import {
  changeNode,
  changeReviewedNode,
  EXAM_PART,
  fixtureContent,
  fixtureContentWith,
  LISTENING_PART,
} from './fixture.ts'

/**
 * A listening part: its practice task is a conversation that the learner
 * hears, each line in the voice of its speaker. The keys below were worked
 * out outside the code, as the first 16 hex digits of
 * `printf '<voice>\n<spoken text>' | shasum -a 256`.
 */
const HALLO_JONAS = 'c09f5744233f9743'
const ZWEI_WOCHEN_AM_MEER = '9d0cd9a15da89407'

async function listeningPart() {
  const { report, bundle } = await compileContent(fixtureContent)
  expect(report.errors).toEqual([])
  const content = bundle?.nodes.find((node) => node.id === 'exam-hoeren-3')?.content
  if (!content || !hasPractice(content)) throw new Error('the fixture listening part has no practice tasks')
  return content
}

test('each line of a conversation names its speaker and is heard in that speaker’s voice', async () => {
  const content = await listeningPart()

  const [text] = content.practice[0]?.texts ?? []
  expect(text).toMatchObject({ id: 'a', title: 'Nach dem Urlaub' })
  if (!text || !('lines' in text)) throw new Error('the fixture conversation has no lines')
  expect(text.lines).toHaveLength(8)
  expect(text.lines.slice(0, 2)).toEqual([
    {
      speaker: 'Lena',
      text: 'Hallo Jonas, schön, dich zu sehen! Wie war dein Urlaub?',
      audio: { key: HALLO_JONAS, voice: 'kerstin', text: 'Hallo Jonas, schön, dich zu sehen! Wie war dein Urlaub?' },
    },
    {
      speaker: 'Jonas',
      text: 'Danke, sehr gut. Ich war zwei Wochen am Meer, in Kiel.',
      audio: {
        key: ZWEI_WOCHEN_AM_MEER,
        voice: 'thorsten',
        text: 'Danke, sehr gut. Ich war zwei Wochen am Meer, in Kiel.',
      },
    },
  ])
})

/** The problems of the fixture content with the listening part changed, as place and message. */
async function problemsWith(change: Parameters<typeof changeReviewedNode>[0]) {
  const content = await fixtureContentWith({ [LISTENING_PART]: changeReviewedNode(change) })
  const { report } = await compileContent(content, { requireAudio: false })
  return report.errors.map(({ where, message }) => ({ where, message }))
}

test('a line whose speaker is not a speaker of its text is rejected', async () => {
  const problems = await problemsWith((node) => {
    node.practice[0].texts[0].lines[1].speaker = 'Jona'
  })

  expect(problems).toEqual([
    {
      where: 'practice[0].texts[0].lines[1].speaker',
      message: '"Jona" is not a speaker of this text; its speakers are Lena, Jonas',
    },
  ])
})

test('two speakers of one text in the same voice are rejected: the learner could not tell them apart', async () => {
  const problems = await problemsWith((node) => {
    node.practice[1].texts[0].speakers[1].voice = 'thorsten'
  })

  expect(problems).toEqual([
    {
      where: 'practice[1].texts[0].speakers[1].voice',
      message: 'is also the voice of Jonas: the speakers of one text are told apart by their voices',
    },
  ])
})

test('a text is read or heard: a body, or speakers and lines', async () => {
  expect(
    await problemsWith((node) => {
      node.practice[0].texts[0].body = 'Ein Text zum Lesen.'
    }),
  ).toEqual([
    { where: 'practice[0].texts[0].speakers', message: 'belongs to a text to hear; a text to read has its body only' },
    { where: 'practice[0].texts[0].lines', message: 'belongs to a text to hear; a text to read has its body only' },
  ])
  expect(
    await problemsWith((node) => {
      delete node.practice[0].texts[0].speakers
    }),
  ).toEqual([{ where: 'practice[0].texts[0].speakers', message: 'is missing: a text to hear names its speakers' }])
})

test('a listening part whose text is to be read is not the format of its part', async () => {
  const problems = await problemsWith((node) => {
    node.practice[1].texts[0] = { id: 'a', body: 'Jonas macht am Freitag eine Party.' }
  })

  expect(problems).toEqual([
    {
      where: 'practice[1].texts[0]',
      message:
        'not the format of Hören, Teil 3: its texts are heard (speakers and lines), text "a" of task "t2" is read',
    },
  ])
})

test('a reading part whose text is to be heard is not the format of its part', async () => {
  const content = await fixtureContentWith({
    [EXAM_PART]: changeReviewedNode((node) => {
      node.practice[0].texts[0] = {
        id: 'a',
        speakers: [{ name: 'Tom', voice: 'thorsten' }],
        lines: [{ speaker: 'Tom', text: 'Ich wohne seit Mai in Bonn.' }],
      }
    }),
  })

  const { report } = await compileContent(content, { requireAudio: false })

  expect(report.errors.map(({ where, message }) => ({ where, message }))).toEqual([
    {
      where: 'practice[0].texts[0]',
      message: 'not the format of Lesen, Teil 1: its texts are read (a body), text "a" of task "t1" is heard',
    },
  ])
})

test('a conversation of Hören, Teil 3 has two speakers', async () => {
  const problems = await problemsWith((node) => {
    const [text] = node.practice[0].texts
    text.speakers.pop()
    for (const line of text.lines) line.speaker = 'Lena'
  })

  expect(problems).toEqual([
    {
      where: 'practice[0].texts[0].speakers',
      message: 'not the format of Hören, Teil 3: each of its texts has 2 speakers, text "a" of task "t1" has 1',
    },
  ])
})

test('the review sheet of a listening part holds what is said, line by line with its speaker, and no voice', async () => {
  const sheet = await blindPool(fixtureContent, 'exam-hoeren-3')

  expect(sheet.tasks?.map((task) => task.id)).toEqual(['t1', 't2'])
  const [text] = sheet.tasks?.[1]?.texts ?? []
  expect(text).toEqual({
    id: 'a',
    title: 'Die Party',
    lines: expect.arrayContaining([{ speaker: 'Lena', text: 'Soll ich etwas mitbringen?' }]),
  })
  expect(sheet.instructions).toContain('heard')
  expect(JSON.stringify(sheet)).not.toContain('kerstin')
  expect(sheet.questions).toHaveLength(14)
})

test('the voice of a speaker may change after the review; what is said may not', async () => {
  const otherVoices = await fixtureContentWith({
    [LISTENING_PART]: changeNode((node) => {
      node.practice[0].texts[0].speakers = [
        { name: 'Lena', voice: 'thorsten' },
        { name: 'Jonas', voice: 'kerstin' },
      ]
    }),
  })
  const otherWords = await fixtureContentWith({
    [LISTENING_PART]: changeNode((node) => {
      node.practice[0].texts[0].lines[4].text = 'Bist du mit dem Bus gefahren?'
    }),
  })

  const problems = async (content: string) =>
    (await compileContent(content, { requireAudio: false })).report.errors.map((error) => error.where)

  expect(await problems(otherVoices)).toEqual([])
  expect(await problems(otherWords)).toEqual(['review'])
})
