import type { ReactNode } from 'react'

/** One section of a node page: a panel under its own small heading. */
export function Panel({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id} className="cap">
        {heading}
      </h2>
      {children}
    </section>
  )
}
