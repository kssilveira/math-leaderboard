// Built-in 2-Choice Quiz Configurations (datasets loaded from data/quiz-datasets.js)
const BASE_QUIZ_CONFIGS = [
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
  if (base.id === 'cfg_lang_synonym' || base.id === 'cfg_lang_antonym') {
    return [
      { label: '1–75', indices: buildRangeIndices(0, 75) },
      { label: '76–150', indices: buildRangeIndices(75, 150) },
      { label: '151–225', indices: buildRangeIndices(150, 225) },
      { label: '226–300', indices: buildRangeIndices(225, 300) }
    ];
  }
  if (base.id === 'cfg_lang_idiom_meaning' || base.id === 'cfg_lang_meaning_idiom') {
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
