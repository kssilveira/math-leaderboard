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

const FALLBACK_STUDY_LANGUAGE_META = {
  de: { name: 'German', flag: '🇩🇪' },
  en: { name: 'English', flag: '🇬🇧' },
  pt: { name: 'Portuguese', flag: '🇧🇷' },
  es: { name: 'Spanish', flag: '🇪🇸' },
  fr: { name: 'French', flag: '🇫🇷' }
};
const STUDY_LANGUAGE_META =
  typeof window !== 'undefined' && window.STUDY_LANGUAGE_META
    ? window.STUDY_LANGUAGE_META
    : FALLBACK_STUDY_LANGUAGE_META;
const STUDY_CEFR_ORDER =
  typeof window !== 'undefined' && Array.isArray(window.STUDY_CEFR_ORDER)
    ? window.STUDY_CEFR_ORDER
    : ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

const GERMAN_PLURAL_ONLY_NOUNS = new Set([
  'Leute', 'Eltern', 'Geschwister', 'Großeltern',
  'Ferien', 'Nebenkosten', 'Lebensmittel', 'Daten',
  'Halsschmerzen', 'Kopfschmerzen', 'Bauchschmerzen', 'Zahnschmerzen'
]);
const GERMAN_MASC_TIME_NOUNS = new Set([
  'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag',
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  'Frühling', 'Sommer', 'Herbst', 'Winter'
]);
const GERMAN_MASC_COMPASS_NOUNS = new Set(['Norden', 'Süden', 'Osten', 'Westen']);
const GERMAN_NEUT_LANG_NOUNS = new Set(['Deutsch', 'Englisch', 'Spanisch', 'Französisch', 'Portugiesisch']);
const GERMAN_MASC_ER_AGENT_NOUNS = new Set([
  'Lehrer', 'Schüler', 'Verkäufer', 'Kellner', 'Fahrer', 'Partner',
  'Arbeiter', 'Mitarbeiter', 'Besucher', 'Bäcker', 'Rentner', 'Raucher',
  'Mieter', 'Vermieter', 'Absender', 'Empfänger', 'Anfänger', 'Sportler',
  'Künstler', 'Musiker', 'Techniker', 'Handwerker', 'Mechaniker',
  'Apotheker', 'Politiker',
  'Bewerber', 'Krankenpfleger', 'Fußgänger', 'Radfahrer', 'Autofahrer',
  'Programmierer', 'Manager', 'Berater', 'Übersetzer', 'Teilnehmer',
  'Zuschauer', 'Zuhörer', 'Schauspieler', 'Gewinner'
]);
const GERMAN_MASC_ER_DEVICE_NOUNS = new Set([
  'Fernseher', 'Computer', 'Drucker', 'Wecker', 'Kugelschreiber',
  'Stecker', 'Schalter', 'Staubsauger', 'Toaster', 'Trockner',
  'Geschirrspüler', 'Wasserkocher', 'Kopfhörer', 'Lautsprecher', 'Reiseführer'
]);
const GERMAN_ARTICLE_PROMPT_DISAMBIG = {
  See: '___ See (≠ Meer)',
  Moment: '___ Moment (Zeit)',
  Leiter: '___ Leiter (Treppe / Gerät)',
  Steuer: '___ Steuer (Abgabe / Finanzamt)',
  Gehalt: '___ Gehalt (Lohn)',
  Verdienst: '___ Verdienst (Lohn)',
  Kunde: '___ Kunde (Käufer)',
  Schild: '___ Schild (Verkehr)',
  Band: '___ Band (Musik)',
  Tor: '___ Tor (Fußball / Tür)',
  Stift: '___ Stift (Schreiben)'
};
const GERMAN_DUAL_GENDER_HINTS = {
  Liter: 'der/das (Duden)',
  Laptop: 'der/das (Duden)',
  'E-Mail': 'die (AT/CH: das)',
  Radio: 'das (südd.: der)'
};

function getGermanNounSuffixHint(noun, article) {
  if (GERMAN_DUAL_GENDER_HINTS[noun]) return GERMAN_DUAL_GENDER_HINTS[noun];
  if (article === 'die') {
    if (GERMAN_PLURAL_ONLY_NOUNS.has(noun)) return 'Pl. → die';
    if (noun.endsWith('ung')) return '-ung → die';
    if (noun.endsWith('heit')) return '-heit → die';
    if (noun.endsWith('keit')) return '-keit → die';
    if (noun.endsWith('schaft')) return '-schaft → die';
    if (noun.endsWith('tion')) return '-tion → die';
    if (noun.endsWith('tät')) return '-tät → die';
    if (noun.endsWith('ei')) return '-ei → die';
    if (noun.endsWith('ik')) return '-ik → die';
    if (noun.endsWith('ie') && noun.length > 4) return '-ie → die';
    if (noun.endsWith('age') && !/(?:frage|sage|lage|waage|klage|plage)$/i.test(noun)) return '-age → die';
    if (noun.endsWith('ur') && noun.length > 4) return '-ur → die';
    if (noun.endsWith('anz') || noun.endsWith('enz')) return '-anz/-enz → die';
    if (noun.endsWith('in') && noun.length > 4 && noun !== 'Medizin') return '-in (♀) → die';
    return 'fem. (die)';
  }
  if (article === 'das') {
    if (GERMAN_NEUT_LANG_NOUNS.has(noun)) return 'Sprache → das';
    if (noun.endsWith('chen')) return '-chen → das';
    if (noun.endsWith('lein')) return '-lein → das';
    if (noun.endsWith('um')) return '-um → das';
    if (noun.endsWith('ment')) return '-ment → das';
    if (noun.endsWith('tum')) return '-tum → das';
    if (noun.endsWith('nis')) return '-nis → das';
    return 'neutr. (das)';
  }
  if (GERMAN_MASC_TIME_NOUNS.has(noun)) return 'Tag/Monat/Zeit → der';
  if (GERMAN_MASC_COMPASS_NOUNS.has(noun)) return 'Himmelsr. → der';
  if (GERMAN_MASC_ER_AGENT_NOUNS.has(noun)) return '-er (♂) → der';
  if (GERMAN_MASC_ER_DEVICE_NOUNS.has(noun)) return '-er (Gerät) → der';
  if (noun.endsWith('ling')) return '-ling → der';
  if (noun.endsWith('ist')) return '-ist → der';
  if (noun.endsWith('or') && noun.length > 4) return '-or → der';
  if (noun.endsWith('ismus')) return '-ismus → der';
  if (noun.endsWith('ant') && noun.length > 4) return '-ant → der';
  if (noun.endsWith('ent') && noun.length > 4 && noun !== 'Moment') return '-ent → der';
  return 'mask. (der)';
}

function getPhraseEndingPunct(text) {
  const last = String(text || '').trim().slice(-1);
  if (last === '?' || last === '!') return last;
  return '.';
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

function getStudyCoursesMetaList() {
  return typeof window !== 'undefined' && Array.isArray(window.STUDY_COURSES_META)
    ? window.STUDY_COURSES_META
    : (typeof STUDY_COURSES_META !== 'undefined' && Array.isArray(STUDY_COURSES_META) ? STUDY_COURSES_META : []);
}

function buildStudyStubConfigsFromCourseMeta(courseMeta) {
  const { learn, learnFlag, cefr, withLangs = [], monolingualTracks = [], partDefs = {} } = courseMeta;
  const learnMeta = STUDY_LANGUAGE_META[learn] || { name: learn.toUpperCase(), flag: learnFlag || '🏳️' };
  const learnTag = `${learnMeta.flag} ${learn.toUpperCase()}`;
  const cefrUpper = String(cefr || '').toUpperCase();
  const baseMeta = {
    category: 'study',
    type: 'quiz',
    studyLearn: learn,
    studyCefr: cefr,
    isLazyStudy: true,
    studyDataLoaded: false,
    isFlagPrompt: false,
    isFlagChoice: false
  };
  const emptyParts = (defs) => (defs || []).map(def => ({ label: def.label, indices: [] }));

  const monolingualConfigs = monolingualTracks.map((track) => ({
    ...baseMeta,
    studyWith: learn,
    studyTrackKey: track.key,
    id: `cfg_study_${learn}_${learn}_${cefr}_${track.key}`,
    shortLabel: track.label,
    label: `${learnMeta.flag} ${cefrUpper} · ${track.label}`,
    distractorMode: track.distractorMode || 'explicit',
    items: [],
    customParts: emptyParts(partDefs[track.key])
  }));

  const pairedConfigs = [];
  withLangs.forEach((lang) => {
    const code = lang.code;
    const langMeta = STUDY_LANGUAGE_META[code] || { name: code.toUpperCase(), flag: lang.flag || '🏳️' };
    const withTag = `${langMeta.flag} ${code.toUpperCase()}`;
    pairedConfigs.push(
      {
        ...baseMeta,
        studyWith: code,
        studyTrackKey: 'vocab_fwd',
        id: `cfg_study_${learn}_${code}_${cefr}_vocab_${learn}_${code}`,
        shortLabel: `🔤 Words ${learnTag} → ${withTag}`,
        label: `${learnMeta.flag} ${cefrUpper} · 🔤 Words ${learnTag} → ${withTag}`,
        distractorMode: 'pos_pool',
        items: [],
        customParts: emptyParts(partDefs.vocab)
      },
      {
        ...baseMeta,
        studyWith: code,
        studyTrackKey: 'vocab_rev',
        id: `cfg_study_${learn}_${code}_${cefr}_vocab_${code}_${learn}`,
        shortLabel: `🔤 Words ${withTag} → ${learnTag}`,
        label: `${learnMeta.flag} ${cefrUpper} · 🔤 Words ${withTag} → ${learnTag}`,
        distractorMode: 'pos_pool',
        items: [],
        customParts: emptyParts(partDefs.vocab)
      },
      {
        ...baseMeta,
        studyWith: code,
        studyTrackKey: 'phrases_fwd',
        id: `cfg_study_${learn}_${code}_${cefr}_phrases_${learn}_${code}`,
        shortLabel: `🗣️ Phrases ${learnTag} → ${withTag}`,
        label: `${learnMeta.flag} ${cefrUpper} · 🗣️ Phrases ${learnTag} → ${withTag}`,
        distractorMode: 'pos_pool',
        items: [],
        customParts: emptyParts(partDefs.phrases)
      },
      {
        ...baseMeta,
        studyWith: code,
        studyTrackKey: 'phrases_rev',
        id: `cfg_study_${learn}_${code}_${cefr}_phrases`,
        shortLabel: `🗣️ Phrases ${withTag} → ${learnTag}`,
        label: `${learnMeta.flag} ${cefrUpper} · 🗣️ Phrases ${withTag} → ${learnTag}`,
        distractorMode: 'explicit',
        items: [],
        customParts: emptyParts(partDefs.phrases)
      }
    );
  });

  return [...monolingualConfigs, ...pairedConfigs];
}

function buildStudyQuizConfigs() {
  return getStudyCoursesMetaList().flatMap(buildStudyStubConfigsFromCourseMeta);
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

  // Study (CEFR / Proficiency standards — German A1 & A2 with DE, EN, PT-BR, ES & FR)
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
        ...(base.studyTrackKey ? { studyTrackKey: base.studyTrackKey } : {}),
        ...(base.isLazyStudy ? { isLazyStudy: true, studyDataLoaded: Boolean(base.studyDataLoaded) } : {}),
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

const STUDY_CONFIGS_BY_ID = new Map();
BUILTIN_QUIZ_CONFIGS.forEach((cfg) => {
  if (cfg && cfg.isLazyStudy) {
    STUDY_CONFIGS_BY_ID.set(cfg.id, cfg);
  }
});

const studyScriptPromises = new Map();
const studyCourseLoadPromises = new Map();

function loadStudyScriptOnce(src) {
  if (studyScriptPromises.has(src)) {
    return studyScriptPromises.get(src);
  }
  const promise = new Promise((resolve, reject) => {
    if (typeof document === 'undefined' || !document.head) {
      reject(new Error('Document head unavailable'));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      studyScriptPromises.delete(src);
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
  studyScriptPromises.set(src, promise);
  return promise;
}

function getLoadedStudyCourseRawData(learn, cefr) {
  if (learn === 'de' && cefr === 'a1') {
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
    return {
      vocabCore: STUDY_DE_A1_VOCAB_CORE,
      artExtra: STUDY_DE_A1_ARTICLES_AKK,
      verbs: STUDY_DE_A1_VERBS,
      grammar: STUDY_DE_A1_GRAMMAR,
      phrasesCore: STUDY_DE_A1_PHRASES_CORE,
      packs: STUDY_DE_A1_PACKS,
      initialVocabCount: 717
    };
  }
  if (learn === 'de' && cefr === 'a2') {
    if (
      typeof STUDY_DE_A2_VOCAB_CORE === 'undefined' ||
      typeof STUDY_DE_A2_ARTICLES_CASES === 'undefined' ||
      typeof STUDY_DE_A2_VERBS === 'undefined' ||
      typeof STUDY_DE_A2_GRAMMAR === 'undefined' ||
      typeof STUDY_DE_A2_PHRASES_CORE === 'undefined' ||
      typeof STUDY_DE_A2_PACKS === 'undefined'
    ) {
      return null;
    }
    return {
      vocabCore: STUDY_DE_A2_VOCAB_CORE,
      artExtra: STUDY_DE_A2_ARTICLES_CASES,
      verbs: STUDY_DE_A2_VERBS,
      grammar: STUDY_DE_A2_GRAMMAR,
      phrasesCore: STUDY_DE_A2_PHRASES_CORE,
      packs: STUDY_DE_A2_PACKS,
      initialVocabCount: null
    };
  }
  return null;
}

function buildGermanArticleTrackData(vocabCore, artExtra, articlePartDefs, initialVocabCount) {
  const items = [];
  const groups = articlePartDefs.map(() => []);
  const allArticles = ['der', 'die', 'das'];
  const keyToGroupIdx = new Map();
  let extraGroupIdx = articlePartDefs.length - 1;
  articlePartDefs.forEach((def, idx) => {
    (def.keys || []).forEach((k) => {
      if (k === 'extra') extraGroupIdx = idx;
      else keyToGroupIdx.set(k, idx);
    });
  });

  const pushNounArticleItem = ([de, pos, setKey]) => {
    if (pos !== 'n') return;
    const match = de.match(/^(der|die|das)\s+(.+)$/);
    if (!match) return;
    const article = match[1];
    const noun = match[2];
    const distractors = allArticles.filter(a => a !== article);
    const hint = getGermanNounSuffixHint(noun, article);
    const prompt = GERMAN_ARTICLE_PROMPT_DISAMBIG[noun] || `___ ${noun}`;
    const idx = items.length;
    items.push([prompt, article, distractors, hint]);
    const gIdx = keyToGroupIdx.has(setKey) ? keyToGroupIdx.get(setKey) : Math.max(0, extraGroupIdx - 1);
    if (groups[gIdx]) groups[gIdx].push(idx);
  };

  if (typeof initialVocabCount === 'number' && initialVocabCount > 0) {
    vocabCore.slice(0, initialVocabCount).forEach(pushNounArticleItem);
    artExtra.forEach(([prompt, correct, distractors, ruleNote]) => {
      const idx = items.length;
      items.push([prompt, correct, distractors, ruleNote]);
      if (groups[extraGroupIdx]) groups[extraGroupIdx].push(idx);
    });
    vocabCore.slice(initialVocabCount).forEach(pushNounArticleItem);
  } else {
    vocabCore.forEach(pushNounArticleItem);
    artExtra.forEach(([prompt, correct, distractors, ruleNote]) => {
      const idx = items.length;
      items.push([prompt, correct, distractors, ruleNote]);
      if (groups[extraGroupIdx]) groups[extraGroupIdx].push(idx);
    });
  }

  const parts = articlePartDefs.map((def, idx) => ({
    label: def.label,
    indices: groups[idx]
  }));
  return { items, parts };
}

function hydrateStudyTrack(baseId, items, parts) {
  const baseCfg = STUDY_CONFIGS_BY_ID.get(baseId);
  if (!baseCfg) return;
  baseCfg.items = items;
  baseCfg.customParts = parts;
  baseCfg.studyDataLoaded = true;
  parts.forEach((part, idx) => {
    const partCfg = STUDY_CONFIGS_BY_ID.get(`${baseId}_p${idx + 1}`);
    if (partCfg) {
      partCfg.items = part.indices.map(i => items[i]);
      partCfg.studyDataLoaded = true;
    }
  });
}

function hydrateStudyCourseData(learn, cefr, withLang = '') {
  const raw = getLoadedStudyCourseRawData(learn, cefr);
  const courseMeta = getStudyCoursesMetaList().find(c => c.learn === learn && c.cefr === cefr);
  if (!raw || !courseMeta) return false;

  const partDefs = courseMeta.partDefs || {};
  const grammarBaseId = `cfg_study_${learn}_${learn}_${cefr}_grammar`;
  const grammarCfg = STUDY_CONFIGS_BY_ID.get(grammarBaseId);
  if (grammarCfg && !grammarCfg.studyDataLoaded) {
    const grammarItems = raw.grammar.map(([p, c, d, note]) => [p, c, d, note]);
    const grammarParts = buildPartsFromSetKeys(raw.grammar, partDefs.grammar || [], 4);
    hydrateStudyTrack(grammarBaseId, grammarItems, grammarParts);
  }

  const verbsBaseId = `cfg_study_${learn}_${learn}_${cefr}_verbs`;
  const verbsCfg = STUDY_CONFIGS_BY_ID.get(verbsBaseId);
  if (verbsCfg && !verbsCfg.studyDataLoaded) {
    const verbItems = raw.verbs.map(([p, c, d, note]) => [p, c, d, note]);
    const verbParts = buildPartsFromSetKeys(raw.verbs, partDefs.verbs || [], 4);
    hydrateStudyTrack(verbsBaseId, verbItems, verbParts);
  }

  const articlesBaseId = `cfg_study_${learn}_${learn}_${cefr}_articles`;
  const articlesCfg = STUDY_CONFIGS_BY_ID.get(articlesBaseId);
  if (articlesCfg && !articlesCfg.studyDataLoaded) {
    const artData = buildGermanArticleTrackData(
      raw.vocabCore,
      raw.artExtra,
      partDefs.articles || [],
      raw.initialVocabCount
    );
    hydrateStudyTrack(articlesBaseId, artData.items, artData.parts);
  }

  const packCodes = withLang && withLang !== learn ? [withLang] : Object.keys(raw.packs || {});
  packCodes.forEach((code) => {
    const pack = raw.packs && raw.packs[code];
    if (
      !pack ||
      !Array.isArray(pack.vocab) ||
      !Array.isArray(pack.phrases) ||
      pack.vocab.length !== raw.vocabCore.length ||
      pack.phrases.length !== raw.phrasesCore.length
    ) {
      return;
    }

    const vocabFwdId = `cfg_study_${learn}_${code}_${cefr}_vocab_${learn}_${code}`;
    const vocabFwdCfg = STUDY_CONFIGS_BY_ID.get(vocabFwdId);
    if (vocabFwdCfg && !vocabFwdCfg.studyDataLoaded) {
      const vocabParts = buildPartsFromSetKeys(raw.vocabCore, partDefs.vocab || [], 2);
      const vocabFwdItems = raw.vocabCore.map(([word, pos, setKey, hint], i) => [
        word,
        pack.vocab[i],
        pos,
        setKey,
        hint || ''
      ]);
      hydrateStudyTrack(vocabFwdId, vocabFwdItems, vocabParts);
    }

    const vocabRevId = `cfg_study_${learn}_${code}_${cefr}_vocab_${code}_${learn}`;
    const vocabRevCfg = STUDY_CONFIGS_BY_ID.get(vocabRevId);
    if (vocabRevCfg && !vocabRevCfg.studyDataLoaded) {
      const vocabParts = buildPartsFromSetKeys(raw.vocabCore, partDefs.vocab || [], 2);
      const vocabRevItems = raw.vocabCore.map(([word, pos, setKey, hint], i) => [
        pack.vocab[i],
        word,
        pos,
        setKey,
        hint || ''
      ]);
      hydrateStudyTrack(vocabRevId, vocabRevItems, vocabParts);
    }

    const phrasesFwdId = `cfg_study_${learn}_${code}_${cefr}_phrases_${learn}_${code}`;
    const phrasesFwdCfg = STUDY_CONFIGS_BY_ID.get(phrasesFwdId);
    if (phrasesFwdCfg && !phrasesFwdCfg.studyDataLoaded) {
      const phraseParts = buildPartsFromSetKeys(raw.phrasesCore, partDefs.phrases || [], 2);
      const phrasesFwdItems = raw.phrasesCore.map(([correct, , setKey], i) => {
        const [phrase, ruleNote] = pack.phrases[i];
        return [correct, phrase, getPhraseEndingPunct(correct), setKey, ruleNote];
      });
      hydrateStudyTrack(phrasesFwdId, phrasesFwdItems, phraseParts);
    }

    const phrasesRevId = `cfg_study_${learn}_${code}_${cefr}_phrases`;
    const phrasesRevCfg = STUDY_CONFIGS_BY_ID.get(phrasesRevId);
    if (phrasesRevCfg && !phrasesRevCfg.studyDataLoaded) {
      const phraseParts = buildPartsFromSetKeys(raw.phrasesCore, partDefs.phrases || [], 2);
      const phrasesRevItems = raw.phrasesCore.map(([correct, distractors], i) => {
        const [prompt, ruleNote] = pack.phrases[i];
        return [prompt, correct, distractors, ruleNote];
      });
      hydrateStudyTrack(phrasesRevId, phrasesRevItems, phraseParts);
    }
  });

  return true;
}

function hydrateAnyPreloadedStudyCourses() {
  getStudyCoursesMetaList().forEach((course) => {
    hydrateStudyCourseData(course.learn, course.cefr);
  });
}

hydrateAnyPreloadedStudyCourses();

function isStudyConfigLoaded(cfgOrId) {
  const cfg = typeof cfgOrId === 'string' ? STUDY_CONFIGS_BY_ID.get(cfgOrId) : cfgOrId;
  return !cfg || !cfg.isLazyStudy || Boolean(cfg.studyDataLoaded);
}

async function ensureStudyConfigLoaded(cfgOrId) {
  let cfg = typeof cfgOrId === 'string' ? STUDY_CONFIGS_BY_ID.get(cfgOrId) : cfgOrId;
  if (!cfg && typeof cfgOrId === 'string' && typeof window !== 'undefined' && typeof window.resolveStudyConfigIdAlias === 'function') {
    cfg = STUDY_CONFIGS_BY_ID.get(window.resolveStudyConfigIdAlias(cfgOrId));
  }
  if (!cfg || !cfg.isLazyStudy || cfg.studyDataLoaded) {
    return true;
  }

  const learn = cfg.studyLearn;
  const cefr = cfg.studyCefr;
  const withLang = cfg.studyWith && cfg.studyWith !== learn ? cfg.studyWith : '';
  if (!learn || !cefr) return false;

  const loadKey = `${learn}_${cefr}_${withLang || 'core'}`;
  if (studyCourseLoadPromises.has(loadKey)) {
    return studyCourseLoadPromises.get(loadKey);
  }

  const promise = (async () => {
    try {
      await loadStudyScriptOnce(`data/study-${learn}-${cefr}-core.js`);
      if (withLang) {
        await loadStudyScriptOnce(`data/study-${learn}-${cefr}-${withLang}.js`);
      }
      hydrateStudyCourseData(learn, cefr, withLang);
      return Boolean(cfg.studyDataLoaded);
    } catch (err) {
      console.error('Failed to load study pack:', loadKey, err);
      return false;
    } finally {
      studyCourseLoadPromises.delete(loadKey);
    }
  })();

  studyCourseLoadPromises.set(loadKey, promise);
  return promise;
}
