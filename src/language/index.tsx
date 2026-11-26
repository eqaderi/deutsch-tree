/**
 * Language layer: which language the learner reads in, the interface strings
 * for it, and the direction of the page.
 *
 * A component reads everything through `useLanguage()`:
 *
 *   const { language, strings, setLanguage } = useLanguage()
 *
 * `strings` holds every interface word, `language` picks the explanation out
 * of node content (`node.title[language]`). Changing the language only
 * re-renders what is on screen: no navigation, no reload, so the learner
 * stays where they are and nothing they have typed or answered is lost.
 */
import { createContext, type ReactNode, useContext, useLayoutEffect, useMemo, useState } from 'react'
import type { Language } from '../content-model/index.ts'
import { de } from './strings.de.ts'
import { fa } from './strings.fa.ts'
import { en, type Strings } from './strings.ts'

export type { Strings }
export type Direction = 'ltr' | 'rtl'

/** The interface strings of every language. */
export const allStrings: Record<Language, Strings> = { en, fa, de }

/** Each language's name, written in that language, in the order they are offered. */
export const languageNames: Record<Language, string> = { en: 'English', fa: 'فارسی', de: 'Deutsch' }

export interface LanguageState {
  /** The language of the interface and of explanations. */
  language: Language
  strings: Strings
  /** The direction the page is laid out in. German is left to right in both. */
  direction: Direction
  /** Changes the language and remembers the choice on this device. */
  setLanguage: (language: Language) => void
}

const STORAGE_KEY = 'deutsch-tree.language'

function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && Object.hasOwn(allStrings, value)
}

/** The remembered choice. On a first visit: Persian for a Persian browser, otherwise English. */
function languageOnArrival(): Language {
  try {
    const remembered = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(remembered)) return remembered
  } catch {
    // Storage can be switched off. The choice then lasts until the page is closed.
  }
  return navigator.language.toLowerCase().startsWith('fa') ? 'fa' : 'en'
}

function remember(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // See languageOnArrival.
  }
}

const LanguageContext = createContext<LanguageState | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState(languageOnArrival)
  const direction: Direction = language === 'fa' ? 'rtl' : 'ltr'

  // Before the browser paints, so a Persian page never shows left to right first.
  useLayoutEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = direction
    document.querySelector('meta[name="description"]')?.setAttribute('content', allStrings[language].appDescription)
  }, [language, direction])

  const state = useMemo<LanguageState>(
    () => ({
      language,
      strings: allStrings[language],
      direction,
      setLanguage: (next) => {
        remember(next)
        setLanguage(next)
      },
    }),
    [language, direction],
  )
  return <LanguageContext value={state}>{children}</LanguageContext>
}

export function useLanguage(): LanguageState {
  const state = useContext(LanguageContext)
  if (!state) throw new Error('useLanguage() needs a <LanguageProvider> above it')
  return state
}
