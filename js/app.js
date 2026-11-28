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
  studyAutoSpeak: 'math_study_auto_speak_v1',
  activeGameMode: 'math_active_game_mode_v1'
};

const GAME_DURATION_SECONDS = 60;
const ALL_MODE_MAX_QUESTIONS = 100;
const ALL_MODE_MAX_DURATION_MS = 1800000;
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
let timeLeaderboardsMap = {}; // { [configId]: { [userId]: { userId, username, durationMs, right, wrong, targetCount, updatedAt } } }
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
const timeConfigSyncTimestamps = new Map();
const CONFIG_REFRESH_TTL_MS = 30000;
const replayCacheMap = new Map();
const timeReplayCacheMap = new Map();
let firebaseReplaysPathSupported = true;
let firebaseTimeLeaderboardsSupported = true;
let activeGameMode = localStorage.getItem(STORAGE_KEYS.activeGameMode) === 'all' ? 'all' : '1min';
let activePlayMode = '1min';
let allModeDeck = [];
let allModeTargetCount = 0;
let allModeRaceUsedInitial = new Set();
let stopwatchRafId = null;
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
let userPageMode = activeGameMode;
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
const modeListEl = document.getElementById('mode-list');
const modeBtns = modeListEl ? Array.from(modeListEl.querySelectorAll('[data-mode]')) : [];
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
const userMode1MinBtn = document.getElementById('user-mode-1min-btn');
const userModeAllBtn = document.getElementById('user-mode-all-btn');
const userScopeFullBtn = document.getElementById('user-scope-full-btn');
const userScopeMiniBtn = document.getElementById('user-scope-mini-btn');
const userFilterToggleBtn = document.getElementById('user-filter-toggle-btn');
const userFiltersPanel = document.getElementById('user-filters-panel');
const userPageList = document.getElementById('user-page-list');
const userPagePagination = document.getElementById('user-page-pagination');
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
const overviewPagination = document.getElementById('overview-pagination');
const reviewCard = document.getElementById('review-card');
const reviewToggleBtn = document.getElementById('review-toggle-btn');
const reviewChevron = document.getElementById('review-chevron');
const reviewBody = document.getElementById('review-body');
const reviewSummaryBadge = document.getElementById('review-summary-badge');
const chartSection = document.querySelector('.chart-section');
const historyChart = document.getElementById('history-chart');
const chartLegendPrimary = document.getElementById('chart-legend-primary');
const chartLegendSecondaryWrap = document.getElementById('chart-legend-secondary-wrap');
const chartLegendBest = document.getElementById('chart-legend-best');
const sortImproveBtn = document.getElementById('sort-improve-btn');
const sortOrderBtn = document.getElementById('sort-order-btn');
const sortPracticeBtn = document.getElementById('sort-practice-btn');
const reviewList = document.getElementById('review-list');
const timerDisplay = document.getElementById('timer-display');
const hudScoreLabel = document.getElementById('hud-score-label');
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

modeBtns.forEach((btn) => {
  btn.addEventListener('click', () => switchGameMode(btn.dataset.mode));
});

getSwitcherRows().forEach((row) => {
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
    finishGame(activePlayMode !== 'all');
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

if (userMode1MinBtn) {
  userMode1MinBtn.addEventListener('click', () => {
    userPageMode = '1min';
    renderUserPage();
  });
}

if (userModeAllBtn) {
  userModeAllBtn.addEventListener('click', () => {
    userPageMode = 'all';
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
  const urlParams = new URLSearchParams(window.location.search);
  const urlModeParam = urlParams.get('mode');
  if (urlModeParam === 'all' || urlModeParam === '1min') {
    activeGameMode = urlModeParam;
    localStorage.setItem(STORAGE_KEYS.activeGameMode, activeGameMode);
  }
  const urlConfigParam = urlParams.get('config');
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
  if (document.hidden) {
    flushQuestionStatsToStorage();
  } else if (typeof syncOneMinTimer === 'function') {
    syncOneMinTimer();
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
