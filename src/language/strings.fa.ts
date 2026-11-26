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

  reference: 'مرجع',
  search: 'جست‌وجو',
  allGrammar: 'همهٔ دستور زبان',
  searchTitle: 'جست‌وجو در همهٔ موضوع‌ها',
  // The Latin letters stand between the marks U+2066 and U+2069, which keep them left to right.
  searchHint:
    'یک واژه به فارسی یا آلمانی بنویسید. اگر صفحه‌کلید شما \u2066ä, ö, ü, ß\u2069 ندارد، \u2066ae, oe, ue, ss\u2069 بنویسید.',
  searchResults: (count) => `${digits.format(count)} موضوع پیدا شد`,
  searchNothing: 'موضوعی پیدا نشد. واژهٔ دیگری را امتحان کنید، یا واژه‌های کمتری بنویسید.',
  overviewTitle: 'همهٔ دستور زبان در یک نگاه',
  overviewIntro: 'همهٔ جدول‌های دستور زبان در یک صفحه. نام بالای هر جدول، موضوع آن را باز می‌کند.',
  overviewEmpty: 'هنوز هیچ جدول دستور زبانی نوشته نشده است.',
}
