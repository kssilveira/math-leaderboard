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

export const STUDY_COURSES_META = [
  {
    learn: 'de',
    learnFlag: '🇩🇪',
    cefr: 'a1',
    helperScripts: ['data/study-de-helpers.js'],
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
    helperScripts: ['data/study-de-helpers.js'],
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
  {
    learn: 'en',
    learnFlag: '🇬🇧',
    cefr: 'a1',
    withLangs: [
      { code: 'pt', flag: '🇧🇷' },
      { code: 'es', flag: '🇪🇸' },
      { code: 'fr', flag: '🇫🇷' },
      { code: 'de', flag: '🇩🇪' },
    ],
    monolingualTracks: [
      {
        key: 'grammar',
        label: '📐 Grammar',
        preview: { prompt: 'Where ___ you live?', choices: ['do', 'are'] },
      },
      {
        key: 'verbs',
        label: '⚡ Verbs & Tenses',
        preview: { prompt: 'She ___ to school every day. (go)', choices: ['goes', 'go'] },
      },
      {
        key: 'articles',
        label: '🏷️ Articles & Prepositions',
        preview: { prompt: 'I have ___ umbrella.', choices: ['an', 'a'] },
      },
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
    pairedPreviewSamples: {
      pt: {
        vocabPrompt: 'train station',
        vocabChoices: ['estação de trem', 'aeroporto'],
        vocabReverseChoices: ['train station', 'airport'],
        phrases: { prompt: 'A conta, por favor!', choices: ['Could I have the bill, please?', 'Could I see the menu, please?'] },
        phrasesReverse: { prompt: 'Could I have the bill, please?', choices: ['A conta, por favor!', 'O cardápio, por favor!'] },
      },
      es: {
        vocabPrompt: 'train station',
        vocabChoices: ['estación de tren', 'aeropuerto'],
        vocabReverseChoices: ['train station', 'airport'],
        phrases: { prompt: '¿Me trae la cuenta, por favor?', choices: ['Could I have the bill, please?', 'Could I see the menu, please?'] },
        phrasesReverse: { prompt: 'Could I have the bill, please?', choices: ['¿Me trae la cuenta, por favor?', '¿Me trae la carta, por favor?'] },
      },
      fr: {
        vocabPrompt: 'train station',
        vocabChoices: ['gare', 'aéroport'],
        vocabReverseChoices: ['train station', 'airport'],
        phrases: { prompt: 'L’addition, s’il vous plaît ?', choices: ['Could I have the bill, please?', 'Could I see the menu, please?'] },
        phrasesReverse: { prompt: 'Could I have the bill, please?', choices: ['L’addition, s’il vous plaît ?', 'La carte, s’il vous plaît ?'] },
      },
      de: {
        vocabPrompt: 'train station',
        vocabChoices: ['der Bahnhof', 'der Flughafen'],
        vocabReverseChoices: ['train station', 'airport'],
        phrases: { prompt: 'Die Rechnung, bitte!', choices: ['Could I have the bill, please?', 'Could I see the menu, please?'] },
        phrasesReverse: { prompt: 'Could I have the bill, please?', choices: ['Die Rechnung, bitte!', 'Die Speisekarte, bitte!'] },
      },
    },
  },
  {
    learn: 'en',
    learnFlag: '🇬🇧',
    cefr: 'a2',
    withLangs: [
      { code: 'pt', flag: '🇧🇷' },
      { code: 'es', flag: '🇪🇸' },
      { code: 'fr', flag: '🇫🇷' },
      { code: 'de', flag: '🇩🇪' },
    ],
    monolingualTracks: [
      {
        key: 'grammar',
        label: '📐 Grammar',
        preview: { prompt: 'That is the woman ___ helped me.', choices: ['who', 'which'] },
      },
      {
        key: 'verbs',
        label: '⚡ Verbs & Tenses',
        preview: { prompt: 'Have you ever ___ to London? (be)', choices: ['been', 'went'] },
      },
      {
        key: 'articles',
        label: '🏷️ Articles & Prepositions',
        preview: { prompt: 'She is very good ___ maths.', choices: ['at', 'in'] },
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
      phrases: [
        { keys: ['social'], label: '💬 Opinions & Invitations' },
        { keys: ['work'], label: '💼 Work, Study & Admin' },
        { keys: ['services'], label: '🛠️ Shopping, Housing & Complaints' },
        { keys: ['travel'], label: '🚆 Travel, Health & Emergencies' },
      ],
    },
    pairedPreviewSamples: {
      pt: {
        vocabPrompt: 'job application',
        vocabChoices: ['candidatura (vaga)', 'estágio'],
        vocabReverseChoices: ['job application', 'internship'],
        phrases: { prompt: 'Na minha opinião, essa é uma ótima ideia.', choices: ['In my opinion, that’s a great idea.', 'In my opinion, it have a good idea.'] },
        phrasesReverse: { prompt: 'In my opinion, that’s a great idea.', choices: ['Na minha opinião, essa é uma ótima ideia.', 'Eu discordo totalmente disso.'] },
      },
      es: {
        vocabPrompt: 'job application',
        vocabChoices: ['solicitud de empleo', 'prácticas (laborales)'],
        vocabReverseChoices: ['job application', 'internship'],
        phrases: { prompt: 'En mi opinión, es una gran idea.', choices: ['In my opinion, that’s a great idea.', 'In my opinion, it have a good idea.'] },
        phrasesReverse: { prompt: 'In my opinion, that’s a great idea.', choices: ['En mi opinión, es una gran idea.', 'No estoy de acuerdo con eso.'] },
      },
      fr: {
        vocabPrompt: 'job application',
        vocabChoices: ['candidature', 'stage'],
        vocabReverseChoices: ['job application', 'internship'],
        phrases: { prompt: 'À mon avis, c’est une excellente idée.', choices: ['In my opinion, that’s a great idea.', 'In my opinion, it have a good idea.'] },
        phrasesReverse: { prompt: 'In my opinion, that’s a great idea.', choices: ['À mon avis, c’est une excellente idée.', 'Je ne suis pas du tout d’accord.'] },
      },
      de: {
        vocabPrompt: 'job application',
        vocabChoices: ['die Bewerbung', 'das Praktikum'],
        vocabReverseChoices: ['job application', 'internship'],
        phrases: { prompt: 'Meiner Meinung nach ist das eine tolle Idee.', choices: ['In my opinion, that’s a great idea.', 'In my opinion, it have a good idea.'] },
        phrasesReverse: { prompt: 'In my opinion, that’s a great idea.', choices: ['Meiner Meinung nach ist das eine tolle Idee.', 'Da bin ich anderer Meinung.'] },
      },
    },
  },
  {
    learn: 'pt',
    learnFlag: '🇧🇷',
    cefr: 'a1',
    helperScripts: ['data/study-pt-helpers.js'],
    withLangs: [
      { code: 'en', flag: '🇬🇧' },
      { code: 'es', flag: '🇪🇸' },
      { code: 'fr', flag: '🇫🇷' },
      { code: 'de', flag: '🇩🇪' },
    ],
    monolingualTracks: [
      {
        key: 'grammar',
        label: '📐 Grammar',
        preview: { prompt: 'Eu ___ brasileiro.', choices: ['sou', 'estou'] },
      },
      {
        key: 'verbs',
        label: '⚡ Verbs & Conjugation',
        preview: { prompt: 'Nós ___ português. (falar)', choices: ['falamos', 'falam'] },
      },
      {
        key: 'articles',
        label: '🏷️ Articles & Gender',
        preview: { prompt: '___ problema', choices: ['o', 'a'] },
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
      phrases: [
        { keys: ['intro'], label: '👋 Greetings & Intro' },
        { keys: ['shop'], label: '☕ Café & Shopping' },
        { keys: ['travel'], label: '🧭 Directions & Travel' },
        { keys: ['daily'], label: '🏥 Time & Health' },
      ],
    },
    pairedPreviewSamples: {
      en: {
        vocabPrompt: 'a estação de trem',
        vocabChoices: ['train station', 'airport'],
        vocabReverseChoices: ['a estação de trem', 'o aeroporto'],
        phrases: { prompt: 'The bill, please!', choices: ['A conta, por favor!', 'O cardápio, por favor!'] },
        phrasesReverse: { prompt: 'A conta, por favor!', choices: ['The bill, please!', 'The menu, please!'] },
      },
      es: {
        vocabPrompt: 'a estação de trem',
        vocabChoices: ['estación de tren', 'aeropuerto'],
        vocabReverseChoices: ['a estação de trem', 'o aeroporto'],
        phrases: { prompt: '¡La cuenta, por favor!', choices: ['A conta, por favor!', 'O cardápio, por favor!'] },
        phrasesReverse: { prompt: 'A conta, por favor!', choices: ['¡La cuenta, por favor!', '¡La carta, por favor!'] },
      },
      fr: {
        vocabPrompt: 'a estação de trem',
        vocabChoices: ['gare', 'aéroport'],
        vocabReverseChoices: ['a estação de trem', 'o aeroporto'],
        phrases: { prompt: 'L’addition, s’il vous plaît !', choices: ['A conta, por favor!', 'O cardápio, por favor!'] },
        phrasesReverse: { prompt: 'A conta, por favor!', choices: ['L’addition, s’il vous plaît !', 'La carte, s’il vous plaît !'] },
      },
      de: {
        vocabPrompt: 'a estação de trem',
        vocabChoices: ['der Bahnhof', 'der Flughafen'],
        vocabReverseChoices: ['a estação de trem', 'o aeroporto'],
        phrases: { prompt: 'Die Rechnung, bitte!', choices: ['A conta, por favor!', 'O cardápio, por favor!'] },
        phrasesReverse: { prompt: 'A conta, por favor!', choices: ['Die Rechnung, bitte!', 'Die Speisekarte, bitte!'] },
      },
    },
  },
  {
    learn: 'pt',
    learnFlag: '🇧🇷',
    cefr: 'a2',
    helperScripts: ['data/study-pt-helpers.js'],
    withLangs: [
      { code: 'en', flag: '🇬🇧' },
      { code: 'es', flag: '🇪🇸' },
      { code: 'fr', flag: '🇫🇷' },
      { code: 'de', flag: '🇩🇪' },
    ],
    monolingualTracks: [
      {
        key: 'grammar',
        label: '📐 Grammar',
        preview: { prompt: 'Estudo português ___ viajar ao Brasil.', choices: ['para', 'por'] },
      },
      {
        key: 'verbs',
        label: '⚡ Verbs & Conjugation',
        preview: { prompt: 'Quando era criança, eu ___ futebol. (jogar)', choices: ['jogava', 'joguei'] },
      },
      {
        key: 'articles',
        label: '🏷️ Articles & Gender',
        preview: { prompt: 'Vou ___ praia amanhã.', choices: ['à', 'a'] },
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
      phrases: [
        { keys: ['social'], label: '💬 Opinions & Invitations' },
        { keys: ['work'], label: '💼 Work, Study & Admin' },
        { keys: ['services'], label: '🛠️ Shopping, Housing & Complaints' },
        { keys: ['travel'], label: '🚆 Travel, Health & Emergencies' },
      ],
    },
    pairedPreviewSamples: {
      en: {
        vocabPrompt: 'a candidatura',
        vocabChoices: ['job application', 'internship'],
        vocabReverseChoices: ['a candidatura', 'o estágio'],
        phrases: { prompt: 'In my opinion, that’s a great idea.', choices: ['Na minha opinião, essa é uma ótima ideia.', 'Na minha opinião, isso tem uma boa ideia.'] },
        phrasesReverse: { prompt: 'Na minha opinião, essa é uma ótima ideia.', choices: ['In my opinion, that’s a great idea.', 'I completely disagree with that.'] },
      },
      es: {
        vocabPrompt: 'a candidatura',
        vocabChoices: ['solicitud de empleo', 'prácticas (laborales)'],
        vocabReverseChoices: ['a candidatura', 'o estágio'],
        phrases: { prompt: 'En mi opinión, es una gran idea.', choices: ['Na minha opinião, essa é uma ótima ideia.', 'Na minha opinião, isso tem uma boa ideia.'] },
        phrasesReverse: { prompt: 'Na minha opinião, essa é uma ótima ideia.', choices: ['En mi opinión, es una gran idea.', 'No estoy de acuerdo con eso.'] },
      },
      fr: {
        vocabPrompt: 'a candidatura',
        vocabChoices: ['candidature', 'stage'],
        vocabReverseChoices: ['a candidatura', 'o estágio'],
        phrases: { prompt: 'À mon avis, c’est une excellente idée.', choices: ['Na minha opinião, essa é uma ótima ideia.', 'Na minha opinião, isso tem uma boa ideia.'] },
        phrasesReverse: { prompt: 'Na minha opinião, essa é uma ótima ideia.', choices: ['À mon avis, c’est une excellente idée.', 'Je ne suis pas du tout d’accord.'] },
      },
      de: {
        vocabPrompt: 'a candidatura',
        vocabChoices: ['die Bewerbung', 'das Praktikum'],
        vocabReverseChoices: ['a candidatura', 'o estágio'],
        phrases: { prompt: 'Meiner Meinung nach ist das eine tolle Idee.', choices: ['Na minha opinião, essa é uma ótima ideia.', 'Na minha opinião, isso tem uma boa ideia.'] },
        phrasesReverse: { prompt: 'Na minha opinião, essa é uma ótima ideia.', choices: ['Meiner Meinung nach ist das eine tolle Idee.', 'Da bin ich anderer Meinung.'] },
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
    return `${flags.join(' ')} · ${levelLabel}`;
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
