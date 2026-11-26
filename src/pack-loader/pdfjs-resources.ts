/**
 * Where the site keeps the files PDF.js fetches only when a PDF needs them:
 * character maps, the standard fonts, and the image decoders (WebAssembly).
 * `pdfjsResources` in vite-plugin.ts copies them there from pdfjs-dist.
 */
export const PDFJS_RESOURCES = 'pdfjs'

/** The folders of pdfjs-dist that are copied, by name. */
export const PDFJS_RESOURCE_FOLDERS = ['cmaps', 'standard_fonts', 'wasm'] as const
