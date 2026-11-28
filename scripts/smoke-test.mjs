import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  STUDY_COURSES_META,
  STUDY_LANGUAGE_META,
  STUDY_CEFR_ORDER,
  resolveStudyConfigIdAlias,
  getStudyOgHomeBadge,
} from '../lib/study-meta.js';
import {
  formatConfigId,
  getMiniPartLabel,
  resolveConfigIdAlias,
} from '../lib/config-labels.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

let passedCount = 0;

function runCheck(name, fn) {
  fn();
  passedCount += 1;
  console.log(`  [PASS] ${name}`);
}

async function runAsyncCheck(name, fn) {
  await fn();
  passedCount += 1;
  console.log(`  [PASS] ${name}`);
}

function readRoot(relPath) {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8');
}

function extractTopLevelDecls(source) {
  const decls = [];
  const lines = source.split('\n');
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (depth === 0) {
      const m = line.match(/^\s*(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/);
      if (m) decls.push(m[1]);
    }
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '{') depth += 1;
      else if (ch === '}') depth = Math.max(0, depth - 1);
    }
  }
  return decls;
}

// 1. Script syntax & global collision check
const CLASSIC_CLIENT_SCRIPTS = [
  'js/geo-maps.js',
  'js/quiz-data.js',
  'js/quiz-engine.js',
  'js/audio-speech.js',
  'js/storage.js',
  'js/leaderboard.js',
  'js/firebase.js',
  'js/review.js',
  'js/overview.js',
  'js/replay.js',
  'js/game.js',
  'js/pwa-ui.js',
  'js/users.js',
  'js/configs.js',
  'js/app.js',
];

runCheck('Script syntax & global lexical non-collision check', () => {
  for (const rel of ['sw.js', ...CLASSIC_CLIENT_SCRIPTS]) {
    const code = readRoot(rel);
    new vm.Script(code, { filename: rel });
  }

  // Load extracted modules sequentially in one VM context to ensure no duplicate const/let/function errors
  const ctx = {
    window: {},
    globalThis: {},
    document: {},
    navigator: {},
    localStorage: { getItem: () => null, setItem: () => {} },
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  const extractedModules = [
    'js/quiz-engine.js',
    'js/audio-speech.js',
    'js/storage.js',
    'js/leaderboard.js',
    'js/firebase.js',
    'js/review.js',
    'js/overview.js',
    'js/replay.js',
    'js/game.js',
    'js/pwa-ui.js',
    'js/users.js',
    'js/configs.js',
  ];
  const moduleDecls = new Map();
  for (const rel of extractedModules) {
    const code = readRoot(rel);
    vm.runInContext(code, ctx, { filename: rel });
    for (const sym of extractTopLevelDecls(code)) {
      assert.equal(moduleDecls.has(sym), false, `Duplicate top-level symbol "${sym}" between ${moduleDecls.get(sym)} and ${rel}`);
      moduleDecls.set(sym, rel);
    }
  }

  const appDecls = new Set(extractTopLevelDecls(readRoot('js/app.js')));
  for (const [sym, modRel] of moduleDecls.entries()) {
    assert.equal(appDecls.has(sym), false, `Symbol "${sym}" from ${modRel} is still declared in js/app.js`);
  }
});

// 2. PWA / APP_SHELL integrity check
runCheck('PWA APP_SHELL & index.html script alignment', () => {
  const swSource = readRoot('sw.js');
  const appShellMatch = swSource.match(/const\s+APP_SHELL\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(appShellMatch, 'Could not locate APP_SHELL in sw.js');

  const appShellEntries = Array.from(appShellMatch[1].matchAll(/['"]([^'"]+)['"]/g)).map((m) => m[1]);
  assert.ok(appShellEntries.length > 0, 'APP_SHELL is empty');

  for (const entry of appShellEntries) {
    const cleanRel = entry === './' ? 'index.html' : entry.replace(/^\.\//, '');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, cleanRel)), `APP_SHELL entry missing on disk: ${entry}`);
  }

  const appShellSet = new Set(appShellEntries.map((e) => (e === './' ? 'index.html' : e.replace(/^\.\//, ''))));
  const indexHtml = readRoot('index.html');
  const scriptSrcs = Array.from(indexHtml.matchAll(/<script[^>]*\bsrc=['"]([^'"]+)['"]/g)).map((m) => m[1]);
  assert.ok(scriptSrcs.length > 0, 'No <script src="..."> tags found in index.html');

  for (const src of scriptSrcs) {
    assert.ok(!src.startsWith('data/study-'), `index.html must not statically load ${src}`);
    assert.ok(appShellSet.has(src), `index.html script "${src}" missing from sw.js APP_SHELL`);
  }

  const htmlIds = Array.from(indexHtml.matchAll(/\bid=['"]([^'"]+)['"]/g)).map((m) => m[1]);
  const seenIds = new Set();
  for (const id of htmlIds) {
    assert.equal(seenIds.has(id), false, `Duplicate id "${id}" found in index.html`);
    seenIds.add(id);
  }
});

// 3. OG metadata & config labels check
runCheck('OG home badge & Study config label aliases', () => {
  const badge = getStudyOgHomeBadge();
  for (const flag of ['🇩🇪', '🇬🇧', '🇧🇷', '🇪🇸', '🇫🇷']) {
    assert.ok(badge.includes(flag), `OG Home Study badge missing flag ${flag}: "${badge}"`);
  }
  assert.equal(badge.includes('+1'), false, `OG Home Study badge should not truncate to +1: "${badge}"`);

  const aliased = resolveConfigIdAlias('cfg_study_de_en_a1_grammar');
  assert.equal(aliased, 'cfg_study_de_de_a1_grammar');
  const label = formatConfigId('cfg_study_de_en_a1_grammar');
  assert.ok(label.includes('Grammar'), `Unexpected formatted label for alias: "${label}"`);
  assert.equal(getMiniPartLabel('cfg_study_fr_en_a1_vocab_fr_en', 1), '⏰ Basics & Time');
});

// 4–9. Runtime VM harness across quiz-data, quiz-engine, audio-speech, and replay
const rt = {
  STUDY_COURSES_META,
  STUDY_LANGUAGE_META,
  STUDY_CEFR_ORDER,
  resolveStudyConfigIdAlias,
  resolveConfigIdAlias: resolveStudyConfigIdAlias,
  COMPACT_OPS: ['+', '-', '×', '÷', '?'],
  GAME_DURATION_SECONDS: 60,
  activeConfigId: 'cfg_add-sub_0_10_0_10_0_20',
  console,
  TextEncoder,
  TextDecoder,
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  document: {},
  navigator: {},
  localStorage: { getItem: () => null, setItem: () => {} },
};
rt.window = rt;
rt.globalThis = rt;
vm.createContext(rt);

for (const rel of ['data/quiz-datasets.js', 'js/quiz-data.js', 'js/quiz-engine.js', 'js/audio-speech.js', 'js/replay.js']) {
  vm.runInContext(readRoot(rel), rt, { filename: rel });
}

vm.runInContext(`
  globalThis.__builtinQuizConfigs = BUILTIN_QUIZ_CONFIGS;
  globalThis.__studyConfigsById = STUDY_CONFIGS_BY_ID;
  const ALL_CONFIGS_BY_ID = new Map();
  BUILTIN_QUIZ_CONFIGS.forEach((cfg) => ALL_CONFIGS_BY_ID.set(cfg.id, cfg));
  ALL_CONFIGS_BY_ID.set('cfg_add-sub_0_10_0_10_0_20', {
    id: 'cfg_add-sub_0_10_0_10_0_20',
    category: 'math',
    type: 'math',
    ops: ['+', '-'],
    min1: 0, max1: 10, min2: 0, max2: 10, min3: 0, max3: 20,
  });
  function getConfigById(id) {
    return ALL_CONFIGS_BY_ID.get(resolveStudyConfigIdAlias(id)) || null;
  }
  function isQuizConfig(cfg) {
    return Boolean(cfg && cfg.type === 'quiz');
  }
  function getConfigCategory(cfg) {
    return (cfg && cfg.category) || 'math';
  }
`, rt);

// 4. Full runtime Study hydration across all 10 courses & 40 packs
runCheck('Full runtime Study hydration across all 10 courses & 40 packs', () => {
  assert.ok(rt.__builtinQuizConfigs.length > 1000, `Expected >1000 builtin configs, got ${rt.__builtinQuizConfigs.length}`);

  for (const cfg of rt.__studyConfigsById.values()) {
    assert.equal(cfg.isLazyStudy, true);
    assert.equal(cfg.studyDataLoaded, false);
  }

  const loadedHelpers = new Set();
  for (const course of STUDY_COURSES_META) {
    for (const helperRel of course.helperScripts || []) {
      if (!loadedHelpers.has(helperRel)) {
        vm.runInContext(readRoot(helperRel), rt, { filename: helperRel });
        loadedHelpers.add(helperRel);
      }
    }
    const coreRel = `data/study-${course.learn}-${course.cefr}-core.js`;
    vm.runInContext(readRoot(coreRel), rt, { filename: coreRel });
    for (const lang of course.withLangs) {
      const packRel = `data/study-${course.learn}-${course.cefr}-${lang.code}.js`;
      vm.runInContext(readRoot(packRel), rt, { filename: packRel });
      const ok = rt.hydrateStudyCourseData(course.learn, course.cefr, lang.code);
      assert.equal(ok, true, `hydrateStudyCourseData failed for ${course.learn}_${course.cefr} (${lang.code})`);
    }
  }

  for (const [id, cfg] of rt.__studyConfigsById.entries()) {
    assert.equal(cfg.studyDataLoaded, true, `Study config not hydrated: ${id}`);
    assert.ok(Array.isArray(cfg.items) && cfg.items.length >= 2, `Study config ${id} has < 2 items`);
  }
});

// 5. Distractor sampling & question building
runCheck('Distractor sampling, pos_pool gloss overlap & question building', () => {
  assert.equal(rt.answersOverlapGloss('to go / to walk', 'to walk'), true);
  assert.equal(rt.answersOverlapGloss('big', 'small'), false);

  const sampleConfigs = [
    ...rt.__studyConfigsById.values(),
    rt.getConfigById('cfg_geo_flag_country'),
    rt.getConfigById('cfg_geo_map_country'),
    rt.getConfigById('cfg_lang_en_pt'),
    rt.getConfigById('cfg_chem_symbol_name'),
    rt.getConfigById('cfg_other_morse_char'),
  ];

  for (const cfg of sampleConfigs) {
    assert.ok(cfg && cfg.items.length >= 2);
    const sampleIndices = [0, Math.floor(cfg.items.length / 2), cfg.items.length - 1];
    for (const qIdx of sampleIndices) {
      const dIdx = rt.sampleQuizDistractorIndex(cfg, qIdx);
      const choiceOrder = qIdx % 2;
      const q = rt.buildQuizQuestionFromIndices(cfg, qIdx, dIdx, choiceOrder);
      assert.equal(q.choices.length, 2, `${cfg.id}[${qIdx}] should have 2 choices`);
      assert.notEqual(q.choices[0], q.choices[1], `${cfg.id}[${qIdx}] generated identical choices: "${q.choices[0]}"`);
      assert.equal(q.choices[choiceOrder], q.answer, `${cfg.id}[${qIdx}] choiceOrder mismatch`);
    }
  }
});

// 6. Cloze rendering across all 10 Study courses
runCheck('Cloze rendering & elision across all 10 Study courses', () => {
  const multiBlankHtml = rt.fillClozePromptHtml('Je ___ mange ___ de viande.', 'ne ... pas');
  assert.ok(multiBlankHtml.includes('<span class="review-q-slot">ne</span>'));
  assert.ok(multiBlankHtml.includes('<span class="review-q-slot">pas</span>'));
  assert.equal(rt.fillClozePlainText('Je ___ mange ___ de viande.', 'ne ... pas'), 'Je ne mange pas de viande.');

  const elisionHtml = rt.fillClozePromptHtml('___ ami', 'l’');
  assert.equal(elisionHtml, '<span class="review-q-slot">l’</span>ami');
  assert.equal(rt.fillClozePlainText('___ ami', 'l’'), 'l’ami');

  assert.equal(rt.fillClozePlainText('I like ___ music.', '—'), 'I like music.');

  let clozeItemsChecked = 0;
  for (const [id, cfg] of rt.__studyConfigsById.entries()) {
    if (cfg.isMini || cfg.distractorMode !== 'explicit') continue;
    for (let i = 0; i < cfg.items.length; i++) {
      const [prompt, expected] = cfg.items[i];
      if (!String(prompt).includes('___')) continue;
      const html = rt.fillClozePromptHtml(prompt, expected);
      const plain = rt.fillClozePlainText(prompt, expected);
      assert.equal(html.includes('___'), false, `Leftover ___ in fillClozePromptHtml for ${id}[${i}]`);
      assert.equal(plain.includes('___'), false, `Leftover ___ in fillClozePlainText for ${id}[${i}]`);
      clozeItemsChecked += 1;
    }
  }
  assert.ok(clozeItemsChecked > 1000, `Expected >1000 cloze items checked, got ${clozeItemsChecked}`);
});

// 7. Compact question & Replay / Ghost Race round-trip
await runAsyncCheck('Compact question & Replay / Ghost Race round-trip', async () => {
  // Override ensureStudyConfigLoaded in VM to verify already-hydrated configs resolve cleanly
  rt.ensureStudyConfigLoaded = async (cfgId) => Boolean(rt.getConfigById(cfgId));

  // Math round-trip (+, -, ×, ÷, including wrongAnswers & right: 0)
  const mathQuestions = [
    { nums: [3, 4, 7], op: '+', missingIndex: 2, expected: 7, answers: ['7'], wrongAnswers: [], right: 1, wrong: 0, durationMs: 900 },
    { nums: [9, 5, 4], op: '-', missingIndex: 1, expected: 5, answers: ['4', '5'], wrongAnswers: ['4'], right: 1, wrong: 1, durationMs: 1400 },
    { nums: [6, 7, 42], op: '×', missingIndex: 0, expected: 6, answers: ['8'], wrongAnswers: ['8'], right: 0, wrong: 1, durationMs: 2100 },
    { nums: [24, 6, 4], op: '÷', missingIndex: 2, expected: 4, answers: ['4'], wrongAnswers: [], right: 1, wrong: 0, durationMs: 750 },
  ];
  const mathEncoded = rt.encodeCompactQuestionsList(mathQuestions, 'cfg_add-sub_0_10_0_10_0_20');
  const mathDecoded = rt.decodeCompactQuestionsList(mathEncoded, 'cfg_add-sub_0_10_0_10_0_20');
  assert.equal(mathDecoded.length, 4);
  assert.equal(mathDecoded[1].wrong, 1);
  assert.equal(mathDecoded[2].right, 0);
  assert.equal(mathDecoded[3].expected, 4);

  // Explicit Study round-trip: explicitly verify dIdx === 0 when qIdx === 0 is NOT shifted!
  const explicitCfgId = 'cfg_study_fr_fr_a1_grammar';
  const explicitCfg = rt.getConfigById(explicitCfgId);
  const explicitBuilt = rt.buildQuizQuestionFromIndices(explicitCfg, 0, 0, 1);
  const explicitSession = {
    username: 'Tester',
    configId: explicitCfgId,
    score: 1,
    right: 1,
    wrong: 0,
    durationMs: 12000,
    questions: [
      {
        nums: [0, 0, 0],
        op: '?',
        missingIndex: 1,
        prompt: explicitBuilt.prompt,
        expected: explicitBuilt.answer,
        distractor: explicitBuilt.distractor,
        answers: [explicitBuilt.answer],
        wrongAnswers: [],
        right: 1,
        wrong: 0,
        durationMs: 1100,
      },
    ],
  };
  const explicitParam = rt.encodeReplayParam(explicitSession);
  const explicitDecoded = await rt.decodeReplayParam(explicitParam);
  assert.equal(explicitDecoded.questions[0].nums[0], 0);
  assert.equal(explicitDecoded.questions[0].nums[1], 0, 'explicit dIdx === 0 must not be shifted when qIdx === 0');
  assert.equal(explicitDecoded.questions[0].distractor, explicitBuilt.distractor);

  // pos_pool Study + Ghost Race round-trip
  const posCfgId = 'cfg_study_de_en_a1_vocab_de_en';
  const posCfg = rt.getConfigById(posCfgId);
  const posQ0 = rt.buildQuizQuestionFromIndices(posCfg, 0, 1, 0);
  const posQ1 = rt.buildQuizQuestionFromIndices(posCfg, 2, 3, 1);
  const raceSession = {
    username: 'Alice',
    configId: posCfgId,
    score: 1,
    right: 1,
    wrong: 0,
    durationMs: 10000,
    questions: [{ ...posQ0, expected: posQ0.answer, answers: [posQ0.answer], wrongAnswers: [], right: 1, wrong: 0, durationMs: 850 }],
    opponent: {
      username: 'Bob',
      score: 0,
      right: 1,
      wrong: 1,
      durationMs: 10000,
      questions: [{ ...posQ1, expected: posQ1.answer, answers: [posQ1.distractor, posQ1.answer], wrongAnswers: [posQ1.distractor], right: 1, wrong: 1, durationMs: 1200 }],
    },
  };
  const raceParam = rt.encodeReplayParam(raceSession);
  const raceDecoded = await rt.decodeReplayParam(raceParam);
  assert.equal(raceDecoded.isRace, true);
  assert.equal(raceDecoded.opponent.username, 'Bob');
  assert.equal(raceDecoded.opponent.questions.length, 1);

  const timeline = rt.buildReplayTimeline(raceDecoded, posCfgId);
  assert.equal(timeline.segments.length, 1);
  assert.ok(timeline.totalDurationMs >= 500);
});

// 8. Math constraint sampler & missing index check
runCheck('Math constraint sampler & missing index edge cases', () => {
  const cfg = { ops: ['+', '-', '×', '÷'], min1: -12, max1: 12, min2: -6, max2: 6, min3: -20, max3: 20 };
  const samplers = rt.getValidSamplers(cfg);
  assert.equal(samplers.length, 4, 'Expected 4 valid samplers for +, -, ×, ÷');

  for (const sampleFn of samplers) {
    for (let i = 0; i < 20; i++) {
      const { a, b, c, op } = sampleFn();
      assert.ok(a >= cfg.min1 && a <= cfg.max1, `a=${a} out of range`);
      assert.ok(b >= cfg.min2 && b <= cfg.max2, `b=${b} out of range`);
      assert.ok(c >= cfg.min3 && c <= cfg.max3, `c=${c} out of range`);
      if (op === '+') assert.equal(a + b, c);
      else if (op === '-') assert.equal(a - b, c);
      else if (op === '×') assert.equal(a * b, c);
      else if (op === '÷') {
        assert.notEqual(b, 0);
        assert.equal(b * c, a);
      }
    }
  }

  assert.deepEqual(Array.from(rt.getValidMissingIndices(0, '×', 5, 0)), [2, 0]);
  assert.deepEqual(Array.from(rt.getValidMissingIndices(5, '×', 0, 0)), [2, 1]);
  assert.deepEqual(Array.from(rt.getValidMissingIndices(0, '÷', 4, 0)), [0, 2]);
});

// 9. Study TTS payload helper check
runCheck('Study TTS payload helper across all 7 track types', () => {
  const trackIds = [
    'cfg_study_es_en_a1_vocab_es_en',
    'cfg_study_es_en_a1_vocab_en_es',
    'cfg_study_es_en_a1_phrases_es_en',
    'cfg_study_es_en_a1_phrases',
    'cfg_study_es_es_a1_grammar',
    'cfg_study_es_es_a1_verbs',
    'cfg_study_es_es_a1_articles',
  ];
  for (const id of trackIds) {
    const cfg = rt.getConfigById(id);
    const q = rt.buildQuizQuestionFromIndices(cfg, 0, rt.sampleQuizDistractorIndex(cfg, 0), 0);
    const normQ = rt.normalizeQuestionRecord({ nums: q.nums, op: '?', missingIndex: 0, right: 1, wrong: 0, durationMs: 500 }, id);

    const livePayload = rt.getStudyReviewSpeakPayload(cfg, q);
    const normPayload = rt.getStudyReviewSpeakPayload(cfg, normQ);
    assert.ok(livePayload && livePayload.text.length > 0, `Empty live TTS review payload for ${id}`);
    assert.ok(normPayload && normPayload.text.length > 0, `Empty normalized TTS review payload for ${id}`);
    assert.equal(livePayload.lang, 'es');
    assert.equal(livePayload.text, normPayload.text);
    assert.equal(livePayload.lang, normPayload.lang);
    assert.equal(livePayload.text.includes('___'), false, `Leftover ___ in TTS payload for ${id}`);

    const promptPayload = rt.getStudyPromptSpeakPayload(cfg, q, false);
    if (cfg.studyTrackKey === 'vocab_fwd' || cfg.studyTrackKey === 'phrases_fwd') {
      assert.ok(promptPayload && promptPayload.text.length > 0, `Expected prompt TTS payload for ${id}`);
    } else {
      assert.equal(promptPayload, null, `Expected null unrevealed prompt TTS payload for ${id}`);
    }
    const revealedPayload = rt.getStudyPromptSpeakPayload(cfg, q, true);
    assert.ok(revealedPayload);
    assert.equal(revealedPayload.text, livePayload.text);
    assert.equal(revealedPayload.lang, livePayload.lang);
  }
});

// 10. Unified Learn + With overview & profile filtering
runCheck('Unified Learn + With filtering in overview.js', () => {
  const sampleConfigs = [
    { id: 'cfg_add-sub_0_10_0_10_0_20', category: 'math', type: 'math', ops: ['+', '-'] },
    { id: 'cfg_geo_flag_country', category: 'geo', type: 'quiz' },
    { id: 'cfg_chem_symbol_name', category: 'other', type: 'quiz' },
    { id: 'cfg_lang_synonym_de', category: 'lang', langs: ['de'], type: 'quiz' },
    { id: 'cfg_lang_synonym', category: 'lang', langs: ['en'], type: 'quiz' },
    { id: 'cfg_lang_de_en', category: 'lang', langs: ['de', 'en'], type: 'quiz' },
    { id: 'cfg_lang_en_de', category: 'lang', langs: ['en', 'de'], type: 'quiz' },
    { id: 'cfg_lang_de_pt', category: 'lang', langs: ['de', 'pt'], type: 'quiz' },
    { id: 'cfg_study_de_de_a1_grammar', category: 'study', studyLearn: 'de', studyWith: 'de', studyCefr: 'a1', studyTrackKey: 'grammar', type: 'quiz' },
    { id: 'cfg_study_de_en_a1_vocab_de_en', category: 'study', studyLearn: 'de', studyWith: 'en', studyCefr: 'a1', studyTrackKey: 'vocab_fwd', type: 'quiz' },
    { id: 'cfg_study_de_pt_a1_vocab_de_pt', category: 'study', studyLearn: 'de', studyWith: 'pt', studyCefr: 'a1', studyTrackKey: 'vocab_fwd', type: 'quiz' },
    { id: 'cfg_study_en_de_a1_vocab_en_de', category: 'study', studyLearn: 'en', studyWith: 'de', studyCefr: 'a1', studyTrackKey: 'vocab_fwd', type: 'quiz' },
  ];
  const excluded = new Set(['learn:en', 'learn:pt', 'learn:es', 'learn:fr', 'with:de', 'with:pt', 'with:es', 'with:fr']);
  const ovCtx = {
    STUDY_LANGUAGE_META,
    STUDY_CEFR_ORDER,
    VALID_LANG_FILTERS: ['en', 'pt', 'es', 'fr', 'de'],
    configs: sampleConfigs,
    overviewExcludedTags: excluded,
    activeLearnLang: 'de',
    activeWithLang: 'en',
    getConfigCategory: (cfg) => cfg.category || 'math',
    getStudyLangDisplay: (code) => `${(STUDY_LANGUAGE_META[code] || {}).flag || ''} ${String(code).toUpperCase()}`.trim(),
    saveOverviewExcludedFilters: () => {},
  };
  ovCtx.window = ovCtx;
  ovCtx.globalThis = ovCtx;
  vm.createContext(ovCtx);
  vm.runInContext(readRoot('js/overview.js'), ovCtx, { filename: 'js/overview.js' });

  const groups = ovCtx.getOverviewFilterGroups();
  assert.equal(groups.some((g) => g.label === 'Lang'), false, 'Separate Lang filter group must not exist');
  const learnGroup = groups.find((g) => g.label === 'Learn');
  const withGroup = groups.find((g) => g.label === 'With');
  assert.ok(learnGroup && learnGroup.options.every((o) => o.tag.startsWith('learn:')));
  assert.ok(withGroup && withGroup.options.every((o) => o.tag.startsWith('with:')));

  const isVisible = (id) => ovCtx.isOverviewConfigVisible(sampleConfigs.find((c) => c.id === id));
  assert.equal(isVisible('cfg_lang_synonym_de'), true);
  assert.equal(isVisible('cfg_lang_synonym'), false);
  assert.equal(isVisible('cfg_lang_de_en'), true);
  assert.equal(isVisible('cfg_lang_en_de'), true);
  assert.equal(isVisible('cfg_lang_de_pt'), false);
  assert.equal(isVisible('cfg_study_de_de_a1_grammar'), true);
  assert.equal(isVisible('cfg_study_de_en_a1_vocab_de_en'), true);
  assert.equal(isVisible('cfg_study_de_pt_a1_vocab_de_pt'), false);
  assert.equal(isVisible('cfg_study_en_de_a1_vocab_en_de'), false);
  assert.equal(isVisible('cfg_add-sub_0_10_0_10_0_20'), true);
  assert.equal(isVisible('cfg_geo_flag_country'), true);
  assert.equal(isVisible('cfg_chem_symbol_name'), true);
});

// 11. Split OG card modules VDOM smoke check
await runAsyncCheck('Split OG card modules VDOM & replay decode check', async () => {
  const [common, replayCard, userCard, boardCard, homeCard] = await Promise.all([
    import('../lib/og/common.js'),
    import('../lib/og/replay-card.js'),
    import('../lib/og/user-profile-card.js'),
    import('../lib/og/leaderboard-card.js'),
    import('../lib/og/home-card.js'),
  ]);
  assert.ok(common.APPROX_GAMES_COUNT >= 200);

  const samplePayload = {
    u: 'Alex',
    c: 'cfg_add-sub_0_10_0_10_0_20',
    s: 9,
    r: 10,
    w: 1,
    q: [[8, 0, 7, 2, 1100], [14, 1, 5, 1, 1300, ['8']]],
    o: { u: 'Sam', s: 7, r: 9, w: 2, q: [[8, 0, 7, 2, 1200]] },
  };
  const encoded = Buffer.from(JSON.stringify(samplePayload), 'utf8').toString('base64url');
  const decoded = replayCard.decodeReplay(encoded);
  assert.ok(decoded && decoded.opponent);
  assert.equal(replayCard.renderReplayCard(decoded).type, 'div');

  const profileVdom = userCard.renderUserProfileCard({
    userId: 'u_1',
    username: 'Alex',
    gamesRanked: 2,
    firstPlaceCount: 1,
    bestRank: 1,
    topScore: 42,
    performances: [{ cfgId: 'cfg_geo_flag_country', label: '🚩 Flag → 🌐 Country', rank: 1, totalPlayers: 5, score: 42, right: 42, wrong: 0 }],
  });
  assert.equal(profileVdom.type, 'div');

  const boardVdom = boardCard.renderLeaderboardCard(
    [{ rank: 1, username: 'Alex', score: 28 }],
    'cfg_geo_map_country'
  );
  assert.equal(boardVdom.type, 'div');

  const homeVdom = homeCard.renderHomeOverviewCard({
    activeGames: 10,
    uniquePlayers: 25,
    featuredGames: [
      { cfgId: 'cfg_add-sub_0_10_0_10_0_20', category: 'math', label: '+ − (0..10)', leaderName: 'Alex', topScore: 30 },
    ],
  });
  assert.equal(homeVdom.type, 'div');

  const homeAllVdom = homeCard.renderHomeOverviewCard(
    {
      mode: 'all',
      activeGames: 3,
      uniquePlayers: 5,
      featuredGames: [
        { cfgId: 'cfg_other_morse_char', category: 'other', label: '📡 Morse → 🔤 Character', leaderName: 'Alex', topScore: '41.8s' },
      ],
    },
    'all'
  );
  assert.equal(homeAllVdom.type, 'div');

  const timePayload = {
    u: 'Alex',
    c: 'cfg_other_morse_char',
    m: 'all',
    n: 2,
    d: 41800,
    s: 1,
    r: 2,
    w: 1,
    q: [[0, 4, 1, 0, 1200, ['B']], [1, 4, 2, 1, 900]],
    o: { u: 'Sam', n: 2, d: 45300, s: 2, r: 2, w: 0, q: [[0, 4, 1, 0, 1400], [1, 4, 2, 1, 1100]] },
  };
  const timeDecoded = replayCard.decodeReplay(Buffer.from(JSON.stringify(timePayload), 'utf8').toString('base64url'));
  assert.equal(timeDecoded.mode, 'all');
  assert.equal(timeDecoded.durationMs, 41800);
  assert.equal(replayCard.renderReplayCard(timeDecoded).type, 'div');
  assert.equal(boardCard.renderLeaderboardCard([{ rank: 1, username: 'Alex', score: '41.8s' }], 'cfg_other_morse_char', 'all').type, 'div');
  assert.equal(
    userCard.renderUserProfileCard({
      userId: 'u_1',
      mode: 'all',
      username: 'Alex',
      gamesRanked: 1,
      firstPlaceCount: 1,
      bestRank: 1,
      topScore: '41.8s',
      performances: [{ cfgId: 'cfg_other_morse_char', label: '📡 Morse → 🔤 Character', rank: 1, totalPlayers: 3, score: '41.8s', right: 36, wrong: 0 }],
    }).type,
    'div'
  );
});

// 12. Time Attack (All <= 100) deck generation, time formatting, ranking & replay round-trip
await runAsyncCheck('Time Attack deck builder, time formatting, ascending ranking & replay round-trip', async () => {
  assert.equal(rt.formatDurationMs(0), '0.0s');
  assert.equal(rt.formatDurationMs(42340), '42.3s');
  assert.equal(rt.formatDurationMs(59950), '1:00.0');
  assert.equal(rt.formatDurationMs(74200), '1:14.2');
  assert.equal(rt.formatDurationDeltaMs(-2400), '−2.4s');
  assert.equal(rt.formatDurationDeltaMs(1300), '+1.3s');

  const morseCfg = rt.getConfigById('cfg_other_morse_char');
  assert.equal(rt.getAllModeTargetCount(morseCfg, 100), 36);
  const morseDeck = rt.buildAllModeDeck(morseCfg, 100);
  assert.equal(morseDeck.length, 36);
  assert.equal(new Set(morseDeck).size, 36);

  const geoCfg = rt.getConfigById('cfg_geo_flag_country');
  assert.equal(rt.getAllModeTargetCount(geoCfg, 100), 100);
  const geoDeck = rt.buildAllModeDeck(geoCfg, 100);
  assert.equal(geoDeck.length, 100);
  assert.equal(new Set(geoDeck).size, 100);

  const smallMathCfg = { id: 'cfg_add_1_2_1_2_2_4', category: 'math', type: 'math', ops: ['+'], min1: 1, max1: 2, min2: 1, max2: 2, min3: 2, max3: 4 };
  assert.equal(rt.getAllModeTargetCount(smallMathCfg, 100), 12);
  const smallMathDeck = rt.buildAllModeDeck(smallMathCfg, 100);
  assert.equal(smallMathDeck.length, 12);
  assert.equal(new Set(smallMathDeck.map((q) => q.key)).size, 12);

  const defaultMathCfg = rt.getConfigById('cfg_add-sub_0_10_0_10_0_20');
  assert.equal(rt.getAllModeTargetCount(defaultMathCfg, 100), 100);
  const largeMathDeck = rt.buildAllModeDeck(defaultMathCfg, 100);
  assert.equal(largeMathDeck.length, 100);
  assert.equal(new Set(largeMathDeck.map((q) => q.key)).size, 100);

  const timeSession = {
    username: 'Alice',
    configId: 'cfg_other_morse_char',
    mode: 'all',
    targetCount: 2,
    score: 1,
    right: 2,
    wrong: 1,
    durationMs: 41800,
    questions: [
      { nums: [0, 1, 0], op: '?', missingIndex: 0, expected: 'A', distractor: 'B', answers: ['B'], wrongAnswers: ['B'], right: 0, wrong: 1, durationMs: 1100 },
      { nums: [1, 2, 1], op: '?', missingIndex: 1, expected: 'B', distractor: 'C', answers: ['B'], wrongAnswers: [], right: 1, wrong: 0, durationMs: 900 },
      { nums: [0, 2, 0], op: '?', missingIndex: 0, expected: 'A', distractor: 'C', answers: ['A'], wrongAnswers: [], right: 1, wrong: 0, durationMs: 800 },
    ],
    opponent: {
      username: 'Bob',
      mode: 'all',
      targetCount: 2,
      score: 2,
      right: 2,
      wrong: 0,
      durationMs: 45300,
      questions: [
        { nums: [0, 1, 0], op: '?', missingIndex: 0, expected: 'A', distractor: 'B', answers: ['A'], wrongAnswers: [], right: 1, wrong: 0, durationMs: 1200 },
        { nums: [1, 2, 1], op: '?', missingIndex: 1, expected: 'B', distractor: 'C', answers: ['B'], wrongAnswers: [], right: 1, wrong: 0, durationMs: 1100 },
      ],
    },
  };
  const encodedTime = rt.encodeReplayParam(timeSession);
  const decodedTime = await rt.decodeReplayParam(encodedTime);
  assert.equal(decodedTime.mode, 'all');
  assert.equal(decodedTime.targetCount, 2);
  assert.equal(decodedTime.durationMs, 41800);
  assert.equal(decodedTime.opponent.durationMs, 45300);

  const lbCtx = {
    activeGameMode: 'all',
    activeConfigId: 'cfg_other_morse_char',
    leaderboardsMap: {},
    timeLeaderboardsMap: {
      cfg_other_morse_char: {
        u_slow: { userId: 'u_slow', username: 'Slow', durationMs: 52000, right: 36, wrong: 0, targetCount: 36, updatedAt: 100 },
        u_fast: { userId: 'u_fast', username: 'Fast', durationMs: 39100, right: 36, wrong: 1, targetCount: 36, updatedAt: 200 },
        u_tie: { userId: 'u_tie', username: 'Tie', durationMs: 39100, right: 36, wrong: 0, targetCount: 36, updatedAt: 300 },
      },
    },
    formatDurationMs: rt.formatDurationMs,
    getBestLocalSession: () => null,
    sessionHasQuestions: () => false,
    entryHasReplay: () => false,
  };
  lbCtx.window = lbCtx;
  lbCtx.globalThis = lbCtx;
  vm.createContext(lbCtx);
  vm.runInContext(readRoot('js/leaderboard.js'), lbCtx, { filename: 'js/leaderboard.js' });
  const ranked = lbCtx.getRankedLeaderboard('cfg_other_morse_char', 'all');
  assert.equal(ranked.rankedEntries.length, 3);
  assert.equal(ranked.rankedEntries[0].userId, 'u_tie');
  assert.equal(ranked.rankedEntries[0].rank, 1);
  assert.equal(ranked.rankedEntries[1].userId, 'u_fast');
  assert.equal(ranked.rankedEntries[1].rank, 1);
  assert.equal(ranked.rankedEntries[2].userId, 'u_slow');
  assert.equal(ranked.rankedEntries[2].rank, 3);

  const mwMod = await import('../middleware.js');
  const mwHomeRes = await mwMod.default(new Request('https://math-leaderboard.vercel.app/'));
  const mwHomeHtml = await mwHomeRes.text();
  assert.ok(mwHomeHtml.includes('/api/og?v=4'), 'Middleware should emit ?v=4 home OG image');
  assert.ok(mwHomeHtml.includes('Time Attack'), 'Middleware should mention Time Attack in home OG description');

  const mwHomeAllRes = await mwMod.default(new Request('https://math-leaderboard.vercel.app/?mode=all'));
  const mwHomeAllHtml = await mwHomeAllRes.text();
  assert.ok(mwHomeAllHtml.includes('/api/og?mode=all&amp;v=4'), 'Middleware should emit ?mode=all&v=4 home OG image');
  assert.ok(mwHomeAllHtml.includes('Time Attack (≤100)'), 'Middleware should emit Time Attack (≤100) title for home ?mode=all');

  const mwRes = await mwMod.default(new Request('https://math-leaderboard.vercel.app/?config=cfg_geo_flag_country&mode=all'));
  const mwHtml = await mwRes.text();
  assert.ok(mwHtml.includes('Time Attack (≤100)'), 'Middleware should emit Time Attack OG title for &mode=all');
  assert.ok(mwHtml.includes('mode=all'), 'Middleware should forward mode=all to OG image URL');
});

// 13. Cached config popularity sorting, wall-clock 1-Min timer & Time Attack tie-breaker
runCheck('Cached config popularity sorting, wall-clock 1-Min timer & Time Attack tie-breaker', () => {
  const cfgCtx = {
    ALL_OPS: ['+', '-', '×', '÷'],
    CONFIG_MIN_BOUND: -999,
    CONFIG_MAX_BOUND: 999,
    BUILTIN_QUIZ_CONFIGS: [
      { id: 'cfg_geo_flag_country', category: 'geo', type: 'quiz', label: 'Flag' },
      { id: 'cfg_geo_flag_country_p1', parentId: 'cfg_geo_flag_country', partIndex: 1, isMini: true, category: 'geo', type: 'quiz' },
      { id: 'cfg_geo_flag_country_p2', parentId: 'cfg_geo_flag_country', partIndex: 2, isMini: true, category: 'geo', type: 'quiz' },
      { id: 'cfg_other_morse_char', category: 'other', type: 'quiz', label: 'Morse' },
    ],
    configs: [],
    configsByIdMap: new Map(),
    localConfigsCache: null,
    activeGameMode: '1min',
    activeConfigId: 'cfg_other_morse_char',
    leaderboardsMap: {
      cfg_geo_flag_country: { u1: { score: 10 } },
      cfg_geo_flag_country_p1: { u1: { score: 5 }, u2: { score: 6 }, u3: { score: 7 } },
      cfg_other_morse_char: { u1: { score: 8 }, u2: { score: 9 } },
    },
    timeLeaderboardsMap: {
      cfg_other_morse_char: { u1: { durationMs: 30000 }, u2: { durationMs: 35000 }, u3: { durationMs: 40000 } },
    },
    localStorage: { getItem: () => null, setItem: () => {} },
  };
  cfgCtx.window = cfgCtx;
  cfgCtx.globalThis = cfgCtx;
  vm.createContext(cfgCtx);
  vm.runInContext(readRoot('js/configs.js'), cfgCtx, { filename: 'js/configs.js' });

  cfgCtx.configs = [...cfgCtx.BUILTIN_QUIZ_CONFIGS];
  cfgCtx.rebuildConfigsIndex();

  assert.equal(cfgCtx.getPartConfigsForBase('cfg_geo_flag_country').length, 2);
  assert.equal(cfgCtx.getActiveConfig().id, 'cfg_other_morse_char');

  // In 1min mode: geo family size = 1 + 3 = 4 > other = 2
  cfgCtx.sortConfigsByLeaderboardSize();
  assert.equal(cfgCtx.configs[0].id, 'cfg_geo_flag_country');
  assert.equal(cfgCtx.getConfigFamilyLeaderboardSize(cfgCtx.configs[0]), 4);

  // Switching to all mode automatically recomputes cache: other = 3 > geo family = 1 + 0 (fallback 1+3=4? Wait: fallback per cfg)
  // For cfg_geo_flag_country (1) + p1 (3) = 4 via 1min fallback, vs cfg_other_morse_char = 3; update timeLeaderboardsMap to 5
  cfgCtx.timeLeaderboardsMap.cfg_other_morse_char.u4 = { durationMs: 42000 };
  cfgCtx.timeLeaderboardsMap.cfg_other_morse_char.u5 = { durationMs: 45000 };
  cfgCtx.invalidateConfigPopularityCache();
  cfgCtx.activeGameMode = 'all';
  cfgCtx.sortConfigsByLeaderboardSize();
  assert.equal(cfgCtx.configs[0].id, 'cfg_other_morse_char');
  assert.equal(cfgCtx.getCategoryMaxLeaderboardSize('other'), 5);

  // Wall-clock 1-Min remaining seconds helper from js/game.js
  const gameCtx = {
    GAME_DURATION_SECONDS: 60,
    gameStartTime: 100000,
    window: {},
    globalThis: {},
  };
  gameCtx.window = gameCtx;
  gameCtx.globalThis = gameCtx;
  vm.createContext(gameCtx);
  vm.runInContext(readRoot('js/game.js'), gameCtx, { filename: 'js/game.js' });

  assert.equal(gameCtx.getOneMinRemainingSeconds(100000, 100000, 60), 60);
  assert.equal(gameCtx.getOneMinRemainingSeconds(101000, 100000, 60), 59);
  assert.equal(gameCtx.getOneMinRemainingSeconds(155001, 100000, 60), 5);
  assert.equal(gameCtx.getOneMinRemainingSeconds(160000, 100000, 60), 0);
  assert.equal(gameCtx.getOneMinRemainingSeconds(220000, 100000, 60), 0);

  // Time Attack tie-breaker helper from js/firebase.js
  const fbCtx = { window: {}, globalThis: {} };
  fbCtx.window = fbCtx;
  fbCtx.globalThis = fbCtx;
  vm.createContext(fbCtx);
  vm.runInContext(readRoot('js/firebase.js'), fbCtx, { filename: 'js/firebase.js' });

  assert.equal(fbCtx.isBetterTimeAttackResult(40000, 2, null), true);
  assert.equal(fbCtx.isBetterTimeAttackResult(39000, 5, { durationMs: 40000, wrong: 0 }), true);
  assert.equal(fbCtx.isBetterTimeAttackResult(40000, 1, { durationMs: 40000, wrong: 2 }), true);
  assert.equal(fbCtx.isBetterTimeAttackResult(40000, 2, { durationMs: 40000, wrong: 2 }), false);
  assert.equal(fbCtx.isBetterTimeAttackResult(40000, 3, { durationMs: 40000, wrong: 2 }), false);
  assert.equal(fbCtx.isBetterTimeAttackResult(41000, 0, { durationMs: 40000, wrong: 5 }), false);
});

console.log('');
console.log(`All ${passedCount} runtime smoke checks passed.`);
