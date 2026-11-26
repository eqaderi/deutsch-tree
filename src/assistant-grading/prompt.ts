/**
 * The prompt a learner pastes into an AI assistant to have one writing task
 * graded, or to do one speaking part by voice and have it graded.
 *
 * Decisions that hold for every prompt:
 *   - The instructions are in English: one wording to maintain and to check,
 *     in the language assistants follow most reliably. The learner does not
 *     need to read them.
 *   - The task and the official criteria are in German, as in the exam. The
 *     official terms are never translated.
 *   - A speaking part is held in German only.
 *   - The assistant answers the learner in the learner's language (English,
 *     Persian or simple German), with the official terms and every quotation
 *     kept in German. A learner who reads only Persian can follow the rating.
 *   - The assistant gives a band per criterion with evidence, only the
 *     official point values, and one score out of 100 at the very end. The
 *     learner types that number into the app.
 */
import type { ExamTask, Language } from '../content-model/index.ts'
import { BANDS, type Criterion, type Marking, markingOf, wordsAskedFor } from './criteria.ts'
import { PRONUNCIATION_SHARE, scoreOutOf100 } from './score.ts'
import { sheetAsText, taskSheet } from './task-sheet.ts'

type WritingTask = Extract<ExamTask, { module: 'schreiben' }>
type SpeakingTask = Extract<ExamTask, { module: 'sprechen' }>

/** The text to paste into an AI assistant for this task. `language` is the language the learner reads. */
export function assistantPrompt(task: ExamTask, language: Language): string {
  return task.module === 'schreiben' ? writingPrompt(task, language) : speakingPrompt(task, language)
}

/** How the assistant is told which language to answer the learner in. */
const ANSWER_LANGUAGE: Record<Language, string> = {
  en: 'in English',
  fa: 'in Persian (فارسی)',
  de: 'in simple German (short sentences and common words, at about level A2)',
}

// ---------------------------------------------------------------------------
// Schreiben
// ---------------------------------------------------------------------------

function writingPrompt(task: WritingTask, language: Language): string {
  const marking = markingOf(task)
  const words = wordsAskedFor(task.part)
  // One criterion at band A and the others at band B: an example with a half point in it.
  const examplePoints = marking.criteria.reduce(
    (sum, criterion, index) => sum + criterion.points[index === 0 ? 0 : 1],
    0,
  )

  return joinSections([
    `You are an examiner for the writing module (Schreiben) of the Goethe-Zertifikat B1 exam. I am preparing for this exam. Below are one exam task, the official marking criteria, and at the very end the text I wrote for the task. Rate my text exactly as a trained examiner rates the text of an unknown candidate in the real exam.`,

    `# The task\n\n${sheetAsText(taskSheet(task))}`,

    [
      '# The official marking criteria',
      `Rate the text on these ${marking.criteria.length} criteria. Give each criterion exactly one band, from A (best) to E. Every band has a fixed number of points: give only these values, never a value in between. The German terms are the official ones; use them as they stand.`,
      criteriaList(marking.criteria),
      `The task gives at most ${marking.maximum} points.`,
      [
        'Two official rules:',
        '- If Erfüllung is E, the whole task scores 0 points, whatever the language is like.',
        `- Erfüllung is E when the text has less than half of the length asked for, or misses the topic. This task asks for about ${words} words, so a text with fewer than ${words / 2} words scores 0. Count the words yourself; do not estimate.`,
      ].join('\n'),
    ].join('\n\n'),

    [
      '# Grade strictly',
      'This score decides whether I am ready for the real exam. A score that is too high harms me: I would stop practising too early. A score that is too low costs me only some more practice. So:',
      [
        '- When you are unsure between two bands, give the lower one.',
        '- Give a band only when the text fits its whole descriptor. Do not give a band for effort, for length, or because the text can be understood.',
        '- Justify every band with evidence: quote the exact words of my text that decided it. If you cannot quote evidence for a band, the band is too high.',
        '- Rate the text exactly as I wrote it. Do not correct it in your head first, do not guess what I meant, and do not rate what I could have written.',
        '- Rate against level B1, as the exam does: not against a native speaker, and not more gently because I am a learner.',
        '- Do not soften the result to encourage me. If I argue with the score afterwards, change it only when I show you evidence in the text that you missed.',
      ].join('\n'),
    ].join('\n\n'),

    [
      '# Your answer',
      `Write your answer ${ANSWER_LANGUAGE[language]}. Keep the official German terms and everything you quote from my text in German.`,
      [
        '1. The number of words you counted.',
        '2. For each criterion: the band, the points, and the reason with quotations from my text.',
        `3. The points for the task: the sum of the criteria, or 0 if Erfüllung is E, out of ${marking.maximum}.`,
        `4. The score out of 100: points × 100 ÷ ${marking.maximum}, rounded to a whole number (a half is rounded up). For example, ${examplePoints} points give ${scoreOutOf100(task, { task: examplePoints })}.`,
        '5. The three corrections that would raise the score most: what I wrote, the correct German, and why, in one sentence each.',
      ].join('\n'),
      'End your answer with this line on its own, so that I can find the number:',
      'SCORE: <number>/100',
    ].join('\n\n'),

    'If no text follows below, ask me for it and wait. Do not write a text for me.',

    'My text:',
  ])
}

// ---------------------------------------------------------------------------
// Sprechen
// ---------------------------------------------------------------------------

/** What happens in each speaking part, and what the assistant does in it. */
const SPEAKING_PARTS: Record<SpeakingTask['part'], { inTheExam: string; roles: string; steps: string[] }> = {
  1: {
    inTheExam: 'In the exam, two candidates plan something together for about 3 minutes.',
    roles: 'I am one candidate. During the conversation you are the other candidate; afterwards you are the examiner.',
    steps: [
      'When I say hello, speak as the examiner, in German: say in one or two sentences what we are going to plan, then say „Bitte beginnen Sie.“ From then on you are my partner.',
      'As my partner, plan with me as an equal. Let me start if I do; otherwise make the first suggestion. Bring suggestions of your own, and disagree with some of mine and say why, so that I have to react, give reasons and find a compromise. Ask me what I think. Do not decide everything yourself and do not agree with everything. Do not lead me through the points of the task sheet: raise a point only when I have left it out.',
      'After about 3 minutes, or when we have decided on every point, speak as the examiner again: „Vielen Dank. Das ist das Ende von Teil 1.“ Then rate me.',
    ],
  },
  2: {
    inTheExam: 'In the exam, a candidate gives a presentation of about 3 minutes on a topic, along five slides.',
    roles: 'I am the candidate. You are the examiner, who listens and afterwards rates me.',
    steps: [
      'When I say hello, speak as the examiner, in German: „Bitte präsentieren Sie jetzt Ihr Thema.“',
      'While I present, do not interrupt, do not ask and do not comment. A voice assistant answers after every pause; whenever I pause, say only „Mhm.“ and let me go on.',
      'The presentation is over when I thank the audience or say that I have finished, or after about 4 minutes. If I stop without closing, ask once: „Möchten Sie noch etwas sagen?“',
      'Then say: „Vielen Dank. Das ist das Ende von Teil 2.“ Then rate me.',
    ],
  },
  3: {
    inTheExam:
      'In the exam, this part follows the presentations: a candidate gives feedback on the other candidate’s presentation and asks a question about it, and answers questions on the topic. It takes about 2 minutes.',
    roles:
      'I am the candidate. You are first the other candidate, who has to present; then the examiner, who asks me questions and afterwards rates me.',
    steps: [
      'When I say hello, give a short presentation on the topic of the task sheet, as the other candidate, in German at level B1: six to eight sentences, with one experience of your own and a clear opinion. End by thanking the audience.',
      'Then speak as the examiner: „Bitte geben Sie eine Rückmeldung und stellen Sie eine Frage.“ Wait for my feedback and for my question. Answer the question as the other candidate, in two sentences. If I ask no question, do not remind me.',
      'Then, as the examiner, ask me two questions about the same topic, one at a time: about my own experience and about my opinion. Wait for each answer and do not help me with it.',
      'Then say: „Vielen Dank. Das ist das Ende von Teil 3.“ Then rate me.',
    ],
  },
}

function speakingPrompt(task: SpeakingTask, language: Language): string {
  const marking = markingOf(task) as Marking & { pronunciation: Criterion }
  const part = SPEAKING_PARTS[task.part]
  const sheet = taskSheet(task)
  const partShare = 100 - PRONUNCIATION_SHARE
  // Three quarters of the part's points and band B for Aussprache.
  const example = { task: (marking.maximum * 3) / 4, pronunciation: marking.pronunciation.points[1] }

  return joinSections([
    `We are going to do one part of the speaking module (Sprechen) of the Goethe-Zertifikat B1 exam together, by voice, and afterwards you rate me as an examiner does. I am preparing for this exam. We speak; we do not type.`,

    [
      `# The part: ${sheet.title}`,
      `${part.inTheExam} ${part.roles}`,
      'This is the task sheet. I have it in front of me.',
      sheetAsText({ ...sheet, title: '' }).trim(),
    ].join('\n\n'),

    [
      '# How to run the part',
      numbered([
        `Answer this message with one short sentence ${ANSWER_LANGUAGE[language]}: tell me to switch to voice mode and to say „Hallo“ when I am ready. Say nothing else yet.`,
        ...part.steps,
      ]),
      [
        'Rules until the part has ended:',
        '- Speak only German, at a natural speed and at level B1. If I use another language or ask for help, answer in German, as in the exam.',
        '- Do not help me: no corrections, no translations, no missing words, no praise and no remarks about my German.',
        '- Apart from what the steps above ask of you, keep each of your turns to one or two sentences, so that I do most of the talking.',
        '- Do not rate anything before the part has ended.',
      ].join('\n'),
    ].join('\n\n'),

    [
      '# Then rate me with the official marking criteria',
      `Now you are the examiner. Rate what I said in this part on these ${marking.criteria.length + 1} criteria. Give each criterion exactly one band, from A (best) to E. Every band has a fixed number of points: give only these values, never a value in between. The German terms are the official ones; use them as they stand.`,
      criteriaList([...marking.criteria, marking.pronunciation]),
      `The part gives at most ${marking.maximum} points, without Aussprache.`,
      [
        'Rules:',
        '- If Erfüllung is E, the whole part scores 0 points, and so does Aussprache: there is nothing to rate it on.',
        '- In the exam, Aussprache is rated once for all three parts together. Here, rate it on this part alone.',
        '- Rate Aussprache only from what you heard. If I typed instead of speaking, you cannot rate it: do not give a score, and tell me to do the part again in voice mode.',
      ].join('\n'),
    ].join('\n\n'),

    [
      '# Grade strictly',
      'This score decides whether I am ready for the real exam. A score that is too high harms me: I would stop practising too early. A score that is too low costs me only some more practice. So:',
      [
        '- When you are unsure between two bands, give the lower one.',
        '- Give a band only when what I said fits its whole descriptor. Do not give a band for effort or because you could understand me.',
        '- Rate only what I said myself. What you said as my partner or examiner earns me nothing, and if I said little, Erfüllung is low.',
        '- Justify every band with evidence: quote something I really said. If you cannot quote evidence for a band, the band is too high.',
        '- Rate against level B1, as the exam does: not against a native speaker, and not more gently because I am a learner.',
        '- Do not soften the result to encourage me. If I argue with the score afterwards, do not change it without new evidence.',
      ].join('\n'),
    ].join('\n\n'),

    [
      '# The score out of 100',
      `Add up the points of the criteria of the part (0 if Erfüllung is E). Then: score = points × ${partShare} ÷ ${marking.maximum} + Aussprache points, rounded to a whole number (a half is rounded up). The part counts for ${partShare} and Aussprache for ${PRONUNCIATION_SHARE}, because Aussprache is ${PRONUNCIATION_SHARE} of the 100 points of the module in the exam. For example, ${example.task} points and ${example.pronunciation} for Aussprache: ${example.task} × ${partShare} ÷ ${marking.maximum} + ${example.pronunciation} = ${scoreOutOf100(task, example)}.`,
    ].join('\n\n'),

    [
      '# How to give the rating',
      `Give the rating ${ANSWER_LANGUAGE[language]}. Keep the official German terms and everything you quote from me in German. I only hear you, so speak in short sentences, without lists or tables.`,
      'Say, in this order: for each criterion the band, the points and what I said that decided it; the points for the part; the calculation; the two things I should practise most.',
      'Make the score your last sentence, said slowly, as one number: "<number> out of 100". I will write that number down.',
    ].join('\n\n'),
  ])
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/** "1. Erfüllung (aspects)", its points for each band, and the descriptor of each band. */
function criteriaList(criteria: Criterion[]): string {
  return criteria
    .map((criterion, index) => {
      const points = BANDS.map((band, place) => `${band} = ${criterion.points[place]}`).join(' | ')
      const descriptors = BANDS.map((band, place) => {
        const descriptor = criterion.descriptors[place]
        return `   ${band}: ${descriptor ?? 'the official table has no descriptor; give E only when even D is not reached'}`
      })
      return [`${index + 1}. ${criterion.name} (${criterion.aspects})`, `   Points: ${points}`, ...descriptors].join(
        '\n',
      )
    })
    .join('\n\n')
}

function numbered(steps: string[]): string {
  return steps.map((step, index) => `${index + 1}. ${step}`).join('\n')
}

function joinSections(sections: string[]): string {
  return `${sections.join('\n\n')}\n`
}
