// --- Gameplay Loop, Question Generation, Input Handling, Ghost Race HUD & Celebrations ---

function drawNextQuizIndex(cfg) {
  const n = cfg.items.length;
  if (currentGameQuizDeckConfigId !== cfg.id || currentGameQuizDeck.length === 0) {
    let unseen = [];
    for (let i = 0; i < n; i++) {
      if (!currentGameSeenKeys.has(`quiz_${i}`)) {
        unseen.push(i);
      }
    }
    if (unseen.length === 0) {
      currentGameSeenKeys.clear();
      unseen = Array.from({ length: n }, (_, i) => i);
    }
    for (let i = unseen.length - 1; i > 0; i--) {
      const j = randomInt(0, i);
      const tmp = unseen[i];
      unseen[i] = unseen[j];
      unseen[j] = tmp;
    }
    if (unseen.length > 1 && currentQuestion && `quiz_${unseen[unseen.length - 1]}` === currentQuestion.key) {
      const swapIdx = randomInt(0, unseen.length - 2);
      const tmp = unseen[unseen.length - 1];
      unseen[unseen.length - 1] = unseen[swapIdx];
      unseen[swapIdx] = tmp;
    }
    currentGameQuizDeck = unseen;
    currentGameQuizDeckConfigId = cfg.id;
  }
  const qIdx = currentGameQuizDeck.pop();
  currentGameSeenKeys.add(`quiz_${qIdx}`);
  return qIdx;
}

function generateRandomQuestion() {
  const cfg = getActiveConfig();
  if (!cfg) return null;

  if (isQuizConfig(cfg)) {
    const items = Array.isArray(cfg.items) ? cfg.items : [];
    if (items.length < 2) return null;
    const { bucket } = ensureQuestionStatsBucket(userId, activeConfigId);
    const qIdx = drawNextQuizIndex(cfg);
    const key = `quiz_${qIdx}`;
    const dIdx = sampleQuizDistractorIndex(cfg, qIdx);
    const choiceOrder = randomInt(0, 1);
    return buildQuizQuestionFromIndices(
      cfg,
      qIdx,
      dIdx,
      choiceOrder,
      bucket[key] ? { ...bucket[key] } : null
    );
  }

  const samplers = getValidSamplers(cfg);
  if (samplers.length === 0) return null;

  const { bucket } = ensureQuestionStatsBucket(userId, activeConfigId);
  const sampleMathCandidate = () => {
    const sampleFn = samplers[randomInt(0, samplers.length - 1)];
    const { a, b, c, op } = sampleFn();
    const nums = [a, b, c];
    const validIndices = getValidMissingIndices(a, op, b, c);
    const missingIndex = validIndices[randomInt(0, validIndices.length - 1)];
    const key = `${a}${op}${b}=${c}?${missingIndex}`;
    return {
      nums,
      op,
      missingIndex,
      answer: nums[missingIndex],
      key,
      lastPerf: bucket[key] ? { ...bucket[key] } : null
    };
  };

  const MAX_MATH_ATTEMPTS = 60;
  let candidate = null;
  let foundFresh = false;
  for (let attempt = 0; attempt < MAX_MATH_ATTEMPTS; attempt++) {
    candidate = sampleMathCandidate();
    if (!currentGameSeenKeys.has(candidate.key) && (!currentQuestion || candidate.key !== currentQuestion.key)) {
      foundFresh = true;
      break;
    }
  }

  if (!foundFresh) {
    currentGameSeenKeys.clear();
    if (currentQuestion && currentQuestion.key) {
      currentGameSeenKeys.add(currentQuestion.key);
    }
    for (let attempt = 0; attempt < 25; attempt++) {
      candidate = sampleMathCandidate();
      if (!currentQuestion || candidate.key !== currentQuestion.key) {
        break;
      }
    }
  }

  if (candidate) {
    currentGameSeenKeys.add(candidate.key);
  }
  return candidate;
}

function generatePracticeQuestion() {
  const tracked = getTrackedQuestions(userId, activeConfigId);
  if (tracked.length === 0) {
    return generateRandomQuestion();
  }

  const cooldownSize = Math.min(PRACTICE_REPEAT_COOLDOWN, Math.max(0, tracked.length - 1));
  const recentSet = cooldownSize > 0 ? new Set(currentGameRecentKeys.slice(-cooldownSize)) : new Set();
  let candidates = cooldownSize > 0
    ? tracked.filter(q => !recentSet.has(q.key))
    : tracked;

  if (candidates.length === 0) {
    candidates = tracked.length > 1 && currentQuestion
      ? tracked.filter(q => q.key !== currentQuestion.key)
      : tracked;
  }

  if (candidates.length === 0) {
    return generateRandomQuestion();
  }

  const picked = candidates[0];
  currentGameRecentKeys.push(picked.key);
  if (currentGameRecentKeys.length > PRACTICE_REPEAT_COOLDOWN) {
    currentGameRecentKeys.shift();
  }

  const cfg = getActiveConfig();
  if (cfg && isQuizConfig(cfg) && Array.isArray(cfg.items) && cfg.items.length >= 2) {
    const qIdx = Math.max(0, Math.min(cfg.items.length - 1, Number(picked.nums && picked.nums[0]) || 0));
    const dIdx = sampleQuizDistractorIndex(cfg, qIdx);
    const choiceOrder = randomInt(0, 1);
    return buildQuizQuestionFromIndices(cfg, qIdx, dIdx, choiceOrder, { ...picked });
  }

  const pickedAnswer = picked.expected !== undefined
    ? picked.expected
    : (Array.isArray(picked.nums) ? picked.nums[picked.missingIndex] : 0);

  return {
    nums: [...picked.nums],
    op: picked.op,
    missingIndex: picked.missingIndex,
    answer: pickedAnswer,
    key: picked.key,
    lastPerf: { ...picked }
  };
}

function generateRaceQuestion() {
  if (raceSessionData && raceSessionData.questionIndex < raceSessionData.session.questions.length) {
    const rawQ = raceSessionData.session.questions[raceSessionData.questionIndex];
    raceSessionData.questionIndex += 1;
    const q = normalizeQuestionRecord(rawQ, activeConfigId);
    const key = getQuestionKeyFromRecord(q);
    currentGameSeenKeys.add(key);
    if (q.op === '?') {
      return {
        nums: [...q.nums],
        op: '?',
        missingIndex: q.missingIndex,
        prompt: q.prompt,
        answer: q.expected,
        distractor: q.distractor,
        choices: q.choices,
        key
      };
    }
    return {
      nums: [...q.nums],
      op: q.op,
      missingIndex: q.missingIndex,
      answer: q.expected,
      key
    };
  }
  return generateRandomQuestion();
}

function generateQuestion() {
  if (isRaceMode) return generateRaceQuestion();
  return isPracticeMode ? generatePracticeQuestion() : generateRandomQuestion();
}

function renderQuestion() {
  if (!currentQuestion) return;
  const activeCfg = getActiveConfig();
  const isQuiz = currentQuestion.op === '?' || isQuizConfig(activeCfg);

  if (questionLastPerf) {
    if (isPracticeMode && currentQuestion.lastPerf) {
      const lp = currentQuestion.lastPerf;
      const secStr = `${((lp.durationMs || 0) / 1000).toFixed(1)}s`;
      const hadMistake = lp.wrong > 0 || lp.right === 0;
      const expectedStr = String(lp.expected !== undefined ? lp.expected : currentQuestion.answer);
      const wrongTyped = (lp.answers || []).filter(a => a !== expectedStr);

      if (hadMistake) {
        const wrongText = wrongTyped.length > 0
          ? wrongTyped.map(w => `✗ ${formatQuizAnswerText(w)}`).join(' ')
          : `${lp.wrong} wrong`;
        questionLastPerf.textContent = `Last: ${wrongText} · ${secStr} avg`;
      } else {
        questionLastPerf.textContent = `Last: ✓ · ${secStr} avg`;
      }
      questionLastPerf.classList.toggle('had-wrong', hadMistake);
      questionLastPerf.classList.remove('hidden');
    } else {
      questionLastPerf.classList.add('hidden');
    }
  }

  if (isQuiz) {
    const promptVal = String(currentQuestion.prompt || '');
    const promptIsMap = isMapVal(promptVal);
    const showPracticeReveal = Boolean(isPracticeMode && isWrong && !isReplaying);
    if (equationCard) {
      equationCard.classList.toggle('has-map-prompt', promptIsMap);
      equationCard.classList.toggle('is-replay-card', Boolean(isReplaying));
      equationCard.classList.toggle('is-practice-paused', Boolean(showPracticeReveal && isPracticeWrongPaused));
    }
    if (mathEqGroup) mathEqGroup.classList.add('hidden');
    if (quizPromptGroup) quizPromptGroup.classList.remove('hidden');
    if (quizPromptLabel) {
      quizPromptLabel.textContent = formatConfigLabel(activeCfg);
    }
    if (quizSpeakBtn) {
      const speakPayload = isSpeechSynthesisSupported() && isPracticeMode && !isReplaying
        ? getStudyPromptSpeakPayload(activeCfg, currentQuestion, showPracticeReveal)
        : null;
      const canSpeak = Boolean(speakPayload && hasSpeechVoiceForLang(speakPayload.lang));
      quizSpeakBtn.classList.toggle('hidden', !canSpeak);
    }
    syncAutoSpeakBtnUI(activeCfg);
    if (quizPracticeNote) {
      const showPracticeNote = Boolean(showPracticeReveal && currentQuestion.note);
      quizPracticeNote.textContent = showPracticeNote ? `💡 ${currentQuestion.note}` : '';
      quizPracticeNote.classList.toggle('hidden', !showPracticeNote);
    }
    if (quizPracticeHint) {
      quizPracticeHint.classList.toggle('hidden', !(showPracticeReveal && isPracticeWrongPaused));
    }
    if (quizPromptText) {
      const isFlagPrompt = !promptIsMap && Boolean(activeCfg && activeCfg.isFlagPrompt);
      quizPromptText.classList.toggle('is-flag', isFlagPrompt);
      quizPromptText.classList.toggle('is-map', promptIsMap);
      quizPromptText.classList.toggle('is-sentence', !promptIsMap && !isFlagPrompt && promptVal.length > 26);
      quizPromptText.classList.toggle('is-very-long', !promptIsMap && !isFlagPrompt && promptVal.length > 42);
      if (promptIsMap) {
        quizPromptText.innerHTML = renderGeoMapSvg(promptVal, { variant: 'prompt' });
      } else if (promptVal.includes('___')) {
        quizPromptText.innerHTML = renderQuizPromptTextHtml(promptVal);
      } else {
        quizPromptText.textContent = promptVal;
      }
    }
    if (quizChoice0Btn && quizChoice1Btn) {
      const choices = currentQuestion.choices || ['', ''];
      const isFlagChoice = Boolean(activeCfg && activeCfg.isFlagChoice);
      const anyMapChoice = choices.some(c => isMapVal(String(c ?? '')));
      const maxChoiceLen = choices.reduce((max, c) => Math.max(max, String(c ?? '').length), 0);
      if (quizChoicesEl) {
        quizChoicesEl.classList.toggle('is-stacked', !isFlagChoice && !anyMapChoice && maxChoiceLen > 24);
      }
      [quizChoice0Btn, quizChoice1Btn].forEach((btn, idx) => {
        const cText = String(choices[idx] ?? '');
        const choiceIsMap = isMapVal(cText);
        btn.classList.toggle('is-flag', !choiceIsMap && isFlagChoice);
        btn.classList.toggle('is-map', choiceIsMap);
        btn.classList.toggle('is-long', !choiceIsMap && !isFlagChoice && cText.length > 22);
        if (choiceIsMap) {
          btn.innerHTML = renderGeoMapSvg(cText, { variant: 'choice' });
        } else {
          btn.textContent = cText;
        }
        btn.classList.remove('wrong', 'right');
        if (typedAnswer !== '') {
          if (cText === typedAnswer) {
            btn.classList.add(isWrong ? 'wrong' : 'right');
          } else if (isWrong && !isReplaying && cText === String(currentQuestion.answer)) {
            btn.classList.add('right');
          }
        }
      });
    }
    return;
  }

  if (equationCard) {
    equationCard.classList.remove('has-map-prompt', 'is-replay-card', 'is-practice-paused');
  }

  if (mathEqGroup) mathEqGroup.classList.remove('hidden');
  if (quizPromptGroup) quizPromptGroup.classList.add('hidden');
  if (quizSpeakBtn) quizSpeakBtn.classList.add('hidden');
  if (quizAutoSpeakBtn) quizAutoSpeakBtn.classList.add('hidden');
  if (quizPracticeNote) {
    quizPracticeNote.textContent = '';
    quizPracticeNote.classList.add('hidden');
  }
  if (quizPracticeHint) quizPracticeHint.classList.add('hidden');

  const slots = [slot0, slot1, slot2];
  slotOp.textContent = currentQuestion.op === '-' ? '−' : currentQuestion.op;

  slots.forEach((slotEl, idx) => {
    slotEl.className = 'eq-item';
    if (idx === currentQuestion.missingIndex) {
      slotEl.classList.add('question-slot');
      if (typedAnswer === '') {
        slotEl.classList.add('empty');
        slotEl.textContent = '?';
      } else {
        slotEl.textContent = typedAnswer;
        if (isWrong) {
          void slotEl.offsetWidth;
          slotEl.classList.add('wrong');
        }
      }
    } else {
      slotEl.textContent = currentQuestion.nums[idx];
    }
  });
}

function getOpponentStatsAt(timeline, elapsedMs) {
  const { segments, totalDurationMs } = timeline;
  const clampedMs = Math.min(Math.max(0, elapsedMs), totalDurationMs);
  let rCount = 0;
  let wCount = 0;
  let activeSeg = segments[segments.length - 1] || null;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (clampedMs >= seg.endMs) {
      rCount += seg.question.right > 0 ? 1 : 0;
      wCount += seg.question.wrong || 0;
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

  let activeTyped = '';
  let activeWrong = false;
  if (activeSeg) {
    activeSeg.events.forEach((ev) => {
      if (clampedMs >= ev.triggerMs && clampedMs < ev.clearMs) {
        activeTyped = ev.value;
        activeWrong = !ev.isRight;
      } else if (clampedMs >= ev.triggerMs && ev.isRight) {
        activeTyped = ev.value;
        activeWrong = false;
      }
    });
  }

  return {
    right: rCount,
    wrong: wCount,
    score: rCount - wCount,
    activeSeg,
    activeTyped,
    activeWrong,
    totalQuestions: segments.length,
    isFinished: clampedMs >= totalDurationMs
  };
}

function renderOpponentQuestion(oppName, oppStats) {
  if (!raceOppEq || !oppStats || !oppStats.activeSeg) return;
  const q = normalizeQuestionRecord(oppStats.activeSeg.question, activeConfigId);
  if (raceOppName) {
    raceOppName.textContent = `👀 ${oppName}`;
  }
  if (raceOppStep) {
    raceOppStep.textContent = oppStats.isFinished
      ? `Done (${oppStats.totalQuestions} Qs)`
      : `Q ${oppStats.activeSeg.index + 1}/${oppStats.totalQuestions}`;
  }
  if (q.op === '?') {
    if (raceOppMath) raceOppMath.classList.add('hidden');
    if (raceOppQuiz) {
      raceOppQuiz.classList.remove('hidden');
      const slotClass =
        'race-opp-slot' +
        (oppStats.activeTyped === '' ? ' empty' : oppStats.activeWrong ? ' wrong' : ' right');
      const promptHtml = isMapVal(q.prompt)
        ? `<span class="race-opp-mini-map">${renderGeoMapSvg(q.prompt, { variant: 'mini' })}</span>`
        : escapeHtml(q.prompt);
      let ansHtml;
      if (oppStats.activeTyped === '') {
        ansHtml = '?';
      } else if (isMapVal(oppStats.activeTyped)) {
        ansHtml = `<span class="race-opp-mini-map">${renderGeoMapSvg(oppStats.activeTyped, { variant: 'mini' })}</span>`;
      } else {
        ansHtml = escapeHtml(oppStats.activeTyped);
      }
      raceOppQuiz.innerHTML = `${promptHtml} → <span class="${slotClass}">${ansHtml}</span>`;
    }
    return;
  }

  if (raceOppMath) raceOppMath.classList.remove('hidden');
  if (raceOppQuiz) raceOppQuiz.classList.add('hidden');

  if (raceOppOp) {
    raceOppOp.textContent = q.op === '-' ? '−' : q.op;
  }
  const oppSlots = [raceOppSlot0, raceOppSlot1, raceOppSlot2];
  oppSlots.forEach((slotEl, idx) => {
    if (!slotEl) return;
    slotEl.className = 'race-opp-item';
    if (idx === q.missingIndex) {
      slotEl.classList.add('race-opp-slot');
      if (oppStats.activeTyped === '') {
        slotEl.classList.add('empty');
        slotEl.textContent = '?';
      } else {
        slotEl.textContent = oppStats.activeTyped;
        if (oppStats.activeWrong) {
          slotEl.classList.add('wrong');
        } else {
          slotEl.classList.add('right');
        }
      }
    } else {
      slotEl.textContent = q.nums[idx];
    }
  });
}

function updateRaceHud() {
  if (!isRaceMode || !raceSessionData || !raceHudBar) return;
  const elapsedMs = Date.now() - gameStartTime;
  const oppStats = getOpponentStatsAt(raceSessionData.timeline, elapsedMs);
  const myScore = rightCount - wrongCount;
  const oppScore = oppStats.score;
  const diff = myScore - oppScore;
  const oppName = raceSessionData.session.username || 'Opponent';

  if (raceVsText) {
    raceVsText.textContent = `⚔️ You: ${myScore} vs ${oppName}: ${oppScore}`;
  }
  if (raceDiffBadge) {
    raceDiffBadge.className =
      'race-diff-badge ' + (diff > 0 ? 'ahead' : diff < 0 ? 'behind' : 'tied');
    raceDiffBadge.textContent = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : 'Tied';
  }
}

function tickRaceHud() {
  if (!isPlaying || !isRaceMode || !raceSessionData) return;
  updateRaceHud();
  raceRafId = requestAnimationFrame(tickRaceHud);
}

function updateHud() {
  const score = rightCount - wrongCount;
  scoreDisplay.textContent = score;
  rightDisplay.textContent = rightCount;
  wrongDisplay.textContent = wrongCount;
  timerDisplay.textContent = `${timeLeft}s`;
  if (isRaceMode) {
    updateRaceHud();
  }
}

function schedulePracticeWrongAdvance(delayMs) {
  if (quizChoiceLockTimeout) {
    clearTimeout(quizChoiceLockTimeout);
    quizChoiceLockTimeout = null;
  }
  quizChoiceLockTimeout = setTimeout(() => {
    quizChoiceLockTimeout = null;
    isPracticeWrongPaused = false;
    if (isPlaying && !isReplaying) {
      nextQuestion();
    }
  }, delayMs);
}

function advanceFromPracticeWrong() {
  if (!isPlaying || isReplaying || !isPracticeWrongPaused) return false;
  if (Date.now() - practiceWrongShownAt < 220) return true;
  if (quizChoiceLockTimeout) {
    clearTimeout(quizChoiceLockTimeout);
    quizChoiceLockTimeout = null;
  }
  isPracticeWrongPaused = false;
  nextQuestion();
  return true;
}

function nextQuestion() {
  if (quizChoiceLockTimeout) {
    clearTimeout(quizChoiceLockTimeout);
    quizChoiceLockTimeout = null;
  }
  isPracticeWrongPaused = false;
  if (equationCard) {
    equationCard.classList.remove('is-practice-paused');
  }
  stopStudySpeech();
  if (quizPracticeNote) {
    quizPracticeNote.textContent = '';
    quizPracticeNote.classList.add('hidden');
  }
  if (quizPracticeHint) {
    quizPracticeHint.classList.add('hidden');
  }
  currentQuestion = generateQuestion();
  typedAnswer = '';
  isWrong = false;
  questionStartTime = Date.now();
  currentQuestionRecord = currentQuestion
    ? {
        nums: [...currentQuestion.nums],
        op: currentQuestion.op,
        missingIndex: currentQuestion.missingIndex,
        prompt: currentQuestion.prompt,
        expected: currentQuestion.answer,
        distractor: currentQuestion.distractor,
        choices: currentQuestion.choices ? [...currentQuestion.choices] : undefined,
        answers: [],
        wrongAnswers: [],
        right: 0,
        wrong: 0,
        durationMs: 0
      }
    : null;
  renderQuestion();
  if (isPlaying && isPracticeMode && !isReplaying && studyAutoSpeak && isSpeechSynthesisSupported()) {
    const payload = getStudyPromptSpeakPayload(getActiveConfig(), currentQuestion, false);
    if (payload && hasSpeechVoiceForLang(payload.lang)) {
      speakStudyText(payload.text, payload.lang);
    }
  }
}

function handleChoiceInput(choiceIdx) {
  if (!isPlaying || isReplaying || !currentQuestion || currentQuestion.op !== '?') return;
  if (isPracticeWrongPaused) {
    advanceFromPracticeWrong();
    return;
  }
  if (quizChoiceLockTimeout) return;
  const choices = currentQuestion.choices || [];
  if (choiceIdx < 0 || choiceIdx >= choices.length) return;

  playKeyClickSound();
  const chosenText = String(choices[choiceIdx]);
  const expectedStr = String(currentQuestion.answer);

  if (chosenText === expectedStr) {
    rightCount += 1;
    currentStreak += 1;
    playRightSound(currentStreak);
    if (currentQuestionRecord) {
      currentQuestionRecord.answers.push(chosenText);
      currentQuestionRecord.right = 1;
      currentQuestionRecord.durationMs = Date.now() - questionStartTime;
      currentGameQuestions.push(currentQuestionRecord);
      updateQuestionLastPerformance(userId, activeConfigId, currentQuestionRecord);
      currentQuestionRecord = null;
    }
    updateHud();
    nextQuestion();
    return;
  }

  // Wrong choice on 2-choice question: deduct 1 point, flash wrong/right briefly, and move to next question
  wrongCount += 1;
  currentStreak = 0;
  typedAnswer = chosenText;
  isWrong = true;
  playWrongSound();
  if (currentQuestionRecord) {
    currentQuestionRecord.answers.push(chosenText);
    currentQuestionRecord.wrongAnswers.push(chosenText);
    currentQuestionRecord.wrong = 1;
    currentQuestionRecord.right = 0;
    currentQuestionRecord.durationMs = Date.now() - questionStartTime;
    currentGameQuestions.push(currentQuestionRecord);
    updateQuestionLastPerformance(userId, activeConfigId, currentQuestionRecord);
    currentQuestionRecord = null;
  }
  updateHud();
  if (isPracticeMode) {
    isPracticeWrongPaused = true;
    practiceWrongShownAt = Date.now();
    renderQuestion();
    let autoSpoke = false;
    if (studyAutoSpeak && isSpeechSynthesisSupported()) {
      const payload = getStudyPromptSpeakPayload(getActiveConfig(), currentQuestion, true);
      if (payload && hasSpeechVoiceForLang(payload.lang)) {
        speakStudyText(payload.text, payload.lang);
        autoSpoke = true;
      }
    }
    schedulePracticeWrongAdvance((currentQuestion.note || autoSpoke) ? 2800 : 1200);
  } else {
    renderQuestion();
    quizChoiceLockTimeout = setTimeout(() => {
      quizChoiceLockTimeout = null;
      if (isPlaying && !isReplaying) {
        nextQuestion();
      }
    }, 190);
  }
}

function handleDigitInput(digitStr) {
  if (!isPlaying || isReplaying || !currentQuestion || currentQuestion.op === '?') return;

  playKeyClickSound();

  // Wrong question automatically erases the answer when a new answer starts being typed
  if (isWrong) {
    typedAnswer = '';
    isWrong = false;
  }

  typedAnswer += digitStr;
  const expectedStr = String(currentQuestion.answer);

  // Right question automatically goes to the next question
  if (typedAnswer === expectedStr) {
    rightCount += 1;
    currentStreak += 1;
    playRightSound(currentStreak);
    if (currentQuestionRecord) {
      currentQuestionRecord.answers.push(typedAnswer);
      currentQuestionRecord.right = 1;
      currentQuestionRecord.durationMs = Date.now() - questionStartTime;
      currentGameQuestions.push(currentQuestionRecord);
      updateQuestionLastPerformance(userId, activeConfigId, currentQuestionRecord);
    }
    updateHud();
    nextQuestion();
    return;
  }

  // If the expected answer starts with the typed prefix (e.g. multi-digit or leading '-'), wait for next key
  if (expectedStr.startsWith(typedAnswer)) {
    renderQuestion();
    return;
  }

  // Otherwise, the typed answer is wrong
  wrongCount += 1;
  currentStreak = 0;
  isWrong = true;
  playWrongSound();
  if (currentQuestionRecord) {
    currentQuestionRecord.answers.push(typedAnswer);
    currentQuestionRecord.wrongAnswers.push(typedAnswer);
    currentQuestionRecord.wrong += 1;
    currentQuestionRecord.durationMs = Date.now() - questionStartTime;
  }
  updateHud();
  renderQuestion();
}

function stopCelebration() {
  if (celebrationRafId) {
    cancelAnimationFrame(celebrationRafId);
    celebrationRafId = null;
  }
  if (celebrationCanvas) {
    celebrationCanvas.classList.add('hidden');
    const ctx = celebrationCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, celebrationCanvas.width, celebrationCanvas.height);
    }
  }
}

function triggerCelebration(isNewHigh = false) {
  playVictorySound(isNewHigh);
  if (lastResult) {
    lastResult.classList.remove('celebrate-pop');
    void lastResult.offsetWidth;
    lastResult.classList.add('celebrate-pop');
  }

  if (!celebrationCanvas) return;
  stopCelebration();

  const dpr = window.devicePixelRatio || 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  celebrationCanvas.width = vw * dpr;
  celebrationCanvas.height = vh * dpr;
  celebrationCanvas.classList.remove('hidden');

  const ctx = celebrationCanvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  let originX = vw / 2;
  let originY = Math.min(vh * 0.25, 160);
  if (lastResult) {
    const rect = lastResult.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
    }
  }

  const colors = isNewHigh
    ? ['#16a34a', '#22c55e', '#f59e0b', '#fbbf24', '#2563eb', '#ec4899', '#8b5cf6']
    : ['#2563eb', '#3b82f6', '#16a34a', '#f59e0b', '#ec4899', '#06b6d4'];

  const count = isNewHigh ? 90 : 55;
  const particles = [];

  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15;
    const speed = (isNewHigh ? 6.5 : 5.2) + Math.random() * (isNewHigh ? 8.5 : 6.5);
    particles.push({
      x: originX + (Math.random() - 0.5) * 90,
      y: originY + (Math.random() - 0.5) * 24,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 2.5,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 5,
      color: colors[i % colors.length],
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.25,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.08 + Math.random() * 0.08,
      isCircle: i % 5 === 0,
      opacity: 1
    });
  }

  const startMs = performance.now();
  const maxDurationMs = 2400;

  function frame(now) {
    const elapsed = now - startMs;
    ctx.clearRect(0, 0, vw, vh);

    let alive = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.wobble += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobble) * 0.6;
      p.y += p.vy;
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.26;
      p.rotation += p.spin;

      if (elapsed > maxDurationMs * 0.65) {
        p.opacity = Math.max(0, 1 - (elapsed - maxDurationMs * 0.65) / (maxDurationMs * 0.35));
      }

      if (p.y < vh + 30 && p.opacity > 0.02) {
        alive += 1;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.isCircle) {
          ctx.beginPath();
          ctx.arc(0, 0, p.w * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.cos(p.wobble));
        }
        ctx.restore();
      }
    }

    if (alive > 0 && elapsed < maxDurationMs) {
      celebrationRafId = requestAnimationFrame(frame);
    } else {
      stopCelebration();
    }
  }

  celebrationRafId = requestAnimationFrame(frame);
}

let pendingFullscreenPromise = null;

function enterAndroidImmersiveFullscreen() {
  if (!/Android/i.test(navigator.userAgent)) return Promise.resolve();
  if (document.fullscreenElement) return Promise.resolve();
  if (pendingFullscreenPromise) return pendingFullscreenPromise;
  const docEl = document.documentElement;
  if (docEl.requestFullscreen) {
    pendingFullscreenPromise = docEl
      .requestFullscreen({ navigationUI: 'hide' })
      .catch(() => {})
      .finally(() => {
        pendingFullscreenPromise = null;
      });
    return pendingFullscreenPromise;
  }
  return Promise.resolve();
}

async function startGame(practice = false, raceTargetSession = null) {
  enterAndroidImmersiveFullscreen();
  if (isPlaying || isLoadingStudyPack) return;
  stopCelebration();
  if (raceRafId) {
    cancelAnimationFrame(raceRafId);
    raceRafId = null;
  }
  if (isReplaying) {
    stopReplay(false);
  }
  saveUsername(usernameInput.value);
  closeNewConfigPanel();

  if (raceTargetSession && raceTargetSession.configId && configs.some(c => c.id === raceTargetSession.configId)) {
    activeConfigId = raceTargetSession.configId;
    localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
    renderConfigsUI();
    renderLeaderboard();
    renderReview();
  }

  const activeCfg = getActiveConfig();
  if (activeCfg && activeCfg.isLazyStudy && !activeCfg.studyDataLoaded && typeof ensureStudyConfigLoaded === "function") {
    isLoadingStudyPack = true;
    const prevPlayText = playBtn ? playBtn.textContent : "";
    const prevPracticeText = practiceBtn ? practiceBtn.textContent : "";
    if (playBtn) {
      playBtn.disabled = true;
      if (!practice && !raceTargetSession) playBtn.textContent = "Loading…";
    }
    if (practiceBtn) {
      practiceBtn.disabled = true;
      if (practice) practiceBtn.textContent = "Loading…";
    }
    let loaded = false;
    try {
      loaded = await ensureStudyConfigLoaded(activeCfg);
    } finally {
      isLoadingStudyPack = false;
      if (playBtn) {
        playBtn.disabled = false;
        playBtn.textContent = prevPlayText || "Play 1-Minute Game";
      }
      if (practiceBtn) {
        practiceBtn.disabled = false;
        practiceBtn.textContent = prevPracticeText || "Practice Weak & Slow";
      }
    }
    if (!loaded || isPlaying) {
      if (!loaded) {
        showAppNotice("Could not load this study pack. Please check your connection and try again.", { isError: true });
      }
      return;
    }
  }
  if (!isConfigPlayable(activeCfg)) return;
  const isQuiz = isQuizConfig(activeCfg);

  isPlaying = true;
  isRaceMode = Boolean(raceTargetSession && Array.isArray(raceTargetSession.questions) && raceTargetSession.questions.length > 0);
  isPracticeMode = !isRaceMode && Boolean(practice);
  raceSessionData = isRaceMode
    ? {
        session: raceTargetSession,
        timeline: buildReplayTimeline(raceTargetSession),
        questionIndex: 0
      }
    : null;
  timeLeft = GAME_DURATION_SECONDS;
  rightCount = 0;
  wrongCount = 0;
  currentStreak = 0;
  currentQuestion = null;
  gameStartTime = Date.now();
  currentGameQuestions = [];
  currentGameQuizDeck = [];
  currentGameQuizDeckConfigId = '';
  currentGameSeenKeys = new Set();
  currentGameRecentKeys = [];
  currentQuestionRecord = null;
  getAudioContext();

  if (replayPanel) replayPanel.classList.add('hidden');
  if (replayRaceChartWrap) replayRaceChartWrap.classList.add('hidden');
  if (replayResultBanner) replayResultBanner.classList.add('hidden');
  if (raceHudBar) raceHudBar.classList.toggle('hidden', !isRaceMode);
  if (raceOppEq) raceOppEq.classList.add('hidden');
  keypad.classList.toggle('hidden', isQuiz);
  if (quizChoicesEl) {
    quizChoicesEl.classList.remove('replay-compact');
    quizChoicesEl.classList.toggle('hidden', !isQuiz);
  }
  gameView.classList.toggle('is-quiz-mode', isQuiz);
  gameView.classList.toggle('is-math-mode', !isQuiz);
  gameView.classList.toggle('is-race-mode', isRaceMode);
  if (gameLandscapeBtn) gameLandscapeBtn.classList.remove('hidden');
  quitBtn.textContent = isRaceMode ? 'End Race' : isPracticeMode ? 'End Practice' : 'End Game';
  deleteUserBtn.classList.add('hidden');
  updateInstallBtnVisibility();
  if (userView) userView.classList.remove('active');
  homeView.classList.remove('active');
  gameView.classList.add('active');
  updateLandscapeToggleUI();
  applyGameplayOrientation();

  updateHud();
  nextQuestion();

  if (isRaceMode) {
    raceRafId = requestAnimationFrame(tickRaceHud);
  }

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft -= 1;
    updateHud();
    if (timeLeft >= 1 && timeLeft <= 5) {
      playCountdownTickSound(timeLeft);
    }
    if (timeLeft <= 0) {
      finishGame(true);
    }
  }, 1000);
}

function startRace(targetSession) {
  if (!targetSession || !Array.isArray(targetSession.questions) || targetSession.questions.length === 0) return;
  startGame(false, targetSession);
}

async function finishGame(saveScore) {
  clearInterval(timerInterval);
  timerInterval = null;
  if (quizChoiceLockTimeout) {
    clearTimeout(quizChoiceLockTimeout);
    quizChoiceLockTimeout = null;
  }
  isPracticeWrongPaused = false;
  if (equationCard) {
    equationCard.classList.remove('is-practice-paused');
  }
  stopStudySpeech();
  if (quizPracticeNote) {
    quizPracticeNote.textContent = '';
    quizPracticeNote.classList.add('hidden');
  }
  if (quizPracticeHint) {
    quizPracticeHint.classList.add('hidden');
  }
  if (quizSpeakBtn) {
    quizSpeakBtn.classList.add('hidden');
  }
  if (quizAutoSpeakBtn) {
    quizAutoSpeakBtn.classList.add('hidden');
  }
  if (raceRafId) {
    cancelAnimationFrame(raceRafId);
    raceRafId = null;
  }
  isPlaying = false;
  const wasPractice = isPracticeMode;
  const wasRace = isRaceMode;
  const finishedRaceSession = raceSessionData ? raceSessionData.session : null;
  isPracticeMode = false;
  isRaceMode = false;
  raceSessionData = null;
  if (raceHudBar) raceHudBar.classList.add('hidden');
  if (raceOppEq) raceOppEq.classList.add('hidden');

  if (currentQuestionRecord && currentQuestionRecord.wrong > 0) {
    currentQuestionRecord.durationMs = Date.now() - questionStartTime;
    currentGameQuestions.push(currentQuestionRecord);
    updateQuestionLastPerformance(userId, activeConfigId, currentQuestionRecord);
    currentQuestionRecord = null;
  }
  flushQuestionStatsToStorage();

  const finalScore = rightCount - wrongCount;
  const gameDurationMs = Date.now() - gameStartTime;
  const normalizedQuestions = currentGameQuestions.map(q => normalizeQuestionRecord(q, activeConfigId));

  deleteUserBtn.classList.remove('hidden');
  updateInstallBtnVisibility();
  if (gameLandscapeBtn) gameLandscapeBtn.classList.add('hidden');
  gameView.classList.remove('active', 'is-quiz-mode', 'is-math-mode', 'is-race-mode');
  applyGameplayOrientation();
  homeView.classList.add('active');
  updateAllSwitcherRowsOverflow();

  if (saveScore) {
    let opponentRecord = null;
    if (wasRace && finishedRaceSession) {
      const oppRight = typeof finishedRaceSession.right === 'number' ? finishedRaceSession.right : 0;
      const oppWrong = typeof finishedRaceSession.wrong === 'number' ? finishedRaceSession.wrong : 0;
      const oppScore = typeof finishedRaceSession.score === 'number'
        ? finishedRaceSession.score
        : oppRight - oppWrong;
      opponentRecord = {
        username: finishedRaceSession.username || 'Opponent',
        score: oppScore,
        right: oppRight,
        wrong: oppWrong,
        durationMs: finishedRaceSession.durationMs || GAME_DURATION_SECONDS * 1000,
        questions: (finishedRaceSession.questions || []).map(q => normalizeQuestionRecord(q, activeConfigId))
      };
    }

    const sessionRecord = {
      userId,
      username,
      configId: activeConfigId,
      playedAt: Date.now(),
      isPractice: wasPractice || wasRace,
      isRace: wasRace,
      opponent: opponentRecord,
      score: finalScore,
      right: rightCount,
      wrong: wrongCount,
      durationMs: gameDurationMs,
      questions: normalizedQuestions
    };
    lastCompletedSession = sessionRecord;
    saveGameReviewToStorage(sessionRecord);
    renderReview();

    const hasReplayableQuestions = normalizedQuestions.length > 0;
    if (replayLastBtn) replayLastBtn.classList.toggle('hidden', !hasReplayableQuestions);

    if (wasRace && opponentRecord) {
      const oppName = opponentRecord.username;
      const oppRight = opponentRecord.right;
      const oppWrong = opponentRecord.wrong;
      const oppScore = opponentRecord.score;
      const diff = finalScore - oppScore;
      const diffStr = diff > 0 ? `+${diff}` : String(diff);

      lastResult.classList.toggle('new-high-score', diff > 0);
      if (diff > 0) {
        lastScoreLabel.textContent = `🏆 Beat ${oppName}! (${diffStr}) · Not Ranked`;
      } else if (diff === 0) {
        lastScoreLabel.textContent = `🤝 Tied with ${oppName}! · Not Ranked`;
      } else {
        lastScoreLabel.textContent = `⚔️ Race vs ${oppName} (${diffStr}) · Not Ranked`;
      }
      lastScoreValue.textContent = finalScore;
      lastScoreDetail.textContent = `You: ${finalScore} (${rightCount}✓ ${wrongCount}✗) · ${oppName}: ${oppScore} (${oppRight}✓ ${oppWrong}✗)`;
      lastResult.classList.remove('hidden');
      triggerCelebration(diff > 0);
    } else if (wasPractice) {
      lastResult.classList.remove('new-high-score');
      lastScoreLabel.textContent = 'Practice Score (Not Ranked)';
      lastScoreValue.textContent = finalScore;
      lastScoreDetail.textContent = `${rightCount} right · ${wrongCount} wrong`;
      lastResult.classList.remove('hidden');
      triggerCelebration(false);
    } else {
      const cachedEntry = leaderboardsMap[activeConfigId] && leaderboardsMap[activeConfigId][userId];
      const isInitialNewHigh =
        finalScore > 0 &&
        (!cachedEntry || typeof cachedEntry.score !== 'number' || finalScore > cachedEntry.score);
      lastResult.classList.toggle('new-high-score', isInitialNewHigh);
      lastScoreLabel.textContent = isInitialNewHigh ? '★ New High Score!' : 'Last Score';
      lastScoreValue.textContent = finalScore;
      lastScoreDetail.textContent = `${rightCount} right · ${wrongCount} wrong`;
      lastResult.classList.remove('hidden');
      triggerCelebration(isInitialNewHigh);
      await submitScoreToLeaderboard(finalScore, sessionRecord);
    }
  } else {
    renderReview();
  }
}
