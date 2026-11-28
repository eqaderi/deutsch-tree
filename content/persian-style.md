# Persian style guide

Every Persian text in the app follows this guide: the Persian of every node
and mock exam, the chapter names, and the app's own strings
(`src/language/strings.fa.ts`). The reader is an adult native speaker of
Persian who is learning German. The Persian must read as if it had been
written in Persian from the start, not as a translation of the English.

`pnpm content:check` and `pnpm test:unit` enforce what a program can see:
the letters, the digits, the half-spaces of "Spelling" below, and that German
is marked. Register, wording and terms are for the writer and the reader to
judge.

## 1. Register: formal standard written Persian

Write نوشتار معیار: the Persian of a good textbook, a serious newspaper or
an official website. It is plain and precise, not literary or ornate.

- Address the learner as «شما», with plural verbs: «انتخاب کنید»,
  «می‌توانید». Never «تو» in an explanation or a button.
- No spoken forms: «می‌شود», not «میشه»; «این‌طور», not «اینجوری»; «است»,
  not «ـه» for "is".
- Translations of German examples follow the German. A sentence with *du*
  is translated with «تو» and informal verbs («آلمانی یاد می‌گیری؟»), a
  sentence with *Sie* with «شما». They are still written in standard
  spelling, never in spoken forms.
- Prefer a plain Persian word to a borrowed one when both are in common
  use: «پاسخ», not «جواب»; «پرسش», not «سؤال»; «واژه», not «کلمه». Keep a
  borrowed word when it is the one people use: «فایل», «ایمیل», «لینک»,
  «دانلود», «پرامپت».

## 2. Natural sentences, not translated ones

Write the thought in Persian, then check that it says what the English says.
Do not translate the English sentence word by word.

- **The verb comes last**, and a sentence carries one idea. Split a long
  English sentence into two Persian ones rather than chain clauses with «که».
- **Drop what English needs and Persian does not.** No «یک» for every "a";
  no «آن» for every "it"; no «شما» before a verb that already says
  "you"; no «خود» for every "your".
- **No English constructions.** No «توسط» for "by" with a passive: make the
  sentence active. No «در حال … است» for "is …-ing" unless the action is
  really going on. No «این … است که …» for "it is … that …".
- **Grammar is explained with Persian grammar's words.** A Persian reader
  knows «شناسه», «سوم‌شخص مفرد» and «مصدر» from school; use them, not a
  paraphrase of the English ("one person you talk about").
- **Buttons and headings are short noun phrases**: «شروع آزمون»,
  «ذخیرهٔ نمره», «بازگشت به موضوع». A message is a full sentence with a verb.
- **Instructions are plain imperatives**: «پاسخ درست را انتخاب کنید.»
  Leave out «لطفاً».

| Literal (avoid) | Natural |
|---|---|
| آنا یک نفر است که درباره‌اش حرف می‌زنیم، پس پایانه *-t* است. | آنا سوم‌شخص مفرد است (*sie*)، پس شناسهٔ فعل *-t* است. |
| یک فایل آن را امن نگه می‌دارد. | با یک فایل پشتیبان، پیشرفتتان از دست نمی‌رود. |
| به Anki نسخهٔ 2.1.54 یا جدیدتر نیاز دارید. | نسخهٔ *2.1.54* یا تازه‌تر *Anki* لازم است. |
| موضوع بعدی شما | موضوع بعدی |
| هیچ‌وقت لازم نیست خودتان آن را بنویسید. | لازم نیست خودتان آن را به کار ببرید. |

## 3. One term for each thing

Each grammar term has one Persian name, used in every node, every
explanation and every string. A German term stays beside it in asterisks
where the samples do this: the tenses and the cases, which the learner will
meet in German textbooks and in the exam. Give the German term at least at
its first mention in a node.

### Grammar

| English | German | Persian |
|---|---|---|
| grammar | Grammatik | دستور زبان |
| rule | Regel | قاعده |
| verb | Verb | فعل |
| infinitive | Infinitiv | مصدر |
| stem (of a verb) | Stamm | بن |
| personal ending (of a verb) | Personalendung | شناسه |
| ending (of an article, adjective or noun) | Endung | پایانه |
| conjugation; to conjugate | Konjugation | صرف؛ صرف کردن |
| regular / irregular | regelmäßig / unregelmäßig | باقاعده / بی‌قاعده |
| mixed verb (*bringen*, *gebracht*) | gemischtes Verb | فعل آمیخته |
| person; first person singular | Person | شخص؛ اول‌شخص مفرد (also دوم‌شخص، سوم‌شخص) |
| singular / plural | Singular / Plural | مفرد / جمع |
| polite *Sie* | Höflichkeitsform | *Sie* رسمی |
| noun | Nomen | اسم |
| compound noun (*die Haustür*) | Kompositum | اسم مرکب |
| linking letter (*-s-* in *Arbeitsplatz*) | Fugenelement | حرف میانجی |
| article; definite / indefinite | Artikel | حرف تعریف؛ معین / نامعین |
| masculine / feminine / neuter | maskulin / feminin / neutral | مذکر / مؤنث / خنثی |
| case | Kasus | حالت |
| Nominativ | Nominativ | حالت *Nominativ* (حالت فاعلی) |
| Akkusativ | Akkusativ | حالت *Akkusativ* (حالت مفعولی) |
| Dativ | Dativ | حالت *Dativ* (حالت مفعول باواسطه) |
| Genitiv | Genitiv | حالت *Genitiv* (حالت ملکی) |
| subject / object | Subjekt / Objekt | فاعل / مفعول |
| pronoun; personal, possessive, reflexive, relative | Pronomen | ضمیر؛ شخصی، ملکی، انعکاسی، موصولی |
| possessive article (*mein*) | Possessivartikel | حرف تعریف ملکی |
| demonstrative article (*dieser*) | Demonstrativartikel | حرف تعریف اشاره |
| interrogative article (*welch-*) | Frageartikel | حرف تعریف پرسشی |
| preposition | Präposition | حرف اضافه |
| two-way preposition | Wechselpräposition | حرف اضافهٔ دوحالته |
| adjective; comparative / superlative | Adjektiv; Komparativ / Superlativ | صفت؛ صفت تفضیلی / صفت عالی |
| adverb | Adverb | قید |
| conjunction | Konjunktion | حرف ربط |
| sentence, clause | Satz | جمله |
| main clause / subordinate clause | Hauptsatz / Nebensatz | جملهٔ پایه / جملهٔ پیرو |
| relative clause | Relativsatz | جملهٔ موصولی |
| word order; position 2 | Wortstellung; Position 2 | ترتیب واژه‌ها؛ جایگاه دوم |
| separable verb; prefix | trennbares Verb; Präfix | فعل جداشدنی؛ پیشوند |
| suffix (*-ung*, *-bar*) | Suffix | پسوند |
| stress (of a word) | Betonung, Wortakzent | تکیه |
| inseparable verb | untrennbares Verb | فعل جدانشدنی |
| modal verb | Modalverb | فعل وجهی |
| reflexive verb | reflexives Verb | فعل انعکاسی |
| auxiliary verb | Hilfsverb | فعل کمکی |
| imperative | Imperativ | امر |
| present tense | Präsens | زمان حال (*Präsens*) |
| Perfekt | Perfekt | گذشتهٔ نقلی (*Perfekt*) |
| Präteritum | Präteritum | گذشتهٔ ساده (*Präteritum*) |
| Plusquamperfekt | Plusquamperfekt | گذشتهٔ بعید (*Plusquamperfekt*) |
| future | Futur I | زمان آینده (*Futur I*) |
| past participle | Partizip II | صفت مفعولی (*Partizip II*) |
| Konjunktiv II | Konjunktiv II | *Konjunktiv II* (وجه شرطی) |
| passive | Passiv | مجهول |
| negation | Negation | نفی |
| question word | Fragewort | واژهٔ پرسشی |
| question pronoun (*wer*, *was*) | Fragepronomen | ضمیر پرسشی |

A case is always named with «حالت» before it: «با حالت *Dativ* می‌آید», not
«با *Dativ* می‌آید». A noun is named by its gender, with the article in
asterisks when the article is the point: «*Küche* اسم مؤنث (*die*) است».

### The app

| English | Persian | Not |
|---|---|---|
| topic | موضوع | |
| test (of a topic) | آزمون | امتحان |
| exam (the Goethe exam) | امتحان | آزمون |
| mock exam; official mock exam | امتحان آزمایشی؛ امتحان آزمایشی رسمی | آزمون آزمایشی |
| checkpoint | آزمون مرور | |
| question | پرسش | سؤال |
| answer | پاسخ | جواب |
| right / wrong (an answer, a statement) | درست / نادرست | غلط |
| word | واژه | کلمه |
| example; the solved example (*Beispiel*) of an exam part | مثال؛ نمونهٔ حل‌شده | |
| mistake | اشتباه | خطا |
| practice task (a part of a node) | تمرین | |
| task (*Aufgabe* of Schreiben or Sprechen) | تکلیف | |
| part (*Teil*) | بخش | |
| module (Lesen, Hören, Schreiben, Sprechen) | مهارت | |
| points (of a part) | امتیاز | نمره |
| score (out of 100) | نمره | امتیاز |
| pass; passed | قبول شدن؛ قبول شدید | |
| done (a topic) | تمام‌شده | |
| recording, audio file | فایل صوتی | فایل شنیداری |
| partner (in Sprechen) | هم‌صحبت | هم‌گروهی |
| AI assistant | دستیار هوش مصنوعی | |
| progress; backup | پیشرفت؛ پشتیبان | |
| export; import | خروجی گرفتن؛ وارد کردن | |
| level | سطح | |

## 4. Spelling

- **Persian letters**: «ی» (U+06CC) and «ک» (U+06A9), never the Arabic «ي»
  or «ك». An Arabic keyboard writes those; the check rejects them.
- **Persian digits**: ۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹, never 0–9 or the Arabic ٠–٩.
  Percent is «٪»: «۹۰٪». The time is «ساعت ۱۰» or «۱۴:۳۰». A number inside
  German keeps its Latin digits: *um 8 Uhr*.
- **Half-space** (U+200C, نیم‌فاصله) joins, without a space and without
  running the letters together:
  - the prefixes «می» and «نمی»: «می‌کنم», «نمی‌دانم»;
  - the plural «ها» and what follows it: «واژه‌ها», «موضوع‌های»,
    «فعل‌هایی»;
  - «تر» and «ترین»: «کوتاه‌تر», «مهم‌ترین»;
  - the endings after a final «ه»: «خانه‌ام», «جمله‌ای»;
  - the parts of a compound: «تمام‌شده», «جست‌وجو», «گفت‌وگو», «به‌زودی»,
    «به‌صورت», «هم‌صحبت», «سوم‌شخص».

  The check rejects a space after «می»/«نمی» and before «ها»; the rest is
  for the writer.
- **Ezafe after a silent «ه»** is «ـهٔ» (the sign U+0654): «همهٔ موضوع‌ها»,
  «جملهٔ پیرو». After «ا» or «و» it is «ی»: «دانشجوی», «صدای».
- **Punctuation** is Persian: «،» «؛» «؟», and «» for quotation marks.
  Inside German, German punctuation stays: *Wie geht's?*
- **Tanwin** only in the words that always have it: «مثلاً», «تقریباً»,
  «اصلاً», «فوراً».
- **Hamza** as in «مؤدبانه», «تأکید», «مسئله».

## 5. German inside Persian

A Persian page runs right to left; German must stay left to right.

- **In content**, every piece of German stands in asterisks: `*Dativ*`,
  `*in der Küche*`, a level `*B1*`, a name in Latin letters `*Tobias*`. The
  check rejects a Latin letter outside asterisks. A name that has a usual
  Persian spelling is written in Persian: «آنا», «تام», «برلین».
- **In the app's strings**, German and any other Latin text (a product name,
  a command, a version) is wrapped in `german()` in `strings.fa.ts`, which
  keeps it left to right. `pnpm test:unit` rejects Latin letters or digits
  outside it. A string that is Latin only, such as an answer *Richtig*,
  needs nothing.
- **In the start-folder instructions** (`src/start-files/folder/instructions-fa.html`),
  a command, a file name or an address goes in `<code>`, and any other Latin
  word in `<bdi>`.
- **A German word is quoted in its dictionary form**, lower case unless it
  is a noun: «*die Kinder* چند نفرند», even at the start of a Persian
  sentence. A German sentence keeps its capital: *Ich wohne in Berlin.*
- **Persian punctuation between German pieces**: «*an*، *auf* و *in*».
- **The German term goes after the Persian one, in brackets**:
  «زمان حال (*Präsens*)». Where the Persian term is long or unusual, the
  German term may stand alone after its first mention, still with its
  Persian head word: «حالت *Dativ*».
- **The meaning of a vocabulary word** is plain text with no Latin letter at
  all, marked or not: it is shown as written and asked as a prompt.
  Synonyms are separated by «،»; a clarification is in brackets:
  «پسر (فرزند)».

## 6. When Persian under a review record changes

Explanations may change freely. A vocabulary word's meaning, a question's
prompt or an answer key are part of the review: changing one of them means a
new blind review of that question (`content/README.md`, "Review before
publishing"), recorded honestly.
