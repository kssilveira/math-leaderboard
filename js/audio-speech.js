// --- Sound Effects (Web Audio API), Haptics & Study Speech Synthesis ---

let audioCtx = null;
let cachedSpeechVoices = [];

function getAudioContext() {
  if (!isSoundEnabled) return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioCtx();
    } catch (_) {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function triggerHaptic(pattern) {
  if (!isSoundEnabled) return;
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (_) {}
  }
}

function updateSoundToggleUI() {
  if (!soundToggleBtn) return;
  soundToggleBtn.textContent = isSoundEnabled ? '🔊' : '🔇';
  soundToggleBtn.classList.toggle('muted', !isSoundEnabled);
  soundToggleBtn.setAttribute('aria-pressed', isSoundEnabled ? 'true' : 'false');
  soundToggleBtn.title = isSoundEnabled
    ? 'Sound & haptics on (tap to mute)'
    : 'Sound & haptics muted (tap to unmute)';
}

function toggleSound() {
  isSoundEnabled = !isSoundEnabled;
  localStorage.setItem(STORAGE_KEYS.soundEnabled, isSoundEnabled ? '1' : '0');
  updateSoundToggleUI();
  if (isSoundEnabled) {
    playKeyClickSound();
  }
}

function playKeyClickSound() {
  triggerHaptic(6);
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.024);
  gain.gain.setValueAtTime(0.055, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.026);
}

function playRightSound(streak = 1) {
  triggerHaptic(10);
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const semitones = Math.min(Math.max(0, streak - 1), 14);
  const baseFreq = 523.25 * Math.pow(2, semitones / 12);
  const notes = [baseFreq, baseFreq * 1.2599];

  notes.forEach((freq, i) => {
    const start = now + i * 0.045;
    const dur = i === 0 ? 0.08 : 0.14;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.095, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.01);
  });
}

function playWrongSound() {
  triggerHaptic([35, 30, 45]);
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(165, now);
  osc.frequency.setValueAtTime(125, now + 0.075);
  gain.gain.setValueAtTime(0.075, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.18);
}

function playCountdownTickSound(secondsLeft) {
  triggerHaptic(8);
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  const freq = secondsLeft <= 1 ? 987.77 : 783.99;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.048);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.052);
}

function playVictorySound(isNewHigh = false) {
  triggerHaptic(isNewHigh ? [20, 40, 20, 40, 55] : [18, 35, 35]);
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = isNewHigh
    ? [523.25, 659.25, 783.99, 1046.5, 1318.51]
    : [523.25, 659.25, 783.99, 1046.5];

  notes.forEach((freq, idx) => {
    const start = now + idx * 0.055;
    const isLast = idx === notes.length - 1;
    const dur = isLast ? 0.36 : 0.16;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.095, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.01);
  });
}

function isSpeechSynthesisSupported() {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance === 'function'
  );
}

function refreshSpeechVoices() {
  if (!isSpeechSynthesisSupported() || typeof window.speechSynthesis.getVoices !== 'function') return;
  try {
    const voices = window.speechSynthesis.getVoices();
    if (Array.isArray(voices) && voices.length > 0) {
      cachedSpeechVoices = voices;
    }
  } catch (_) {}
}

function initSpeechVoices() {
  if (!isSpeechSynthesisSupported()) return;
  refreshSpeechVoices();
  try {
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', refreshSpeechVoices);
    } else if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = refreshSpeechVoices;
    }
  } catch (_) {}
}

function stopStudySpeech() {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch (_) {}
}

function pickSpeechVoice(langCode) {
  const meta = typeof STUDY_LANGUAGE_META !== 'undefined' ? STUDY_LANGUAGE_META[langCode] : null;
  const bcp47 = ((meta && meta.bcp47) || langCode || 'en-US').replace(/_/g, '-').toLowerCase();
  const prefix = bcp47.split('-')[0];
  refreshSpeechVoices();
  const voices = cachedSpeechVoices.length > 0
    ? cachedSpeechVoices
    : (isSpeechSynthesisSupported() && window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : []);
  if (!Array.isArray(voices) || voices.length === 0) return null;

  let bestVoice = null;
  let bestScore = -1;
  voices.forEach((v) => {
    const vLang = String(v && v.lang || '').replace(/_/g, '-').toLowerCase();
    if (!vLang) return;
    const isExact = vLang === bcp47;
    const isPrefix = vLang === prefix || vLang.startsWith(`${prefix}-`);
    if (!isExact && !isPrefix) return;
    let score = isExact ? 10 : 4;
    if (/google|natural|enhanced|premium|neural|compact/i.test(String(v.name || ''))) {
      score += 5;
    }
    if (v.default) {
      score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestVoice = v;
    }
  });
  return bestVoice;
}

function hasSpeechVoiceForLang(langCode) {
  if (!isSpeechSynthesisSupported()) return false;
  refreshSpeechVoices();
  const voices = cachedSpeechVoices.length > 0
    ? cachedSpeechVoices
    : (window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : []);
  if (!Array.isArray(voices) || voices.length === 0) return true;
  return Boolean(pickSpeechVoice(langCode));
}

function speakStudyText(text, langCode) {
  if (!isSpeechSynthesisSupported()) return;
  const cleanText = String(text || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*—\s*/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleanText) return;
  const meta = typeof STUDY_LANGUAGE_META !== 'undefined' ? STUDY_LANGUAGE_META[langCode] : null;
  const bcp47 = (meta && meta.bcp47) || langCode || 'en-US';
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = bcp47;
    utterance.rate = 0.95;
    const picked = pickSpeechVoice(langCode);
    if (picked) utterance.voice = picked;
    window.speechSynthesis.speak(utterance);
  } catch (_) {}
}

function syncAutoSpeakBtnUI(activeCfg) {
  if (!quizAutoSpeakBtn) return;
  const canAutoSpeak = Boolean(
    isPracticeMode &&
    !isReplaying &&
    getConfigCategory(activeCfg) === 'study' &&
    activeCfg &&
    activeCfg.studyLearn &&
    hasSpeechVoiceForLang(activeCfg.studyLearn)
  );
  quizAutoSpeakBtn.classList.toggle('hidden', !canAutoSpeak);
  quizAutoSpeakBtn.classList.toggle('active', studyAutoSpeak);
  quizAutoSpeakBtn.setAttribute('aria-pressed', studyAutoSpeak ? 'true' : 'false');
  quizAutoSpeakBtn.textContent = studyAutoSpeak ? '🔊 Auto' : 'Auto';
}

function getStudyPromptSpeakPayload(cfg, q, revealAnswer = false) {
  if (!cfg || !q || getConfigCategory(cfg) !== 'study' || !cfg.studyLearn) return null;
  if (revealAnswer) {
    return getStudyReviewSpeakPayload(cfg, q);
  }
  if (cfg.studyTrackKey === 'vocab_fwd' || cfg.studyTrackKey === 'phrases_fwd') {
    const text = String(q.prompt || '').trim();
    return text ? { text, lang: cfg.studyLearn } : null;
  }
  return null;
}

function getStudyReviewSpeakPayload(cfg, q) {
  if (!cfg || !q || getConfigCategory(cfg) !== 'study' || !cfg.studyLearn) return null;
  const track = cfg.studyTrackKey || '';
  const expectedVal = q.expected !== undefined ? q.expected : q.answer;
  let text = '';
  if (track === 'vocab_fwd' || track === 'phrases_fwd') {
    text = String(q.prompt || '');
  } else if (track === 'vocab_rev' || track === 'phrases_rev') {
    text = String(expectedVal || '');
  } else {
    const promptStr = String(q.prompt || '');
    text = promptStr.includes('___')
      ? fillClozePlainText(promptStr, expectedVal)
      : String(expectedVal || promptStr);
  }
  text = text.trim();
  return text ? { text, lang: cfg.studyLearn } : null;
}
