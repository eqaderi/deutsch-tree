import type { ReactNode } from 'react'
import type { RichText as RichTextParts } from '../content-model/index.ts'

/** German text. It always reads left to right, also inside a right-to-left page. */
export function German({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span lang="de" dir="ltr" className={className ? `de ${className}` : 'de'}>
      {children}
    </span>
  )
}

/**
 * The same text as one string, for the places that take nothing else: the
 * name of the browser tab, and a string that an interface string is built
 * around. The German parts are wrapped in the Unicode marks that keep them
 * left to right ("first strong isolate" U+2066 … U+2069), since a string
 * cannot hold a <span>.
 */
export function plainText(parts: RichTextParts): string {
  return parts.map((part) => (typeof part === 'string' ? part : `\u2066${part.de}\u2069`)).join('')
}

/** Learner-language text with its German parts marked as German. */
export function RichText({ parts }: { parts: RichTextParts }) {
  return parts.map((part, index) => (typeof part === 'string' ? part : <German key={index}>{part.de}</German>))
}
