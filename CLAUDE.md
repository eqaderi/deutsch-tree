# deutsch-tree: notes for agents

- Read `README.md` first: commands, folder layout, how to write tests.
- `pnpm check` runs everything (typecheck, lint, content pipeline on the real content, unit tests, browser tests). It must pass before you report work as done.
- The node file format is in `content/README.md`; its schema is `src/content-model/index.ts`.
- A new rule for content is one file in `src/content-pipeline/checks/`, one line in its `index.ts`, and one test file on fixture content. Steps: `content/README.md`, "Adding a check".
- A published node needs a blind review of its questions, and a new one whenever they change. The four steps are in `content/README.md` under "Review before publishing".
- Every screen follows `docs/design-direction.md`. Colours and sizes come from the tokens in `src/app/styles.css`; every interface word comes from `src/language/strings.ts`.
- A new interface string goes into `src/language/strings.ts`, `strings.fa.ts` and `strings.de.ts`; `pnpm check` fails until all three have it. Never write wording, or a bare number, in a component. See `README.md`, "Languages".
- Never commit `research/` or `private/`.
- Private packs (format, the `pnpm pack:build` command, a book's profile): `docs/private-packs.md`; the schema is `src/content-model/pack.ts`. Pack tests use the synthetic book in `tests/pack-builder/fixture.ts` and write to a temporary folder, never to `private/`.
- Browser tests and servers must not use a fixed port. `playwright.config.ts` already takes a free one per run.
