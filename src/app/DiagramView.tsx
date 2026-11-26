import { createElement, type ReactNode, useId } from 'react'
import type { Diagram, DiagramPart, DiagramShape, Language } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { RichText } from './German.tsx'

/**
 * A diagram on a topic's page: the drawing, and its caption below it. The
 * drawing reads left to right in every language, like the German in it; its
 * labels are written in the learner's language. The caption is also the
 * drawing's name for a screen reader.
 *
 * The drawing comes as shapes that the content pipeline has already checked
 * (src/content-model/diagram.ts), so nothing here inserts markup.
 */
export function DiagramView({ diagram }: { diagram: Diagram }) {
  const { language } = useLanguage()
  const captionId = useId()
  const draw = (part: DiagramPart, key: number): ReactNode => drawPart(part, key, diagram, language)
  return (
    <figure className="diagram">
      {/* One image for a screen reader, named by the caption; its shapes are not read one by one. */}
      <div className="diagram-drawing" dir="ltr" role="img" aria-labelledby={captionId}>
        <svg viewBox={`0 0 ${diagram.width} ${diagram.height}`} aria-hidden="true" lang="de">
          {diagram.drawing.map(draw)}
        </svg>
      </div>
      <figcaption id={captionId}>
        <RichText parts={diagram.caption[language]} />
      </figcaption>
    </figure>
  )
}

/** Attribute names of a drawing that React writes in another way. */
const REACT_NAMES: Record<string, string> = { class: 'className', 'text-anchor': 'textAnchor' }

function drawPart(part: DiagramPart, key: number, diagram: Diagram, language: Language): ReactNode {
  if (typeof part === 'string') return part
  if (!('tag' in part)) return diagram.labels[part.label]?.[language] ?? ''
  return drawShape(part, key, diagram, language)
}

function drawShape(shape: DiagramShape, key: number, diagram: Diagram, language: Language): ReactNode {
  const props: Record<string, unknown> = { key }
  for (const [name, value] of Object.entries(shape.attributes)) props[REACT_NAMES[name] ?? name] = value
  const children = shape.children ?? []
  if (shape.tag === 'text' || shape.tag === 'tspan') {
    // A label is in the learner's language; every other word of a drawing is German.
    const isLabel = children.length === 1 && typeof children[0] === 'object' && !('tag' in children[0])
    props.lang = isLabel ? language : 'de'
  }
  return createElement(shape.tag, props, ...children.map((child, index) => drawPart(child, index, diagram, language)))
}
