import type { NodeKind } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'

/** A node kind, written out. The tint behind the word is only a support. */
export function KindLabel({ kind }: { kind: NodeKind }) {
  const { strings } = useLanguage()
  return <span className={`kind kind-${kind}`}>{strings.kinds[kind]}</span>
}
