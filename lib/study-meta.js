export const STUDY_LANGUAGE_META = {
  de: { name: 'German', flag: '🇩🇪' },
  en: { name: 'English', flag: '🇬🇧' },
  pt: { name: 'Portuguese', flag: '🇧🇷' },
  es: { name: 'Spanish', flag: '🇪🇸' },
  fr: { name: 'French', flag: '🇫🇷' },
};

export const STUDY_CEFR_ORDER = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

export const STUDY_COURSES_META = [
  {
    learn: 'de',
    learnFlag: '🇩🇪',
    cefr: 'a1',
    withLangs: [
      { code: 'en', flag: '🇬🇧' },
      { code: 'pt', flag: '🇧🇷' },
      { code: 'es', flag: '🇪🇸' },
      { code: 'fr', flag: '🇫🇷' },
    ],
    monolingualTracks: [
      {
        key: 'grammar',
        label: '📐 Grammar',
        preview: { prompt: 'Heute ___ ___ nach Berlin.', choices: ['fahre ich', 'ich fahre'] },
      },
      {
        key: 'verbs',
        label: '⚡ Verbs & Conjugation',
        preview: { prompt: 'er ___ (fahren)', choices: ['fährt', 'fahrt'] },
      },
      {
        key: 'articles',
        label: '🏷️ Articles & Gender',
        preview: { prompt: '___ Bahnhof', choices: ['der', 'die'] },
      },
    ],
    partDefs: {
      vocab: [
        { keys: ['basics'], label: '⏰ Basics & Time' },
        { keys: ['people'], label: '👪 People & Family' },
        { keys: ['home'], label: '🏠 Home & Routine' },
        { keys: ['food'], label: '🍎 Food & Shopping' },
        { keys: ['city'], label: '🚆 City & Travel' },
        { keys: ['work'], label: '💼 Work & Free Time' },
        { keys: ['verbs_adj'], label: '✨ Verbs & Qualities' },
      ],
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
      phrases: [
        { keys: ['intro'], label: '👋 Greetings & Intro' },
        { keys: ['shop'], label: '☕ Café & Shopping' },
        { keys: ['travel'], label: '🧭 Directions & Travel' },
        { keys: ['daily'], label: '🏥 Time & Health' },
      ],
    },
    pairedPreviewSamples: {
      en: {
        vocabPrompt: 'der Bahnhof',
        vocabChoices: ['train station', 'airport'],
        vocabReverseChoices: ['der Bahnhof', 'der Flughafen'],
        phrases: { prompt: 'The bill, please!', choices: ['Zahlen, bitte!', 'Bestellen, bitte!'] },
        phrasesReverse: { prompt: 'Zahlen, bitte!', choices: ['The bill, please!', 'The menu, please!'] },
      },
      pt: {
        vocabPrompt: 'der Bahnhof',
        vocabChoices: ['estação de trem', 'aeroporto'],
        vocabReverseChoices: ['der Bahnhof', 'der Flughafen'],
        phrases: { prompt: 'A conta, por favor!', choices: ['Zahlen, bitte!', 'Bestellen, bitte!'] },
        phrasesReverse: { prompt: 'Zahlen, bitte!', choices: ['A conta, por favor!', 'O cardápio, por favor!'] },
      },
      es: {
        vocabPrompt: 'der Bahnhof',
        vocabChoices: ['estación de tren', 'aeropuerto'],
        vocabReverseChoices: ['der Bahnhof', 'der Flughafen'],
        phrases: { prompt: '¡La cuenta, por favor!', choices: ['Zahlen, bitte!', 'Bestellen, bitte!'] },
        phrasesReverse: { prompt: 'Zahlen, bitte!', choices: ['¡La cuenta, por favor!', '¡La carta, por favor!'] },
      },
      fr: {
        vocabPrompt: 'der Bahnhof',
        vocabChoices: ['gare', 'aéroport'],
        vocabReverseChoices: ['der Bahnhof', 'der Flughafen'],
        phrases: { prompt: 'L’addition, s’il vous plaît !', choices: ['Zahlen, bitte!', 'Bestellen, bitte!'] },
        phrasesReverse: { prompt: 'Zahlen, bitte!', choices: ['L’addition, s’il vous plaît !', 'La carte, s’il vous plaît !'] },
      },
    },
  },
  {
    learn: 'de',
    learnFlag: '🇩🇪',
    cefr: 'a2',
    withLangs: [
      { code: 'en', flag: '🇬🇧' },
      { code: 'pt', flag: '🇧🇷' },
      { code: 'es', flag: '🇪🇸' },
      { code: 'fr', flag: '🇫🇷' },
    ],
    monolingualTracks: [
      {
        key: 'grammar',
        label: '📐 Grammar',
        preview: { prompt: 'Ich bleibe zu Hause, weil ich krank ___.', choices: ['bin', 'bin ich'] },
      },
      {
        key: 'verbs',
        label: '⚡ Verbs & Conjugation',
        preview: { prompt: 'Ich freue ___ auf den Urlaub.', choices: ['mich', 'mir'] },
      },
      {
        key: 'articles',
        label: '🏷️ Articles & Gender',
        preview: { prompt: '___ Bewerbung', choices: ['die', 'der'] },
      },
    ],
    partDefs: {
      vocab: [
        { keys: ['daily'], label: '🏠 Daily Life & Living' },
        { keys: ['social'], label: '💬 People & Feelings' },
        { keys: ['work'], label: '💼 Education & Work' },
        { keys: ['health'], label: '🩺 Health & Body' },
        { keys: ['travel'], label: '✈️ Travel & Mobility' },
        { keys: ['media'], label: '📱 Media, Culture & Leisure' },
        { keys: ['verbs_adj'], label: '✨ Verbs, Adjectives & Connectors' },
      ],
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
      phrases: [
        { keys: ['social'], label: '💬 Opinions & Invitations' },
        { keys: ['work'], label: '💼 Work, Study & Admin' },
        { keys: ['services'], label: '🛠️ Shopping, Housing & Complaints' },
        { keys: ['travel'], label: '🚆 Travel, Health & Emergencies' },
      ],
    },
    pairedPreviewSamples: {
      en: {
        vocabPrompt: 'die Bewerbung',
        vocabChoices: ['job application', 'internship'],
        vocabReverseChoices: ['die Bewerbung', 'das Praktikum'],
        phrases: { prompt: 'In my opinion, that’s a good idea.', choices: ['Meiner Meinung nach ist das eine gute Idee.', 'Nach meiner Meinung das ist eine gute Idee.'] },
        phrasesReverse: { prompt: 'Meiner Meinung nach ist das eine gute Idee.', choices: ['In my opinion, that’s a good idea.', 'I have a different opinion on that.'] },
      },
      pt: {
        vocabPrompt: 'die Bewerbung',
        vocabChoices: ['candidatura (vaga)', 'estágio'],
        vocabReverseChoices: ['die Bewerbung', 'das Praktikum'],
        phrases: { prompt: 'Na minha opinião, essa é uma boa ideia.', choices: ['Meiner Meinung nach ist das eine gute Idee.', 'Nach meiner Meinung das ist eine gute Idee.'] },
        phrasesReverse: { prompt: 'Meiner Meinung nach ist das eine gute Idee.', choices: ['Na minha opinião, essa é uma boa ideia.', 'Discordo disso / Tenho outra opinião.'] },
      },
      es: {
        vocabPrompt: 'die Bewerbung',
        vocabChoices: ['solicitud de empleo', 'prácticas (laborales)'],
        vocabReverseChoices: ['die Bewerbung', 'das Praktikum'],
        phrases: { prompt: 'En mi opinión, es una buena idea.', choices: ['Meiner Meinung nach ist das eine gute Idee.', 'Nach meiner Meinung das ist eine gute Idee.'] },
        phrasesReverse: { prompt: 'Meiner Meinung nach ist das eine gute Idee.', choices: ['En mi opinión, es una buena idea.', 'En eso tengo otra opinión.'] },
      },
      fr: {
        vocabPrompt: 'die Bewerbung',
        vocabChoices: ['candidature', 'stage'],
        vocabReverseChoices: ['die Bewerbung', 'das Praktikum'],
        phrases: { prompt: 'À mon avis, c’est une bonne idée.', choices: ['Meiner Meinung nach ist das eine gute Idee.', 'Nach meiner Meinung das ist eine gute Idee.'] },
        phrasesReverse: { prompt: 'Meiner Meinung nach ist das eine gute Idee.', choices: ['À mon avis, c’est une bonne idée.', 'Là-dessus, je suis d’un autre avis.'] },
      },
    },
  },
];

export const STUDY_CONFIG_LABELS = {};
export const STUDY_PREVIEW_SAMPLES = {};
const STUDY_MINI_PARTS_BY_COURSE = {};

for (const course of STUDY_COURSES_META) {
  const { learn, learnFlag, cefr, withLangs, monolingualTracks, partDefs, pairedPreviewSamples } = course;
  const learnUpper = learn.toUpperCase();
  const cefrUpper = cefr.toUpperCase();
  const learnTag = `${learnFlag} ${learnUpper}`;
  const prefix = `${learnFlag} ${cefrUpper} · `;

  const miniPartLabels = {};
  for (const [trackKey, defs] of Object.entries(partDefs || {})) {
    miniPartLabels[trackKey] = defs.map((d) => d.label);
  }
  course.miniPartLabels = miniPartLabels;
  STUDY_MINI_PARTS_BY_COURSE[`${learn}_${cefr}`] = miniPartLabels;

  for (const track of monolingualTracks) {
    const cfgId = `cfg_study_${learn}_${learn}_${cefr}_${track.key}`;
    STUDY_CONFIG_LABELS[cfgId] = `${prefix}${track.label}`;
    if (track.preview) {
      STUDY_PREVIEW_SAMPLES[cfgId] = track.preview;
    }
  }

  for (const lang of withLangs) {
    const withTag = `${lang.flag} ${lang.code.toUpperCase()}`;
    const vocabFwdId = `cfg_study_${learn}_${lang.code}_${cefr}_vocab_${learn}_${lang.code}`;
    const vocabRevId = `cfg_study_${learn}_${lang.code}_${cefr}_vocab_${lang.code}_${learn}`;
    const phrasesFwdId = `cfg_study_${learn}_${lang.code}_${cefr}_phrases_${learn}_${lang.code}`;
    const phrasesRevId = `cfg_study_${learn}_${lang.code}_${cefr}_phrases`;

    STUDY_CONFIG_LABELS[vocabFwdId] = `${prefix}🔤 Words ${learnTag} → ${withTag}`;
    STUDY_CONFIG_LABELS[vocabRevId] = `${prefix}🔤 Words ${withTag} → ${learnTag}`;
    STUDY_CONFIG_LABELS[phrasesFwdId] = `${prefix}🗣️ Phrases ${learnTag} → ${withTag}`;
    STUDY_CONFIG_LABELS[phrasesRevId] = `${prefix}🗣️ Phrases ${withTag} → ${learnTag}`;

    const sample = pairedPreviewSamples && pairedPreviewSamples[lang.code];
    if (sample) {
      STUDY_PREVIEW_SAMPLES[vocabFwdId] = {
        prompt: sample.vocabPrompt,
        choices: sample.vocabChoices,
      };
      STUDY_PREVIEW_SAMPLES[vocabRevId] = {
        prompt: sample.vocabChoices[0],
        choices: sample.vocabReverseChoices,
      };
      STUDY_PREVIEW_SAMPLES[phrasesFwdId] = sample.phrasesReverse;
      STUDY_PREVIEW_SAMPLES[phrasesRevId] = sample.phrases;
    }
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
    byLearn.get(c.learn).levels.push(c.cefr.toUpperCase());
  }
  const parts = Array.from(byLearn.values()).map(({ flag, code, levels }) => {
    const levelLabel = levels.length > 1 ? `${levels[0]}–${levels[levels.length - 1]}` : levels[0];
    return `${flag} ${code} ${levelLabel}`;
  });
  return `${parts.join(' · ')} · CEFR`;
}
