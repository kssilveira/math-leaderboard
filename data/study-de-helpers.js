// German Study Track Helpers (lazy-loaded with German Study courses)
(() => {
if (typeof globalThis.buildGermanArticleTrackData === 'function') return;

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

globalThis.buildGermanArticleTrackData = buildGermanArticleTrackData;
})();
