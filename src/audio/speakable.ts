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
 * The audio key is a hash of this text, so a change here gives new audio to
 * exactly the items whose spoken text changes.
 */

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
export function numberWords(n: number): string {
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
  // A date: "am 3. Mai", "der 1. März".
  [
    new RegExp(`(\\b(?:am|vom|zum|im|beim|dem|den)\\s+)?${ALONE_BEFORE}(\\d{1,2})\\.(?=\\s+(?:${MONTHS})\\b)`, 'g'),
    (_match, before, day) => `${before ?? ''}${ordinalWords(Number(day), before ? 'en' : 'e')}`,
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

/** The text as the voice says it: tidied, and with every number it knows written as words. */
export function speakable(text: string): string {
  let spoken = text.normalize('NFC').replace(/\s+/g, ' ').trim()
  for (const [pattern, words] of RULES) {
    spoken = spoken.replace(pattern, (...args) => words(...(args.slice(0, -2) as string[])))
  }
  return spoken
}
