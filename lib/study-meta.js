export const STUDY_LANGUAGE_META = {
  de: { name: 'German', flag: '🇩🇪', bcp47: 'de-DE' },
  en: { name: 'English', flag: '🇬🇧', bcp47: 'en-GB' },
  pt: { name: 'Portuguese', flag: '🇧🇷', bcp47: 'pt-BR' },
  es: { name: 'Spanish', flag: '🇪🇸', bcp47: 'es-ES' },
  fr: { name: 'French', flag: '🇫🇷', bcp47: 'fr-FR' },
};

export const QUIZ_LANG_ORDER = ['en', 'pt', 'es', 'fr', 'de'];

export const QUIZ_LANG_META = QUIZ_LANG_ORDER.map((code) => ({
  code,
  ...STUDY_LANGUAGE_META[code],
}));

export const STUDY_CEFR_ORDER = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

const DEFAULT_STUDY_PART_DEFS_BY_CEFR = {
  a1: {
    vocab: [
      { keys: ['basics'], label: '⏰ Basics & Time' },
      { keys: ['people'], label: '👪 People & Family' },
      { keys: ['home'], label: '🏠 Home & Routine' },
      { keys: ['food'], label: '🍎 Food & Shopping' },
      { keys: ['city'], label: '🚆 City & Travel' },
      { keys: ['work'], label: '💼 Work & Free Time' },
      { keys: ['verbs_adj'], label: '✨ Verbs & Qualities' },
    ],
    phrases: [
      { keys: ['intro'], label: '👋 Greetings & Intro' },
      { keys: ['shop'], label: '☕ Café & Shopping' },
      { keys: ['travel'], label: '🧭 Directions & Travel' },
      { keys: ['daily'], label: '🏥 Time & Health' },
    ],
  },
  a2: {
    vocab: [
      { keys: ['daily'], label: '🏠 Daily Life & Living' },
      { keys: ['social'], label: '💬 People & Feelings' },
      { keys: ['work'], label: '💼 Education & Work' },
      { keys: ['health'], label: '🩺 Health & Body' },
      { keys: ['travel'], label: '✈️ Travel & Mobility' },
      { keys: ['media'], label: '📱 Media, Culture & Leisure' },
      { keys: ['verbs_adj'], label: '✨ Verbs, Adjectives & Connectors' },
    ],
    phrases: [
      { keys: ['social'], label: '💬 Opinions & Invitations' },
      { keys: ['work'], label: '💼 Work, Study & Admin' },
      { keys: ['services'], label: '🛠️ Shopping, Housing & Complaints' },
      { keys: ['travel'], label: '🚆 Travel, Health & Emergencies' },
    ],
  },
};

export const STUDY_COURSES_META = [
  {
    learn: 'de',
    cefr: 'a1',
    nounArticlePattern: '^(der|die|das)\\s+(.+)$',
    helperScripts: ['data/study-article-helper.js', 'data/study-de-helpers.js'],
    withLangs: ['en', 'pt', 'es', 'fr'],
    monolingualTracks: [
      { key: 'grammar', label: '📐 Grammar' },
      { key: 'verbs', label: '⚡ Verbs & Conjugation' },
      { key: 'articles', label: '🏷️ Articles & Gender' },
    ],
    partDefs: {
      grammar: [
        { keys: ['word_order'], label: '❓ Word Order & Questions' },
        { keys: ['neg_pron'], label: '🚫 Pronouns & Negation' },
        { keys: ['cases'], label: '📚 Cases & Plurals' },
        { keys: ['preps'], label: '📍 Prepositions' },
        { keys: ['modals'], label: '🔗 Modals & Connectors' },
      ],
      verbs: [
        { keys: ['core'], label: '⭐ sein, haben & Modals' },
        { keys: ['regular'], label: '✅ Regular Present' },
        { keys: ['stem'], label: '🔀 Stem-Changing' },
        { keys: ['perfekt'], label: '⏪ Separable & Perfekt' },
      ],
      articles: [
        { keys: ['people', 'home'], label: '🏠 People & Home' },
        { keys: ['food', 'city'], label: '🍎 Food & City' },
        { keys: ['basics', 'work', 'verbs_adj'], label: '💼 Work & Time' },
        { keys: ['extra'], label: '⚖️ Nom vs Akk' },
      ],
    },
  },
  {
    learn: 'de',
    cefr: 'a2',
    nounArticlePattern: '^(der|die|das)\\s+(.+)$',
    helperScripts: ['data/study-article-helper.js', 'data/study-de-helpers.js'],
    withLangs: ['en', 'pt', 'es', 'fr'],
    monolingualTracks: [
      { key: 'grammar', label: '📐 Grammar' },
      { key: 'verbs', label: '⚡ Verbs & Conjugation' },
      { key: 'articles', label: '🏷️ Articles & Gender' },
    ],
    partDefs: {
      grammar: [
        { keys: ['nebensatz'], label: '🔀 Nebensätze (Verb am Ende)' },
        { keys: ['cases_pron'], label: '🎯 Dativ, Reflexiv & Relativ' },
        { keys: ['adj_comp'], label: '📊 Adjektive & Vergleiche' },
        { keys: ['preps'], label: '📍 Wechselpräpositionen & Zeit' },
        { keys: ['passiv_zu'], label: '🏗️ Infinitiv mit zu, werden & Passiv' },
      ],
      verbs: [
        { keys: ['reflexive'], label: '🔄 Reflexive Verbs' },
        { keys: ['prateritum'], label: '📜 Präteritum & Modals' },
        { keys: ['perfekt'], label: '⏪ Perfekt & Partizip II' },
        { keys: ['konj2_prep'], label: '💭 Konjunktiv II & Verb+Präp' },
      ],
      articles: [
        { keys: ['daily', 'social'], label: '🏠 Daily & Social' },
        { keys: ['work', 'health'], label: '💼 Work & Health' },
        { keys: ['travel', 'media', 'verbs_adj'], label: '✈️ Travel & Media' },
        { keys: ['extra'], label: '⚖️ Dativ & Adj.-Endungen' },
      ],
    },
  },
  {
    learn: 'en',
    cefr: 'a1',
    withLangs: ['pt', 'es', 'fr', 'de'],
    monolingualTracks: [
      { key: 'grammar', label: '📐 Grammar' },
      { key: 'verbs', label: '⚡ Verbs & Tenses' },
      { key: 'articles', label: '🏷️ Articles & Prepositions' },
    ],
    partDefs: {
      vocab: [
        { keys: ['basics'], label: '⏰ Basics & Time' },
        { keys: ['people'], label: '👪 People & Family' },
        { keys: ['home'], label: '🏠 Home & Routine' },
        { keys: ['food'], label: '🍎 Food & Shopping' },
        { keys: ['city'], label: '🚆 City & Travel' },
        { keys: ['work'], label: '💼 School, Work & Free Time' },
        { keys: ['verbs_adj'], label: '✨ Verbs & Qualities' },
      ],
      grammar: [
        { keys: ['word_order'], label: '❓ Questions & Word Order' },
        { keys: ['pronouns'], label: '👤 Pronouns & Possessives' },
        { keys: ['nouns_qty'], label: '📦 Plurals & Quantifiers' },
        { keys: ['adj_comp'], label: '📊 Adjectives & Comparisons' },
        { keys: ['connectors'], label: '🔗 Negation, Modals & Connectors' },
      ],
      verbs: [
        { keys: ['be_have'], label: '⭐ be, have & Modals' },
        { keys: ['present'], label: '✅ Present Simple & Continuous' },
        { keys: ['past'], label: '⏪ Past Simple (Reg. & Irreg.)' },
        { keys: ['future_imp'], label: '🔮 Future, Imperatives & Patterns' },
      ],
      articles: [
        { keys: ['a_an'], label: '🔤 a vs an' },
        { keys: ['the_zero'], label: '🏷️ the vs — (Zero Article)' },
        { keys: ['time_place'], label: '⏰ in / on / at (Time & Place)' },
        { keys: ['common_preps'], label: '🧭 Movement & Everyday Preps' },
      ],
      phrases: [
        { keys: ['intro'], label: '👋 Greetings & Intro' },
        { keys: ['shop'], label: '☕ Café & Shopping' },
        { keys: ['travel'], label: '🧭 Directions & Travel' },
        { keys: ['daily'], label: '🏥 Time & Daily Life' },
      ],
    },
  },
  {
    learn: 'en',
    cefr: 'a2',
    withLangs: ['pt', 'es', 'fr', 'de'],
    monolingualTracks: [
      { key: 'grammar', label: '📐 Grammar' },
      { key: 'verbs', label: '⚡ Verbs & Tenses' },
      { key: 'articles', label: '🏷️ Articles & Prepositions' },
    ],
    partDefs: {
      grammar: [
        { keys: ['clauses'], label: '🔀 Clauses & Relative Pronouns' },
        { keys: ['pronouns_qty'], label: '🎯 Pronouns, Quantifiers & Modifiers' },
        { keys: ['adj_adv'], label: '📊 Comparatives, Superlatives & Adverbs' },
        { keys: ['modals'], label: '⚙️ Modals & Obligation' },
        { keys: ['passive_inf'], label: '🏗️ Passive, Gerund & Infinitive' },
      ],
      verbs: [
        { keys: ['past_cont'], label: '⏪ Past Simple vs Continuous' },
        { keys: ['perf'], label: '✅ Present Perfect & Participles' },
        { keys: ['future_cond'], label: '🔮 Future Forms & Conditionals' },
        { keys: ['phrasal'], label: '🚀 Phrasal Verbs & Verb Patterns' },
      ],
      articles: [
        { keys: ['articles_a2'], label: '🏷️ Articles (a / an / the / —)' },
        { keys: ['time_dur'], label: '⏳ Time, Duration & Sequence' },
        { keys: ['verb_prep'], label: '🔗 Verb + Preposition' },
        { keys: ['adj_prep'], label: '✨ Adjective & Noun + Preposition' },
      ],
    },
  },
  {
    learn: 'pt',
    cefr: 'a1',
    nounArticlePattern: '^(o|a|os|as)\\s+(.+)$',
    helperScripts: ['data/study-article-helper.js', 'data/study-pt-helpers.js'],
    withLangs: ['en', 'es', 'fr', 'de'],
    monolingualTracks: [
      { key: 'grammar', label: '📐 Grammar' },
      { key: 'verbs', label: '⚡ Verbs & Conjugation' },
      { key: 'articles', label: '🏷️ Articles & Gender' },
    ],
    partDefs: {
      grammar: [
        { keys: ['ser_estar_neg'], label: '❓ Questions, Negation & ser/estar' },
        { keys: ['pronouns'], label: '👤 Pronouns & Possessives' },
        { keys: ['agreement'], label: '📊 Gender, Plurals & Adjectives' },
        { keys: ['preps'], label: '📍 Prepositions & Contractions' },
        { keys: ['connectors'], label: '🔗 Connectors, Modals & Expressions' },
      ],
      verbs: [
        { keys: ['ser_estar'], label: '⭐ ser, estar, ter & ir' },
        { keys: ['regular'], label: '✅ Regular Present (-ar/-er/-ir)' },
        { keys: ['irregular'], label: '🔀 Irregular Present & Gerund' },
        { keys: ['past_imp'], label: '⏪ Past (Perfeito) & Imperative' },
      ],
      articles: [
        { keys: ['people', 'home'], label: '🏠 People & Home' },
        { keys: ['food', 'city'], label: '🍎 Food & City' },
        { keys: ['basics', 'work', 'verbs_adj'], label: '💼 Work & Time' },
        { keys: ['extra'], label: '⚖️ Contractions & Indef. Articles' },
      ],
    },
  },
  {
    learn: 'pt',
    cefr: 'a2',
    nounArticlePattern: '^(o|a|os|as)\\s+(.+)$',
    helperScripts: ['data/study-article-helper.js', 'data/study-pt-helpers.js'],
    withLangs: ['en', 'es', 'fr', 'de'],
    monolingualTracks: [
      { key: 'grammar', label: '📐 Grammar' },
      { key: 'verbs', label: '⚡ Verbs & Conjugation' },
      { key: 'articles', label: '🏷️ Articles & Gender' },
    ],
    partDefs: {
      grammar: [
        { keys: ['clauses'], label: '🔀 Clauses, Relatives & Connectors' },
        { keys: ['pronouns_obj'], label: '🎯 Object, Reflexive & Indef. Pronouns' },
        { keys: ['comp_adv'], label: '📊 Comparatives, Superlatives & Adverbs' },
        { keys: ['por_para'], label: '🧭 por vs para & Prepositions' },
        { keys: ['passive_inf'], label: '🏗️ Passive, Infinitive & Structures' },
      ],
      verbs: [
        { keys: ['perf_imperf'], label: '⏪ Perfeito vs Imperfeito' },
        { keys: ['future_cond'], label: '🔮 Future, Conditional & Imperative' },
        { keys: ['reflexive'], label: '🔄 Reflexives & Participles' },
        { keys: ['subj_intro'], label: '💭 Present Subjunctive & Verb+Prep' },
      ],
      articles: [
        { keys: ['daily', 'social'], label: '🏠 Daily & Social' },
        { keys: ['work', 'health'], label: '💼 Work & Health' },
        { keys: ['travel', 'media', 'verbs_adj'], label: '✈️ Travel & Media' },
        { keys: ['extra'], label: '⚖️ Crase, Contractions & Demonstr.' },
      ],
    },
  },
  {
    learn: 'es',
    cefr: 'a1',
    nounArticlePattern: '^(el|la|los|las)\\s+(.+)$',
    helperScripts: ['data/study-article-helper.js', 'data/study-es-helpers.js'],
    withLangs: ['en', 'pt', 'fr', 'de'],
    monolingualTracks: [
      { key: 'grammar', label: '📐 Grammar' },
      { key: 'verbs', label: '⚡ Verbs & Conjugation' },
      { key: 'articles', label: '🏷️ Articles & Gender' },
    ],
    partDefs: {
      grammar: [
        { keys: ['ser_estar_neg'], label: '❓ Questions, Negation & ser/estar' },
        { keys: ['pronouns'], label: '👤 Pronouns, Possessives & gustar' },
        { keys: ['agreement'], label: '📊 Gender, Plurals & Adjectives' },
        { keys: ['preps'], label: '📍 Prepositions & Contractions' },
        { keys: ['connectors'], label: '🔗 Connectors, Modals & Expressions' },
      ],
      verbs: [
        { keys: ['ser_estar'], label: '⭐ ser, estar, tener, ir & hay' },
        { keys: ['regular'], label: '✅ Regular Present (-ar/-er/-ir)' },
        { keys: ['stem_irreg'], label: '🔀 Stem-Changing & Irregular Present' },
        { keys: ['past_gerund'], label: '⏪ Gerund, Perf. & Basic Past' },
      ],
      articles: [
        { keys: ['people', 'home'], label: '🏠 People & Home' },
        { keys: ['food', 'city'], label: '🍎 Food & City' },
        { keys: ['basics', 'work', 'verbs_adj'], label: '💼 Work & Time' },
        { keys: ['extra'], label: '⚖️ al/del, un/una & Exceptions' },
      ],
    },
  },
  {
    learn: 'es',
    cefr: 'a2',
    nounArticlePattern: '^(el|la|los|las)\\s+(.+)$',
    helperScripts: ['data/study-article-helper.js', 'data/study-es-helpers.js'],
    withLangs: ['en', 'pt', 'fr', 'de'],
    monolingualTracks: [
      { key: 'grammar', label: '📐 Grammar' },
      { key: 'verbs', label: '⚡ Verbs & Conjugation' },
      { key: 'articles', label: '🏷️ Articles & Gender' },
    ],
    partDefs: {
      grammar: [
        { keys: ['clauses'], label: '🔀 Clauses, Relatives & Connectors' },
        { keys: ['pronouns_obj'], label: '🎯 Object, Reflexive & Indef. Pronouns' },
        { keys: ['comp_adv'], label: '📊 Comparatives, Superlatives & Adverbs' },
        { keys: ['por_para'], label: '🧭 por vs para & Prepositions' },
        { keys: ['ser_estar_se'], label: '🏗️ ser/estar A2, se & Verbal Periphrases' },
      ],
      verbs: [
        { keys: ['indef_imperf'], label: '⏪ Indefinido vs Imperfecto' },
        { keys: ['perf_future'], label: '🔮 Perfecto, Future & Conditional' },
        { keys: ['reflexive_imp'], label: '🔄 Reflexives & Imperative (tú/usted)' },
        { keys: ['subj_intro'], label: '💭 Intro Subjunctive & Verb+Prep' },
      ],
      articles: [
        { keys: ['daily', 'social'], label: '🏠 Daily & Social' },
        { keys: ['work', 'health'], label: '💼 Work & Health' },
        { keys: ['travel', 'media', 'verbs_adj'], label: '✈️ Travel & Media' },
        { keys: ['extra'], label: '⚖️ Neutro lo, Zero Article & Demonstr.' },
      ],
    },
  },
  {
    learn: 'fr',
    cefr: 'a1',
    nounArticlePattern: '^(?:(?:le|la|les)\\s+|l[\'’])(.+)$',
    helperScripts: ['data/study-article-helper.js', 'data/study-fr-helpers.js'],
    withLangs: ['en', 'pt', 'es', 'de'],
    monolingualTracks: [
      { key: 'grammar', label: '📐 Grammar' },
      { key: 'verbs', label: '⚡ Verbs & Conjugation' },
      { key: 'articles', label: '🏷️ Articles & Gender' },
    ],
    partDefs: {
      grammar: [
        { keys: ['neg_q'], label: '❓ Questions, Negation & c’est/il y a' },
        { keys: ['pronouns'], label: '👤 Pronouns & Possessives' },
        { keys: ['agreement'], label: '📊 Gender, Plurals & Adjectives' },
        { keys: ['preps'], label: '📍 Prepositions & Place/Time' },
        { keys: ['connectors'], label: '🔗 Connectors, Quantities & Expressions' },
      ],
      verbs: [
        { keys: ['core'], label: '⭐ être, avoir, aller, faire & Modals' },
        { keys: ['regular'], label: '✅ Regular Present (-er / -ir / -re)' },
        { keys: ['irregular'], label: '🔀 Irregular Present & Reflexives' },
        { keys: ['past_fut'], label: '⏪ Passé composé & Futur proche' },
      ],
      articles: [
        { keys: ['people', 'home'], label: '🏠 People & Home' },
        { keys: ['food', 'city'], label: '🍎 Food & City' },
        { keys: ['basics', 'work', 'verbs_adj'], label: '💼 Work & Time' },
        { keys: ['extra'], label: '⚖️ au/du, Partitives & l’' },
      ],
    },
  },
  {
    learn: 'fr',
    cefr: 'a2',
    nounArticlePattern: '^(?:(?:le|la|les)\\s+|l[\'’])(.+)$',
    helperScripts: ['data/study-article-helper.js', 'data/study-fr-helpers.js'],
    withLangs: ['en', 'pt', 'es', 'de'],
    monolingualTracks: [
      { key: 'grammar', label: '📐 Grammar' },
      { key: 'verbs', label: '⚡ Verbs & Conjugation' },
      { key: 'articles', label: '🏷️ Articles & Gender' },
    ],
    partDefs: {
      grammar: [
        { keys: ['clauses'], label: '🔀 Relatives (qui/que/où/dont) & Clauses' },
        { keys: ['pronouns_obj'], label: '🎯 Direct, Indirect, y & en Pronouns' },
        { keys: ['comp_adv'], label: '📊 Comparatives, Superlatives & Adverbs' },
        { keys: ['preps_time'], label: '⏳ Time Expressions & Prepositions' },
        { keys: ['structures'], label: '🏗️ Negation, Passive & Verb Patterns' },
      ],
      verbs: [
        { keys: ['pc_imparf'], label: '⏪ Passé composé vs Imparfait' },
        { keys: ['fut_cond'], label: '🔮 Futur simple & Conditionnel présent' },
        { keys: ['reflex_imp'], label: '🔄 Reflexives, Imperative & Gérondif' },
        { keys: ['subj_prep'], label: '💭 Intro Subjonctif & Verb + Préposition' },
      ],
      articles: [
        { keys: ['daily', 'social'], label: '🏠 Daily & Social' },
        { keys: ['work', 'health'], label: '💼 Work & Health' },
        { keys: ['travel', 'media', 'verbs_adj'], label: '✈️ Travel & Media' },
        { keys: ['extra'], label: '⚖️ Partitives, Negation & Zero Art.' },
      ],
    },
  },
];

export const STUDY_CONFIG_LABELS = {};
const STUDY_MINI_PARTS_BY_COURSE = {};

for (const course of STUDY_COURSES_META) {
  const { learn, cefr, monolingualTracks } = course;
  const learnMeta = STUDY_LANGUAGE_META[learn] || { flag: '🏳️' };
  const learnFlag = course.learnFlag || learnMeta.flag;
  course.learnFlag = learnFlag;
  course.withLangs = (course.withLangs || []).map((entry) => {
    const code = typeof entry === 'string' ? entry : entry.code;
    const flag = (typeof entry === 'object' && entry.flag) || (STUDY_LANGUAGE_META[code] && STUDY_LANGUAGE_META[code].flag) || '🏳️';
    return { code, flag };
  });
  course.partDefs = {
    ...(DEFAULT_STUDY_PART_DEFS_BY_CEFR[cefr] || {}),
    ...(course.partDefs || {}),
  };

  const learnUpper = learn.toUpperCase();
  const cefrUpper = cefr.toUpperCase();
  const learnTag = `${learnFlag} ${learnUpper}`;
  const prefix = `${learnFlag} ${cefrUpper} · `;

  const miniPartLabels = {};
  for (const [trackKey, defs] of Object.entries(course.partDefs)) {
    miniPartLabels[trackKey] = defs.map((d) => d.label);
  }
  course.miniPartLabels = miniPartLabels;
  STUDY_MINI_PARTS_BY_COURSE[`${learn}_${cefr}`] = miniPartLabels;

  for (const track of monolingualTracks) {
    const cfgId = `cfg_study_${learn}_${learn}_${cefr}_${track.key}`;
    STUDY_CONFIG_LABELS[cfgId] = `${prefix}${track.label}`;
  }

  for (const lang of course.withLangs) {
    const withTag = `${lang.flag} ${lang.code.toUpperCase()}`;
    const vocabFwdId = `cfg_study_${learn}_${lang.code}_${cefr}_vocab_${learn}_${lang.code}`;
    const vocabRevId = `cfg_study_${learn}_${lang.code}_${cefr}_vocab_${lang.code}_${learn}`;
    const phrasesFwdId = `cfg_study_${learn}_${lang.code}_${cefr}_phrases_${learn}_${lang.code}`;
    const phrasesRevId = `cfg_study_${learn}_${lang.code}_${cefr}_phrases`;

    STUDY_CONFIG_LABELS[vocabFwdId] = `${prefix}🔤 Words ${learnTag} → ${withTag}`;
    STUDY_CONFIG_LABELS[vocabRevId] = `${prefix}🔤 Words ${withTag} → ${learnTag}`;
    STUDY_CONFIG_LABELS[phrasesFwdId] = `${prefix}🗣️ Phrases ${learnTag} → ${withTag}`;
    STUDY_CONFIG_LABELS[phrasesRevId] = `${prefix}🗣️ Phrases ${withTag} → ${learnTag}`;
  }
}

export function getStudyMiniPartLabel(baseId, partNum) {
  const m = String(baseId || '').match(/^cfg_study_([a-z]+)_[a-z]+_([a-z0-9]+)_(.+)$/);
  if (m) {
    const courseLabels = STUDY_MINI_PARTS_BY_COURSE[`${m[1]}_${m[2]}`];
    const trackKey = m[3].startsWith('vocab_')
      ? 'vocab'
      : m[3].startsWith('phrases_')
        ? 'phrases'
        : m[3];
    const list = courseLabels && courseLabels[trackKey];
    if (Array.isArray(list) && list[partNum - 1]) {
      return list[partNum - 1];
    }
  }
  return `Part ${partNum}`;
}

const RENAMED_CONFIG_ID_RE = /^cfg_study_de_en_a1_(grammar|verbs|articles)(_p\d+)?$/;

export function resolveStudyConfigIdAlias(configId) {
  if (typeof configId !== 'string' || !configId) return configId;
  return configId.replace(RENAMED_CONFIG_ID_RE, 'cfg_study_de_de_a1_$1$2');
}

export function toLegacyDeEnAlias(configId) {
  if (typeof configId !== 'string' || !configId) return '';
  const m = configId.match(/^cfg_study_de_de_a1_(grammar|verbs|articles)(_p\d+)?$/);
  return m ? `cfg_study_de_en_a1_${m[1]}${m[2] || ''}` : '';
}

export function getStudyOgHomeBadge() {
  const byLearn = new Map();
  for (const c of STUDY_COURSES_META) {
    if (!byLearn.has(c.learn)) {
      byLearn.set(c.learn, { flag: c.learnFlag, code: c.learn.toUpperCase(), levels: [] });
    }
    byLearn.get(c.learn).levels.push(String(c.cefr || '').toLowerCase());
  }
  const sortLevels = (levels) =>
    [...levels]
      .sort((a, b) => {
        const ia = STUDY_CEFR_ORDER.indexOf(a);
        const ib = STUDY_CEFR_ORDER.indexOf(b);
        return (ia >= 0 ? ia : 99) - (ib >= 0 ? ib : 99);
      })
      .map((l) => l.toUpperCase());

  if (byLearn.size >= 3) {
    const flags = Array.from(byLearn.values()).map((v) => v.flag);
    const rangeLabels = new Set(
      Array.from(byLearn.values()).map(({ levels }) => {
        const sorted = sortLevels(levels);
        return sorted.length > 1 ? `${sorted[0]}–${sorted[sorted.length - 1]}` : sorted[0];
      })
    );
    const levelLabel = rangeLabels.size === 1 ? Array.from(rangeLabels)[0] : 'CEFR';
    const flagsLabel = flags.length > 5 ? `${flags.slice(0, 5).join(' ')} +${flags.length - 5}` : flags.join(' ');
    return `${flagsLabel} · ${levelLabel}`;
  }

  const parts = Array.from(byLearn.values()).map(({ flag, code, levels }) => {
    const sorted = sortLevels(levels);
    const levelLabel = sorted.length > 1 ? `${sorted[0]}–${sorted[sorted.length - 1]}` : sorted[0];
    return `${flag} ${code} ${levelLabel}`;
  });
  const base = parts.join(' · ');
  const full = `${base} · CEFR`;
  return full.length <= 36 ? full : base;
}
