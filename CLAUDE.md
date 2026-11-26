# deutsch-tree: notes for agents

- Read `README.md` first: commands, folder layout, how to write tests.
- `pnpm check` runs everything (typecheck, lint, content pipeline on the real content, unit tests, browser tests). It must pass before you report work as done.
- The node file format is in `content/README.md`; its schema is `src/content-model/index.ts`.
- A published node needs a blind review of its questions, and a new one whenever they change. The four steps are in `content/README.md` under "Review before publishing".
- Every screen follows `docs/design-direction.md`. Colours and sizes come from the tokens in `src/app/styles.css`; every interface word comes from `src/language/strings.ts`.
- Never commit `research/` or `private/`.
- Browser tests and servers must not use a fixed port. `playwright.config.ts` already takes a free one per run.
