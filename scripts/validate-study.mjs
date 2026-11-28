import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  STUDY_COURSES_META,
  STUDY_LANGUAGE_META,
  STUDY_CONFIG_LABELS,
  STUDY_PREVIEW_SAMPLES,
  getStudyOgHomeBadge,
} from '../lib/study-meta.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const VALID_POS = new Set(['n', 'v', 'adj', 'fn']);

function isNonEmptyStr(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

function getPhraseEndingPunct(text) {
  const last = String(text || '').trim().slice(-1);
  if (last === '?' || last === '!') return last;
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

function validateCourse(course) {
  const errors = [];
  const warnings = [];
  const { learn, cefr, helperScripts = [], withLangs = [], monolingualTracks = [], partDefs = {}, pairedPreviewSamples = {} } = course;
  const courseKey = `${learn}_${cefr}`;

  const addErr = (msg) => errors.push(`[${courseKey}] ${msg}`);
  const addWarn = (msg) => warnings.push(`[${courseKey}] ${msg}`);

  if (!STUDY_LANGUAGE_META[learn]) {
    addErr(`Unknown learn language "${learn}" in STUDY_LANGUAGE_META`);
  }

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
  const vocabAllowedKeys = new Set();
  const vocabPartCounts = (partDefs.vocab || []).map((d) => {
    (d.keys || []).forEach((k) => vocabAllowedKeys.add(k));
    return { label: d.label, keys: new Set(d.keys || []), count: 0 };
  });
  const vocabSeenPrompt = new Map();
  raw.vocabCore.forEach((row, idx) => {
    if (!Array.isArray(row) || row.length < 3) {
      addErr(`vocabCore[${idx}] malformed tuple`);
      return;
    }
    const [word, pos, setKey] = row;
    if (!isNonEmptyStr(word)) addErr(`vocabCore[${idx}] empty word`);
    if (!VALID_POS.has(pos)) addErr(`vocabCore[${idx}] invalid pos "${pos}"`);
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

    if (track.key === 'articles' && typeof raw.buildArticles === 'function') {
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
      artData.items.forEach((row, idx) => {
        const [prompt, correct, distractors, ruleNote] = row;
        if (!isNonEmptyStr(prompt)) addErr(`articles[${idx}] empty prompt`);
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
        const clozeIssue = checkClozeBlanks(prompt, correct);
        if (clozeIssue) addWarn(`articles[${idx}] ${clozeIssue}`);
      });
      continue;
    }

    const rawItems = raw[track.key];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      addErr(`Missing or empty track array "${track.key}"`);
      continue;
    }
    trackCounts[track.key] = rawItems.length;
    const allowedKeys = new Set();
    const partCounts = defs.map((d) => {
      (d.keys || []).forEach((k) => allowedKeys.add(k));
      return { label: d.label, keys: new Set(d.keys || []), count: 0 };
    });
    rawItems.forEach((row, idx) => {
      if (!Array.isArray(row) || row.length < 5) {
        addErr(`${track.key}[${idx}] malformed tuple (expected 5 elements)`);
        return;
      }
      const [prompt, correct, distractors, ruleNote, setKey] = row;
      if (!isNonEmptyStr(prompt)) addErr(`${track.key}[${idx}] empty prompt`);
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
      const clozeIssue = checkClozeBlanks(prompt, correct);
      if (clozeIssue) addWarn(`${track.key}[${idx}] ${clozeIssue}`);
    });
    partCounts.forEach((p) => {
      if (p.count < 2) addErr(`partDefs.${track.key} "${p.label}" has only ${p.count} items (need >= 2)`);
    });
  }

  // 3. Validate phrasesCore and partDefs.phrases
  const phraseAllowedKeys = new Set();
  const phrasePartCounts = (partDefs.phrases || []).map((d) => {
    (d.keys || []).forEach((k) => phraseAllowedKeys.add(k));
    return { label: d.label, keys: new Set(d.keys || []), count: 0 };
  });
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
    phrasePunctLearnAnswers[getPhraseEndingPunct(correct)].add(correct);
  });
  phrasePartCounts.forEach((p) => {
    if (p.count < 2) addErr(`partDefs.phrases "${p.label}" has only ${p.count} items (need >= 2)`);
  });

  // 4. Validate each withLang pack + pairedPreviewSamples + pos_pool viability
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
      pack.vocab.forEach((trans, idx) => {
        if (!isNonEmptyStr(trans)) {
          addErr(`pack "${code}" vocab[${idx}] empty translation`);
          return;
        }
        const [learnWord, pos] = raw.vocabCore[idx];
        if (!fwdPosAnswers.has(pos)) fwdPosAnswers.set(pos, new Set());
        if (!revPosAnswers.has(pos)) revPosAnswers.set(pos, new Set());
        fwdPosAnswers.get(pos).add(trans);
        revPosAnswers.get(pos).add(learnWord);
      });
      for (const [pos, set] of fwdPosAnswers.entries()) {
        if (set.size < 2) addErr(`pack "${code}" vocab pos="${pos}" has < 2 distinct target answers`);
      }
      for (const [pos, set] of revPosAnswers.entries()) {
        if (set.size < 2) addErr(`pack "${code}" vocab pos="${pos}" has < 2 distinct learn answers`);
      }
    }

    if (!Array.isArray(pack.phrases) || pack.phrases.length !== raw.phrasesCore.length) {
      addErr(`pack "${code}" phrases length ${pack.phrases ? pack.phrases.length : 'N/A'} !== phrasesCore ${raw.phrasesCore.length}`);
    } else {
      const punctTransAnswers = { '.': new Set(), '?': new Set(), '!': new Set() };
      pack.phrases.forEach((entry, idx) => {
        if (!Array.isArray(entry) || entry.length < 2) {
          addErr(`pack "${code}" phrases[${idx}] malformed tuple`);
          return;
        }
        const [trans, note] = entry;
        if (!isNonEmptyStr(trans)) addErr(`pack "${code}" phrases[${idx}] empty translation`);
        if (!isNonEmptyStr(note)) addErr(`pack "${code}" phrases[${idx}] empty ruleNote`);
        const punct = getPhraseEndingPunct(raw.phrasesCore[idx][0]);
        punctTransAnswers[punct].add(trans);
      });
      for (const punct of ['.', '?', '!']) {
        const totalForPunct = raw.phrasesCore.filter(([c]) => getPhraseEndingPunct(c) === punct).length;
        if (totalForPunct > 0 && punctTransAnswers[punct].size < 2) {
          if (punct === '?' || (punctTransAnswers['.'].size + punctTransAnswers['!'].size < 2)) {
            addErr(`pack "${code}" phrases punct="${punct}" lacks >= 2 distinct answers for pos_pool`);
          }
        }
      }
    }

    const sample = pairedPreviewSamples[code];
    if (!sample) {
      addErr(`Missing pairedPreviewSamples["${code}"]`);
    } else {
      if (!isNonEmptyStr(sample.vocabPrompt)) addErr(`pairedPreviewSamples.${code}.vocabPrompt missing`);
      if (!Array.isArray(sample.vocabChoices) || sample.vocabChoices.length !== 2) {
        addErr(`pairedPreviewSamples.${code}.vocabChoices must have 2 items`);
      }
      if (!Array.isArray(sample.vocabReverseChoices) || sample.vocabReverseChoices.length !== 2) {
        addErr(`pairedPreviewSamples.${code}.vocabReverseChoices must have 2 items`);
      }
      if (!sample.phrases || !isNonEmptyStr(sample.phrases.prompt) || !Array.isArray(sample.phrases.choices) || sample.phrases.choices.length !== 2) {
        addErr(`pairedPreviewSamples.${code}.phrases malformed`);
      }
      if (!sample.phrasesReverse || !isNonEmptyStr(sample.phrasesReverse.prompt) || !Array.isArray(sample.phrasesReverse.choices) || sample.phrasesReverse.choices.length !== 2) {
        addErr(`pairedPreviewSamples.${code}.phrasesReverse malformed`);
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

let totalErrors = 0;
let totalWarnings = 0;

console.log(`OG Home Study Badge: "${getStudyOgHomeBadge()}"`);
console.log('');

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
