// --- Game Configurations, Cached Popularity Sorting, Filters & Switcher UI ---

let partConfigsByParentIdMap = new Map();
let configsInListByIdMap = new Map();
let configPopularityCache = null;
let builtinConfigOrderSource = null;
let builtinConfigOrderMap = new Map();

function invalidateConfigPopularityCache() {
  configPopularityCache = null;
}

function clampConfigBound(val) {
  const n = Math.trunc(Number(val) || 0);
  return Math.max(CONFIG_MIN_BOUND, Math.min(CONFIG_MAX_BOUND, n));
}

function getLocalConfigs() {
  if (localConfigsCache) return localConfigsCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.localConfigs);
    const parsed = raw ? JSON.parse(raw) : [];
    localConfigsCache = Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    localConfigsCache = [];
  }
  return localConfigsCache;
}

function saveLocalConfig(cfg) {
  const list = getLocalConfigs().filter(c => c && c.id && c.id !== cfg.id);
  list.unshift(cfg);
  localConfigsCache = list.slice(0, MAX_LOCAL_CONFIGS);
  try {
    localStorage.setItem(STORAGE_KEYS.localConfigs, JSON.stringify(localConfigsCache));
  } catch (_) {}
}

function getBuiltinQuizConfigs() {
  return typeof BUILTIN_QUIZ_CONFIGS !== 'undefined' && Array.isArray(BUILTIN_QUIZ_CONFIGS)
    ? BUILTIN_QUIZ_CONFIGS
    : [];
}

function getBuiltinConfigOrderMap() {
  const builtins = getBuiltinQuizConfigs();
  if (builtinConfigOrderSource !== builtins) {
    const nextOrder = new Map();
    builtins.forEach((c, idx) => {
      if (c && c.id && !nextOrder.has(c.id)) {
        nextOrder.set(c.id, idx);
      }
    });
    builtinConfigOrderMap = nextOrder;
    builtinConfigOrderSource = builtins;
  }
  return builtinConfigOrderMap;
}

function rebuildConfigsIndex() {
  const nextMap = new Map();
  getBuiltinQuizConfigs().forEach((c) => {
    if (c && c.id) nextMap.set(c.id, c);
  });
  getLocalConfigs().forEach((c) => {
    if (c && c.id && !nextMap.has(c.id)) nextMap.set(c.id, c);
  });
  const nextInListMap = new Map();
  const nextPartsByParent = new Map();
  configs.forEach((c) => {
    if (!c || !c.id) return;
    nextMap.set(c.id, c);
    nextInListMap.set(c.id, c);
    if (c.parentId) {
      let arr = nextPartsByParent.get(c.parentId);
      if (!arr) {
        arr = [];
        nextPartsByParent.set(c.parentId, arr);
      }
      arr.push(c);
    }
  });
  nextPartsByParent.forEach((arr) => {
    arr.sort((a, b) => (a.partIndex || 0) - (b.partIndex || 0));
  });
  configsByIdMap = nextMap;
  configsInListByIdMap = nextInListMap;
  partConfigsByParentIdMap = nextPartsByParent;
  invalidateConfigPopularityCache();
}

function getConfigCategory(cfg) {
  if (!cfg) return 'math';
  if (cfg.category === 'chem') return 'other';
  if (cfg.category) return cfg.category;
  if (typeof cfg.id === 'string') {
    if (cfg.id.startsWith('cfg_geo_')) return 'geo';
    if (cfg.id.startsWith('cfg_lang_')) return 'lang';
    if (cfg.id.startsWith('cfg_study_')) return 'study';
    if (cfg.id.startsWith('cfg_chem_') || cfg.id.startsWith('cfg_other_')) return 'other';
  }
  return 'math';
}

function isQuizConfig(cfg) {
  if (!cfg) return false;
  const cat = getConfigCategory(cfg);
  return cfg.type === 'quiz' || cat === 'geo' || cat === 'lang' || cat === 'study' || cat === 'other';
}

const RENAMED_CONFIG_ID_RE = /^cfg_study_de_en_a1_(grammar|verbs|articles)(_p\d+)?$/;

function resolveConfigIdAlias(cfgId) {
  if (typeof window !== 'undefined' && typeof window.resolveStudyConfigIdAlias === 'function') {
    return window.resolveStudyConfigIdAlias(cfgId);
  }
  if (typeof cfgId !== 'string' || !cfgId) return cfgId;
  return cfgId.replace(RENAMED_CONFIG_ID_RE, 'cfg_study_de_de_a1_$1$2');
}

function getConfigById(cfgId) {
  if (!cfgId) return null;
  if (configsByIdMap.size === 0) {
    rebuildConfigsIndex();
  }
  const canonicalId = resolveConfigIdAlias(cfgId);
  return configsByIdMap.get(canonicalId) || configsByIdMap.get(cfgId) || null;
}

function preloadStudyConfigInBackground(cfgOrId) {
  const targetCfg = typeof cfgOrId === 'string' ? getConfigById(cfgOrId) : cfgOrId;
  if (!targetCfg || !targetCfg.isLazyStudy || targetCfg.studyDataLoaded) return;
  if (typeof ensureStudyConfigLoaded !== 'function') return;
  const targetId = targetCfg.id;
  ensureStudyConfigLoaded(targetCfg)
    .then((loaded) => {
      if (loaded && activeConfigId === targetId && !isPlaying && !isReplaying) {
        updatePlayButtonLabel();
        renderReview();
      }
    })
    .catch(() => {});
}

function getConfigId(cfg) {
  if (cfg && cfg.id && isQuizConfig(cfg)) return cfg.id;
  const opNames = { '+': 'add', '-': 'sub', '×': 'mul', '÷': 'div' };
  const opsKey = ALL_OPS.filter(op => cfg.ops.includes(op)).map(op => opNames[op]).join('-');
  return `cfg_${opsKey}_${cfg.min1}_${cfg.max1}_${cfg.min2}_${cfg.max2}_${cfg.min3}_${cfg.max3}`;
}

function createDefaultConfig() {
  const base = {
    category: 'math',
    type: 'math',
    ops: ['+', '-'],
    min1: 0,
    max1: 10,
    min2: 0,
    max2: 10,
    min3: 0,
    max3: 20
  };
  return { id: getConfigId(base), ...base };
}

function formatConfigLabel(cfg) {
  if (!cfg) return '';
  if (cfg.label) return cfg.label;
  const opsStr = (cfg.ops || []).map(op => (op === '-' ? '−' : op)).join(' ');
  return `${opsStr} (${cfg.min1}..${cfg.max1}, ${cfg.min2}..${cfg.max2}, ${cfg.min3}..${cfg.max3})`;
}

function isConfigPlayable(cfg) {
  if (!cfg) return false;
  if (isQuizConfig(cfg)) {
    if (cfg.isLazyStudy && !cfg.studyDataLoaded) return true;
    return Array.isArray(cfg.items) && cfg.items.length >= 2;
  }
  return getValidSamplers(cfg).length > 0;
}

function getCategoryIcon(cat) {
  if (cat === 'geo') return '🌍';
  if (cat === 'lang') return '💬';
  if (cat === 'study') return '🎓';
  if (cat === 'other' || cat === 'chem') return '🧩';
  return '🔢';
}

const CATEGORY_DEFAULT_ORDER = ['math', 'geo', 'lang', 'study', 'other'];

function isMiniConfig(cfg) {
  return Boolean(cfg && (cfg.isMini || cfg.parentId));
}

function getBaseConfig(cfg) {
  if (!cfg) return null;
  return cfg.parentId ? (getConfigById(cfg.parentId) || cfg) : cfg;
}

function getPartConfigsForBase(baseConfigId) {
  if (!baseConfigId) return [];
  if (partConfigsByParentIdMap.size > 0 || configsInListByIdMap.size > 0) {
    return partConfigsByParentIdMap.get(baseConfigId) || [];
  }
  return configs
    .filter(c => c.parentId === baseConfigId)
    .sort((a, b) => (a.partIndex || 0) - (b.partIndex || 0));
}

function getLeaderboardSize(configId, mode = activeGameMode) {
  const boardMap = mode === 'all' ? timeLeaderboardsMap : leaderboardsMap;
  const board = boardMap[configId];
  if (board && Object.keys(board).length > 0) {
    return Object.keys(board).length;
  }
  if (mode === 'all') {
    const fallback = leaderboardsMap[configId];
    return fallback ? Object.keys(fallback).length : 0;
  }
  return 0;
}

function getConfigPopularityMetrics(mode = (typeof activeGameMode !== 'undefined' ? activeGameMode : '1min')) {
  const resolvedMode = mode === 'all' ? 'all' : '1min';
  if (configPopularityCache && configPopularityCache.mode === resolvedMode) {
    return configPopularityCache;
  }
  const sizeById = new Map();
  const childrenSizeByParentId = new Map();
  const catMaxByCat = new Map();
  const catTotalByCat = new Map();

  configs.forEach((cfg) => {
    if (!cfg || !cfg.id) return;
    const size = getLeaderboardSize(cfg.id, resolvedMode);
    sizeById.set(cfg.id, size);
    if (cfg.parentId) {
      childrenSizeByParentId.set(
        cfg.parentId,
        (childrenSizeByParentId.get(cfg.parentId) || 0) + size
      );
    }
    const cat = getConfigCategory(cfg);
    const prevMax = catMaxByCat.get(cat) || 0;
    if (size > prevMax) catMaxByCat.set(cat, size);
    catTotalByCat.set(cat, (catTotalByCat.get(cat) || 0) + size);
  });

  configPopularityCache = {
    mode: resolvedMode,
    sizeById,
    childrenSizeByParentId,
    catMaxByCat,
    catTotalByCat
  };
  return configPopularityCache;
}

function getConfigFamilyLeaderboardSize(cfg, metrics = getConfigPopularityMetrics()) {
  if (!cfg || !cfg.id) return 0;
  let total = metrics.sizeById.has(cfg.id)
    ? metrics.sizeById.get(cfg.id)
    : getLeaderboardSize(cfg.id, metrics.mode);
  if (!isMiniConfig(cfg)) {
    total += metrics.childrenSizeByParentId.get(cfg.id) || 0;
  }
  return total;
}

function getCategoryMaxLeaderboardSize(cat, metrics = getConfigPopularityMetrics()) {
  return metrics.catMaxByCat.get(cat) || 0;
}

function getCategoryTotalLeaderboardSize(cat, metrics = getConfigPopularityMetrics()) {
  return metrics.catTotalByCat.get(cat) || 0;
}

function compareCategoriesByPopularity(catA, catB, metrics = getConfigPopularityMetrics()) {
  if (catA === catB) return 0;
  const maxDiff = getCategoryMaxLeaderboardSize(catB, metrics) - getCategoryMaxLeaderboardSize(catA, metrics);
  if (maxDiff !== 0) return maxDiff;
  const totalDiff = getCategoryTotalLeaderboardSize(catB, metrics) - getCategoryTotalLeaderboardSize(catA, metrics);
  if (totalDiff !== 0) return totalDiff;
  return CATEGORY_DEFAULT_ORDER.indexOf(catA) - CATEGORY_DEFAULT_ORDER.indexOf(catB);
}

function compareConfigsByPopularity(a, b) {
  const metrics = getConfigPopularityMetrics();
  const familyDiff = getConfigFamilyLeaderboardSize(b, metrics) - getConfigFamilyLeaderboardSize(a, metrics);
  if (familyDiff !== 0) return familyDiff;
  const aSize = metrics.sizeById.has(a.id) ? metrics.sizeById.get(a.id) : getLeaderboardSize(a.id, metrics.mode);
  const bSize = metrics.sizeById.has(b.id) ? metrics.sizeById.get(b.id) : getLeaderboardSize(b.id, metrics.mode);
  const sizeDiff = bSize - aSize;
  if (sizeDiff !== 0) return sizeDiff;
  const catDiff = compareCategoriesByPopularity(getConfigCategory(a), getConfigCategory(b), metrics);
  if (catDiff !== 0) return catDiff;
  const builtinOrder = getBuiltinConfigOrderMap();
  const aIdx = builtinOrder.has(a.id) ? builtinOrder.get(a.id) : -1;
  const bIdx = builtinOrder.has(b.id) ? builtinOrder.get(b.id) : -1;
  if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
  return a.id.localeCompare(b.id);
}

function sortConfigsByLeaderboardSize() {
  getConfigPopularityMetrics();
  configs.sort(compareConfigsByPopularity);
}

function getConfigsForCategory(cat) {
  getConfigPopularityMetrics();
  const filtered = configs.filter(c => getConfigCategory(c) === cat);
  return filtered.sort(compareConfigsByPopularity);
}

function getBaseConfigsForCategory(cat) {
  getConfigPopularityMetrics();
  const filtered = configs.filter(c => getConfigCategory(c) === cat && !isMiniConfig(c));
  return filtered.sort(compareConfigsByPopularity);
}

function getActiveConfig() {
  return configsInListByIdMap.get(activeConfigId) || configs.find(c => c.id === activeConfigId) || configs[0];
}

function appendPillPerfMeta(btn, cfgId) {
  const mode = activeGameMode === 'all' ? 'all' : '1min';
  const perf = getUserConfigPerformance(userId, cfgId, mode);
  if (perf.rank !== null || perf.hasPlayed) {
    const valStr = mode === 'all' ? formatDurationMs(perf.bestTimeMs) : String(perf.bestScore);
    const meta = document.createElement('span');
    meta.className = 'pill-meta';
    if (perf.rank !== null) {
      meta.textContent = ` · #${perf.rank} (${valStr})`;
    } else {
      meta.textContent = ` · (${valStr})`;
    }
    btn.appendChild(meta);
  }
}

function configMatchesLangFilter(cfg, learnCode = activeLearnLang, withCode = activeWithLang) {
  if (!cfg || !Array.isArray(cfg.langs) || cfg.langs.length === 0) return false;
  if (!learnCode) return true;
  if (cfg.langs.length === 1) {
    return cfg.langs[0] === learnCode;
  }
  if (!withCode || withCode === learnCode) return false;
  return cfg.langs.length === 2 && cfg.langs.includes(learnCode) && cfg.langs.includes(withCode);
}

function configMatchesStudyFilters(
  cfg,
  learn = activeLearnLang,
  withLang = activeWithLang,
  cefr = activeStudyCefr
) {
  if (!cfg) return false;
  if (learn && cfg.studyLearn !== learn) return false;
  if (cefr && cfg.studyCefr !== cefr) return false;
  if (withLang && cfg.studyWith !== cfg.studyLearn && cfg.studyWith !== withLang) return false;
  return true;
}

function getStudyLangDisplay(code, fallbackFlag = '') {
  const meta = typeof STUDY_LANGUAGE_META !== 'undefined' ? STUDY_LANGUAGE_META[code] : null;
  const upper = String(code || '').toUpperCase();
  return meta && meta.flag ? `${meta.flag} ${upper}` : (fallbackFlag ? `${fallbackFlag} ${upper}` : upper);
}

function getAvailableLangPairOptions(cat = activeCategory) {
  const sortByOrder = (set, order) =>
    Array.from(set).sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.localeCompare(b);
    });

  if (cat === 'lang') {
    const langConfigs = getBaseConfigsForCategory('lang');
    const learnSet = new Set();
    langConfigs.forEach((c) => {
      if (Array.isArray(c.langs)) {
        c.langs.forEach((code) => {
          if (VALID_LANG_FILTERS.includes(code)) learnSet.add(code);
        });
      }
    });
    const learnOptions = sortByOrder(learnSet, VALID_LANG_FILTERS);
    const resolvedLearn = learnOptions.includes(activeLearnLang) ? activeLearnLang : (learnOptions[0] || '');

    const withSet = new Set();
    langConfigs.forEach((c) => {
      if (Array.isArray(c.langs) && c.langs.length === 2 && c.langs.includes(resolvedLearn)) {
        const other = c.langs.find((code) => code !== resolvedLearn);
        if (other && VALID_LANG_FILTERS.includes(other)) withSet.add(other);
      }
    });
    const withOptions = sortByOrder(withSet, VALID_LANG_FILTERS);
    const resolvedWith = withOptions.includes(activeWithLang) ? activeWithLang : (withOptions[0] || '');

    return {
      learnOptions,
      withOptions,
      cefrOptions: [],
      resolvedLearn,
      resolvedWith,
      resolvedCefr: activeStudyCefr
    };
  }

  const studyConfigs = getBaseConfigsForCategory('study');
  const learnSet = new Set();
  studyConfigs.forEach((c) => {
    if (c.studyLearn) learnSet.add(c.studyLearn);
  });
  const learnOptions = sortByOrder(learnSet, VALID_LANG_FILTERS);
  const resolvedLearn = learnOptions.includes(activeLearnLang) ? activeLearnLang : (learnOptions[0] || '');

  const withSet = new Set();
  studyConfigs.forEach((c) => {
    if (c.studyLearn === resolvedLearn && c.studyWith && c.studyWith !== resolvedLearn) {
      withSet.add(c.studyWith);
    }
  });
  const withOptions = sortByOrder(withSet, VALID_LANG_FILTERS);
  const resolvedWith = withOptions.includes(activeWithLang) ? activeWithLang : (withOptions[0] || '');

  const cefrOrder = typeof STUDY_CEFR_ORDER !== 'undefined' ? STUDY_CEFR_ORDER : ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
  const cefrSet = new Set();
  studyConfigs.forEach((c) => {
    if (
      c.studyLearn === resolvedLearn &&
      (c.studyWith === resolvedLearn || !resolvedWith || c.studyWith === resolvedWith) &&
      c.studyCefr
    ) {
      cefrSet.add(c.studyCefr);
    }
  });
  const cefrOptions = Array.from(cefrSet).sort((a, b) => {
    const ai = cefrOrder.indexOf(a);
    const bi = cefrOrder.indexOf(b);
    return (ai >= 0 ? ai : 99) - (bi >= 0 ? bi : 99);
  });
  const resolvedCefr = cefrOptions.includes(activeStudyCefr) ? activeStudyCefr : (cefrOptions[0] || '');

  return {
    learnOptions,
    withOptions,
    cefrOptions,
    resolvedLearn,
    resolvedWith,
    resolvedCefr
  };
}

function renderLangFilterPills(listEl, options, activeVal, labelFn, filterType) {
  if (!listEl) return;
  listEl.innerHTML = '';
  options.forEach((val) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isActive = val === activeVal;
    btn.className = 'pill-btn' + (isActive ? ' active' : '');
    btn.textContent = labelFn(val);
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.addEventListener('click', () => switchLangPairFilter(filterType, val));
    listEl.appendChild(btn);
  });
}

function getStudyTrackSuffix(cfgId) {
  const m = String(cfgId || '').match(/^cfg_study_([a-z]+)_([a-z]+)_[a-z0-9]+_(.+?)(?:_p\d+)?$/);
  if (!m) return '';
  const [, learn, withLang, track] = m;
  if (track === `vocab_${learn}_${withLang}`) return 'vocab_from_learn';
  if (track === `vocab_${withLang}_${learn}`) return 'vocab_to_learn';
  if (track === `phrases_${learn}_${withLang}`) return 'phrases_from_learn';
  return track;
}

function getSwitcherRows() {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') {
    return [];
  }
  return Array.from(document.querySelectorAll('#home-view .switcher-row[data-switcher-key]'));
}

function syncSwitcherActionsVisibility(actionsEl) {
  if (!actionsEl) return;
  const hasVisibleAction = Array.from(actionsEl.children).some(
    (child) => !child.classList.contains('hidden')
  );
  actionsEl.classList.toggle('hidden', !hasVisibleAction);
}

function scrollActivePillIntoView(pillList) {
  if (!pillList) return;
  const activeBtn = pillList.querySelector('.pill-btn.active');
  if (!activeBtn) return;
  const listRect = pillList.getBoundingClientRect();
  const btnRect = activeBtn.getBoundingClientRect();
  if (listRect.width <= 0) return;
  if (btnRect.left < listRect.left) {
    pillList.scrollLeft += btnRect.left - listRect.left - 4;
  } else if (btnRect.right > listRect.right) {
    pillList.scrollLeft += btnRect.right - listRect.right + 4;
  }
}

function syncSwitcherRowOverflow(row, { scrollActive = false } = {}) {
  if (!row || row.classList.contains('hidden') || !homeView || !homeView.classList.contains('active') || row.offsetParent === null) {
    return;
  }
  const pillList = row.querySelector('.pill-list');
  const expandBtn = row.querySelector('.expand-pill-btn');
  const actionsEl = row.querySelector('.switcher-actions');
  const key = row.dataset.switcherKey;
  if (!pillList || !expandBtn || !key) return;

  const pills = Array.from(pillList.children).filter((el) => !el.classList.contains('hidden'));
  const prevScrollLeft = pillList.scrollLeft;

  // Measure pure single-line fit without the expand button so pills that fit on one line never trigger "All".
  row.classList.remove('expanded');
  expandBtn.classList.add('hidden');
  syncSwitcherActionsVisibility(actionsEl);

  if (pillList.clientWidth <= 0) return;

  const overflows = pillList.scrollWidth > pillList.clientWidth + 1;
  const canExpand = pills.length > 1 && overflows;
  const isExpanded = canExpand && Boolean(switcherExpandedState[key]);

  row.classList.toggle('expanded', isExpanded);
  expandBtn.classList.toggle('hidden', !canExpand);
  expandBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  expandBtn.textContent = isExpanded ? '▴ Less' : `▾ All (${pills.length})`;
  syncSwitcherActionsVisibility(actionsEl);

  if (!isExpanded) {
    if (key === 'game' && canExpand) {
      const activeBtn = pillList.querySelector('.pill-btn.active');
      if (activeBtn && pillList.firstElementChild !== activeBtn) {
        pillList.prepend(activeBtn);
      }
      pillList.scrollLeft = 0;
    } else {
      pillList.scrollLeft = prevScrollLeft;
      if (scrollActive) {
        scrollActivePillIntoView(pillList);
      }
    }
  }
}

function updateAllSwitcherRowsOverflow(options = {}) {
  getSwitcherRows().forEach((row) => syncSwitcherRowOverflow(row, options));
}

function updatePlayButtonLabel() {
  if (!playBtn || isLoadingStudyPack) return;
  if (activeGameMode === 'all') {
    const activeCfg = getActiveConfig();
    const targetCount = getAllModeTargetCount(activeCfg, ALL_MODE_MAX_QUESTIONS);
    playBtn.textContent = targetCount
      ? `Play All (${targetCount} Qs)`
      : `Play All (≤${ALL_MODE_MAX_QUESTIONS} Qs)`;
  } else {
    playBtn.textContent = 'Play 1-Minute Game';
  }
}

function switchGameMode(targetMode) {
  if (isPlaying) return;
  const nextMode = targetMode === 'all' ? 'all' : '1min';
  if (nextMode === activeGameMode) return;
  activeGameMode = nextMode;
  leaderboardPage = 1;
  localStorage.setItem(STORAGE_KEYS.activeGameMode, activeGameMode);
  lastResult.classList.add('hidden');
  renderConfigsUI();
  renderLeaderboard();
  renderReview();
  refreshSingleConfigLeaderboard(activeConfigId, false, activeGameMode);
}

function renderConfigsUI() {
  const activeCfg = getActiveConfig();
  if (!activeCfg) return;
  const activeBaseCfg = getBaseConfig(activeCfg) || activeCfg;
  activeCategory = getConfigCategory(activeCfg);
  localStorage.setItem(STORAGE_KEYS.activeCategory, activeCategory);

  modeBtns.forEach((btn) => {
    const isModeActive = btn.dataset.mode === activeGameMode;
    btn.classList.toggle('active', isModeActive);
    btn.setAttribute('aria-selected', isModeActive ? 'true' : 'false');
  });

  if (categoryListEl && categoryBtns.length > 0) {
    const metrics = getConfigPopularityMetrics();
    const sortedBtns = [...categoryBtns].sort((a, b) =>
      compareCategoriesByPopularity(a.dataset.category, b.dataset.category, metrics)
    );
    const currentChildren = Array.from(categoryListEl.children);
    const orderChanged =
      sortedBtns.length !== currentChildren.length ||
      sortedBtns.some((btn, idx) => currentChildren[idx] !== btn);
    if (orderChanged) {
      sortedBtns.forEach((btn) => categoryListEl.appendChild(btn));
    }
  }

  categoryBtns.forEach((btn) => {
    const isCatActive = btn.dataset.category === activeCategory;
    btn.classList.toggle('active', isCatActive);
    btn.setAttribute('aria-selected', isCatActive ? 'true' : 'false');
  });

  const isLang = activeCategory === 'lang';
  const isStudy = activeCategory === 'study';
  const showLangPair = isLang || isStudy;

  if (learnLangRow) learnLangRow.classList.toggle('hidden', !showLangPair);
  if (withLangRow) withLangRow.classList.toggle('hidden', !showLangPair);
  if (studyCefrRow) studyCefrRow.classList.toggle('hidden', !isStudy);

  if (isLang && !configMatchesLangFilter(activeBaseCfg, activeLearnLang, activeWithLang)) {
    const cfgLangs = Array.isArray(activeBaseCfg.langs)
      ? activeBaseCfg.langs.filter((code) => VALID_LANG_FILTERS.includes(code))
      : [];
    const prevLearn = activeLearnLang;
    if (cfgLangs.length === 1) {
      activeLearnLang = cfgLangs[0];
      if (activeWithLang === activeLearnLang) {
        activeWithLang =
          prevLearn && prevLearn !== activeLearnLang
            ? prevLearn
            : (VALID_LANG_FILTERS.find((code) => code !== activeLearnLang) || 'en');
      }
    } else if (cfgLangs.length >= 2) {
      if (cfgLangs.includes(activeLearnLang)) {
        activeWithLang = cfgLangs.find((code) => code !== activeLearnLang) || cfgLangs[0];
      } else if (cfgLangs.includes(activeWithLang)) {
        activeLearnLang = cfgLangs.find((code) => code !== activeWithLang) || cfgLangs[0];
      } else {
        activeLearnLang = cfgLangs[0];
        activeWithLang = cfgLangs[1];
      }
    } else {
      activeLearnLang = 'de';
      activeWithLang = 'en';
    }
    localStorage.setItem(STORAGE_KEYS.activeLearnLang, activeLearnLang);
    localStorage.setItem(STORAGE_KEYS.activeWithLang, activeWithLang);
  }

  if (isStudy && !configMatchesStudyFilters(activeBaseCfg)) {
    const prevLearn = activeLearnLang;
    if (activeBaseCfg.studyLearn) activeLearnLang = activeBaseCfg.studyLearn;
    if (activeBaseCfg.studyWith && activeBaseCfg.studyWith !== activeBaseCfg.studyLearn) {
      activeWithLang = activeBaseCfg.studyWith;
    } else if (activeWithLang === activeLearnLang) {
      activeWithLang =
        prevLearn && prevLearn !== activeLearnLang
          ? prevLearn
          : (VALID_LANG_FILTERS.find((code) => code !== activeLearnLang) || 'en');
    }
    if (activeBaseCfg.studyCefr) activeStudyCefr = activeBaseCfg.studyCefr;
    localStorage.setItem(STORAGE_KEYS.activeLearnLang, activeLearnLang);
    localStorage.setItem(STORAGE_KEYS.activeWithLang, activeWithLang);
    localStorage.setItem(STORAGE_KEYS.activeStudyCefr, activeStudyCefr);
  }

  if (showLangPair) {
    const pairOpts = getAvailableLangPairOptions(activeCategory);
    if (pairOpts.resolvedLearn && pairOpts.resolvedLearn !== activeLearnLang) {
      activeLearnLang = pairOpts.resolvedLearn;
      localStorage.setItem(STORAGE_KEYS.activeLearnLang, activeLearnLang);
    }
    if (pairOpts.resolvedWith && pairOpts.resolvedWith !== activeWithLang) {
      activeWithLang = pairOpts.resolvedWith;
      localStorage.setItem(STORAGE_KEYS.activeWithLang, activeWithLang);
    }
    if (isStudy && pairOpts.resolvedCefr && pairOpts.resolvedCefr !== activeStudyCefr) {
      activeStudyCefr = pairOpts.resolvedCefr;
      localStorage.setItem(STORAGE_KEYS.activeStudyCefr, activeStudyCefr);
    }
    if (withLangRow) {
      withLangRow.classList.toggle('hidden', pairOpts.withOptions.length === 0);
    }
    renderLangFilterPills(
      learnLangListEl,
      pairOpts.learnOptions,
      activeLearnLang,
      (code) => getStudyLangDisplay(code),
      'learn'
    );
    renderLangFilterPills(
      withLangListEl,
      pairOpts.withOptions,
      activeWithLang,
      (code) => getStudyLangDisplay(code),
      'with'
    );
    if (isStudy) {
      renderLangFilterPills(
        studyCefrListEl,
        pairOpts.cefrOptions,
        activeStudyCefr,
        (lvl) => String(lvl || '').toUpperCase(),
        'cefr'
      );
    }
  }

  if (addConfigBtn) {
    addConfigBtn.classList.toggle('hidden', activeCategory !== 'math');
  }
  if (activeCategory !== 'math') {
    closeNewConfigPanel();
  }

  configListEl.innerHTML = '';
  const allCategoryConfigs = getBaseConfigsForCategory(activeCategory);
  const categoryConfigs =
    isLang
      ? allCategoryConfigs.filter((c) => configMatchesLangFilter(c, activeLearnLang, activeWithLang))
      : isStudy
        ? allCategoryConfigs.filter((c) => configMatchesStudyFilters(c))
        : allCategoryConfigs;

  categoryConfigs.forEach((cfg) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isBaseActive = cfg.id === activeBaseCfg.id;
    btn.className = 'pill-btn' + (isBaseActive ? ' active' : '');
    const pillLabel = activeCategory === 'study' && cfg.shortLabel ? cfg.shortLabel : formatConfigLabel(cfg);
    const labelText = document.createTextNode(pillLabel);
    btn.appendChild(labelText);
    appendPillPerfMeta(btn, cfg.id);

    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', isBaseActive ? 'true' : 'false');
    btn.addEventListener('click', () => switchConfig(cfg.id));
    configListEl.appendChild(btn);
  });

  if (partSwitcherRow && partListEl) {
    const parts = getPartConfigsForBase(activeBaseCfg.id);
    if (parts.length === 0) {
      partSwitcherRow.classList.add('hidden');
      partListEl.innerHTML = '';
    } else {
      partSwitcherRow.classList.remove('hidden');
      partListEl.innerHTML = '';
      const setOptions = [
        { id: activeBaseCfg.id, label: 'All' },
        ...parts.map(p => ({ id: p.id, label: p.partLabel || `Part ${p.partIndex}` }))
      ];
      setOptions.forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const isSetActive = opt.id === activeCfg.id;
        btn.className = 'pill-btn' + (isSetActive ? ' active' : '');
        btn.appendChild(document.createTextNode(opt.label));
        appendPillPerfMeta(btn, opt.id);
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', isSetActive ? 'true' : 'false');
        btn.addEventListener('click', () => switchConfig(opt.id));
        partListEl.appendChild(btn);
      });
    }
  }

  updateAllSwitcherRowsOverflow({ scrollActive: true });

  leaderboardConfigBadge.textContent = formatConfigLabel(activeCfg);

  if (!isQuizConfig(activeCfg)) {
    const allowsNegative = activeCfg.min1 < 0 || activeCfg.min2 < 0 || activeCfg.min3 < 0;
    minusKey.classList.toggle('hidden', !allowsNegative);
  } else {
    minusKey.classList.add('hidden');
  }

  updateLandscapeToggleUI();
  updatePlayButtonLabel();
}

async function switchCategory(targetCat) {
  if (isPlaying) return;
  if (!CATEGORY_DEFAULT_ORDER.includes(targetCat)) return;
  activeCategory = targetCat;
  localStorage.setItem(STORAGE_KEYS.activeCategory, activeCategory);
  closeNewConfigPanel();
  lastResult.classList.add('hidden');

  const catConfigs = getBaseConfigsForCategory(targetCat);
  const currentCfg = getActiveConfig();
  if ((!currentCfg || getConfigCategory(currentCfg) !== targetCat) && catConfigs.length > 0) {
    const preferredCfg =
      targetCat === 'lang'
        ? (catConfigs.find(c => configMatchesLangFilter(c, activeLearnLang, activeWithLang)) || catConfigs[0])
        : targetCat === 'study'
          ? (catConfigs.find(c => configMatchesStudyFilters(c)) || catConfigs[0])
          : catConfigs[0];
    activeConfigId = preferredCfg.id;
    leaderboardPage = 1;
    localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
  } else if (currentCfg) {
    localStorage.setItem(STORAGE_KEYS.activeConfigId, currentCfg.id);
  }

  renderConfigsUI();
  renderLeaderboard();
  renderReview();
  preloadStudyConfigInBackground(activeConfigId);
}

function switchLangPairFilter(filterType, targetValue) {
  if (isPlaying) return;
  if (filterType === 'learn') {
    const prevLearn = activeLearnLang;
    activeLearnLang = targetValue;
    if (activeWithLang === targetValue && prevLearn && prevLearn !== targetValue) {
      activeWithLang = prevLearn;
    }
  } else if (filterType === 'with') {
    activeWithLang = targetValue;
  } else if (filterType === 'cefr') {
    activeStudyCefr = targetValue;
  } else {
    return;
  }

  const opts = getAvailableLangPairOptions(activeCategory);
  if (opts.resolvedLearn) activeLearnLang = opts.resolvedLearn;
  if (opts.resolvedWith) activeWithLang = opts.resolvedWith;
  if (activeCategory === 'study' && opts.resolvedCefr) {
    activeStudyCefr = opts.resolvedCefr;
  }
  localStorage.setItem(STORAGE_KEYS.activeLearnLang, activeLearnLang);
  localStorage.setItem(STORAGE_KEYS.activeWithLang, activeWithLang);
  localStorage.setItem(STORAGE_KEYS.activeStudyCefr, activeStudyCefr);

  if (activeCategory !== 'study' && activeCategory !== 'lang') return;

  const activeCfg = getActiveConfig();
  const activeBaseCfg = getBaseConfig(activeCfg);

  if (activeCategory === 'study') {
    const activePartIdx = activeCfg && activeCfg.isMini ? activeCfg.partIndex : 0;
    if (!configMatchesStudyFilters(activeBaseCfg)) {
      const matching = getBaseConfigsForCategory('study').filter(c => configMatchesStudyFilters(c));
      if (matching.length > 0) {
        const suffix = getStudyTrackSuffix(activeBaseCfg && activeBaseCfg.id);
        const sameTrack = suffix ? matching.find(c => getStudyTrackSuffix(c.id) === suffix) : null;
        const targetBase = sameTrack || matching[0];
        const matchingPart = sameTrack && filterType === 'with' && activePartIdx > 0
          ? getPartConfigsForBase(targetBase.id).find(p => p.partIndex === activePartIdx)
          : null;
        activeConfigId = (matchingPart || targetBase).id;
        leaderboardPage = 1;
        localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
        closeNewConfigPanel();
        lastResult.classList.add('hidden');
        renderConfigsUI();
        renderLeaderboard();
        renderReview();
        renderOverview();
        refreshSingleConfigLeaderboard(activeConfigId);
        preloadStudyConfigInBackground(activeConfigId);
        return;
      }
    }
    renderConfigsUI();
    renderOverview();
    preloadStudyConfigInBackground(activeConfigId);
    return;
  }

  // activeCategory === 'lang'
  if (!configMatchesLangFilter(activeBaseCfg, activeLearnLang, activeWithLang)) {
    const matching = getBaseConfigsForCategory('lang').filter(c => configMatchesLangFilter(c, activeLearnLang, activeWithLang));
    if (matching.length > 0) {
      const preferBilingual =
        filterType === 'with' &&
        activeBaseCfg &&
        Array.isArray(activeBaseCfg.langs) &&
        activeBaseCfg.langs.length === 2;
      const targetBase = preferBilingual
        ? (matching.find(c => Array.isArray(c.langs) && c.langs.length === 2) || matching[0])
        : matching[0];
      activeConfigId = targetBase.id;
      leaderboardPage = 1;
      localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
      closeNewConfigPanel();
      lastResult.classList.add('hidden');
      renderConfigsUI();
      renderLeaderboard();
      renderReview();
      renderOverview();
      refreshSingleConfigLeaderboard(activeConfigId);
      return;
    }
  }
  renderConfigsUI();
  renderOverview();
}

function renderDraftConfigUI() {
  if (!draftConfig) return;
  opToggleBtns.forEach((btn) => {
    const op = btn.dataset.op;
    btn.classList.toggle('active', draftConfig.ops.includes(op));
  });

  min1Input.value = draftConfig.min1;
  max1Input.value = draftConfig.max1;
  min2Input.value = draftConfig.min2;
  max2Input.value = draftConfig.max2;
  min3Input.value = draftConfig.min3;
  max3Input.value = draftConfig.max3;

  const isValid = getValidSamplers(draftConfig).length > 0;
  configErrorEl.classList.toggle('hidden', isValid);
  saveConfigBtn.disabled = !isValid;
}

function openNewConfigPanel() {
  if (isPlaying || activeCategory !== 'math') return;
  const active = getActiveConfig();
  const base = active && !isQuizConfig(active) ? active : createDefaultConfig();
  draftConfig = {
    ops: [...base.ops],
    min1: base.min1,
    max1: base.max1,
    min2: base.min2,
    max2: base.max2,
    min3: base.min3,
    max3: base.max3
  };
  renderDraftConfigUI();
  newConfigPanel.classList.remove('hidden');
}

function closeNewConfigPanel() {
  draftConfig = null;
  newConfigPanel.classList.add('hidden');
}

async function createNewConfigFromDraft() {
  if (isPlaying || !draftConfig) return;
  updateDraftRangeInputs();
  if (getValidSamplers(draftConfig).length === 0) return;

  const base = {
    ops: ALL_OPS.filter(op => draftConfig.ops.includes(op)),
    min1: clampConfigBound(draftConfig.min1),
    max1: clampConfigBound(draftConfig.max1),
    min2: clampConfigBound(draftConfig.min2),
    max2: clampConfigBound(draftConfig.max2),
    min3: clampConfigBound(draftConfig.min3),
    max3: clampConfigBound(draftConfig.max3)
  };
  const newCfg = {
    id: getConfigId(base),
    category: 'math',
    type: 'math',
    ...base
  };

  // Save locally first; only publish to Firebase once a game is completed with a positive score
  saveLocalConfig(newCfg);
  if (!configs.some(c => c.id === newCfg.id)) {
    configs.push(newCfg);
  }
  rebuildConfigsIndex();

  activeConfigId = newCfg.id;
  localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
  closeNewConfigPanel();
  lastResult.classList.add('hidden');

  renderConfigsUI();
  renderLeaderboard();
  renderReview();
}

function toggleDraftOperator(op) {
  if (!draftConfig) return;
  if (draftConfig.ops.includes(op)) {
    if (draftConfig.ops.length <= 1) return;
    draftConfig.ops = draftConfig.ops.filter(item => item !== op);
  } else {
    draftConfig.ops = ALL_OPS.filter(item => draftConfig.ops.includes(item) || item === op);
  }
  renderDraftConfigUI();
}

function updateDraftRangeInputs() {
  if (!draftConfig) return;
  const parseVal = (inputEl, fallback) => {
    const parsed = parseInt(inputEl.value, 10);
    return Number.isNaN(parsed) ? fallback : clampConfigBound(parsed);
  };

  draftConfig.min1 = parseVal(min1Input, draftConfig.min1);
  draftConfig.max1 = parseVal(max1Input, draftConfig.max1);
  draftConfig.min2 = parseVal(min2Input, draftConfig.min2);
  draftConfig.max2 = parseVal(max2Input, draftConfig.max2);
  draftConfig.min3 = parseVal(min3Input, draftConfig.min3);
  draftConfig.max3 = parseVal(max3Input, draftConfig.max3);

  const isValid = getValidSamplers(draftConfig).length > 0;
  configErrorEl.classList.toggle('hidden', isValid);
  saveConfigBtn.disabled = !isValid;
}

async function switchConfig(targetConfigId) {
  if (isPlaying) return;
  const target = configs.find(c => c.id === targetConfigId);
  if (!target || target.id === activeConfigId) return;

  activeConfigId = target.id;
  leaderboardPage = 1;
  localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
  closeNewConfigPanel();
  lastResult.classList.add('hidden');
  renderConfigsUI();
  renderLeaderboard();
  renderReview();
  refreshSingleConfigLeaderboard(target.id);
  preloadStudyConfigInBackground(target.id);
}
