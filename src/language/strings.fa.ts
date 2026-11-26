import type { Strings } from './strings.ts'

/** Numbers in Persian text use Persian digits. */
const digits = new Intl.NumberFormat('fa-IR', { useGrouping: false })

/**
 * Persian. "Test" (of one topic) is «آزمون»; "exam" (the Goethe exam) is
 * «امتحان». A draft until a native reader has reviewed it.
 */
export const fa: Strings = {
  appName: 'deutsch-tree',
  language: 'زبان',
  number: (value) => digits.format(value),
  loading: 'در حال بارگذاری…',
  loadFailed: 'این صفحه بارگذاری نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.',
  tryAgain: 'تلاش دوباره',

  treeTitle: 'آلمانی از صفر تا B1',
  treeIntro:
    'هر چه برای امتحان B1 گوته لازم دارید، به شکل درختی از موضوع‌های کوچک. هر موضوع یک توضیح کوتاه و یک آزمون دارد.',
  levels: 'سطح‌ها',
  routeStart: 'شروع',
  routeExam: 'امتحان',
  levelNames: { A1: 'مبتدی', A2: 'پایه', B1: 'متوسط' },
  topicCount: (count) => `${digits.format(count)} موضوع`,
  kinds: {
    grammar: 'دستور زبان',
    vocabulary: 'واژگان',
    phrases: 'عبارت‌ها',
    'exam-part': 'بخش‌های امتحان',
  },
  start: 'شروع',
  comingSoon: 'به‌زودی',
  recogniseOnly: 'فقط شناختن',
  recogniseOnlyNote: 'کافی است این را هنگام خواندن یا شنیدن بفهمید. لازم نیست خودتان آن را به کار ببرید.',
  recogniseOnlyTest: 'این آزمون فقط می‌پرسد که آیا این ساخت را می‌فهمید. هیچ‌وقت لازم نیست خودتان آن را بنویسید.',
  done: 'تمام‌شده',
  continueTopic: 'ادامه',

  howItWorks: 'روش کار',
  firstSteps: {
    pick: 'یک موضوع انتخاب کنید.',
    read: 'آن را بخوانید، یا مستقیم آزمون بدهید.',
    pass: (percent) => `با ${digits.format(percent)}٪ پاسخ درست، موضوع تمام‌شده است.`,
  },
  gotIt: 'فهمیدم',
  yourNextTopic: 'موضوع بعدی شما',
  nothingNext:
    'همهٔ موضوع‌هایی را که تا امروز نوشته شده‌اند تمام کرده‌اید. موضوع‌های تازه، وقتی آماده شوند، در درخت می‌آیند.',
  youAreHere: 'شما اینجایید',
  kindsOfTopic: 'نوع موضوع‌ها',
  allKinds: 'همهٔ نوع‌ها',
  doneCount: (done) => `${digits.format(done)} تمام‌شده`,
  leftCount: (left) => `${digits.format(left)} مانده`,
  countsSummary: (done, left, comingSoon) =>
    comingSoon === 0
      ? `${digits.format(done)} تمام‌شده · ${digits.format(left)} مانده`
      : `${digits.format(done)} تمام‌شده · ${digits.format(left)} مانده، ${digits.format(comingSoon)} تای آن‌ها به‌زودی`,
  doneOfTotal: (done, total) => `${digits.format(done)} از ${digits.format(total)} تمام‌شده`,
  comingSoonCount: (count) => `${digits.format(count)} به‌زودی`,
  noTopicsHere: 'این سطح موضوعی از این نوع ندارد.',

  buildsOn: 'پیش‌نیازها',
  buildsOnNote: 'هیچ موضوعی قفل نیست. اگر این موضوع سخت بود، این موضوع‌ها کمک می‌کنند.',
  unmark: 'برداشتن علامت «تمام‌شده»',
  unmarkQuestion: 'علامت «تمام‌شده» از این موضوع برداشته شود؟ تا وقتی دوباره در آن قبول نشوید، تمام‌شده نیست.',
  unmarkConfirm: 'بله، بردار',
  keepDone: 'تمام‌شده بماند',
  unmarked: 'این موضوع دیگر تمام‌شده نیست.',

  allTopics: 'همهٔ موضوع‌ها',
  rule: 'قاعده',
  table: 'جدول',
  diagram: 'نمودار',
  examples: 'مثال‌ها',
  listen: 'گوش دادن',
  stopListening: 'توقف',
  audioFailed: 'صدا پخش نشد.',
  // The names in Latin letters read left to right; the hyphen of Hi-Fi does not break the line.
  voiceCredit: `صدای آلمانی: صداهای ${german('Thorsten')} و ${german('Kerstin')} از ${german('Piper')}. صدای ${german('Kerstin')} بر پایهٔ ${german('Hi\u2011Fi TTS')} از ${german('NVIDIA')} با پروانهٔ ${german('CC BY 4.0')} و با خوانش ${german('Cori Samuel')} ساخته شده است.`,
  commonMistakes: 'اشتباه‌های رایج',
  wrong: 'غلط',
  right: 'درست',
  phrasesPurpose: 'این عبارت‌ها برای چیست',
  phraseList: 'عبارت‌ها',
  phraseExample: 'مثال',
  phraseUsefulFor: 'کاربرد در امتحان',
  test: 'آزمون',
  takeTheTest: 'شروع آزمون',
  comingSoonPage: 'این موضوع هنوز نوشته نشده است. وقتی آماده شود، همین‌جا می‌آید.',
  ankiTitle: 'کارت‌های Anki',
  ankiText:
    'واژه‌ها را به صورت یک فایل برای Anki ذخیره کنید. Anki یک برنامهٔ فلش‌کارت است که هر واژه را درست پیش از آن‌که فراموشش کنید دوباره نشان می‌دهد. در Anki گزینهٔ File و سپس Import را بزنید و فایل را باز کنید. اگر بعداً فایل تازه‌تری وارد کنید، Anki کارت‌هایی را که دارید به‌روز می‌کند و آن‌ها را دوباره اضافه نمی‌کند. به Anki نسخهٔ 2.1.54 یا جدیدتر نیاز دارید.',
  ankiThisTopic: 'دانلود همین موضوع',
  ankiStartedTopics: 'دانلود همهٔ موضوع‌های شروع‌شده',
  ankiStartedCount: (count) => `${digits.format(count)} موضوع واژگان شروع‌شده`,
  ankiNoneStarted:
    'هنوز هیچ موضوع واژگانی را شروع نکرده‌اید. یک موضوع وقتی شروع‌شده به حساب می‌آید که آزمون آن را داده باشید.',
  ankiSavedAs: 'کارت‌ها در این فایل هستند:',
  ankiLoadFailed: 'واژه‌ها بارگذاری نشدند. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.',
  words: 'واژه‌ها',
  plural: 'جمع',
  pluralOnly: 'فقط جمع',
  noPlural: 'بدون جمع',
  wordClasses: {
    noun: 'اسم',
    verb: 'فعل',
    adjective: 'صفت',
    adverb: 'قید',
    pronoun: 'ضمیر',
    article: 'حرف تعریف',
    preposition: 'حرف اضافه',
    conjunction: 'حرف ربط',
    numeral: 'عدد',
    particle: 'ادات',
    interjection: 'شبه‌جمله',
    phrase: 'عبارت',
    abbreviation: 'مخفف',
    affix: 'جزء واژه',
  },
  notFoundTitle: 'موضوع پیدا نشد',
  notFoundText: 'در این نشانی موضوعی وجود ندارد.',

  examPartNumber: (part) => `بخش ${digits.format(part)}`,
  examTask: 'این بخش چه می‌خواهد',
  examScoring: 'نمره چطور حساب می‌شود',
  examApproach: 'چطور این بخش را حل کنید',
  practice: 'تمرین',
  startPractice: 'شروع تمرین',

  practiceTitle: (title) => `تمرین: ${title}`,
  practiceText: 'متن',
  questions: 'سؤال‌ها',
  examAnswers: { richtig: 'Richtig', falsch: 'Falsch' },
  answeredOf: (answered, total) => `${digits.format(answered)} از ${digits.format(total)} پاسخ داده شده`,
  yourAnswers: 'پاسخ‌های شما',
  answerIsRight: 'پاسخ شما درست است',
  answerIsWrong: 'پاسخ شما درست نیست',
  practiceRetry: 'هر چند بار که بخواهید می‌توانید دوباره تمرین کنید.',

  backToTopic: 'بازگشت به موضوع',
  testTitle: (title) => `آزمون: ${title}`,
  questionOf: (place, total) => `سؤال ${digits.format(place)} از ${digits.format(total)}`,
  questionNumber: (place) => `سؤال ${digits.format(place)}`,
  instructions: {
    'multiple-choice': 'پاسخ درست را انتخاب کنید.',
    'gap-fill': 'واژه‌ای را انتخاب کنید که در جای خالی درست است.',
    'true-false': 'آیا این جمله آلمانیِ درستی است؟',
    'find-error': 'یک واژه در این جمله نادرست است. آن را انتخاب کنید.',
    'word-order': 'جمله را بسازید: واژه‌ها را به ترتیب درست انتخاب کنید.',
    matching: 'برای هر واژه، جفت مناسب را انتخاب کنید.',
    'typed-answer': 'پاسخ را تایپ کنید.',
    'typed-gap-fill': 'واژه‌ای را تایپ کنید که در جای خالی درست است.',
    'meaning-of-word': 'این واژه چه معنایی دارد؟',
    'word-for-meaning': 'واژهٔ آلمانی را تایپ کنید. اسم را با حرف تعریفش بنویسید.',
    'richtig-falsch': 'این جمله طبق متن درست است یا غلط؟',
  },
  gap: 'جای خالی',
  yourSentence: 'جملهٔ شما',
  wordsToPlace: 'واژه‌ها',
  choosePartner: 'انتخاب کنید…',
  sentenceCorrect: 'درست',
  sentenceNotCorrect: 'نادرست',
  germanLetters: 'حروف آلمانی',
  next: 'بعدی',
  checkAnswers: 'بررسی پاسخ‌ها',
  reportProblem: 'گزارش مشکل',

  passed: 'قبول شدید',
  notPassed: 'هنوز قبول نشده‌اید',
  ofTotalRight: (total) => `از ${digits.format(total)} درست`,
  neededToPass: (passMark, total) =>
    `برای قبولی باید ${digits.format(passMark)} پاسخ از ${digits.format(total)} درست باشد.`,
  topicNowDone: 'این موضوع حالا تمام‌شده است.',
  topicStaysDone: 'این موضوع از قبل تمام‌شده بود و تمام‌شده می‌ماند.',
  retryAnyTime: 'هر چند بار که بخواهید می‌توانید دوباره امتحان کنید. هر آزمون سؤال‌های تازه‌ای می‌آورد.',
  wrongAnswers: 'پاسخ‌های نادرست',
  yourAnswer: 'پاسخ شما',
  rightAnswer: 'پاسخ درست',

  backupLink: 'پشتیبان‌گیری از پیشرفت',
  backupTitle: 'از پیشرفت خود پشتیبان بگیرید',
  backupWhy:
    'پیشرفت شما فقط در همین مرورگر و روی همین دستگاه نگه داشته می‌شود. اگر داده‌های مرورگر پاک شود، پیشرفت هم از بین می‌رود. یک فایل آن را امن نگه می‌دارد و به دستگاه دیگر هم می‌برد.',
  // The calendar of the date in the file's name, so that the two agree.
  date: (date) => new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { dateStyle: 'long' }).format(date),
  topicsDone: (count) => `${digits.format(count)} موضوع تمام‌شده`,
  onThisDevice: 'روی این دستگاه',
  inTheFile: 'در فایل',
  exportTitle: 'خروجی گرفتن',
  exportText: 'یک فایل با پیشرفت شما روی همین دستگاه ذخیره می‌شود. چیزی به جایی فرستاده نمی‌شود.',
  exportProgress: 'خروجی گرفتن از پیشرفت',
  exportedAs: 'پیشرفت شما حالا در این فایل است:',
  keepFileSafe: 'فایل را در جای امنی نگه دارید.',
  importTitle: 'وارد کردن',
  importText:
    'پیشرفت را از فایلی برمی‌گرداند که در همین دستگاه یا دستگاه دیگری خروجی گرفته‌اید. فایل جای پیشرفتِ روی این دستگاه را می‌گیرد.',
  importFile: 'وارد کردن فایل پیشرفت',
  importReplaceTitle: 'پیشرفتِ روی این دستگاه جایگزین شود؟',
  importReplaceText: 'فایل جای همه‌چیزِ روی این دستگاه را می‌گیرد. این کار برگشت‌پذیر نیست.',
  exportedOn: (date) => `خروجی گرفته‌شده در ${date}`,
  replaceProgress: 'جایگزین شود',
  cancel: 'انصراف',
  imported: 'پیشرفت وارد شد.',
  importNotProgress: 'این فایل، فایل پیشرفت deutsch-tree نیست یا خراب شده است. چیزی تغییر نکرد.',
  importNewerVersion:
    'این فایل با نسخهٔ تازه‌تری از deutsch-tree ذخیره شده است. این صفحه را دوباره بارگذاری کنید تا تازه‌ترین نسخه بیاید، بعد فایل را دوباره وارد کنید. چیزی تغییر نکرد.',
  savedByNewerVersion:
    'پیشرفتِ این مرورگر با نسخهٔ تازه‌تری از deutsch-tree ذخیره شده است. صفحه را دوباره بارگذاری کنید تا آن نسخه بیاید. تا آن زمان پیشرفت شما نشان داده نمی‌شود و کاری که اینجا می‌کنید ذخیره نمی‌شود.',
  reload: 'بارگذاری دوباره',
  milestoneLevel: (level) => `همهٔ موضوع‌های ${level} را که تا امروز آماده شده‌اند تمام کرده‌اید.`,
  milestoneTopics: (count) => `${digits.format(count)} موضوع را تمام کرده‌اید.`,
  suggestBackup: 'پیشرفت شما فقط در همین مرورگر نگه داشته می‌شود. یک نسخه در فایل آن را امن نگه می‌دارد.',
  notNow: 'حالا نه',

  checkpoint: 'آزمون مرور',
  checkpointTitle: (level) => `آزمون مرور ${level}`,
  checkpointIntro:
    'آزمونی کوتاه با سؤال‌هایی از موضوع‌های این سطح. نشان می‌دهد چه چیزهایی را باید دوباره ببینید. در موضوع‌های شما چیزی را تغییر نمی‌دهد.',
  startCheckpoint: 'شروع آزمون مرور',
  checkpointNothingYet: 'هنوز هیچ موضوعی از این سطح آزمون ندارد. آزمون مرور با اولین موضوع می‌آید.',
  checkpointSize: (questions, topics) => `${digits.format(questions)} سؤال از ${digits.format(topics)} موضوع`,
  checkpointResult: 'نتیجهٔ آزمون مرور',
  checkpointAllRight: 'همه درست بود. چیزی برای مرور دوباره نیست.',
  checkpointSomeWrong: 'بعضی پاسخ‌ها نادرست بود. بهتر است موضوع‌های زیر را دوباره ببینید.',
  checkpointChangesNothing: 'آزمون مرور فقط نشان می‌دهد کجا هستید. موضوع‌های شما همان‌طور که بودند می‌مانند.',
  topicsToRevisit: 'موضوع‌هایی برای مرور دوباره',
  wrongOfAsked: (wrong, asked) => `${digits.format(wrong)} نادرست از ${digits.format(asked)}`,

  acceptedWithNote: 'پذیرفته‌شده با یادداشت',
  exactSpelling: 'املای دقیق',
  answerNotes: {
    'umlaut-substitute': `پذیرفته شد. املای دقیق با ${german('ä')}، ${german('ö')}، ${german('ü')} یا ${german('ß')} است.`,
    capitalisation: 'پذیرفته شد. به حروف بزرگ و کوچک دقت کنید.',
  },

  // "Module" (Lesen, Hören, Schreiben, Sprechen) is «مهارت»; "mock exam" is «امتحان آزمایشی».
  readiness: 'آمادگی',
  readinessTitle: 'برای امتحان آماده‌اید؟',
  readinessRule: (score, exams) =>
    `وقتی در ${digits.format(exams)} امتحان آزمایشی رسمی، در هر مهارت ${digits.format(score)} یا بیشتر داشته باشید، آماده‌اید.`,
  ready: 'آماده‌اید',
  readyText: (score, exams) =>
    `شما در ${digits.format(exams)} امتحان آزمایشی رسمی، در هر مهارت ${digits.format(score)} یا بیشتر دارید. می‌توانید برای امتحان ثبت‌نام کنید.`,
  notReady: 'هنوز آماده نیستید',
  ofExamsAtTarget: (needed, score) =>
    `از ${digits.format(needed)} امتحان آزمایشی رسمی با ${digits.format(score)} یا بیشتر در هر مهارت`,
  whatIsMissing: 'چه چیزی مانده است',
  examsStillNeeded: (count, score) =>
    `${digits.format(count)} امتحان آزمایشی رسمی دیگر با ${digits.format(score)} یا بیشتر در هر مهارت`,
  moduleBelow: (module, score, target) => `${module}: ${digits.format(score)}، باید ${digits.format(target)} باشد.`,
  moduleNotRecorded: (module) => `${module}: ثبت نشده.`,
  examModules: {
    reading: 'خواندن',
    listening: 'شنیدن',
    writing: 'نوشتن',
    speaking: 'صحبت‌کردن',
  },

  examStopTitle: 'امتحان',
  examStopWarning: 'امتحان‌های آزمایشی رسمی را تا سنجش نهایی ندیده نگه دارید.',
  openReadiness: 'آمادگی و امتحان‌های آزمایشی رسمی',

  keepUnseenTitle: 'این امتحان‌ها را ندیده نگه دارید',
  keepUnseenText:
    'فقط چند امتحان آزمایشی رسمی وجود دارد و شما به دو تا از آن‌ها نیاز دارید. یک امتحان فقط بار اولی که آن را می‌بینید شما را می‌سنجد. تا وقتی موضوع‌ها و امتحان‌های آزمایشی این سایت را تمام نکرده‌اید، آن‌ها را باز نکنید، حتی برای یک نگاه.',
  keepUnseenThen: 'بعد هر امتحان را یک بار، با ساعت و مثل امتحان واقعی بدهید و نمره‌هایتان را همین‌جا ثبت کنید.',

  officialMockExams: 'امتحان‌های آزمایشی رسمی',
  officialMockExamsIntro:
    'این‌ها مجموعه‌های تمرینیِ خودِ مؤسسهٔ برگزارکنندهٔ امتحان هستند. این سایت فقط به آن‌ها لینک می‌دهد. هر لینک یک وب‌سایت دیگر را باز می‌کند.',
  spareSets: 'مجموعه‌های ذخیره',
  spareSetsIntro:
    'مجموعه‌هایی برای نوجوانان. شکل امتحان و نمره‌دهی مثل بزرگسالان است؛ موضوع‌ها از زندگی مدرسه می‌آیند. فقط وقتی از این‌ها استفاده کنید که یک مجموعهٔ بزرگسالان مصرف شده باشد.',
  examAudiences: { adults: 'بزرگسالان', youth: 'نوجوانان' },
  spareCounts: 'برای آمادگی مثل مجموعهٔ بزرگسالان حساب می‌شود.',
  doesNotCount: 'نمره‌های این مجموعه برای آمادگی حساب نمی‌شود.',

  examNotRecorded: 'هنوز نمره‌ای ثبت نشده',
  examAtTarget: (score) => `به هدف رسیدید: ${digits.format(score)} یا بیشتر در هر مهارت`,
  examBelowTarget: 'هنوز به هدف نرسیده‌اید',
  scoreNotRecorded: 'ثبت نشده',
  recordScores: 'ثبت نمره‌ها',
  changeScores: 'تغییر نمره‌ها',
  scoreHint: (maximum) =>
    `نمرهٔ هر مهارت از ${digits.format(maximum)}. تا وقتی مهارتی را انجام نداده‌اید، خانهٔ آن را خالی بگذارید.`,
  scoreInvalid: (maximum) => `نمره یک عدد صحیح از ${digits.format(0)} تا ${digits.format(maximum)} است.`,
  saveScores: 'ذخیرهٔ نمره‌ها',

  showExamLinks: 'نشان دادن لینک‌های این امتحان',
  hideExamLinks: 'پنهان کردن لینک‌ها',
  finalCheckQuestion: 'این آخرین سنجش شماست؟',
  finalCheckText:
    'شما فقط یک بار می‌توانید این امتحان را برای اولین بار ببینید. فقط وقتی آن را باز کنید که می‌خواهید آن را به‌عنوان سنجش نهایی بدهید.',
  finalCheckYes: 'بله، لینک‌ها را نشان بده',
  finalCheckNotYet: 'هنوز نه',
  examLinkKinds: {
    papers: 'برگه‌های امتحان (پی‌دی‌اف)',
    audio: 'فایل‌های شنیداری',
    online: 'نسخهٔ آنلاین',
  },
  candidatePagesOnly: (first, last) =>
    `فقط صفحه‌های ${digits.format(first)} تا ${digits.format(last)} را ببینید. در صفحه‌های بعد از آن پاسخ‌ها، متن فایل‌های شنیداری و نمونهٔ پاسخ آمده است.`,

  packsLink: 'کتاب‌های امتحان شما',
  packsTitle: 'کتاب‌های امتحان شما',
  packsIntro: 'امتحان‌های تمرینی از کتابی که دارید، با صفحه‌ها، فایل‌های شنیداری و پاسخ‌نامهٔ خود کتاب.',
  noPackTitle: 'هیچ کتاب امتحانی پیدا نشد',
  noPackSteps: [
    'کتاب امتحان‌های تمرینی‌ای را که دارید می‌توانید به‌صورت یک بستهٔ خصوصی اضافه کنید. این بسته یک بار از فایل‌های کتاب با دستور pnpm pack:build ساخته می‌شود.',
    'پوشهٔ بسته را در پوشه‌ای به نام «private» بگذارید. در پوشه‌ای که فایل‌های شروع در آن است، این پوشه داخل پوشهٔ «app» است. برنامه را با فایل شروع آن باز کنید و بعد دوباره این صفحه را باز کنید.',
    'بسته‌ها هرگز در وب‌سایت عمومی دیده نمی‌شوند. فقط برنامه روی رایانهٔ خود شما آن‌ها را پیدا می‌کند، پس کتاب پیش شما می‌ماند.',
  ],
  phoneTitle: 'روی گوشی یا تبلت',
  phoneIntro:
    'آن را به همان Wi-Fi این رایانه وصل کنید و این نشانی را در مرورگرش باز کنید. برنامه باید اینجا باز بماند.',
  phoneProgress:
    'گوشی پیشرفت جداگانهٔ خودش را نگه می‌دارد. برای بردن پیشرفت از یک دستگاه به دیگری، از «پشتیبان‌گیری از پیشرفت» استفاده کنید.',
  packUnreadable: (folder) => `بستهٔ داخل پوشهٔ «${folder}» خوانده نمی‌شود. آن را دوباره با pnpm pack:build بسازید.`,
  examCount: (count) => `${digits.format(count)} امتحان`,
  packExam: (number) => `امتحان ${digits.format(number)}`,
  moduleNotScored:
    'این مهارت با پاسخ‌نامه نمره نمی‌گیرد. تمرین‌های آن را روی همین صفحه‌ها انجام دهید؛ صفحهٔ آن بخش امتحان در درخت نشان می‌دهد چطور نمره بگیرید.',
  parts: 'بخش‌ها',
  packPart: (number) => `بخش ${digits.format(number)}`,
  bookPagesHeading: 'صفحه‌های کتاب',
  bookPage: (page) => `صفحهٔ ${digits.format(page)} کتاب`,
  bookPagesFailed: 'صفحه‌ها نشان داده نشد. شاید بسته خراب باشد؛ آن را دوباره با pnpm pack:build بسازید.',
  recording: 'فایل شنیداری',
  recordingOf: (place, count) => `فایل شنیداری ${digits.format(place)} از ${digits.format(count)}`,
  answerSheet: 'برگهٔ پاسخ',
  sheetItem: (number) => `سؤال ${digits.format(number)}`,
  partResult: (number) => `نتیجهٔ بخش ${digits.format(number)}`,
  rightOfTotal: (correct, total) => `${digits.format(correct)} از ${digits.format(total)} درست`,
  nextPart: 'بخش بعدی',
  answerAgain: 'پاسخ دوباره به این بخش',
  moduleResult: (module) => `${module}: نتیجهٔ شما`,
  partNotChecked: 'هنوز بررسی نشده',
  partRight: (correct, total) => `${digits.format(correct)} از ${digits.format(total)}`,
  moduleScoreLater: 'نمرهٔ این مهارت از ۱۰۰ وقتی نشان داده می‌شود که همهٔ بخش‌ها بررسی شده باشند.',
  answerKeyUnreadable:
    'پاسخ‌نامهٔ این بسته خوانده نمی‌شود، پس این بخش نمره نمی‌گیرد. بسته را دوباره با pnpm pack:build بسازید.',

  reference: 'مرجع',
  search: 'جست‌وجو',
  allGrammar: 'همهٔ دستور زبان',
  searchTitle: 'جست‌وجو در همهٔ موضوع‌ها',
  searchHint: `یک واژه به فارسی یا آلمانی بنویسید. اگر صفحه‌کلید شما ${german('ä, ö, ü, ß')} ندارد، ${german('ae, oe, ue, ss')} بنویسید.`,
  searchResults: (count) => `${digits.format(count)} موضوع پیدا شد`,
  searchNothing: 'موضوعی پیدا نشد. واژهٔ دیگری را امتحان کنید، یا واژه‌های کمتری بنویسید.',
  overviewTitle: 'همهٔ دستور زبان در یک نگاه',
  overviewIntro: 'همهٔ جدول‌های دستور زبان در یک صفحه. نام بالای هر جدول، موضوع آن را باز می‌کند.',
  overviewEmpty: 'هنوز هیچ جدول دستور زبانی نوشته نشده است.',

  task: 'تمرین',
  getYourScore: 'چطور نمره بگیرید',
  writingSteps: [
    'متن خود را برای این تمرین بنویسید، مثل روز امتحان: بدون فرهنگ لغت و بدون مترجم.',
    'پرامپت را کپی کنید و در یک دستیار هوش مصنوعی بچسبانید، مثلاً ChatGPT یا Claude یا Gemini. متن خود را زیر آن بگذارید و هر دو را بفرستید.',
    'دستیار با معیارهای رسمی امتحان به متن شما نمره می‌دهد. این نمره را در خانهٔ پایین بنویسید.',
  ],
  speakingSteps: [
    'پرامپت را کپی کنید و در یک دستیار هوش مصنوعی که می‌تواند حرف بزند بچسبانید، مثلاً ChatGPT یا Claude یا Gemini. آن را بفرستید.',
    'دستیار را روی حالت گفت‌وگوی صوتی بگذارید و بگویید «Hallo». دستیار مثل امتحان با شما آلمانی حرف می‌زند. حرف بزنید؛ تایپ نکنید.',
    'در پایان، دستیار با معیارهای رسمی امتحان به شما نمره می‌دهد. این نمره را در خانهٔ پایین بنویسید.',
  ],
  copyPrompt: 'کپی کردن پرامپت',
  promptCopied: 'کپی شد. حالا آن را در دستیار هوش مصنوعی بچسبانید.',
  promptNotCopied: 'مرورگر شما اجازهٔ کپی نداد. همهٔ پرامپت پایین را انتخاب کنید و خودتان کپی کنید.',
  readPrompt: 'خواندن پرامپت',
  thePrompt: 'پرامپت',
  promptNote:
    'پرامپت به انگلیسی و آلمانی است، چون دستیار این‌طور بهتر از آن پیروی می‌کند. پرامپت از دستیار می‌خواهد سخت‌گیرانه نمره بدهد و به فارسی به شما جواب بدهد. این برنامه چیزی به جایی نمی‌فرستد؛ فقط متن را کپی می‌کند.',
  pronunciationNote:
    '۱۶ نمره از ۱۰۰ نمره برای تلفظ است. دستیار تلفظ را فقط به‌طور تقریبی می‌تواند بسنجد، پس این بخش نمره را یک برآورد بدانید.',
  yourScore: 'نمرهٔ شما',
  noScoreYet: 'هنوز نمره‌ای ندارید.',
  scoreLabel: 'نمره‌ای که دستیار داد، از ۰ تا ۱۰۰',
  saveScore: 'ذخیرهٔ نمره',
  scoreNotValid: 'یک عدد صحیح از ۰ تا ۱۰۰ بنویسید.',
  ofTotal: (total) => `از ${digits.format(total)}`,
  scoreNeeded: (needed, total) =>
    `برای تمام کردن این موضوع باید ${digits.format(needed)} از ${digits.format(total)} بگیرید.`,
  scoreRetry: 'تمرین را دوباره انجام دهید و نمرهٔ تازه را وارد کنید. هر چند بار که بخواهید می‌توانید تلاش کنید.',
  scoresSoFar: 'نمره‌های شما تا حالا',
}

/**
 * A German letter inside a Persian string, kept apart from the Persian around
 * it by the Unicode marks U+2066 … U+2069, since a string cannot hold a <span>.
 */
function german(text: string): string {
  return `\u2066${text}\u2069`
}
