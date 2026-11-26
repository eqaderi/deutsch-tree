# Writing content

One node is one YAML file: `content/nodes/<kind>/<id>.yaml`. The file name
must be the node's id. Subfolders are only for tidiness. The chapters that
group the nodes are one list: `content/chapters.yaml`.

Check your work with `pnpm content:check`. It names the node, the question,
the file and the place of every problem, and the site is not built while one
remains. `pnpm dev` shows the result in a browser and reloads on save.

The exact rules are the schema in `src/content-model/index.ts`. A complete
example is `content/nodes/grammar/grammar-001.yaml`.

## Two conventions

1. **A plain string is German.** It is shown unchanged in every language.
   Text for the learner's language is always a map with all three languages:

   ```yaml
   title:
     en: Present tense
     fa: زمان حال
     de: Präsens
   ```

2. **German inside learner-language text goes in asterisks**: `With *ich* the
   ending is *-e*.` The app shows it as German, left to right, also on a
   Persian page. This holds for titles and chapter names too. A value that
   starts with an asterisk needs quotes, or YAML misreads it:
   `en: "*weil*"`.

   In Persian text this is checked: every Latin letter must stand inside
   asterisks, also a level such as `*B1*`. Without them a Persian page shows
   the German in the wrong order (`-st` as `st-`).

## Every node

```yaml
id: grammar-001          # stable; a grammar id is "grammar-" + the list number, three digits
kind: grammar            # grammar | vocabulary | phrases | exam-part
level: A1                # A1, A2, B1; a new level such as B2 needs no code change
chapter: a1-cases        # id of its chapter in chapters.yaml; same level and kind
order: 1                 # position inside its chapter; lower comes first
status: coming-soon      # coming-soon | published
recogniseOnly: false     # optional, default false
prerequisites: []        # optional; ids of nodes this builds on (advisory)
title: { en: …, fa: …, de: … }
```

A `coming-soon` node needs nothing more. It appears in the tree, marked
"Coming soon". It may already hold the sections below as a draft: they are
checked, but not shown.

## Chapters and the curriculum order

A chapter is a named group of nodes of one kind inside one level, for example
the A1 grammar chapter "Nouns and articles". The tree shows a level as a line
of chapters; a chapter opens to list its nodes.

`content/chapters.yaml` is the list of all chapters:

```yaml
- id: a1-cases           # stable; nodes name it in `chapter`
  level: A1
  kind: grammar          # grammar | vocabulary | phrases | exam-part
  title:                 # the chapter's name, in three languages
    en: "The cases: *Nominativ*, *Akkusativ*, *Dativ*"
    fa: …
    de: …
```

The order of this list is the curriculum order: the curriculum runs through
the chapters from top to bottom, and inside a chapter by each node's `order`.
So "next" for a learner is always the next node of the same chapter, and then
the first node of the next chapter.

- To move a chapter, move its entry in the list. No node file changes.
- To add a chapter (of any kind) between two others, add an entry there and
  name it in its nodes.
- A new level such as B2 is new chapters with `level: B2` after the B1
  chapters, and node files that name them. No code changes.

## A published grammar node

Add all five sections. The page shows them in this fixed order: rule, table,
examples, common mistakes, test.

```yaml
status: published

explanations:            # one section per language
  en:
    rule: >              # two or three sentences
      A regular verb keeps its stem. With *ich* the ending is *-e*.
  fa:
    rule: >
      …
  de:
    rule: >              # simple German, about A2 level
      …

table:
  columns:               # headings, in three languages
    - { en: Person, fa: شخص, de: Person }
    - { en: Ending, fa: پایانه, de: Endung }
  rows:                  # cells are German; every row has one cell per column
    - [ich, -e]
    - [du, -st]

examples:                # the German is the same for everyone
  - de: Ich wohne in Berlin.
    en: I live in Berlin.
    fa: من در برلین زندگی می‌کنم.

mistakes:
  - wrong: Du wohne hier.
    right: Du wohnst hier.
    why: { en: …, fa: …, de: … }   # one line

questions:
  - id: q1               # stable inside the node
    type: multiple-choice
    prompt: Ich ___ in Berlin.      # German
    options: [wohne, wohnst, wohnt]
    answer: wohne                   # the text of the one correct option
    explanation: { en: …, fa: …, de: … }   # one line: why the answer is right
```

## Review before publishing

A published node needs a `review:` record. `pnpm content:check` fails without
one, and again when a question or its answer changes later (explanations may
change freely). A command writes the record, never a hand:

1. `pnpm review:pool <id> --out /tmp/<id>.json` writes the review sheet: the
   pool without answers and explanations. Keep it outside the repository.
2. Give only that file to a reviewer who has not seen the node file (for an
   agent: a fresh subagent told to read nothing else). The reviewer fills in
   each `answer`, and an `objection` where a question is flawed.
3. `pnpm review:record <id> --answers /tmp/<id>.json --reviewer "<who>"` lists
   every disagreement, or stores the record. Name the reviewer honestly: a
   person, or "an independent AI agent".
4. Settle each disagreement by fixing the question or the key, then repeat
   step 3. A changed or disputed question needs a fresh reviewer: `--only q3`
   in step 1, then add that second file with another `--answers`.

Only `multiple-choice` questions and only grammar nodes can be published so
far. Other question types and node kinds are added to the schema as they are
built.

A key that the schema does not know is an error, so a misspelt key is caught.

## What the checks reject

- A node without a chapter, with a chapter that `chapters.yaml` does not
  have, or of another level or kind than its chapter. A chapter name that
  lacks a language.
- Persian text (a title, a chapter name, a rule, the reason of a mistake or
  of a question) with a Latin letter outside asterisks.
- Text for the learner that lacks one of the three languages.
- A question with no correct answer, or with two where one is required.
- A prerequisite that is not the id of a node, and a prerequisite cycle
  (a node that needs itself, directly or through other nodes).
- A published node with fewer than 15 questions. A `coming-soon` draft may
  have fewer.
- Two node files with the same id, and two questions with the same id inside
  one node.
- A published node with no review record, or whose questions or answers
  changed after its review. A `coming-soon` node needs none.

## Adding a check (for people who change the code)

A rule about the shape of one field goes in the schema,
`src/content-model/index.ts`. Every other rule is a check:

1. Write `src/content-pipeline/checks/<rule>.ts`. It exports one
   `ContentCheck`: a function that gets every node file that passed the
   schema (and the content folder, for a rule about other files) and returns
   one problem per thing to fix. Build each problem with `problemIn`, so that
   it names the node. The shortest example is `pool-is-large-enough.ts`.
2. Add it to the list in `src/content-pipeline/checks/index.ts`.
3. Write `tests/content-pipeline/<rule>.test.ts`: break the fixture content
   with `fixtureContentWith` and `changeNode` from `fixture.ts`, run
   `compileContent`, and compare `report.errors`. Copy `pool-size.test.ts`.
4. Run `pnpm check`. If the real content or the fixture content in
   `tests/fixtures/content` breaks the new rule, repair the content.
