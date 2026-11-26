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
  questionsInPool: () => 'سؤال در بانک سؤال',
  testNotReady: 'هنوز نمی‌توان آزمون داد. این بخش در دست ساخت است.',
}
