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
    miniPartLabels: {
      vocab: [
        '⏰ Basics & Time',
        '👪 People & Family',
        '🏠 Home & Routine',
        '🍎 Food & Shopping',
        '🚆 City & Travel',
        '💼 Work & Free Time',
        '✨ Verbs & Qualities',
      ],
      grammar: [
        '❓ Word Order & Questions',
        '🚫 Pronouns & Negation',
        '📚 Cases & Plurals',
        '📍 Prepositions',
        '🔗 Modals & Connectors',
      ],
      verbs: [
        '⭐ sein, haben & Modals',
        '✅ Regular Present',
        '🔀 Stem-Changing',
        '⏪ Separable & Perfekt',
      ],
      articles: [
        '🏠 People & Home',
        '🍎 Food & City',
        '💼 Work & Time',
        '⚖️ Nom vs Akk',
      ],
      phrases: [
        '👋 Greetings & Intro',
        '☕ Café & Shopping',
        '🧭 Directions & Travel',
        '🏥 Time & Health',
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
];

export const STUDY_CONFIG_LABELS = {};
export const STUDY_PREVIEW_SAMPLES = {};
const STUDY_MINI_PARTS_BY_COURSE = {};

for (const course of STUDY_COURSES_META) {
  const { learn, learnFlag, cefr, withLangs, monolingualTracks, miniPartLabels, pairedPreviewSamples } = course;
  const learnUpper = learn.toUpperCase();
  const cefrUpper = cefr.toUpperCase();
  const learnTag = `${learnFlag} ${learnUpper}`;
  const prefix = `${learnFlag} ${cefrUpper} · `;

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
