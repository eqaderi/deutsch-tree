import { describe, expect, it } from 'vitest'
import { allStrings } from '../../src/language/index.tsx'

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

  it('writes numbers in Persian digits in Persian, and in Latin digits otherwise', () => {
    expect(allStrings.fa.number(1234)).toBe('۱۲۳۴')
    expect(allStrings.fa.topicCount(12)).toBe('۱۲ موضوع')
    expect(allStrings.en.number(1234)).toBe('1234')
    expect(allStrings.de.topicCount(12)).toBe('12 Themen')
  })
})
