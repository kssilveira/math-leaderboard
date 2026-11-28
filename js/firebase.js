// --- Firebase Realtime Database Sync, Protected Writes & Replay Fetching ---

async function refreshSingleConfigLeaderboard(configId, force = false) {
  if (!configId) return;
  const lastAt = Math.max(lastFullSyncAt, configSyncTimestamps.get(configId) || 0);
  if (!force && Date.now() - lastAt < CONFIG_REFRESH_TTL_MS) return;

  try {
    const res = await fetch(`${FIREBASE_DB_URL}/leaderboards/${encodeURIComponent(configId)}.json`);
    if (!res.ok) return;
    const boardData = await res.json();
    configSyncTimestamps.set(configId, Date.now());
    if (boardData && typeof boardData === 'object') {
      leaderboardsMap[configId] = boardData;
    } else {
      delete leaderboardsMap[configId];
    }
    invalidateRankedLeaderboardCache(configId);
    if (activeConfigId === configId) {
      renderConfigsUI();
      renderLeaderboard();
    }
  } catch (_) {}
}

function isPlausibleLeaderboardSession(score, sessionData) {
  if (typeof score !== 'number' || score <= 0 || score > MAX_VALID_SCORE) return false;
  if (!sessionData) return true;
  const qs = Array.isArray(sessionData.questions)
    ? sessionData.questions
    : (Array.isArray(sessionData.q) ? sessionData.q : []);
  if (qs.length > 240) return false;
  if (qs.length >= 5) {
    const totalMs = qs.reduce((sum, item) => {
      const dur = Array.isArray(item) ? Number(item[4]) : Number(item && item.durationMs);
      return sum + (dur || 0);
    }, 0);
    if (totalMs / qs.length < MIN_AVG_QUESTION_MS) return false;
  }
  return true;
}

async function ensureConfigPublishedInFirebase(configId) {
  const cfg = getConfigById(configId);
  if (!cfg || isQuizConfig(cfg) || knownCloudConfigIds.has(cfg.id)) return;
  const mathPayload = {
    id: cfg.id,
    ops: cfg.ops,
    min1: cfg.min1,
    max1: cfg.max1,
    min2: cfg.min2,
    max2: cfg.max2,
    min3: cfg.min3,
    max3: cfg.max3
  };
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/configs/${encodeURIComponent(cfg.id)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mathPayload)
    });
    if (res && res.ok) {
      knownCloudConfigIds.add(cfg.id);
    }
  } catch (_) {}
}

async function syncFromFirebase() {
  try {
    const initialParams = new URLSearchParams(window.location.search);
    const urlReplayParam = initialParams.get('replay');
    const urlUserParam = initialParams.get('user');
    const urlConfigParam = initialParams.get('config');

    if (
      urlReplayParam &&
      !urlUserParam &&
      (!urlConfigParam || getConfigById(resolveConfigIdAlias(urlConfigParam)))
    ) {
      checkUrlReplayOnLoad();
    }

    const configsPromise = fetch(`${FIREBASE_DB_URL}/configs.json`);
    const leaderboardsPromise = fetch(`${FIREBASE_DB_URL}/leaderboards.json`);
    let fullSyncApplied = false;

    if (!urlUserParam && !urlReplayParam && activeConfigId) {
      const initialConfigId = activeConfigId;
      fetch(`${FIREBASE_DB_URL}/leaderboards/${encodeURIComponent(initialConfigId)}.json`)
        .then((res) => (res && res.ok ? res.json() : null))
        .then((boardData) => {
          if (fullSyncApplied || !boardData || typeof boardData !== 'object') return;
          leaderboardsMap[initialConfigId] = boardData;
          invalidateRankedLeaderboardCache(initialConfigId);
          configSyncTimestamps.set(initialConfigId, Date.now());
          if (activeConfigId === initialConfigId && !isPlaying && !isReplaying) {
            renderLeaderboard({ skipOverview: true });
          }
        })
        .catch(() => {});
    }

    const [configsRes, leaderboardsRes] = await Promise.all([configsPromise, leaderboardsPromise]);

    const cloudConfigs = configsRes.ok ? await configsRes.json() : null;
    const cloudLeaderboards = leaderboardsRes.ok ? await leaderboardsRes.json() : null;

    const mergedLeaderboards = {};
    if (cloudLeaderboards && typeof cloudLeaderboards === 'object') {
      Object.entries(cloudLeaderboards).forEach(([rawCfgId, boardObj]) => {
        if (!boardObj || typeof boardObj !== 'object') return;
        const cfgId = resolveConfigIdAlias(rawCfgId);
        if (!mergedLeaderboards[cfgId]) mergedLeaderboards[cfgId] = {};
        const targetBoard = mergedLeaderboards[cfgId];
        Object.entries(boardObj).forEach(([uId, entry]) => {
          if (!entry || typeof entry !== 'object') return;
          const existing = targetBoard[uId];
          if (
            !existing ||
            (typeof entry.score === 'number' &&
              (typeof existing.score !== 'number' ||
                entry.score > existing.score ||
                (entry.score === existing.score && (entry.updatedAt || Infinity) < (existing.updatedAt || Infinity))))
          ) {
            targetBoard[uId] = entry;
          }
        });
      });
    }

    // Preserve any optimistic local-user entries written while full sync was in flight
    const localUserIds = new Set(users.map((u) => u && u.userId).filter(Boolean));
    Object.entries(leaderboardsMap).forEach(([cfgId, boardObj]) => {
      if (!boardObj || typeof boardObj !== 'object') return;
      Object.entries(boardObj).forEach(([uId, entry]) => {
        if (!localUserIds.has(uId) || !entry || typeof entry.score !== 'number') return;
        if (!mergedLeaderboards[cfgId]) mergedLeaderboards[cfgId] = {};
        const existing = mergedLeaderboards[cfgId][uId];
        if (!existing || typeof existing.score !== 'number' || entry.score > existing.score) {
          mergedLeaderboards[cfgId][uId] = entry;
        }
      });
    });

    fullSyncApplied = true;
    leaderboardsMap = mergedLeaderboards;
    invalidateRankedLeaderboardCache();
    lastFullSyncAt = Date.now();
    configSyncTimestamps.clear();

    const defaultCfg = createDefaultConfig();
    const byId = new Map();
    byId.set(defaultCfg.id, defaultCfg);

    getBuiltinQuizConfigs().forEach((qCfg) => {
      byId.set(qCfg.id, qCfg);
    });

    const normalizeCfgObj = (c) => {
      if (!c || !Array.isArray(c.ops)) return null;
      const normalized = {
        category: 'math',
        type: 'math',
        ops: ALL_OPS.filter(op => c.ops.includes(op)),
        min1: clampConfigBound(c.min1),
        max1: clampConfigBound(c.max1),
        min2: clampConfigBound(c.min2),
        max2: clampConfigBound(c.max2),
        min3: clampConfigBound(c.min3),
        max3: clampConfigBound(c.max3)
      };
      if (getValidSamplers(normalized).length === 0) return null;
      normalized.id = getConfigId(normalized);
      return normalized;
    };

    getLocalConfigs().forEach((c) => {
      const norm = normalizeCfgObj(c);
      if (norm) byId.set(norm.id, norm);
    });

    if (cloudConfigs && typeof cloudConfigs === 'object') {
      Object.entries(cloudConfigs).forEach(([key, c]) => {
        knownCloudConfigIds.add(key);
        const normalized = normalizeCfgObj(c);
        if (normalized) {
          knownCloudConfigIds.add(normalized.id);
          byId.set(normalized.id, normalized);

          // Migrate any legacy non-canonical config key in Firebase
          if (key !== normalized.id) {
            fetch(`${FIREBASE_DB_URL}/configs/${encodeURIComponent(key)}.json`, { method: 'DELETE' }).catch(() => {});
            fetch(`${FIREBASE_DB_URL}/configs/${encodeURIComponent(normalized.id)}.json`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: normalized.id,
                ops: normalized.ops,
                min1: normalized.min1,
                max1: normalized.max1,
                min2: normalized.min2,
                max2: normalized.max2,
                min3: normalized.min3,
                max3: normalized.max3
              })
            }).catch(() => {});
          }
        }
      });
    }

    // Ensure the default config always exists in Firebase under its canonical key
    if (!cloudConfigs || !cloudConfigs[defaultCfg.id]) {
      ensureConfigPublishedInFirebase(defaultCfg.id);
    }

    configs = Array.from(byId.values());
    rebuildConfigsIndex();
    sortConfigsByLeaderboardSize();

    const activeUrlConfigParam = !hasHandledInitialUrlReplay ? urlConfigParam : null;
    const savedConfigId = resolveConfigIdAlias(
      activeUrlConfigParam ||
      localStorage.getItem(STORAGE_KEYS.activeConfigId) ||
      (isPlaying || replaySessionData ? activeConfigId : '')
    );
    const localIds = new Set(getLocalConfigs().map(c => c.id));
    let mathCount = 0;
    configs = configs.filter((c) => {
      if (isQuizConfig(c)) return true;
      const keep =
        c.id === defaultCfg.id ||
        c.id === savedConfigId ||
        localIds.has(c.id) ||
        (getLeaderboardSize(c.id) > 0 && mathCount < MAX_GLOBAL_CONFIGS);
      if (keep) mathCount += 1;
      return keep;
    });
    sortConfigsByLeaderboardSize();
    rebuildConfigsIndex();

    const activeCfg = (isPlaying || isReplaying)
      ? (configs.find(c => c.id === activeConfigId) || configs[0])
      : (configs.find(c => c.id === savedConfigId) || configs.find(c => !isMiniConfig(c)) || configs[0]);
    activeConfigId = activeCfg.id;
    activeCategory = getConfigCategory(activeCfg);

    if (!isPlaying && !isReplaying) {
      localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
      localStorage.setItem(STORAGE_KEYS.activeCategory, activeCategory);
      renderConfigsUI();
      renderLeaderboard();
      renderReview();
      preloadStudyConfigInBackground(activeConfigId);
    }
    checkUrlReplayOnLoad();

    backfillLocalBestToLeaderboard()
      .then((didBackfill) => {
        if (!didBackfill) return;
        sortConfigsByLeaderboardSize();
        rebuildConfigsIndex();
        if (!isPlaying && !isReplaying) {
          renderConfigsUI();
          renderLeaderboard();
        }
      })
      .catch(() => {});
  } catch (err) {
    console.error('Failed to sync with Firebase:', err);
  }
}

function markUserClaimed(uId) {
  if (!uId) return;
  claimedUserIds.add(uId);
  try {
    sessionStorage.setItem('math_claimed_users_v1', JSON.stringify(Array.from(claimedUserIds)));
  } catch (_) {}
}

function entryHasReplay(entry) {
  return Boolean(
    entry &&
    (entry.hasReplay ||
      (Array.isArray(entry.questions) && entry.questions.length > 0) ||
      (Array.isArray(entry.q) && entry.q.length > 0))
  );
}

async function writeProtectedLeaderboardEntry(cfgId, uId, slimRecord, normalizedQuestions = null) {
  const token = getUserSecret(uId);
  const compactQ = Array.isArray(normalizedQuestions) && normalizedQuestions.length > 0
    ? encodeCompactQuestionsList(normalizedQuestions, cfgId)
    : [];
  const recordToWrite = { ...slimRecord };
  delete recordToWrite.questions;
  delete recordToWrite.q;
  if (compactQ.length > 0) {
    recordToWrite.hasReplay = true;
    replayCacheMap.set(`${cfgId}__${uId}`, compactQ);
  }

  if (compactQ.length > 0 && firebaseReplaysPathSupported) {
    const splitPayload = {
      [`userSecrets/${uId}`]: {
        token,
        proof: `${token}_${recordToWrite.updatedAt}`
      },
      [`leaderboards/${cfgId}/${uId}`]: recordToWrite,
      [`replays/${cfgId}/${uId}`]: {
        updatedAt: recordToWrite.updatedAt,
        q: compactQ
      }
    };
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(splitPayload)
      });
      if (res && res.ok) {
        markUserClaimed(uId);
        return { ok: true, mode: 'split', record: recordToWrite };
      }
      if (res && (res.status === 401 || res.status === 403)) {
        firebaseReplaysPathSupported = false;
      } else {
        return { ok: false, mode: 'split', record: recordToWrite };
      }
    } catch (_) {
      return { ok: false, mode: 'split', record: recordToWrite };
    }
  }

  const fallbackRecord = compactQ.length > 0
    ? { ...recordToWrite, questions: normalizedQuestions }
    : recordToWrite;
  const fallbackPayload = {
    [`userSecrets/${uId}`]: {
      token,
      proof: `${token}_${fallbackRecord.updatedAt}`
    },
    [`leaderboards/${cfgId}/${uId}`]: fallbackRecord
  };
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fallbackPayload)
    });
    if (res && res.ok) {
      markUserClaimed(uId);
      return { ok: true, mode: 'inline', record: fallbackRecord };
    }
  } catch (_) {}
  return { ok: false, mode: 'inline', record: fallbackRecord };
}

async function claimLocalUsersInFirebase() {
  const unclaimed = users.filter(u => u && u.userId && !claimedUserIds.has(u.userId));
  if (unclaimed.length === 0) return;
  await Promise.all(
    unclaimed.map(async (u) => {
      const token = getUserSecret(u.userId);
      try {
        const res = await fetch(`${FIREBASE_DB_URL}/userSecrets/${encodeURIComponent(u.userId)}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            proof: `${token}_claim_${Date.now()}`
          })
        });
        if (res && res.ok) {
          markUserClaimed(u.userId);
        }
      } catch (_) {}
    })
  );
}

async function backfillLocalBestToLeaderboard() {
  if (hasRunInitialBackfill) return false;
  hasRunInitialBackfill = true;

  await claimLocalUsersInFirebase();
  const historyMap = getGameHistoryMap();
  const uploadsByUser = new Map();

  Object.keys(historyMap).forEach((compKey) => {
    const sepIdx = compKey.indexOf('__');
    if (sepIdx <= 0) return;
    const uId = compKey.slice(0, sepIdx);
    const cfgId = compKey.slice(sepIdx + 2);
    if (!uId || !cfgId) return;

    const bestLocal = getBestLocalSession(uId, cfgId);
    if (!bestLocal || !isPlausibleLeaderboardSession(bestLocal.score, bestLocal)) return;

    const existing = leaderboardsMap[cfgId] && leaderboardsMap[cfgId][uId];
    const hasExisting = existing && typeof existing.score === 'number';
    const existingHasReplay = hasExisting && entryHasReplay(existing);
    const localHasQuestions = sessionHasQuestions(bestLocal);

    const needsUpload =
      !hasExisting ||
      bestLocal.score > existing.score ||
      (!existingHasReplay && localHasQuestions);

    if (!needsUpload) return;

    const userObj = users.find(u => u.userId === uId);
    const resolvedUsername = (userObj && userObj.username) || (existing && existing.username) || username || 'Player';
    const bestScore = hasExisting ? Math.max(existing.score, bestLocal.score) : bestLocal.score;
    const rawQuestions = localHasQuestions ? getSessionQuestions(bestLocal, cfgId) : [];
    const normalizedQuestions = rawQuestions.map(q => normalizeQuestionRecord(q, cfgId));
    const baseUpdatedAt = (hasExisting && bestLocal.score <= existing.score && existing.updatedAt)
      ? existing.updatedAt + 1
      : (bestLocal.playedAt || Date.now());

    const slimRecord = {
      userId: uId,
      username: resolvedUsername,
      score: bestScore,
      right: typeof bestLocal.right === 'number' ? bestLocal.right : 0,
      wrong: typeof bestLocal.wrong === 'number' ? bestLocal.wrong : 0,
      durationMs: typeof bestLocal.durationMs === 'number' ? bestLocal.durationMs : GAME_DURATION_SECONDS * 1000,
      updatedAt: baseUpdatedAt
    };
    if (normalizedQuestions.length > 0) {
      slimRecord.hasReplay = true;
    }

    if (!leaderboardsMap[cfgId]) {
      leaderboardsMap[cfgId] = {};
    }
    leaderboardsMap[cfgId][uId] = slimRecord;
    invalidateRankedLeaderboardCache(cfgId);

    if (!uploadsByUser.has(uId)) {
      uploadsByUser.set(uId, []);
    }
    uploadsByUser.get(uId).push(async () => {
      await ensureConfigPublishedInFirebase(cfgId);
      const res = await writeProtectedLeaderboardEntry(cfgId, uId, slimRecord, normalizedQuestions);
      if (res && res.record) {
        leaderboardsMap[cfgId][uId] = res.record;
        invalidateRankedLeaderboardCache(cfgId);
      }
    });
  });

  if (uploadsByUser.size === 0) return false;
  await Promise.all(
    Array.from(uploadsByUser.values()).map(async (userTasks) => {
      for (const runUpload of userTasks) {
        await runUpload();
      }
    })
  );
  return true;
}

async function submitScoreToLeaderboard(score, sessionData) {
  if (!isPlausibleLeaderboardSession(score, sessionData)) {
    return;
  }
  const configId = activeConfigId;
  const cachedEntry = leaderboardsMap[configId] && leaderboardsMap[configId][userId];
  const cachedHasReplay = cachedEntry && entryHasReplay(cachedEntry);

  // Fast path: score didn't beat cached best and replay is already stored remotely
  if (
    cachedEntry &&
    typeof cachedEntry.score === 'number' &&
    score <= cachedEntry.score &&
    cachedHasReplay
  ) {
    lastResult.classList.remove('new-high-score');
    lastScoreLabel.textContent = 'Last Score';
    refreshSingleConfigLeaderboard(configId, true);
    return;
  }

  // Optimistic local update for immediate UI feedback
  const sessionQuestions = getSessionQuestions(sessionData, configId);
  const isOptimisticHigh = !cachedEntry || typeof cachedEntry.score !== 'number' || score > cachedEntry.score;
  const optimisticQuestions = sessionQuestions.map(q => normalizeQuestionRecord(q, configId));
  if (isOptimisticHigh || !cachedHasReplay) {
    const optimisticRecord = {
      userId,
      username,
      score: isOptimisticHigh ? score : cachedEntry.score,
      right: isOptimisticHigh ? rightCount : (cachedEntry.right ?? rightCount),
      wrong: isOptimisticHigh ? wrongCount : (cachedEntry.wrong ?? wrongCount),
      durationMs: isOptimisticHigh
        ? (sessionData && typeof sessionData.durationMs === 'number' ? sessionData.durationMs : GAME_DURATION_SECONDS * 1000)
        : (cachedEntry.durationMs || GAME_DURATION_SECONDS * 1000),
      updatedAt: Date.now()
    };
    if (optimisticQuestions.length > 0) {
      optimisticRecord.hasReplay = true;
      replayCacheMap.set(`${configId}__${userId}`, encodeCompactQuestionsList(optimisticQuestions, configId));
    }
    if (!leaderboardsMap[configId]) leaderboardsMap[configId] = {};
    leaderboardsMap[configId][userId] = optimisticRecord;
    invalidateRankedLeaderboardCache(configId);
    renderConfigsUI();
    renderLeaderboard();
  }

  const userUrl = `${FIREBASE_DB_URL}/leaderboards/${encodeURIComponent(configId)}/${encodeURIComponent(userId)}.json`;
  const [, existingRes] = await Promise.all([
    ensureConfigPublishedInFirebase(configId),
    fetch(userUrl).catch(() => null)
  ]);

  const existing = existingRes && existingRes.ok ? await existingRes.json() : null;
  const hasExisting = existing && typeof existing.score === 'number';
  const isNewHighScore = !hasExisting || score > existing.score;
  const bestScore = hasExisting ? Math.max(existing.score, score) : score;

  lastResult.classList.toggle('new-high-score', isNewHighScore);
  lastScoreLabel.textContent = isNewHighScore ? '★ New High Score!' : 'Last Score';

  const existingHasReplay = hasExisting && entryHasReplay(existing);
  const useSessionQuestions = isNewHighScore || (score === existing.score && !existingHasReplay);
  const bestLocal = useSessionQuestions ? null : getBestLocalSession(userId, configId);
  const sourceSession = useSessionQuestions
    ? sessionData
    : (existingHasReplay ? existing : (bestLocal || sessionData));

  const sourceQuestions = getSessionQuestions(sourceSession, configId);
  const normalizedQuestions = sourceQuestions.map(q => normalizeQuestionRecord(q, configId));

  const nextUpdatedAt = isNewHighScore
    ? Date.now()
    : ((existing && existing.updatedAt ? existing.updatedAt : Date.now()) + 1);

  const slimRecord = {
    userId,
    username,
    score: bestScore,
    right: sourceSession && typeof sourceSession.right === 'number' ? sourceSession.right : rightCount,
    wrong: sourceSession && typeof sourceSession.wrong === 'number' ? sourceSession.wrong : wrongCount,
    durationMs: sourceSession && typeof sourceSession.durationMs === 'number'
      ? sourceSession.durationMs
      : GAME_DURATION_SECONDS * 1000,
    updatedAt: nextUpdatedAt
  };
  if (normalizedQuestions.length > 0 || existingHasReplay) {
    slimRecord.hasReplay = true;
  }

  if (isNewHighScore || useSessionQuestions) {
    const writeRes = await writeProtectedLeaderboardEntry(configId, userId, slimRecord, normalizedQuestions);
    if (!leaderboardsMap[configId]) leaderboardsMap[configId] = {};
    leaderboardsMap[configId][userId] = (writeRes && writeRes.record) ? writeRes.record : slimRecord;
    invalidateRankedLeaderboardCache(configId);
  }

  await refreshSingleConfigLeaderboard(configId, true);
}

async function updateUsernameInFirebase(targetUserId, newUsername) {
  const configIds = Object.keys(leaderboardsMap);
  const affected = [];
  let maxUpdatedAt = Date.now() - 1;
  for (const cfgId of configIds) {
    const existing = leaderboardsMap[cfgId] && leaderboardsMap[cfgId][targetUserId];
    if (existing) {
      affected.push({ cfgId, existing });
      if (typeof existing.updatedAt === 'number' && existing.updatedAt > maxUpdatedAt) {
        maxUpdatedAt = existing.updatedAt;
      }
    }
  }
  if (affected.length === 0) return;

  const nextUpdatedAt = maxUpdatedAt + 1;
  const token = getUserSecret(targetUserId);
  const patchBody = {
    [`userSecrets/${targetUserId}`]: {
      token,
      proof: `${token}_${nextUpdatedAt}`
    }
  };

  affected.forEach(({ cfgId, existing }) => {
    const updatedRecord = {
      ...existing,
      userId: targetUserId,
      username: newUsername,
      updatedAt: nextUpdatedAt
    };
    leaderboardsMap[cfgId][targetUserId] = updatedRecord;
    invalidateRankedLeaderboardCache(cfgId);
    patchBody[`leaderboards/${cfgId}/${targetUserId}`] = updatedRecord;
  });

  renderLeaderboard();

  try {
    const res = await fetch(`${FIREBASE_DB_URL}/.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchBody)
    });
    if (res && res.ok) {
      markUserClaimed(targetUserId);
    }
  } catch (_) {}
}

async function deleteUserFromFirebase(targetUserId, knownSecret) {
  const configIds = Object.keys(leaderboardsMap);
  const token = knownSecret || getUserSecret(targetUserId);
  const deleteProof = `${token}_delete_${Date.now()}`;
  const patchBody = {
    [`userSecrets/${targetUserId}`]: {
      token,
      proof: deleteProof
    }
  };
  let hasEntries = false;
  configIds.forEach((cfgId) => {
    if (leaderboardsMap[cfgId] && leaderboardsMap[cfgId][targetUserId]) {
      delete leaderboardsMap[cfgId][targetUserId];
      invalidateRankedLeaderboardCache(cfgId);
      replayCacheMap.delete(`${cfgId}__${targetUserId}`);
      patchBody[`leaderboards/${cfgId}/${targetUserId}`] = null;
      if (firebaseReplaysPathSupported) {
        patchBody[`replays/${cfgId}/${targetUserId}`] = null;
      }
      hasEntries = true;
    }
  });
  renderConfigsUI();
  renderLeaderboard();
  if (hasEntries) {
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody)
      });
      if (res && (res.status === 401 || res.status === 403) && firebaseReplaysPathSupported) {
        firebaseReplaysPathSupported = false;
        Object.keys(patchBody).forEach((k) => {
          if (k.startsWith('replays/')) delete patchBody[k];
        });
        await fetch(`${FIREBASE_DB_URL}/.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody)
        }).catch(() => {});
      }
    } catch (_) {}
  }
}

async function fetchRemoteReplayQuestions(cfgId, targetUserId) {
  const cacheKey = `${cfgId}__${targetUserId}`;
  if (replayCacheMap.has(cacheKey)) {
    const cached = replayCacheMap.get(cacheKey);
    if (Array.isArray(cached) && cached.length > 0) {
      return Array.isArray(cached[0])
        ? decodeCompactQuestionsList(cached, cfgId)
        : cached.map(q => normalizeQuestionRecord(q, cfgId));
    }
    return [];
  }

  try {
    const res = await fetch(
      `${FIREBASE_DB_URL}/replays/${encodeURIComponent(cfgId)}/${encodeURIComponent(targetUserId)}.json`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || typeof data !== 'object') return [];
    if (Array.isArray(data.q) && data.q.length > 0) {
      replayCacheMap.set(cacheKey, data.q);
      return decodeCompactQuestionsList(data.q, cfgId);
    }
    if (Array.isArray(data.questions) && data.questions.length > 0) {
      replayCacheMap.set(cacheKey, data.questions);
      return data.questions.map(q => normalizeQuestionRecord(q, cfgId));
    }
  } catch (_) {}
  return [];
}

async function resolveEntryReplaySession(entry, targetConfigId = activeConfigId) {
  if (!entry) return null;
  if (typeof ensureStudyConfigLoaded === "function") {
    await ensureStudyConfigLoaded(targetConfigId);
  }
  let questions = null;
  if (Array.isArray(entry.questions) && entry.questions.length > 0) {
    questions = entry.questions.map(q => normalizeQuestionRecord(q, targetConfigId));
  } else if (Array.isArray(entry.q) && entry.q.length > 0) {
    questions = decodeCompactQuestionsList(entry.q, targetConfigId);
  } else if (entry.hasReplay && entry.userId) {
    questions = await fetchRemoteReplayQuestions(targetConfigId, entry.userId);
  }
  if (!questions || questions.length === 0) return null;
  return {
    username: entry.username,
    configId: targetConfigId,
    score: entry.score,
    right: entry.right,
    wrong: entry.wrong,
    durationMs: entry.durationMs || GAME_DURATION_SECONDS * 1000,
    questions
  };
}

async function resolveMyBestReplaySession() {
  if (typeof ensureStudyConfigLoaded === "function") {
    await ensureStudyConfigLoaded(activeConfigId);
  }
  const boardObj = leaderboardsMap[activeConfigId] || {};
  const myEntry = boardObj[userId];
  const bestLocal = getBestLocalSession(userId, activeConfigId);

  if (myEntry) {
    if (
      (Array.isArray(myEntry.questions) && myEntry.questions.length > 0) ||
      (Array.isArray(myEntry.q) && myEntry.q.length > 0)
    ) {
      return await resolveEntryReplaySession(myEntry, activeConfigId);
    }
    if (
      bestLocal &&
      typeof bestLocal.score === 'number' &&
      bestLocal.score >= myEntry.score &&
      sessionHasQuestions(bestLocal)
    ) {
      return {
        username: myEntry.username || username,
        configId: activeConfigId,
        score: bestLocal.score,
        right: bestLocal.right,
        wrong: bestLocal.wrong,
        durationMs: bestLocal.durationMs || GAME_DURATION_SECONDS * 1000,
        questions: getSessionQuestions(bestLocal, activeConfigId).map(q => normalizeQuestionRecord(q, activeConfigId))
      };
    }
    if (myEntry.hasReplay) {
      const remote = await resolveEntryReplaySession(myEntry, activeConfigId);
      if (remote) return remote;
    }
  }

  if (bestLocal && sessionHasQuestions(bestLocal)) {
    return {
      username,
      configId: activeConfigId,
      score: bestLocal.score,
      right: bestLocal.right,
      wrong: bestLocal.wrong,
      durationMs: bestLocal.durationMs || GAME_DURATION_SECONDS * 1000,
      questions: getSessionQuestions(bestLocal, activeConfigId).map(q => normalizeQuestionRecord(q, activeConfigId))
    };
  }
  return null;
}
