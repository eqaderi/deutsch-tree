import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { contentPipeline } from './src/content-pipeline/vite-plugin.ts'
import { keepPacksOutOfTheSite, packsOnTheDevServer } from './src/pack-builder/vite-plugin.ts'
import { pdfjsResources } from './src/pack-loader/vite-plugin.ts'

export default defineConfig({
  // Relative, so the same build works under /deutsch-tree/ on GitHub Pages
  // and from any folder on a local server.
  base: './',
  plugins: [
    react(),
    // CONTENT_DIR lets the browser tests build the site from fixture content.
    contentPipeline(process.env.CONTENT_DIR ?? 'content'),
    // The build fails rather than put anything from private/ into the site.
    keepPacksOutOfTheSite(),
    // `pnpm dev` answers private/packs.json from the private folder as it is.
    packsOnTheDevServer(),
    // The fonts and decoders PDF.js needs to show a book's pages.
    pdfjsResources(),
  ],
})
