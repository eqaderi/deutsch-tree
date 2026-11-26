import type { RichText } from './index.ts'

/**
 * Rich text as one plain string: the German parts lose their mark. For
 * search and for documents written from content. The app shows rich text
 * with `RichText` (src/app/German.tsx), and a label of it with `plainText`
 * there, which keeps the German left to right.
 */
export function textOf(text: RichText): string {
  return text.map((part) => (typeof part === 'string' ? part : part.de)).join('')
}
