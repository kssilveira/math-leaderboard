// Built-in 2-Choice Quiz Configurations (datasets loaded from data/quiz-datasets.js)
const QUIZ_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', col: 0, emojiCol: 1, synonyms: ENGLISH_SYNONYMS, antonyms: ENGLISH_ANTONYMS, idioms: ENGLISH_IDIOMS },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷', col: 1, emojiCol: 2, synonyms: PORTUGUESE_SYNONYMS, antonyms: PORTUGUESE_ANTONYMS, idioms: PORTUGUESE_IDIOMS },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', col: 2, emojiCol: 3, synonyms: SPANISH_SYNONYMS, antonyms: SPANISH_ANTONYMS, idioms: SPANISH_IDIOMS },
  { code: 'fr', name: 'French', flag: '🇫🇷', col: 3, emojiCol: 4, synonyms: FRENCH_SYNONYMS, antonyms: FRENCH_ANTONYMS, idioms: FRENCH_IDIOMS },
  { code: 'de', name: 'German', flag: '🇩🇪', col: 4, emojiCol: 5, synonyms: GERMAN_SYNONYMS, antonyms: GERMAN_ANTONYMS, idioms: GERMAN_IDIOMS }
];

function buildLanguageQuizConfigs() {
  const configs = [];
  const enLang = QUIZ_LANGUAGES.find(l => l.code === 'en');
  const nonEn = QUIZ_LANGUAGES.filter(l => l.code !== 'en');
  const formatLangTag = (lang) => `${lang.flag} ${lang.code.toUpperCase()}`;

  // 8 Foreign <-> English translation configs (preserving legacy IDs)
  nonEn.forEach((lang) => {
    configs.push({
      id: `cfg_lang_${lang.code}_en`,
      category: 'lang',
      langs: [lang.code, 'en'],
      type: 'quiz',
      label: `${formatLangTag(lang)} → ${formatLangTag(enLang)}`,
      isFlagPrompt: false,
      isFlagChoice: false,
      items: COMMON_WORDS_1000.map(row => [row[lang.col], row[0]])
    });
  });
  nonEn.forEach((lang) => {
    configs.push({
      id: `cfg_lang_en_${lang.code}`,
      category: 'lang',
      langs: ['en', lang.code],
      type: 'quiz',
      label: `${formatLangTag(enLang)} → ${formatLangTag(lang)}`,
      isFlagPrompt: false,
      isFlagChoice: false,
      items: COMMON_WORDS_1000.map(row => [row[0], row[lang.col]])
    });
  });

  // 12 cross-language translation configs across pt, es, fr, de
  nonEn.forEach((src) => {
    nonEn.forEach((dst) => {
      if (src.code === dst.code) return;
      configs.push({
        id: `cfg_lang_${src.code}_${dst.code}`,
        category: 'lang',
        langs: [src.code, dst.code],
        type: 'quiz',
        label: `${formatLangTag(src)} → ${formatLangTag(dst)}`,
        isFlagPrompt: false,
        isFlagChoice: false,
        items: COMMON_WORDS_1000.map(row => [row[src.col], row[dst.col]])
      });
    });
  });

  // 10 Emoji <-> Language configs
  QUIZ_LANGUAGES.forEach((lang) => {
    const langLabel = formatLangTag(lang);
    configs.push({
      id: `cfg_lang_emoji_${lang.code}`,
      category: 'lang',
      langs: [lang.code],
      type: 'quiz',
      label: `😀 Emoji → ${langLabel}`,
      isFlagPrompt: true,
      isFlagChoice: false,
      items: TOP_EMOJIS_1000.map(row => [row[0], row[lang.emojiCol]])
    });
    configs.push({
      id: `cfg_lang_${lang.code}_emoji`,
      category: 'lang',
      langs: [lang.code],
      type: 'quiz',
      label: `${langLabel} → 😀 Emoji`,
      isFlagPrompt: false,
      isFlagChoice: true,
      items: TOP_EMOJIS_1000.map(row => [row[lang.emojiCol], row[0]])
    });
  });

  // 5 Synonyms configs
  QUIZ_LANGUAGES.forEach((lang) => {
    configs.push({
      id: lang.code === 'en' ? 'cfg_lang_synonym' : `cfg_lang_synonym_${lang.code}`,
      category: 'lang',
      langs: [lang.code],
      type: 'quiz',
      label: `${lang.flag} Synonyms`,
      isFlagPrompt: false,
      isFlagChoice: false,
      items: lang.synonyms
    });
  });

  // 5 Antonyms configs
  QUIZ_LANGUAGES.forEach((lang) => {
    configs.push({
      id: lang.code === 'en' ? 'cfg_lang_antonym' : `cfg_lang_antonym_${lang.code}`,
      category: 'lang',
      langs: [lang.code],
      type: 'quiz',
      label: `${lang.flag} Antonyms`,
      isFlagPrompt: false,
      isFlagChoice: false,
      items: lang.antonyms
    });
  });

  // 10 Idiom <-> Meaning configs (monolingual per language)
  QUIZ_LANGUAGES.forEach((lang) => {
    configs.push({
      id: lang.code === 'en' ? 'cfg_lang_idiom_meaning' : `cfg_lang_idiom_meaning_${lang.code}`,
      category: 'lang',
      langs: [lang.code],
      type: 'quiz',
      label: `${lang.flag} Idiom → Meaning`,
      isFlagPrompt: false,
      isFlagChoice: false,
      items: lang.idioms.map(([idiom, meaning]) => [idiom, meaning])
    });
    configs.push({
      id: lang.code === 'en' ? 'cfg_lang_meaning_idiom' : `cfg_lang_meaning_idiom_${lang.code}`,
      category: 'lang',
      langs: [lang.code],
      type: 'quiz',
      label: `${lang.flag} Meaning → Idiom`,
      isFlagPrompt: false,
      isFlagChoice: false,
      items: lang.idioms.map(([idiom, meaning]) => [meaning, idiom])
    });
  });

  return configs;
}

const STUDY_LANGUAGE_META = {
  de: { name: 'German', flag: '🇩🇪' },
  en: { name: 'English', flag: '🇬🇧' },
  pt: { name: 'Portuguese', flag: '🇧🇷' },
  es: { name: 'Spanish', flag: '🇪🇸' },
  fr: { name: 'French', flag: '🇫🇷' }
};
const STUDY_CEFR_ORDER = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

const GERMAN_PLURAL_ONLY_NOUNS = new Set(['Leute', 'Eltern', 'Geschwister', 'Großeltern']);
const GERMAN_MASC_TIME_NOUNS = new Set([
  'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag',
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  'Frühling', 'Sommer', 'Herbst', 'Winter'
]);
const GERMAN_MASC_COMPASS_NOUNS = new Set(['Norden', 'Süden', 'Osten', 'Westen']);
const GERMAN_NEUT_LANG_NOUNS = new Set(['Deutsch', 'Englisch', 'Spanisch', 'Französisch', 'Portugiesisch']);
const GERMAN_MASC_ER_AGENT_NOUNS = new Set([
  'Lehrer', 'Schüler', 'Verkäufer', 'Kellner', 'Fahrer', 'Partner'
]);
const GERMAN_ARTICLE_PROMPT_DISAMBIG = {
  See: '___ See (≠ Meer)',
  Moment: '___ Moment (Zeit)'
};

function getGermanNounSuffixHint(noun, article) {
  if (article === 'die') {
    if (GERMAN_PLURAL_ONLY_NOUNS.has(noun)) return 'Plural (die)';
    if (noun.endsWith('ung')) return '-ung → feminin (die)';
    if (noun.endsWith('heit')) return '-heit → feminin (die)';
    if (noun.endsWith('keit')) return '-keit → feminin (die)';
    if (noun.endsWith('schaft')) return '-schaft → feminin (die)';
    if (noun.endsWith('tion')) return '-tion → feminin (die)';
    if (noun.endsWith('tät')) return '-tät → feminin (die)';
    if (noun.endsWith('ei')) return '-ei → feminin (die)';
    if (noun.endsWith('ik')) return '-ik → feminin (die)';
    if (noun.endsWith('in') && noun.length > 4 && noun !== 'Medizin') return '-in (weiblich) → die';
    return 'feminin (die)';
  }
  if (article === 'das') {
    if (GERMAN_NEUT_LANG_NOUNS.has(noun)) return 'Sprachen → das';
    if (noun.endsWith('chen')) return '-chen → immer neutrum (das)';
    if (noun.endsWith('lein')) return '-lein → immer neutrum (das)';
    if (noun.endsWith('um')) return '-um → neutrum (das)';
    return 'neutrum (das)';
  }
  if (GERMAN_MASC_TIME_NOUNS.has(noun)) return 'Tage/Monate/Jahreszeiten → der';
  if (GERMAN_MASC_COMPASS_NOUNS.has(noun)) return 'Himmelsrichtungen → der';
  if (GERMAN_MASC_ER_AGENT_NOUNS.has(noun)) return '-er (männlich) → der';
  return 'maskulin (der)';
}

function buildPartsFromSetKeys(items, setDefs, setKeyIndex) {
  return setDefs.map((def) => {
    const allowed = new Set(def.keys);
    const indices = [];
    items.forEach((row, idx) => {
      if (allowed.has(row[setKeyIndex])) {
        indices.push(idx);
      }
    });
    return { label: def.label, indices };
  });
}

function buildConfigsForStudyCourse(course) {
  const {
    learn,
    cefr,
    preferredPackOrder = ['en', 'pt', 'es', 'fr'],
    packs,
    vocabCore,
    vocabParts,
    phrasesCore,
    phraseParts,
    monolingualTracks = []
  } = course;
  if (!packs || !Array.isArray(vocabCore) || !Array.isArray(phrasesCore)) {
    return [];
  }

  const learnMeta = STUDY_LANGUAGE_META[learn] || { name: learn.toUpperCase(), flag: '🏳️' };
  const learnTag = `${learnMeta.flag} ${learn.toUpperCase()}`;
  const cefrUpper = String(cefr || '').toUpperCase();
  const baseMeta = {
    category: 'study',
    type: 'quiz',
    studyLearn: learn,
    studyCefr: cefr,
    isFlagPrompt: false,
    isFlagChoice: false
  };

  const packCodes = [
    ...preferredPackOrder.filter(code => Boolean(packs[code])),
    ...Object.keys(packs).filter(code => !preferredPackOrder.includes(code))
  ];

  const pairedConfigs = [];
  packCodes.forEach((code) => {
    const pack = packs[code];
    if (
      !pack ||
      !Array.isArray(pack.vocab) ||
      !Array.isArray(pack.phrases) ||
      pack.vocab.length !== vocabCore.length ||
      pack.phrases.length !== phrasesCore.length
    ) {
      return;
    }
    const langMeta = STUDY_LANGUAGE_META[code] || { name: code.toUpperCase(), flag: '🏳️' };
    const withTag = `${langMeta.flag} ${code.toUpperCase()}`;
    pairedConfigs.push(
      {
        ...baseMeta,
        studyWith: code,
        id: `cfg_study_${learn}_${code}_${cefr}_vocab_${learn}_${code}`,
        shortLabel: `🔤 Words ${learnTag} → ${withTag}`,
        label: `${learnMeta.flag} ${cefrUpper} · 🔤 Words ${learnTag} → ${withTag}`,
        distractorMode: 'pos_pool',
        items: vocabCore.map(([word, pos, setKey], i) => [word, pack.vocab[i], pos, setKey]),
        customParts: vocabParts
      },
      {
        ...baseMeta,
        studyWith: code,
        id: `cfg_study_${learn}_${code}_${cefr}_vocab_${code}_${learn}`,
        shortLabel: `🔤 Words ${withTag} → ${learnTag}`,
        label: `${learnMeta.flag} ${cefrUpper} · 🔤 Words ${withTag} → ${learnTag}`,
        distractorMode: 'pos_pool',
        items: vocabCore.map(([word, pos, setKey], i) => [pack.vocab[i], word, pos, setKey]),
        customParts: vocabParts
      },
      {
        ...baseMeta,
        studyWith: code,
        id: `cfg_study_${learn}_${code}_${cefr}_phrases`,
        shortLabel: `🗣️ Phrases ${withTag} → ${learnTag}`,
        label: `${learnMeta.flag} ${cefrUpper} · 🗣️ Phrases ${withTag} → ${learnTag}`,
        distractorMode: 'explicit',
        items: phrasesCore.map(([correct, distractors], i) => {
          const [prompt, ruleNote] = pack.phrases[i];
          return [prompt, correct, distractors, ruleNote];
        }),
        customParts: phraseParts
      }
    );
  });

  const monolingualConfigs = monolingualTracks.map((track) => ({
    ...baseMeta,
    studyWith: learn,
    id: track.id || `cfg_study_${learn}_${learn}_${cefr}_${track.key}`,
    shortLabel: track.shortLabel,
    label: `${learnMeta.flag} ${cefrUpper} · ${track.shortLabel}`,
    distractorMode: track.distractorMode || 'explicit',
    items: track.items,
    customParts: track.parts
  }));

  return [...monolingualConfigs, ...pairedConfigs];
}

function buildGermanA1StudyCourse() {
  if (
    typeof STUDY_DE_A1_VOCAB_CORE === 'undefined' ||
    typeof STUDY_DE_A1_ARTICLES_AKK === 'undefined' ||
    typeof STUDY_DE_A1_VERBS === 'undefined' ||
    typeof STUDY_DE_A1_GRAMMAR === 'undefined' ||
    typeof STUDY_DE_A1_PHRASES_CORE === 'undefined' ||
    typeof STUDY_DE_A1_PACKS === 'undefined'
  ) {
    return null;
  }

  const vocabSetDefs = [
    { keys: ['basics'], label: '⏰ Basics & Time' },
    { keys: ['people'], label: '👪 People & Family' },
    { keys: ['home'], label: '🏠 Home & Routine' },
    { keys: ['food'], label: '🍎 Food & Shopping' },
    { keys: ['city'], label: '🚆 City & Travel' },
    { keys: ['work'], label: '💼 Work & Free Time' },
    { keys: ['verbs_adj'], label: '✨ Verbs & Qualities' }
  ];
  const vocabParts = buildPartsFromSetKeys(STUDY_DE_A1_VOCAB_CORE, vocabSetDefs, 2);

  const verbSetDefs = [
    { keys: ['core'], label: '⭐ sein, haben & Modals' },
    { keys: ['regular'], label: '✅ Regular Present' },
    { keys: ['stem'], label: '🔀 Stem-Changing' },
    { keys: ['perfekt'], label: '⏪ Separable & Perfekt' }
  ];
  const verbParts = buildPartsFromSetKeys(STUDY_DE_A1_VERBS, verbSetDefs, 4);

  const grammarSetDefs = [
    { keys: ['word_order'], label: '❓ Word Order & Questions' },
    { keys: ['neg_pron'], label: '🚫 Pronouns & Negation' },
    { keys: ['cases'], label: '📚 Cases & Plurals' },
    { keys: ['preps'], label: '📍 Prepositions' },
    { keys: ['modals'], label: '🔗 Modals & Connectors' }
  ];
  const grammarParts = buildPartsFromSetKeys(STUDY_DE_A1_GRAMMAR, grammarSetDefs, 4);

  const phraseSetDefs = [
    { keys: ['intro'], label: '👋 Greetings & Intro' },
    { keys: ['shop'], label: '☕ Café & Shopping' },
    { keys: ['travel'], label: '🧭 Directions & Travel' },
    { keys: ['daily'], label: '🏥 Time & Health' }
  ];
  const phraseParts = buildPartsFromSetKeys(STUDY_DE_A1_PHRASES_CORE, phraseSetDefs, 2);

  const articleItems = [];
  const artGroup1 = [];
  const artGroup2 = [];
  const artGroup3 = [];
  const artGroup4 = [];
  const allArticles = ['der', 'die', 'das'];

  STUDY_DE_A1_VOCAB_CORE.forEach(([de, pos, setKey]) => {
    if (pos !== 'n') return;
    const match = de.match(/^(der|die|das)\s+(.+)$/);
    if (!match) return;
    const article = match[1];
    const noun = match[2];
    const distractors = allArticles.filter(a => a !== article);
    const hint = getGermanNounSuffixHint(noun, article);
    const prompt = GERMAN_ARTICLE_PROMPT_DISAMBIG[noun] || `___ ${noun}`;
    const idx = articleItems.length;
    articleItems.push([prompt, article, distractors, hint]);
    if (setKey === 'people' || setKey === 'home') {
      artGroup1.push(idx);
    } else if (setKey === 'food' || setKey === 'city') {
      artGroup2.push(idx);
    } else {
      artGroup3.push(idx);
    }
  });

  STUDY_DE_A1_ARTICLES_AKK.forEach(([prompt, correct, distractors, ruleNote]) => {
    const idx = articleItems.length;
    articleItems.push([prompt, correct, distractors, ruleNote]);
    artGroup4.push(idx);
  });

  const articleParts = [
    { label: '🏠 People & Home', indices: artGroup1 },
    { label: '🍎 Food & City', indices: artGroup2 },
    { label: '💼 Work & Time', indices: artGroup3 },
    { label: '⚖️ Nom vs Akk', indices: artGroup4 }
  ];

  return {
    learn: 'de',
    cefr: 'a1',
    preferredPackOrder: ['en', 'pt', 'es', 'fr'],
    packs: STUDY_DE_A1_PACKS,
    vocabCore: STUDY_DE_A1_VOCAB_CORE,
    vocabParts,
    phrasesCore: STUDY_DE_A1_PHRASES_CORE,
    phraseParts,
    monolingualTracks: [
      {
        key: 'grammar',
        shortLabel: '📐 Grammar',
        items: STUDY_DE_A1_GRAMMAR.map(([p, c, d, note]) => [p, c, d, note]),
        parts: grammarParts
      },
      {
        key: 'verbs',
        shortLabel: '⚡ Verbs & Conjugation',
        items: STUDY_DE_A1_VERBS.map(([p, c, d, note]) => [p, c, d, note]),
        parts: verbParts
      },
      {
        key: 'articles',
        shortLabel: '🏷️ Articles & Gender',
        items: articleItems,
        parts: articleParts
      }
    ]
  };
}

const STUDY_COURSES = [
  buildGermanA1StudyCourse()
].filter(Boolean);

function buildStudyQuizConfigs() {
  return STUDY_COURSES.flatMap(buildConfigsForStudyCourse);
}

const BASE_QUIZ_CONFIGS = [
  // Geography (12 configs across 193 UN member states: Country, Flag, Capital, Map)
  {
    id: 'cfg_geo_flag_country',
    category: 'geo',
    type: 'quiz',
    label: '🚩 Flag → 🌐 Country',
    isFlagPrompt: true,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country, flag]) => [flag, country])
  },
  {
    id: 'cfg_geo_country_flag',
    category: 'geo',
    type: 'quiz',
    label: '🌐 Country → 🚩 Flag',
    isFlagPrompt: false,
    isFlagChoice: true,
    items: UN_MEMBER_STATES.map(([country, flag]) => [country, flag])
  },
  {
    id: 'cfg_geo_country_capital',
    category: 'geo',
    type: 'quiz',
    label: '🌐 Country → 🏛️ Capital',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country, , capital]) => [country, capital])
  },
  {
    id: 'cfg_geo_capital_country',
    category: 'geo',
    type: 'quiz',
    label: '🏛️ Capital → 🌐 Country',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country, , capital]) => [capital, country])
  },
  {
    id: 'cfg_geo_flag_capital',
    category: 'geo',
    type: 'quiz',
    label: '🚩 Flag → 🏛️ Capital',
    isFlagPrompt: true,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([, flag, capital]) => [flag, capital])
  },
  {
    id: 'cfg_geo_capital_flag',
    category: 'geo',
    type: 'quiz',
    label: '🏛️ Capital → 🚩 Flag',
    isFlagPrompt: false,
    isFlagChoice: true,
    items: UN_MEMBER_STATES.map(([, flag, capital]) => [capital, flag])
  },
  {
    id: 'cfg_geo_map_country',
    category: 'geo',
    type: 'quiz',
    label: '🗺️ Map → 🌐 Country',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country]) => ['map:' + country, country])
  },
  {
    id: 'cfg_geo_country_map',
    category: 'geo',
    type: 'quiz',
    label: '🌐 Country → 🗺️ Map',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country]) => [country, 'map:' + country])
  },
  {
    id: 'cfg_geo_map_flag',
    category: 'geo',
    type: 'quiz',
    label: '🗺️ Map → 🚩 Flag',
    isFlagPrompt: false,
    isFlagChoice: true,
    items: UN_MEMBER_STATES.map(([country, flag]) => ['map:' + country, flag])
  },
  {
    id: 'cfg_geo_flag_map',
    category: 'geo',
    type: 'quiz',
    label: '🚩 Flag → 🗺️ Map',
    isFlagPrompt: true,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country, flag]) => [flag, 'map:' + country])
  },
  {
    id: 'cfg_geo_map_capital',
    category: 'geo',
    type: 'quiz',
    label: '🗺️ Map → 🏛️ Capital',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country, , capital]) => ['map:' + country, capital])
  },
  {
    id: 'cfg_geo_capital_map',
    category: 'geo',
    type: 'quiz',
    label: '🏛️ Capital → 🗺️ Map',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: UN_MEMBER_STATES.map(([country, , capital]) => [capital, 'map:' + country])
  },

  // Language (50 configs: 20 Translations, 10 Emoji↔Lang, 5 Synonym, 5 Antonym, 10 Idiom↔Meaning)
  ...buildLanguageQuizConfigs(),

  // Study (CEFR / Proficiency standards — German A1 with DE, EN, PT-BR, ES & FR)
  ...buildStudyQuizConfigs(),

  // Other (4 configs: 118 IUPAC chemical elements & 36 International Morse Code characters)
  {
    id: 'cfg_chem_symbol_name',
    category: 'other',
    type: 'quiz',
    label: '🏷️ Symbol → ⚛️ Element',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: CHEMICAL_ELEMENTS_118.map(([sym, name]) => [sym, name])
  },
  {
    id: 'cfg_chem_name_symbol',
    category: 'other',
    type: 'quiz',
    label: '⚛️ Element → 🏷️ Symbol',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: CHEMICAL_ELEMENTS_118.map(([sym, name]) => [name, sym])
  },
  {
    id: 'cfg_other_morse_char',
    category: 'other',
    type: 'quiz',
    label: '📡 Morse → 🔤 Character',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: MORSE_CODE_36.map(([ch, morse]) => [morse, ch])
  },
  {
    id: 'cfg_other_char_morse',
    category: 'other',
    type: 'quiz',
    label: '🔤 Character → 📡 Morse',
    isFlagPrompt: false,
    isFlagChoice: false,
    items: MORSE_CODE_36.map(([ch, morse]) => [ch, morse])
  }
];

const GEO_AMERICAS_SET = new Set([
  'Antigua and Barbuda', 'Argentina', 'Bahamas', 'Barbados', 'Belize',
  'Bolivia', 'Brazil', 'Canada', 'Chile', 'Colombia', 'Costa Rica', 'Cuba',
  'Dominica', 'Dominican Republic', 'Ecuador', 'El Salvador', 'Grenada',
  'Guatemala', 'Guyana', 'Haiti', 'Honduras', 'Jamaica', 'Mexico',
  'Nicaragua', 'Panama', 'Paraguay', 'Peru', 'Saint Kitts and Nevis',
  'Saint Lucia', 'Saint Vincent and the Grenadines', 'Suriname',
  'Trinidad and Tobago', 'United States', 'Uruguay', 'Venezuela'
]);

// 43 UN European states + 6 transcontinental states (Armenia, Azerbaijan, Cyprus, Georgia, Kazakhstan, Türkiye)
const GEO_EUROPE_SET = new Set([
  'Albania', 'Andorra', 'Armenia', 'Austria', 'Azerbaijan', 'Belarus',
  'Belgium', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus',
  'Czechia', 'Denmark', 'Estonia', 'Finland', 'France', 'Georgia',
  'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy',
  'Kazakhstan', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands',
  'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia',
  'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
  'Switzerland', 'Türkiye', 'Ukraine', 'United Kingdom'
]);

const GEO_AFRICA_SET = new Set([
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cameroon', 'Central African Republic', 'Chad', 'Comoros',
  'Congo', "Côte d'Ivoire", 'Djibouti', 'DR Congo', 'Egypt',
  'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'Gambia',
  'Ghana', 'Guinea', 'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia',
  'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius',
  'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda',
  'São Tomé and Príncipe', 'Senegal', 'Seychelles', 'Sierra Leone',
  'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo',
  'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe'
]);

function buildRangeIndices(start, end) {
  const arr = [];
  for (let i = start; i < end; i++) arr.push(i);
  return arr;
}

function getGeoRegionParts() {
  const americas = [];
  const europe = [];
  const africa = [];
  const asiaOceania = [];
  UN_MEMBER_STATES.forEach(([country], idx) => {
    if (GEO_AMERICAS_SET.has(country)) americas.push(idx);
    else if (GEO_EUROPE_SET.has(country)) europe.push(idx);
    else if (GEO_AFRICA_SET.has(country)) africa.push(idx);
    else asiaOceania.push(idx);
  });
  return [
    { label: 'Americas', indices: americas },
    { label: 'Europe', indices: europe },
    { label: 'Africa', indices: africa },
    { label: 'Asia & Oceania', indices: asiaOceania }
  ];
}

function getMorseSignalParts() {
  const p1 = [];
  const p2 = [];
  const p3 = [];
  const p4 = [];
  MORSE_CODE_36.forEach(([, code], idx) => {
    const len = String(code).replace(/\s+/g, '').length;
    if (len <= 2) p1.push(idx);
    else if (len === 3) p2.push(idx);
    else if (len === 4) p3.push(idx);
    else p4.push(idx);
  });
  return [
    { label: '1–2 Signals', indices: p1 },
    { label: '3 Signals', indices: p2 },
    { label: '4 Signals', indices: p3 },
    { label: '5 Signals', indices: p4 }
  ];
}

function getPartsForBaseQuizConfig(base) {
  if (Array.isArray(base.customParts) && base.customParts.length > 0) {
    return base.customParts;
  }
  if (base.id.startsWith('cfg_geo_')) {
    return getGeoRegionParts();
  }
  if (base.id.startsWith('cfg_chem_')) {
    return [
      { label: '1–30', indices: buildRangeIndices(0, 30) },
      { label: '31–56', indices: buildRangeIndices(30, 56) },
      { label: '57–88', indices: buildRangeIndices(56, 88) },
      { label: '89–118', indices: buildRangeIndices(88, 118) }
    ];
  }
  if (base.id.includes('morse')) {
    return getMorseSignalParts();
  }
  if (base.id.startsWith('cfg_lang_synonym') || base.id.startsWith('cfg_lang_antonym')) {
    return [
      { label: '1–75', indices: buildRangeIndices(0, 75) },
      { label: '76–150', indices: buildRangeIndices(75, 150) },
      { label: '151–225', indices: buildRangeIndices(150, 225) },
      { label: '226–300', indices: buildRangeIndices(225, 300) }
    ];
  }
  if (base.id.startsWith('cfg_lang_idiom_meaning') || base.id.startsWith('cfg_lang_meaning_idiom')) {
    return [
      { label: '1–50', indices: buildRangeIndices(0, 50) },
      { label: '51–100', indices: buildRangeIndices(50, 100) },
      { label: '101–150', indices: buildRangeIndices(100, 150) },
      { label: '151–200', indices: buildRangeIndices(150, 200) }
    ];
  }
  return [
    { label: '1–250', indices: buildRangeIndices(0, 250) },
    { label: '251–500', indices: buildRangeIndices(250, 500) },
    { label: '501–750', indices: buildRangeIndices(500, 750) },
    { label: '751–1000', indices: buildRangeIndices(750, 1000) }
  ];
}

function buildSplitQuizConfigs(baseConfigs) {
  const result = [];
  baseConfigs.forEach((base) => {
    result.push(base);
    const parts = getPartsForBaseQuizConfig(base);
    parts.forEach((part, idx) => {
      result.push({
        id: `${base.id}_p${idx + 1}`,
        parentId: base.id,
        partIndex: idx + 1,
        partLabel: part.label,
        isMini: true,
        category: base.category,
        ...(base.langs ? { langs: base.langs } : {}),
        ...(base.studyLearn ? { studyLearn: base.studyLearn } : {}),
        ...(base.studyWith ? { studyWith: base.studyWith } : {}),
        ...(base.studyCefr ? { studyCefr: base.studyCefr } : {}),
        ...(base.distractorMode ? { distractorMode: base.distractorMode } : {}),
        ...(base.shortLabel ? { shortLabel: base.shortLabel } : {}),
        type: 'quiz',
        label: `${base.label} · ${part.label}`,
        isFlagPrompt: base.isFlagPrompt,
        isFlagChoice: base.isFlagChoice,
        items: part.indices.map(i => base.items[i])
      });
    });
  });
  return result;
}

const BUILTIN_QUIZ_CONFIGS = buildSplitQuizConfigs(BASE_QUIZ_CONFIGS);
