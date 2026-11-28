/**
 * What the voice says wrong wherever it stands, and how to write it so that
 * the voice says it right: words it misreads, and abbreviations it would
 * spell out. Only what the voice says changes, never the text the learner
 * sees: `speakable` applies the table before Piper speaks.
 *
 * An entry is matched where it stands whole, as written here or with a
 * capital at the start of a sentence ("Fit bleiben …", "Z. B. …"); a longer
 * word it is part of ("Halsschmerzen", "fitter") is left alone, but a hyphen
 * ends a word ("ICE-Zug"). A space in an entry may be missing in the text
 * ("z.B."). An abbreviation that ends the text keeps the full stop that ends
 * the sentence.
 *
 * The right side is a spelling the voice reads right. (Piper also takes raw
 * phonemes in double brackets, but `[[ latˈaɪn ]]` came out as "Warte ein!",
 * so keep to spellings.) Add an entry when the voice slips on a word every
 * time (a slip on one item only is `--redo <key>`), with the ticket where it
 * was heard; check it first as content/README.md says ("Audio of the
 * German").
 *
 * The audio key is a hash of the spoken text, so adding or changing an entry
 * gives new audio to exactly the items that hold it, in both voices: run
 * `pnpm audio:generate` afterwards and commit the new files.
 */
export const PRONUNCIATIONS: Readonly<Record<string, string>> = {
  // #79: Piper spells abbreviations out ("z. B." as "zett. Beh.", "usw." as "usf").
  'z. B.': 'zum Beispiel',
  'd. h.': 'das heißt',
  'usw.': 'und so weiter',
  'bzw.': 'beziehungsweise',
  'vgl.': 'vergleiche',
  // "et cetera" comes out as "et keetera"; these two words give [ɛt ˈtseːtəra].
  'etc.': 'ett zetera',
  // #82: the bare headword "ca." comes out as "Ka".
  'ca.': 'circa',

  // #77: alone ("der ICE") the voice says "Ike"; as three letters whisper hears "ICE" in both voices.
  ICE: 'I C E',
  // #77: said with a long i, [fiːt]; "fitt" gives the short [fɪt].
  fit: 'fitt',
  // #77: said with a long a, [haːls]; "Halls" gives the short [hals]. Kerstin still says it
  // unclearly ("Herz"), in every spelling tried.
  Hals: 'Halls',
  // #79: stressed on the first syllable only; the hyphen stresses "tein" too.
  Latein: 'La-tein',
  // #79: stressed on the first syllable; this spelling stresses "ri" as German does.
  Cafeteria: 'Kaffeterihja',
  // #79: Thorsten says "das Sekretariat" as "das ist der Kriteriat"; the j keeps it whole.
  Sekretariat: 'Sekretarijat',
  // #88: said [ˈkɔʃtyːm], stressed first and with "scht"; the hyphen gives [kɔsˈtyːm].
  Kostüm: 'Koss-tüm',
  // #88: stressed on the first syllable; the hyphen stresses "ro" as German does.
  Garderobe: 'Garde-robe',
  // #88: stressed on "geh", as the other verb "umgehen" (to avoid); this spelling stresses "um".
  umgehen: 'ummgehen',
  // #88: said with a long i, [ʃiːk]; "schick" gives the short [ʃɪk].
  chic: 'schick',
}
