// Shared Gendered-Article Study Track Builder (lazy-loaded via helperScripts)
(() => {
if (typeof globalThis.buildGenderedArticleTrackData === 'function') return;

function buildGenderedArticleTrackData({
  vocabCore = [],
  artExtra = [],
  articlePartDefs = [],
  initialVocabCount = null,
  articleRegex,
  excludeNoun = null,
  getDistractors,
  getPrompt = null,
  getHint,
  transformItem = null
}) {
  const items = [];
  const groups = articlePartDefs.map(() => []);
  const keyToGroupIdx = new Map();
  let extraGroupIdx = articlePartDefs.length - 1;
  articlePartDefs.forEach((def, idx) => {
    (def.keys || []).forEach((k) => {
      if (k === 'extra') extraGroupIdx = idx;
      else keyToGroupIdx.set(k, idx);
    });
  });

  const pushNounArticleItem = (row) => {
    const [word, pos, setKey] = row;
    if (pos !== 'n') return;
    const match = typeof word === 'string' && articleRegex ? word.match(articleRegex) : null;
    if (!match) return;
    const article = match[1];
    const noun = match[2];
    if (excludeNoun && excludeNoun(noun, article, row)) return;

    let prompt;
    let correct;
    let distractors;
    let hint;
    if (transformItem) {
      const transformed = transformItem({ word, article, noun, setKey, row });
      if (!transformed) return;
      ({ prompt, correct, distractors, hint } = transformed);
    } else {
      correct = article;
      distractors = getDistractors(article, noun, row);
      prompt = getPrompt ? getPrompt(noun, article, row) : `___ ${noun}`;
      hint = getHint(noun, article, row);
    }
    if (!Array.isArray(distractors) || distractors.length === 0) return;

    const idx = items.length;
    items.push([prompt, correct, distractors, hint]);
    const gIdx = keyToGroupIdx.has(setKey) ? keyToGroupIdx.get(setKey) : Math.max(0, extraGroupIdx - 1);
    if (groups[gIdx]) groups[gIdx].push(idx);
  };

  const pushExtraItem = ([prompt, correct, distractors, ruleNote]) => {
    const idx = items.length;
    items.push([prompt, correct, distractors, ruleNote]);
    if (groups[extraGroupIdx]) groups[extraGroupIdx].push(idx);
  };

  if (typeof initialVocabCount === 'number' && initialVocabCount > 0) {
    vocabCore.slice(0, initialVocabCount).forEach(pushNounArticleItem);
    artExtra.forEach(pushExtraItem);
    vocabCore.slice(initialVocabCount).forEach(pushNounArticleItem);
  } else {
    vocabCore.forEach(pushNounArticleItem);
    artExtra.forEach(pushExtraItem);
  }

  const parts = articlePartDefs.map((def, idx) => ({
    label: def.label,
    indices: groups[idx]
  }));
  return { items, parts };
}

globalThis.buildGenderedArticleTrackData = buildGenderedArticleTrackData;
})();
