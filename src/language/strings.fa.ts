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
    'typed-answer': 'پاسخ را تایپ کنید.',
    'typed-gap-fill': 'واژه‌ای را تایپ کنید که در جای خالی درست است.',
  },
  gap: 'جای خالی',
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
}

/**
 * A German letter inside a Persian string, kept apart from the Persian around
 * it by the Unicode marks U+2066 … U+2069, since a string cannot hold a <span>.
 */
function german(text: string): string {
  return `\u2066${text}\u2069`
}
