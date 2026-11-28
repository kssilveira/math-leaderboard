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

function getUserConfigPerformance(targetUserId, cfgId) {
  const boardObj = leaderboardsMap[cfgId] || {};
  const entries = sortLeaderboard(Object.values(boardObj));
  let currentRank = 1;
  const rankedEntries = entries.map((entry, idx) => {
    if (idx > 0 && entry.score < entries[idx - 1].score) {
      currentRank = idx + 1;
    }
    return { ...entry, rank: currentRank };
  });

  const totalPlayers = rankedEntries.length;
  const myEntry = rankedEntries.find(e => e.userId === targetUserId) || null;
  const bestLocal = myEntry ? null : getBestLocalSession(targetUserId, cfgId);
  const bestScore = myEntry
    ? myEntry.score
    : (bestLocal && typeof bestLocal.score === 'number' ? bestLocal.score : null);
  const rank = myEntry ? myEntry.rank : null;

  let nextRank = null;
  let pointsToTieNext = null;
  let isSoleLeader = false;

  if (myEntry) {
    const nextUp = [...rankedEntries].reverse().find(e => e.score > myEntry.score);
    if (nextUp) {
      nextRank = nextUp.rank;
      pointsToTieNext = nextUp.score - myEntry.score;
    } else {
      const coLeaders = rankedEntries.filter(e => e.score === myEntry.score && e.userId !== targetUserId);
      if (coLeaders.length > 0) {
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
    if (activeConfigId === configId) {
      renderConfigsUI();
      renderLeaderboard();
    }
  } catch (_) {}
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
    const [configsRes, leaderboardsRes] = await Promise.all([
      fetch(`${FIREBASE_DB_URL}/configs.json`),
      fetch(`${FIREBASE_DB_URL}/leaderboards.json`)
    ]);

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
    leaderboardsMap = mergedLeaderboards;
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
    await backfillLocalBestToLeaderboard();
    sortConfigsByLeaderboardSize();

    const urlConfigParam = !hasHandledInitialUrlReplay
      ? new URLSearchParams(window.location.search).get('config')
      : null;
    const savedConfigId =
      urlConfigParam ||
      localStorage.getItem(STORAGE_KEYS.activeConfigId) ||
      (isPlaying || replaySessionData ? activeConfigId : '');
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

    const activeCfg = configs.find(c => c.id === savedConfigId) || configs.find(c => !isMiniConfig(c)) || configs[0];
    activeConfigId = activeCfg.id;
    activeCategory = getConfigCategory(activeCfg);
    localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
    localStorage.setItem(STORAGE_KEYS.activeCategory, activeCategory);

    renderConfigsUI();
    renderLeaderboard();
    renderReview();
    preloadStudyConfigInBackground(activeConfigId);
    checkUrlReplayOnLoad();
  } catch (err) {
    console.error('Failed to sync with Firebase:', err);
  }
}

function getBestLocalSession(targetUserId, targetConfigId) {
  const key = `${targetUserId}__${targetConfigId}`;
  if (bestLocalSessionCache.has(key)) {
    return bestLocalSessionCache.get(key);
  }
  const historyMap = getGameHistoryMap();
  const sessions = Array.isArray(historyMap[key]) ? historyMap[key] : [];
  const regular = sessions.filter(s => s && !s.isPractice && typeof s.score === 'number');
  if (regular.length === 0) {
    bestLocalSessionCache.set(key, null);
    return null;
  }

  let best = regular[0];
  for (let i = 1; i < regular.length; i++) {
    const s = regular[i];
    if (s.score > best.score) {
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
  if (hasRunInitialBackfill) return;
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

    if (!uploadsByUser.has(uId)) {
      uploadsByUser.set(uId, []);
    }
    uploadsByUser.get(uId).push(async () => {
      await ensureConfigPublishedInFirebase(cfgId);
      const res = await writeProtectedLeaderboardEntry(cfgId, uId, slimRecord, normalizedQuestions);
      if (res && res.record) {
        leaderboardsMap[cfgId][uId] = res.record;
      }
    });
  });

  if (uploadsByUser.size === 0) return;
  await Promise.all(
    Array.from(uploadsByUser.values()).map(async (userTasks) => {
      for (const runUpload of userTasks) {
        await runUpload();
      }
    })
  );
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
  const boardObj = leaderboardsMap[activeConfigId] || {};
  const entries = sortLeaderboard(Object.values(boardObj));
  let currentRank = 1;
  const rankedEntries = entries.map((entry, index) => {
    if (index > 0 && entry.score < entries[index - 1].score) {
      currentRank = index + 1;
    }
    return { ...entry, rank: currentRank };
  });

  const totalEntries = rankedEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / LEADERBOARD_PAGE_SIZE));
  leaderboardPage = Math.max(1, Math.min(totalPages, leaderboardPage));

  const myIndex = rankedEntries.findIndex(e => e.userId === userId);
  const myEntry = myIndex >= 0 ? rankedEntries[myIndex] : null;
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
      const nextUpEntry = [...rankedEntries].reverse().find(e => e.score > myEntry.score);
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

// --- Local Storage Game Review & Per-Question Performance (Per User & Config) ---

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
    let bestIdx = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (s && !s.isPractice && typeof s.score === 'number' && s.score > bestScore) {
        bestScore = s.score;
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
  const key = `${gameSession.userId}__${gameSession.configId}`;
  const historyList = Array.isArray(map[key]) ? map[key] : [];
  historyList.unshift(compactSessionForStorage(gameSession));
  map[key] = historyList.slice(0, 20); // Keep last 20 games per user+config
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
    svg += `<line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="var(--border)" stroke-dasharray="3 3" stroke-width="1" />`;
    svg += `<text x="${padLeft - 6}" y="${(parseFloat(y) + 3.5).toFixed(1)}" text-anchor="end" font-size="10" font-weight="600" fill="var(--text-muted)">${tick}</text>`;
  });

  // X-axis labels (#1 .. #N)
  if (n === 1) {
    svg += `<text x="${getX(0).toFixed(1)}" y="${height - 5}" text-anchor="middle" font-size="10" font-weight="600" fill="var(--text-muted)">#1</text>`;
  } else {
    svg += `<text x="${getX(0).toFixed(1)}" y="${height - 5}" text-anchor="start" font-size="10" font-weight="600" fill="var(--text-muted)">#1</text>`;
    svg += `<text x="${getX(n - 1).toFixed(1)}" y="${height - 5}" text-anchor="end" font-size="10" font-weight="600" fill="var(--text-muted)">#${n}</text>`;
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
  const map = getGameHistoryMap();
  const key = `${userId}__${activeConfigId}`;
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
    reviewSummaryBadge.textContent = `${avgSec}s avg · ${lastSession.right} right · ${lastSession.wrong} wrong`;
  }

  if (!isReviewExpanded) {
    return;
  }

  renderHistoryChart(sessions || []);

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
          const cfgId = compKey.slice(sep + 2);
          const canonical = resolveConfigIdAlias(cfgId);
          if (canonical === cfgId) return;

          const oldList = Array.isArray(map[compKey]) ? map[compKey] : [];
          const targetKey = `${uId}__${canonical}`;
          const targetList = Array.isArray(map[targetKey]) ? [...map[targetKey]] : [];
          const seen = new Set(
            targetList.map((s) => `${s?.timestamp || 0}|${s?.score}|${s?.right}|${s?.wrong}|${s?.isPractice ? 1 : 0}`)
          );
          oldList.forEach((s) => {
            if (!s || typeof s !== 'object') return;
            const normSession = { ...s, configId: canonical };
            const sig = `${normSession.timestamp || 0}|${normSession.score}|${normSession.right}|${normSession.wrong}|${normSession.isPractice ? 1 : 0}`;
            if (!seen.has(sig)) {
              seen.add(sig);
              targetList.push(normSession);
            }
          });
          targetList.sort((a, b) => (Number(b?.timestamp) || 0) - (Number(a?.timestamp) || 0));
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
