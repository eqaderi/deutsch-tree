/**
 * Words the voice says wrong wherever they stand, and how to spell them so
 * that it says them right. Only what the voice says changes, never the text
 * the learner sees: `speakable` respells each word before Piper speaks.
 *
 * A word is respelt where it stands whole, as written here or with a capital
 * at the start of a sentence ("Fit bleiben …"); a longer word it is part of
 * ("Halsschmerzen", "fitter") is left alone, but a hyphen ends a word
 * ("ICE-Zug"). Add a word when you hear the voice slip on it every time (a
 * slip on one item only is `--redo <key>`), with the ticket where it was
 * heard. Check the respelling with Piper's phonemes before you add it; how is
 * in content/README.md, "Audio of the German".
 *
 * The audio key is a hash of the spoken text, so adding or changing a word
 * here gives new audio to exactly the items that hold it: run
 * `pnpm audio:generate` afterwards.
 */
export const PRONUNCIATIONS: Readonly<Record<string, string>> = {
  // #77: alone ("der ICE") the voice says "Ike"; letter by letter it is right everywhere.
  ICE: 'I-C-E',
  // #77: said with a long i, [fiːt]; "fitt" gives the short [fɪt].
  fit: 'fitt',
  // #77: said with a long a, [haːls]; "Halls" gives the short [hals].
  Hals: 'Halls',
}
