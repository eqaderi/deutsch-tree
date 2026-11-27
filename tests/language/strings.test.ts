import { describe, expect, it } from 'vitest'
import { allStrings } from '../../src/language/index.tsx'
import { persianProblem } from '../../src/content-pipeline/persian-texts.ts'

/**
 * The type checker already rejects a language that lacks a string. These
 * tests cover what it cannot see: open lists such as the level names, and
 * strings left empty.
 */

/** The path of every string in a language, for example "kinds.grammar". */
function paths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, inner]) => paths(inner, prefix ? `${prefix}.${key}` : key))
}

function emptyStrings(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return value.trim() === '' ? [prefix] : []
  if (typeof value !== 'object' || value === null) return []
  return Object.entries(value).flatMap(([key, inner]) => emptyStrings(inner, prefix ? `${prefix}.${key}` : key))
}

/**
 * The argument given to every Persian string that is a function. As a number
 * it is 7 (formatted by the string, so in Persian digits); as text it is a
 * Persian word, standing for a title or a level that the string only places.
 */
const ARGUMENT = { valueOf: () => 7, toString: () => 'نام' }

/** Every Persian string with its path, a function's with ARGUMENT for each parameter. */
function persianStrings(value: unknown = allStrings.fa, prefix = ''): Array<{ path: string; text: string }> {
  if (typeof value === 'string') return [{ path: prefix, text: value }]
  if (typeof value === 'function') {
    return persianStrings(value(...Array.from({ length: value.length }, () => ARGUMENT)), prefix)
  }
  if (typeof value !== 'object' || value === null) return []
  return Object.entries(value).flatMap(([key, inner]) => persianStrings(inner, prefix ? `${prefix}.${key}` : key))
}

/**
 * The text with what stands between U+2066 and U+2069 (German or a name,
 * kept left to right by `german()`) in asterisks, as content marks German.
 */
function markedAsInContent(text: string): string {
  return text.replace(/⁦([^⁩]*)⁩/g, '*$1*')
}

describe('interface strings', () => {
  it('offers English, Persian and simple German', () => {
    expect(Object.keys(allStrings).sort()).toEqual(['de', 'en', 'fa'])
  })

  it.each(['fa', 'de'] as const)('%s has every string that English has, and no other', (language) => {
    expect(paths(allStrings[language]).sort()).toEqual(paths(allStrings.en).sort())
  })

  it.each(['en', 'fa', 'de'] as const)('%s has no empty string', (language) => {
    expect(emptyStrings(allStrings[language])).toEqual([])
  })

  it('holds Persian to content/persian-style.md as content is: Latin text marked, Persian letters, digits and half-spaces', () => {
    // A string that is Latin only, such as an answer *Richtig*, needs nothing.
    const problems = persianStrings()
      .filter(({ text }) => /\p{Script=Arabic}/u.test(text))
      .map(({ path, text }) => [path, persianProblem(markedAsInContent(text))])
      .filter(([, problem]) => problem !== undefined)
    expect(problems).toEqual([])
  })

  it('writes numbers in Persian digits in Persian, and in Latin digits otherwise', () => {
    expect(allStrings.fa.number(1234)).toBe('۱۲۳۴')
    expect(allStrings.fa.topicCount(12)).toBe('۱۲ موضوع')
    expect(allStrings.en.number(1234)).toBe('1234')
    expect(allStrings.de.topicCount(12)).toBe('12 Themen')
  })
})
