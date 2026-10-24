const FIREBASE_DB_URL = 'https://math-leaderboard-122f4-default-rtdb.europe-west1.firebasedatabase.app';

const STORAGE_KEYS = {
  users: 'math_users_v1',
  userId: 'math_user_id',
  username: 'math_username',
  activeConfigId: 'math_active_config_id',
  gameHistory: 'math_game_history_v1',
  questionStats: 'math_question_stats_v1',
  reviewExpanded: 'math_review_expanded_v1'
};

const GAME_DURATION_SECONDS = 60;
const ALL_OPS = ['+', '-', '×', '÷'];

// State
let users = []; // [{ userId: string, username: string }]
let userId = '';
let username = '';

let configs = []; // [{ id, ops, min1, max1, min2, max2, min3, max3 }]
let leaderboardsMap = {}; // { [configId]: { [userId]: { userId, username, score, updatedAt } } }
let activeConfigId = '';
let draftConfig = null;

let timerInterval = null;
let timeLeft = GAME_DURATION_SECONDS;
let isPlaying = false;
let isPracticeMode = false;
let isRaceMode = false;
let raceSessionData = null;
let raceRafId = null;
let isReplaying = false;
let isReplayPaused = false;
let replaySpeed = 1;
let replayRafId = null;
let replaySessionData = null;
let replayElapsedMs = 0;
let replayLastTickTime = 0;
let lastCompletedSession = null;
let hasHandledInitialUrlReplay = false;
let rightCount = 0;
let wrongCount = 0;
let currentQuestion = null; // { nums: [a, b, c], op, missingIndex: 0|1|2, answer: number, key: string, lastPerf?: object }
let typedAnswer = '';
let isWrong = false;
let gameStartTime = 0;
let questionStartTime = 0;
let currentQuestionRecord = null;
let currentGameQuestions = [];
let reviewSortMode = 'improve'; // 'improve' | 'order' | 'practice'
let isReviewExpanded = localStorage.getItem(STORAGE_KEYS.reviewExpanded) === '1';

// DOM Elements
const usernameInput = document.getElementById('username-input');
const userListEl = document.getElementById('user-list');
const addUserBtn = document.getElementById('add-user-btn');
const deleteUserBtn = document.getElementById('delete-user-btn');

const configListEl = document.getElementById('config-list');
const addConfigBtn = document.getElementById('add-config-btn');
const newConfigPanel = document.getElementById('new-config-panel');
const cancelConfigBtn = document.getElementById('cancel-config-btn');
const saveConfigBtn = document.getElementById('save-config-btn');
const opToggleBtns = Array.from(document.querySelectorAll('.op-toggle'));
const min1Input = document.getElementById('min1-input');
const max1Input = document.getElementById('max1-input');
const min2Input = document.getElementById('min2-input');
const max2Input = document.getElementById('max2-input');
const min3Input = document.getElementById('min3-input');
const max3Input = document.getElementById('max3-input');
const configErrorEl = document.getElementById('config-error');
const leaderboardConfigBadge = document.getElementById('leaderboard-config-badge');

const homeView = document.getElementById('home-view');
const gameView = document.getElementById('game-view');
const playBtn = document.getElementById('play-btn');
const practiceBtn = document.getElementById('practice-btn');
const quitBtn = document.getElementById('quit-btn');
const lastResult = document.getElementById('last-result');
const lastScoreLabel = document.getElementById('last-score-label');
const lastScoreValue = document.getElementById('last-score-value');
const lastScoreDetail = document.getElementById('last-score-detail');
const replayLastBtn = document.getElementById('replay-last-btn');
const raceLastBtn = document.getElementById('race-last-btn');
const shareLastBtn = document.getElementById('share-last-btn');
const myRankValue = document.getElementById('my-rank-value');
const myBestValue = document.getElementById('my-best-value');
const myBestActions = document.getElementById('my-best-actions');
const replayBestBtn = document.getElementById('replay-best-btn');
const raceBestBtn = document.getElementById('race-best-btn');
const shareBestBtn = document.getElementById('share-best-btn');
const leaderboardList = document.getElementById('leaderboard-list');
const reviewCard = document.getElementById('review-card');
const reviewToggleBtn = document.getElementById('review-toggle-btn');
const reviewChevron = document.getElementById('review-chevron');
const reviewBody = document.getElementById('review-body');
const reviewSummaryBadge = document.getElementById('review-summary-badge');
const chartSection = document.querySelector('.chart-section');
const historyChart = document.getElementById('history-chart');
const sortImproveBtn = document.getElementById('sort-improve-btn');
const sortOrderBtn = document.getElementById('sort-order-btn');
const sortPracticeBtn = document.getElementById('sort-practice-btn');
const reviewList = document.getElementById('review-list');
const timerDisplay = document.getElementById('timer-display');
const scoreDisplay = document.getElementById('score-display');
const rightDisplay = document.getElementById('right-display');
const wrongDisplay = document.getElementById('wrong-display');
const questionLastPerf = document.getElementById('question-last-perf');
const slot0 = document.getElementById('slot-0');
const slot1 = document.getElementById('slot-1');
const slot2 = document.getElementById('slot-2');
const slotOp = document.getElementById('slot-op');
const keypad = document.getElementById('keypad');
const minusKey = document.getElementById('minus-key');
const replayPanel = document.getElementById('replay-panel');
const replayResultBanner = document.getElementById('replay-result-banner');
const replayBannerLabel = document.getElementById('replay-banner-label');
const replayBannerValue = document.getElementById('replay-banner-value');
const replayBannerDetail = document.getElementById('replay-banner-detail');
const replayBannerRestartBtn = document.getElementById('replay-banner-restart-btn');
const replayBannerRaceBtn = document.getElementById('replay-banner-race-btn');
const replayBannerShareBtn = document.getElementById('replay-banner-share-btn');
const replayPlayBtn = document.getElementById('replay-play-btn');
const replayTitle = document.getElementById('replay-title');
const replayStepBadge = document.getElementById('replay-step-badge');
const replayPauseBtn = document.getElementById('replay-pause-btn');
const replaySpeedBtn = document.getElementById('replay-speed-btn');
const replayRestartBtn = document.getElementById('replay-restart-btn');
const replayRaceBtn = document.getElementById('replay-race-btn');
const replayShareBtn = document.getElementById('replay-share-btn');
const replayLogList = document.getElementById('replay-log-list');
const replayTimeline = document.getElementById('replay-timeline');
const replayTimelineSegments = document.getElementById('replay-timeline-segments');
const replayTimelineFill = document.getElementById('replay-timeline-fill');
const replayTimelineMarkers = document.getElementById('replay-timeline-markers');
const replayTimelineThumb = document.getElementById('replay-timeline-thumb');
const raceHudBar = document.getElementById('race-hud-bar');
const raceVsText = document.getElementById('race-vs-text');
const raceDiffBadge = document.getElementById('race-diff-badge');
const raceOppEq = document.getElementById('race-opp-eq');
const raceOppName = document.getElementById('race-opp-name');
const raceOppStep = document.getElementById('race-opp-step');
const raceOppSlot0 = document.getElementById('race-opp-slot-0');
const raceOppSlot1 = document.getElementById('race-opp-slot-1');
const raceOppSlot2 = document.getElementById('race-opp-slot-2');
const raceOppOp = document.getElementById('race-opp-op');
const celebrationCanvas = document.getElementById('celebration-canvas');
const installAppBtn = document.getElementById('install-app-btn');
const installHint = document.getElementById('install-hint');
const installHintText = document.getElementById('install-hint-text');
const installHintClose = document.getElementById('install-hint-close');
let celebrationRafId = null;
let deferredInstallPrompt = null;

// --- Helpers ---

function generateId(prefix = 'id_') {
  if (window.crypto && crypto.randomUUID) {
    return prefix + crypto.randomUUID();
  }
  return prefix + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

function randomInt(low, high) {
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

// --- Shared Multi-User Identity (LocalStorage) ---

function generateRandomUsername() {
  const adjectives = ['Swift', 'Bright', 'Clever', 'Quick', 'Sharp', 'Lucky', 'Bold', 'Calm', 'Keen', 'Prime'];
  const nouns = ['Fox', 'Owl', 'Lynx', 'Hawk', 'Wolf', 'Bear', 'Otter', 'Falcon', 'Panda', 'Tiger'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj}${noun}${num}`;
}

function saveUsersToStorage() {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  localStorage.setItem(STORAGE_KEYS.userId, userId);
  localStorage.setItem(STORAGE_KEYS.username, username);
}

function renderUserList() {
  userListEl.innerHTML = '';
  users.forEach((u) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill-btn' + (u.userId === userId ? ' active' : '');
    btn.textContent = u.username;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', u.userId === userId ? 'true' : 'false');
    btn.addEventListener('click', () => switchUser(u.userId));
    userListEl.appendChild(btn);
  });
}

function initUsers() {
  const rawUsers = localStorage.getItem(STORAGE_KEYS.users);
  if (rawUsers) {
    try {
      users = JSON.parse(rawUsers);
    } catch (_) {
      users = [];
    }
  }

  if (!Array.isArray(users) || users.length === 0) {
    const existingId = localStorage.getItem(STORAGE_KEYS.userId) || generateId('u_');
    const existingName = localStorage.getItem(STORAGE_KEYS.username) || generateRandomUsername();
    users = [{ userId: existingId, username: existingName }];
  }

  const savedActiveId = localStorage.getItem(STORAGE_KEYS.userId);
  const activeUser = users.find(u => u.userId === savedActiveId) || users[0];

  userId = activeUser.userId;
  username = activeUser.username;
  saveUsersToStorage();

  usernameInput.value = username;
  renderUserList();
}

async function switchUser(targetUserId) {
  if (isPlaying) return;
  const target = users.find(u => u.userId === targetUserId);
  if (!target || target.userId === userId) return;

  userId = target.userId;
  username = target.username;
  saveUsersToStorage();

  usernameInput.value = username;
  lastResult.classList.add('hidden');
  renderUserList();
  renderLeaderboard();
  renderReview();
}

async function addUser() {
  if (isPlaying) return;
  const newUser = {
    userId: generateId('u_'),
    username: generateRandomUsername()
  };
  users.push(newUser);
  userId = newUser.userId;
  username = newUser.username;
  saveUsersToStorage();

  usernameInput.value = username;
  lastResult.classList.add('hidden');
  renderUserList();
  renderLeaderboard();
  renderReview();
}

async function deleteCurrentUser() {
  if (isPlaying) return;
  if (!window.confirm(`Delete user "${username}" and their scores?`)) return;

  const deletedUserId = userId;
  users = users.filter(u => u.userId !== deletedUserId);

  if (users.length === 0) {
    users.push({
      userId: generateId('u_'),
      username: generateRandomUsername()
    });
  }

  userId = users[0].userId;
  username = users[0].username;
  saveUsersToStorage();

  usernameInput.value = username;
  lastResult.classList.add('hidden');
  renderUserList();
  deleteUserReviewFromStorage(deletedUserId);
  renderReview();

  await deleteUserFromFirebase(deletedUserId);
}

async function saveUsername(newName) {
  const cleaned = newName.trim().slice(0, 20);
  if (!cleaned) {
    usernameInput.value = username;
    return;
  }
  if (cleaned === username) return;

  username = cleaned;
  const currentObj = users.find(u => u.userId === userId);
  if (currentObj) {
    currentObj.username = username;
  }
  saveUsersToStorage();
  usernameInput.value = username;
  renderUserList();

  await updateUsernameInFirebase(userId, username);
}

// --- Shared Game Configurations & Leaderboards (Firebase) ---

function getConfigId(cfg) {
  const opNames = { '+': 'add', '-': 'sub', '×': 'mul', '÷': 'div' };
  const opsKey = ALL_OPS.filter(op => cfg.ops.includes(op)).map(op => opNames[op]).join('-');
  return `cfg_${opsKey}_${cfg.min1}_${cfg.max1}_${cfg.min2}_${cfg.max2}_${cfg.min3}_${cfg.max3}`;
}

function createDefaultConfig() {
  const base = {
    ops: ['+', '-'],
    min1: 0,
    max1: 10,
    min2: 0,
    max2: 10,
    min3: 0,
    max3: 20
  };
  return { id: getConfigId(base), ...base };
}

function formatConfigLabel(cfg) {
  const opsStr = cfg.ops.map(op => (op === '-' ? '−' : op)).join(' ');
  return `${opsStr} (${cfg.min1}..${cfg.max1}, ${cfg.min2}..${cfg.max2}, ${cfg.min3}..${cfg.max3})`;
}

function getLeaderboardSize(configId) {
  const board = leaderboardsMap[configId];
  return board ? Object.keys(board).length : 0;
}

function sortConfigsByLeaderboardSize() {
  configs.sort((a, b) => {
    const sizeDiff = getLeaderboardSize(b.id) - getLeaderboardSize(a.id);
    if (sizeDiff !== 0) return sizeDiff;
    return a.id.localeCompare(b.id);
  });
}

function getActiveConfig() {
  return configs.find(c => c.id === activeConfigId) || configs[0];
}

function renderConfigsUI() {
  const activeCfg = getActiveConfig();
  if (!activeCfg) return;
  configListEl.innerHTML = '';

  configs.forEach((cfg) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill-btn' + (cfg.id === activeCfg.id ? ' active' : '');
    btn.textContent = formatConfigLabel(cfg);
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', cfg.id === activeCfg.id ? 'true' : 'false');
    btn.addEventListener('click', () => switchConfig(cfg.id));
    configListEl.appendChild(btn);
  });

  leaderboardConfigBadge.textContent = formatConfigLabel(activeCfg);

  const allowsNegative = activeCfg.min1 < 0 || activeCfg.min2 < 0 || activeCfg.min3 < 0;
  minusKey.classList.toggle('hidden', !allowsNegative);
}

function renderDraftConfigUI() {
  if (!draftConfig) return;
  opToggleBtns.forEach((btn) => {
    const op = btn.dataset.op;
    btn.classList.toggle('active', draftConfig.ops.includes(op));
  });

  min1Input.value = draftConfig.min1;
  max1Input.value = draftConfig.max1;
  min2Input.value = draftConfig.min2;
  max2Input.value = draftConfig.max2;
  min3Input.value = draftConfig.min3;
  max3Input.value = draftConfig.max3;

  const isValid = getValidSamplers(draftConfig).length > 0;
  configErrorEl.classList.toggle('hidden', isValid);
  saveConfigBtn.disabled = !isValid;
}

function openNewConfigPanel() {
  if (isPlaying) return;
  const base = getActiveConfig() || createDefaultConfig();
  draftConfig = {
    ops: [...base.ops],
    min1: base.min1,
    max1: base.max1,
    min2: base.min2,
    max2: base.max2,
    min3: base.min3,
    max3: base.max3
  };
  renderDraftConfigUI();
  newConfigPanel.classList.remove('hidden');
}

function closeNewConfigPanel() {
  draftConfig = null;
  newConfigPanel.classList.add('hidden');
}

async function createNewConfigFromDraft() {
  if (isPlaying || !draftConfig) return;
  updateDraftRangeInputs();
  if (getValidSamplers(draftConfig).length === 0) return;

  const base = {
    ops: ALL_OPS.filter(op => draftConfig.ops.includes(op)),
    min1: draftConfig.min1,
    max1: draftConfig.max1,
    min2: draftConfig.min2,
    max2: draftConfig.max2,
    min3: draftConfig.min3,
    max3: draftConfig.max3
  };
  const newCfg = {
    id: getConfigId(base),
    ...base
  };

  // Reuse existing config if it already exists, otherwise save to Firebase
  const alreadyExists = configs.some(c => c.id === newCfg.id);
  if (!alreadyExists) {
    configs.push(newCfg);
    await fetch(`${FIREBASE_DB_URL}/configs/${encodeURIComponent(newCfg.id)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCfg)
    });
  }

  activeConfigId = newCfg.id;
  localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
  closeNewConfigPanel();
  lastResult.classList.add('hidden');

  await syncFromFirebase();
}

function toggleDraftOperator(op) {
  if (!draftConfig) return;
  if (draftConfig.ops.includes(op)) {
    if (draftConfig.ops.length <= 1) return;
    draftConfig.ops = draftConfig.ops.filter(item => item !== op);
  } else {
    draftConfig.ops = ALL_OPS.filter(item => draftConfig.ops.includes(item) || item === op);
  }
  renderDraftConfigUI();
}

function updateDraftRangeInputs() {
  if (!draftConfig) return;
  const parseVal = (inputEl, fallback) => {
    const parsed = parseInt(inputEl.value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  draftConfig.min1 = parseVal(min1Input, draftConfig.min1);
  draftConfig.max1 = parseVal(max1Input, draftConfig.max1);
  draftConfig.min2 = parseVal(min2Input, draftConfig.min2);
  draftConfig.max2 = parseVal(max2Input, draftConfig.max2);
  draftConfig.min3 = parseVal(min3Input, draftConfig.min3);
  draftConfig.max3 = parseVal(max3Input, draftConfig.max3);

  const isValid = getValidSamplers(draftConfig).length > 0;
  configErrorEl.classList.toggle('hidden', isValid);
  saveConfigBtn.disabled = !isValid;
}

async function switchConfig(targetConfigId) {
  if (isPlaying) return;
  const target = configs.find(c => c.id === targetConfigId);
  if (!target || target.id === activeConfigId) return;

  activeConfigId = target.id;
  localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
  closeNewConfigPanel();
  lastResult.classList.add('hidden');
  renderConfigsUI();
  renderLeaderboard();
  renderReview();
  await syncFromFirebase();
}

async function syncFromFirebase() {
  try {
    const [configsRes, leaderboardsRes] = await Promise.all([
      fetch(`${FIREBASE_DB_URL}/configs.json`),
      fetch(`${FIREBASE_DB_URL}/leaderboards.json`)
    ]);

    const cloudConfigs = configsRes.ok ? await configsRes.json() : null;
    const cloudLeaderboards = leaderboardsRes.ok ? await leaderboardsRes.json() : null;

    leaderboardsMap = cloudLeaderboards && typeof cloudLeaderboards === 'object' ? cloudLeaderboards : {};

    const defaultCfg = createDefaultConfig();
    const byId = new Map();

    if (cloudConfigs && typeof cloudConfigs === 'object') {
      Object.entries(cloudConfigs).forEach(([key, c]) => {
        if (c && Array.isArray(c.ops) && getValidSamplers(c).length > 0) {
          const normalized = {
            ops: ALL_OPS.filter(op => c.ops.includes(op)),
            min1: c.min1,
            max1: c.max1,
            min2: c.min2,
            max2: c.max2,
            min3: c.min3,
            max3: c.max3
          };
          normalized.id = getConfigId(normalized);
          byId.set(normalized.id, normalized);

          // Migrate any legacy non-canonical config key in Firebase
          if (key !== normalized.id) {
            fetch(`${FIREBASE_DB_URL}/configs/${encodeURIComponent(key)}.json`, { method: 'DELETE' }).catch(() => {});
            fetch(`${FIREBASE_DB_URL}/configs/${encodeURIComponent(normalized.id)}.json`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(normalized)
            }).catch(() => {});
          }
        }
      });
    }

    // Ensure the default config always exists in Firebase under its canonical key
    if (!cloudConfigs || !cloudConfigs[defaultCfg.id]) {
      byId.set(defaultCfg.id, defaultCfg);
      fetch(`${FIREBASE_DB_URL}/configs/${encodeURIComponent(defaultCfg.id)}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultCfg)
      }).catch(() => {});
    }

    configs = Array.from(byId.values());
    await backfillLocalBestToLeaderboard();
    sortConfigsByLeaderboardSize();

    const savedConfigId = activeConfigId || localStorage.getItem(STORAGE_KEYS.activeConfigId);
    const activeCfg = configs.find(c => c.id === savedConfigId) || configs[0];
    activeConfigId = activeCfg.id;
    localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);

    renderConfigsUI();
    renderLeaderboard();
    renderReview();
    checkUrlReplayOnLoad();
  } catch (err) {
    console.error('Failed to sync with Firebase:', err);
  }
}

function normalizeQuestionRecord(q) {
  const nums = Array.isArray(q.nums) ? [...q.nums] : [0, 0, 0];
  const missingIndex = typeof q.missingIndex === 'number' ? q.missingIndex : 2;
  const expected = typeof q.expected === 'number' ? q.expected : nums[missingIndex];
  const expectedStr = String(expected);
  const answers = Array.isArray(q.answers) ? q.answers.map(String) : [];
  const wrongAnswers = Array.isArray(q.wrongAnswers)
    ? q.wrongAnswers.map(String)
    : answers.filter(a => a !== expectedStr);
  const right = typeof q.right === 'number' ? q.right : (answers.includes(expectedStr) ? 1 : 0);
  const wrong = typeof q.wrong === 'number' ? q.wrong : wrongAnswers.length;
  const durationMs = typeof q.durationMs === 'number' ? q.durationMs : 0;

  return {
    nums,
    op: q.op || '+',
    missingIndex,
    expected,
    answers,
    wrongAnswers,
    right,
    wrong,
    durationMs
  };
}

function getBestLocalSession(targetUserId, targetConfigId) {
  const historyMap = getGameHistoryMap();
  const key = `${targetUserId}__${targetConfigId}`;
  const sessions = Array.isArray(historyMap[key]) ? historyMap[key] : [];
  const regular = sessions.filter(s => !s.isPractice && typeof s.score === 'number');
  if (regular.length === 0) return null;

  let best = regular[0];
  for (let i = 1; i < regular.length; i++) {
    const s = regular[i];
    if (s.score > best.score) {
      best = s;
    } else if (
      s.score === best.score &&
      (!Array.isArray(best.questions) || best.questions.length === 0) &&
      Array.isArray(s.questions) &&
      s.questions.length > 0
    ) {
      best = s;
    }
  }
  return best;
}

async function backfillLocalBestToLeaderboard() {
  const historyMap = getGameHistoryMap();
  const pairs = new Set();

  users.forEach((u) => {
    configs.forEach((c) => {
      pairs.add(`${u.userId}__${c.id}`);
    });
  });
  Object.keys(historyMap).forEach((k) => pairs.add(k));

  const uploads = [];
  pairs.forEach((compKey) => {
    const sepIdx = compKey.indexOf('__');
    if (sepIdx <= 0) return;
    const uId = compKey.slice(0, sepIdx);
    const cfgId = compKey.slice(sepIdx + 2);
    if (!uId || !cfgId) return;

    const bestLocal = getBestLocalSession(uId, cfgId);
    if (!bestLocal) return;

    const existing = leaderboardsMap[cfgId] && leaderboardsMap[cfgId][uId];
    const hasExisting = existing && typeof existing.score === 'number';
    const existingHasQuestions = hasExisting && Array.isArray(existing.questions) && existing.questions.length > 0;
    const localHasQuestions = Array.isArray(bestLocal.questions) && bestLocal.questions.length > 0;

    const needsUpload =
      !hasExisting ||
      bestLocal.score > existing.score ||
      (!existingHasQuestions && localHasQuestions);

    if (!needsUpload) return;

    const userObj = users.find(u => u.userId === uId);
    const resolvedUsername = (userObj && userObj.username) || (existing && existing.username) || username || 'Player';
    const bestScore = hasExisting ? Math.max(existing.score, bestLocal.score) : bestLocal.score;
    const normalizedQuestions = localHasQuestions ? bestLocal.questions.map(normalizeQuestionRecord) : [];

    const record = {
      userId: uId,
      username: resolvedUsername,
      score: bestScore,
      right: typeof bestLocal.right === 'number' ? bestLocal.right : 0,
      wrong: typeof bestLocal.wrong === 'number' ? bestLocal.wrong : 0,
      durationMs: typeof bestLocal.durationMs === 'number' ? bestLocal.durationMs : GAME_DURATION_SECONDS * 1000,
      questions: normalizedQuestions,
      updatedAt: (hasExisting && bestLocal.score <= existing.score && existing.updatedAt)
        ? existing.updatedAt
        : (bestLocal.playedAt || Date.now())
    };

    if (!leaderboardsMap[cfgId]) {
      leaderboardsMap[cfgId] = {};
    }
    leaderboardsMap[cfgId][uId] = record;

    const userUrl = `${FIREBASE_DB_URL}/leaderboards/${encodeURIComponent(cfgId)}/${encodeURIComponent(uId)}.json`;
    uploads.push(
      fetch(userUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      }).catch(() => {})
    );
  });

  if (uploads.length > 0) {
    await Promise.all(uploads);
  }
}

async function submitScoreToLeaderboard(score, sessionData) {
  const configId = activeConfigId;
  const userUrl = `${FIREBASE_DB_URL}/leaderboards/${encodeURIComponent(configId)}/${encodeURIComponent(userId)}.json`;

  const existingRes = await fetch(userUrl);
  const existing = existingRes.ok ? await existingRes.json() : null;
  const hasExisting = existing && typeof existing.score === 'number';
  const isNewHighScore = !hasExisting || score > existing.score;
  const bestScore = hasExisting ? Math.max(existing.score, score) : score;

  lastResult.classList.toggle('new-high-score', isNewHighScore);
  lastScoreLabel.textContent = isNewHighScore ? '★ New High Score!' : 'Last Score';

  const existingHasQuestions = hasExisting && Array.isArray(existing.questions) && existing.questions.length > 0;
  const useSessionQuestions = isNewHighScore || (score === existing.score && !existingHasQuestions);
  const bestLocal = getBestLocalSession(userId, configId);
  const sourceSession = useSessionQuestions
    ? sessionData
    : (existingHasQuestions ? existing : (bestLocal || sessionData));

  const normalizedQuestions = sourceSession && Array.isArray(sourceSession.questions)
    ? sourceSession.questions.map(normalizeQuestionRecord)
    : [];

  const record = {
    userId,
    username,
    score: bestScore,
    right: sourceSession && typeof sourceSession.right === 'number' ? sourceSession.right : rightCount,
    wrong: sourceSession && typeof sourceSession.wrong === 'number' ? sourceSession.wrong : wrongCount,
    durationMs: sourceSession && typeof sourceSession.durationMs === 'number'
      ? sourceSession.durationMs
      : GAME_DURATION_SECONDS * 1000,
    questions: normalizedQuestions,
    updatedAt: isNewHighScore ? Date.now() : (existing.updatedAt || Date.now())
  };

  await fetch(userUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  });

  await syncFromFirebase();
}

async function updateUsernameInFirebase(targetUserId, newUsername) {
  const configIds = Object.keys(leaderboardsMap);
  await Promise.all(
    configIds.map(async (cfgId) => {
      if (leaderboardsMap[cfgId] && leaderboardsMap[cfgId][targetUserId]) {
        const url = `${FIREBASE_DB_URL}/leaderboards/${encodeURIComponent(cfgId)}/${encodeURIComponent(targetUserId)}.json`;
        await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: newUsername })
        });
      }
    })
  );
  await syncFromFirebase();
}

async function deleteUserFromFirebase(targetUserId) {
  const configIds = Object.keys(leaderboardsMap);
  await Promise.all(
    configIds.map(async (cfgId) => {
      if (leaderboardsMap[cfgId] && leaderboardsMap[cfgId][targetUserId]) {
        const url = `${FIREBASE_DB_URL}/leaderboards/${encodeURIComponent(cfgId)}/${encodeURIComponent(targetUserId)}.json`;
        await fetch(url, { method: 'DELETE' });
      }
    })
  );
  await syncFromFirebase();
}

function sortLeaderboard(entries) {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.updatedAt || 0) - (b.updatedAt || 0);
  });
}

function getMyBestReplaySession() {
  const boardObj = leaderboardsMap[activeConfigId] || {};
  const myEntry = boardObj[userId];
  if (myEntry && Array.isArray(myEntry.questions) && myEntry.questions.length > 0) {
    return {
      username: myEntry.username || username,
      configId: activeConfigId,
      score: myEntry.score,
      right: myEntry.right,
      wrong: myEntry.wrong,
      durationMs: myEntry.durationMs || GAME_DURATION_SECONDS * 1000,
      questions: myEntry.questions.map(normalizeQuestionRecord)
    };
  }
  const bestLocal = getBestLocalSession(userId, activeConfigId);
  if (bestLocal && Array.isArray(bestLocal.questions) && bestLocal.questions.length > 0) {
    return {
      username,
      configId: activeConfigId,
      score: bestLocal.score,
      right: bestLocal.right,
      wrong: bestLocal.wrong,
      durationMs: bestLocal.durationMs || GAME_DURATION_SECONDS * 1000,
      questions: bestLocal.questions.map(normalizeQuestionRecord)
    };
  }
  return null;
}

function renderLeaderboard() {
  const boardObj = leaderboardsMap[activeConfigId] || {};
  const entries = sortLeaderboard(Object.values(boardObj));
  let currentRank = 1;
  const rankedEntries = entries.map((entry, index) => {
    if (index > 0 && entry.score < entries[index - 1].score) {
      currentRank = index + 1;
    }
    return { ...entry, rank: currentRank };
  });

  const top10 = rankedEntries.slice(0, 10);
  const myEntry = rankedEntries.find(e => e.userId === userId);
  const myBestSession = getMyBestReplaySession();

  if (myEntry) {
    myRankValue.textContent = `#${myEntry.rank} of ${rankedEntries.length}`;
    myBestValue.textContent = myEntry.score;
  } else {
    myRankValue.textContent = 'Unranked';
    myBestValue.textContent = myBestSession ? myBestSession.score : '—';
  }

  if (myBestActions) {
    myBestActions.classList.toggle('hidden', !myBestSession);
  }

  if (top10.length === 0) {
    leaderboardList.innerHTML = '<li class="empty-row">No scores yet. Be the first!</li>';
    return;
  }

  leaderboardList.innerHTML = '';
  top10.forEach((entry) => {
    const li = document.createElement('li');
    const isMe = entry.userId === userId;
    li.className = 'leaderboard-row' + (isMe ? ' is-me' : '');

    const rankSpan = document.createElement('span');
    rankSpan.className = 'rank-num';
    rankSpan.textContent = `#${entry.rank}`;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-name';
    nameSpan.textContent = entry.username + (isMe ? ' (you)' : '');

    const rightGroup = document.createElement('span');
    rightGroup.className = 'player-right-group';

    if (Array.isArray(entry.questions) && entry.questions.length > 0) {
      const replaySession = {
        username: entry.username,
        configId: activeConfigId,
        score: entry.score,
        right: entry.right,
        wrong: entry.wrong,
        durationMs: entry.durationMs || GAME_DURATION_SECONDS * 1000,
        questions: entry.questions.map(normalizeQuestionRecord)
      };

      const replayBtn = document.createElement('button');
      replayBtn.type = 'button';
      replayBtn.className = 'inline-btn';
      replayBtn.textContent = '▶';
      replayBtn.title = `Replay ${entry.username}'s best game`;
      replayBtn.setAttribute('aria-label', `Replay ${entry.username}'s best game`);
      replayBtn.addEventListener('click', () => startReplay(replaySession));

      const raceBtn = document.createElement('button');
      raceBtn.type = 'button';
      raceBtn.className = 'inline-btn';
      raceBtn.textContent = '⚔️';
      raceBtn.title = `Race against ${entry.username}'s best game`;
      raceBtn.setAttribute('aria-label', `Race against ${entry.username}'s best game`);
      raceBtn.addEventListener('click', () => startRace(replaySession));

      const shareBtn = document.createElement('button');
      shareBtn.type = 'button';
      shareBtn.className = 'inline-btn';
      shareBtn.textContent = '🔗';
      shareBtn.title = `Copy share link for ${entry.username}'s best game`;
      shareBtn.setAttribute('aria-label', `Copy share link for ${entry.username}'s best game`);
      shareBtn.addEventListener('click', () => copyReplayLink(replaySession, shareBtn));

      rightGroup.append(replayBtn, raceBtn, shareBtn);
    }

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'player-score';
    scoreSpan.textContent = entry.score;
    rightGroup.appendChild(scoreSpan);

    li.append(rankSpan, nameSpan, rightGroup);
    leaderboardList.appendChild(li);
  });
}

// --- Local Storage Game Review & Per-Question Performance (Per User & Config) ---

function getQuestionKeyFromRecord(q) {
  return `${q.nums[0]}${q.op}${q.nums[1]}=${q.nums[2]}?${q.missingIndex}`;
}

function getGameHistoryMap() {
  const raw = localStorage.getItem(STORAGE_KEYS.gameHistory);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_) {
      // Fall through
    }
  }
  return {};
}

function getQuestionStatsMap() {
  const raw = localStorage.getItem(STORAGE_KEYS.questionStats);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_) {
      // Fall through
    }
  }
  return {};
}

function ensureQuestionStatsBucket(targetUserId, targetConfigId) {
  const statsMap = getQuestionStatsMap();
  const compKey = `${targetUserId}__${targetConfigId}`;
  if (!statsMap[compKey] || typeof statsMap[compKey] !== 'object') {
    const bucket = {};
    const historyMap = getGameHistoryMap();
    const sessions = Array.isArray(historyMap[compKey]) ? [...historyMap[compKey]].reverse() : [];
    sessions.forEach((session) => {
      if (Array.isArray(session.questions)) {
        session.questions.forEach((q) => {
          if (q && Array.isArray(q.nums) && q.nums.length === 3) {
            const qKey = getQuestionKeyFromRecord(q);
            const existing = bucket[qKey];
            const prevCount = existing && typeof existing.count === 'number' && existing.count > 0 ? existing.count : 0;
            const prevTotalMs = existing && typeof existing.totalDurationMs === 'number'
              ? existing.totalDurationMs
              : (existing ? (existing.durationMs || 0) * prevCount : 0);
            const count = prevCount + 1;
            const totalDurationMs = prevTotalMs + (q.durationMs || 0);
            const avgDurationMs = Math.round(totalDurationMs / count);

            bucket[qKey] = {
              key: qKey,
              nums: [...q.nums],
              op: q.op,
              missingIndex: q.missingIndex,
              expected: q.expected,
              answers: Array.isArray(q.answers) ? [...q.answers] : [],
              right: q.right || 0,
              wrong: q.wrong || 0,
              count,
              totalDurationMs,
              durationMs: avgDurationMs,
              updatedAt: session.playedAt || Date.now()
            };
          }
        });
      }
    });
    statsMap[compKey] = bucket;
    localStorage.setItem(STORAGE_KEYS.questionStats, JSON.stringify(statsMap));
  }
  return { statsMap, compKey, bucket: statsMap[compKey] };
}

function updateQuestionLastPerformance(targetUserId, targetConfigId, qRecord) {
  if (!qRecord || !Array.isArray(qRecord.nums) || qRecord.nums.length !== 3) return;
  const { statsMap, compKey, bucket } = ensureQuestionStatsBucket(targetUserId, targetConfigId);
  const qKey = getQuestionKeyFromRecord(qRecord);
  const existing = bucket[qKey];
  const prevCount = existing
    ? (typeof existing.count === 'number' && existing.count > 0 ? existing.count : 1)
    : 0;
  const prevTotalMs = existing
    ? (typeof existing.totalDurationMs === 'number' ? existing.totalDurationMs : (existing.durationMs || 0) * prevCount)
    : 0;
  const count = prevCount + 1;
  const totalDurationMs = prevTotalMs + (qRecord.durationMs || 0);
  const avgDurationMs = Math.round(totalDurationMs / count);

  bucket[qKey] = {
    key: qKey,
    nums: [...qRecord.nums],
    op: qRecord.op,
    missingIndex: qRecord.missingIndex,
    expected: qRecord.expected,
    answers: Array.isArray(qRecord.answers) ? [...qRecord.answers] : [],
    right: qRecord.right || 0,
    wrong: qRecord.wrong || 0,
    count,
    totalDurationMs,
    durationMs: avgDurationMs,
    updatedAt: Date.now()
  };
  statsMap[compKey] = bucket;
  localStorage.setItem(STORAGE_KEYS.questionStats, JSON.stringify(statsMap));
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
  const key = `${gameSession.userId}__${gameSession.configId}`;
  const historyList = Array.isArray(map[key]) ? map[key] : [];
  historyList.unshift(gameSession);
  map[key] = historyList.slice(0, 20); // Keep last 20 games per user+config
  localStorage.setItem(STORAGE_KEYS.gameHistory, JSON.stringify(map));
}

function deleteUserReviewFromStorage(targetUserId) {
  const map = getGameHistoryMap();
  Object.keys(map).forEach((key) => {
    if (key.startsWith(`${targetUserId}__`)) {
      delete map[key];
    }
  });
  localStorage.setItem(STORAGE_KEYS.gameHistory, JSON.stringify(map));

  const statsMap = getQuestionStatsMap();
  Object.keys(statsMap).forEach((key) => {
    if (key.startsWith(`${targetUserId}__`)) {
      delete statsMap[key];
    }
  });
  localStorage.setItem(STORAGE_KEYS.questionStats, JSON.stringify(statsMap));
}

function renderHistoryChart(sessions) {
  if (!historyChart) return;
  const regularSessions = Array.isArray(sessions) ? sessions.filter(s => !s.isPractice) : [];
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
  const padLeft = 30;
  const padRight = 14;
  const padTop = 12;
  const padBottom = 22;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  let runningBest = -Infinity;
  const pointsData = chronological.map((s) => {
    const score = typeof s.score === 'number' ? s.score : 0;
    runningBest = Math.max(runningBest, score);
    return {
      score,
      right: s.right || 0,
      best: runningBest
    };
  });

  let minVal = 0;
  let maxVal = 5;
  pointsData.forEach((p) => {
    minVal = Math.min(minVal, p.score, p.right, p.best);
    maxVal = Math.max(maxVal, p.score, p.right, p.best);
  });
  minVal = Math.floor(minVal);
  maxVal = Math.ceil(maxVal);
  if (maxVal === minVal) maxVal = minVal + 5;

  const getX = (i) => (n === 1 ? padLeft + plotW / 2 : padLeft + (i / (n - 1)) * plotW);
  const getY = (val) => padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;

  const midVal = minVal < 0 ? 0 : Math.round((minVal + maxVal) / 2);
  const yTicks = Array.from(new Set([minVal, midVal, maxVal]));

  let svg = '';

  // Y-axis labels and horizontal grid lines
  yTicks.forEach((tick) => {
    const y = getY(tick).toFixed(1);
    svg += `<line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="hsl(214, 20%, 86%)" stroke-dasharray="3 3" stroke-width="1" />`;
    svg += `<text x="${padLeft - 6}" y="${(parseFloat(y) + 3.5).toFixed(1)}" text-anchor="end" font-size="10" font-weight="600" fill="hsl(215, 15%, 45%)">${tick}</text>`;
  });

  // X-axis labels (#1 .. #N)
  if (n === 1) {
    svg += `<text x="${getX(0).toFixed(1)}" y="${height - 5}" text-anchor="middle" font-size="10" font-weight="600" fill="hsl(215, 15%, 45%)">#1</text>`;
  } else {
    svg += `<text x="${getX(0).toFixed(1)}" y="${height - 5}" text-anchor="start" font-size="10" font-weight="600" fill="hsl(215, 15%, 45%)">#1</text>`;
    svg += `<text x="${getX(n - 1).toFixed(1)}" y="${height - 5}" text-anchor="end" font-size="10" font-weight="600" fill="hsl(215, 15%, 45%)">#${n}</text>`;
  }

  const series = [
    { key: 'right', color: 'hsl(152, 76%, 36%)', width: 2, radius: 3 },
    { key: 'best', color: 'hsl(36, 95%, 46%)', width: 2.2, radius: 3.2 },
    { key: 'score', color: 'hsl(217, 91%, 53%)', width: 2.5, radius: 3.5 }
  ];

  series.forEach((s) => {
    const pts = pointsData.map((item, idx) => `${getX(idx).toFixed(1)},${getY(item[s.key]).toFixed(1)}`);
    if (n > 1) {
      svg += `<polyline fill="none" stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round" points="${pts.join(' ')}" />`;
    }
    pointsData.forEach((item, idx) => {
      const cx = getX(idx).toFixed(1);
      const cy = getY(item[s.key]).toFixed(1);
      svg += `<circle cx="${cx}" cy="${cy}" r="${s.radius}" fill="${s.color}" stroke="#fff" stroke-width="1" />`;
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
  const map = getGameHistoryMap();
  const key = `${userId}__${activeConfigId}`;
  const sessions = map[key];
  const lastSession = Array.isArray(sessions) && sessions.length > 0 ? sessions[0] : null;
  const trackedQuestions = getTrackedQuestions(userId, activeConfigId);

  if (practiceBtn) {
    practiceBtn.classList.toggle('hidden', trackedQuestions.length === 0);
  }

  if (trackedQuestions.length === 0 && (!lastSession || !Array.isArray(lastSession.questions) || lastSession.questions.length === 0)) {
    reviewCard.classList.add('hidden');
    return;
  }

  reviewCard.classList.remove('hidden');
  updateReviewCollapseUI();
  renderHistoryChart(sessions || []);

  sortImproveBtn.classList.toggle('active', reviewSortMode === 'improve');
  sortImproveBtn.setAttribute('aria-selected', reviewSortMode === 'improve' ? 'true' : 'false');
  sortOrderBtn.classList.toggle('active', reviewSortMode === 'order');
  sortOrderBtn.setAttribute('aria-selected', reviewSortMode === 'order' ? 'true' : 'false');
  if (sortPracticeBtn) {
    sortPracticeBtn.classList.toggle('active', reviewSortMode === 'practice');
    sortPracticeBtn.setAttribute('aria-selected', reviewSortMode === 'practice' ? 'true' : 'false');
  }

  const lastQuestions = lastSession && Array.isArray(lastSession.questions) ? lastSession.questions : [];
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

  if (reviewSortMode === 'practice' && trackedQuestions.length > 0) {
    const totalQMs = trackedQuestions.reduce((sum, q) => sum + (q.durationMs || 0), 0);
    const avgSec = (totalQMs / trackedQuestions.length / 1000).toFixed(1);
    const mistakeCount = trackedQuestions.filter(q => q.wrong > 0 || q.right === 0).length;
    reviewSummaryBadge.textContent = `${trackedQuestions.length} tracked · ${avgSec}s avg · ${mistakeCount} to fix`;
  } else if (lastQuestions.length > 0) {
    const totalQMs = lastQuestions.reduce((sum, q) => sum + (q.durationMs || 0), 0);
    const avgSec = (totalQMs / lastQuestions.length / 1000).toFixed(1);
    reviewSummaryBadge.textContent = `${avgSec}s avg · ${lastSession.right} right · ${lastSession.wrong} wrong`;
  }

  reviewList.innerHTML = '';
  ordered.forEach((q) => {
    const li = document.createElement('li');
    li.className = 'review-row' + (q.wrong > 0 || q.right === 0 ? ' has-wrong' : '');

    // 1. Equation with highlighted question slot
    const eqSpan = document.createElement('span');
    eqSpan.className = 'review-eq';
    const opChar = q.op === '-' ? '−' : q.op;
    const parts = q.nums.map((n, idx) => {
      if (idx === q.missingIndex) {
        return `<span class="review-q-slot">${n}</span>`;
      }
      return String(n);
    });
    eqSpan.innerHTML = `${parts[0]} ${opChar} ${parts[1]} = ${parts[2]}`;

    // 2. Typed answers (wrong attempts & right answer)
    const ansSpan = document.createElement('span');
    ansSpan.className = 'review-answers';
    const expectedStr = String(q.expected);
    const wrongTyped = (q.answers || []).filter(a => a !== expectedStr);
    wrongTyped.forEach((w) => {
      const wEl = document.createElement('span');
      wEl.className = 'review-wrong-ans';
      wEl.textContent = `✗ ${w}`;
      ansSpan.appendChild(wEl);
    });
    if (q.right > 0) {
      const rEl = document.createElement('span');
      rEl.className = 'review-right-ans';
      rEl.textContent = `✓ ${expectedStr}`;
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

// --- Constraint-Based Integer Equation Generation ---

function getValidSamplers(cfg) {
  const { ops, min1, max1, min2, max2, min3, max3 } = cfg;
  if (min1 > max1 || min2 > max2 || min3 > max3) return [];

  const samplers = [];

  // 1. Addition: a + b = c
  if (ops.includes('+')) {
    const aLow = Math.max(min1, min3 - max2);
    const aHigh = Math.min(max1, max3 - min2);
    if (aLow <= aHigh) {
      samplers.push(() => {
        const a = randomInt(aLow, aHigh);
        const bLow = Math.max(min2, min3 - a);
        const bHigh = Math.min(max2, max3 - a);
        const b = randomInt(bLow, bHigh);
        return { a, b, c: a + b, op: '+' };
      });
    }
  }

  // 2. Subtraction: a - b = c
  if (ops.includes('-')) {
    const aLow = Math.max(min1, min2 + min3);
    const aHigh = Math.min(max1, max2 + max3);
    if (aLow <= aHigh) {
      samplers.push(() => {
        const a = randomInt(aLow, aHigh);
        const bLow = Math.max(min2, a - max3);
        const bHigh = Math.min(max2, a - min3);
        const b = randomInt(bLow, bHigh);
        return { a, b, c: a - b, op: '-' };
      });
    }
  }

  // 3. Multiplication: a × b = c (integers)
  if (ops.includes('×')) {
    const validRanges = [];
    const span = max1 - min1;
    const step = span > 2000 ? Math.ceil(span / 2000) : 1;
    for (let a = min1; a <= max1; a += step) {
      let bLow, bHigh;
      if (a === 0) {
        if (min3 <= 0 && 0 <= max3) {
          bLow = min2;
          bHigh = max2;
        } else {
          bLow = 1;
          bHigh = 0;
        }
      } else if (a > 0) {
        bLow = Math.max(min2, Math.ceil(min3 / a));
        bHigh = Math.min(max2, Math.floor(max3 / a));
      } else {
        bLow = Math.max(min2, Math.ceil(max3 / a));
        bHigh = Math.min(max2, Math.floor(min3 / a));
      }
      if (bLow <= bHigh) {
        validRanges.push([a, bLow, bHigh]);
      }
    }
    if (validRanges.length > 0) {
      samplers.push(() => {
        const [a, bLow, bHigh] = validRanges[randomInt(0, validRanges.length - 1)];
        const b = randomInt(bLow, bHigh);
        return { a, b, c: a * b, op: '×' };
      });
    }
  }

  // 4. Division: a ÷ b = c (restricted to exact integers: b != 0 and a = b * c)
  if (ops.includes('÷')) {
    const validDivisors = [];
    const span = max2 - min2;
    const step = span > 2000 ? Math.ceil(span / 2000) : 1;
    for (let b = min2; b <= max2; b += step) {
      if (b === 0) continue;
      let cLow, cHigh;
      if (b > 0) {
        cLow = Math.max(min3, Math.ceil(min1 / b));
        cHigh = Math.min(max3, Math.floor(max1 / b));
      } else {
        cLow = Math.max(min3, Math.ceil(max1 / b));
        cHigh = Math.min(max3, Math.floor(min1 / b));
      }
      if (cLow <= cHigh) {
        validDivisors.push([b, cLow, cHigh]);
      }
    }
    if (validDivisors.length > 0) {
      samplers.push(() => {
        const [b, cLow, cHigh] = validDivisors[randomInt(0, validDivisors.length - 1)];
        const c = randomInt(cLow, cHigh);
        return { a: b * c, b, c, op: '÷' };
      });
    }
  }

  return samplers;
}

function getValidMissingIndices(a, op, b, c) {
  if (op === '+' || op === '-') {
    return [0, 1, 2];
  }
  if (op === '×') {
    const indices = [2];
    if (b !== 0) indices.push(0);
    if (a !== 0) indices.push(1);
    return indices;
  }
  if (op === '÷') {
    const indices = [0, 2];
    if (c !== 0) indices.push(1);
    return indices;
  }
  return [0, 1, 2];
}

function generateRandomQuestion() {
  const cfg = getActiveConfig();
  if (!cfg) return null;
  const samplers = getValidSamplers(cfg);
  if (samplers.length === 0) return null;

  let candidate = null;
  for (let attempt = 0; attempt < 25; attempt++) {
    const sampleFn = samplers[randomInt(0, samplers.length - 1)];
    const { a, b, c, op } = sampleFn();
    const nums = [a, b, c];
    const validIndices = getValidMissingIndices(a, op, b, c);
    const missingIndex = validIndices[randomInt(0, validIndices.length - 1)];
    const key = `${a}${op}${b}=${c}?${missingIndex}`;
    const { bucket } = ensureQuestionStatsBucket(userId, activeConfigId);
    candidate = {
      nums,
      op,
      missingIndex,
      answer: nums[missingIndex],
      key,
      lastPerf: bucket[key] ? { ...bucket[key] } : null
    };
    if (!currentQuestion || candidate.key !== currentQuestion.key) {
      break;
    }
  }
  return candidate;
}

function generatePracticeQuestion() {
  const tracked = getTrackedQuestions(userId, activeConfigId);
  if (tracked.length === 0) {
    return generateRandomQuestion();
  }

  const candidates = tracked.length > 1 && currentQuestion
    ? tracked.filter(q => q.key !== currentQuestion.key)
    : tracked;

  if (candidates.length === 0) {
    return generateRandomQuestion();
  }

  const picked = candidates[0];
  return {
    nums: [...picked.nums],
    op: picked.op,
    missingIndex: picked.missingIndex,
    answer: picked.expected,
    key: picked.key,
    lastPerf: { ...picked }
  };
}

function generateRaceQuestion() {
  if (raceSessionData && raceSessionData.questionIndex < raceSessionData.session.questions.length) {
    const rawQ = raceSessionData.session.questions[raceSessionData.questionIndex];
    raceSessionData.questionIndex += 1;
    const q = normalizeQuestionRecord(rawQ);
    return {
      nums: [...q.nums],
      op: q.op,
      missingIndex: q.missingIndex,
      answer: q.expected,
      key: getQuestionKeyFromRecord(q)
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
  const slots = [slot0, slot1, slot2];
  slotOp.textContent = currentQuestion.op === '-' ? '−' : currentQuestion.op;

  if (questionLastPerf) {
    if (isPracticeMode && currentQuestion.lastPerf) {
      const lp = currentQuestion.lastPerf;
      const secStr = `${((lp.durationMs || 0) / 1000).toFixed(1)}s`;
      const hadMistake = lp.wrong > 0 || lp.right === 0;
      const expectedStr = String(lp.expected);
      const wrongTyped = (lp.answers || []).filter(a => a !== expectedStr);

      if (hadMistake) {
        const wrongText = wrongTyped.length > 0
          ? wrongTyped.map(w => `✗ ${w}`).join(' ')
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
  const q = oppStats.activeSeg.question;
  if (raceOppName) {
    raceOppName.textContent = `👀 ${oppName}`;
  }
  if (raceOppStep) {
    raceOppStep.textContent = oppStats.isFinished
      ? `Done (${oppStats.totalQuestions} Qs)`
      : `Q ${oppStats.activeSeg.index + 1}/${oppStats.totalQuestions}`;
  }
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

function nextQuestion() {
  currentQuestion = generateQuestion();
  typedAnswer = '';
  isWrong = false;
  questionStartTime = Date.now();
  currentQuestionRecord = currentQuestion
    ? {
        nums: [...currentQuestion.nums],
        op: currentQuestion.op,
        missingIndex: currentQuestion.missingIndex,
        expected: currentQuestion.answer,
        answers: [],
        wrongAnswers: [],
        right: 0,
        wrong: 0,
        durationMs: 0
      }
    : null;
  renderQuestion();
}

function handleDigitInput(digitStr) {
  if (!isPlaying || isReplaying || !currentQuestion) return;

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
  isWrong = true;
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

function enterAndroidImmersiveFullscreen() {
  if (!/Android/i.test(navigator.userAgent)) return;
  const docEl = document.documentElement;
  if (!document.fullscreenElement && docEl.requestFullscreen) {
    docEl.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }
}

function startGame(practice = false, raceTargetSession = null) {
  enterAndroidImmersiveFullscreen();
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
  if (!activeCfg || getValidSamplers(activeCfg).length === 0) return;

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
  currentQuestion = null;
  gameStartTime = Date.now();
  currentGameQuestions = [];
  currentQuestionRecord = null;

  if (replayPanel) replayPanel.classList.add('hidden');
  if (replayResultBanner) replayResultBanner.classList.add('hidden');
  if (raceHudBar) raceHudBar.classList.toggle('hidden', !isRaceMode);
  if (raceOppEq) raceOppEq.classList.add('hidden');
  keypad.classList.remove('hidden');
  quitBtn.textContent = isRaceMode ? 'End Race' : isPracticeMode ? 'End Practice' : 'End Game';
  deleteUserBtn.classList.add('hidden');
  updateInstallBtnVisibility();
  homeView.classList.remove('active');
  gameView.classList.add('active');

  updateHud();
  nextQuestion();

  if (isRaceMode) {
    raceRafId = requestAnimationFrame(tickRaceHud);
  }

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft -= 1;
    updateHud();
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

  const finalScore = rightCount - wrongCount;
  const gameDurationMs = Date.now() - gameStartTime;
  const normalizedQuestions = currentGameQuestions.map(normalizeQuestionRecord);

  deleteUserBtn.classList.remove('hidden');
  updateInstallBtnVisibility();
  gameView.classList.remove('active');
  homeView.classList.add('active');

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
        questions: (finishedRaceSession.questions || []).map(normalizeQuestionRecord)
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
    if (raceLastBtn) raceLastBtn.classList.toggle('hidden', !hasReplayableQuestions);
    if (shareLastBtn) shareLastBtn.classList.toggle('hidden', !hasReplayableQuestions);

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
      const isInitialNewHigh = !cachedEntry || typeof cachedEntry.score !== 'number' || finalScore > cachedEntry.score;
      lastResult.classList.toggle('new-high-score', isInitialNewHigh);
      lastScoreLabel.textContent = isInitialNewHigh ? '★ New High Score!' : 'Last Score';
      lastScoreValue.textContent = finalScore;
      lastScoreDetail.textContent = `${rightCount} right · ${wrongCount} wrong`;
      lastResult.classList.remove('hidden');
      triggerCelebration(isInitialNewHigh);
      await submitScoreToLeaderboard(finalScore, sessionRecord);
    }
  }
}

// --- Replay & Share Feature ---

function encodeCompactQuestionsList(questionsList) {
  return (questionsList || []).map((rawQ) => {
    const q = normalizeQuestionRecord(rawQ);
    const opIdx = Math.max(0, ALL_OPS.indexOf(q.op));
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

function decodeCompactQuestionsList(compactList) {
  return (compactList || []).map((item) => {
    const a = Number(item[0]) || 0;
    const op = ALL_OPS[item[1]] || '+';
    const b = Number(item[2]) || 0;
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
    return normalizeQuestionRecord({
      nums,
      op,
      missingIndex,
      expected,
      answers,
      wrongAnswers,
      right,
      wrong: wrongAnswers.length,
      durationMs
    });
  });
}

function encodeReplayParam(session) {
  const payload = {
    u: session.username || 'Player',
    c: session.configId || activeConfigId,
    s: typeof session.score === 'number' ? session.score : 0,
    r: typeof session.right === 'number' ? session.right : 0,
    w: typeof session.wrong === 'number' ? session.wrong : 0,
    d: typeof session.durationMs === 'number' ? session.durationMs : GAME_DURATION_SECONDS * 1000,
    q: encodeCompactQuestionsList(session.questions)
  };

  if (session.opponent && Array.isArray(session.opponent.questions) && session.opponent.questions.length > 0) {
    payload.o = {
      u: session.opponent.username || 'Opponent',
      s: typeof session.opponent.score === 'number' ? session.opponent.score : 0,
      r: typeof session.opponent.right === 'number' ? session.opponent.right : 0,
      w: typeof session.opponent.wrong === 'number' ? session.opponent.wrong : 0,
      d: typeof session.opponent.durationMs === 'number' ? session.opponent.durationMs : GAME_DURATION_SECONDS * 1000,
      q: encodeCompactQuestionsList(session.opponent.questions)
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

function decodeReplayParam(encoded) {
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

    const questions = decodeCompactQuestionsList(payload.q);
    let opponent = null;
    if (payload.o && Array.isArray(payload.o.q) && payload.o.q.length > 0) {
      opponent = {
        username: String(payload.o.u || 'Opponent'),
        score: Number(payload.o.s) || 0,
        right: Number(payload.o.r) || 0,
        wrong: Number(payload.o.w) || 0,
        durationMs: Number(payload.o.d) || GAME_DURATION_SECONDS * 1000,
        questions: decodeCompactQuestionsList(payload.o.q)
      };
    }

    return {
      username: String(payload.u || 'Player'),
      configId: String(payload.c || activeConfigId),
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

async function copyReplayLink(session, btnEl) {
  if (!session || !Array.isArray(session.questions) || session.questions.length === 0) return;
  const encoded = encodeReplayParam(session);
  const baseUrl = window.location.hostname.endsWith('github.io')
    ? 'https://math-leaderboard.vercel.app/'
    : `${window.location.origin}${window.location.pathname}`;
  const url = `${baseUrl}?replay=${encoded}`;

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

function checkUrlReplayOnLoad() {
  if (hasHandledInitialUrlReplay) return;
  const params = new URLSearchParams(window.location.search);
  const replayParam = params.get('replay');
  if (!replayParam) return;

  hasHandledInitialUrlReplay = true;
  const decoded = decodeReplayParam(replayParam);
  if (decoded) {
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

function buildReplayTimeline(session) {
  const questions = (session.questions || []).map(normalizeQuestionRecord);
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

function createReplayLogRow(q, startMs) {
  const li = document.createElement('li');
  li.className = 'review-row' + (q.wrong > 0 || q.right === 0 ? ' has-wrong' : '');
  li.title = 'Tap to jump to this question';
  if (typeof startMs === 'number') {
    li.addEventListener('click', () => seekReplayTo(startMs));
  }

  const eqSpan = document.createElement('span');
  eqSpan.className = 'review-eq';
  const opChar = q.op === '-' ? '−' : q.op;
  const parts = q.nums.map((n, idx) => {
    if (idx === q.missingIndex) {
      return `<span class="review-q-slot">${n}</span>`;
    }
    return String(n);
  });
  eqSpan.innerHTML = `${parts[0]} ${opChar} ${parts[1]} = ${parts[2]}`;

  const ansSpan = document.createElement('span');
  ansSpan.className = 'review-answers';
  const expectedStr = String(q.expected);
  const wrongTyped = (q.wrongAnswers || (q.answers || []).filter(a => a !== expectedStr));
  wrongTyped.forEach((w) => {
    const wEl = document.createElement('span');
    wEl.className = 'review-wrong-ans';
    wEl.textContent = `✗ ${w}`;
    ansSpan.appendChild(wEl);
  });
  if (q.right > 0) {
    const rEl = document.createElement('span');
    rEl.className = 'review-right-ans';
    rEl.textContent = `✓ ${expectedStr}`;
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

  rightCount = rCount;
  wrongCount = wCount;
  const totalSec = Math.round(Math.max(GAME_DURATION_SECONDS * 1000, totalDurationMs) / 1000);
  timeLeft = Math.max(0, totalSec - Math.floor(clampedMs / 1000));
  updateHud();

  if (replaySessionData.opponentTimeline && replaySessionData.session.opponent && raceHudBar) {
    const oppStats = getOpponentStatsAt(replaySessionData.opponentTimeline, clampedMs);
    const myScore = rCount - wCount;
    const oppScore = oppStats.score;
    const diff = myScore - oppScore;
    const playerName = replaySessionData.session.username || 'Player';
    const oppName = replaySessionData.session.opponent.username || 'Opponent';
    if (raceVsText) {
      raceVsText.textContent = `⚔️ ${playerName}: ${myScore} vs ${oppName}: ${oppScore}`;
    }
    if (raceDiffBadge) {
      raceDiffBadge.className =
        'race-diff-badge ' + (diff > 0 ? 'ahead' : diff < 0 ? 'behind' : 'tied');
      raceDiffBadge.textContent = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : 'Tied';
    }
    renderOpponentQuestion(oppName, oppStats);
  }

  if (activeSeg) {
    currentQuestion = {
      nums: [...activeSeg.question.nums],
      op: activeSeg.question.op,
      missingIndex: activeSeg.question.missingIndex,
      answer: activeSeg.question.expected,
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
  replayElapsedMs += dt * replaySpeed;
  renderReplayStateAt(replayElapsedMs);

  if (isReplaying && !isReplayPaused) {
    replayRafId = requestAnimationFrame(tickReplay);
  }
}

function startReplay(session) {
  if (!session || !Array.isArray(session.questions) || session.questions.length === 0) return;
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

  const timeline = buildReplayTimeline(session);
  const hasOpponent = Boolean(
    session.opponent && Array.isArray(session.opponent.questions) && session.opponent.questions.length > 0
  );
  const opponentTimeline = hasOpponent ? buildReplayTimeline(session.opponent) : null;
  replaySessionData = {
    session,
    timeline,
    opponentTimeline,
    renderedLogCount: -1
  };
  renderReplayTimelineBar(timeline);

  if (questionLastPerf) questionLastPerf.classList.add('hidden');
  keypad.classList.add('hidden');
  if (raceHudBar) raceHudBar.classList.toggle('hidden', !hasOpponent);
  if (raceOppEq) raceOppEq.classList.toggle('hidden', !hasOpponent);
  if (replayResultBanner) {
    const playerName = session.username || 'Player';
    const rightVal = typeof session.right === 'number' ? session.right : 0;
    const wrongVal = typeof session.wrong === 'number' ? session.wrong : 0;
    const scoreVal = typeof session.score === 'number' ? session.score : rightVal - wrongVal;

    if (hasOpponent) {
      const opp = session.opponent;
      const oppName = opp.username || 'Opponent';
      const oppRight = typeof opp.right === 'number' ? opp.right : 0;
      const oppWrong = typeof opp.wrong === 'number' ? opp.wrong : 0;
      const oppScore = typeof opp.score === 'number' ? opp.score : oppRight - oppWrong;
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
    } else {
      replayResultBanner.classList.remove('new-high-score');
      if (replayBannerLabel) replayBannerLabel.textContent = `${playerName}'s Score`;
      if (replayBannerValue) replayBannerValue.textContent = scoreVal;
      if (replayBannerDetail) replayBannerDetail.textContent = `${rightVal} right · ${wrongVal} wrong`;
    }
    replayResultBanner.classList.remove('hidden');
  }
  if (replayPlayBtn) replayPlayBtn.classList.remove('hidden');
  if (replayPanel) replayPanel.classList.remove('hidden');
  if (replayTitle) {
    if (hasOpponent) {
      const oppName = session.opponent.username || 'Opponent';
      replayTitle.textContent = `Replay: ⚔️ ${session.username || 'Player'} (${session.score}) vs ${oppName} (${session.opponent.score})`;
    } else {
      replayTitle.textContent = `Replay: ${session.username || 'Player'} (Score ${session.score})`;
    }
  }
  if (replayPauseBtn) replayPauseBtn.textContent = '⏸ Pause';
  if (replaySpeedBtn) replaySpeedBtn.textContent = `${replaySpeed}× Speed`;
  quitBtn.textContent = 'Exit Replay';

  deleteUserBtn.classList.add('hidden');
  updateInstallBtnVisibility();
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
  isReplaying = false;
  isReplayPaused = false;
  replaySessionData = null;

  if (replayResultBanner) {
    replayResultBanner.classList.add('hidden');
    replayResultBanner.classList.remove('new-high-score');
  }
  if (raceHudBar) raceHudBar.classList.add('hidden');
  if (raceOppEq) raceOppEq.classList.add('hidden');
  if (replayPlayBtn) replayPlayBtn.classList.add('hidden');
  if (replayPanel) replayPanel.classList.add('hidden');
  keypad.classList.remove('hidden');
  deleteUserBtn.classList.remove('hidden');
  updateInstallBtnVisibility();

  if (window.location.search.includes('replay=')) {
    window.history.replaceState({}, '', window.location.pathname);
  }

  if (returnHome) {
    gameView.classList.remove('active');
    homeView.classList.add('active');
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

// --- Event Listeners ---

usernameInput.addEventListener('change', () => saveUsername(usernameInput.value));
usernameInput.addEventListener('blur', () => saveUsername(usernameInput.value));
usernameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    usernameInput.blur();
  }
});

addUserBtn.addEventListener('click', addUser);
deleteUserBtn.addEventListener('click', deleteCurrentUser);

addConfigBtn.addEventListener('click', () => {
  if (newConfigPanel.classList.contains('hidden')) {
    openNewConfigPanel();
  } else {
    closeNewConfigPanel();
  }
});
cancelConfigBtn.addEventListener('click', closeNewConfigPanel);
saveConfigBtn.addEventListener('click', createNewConfigFromDraft);

opToggleBtns.forEach((btn) => {
  btn.addEventListener('click', () => toggleDraftOperator(btn.dataset.op));
});

[min1Input, max1Input, min2Input, max2Input, min3Input, max3Input].forEach((inputEl) => {
  inputEl.addEventListener('input', updateDraftRangeInputs);
  inputEl.addEventListener('change', updateDraftRangeInputs);
});

playBtn.addEventListener('click', () => startGame(false));
if (replayPlayBtn) {
  replayPlayBtn.addEventListener('click', () => startGame(false));
}
if (practiceBtn) {
  practiceBtn.addEventListener('click', () => startGame(true));
}
quitBtn.addEventListener('click', () => {
  if (isReplaying) {
    stopReplay(true);
  } else {
    finishGame(true);
  }
});

if (replayLastBtn) {
  replayLastBtn.addEventListener('click', () => {
    if (lastCompletedSession) startReplay(lastCompletedSession);
  });
}
if (raceLastBtn) {
  raceLastBtn.addEventListener('click', () => {
    if (lastCompletedSession) startRace(lastCompletedSession);
  });
}
if (shareLastBtn) {
  shareLastBtn.addEventListener('click', () => {
    if (lastCompletedSession) copyReplayLink(lastCompletedSession, shareLastBtn);
  });
}
if (replayBestBtn) {
  replayBestBtn.addEventListener('click', () => {
    const best = getMyBestReplaySession();
    if (best) startReplay(best);
  });
}
if (raceBestBtn) {
  raceBestBtn.addEventListener('click', () => {
    const best = getMyBestReplaySession();
    if (best) startRace(best);
  });
}
if (shareBestBtn) {
  shareBestBtn.addEventListener('click', () => {
    const best = getMyBestReplaySession();
    if (best) copyReplayLink(best, shareBestBtn);
  });
}
if (replayPauseBtn) {
  replayPauseBtn.addEventListener('click', toggleReplayPause);
}
if (replaySpeedBtn) {
  replaySpeedBtn.addEventListener('click', cycleReplaySpeed);
}
if (replayRestartBtn) {
  replayRestartBtn.addEventListener('click', restartReplay);
}
if (replayBannerRestartBtn) {
  replayBannerRestartBtn.addEventListener('click', restartReplay);
}
if (replayRaceBtn) {
  replayRaceBtn.addEventListener('click', () => {
    if (replaySessionData && replaySessionData.session) {
      startRace(replaySessionData.session);
    }
  });
}
if (replayBannerRaceBtn) {
  replayBannerRaceBtn.addEventListener('click', () => {
    if (replaySessionData && replaySessionData.session) {
      startRace(replaySessionData.session);
    }
  });
}
if (replayShareBtn) {
  replayShareBtn.addEventListener('click', () => {
    if (replaySessionData && replaySessionData.session) {
      copyReplayLink(replaySessionData.session, replayShareBtn);
    }
  });
}
if (replayBannerShareBtn) {
  replayBannerShareBtn.addEventListener('click', () => {
    if (replaySessionData && replaySessionData.session) {
      copyReplayLink(replaySessionData.session, replayBannerShareBtn);
    }
  });
}

if (replayTimeline) {
  let isScrubbing = false;

  const scrubFromClientX = (clientX) => {
    if (!replaySessionData) return;
    const rect = replayTimeline.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    seekReplayTo(ratio * replaySessionData.timeline.totalDurationMs);
  };

  replayTimeline.addEventListener('pointerdown', (e) => {
    if (!isReplaying || !replaySessionData) return;
    e.preventDefault();
    isScrubbing = true;
    if (replayTimeline.setPointerCapture) {
      try {
        replayTimeline.setPointerCapture(e.pointerId);
      } catch (_) {}
    }
    scrubFromClientX(e.clientX);
  });

  replayTimeline.addEventListener('pointermove', (e) => {
    if (!isScrubbing) return;
    e.preventDefault();
    scrubFromClientX(e.clientX);
  });

  const endScrub = () => {
    isScrubbing = false;
  };
  replayTimeline.addEventListener('pointerup', endScrub);
  replayTimeline.addEventListener('pointercancel', endScrub);

  replayTimeline.addEventListener('keydown', (e) => {
    if (!isReplaying || !replaySessionData) return;
    const stepMs = 2000;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      seekReplayTo(replayElapsedMs + stepMs);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seekReplayTo(replayElapsedMs - stepMs);
    }
  });
}

if (reviewToggleBtn) {
  reviewToggleBtn.addEventListener('click', () => {
    isReviewExpanded = !isReviewExpanded;
    localStorage.setItem(STORAGE_KEYS.reviewExpanded, isReviewExpanded ? '1' : '0');
    updateReviewCollapseUI();
  });
}

sortImproveBtn.addEventListener('click', () => {
  reviewSortMode = 'improve';
  renderReview();
});

sortOrderBtn.addEventListener('click', () => {
  reviewSortMode = 'order';
  renderReview();
});

if (sortPracticeBtn) {
  sortPracticeBtn.addEventListener('click', () => {
    reviewSortMode = 'practice';
    renderReview();
  });
}

// Fast touch/click response on the 3-digits-per-row keypad
keypad.addEventListener('pointerdown', (e) => {
  const btn = e.target.closest('.key-btn');
  if (!btn) return;
  e.preventDefault();
  handleDigitInput(btn.dataset.digit);
});

// Fallback for keyboard navigation / accessibility click
keypad.addEventListener('click', (e) => {
  if (e.detail !== 0) return;
  const btn = e.target.closest('.key-btn');
  if (!btn) return;
  handleDigitInput(btn.dataset.digit);
});

// Physical keyboard support (0-9 and -)
window.addEventListener('keydown', (e) => {
  if (!isPlaying) return;
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if ((e.key >= '0' && e.key <= '9') || e.key === '-') {
    e.preventDefault();
    handleDigitInput(e.key);
  }
});

// On Android, hide the bottom system navigation bar on tap (unless focusing a text/number input)
document.addEventListener('click', (e) => {
  if (e.target && e.target.closest('input')) return;
  enterAndroidImmersiveFullscreen();
});

// --- PWA Install Prompt ---

function isStandaloneApp() {
  return (
    window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function updateInstallBtnVisibility() {
  if (!installAppBtn) return;
  if (isPlaying || isReplaying || isStandaloneApp()) {
    installAppBtn.classList.add('hidden');
    if (installHint) installHint.classList.add('hidden');
    return;
  }
  const isMobileBrowser = /(Android|iPhone|iPad|iPod)/i.test(navigator.userAgent);
  if (deferredInstallPrompt || isMobileBrowser) {
    installAppBtn.classList.remove('hidden');
  } else {
    installAppBtn.classList.add('hidden');
  }
}

function initInstallPrompt() {
  updateInstallBtnVisibility();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    updateInstallBtnVisibility();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    updateInstallBtnVisibility();
  });

  if (installAppBtn) {
    installAppBtn.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice.catch(() => null);
        deferredInstallPrompt = null;
        if (choice && choice.outcome === 'accepted') {
          updateInstallBtnVisibility();
        }
        return;
      }

      if (!installHint || !installHintText) return;
      const isIOS = /(iPhone|iPad|iPod)/i.test(navigator.userAgent);
      installHintText.textContent = isIOS
        ? 'To install: tap Share (⍐) in Safari, then tap "Add to Home Screen" ➕.'
        : 'To install: tap the browser menu (⋮) and select "Add to Home screen" or "Install app".';
      installHint.classList.toggle('hidden');
    });
  }

  if (installHintClose && installHint) {
    installHintClose.addEventListener('click', () => {
      installHint.classList.add('hidden');
    });
  }
}

// Initialize
initUsers();
initInstallPrompt();
syncFromFirebase();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
