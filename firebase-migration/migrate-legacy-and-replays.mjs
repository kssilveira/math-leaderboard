#!/usr/bin/env node
/**
 * Migrates remaining legacy/drifted data in Firebase RTDB:
 *   A. Backfills 17 legacy math leaderboard entries missing right/wrong/durationMs.
 *   B. Deletes invalid zero-score leaderboard entry (SwiftFox488, score: 0) and any replay.
 *   C. Remaps drifted German A1 Study replays recorded before 2026-11-27T16:30:00Z
 *      against git commits cfaedd5 and f5032a5 onto current HEAD item/distractor indices.
 *
 * Usage:
 *   node firebase-migration/migrate-legacy-and-replays.mjs --dry-run
 *   FIREBASE_AUTH_TOKEN=<oauth2_token> node firebase-migration/migrate-legacy-and-replays.mjs --apply
 *   FIREBASE_DB_SECRET=<db_secret> node firebase-migration/migrate-legacy-and-replays.mjs --apply
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  STUDY_COURSES_META,
  STUDY_LANGUAGE_META,
  STUDY_CEFR_ORDER,
  resolveStudyConfigIdAlias,
} from '../lib/study-meta.js';

const FIREBASE_DB_URL = 'https://math-leaderboard-122f4-default-rtdb.europe-west1.firebasedatabase.app';
const F50_TS = Date.parse('2026-11-27T14:10:03Z');
const CUTOFF_TS = Date.parse('2026-11-27T16:30:00Z');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const isApply = process.argv.includes('--apply');

function buildAuthQuery() {
  if (process.env.FIREBASE_AUTH_TOKEN) {
    return `?access_token=${encodeURIComponent(process.env.FIREBASE_AUTH_TOKEN)}`;
  }
  if (process.env.FIREBASE_DB_SECRET) {
    return `?auth=${encodeURIComponent(process.env.FIREBASE_DB_SECRET)}`;
  }
  return '';
}

function appendAuthQuery(pathname, authQuery = '') {
  if (!authQuery) return pathname;
  const sep = pathname.includes('?') ? '&' : '?';
  return `${pathname}${sep}${authQuery.slice(1)}`;
}

async function fetchJson(pathname, authQuery = '') {
  const res = await fetch(`${FIREBASE_DB_URL}${appendAuthQuery(pathname, authQuery)}`);
  if (!res.ok) {
    throw new Error(`GET ${pathname} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function norm(s) {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function stripNestedParens(s) {
  let prev;
  let cur = String(s ?? '');
  do {
    prev = cur;
    cur = cur.replace(/\s*\([^()]*\)\s*/g, ' ');
  } while (cur !== prev);
  return norm(cur);
}

function stripArticle(s) {
  return norm(s).replace(/^(der|die|das)\s+/, '');
}

function loadHeadQuizRuntime() {
  const rt = {
    STUDY_COURSES_META,
    STUDY_LANGUAGE_META,
    STUDY_CEFR_ORDER,
    resolveStudyConfigIdAlias,
    resolveConfigIdAlias: resolveStudyConfigIdAlias,
    COMPACT_OPS: ['+', '-', '×', '÷', '?'],
    GAME_DURATION_SECONDS: 60,
    console,
    document: {},
    navigator: {},
    localStorage: { getItem: () => null, setItem: () => {} },
  };
  rt.window = rt;
  rt.globalThis = rt;
  vm.createContext(rt);

  const load = (relPath) => {
    const abs = path.join(ROOT_DIR, relPath);
    vm.runInContext(fs.readFileSync(abs, 'utf8'), rt, { filename: relPath });
  };

  load('data/quiz-datasets.js');
  load('js/quiz-data.js');
  load('js/quiz-engine.js');

  const loadedHelpers = new Set();
  for (const course of STUDY_COURSES_META) {
    for (const helperRel of course.helperScripts || []) {
      if (!loadedHelpers.has(helperRel)) {
        load(helperRel);
        loadedHelpers.add(helperRel);
      }
    }
    load(`data/study-${course.learn}-${course.cefr}-core.js`);
    for (const lang of course.withLangs) {
      load(`data/study-${course.learn}-${course.cefr}-${lang.code}.js`);
      rt.hydrateStudyCourseData(course.learn, course.cefr, lang.code);
    }
  }

  const cfgById = new Map();
  for (const c of vm.runInContext('BUILTIN_QUIZ_CONFIGS', rt)) {
    cfgById.set(c.id, c);
  }
  return { rt, cfgById };
}

function loadHistoricalDeA1Configs(commit) {
  const show = (relPath) =>
    execSync(`git show ${commit}:${relPath}`, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });

  const rt = {
    COMPACT_OPS: ['+', '-', '×', '÷', '?'],
    GAME_DURATION_SECONDS: 60,
    console,
    document: {},
    navigator: {},
    localStorage: { getItem: () => null, setItem: () => {} },
  };
  rt.window = rt;
  rt.globalThis = rt;
  vm.createContext(rt);

  vm.runInContext(show('data/quiz-datasets.js'), rt, { filename: `${commit}:data/quiz-datasets.js` });
  vm.runInContext(show('data/study-de-a1-en.js'), rt, { filename: `${commit}:data/study-de-a1-en.js` });
  vm.runInContext(show('js/quiz-data.js'), rt, { filename: `${commit}:js/quiz-data.js` });

  const cfgById = new Map();
  for (const c of vm.runInContext('BUILTIN_QUIZ_CONFIGS', rt)) {
    cfgById.set(resolveStudyConfigIdAlias(c.id), c);
  }
  return cfgById;
}

function findMatchedItemIndex(items, cfgId, oldPrompt, oldAns) {
  // 1. Exact prompt & answer
  let idx = items.findIndex((it) => it[0] === oldPrompt && it[1] === oldAns);
  if (idx >= 0) return idx;
  // 2. Stripped nested parens prompt & normalized answer
  const oldNoParen = stripNestedParens(oldPrompt);
  const oldNormAns = norm(oldAns);
  idx = items.findIndex((it) => stripNestedParens(it[0]) === oldNoParen && norm(it[1]) === oldNormAns);
  if (idx >= 0) return idx;
  // 3. Normalized prompt
  const oldNormPrompt = norm(oldPrompt);
  idx = items.findIndex((it) => norm(it[0]) === oldNormPrompt);
  if (idx >= 0) return idx;
  // 4. Stripped nested parens prompt
  idx = items.findIndex((it) => stripNestedParens(it[0]) === oldNoParen);
  if (idx >= 0) return idx;
  // 5. Vocab article-stripped match
  if (cfgId.includes('vocab_de_en')) {
    const oldPromptNoArt = stripArticle(oldPrompt);
    idx = items.findIndex((it) => stripArticle(it[0]) === oldPromptNoArt);
    if (idx >= 0) return idx;
  }
  if (cfgId.includes('vocab_en_de')) {
    const oldAnsNoArt = stripArticle(oldAns);
    idx = items.findIndex((it) => stripArticle(it[1]) === oldAnsNoArt);
    if (idx >= 0) return idx;
  }
  // 6. Phrases German answer match
  if (cfgId.includes('phrases')) {
    idx = items.findIndex((it) => norm(it[1]) === oldNormAns);
    if (idx >= 0) return idx;
  }
  return -1;
}

function findMatchingDistractorIdx(newCfg, newQIdx, oldDist, cfgId) {
  const newItems = newCfg.items || [];
  const normDist = norm(oldDist);
  if (newCfg.distractorMode === 'explicit') {
    const dList = Array.isArray(newItems[newQIdx]?.[2]) ? newItems[newQIdx][2] : [];
    return dList.findIndex((d) => d === oldDist || norm(d) === normDist);
  }
  const targetAns = String(newItems[newQIdx]?.[1] ?? '');
  return newItems.findIndex((it, idx) => {
    if (idx === newQIdx || String(it[1] ?? '') === targetAns) return false;
    if (it[1] === oldDist || norm(it[1]) === normDist) return true;
    if (cfgId.includes('vocab_en_de') && stripArticle(it[1]) === stripArticle(oldDist)) return true;
    return false;
  });
}

function pickValidDistractorIdx(rt, newCfg, newQIdx) {
  const newItems = newCfg.items || [];
  if (newCfg.distractorMode === 'explicit') {
    const dList = Array.isArray(newItems[newQIdx]?.[2]) ? newItems[newQIdx][2] : [];
    const targetAns = String(newItems[newQIdx]?.[1] ?? '');
    const distinctIdx = dList.findIndex((d) => String(d) !== targetAns);
    return distinctIdx >= 0 ? distinctIdx : 0;
  }
  const targetAns = String(newItems[newQIdx]?.[1] ?? '');
  if (typeof rt.sampleQuizDistractorIndex === 'function') {
    for (let attempt = 0; attempt < 5; attempt++) {
      const cand = rt.sampleQuizDistractorIndex(newCfg, newQIdx);
      if (cand !== newQIdx && cand >= 0 && cand < newItems.length && String(newItems[cand]?.[1] ?? '') !== targetAns) {
        return cand;
      }
    }
  }
  const fallback = newItems.findIndex((it, idx) => idx !== newQIdx && String(it[1] ?? '') !== targetAns);
  if (fallback >= 0) return fallback;
  return newItems.length > 1 ? (newQIdx + 1) % newItems.length : 0;
}

function pickFallbackItemAndDistractor(rt, newCfg, cfgId, oldIdx, oldAns, oldDist, usedFallbackIndices) {
  const newItems = newCfg.items || [];
  const normAns = norm(oldAns);
  const candidates = [];

  for (let idx = 0; idx < newItems.length; idx++) {
    if (norm(newItems[idx]?.[1]) === normAns) {
      const distIdx = findMatchingDistractorIdx(newCfg, idx, oldDist, cfgId);
      candidates.push({ idx, distIdx, unused: !usedFallbackIndices.has(idx) });
    }
  }

  // 1. Unused item with matching answer & matching distractor
  let chosen = candidates.find((c) => c.unused && c.distIdx >= 0);
  // 2. Any item with matching answer & matching distractor
  if (!chosen) chosen = candidates.find((c) => c.distIdx >= 0);
  // 3. Unused item with matching answer
  if (!chosen) chosen = candidates.find((c) => c.unused);
  // 4. Deterministic unused index starting at oldIdx % newItems.length
  if (!chosen && newItems.length > 0) {
    const start = ((Number(oldIdx) || 0) % newItems.length + newItems.length) % newItems.length;
    let picked = start;
    for (let step = 0; step < newItems.length; step++) {
      const idx = (start + step) % newItems.length;
      if (!usedFallbackIndices.has(idx)) {
        picked = idx;
        break;
      }
    }
    chosen = { idx: picked, distIdx: findMatchingDistractorIdx(newCfg, picked, oldDist, cfgId) };
  }

  const newQIdx = chosen ? chosen.idx : 0;
  usedFallbackIndices.add(newQIdx);

  let newDIdx = chosen && chosen.distIdx >= 0 ? chosen.distIdx : -1;
  if (newDIdx < 0) {
    newDIdx = pickValidDistractorIdx(rt, newCfg, newQIdx);
  }
  // Ensure distinct choices
  const built = rt.buildQuizQuestionFromIndices(newCfg, newQIdx, newDIdx, 0);
  if (built.choices[0] === built.choices[1]) {
    newDIdx = pickValidDistractorIdx(rt, newCfg, newQIdx);
  }
  return { newQIdx, newDIdx };
}

function applyPatchToClone(lbData, rpData, patch) {
  const nextLb = structuredClone(lbData);
  const nextRp = structuredClone(rpData);
  for (const [pathKey, val] of Object.entries(patch)) {
    const parts = pathKey.split('/');
    if (parts.length !== 3) {
      throw new Error(`Unexpected patch path shape: ${pathKey}`);
    }
    const [rootKey, cfgId, uid] = parts;
    const target = rootKey === 'leaderboards' ? nextLb : rootKey === 'replays' ? nextRp : null;
    if (!target) {
      throw new Error(`Unexpected patch root key: ${pathKey}`);
    }
    if (val === null) {
      if (target[cfgId]) {
        delete target[cfgId][uid];
        if (Object.keys(target[cfgId]).length === 0) {
          delete target[cfgId];
        }
      }
    } else {
      if (!target[cfgId]) target[cfgId] = {};
      target[cfgId][uid] = structuredClone(val);
    }
  }
  return { lb: nextLb, rp: nextRp };
}

function verifyDatabaseState(lbData, rpData, rt, cfgById) {
  const errors = [];

  for (const [cfgId, board] of Object.entries(lbData || {})) {
    if (!board || typeof board !== 'object') {
      errors.push(`leaderboards/${cfgId}: board is not an object`);
      continue;
    }
    for (const [uid, e] of Object.entries(board)) {
      if (!e || typeof e !== 'object') {
        errors.push(`leaderboards/${cfgId}/${uid}: entry is not an object`);
        continue;
      }
      if (e.userId !== uid) errors.push(`leaderboards/${cfgId}/${uid}: userId (${e.userId}) !== key`);
      if (typeof e.username !== 'string' || e.username.length < 1 || e.username.length > 20) {
        errors.push(`leaderboards/${cfgId}/${uid}: invalid username ${JSON.stringify(e.username)}`);
      }
      if (typeof e.score !== 'number' || e.score <= 0 || e.score > 200) {
        errors.push(`leaderboards/${cfgId}/${uid}: invalid score ${e.score}`);
      }
      if (typeof e.right !== 'number' || e.right < 1 || e.right > 200) {
        errors.push(`leaderboards/${cfgId}/${uid}: invalid right ${e.right}`);
      }
      if (typeof e.wrong !== 'number' || e.wrong < 0 || e.wrong > 200) {
        errors.push(`leaderboards/${cfgId}/${uid}: invalid wrong ${e.wrong}`);
      }
      if (typeof e.right === 'number' && typeof e.wrong === 'number' && e.score !== e.right - e.wrong) {
        errors.push(`leaderboards/${cfgId}/${uid}: score (${e.score}) !== right (${e.right}) - wrong (${e.wrong})`);
      }
      if (typeof e.durationMs !== 'number' || e.durationMs < 500 || e.durationMs > 70000) {
        errors.push(`leaderboards/${cfgId}/${uid}: invalid durationMs ${e.durationMs}`);
      }
      if (typeof e.updatedAt !== 'number') {
        errors.push(`leaderboards/${cfgId}/${uid}: missing/non-numeric updatedAt`);
      }

      const rp = rpData?.[cfgId]?.[uid];
      if (Boolean(e.hasReplay) !== Boolean(rp)) {
        errors.push(`leaderboards/${cfgId}/${uid}: hasReplay (${e.hasReplay}) !== replay exists (${Boolean(rp)})`);
      }
      if (rp && rp.updatedAt !== e.updatedAt) {
        errors.push(`leaderboards/${cfgId}/${uid}: updatedAt (${e.updatedAt}) !== replay updatedAt (${rp.updatedAt})`);
      }
    }
  }

  for (const [cfgId, board] of Object.entries(rpData || {})) {
    if (!board || typeof board !== 'object') {
      errors.push(`replays/${cfgId}: board is not an object`);
      continue;
    }
    const cfg = cfgById.get(cfgId);
    for (const [uid, rp] of Object.entries(board)) {
      const lb = lbData?.[cfgId]?.[uid];
      if (!lb) {
        errors.push(`replays/${cfgId}/${uid}: orphan replay without leaderboard entry`);
      }
      if (!rp || typeof rp !== 'object' || typeof rp.updatedAt !== 'number' || !Array.isArray(rp.q) || rp.q.length === 0) {
        errors.push(`replays/${cfgId}/${uid}: malformed replay object`);
        continue;
      }

      let rSum = 0;
      let wSum = 0;
      for (let i = 0; i < rp.q.length; i++) {
        const t = rp.q[i];
        if (!Array.isArray(t) || t.length < 5 || t.length > 7) {
          errors.push(`replays/${cfgId}/${uid}[${i}]: invalid tuple length ${Array.isArray(t) ? t.length : 'non-array'}`);
          continue;
        }
        const [a, opIdx, b, mIdx, dur, wrongArr, rightFlag] = t;
        if (typeof dur !== 'number') {
          errors.push(`replays/${cfgId}/${uid}[${i}]: non-numeric duration`);
        }
        if (wrongArr !== undefined && !Array.isArray(wrongArr)) {
          errors.push(`replays/${cfgId}/${uid}[${i}]: wrongArr is not an array`);
        }
        if (rightFlag !== undefined && rightFlag !== 0) {
          errors.push(`replays/${cfgId}/${uid}[${i}]: unexpected 7th element ${rightFlag}`);
        }
        const wLen = Array.isArray(wrongArr) ? wrongArr.length : 0;
        const rVal = rightFlag === 0 ? 0 : 1;
        rSum += rVal;
        wSum += wLen;

        if (opIdx === 4) {
          if (!cfg) {
            errors.push(`replays/${cfgId}/${uid}[${i}]: missing quiz config ${cfgId}`);
            continue;
          }
          const items = cfg.items || [];
          if (!Number.isInteger(a) || a < 0 || a >= items.length) {
            errors.push(`replays/${cfgId}/${uid}[${i}]: qIdx ${a} out of bounds (len=${items.length})`);
            continue;
          }
          if (cfg.distractorMode === 'explicit') {
            const dList = items[a]?.[2];
            if (!Array.isArray(dList) || !Number.isInteger(b) || b < 0 || b >= dList.length) {
              errors.push(`replays/${cfgId}/${uid}[${i}]: explicit dIdx ${b} out of bounds`);
              continue;
            }
          } else {
            if (!Number.isInteger(b) || b < 0 || b >= items.length || b === a) {
              errors.push(`replays/${cfgId}/${uid}[${i}]: pool dIdx ${b} invalid (qIdx=${a}, len=${items.length})`);
              continue;
            }
          }
          const built = rt.buildQuizQuestionFromIndices(cfg, a, b, mIdx === 1 ? 1 : 0);
          if (built.choices[0] === built.choices[1]) {
            errors.push(`replays/${cfgId}/${uid}[${i}]: identical choices ${JSON.stringify(built.choices[0])}`);
          }
          if (Array.isArray(wrongArr)) {
            for (const w of wrongArr) {
              if (String(w) !== String(built.distractor)) {
                errors.push(
                  `replays/${cfgId}/${uid}[${i}]: wrongAnswer ${JSON.stringify(w)} !== distractor ${JSON.stringify(built.distractor)}`
                );
              }
            }
          }
        }
      }

      if (lb && (lb.right !== rSum || lb.wrong !== wSum || lb.score !== rSum - wSum)) {
        errors.push(
          `replays/${cfgId}/${uid}: stats mismatch lb=(${lb.score},${lb.right},${lb.wrong}) vs replay=(${rSum - wSum},${rSum},${wSum})`
        );
      }
    }
  }

  return errors;
}

async function main() {
  const authQuery = buildAuthQuery();
  if (isApply && !authQuery) {
    console.error('Error: --apply requires FIREBASE_AUTH_TOKEN (OAuth2 access token) or FIREBASE_DB_SECRET.');
    process.exit(1);
  }

  console.log(`Fetching /leaderboards.json and /replays.json from ${FIREBASE_DB_URL}...`);
  const [leaderboards, replays] = await Promise.all([
    fetchJson('/leaderboards.json', authQuery),
    fetchJson('/replays.json', authQuery),
  ]);

  const lbData = leaderboards && typeof leaderboards === 'object' ? leaderboards : {};
  const rpData = replays && typeof replays === 'object' ? replays : {};

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(__dirname, `backup-legacy-replays-${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ leaderboards: lbData, replays: rpData }, null, 2));
  console.log(`Backup written to ${backupPath}`);

  const patch = {};
  const stats = {
    backfilledCount: 0,
    deletedZeroScoreCount: 0,
    deletedZeroScoreReplays: 0,
    remappedReplays: 0,
    unchangedDeA1Replays: 0,
    totalQuestionsProcessed: 0,
    exactQuestions: 0,
    fallbackQuestions: 0,
    exactDistractors: 0,
    fallbackDistractors: 0,
    wrongAnswersRemapped: 0,
  };

  // Part A & Part B: Backfill legacy math entries & delete invalid zero-score entries
  for (const [cfgId, board] of Object.entries(lbData)) {
    if (!board || typeof board !== 'object') continue;
    for (const [uid, entry] of Object.entries(board)) {
      const invalidScore =
        !entry ||
        typeof entry !== 'object' ||
        typeof entry.score !== 'number' ||
        entry.score <= 0 ||
        (typeof entry.right === 'number' && entry.right < 1);

      if (invalidScore) {
        patch[`leaderboards/${cfgId}/${uid}`] = null;
        stats.deletedZeroScoreCount += 1;
        if (rpData?.[cfgId]?.[uid]) {
          patch[`replays/${cfgId}/${uid}`] = null;
          stats.deletedZeroScoreReplays += 1;
        }
        continue;
      }

      const missingFields =
        typeof entry.right !== 'number' ||
        typeof entry.wrong !== 'number' ||
        typeof entry.durationMs !== 'number';

      if (missingFields) {
        patch[`leaderboards/${cfgId}/${uid}`] = {
          ...entry,
          right: typeof entry.right === 'number' ? entry.right : entry.score,
          wrong: typeof entry.wrong === 'number' ? entry.wrong : 0,
          durationMs: typeof entry.durationMs === 'number' ? entry.durationMs : 60000,
        };
        stats.backfilledCount += 1;
      }
    }
  }

  // Part C: Remap drifted German A1 Study replays
  console.log('Loading HEAD quiz configs and historical git configs (cfaedd5, f5032a5)...');
  const { rt, cfgById: headCfgById } = loadHeadQuizRuntime();
  const oldCfaById = loadHistoricalDeA1Configs('cfaedd5');
  const oldF50ById = loadHistoricalDeA1Configs('f5032a5');

  const oldWrongMismatches = [];

  for (const [cfgId, board] of Object.entries(rpData)) {
    if (!cfgId.startsWith('cfg_study_de_') || !board || typeof board !== 'object') continue;
    for (const [uid, rp] of Object.entries(board)) {
      if (!rp || typeof rp !== 'object' || typeof rp.updatedAt !== 'number' || rp.updatedAt >= CUTOFF_TS) {
        continue;
      }
      const oldMap = rp.updatedAt >= F50_TS ? oldF50ById : oldCfaById;
      const oldCfg = oldMap.get(cfgId);
      const newCfg = headCfgById.get(cfgId);
      if (!oldCfg || !newCfg) {
        throw new Error(`Missing config for ${cfgId}: old=${Boolean(oldCfg)} new=${Boolean(newCfg)}`);
      }
      const oldItems = oldCfg.items || [];
      const newItems = newCfg.items || [];
      const oldExplicit = oldCfg.distractorMode === 'explicit';
      const usedFallbackIndices = new Set();
      const nextQ = [];

      for (let i = 0; i < (rp.q || []).length; i++) {
        const tuple = rp.q[i];
        const [a, opIdx, b, mIdx, dur, wrongArr, rightFlag] = tuple;
        if (opIdx !== 4) {
          nextQ.push(tuple);
          continue;
        }
        stats.totalQuestionsProcessed += 1;

        const oldItem = oldItems[a];
        if (!oldItem) {
          throw new Error(`Historical index out of bounds: ${cfgId}/${uid}[${i}] a=${a} len=${oldItems.length}`);
        }
        const oldPrompt = oldItem[0];
        const oldAns = oldItem[1];
        const oldDist = oldExplicit ? oldItem[2]?.[b] : oldItems[b]?.[1];

        // Verify historical commit matches recorded wrongAnswers
        if (Array.isArray(wrongArr) && wrongArr.length > 0) {
          for (const w of wrongArr) {
            if (String(w) !== String(oldDist)) {
              oldWrongMismatches.push({ cfgId, uid, i, w, oldDist, oldPrompt, oldAns });
            }
          }
        }

        const choiceOrder = mIdx === 1 ? 1 : 0;
        let newQIdx = findMatchedItemIndex(newItems, cfgId, oldPrompt, oldAns);
        let newDIdx = -1;

        if (newQIdx >= 0) {
          stats.exactQuestions += 1;
          newDIdx = findMatchingDistractorIdx(newCfg, newQIdx, oldDist, cfgId);
          if (newDIdx >= 0) {
            stats.exactDistractors += 1;
          } else {
            stats.fallbackDistractors += 1;
            newDIdx = pickValidDistractorIdx(rt, newCfg, newQIdx);
          }
        } else {
          stats.fallbackQuestions += 1;
          const fb = pickFallbackItemAndDistractor(rt, newCfg, cfgId, a, oldAns, oldDist, usedFallbackIndices);
          newQIdx = fb.newQIdx;
          newDIdx = fb.newDIdx;
          if (findMatchingDistractorIdx(newCfg, newQIdx, oldDist, cfgId) === newDIdx) {
            stats.exactDistractors += 1;
          } else {
            stats.fallbackDistractors += 1;
          }
        }

        const built = rt.buildQuizQuestionFromIndices(newCfg, newQIdx, newDIdx, choiceOrder);
        if (built.choices[0] === built.choices[1]) {
          throw new Error(`Generated identical choices for ${cfgId}/${uid}[${i}] qIdx=${newQIdx} dIdx=${newDIdx}`);
        }

        let nextWrong;
        if (Array.isArray(wrongArr) && wrongArr.length > 0) {
          const allMatch = wrongArr.every((w) => String(w) === String(built.distractor));
          if (allMatch) {
            nextWrong = [...wrongArr];
          } else {
            nextWrong = wrongArr.map(() => String(built.distractor));
            stats.wrongAnswersRemapped += wrongArr.length;
          }
        }

        const nextTuple = [newQIdx, 4, newDIdx, choiceOrder, dur];
        if ((nextWrong && nextWrong.length > 0) || rightFlag === 0) {
          nextTuple.push(nextWrong || []);
        }
        if (rightFlag === 0) {
          nextTuple.push(0);
        }
        nextQ.push(nextTuple);
      }

      if (JSON.stringify(nextQ) !== JSON.stringify(rp.q)) {
        patch[`replays/${cfgId}/${uid}`] = {
          updatedAt: rp.updatedAt,
          q: nextQ,
        };
        stats.remappedReplays += 1;
      } else {
        stats.unchangedDeA1Replays += 1;
      }
    }
  }

  if (oldWrongMismatches.length > 0) {
    console.error('Historical commit wrong-answer verification failed:', oldWrongMismatches.slice(0, 10));
    process.exit(1);
  }

  // Simulated post-patch verification
  const simulated = applyPatchToClone(lbData, rpData, patch);
  const simErrors = verifyDatabaseState(simulated.lb, simulated.rp, rt, headCfgById);
  if (simErrors.length > 0) {
    console.error(`Simulated post-patch verification FAILED with ${simErrors.length} error(s):`);
    for (const err of simErrors.slice(0, 20)) {
      console.error('  -', err);
    }
    process.exit(1);
  }

  const patchPath = path.join(__dirname, 'legacy-replays-patch.json');
  fs.writeFileSync(patchPath, JSON.stringify(patch, null, 2));
  console.log(`Root multi-path PATCH written to ${patchPath} (${Object.keys(patch).length} paths)`);
  console.log('\nMigration summary:');
  console.table([stats]);
  console.log('Simulated post-patch verification PASSED (0 errors across all leaderboards & replays).');

  if (!isApply) {
    console.log('\nDry-run complete. To apply atomically to Firebase RTDB, run:');
    console.log('  FIREBASE_AUTH_TOKEN=<oauth2_access_token> node firebase-migration/migrate-legacy-and-replays.mjs --apply');
    console.log('  # or:');
    console.log('  FIREBASE_DB_SECRET=<db_secret> node firebase-migration/migrate-legacy-and-replays.mjs --apply');
    return;
  }

  console.log('\nApplying atomic multi-path PATCH to /.json ...');
  const patchRes = await fetch(`${FIREBASE_DB_URL}/.json${authQuery}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!patchRes.ok) {
    const errText = await patchRes.text();
    throw new Error(`PATCH /.json failed: ${patchRes.status} ${patchRes.statusText} — ${errText}`);
  }

  console.log('Re-fetching live /leaderboards.json and /replays.json for post-apply verification...');
  const [afterLb, afterRp] = await Promise.all([
    fetchJson('/leaderboards.json', authQuery),
    fetchJson('/replays.json', authQuery),
  ]);
  const liveErrors = verifyDatabaseState(afterLb || {}, afterRp || {}, rt, headCfgById);
  if (liveErrors.length > 0) {
    console.error(`Post-apply live verification FAILED with ${liveErrors.length} error(s):`);
    for (const err of liveErrors.slice(0, 20)) {
      console.error('  -', err);
    }
    process.exit(1);
  }
  console.log('Migration applied and verified: 0 errors across live /leaderboards and /replays.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
