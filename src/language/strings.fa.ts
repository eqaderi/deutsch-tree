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
  acceptedWithNote: 'پذیرفته‌شده با یادداشت',
  exactSpelling: 'املای دقیق',
  answerNotes: {
    'umlaut-substitute': `پذیرفته شد. املای دقیق با ${german('ä')}، ${german('ö')}، ${german('ü')} یا ${german('ß')} است.`,
    capitalisation: 'پذیرفته شد. به حروف بزرگ و کوچک دقت کنید.',
  },
}

/**
 * A German letter inside a Persian string, kept apart from the Persian around
 * it by the Unicode marks U+2066 … U+2069, since a string cannot hold a <span>.
 */
function german(text: string): string {
  return `\u2066${text}\u2069`
}
