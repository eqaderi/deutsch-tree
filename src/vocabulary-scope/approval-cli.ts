/**
 * Brings the generated parts of the vocabulary approval document up to date
 * with the content folder.
 *
 *   node src/vocabulary-scope/approval-cli.ts
 *
 * Run it after changing a vocabulary node, a vocabulary chapter or the scope
 * list. `pnpm check` fails while the document says something else than the
 * content.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { APPROVAL_DOCUMENT, refreshApprovalDocument } from './approval.ts'

const contentDir = process.env.CONTENT_DIR ?? 'content'
const before = await readFile(APPROVAL_DOCUMENT, 'utf8')
const after = await refreshApprovalDocument(before, contentDir)
await writeFile(APPROVAL_DOCUMENT, after)
console.log(after === before ? `${APPROVAL_DOCUMENT} was up to date.` : `${APPROVAL_DOCUMENT} was brought up to date.`)
