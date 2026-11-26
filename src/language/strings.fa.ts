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

  task: 'تکلیف',
  getYourScore: 'چطور نمره بگیرید',
  writingSteps: [
    'متن خود را برای این تکلیف بنویسید، مثل روز امتحان: بدون فرهنگ لغت و بدون مترجم.',
    'پرامپت را کپی کنید و در یک دستیار هوش مصنوعی بچسبانید، مثلاً ChatGPT یا Claude یا Gemini. متن خود را زیر آن بگذارید و هر دو را بفرستید.',
    'دستیار متن شما را با معیارهای رسمی امتحان نمره می‌دهد. نمرهٔ آن را در کادر پایین بنویسید.',
  ],
  speakingSteps: [
    'پرامپت را کپی کنید و در یک دستیار هوش مصنوعی که حرف می‌زند بچسبانید، مثلاً ChatGPT یا Claude یا Gemini. آن را بفرستید.',
    'دستیار را روی حالت گفت‌وگوی صوتی بگذارید و بگویید «Hallo». دستیار مثل امتحان با شما آلمانی حرف می‌زند. حرف بزنید؛ تایپ نکنید.',
    'در پایان، دستیار با معیارهای رسمی امتحان به شما نمره می‌دهد. نمرهٔ آن را در کادر پایین بنویسید.',
  ],
  copyPrompt: 'کپی کردن پرامپت',
  promptCopied: 'کپی شد. حالا آن را در دستیار هوش مصنوعی بچسبانید.',
  promptNotCopied: 'مرورگر شما اجازهٔ کپی نداد. همهٔ پرامپت پایین را انتخاب کنید و خودتان کپی کنید.',
  readPrompt: 'خواندن پرامپت',
  thePrompt: 'پرامپت',
  promptNote:
    'پرامپت به انگلیسی و آلمانی است، چون دستیار این‌طور بهتر از آن پیروی می‌کند. پرامپت از دستیار می‌خواهد سخت‌گیرانه نمره بدهد و به فارسی به شما جواب بدهد. این برنامه چیزی به جایی نمی‌فرستد؛ فقط متن را کپی می‌کند.',
  pronunciationNote:
    '۱۶ نمره از ۱۰۰ نمره برای تلفظ است. دستیار تلفظ را فقط تقریبی می‌سنجد، پس این بخش نمره را یک برآورد بدانید.',
  yourScore: 'نمرهٔ شما',
  noScoreYet: 'هنوز نمره‌ای ندارید.',
  scoreLabel: 'نمره‌ای که دستیار داد، از ۰ تا ۱۰۰',
  saveScore: 'ذخیرهٔ نمره',
  scoreNotValid: 'یک عدد صحیح از ۰ تا ۱۰۰ بنویسید.',
  ofTotal: (total) => `از ${digits.format(total)}`,
  scoreNeeded: (needed, total) =>
    `برای تمام کردن این موضوع باید ${digits.format(needed)} از ${digits.format(total)} بگیرید.`,
  scoreRetry: 'تکلیف را دوباره انجام دهید و نمرهٔ تازه را وارد کنید. هر چند بار که بخواهید می‌توانید تلاش کنید.',
  scoresSoFar: 'نمره‌های شما تا حالا',
}
