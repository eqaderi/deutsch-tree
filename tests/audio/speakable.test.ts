import { expect, test } from 'vitest'
import { speakable } from '../../src/audio/speakable.ts'

/**
 * Piper reads "14:35 Uhr" as "14 Uhr 5 und 30 Uhr" (ticket #5), so every
 * number is written as words before it is spoken. The expected words are
 * written out by hand.
 */

test('a sentence without numbers is spoken as written, with its spaces tidied', () => {
  expect(speakable('  Ich wohne\n in Berlin. ')).toBe('Ich wohne in Berlin.')
})

test.each([
  ['Sie ist 0 Jahre alt.', 'Sie ist null Jahre alt.'],
  ['Ich zähle bis 1.', 'Ich zähle bis eins.'],
  ['Meine Großmutter ist 85 Jahre alt.', 'Meine Großmutter ist fünfundachtzig Jahre alt.'],
  ['Wir sind 12 Leute.', 'Wir sind zwölf Leute.'],
  ['Er ist 17.', 'Er ist siebzehn.'],
  ['Das sind 21 Euro.', 'Das sind einundzwanzig Euro.'],
  ['Das Haus hat 30 Fenster.', 'Das Haus hat dreißig Fenster.'],
  ['Der Weg ist 100 Meter lang.', 'Der Weg ist hundert Meter lang.'],
  ['Es kostet 101 Euro.', 'Es kostet hunderteins Euro.'],
  ['Es kostet 365 Euro.', 'Es kostet dreihundertfünfundsechzig Euro.'],
  ['Hier wohnen 2500 Menschen.', 'Hier wohnen zweitausendfünfhundert Menschen.'],
  ['Hier wohnen 2.500 Menschen.', 'Hier wohnen zweitausendfünfhundert Menschen.'],
  ['Die Stadt hat 41000 Einwohner.', 'Die Stadt hat einundvierzigtausend Einwohner.'],
  ['Berlin hat 3700000 Einwohner.', 'Berlin hat drei Millionen siebenhunderttausend Einwohner.'],
  ['Das kostet 1000000 Euro.', 'Das kostet eine Million Euro.'],
])('the number in "%s" is spoken as a word', (written, spoken) => {
  expect(speakable(written)).toBe(spoken)
})

test.each([
  ['Ich bin 1990 geboren.', 'Ich bin neunzehnhundertneunzig geboren.'],
  ['Im Jahr 2024 ziehe ich um.', 'Im Jahr zweitausendvierundzwanzig ziehe ich um.'],
])('a year in "%s" is spoken as a year', (written, spoken) => {
  expect(speakable(written)).toBe(spoken)
})

test.each([
  ['Hier wohnen 1500 Menschen.', 'Hier wohnen tausendfünfhundert Menschen.'],
  ['Der Saal hat 1200 Plätze.', 'Der Saal hat tausendzweihundert Plätze.'],
])('a number from 1100 to 1999 before a noun in "%s" is a count, not a year', (written, spoken) => {
  expect(speakable(written)).toBe(spoken)
})

test.each(['Ich habe 1 Bruder.', 'Ich habe 1 Schwester.'])(
  'a 1 before a noun in "%s" stays a digit, since its ending depends on the noun',
  (written) => {
    expect(speakable(written)).toMatch(/\d/)
  },
)

test.each([
  ['Der Zug fährt um 14:35 Uhr.', 'Der Zug fährt um vierzehn Uhr fünfunddreißig.'],
  ['Der Zug fährt um 14.35 Uhr.', 'Der Zug fährt um vierzehn Uhr fünfunddreißig.'],
  ['Wir treffen uns um 8:05.', 'Wir treffen uns um acht Uhr fünf.'],
  ['Der Kurs beginnt um 9:00 Uhr.', 'Der Kurs beginnt um neun Uhr.'],
  ['Ich komme um 1 Uhr.', 'Ich komme um ein Uhr.'],
  ['Wir essen um 12 Uhr.', 'Wir essen um zwölf Uhr.'],
])('the time in "%s" is spoken as a time', (written, spoken) => {
  expect(speakable(written)).toBe(spoken)
})

test.each([
  ['Der Kaffee kostet 3,50 €.', 'Der Kaffee kostet drei Euro fünfzig.'],
  ['Der Kaffee kostet 3,50 Euro.', 'Der Kaffee kostet drei Euro fünfzig.'],
  ['Das Brot kostet 1 €.', 'Das Brot kostet ein Euro.'],
  ['Das Ticket kostet 12 €.', 'Das Ticket kostet zwölf Euro.'],
  ['Es ist 2,5 Kilometer weit.', 'Es ist zwei Komma fünf Kilometer weit.'],
  ['Alles ist 20 % billiger.', 'Alles ist zwanzig Prozent billiger.'],
  ['Alles ist 20% billiger.', 'Alles ist zwanzig Prozent billiger.'],
])('the amount in "%s" is spoken with its unit', (written, spoken) => {
  expect(speakable(written)).toBe(spoken)
})

test.each([
  ['Ich komme am 3. Mai.', 'Ich komme am dritten Mai.'],
  ['Heute ist der 1. März.', 'Heute ist der erste März.'],
  ['Wir fahren vom 7. Juli bis zum 20. Juli.', 'Wir fahren vom siebten Juli bis zum zwanzigsten Juli.'],
  ['Mein Geburtstag ist am 31. Dezember.', 'Mein Geburtstag ist am einunddreißigsten Dezember.'],
  // At the start of a sentence (#51: "Am 25. Juli" was "am fünfundzwanzigste").
  ['Am 25. Juli habe ich Geburtstag.', 'Am fünfundzwanzigsten Juli habe ich Geburtstag.'],
  ['Vom 7. Juli an bin ich weg.', 'Vom siebten Juli an bin ich weg.'],
  // A range (#51: "bis 5. Mai").
  ['Die Anmeldung geht bis 5. Mai.', 'Die Anmeldung geht bis fünften Mai.'],
  ['Wir fahren vom 3. bis 5. Mai weg.', 'Wir fahren vom dritten bis fünften Mai weg.'],
  ['Wir fahren vom 3. bis zum 5. Mai weg.', 'Wir fahren vom dritten bis zum fünften Mai weg.'],
  ['Der Kurs ist vom 3.–5. Mai.', 'Der Kurs ist vom dritten bis fünften Mai.'],
])('the date in "%s" is spoken with an ordinal', (written, spoken) => {
  expect(speakable(written)).toBe(spoken)
})

test.each([
  // #64: "im 3. Stock" was "im drei Stock".
  ['Ich wohne im 3. Stock.', 'Ich wohne im dritten Stock.'],
  ['Im 2. Stock ist das Büro.', 'Im zweiten Stock ist das Büro.'],
  ['Ich bin zum 1. Mal in Wien.', 'Ich bin zum ersten Mal in Wien.'],
  ['Wir treffen uns am 2. Tag.', 'Wir treffen uns am zweiten Tag.'],
  ['Er fährt jeden 2. Tag Rad.', 'Er fährt jeden zweiten Tag Rad.'],
  ['Der 3. Stock ist neu.', 'Der dritte Stock ist neu.'],
  ['Das ist die 2. Klasse.', 'Das ist die zweite Klasse.'],
  ['Das 1. Kapitel ist leicht.', 'Das erste Kapitel ist leicht.'],
  ['Mein Sohn ist in der 4. Klasse.', 'Mein Sohn ist in der vierten Klasse.'],
  ['Sie gewinnt den 1. Preis.', 'Sie gewinnt den ersten Preis.'],
])('the ordinal before a noun in "%s" is spoken with the ending of its place', (written, spoken) => {
  expect(speakable(written)).toBe(spoken)
})

test.each([
  ['Mein Sohn ist 3. Seine Schwester ist 5.', 'Mein Sohn ist drei. Seine Schwester ist fünf.'],
  ['Ich zähle bis 3. Dann komme ich.', 'Ich zähle bis drei. Dann komme ich.'],
])('a number that ends a sentence in "%s" is no ordinal, although a capital follows', (written, spoken) => {
  expect(speakable(written)).toBe(spoken)
})

test('a number in a form this does not know stays as written, so the content check can name it', () => {
  expect(speakable('Wir treffen uns am 3.5.2025.')).toMatch(/\d/)
})

/**
 * Words the voice says wrong however they stand (heard with whisper on the
 * audio of ticket #77) are respelt for the voice only: the table in
 * src/audio/pronunciations.ts. The respellings were checked with Piper's own
 * phonemes.
 */
test.each([
  ['der ICE', 'der I C E'],
  ['Ich fahre mit dem ICE nach Köln.', 'Ich fahre mit dem I C E nach Köln.'],
  ['fit', 'fitt'],
  ['Ich bin wieder fit.', 'Ich bin wieder fitt.'],
  ['der Hals', 'der Halls'],
  ['Mein Hals tut weh.', 'Mein Halls tut weh.'],
  ['Fit bleiben ist schwer.', 'Fitt bleiben ist schwer.'],
  ['Der ICE-Zug ist voll.', 'Der I C E-Zug ist voll.'],
  // #79: the voice stresses the first syllable of these, or garbles it.
  ['Latein ist schwer.', 'La-tein ist schwer.'],
  ['in der Cafeteria', 'in der Kaffeterihja'],
  ['das Sekretariat', 'das Sekretarijat'],
  // #88: the voice stresses the first syllable of these, or says chic with a long i.
  ['das Kostüm', 'das Koss-tüm'],
  ['Bitte geben Sie Ihre Jacke an der Garderobe ab.', 'Bitte geben Sie Ihre Jacke an der Garde-robe ab.'],
  ['Sie kann gut mit Kindern umgehen.', 'Sie kann gut mit Kindern ummgehen.'],
  ['Du siehst richtig chic aus.', 'Du siehst richtig schick aus.'],
  // #94: the voice stresses the first syllable of these, or reads "sch" in Berufsschule as "s-ch".
  ['Ich studiere jetzt im dritten Semester Informatik.', 'Ich studiere jetzt im dritten Se-mester Informatik.'],
  ['Im Seminar lesen wir einen Text.', 'Im Semi-nar lesen wir einen Text.'],
  ['die Recherche', 'die Re-scherrsche'],
  ['Er ist in der Berufsschule.', 'Er ist in der Berufs-schule.'],
])('a word the voice misreads in "%s" is respelt for the voice', (written, spoken) => {
  expect(speakable(written)).toBe(spoken)
})

test.each(['Ich habe Halsschmerzen.', 'Er geht ins Fitnessstudio.', 'Sie ist fitter als ich.', 'Der Iceberg.'])(
  'only the whole word is respelt, not a word it is part of: "%s" is spoken as written',
  (written) => {
    expect(speakable(written)).toBe(written)
  },
)

/**
 * Piper spells an abbreviation out letter by letter, or worse: "z. B." comes
 * out as "zett. Beh." and "usw." as "usf". A German reader says the words it
 * stands for, so the voice does too (ticket #79).
 */
test.each([
  ['z. B.', 'zum Beispiel'],
  ['Ich esse gern Obst, z. B. Äpfel und Bananen.', 'Ich esse gern Obst, zum Beispiel Äpfel und Bananen.'],
  ['Ich esse gern Obst, z.B. Äpfel.', 'Ich esse gern Obst, zum Beispiel Äpfel.'],
  ['d. h.', 'das heißt'],
  ['Der Kurs ist am Wochenende, d. h. am Samstag.', 'Der Kurs ist am Wochenende, das heißt am Samstag.'],
  ['usw.', 'und so weiter'],
  ['Im Koffer sind Hosen, Hemden, Socken usw.', 'Im Koffer sind Hosen, Hemden, Socken und so weiter.'],
  ['bzw.', 'beziehungsweise'],
  ['Kreuzen Sie a bzw. b an.', 'Kreuzen Sie a beziehungsweise b an.'],
  ['vgl.', 'vergleiche'],
  ['etc.', 'ett zetera'],
  ['Wir brauchen Brot, Milch etc.', 'Wir brauchen Brot, Milch ett zetera.'],
  ['Z. B. Äpfel.', 'Zum Beispiel Äpfel.'],
  // #82: the bare headword "ca." comes out as "Ka".
  ['ca.', 'circa'],
  ['Die Fahrt dauert ca. zwei Stunden.', 'Die Fahrt dauert circa zwei Stunden.'],
  ['Es kostet ca. 10 Euro.', 'Es kostet circa zehn Euro.'],
])('the abbreviation in "%s" is spoken as its words', (written, spoken) => {
  expect(speakable(written)).toBe(spoken)
})

test('a letter with a full stop that is no abbreviation is left as written', () => {
  expect(speakable('Das ist Herr Z. Bauer.')).toBe('Das ist Herr Z. Bauer.')
})
