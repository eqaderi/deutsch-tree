# Vocabulary themes: for your approval

Status: **waiting for the learner's approval.** Nothing here is final until you say so. The integration branch is not merged to `main` before that.

This document lists every vocabulary node of the tree with its words, level by level, in the order the app walks through them. It belongs to ticket #7 ("Vocabulary theme list, approved and in the tree").

The parts between `<!-- generated -->` marks are written by a command (`pnpm vocabulary:approval`) from the files in `content/`, so they always say what the app has.

## What you are asked to check

1. **Which words are in scope** (the next section). This is the one open question that changes the amount of work: the three Goethe lists hold about 3,560 headwords, not the "roughly 2,400" of the spec.
2. **The chapter names**, in English, Persian and simple German, and **where each vocabulary chapter stands** among the grammar chapters of its level.
3. **The nodes and their words**: is each node one theme you would learn in one sitting, and is a word in the wrong node?
4. **The judgment calls** at the end.

To change something, say it in plain words: "leave out the word groups", "rename A2-W3 to …", "move A1-W4 after A1-W5", "move *Schloss* to B1-W7.4", "join B1-W5.3 and B1-W5.4". Moving a chapter is a one-line change. Moving a word is a one-line change in two files.

## Which words are in scope

The words come from the three official word lists: Goethe-Zertifikat A1 (Start Deutsch 1), A2 and B1. Only the headwords were taken: the word, and for a noun its article and plural marker. No example sentence, definition or translation of the lists is in this repository; ticket #18 writes all of those new.

**The rule in force** (my recommendation; you have not answered yet):

- Everything in the three lists counts: the alphabetical lists and the word groups in front of them (numbers, months, colours, countries, school subjects, abbreviations …).
- **Word-building parts are left out** (*Lieblings-*, *un-*, *-weise*). They are not words; grammar teaches word building.
- **Feminine forms are not words of their own** (*Ärztin*). Each is noted on its masculine noun (*Arzt*) and learned with it.
- **Words that the B1 list marks for Austria or Switzerland only are not words of their own** (*Marille*, *Velo*). Each is noted on the word used in Germany (*Aprikose*, *Fahrrad*), because you sit the exam in Germany. A word without a German counterpart in the lists is left out.
- **A word's level is the lowest list it appears in.** A word in the A1 and the B1 list is an A1 word.

What that gives:

<!-- generated: numbers -->

| Level | Words | Nodes | Vocabulary chapters | Smallest and largest node |
|---|---|---|---|---|
| A1 | 788 | 34 | 6 | 17 and 27 words |
| A2 | 688 | 29 | 6 | 16 and 27 words |
| B1 | 1,795 | 75 | 11 | 18 and 27 words |
| All | 3,271 | 138 | 23 | 16 and 27 words |

<!-- end generated -->

The three lists hold 3,558 different headwords. 290 of them are not in the table: 37 word-building parts, 103 feminine forms, 96 Austrian and Swiss words, and 54 second spellings of a word that is in scope (*gern(e)* and *gern*). They are all listed near the end, under "Words that are not words of their own". 3 words were added that the lists print in the cell of another word (*Kauffrau*, *Werktag*, *Ostsee*).

**Why this is not 2,400.** The spec says "roughly 2,400 words" and "about 100 nodes". 2,400 is what the B1 list says about itself, and it fits the main entries of its alphabetical list. It does not count the derived words printed under them (*die Abfahrt* under *abfahren*), the word groups, or the A1 and A2 words that the B1 list does not repeat. Counted as words you have to know, the lists hold about 3,560.

**Your other choices.** The rule is one setting in one file (`SCOPE_RULE` in `src/vocabulary-scope/index.ts`). Another answer means: change the setting, run one command, and move the words that the check then names. The nodes do not have to be made again.

| Choice | Words | A1 | A2 | B1 | Nodes of about 25 |
|---|---|---|---|---|---|
| **The rule in force** | **3,271** | 788 | 688 | 1,795 | 138 as listed here |
| Feminine forms are words of their own | 3,374 | 789 | 699 | 1,886 | about 142 |
| Austrian and Swiss words are words of their own | 3,359 | 788 | 688 | 1,883 | about 142 |
| Everything, also word-building parts | 3,507 | 791 | 702 | 2,014 | about 148 |
| Without the word groups (no numbers, months, colours, countries …) | 2,930 | 684 | 611 | 1,635 | about 124 |
| Only the main entries of the alphabetical lists (closest to "2,400") | about 2,590 | about 630 | about 630 | about 1,330 | about 105 |

The last row is the count of the list research; the command cannot make that list yet, because the merged list does not say which words are derived entries. If you choose it, that is a small extension first.

## How the nodes were made

- **Every node holds words of one level only.** An A1 node has only A1 words, so each level can be finished on its own, and the level of a word is the level of its node. A theme that runs through all levels (food, health, work, travel) therefore has a node in each level, with a different name: "Food" in A1, "In the kitchen" and "More food and drink" in A2, "Ingredients", "Meals, snacks and drinks" and "Taste and eating out" in B1.
- **A node has about 25 words**: between 16 and 27. The spec says about 25.
- **A node is a theme, not a word class.** Nouns, verbs and adjectives of one subject are together (*die Miete*, *mieten*, *der Vermieter*). The exceptions are the small words that have no subject: pronouns, prepositions, conjunctions, words for time and amount. They have nodes of their own, in a chapter of small words in each level.
- **The words of a node are in a learning order**, not in the alphabet: the main nouns first, then what belongs to them.
- **Chapters.** The vocabulary nodes of a level are in 6 chapters (A1, A2) or 11 chapters (B1). A chapter name starts with "Words:" so that it cannot be mixed up with a grammar chapter in the tree.
- **Where a vocabulary chapter stands.** Each one follows a grammar chapter that it fits, so that grammar and words take turns: numbers after the grammar of numbers and time, town and travel after the prepositions, the conjunctions after the grammar of two-part connectors.
- **All nodes show "Coming soon".** A node has its name, level, chapter, place and words. Meanings, definitions, example sentences and tests are ticket #18.
- **The Persian names are a draft written by an AI.** A native reader reviews all Persian text later (ticket #34). The German names are simple German, also a draft.
- A noun is shown with its article. *der/die* means the lists print both for one headword (*der/die Angestellte*; *der See* and *die See*).

## The chapters of each level, in curriculum order

Bold lines are the vocabulary chapters. "A1-W3" means: the third vocabulary chapter of A1.

<!-- generated: overview -->

### A1

| Place | Kind | Chapter | Nodes |
|---|---|---|---|
| 1 | Grammar | Verbs in the present | 4 |
| 2 | Grammar | First sentences and questions | 7 |
| 3 | **A1-W1** | **Words: people and first contacts** | 5 |
| 4 | Grammar | Nouns and articles | 6 |
| 5 | Grammar | Negation with nicht and kein | 3 |
| 6 | Grammar | Numbers, dates and time | 4 |
| 7 | **A1-W2** | **Words: numbers and time** | 5 |
| 8 | Grammar | The cases: Nominativ, Akkusativ, Dativ | 5 |
| 9 | Grammar | More articles: mein, dieser, welcher | 4 |
| 10 | **A1-W3** | **Words: food, home and shopping** | 6 |
| 11 | Grammar | Separable verbs, imperative and verb patterns | 9 |
| 12 | Grammar | Modal verbs and polite wishes | 8 |
| 13 | **A1-W4** | **Words: everyday life** | 7 |
| 14 | Grammar | Prepositions | 10 |
| 15 | **A1-W5** | **Words: town and travel** | 5 |
| 16 | Grammar | Pronouns | 7 |
| 17 | **A1-W6** | **Words: small words and useful verbs** | 6 |
| 18 | Grammar | Talking about the past | 5 |
| 19 | Grammar | Adjectives | 5 |
| 20 | Grammar | Building sentences | 4 |
| 21 | Grammar | Word building | 4 |

### A2

| Place | Kind | Chapter | Nodes |
|---|---|---|---|
| 1 | Grammar | The past: all verbs | 4 |
| 2 | **A2-W1** | **Words: people, feelings and opinions** | 6 |
| 3 | Grammar | Dativ, objects and their order | 6 |
| 4 | **A2-W2** | **Words: home, food and clothes** | 6 |
| 5 | Phrases | E-mails and messages | 4 |
| 6 | Grammar | Articles and pronouns | 6 |
| 7 | Grammar | Adjective endings and comparison | 8 |
| 8 | Grammar | Reflexive verbs and verbs with prepositions | 3 |
| 9 | **A2-W3** | **Words: free time and media** | 5 |
| 10 | Grammar | Prepositions and directions | 5 |
| 11 | **A2-W4** | **Words: health, town and nature** | 5 |
| 12 | Grammar | Polite requests and advice (Konjunktiv II) | 4 |
| 13 | **A2-W5** | **Words: school and work** | 3 |
| 14 | Grammar | Adverbs: deshalb, schon, noch | 3 |
| 15 | Grammar | Subordinate clauses | 7 |
| 16 | **A2-W6** | **Words: time, connecting words and amounts** | 4 |
| 17 | Phrases | Suggestions, requests and apologies | 6 |
| 18 | Grammar | werden, lassen and the passive | 3 |
| 19 | Grammar | Relative clauses | 3 |
| 20 | Grammar | Word building and particles | 3 |

### B1

| Place | Kind | Chapter | Nodes |
|---|---|---|---|
| 1 | Grammar | Past and future tenses | 3 |
| 2 | **B1-W1** | **Words: people and feelings** | 7 |
| 3 | Grammar | Time clauses | 7 |
| 4 | **B1-W2** | **Words: body and health** | 5 |
| 5 | Grammar | Clauses of reason, contrast, condition and result | 6 |
| 6 | **B1-W3** | **Words: home, food and shopping** | 9 |
| 7 | Grammar | Connectors and negation | 5 |
| 8 | **B1-W4** | **Words: school, learning and science** | 5 |
| 9 | Grammar | Two-part connectors | 6 |
| 10 | **B1-W5** | **Words: time, connecting words and amounts** | 8 |
| 11 | Phrases | Opinions and discussion | 5 |
| 12 | Grammar | Genitiv and special nouns | 4 |
| 13 | **B1-W6** | **Words: work, money and offices** | 9 |
| 14 | Grammar | Prepositions | 6 |
| 15 | **B1-W7** | **Words: traffic, travel and nature** | 8 |
| 16 | Phrases | Writing e-mails and forum posts | 5 |
| 17 | Grammar | Adjectives and participles | 4 |
| 18 | **B1-W8** | **Words: media, arts and free time** | 8 |
| 19 | Grammar | Pronouns and quantity words | 4 |
| 20 | Grammar | Relative clauses | 4 |
| 21 | **B1-W9** | **Words: thinking and discussing** | 6 |
| 22 | Grammar | Infinitive with and without zu | 7 |
| 23 | Grammar | Modal verbs and Konjunktiv II | 8 |
| 24 | **B1-W10** | **Words: state and society** | 5 |
| 25 | Phrases | Planning something together | 4 |
| 26 | Grammar | The passive | 5 |
| 27 | **B1-W11** | **Words: general verbs and describing** | 5 |
| 28 | Grammar | Fractions, word building and particles | 3 |
| 29 | Phrases | Presenting a topic and talking about it | 6 |
| 30 | Exam | The exam: reading (Lesen) | 5 |
| 31 | Exam | The exam: listening (Hören) | 4 |
| 32 | Exam | The exam: writing (Schreiben) | 3 |
| 33 | Exam | The exam: speaking (Sprechen) | 3 |

<!-- end generated -->

## The nodes and their words

<!-- generated: list -->

### A1

#### A1-W1 Words: people and first contacts

Persian: واژه‌ها: آدم‌ها و نخستین آشنایی  
Simple German: Wörter: Menschen und erste Kontakte  
Comes after the grammar chapter: "First sentences and questions"  
5 nodes, 117 words:

**A1-W1.1 Hello, please, thank you** · سلام، لطفاً، ممنون · Hallo, bitte, danke · 23 words  
hallo · tschüss · bitte · danke · ja · nein · willkommen · herzlich · die Entschuldigung · (sich) entschuldigen · der Dank · danken · die Bitte · bitten · der Gruß · das Wiedersehen · das Wiederhören · der Herr · die Frau · die Dame · heißen · (sich) vorstellen · kennenlernen

**A1-W1.2 Name, address and forms** · نام، نشانی و فرم‌ها · Name, Adresse und Formulare · 26 words  
der Name · der Vorname · der Familienname · die Adresse · das Alter · das Geburtsjahr · der Geburtsort · der Familienstand · ledig · verheiratet · geboren · männlich · weiblich · die Postleitzahl · das Formular · ausfüllen · ankreuzen · unterschreiben · die Unterschrift · buchstabieren · der Buchstabe · der Ausweis · der Pass · die Papiere (Pl.) · die Anmeldung · (sich) anmelden

**A1-W1.3 Family** · خانواده · Familie · 26 words  
die Familie · die Eltern (Pl.) · die Mutter · der Vater · das Kind · der Sohn · die Tochter · der Bruder · die Schwester · die Geschwister (Pl.) · die Großeltern (Pl.) · die Großmutter · der Großvater · die Oma · der Opa · die Ehefrau · der Ehemann · das Baby · der/die Verwandte · die Hochzeit · heiraten · der Partner · lieben · das Leben · gestorben · tot

**A1-W1.4 People around you** · آدم‌های دور و بر · Menschen um dich · 25 words  
der Mensch · die Leute (Pl.) · der Mann · das Mädchen · der Junge · der Erwachsene · der/die Jugendliche · der Freund · der/die Bekannte · der Kollege · der Gast · die Gruppe · jung · alt · allein · zusammen · fremd · bekannt · kennen · (sich) treffen · besuchen · einladen · die Einladung · helfen · die Hilfe

**A1-W1.5 Countries and where you live** · کشورها و محل زندگی · Länder und Wohnort · 17 words  
das Land · das Deutschland · das Europa · das Ausland · die Welt · die Heimat · deutsch · europäisch · ausländisch · international · der Ausländer · der/die Deutsche · der Europäer · kommen · wohnen · leben · der Ort

#### A1-W2 Words: numbers and time

Persian: واژه‌ها: عدد و زمان  
Simple German: Wörter: Zahlen und Zeit  
Comes after the grammar chapter: "Numbers, dates and time"  
5 nodes, 115 words:

**A1-W2.1 Numbers 1 to 20** · عددهای ۱ تا ۲۰ · Zahlen von 1 bis 20 · 20 words  
eins · zwei · drei · vier · fünf · sechs · sieben · acht · neun · zehn · elf · zwölf · dreizehn · vierzehn · fünfzehn · sechzehn · siebzehn · achtzehn · neunzehn · zwanzig

**A1-W2.2 Big numbers, first and second** · عددهای بزرگ، اول و دوم · Große Zahlen, erste und zweite · 22 words  
einundzwanzig · dreißig · vierzig · fünfzig · sechzig · siebzig · achtzig · neunzig · hundert · hunderteins · zweihundert · tausend · die Million · die Milliarde · erste · zweite · dritte · vierte · halb · das Viertel · das Prozent · circa

**A1-W2.3 The day and the week** · روز و هفته · Der Tag und die Woche · 25 words  
der Tag · der Morgen · der Vormittag · der Mittag · der Nachmittag · der Abend · die Nacht · die Woche · der Wochentag · das Wochenende · der Montag · der Dienstag · der Mittwoch · der Donnerstag · der Freitag · der Samstag · der Sonntag · heute · morgen · gestern · die Uhr · die Stunde · die Minute · die Sekunde · der Moment

**A1-W2.4 Months, seasons and the year** · ماه‌ها، فصل‌ها و سال · Monate, Jahreszeiten und das Jahr · 22 words  
der Januar · der Februar · der März · der April · der Mai · der Juni · der Juli · der August · der September · der Oktober · der November · der Dezember · das Jahr · der Frühling · das Frühjahr · der Sommer · der Herbst · der Winter · das Datum · die Zeit · der Anfang · das Ende

**A1-W2.5 Now, soon, always: words for time** · حالا، زود، همیشه: واژه‌های زمان · Jetzt, bald, immer: Wörter für die Zeit · 26 words  
jetzt · bald · sofort · gleich · später · früher · spät · immer · oft · nie · einmal · schon · noch · lange · zurzeit · gerade · dann · pünktlich · dauern · anfangen · beginnen · aufhören · enden · der Schluss · letzte · nächste

#### A1-W3 Words: food, home and shopping

Persian: واژه‌ها: خوراک، خانه و خرید  
Simple German: Wörter: Essen, Wohnen und Einkaufen  
Comes after the grammar chapter: "More articles: mein, dieser, welcher"  
6 nodes, 145 words:

**A1-W3.1 Food** · خوراکی‌ها · Lebensmittel · 24 words  
das Essen · die Lebensmittel (Pl.) · das Brot · das Brötchen · die Butter · das Ei · das Fleisch · der Fisch · das Hähnchen · der Schinken · der Reis · die Kartoffel · die Pommes frites (Pl.) · der Salat · das Gemüse · die Tomate · das Obst · der Apfel · die Banane · die Birne · der Kuchen · das Salz · das Öl · der Hunger

**A1-W3.2 Drinks, meals and eating out** · نوشیدنی‌ها، وعده‌ها و غذا خوردن در بیرون · Getränke, Mahlzeiten und Essen gehen · 26 words  
das Getränk · das Wasser · die Milch · der Kaffee · der Tee · der Saft · das Bier · der Wein · die Flasche · das Glas · der Durst · das Frühstück · frühstücken · essen · trinken · kochen · grillen · schmecken · der Appetit · das Restaurant · das Café · das Lokal · die Speisekarte · bestellen · bitter · riechen

**A1-W3.3 House and flat** · خانه و آپارتمان · Haus und Wohnung · 21 words  
das Haus · die Wohnung · das Apartment · das Zimmer · der Raum · die Küche · das Bad · die Toilette · der Balkon · der Garten · die Treppe · der Stock · der Aufzug · der Eingang · der Ausgang · die Miete · mieten · vermieten · der Vermieter · sich umziehen · der Schlüssel

**A1-W3.4 Furniture and things at home** · مبلمان و وسایل خانه · Möbel und Dinge im Haus · 24 words  
das Möbel · der Tisch · das Bett · der Schrank · das Sofa · der Herd · der Kühlschrank · die Dusche · das Licht · das Bild · die Maschine · anmachen · ausmachen · an sein · aus sein · auf sein · zu sein · öffnen · schließen · geöffnet · geschlossen · kaputt · reparieren · die Reparatur

**A1-W3.5 Shopping and money** · خرید و پول · Einkaufen und Geld · 25 words  
einkaufen · (sich etwas) kaufen · verkaufen · der Verkäufer · der Kunde · das Geschäft · der Laden · die Kasse · der Preis · kosten · bezahlen · zahlen · das Geld · der Euro · der Cent · billig · teuer · günstig · das Angebot · die Rechnung · bar · die Kreditkarte · das Konto · überweisen · der Prospekt

**A1-W3.6 Sizes, weights and amounts** · اندازه، وزن و مقدار · Größen, Gewichte und Mengen · 25 words  
das Gramm · das Kilogramm · das Pfund · der Liter · der Meter · der Zentimeter · der Kilometer · der Quadratmeter · das Gewicht · die Größe · groß · klein · lang · kurz · breit · hoch · schwer · leicht · viel · wenig · mehr · bisschen · das/der Teil · meiste · wie viel

#### A1-W4 Words: everyday life

Persian: واژه‌ها: زندگی روزمره  
Simple German: Wörter: Alltag  
Comes after the grammar chapter: "Modal verbs and polite wishes"  
7 nodes, 162 words:

**A1-W4.1 School and the German course** · مدرسه و کلاس آلمانی · Schule und Deutschkurs · 26 words  
die Schule · der Schüler · der Lehrer · der Student · studieren · das Studium · der Kurs · der Unterricht · die Klasse · lernen · lesen · schreiben · das Buch · der Bleistift · der Kugelschreiber · die Aufgabe · die Hausaufgabe · der Test · die Prüfung · der Fehler · die Lösung · das Ergebnis · richtig · falsch · die Pause · der Bogen

**A1-W4.2 Speaking and understanding** · حرف زدن و فهمیدن · Sprechen und Verstehen · 27 words  
die Sprache · sprechen · (sich) verstehen · sagen · fragen · die Frage · antworten · die Antwort · erzählen · erklären · wiederholen · bedeuten · das Wort · der Satz · das Gespräch · die Aussage · das Beispiel · zum Beispiel · der Text · das Thema · hören · die Anrede · laut · leise · langsam · wissen · glauben

**A1-W4.3 Work and jobs** · کار و شغل · Arbeit und Beruf · 21 words  
die Arbeit · arbeiten · der Beruf · der Job · der Arbeitsplatz · die Firma · der Chef · der Beamte · die Hausfrau · der Hausmann · das Praktikum · die Stelle · verdienen · arbeitslos · selbstständig · der Termin · der Plan · das Problem · die Ordnung · wichtig · fertig

**A1-W4.4 Body and health** · بدن و سلامت · Körper und Gesundheit · 23 words  
der Kopf · das Auge · der Mund · das Haar · die Hand · der Arm · das Bein · der Fuß · der Bauch · krank · das Fieber · wehtun · müde · der Arzt · der Doktor · die Praxis · rauchen · die Zigarette · schlafen · aufstehen · (sich) waschen · baden · (sich) duschen

**A1-W4.5 Clothes and colours** · لباس و رنگ‌ها · Kleidung und Farben · 20 words  
die Kleidung · die Jacke · der Schuh · (sich) anziehen · (sich) ausziehen · die Tasche · aussehen · gefallen · schön · neu · die Farbe · schwarz · weiß · rot · blau · grün · gelb · grau · braun · hell

**A1-W4.6 Free time and celebrations** · اوقات فراغت و جشن‌ها · Freizeit und Feste · 27 words  
die Freizeit · das Hobby · der Sport · der Fußball · spielen · schwimmen · tanzen · wandern · der Verein · der Film · das Lied · fernsehen · das Foto · die CD · die Party · feiern · das Geschenk · der Geburtstag · der Glückwunsch · gratulieren · das Glück · gewinnen · lachen · lustig · mitkommen · mitmachen · mitbringen

**A1-W4.7 Weather and nature** · هوا و طبیعت · Wetter und Natur · 18 words  
das Wetter · die Sonne · der Regen · regnen · der Wind · scheinen · der Grad · der Blick · das Meer · der/die See · der Baum · die Blume · der Hund · das Feuer · der Norden · der Süden · der Osten · der Westen

#### A1-W5 Words: town and travel

Persian: واژه‌ها: شهر و سفر  
Simple German: Wörter: Stadt und Reisen  
Comes after the grammar chapter: "Prepositions"  
5 nodes, 120 words:

**A1-W5.1 In town** · در شهر · In der Stadt · 23 words  
die Stadt · das Dorf · die Straße · der Platz · die Bank · die Post · die Polizei · das Kino · das Schwimmbad · die Bäckerei · der Kiosk · der Kindergarten · die Halle · die Disco · das Schild · der Automat · die Sehenswürdigkeit · besichtigen · die Führung · der Eintritt · die Information · die Auskunft · der Schalter

**A1-W5.2 Left, right, here, there** · چپ، راست، اینجا، آنجا · Links, rechts, hier, dort · 22 words  
links · rechts · geradeaus · hier · dort · da · oben · unten · hinten · daneben · draußen · weit · zurück · weiter · weg · die Ecke · die Mitte · suchen · finden · gehen · laufen · bleiben

**A1-W5.3 Bus and train** · اتوبوس و قطار · Bus und Bahn · 25 words  
der Bus · die Bahn · der Zug · die S-Bahn · die Straßenbahn · der Bahnhof · der Bahnsteig · das Gleis · die Haltestelle · die Fahrkarte · das Ticket · die Abfahrt · die Ankunft · abfahren · ankommen · einsteigen · aussteigen · der Anschluss · die Durchsage · die Ansage · fahren · der Fahrer · halten · warten · das Taxi

**A1-W5.4 Car, plane and holidays** · ماشین، هواپیما و تعطیلات · Auto, Flugzeug und Urlaub · 25 words  
das Auto · der Lkw · die Autobahn · das Fahrrad · Rad fahren · das Flugzeug · der Flughafen · der Abflug · abfliegen · fliegen · die Reise · reisen · das Reisebüro · der Reiseführer · der Urlaub · der Ausflug · der Koffer · das Gepäck · der Zoll · das Hotel · die Rezeption · das Einzelzimmer · das Doppelzimmer · die Halbpension · übernachten

**A1-W5.5 Post, phone and computer** · پست، تلفن و کامپیوتر · Post, Telefon und Computer · 25 words  
der Brief · die Karte · die Briefmarke · der Absender · der Empfänger · schicken · das Telefon · das Handy · der Anruf · anrufen · telefonieren · der Anrufbeantworter · die Vorwahl · die Nummer · das Fax · die/das E-Mail · das Internet · der Computer · der Drucker · drucken · anklicken · drücken · die Zeitung · die Anzeige · das Papier

#### A1-W6 Words: small words and useful verbs

Persian: واژه‌ها: واژه‌های کوچک و فعل‌های پرکاربرد  
Simple German: Wörter: kleine Wörter und wichtige Verben  
Comes after the grammar chapter: "Pronouns"  
6 nodes, 129 words:

**A1-W6.1 Verbs for every day** · فعل‌های هرروزه · Verben für jeden Tag · 27 words  
machen · tun · haben · sein · werden · geben · nehmen · bekommen · kriegen · bringen · holen · abholen · abgeben · mitnehmen · legen · stellen · liegen · stehen · sitzen · sehen · benutzen · gehören · fehlen · sich kümmern · sich freuen · anbieten · empfehlen

**A1-W6.2 Can, must, may: wishes and rules** · توانستن، بایستن، اجازه داشتن: خواسته‌ها و قانون‌ها · Können, müssen, dürfen: Wünsche und Regeln · 19 words  
dürfen · können · müssen · sollen · wollen · möchten · mögen · brauchen · erlauben · verboten · die Achtung · die Vorsicht · gültig · besetzt · frei · vielleicht · leider · gern · lieber

**A1-W6.3 I, you, my, this: pronouns and articles** · من، تو، مالِ من، این: ضمیرها و حرف‌های تعریف · Ich, du, mein, dieser: Pronomen und Artikel · 24 words  
ich · er · es · sie · Sie · wir · ihr · man · dich · dir · sich · mein · dein · unser · euer · der · ein · kein · dieser · jeder · alle · andere · beide · nichts

**A1-W6.4 Question words and connecting words** · واژه‌های پرسشی و واژه‌های ربط · Fragewörter und Verbindungswörter · 20 words  
wer · was · wann · warum · wie · wo · woher · wohin · welcher · was für ein · und · oder · aber · denn · also · auch · nicht · nur · sehr · so

**A1-W6.5 Prepositions** · حرف‌های اضافه · Präpositionen · 21 words  
an · auf · aus · bei · bis · durch · für · gegen · in · mit · nach · ohne · seit · über · um · unter · von · vor · zu · zwischen · ab

**A1-W6.6 Good, bad, easy: describing** · خوب، بد، آسان: توصیف کردن · Gut, schlecht, einfach: Beschreiben · 18 words  
gut · schlecht · besser · beste · einfach · normal · klar · wunderbar · glücklich · zufrieden · böse · lieb · ruhig · schnell · eilig · kulturell · automatisch · möglich

### A2

#### A2-W1 Words: people, feelings and opinions

Persian: واژه‌ها: آدم‌ها، احساس‌ها و نظرها  
Simple German: Wörter: Menschen, Gefühle und Meinungen  
Comes after the grammar chapter: "The past: all verbs"  
6 nodes, 153 words:

**A2-W1.1 Relatives and relationships** · خویشاوندان و رابطه‌ها · Verwandte und Beziehungen · 26 words  
der Onkel · die Tante · der Cousin · die Cousine · der Enkel · die Mama · der Papa · der Ehepartner · das Paar · der Nachbar · die Person · der Besuch · der Kontakt · der Rentner · geschieden · getrennt · schwanger · sich verlieben · (sich) streiten · sterben · der Babysitter · das Taschengeld · jemand · niemand · (sich) unterhalten · verabredet

**A2-W1.2 What people are like** · آدم‌ها چه‌جور هستند · Wie Menschen sind · 27 words  
nett · sympathisch · freundlich · klug · intelligent · dumm · blöd · faul · fleißig · streng · komisch · witzig · sportlich · aktiv · romantisch · nervös · vorsichtig · berühmt · beliebt · reich · arm · blond · dick · dünn · hässlich · stark · schwach

**A2-W1.3 Feelings** · احساس‌ها · Gefühle · 25 words  
die Angst · die Lust · der Spaß · der Stress · die Ruhe · der Traum · der Wunsch · froh · traurig · (sich) ärgern · (sich) fühlen · hoffen · hoffentlich · weinen · träumen · (sich) wünschen · schimpfen · sich beschweren · sich bedanken · leidtun · schade · egal · die Lüge · lügen · stören

**A2-W1.4 Great or terrible? Saying how something is** · عالی یا افتضاح؟ گفتنِ اینکه چیزی چطور است · Toll oder schrecklich? Sagen, wie etwas ist · 26 words  
furchtbar · schrecklich · schlimm · toll · super · fantastisch · langweilig · interessant · spannend · aufregend · stressig · echt · wirklich · total · ganz · besonders · typisch · modern · praktisch · nützlich · notwendig · schwierig · gefährlich · wahr · schädlich · bequem

**A2-W1.5 Opinions and advice** · نظر و توصیه · Meinungen und Ratschläge · 26 words  
die Meinung · meinen · denken · diskutieren · die Idee · der Vorschlag · der Tipp · raten · beraten · begründen · recht haben · einverstanden · dafür · dagegen · auf jeden Fall · natürlich · sicher · wahrscheinlich · unbedingt · der Unterschied · das Gegenteil · vergleichen · die Ahnung · das Interesse · (sich) interessieren · wählen

**A2-W1.6 Telling and remembering** · تعریف کردن و به یاد آوردن · Erzählen und Erinnern · 23 words  
reden · berichten · beschreiben · (sich) erinnern · vergessen · merken · nennen · aussprechen · zuhören · rufen · die Situation · der Bescheid · die Nachricht · (sich) informieren · beantworten · bestätigen · der Witz · die Geschichte · zeigen · übersetzen · die Übersetzung · auf Deutsch · deutlich

#### A2-W2 Words: home, food and clothes

Persian: واژه‌ها: خانه، خوراک و لباس  
Simple German: Wörter: Wohnen, Essen und Kleidung  
Comes after the grammar chapter: "Dativ, objects and their order"  
6 nodes, 147 words:

**A2-W2.1 Rooms and the building** · اتاق‌ها و ساختمان · Zimmer und Gebäude · 26 words  
das Wohnzimmer · das Schlafzimmer · der Keller · die Garage · das Erdgeschoss · das Stockwerk · die Tür · das Fenster · die Heizung · das WC · der Stuhl · die Lampe · der Fernseher · das Gerät · der Apparat · der Umzug · einziehen · renovieren · bauen · nebenan · drinnen · hängen · aufmachen · zumachen · abschließen · offen

**A2-W2.2 Housework and things** · کارهای خانه و وسایل · Hausarbeit und Dinge · 27 words  
der Haushalt · der Müll · aufräumen · putzen · die Wäsche · das Handtuch · die Seife · sauber · schmutzig · die Reinigung · die Schere · das Ding · die Sache · leer · voll · nass · trocken · wecken · (sich) ausruhen · packen · einpacken · auspacken · das Mittel · (sich) setzen · ziehen · rund · wach

**A2-W2.3 In the kitchen** · در آشپزخانه · In der Küche · 23 words  
das Geschirr · die Tasse · der Teller · die Gabel · der Löffel · das Messer · der Topf · backen · braten · (sich) schneiden · probieren · das Rezept · das Gericht · die Portion · das Mittagessen · das Stück · frisch · süß · sauer · scharf · fett · der Kellner · der Koch

**A2-W2.4 More food and drink** · خوراکی‌ها و نوشیدنی‌های بیشتر · Mehr Essen und Trinken · 20 words  
der Käse · die Wurst · das Rind · das Schwein · die Nudel · die Suppe · die Pizza · der Hamburger · die Bohne · die Orange · die Zitrone · das Eis · die Schokolade · die Torte · die Süßigkeiten (Pl.) · der Zucker · das Mineralwasser · der Bäcker · hart · weich

**A2-W2.5 Clothes and fashion** · لباس و مد · Kleidung und Mode · 26 words  
die Hose · das Hemd · die Bluse · das Kleid · der Rock · der Pullover · das T-Shirt · die Jeans (Pl.) · der Mantel · der Anzug · die Mütze · der Stiefel · die Brille · der Ring · die Kette · der Rucksack · die Mode · das Model · tragen · passen · eng · bunt · lila · rosa · orange · dunkel

**A2-W2.6 Shops and buying** · مغازه‌ها و خرید کردن · Geschäfte und Kaufen · 25 words  
der Supermarkt · das Kaufhaus · das Einkaufszentrum · der Markt · der Flohmarkt · das Produkt · die Qualität · die Ermäßigung · preiswert · kostenlos · ausgeben · sparen · der Kredit · die Geldbörse · wechseln · tauschen · leihen · liefern · das Paket · der Service · die Kosmetik · das Parfüm · die Creme · der Friseur · pro

#### A2-W3 Words: free time and media

Persian: واژه‌ها: اوقات فراغت و رسانه‌ها  
Simple German: Wörter: Freizeit und Medien  
Comes after the grammar chapter: "Reflexive verbs and verbs with prepositions"  
5 nodes, 107 words:

**A2-W3.1 Sport and games** · ورزش و بازی · Sport und Spiele · 19 words  
der Ball · der Basketball · der Volleyball · das Tennis · der Ski · die Mannschaft · das Team · das Training · trainieren · joggen · der Sportplatz · das Spiel · der Wettbewerb · verlieren · der Fan · der Club · das Ziel · schaffen · der Punkt

**A2-W3.2 Music, art and going out** · موسیقی، هنر و بیرون رفتن · Musik, Kunst und Ausgehen · 26 words  
die Musik · der Musiker · der Sänger · singen · die Band · die Gitarre · das Klavier · das Instrument · das Konzert · das Festival · der Star · die Kunst · der Künstler · das Museum · die Ausstellung · das Theater · der Schauspieler · der Zirkus · die Kultur · die Veranstaltung · stattfinden · ausgehen · unternehmen · das Programm · der Rundgang · das Schloss

**A2-W3.3 Reading, radio and hobbies** · خواندن، رادیو و سرگرمی‌ها · Lesen, Radio und Hobbys · 26 words  
das Radio · die Sendung · die Zeitschrift · der Krimi · der/das Comic · der Autor · der Titel · die Seite · der Artikel · das Interview · der Journalist · das Plakat · das Poster · die Postkarte · die Notiz · der Zettel · notieren · der Fotoapparat · die Kamera · fotografieren · malen · zeichnen · basteln · sammeln · ansehen · aktuell

**A2-W3.4 Computer and phone** · کامپیوتر و تلفن · Computer und Telefon · 19 words  
der Blog · das E-Book · die Homepage · die Webseite · der Link · die Datei · das Passwort · der PC · der Laptop · das Tablet · das Mobiltelefon · die/das SMS · die Mailbox · chatten · surfen · speichern · herunterladen · online · austauschen

**A2-W3.5 Festivals and holidays** · جشن‌ها و تعطیلی‌ها · Feste und Feiertage · 17 words  
das Fest · die Feier · der Feiertag · das Weihnachten · das Ostern · das Silvester · das Neujahr · der Karneval · die Ferien (Pl.) · schenken · die Religion · der Werktag · der Arbeitstag · die Mitternacht · der Kalender · täglich · tagsüber

#### A2-W4 Words: health, town and nature

Persian: واژه‌ها: سلامت، شهر و طبیعت  
Simple German: Wörter: Gesundheit, Stadt und Natur  
Comes after the grammar chapter: "Prepositions and directions"  
5 nodes, 111 words:

**A2-W4.1 The body and being ill** · بدن و بیماری · Der Körper und Kranksein · 26 words  
der Körper · das Gesicht · der Hals · das Ohr · der Zahn · der Rücken · der Magen · die Gesundheit · gesund · die Krankheit · die Grippe · erkältet · husten · der Schmerz · das Medikament · die Tablette · die Apotheke · das Krankenhaus · die Krankenkasse · der Krankenpfleger · die Sprechstunde · untersuchen · (sich) verletzen · der Unfall · fit · fallen

**A2-W4.2 Getting around town** · رفت‌وآمد در شهر · Unterwegs in der Stadt · 26 words  
der Verkehr · das Verkehrsmittel · die Ampel · die Kreuzung · die Brücke · die Baustelle · der Weg · die Nähe · das Zentrum · das Rathaus · die Kirche · der Park · der Stadtplan · die Hauptstadt · der Polizist · die Fundsachen (Pl.) · gegenüber · neben · hinter · außerhalb · drüben · überall · nirgends · direkt · vorn · vorwärts

**A2-W4.3 Vehicles and trips** · وسیله‌های نقلیه و سفر · Fahrzeuge und Reisen · 25 words  
parken · der Wagen · der Motor · der Reifen · der Motorroller · das Rad · die Werkstatt · der Führerschein · der Fahrplan · der ICE · die Verspätung · umsteigen · verpassen · erreichen · der Flug · das Schiff · buchen · reservieren · verreisen · die Tour · der Tourist · die Unterkunft · die Jugendherberge · das Zelt · unterwegs

**A2-W4.4 Weather** · هوا · Wetter · 16 words  
das Gewitter · der Schnee · schneien · die Wolke · bewölkt · neblig · sonnig · windig · warm · kalt · kühl · der Grad Celsius · der Himmel · tief · der Schirm · heiß

**A2-W4.5 Nature, animals and plants** · طبیعت، حیوانات و گیاهان · Natur, Tiere und Pflanzen · 18 words  
die Natur · die Landschaft · der Berg · der Fluss · die Insel · der Strand · der Wald · die Pflanze · die Rose · das Blatt · das Tier · die Katze · das Pferd · der Vogel · der Zoo · der Spaziergang · spazieren gehen · reiten

#### A2-W5 Words: school and work

Persian: واژه‌ها: مدرسه و کار  
Simple German: Wörter: Schule und Arbeit  
Comes after the grammar chapter: "Polite requests and advice (Konjunktiv II)"  
3 nodes, 74 words:

**A2-W5.1 School and school subjects** · مدرسه و درس‌ها · Schule und Schulfächer · 27 words  
das Fach · die Biologie · die Chemie · das Deutsch · das Englisch · das Französisch · die Geografie · das Latein · die Mathematik · die Physik · die Sozialkunde · der Stundenplan · die Klassenfahrt · das Sekretariat · der Direktor · die Note · das Zeugnis · das Heft · der Stift · die Tafel · das Wörterbuch · die Bibliothek · die Cafeteria · der Antwortbogen · der Prüfer · bestehen · das Abitur

**A2-W5.2 Training, studying and exams** · آموزش، تحصیل و امتحان · Ausbildung, Studium und Prüfungen · 21 words  
die Ausbildung · der/die Auszubildende · die Universität · das Stipendium · die Kenntnisse (Pl.) · die Erfahrung · der Workshop · das Projekt · üben · prüfen · kontrollieren · (sich) eintragen · markieren · das Rätsel · das Quiz · schriftlich · die Reihe · aufpassen · d. h. · usw. · z. B.

**A2-W5.3 Jobs and the workplace** · شغل‌ها و محل کار · Berufe und Arbeitsplatz · 26 words  
das Büro · der/die Angestellte · der Mitarbeiter · der Handwerker · der Mechaniker · der Techniker · der Kaufmann · die Kauffrau · das Gehalt · der Vertrag · die Bewerbung · sich bewerben · kündigen · die Messe · herstellen · vereinbaren · die Erlaubnis · erlaubt · verbieten · dringend · geehrt · freiwillig · privat · teilnehmen · ändern · austragen

#### A2-W6 Words: time, connecting words and amounts

Persian: واژه‌ها: زمان، واژه‌های ربط و مقدار  
Simple German: Wörter: Zeit, Verbindungswörter und Mengen  
Comes after the grammar chapter: "Subordinate clauses"  
4 nodes, 96 words:

**A2-W6.1 When and how often** · کِی و چند وقت یک‌بار · Wann und wie oft · 22 words  
montags · dienstags · mittwochs · donnerstags · freitags · samstags · sonntags · morgens · vormittags · mittags · nachmittags · abends · nachts · übermorgen · vorgestern · früh · zweimal · dreimal · viermal · manchmal · meistens · das Mal

**A2-W6.2 First, then, suddenly: the order of events** · اول، بعد، ناگهان: ترتیب رویدادها · Zuerst, dann, plötzlich: die Reihenfolge · 23 words  
damals · endlich · plötzlich · zuerst · zuletzt · vorher · vorbei · wieder · erst · erstens · zweitens · drittens · viertens · beenden · verschieben · passieren · klappen · versuchen · planen · (sich) vorbereiten · organisieren · sich beeilen · lassen

**A2-W6.3 Because, that, if: connecting words** · چون، که، اگر: واژه‌های ربط · Weil, dass, wenn: Verbindungswörter · 25 words  
als · dass · weil · wenn · deshalb · außerdem · sonst · doch · mal · sogar · eigentlich · außer · wegen · anders · selbst · eigen · einzeln · verschieden · her · hin · heraus · herein · dabei · genau · fast

**A2-W6.4 Countries, numbers and amounts** · کشورها، عددها و مقدارها · Länder, Zahlen und Mengen · 26 words  
das Österreich · die Schweiz · das Luxemburg · der Österreicher · der Schweizer · der Luxemburger · österreichisch · schweizerisch · luxemburgisch · der Franken · der Rappen · die Zahl · rechnen · zweitausendeins · viertel · mindestens · wenigstens · ca. · genug · ein paar · einige · manche · etwas · der Rest · die Menge · teilen

### B1

#### B1-W1 Words: people and feelings

Persian: واژه‌ها: آدم‌ها و احساس‌ها  
Simple German: Wörter: Menschen und Gefühle  
Comes after the grammar chapter: "Past and future tenses"  
7 nodes, 173 words:

**B1-W1.1 Family and growing up** · خانواده و بزرگ شدن · Familie und Aufwachsen · 22 words  
die Geburt · die Kindheit · die Jugend · die Generation · der Nachwuchs · der Neffe · die Nichte · der/die Angehörige · verwandt · die Ehe · das Ehepaar · die Scheidung · sich scheiden lassen · die Trennung · getrennt leben · (sich) trennen · erziehen · die Erziehung · erwachsen · die Schwangerschaft · das Geschlecht · der Personenstand

**B1-W1.2 Friendship, love and meeting people** · دوستی، عشق و دیدار با دیگران · Freundschaft, Liebe und Begegnungen · 25 words  
die Freundschaft · die Liebe · die Beziehung · das Verhältnis · der Kuss · küssen · umarmen · verliebt · treu · vertrauen · das Vertrauen · begegnen · begrüßen · grüßen · (sich) verabschieden · der Abschied · (sich) verabreden · die Verabredung · der Treffpunkt · begleiten · vermissen · das Heimweh · einsam · gemeinsam · miteinander

**B1-W1.3 Character** · شخصیت و اخلاق · Charakter · 23 words  
ehrlich · höflich · frech · mutig · der Mut · neugierig · stolz · tolerant · zuverlässig · ordentlich · sparsam · kreativ · optimistisch · realistisch · vernünftig · verrückt · ernst · ernsthaft · locker · cool · fair · der Humor · die Geduld

**B1-W1.4 Looks and what you wear** · ظاهر و پوشش · Aussehen und Kleidung · 27 words  
hübsch · schlank · mager · blass · elegant · chic · die Figur · die Frisur · der Bart · der Schmuck · schminken · (sich) rasieren · äußerlich · wunderschön · kräftig · die Uniform · das Kostüm · der Hut · die Socke · der Strumpf · der Bikini · der Knopf · das Tuch · anhaben · nähen · die Nadel · die Garderobe

**B1-W1.5 Joy, hope and surprise** · شادی، امید و شگفتی · Freude, Hoffnung und Überraschung · 25 words  
die Freude · das Gefühl · die Laune · die Stimmung · die Hoffnung · die Überraschung · überraschen · das Vergnügen · sich vergnügen · vergnügt · sich amüsieren · genießen · fröhlich · begeistert · dankbar · gespannt · lächeln · beruhigen · sich wundern · das Wunder · angenehm · gemütlich · entspannend · der Respekt · erwarten

**B1-W1.6 Anger, fear and worry** · خشم، ترس و نگرانی · Ärger, Angst und Sorgen · 24 words  
der Ärger · ärgerlich · aufregen · wütend · die Sorge · sorgen · (sich) fürchten · ängstlich · erschrecken · der Schreck · die Enttäuschung · enttäuschen · die Langeweile · sich langweilen · das Pech · leiden · klagen · hassen · die Träne · schreien · peinlich · unheimlich · der Nerv · der Druck

**B1-W1.7 Behaviour and conflicts** · رفتار و اختلاف‌ها · Verhalten und Konflikte · 27 words  
das Verhalten · sich verhalten · die Gewohnheit · gewöhnen · gewohnt · die Rücksicht · der Streit · der Konflikt · der Vorwurf · beleidigen · verzeihen · die Verzeihung · die Schuld · schuld · loben · (sich) zwingen · sich weigern · sich etwas gefallen lassen · betrügen · verraten · das Geheimnis · geheim · heimlich · umgehen · der Kompromiss · sich einigen · übertreiben

#### B1-W2 Words: body and health

Persian: واژه‌ها: بدن و سلامت  
Simple German: Wörter: Körper und Gesundheit  
Comes after the grammar chapter: "Time clauses"  
5 nodes, 130 words:

**B1-W2.1 The body** · بدن · Der Körper · 27 words  
die Brust · der Finger · das Herz · die Haut · das Knie · der Knochen · die Lippe · der Muskel · die Nase · die Schulter · das Blut · bluten · der Atem · atmen · die Stimme · körperlich · die Kraft · schwitzen · frieren · der Schlaf · aufwachen · bewegen · die Bewegung · wiegen · die Fitness · die Gymnastik · spüren

**B1-W2.2 Illness and treatment** · بیماری و درمان · Krankheit und Behandlung · 27 words  
die Erkältung · sich erkälten · der Schnupfen · der Husten · die Infektion · der Virus · die Verletzung · die Wunde · das Pflaster · die Salbe · die Tropfen (Pl.) · die Pille · die Spritze · das Schmerzmittel · die Medizin · die Therapie · die Operation · operieren · die Klinik · der Patient · der/die Kranke · die Untersuchung · verschreiben · behandeln · die Besserung · erschöpft · die Versichertenkarte

**B1-W2.3 Emergencies, danger and damage** · وضعیت اضطراری، خطر و خسارت · Notfälle, Gefahr und Schaden · 27 words  
der Notfall · der Notruf · die Notaufnahme · der Notausgang · der Krankenwagen · die Feuerwehr · der Alarm · die Gefahr · retten · warnen · brennen · (sich) verbrennen · stürzen · das Unglück · die Katastrophe · das Opfer · der Schaden · schaden · beschädigen · zerstören · kaputtgehen · kaputtmachen · das Risiko · die Sicherheit · sichern · schützen · der Schutz

**B1-W2.4 Healthy living and addiction** · زندگی سالم و اعتیاد · Gesund leben und Sucht · 26 words  
die Zahnbürste · die Zahncreme · die Bürste · das Taschentuch · der Spiegel · die Badewanne · die Drogerie · die Sucht · süchtig · das Suchtmittel · die Droge · der Alkohol · betrunken · der Raucher · der Nichtraucher · das Gift · giftig · die Ernährung · ernähren · das Vitamin · vegetarisch · sich erholen · die Erholung · die Diät · abnehmen · zunehmen

**B1-W2.5 Old age and care** · سالمندی و مراقبت · Alter und Pflege · 23 words  
die Senioren (Pl.) · die Rente · in Rente gehen · in Pension gehen · pensioniert · das Altenheim · das Altersheim · der Tod · der/die Tote · tödlich · der Pfleger · pflegen · der Betreuer · betreuen · die Betreuung · die Krankenschwester · behindert · behindern · das Heim · der Sozialarbeiter · blind · taub · stumm

#### B1-W3 Words: home, food and shopping

Persian: واژه‌ها: خانه، خوراک و خرید  
Simple German: Wörter: Wohnen, Essen und Einkaufen  
Comes after the grammar chapter: "Clauses of reason, contrast, condition and result"  
9 nodes, 214 words:

**B1-W3.1 The building** · ساختمان · Das Gebäude · 26 words  
das Gebäude · das Dach · die Wand · die Mauer · der Boden · die Decke · der Flur · der Gang · der Korridor · das Treppenhaus · der Lift · die Etage · das EG · das OG · das UG · die Terrasse · der Hof · das Grundstück · die Klingel · klingeln · klopfen · der Briefkasten · die Steckdose · der Stecker · heizen · die Klimaanlage

**B1-W3.2 Where and how you live** · کجا و چطور زندگی می‌کنی · Wo und wie man wohnt · 20 words  
der Mieter · die Vermietung · der Hausmeister · der Bewohner · die WG · der Wohnort · der Wohnsitz · das Zuhause · die Einrichtung · einrichten · möbliert · der Vorort · die Umgebung · die Gegend · die Lage · zentral · städtisch · der Bau · die Hütte · der Zugang

**B1-W3.3 Furniture, pots and boxes** · مبلمان، ظرف‌ها و جعبه‌ها · Möbel, Töpfe und Kisten · 23 words  
das Regal · der Sessel · die Couch · der Teppich · das Kissen · die Vase · der Wecker · der Backofen · der Ofen · die Pfanne · die Schüssel · die Kanne · die Dose · die Büchse · die Schachtel · die Kiste · der Kasten · der Sack · die Tüte · der Abfalleimer · die Mülltonne · der Abfall · die Müllabfuhr

**B1-W3.4 Cleaning, tools and repairs** · نظافت، ابزار و تعمیر · Putzen, Werkzeug und Reparaturen · 26 words  
abwaschen · spülen · staubsaugen · trocknen · reinigen · das Waschmittel · der Staub · der Schmutz · der Dreck · der Fleck · entsorgen · das Werkzeug · der Hammer · die Zange · der Nagel · kleben · gießen · aufheben · runterwerfen · das Streichholz · das Zündholz · das Feuerzeug · ordnen · erledigen · besorgen · stinken

**B1-W3.5 Materials and things** · جنس‌ها و چیزها · Materialien und Dinge · 25 words  
das Material · das Holz · das Metall · das Gold · das Plastik · der Kunststoff · das Leder · die Wolle · der Stoff · das Gas · die Flüssigkeit · der Stein · der Sand · künstlich · fest · dicht · glatt · der Gegenstand · das Zeug · haltbar · original · das Original · die Folie · farbig · violett

**B1-W3.6 Ingredients** · مواد غذایی · Zutaten · 26 words  
die Aprikose · die Pflaume · die Frucht · die Karotte · die Möhre · die Zwiebel · der Pilz · das Hackfleisch · der Braten · das Schnitzel · das Steak · das Mehl · der Honig · die Marmelade · die Margarine · die Sahne · die Schlagsahne · der Essig · der Pfeffer · das Gewürz · die Soße · der/das Ketchup · der Kloß · der Knödel · die Zutaten (Pl.) · das Fett

**B1-W3.7 Meals, snacks and drinks** · وعده‌ها، میان‌وعده‌ها و نوشیدنی‌ها · Mahlzeiten, Snacks und Getränke · 21 words  
die Mahlzeit · die Speise · das Menü · die Nachspeise · das Dessert · der Imbiss · der Snack · das/der Sandwich · das Müesli · das Gebäck · der Kakao · die/das Cola · die Limonade · das Buffet · zubereiten · mischen · Tee ziehen lassen · zu Mittag · die Scheibe · das Nahrungsmittel · verpflegen

**B1-W3.8 Taste and eating out** · مزه و غذا خوردن در بیرون · Geschmack und Essen gehen · 22 words  
der Geschmack · lecker · salzig · roh · reif · satt · hungrig · durstig · die Gaststätte · das Gasthaus · die Kneipe · die Bar · die Kantine · die Mensa · der Ober · der Wirt · das Trinkgeld · bedienen · Prost · die Reservierung · fressen · konsumieren

**B1-W3.9 Shopping and goods** · خرید و کالا · Einkaufen und Waren · 25 words  
der Einkauf · der Kauf · der Käufer · die Ware · die Marke · die Auswahl · (sich etwas) aussuchen · der Katalog · das Schaufenster · die Buchhandlung · die Reklame · die Werbung · die Garantie · garantieren · der Umtausch · umtauschen · die Lieferung · verpacken · anschaffen · der Salon · das Fundbüro · das Abo · das Abonnement · abonnieren · bieten

#### B1-W4 Words: school, learning and science

Persian: واژه‌ها: مدرسه، یادگیری و علم  
Simple German: Wörter: Schule, Lernen und Wissenschaft  
Comes after the grammar chapter: "Connectors and negation"  
5 nodes, 119 words:

**B1-W4.1 Schools and universities** · مدرسه‌ها و دانشگاه‌ها · Schulen und Hochschulen · 24 words  
die Grundschule · das Gymnasium · die Realschule · die Gesamtschule · die Mittelschule · die Sonderschule · die Berufsschule · die Hochschule · die Fachhochschule · die Volkshochschule · die Uni · das Institut · die Kindertagesstätte · die Kita · die Krippe · das Semester · das Seminar · der/die Studierende · der Professor · der Kursleiter · der Lerner · der Teilnehmer · die Teilnahme · sich beteiligen

**B1-W4.2 Exams, marks and certificates** · امتحان، نمره و مدرک · Prüfungen, Noten und Zeugnisse · 22 words  
die Klassenarbeit · die Nachhilfe · der Intensivkurs · das Zertifikat · das Diplom · der Abschluss · sehr gut · befriedigend · ausreichend · mangelhaft · ungenügend · ausgezeichnet · die Übung · die Wiederholung · der Fortschritt · korrigieren · (sich) verbessern · die Leistung · testen · die Qualifikation · die Urkunde · der Kandidat

**B1-W4.3 Learning and languages** · یادگیری و زبان‌ها · Lernen und Sprachen · 22 words  
das Wissen · die Fremdsprache · die Muttersprache · die Zweitsprache · der Dialekt · die Aussprache · das Alphabet · das Lexikon · nachschlagen · abschreiben · aufschreiben · vorlesen · unterstreichen · die Fähigkeit · die Intelligenz · das Talent · sich konzentrieren · aufmerksam · fließend · mündlich · unterrichten · die Lehre

**B1-W4.4 The language of exam tasks** · زبانِ دستورهای امتحان · Die Sprache der Prüfungsaufgaben · 26 words  
die Aufforderung · der Abschnitt · die Zeile · die Überschrift · die Abbildung · die Tabelle · die Grafik · der Textaufbau · die Einleitung · die Reihenfolge · ergänzen · zuordnen · einfügen · auswählen · zusammenfassen · das Referat · die Präsentation · präsentieren · der Vortrag · das Modul · der Hinweis · die Angabe · vgl. · bzw. · etc. · folgend

**B1-W4.5 Science, research and technology** · علم، پژوهش و فناوری · Wissenschaft, Forschung und Technik · 25 words  
die Wissenschaft · der Wissenschaftler · die Forschung · die Studie · die Theorie · theoretisch · der Experte · die Statistik · statistisch · die Umfrage · die Recherche · analysieren · die Erfindung · erfinden · entdecken · die Entwicklung · entwickeln · die Technik · die Technologie · technisch · die Methode · der Faktor · der Durchschnitt · durchschnittlich · die Philosophie

#### B1-W5 Words: time, connecting words and amounts

Persian: واژه‌ها: زمان، واژه‌های ربط و مقدار  
Simple German: Wörter: Zeit, Verbindungswörter und Mengen  
Comes after the grammar chapter: "Two-part connectors"  
8 nodes, 195 words:

**B1-W5.1 Earlier, meanwhile, later** · پیش‌تر، در این میان، بعدتر · Früher, inzwischen, später · 24 words  
der Monat · der Augenblick · der Zeitpunkt · die Dauer · der Beginn · anfangs · bisher · bereits · danach · nachher · hinterher · vorhin · neulich · kürzlich · inzwischen · mittlerweile · seitdem · längst · nun · eben · diesmal · zunächst · jemals · irgendwann

**B1-W5.2 How often and how long** · چند وقت یک‌بار و چه مدت · Wie oft und wie lange · 26 words  
jedes Mal · jederzeit · endgültig · vorläufig · rechtzeitig · spätestens · gleichzeitig · dauernd · ständig · häufig · selten · regelmäßig · gewöhnlich · normalerweise · stündlich · wöchentlich · monatlich · jährlich · wochentags · werktags · sonnabends · ewig · fortsetzen · die Fortsetzung · noch mal · nochmals

**B1-W5.3 Although, as soon as, in order to: conjunctions** · اگرچه، همین‌که، برای اینکه: حرف‌های ربط · Obwohl, sobald, um … zu: Konjunktionen · 21 words  
sobald · solange · bevor · nachdem · während · falls · indem · ob · obwohl · sodass · damit · als ob · sondern · entweder … oder · weder … noch · sowohl … als auch · je … desto · um … zu · soviel · statt · trotz

**B1-W5.4 However, therefore, by the way: linking a text** · با این حال، بنابراین، راستی: پیوند دادن متن · Jedoch, deshalb, übrigens: Texte verbinden · 21 words  
jedoch · trotzdem · deswegen · daher · nämlich · zwar · allerdings · einerseits · andererseits · übrigens · weshalb · wieso · worüber · worum · ebenfalls · ebenso · genauso · gleichfalls · vor allem · schließlich · nebenbei

**B1-W5.5 Quite, hardly, absolutely: words of degree** · نسبتاً، به‌سختی، کاملاً: واژه‌های شدت · Ziemlich, kaum, absolut: Gradwörter · 25 words  
absolut · völlig · komplett · ziemlich · relativ · extrem · wahnsinnig · unglaublich · kaum · beinahe · möglichst · eher · halt · wohl · bloß · gar · umso · je · jeweils · meinetwegen · sowieso · überhaupt · selbstverständlich · eindeutig · offenbar

**B1-W5.6 How much? About, at most, in total** · چقدر؟ حدوداً، حداکثر، در مجموع · Wie viel? Ungefähr, höchstens, insgesamt · 26 words  
etwa · ungefähr · höchstens · zumindest · maximal · minimal · knapp · gering · zahlreich · mehrere · sämtliche · einzig · gesamt · insgesamt · übrig · die Anzahl · die Hälfte · das Drittel · so viel · zusätzlich · extra · einschließlich · ausschließlich · plus · minus · per

**B1-W5.7 Inside, outside, up, down: place and direction** · داخل، بیرون، بالا، پایین: جا و جهت · Innen, außen, rauf, runter: Ort und Richtung · 26 words  
abwärts · aufwärts · rückwärts · außen · innen · drin · dahin · dorthin · hierher · heim · mitten · entlang · innerhalb · nirgendwo · rauf · raus · rein · voraus · im Freien · obere · innere · vordere · mittlere · linke · rechte · nah

**B1-W5.8 Shapes and measures** · شکل‌ها و اندازه‌ها · Formen und Maße · 26 words  
die Form · der Kreis · das Kreuz · die Fläche · der Rand · das Loch · eckig · spitz · flach · schief · schmal · steil · senkrecht · waagerecht · parallel · die Länge · die Breite · die Höhe · quer · niedrig · riesig · doppelt · zweifach · zählen · messen · schätzen

#### B1-W6 Words: work, money and offices

Persian: واژه‌ها: کار، پول و اداره‌ها  
Simple German: Wörter: Arbeit, Geld und Ämter  
Comes after the grammar chapter: "Genitiv and special nouns"  
9 nodes, 220 words:

**B1-W6.1 Looking for a job** · جست‌وجوی کار · Arbeitssuche · 26 words  
die Arbeitsstelle · die Lehrstelle · der Lehrling · der Azubi · der Praktikant · die Aushilfe · der Lebenslauf · das Vorstellungsgespräch · die Unterlagen (Pl.) · die Voraussetzung · die Karriere · die Fortbildung · die Weiterbildung · ausgebildet · beruflich · berufstätig · die Arbeitslosigkeit · die Arbeitserlaubnis · einstellen · anstellen · entlassen · die Entlassung · die Kündigung · jobben · die Beratung · die Vermittlung

**B1-W6.2 The company, working hours and pay** · شرکت، ساعت کار و دستمزد · Betrieb, Arbeitszeit und Lohn · 21 words  
der Betrieb · die Abteilung · das Personal · der Betriebsrat · die Gewerkschaft · der Streik · streiken · der Lohn · das Einkommen · die Überstunde · der Feierabend · die Teilzeit · die Vollzeit · halbtags · die Beschäftigung · beschäftigen · der/die Leiter · leiten · die Leitung · die Fabrik · das Lager

**B1-W6.3 Tasks, meetings and the office** · وظیفه‌ها، جلسه‌ها و دفتر کار · Aufgaben, Besprechungen und Büro · 27 words  
der Tagesablauf · der Alltag · alltäglich · die Besprechung · die Konferenz · die Versammlung · die Zusammenarbeit · der Auftrag · die Tätigkeit · der Dienst · die Vertretung · vertreten · der Vertreter · der Terminkalender · die Mappe · der Ordner · der Kuli · die Kopie · kopieren · der Kopierer · der Stempel · das Dokument · die Visitenkarte · übernehmen · zuständig · verantwortlich · die Verantwortung

**B1-W6.4 More jobs** · شغل‌های بیشتر · Mehr Berufe · 18 words  
der Architekt · der Briefträger · der Händler · der Ingenieur · der Metzger · der Übersetzer · der Fachmann · die Fachfrau · die Fachleute (Pl.) · der Spezialist · der Profi · der Sekretär · der Meister · der Arbeiter · der Manager · der Unternehmer · der Reporter · der Moderator

**B1-W6.5 Business and the economy** · کسب‌وکار و اقتصاد · Wirtschaft und Handel · 24 words  
der Konsum · die Nachfrage · der Bedarf · benötigen · verbrauchen · der Handel · handeln · der Import · der Export · der Hersteller · der Anbieter · die Konkurrenz · die Wirtschaft · die Industrie · die Produktion · produzieren · die Krise · gründen · der Trend · der Transport · transportieren · weltweit · die Reform · global

**B1-W6.6 Money and the bank** · پول و بانک · Geld und Bank · 25 words  
das Bargeld · die Münze · der Schein · der Geldautomat · die ec-Karte · das Girokonto · die Bankleitzahl · die Überweisung · die Einzahlung · einzahlen · abheben · die Zinsen (Pl.) · die Schulden (Pl.) · die Brieftasche · das Portemonnaie · die Chipkarte · der Chip · der Betrag · die Summe · die Gebühr · die Kosten (Pl.) · die Zahlung · die Mahnung · die Quittung · der Beleg

**B1-W6.7 Costs, prices and value** · هزینه، قیمت و ارزش · Kosten, Preise und Wert · 26 words  
die Steuer · die Mehrwertsteuer · finanziell · finanzieren · leisten · die Einnahme · die Ausgabe · der Gewinn · der Verlust · der Wert · wert · wertlos · wertvoll · gratis · umsonst · inklusive · pauschal · der Zuschlag · der Rabatt · das Sonderangebot · erhöhen · die Erhöhung · reduzieren · sich lohnen · berechnen · einnehmen

**B1-W6.8 Offices and documents** · اداره‌ها و مدارک · Ämter und Dokumente · 27 words  
das Amt · die Behörde · die Verwaltung · die Gemeinde · der Antrag · beantragen · genehmigen · die Frist · die Personalien (Pl.) · das Visum · das Konsulat · die Botschaft · das Asyl · der Aufenthalt · die Bestätigung · ausstellen · verlängern · fällig · erforderlich · die Vorschrift · die Pflicht · verpflichtet · offiziell · das Einschreiben · das Kennzeichen · die Anlage · angeben

**B1-W6.9 Rules, conditions and insurance** · قانون‌ها، شرط‌ها و بیمه · Regeln, Bedingungen und Versicherung · 26 words  
die Versicherung · versichern · der Anspruch · die Bedingung · gelten · die Regel · regeln · die Ausnahme · das Verbot · untersagt · unterlassen · erfordern · erfüllen · festlegen · festsetzen · feststehen · beachten · achten · die Kontrolle · überprüfen · verlangen · fordern · die Forderung · auffordern · ausschließen · beschränken

#### B1-W7 Words: traffic, travel and nature

Persian: واژه‌ها: ترافیک، سفر و طبیعت  
Simple German: Wörter: Verkehr, Reisen und Natur  
Comes after the grammar chapter: "Prepositions"  
8 nodes, 180 words:

**B1-W7.1 Roads and traffic rules** · جاده‌ها و قانون‌های رانندگی · Straßen und Verkehrsregeln · 23 words  
die Fahrbahn · die Einbahnstraße · die Ausfahrt · die Einfahrt · die Kurve · die Umleitung · der Stau · die Vorfahrt · das Verkehrszeichen · die Geschwindigkeit · die Geschwindigkeitsbeschränkung · das Tempo · der Kilometer pro Stunde · der Fußgänger · die Fußgängerzone · der Gehsteig · der Radfahrer · die Strecke · die Entfernung · die Distanz · die Richtung · die Zone · sich verlaufen

**B1-W7.2 Driving and vehicles** · رانندگی و وسیله‌های نقلیه · Fahren und Fahrzeuge · 27 words  
abbiegen · überholen · überqueren · überfahren · bremsen · die Bremse · hupen · der Strafzettel · anschnallen · losfahren · stoppen · der Halt · wenden · tanken · die Tankstelle · das Benzin · die Panne · das Fahrzeug · das Kraftfahrzeug · das Kfz · der Pkw · der Laster · das Motorrad · das E-Bike · das Mountainbike · die Mobilität · mobil

**B1-W7.3 Trains, ships and planes** · قطار، کشتی و هواپیما · Züge, Schiffe und Flugzeuge · 22 words  
die U-Bahn · die Eisenbahn · der Hauptbahnhof · die Station · die Linie · der Speisewagen · die Rückfahrt · die Verbindung · die Fähre · das Boot · der Hafen · die Landung · landen · starten · der Start · der Terminal · der Passagier · die Kabine · der Sitz · die Rückkehr · der Steward · die Stewardess

**B1-W7.4 Holidays and sightseeing** · تعطیلات و دیدن جاهای دیدنی · Urlaub und Sehenswürdigkeiten · 22 words  
der Tourismus · die Saison · die Übernachtung · die Rundfahrt · die Wanderung · das Abenteuer · das Erlebnis · erleben · das Souvenir · das Camp · campen · zelten · die Aussicht · das Denkmal · die Burg · der Turm · die Metropole · die City · verbringen · der Empfang · empfangen · die Pension

**B1-W7.5 Land, sea and sky** · خشکی، دریا و آسمان · Land, Meer und Himmel · 22 words  
die Nordsee · die Ostsee · der Ozean · die Küste · das Ufer · das Gebirge · der Hügel · das Tal · das Gebiet · die Region · regional · die Grenze · nördlich · südlich · östlich · westlich · der Kanal · der Mond · der Stern · die Luft · der Schatten · fließen

**B1-W7.6 Weather and climate** · هوا و اقلیم · Wetter und Klima · 18 words  
das Klima · die Temperatur · die Hitze · die Kälte · die Wärme · der Nebel · der Sturm · der Blitz · blitzen · der Donner · donnern · hageln · der Wetterbericht · die Wettervorhersage · mild · feucht · sinken · steigen

**B1-W7.7 Animals** · حیوانات · Tiere · 24 words  
der Affe · der Bär · die Biene · der Elefant · die Ente · die Fliege · die Giraffe · der Hase · das Insekt · das Krokodil · die Kuh · der Löwe · die Maus · die Mücke · der Pinguin · das Schaf · die Schildkröte · die Schlange · das Haustier · füttern · beißen · stechen · wild · der Tierpark

**B1-W7.8 Farming and the environment** · کشاورزی و محیط زیست · Landwirtschaft und Umwelt · 22 words  
der Bauernhof · der Bauer · die Ernte · die Landwirtschaft · pflanzen · wachsen · blühen · das Gras · der Rasen · die Wiese · das Feld · die Erde · die Umwelt · der Umweltschutz · die Umweltverschmutzung · die Abgase (Pl.) · verschmutzen · die Energie · das Kraftwerk · der Strom · biologisch · alternativ

#### B1-W8 Words: media, arts and free time

Persian: واژه‌ها: رسانه‌ها، هنر و اوقات فراغت  
Simple German: Wörter: Medien, Kunst und Freizeit  
Comes after the grammar chapter: "Adjectives and participles"  
8 nodes, 181 words:

**B1-W8.1 Devices and how to use them** · دستگاه‌ها و طرز استفاده · Geräte und ihre Bedienung · 25 words  
der Bildschirm · der Monitor · die Tastatur · die Taste · die Festplatte · das Laufwerk · der Rechner · die Software · das Smartphone · der Akku · die Batterie · aufladen · einschalten · schalten · anschließen · herunterfahren · installieren · ausdrucken · die Bedienungsanleitung · die Gebrauchsanweisung · die Anleitung · funktionieren · die Störung · elektrisch · elektronisch

**B1-W8.2 The internet and messages** · اینترنت و پیام‌ها · Internet und Nachrichten · 23 words  
das Netz · das Netzwerk · die Plattform · das Forum · der Chat · der User · die Daten (Pl.) · der Klick · klicken · googeln · bloggen · twittern · mailen · hochladen · löschen · tippen · virtuell · digital · checken · die Mobilbox · die Rufnummer · faxen · der Briefumschlag

**B1-W8.3 Press and the public** · مطبوعات و افکار عمومی · Presse und Öffentlichkeit · 21 words  
die Medien (Pl.) · die Presse · das Magazin · die Broschüre · die Annonce · das Inserat · der Verlag · veröffentlichen · der Bericht · die Reportage · die Meldung · die Neuigkeit · der Kommentar · der Leser · der Hörer · der Zuhörer · der Zuschauer · das Publikum · die Öffentlichkeit · öffentlich · der Beitrag

**B1-W8.4 Television, film and sound** · تلویزیون، فیلم و صدا · Fernsehen, Film und Ton · 23 words  
das Fernsehen · das TV · der Sender · senden · die Serie · die Show · die Castingshow · der Spot · das Studio · übertragen · live · das Video · die DVD · die Kassette · der CD-Player · die Fernbedienung · der Lautsprecher · das Kabel · zuschauen · gucken · schauen · die Aufnahme · aufnehmen

**B1-W8.5 Books, writing and art** · کتاب، نوشتن و هنر · Bücher, Schreiben und Kunst · 20 words  
die Literatur · der Roman · das Märchen · das Gedicht · die Erzählung · das Kapitel · der Stil · stilistisch · die Fantasie · die Schrift · die Zeichnung · die Fotografie · die Galerie · das Werk · darstellen · die Darstellung · das Schreiben · der Schriftsteller · der Maler · der Fotograf

**B1-W8.6 Stage and music** · صحنه و موسیقی · Bühne und Musik · 21 words  
die Oper · das Orchester · das Ballett · der Tanz · der Jazz · der Hit · der Song · die Flöte · die Bühne · der Auftritt · auftreten · aufführen · die Vorstellung · die Rolle · die Szene · musikalisch · der Saal · klingen · der Held · der Lärm · still

**B1-W8.7 Sport and competition** · ورزش و رقابت · Sport und Wettkampf · 27 words  
die Sportart · der Sportler · der Profisportler · der Spieler · der Trainer · der Gegner · der Sieg · der Sieger · siegen · der Verlierer · der Rekord · das Stadion · das Tor · das Golf · klettern · tauchen · springen · rennen · werfen · fangen · schießen · treten · kämpfen · der Kampf · unentschieden · die Runde · wetten

**B1-W8.8 Free time, play and festivals** · اوقات فراغت، بازی و جشن‌ها · Freizeit, Spiel und Feste · 21 words  
die Aktivität · der Spielplatz · das Spielzeug · die Puppe · das Puzzle · faulenzen · der Fasching · das Pfingsten · der Nationalfeiertag · der Sonnabend · die Tradition · traditionell · die Gratulation · dekorieren · die Kerze · die Diskothek · die Unterhaltung · das Hallenbad · der Swimmingpool · das Picknick · der Grill

#### B1-W9 Words: thinking and discussing

Persian: واژه‌ها: فکر کردن و بحث کردن  
Simple German: Wörter: Denken und Diskutieren  
Comes after the grammar chapter: "Relative clauses"  
6 nodes, 149 words:

**B1-W9.1 Thinking, noticing and understanding** · فکر کردن، متوجه شدن و فهمیدن · Denken, Bemerken und Verstehen · 26 words  
nachdenken · überlegen · der Gedanke · vermuten · vermutlich · annehmen · zweifeln · der Zweifel · sich irren · verwechseln · erkennen · bemerken · beobachten · auffallen · feststellen · herausfinden · erfahren · einfallen · der Einfall · die Erinnerung · das Verständnis · verständlich · der Sinn · sinnvoll · sinnlos · die Bedeutung

**B1-W9.2 Deciding and planning** · تصمیم گرفتن و برنامه‌ریزی · Entscheiden und Planen · 23 words  
vorhaben · die Absicht · beschließen · entscheiden · die Entscheidung · sich entschließen · entschlossen · die Planung · der Zweck · die Vorbereitung · der Versuch · die Chance · die Gelegenheit · die Möglichkeit · die Alternative · lösen · klären · verzichten · versäumen · abmachen · realisieren · eventuell · voraussichtlich

**B1-W9.3 Effort, support and success** · تلاش، پشتیبانی و موفقیت · Mühe, Unterstützung und Erfolg · 25 words  
die Herausforderung · die Schwierigkeit · zurechtkommen · die Mühe · sich bemühen · sich anstrengen · anstrengend · aufgeben · der Erfolg · erfolgreich · gelingen · der Mangel · der Nachteil · der Vorteil · vergeblich · der Zufall · zufällig · verhindern · vermeiden · erleichtern · das Hilfsmittel · die Unterstützung · unterstützen · die Förderung · fördern

**B1-W9.4 Agreeing, disagreeing and advising** · موافقت، مخالفت و توصیه · Zustimmen, Widersprechen und Raten · 25 words  
die Diskussion · der Standpunkt · die Überzeugung · (sich) überzeugen · überreden · behaupten · widersprechen · zustimmen · die Zustimmung · zusagen · ablehnen · akzeptieren · anerkennen · die Kritik · kritisch · kritisieren · der Eindruck · die Tatsache · tatsächlich · die Wahrheit · absagen · vorschlagen · die Empfehlung · der Rat · der Ratschlag

**B1-W9.5 Reasons and consequences** · دلیل‌ها و پیامدها · Gründe und Folgen · 23 words  
die Begründung · der Grund · die Ursache · die Folge · die Wirkung · wirken · verursachen · der Zusammenhang · der Gegensatz · der Vergleich · unterscheiden · der Einfluss · beeinflussen · abhängen · abhängig · führen · entstehen · folgen · die Reaktion · reagieren · dienen · nutzen · nützen

**B1-W9.6 Telling and informing** · خبر دادن و آگاه کردن · Mitteilen und Informieren · 27 words  
mitteilen · melden · ankündigen · bekannt geben · Bescheid geben · Bescheid sagen · ansprechen · besprechen · sich erkundigen · hinweisen · ausrichten · hinterlassen · unterbrechen · schweigen · versprechen · die Rückmeldung · die Kommunikation · der Dialog · die Rede · der Ausdruck · die Erklärung · die Beschreibung · duzen · (sich) siezen · winken · das Zeichen · das Symbol

#### B1-W10 Words: state and society

Persian: واژه‌ها: دولت و جامعه  
Simple German: Wörter: Staat und Gesellschaft  
Comes after the grammar chapter: "Modal verbs and Konjunktiv II"  
5 nodes, 117 words:

**B1-W10.1 Politics and the state** · سیاست و دولت · Politik und Staat · 26 words  
der Staat · die Regierung · das Parlament · der Bundestag · der Bundeskanzler · der Bundespräsident · der Minister · der Bürgermeister · die Politik · der Politiker · politisch · die Partei · die Wahl · abstimmen · die Demokratie · demokratisch · konservativ · liberal · der Bund · das Bundesland · die Bundesrepublik Deutschland · die EU · die Europäische Union · das Europäisches Parlament · staatlich · national

**B1-W10.2 Law and justice** · قانون و عدالت · Recht und Gerechtigkeit · 20 words  
das Gesetz · das Recht · rechtlich · der Richter · der Anwalt · der Prozess · das Urteil · verurteilen · die Strafe · bestrafen · strafbar · schuldig · illegal · gerecht · gleichberechtigt · die Freiheit · befreit · das Gewissen · der Beweis · beweisen

**B1-W10.3 Crime and the police** · جرم و پلیس · Kriminalität und Polizei · 23 words  
die Kriminalpolizei · der Verbrecher · der Dieb · der Einbrecher · der Einbruch · einbrechen · stehlen · der Täter · der Zeuge · der Verdacht · verdächtig · verhaften · festnehmen · anzeigen · die Tat · die Gewalt · der Killer · die Flucht · fliehen · die Spur · (sich) verstecken · verschwinden · das Gefängnis

**B1-W10.4 Society and history** · جامعه و تاریخ · Gesellschaft und Geschichte · 24 words  
die Gesellschaft · die Gemeinschaft · das Mitglied · die Organisation · sozial · der Friede · der Krieg · der Protest · protestieren · die Aktion · der Gott · menschlich · die Zukunft · die Vergangenheit · das Jahrhundert · das Jahrtausend · das Jahrzehnt · historisch · der König · zukünftig · heutig · ursprünglich · die Realität · die Wirklichkeit

**B1-W10.5 Countries, origins and migration** · کشورها، خاستگاه و مهاجرت · Länder, Herkunft und Migration · 24 words  
das Griechenland · der Grieche · das Griechisch · griechisch · die Türkei · der Türke · das Türkisch · türkisch · die Ukraine · der Ukrainer · das Ukrainisch · ukrainisch · der Migrant · die Migration · die Integration · integrieren · interkulturell · die Minderheit · die Mehrheit · die Bevölkerung · der Einwohner · der Bürger · die Herkunft · stammen

#### B1-W11 Words: general verbs and describing

Persian: واژه‌ها: فعل‌های عمومی و توصیف  
Simple German: Wörter: allgemeine Verben und Beschreiben  
Comes after the grammar chapter: "The passive"  
5 nodes, 117 words:

**B1-W11.1 Moving and handling** · حرکت دادن و به دست گرفتن · Bewegen und Anfassen · 26 words  
drehen · (sich) umdrehen · heben · schieben · (sich) stoßen · schlagen · schütteln · greifen · fassen · festhalten · stecken · treiben · zugehen · sich nähern · eilen · die Eile · eintreten · verlassen · aufhalten · sich befinden · stehen bleiben · entfernen · entgegenkommen · brechen · der Schritt · los

**B1-W11.2 Using, keeping and changing** · به کار بردن، نگه داشتن و تغییر دادن · Benutzen, Behalten und Verändern · 24 words  
(sich) verändern · die Änderung · ersetzen · der Ersatz · erhalten · behalten · besitzen · gebrauchen · verwenden · anwenden · einsetzen · einführen · die Einführung · auflösen · verbinden · verteilen · vergrößern · enthalten · der Inhalt · sich eignen · geeignet · stimmen · besetzen · erstellen

**B1-W11.3 Events, kinds and details** · رویدادها، گونه‌ها و جزئیات · Ereignisse, Arten und Einzelheiten · 19 words  
geschehen · sich ereignen · das Ereignis · vorkommen · ausfallen · eröffnen · die Eröffnung · der Fall · der Zustand · die Stufe · die Art · der Bereich · die Struktur · das System · das Detail · die Einzelheit · das Modell · die Liste · der Typ

**B1-W11.4 Same or different? Usual or strange?** · یکسان یا متفاوت؟ معمولی یا عجیب؟ · Gleich oder anders? Normal oder seltsam? · 22 words  
ähnlich · allgemein · speziell · besondere · bestimmt · individuell · persönlich · einheitlich · unterschiedlich · umgekehrt · üblich · ungewöhnlich · merkwürdig · seltsam · sogenannt · solche · derselbe · selber · irgendein · auseinander · durcheinander · voneinander

**B1-W11.5 Ideal, correct, necessary: judging things** · ایده‌آل، درست، لازم: ارزیابی کردن · Ideal, korrekt, nötig: Dinge beurteilen · 26 words  
ideal · perfekt · prima · klasse · positiv · negativ · korrekt · gründlich · intensiv · kompliziert · nötig · bereit · flexibel · passiv · populär · anwesend · abwesend · sichtbar · zugänglich · interessiert · begrenzt · recht · o.k. · ausreichen · genügen · reichen

<!-- end generated -->

## Words that are not words of their own

<!-- generated: left-out -->

**Word-building parts, 37.** Not words; grammar teaches word building.  
aller- · Bio- · Bundes- · da(r) · Doppel- · dunkel- · Einzel- · Elektro- · Feier- · Ferien- · Geburts- · Groß- · Haupt- · hell- · heraus- · herein- · herunter- · irgend- · Kriminal- · Lieblings- · miss- · Nord- · Not- · Öko- · Ost- · rück- · Schwieger- · Sonder- · Spezial- · Süd- · Traum- · über- · un- · unter- · -weise · West- · zurück-

**Feminine forms, 103.** Each is noted on its masculine noun (103) and learned with it.  
Absenderin → Absender · Anwältin → Anwalt · Arbeiterin → Arbeiter · Architektin → Architekt · Ärztin → Arzt · Ausländerin → Ausländer · Autorin → Autor · Babysitterin → Babysitter · Beamtin → Beamte · Betreuerin → Betreuer · Betriebsrätin → Betriebsrat · Bewohnerin → Bewohner · Briefträgerin → Briefträger · Bundeskanzlerin → Bundeskanzler · Bundespräsidentin → Bundespräsident · Bürgerin → Bürger · Bürgermeisterin → Bürgermeister · Chefin → Chef · Direktorin → Direktor · Doktorin → Doktor · Einbrecherin → Einbrecher · Einwohnerin → Einwohner · Enkelin → Enkel · Europäerin → Europäer · Freundin → Freund · Friseurin → Friseur · Fußgängerin → Fußgänger · Griechin → Grieche · Händlerin → Händler · Handwerkerin → Handwerker · Hausmeisterin → Hausmeister · Heldin → Held · Hörerin → Hörer · Journalistin → Journalist · Käuferin → Käufer · Kellnerin → Kellner · Killerin → Killer · Köchin → Koch · Kollegin → Kollege · Kundin → Kunde · Künstlerin → Künstler · Kursleiterin → Kursleiter · Lehrerin → Lehrer · Leiterin → Leiter · Lernerin → Lerner · Leserin → Leser · Malerin → Maler · Managerin → Manager · Mechanikerin → Mechaniker · Mieterin → Mieter · Migrantin → Migrant · Ministerin → Minister · Mitarbeiterin → Mitarbeiter · Moderatorin → Moderator · Musikerin → Musiker · Nachbarin → Nachbar · Nichtraucherin → Nichtraucher · Österreicherin → Österreicher · Partnerin → Partner · Passagierin → Passagier · Patientin → Patient · Pflegerin → Pfleger · Politikerin → Politiker · Polizistin → Polizist · Praktikantin → Praktikant · Professorin → Professor · Profisportlerin → Profisportler · Radfahrerin → Radfahrer · Raucherin → Raucher · Rentnerin → Rentner · Reporterin → Reporter · Richterin → Richter · Sängerin → Sänger · Schauspielerin → Schauspieler · Schriftstellerin → Schriftsteller · Schülerin → Schüler · Schweizerin → Schweizer · Sekretärin → Sekretär · Siegerin → Sieger · Sozialarbeiterin → Sozialarbeiter · Spezialistin → Spezialist · Spielerin → Spieler · Sportlerin → Sportler · Studentin → Student · Täterin → Täter · Teilnehmerin → Teilnehmer · Touristin → Tourist · Trainerin → Trainer · Türkin → Türke · Übersetzerin → Übersetzer · Ukrainerin → Ukrainer · Unternehmerin → Unternehmer · Userin → User · Verbrecherin → Verbrecher · Verkäuferin → Verkäufer · Verliererin → Verlierer · Vermieterin → Vermieter · Vertreterin → Vertreter · Wirtin → Wirt · Wissenschaftlerin → Wissenschaftler · Zeugin → Zeuge · Zuhörerin → Zuhörer · Zuschauerin → Zuschauer

**Austrian and Swiss words, 96.** 60 are noted on the word used in Germany:  
Abwart → Hausmeister · Abwartin → Hausmeister · Backrohr → Ofen · Bancomat → Geldautomat · Bankomat-Karte → ec-Karte · Billett → Fahrkarte · Brötli → Brötchen · Bub → Junge · Coiffeur → Friseur · Coiffeuse → Friseur · Couvert → Briefumschlag · e-card → Versichertenkarte · Eck → Ecke · Erdapfel → Kartoffel · Faschierte → Hackfleisch · Fasnacht → Fasching · Fauteuil → Sessel · Feber → Februar · Fleischhauer → Metzger · Fleischhauerin → Metzger · Früchte → Obst · Führerausweis → Führerschein · Glace → Eis · grillieren → grillen · Hend(e)l → Hähnchen · Jänner → Januar · Jause → Imbiss · Kaffeehaus → Café · Konfitüre → Marmelade · Kuvert → Briefumschlag · Marille → Aprikose · Matura → Abitur · Obers → Sahne · Ordination → Praxis · Paradeiser → Tomate · parkieren → parken · Pensionist → Rentner · Pensionistin → Rentner · Perron → Bahnsteig · Pöstler → Briefträger · Pöstlerin → Briefträger · Poulet → Hähnchen · Quartier → Viertel · Rahm → Sahne · Rohr → Ofen · Rüebli → Karotte · Schlagobers → Sahne · Schlagrahm → Sahne · Schularbeit → Klassenarbeit · Schwammerl → Pilz · Semmel → Brötchen · Serviceangestellte → Kellner · Stiege → Treppe · Stiegenhaus → Treppenhaus · Tram → Straßenbahn · Trottoir → Gehsteig · Velo → Fahrrad · Zivilstand → Personenstand · Zünder → Streichholz · Zvieri → Imbiss

36 have no counterpart in the lists (mostly school types and political offices of Austria and Switzerland) and are left out:  
AHS · Akademie · Allgemeinbildende Höhere Schule · Ammann · Ammännin · Berufsbildende Höhere Schule · Berufsmittelschule · Bezirksschule · BHS · Bundesrat · Bundesrätin · Deka(gramm) · Diplommittelschule · dreiviertel · genügend · Hauptschule · in der Früh · Kanton · Nationalrat · Neue Mittelschule · nicht genügend · Orientierungsstufe · Pädagogische Hochschule · Primarschule · Regierungsrat · Regierungsrätin · Republik Österreich · Schweizerische Eidgenossenschaft · sehr schlecht · Sekundarschule · Sekundarstufe · Spielgruppe · Stadtpräsident · Stadtpräsidentin · Ständerat · Volksschule

**Second spellings and forms of a word that is in scope, 54.** The word counts once, at the lower level of the two.  
am Abend = Abend · am Dienstag = Dienstag · am Donnerstag = Donnerstag · am Freitag = Freitag · am Mittag = Mittag · am Mittwoch = Mittwoch · am Montag = Montag · am Morgen = Morgen · am Nachmittag = Nachmittag · am Samstag = Samstag · am Sonntag = Sonntag · am Vormittag = Vormittag · am Wochenende = Wochenende · Angestellter = Angestellte · beid- = beide · dabei sein = dabei · dafür sein = dafür · dagegen sein = dagegen · Disko = Disco · ein bisschen = bisschen · einverstanden sein = einverstanden · einzel- = einzeln · erkältet sein = erkältet · erst- = erste · fertig sein = fertig · fit sein = fit · geboren werden = geboren · geehrt- = geehrt · gern(e) = gern · gültig sein = gültig · in der Nacht = Nacht · jed- = jeder · kein- = kein · Kilo(gramm) = Kilogramm · Kunst(erziehung) = Kunst · leid tun = leidtun · lieb- = lieb · Mail = E-Mail · Mathe(matik) = Mathematik · meist(ens) = meistens · nächst- = nächste · Phantasie = Fantasie · selb- = derselbe · tschüs = tschüss · um Mitternacht = Mitternacht · unterwegs sein = unterwegs · verabredet sein = verabredet · verboten sein = verboten · vorn(e) = vorn · was für ein- = was für ein · weg sein = weg · weh tun = wehtun · welch- = welcher · wie viel(e) = wie viel

<!-- end generated -->

## Judgment calls

Each of these is a decision the word lists do not make. Tell me which ones to change.

1. **The scope rule.** See "Which words are in scope". It is my recommendation, not your answer.

2. **138 nodes, not "about 100".** This follows from the number of words. With the rule in force, about 100 nodes would mean about 33 words a node.

3. **Stems are words.** The lists write a word that takes endings as a stem with a hyphen: *ander-*, *einig-*, *manch-*, *besonder-*. These look like word-building parts, but they are words you need. 24 of them are in scope under their full form (*andere*, *einige*, *manche*, *besondere*, *dieser*, *dein*, *unser* …); 11 more were the same word as an entry of another list (*jed-* and *jeder*). Truly left out are parts such as *Lieblings-*, *Haupt-*, *un-*.

4. **One word, two spellings.** Where two lists spell one word differently, it is one word at the lower level: *gern(e)* and *gern*, *tschüss* and *tschüs*, *Disco* and *Disko*, *leidtun* and *leid tun*, *wehtun* and *weh tun*, *Mail* and *E-Mail*. *Diskothek* stays a word of its own.

5. **A noun with its preposition, an adjective with *sein*.** The A2 list prints *am Montag*, *am Morgen*, *in der Nacht* and *fertig sein*, *erkältet sein*, *dafür sein* as entries. They are counted with *Montag*, *Morgen*, *Nacht*, *fertig*, *erkältet*, *dafür* (29 entries). The other choice is to count them as words: about one more node in A2.

6. **Words used in Germany although the list marks them.** *Pfanne* is in the B1 list only as the Swiss word for *Topf*; it is in scope, because in Germany it is the frying pan. *Gasthaus* is marked for Austria and is in scope, because it is used in Germany too. *kosten*, *schlecht*, *Ferien*, *Geldbörse* and *Pension* carry a region mark for one of their meanings only and are in scope. Five words carry no mark in the list but are Swiss or Austrian and were noted on the German word: *Abwart*, *Coiffeur*, *Billett*, *Tram* (Swiss), *Fleischhauer* (Austrian).

7. **Feminine forms that are words of their own.** *Hausfrau*, *Krankenschwester*, *Kauffrau*, *Ehefrau*, *Cousine*, *Stewardess* are not made from the masculine noun with *-in*, so they are in scope as words.

8. **Two words in one headword.** Where two nouns are spelled the same, the merged list has one headword: *der See* and *die See*, *der Leiter* and *die Leiter*, *das Teil* and *der Teil*, *die Bank* (bench and bank), *die Maus* (animal and computer). Such a word is in one node; ticket #18 gives it both meanings.

9. **Numbers and letters that show a pattern.** The lists print *einundzwanzig*, *hunderteins*, *zweihundert* and *zweitausendeins* to show how numbers are built. They are in the number nodes. Dates and clock times written out (*sieben Uhr fünfzehn*) are in no list of headwords and in no node.

10. **Word class.** The lists print no word class. Nouns and verbs were recognised from the article, the plural and the verb forms. For the about 850 other words I wrote the class myself (adjective, adverb, pronoun, article, preposition, conjunction, numeral, particle, interjection, phrase, abbreviation). A word that is both adjective and adverb is an adjective. This is a draft; ticket #18 checks each word when it writes its entry.

11. **Articles and plurals that the lists do not print.** 60 nouns stand in the lists without article (units, countries, school subjects, holidays: *Meter*, *Euro*, *Chemie*, *Ostern*). I added article and plural. 216 nouns have no plural information, because the list prints none or the noun has none. Ticket #18 writes the full plural form of every noun.

12. **Chapter places.** The order of the vocabulary chapters, and the grammar chapter each one follows, is my proposal. Places where you may disagree:
    - A1 starts with grammar ("Verbs in the present", "First sentences and questions"), then the first words: greetings, your name and address, family.
    - "Words: small words and useful verbs" (pronouns, question words, prepositions, modal verbs as words) comes after the A1 grammar chapter on pronouns. You meet these words in the grammar chapters first; the nodes are where you learn them as vocabulary.
    - B1 has 11 vocabulary chapters with 4 to 9 nodes. If you prefer more and smaller chapters, "Words: home, food and shopping" (9 nodes) and "Words: work, money and offices" (9 nodes) split well in two.

13. **Small nodes.** Twelve nodes have fewer than 20 words, among them "Weather" in A2 (16), "Countries and where you live" in A1 (17), "Weather and climate" in B1 (18) and "More jobs" in B1 (18). I did not fill them with words of another theme.

14. **Node identifiers.** A node's identifier is `vocabulary-` plus an English name of its theme, such as `vocabulary-family`. It does not hold the level and does not change when a node moves.

## What I corrected in the extracted lists

The corrections are one file, `content/vocabulary/scope-corrections.yaml`; each has its reason there.

- 24 stems renamed to full words, 11 stems and 15 second spellings joined with their word, 29 entries with a preposition or with *sein* joined with their word (see 3, 4 and 5).
- 14 headwords printed with brackets, slashes or dots brought to a plain form: *bio(logisch)* to *biologisch*, *nah(e)* to *nah*, *Schreck(en)* to *Schreck*, *Chat(room)* to *Chat*, *auf jeden/keinen Fall* to *auf jeden Fall*, *Speise-/-speise* to *die Speise*, *Europäische Parlament* to *Europäisches Parlament*, *Auszubildender* to *der/die Auszubildende*, *Hinweise* to *der Hinweis*.
- *da(r)* is a word-building part (the first part of *dafür*, *darauf*), not a word.
- *Zeugin* is the feminine form of *Zeuge*; the extraction had it under *Zeug*.
- The region marks: the merged list called a word "not used in Germany" as soon as one of its rows had a mark. Now a word is regional only if it is in the B1 list alone and every row of it has a mark without Germany. That brought back *kosten*, *schlecht*, *Ferien*, *Geldbörse* and *Pension*.
- *Jänner*, *Feber*, *Kaffeehaus* and *Konfitüre* are noted on *Januar*, *Februar*, *Café* and *Marmelade*; the list gives no cross-reference for them.
- *Prost* is an interjection, not a noun.
- Article and plural added to 60 nouns (see 11).
- *Kauffrau*, *Werktag* and *Ostsee* added: the lists print them in the cell of *Kaufmann*, *Arbeitstag* and *Nordsee*.

Not checked word by word: the 815 rows of the word groups were typed by hand during the extraction and only a few were compared with the print. I read all of them while sorting the words into nodes and found no wrong word, but I did not hold them against the PDFs.
