// --- Local Storage History, Compaction, Question Stats & Migrations ---

function getHistoryBucketKey(targetUserId, targetConfigId, mode = '1min') {
  return mode === 'all' ? `${targetUserId}__${targetConfigId}__all` : `${targetUserId}__${targetConfigId}`;
}

function getBestLocalSession(targetUserId, targetConfigId, mode = (typeof activeGameMode !== 'undefined' ? activeGameMode : '1min')) {
  const resolvedMode = mode === 'all' ? 'all' : '1min';
  const key = getHistoryBucketKey(targetUserId, targetConfigId, resolvedMode);
  if (bestLocalSessionCache.has(key)) {
    return bestLocalSessionCache.get(key);
  }
  const historyMap = getGameHistoryMap();
  const sessions = Array.isArray(historyMap[key]) ? historyMap[key] : [];
  const regular = resolvedMode === 'all'
    ? sessions.filter(s => s && !s.isPractice && s.completedAll !== false && typeof s.durationMs === 'number' && s.durationMs > 0)
    : sessions.filter(s => s && !s.isPractice && typeof s.score === 'number');
  if (regular.length === 0) {
    bestLocalSessionCache.set(key, null);
    return null;
  }

  let best = regular[0];
  for (let i = 1; i < regular.length; i++) {
    const s = regular[i];
    if (resolvedMode === 'all') {
      if (s.durationMs < best.durationMs) {
        best = s;
      } else if (s.durationMs === best.durationMs) {
        if (!sessionHasQuestions(best) && sessionHasQuestions(s)) {
          best = s;
        } else if (sessionHasQuestions(best) === sessionHasQuestions(s) && (s.wrong || 0) < (best.wrong || 0)) {
          best = s;
        }
      }
    } else if (s.score > best.score) {
      best = s;
    } else if (
      s.score === best.score &&
      !sessionHasQuestions(best) &&
      sessionHasQuestions(s)
    ) {
      best = s;
    }
  }
  bestLocalSessionCache.set(key, best);
  return best;
}

function sessionHasQuestions(session) {
  return Boolean(
    session &&
    ((Array.isArray(session.questions) && session.questions.length > 0) ||
      (Array.isArray(session.q) && session.q.length > 0))
  );
}

function getSessionQuestions(session, targetConfigId = activeConfigId) {
  if (!session) return [];
  const cfgId = targetConfigId || session.configId || activeConfigId;
  if (Array.isArray(session.questions) && session.questions.length > 0) {
    return session.questions;
  }
  if (Array.isArray(session.q) && session.q.length > 0) {
    return decodeCompactQuestionsList(session.q, cfgId);
  }
  return [];
}

function compactSessionForStorage(session) {
  if (!session || typeof session !== 'object') return session;
  const cfgId = session.configId || activeConfigId;
  const copy = { ...session };
  if (Array.isArray(copy.questions)) {
    copy.q = encodeCompactQuestionsList(copy.questions, cfgId);
    delete copy.questions;
  }
  if (copy.opponent && typeof copy.opponent === 'object' && Array.isArray(copy.opponent.questions)) {
    copy.opponent = {
      ...copy.opponent,
      q: encodeCompactQuestionsList(copy.opponent.questions, cfgId)
    };
    delete copy.opponent.questions;
  }
  return copy;
}

function getGameHistoryMap() {
  if (gameHistoryCache) return gameHistoryCache;
  const raw = localStorage.getItem(STORAGE_KEYS.gameHistory);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        gameHistoryCache = parsed;
        return gameHistoryCache;
      }
    } catch (_) {
      // Fall through
    }
  }
  gameHistoryCache = {};
  return gameHistoryCache;
}

function getQuestionStatsMap() {
  if (questionStatsCache) return questionStatsCache;
  const raw = localStorage.getItem(STORAGE_KEYS.questionStats);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        questionStatsCache = parsed;
        return questionStatsCache;
      }
    } catch (_) {
      // Fall through
    }
  }
  questionStatsCache = {};
  return questionStatsCache;
}

function stripRedundantQuizStatFields(statsMap) {
  Object.values(statsMap || {}).forEach((bucket) => {
    if (!bucket || typeof bucket !== 'object') return;
    Object.values(bucket).forEach((entry) => {
      if (entry && entry.op === '?') {
        delete entry.prompt;
        delete entry.expected;
        delete entry.distractor;
        delete entry.choices;
      }
    });
  });
}

function flushQuestionStatsToStorage(force = false) {
  if (!questionStatsCache || (!force && !questionStatsDirty)) return;
  try {
    localStorage.setItem(STORAGE_KEYS.questionStats, JSON.stringify(questionStatsCache));
    questionStatsDirty = false;
  } catch (_) {
    try {
      stripRedundantQuizStatFields(questionStatsCache);
      localStorage.setItem(STORAGE_KEYS.questionStats, JSON.stringify(questionStatsCache));
      questionStatsDirty = false;
    } catch (_) {}
  }
}

function compactAllLegacyHistoryEntries(map) {
  if (!map || typeof map !== 'object') return false;
  let changed = false;
  Object.keys(map).forEach((compKey) => {
    const list = map[compKey];
    if (!Array.isArray(list)) return;
    for (let i = 0; i < list.length; i++) {
      if (list[i] && Array.isArray(list[i].questions)) {
        list[i] = compactSessionForStorage(list[i]);
        changed = true;
      }
    }
  });
  return changed;
}

function trimHistoryMapBuckets(map, maxPerBucket) {
  Object.keys(map).forEach((compKey) => {
    const list = map[compKey];
    if (!Array.isArray(list) || list.length <= maxPerBucket) return;
    const isAllBucket = compKey.endsWith('__all');
    let bestIdx = -1;
    let bestVal = isAllBucket ? Infinity : -Infinity;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (!s || s.isPractice) continue;
      if (isAllBucket) {
        if (s.completedAll !== false && typeof s.durationMs === 'number' && s.durationMs > 0 && s.durationMs < bestVal) {
          bestVal = s.durationMs;
          bestIdx = i;
        }
      } else if (typeof s.score === 'number' && s.score > bestVal) {
        bestVal = s.score;
        bestIdx = i;
      }
    }
    const kept = list.slice(0, maxPerBucket);
    if (bestIdx >= maxPerBucket && list[bestIdx]) {
      kept[maxPerBucket - 1] = list[bestIdx];
    }
    map[compKey] = kept;
  });
}

function persistGameHistoryMap() {
  const map = getGameHistoryMap();
  try {
    localStorage.setItem(STORAGE_KEYS.gameHistory, JSON.stringify(map));
    return true;
  } catch (_) {
    compactAllLegacyHistoryEntries(map);
    try {
      localStorage.setItem(STORAGE_KEYS.gameHistory, JSON.stringify(map));
      return true;
    } catch (_) {
      for (const limit of [8, 3, 1]) {
        trimHistoryMapBuckets(map, limit);
        bestLocalSessionCache.clear();
        try {
          localStorage.setItem(STORAGE_KEYS.gameHistory, JSON.stringify(map));
          return true;
        } catch (_) {}
      }
    }
  }
  return false;
}

function ensureQuestionStatsBucket(targetUserId, targetConfigId) {
  const statsMap = getQuestionStatsMap();
  const compKey = `${targetUserId}__${targetConfigId}`;
  if (!statsMap[compKey] || typeof statsMap[compKey] !== 'object') {
    const targetCfg = getConfigById(targetConfigId);
    if (targetCfg && targetCfg.isLazyStudy && !targetCfg.studyDataLoaded) {
      return { statsMap, compKey, bucket: {} };
    }
    const bucket = {};
    const historyMap = getGameHistoryMap();
    const sessions = Array.isArray(historyMap[compKey]) ? [...historyMap[compKey]].reverse() : [];
    sessions.forEach((session) => {
      const sessionQs = getSessionQuestions(session, targetConfigId);
      if (sessionQs.length > 0) {
        sessionQs.forEach((q) => {
          if (q && Array.isArray(q.nums) && q.nums.length === 3) {
            const normQ = normalizeQuestionRecord(q, targetConfigId);
            const qKey = getQuestionKeyFromRecord(normQ);
            const existing = bucket[qKey];
            const prevCount = existing && typeof existing.count === 'number' && existing.count > 0 ? existing.count : 0;
            const prevTotalMs = existing && typeof existing.totalDurationMs === 'number'
              ? existing.totalDurationMs
              : (existing ? (existing.durationMs || 0) * prevCount : 0);
            const count = prevCount + 1;
            const totalDurationMs = prevTotalMs + (normQ.durationMs || 0);
            const avgDurationMs = Math.round(totalDurationMs / count);

            const entry = {
              key: qKey,
              nums: [...normQ.nums],
              op: normQ.op,
              missingIndex: normQ.missingIndex,
              answers: Array.isArray(normQ.answers) ? [...normQ.answers] : [],
              right: normQ.right || 0,
              wrong: normQ.wrong || 0,
              count,
              totalDurationMs,
              durationMs: avgDurationMs,
              updatedAt: session.playedAt || Date.now()
            };
            if (normQ.op !== '?') {
              entry.expected = normQ.expected;
            }
            bucket[qKey] = entry;
          }
        });
      }
    });
    statsMap[compKey] = bucket;
    questionStatsDirty = true;
    flushQuestionStatsToStorage();
  }
  return { statsMap, compKey, bucket: statsMap[compKey] };
}

function updateQuestionLastPerformance(targetUserId, targetConfigId, qRecord) {
  if (!qRecord || !Array.isArray(qRecord.nums) || qRecord.nums.length !== 3) return;
  const normQ = normalizeQuestionRecord(qRecord, targetConfigId);
  const { statsMap, compKey, bucket } = ensureQuestionStatsBucket(targetUserId, targetConfigId);
  const qKey = getQuestionKeyFromRecord(normQ);
  const existing = bucket[qKey];
  const prevCount = existing
    ? (typeof existing.count === 'number' && existing.count > 0 ? existing.count : 1)
    : 0;
  const prevTotalMs = existing
    ? (typeof existing.totalDurationMs === 'number' ? existing.totalDurationMs : (existing.durationMs || 0) * prevCount)
    : 0;
  const count = prevCount + 1;
  const totalDurationMs = prevTotalMs + (normQ.durationMs || 0);
  const avgDurationMs = Math.round(totalDurationMs / count);

  const entry = {
    key: qKey,
    nums: [...normQ.nums],
    op: normQ.op,
    missingIndex: normQ.missingIndex,
    answers: Array.isArray(normQ.answers) ? [...normQ.answers] : [],
    right: normQ.right || 0,
    wrong: normQ.wrong || 0,
    count,
    totalDurationMs,
    durationMs: avgDurationMs,
    updatedAt: Date.now()
  };
  if (normQ.op !== '?') {
    entry.expected = normQ.expected;
  }
  bucket[qKey] = entry;
  statsMap[compKey] = bucket;
  questionStatsDirty = true;
}

function getTrackedQuestions(targetUserId, targetConfigId) {
  const { bucket } = ensureQuestionStatsBucket(targetUserId, targetConfigId);
  return Object.values(bucket).sort((a, b) => {
    const aMistake = a.wrong > 0 || a.right === 0 ? 1 : 0;
    const bMistake = b.wrong > 0 || b.right === 0 ? 1 : 0;
    if (bMistake !== aMistake) return bMistake - aMistake;
    if (b.wrong !== a.wrong) return b.wrong - a.wrong;
    return (b.durationMs || 0) - (a.durationMs || 0);
  });
}

function saveGameReviewToStorage(gameSession) {
  const map = getGameHistoryMap();
  if (!hasCompactedLegacyHistory) {
    hasCompactedLegacyHistory = true;
    compactAllLegacyHistoryEntries(map);
  }
  const mode = gameSession && gameSession.mode === 'all' ? 'all' : '1min';
  const key = getHistoryBucketKey(gameSession.userId, gameSession.configId, mode);
  const historyList = Array.isArray(map[key]) ? map[key] : [];
  historyList.unshift(compactSessionForStorage(gameSession));
  map[key] = historyList.slice(0, 20); // Keep last 20 games per user+config+mode
  bestLocalSessionCache.delete(key);
  persistGameHistoryMap();
}

function deleteUserReviewFromStorage(targetUserId) {
  const map = getGameHistoryMap();
  Object.keys(map).forEach((key) => {
    if (key.startsWith(`${targetUserId}__`)) {
      delete map[key];
    }
  });
  bestLocalSessionCache.clear();
  persistGameHistoryMap();

  const statsMap = getQuestionStatsMap();
  Object.keys(statsMap).forEach((key) => {
    if (key.startsWith(`${targetUserId}__`)) {
      delete statsMap[key];
    }
  });
  questionStatsDirty = true;
  flushQuestionStatsToStorage(true);
}

function mergeQuestionStatEntry(existing, incoming) {
  if (!existing || typeof existing !== 'object') return incoming;
  if (!incoming || typeof incoming !== 'object') return existing;
  const existingLast = Number(existing.lastPlayed || existing.updatedAt || 0);
  const incomingLast = Number(incoming.lastPlayed || incoming.updatedAt || 0);
  const newer = incomingLast >= existingLast ? incoming : existing;
  const merged = { ...newer };
  ['right', 'wrong', 'attempts'].forEach((k) => {
    if (typeof existing[k] === 'number' || typeof incoming[k] === 'number') {
      merged[k] = (Number(existing[k]) || 0) + (Number(incoming[k]) || 0);
    }
  });
  return merged;
}

function migrateRenamedConfigsInLocalStorage() {
  try {
    const savedActive = localStorage.getItem(STORAGE_KEYS.activeConfigId);
    if (savedActive) {
      const canonical = resolveConfigIdAlias(savedActive);
      if (canonical !== savedActive) {
        localStorage.setItem(STORAGE_KEYS.activeConfigId, canonical);
      }
    }
  } catch (_) {}

  try {
    const rawLandscape = localStorage.getItem(STORAGE_KEYS.landscapeConfigs);
    if (rawLandscape) {
      const parsed = JSON.parse(rawLandscape);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        let changed = false;
        Object.keys(parsed).forEach((k) => {
          const canonical = resolveConfigIdAlias(k);
          if (canonical !== k) {
            parsed[canonical] = Boolean(parsed[canonical] || parsed[k]);
            delete parsed[k];
            changed = true;
          }
        });
        if (changed) {
          landscapeConfigsCache = parsed;
          localStorage.setItem(STORAGE_KEYS.landscapeConfigs, JSON.stringify(parsed));
        }
      }
    }
  } catch (_) {}

  try {
    const rawHistory = localStorage.getItem(STORAGE_KEYS.gameHistory);
    if (rawHistory) {
      const map = JSON.parse(rawHistory);
      if (map && typeof map === 'object' && !Array.isArray(map)) {
        let changed = false;
        Object.keys(map).forEach((compKey) => {
          const sep = compKey.indexOf('__');
          if (sep <= 0) return;
          const uId = compKey.slice(0, sep);
          const rest = compKey.slice(sep + 2);
          const isAllSuffix = rest.endsWith('__all');
          const cfgId = isAllSuffix ? rest.slice(0, -5) : rest;
          const canonical = resolveConfigIdAlias(cfgId);
          if (canonical === cfgId) return;

          const oldList = Array.isArray(map[compKey]) ? map[compKey] : [];
          const targetKey = getHistoryBucketKey(uId, canonical, isAllSuffix ? 'all' : '1min');
          const targetList = Array.isArray(map[targetKey]) ? [...map[targetKey]] : [];
          const seen = new Set(
            targetList.map((s) => `${s?.timestamp || s?.playedAt || 0}|${s?.score}|${s?.durationMs || 0}|${s?.right}|${s?.wrong}|${s?.isPractice ? 1 : 0}`)
          );
          oldList.forEach((s) => {
            if (!s || typeof s !== 'object') return;
            const normSession = { ...s, configId: canonical };
            const sig = `${normSession.timestamp || normSession.playedAt || 0}|${normSession.score}|${normSession.durationMs || 0}|${normSession.right}|${normSession.wrong}|${normSession.isPractice ? 1 : 0}`;
            if (!seen.has(sig)) {
              seen.add(sig);
              targetList.push(normSession);
            }
          });
          targetList.sort((a, b) => (Number(b?.timestamp || b?.playedAt) || 0) - (Number(a?.timestamp || a?.playedAt) || 0));
          map[targetKey] = targetList;
          delete map[compKey];
          changed = true;
        });
        if (changed) {
          gameHistoryCache = map;
          bestLocalSessionCache.clear();
          localStorage.setItem(STORAGE_KEYS.gameHistory, JSON.stringify(map));
        }
      }
    }
  } catch (_) {}

  try {
    const rawStats = localStorage.getItem(STORAGE_KEYS.questionStats);
    if (rawStats) {
      const statsMap = JSON.parse(rawStats);
      if (statsMap && typeof statsMap === 'object' && !Array.isArray(statsMap)) {
        let changed = false;
        Object.keys(statsMap).forEach((compKey) => {
          const sep = compKey.indexOf('__');
          if (sep <= 0) return;
          const uId = compKey.slice(0, sep);
          const cfgId = compKey.slice(sep + 2);
          const canonical = resolveConfigIdAlias(cfgId);
          if (canonical === cfgId) return;

          const oldBucket = statsMap[compKey];
          const targetKey = `${uId}__${canonical}`;
          const targetBucket =
            statsMap[targetKey] && typeof statsMap[targetKey] === 'object' ? { ...statsMap[targetKey] } : {};
          if (oldBucket && typeof oldBucket === 'object') {
            Object.entries(oldBucket).forEach(([qKey, entry]) => {
              targetBucket[qKey] = mergeQuestionStatEntry(targetBucket[qKey], entry);
            });
          }
          statsMap[targetKey] = targetBucket;
          delete statsMap[compKey];
          changed = true;
        });
        if (changed) {
          questionStatsCache = statsMap;
          questionStatsDirty = false;
          localStorage.setItem(STORAGE_KEYS.questionStats, JSON.stringify(statsMap));
        }
      }
    }
  } catch (_) {}
}
