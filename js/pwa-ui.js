// --- Theme, Per-Game Landscape Mode, PWA Install Prompt & App Notices ---

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

// --- PWA Install Prompt & Notices ---

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
  const installLabel = deferredInstallPrompt ? 'Install 1-Min Quiz app' : 'Install app on your home screen';
  installAppBtn.title = installLabel;
  installAppBtn.setAttribute('aria-label', installLabel);
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
    if (installHint) installHint.classList.add('hidden');
    updateInstallBtnVisibility();
  });

  if (installAppBtn) {
    installAppBtn.addEventListener('click', async () => {
      if (deferredInstallPrompt && typeof deferredInstallPrompt.prompt === 'function') {
        const promptEvent = deferredInstallPrompt;
        deferredInstallPrompt = null;
        try {
          await promptEvent.prompt();
          const choice = await promptEvent.userChoice;
          if (choice && choice.outcome === 'accepted') {
            if (installHint) installHint.classList.add('hidden');
            updateInstallBtnVisibility();
            return;
          }
        } catch (_) {
          // Fall through to manual install instructions
        }
        updateInstallBtnVisibility();
      }
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
