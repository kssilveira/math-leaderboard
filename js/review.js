// --- Progress Chart & Question Review Card ---

function formatQuestionForReviewHtml(rawQ, targetConfigId = activeConfigId) {
  const q = normalizeQuestionRecord(rawQ, targetConfigId);
  if (q.op === '?') {
    const promptStr = String(q.prompt || '');
    const mainHtml = (!isMapVal(promptStr) && promptStr.includes('___'))
      ? fillClozePromptHtml(promptStr, q.expected)
      : `${renderInlineQuizValHtml(q.prompt, false)} → ${renderInlineQuizValHtml(q.expected, true)}`;
    const cfg = getConfigById(targetConfigId);
    const note = q.note || getQuizItemNote(cfg, Array.isArray(q.nums) ? (Number(q.nums[0]) || 0) : 0);
    return note ? `${mainHtml}<span class="review-note">${escapeHtml(note)}</span>` : mainHtml;
  }
  const opChar = q.op === '-' ? '−' : q.op;
  const parts = q.nums.map((n, idx) => {
    if (idx === q.missingIndex) {
      return `<span class="review-q-slot">${n}</span>`;
    }
    return String(n);
  });
  return `${parts[0]} ${opChar} ${parts[1]} = ${parts[2]}`;
}

function renderHistoryChart(sessions, mode = '1min') {
  if (!historyChart) return;
  const isAll = mode === 'all';
  if (chartLegendPrimary) chartLegendPrimary.textContent = isAll ? 'Time (s)' : 'Score';
  if (chartLegendSecondaryWrap) chartLegendSecondaryWrap.classList.toggle('hidden', isAll);
  if (chartLegendBest) chartLegendBest.textContent = isAll ? 'Best (s)' : 'Best';

  const regularSessions = Array.isArray(sessions)
    ? sessions.filter((s) =>
        isAll
          ? (s && !s.isPractice && s.completedAll !== false && typeof s.durationMs === 'number' && s.durationMs > 0)
          : (s && !s.isPractice)
      )
    : [];
  if (regularSessions.length === 0) {
    if (chartSection) chartSection.classList.add('hidden');
    historyChart.innerHTML = '';
    return;
  }
  if (chartSection) chartSection.classList.remove('hidden');

  const chronological = [...regularSessions].reverse();
  const n = chronological.length;

  const width = 360;
  const height = 160;
  const padLeft = 34;
  const padRight = 14;
  const padTop = 12;
  const padBottom = 22;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  let runningBest = isAll ? Infinity : -Infinity;
  const pointsData = chronological.map((s) => {
    if (isAll) {
      const timeSec = Number((s.durationMs / 1000).toFixed(1));
      runningBest = Math.min(runningBest, timeSec);
      return {
        primary: timeSec,
        best: runningBest
      };
    }
    const score = typeof s.score === 'number' ? s.score : 0;
    runningBest = Math.max(runningBest, score);
    return {
      primary: score,
      right: s.right || 0,
      best: runningBest
    };
  });

  let minVal = isAll ? Infinity : 0;
  let maxVal = isAll ? 0 : 5;
  pointsData.forEach((p) => {
    if (isAll) {
      minVal = Math.min(minVal, p.primary, p.best);
      maxVal = Math.max(maxVal, p.primary, p.best);
    } else {
      minVal = Math.min(minVal, p.primary, p.right, p.best);
      maxVal = Math.max(maxVal, p.primary, p.right, p.best);
    }
  });
  minVal = isAll ? Math.max(0, Math.floor(minVal * 0.9)) : Math.floor(minVal);
  maxVal = Math.ceil(maxVal);
  if (maxVal <= minVal) maxVal = minVal + 5;

  const getX = (i) => (n === 1 ? padLeft + plotW / 2 : padLeft + (i / (n - 1)) * plotW);
  const getY = (val) => padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;

  const midVal = minVal < 0 ? 0 : Math.round((minVal + maxVal) / 2);
  const yTicks = Array.from(new Set([minVal, midVal, maxVal]));

  let svg = '';

  // Y-axis labels and horizontal grid lines
  yTicks.forEach((tick) => {
    const y = getY(tick).toFixed(1);
    svg += `<line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="var(--border)" stroke-dasharray="3 3" stroke-width="1" />`;
    svg += `<text x="${padLeft - 6}" y="${(parseFloat(y) + 3.5).toFixed(1)}" text-anchor="end" font-size="10" font-weight="600" fill="var(--text-muted)">${isAll ? `${tick}s` : tick}</text>`;
  });

  // X-axis labels (#1 .. #N)
  if (n === 1) {
    svg += `<text x="${getX(0).toFixed(1)}" y="${height - 5}" text-anchor="middle" font-size="10" font-weight="600" fill="var(--text-muted)">#1</text>`;
  } else {
    svg += `<text x="${getX(0).toFixed(1)}" y="${height - 5}" text-anchor="start" font-size="10" font-weight="600" fill="var(--text-muted)">#1</text>`;
    svg += `<text x="${getX(n - 1).toFixed(1)}" y="${height - 5}" text-anchor="end" font-size="10" font-weight="600" fill="var(--text-muted)">#${n}</text>`;
  }

  const series = isAll
    ? [
        { key: 'best', color: 'hsl(36, 95%, 46%)', width: 2.2, radius: 3.2 },
        { key: 'primary', color: 'hsl(217, 91%, 53%)', width: 2.5, radius: 3.5 }
      ]
    : [
        { key: 'right', color: 'hsl(152, 76%, 36%)', width: 2, radius: 3 },
        { key: 'best', color: 'hsl(36, 95%, 46%)', width: 2.2, radius: 3.2 },
        { key: 'primary', color: 'hsl(217, 91%, 53%)', width: 2.5, radius: 3.5 }
      ];

  series.forEach((s) => {
    const pts = pointsData.map((item, idx) => `${getX(idx).toFixed(1)},${getY(item[s.key]).toFixed(1)}`);
    if (n > 1) {
      svg += `<polyline fill="none" stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round" points="${pts.join(' ')}" />`;
    }
    pointsData.forEach((item, idx) => {
      const cx = getX(idx).toFixed(1);
      const cy = getY(item[s.key]).toFixed(1);
      svg += `<circle cx="${cx}" cy="${cy}" r="${s.radius}" fill="${s.color}" stroke="var(--surface)" stroke-width="1" />`;
    });
  });

  historyChart.innerHTML = svg;
}

function updateReviewCollapseUI() {
  if (reviewBody) {
    reviewBody.classList.toggle('hidden', !isReviewExpanded);
  }
  if (reviewToggleBtn) {
    reviewToggleBtn.setAttribute('aria-expanded', isReviewExpanded ? 'true' : 'false');
  }
  if (reviewChevron) {
    reviewChevron.textContent = isReviewExpanded ? '▾' : '▸';
  }
}

function renderReview() {
  const mode = (typeof activeGameMode !== 'undefined' && activeGameMode === 'all') ? 'all' : '1min';
  const map = getGameHistoryMap();
  const key = typeof getHistoryBucketKey === 'function'
    ? getHistoryBucketKey(userId, activeConfigId, mode)
    : `${userId}__${activeConfigId}`;
  const sessions = map[key];
  const lastSession = Array.isArray(sessions) && sessions.length > 0 ? sessions[0] : null;
  const trackedQuestions = getTrackedQuestions(userId, activeConfigId);

  if (practiceBtn) {
    practiceBtn.classList.toggle('hidden', trackedQuestions.length === 0);
    if (!isLoadingStudyPack) {
      practiceBtn.textContent = 'Practice Weak & Slow';
    }
  }

  if (trackedQuestions.length === 0 && !sessionHasQuestions(lastSession)) {
    reviewCard.classList.add('hidden');
    return;
  }

  reviewCard.classList.remove('hidden');
  updateReviewCollapseUI();

  sortImproveBtn.classList.toggle('active', reviewSortMode === 'improve');
  sortImproveBtn.setAttribute('aria-selected', reviewSortMode === 'improve' ? 'true' : 'false');
  sortOrderBtn.classList.toggle('active', reviewSortMode === 'order');
  sortOrderBtn.setAttribute('aria-selected', reviewSortMode === 'order' ? 'true' : 'false');
  if (sortPracticeBtn) {
    sortPracticeBtn.classList.toggle('active', reviewSortMode === 'practice');
    sortPracticeBtn.setAttribute('aria-selected', reviewSortMode === 'practice' ? 'true' : 'false');
  }

  const lastQuestions = getSessionQuestions(lastSession, activeConfigId);
  if (reviewSortMode === 'practice' && trackedQuestions.length > 0) {
    const totalQMs = trackedQuestions.reduce((sum, q) => sum + (q.durationMs || 0), 0);
    const avgSec = (totalQMs / trackedQuestions.length / 1000).toFixed(1);
    const mistakeCount = trackedQuestions.filter(q => q.wrong > 0 || q.right === 0).length;
    reviewSummaryBadge.textContent = `${trackedQuestions.length} tracked · ${avgSec}s avg · ${mistakeCount} to fix`;
  } else if (lastQuestions.length > 0) {
    const totalQMs = lastQuestions.reduce((sum, q) => sum + (q.durationMs || 0), 0);
    const avgSec = (totalQMs / lastQuestions.length / 1000).toFixed(1);
    if (mode === 'all' && typeof lastSession.durationMs === 'number') {
      const targetN = lastSession.targetCount || lastSession.right;
      reviewSummaryBadge.textContent = `${formatDurationMs(lastSession.durationMs)} · ${lastSession.right}/${targetN} right · ${lastSession.wrong} wrong`;
    } else {
      reviewSummaryBadge.textContent = `${avgSec}s avg · ${lastSession.right} right · ${lastSession.wrong} wrong`;
    }
  } else if (trackedQuestions.length > 0) {
    const totalQMs = trackedQuestions.reduce((sum, q) => sum + (q.durationMs || 0), 0);
    const avgSec = (totalQMs / trackedQuestions.length / 1000).toFixed(1);
    const mistakeCount = trackedQuestions.filter(q => q.wrong > 0 || q.right === 0).length;
    reviewSummaryBadge.textContent = `${trackedQuestions.length} tracked · ${avgSec}s avg · ${mistakeCount} to fix`;
  }

  if (!isReviewExpanded) {
    return;
  }

  renderHistoryChart(sessions || [], mode);

  const activeCfgForReview = getActiveConfig();
  if (activeCfgForReview && activeCfgForReview.isLazyStudy && !activeCfgForReview.studyDataLoaded) {
    reviewList.innerHTML = '<li class="empty-row">Loading study review…</li>';
    preloadStudyConfigInBackground(activeCfgForReview);
    return;
  }

  let ordered = [];
  if (reviewSortMode === 'practice') {
    ordered = trackedQuestions;
  } else {
    ordered = lastQuestions.map((q, idx) => ({ ...q, index: idx + 1 }));
    if (reviewSortMode === 'improve') {
      ordered.sort((a, b) => {
        if (b.wrong !== a.wrong) return b.wrong - a.wrong;
        return (b.durationMs || 0) - (a.durationMs || 0);
      });
    }
  }

  reviewList.innerHTML = '';
  ordered.forEach((rawQ) => {
    const q = normalizeQuestionRecord(rawQ, activeConfigId);
    const li = document.createElement('li');
    li.className = 'review-row' + (q.wrong > 0 || q.right === 0 ? ' has-wrong' : '');

    // 1. Question / Equation with highlighted answer slot
    const eqSpan = document.createElement('span');
    eqSpan.className = 'review-eq';
    eqSpan.innerHTML = formatQuestionForReviewHtml(q, activeConfigId);
    const speakPayload = isSpeechSynthesisSupported()
      ? getStudyReviewSpeakPayload(activeCfgForReview, q)
      : null;
    if (speakPayload && hasSpeechVoiceForLang(speakPayload.lang)) {
      const speakBtn = document.createElement('button');
      speakBtn.type = 'button';
      speakBtn.className = 'inline-btn review-speak-btn';
      speakBtn.textContent = '🔊';
      speakBtn.title = 'Listen to pronunciation';
      speakBtn.setAttribute('aria-label', 'Listen to pronunciation');
      speakBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speakStudyText(speakPayload.text, speakPayload.lang);
      });
      const noteEl = eqSpan.querySelector('.review-note');
      if (noteEl) {
        eqSpan.insertBefore(speakBtn, noteEl);
      } else {
        eqSpan.appendChild(speakBtn);
      }
    }

    // 2. Typed/chosen answers (wrong attempts & right answer)
    const ansSpan = document.createElement('span');
    ansSpan.className = 'review-answers';
    const expectedStr = String(q.expected);
    const wrongTyped = (q.answers || []).filter(a => a !== expectedStr);
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

    // 3. Duration
    const durSpan = document.createElement('span');
    durSpan.className = 'review-duration';
    durSpan.textContent = `${((q.durationMs || 0) / 1000).toFixed(1)}s`;

    li.append(eqSpan, ansSpan, durSpan);
    reviewList.appendChild(li);
  });
}
