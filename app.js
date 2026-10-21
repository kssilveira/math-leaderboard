// Optional cloud configuration for GitHub Pages deployment.
// Fill in EITHER firebaseDbUrl (Firebase Realtime Database) OR supabaseUrl + supabaseAnonKey.
// When left empty, the leaderboard uses localStorage as a fallback so it works out of the box.
const CLOUD_CONFIG = {
  firebaseDbUrl: '', // e.g. 'https://your-project-default-rtdb.firebaseio.com'
  supabaseUrl: '',   // e.g. 'https://xyzcompany.supabase.co'
  supabaseAnonKey: ''
};

const STORAGE_KEYS = {
  users: 'math_users_v1',
  userId: 'math_user_id',
  username: 'math_username',
  localLeaderboard: 'math_leaderboard_v1'
};

const GAME_DURATION_SECONDS = 60;

// State
let users = []; // [{ userId: string, username: string }]
let userId = '';
let username = '';
let timerInterval = null;
let timeLeft = GAME_DURATION_SECONDS;
let isPlaying = false;
let rightCount = 0;
let wrongCount = 0;
let currentQuestion = null; // { nums: [a, b, c], op: '+'|'-', missingIndex: 0|1|2, answer: number }
let typedAnswer = '';
let isWrong = false;

// DOM Elements
const usernameInput = document.getElementById('username-input');
const userListEl = document.getElementById('user-list');
const addUserBtn = document.getElementById('add-user-btn');
const deleteUserBtn = document.getElementById('delete-user-btn');
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

// --- Multi-User Identity & LocalStorage ---

function generateRandomUsername() {
  const adjectives = ['Swift', 'Bright', 'Clever', 'Quick', 'Sharp', 'Lucky', 'Bold', 'Calm', 'Keen', 'Prime'];
  const nouns = ['Fox', 'Owl', 'Lynx', 'Hawk', 'Wolf', 'Bear', 'Otter', 'Falcon', 'Panda', 'Tiger'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj}${noun}${num}`;
}

function generateUserId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
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
    btn.className = 'user-pill' + (u.userId === userId ? ' active' : '');
    btn.textContent = u.username;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', u.userId === userId ? 'true' : 'false');
    btn.addEventListener('click', () => switchUser(u.userId));
    userListEl.appendChild(btn);
  });
}

function initUser() {
  const rawUsers = localStorage.getItem(STORAGE_KEYS.users);
  if (rawUsers) {
    try {
      users = JSON.parse(rawUsers);
    } catch (_) {
      users = [];
    }
  }

  // Migrate existing single user or create initial user if empty
  if (!Array.isArray(users) || users.length === 0) {
    const existingId = localStorage.getItem(STORAGE_KEYS.userId) || generateUserId();
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
    userId: generateUserId(),
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
      userId: generateUserId(),
      username: generateRandomUsername()
    });
  }

  userId = users[0].userId;
  username = users[0].username;
  saveUsersToStorage();

  usernameInput.value = username;
  lastResult.classList.add('hidden');
  renderUserList();

  await deleteLeaderboardUser(deletedUserId);
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

  await updateLeaderboardUsername(userId, username);
  await refreshLeaderboard();
}

// --- Leaderboard Storage (Firebase / Supabase / Local Fallback) ---

function getSeededLocalLeaderboard() {
  const raw = localStorage.getItem(STORAGE_KEYS.localLeaderboard);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      // Fall through to seed
    }
  }
  const seed = [
    { userId: 'seed_1', username: 'PrimeFalcon812', score: 42, updatedAt: 1700000001 },
    { userId: 'seed_2', username: 'SwiftOwl304', score: 38, updatedAt: 1700000002 },
    { userId: 'seed_3', username: 'CleverFox911', score: 35, updatedAt: 1700000003 },
    { userId: 'seed_4', username: 'SharpLynx128', score: 31, updatedAt: 1700000004 },
    { userId: 'seed_5', username: 'QuickHawk550', score: 28, updatedAt: 1700000005 },
    { userId: 'seed_6', username: 'BoldWolf219', score: 24, updatedAt: 1700000006 },
    { userId: 'seed_7', username: 'KeenOtter773', score: 20, updatedAt: 1700000007 },
    { userId: 'seed_8', username: 'BrightPanda402', score: 16, updatedAt: 1700000008 },
    { userId: 'seed_9', username: 'LuckyTiger635', score: 12, updatedAt: 1700000009 },
    { userId: 'seed_10', username: 'CalmBear190', score: 8, updatedAt: 1700000010 }
  ];
  localStorage.setItem(STORAGE_KEYS.localLeaderboard, JSON.stringify(seed));
  return seed;
}

async function fetchAllScores() {
  // 1. Firebase Realtime Database REST API
  if (CLOUD_CONFIG.firebaseDbUrl) {
    const baseUrl = CLOUD_CONFIG.firebaseDbUrl.replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/leaderboard.json`);
    if (res.ok) {
      const data = await res.json();
      if (!data) return [];
      return Object.values(data);
    }
  }

  // 2. Supabase PostgREST API
  if (CLOUD_CONFIG.supabaseUrl && CLOUD_CONFIG.supabaseAnonKey) {
    const baseUrl = CLOUD_CONFIG.supabaseUrl.replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/rest/v1/leaderboard?select=*&order=score.desc`, {
      headers: {
        apikey: CLOUD_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${CLOUD_CONFIG.supabaseAnonKey}`
      }
    });
    if (res.ok) {
      return await res.json();
    }
  }

  // 3. LocalStorage fallback
  return getSeededLocalLeaderboard();
}

async function submitScoreToLeaderboard(score) {
  const all = await fetchAllScores();
  const existing = all.find(entry => entry.userId === userId);
  const bestScore = existing ? Math.max(existing.score, score) : score;
  const record = {
    userId,
    username,
    score: bestScore,
    updatedAt: Date.now()
  };

  // Always mirror to local storage as backup
  const localList = getSeededLocalLeaderboard();
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
  localStorage.setItem(STORAGE_KEYS.localLeaderboard, JSON.stringify(localList));

  // 1. Firebase Realtime Database
  if (CLOUD_CONFIG.firebaseDbUrl) {
    const baseUrl = CLOUD_CONFIG.firebaseDbUrl.replace(/\/$/, '');
    await fetch(`${baseUrl}/leaderboard/${encodeURIComponent(userId)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    return;
  }

  // 2. Supabase
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

async function updateLeaderboardUsername(targetUserId, newUsername) {
  const localList = getSeededLocalLeaderboard();
  const idx = localList.findIndex(e => e.userId === targetUserId);
  if (idx >= 0) {
    localList[idx].username = newUsername;
    localStorage.setItem(STORAGE_KEYS.localLeaderboard, JSON.stringify(localList));
  }

  if (CLOUD_CONFIG.firebaseDbUrl) {
    const baseUrl = CLOUD_CONFIG.firebaseDbUrl.replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/leaderboard/${encodeURIComponent(targetUserId)}.json`);
    if (res.ok) {
      const existing = await res.json();
      if (existing) {
        await fetch(`${baseUrl}/leaderboard/${encodeURIComponent(targetUserId)}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: newUsername })
        });
      }
    }
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

async function deleteLeaderboardUser(targetUserId) {
  const localList = getSeededLocalLeaderboard().filter(e => e.userId !== targetUserId);
  localStorage.setItem(STORAGE_KEYS.localLeaderboard, JSON.stringify(localList));

  if (CLOUD_CONFIG.firebaseDbUrl) {
    const baseUrl = CLOUD_CONFIG.firebaseDbUrl.replace(/\/$/, '');
    await fetch(`${baseUrl}/leaderboard/${encodeURIComponent(targetUserId)}.json`, {
      method: 'DELETE'
    });
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

function sortLeaderboard(entries) {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.updatedAt || 0) - (b.updatedAt || 0);
  });
}

async function refreshLeaderboard() {
  try {
    const entries = sortLeaderboard(await fetchAllScores());
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

// --- Math Game Logic ---

function generateQuestion() {
  let candidate;
  do {
    const isAddition = Math.random() < 0.5;
    let a, b, c, op;
    if (isAddition) {
      op = '+';
      a = Math.floor(Math.random() * 10); // 0..9
      b = Math.floor(Math.random() * 10); // 0..9
      c = a + b; // 0..18 (non-negative)
    } else {
      op = '-';
      a = Math.floor(Math.random() * 10); // 0..9
      b = Math.floor(Math.random() * (a + 1)); // 0..a so c = a - b >= 0
      c = a - b; // 0..9 (non-negative)
    }
    const nums = [a, b, c];
    const missingIndex = Math.floor(Math.random() * 3); // 0, 1, or 2
    candidate = {
      nums,
      op,
      missingIndex,
      answer: nums[missingIndex],
      key: `${a}${op}${b}=${c}?${missingIndex}`
    };
  } while (currentQuestion && candidate.key === currentQuestion.key);

  return candidate;
}

function renderQuestion() {
  const slots = [slot0, slot1, slot2];
  slotOp.textContent = currentQuestion.op;

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

  // If the answer has 2 digits (10..18) and the user typed '1', wait for the 2nd digit
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
  // Save any pending username edit first
  saveUsername(usernameInput.value);

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

playBtn.addEventListener('click', startGame);
quitBtn.addEventListener('click', () => finishGame(false));

// Fast touch/click response on the 3-digits-per-row keypad
keypad.addEventListener('pointerdown', (e) => {
  const btn = e.target.closest('.key-btn');
  if (!btn) return;
  e.preventDefault();
  handleDigitInput(btn.dataset.digit);
});

// Fallback for keyboard navigation / accessibility click
keypad.addEventListener('click', (e) => {
  if (e.detail !== 0) return; // Ignore pointer-triggered click already handled by pointerdown
  const btn = e.target.closest('.key-btn');
  if (!btn) return;
  handleDigitInput(btn.dataset.digit);
});

// Physical keyboard support (0-9)
window.addEventListener('keydown', (e) => {
  if (!isPlaying) return;
  if (document.activeElement === usernameInput) return;
  if (e.key >= '0' && e.key <= '9') {
    e.preventDefault();
    handleDigitInput(e.key);
  }
});

// Initialize
initUser();
refreshLeaderboard();
