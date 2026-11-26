# deutsch-tree: notes for agents

- Read `README.md` first: commands, folder layout, how to write tests.
- `pnpm check` runs everything (typecheck, lint, content pipeline on the real content, unit tests, browser tests). It must pass before you report work as done.
- The node file format is in `content/README.md`; its schema is `src/content-model/index.ts`.
- Every screen follows `docs/design-direction.md`. Colours and sizes come from the tokens in `src/app/styles.css`; every interface word comes from `src/language/strings.ts`.
- Never commit `research/` or `private/`.
- Private packs (format, the `pnpm pack:build` command, a book's profile): `docs/private-packs.md`; the schema is `src/content-model/pack.ts`. Pack tests use the synthetic book in `tests/pack-builder/fixture.ts` and write to a temporary folder, never to `private/`.
- Browser tests and servers must not use a fixed port. `playwright.config.ts` already takes a free one per run.
