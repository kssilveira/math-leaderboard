// --- Shared Multi-User Identity & Secrets (LocalStorage) ---

function generateId(prefix = 'id_') {
  if (window.crypto && crypto.randomUUID) {
    return prefix + crypto.randomUUID();
  }
  return prefix + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

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
