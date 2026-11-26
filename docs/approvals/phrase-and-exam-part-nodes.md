# Phrase nodes and exam-part nodes: for your approval

Status: **waiting for the learner's approval.** Nothing here is final until you say so. The integration branch is not merged to `main` before that.

This document lists every phrase node and every exam-part node of the tree, with the chapters they are in and the places of these chapters. It belongs to ticket #8 ("Phrase and exam-part node lists, approved and in the tree"). All of these nodes show "Coming soon" in the app; this list decides only which nodes exist, what they are called and where they stand. The phrases themselves and their tests are written later (ticket #20), and so are the pages of the exam parts (tickets #21 and #23).

## What you are asked to check

1. **The list of phrase nodes**: is a purpose missing, is one too much, should two be joined or one be split?
2. **The exam tasks each phrase node serves.**
3. **The level of each phrase node.** Ten are in A2, twenty in B1.
4. **The chapters**: their names in English, Persian and simple German, which nodes are in which chapter, and where each chapter stands among the grammar chapters.
5. **The 15 exam-part nodes** and their titles.
6. **The judgment calls** at the end. Each one is a decision I made alone and you may want differently.

To change something, say it in plain words: "join Agreeing and Disagreeing", "move Making a suggestion to B1", "put Opinions and discussion after B1.3", "rename the chapter to …". Moving a chapter is a one-line change; nothing else has to be rewritten.

## How the lists were made

- **A phrase node is one purpose**: one thing you do with language, such as apologising or opening a presentation. The spec names six purposes (opening and closing an e-mail, giving an opinion, agreeing, disagreeing, suggesting, apologising). The others come from the exam itself: I went through the three writing tasks and the three speaking tasks and wrote down what each one makes you do, and what its marking criteria reward.
  - Schreiben Aufgabe 1 is an e-mail to a friend on three points; in the model exam the points are: describe, give a reason, make a suggestion. The markers also look for a greeting, a first sentence and a closing.
  - Schreiben Aufgabe 2 is your opinion on a topic, in answer to another person's opinion.
  - Schreiben Aufgabe 3 is a short e-mail to a person you address with Sie; in the model exam you apologise and say why you cannot come.
  - Sprechen Teil 1 is planning with a partner. The criteria name suggesting and agreeing, and "starting the conversation, keeping it going, ending it".
  - Sprechen Teil 2 is a presentation along five slides: the topic and its parts, your own experience, the situation in your home country, advantages and disadvantages with your opinion, the end and thanks.
  - Sprechen Teil 3 comes after the presentation: you give feedback and ask a question, and you answer questions about yours.
- **Every phrase node names the exam tasks it serves**, and every one of the six writing and speaking tasks is served by at least four nodes. The section "The same list, by exam task" shows this from the other side.
- **An exam-part node is one part of the exam.** The Goethe-Zertifikat B1 has 15 parts: Lesen 5, Hören 4, Schreiben 3 and Sprechen 3. This was checked against the official model exam and the exam rules, so the 15 are a fact, not a choice. The choices are their titles and their chapters.
- **Chapters.** The phrase nodes are in 6 chapters, the exam parts in 4, one for each module. A chapter belongs to one level and has one kind, like the grammar chapters.
- **The Persian names and purposes are a draft written by an AI.** A native reader reviews all Persian text later (ticket #34). The German ones are simple German, also a draft.
- The purpose of a node is one line that the app can show on the node's page. It is given here in all three languages.

## Where the chapters stand

A phrase chapter stands directly after the grammar chapter whose grammar its phrases need most. So you learn a piece of grammar and then use it in whole sentences. The exam parts are the last four chapters of B1, in the order of the exam.

The grammar chapters keep their numbers from `docs/approvals/grammar-chapters.md` (A2.1 to A2.12, B1.1 to B1.14). The new chapters are in bold.

**A2**

| Place | Chapter | Kind | Nodes |
|---|---|---|---|
| 1 to 2 | A2.1 The past: all verbs; A2.2 Dativ, objects and their order | grammar | |
| 3 | **E-mails and messages** | phrases | 4 |
| 4 to 10 | A2.3 Articles and pronouns … A2.9 Subordinate clauses | grammar | |
| 11 | **Suggestions, requests and apologies** | phrases | 6 |
| 12 to 14 | A2.10 werden, lassen and the passive; A2.11 Relative clauses; A2.12 Word building and particles | grammar | |

**B1**

| Place | Chapter | Kind | Nodes |
|---|---|---|---|
| 1 to 5 | B1.1 Past and future tenses … B1.5 Two-part connectors | grammar | |
| 6 | **Opinions and discussion** | phrases | 5 |
| 7 to 8 | B1.6 Genitiv and special nouns; B1.7 Prepositions | grammar | |
| 9 | **Writing e-mails and forum posts** | phrases | 5 |
| 10 to 14 | B1.8 Adjectives and participles … B1.12 Modal verbs and Konjunktiv II | grammar | |
| 15 | **Planning something together** | phrases | 4 |
| 16 to 17 | B1.13 The passive; B1.14 Fractions, word building and particles | grammar | |
| 18 | **Presenting a topic and talking about it** | phrases | 6 |
| 19 | **The exam: reading (Lesen)** | exam parts | 5 |
| 20 | **The exam: listening (Hören)** | exam parts | 4 |
| 21 | **The exam: writing (Schreiben)** | exam parts | 3 |
| 22 | **The exam: speaking (Sprechen)** | exam parts | 3 |

A1 has no phrase chapter. The places are the numbers the app shows today. The vocabulary chapters (ticket #7) are not in the tree yet; when they come, the numbers grow, but each chapter above keeps its neighbours in this order, and the exam parts stay last.

Inside a chapter, the nodes run in the order they are listed below.

## The phrase nodes

30 nodes in 6 chapters: 10 nodes in A2 and 20 in B1. "Serves" names the exam tasks the phrases are for.

### A2 · E-mails and messages

Persian: ایمیل و پیام  
Simple German: E-Mails und Nachrichten  
Position: after the grammar chapter A2.2 "Dativ, objects and their order". You thank somebody and write to somebody with the Dativ (dir, Ihnen), and you tell things in the Perfekt of A2.1.  
4 nodes:

1. **Greeting and signing off in an e-mail to a friend** (`phrases-email-friend-greetings`)  
   Persian: سلام و خداحافظی در ایمیل به دوست · Simple German: Anrede und Gruß in einer E-Mail an Freunde  
   Purpose: Begin an informal e-mail with the right greeting and end it with the right closing.  
   Persian: ایمیل غیررسمی را با سلام مناسب شروع کنید و با خداحافظی مناسب تمام کنید.  
   Simple German: Eine informelle E-Mail richtig beginnen und richtig beenden.  
   Serves: Schreiben Aufgabe 1

2. **Greeting and signing off in a formal e-mail** (`phrases-email-formal-greetings`)  
   Persian: سلام و خداحافظی در ایمیل رسمی · Simple German: Anrede und Gruß in einer formellen E-Mail  
   Purpose: Begin and end an e-mail to a person you address with Sie, such as a teacher or a landlord.  
   Persian: ایمیل به کسی را که با Sie خطابش می‌کنید، مثل معلم یا صاحب‌خانه، درست شروع و تمام کنید.  
   Simple German: Eine E-Mail an eine Person, zu der man Sie sagt, richtig beginnen und beenden.  
   Serves: Schreiben Aufgabe 3

3. **Thanking and reacting to news** (`phrases-thanking-reacting`)  
   Persian: تشکر و واکنش به خبر · Simple German: Danken und auf Neuigkeiten reagieren  
   Purpose: Thank someone, congratulate, and say that you are glad or sorry about something.  
   Persian: از کسی تشکر کنید، تبریک بگویید و بگویید که از چیزی خوشحال یا متأسفید.  
   Simple German: Jemandem danken, gratulieren und sagen, dass man sich freut oder dass etwas schade ist.  
   Serves: Schreiben Aufgabe 1, Schreiben Aufgabe 3

4. **Inviting, accepting and declining** (`phrases-inviting`)  
   Persian: دعوت کردن، پذیرفتن و رد کردن دعوت · Simple German: Einladen, zusagen und absagen  
   Purpose: Invite someone, and say yes or no to an invitation in a friendly way.  
   Persian: کسی را دعوت کنید و به یک دعوت، دوستانه جواب مثبت یا منفی بدهید.  
   Simple German: Jemanden einladen und auf eine Einladung freundlich mit Ja oder Nein antworten.  
   Serves: Schreiben Aufgabe 1, Schreiben Aufgabe 3

### A2 · Suggestions, requests and apologies

Persian: پیشنهاد، درخواست و عذرخواهی  
Simple German: Vorschläge, Bitten und Entschuldigungen  
Position: after the grammar chapter A2.9 "Subordinate clauses". These phrases use könnte and sollte (A2.7), weil for the reason, and indirect questions for polite questions (A2.9).  
6 nodes:

1. **Making a suggestion** (`phrases-suggesting`)  
   Persian: پیشنهاد دادن · Simple German: Einen Vorschlag machen  
   Purpose: Suggest what to do, where to meet or how to solve a problem.  
   Persian: پیشنهاد بدهید که چه کاری بکنید، کجا همدیگر را ببینید یا چطور مشکلی را حل کنید.  
   Simple German: Vorschlagen, was man macht, wo man sich trifft oder wie man ein Problem löst.  
   Serves: Schreiben Aufgabe 1, Sprechen Teil 1

2. **Giving advice and recommending** (`phrases-advising`)  
   Persian: توصیه و راهنمایی کردن · Simple German: Einen Rat geben und etwas empfehlen  
   Purpose: Tell someone what they could do, or what you think is worth doing.  
   Persian: به کسی بگویید چه کاری می‌تواند بکند، یا چه چیزی به نظرتان ارزش انجام دادن دارد.  
   Simple German: Jemandem sagen, was er tun könnte oder was man gut findet.  
   Serves: Schreiben Aufgabe 1, Sprechen Teil 1

3. **Agreeing on a time and a place** (`phrases-appointments`)  
   Persian: هماهنگ کردن زمان و مکان · Simple German: Zeit und Ort ausmachen  
   Purpose: Ask when someone has time, offer a day and a place, and fix the meeting.  
   Persian: بپرسید طرف مقابل کی وقت دارد، روز و جایی را پیشنهاد کنید و قرار را قطعی کنید.  
   Simple German: Fragen, wann jemand Zeit hat, einen Tag und einen Ort anbieten und den Termin festmachen.  
   Serves: Schreiben Aufgabe 1, Schreiben Aufgabe 3, Sprechen Teil 1

4. **Apologising and saying why** (`phrases-apologising`)  
   Persian: عذرخواهی و گفتن دلیل · Simple German: Sich entschuldigen und den Grund sagen  
   Purpose: Say sorry, for example because you cannot come, and give a short reason.  
   Persian: عذرخواهی کنید، مثلاً چون نمی‌توانید بیایید، و دلیل کوتاهی بگویید.  
   Simple German: Sich entschuldigen, zum Beispiel weil man nicht kommen kann, und kurz den Grund sagen.  
   Serves: Schreiben Aufgabe 1, Schreiben Aufgabe 3

5. **Asking politely for help or information** (`phrases-polite-requests`)  
   Persian: درخواست مؤدبانهٔ کمک یا اطلاعات · Simple German: Höflich um Hilfe oder Informationen bitten  
   Purpose: Ask a person you address with Sie to do something or to tell you something.  
   Persian: از کسی که با Sie خطابش می‌کنید بخواهید کاری انجام دهد یا چیزی را به شما بگوید.  
   Simple German: Eine Person, zu der man Sie sagt, höflich um etwas bitten oder nach etwas fragen.  
   Serves: Schreiben Aufgabe 3

6. **Asking again when you did not understand** (`phrases-asking-again`)  
   Persian: دوباره پرسیدن وقتی متوجه نشده‌اید · Simple German: Nachfragen, wenn man etwas nicht verstanden hat  
   Purpose: Say that you did not understand, ask the other person to repeat or explain, and check that you understood.  
   Persian: بگویید که متوجه نشده‌اید، از طرف مقابل بخواهید تکرار کند یا توضیح دهد، و مطمئن شوید که درست فهمیده‌اید.  
   Simple German: Sagen, dass man etwas nicht verstanden hat, um Wiederholung oder Erklärung bitten und prüfen, ob man es richtig verstanden hat.  
   Serves: Sprechen Teil 1, Sprechen Teil 3

### B1 · Opinions and discussion

Persian: نظر و بحث  
Simple German: Meinung und Diskussion  
Position: after the grammar chapter B1.5 "Two-part connectors". An opinion needs dass, obwohl and trotzdem (B1.3, B1.4); advantages and disadvantages need zwar … aber and nicht nur … sondern auch (B1.5).  
5 nodes:

1. **Giving your opinion** (`phrases-giving-opinion`)  
   Persian: بیان نظر خود · Simple German: Die eigene Meinung sagen  
   Purpose: Say what you think about a topic, in writing and in speaking.  
   Persian: نظرتان را دربارهٔ یک موضوع بگویید، هم در نوشتن و هم در صحبت کردن.  
   Simple German: Sagen und schreiben, was man über ein Thema denkt.  
   Serves: Schreiben Aufgabe 2, Sprechen Teil 2

2. **Agreeing** (`phrases-agreeing`)  
   Persian: موافقت کردن · Simple German: Zustimmen  
   Purpose: Say that you think the same as another person, fully or in part.  
   Persian: بگویید که با نظر کس دیگری موافقید، کاملاً یا تا حدی.  
   Simple German: Sagen, dass man die gleiche Meinung hat wie eine andere Person, ganz oder zum Teil.  
   Serves: Schreiben Aufgabe 2, Sprechen Teil 1

3. **Disagreeing politely** (`phrases-disagreeing`)  
   Persian: مخالفت مؤدبانه · Simple German: Höflich widersprechen  
   Purpose: Say that you see something differently without being rude.  
   Persian: بگویید که نظر دیگری دارید، بدون اینکه بی‌ادبانه باشد.  
   Simple German: Sagen, dass man etwas anders sieht, ohne unhöflich zu sein.  
   Serves: Schreiben Aufgabe 2, Sprechen Teil 1

4. **Giving reasons and examples** (`phrases-reasons-examples`)  
   Persian: آوردن دلیل و مثال · Simple German: Gründe und Beispiele nennen  
   Purpose: Support what you say with a reason, an example or your own experience.  
   Persian: حرفتان را با دلیل، مثال یا تجربهٔ شخصی محکم کنید.  
   Simple German: Mit einem Grund, einem Beispiel oder der eigenen Erfahrung zeigen, warum man etwas denkt.  
   Serves: Schreiben Aufgabe 1, Schreiben Aufgabe 2, Sprechen Teil 2

5. **Advantages and disadvantages** (`phrases-advantages-disadvantages`)  
   Persian: مزایا و معایب · Simple German: Vorteile und Nachteile  
   Purpose: Name the good and the bad sides of something and weigh them.  
   Persian: خوبی‌ها و بدی‌های چیزی را بگویید و آن‌ها را با هم بسنجید.  
   Simple German: Die guten und die schlechten Seiten von etwas nennen und vergleichen.  
   Serves: Schreiben Aufgabe 2, Sprechen Teil 2

### B1 · Writing e-mails and forum posts

Persian: نوشتن ایمیل و نظر در انجمن اینترنتی  
Simple German: E-Mails und Beiträge im Forum schreiben  
Position: after the grammar chapter B1.7 "Prepositions". A short text needs the past tenses (B1.1), the text connectors (B1.4) and wegen and trotz for a short reason (B1.7).  
5 nodes:

1. **First and last sentences of an e-mail** (`phrases-email-first-last-sentences`)  
   Persian: جمله‌های اول و آخر ایمیل · Simple German: Erste und letzte Sätze in einer E-Mail  
   Purpose: After the greeting, say why you are writing; before the closing, end with a wish or a request for an answer.  
   Persian: بعد از سلام بگویید چرا می‌نویسید؛ پیش از خداحافظی با یک آرزو یا درخواست جواب تمام کنید.  
   Simple German: Nach der Anrede sagen, warum man schreibt; vor dem Gruß mit einem Wunsch oder einer Bitte um Antwort enden.  
   Serves: Schreiben Aufgabe 1, Schreiben Aufgabe 3

2. **Telling what happened and how it was** (`phrases-telling-what-happened`)  
   Persian: تعریف کردن یک اتفاق و اینکه چطور بود · Simple German: Erzählen, was passiert ist und wie es war  
   Purpose: Describe an event such as a party or a trip: what you did, how it was and what you liked best.  
   Persian: اتفاقی مثل جشن یا سفر را توصیف کنید: چه کردید، چطور بود و از چه چیزی بیشتر خوشتان آمد.  
   Simple German: Ein Ereignis wie eine Feier oder eine Reise beschreiben: was man gemacht hat, wie es war und was am besten war.  
   Serves: Schreiben Aufgabe 1, Sprechen Teil 2

3. **Starting and ending a forum post** (`phrases-forum-post`)  
   Persian: شروع و پایان یک نوشته در انجمن اینترنتی · Simple German: Einen Beitrag im Forum beginnen und beenden  
   Purpose: Refer to the topic or to another person's post at the start, and sum up your view at the end.  
   Persian: در آغاز به موضوع یا به نوشتهٔ فرد دیگری اشاره کنید و در پایان نظرتان را جمع‌بندی کنید.  
   Simple German: Am Anfang etwas zum Thema oder zu einem anderen Beitrag sagen und am Ende die eigene Meinung zusammenfassen.  
   Serves: Schreiben Aufgabe 2

4. **Ordering and linking your points** (`phrases-ordering-linking`)  
   Persian: مرتب کردن و پیوند دادن مطالب · Simple German: Punkte ordnen und verbinden  
   Purpose: Put your points in an order and connect them, so that a text or a talk is easy to follow.  
   Persian: مطالبتان را به ترتیب بچینید و به هم وصل کنید تا دنبال کردن متن یا صحبت شما آسان باشد.  
   Simple German: Die eigenen Punkte in eine Reihenfolge bringen und verbinden, damit man den Text oder Vortrag gut versteht.  
   Serves: Schreiben Aufgabe 1, Schreiben Aufgabe 2, Sprechen Teil 2

5. **Cancelling or moving an appointment** (`phrases-changing-appointment`)  
   Persian: لغو یا جابه‌جا کردن قرار · Simple German: Einen Termin absagen oder verschieben  
   Purpose: Tell someone politely that you cannot keep an appointment and ask for a new one.  
   Persian: مؤدبانه خبر بدهید که نمی‌توانید سر قرار بیایید و قرار تازه‌ای بخواهید.  
   Simple German: Höflich sagen, dass man zu einem Termin nicht kommen kann, und um einen neuen Termin bitten.  
   Serves: Schreiben Aufgabe 3

### B1 · Planning something together

Persian: برنامه‌ریزی با هم  
Simple German: Gemeinsam etwas planen  
Position: after the grammar chapter B1.12 "Modal verbs and Konjunktiv II". Planning runs on the Konjunktiv II (Wir könnten …, Wie wäre es, wenn …?) and on the infinitive with zu of B1.11 (Hast du Lust, … zu …?).  
4 nodes:

1. **Starting, moving on and ending a conversation** (`phrases-leading-conversation`)  
   Persian: شروع، ادامه و پایان دادن به گفت‌وگو · Simple German: Ein Gespräch beginnen, weiterführen und beenden  
   Purpose: Open a planning talk, go on to the next point and close it with a result.  
   Persian: گفت‌وگوی برنامه‌ریزی را شروع کنید، به نکتهٔ بعدی بروید و آن را با یک نتیجه تمام کنید.  
   Simple German: Ein Planungsgespräch anfangen, zum nächsten Punkt gehen und mit einem Ergebnis beenden.  
   Serves: Sprechen Teil 1

2. **Asking what your partner thinks** (`phrases-asking-opinion`)  
   Persian: پرسیدن نظر طرف مقابل · Simple German: Den Partner nach seiner Meinung fragen  
   Purpose: Bring your partner into the talk: ask for their opinion, their ideas and their agreement.  
   Persian: طرف مقابل را وارد گفت‌وگو کنید: نظر، ایده‌ها و موافقتش را بپرسید.  
   Simple German: Den Partner ins Gespräch holen: nach seiner Meinung, seinen Ideen und seiner Zustimmung fragen.  
   Serves: Sprechen Teil 1

3. **Reacting to a suggestion** (`phrases-reacting-to-suggestions`)  
   Persian: واکنش به پیشنهاد · Simple German: Auf einen Vorschlag reagieren  
   Purpose: Accept a suggestion, turn it down with a reason, or answer with a suggestion of your own.  
   Persian: پیشنهادی را بپذیرید، با ذکر دلیل رد کنید یا با پیشنهاد خودتان جواب بدهید.  
   Simple German: Einen Vorschlag annehmen, mit einem Grund ablehnen oder selbst etwas anderes vorschlagen.  
   Serves: Sprechen Teil 1

4. **Deciding who does what** (`phrases-dividing-tasks`)  
   Persian: تقسیم کارها: چه کسی چه کار می‌کند · Simple German: Entscheiden, wer was macht  
   Purpose: Share out the tasks, offer to do something yourself and sum up what you have decided.  
   Persian: کارها را تقسیم کنید، انجام کاری را خودتان به عهده بگیرید و تصمیم‌ها را جمع‌بندی کنید.  
   Simple German: Aufgaben verteilen, selbst etwas übernehmen und zusammenfassen, was man beschlossen hat.  
   Serves: Sprechen Teil 1

### B1 · Presenting a topic and talking about it

Persian: ارائهٔ یک موضوع و گفت‌وگو دربارهٔ آن  
Simple German: Ein Thema präsentieren und darüber sprechen  
Position: after the last grammar chapter, B1.14, and directly before the exam parts. The presentation uses everything before it, and it is the largest speaking task of the exam (40 of 100 points).  
6 nodes:

1. **Opening a presentation** (`phrases-presentation-opening`)  
   Persian: شروع ارائه · Simple German: Eine Präsentation beginnen  
   Purpose: Name your topic and say which parts your presentation has.  
   Persian: موضوعتان را بگویید و بگویید ارائهٔ شما چه بخش‌هایی دارد.  
   Simple German: Das Thema nennen und sagen, welche Teile die Präsentation hat.  
   Serves: Sprechen Teil 2

2. **Your own experience and your home country** (`phrases-own-experience-home-country`)  
   Persian: تجربهٔ شخصی و کشور خودتان · Simple German: Eigene Erfahrungen und das Heimatland  
   Purpose: Say what the topic has to do with your own life, and what the situation is like in your home country.  
   Persian: بگویید موضوع چه ربطی به زندگی خودتان دارد و وضعیت در کشور خودتان چگونه است.  
   Simple German: Sagen, was das Thema mit dem eigenen Leben zu tun hat und wie die Situation im Heimatland ist.  
   Serves: Sprechen Teil 2

3. **Moving to the next point and closing a presentation** (`phrases-presentation-moving-closing`)  
   Persian: رفتن به نکتهٔ بعدی و پایان دادن به ارائه · Simple German: Zum nächsten Punkt kommen und die Präsentation beenden  
   Purpose: Lead your listeners from one part to the next, end the presentation and thank them.  
   Persian: شنوندگان را از بخشی به بخش بعد ببرید، ارائه را تمام کنید و از آن‌ها تشکر کنید.  
   Simple German: Die Zuhörer von einem Teil zum nächsten führen, die Präsentation beenden und sich bedanken.  
   Serves: Sprechen Teil 2

4. **Giving feedback on a presentation** (`phrases-giving-feedback`)  
   Persian: بازخورد دادن به یک ارائه · Simple German: Rückmeldung zu einer Präsentation geben  
   Purpose: Say what you liked about a presentation and what was new or interesting for you.  
   Persian: بگویید از چه چیزِ ارائه خوشتان آمد و چه چیزی برایتان تازه یا جالب بود.  
   Simple German: Sagen, was einem an einer Präsentation gefallen hat und was neu oder interessant war.  
   Serves: Sprechen Teil 3

5. **Asking a question about a presentation** (`phrases-asking-about-presentation`)  
   Persian: پرسیدن سؤال دربارهٔ یک ارائه · Simple German: Eine Frage zu einer Präsentation stellen  
   Purpose: Lead into a question and ask the speaker for more detail or for their opinion.  
   Persian: مقدمه‌ای برای سؤالتان بگویید و از ارائه‌دهنده جزئیات بیشتر یا نظرش را بپرسید.  
   Simple German: Eine Frage einleiten und die Person nach mehr Informationen oder nach ihrer Meinung fragen.  
   Serves: Sprechen Teil 3

6. **Reacting to feedback and answering questions** (`phrases-answering-questions`)  
   Persian: واکنش به بازخورد و جواب دادن به سؤال‌ها · Simple German: Auf Rückmeldung reagieren und Fragen beantworten  
   Purpose: Thank for feedback, answer a question, and win time when you need to think.  
   Persian: برای بازخورد تشکر کنید، به سؤال جواب بدهید و وقتی باید فکر کنید کمی وقت بخرید.  
   Simple German: Sich für die Rückmeldung bedanken, eine Frage beantworten und Zeit gewinnen, wenn man nachdenken muss.  
   Serves: Sprechen Teil 3

## The exam-part nodes

15 nodes in 4 chapters, all in B1. They are the last four chapters of the tree, in the order of the exam. The line under each title says what the part is; it is here to help you check the list and is not text of the app.

### B1 · The exam: reading (Lesen)

Persian: آزمون: خواندن (Lesen)  
Simple German: Die Prüfung: Lesen  
5 nodes:

1. **Lesen Teil 1: a blog post or e-mail, right or wrong** (`exam-lesen-1`)  
   Persian: Lesen Teil 1: متن وبلاگ یا ایمیل، درست یا غلط  
   Simple German: Lesen Teil 1: Blog oder E-Mail, richtig oder falsch  
   One longer personal text. 6 statements: richtig or falsch.

2. **Lesen Teil 2: two newspaper texts, choose a, b or c** (`exam-lesen-2`)  
   Persian: Lesen Teil 2: دو متن روزنامه، پرسش چندگزینه‌ای  
   Simple German: Lesen Teil 2: zwei Zeitungstexte, Antwort a, b oder c  
   Two press texts. 6 questions with three answers to choose from.

3. **Lesen Teil 3: the right advertisement for each situation** (`exam-lesen-3`)  
   Persian: Lesen Teil 3: آگهی مناسب برای هر موقعیت  
   Simple German: Lesen Teil 3: die passende Anzeige für jede Situation  
   Ten short advertisements and 7 situations to match; one situation has no advertisement.

4. **Lesen Teil 4: readers' comments, for or against** (`exam-lesen-4`)  
   Persian: Lesen Teil 4: نظر خوانندگان، موافق یا مخالف  
   Simple German: Lesen Teil 4: Leserkommentare, dafür oder dagegen  
   Seven short comments on one question. For each: is the writer for or against?

5. **Lesen Teil 5: rules and instructions** (`exam-lesen-5`)  
   Persian: Lesen Teil 5: قوانین و دستورالعمل‌ها  
   Simple German: Lesen Teil 5: Regeln und Anweisungen  
   One text of rules, such as house rules. 4 questions with three answers to choose from.

### B1 · The exam: listening (Hören)

Persian: آزمون: شنیدن (Hören)  
Simple German: Die Prüfung: Hören  
4 nodes:

1. **Hören Teil 1: five short messages and announcements** (`exam-hoeren-1`)  
   Persian: Hören Teil 1: پنج پیام و اطلاعیهٔ کوتاه  
   Simple German: Hören Teil 1: fünf kurze Nachrichten und Durchsagen  
   Five short texts, each heard twice. 10 items: for each text one richtig or falsch and one choice of three.

2. **Hören Teil 2: a guided tour or a short talk** (`exam-hoeren-2`)  
   Persian: Hören Teil 2: بازدید با راهنما یا سخنرانی کوتاه  
   Simple German: Hören Teil 2: eine Führung oder ein kurzer Vortrag  
   One speaker talks to a group, heard once. 5 questions with three answers to choose from.

3. **Hören Teil 3: a conversation between two people** (`exam-hoeren-3`)  
   Persian: Hören Teil 3: گفت‌وگوی دو نفر  
   Simple German: Hören Teil 3: ein Gespräch zwischen zwei Personen  
   One informal conversation, heard once. 7 statements: richtig or falsch.

4. **Hören Teil 4: a radio discussion, who says what?** (`exam-hoeren-4`)  
   Persian: Hören Teil 4: بحث رادیویی، چه کسی چه می‌گوید؟  
   Simple German: Hören Teil 4: eine Diskussion im Radio, wer sagt was?  
   A moderator and two guests, heard twice. 8 statements: which of the three says it?

### B1 · The exam: writing (Schreiben)

Persian: آزمون: نوشتن (Schreiben)  
Simple German: Die Prüfung: Schreiben  
3 nodes:

1. **Schreiben Aufgabe 1: an e-mail to a friend** (`exam-schreiben-1`)  
   Persian: Schreiben Aufgabe 1: ایمیل به یک دوست  
   Simple German: Schreiben Aufgabe 1: eine E-Mail an einen Freund oder eine Freundin  
   An informal e-mail of about 80 words on three given points. 40 of the 100 points.

2. **Schreiben Aufgabe 2: your opinion in a forum post** (`exam-schreiben-2`)  
   Persian: Schreiben Aufgabe 2: نظر شما در یک انجمن اینترنتی  
   Simple German: Schreiben Aufgabe 2: die eigene Meinung in einem Forum  
   A post of about 80 words with your own opinion on a topic. 40 of the 100 points.

3. **Schreiben Aufgabe 3: a short semi-formal e-mail** (`exam-schreiben-3`)  
   Persian: Schreiben Aufgabe 3: ایمیل کوتاه نیمه‌رسمی  
   Simple German: Schreiben Aufgabe 3: eine kurze halbformelle E-Mail  
   An e-mail of about 40 words to a person you address with Sie, for example to apologise. 20 of the 100 points.

### B1 · The exam: speaking (Sprechen)

Persian: آزمون: صحبت کردن (Sprechen)  
Simple German: Die Prüfung: Sprechen  
3 nodes:

1. **Sprechen Teil 1: planning something together** (`exam-sprechen-1`)  
   Persian: Sprechen Teil 1: برنامه‌ریزی مشترک  
   Simple German: Sprechen Teil 1: gemeinsam etwas planen  
   You and a partner plan something along four given points. 28 of the 100 points.

2. **Sprechen Teil 2: presenting a topic** (`exam-sprechen-2`)  
   Persian: Sprechen Teil 2: ارائهٔ یک موضوع  
   Simple German: Sprechen Teil 2: ein Thema präsentieren  
   A short presentation that follows five slides. 40 of the 100 points.

3. **Sprechen Teil 3: feedback and questions after a presentation** (`exam-sprechen-3`)  
   Persian: Sprechen Teil 3: بازخورد و پرسش پس از ارائه  
   Simple German: Sprechen Teil 3: Rückmeldung und Fragen nach einer Präsentation  
   You give feedback on your partner's presentation and ask a question; you answer questions on yours. 16 of the 100 points.

## The same list, by exam task

For each writing and speaking task: the phrase nodes that prepare it, in the order of the tree.

- **Schreiben Aufgabe 1** (11 nodes): Greeting and signing off in an e-mail to a friend; Thanking and reacting to news; Inviting, accepting and declining; Making a suggestion; Giving advice and recommending; Agreeing on a time and a place; Apologising and saying why; Giving reasons and examples; First and last sentences of an e-mail; Telling what happened and how it was; Ordering and linking your points
- **Schreiben Aufgabe 2** (7 nodes): Giving your opinion; Agreeing; Disagreeing politely; Giving reasons and examples; Advantages and disadvantages; Starting and ending a forum post; Ordering and linking your points
- **Schreiben Aufgabe 3** (8 nodes): Greeting and signing off in a formal e-mail; Thanking and reacting to news; Inviting, accepting and declining; Agreeing on a time and a place; Apologising and saying why; Asking politely for help or information; First and last sentences of an e-mail; Cancelling or moving an appointment
- **Sprechen Teil 1** (10 nodes): Making a suggestion; Giving advice and recommending; Agreeing on a time and a place; Asking again when you did not understand; Agreeing; Disagreeing politely; Starting, moving on and ending a conversation; Asking what your partner thinks; Reacting to a suggestion; Deciding who does what
- **Sprechen Teil 2** (8 nodes): Giving your opinion; Giving reasons and examples; Advantages and disadvantages; Telling what happened and how it was; Ordering and linking your points; Opening a presentation; Your own experience and your home country; Moving to the next point and closing a presentation
- **Sprechen Teil 3** (4 nodes): Asking again when you did not understand; Giving feedback on a presentation; Asking a question about a presentation; Reacting to feedback and answering questions

## Judgment calls

Each of these is a decision that the spec does not make. Tell me which ones to change.

1. **Ten phrase nodes are in A2, not in B1.** Greetings in an e-mail, thanking, inviting, suggesting, giving advice, fixing a time, apologising, polite requests and asking again are A2 language, and the A2 grammar chapters teach what they need (könnte, sollte, weil). In A2 you can start to write short e-mails long before the exam chapters. The other choice is to put all 30 nodes in B1, as pure exam preparation; then A2 has grammar and vocabulary only.

2. **Phrase chapters stand among the grammar chapters, not at the end of the level.** Each one follows the grammar chapter it builds on; the reason is given under each chapter. So the route changes between grammar and phrases, and you use new grammar soon after you learn it. The other choice is to put the phrase chapters of a level after all its grammar; then the last weeks before the exam are phrases and exam parts only. Only "Presenting a topic and talking about it" stands at the end now, directly before the exam parts.

3. **The exam parts are the last four chapters, one for each module, in the order of the exam**: Lesen, Hören, Schreiben, Sprechen. The spec puts the exam parts after all B1 content. You can still open them at any time; nothing in the tree is locked.

4. **Phrase nodes name writing and speaking tasks only.** No phrase node says it serves a Lesen or Hören part. Phrases of opinion do help you to read Lesen Teil 4 (for or against?) and to follow Hören Teil 4 (who says what?), but there you only have to recognise them. If you want that link shown too, I add Lesen Teil 4 and Hören Teil 4 to "Giving your opinion", "Agreeing" and "Disagreeing politely".

5. **Chapters follow what you do, not the exam tasks.** A chapter for each exam task ("Phrases for Schreiben Aufgabe 1", …) does not work well, because most purposes serve two or three tasks: "Giving reasons and examples" serves three. So the chapters are "Opinions and discussion", "Planning something together" and so on, and each node says which tasks it serves. Two chapters are close to one task each: "Planning something together" is Sprechen Teil 1, "Presenting a topic and talking about it" is Sprechen Teil 2 and Teil 3.

6. **Purposes that are split.**
   - "Agreeing" and "Disagreeing politely" are two nodes, as the spec names them. Each is small; they could be one node.
   - "Reacting to a suggestion" (Sprechen Teil 1: Gute Idee! / Das geht leider nicht, weil …) is apart from "Agreeing" and "Disagreeing politely", which are about opinions (Das sehe ich auch so). German uses different phrases for the two.
   - An e-mail has two nodes for its frame at two levels: the greeting and the closing formula in A2 (one node for a friend, one for a formal e-mail), and the first and last sentences in B1 ("First and last sentences of an e-mail"). The spec's "opening and closing an e-mail" is these three nodes.
   - "Apologising and saying why" (A2) and "Cancelling or moving an appointment" (B1) are both for Schreiben Aufgabe 3. The first is the apology itself, the second is the longer polite e-mail around an appointment.

7. **Purposes that are joined.**
   - "Your own experience and your home country" is one node for slides 2 and 3 of the presentation.
   - Slide 4 of the presentation (advantages, disadvantages, your opinion) has no node of its own. It uses "Advantages and disadvantages" and "Giving your opinion" from the chapter "Opinions and discussion".
   - "Thanking and reacting to news" holds thanking, congratulating, and saying that you are glad or sorry.

8. **Purposes I added that the spec does not name**: thanking, inviting, giving advice, fixing a time and place, polite requests, asking again when you did not understand, reasons and examples, advantages and disadvantages, telling what happened, the forum post, ordering and linking, cancelling an appointment, and the nodes for planning and for the presentation. Each one answers something a task asks for or a marker looks at. "Asking again when you did not understand" answers no task directly; it is there because in the speaking exam you need it when you do not understand your partner or the examiner.

9. **Purposes I left out.** A complaint and a description of a picture or a chart are not asked in the official Goethe B1 model exam, so they have no node. Small talk for the short chat before the speaking exam has no node either, because that chat is not marked.

10. **How big a node is.** I planned each node for about 8 to 15 phrases, enough for a test of 15 questions or more. If a node turns out too thin or too full when its phrases are written (ticket #20), it may be joined or split then, and you will be asked again.

11. **Titles of the exam parts.** Each title starts with the official German name, as it stands on the exam sheets ("Lesen Teil 1", "Schreiben Aufgabe 2"), in all three languages, and then says in a few words what the part is. The writing module counts "Aufgabe 1 to 3"; the other modules count "Teil". The official name of Sprechen Teil 3 is "Über ein Thema sprechen"; the title says what happens there: feedback and questions after a presentation.

12. **"Semi-formal" for Schreiben Aufgabe 3.** The exam does not give this task a name for its tone. In the official model exam it is an e-mail to a course teacher, a person you address with Sie. I call it "semi-formal".

13. **Pronunciation has no node.** 16 of the 100 Sprechen points are for pronunciation, marked once across all three parts. It is not a part of the exam, so there are exactly 15 exam-part nodes, as the spec says. Where pronunciation is explained is decided with the speaking nodes (ticket #23).

14. **The short description under each exam part** in this document comes from the official model exam for adults and the exam rules: the numbers of items, how often a recording is played, and the points. These lines are not text of the app; the exam-part pages are written and checked in their own tickets.

15. **Prerequisites.** No phrase or exam-part node has prerequisites yet. They are set when a node's content is written, because only then is it known which grammar its phrases use. Prerequisites only advise; they never lock a node.

16. **Identifiers.** A phrase node's identifier is `phrases-` and a short English name, an exam part's is `exam-`, the module and the number (`exam-hoeren-3`). You never see them in the app, only in a page's address. They should not change after approval, because your progress is stored under them.
