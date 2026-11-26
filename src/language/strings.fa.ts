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
  done: 'تمام‌شده',

  allTopics: 'همهٔ موضوع‌ها',
  rule: 'قاعده',
  table: 'جدول',
  examples: 'مثال‌ها',
  commonMistakes: 'اشتباه‌های رایج',
  wrong: 'غلط',
  right: 'درست',
  test: 'آزمون',
  takeTheTest: 'شروع آزمون',
  comingSoonPage: 'این موضوع هنوز نوشته نشده است. وقتی آماده شود، همین‌جا می‌آید.',
  notFoundTitle: 'موضوع پیدا نشد',
  notFoundText: 'در این نشانی موضوعی وجود ندارد.',

  backToTopic: 'بازگشت به موضوع',
  testTitle: (title) => `آزمون: ${title}`,
  questionOf: (place, total) => `سؤال ${digits.format(place)} از ${digits.format(total)}`,
  questionNumber: (place) => `سؤال ${digits.format(place)}`,
  instructions: {
    'multiple-choice': 'پاسخ درست را انتخاب کنید.',
    'gap-fill': 'واژه‌ای را انتخاب کنید که در جای خالی درست است.',
    'true-false': 'آیا این جمله آلمانیِ درستی است؟',
  },
  gap: 'جای خالی',
  sentenceCorrect: 'درست',
  sentenceNotCorrect: 'نادرست',
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
  cancel: 'انصراف',

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
}
