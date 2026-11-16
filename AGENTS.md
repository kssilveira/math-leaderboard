# Agent Context & Architecture Guide (`1-Min Quiz`)

This document provides complete technical context for AI coding agents working on this repository. Keep this repository strictly free of any proprietary, internal, or machine-specific paths/credentials.

---

## 1. Overview & Live Deployment Topology

**1-Min Quiz** is a mobile-first 1-minute quiz web app and PWA across four categories (**🔢 Math**, **🌍 Geo**, **💬 Lang**, **🧪 Chem**) with multi-user support, practice mode, interactive replays, head-to-head ghost races, player profile pages, and global leaderboards.

The project uses a split-hosting architecture so `localStorage` stays on a single canonical origin while social media links get dynamic server-rendered Open Graph previews:

1. **Canonical Web App & PWA (GitHub Pages)**:
   - URL: `https://kssilveira.github.io/math-leaderboard/`
   - Hosts the static PWA (`index.html`, `style.css`, `quiz-data.js`, `app.js`, `sw.js`, `manifest.json`).
   - All gameplay, user profiles, and `localStorage` state live on this origin.
2. **Dynamic Open Graph & Share Proxy (Vercel Edge)**:
   - URL: `https://math-leaderboard.vercel.app/`
   - `middleware.js` intercepts requests to `/` and `/index.html`:
     - **Social Crawlers** (`Twitterbot`, `facebookexternalhit`, `WhatsApp`, `Discordbot`, `Slackbot`, `LinkedInBot`, `TelegramBot`, etc.) or `?og_preview=1`: Serves HTML with dynamic Open Graph (`og:*`) and Twitter (`twitter:*`) meta tags pointing `og:image` to `https://math-leaderboard.vercel.app/api/og?...`.
     - **Human Browsers**: Responds with an HTTP `307` redirect to `https://kssilveira.github.io/math-leaderboard/` (preserving `?replay=`, `?config=`, or `?user=` query parameters).
   - `api/og.js` (`@vercel/og` Edge Function) generates `1200 × 630` PNG preview images for:
     - **Config Leaderboard** (`/api/og` or `/api/og?config=<configId>`): Shows a config-specific preview card (math equation or 2-choice quiz sample) alongside the live Top 10 leaderboard fetched from Firebase.
     - **Player Profile Page** (`/api/og?user=<userId>&u=<username>`): Fetches `/leaderboards.json`, computes the player's ranks and scores across all configs, and renders their summary stats and top performances.
     - **Solo Replay** (`/api/og?replay=<base64url>`): Renders the player's score, accuracy, pace, and question-by-question breakdown.
     - **Ghost Race Replay** (`/api/og?replay=<base64url>` with opponent `o` payload): Renders the head-to-head banner, dual-player score timeline SVG chart, and question log.
3. **Android App (Google Play Trusted Web Activity)**:
   - Package ID: `io.github.kssilveira.twa`
   - Digital Asset Links (`/.well-known/assetlinks.json`) are hosted on the root GitHub Pages site (`https://kssilveira.github.io/.well-known/assetlinks.json`).
   - Android closed-testing links in the footer and install banner are automatically hidden when running inside standalone/TWA mode (`isStandaloneApp()` in `app.js`).

---

## 2. Repository Structure

- `index.html`: Single-page app markup containing three main views:
  - `#home-view`: User switcher, Topic switcher (`🔢 Math`, `🌍 Geo`, `💬 Lang`, `🧪 Chem`), Game config switcher (with `▾ All (N)` / `▴ Less` 2-column vertical expansion), custom Math config builder (`#new-config-panel`), Last Score banner (`#last-result`), Play / Practice buttons, collapsible **My Ranks & Scores** card (`#overview-card`), collapsible **Progress & Review** card (`#review-card`), and paginated **Leaderboard** card.
  - `#user-view`: Full-screen **Player Profile Page** showing a player's summary stats and performances across all games sorted by `🏆 By Rank`, `📈 By Score`, or `🎯 Play Next`.
  - `#game-view`: 1-minute gameplay HUD, Ghost Race live split HUD (`#race-hud-bar`), equation card (`#math-eq-group`) or 2-choice quiz prompt (`#quiz-prompt-group`), numeric keypad (`#keypad`) or 2-choice buttons (`#quiz-choices`), and interactive replay panel (`#replay-panel`).
- `style.css`: Mobile-first styles (`max-width: 440px`), Light/Dark theme CSS variables (`:root` and `:root[data-theme="dark"]`), animations, and responsive layouts.
- `quiz-data.js`: Defines `getBuiltinQuizConfigs()` with 22 built-in 2-choice quiz configurations:
  - **🌍 Geography (`6` configs — 193 UN Member States)**:
    - `cfg_geo_flag_country` (`Flag → Country`)
    - `cfg_geo_country_flag` (`Country → Flag`)
    - `cfg_geo_country_capital` (`Country → Capital`)
    - `cfg_geo_capital_country` (`Capital → Country`)
    - `cfg_geo_flag_capital` (`Flag → Capital`)
    - `cfg_geo_capital_flag` (`Capital → Flag`)
  - **💬 Language & Wordplay (`14` configs)**:
    - `cfg_lang_pt_en`, `cfg_lang_es_en`, `cfg_lang_fr_en`, `cfg_lang_de_en` (`Portuguese/Spanish/French/German → English`, 1,000 most common words each)
    - `cfg_lang_en_pt`, `cfg_lang_en_es`, `cfg_lang_en_fr`, `cfg_lang_en_de` (`English → Portuguese/Spanish/French/German`, 1,000 most common words each)
    - `cfg_lang_emoji_en`, `cfg_lang_en_emoji` (`Emoji ↔ English`, 1,000 most used emojis)
    - `cfg_lang_synonym` (`Word → Synonym`, 300 pairs)
    - `cfg_lang_antonym` (`Word → Antonym`, 300 pairs)
    - `cfg_lang_idiom_meaning`, `cfg_lang_meaning_idiom` (`Idiom ↔ Meaning`, 200 idioms & phrasal verbs)
  - **🧪 Chemistry (`2` configs — 118 IUPAC Elements)**:
    - `cfg_chem_symbol_name` (`Symbol → Element`)
    - `cfg_chem_name_symbol` (`Element → Symbol`)
- `app.js`: All client-side application logic.
- `middleware.js`: Vercel Edge Middleware for crawler detection, Open Graph tag injection, and browser redirection.
- `api/og.js`: Vercel Edge Function (`@vercel/og`) rendering dynamic `1200 × 630` PNG Open Graph cards.
- `database.rules.json`: Firebase Realtime Database security and validation rules.
- `sw.js`: Offline-first Service Worker for the app shell.

---

## 3. Key Data Formats & Mechanisms

### Compact Question & Replay Encoding
Both Firebase leaderboard entries (`/leaderboards/$configId/$userId/questions`) and base64url `?replay=` URLs use a compact array tuple per question (`COMPACT_OPS = ['+', '-', '×', '÷', '?']`):

- **Math Questions (`opIdx` in `0..3`)**:
  - Format: `[a, opIdx, b, missingIndex, durationMs, wrongAnswers?]`
  - `c` is derived deterministically from `a (COMPACT_OPS[opIdx]) b`.
  - `missingIndex` (`0`, `1`, or `2`) indicates which slot in `a op b = c` was hidden.
- **2-Choice Quiz Questions (`opIdx === 4`, i.e. `'?'`)**:
  - Format: `[qIdx, 4, dIdx, choiceOrder, durationMs, wrongAnswers?]`
  - `qIdx` is the index of the `[prompt, expectedAnswer]` pair in `cfg.items`.
  - `dIdx` is the index of the distractor item in `cfg.items` (uses `cfg.items[dIdx][1]`).
  - `choiceOrder` (`0` or `1`) indicates whether the correct answer appeared on button `0` (`[expected, distractor]`) or button `1` (`[distractor, expected]`).

### Firebase Realtime Database & Per-User Write Protection
- **Database URL**: `https://math-leaderboard-122f4-default-rtdb.europe-west1.firebasedatabase.app`
- **Ownership Verification without Auth Popups**:
  - Every local user on a device gets a random secret token (`sec_<uuid>`) stored in `localStorage` (`math_user_secrets_v1`).
  - `/userSecrets/$userId` has `.read: false` and only permits writes if `!data.exists()` (claiming a new user ID) or `newData.child('token').val() === data.child('token').val()`.
  - Updating or deleting `/leaderboards/$configId/$userId` is performed via an atomic root `PATCH /.json` that simultaneously updates `/userSecrets/$userId` (`{ token, proof: "${token}_${updatedAt}" }`) and `/leaderboards/$configId/$userId`. `database.rules.json` verifies that `newData.parent().parent().parent().child('userSecrets').child($userId).child('token').val()` matches the existing secret token.

### URL Deep Links & Address Bar Hygiene
- Share helpers (`copyReplayLink`, `copyConfigLink`, `copyUserPageLink`) build links using `getShareBaseUrl()` (`https://math-leaderboard.vercel.app/` when on `github.io`).
- When a visitor opens `?config=<configId>` or `?user=<userId>&u=<username>`:
  - `initConfigs()` / `checkUrlReplayOnLoad()` applies the config or opens `#user-view`, saves the active config to `localStorage`, and immediately clears the query string from the address bar via `window.history.replaceState({}, '', window.location.pathname)`. This prevents users from accidentally sharing a stale `?config=` URL later or resetting their selected config on page reload.
- Replay action buttons (`⚔️ Race` and `🔗 Share Replay`) are intentionally kept inside the Replay view banner (`#replay-result-banner`) rather than duplicated across leaderboard/profile rows; leaderboard and profile rows show only `▶` to open the replay.

---

## 4. Maintenance Checklist for Future Changes

1. **Adding New Quiz Configs**:
   - Add the dataset and config entry to `getBuiltinQuizConfigs()` in `quiz-data.js`.
   - Add the human-readable label to `QUIZ_CONFIG_LABELS` in both `middleware.js` and `api/og.js`, and add a preview sample to `QUIZ_PREVIEW_SAMPLES` in `api/og.js`.
2. **Bumping Service Worker Cache**:
   - Whenever modifying `index.html`, `style.css`, `quiz-data.js`, or `app.js`, increment `CACHE_NAME` in `sw.js` (currently `'math-leaderboard-v28'`) so returning PWA users receive the updated assets immediately.
3. **Testing Locally**:
   - Run `python3 -m http.server 8000 --bind ::` and open `http://localhost:8000/`.
