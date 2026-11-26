import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { changeNode, fixtureContentWith, PUBLISHED } from './fixture.ts'

const caption = {
  en: 'The ball is *auf* the box.',
  fa: 'توپ *auf* جعبه است.',
  de: 'Der Ball ist *auf* der Kiste.',
}
const labels = { box: { en: 'the box', fa: 'جعبه', de: 'die Kiste' } }

const svg = `<svg viewBox="0 0 320 200">
  <!-- the box, and the ball on it -->
  <rect class="surface" x="100" y="100" width="120" height="80" rx="16"/>
  <circle class="object" cx="160" cy="84" r="16"/>
  <text class="label" x="160" y="40" text-anchor="middle">auf</text>
  <text class="note" x="160" y="150" text-anchor="middle">{{box}}</text>
</svg>`

/** The fixture's published node with one diagram; `diagram` changes it before it is written. */
async function compileWithDiagram(change: (diagram: Record<string, unknown>) => void = () => {}) {
  const diagram: Record<string, unknown> = { caption, labels, svg }
  change(diagram)
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.diagrams = [diagram]
    }),
  })
  return compileContent(content)
}

/** The messages of the report, each with the place it names. */
async function problemsWith(change: (diagram: Record<string, unknown>) => void) {
  const { report } = await compileWithDiagram(change)
  return report.errors.map(({ where, message }) => `${where}: ${message}`)
}

/** `svg` with `from` replaced by `to`. */
const svgWith = (from: string, to: string) => (diagram: Record<string, unknown>) => {
  if (!svg.includes(from)) throw new Error(`the diagram has no "${from}"`)
  diagram.svg = svg.replace(from, to)
}

test('a diagram is compiled into its drawing, its labels and its caption', async () => {
  const { report, bundle } = await compileWithDiagram()

  expect(report.errors).toEqual([])
  const [diagram] = bundle?.nodes.find((node) => node.id === 'grammar-001')?.content?.diagrams ?? []
  expect(diagram).toEqual({
    width: 320,
    height: 200,
    drawing: [
      { tag: 'rect', attributes: { class: 'surface', x: '100', y: '100', width: '120', height: '80', rx: '16' } },
      { tag: 'circle', attributes: { class: 'object', cx: '160', cy: '84', r: '16' } },
      { tag: 'text', attributes: { class: 'label', x: '160', y: '40', 'text-anchor': 'middle' }, children: ['auf'] },
      {
        tag: 'text',
        attributes: { class: 'note', x: '160', y: '150', 'text-anchor': 'middle' },
        children: [{ label: 'box' }],
      },
    ],
    labels,
    caption: {
      en: ['The ball is ', { de: 'auf' }, ' the box.'],
      fa: ['توپ ', { de: 'auf' }, ' جعبه است.'],
      de: ['Der Ball ist ', { de: 'auf' }, ' der Kiste.'],
    },
  })
})

test('a published node may show a diagram instead of a table, but needs one of the two', async () => {
  const withDiagramOnly = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      delete node.table
      node.diagrams = [{ caption, labels, svg }]
    }),
  })
  expect((await compileContent(withDiagramOnly)).report.errors).toEqual([])

  const withNeither = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      delete node.table
    }),
  })
  expect((await compileContent(withNeither)).report.errors.map(({ where, message }) => [where, message])).toEqual([
    ['table', 'is required for a published node, unless it has a diagram'],
  ])
})

test('a drawing may use only the shapes and the attributes that the app knows how to draw', async () => {
  expect(await problemsWith(svgWith('<circle', '<image href="ball.png"'))).toEqual([
    'diagrams[0].svg: <image> is not a shape a diagram may use; use svg, g, rect, circle, ellipse, line, polyline, polygon, path, text or tspan',
  ])
  expect(await problemsWith(svgWith('<rect', '<script>alert(1)</script><rect'))).toEqual([
    'diagrams[0].svg: <script> is not a shape a diagram may use; use svg, g, rect, circle, ellipse, line, polyline, polygon, path, text or tspan',
  ])
  expect(await problemsWith(svgWith('r="16"/>', 'r="16" onclick="go()"/>'))).toEqual([
    'diagrams[0].svg: <circle> has the attribute "onclick", which a diagram may not use',
  ])
})

test('colours and sizes come from the classes, never from the drawing itself', async () => {
  expect(await problemsWith(svgWith('class="object"', 'fill="#f08a2b"'))).toEqual([
    'diagrams[0].svg: <circle> has the attribute "fill": colours come from the classes object, surface, shade, line and guide',
  ])
  expect(await problemsWith(svgWith('class="object"', 'class="orange"'))).toEqual([
    'diagrams[0].svg: <circle> has the class "orange"; a shape takes one of object, surface, shade, line and guide',
  ])
  expect(await problemsWith(svgWith('class="label" x="160"', 'x="160" font-size="9"'))).toEqual([
    'diagrams[0].svg: <text> has the attribute "font-size": colours and sizes of text come from the classes label and note',
  ])
  expect(await problemsWith(svgWith('class="label" x="160"', 'x="160"'))).toEqual([
    'diagrams[0].svg: <text> "auf" has no class; text takes label or note',
  ])
})

test('every drawing is 320 wide, so that its text has the same size on every page', async () => {
  expect(await problemsWith(svgWith('viewBox="0 0 320 200"', 'viewBox="0 0 640 200"'))).toEqual([
    'diagrams[0].svg: <svg> must have viewBox="0 0 320 <height>": every diagram is 320 wide, so that its text stays readable on a phone',
  ])
})

test('words of the learner’s language are labels, each written in three languages and each used', async () => {
  expect(await problemsWith(svgWith('{{box}}', '{{bowl}}'))).toEqual([
    'diagrams[0].svg: {{bowl}} is not one of the labels; the labels are box',
    'diagrams[0].labels.box: is not used in the drawing',
  ])
  expect(await problemsWith(svgWith('{{box}}', 'the {{box}}'))).toEqual([
    'diagrams[0].svg: "the {{box}}": a label stands alone in its <text> or <tspan>, so that it can be laid out in its own language',
  ])
  expect(
    await problemsWith((diagram) => {
      diagram.labels = { box: { en: 'the box', fa: 'جعبه (Kiste)', de: 'die Kiste' } }
    }),
  ).toEqual([
    'diagrams[0].labels.box.fa: a label holds no German ("Kiste"); write the German as its own text in the drawing',
  ])
  expect(
    await problemsWith((diagram) => {
      diagram.labels = { box: { en: 'the box', de: 'die Kiste' } }
    }),
  ).toEqual(['diagrams[0].labels.box.fa: is missing; this text is needed in fa'])
})

test('a drawing that is not well-formed is rejected with the place to repair', async () => {
  expect(
    await problemsWith(svgWith('<circle class="object" cx="160" cy="84" r="16"/>', '<circle class="object">')),
  ).toEqual(['diagrams[0].svg: <circle> is opened but never closed'])
})

test('German in the Persian caption of a diagram must be marked', async () => {
  expect(
    await problemsWith((diagram) => {
      diagram.caption = { ...caption, fa: 'توپ auf جعبه است.' }
    }),
  ).toEqual([
    'diagrams[0].caption.fa: German outside asterisks: "auf". A Persian page shows it in the wrong order; write *auf*',
  ])
})
