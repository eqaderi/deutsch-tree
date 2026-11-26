# deutsch-tree

A syllabus tree for learning German from zero to the Goethe B1 exam. A static
site with no backend, no accounts and no analytics.

- What it must do: [docs/spec.md](docs/spec.md)
- How every screen must look: [docs/design-direction.md](docs/design-direction.md)
- How to write a node: [content/README.md](content/README.md)

## Commands

Needs Node 24 or newer and pnpm. Run `pnpm install` first, and once per
machine `pnpm exec playwright install chromium` for the browser tests.

| Command | What it does |
|---|---|
| `pnpm check` | Everything below, in this order. Run it before every merge. |
| `pnpm typecheck` | TypeScript, whole project. |
| `pnpm lint` | Biome: formatting and lint rules. `pnpm lint:fix` repairs what it can. |
| `pnpm content:check` | The content pipeline on the real content in `content/`. Prints the report; fails on any error. |
| `pnpm test:unit` | All Vitest tests (`tests/**/*.test.ts`). `pnpm test:pipeline` runs only the content pipeline tests. |
| `pnpm test:browser` | Playwright journeys (`tests/browser/*.spec.ts`) against the built site with fixture content. |
| `pnpm dev` | Dev server on the real content. Content files reload on save. |
| `pnpm build` | Compiles the content and builds the site into `dist/`. Fails on any content error. |

`CONTENT_DIR=<folder>` makes `dev`, `build` and `content:check` use another
content folder, for example `tests/fixtures/content`.

## Layout

One folder per module of the spec. Relative imports carry the `.ts` or `.tsx`
ending, because the pipeline runs directly in Node.

| Folder | Module |
|---|---|
| `content/` | The real content: one YAML file per node under `content/nodes/`. |
| `src/content-model/` | The schema of a node file and the types of the compiled bundle. Everything else depends on it. |
| `src/content-pipeline/` | Node files in, compiled bundle and report out. `cli.ts` is the command; `vite-plugin.ts` runs it inside the build and the dev server. `checks/` holds one file per rule that the schema cannot state. |
| `src/app/` | App shell: routes, tree, node page. `styles.css` holds the design tokens. |
| `src/language/` | Interface strings and the language in use. Components take every word from here. |
| `tests/fixtures/content/` | Small invented content that tests run on. Tests never depend on the real content. |
| `tests/content-pipeline/` | Seam 1: run the pipeline on fixture content and assert on the report. |
| `tests/browser/` | Seam 3: whole journeys in a browser. |

The app never reads node files. It fetches `content/index.json` (every node's
summary, in curriculum order) and `content/nodes/<id>.json` (one node's page),
both written by the pipeline at build time.

Page addresses live after the `#`, for example `#/node/grammar-001`. The site
is plain files, so this is what keeps direct links and reloads working on
GitHub Pages and from a local folder.

## Writing tests

- Content pipeline: start from `tests/fixtures/content`. To test broken
  content, use `fixtureContentWith` in `tests/content-pipeline/fixture.ts` to
  get a temporary copy with files changed or added; `changeNode` changes a
  node as data. One test file per rule. How to add a rule and its test:
  `content/README.md`, "Adding a check".
- Browser: import `test` and `expect` from `tests/browser/test.ts`, not from
  Playwright. That adds the rule that the site talks to no other server (no
  font service, no analytics). Each run builds the site from the fixture
  content and serves it under `/deutsch-tree/` on a free port, so runs in
  several worktrees do not collide. Tests run at phone and at computer size.

## Deploying

`.github/workflows/pages.yml` runs `pnpm check` on every pull request and
publishes `dist/` to GitHub Pages on every push to `main`. It needs Pages set
to "GitHub Actions" once in the repository settings.

## Not in version control

`research/` and `private/` are ignored on purpose and must never be committed.
