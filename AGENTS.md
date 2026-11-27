# Agent Context & Architecture Guide (`1-Min Quiz`)

This document provides complete technical context for AI coding agents working on this repository. Keep this repository strictly free of any proprietary, internal, or machine-specific paths/credentials.

> **Context & Token Hygiene Rule (`data/` directory)**:
> **NEVER** read, view, or grep large minified files inside `data/` (`data/quiz-datasets.js` and `data/geo-map-data.js`) unless the user explicitly asks to add or edit raw dataset entries. Those files contain single-line minified arrays (~250 KB total) that will waste context quota. Their global variable names and tuple schemas (along with `data/study-de-a1-en.js`) are documented in Section 2 below.

---

## 1. Overview & Live Deployment Topology

**1-Min Quiz** is a mobile-first 1-minute quiz web app and PWA across five categories (**🔢 Math**, **🌍 Geo**, **💬 Lang**, **🎓 Study**, **🧩 Other**) with multi-user support, practice mode, interactive replays, head-to-head ghost races, player profile pages, and global leaderboards.

The project uses a split-hosting architecture so `localStorage` stays on a single canonical origin while social media links get dynamic server-rendered Open Graph previews:

1. **Canonical Web App & PWA (GitHub Pages)**:
   - URL: `https://kssilveira.github.io/math-leaderboard/`
   - Hosts the static PWA (`index.html`, `style.css`, `assets/icons/*`, `data/geo-map-data.js`, `data/quiz-datasets.js`, `data/study-de-a1-en.js`, `js/geo-maps.js`, `js/quiz-data.js`, `js/app.js`, `sw.js`, `manifest.json`).
   - All gameplay, user profiles, and `localStorage` state live on this origin.
2. **Dynamic Open Graph & Share Proxy (Vercel Edge)**:
   - URL: `https://math-leaderboard.vercel.app/`
   - `middleware.js` intercepts requests to `/` and `/index.html`:
     - **Social Crawlers** (`Twitterbot`, `facebookexternalhit`, `WhatsApp`, `Discordbot`, `Slackbot`, `LinkedInBot`, `TelegramBot`, etc.) or `?og_preview=1`: Serves HTML with dynamic Open Graph (`og:*`) and Twitter (`twitter:*`) meta tags pointing `og:image` to `https://math-leaderboard.vercel.app/api/og?...`.
     - **Human Browsers**: Responds with an HTTP `307` redirect to `https://kssilveira.github.io/math-leaderboard/` (preserving `?replay=`, `?config=`, or `?user=` query parameters).
   - `api/og.js` (`@vercel/og` Edge Function) generates `1200 × 630` PNG preview images for:
     - **Home Overview** (`/api/og`): Shows a 2×2 gameplay showcase across all four categories (Math, Geography, Language, Other) alongside live `#1` global leaders across popular games from each category.
     - **Config Leaderboard** (`/api/og?config=<configId>`): Shows a config-specific preview card (math equation or 2-choice quiz sample) alongside the live Top 10 leaderboard fetched from Firebase.
     - **Player Profile Page** (`/api/og?user=<userId>&u=<username>`): Fetches `/leaderboards.json`, computes the player's ranks and scores across all configs, and renders their summary stats and top performances.
     - **Solo Replay** (`/api/og?replay=<base64url>`): Renders the player's score, accuracy, pace, and question-by-question breakdown.
     - **Ghost Race Replay** (`/api/og?replay=<base64url>` with opponent `o` payload): Renders the head-to-head banner, dual-player score timeline SVG chart, and question log.
3. **Android App (Google Play Trusted Web Activity)**:
   - Package ID: `io.github.kssilveira.twa`
   - Digital Asset Links (`/.well-known/assetlinks.json`) are hosted on the root GitHub Pages site (`https://kssilveira.github.io/.well-known/assetlinks.json`).
   - Android closed-testing links in the footer and install banner are automatically hidden when running inside standalone/TWA mode (`isStandaloneApp()` in `js/app.js`).

---

## 2. Repository Structure

- `index.html`: Single-page app markup containing three main views:
  - `#home-view`: User switcher, Topic switcher (`🔢 Math`, `🌍 Geo`, `💬 Lang`, `🎓 Study`, `🧩 Other`), Language sub-filters (`#lang-switcher-row`, `#lang-with-row`), Study filters (`#study-learn-row`, `#study-with-row`, `#study-cefr-row`), Game config switcher (with `▾ All (N)` / `▴ Less` 2-column vertical expansion), Set switcher (`#part-switcher-row`), custom Math config builder (`#new-config-panel`), Last Score banner (`#last-result`), Play / Practice buttons, collapsible **My Ranks & Scores** card (`#overview-card`), collapsible **Progress & Review** card (`#review-card`), and paginated **Leaderboard** card.
  - `#user-view`: Full-screen **Player Profile Page** showing a player's summary stats and performances across all games sorted by `🏆 By Rank`, `📈 By Score`, or `🎯 Play Next`.
  - `#game-view`: 1-minute gameplay HUD, Ghost Race live split HUD (`#race-hud-bar`), equation card (`#math-eq-group`) or 2-choice quiz prompt (`#quiz-prompt-group`), numeric keypad (`#keypad`) or 2-choice buttons (`#quiz-choices`), and interactive replay panel (`#replay-panel`).
- `style.css`: Mobile-first styles (`max-width: 440px`), Light/Dark theme CSS variables (`:root` and `:root[data-theme="dark"]`), animations, and responsive layouts.
- `assets/`:
  - `assets/icons/`: App and PWA icons (`favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`).
  - `assets/store/`: Google Play Store listing graphics (`feature-graphic.png` and `screenshot-1..4.png`).
- `data/` (**DO NOT READ OR GREP** unless modifying raw dataset entries):
  - `data/geo-map-data.js`: Defines `GEO_MAP_DATA` (`{ a: encodedArcs, g: countryPolys, v: { [countryName]: [geomIdxs, lon0, lat0, spanY, pinLon, pinLat] } }`), derived from public-domain Natural Earth (`1:50m` + Tuvalu `1:10m`).
  - `data/quiz-datasets.js`: Defines raw quiz datasets:
    - `UN_MEMBER_STATES`: `[[country, flagEmoji, capital], ...]` (193 items)
    - `COMMON_WORDS_1000`: `[[en, pt, es, fr, de], ...]` (1,000 items)
    - `TOP_EMOJIS_1000`: `[[emoji, en, pt, es, fr, de], ...]` (1,000 items)
    - `ENGLISH_SYNONYMS` / `PORTUGUESE_SYNONYMS` / `SPANISH_SYNONYMS` / `FRENCH_SYNONYMS` / `GERMAN_SYNONYMS`: `[[word, match], ...]` (300 items each)
    - `ENGLISH_ANTONYMS` / `PORTUGUESE_ANTONYMS` / `SPANISH_ANTONYMS` / `FRENCH_ANTONYMS` / `GERMAN_ANTONYMS`: `[[word, match], ...]` (300 items each)
    - `ENGLISH_IDIOMS` / `PORTUGUESE_IDIOMS` / `SPANISH_IDIOMS` / `FRENCH_IDIOMS` / `GERMAN_IDIOMS`: `[[idiom, meaning], ...]` (200 items each, monolingual)
    - `CHEMICAL_ELEMENTS_118`: `[[symbol, elementName], ...]` (118 items)
    - `MORSE_CODE_36`: `[[char, morseDotsAndDashes], ...]` (36 items, `A–Z` & `0–9`)
  - `data/study-de-a1-en.js`: Defines Goethe-Zertifikat A1 German-for-English-speakers datasets:
    - `STUDY_DE_A1_EN_VOCAB`: `[[de, en, pos, setKey], ...]` (693 items; `pos` in `'n' | 'v' | 'adj' | 'fn'`; all nouns include `der`/`die`/`das`; 7 thematic `setKey`s)
    - `STUDY_DE_A1_EN_ARTICLES_AKK`: `[[prompt, correct, distractors, ruleNote], ...]` (70 Nominative vs. Accusative cloze items)
    - `STUDY_DE_A1_EN_VERBS`: `[[prompt, correct, distractors, ruleNote, setKey], ...]` (188 items; 4 `setKey`s)
    - `STUDY_DE_A1_EN_GRAMMAR`: `[[prompt, correct, distractors, ruleNote, setKey], ...]` (214 items; 5 `setKey`s)
    - `STUDY_DE_A1_EN_PHRASES`: `[[prompt, correct, distractors, ruleNote, setKey], ...]` (106 items; 4 `setKey`s)
- `js/`:
  - `js/geo-maps.js`: Lightweight (~8 KB) `renderGeoMapSvg()` projection, viewport clipping, and microstate target-ring renderer using `GEO_MAP_DATA`.
  - `js/quiz-data.js`: Config registry defining `BUILTIN_QUIZ_CONFIGS` with **72** built-in 2-choice quiz base configurations (**367** total including mini-parts/sets):
    - **🌍 Geography (`12` configs — 193 UN Member States)**:
      - `cfg_geo_flag_country` (`Flag → Country`)
      - `cfg_geo_country_flag` (`Country → Flag`)
      - `cfg_geo_country_capital` (`Country → Capital`)
      - `cfg_geo_capital_country` (`Capital → Country`)
      - `cfg_geo_flag_capital` (`Flag → Capital`)
      - `cfg_geo_capital_flag` (`Capital → Flag`)
      - `cfg_geo_map_country` (`Map → Country`)
      - `cfg_geo_country_map` (`Country → Map`)
      - `cfg_geo_map_flag` (`Map → Flag`)
      - `cfg_geo_flag_map` (`Flag → Map`)
      - `cfg_geo_map_capital` (`Map → Capital`)
      - `cfg_geo_capital_map` (`Capital → Map`)
    - **💬 Language & Wordplay (`50` configs across `en`, `pt`, `es`, `fr`, `de`)**:
      - `cfg_lang_{src}_{dst}` (all 20 directed translation pairs across `en`, `pt`, `es`, `fr`, `de`, 1,000 most common words each)
      - `cfg_lang_emoji_{code}`, `cfg_lang_{code}_emoji` (`Emoji ↔ Language`, 10 configs, 1,000 most used emojis)
      - `cfg_lang_synonym`, `cfg_lang_synonym_{pt,es,fr,de}` (`Word → Synonym`, 5 configs, 300 pairs each)
      - `cfg_lang_antonym`, `cfg_lang_antonym_{pt,es,fr,de}` (`Word → Antonym`, 5 configs, 300 pairs each)
      - `cfg_lang_idiom_meaning`, `cfg_lang_idiom_meaning_{pt,es,fr,de}`, `cfg_lang_meaning_idiom`, `cfg_lang_meaning_idiom_{pt,es,fr,de}` (`Idiom ↔ Meaning`, 10 monolingual configs, 200 idioms each)
    - **🎓 Study (`6` base configs / `37` including sets — German A1 for English speakers)**:
      - `cfg_study_de_en_a1_vocab_de_en` (`Vocab (DE → EN)`, `distractorMode: 'pos_pool'`, 7 thematic sets)
      - `cfg_study_de_en_a1_vocab_en_de` (`Vocab (EN → DE)`, `distractorMode: 'pos_pool'`, 7 thematic sets)
      - `cfg_study_de_en_a1_grammar` (`Grammar`, `distractorMode: 'explicit'`, 5 topic sets)
      - `cfg_study_de_en_a1_verbs` (`Verbs & Conjugation`, `distractorMode: 'explicit'`, 4 sets)
      - `cfg_study_de_en_a1_articles` (`Articles & Gender`, `distractorMode: 'explicit'`, 4 sets: 3 noun-gender sets derived from `STUDY_DE_A1_EN_VOCAB` + *Nom vs Akk*)
      - `cfg_study_de_en_a1_phrases` (`Everyday Phrases`, `distractorMode: 'explicit'`, 4 sets)
      - Study configs carry `studyLearn`, `studyWith`, `studyCefr`, `shortLabel`, `distractorMode`, and `customParts` (bypassing the default 4-part split in `getPartsForBaseQuizConfig()`).
    - **🧩 Other (`4` configs — 118 IUPAC Elements & 36 Morse Code Characters)**:
      - `cfg_chem_symbol_name` (`Symbol → Element`)
      - `cfg_chem_name_symbol` (`Element → Symbol`)
      - `cfg_other_morse_char` (`Morse → Character`)
      - `cfg_other_char_morse` (`Character → Morse`)
  - `js/app.js`: All client-side application logic.
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
  - `qIdx` is the index of the item in `cfg.items` (`[prompt, expectedAnswer, ...]`).
  - `dIdx` depends on `cfg.distractorMode`:
    - Default / `'pos_pool'`: index of the distractor item in `cfg.items` (uses `cfg.items[dIdx][1]`; `'pos_pool'` samples from items sharing `cfg.items[qIdx][2]` POS tag).
    - `'explicit'`: index into the item's own distractor list `cfg.items[qIdx][2]` (must **not** be shifted when `dIdx === qIdx` in `normalizeQuestionRecord()` or `decodeCompactQuestionsList()`). Optional `ruleNote` lives at `cfg.items[qIdx][3]` and renders in Progress & Review.
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

1. **Adding New Quiz or Study Configs**:
   - Add raw dataset arrays to `data/quiz-datasets.js` (general quizzes) or a dedicated pack file such as `data/study-<learn>-<cefr>-<from>.js` (loaded in `index.html` and precached in `sw.js`), and register the config entries in `js/quiz-data.js` (`BUILTIN_QUIZ_CONFIGS`).
   - Add human-readable labels to `QUIZ_CONFIG_LABELS` and set labels to `getMiniPartLabel()` in both `middleware.js` and `api/og.js`, and add preview samples to `QUIZ_PREVIEW_SAMPLES` in `api/og.js`.
2. **Bumping Service Worker Cache**:
   - Whenever modifying `index.html`, `style.css`, `assets/icons/*`, `data/*`, or `js/*`, increment `CACHE_NAME` in `sw.js` so returning PWA users receive the updated assets immediately.
3. **Testing Locally**:
   - Run `./serve.sh` (defaults to port `8000`, or `./serve.sh <port>`) and open `http://localhost:8000/`.
