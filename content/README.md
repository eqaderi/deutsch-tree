# Writing content

One node is one YAML file: `content/nodes/<kind>/<id>.yaml`. The file name
must be the node's id. Subfolders are only for tidiness. The chapters that
group the nodes are one list: `content/chapters.yaml`.

Check your work with `pnpm content:check`. It names the node, the question,
the file and the place of every problem, and the site is not built while one
remains. `pnpm dev` shows the result in a browser and reloads on save.

The exact rules are the schema in `src/content-model/index.ts`. Each kind's
section below names a complete example of it; for grammar it is
`content/nodes/grammar/grammar-128.yaml`.

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

## A vocabulary node

A vocabulary node is one theme of about 25 words. While it is `coming-soon`
its entries hold only `word`:

```yaml
id: vocabulary-family    # "vocabulary-" plus an English name of the theme; never the level
kind: vocabulary
level: A1
chapter: a1-words-people
order: 3
status: coming-soon
title: { en: Family, fa: خانواده, de: Familie }
words:                   # in the order to learn them
  - word: Mutter         # the headword, exactly as the scope list spells it
  - word: Vater
```

The scope list has the word's class, level, article and plural marker.

### A published vocabulary node

Each entry then holds the whole word. The example is
`content/nodes/vocabulary/vocabulary-family.yaml`.

```yaml
status: published
attemptSize: 15          # optional, as for every node
words:
  - word: Großmutter     # the headword, without article
    class: noun          # a word class of the scope list
    article: die         # nouns only
    plural: Großmütter   # nouns only: the plural written out, without article
    # number: plural-only  # in place of `plural` for a noun with one number (plural-only, singular-only)
    level: A1
    meaning:             # plain text, no asterisks; Persian without Latin letters
      en: grandmother
      fa: مادربزرگ
    definition: die Mutter von der Mutter oder vom Vater   # simple German, never the word itself
    example:             # one original sentence that uses the word
      de: Meine Großmutter ist 85 Jahre alt.
      en: My grandmother is 85 years old.
      fa: مادربزرگم ۸۵ سال دارد.
    alsoAccepted: [die Oma]  # optional: other German that is right when this word is asked for
    tooCloseTo: [Oma]        # optional: words of this node never offered as a wrong meaning of this one
```

- `class`, `level`, `article` and `plural` must agree with the scope list (a
  check says where they do not). The plural is written out because the lists
  give only a marker: `¨-e` on *Stuhl* is *Stühle*. A noun the list gives
  two articles (`der/die` for *Verwandte*) takes one, and lists the other form
  under `alsoAccepted`.
- A node writes no `questions`: the test is made from the words. Every word
  is asked twice. **From German**: the learner sees the word as it is learned
  (*die Großmutter*) and chooses its meaning among four meanings of words of
  the node, of the same word class where the node has enough. **Into
  German**: the learner sees the meaning and types the word, a noun with its
  article; *Großmutter* or *der Großmutter* is wrong, and only the slips of
  any typed answer (umlauts, capitals) are forgiven. A learner who reads in
  simple German sees the `definition` in place of a meaning, in both
  directions. One attempt asks about a word once, half of the words in each
  direction. The reason shown for a wrong answer is the word, its meaning
  and its example.
- So every meaning must be clear enough to name one word. Two words of a node
  with the same meaning in one language, or the same definition, are
  rejected, unless each lists the other in `alsoAccepted` and one names the
  other in `tooCloseTo` (*Oma* and *Großmutter*). List under `alsoAccepted`
  every other German a learner may rightly type: *die Frau* for *Ehefrau*.
- The page lists every word with its article, plural, word class, level,
  meaning, definition and example. Search finds a word by itself with its
  article and its meaning (in simple German: its definition), not by its
  example.
- The review covers the questions made from the words, in each of the three
  languages (see "Review before publishing"). A change to a word, its
  article, a meaning, the definition, `alsoAccepted` or `tooCloseTo` calls
  for a new review; the example sentence, the plural and the level may change
  freely, because no question shows them.

A node holds words of its own level only (a test of the real content says so).
After changing a vocabulary node or a vocabulary chapter, run
`pnpm vocabulary:approval`: it rewrites the lists in
`docs/approvals/vocabulary-themes.md`, and `pnpm check` fails while they are out
of date.

## The vocabulary scope list

`content/vocabulary/` holds three files:

| File | What it is | Written by |
|---|---|---|
| `scope-list.tsv` | Every word in scope, one per line: `word`, `class`, `level`, `article`, `plural`, `reflexive`, `feminine`, `regional`. The vocabulary nodes must hold each word exactly once. | `pnpm vocabulary:scope` |
| `left-out.tsv` | Every headword of the word lists that is not in scope, with the reason and the word it is noted on. | `pnpm vocabulary:scope` |
| `scope-corrections.yaml` | What the extracted lists got wrong or do not print: word classes, missing articles, two spellings of one word. | by hand |

The words come from the Goethe A1, A2 and B1 word lists. **Only headwords may
be here**: a word, its article, plural marker, word class and level. Never a
sentence, a definition or a translation from a word list, and never the lists
themselves; they stay outside the repository.

What counts as "in scope" is one setting, `SCOPE_RULE` in
`src/vocabulary-scope/index.ts`. To change the scope:

1. Change `SCOPE_RULE`, or add a correction to `scope-corrections.yaml`.
2. Run `pnpm vocabulary:scope --lists <folder>`, where the folder holds the
   extracted `union-headwords.tsv` and `b1-headwords.tsv`.
3. Run `pnpm content:check`. It names every word that is now in no node, and
   every word of a node that is no longer in scope. Move those words in the
   node files.
4. Run `pnpm vocabulary:approval`, and update the numbers in
   `tests/real-content/vocabulary-themes.test.ts`.

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

## A published phrases node

A phrases node is published with two sections more: `phrases` and
`questions`. The page shows what the phrases are for (the `purpose`), then
each phrase as a card, then the test. A complete example is
`content/nodes/phrases/phrases-suggesting.yaml`.

```yaml
status: published

phrases:                 # in the order the page shows them
  - de: Wie wäre es mit …?          # the phrase; "…" where the speaker's own words go
    meaning:
      en: How about …? Suggests a thing, a day or a place. After *mit* comes the dative.
      fa: …                         # the meaning in Persian, and when it is used
      de: Damit schlägt man eine Sache vor. Nach *mit* kommt der Dativ.
    examTasks: [exam-sprechen-1]    # one or more of the node's own examTasks
    example:                        # the phrase in use, in one whole sentence
      de: Wie wäre es mit einem Picknick im Park?
      en: How about a picnic in the park?
      fa: یک پیک‌نیک در پارک چطور است؟

questions: …             # as for a grammar node
```

- `meaning.en` and `meaning.fa` say what the phrase means and when it is
  used, in a sentence or two. `meaning.de` is for a learner who reads in
  German: it says in simple German (about A2) when the phrase is used, since
  a translation would tell that reader nothing.
- Each phrase names the exam tasks it is useful for, out of the node's
  `examTasks`. Every exam task of the node is served by at least one phrase.
  A phrase that is mostly spoken does not name a writing task.
- **The test proves recall, not only recognition.** A learner who knows a
  phrase when they see it but cannot write it must not pass. So fewer
  questions of the pool are answered without typing than an attempt needs to
  pass: at most 8 of them with the usual attempt of 10. Write the rest as
  `typed-gap-fill` or `typed-answer` questions that make the learner write a
  part of a phrase.
- Pin a typed answer down (see "Typed questions: the accepted answers"):
  the phrase with one gap, so the words around the gap fix what goes in it,
  and the word to use in brackets where the gap could take several. Then list
  every answer that is correct German for the prompt as written, also the
  ones that are not the phrase being taught (`Hättest` beside `Hast` in
  `___ (haben) du Lust, …?`). The blind review shows which ones you missed.

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

## Mock exams

The original mock exams are one file each: `content/mock-exams/<id>.yaml`,
with ids `mock-exam-1` to `mock-exam-5`. A mock exam is a whole exam in the
Goethe B1 format, written for this project: never copied or reworked from an
official set or a book. While it is `coming-soon` it may be its title alone;
the list of mock exams shows it as "Coming soon". A complete example is
`tests/fixtures/content/mock-exams/mock-exam-1.yaml`.

```yaml
id: mock-exam-1          # stable for ever: the learner's results are kept under it
order: 1                 # its place in the list
status: published        # coming-soon | published
title: { en: Mock exam 1, fa: امتحان آزمایشی ۱, de: Übungsprüfung 1 }

lesen:                   # Lesen, Teil 1 to Teil 5, in order
  - texts: …             # a part is a task without an id: its texts and its items
    items: …
  - …
hoeren:                  # Hören, Teil 1 to Teil 4, in order
  - texts: …
    items: …
schreiben:               # Schreiben, Aufgabe 1 to Aufgabe 3, in order
  - situation: …         # a task, written as the `task` of a writing node
    points: […]
  - situation: …
    opinion: { author: …, text: … }
  - situation: …
sprechen:                # Sprechen, Teil 1 to Teil 3, in order
  - situation: …         # a task, written as the `task` of a speaking node
    points: […]
  - topic: …
  - topic: …
```

- Each part has the format of its exam part, as a practice task does (the
  table in "Practice tasks (Lesen)"). A part's id is its place: `lesen-3` is
  Lesen Teil 3, and a report or a review sheet names its items `lesen-3/i2`.
- A published mock exam has all five parts of Lesen, all four of Hören and
  all three of Schreiben and of Sprechen. The time of each module comes from
  the exam (Lesen 65 minutes, Hören 40, Schreiben 60, Sprechen 15),
  and so does how often each recording of Hören is played (Teil 1 and Teil 4
  twice, Teil 2 and Teil 3 once). None of this is written in the file.
- It is reviewed blind, texts included, exactly as an exam part is (see
  "Review before publishing"): `pnpm review:pool mock-exam-1`, then
  `pnpm review:record mock-exam-1`. Then publish it and run
  `pnpm audio:generate` for the lines of Hören.
- A task of Schreiben or Sprechen has the fields of its part (the table in
  "A published writing or speaking node"), and only what is special to it:
  the app adds the fixed wording, the criteria and the prompt. It has no key,
  so it is not on the review sheet and changing it needs no new review; have
  its German read by someone who knows German.

## A published grammar node

Add the sections below. The page shows them in this fixed order: rule,
diagram, table, examples, common mistakes, test. A node needs a table, a
diagram or both: a table for forms (endings, articles), a diagram for a
structure that is hard to picture from text (positions, word order, cases).
The diagram is written as described in "Diagrams" below. A complete example
with both is `content/nodes/grammar/grammar-128.yaml`, the grammar sample.

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

diagrams:                # optional; see "Diagrams"
  - caption: { en: …, fa: …, de: … }
    svg: |
      <svg viewBox="0 0 320 200"> … </svg>

table:                   # optional when the node has a diagram
  columns:               # headings, in three languages; plain text, no asterisks
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

- Search finds a published node by its title, its rule, the caption of each
  diagram, the rows of its table,
  its examples with their translations, and the right half and the reason of
  each common mistake. A phrases node is
  found by its purpose, each phrase with its meaning, and each example with
  its translation. Search does not look into the questions. A `coming-soon`
  node is found by its title only.
- "All grammar at a glance" shows the table of every published grammar node,
  under its level and chapter. A node with a diagram and no table is not
  there.

### Diagrams

A diagram is a drawing written as SVG inside the node file, so it is fixed
like any other text: no code, no image file, no drawing program needed (one
may be used to find the coordinates). The pipeline reads the drawing and
refuses what the app cannot draw, with the place and the reason.

```yaml
diagrams:
  - caption:                     # what the drawing shows, in one or two sentences
      en: "*Wo ist der Ball?* One picture for each preposition."
      fa: "*Wo ist der Ball?* برای هر حرف اضافه یک تصویر."
      de: "*Wo ist der Ball?* Ein Bild für jede Präposition."
    labels:                      # optional: words of the learner's language in the drawing
      box: { en: the box, fa: جعبه, de: die Kiste }
    svg: |
      <svg viewBox="0 0 320 200">
        <!-- a comment is allowed and ignored -->
        <rect class="surface" x="100" y="100" width="120" height="80"/>
        <circle class="object" cx="160" cy="84" r="16"/>
        <text class="label" x="160" y="40" text-anchor="middle">auf</text>
        <text class="note" x="160" y="150" text-anchor="middle">{{box}}</text>
      </svg>
```

**Size.** Every drawing is `viewBox="0 0 320 <height>"`: 320 wide, as tall as
it needs. The app draws it as wide as the page allows, up to 400px, so a
`label` is about 16px on a phone and 20px at most on a computer, and a
`note` about 14px. Draw for a phone: three small pictures side by side at
most, and grow downwards, not sideways. Keep 4 or more units between a word
and a shape.

**Look.** A drawing has no colours or sizes of its own. Every shape takes one
of these classes, which give it the interface's colours (`src/app/styles.css`,
"Diagrams"):

| Class | Looks like | Use it for |
|---|---|---|
| `object` | dark, filled | the thing the diagram is about (the ball, the verb) |
| `surface` | panel colour, dark edge | what it stands in, on or by (the box, a slot) |
| `shade` | grammar tint, dark edge | a second, quieter area (the side of a box) |
| `line` | dark line, no fill | lines and arrows |
| `guide` | dashed line, no fill | what is hidden or seen through, a guide |

Text takes `label` (a word the diagram is about, 16, medium) or `note` (a
smaller word beside it, 14, grey). A `<g>` may give its class to the shapes
inside it. `fill`, `stroke`, `style`, `font-size` and other looks are refused.
Orange is never used: it marks the next topic and the main button only.

**Shapes.** `g`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`,
`path`, `text` and `tspan`, with their positions (`x`, `y`, `cx`, `r`,
`points`, `d` …), `transform`, `text-anchor` and `class`. Nothing else: no
images, links, scripts, fonts or styles. Later shapes are drawn over earlier
ones, so draw what is behind first.

**Languages.** A drawing reads left to right in every language, also on a
Persian page, like the German in it.

- German is written in the drawing itself: `<text …>auf</text>`. It is the same
  for every learner.
- A word of the learner's language is a label: write `{{name}}` alone in its
  `<text>` or `<tspan>`, and give the name under `labels` in all three
  languages. The app writes it in the learner's language, in the Persian font
  on a Persian page. A label holds no German, so a Persian label has no Latin
  letter; put the German beside it as its own text. Every label must be used.
- Leave room: a Persian or German label is often longer than the English one.
  Centre a label (`text-anchor="middle"`) so that it grows to both sides.
- The caption is learner-language text like a rule: German in asterisks. It
  stands under the drawing, is what search finds, and is the drawing's name
  for a screen reader, so it says in words what the drawing shows.

Use a diagram only where it shows what text cannot; a list of forms is a
table. Look at it with `pnpm dev` at phone width and in Persian before
publishing. A diagram is not part of the review record: it may change
without a new review.

### Recognise-only nodes

A node with `recogniseOnly: true` is one the exam asks the learner to
understand when they read or hear it, never to use. The app labels it
"Recognise only" in the tree, on its page and on its test, in the learner's
language, also while it is coming soon, and its page and test say in a
sentence what that means.

Its test asks only for understanding. The types in which the learner
produces the form are refused in its pool, also in a draft:

- `typed-answer` and `typed-gap-fill`: the learner writes the form.
- `word-order`: the learner builds the sentence.

The other types offer the forms or a sentence and ask the learner to
recognise and understand: `multiple-choice` (for example a sentence and three
meanings of it, in German), `gap-fill` (choose between offered forms, such as
two words that differ in meaning), `true-false`, `find-error` and `matching`
(a form and its meaning). Write the questions about what the form means or
which form a sentence has, not about building it. The list is
`PRODUCING_QUESTION_TYPES` in `src/content-model/index.ts`.

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

## A published exam-part node

Every exam-part page, whatever its module, begins with three panels in this
fixed order: what the part asks, how it is scored, how to approach it. Then
comes what the learner does with the part: a practice task that the app
scores (Lesen, Hören), or a task that an AI assistant grades (Schreiben, Sprechen).
A complete example is `content/nodes/exam-part/exam-lesen-1.yaml`.

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
  question has: `id`, `type`, `prompt`, `answer`, `explanation`.
- A task has the format of its exam part: its number of texts and items, and
  the type of its items. The formats are `ITEM_TASK_FORMATS` in
  `src/content-model/index.ts`; every Lesen and Hören part has one:

  | Part | Texts | Items | Item type |
  |---|---|---|---|
  | Lesen Teil 1 | 1 personal text (an e-mail, a blog entry) | 6 | `richtig-falsch` |
  | Lesen Teil 2 | 2 press texts; three items on each, the first on what it is about | 6 | `multiple-choice` |
  | Lesen Teil 3 | 10 advertisements, ids `a` to `j` | 7 | `which-text` |
  | Lesen Teil 4 | 7 comments on one question, each titled with its writer's name | 7 | `ja-nein` |
  | Lesen Teil 5 | 1 set of rules or instructions | 4 | `multiple-choice` |
  | Hören Teil 1 | 5 announcements or messages, 1 speaker each, heard twice | 10 | `richtig-falsch`, then `multiple-choice`, per text |
  | Hören Teil 2 | 1 talk to an audience, 1 speaker, heard once | 5 | `multiple-choice` |
  | Hören Teil 3 | 1 conversation of 2 speakers, heard once | 7 | `richtig-falsch` |
  | Hören Teil 4 | 1 radio discussion of 3 speakers (a moderator and two guests), heard twice | 8 | `who-says` |

- The item types besides `richtig-falsch`:

  ```yaml
  - id: i1
    type: multiple-choice          # a, b, c: exactly three options, shown in the order written
    prompt: Die Bibliothek ist …
    options: [nur am Wochenende offen., jeden Tag offen., am Abend geschlossen.]
    answer: jeden Tag offen.       # the text of the one right option
  - id: i2
    type: which-text               # Lesen Teil 3: which advertisement fits the situation?
    prompt: Sie möchten am Abend Deutsch lernen.
    answer: a                      # the id of a text of the task, or '0' when none fits
  - id: i3
    type: ja-nein                  # Lesen Teil 4: is the writer for it?
    prompt: Ist Lisa für ein Handyverbot?
    answer: true                   # true: Ja; false: Nein
  - id: i4
    type: who-says                 # Hören Teil 4: who says this?
    prompt: Zu Hause spart man Zeit.
    answer: Herr Wolf              # the name of a speaker of the task's text
  ```

  A `which-text` answer is the id of one text, and a text answers one item
  at most (each advertisement is used once); exactly as in the exam, one
  situation should have none (`'0'`, in quotes). The app offers the texts'
  ids and "0" as the choices, and shows each text with its id; a
  `who-says` item offers the speakers of the text. Each item still has its
  `explanation`.
- Everything in a task is original. Follow the exam's format; never copy a
  text or an item from the official model sets or from a book.
- The solved example "0" that the exam prints before the items is not an item.

### Practice tasks (Hören)

A Hören part has practice tasks of the same shape, but its texts are heard,
not read. A text to hear names its speakers, each with a voice, and gives
what is said line by line instead of a `body`. A complete example is
`content/nodes/exam-part/exam-hoeren-3.yaml`.

```yaml
practice:
  - id: t1
    texts:
      - id: a
        title: Im Zug nach Hannover        # optional: where the people are, or what the talk is about
        speakers:                          # who speaks, each in a voice of their own
          - { name: Sandra, voice: kerstin }
          - { name: Michael, voice: thorsten }
        lines:                             # what is said, in the order it is heard
          - speaker: Michael               # one of the speakers above
            text: Entschuldigung, ist der Platz hier noch frei?
          - speaker: Sandra
            text: Michael! So ein Zufall!
    items:
      - id: i1
        type: richtig-falsch
        prompt: Sandra und Michael haben früher in derselben Firma gearbeitet.
        answer: true
        explanation: { en: …, fa: …, de: … }
```

- The voices are `thorsten`, `kerstin` and `mls-5424` (README, "Audio").
  Two speakers of one text never share a voice: the learner tells them apart
  by ear, as in the exam. Give the man Thorsten and the woman Kerstin; a
  third speaker (Hören Teil 4) gets `mls-5424`, a second, higher woman's
  voice.
- Every line is spoken in its speaker's voice by `pnpm audio:generate`, one
  file per line, and the check asks for each file. Write numbers, times and
  prices in words ("um acht", "dreißig Leute"): the voice misreads digits.
- The practice page plays the lines one after the other as the recording,
  and shows the items. What is said is shown only in the result, line by
  line with its speaker and a play button, so the learner can hear again
  what was missed.
- Hören Teil 3 is one conversation between two people and 7 items.

**How a reading or listening part differs from the other nodes**

- **No pool, no minimum of 15.** A part is not asked as a random draw of
  questions but as one whole task, so its size is the size the exam gives it.
  The check on the task's format takes the place of the pool minimum.
- **Done at 90% of one task.** The pass mark is the usual rule (90%, rounded
  up to a whole item) over the items of the task taken. For a task of up to
  nine items that is every item: 6 of 6 in Lesen Teil 1.
- **A retry takes another task** when the node has more than one. With a
  single task the learner gets the same text again and may remember it, so a
  second and third task make "done" mean more. One task is enough to publish.
- **Reviewed blind, texts included**, like a pool (see "Review before
  publishing").
- **No checkpoint questions.** An item cannot be asked without its text, so an
  exam part gives nothing to the checkpoint of its level. Its practice task is
  still offered from the tree, like any node's test.

### A published writing or speaking node

A Schreiben or Sprechen exam-part node has no questions. The learner does one
task, an AI assistant grades it with a prompt that the app builds, and the
learner types the score in. Besides its explanations (above), the node file
holds the task:

```yaml
id: exam-schreiben-1
kind: exam-part
module: schreiben
part: 1
status: published

explanations: …          # what the part asks, how it is scored, how to approach it

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

Such a node has no `questions`, no `practice` and no `review:` record, and the
checks refuse them: there is no answer key that a reviewer could answer blind.
Have the German of the task read by someone who knows German before you
publish it.

## Audio of the German

Every German example of a published node can be heard, and so can every
vocabulary word (with its article) and its example sentence, and every line
of a listening part, in the voice of its speaker. The audio is
made from the text by one command, in the voice chosen on ticket #5:

```sh
pnpm audio:generate --voices <folder of the Piper voice files> --piper <path to piper>
```

Run it after changing or adding German that is spoken, and commit the files it
writes in `content/audio/` with the change. It says only what is new or
changed and removes what is no longer needed. `pnpm content:check` names
every spoken item of a published node whose file is missing. Piper and its
voice files are not in the repository; how to install them and the options of
the command are in the main README, "Audio".

- Numbers are spoken as words: `85 Jahre`, `14:35 Uhr`, `am 3. Mai`, `1990`,
  `3,50 €` and `20 %` need nothing. A number in another form (`3.5.2025`) is
  an error that asks you to write it in words.
- Audio is not part of the review record: changing an example needs new
  audio, never a new review.
- Listen to new audio once. When the voice slips on an item, say it again with
  `--redo <key>` (the key is the file name the command printed).

## Review before publishing

This is for nodes with a question pool. A writing or speaking node has none;
see the section above.

A vocabulary node's pool is made from its words, so the sheet holds what each
learner will be asked: every question once per language (its id ends in
`-en`, `-fa` or `-de`), with the instruction that learner reads. A reviewer
answers each one on its own; a meaning that is clear in English may name two
words in Persian. The ids are codes, not the words, so the sheet does not
give away a word that is asked for. To review a few words again, run step 1
with `--only` and the ids that step 3 named.

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

A text to hear is on the sheet as what is said: each line with its speaker,
without the voices. So giving a speaker another voice needs no new review;
changing what a line says does. The review can be done while the node is
still `coming-soon`: record it, set the status to `published`, then run
`pnpm audio:generate` for the audio of its lines.

Grammar, vocabulary and phrases nodes and exam parts can be published so far: every
writing and speaking part, and every reading and listening part. So can mock exams (see "Mock exams").
Other node kinds and exam parts are added to the schema as they are built.

A key that the schema does not know is an error, so a misspelt key is caught.

## What the checks reject

- A diagram whose drawing is not one `<svg>` 320 wide, that uses a shape,
  attribute or class a diagram may not have, gives itself a colour or a size,
  has a word outside `<text>`, or is not well-formed. A label that the
  drawing does not use, a `{{name}}` that is not a label or does not stand
  alone, and a Persian label with a Latin letter.
- A published grammar node with neither a table nor a diagram.
- A recognise-only node with a typed answer, a typed gap fill or a word
  ordering question.

- A node without a chapter, with a chapter that `chapters.yaml` does not
  have, or of another level or kind than its chapter. A chapter name that
  lacks a language.
- Persian text (a title, a chapter name, a purpose, an explanation, the
  caption of a diagram, the meaning of a phrase, the reason of a mistake, of a question or of an item)
  with a Latin letter
  outside asterisks. The Persian meaning of a vocabulary word is plain text
  and may hold no Latin letter at all.
- Text for the learner that lacks one of the three languages.
- A question with no correct answer, or with two where one is required.
- A wrong word that stands in its sentence twice, a right order that is not
  the same pieces as the first one or is listed twice, and a matching item or
  partner that is there twice.
- A prerequisite that is not the id of a node, and a prerequisite cycle
  (a node that needs itself, directly or through other nodes).
- A phrases node without a purpose or without an exam task, and an exam task
  that is not the id of an exam-part node.
- A phrase without its meaning in all three languages, without an exam task
  or without an example. An exam task of a phrase that is not one of its
  node's `examTasks`, and in a published node, an exam task of the node that
  no phrase serves.
- A published phrases node whose test can be passed without typing: as many
  questions answered by choosing (or by ordering or matching) as the pass
  mark of an attempt, or more.
- An exam-part node without its module or part number, or whose id is not
  `exam-<module>-<part>`, or with a part number its module does not have
  (Hören has four parts). A `purpose`, `examTasks`, `module`, `part` or
  `practice` in a node of another kind.
- An explanation of the wrong kind: `task`, `scoring` or `approach` in a
  grammar node, `rule` in an exam-part node; and one of a node's own that is
  missing in a language.
- A published node with fewer than 15 questions (a vocabulary node: fewer
  than 8 words, which give 16). A `coming-soon` draft may have fewer. An exam part is exempt: it has no pool. A reading part is held
  to the format of its part instead, and a writing or speaking part has none.
- A published reading or listening part whose practice task has not the
  number of texts and items of its part or the type of its items, an item
  `multiple-choice` without exactly three options, a text to hear in a reading part or
  a text to read in a listening part, a conversation with another number of
  speakers than its part has, and a part that has no task format yet.
- A text with neither a `body` nor `lines`, or with both; a text to hear
  without its `speakers`; a line whose speaker is not one of them; two
  speakers of one text with the same name or the same voice.
- A published exam part without its explanations.
- A writing or speaking node with `questions`, `practice` or a `review:`
  record, a published one without a `task`, and a task that lacks a field of
  its part, holds a field of another part, or lists the wrong number of
  points. A `task` in a reading part.
- Two node files with the same id, and two questions with the same id inside
  one node. Two practice tasks of one node with the same id, and two texts or
  two items with the same id inside one task.
- A word of the scope list that is in no vocabulary node or in two, and a word
  of a node that the scope list does not have. A vocabulary node without
  words, with `questions`, and words in a node of another kind.
- A word of a published vocabulary node that lacks a part; a word class,
  level, article or plural that differs from the scope list; an article or
  plural on a word that is no noun; a definition that uses the word itself;
  two words with the same meaning or definition that do not accept each
  other; a `tooCloseTo` that is not a word of the node.
- A published node with no review record, or whose questions, answers or
  task texts changed after its review. A `coming-soon` node needs none, and
  neither does a writing or speaking node.
- German of a published node that is spoken (an example, a word) without its
  audio file in `content/audio/`, and spoken German with a number that is not
  written in words.
- A mock exam whose file is not named by its id; a published one without
  every part of Lesen and Hören, with a part that has not the format of its
  exam part, or without a review record of its texts and items as they are;
  a `which-text` answer that is no text of its part (or "0"), or a text
  that answers two items; a `who-says` answer that is no speaker of its part;
  two texts or two items of one part with the same id.
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
