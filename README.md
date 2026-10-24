# math-leaderboard

Mobile-friendly 1-minute math game with shared game configurations, multi-user support, practice mode, interactive replays, and global leaderboards backed by Firebase Realtime Database.

- **Play**: **https://kssilveira.github.io/math-leaderboard/**
- **Share URL** (live Open Graph previews + redirect to GitHub Pages): **https://math-leaderboard.vercel.app/**

## Features

- **Multi-User Support**:
  - Generates a random username saved in `localStorage`, editable anytime in the header.
  - Add (`+ User`), switch, and delete (`✕`) users so multiple people can play on the same device.
  - Users are shared across all game configurations and leaderboards.
- **Shared Game Configurations**:
  - Default game: `+ − (0..10, 0..10, 0..20)`.
  - Create new game configurations (`+ Game`) with any subset of operators (`+`, `−`, `×`, `÷`) and integer `min`/`max` constraints on each of the 3 numbers (with division restricted to exact integers).
  - Configurations are immutable after creation, shared globally across all users in Firebase, and sorted by the size of their leaderboards.
  - Creating a configuration that already exists automatically selects the existing one.
- **1-Minute Math Game**:
  - Randomly hides one of the 3 numbers in the equation (`a op b = c`).
  - On-screen mobile keypad formatted with 3 digits per row (plus physical keyboard support).
  - Right answers automatically advance to the next question.
  - Wrong answers stay visible and are automatically erased when a new answer starts being typed.
  - Score is `total right - total wrong` in the 1-minute window (ending a game early also saves the current score), followed by a celebratory confetti & score-pop animation at the end of each game.
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
- **Interactive Replays & Shareable Links**:
  - Watch step-by-step replays (`▶ Replay`) of your last game, your best game, or any player's best game on the global leaderboard (`1×` / `2×` / `4×` speed, pause/resume, restart, and live question log).
  - Includes a **Play 1-Minute Game** button at the top of the replay view so recipients of a shared replay can jump right into playing.
  - **🔗 Share Replay** copies a self-contained `?replay=...` URL (`https://math-leaderboard.vercel.app/?replay=...`).
- **Global Leaderboards & Live Open Graph Previews**:
  - Each game configuration has its own global leaderboard in Firebase Realtime Database using standard competition ranking (tied scores share the same rank).
  - Shows the Top 10 users (with score, right/wrong breakdown, and `▶` replay button) and the current user's rank and best score.
  - `api/og.js` and `middleware.js` on Vercel serve dynamic Open Graph preview images for both the live leaderboard and shared `?replay=...` links while redirecting browsers to GitHub Pages so `localStorage` remains on a single domain.
- **Installable Phone App (PWA)**:
  - Includes a Web App Manifest (`manifest.json`), home-screen icons, safe-area inset padding, and an offline-capable Service Worker (`sw.js`).
  - **iPhone / iPad (Safari)**: Open `https://kssilveira.github.io/math-leaderboard/` → tap **Share** → **Add to Home Screen**.
  - **Android (Chrome)**: Open `https://kssilveira.github.io/math-leaderboard/` → tap **Install App** (or **⋮ → Add to Home screen**).

## Running Locally

```bash
python3 -m http.server 8000 --bind ::
```
