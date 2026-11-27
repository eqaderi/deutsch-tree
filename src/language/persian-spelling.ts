/**
 * The spelling rules of content/persian-style.md that a program can see:
 * Persian letters, Persian digits, and the half-space (U+200C) that joins
 * the prefix می and the plural ها to their word. Wording and register are
 * the reader's to judge; these are not.
 *
 * Text between asterisks is German and keeps its own letters and digits.
 * Interface strings mark German with Unicode isolates instead; the caller
 * removes those before asking.
 */

const ARABIC_LETTERS: Array<[arabic: string, persian: string]> = [
  ['ي', 'ی'],
  ['ى', 'ی'],
  ['ك', 'ک'],
]

const PREFIX_THEN_SPACE = /(?<![\p{L}\p{M}‌])(ن?می) (?=\p{Script=Arabic})/u
const SPACE_THEN_PLURAL = /(?<=\p{Script=Arabic}) (ها(?:ی|یی|یم|یت|یش|یمان|یتان|یشان)?)(?![\p{L}\p{M}])/u

/** What breaks the spelling rules in the Persian text, or nothing. Only the first problem is named. */
export function misspeltPersian(text: string): string | undefined {
  const persian = text.replace(/\*[^*]+\*/g, ' ')

  for (const [arabic, letter] of ARABIC_LETTERS) {
    if (persian.includes(arabic)) return `Arabic letter "${arabic}" in Persian text: write the Persian "${letter}"`
  }

  const latinDigit = /[0-9]/.exec(persian)?.[0]
  if (latinDigit) return `Latin digit "${latinDigit}" in Persian text: write Persian digits (۰ to ۹)`
  const arabicDigit = /[٠-٩]/.exec(persian)?.[0]
  if (arabicDigit) return `Arabic digit "${arabicDigit}" in Persian text: write Persian digits (۰ to ۹)`

  const prefix = PREFIX_THEN_SPACE.exec(persian)?.[1]
  if (prefix) return `A space after "${prefix}" in Persian text: join it with a half-space (U+200C), "${prefix}‌"`
  const plural = SPACE_THEN_PLURAL.exec(persian)?.[1]
  if (plural) return `A space before "${plural}" in Persian text: join it with a half-space (U+200C), "‌${plural}"`

  return undefined
}
