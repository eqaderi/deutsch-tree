/**
 * German text as the voice should say it. Piper misreads numbers written as
 * digits ("14:35 Uhr" comes out as "14 Uhr 5 und 30 Uhr", ticket #5), so every
 * number is written as words before it is spoken: times, dates, years,
 * amounts of money, percentages, decimals and plain numbers.
 *
 * A number in a form this does not know ("3.5.2025") is left as it is. The
 * content pipeline refuses spoken text that still holds a digit and names it,
 * so the voice never meets one.
 *
 * Words the voice says wrong however they stand are respelt for the voice
 * first, from the table in pronunciations.ts.
 *
 * The audio key is a hash of this text, so a change here (or in that table)
 * gives new audio to exactly the items whose spoken text changes.
 */

import { PRONUNCIATIONS } from './pronunciations.ts'

const ONES = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun']
const TEENS = [
  'zehn',
  'elf',
  'zwölf',
  'dreizehn',
  'vierzehn',
  'fünfzehn',
  'sechzehn',
  'siebzehn',
  'achtzehn',
  'neunzehn',
]
const TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig']
const MONTHS = 'Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember'

/** A number not touching another digit or a separator, so "3.5.2025" is never read in pieces. */
const ALONE_BEFORE = '(?<![\\d.,:])'
const ALONE_AFTER = '(?![\\d]|[.,:]\\d)'
/** Not inside a word: "\\b" knows no umlauts. */
const WORD_START = '(?<![\\p{L}\\p{N}])'
/** The words after which a date's ordinal ends in -en: "am dritten Mai", "bis fünften Mai". */
const DATE_EN = 'am|vom|zum|im|beim|dem|den|bis'

/** The words after which an ordinal before a noun ends in -en: "im dritten Stock", "den ersten Preis". */
const ORDINAL_EN = 'am|im|vom|zum|zur|beim|dem|den|des|jedem|jeden'
/** The words after which it ends in -e: "der dritte Stock", "die zweite Klasse", but "in der vierten Klasse". */
const ORDINAL_E = 'der|die|das|jede|jedes'
/** Prepositions that make "der" the Dativ of a feminine noun, so its ordinal ends in -en. */
const PREPOSITIONS = 'an|auf|aus|bei|hinter|in|mit|nach|neben|seit|über|unter|von|vor|zu|zwischen'

/** The words of a list as they are written in a sentence and at its start: "am|vom" matches "Am" too. */
function anyCase(words: string): string {
  return words
    .split('|')
    .map((word) => `[${word.charAt(0).toUpperCase()}${word.charAt(0)}]${word.slice(1)}`)
    .join('|')
}

/** Followed by a noun: "1500 Menschen" counts people and is no year. */
const BEFORE_A_NOUN = '\\s+\\p{Lu}'

/** 1 to 99. `ending` says whether the number ends here ("eins") or goes on ("ein" in "eintausend"). */
function belowHundred(n: number, ending: boolean): string {
  if (n === 1) return ending ? 'eins' : 'ein'
  if (n < 10) return ONES[n] as string
  if (n < 20) return TEENS[n - 10] as string
  const ones = n % 10
  const tens = TENS[Math.floor(n / 10)] as string
  return ones === 0 ? tens : `${ones === 1 ? 'ein' : ONES[ones]}und${tens}`
}

/** 1 to 999, written as one word. */
function belowThousand(n: number, ending: boolean): string {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  const head = hundreds === 0 ? '' : hundreds === 1 ? 'hundert' : `${ONES[hundreds]}hundert`
  return head + (rest === 0 ? '' : belowHundred(rest, ending))
}

/** A whole number as it is said: 85 "fünfundachtzig", 3700000 "drei Millionen siebenhunderttausend". */
function numberWords(n: number): string {
  if (n === 0) return 'null'
  const millions = Math.floor(n / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1000)
  const rest = n % 1000
  const parts: string[] = []
  if (millions > 0) parts.push(millions === 1 ? 'eine Million' : `${numberWords(millions)} Millionen`)
  const below =
    (thousands === 0 ? '' : thousands === 1 ? 'tausend' : `${belowThousand(thousands, false)}tausend`) +
    (rest === 0 ? '' : belowThousand(rest, true))
  if (below !== '') parts.push(below)
  return parts.join(' ')
}

/** "ein" before a word such as "Uhr" or "Euro", any other number as usual. */
function countWord(n: number): string {
  return n === 1 ? 'ein' : numberWords(n)
}

/** A year: 1990 "neunzehnhundertneunzig"; from 2000 on like any number. */
function yearWords(n: number): string {
  if (n >= 1100 && n < 2000) {
    const rest = n % 100
    return `${belowHundred(Math.floor(n / 100), false)}hundert${rest === 0 ? '' : belowHundred(rest, true)}`
  }
  return numberWords(n)
}

/** An ordinal with the ending its place asks for: "dritte", or "dritten" after "am". */
function ordinalWords(n: number, ending: 'e' | 'en'): string {
  const special: Record<number, string> = { 1: 'erst', 3: 'dritt', 7: 'siebt', 8: 'acht' }
  const stem = special[n] ?? (n < 20 ? `${numberWords(n)}t` : `${numberWords(n)}st`)
  return stem + ending
}

/** Digits after a decimal comma, one by one: "2,25" is "zwei Komma zwei fünf". */
function decimalWords(whole: string, fraction: string): string {
  return `${numberWords(Number(whole))} Komma ${[...fraction].map((digit) => ONES[Number(digit)]).join(' ')}`
}

const RULES: Array<[RegExp, (...groups: string[]) => string]> = [
  // A time: "14:35 Uhr", "14.35 Uhr", "8:05".
  [
    new RegExp(
      `${ALONE_BEFORE}(\\d{1,2}):(\\d{2})(?!\\d)(?:\\s*Uhr\\b)?|${ALONE_BEFORE}(\\d{1,2})\\.(\\d{2})\\s*Uhr\\b`,
      'g',
    ),
    (_match, hourColon, minuteColon, hourDot, minuteDot) => {
      const hour = Number(hourColon ?? hourDot)
      const minute = Number(minuteColon ?? minuteDot)
      return `${countWord(hour)} Uhr${minute === 0 ? '' : ` ${numberWords(minute)}`}`
    },
  ],
  // A full hour: "um 8 Uhr".
  [new RegExp(`${ALONE_BEFORE}(\\d{1,2})\\s+Uhr\\b`, 'g'), (_match, hour) => `${countWord(Number(hour))} Uhr`],
  // A range of days: "3.–5. Mai" is said "3. bis 5. Mai".
  [
    new RegExp(`${ALONE_BEFORE}(\\d{1,2})\\.\\s*[–-]\\s*(\\d{1,2})\\.(?=\\s+(?:${MONTHS})\\b)`, 'g'),
    (_match, first, last) => `${first}. bis ${last}.`,
  ],
  // A date: "am 3. Mai", "Am 25. Juli", "der 1. März", "bis 5. Mai", and the first day
  // of a range: "vom 3. bis (zum) 5. Mai".
  [
    new RegExp(
      `(${WORD_START}(?:${anyCase(DATE_EN)})\\s+)?${ALONE_BEFORE}(\\d{1,2})\\.(?=(?:\\s+bis(?:\\s+zum)?\\s+\\d{1,2}\\.)?\\s+(?:${MONTHS})\\b)`,
      'gu',
    ),
    (_match, before, day) => `${before ?? ''}${ordinalWords(Number(day), before ? 'en' : 'e')}`,
  ],
  // An ordinal before a noun, after a word that gives its ending: "im 3. Stock", "der 3. Stock",
  // "in der 4. Klasse". Without such a word ("Er ist 3. Seine …") the dot ends a sentence.
  [
    new RegExp(
      `${WORD_START}(?:(${anyCase(PREPOSITIONS)})\\s+)?(${anyCase(ORDINAL_EN)}|${anyCase(ORDINAL_E)})\\s+${ALONE_BEFORE}(\\d{1,2})\\.(?=${BEFORE_A_NOUN})`,
      'gu',
    ),
    (match, preposition, word, number) => {
      const plain = word.toLowerCase()
      const ending = ORDINAL_EN.split('|').includes(plain) || (plain === 'der' && preposition) ? 'en' : 'e'
      return `${match.slice(0, match.length - number.length - 1)}${ordinalWords(Number(number), ending)}`
    },
  ],
  // A thousands separator: "2.500" is 2500.
  [new RegExp(`${ALONE_BEFORE}(\\d{1,3}(?:\\.\\d{3})+)${ALONE_AFTER}`, 'g'), (number) => number.replaceAll('.', '')],
  // Money: "3,50 €", "12 Euro".
  [
    new RegExp(`${ALONE_BEFORE}(\\d+)(?:,(\\d{2}))?\\s*(?:€|Euro\\b)`, 'g'),
    (_match, euros, cents) => {
      const centWords = cents && Number(cents) > 0 ? numberWords(Number(cents)) : ''
      if (Number(euros) === 0 && centWords) return `${centWords} Cent`
      return `${countWord(Number(euros))} Euro${centWords ? ` ${centWords}` : ''}`
    },
  ],
  // A percentage: "20 %", "2,5%".
  [
    new RegExp(`${ALONE_BEFORE}(\\d+)(?:,(\\d+))?\\s*%`, 'g'),
    (_match, whole, fraction) => `${fraction ? decimalWords(whole, fraction) : numberWords(Number(whole))} Prozent`,
  ],
  // A decimal: "2,5".
  [
    new RegExp(`${ALONE_BEFORE}(\\d+),(\\d+)${ALONE_AFTER}`, 'g'),
    (_match, whole, fraction) => decimalWords(whole, fraction),
  ],
  // A year: four digits from 1100 to 1999, not before a noun.
  [
    new RegExp(`${ALONE_BEFORE}(1[1-9]\\d{2})${ALONE_AFTER}(?!${BEFORE_A_NOUN})`, 'gu'),
    (year) => yearWords(Number(year)),
  ],
  // Any other whole number. A 1 before a noun is left as a digit: "ein Bruder" or
  // "eine Schwester" depends on the noun, so the content check asks for it in words.
  [
    new RegExp(`${ALONE_BEFORE}(?!1${BEFORE_A_NOUN})(\\d{1,9})${ALONE_AFTER}`, 'gu'),
    (number) => numberWords(Number(number)),
  ],
]

/** Each word of the table, also with a capital at the start of a sentence, and how the voice is to say it. */
const RESPELT = new Map(
  Object.entries(PRONUNCIATIONS).flatMap(([word, said]) => {
    const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
    return [
      [capital(word), capital(said)],
      [word, said],
    ]
  }),
)
const ALTERNATIVES = [...RESPELT.keys()]
  .sort((a, b) => b.length - a.length)
  .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
const WORD = new RegExp(`${WORD_START}(?:${ALTERNATIVES.join('|')})(?![\\p{L}\\p{N}])`, 'gu')

/** The text as the voice says it: tidied, with the words it misreads respelt and every number it knows written as words. */
export function speakable(text: string): string {
  let spoken = text
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(WORD, (word) => RESPELT.get(word) as string)
  for (const [pattern, words] of RULES) {
    spoken = spoken.replace(pattern, (...args) => words(...(args.slice(0, -2) as string[])))
  }
  return spoken
}
