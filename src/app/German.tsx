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

/** Learner-language text with its German parts marked as German. */
export function RichText({ parts }: { parts: RichTextParts }) {
  return parts.map((part, index) => (typeof part === 'string' ? part : <German key={index}>{part.de}</German>))
}
