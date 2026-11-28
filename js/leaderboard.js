// --- Ranked Leaderboard Cache, Leaderboard Rendering & User Profile Navigation ---

const rankedLeaderboardCache = new Map();
const EMPTY_RANKED_BOARD = { rankedEntries: [], byUserId: new Map() };

function invalidateRankedLeaderboardCache(cfgId = null) {
  if (cfgId) {
    rankedLeaderboardCache.delete(cfgId);
  } else {
    rankedLeaderboardCache.clear();
  }
}

function getRankedLeaderboard(cfgId) {
  if (!cfgId) return EMPTY_RANKED_BOARD;
  const boardObj = leaderboardsMap[cfgId];
  if (!boardObj) return EMPTY_RANKED_BOARD;
  const cached = rankedLeaderboardCache.get(cfgId);
  if (cached) return cached;

  const entries = sortLeaderboard(Object.values(boardObj));
  let currentRank = 1;
  const byUserId = new Map();
  const rankedEntries = entries.map((entry, idx) => {
    if (idx > 0 && entry.score < entries[idx - 1].score) {
      currentRank = idx + 1;
    }
    const ranked = { ...entry, rank: currentRank };
    if (ranked.userId) {
      byUserId.set(ranked.userId, { entry: ranked, index: idx });
    }
    return ranked;
  });

  const result = { rankedEntries, byUserId };
  rankedLeaderboardCache.set(cfgId, result);
  return result;
}

function getUserConfigPerformance(targetUserId, cfgId) {
  const { rankedEntries, byUserId } = getRankedLeaderboard(cfgId);
  const totalPlayers = rankedEntries.length;
  const myHit = byUserId.get(targetUserId) || null;
  const myEntry = myHit ? myHit.entry : null;
  const bestLocal = myEntry ? null : getBestLocalSession(targetUserId, cfgId);
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
    cfgId,
    totalPlayers,
    rank,
    bestScore,
    entry: myEntry,
    nextRank,
    pointsToTieNext,
    isSoleLeader
  };
}

function sortLeaderboard(entries) {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.updatedAt || 0) - (b.updatedAt || 0);
  });
}

function hasMyBestReplaySession() {
  const boardObj = leaderboardsMap[activeConfigId] || {};
  const myEntry = boardObj[userId];
  if (myEntry && entryHasReplay(myEntry)) return true;
  const bestLocal = getBestLocalSession(userId, activeConfigId);
  return sessionHasQuestions(bestLocal);
}

function getMyBestLocalScore() {
  const bestLocal = getBestLocalSession(userId, activeConfigId);
  return bestLocal && typeof bestLocal.score === 'number' ? bestLocal.score : null;
}

function appendEntryActionButtons(container, entry, targetConfigId = activeConfigId) {
  if (!entryHasReplay(entry)) return;

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
      const replaySession = await resolveEntryReplaySession(entry, targetConfigId);
      if (replaySession) startReplay(replaySession);
    } finally {
      replayBtn.disabled = false;
    }
  });

  container.appendChild(replayBtn);
}

function createLeaderboardRowEl(entry, extraLabel = '') {
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
    openUserPage(entry.userId, entry.username);
  });

  const rightGroup = document.createElement('span');
  rightGroup.className = 'player-right-group';

  appendEntryActionButtons(rightGroup, entry, activeConfigId);

  const scoreSpan = document.createElement('span');
  scoreSpan.className = 'player-score';
  scoreSpan.textContent = entry.score;
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

function renderLeaderboard(options = {}) {
  const { skipOverview = false } = options;
  const { rankedEntries, byUserId } = getRankedLeaderboard(activeConfigId);

  const totalEntries = rankedEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / LEADERBOARD_PAGE_SIZE));
  leaderboardPage = Math.max(1, Math.min(totalPages, leaderboardPage));

  const myHit = byUserId.get(userId) || null;
  const myIndex = myHit ? myHit.index : -1;
  const myEntry = myHit ? myHit.entry : null;
  const myPage = myIndex >= 0 ? Math.floor(myIndex / LEADERBOARD_PAGE_SIZE) + 1 : 1;
  const hasMyBestReplay = hasMyBestReplaySession();
  const localBestScore = myEntry ? null : getMyBestLocalScore();

  if (myEntry) {
    myRankValue.textContent = `#${myEntry.rank} of ${totalEntries}`;
    myBestValue.textContent = myEntry.score;
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
    myBestValue.textContent = localBestScore !== null ? localBestScore : '—';
    if (myRankJump) {
      myRankJump.classList.remove('clickable');
      myRankJump.title = '';
      myRankJump.onclick = null;
    }
  }

  if (myBestActions) {
    myBestActions.classList.toggle('hidden', !hasMyBestReplay);
  }

  // Next score to move up
  if (nextRankRow && nextRankText && nextRankActions) {
    nextRankActions.innerHTML = '';
    nextRankActions.classList.add('hidden');
    if (myEntry) {
      let nextUpEntry = null;
      for (let i = myIndex - 1; i >= 0; i--) {
        if (rankedEntries[i].score > myEntry.score) {
          nextUpEntry = rankedEntries[i];
          break;
        }
      }
      if (nextUpEntry) {
        const diffTie = nextUpEntry.score - myEntry.score;
        const diffPass = diffTie + 1;
        nextRankText.innerHTML = '';
        const prefix = document.createTextNode('↑ Next: ');
        const strongTarget = document.createElement('strong');
        strongTarget.textContent = `#${nextUpEntry.rank} ${nextUpEntry.username} (${nextUpEntry.score})`;
        const suffix = document.createTextNode(` · +${diffTie} to tie, +${diffPass} to pass`);
        nextRankText.append(prefix, strongTarget, suffix);
        appendEntryActionButtons(nextRankActions, nextUpEntry);
        if (nextRankActions.childNodes.length > 0) {
          nextRankActions.classList.remove('hidden');
        }
        nextRankRow.classList.remove('hidden');
      } else {
        const coLeaders = rankedEntries.filter(e => e.score === myEntry.score && e.userId !== userId);
        if (coLeaders.length > 0) {
          nextRankText.textContent = `🏆 Tied #1 with ${coLeaders[0].username} · Score ${myEntry.score + 1} (+1) for sole #1`;
          appendEntryActionButtons(nextRankActions, coLeaders[0]);
          if (nextRankActions.childNodes.length > 0) {
            nextRankActions.classList.remove('hidden');
          }
        } else {
          const runnerUp = rankedEntries.find(e => e.score < myEntry.score);
          nextRankText.textContent = runnerUp
            ? `🏆 #1 Leader (+${myEntry.score - runnerUp.score} ahead of #${runnerUp.rank} ${runnerUp.username})`
            : '🏆 #1 Leader';
        }
        nextRankRow.classList.remove('hidden');
      }
    } else if (totalEntries > 0) {
      const entryToCatch = rankedEntries[totalEntries - 1];
      nextRankText.textContent = `↑ Score 1+ to rank · ${entryToCatch.score} ties #${entryToCatch.rank} ${entryToCatch.username}`;
      appendEntryActionButtons(nextRankActions, entryToCatch);
      if (nextRankActions.childNodes.length > 0) {
        nextRankActions.classList.remove('hidden');
      }
      nextRankRow.classList.remove('hidden');
    } else {
      nextRankRow.classList.add('hidden');
    }
  }

  if (totalEntries === 0) {
    leaderboardList.innerHTML = '<li class="empty-row">No scores yet. Be the first!</li>';
    if (leaderboardPinnedMe) leaderboardPinnedMe.classList.add('hidden');
    if (leaderboardPagination) leaderboardPagination.classList.add('hidden');
    return;
  }

  const startIdx = (leaderboardPage - 1) * LEADERBOARD_PAGE_SIZE;
  const pageEntries = rankedEntries.slice(startIdx, startIdx + LEADERBOARD_PAGE_SIZE);

  leaderboardList.innerHTML = '';
  pageEntries.forEach((entry) => {
    leaderboardList.appendChild(createLeaderboardRowEl(entry));
  });

  // Pinned current user row when viewing a page that doesn't contain them
  if (leaderboardPinnedMe) {
    leaderboardPinnedMe.innerHTML = '';
    if (myEntry && myPage !== leaderboardPage) {
      const sep = document.createElement('div');
      sep.className = 'leaderboard-pinned-sep';
      sep.textContent = '⋯';
      const pinnedRow = createLeaderboardRowEl(myEntry, `Page ${myPage}`);
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
  if (leaderboardPagination) {
    leaderboardPagination.innerHTML = '';
    if (totalPages > 1) {
      const navGroup = document.createElement('div');
      navGroup.className = 'page-nav-group';

      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'page-btn';
      prevBtn.textContent = '‹';
      prevBtn.title = 'Previous page';
      prevBtn.setAttribute('aria-label', 'Previous page');
      prevBtn.disabled = leaderboardPage <= 1;
      prevBtn.addEventListener('click', () => {
        if (leaderboardPage > 1) {
          leaderboardPage -= 1;
          renderLeaderboard({ skipOverview: true });
        }
      });
      navGroup.appendChild(prevBtn);

      const pageTokens = getPageButtonNumbers(leaderboardPage, totalPages);
      pageTokens.forEach((token) => {
        if (token === '...') {
          const dots = document.createElement('span');
          dots.className = 'page-ellipsis';
          dots.textContent = '…';
          navGroup.appendChild(dots);
        } else {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'page-btn' + (token === leaderboardPage ? ' active' : '');
          btn.textContent = String(token);
          btn.setAttribute('aria-label', `Page ${token}`);
          if (token === leaderboardPage) {
            btn.setAttribute('aria-current', 'page');
          }
          btn.addEventListener('click', () => {
            leaderboardPage = token;
            renderLeaderboard({ skipOverview: true });
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
      nextBtn.disabled = leaderboardPage >= totalPages;
      nextBtn.addEventListener('click', () => {
        if (leaderboardPage < totalPages) {
          leaderboardPage += 1;
          renderLeaderboard({ skipOverview: true });
        }
      });
      navGroup.appendChild(nextBtn);

      leaderboardPagination.appendChild(navGroup);

      if (myEntry && myPage !== leaderboardPage) {
        const myPageBtn = document.createElement('button');
        myPageBtn.type = 'button';
        myPageBtn.className = 'page-btn';
        myPageBtn.textContent = `🎯 My Rank (P${myPage})`;
        myPageBtn.addEventListener('click', () => {
          leaderboardPage = myPage;
          renderLeaderboard({ skipOverview: true });
        });
        leaderboardPagination.appendChild(myPageBtn);
      }

      leaderboardPagination.classList.remove('hidden');
    } else {
      leaderboardPagination.classList.add('hidden');
    }
  }

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
  const cfgIds = Object.keys(leaderboardsMap);
  for (let i = 0; i < cfgIds.length; i++) {
    const board = leaderboardsMap[cfgIds[i]];
    if (board && board[targetUserId] && board[targetUserId].username) {
      return board[targetUserId].username;
    }
  }
  return fallback || 'Player';
}

function openUserPage(targetUserId, fallbackName = '') {
  if (!targetUserId || !userView) return;
  viewedUserId = targetUserId;
  viewedUsername = resolveUsernameForUserId(targetUserId, fallbackName);
  homeView.classList.remove('active');
  gameView.classList.remove('active');
  userView.classList.add('active');
  renderUserPage();
}
