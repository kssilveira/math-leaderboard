// Overview ("My Ranks & Scores") and Player Profile Page filters & rendering.

const OVERVIEW_PAGE_SIZE = 7;
const USER_PAGE_SIZE = 30;
let overviewPage = 1;
let overviewLastContextKey = '';
let userPage = 1;
let userPageLastContextKey = '';

function scrollCardTopIfAboveViewport(el) {
  if (!el) return;
  const card = el.closest('.leaderboard-card');
  if (!card || typeof card.getBoundingClientRect !== 'function') return;
  if (card.getBoundingClientRect().top < 0) {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function getOverviewFilterSignature() {
  return Array.from(overviewExcludedTags).sort().join(',');
}

function getOverviewFilterGroups() {
  const cefrOrder =
    typeof window !== 'undefined' && Array.isArray(window.STUDY_CEFR_ORDER)
      ? window.STUDY_CEFR_ORDER
      : ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
  const langOrder = VALID_LANG_FILTERS;
  const sortLangCodes = (codes) =>
    Array.from(codes).sort((a, b) => {
      const ia = langOrder.indexOf(a);
      const ib = langOrder.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });

  const learnLangSet = new Set(VALID_LANG_FILTERS);
  const withLangSet = new Set();
  const cefrSet = new Set();
  configs.forEach((cfg) => {
    if (!cfg) return;
    if (cfg.studyLearn) learnLangSet.add(cfg.studyLearn);
    if (cfg.studyWith && cfg.studyWith !== cfg.studyLearn) withLangSet.add(cfg.studyWith);
    if (Array.isArray(cfg.langs)) {
      cfg.langs.forEach((code) => {
        if (code) learnLangSet.add(code);
      });
      if (cfg.langs.length === 2) {
        cfg.langs.forEach((code) => {
          if (code) withLangSet.add(code);
        });
      }
    }
    if (cfg.studyCefr) cefrSet.add(String(cfg.studyCefr).toLowerCase());
  });
  if (withLangSet.size === 0) {
    VALID_LANG_FILTERS.forEach((code) => withLangSet.add(code));
  }
  if (cefrSet.size === 0) {
    cefrSet.add('a1');
    cefrSet.add('a2');
  }
  const cefrOptions = Array.from(cefrSet)
    .sort((a, b) => {
      const ia = cefrOrder.indexOf(a);
      const ib = cefrOrder.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    })
    .map((level) => ({ tag: `cefr:${level}`, label: level.toUpperCase() }));

  const langGroupDimmed = overviewExcludedTags.has('topic:lang') && overviewExcludedTags.has('topic:study');

  return [
    {
      label: 'Topic',
      dimmed: false,
      options: [
        { tag: 'topic:math', label: '🔢 Math' },
        { tag: 'topic:geo', label: '🌍 Geo' },
        { tag: 'topic:lang', label: '💬 Lang' },
        { tag: 'topic:study', label: '🎓 Study' },
        { tag: 'topic:other', label: '🧩 Other' }
      ]
    },
    {
      label: 'Learn',
      dimmed: langGroupDimmed,
      options: sortLangCodes(learnLangSet).map((code) => ({
        tag: `learn:${code}`,
        label: getStudyLangDisplay(code)
      }))
    },
    {
      label: 'With',
      dimmed: langGroupDimmed,
      options: sortLangCodes(withLangSet).map((code) => ({
        tag: `with:${code}`,
        label: getStudyLangDisplay(code)
      }))
    },
    {
      label: 'CEFR',
      dimmed: overviewExcludedTags.has('topic:study'),
      options: cefrOptions
    },
    {
      label: 'Track',
      dimmed: overviewExcludedTags.has('topic:study'),
      options: [
        { tag: 'study_track:vocab', label: '🔤 Words' },
        { tag: 'study_track:phrases', label: '🗣️ Phrases' },
        { tag: 'study_track:grammar', label: '📐 Grammar' },
        { tag: 'study_track:verbs', label: '⚡ Verbs' },
        { tag: 'study_track:articles', label: '🏷️ Articles' }
      ]
    },
    {
      label: 'Geo',
      dimmed: overviewExcludedTags.has('topic:geo'),
      options: [
        { tag: 'geo:flag', label: '🚩 Flag' },
        { tag: 'geo:country', label: '🌐 Country' },
        { tag: 'geo:capital', label: '🏛️ Capital' },
        { tag: 'geo:map', label: '🗺️ Map' }
      ]
    },
    {
      label: 'Other',
      dimmed: overviewExcludedTags.has('topic:other'),
      options: [
        { tag: 'other:element', label: '⚛️ Element' },
        { tag: 'other:morse', label: '📡 Morse' }
      ]
    }
  ];
}

function sanitizeOverviewExcludedTags(groups) {
  if (overviewExcludedTags.size === 0) return;
  const validTags = new Set();
  groups.forEach((group) => {
    group.options.forEach((opt) => validTags.add(opt.tag));
  });
  let changed = false;
  overviewExcludedTags.forEach((tag) => {
    if (!validTags.has(tag)) {
      overviewExcludedTags.delete(tag);
      changed = true;
    }
  });
  if (changed) saveOverviewExcludedFilters();
}

function getOverviewConfigTags(cfg) {
  const cat = getConfigCategory(cfg);
  const tags = [`topic:${cat}`];
  const baseId = String((cfg && (cfg.parentId || cfg.id)) || '');

  if (cat === 'geo') {
    const geoTokens = baseId.replace(/^cfg_geo_/, '').split('_');
    geoTokens.forEach((tok) => {
      if (tok === 'flag' || tok === 'country' || tok === 'capital' || tok === 'map') {
        tags.push(`geo:${tok}`);
      }
    });
  } else if (cat === 'lang') {
    if (Array.isArray(cfg && cfg.langs) && cfg.langs.length === 1 && cfg.langs[0]) {
      tags.push(`learn:${cfg.langs[0]}`);
    }
  } else if (cat === 'study') {
    if (cfg && cfg.studyLearn) {
      tags.push(`learn:${cfg.studyLearn}`);
    }
    if (cfg && cfg.studyWith && cfg.studyWith !== cfg.studyLearn) {
      tags.push(`with:${cfg.studyWith}`);
    }
    if (cfg && cfg.studyCefr) {
      tags.push(`cefr:${String(cfg.studyCefr).toLowerCase()}`);
    }
    let trackTag = '';
    const trackKey = cfg && cfg.studyTrackKey ? cfg.studyTrackKey : '';
    if (trackKey === 'vocab_fwd' || trackKey === 'vocab_rev') trackTag = 'vocab';
    else if (trackKey === 'phrases_fwd' || trackKey === 'phrases_rev') trackTag = 'phrases';
    else if (trackKey) trackTag = trackKey;
    else {
      const m = baseId.match(/^cfg_study_[a-z]+_[a-z]+_[a-z0-9]+_(.+)$/);
      if (m) {
        if (m[1].startsWith('vocab_')) trackTag = 'vocab';
        else if (m[1].startsWith('phrases')) trackTag = 'phrases';
        else trackTag = m[1];
      }
    }
    if (trackTag) {
      tags.push(`study_track:${trackTag}`);
    }
  } else if (cat === 'other') {
    if (baseId.startsWith('cfg_chem_')) {
      tags.push('other:element');
    } else if (baseId.includes('morse')) {
      tags.push('other:morse');
    }
  }

  return tags;
}

function isOverviewConfigVisible(cfg) {
  if (overviewExcludedTags.size === 0) return true;
  if (getOverviewConfigTags(cfg).some((tag) => overviewExcludedTags.has(tag))) {
    return false;
  }
  if (getConfigCategory(cfg) === 'lang' && Array.isArray(cfg && cfg.langs) && cfg.langs.length === 2) {
    const [a, b] = cfg.langs;
    const fwdOk = !overviewExcludedTags.has(`learn:${a}`) && !overviewExcludedTags.has(`with:${b}`);
    const revOk = !overviewExcludedTags.has(`learn:${b}`) && !overviewExcludedTags.has(`with:${a}`);
    if (!fwdOk && !revOk) return false;
  }
  return true;
}

function renderOverviewFilterControls(panelEl, toggleBtnEl, isOpen, onChanged) {
  const groups = getOverviewFilterGroups();
  sanitizeOverviewExcludedTags(groups);
  const offCount = overviewExcludedTags.size;

  if (toggleBtnEl) {
    toggleBtnEl.textContent = offCount > 0 ? `🎛️ Filters (${offCount} off)` : '🎛️ Filters';
    toggleBtnEl.classList.toggle('active', isOpen);
    toggleBtnEl.classList.toggle('has-filters', offCount > 0);
    toggleBtnEl.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  if (!panelEl) return;
  panelEl.classList.toggle('hidden', !isOpen);
  if (!isOpen) return;

  panelEl.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'overview-filters-header';

  const hint = document.createElement('span');
  hint.className = 'overview-filters-hint';
  hint.textContent = offCount > 0 ? `${offCount} unselected` : 'Showing all games';
  header.appendChild(hint);

  const headerActions = document.createElement('div');
  headerActions.className = 'overview-filters-actions';

  const learnGroup = groups.find((g) => g.label === 'Learn');
  const withGroup = groups.find((g) => g.label === 'With');
  const activeLearnTag = activeLearnLang ? `learn:${activeLearnLang}` : '';
  const activeWithTag = activeWithLang ? `with:${activeWithLang}` : '';
  if (
    learnGroup &&
    withGroup &&
    learnGroup.options.length >= 2 &&
    withGroup.options.length >= 2 &&
    activeLearnTag &&
    activeWithTag &&
    learnGroup.options.some((opt) => opt.tag === activeLearnTag) &&
    withGroup.options.some((opt) => opt.tag === activeWithTag)
  ) {
    const isOnlyActivePair =
      !overviewExcludedTags.has(activeLearnTag) &&
      learnGroup.options.every((opt) => opt.tag === activeLearnTag || overviewExcludedTags.has(opt.tag)) &&
      !overviewExcludedTags.has(activeWithTag) &&
      withGroup.options.every((opt) => opt.tag === activeWithTag || overviewExcludedTags.has(opt.tag));
    const onlyPairBtn = document.createElement('button');
    onlyPairBtn.type = 'button';
    onlyPairBtn.className = 'inline-btn' + (isOnlyActivePair ? ' active' : '');
    const learnDisp = getStudyLangDisplay(activeLearnLang);
    const withDisp = getStudyLangDisplay(activeWithLang);
    onlyPairBtn.textContent = `${learnDisp} + ${withDisp}`;
    onlyPairBtn.title = `Show only Learn ${learnDisp} with ${withDisp} games`;
    onlyPairBtn.setAttribute('aria-pressed', isOnlyActivePair ? 'true' : 'false');
    onlyPairBtn.addEventListener('click', () => {
      if (isOnlyActivePair) {
        learnGroup.options.forEach((opt) => overviewExcludedTags.delete(opt.tag));
        withGroup.options.forEach((opt) => overviewExcludedTags.delete(opt.tag));
      } else {
        learnGroup.options.forEach((opt) => {
          if (opt.tag === activeLearnTag) {
            overviewExcludedTags.delete(opt.tag);
          } else {
            overviewExcludedTags.add(opt.tag);
          }
        });
        withGroup.options.forEach((opt) => {
          if (opt.tag === activeWithTag) {
            overviewExcludedTags.delete(opt.tag);
          } else {
            overviewExcludedTags.add(opt.tag);
          }
        });
      }
      saveOverviewExcludedFilters();
      onChanged();
    });
    headerActions.appendChild(onlyPairBtn);
  }

  if (offCount > 0) {
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'inline-btn';
    resetBtn.textContent = 'Show all';
    resetBtn.addEventListener('click', () => {
      overviewExcludedTags.clear();
      saveOverviewExcludedFilters();
      onChanged();
    });
    headerActions.appendChild(resetBtn);
  }

  if (headerActions.children.length > 0) {
    header.appendChild(headerActions);
  }

  panelEl.appendChild(header);

  groups.forEach((group) => {
    const row = document.createElement('div');
    row.className = 'overview-filter-row' + (group.dimmed ? ' is-dimmed' : '');

    const labelEl = document.createElement('span');
    labelEl.className = 'overview-filter-label';
    labelEl.textContent = group.label;

    const chipsWrap = document.createElement('div');
    chipsWrap.className = 'overview-filter-chips';

    group.options.forEach((opt) => {
      const isSelected = !overviewExcludedTags.has(opt.tag);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pill-btn filter-chip' + (isSelected ? ' active' : '');
      btn.textContent = opt.label;
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      btn.addEventListener('click', () => {
        if (overviewExcludedTags.has(opt.tag)) {
          overviewExcludedTags.delete(opt.tag);
        } else {
          overviewExcludedTags.add(opt.tag);
        }
        saveOverviewExcludedFilters();
        onChanged();
      });
      chipsWrap.appendChild(btn);
    });

    row.append(labelEl, chipsWrap);
    panelEl.appendChild(row);
  });
}

function createOverviewEmptyRow(onReset) {
  const li = document.createElement('li');
  li.className = 'empty-row overview-empty-row';

  const msg = document.createElement('span');
  msg.textContent = 'No games match your filters.';

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'inline-btn';
  resetBtn.textContent = 'Show all';
  resetBtn.addEventListener('click', () => {
    overviewExcludedTags.clear();
    saveOverviewExcludedFilters();
    onReset();
  });

  li.append(msg, resetBtn);
  return li;
}

function closeUserPage(selectConfigId = null) {
  viewedUserId = null;
  if (userView) userView.classList.remove('active');
  homeView.classList.add('active');
  if (selectConfigId) {
    const targetCfg = getConfigById(selectConfigId);
    if (targetCfg) {
      activeCategory = getConfigCategory(targetCfg);
      activeConfigId = targetCfg.id;
      leaderboardPage = 1;
      localStorage.setItem(STORAGE_KEYS.activeCategory, activeCategory);
      localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
      renderConfigsUI();
      renderLeaderboard();
      renderReview();
    }
  }
  renderOverview();
  updateAllSwitcherRowsOverflow();
  if (window.location.search.includes('user=')) {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

function formatOverviewPerfValue(perf, mode) {
  if (!perf) return '—';
  if (mode === 'all') {
    return typeof perf.bestTimeMs === 'number' && perf.bestTimeMs > 0
      ? formatDurationMs(perf.bestTimeMs)
      : '—';
  }
  return perf.bestScore !== null && perf.bestScore !== undefined ? String(perf.bestScore) : '—';
}

function getOverviewRankUpHintText(perf, mode) {
  if (!perf || perf.isSoleLeader || perf.nextRank === null) return '';
  if (mode === 'all') {
    if (perf.msToBeatNext === null) return '';
    return perf.rank === 1
      ? 'Faster for sole #1'
      : `↑ −${formatDurationMs(perf.msToBeatNext)} to #${perf.nextRank}`;
  }
  if (perf.pointsToTieNext === null) return '';
  return perf.rank === 1
    ? '+1 for sole #1'
    : `↑ +${perf.pointsToTieNext} to #${perf.nextRank}`;
}

function sortOverviewPerformanceItems(items, sortMode, mode) {
  const isAll = mode === 'all';
  items.sort((a, b) => {
    const pa = a.perf;
    const pb = b.perf;

    if (sortMode === 'score') {
      const aPlayed = pa.hasPlayed ? 0 : 1;
      const bPlayed = pb.hasPlayed ? 0 : 1;
      if (aPlayed !== bPlayed) return aPlayed - bPlayed;
      if (isAll) {
        if (pa.bestTimeMs !== null && pb.bestTimeMs !== null && pa.bestTimeMs !== pb.bestTimeMs) {
          return pa.bestTimeMs - pb.bestTimeMs;
        }
      } else if (pa.bestScore !== null && pb.bestScore !== null && pb.bestScore !== pa.bestScore) {
        return pb.bestScore - pa.bestScore;
      }
      if ((pa.rank ?? 9999) !== (pb.rank ?? 9999)) {
        return (pa.rank ?? 9999) - (pb.rank ?? 9999);
      }
      return pb.totalPlayers - pa.totalPlayers;
    }

    if (sortMode === 'next') {
      const getBucket = (p) => {
        const diffVal = isAll ? p.msToBeatNext : p.pointsToTieNext;
        if (p.rank !== null && !p.isSoleLeader && diffVal !== null) return 0;
        if (!p.hasPlayed) return 1;
        if (p.rank === null) return 2;
        return 3;
      };
      const ba = getBucket(pa);
      const bb = getBucket(pb);
      if (ba !== bb) return ba - bb;
      if (ba === 0) {
        const da = isAll ? pa.msToBeatNext : pa.pointsToTieNext;
        const db = isAll ? pb.msToBeatNext : pb.pointsToTieNext;
        if (da !== db) return da - db;
        return pb.rank - pa.rank;
      }
      if (ba === 1) return pb.totalPlayers - pa.totalPlayers;
      if (isAll) {
        return (pb.bestTimeMs ?? 0) - (pa.bestTimeMs ?? 0);
      }
      return (pa.bestScore ?? 0) - (pb.bestScore ?? 0);
    }

    // Default: 'rank'
    const aRanked = pa.rank !== null ? 0 : (pa.hasPlayed ? 1 : 2);
    const bRanked = pb.rank !== null ? 0 : (pb.hasPlayed ? 1 : 2);
    if (aRanked !== bRanked) return aRanked - bRanked;
    if (pa.rank !== null && pb.rank !== null && pa.rank !== pb.rank) {
      return pa.rank - pb.rank;
    }
    if (isAll) {
      if ((pa.bestTimeMs ?? Infinity) !== (pb.bestTimeMs ?? Infinity)) {
        return (pa.bestTimeMs ?? Infinity) - (pb.bestTimeMs ?? Infinity);
      }
    } else if ((pb.bestScore ?? -999) !== (pa.bestScore ?? -999)) {
      return (pb.bestScore ?? -999) - (pa.bestScore ?? -999);
    }
    return pb.totalPlayers - pa.totalPlayers;
  });
}

function renderUserPage() {
  if (!userView || !viewedUserId || !userPageList) return;
  const mode = (typeof userPageMode !== 'undefined' && userPageMode === 'all') ? 'all' : '1min';
  renderOverviewFilterControls(userFiltersPanel, userFilterToggleBtn, isUserPageFiltersOpen, renderUserPage);
  const resolvedName = resolveUsernameForUserId(viewedUserId, viewedUsername);
  viewedUsername = resolvedName;
  const isMe = viewedUserId === userId;

  if (userPageLabel) {
    userPageLabel.textContent = isMe ? 'Your Player Profile' : 'Player Profile';
  }
  if (userPageName) {
    userPageName.textContent = isMe ? `${resolvedName} (you)` : resolvedName;
  }

  if (typeof userMode1MinBtn !== 'undefined' && userMode1MinBtn) {
    userMode1MinBtn.classList.toggle('active', mode === '1min');
    userMode1MinBtn.setAttribute('aria-selected', mode === '1min' ? 'true' : 'false');
  }
  if (typeof userModeAllBtn !== 'undefined' && userModeAllBtn) {
    userModeAllBtn.classList.toggle('active', mode === 'all');
    userModeAllBtn.setAttribute('aria-selected', mode === 'all' ? 'true' : 'false');
  }

  if (userSortRankBtn) {
    userSortRankBtn.classList.toggle('active', userPageSortMode === 'rank');
    userSortRankBtn.setAttribute('aria-selected', userPageSortMode === 'rank' ? 'true' : 'false');
  }
  if (userSortScoreBtn) {
    userSortScoreBtn.textContent = mode === 'all' ? '⚡ By Time' : '📈 By Score';
    userSortScoreBtn.classList.toggle('active', userPageSortMode === 'score');
    userSortScoreBtn.setAttribute('aria-selected', userPageSortMode === 'score' ? 'true' : 'false');
  }
  if (userSortNextBtn) {
    userSortNextBtn.classList.toggle('active', userPageSortMode === 'next');
    userSortNextBtn.setAttribute('aria-selected', userPageSortMode === 'next' ? 'true' : 'false');
  }

  const allItems = configs.map((cfg) => ({
    cfg,
    cat: getConfigCategory(cfg),
    perf: getUserConfigPerformance(viewedUserId, cfg.id, mode)
  }));
  const filteredItems = allItems.filter((it) => isOverviewConfigVisible(it.cfg));

  const fullItems = filteredItems.filter(it => !isMiniConfig(it.cfg));
  const miniItems = filteredItems.filter(it => isMiniConfig(it.cfg));
  const fullPlayedCount = fullItems.filter(it => it.perf.hasPlayed).length;
  const miniPlayedCount = miniItems.filter(it => it.perf.hasPlayed).length;

  if (userScopeFullBtn) {
    userScopeFullBtn.classList.toggle('active', userPageScope === 'full');
    userScopeFullBtn.setAttribute('aria-selected', userPageScope === 'full' ? 'true' : 'false');
    userScopeFullBtn.textContent = `Full (${fullPlayedCount}/${fullItems.length})`;
  }
  if (userScopeMiniBtn) {
    userScopeMiniBtn.classList.toggle('active', userPageScope === 'mini');
    userScopeMiniBtn.setAttribute('aria-selected', userPageScope === 'mini' ? 'true' : 'false');
    userScopeMiniBtn.textContent = `Mini (${miniPlayedCount}/${miniItems.length})`;
  }

  const playedItems = allItems.filter(it => it.perf.hasPlayed);
  const firstCount = playedItems.filter(it => it.perf.rank === 1).length;
  const bestRank = playedItems.reduce(
    (minR, it) => (it.perf.rank !== null && it.perf.rank < minR ? it.perf.rank : minR),
    Infinity
  );

  if (userPageStats) {
    const rankStr = bestRank < Infinity ? `Best rank: #${bestRank}` : 'Unranked';
    if (playedItems.length === 0) {
      userPageStats.textContent = mode === 'all' ? 'No Time Attack runs recorded yet' : 'No games recorded yet';
    } else if (mode === 'all') {
      const fastestMs = playedItems.reduce(
        (minMs, it) => (it.perf.bestTimeMs !== null && it.perf.bestTimeMs < minMs ? it.perf.bestTimeMs : minMs),
        Infinity
      );
      const fastestStr = fastestMs < Infinity ? formatDurationMs(fastestMs) : '—';
      userPageStats.textContent = `${playedItems.length} games completed · ${firstCount} × 🏆 #1 · ${rankStr} · Fastest: ${fastestStr}`;
    } else {
      const topScore = playedItems.reduce(
        (maxS, it) => (it.perf.bestScore !== null && it.perf.bestScore > maxS ? it.perf.bestScore : maxS),
        0
      );
      userPageStats.textContent = `${playedItems.length} games played · ${firstCount} × 🏆 #1 · ${rankStr} · Top score: ${topScore}`;
    }
  }

  const scopedItems = userPageScope === 'mini' ? miniItems : fullItems;
  const scopedPlayedCount = userPageScope === 'mini' ? miniPlayedCount : fullPlayedCount;
  if (userPageCountBadge) {
    userPageCountBadge.textContent = `${scopedPlayedCount} / ${scopedItems.length} games`;
  }

  const itemsToShow = [...scopedItems];
  sortOverviewPerformanceItems(itemsToShow, userPageSortMode, mode);

  userPageList.innerHTML = '';
  if (itemsToShow.length === 0) {
    userPageList.appendChild(createOverviewEmptyRow(renderUserPage));
    if (userPagePagination) userPagePagination.classList.add('hidden');
    return;
  }
  const userContextKey = `${viewedUserId}|${mode}|${userPageScope}|${userPageSortMode}|${getOverviewFilterSignature()}`;
  if (userContextKey !== userPageLastContextKey) {
    userPage = 1;
    userPageLastContextKey = userContextKey;
  }
  const totalPages = Math.max(1, Math.ceil(itemsToShow.length / USER_PAGE_SIZE));
  userPage = Math.max(1, Math.min(totalPages, userPage));
  const startIdx = (userPage - 1) * USER_PAGE_SIZE;
  const visibleItems = itemsToShow.slice(startIdx, startIdx + USER_PAGE_SIZE);
  const fragment = document.createDocumentFragment();
  visibleItems.forEach(({ cfg, cat, perf }) => {
    const li = document.createElement('li');
    li.className = 'overview-row' + (cfg.id === activeConfigId ? ' is-active' : '');
    li.title = `Open ${formatConfigLabel(cfg)} leaderboard`;
    li.addEventListener('click', () => {
      if (typeof activeGameMode !== 'undefined' && activeGameMode !== mode) {
        activeGameMode = mode;
        localStorage.setItem(STORAGE_KEYS.activeGameMode, activeGameMode);
      }
      closeUserPage(cfg.id);
    });

    const nameSpan = document.createElement('span');
    nameSpan.className = 'overview-game-name';
    const labelStr = formatConfigLabel(cfg);
    const hasLeadingEmoji = /^(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}])/u.test(labelStr);
    nameSpan.textContent = hasLeadingEmoji ? labelStr : `${getCategoryIcon(cat)} ${labelStr}`;

    const rankSpan = document.createElement('span');
    rankSpan.className = 'overview-rank-info';
    if (perf.rank !== null) {
      const rText = document.createElement('span');
      if (perf.rank === 1) {
        rText.className = 'rank-leader';
        rText.textContent = `🏆 #1 of ${perf.totalPlayers}`;
      } else {
        rText.textContent = `#${perf.rank} of ${perf.totalPlayers}`;
      }
      rankSpan.appendChild(rText);

      const hintText = getOverviewRankUpHintText(perf, mode);
      if (hintText) {
        const upHint = document.createElement('span');
        upHint.className = 'rank-up-hint';
        upHint.textContent = hintText;
        rankSpan.appendChild(upHint);
      }
    } else if (perf.totalPlayers > 0) {
      rankSpan.textContent = `Unranked (${perf.totalPlayers}p)`;
    } else {
      rankSpan.textContent = 'Empty board';
    }

    const rightGroup = document.createElement('span');
    rightGroup.className = 'overview-right-group';

    if (perf.entry) {
      appendEntryActionButtons(rightGroup, perf.entry, cfg.id, mode);
    }

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'overview-score';
    scoreSpan.textContent = formatOverviewPerfValue(perf, mode);

    const playNowBtn = document.createElement('button');
    playNowBtn.type = 'button';
    playNowBtn.className = 'inline-btn';
    playNowBtn.textContent = 'Play';
    playNowBtn.title = `Play ${labelStr}`;
    playNowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof activeGameMode !== 'undefined' && activeGameMode !== mode) {
        activeGameMode = mode;
        localStorage.setItem(STORAGE_KEYS.activeGameMode, activeGameMode);
      }
      closeUserPage(cfg.id);
      startGame(false);
    });

    rightGroup.append(scoreSpan, playNowBtn);
    const leftGroup = document.createElement('div');
    leftGroup.className = 'user-row-left';
    leftGroup.append(nameSpan, rankSpan);
    li.append(leftGroup, rightGroup);
    fragment.appendChild(li);
  });
  userPageList.appendChild(fragment);

  const activeIdx = itemsToShow.findIndex((it) => it.cfg.id === activeConfigId);
  const activePage = activeIdx >= 0 ? Math.floor(activeIdx / USER_PAGE_SIZE) + 1 : null;
  renderPaginationControls(userPagePagination, {
    currentPage: userPage,
    totalPages,
    onPageChange: (page) => {
      userPage = page;
      renderUserPage();
      scrollCardTopIfAboveViewport(userPageList);
    },
    extraAction: activePage && activePage !== userPage
      ? {
          label: `📍 Current (P${activePage})`,
          title: `Jump to current game (Page ${activePage})`,
          onClick: () => {
            userPage = activePage;
            renderUserPage();
            scrollCardTopIfAboveViewport(userPageList);
          }
        }
      : null
  });
}

function updateOverviewCollapseUI() {
  if (overviewBody) {
    overviewBody.classList.toggle('hidden', !isOverviewExpanded);
  }
  if (overviewToggleBtn) {
    overviewToggleBtn.setAttribute('aria-expanded', isOverviewExpanded ? 'true' : 'false');
  }
  if (overviewChevron) {
    overviewChevron.textContent = isOverviewExpanded ? '▾' : '▸';
  }
}

function renderOverview() {
  if (!overviewCard || !overviewList) return;
  const mode = (typeof activeGameMode !== 'undefined' && activeGameMode === 'all') ? 'all' : '1min';
  updateOverviewCollapseUI();
  renderOverviewFilterControls(overviewFiltersPanel, overviewFilterToggleBtn, isOverviewFiltersOpen, renderOverview);

  if (overviewSortNextBtn) {
    overviewSortNextBtn.classList.toggle('active', overviewSortMode === 'next');
    overviewSortNextBtn.setAttribute('aria-selected', overviewSortMode === 'next' ? 'true' : 'false');
  }
  if (overviewSortRankBtn) {
    overviewSortRankBtn.classList.toggle('active', overviewSortMode === 'rank');
    overviewSortRankBtn.setAttribute('aria-selected', overviewSortMode === 'rank' ? 'true' : 'false');
  }
  if (overviewSortScoreBtn) {
    overviewSortScoreBtn.textContent = mode === 'all' ? '⚡ By Time' : '📈 By Score';
    overviewSortScoreBtn.classList.toggle('active', overviewSortMode === 'score');
    overviewSortScoreBtn.setAttribute('aria-selected', overviewSortMode === 'score' ? 'true' : 'false');
  }

  const allOverviewItems = configs
    .filter((cfg) => isOverviewConfigVisible(cfg))
    .map((cfg) => ({
      cfg,
      cat: getConfigCategory(cfg),
      perf: getUserConfigPerformance(userId, cfg.id, mode)
    }));

  const fullOverviewItems = allOverviewItems.filter(it => !isMiniConfig(it.cfg));
  const miniOverviewItems = allOverviewItems.filter(it => isMiniConfig(it.cfg));
  const fullPlayedCount = fullOverviewItems.filter(it => it.perf.hasPlayed).length;
  const miniPlayedCount = miniOverviewItems.filter(it => it.perf.hasPlayed).length;

  if (overviewScopeFullBtn) {
    overviewScopeFullBtn.classList.toggle('active', overviewScope === 'full');
    overviewScopeFullBtn.setAttribute('aria-selected', overviewScope === 'full' ? 'true' : 'false');
    overviewScopeFullBtn.textContent = `Full (${fullPlayedCount}/${fullOverviewItems.length})`;
  }
  if (overviewScopeMiniBtn) {
    overviewScopeMiniBtn.classList.toggle('active', overviewScope === 'mini');
    overviewScopeMiniBtn.setAttribute('aria-selected', overviewScope === 'mini' ? 'true' : 'false');
    overviewScopeMiniBtn.textContent = `Mini (${miniPlayedCount}/${miniOverviewItems.length})`;
  }

  const items = overviewScope === 'mini' ? miniOverviewItems : fullOverviewItems;

  const playedCount = items.filter(it => it.perf.hasPlayed).length;
  const firstPlaceCount = items.filter(it => it.perf.rank === 1).length;
  if (overviewSummaryBadge) {
    overviewSummaryBadge.textContent =
      firstPlaceCount > 0
        ? `${playedCount}/${items.length} played · ${firstPlaceCount} × 🏆#1`
        : `${playedCount}/${items.length} played`;
  }

  if (!isOverviewExpanded) {
    return;
  }

  sortOverviewPerformanceItems(items, overviewSortMode, mode);

  const overviewContextKey = `${userId}|${mode}|${overviewScope}|${overviewSortMode}|${getOverviewFilterSignature()}`;
  if (overviewContextKey !== overviewLastContextKey) {
    overviewPage = 1;
    overviewLastContextKey = overviewContextKey;
  }

  overviewList.innerHTML = '';
  if (items.length === 0) {
    overviewList.appendChild(createOverviewEmptyRow(renderOverview));
    if (overviewPagination) overviewPagination.classList.add('hidden');
    return;
  }
  const totalPages = Math.max(1, Math.ceil(items.length / OVERVIEW_PAGE_SIZE));
  overviewPage = Math.max(1, Math.min(totalPages, overviewPage));
  const startIdx = (overviewPage - 1) * OVERVIEW_PAGE_SIZE;
  const visibleItems = items.slice(startIdx, startIdx + OVERVIEW_PAGE_SIZE);
  const fragment = document.createDocumentFragment();
  visibleItems.forEach(({ cfg, cat, perf }) => {
    const li = document.createElement('li');
    li.className = 'overview-row' + (cfg.id === activeConfigId ? ' is-active' : '');
    li.title = 'Tap to view this leaderboard';
    li.addEventListener('click', () => {
      if (activeCategory !== cat) {
        activeCategory = cat;
        localStorage.setItem(STORAGE_KEYS.activeCategory, activeCategory);
      }
      switchConfig(cfg.id);
    });

    const nameSpan = document.createElement('span');
    nameSpan.className = 'overview-game-name';
    const labelStr = formatConfigLabel(cfg);
    const hasLeadingEmoji = /^(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}])/u.test(labelStr);
    nameSpan.textContent = hasLeadingEmoji ? labelStr : `${getCategoryIcon(cat)} ${labelStr}`;

    const rankSpan = document.createElement('span');
    rankSpan.className = 'overview-rank-info';
    if (perf.rank !== null) {
      const rText = document.createElement('span');
      if (perf.rank === 1) {
        rText.className = 'rank-leader';
        rText.textContent = `🏆 #1 of ${perf.totalPlayers}`;
      } else {
        rText.textContent = `#${perf.rank} of ${perf.totalPlayers}`;
      }
      rankSpan.appendChild(rText);

      const hintText = getOverviewRankUpHintText(perf, mode);
      if (hintText) {
        const upHint = document.createElement('span');
        upHint.className = 'rank-up-hint';
        upHint.textContent = hintText;
        rankSpan.appendChild(upHint);
      }
    } else if (perf.totalPlayers > 0) {
      rankSpan.textContent = `Unranked (${perf.totalPlayers}p)`;
    } else {
      rankSpan.textContent = 'Empty board';
    }

    const rightGroup = document.createElement('span');
    rightGroup.className = 'overview-right-group';

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'overview-score';
    scoreSpan.textContent = formatOverviewPerfValue(perf, mode);

    const playNowBtn = document.createElement('button');
    playNowBtn.type = 'button';
    playNowBtn.className = 'inline-btn';
    playNowBtn.textContent = 'Play';
    playNowBtn.title = `Play ${labelStr}`;
    playNowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeCategory = cat;
      activeConfigId = cfg.id;
      leaderboardPage = 1;
      localStorage.setItem(STORAGE_KEYS.activeCategory, activeCategory);
      localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
      renderConfigsUI();
      renderLeaderboard();
      renderReview();
      startGame(false);
    });

    rightGroup.append(scoreSpan, playNowBtn);
    li.append(nameSpan, rankSpan, rightGroup);
    fragment.appendChild(li);
  });
  overviewList.appendChild(fragment);

  const activeIdx = items.findIndex((it) => it.cfg.id === activeConfigId);
  const activePage = activeIdx >= 0 ? Math.floor(activeIdx / OVERVIEW_PAGE_SIZE) + 1 : null;
  renderPaginationControls(overviewPagination, {
    currentPage: overviewPage,
    totalPages,
    onPageChange: (page) => {
      overviewPage = page;
      renderOverview();
      scrollCardTopIfAboveViewport(overviewList);
    },
    extraAction: activePage && activePage !== overviewPage
      ? {
          label: `📍 Current (P${activePage})`,
          title: `Jump to current game (Page ${activePage})`,
          onClick: () => {
            overviewPage = activePage;
            renderOverview();
            scrollCardTopIfAboveViewport(overviewList);
          }
        }
      : null
  });
}
