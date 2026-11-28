// --- Replay & Share Feature ---

function encodeCompactQuestionsList(questionsList, targetConfigId = activeConfigId) {
  return (questionsList || []).map((rawQ) => {
    const q = normalizeQuestionRecord(rawQ, targetConfigId);
    const opIdx = Math.max(0, COMPACT_OPS.indexOf(q.op));
    const entry = [q.nums[0], opIdx, q.nums[1], q.missingIndex, q.durationMs || 0];
    if ((q.wrongAnswers && q.wrongAnswers.length > 0) || q.right === 0) {
      entry.push(q.wrongAnswers || []);
    }
    if (q.right === 0) {
      entry.push(0);
    }
    return entry;
  });
}

function decodeCompactQuestionsList(compactList, targetConfigId = activeConfigId) {
  const cfg = getConfigById(targetConfigId);
  return (compactList || []).map((item) => {
    const a = Number(item[0]) || 0;
    const op = COMPACT_OPS[item[1]] || (isQuizConfig(cfg) ? '?' : '+');
    const b = Number(item[2]) || 0;

    if (op === '?' || isQuizConfig(cfg)) {
      const choiceOrder = item[3] === 1 ? 1 : 0;
      const durationMs = typeof item[4] === 'number' ? item[4] : 800;
      const wrongAnswers = Array.isArray(item[5]) ? item[5].map(String) : [];
      const right = item[6] === 0 ? 0 : 1;
      const items = cfg && Array.isArray(cfg.items) ? cfg.items : [];
      const qIdx = items.length > 0 ? Math.max(0, Math.min(items.length - 1, a)) : a;
      const explicit = isExplicitDistractorConfig(cfg);
      const dList = explicit && items[qIdx] && Array.isArray(items[qIdx][2]) ? items[qIdx][2] : [];
      const dIdx = explicit
        ? (dList.length > 0 ? Math.max(0, Math.min(dList.length - 1, b)) : b)
        : (items.length > 0 ? Math.max(0, Math.min(items.length - 1, b)) : b);
      const expected = items[qIdx] ? items[qIdx][1] : '';
      const distractor = getQuizDistractorFromIndices(cfg, qIdx, dIdx);
      const note = getQuizItemNote(cfg, qIdx);
      const answers = [...wrongAnswers];
      if (right > 0 && expected) {
        answers.push(String(expected));
      }
      return normalizeQuestionRecord(
        {
          nums: [qIdx, dIdx, qIdx],
          op: '?',
          missingIndex: choiceOrder,
          expected,
          distractor,
          ...(note ? { note } : {}),
          answers,
          wrongAnswers,
          right,
          wrong: wrongAnswers.length,
          durationMs
        },
        targetConfigId
      );
    }

    let c = 0;
    if (op === '+') c = a + b;
    else if (op === '-') c = a - b;
    else if (op === '×') c = a * b;
    else if (op === '÷') c = b !== 0 ? Math.trunc(a / b) : 0;

    const nums = [a, b, c];
    const missingIndex = typeof item[3] === 'number' ? item[3] : 2;
    const expected = nums[missingIndex];
    const durationMs = typeof item[4] === 'number' ? item[4] : 800;
    const wrongAnswers = Array.isArray(item[5]) ? item[5].map(String) : [];
    const right = item[6] === 0 ? 0 : 1;
    const answers = [...wrongAnswers];
    if (right > 0) {
      answers.push(String(expected));
    }
    return normalizeQuestionRecord(
      {
        nums,
        op,
        missingIndex,
        expected,
        answers,
        wrongAnswers,
        right,
        wrong: wrongAnswers.length,
        durationMs
      },
      targetConfigId
    );
  });
}

function encodeReplayParam(session) {
  const cfgId = session.configId || activeConfigId;
  const isAll = session.mode === 'all';
  const payload = {
    u: session.username || 'Player',
    c: cfgId,
    ...(isAll ? { m: 'all', n: session.targetCount || session.right || 0 } : {}),
    s: typeof session.score === 'number' ? session.score : 0,
    r: typeof session.right === 'number' ? session.right : 0,
    w: typeof session.wrong === 'number' ? session.wrong : 0,
    d: typeof session.durationMs === 'number' ? session.durationMs : GAME_DURATION_SECONDS * 1000,
    q: encodeCompactQuestionsList(session.questions, cfgId)
  };

  if (session.opponent && Array.isArray(session.opponent.questions) && session.opponent.questions.length > 0) {
    payload.o = {
      u: session.opponent.username || 'Opponent',
      ...(isAll ? { n: session.opponent.targetCount || session.opponent.right || 0 } : {}),
      s: typeof session.opponent.score === 'number' ? session.opponent.score : 0,
      r: typeof session.opponent.right === 'number' ? session.opponent.right : 0,
      w: typeof session.opponent.wrong === 'number' ? session.opponent.wrong : 0,
      d: typeof session.opponent.durationMs === 'number' ? session.opponent.durationMs : GAME_DURATION_SECONDS * 1000,
      q: encodeCompactQuestionsList(session.opponent.questions, cfgId)
    };
  }

  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function decodeReplayParam(encoded) {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (!payload || !Array.isArray(payload.q) || payload.q.length === 0) return null;

    const cfgId = resolveConfigIdAlias(String(payload.c || activeConfigId));
    if (typeof ensureStudyConfigLoaded === "function") {
      await ensureStudyConfigLoaded(cfgId);
    }
    const mode = payload.m === 'all' ? 'all' : '1min';
    const questions = decodeCompactQuestionsList(payload.q, cfgId);
    const targetCount = mode === 'all'
      ? (Number(payload.n || payload.r || questions.filter(q => q.right > 0).length) || 0)
      : undefined;
    let opponent = null;
    if (payload.o && Array.isArray(payload.o.q) && payload.o.q.length > 0) {
      const oppQuestions = decodeCompactQuestionsList(payload.o.q, cfgId);
      const oppTargetCount = mode === 'all'
        ? (Number(payload.o.n || payload.o.r || oppQuestions.filter(q => q.right > 0).length) || 0)
        : undefined;
      opponent = {
        username: String(payload.o.u || 'Opponent'),
        mode,
        ...(oppTargetCount ? { targetCount: oppTargetCount } : {}),
        score: Number(payload.o.s) || 0,
        right: Number(payload.o.r) || 0,
        wrong: Number(payload.o.w) || 0,
        durationMs: Number(payload.o.d) || GAME_DURATION_SECONDS * 1000,
        questions: oppQuestions
      };
    }

    return {
      username: String(payload.u || 'Player'),
      configId: cfgId,
      mode,
      ...(targetCount ? { targetCount } : {}),
      isRace: Boolean(opponent),
      opponent,
      score: Number(payload.s) || 0,
      right: Number(payload.r) || 0,
      wrong: Number(payload.w) || 0,
      durationMs: Number(payload.d) || GAME_DURATION_SECONDS * 1000,
      questions
    };
  } catch (err) {
    console.error('Failed to decode replay link:', err);
    return null;
  }
}

function getShareBaseUrl() {
  return window.location.hostname.endsWith('github.io')
    ? 'https://math-leaderboard.vercel.app/'
    : `${window.location.origin}${window.location.pathname}`;
}

async function copyUrlWithFeedback(url, btnEl) {
  let copied = false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch (_) {
      copied = false;
    }
  }

  if (!copied) {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      copied = true;
    } catch (_) {
      // Ignore
    }
    document.body.removeChild(ta);
  }

  if (btnEl) {
    const originalText = btnEl.dataset.origText || btnEl.textContent;
    btnEl.dataset.origText = originalText;
    btnEl.textContent = originalText.trim() === '🔗' ? '✓' : '✓ Copied!';
    setTimeout(() => {
      btnEl.textContent = originalText;
    }, 1800);
  }
}

async function copyReplayLink(session, btnEl) {
  if (!session || !Array.isArray(session.questions) || session.questions.length === 0) return;
  const encoded = encodeReplayParam(session);
  const url = `${getShareBaseUrl()}?replay=${encoded}`;
  await copyUrlWithFeedback(url, btnEl);
}

async function copyConfigLink(configId, btnEl, mode = activeGameMode) {
  const cfgId = configId || activeConfigId;
  if (!cfgId) return;
  const params = new URLSearchParams();
  params.set('config', cfgId);
  if (mode === 'all') params.set('mode', 'all');
  const url = `${getShareBaseUrl()}?${params.toString()}`;
  await copyUrlWithFeedback(url, btnEl);
}

async function copyUserPageLink(targetUserId, targetUsername, btnEl, mode = null) {
  const uId = targetUserId || viewedUserId || userId;
  if (!uId) return;
  const uName = targetUsername || resolveUsernameForUserId(uId, username);
  const resolvedMode = mode === 'all' || mode === '1min'
    ? mode
    : (userView && userView.classList.contains('active') ? userPageMode : activeGameMode);
  const params = new URLSearchParams();
  params.set('user', uId);
  if (uName) params.set('u', uName);
  if (resolvedMode === 'all') params.set('mode', 'all');
  const url = `${getShareBaseUrl()}?${params.toString()}`;
  await copyUrlWithFeedback(url, btnEl);
}

async function checkUrlReplayOnLoad() {
  if (hasHandledInitialUrlReplay) return;
  const params = new URLSearchParams(window.location.search);
  const replayParam = params.get('replay');
  const configParam = params.get('config');
  const userParam = params.get('user');
  const rawModeParam = params.get('mode');
  const modeParam = rawModeParam === 'all' ? 'all' : (rawModeParam === '1min' ? '1min' : null);

  if (modeParam && !replayParam && !userParam) {
    activeGameMode = modeParam;
    localStorage.setItem(STORAGE_KEYS.activeGameMode, activeGameMode);
  }

  if (configParam) {
    const targetCfg = getConfigById(configParam);
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
    if (!replayParam && !userParam) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  } else if (modeParam && !replayParam && !userParam) {
    renderConfigsUI();
    renderLeaderboard();
    renderReview();
    window.history.replaceState({}, '', window.location.pathname);
  }

  if (userParam) {
    hasHandledInitialUrlReplay = true;
    openUserPage(userParam, params.get('u') || '', modeParam);
    window.history.replaceState({}, '', window.location.pathname);
    return;
  }

  if (!replayParam) {
    hasHandledInitialUrlReplay = true;
    return;
  }

  hasHandledInitialUrlReplay = true;
  const decoded = await decodeReplayParam(replayParam);
  if (decoded) {
    if (decoded.mode === 'all' || decoded.mode === '1min') {
      activeGameMode = decoded.mode;
      localStorage.setItem(STORAGE_KEYS.activeGameMode, activeGameMode);
    }
    if (decoded.configId && configs.some(c => c.id === decoded.configId)) {
      activeConfigId = decoded.configId;
      localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
      renderConfigsUI();
      renderLeaderboard();
      renderReview();
    }
    startReplay(decoded);
  }
}

function buildReplayTimeline(session, targetConfigId = activeConfigId) {
  const cfgId = (session && session.configId) || targetConfigId;
  const questions = (session.questions || []).map(q => normalizeQuestionRecord(q, cfgId));
  let cursorMs = 0;
  const segments = questions.map((q, index) => {
    const dur = Math.max(150, q.durationMs || 800);
    const startMs = cursorMs;
    const endMs = startMs + dur;
    cursorMs = endMs;

    const attempts = [
      ...(q.wrongAnswers || []).map(ans => ({ value: String(ans), isRight: false })),
      ...(q.right > 0 ? [{ value: String(q.expected), isRight: true }] : [])
    ];
    const k = attempts.length;
    const events = attempts.map((att, attIdx) => {
      const triggerMs = startMs + Math.round(((attIdx + 1) / (k + 0.15)) * dur);
      const clearMs = att.isRight
        ? endMs
        : Math.min(endMs - 20, triggerMs + Math.max(120, Math.round((dur / (k + 1)) * 0.6)));
      return {
        ...att,
        triggerMs,
        clearMs
      };
    });

    return {
      index,
      question: q,
      startMs,
      endMs,
      events
    };
  });

  const totalDurationMs = Math.max(cursorMs, 500);
  return { segments, totalDurationMs };
}

function renderReplayTimelineBar(timeline) {
  if (!replayTimelineSegments || !replayTimelineMarkers) return;
  const { segments, totalDurationMs } = timeline;
  replayTimelineSegments.innerHTML = '';
  replayTimelineMarkers.innerHTML = '';

  segments.forEach((seg) => {
    const leftPct = (seg.startMs / totalDurationMs) * 100;
    const widthPct = ((seg.endMs - seg.startMs) / totalDurationMs) * 100;
    const hadMistake = (seg.question.wrong || 0) > 0 || seg.question.right === 0;

    const block = document.createElement('div');
    block.className = 'replay-seg-block ' + (hadMistake ? 'seg-wrong' : 'seg-right');
    block.style.left = `${leftPct.toFixed(2)}%`;
    block.style.width = `${widthPct.toFixed(2)}%`;
    replayTimelineSegments.appendChild(block);

    seg.events.forEach((ev) => {
      const markerPct = (ev.triggerMs / totalDurationMs) * 100;
      const marker = document.createElement('span');
      marker.className = 'replay-marker ' + (ev.isRight ? 'marker-right' : 'marker-wrong');
      marker.style.left = `${markerPct.toFixed(2)}%`;
      replayTimelineMarkers.appendChild(marker);
    });
  });
}

function renderReplayRaceChart(timeline, opponentTimeline, session) {
  if (!replayRaceChartWrap || !replayRaceChart) return null;
  if (!opponentTimeline || !session || !session.opponent) {
    replayRaceChartWrap.classList.add('hidden');
    replayRaceChart.innerHTML = '';
    return null;
  }

  replayRaceChartWrap.classList.remove('hidden');
  const isAll = Boolean(session && session.mode === 'all');
  const p1Name = session.username || 'Player';
  const p2Name = session.opponent.username || 'Opponent';
  if (replayChartP1Name) replayChartP1Name.textContent = p1Name;
  if (replayChartP2Name) replayChartP2Name.textContent = p2Name;

  const totalDurationMs = isAll
    ? Math.max(timeline.totalDurationMs, opponentTimeline.totalDurationMs, 500)
    : Math.max(timeline.totalDurationMs, 500);
  const steps = 90;
  const samples = [];
  let minScore = 0;
  let maxScore = isAll ? Math.max(5, session.targetCount || 0) : 5;

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * totalDurationMs;
    const p1Stats = getOpponentStatsAt(timeline, t);
    const p2Stats = getOpponentStatsAt(opponentTimeline, t);
    const p1 = isAll ? p1Stats.right : p1Stats.score;
    const p2 = isAll ? p2Stats.right : p2Stats.score;
    const delta = p1 - p2;
    minScore = Math.min(minScore, p1, p2);
    maxScore = Math.max(maxScore, p1, p2);
    samples.push({ t, p1, p2, delta });
  }

  const width = 360;
  const scoreTop = 8;
  const scoreBottom = 64;
  const scoreH = scoreBottom - scoreTop;

  const getX = (ms) => (Math.min(Math.max(0, ms), totalDurationMs) / totalDurationMs) * width;
  const getScoreY = (s) => scoreBottom - ((s - minScore) / Math.max(1, maxScore - minScore)) * scoreH;

  let svg = '';
  const yZeroScore = getScoreY(0).toFixed(1);
  svg += `<line x1="0" y1="${scoreTop}" x2="${width}" y2="${scoreTop}" stroke="var(--border)" stroke-dasharray="3 3" stroke-width="1" />`;
  svg += `<line x1="0" y1="${yZeroScore}" x2="${width}" y2="${yZeroScore}" stroke="var(--border)" stroke-dasharray="3 3" stroke-width="1" />`;

  for (let i = 0; i < steps; i++) {
    const s0 = samples[i];
    const s1 = samples[i + 1];
    const x1 = getX(s0.t).toFixed(1);
    const x2 = getX(s1.t).toFixed(1);
    const y1a = getScoreY(s0.p1).toFixed(1);
    const y2a = getScoreY(s1.p1).toFixed(1);
    const y1b = getScoreY(s0.p2).toFixed(1);
    const y2b = getScoreY(s1.p2).toFixed(1);
    const avgDelta = (s0.delta + s1.delta) / 2;

    if (avgDelta !== 0) {
      const fill = avgDelta > 0 ? 'hsla(145, 70%, 45%, 0.22)' : 'hsla(355, 85%, 55%, 0.22)';
      svg += `<polygon points="${x1},${y1a} ${x2},${y2a} ${x2},${y2b} ${x1},${y1b}" fill="${fill}" />`;
    }
  }

  const p2Pts = samples.map(s => `${getX(s.t).toFixed(1)},${getScoreY(s.p2).toFixed(1)}`).join(' ');
  const p1Pts = samples.map(s => `${getX(s.t).toFixed(1)},${getScoreY(s.p1).toFixed(1)}`).join(' ');
  svg += `<polyline fill="none" stroke="hsl(36, 95%, 48%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${p2Pts}" />`;
  svg += `<polyline fill="none" stroke="hsl(217, 91%, 56%)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" points="${p1Pts}" />`;

  svg += `<text x="4" y="${scoreTop + 8}" font-size="9" font-weight="700" fill="var(--text-muted)">${maxScore}</text>`;
  svg += `<text x="4" y="${Math.min(62, parseFloat(yZeroScore) - 2).toFixed(1)}" font-size="9" font-weight="700" fill="var(--text-muted)">0</text>`;

  const initY = getScoreY(0).toFixed(1);
  svg += `<line id="replay-chart-playhead" x1="0" y1="4" x2="0" y2="68" stroke="var(--text-muted)" stroke-width="1.2" stroke-dasharray="2 2" />`;
  svg += `<circle id="replay-chart-p2-dot" cx="0" cy="${initY}" r="3.2" fill="hsl(36, 95%, 48%)" stroke="var(--surface)" stroke-width="1.2" />`;
  svg += `<circle id="replay-chart-p1-dot" cx="0" cy="${initY}" r="3.6" fill="hsl(217, 91%, 56%)" stroke="var(--surface)" stroke-width="1.2" />`;

  replayRaceChart.innerHTML = svg;

  return {
    getX,
    getScoreY,
    playheadEl: document.getElementById('replay-chart-playhead'),
    p1DotEl: document.getElementById('replay-chart-p1-dot'),
    p2DotEl: document.getElementById('replay-chart-p2-dot')
  };
}

function updateReplayRaceChartPlayhead(clampedMs, myScore, oppScore) {
  if (!replaySessionData || !replaySessionData.raceChartMeta) return;
  const { getX, getScoreY, playheadEl, p1DotEl, p2DotEl } = replaySessionData.raceChartMeta;
  const diff = myScore - oppScore;
  const cx = getX(clampedMs).toFixed(1);
  const y1 = getScoreY(myScore).toFixed(1);
  const y2 = getScoreY(oppScore).toFixed(1);

  if (playheadEl) {
    playheadEl.setAttribute('x1', cx);
    playheadEl.setAttribute('x2', cx);
  }
  if (p1DotEl) {
    p1DotEl.setAttribute('cx', cx);
    p1DotEl.setAttribute('cy', y1);
  }
  if (p2DotEl) {
    p2DotEl.setAttribute('cx', cx);
    p2DotEl.setAttribute('cy', y2);
  }
  if (replayChartLive) {
    const isAll = Boolean(replaySessionData.session && replaySessionData.session.mode === 'all');
    const timeStr = isAll ? formatDurationMs(clampedMs) : `${Math.floor(clampedMs / 1000)}s`;
    const diffStr = diff > 0 ? `+${diff}` : diff < 0 ? `−${Math.abs(diff)}` : '0';
    replayChartLive.textContent = `${timeStr} · ${myScore}–${oppScore} (Δ ${diffStr})`;
  }
}

function seekReplayTo(targetMs) {
  if (!isReplaying || !replaySessionData) return;
  const { totalDurationMs } = replaySessionData.timeline;
  const clamped = Math.max(0, Math.min(totalDurationMs, targetMs));
  const wasFinished = replayElapsedMs >= totalDurationMs;
  replayElapsedMs = clamped;
  replayLastTickTime = performance.now();

  if (clamped < totalDurationMs && wasFinished) {
    isReplayPaused = true;
    if (replayPauseBtn) replayPauseBtn.textContent = '▶ Resume';
  }

  renderReplayStateAt(clamped);

  if (!isReplayPaused && clamped < totalDurationMs && !replayRafId) {
    replayRafId = requestAnimationFrame(tickReplay);
  }
}

function createReplayLogRow(rawQ, startMs) {
  const cfgId = (replaySessionData && replaySessionData.session && replaySessionData.session.configId) || activeConfigId;
  const q = normalizeQuestionRecord(rawQ, cfgId);
  const li = document.createElement('li');
  li.className = 'review-row' + (q.wrong > 0 || q.right === 0 ? ' has-wrong' : '');
  li.title = 'Tap to jump to this question';
  if (typeof startMs === 'number') {
    li.addEventListener('click', () => seekReplayTo(startMs));
  }

  const eqSpan = document.createElement('span');
  eqSpan.className = 'review-eq';
  eqSpan.innerHTML = formatQuestionForReviewHtml(q, cfgId);

  const ansSpan = document.createElement('span');
  ansSpan.className = 'review-answers';
  const expectedStr = String(q.expected);
  const wrongTyped = (q.wrongAnswers || (q.answers || []).filter(a => a !== expectedStr));
  wrongTyped.forEach((w) => {
    const wEl = document.createElement('span');
    wEl.className = 'review-wrong-ans';
    wEl.textContent = `✗ ${formatQuizAnswerText(w)}`;
    ansSpan.appendChild(wEl);
  });
  if (q.right > 0) {
    const rEl = document.createElement('span');
    rEl.className = 'review-right-ans';
    rEl.textContent = `✓ ${formatQuizAnswerText(expectedStr)}`;
    ansSpan.appendChild(rEl);
  }

  const durSpan = document.createElement('span');
  durSpan.className = 'review-duration';
  durSpan.textContent = `${((q.durationMs || 0) / 1000).toFixed(1)}s`;

  li.append(eqSpan, ansSpan, durSpan);
  return li;
}

function renderReplayStateAt(elapsedMs) {
  if (!replaySessionData) return;
  const { timeline } = replaySessionData;
  const { segments, totalDurationMs } = timeline;
  const clampedMs = Math.min(elapsedMs, totalDurationMs);
  const progressPct = totalDurationMs > 0 ? (clampedMs / totalDurationMs) * 100 : 0;

  if (replayTimelineFill) {
    replayTimelineFill.style.width = `${progressPct.toFixed(2)}%`;
  }
  if (replayTimelineThumb) {
    replayTimelineThumb.style.left = `${progressPct.toFixed(2)}%`;
  }
  if (replayTimeline) {
    replayTimeline.setAttribute('aria-valuenow', String(Math.round(progressPct)));
  }

  let rCount = 0;
  let wCount = 0;
  let completedCount = 0;
  let activeSeg = segments[segments.length - 1];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (clampedMs >= seg.endMs) {
      rCount += seg.question.right > 0 ? 1 : 0;
      wCount += seg.question.wrong || 0;
      completedCount = i + 1;
    } else {
      activeSeg = seg;
      seg.events.forEach((ev) => {
        if (clampedMs >= ev.triggerMs) {
          if (ev.isRight) rCount += 1;
          else wCount += 1;
        }
      });
      break;
    }
  }

  const isAll = Boolean(replaySessionData.session && replaySessionData.session.mode === 'all');
  rightCount = rCount;
  wrongCount = wCount;
  const totalSec = Math.round(Math.max(GAME_DURATION_SECONDS * 1000, totalDurationMs) / 1000);
  timeLeft = Math.max(0, totalSec - Math.floor(clampedMs / 1000));
  updateHud();

  if (replaySessionData.opponentTimeline && replaySessionData.session.opponent && raceHudBar) {
    const oppStats = getOpponentStatsAt(replaySessionData.opponentTimeline, clampedMs);
    const myVal = isAll ? rCount : (rCount - wCount);
    const oppVal = isAll ? oppStats.right : oppStats.score;
    const diff = myVal - oppVal;
    const playerName = replaySessionData.session.username || 'Player';
    const oppName = replaySessionData.session.opponent.username || 'Opponent';
    const targetCount = replaySessionData.session.targetCount || Math.max(rCount, oppStats.right, 1);
    if (raceVsText) {
      raceVsText.textContent = isAll
        ? `⚔️ ${playerName}: ${rCount}/${targetCount} vs ${oppName}: ${oppStats.right}/${targetCount}`
        : `⚔️ ${playerName}: ${myVal} vs ${oppName}: ${oppVal}`;
    }
    if (raceDiffBadge) {
      raceDiffBadge.className =
        'race-diff-badge ' + (diff > 0 ? 'ahead' : diff < 0 ? 'behind' : 'tied');
      raceDiffBadge.textContent = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : 'Tied';
    }
    renderOpponentQuestion(oppName, oppStats);
    updateReplayRaceChartPlayhead(clampedMs, myVal, oppVal);
  }

  if (activeSeg) {
    currentQuestion = {
      nums: [...activeSeg.question.nums],
      op: activeSeg.question.op,
      missingIndex: activeSeg.question.missingIndex,
      prompt: activeSeg.question.prompt,
      answer: activeSeg.question.expected,
      distractor: activeSeg.question.distractor,
      choices: activeSeg.question.choices,
      key: getQuestionKeyFromRecord(activeSeg.question)
    };

    let activeTyped = '';
    let activeWrong = false;
    activeSeg.events.forEach((ev) => {
      if (clampedMs >= ev.triggerMs && clampedMs < ev.clearMs) {
        activeTyped = ev.value;
        activeWrong = !ev.isRight;
      } else if (clampedMs >= ev.triggerMs && ev.isRight) {
        activeTyped = ev.value;
        activeWrong = false;
      }
    });

    typedAnswer = activeTyped;
    isWrong = activeWrong;
    renderQuestion();

    if (replayStepBadge) {
      replayStepBadge.textContent = clampedMs >= totalDurationMs
        ? `Done (${segments.length} Qs)`
        : `Q ${activeSeg.index + 1} / ${segments.length}`;
    }
  }

  if (replayLogList && replaySessionData.renderedLogCount !== completedCount) {
    replayLogList.innerHTML = '';
    for (let i = completedCount - 1; i >= 0; i--) {
      replayLogList.appendChild(createReplayLogRow(segments[i].question, segments[i].startMs));
    }
    replaySessionData.renderedLogCount = completedCount;
  }

  if (clampedMs >= totalDurationMs) {
    isReplayPaused = true;
    if (replayPauseBtn) replayPauseBtn.textContent = '✓ Finished';
    if (replayRafId) {
      cancelAnimationFrame(replayRafId);
      replayRafId = null;
    }
  }
}

function tickReplay(now) {
  if (!isReplaying || isReplayPaused || !replaySessionData) return;
  const dt = Math.max(0, now - replayLastTickTime);
  replayLastTickTime = now;
  const prevMs = replayElapsedMs;
  replayElapsedMs += dt * replaySpeed;

  const { segments } = replaySessionData.timeline;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.endMs < prevMs) continue;
    if (seg.startMs > replayElapsedMs) break;
    seg.events.forEach((ev) => {
      if (ev.triggerMs > prevMs && ev.triggerMs <= replayElapsedMs) {
        if (ev.isRight) {
          replaySessionData.replayStreak = (replaySessionData.replayStreak || 0) + 1;
          playRightSound(replaySessionData.replayStreak);
        } else {
          replaySessionData.replayStreak = 0;
          playWrongSound();
        }
      }
    });
  }

  renderReplayStateAt(replayElapsedMs);

  if (isReplaying && !isReplayPaused) {
    replayRafId = requestAnimationFrame(tickReplay);
  }
}

async function startReplay(session) {
  if (!session || !Array.isArray(session.questions) || session.questions.length === 0) return;
  const replayTargetCfgId = resolveConfigIdAlias(session.configId || activeConfigId);
  if (typeof ensureStudyConfigLoaded === "function") {
    await ensureStudyConfigLoaded(replayTargetCfgId);
  }
  if (isPlaying) {
    clearInterval(timerInterval);
    timerInterval = null;
    isPlaying = false;
  }
  if (raceRafId) {
    cancelAnimationFrame(raceRafId);
    raceRafId = null;
  }
  isRaceMode = false;
  raceSessionData = null;
  if (raceHudBar) raceHudBar.classList.add('hidden');
  if (replayRafId) {
    cancelAnimationFrame(replayRafId);
    replayRafId = null;
  }

  closeNewConfigPanel();
  isReplaying = true;
  isReplayPaused = false;
  replayElapsedMs = 0;
  replayLastTickTime = performance.now();

  if (session.configId && configs.some(c => c.id === session.configId)) {
    activeConfigId = session.configId;
    localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
    renderConfigsUI();
    renderLeaderboard();
    renderReview();
  }

  const activeCfg = getActiveConfig();
  const isQuiz = isQuizConfig(activeCfg);
  const timeline = buildReplayTimeline(session, activeConfigId);
  const hasOpponent = Boolean(
    session.opponent && Array.isArray(session.opponent.questions) && session.opponent.questions.length > 0
  );
  const opponentTimeline = hasOpponent ? buildReplayTimeline(session.opponent, activeConfigId) : null;
  const raceChartMeta = renderReplayRaceChart(timeline, opponentTimeline, session);
  replaySessionData = {
    session,
    timeline,
    opponentTimeline,
    raceChartMeta,
    renderedLogCount: -1
  };
  renderReplayTimelineBar(timeline);

  if (questionLastPerf) questionLastPerf.classList.add('hidden');
  keypad.classList.add('hidden');
  if (quizChoicesEl) {
    quizChoicesEl.classList.toggle('replay-compact', isQuiz);
    quizChoicesEl.classList.toggle('hidden', !isQuiz);
  }
  if (raceHudBar) raceHudBar.classList.toggle('hidden', !hasOpponent);
  if (raceOppEq) raceOppEq.classList.toggle('hidden', !hasOpponent);
  if (replayResultBanner) {
    const isAll = session.mode === 'all';
    const playerName = session.username || 'Player';
    const rightVal = typeof session.right === 'number' ? session.right : 0;
    const wrongVal = typeof session.wrong === 'number' ? session.wrong : 0;
    const scoreVal = typeof session.score === 'number' ? session.score : rightVal - wrongVal;
    const targetCount = session.targetCount || rightVal;

    if (hasOpponent) {
      const opp = session.opponent;
      const oppName = opp.username || 'Opponent';
      const oppRight = typeof opp.right === 'number' ? opp.right : 0;
      const oppWrong = typeof opp.wrong === 'number' ? opp.wrong : 0;
      const oppScore = typeof opp.score === 'number' ? opp.score : oppRight - oppWrong;
      if (isAll) {
        const diffMs = (session.durationMs || 0) - (opp.durationMs || 0);
        replayResultBanner.classList.toggle('new-high-score', diffMs < 0);
        if (replayBannerLabel) {
          if (diffMs < 0) {
            replayBannerLabel.textContent = `🏆 ${playerName} beat ${oppName} by ${formatDurationMs(-diffMs)}! · Not Ranked`;
          } else if (diffMs === 0) {
            replayBannerLabel.textContent = `🤝 ${playerName} tied with ${oppName}! · Not Ranked`;
          } else {
            replayBannerLabel.textContent = `⚔️ ${playerName} vs ${oppName} (+${formatDurationMs(diffMs)}) · Not Ranked`;
          }
        }
        if (replayBannerValue) replayBannerValue.textContent = formatDurationMs(session.durationMs);
        if (replayBannerDetail) {
          replayBannerDetail.textContent = `${playerName}: ${formatDurationMs(session.durationMs)} (${wrongVal}✗) · ${oppName}: ${formatDurationMs(opp.durationMs)} (${oppWrong}✗)`;
        }
      } else {
        const diff = scoreVal - oppScore;
        const diffStr = diff > 0 ? `+${diff}` : String(diff);

        replayResultBanner.classList.toggle('new-high-score', diff > 0);
        if (replayBannerLabel) {
          if (diff > 0) {
            replayBannerLabel.textContent = `🏆 ${playerName} beat ${oppName}! (${diffStr}) · Not Ranked`;
          } else if (diff === 0) {
            replayBannerLabel.textContent = `🤝 ${playerName} tied with ${oppName}! · Not Ranked`;
          } else {
            replayBannerLabel.textContent = `⚔️ ${playerName} vs ${oppName} (${diffStr}) · Not Ranked`;
          }
        }
        if (replayBannerValue) replayBannerValue.textContent = scoreVal;
        if (replayBannerDetail) {
          replayBannerDetail.textContent = `${playerName}: ${scoreVal} (${rightVal}✓ ${wrongVal}✗) · ${oppName}: ${oppScore} (${oppRight}✓ ${oppWrong}✗)`;
        }
      }
    } else if (isAll) {
      replayResultBanner.classList.remove('new-high-score');
      if (replayBannerLabel) replayBannerLabel.textContent = `${playerName}'s Time`;
      if (replayBannerValue) replayBannerValue.textContent = formatDurationMs(session.durationMs);
      if (replayBannerDetail) replayBannerDetail.textContent = `${rightVal}/${targetCount} right · ${wrongVal} wrong`;
    } else {
      replayResultBanner.classList.remove('new-high-score');
      if (replayBannerLabel) replayBannerLabel.textContent = `${playerName}'s Score`;
      if (replayBannerValue) replayBannerValue.textContent = scoreVal;
      if (replayBannerDetail) replayBannerDetail.textContent = `${rightVal} right · ${wrongVal} wrong`;
    }
    replayResultBanner.classList.remove('hidden');
  }
  if (replayPlayBtn) {
    if (session.mode === 'all') {
      const targetN = session.targetCount || getAllModeTargetCount(activeCfg, ALL_MODE_MAX_QUESTIONS);
      replayPlayBtn.textContent = targetN ? `Play All (${targetN} Qs)` : `Play All (≤${ALL_MODE_MAX_QUESTIONS} Qs)`;
    } else {
      replayPlayBtn.textContent = 'Play 1-Minute Game';
    }
    replayPlayBtn.classList.remove('hidden');
  }
  if (replayPanel) replayPanel.classList.remove('hidden');
  if (replayTitle) {
    if (hasOpponent) {
      const oppName = session.opponent.username || 'Opponent';
      replayTitle.textContent = session.mode === 'all'
        ? `Replay: ⚔️ ${session.username || 'Player'} (${formatDurationMs(session.durationMs)}) vs ${oppName} (${formatDurationMs(session.opponent.durationMs)})`
        : `Replay: ⚔️ ${session.username || 'Player'} (${session.score}) vs ${oppName} (${session.opponent.score})`;
    } else {
      replayTitle.textContent = session.mode === 'all'
        ? `Replay: ${session.username || 'Player'} (${formatDurationMs(session.durationMs)})`
        : `Replay: ${session.username || 'Player'} (Score ${session.score})`;
    }
  }
  if (replayPauseBtn) replayPauseBtn.textContent = '⏸ Pause';
  if (replaySpeedBtn) replaySpeedBtn.textContent = `${replaySpeed}× Speed`;
  if (gameLandscapeBtn) gameLandscapeBtn.classList.add('hidden');
  gameView.classList.remove('is-quiz-mode', 'is-math-mode', 'is-race-mode');
  applyGameplayOrientation();
  quitBtn.textContent = 'Exit Replay';

  deleteUserBtn.classList.add('hidden');
  updateInstallBtnVisibility();
  if (userView) userView.classList.remove('active');
  homeView.classList.remove('active');
  gameView.classList.add('active');

  renderReplayStateAt(0);
  replayRafId = requestAnimationFrame(tickReplay);
}

function stopReplay(returnHome = true) {
  if (replayRafId) {
    cancelAnimationFrame(replayRafId);
    replayRafId = null;
  }
  stopStudySpeech();
  isReplaying = false;
  isReplayPaused = false;
  replaySessionData = null;

  if (replayResultBanner) {
    replayResultBanner.classList.add('hidden');
    replayResultBanner.classList.remove('new-high-score');
  }
  if (raceHudBar) raceHudBar.classList.add('hidden');
  if (raceOppEq) raceOppEq.classList.add('hidden');
  if (replayRaceChartWrap) replayRaceChartWrap.classList.add('hidden');
  if (replayPlayBtn) replayPlayBtn.classList.add('hidden');
  if (replayPanel) replayPanel.classList.add('hidden');
  keypad.classList.remove('hidden');
  if (quizChoicesEl) {
    quizChoicesEl.classList.remove('replay-compact');
    quizChoicesEl.classList.add('hidden');
  }
  deleteUserBtn.classList.remove('hidden');
  updateInstallBtnVisibility();

  if (window.location.search.includes('replay=')) {
    window.history.replaceState({}, '', window.location.pathname);
  }

  if (returnHome) {
    gameView.classList.remove('active');
    homeView.classList.add('active');
    updateAllSwitcherRowsOverflow();
  }
}

function toggleReplayPause() {
  if (!isReplaying || !replaySessionData) return;
  if (replayElapsedMs >= replaySessionData.timeline.totalDurationMs) {
    restartReplay();
    return;
  }
  isReplayPaused = !isReplayPaused;
  if (replayPauseBtn) {
    replayPauseBtn.textContent = isReplayPaused ? '▶ Resume' : '⏸ Pause';
  }
  if (!isReplayPaused) {
    replayLastTickTime = performance.now();
    replayRafId = requestAnimationFrame(tickReplay);
  }
}

function cycleReplaySpeed() {
  const speeds = [1, 2, 4];
  const idx = speeds.indexOf(replaySpeed);
  replaySpeed = speeds[(idx + 1) % speeds.length];
  if (replaySpeedBtn) {
    replaySpeedBtn.textContent = `${replaySpeed}× Speed`;
  }
}

function restartReplay() {
  if (!isReplaying || !replaySessionData) return;
  if (replayRafId) {
    cancelAnimationFrame(replayRafId);
    replayRafId = null;
  }
  replayElapsedMs = 0;
  replaySessionData.renderedLogCount = -1;
  isReplayPaused = false;
  if (replayPauseBtn) replayPauseBtn.textContent = '⏸ Pause';
  replayLastTickTime = performance.now();
  renderReplayStateAt(0);
  replayRafId = requestAnimationFrame(tickReplay);
}
