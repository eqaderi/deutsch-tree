# deutsch-tree: notes for agents

- Read `README.md` first: commands, folder layout, how to write tests.
- `pnpm check` runs everything (typecheck, lint, content pipeline on the real content, unit tests, browser tests). It must pass before you report work as done.
- The node file format is in `content/README.md`; its schema is `src/content-model/index.ts`.
- A new rule for content is one file in `src/content-pipeline/checks/`, one line in its `index.ts`, and one test file on fixture content. Steps: `content/README.md`, "Adding a check".
- Every screen follows `docs/design-direction.md`. Colours and sizes come from the tokens in `src/app/styles.css`; every interface word comes from `src/language/strings.ts`.
- Never commit `research/` or `private/`.
- Browser tests and servers must not use a fixed port. `playwright.config.ts` already takes a free one per run.
