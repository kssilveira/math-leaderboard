// Overview ("My Ranks & Scores") and Player Profile Page filters & rendering.

function getOverviewFilterGroups() {
  const cefrOrder =
    typeof window !== 'undefined' && Array.isArray(window.STUDY_CEFR_ORDER)
      ? window.STUDY_CEFR_ORDER
      : ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
  const langOrder = typeof STUDY_LANGUAGE_META !== 'undefined' ? Object.keys(STUDY_LANGUAGE_META) : VALID_LANG_FILTERS;
  const sortLangCodes = (codes) =>
    Array.from(codes).sort((a, b) => {
      const ia = langOrder.indexOf(a);
      const ib = langOrder.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });

  const studyLearnSet = new Set();
  const studyWithSet = new Set();
  const cefrSet = new Set();
  configs.forEach((cfg) => {
    if (!cfg) return;
    if (cfg.studyLearn) studyLearnSet.add(cfg.studyLearn);
    if (cfg.studyWith && cfg.studyWith !== cfg.studyLearn) studyWithSet.add(cfg.studyWith);
    if (cfg.studyCefr) cefrSet.add(String(cfg.studyCefr).toLowerCase());
  });
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
      label: 'Lang',
      dimmed: overviewExcludedTags.has('topic:lang'),
      options: VALID_LANG_FILTERS.map((code) => ({ tag: `lang:${code}`, label: getStudyLangDisplay(code) }))
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
      label: 'Learn',
      dimmed: overviewExcludedTags.has('topic:study'),
      options: sortLangCodes(studyLearnSet).map((code) => ({
        tag: `study_learn:${code}`,
        label: getStudyLangDisplay(code)
      }))
    },
    {
      label: 'With',
      dimmed: overviewExcludedTags.has('topic:study'),
      options: sortLangCodes(studyWithSet).map((code) => ({
        tag: `study_with:${code}`,
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
    if (Array.isArray(cfg && cfg.langs)) {
      cfg.langs.forEach((code) => {
        if (code) tags.push(`lang:${code}`);
      });
    }
  } else if (cat === 'study') {
    if (cfg && cfg.studyLearn) {
      tags.push(`study_learn:${cfg.studyLearn}`);
    }
    if (cfg && cfg.studyWith && cfg.studyWith !== cfg.studyLearn) {
      tags.push(`study_with:${cfg.studyWith}`);
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
  return !getOverviewConfigTags(cfg).some((tag) => overviewExcludedTags.has(tag));
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
  const activeLearnTag = activeStudyLearn ? `study_learn:${activeStudyLearn}` : '';
  if (
    learnGroup &&
    learnGroup.options.length >= 2 &&
    activeStudyLearn &&
    learnGroup.options.some((opt) => opt.tag === activeLearnTag)
  ) {
    const isOnlyActiveLearn =
      !overviewExcludedTags.has(activeLearnTag) &&
      learnGroup.options.every((opt) => opt.tag === activeLearnTag || overviewExcludedTags.has(opt.tag));
    const onlyLearnBtn = document.createElement('button');
    onlyLearnBtn.type = 'button';
    onlyLearnBtn.className = 'inline-btn' + (isOnlyActiveLearn ? ' active' : '');
    onlyLearnBtn.textContent = `Learn ${getStudyLangDisplay(activeStudyLearn)}`;
    onlyLearnBtn.title = 'Show only this Study Learn language';
    onlyLearnBtn.setAttribute('aria-pressed', isOnlyActiveLearn ? 'true' : 'false');
    onlyLearnBtn.addEventListener('click', () => {
      if (isOnlyActiveLearn) {
        learnGroup.options.forEach((opt) => overviewExcludedTags.delete(opt.tag));
      } else {
        learnGroup.options.forEach((opt) => {
          if (opt.tag === activeLearnTag) {
            overviewExcludedTags.delete(opt.tag);
          } else {
            overviewExcludedTags.add(opt.tag);
          }
        });
      }
      saveOverviewExcludedFilters();
      onChanged();
    });
    headerActions.appendChild(onlyLearnBtn);
  }

  const withGroup = groups.find((g) => g.label === 'With');
  const activeWithTag = activeStudyWith ? `study_with:${activeStudyWith}` : '';
  if (
    withGroup &&
    withGroup.options.length >= 2 &&
    activeStudyWith &&
    withGroup.options.some((opt) => opt.tag === activeWithTag)
  ) {
    const isOnlyActiveWith =
      !overviewExcludedTags.has(activeWithTag) &&
      withGroup.options.every((opt) => opt.tag === activeWithTag || overviewExcludedTags.has(opt.tag));
    const onlyWithBtn = document.createElement('button');
    onlyWithBtn.type = 'button';
    onlyWithBtn.className = 'inline-btn' + (isOnlyActiveWith ? ' active' : '');
    onlyWithBtn.textContent = `With ${getStudyLangDisplay(activeStudyWith)}`;
    onlyWithBtn.title = 'Show only this Study paired language';
    onlyWithBtn.setAttribute('aria-pressed', isOnlyActiveWith ? 'true' : 'false');
    onlyWithBtn.addEventListener('click', () => {
      if (isOnlyActiveWith) {
        withGroup.options.forEach((opt) => overviewExcludedTags.delete(opt.tag));
      } else {
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
    headerActions.appendChild(onlyWithBtn);
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

function renderUserPage() {
  if (!userView || !viewedUserId || !userPageList) return;
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

  if (userSortRankBtn) {
    userSortRankBtn.classList.toggle('active', userPageSortMode === 'rank');
    userSortRankBtn.setAttribute('aria-selected', userPageSortMode === 'rank' ? 'true' : 'false');
  }
  if (userSortScoreBtn) {
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
    perf: getUserConfigPerformance(viewedUserId, cfg.id)
  }));
  const filteredItems = allItems.filter((it) => isOverviewConfigVisible(it.cfg));

  const fullItems = filteredItems.filter(it => !isMiniConfig(it.cfg));
  const miniItems = filteredItems.filter(it => isMiniConfig(it.cfg));
  const fullPlayedCount = fullItems.filter(it => it.perf.bestScore !== null).length;
  const miniPlayedCount = miniItems.filter(it => it.perf.bestScore !== null).length;

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

  const playedItems = allItems.filter(it => it.perf.bestScore !== null);
  const firstCount = playedItems.filter(it => it.perf.rank === 1).length;
  const bestRank = playedItems.reduce(
    (minR, it) => (it.perf.rank !== null && it.perf.rank < minR ? it.perf.rank : minR),
    Infinity
  );
  const topScore = playedItems.reduce(
    (maxS, it) => (it.perf.bestScore !== null && it.perf.bestScore > maxS ? it.perf.bestScore : maxS),
    0
  );

  if (userPageStats) {
    const rankStr = bestRank < Infinity ? `Best rank: #${bestRank}` : 'Unranked';
    userPageStats.textContent =
      playedItems.length > 0
        ? `${playedItems.length} games played · ${firstCount} × 🏆 #1 · ${rankStr} · Top score: ${topScore}`
        : 'No games recorded yet';
  }

  const scopedItems = userPageScope === 'mini' ? miniItems : fullItems;
  const scopedPlayedCount = userPageScope === 'mini' ? miniPlayedCount : fullPlayedCount;
  if (userPageCountBadge) {
    userPageCountBadge.textContent = `${scopedPlayedCount} / ${scopedItems.length} games`;
  }

  const itemsToShow = [...scopedItems];
  itemsToShow.sort((a, b) => {
    const pa = a.perf;
    const pb = b.perf;

    if (userPageSortMode === 'score') {
      const aPlayed = pa.bestScore !== null ? 0 : 1;
      const bPlayed = pb.bestScore !== null ? 0 : 1;
      if (aPlayed !== bPlayed) return aPlayed - bPlayed;
      if (pa.bestScore !== null && pb.bestScore !== null && pb.bestScore !== pa.bestScore) {
        return pb.bestScore - pa.bestScore;
      }
      return (pa.rank ?? 9999) - (pb.rank ?? 9999);
    }

    if (userPageSortMode === 'next') {
      const getBucket = (p) => {
        if (p.rank !== null && !p.isSoleLeader && p.pointsToTieNext !== null) return 0;
        if (p.bestScore === null) return 1;
        if (p.rank === null) return 2;
        return 3;
      };
      const ba = getBucket(pa);
      const bb = getBucket(pb);
      if (ba !== bb) return ba - bb;
      if (ba === 0) {
        if (pa.pointsToTieNext !== pb.pointsToTieNext) {
          return pa.pointsToTieNext - pb.pointsToTieNext;
        }
        return pb.rank - pa.rank;
      }
      if (ba === 1) return pb.totalPlayers - pa.totalPlayers;
      return (pa.bestScore ?? 0) - (pb.bestScore ?? 0);
    }

    // Default: 'rank'
    const aRanked = pa.rank !== null ? 0 : (pa.bestScore !== null ? 1 : 2);
    const bRanked = pb.rank !== null ? 0 : (pb.bestScore !== null ? 1 : 2);
    if (aRanked !== bRanked) return aRanked - bRanked;
    if (pa.rank !== null && pb.rank !== null && pa.rank !== pb.rank) {
      return pa.rank - pb.rank;
    }
    if ((pb.bestScore ?? -999) !== (pa.bestScore ?? -999)) {
      return (pb.bestScore ?? -999) - (pa.bestScore ?? -999);
    }
    return pb.totalPlayers - pa.totalPlayers;
  });

  userPageList.innerHTML = '';
  if (itemsToShow.length === 0) {
    userPageList.appendChild(createOverviewEmptyRow(renderUserPage));
    return;
  }
  itemsToShow.forEach(({ cfg, cat, perf }) => {
    const li = document.createElement('li');
    li.className = 'overview-row' + (cfg.id === activeConfigId ? ' is-active' : '');
    li.title = `Open ${formatConfigLabel(cfg)} leaderboard`;
    li.addEventListener('click', () => {
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

      if (!perf.isSoleLeader && perf.pointsToTieNext !== null && perf.nextRank !== null) {
        const upHint = document.createElement('span');
        upHint.className = 'rank-up-hint';
        upHint.textContent =
          perf.rank === 1
            ? '+1 for sole #1'
            : `↑ +${perf.pointsToTieNext} to #${perf.nextRank}`;
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
      appendEntryActionButtons(rightGroup, perf.entry, cfg.id);
    }

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'overview-score';
    scoreSpan.textContent = perf.bestScore !== null ? String(perf.bestScore) : '—';

    const playNowBtn = document.createElement('button');
    playNowBtn.type = 'button';
    playNowBtn.className = 'inline-btn';
    playNowBtn.textContent = 'Play';
    playNowBtn.title = `Play ${labelStr}`;
    playNowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeUserPage(cfg.id);
      startGame(false);
    });

    rightGroup.append(scoreSpan, playNowBtn);
    const leftGroup = document.createElement('div');
    leftGroup.className = 'user-row-left';
    leftGroup.append(nameSpan, rankSpan);
    li.append(leftGroup, rightGroup);
    userPageList.appendChild(li);
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
    overviewSortScoreBtn.classList.toggle('active', overviewSortMode === 'score');
    overviewSortScoreBtn.setAttribute('aria-selected', overviewSortMode === 'score' ? 'true' : 'false');
  }

  const allOverviewItems = configs
    .filter((cfg) => isOverviewConfigVisible(cfg))
    .map((cfg) => ({
      cfg,
      cat: getConfigCategory(cfg),
      perf: getUserConfigPerformance(userId, cfg.id)
    }));

  const fullOverviewItems = allOverviewItems.filter(it => !isMiniConfig(it.cfg));
  const miniOverviewItems = allOverviewItems.filter(it => isMiniConfig(it.cfg));
  const fullPlayedCount = fullOverviewItems.filter(it => it.perf.bestScore !== null).length;
  const miniPlayedCount = miniOverviewItems.filter(it => it.perf.bestScore !== null).length;

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

  const playedCount = items.filter(it => it.perf.bestScore !== null).length;
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

  items.sort((a, b) => {
    const pa = a.perf;
    const pb = b.perf;

    if (overviewSortMode === 'rank') {
      const aRanked = pa.rank !== null ? 0 : (pa.bestScore !== null ? 1 : 2);
      const bRanked = pb.rank !== null ? 0 : (pb.bestScore !== null ? 1 : 2);
      if (aRanked !== bRanked) return aRanked - bRanked;
      if (pa.rank !== null && pb.rank !== null && pa.rank !== pb.rank) {
        return pa.rank - pb.rank;
      }
      if ((pb.bestScore ?? -999) !== (pa.bestScore ?? -999)) {
        return (pb.bestScore ?? -999) - (pa.bestScore ?? -999);
      }
      return pb.totalPlayers - pa.totalPlayers;
    }

    if (overviewSortMode === 'score') {
      const aPlayed = pa.bestScore !== null ? 0 : 1;
      const bPlayed = pb.bestScore !== null ? 0 : 1;
      if (aPlayed !== bPlayed) return aPlayed - bPlayed;
      if (pa.bestScore !== null && pb.bestScore !== null && pb.bestScore !== pa.bestScore) {
        return pb.bestScore - pa.bestScore;
      }
      if ((pa.rank ?? 9999) !== (pb.rank ?? 9999)) {
        return (pa.rank ?? 9999) - (pb.rank ?? 9999);
      }
      return pb.totalPlayers - pa.totalPlayers;
    }

    // Default: 'next' (🎯 Play Next: closest to ranking up first, then unplayed, then #1 leaders)
    const getBucket = (p) => {
      if (p.rank !== null && !p.isSoleLeader && p.pointsToTieNext !== null) return 0; // Can climb rank!
      if (p.bestScore === null) return 1; // Unplayed
      if (p.rank === null) return 2; // Played locally, not on board
      return 3; // Already sole #1
    };
    const ba = getBucket(pa);
    const bb = getBucket(pb);
    if (ba !== bb) return ba - bb;
    if (ba === 0) {
      if (pa.pointsToTieNext !== pb.pointsToTieNext) {
        return pa.pointsToTieNext - pb.pointsToTieNext;
      }
      return pb.rank - pa.rank;
    }
    if (ba === 1) {
      return pb.totalPlayers - pa.totalPlayers;
    }
    return (pa.bestScore ?? 0) - (pb.bestScore ?? 0);
  });

  overviewList.innerHTML = '';
  if (items.length === 0) {
    overviewList.appendChild(createOverviewEmptyRow(renderOverview));
    return;
  }
  items.forEach(({ cfg, cat, perf }) => {
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

      if (!perf.isSoleLeader && perf.pointsToTieNext !== null && perf.nextRank !== null) {
        const upHint = document.createElement('span');
        upHint.className = 'rank-up-hint';
        upHint.textContent =
          perf.rank === 1
            ? `+1 for sole #1`
            : `↑ +${perf.pointsToTieNext} to #${perf.nextRank}`;
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
    scoreSpan.textContent = perf.bestScore !== null ? String(perf.bestScore) : '—';

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
    overviewList.appendChild(li);
  });
}
