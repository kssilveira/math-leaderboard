// Built-in 2-Choice Quiz Configurations (datasets loaded from data/quiz-datasets.js)
const BUILTIN_QUIZ_CONFIGS = [
  // Geography (12 configs across 193 UN member states: Country, Flag, Capital, Map)
  {
    id: 'cfg_geo_flag_country',
    category: 'geo',
    type: 'quiz',
    label: 'Flag → Country',
    isFlagPrompt: true,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country, flag]) => [flag, country])
  },
  {
    id: 'cfg_geo_country_flag',
    category: 'geo',
    type: 'quiz',
    label: 'Country → Flag',
    isFlagPrompt: false,
    isFlagChoice: true,
    items: UN_MEMBER_STATES.map(([country, flag]) => [country, flag])
  },
  {
    id: 'cfg_geo_country_capital',
    category: 'geo',
    type: 'quiz',
    label: 'Country → Capital',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country, , capital]) => [country, capital])
  },
  {
    id: 'cfg_geo_capital_country',
    category: 'geo',
    type: 'quiz',
    label: 'Capital → Country',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country, , capital]) => [capital, country])
  },
  {
    id: 'cfg_geo_flag_capital',
    category: 'geo',
    type: 'quiz',
    label: 'Flag → Capital',
    isFlagPrompt: true,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([, flag, capital]) => [flag, capital])
  },
  {
    id: 'cfg_geo_capital_flag',
    category: 'geo',
    type: 'quiz',
    label: 'Capital → Flag',
    isFlagPrompt: false,
    isFlagChoice: true,
    items: UN_MEMBER_STATES.map(([, flag, capital]) => [capital, flag])
  },
  {
    id: 'cfg_geo_map_country',
    category: 'geo',
    type: 'quiz',
    label: 'Map → Country',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country]) => ['map:' + country, country])
  },
  {
    id: 'cfg_geo_country_map',
    category: 'geo',
    type: 'quiz',
    label: 'Country → Map',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country]) => [country, 'map:' + country])
  },
  {
    id: 'cfg_geo_map_flag',
    category: 'geo',
    type: 'quiz',
    label: 'Map → Flag',
    isFlagPrompt: false,
    isFlagChoice: true,
    items: UN_MEMBER_STATES.map(([country, flag]) => ['map:' + country, flag])
  },
  {
    id: 'cfg_geo_flag_map',
    category: 'geo',
    type: 'quiz',
    label: 'Flag → Map',
    isFlagPrompt: true,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country, flag]) => [flag, 'map:' + country])
  },
  {
    id: 'cfg_geo_map_capital',
    category: 'geo',
    type: 'quiz',
    label: 'Map → Capital',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country, , capital]) => ['map:' + country, capital])
  },
  {
    id: 'cfg_geo_capital_map',
    category: 'geo',
    type: 'quiz',
    label: 'Capital → Map',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country, , capital]) => [capital, 'map:' + country])
  },

  // Language (14 configs: 4 Foreign→English, 4 English→Foreign, 2 Emoji↔English, 4 English Vocabulary & Wordplay)
  {
    id: 'cfg_lang_pt_en',
    category: 'lang',
    type: 'quiz',
    label: '🇧🇷 Portuguese → English',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: COMMON_WORDS_1000.map(([en, pt]) => [pt, en])
  },
  {
    id: 'cfg_lang_es_en',
    category: 'lang',
    type: 'quiz',
    label: '🇪🇸 Spanish → English',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: COMMON_WORDS_1000.map(([en, , es]) => [es, en])
  },
  {
    id: 'cfg_lang_fr_en',
    category: 'lang',
    type: 'quiz',
    label: '🇫🇷 French → English',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: COMMON_WORDS_1000.map(([en, , , fr]) => [fr, en])
  },
  {
    id: 'cfg_lang_de_en',
    category: 'lang',
    type: 'quiz',
    label: '🇩🇪 German → English',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: COMMON_WORDS_1000.map(([en, , , , de]) => [de, en])
  },
  {
    id: 'cfg_lang_en_pt',
    category: 'lang',
    type: 'quiz',
    label: 'English → 🇧🇷 Portuguese',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: COMMON_WORDS_1000.map(([en, pt]) => [en, pt])
  },
  {
    id: 'cfg_lang_en_es',
    category: 'lang',
    type: 'quiz',
    label: 'English → 🇪🇸 Spanish',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: COMMON_WORDS_1000.map(([en, , es]) => [en, es])
  },
  {
    id: 'cfg_lang_en_fr',
    category: 'lang',
    type: 'quiz',
    label: 'English → 🇫🇷 French',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: COMMON_WORDS_1000.map(([en, , , fr]) => [en, fr])
  },
  {
    id: 'cfg_lang_en_de',
    category: 'lang',
    type: 'quiz',
    label: 'English → 🇩🇪 German',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: COMMON_WORDS_1000.map(([en, , , , de]) => [en, de])
  },
  {
    id: 'cfg_lang_emoji_en',
    category: 'lang',
    type: 'quiz',
    label: '😀 Emoji → English',
    isFlagPrompt: true,
    isFlagChoice: false,
    items: TOP_EMOJIS_1000.map(([emoji, en]) => [emoji, en])
  },
  {
    id: 'cfg_lang_en_emoji',
    category: 'lang',
    type: 'quiz',
    label: 'English → 😀 Emoji',
    isFlagPrompt: false,
    isFlagChoice: true,
    items: TOP_EMOJIS_1000.map(([emoji, en]) => [en, emoji])
  },
  {
    id: 'cfg_lang_synonym',
    category: 'lang',
    type: 'quiz',
    label: 'Word → Synonym',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: ENGLISH_SYNONYMS
  },
  {
    id: 'cfg_lang_antonym',
    category: 'lang',
    type: 'quiz',
    label: 'Word → Antonym',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: ENGLISH_ANTONYMS
  },
  {
    id: 'cfg_lang_idiom_meaning',
    category: 'lang',
    type: 'quiz',
    label: 'Idiom → Meaning',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: ENGLISH_IDIOMS.map(([idiom, meaning]) => [idiom, meaning])
  },
  {
    id: 'cfg_lang_meaning_idiom',
    category: 'lang',
    type: 'quiz',
    label: 'Meaning → Idiom',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: ENGLISH_IDIOMS.map(([idiom, meaning]) => [meaning, idiom])
  },

  // Other (4 configs: 118 IUPAC chemical elements & 36 International Morse Code characters)
  {
    id: 'cfg_chem_symbol_name',
    category: 'other',
    type: 'quiz',
    label: 'Symbol → Element',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: CHEMICAL_ELEMENTS_118.map(([sym, name]) => [sym, name])
  },
  {
    id: 'cfg_chem_name_symbol',
    category: 'other',
    type: 'quiz',
    label: 'Element → Symbol',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: CHEMICAL_ELEMENTS_118.map(([sym, name]) => [name, sym])
  },
  {
    id: 'cfg_other_morse_char',
    category: 'other',
    type: 'quiz',
    label: 'Morse → Character',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: MORSE_CODE_36.map(([ch, morse]) => [morse, ch])
  },
  {
    id: 'cfg_other_char_morse',
    category: 'other',
    type: 'quiz',
    label: 'Character → Morse',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: MORSE_CODE_36.map(([ch, morse]) => [ch, morse])
  }
];
