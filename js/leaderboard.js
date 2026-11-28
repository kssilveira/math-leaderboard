// --- Ranked Leaderboard Cache, Leaderboard Rendering & User Profile Navigation ---

const rankedLeaderboardCache = new Map();
const rankedTimeLeaderboardCache = new Map();
const EMPTY_RANKED_BOARD = { rankedEntries: [], byUserId: new Map() };

function isAllMode(mode = activeGameMode) {
  return mode === 'all';
}

function getLeaderboardsMapForMode(mode = activeGameMode) {
  if (isAllMode(mode)) {
    return typeof timeLeaderboardsMap !== 'undefined' && timeLeaderboardsMap ? timeLeaderboardsMap : {};
  }
  return typeof leaderboardsMap !== 'undefined' && leaderboardsMap ? leaderboardsMap : {};
}

function formatEntryPrimaryValue(entry, mode = activeGameMode) {
  if (!entry) return '—';
  if (isAllMode(mode)) {
    return typeof entry.durationMs === 'number' && entry.durationMs > 0
      ? formatDurationMs(entry.durationMs)
      : '—';
  }
  return String(entry.score);
}

function invalidateRankedLeaderboardCache(cfgId = null, mode = null) {
  if (mode !== 'all') {
    if (cfgId) rankedLeaderboardCache.delete(cfgId);
    else rankedLeaderboardCache.clear();
  }
  if (mode !== '1min') {
    if (cfgId) rankedTimeLeaderboardCache.delete(cfgId);
    else rankedTimeLeaderboardCache.clear();
  }
}

function getRankedLeaderboard(cfgId, mode = activeGameMode) {
  if (!cfgId) return EMPTY_RANKED_BOARD;
  const resolvedMode = isAllMode(mode) ? 'all' : '1min';
  const boardObj = getLeaderboardsMapForMode(resolvedMode)[cfgId];
  if (!boardObj) return EMPTY_RANKED_BOARD;
  const targetCache = resolvedMode === 'all' ? rankedTimeLeaderboardCache : rankedLeaderboardCache;
  const cached = targetCache.get(cfgId);
  if (cached) return cached;

  const rawEntries = Object.values(boardObj).filter((e) =>
    resolvedMode === 'all'
      ? Boolean(e && typeof e.durationMs === 'number' && e.durationMs > 0)
      : Boolean(e && typeof e.score === 'number')
  );
  const entries = sortLeaderboard(rawEntries, resolvedMode);
  let currentRank = 1;
  const byUserId = new Map();
  const rankedEntries = entries.map((entry, idx) => {
    if (idx > 0) {
      if (resolvedMode === 'all') {
        if (entry.durationMs > entries[idx - 1].durationMs) {
          currentRank = idx + 1;
        }
      } else if (entry.score < entries[idx - 1].score) {
        currentRank = idx + 1;
      }
    }
    const ranked = { ...entry, rank: currentRank };
    if (ranked.userId) {
      byUserId.set(ranked.userId, { entry: ranked, index: idx });
    }
    return ranked;
  });

  const result = { rankedEntries, byUserId };
  targetCache.set(cfgId, result);
  return result;
}

function getUserConfigPerformance(targetUserId, cfgId, mode = activeGameMode) {
  const resolvedMode = isAllMode(mode) ? 'all' : '1min';
  const { rankedEntries, byUserId } = getRankedLeaderboard(cfgId, resolvedMode);
  const totalPlayers = rankedEntries.length;
  const myHit = byUserId.get(targetUserId) || null;
  const myEntry = myHit ? myHit.entry : null;
  const bestLocal = myEntry ? null : getBestLocalSession(targetUserId, cfgId, resolvedMode);

  if (resolvedMode === 'all') {
    const bestTimeMs = myEntry
      ? myEntry.durationMs
      : (bestLocal && typeof bestLocal.durationMs === 'number' && bestLocal.durationMs > 0 ? bestLocal.durationMs : null);
    const rank = myEntry ? myEntry.rank : null;
    let nextRank = null;
    let msToBeatNext = null;
    let isSoleLeader = false;

    if (myEntry) {
      let nextUp = null;
      for (let i = myHit.index - 1; i >= 0; i--) {
        if (rankedEntries[i].durationMs < myEntry.durationMs) {
          nextUp = rankedEntries[i];
          break;
        }
      }
      if (nextUp) {
        nextRank = nextUp.rank;
        msToBeatNext = Math.max(1, myEntry.durationMs - nextUp.durationMs);
      } else {
        const hasCoLeader =
          myHit.index > 0 ||
          (myHit.index + 1 < totalPlayers && rankedEntries[myHit.index + 1].durationMs === myEntry.durationMs);
        if (hasCoLeader) {
          nextRank = 1;
          msToBeatNext = 1;
        } else {
          isSoleLeader = true;
        }
      }
    } else if (totalPlayers > 0) {
      const lowest = rankedEntries[totalPlayers - 1];
      nextRank = lowest.rank;
      msToBeatNext = bestTimeMs !== null ? Math.max(1, bestTimeMs - lowest.durationMs) : lowest.durationMs;
    }

    return {
      mode: 'all',
      cfgId,
      totalPlayers,
      rank,
      bestScore: null,
      bestTimeMs,
      hasPlayed: bestTimeMs !== null,
      entry: myEntry,
      nextRank,
      pointsToTieNext: null,
      msToBeatNext,
      isSoleLeader
    };
  }

  const bestScore = myEntry
    ? myEntry.score
    : (bestLocal && typeof bestLocal.score === 'number' ? bestLocal.score : null);
  const rank = myEntry ? myEntry.rank : null;

  let nextRank = null;
  let pointsToTieNext = null;
  let isSoleLeader = false;

  if (myEntry) {
    let nextUp = null;
    for (let i = myHit.index - 1; i >= 0; i--) {
      if (rankedEntries[i].score > myEntry.score) {
        nextUp = rankedEntries[i];
        break;
      }
    }
    if (nextUp) {
      nextRank = nextUp.rank;
      pointsToTieNext = nextUp.score - myEntry.score;
    } else {
      const hasCoLeader =
        myHit.index > 0 ||
        (myHit.index + 1 < totalPlayers && rankedEntries[myHit.index + 1].score === myEntry.score);
      if (hasCoLeader) {
        nextRank = 1;
        pointsToTieNext = 1;
      } else {
        isSoleLeader = true;
      }
    }
  } else if (totalPlayers > 0) {
    const lowest = rankedEntries[totalPlayers - 1];
    nextRank = lowest.rank;
    pointsToTieNext = Math.max(1, lowest.score - (bestScore !== null ? Math.max(0, bestScore) : 0));
  }

  return {
    mode: '1min',
    cfgId,
    totalPlayers,
    rank,
    bestScore,
    bestTimeMs: null,
    hasPlayed: bestScore !== null,
    entry: myEntry,
    nextRank,
    pointsToTieNext,
    msToBeatNext: null,
    isSoleLeader
  };
}

function sortLeaderboard(entries, mode = activeGameMode) {
  if (isAllMode(mode)) {
    return [...entries].sort((a, b) => {
      const aDur = typeof a.durationMs === 'number' && a.durationMs > 0 ? a.durationMs : Infinity;
      const bDur = typeof b.durationMs === 'number' && b.durationMs > 0 ? b.durationMs : Infinity;
      if (aDur !== bDur) return aDur - bDur;
      if ((a.wrong || 0) !== (b.wrong || 0)) return (a.wrong || 0) - (b.wrong || 0);
      return (a.updatedAt || 0) - (b.updatedAt || 0);
    });
  }
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.updatedAt || 0) - (b.updatedAt || 0);
  });
}

function hasMyBestReplaySession(mode = activeGameMode) {
  const resolvedMode = isAllMode(mode) ? 'all' : '1min';
  const boardObj = getLeaderboardsMapForMode(resolvedMode)[activeConfigId] || {};
  const myEntry = boardObj[userId];
  if (myEntry && entryHasReplay(myEntry)) return true;
  const bestLocal = getBestLocalSession(userId, activeConfigId, resolvedMode);
  return sessionHasQuestions(bestLocal);
}

function getMyBestLocalScore(mode = activeGameMode) {
  const resolvedMode = isAllMode(mode) ? 'all' : '1min';
  const bestLocal = getBestLocalSession(userId, activeConfigId, resolvedMode);
  if (!bestLocal) return null;
  if (resolvedMode === 'all') {
    return typeof bestLocal.durationMs === 'number' && bestLocal.durationMs > 0 ? bestLocal.durationMs : null;
  }
  return typeof bestLocal.score === 'number' ? bestLocal.score : null;
}

function appendEntryActionButtons(container, entry, targetConfigId = activeConfigId, mode = activeGameMode) {
  if (!entryHasReplay(entry)) return;
  const resolvedMode = isAllMode(mode) ? 'all' : '1min';

  const replayBtn = document.createElement('button');
  replayBtn.type = 'button';
  replayBtn.className = 'inline-btn';
  replayBtn.textContent = '▶';
  replayBtn.title = `Replay ${entry.username}'s best game`;
  replayBtn.setAttribute('aria-label', `Replay ${entry.username}'s best game`);
  replayBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    replayBtn.disabled = true;
    try {
      const replaySession = await resolveEntryReplaySession(entry, targetConfigId, resolvedMode);
      if (replaySession) startReplay(replaySession);
    } finally {
      replayBtn.disabled = false;
    }
  });

  container.appendChild(replayBtn);
}

function createLeaderboardRowEl(entry, extraLabel = '', mode = activeGameMode) {
  const resolvedMode = isAllMode(mode) ? 'all' : '1min';
  const li = document.createElement('li');
  const isMe = entry.userId === userId;
  li.className = 'leaderboard-row' + (isMe ? ' is-me' : '');

  const rankSpan = document.createElement('span');
  rankSpan.className = 'rank-num';
  rankSpan.textContent = `#${entry.rank}`;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'player-name clickable';
  nameSpan.textContent = entry.username + (isMe ? ' (you)' : '') + (extraLabel ? ` · ${extraLabel}` : '');
  nameSpan.title = `View ${entry.username}'s profile & all scores`;
  nameSpan.addEventListener('click', (e) => {
    e.stopPropagation();
    openUserPage(entry.userId, entry.username, resolvedMode);
  });

  const rightGroup = document.createElement('span');
  rightGroup.className = 'player-right-group';

  appendEntryActionButtons(rightGroup, entry, activeConfigId, resolvedMode);

  const scoreSpan = document.createElement('span');
  scoreSpan.className = 'player-score';
  scoreSpan.textContent = formatEntryPrimaryValue(entry, resolvedMode);
  if (resolvedMode === 'all' && typeof entry.right === 'number') {
    scoreSpan.title = `${entry.right} right · ${entry.wrong || 0} wrong`;
  }
  rightGroup.appendChild(scoreSpan);

  li.append(rankSpan, nameSpan, rightGroup);
  return li;
}

function getPageButtonNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  } else if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }
  const sorted = Array.from(pages)
    .filter(p => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('...');
    }
    result.push(sorted[i]);
  }
  return result;
}

function renderPaginationControls(containerEl, { currentPage, totalPages, onPageChange, extraAction = null }) {
  if (!containerEl) return;
  containerEl.innerHTML = '';
  if (totalPages <= 1) {
    containerEl.classList.add('hidden');
    return;
  }

  const navGroup = document.createElement('div');
  navGroup.className = 'page-nav-group';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'page-btn';
  prevBtn.textContent = '‹';
  prevBtn.title = 'Previous page';
  prevBtn.setAttribute('aria-label', 'Previous page');
  prevBtn.disabled = currentPage <= 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  });
  navGroup.appendChild(prevBtn);

  const pageTokens = getPageButtonNumbers(currentPage, totalPages);
  pageTokens.forEach((token) => {
    if (token === '...') {
      const dots = document.createElement('span');
      dots.className = 'page-ellipsis';
      dots.textContent = '…';
      navGroup.appendChild(dots);
    } else {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'page-btn' + (token === currentPage ? ' active' : '');
      btn.textContent = String(token);
      btn.setAttribute('aria-label', `Page ${token}`);
      if (token === currentPage) {
        btn.setAttribute('aria-current', 'page');
      }
      btn.addEventListener('click', () => {
        if (token !== currentPage) onPageChange(token);
      });
      navGroup.appendChild(btn);
    }
  });

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'page-btn';
  nextBtn.textContent = '›';
  nextBtn.title = 'Next page';
  nextBtn.setAttribute('aria-label', 'Next page');
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  });
  navGroup.appendChild(nextBtn);

  containerEl.appendChild(navGroup);

  if (extraAction && extraAction.label && typeof extraAction.onClick === 'function') {
    const extraBtn = document.createElement('button');
    extraBtn.type = 'button';
    extraBtn.className = 'page-btn';
    extraBtn.textContent = extraAction.label;
    if (extraAction.title) extraBtn.title = extraAction.title;
    extraBtn.addEventListener('click', extraAction.onClick);
    containerEl.appendChild(extraBtn);
  }

  containerEl.classList.remove('hidden');
}

function renderLeaderboard(options = {}) {
  const { skipOverview = false } = options;
  const mode = isAllMode(activeGameMode) ? 'all' : '1min';
  const { rankedEntries, byUserId } = getRankedLeaderboard(activeConfigId, mode);

  const totalEntries = rankedEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / LEADERBOARD_PAGE_SIZE));
  leaderboardPage = Math.max(1, Math.min(totalPages, leaderboardPage));

  const myHit = byUserId.get(userId) || null;
  const myIndex = myHit ? myHit.index : -1;
  const myEntry = myHit ? myHit.entry : null;
  const myPage = myIndex >= 0 ? Math.floor(myIndex / LEADERBOARD_PAGE_SIZE) + 1 : 1;
  const hasMyBestReplay = hasMyBestReplaySession(mode);
  const localBestVal = myEntry ? null : getMyBestLocalScore(mode);

  if (myEntry) {
    myRankValue.textContent = `#${myEntry.rank} of ${totalEntries}`;
    myBestValue.textContent = formatEntryPrimaryValue(myEntry, mode);
    if (myRankJump) {
      const canJump = totalPages > 1 && leaderboardPage !== myPage;
      myRankJump.classList.toggle('clickable', totalPages > 1);
      myRankJump.title = canJump ? `Jump to your page (Page ${myPage})` : '';
      myRankJump.onclick = totalPages > 1
        ? () => {
            leaderboardPage = myPage;
            renderLeaderboard({ skipOverview: true });
          }
        : null;
    }
  } else {
    myRankValue.textContent = totalEntries > 0 ? `Unranked (of ${totalEntries})` : 'Unranked';
    myBestValue.textContent = localBestVal !== null
      ? (mode === 'all' ? formatDurationMs(localBestVal) : String(localBestVal))
      : '—';
    if (myRankJump) {
      myRankJump.classList.remove('clickable');
      myRankJump.title = '';
      myRankJump.onclick = null;
    }
  }

  if (myBestActions) {
    myBestActions.classList.toggle('hidden', !hasMyBestReplay);
  }

  // Next score/time to move up
  if (nextRankRow && nextRankText && nextRankActions) {
    nextRankActions.innerHTML = '';
    nextRankActions.classList.add('hidden');
    if (myEntry) {
      let nextUpEntry = null;
      for (let i = myIndex - 1; i >= 0; i--) {
        const isBetter = mode === 'all'
          ? rankedEntries[i].durationMs < myEntry.durationMs
          : rankedEntries[i].score > myEntry.score;
        if (isBetter) {
          nextUpEntry = rankedEntries[i];
          break;
        }
      }
      if (nextUpEntry) {
        nextRankText.innerHTML = '';
        const prefix = document.createTextNode('↑ Next: ');
        const strongTarget = document.createElement('strong');
        let suffixText;
        if (mode === 'all') {
          const diffMs = Math.max(1, myEntry.durationMs - nextUpEntry.durationMs);
          strongTarget.textContent = `#${nextUpEntry.rank} ${nextUpEntry.username} (${formatDurationMs(nextUpEntry.durationMs)})`;
          suffixText = ` · −${formatDurationMs(diffMs)} to tie`;
        } else {
          const diffTie = nextUpEntry.score - myEntry.score;
          const diffPass = diffTie + 1;
          strongTarget.textContent = `#${nextUpEntry.rank} ${nextUpEntry.username} (${nextUpEntry.score})`;
          suffixText = ` · +${diffTie} to tie, +${diffPass} to pass`;
        }
        nextRankText.append(prefix, strongTarget, document.createTextNode(suffixText));
        appendEntryActionButtons(nextRankActions, nextUpEntry, activeConfigId, mode);
        if (nextRankActions.childNodes.length > 0) {
          nextRankActions.classList.remove('hidden');
        }
        nextRankRow.classList.remove('hidden');
      } else {
        const coLeaders = rankedEntries.filter((e) => {
          if (e.userId === userId) return false;
          return mode === 'all' ? e.durationMs === myEntry.durationMs : e.score === myEntry.score;
        });
        if (coLeaders.length > 0) {
          nextRankText.textContent = mode === 'all'
            ? `🏆 Tied #1 with ${coLeaders[0].username} · Faster than ${formatDurationMs(myEntry.durationMs)} for sole #1`
            : `🏆 Tied #1 with ${coLeaders[0].username} · Score ${myEntry.score + 1} (+1) for sole #1`;
          appendEntryActionButtons(nextRankActions, coLeaders[0], activeConfigId, mode);
          if (nextRankActions.childNodes.length > 0) {
            nextRankActions.classList.remove('hidden');
          }
        } else {
          const runnerUp = rankedEntries.find((e) =>
            mode === 'all' ? e.durationMs > myEntry.durationMs : e.score < myEntry.score
          );
          if (runnerUp) {
            const leadStr = mode === 'all'
              ? formatDurationMs(runnerUp.durationMs - myEntry.durationMs)
              : `+${myEntry.score - runnerUp.score}`;
            nextRankText.textContent = `🏆 #1 Leader (${leadStr} ahead of #${runnerUp.rank} ${runnerUp.username})`;
          } else {
            nextRankText.textContent = '🏆 #1 Leader';
          }
        }
        nextRankRow.classList.remove('hidden');
      }
    } else if (totalEntries > 0) {
      const entryToCatch = rankedEntries[totalEntries - 1];
      nextRankText.textContent = mode === 'all'
        ? `↑ Complete all to rank · ${formatDurationMs(entryToCatch.durationMs)} ties #${entryToCatch.rank} ${entryToCatch.username}`
        : `↑ Score 1+ to rank · ${entryToCatch.score} ties #${entryToCatch.rank} ${entryToCatch.username}`;
      appendEntryActionButtons(nextRankActions, entryToCatch, activeConfigId, mode);
      if (nextRankActions.childNodes.length > 0) {
        nextRankActions.classList.remove('hidden');
      }
      nextRankRow.classList.remove('hidden');
    } else {
      nextRankRow.classList.add('hidden');
    }
  }

  if (totalEntries === 0) {
    leaderboardList.innerHTML = `<li class="empty-row">${mode === 'all' ? 'No times yet. Be the first!' : 'No scores yet. Be the first!'}</li>`;
    if (leaderboardPinnedMe) leaderboardPinnedMe.classList.add('hidden');
    if (leaderboardPagination) leaderboardPagination.classList.add('hidden');
    if (!skipOverview) {
      renderOverview();
    }
    if (viewedUserId && userView && userView.classList.contains('active')) {
      renderUserPage();
    }
    return;
  }

  const startIdx = (leaderboardPage - 1) * LEADERBOARD_PAGE_SIZE;
  const pageEntries = rankedEntries.slice(startIdx, startIdx + LEADERBOARD_PAGE_SIZE);

  leaderboardList.innerHTML = '';
  pageEntries.forEach((entry) => {
    leaderboardList.appendChild(createLeaderboardRowEl(entry, '', mode));
  });

  // Pinned current user row when viewing a page that doesn't contain them
  if (leaderboardPinnedMe) {
    leaderboardPinnedMe.innerHTML = '';
    if (myEntry && myPage !== leaderboardPage) {
      const sep = document.createElement('div');
      sep.className = 'leaderboard-pinned-sep';
      sep.textContent = '⋯';
      const pinnedRow = createLeaderboardRowEl(myEntry, `Page ${myPage}`, mode);
      pinnedRow.style.cursor = 'pointer';
      pinnedRow.title = `Jump to Page ${myPage}`;
      pinnedRow.addEventListener('click', () => {
        leaderboardPage = myPage;
        renderLeaderboard({ skipOverview: true });
      });
      leaderboardPinnedMe.append(sep, pinnedRow);
      leaderboardPinnedMe.classList.remove('hidden');
    } else {
      leaderboardPinnedMe.classList.add('hidden');
    }
  }

  // Pagination & Jump to Page controls
  renderPaginationControls(leaderboardPagination, {
    currentPage: leaderboardPage,
    totalPages,
    onPageChange: (page) => {
      leaderboardPage = page;
      renderLeaderboard({ skipOverview: true });
    },
    extraAction: myEntry && myPage !== leaderboardPage
      ? {
          label: `🎯 My Rank (P${myPage})`,
          title: `Jump to your page (Page ${myPage})`,
          onClick: () => {
            leaderboardPage = myPage;
            renderLeaderboard({ skipOverview: true });
          }
        }
      : null
  });

  if (!skipOverview) {
    renderOverview();
  }
  if (viewedUserId && userView && userView.classList.contains('active')) {
    renderUserPage();
  }
}

function resolveUsernameForUserId(targetUserId, fallback = '') {
  const localObj = users.find(u => u.userId === targetUserId);
  if (localObj && localObj.username) return localObj.username;
  const maps = [
    typeof leaderboardsMap !== 'undefined' ? leaderboardsMap : {},
    typeof timeLeaderboardsMap !== 'undefined' ? timeLeaderboardsMap : {}
  ];
  for (let m = 0; m < maps.length; m++) {
    const mapObj = maps[m] || {};
    const cfgIds = Object.keys(mapObj);
    for (let i = 0; i < cfgIds.length; i++) {
      const board = mapObj[cfgIds[i]];
      if (board && board[targetUserId] && board[targetUserId].username) {
        return board[targetUserId].username;
      }
    }
  }
  return fallback || 'Player';
}

function openUserPage(targetUserId, fallbackName = '', targetMode = null) {
  if (!targetUserId || !userView) return;
  viewedUserId = targetUserId;
  viewedUsername = resolveUsernameForUserId(targetUserId, fallbackName);
  if (typeof userPageMode !== 'undefined') {
    userPageMode = targetMode === 'all' || targetMode === '1min'
      ? targetMode
      : (typeof activeGameMode !== 'undefined' && activeGameMode === 'all' ? 'all' : '1min');
  }
  homeView.classList.remove('active');
  gameView.classList.remove('active');
  userView.classList.add('active');
  renderUserPage();
}
