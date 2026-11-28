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
  // #89: said with [ʃ], [ʃaˈoːtɪʃ]; "kaotisch" gives [kaˈoːtɪʃ].
  chaotisch: 'kaotisch',
  // #89: said [ˈzaɪtdəm], stress on "seit" and a weak "dem"; "seit deem" gives [zaɪt ˈdeːm].
  seitdem: 'seit deem',
  // #88: said [ˈkɔʃtyːm], stressed first and with "scht"; the hyphen gives [kɔsˈtyːm].
  Kostüm: 'Koss-tüm',
  // #88: stressed on the first syllable; the hyphen stresses "ro" as German does.
  Garderobe: 'Garde-robe',
  // #88: stressed on "geh", as the other verb "umgehen" (to avoid); this spelling stresses "um".
  umgehen: 'ummgehen',
  // #88: said with a long i, [ʃiːk]; "schick" gives the short [ʃɪk].
  chic: 'schick',
  // #90: stressed on the first syllable ("SEE-nioren"); the j gives [zɛnˈjoːrən].
  Senioren: 'Senjoren',
  // #90: "Creme" comes out with a final schwa, [kreːmə]; this spelling gives [kreːm].
  Zahncreme: 'Zahnkreem',
  // #90: read with [sk] as in English; German says [ʃiː].
  Skifahren: 'Schifahren',
  // #90: stressed on the first syllable; the hyphen stresses "ät" too.
  Diät: 'Di-ät',
  // #90: stressed on "So"; the hyphens stress "zial" and "arbeiter" as German does.
  Sozialarbeiter: 'So-zial-arbeiter',

  // #92: the short forms of the floors on signs and in flat adverts are read out in full, as
  // "z. B." is; "Erdgeschoss" alone comes out as [ɛɾdɡˈɛʃɔs], the hyphen gives the long e.
  EG: 'Erd-geschoss',
  OG: 'Ober-geschoss',
  UG: 'Untergeschoss',
  // #92: loanwords that the voice says letter by letter in the German way. "Etage" comes out as
  // [ˈeːtɑːɡə], "Buffet" as [bˈʊfət], "Dessert" as [dˈɛsɜt], "Steak" as [ʃtˈeːɑːk], "Ketchup" as
  // [kˈɛtʃuːp], "Sandwich" as [zˈandvɪç], "Kakao" as [kˈɑkaˌoː]; the spellings give the sounds
  // ("Büfett" is also a German spelling), a hyphen moves the stress off the first syllable.
  Etage: 'E-taasche',
  Buffet: 'Büfett',
  Dessert: 'Dessär',
  Abonnement: 'Abonne-mang',
  Salon: 'Sa-long',
  Kakao: 'Ka-kau',
  Steak: 'Stejk',
  Ketchup: 'Ketschap',
  Sandwich: 'Sändwitsch',
  // #92: said with a short ü, [mˈʏsliː]; "Mühsli" gives the long ü.
  Müsli: 'Mühsli',
  // #92: "sp" and "st" inside a compound come out as [sp], [st]; the parts begin with [ʃp], [ʃt].
  Nachspeise: 'Nachschpeise',
  Kunststoff: 'Kunstschtoff',
  // #92: [bˈʊx] with a short u; the hyphen keeps the long u of "Buch".
  Buchhandlung: 'Buch-handlung',
  Sparbuch: 'Spar-buch',

  // #99: "jobben" is said with the German j, [jˈɔbən]; "dsch" gives the English sound.
  jobben: 'dschobben',
  jobbt: 'dschobbt',
  // #99: the letters of "ec" are read as one syllable, [ˈeːk]; spelt out they are "E-Zeh".
  'ec-Karte': 'E-Zeh-Karte',
  // #99: "Chip" alone is [tʃˈɪp], but inside "Chipkarte" the voice says [çˈɪp].
  Chipkarte: 'Tschipkarte',
  // #99: "steuer" after "Mehrwert" comes out as [st]; the hyphen gives [ʃt].
  Mehrwertsteuer: 'Mehrwert-steuer',
  // #99: the stress falls on the wrong syllable: "Konsum" as [kɔnzˈʊm] with a short u, "Rabatt"
  // as [rˈɑbat], "Asyl" as [ˈɑzyːl], "Reporter" as [rˈeːpɔɾtɜ], "Profi" as [proːfˈiː]; a hyphen
  // gives the right syllable its stress.
  Konsum: 'Konsuhm',
  Rabatt: 'Ra-batt',
  Asyl: 'A-syl',
  Reporter: 'Re-porter',
  Reporterin: 'Re-porterin',
  Profi: 'Proh-fi',
  // #99: "Azubi" alone comes out as [ˈatsuːbˌiː], heard as "A zu B"; the h gives [atsˈuːbiː].
  Azubi: 'Azuhbi',

  // #94: stressed on the first syllable, [ˈzeːməstɐ]; the hyphen stresses "mes" as German does.
  Semester: 'Se-mester',
  // #94: stressed on the first syllable, [ˈzeːminaːɐ]; the hyphen stresses "nar".
  Seminar: 'Semi-nar',
  // #94: read as German, [ˈrɛçɐçə]; this spelling gives the French "sch" and the stress on "scher".
  Recherche: 'Re-scherrsche',
  // #94: "fss" is read as "fs" + "ch", [bəˈrʊfsçuːlə]; the hyphen keeps "schule" whole.
  Berufsschule: 'Berufs-schule',

  // #97: read letter by letter in the German way, [hˈoːmeːˌɔfiːkə]; the hyphen gives [hˈoːmˈɔfɪs].
  Homeoffice: 'Hohm-offis',
  // #96: stressed on "gend", [nɪɾɡˈɛndvoː]; this spelling gives [ˈnɪɾɡəndvˌoː].
  nirgendwo: 'nirgendwoh',
  // #96: stressed on "hin" only; this spelling gives [hˌɪntɜhˈeːɾ].
  hinterher: 'hinterheer',
  // #96: stressed on the first "so"; the hyphens stress the last one, [zoːviːzˈoː].
  sowieso: 'so-wie-so',
  // #96: stressed on the first syllable; the hyphen stresses "mal" too, as German does.
  minimal: 'mini-mal',
  maximal: 'maxi-mal',
}
