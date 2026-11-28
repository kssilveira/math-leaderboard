import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  STUDY_COURSES_META,
  STUDY_LANGUAGE_META,
  STUDY_CONFIG_LABELS,
  getStudyOgHomeBadge,
} from '../lib/study-meta.js';
import {
  STUDY_OG_SAMPLES_BY_COURSE,
  STUDY_PREVIEW_SAMPLES,
} from '../lib/study-og-samples.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const VALID_POS = new Set(['n', 'v', 'adj', 'fn']);
const MAX_CHOICE_CHARS = 60;
const MAX_PHRASE_CHARS = 95;
const MAX_NOTE_CHARS = 70;
const SENTENCE_PUNCT_RE = /[.?!]$/;

function isNonEmptyStr(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

function hasUntrimmedWhitespace(val) {
  return typeof val === 'string' && val !== val.trim();
}

function getPhraseEndingPunct(text) {
  const last = String(text || '').trim().slice(-1);
  if (last === '?' || last === '？') return '?';
  if (last === '!' || last === '！') return '!';
  return '.';
}

function checkClozeBlanks(prompt, correct) {
  const promptStr = String(prompt || '');
  const blanks = promptStr.match(/___(?:\s+___)*/g);
  if (!blanks || blanks.length <= 1) return null;
  const expectedStr = String(correct || '').trim();
  const sepParts = expectedStr.split(/\s*(?:\.\.\.|…|\/)\s*/).filter(Boolean);
  if (sepParts.length === blanks.length) return null;
  const wsParts = expectedStr.split(/\s+/).filter(Boolean);
  if (wsParts.length === blanks.length) return null;
  return `Cloze has ${blanks.length} blank groups ("${promptStr}") but "${expectedStr}" does not split into ${blanks.length} parts`;
}

function collectPartDefs(trackName, defs, addErr) {
  const allowedKeys = new Set();
  const keyToPartLabel = new Map();
  const parts = (defs || []).map((d) => {
    const keys = new Set(d.keys || []);
    keys.forEach((k) => {
      if (keyToPartLabel.has(k)) {
        addErr(`partDefs.${trackName} key "${k}" duplicated in "${keyToPartLabel.get(k)}" and "${d.label}"`);
      } else {
        keyToPartLabel.set(k, d.label);
      }
      allowedKeys.add(k);
    });
    return { label: d.label, keys, count: 0 };
  });
  return { allowedKeys, parts };
}

function checkChoiceLengthsAndPunct(context, correct, distractors, ruleNote, { checkPunctGiveaway = false, checkLengthRatio = false, maxChoiceChars = MAX_CHOICE_CHARS } = {}, addErr, addWarn) {
  if (hasUntrimmedWhitespace(correct)) addErr(`${context} correct has leading/trailing whitespace: ${JSON.stringify(correct)}`);
  if (typeof correct === 'string' && correct.length > maxChoiceChars) {
    addWarn(`${context} correct exceeds ${maxChoiceChars} chars (${correct.length}): "${correct}"`);
  }
  if (typeof ruleNote === 'string' && ruleNote.length > MAX_NOTE_CHARS) {
    addWarn(`${context} ruleNote exceeds ${MAX_NOTE_CHARS} chars (${ruleNote.length}): "${ruleNote}"`);
  }

  const dList = Array.isArray(distractors) ? distractors : [];
  dList.forEach((d) => {
    if (hasUntrimmedWhitespace(d)) addErr(`${context} distractor has leading/trailing whitespace: ${JSON.stringify(d)}`);
    if (typeof d === 'string' && d.length > maxChoiceChars) {
      addWarn(`${context} distractor exceeds ${maxChoiceChars} chars (${d.length}): "${d}"`);
    }
  });

  if (dList.length > 0 && typeof correct === 'string') {
    const cTrim = correct.trim();
    const dTrims = dList.map((d) => String(d || '').trim());

    if (checkPunctGiveaway) {
      const allChoices = [cTrim, ...dTrims];
      const hasLongSentence = allChoices.some((s) => s.length >= 12);
      if (hasLongSentence) {
        const correctEndsPunct = SENTENCE_PUNCT_RE.test(cTrim);
        const anyDistractorEndsPunct = dTrims.some((d) => SENTENCE_PUNCT_RE.test(d));
        const allDistractorsEndPunct = dTrims.every((d) => SENTENCE_PUNCT_RE.test(d));
        if (correctEndsPunct && !anyDistractorEndsPunct) {
          addWarn(`${context} punctuation giveaway: correct ends with sentence punctuation ("${correct}") while distractors do not`);
        } else if (!correctEndsPunct && allDistractorsEndPunct) {
          addWarn(`${context} punctuation giveaway: all distractors end with sentence punctuation while correct ("${correct}") does not`);
        }

        const isUp = (s) => /^\p{Lu}/u.test(s.replace(/^[¿¡"'«(]+/, ''));
        const isLo = (s) => /^\p{Ll}/u.test(s.replace(/^[¿¡"'«(]+/, ''));
        if ((isUp(cTrim) && dTrims.every(isLo)) || (isLo(cTrim) && dTrims.every(isUp))) {
          addWarn(`${context} capitalization giveaway: "${correct}" vs ${JSON.stringify(dTrims)}`);
        }
      }

      const cInv = /^[¿¡]/.test(cTrim);
      const anyDInv = dTrims.some((d) => /^[¿¡]/.test(d));
      const allDInv = dTrims.every((d) => /^[¿¡]/.test(d));
      if ((cInv && !anyDInv) || (!cInv && allDInv)) {
        addWarn(`${context} inverted punctuation giveaway: "${correct}" vs ${JSON.stringify(dTrims)}`);
      }
    }

    if (checkLengthRatio && cTrim.length >= 15) {
      dTrims.forEach((d) => {
        const ratio = Math.max(cTrim.length, d.length) / Math.max(1, Math.min(cTrim.length, d.length));
        if (ratio >= 2.8) {
          addWarn(`${context} length ratio giveaway (${ratio.toFixed(1)}x): "${correct}" vs "${d}"`);
        }
      });
    }
  }
}

function checkGlobalHygiene() {
  const errors = [];
  const staticStudyScriptRe = /data\/study-[^'"`\s]+\.js/;

  for (const relPath of ['index.html', 'sw.js']) {
    const absPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(absPath)) continue;
    const text = fs.readFileSync(absPath, 'utf8');
    const match = text.match(staticStudyScriptRe);
    if (match) {
      errors.push(`[global] ${relPath} must not statically reference lazy Study script "${match[0]}"`);
    }
  }

  for (const course of STUDY_COURSES_META) {
    const courseKey = `${course.learn}_${course.cefr}`;
    if (!STUDY_OG_SAMPLES_BY_COURSE[courseKey]) {
      errors.push(`[global] Missing STUDY_OG_SAMPLES_BY_COURSE["${courseKey}"] in lib/study-og-samples.js`);
    }
  }

  return errors;
}

function validateCourse(course) {
  const errors = [];
  const warnings = [];
  const {
    learn,
    cefr,
    nounArticlePattern = '',
    helperScripts = [],
    withLangs = [],
    monolingualTracks = [],
    partDefs = {},
  } = course;
  const courseKey = `${learn}_${cefr}`;
  const ogSamples = STUDY_OG_SAMPLES_BY_COURSE[courseKey] || {};
  const pairedPreviewSamples = ogSamples.paired || {};

  const addErr = (msg) => errors.push(`[${courseKey}] ${msg}`);
  const addWarn = (msg) => warnings.push(`[${courseKey}] ${msg}`);

  if (!STUDY_LANGUAGE_META[learn]) {
    addErr(`Unknown learn language "${learn}" in STUDY_LANGUAGE_META`);
  } else if (!isNonEmptyStr(STUDY_LANGUAGE_META[learn].bcp47)) {
    addErr(`STUDY_LANGUAGE_META["${learn}"] missing bcp47 locale for speech synthesis`);
  }

  const nounArticleRe = nounArticlePattern ? new RegExp(nounArticlePattern) : null;

  const ctx = {};
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);

  const loadScript = (relPath) => {
    const absPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(absPath)) {
      addErr(`Missing script file: ${relPath}`);
      return false;
    }
    const code = fs.readFileSync(absPath, 'utf8');
    vm.runInContext(code, ctx, { filename: absPath });
    return true;
  };

  for (const h of helperScripts) {
    loadScript(h);
  }
  const coreLoaded = loadScript(`data/study-${learn}-${cefr}-core.js`);
  for (const lang of withLangs) {
    if (!STUDY_LANGUAGE_META[lang.code]) {
      addErr(`Unknown withLang "${lang.code}" in STUDY_LANGUAGE_META`);
    }
    if (lang.code === learn) {
      addErr(`withLang "${lang.code}" cannot equal learn language "${learn}"`);
    }
    loadScript(`data/study-${learn}-${cefr}-${lang.code}.js`);
  }

  const reg = ctx.STUDY_COURSE_REGISTRY;
  const raw = coreLoaded && reg && reg[courseKey];
  if (!raw) {
    addErr(`Core did not register STUDY_COURSE_REGISTRY["${courseKey}"]`);
    return { courseKey, errors, warnings, stats: {} };
  }

  if (!Array.isArray(raw.vocabCore) || raw.vocabCore.length === 0) {
    addErr('Missing or empty vocabCore');
    return { courseKey, errors, warnings, stats: {} };
  }
  if (!Array.isArray(raw.phrasesCore) || raw.phrasesCore.length === 0) {
    addErr('Missing or empty phrasesCore');
    return { courseKey, errors, warnings, stats: {} };
  }
  if (!raw.packs || typeof raw.packs !== 'object') {
    addErr('Missing packs object');
    return { courseKey, errors, warnings, stats: {} };
  }

  // 1. Validate vocabCore and partDefs.vocab
  const { allowedKeys: vocabAllowedKeys, parts: vocabPartCounts } = collectPartDefs('vocab', partDefs.vocab, addErr);
  const vocabSeenPrompt = new Map();
  raw.vocabCore.forEach((row, idx) => {
    if (!Array.isArray(row) || row.length < 3) {
      addErr(`vocabCore[${idx}] malformed tuple`);
      return;
    }
    const [word, pos, setKey, hint] = row;
    if (!isNonEmptyStr(word)) addErr(`vocabCore[${idx}] empty word`);
    if (hasUntrimmedWhitespace(word)) addErr(`vocabCore[${idx}] word has leading/trailing whitespace: ${JSON.stringify(word)}`);
    if (typeof word === 'string' && word.length > MAX_CHOICE_CHARS) {
      addWarn(`vocabCore[${idx}] word exceeds ${MAX_CHOICE_CHARS} chars (${word.length}): "${word}"`);
    }
    if (typeof hint === 'string' && hint.length > MAX_NOTE_CHARS) {
      addWarn(`vocabCore[${idx}] hint exceeds ${MAX_NOTE_CHARS} chars (${hint.length}): "${hint}"`);
    }
    if (!VALID_POS.has(pos)) addErr(`vocabCore[${idx}] invalid pos "${pos}"`);
    if (nounArticleRe && pos === 'n' && !nounArticleRe.test(String(word || ''))) {
      addErr(`vocabCore[${idx}] noun "${word}" does not match nounArticlePattern ${nounArticlePattern}`);
    }
    if (!vocabAllowedKeys.has(setKey)) addErr(`vocabCore[${idx}] ("${word}") orphaned setKey "${setKey}"`);
    vocabPartCounts.forEach((p) => {
      if (p.keys.has(setKey)) p.count += 1;
    });
    const normWord = String(word || '').trim().toLowerCase();
    if (vocabSeenPrompt.has(normWord)) {
      addWarn(`vocabCore[${idx}] duplicate word "${word}" (first at ${vocabSeenPrompt.get(normWord)})`);
    } else {
      vocabSeenPrompt.set(normWord, idx);
    }
  });
  vocabPartCounts.forEach((p) => {
    if (p.count < 2) addErr(`partDefs.vocab "${p.label}" has only ${p.count} items (need >= 2)`);
  });

  // 2. Validate monolingual tracks
  const trackCounts = {};
  for (const track of monolingualTracks) {
    const baseId = `cfg_study_${learn}_${learn}_${cefr}_${track.key}`;
    if (!STUDY_CONFIG_LABELS[baseId]) addErr(`Missing STUDY_CONFIG_LABELS["${baseId}"]`);
    if (!STUDY_PREVIEW_SAMPLES[baseId]) addErr(`Missing STUDY_PREVIEW_SAMPLES["${baseId}"]`);

    const defs = partDefs[track.key] || [];
    if (defs.length === 0) addErr(`Missing partDefs.${track.key}`);
    const { allowedKeys, parts: partCounts } = collectPartDefs(track.key, defs, addErr);

    if (track.key === 'articles' && typeof raw.buildArticles === 'function') {
      const unmappedNounSetKeys = new Set();
      raw.vocabCore.forEach(([, pos, setKey]) => {
        if (pos === 'n' && !allowedKeys.has(setKey)) {
          unmappedNounSetKeys.add(setKey);
        }
      });
      unmappedNounSetKeys.forEach((sk) => {
        addErr(`partDefs.articles missing noun setKey "${sk}" (would fall back silently)`);
      });

      const artData = raw.buildArticles(defs);
      if (!artData || !Array.isArray(artData.items) || !Array.isArray(artData.parts)) {
        addErr('buildArticles() returned invalid shape');
        continue;
      }
      trackCounts[track.key] = artData.items.length;
      artData.parts.forEach((p) => {
        if (!Array.isArray(p.indices) || p.indices.length < 2) {
          addErr(`articles part "${p.label}" has < 2 items`);
        }
      });
      const seenArt = new Map();
      artData.items.forEach((row, idx) => {
        const [prompt, correct, distractors, ruleNote] = row;
        if (!isNonEmptyStr(prompt)) addErr(`articles[${idx}] empty prompt`);
        if (hasUntrimmedWhitespace(prompt)) addErr(`articles[${idx}] prompt has leading/trailing whitespace: ${JSON.stringify(prompt)}`);
        if (!isNonEmptyStr(correct)) addErr(`articles[${idx}] empty correct`);
        if (!Array.isArray(distractors) || distractors.length === 0) {
          addErr(`articles[${idx}] missing distractors`);
        } else {
          const seenD = new Set();
          distractors.forEach((d) => {
            if (!isNonEmptyStr(d)) addErr(`articles[${idx}] empty distractor`);
            if (d === correct) addErr(`articles[${idx}] distractor equals correct "${correct}"`);
            if (seenD.has(d)) addErr(`articles[${idx}] duplicate distractor "${d}"`);
            seenD.add(d);
          });
        }
        if (!isNonEmptyStr(ruleNote)) addErr(`articles[${idx}] empty ruleNote`);
        checkChoiceLengthsAndPunct(`articles[${idx}]`, correct, distractors, ruleNote, { checkPunctGiveaway: true }, addErr, addWarn);
        const clozeIssue = checkClozeBlanks(prompt, correct);
        if (clozeIssue) addWarn(`articles[${idx}] ${clozeIssue}`);
        const sig = `${String(prompt || '').trim().toLowerCase()}|${String(correct || '').trim().toLowerCase()}`;
        if (seenArt.has(sig)) {
          addWarn(`articles[${idx}] duplicate prompt+correct "${prompt}" -> "${correct}" (first at ${seenArt.get(sig)})`);
        } else {
          seenArt.set(sig, idx);
        }
      });
      continue;
    }

    const rawItems = raw[track.key];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      addErr(`Missing or empty track array "${track.key}"`);
      continue;
    }
    trackCounts[track.key] = rawItems.length;
    const seenTrack = new Map();
    rawItems.forEach((row, idx) => {
      if (!Array.isArray(row) || row.length < 5) {
        addErr(`${track.key}[${idx}] malformed tuple (expected 5 elements)`);
        return;
      }
      const [prompt, correct, distractors, ruleNote, setKey] = row;
      if (!isNonEmptyStr(prompt)) addErr(`${track.key}[${idx}] empty prompt`);
      if (hasUntrimmedWhitespace(prompt)) addErr(`${track.key}[${idx}] prompt has leading/trailing whitespace: ${JSON.stringify(prompt)}`);
      if (!isNonEmptyStr(correct)) addErr(`${track.key}[${idx}] empty correct`);
      if (!Array.isArray(distractors) || distractors.length === 0) {
        addErr(`${track.key}[${idx}] missing distractors`);
      } else {
        const seenD = new Set();
        distractors.forEach((d) => {
          if (!isNonEmptyStr(d)) addErr(`${track.key}[${idx}] empty distractor`);
          if (d === correct) addErr(`${track.key}[${idx}] distractor equals correct "${correct}"`);
          if (seenD.has(d)) addErr(`${track.key}[${idx}] duplicate distractor "${d}"`);
          seenD.add(d);
        });
      }
      if (!isNonEmptyStr(ruleNote)) addErr(`${track.key}[${idx}] empty ruleNote`);
      if (!allowedKeys.has(setKey)) addErr(`${track.key}[${idx}] orphaned setKey "${setKey}"`);
      partCounts.forEach((p) => {
        if (p.keys.has(setKey)) p.count += 1;
      });
      checkChoiceLengthsAndPunct(`${track.key}[${idx}]`, correct, distractors, ruleNote, { checkPunctGiveaway: true }, addErr, addWarn);
      const clozeIssue = checkClozeBlanks(prompt, correct);
      if (clozeIssue) addWarn(`${track.key}[${idx}] ${clozeIssue}`);
      const sig = `${String(prompt || '').trim().toLowerCase()}|${String(correct || '').trim().toLowerCase()}`;
      if (seenTrack.has(sig)) {
        addWarn(`${track.key}[${idx}] duplicate prompt+correct "${prompt}" -> "${correct}" (first at ${seenTrack.get(sig)})`);
      } else {
        seenTrack.set(sig, idx);
      }
    });
    partCounts.forEach((p) => {
      if (p.count < 2) addErr(`partDefs.${track.key} "${p.label}" has only ${p.count} items (need >= 2)`);
    });
  }

  // 3. Validate phrasesCore and partDefs.phrases
  const { allowedKeys: phraseAllowedKeys, parts: phrasePartCounts } = collectPartDefs('phrases', partDefs.phrases, addErr);
  const phrasePunctLearnAnswers = { '.': new Set(), '?': new Set(), '!': new Set() };
  raw.phrasesCore.forEach((row, idx) => {
    if (!Array.isArray(row) || row.length < 3) {
      addErr(`phrasesCore[${idx}] malformed tuple`);
      return;
    }
    const [correct, distractors, setKey] = row;
    if (!isNonEmptyStr(correct)) addErr(`phrasesCore[${idx}] empty correct`);
    if (!Array.isArray(distractors) || distractors.length === 0) {
      addErr(`phrasesCore[${idx}] missing distractors`);
    } else {
      const seenD = new Set();
      distractors.forEach((d) => {
        if (!isNonEmptyStr(d)) addErr(`phrasesCore[${idx}] empty distractor`);
        if (d === correct) addErr(`phrasesCore[${idx}] distractor equals correct "${correct}"`);
        if (seenD.has(d)) addErr(`phrasesCore[${idx}] duplicate distractor "${d}"`);
        seenD.add(d);
      });
    }
    if (!phraseAllowedKeys.has(setKey)) addErr(`phrasesCore[${idx}] orphaned setKey "${setKey}"`);
    phrasePartCounts.forEach((p) => {
      if (p.keys.has(setKey)) p.count += 1;
    });
    checkChoiceLengthsAndPunct(`phrasesCore[${idx}]`, correct, distractors, '', { checkPunctGiveaway: true, checkLengthRatio: true, maxChoiceChars: MAX_PHRASE_CHARS }, addErr, addWarn);
    phrasePunctLearnAnswers[getPhraseEndingPunct(correct)].add(correct);
  });
  phrasePartCounts.forEach((p) => {
    if (p.count < 2) addErr(`partDefs.phrases "${p.label}" has only ${p.count} items (need >= 2)`);
  });

  // 4. Validate each withLang pack + pairedPreviewSamples + pos_pool viability (full & per-mini-part)
  for (const lang of withLangs) {
    const code = lang.code;
    const pack = raw.packs[code];
    if (!pack) {
      addErr(`Missing pack "${code}" in packs`);
      continue;
    }
    if (!Array.isArray(pack.vocab) || pack.vocab.length !== raw.vocabCore.length) {
      addErr(`pack "${code}" vocab length ${pack.vocab ? pack.vocab.length : 'N/A'} !== vocabCore ${raw.vocabCore.length}`);
    } else {
      const fwdPosAnswers = new Map();
      const revPosAnswers = new Map();
      const seenTransByPos = new Map();
      const partVocabBuckets = vocabPartCounts.map((p) => ({
        label: p.label,
        keys: p.keys,
        allTarget: new Set(),
        byPosTarget: new Map(),
        byPosLearn: new Map(),
      }));

      pack.vocab.forEach((trans, idx) => {
        if (!isNonEmptyStr(trans)) {
          addErr(`pack "${code}" vocab[${idx}] empty translation`);
          return;
        }
        if (hasUntrimmedWhitespace(trans)) {
          addErr(`pack "${code}" vocab[${idx}] translation has leading/trailing whitespace: ${JSON.stringify(trans)}`);
        }
        if (typeof trans === 'string' && trans.length > MAX_CHOICE_CHARS) {
          addWarn(`pack "${code}" vocab[${idx}] translation exceeds ${MAX_CHOICE_CHARS} chars (${trans.length}): "${trans}"`);
        }

        const [learnWord, pos, setKey] = raw.vocabCore[idx];
        if (!fwdPosAnswers.has(pos)) fwdPosAnswers.set(pos, new Set());
        if (!revPosAnswers.has(pos)) revPosAnswers.set(pos, new Set());
        fwdPosAnswers.get(pos).add(trans);
        revPosAnswers.get(pos).add(learnWord);

        const normKey = `${pos}|${String(trans).trim().toLowerCase()}`;
        const normLearn = String(learnWord || '').trim().toLowerCase();
        if (seenTransByPos.has(normKey)) {
          const prev = seenTransByPos.get(normKey);
          if (prev.normLearn !== normLearn) {
            addWarn(`pack "${code}" vocab[${idx}] duplicate "${pos}" translation "${trans}" for "${learnWord}" (also "${prev.learnWord}" at ${prev.idx})`);
          }
        } else {
          seenTransByPos.set(normKey, { idx, learnWord, normLearn });
        }

        partVocabBuckets.forEach((bucket) => {
          if (!bucket.keys.has(setKey)) return;
          bucket.allTarget.add(trans);
          if (!bucket.byPosTarget.has(pos)) bucket.byPosTarget.set(pos, new Set());
          if (!bucket.byPosLearn.has(pos)) bucket.byPosLearn.set(pos, new Set());
          bucket.byPosTarget.get(pos).add(trans);
          bucket.byPosLearn.get(pos).add(learnWord);
        });
      });

      for (const [pos, set] of fwdPosAnswers.entries()) {
        if (set.size < 2) addErr(`pack "${code}" vocab pos="${pos}" has < 2 distinct target answers`);
      }
      for (const [pos, set] of revPosAnswers.entries()) {
        if (set.size < 2) addErr(`pack "${code}" vocab pos="${pos}" has < 2 distinct learn answers`);
      }

      partVocabBuckets.forEach((bucket) => {
        if (bucket.allTarget.size < 2) {
          addErr(`pack "${code}" partDefs.vocab "${bucket.label}" has < 2 distinct target answers`);
        }
        for (const [pos, set] of bucket.byPosTarget.entries()) {
          if (set.size < 2) {
            addWarn(`pack "${code}" vocab part "${bucket.label}" pos="${pos}" has only ${set.size} distinct target answer(s)`);
          }
        }
        for (const [pos, set] of bucket.byPosLearn.entries()) {
          if (set.size < 2) {
            addWarn(`pack "${code}" vocab part "${bucket.label}" pos="${pos}" has only ${set.size} distinct learn answer(s)`);
          }
        }
      });
    }

    if (!Array.isArray(pack.phrases) || pack.phrases.length !== raw.phrasesCore.length) {
      addErr(`pack "${code}" phrases length ${pack.phrases ? pack.phrases.length : 'N/A'} !== phrasesCore ${raw.phrasesCore.length}`);
    } else {
      const punctTransAnswers = { '.': new Set(), '?': new Set(), '!': new Set() };
      const seenPhraseTrans = new Map();
      const partPhraseBuckets = phrasePartCounts.map((p) => ({
        label: p.label,
        keys: p.keys,
        punctTarget: { '.': new Set(), '?': new Set(), '!': new Set() },
        questionCount: 0,
      }));

      pack.phrases.forEach((entry, idx) => {
        if (!Array.isArray(entry) || entry.length < 2) {
          addErr(`pack "${code}" phrases[${idx}] malformed tuple`);
          return;
        }
        const [trans, note] = entry;
        if (!isNonEmptyStr(trans)) addErr(`pack "${code}" phrases[${idx}] empty translation`);
        if (hasUntrimmedWhitespace(trans)) {
          addErr(`pack "${code}" phrases[${idx}] translation has leading/trailing whitespace: ${JSON.stringify(trans)}`);
        }
        if (typeof trans === 'string' && trans.length > MAX_PHRASE_CHARS) {
          addWarn(`pack "${code}" phrases[${idx}] translation exceeds ${MAX_PHRASE_CHARS} chars (${trans.length}): "${trans}"`);
        }
        if (!isNonEmptyStr(note)) addErr(`pack "${code}" phrases[${idx}] empty ruleNote`);
        if (typeof note === 'string' && note.length > MAX_NOTE_CHARS) {
          addWarn(`pack "${code}" phrases[${idx}] ruleNote exceeds ${MAX_NOTE_CHARS} chars (${note.length}): "${note}"`);
        }

        const normTrans = String(trans || '').trim().toLowerCase();
        if (seenPhraseTrans.has(normTrans)) {
          addWarn(`pack "${code}" phrases[${idx}] duplicate translation "${trans}" (first at ${seenPhraseTrans.get(normTrans)})`);
        } else {
          seenPhraseTrans.set(normTrans, idx);
        }

        const [learnPhrase, , setKey] = raw.phrasesCore[idx];
        const punct = getPhraseEndingPunct(learnPhrase);
        punctTransAnswers[punct].add(trans);

        partPhraseBuckets.forEach((bucket) => {
          if (!bucket.keys.has(setKey)) return;
          bucket.punctTarget[punct].add(trans);
          if (punct === '?') bucket.questionCount += 1;
        });
      });

      for (const punct of ['.', '?', '!']) {
        const totalForPunct = raw.phrasesCore.filter(([c]) => getPhraseEndingPunct(c) === punct).length;
        if (totalForPunct > 0 && punctTransAnswers[punct].size < 2) {
          if (punct === '?' || (punctTransAnswers['.'].size + punctTransAnswers['!'].size < 2)) {
            addErr(`pack "${code}" phrases punct="${punct}" lacks >= 2 distinct answers for pos_pool`);
          }
        }
      }

      partPhraseBuckets.forEach((bucket) => {
        if (bucket.questionCount > 0 && bucket.punctTarget['?'].size < 2) {
          addWarn(`pack "${code}" phrases part "${bucket.label}" has only ${bucket.punctTarget['?'].size} distinct "?" answer(s)`);
        }
      });
    }

    const sample = pairedPreviewSamples[code];
    if (!sample) {
      addErr(`Missing pairedPreviewSamples["${code}"]`);
    } else {
      if (!isNonEmptyStr(sample.vocabPrompt)) addErr(`pairedPreviewSamples.${code}.vocabPrompt missing`);
      if (!Array.isArray(sample.vocabChoices) || sample.vocabChoices.length !== 2) {
        addErr(`pairedPreviewSamples.${code}.vocabChoices must have 2 items`);
      } else if (sample.vocabChoices[0] === sample.vocabChoices[1]) {
        addErr(`pairedPreviewSamples.${code}.vocabChoices has identical items`);
      }
      if (!Array.isArray(sample.vocabReverseChoices) || sample.vocabReverseChoices.length !== 2) {
        addErr(`pairedPreviewSamples.${code}.vocabReverseChoices must have 2 items`);
      } else if (sample.vocabReverseChoices[0] === sample.vocabReverseChoices[1]) {
        addErr(`pairedPreviewSamples.${code}.vocabReverseChoices has identical items`);
      }
      if (!sample.phrases || !isNonEmptyStr(sample.phrases.prompt) || !Array.isArray(sample.phrases.choices) || sample.phrases.choices.length !== 2) {
        addErr(`pairedPreviewSamples.${code}.phrases malformed`);
      } else if (sample.phrases.choices[0] === sample.phrases.choices[1]) {
        addErr(`pairedPreviewSamples.${code}.phrases.choices has identical items`);
      }
      if (!sample.phrasesReverse || !isNonEmptyStr(sample.phrasesReverse.prompt) || !Array.isArray(sample.phrasesReverse.choices) || sample.phrasesReverse.choices.length !== 2) {
        addErr(`pairedPreviewSamples.${code}.phrasesReverse malformed`);
      } else if (sample.phrasesReverse.choices[0] === sample.phrasesReverse.choices[1]) {
        addErr(`pairedPreviewSamples.${code}.phrasesReverse.choices has identical items`);
      }
    }

    const expectedCfgIds = [
      `cfg_study_${learn}_${code}_${cefr}_vocab_${learn}_${code}`,
      `cfg_study_${learn}_${code}_${cefr}_vocab_${code}_${learn}`,
      `cfg_study_${learn}_${code}_${cefr}_phrases_${learn}_${code}`,
      `cfg_study_${learn}_${code}_${cefr}_phrases`,
    ];
    for (const id of expectedCfgIds) {
      if (!STUDY_CONFIG_LABELS[id]) addErr(`Missing STUDY_CONFIG_LABELS["${id}"]`);
      if (!STUDY_PREVIEW_SAMPLES[id]) addErr(`Missing STUDY_PREVIEW_SAMPLES["${id}"]`);
    }
  }

  return {
    courseKey,
    errors,
    warnings,
    stats: {
      vocab: raw.vocabCore.length,
      phrases: raw.phrasesCore.length,
      ...trackCounts,
      packs: Object.keys(raw.packs).length,
    },
  };
}

const globalErrors = checkGlobalHygiene();
let totalErrors = globalErrors.length;
let totalWarnings = 0;

console.log(`OG Home Study Badge: "${getStudyOgHomeBadge()}"`);
console.log('');

globalErrors.forEach((e) => console.error(`  ERROR ${e}`));

for (const course of STUDY_COURSES_META) {
  const res = validateCourse(course);
  totalErrors += res.errors.length;
  totalWarnings += res.warnings.length;
  const s = res.stats;
  const status = res.errors.length === 0 ? 'PASS' : 'FAIL';
  console.log(
    `[${status}] ${res.courseKey} — vocab:${s.vocab || 0} grammar:${s.grammar || 0} verbs:${s.verbs || 0} articles:${s.articles || 0} phrases:${s.phrases || 0} packs:${s.packs || 0} (warnings:${res.warnings.length}, errors:${res.errors.length})`
  );
  res.warnings.forEach((w) => console.warn(`  WARN  ${w}`));
  res.errors.forEach((e) => console.error(`  ERROR ${e}`));
}

console.log('');
console.log(`Summary: ${STUDY_COURSES_META.length} courses, ${totalWarnings} warnings, ${totalErrors} errors.`);
process.exit(totalErrors > 0 ? 1 : 0);
