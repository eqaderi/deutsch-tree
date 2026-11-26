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

## A phrases node and an exam-part node

These two kinds have a few lines more, also while they are `coming-soon`.
The lists of both, with the reasons, are in
`docs/approvals/phrase-and-exam-part-nodes.md`.

```yaml
id: phrases-agreeing     # "phrases-" + the purpose in a word or two
kind: phrases
purpose:                 # one line, in three languages: what the phrases are for
  en: Say that you think the same as another person, fully or in part.
  fa: …
  de: …
examTasks: [exam-schreiben-2, exam-sprechen-1]   # ids of the exam-part nodes it serves; at least one
```

```yaml
id: exam-lesen-2         # "exam-" + module + "-" + part
kind: exam-part
module: lesen            # lesen | hoeren | schreiben | sprechen
part: 2                  # the number of the part inside its module
```

The exam has 15 parts, so there are 15 exam-part nodes: Lesen 1 to 5, Hören 1
to 4, Schreiben 1 to 3 and Sprechen 1 to 3. An exam task is always named by
the id of its exam-part node, so the name cannot point at nothing.

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

## Official mock exams

`content/official-mock-exams.yaml` lists the official mock exams of the
Goethe-Zertifikat B1, in the order the readiness view shows them. The app
links to them. It never hosts or copies them, so this file holds addresses
and a few words about them, and nothing of an exam itself.

```yaml
- id: goethe-b1-modellsatz-erwachsene   # stable for ever: a learner's recorded scores are kept under it
  title: Zertifikat B1 Modellsatz Erwachsene   # the set's own German name
  publisher: Goethe-Institut
  audience: adults                      # adults | youth; youth sets are listed as "Spare sets"
  countsTowardReadiness: true           # false: scores can be recorded but do not count
  links:                                # at least one
    - kind: papers                      # papers (a PDF) | audio (the recordings) | online
      url: https://…                    # a full https address
      candidatePages: { first: 7, last: 28 }   # optional: the PDF pages before the answers
      checked: 2026-11-26               # optional: the day someone last saw the link work
      note: { en: …, fa: …, de: … }     # optional: one or two sentences, e.g. where on the page
```

- To correct a link, change its `url` and set `checked` to today. A link
  without `checked` has not been confirmed by anyone; the file marks those
  with a comment.
- To add an exam, add an entry. Never change the `id` of an exam that is
  already published: learners would lose the scores they recorded for it.
- `candidatePages` makes the page tell the learner to stay inside those pages
  of the PDF, because the pages after them hold the answers.
- `countsTowardReadiness` is a product decision, not a technical one: it says
  whether 90 or more in every module on this set is one of the two that the
  readiness rule asks for. At least two entries must count.
- A `note` follows the two conventions above: three languages, and German
  (also a name in Latin letters inside the Persian) in asterisks.

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

### What search and the overview page take from a node

Nothing extra is written for them; the content pipeline builds both from the
sections above.

- Search finds a published node by its title, its rule, the rows of its table,
  its examples with their translations, and the right half and the reason of
  each common mistake. It does not look into the questions. A `coming-soon`
  node is found by its title only.
- "All grammar at a glance" shows the table of every published grammar node,
  under its level and chapter.

### Question types

Every question has `id`, `type`, `prompt` (German), its answer and
`explanation`; two types below build their own prompt. The test shows the
learner what to do in their language, so a prompt holds only the German. A
question with one right answer states its `answer`; a question that can have
several (a typed answer, an order of words) lists every one under `answers`,
and the first is shown as the right one.

```yaml
  - id: q2
    type: gap-fill                  # a sentence with one gap; the learner chooses the form
    prompt: Du ___ hier.            # exactly one gap, written as three underscores
    options: [wohne, wohnst]
    answer: wohnst                  # the text of the one option that fills the gap
    explanation: { en: …, fa: …, de: … }

  - id: q3
    type: true-false                # "Is this sentence correct German?"
    prompt: Du wohne hier.          # the sentence the learner judges
    answer: false                   # true: correct German; false: it holds a mistake
    explanation: { en: …, fa: …, de: … }

  - id: q4
    type: typed-answer              # the learner types the answer
    prompt: "Plural: der Apfel"
    answers: [die Äpfel, Äpfel]     # every accepted answer; the first is shown as the right one
    explanation: { en: …, fa: …, de: … }

  - id: q5
    type: typed-gap-fill            # a sentence with one gap; the learner types the form
    prompt: Du ___ (wohnen) hier.   # exactly one gap
    answers: [wohnst]
    explanation: { en: …, fa: …, de: … }
```

### Typed questions: the accepted answers

- List every answer that is correct German under `answers`, each written
  exactly, with its umlauts, its ß and its capitals. An answer that is not
  listed is marked wrong.
- Do not list variants of spelling. The test ignores extra spaces by itself,
  and it accepts *ae*, *oe*, *ue* and *ss* in place of *ä*, *ö*, *ü* and *ß*
  and a capitalisation difference, each with a note that shows the learner
  the exact spelling. Nothing else is forgiven: a missing word, such as an
  article, or a plain *u* for *ü* is a wrong answer.
- Pin the answer down. `Wir spielen ___.` can be filled in a hundred ways;
  give the word to use, as in `Du ___ (wohnen) hier.` The blind reviewer types
  an answer without seeing your list, and an answer that is not on it stops
  the review.

### Word ordering, find the error and matching

```yaml
  - id: q6
    type: find-error                # a sentence with one wrong word; the learner picks it
    prompt: Du wohne in Berlin.     # exactly one word is wrong
    answer: wohne                   # that word, as it stands in the sentence
    explanation: { en: …, fa: …, de: … }

  - id: q7
    type: word-order                # the learner puts the pieces of a sentence in order
    answers:                        # every right order of the pieces; the first is shown as the right one
      - [heute, wohne, ich, in Berlin]
      - [ich, wohne, heute, in Berlin]
      - [in Berlin, wohne, ich, heute]
    end: "."                        # optional: ".", "?" or "!"; default "."
    explanation: { en: …, fa: …, de: … }

  - id: q8
    type: matching                  # the learner finds the partner of each item
    answer:                         # the pairs, each as [item, partner]; three or more
      - [ich, wohne]
      - [du, wohnst]
      - [wir, wohnen]
    explanation: { en: …, fa: …, de: … }
```

Word ordering and matching have no `prompt`: the pipeline builds one from the
pieces or the items, and it mixes what the learner sees.

- **Find the error.** The wrong word must stand in the sentence once only
  (`Die` and `die` are two words). Write a sentence with one mistake that has
  one repair; "which word is wrong" must not be a matter of opinion.
- **Word ordering.** A piece is one word or several (`in Berlin`). Use three
  or more. Write each piece as it stands inside a sentence, so no capital
  letter for the first one and no full stop: the app adds both, and a capital
  would give the first piece away. The same piece may be there twice.
  German often allows more than one order. **List every right order** under
  `answers`, the most usual one first; with one right order the list has one
  entry. The checks make sure every order is the same pieces. To keep the
  list short, join words into one piece or choose a sentence with less
  freedom (a question with `end: "?"` has fewer orders than a statement). The
  blind reviewer is asked for every right order too, without seeing your
  list: an order that only one side has stops the review, and the
  disagreement prints the reviewer's orders ready to copy.
- **Matching.** Both sides are German. No item and no partner may be there
  twice, so only one matching is right. Write the pairs in the order the
  items should be shown; the partners are mixed.

### How many questions an attempt draws

Each attempt at the test draws 10 questions from the pool at random. A node
with a large pool may raise this, up to 15:

```yaml
attemptSize: 12          # optional; 10 to 15, default 10
```

The pass mark follows from it: 90%, rounded up to a whole question (9 of 10,
11 of 12, 14 of 15).

## A published writing or speaking node

A Schreiben or Sprechen exam-part node has no questions. The learner does one
task, an AI assistant grades it with a prompt that the app builds, and the
learner types the score in. The node file holds only the task:

```yaml
id: exam-schreiben-1
kind: exam-part
module: schreiben
part: 1
status: published

task:                    # all of it is German
  situation: >           # who writes to whom, and why
    Sie sind letzte Woche in eine neue Wohnung gezogen. …
  points:                # exactly three content points
    - "Beschreiben Sie: Wie ist die neue Wohnung?"
    - "Begründen Sie: Warum sind Sie umgezogen?"
    - Machen Sie einen Vorschlag für einen Besuch.
```

What a task holds depends on its part:

| Part | Fields of `task` |
|---|---|
| Schreiben Aufgabe 1 (informal e-mail, about 80 words) | `situation`, `points` (exactly 3) |
| Schreiben Aufgabe 2 (opinion post, about 80 words) | `situation`, `opinion: { author, text }` (the one opinion the learner replies to) |
| Schreiben Aufgabe 3 (short semi-formal e-mail, about 40 words) | `situation` |
| Sprechen Teil 1 (planning together) | `situation`, `points` (exactly 4) |
| Sprechen Teil 2 (presentation) | `topic` |
| Sprechen Teil 3 (talking about a presentation) | `topic` |

Write only what is special to this task. The fixed wording of the part (how
many words, the five slides of a presentation, what to mind) is added by the
app, and so are the official marking criteria and the prompt. Never write
criteria, points or a prompt into a node file.

Every task is original. Follow the format of the exam, and never copy or
rework the text of an official task or of a task from a book.

Such a node has no `questions` and no `review:` record, and the checks refuse
both: there is no answer key that a reviewer could answer blind. Have the
German of the task read by someone who knows German before you publish it.

## Review before publishing

This is for nodes with a question pool. A writing or speaking node has none;
see the section above.

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

Only grammar nodes and the writing and speaking exam-part nodes can be
published so far. Other node kinds are added to the schema as they are built.

A key that the schema does not know is an error, so a misspelt key is caught.

## What the checks reject

- A node without a chapter, with a chapter that `chapters.yaml` does not
  have, or of another level or kind than its chapter. A chapter name that
  lacks a language.
- Persian text (a title, a chapter name, a purpose, a rule, the reason of a
  mistake or of a question) with a Latin letter outside asterisks.
- Text for the learner that lacks one of the three languages.
- A question with no correct answer, or with two where one is required.
- A wrong word that stands in its sentence twice, a right order that is not
  the same pieces as the first one or is listed twice, and a matching item or
  partner that is there twice.
- A prerequisite that is not the id of a node, and a prerequisite cycle
  (a node that needs itself, directly or through other nodes).
- A phrases node without a purpose or without an exam task, and an exam task
  that is not the id of an exam-part node.
- An exam-part node without its module or part number, or whose id is not
  `exam-<module>-<part>`. A `purpose`, `examTasks`, `module` or `part` in a
  node of another kind.
- A published node with fewer than 15 questions. A `coming-soon` draft may
  have fewer. A writing or speaking node is exempt: it has no pool.
- A writing or speaking node with `questions` or with a `review:` record, a
  published one without a `task`, and a task that lacks a field of its part,
  holds a field of another part, or lists the wrong number of points.
- Two node files with the same id, and two questions with the same id inside
  one node.
- A published node with no review record, or whose questions or answers
  changed after its review. A `coming-soon` node needs none, and neither
  does a writing or speaking node.
- A list of official mock exams that is missing, has a link that is not a
  full `https://` address, has an exam without a link, has two exams with one
  id, or has fewer than two exams that count toward readiness.

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
