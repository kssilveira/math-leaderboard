# 1-Minute Quiz (Math, Geography, Language, Study & Other)

Mobile-friendly 1-minute quiz game across **Math**, **Geography** (193 UN member states), **Language** (words, emojis, synonyms, antonyms & idioms), **Study** (CEFR language proficiency tracks — starting with German A1 for English speakers), and **Other** (118 chemical elements & Morse code) with multi-user support, practice mode, interactive replays, ghost races, and global leaderboards backed by Firebase Realtime Database.

- **Play**: **https://kssilveira.github.io/math-leaderboard/**
- **Android App (Google Play Closed Testing)**:
  1. **Join Tester Group**: **https://groups.google.com/g/1-min-math-testers**
  2. **Join on Android**: **https://play.google.com/store/apps/details?id=io.github.kssilveira.twa**
  3. **Join on the Web**: **https://play.google.com/apps/testing/io.github.kssilveira.twa**
- **Share URL** (live Open Graph previews + redirect to GitHub Pages): **https://math-leaderboard.vercel.app/**

  [![Root OG Image](https://math-leaderboard.vercel.app/api/og?v=2)](https://math-leaderboard.vercel.app)

- **Example Game Leaderboard (`+ − (0..10, 0..10, 0..20)`)**: click on the image below

  [![Main Config OG Image](https://math-leaderboard.vercel.app/api/og?config=cfg_add-sub_0_10_0_10_0_20)](https://math-leaderboard.vercel.app/?config=cfg_add-sub_0_10_0_10_0_20)

- **Example Replay (`kaue: 60`)**: click on the image below

  [![Replay OG Image](https://math-leaderboard.vercel.app/api/og?replay=eyJ1Ijoia2F1ZSIsImMiOiJjZmdfYWRkLXN1Yl8wXzEwXzBfMTBfMF8yMCIsInMiOjYwLCJyIjo2MCwidyI6MCwiZCI6NjAwMDIsInEiOltbMSwxLDEsMiwxMDc0XSxbMCwxLDAsMiw2ODddLFsxLDEsMSwyLDczMV0sWzEsMCw3LDEsOTIyXSxbMCwwLDgsMiw4NTVdLFswLDEsMCwwLDY5OV0sWzgsMSw1LDEsOTkzXSxbNywxLDIsMiw3OTVdLFswLDEsMCwyLDEwMzhdLFsxLDEsMCwyLDEzMzldLFsxMCwxLDgsMiw5NTRdLFsxLDEsMSwxLDE3OTJdLFs0LDEsNCwxLDExMTFdLFszLDAsNSwwLDEwMjRdLFsxMCwxLDEwLDAsOTIyXSxbMCwxLDAsMiw3MjFdLFsxLDAsNiwyLDk4Ml0sWzMsMCw1LDAsOTQ5XSxbNCwwLDMsMiw5NTddLFs4LDAsOCwyLDEwNzNdLFswLDAsMTAsMSw5NzZdLFswLDEsMCwwLDg1NF0sWzMsMCw2LDIsNzUwXSxbMiwwLDksMCwxMDA5XSxbOCwwLDEsMCwxMDMyXSxbNCwxLDQsMiw3NDZdLFs5LDAsMywxLDk1M10sWzAsMCw1LDIsODIxXSxbMiwxLDIsMiwxMDY3XSxbOSwwLDMsMSw4ODVdLFs0LDAsNCwwLDkzNV0sWzUsMSwwLDEsMTEzMV0sWzMsMSwwLDIsMTA1NF0sWzEwLDAsMiwyLDEwMTVdLFszLDAsMCwxLDkzNV0sWzUsMCw0LDIsNzg1XSxbNiwwLDcsMCwxMzM4XSxbMTAsMCw3LDIsMTg0Ml0sWzQsMSwzLDIsMTE3NF0sWzIsMSwxLDAsMTgzM10sWzcsMSwwLDIsOTc0XSxbNiwwLDEsMiwxMDQ0XSxbNSwwLDgsMiwxMTIyXSxbNywwLDEwLDAsMTEzNl0sWzEsMCw1LDIsODIyXSxbNywxLDIsMiw4NzJdLFs3LDAsMCwxLDEwMDldLFsxLDAsMCwyLDg3NF0sWzgsMSw3LDEsMTM4N10sWzIsMCwwLDIsODM3XSxbNCwxLDMsMiw4NjBdLFs4LDEsNSwyLDc2NF0sWzMsMSwyLDIsNzQzXSxbNywxLDUsMSw4NTNdLFs0LDEsMCwwLDg0OF0sWzYsMSwzLDEsODgxXSxbMiwwLDQsMiw4MzldLFs1LDAsNSwxLDc5Nl0sWzgsMCwzLDAsMTQxM10sWzEsMSwwLDAsNzczXV19)](https://math-leaderboard.vercel.app/?replay=eyJ1Ijoia2F1ZSIsImMiOiJjZmdfYWRkLXN1Yl8wXzEwXzBfMTBfMF8yMCIsInMiOjYwLCJyIjo2MCwidyI6MCwiZCI6NjAwMDIsInEiOltbMSwxLDEsMiwxMDc0XSxbMCwxLDAsMiw2ODddLFsxLDEsMSwyLDczMV0sWzEsMCw3LDEsOTIyXSxbMCwwLDgsMiw4NTVdLFswLDEsMCwwLDY5OV0sWzgsMSw1LDEsOTkzXSxbNywxLDIsMiw3OTVdLFswLDEsMCwyLDEwMzhdLFsxLDEsMCwyLDEzMzldLFsxMCwxLDgsMiw5NTRdLFsxLDEsMSwxLDE3OTJdLFs0LDEsNCwxLDExMTFdLFszLDAsNSwwLDEwMjRdLFsxMCwxLDEwLDAsOTIyXSxbMCwxLDAsMiw3MjFdLFsxLDAsNiwyLDk4Ml0sWzMsMCw1LDAsOTQ5XSxbNCwwLDMsMiw5NTddLFs4LDAsOCwyLDEwNzNdLFswLDAsMTAsMSw5NzZdLFswLDEsMCwwLDg1NF0sWzMsMCw2LDIsNzUwXSxbMiwwLDksMCwxMDA5XSxbOCwwLDEsMCwxMDMyXSxbNCwxLDQsMiw3NDZdLFs5LDAsMywxLDk1M10sWzAsMCw1LDIsODIxXSxbMiwxLDIsMiwxMDY3XSxbOSwwLDMsMSw4ODVdLFs0LDAsNCwwLDkzNV0sWzUsMSwwLDEsMTEzMV0sWzMsMSwwLDIsMTA1NF0sWzEwLDAsMiwyLDEwMTVdLFszLDAsMCwxLDkzNV0sWzUsMCw0LDIsNzg1XSxbNiwwLDcsMCwxMzM4XSxbMTAsMCw3LDIsMTg0Ml0sWzQsMSwzLDIsMTE3NF0sWzIsMSwxLDAsMTgzM10sWzcsMSwwLDIsOTc0XSxbNiwwLDEsMiwxMDQ0XSxbNSwwLDgsMiwxMTIyXSxbNywwLDEwLDAsMTEzNl0sWzEsMCw1LDIsODIyXSxbNywxLDIsMiw4NzJdLFs3LDAsMCwxLDEwMDldLFsxLDAsMCwyLDg3NF0sWzgsMSw3LDEsMTM4N10sWzIsMCwwLDIsODM3XSxbNCwxLDMsMiw4NjBdLFs4LDEsNSwyLDc2NF0sWzMsMSwyLDIsNzQzXSxbNywxLDUsMSw4NTNdLFs0LDEsMCwwLDg0OF0sWzYsMSwzLDEsODgxXSxbMiwwLDQsMiw4MzldLFs1LDAsNSwxLDc5Nl0sWzgsMCwzLDAsMTQxM10sWzEsMSwwLDAsNzczXV19)

- **Example Ghost Race Replay (`kaue: 57 vs Sharpfox🦊: 35`)**: click on the image below

  [![Race OG Image](https://math-leaderboard.vercel.app/api/og?replay=eyJ1Ijoia2F1ZSIsImMiOiJjZmdfYWRkLXN1Yl8wXzEwXzBfMTBfMF8yMCIsInMiOjU3LCJyIjo1NywidyI6MCwiZCI6NjAwMDQsInEiOltbMTAsMSwwLDIsMTI1MF0sWzYsMSwxLDEsMTE2N10sWzAsMSwwLDEsNjc0XSxbNywxLDIsMiw4MTBdLFswLDAsOCwxLDk2MV0sWzEwLDAsOSwwLDEwNjRdLFswLDEsMCwyLDc1Ml0sWzUsMSw0LDEsODg0XSxbMSwwLDYsMSw5NDVdLFsxLDAsMywyLDg1MF0sWzcsMSw1LDIsODQ2XSxbOCwwLDksMCwyMzI5XSxbMywxLDMsMiw5ODJdLFs3LDAsMSwyLDkwNl0sWzcsMSw0LDAsMTI3OF0sWzYsMCw2LDAsNzkxXSxbNiwwLDcsMCwxNzUzXSxbNCwxLDQsMCw4NjVdLFs0LDAsMCwxLDk0M10sWzEwLDAsMywxLDc2NF0sWzAsMCw4LDAsODQwXSxbMCwwLDIsMCwxMTA3XSxbMTAsMCw3LDEsOTQwXSxbMCwxLDAsMCw3NzZdLFs1LDEsNSwyLDc2OF0sWzYsMCwxMCwxLDExOTddLFszLDAsMTAsMiwxMTEyXSxbMCwwLDMsMCwxMzAyXSxbNCwwLDUsMiw4MzZdLFswLDEsMCwxLDgwMF0sWzgsMCw0LDAsOTU5XSxbOSwwLDgsMiwxMTc1XSxbMCwwLDksMiw4OTJdLFs1LDEsMywyLDExNjNdLFs1LDEsNCwxLDEwMzVdLFsxLDAsMiwyLDgxMV0sWzgsMCwxLDEsMTg2OF0sWzIsMSwyLDEsMTQxMV0sWzgsMCw4LDAsODk2XSxbMTAsMSw4LDIsODQ5XSxbNiwxLDEsMiw3ODldLFs0LDEsMSwxLDg4MV0sWzEsMCwxLDIsOTk0XSxbNywwLDEwLDAsOTAxXSxbMywwLDksMCwxMTM2XSxbNiwxLDEsMCwxNDcxXSxbMSwxLDAsMSwxNzg4XSxbOSwxLDMsMiw5MTFdLFswLDAsNywxLDEyNjBdLFs0LDAsMiwyLDg5NV0sWzgsMCwwLDEsODY3XSxbMywxLDMsMiw4MzJdLFs4LDAsNCwwLDEwMjZdLFs4LDEsNSwxLDEwMTJdLFs4LDEsMiwxLDk0NF0sWzgsMCw1LDAsMTA5OV0sWzIsMSwyLDIsODM3XV0sIm8iOnsidSI6IlNoYXJwZm948J-miiIsInMiOjM1LCJyIjozNSwidyI6MCwiZCI6NjAyMjUsInEiOltbMTAsMSwwLDIsMjA2NF0sWzYsMSwxLDEsMTYwNF0sWzAsMSwwLDEsOTAxXSxbNywxLDIsMiwxNDYwXSxbMCwwLDgsMSwxMzA1XSxbMTAsMCw5LDAsMTg4MF0sWzAsMSwwLDIsMTAwM10sWzUsMSw0LDEsMTUxMV0sWzEsMCw2LDEsMTgwMl0sWzEsMCwzLDIsMTI4NF0sWzcsMSw1LDIsMTMzMF0sWzgsMCw5LDAsNjI4NV0sWzMsMSwzLDIsMTIzMl0sWzcsMCwxLDIsMTI3OV0sWzcsMSw0LDAsMjUxOV0sWzYsMCw2LDAsMTE0NV0sWzYsMCw3LDAsMjU4Nl0sWzQsMSw0LDAsMTI5OF0sWzQsMCwwLDEsMTUzMF0sWzEwLDAsMywxLDEwMThdLFswLDAsOCwwLDIyODJdLFswLDAsMiwwLDEyNDhdLFsxMCwwLDcsMSwxMjg0XSxbMCwxLDAsMCw4NjVdLFs1LDEsNSwyLDk4Ml0sWzYsMCwxMCwxLDMwNDZdLFszLDAsMTAsMiwxOTM1XSxbMCwwLDMsMCwxNTI2XSxbNCwwLDUsMiwxNDg5XSxbMCwxLDAsMSw4NjVdLFs4LDAsNCwwLDE1MzBdLFs5LDAsOCwyLDI2MDFdLFswLDAsOSwyLDEzMTNdLFs1LDEsMywyLDE3ODVdLFs1LDEsNCwxLDE0NDJdXX19)](https://math-leaderboard.vercel.app/?replay=eyJ1Ijoia2F1ZSIsImMiOiJjZmdfYWRkLXN1Yl8wXzEwXzBfMTBfMF8yMCIsInMiOjU3LCJyIjo1NywidyI6MCwiZCI6NjAwMDQsInEiOltbMTAsMSwwLDIsMTI1MF0sWzYsMSwxLDEsMTE2N10sWzAsMSwwLDEsNjc0XSxbNywxLDIsMiw4MTBdLFswLDAsOCwxLDk2MV0sWzEwLDAsOSwwLDEwNjRdLFswLDEsMCwyLDc1Ml0sWzUsMSw0LDEsODg0XSxbMSwwLDYsMSw5NDVdLFsxLDAsMywyLDg1MF0sWzcsMSw1LDIsODQ2XSxbOCwwLDksMCwyMzI5XSxbMywxLDMsMiw5ODJdLFs3LDAsMSwyLDkwNl0sWzcsMSw0LDAsMTI3OF0sWzYsMCw2LDAsNzkxXSxbNiwwLDcsMCwxNzUzXSxbNCwxLDQsMCw4NjVdLFs0LDAsMCwxLDk0M10sWzEwLDAsMywxLDc2NF0sWzAsMCw4LDAsODQwXSxbMCwwLDIsMCwxMTA3XSxbMTAsMCw3LDEsOTQwXSxbMCwxLDAsMCw3NzZdLFs1LDEsNSwyLDc2OF0sWzYsMCwxMCwxLDExOTddLFszLDAsMTAsMiwxMTEyXSxbMCwwLDMsMCwxMzAyXSxbNCwwLDUsMiw4MzZdLFswLDEsMCwxLDgwMF0sWzgsMCw0LDAsOTU5XSxbOSwwLDgsMiwxMTc1XSxbMCwwLDksMiw4OTJdLFs1LDEsMywyLDExNjNdLFs1LDEsNCwxLDEwMzVdLFsxLDAsMiwyLDgxMV0sWzgsMCwxLDEsMTg2OF0sWzIsMSwyLDEsMTQxMV0sWzgsMCw4LDAsODk2XSxbMTAsMSw4LDIsODQ5XSxbNiwxLDEsMiw3ODldLFs0LDEsMSwxLDg4MV0sWzEsMCwxLDIsOTk0XSxbNywwLDEwLDAsOTAxXSxbMywwLDksMCwxMTM2XSxbNiwxLDEsMCwxNDcxXSxbMSwxLDAsMSwxNzg4XSxbOSwxLDMsMiw5MTFdLFswLDAsNywxLDEyNjBdLFs0LDAsMiwyLDg5NV0sWzgsMCwwLDEsODY3XSxbMywxLDMsMiw4MzJdLFs4LDAsNCwwLDEwMjZdLFs4LDEsNSwxLDEwMTJdLFs4LDEsMiwxLDk0NF0sWzgsMCw1LDAsMTA5OV0sWzIsMSwyLDIsODM3XV0sIm8iOnsidSI6IlNoYXJwZm948J-miiIsInMiOjM1LCJyIjozNSwidyI6MCwiZCI6NjAyMjUsInEiOltbMTAsMSwwLDIsMjA2NF0sWzYsMSwxLDEsMTYwNF0sWzAsMSwwLDEsOTAxXSxbNywxLDIsMiwxNDYwXSxbMCwwLDgsMSwxMzA1XSxbMTAsMCw5LDAsMTg4MF0sWzAsMSwwLDIsMTAwM10sWzUsMSw0LDEsMTUxMV0sWzEsMCw2LDEsMTgwMl0sWzEsMCwzLDIsMTI4NF0sWzcsMSw1LDIsMTMzMF0sWzgsMCw5LDAsNjI4NV0sWzMsMSwzLDIsMTIzMl0sWzcsMCwxLDIsMTI3OV0sWzcsMSw0LDAsMjUxOV0sWzYsMCw2LDAsMTE0NV0sWzYsMCw3LDAsMjU4Nl0sWzQsMSw0LDAsMTI5OF0sWzQsMCwwLDEsMTUzMF0sWzEwLDAsMywxLDEwMThdLFswLDAsOCwwLDIyODJdLFswLDAsMiwwLDEyNDhdLFsxMCwwLDcsMSwxMjg0XSxbMCwxLDAsMCw4NjVdLFs1LDEsNSwyLDk4Ml0sWzYsMCwxMCwxLDMwNDZdLFszLDAsMTAsMiwxOTM1XSxbMCwwLDMsMCwxNTI2XSxbNCwwLDUsMiwxNDg5XSxbMCwxLDAsMSw4NjVdLFs4LDAsNCwwLDE1MzBdLFs5LDAsOCwyLDI2MDFdLFswLDAsOSwyLDEzMTNdLFs1LDEsMywyLDE3ODVdLFs1LDEsNCwxLDE0NDJdXX19)

- **Example User Profile Page (`kaue`)**: click on the image below

  [![User Profile OG Image](https://math-leaderboard.vercel.app/api/og?user=9c16aad2-0d18-4e01-a4ce-985932e5dd02&u=kaue)](https://math-leaderboard.vercel.app/?user=9c16aad2-0d18-4e01-a4ce-985932e5dd02&u=kaue)

## Features

- **Multi-User Support**:
  - Generates a random username saved in `localStorage`, editable anytime in the header.
  - Add (`+ User`), switch, and delete (`✕`) users so multiple people can play on the same device.
  - Users are shared across all game configurations and leaderboards.
- **Five Categories (`🔢 Math`, `🌍 Geo`, `💬 Lang`, `🎓 Study`, `🧩 Other`) Sorted by Popularity**:
  - **🔢 Math**:
    - Default game: `+ − (0..10, 0..10, 0..20)`.
    - Create new math configurations (`+ Game`) with any subset of operators (`+`, `−`, `×`, `÷`) and integer `min`/`max` constraints on each of the 3 numbers (with division restricted to exact integers).
  - **🌍 Geography (12 built-in configs — 193 UN Member States)**:
    - `Flag ↔ Country`, `Country ↔ Capital`, `Flag ↔ Capital`, `Map ↔ Country`, `Map ↔ Flag`, and `Map ↔ Capital` across all 193 United Nations member states, played with 2-choice answer buttons and Natural Earth context maps showing neighboring countries.
  - **💬 Language & Wordplay (50 built-in configs across `🇬🇧 EN`, `🇧🇷 PT`, `🇪🇸 ES`, `🇫🇷 FR` & `🇩🇪 DE`)**:
    - All 20 directed translation pairs across English, Portuguese, Spanish, French, and German (1,000 most common words each).
    - `😀 Emoji ↔ Language` across all 5 languages (top 1,000 most used emojis).
    - `Word → Synonym` (300 pairs), `Word → Antonym` (300 pairs), and `Idiom ↔ Meaning` (200 idioms & phrasal verbs) for each language, with a **Lang** sub-filter and 4 mini-sets per game.
  - **🎓 Study (CEFR Tracks — German A1 for English Speakers)**:
    - Filterable by **Learn** (`🇩🇪 DE`), **From** (`🇬🇧 EN`), and **CEFR** (`A1`), with 6 tracks as games and thematic/topic splits as sets:
      - `Vocab (DE → EN)` & `Vocab (EN → DE)` (693 Goethe-Zertifikat A1 words with noun articles, part-of-speech–matched distractors, and 7 thematic sets).
      - `Grammar` (214 cloze & structure drills with rule notes across 5 topic sets).
      - `Verbs & Conjugation` (188 drills across core/modals, regular present, stem-changing, and separable/Perfekt across 4 sets).
      - `Articles & Gender` (444 drills across 3 noun-gender sets + Nominative vs. Accusative cloze set).
      - `Everyday Phrases` (106 functional A1 phrases across 4 sets).
    - Features highlighted inline cloze blanks (`___`) during play and concise grammar rule notes in **Progress & Review**.
  - **🧩 Other (4 built-in configs — Chemical Elements & Morse Code)**:
    - `Symbol → Element` (`Au` → `Gold`) and `Element → Symbol` (`Gold` → `Au`) across all 118 IUPAC elements.
    - `Morse → Character` (`• • •` → `S`) and `Character → Morse` (`S` → `• • •`) across all 36 International Morse Code characters (`A–Z`, `0–9`).
  - Topics are sorted by their maximum leaderboard size, and within each category, game configurations are sorted by popularity (leaderboard size), with a **`▾ All (N)` / `▴ Less`** toggle to expand the list vertically across multiple rows instead of scrolling horizontally.
- **1-Minute Math Game**:
  - Randomly hides one of the 3 numbers in the equation (`a op b = c`).
  - On-screen mobile keypad formatted with 3 digits per row (plus physical keyboard support).
  - Right answers automatically advance to the next question.
  - Wrong answers stay visible and are automatically erased when a new answer starts being typed.
  - Score is `total right - total wrong` in the 1-minute window (ending a game early also saves the current score), followed by a celebratory confetti & score-pop animation at the end of each game.
  - **🔊 Zero-Asset Sound Effects & Haptics**: Web Audio API synthesis + `navigator.vibrate` (soft click on keypad press, ascending streak chime on right answers, descending buzz + phone vibration on wrong answers, final 5-second countdown ticks, and a victory chord on game end), with a persistent `🔊`/`🔇` toggle in the header.
  - **🌙 Dark Mode (`☀️`/`🌙` Toggle)**: Defaults to system `prefers-color-scheme` with a zero-flash header toggle persisted in `localStorage` (`math_theme_v1`) and dynamic `<meta name="theme-color">` status bar coloring.
- **Practice Mode (`Practice Weak & Slow`)**:
  - Prioritizes questions from past games that had mistakes or took the longest average time.
  - Shows a `Last:` badge above the equation with previous wrong attempts and running average duration.
  - Updates per-question stats without submitting practice scores to the global leaderboard.
- **Progress & Review**:
  - Collapsible section (collapsed by default so first-time visitors see the leaderboard immediately, with expand/collapse state saved in `localStorage`).
  - **Progress Chart**: Plots `Score`, `Right`, and cumulative `Best` across past games.
  - **Review Tabs**:
    - **Mistakes & Slowest**: Questions from the last game sorted by mistakes first, then slowest time.
    - **Order Played**: Questions from the last game in the exact order played.
    - **To Practice**: All tracked questions across past games with running average duration and mistake history.
- **Interactive Replays, Ghost Race Mode & Shareable Links**:
  - Watch step-by-step replays (`▶`) of your last game, your best game, or any player's best game on the global leaderboard (`1×` / `2×` / `4×` speed, pause/resume, restart, top score summary banner, and live question log).
  - **⚔️ Ghost Race Mode**: Tap `⚔️` (`⚔️ Race` at game end) on any leaderboard entry, replay, or last game to play that exact sequence of questions yourself against a live split counter (`⚔️ You: 18 vs Player: 16 | +2`) without affecting the ranked leaderboard.
  - **Head-to-Head Race Replays**: Replays of Ghost Races show a head-to-head outcome banner, both players' live scores, the opponent's live equation & typed digits (`#race-opp-eq`), and an interactive **Score Timeline Chart** (`#replay-race-chart`) with green/red lead-deficit shading.
  - **Interactive Replay Timeline Bar**: Scrub or tap anywhere along the 60-second timeline or score chart (with green right-answer and red wrong-answer markers, or tap any question row in the log) to jump to any moment in the replay.
  - Includes a **Play 1-Minute Game** button at the top of the replay view so recipients of a shared replay can jump right into playing.
  - **🔗 Share Replay** (`🔗` / `🔗 Share`) copies a self-contained `?replay=...` URL (`https://math-leaderboard.vercel.app/?replay=...`).
- **Global Leaderboards, Player Profile Pages & Live Open Graph Previews**:
  - Each game configuration has its own paginated global leaderboard in Firebase Realtime Database using standard competition ranking (tied scores share the same rank), with a pinned current-user row, `🎯 My Rank` page jump, and exact points needed to tie/pass the next rank up.
  - **Player Profile Pages (`?user=<userId>&u=<username>`)**: Click any player's name on the leaderboard (or `👤 Page`) to open their full-screen Player Profile showing their performances across all games sorted by **🏆 By Rank**, **📈 By Score**, or **🎯 Play Next**, with direct links to each game config and `▶` replay buttons.
  - **Shareable Game Configs (`?config=<configId>`)**: Click `🔗` in the Leaderboard header to share a direct link to any game configuration's leaderboard.
  - `api/og.js` and `middleware.js` on Vercel serve dynamic `1200 × 630` Open Graph preview images for the multi-category home overview (`/api/og`), live config leaderboards (`/api/og?config=...`), player profile pages (`/api/og?user=...`), solo replays, and head-to-head Ghost Race replays while redirecting browsers to GitHub Pages so `localStorage` remains on a single domain.
- **Installable Phone App (PWA)**:
  - Includes a Web App Manifest (`manifest.json`), home-screen icons, safe-area inset padding, Android immersive fullscreen, a header `📲` install button, and an offline-capable Service Worker (`sw.js`).
  - **iPhone / iPad (Safari)**: Open `https://kssilveira.github.io/math-leaderboard/` → tap `📲` (or **Share** → **Add to Home Screen**).
  - **Android (Chrome)**: Open `https://kssilveira.github.io/math-leaderboard/` → tap `📲` (or **⋮ → Add to Home screen**).

## Running Locally

```bash
./serve.sh
```
