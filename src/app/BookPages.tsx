/**
 * The original pages of a learner's book, drawn from the pack's PDF with
 * PDF.js: each page as a picture, with its text laid over it unseen, so it
 * can be selected and found with the browser's search. Only the pages asked
 * for are drawn. This file, and PDF.js with it, loads only with the private
 * exam view.
 */

import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, TextLayer } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { useEffect, useId, useRef, useState } from 'react'
import type { PageRange } from '../content-model/pack.ts'
import { useLanguage } from '../language/index.tsx'
import { PDFJS_RESOURCES } from '../pack-loader/pdfjs-resources.ts'

GlobalWorkerOptions.workerSrc = workerUrl

const documents = new Map<string, Promise<PDFDocumentProxy>>()

/** A PDF, opened once per visit however often its pages are shown. */
function openPdf(url: string): Promise<PDFDocumentProxy> {
  let opened = documents.get(url)
  if (!opened) {
    const resources = new URL(`${PDFJS_RESOURCES}/`, document.baseURI).href
    opened = getDocument({
      url,
      // Fonts, character maps and image decoders that a book's PDF may need, shipped with the site.
      cMapUrl: `${resources}cmaps/`,
      standardFontDataUrl: `${resources}standard_fonts/`,
      wasmUrl: `${resources}wasm/`,
    }).promise
    opened.catch(() => documents.delete(url))
    documents.set(url, opened)
  }
  return opened
}

interface BookPagesProps {
  /** The address of the PDF that holds the pages. */
  file: string
  /** The pages to show, counted in that PDF. */
  pages: PageRange
  /** The same pages counted in the learner's book, for the page numbers the learner reads. */
  bookPages: PageRange
}

export function BookPages({ file, pages, bookPages }: BookPagesProps) {
  const { strings } = useLanguage()
  const headingId = useId()
  const [pdf, setPdf] = useState<PDFDocumentProxy | 'loading' | 'failed'>('loading')

  useEffect(() => {
    let current = true
    setPdf('loading')
    openPdf(file).then(
      (opened) => current && setPdf(opened),
      () => current && setPdf('failed'),
    )
    return () => {
      current = false
    }
  }, [file])

  const numbers = Array.from({ length: pages.last - pages.first + 1 }, (_, index) => pages.first + index)
  return (
    <section className="panel book-pages" aria-labelledby={headingId}>
      <h2 id={headingId} className="cap">
        {strings.bookPagesHeading}
      </h2>
      {pdf === 'loading' && <p className="secondary">{strings.loading}</p>}
      {pdf === 'failed' && <p>{strings.bookPagesFailed}</p>}
      {typeof pdf === 'object' &&
        numbers.map((number) => (
          <BookPage
            key={`${file}#${number}`}
            pdf={pdf}
            number={number}
            label={strings.bookPage(bookPages.first + number - pages.first)}
          />
        ))}
    </section>
  )
}

/** The widest a page is drawn, in pixels of the screen. Wider screens get the same picture, scaled. */
const MOST_PIXELS = 2400

function BookPage({ pdf, number, label }: { pdf: PDFDocumentProxy; number: number; label: string }) {
  const frame = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const text = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState<string | undefined>()

  useEffect(() => {
    let cancelled = false
    const stops: Array<() => void> = []
    pdf.getPage(number).then((page) => {
      const [box, picture, words] = [frame.current, canvas.current, text.current]
      if (cancelled || !box || !picture || !words) return
      const natural = page.getViewport({ scale: 1 })
      setRatio(`${natural.width} / ${natural.height}`)

      const pixels = Math.min((box.clientWidth || natural.width) * window.devicePixelRatio, MOST_PIXELS)
      const viewport = page.getViewport({ scale: pixels / natural.width })
      picture.width = Math.floor(viewport.width)
      picture.height = Math.floor(viewport.height)
      const drawing = page.render({ canvas: picture, viewport })
      drawing.promise.catch(() => {})
      stops.push(() => drawing.cancel())

      // The text layer follows the page's width on screen through one CSS variable.
      const followWidth = () => box.style.setProperty('--total-scale-factor', String(box.clientWidth / natural.width))
      followWidth()
      const observer = new ResizeObserver(followWidth)
      observer.observe(box)
      stops.push(() => observer.disconnect())
      const layer = new TextLayer({ textContentSource: page.streamTextContent(), container: words, viewport: natural })
      layer.render().catch(() => {})
      stops.push(() => layer.cancel())
    })
    return () => {
      cancelled = true
      for (const stop of stops) stop()
    }
  }, [pdf, number])

  return (
    <figure className="book-page" aria-label={label}>
      <div ref={frame} className="book-page-frame" style={{ aspectRatio: ratio }} lang="de" dir="ltr">
        <canvas ref={canvas} />
        <div ref={text} className="textLayer" />
      </div>
      <figcaption className="secondary">{label}</figcaption>
    </figure>
  )
}
