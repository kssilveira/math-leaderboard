// Optional cloud configuration for GitHub Pages deployment.
// Fill in EITHER firebaseDbUrl (Firebase Realtime Database) OR supabaseUrl + supabaseAnonKey.
// When left empty, leaderboards use localStorage as a fallback so it works out of the box.
const CLOUD_CONFIG = {
  firebaseDbUrl: '', // e.g. 'https://your-project-default-rtdb.firebaseio.com'
  supabaseUrl: '',   // e.g. 'https://xyzcompany.supabase.co'
  supabaseAnonKey: ''
};

const STORAGE_KEYS = {
  users: 'math_users_v1',
  userId: 'math_user_id',
  username: 'math_username',
  configs: 'math_configs_v1',
  activeConfigId: 'math_active_config_id',
  localLeaderboards: 'math_leaderboards_v1',
  legacyLeaderboard: 'math_leaderboard_v1'
};

const GAME_DURATION_SECONDS = 60;
const ALL_OPS = ['+', '-', '×', '÷'];

// State
let users = []; // [{ userId: string, username: string }]
let userId = '';
let username = '';

let configs = []; // Immutable once created: [{ id, ops, min1, max1, min2, max2, min3, max3 }]
let activeConfigId = '';
let draftConfig = null; // Used only while the "+ Game" creation panel is open

let timerInterval = null;
let timeLeft = GAME_DURATION_SECONDS;
let isPlaying = false;
let rightCount = 0;
let wrongCount = 0;
let currentQuestion = null; // { nums: [a, b, c], op, missingIndex: 0|1|2, answer: number, key: string }
let typedAnswer = '';
let isWrong = false;

// DOM Elements
const usernameInput = document.getElementById('username-input');
const userListEl = document.getElementById('user-list');
const addUserBtn = document.getElementById('add-user-btn');
const deleteUserBtn = document.getElementById('delete-user-btn');

const configListEl = document.getElementById('config-list');
const addConfigBtn = document.getElementById('add-config-btn');
const deleteConfigBtn = document.getElementById('delete-config-btn');
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
const quitBtn = document.getElementById('quit-btn');
const lastResult = document.getElementById('last-result');
const lastScoreValue = document.getElementById('last-score-value');
const lastScoreDetail = document.getElementById('last-score-detail');
const myRankValue = document.getElementById('my-rank-value');
const myBestValue = document.getElementById('my-best-value');
const leaderboardList = document.getElementById('leaderboard-list');
const timerDisplay = document.getElementById('timer-display');
const scoreDisplay = document.getElementById('score-display');
const rightDisplay = document.getElementById('right-display');
const wrongDisplay = document.getElementById('wrong-display');
const slot0 = document.getElementById('slot-0');
const slot1 = document.getElementById('slot-1');
const slot2 = document.getElementById('slot-2');
const slotOp = document.getElementById('slot-op');
const keypad = document.getElementById('keypad');
const minusKey = document.getElementById('minus-key');

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

// --- Shared Multi-User Identity ---

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
  await refreshLeaderboard();
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
  await refreshLeaderboard();
}

async function deleteCurrentUser() {
  if (isPlaying) return;
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

  await deleteLeaderboardUserAcrossAllConfigs(deletedUserId);
  await refreshLeaderboard();
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

  await updateLeaderboardUsernameAcrossAllConfigs(userId, username);
  await refreshLeaderboard();
}

// --- Immutable Game Configurations ---

function createDefaultConfig(id = 'cfg_default') {
  return {
    id,
    ops: ['+', '-'],
    min1: 0,
    max1: 9,
    min2: 0,
    max2: 9,
    min3: 0,
    max3: 18
  };
}

function formatConfigLabel(cfg) {
  const opsStr = cfg.ops.map(op => (op === '-' ? '−' : op)).join(' ');
  return `${opsStr} (${cfg.min1}..${cfg.max1}, ${cfg.min2}..${cfg.max2}, ${cfg.min3}..${cfg.max3})`;
}

function getActiveConfig() {
  return configs.find(c => c.id === activeConfigId) || configs[0];
}

function saveConfigsToStorage() {
  localStorage.setItem(STORAGE_KEYS.configs, JSON.stringify(configs));
  localStorage.setItem(STORAGE_KEYS.activeConfigId, activeConfigId);
}

function renderConfigsUI() {
  const activeCfg = getActiveConfig();
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

  // Show minus key on keypad if active game allows negative numbers
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
  const base = getActiveConfig();
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

  const newCfg = {
    id: generateId('cfg_'),
    ops: [...draftConfig.ops],
    min1: draftConfig.min1,
    max1: draftConfig.max1,
    min2: draftConfig.min2,
    max2: draftConfig.max2,
    min3: draftConfig.min3,
    max3: draftConfig.max3
  };

  configs.push(newCfg);
  activeConfigId = newCfg.id;
  saveConfigsToStorage();
  closeNewConfigPanel();
  lastResult.classList.add('hidden');
  renderConfigsUI();
  await refreshLeaderboard();
}

function toggleDraftOperator(op) {
  if (!draftConfig) return;
  if (draftConfig.ops.includes(op)) {
    if (draftConfig.ops.length <= 1) return; // Keep at least 1 operator
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

function initConfigs() {
  const rawConfigs = localStorage.getItem(STORAGE_KEYS.configs);
  if (rawConfigs) {
    try {
      configs = JSON.parse(rawConfigs);
    } catch (_) {
      configs = [];
    }
  }

  // Filter out any invalid legacy configs that might have no valid equations
  if (Array.isArray(configs)) {
    configs = configs.filter(c => c && Array.isArray(c.ops) && getValidSamplers(c).length > 0);
  } else {
    configs = [];
  }

  if (configs.length === 0) {
    configs = [createDefaultConfig('cfg_default')];
  }

  const savedConfigId = localStorage.getItem(STORAGE_KEYS.activeConfigId);
  const activeCfg = configs.find(c => c.id === savedConfigId) || configs[0];
  activeConfigId = activeCfg.id;

  saveConfigsToStorage();
  renderConfigsUI();
}

async function switchConfig(targetConfigId) {
  if (isPlaying) return;
  const target = configs.find(c => c.id === targetConfigId);
  if (!target || target.id === activeConfigId) return;

  activeConfigId = target.id;
  saveConfigsToStorage();
  closeNewConfigPanel();
  lastResult.classList.add('hidden');
  renderConfigsUI();
  await refreshLeaderboard();
}

async function deleteCurrentConfig() {
  if (isPlaying) return;
  const deletedId = activeConfigId;
  configs = configs.filter(c => c.id !== deletedId);

  if (configs.length === 0) {
    configs.push(createDefaultConfig(generateId('cfg_')));
  }

  activeConfigId = configs[0].id;
  saveConfigsToStorage();
  closeNewConfigPanel();
  lastResult.classList.add('hidden');
  renderConfigsUI();

  await deleteConfigLeaderboard(deletedId);
  await refreshLeaderboard();
}

// --- Per-Configuration Leaderboard Storage (Firebase / Supabase / Local Fallback) ---

function getLocalLeaderboardsMap() {
  const raw = localStorage.getItem(STORAGE_KEYS.localLeaderboards);
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

  // Migrate legacy single leaderboard if present
  const map = {};
  const legacyRaw = localStorage.getItem(STORAGE_KEYS.legacyLeaderboard);
  if (legacyRaw) {
    try {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) {
        map.cfg_default = parsed.filter(e => e && !String(e.userId).startsWith('seed_'));
      }
    } catch (_) {
      // Ignore
    }
  }
  localStorage.setItem(STORAGE_KEYS.localLeaderboards, JSON.stringify(map));
  return map;
}

function getLocalScoresForConfig(configId) {
  const map = getLocalLeaderboardsMap();
  return Array.isArray(map[configId]) ? map[configId] : [];
}

function saveLocalScoresForConfig(configId, list) {
  const map = getLocalLeaderboardsMap();
  map[configId] = list;
  localStorage.setItem(STORAGE_KEYS.localLeaderboards, JSON.stringify(map));
}

async function fetchScoresForConfig(configId) {
  // 1. Firebase Realtime Database REST API
  if (CLOUD_CONFIG.firebaseDbUrl) {
    const baseUrl = CLOUD_CONFIG.firebaseDbUrl.replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/leaderboards/${encodeURIComponent(configId)}.json`);
    if (res.ok) {
      const data = await res.json();
      if (!data) return [];
      return Object.values(data);
    }
  }

  // 2. Supabase PostgREST API
  if (CLOUD_CONFIG.supabaseUrl && CLOUD_CONFIG.supabaseAnonKey) {
    const baseUrl = CLOUD_CONFIG.supabaseUrl.replace(/\/$/, '');
    const res = await fetch(
      `${baseUrl}/rest/v1/leaderboard?configId=eq.${encodeURIComponent(configId)}&select=*&order=score.desc`,
      {
        headers: {
          apikey: CLOUD_CONFIG.supabaseAnonKey,
          Authorization: `Bearer ${CLOUD_CONFIG.supabaseAnonKey}`
        }
      }
    );
    if (res.ok) {
      return await res.json();
    }
  }

  // 3. LocalStorage fallback
  return getLocalScoresForConfig(configId);
}

async function submitScoreToLeaderboard(score) {
  const configId = activeConfigId;
  const all = await fetchScoresForConfig(configId);
  const existing = all.find(entry => entry.userId === userId);
  const bestScore = existing ? Math.max(existing.score, score) : score;
  const record = {
    configId,
    userId,
    username,
    score: bestScore,
    updatedAt: Date.now()
  };

  const localList = getLocalScoresForConfig(configId);
  const idx = localList.findIndex(e => e.userId === userId);
  if (idx >= 0) {
    localList[idx] = {
      ...localList[idx],
      username,
      score: Math.max(localList[idx].score, score)
    };
  } else {
    localList.push(record);
  }
  saveLocalScoresForConfig(configId, localList);

  if (CLOUD_CONFIG.firebaseDbUrl) {
    const baseUrl = CLOUD_CONFIG.firebaseDbUrl.replace(/\/$/, '');
    await fetch(
      `${baseUrl}/leaderboards/${encodeURIComponent(configId)}/${encodeURIComponent(userId)}.json`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      }
    );
    return;
  }

  if (CLOUD_CONFIG.supabaseUrl && CLOUD_CONFIG.supabaseAnonKey) {
    const baseUrl = CLOUD_CONFIG.supabaseUrl.replace(/\/$/, '');
    await fetch(`${baseUrl}/rest/v1/leaderboard`, {
      method: 'POST',
      headers: {
        apikey: CLOUD_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${CLOUD_CONFIG.supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify(record)
    });
  }
}

async function updateLeaderboardUsernameAcrossAllConfigs(targetUserId, newUsername) {
  const map = getLocalLeaderboardsMap();
  Object.keys(map).forEach((cfgId) => {
    if (Array.isArray(map[cfgId])) {
      map[cfgId].forEach((entry) => {
        if (entry.userId === targetUserId) {
          entry.username = newUsername;
        }
      });
    }
  });
  localStorage.setItem(STORAGE_KEYS.localLeaderboards, JSON.stringify(map));

  if (CLOUD_CONFIG.firebaseDbUrl) {
    const baseUrl = CLOUD_CONFIG.firebaseDbUrl.replace(/\/$/, '');
    await Promise.all(
      configs.map(async (cfg) => {
        const url = `${baseUrl}/leaderboards/${encodeURIComponent(cfg.id)}/${encodeURIComponent(targetUserId)}.json`;
        const res = await fetch(url);
        if (res.ok && (await res.json())) {
          await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: newUsername })
          });
        }
      })
    );
  } else if (CLOUD_CONFIG.supabaseUrl && CLOUD_CONFIG.supabaseAnonKey) {
    const baseUrl = CLOUD_CONFIG.supabaseUrl.replace(/\/$/, '');
    await fetch(`${baseUrl}/rest/v1/leaderboard?userId=eq.${encodeURIComponent(targetUserId)}`, {
      method: 'PATCH',
      headers: {
        apikey: CLOUD_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${CLOUD_CONFIG.supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: newUsername })
    });
  }
}

async function deleteLeaderboardUserAcrossAllConfigs(targetUserId) {
  const map = getLocalLeaderboardsMap();
  Object.keys(map).forEach((cfgId) => {
    if (Array.isArray(map[cfgId])) {
      map[cfgId] = map[cfgId].filter(e => e.userId !== targetUserId);
    }
  });
  localStorage.setItem(STORAGE_KEYS.localLeaderboards, JSON.stringify(map));

  if (CLOUD_CONFIG.firebaseDbUrl) {
    const baseUrl = CLOUD_CONFIG.firebaseDbUrl.replace(/\/$/, '');
    await Promise.all(
      configs.map(cfg =>
        fetch(
          `${baseUrl}/leaderboards/${encodeURIComponent(cfg.id)}/${encodeURIComponent(targetUserId)}.json`,
          { method: 'DELETE' }
        )
      )
    );
  } else if (CLOUD_CONFIG.supabaseUrl && CLOUD_CONFIG.supabaseAnonKey) {
    const baseUrl = CLOUD_CONFIG.supabaseUrl.replace(/\/$/, '');
    await fetch(`${baseUrl}/rest/v1/leaderboard?userId=eq.${encodeURIComponent(targetUserId)}`, {
      method: 'DELETE',
      headers: {
        apikey: CLOUD_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${CLOUD_CONFIG.supabaseAnonKey}`
      }
    });
  }
}

async function deleteConfigLeaderboard(configId) {
  const map = getLocalLeaderboardsMap();
  delete map[configId];
  localStorage.setItem(STORAGE_KEYS.localLeaderboards, JSON.stringify(map));

  if (CLOUD_CONFIG.firebaseDbUrl) {
    const baseUrl = CLOUD_CONFIG.firebaseDbUrl.replace(/\/$/, '');
    await fetch(`${baseUrl}/leaderboards/${encodeURIComponent(configId)}.json`, {
      method: 'DELETE'
    });
  } else if (CLOUD_CONFIG.supabaseUrl && CLOUD_CONFIG.supabaseAnonKey) {
    const baseUrl = CLOUD_CONFIG.supabaseUrl.replace(/\/$/, '');
    await fetch(`${baseUrl}/rest/v1/leaderboard?configId=eq.${encodeURIComponent(configId)}`, {
      method: 'DELETE',
      headers: {
        apikey: CLOUD_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${CLOUD_CONFIG.supabaseAnonKey}`
      }
    });
  }
}

function sortLeaderboard(entries) {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.updatedAt || 0) - (b.updatedAt || 0);
  });
}

async function refreshLeaderboard() {
  try {
    const entries = sortLeaderboard(await fetchScoresForConfig(activeConfigId));
    const top10 = entries.slice(0, 10);
    const myIndex = entries.findIndex(e => e.userId === userId);

    if (myIndex >= 0) {
      myRankValue.textContent = `#${myIndex + 1} of ${entries.length}`;
      myBestValue.textContent = entries[myIndex].score;
    } else {
      myRankValue.textContent = 'Unranked';
      myBestValue.textContent = '—';
    }

    if (top10.length === 0) {
      leaderboardList.innerHTML = '<li class="empty-row">No scores yet. Be the first!</li>';
      return;
    }

    leaderboardList.innerHTML = '';
    top10.forEach((entry, index) => {
      const li = document.createElement('li');
      const isMe = entry.userId === userId;
      li.className = 'leaderboard-row' + (isMe ? ' is-me' : '');

      const rankSpan = document.createElement('span');
      rankSpan.className = 'rank-num';
      rankSpan.textContent = `#${index + 1}`;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'player-name';
      nameSpan.textContent = entry.username + (isMe ? ' (you)' : '');

      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'player-score';
      scoreSpan.textContent = entry.score;

      li.append(rankSpan, nameSpan, scoreSpan);
      leaderboardList.appendChild(li);
    });
  } catch (err) {
    console.error('Failed to load leaderboard:', err);
  }
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
    if (b !== 0) indices.push(0); // Avoid indeterminate ? × 0 = 0
    if (a !== 0) indices.push(1); // Avoid indeterminate 0 × ? = 0
    return indices;
  }
  if (op === '÷') {
    const indices = [0, 2];
    if (c !== 0) indices.push(1); // Avoid indeterminate 0 ÷ ? = 0
    return indices;
  }
  return [0, 1, 2];
}

function generateQuestion() {
  const cfg = getActiveConfig();
  const samplers = getValidSamplers(cfg);
  if (samplers.length === 0) return null;

  let candidate = null;
  for (let attempt = 0; attempt < 25; attempt++) {
    const sampleFn = samplers[randomInt(0, samplers.length - 1)];
    const { a, b, c, op } = sampleFn();
    const nums = [a, b, c];
    const validIndices = getValidMissingIndices(a, op, b, c);
    const missingIndex = validIndices[randomInt(0, validIndices.length - 1)];
    candidate = {
      nums,
      op,
      missingIndex,
      answer: nums[missingIndex],
      key: `${a}${op}${b}=${c}?${missingIndex}`
    };
    if (!currentQuestion || candidate.key !== currentQuestion.key) {
      break;
    }
  }
  return candidate;
}

function renderQuestion() {
  if (!currentQuestion) return;
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

function updateHud() {
  const score = rightCount - wrongCount;
  scoreDisplay.textContent = score;
  rightDisplay.textContent = rightCount;
  wrongDisplay.textContent = wrongCount;
  timerDisplay.textContent = `${timeLeft}s`;
}

function nextQuestion() {
  currentQuestion = generateQuestion();
  typedAnswer = '';
  isWrong = false;
  renderQuestion();
}

function handleDigitInput(digitStr) {
  if (!isPlaying || !currentQuestion) return;

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
  updateHud();
  renderQuestion();
}

function startGame() {
  saveUsername(usernameInput.value);
  closeNewConfigPanel();

  const samplers = getValidSamplers(getActiveConfig());
  if (samplers.length === 0) return;

  isPlaying = true;
  timeLeft = GAME_DURATION_SECONDS;
  rightCount = 0;
  wrongCount = 0;
  currentQuestion = null;

  deleteUserBtn.classList.add('hidden');
  homeView.classList.remove('active');
  gameView.classList.add('active');

  updateHud();
  nextQuestion();

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft -= 1;
    updateHud();
    if (timeLeft <= 0) {
      finishGame(true);
    }
  }, 1000);
}

async function finishGame(saveScore) {
  clearInterval(timerInterval);
  timerInterval = null;
  isPlaying = false;

  const finalScore = rightCount - wrongCount;

  deleteUserBtn.classList.remove('hidden');
  gameView.classList.remove('active');
  homeView.classList.add('active');

  if (saveScore) {
    lastScoreValue.textContent = finalScore;
    lastScoreDetail.textContent = `${rightCount} right · ${wrongCount} wrong`;
    lastResult.classList.remove('hidden');
    await submitScoreToLeaderboard(finalScore);
  }

  await refreshLeaderboard();
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
deleteConfigBtn.addEventListener('click', deleteCurrentConfig);

opToggleBtns.forEach((btn) => {
  btn.addEventListener('click', () => toggleDraftOperator(btn.dataset.op));
});

[min1Input, max1Input, min2Input, max2Input, min3Input, max3Input].forEach((inputEl) => {
  inputEl.addEventListener('input', updateDraftRangeInputs);
  inputEl.addEventListener('change', updateDraftRangeInputs);
});

playBtn.addEventListener('click', startGame);
quitBtn.addEventListener('click', () => finishGame(true));

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

// Initialize
initUsers();
initConfigs();
refreshLeaderboard();
