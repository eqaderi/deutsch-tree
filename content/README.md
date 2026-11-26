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

### Question types

Every question has `id`, `type`, `prompt` (German), its answer and
`explanation`. The test shows the learner what to do in their language, so a
prompt holds only the German. A question that is answered by choosing states
one `answer`; a question that is answered by typing lists its `answers`.

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

### How many questions an attempt draws

Each attempt at the test draws 10 questions from the pool at random. A node
with a large pool may raise this, up to 15:

```yaml
attemptSize: 12          # optional; 10 to 15, default 10
```

The pass mark follows from it: 90%, rounded up to a whole question (9 of 10,
11 of 12, 14 of 15).

## A published exam-part node

The page shows three panels in this fixed order: what the part asks, how it is
scored, how to approach it. Every exam-part node has them, whatever its
module. A complete example is `content/nodes/exam-part/exam-lesen-1.yaml`.

```yaml
status: published

explanations:            # one section per language, all three keys in each
  en:
    task: >              # what the part asks the candidate to do
      You read one longer personal text. Then you decide for six statements
      whether each is right (*Richtig*) or wrong (*Falsch*).
    scoring: >           # how the part is scored
      Each right answer is one point. …
    approach:            # how to approach it: steps, in order
      - Read the six statements before the text.
      - …
  fa: { task: …, scoring: …, approach: [ … ] }
  de: { task: …, scoring: …, approach: [ … ] }   # simple German, about A2 level
```

A grammar node explains a `rule`; an exam-part node explains `task`, `scoring`
and `approach`. The other kind's keys are an error.

### Practice tasks (Lesen)

A Lesen part offers practice tasks. A task is the part as the candidate meets
it: the texts, and the items about them in the order they are answered.

```yaml
practice:                # one task or more; each attempt takes one of them, whole
  - id: t1               # stable inside the node
    texts:
      - id: a            # stable inside the task
        title: Mein erster Monat auf dem Land    # optional: a heading or subject line
        body: |          # German. A blank line starts a new paragraph;
          Hallo ihr Lieben,                      # a line break inside one is kept

          endlich habe ich Zeit, euch zu schreiben. …

          Liebe Grüße
          eure Milena
    items:
      - id: i1           # stable inside the task; reports name it "t1/i1"
        type: richtig-falsch
        prompt: In der Stadt hat Milena keine Ausbildungsstelle gefunden.   # a statement about the text
        answer: true     # true: right according to the text (Richtig); false: Falsch
        explanation: { en: …, fa: …, de: … }   # one line: where the text says so
```

- An item is a question whose answer lies in the texts, so it has what every
  question has: `id`, `type`, `prompt`, `answer`, `explanation`. The only item
  type so far is `richtig-falsch`.
- A task has the format of its exam part: Lesen Teil 1 is 1 text and 6 items.
  The formats are `EXAM_TASK_FORMATS` in `src/content-model/index.ts`. Only a
  part that has a format there can be published; so far that is `exam-lesen-1`.
- Everything in a task is original. Follow the exam's format; never copy a
  text or an item from the official model sets or from a book.
- The solved example "0" that the exam prints before the items is not an item.

**How an exam part differs from the other nodes**

- **No pool, no minimum of 15.** A part is not asked as a random draw of
  questions but as one whole task, so its size is the size the exam gives it.
  The check on the task's format takes the place of the pool minimum.
- **Done at 90% of one task.** The pass mark is the usual rule (90%, rounded
  up to a whole item) over the items of the task taken. For a task of up to
  nine items that is every item: 6 of 6 in Lesen Teil 1.
- **A retry takes another task** when the node has more than one. With a
  single task the learner gets the same text again and may remember it, so a
  second and third task make "done" mean more. One task is enough to publish.
- **No checkpoint questions.** An item cannot be asked without its text, so an
  exam part gives nothing to the checkpoint of its level.

## Review before publishing

A published node needs a `review:` record. `pnpm content:check` fails without
one, and again when a question or its answer changes later (explanations may
change freely). A command writes the record, never a hand:

1. `pnpm review:pool <id> --out /tmp/<id>.json` writes the review sheet: the
   pool without answers and explanations. For an exam part it holds the texts
   of every practice task and the items without answers; an item is named
   with its task (`t1/i3`). Keep the sheet outside the repository.
2. Give only that file to a reviewer who has not seen the node file (for an
   agent: a fresh subagent told to read nothing else). The reviewer fills in
   each `answer`, and an `objection` where a question is flawed.
3. `pnpm review:record <id> --answers /tmp/<id>.json --reviewer "<who>"` lists
   every disagreement, or stores the record. Name the reviewer honestly: a
   person, or "an independent AI agent".
4. Settle each disagreement by fixing the question or the key, then repeat
   step 3. A changed or disputed question needs a fresh reviewer: `--only q3`
   in step 1, then add that second file with another `--answers`.

For an exam part the review covers the texts too. Changing a text after the
review, like changing an item or its key, means a new review; every item of
that task then needs a fresh answer (`--only t1/i1,t1/i2,…`), because the text
decides them all.

Grammar nodes, with `multiple-choice`, `gap-fill`, `true-false`,
`typed-answer` and `typed-gap-fill` questions, and the exam parts that have a
task format can be published so far. Other question types, node kinds and
exam parts are added to the schema as they are built.

A key that the schema does not know is an error, so a misspelt key is caught.

## What the checks reject

- A node without a chapter, with a chapter that `chapters.yaml` does not
  have, or of another level or kind than its chapter. A chapter name that
  lacks a language.
- Persian text (a title, a chapter name, a purpose, an explanation, the
  reason of a mistake, of a question or of an item) with a Latin letter
  outside asterisks.
- Text for the learner that lacks one of the three languages.
- A question with no correct answer, or with two where one is required.
- A prerequisite that is not the id of a node, and a prerequisite cycle
  (a node that needs itself, directly or through other nodes).
- A phrases node without a purpose or without an exam task, and an exam task
  that is not the id of an exam-part node.
- An exam-part node without its module or part number, or whose id is not
  `exam-<module>-<part>`, or with a part number its module does not have
  (Hören has four parts). A `purpose`, `examTasks`, `module`, `part` or
  `practice` in a node of another kind.
- An explanation of the wrong kind: `task`, `scoring` or `approach` in a
  grammar node, `rule` in an exam-part node; and one of a node's own that is
  missing in a language.
- A published node with fewer than 15 questions. A `coming-soon` draft may
  have fewer. An exam part is exempt: it is held to the format of its part.
- A published exam part whose practice task has not the number of texts and
  items of its part, and one whose part has no task format yet.
- Two node files with the same id, and two questions with the same id inside
  one node. Two practice tasks of one node with the same id, and two texts or
  two items with the same id inside one task.
- A published node with no review record, or whose questions, answers or
  task texts changed after its review. A `coming-soon` node needs none.

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
