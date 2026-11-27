# Private packs

A pack is a folder of practice exams from a book the learner owns. It lives in
`private/<pack id>/` inside the project and is never published.

- [Pack format](#pack-format): what the folder contains. Read this to load a pack in the app.
- [Finding packs in the app](#finding-packs-in-the-app): how the app detects packs, and what the start files provide.
- [Building a pack](#building-a-pack): the command that makes one from a book's files.
- [Book profile](#book-profile): what to tell the command about a book that is laid out differently.
- [When a real book does not build](#when-a-real-book-does-not-build)

## Never published

Three things keep a pack on the learner's computer:

1. `.gitignore` ignores `private/`, so a pack cannot be committed.
2. The published site is built by GitHub Actions from the repository, which never holds `private/`.
3. `keepPacksOutOfTheSite` in `src/pack-builder/vite-plugin.ts` fails `pnpm build` when code
   imports or links a file from `private/`, when the static-files folder would copy it or holds a
   link into it, or when the output would hold a `private` folder. The dev server is not affected.

Tests for all three are in `tests/pack-builder/private-folder.test.ts`. Tests write packs to a
temporary folder, never to the repository's `private/`. The browser test
`tests/browser/private-packs.spec.ts` also checks that the built site answers no pack file.

## Pack format

The schema and the types are in `src/content-model/pack.ts` (`packDescriptionSchema`,
`packAnswerKeySchema`, `PACKS_FOLDER`, the file names). This section is the same thing in words.

```
private/
  packs.json                which packs the folder holds (see below)
  my-book/                  the pack id is the folder name
    pack.json               the description
    answers.json            the answer key
    exams/
      01/
        pages.pdf           every page of exam 1, copied from the book
        hoeren-1.mp3        the recording of exam 1, Hören, part 1
        hoeren-2.mp3
        ...
      02/
        ...
```

Every path inside the two JSON files is relative to the pack folder and uses forward slashes.
Pages, parts and items are counted from 1. `format` is 1 in both files; a reader should refuse
any other number.

### pack.json

```json
{
  "format": 1,
  "id": "my-book",
  "name": "My practice book",
  "examCount": 15,
  "exams": [
    {
      "number": 1,
      "pagesFile": "exams/01/pages.pdf",
      "pageCount": 24,
      "sourcePages": { "first": 8, "last": 31 },
      "modules": [
        {
          "id": "lesen",
          "title": "Lesen",
          "pages": { "first": 1, "last": 10 },
          "sourcePages": { "first": 8, "last": 17 },
          "parts": [
            {
              "number": 1,
              "pages": { "first": 1, "last": 2 },
              "sourcePages": { "first": 8, "last": 9 },
              "items": [
                { "number": 1, "choices": ["richtig", "falsch"] },
                { "number": 2, "choices": ["richtig", "falsch"] }
              ],
              "recordings": []
            }
          ]
        },
        {
          "id": "hoeren",
          "title": "Hören",
          "pages": { "first": 11, "last": 15 },
          "sourcePages": { "first": 18, "last": 22 },
          "parts": [
            {
              "number": 1,
              "pages": { "first": 11, "last": 12 },
              "sourcePages": { "first": 18, "last": 19 },
              "items": [
                { "number": 1, "choices": ["richtig", "falsch"] },
                { "number": 2, "choices": ["a", "b", "c"] }
              ],
              "recordings": [{ "file": "exams/01/hoeren-1.mp3", "source": "Track 01.mp3" }]
            }
          ]
        },
        { "id": "schreiben", "title": "Schreiben", "pages": { "first": 16, "last": 19 }, "sourcePages": { "first": 23, "last": 26 }, "parts": [] }
      ]
    }
  ]
}
```

- `pages` counts inside the exam's own PDF (`pagesFile`). This is the range to show for a part.
  A page range includes both ends.
- `sourcePages` counts in the learner's original exam PDF. It is there for checking a pack
  against the book, not for showing.
- A module with `parts: []` (Schreiben, Sprechen) has pages but is not scored.
- `items` is what an answer sheet needs: the number printed beside each item, and the answers
  to offer for it. Items are numbered through a module, so Lesen runs 1 to 30 over its five
  parts. In Hören part 1 the choices change from item to item.
- `recordings` is in playing order. It is empty for a part without a recording. A part with
  several recordings gets `hoeren-1-1.mp3`, `hoeren-1-2.mp3`. The file ending is the learner's
  own (`.mp3`, `.m4a`, ...). `source` is the file's name in the learner's audio folder.

With the default profile a pack has the Goethe-Zertifikat B1 structure:

| Module | Part | Items | Choices |
|---|---|---|---|
| Lesen | 1 | 1 to 6 | richtig, falsch |
| Lesen | 2 | 7 to 12 | a, b, c |
| Lesen | 3 | 13 to 19 | a to j, or 0 for "no advert fits" |
| Lesen | 4 | 20 to 26 | ja, nein |
| Lesen | 5 | 27 to 30 | a, b, c |
| Hören | 1 | 1 to 10 | richtig, falsch for odd items; a, b, c for even items |
| Hören | 2 | 11 to 15 | a, b, c |
| Hören | 3 | 16 to 22 | richtig, falsch |
| Hören | 4 | 23 to 30 | a, b, c |

A reader should not rely on this table. Everything in it is in `pack.json`, and a pack built
with another profile has other modules, parts and choices.

### answers.json

```json
{
  "format": 1,
  "exams": [
    {
      "number": 1,
      "modules": [
        {
          "id": "lesen",
          "parts": [
            { "number": 1, "answers": [{ "item": 1, "answer": "richtig" }, { "item": 2, "answer": "falsch" }] }
          ]
        },
        {
          "id": "hoeren",
          "parts": [
            { "number": 1, "answers": [{ "item": 1, "answer": "falsch" }, { "item": 2, "answer": "b" }] }
          ]
        }
      ]
    }
  ],
  "repairs": [
    { "exam": 4, "module": "lesen", "part": 2, "item": 9, "printed": 8 },
    { "exam": 6, "module": "hoeren", "part": 1, "item": 3, "printed": null }
  ]
}
```

- Every scored part of `pack.json` has a part here with one answer per item. `answer` is always
  one of the item's `choices`, in the same spelling, so scoring is a plain comparison.
- Every item counts the same. A module's score out of 100 is the share of right answers; the
  format holds no points.
- `repairs` lists the places where the book's key prints a wrong item number (`printed` is the
  number it prints), or prints an answer without its number (`printed` is `null`). The answers
  above are already right. The list is for checking those places against the book by hand.

### packs.json

```json
{ "format": 1, "packs": ["my-book", "other-book"] }
```

The ids of the packs in the folder, in name order: every subfolder whose name is a pack id and that
holds a `pack.json`. A browser cannot list a folder, so this file is how the app finds the packs
(`packListSchema`). Nobody writes it by hand: the builder rewrites it after every build
(`writePackList` in `src/pack-builder/pack-list.ts`), the dev server answers it from the folder
as it is, and a start file's server rewrites it with the same rules when it starts.

### address.json

```json
{ "format": 1, "phone": "http://192.168.1.23:8000/" }
```

The address a phone or tablet on the same Wi-Fi opens, or `null` when the computer is on no network
(`localAddressSchema`). Only a start file's server writes it, when it starts. The page "Your exam
books" shows the address when the file is there.

### What the format leaves to the app

- The pages are PDF, not pictures. The exam view draws pages `first` to `last` of `pagesFile`
  with PDF.js (`src/app/BookPages.tsx`).

### A pack for tests

`tests/pack-builder/fixture.ts` makes a small synthetic book, and the builder turns it into a
pack. A browser test can get a fixture pack this way, in a temporary folder:

```ts
import { buildPack } from '../../src/pack-builder/index.ts'
import { fixtureBook, writeFixtureBook } from '../pack-builder/fixture.ts'

const book = await writeFixtureBook(fixtureBook())
const { packDir } = await buildPack({
  examPdf: book.examPdf,
  answerKeyPdf: book.answerKeyPdf,
  audioDir: book.audioDir,
  name: 'Fixture book',
  outDir: someTemporaryFolder,
})
```

That pack has two exams of twelve pages each with the full B1 structure, eight silent MP3
recordings, and one repair. Its right answers are the lines of `fixtureBook()`. The browser tests
build it with `tests/browser/fixture-pack.ts` and serve it as the `private` folder of the site
under `/local/` (`tests/browser/serve-site.ts`).

## Finding packs in the app

The pack loader (`src/pack-loader/index.ts`) runs in the browser. It requests
`private/packs.json` beside the page's `index.html`, then each listed pack's `pack.json`, and the
answer key when a module is opened. There is nothing to configure:

| Where the app runs | What answers `private/packs.json` |
|---|---|
| `pnpm dev` | `packsOnTheDevServer` (`src/pack-builder/vite-plugin.ts`), from the project's `private/` as it is now. |
| The folder of the start files | The file itself, which the start file's server rewrote when it started. |
| The public site | Nothing: a 404. The app finds no pack and explains where to put one. |

Anything that is not a readable list (a 404, an HTML page, another `format`) counts as no pack.
A listed pack whose `pack.json` cannot be read is shown by its folder name as unreadable.

**What the start files provide.** `pnpm share` writes a folder whose `app/` holds the built site
(`dist/`: `index.html`, `assets/`, `content/`, `pdfjs/`) and, beside `index.html`, the `private/`
folder with the packs. A start file serves `app/` over HTTP to this computer and to the home
network. When it starts, its server rewrites `private/packs.json` from the subfolders that hold a
`pack.json`, so a pack copied in by hand is found, and writes `private/address.json`. It answers
partial requests (`Range`), which iPhones need to play and seek recordings. Pages, recordings and
JSON files are requested with plain GET requests, relative to the page, so a phone uses the app the
same way. How the folder is made and started: [README.md](../README.md), "Running the app at home".

The views: `#/packs` (`src/app/PacksPage.tsx`) lists the packs, or explains where to put one;
`#/packs/<pack>/<exam>/<module>?part=<n>` (`src/app/PackExamPage.tsx`) shows the part's pages
beside its answer sheet (`src/app/AnswerSheet.tsx`) and its recordings. Each part is scored on its
own (`scoreAnswerSheet` in the learning engine), and the module out of 100 once every part is
checked (`scoreModule`, `examScore`). Results are not saved in the progress. The view and PDF.js
load only when it is opened. PDF.js's fonts, character maps and decoders are copied into the site
under `pdfjs/` (`src/pack-loader/vite-plugin.ts`), so no request goes to another server.

## Building a pack

Run once per book, on the computer that has the book's files:

```
pnpm pack:build --exam <exams.pdf> --key <answer-key.pdf> --audio <folder> --name "My practice book"
```

| Option | Meaning |
|---|---|
| `--exam <file>` | The book's exams as one PDF. It must have a text layer (text you can select), unless the profile has a [layout](#every-exam-on-the-same-pages). |
| `--key <file>` | The book's answer key as a PDF with a text layer. |
| `--audio <folder>` | The folder with the recordings. Subfolders are read too. |
| `--name <text>` | The pack's name, as the app shows it. |
| `--profile <file>` | What is special about this book. See [Book profile](#book-profile). |
| `--id <text>` | The pack's folder name. Default: the name in lower case with hyphens. |
| `--out <folder>` | Where packs live. Default: `private`. |
| `--replace` | Replace a pack that already has this folder name. Without it the command refuses. |

The command copies the learner's files and rearranges them. It does not retype, translate,
recognise or upload anything.

It writes a pack only when everything adds up. Otherwise it writes nothing, exits with status 1,
and prints every problem with the exam, module, part or file it is about, followed by the
headings it did find and their pages. These are errors:

- no text layer, or a file that is not a readable PDF;
- exam headings that do not count 1, 2, 3 ..., or a different number of exams than the profile says;
- a layout that puts the last exam past the end of the exam PDF;
- an exam with a missing, repeated or out-of-order module or part heading;
- a part whose number of answers in the key differs from its number of items;
- an answer that is not one of its item's choices;
- an exam that the key does not have, or one that only the key has;
- a recording whose name matches nothing, or points at an exam or part that does not exist;
- a part of the module with recordings that has no recording;
- a pack folder that already exists.

When it succeeds it prints each exam's pages, items and recordings, and every repair it made in
the answer key. Check a few exams and every repair against the book.

### How the files are read

**Exam PDF.** The builder reads the text of each page line by line and looks for three kinds of
heading: exam, module, part. It walks the pages in order and notes each page where the exam,
the module or the part *changes*. A heading that repeats the current one changes nothing, so a
book with a running head on every page and a book with one heading per section read the same.
A section runs from its heading's page to the page before the next heading. When two headings
share a page, that page belongs to both sections. Part headings are only looked for in modules
that have parts in the profile. With a [layout](#every-exam-on-the-same-pages) in the profile, no
heading is looked for and no text is read: the pages come from the layout.

**Answer key.** The builder finds the exam, module and part headings in the key and reads the
answers under each in the order they are printed. An answer goes to an item by its place, not by
the number printed beside it: the third answer of a part belongs to the part's third item. That
is what repairs a numbering misprint. It is safe because of the two checks above (the count and
the choices). Each place where the printed number differs, or where no number is printed, is
recorded as a repair.

**Recordings.** Each file's name, without its ending, is matched against the profile's file
pattern. The pattern either names the exam and the part, or gives a running track number. With
track numbers, the tracks in number order are the parts in book order, one recording per part,
and the count must be exact. Hidden files are skipped. Every other file must match the file
pattern or the ignore pattern.

## Book profile

A profile is a YAML file with the things that differ from book to book. Every key is optional;
what is left out keeps its default. The defaults and the schema are in
`src/pack-builder/profile.ts`. Keep a real book's profile beside the book's files, not in the
repository.

The defaults, written out as a profile:

```yaml
# exams: 15            # optional: how many exams the book has; any other number is an error

modules:               # one exam's modules, in book order
  - id: lesen
    title: Lesen
    parts:             # the scored parts; leave out for a module without answers
      - { items: 6, choices: [richtig, falsch] }
      - { items: 6, choices: [a, b, c] }
      - { items: 7, choices: [a, b, c, d, e, f, g, h, i, j, "0"] }
      - { items: 7, choices: [ja, nein] }
      - { items: 4, choices: [a, b, c] }
  - id: hoeren
    title: Hören
    recordings: true   # this module's parts have recordings
    parts:
      - { items: 10, choices: [[richtig, falsch], [a, b, c]] }   # items take the lists in turn
      - { items: 5, choices: [a, b, c] }
      - { items: 7, choices: [richtig, falsch] }
      - { items: 8, choices: [a, b, c] }
  - { id: schreiben, title: Schreiben }
  - { id: sprechen, title: Sprechen }

examPdf:
  columns: 1           # columns of text on a page
  firstPage: 1         # skip earlier pages (contents, introduction)
  # lastPage: 300      # skip later pages (transcripts, answer sheets); default: the last page
  exam: '^Modelltest (\d+)$'      # group 1: the exam's number
  modules:                        # one heading pattern per module id
    lesen: '^Lesen$'
    hoeren: '^Hören$'
    schreiben: '^Schreiben$'
    sprechen: '^Sprechen$'
  part: '^Teil (\d+)$'            # group 1: the part's number
  # layout: ...                   # the pages of every exam instead of headings; see below

answerKey:
  columns: 1
  exam: '^Modelltest (\d+)$'
  modules:                        # only the modules with parts
    lesen: '^Lesen$'
    hoeren: '^Hören$'
  part: '^Teil (\d+)\b'           # null when the key has no part headings
  # group 1: the printed item number; group 2: the answer as printed
  item: '(?<!\S)(\d{1,2})[.):]?[ \t]+(?i:(richtig|falsch|ja|nein|[a-j0]))(?!\S)'
  answers: {}                     # printed answer -> choice, for example { r: richtig, f: falsch }

recordings:
  # named groups exam and part, or one named group track
  file: '^\D*(?<exam>\d+)\D+(?<part>\d+)\D*$'
  # ignore: '\.(jpg|txt)$'        # files that are not recordings; matched against the whole name
```

Rules for the keys:

- **Patterns** are JavaScript regular expressions. They are matched against a page's text with
  one line of the page per line of text. `^` and `$` are the start and end of a line. Write
  `(?i:...)` to ignore case. In YAML, put a pattern in single quotes.
- `examPdf`, `answerKey` and `recordings` are merged key by key with the defaults. `modules`
  (the list) and the two `modules` maps of patterns are replaced as a whole when given.
- With `answerKey.part: null` the key has no part headings. A module's answers are then read as
  one run and cut into parts by item count.
- `answerKey.item` may make the number optional, as in `(?:(\d{1,2})\s+)?`, for a key that
  sometimes prints an answer without its number. Such an answer is taken by its place like any
  other, and listed as a repair. Write `\s+` rather than `[ \t]+` between the number and the
  answer when the key breaks a line between them (`28 a, 29` and `b, 30 a` on the next line).
- `answerKey.answers` is looked up without regard to case. The result must be one of the item's
  choices.
- `columns: 2` cuts each page into two equal halves and reads the left one first. Use it when
  two columns put unrelated text on one line.
- A book with a contents page that repeats the headings needs `firstPage`. A book with
  transcripts or answer sheets after the last exam needs `lastPage`, or the last exam swallows
  them.

A book laid out differently, as an example: a running head `Übungssatz 1 | Leseverstehen |
Aufgabe 2` on every page, a two-column key such as `LV: 1. R 2. F 3. R 4. b 5. a` with no part
headings, and recordings `CD1/Track 2.mp3`, `CD1/Track 3.mp3`, ... This is `otherBook()` in
`tests/pack-builder/fixture.ts`, whose profile also has a shorter `modules` list.

```yaml
examPdf:
  firstPage: 3
  lastPage: 14
  exam: '^Übungssatz (\d+) \|'
  modules:
    lesen: '\| Leseverstehen\b'
    hoeren: '\| Hörverstehen\b'
    schreiben: '\| Schriftlicher Ausdruck$'
  part: '\| Aufgabe (\d+)$'
answerKey:
  columns: 2
  exam: 'Übungssatz (\d+)'
  modules: { lesen: '^LV:', hoeren: '^HV:' }
  part: null
  item: '(\d+)\. (R|F|[a-c])(?!\S)'
  answers: { R: richtig, F: falsch }
recordings:
  file: '^Track (?<track>\d+)$'
  ignore: '\.jpg$'
```

### Every exam on the same pages

A scanned book's text layer may be too poor to find the headings in: misread, missing, or spelled
differently from exam to exam. When every exam has the same pages, `examPdf.layout` gives them
instead, and no heading is looked for. The exam PDF then needs no text layer at all, and the
other `examPdf` keys are not used.

- `firstPage`: the page of the exam PDF where exam 1 starts.
- `pagesPerExam`: how many pages every exam has. Exam 2 starts on the page after exam 1 ends.
- `modules`: for every module of the profile, by id, its `pages` within one exam, and for a module
  with parts one range in `parts` for each of them, in order. Pages count from 1 at the exam's
  first page. A range is `[first, last]`, both included.
- `exams` is needed: a layout cannot count the exams.

The ranges must lie inside one exam (modules) or inside their module (parts), and each must start
no earlier than the one before it ends: two sections may share a page, as with headings. The last
exam must end inside the exam PDF. The pack is the same as one built from headings that start on
those pages.

This is the layout of `scannedBook()` in `tests/pack-builder/fixture.ts`: the default book with
its headings misread or missing. Its key also prints one answer without its number, so the item
pattern makes the number optional.

```yaml
exams: 2
examPdf:
  layout:
    firstPage: 2       # exam 1 is pages 2 to 13, exam 2 pages 14 to 25
    pagesPerExam: 12
    modules:
      lesen: { pages: [1, 6], parts: [[1, 1], [2, 3], [4, 4], [5, 5], [6, 6]] }
      hoeren: { pages: [7, 10], parts: [[7, 7], [8, 8], [9, 9], [10, 10]] }
      schreiben: { pages: [11, 11] }
      sprechen: { pages: [12, 12] }
answerKey:
  item: '(?<!\S)(?:(\d{1,2})[.):]?\s+)?(?i:(richtig|falsch|ja|nein|[a-j0]))(?!\S)'
```

## When a real book does not build

1. Read the report. It names what does not add up and lists the headings that were found, with
   their pages. Most problems are a pattern that matches too little or too much; fix the profile.
2. If the builder itself is wrong, reproduce the quirk on the synthetic book first. A book in
   `tests/pack-builder/fixture.ts` is plain data: the lines on each page and the recording file
   names. Change or add lines of invented text until the test shows the problem, then fix the
   builder.
3. Never paste text from the book into a fixture, a test, an issue or a commit. A heading's
   shape ("a running head with the exam number first") is enough to reproduce a layout.
