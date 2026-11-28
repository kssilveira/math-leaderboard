const FIREBASE_DB_URL = 'https://math-leaderboard-122f4-default-rtdb.europe-west1.firebasedatabase.app';

const STORAGE_KEYS = {
  users: 'math_users_v1',
  userId: 'math_user_id',
  username: 'math_username',
  activeCategory: 'math_active_category_v1',
  activeLearnLang: 'math_active_learn_lang_v1',
  activeWithLang: 'math_active_with_lang_v1',
  activeStudyCefr: 'math_active_study_cefr_v1',
  activeConfigId: 'math_active_config_id',
  localConfigs: 'math_local_configs_v1',
  gameHistory: 'math_game_history_v1',
  questionStats: 'math_question_stats_v1',
  reviewExpanded: 'math_review_expanded_v1',
  overviewExpanded: 'math_overview_expanded_v1',
  configsExpanded: 'math_configs_expanded_v1',
  switchersExpanded: 'math_switchers_expanded_v1',
  soundEnabled: 'math_sound_enabled_v1',
  theme: 'math_theme_v1',
  landscapeConfigs: 'math_landscape_configs_v1',
  overviewScope: 'math_overview_scope_v1',
  overviewExcludedFilters: 'math_overview_filters_v1',
  studyAutoSpeak: 'math_study_auto_speak_v1'
};

const GAME_DURATION_SECONDS = 60;
const ALL_OPS = ['+', '-', '×', '÷'];
const COMPACT_OPS = ['+', '-', '×', '÷', '?'];
const MAX_LOCAL_USERS = 8;
const MAX_LOCAL_CONFIGS = 12;
const MAX_GLOBAL_CONFIGS = 20;
const CONFIG_MIN_BOUND = -999;
const CONFIG_MAX_BOUND = 999;
const MAX_VALID_SCORE = 200;
const MIN_AVG_QUESTION_MS = 250;
const LEADERBOARD_PAGE_SIZE = 10;

// State
let users = []; // [{ userId: string, username: string }]
let userId = '';
let username = '';

let configs = []; // [{ id, category, type, ... }]
let configsByIdMap = new Map();
let localConfigsCache = null;
let landscapeConfigsCache = null;
let gameHistoryCache = null;
const bestLocalSessionCache = new Map();
let questionStatsCache = null;
let questionStatsDirty = false;
let hasCompactedLegacyHistory = false;

let leaderboardsMap = {}; // { [configId]: { [userId]: { userId, username, score, updatedAt } } }
const knownCloudConfigIds = new Set();
const claimedUserIds = new Set();
try {
  const rawClaimed = JSON.parse(sessionStorage.getItem('math_claimed_users_v1') || '[]');
  if (Array.isArray(rawClaimed)) {
    rawClaimed.forEach((id) => {
      if (typeof id === 'string' && id) claimedUserIds.add(id);
    });
  }
} catch (_) {}
let hasRunInitialBackfill = false;
let lastFullSyncAt = 0;
const configSyncTimestamps = new Map();
const CONFIG_REFRESH_TTL_MS = 30000;
const replayCacheMap = new Map();
let firebaseReplaysPathSupported = true;
const rawSavedCategory = localStorage.getItem(STORAGE_KEYS.activeCategory);
let activeCategory = rawSavedCategory === 'chem' ? 'other' : (rawSavedCategory || 'math');
const VALID_LANG_FILTERS = ['en', 'pt', 'es', 'fr', 'de'];
const rawSavedLearnLang = localStorage.getItem(STORAGE_KEYS.activeLearnLang);
const rawSavedWithLang = localStorage.getItem(STORAGE_KEYS.activeWithLang);
const rawLegacyStudyLearn = localStorage.getItem('math_active_study_learn_v1');
const rawLegacyStudyWith = localStorage.getItem('math_active_study_with_v1') || localStorage.getItem('math_active_study_from_v1');
const rawLegacyLangFilter = localStorage.getItem('math_active_lang_filter_v1');
const rawLegacyLangWith = localStorage.getItem('math_active_lang_with_v1');
const pickValidLang = (...candidates) => candidates.find((c) => VALID_LANG_FILTERS.includes(c)) || '';
let activeLearnLang =
  activeCategory === 'lang'
    ? (pickValidLang(rawSavedLearnLang, rawLegacyLangFilter, rawLegacyStudyLearn) || 'de')
    : (pickValidLang(rawSavedLearnLang, rawLegacyStudyLearn, rawLegacyLangFilter) || 'de');
let activeWithLang =
  activeCategory === 'lang'
    ? pickValidLang(rawSavedWithLang, rawLegacyLangWith, rawLegacyStudyWith)
    : pickValidLang(rawSavedWithLang, rawLegacyStudyWith, rawLegacyLangWith);
if (!activeWithLang || activeWithLang === activeLearnLang) {
  activeWithLang = VALID_LANG_FILTERS.find((c) => c !== activeLearnLang) || 'en';
}
let activeStudyCefr = localStorage.getItem(STORAGE_KEYS.activeStudyCefr) || 'a1';
let activeConfigId = '';
let draftConfig = null;
let leaderboardPage = 1;
let quizChoiceLockTimeout = null;
let isPracticeWrongPaused = false;
let practiceWrongShownAt = 0;

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
const PRACTICE_REPEAT_COOLDOWN = 5;
let currentGameQuizDeck = [];
let currentGameQuizDeckConfigId = '';
let currentGameSeenKeys = new Set();
let currentGameRecentKeys = [];
let reviewSortMode = 'improve'; // 'improve' | 'order' | 'practice'
let overviewSortMode = 'next'; // 'next' | 'rank' | 'score'
let overviewScope = localStorage.getItem(STORAGE_KEYS.overviewScope) === 'mini' ? 'mini' : 'full';
let userPageSortMode = 'rank'; // 'rank' | 'score' | 'next'
let userPageScope = 'full';
let viewedUserId = null;
let viewedUsername = '';
let isReviewExpanded = localStorage.getItem(STORAGE_KEYS.reviewExpanded) === '1';
let isOverviewExpanded = localStorage.getItem(STORAGE_KEYS.overviewExpanded) !== '0';
let isOverviewFiltersOpen = false;
let isUserPageFiltersOpen = false;

function loadOverviewExcludedFilters() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.overviewExcludedFilters) || '[]');
    if (Array.isArray(parsed)) {
      return new Set(
        parsed
          .filter((tag) => typeof tag === 'string' && tag)
          .map((tag) => {
            if (tag.startsWith('study_learn:')) return `learn:${tag.slice('study_learn:'.length)}`;
            if (tag.startsWith('study_with:')) return `with:${tag.slice('study_with:'.length)}`;
            return tag;
          })
      );
    }
  } catch (_) {}
  return new Set();
}

function saveOverviewExcludedFilters() {
  try {
    localStorage.setItem(
      STORAGE_KEYS.overviewExcludedFilters,
      JSON.stringify(Array.from(overviewExcludedTags))
    );
  } catch (_) {}
}

const overviewExcludedTags = loadOverviewExcludedFilters();

function loadSwitcherExpandedState() {
  let state = {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.switchersExpanded) || '{}');
    if (parsed && typeof parsed === 'object') state = parsed;
  } catch (_) {}
  if (state.game === undefined && localStorage.getItem(STORAGE_KEYS.configsExpanded) === '1') {
    state.game = true;
  }
  return state;
}

function saveSwitcherExpandedState() {
  try {
    localStorage.setItem(STORAGE_KEYS.switchersExpanded, JSON.stringify(switcherExpandedState));
    localStorage.setItem(STORAGE_KEYS.configsExpanded, switcherExpandedState.game ? '1' : '0');
  } catch (_) {}
}

const switcherExpandedState = loadSwitcherExpandedState();
let isSoundEnabled = localStorage.getItem(STORAGE_KEYS.soundEnabled) !== '0';
let studyAutoSpeak = localStorage.getItem(STORAGE_KEYS.studyAutoSpeak) === '1';
let currentStreak = 0;
let isLoadingStudyPack = false;
let appNoticeTimeout = null;

// DOM Elements
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const usernameInput = document.getElementById('username-input');
const userSwitcherRow = document.getElementById('user-switcher-row');
const userListEl = document.getElementById('user-list');
const addUserBtn = document.getElementById('add-user-btn');
const deleteUserBtn = document.getElementById('delete-user-btn');

const categoryListEl = document.getElementById('category-list');
const categoryBtns = categoryListEl ? Array.from(categoryListEl.querySelectorAll('[data-category]')) : [];
const learnLangRow = document.getElementById('learn-lang-row');
const learnLangListEl = document.getElementById('learn-lang-list');
const withLangRow = document.getElementById('with-lang-row');
const withLangListEl = document.getElementById('with-lang-list');
const studyCefrRow = document.getElementById('study-cefr-row');
const studyCefrListEl = document.getElementById('study-cefr-list');
const configListEl = document.getElementById('config-list');
const partSwitcherRow = document.getElementById('part-switcher-row');
const partListEl = document.getElementById('part-list');
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
const shareConfigBtn = document.getElementById('share-config-btn');

const homeView = document.getElementById('home-view');
const userView = document.getElementById('user-view');
const gameView = document.getElementById('game-view');
const openMyProfileBtn = document.getElementById('open-my-profile-btn');
const overviewShareUserBtn = document.getElementById('overview-share-user-btn');
const userPageLabel = document.getElementById('user-page-label');
const userPageName = document.getElementById('user-page-name');
const userPageStats = document.getElementById('user-page-stats');
const userPageCountBadge = document.getElementById('user-page-count-badge');
const closeUserPageBtn = document.getElementById('close-user-page-btn');
const shareUserPageBtn = document.getElementById('share-user-page-btn');
const userSortRankBtn = document.getElementById('user-sort-rank-btn');
const userSortScoreBtn = document.getElementById('user-sort-score-btn');
const userSortNextBtn = document.getElementById('user-sort-next-btn');
const userScopeFullBtn = document.getElementById('user-scope-full-btn');
const userScopeMiniBtn = document.getElementById('user-scope-mini-btn');
const userFilterToggleBtn = document.getElementById('user-filter-toggle-btn');
const userFiltersPanel = document.getElementById('user-filters-panel');
const userPageList = document.getElementById('user-page-list');
const playBtn = document.getElementById('play-btn');
const practiceBtn = document.getElementById('practice-btn');
const landscapeToggleBtn = document.getElementById('landscape-toggle-btn');
const quitBtn = document.getElementById('quit-btn');
const gameLandscapeBtn = document.getElementById('game-landscape-btn');
const lastResult = document.getElementById('last-result');
const lastScoreLabel = document.getElementById('last-score-label');
const lastScoreValue = document.getElementById('last-score-value');
const lastScoreDetail = document.getElementById('last-score-detail');
const replayLastBtn = document.getElementById('replay-last-btn');
const myRankJump = document.getElementById('my-rank-jump');
const myRankValue = document.getElementById('my-rank-value');
const myBestValue = document.getElementById('my-best-value');
const myBestActions = document.getElementById('my-best-actions');
const nextRankRow = document.getElementById('next-rank-row');
const nextRankText = document.getElementById('next-rank-text');
const nextRankActions = document.getElementById('next-rank-actions');
const replayBestBtn = document.getElementById('replay-best-btn');
const leaderboardList = document.getElementById('leaderboard-list');
const leaderboardPinnedMe = document.getElementById('leaderboard-pinned-me');
const leaderboardPagination = document.getElementById('leaderboard-pagination');
const overviewCard = document.getElementById('overview-card');
const overviewToggleBtn = document.getElementById('overview-toggle-btn');
const overviewChevron = document.getElementById('overview-chevron');
const overviewBody = document.getElementById('overview-body');
const overviewSummaryBadge = document.getElementById('overview-summary-badge');
const overviewSortNextBtn = document.getElementById('overview-sort-next-btn');
const overviewSortRankBtn = document.getElementById('overview-sort-rank-btn');
const overviewSortScoreBtn = document.getElementById('overview-sort-score-btn');
const overviewScopeFullBtn = document.getElementById('overview-scope-full-btn');
const overviewScopeMiniBtn = document.getElementById('overview-scope-mini-btn');
const overviewFilterToggleBtn = document.getElementById('overview-filter-toggle-btn');
const overviewFiltersPanel = document.getElementById('overview-filters-panel');
const overviewList = document.getElementById('overview-list');
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
const equationCard = document.getElementById('equation-card');
const mathEqGroup = document.getElementById('math-eq-group');
const quizPromptGroup = document.getElementById('quiz-prompt-group');
const quizPromptLabel = document.getElementById('quiz-prompt-label');
const quizPromptText = document.getElementById('quiz-prompt-text');
const quizSpeakBtn = document.getElementById('quiz-speak-btn');
const quizAutoSpeakBtn = document.getElementById('quiz-auto-speak-btn');
const quizPracticeNote = document.getElementById('quiz-practice-note');
const quizPracticeHint = document.getElementById('quiz-practice-hint');
const slot0 = document.getElementById('slot-0');
const slot1 = document.getElementById('slot-1');
const slot2 = document.getElementById('slot-2');
const slotOp = document.getElementById('slot-op');
const keypad = document.getElementById('keypad');
const minusKey = document.getElementById('minus-key');
const quizChoicesEl = document.getElementById('quiz-choices');
const quizChoice0Btn = document.getElementById('quiz-choice-0');
const quizChoice1Btn = document.getElementById('quiz-choice-1');
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
const replayLogList = document.getElementById('replay-log-list');
const replayTimeline = document.getElementById('replay-timeline');
const replayRaceChartWrap = document.getElementById('replay-race-chart-wrap');
const replayRaceChart = document.getElementById('replay-race-chart');
const replayChartP1Name = document.getElementById('replay-chart-p1-name');
const replayChartP2Name = document.getElementById('replay-chart-p2-name');
const replayChartLive = document.getElementById('replay-chart-live');
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
const raceOppMath = document.getElementById('race-opp-math');
const raceOppQuiz = document.getElementById('race-opp-quiz');
const raceOppSlot0 = document.getElementById('race-opp-slot-0');
const raceOppSlot1 = document.getElementById('race-opp-slot-1');
const raceOppSlot2 = document.getElementById('race-opp-slot-2');
const raceOppOp = document.getElementById('race-opp-op');
const celebrationCanvas = document.getElementById('celebration-canvas');
const installAppBtn = document.getElementById('install-app-btn');
const installHint = document.getElementById('install-hint');
const installHintText = document.getElementById('install-hint-text');
const installHintClose = document.getElementById('install-hint-close');
const appNotice = document.getElementById('app-notice');
const appNoticeText = document.getElementById('app-notice-text');
const appNoticeClose = document.getElementById('app-notice-close');
let celebrationRafId = null;
let deferredInstallPrompt = null;

// --- Theme (Light / Dark Mode) ---

function getResolvedTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', isDark ? '#0f141f' : '#f5f7fa');
  }
  if (themeToggleBtn) {
    themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
    themeToggleBtn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    themeToggleBtn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    themeToggleBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  }
}

function toggleTheme() {
  const nextTheme = getResolvedTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
  applyTheme(nextTheme);
  playKeyClickSound();
}

function initTheme() {
  applyTheme(getResolvedTheme());
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const saved = localStorage.getItem(STORAGE_KEYS.theme);
      if (saved !== 'dark' && saved !== 'light') {
        applyTheme(mq.matches ? 'dark' : 'light');
      }
    };
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
    } else if (mq.addListener) {
      mq.addListener(onChange);
    }
  }
}

// --- Per-Game Landscape Mode (Active Only During Play) ---

let landscapeCssFallbackTimer = null;
let gameplayOrientationSeq = 0;

function getLandscapeConfigsMap() {
  if (landscapeConfigsCache) return landscapeConfigsCache;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.landscapeConfigs) || '{}');
    landscapeConfigsCache = parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    landscapeConfigsCache = {};
  }
  return landscapeConfigsCache;
}

function getLandscapeStorageKey(cfgId = activeConfigId) {
  if (!cfgId) return '';
  const cfg = getConfigById(cfgId);
  return cfg && cfg.parentId ? cfg.parentId : cfgId;
}

function isConfigLandscape(cfgId = activeConfigId) {
  const key = getLandscapeStorageKey(cfgId);
  if (!key) return false;
  const map = getLandscapeConfigsMap();
  return Boolean(map[key]);
}

function setConfigLandscape(cfgId, enabled) {
  const key = getLandscapeStorageKey(cfgId);
  if (!key) return;
  const map = getLandscapeConfigsMap();
  if (enabled) {
    map[key] = true;
  } else {
    delete map[key];
  }
  landscapeConfigsCache = map;
  try {
    localStorage.setItem(STORAGE_KEYS.landscapeConfigs, JSON.stringify(map));
  } catch (_) {}
}

function updateLandscapeToggleUI() {
  const enabled = isConfigLandscape(activeConfigId);
  const titleText = enabled
    ? 'Landscape mode on for this game (tap to use portrait)'
    : 'Play this game in landscape mode (off — plays in portrait)';
  const ariaLabel = enabled
    ? 'Disable landscape mode for this game'
    : 'Enable landscape mode for this game';

  [landscapeToggleBtn, gameLandscapeBtn].forEach((btn) => {
    if (!btn) return;
    btn.classList.toggle('active', enabled);
    btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    btn.title = titleText;
    btn.setAttribute('aria-label', ariaLabel);
  });
}

function lockPortraitOrientation() {
  if (!window.screen || !screen.orientation) return;
  if (typeof screen.orientation.lock === 'function') {
    screen.orientation.lock('portrait').catch(() => {
      try {
        if (typeof screen.orientation.unlock === 'function') {
          screen.orientation.unlock();
        }
      } catch (_) {}
    });
  } else if (typeof screen.orientation.unlock === 'function') {
    try {
      screen.orientation.unlock();
    } catch (_) {}
  }
}

function applyGameplayOrientation() {
  gameplayOrientationSeq += 1;
  const reqSeq = gameplayOrientationSeq;

  if (landscapeCssFallbackTimer) {
    clearTimeout(landscapeCssFallbackTimer);
    landscapeCssFallbackTimer = null;
  }

  const wantLandscape = Boolean(isPlaying && !isReplaying && isConfigLandscape(activeConfigId));
  if (!wantLandscape) {
    document.documentElement.classList.remove('game-landscape-lock');
    document.body.classList.remove('game-landscape', 'game-css-rotated');
    lockPortraitOrientation();
    return;
  }

  document.documentElement.classList.add('game-landscape-lock');
  document.body.classList.add('game-landscape');

  const isStillCurrent = () =>
    reqSeq === gameplayOrientationSeq && isPlaying && !isReplaying && isConfigLandscape(activeConfigId);

  const canLockNative = Boolean(window.screen && screen.orientation && typeof screen.orientation.lock === 'function');
  if (canLockNative) {
    enterAndroidImmersiveFullscreen()
      .then(() => {
        if (!isStillCurrent()) return;
        return screen.orientation.lock('landscape');
      })
      .then(() => {
        if (!isStillCurrent()) return;
        if (landscapeCssFallbackTimer) {
          clearTimeout(landscapeCssFallbackTimer);
          landscapeCssFallbackTimer = null;
        }
        document.body.classList.remove('game-css-rotated');
      })
      .catch(() => {
        if (!isStillCurrent()) return;
        if (landscapeCssFallbackTimer) {
          clearTimeout(landscapeCssFallbackTimer);
          landscapeCssFallbackTimer = null;
        }
        document.body.classList.add('game-css-rotated');
      });
    landscapeCssFallbackTimer = setTimeout(() => {
      landscapeCssFallbackTimer = null;
      if (isStillCurrent() && window.matchMedia('(orientation: portrait)').matches) {
        document.body.classList.add('game-css-rotated');
      }
    }, 350);
  } else {
    document.body.classList.add('game-css-rotated');
  }
}

function toggleActiveConfigLandscape() {
  if (!activeConfigId) return;
  const nextEnabled = !isConfigLandscape(activeConfigId);
  setConfigLandscape(activeConfigId, nextEnabled);
  playKeyClickSound();
  updateLandscapeToggleUI();
  if (isPlaying && !isReplaying) {
    applyGameplayOrientation();
  }
}

// --- Helpers ---

function generateId(prefix = 'id_') {
  if (window.crypto && crypto.randomUUID) {
    return prefix + crypto.randomUUID();
  }
  return prefix + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
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
  if (addUserBtn) {
    addUserBtn.classList.toggle('hidden', users.length >= MAX_LOCAL_USERS);
  }
  syncSwitcherRowOverflow(userSwitcherRow, { scrollActive: true });
}

function getUserSecret(targetUserId) {
  const userObj = users.find(u => u.userId === targetUserId);
  if (userObj) {
    if (!userObj.secret || typeof userObj.secret !== 'string' || userObj.secret.length < 16) {
      userObj.secret = generateId('sec_');
      saveUsersToStorage();
    }
    return userObj.secret;
  }
  const mapKey = 'math_user_secrets_v1';
  let secretMap = {};
  try {
    secretMap = JSON.parse(localStorage.getItem(mapKey) || '{}') || {};
  } catch (_) {
    secretMap = {};
  }
  if (!secretMap[targetUserId] || secretMap[targetUserId].length < 16) {
    secretMap[targetUserId] = generateId('sec_');
    try {
      localStorage.setItem(mapKey, JSON.stringify(secretMap));
    } catch (_) {}
  }
  return secretMap[targetUserId];
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
    users = [{ userId: existingId, username: existingName, secret: generateId('sec_') }];
  }

  users.forEach((u) => {
    if (!u.secret || typeof u.secret !== 'string' || u.secret.length < 16) {
      u.secret = generateId('sec_');
    }
  });

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
  if (isPlaying || users.length >= MAX_LOCAL_USERS) return;
  const newUser = {
    userId: generateId('u_'),
    username: generateRandomUsername(),
    secret: generateId('sec_')
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
  const deletedUserSecret = getUserSecret(deletedUserId);
  users = users.filter(u => u.userId !== deletedUserId);

  if (users.length === 0) {
    users.push({
      userId: generateId('u_'),
      username: generateRandomUsername(),
      secret: generateId('sec_')
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

  await deleteUserFromFirebase(deletedUserId, deletedUserSecret);
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

function clampConfigBound(val) {
  const n = Math.trunc(Number(val) || 0);
  return Math.max(CONFIG_MIN_BOUND, Math.min(CONFIG_MAX_BOUND, n));
}

function getLocalConfigs() {
  if (localConfigsCache) return localConfigsCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.localConfigs);
    const parsed = raw ? JSON.parse(raw) : [];
    localConfigsCache = Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    localConfigsCache = [];
  }
  return localConfigsCache;
}

function saveLocalConfig(cfg) {
  const list = getLocalConfigs().filter(c => c && c.id && c.id !== cfg.id);
  list.unshift(cfg);
  localConfigsCache = list.slice(0, MAX_LOCAL_CONFIGS);
  try {
    localStorage.setItem(STORAGE_KEYS.localConfigs, JSON.stringify(localConfigsCache));
  } catch (_) {}
}

function getBuiltinQuizConfigs() {
  return typeof BUILTIN_QUIZ_CONFIGS !== 'undefined' && Array.isArray(BUILTIN_QUIZ_CONFIGS)
    ? BUILTIN_QUIZ_CONFIGS
    : [];
}

function rebuildConfigsIndex() {
  const nextMap = new Map();
  getBuiltinQuizConfigs().forEach((c) => {
    if (c && c.id) nextMap.set(c.id, c);
  });
  getLocalConfigs().forEach((c) => {
    if (c && c.id && !nextMap.has(c.id)) nextMap.set(c.id, c);
  });
  configs.forEach((c) => {
    if (c && c.id) nextMap.set(c.id, c);
  });
  configsByIdMap = nextMap;
}

function getConfigCategory(cfg) {
  if (!cfg) return 'math';
  if (cfg.category === 'chem') return 'other';
  if (cfg.category) return cfg.category;
  if (typeof cfg.id === 'string') {
    if (cfg.id.startsWith('cfg_geo_')) return 'geo';
    if (cfg.id.startsWith('cfg_lang_')) return 'lang';
    if (cfg.id.startsWith('cfg_study_')) return 'study';
    if (cfg.id.startsWith('cfg_chem_') || cfg.id.startsWith('cfg_other_')) return 'other';
  }
  return 'math';
}

function isQuizConfig(cfg) {
  if (!cfg) return false;
  const cat = getConfigCategory(cfg);
  return cfg.type === 'quiz' || cat === 'geo' || cat === 'lang' || cat === 'study' || cat === 'other';
}

const RENAMED_CONFIG_ID_RE = /^cfg_study_de_en_a1_(grammar|verbs|articles)(_p\d+)?$/;

function resolveConfigIdAlias(cfgId) {
  if (typeof window !== 'undefined' && typeof window.resolveStudyConfigIdAlias === 'function') {
    return window.resolveStudyConfigIdAlias(cfgId);
  }
  if (typeof cfgId !== 'string' || !cfgId) return cfgId;
  return cfgId.replace(RENAMED_CONFIG_ID_RE, 'cfg_study_de_de_a1_$1$2');
}

function getConfigById(cfgId) {
  if (!cfgId) return null;
  if (configsByIdMap.size === 0) {
    rebuildConfigsIndex();
  }
  const canonicalId = resolveConfigIdAlias(cfgId);
  return configsByIdMap.get(canonicalId) || configsByIdMap.get(cfgId) || null;
}

function preloadStudyConfigInBackground(cfgOrId) {
  const targetCfg = typeof cfgOrId === 'string' ? getConfigById(cfgOrId) : cfgOrId;
  if (!targetCfg || !targetCfg.isLazyStudy || targetCfg.studyDataLoaded) return;
  if (typeof ensureStudyConfigLoaded !== 'function') return;
  const targetId = targetCfg.id;
  ensureStudyConfigLoaded(targetCfg)
    .then((loaded) => {
      if (loaded && activeConfigId === targetId && !isPlaying && !isReplaying) {
        renderReview();
      }
    })
    .catch(() => {});
}

function getConfigId(cfg) {
  if (cfg && cfg.id && isQuizConfig(cfg)) return cfg.id;
  const opNames = { '+': 'add', '-': 'sub', '×': 'mul', '÷': 'div' };
  const opsKey = ALL_OPS.filter(op => cfg.ops.includes(op)).map(op => opNames[op]).join('-');
  return `cfg_${opsKey}_${cfg.min1}_${cfg.max1}_${cfg.min2}_${cfg.max2}_${cfg.min3}_${cfg.max3}`;
}

function createDefaultConfig() {
  const base = {
    category: 'math',
    type: 'math',
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
  if (!cfg) return '';
  if (cfg.label) return cfg.label;
  const opsStr = (cfg.ops || []).map(op => (op === '-' ? '−' : op)).join(' ');
  return `${opsStr} (${cfg.min1}..${cfg.max1}, ${cfg.min2}..${cfg.max2}, ${cfg.min3}..${cfg.max3})`;
}

function isConfigPlayable(cfg) {
  if (!cfg) return false;
  if (isQuizConfig(cfg)) {
    if (cfg.isLazyStudy && !cfg.studyDataLoaded) return true;
    return Array.isArray(cfg.items) && cfg.items.length >= 2;
  }
  return getValidSamplers(cfg).length > 0;
}

function getCategoryIcon(cat) {
  if (cat === 'geo') return '🌍';
  if (cat === 'lang') return '💬';
  if (cat === 'study') return '🎓';
  if (cat === 'other' || cat === 'chem') return '🧩';
  return '🔢';
}

const CATEGORY_DEFAULT_ORDER = ['math', 'geo', 'lang', 'study', 'other'];

function isMiniConfig(cfg) {
  return Boolean(cfg && (cfg.isMini || cfg.parentId));
}

function getBaseConfig(cfg) {
  if (!cfg) return null;
  return cfg.parentId ? (getConfigById(cfg.parentId) || cfg) : cfg;
}

function getPartConfigsForBase(baseConfigId) {
  if (!baseConfigId) return [];
  return configs
    .filter(c => c.parentId === baseConfigId)
    .sort((a, b) => (a.partIndex || 0) - (b.partIndex || 0));
}

function getLeaderboardSize(configId) {
  const board = leaderboardsMap[configId];
  return board ? Object.keys(board).length : 0;
}

function getConfigFamilyLeaderboardSize(cfg) {
  if (!cfg) return 0;
  let total = getLeaderboardSize(cfg.id);
  if (!isMiniConfig(cfg)) {
    for (const c of configs) {
      if (c.parentId === cfg.id) {
        total += getLeaderboardSize(c.id);
      }
    }
  }
  return total;
}

function getCategoryMaxLeaderboardSize(cat) {
  let maxSize = 0;
  for (const cfg of configs) {
    if (getConfigCategory(cfg) === cat) {
      const size = getLeaderboardSize(cfg.id);
      if (size > maxSize) maxSize = size;
    }
  }
  return maxSize;
}

function getCategoryTotalLeaderboardSize(cat) {
  let total = 0;
  for (const cfg of configs) {
    if (getConfigCategory(cfg) === cat) {
      total += getLeaderboardSize(cfg.id);
    }
  }
  return total;
}

function compareCategoriesByPopularity(catA, catB) {
  if (catA === catB) return 0;
  const maxDiff = getCategoryMaxLeaderboardSize(catB) - getCategoryMaxLeaderboardSize(catA);
  if (maxDiff !== 0) return maxDiff;
  const totalDiff = getCategoryTotalLeaderboardSize(catB) - getCategoryTotalLeaderboardSize(catA);
  if (totalDiff !== 0) return totalDiff;
  return CATEGORY_DEFAULT_ORDER.indexOf(catA) - CATEGORY_DEFAULT_ORDER.indexOf(catB);
}

function compareConfigsByPopularity(a, b) {
  const familyDiff = getConfigFamilyLeaderboardSize(b) - getConfigFamilyLeaderboardSize(a);
  if (familyDiff !== 0) return familyDiff;
  const sizeDiff = getLeaderboardSize(b.id) - getLeaderboardSize(a.id);
  if (sizeDiff !== 0) return sizeDiff;
  const catDiff = compareCategoriesByPopularity(getConfigCategory(a), getConfigCategory(b));
  if (catDiff !== 0) return catDiff;
  const builtins = getBuiltinQuizConfigs();
  const aIdx = builtins.findIndex(c => c.id === a.id);
  const bIdx = builtins.findIndex(c => c.id === b.id);
  if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
  return a.id.localeCompare(b.id);
}

function sortConfigsByLeaderboardSize() {
  configs.sort(compareConfigsByPopularity);
}

function getConfigsForCategory(cat) {
  const filtered = configs.filter(c => getConfigCategory(c) === cat);
  return filtered.sort(compareConfigsByPopularity);
}

function getBaseConfigsForCategory(cat) {
  const filtered = configs.filter(c => getConfigCategory(c) === cat && !isMiniConfig(c));
  return filtered.sort(compareConfigsByPopularity);
}

function getActiveConfig() {
  return configs.find(c => c.id === activeConfigId) || configs[0];
}

function appendPillPerfMeta(btn, cfgId) {
  const perf = getUserConfigPerformance(userId, cfgId);
  if (perf.rank !== null || perf.bestScore !== null) {
    const meta = document.createElement('span');
    meta.className = 'pill-meta';
    if (perf.rank !== null) {
      meta.textContent = ` · #${perf.rank} (${perf.bestScore})`;
    } else {
      meta.textContent = ` · (${perf.bestScore})`;
    }
    btn.appendChild(meta);
  }
}

function configMatchesLangFilter(cfg, learnCode = activeLearnLang, withCode = activeWithLang) {
  if (!cfg || !Array.isArray(cfg.langs) || cfg.langs.length === 0) return false;
  if (!learnCode) return true;
  if (cfg.langs.length === 1) {
    return cfg.langs[0] === learnCode;
  }
  if (!withCode || withCode === learnCode) return false;
  return cfg.langs.length === 2 && cfg.langs.includes(learnCode) && cfg.langs.includes(withCode);
}

function configMatchesStudyFilters(
  cfg,
  learn = activeLearnLang,
  withLang = activeWithLang,
  cefr = activeStudyCefr
) {
  if (!cfg) return false;
  if (learn && cfg.studyLearn !== learn) return false;
  if (cefr && cfg.studyCefr !== cefr) return false;
  if (withLang && cfg.studyWith !== cfg.studyLearn && cfg.studyWith !== withLang) return false;
  return true;
}

function getStudyLangDisplay(code, fallbackFlag = '') {
  const meta = typeof STUDY_LANGUAGE_META !== 'undefined' ? STUDY_LANGUAGE_META[code] : null;
  const upper = String(code || '').toUpperCase();
  return meta && meta.flag ? `${meta.flag} ${upper}` : (fallbackFlag ? `${fallbackFlag} ${upper}` : upper);
}

function getAvailableLangPairOptions(cat = activeCategory) {
  const sortByOrder = (set, order) =>
    Array.from(set).sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.localeCompare(b);
    });

  if (cat === 'lang') {
    const langConfigs = getBaseConfigsForCategory('lang');
    const learnSet = new Set();
    langConfigs.forEach((c) => {
      if (Array.isArray(c.langs)) {
        c.langs.forEach((code) => {
          if (VALID_LANG_FILTERS.includes(code)) learnSet.add(code);
        });
      }
    });
    const learnOptions = sortByOrder(learnSet, VALID_LANG_FILTERS);
    const resolvedLearn = learnOptions.includes(activeLearnLang) ? activeLearnLang : (learnOptions[0] || '');

    const withSet = new Set();
    langConfigs.forEach((c) => {
      if (Array.isArray(c.langs) && c.langs.length === 2 && c.langs.includes(resolvedLearn)) {
        const other = c.langs.find((code) => code !== resolvedLearn);
        if (other && VALID_LANG_FILTERS.includes(other)) withSet.add(other);
      }
    });
    const withOptions = sortByOrder(withSet, VALID_LANG_FILTERS);
    const resolvedWith = withOptions.includes(activeWithLang) ? activeWithLang : (withOptions[0] || '');

    return {
      learnOptions,
      withOptions,
      cefrOptions: [],
      resolvedLearn,
      resolvedWith,
      resolvedCefr: activeStudyCefr
    };
  }

  const studyConfigs = getBaseConfigsForCategory('study');
  const learnSet = new Set();
  studyConfigs.forEach((c) => {
    if (c.studyLearn) learnSet.add(c.studyLearn);
  });
  const learnOptions = sortByOrder(learnSet, VALID_LANG_FILTERS);
  const resolvedLearn = learnOptions.includes(activeLearnLang) ? activeLearnLang : (learnOptions[0] || '');

  const withSet = new Set();
  studyConfigs.forEach((c) => {
    if (c.studyLearn === resolvedLearn && c.studyWith && c.studyWith !== resolvedLearn) {
      withSet.add(c.studyWith);
    }
  });
  const withOptions = sortByOrder(withSet, VALID_LANG_FILTERS);
  const resolvedWith = withOptions.includes(activeWithLang) ? activeWithLang : (withOptions[0] || '');

  const cefrOrder = typeof STUDY_CEFR_ORDER !== 'undefined' ? STUDY_CEFR_ORDER : ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
  const cefrSet = new Set();
  studyConfigs.forEach((c) => {
    if (
      c.studyLearn === resolvedLearn &&
      (c.studyWith === resolvedLearn || !resolvedWith || c.studyWith === resolvedWith) &&
      c.studyCefr
    ) {
      cefrSet.add(c.studyCefr);
    }
  });
  const cefrOptions = Array.from(cefrSet).sort((a, b) => {
    const ai = cefrOrder.indexOf(a);
    const bi = cefrOrder.indexOf(b);
    return (ai >= 0 ? ai : 99) - (bi >= 0 ? bi : 99);
  });
  const resolvedCefr = cefrOptions.includes(activeStudyCefr) ? activeStudyCefr : (cefrOptions[0] || '');

  return {
    learnOptions,
    withOptions,
    cefrOptions,
    resolvedLearn,
    resolvedWith,
    resolvedCefr
  };
}

function renderLangFilterPills(listEl, options, activeVal, labelFn, filterType) {
  if (!listEl) return;
  listEl.innerHTML = '';
  options.forEach((val) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isActive = val === activeVal;
    btn.className = 'pill-btn' + (isActive ? ' active' : '');
    btn.textContent = labelFn(val);
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.addEventListener('click', () => switchLangPairFilter(filterType, val));
    listEl.appendChild(btn);
  });
}

function getStudyTrackSuffix(cfgId) {
  const m = String(cfgId || '').match(/^cfg_study_([a-z]+)_([a-z]+)_[a-z0-9]+_(.+?)(?:_p\d+)?$/);
  if (!m) return '';
  const [, learn, withLang, track] = m;
  if (track === `vocab_${learn}_${withLang}`) return 'vocab_from_learn';
  if (track === `vocab_${withLang}_${learn}`) return 'vocab_to_learn';
  if (track === `phrases_${learn}_${withLang}`) return 'phrases_from_learn';
  return track;
}

const switcherRows = Array.from(document.querySelectorAll('#home-view .switcher-row[data-switcher-key]'));

function syncSwitcherActionsVisibility(actionsEl) {
  if (!actionsEl) return;
  const hasVisibleAction = Array.from(actionsEl.children).some(
    (child) => !child.classList.contains('hidden')
  );
  actionsEl.classList.toggle('hidden', !hasVisibleAction);
}

function scrollActivePillIntoView(pillList) {
  if (!pillList) return;
  const activeBtn = pillList.querySelector('.pill-btn.active');
  if (!activeBtn) return;
  const listRect = pillList.getBoundingClientRect();
  const btnRect = activeBtn.getBoundingClientRect();
  if (listRect.width <= 0) return;
  if (btnRect.left < listRect.left) {
    pillList.scrollLeft += btnRect.left - listRect.left - 4;
  } else if (btnRect.right > listRect.right) {
    pillList.scrollLeft += btnRect.right - listRect.right + 4;
  }
}

function syncSwitcherRowOverflow(row, { scrollActive = false } = {}) {
  if (!row || row.classList.contains('hidden') || !homeView || !homeView.classList.contains('active') || row.offsetParent === null) {
    return;
  }
  const pillList = row.querySelector('.pill-list');
  const expandBtn = row.querySelector('.expand-pill-btn');
  const actionsEl = row.querySelector('.switcher-actions');
  const key = row.dataset.switcherKey;
  if (!pillList || !expandBtn || !key) return;

  const pills = Array.from(pillList.children).filter((el) => !el.classList.contains('hidden'));
  const prevScrollLeft = pillList.scrollLeft;

  // Measure pure single-line fit without the expand button so pills that fit on one line never trigger "All".
  row.classList.remove('expanded');
  expandBtn.classList.add('hidden');
  syncSwitcherActionsVisibility(actionsEl);

  if (pillList.clientWidth <= 0) return;

  const overflows = pillList.scrollWidth > pillList.clientWidth + 1;
  const canExpand = pills.length > 1 && overflows;
  const isExpanded = canExpand && Boolean(switcherExpandedState[key]);

  row.classList.toggle('expanded', isExpanded);
  expandBtn.classList.toggle('hidden', !canExpand);
  expandBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  expandBtn.textContent = isExpanded ? '▴ Less' : `▾ All (${pills.length})`;
  syncSwitcherActionsVisibility(actionsEl);

  if (!isExpanded) {
    if (key === 'game' && canExpand) {
      const activeBtn = pillList.querySelector('.pill-btn.active');
      if (activeBtn && pillList.firstElementChild !== activeBtn) {
        pillList.prepend(activeBtn);
      }
      pillList.scrollLeft = 0;
    } else {
      pillList.scrollLeft = prevScrollLeft;
      if (scrollActive) {
        scrollActivePillIntoView(pillList);
      }
    }
  }
}

function updateAllSwitcherRowsOverflow(options = {}) {
  switcherRows.forEach((row) => syncSwitcherRowOverflow(row, options));
}

function renderConfigsUI() {
  const activeCfg = getActiveConfig();
  if (!activeCfg) return;
  const activeBaseCfg = getBaseConfig(activeCfg) || activeCfg;
  activeCategory = getConfigCategory(activeCfg);
  localStorage.setItem(STORAGE_KEYS.activeCategory, activeCategory);

  if (categoryListEl && categoryBtns.length > 0) {
    const sortedBtns = [...categoryBtns].sort((a, b) =>
      compareCategoriesByPopularity(a.dataset.category, b.dataset.category)
    );
    const currentChildren = Array.from(categoryListEl.children);
    const orderChanged =
      sortedBtns.length !== currentChildren.length ||
      sortedBtns.some((btn, idx) => currentChildren[idx] !== btn);
    if (orderChanged) {
      sortedBtns.forEach((btn) => categoryListEl.appendChild(btn));
    }
  }

  categoryBtns.forEach((btn) => {
    const isCatActive = btn.dataset.category === activeCategory;
    btn.classList.toggle('active', isCatActive);
    btn.setAttribute('aria-selected', isCatActive ? 'true' : 'false');
  });

  const isLang = activeCategory === 'lang';
  const isStudy = activeCategory === 'study';
  const showLangPair = isLang || isStudy;

  if (learnLangRow) learnLangRow.classList.toggle('hidden', !showLangPair);
  if (withLangRow) withLangRow.classList.toggle('hidden', !showLangPair);
  if (studyCefrRow) studyCefrRow.classList.toggle('hidden', !isStudy);

  if (isLang && !configMatchesLangFilter(activeBaseCfg, activeLearnLang, activeWithLang)) {
    const cfgLangs = Array.isArray(activeBaseCfg.langs)
      ? activeBaseCfg.langs.filter((code) => VALID_LANG_FILTERS.includes(code))
      : [];
    const prevLearn = activeLearnLang;
    if (cfgLangs.length === 1) {
      activeLearnLang = cfgLangs[0];
      if (activeWithLang === activeLearnLang) {
        activeWithLang =
          prevLearn && prevLearn !== activeLearnLang
            ? prevLearn
            : (VALID_LANG_FILTERS.find((code) => code !== activeLearnLang) || 'en');
      }
    } else if (cfgLangs.length >= 2) {
      if (cfgLangs.includes(activeLearnLang)) {
        activeWithLang = cfgLangs.find((code) => code !== activeLearnLang) || cfgLangs[0];
      } else if (cfgLangs.includes(activeWithLang)) {
        activeLearnLang = cfgLangs.find((code) => code !== activeWithLang) || cfgLangs[0];
      } else {
        activeLearnLang = cfgLangs[0];
        activeWithLang = cfgLangs[1];
      }
    } else {
      activeLearnLang = 'de';
      activeWithLang = 'en';
    }
    localStorage.setItem(STORAGE_KEYS.activeLearnLang, activeLearnLang);
    localStorage.setItem(STORAGE_KEYS.activeWithLang, activeWithLang);
  }

  if (isStudy && !configMatchesStudyFilters(activeBaseCfg)) {
    const prevLearn = activeLearnLang;
    if (activeBaseCfg.studyLearn) activeLearnLang = activeBaseCfg.studyLearn;
    if (activeBaseCfg.studyWith && activeBaseCfg.studyWith !== activeBaseCfg.studyLearn) {
      activeWithLang = activeBaseCfg.studyWith;
    } else if (activeWithLang === activeLearnLang) {
      activeWithLang =
        prevLearn && prevLearn !== activeLearnLang
          ? prevLearn
          : (VALID_LANG_FILTERS.find((code) => code !== activeLearnLang) || 'en');
    }
    if (activeBaseCfg.studyCefr) activeStudyCefr = activeBaseCfg.studyCefr;
    localStorage.setItem(STORAGE_KEYS.activeLearnLang, activeLearnLang);
    localStorage.setItem(STORAGE_KEYS.activeWithLang, activeWithLang);
    localStorage.setItem(STORAGE_KEYS.activeStudyCefr, activeStudyCefr);
  }

  if (showLangPair) {
    const pairOpts = getAvailableLangPairOptions(activeCategory);
    if (pairOpts.resolvedLearn && pairOpts.resolvedLearn !== activeLearnLang) {
      activeLearnLang = pairOpts.resolvedLearn;
      localStorage.setItem(STORAGE_KEYS.activeLearnLang, activeLearnLang);
    }
    if (pairOpts.resolvedWith && pairOpts.resolvedWith !== activeWithLang) {
      activeWithLang = pairOpts.resolvedWith;
      localStorage.setItem(STORAGE_KEYS.activeWithLang, activeWithLang);
    }
    if (isStudy && pairOpts.resolvedCefr && pairOpts.resolvedCefr !== activeStudyCefr) {
      activeStudyCefr = pairOpts.resolvedCefr;
      localStorage.setItem(STORAGE_KEYS.activeStudyCefr, activeStudyCefr);
    }
    if (withLangRow) {
      withLangRow.classList.toggle('hidden', pairOpts.withOptions.length === 0);
    }
    renderLangFilterPills(
      learnLangListEl,
      pairOpts.learnOptions,
      activeLearnLang,
      (code) => getStudyLangDisplay(code),
      'learn'
    );
    renderLangFilterPills(
      withLangListEl,
      pairOpts.withOptions,
      activeWithLang,
      (code) => getStudyLangDisplay(code),
      'with'
    );
    if (isStudy) {
      renderLangFilterPills(
        studyCefrListEl,
        pairOpts.cefrOptions,
        activeStudyCefr,
        (lvl) => String(lvl || '').toUpperCase(),
        'cefr'
      );
    }
  }

  if (addConfigBtn) {
    addConfigBtn.classList.toggle('hidden', activeCategory !== 'math');
  }
  if (activeCategory !== 'math') {
    closeNewConfigPanel();
  }

  configListEl.innerHTML = '';
  const allCategoryConfigs = getBaseConfigsForCategory(activeCategory);
  const categoryConfigs =
    isLang
      ? allCategoryConfigs.filter((c) => configMatchesLangFilter(c, activeLearnLang, activeWithLang))
      : isStudy
        ? allCategoryConfigs.filter((c) => configMatchesStudyFilters(c))
        : allCategoryConfigs;

  categoryConfigs.forEach((cfg) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isBaseActive = cfg.id === activeBaseCfg.id;
    btn.className = 'pill-btn' + (isBaseActive ? ' active' : '');
    const pillLabel = activeCategory === 'study' && cfg.shortLabel ? cfg.shortLabel : formatConfigLabel(cfg);
    const labelText = document.createTextNode(pillLabel);
    btn.appendChild(labelText);
    appendPillPerfMeta(btn, cfg.id);

    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', isBaseActive ? 'true' : 'false');
    btn.addEventListener('click', () => switchConfig(cfg.id));
    configListEl.appendChild(btn);
  });

  if (partSwitcherRow && partListEl) {
    const parts = getPartConfigsForBase(activeBaseCfg.id);
    if (parts.length === 0) {
      partSwitcherRow.classList.add('hidden');
      partListEl.innerHTML = '';
    } else {
      partSwitcherRow.classList.remove('hidden');
      partListEl.innerHTML = '';
      const setOptions = [
        { id: activeBaseCfg.id, label: 'All' },
        ...parts.map(p => ({ id: p.id, label: p.partLabel || `Part ${p.partIndex}` }))
      ];
      setOptions.forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const isSetActive = opt.id === activeCfg.id;
        btn.className = 'pill-btn' + (isSetActive ? ' active' : '');
        btn.appendChild(document.createTextNode(opt.label));
        appendPillPerfMeta(btn, opt.id);
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', isSetActive ? 'true' : 'false');
        btn.addEventListener('click', () => switchConfig(opt.id));
        partListEl.appendChild(btn);
      });
    }
  }

  updateAllSwitcherRowsOverflow({ scrollActive: true });

  leaderboardConfigBadge.textContent = formatConfigLabel(activeCfg);

  if (!isQuizConfig(activeCfg)) {
    const allowsNegative = activeCfg.min1 < 0 || activeCfg.min2 < 0 || activeCfg.min3 < 0;
    minusKey.classList.toggle('hidden', !allowsNegative);
  } else {
    minusKey.classList.add('hidden');
  }

  updateLandscapeToggleUI();
}

async function switchCategory(targetCat) {
  if (isPlaying) return;
  if (!CATEGORY_DEFAULT_ORDER.includes(targetCat)) return;
  activeCategory = targetCat;
  localStorage.setItem(STORAGE_KEYS.activeCategory, activeCategory);
  closeNewConfigPanel();
  lastResult.classList.add('hidden');

  const catConfigs = getBaseConfigsForCategory(targetCat);
  const currentCfg = getActiveConfig();
  if ((!currentCfg || getConfigCategory(currentCfg) !== targetCat) && catConfigs.length > 0) {
    const preferredCfg =
      targetCat === 'lang'
        ? (catConfigs.find(c => configMatchesLangFilter(c, activeLearnLang, activeWithLang)) || catConfigs[0])
        : targetCat === 'study'
          ? (catConfigs.find(c => configMatchesStudyFilters(c)) || catConfigs[0])
          : catConfigs[0];
    activeConfigId = preferredCfg.id;
    leaderboardPage = 1;
    localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
  } else if (currentCfg) {
    localStorage.setItem(STORAGE_KEYS.activeConfigId, currentCfg.id);
  }

  renderConfigsUI();
  renderLeaderboard();
  renderReview();
  preloadStudyConfigInBackground(activeConfigId);
}

function switchLangPairFilter(filterType, targetValue) {
  if (isPlaying) return;
  if (filterType === 'learn') {
    const prevLearn = activeLearnLang;
    activeLearnLang = targetValue;
    if (activeWithLang === targetValue && prevLearn && prevLearn !== targetValue) {
      activeWithLang = prevLearn;
    }
  } else if (filterType === 'with') {
    activeWithLang = targetValue;
  } else if (filterType === 'cefr') {
    activeStudyCefr = targetValue;
  } else {
    return;
  }

  const opts = getAvailableLangPairOptions(activeCategory);
  if (opts.resolvedLearn) activeLearnLang = opts.resolvedLearn;
  if (opts.resolvedWith) activeWithLang = opts.resolvedWith;
  if (activeCategory === 'study' && opts.resolvedCefr) {
    activeStudyCefr = opts.resolvedCefr;
  }
  localStorage.setItem(STORAGE_KEYS.activeLearnLang, activeLearnLang);
  localStorage.setItem(STORAGE_KEYS.activeWithLang, activeWithLang);
  localStorage.setItem(STORAGE_KEYS.activeStudyCefr, activeStudyCefr);

  if (activeCategory !== 'study' && activeCategory !== 'lang') return;

  const activeCfg = getActiveConfig();
  const activeBaseCfg = getBaseConfig(activeCfg);

  if (activeCategory === 'study') {
    const activePartIdx = activeCfg && activeCfg.isMini ? activeCfg.partIndex : 0;
    if (!configMatchesStudyFilters(activeBaseCfg)) {
      const matching = getBaseConfigsForCategory('study').filter(c => configMatchesStudyFilters(c));
      if (matching.length > 0) {
        const suffix = getStudyTrackSuffix(activeBaseCfg && activeBaseCfg.id);
        const sameTrack = suffix ? matching.find(c => getStudyTrackSuffix(c.id) === suffix) : null;
        const targetBase = sameTrack || matching[0];
        const matchingPart = sameTrack && filterType === 'with' && activePartIdx > 0
          ? getPartConfigsForBase(targetBase.id).find(p => p.partIndex === activePartIdx)
          : null;
        activeConfigId = (matchingPart || targetBase).id;
        leaderboardPage = 1;
        localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
        closeNewConfigPanel();
        lastResult.classList.add('hidden');
        renderConfigsUI();
        renderLeaderboard();
        renderReview();
        renderOverview();
        refreshSingleConfigLeaderboard(activeConfigId);
        preloadStudyConfigInBackground(activeConfigId);
        return;
      }
    }
    renderConfigsUI();
    renderOverview();
    preloadStudyConfigInBackground(activeConfigId);
    return;
  }

  // activeCategory === 'lang'
  if (!configMatchesLangFilter(activeBaseCfg, activeLearnLang, activeWithLang)) {
    const matching = getBaseConfigsForCategory('lang').filter(c => configMatchesLangFilter(c, activeLearnLang, activeWithLang));
    if (matching.length > 0) {
      const preferBilingual =
        filterType === 'with' &&
        activeBaseCfg &&
        Array.isArray(activeBaseCfg.langs) &&
        activeBaseCfg.langs.length === 2;
      const targetBase = preferBilingual
        ? (matching.find(c => Array.isArray(c.langs) && c.langs.length === 2) || matching[0])
        : matching[0];
      activeConfigId = targetBase.id;
      leaderboardPage = 1;
      localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
      closeNewConfigPanel();
      lastResult.classList.add('hidden');
      renderConfigsUI();
      renderLeaderboard();
      renderReview();
      renderOverview();
      refreshSingleConfigLeaderboard(activeConfigId);
      return;
    }
  }
  renderConfigsUI();
  renderOverview();
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
  if (isPlaying || activeCategory !== 'math') return;
  const active = getActiveConfig();
  const base = active && !isQuizConfig(active) ? active : createDefaultConfig();
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
    min1: clampConfigBound(draftConfig.min1),
    max1: clampConfigBound(draftConfig.max1),
    min2: clampConfigBound(draftConfig.min2),
    max2: clampConfigBound(draftConfig.max2),
    min3: clampConfigBound(draftConfig.min3),
    max3: clampConfigBound(draftConfig.max3)
  };
  const newCfg = {
    id: getConfigId(base),
    category: 'math',
    type: 'math',
    ...base
  };

  // Save locally first; only publish to Firebase once a game is completed with a positive score
  saveLocalConfig(newCfg);
  if (!configs.some(c => c.id === newCfg.id)) {
    configs.push(newCfg);
  }
  rebuildConfigsIndex();

  activeConfigId = newCfg.id;
  localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
  closeNewConfigPanel();
  lastResult.classList.add('hidden');

  renderConfigsUI();
  renderLeaderboard();
  renderReview();
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
    return Number.isNaN(parsed) ? fallback : clampConfigBound(parsed);
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
  leaderboardPage = 1;
  localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
  closeNewConfigPanel();
  lastResult.classList.add('hidden');
  renderConfigsUI();
  renderLeaderboard();
  renderReview();
  refreshSingleConfigLeaderboard(target.id);
  preloadStudyConfigInBackground(target.id);
}

// --- Event Listeners ---

usernameInput.addEventListener('change', () => saveUsername(usernameInput.value));
usernameInput.addEventListener('blur', () => saveUsername(usernameInput.value));
usernameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    usernameInput.blur();
  }
});

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', toggleTheme);
}
if (soundToggleBtn) {
  soundToggleBtn.addEventListener('click', toggleSound);
}
addUserBtn.addEventListener('click', addUser);
deleteUserBtn.addEventListener('click', deleteCurrentUser);

categoryBtns.forEach((btn) => {
  btn.addEventListener('click', () => switchCategory(btn.dataset.category));
});

switcherRows.forEach((row) => {
  const expandBtn = row.querySelector('.expand-pill-btn');
  const key = row.dataset.switcherKey;
  if (!expandBtn || !key) return;
  expandBtn.addEventListener('click', () => {
    switcherExpandedState[key] = !switcherExpandedState[key];
    saveSwitcherExpandedState();
    if (key === 'game') {
      renderConfigsUI();
    } else {
      syncSwitcherRowOverflow(row, { scrollActive: true });
    }
  });
});

if (homeView && typeof ResizeObserver !== 'undefined') {
  let lastObservedHomeWidth = Math.round(homeView.clientWidth);
  const homeResizeObserver = new ResizeObserver(() => {
    if (!homeView.classList.contains('active')) {
      lastObservedHomeWidth = 0;
      return;
    }
    const nextWidth = Math.round(homeView.clientWidth);
    if (nextWidth > 0 && nextWidth !== lastObservedHomeWidth) {
      lastObservedHomeWidth = nextWidth;
      updateAllSwitcherRowsOverflow();
    }
  });
  homeResizeObserver.observe(homeView);
} else {
  window.addEventListener('resize', () => updateAllSwitcherRowsOverflow());
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => updateAllSwitcherRowsOverflow());
}

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
if (landscapeToggleBtn) {
  landscapeToggleBtn.addEventListener('click', toggleActiveConfigLandscape);
}
if (gameLandscapeBtn) {
  gameLandscapeBtn.addEventListener('click', toggleActiveConfigLandscape);
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
if (replayBestBtn) {
  replayBestBtn.addEventListener('click', async () => {
    const best = await resolveMyBestReplaySession();
    if (best) startReplay(best);
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
if (replayBannerRaceBtn) {
  replayBannerRaceBtn.addEventListener('click', () => {
    if (replaySessionData && replaySessionData.session) {
      startRace(replaySessionData.session);
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
if (quizSpeakBtn) {
  quizSpeakBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const revealAnswer = Boolean(isPracticeMode && isWrong && !isReplaying);
    const payload = getStudyPromptSpeakPayload(getActiveConfig(), currentQuestion, revealAnswer);
    if (payload) {
      speakStudyText(payload.text, payload.lang);
      if (isPracticeWrongPaused) {
        schedulePracticeWrongAdvance(2800);
      }
    }
  });
}
if (quizAutoSpeakBtn) {
  quizAutoSpeakBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    studyAutoSpeak = !studyAutoSpeak;
    try {
      localStorage.setItem(STORAGE_KEYS.studyAutoSpeak, studyAutoSpeak ? '1' : '0');
    } catch (_) {}
    const activeCfg = getActiveConfig();
    syncAutoSpeakBtnUI(activeCfg);
    if (studyAutoSpeak && isPlaying && isPracticeMode && !isReplaying) {
      const revealAnswer = Boolean(isWrong);
      const payload = getStudyPromptSpeakPayload(activeCfg, currentQuestion, revealAnswer);
      if (payload && hasSpeechVoiceForLang(payload.lang)) {
        speakStudyText(payload.text, payload.lang);
        if (isPracticeWrongPaused) {
          schedulePracticeWrongAdvance(2800);
        }
      }
    } else if (!studyAutoSpeak) {
      stopStudySpeech();
    }
  });
}
if (equationCard) {
  equationCard.addEventListener('pointerdown', (e) => {
    if (!isPracticeWrongPaused) return;
    if (e.target && (e.target.closest('#quiz-speak-btn') || e.target.closest('#quiz-auto-speak-btn'))) return;
    e.preventDefault();
    advanceFromPracticeWrong();
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

if (shareConfigBtn) {
  shareConfigBtn.addEventListener('click', () => copyConfigLink(activeConfigId, shareConfigBtn));
}

if (openMyProfileBtn) {
  openMyProfileBtn.addEventListener('click', () => openUserPage(userId, username));
}

if (overviewShareUserBtn) {
  overviewShareUserBtn.addEventListener('click', () => openUserPage(userId, username));
}

if (closeUserPageBtn) {
  closeUserPageBtn.addEventListener('click', () => closeUserPage(null));
}

if (shareUserPageBtn) {
  shareUserPageBtn.addEventListener('click', () =>
    copyUserPageLink(viewedUserId || userId, viewedUsername || username, shareUserPageBtn)
  );
}

if (userSortRankBtn) {
  userSortRankBtn.addEventListener('click', () => {
    userPageSortMode = 'rank';
    renderUserPage();
  });
}

if (userSortScoreBtn) {
  userSortScoreBtn.addEventListener('click', () => {
    userPageSortMode = 'score';
    renderUserPage();
  });
}

if (userSortNextBtn) {
  userSortNextBtn.addEventListener('click', () => {
    userPageSortMode = 'next';
    renderUserPage();
  });
}

if (userScopeFullBtn) {
  userScopeFullBtn.addEventListener('click', () => {
    userPageScope = 'full';
    renderUserPage();
  });
}

if (userScopeMiniBtn) {
  userScopeMiniBtn.addEventListener('click', () => {
    userPageScope = 'mini';
    renderUserPage();
  });
}

if (userFilterToggleBtn) {
  userFilterToggleBtn.addEventListener('click', () => {
    isUserPageFiltersOpen = !isUserPageFiltersOpen;
    renderUserPage();
  });
}

if (overviewToggleBtn) {
  overviewToggleBtn.addEventListener('click', () => {
    isOverviewExpanded = !isOverviewExpanded;
    localStorage.setItem(STORAGE_KEYS.overviewExpanded, isOverviewExpanded ? '1' : '0');
    if (isOverviewExpanded) {
      renderOverview();
    } else {
      updateOverviewCollapseUI();
    }
  });
}

if (overviewFilterToggleBtn) {
  overviewFilterToggleBtn.addEventListener('click', () => {
    isOverviewFiltersOpen = !isOverviewFiltersOpen;
    renderOverview();
  });
}

if (overviewScopeFullBtn) {
  overviewScopeFullBtn.addEventListener('click', () => {
    overviewScope = 'full';
    localStorage.setItem(STORAGE_KEYS.overviewScope, overviewScope);
    renderOverview();
  });
}

if (overviewScopeMiniBtn) {
  overviewScopeMiniBtn.addEventListener('click', () => {
    overviewScope = 'mini';
    localStorage.setItem(STORAGE_KEYS.overviewScope, overviewScope);
    renderOverview();
  });
}

if (overviewSortNextBtn) {
  overviewSortNextBtn.addEventListener('click', () => {
    overviewSortMode = 'next';
    renderOverview();
  });
}

if (overviewSortRankBtn) {
  overviewSortRankBtn.addEventListener('click', () => {
    overviewSortMode = 'rank';
    renderOverview();
  });
}

if (overviewSortScoreBtn) {
  overviewSortScoreBtn.addEventListener('click', () => {
    overviewSortMode = 'score';
    renderOverview();
  });
}

if (reviewToggleBtn) {
  reviewToggleBtn.addEventListener('click', () => {
    isReviewExpanded = !isReviewExpanded;
    localStorage.setItem(STORAGE_KEYS.reviewExpanded, isReviewExpanded ? '1' : '0');
    if (isReviewExpanded) {
      renderReview();
    } else {
      updateReviewCollapseUI();
    }
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

// Fast touch/click response on the 2-choice quiz buttons
if (quizChoicesEl) {
  quizChoicesEl.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.choice-btn');
    if (!btn) return;
    e.preventDefault();
    handleChoiceInput(Number(btn.dataset.choice));
  });

  quizChoicesEl.addEventListener('click', (e) => {
    if (e.detail !== 0) return;
    const btn = e.target.closest('.choice-btn');
    if (!btn) return;
    handleChoiceInput(Number(btn.dataset.choice));
  });
}

// Physical keyboard support (0-9 and - for Math; 1/2 or ArrowLeft/ArrowRight for Quiz)
window.addEventListener('keydown', (e) => {
  if (!isPlaying) return;
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (isPracticeWrongPaused) {
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === '1' || e.key === '2') {
      e.preventDefault();
      advanceFromPracticeWrong();
    }
    return;
  }
  if (currentQuestion && currentQuestion.op === '?') {
    if (e.key === '1' || e.key === 'ArrowLeft') {
      e.preventDefault();
      handleChoiceInput(0);
    } else if (e.key === '2' || e.key === 'ArrowRight') {
      e.preventDefault();
      handleChoiceInput(1);
    }
    return;
  }
  if ((e.key >= '0' && e.key <= '9') || e.key === '-') {
    e.preventDefault();
    handleDigitInput(e.key);
  }
});

// On Android, hide the bottom system navigation bar on tap (unless focusing a text/number input)
document.addEventListener('click', (e) => {
  if (e.target && e.target.closest('input')) return;
  enterAndroidImmersiveFullscreen().then(() => {
    if (!isPlaying || isReplaying || !isConfigLandscape(activeConfigId)) {
      lockPortraitOrientation();
    }
  });
});

// --- PWA Install Prompt ---

function isStandaloneApp() {
  if (document.referrer && document.referrer.includes('android-app://')) {
    try {
      sessionStorage.setItem('math_twa_session', '1');
    } catch (_) {}
    return true;
  }
  try {
    if (sessionStorage.getItem('math_twa_session') === '1') {
      return true;
    }
  } catch (_) {}
  return (
    window.matchMedia('(display-mode: fullscreen), (display-mode: standalone), (display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true
  );
}

function updateInstallBtnVisibility() {
  const standalone = isStandaloneApp();
  const footerAndroidLinks = document.getElementById('footer-android-links');
  if (footerAndroidLinks) {
    footerAndroidLinks.classList.toggle('hidden', standalone);
  }
  if (!installAppBtn) return;
  if (isPlaying || isReplaying || standalone) {
    installAppBtn.classList.add('hidden');
    if (installHint) installHint.classList.add('hidden');
    return;
  }
  installAppBtn.classList.remove('hidden');
}

function initInstallPrompt() {
  updateInstallBtnVisibility();

  const displayModeMql = window.matchMedia(
    '(display-mode: fullscreen), (display-mode: standalone), (display-mode: minimal-ui)'
  );
  if (displayModeMql && displayModeMql.addEventListener) {
    displayModeMql.addEventListener('change', updateInstallBtnVisibility);
  }

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
    installAppBtn.addEventListener('click', () => {
      if (!installHint || !installHintText) return;
      const isIOS = /(iPhone|iPad|iPod)/i.test(navigator.userAgent);
      if (isIOS) {
        installHintText.innerHTML =
          'iOS: tap Share (⍐) in Safari → "Add to Home Screen" ➕. · Android Beta: <a href="https://groups.google.com/g/1-min-math-testers" target="_blank" rel="noopener noreferrer">Join Tester Group</a>';
      } else {
        installHintText.innerHTML =
          'Test the Android app: 1) Join <a href="https://groups.google.com/g/1-min-math-testers" target="_blank" rel="noopener noreferrer">Google Group</a> · 2) <a href="https://play.google.com/store/apps/details?id=io.github.kssilveira.twa" target="_blank" rel="noopener noreferrer">Join on Android</a> or <a href="https://play.google.com/apps/testing/io.github.kssilveira.twa" target="_blank" rel="noopener noreferrer">Join on the web</a>.';
      }
      installHint.classList.toggle('hidden');
    });
  }

  if (installHintClose && installHint) {
    installHintClose.addEventListener('click', () => {
      installHint.classList.add('hidden');
    });
  }
  if (appNoticeClose) {
    appNoticeClose.addEventListener('click', hideAppNotice);
  }
}

function hideAppNotice() {
  if (appNoticeTimeout) {
    clearTimeout(appNoticeTimeout);
    appNoticeTimeout = null;
  }
  if (appNotice) {
    appNotice.classList.add('hidden');
    appNotice.classList.remove('is-error');
  }
}

function showAppNotice(message, { isError = false, durationMs = 5000 } = {}) {
  if (!appNotice || !appNoticeText) return;
  if (appNoticeTimeout) {
    clearTimeout(appNoticeTimeout);
    appNoticeTimeout = null;
  }
  appNoticeText.textContent = String(message || '');
  appNotice.classList.toggle('is-error', Boolean(isError));
  appNotice.classList.remove('hidden');
  if (durationMs > 0) {
    appNoticeTimeout = setTimeout(() => {
      hideAppNotice();
    }, durationMs);
  }
}

function initConfigs() {
  const defaultCfg = createDefaultConfig();
  const byId = new Map();
  byId.set(defaultCfg.id, defaultCfg);

  getBuiltinQuizConfigs().forEach((qCfg) => {
    byId.set(qCfg.id, qCfg);
  });

  getLocalConfigs().forEach((c) => {
    if (c && Array.isArray(c.ops)) {
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
      if (getValidSamplers(normalized).length > 0) {
        normalized.id = getConfigId(normalized);
        byId.set(normalized.id, normalized);
      }
    }
  });

  configs = Array.from(byId.values());
  rebuildConfigsIndex();
  const urlConfigParam = new URLSearchParams(window.location.search).get('config');
  const savedConfigId = resolveConfigIdAlias(urlConfigParam || localStorage.getItem(STORAGE_KEYS.activeConfigId));
  const activeCfg = configs.find(c => c.id === savedConfigId) || configs.find(c => !isMiniConfig(c)) || configs[0];
  activeConfigId = activeCfg.id;
  activeCategory = getConfigCategory(activeCfg);

  renderConfigsUI();
  renderLeaderboard();
  renderReview();
  preloadStudyConfigInBackground(activeConfigId);
}

// Initialize
initTheme();
initSpeechVoices();
updateSoundToggleUI();
initUsers();
migrateRenamedConfigsInLocalStorage();
initConfigs();
initInstallPrompt();
syncFromFirebase();

window.addEventListener('pagehide', () => flushQuestionStatsToStorage());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flushQuestionStatsToStorage();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
