# Design direction

Status: chosen by the learner on 2026-11-26. Every interface ticket follows this document.

The learner picked a "warm and calm" reference (cream surfaces, soft raised panels, one orange accent, big clear numbers) and then chose layouts from a throwaway mock-up of the tree, a grammar node page and a test. The mock-up is kept on the branch `prototype/design-direction` and is not product code. The reference set the style only; the app copies no existing site or app.

## Principles

1. **Words before symbols.** A state or a kind is always written out ("Done", "Continue", "Start", "Coming soon"; "Grammar", "Vocabulary", "Phrases", "Exam parts"). Colour and shape support the word and never replace it.
2. **One obvious next step.** Every tree view shows a "Your next topic" card and a "You are here" marker.
3. **One accent.** Orange marks only the next recommended topic and the main action on a screen.
4. **Calm.** No streaks, points, badges, confetti or decorative images. Big light numbers show progress and scores.
5. **Phone first.** Every screen is designed at phone width and widens for a computer.

## Chosen layouts

- **Tree: route.** A horizontal strip shows Start, A1, A2, B1 and the exam, with counts and the "You are here" marker. Below it, the chosen level is one vertical line with a stop for each chapter. A stop shows the chapter name, its kind and "6 of 16 done", and opens to list its topics. The current chapter is open by default. A level ends with its checkpoint and a link to the next level; B1 ends with the exam and the readiness rule.
- **Node page: stacked cards.** One column of panels in the fixed order (rule, table or diagram, examples, common mistakes), with the "Take the test" button fixed at the bottom of the screen.
- **Test: one question per screen.** A segmented progress bar at the top, the question in one panel, and one main button at the bottom. The result is a single panel with the score as a big number, the wrong answers with their one-line reasons, and two buttons.
- **First visit.** The tree opens with one sentence saying what the page is and three numbered steps saying how it works. The steps can be dismissed.

## Chapters

The route depends on a grouping the spec does not have yet: a **chapter**, a named group of topics of one kind inside one level (for example "Verbs and tenses" or "Home and food"). The tree is level, then chapter, then topic. The curriculum order runs chapter by chapter, so progress fills one chapter before the next begins. Chapter names exist in all three languages. The chapter names in the mock-up were samples; the real ones are drawn up for the learner's approval together with the node lists. The grammar chapters are listed for approval in `docs/approvals/grammar-chapters.md`; how a chapter is written is in `content/README.md`.

## Colours

| Role | Value |
|---|---|
| Page background | `#ece6dd` |
| Panel | `#f6f2ec` |
| Raised highlight (inner cards, inputs) | `#fdfbf8` |
| Text | `#201d1a` |
| Secondary text | `#857b70` (see "Known gaps") |
| Hairline | `#dcd2c5` |
| Accent | `#f08a2b` |
| Accent, soft background | `#fbe2c8` |
| Accent, text on soft background | `#a4520b` |
| Correct | `#4f7a52` |
| Wrong | `#b4492f` |
| Kind tint: grammar | `#dccbb0` |
| Kind tint: vocabulary | `#bccab1` |
| Kind tint: phrases | `#b6c4d4` |
| Kind tint: exam parts | `#dfb7ac` |

Kind tints are used only as the background of a small label that also carries the kind's name.

## Typefaces

- Latin text, including all German: **Outfit**, weights 300, 400, 500 and 600.
- Persian: **Vazirmatn**, same weights.
- Both are shipped with the site. The app makes no request to a font service.
- Big numbers and page titles use weight 300. Body text is 16px with a line height of 1.5; the rule on a node page is 18px; German sentences in a test are 22px.
- Letter spacing is never applied to Persian text, because it breaks the joins between letters.

## Shapes and depth

- Panels: 22px corner radius, a 1px near-white border and one soft, wide, low shadow. Inner cards: 16px radius, no shadow.
- Buttons, labels and filters are fully rounded pills. State marks are circles.
- A state mark is an empty ring (not started), a half-filled ring (in progress), a dark filled circle with a tick (done) or a dashed ring (coming soon).
- Diagrams are SVG, drawn with the same colours and radii as the interface.

## Spacing

- 16px page padding; 14px between panels; 16px inside a panel.
- Reading width is at most 720px. Wide views are at most 1120px.
- Touch targets are at least 44px high.

## Right to left

- Persian pages are laid out right to left using logical properties (start and end, never left and right).
- Every piece of German inside a Persian page is isolated and reads left to right. Diagrams, word-order exercises and the umlaut buttons always read left to right.
- Arrows and chevrons that mean "forward" or "back" are mirrored in Persian.
- Numbers in Persian text use Persian digits.

## Motion

The mock-up had no motion, so this is a default the learner has not reviewed. Opening a chapter and changing a question may fade or slide for at most 150ms. Nothing moves for decoration, and all motion is switched off when the device asks for reduced motion.

## Known gaps to fix when building

The mock-up was not checked for contrast. Two pairs fall below the usual minimum of 4.5 to 1 for text:

- White text on the orange accent is about 2.5 to 1. Dark text (`#201d1a`) on the same orange is about 6.7 to 1. The main button needs dark text or a darker orange, and the learner should see the result.
- Secondary text `#857b70` on the page background is about 3.3 to 1. It needs to be darkened.

The Persian wording in the mock-up was a draft and needs a native reader.
