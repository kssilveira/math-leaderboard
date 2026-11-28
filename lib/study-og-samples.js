import { STUDY_COURSES_META } from './study-meta.js';

export const STUDY_OG_SAMPLES_BY_COURSE = {
  de_a1: {
    monolingual: {
      grammar: { prompt: 'Heute ___ ___ nach Berlin.', choices: ['fahre ich', 'ich fahre'] },
      verbs: { prompt: 'er ___ (fahren)', choices: ['fährt', 'fahrt'] },
      articles: { prompt: '___ Bahnhof', choices: ['der', 'die'] },
    },
    paired: {
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
  de_a2: {
    monolingual: {
      grammar: { prompt: 'Ich bleibe zu Hause, weil ich krank ___.', choices: ['bin', 'bin ich'] },
      verbs: { prompt: 'Ich freue ___ auf den Urlaub.', choices: ['mich', 'mir'] },
      articles: { prompt: '___ Bewerbung', choices: ['die', 'der'] },
    },
    paired: {
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
  en_a1: {
    monolingual: {
      grammar: { prompt: 'Where ___ you live?', choices: ['do', 'are'] },
      verbs: { prompt: 'She ___ to school every day. (go)', choices: ['goes', 'go'] },
      articles: { prompt: 'I have ___ umbrella.', choices: ['an', 'a'] },
    },
    paired: {
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
  en_a2: {
    monolingual: {
      grammar: { prompt: 'That is the woman ___ helped me.', choices: ['who', 'which'] },
      verbs: { prompt: 'Have you ever ___ to London? (be)', choices: ['been', 'went'] },
      articles: { prompt: 'She is very good ___ maths.', choices: ['at', 'in'] },
    },
    paired: {
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
  pt_a1: {
    monolingual: {
      grammar: { prompt: 'Eu ___ brasileiro.', choices: ['sou', 'estou'] },
      verbs: { prompt: 'Nós ___ português. (falar)', choices: ['falamos', 'falam'] },
      articles: { prompt: '___ problema', choices: ['o', 'a'] },
    },
    paired: {
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
  pt_a2: {
    monolingual: {
      grammar: { prompt: 'Estudo português ___ viajar ao Brasil.', choices: ['para', 'por'] },
      verbs: { prompt: 'Quando era criança, eu ___ futebol. (jogar)', choices: ['jogava', 'joguei'] },
      articles: { prompt: 'Vou ___ praia amanhã.', choices: ['à', 'a'] },
    },
    paired: {
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
  es_a1: {
    monolingual: {
      grammar: { prompt: 'Yo ___ estudiante de español.', choices: ['soy', 'estoy'] },
      verbs: { prompt: 'Nosotros ___ español. (hablar)', choices: ['hablamos', 'hablan'] },
      articles: { prompt: '___ problema', choices: ['el', 'la'] },
    },
    paired: {
      en: {
        vocabPrompt: 'la estación de tren',
        vocabChoices: ['train station', 'airport'],
        vocabReverseChoices: ['la estación de tren', 'el aeropuerto'],
        phrases: { prompt: 'The bill, please!', choices: ['¡La cuenta, por favor!', '¡La carta, por favor!'] },
        phrasesReverse: { prompt: '¡La cuenta, por favor!', choices: ['The bill, please!', 'The menu, please!'] },
      },
      pt: {
        vocabPrompt: 'la estación de tren',
        vocabChoices: ['estação de trem', 'aeroporto'],
        vocabReverseChoices: ['la estación de tren', 'el aeropuerto'],
        phrases: { prompt: 'A conta, por favor!', choices: ['¡La cuenta, por favor!', '¡La carta, por favor!'] },
        phrasesReverse: { prompt: '¡La cuenta, por favor!', choices: ['A conta, por favor!', 'O cardápio, por favor!'] },
      },
      fr: {
        vocabPrompt: 'la estación de tren',
        vocabChoices: ['gare', 'aéroport'],
        vocabReverseChoices: ['la estación de tren', 'el aeropuerto'],
        phrases: { prompt: 'L’addition, s’il vous plaît !', choices: ['¡La cuenta, por favor!', '¡La carta, por favor!'] },
        phrasesReverse: { prompt: '¡La cuenta, por favor!', choices: ['L’addition, s’il vous plaît !', 'La carte, s’il vous plaît !'] },
      },
      de: {
        vocabPrompt: 'la estación de tren',
        vocabChoices: ['der Bahnhof', 'der Flughafen'],
        vocabReverseChoices: ['la estación de tren', 'el aeropuerto'],
        phrases: { prompt: 'Die Rechnung, bitte!', choices: ['¡La cuenta, por favor!', '¡La carta, por favor!'] },
        phrasesReverse: { prompt: '¡La cuenta, por favor!', choices: ['Die Rechnung, bitte!', 'Die Speisekarte, bitte!'] },
      },
    },
  },
  es_a2: {
    monolingual: {
      grammar: { prompt: 'Estudio español ___ viajar a Madrid.', choices: ['para', 'por'] },
      verbs: { prompt: 'Cuando era niño, ___ al fútbol. (jugar)', choices: ['jugaba', 'jugué'] },
      articles: { prompt: '___ importante es participar.', choices: ['Lo', 'El'] },
    },
    paired: {
      en: {
        vocabPrompt: 'la solicitud de empleo',
        vocabChoices: ['job application', 'internship'],
        vocabReverseChoices: ['la solicitud de empleo', 'las prácticas'],
        phrases: { prompt: 'In my opinion, that’s a great idea.', choices: ['En mi opinión, es una gran idea.', 'En mi opinión, esto tiene una buena idea.'] },
        phrasesReverse: { prompt: 'En mi opinión, es una gran idea.', choices: ['In my opinion, that’s a great idea.', 'I completely disagree with that.'] },
      },
      pt: {
        vocabPrompt: 'la solicitud de empleo',
        vocabChoices: ['candidatura (vaga)', 'estágio'],
        vocabReverseChoices: ['la solicitud de empleo', 'las prácticas'],
        phrases: { prompt: 'Na minha opinião, essa é uma ótima ideia.', choices: ['En mi opinión, es una gran idea.', 'En mi opinión, esto tiene una buena idea.'] },
        phrasesReverse: { prompt: 'En mi opinión, es una gran idea.', choices: ['Na minha opinião, essa é uma ótima ideia.', 'Discordo totalmente disso.'] },
      },
      fr: {
        vocabPrompt: 'la solicitud de empleo',
        vocabChoices: ['candidature', 'stage'],
        vocabReverseChoices: ['la solicitud de empleo', 'las prácticas'],
        phrases: { prompt: 'À mon avis, c’est une excellente idée.', choices: ['En mi opinión, es una gran idea.', 'En mi opinión, esto tiene una buena idea.'] },
        phrasesReverse: { prompt: 'En mi opinión, es una gran idea.', choices: ['À mon avis, c’est une excellente idée.', 'Je ne suis pas du tout d’accord.'] },
      },
      de: {
        vocabPrompt: 'la solicitud de empleo',
        vocabChoices: ['die Bewerbung', 'das Praktikum'],
        vocabReverseChoices: ['la solicitud de empleo', 'las prácticas'],
        phrases: { prompt: 'Meiner Meinung nach ist das eine tolle Idee.', choices: ['En mi opinión, es una gran idea.', 'En mi opinión, esto tiene una buena idea.'] },
        phrasesReverse: { prompt: 'En mi opinión, es una gran idea.', choices: ['Meiner Meinung nach ist das eine tolle Idee.', 'Da bin ich anderer Meinung.'] },
      },
    },
  },
};

export const STUDY_PREVIEW_SAMPLES = {};

for (const course of STUDY_COURSES_META) {
  const { learn, cefr, withLangs, monolingualTracks } = course;
  const courseSamples = STUDY_OG_SAMPLES_BY_COURSE[`${learn}_${cefr}`];
  if (!courseSamples) continue;

  for (const track of monolingualTracks) {
    const cfgId = `cfg_study_${learn}_${learn}_${cefr}_${track.key}`;
    const preview = courseSamples.monolingual && courseSamples.monolingual[track.key];
    if (preview) {
      STUDY_PREVIEW_SAMPLES[cfgId] = preview;
    }
  }

  for (const lang of withLangs) {
    const code = typeof lang === 'string' ? lang : lang.code;
    const sample = courseSamples.paired && courseSamples.paired[code];
    if (!sample) continue;

    const vocabFwdId = `cfg_study_${learn}_${code}_${cefr}_vocab_${learn}_${code}`;
    const vocabRevId = `cfg_study_${learn}_${code}_${cefr}_vocab_${code}_${learn}`;
    const phrasesFwdId = `cfg_study_${learn}_${code}_${cefr}_phrases_${learn}_${code}`;
    const phrasesRevId = `cfg_study_${learn}_${code}_${cefr}_phrases`;

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
