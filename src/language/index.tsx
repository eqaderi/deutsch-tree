/**
 * Language layer: which language the learner reads in, and the interface
 * strings for it.
 *
 * Only English exists so far. The language choice, Persian and simple German
 * strings, and right-to-left layout are added here; components already ask
 * this module for every word and for the language of explanations.
 */
import { createContext, useContext } from 'react'
import type { Language } from '../content-model/index.ts'
import { en, type Strings } from './strings.ts'

export interface LanguageState {
  /** The language of the interface and of explanations. */
  language: Language
  strings: Strings
}

const LanguageContext = createContext<LanguageState>({ language: 'en', strings: en })

export function useLanguage(): LanguageState {
  return useContext(LanguageContext)
}
