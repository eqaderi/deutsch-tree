/**
 * Diagrams: a drawing written as SVG inside a node file, read into a small
 * tree that the app draws. The format for maintainers is in content/README.md,
 * "Diagrams".
 *
 * Only an allow-list of shapes and attributes is read, and colours and text
 * sizes come only from a few classes that the app's stylesheet gives the
 * interface's colours. So a drawing cannot run code, load anything, or look
 * unlike the rest of the app, and the app never inserts markup it was given.
 */

/** Every drawing has this width. Its height is free. Its text then has one size on every page. */
export const DIAGRAM_WIDTH = 320

/** The classes of a shape, and what they look like (src/app/styles.css, "diagrams"). */
export const SHAPE_CLASSES = [
  /** The thing the diagram is about: dark, like the text. */
  'object',
  /** A thing it stands by or in: the raised card colour with a hairline. */
  'surface',
  /** A second, quieter area: the grammar tint. */
  'shade',
  /** A line or an arrow: the text colour, no fill. */
  'line',
  /** A hidden edge or a guide: dashed, light. */
  'guide',
] as const

/** The classes of text: a word the diagram is about, and a smaller word beside it. */
export const TEXT_CLASSES = ['label', 'note'] as const

const SHAPES = ['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path'] as const
const TEXTS = ['text', 'tspan'] as const
const TAGS = ['svg', 'g', ...SHAPES, ...TEXTS] as const

export type DiagramTag = Exclude<(typeof TAGS)[number], 'svg'>

/** One shape, group or text of a drawing. */
export interface DiagramShape {
  tag: DiagramTag
  attributes: Record<string, string>
  children?: DiagramPart[]
}

/** German text, a label (a word of the learner's language, by name), or a shape. */
export type DiagramPart = string | { label: string } | DiagramShape

export interface Drawing {
  width: number
  height: number
  parts: DiagramPart[]
}

const NUMBER = /^-?(\d+\.?\d*|\.\d+)$/
const VALUES: Record<string, RegExp> = {
  x: NUMBER,
  y: NUMBER,
  x1: NUMBER,
  y1: NUMBER,
  x2: NUMBER,
  y2: NUMBER,
  cx: NUMBER,
  cy: NUMBER,
  r: NUMBER,
  rx: NUMBER,
  ry: NUMBER,
  dx: NUMBER,
  dy: NUMBER,
  width: NUMBER,
  height: NUMBER,
  points: /^[-\d.,\s]+$/,
  d: /^[MmLlHhVvCcSsQqTtAaZz\d\s.,-]+$/,
  transform: /^\s*((rotate|translate|scale)\([-\d.,\s]+\)\s*)+$/,
  'text-anchor': /^(start|middle|end)$/,
  class: /^[a-z]+$/,
}

const ATTRIBUTES: Record<(typeof TAGS)[number], string[]> = {
  svg: ['viewBox', 'xmlns'],
  g: ['class', 'transform'],
  rect: ['class', 'x', 'y', 'width', 'height', 'rx', 'ry', 'transform'],
  circle: ['class', 'cx', 'cy', 'r'],
  ellipse: ['class', 'cx', 'cy', 'rx', 'ry'],
  line: ['class', 'x1', 'y1', 'x2', 'y2'],
  polyline: ['class', 'points'],
  polygon: ['class', 'points'],
  path: ['class', 'd', 'transform'],
  text: ['class', 'x', 'y', 'dx', 'dy', 'text-anchor', 'transform'],
  tspan: ['class', 'x', 'y', 'dx', 'dy'],
}

/** Attributes that would give a drawing its own look. */
const LOOKS = /^(fill|stroke|stroke-.*|opacity|fill-opacity|style|color|font|font-.*|letter-spacing)$/

const LABEL = /^\{\{\s*([a-z][a-z0-9-]*)\s*\}\}$/
const ANY_LABEL = /\{\{[^}]*\}\}/
const LABELS = /\{\{\s*([a-z][a-z0-9-]*)\s*\}\}/g

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

const list = (items: readonly string[]) => `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
const orList = (items: readonly string[]) => `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`

interface Element {
  tag: string
  attributes: Record<string, string>
  children: Array<Element | string>
}

/**
 * Reads a drawing. `problems` says what to repair, one sentence each; the
 * drawing is there only when there is none. `labels` are the names of the
 * labels the node gives; `used` are the ones the drawing names.
 */
export function readDrawing(
  svg: string,
  labels: readonly string[],
): { drawing?: Drawing; problems: string[]; used?: string[] } {
  const problems: string[] = []
  const used: string[] = []
  const root = parse(svg, problems)
  // A drawing that cannot be read says nothing about which labels it uses.
  if (!root) return { problems }

  if (root.tag !== 'svg') problems.push(`a drawing is one <svg> element; this one starts with <${root.tag}>`)
  const box = (root.attributes.viewBox ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  const [left, top, width = 0, height = 0] = box
  if (box.length !== 4 || left !== 0 || top !== 0 || width !== DIAGRAM_WIDTH || !(height > 0)) {
    problems.push(
      `<svg> must have viewBox="0 0 ${DIAGRAM_WIDTH} <height>": every diagram is ${DIAGRAM_WIDTH} wide, so that its text stays readable on a phone`,
    )
  }
  checkAttributes(root, problems)

  const read = (element: Element, classed: boolean): DiagramShape | undefined => {
    if (!(TAGS as readonly string[]).includes(element.tag) || element.tag === 'svg') {
      problems.push(`<${element.tag}> is not a shape a diagram may use; use ${orList(TAGS)}`)
      return undefined
    }
    const tag = element.tag as DiagramTag
    checkAttributes(element, problems)
    const isText = (TEXTS as readonly string[]).includes(tag)
    const hasClass = element.attributes.class !== undefined
    const hasLook = Object.keys(element.attributes).some((name) => LOOKS.test(name))
    if ((SHAPES as readonly string[]).includes(tag) && !hasClass && !classed && !hasLook) {
      problems.push(`<${tag}> has no class; a shape takes one of ${list(SHAPE_CLASSES)}`)
    }
    if (tag === 'text' && !hasClass && !hasLook) {
      problems.push(`<text> "${textOf(element)}" has no class; text takes ${orList(TEXT_CLASSES)}`)
    }

    const children: DiagramPart[] = []
    const texts = element.children.filter((child) => typeof child === 'string' && child.trim() !== '')
    for (const child of element.children) {
      if (typeof child !== 'string') {
        const shape = read(child, classed || (tag === 'g' && hasClass))
        if (shape) children.push(shape)
        continue
      }
      const words = child.replace(/\s+/g, ' ')
      if (words.trim() === '') continue
      if (!isText) {
        problems.push(`"${words.trim()}" stands outside a <text>; every word of a drawing is inside <text>`)
        continue
      }
      const label = LABEL.exec(words.trim())?.[1]
      if (label !== undefined && texts.length === 1 && element.children.length === 1) {
        used.push(label)
        if (!labels.includes(label)) {
          problems.push(`{{${label}}} is not one of the labels; the labels are ${labels.join(', ') || 'none'}`)
        }
        children.push({ label })
        continue
      }
      if (ANY_LABEL.test(words)) {
        for (const [, name = ''] of words.matchAll(LABELS)) used.push(name)
        problems.push(
          `"${words.trim()}": a label stands alone in its <text> or <tspan>, so that it can be laid out in its own language`,
        )
        continue
      }
      children.push(decode(element.children.length === 1 ? words.trim() : words, problems))
    }
    return { tag, attributes: element.attributes, ...(children.length > 0 && { children }) }
  }

  const parts = root.children.flatMap((child) => {
    if (typeof child === 'string') {
      if (child.trim() !== '')
        problems.push(`"${child.trim()}" stands outside a <text>; every word of a drawing is inside <text>`)
      return []
    }
    const shape = read(child, false)
    return shape ? [shape] : []
  })

  return problems.length > 0 ? { problems, used } : { drawing: { width, height, parts }, problems, used }
}

function checkAttributes(element: Element, problems: string[]) {
  const allowed = ATTRIBUTES[element.tag as (typeof TAGS)[number]] ?? []
  const isText = (TEXTS as readonly string[]).includes(element.tag)
  for (const [name, value] of Object.entries(element.attributes)) {
    if (LOOKS.test(name)) {
      problems.push(
        isText
          ? `<${element.tag}> has the attribute "${name}": colours and sizes of text come from the classes ${list(TEXT_CLASSES)}`
          : `<${element.tag}> has the attribute "${name}": colours come from the classes ${list(SHAPE_CLASSES)}`,
      )
    } else if (!allowed.includes(name)) {
      problems.push(`<${element.tag}> has the attribute "${name}", which a diagram may not use`)
    } else if (name === 'class') {
      const classes: readonly string[] = isText ? TEXT_CLASSES : SHAPE_CLASSES
      if (!classes.includes(value)) {
        problems.push(
          isText
            ? `<${element.tag}> has the class "${value}"; text takes ${orList(TEXT_CLASSES)}`
            : `<${element.tag}> has the class "${value}"; a shape takes one of ${list(SHAPE_CLASSES)}`,
        )
      }
    } else if (VALUES[name] && !VALUES[name].test(value)) {
      problems.push(`<${element.tag}> has ${name}="${value}", which is not a value it can take`)
    }
  }
}

function textOf(element: Element): string {
  return element.children
    .map((child) => (typeof child === 'string' ? child : textOf(child)))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

function decode(text: string, problems: string[]): string {
  return text.replace(/&(#?\w+);?/g, (whole, name: string) => {
    if (name in ENTITIES) return ENTITIES[name] ?? whole
    problems.push(`"${whole}" is not a character a drawing may use; write the letter itself`)
    return whole
  })
}

const TOKEN = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|[^<]+|</g
const ATTRIBUTE = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

/** The element tree of `source`, or undefined with the reasons in `problems`. */
function parse(source: string, problems: string[]): Element | undefined {
  const top: Element = { tag: '', attributes: {}, children: [] }
  const stack: Element[] = [top]
  for (const match of source.matchAll(TOKEN)) {
    const [token, closing, tag, attributeText = '', selfClosing] = match
    const current = stack.at(-1) ?? top
    if (token.startsWith('<!--')) continue
    if (tag === undefined) {
      if (token === '<') {
        problems.push(`"${source.slice(match.index, match.index + 20).trim()}" is not a tag a drawing can read`)
        return undefined
      }
      current.children.push(token)
      continue
    }
    if (closing) {
      if (current.tag !== tag) {
        problems.push(current === top ? `</${tag}> closes nothing` : `<${current.tag}> is opened but never closed`)
        return undefined
      }
      stack.pop()
      continue
    }
    const attributes: Record<string, string> = {}
    for (const [, name = '', double, single] of attributeText.matchAll(ATTRIBUTE)) {
      attributes[name] = double ?? single ?? ''
    }
    const element: Element = { tag, attributes, children: [] }
    current.children.push(element)
    if (!selfClosing) stack.push(element)
  }
  const open = stack.at(-1)
  if (open && open !== top) {
    problems.push(`<${open.tag}> is opened but never closed`)
    return undefined
  }
  const elements = top.children.filter((child) => typeof child !== 'string')
  if (elements.length !== 1 || top.children.some((child) => typeof child === 'string' && child.trim() !== '')) {
    problems.push('a drawing is one <svg> element and nothing around it')
    return undefined
  }
  return elements[0]
}
