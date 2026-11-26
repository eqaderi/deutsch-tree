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
])('the date in "%s" is spoken with an ordinal', (written, spoken) => {
  expect(speakable(written)).toBe(spoken)
})

test('a number in a form this does not know stays as written, so the content check can name it', () => {
  expect(speakable('Wir treffen uns am 3.5.2025.')).toMatch(/\d/)
})
