# Spec: deutsch-tree — a syllabus tree for learning German from zero to Goethe B1

Status: published as an issue in the project repository, labelled `ready-for-agent`.
Date: 2026-11-26.

## Vocabulary used in this spec

- **Tree**: the full syllabus, shown as a graph of nodes grouped by level (A1, A2, B1).
- **Node**: one unit to learn. Four kinds: **grammar**, **vocabulary**, **phrases**, **exam part**.
- **Pool**: all test questions written for a node. **Attempt**: one test run that draws a subset of the pool.
- **Done**: a node whose test was passed at 90% or more.
- **Recognise-only node**: a grammar node the learner must understand but not produce.
- **Checkpoint**: an advisory test per level that draws from all nodes of that level.
- **Mock exam**: a full four-module exam in the Goethe B1 format. Three tiers: **original** (written for this project), **private pack** (a book the learner owns), **official** (linked, kept for the final check).
- **Pack**: a self-describing folder of private exam material that is never published.
- **Learner**: the person studying. **Maintainer**: the person or agent writing content.

## Problem Statement

I want to pass the Goethe-Zertifikat B1, which I need for official purposes in Germany. I already know some German, but I have forgotten things and do not know exactly what is left to learn.

The exam's scope is fixed and public, yet nothing shows it to me as one complete, checkable picture. Courses walk me through chapters at their pace. Apps such as Duolingo push streaks and daily habits and never tell me whether I am ready. Grammar references explain rules but do not test me or track what I have mastered. The exam tests four skills (Lesen, Hören, Schreiben, Sprechen), not grammar alone, and I have no way to measure each of them.

A second learner in my household speaks Persian and not English, so English-only material does not work for them.

I study whenever I have time, not on a schedule. I want to open something, pick one topic, learn it, prove I know it, and move on, until I can see that nothing is left and that I will pass.

## Solution

A website called **deutsch-tree** that shows everything from zero to B1 as a tree of small nodes. Each node has a clean explanation and a test. Passing the test at 90% marks the node done. A highlighted "next recommended" node means I never have to decide what to do next, but nothing is locked.

Every explanation is available in English, Persian and simple German. German examples are the same in all three and can be played aloud in a natural voice.

The tree covers grammar (212 topics), vocabulary (the roughly 2,400 words in scope for Goethe B1), set phrases for writing and speaking, and every part of the exam. Grammar is also available as a reference: a search box and one page with every table.

Readiness is measured by mock exams, not by ticked topics. Reading and listening are scored automatically. Writing and speaking are scored by pasting a ready-made prompt into an AI assistant and typing the score back in. I count as ready when I reach 90% in every module on two official mock exams that I have kept unseen until the end.

The site is public and free to visit, and works on phones. Progress is saved in the browser, with no account. Practice exams from a book I own can be added as a private pack that stays on my computer and can be shared as a folder with another learner in my household.

## User Stories

### Finding my way

1. As a learner, I want to see the whole syllabus as a tree grouped by A1, A2 and B1, so that I can see everything I need to learn in one place.
2. As a learner, I want each node to show whether it is not started, in progress or done, so that I can see what is left.
3. As a learner, I want one node highlighted as "next recommended", so that I never have to think about what to study next.
4. As a learner, I want to open any node at any time, so that I can study what I feel like or what I am weak at.
5. As a learner, I want to see which nodes a topic builds on, so that I know what to review if a topic is too hard.
6. As a learner, I want to tell the four kinds of node apart at a glance, so that I can choose between grammar, vocabulary, phrases and exam practice.
7. As a learner, I want to filter the tree by level and by kind, so that the tree stays readable on a phone.
8. As a learner, I want unfinished nodes to be visible but marked "coming soon", so that I can see the full scope while content is still being written.
9. As a learner, I want to see counts of done and remaining nodes per level and per kind, so that I can judge how far along I am.
10. As a learner, I want no streaks, points, reminders or daily goals, so that the app serves my study and does not demand my attention.

### Learning a grammar topic

11. As a learner, I want every grammar page to follow the same order (rule, table or diagram, examples, common mistakes, test), so that I always know where to look.
12. As a learner, I want the rule stated in two or three sentences, so that I get the point before the details.
13. As a learner, I want diagrams for word order, cases and prepositions, so that I can see a structure I would struggle to picture from text.
14. As a learner, I want a list of common mistakes for each topic, so that I can avoid the errors learners usually make.
15. As a learner, I want recognise-only topics clearly labelled, so that I do not waste effort trying to produce forms the exam only expects me to understand.
16. As a learner, I want to search across all nodes, so that I can find a rule quickly when I meet it elsewhere.
17. As a learner, I want one "all grammar at a glance" page with every table, so that I can use the app as a reference.
18. As a learner, I want to reach a node's page directly by link, so that I can bookmark it or send it to another learner.

### Languages

19. As a learner, I want to choose English, Persian or simple German for explanations and menus, so that I read in the language I understand best.
20. As a Persian-speaking learner, I want Persian pages laid out right to left, with German examples still reading left to right, so that mixed text is readable.
21. As a learner, I want my language choice remembered on my device, so that I set it once.
22. As a learner, I want German examples to be identical in every language, so that learners using different languages study the same sentences.
23. As a learner, I want the simple German explanations written at about A2 level, so that I can switch to German-only study once I am able to.
24. As a learner, I want to switch language on any page without losing my place, so that I can check an explanation in a second language.

### Hearing German

25. As a learner, I want a play button on every German example sentence, so that I can hear how it sounds.
26. As a learner, I want the audio to sound natural and the same on every device, so that I am not learning from a robotic voice.
27. As a learner, I want vocabulary words read aloud with their article, so that I learn the gender by ear.
28. As a learner, I want listening practice dialogues spoken by more than one voice, so that I can tell speakers apart as in the exam.

### Taking a node's test

29. As a learner, I want to take a node's test without reading the page first, so that I can clear topics I already know.
30. As a learner, I want each attempt to draw a fresh random set of questions from a larger pool, so that passing on a retry means I know the topic and have not memorised answers.
31. As a learner, I want a node marked done automatically when I score 90% or more, so that my progress reflects proven knowledge.
32. As a learner, I want to retry a failed test as often as I like, so that failing costs me nothing.
33. As a learner, I want to see which questions I got wrong and a one-line reason for the right answer, so that I learn from each attempt.
34. As a learner, I want every question to have one clearly right answer, or to accept every valid answer, so that I am never marked wrong for correct German.
35. As a learner, I want on-screen buttons for ä, ö, ü and ß, so that I can type German on any keyboard.
36. As a learner, I want small slips such as extra spaces, or "ae" for "ä", accepted with a note, so that I am tested on German and not on typing.
37. As a learner, I want a "report a problem" link on every question, so that a wrong or unclear question gets fixed.
38. As a learner, I want to un-mark a done node, so that I can come back to a topic I have forgotten.
39. As a learner, I want recognise-only nodes tested on understanding only, so that their tests match what the exam expects.
40. As a learner, I want question types to vary (fill a gap, choose a form, order words, find the error), so that I practise a rule from several angles.

### Vocabulary

41. As a learner, I want the words in scope split into themed nodes of about 25 words, so that I can learn vocabulary in small sittings.
42. As a learner, I want each word shown with its article, plural, meaning and an example sentence, so that I learn how to use it and not only what it means.
43. As a learner, I want to be tested from German to my language, so that I can check that I recognise the word.
44. As a learner, I want to be tested from my language to German, typing the word with its article, so that I can produce it in writing and speaking.
45. As a learner, I want to export a vocabulary node, or all nodes I have started, to a file Anki can import, so that I can use spaced repetition outside the app.
46. As a learner, I want each word tagged with its level, so that I know whether it is A1, A2 or B1 vocabulary.

### Phrases for writing and speaking

47. As a learner, I want nodes of set phrases grouped by purpose (opening and closing an email, giving an opinion, agreeing, disagreeing, suggesting, apologising), so that I have ready language for the exam tasks.
48. As a learner, I want to know which exam task each phrase is useful for, so that I can prepare each task deliberately.
49. As a learner, I want phrase nodes to have tests, so that I prove I can recall the phrases and not merely recognise them.

### Exam practice

50. As a learner, I want one node for each part of the Goethe B1 exam, explaining what the part asks, how it is scored and how to approach it, so that nothing in the exam surprises me.
51. As a learner, I want practice tasks for each reading and listening part that are scored automatically, so that I can train one part at a time.
52. As a learner, I want a ready-made prompt for each writing task that I can paste into an AI assistant with my text, so that I get a score against the official criteria.
53. As a learner, I want a ready-made prompt for each speaking task that makes an AI assistant act as examiner or partner in voice mode, so that I can practise speaking aloud and get a score.
54. As a learner, I want those prompts to demand strict grading, so that the score does not flatter me.
55. As a learner, I want to type the AI's score into the app, so that writing and speaking nodes can be marked done at 90%.
56. As a learner, I want full original mock exams inside the app, with all four modules, so that I can practise whole exams on any device.
57. As a learner, I want a timer on mock exam modules that I can switch off, so that I can practise under exam conditions when I choose to.
58. As a learner, I want reading and listening results shown per part and as a score out of 100, so that I can compare them with the pass mark of 60 and my target of 90.
59. As a learner, I want my mock exam results kept as a history, so that I can see whether I am improving.
60. As a learner, I want links to the official mock exams, with a clear warning to keep them for the final check, so that I do not use them up early.
61. As a learner, I want to record my scores on the official mock exams, so that the app can tell me whether I have reached my readiness target.
62. As a learner, I want a readiness view that says plainly whether I have scored 90% in every module on two official mock exams, so that I know when to book the exam.

### Level checkpoints

63. As a learner, I want a checkpoint test for each level that draws from all its nodes, so that I catch things I passed earlier and have since forgotten.
64. As a learner, I want the checkpoint to list the nodes I got wrong, so that I know exactly what to revisit.
65. As a learner, I want checkpoints to be advisory, so that a weak result never blocks me.

### Private exam packs

66. As a learner who owns a book of practice exams, I want to add it as a private pack, so that I can take those exams inside the app with scoring.
67. As a learner, I want the app to find a pack automatically in a fixed place, so that I do not have to configure anything.
68. As a learner, I want to see the book's original pages next to an answer sheet and an audio player, so that I work from the real material.
69. As a learner, I want reading and listening in a pack scored automatically from the book's answer key, so that I do not have to mark my own work.
70. As a learner, I want a one-time setup command that builds the pack from my PDF and audio files, so that I do not have to sort pages and recordings by hand.
71. As a learner, I want to share the finished pack as a folder with another learner in my household, so that they can use it on their computer with no setup.
72. As a learner, I want a start file I can double-click on Mac or Windows, so that I can run the app locally without technical steps.
73. As a learner, I want to open the locally running app from a phone or tablet on my home Wi-Fi, so that I can use the pack away from the computer.
74. As a learner, I want the app to explain where to put a pack when none is found, so that I know what to do.
75. As a book owner, I want private pack material never to be uploaded or published, so that I respect the publisher's copyright.

### Progress

76. As a learner, I want my progress saved in my browser with no account, so that I can start immediately.
77. As a learner, I want to export my progress to a file and import it on another device, so that I can move between phone and computer and keep a backup.
78. As a learner, I want importing to warn me before it replaces existing progress, so that I do not lose work by accident.
79. As a learner, I want my progress to survive app updates, so that new content never resets what I have done.

### Using it anywhere

80. As a learner, I want the app to work well on a phone, so that I can study whenever I have a few minutes.
81. As a friend with the link, I want to open the public site and start, so that I can use it without installing anything.
82. As a learner, I want pages to load quickly and audio to load only when I press play, so that the app is usable on a mobile connection.

### Maintaining content

83. As a maintainer, I want each node to be one human-editable text file holding its metadata, three explanations and question pool, so that content can be fixed without touching code.
84. As a maintainer, I want an automatic check that rejects incomplete or inconsistent content, so that broken content never reaches learners.
85. As a maintainer, I want a node to be publishable only after an independent review of its test has been recorded, so that question quality is enforced and not assumed.
86. As a maintainer, I want problem reports to arrive as issues naming the node and the question, so that I can find and fix them quickly.
87. As a maintainer, I want to add B2 later by adding content files with a new level, so that the app grows without a rebuild.
88. As a maintainer, I want audio generated from the content files by a repeatable command, so that changed sentences get new audio without manual work.
89. As a maintainer, I want the check to confirm that vocabulary nodes together cover the in-scope word list, so that no word is silently left out.

## Implementation Decisions

### Shape of the product

- A static website with no backend, no accounts and no analytics. It is hosted on GitHub Pages from a public repository, and the same built site can run from a local computer.
- TypeScript throughout. A single-page app built with Vite and React. pnpm as the package manager.
- Content is compiled at build time into data the app loads; the app never parses raw content files in the browser.
- Online only in this version. No offline mode.
- Commits use GitHub's private "noreply" address, because the repository is public.

### Modules

- **Content model**: the schema for nodes, questions, vocabulary entries, mock exams and the curriculum order. Every other module depends on it.
- **Content pipeline**: reads content files, validates them against the content model, and emits the compiled bundle plus a report. It fails the build on any error.
- **Learning engine**: pure logic with no UI and no storage. It draws an attempt from a pool, checks answers, scores attempts and exams, applies results to progress, and chooses the next recommended node.
- **Progress store**: saves and loads progress in browser storage, migrates older saved versions, and exports and imports a progress file.
- **App shell**: routing, the tree view, node pages, test UI, search, the overview page, the exam UI and the readiness view.
- **Language layer**: interface strings in three languages, text direction, and selection of the explanation language.
- **Audio pipeline**: a maintainer command that generates audio for every German example, word and dialogue line from the content files, and skips items whose text is unchanged.
- **Pack builder**: a maintainer command that turns a learner's own exam book files into a pack.
- **Pack loader**: detects packs at run time and exposes them to the exam UI.

### Content model

- A node has: a stable identifier, kind, level, title, prerequisites, position in the curriculum order, a recognise-only flag, a status (coming soon or published), a review record, explanations in three languages, German examples, and a question pool.
- Grammar node identifiers map one-to-one to the 212 numbered topics in the approved grammar list. The list's numbers stay stable; new topics get new numbers.
- One file per node. The file is plain text with structured metadata, three language sections and a structured question pool.
- A question has: a stable identifier, a type, a prompt, the accepted answers, and a one-line explanation in each language. Types: multiple choice, gap fill, typed answer, word ordering, find the error, matching, and true/false.
- Every question either has exactly one correct option or lists every accepted answer.
- Pool size scales with the topic: about 15–20 questions for small topics, up to 40 for large ones. An attempt draws 10–15.
- A vocabulary entry has: the German word, article and plural for nouns, word class, level, meanings in English and Persian, a simple German definition, and an original example sentence. Vocabulary nodes hold about 25 entries.
- The Goethe word lists define which words are in scope. All sentences, definitions and translations are original.
- A mock exam has the four Goethe B1 modules: Lesen (5 parts, 30 items), Hören (4 parts, 30 items), Schreiben (3 tasks), Sprechen (3 parts).

### Learning rules

- The pass mark for a node test is 90%, applied as the smallest whole number of questions that is at least 90% of the attempt.
- Passing marks a node done. A learner can un-mark a node. Failing never changes a done node.
- Any node's test can be taken without opening its page.
- Prerequisites are advisory and never lock a node.
- The next recommended node is the earliest node in the curriculum order that is published and not done.
- Typed answers are compared after trimming and collapsing spaces. The substitutes ae, oe, ue and ss are accepted with a note. A capitalisation difference is accepted with a note.
- Vocabulary is tested in both directions. The direction into German requires the article for nouns.
- Lesen and Hören are scored as correct items out of 30, converted to a score out of 100.
- Schreiben and Sprechen scores are entered by the learner from an AI assistant's grading. The app provides the prompt, which contains the task, the official marking criteria and an instruction to grade strictly. The app does not call any AI service.
- A checkpoint draws across all published nodes of a level and reports the nodes with wrong answers. It changes no node's state.
- Readiness means 90 or more in every module on two official mock exams, as recorded by the learner.

### Languages

- Three explanation and interface languages: English, Persian, simple German. Persian renders right to left; German text inside Persian pages renders left to right.
- The choice is stored on the device. There are no profiles; one device serves one learner.
- Simple German is written at about A2 level.

### Audio and images

- Audio is generated once with a voice the learner picks from samples, then stored as files with the site. The browser's built-in speech is not used.
- Listening practice dialogues use at least two voices.
- Audio files load on demand.
- Images are diagrams written as code (SVG), used only where they aid understanding.

### Quality safeguards for tests

- One right answer, or all accepted answers listed.
- An independent reviewer answers each pool without seeing the answer key; disagreements are resolved before publishing.
- A one-line explanation for every question.
- A "report a problem" link on every question, which opens a pre-filled issue naming the node and question.
- The content pipeline refuses to publish a node without a review record.

### Private packs

- A pack lives in a folder named `private` inside the project, in one subfolder per pack. This folder is excluded from version control and from the published site.
- A pack contains: a description of the pack (name, number of exams, which pages and recordings belong to which exam part), the answer key, the book's pages split by exam, and the recordings.
- The pack builder takes the learner's exam book PDF, answer-key PDF and audio folder. It finds exam and part boundaries from the PDF's text layer, reads the answer key in question order (which also repairs numbering misprints), and matches recordings by file name.
- The pack builder copies and rearranges the learner's own files. It does not retype, translate or publish any of the book's content.
- The pack loader checks for packs when the app runs locally. On the public site it finds none and shows the explanation of where to put one.
- The private exam view shows original pages beside an answer sheet and an audio player, and scores Lesen and Hören from the answer key.
- Start files for Mac and Windows launch a local web server and open the app. They rely only on software that ships with the operating system. The server is reachable from other devices on the same network.
- The first supported pack is the learner's copy of a 15-exam practice book with 60 recordings.

### Build order

1. Project, repository and hosting. The app shell with the full tree visible. One finished sample node of each kind. Voice samples. The pack builder and private exam view.
2. Review of the samples by the learner. Nothing is mass-produced before approval.
3. All A1 content, then A2, then B1, the exam part nodes and five original mock exams.

## Testing Decisions

A good test here checks behaviour a learner or maintainer can observe: what the tree shows, whether an answer counts as right, whether a node becomes done, whether bad content is rejected. Tests do not assert on component structure, internal state shape or file layout.

There are four seams. Each is the highest point at which the behaviour can be exercised.

1. **Content pipeline (files in, bundle or errors out).** Run the pipeline on small fixture content and assert on the report. Cases: a missing language, a question with no correct answer or with two, a prerequisite that points nowhere, a prerequisite cycle, a pool below the minimum size, a missing audio file, a published node with no review record, a duplicated identifier, and a vocabulary set that fails to cover the scope list. The same pipeline run on the real content is the gate for every change.
2. **Learning engine (pure functions).** Cases: an attempt draws the right number of distinct questions; the pass mark for each attempt size; answer normalisation for spaces, umlaut substitutes and capitals; article required for nouns; passing marks done and failing leaves done untouched; un-marking; next recommended across kinds and levels and with "coming soon" nodes; exam score conversion; the readiness rule; checkpoint reporting.
3. **The app in a browser, against fixture content.** A small number of whole journeys: take a test and pass, and see the node done after a reload; fail and see explanations; test out of a node without opening its page; switch to Persian and see right-to-left layout with left-to-right German; export progress, clear the browser, import it back; search for a topic; run a mock exam and see per-part scores; open the private exam view with a fixture pack and get a score; see the "no pack found" explanation without one.
4. **Pack builder (source files in, pack folder out).** Run it on small synthetic fixtures made for the tests: a short PDF with a text layer and exam headings, an answer-key PDF that includes a numbering misprint, and a few silent audio files. Assert on the resulting pack's description, page ranges, answer key and audio mapping. The real book is never used in tests or stored in the repository.

The progress store is tested through seams 2 and 3, including one case that loads a progress file saved by an older version.

There is no prior art; this is a new repository. These four seams set the pattern.

Content quality (whether an explanation is correct and clear, whether a question is good German) is not covered by automated tests. It is covered by the independent review step and by the learner's approval of the samples.

## Out of Scope

- B2 and higher content. The content model allows it; none is written.
- Other exam formats (telc, DTZ, ÖSD-specific tasks).
- Accounts, profiles, cloud sync, and more than one learner per device.
- Offline use and installing the app on a phone.
- Streaks, points, reminders and any other habit mechanics.
- A built-in spaced-repetition system. Anki export covers this.
- Calling an AI service from the app, and automatic grading of writing or speaking.
- Reproducing, retyping or publishing any third-party book, word-list sentences or exam material.
- Hosting or copying the official mock exams. They are linked.
- Checking the grammar list against the publisher's B1 handbook. The list was instead checked against a complete published grammar.
- Decorative images and photographs.

## Further Notes

- **Research inputs.** The approved 212-topic grammar list and the comparison that extended it are kept in the project's research folder. The grammar list's closing sections still describe the original 203 topics; its changelog says so.
- **Lists still to be drawn up for approval.** The vocabulary theme nodes (about 100) and the phrase nodes have not been enumerated. They should be listed and shown to the learner in the same way as the grammar list, before content is written.
- **Voice.** The voice is undecided. The learner chooses from samples of two or three candidates in the first build stage. A free local voice and paid cloud voices are both candidates.
- **Audio size.** Audio for all examples, about 2,400 words and five mock exams is large. The first stage should measure the size per sentence and confirm that the total fits GitHub Pages' limits, or decide on separate hosting for audio.
- **Start files.** Running a local server with nothing installed is unverified, especially on Windows. It must be tested on a clean machine. If it cannot be made reliable, the fallback is a build that opens directly from the file system.
- **Recorded scores are trusted.** Writing, speaking and official mock exam scores are typed in by the learner. The app does not verify them.
- **Browser storage can be cleared.** Progress lives only in the browser, so the app should encourage a progress export after milestones.
- **Scale.** Roughly 330 nodes, each in three languages with a reviewed pool, plus five mock exams. This is why the build order stops for approval after the samples.
